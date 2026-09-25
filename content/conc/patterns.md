---
topic: conc.patterns
name: "Concurrency patterns"
subject: conc
order: 4
prereqs: [conc.locks]
---

## conc.patterns.producer-consumer-in-code
name: "Producer-consumer in code"
importance: must
prereqs: [conc.locks.condition-variables]
scope: "bounded blocking queue"

### simple
Producers make items and consumers use them, and a queue in between lets both sides work at their own pace, like a kitchen passing plates to waiters through a hatch with room for only a few plates. When the hatch is full, the kitchen waits; when it is empty, the waiters wait. The limited space stops a fast kitchen from burying slow waiters in plates.

### interview
- A **bounded blocking queue**: a `queue` guarded by a `mutex`, with two condition variables, **`notFull`** (producers wait on it) and **`notEmpty`** (consumers wait on it). `push` waits while full; `pop` waits while empty; each notifies the other side after changing the queue.
- The bound gives **back-pressure**: fast producers slow down instead of using unbounded memory.
- Always wait with a **predicate** (`notEmpty.wait(lock, [&] { return !q.empty() || closed; })`), because of spurious wakeups and because another consumer may take the item first.
- **Shutdown**: a `close()` that sets a flag and notifies **all** waiters; `pop` returns "no item" (for example `nullopt`) once the queue is closed **and** drained, and `push` fails after closing. The alternative is a "poison pill" item per consumer.
- Move items in and out (`std::move`) and do the real work **outside** the lock; hold the mutex only to touch the queue.
- Variants: one condition variable with `notify_all` (simpler, more wakeups), semaphores counting free and filled slots, or a lock-free ring buffer for one producer and one consumer.

### deep
#### Worked example

```cpp
template <class T>
class BoundedQueue {
public:
    explicit BoundedQueue(size_t capacity) : cap_(capacity) {}

    bool push(T item) {                           // blocks while full; false once closed
        unique_lock lock(m_);
        notFull_.wait(lock, [&] { return q_.size() < cap_ || closed_; });
        if (closed_) return false;
        q_.push(std::move(item));
        peak_ = max(peak_, q_.size());
        notEmpty_.notify_one();                   // a consumer may be waiting
        return true;
    }

    optional<T> pop() {                           // blocks while empty; nullopt when closed and drained
        unique_lock lock(m_);
        notEmpty_.wait(lock, [&] { return !q_.empty() || closed_; });
        if (q_.empty()) return nullopt;
        T item = std::move(q_.front());
        q_.pop();
        notFull_.notify_one();                    // a producer may be waiting
        return item;
    }

    void close() {                                // no more pushes; wake everyone
        { lock_guard lock(m_); closed_ = true; }
        notFull_.notify_all();
        notEmpty_.notify_all();
    }

    size_t peak() const { lock_guard lock(m_); return peak_; }

private:
    mutable mutex m_;
    condition_variable notFull_, notEmpty_;
    queue<T> q_;
    size_t cap_, peak_ = 0;
    bool closed_ = false;
};

int main() {
    BoundedQueue<int> q(8);
    atomic<long long> sum{0};
    atomic<int> items{0};
    vector<thread> producers, consumers;
    for (int p = 0; p < 2; ++p)
        producers.emplace_back([&, p] {
            for (int i = 1; i <= 1000; ++i) q.push(p * 1000 + i);   // 1..2000 in total
        });
    for (int c = 0; c < 3; ++c)
        consumers.emplace_back([&] {
            while (auto item = q.pop()) { sum += *item; ++items; }
        });
    for (auto& t : producers) t.join();
    q.close();                                    // producers are done: let consumers finish
    for (auto& t : consumers) t.join();
    cout << items << " items, sum " << sum << ", peak size " << q.peak() << " (capacity 8)\n";
}
```

Output (the peak can never exceed 8; it reached 8 in each of our runs, but could be lower on another machine):

```text
2000 items, sum 2001000, peak size 8 (capacity 8)
```

Every item arrived exactly once (1 + 2 + … + 2000 = 2,001,000), however the scheduler interleaved two producers and three consumers; this held in every run under ThreadSanitizer. The queue filled up to its bound, so producers really did wait: that is back-pressure at work.

#### Why each piece is there

| piece | what goes wrong without it |
|---|---|
| predicate on every `wait` | a spurious wakeup, or another consumer taking the item first, makes `pop` read an empty queue |
| `closed_` flag checked in both predicates | consumers sleep forever after the producers finish |
| `notify_all` in `close` | only one of several sleeping consumers learns about the shutdown |
| `pop` returns `nullopt` only when closed **and** empty | items still in the queue at shutdown are lost |
| two condition variables | producers and consumers wake each other needlessly (still correct with one and `notify_all`, just slower) |
| the bound | memory grows without limit when consumers are slower |

