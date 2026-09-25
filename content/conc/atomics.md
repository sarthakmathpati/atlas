---
topic: conc.atomics
name: "Atomics and lock-free programming"
subject: conc
order: 3
prereqs: [conc.locks]
---

## conc.atomics.atomic-operations
name: "Atomic operations"
importance: important
scope: "atomic counters, compare-and-swap"

### simple
An atomic operation is a change that happens all at once or not at all, so no other thread can ever catch it half done. It is like a vending machine that takes your coin and drops the snack in one motion: no one can grab the snack between the two steps. Atomic counters and compare-and-swap let threads share small values safely without a lock.

### interview
- `std::atomic<T>` makes reads, writes and read-modify-write operations on one value **indivisible** and free of data races. It works for integers, pointers, `bool`, and any trivially copyable type (large ones use a hidden lock; `is_lock_free()` tells you).
- Read-modify-write operations: `fetch_add`, `fetch_sub`, `++`, `exchange` (store and return the old value), and **compare-and-swap**: `compare_exchange_weak/strong(expected, desired)` stores `desired` only if the current value equals `expected`; otherwise it fails and copies the current value into `expected`.
- The **CAS loop** builds any atomic update (maximum, multiply, "withdraw if enough"): read, compute, try to swap, retry on failure. `compare_exchange_weak` may fail spuriously, so use it in loops; use `strong` for a single attempt.
- On x86-64, `fetch_add` compiles to `lock xadd` and CAS to `lock cmpxchg`. They are cheap without contention, but a contended atomic moves its cache line between cores on every update, so a hot shared counter does not scale.
- Atomics make one variable safe; they do not make a group of variables consistent. Two related values need a lock (or must be packed into one atomic).
- `atomic_flag` is the one type guaranteed lock-free (enough to build a spinlock); C++20 adds `atomic<T>::wait/notify_one`, `atomic_ref` and `atomic<shared_ptr<T>>`.

### deep
#### Worked example

```cpp
atomic<long long> hits{0};
atomic<int> highest{INT_MIN};
atomic_flag busy = ATOMIC_FLAG_INIT;           // the simplest lock: a spinlock
long long guarded = 0;                         // protected by busy

void updateMax(int value) {                    // a CAS loop: retry until no one interfered
    int seen = highest.load();
    while (value > seen && !highest.compare_exchange_weak(seen, value)) {
        // on failure, seen now holds the newer value; the loop checks it again
    }
}

int main() {
    vector<thread> ts;
    for (int t = 0; t < 4; ++t)
        ts.emplace_back([t] {
            for (int i = 0; i < 100000; ++i) {
                hits.fetch_add(1);             // one indivisible read-modify-write
                updateMax((i * 7919 + t * 104729) % 1000003);
                while (busy.test_and_set(memory_order_acquire)) {}   // spin until we set it
                ++guarded;
                busy.clear(memory_order_release);
            }
        });
    for (auto& th : ts) th.join();
    cout << hits << " " << highest << " " << guarded << "\n";
    cout << atomic<long long>::is_always_lock_free << "\n";
    int expected = 5;
    atomic<int> x{7};
    bool ok = x.compare_exchange_strong(expected, 10);   // fails: x is 7, not 5
    cout << ok << " " << expected << " " << x << "\n";   // expected was updated to 7
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
400000 1000002 400000
1
0 7 7
```

- 400,000 `fetch_add`s from four threads lost no update.
- The CAS loop found the true maximum of the 400,000 values, 1,000,002 (checked by computing all of them in one thread).
- The spinlock made `++guarded` safe; the acquire and release orders make the protected write visible to the next owner, exactly like a mutex.
- A failed CAS changed nothing in `x` and wrote the value it found (7) into `expected`, ready for the next attempt.

#### A CAS loop, step by step (two threads raising the max)

| step | `highest` | thread A (value 50) | thread B (value 80) |
|---|---|---|---|
| 1 | 10 | loads `seen = 10` | loads `seen = 10` |
| 2 | 80 | | CAS(10 → 80) succeeds |
| 3 | 80 | CAS(10 → 50) fails, `seen = 80` | done |
| 4 | 80 | 50 > 80 is false: stops, nothing to do | |

