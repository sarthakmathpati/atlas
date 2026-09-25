---
topic: os.fundamentals
name: "OS fundamentals"
subject: os
order: 1
prereqs: []
---

## os.fundamentals.what-an-os-does
name: "What an OS does"
importance: must
scope: "resource manager, abstraction, protection"

### simple
An operating system is the software that shares a computer's hardware among programs and gives them simple tools to use it. It works like the management of an apartment building: it hands out rooms, keeps water and power flowing fairly, and stops tenants from walking into each other's flats. Programs ask the OS for what they need instead of touching the hardware directly.

### interview
- **Resource manager**: allocates CPU time (scheduling), memory, storage and devices among competing programs, aiming for efficiency and fairness.
- **Abstraction** (an "extended machine"): turns messy hardware into clean concepts: **processes** instead of raw CPUs, **virtual memory** instead of physical RAM, **files** instead of disk blocks, **sockets** instead of network cards.
- **Protection and isolation**: each process gets its own address space, the kernel checks permissions, and hardware privilege modes stop programs from touching the kernel or each other.
- The **kernel** is the always-resident core that runs in privileged mode; the wider OS also includes system libraries, the shell and utilities.
- Programs reach OS services through **system calls**; the kernel reaches programs through **interrupts, signals and scheduling**.
- Goals often conflict: throughput vs responsiveness, fairness vs priority, security vs convenience.

### deep
#### Intuition

Without an OS, every program would need its own disk driver, would have to agree with every other program about which memory it may use, and could crash the whole machine with one bad pointer. The OS takes those shared problems off every program's plate. It plays three roles at once: referee (who gets what), translator (simple abstractions over hardware) and guard (nobody breaks anyone else).

#### The three roles

| role | what it provides | examples |
|---|---|---|
| resource manager | fair, efficient sharing | CPU scheduler, memory allocator, disk scheduler, network queues |
| abstraction | simple models of hardware | process, thread, virtual address space, file, socket, pipe |
| protection | isolation and access control | separate address spaces, user and kernel mode, file permissions, users and groups |

Other services fall under these: inter-process communication, error handling (a crashed program does not take down the others), accounting (CPU time, memory used) and security (authentication, auditing).

#### Worked example: what happens when you run a command

Typing `cat notes.txt` in a shell involves the OS at every step:

| step | OS role | mechanism |
|---|---|---|
| shell creates a new process | resource manager | `fork` system call, new process control block |
| the new process loads `/bin/cat` | abstraction | `exec` maps the program file into a fresh virtual address space |
| `cat` gets CPU time | resource manager | the scheduler puts it on the ready queue |
| `cat` opens the file | protection | the kernel checks permissions for the user |
| `cat` reads bytes | abstraction | the file system maps file offsets to disk blocks; the driver talks to the disk; the page cache may answer from memory |
| `cat` writes to the terminal | abstraction | `write` to file descriptor 1 goes to the terminal driver |
| `cat` exits | resource manager | memory and descriptors are freed; the shell's `wait` returns |

#### Code: the same abstractions from a program

```cpp
#include <fcntl.h>
#include <unistd.h>

int main() {
    int fd = open("notes.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);  // a file, not disk blocks
    if (fd < 0) { perror("open"); return 1; }
    const char msg[] = "hello kernel\n";
    ssize_t n = write(fd, msg, sizeof msg - 1);   // the kernel finds space, caches, writes later
    close(fd);
    printf("pid %d wrote %zd bytes\n", getpid(), n);   // a process id, not a CPU
}
```

Neither program knows which disk sector holds the file, which physical memory holds its variables, or which CPU core it runs on. That ignorance is the abstraction working.

#### Kernel vs OS

The **kernel** is the part that runs in privileged mode and is always in memory: scheduler, memory manager, file systems, drivers, network stack (in a monolithic design). The **operating system** in the broader sense adds the C library, the shell, system daemons and utilities. In interviews, "the OS does X" usually means the kernel does X.

#### Design tensions

