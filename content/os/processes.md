---
topic: os.processes
name: "Processes"
subject: os
order: 2
prereqs: [os.fundamentals]
---

## os.processes.process-vs-program
name: "Process vs program"
importance: must
scope: "address space layout (text, data, heap, stack)"

### simple
A program is a set of instructions stored in a file, and a process is that program actually running, with its own memory and progress. A recipe in a cookbook is the program, while a cook following it in a kitchen, with ingredients on the counter and a place in the steps, is the process. Two cooks can follow the same recipe at once, each in their own kitchen.

### interview
- A **program** is passive: an executable file on disk (code plus initial data). A **process** is active: a program in execution with its own **address space**, registers and program counter, open files, a **PID** and a state.
- One program can run as many processes (three terminals running `bash`), each with private memory.
- Typical virtual **address space layout** from low to high addresses: **text** (machine code, read-only and executable), **data** (initialized globals and statics), **BSS** (zero-initialized globals), **heap** (grows up; `malloc`, `new`), memory-mapped region (shared libraries, `mmap`), **stack** (grows down; local variables, return addresses), and the kernel's part at the top, inaccessible from user mode.
- Each **thread** gets its own stack; all threads share text, data, BSS and heap.
- **ASLR** randomizes the base addresses of these regions on every run to make memory-corruption attacks harder.
- The size of text, data and BSS is visible with `size a.out`; a running process's map is in `/proc/<pid>/maps`.

### deep
#### Intuition

The executable file is like sheet music: complete but silent. Running it creates a process, a performance with a current position (the program counter), scratch notes (registers and the stack) and props (open files, sockets). The OS keeps each performance in its own sealed room: its virtual address space.

#### The address space

```text
high addresses
+------------------------+
| kernel space           |  not accessible from user mode
+------------------------+
| stack        ↓         |  locals, return addresses; one per thread
|                        |
| memory mappings        |  shared libraries, mmap'd files, big malloc blocks
|                        |
| heap         ↑         |  malloc / new; grows with brk or mmap
+------------------------+
| BSS                    |  zero-initialized globals (no space in the file)
| data                   |  initialized globals and statics
| text                   |  machine code, read-only
+------------------------+
low addresses
```

#### Worked example: where things live

```cpp
int initialized = 42;          // data
int zeroed;                    // BSS
void greet() {}                // its machine code is in text

int main() {
    int local = 0;             // stack
    int* dynamic = new int(7); // heap
    printf("text  %p\ndata  %p\nbss   %p\nheap  %p\nlib   %p\nstack %p\n",
           (void*)&greet, (void*)&initialized, (void*)&zeroed, (void*)dynamic,
           (void*)&printf, (void*)&local);
    delete dynamic;
}
```

One run on Linux x86-64 printed:

| region | address | note |
|---|---|---|
| text | 0x55fc17de7199 | the executable is mapped low |
| data | 0x55fc17dea010 | just after the code |
| bss | 0x55fc17dea024 | right after data |
| heap | 0x55fc209bd2b0 | above BSS, at a random gap |
| lib | 0x7f9c0a260100 | `printf` lives in the C library, in the mapping area |
| stack | 0x7fffc1b4c60c | near the top of user space |

Run it again and every address changes (ASLR), but the order stays. `size` on the same binary reported text 2080, data 656 and BSS 8 bytes: BSS takes no space in the file, only a size to zero-fill at load.

#### Program to process

When you run a program, the kernel's `exec`:

1. Reads the executable's headers (ELF on Linux) and maps text and data from the file into memory, lazily, page by page.
2. Sets up a zero-filled BSS and an empty heap.
3. Maps the dynamic loader, which maps shared libraries.
4. Builds the initial stack with `argc`, `argv` and environment variables.
5. Jumps to the entry point, which eventually calls `main`.

Around that address space, the kernel also keeps a process control block with the PID, state, open file table and scheduling information.

#### Python view

```python
import os

print(os.getpid(), os.getppid())         # this process and its parent (for example the shell)
with open(f"/proc/{os.getpid()}/maps") as f:
    for line in list(f)[:3]:             # the first mappings: the interpreter's own code
        print(line.split()[0], line.split()[-1])
```

#### Pitfalls

- Returning a pointer to a local variable: the stack frame is gone after the function returns.
- Very deep recursion overflows the stack (typically 8 MB for the main thread on Linux, less for other threads).
- Thinking two processes share globals: after `fork`, each has its own copy.

