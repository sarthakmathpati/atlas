---
topic: os.io
name: "I/O and system internals"
subject: os
order: 9
prereqs: [os.processes]
---

## os.io.i-o-methods
name: "I/O methods"
importance: important
scope: "polling, interrupts, DMA"

### simple
There are three main ways for the CPU to deal with a device like a disk or network card. It can keep checking whether the device is ready (polling), let the device ring a bell when it is done (interrupts), or hand the whole transfer to a helper that moves the data and reports back at the end (DMA). It is like waiting for a delivery by watching the window, waiting for the doorbell, or asking a neighbour to take in the parcel.

### interview
- **Programmed I/O with polling**: the CPU repeatedly reads the device's **status register** until it is ready, then moves each word itself. Simple and lowest latency for very fast devices, but wastes CPU while waiting.
- **Interrupt-driven I/O**: the CPU starts the operation and does other work; the device raises an **interrupt** when done, and a handler moves the data. Efficient for slow or occasional events, but each interrupt costs a context save and handler run; at very high event rates this overhead dominates (**interrupt storms**).
- **DMA** (direct memory access): the CPU programs a DMA engine with a buffer address and length; the device transfers the whole block **directly to memory** and interrupts **once** at the end. Essential for disks, network cards and GPUs.
- Devices are controlled through registers reached by **port-mapped I/O** (special `in`/`out` instructions on x86) or **memory-mapped I/O** (device registers appear at physical addresses).
- Modern high-speed paths mix them: network drivers switch from interrupts to polling under load (Linux **NAPI**), and kernel-bypass frameworks (DPDK) and `io_uring` polling modes busy-poll for the lowest latency.
- DMA brings concerns of its own: cache coherence, pinned memory and the **IOMMU**, which restricts which memory a device may write.

### deep
#### Side by side

| | polling | interrupts | DMA |
|---|---|---|---|
| who moves the data | CPU | CPU (in the handler) | the DMA engine |
| CPU busy while waiting | yes | no | no |
| events per transfer | none | one per word or small chunk | one per block |
| best for | very fast devices, extreme low latency | keyboards, mice, slow devices | disks, network, GPUs |

#### Worked example: reading 1 MB

Suppose handling one interrupt costs 2 µs of CPU and the device delivers 4 bytes per transfer unit.

| method | CPU involvement for 1 MB |
|---|---|
| polling, byte by byte | CPU busy for the whole transfer, plus all the waiting in between |
| interrupt per 4-byte word | 262,144 interrupts × 2 µs ≈ 0.52 s of CPU |
| DMA, one interrupt per 4 KB page | 256 interrupts × 2 µs ≈ 0.5 ms of CPU |
| DMA, one interrupt for the whole 1 MB | a single interrupt |

DMA reduces CPU work by orders of magnitude, which is why every high-bandwidth device uses it.

#### Code: the polling pattern

A real driver would read hardware registers; this sketch simulates a device so the control flow is visible.

```cpp
struct FakeDevice {
    atomic<bool> ready{false};
    int data = 0;
    void start() {                                       // the device works on its own
        thread([this] {
            this_thread::sleep_for(chrono::milliseconds(5));
            data = 42;
            ready.store(true, memory_order_release);    // "status register: done"
        }).detach();
    }
};

int main() {
    FakeDevice dev;
    dev.start();
    long spins = 0;
    while (!dev.ready.load(memory_order_acquire)) ++spins;   // polling: the CPU does nothing useful
    cout << "got " << dev.data << " after " << (spins > 1000 ? "many" : "few") << " polls\n";
}
```

An interrupt-driven version would put the thread to sleep (for example on a condition variable) and let the "device" wake it, so the CPU could run other work for those 5 ms.

#### Choosing between polling and interrupts

| event rate | better choice | why |
|---|---|---|
| rare (keyboard) | interrupts | polling would waste almost all of its checks |
| moderate | interrupts with coalescing | batch several completions per interrupt |
| extreme (10 to 100 Gbit networking, NVMe) | polling on dedicated cores | per-interrupt overhead exceeds the work per event |

Connects to: interrupts, traps and exceptions, buffering, caching and spooling, blocking vs non-blocking I/O, CPU and memory hierarchy.

