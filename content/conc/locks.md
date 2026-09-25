---
topic: conc.locks
name: "Locks and coordination"
subject: conc
order: 2
prereqs: [conc.basics, os.sync]
---

## conc.locks.mutexes-and-lock-guards
name: "Mutexes and lock guards"
importance: must
prereqs: [conc.basics.thread-safety]
scope: "RAII locks, scoped locking"

### simple
A mutex is the key to a single-occupancy room: a thread must hold the key to go in, and everyone else waits outside until it is handed back. A lock guard is a key that returns itself when you walk out of the room, however you leave, even if you trip and fall. Using the guard instead of locking and unlocking by hand means you can never forget to give the key back.

### interview
- `std::mutex` gives **mutual exclusion**: `lock()` waits until the mutex is free and takes it; `unlock()` releases it. Only the owning thread may unlock it, and locking a `std::mutex` the thread already holds is undefined behavior (in practice a self-deadlock).
- Never call `lock`/`unlock` by hand: use RAII. `lock_guard` locks in its constructor and unlocks in its destructor; `scoped_lock` (C++17) does the same for **several** mutexes at once without deadlock; `unique_lock` can unlock early, relock, defer locking, try-lock, move, and is required by `condition_variable`.
- A mutex also orders memory: everything a thread wrote before `unlock()` is visible to the next thread after its `lock()`. That is why data guarded by one mutex needs no atomics.
- Keep **critical sections short**: do slow work (I/O, allocation-heavy computation, callbacks into unknown code) outside the lock. Guard compound operations (check-then-act) under **one** lock.
- Never let a reference or pointer to guarded data escape the locked region; return copies.
- Variants: `recursive_mutex` (the owner may lock again; usually a design smell), `timed_mutex` (`try_lock_for`), `shared_mutex` (readers and writers). On Linux an uncontended lock is a single atomic instruction; the kernel is involved only when threads must wait (a futex).

### deep
#### Worked example: a thread-safe class

```cpp
class Inventory {
public:
    void add(const string& item, int n) {
        lock_guard<mutex> lock(m_);                 // locked here...
        stock_[item] += n;
    }                                               // ...unlocked here, even on an exception
    bool take(const string& item, int n) {
        lock_guard<mutex> lock(m_);                 // check and update under one lock
        auto it = stock_.find(item);
        if (it == stock_.end() || it->second < n) return false;
        it->second -= n;
        return true;
    }
    int count(const string& item) const {
        lock_guard<mutex> lock(m_);
        auto it = stock_.find(item);
        return it == stock_.end() ? 0 : it->second;
    }
private:
    mutable mutex m_;                               // mutable: const functions lock it too
    unordered_map<string, int> stock_;
};

int main() {
    Inventory inv;
    atomic<int> taken{0};
    vector<thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([&] {
            for (int i = 0; i < 10000; ++i) {
                inv.add("bolt", 1);
                if (inv.take("bolt", 2)) taken += 2;
            }
        });
    for (auto& th : ts) th.join();
    int left = inv.count("bolt");
    cout << "added 40000, taken + left = " << taken + left
         << ", taken is even: " << (taken % 2 == 0) << "\n";
}
```

Output (the same in every run; how the 40,000 split between taken and left depends on timing):

```text
added 40000, taken + left = 40000, taken is even: 1
```

`take` checks the stock and subtracts under the same lock, so two threads can never both see 2 bolts and both take them. Splitting it into `count()` followed by a separate `remove()` would bring back the race condition even though each call locks.

#### Which lock wrapper

| wrapper | locks | extra abilities | use for |
|---|---|---|---|
| `lock_guard<M>` | one mutex, for the whole scope | none | the common case |
| `scoped_lock<M...>` | any number, deadlock-free | none | two or more mutexes at once |
| `unique_lock<M>` | one mutex | unlock early, relock, `defer_lock`, `try_to_lock`, timeouts, movable | condition variables, hand-over-hand locking |
| `shared_lock<M>` | a `shared_mutex` in shared mode | like `unique_lock` | readers |

Since C++17, class template argument deduction lets you write `lock_guard lock(m_);` without the type.

#### Designing the locking

