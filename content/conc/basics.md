---
topic: conc.basics
name: "Concurrency basics"
subject: conc
order: 1
prereqs: [os.threads]
---

## conc.basics.concurrency-vs-parallelism
name: "Concurrency vs parallelism"
importance: must
scope: "interleaving vs simultaneous execution"

### simple
Concurrency is one cook juggling several dishes: chop a bit, stir a bit, check the oven, so all the dishes make progress even though only one thing happens at any instant. Parallelism is several cooks each working on a dish at the same moment. A program can be concurrent on a single core by switching between tasks, but it only runs in parallel when several cores do work at the same time.

### interview
- **Concurrency** is about structure: several tasks are in progress during overlapping periods, and their steps may **interleave**. It works on one core, through time slicing or by switching tasks while one waits for I/O.
- **Parallelism** is about execution: several computations run **at the same instant** on different cores or machines. It needs hardware with more than one execution unit.
- Concurrency without parallelism: many threads on one core, or an event loop handling thousands of connections on one thread. Parallelism without much concurrency: a data-parallel loop splitting one array across cores.
- **I/O-bound** work gains from concurrency (overlap the waiting); **CPU-bound** work gains only from parallelism (more cores doing arithmetic).
- Speedup is limited by the serial part (Amdahl's law: with a parallel fraction p on n cores, speedup is at most 1 / ((1 − p) + p / n)) and by coordination costs: locks, cache traffic and thread creation.
- Both bring the same hazards once tasks share data: races, deadlocks and results that depend on timing.

### deep
#### Intuition

Picture the timeline of each task. Under concurrency the task timelines overlap, but a single core can still execute only one instruction stream at a time, so it slices between them. Under parallelism the slices are truly simultaneous. From inside the program you cannot tell which one you got: the same threads run concurrently on one core and in parallel on four.

#### Worked example: the same threads, with and without parallelism

The program runs four identical CPU-bound tasks three ways and prints wall-clock time and the CPU time used by the whole process. Their ratio tells how many cores were busy on average.

```cpp
double work(long n) {                             // CPU-bound: no waiting at all
    double s = 0;
    for (long i = 1; i <= n; ++i) s += sqrt(double(i));
    return s;
}

template <class F>
void timed(const char* label, F f) {
    auto wall0 = chrono::steady_clock::now();
    clock_t cpu0 = clock();                       // CPU time of all threads in the process
    f();
    double wall = chrono::duration<double>(chrono::steady_clock::now() - wall0).count();
    double cpu = double(clock() - cpu0) / CLOCKS_PER_SEC;
    printf("%-22s wall %.2f s, cpu %.2f s, cpu/wall %.1f\n", label, wall, cpu, cpu / wall);
}

double sink[4];                                  // keeps results: the work cannot be optimized out

void fourTasks() {
    vector<thread> ts;
    for (int i = 0; i < 4; ++i) ts.emplace_back([i] { sink[i] = work(200'000'000); });
    for (auto& t : ts) t.join();
}

int main() {
    printf("hardware threads: %u\n", thread::hardware_concurrency());
    timed("one after another", [] { for (int i = 0; i < 4; ++i) sink[i] = work(200'000'000); });
    timed("4 threads, all cores", fourTasks);
    cpu_set_t one;
    CPU_ZERO(&one);
    CPU_SET(0, &one);
    sched_setaffinity(0, sizeof one, &one);       // from now on, this process uses CPU 0 only
    timed("4 threads, one core", fourTasks);
}
```

Output (one run on a 4-core cloud VM, g++ 13 at `-O2`; times differ by machine and run):

```text
hardware threads: 4
one after another      wall 1.73 s, cpu 1.70 s, cpu/wall 1.0
4 threads, all cores   wall 0.47 s, cpu 1.74 s, cpu/wall 3.7
4 threads, one core    wall 1.73 s, cpu 1.70 s, cpu/wall 1.0
```

Over five runs, the parallel case took 0.45 to 0.63 s (a speedup of about 2.7 to 3.8), and the other two stayed at about 1.7 s. The total CPU work was the same each time. With all cores the four threads ran in **parallel** (about 3.7 cores busy on average). Pinned to one core, the same four threads still ran **concurrently**, the scheduler interleaving them, but only one ran at any instant, so it was no faster than doing the tasks one after another.

#### Where each one helps

| workload | what helps | why |
|---|---|---|
| waiting on network, disk, users | concurrency (threads, async I/O, an event loop) | overlap the waiting; one core is enough |
| heavy computation on independent data | parallelism (one thread per core, parallel algorithms) | more cores do more arithmetic |
| a server with many slow clients | both | concurrency to wait on many clients, parallelism to use every core |

#### Limits

- **Amdahl's law**: if 10% of the work is serial, no number of cores gives more than 10× speedup.
- Coordination costs: creating a thread took about 45 µs on the test machine, and threads that share data pay for locks and for moving cache lines between cores.
- More threads than cores does not speed up CPU-bound work; it only adds switching.

#### Common mistakes

- Expecting threads to speed up a single-core machine or a CPU-bound task on a busy machine.
- Parallelizing tiny tasks whose overhead is larger than the work.
- Treating "it ran correctly once" as proof: interleavings change with load, core count and timing.

Connects to: threads vs processes, benefits and costs of multithreading, creating threads, event loops and coroutines, thread pools.

### questions
Q: What is the difference between concurrency and parallelism?
A: Concurrency means several tasks are in progress during overlapping time periods, possibly interleaved on one core. Parallelism means computations literally execute at the same instant on multiple cores. Concurrency is a way of structuring a program; parallelism is a property of how it runs on the hardware.

Q: Can a program be concurrent but not parallel?
A: Yes. Several threads on a single core are concurrent: the scheduler interleaves them, but only one runs at any moment. An event loop serving many connections on one thread is another example, since it switches between tasks whenever one waits.

Q: Why does adding threads not speed up a CPU-bound program on one core?
A: The core can execute only one thread at a time, so the total amount of computation still runs sequentially. Extra threads add context switches and synchronization overhead, so the program usually gets slightly slower rather than faster.

Q: What limits the speedup of a parallel program?
A: The serial fraction of the work, as described by Amdahl's law, plus overheads such as thread creation, synchronization, lock contention, cache traffic between cores and load imbalance. With a parallel fraction p on n cores, speedup is at most 1 divided by (1 minus p plus p over n).

Q: Which helps an I/O-bound server more, concurrency or parallelism?
A: Concurrency. The server spends most of its time waiting for network or disk, so what matters is overlapping many waits, which threads, async I/O or an event loop provide even on one core. Parallelism helps only for the CPU work done between waits.

## conc.basics.creating-threads
name: "Creating threads"
importance: must
prereqs: [conc.basics.concurrency-vs-parallelism]
scope: "std::thread, std::jthread, std::async and thread pools"

### simple
Starting a thread is like hiring a helper and handing them a task card: they start working right away while you carry on with your own work. Before you leave, you must either wait for the helper to finish or explicitly let them go on their own. C++ gives you a basic helper (`std::thread`), one that waits for itself when you leave (`std::jthread`), and a way to hand off a job and collect its result later (`std::async`).

### interview
- `std::thread t(f, args...)` starts running `f` immediately on a new thread. Before `t` is destroyed you must call `join()` (wait for it) or `detach()` (let it run on its own); destroying a joinable thread calls **`std::terminate`**.
- Arguments are **copied** into the new thread. To pass a reference, wrap it in `std::ref`; with a lambda, capture carefully, because the thread may outlive the variables it refers to.
- `std::jthread` (C++20) joins automatically in its destructor and supports cooperative cancellation: the function can take a `std::stop_token` and check `stop_requested()`; the destructor calls `request_stop()` first.
- `std::async(launch::async, f)` runs `f` on a new thread and returns a `std::future` whose `get()` waits for the result and rethrows any exception. Without `launch::async` the implementation may defer the call until `get()`. The future from `async` blocks in its destructor until the task finishes.
- Creating a thread costs a system call, a stack (8 MB of address space by default on Linux) and scheduling work, tens of microseconds on typical hardware. For many short tasks use a **thread pool** that reuses a fixed set of threads.
- `std::thread::hardware_concurrency()` hints at the number of hardware threads (it may return 0 if unknown).

### deep
#### Worked example

```cpp
void square(int id, vector<long long>& out) { out[id] = 1LL * id * id; }

int main() {
    vector<long long> results(4);
    vector<thread> workers;
    for (int i = 0; i < 4; ++i)
        workers.emplace_back(square, i, ref(results));   // args are copied unless wrapped in ref
    for (auto& t : workers) t.join();                     // wait for all four
    for (long long r : results) cout << r << " ";
    cout << "\n";

    {
        jthread ticker([](stop_token stop) {              // C++20: joins itself, can be stopped
            int ticks = 0;
            while (!stop.stop_requested()) {
                ++ticks;
                this_thread::sleep_for(1ms);
            }
            cout << "ticker stopped after at least one tick: " << (ticks >= 1) << "\n";
        });
        this_thread::sleep_for(20ms);
    }                                                     // ~jthread: request_stop(), then join()

    auto total = async(launch::async, [] {                // runs on a new thread, returns a future
        long long s = 0;
        for (int i = 1; i <= 1'000'000; ++i) s += i;
        return s;
    });
    cout << "async result: " << total.get() << "\n";      // get() waits for the value
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
0 1 4 9 
ticker stopped after at least one tick: 1
async result: 500000500000
```

- Each worker writes its own element of `results`, so no two threads touch the same memory, and `join` makes their writes visible to `main` before it prints.
- Without `ref`, `square(i, results)` would not compile: the thread stores a copy of `results`, and a copy cannot bind to the `vector<long long>&` parameter.
- The exact number of ticks depends on timing, so the program prints only a fact that is always true.

#### Forgetting to join

```cpp
// sketch: a joinable std::thread destroyed without join or detach
int main() {
    thread t([] {});
}   // ~thread calls std::terminate
```

With g++ 13 this aborts with `terminate called without an active exception`. An exception thrown between creating a thread and joining it causes the same crash, which is one reason to prefer `jthread` or an RAII wrapper.

#### Choosing a tool

| tool | use when | watch out |
|---|---|---|
| `std::thread` | a long-lived thread you manage yourself | must join or detach on every path |
| `std::jthread` | the same, with automatic join and a stop request | the function must check its `stop_token` to stop early |
| `std::async(launch::async, f)` | one task whose result you want back | a discarded future blocks at once (in its destructor) |
| a thread pool | many short tasks | sizing, and tasks that wait on other tasks |

#### Edge cases and bugs

- `detach()` makes the thread impossible to wait for; if `main` returns while it runs, the process ends and the thread is killed mid-work. Detached threads must not use locals of the function that started them.
- Capturing a loop variable by reference in a thread lambda (`[&] { use(i); }`) reads a variable that keeps changing, and may outlive it; capture it by value (`[i]`).
- Exceptions thrown inside a `std::thread` function that escape it call `std::terminate`; catch them inside, or use `async` or a `packaged_task` to carry them to the caller.
- `async(f)` with the default policy may run `f` lazily on the calling thread; pass `launch::async` when you need concurrency.

Connects to: concurrency vs parallelism, thread pools, futures, promises and async, RAII, threads vs processes.

### questions
Q: What happens if a std::thread object is destroyed while still joinable?
A: The program calls std::terminate and aborts. Before the thread object goes away you must either join it, which waits for the thread to finish, or detach it, which lets it run independently. std::jthread avoids the problem by joining automatically in its destructor.

Q: How do you pass a variable by reference to a thread function?
A: Wrap it in std::ref, as in thread t(f, std::ref(x)). The thread constructor copies its arguments into storage owned by the new thread, so without std::ref the function would receive a copy, and a non-const reference parameter would not even compile. The referenced object must outlive the thread.

Q: What does std::jthread add over std::thread?
A: It joins automatically in its destructor, so forgetting to join cannot crash the program, and it carries a stop source: the function can accept a std::stop_token and check stop_requested, and the destructor requests a stop before joining. This gives safe, cooperative cancellation.

Q: What is the difference between std::async with launch::async and launch::deferred?
A: With launch::async the function starts immediately on a new thread. With launch::deferred nothing runs until get or wait is called on the future, and then the function runs synchronously in the calling thread. The default policy allows either, so specify launch::async when you need real concurrency.

Q: Why use a thread pool instead of creating a thread per task?
A: Creating and destroying a thread costs tens of microseconds and memory for its stack, which dominates for short tasks, and an unbounded number of threads overloads the scheduler. A pool keeps a fixed number of worker threads and feeds them tasks from a queue, bounding both overhead and concurrency.

## conc.basics.data-races-vs-race-conditions
name: "Data races vs race conditions"
importance: must
scope: "the difference and examples"

### simple
A data race is two threads touching the same piece of memory at the same moment, with at least one of them writing and nothing to coordinate them, like two people writing on the same line of a form at once. A race condition is broader: the result depends on who happens to go first, even if every single step is done properly, like two people each checking that a seat is free and then both sitting down. In C++ a data race makes the whole program invalid, while a race condition is a logic bug you must design out.

### interview
- **Data race** (a C++ language term): two threads access the **same memory location**, at least one access is a **write**, at least one is **not atomic**, and neither **happens before** the other (no lock, atomic or join orders them). A data race is **undefined behavior**.
- **Race condition**: a program's correctness depends on the relative timing or interleaving of threads. It is a logic bug and can exist with **no data race at all**, for example a check-then-act sequence made of individually atomic steps.
- A data race usually causes a race condition (lost updates on `++counter`), but in C++ it is worse than a wrong number: the compiler may assume no races and transform the code in ways that break it entirely.
- Fixes: for data races, make the accesses synchronized (a mutex, atomics, or confinement to one thread). For race conditions, make the whole **check-and-act** sequence atomic (one lock around both, or a compare-and-swap loop) or restructure so the decision cannot go stale.
- Tools: ThreadSanitizer (`-fsanitize=thread`) reports data races with both stack traces; it cannot see race conditions that involve only properly synchronized accesses.
- Watch for hidden shared memory: adjacent bit-fields share one memory location, `vector<bool>` packs elements into shared bytes, and library functions with internal static state (`strtok`, `localtime`) are shared too.

### deep
#### A data race

```cpp
// Undefined behavior: a data race on counter. Never rely on what this prints.
int counter = 0;                          // plain int shared by two threads
int main() {
    auto work = [] { for (int i = 0; i < 100000; ++i) ++counter; };
    thread a(work), b(work);
    a.join();
    b.join();
    cout << counter << "\n";
}
```

`++counter` is a load, an add and a store, and the two threads' steps can interleave so that increments are lost. But the real problem is that the program has no defined meaning, so any output proves nothing. Built with `-fsanitize=thread`, it reports `WARNING: ThreadSanitizer: data race`, pointing at the write in one thread and the `Previous write of size 4` in the other. The fix is `atomic<int> counter` or a mutex.

#### A race condition with no data race

Every access below is atomic, so there is no data race and the program is well defined. It is still wrong: two withdrawals both check the balance, both see enough money, and both subtract. A barrier forces that bad interleaving so the outcome is the same on every run.

```cpp
atomic<int> balance{100};                      // atomic: no data race anywhere

bool withdrawUnsafe(int amount, barrier<>& sync) {
    bool enough = balance.load() >= amount;    // check...
    sync.arrive_and_wait();                    // (force the bad interleaving for the demo)
    if (enough) balance -= amount;             // ...then act, on a stale answer
    return enough;
}

bool withdrawSafe(int amount) {
    int current = balance.load();
    while (current >= amount) {                // check and act as one atomic step
        if (balance.compare_exchange_weak(current, current - amount)) return true;
    }                                          // on failure, current was reloaded: retry
    return false;
}

int main() {
    barrier sync(2);
    bool a = false, b = false;
    thread t1([&] { a = withdrawUnsafe(80, sync); });
    thread t2([&] { b = withdrawUnsafe(70, sync); });
    t1.join();
    t2.join();
    cout << "unsafe: " << a << b << ", balance " << balance << "\n";

    balance = 100;
    thread t3([&] { a = withdrawSafe(80); });
    thread t4([&] { b = withdrawSafe(70); });
    t3.join();
    t4.join();
    cout << "safe: " << (a + b) << " succeeded, balance " << balance << "\n";
}
```

Output (one run; the final balance is 20 or 30 depending on which safe withdrawal wins):

```text
unsafe: 11, balance -50
safe: 1 succeeded, balance 20
```

Over 200 runs the unsafe version always overdrew to −50 (the barrier guarantees it), and the safe version always let exactly one withdrawal through. ThreadSanitizer reports nothing for this program, because there is no data race: the bug is in the logic, which no race detector can see.

#### Side by side

| | data race | race condition |
|---|---|---|
| definition | unsynchronized conflicting accesses to one memory location | outcome depends on timing |
| level | language (memory model) | application logic |
| consequence in C++ | undefined behavior | wrong results, still defined |
| found by | ThreadSanitizer | reasoning, stress tests, careful design |
| fix | locks, atomics, confinement | make check-and-act atomic, redesign |

#### Edge cases

- Two threads writing **different** members of a struct is fine (different memory locations), but two different **bit-fields** that share storage race.
- Reading a variable that another thread writes, even "just to peek" at a flag, is a data race unless the flag is atomic.
- A race condition can also span processes or machines: check-then-create on a file or a database row has the same shape.

Connects to: race conditions and critical sections, atomic operations, mutexes and lock guards, thread safety, isolation levels.

### questions
Q: What is the difference between a data race and a race condition?
A: A data race is a specific memory-level event: two threads access the same location without synchronization, at least one writing, which is undefined behavior in C++. A race condition is a logic error where the result depends on the timing of threads. You can have a race condition without a data race, for example a check-then-act on atomics.

Q: Why is a data race worse than just getting a wrong number in C++?
A: The C++ memory model makes a data race undefined behavior, so the compiler may assume it never happens: it can keep a shared value in a register, reorder accesses or merge them. The program may hang, print impossible values or behave differently at other optimization levels, not merely lose some updates.

Q: Give an example of a race condition that has no data race.
A: Two threads withdraw money: each loads an atomic balance, checks it is large enough, then atomically subtracts. Every access is atomic, but both checks can pass before either subtraction, overdrawing the account. The fix is to make check and update one atomic step, with a lock or a compare-and-swap loop.

Q: How do you find data races?
A: Run tests under ThreadSanitizer by compiling with -fsanitize=thread, which instruments memory accesses and reports conflicting unsynchronized pairs with stack traces. Stress tests with many threads help trigger interleavings, and code review should check that every piece of shared mutable state has a clear protection rule.

Q: Is writing two different elements of a vector<int> from two threads a data race?
A: No. Different elements are different memory locations, so there is no conflict, as long as the vector itself is not resized at the same time. vector<bool> is the exception: it packs elements as bits, so different elements can share a byte and concurrent writes race.

## conc.basics.thread-safety
name: "Thread safety"
importance: must
prereqs: [conc.basics.data-races-vs-race-conditions]
scope: "what makes code thread-safe, immutability, confinement"

### simple
Code is thread-safe when it keeps working correctly no matter how many threads use it at once and in what order their steps happen. The easiest ways to get there are to share nothing that changes (like a printed timetable everyone may read), or to give each thread its own copy (everyone gets their own notebook). Only when threads really must change the same thing do you need locks or atomics, like a single shared whiteboard with one marker.

### interview
- A function or class is **thread-safe** if concurrent use from several threads keeps its invariants and has no data races, without extra coordination by the caller.
- The three strategies, in order of preference: **don't share** (confinement: each thread owns its data, `thread_local`, or split the work into separate parts), **don't mutate** (immutability: data built before the threads start and only read afterwards needs no locks), **synchronize** (mutexes, atomics, or message passing through a thread-safe queue).
- The standard library's rule: concurrent calls to **const** member functions on one object are safe, and different objects can be used from different threads freely; any non-const use of a shared object needs synchronization by you. `shared_ptr`'s reference count is thread-safe; the pointed-to object is not.
- Thread-safe pieces do not compose automatically: `if (!m.contains(k)) m.insert(k, v)` is a race condition even if each call locks. Put compound operations inside the object, under one lock.
- Hidden shared state breaks thread safety: static locals in functions, global caches, `strtok`, `localtime` (use `localtime_r`), and some random number generators.
- **Reentrant** (safe to call again while a call is in progress on the same thread, as from a signal handler) is a different, stricter property.

### deep
#### Worked example: immutability and confinement, no locks

```cpp
struct Config {                                  // immutable after construction: share freely
    const vector<string> banned;
    bool allowed(const string& w) const {
        return find(banned.begin(), banned.end(), w) == banned.end();
    }
};

thread_local int callsOnThisThread = 0;          // one copy per thread: confinement by the language

int countAllowed(const Config& cfg, const vector<string>& words, size_t from, size_t to) {
    int local = 0;                               // confined: only this thread sees it
    for (size_t i = from; i < to; ++i) {
        ++callsOnThisThread;
        if (cfg.allowed(words[i])) ++local;
    }
    return local;
}

int main() {
    const Config cfg{{"spam", "junk"}};
    vector<string> words;
    for (int i = 0; i < 1000; ++i) words.push_back(i % 10 == 0 ? "spam" : "word" + to_string(i));

    vector<int> partial(4), calls(4);            // each thread writes only its own slots
    vector<thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([&, t] {
            partial[t] = countAllowed(cfg, words, t * 250, (t + 1) * 250);
            calls[t] = callsOnThisThread;
        });
    for (auto& th : ts) th.join();               // join: the writes are now visible here
    cout << accumulate(partial.begin(), partial.end(), 0) << " allowed; calls per thread:";
    for (int c : calls) cout << " " << c;
    cout << "; on main: " << callsOnThisThread << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
900 allowed; calls per thread: 250 250 250 250; on main: 0
```

No mutex anywhere, and still no data race:

| data | strategy | why it is safe |
|---|---|---|
| `cfg`, `words` | immutable while threads run | only reads, and they were written before the threads started |
| `local` | confined to one call | a local variable on one thread's stack |
| `callsOnThisThread` | `thread_local` | each thread has its own copy; main's stayed 0 |
| `partial[t]`, `calls[t]` | partitioned | each thread writes different elements |
| the final sum | ordered by `join` | `join` makes each thread's writes visible to `main` |

The per-thread slots are adjacent in memory, so heavy writing to them would suffer from false sharing (a performance problem, not a correctness one); here each thread writes them once.

#### A checklist for "is this thread-safe?"

1. List every piece of state the code touches: parameters, members, globals, statics, and anything inside library calls.
2. For each, is it immutable, confined to one thread, or shared and mutable?
3. Every shared mutable item needs one clear rule: "guarded by mutex `m_`" or "atomic".
4. Check compound operations (check-then-act, read-modify-write) are atomic as a whole.
5. Check what escapes: returning a reference or pointer to guarded data lets callers bypass the lock.

#### Edge cases and bugs

- A `const` member function that updates a `mutable` cache is not safe for concurrent calls unless the cache is synchronized.
- Publishing an object to other threads before its constructor finishes (storing `this` in a global inside the constructor) lets them see a half-built object.
- Thread-safe does not mean fast: a class with one big lock is safe but may serialize everything.

Connects to: data races vs race conditions, mutexes and lock guards, immutability, concurrent collections, false sharing and cache-line padding.

### questions
Q: What does it mean for code to be thread-safe?
A: It behaves correctly when called from several threads at the same time, in any interleaving, without the callers adding their own synchronization. Its invariants hold and it contains no data races, typically because its state is immutable, confined to one thread or protected by synchronization.

Q: Why is immutable data automatically thread-safe?
A: A data race needs at least one write. If an object is fully built before other threads can see it and is never modified afterwards, all accesses are reads, which never conflict, so any number of threads can use it without locks.

Q: What is thread confinement?
A: Making sure a piece of data is only ever accessed by one thread, so it needs no synchronization. Examples are local variables, thread_local variables, per-thread buffers whose results are merged after join, and objects handed off completely from one thread to another through a thread-safe queue.

Q: If every method of a class locks a mutex, is code using that class automatically thread-safe?
A: No. Each call is atomic, but a sequence of calls is not: checking whether a key exists and then inserting it can interleave with another thread doing the same. Compound operations must be offered by the class itself under one lock, or the caller must hold a lock around the sequence.

Q: What guarantees does the C++ standard library give about thread safety?
A: Different objects can be used concurrently by different threads, and concurrent calls to const member functions on the same object are safe. Any concurrent use of one object where at least one call is non-const requires external synchronization. shared_ptr's control block is an exception that is internally synchronized.