#### Edge cases and bugs

- Calling `close()` before the producers finish makes their later `push` calls fail; join the producers first, as above.
- Processing an item while holding the queue's lock turns the queue into a bottleneck.
- If a consumer throws, the item it held is lost; decide whether to requeue or log it.
- With priorities, swap `queue` for `priority_queue`, keeping the same locking.

Connects to: producer-consumer problem, condition variables, message queues, thread pools, lock-free data structures.

### questions
Q: How do you implement a bounded blocking queue in C++?
A: Protect a std::queue with a mutex and use two condition variables. push waits on notFull until the size is below capacity, adds the item and notifies notEmpty; pop waits on notEmpty until the queue is not empty, removes an item and notifies notFull. Both waits use predicates so spurious wakeups are harmless.

Q: Why should the queue be bounded?
A: An unbounded queue lets a fast producer outrun a slow consumer until memory runs out, and latency grows as items wait longer. A bound applies back-pressure: producers block when the queue is full, which slows them to the rate the consumers can sustain.

Q: How do you shut down consumers that are blocked on an empty queue?
A: Add a closed flag set under the mutex by a close method that then calls notify_all on both condition variables. The pop predicate also accepts closed, and pop returns an empty result only when the queue is closed and empty, so remaining items are still drained. Sending one poison-pill item per consumer is an alternative.

Q: Why use two condition variables instead of one?
A: With a single condition variable, notify_one could wake a producer when a consumer should run, or the reverse, so you would need notify_all and accept extra wakeups. Separate notFull and notEmpty variables let each side wake exactly the kind of thread that can make progress.

Q: Where do you do the actual work on a popped item, and why?
A: After pop returns, outside the queue's lock. Holding the mutex while processing would block every other producer and consumer for the whole duration, turning the queue into a serial bottleneck.

## conc.patterns.thread-pools
name: "Thread pools"
importance: must
prereqs: [conc.patterns.producer-consumer-in-code]
scope: "task queues, sizing, work stealing idea"

### simple
A thread pool is a team of workers who stay at their desks all day, taking jobs from a shared in-tray, instead of hiring a new person for every job and letting them go afterwards. Reusing workers saves the cost of hiring, and a fixed team size stops the office from overflowing. You drop a job in the tray and later collect the result from a numbered claim ticket.

### interview
- A pool starts **N worker threads** once; each loops: wait for a task on a shared queue, run it, repeat. It is a producer-consumer queue whose items are callables (`function<void()>`).
- `submit(f)` wraps `f` in a `packaged_task`, pushes it and returns a `future` for the result; exceptions thrown by the task reach the caller through `future::get()`.
- **Sizing**: CPU-bound work, about one thread per core (`hardware_concurrency()`); I/O-bound work, more threads, roughly cores × (1 + wait time / compute time); measure under realistic load.
- **Shutdown**: decide whether to drain queued tasks (finish them) or drop them, then wake all workers and join them.
- **Work stealing**: each worker has its own deque; it pushes and pops its own tasks at one end (good cache locality), and an idle worker steals from the **other** end of someone else's deque. It cuts contention on a single queue and balances uneven, recursive workloads (used by Intel TBB and Go's scheduler).
- Pitfalls: a task that blocks waiting for another task queued behind it can **deadlock** a small pool; long blocking I/O ties up workers; unbounded queues hide overload.

### deep
#### Worked example