- Write down, for every member, which mutex guards it ("`stock_` is guarded by `m_`"). Clang's thread-safety annotations can check such rules at compile time.
- Lock at the level of the operation the caller needs (`take`), not per field.
- Prefer one mutex per object at first; split locks only when measurements show contention.

#### Pitfalls

- `lock_guard<mutex>{m_};` without a variable name compiles silently, but it is a temporary that unlocks at the end of that statement, protecting nothing. (With parentheses, `lock_guard<mutex>(m_);` declares a new variable named `m_` and fails to compile.) Always name the guard.
- Calling a user callback while holding a lock invites deadlock (the callback may lock something else) and long waits.
- Returning `const auto&` to guarded data from a locked getter lets the caller read it after the lock is gone.
- An exception in a manual `lock()`/`unlock()` pair leaves the mutex locked forever; RAII prevents it.

Connects to: mutex locks, avoiding deadlocks in code, condition variables, RAII, thread safety.

### questions
Q: Why should you use lock_guard instead of calling lock and unlock directly?
A: lock_guard unlocks in its destructor, which runs on every path out of the scope, including early returns and exceptions. With manual calls, any forgotten path leaves the mutex locked and every other thread blocks forever.

Q: What is the difference between lock_guard, unique_lock and scoped_lock?
A: lock_guard simply locks one mutex for its scope. unique_lock also locks one mutex but can unlock and relock, defer locking, try with a timeout and be moved, and it is what condition_variable::wait needs. scoped_lock locks several mutexes at once using a deadlock-avoidance algorithm.

Q: Besides mutual exclusion, what does a mutex guarantee?
A: Memory visibility and ordering: an unlock synchronizes with the next lock of the same mutex, so all writes made before the unlock are visible to the thread that locks it next. That is why data consistently accessed under one mutex needs no atomics.

Q: What happens if a thread locks a std::mutex it already holds?
A: It is undefined behavior; in practice the thread usually deadlocks waiting for itself. recursive_mutex allows the owner to lock repeatedly, but needing it often signals that the locking design should be restructured, for example with private helpers that assume the lock is held.

Q: How long should a critical section be?
A: As short as possible: just the reads and writes of the shared state that must be atomic together. Slow work such as I/O, heavy computation or callbacks into unknown code should happen outside the lock, because every other thread that needs the mutex is blocked meanwhile.

## conc.locks.avoiding-deadlocks-in-code
name: "Avoiding deadlocks in code"
importance: must
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "lock ordering, try-lock, timeouts"

### simple
A deadlock is two threads each holding something the other needs and waiting forever, like two people in a narrow corridor each refusing to step back. The simplest cure is a rule everyone follows, such as "always pick up the lower-numbered key first", so a circle of waiting can never form. Other cures are grabbing everything at once, or giving up and retrying when you cannot get the second key in time.

### interview
- A deadlock needs **all four** Coffman conditions: mutual exclusion, hold and wait, no preemption, and a **circular wait**. In code, breaking circular wait or hold-and-wait is the practical fix.
- **Lock ordering**: define a global order (by account id, by level in a hierarchy, by address as a last resort) and always acquire in that order. Two threads can then never wait on each other in a cycle.
- **Acquire together**: `std::scoped_lock lock(a.m, b.m);` (or `std::lock`) takes several mutexes with a deadlock-avoidance algorithm, whatever order the arguments come in.
- **Try-lock and back off**: `try_lock` (or `try_lock_for` on a `timed_mutex`) and, on failure, release what you hold, wait a little and retry. Timeouts turn a silent hang into an error you can handle, at the risk of livelock if everyone retries in lockstep (add random back-off).
- Other rules: never call unknown code (callbacks, virtual functions of other components) while holding a lock; do not wait on a future or join a thread while holding a lock that thread needs; keep one lock per operation when possible.
- ThreadSanitizer detects **lock-order inversions** (the same two mutexes taken in opposite orders somewhere in the program) even in runs that did not deadlock.

### deep
#### Worked example: transfers in both directions

