---
topic: os.threads
name: "Threads"
subject: os
order: 3
prereqs: [os.processes]
---

## os.threads.threads-vs-processes
name: "Threads vs processes"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "what threads share and what they don't"

### simple
A process is a running program with its own private memory, and threads are several workers inside that one process sharing the same memory. Think of a process as a house and threads as the people living in it: they share the kitchen and living room, but each has their own to-do list and place in their task. Different houses are separate, so a fire in one does not spread, but people in one house can hand each other things instantly.

### interview
- A **thread** is a unit of execution inside a process. Threads of one process **share**: the address space (code, globals, heap), open files and sockets, the current directory, signal handlers and the PID.
- Each thread has **its own**: registers and program counter, **stack**, thread id, signal mask, scheduling state and thread-local storage.
- Threads are **cheaper** to create and switch than processes (no new address space, no TLB flush between them), and they communicate simply by sharing memory, which also means they need **synchronization**.
- Processes give **isolation**: a crash or memory corruption in one does not affect others, and permissions can differ. A segfault in any thread kills the **whole process**.
- On Linux both are "tasks" created by `clone()`; a thread is a task that shares the address space and file table with its creator (same PID, different TID).
- Choose processes for isolation, fault tolerance or security (browser tabs, worker processes, escaping Python's GIL); choose threads for shared state and low overhead (a thread pool in a server).

### deep
#### What is shared

| resource | threads of one process | separate processes |
|---|---|---|
| code, globals, heap | shared | separate (copy-on-write after fork) |
| stack | one per thread | one per process (per thread inside it) |
| registers, program counter | per thread | per thread |
| open file descriptors | shared table | copied at fork, then independent |
| signal handlers | shared | independent |
| process id | same PID, different thread ids | different PIDs |
| crash impact | whole process dies | only that process |

#### Worked example: shared vs copied memory

```cpp
#include <sys/wait.h>
#include <unistd.h>

atomic<int> counter{0};                 // a global: shared by threads, copied by fork

int main() {
    vector<thread> ts;
    for (int i = 0; i < 4; ++i)
        ts.emplace_back([] { for (int j = 0; j < 1000; ++j) ++counter; });
    for (auto& t : ts) t.join();
    printf("after 4 threads: %d\n", counter.load());          // 4000: every thread saw one counter
    fflush(stdout);                                           // don't let fork copy unprinted output

    pid_t pid = fork();
    if (pid == 0) {
        for (int j = 0; j < 1000; ++j) ++counter;            // changes the child's copy only
        printf("inside the child: %d\n", counter.load());    // 5000
        fflush(stdout);                                       // _exit skips stdio's flush
        _exit(0);
    }
    waitpid(pid, nullptr, 0);
    printf("parent after child: %d\n", counter.load());       // still 4000
}
```

| step | parent's counter | child's counter |
|---|---|---|
| 4 threads add 1,000 each | 4000 | - |
| fork | 4000 | 4000 (a copy) |
| child adds 1,000 | 4000 | 5000 |
| parent prints | 4000 | exited |

The threads needed an atomic (or a mutex) because they touched the same memory at the same time; the processes needed nothing, and could not share the result without IPC.

```python
import threading
from multiprocessing import Process

data = []


def add():
    data.append(1)


if __name__ == "__main__":
    ts = [threading.Thread(target=add) for _ in range(3)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    p = Process(target=add)            # the append happens in another process's copy
    p.start()
    p.join()
    print(len(data))                   # 3
```

#### How Linux sees it

Linux has one kind of schedulable entity, the task. `fork` creates a task with its own copy of the address space; `pthread_create` calls `clone` with flags such as `CLONE_VM | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD`, so the new task shares those resources. `getpid()` returns the thread group id (the same for all threads), and `gettid()` returns each thread's own id. `ps -eLf` lists threads.

#### Choosing

| need | better choice | example |
|---|---|---|
| isolate crashes or untrusted code | processes | browser tabs, a worker per request in Apache prefork |
| different privileges | processes | a privileged helper plus an unprivileged main process |
| heavy sharing of in-memory state | threads | an in-memory cache shared by request handlers |
| cheap parallelism on many cores | threads (or processes in Python because of the GIL) | a thread pool computing results |
| scale across machines | processes (services) | anything distributed |

#### Pitfalls

- Believing threads are "lightweight" enough to create one per request without limit: each needs a stack and adds scheduling cost.
- Sharing data between threads without synchronization (data races are undefined behavior in C++).
- Calling `fork` in a multithreaded program: only the calling thread is copied, and locks held by others stay locked in the child.

Connects to: process vs program, user-level vs kernel-level threads, race conditions and critical sections, context switching, concurrency basics.

### questions
Q: What do threads in the same process share, and what does each have of its own?
A: They share the address space, which includes code, global variables and the heap, plus open files, the current directory, signal handlers and the process id. Each thread has its own registers, program counter, stack, thread id, signal mask and thread-local storage.

Q: What are the advantages of threads over processes?
A: Threads are cheaper to create and to switch between because they share an address space, and they can communicate by reading and writing shared memory without IPC. This makes them well suited to parallel work on shared data and to keeping programs responsive.

Q: What are the advantages of processes over threads?
A: Isolation. A crash or memory corruption in one process does not affect others, processes can run with different permissions, and they avoid accidental sharing that causes races. They also let Python programs use several cores despite the global interpreter lock.

Q: What happens to the other threads if one thread crashes with a segmentation fault?
A: The whole process is terminated, including all its threads, because the signal is delivered to the process and they share one address space whose integrity can no longer be trusted.

Q: How does Linux implement threads?
A: As tasks created with the clone system call using flags that make them share the parent's address space, file descriptor table and signal handlers. All threads share one thread group id, which getpid returns, while each has its own thread id.

## os.threads.user-level-vs-kernel-level-threads
name: "User-level vs kernel-level threads"
importance: important
prereqs: [os.threads.threads-vs-processes]
scope: "many-to-one, one-to-one, many-to-many"

### simple
Threads can be managed either by a library inside your program or by the operating system itself. User-level threads are like a team leader secretly splitting one employee's day among several tasks: quick to reorganize, but if that employee gets stuck on a phone call, every task stops. Kernel-level threads are real employees the company knows about, so they can work at the same time, but hiring and coordinating them costs more.

### interview
- **User-level threads** are created, scheduled and switched by a **library in user space**; the kernel sees only one schedulable entity. Switching is very fast (no system call), but a **blocking system call blocks all** of them, and they **cannot run in parallel** on several cores.
- **Kernel-level threads** are known to and scheduled by the **kernel**: they run in parallel on multiple cores and block independently, but creating and switching them involves the kernel and costs more.
- **Many-to-one**: many user threads on one kernel thread (early Java "green threads", GNU Pth). **One-to-one**: each user thread is a kernel thread (Linux NPTL pthreads, Windows threads, Java platform threads). **Many-to-many (M:N)**: many user threads multiplexed over a pool of kernel threads (Go goroutines, Java 21 **virtual threads**, Erlang processes).
- M:N runtimes avoid the blocking problem by parking a user thread when it would block and running another on the same kernel thread, typically with non-blocking I/O underneath.
- Trade-off summary: user threads for huge numbers of cheap tasks, kernel threads for real parallelism; M:N runtimes try to get both, at the cost of a complex scheduler.

### deep
#### The three models

```text
many-to-one          one-to-one            many-to-many
 U U U U              U   U   U            U U U U U U
  \ | | /             |   |   |             \ \ | | / /
    K                 K   K   K               K   K   K
```

| model | parallel on cores? | one blocking call blocks… | cost per thread | examples |
|---|---|---|---|---|
| many-to-one | no | all threads | tiny | early Java green threads, GNU Pth |
| one-to-one | yes | only that thread | a kernel thread each | Linux pthreads (NPTL), Windows, Java platform threads |
| many-to-many | yes | only that user thread, if the runtime handles it | tiny | Go goroutines, Java virtual threads, Erlang |

#### Worked example: a user-level scheduler in a few lines

Python generators can act as user-level threads: each `yield` is a voluntary switch, and a tiny round-robin scheduler decides who runs next. The kernel sees only one thread.

```python
from collections import deque


def worker(name, steps):
    for i in range(steps):
        print(f"{name} step {i}")
        yield                          # give up the CPU voluntarily (a user-level switch)


def run(tasks):
    ready = deque(tasks)
    while ready:
        task = ready.popleft()
        try:
            next(task)                 # resume the task until its next yield
            ready.append(task)
        except StopIteration:
            pass                       # the task finished


run([worker("A", 2), worker("B", 3)])
# A step 0, B step 0, A step 1, B step 1, B step 2
```

| round | ready queue before | runs | printed |
|---|---|---|---|
| 1 | A, B | A | A step 0 |
| 2 | B, A | B | B step 0 |
| 3 | A, B | A | A step 1 |
| 4 | B, A | B | B step 1 |
| 5 | A, B | A | finishes (no output) |
| 6 | B | B | B step 2 |
| 7 | B | B | finishes; the queue is empty |

The weakness is visible too: if worker A called `time.sleep(5)` instead of yielding, the whole scheduler (every "thread") would stop for five seconds, because the kernel puts the only real thread to sleep. That is the many-to-one blocking problem, and it is why `asyncio` replaces blocking calls with `await`able non-blocking versions.

#### Kernel threads in C++

```cpp
int main() {
    auto work = [](int id) {
        this_thread::sleep_for(chrono::milliseconds(100));   // blocks only this kernel thread
        return id * id;
    };
    auto t0 = chrono::steady_clock::now();
    vector<future<int>> results;
    for (int i = 0; i < 4; ++i) results.push_back(async(launch::async, work, i));   // 4 kernel threads
    int sum = 0;
    for (auto& r : results) sum += r.get();
    auto ms = chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - t0).count();
    printf("sum %d in about %lld ms\n", sum, (long long)ms);   // sum 14 in about 100 ms, not 400
}
```

#### How M:N runtimes cope with blocking

Go's scheduler runs goroutines (G) on OS threads (M) through logical processors (P). When a goroutine makes a blocking system call, its M is detached and another M takes over the P, so other goroutines keep running; network I/O uses the netpoller (epoll) so goroutines park without blocking any thread. Java virtual threads similarly unmount from their carrier thread when they block on supported I/O.

Connects to: threads vs processes, context switching, blocking vs non-blocking I/O, I/O multiplexing, concurrency basics.

### questions
Q: What is the difference between user-level and kernel-level threads?
A: User-level threads are managed entirely by a library in user space and the kernel sees only one thread, so they are fast to create and switch but cannot run in parallel and all block when one makes a blocking system call. Kernel-level threads are managed and scheduled by the kernel, can run on multiple cores and block independently, but cost more to create and switch.

Q: Describe the many-to-one, one-to-one and many-to-many models.
A: Many-to-one maps all user threads onto a single kernel thread, so there is no parallelism. One-to-one maps each user thread to its own kernel thread, as Linux pthreads and Windows do. Many-to-many multiplexes many user threads over a smaller pool of kernel threads, as Go goroutines and Java virtual threads do.

Q: Why does a blocking system call hurt user-level threads?
A: The kernel only knows about the one kernel thread behind them. When any user thread makes a blocking call, the kernel blocks that kernel thread, so the library cannot run any of the other user threads until the call returns.

Q: How do Go goroutines avoid blocking the whole program on I/O?
A: Go uses an M:N scheduler. Network I/O goes through a poller based on epoll or similar, so a goroutine waiting on the network is parked while its OS thread runs others. For blocking system calls, the runtime hands the logical processor to another OS thread so other goroutines keep running.

## os.threads.benefits-and-costs-of-multithreading
name: "Benefits and costs of multithreading"
importance: important
prereqs: [os.threads.threads-vs-processes]
scope: "responsiveness, overhead, complexity"

### simple
Using several threads lets a program do more than one thing at a time, like keeping a screen responsive while work happens in the background. But more threads are like more cooks in one kitchen: up to a point they finish faster, then they start bumping into each other and waiting for the same stove. Threads help only when the work can really be split and the coordination stays cheap.

### interview
- **Benefits**: **responsiveness** (a UI or server keeps reacting while slow work runs elsewhere), **parallelism** on multiple cores, **overlapping I/O with computation**, cheap **resource sharing**, and lower cost than processes.
- **Costs**: memory for each thread's stack, creation and **context-switch** overhead, **synchronization** overhead and lock contention, **cache effects** such as false sharing, and above all **complexity**: races, deadlocks and bugs that appear only sometimes.
- **Amdahl's law** limits speedup: with a parallel fraction $p$ on $n$ cores, speedup $\le 1 / ((1 - p) + p/n)$. With $p = 0.9$ even infinitely many cores give at most 10×.
- CPU-bound work: about one thread per core. I/O-bound work: more threads (or async I/O) because most are waiting.
- In CPython the **GIL** lets only one thread run Python bytecode at a time, so threads help I/O-bound work but not CPU-bound pure-Python work; use processes (or the free-threaded build).
- Prefer higher-level tools: thread pools, futures, parallel algorithms and message passing over hand-managed threads and locks.

### deep
#### Benefits in practice

| benefit | example |
|---|---|
| responsiveness | a UI thread handles clicks while a worker thread saves a big file |
| parallel speedup | four threads each sum a quarter of an array |
| hiding latency | while one thread waits on the disk or network, another computes |
| simpler structure for some problems | one thread per independent activity, such as a logger, a heartbeat and a worker |

#### Amdahl's law: worked example

A job takes 100 s on one core, and 90 s of it can run in parallel ($p = 0.9$).

| cores $n$ | time $= 10 + 90/n$ | speedup |
|---|---|---|
| 1 | 100 s | 1.0× |
| 2 | 55 s | 1.8× |
| 4 | 32.5 s | 3.1× |
| 8 | 21.25 s | 4.7× |
| 16 | 15.6 s | 6.4× |
| unlimited | 10 s | 10× |

$$S(n) = \frac{1}{(1-p) + \frac{p}{n}}$$

The serial 10% dominates quickly, and real programs do worse because of synchronization and memory bandwidth limits.

#### Code: splitting CPU-bound work

```cpp
long long parallelSum(const vector<int>& v, int threads) {
    vector<long long> partial(threads, 0);
    vector<thread> ts;
    size_t chunk = (v.size() + threads - 1) / threads;
    for (int t = 0; t < threads; ++t) {
        ts.emplace_back([&, t] {
            size_t lo = t * chunk, hi = min(v.size(), lo + chunk);
            long long s = 0;                          // a local sum avoids sharing a cache line
            for (size_t i = lo; i < hi; ++i) s += v[i];
            partial[t] = s;                           // one write per thread at the end
        });
    }
    for (auto& th : ts) th.join();
    return accumulate(partial.begin(), partial.end(), 0LL);
}

int main() {
    vector<int> v(10'000'000, 1);
    unsigned n = max(1u, thread::hardware_concurrency());
    cout << parallelSum(v, (int)n) << " using " << n << " threads\n";   // 10000000 using …
}
```

If each thread did `partial[t] += v[i]` inside the loop, neighboring `partial` entries on the same cache line would bounce between cores (**false sharing**) and the parallel version could be slower than the serial one.

#### Code: I/O-bound work in Python

```python
import time
from concurrent.futures import ThreadPoolExecutor


def fetch(i):
    time.sleep(0.2)          # stands in for a network call; releases the GIL while waiting
    return i


start = time.perf_counter()
with ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(fetch, range(8)))
print(results, round(time.perf_counter() - start, 1))   # [0, 1, ..., 7] 0.2 rather than 1.6
```

The same pool running a pure-Python CPU loop would take about as long as one thread, because of the GIL; `ProcessPoolExecutor` fixes that.

#### Costs in detail

- **Memory**: each thread reserves a stack (8 MB of virtual space by default for Linux pthreads, 1 MB by default for Java threads on 64-bit Linux); thousands of threads add up.
- **Scheduling**: more runnable threads than cores means more context switches and colder caches.
- **Synchronization**: locks serialize work (Amdahl again) and contention causes threads to sleep and wake.
- **Correctness**: races, deadlocks, livelocks and memory-ordering bugs are hard to reproduce and test.

Connects to: threads vs processes, race conditions and critical sections, thread pools, cache lines and locality, context switching.

### questions
Q: What are the main benefits of multithreading?
A: Responsiveness, because slow work can run without freezing the user interface or other requests; parallel speedup on multiple cores; overlapping I/O waits with computation; and cheap sharing of data and resources compared with separate processes.

Q: What are the costs and risks of multithreading?
A: Each thread needs memory for its stack and adds scheduling and context switch overhead. Shared data needs synchronization, which adds contention and can serialize work. Threads introduce hard bugs such as race conditions, deadlocks and false sharing that appear nondeterministically.

Q: What does Amdahl's law say?
A: The speedup from parallelizing a program is limited by its serial part: with a parallel fraction p on n processors, speedup is at most 1 divided by (1 minus p plus p over n). If 10 percent of the work is serial, no number of processors can make the program more than 10 times faster.

Q: How many threads should a program use?
A: For CPU-bound work, roughly one per core, since more only adds switching. For I/O-bound work, more threads can help because most are waiting, though asynchronous I/O often scales better. Measure rather than guess.

Q: Why do Python threads not speed up CPU-bound code?
A: CPython's global interpreter lock allows only one thread to execute Python bytecode at a time, so CPU-bound threads take turns rather than running in parallel. Threads still help I/O-bound work because the lock is released while waiting; for CPU-bound work, use multiple processes or native extensions.