```cpp
class ThreadPool {
public:
    explicit ThreadPool(size_t n) {
        for (size_t i = 0; i < n; ++i)
            workers_.emplace_back([this] { workLoop(); });
    }
    ~ThreadPool() {                               // finish queued tasks, then stop
        { lock_guard lock(m_); stopping_ = true; }
        cv_.notify_all();
        for (auto& w : workers_) w.join();
    }

    template <class F>
    auto submit(F f) -> future<decltype(f())> {
        auto task = make_shared<packaged_task<decltype(f())()>>(std::move(f));
        future<decltype(f())> result = task->get_future();
        {
            lock_guard lock(m_);
            tasks_.push([task] { (*task)(); });   // type-erased: the queue holds void()
        }
        cv_.notify_one();
        return result;
    }

private:
    void workLoop() {
        for (;;) {
            function<void()> job;
            {
                unique_lock lock(m_);
                cv_.wait(lock, [&] { return stopping_ || !tasks_.empty(); });
                if (stopping_ && tasks_.empty()) return;
                job = std::move(tasks_.front());
                tasks_.pop();
            }
            job();                                // run outside the lock
        }
    }

    vector<thread> workers_;
    queue<function<void()>> tasks_;
    mutex m_;
    condition_variable cv_;
    bool stopping_ = false;
};

int main() {
    ThreadPool pool(4);
    vector<future<long long>> parts;
    for (int chunk = 0; chunk < 10; ++chunk)      // 10 tasks for 4 threads
        parts.push_back(pool.submit([chunk] {
            long long s = 0;
            for (long long i = chunk * 100000LL + 1; i <= (chunk + 1) * 100000LL; ++i) s += i * i;
            return s;
        }));
    long long total = 0;
    for (auto& f : parts) total += f.get();       // waits for each result in turn
    cout << "sum of squares 1..1000000 = " << total << "\n";

    auto failing = pool.submit([]() -> int { throw runtime_error("bad input"); });
    try { failing.get(); }
    catch (const exception& e) { cout << "task failed: " << e.what() << "\n"; }
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
sum of squares 1..1000000 = 333333833333500000
task failed: bad input
```

The total matches the formula $\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}$ for $n = 10^6$. The `packaged_task` is held by a `shared_ptr` because `std::function` requires a copyable callable and a `packaged_task` can only be moved. The exception thrown on a worker thread travelled through the future and was rethrown by `get()` in `main`.

#### Sizing

| workload | threads | reasoning |
|---|---|---|
| CPU-bound (hashing, parsing, math) | about the number of cores | more threads only add switching |
| I/O-bound (waiting on disk, network) | cores × (1 + wait / compute) | while one waits, another computes |
| mixed | separate pools for CPU and blocking I/O | slow I/O must not starve CPU tasks |

For example, tasks that wait 90 ms on a database for every 10 ms of computing suggest about 4 × (1 + 9) = 40 threads on 4 cores, before any limit the database itself imposes.

#### The deadlock trap

With a pool of 2 threads, two tasks that each submit a subtask and wait for its future occupy both workers, and the subtasks sit in the queue with no worker left to run them. Fixes: do not block inside tasks, run the subtask inline when the pool is saturated, or use a work-stealing scheduler where a waiting worker runs queued work itself.

#### Work stealing in one picture

```text
worker 1 deque: [t5 t4 t3]  <- worker 1 pushes and pops here (newest first)
                  ^
                  thief (idle worker 2) steals the oldest task from this end
```

Owners work on their newest tasks (still hot in cache), thieves take the oldest (often the biggest unsplit piece), and the two ends rarely collide.

Connects to: producer-consumer in code, futures, promises and async, context switching, creating threads.

### questions
Q: Why use a thread pool?
A: To avoid creating and destroying a thread for each task, which costs tens of microseconds and memory for a stack, and to cap how many threads run at once so the machine is not oversubscribed. Tasks queue up and a fixed set of workers processes them, which also gives one place to handle shutdown and errors.

Q: How many threads should a pool have?
A: For CPU-bound work, about the number of cores, because extra threads only add context switching. For I/O-bound work, more, roughly cores times one plus the ratio of waiting time to computing time. Measure with realistic load and consider separate pools for blocking and computing work.

Q: How does a pool return results and errors to the caller?
A: submit wraps the callable in a packaged_task and returns its future. When a worker runs the task, the return value, or any exception it throws, is stored in the shared state, and the caller's future.get returns the value or rethrows the exception.

Q: What is work stealing?
A: Each worker keeps its own double-ended queue of tasks, pushing and popping at one end. When a worker runs out, it steals from the opposite end of another worker's deque. This reduces contention compared with one shared queue and balances load automatically, especially for recursive divide-and-conquer tasks.

Q: How can a thread pool deadlock?
A: If tasks block waiting for other tasks submitted to the same pool: when all workers are busy waiting, the tasks they wait for sit in the queue with no free worker to run them. Avoid blocking waits inside pool tasks, or use a work-stealing design where a waiting worker runs pending tasks itself.

## conc.patterns.futures-promises-and-async
name: "Futures, promises and async"
importance: important
prereqs: [conc.patterns.thread-pools]
scope: "getting results from other threads"

### simple
A future is a claim ticket for a result that is not ready yet, and a promise is the matching slot where someone will eventually put that result. One thread keeps the ticket and can wait on it, while another thread does the work and fills the slot, even with an error message if something went wrong. It is like ordering at a counter and waiting for your number to be called.