Without the loop, thread A's plain store of 50 would have overwritten B's 80.

#### Atomics or a mutex?

| situation | better tool |
|---|---|
| one counter, flag or pointer | atomic |
| an update of one value computed from its old value | atomic with a CAS loop |
| several variables that must change together | mutex |
| long critical sections, or waiting for a condition | mutex and condition variable |
| a counter hammered by every thread | per-thread counters summed at the end |

#### Edge cases and bugs

- `x = x + 1` on an atomic is a load and a separate store: not atomic as a whole. Use `x += 1` or `fetch_add`.
- A spinlock burns CPU while waiting and is terrible if the holder is descheduled; use it only for tiny critical sections, and prefer `mutex`.
- `atomic<double>` supports `fetch_add` only since C++20; earlier code needed a CAS loop.
- Copying an `atomic` is not allowed; read it with `load()` into a plain variable.

Connects to: hardware support, memory ordering, lock-free data structures, data races vs race conditions, false sharing and cache-line padding.

### questions
Q: What does compare_exchange do?
A: It atomically compares the current value with an expected value and, only if they are equal, replaces it with a desired value, returning true. If they differ, it leaves the variable unchanged, stores the current value into the expected argument and returns false, so a retry loop can recompute from fresh data.

Q: What is the difference between compare_exchange_weak and compare_exchange_strong?
A: The weak version may fail spuriously even when the values are equal, which lets it map directly onto load-linked and store-conditional instructions on some processors and can be faster in a loop. The strong version fails only when the values really differ. Use weak inside retry loops and strong for single attempts.

Q: Is x = x + 1 atomic when x is a std::atomic<int>?
A: No. It performs an atomic load, then a separate atomic store, and another thread can update x between them, losing an increment. Use x += 1, ++x or x.fetch_add(1), each of which is a single atomic read-modify-write.

Q: When should you use a mutex instead of atomics?
A: When several variables must be updated together consistently, when the critical section does real work or waits for a condition, or when the logic is complex enough that a lock-free version would be hard to prove correct. Atomics suit single counters, flags and pointers.

## conc.atomics.memory-ordering
name: "Memory ordering"
importance: advanced
prereqs: [conc.atomics.atomic-operations]
scope: "relaxed, acquire, release, sequentially consistent"

### simple
Compilers and processors reorder memory operations to go faster, which is invisible in single-threaded code but can confuse other threads. Memory orders are instructions about which reorderings are allowed around an atomic. Release and acquire work like sealing a parcel and opening it: everything packed before the seal is guaranteed to be inside when the receiver opens it.

### interview
- Each atomic operation takes a `memory_order`. **`seq_cst`** (the default) gives one global order of all such operations that every thread agrees on: the easiest to reason about.
- **`release`** on a store and **`acquire`** on a load that reads that stored value create a **synchronizes-with** edge: everything the writer did before the release is visible to the reader after the acquire. This is how locks and "publish a result through a flag" work.
- **`relaxed`** guarantees only atomicity and a single order of modifications of that one variable. It is enough for statistics counters, but it orders nothing else, so it cannot publish data.
- `acq_rel` is for read-modify-write operations that both consume and publish (such as a lock-free push). `consume` exists but compilers treat it as acquire.
- Hardware differs: x86 keeps loads and stores mostly in order (only a later load may pass an earlier store, through the store buffer), so acquire and release cost nothing extra there and a seq_cst store becomes `xchg`; ARM and POWER reorder more and need barrier instructions. Code must follow the C++ model, not the machine you test on.
- Rule of thumb: use seq_cst unless profiling shows the atomics matter, and document every weaker order with the edge it relies on.

### deep
#### Release and acquire: publishing data

```cpp
string payload;                                      // plain data, published through the flag
atomic<bool> ready{false};

int main() {
    thread consumer([] {
        while (!ready.load(memory_order_acquire)) {}   // 3. wait until it is published
        cout << payload << "\n";                       // 4. guaranteed to see the data
    });
    thread producer([] {
        payload = "order #42 filled";                  // 1. write the data
        ready.store(true, memory_order_release);       // 2. publish: earlier writes go with it
    });
    producer.join();
    consumer.join();
}
```

Output:

```text
order #42 filled
```