Connects to: process control block and states, threads vs processes, stack vs heap memory, logical vs physical addresses, fork, exec and wait.

### questions
Q: What is the difference between a program and a process?
A: A program is a passive executable file containing code and initial data. A process is an instance of a program in execution, with its own address space, registers, program counter, open files, process id and state. The same program can run as many independent processes.

Q: Describe the memory layout of a process.
A: From low to high addresses: the text segment with machine code, the data segment with initialized globals, BSS with zero-initialized globals, the heap growing upward for dynamic allocation, a region for memory-mapped files and shared libraries, and the stack growing downward for function frames. The kernel's memory sits above, inaccessible from user mode.

Q: What is stored in the BSS segment and why is it separate from data?
A: Global and static variables that are uninitialized or initialized to zero. They are kept separate because the executable only needs to record their total size; the loader provides zero-filled pages at startup, so they take no space in the file.

Q: What do threads of the same process share, and what is private?
A: They share the text, data, BSS and heap, plus open files and other process resources. Each thread has its own stack, registers, program counter and thread-local storage.

Q: What is ASLR?
A: Address space layout randomization places the stack, heap, shared libraries and often the executable at random base addresses on each run. Attackers exploiting memory bugs can then no longer rely on fixed addresses for their payloads.

## os.processes.process-control-block-and-states
name: "Process control block and states"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "new, ready, running, waiting, terminated"

### simple
The operating system keeps a record card for every process, called the process control block, and moves each process between a few states as it runs. A process is like a patient in a clinic: waiting in the lobby (ready), with the doctor (running), off for a blood test (waiting) or finally discharged (terminated). The record card travels with the patient, so the doctor can pick up exactly where they left off.

### interview
- The **process control block** (PCB; `task_struct` in Linux) holds everything the kernel knows about a process: **PID** and parent PID, **state**, saved **registers and program counter**, scheduling info (priority, queue links, CPU time used), memory info (page table pointer), **open file table**, signal handlers and pending signals, credentials, accounting.
- Classic five states: **new** (being created), **ready** (can run, waiting for a CPU), **running** (on a CPU), **waiting or blocked** (waiting for I/O or an event), **terminated** (finished, not yet cleaned up).
- Transitions: new → ready (admitted); ready → running (dispatched by the scheduler); running → ready (preempted by a timer interrupt or yield); running → waiting (blocking system call such as `read`); waiting → ready (I/O done); running → terminated (exit).
- **Waiting never goes straight to running**: the process must be scheduled again from the ready queue.
- The kernel keeps a **ready queue** and one or more **wait queues** of PCBs; at most one process per core is running.
- Linux `ps` shows R (running or runnable), S (interruptible sleep), D (uninterruptible sleep, usually disk I/O), T (stopped), Z (zombie). Some textbooks add suspended states for swapped-out processes.

### deep
#### Intuition

The CPU can run only one process per core at a time, yet dozens appear to run at once. The kernel makes this work by freezing a process's entire execution context into its PCB whenever it stops running and thawing it later. The state tells the kernel which list the PCB belongs on: ready to run, waiting for something, or done.

#### The state diagram

```text
          admitted              dispatch
  new ─────────────> ready ─────────────> running ───────> terminated
                      ^   <─────────────     │      exit
                      │     preempted        │
                      │  (timer, yield)      │ blocking call
                      │                      v (read, sleep, lock)
                      └─────────────────── waiting
                         event done (I/O complete, lock free)
```

#### What the PCB holds

| group | fields |
|---|---|
| identity | PID, parent PID, user and group ids |
| CPU context | program counter, stack pointer, general registers, flags, floating point state |
| scheduling | state, priority, time used, pointers into the ready or wait queue |
| memory | page table base, memory limits, list of mapped regions |
| files and I/O | table of open file descriptors, current directory |
| signals | handlers, blocked and pending signals |
| accounting | CPU time, start time, resource limits |

#### Worked example: two processes, one core

P1 computes, then reads a file; P2 computes only. Time slice: 10 ms.

| time (ms) | P1 | P2 | event |
|---|---|---|---|
| 0 | running | ready | P1 dispatched |
| 10 | ready | running | timer interrupt: P1 preempted |
| 20 | running | ready | P2 preempted |
| 24 | waiting | ready | P1 calls `read`, disk request issued |
| 24 | waiting | running | scheduler dispatches P2 |
| 30 | ready | running | disk interrupt: P1's data arrived |
| 34 | ready | terminated | P2 exits |
| 34 | running | - | P1 dispatched, `read` returns |