### questions
Q: What are the three main I/O methods?
A: Programmed I/O with polling, where the CPU repeatedly checks the device status and transfers data itself; interrupt-driven I/O, where the device signals the CPU with an interrupt when it is ready; and DMA, where a DMA engine transfers whole blocks between the device and memory and interrupts once at the end.

Q: Why is DMA important?
A: Without DMA the CPU must move every word of data itself and handle an interrupt for each small transfer. DMA lets the device write large blocks directly into memory while the CPU does other work, with a single interrupt per block, which is essential for disks, network cards and GPUs.

Q: When is polling better than interrupts?
A: When events arrive so often, or latency must be so low, that the cost of taking an interrupt for each event exceeds the cost of checking. High-speed network drivers switch to polling under heavy load, and trading systems dedicate cores to busy-polling network queues.

Q: What is the difference between port-mapped and memory-mapped I/O?
A: With port-mapped I/O, device registers live in a separate I/O address space accessed with special instructions such as in and out on x86. With memory-mapped I/O, device registers are assigned physical memory addresses, and ordinary load and store instructions access them.

## os.io.buffering-caching-and-spooling
name: "Buffering, caching and spooling"
importance: important
prereqs: [os.io.i-o-methods]
scope: "Buffering, caching and spooling"

### simple
These are three ways the operating system smooths out the differences between fast programs and slow devices. A buffer is a waiting area for data in transit, a cache is a nearby copy of data you are likely to need again, and a spool is a queue of whole jobs for a device that can only do one at a time. Think of a mailbox, a fridge and a print queue.

### interview
- **Buffering**: memory that holds data **in transit** between two parties. It handles **speed mismatch** (a fast producer and a slow device), **transfer-size mismatch** (network packets vs application messages) and **copy semantics** (the data written is what was in the buffer when `write` was called).
- **Double buffering**: fill one buffer while the other is being written out, then swap, so neither side waits; **circular buffers** generalize this.
- **Caching**: keeping a **copy** of data in faster storage for reuse. The Linux **page cache** keeps file pages in RAM, so a second read of a file comes from memory. Write policies: **write-through** (write to the cache and the device together) or **write-back** (write later; faster, but a crash can lose data unless `fsync` is used).
- The difference: a buffer may hold the **only** copy of data on its way somewhere; a cache holds a **duplicate** of data that lives elsewhere.
- **Spooling**: a buffer for a device that cannot interleave streams, such as a **printer**. Each job is written to a spool file on disk, and a daemon feeds jobs to the device one at a time.
- Application level: stdio's user-space buffers (flush on newline for terminals, when full for files), and `fsync` to force data from the page cache to disk.

### deep
#### Three ideas side by side

| | buffering | caching | spooling |
|---|---|---|---|
| holds | data in transit | copies of data kept for reuse | whole jobs waiting for a device |
| the only copy? | possibly | no, the original lives elsewhere | yes, until printed |
| solves | speed, size and timing mismatch | slow repeated access | a device that serves one job at a time |
| example | socket send buffer, stdio buffer | page cache, CPU caches | print queue |

#### Worked example: write-back caching and fsync

| step | application | page cache | disk |
|---|---|---|---|
| 1 | `write("balance=100")` returns | dirty page with the new data | old data |
| 2 | continues immediately | dirty | old |
| 3 | (power fails here) | lost | old: the update is gone |
| 3' | calls `fsync` | flushed | new data, durable |

`write` returning means "the kernel has it", not "it is on disk". Databases call `fsync` (or use `O_DIRECT` with their own caching) at commit time for this reason.

#### Code: double buffering

