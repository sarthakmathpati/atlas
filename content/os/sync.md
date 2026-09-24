---
topic: os.sync
name: "Synchronization"
subject: os
order: 5
prereqs: [os.threads]
---

## os.sync.race-conditions-and-critical-sections
name: "Race conditions and critical sections"
importance: must
prereqs: [os.threads.threads-vs-processes]
scope: "requirements (mutual exclusion, progress, bounded waiting)"

### simple
A race condition happens when the result of a program depends on the exact timing of threads that share data. Two people updating the same shared shopping list at once might both read "3 apples", each add one, and both write "4", so one addition is lost. The part of the code that touches shared data is the critical section, and only one thread should be in it at a time.

### interview
- A **race condition**: the outcome depends on the interleaving of concurrent operations on **shared data**, where at least one is a write. `counter++` is really **load, add, store**, so two threads can both load 5 and both store 6.
- A **critical section** is the code that accesses the shared resource; the rest is the entry section (acquire), exit section (release) and remainder section.
- A correct solution must satisfy: **mutual exclusion** (at most one process in the critical section), **progress** (if none is inside, the choice of who enters next cannot be postponed forever, and only processes trying to enter take part), and **bounded waiting** (a limit on how many times others can enter after a process has asked, so no one starves). It must not assume anything about relative speeds or the number of CPUs.
- Tools, from low to high level: atomic hardware instructions, Peterson's algorithm (theory), mutexes, semaphores, monitors and condition variables, and lock-free data structures.
- Keep critical sections **short**: they serialize threads, and long ones hurt throughput (Amdahl).
- In C++ an unsynchronized data race is **undefined behavior**, not just a wrong number.

### deep
#### Intuition

Each thread's steps are correct on their own; the bug lives only in how the steps of different threads interleave. Because the interleaving changes from run to run, race conditions appear rarely, vanish under the debugger and survive testing. The cure is to make the sensitive sequence of steps appear indivisible to other threads.

#### Worked example: a lost update

`counter++` compiles to roughly three steps: load into a register, add 1, store back. With `counter = 5`:

| step | thread A | thread B | counter in memory |
|---|---|---|---|
| 1 | load 5 | | 5 |
| 2 | | load 5 | 5 |
| 3 | add: 6 | | 5 |
| 4 | | add: 6 | 5 |
| 5 | store 6 | | 6 |
| 6 | | store 6 | 6 (one increment lost) |

#### Code: the race and two fixes

```cpp
int unsafeCounter = 0;                 // shared, unprotected
int lockedCounter = 0;                 // protected by m
mutex m;
atomic<int> atomicCounter{0};          // a single atomic read-modify-write

int main() {
    auto work = [] {
        for (int i = 0; i < 100000; ++i) {
            ++unsafeCounter;                              // data race: undefined behavior
            { lock_guard<mutex> g(m); ++lockedCounter; } // critical section
            ++atomicCounter;                              // hardware-atomic increment
        }
    };
    thread a(work), b(work);
    a.join(); b.join();
    printf("unsafe %d, mutex %d, atomic %d\n", unsafeCounter, lockedCounter, atomicCounter.load());
    // one run: unsafe 195648 (it varies), mutex 200000, atomic 200000
}
```

The unsafe count changes from run to run. In a loop that did nothing but the unprotected increment, three test runs gave 112750, 102130 and 127514; the protected counters always give 200000.

```python
import threading
import time

counter = 0
lock = threading.Lock()


def unsafe_add():
    global counter
    for _ in range(1000):
        value = counter
        time.sleep(0)          # invite a thread switch between read and write
        counter = value + 1


def safe_add():
    global counter
    for _ in range(1000):
        with lock:             # entry and exit sections
            value = counter
            time.sleep(0)
            counter = value + 1


for fn in (unsafe_add, safe_add):
    counter = 0
    threads = [threading.Thread(target=fn) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(fn.__name__, counter)   # unsafe_add: far below 4000; safe_add: 4000
```

#### The three requirements, by counterexample

| requirement | a "solution" that violates it |
|---|---|
| mutual exclusion | no lock at all: both threads inside at once |
| progress | strict alternation with a `turn` variable: if it is B's turn and B never wants to enter, A is blocked although the section is free |
| bounded waiting | a lock where a fast thread can re-acquire again and again while a slow one never gets in |

#### Structure of a solution

```text
while (true) {
    entry section        // acquire: wait until it is safe to enter
    critical section     // touch shared data
    exit section         // release: let someone else in
    remainder section    // everything else
}
```

#### Pitfalls

- "It's just an increment": any read-modify-write on shared data needs protection.
- Check-then-act races (`if (!map.contains(k)) map[k] = v;`) even when each call is individually thread-safe.
- Protecting writes but not reads: a reader can still see a half-updated structure.

Connects to: mutex locks, semaphores, hardware support, Peterson's solution, data races vs race conditions.

### questions
Q: What is a race condition?
A: A situation where the result of a program depends on the timing or interleaving of concurrent threads or processes accessing shared data, with at least one of them writing. A classic example is two threads incrementing a counter, where both read the same old value and one update is lost.

Q: What is a critical section?
A: The part of a program that accesses a shared resource, such as a shared variable, file or data structure, and therefore must not be executed by more than one thread at a time. It is surrounded by an entry section that acquires permission and an exit section that releases it.

Q: What three requirements must a solution to the critical section problem satisfy?
A: Mutual exclusion: at most one process is in its critical section. Progress: if no process is inside, the decision about who enters next involves only processes that want to enter and cannot be postponed forever. Bounded waiting: once a process requests entry, there is a limit on how many times others can enter before it does.

Q: Why is counter++ not safe across threads?
A: It is not one indivisible operation: the CPU loads the value into a register, adds one and stores it back. If another thread runs between the load and the store, both may store the same result and one increment is lost.

Q: How can you make a counter update safe?
A: Protect it with a mutex so only one thread executes the read-modify-write at a time, or use an atomic variable whose increment the hardware performs indivisibly. For many counters, per-thread counts summed at the end avoid contention altogether.

## os.sync.petersons-solution
name: "Peterson's solution"
importance: important
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "two-process software solution"

### simple
Peterson's solution is a clever way for two processes to take turns safely using only two shared variables and no special hardware. It is like two polite people at a doorway: each says "I'd like to go through", then "but you go first". Whoever said "you go first" last is the one who waits, so exactly one goes through.