```cpp
struct Account {
    int id;
    long long balance;
    mutex m;
};

void transfer(Account& from, Account& to, long long amount) {
    scoped_lock both(from.m, to.m);          // locks both without deadlock, in any argument order
    from.balance -= amount;
    to.balance += amount;
}

void transferOrdered(Account& from, Account& to, long long amount) {
    Account& first = from.id < to.id ? from : to;        // one global order: lower id first
    Account& second = from.id < to.id ? to : from;
    lock_guard<mutex> l1(first.m);
    lock_guard<mutex> l2(second.m);
    from.balance -= amount;
    to.balance += amount;
}

int main() {
    Account a{1, 1000, {}}, b{2, 1000, {}};
    thread t1([&] { for (int i = 0; i < 100000; ++i) transfer(a, b, 1); });
    thread t2([&] { for (int i = 0; i < 100000; ++i) transfer(b, a, 1); });   // opposite direction
    t1.join();
    t2.join();
    thread t3([&] { for (int i = 0; i < 100000; ++i) transferOrdered(a, b, 1); });
    thread t4([&] { for (int i = 0; i < 100000; ++i) transferOrdered(b, a, 1); });
    t3.join();
    t4.join();
    cout << a.balance << " + " << b.balance << " = " << a.balance + b.balance << "\n";

    // A timeout turns a would-be deadlock into an error you can handle.
    timed_mutex x, y;
    barrier bothHoldOne(2);
    string report[2];
    auto grab = [&](timed_mutex& mine, timed_mutex& other, int who) {
        lock_guard<timed_mutex> hold(mine);
        bothHoldOne.arrive_and_wait();                   // each thread now holds one lock
        if (other.try_lock_for(50ms)) { other.unlock(); report[who] = "got both"; }
        else report[who] = "timed out, backing off";
        bothHoldOne.arrive_and_wait();                   // release only after both have tried
    };
    thread u([&] { grab(x, y, 0); });
    thread v([&] { grab(y, x, 1); });
    u.join();
    v.join();
    cout << "thread 1: " << report[0] << "\nthread 2: " << report[1] << "\n";
}
```

Output (the same in every run):

```text
1000 + 1000 = 2000
thread 1: timed out, backing off
thread 2: timed out, backing off
```

The naive version, `lock_guard l1(from.m); lock_guard l2(to.m);`, deadlocks as soon as t1 holds `a.m` while t2 holds `b.m`: each waits for the other forever. Both fixes remove the circular wait, so 400,000 transfers finish and the total is conserved. The last part forces the dangerous state on purpose: the barrier makes each thread hold one lock and want the other, and the second barrier keeps both locks held until both attempts are over, so the result never depends on timing. Plain `lock()` would hang there; `try_lock_for` gives up after 50 ms, and a real program would release its own lock, back off for a random time and retry.

#### Catching inversions before they bite

A program that locks `A` then `B` in one thread and `B` then `A` in another usually works in testing, because the two sections rarely overlap. Built with `-fsanitize=thread`, such a program (even when its two threads ran one after the other) reports `WARNING: ThreadSanitizer: lock-order-inversion (potential deadlock)` with a `Cycle in lock order graph` between the two mutexes. Run tests under ThreadSanitizer to find inversions early.

#### Strategies compared

| strategy | breaks | cost |
|---|---|---|
| global lock order | circular wait | needs a documented order that every path follows |
| `scoped_lock` / `std::lock` | circular wait (takes all or waits holding none) | all mutexes must be known up front |
| try-lock with back-off | hold and wait | retries; possible livelock without random delays |
| timeouts | makes the hang visible | must handle failure paths |
| one coarse lock | the need for two locks | less concurrency |

#### Pitfalls

- Ordering by address works only if every code path uses the same rule, including code written later.
- A thread that joins another thread (or waits on its future) while holding a lock the other needs is a deadlock with only one mutex.
- Condition variables waiting on a predicate that no one will ever make true look like deadlocks too.

Connects to: deadlock conditions, dining philosophers, mutexes and lock guards, condition variables.

### questions
Q: What four conditions are needed for a deadlock?
A: Mutual exclusion, where a resource is held by one thread at a time; hold and wait, where threads hold resources while waiting for more; no preemption, where resources cannot be taken away; and circular wait, where a cycle of threads each waits for the next. Removing any one prevents deadlock.

Q: How does lock ordering prevent deadlock?
A: If every thread acquires locks in the same global order, for example by account id, then no thread ever waits for a lock that is earlier in the order than one it holds. That makes a cycle of waiting threads impossible, so circular wait cannot occur.