At 30 ms P1 does not preempt P2 automatically; it becomes ready, and the scheduler decides (a real scheduler might favor the process that just finished I/O).

#### Seeing states on Linux

```python
import os
import time

pid = os.fork()
if pid == 0:
    time.sleep(2)            # the child sleeps: state S
    os._exit(0)
time.sleep(0.2)
with open(f"/proc/{pid}/stat") as f:
    print("child state:", f.read().split()[2])   # S
with open(f"/proc/{os.getpid()}/stat") as f:
    print("my state:", f.read().split()[2])      # R: reading its own stat while running
os.waitpid(pid, 0)
```

#### Pitfalls

- Confusing ready with running: a ready process is runnable but not on a CPU.
- Forgetting that preemption goes to ready, while blocking goes to waiting.
- D state (uninterruptible sleep) cannot be killed, even with `SIGKILL`, until the I/O finishes; many D-state processes usually mean a storage problem.

Connects to: context switching, scheduling criteria, zombie and orphan processes, interrupts, traps and exceptions.

### questions
Q: What information does a process control block contain?
A: The process id and parent id, the process state, saved CPU registers and program counter, scheduling information such as priority and queue pointers, memory management information such as the page table base, the table of open files, signal information, credentials and accounting data like CPU time used.

Q: Describe the five process states and the transitions between them.
A: New while being created, then ready once admitted. The scheduler dispatches a ready process to running. A running process returns to ready when preempted, moves to waiting when it blocks on I/O or an event, and moves to terminated when it exits. A waiting process becomes ready when its event completes.

Q: Can a process move directly from waiting to running?
A: No. When the awaited event completes, the process becomes ready and joins the ready queue. It runs again only when the scheduler dispatches it, which may be immediately if the scheduler chooses it.

Q: What causes a process to move from running to ready?
A: Preemption: a timer interrupt ends its time slice, or a higher-priority process becomes ready, or the process voluntarily yields. It is still runnable, so it goes back to the ready queue rather than to waiting.

Q: What do the R, S, D and Z states in ps mean on Linux?
A: R means running or runnable, S is interruptible sleep waiting for an event, D is uninterruptible sleep usually waiting on disk I/O, and Z is a zombie: a process that has exited but whose parent has not yet collected its exit status.

## os.processes.context-switching
name: "Context switching"
importance: must
prereqs: [os.processes.process-control-block-and-states]
scope: "what is saved, why it is expensive"

### simple
A context switch is the CPU putting one task aside and picking up another exactly where it was left. It is like a chef cooking several orders: they note where each dish is, clear the station, set out the next dish's ingredients, and later come back to the first. Each switch takes time that is not spent cooking, so too many switches slow everything down.

### interview
- A **context switch** saves the running process's or thread's CPU state (program counter, stack pointer, general registers, flags, floating point and vector registers) into its PCB or kernel stack, picks the next task, and restores that task's state.
- Between processes, the kernel also switches the **address space** (loads a new page table base, CR3 on x86), which can flush the **TLB** unless it is tagged (PCID or ASID).
- **Triggers**: a timer interrupt ending a time slice, a blocking system call (I/O, lock, sleep), a higher-priority task waking up, or an explicit yield.
- **Direct cost**: typically on the order of a microsecond or a few: kernel entry, saving and restoring registers, running the scheduler. **Indirect cost** is often larger: the new task finds cold **caches and TLB** and pays misses for a while.
- Thread switches within a process are cheaper than process switches (no address space change, caches partly shared).
- Reducing switches: fewer runnable threads than cores for CPU-bound work, thread pools, event loops and async I/O, batching, and pinning threads to cores. On Linux, `vmstat` and `/proc/<pid>/status` show switch counts.

### deep
#### What gets saved

| state | saved where | why |
|---|---|---|
| program counter, stack pointer, flags | kernel stack or PCB | to resume at the exact instruction |
| general-purpose registers | kernel stack or PCB | the task's working values |
| floating point and SIMD registers | PCB (often saved lazily) | large: hundreds of bytes to kilobytes with AVX |
| address space (page table base) | PCB | each process has its own mappings |
| kernel stack pointer | PCB | each task has its own kernel stack |

Memory contents are not copied: they stay where they are, and switching the page table base changes which ones the CPU can see.

#### Worked example: a switch triggered by a timer