Step 1 happens before step 2 in the producer, the acquire load in step 3 reads the value written by the release, and so step 1 happens before step 4: the consumer must see the whole string. If both operations used `memory_order_relaxed`, the flag would still flip atomically, but nothing would order the write of `payload` with its read. That version has a data race on `payload` (undefined behavior), and ThreadSanitizer reports it as one.

#### Store buffering: what weaker orders allow

Each thread stores 1 to its own variable and then reads the other's. Under seq_cst, at least one thread must see the other's store, because all four operations fit in one global order. With release and acquire (or relaxed) the model allows both loads to return 0, and x86's store buffer really produces that outcome: each core's store is still waiting in its buffer while it loads the other variable.

```cpp
template <memory_order Store, memory_order Load>
long bothReadZero(int rounds) {
    atomic<int> x{0}, y{0}, round{0}, finished{0};
    int r1 = 0, r2 = 0;
    auto run = [&](atomic<int>& mine, atomic<int>& other, int& result) {
        for (int i = 1; i <= rounds; ++i) {
            while (round.load(memory_order_acquire) != i) {}   // wait for round i to start
            mine.store(1, Store);
            result = other.load(Load);
            finished.fetch_add(1, memory_order_acq_rel);
        }
    };
    thread a(run, ref(x), ref(y), ref(r1));
    thread b(run, ref(y), ref(x), ref(r2));
    long count = 0;
    for (int i = 1; i <= rounds; ++i) {
        x.store(0, memory_order_relaxed);
        y.store(0, memory_order_relaxed);
        finished.store(0, memory_order_relaxed);
        round.store(i, memory_order_release);                 // release both threads at once
        while (finished.load(memory_order_acquire) != 2) {}
        if (r1 == 0 && r2 == 0) ++count;
    }
    a.join();
    b.join();
    return count;
}

int main() {
    const int rounds = 200000;
    cout << "relaxed:         " << bothReadZero<memory_order_relaxed, memory_order_relaxed>(rounds) << "\n";
    cout << "release/acquire: " << bothReadZero<memory_order_release, memory_order_acquire>(rounds) << "\n";
    cout << "seq_cst:         " << bothReadZero<memory_order_seq_cst, memory_order_seq_cst>(rounds) << "\n";
}
```

Output (one run on a 4-core x86-64 VM; the first two counts change a lot from run to run and can be 0, the last is always 0):

```text
relaxed:         842
release/acquire: 977
seq_cst:         0
```

Across 60 runs at `-O2` the first two counts ranged from about 500 to over 130,000 out of 200,000 rounds (in the slower ThreadSanitizer build, release/acquire sometimes showed 0); seq_cst never produced the outcome, as the standard guarantees. The program has no data race (every shared access is atomic or ordered by `round` and `finished`), and ThreadSanitizer reports nothing. On x86, g++ 13 compiles the seq_cst store to `xchg`, which drains the store buffer, while the release store is a plain `mov`.

#### The orders at a glance

| order | guarantees | typical use |
|---|---|---|
| `relaxed` | atomicity, one modification order per variable | counters, statistics, reference counts (increments) |
| `acquire` (loads) | later reads and writes stay after it | taking a lock, reading a published flag |
| `release` (stores) | earlier reads and writes stay before it | releasing a lock, publishing data |
| `acq_rel` (read-modify-write) | both | lock-free stack push and pop, a reference count's final decrement |
| `seq_cst` | acquire/release plus one global order | the default; flags checked by several threads (Dekker-style) |

Connects to: atomic operations, lock-free data structures, Peterson's solution, hardware support, thread-safe singleton.

### questions
Q: What does a release store paired with an acquire load guarantee?
A: If the acquire load reads the value written by the release store, then everything the writing thread did before the store happens before everything the reading thread does after the load. This lets a thread publish plain data through an atomic flag, and it is exactly the guarantee a mutex's unlock and lock provide.

Q: When is memory_order_relaxed safe?
A: When the atomic value is the only thing that matters and no other data is published through it, such as a statistics counter or an event count read after all threads are joined. It still guarantees that each operation is atomic, but it does not order any other memory accesses.