- **Throughput vs latency**: batching work is efficient but makes users wait.
- **Fairness vs priority**: giving everyone equal time can starve urgent work, and vice versa.
- **Protection vs speed**: every check and every switch into the kernel costs time.
- **Generality vs simplicity**: supporting every device and workload makes kernels large.

Connects to: kernel mode vs user mode, system calls, processes, virtual memory, file concepts.

### questions
Q: What are the main functions of an operating system?
A: It manages resources such as CPU time, memory, storage and devices among programs; it provides abstractions like processes, virtual memory, files and sockets so programs do not deal with raw hardware; and it enforces protection so programs cannot interfere with each other or the kernel.

Q: What is the difference between the kernel and the operating system?
A: The kernel is the core that runs in privileged mode and is always resident: scheduling, memory management, file systems and drivers. The operating system in the broader sense also includes user-space parts such as system libraries, the shell and utilities.

Q: Why do programs use the OS instead of accessing hardware directly?
A: Direct access would let any program corrupt others or crash the machine, and every program would need its own drivers. The OS provides safe, shared, portable abstractions and enforces isolation, while hardware privilege levels make direct access impossible for ordinary programs.

Q: Give an example of an abstraction the OS provides and what it hides.
A: A file hides disk blocks, sectors, caching and the device driver: a program reads bytes at an offset and the file system maps them to blocks. Virtual memory similarly hides physical addresses and whether a page is in RAM or on disk.

Q: What conflicting goals must an OS balance?
A: Throughput against responsiveness, fairness against priority, protection against performance, and generality against simplicity. For example, batching improves throughput but increases latency, and extra permission checks cost time on every operation.

## os.fundamentals.kernel-mode-vs-user-mode
name: "Kernel mode vs user mode"
importance: must
prereqs: [os.fundamentals.what-an-os-does]
scope: "privilege levels, why the split exists"

### simple
The CPU runs code in two modes: a powerful kernel mode for the operating system and a restricted user mode for ordinary programs. It is like a bank where customers stay on their side of the counter and only staff can open the vault. When a program needs something only the kernel may do, it asks at the counter instead of climbing over it.

### interview
- The CPU has a **mode bit** or privilege level. **Kernel (supervisor) mode** can execute every instruction and touch all memory; **user mode** cannot run **privileged instructions** (I/O port access, loading page tables, disabling interrupts, halting the CPU).
- x86 has rings 0 to 3 (Linux and Windows use ring 0 for the kernel and ring 3 for programs); ARM has exception levels EL0 (user), EL1 (kernel), EL2 (hypervisor), EL3 (secure monitor).
- Entering kernel mode happens only through controlled gates: **system calls** (a trap instruction such as `syscall` or `svc`), **interrupts** from devices, and **exceptions** such as page faults. The CPU jumps to a kernel-chosen entry point, so programs cannot jump into arbitrary kernel code.
- Why the split: **protection** (a buggy or malicious program cannot corrupt the kernel or other processes), **stability** (a crash kills one process, not the machine) and **security** (the kernel enforces permissions).
- A **mode switch** is not a **context switch**: a system call changes privilege but usually stays in the same process. Mode switches are cheap relative to context switches but still cost enough (tens to hundreds of nanoseconds, more with side-channel mitigations) that hot paths avoid them.
- Illegal privileged operations in user mode raise an exception; the kernel typically kills the process (for example with `SIGSEGV` or `SIGILL`).

### deep
#### Intuition

If any program could reprogram the memory management unit, it could read every other program's passwords. If any program could disable interrupts, it could hog the CPU forever. The hardware therefore refuses certain instructions unless the CPU is in a special mode, and the only way into that mode is through doors the kernel controls.

#### What differs between the modes

| | user mode | kernel mode |
|---|---|---|
| instructions | ordinary ones only | all, including privileged ones |
| memory | the process's own user pages | kernel memory and, with care, user memory |
| devices | none directly | full access through drivers |
| on an illegal action | CPU exception, process usually killed | kernel bug: an oops or a panic |
| who runs here | applications, libraries, most daemons | kernel, drivers (in monolithic kernels) |