| step | action |
|---|---|
| 1 | the timer interrupt fires while P1 runs in user mode |
| 2 | the CPU enters kernel mode and saves P1's user registers on P1's kernel stack |
| 3 | the scheduler sees P1's slice is used up and picks P2 from the ready queue |
| 4 | P1's kernel stack pointer and remaining registers are saved in its PCB; P1 becomes ready |
| 5 | P2's page table base is loaded (the TLB may be flushed) |
| 6 | P2's kernel stack and registers are restored |
| 7 | return from interrupt: P2 continues in user mode where it last stopped |

#### Code: measuring it

Two processes pinned to the same core pass one byte back and forth through two pipes, so every hop forces a switch.

```cpp
#include <sched.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(0, &set);
    sched_setaffinity(0, sizeof set, &set);           // parent and child share one core
    int ab[2], ba[2];
    if (pipe(ab) < 0 || pipe(ba) < 0) return 1;
    const int rounds = 100000;
    char c = 'x';
    if (fork() == 0) {                                // child: echo each byte back
        for (int i = 0; i < rounds; ++i)
            if (read(ab[0], &c, 1) != 1 || write(ba[1], &c, 1) != 1) _exit(1);
        _exit(0);
    }
    auto t0 = chrono::steady_clock::now();
    for (int i = 0; i < rounds; ++i)
        if (write(ab[1], &c, 1) != 1 || read(ba[0], &c, 1) != 1) return 1;
    auto t1 = chrono::steady_clock::now();
    wait(nullptr);
    double us = chrono::duration<double, micro>(t1 - t0).count();
    printf("%.2f us per switch (including the pipe calls)\n", us / (2.0 * rounds));
}
```

One run on a cloud virtual machine printed about 1.6 µs per switch, including two pipe system calls. The number varies with hardware, virtualization and kernel mitigations; the point is that it is thousands of times slower than an ordinary function call.

#### Why the indirect cost dominates

After a switch, the new task's data is probably not in the L1 and L2 caches, and its translations are not in the TLB, so its next thousands of memory accesses miss. A CPU-bound program that is switched out every millisecond can lose a noticeable share of its speed to these misses, even if the switch itself took only a microsecond.

#### Keeping switches down

- Match CPU-bound worker threads to the number of cores; more threads only add switches.
- Use a thread pool instead of a thread per request.
- Use an event loop with non-blocking I/O (epoll) so one thread serves many connections.
- Avoid lock contention: a blocked lock waiter causes two switches.
- In latency-critical systems (trading), pin threads to isolated cores and busy-poll instead of blocking.

Connects to: process control block and states, threads vs processes, TLB, round robin, thread pools, cost of system calls and context switches.

### questions
Q: What happens during a context switch?
A: The kernel saves the current task's CPU state, including the program counter, stack pointer, registers and flags, into its kernel stack or PCB, selects the next task with the scheduler, switches the address space if the new task is in another process, restores the new task's saved state and resumes it.

Q: Why are context switches expensive?
A: There is the direct cost of entering the kernel, saving and restoring registers, running the scheduler and possibly switching page tables. The larger indirect cost is that the new task starts with cold caches and a TLB that lacks its translations, so it suffers many misses afterwards.

Q: Why is switching between threads of the same process cheaper than between processes?
A: Threads share one address space, so the page table does not change and the TLB does not need flushing, and shared data may still be in the caches. Only registers and the stack pointer need to change.

Q: What events cause a context switch?
A: A timer interrupt ending the time slice, the running task blocking on I/O, a lock or sleep, a higher-priority task becoming ready, or the task yielding voluntarily or exiting.

Q: How can a server reduce the number of context switches?
A: Use a fixed-size thread pool sized to the cores for CPU-bound work, use non-blocking I/O with an event loop such as epoll instead of a thread per connection, reduce lock contention, batch work, and pin critical threads to dedicated cores.

## os.processes.fork-exec-and-wait
name: "fork, exec and wait"
importance: must
prereqs: [os.fundamentals.system-calls, os.processes.process-vs-program]
scope: "creating processes in Unix, copy-on-write"

### simple
In Unix, a new process is made in two steps: fork makes a copy of the current process, and exec replaces that copy's program with a new one. It is like photocopying a form and then writing new answers on the copy. The original process can then wait for the copy to finish and read how it went.