Q: Why can code with weak memory orders work on x86 but fail on ARM?
A: x86 has a strong hardware memory model where loads and stores are rarely reordered, so acquire and release happen to hold even for plain accesses. ARM and POWER allow far more reordering, so missing or too-weak orderings show up there. Correctness must come from the C++ memory model, not from the test machine.

Q: What is the store buffering outcome, and which order forbids it?
A: Two threads each store to their own variable and then load the other's, and both loads return the old value. It is allowed with relaxed and with release-acquire, and happens on x86 because stores wait in a per-core store buffer. Sequential consistency forbids it, because all four operations must fit into one global order.

## conc.atomics.lock-free-data-structures
name: "Lock-free data structures"
importance: advanced
prereqs: [conc.atomics.memory-ordering]
scope: "lock-free queue idea, the ABA problem"

### simple
A lock-free data structure lets many threads use it without anyone ever holding a lock, so one slow or paused thread cannot stop the others. Threads prepare their change privately and then publish it with a single atomic swap, retrying if someone else got there first. It is faster under some workloads, but it is much harder to get right, and one famous trap is called the ABA problem.

### interview
- **Lock-free**: some thread always makes progress, even if others are paused (no thread can block the rest by holding a lock). **Wait-free**: every thread finishes in a bounded number of steps. **Obstruction-free**: a thread finishes if it runs alone.
- The basic tool is the CAS loop. A **Treiber stack** pushes by CAS-ing the new node onto `top` and pops by CAS-ing `top` to `top->next`. The **Michael-Scott queue** keeps `head` and `tail` pointers with a dummy node and helps finish half-done enqueues.
- The **ABA problem**: a thread reads `top == A` and `A->next == B`, is paused, and meanwhile others pop A and B and push A back. The CAS still sees A and succeeds, installing the stale `B`. Fixes: a **version counter** next to the pointer (double-width CAS), or safe memory reclamation that never reuses a node while someone may hold it (**hazard pointers**, epoch-based reclamation; C++26 adds hazard pointers and RCU to the standard library).
- **Memory reclamation** is the hard part: a popped node cannot simply be deleted while another thread may still read its `next`.
- In practice: the **single-producer single-consumer ring buffer** is simple, wait-free and widely used (market data, audio, logging); for everything else prefer a well-tested library or a mutex, and benchmark, since lock-free is not automatically faster.

### deep
#### Worked example: an SPSC ring buffer

```cpp
template <class T, size_t N>                    // N must be a power of two
class SpscQueue {
public:
    bool push(const T& v) {                     // called only by the producer
        size_t h = head_.load(memory_order_relaxed);
        if (h - tail_.load(memory_order_acquire) == N) return false;       // full
        buf_[h & (N - 1)] = v;
        head_.store(h + 1, memory_order_release);   // publish the slot
        return true;
    }
    bool pop(T& out) {                          // called only by the consumer
        size_t t = tail_.load(memory_order_relaxed);
        if (t == head_.load(memory_order_acquire)) return false;           // empty
        out = buf_[t & (N - 1)];
        tail_.store(t + 1, memory_order_release);   // hand the slot back
        return true;
    }
private:
    array<T, N> buf_{};
    alignas(64) atomic<size_t> head_{0};        // written by the producer
    alignas(64) atomic<size_t> tail_{0};        // written by the consumer
};

int main() {
    SpscQueue<int, 1024> q;
    const int n = 1'000'000;
    long long sum = 0;
    bool inOrder = true;
    thread consumer([&] {
        int expected = 1, v;
        while (expected <= n) {
            if (!q.pop(v)) continue;            // empty: try again (a real one might back off)
            inOrder &= (v == expected++);
            sum += v;
        }
    });
    for (int i = 1; i <= n; ++i)
        while (!q.push(i)) {}                   // full: spin until the consumer catches up
    consumer.join();
    cout << sum << " " << inOrder << "\n";
}
```

Output (the same in every run, and clean under ThreadSanitizer):

```text
500000500000 1
```

Each index has exactly one writer (`head_` by the producer, `tail_` by the consumer), so no CAS is needed. The release store of `head_` publishes the slot's contents to the consumer's acquire load; the release store of `tail_` tells the producer the slot may be reused. The two indices sit on separate cache lines so the threads do not slow each other down through false sharing.