Page table entries carry a user or supervisor bit, so kernel memory is mapped in each process but inaccessible from user mode.

#### Worked example: one `read` call

| step | mode | what happens |
|---|---|---|
| 1 | user | the program calls `read(fd, buf, 100)` in the C library |
| 2 | user | the wrapper puts the syscall number and arguments in registers and runs `syscall` |
| 3 | switch | the CPU raises its privilege, saves the user instruction pointer and jumps to the kernel entry |
| 4 | kernel | the kernel validates `fd` and that `buf` is user memory, then reads from the page cache or disk |
| 5 | kernel | it copies the bytes into `buf` (a checked copy to user memory) |
| 6 | switch | `sysret` lowers the privilege and returns to the saved instruction |
| 7 | user | the wrapper returns the byte count (or -1 and sets `errno`) |

If the data must come from disk, step 4 blocks: the kernel puts the process to sleep and runs something else, which is a context switch on top of the mode switch.

#### Code: feeling the cost

```cpp
#include <unistd.h>
#include <sys/syscall.h>

int main() {
    const int N = 1'000'000;
    auto t0 = chrono::steady_clock::now();
    long sum = 0;
    // a real trap into the kernel each time
    for (int i = 0; i < N; ++i) sum += syscall(SYS_getpid);
    auto t1 = chrono::steady_clock::now();
    for (int i = 0; i < N; ++i) sum += i & 1;                 // plain user-mode work
    auto t2 = chrono::steady_clock::now();
    auto ns = [](auto a, auto b) { return chrono::duration<double, nano>(b - a).count(); };
    printf("syscall: %.0f ns each, plain loop: %.2f ns each (sum %ld)\n",
           ns(t0, t1) / N, ns(t1, t2) / N, sum);
}
```

On a typical Linux machine the system call costs somewhere between tens and a few hundred nanoseconds, while the plain loop costs a few nanoseconds at most per iteration (one test run here measured 120 ns against 2 ns). That gap is why buffered I/O batches many small writes into one `write` call, and why Linux serves `clock_gettime` through the vDSO, a small piece of kernel-provided code mapped into user space that needs no trap at all.

#### Pitfalls and nuances

- "Running as root" is not kernel mode: root is a user-space permission level checked by the kernel; the code still runs in user mode.
- Drivers in a monolithic kernel run in kernel mode, which is why a buggy driver can crash the machine.
- Hypervisors add another, more privileged level (VMX root mode on x86, EL2 on ARM) so guest kernels can run in their own kernel mode.

Connects to: system calls, interrupts, traps and exceptions, context switching, kernel architectures.

### questions
Q: Why do CPUs have separate kernel and user modes?
A: To protect the system. In user mode, programs cannot execute privileged instructions such as accessing devices, changing page tables or disabling interrupts, so a buggy or malicious program cannot corrupt the kernel or other processes. Only the kernel, entered through controlled gates, can do those things.

Q: How does a program switch from user mode to kernel mode?
A: Only through defined entry points: a system call instruction such as syscall or svc, a hardware interrupt, or an exception such as a page fault. The CPU saves the user state, raises the privilege level and jumps to an address the kernel configured, so user code can never jump into arbitrary kernel code.

Q: What is the difference between a mode switch and a context switch?
A: A mode switch changes the privilege level, for example during a system call, while staying in the same process. A context switch changes which process or thread runs, saving one's registers and loading another's, and is considerably more expensive. A system call may lead to a context switch if it blocks.

Q: What happens if a user program executes a privileged instruction?
A: The CPU refuses and raises an exception, such as a general protection fault, which transfers control to the kernel. The kernel usually terminates the process by sending it a signal like SIGSEGV or SIGILL.

Q: Is a program running as root in kernel mode?
A: No. Root is a user identity with more permissions, which the kernel checks when handling system calls. The program's code still runs in user mode and must still ask the kernel through system calls.