### interview
- `fork()` creates a **child** that is a near-identical copy of the parent: same code, a copy of memory, copies of open file descriptors (sharing file offsets). It **returns twice**: `0` in the child, the child's PID in the parent, `-1` on failure.
- `exec` (`execve`, `execvp`, …) **replaces** the calling process's program with a new one: new text, data, heap and stack, but the **same PID** and (unless marked close-on-exec) the same open descriptors. On success it never returns.
- `wait` / `waitpid` block the parent until a child exits (or stops) and **reap** it, collecting its exit status (`WIFEXITED`, `WEXITSTATUS`). Without it the child stays a zombie.
- **Copy-on-write** makes fork cheap: parent and child share physical pages marked read-only; the first write to a page faults and the kernel copies just that page. fork + exec rarely copies anything.
- The shell pattern: fork; in the child set up redirections with `dup2` and exec the command; in the parent wait (or not, for `&`).
- Classic puzzles: `n` sequential `fork()` calls give `2^n` processes; unflushed `printf` output is duplicated because the buffer is copied too. Alternatives: `vfork`, `posix_spawn`, Linux `clone`.

### deep
#### Intuition

Separating "make a new process" from "run a new program" looks odd, but it is powerful: between fork and exec the child can adjust its own environment (redirect output to a file, change directory, drop privileges, close descriptors) using ordinary code, and then exec inherits all of that. The shell's `ls > out.txt` is exactly fork, open, `dup2`, exec.

#### Code: a tiny shell step

```cpp
#include <fcntl.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid == 0) {                                          // child
        int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
        dup2(fd, STDOUT_FILENO);                             // stdout now goes to out.txt
        close(fd);
        execlp("echo", "echo", "hello from the child", (char*)nullptr);
        perror("exec");                                      // reached only if exec failed
        _exit(127);
    }
    int status = 0;
    waitpid(pid, &status, 0);                                // parent: reap the child
    if (WIFEXITED(status)) printf("child %d exited with %d\n", pid, WEXITSTATUS(status));
}
```

After it runs, `out.txt` contains "hello from the child", and the parent prints the child's PID and exit code 0.

```python
import os

pid = os.fork()
if pid == 0:                                   # child
    os.execvp("echo", ["echo", "hi from exec"])
_, status = os.waitpid(pid, 0)                 # parent
print("exit code", os.waitstatus_to_exitcode(status))   # 0
```

#### Worked example: counting processes

```cpp
int main() {
    fork();   // 2 processes now
    fork();   // each forks: 4
    fork();   // 8
    printf("hi\n");   // printed 8 times
}
```

| after | processes | new this step |
|---|---|---|
| start | 1 | - |
| 1st `fork` | 2 | 1 |
| 2nd `fork` | 4 | 2 |
| 3rd `fork` | 8 | 4 |

Eight processes, seven of them new. Now a trap: `printf("A"); fork(); printf("B\n");` prints `AB` twice when output goes to a pipe or file, because "A" was still in the stdio buffer, which fork copied. Flush (`fflush(stdout)`) before forking.

#### Copy-on-write

| moment | parent's page X | child's page X |
|---|---|---|
| right after fork | frame 12, read-only | frame 12, read-only (shared) |
| child writes to X | frame 12 | page fault; kernel copies to frame 40, now writable |
| after | frame 12 | frame 40 |

Only written pages are ever copied. If the child calls exec immediately, it throws its mappings away and almost nothing is copied, so fork is fast even for huge parents. (Very large parents still pay for copying page tables, which is one reason `posix_spawn` and `vfork` exist.)

#### Pitfalls

- Not checking fork's `-1` return (process limits are real).
- Forgetting `wait`, which leaves zombies.
- Calling `exit` instead of `_exit` in a failed child, which flushes the parent's copied stdio buffers a second time.
- Forking a multithreaded program: only the calling thread exists in the child, and locks held by other threads stay locked forever; exec immediately.

Connects to: zombie and orphan processes, copy-on-write and memory-mapped files, process vs program, inter-process communication, system calls.

### questions
Q: What does fork return, and why does it return twice?
A: fork creates a copy of the calling process, and both copies continue from the same point, so the call returns once in each. It returns 0 in the child, the child's process id in the parent, and -1 in the parent if no child could be created.

Q: What does exec do to the calling process?
A: It replaces the process's program: the code, data, heap and stack are discarded and the new executable is loaded and started at its entry point. The process id stays the same and open file descriptors remain open unless marked close-on-exec. On success exec does not return.