Q: What does std::scoped_lock do when given two mutexes?
A: It locks both using a deadlock-avoidance algorithm, the same as std::lock: it tries to take them, and if one is busy it releases what it holds and retries in a different order, so it never waits while holding one of them. Callers may therefore pass the mutexes in any order.

Q: When are try_lock and timeouts useful, and what is their risk?
A: When you cannot establish a global order, or when a hang must turn into a recoverable error: a thread that fails to get its second lock in time releases the first, backs off and retries. The risk is livelock, where threads keep retrying in lockstep; random back-off delays reduce it.

Q: How can you detect potential deadlocks during testing?
A: Build with ThreadSanitizer, which records the order in which mutexes are acquired and reports lock-order inversions as potential deadlocks even when the run did not hang. Code review of lock ordering and avoiding callbacks under locks help too.

## conc.locks.condition-variables
name: "Condition variables"
importance: must
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "wait and notify, spurious wakeups, predicates"

### simple
A condition variable is a waiting room with a bell. A thread that cannot continue yet, say because there is no work, goes to sleep in the waiting room instead of checking over and over, and another thread rings the bell after it changes something. The sleeper wakes up and checks again whether its reason to wait is gone, because the bell can also ring for someone else, or by accident.

### interview
- A `condition_variable` lets threads **sleep until some condition on shared state becomes true**. The condition itself lives in ordinary variables guarded by a **mutex**; the condition variable only provides waiting and waking.
- `cv.wait(lock, pred)` (with a `unique_lock<mutex>`) atomically **releases the mutex and sleeps**, and re-locks before returning; with a predicate it loops until the predicate is true. It is equivalent to `while (!pred()) cv.wait(lock);`.
- **Spurious wakeups**: `wait` may return without a notification, and by the time a woken thread reacquires the mutex another thread may have changed the state. Always re-check a predicate.
- **Lost wakeups**: a notification sent before the other thread waits is not remembered. The predicate saves you: if the state already says "ready", `wait` does not sleep at all. So always change the state **under the mutex**, then notify.
- `notify_one` wakes one waiter (enough when any waiter can handle the change); `notify_all` wakes all (needed when waiters wait for different conditions or several can proceed). Notifying after unlocking is allowed and avoids waking a thread that immediately blocks on the mutex.
- `wait_for` and `wait_until` add timeouts (with a predicate they return whether it became true). `condition_variable_any` works with other lock types such as `shared_lock`.

### deep
#### Worked example: a start signal and a completion wait

```cpp
mutex m;
condition_variable cv;
bool ready = false;                 // the condition lives in shared state, guarded by m
vector<int> jobs;
int finished = 0;

void worker(int id, vector<string>& log) {
    unique_lock<mutex> lock(m);
    cv.wait(lock, [] { return ready; });          // = while (!ready) cv.wait(lock);
    log[id] = "worker " + to_string(id) + " saw " + to_string(jobs.size()) + " jobs";
    ++finished;
    cv.notify_all();                              // wake main: "finished" changed
}

int main() {
    vector<string> log(3);
    vector<thread> ts;
    for (int i = 0; i < 3; ++i) ts.emplace_back(worker, i, ref(log));
    {
        lock_guard<mutex> lock(m);
        jobs = {7, 8, 9};                         // prepare the data...
        ready = true;                             // ...then flip the condition, under the lock
    }
    cv.notify_all();                              // wake every waiting worker
    {
        unique_lock<mutex> lock(m);
        bool allDone = cv.wait_for(lock, 2s, [] { return finished == 3; });
        cout << "all done: " << allDone << "\n";
    }
    for (auto& t : ts) t.join();
    for (auto& line : log) cout << line << "\n";
}
```

Output (the same in every run):

```text
all done: 1
worker 0 saw 3 jobs
worker 1 saw 3 jobs
worker 2 saw 3 jobs
```

The workers may start before or after `main` sets `ready`. If a worker arrives late, its predicate is already true and it does not sleep: this is how the predicate prevents lost wakeups. One condition variable serves two different conditions here (`ready` for workers, `finished == 3` for main), which is why every notification is `notify_all`: a `notify_one` could wake a thread whose condition did not change.

#### What wait does, step by step