```cpp
int main() {
    array<vector<int>, 2> buffers;
    int filling = 0;
    mutex m;
    condition_variable cv;
    bool readyToWrite = false, done = false;
    long long written = 0;

    thread writer([&] {                                  // the slow "device"
        unique_lock<mutex> lk(m);
        while (true) {
            cv.wait(lk, [&] { return readyToWrite || done; });
            if (!readyToWrite && done) break;
            vector<int> out = std::move(buffers[1 - filling]);   // take the full buffer
            buffers[1 - filling].clear();                         // hand back an empty one
            readyToWrite = false;
            cv.notify_all();
            lk.unlock();
            for (int x : out) written += x;  // "write to disk" without holding the lock
            lk.lock();
        }
    });

    for (int i = 1; i <= 10000; ++i) {                    // the fast producer
        buffers[filling].push_back(i);
        if (buffers[filling].size() == 1000) {            // this buffer is full: swap
            unique_lock<mutex> lk(m);
            cv.wait(lk, [&] { return !readyToWrite; });   // the previous full buffer was taken
            filling = 1 - filling;
            readyToWrite = true;
            cv.notify_all();
        }
    }
    {
        unique_lock<mutex> lk(m);
        cv.wait(lk, [&] { return !readyToWrite; });
        done = true;
        cv.notify_all();
    }
    writer.join();
    cout << written << "\n";                              // 50005000
}
```

The producer keeps filling one buffer while the writer drains the other, so neither waits for the other's full job.

#### Code: a tiny spooler

```python
from collections import deque


class Spooler:
    """Whole jobs queue up; the device prints them one at a time, never interleaved."""

    def __init__(self):
        self.queue = deque()

    def submit(self, user, pages):
        self.queue.append((user, pages))

    def run(self):
        while self.queue:
            user, pages = self.queue.popleft()
            print(f"printing {pages} pages for {user}")


s = Spooler()
s.submit("asha", 3)
s.submit("ben", 2)
s.run()
```

Without spooling, two programs writing to a printer at once would produce interleaved pages; with it, each job prints whole.

Connects to: I/O methods, system calls, caching, producer-consumer problem, journaling file systems.

### questions
Q: What is the difference between a buffer and a cache?
A: A buffer holds data temporarily while it moves between a producer and a consumer, and may hold the only copy of that data. A cache holds a copy of data that also lives elsewhere, kept in faster storage so repeated accesses are quicker.

Q: What is double buffering and why is it useful?
A: Two buffers are used alternately: while one is being filled by the producer, the other is being emptied by the consumer, and then they swap. The producer and consumer can work in parallel instead of waiting for each other.

Q: What is spooling?
A: A technique for devices that can serve only one job at a time, such as printers. Each job's output is written in full to a spool area on disk, and a daemon sends jobs to the device one after another, so outputs from different programs never interleave.

Q: What is the difference between write-through and write-back caching?
A: Write-through updates the cache and the underlying storage at the same time, which is safe but slower. Write-back updates only the cache and writes to storage later, which is faster but can lose recent writes on a crash unless the data is flushed, for example with fsync.

Q: Does a successful write system call mean the data is on disk?
A: No. It usually means the data was copied into the kernel's page cache and will be written back later. To make it durable, the application must call fsync or fdatasync, or open the file with options that force synchronous writes.

## os.io.blocking-vs-non-blocking-i-o
name: "Blocking vs non-blocking I/O"
importance: important
scope: "Blocking vs non-blocking I/O"

### simple
With blocking I/O, a program asks for data and waits, doing nothing, until it arrives. With non-blocking I/O, the program asks and immediately hears back either the data or "not ready yet", so it can do other work and try again later. It is the difference between waiting at the counter for your coffee and taking a buzzer that tells you when it is ready.

### interview
- **Blocking**: `read` on an empty socket puts the thread to sleep until data arrives. Simple code, but one thread per concurrent connection, which costs memory and context switches at scale.
- **Non-blocking** (`O_NONBLOCK`): the call returns immediately; if nothing is ready it fails with **`EAGAIN`/`EWOULDBLOCK`**. The program must retry later, usually after a readiness notification from **select, poll or epoll**.
- **Synchronous vs asynchronous**: non-blocking I/O is still synchronous (you perform the read when data is ready). **Asynchronous** I/O submits a request and is told when it has **completed** (POSIX AIO, Linux **io_uring**, Windows IOCP).
- Four models: blocking, non-blocking with busy polling (wasteful), **I/O multiplexing** (readiness events, then non-blocking calls: the event-loop model of nginx, Node.js, Redis), and truly asynchronous completion.
- Regular files are always "ready" on Linux, so non-blocking flags do not help disk reads; that is one reason for io_uring and thread pools for file I/O.
- Language runtimes hide this: Python `asyncio`, JavaScript promises, Go goroutines and Java virtual threads let you write blocking-looking code on top of non-blocking I/O.