Q: Why does Unix separate fork and exec?
A: Between the two calls the child can run ordinary code to set up its environment, such as redirecting standard output with dup2, changing directory, closing descriptors or dropping privileges, and exec then runs the new program with those settings. Shells implement redirection and pipes this way.

Q: What is copy-on-write in the context of fork?
A: Instead of copying the parent's memory, the kernel lets parent and child share the same physical pages marked read-only. When either one writes to a page, a page fault occurs and the kernel copies only that page. This makes fork cheap, especially when exec follows immediately.

Q: How many processes does calling fork three times in a row create?
A: Each fork doubles the number of processes, so after three calls there are 2 to the power 3, which is 8 processes in total, of which 7 are newly created.

## os.processes.zombie-and-orphan-processes
name: "Zombie and orphan processes"
importance: important
prereqs: [os.processes.fork-exec-and-wait]
scope: "causes and cleanup"

### simple
A zombie is a process that has finished but whose parent has not yet collected its final report, so a small record of it hangs around. An orphan is the opposite: a process still running after its parent has already gone. The system handles orphans by giving them a foster parent, but zombies stay until their parent does its paperwork.

### interview
- **Zombie**: the child has **exited**, but the parent has not called `wait`, so the kernel keeps its process table entry (PID, exit status, resource usage). `ps` shows state **Z** or `<defunct>`.
- A zombie uses no memory or CPU, only a PID slot, but many zombies can **exhaust PIDs** and block new processes.
- You **cannot kill a zombie** (it is already dead). Fix the parent: call `wait`/`waitpid`, handle **SIGCHLD** by reaping in a loop, or set SIGCHLD to `SIG_IGN` so children are reaped automatically. Killing the parent also works: the zombies are re-parented and reaped.
- **Orphan**: the parent **exits first**; the child is **re-parented** to init (PID 1) or a designated subreaper, which reaps it when it exits. Orphans are harmless and are how daemons detach (the double fork).
- Containers: an application running as PID 1 that never reaps children accumulates zombies; use a tiny init such as `tini` (`docker run --init`).

### deep
#### Why zombies exist

When a process exits, its parent may want its exit status. The kernel frees the memory, files and most of the PCB immediately, but keeps a small record until the parent asks for it with `wait`. That lingering record is a zombie. It is a feature: without it, the status would be lost if the parent checked a moment too late.

#### Worked example: seeing a zombie

```cpp
#include <sys/wait.h>
#include <unistd.h>

char stateOf(pid_t pid) {
    ifstream f("/proc/" + to_string(pid) + "/stat");
    string pidStr, comm;
    char state = '?';                                  // '?' if the entry no longer exists
    f >> pidStr >> comm >> state;
    return state;
}

int main() {
    pid_t child = fork();
    if (child == 0) _exit(7);                          // the child exits at once
    usleep(200000);                                    // the parent is busy and has not waited
    printf("state before wait: %c\n", stateOf(child)); // Z
    int status;
    waitpid(child, &status, 0);                        // reap: the entry disappears
    printf("exit code %d, state after wait: %c\n", WEXITSTATUS(status), stateOf(child));   // 7, ?
}
```

| time | child | parent | process table |
|---|---|---|---|
| fork | running | running | both entries |
| child `_exit(7)` | zombie (Z) | sleeping | child's entry kept with status 7 |
| `waitpid` | gone | gets 7 | child's entry removed |

#### Reaping with SIGCHLD

A server that forks workers cannot block in `wait`. It reaps in a signal handler instead, looping because several children may exit before the handler runs:

```cpp
#include <signal.h>
#include <sys/wait.h>

void reap(int) {
    int saved = errno;
    while (waitpid(-1, nullptr, WNOHANG) > 0) {}    // reap every child that has exited
    errno = saved;
}

void installReaper() {
    struct sigaction sa {};
    sa.sa_handler = reap;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;
    sigaction(SIGCHLD, &sa, nullptr);
}
```

Alternatively `signal(SIGCHLD, SIG_IGN)` tells the kernel the parent does not care, and children are reaped automatically.

#### Orphans

```python
import os
import time

pid = os.fork()
if pid == 0:
    time.sleep(0.5)                              # outlive the parent
    print("orphan's new parent:", os.getppid())  # 1, or a subreaper such as systemd --user
    os._exit(0)
print("parent exiting, child is", pid)          # the parent exits without waiting
```