#### The ABA problem, replayed step by step

The program below runs a lock-free stack's `pop` in slow motion on one thread, so the dangerous interleaving happens every time.

```cpp
struct Node { int value; Node* next; };

struct Stack {
    atomic<Node*> top{nullptr};
    void push(Node* n) {
        n->next = top.load();
        while (!top.compare_exchange_weak(n->next, n)) {}
    }
    Node* pop() {
        Node* t = top.load();
        while (t && !top.compare_exchange_weak(t, t->next)) {}
        return t;
    }
};

string show(const Stack& s) {
    string out;
    for (Node* n = s.top.load(); n; n = n->next) out += (out.empty() ? "" : " ") + to_string(n->value);
    return out.empty() ? "(empty)" : out;
}

int main() {
    Node a{1, nullptr}, b{2, nullptr}, c{3, nullptr};
    Stack s;
    s.push(&c);
    s.push(&b);
    s.push(&a);                                   // stack: 1 2 3
    cout << "start: " << show(s) << "\n";

    // Thread 1 starts pop(): it reads top = A and A's next = B, then is paused.
    Node* seenTop = s.top.load();
    Node* seenNext = seenTop->next;

    // Thread 2 runs: pops A, pops B, pushes A back (the node is reused).
    Node* x = s.pop();
    s.pop();
    s.push(x);                                    // top is A again, but A->next is now C
    cout << "after thread 2: " << show(s) << "\n";

    // Thread 1 resumes: top still equals A, so its CAS succeeds and installs its stale next, B.
    bool ok = s.top.compare_exchange_strong(seenTop, seenNext);
    cout << "thread 1 CAS succeeded: " << ok << ", stack: " << show(s) << "\n";
}
```

Output:

```text
start: 1 2 3
after thread 2: 1 3
thread 1 CAS succeeded: 1, stack: 2 3
```

Thread 1 believes it popped A, but the stack now starts with B, a node thread 2 already removed (and in real code may have freed). The CAS compared only the address, and A's address came back. With a version counter packed next to the pointer and bumped by every successful CAS, thread 1 would have compared the pair it read (A, old version) with (A, a version three steps newer), and the CAS would have failed correctly.

Connects to: memory ordering, atomic operations, concurrent collections, producer-consumer in code, false sharing and cache-line padding.

### questions
Q: What does lock-free mean?
A: A data structure is lock-free if, at any time, at least one thread operating on it makes progress in a bounded number of its own steps, regardless of how other threads are scheduled. No thread can block the others by being paused while holding a lock. Wait-free is stronger: every thread finishes in a bounded number of steps.

Q: What is the ABA problem?
A: A compare-and-swap checks only that a value equals what was read earlier, not that nothing happened in between. If a location changes from A to B and back to A, for example because a node was popped and a node at the same address pushed again, a stale CAS still succeeds and can corrupt the structure. Version counters or safe memory reclamation prevent it.

Q: Why is memory reclamation hard in lock-free structures?
A: After one thread removes a node, another thread may still hold a pointer to it and be about to read its fields, so deleting it immediately causes use-after-free, and reusing its memory causes ABA. Schemes such as hazard pointers, epoch-based reclamation or reference counting delay freeing until no thread can still access the node.

Q: Why is a single-producer single-consumer ring buffer simple compared with other lock-free queues?
A: Each index has exactly one writer: only the producer advances the head and only the consumer advances the tail. So no compare-and-swap loops are needed, just release stores and acquire loads to publish slots, which also makes it wait-free and very fast.

## conc.atomics.false-sharing-and-cache-line-padding
name: "False sharing and cache-line padding"
importance: advanced
tracks: [quant]
scope: "why it slows multithreaded code"

### simple
Processors move memory between cores in fixed chunks called cache lines, usually 64 bytes. If two threads keep writing two different variables that happen to sit in the same chunk, the cores keep snatching the chunk back and forth, like two people sharing one notebook who each need to write on their own page. Giving each thread's variable its own cache line, with padding, stops the tug of war.