| step | inside `cv.wait(lock, pred)` |
|---|---|
| 1 | check `pred()` while holding the mutex; if true, return at once |
| 2 | atomically unlock the mutex and block (no notification can slip in between) |
| 3 | wake on a notification, a timeout or spuriously |
| 4 | re-lock the mutex, then go back to step 1 |

#### Pitfalls

- Waiting without a predicate (`cv.wait(lock);` in an `if`) breaks on spurious wakeups and lost notifications.
- Changing the condition without the mutex, even an `atomic<bool>`, can lose a wakeup: the waiter checks false, the notifier sets true and notifies, then the waiter goes to sleep and misses it.
- Holding the lock for long work after waking blocks every other thread; copy what you need and unlock.
- Destroying a condition variable while threads still wait on it is undefined behavior.

#### Alternatives

- A semaphore remembers signals (a count), so it cannot lose a wakeup, which is simpler for "N items available".
- A `latch` or `barrier` covers "wait until N threads arrive".
- C++20 `atomic<T>::wait` and `notify_one` let a thread sleep until an atomic changes, without a mutex.

Connects to: monitors and condition variables, producer-consumer in code, semaphores, latches and barriers, mutexes and lock guards.

### questions
Q: Why must condition_variable::wait be given a mutex?
A: The condition is shared state that must be checked and changed under a lock. wait needs the lock so it can release it atomically as the thread goes to sleep and reacquire it before returning. Without that atomic release, a notification could arrive between the check and the sleep and be lost.

Q: What is a spurious wakeup, and how do you handle it?
A: A return from wait without any notification, allowed by the standard because some platforms cannot avoid them. Handle it, and the case where another thread changed the state first, by always waiting in a loop on a predicate, most simply with the overload wait(lock, predicate).

Q: What is a lost wakeup?
A: A notification sent when no thread is waiting yet, which condition variables do not remember. If the waiter then goes to sleep, it may never wake. Checking a predicate on shared state before sleeping, and changing that state under the mutex before notifying, prevents it.

Q: When should you use notify_all instead of notify_one?
A: When waiters may be waiting for different conditions on the same condition variable, or when the change can let several of them proceed, such as a shutdown flag. notify_one is enough when every waiter waits for the same condition and one unit of progress helps exactly one of them.

Q: Is it allowed to call notify without holding the mutex?
A: Yes. The state change must be made while holding the mutex, but the notify can come after unlocking, which often avoids waking a thread that would immediately block on the still-held mutex. Some code notifies under the lock for simplicity; both are correct.

## conc.locks.read-write-locks
name: "Read-write locks"
importance: important
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "many readers, one writer"

### simple
A read-write lock is like a museum room: any number of visitors can look at the paintings at the same time, but when a curator needs to rearrange them, everyone steps out and only the curator is inside. It lets many threads read shared data at once while still keeping writers alone. It only pays off when reading is far more common than writing.

### interview
- `std::shared_mutex` (C++17) has two modes: **shared** (`shared_lock`, many readers at once) and **exclusive** (`unique_lock` or `lock_guard`, one writer and no readers).
- Worth it when reads **greatly outnumber** writes and each read holds the lock long enough to matter. For tiny critical sections a plain `mutex` is often faster, because a shared lock still updates a shared reader count, which bounces a cache line between cores.
- **Fairness** is implementation-defined: a stream of readers can starve a writer, or a waiting writer can block new readers. libstdc++ on Linux builds `shared_mutex` on glibc's rwlock, which prefers readers by default.
- There is no atomic **upgrade** from shared to exclusive: release the shared lock, take the exclusive one, and **re-check** the condition, since another writer may have acted in between.
- Alternatives for read-mostly data: copy-on-write snapshots (readers load a `shared_ptr` to an immutable version; a writer builds a new version and swaps it in), sequence locks, and RCU.

### deep
#### Worked example