The kernel re-parents the orphan to PID 1 (or the nearest ancestor marked as a child subreaper), and that process's reaping loop cleans it up later.

#### Pitfalls

- Trying `kill -9` on a zombie: nothing happens. Find the parent (`ps -o ppid= -p <pid>`) and fix or restart it.
- Reaping only one child per SIGCHLD: signals merge, so loop with `WNOHANG`.
- PID 1 in containers ignoring SIGCHLD duties.

Connects to: fork, exec and wait, process control block and states, Linux essentials for interviews.

### questions
Q: What is a zombie process?
A: A process that has terminated but still has an entry in the process table because its parent has not yet called wait to collect its exit status. It uses no memory or CPU, only a process id and a small record, and ps shows it with state Z or as defunct.

Q: How do you get rid of zombie processes?
A: The parent must reap them with wait or waitpid, typically in a SIGCHLD handler that loops with WNOHANG, or set SIGCHLD to be ignored so the kernel reaps children automatically. If the parent cannot be fixed, killing it makes init adopt the zombies and reap them. Killing the zombie itself does nothing.

Q: What is an orphan process and what happens to it?
A: A process whose parent exits while it is still running. The kernel re-parents it to init, PID 1, or to a designated subreaper, which will reap it when it exits. Orphans are normal; daemons deliberately become orphans to detach from the terminal.

Q: Why can zombies cause problems even though they use no memory?
A: Each zombie holds a process id and a process table slot. A parent that creates many children and never reaps them can exhaust the available process ids, after which fork fails and no new processes can start.

Q: Why do containers sometimes accumulate zombie processes?
A: The container's first process runs as PID 1 and inherits the duty of reaping orphaned descendants. Many applications are not written to do this, so orphaned children that exit become zombies. Running a minimal init such as tini as PID 1 fixes it.

## os.processes.inter-process-communication
name: "Inter-process communication"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "pipes, shared memory, message queues, sockets, signals"

### simple
Inter-process communication is how separate programs send data to each other, since each one has its own private memory. They can pass notes through a tube (a pipe), post letters in a mailbox (a message queue), share a whiteboard (shared memory), make a phone call (a socket), or tap each other on the shoulder (a signal). Each method trades speed, simplicity and reach differently.

### interview
- **Pipes**: a one-way byte stream in the kernel between related processes (parent and child); `ls | grep x`. **Named pipes (FIFOs)** have a file system name, so unrelated processes can use them. A full pipe blocks the writer (the Linux default capacity is 64 KB).
- **Message queues** (POSIX `mq_open`, System V `msgget`): the kernel stores discrete **messages** with boundaries and optional priorities.
- **Shared memory** (`shm_open` + `mmap`, System V `shmget`): processes map the same physical pages. **Fastest**, since data is not copied through the kernel, but needs **synchronization** (semaphores or mutexes placed in the shared region).
- **Sockets**: bidirectional; **Unix domain sockets** for local processes (can also pass file descriptors), **TCP/UDP** across machines. The most general choice.
- **Signals**: tiny asynchronous notifications carrying only a number (`SIGTERM`, `SIGKILL`, `SIGCHLD`, `SIGUSR1`); for control, not data.
- Also: memory-mapped files, and higher layers such as D-Bus, gRPC and message brokers. Choose by speed, direction, message boundaries, whether processes are related, and whether they are on one machine.

### deep
#### The options side by side

| mechanism | direction | data model | related only? | across machines? | speed |
|---|---|---|---|---|---|
| anonymous pipe | one-way | byte stream | yes | no | good (two copies) |
| named pipe (FIFO) | one-way | byte stream | no | no | good |
| message queue | any | messages with boundaries | no | no | good |
| shared memory | any | raw memory | no | no | best (no copies), needs locks |
| Unix domain socket | two-way | stream or datagrams | no | no | good |
| TCP or UDP socket | two-way | stream or datagrams | no | yes | network-bound |
| signal | one-way | a signal number | no | no | control only |

"Two copies" for pipes and sockets: the writer's data is copied into a kernel buffer, then out to the reader. Shared memory skips both after setup, which is why databases and trading systems use it for large or frequent data.

#### Worked example: a pipe between parent and child