## os.fundamentals.system-calls
name: "System calls"
importance: must
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "how programs ask the kernel for services, examples"

### simple
A system call is how a program asks the operating system to do something it is not allowed to do itself, like reading a file or starting another program. It is like a library's request slip: you write down what you want, hand it over the desk, and the librarian fetches it from the closed stacks. The program waits for the answer and then carries on.

### interview
- A **system call** is the programming interface between a process and the kernel: a controlled entry into kernel mode to request a service.
- Categories: **process control** (`fork`, `exec`, `exit`, `wait`), **file management** (`open`, `read`, `write`, `close`, `lseek`), **device management** (`ioctl`), **information** (`getpid`, `time`), **communication** (`pipe`, `socket`, `mmap`, `shmget`), **protection** (`chmod`, `setuid`).
- Mechanism on Linux x86-64: the C library wrapper puts the **syscall number** in `rax` and arguments in registers, executes `syscall`; the kernel looks up the handler in the **system call table**, validates arguments, does the work and returns a value (a negative error becomes `-1` plus `errno` in C).
- Programs rarely call them directly: `printf`, `fopen`, `std::ofstream` and `std::thread` are library functions that make system calls underneath. **POSIX** standardizes the Unix-style interface; Windows exposes the Win32 API over its native calls.
- Each call has a fixed cost (the mode switch, checks, cache effects), so **buffering** batches work: `printf` fills a buffer and calls `write` once per few kilobytes.
- `strace` (Linux) and `dtruss` (macOS) list the system calls a program makes; a great debugging tool.

### deep
#### Intuition

Programs live in a sandbox. Anything that affects the outside world (files, the network, other processes, the screen, the clock) goes through the kernel. The system call interface is the list of everything a program is allowed to ask for, and the trap into the kernel is how it asks.

#### How a call travels (Linux, x86-64)

1. Your code calls `write(fd, buf, n)`, a normal function in the C library.
2. The wrapper loads the call number for `write` (1 on x86-64) into `rax` and the arguments into `rdi`, `rsi`, `rdx` (then `r10`, `r8`, `r9`).
3. It executes `syscall`: the CPU switches to kernel mode and jumps to the kernel's entry point.
4. The kernel indexes the **system call table** with `rax`, runs the handler, which checks the file descriptor, checks that `buf` points into user memory and copies data safely.
5. The result goes back in `rax`, the CPU returns to user mode, and the wrapper converts a negative result into `-1` with `errno` set.

#### Worked example: tracing a small program

```cpp
#include <fcntl.h>
#include <unistd.h>

int main() {
    int fd = open("notes.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }
    const char msg[] = "hello kernel\n";
    ssize_t n = write(fd, msg, sizeof msg - 1);
    close(fd);
    printf("pid %d wrote %zd bytes\n", getpid(), n);
}
```