```cpp
class PriceTable {
public:
    optional<double> get(const string& sym) const {
        shared_lock lock(m_);                      // many readers at once
        auto it = prices_.find(sym);
        if (it == prices_.end()) return nullopt;
        return it->second;
    }
    void set(const string& sym, double px) {
        unique_lock lock(m_);                      // one writer, no readers
        prices_[sym] = px;
    }
private:
    mutable shared_mutex m_;
    unordered_map<string, double> prices_;
};

int main() {
    PriceTable table;
    table.set("ABC", 100.0);
    atomic<long> reads{0}, misses{0};
    vector<thread> readers;
    for (int r = 0; r < 4; ++r)
        readers.emplace_back([&] {
            for (int i = 0; i < 50000; ++i) {
                if (table.get("ABC")) ++reads;
                if (!table.get("XYZ")) ++misses;
            }
        });
    thread writer([&] { for (int i = 0; i < 1000; ++i) table.set("ABC", 100.0 + i % 7); });
    for (auto& t : readers) t.join();
    writer.join();
    cout << reads << " reads, " << misses << " misses, last price " << *table.get("ABC") << "\n";
}
```

Output (the same in every run):

```text
200000 reads, 200000 misses, last price 105
```

Readers ran concurrently with each other and never saw the map in the middle of an update. `get` returns a copy (`optional<double>`), not a reference into the map, so callers never read guarded data after the lock is released. The last write was `100 + 999 % 7 = 105`.

#### Upgrading safely

```cpp
// sketch: read, and write only if needed
double getOrLoad(const string& sym) {
    {
        shared_lock lock(m_);
        if (auto it = prices_.find(sym); it != prices_.end()) return it->second;
    }                                              // release the shared lock first
    unique_lock lock(m_);
    auto [it, inserted] = prices_.try_emplace(sym, 0.0);   // re-check: another writer may have won
    if (inserted) it->second = loadPrice(sym);
    return it->second;
}
```

#### When not to use one

Measure before switching from a mutex: with short critical sections, every reader still writes to the lock's internal counter, so many cores reading at once can be slower than one plain mutex. Copy-on-write snapshots avoid that shared write for readers entirely.

Connects to: readers-writers problem, mutexes and lock guards, concurrent collections, atomic operations.

### questions
Q: When is a read-write lock better than a mutex?
A: When reads greatly outnumber writes and reads hold the lock long enough that letting them overlap matters, such as lookups in a large, rarely updated table. For short critical sections or frequent writes, a plain mutex is usually as fast or faster because shared locking still updates a shared counter.

Q: Can you upgrade a shared lock to an exclusive lock in C++?
A: Not atomically with std::shared_mutex. You release the shared lock, acquire the exclusive lock, and then re-check the condition, because another thread may have changed the data between the two steps. Attempting to take the exclusive lock while still holding the shared one deadlocks.

Q: What is writer starvation?
A: With a reader-preferring lock, new readers keep entering while earlier ones are still inside, so the count of readers never drops to zero and a waiting writer never gets in. Writer-preferring or fair policies avoid it at the cost of making readers wait; the policy of std::shared_mutex is implementation-defined.

## conc.locks.semaphores-latches-and-barriers
name: "Semaphores, latches and barriers"
importance: important
prereqs: [conc.locks.condition-variables]
scope: "coordination primitives"

### simple
These are traffic signals for threads. A semaphore is a car park with a fixed number of spaces: cars enter while spaces are free and wait otherwise. A latch is a starting gun that fires once when a count reaches zero, and a barrier is a meeting point where a group waits until everyone has arrived, then moves on together, again and again.

### interview
- `std::counting_semaphore<Max>` (C++20) holds a count: `acquire()` waits until it is above zero and decrements it; `release()` increments it and may wake a waiter. Uses: **limit concurrency** (N permits), **signal** between threads (start at 0; one side releases, the other acquires). `binary_semaphore` has a maximum of 1.
- A semaphore has **no owner** and **remembers** releases, so a signal sent before anyone waits is not lost, unlike a condition variable notification.
- `std::latch` (C++20) is a **single-use** countdown: `count_down()` decrements, `wait()` blocks until zero, `arrive_and_wait()` does both. Uses: a start gate, or "wait until N workers finished initializing".
- `std::barrier` (C++20) is **reusable**: each phase completes when the expected number of threads call `arrive_and_wait()`; an optional completion function runs once per phase before anyone continues. Uses: iterative algorithms where every thread must finish step k before any starts step k + 1.
- All three are built for coordination, so they replace hand-written condition-variable code for these patterns and are harder to misuse.

### deep
#### Worked example