### interview
- Shared variables: `flag[2]` (`flag[i]` = process i wants to enter) and `turn` (whose turn it is to yield).
- Process i enters with: `flag[i] = true; turn = j; while (flag[j] && turn == j) wait;` and exits with `flag[i] = false`.
- It satisfies all three requirements: **mutual exclusion** (turn can favor only one when both want in), **progress** (if j does not want in, i enters at once) and **bounded waiting** (i waits for at most one entry by j).
- It is **busy waiting** and works for exactly two processes (generalizations such as the filter lock and Lamport's bakery algorithm exist).
- On **modern CPUs it fails as written** with plain variables: compilers and processors may reorder the store to `flag[i]` after the load of `flag[j]`. It works with sequentially consistent atomics or memory barriers, which is exactly why real systems rely on hardware atomic instructions instead.
- Value in interviews: a clean proof of the three requirements and a lesson about memory ordering.

### deep
#### The algorithm

```cpp
atomic<bool> wants[2];          // flag[i]: process i wants to enter
atomic<int> turn;               // who must yield if both want in
int shared = 0;                 // protected by the algorithm

void lock(int i) {
    int j = 1 - i;
    wants[i].store(true);       // seq_cst atomics: no reordering of these steps
    turn.store(j);              // politely give the other one priority
    while (wants[j].load() && turn.load() == j) {}   // wait only if j wants in and has priority
}

void unlock(int i) { wants[i].store(false); }

int main() {
    auto work = [](int id) {
        for (int k = 0; k < 100000; ++k) { lock(id); ++shared; unlock(id); }
    };
    thread a(work, 0), b(work, 1);
    a.join(); b.join();
    printf("%d\n", shared);     // 200000
}
```

#### Why it is correct

**Mutual exclusion.** Suppose both are inside. Each set its own flag before checking, so each saw the other's flag true; to pass the loop, each must have seen `turn` equal to itself. But `turn` holds one value, and whoever wrote it last wrote the other's number, so that process could not pass. Contradiction.

**Progress.** If j is not trying (`wants[j] == false`), i's loop condition is false and it enters immediately.

**Bounded waiting.** If i is waiting, j is inside. When j leaves and tries again, j sets `turn = i`, so j will wait and i enters: i waits for at most one of j's critical sections.

#### Worked example: both arrive together

| step | P0 | P1 | turn | who can enter |
|---|---|---|---|---|
| 1 | wants[0] = true | | - | |
| 2 | | wants[1] = true | - | |
| 3 | turn = 1 | | 1 | |
| 4 | | turn = 0 | 0 | the last writer (P1) yields |
| 5 | loop: wants[1] true, turn 0 ≠ 1: enter | loop: wants[0] true, turn 0 == 0: wait | 0 | P0 |
| 6 | exit: wants[0] = false | loop ends: enter | 0 | P1 |

#### Why it breaks on real hardware

With plain `bool` and `int`, each processor may let its load of `wants[j]` complete before its own store to `wants[i]` is visible (store buffering). Both then read `false`, and both enter. The `seq_cst` atomics above forbid that reordering; the default `std::atomic` operations are sequentially consistent, which makes the code correct but slow compared with a single hardware compare-and-swap.

Connects to: race conditions and critical sections, hardware support, mutex locks, memory ordering.

### questions
Q: How does Peterson's solution work?
A: Two shared variables are used: a flag per process saying it wants to enter, and a turn variable. To enter, process i sets its flag, sets turn to the other process, and waits while the other's flag is set and turn still favors the other. On exit it clears its flag.

Q: Why does Peterson's solution guarantee mutual exclusion?
A: For both processes to be inside, each must have seen turn equal to its own id while the other's flag was set. The turn variable can only hold one value, and the process that wrote it last gave priority to the other, so it must wait. Both cannot pass the check at once.

Q: Does Peterson's solution work on modern processors?
A: Not with ordinary variables, because compilers and CPUs may reorder the store to one's own flag with the load of the other's flag, letting both enter. It works if the variables are sequentially consistent atomics or memory barriers are added, which is why practical locks use hardware atomic instructions.

Q: What are the limitations of Peterson's solution?
A: It handles only two processes, it busy-waits and wastes CPU while waiting, and it depends on sequentially consistent memory. Generalizations exist, such as the filter lock and Lamport's bakery algorithm, but hardware-supported locks are simpler and faster.

## os.sync.mutex-locks
name: "Mutex locks"
importance: must
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "acquire and release, busy waiting vs blocking"

### simple
A mutex is a lock that lets only one thread at a time into a critical section. It works like the single key to a shop's restroom: you take the key, use the room, and hang the key back for the next person. Anyone who arrives while the key is gone either keeps checking the hook or sits down until someone brings it back.

### interview
- A **mutex** (mutual exclusion lock) has two operations: `acquire` (lock) waits until the lock is free and takes it; `release` (unlock) frees it. Only the **owner** that locked it may unlock it.
- **Busy waiting (spinlock)**: the waiter loops checking the lock. No context switch, so it is best for very short critical sections on multicore machines, but it wastes CPU and is terrible on a single core.
- **Blocking**: the waiter sleeps in a kernel wait queue and is woken on release. No CPU wasted, but each sleep and wakeup costs a context switch (microseconds).
- Real mutexes are **hybrid**: Linux's pthread mutex uses a **futex**, so the uncontended path is one atomic instruction in user space and the kernel is involved only under contention; adaptive mutexes spin briefly before sleeping.
- Use **RAII** (`std::lock_guard`, `std::scoped_lock`, Java `synchronized` or try/finally, Python `with lock:`) so exceptions cannot leave a lock held.
- Hazards: deadlock (lock ordering), forgetting to unlock, holding locks during slow I/O, contention; a normal mutex locked twice by the same thread deadlocks (a **recursive** mutex allows it).

### deep
#### Intuition

A mutex turns a critical section into a one-at-a-time room. The interesting design question is what a thread does while the room is busy: keep checking (spin) or go to sleep and ask to be woken (block). The right answer depends on how long the lock is usually held compared with the cost of sleeping and waking.

#### Spin vs block

| | spinlock | blocking mutex |
|---|---|---|
| waiting thread | loops on the CPU | sleeps in the kernel |
| cost when the lock is free | one atomic instruction | one atomic instruction (futex fast path) |
| cost under contention | burns CPU while spinning | two context switches (sleep, wake) |
| best for | tiny sections, multicore, kernels, interrupt handlers | anything longer than a few microseconds |
| on one core | wasteful: the holder cannot run while you spin | fine |

#### Code

```cpp
class BankAccount {
    mutable mutex m;
    long long balance = 0;
public:
    void deposit(long long x) {
        lock_guard<mutex> g(m);                 // RAII: unlocked even if an exception is thrown
        balance += x;
    }
    bool withdraw(long long x) {
        lock_guard<mutex> g(m);                 // check and update inside one critical section
        if (x > balance) return false;
        balance -= x;
        return true;
    }
    long long get() const { lock_guard<mutex> g(m); return balance; }
};

void transfer(BankAccount& from, BankAccount& to, long long x) {
    if (from.withdraw(x)) to.deposit(x);        // each call is atomic, the pair is not
}

int main() {
    BankAccount a;
    vector<thread> ts;
    for (int i = 0; i < 8; ++i)
        ts.emplace_back([&] { for (int k = 0; k < 10000; ++k) a.deposit(1); });
    for (auto& t : ts) t.join();
    cout << a.get() << "\n";                    // 80000
}
```

```python
import threading

balance = 0
lock = threading.Lock()


def deposit(n):
    global balance
    for _ in range(n):
        with lock:                 # acquire on entry, release on exit (even on exceptions)
            balance += 1


threads = [threading.Thread(target=deposit, args=(10000,)) for _ in range(8)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(balance)   # 80000
```

#### Worked example: contention timeline

Threads T1 and T2 on two cores, lock held for 5 µs, sleeping plus waking costs about 3 µs.

| time (µs) | T1 | T2 (spinning) | T2 (blocking) |
|---|---|---|---|
| 0 | acquires | tries, lock busy | tries, lock busy, goes to sleep |
| 0 to 5 | critical section | spins, burning a core | asleep, core free for others |
| 5 | releases | sees it free at once, acquires | woken by the kernel |
| ~8 | | already done | acquires after wakeup latency |

Spinning wins when hold times are shorter than a sleep and wake cycle; blocking wins otherwise. Adaptive mutexes spin for a short while and then sleep.

#### How a futex-based mutex works (simplified)

1. Lock: atomically change the lock word from 0 (free) to 1 (locked). If that succeeds, done: no system call.
2. If it was taken, mark it 2 (locked with waiters) and call `futex(WAIT)`, which sleeps only if the word is still 2.
3. Unlock: set it to 0; if it was 2, call `futex(WAKE)` to wake one waiter.

#### Pitfalls

- Locking only around writes, or around each call instead of the whole check-then-act sequence (`transfer` above is still not atomic as a whole).
- Holding a lock while calling unknown code or doing I/O.
- Taking two locks in different orders in different threads: deadlock. Use a global order or `std::scoped_lock(a, b)`.
- Unlocking a mutex from a thread that does not own it (undefined behavior for `std::mutex`).

Connects to: race conditions and critical sections, semaphores, hardware support, deadlock prevention, priority inversion.

### questions
Q: What is a mutex and what are its operations?
A: A mutex is a lock that ensures only one thread is inside a critical section at a time. acquire or lock waits until the mutex is free and takes ownership; release or unlock gives it up. Only the thread that locked a mutex should unlock it.

Q: What is the difference between a spinlock and a blocking mutex?
A: A spinlock waits by repeatedly checking the lock in a loop, which avoids a context switch but consumes CPU. A blocking mutex puts the waiting thread to sleep in the kernel and wakes it when the lock is released, which frees the CPU but costs context switches. Spinlocks suit very short critical sections on multicore machines.

Q: Why are spinlocks a bad idea on a single-core machine?
A: While the waiter spins, the thread holding the lock cannot run, so it cannot release the lock until the spinner's time slice ends. The spinning only wastes the CPU and delays the holder.

Q: What is a futex?
A: A fast user-space mutex mechanism in Linux. Lock and unlock are done with atomic instructions on a shared integer in user space, and the kernel is called only when there is contention, to put a thread to sleep or wake one. Uncontended locking therefore needs no system call.

Q: Why use RAII lock guards instead of calling lock and unlock manually?
A: A guard releases the mutex in its destructor, so the lock is freed on every path out of the scope, including early returns and exceptions. Manual unlock calls are easy to miss, and a forgotten unlock leaves other threads blocked forever.

## os.sync.semaphores
name: "Semaphores"
importance: must
prereqs: [os.sync.mutex-locks]
scope: "binary vs counting, wait and signal"

### simple
A semaphore is a counter that controls how many threads may use something at once. A parking lot with a sign showing free spaces is a semaphore: each car entering takes one space, each car leaving frees one, and when the count reaches zero new cars wait at the gate. A semaphore with only one space works like a lock.

### interview
- A **semaphore** is an integer with two atomic operations (Dijkstra): **wait** (P, down, acquire) decrements it, blocking while it is 0; **signal** (V, up, release) increments it and wakes a waiter.
- **Counting semaphore**: any non-negative value; models a pool of N identical resources (connections, buffer slots). **Binary semaphore**: 0 or 1; can act as a lock.
- Three standard uses: **mutual exclusion** (initial value 1), **signaling or ordering** (initial 0: "B must happen after A" by having A signal and B wait), **limiting concurrency** (initial N).
- Unlike a mutex, a semaphore has **no owner**: any thread may signal it. That makes it a signaling tool, but also easier to misuse as a lock (a stray signal lets two threads in).
- Implementations keep a **wait queue** so waiters sleep instead of spinning. Available as C++20 `std::counting_semaphore`, POSIX `sem_t`, Java `Semaphore`, Python `threading.Semaphore`.
- Classic problems solved with semaphores: producer-consumer, readers-writers, dining philosophers.

### deep
#### Definition

```text
wait(S):   while S == 0: sleep        // atomically
           S = S - 1
signal(S): S = S + 1                  // atomically
           wake one sleeping waiter, if any
```

(Some textbooks let the value go negative, where −k means k waiters; the behavior is the same.)

#### Worked example: a pool of 3 database connections

S starts at 3; five threads each need a connection for a while.

| event | S | using | waiting |
|---|---|---|---|
| T1, T2, T3 wait | 0 | T1, T2, T3 | - |
| T4 waits | 0 | T1, T2, T3 | T4 |
| T5 waits | 0 | T1, T2, T3 | T4, T5 |
| T2 signals | 0 (T4 takes it) | T1, T3, T4 | T5 |
| T1 signals | 0 (T5 takes it) | T3, T4, T5 | - |
| T3, T4, T5 signal | 3 | - | - |

#### Code: limiting concurrency

```cpp
counting_semaphore<3> slots(3);            // at most 3 threads inside at once
atomic<int> inside{0}, maxInside{0};

void download(int id) {
    slots.acquire();                       // wait (P)
    int now = ++inside;
    int seen = maxInside.load();
    while (now > seen && !maxInside.compare_exchange_weak(seen, now)) {}
    this_thread::sleep_for(chrono::milliseconds(20));   // pretend to use the resource
    --inside;
    slots.release();                       // signal (V)
}

int main() {
    vector<thread> ts;
    for (int i = 0; i < 10; ++i) ts.emplace_back(download, i);
    for (auto& t : ts) t.join();
    cout << "max concurrent: " << maxInside << "\n";   // 3
}
```

#### Code: ordering with a semaphore that starts at 0

```python
import threading

ready = threading.Semaphore(0)       # nothing available yet
log = []


def loader():
    log.append("config loaded")
    ready.release()                  # signal: the event happened


def server():
    ready.acquire()                  # wait: block until the loader signals
    log.append("server started")


threads = [threading.Thread(target=server), threading.Thread(target=loader)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(log)   # ['config loaded', 'server started'] regardless of start order
```

#### Semaphore vs mutex

| | mutex | semaphore |
|---|---|---|
| value | locked or unlocked | a count |
| ownership | yes: only the owner unlocks | none: anyone may signal |
| typical use | mutual exclusion | resource counting, signaling between threads |
| priority inheritance | possible (it knows the owner) | not possible (no owner) |

#### Pitfalls

- Forgetting a signal on an error path: the resource leaks from the pool forever.
- An extra signal raises the count above the real number of resources.
- Getting the order of multiple waits wrong (see producer-consumer, where it causes deadlock).

Connects to: mutex locks, producer-consumer problem, readers-writers problem, dining philosophers, monitors and condition variables.

### questions
Q: What is a semaphore and what are its operations?
A: A semaphore is a non-negative integer shared between threads with two atomic operations. wait, also called P or down, blocks until the value is positive and then decrements it. signal, also called V or up, increments it and wakes a waiting thread.

Q: What is the difference between a binary and a counting semaphore?
A: A binary semaphore takes only the values 0 and 1 and can be used like a lock or a one-time signal. A counting semaphore can take any non-negative value and represents a pool of identical resources, such as N connections or N free buffer slots.

Q: How is a semaphore different from a mutex?
A: A mutex has an owner: only the thread that locked it may unlock it, and it is meant for mutual exclusion. A semaphore has no owner, so any thread can signal it, which makes it suitable for counting resources and for signaling events between threads.

Q: How do you use a semaphore to make one thread wait for another?
A: Initialize the semaphore to 0. The thread that must go second calls wait and blocks; the thread that must go first calls signal after finishing its step, which releases the waiter. The order holds whichever thread starts first.

Q: What happens if a program forgets to signal a counting semaphore on an error path?
A: One unit of the resource is never returned, so the pool effectively shrinks. After enough such errors the count stays at zero and every thread that waits on the semaphore blocks forever.

## os.sync.monitors-and-condition-variables
name: "Monitors and condition variables"
importance: important
prereqs: [os.sync.semaphores]
scope: "higher-level synchronization"

### simple
A monitor is an object that lets only one thread run its methods at a time and gives threads a way to wait for a condition inside it. Think of a single-person office with a waiting bench: only one visitor inside, and a visitor who needs a document that isn't ready yet steps out to the bench until someone says it has arrived. This packages the lock and the waiting together so they are harder to get wrong.

### interview
- A **monitor** bundles shared data with the procedures that access it and guarantees **mutual exclusion** for those procedures automatically (Java `synchronized` methods; in C++ you build one with a mutex plus condition variables).
- A **condition variable** lets a thread wait inside the monitor until some condition becomes true: **wait** atomically releases the lock and sleeps, and re-acquires the lock before returning; **signal** (notify one) wakes one waiter; **broadcast** (notify all) wakes all.
- **Always wait in a `while` loop** that re-checks the condition: wakeups can be **spurious**, and under **Mesa semantics** (used by Java, pthreads, C++) the signaler keeps running, so the condition may change before the waiter gets the lock. (Hoare semantics hand the lock straight to the waiter, but are rarely implemented.)
- Condition variables have **no memory**: a signal with no waiter is lost, unlike a semaphore's count. So the condition itself must live in shared state checked under the lock.
- Use notify-all when different waiters wait for different conditions on one variable, or when a change can satisfy several waiters.
- Tools: `std::mutex` + `std::condition_variable`, `pthread_cond_t`, Java `wait`/`notify`/`notifyAll` or `Condition` objects, Python `threading.Condition`.

### deep
#### Intuition

Semaphores mix two jobs (mutual exclusion and waiting) in one counter, and a misplaced `wait` or `signal` is easy to write and hard to find. A monitor separates them: the lock is implicit around every method, and each condition you care about ("buffer not full", "count reached zero") gets a named condition variable with a clear rule: check the condition under the lock, and wait while it is false.

#### Code: a countdown latch as a monitor

```cpp
class CountDownLatch {
    mutex m;
    condition_variable zero;
    int count;
public:
    explicit CountDownLatch(int n) : count(n) {}
    void countDown() {
        lock_guard<mutex> g(m);
        if (count > 0 && --count == 0) zero.notify_all();    // wake every waiter
    }
    void await() {
        unique_lock<mutex> lk(m);
        zero.wait(lk, [&] { return count == 0; });           // the predicate form loops for you
    }
};

int main() {
    CountDownLatch done(3);
    vector<thread> workers;
    for (int i = 0; i < 3; ++i)
        workers.emplace_back([&, i] {
            this_thread::sleep_for(chrono::milliseconds(10 * i));
            done.countDown();
        });
    done.await();                                             // returns once all 3 have finished
    cout << "all workers done\n";
    for (auto& w : workers) w.join();
}
```

`zero.wait(lk, pred)` is shorthand for `while (!pred()) zero.wait(lk);`.

```java
class Latch {                                  // a Java monitor: synchronized + wait/notifyAll
    private int count;
    Latch(int n) { count = n; }
    synchronized void countDown() {
        if (count > 0 && --count == 0) notifyAll();
    }
    synchronized void await() throws InterruptedException {
        while (count > 0) wait();              // releases the monitor lock while waiting
    }
}
```

#### Worked example: why `if` instead of `while` breaks

A queue with one item and two consumers, C1 and C2, both waiting on "not empty":

| step | event | queue | problem with `if` |
|---|---|---|---|
| 1 | producer adds an item and signals | 1 item | |
| 2 | C1 wakes but must re-acquire the lock | 1 item | |
| 3 | C2, just arriving, takes the lock first and removes the item | empty | |
| 4 | C1 finally gets the lock | empty | with `if`, C1 skips the check and pops from an empty queue |

With `while`, C1 re-checks, finds the queue empty and waits again. Spurious wakeups (a waiter woken with no signal) lead to the same bug.

#### Semantics

| | Hoare | Mesa |
|---|---|---|
| after signal | the waiter runs immediately with the lock | the signaler continues; the waiter competes for the lock later |
| condition when the waiter runs | guaranteed true | may be false again |
| waiting code | `if` would do | must use `while` |
| used by | textbooks | Java, pthreads, C++, Python |

#### Python

```python
import threading

items, cond = [], threading.Condition()


def consume(out):
    with cond:
        while not items:          # re-check after every wakeup
            cond.wait()
        out.append(items.pop())


result = []
t = threading.Thread(target=consume, args=(result,))
t.start()
with cond:
    items.append("job-1")
    cond.notify()
t.join()
print(result)   # ['job-1']
```

Connects to: semaphores, mutex locks, producer-consumer problem, readers-writers problem, concurrency patterns.

### questions
Q: What is a monitor?
A: A synchronization construct that combines shared data, the operations on it and a lock, so that only one thread can execute any of its operations at a time. Condition variables inside the monitor let threads wait for specific conditions. Java objects with synchronized methods are monitors.

Q: What does wait on a condition variable do?
A: It atomically releases the associated mutex and puts the thread to sleep until another thread signals the condition variable, or a spurious wakeup occurs. Before returning, it re-acquires the mutex, so the thread again holds the lock when it continues.

Q: Why must you call wait inside a while loop?
A: Because the condition may not hold when the thread wakes up. Wakeups can be spurious, and with Mesa semantics another thread may run and change the state between the signal and the moment the waiter re-acquires the lock. Re-checking the condition in a loop handles both cases.

Q: What is the difference between a condition variable and a semaphore?
A: A semaphore keeps a count, so a signal with no waiter is remembered for a future wait. A condition variable has no memory: signaling when nobody is waiting does nothing. Condition variables are always used together with a mutex and an explicit condition in shared state.

Q: When should you use notify all instead of notify one?
A: When several waiters may be able to proceed after a change, or when threads waiting on the same condition variable wait for different conditions. Notify one could wake a thread whose condition is still false while the thread that could proceed keeps sleeping.

## os.sync.hardware-support
name: "Hardware support"
importance: important
prereqs: [os.sync.mutex-locks]
scope: "test-and-set, compare-and-swap, spinlocks"

### simple
Locks work because the processor offers special instructions that read and change a memory location in one unbreakable step. It is like a ticket machine that hands out the next number and updates the display at the same instant, so two people can never get the same ticket. Every lock, semaphore and atomic counter is built on top of these instructions.

### interview
- **Test-and-set (TAS)**: atomically set a word to true and return its old value. A lock is acquired when the old value was false.
- **Compare-and-swap (CAS)**: atomically, if `*addr == expected`, write `desired` and report success; otherwise report failure (and, in C++, return the current value). The foundation of lock-free programming (x86 `cmpxchg`).
- Others: **fetch-and-add** (x86 `lock xadd`; ticket locks and counters), atomic exchange (`xchg`), and **load-linked/store-conditional** on ARM and RISC-V.
- **Spinlock**: loop on TAS or CAS until the lock is acquired. Improve it with **test-and-test-and-set** (spin on a plain read, which stays in the local cache, and try the atomic only when the lock looks free) and a CPU pause hint.
- **Disabling interrupts** gives mutual exclusion only on a single processor, is privileged, and is used only briefly inside kernels.
- Atomics also need **memory ordering** (acquire on lock, release on unlock) so the protected data is visible to the next holder; CAS loops can suffer the **ABA problem** (fix with version counters or tagged pointers).

### deep
#### Intuition

Software-only solutions like Peterson's are fragile and slow. Hardware makes the read and the write of one location indivisible, even across cores: the core owns the cache line exclusively for the duration of the instruction, so no other core can sneak in between. With that one guarantee, locks become a few lines.

#### Semantics (each line is one indivisible step)

```text
test_and_set(p):            old = *p; *p = true; return old
compare_and_swap(p, e, d):  if *p == e: *p = d; return true
                            else: return false
fetch_and_add(p, v):        old = *p; *p = old + v; return old
```

#### Code: a spinlock and a CAS loop

```cpp
class SpinLock {
    atomic<bool> locked{false};
public:
    void lock() {
        while (true) {
            if (!locked.exchange(true, memory_order_acquire)) return;   // test-and-set
            while (locked.load(memory_order_relaxed)) {}  // test: spin on a cached read
        }
    }
    void unlock() { locked.store(false, memory_order_release); }
};

atomic<int> best{0};
void recordMax(int value) {                      // lock-free "max" with compare-and-swap
    int seen = best.load();
    while (value > seen && !best.compare_exchange_weak(seen, value)) {
        // on failure, seen now holds the latest value; loop and retry
    }
}

int main() {
    SpinLock sl;
    long long total = 0;
    vector<thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([&, t] {
            for (int i = 0; i < 50000; ++i) {
                sl.lock(); ++total; sl.unlock();
                recordMax(t * 50000 + i);
            }
        });
    for (auto& th : ts) th.join();
    printf("total %lld, max %d\n", total, best.load());   // total 200000, max 199999
}
```

#### Worked example: a CAS increment under contention

Counter starts at 7; threads A and B both try `CAS(counter, seen, seen + 1)`.

| step | A | B | counter |
|---|---|---|---|
| 1 | reads 7 | | 7 |
| 2 | | reads 7 | 7 |
| 3 | CAS(7 → 8) succeeds | | 8 |
| 4 | | CAS(7 → 8) fails: counter is 8 | 8 |
| 5 | | re-reads 8, CAS(8 → 9) succeeds | 9 |

No update is lost: the failed CAS forces B to retry with fresh data.

#### Why test-and-test-and-set

Every TAS is a write, so it takes the cache line in exclusive mode. Many cores spinning with TAS pass the line back and forth continuously and slow down even the lock holder. Spinning on a plain load keeps a shared copy in each core's cache, and traffic happens only when the lock is released.

#### The ABA problem

A lock-free stack pops by CAS on `head`: thread 1 reads `head = A, next = B`, then stalls. Thread 2 pops A, pops B, pushes A back. Thread 1's CAS(`head`: A → B) succeeds, because head is A again, but B is no longer in the stack. Fixes: a version counter next to the pointer (double-width CAS), hazard pointers or epoch-based reclamation.

Connects to: mutex locks, Peterson's solution, atomic operations, lock-free programming, cache lines and locality.

### questions
Q: What does compare-and-swap do?
A: Atomically, it compares a memory location with an expected value and, only if they are equal, replaces it with a new value, reporting whether it succeeded. Because the check and the write are one indivisible step, it can implement locks and lock-free updates that retry on failure.

Q: How do you build a spinlock from test-and-set?
A: The lock is a boolean. To acquire, repeatedly test-and-set it until the returned old value is false, which means this thread changed it from free to taken. To release, store false. Adding acquire and release memory ordering makes the protected data visible to the next holder.

Q: What is test-and-test-and-set and why is it better?
A: The thread spins with ordinary reads until the lock looks free and only then attempts the atomic test-and-set. Reads can be served from each core's cache, while every test-and-set is a write that pulls the cache line away from other cores, so this greatly reduces cache coherence traffic.

Q: Why is disabling interrupts not a general solution for mutual exclusion?
A: It only prevents preemption on the current core, so threads on other cores can still enter the critical section. It is also a privileged operation, and keeping interrupts off for long delays timers and I/O, so it is used only for very short sections inside the kernel.

Q: What is the ABA problem?
A: A compare-and-swap checks only that a value is the same as before, not that it was never changed. If a location changes from A to B and back to A, a stalled thread's CAS succeeds even though the structure changed underneath, which can corrupt lock-free data structures. Version counters or safe memory reclamation schemes prevent it.

## os.sync.producer-consumer-problem
name: "Producer-consumer problem"
importance: must
prereqs: [os.sync.semaphores]
scope: "bounded buffer with semaphores"

### simple
The producer-consumer problem is about one group of threads making items and another group using them, through a shared shelf of limited size. A bakery works this way: bakers put loaves on a rack with ten slots, and shop staff take them off. Bakers must wait when the rack is full, staff must wait when it is empty, and two people must never grab the same slot at once.

### interview
- A **bounded buffer** of N slots is shared by **producers** (add items) and **consumers** (remove items).
- Three semaphores: **`empty` = N** (free slots), **`full` = 0** (filled slots), **`mutex` = 1** (protects the buffer indices).
- Producer: `wait(empty); wait(mutex); put; signal(mutex); signal(full)`. Consumer: `wait(full); wait(mutex); take; signal(mutex); signal(empty)`.
- **Order matters**: taking `mutex` before `empty` can **deadlock** (a producer sleeps on a full buffer while holding the mutex, so no consumer can ever get in to free a slot).
- Equivalent monitor version: one mutex and two condition variables (`notFull`, `notEmpty`), waiting in `while` loops.
- Real-world forms: blocking queues (`java.util.concurrent.BlockingQueue`, Python `queue.Queue`, Go channels), thread pools' task queues, pipes, message brokers; the bound provides **back-pressure** so fast producers cannot exhaust memory.

### deep
#### Intuition

There are two waiting conditions and one safety condition. Producers wait for space, consumers wait for items, and nobody may touch the buffer's indices at the same time as someone else. Each of these gets its own semaphore, and the counting semaphores double as the counts of free and filled slots.

#### Worked example: buffer of 2 slots

| event | empty | full | buffer | note |
|---|---|---|---|---|
| start | 2 | 0 | [ , ] | |
| P puts a | 1 | 1 | [a, ] | |
| P puts b | 0 | 2 | [a, b] | |
| P tries c | 0 | 2 | [a, b] | P blocks on `wait(empty)` |
| C takes a | 1 | 1 | [ , b] | C's `signal(empty)` wakes P |
| P puts c | 0 | 2 | [c, b] | the index wrapped around to slot 0 |
| C takes b | 1 | 1 | [c, ] | |
| C takes c | 2 | 0 | [ , ] | |
| C tries again | 2 | 0 | [ , ] | C blocks on `wait(full)` |

#### Code: semaphores (C++20)

```cpp
template <typename T, int N>
class BoundedBuffer {
    array<T, N> buf;
    int in = 0, out = 0;
    counting_semaphore<N> empty{N}, full{0};
    binary_semaphore mutexSem{1};
public:
    void put(T x) {
        empty.acquire();                 // wait for a free slot FIRST
        mutexSem.acquire();              // then lock the indices
        buf[in] = std::move(x);
        in = (in + 1) % N;
        mutexSem.release();
        full.release();                  // one more item available
    }
    T take() {
        full.acquire();                  // wait for an item
        mutexSem.acquire();
        T x = std::move(buf[out]);
        out = (out + 1) % N;
        mutexSem.release();
        empty.release();                 // one more free slot
        return x;
    }
};

int main() {
    BoundedBuffer<int, 4> q;
    long long sum = 0;
    thread producer([&] { for (int i = 1; i <= 1000; ++i) q.put(i); q.put(-1); });   // -1: done
    thread consumer([&] { for (int x; (x = q.take()) != -1;) sum += x; });
    producer.join(); consumer.join();
    cout << sum << "\n";                 // 500500
}
```

#### The same with a monitor

```cpp
class BlockingQueue {
    mutex m;
    condition_variable notFull, notEmpty;
    deque<int> q;
    size_t cap;
public:
    explicit BlockingQueue(size_t cap) : cap(cap) {}
    void put(int x) {
        unique_lock<mutex> lk(m);
        notFull.wait(lk, [&] { return q.size() < cap; });
        q.push_back(x);
        notEmpty.notify_one();
    }
    int take() {
        unique_lock<mutex> lk(m);
        notEmpty.wait(lk, [&] { return !q.empty(); });
        int x = q.front(); q.pop_front();
        notFull.notify_one();
        return x;
    }
};
```

```python
import queue
import threading

q = queue.Queue(maxsize=4)          # a bounded buffer with the locking built in
total = 0


def producer():
    for i in range(1, 1001):
        q.put(i)                    # blocks while full
    q.put(None)


def consumer():
    global total
    while (item := q.get()) is not None:   # blocks while empty
        total += item


threads = [threading.Thread(target=producer), threading.Thread(target=consumer)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(total)   # 500500
```

#### The deadlock from the wrong order

If the producer does `wait(mutex)` then `wait(empty)` with a full buffer, it sleeps holding the mutex. Every consumer then blocks on `wait(mutex)` and can never take an item and signal `empty`. Always wait on the counting semaphore first, then take the mutex.

#### Variants

- Multiple producers and consumers work unchanged: the mutex protects `in` and `out`.
- An unbounded buffer needs only `full` and the mutex, but gives no back-pressure.
- With one producer and one consumer, a lock-free ring buffer with two atomic indices avoids the mutex entirely (used in low-latency systems).

Connects to: semaphores, monitors and condition variables, producer-consumer in code, thread pools, message queues.

### questions
Q: How do you solve the bounded-buffer producer-consumer problem with semaphores?
A: Use a counting semaphore empty initialized to the buffer size, a counting semaphore full initialized to 0, and a mutex semaphore initialized to 1. A producer waits on empty, then the mutex, inserts, releases the mutex and signals full. A consumer waits on full, then the mutex, removes, releases the mutex and signals empty.

Q: What happens if a producer acquires the mutex before waiting on the empty semaphore?
A: If the buffer is full, the producer blocks on empty while still holding the mutex. Consumers then block trying to acquire the mutex, so none can remove an item and signal empty, and everything deadlocks.

Q: Why does the producer-consumer pattern need a bound on the buffer?
A: Without a bound, a producer that is faster than its consumers keeps adding items until memory runs out. A bounded buffer blocks producers when it is full, which applies back-pressure and keeps memory use predictable.

Q: How would you implement a blocking queue with condition variables?
A: Protect a queue with one mutex and use two condition variables, notFull and notEmpty. put waits on notFull while the queue is at capacity, pushes the item and notifies notEmpty; take waits on notEmpty while the queue is empty, pops the item and notifies notFull. Both waits re-check their condition in a loop.

Q: Where does the producer-consumer pattern appear in real systems?
A: Thread pools use a task queue between submitters and workers, Unix pipes connect a writing and a reading process, logging systems buffer messages for a background writer, and message brokers such as Kafka decouple producing and consuming services.

## os.sync.readers-writers-problem
name: "Readers-writers problem"
importance: important
prereqs: [os.sync.semaphores]
scope: "reader or writer preference"

### simple
The readers-writers problem is about letting many people read shared data at the same time while making sure anyone who changes it works alone. A notice board can have a crowd reading it, but when someone is pinning up a new notice, readers should wait so they never see a half-changed board. The tricky part is being fair, so neither the readers nor the writers wait forever.

### interview
- Rules: **many readers at once**, or **exactly one writer** with no readers.
- **First readers-writers problem (reader preference)**: readers never wait unless a writer is already writing. A `readCount` protected by a mutex; the **first** reader locks the writer semaphore and the **last** reader unlocks it. Writers can **starve** under a steady stream of readers.
- **Second problem (writer preference)**: once a writer is waiting, new readers are held back. Readers can starve.
- **Fair** versions queue readers and writers in arrival order (a "turnstile" semaphore), so neither side starves.
- In practice: **read-write locks** such as C++17 `std::shared_mutex` (`shared_lock` for readers, `unique_lock` for writers), Java `ReentrantReadWriteLock`, `pthread_rwlock_t`. Their fairness policy varies by implementation.
- They pay off only when reads dominate and hold the lock for a while; for tiny critical sections a plain mutex is often faster. Alternatives: copy-on-write snapshots, RCU, sequence locks.

### deep
#### Reader-preference solution with semaphores

```cpp
binary_semaphore rw{1};       // held by the writer, or by the group of readers
binary_semaphore countLock{1};
int readCount = 0;
int value = 0;

int reader() {
    countLock.acquire();
    if (++readCount == 1) rw.acquire();   // the first reader locks writers out
    countLock.release();

    int v = value;                         // many readers can be here together

    countLock.acquire();
    if (--readCount == 0) rw.release();   // the last reader lets writers in
    countLock.release();
    return v;
}

void writer(int v) {
    rw.acquire();                          // exclusive
    value = v;
    rw.release();
}

int main() {
    vector<thread> ts;
    atomic<long long> seen{0};
    for (int i = 0; i < 4; ++i)
        ts.emplace_back([&] { for (int k = 0; k < 1000; ++k) seen += reader(); });
    ts.emplace_back([] { for (int k = 1; k <= 1000; ++k) writer(k); });
    for (auto& t : ts) t.join();
    cout << "final value " << value << "\n";   // final value 1000
}
```

#### Worked example: why writers starve

| time | event | readCount | writer |
|---|---|---|---|
| 0 | R1 enters (first reader takes `rw`) | 1 | - |
| 1 | W arrives, blocks on `rw` | 1 | waiting |
| 2 | R2 enters (`rw` already held by readers) | 2 | waiting |
| 3 | R1 leaves | 1 | waiting |
| 4 | R3 enters | 2 | waiting |
| … | readers keep overlapping | never 0 | waits forever |

As long as at least one reader is always inside, `readCount` never reaches 0 and `rw` is never released. Writer preference fixes this by making new readers wait whenever a writer is queued, which starves readers instead under a steady stream of writers. A fair lock serves requests in arrival order.

#### Using a library read-write lock

```cpp
class Config {
    mutable shared_mutex m;
    map<string, string> kv;
public:
    string get(const string& k) const {
        shared_lock lk(m);                 // shared: many readers
        auto it = kv.find(k);
        return it == kv.end() ? "" : it->second;
    }
    void set(const string& k, const string& v) {
        unique_lock lk(m);                 // exclusive: one writer, no readers
        kv[k] = v;
    }
};
```

```python
import threading


class RWLock:
    """Reader preference, built from two locks."""

    def __init__(self):
        self._readers = 0
        self._count_lock = threading.Lock()
        self._rw = threading.Lock()

    def acquire_read(self):
        with self._count_lock:
            self._readers += 1
            if self._readers == 1:
                self._rw.acquire()

    def release_read(self):
        with self._count_lock:
            self._readers -= 1
            if self._readers == 0:
                self._rw.release()

    def acquire_write(self):
        self._rw.acquire()

    def release_write(self):
        self._rw.release()
```

(`threading.Lock` may be released by a thread other than the one that acquired it, which the last-reader release relies on.)

#### When not to use a read-write lock

Read-write locks keep more state and often cost more than a mutex per operation. If critical sections are tiny or writes are frequent, a plain mutex wins. If reads vastly outnumber writes, lock-free snapshots (readers take an immutable copy; writers publish a new copy) or RCU can remove reader locking entirely.

Connects to: semaphores, mutex locks, monitors and condition variables, starvation, database locking.

### questions
Q: What are the rules of the readers-writers problem?
A: Any number of readers may access the shared data at the same time, but a writer needs exclusive access: while it writes, no other writer and no reader may be inside.

Q: How does the reader-preference solution work?
A: Readers keep a shared count protected by a mutex. The first reader to arrive acquires the writers' lock and the last reader to leave releases it, so readers can overlap freely while writers wait for the lock. Writers simply acquire and release that lock.

Q: What is the drawback of reader preference, and how does writer preference change it?
A: Writers can starve if readers keep arriving, because the reader count never drops to zero. Writer preference blocks new readers as soon as a writer is waiting, which lets writers in promptly but can starve readers. Fair solutions serve requests in arrival order.

Q: When is a read-write lock better than a mutex?
A: When reads greatly outnumber writes and read critical sections are long enough that letting readers run in parallel matters. For short critical sections or frequent writes, the extra bookkeeping of a read-write lock can make it slower than a plain mutex.

## os.sync.dining-philosophers
name: "Dining philosophers"
importance: important
prereqs: [os.sync.semaphores]
scope: "deadlock and starvation-free solutions"

### simple
Five philosophers sit around a table with one fork between each pair, and each needs both neighboring forks to eat. If everyone picks up their left fork at the same moment, all of them hold one fork and wait forever for the other. The puzzle is to find rules for picking up forks so that no one gets stuck and no one goes hungry forever.

### interview
- Setup: N philosophers, N forks (locks) between them; eating needs **both** adjacent forks. It models processes competing for multiple shared resources.
- Naive solution (each takes left, then right) **deadlocks**: all grab their left fork, and there is a circular wait.
- **Resource ordering**: number the forks and always pick up the lower-numbered one first (equivalently, one philosopher picks right first). This breaks circular wait and prevents deadlock.
- **Limit diners**: a semaphore initialized to N − 1 lets at most four of five reach for forks, so at least one can always get both.
- **Take both or none**: pick up both forks atomically (a monitor that checks both neighbors, as in Tanenbaum's solution, or `std::scoped_lock`, which uses a deadlock-avoidance algorithm), or use an arbitrator (a waiter).
- Deadlock freedom does not imply **starvation freedom**: a philosopher can keep losing the race for forks. Fair locks, queues, or the Chandy-Misra solution (clean and dirty forks passed on request) address starvation.

### deep
#### The deadlock

```text
        P0
   F4        F0
P4              P1
   F3        F1
     P3    P2
        F2
```

Philosopher i uses forks i and (i + 1) mod 5. If all five pick up fork i at the same time:

| philosopher | holds | waits for | held by |
|---|---|---|---|
| P0 | F0 | F1 | P1 |
| P1 | F1 | F2 | P2 |
| P2 | F2 | F3 | P3 |
| P3 | F3 | F4 | P4 |
| P4 | F4 | F0 | P0 |

Every condition for deadlock holds: forks are exclusive, each holds one while waiting, nobody takes a fork away, and the waits form a cycle.

#### Fix 1: resource ordering

Everyone picks up the **lower-numbered** fork first. P0 to P3 behave as before, but P4 needs F4 and F0 and must take F0 first. P0 and P4 now compete for F0, so they cannot both hold one fork each, and the cycle is broken.

```cpp
int main() {
    const int N = 5, MEALS = 1000;
    vector<mutex> forks(N);
    vector<int> meals(N, 0);
    vector<thread> ts;
    for (int i = 0; i < N; ++i) {
        ts.emplace_back([&, i] {
            int left = i, right = (i + 1) % N;
            int first = min(left, right), second = max(left, right);   // global order
            for (int m = 0; m < MEALS; ++m) {
                lock_guard<mutex> a(forks[first]);
                lock_guard<mutex> b(forks[second]);
                ++meals[i];                                           // eat
            }
        });
    }
    for (auto& t : ts) t.join();
    for (int m : meals) cout << m << " ";                            // 1000 1000 1000 1000 1000
    cout << "\n";
}
```

#### Fix 2: at most N − 1 at the table

```python
import threading

N, MEALS = 5, 200
forks = [threading.Lock() for _ in range(N)]
seats = threading.Semaphore(N - 1)       # at most 4 philosophers reach for forks
meals = [0] * N


def philosopher(i):
    for _ in range(MEALS):
        with seats:
            with forks[i]:
                with forks[(i + 1) % N]:
                    meals[i] += 1


threads = [threading.Thread(target=philosopher, args=(i,)) for i in range(N)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(meals)   # [200, 200, 200, 200, 200]
```

With only four at the table and five forks, by the pigeonhole principle at least one of them can get both forks, eat and release them.

#### Fix 3: both or none

`std::scoped_lock(forks[left], forks[right])` locks both using a deadlock-avoidance algorithm (it backs off and retries instead of holding one while blocking). Tanenbaum's monitor solution keeps a state per philosopher (thinking, hungry, eating) and lets a hungry philosopher eat only when neither neighbor is eating, then re-checks the neighbors when it finishes.

#### Starvation

All three fixes prevent deadlock, but a philosopher can still be unlucky every time: its neighbors alternate eating and it never finds both forks free. Fair (FIFO) locks bound the waiting; Chandy and Misra's solution passes "dirty" forks to hungry neighbors on request, so every hungry philosopher eventually eats.

Connects to: deadlock conditions, deadlock prevention, semaphores, mutex locks, livelock and starvation.

### questions
Q: Why does the naive dining philosophers solution deadlock?
A: If every philosopher picks up the left fork at the same time, each holds one fork and waits for the right one, which is held by the neighbor. The waits form a cycle, forks cannot be taken away, and each holds a resource while waiting, so no one can ever proceed.

Q: How does resource ordering prevent deadlock in dining philosophers?
A: Number the forks and require every philosopher to pick up the lower-numbered fork first. This makes one philosopher reach in the opposite direction, so a circular chain of waiting can never form, which removes the circular wait condition.

Q: How does limiting the number of philosophers at the table help?
A: With a semaphore allowing at most N minus 1 philosophers to try to eat, there are more forks than competing philosophers holding one each, so at least one of them can obtain both forks, eat and release them. Deadlock becomes impossible.

Q: Is a deadlock-free solution also starvation-free?
A: Not necessarily. A philosopher can repeatedly lose the race for its forks to neighbors who keep eating, even though the system as a whole keeps making progress. Fair queuing of fork requests or schemes like Chandy and Misra's are needed to guarantee every philosopher eventually eats.

## os.sync.priority-inversion
name: "Priority inversion"
importance: important
prereqs: [os.sync.mutex-locks]
scope: "cause and priority inheritance"

### simple
Priority inversion happens when an important task is stuck waiting for an unimportant one that holds a lock it needs. Imagine a manager waiting for the one printer, which an intern is using, while a steady line of mid-level staff keeps sending the intern on other errands. The fix is to let the intern borrow the manager's urgency until they hand the printer back.

### interview
- Three tasks: **H** (high), **M** (medium), **L** (low). L holds a lock; H blocks on it; M, which does not need the lock, **preempts L** and runs. H now effectively waits for M, a lower-priority task: its priority has been **inverted**.
- With several medium tasks the delay is **unbounded**, which is what breaks real-time deadlines.
- Famous case: the **Mars Pathfinder** lander (1997) kept resetting because a high-priority bus task waited on a mutex held by a low-priority task while medium-priority tasks ran; it was fixed by enabling **priority inheritance** on that mutex (VxWorks).
- **Priority inheritance**: while L holds a lock that H waits for, L runs at H's priority, so M cannot preempt it; L drops back when it releases the lock.
- **Priority ceiling protocol**: each lock has a ceiling equal to the highest priority of any task that uses it; a holder runs at the ceiling. It also prevents some deadlocks.
- Other remedies: disable preemption in short critical sections, avoid sharing locks across priority levels, use lock-free structures. POSIX offers `PTHREAD_PRIO_INHERIT` and `PTHREAD_PRIO_PROTECT` mutex protocols.

### deep
#### Worked example: the timeline

Priorities: H = 3 (highest), M = 2, L = 1. One CPU. L takes lock X at time 0.

Without inheritance:

| time | running | why |
|---|---|---|
| 0 to 2 | L | L locks X and works |
| 2 | H arrives | preempts L, runs |
| 3 | H tries to lock X | blocks: L holds it |
| 3 | L | back to L |
| 4 | M arrives | M > L, so M preempts L |
| 4 to 14 | M | a long job with no need for X |
| 14 to 15 | L | finishes its critical section, unlocks X |
| 15 | H | finally gets X |

H waited from 3 to 15, mostly for M, which it outranks.

With priority inheritance:

| time | running | why |
|---|---|---|
| 3 | H blocks on X | L inherits priority 3 |
| 3 to 4 | L (at priority 3) | M arrives at 4 but cannot preempt priority 3 |
| 4 | L unlocks X | L drops back to 1; H takes X |
| 4 onward | H, then M, then L | normal priority order |

H's wait is now bounded by the length of L's critical section.

#### Code: requesting inheritance on a POSIX mutex

```cpp
#include <pthread.h>

pthread_mutex_t lockX;

void initLock() {
    pthread_mutexattr_t attr;
    pthread_mutexattr_init(&attr);
    // holder inherits waiters' priority
    pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
    pthread_mutex_init(&lockX, &attr);
    pthread_mutexattr_destroy(&attr);
}
```

On Linux this uses priority-inheritance futexes; it matters for real-time scheduling classes (`SCHED_FIFO`, `SCHED_RR`), where priorities are strict.

#### Inheritance vs ceiling

| | priority inheritance | priority ceiling |
|---|---|---|
| when the holder's priority rises | only when a higher task actually blocks | as soon as it takes the lock |
| needs to know users in advance | no | yes, to compute ceilings |
| chained blocking | possible (transitive inheritance) | prevented |
| deadlock between these locks | still possible | prevented |

#### Why general-purpose OSes suffer less

Desktop schedulers are not strictly priority-based: fair schedulers eventually run L even when M is busy, so the inversion is a delay rather than an indefinite stall. It is critical in real-time systems (flight software, robotics, trading infrastructure with real-time threads), where strict priorities and deadlines are the whole point.

Connects to: mutex locks, priority scheduling, semaphores, real-time systems.

### questions
Q: What is priority inversion?
A: A situation where a high-priority task is blocked waiting for a resource held by a low-priority task, and medium-priority tasks that do not need the resource preempt the low-priority task. The high-priority task effectively waits behind lower-priority work, possibly for an unbounded time.

Q: How does priority inheritance solve priority inversion?
A: While a low-priority task holds a lock that a higher-priority task is waiting for, it temporarily runs at the waiter's priority. Medium-priority tasks can no longer preempt it, so it finishes its critical section quickly, releases the lock and returns to its own priority.

Q: What is the priority ceiling protocol?
A: Each lock is assigned a ceiling equal to the highest priority of any task that may use it, and a task holding the lock runs at that ceiling. This bounds priority inversion to one critical section and also prevents deadlocks among the protected locks, but requires knowing in advance which tasks use each lock.

Q: What happened on the Mars Pathfinder mission?
A: The lander's computer kept resetting because a high-priority information bus task waited on a mutex held by a low-priority task, while medium-priority tasks ran, so a watchdog timer expired. Engineers fixed it remotely by enabling priority inheritance on that mutex.