Running it under `strace -e trace=openat,write,close,getpid` shows (after the loader's own calls):

```text
openat(AT_FDCWD, "notes.txt", O_WRONLY|O_CREAT|O_TRUNC, 0644) = 3
write(3, "hello kernel\n", 13)          = 13
close(3)                                = 0
getpid()                                = 6720
write(1, "pid 6720 wrote 13 bytes\n", 24) = 24
```

Things to notice:

| observation | lesson |
|---|---|
| `open` appears as `openat` | library names and kernel calls differ; the wrapper chose the modern call |
| the file got descriptor 3 | 0, 1 and 2 are standard input, output and error |
| `printf` became one `write(1, …)` | the C library formats in user space and makes one call |

Buffering matters: a loop that `printf`s 1,000 short lines to a file produced only **3** `write` calls with glibc, because stdio flushes about 4 KB at a time. Writing each line with `write` directly would make 1,000 calls.

#### Common system calls by category

| category | Unix | what it does |
|---|---|---|
| process | `fork`, `execve`, `wait4`, `exit_group`, `kill` | create, replace, reap and end processes; send signals |
| file | `openat`, `read`, `write`, `close`, `lseek`, `stat` | open files and move bytes |
| memory | `mmap`, `munmap`, `brk` | map memory and files into the address space |
| communication | `pipe`, `socket`, `connect`, `sendmsg` | talk to other processes and machines |
| time and info | `clock_gettime`, `getpid`, `uname` | ask about the system |
| protection | `chmod`, `chown`, `setuid` | change permissions and identity |

#### Pitfalls

- Ignoring return values: `write` may write fewer bytes than asked, and any call can fail with `EINTR` when a signal arrives.
- Issuing one system call per byte or per line in hot loops; buffer instead.
- Assuming a library function is a system call (`malloc` usually is not; it calls `brk` or `mmap` only occasionally).

Connects to: kernel mode vs user mode, fork, exec and wait, buffering, caching and spooling, blocking vs non-blocking I/O.

### questions
Q: What is a system call?
A: A controlled request from a user program to the kernel for a service it cannot perform itself, such as reading a file, creating a process or sending network data. It works by executing a trap instruction that switches the CPU into kernel mode at a kernel-defined entry point.

Q: Walk through what happens during a system call on Linux.
A: The C library wrapper puts the system call number and arguments into registers and executes the syscall instruction. The CPU enters kernel mode and jumps to the kernel entry point, which looks up the handler in the system call table, validates the arguments, performs the work, and returns the result in a register before switching back to user mode.

Q: Name some system calls in each major category.
A: Process control: fork, exec, wait, exit. File management: open, read, write, close, lseek. Communication: pipe, socket, mmap. Information: getpid, clock_gettime. Protection: chmod, chown, setuid.

Q: Why does buffered I/O improve performance?
A: Each system call has a fixed overhead for the mode switch and argument checking. Libraries like stdio collect many small writes in a user-space buffer and hand them to the kernel in one write call, so thousands of printf calls may cost only a few system calls.

Q: How can you see which system calls a program makes?
A: On Linux, run it under strace, which prints every system call with its arguments and return value; strace -c gives a summary with counts and time. On macOS, dtruss serves a similar purpose.

## os.fundamentals.kernel-architectures
name: "Kernel architectures"
importance: important
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "monolithic, microkernel, hybrid"

### simple
Kernel architecture is about how much of the operating system runs in the powerful kernel mode. A monolithic kernel is one big office where every department works in the same room, which is fast but one fire affects everyone. A microkernel keeps only a tiny core in that room and puts other departments in separate buildings, which is safer but needs more phone calls between them.

### interview
- **Monolithic kernel**: the scheduler, memory manager, file systems, drivers and network stack all run in kernel space as one program and call each other directly. Fast, but a bug in any driver can crash the whole system. Examples: **Linux**, traditional Unix and the BSDs. Linux is modular (loadable kernel modules), but modules still run in kernel mode.
- **Microkernel**: the kernel keeps only the essentials (address spaces, threads and scheduling, **IPC**), and file systems, drivers and networking run as **user-space servers** that talk by messages. More robust and secure (a crashed driver can be restarted), but slower because of extra IPC and context switches. Examples: **MINIX 3, QNX, seL4** (formally verified) and the L4 family.
- **Hybrid**: a microkernel-inspired structure with many services kept in kernel space for speed. Examples: **Windows NT**, **macOS XNU** (Mach plus BSD).
- Other designs: **exokernels** (expose hardware almost directly to library OSes) and **unikernels** (one application compiled with the OS parts it needs into a single image).
- Interview angle: trade-off between performance and isolation; the famous Tanenbaum and Torvalds debate (1992) was about exactly this.

### deep
#### The trade-off

| | monolithic | microkernel | hybrid |
|---|---|---|---|
| in kernel mode | nearly everything | IPC, scheduling, basic memory | core plus many services |
| service calls | function calls | messages between processes | mostly function calls |
| speed | fastest | IPC overhead per request | close to monolithic |
| driver bug | can crash the kernel | kills one server, restartable | usually crashes the kernel |
| size of trusted code | millions of lines | tens of thousands of lines | large |
| examples | Linux, FreeBSD | QNX, MINIX 3, seL4 | Windows NT, macOS XNU |

#### Worked example: reading a file

In a **monolithic** kernel: `read` traps into the kernel, the virtual file system calls the ext4 code, which calls the block layer, which calls the disk driver, all inside one address space in kernel mode. One trap in, one return out.

In a **microkernel**:

| step | from | to |
|---|---|---|
| 1 | application | kernel: send a message to the file server |
| 2 | kernel | file server process (context switch) |
| 3 | file server | kernel: send a message to the disk driver |
| 4 | kernel | disk driver process (context switch) |
| 5 | disk driver | back through the kernel to the file server, then to the application |

Each arrow through the kernel costs a switch. Modern microkernels (L4, seL4) made IPC very fast, which narrowed but did not remove the gap.

#### Why Linux stays monolithic and still copes

Linux reduces monolithic risks with loadable modules (drivers loaded on demand), strict coding review, and more recently by allowing some functionality in user space (FUSE file systems, user-space drivers through VFIO, eBPF programs that are verified before running in the kernel). Meanwhile QNX powers cars and industrial systems where a crashing driver must not stop the whole machine, and seL4 is used where a mathematical proof of kernel correctness is worth the effort.

Connects to: kernel mode vs user mode, system calls, inter-process communication, virtual machines and hypervisors.

### questions
Q: What is the difference between a monolithic kernel and a microkernel?
A: A monolithic kernel runs almost all OS services, including drivers, file systems and networking, in kernel mode in one address space, so services call each other directly. A microkernel keeps only minimal mechanisms such as IPC, scheduling and address spaces in the kernel and runs other services as user-space processes that communicate by messages.

Q: What are the advantages and disadvantages of a microkernel?
A: Advantages: a smaller trusted code base, better fault isolation since a crashed driver or file system can be restarted, and easier verification and security. Disadvantage: every service request involves IPC and context switches, which adds overhead compared with direct function calls.

Q: Is Linux a monolithic kernel even though it supports loadable modules?
A: Yes. Loadable modules let code be added and removed at runtime, but once loaded they run in kernel mode in the same address space as the rest of the kernel, so a faulty module can still crash the system.

Q: What is a hybrid kernel? Give examples.
A: A kernel that follows a microkernel-like structure in its design but keeps many services, such as drivers and file systems, in kernel space for performance. Windows NT and macOS's XNU, which combines Mach with BSD components, are the usual examples.

## os.fundamentals.interrupts-traps-and-exceptions
name: "Interrupts, traps and exceptions"
importance: important
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "hardware vs software interrupts"

### simple
These are the three ways the CPU gets pulled away from what it is doing so the kernel can take over. An interrupt is a doorbell from a device, like a keyboard saying a key was pressed. A trap is a program deliberately ringing for service, and an exception is the CPU stopping because the program did something wrong, like dividing by zero.

### interview
- **Interrupt** (hardware, **asynchronous**): a device (timer, network card, disk, keyboard) signals the CPU through an interrupt controller. The CPU finishes the current instruction, saves state and runs the handler registered in the **interrupt vector table** (the IDT on x86). **Maskable** interrupts can be disabled briefly; **non-maskable** ones (NMI) cannot.
- **Trap** (software, **synchronous**, intentional): an instruction that deliberately enters the kernel, such as `syscall` for system calls or `int3` for debugger breakpoints.
- **Exception or fault** (synchronous, unintentional): the instruction cannot complete: divide by zero, invalid opcode, protection violation, **page fault**. Faults are restartable (after a page fault is fixed, the instruction runs again); aborts (machine check, double fault) are not.
- The **timer interrupt** is what makes preemptive multitasking possible: it gives the kernel control back periodically even if a program never makes a system call.
- Interrupt handlers must be short, so kernels split work into a quick **top half** and deferred **bottom half** (Linux softirqs, tasklets, workqueues).
- When the kernel cannot fix an exception, it becomes a **signal** to the process (`SIGSEGV`, `SIGFPE`, `SIGILL`). Terminology varies between textbooks: some call all three "interrupts", or call traps "software interrupts".

### deep
#### The three kinds

| | source | timing | intentional? | examples |
|---|---|---|---|---|
| interrupt | hardware device | asynchronous, between instructions | not by the program | timer tick, packet arrived, disk done |
| trap | the running instruction | synchronous | yes | `syscall`, breakpoint |
| exception or fault | the running instruction | synchronous | no | divide by zero, page fault, illegal instruction |

All three use the same machinery: the CPU saves the minimum state (instruction pointer, flags, stack pointer), switches to kernel mode, looks up a handler in a table indexed by a vector number and jumps to it. The handler saves the remaining registers, does its work and returns with an instruction like `iret`.

#### Worked example: a page fault that is handled

| step | what happens |
|---|---|
| 1 | a program reads address 0x7f00 in a page not in memory |
| 2 | the MMU finds the page table entry marked "not present" and raises a page fault |
| 3 | the CPU saves state and runs the kernel's page fault handler |
| 4 | the kernel sees the address is valid (part of a mapped file), starts a disk read and puts the process to sleep |
| 5 | later, the disk raises an **interrupt**: the read is done |
| 6 | the kernel updates the page table and marks the process ready |
| 7 | when scheduled, the faulting instruction **runs again** and succeeds |

If the address in step 4 was invalid (a null pointer), the kernel would send `SIGSEGV` instead, and by default the process dies with "Segmentation fault".

#### Code: exceptions becoming signals

```cpp
#include <signal.h>
#include <unistd.h>

void onSegv(int) {
    const char msg[] = "caught SIGSEGV: the kernel turned a page fault into a signal\n";
    write(STDOUT_FILENO, msg, sizeof msg - 1);   // write is async-signal-safe, printf is not
    _exit(1);
}

int main() {
    signal(SIGSEGV, onSegv);
    volatile int* p = nullptr;
    *p = 42;                                       // invalid address: fault -> kernel -> signal
}
```

#### Top and bottom halves

A network card may interrupt thousands of times per second. If each handler did all the protocol processing, other interrupts would wait and the system would stutter. The top half acknowledges the device and queues the work; the bottom half processes packets later with interrupts enabled. Under heavy load, Linux's NAPI switches the card to polling to avoid an "interrupt storm".

#### Why the timer interrupt matters

Without it, a program in an infinite loop that never makes a system call would keep the CPU forever. The timer fires periodically (or on demand in tickless kernels), the kernel regains control, and the scheduler can switch to another process. This is the difference between cooperative and preemptive multitasking.

Connects to: kernel mode vs user mode, system calls, virtual memory and demand paging, I/O methods, context switching.

### questions
Q: What is the difference between an interrupt, a trap and an exception?
A: An interrupt is an asynchronous signal from hardware, such as a timer or network card, unrelated to the current instruction. A trap is a synchronous, intentional transfer to the kernel caused by an instruction, such as a system call or breakpoint. An exception is a synchronous, unintended event caused by an instruction that cannot complete, such as division by zero or a page fault.

Q: What does the CPU do when an interrupt arrives?
A: It finishes the current instruction, saves the essential state such as the instruction pointer and flags, switches to kernel mode, and uses the interrupt number to look up the handler in the interrupt vector table. The handler services the device, and the CPU then resumes the interrupted code or schedules another process.

Q: Why is the timer interrupt essential for multitasking?
A: It returns control to the kernel at regular intervals even if the running program never makes a system call. That lets the scheduler preempt long-running processes and share the CPU fairly, which is what makes multitasking preemptive rather than cooperative.

Q: What is a page fault, and is it always an error?
A: A page fault is an exception raised when a program accesses a page whose page table entry is not present or not permitted. It is often normal: the kernel loads the page from disk or allocates it and re-runs the instruction. Only when the access is invalid does the kernel send the process a signal such as SIGSEGV.

Q: Why are interrupt handlers split into top and bottom halves?
A: Interrupt handlers run with some interrupts blocked and delay everything else, so they must be fast. The top half does the minimum, such as acknowledging the device and queueing work, and the bottom half does the heavier processing later with interrupts enabled.

## os.fundamentals.the-boot-process
name: "The boot process"
importance: advanced
scope: "firmware, bootloader, kernel initialization"

### simple
Booting is the chain of small programs that takes a computer from power-on to a running operating system. It is like opening a shop in the morning: a guard unlocks the building, a manager turns on the lights and systems, and only then do the staff open the doors to customers. Each stage is simple and prepares just enough for the next one.

### interview
- **Firmware** runs first from flash memory at the CPU's reset address: legacy **BIOS** or modern **UEFI**. It tests and initializes hardware (the power-on self-test) and finds a boot device.
- BIOS loads the 512-byte **Master Boot Record** from the first disk sector, whose tiny first-stage loader loads a larger second stage. UEFI instead reads a FAT-formatted **EFI System Partition** and runs a bootloader file from it directly; **Secure Boot** checks its signature first.
- The **bootloader** (GRUB, systemd-boot, Windows Boot Manager) loads the kernel image and an initial RAM disk (**initramfs**) into memory, passes a command line and jumps to the kernel.
- The **kernel** sets up memory management, interrupts and the scheduler, initializes drivers, uses the initramfs to find and mount the real root file system, then starts the first user process, **PID 1** (systemd or init).
- **PID 1** starts services, mounts remaining file systems and finally a login screen or shell. It is the ancestor of every user process and adopts orphans.

### deep
#### The chain

| stage | runs from | job | hands over to |
|---|---|---|---|
| firmware (BIOS or UEFI) | flash chip on the motherboard | power-on self-test, initialize RAM and devices, pick a boot device | the bootloader |
| bootloader | disk (MBR or EFI partition) | menu, load kernel and initramfs, pass parameters | the kernel |
| kernel | RAM | page tables, interrupts, scheduler, drivers, mount the root file system | PID 1 |
| init system (PID 1) | root file system | start services in dependency order, open logins | users |

#### Worked example: a Linux laptop with UEFI

1. Power on: the CPU starts executing UEFI firmware.
2. UEFI initializes memory and devices, then reads its boot entries and finds `\EFI\ubuntu\shimx64.efi` on the EFI System Partition.
3. Secure Boot verifies the signature, then the shim loads GRUB, which shows its menu.
4. GRUB loads `vmlinuz` (the compressed kernel) and `initrd.img`, and passes a command line such as `root=UUID=… quiet`.
5. The kernel decompresses itself, sets up paging, starts other CPU cores and probes devices.
6. It unpacks the initramfs and runs its `/init`, which loads the storage driver (and unlocks an encrypted disk if needed), mounts the real root and switches to it.
7. The kernel starts `/sbin/init` (systemd) as PID 1, which brings up networking, logging and the desktop login.

On x86 the CPU also moves from 16-bit real mode through 32-bit protected mode to 64-bit long mode during these steps; UEFI firmware already runs in protected or long mode.

Connects to: what an OS does, kernel mode vs user mode, zombie and orphan processes.

### questions
Q: What are the main stages of booting a computer?
A: Firmware (BIOS or UEFI) initializes and tests hardware and finds a boot device; a bootloader such as GRUB loads the kernel and an initial RAM disk; the kernel initializes memory management, interrupts and drivers and mounts the root file system; then it starts the first user process, which launches system services and logins.

Q: What is the difference between BIOS and UEFI booting?
A: BIOS loads the 512-byte master boot record from the first sector of the disk and runs its small loader, which chains to a bigger one. UEFI understands partitions and FAT file systems, runs a bootloader file from the EFI System Partition directly, supports large disks and can verify signatures with Secure Boot.

Q: What is the role of the initramfs?
A: It is a small temporary root file system loaded with the kernel. It contains the drivers and tools needed to find and mount the real root file system, such as storage drivers or decryption tools, after which the system switches to the real root.