### interview
- Caches keep **cache lines** (64 bytes on x86-64 and most ARM cores) coherent between cores (MESI-style protocols). A write to a line **invalidates** every other core's copy.
- **False sharing**: threads write **different** variables that share one line, so the line bounces between cores although no data is actually shared. The program stays correct, only slow.
- Typical victims: per-thread counters in an array, adjacent `atomic` fields written by different threads, a producer's and a consumer's indices in one struct.
- Fix with **padding and alignment**: `struct alignas(64) Counter { ... };` or `std::hardware_destructive_interference_size` (C++17), or let each thread accumulate in a local variable and write once at the end. Some libraries pad to 128 bytes because Intel CPUs prefetch pairs of adjacent lines.
- Padding costs memory and can reduce cache capacity, so apply it only to data written by different threads concurrently.
- Diagnose with profilers that report cache-line contention (such as Linux `perf c2c`), or by the classic symptom: adding threads makes a "perfectly parallel" loop slower.

### deep
#### Worked example

```cpp
struct Packed { atomic<long long> count{0}; };                  // 8 bytes: 8 fit in one line
struct alignas(64) Padded { atomic<long long> count{0}; };      // one per 64-byte line

template <class Counter>
double run(int threads) {
    vector<Counter> counters(threads);
    auto start = chrono::steady_clock::now();
    vector<thread> ts;
    for (int t = 0; t < threads; ++t)
        ts.emplace_back([&, t] {
            for (int i = 0; i < 20'000'000; ++i)
                counters[t].count.fetch_add(1, memory_order_relaxed);   // no sharing of data
        });
    for (auto& th : ts) th.join();
    return chrono::duration<double>(chrono::steady_clock::now() - start).count();
}

int main() {
    cout << sizeof(Packed) << " " << sizeof(Padded) << "\n";
    printf("4 threads, counters side by side: %.2f s\n", run<Packed>(4));
    printf("4 threads, one cache line each:  %.2f s\n", run<Padded>(4));
    printf("1 thread (baseline):             %.2f s\n", run<Padded>(1));
}
```

Output (one run on a 4-core x86-64 VM, g++ 13 at `-O2`; times depend on the machine):

```text
8 64
4 threads, counters side by side: 1.69 s
4 threads, one cache line each:  0.15 s
1 thread (baseline):             0.13 s
```

Over five runs the packed version took 1.58 to 1.69 s and the padded one 0.13 to 0.16 s: about ten times slower for identical work, only because four counters shared one cache line. With padding, four threads doing four times the work took about as long as one thread alone, which is what perfect scaling looks like.

#### Why it happens

| step | core 0 (counter 0) | core 1 (counter 1) |
|---|---|---|
| 1 | owns the line, increments | wants to write: requests the line |
| 2 | loses the line (invalidated) | owns it, increments |
| 3 | wants it back: requests the line | loses it |

Every increment waits for a cross-core transfer that can take tens to hundreds of cycles, instead of a few cycles for a write to its own cache.

#### Fixes, from cheapest

1. Accumulate in a local variable (a register) and write the shared slot once at the end.
2. Pad per-thread slots to a cache line with `alignas(64)`; `vector` respects the alignment since C++17.
3. Separate data written by different threads into different objects (for example the head and tail indices of a queue).

Connects to: object memory layout, cache lines and locality, atomic operations, lock-free data structures, thread safety.

### questions
Q: What is false sharing?
A: A slowdown that happens when threads on different cores write to different variables that lie in the same cache line. The coherence protocol transfers ownership of the whole line on each write, so the cores keep invalidating each other's copy even though they never touch the same data.

Q: How do you fix false sharing?
A: Keep data written by different threads on different cache lines: pad or align each per-thread item to 64 bytes with alignas or hardware_destructive_interference_size, separate hot fields written by different threads, or accumulate in thread-local variables and combine the results at the end.

Q: Why does false sharing not cause wrong results?
A: The threads access different variables, and cache coherence keeps every core's view of memory consistent, so there is no data race and the values are correct. The cost is purely performance: the hardware keeps moving the cache line between cores to maintain that consistency.

Q: Why would adding threads make a parallel counting loop slower?
A: If each thread's counter shares a cache line with the others, each increment forces the line to move between cores, so more threads mean more contention on that line. The work is parallel in principle but serialized by the hardware; padding each counter to its own cache line restores scaling.