### deep
#### The four models

| model | the call | waiting | example |
|---|---|---|---|
| blocking | returns when data is ready | the thread sleeps | classic `read` on a socket |
| non-blocking | returns at once, maybe `EAGAIN` | the program retries | `O_NONBLOCK` sockets |
| multiplexing | wait for readiness on many descriptors, then read | one thread waits on all | `epoll`, `select` |
| asynchronous | submit, then get a completion event | nothing blocks | `io_uring`, IOCP |

#### Code: EAGAIN in action

```cpp
#include <fcntl.h>
#include <unistd.h>

int main() {
    int fd[2];
    if (pipe(fd) < 0) return 1;
    fcntl(fd[0], F_SETFL, fcntl(fd[0], F_GETFL) | O_NONBLOCK);   // make the read end non-blocking

    char buf[16];
    ssize_t n = read(fd[0], buf, sizeof buf);                      // nothing written yet
    if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK))
        cout << "not ready yet: do something else\n";

    if (write(fd[1], "ping", 4) != 4) return 1;
    n = read(fd[0], buf, sizeof buf);                              // now data is there
    cout << "read " << n << " bytes: " << string(buf, n) << "\n";  // read 4 bytes: ping
}
```

#### Worked example: 10,000 idle connections

| design | threads | memory for stacks (8 MB virtual each) | who waits |
|---|---|---|---|
| blocking, thread per connection | 10,000 | 80 GB of address space reserved | 10,000 sleeping threads |
| non-blocking + epoll event loop | 1 (or one per core) | a few MB | one `epoll_wait` call |

Most connections are idle most of the time. The event loop pays only for connections that actually have data, which is how servers handle the "C10K" problem and beyond.

#### Asynchronous code that reads like blocking code

```python
import asyncio


async def fetch(name, delay):
    await asyncio.sleep(delay)      # yields to the event loop instead of blocking the thread
    return name


async def main():
    results = await asyncio.gather(fetch("a", 0.2), fetch("b", 0.2), fetch("c", 0.2))
    print(results)                  # ['a', 'b', 'c'] after about 0.2 s, not 0.6 s


asyncio.run(main())
```

#### Pitfalls

- Forgetting to handle partial reads and writes: non-blocking `write` may accept only part of the buffer.
- Calling a blocking function inside an event loop, which stalls every connection that loop serves.
- Busy-looping on `EAGAIN` without waiting for readiness, which burns a core.

Connects to: I/O multiplexing, user-level vs kernel-level threads, system calls, context switching.

### questions
Q: What is the difference between blocking and non-blocking I/O?
A: A blocking call suspends the calling thread until the operation can complete, for example until data arrives. A non-blocking call returns immediately; if the operation cannot proceed yet it fails with EAGAIN or EWOULDBLOCK, and the program can do other work and retry later.

Q: Is non-blocking I/O the same as asynchronous I/O?
A: No. Non-blocking I/O is still synchronous: the program is told the operation is not ready and must perform it itself later, usually after a readiness notification. Asynchronous I/O submits the whole operation to the kernel, which completes it in the background and notifies the program when it is done, as with io_uring or IOCP.

Q: Why do high-performance servers use non-blocking I/O with an event loop?
A: With blocking I/O each connection needs its own thread, which costs memory and context switches when there are thousands of mostly idle connections. Non-blocking sockets plus a readiness mechanism like epoll let one thread per core serve many thousands of connections, handling only those that are ready.

Q: What happens if you call a blocking function inside an event loop?
A: The single thread running the loop stops until the call returns, so every other connection or task handled by that loop is stalled. Blocking work must be made asynchronous or moved to a separate thread pool.

## os.io.i-o-multiplexing
name: "I/O multiplexing"
importance: advanced
prereqs: [os.io.blocking-vs-non-blocking-i-o]
scope: "select, poll, epoll"