### interview
- `std::promise<T>` is the **writing** end, `std::future<T>` the **reading** end of a one-shot channel. `set_value` (once) or `set_exception` on the promise; `get()` on the future blocks until then, returns the value or **rethrows the exception**, and can be called only once.
- `std::async(launch::async, f)` runs `f` on a new thread and returns its future; `launch::deferred` runs `f` lazily on the thread that calls `get()`. The future returned by `async` blocks in its destructor until the task finishes.
- `std::packaged_task<R(Args...)>` wraps a callable so that calling it stores its result in a future: the building block of thread pools.
- `std::shared_future` (from `future::share()`) can be copied and read by many threads, each calling `get()`.
- `wait_for(timeout)` returns `future_status::ready`, `timeout` or `deferred`, for polling without blocking forever. A promise destroyed without a value makes `get()` throw `future_error` (broken promise).
- Standard futures have no continuations (`then`) or combinators; libraries and coroutines fill that gap.

### deep
#### Worked example

```cpp
int main() {
    promise<string> order;                          // the writing end
    future<string> receipt = order.get_future();    // the reading end
    thread kitchen([p = std::move(order)]() mutable {
        this_thread::sleep_for(10ms);
        p.set_value("pizza ready");                 // fulfil the promise once
    });
    cout << receipt.get() << "\n";                  // blocks until set_value
    kitchen.join();

    promise<int> broken;
    future<int> answer = broken.get_future();
    thread worker([p = std::move(broken)]() mutable {
        try { throw invalid_argument("negative size"); }
        catch (...) { p.set_exception(current_exception()); }   // ship the error across
    });
    try { answer.get(); }
    catch (const exception& e) { cout << "caught: " << e.what() << "\n"; }
    worker.join();

    auto id = [] { return this_thread::get_id(); };
    auto lazy = async(launch::deferred, id);        // runs later, on the thread that calls get()
    auto eager = async(launch::async, id);          // runs now, on a new thread
    cout << "deferred ran here: " << (lazy.get() == this_thread::get_id())
         << ", async ran here: " << (eager.get() == this_thread::get_id()) << "\n";

    promise<void> never;
    future<void> f = never.get_future();
    cout << "ready after 20ms? " << (f.wait_for(20ms) == future_status::ready) << "\n";

    promise<int> start;
    shared_future<int> go = start.get_future().share();   // many readers of one result
    vector<future<int>> results;
    for (int i = 1; i <= 3; ++i)
        results.push_back(async(launch::async, [go, i] { return go.get() * i; }));
    start.set_value(10);
    for (auto& r : results) cout << r.get() << " ";
    cout << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
pizza ready
caught: negative size
deferred ran here: 1, async ran here: 0
ready after 20ms? 0
10 20 30 
```

The promise is moved into the lambda (`mutable` lets the lambda call its non-const `set_value`). The exception object crossed threads inside the shared state. The deferred task ran on `main`'s own thread, at the moment of `get()`.

#### Choosing

| need | use |
|---|---|
| run one function in the background, get its result | `async(launch::async, f)` |
| a thread computes a value at some point in its work | `promise` / `future` |
| a queue of callables whose results come back later | `packaged_task` (inside a pool) |
| many threads wait for one value | `shared_future` |

#### Pitfalls

- `async(f);` without keeping the future blocks immediately in the temporary's destructor, so it runs synchronously.
- Calling `get()` twice on a `future` is undefined behavior (it becomes invalid after the first call); check `valid()` or use `shared_future`.
- Setting a promise twice throws `future_error` (`promise_already_satisfied`).

Connects to: thread pools, creating threads, exceptions vs error codes, event loops and coroutines.

### questions
Q: What is the relationship between std::promise and std::future?
A: They are two ends of a one-shot channel sharing a state. The producing thread holds the promise and sets a value or an exception exactly once; the consuming thread holds the future and calls get, which blocks until the state is ready and then returns the value or rethrows the exception.

Q: What is the difference between launch::async and launch::deferred?
A: launch::async starts the function immediately on a new thread. launch::deferred does not run it until someone calls get or wait on the future, and then runs it synchronously on that calling thread. The default policy lets the implementation choose either.

Q: How does an exception thrown in another thread reach the caller?
A: The worker catches it and stores it in the shared state, with promise::set_exception(current_exception()), or automatically when using packaged_task or async. When the caller calls future::get, the stored exception is rethrown in the caller's thread.

## conc.patterns.concurrent-collections
name: "Concurrent collections"
importance: important
scope: "concurrent hash maps and queues, internals overview"