```cpp
counting_semaphore<2> slots(2);                 // at most 2 downloads at a time
atomic<int> active{0}, peak{0};

void download(int) {
    slots.acquire();                            // wait for a free slot
    int now = ++active;
    int seen = peak.load();
    while (now > seen && !peak.compare_exchange_weak(seen, now)) {}
    this_thread::sleep_for(5ms);                // pretend to work
    --active;
    slots.release();                            // give the slot back
}

int main() {
    vector<thread> ts;
    for (int i = 0; i < 6; ++i) ts.emplace_back(download, i);
    for (auto& t : ts) t.join();
    cout << "peak concurrent downloads: " << peak << "\n";

    latch startGate(1);                         // one-shot: opens once, stays open
    latch allDone(3);
    atomic<int> started{0};
    vector<thread> runners;
    for (int i = 0; i < 3; ++i)
        runners.emplace_back([&] {
            startGate.wait();                   // everyone waits for the signal
            ++started;
            allDone.count_down();
        });
    startGate.count_down();                     // go
    allDone.wait();                             // blocks until all three counted down
    cout << "started: " << started << "\n";
    for (auto& t : runners) t.join();

    int phase = 0;
    barrier sync(3, [&]() noexcept { cout << "phase " << phase++ << " complete\n"; });
    vector<thread> workers;
    for (int i = 0; i < 3; ++i)
        workers.emplace_back([&] {
            for (int step = 0; step < 2; ++step) sync.arrive_and_wait();   // reusable
        });
    for (auto& t : workers) t.join();
}
```

Output (the peak is never above 2; it was exactly 2 in every run we made):

```text
peak concurrent downloads: 2
started: 3
phase 0 complete
phase 1 complete
```

The barrier's completion function runs once per phase, on one of the arriving threads, while the others are still blocked, so it can safely print or update shared state without a lock. It must be `noexcept`.

#### Choosing

| need | primitive |
|---|---|
| at most N threads inside a section | `counting_semaphore` |
| "B must happen after A", one time | `binary_semaphore` starting at 0, or a `latch(1)` |
| wait until N events happened, once | `latch` |
| repeated lockstep phases | `barrier` |
| wait for an arbitrary condition on shared state | `mutex` + `condition_variable` |

#### Pitfalls

- A semaphore used as a lock allows any thread to release it, so a stray `release()` lets two threads in; prefer a mutex for mutual exclusion.
- A latch cannot be reset; counting it down below zero is undefined behavior.
- Every participant must keep arriving at a barrier; a thread that stops early should call `arrive_and_drop()`, or the others wait forever.

Connects to: semaphores, condition variables, classic coding exercises, thread pools.

### questions
Q: What is the difference between a semaphore and a mutex?
A: A mutex has an owner: only the thread that locked it may unlock it, and it provides mutual exclusion for one thread at a time. A semaphore is a counter with no owner: any thread may release it, it can admit N threads at once, and it remembers releases, which makes it a signaling tool as well.

Q: What is the difference between a latch and a barrier?
A: A latch is a single-use countdown: once its counter reaches zero, it stays open and cannot be reused. A barrier is reusable: each time the expected number of threads arrive, the phase completes, an optional completion function runs, and the barrier resets for the next phase.

Q: How can a binary semaphore enforce that one step happens after another in a different thread?
A: Create it with a count of 0. The thread doing the first step calls release after finishing, and the thread doing the second step calls acquire before starting. Because the semaphore remembers the release, the order is guaranteed even if the second thread starts waiting after the first has already signaled.

## conc.locks.thread-safe-singleton
name: "Thread-safe singleton"
importance: important
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "double-checked locking, static local initialization"

### simple
A singleton is an object meant to exist only once, like the one control tower at an airport. If two threads both notice it does not exist yet and both build it, you get two towers. C++ can build it safely for you: a static variable inside a function is created exactly once, and any thread that arrives while it is being built waits until it is ready.