### simple
I/O multiplexing lets one thread watch many connections at once and act only on the ones that are ready. It is like a waiter responsible for many tables who looks up when any customer raises a hand, instead of standing at one table waiting for it to order. The operating system tells the program which connections have something to do.

### interview
- **select**: pass bitmaps (`fd_set`) of descriptors to watch; the kernel returns which are ready. Limited to **FD_SETSIZE (1024)** descriptors, and both the kernel and the program scan every descriptor on every call: **O(n)**.
- **poll**: an array of `pollfd` structures instead of bitmaps: no fixed limit, but still O(n) per call and the whole array is copied each time.
- **epoll** (Linux): register descriptors once with `epoll_ctl`; `epoll_wait` returns **only the ready ones**, so the cost is proportional to activity, not to the number watched. The basis of nginx, Redis, Node.js (libuv) and Netty on Linux.
- **Level-triggered** (default): reports a descriptor as long as it is ready. **Edge-triggered** (`EPOLLET`): reports only when readiness changes, so you must read until `EAGAIN` or you may never be told again.
- Equivalents: **kqueue** (BSD, macOS), **IOCP** (Windows, completion-based), **io_uring** (Linux, completion-based and also covers files).
- Always use non-blocking descriptors with multiplexing, since a descriptor reported ready can still block (for example another thread consumed the data).

### deep
#### Code: epoll watching two pipes

```cpp
#include <sys/epoll.h>
#include <unistd.h>

int main() {
    int a[2], b[2];
    if (pipe(a) < 0 || pipe(b) < 0) return 1;
    int ep = epoll_create1(0);
    for (int fd : {a[0], b[0]}) {
        epoll_event ev{};
        ev.events = EPOLLIN;                         // tell me when there is data to read
        ev.data.fd = fd;
        epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);       // register once
    }
    if (write(b[1], "hello", 5) != 5) return 1;      // only pipe b has data

    epoll_event ready[8];
    int n = epoll_wait(ep, ready, 8, 1000);          // returns only ready descriptors
    for (int i = 0; i < n; ++i) {
        char buf[16];
        ssize_t got = read(ready[i].data.fd, buf, sizeof buf);
        const char* name = ready[i].data.fd == b[0] ? "pipe b" : "pipe a";
        cout << name << ": " << string(buf, got) << "\n";
    }
    cout << n << " of 2 ready\n";                    // pipe b: hello / 1 of 2 ready
    close(ep);
}
```

#### Why epoll scales

| | select | poll | epoll |
|---|---|---|---|
| descriptor limit | 1024 | none | none |
| per-call cost | O(watched) | O(watched) | O(ready) |
| registration | every call | every call | once |

With 10,000 connections of which 10 are active, select and poll inspect all 10,000 on every call, while epoll hands back the 10.

Connects to: blocking vs non-blocking I/O, real-time delivery, sockets, event-driven architecture.

### questions
Q: What is the difference between select, poll and epoll?
A: select and poll both take the full set of descriptors on every call and scan them all, so their cost grows with the number watched; select is also limited to 1024 descriptors. epoll registers descriptors once and returns only the ready ones, so its cost grows with activity, which scales to many thousands of connections.

Q: What is the difference between level-triggered and edge-triggered epoll?
A: Level-triggered mode keeps reporting a descriptor as long as it is ready, for example while unread data remains. Edge-triggered mode reports only when readiness changes, so the program must read or write until EAGAIN each time or it may miss data.

Q: Why should descriptors be non-blocking when used with epoll?
A: A readiness notification is only a hint: by the time the program reads, another thread may have consumed the data, or a write may only fit partially. With blocking descriptors, such a call would stall the whole event loop; non-blocking ones return EAGAIN instead.

## os.io.linux-essentials-for-interviews
name: "Linux essentials for interviews"
importance: advanced
scope: "/proc, signals, process commands"

### simple
A few Linux tools and ideas come up again and again in interviews and on the job. The /proc folder is a live window into the kernel where every running process has its own directory of facts. Signals are short messages the system sends to processes, and a handful of commands let you find, inspect and stop processes.