### simple
A concurrent collection is a container built so many threads can use it at the same time without you adding locks around it. Inside, it splits the work so threads rarely get in each other's way, like a supermarket with many checkout lanes instead of one. Each operation it offers is safe on its own, but a sequence of separate operations still needs care.

### interview
- The C++ standard library has **no** concurrent containers: every `std::` container needs external synchronization for concurrent writes. Libraries provide them (Intel TBB's `concurrent_hash_map` and `concurrent_queue`, folly, Boost.Lockfree).
- Hash map designs, from simple to sophisticated: one **global lock**; **lock striping** (N mutexes, each guarding the buckets whose hash maps to it); **per-bucket** locks with lock-free reads; fully **lock-free** tables (open addressing with CAS on slots). Resizing is the hardest part, since it touches every bucket.
- Queue designs: a mutex with condition variables (the bounded blocking queue); lock-free linked queues (Michael-Scott); bounded ring buffers (SPSC or MPMC with per-slot sequence numbers).
- **Read-mostly** data: copy-on-write snapshots (readers take a `shared_ptr` to an immutable version), or per-thread **sharding** with a merge at the end (often the fastest for counting).
- **API design matters more than internals**: compound actions must be single operations (`insert_or_update(key, fn)`, `compute`, `try_pop`); do not return references into the container; iteration is usually only weakly consistent (it may or may not see concurrent updates).

### deep
#### Worked example: lock striping

```cpp
// Lock striping: 16 independent maps, each with its own mutex.
// Threads touching different stripes never wait for each other.
template <class K, class V, size_t Stripes = 16>
class StripedMap {
public:
    template <class F>
    void update(const K& key, F change) {            // an atomic read-modify-write on one key
        auto& s = stripe(key);
        lock_guard lock(s.m);
        change(s.map[key]);
    }
    optional<V> get(const K& key) const {
        auto& s = stripe(key);
        lock_guard lock(s.m);
        auto it = s.map.find(key);
        if (it == s.map.end()) return nullopt;
        return it->second;
    }
    size_t size() const {                            // locks stripes one at a time: only a
        size_t n = 0;                                // snapshot if writers are still running
        for (auto& s : stripes_) { lock_guard lock(s.m); n += s.map.size(); }
        return n;
    }
private:
    struct Stripe { mutable mutex m; unordered_map<K, V> map; };
    Stripe& stripe(const K& key) { return stripes_[hash<K>{}(key) % Stripes]; }
    const Stripe& stripe(const K& key) const { return stripes_[hash<K>{}(key) % Stripes]; }
    array<Stripe, Stripes> stripes_;
};

int main() {
    StripedMap<string, int> wordCount;
    vector<string> words = {"buy", "sell", "hold", "buy", "buy", "sell"};
    vector<thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([&] {
            for (int round = 0; round < 1000; ++round)
                for (auto& w : words) wordCount.update(w, [](int& c) { ++c; });
        });
    for (auto& th : ts) th.join();
    cout << "buy " << *wordCount.get("buy") << ", sell " << *wordCount.get("sell") << ", hold "
         << *wordCount.get("hold") << ", keys " << wordCount.size() << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
buy 12000, sell 8000, hold 4000, keys 3
```

`update` takes a function and runs it under the stripe's lock, so "read the count, add one, write it back" is one atomic step. An API with separate `get` and `set` would lose increments even though each call locks. `get` returns a copy, never a reference into the map.

#### Designs compared

| design | readers | writers | cost |
|---|---|---|---|
| one mutex around `unordered_map` | serialized | serialized | simplest; fine at low contention |
| lock striping (N locks) | parallel across stripes | parallel across stripes | resizing and `size()` must visit every stripe |
| `shared_mutex` per stripe | many at once | exclusive per stripe | reader counts still bounce cache lines |
| copy-on-write snapshot | lock-free, never blocked | copy the whole structure per write | great for rare writes, bad for frequent ones |
| per-thread shards, merge later | local | local | only works when results can be combined at the end |

Connects to: thread safety, read-write locks, lock-free data structures, hash table internals, unordered containers.

### questions
Q: Does the C++ standard library provide concurrent containers?
A: No. Standard containers allow concurrent reads of const members, but any concurrent modification needs external synchronization. Concurrent hash maps and queues come from libraries such as Intel TBB, folly or Boost.Lockfree, or are built with mutexes and atomics.

Q: What is lock striping?
A: Using a fixed array of locks, each guarding a subset of the buckets chosen by hash, instead of one lock for the whole table. Threads that touch keys in different stripes proceed in parallel, while operations on the same stripe are still serialized, giving much less contention than a global lock.

Q: Why must a concurrent map offer compound operations such as insert-or-update?
A: Because separate calls are not atomic together: two threads that each read a count, add one and write it back can both read the same old value and lose an increment, even if every call locks internally. An operation that performs the whole read-modify-write under one lock, or with a CAS, avoids the race.

## conc.patterns.classic-coding-exercises
name: "Classic coding exercises"
importance: important
scope: "print in order, odd-even printing, FizzBuzz with threads, building H2O"

### simple
These interview puzzles give you a few threads and a rule about the order or grouping of what they do, such as "these three steps must happen in order, whatever order the threads start in". They are small, but they test exactly the skills real concurrent code needs: waiting for your turn without wasting CPU, waking the right thread, and never getting stuck. Each one is solved by choosing the right signal: a semaphore, a condition variable or a barrier.

### interview
- **Ordering steps** across threads started in any order: one signal per boundary. Two `binary_semaphore`s starting at 0 (or latches or promises): step 1 releases A, step 2 acquires A then releases B, step 3 acquires B.
- **Taking turns** (odd and even numbers, two words alternating, zero-even-odd): a shared `turn` or `next` value under a mutex; each thread waits on a condition variable until it is its turn, acts, advances the state and calls `notify_all`. Pairs of semaphores that pass a token back and forth also work.
- **One counter, several roles** (FizzBuzz with four threads): each thread waits until the current number belongs to its category; every thread must also wake up and **exit** when the counter passes n.
- **Forming groups** (two hydrogen and one oxygen per molecule): semaphores limit how many of each kind may enter the current group (2 and 1), and a `barrier` of 3 releases the group together; the permits are returned only after the group has formed.
- Checklist: wait with a predicate, no busy-waiting, a clean exit condition for every thread, no lost wakeups (state changes under the mutex), and no deadlock when threads start in any order.

### deep
#### Ordering and taking turns

```cpp
// 1. Three steps run on three threads started in any order; they must happen first, second, third.
binary_semaphore firstDone(0), secondDone(0);      // both start "not yet"
void first(string& out)  { out += "first "; firstDone.release(); }
void second(string& out) { firstDone.acquire(); out += "second "; secondDone.release(); }
void third(string& out)  { secondDone.acquire(); out += "third"; }

// 2. Two threads take turns: one prints odd numbers, the other even, up to n.
void alternate(int n, string& out) {
    mutex m;
    condition_variable cv;
    int next = 1;
    auto player = [&](int parity) {
        for (;;) {
            unique_lock lock(m);
            cv.wait(lock, [&] { return next > n || next % 2 == parity; });   // my turn, or done
            if (next > n) return;
            out += to_string(next++) + " ";
            cv.notify_all();                        // hand the turn over
        }
    };
    thread odd(player, 1), even(player, 0);
    odd.join();
    even.join();
}

int main() {
    string order;
    thread c(third, ref(order)), b(second, ref(order)), a(first, ref(order));   // reversed start
    a.join(); b.join(); c.join();
    cout << order << "\n";

    string turns;
    alternate(10, turns);
    cout << turns << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
first second third
1 2 3 4 5 6 7 8 9 10 
```

The semaphores also make the writes to `order` safe: each `release` happens before the matching `acquire` returns, so the three appends never overlap. In `alternate`, the predicate `next > n` lets both threads leave; without it, the thread that did not print the last number would wait forever.

#### One counter, four roles, and forming groups

```cpp
// 3. FizzBuzz with four threads: each owns one kind of output and waits for its numbers.
string fizzBuzz(int n) {
    mutex m;
    condition_variable cv;
    int i = 1;
    string out;
    auto kind = [](int k) { return k % 15 == 0 ? 3 : k % 5 == 0 ? 2 : k % 3 == 0 ? 1 : 0; };
    auto worker = [&](int mine) {
        for (;;) {
            unique_lock lock(m);
            cv.wait(lock, [&] { return i > n || kind(i) == mine; });
            if (i > n) return;
            const char* words[] = {"", "Fizz", "Buzz", "FizzBuzz"};
            out += (mine == 0 ? to_string(i) : words[mine]) + string(" ");
            ++i;
            cv.notify_all();
        }
    };
    vector<thread> ts;
    for (int k = 0; k < 4; ++k) ts.emplace_back(worker, k);
    for (auto& t : ts) t.join();
    return out;
}

// 4. Water molecules: hydrogen and oxygen threads leave only in groups of two H and one O.
string water(int molecules) {
    counting_semaphore<2> hSlots(2);                // at most two H in the current group
    binary_semaphore oSlot(1);                      // at most one O
    mutex m;
    string current, out;
    int good = 0;
    barrier group(3, [&]() noexcept {               // runs once per full group
        string sorted = current;
        sort(sorted.begin(), sorted.end());
        if (sorted == "HHO") ++good;
        current.clear();
    });
    auto bond = [&](char atom) {
        { lock_guard lock(m); current += atom; }
        group.arrive_and_wait();                    // wait until the molecule is complete
    };
    auto hydrogen = [&] { hSlots.acquire(); bond('H'); hSlots.release(); };
    auto oxygen = [&] { oSlot.acquire(); bond('O'); oSlot.release(); };
    vector<thread> ts;
    for (int i = 0; i < molecules; ++i) {           // start the atoms in a scrambled order
        ts.emplace_back(hydrogen);
        ts.emplace_back(oxygen);
        ts.emplace_back(hydrogen);
    }
    for (auto& t : ts) t.join();
    return to_string(good) + " of " + to_string(molecules) + " molecules were H2O";
}

int main() {
    cout << fizzBuzz(15) << "\n";
    cout << water(20) << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz 
20 of 20 molecules were H2O
```

In `water`, at most two hydrogen permits and one oxygen permit are out at any time, and a thread returns its permit only after its group's barrier phase completes. So every set of three threads that meets at the barrier is exactly two H and one O, whatever order the 60 threads start in; the completion function checks each group.

Connects to: semaphores, latches and barriers, condition variables, dining philosophers, producer-consumer in code.

### questions
Q: How do you make three functions run in order when their threads start in any order?
A: Use two signals that start unset, such as binary semaphores initialized to 0. The first function releases the first semaphore when done; the second acquires it, runs, then releases the second semaphore; the third acquires that one before running. Because semaphores remember releases, it works even if a signal is sent before anyone waits.

Q: How do two threads print numbers alternately?
A: Share a counter protected by a mutex. Each thread waits on a condition variable until the counter's parity matches its own or the end is reached, prints and increments the counter, then calls notify_all to hand over the turn. The end condition in the predicate lets both threads exit cleanly.

Q: What are the common bugs in these exercises?
A: Waiting without a predicate, which breaks on spurious or lost wakeups; forgetting an exit condition so one thread waits forever after the last item; busy-waiting in a loop that burns CPU; and using notify_one when several threads wait for different conditions, which can wake the wrong one and stall.

Q: How do you form groups of exactly two hydrogen and one oxygen threads?
A: Limit entry with a semaphore of 2 permits for hydrogen and 1 for oxygen, and make each admitted thread wait at a barrier of 3. When the barrier releases the group, each thread returns its permit, letting the next group form. The permits guarantee the mix, and the barrier makes the group leave together.

## conc.patterns.event-loops-and-coroutines
name: "Event loops and coroutines"
importance: advanced
prereqs: [conc.patterns.futures-promises-and-async]
scope: "async I/O model"

### simple
An event loop is one very organized worker with a to-do list of things that are waiting: whenever something becomes ready, such as a reply arriving, it handles that and goes back to the list. Nothing ever sits blocked, so one thread can look after thousands of slow conversations. Coroutines make that style readable: you write code that looks like it waits step by step, and it quietly steps aside instead of blocking.

### interview
- An **event loop** runs on one thread: it asks the OS which sockets or timers are ready (`epoll` on Linux, `kqueue` on BSD and macOS, IOCP on Windows), runs the handler for each ready event, and repeats. Handlers must **never block**; long computations go to a thread pool.
- **Reactor** (readiness: "this socket can be read now", then you read) versus **proactor** (completion: "your read finished", as in `io_uring` and IOCP). Servers such as nginx and Redis are built around event loops.
- Thousands of connections cost one thread and a small state object each, instead of one thread and stack per connection.
- **C++20 coroutines** are functions that can suspend (`co_await`, `co_yield`) and later resume (`co_return` to finish). They are **stackless**: the compiler stores the locals in a heap-allocated frame. The language provides the mechanism; the task and awaitable types come from a library or your own code (C++23 adds `std::generator`).
- An **awaitable** decides what suspension means: `await_ready` (skip suspending?), `await_suspend(handle)` (register the handle, such as on a timer or a socket), `await_resume` (the result). The event loop later calls `handle.resume()`.
- Pitfalls: a blocking call inside a coroutine stalls the whole loop; references captured by a suspended coroutine may dangle by the time it resumes; ownership of coroutine frames must be clear.

### deep
#### Worked example: coroutines on a tiny event loop

The loop below uses virtual time instead of real sockets, so the output is exact, but the structure is the same as a real one: tasks suspend at `co_await`, register themselves with the loop, and the loop resumes whichever is ready next.

```cpp
struct Loop {                                        // a single-threaded event loop, virtual time
    int now = 0;
    long order = 0;
    using Entry = tuple<int, long, coroutine_handle<>>;   // wake time, arrival order, coroutine
    priority_queue<Entry, vector<Entry>, greater<>> timers;
    void wakeAt(int time, coroutine_handle<> h) { timers.push({time, order++, h}); }
    void run() {
        while (!timers.empty()) {
            auto [time, seq, h] = timers.top();
            timers.pop();
            now = time;                              // jump straight to the next event
            h.resume();                              // continue that coroutine until it waits again
        }
    }
} loop;

struct Sleep {                                       // co_await Sleep{ms}: park on the timer queue
    int ms;
    bool await_ready() const noexcept { return ms <= 0; }
    void await_suspend(coroutine_handle<> h) { loop.wakeAt(loop.now + ms, h); }
    void await_resume() const noexcept {}
};

struct Task {                                        // a minimal fire-and-forget coroutine type
    struct promise_type {
        Task get_return_object() { return {}; }
        suspend_never initial_suspend() noexcept { return {}; }   // start running immediately
        suspend_never final_suspend() noexcept { return {}; }     // free the frame when done
        void return_void() {}
        void unhandled_exception() { terminate(); }
    };
};

Task fetch(string name, int latency) {
    cout << loop.now << "ms " << name << ": send request\n";
    co_await Sleep{latency};                         // no thread blocks while "waiting"
    cout << loop.now << "ms " << name << ": got response\n";
    co_await Sleep{5};
    cout << loop.now << "ms " << name << ": saved\n";
}

int main() {
    fetch("prices", 30);                             // each call runs to its first co_await
    fetch("news", 10);
    fetch("orders", 20);
    loop.run();                                      // one thread interleaves all three
}
```

Output:

```text
0ms prices: send request
0ms news: send request
0ms orders: send request
10ms news: got response
15ms news: saved
20ms orders: got response
25ms orders: saved
30ms prices: got response
35ms prices: saved
```

All three requests were in flight at once on a single thread: that is concurrency without parallelism. Each `fetch` reads like straight-line code, but at every `co_await` the coroutine's locals (such as `name`) are saved in its frame, `await_suspend` hands the handle to the loop, and control returns to the caller. The loop resumes each coroutine when its timer fires, and the total time is 35 ms rather than the 75 ms the three would take one after another. Replacing the timer queue with `epoll` readiness events turns this into the core of a network server. Built with AddressSanitizer, the program reports no leaks: every frame freed itself after its final suspend.

#### Threads versus an event loop

| | thread per connection | event loop |
|---|---|---|
| memory per connection | a stack (reserved megabytes) | a small state object or coroutine frame |
| blocking calls | fine | forbidden: they stall every connection |
| CPU-heavy work | fine (parallel on cores) | must be sent to a worker pool |
| shared state | needs locks | one thread: no locks needed inside the loop |
| code style | straight-line | callbacks, or coroutines that read straight-line |

Connects to: concurrency vs parallelism, futures, promises and async, thread pools, I/O models, user-level vs kernel-level threads.

### questions
Q: How can one thread handle thousands of network connections?
A: With an event loop over non-blocking sockets: the thread asks the kernel, through epoll or a similar interface, which connections are ready, handles only those, and never blocks waiting on any single one. Each connection needs only a small state object instead of its own thread and stack.

Q: What is the difference between a reactor and a proactor?
A: A reactor is notified when an operation can proceed, for example that a socket is readable, and then performs the read itself; epoll-based loops work this way. A proactor starts the operation and is notified when it has completed, with the data already transferred, as with io_uring on Linux or IOCP on Windows.

Q: What are C++20 coroutines?
A: Functions that can suspend at co_await or co_yield and be resumed later, finishing with co_return. They are stackless: their local state lives in a compiler-generated frame, usually on the heap. The language supplies the mechanism; libraries supply task, generator and awaitable types that decide when and where a suspended coroutine resumes.

Q: What happens if a handler in an event loop makes a blocking call?
A: The whole loop stops: no other event is processed until the call returns, so every connection served by that thread stalls. Blocking work, such as file access without async APIs or heavy computation, should be sent to a separate thread pool, with the result delivered back to the loop.