### interview
- **Static local initialization** ("magic statics", C++11): `static Registry r;` inside a function is initialized exactly once, even with concurrent callers; other threads **block** until the first finishes. This Meyers singleton is the default choice.
- Under the hood, g++ checks a guard byte with an acquire load on each call (cheap) and calls `__cxa_guard_acquire`/`__cxa_guard_release` only the first time. `-fno-threadsafe-statics` turns the protection off.
- If the constructor **throws**, the variable stays uninitialized and the next call tries again. Recursively re-entering the same initialization is undefined behavior (libstdc++ aborts with `recursive_init_error`).
- `std::call_once` with a `std::once_flag` runs any function exactly once; use it when the object is created elsewhere (a member, a `unique_ptr`) or initialization needs arguments.
- **Double-checked locking** (check a pointer, lock, check again, create) is correct only with an `atomic` pointer, a release store after construction and an acquire load on the fast path. With a plain pointer it is a data race, and another thread can see the pointer before the object's fields.
- At program exit, statics are destroyed in reverse order of construction; a singleton used by another static's destructor may already be gone. Leaking it on purpose (`static auto* r = new Registry;`) avoids that.

### deep
#### Worked example

```cpp
atomic<int> constructed{0};

class Registry {
public:
    static Registry& instance() {
        static Registry r;                 // C++11: initialized once, other threads wait
        return r;
    }
    int size() const { return (int)names_.size(); }
private:
    Registry() : names_{"orders", "quotes"} { ++constructed; this_thread::sleep_for(10ms); }
    vector<string> names_;
};

class Connection {                          // lazy with call_once, when a static local won't do
public:
    static Connection& get() {
        call_once(flag_, [] { conn_.reset(new Connection()); });
        return *conn_;
    }
private:
    Connection() { ++constructed; }
    static inline once_flag flag_;
    static inline unique_ptr<Connection> conn_;
};

int main() {
    vector<thread> ts;
    atomic<int> total{0};
    for (int i = 0; i < 8; ++i)
        ts.emplace_back([&] {
            total += Registry::instance().size();
            Connection::get();
        });
    for (auto& t : ts) t.join();
    cout << "constructed " << constructed << " objects, total " << total << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
constructed 2 objects, total 16
```

Eight threads raced to the first call, and the constructor sleeps 10 ms to widen the window, yet each class was built once (2 objects in total), and every thread saw a fully built `Registry` with 2 names (8 × 2 = 16).

#### Retrying after a failed initialization

```cpp
int attempts = 0;
struct Flaky {
    Flaky() { if (++attempts < 3) throw runtime_error("not yet"); }
};
Flaky& flaky() { static Flaky f; return f; }

int main() {
    for (int i = 0; i < 3; ++i) {
        try { flaky(); cout << "attempt " << attempts << ": ready\n"; }
        catch (const exception& e) { cout << "attempt " << attempts << ": " << e.what() << "\n"; }
    }
}
```

Output:

```text
attempt 1: not yet
attempt 2: not yet
attempt 3: ready
```

#### Double-checked locking, broken and fixed

```cpp
// Undefined behavior: instance_ is read without synchronization (a data race).
struct Widget { int value = 42; };
Widget* instance_ = nullptr;
mutex m;
Widget& get() {
    if (!instance_) {                          // unsynchronized read
        lock_guard lock(m);
        if (!instance_) instance_ = new Widget;   // the pointer may be published before the fields
    }
    return *instance_;
}
```

The fix makes `instance_` an `atomic<Widget*>`, loads it with `memory_order_acquire`, and stores it with `memory_order_release` after construction. The OOP singleton article shows that version; in practice the static local does all of it for you.

Connects to: singleton, mutexes and lock guards, memory ordering, static members.

### questions
Q: Why is a function-local static a thread-safe way to create a singleton?
A: Since C++11 the language guarantees that a block-scope static is initialized exactly once: if several threads reach the declaration together, one runs the initializer and the others wait until it finishes. Compilers implement this with a guard variable checked cheaply on each call.

Q: What happens if the singleton's constructor throws?
A: Initialization is considered not to have happened: the exception propagates to that caller, and the next call to the function attempts the initialization again. Other threads that were waiting are released and one of them may retry.

Q: Why is classic double-checked locking with a plain pointer broken?
A: The first check reads the pointer without synchronization while another thread may be writing it, which is a data race and undefined behavior in C++. In practice the writing thread's stores can become visible out of order, so a reader may see a non-null pointer to an object whose fields are not yet initialized. An atomic pointer with release and acquire ordering fixes it.

Q: When would you use std::call_once instead of a static local?
A: When the object is not a simple local static, for example a member unique_ptr that should be created lazily, when initialization needs runtime arguments, or when you want to run an arbitrary one-time setup function. call_once guarantees the function runs exactly once across threads, and retries if it throws.