### interview
- **/proc** is a virtual file system generated by the kernel: `/proc/<pid>/status` (state, memory, threads), `/proc/<pid>/maps` (memory map), `/proc/<pid>/fd/` (open files), `/proc/<pid>/cmdline`, plus system-wide `/proc/cpuinfo`, `/proc/meminfo`, `/proc/loadavg`. `/proc/self` is the reading process.
- **Signals**: `SIGINT` (2, Ctrl+C), `SIGTERM` (15, polite "please exit", the default for `kill`), `SIGKILL` (9, cannot be caught or ignored), `SIGSTOP`/`SIGCONT` (pause and resume; SIGSTOP cannot be caught), `SIGHUP` (1, terminal closed or "reload config" for daemons), `SIGCHLD` (a child changed state), `SIGSEGV` (11, invalid memory access), `SIGPIPE` (writing to a closed pipe or socket).
- Process commands: `ps aux` / `ps -ef`, `top` / `htop`, `pgrep` / `pkill`, `kill -TERM <pid>`, `nice` / `renice`, `jobs`, `fg`, `bg`, `nohup`, `&`.
- Diagnosis: `strace` (system calls), `lsof` (open files and sockets), `free -h` and `vmstat` (memory, swap, run queue), `iostat` (disk), `df -h` / `du -sh` (space), `uptime` (load averages over 1, 5 and 15 minutes), `ss -tlnp` (listening sockets), `dmesg` (kernel log, such as OOM kills).
- Good practice when stopping a service: send SIGTERM, give it time to clean up, and use SIGKILL only as a last resort.

### deep
#### Reading /proc from code

```python
import os
import signal


def status_fields(pid, names):
    with open(f"/proc/{pid}/status") as f:
        rows = dict(line.split(":", 1) for line in f if ":" in line)
    return {n: rows[n].strip() for n in names}


print(status_fields(os.getpid(), ["Name", "State", "Threads", "VmRSS"]))
print("open descriptors:", len(os.listdir("/proc/self/fd")))

received = []
signal.signal(signal.SIGUSR1, lambda signum, frame: received.append(signum))
os.kill(os.getpid(), signal.SIGUSR1)          # send ourselves a signal
print("handled:", [signal.Signals(s).name for s in received])   # ['SIGUSR1']
```

#### A debugging session (worked example)

A server is slow. A typical sequence:

```text
uptime                         # load average 12.3 on a 4-core machine: the run queue is long
top -o %CPU                    # PID 4312 "worker" at 380% CPU
cat /proc/4312/status | grep -E 'State|Threads|VmRSS'   # R, 64 threads, 3.1 GB resident
strace -c -p 4312              # mostly futex calls: threads fighting over a lock
lsof -p 4312 | wc -l           # 9,800 open files: a descriptor leak as well
kill -TERM 4312                # ask it to shut down cleanly; kill -KILL only if it ignores this
```

| signal | number | default action | can be caught? |
|---|---|---|---|
| SIGHUP | 1 | terminate | yes |
| SIGINT | 2 | terminate | yes |
| SIGKILL | 9 | terminate | no |
| SIGSEGV | 11 | terminate with core dump | yes (but rarely safe to continue) |
| SIGTERM | 15 | terminate | yes |
| SIGSTOP | 19 on x86 Linux | stop | no |

Connects to: zombie and orphan processes, process control block and states, system calls, interrupts, traps and exceptions.

### questions
Q: What is /proc in Linux?
A: A virtual file system created by the kernel that exposes live system and process information as files. Each process has a /proc/<pid> directory with its status, memory map, open file descriptors and command line, and files like /proc/meminfo and /proc/cpuinfo describe the whole system.

Q: What is the difference between SIGTERM and SIGKILL?
A: SIGTERM asks a process to terminate and can be caught, so the process can clean up, close files and exit gracefully. SIGKILL cannot be caught, blocked or ignored; the kernel ends the process immediately without any cleanup, so it should be a last resort.

Q: Which commands would you use to find why a Linux process is slow?
A: top or htop to see CPU and memory use, ps and /proc/<pid>/status for its state and threads, strace to see which system calls it makes and where it waits, lsof for open files and sockets, and vmstat or iostat to check swapping and disk load.