```cpp
#include <sys/wait.h>
#include <unistd.h>

int main() {
    int fd[2];                                   // fd[0]: read end, fd[1]: write end
    if (pipe(fd) < 0) return 1;
    if (fork() == 0) {                           // child: the writer
        close(fd[0]);
        const char msg[] = "report ready";
        if (write(fd[1], msg, sizeof msg) < 0) _exit(1);
        close(fd[1]);
        _exit(0);
    }
    close(fd[1]);                                // parent: the reader closes its write end
    char buf[64] = {};
    ssize_t n = read(fd[0], buf, sizeof buf);    // blocks until data or end of file
    close(fd[0]);
    wait(nullptr);
    printf("parent read %zd bytes: %s\n", n, buf);   // parent read 13 bytes: report ready
}
```

| step | kernel pipe buffer | parent | child |
|---|---|---|---|
| `pipe` | empty | has both ends | - |
| `fork` | empty | both ends | both ends (copies) |
| closes | empty | read end only | write end only |
| child `write` | "report ready\0" | blocked in `read` | writes 13 bytes |
| parent `read` | empty | gets 13 bytes | exits |

Closing unused ends matters: a reader only sees end of file when **every** write end is closed, including its own copy.

#### Shared memory with a lock

```cpp
#include <semaphore.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>

struct Shared { sem_t lock; long counter; };

int main() {
    auto* s = static_cast<Shared*>(mmap(nullptr, sizeof(Shared), PROT_READ | PROT_WRITE,
                                        // survives fork, shared
                                        MAP_SHARED | MAP_ANONYMOUS, -1, 0));
    sem_init(&s->lock, /*pshared=*/1, 1);
    s->counter = 0;
    for (int p = 0; p < 4; ++p) {
        if (fork() == 0) {
            for (int i = 0; i < 100000; ++i) {
                sem_wait(&s->lock);
                ++s->counter;                    // the critical section
                sem_post(&s->lock);
            }
            _exit(0);
        }
    }
    for (int p = 0; p < 4; ++p) wait(nullptr);
    printf("counter = %ld\n", s->counter);       // 400000; without the semaphore, usually less
    munmap(s, sizeof(Shared));
}
```

#### Python

```python
from multiprocessing import Pipe, Process, Queue


def worker(conn, q):
    conn.send({"status": "ok"})        # a pipe carrying pickled objects
    q.put(42)                          # a queue built on pipes and locks
    conn.close()


if __name__ == "__main__":
    parent_end, child_end = Pipe()
    q = Queue()
    p = Process(target=worker, args=(child_end, q))
    p.start()
    print(parent_end.recv(), q.get())  # {'status': 'ok'} 42
    p.join()
```

#### Signals are not a data channel

A signal interrupts the target at an arbitrary point to run a handler, and several identical pending signals collapse into one. Use them for control (`SIGTERM`: please shut down; `SIGHUP`: reload configuration; `SIGCHLD`: a child changed state) and send data through one of the other mechanisms.

#### Pitfalls

- Forgetting to close unused pipe ends, so readers never see end of file and hang.
- Shared memory without synchronization: races and torn reads.
- Assuming a stream socket or pipe preserves message boundaries; frame your messages (length prefix or delimiter).
- Doing real work inside signal handlers; only async-signal-safe functions are allowed there.

Connects to: fork, exec and wait, ports and sockets, semaphores, producer-consumer problem, copy-on-write and memory-mapped files.

### questions
Q: What IPC mechanisms does Unix provide?
A: Pipes and named pipes for byte streams, message queues for discrete messages, shared memory for directly shared pages, Unix domain and network sockets for bidirectional communication, signals for asynchronous notifications, and memory-mapped files. Semaphores are commonly used alongside them for synchronization.

Q: Why is shared memory the fastest IPC mechanism?
A: After the region is set up, processes read and write the same physical pages directly, so data is not copied into and out of the kernel as with pipes or sockets, and no system call is needed per message. The cost is that the processes must synchronize access themselves.

Q: What is the difference between an anonymous pipe and a named pipe?
A: An anonymous pipe exists only as a pair of file descriptors, so it can only be shared by related processes that inherit them through fork. A named pipe, or FIFO, has a name in the file system, so unrelated processes can open it by path.

Q: When would you choose sockets over other IPC methods?
A: When communication must be bidirectional, may later cross machines, or involves many clients connecting to a server. Unix domain sockets give the same interface locally with lower overhead and can even pass file descriptors between processes.

Q: Why should a process close the unused ends of a pipe?
A: A reader sees end of file only when every write end of the pipe is closed. If the reader keeps its own copy of the write end open, it will block forever waiting for data. Closing unused ends also lets writers get an error when no reader remains.
