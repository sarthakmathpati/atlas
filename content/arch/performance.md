---
topic: arch.performance
name: "Performance engineering"
subject: arch
order: 3
prereqs: [arch.cpu-memory]
---

## arch.performance.latency-numbers-every-programmer-should-know
name: "Latency numbers every programmer should know"
importance: important
prereqs: [arch.cpu-memory.memory-hierarchy]
scope: "orders of magnitude"

### simple
Different operations take wildly different amounts of time: a cache hit takes about a nanosecond, a trip to main memory about a hundred, a disk access millions, and a message across an ocean hundreds of millions. Knowing these rough sizes lets you guess where a program spends its time before measuring. It is like knowing that walking across a room, driving across a city and flying across the world differ by factors of a thousand.

### interview
- Rough ladder: L1 hit ~1 ns; branch mispredict ~5 ns; L2 a few ns; uncontended lock ~10 to 25 ns; main memory ~100 ns; system call ~100 ns to 1 µs; context switch a few µs; SSD random read ~100 µs; round trip in a data center ~0.5 ms; disk seek ~10 ms; round trip across a continent or ocean ~100 ms.
- Use them for back-of-the-envelope estimates: "a million random memory reads is about 0.1 s", "a thousand sequential network round trips is at least half a second".
- Sequential beats random at every level: bandwidth (GB/s) and latency (per access) are different numbers.
- The widely shared list dates from around 2010; the orders of magnitude still hold, but the exact numbers depend on the machine, so measure the ones that matter.

### deep
#### Measuring some of them

The program times common operations on the session's machine, taking the best of 5 batches for each.

```cpp
// Build with: g++ -std=c++20 -O2
// Rough costs of common operations on one machine: best of 5 batches, per operation.
template <class F> double nsPerOp(int ops, F f) {
    double best = 1e18;
    for (int batch = 0; batch < 5; ++batch) {
        auto t0 = chrono::steady_clock::now();
        for (int i = 0; i < ops; ++i) f();
        best = min(best, chrono::duration<double, nano>(chrono::steady_clock::now() - t0).count());
    }
    return best / ops;
}

void row(const char* what, double ns) {
    if (ns < 1e3) printf("%-40s %9.1f ns\n", what, ns);
    else if (ns < 1e6) printf("%-40s %9.1f us\n", what, ns / 1e3);
    else printf("%-40s %9.2f ms\n", what, ns / 1e6);
}

int main() {
    mutex m;
    atomic<long> counter{0};
    row("mutex lock + unlock, uncontended", nsPerOp(1'000'000, [&] { m.lock(); m.unlock(); }));
    row("atomic increment, one thread", nsPerOp(1'000'000, [&] { counter.fetch_add(1); }));
    row("new + delete of 64 bytes", nsPerOp(1'000'000, [] {
        char* p = new char[64];
        asm volatile("" : : "r"(p) : "memory");  // keep the allocation from being optimized out
        delete[] p;
    }));
    row("system call (getppid)", nsPerOp(200'000, [] { syscall(SYS_getppid); }));

    vector<char> src(1 << 20, 'x'), dst(1 << 20);
    row("memcpy 1 MiB", nsPerOp(2'000, [&] {
        memcpy(dst.data(), src.data(), src.size());
        asm volatile("" : : "r"(dst.data()) : "memory");
    }));
    row("start and join a thread", nsPerOp(2'000, [] { thread([] {}).join(); }));

    int fds[2], back[2];  // two threads bounce one byte through two pipes
    if (pipe(fds) || pipe(back)) return 1;
    thread echo([&] {
        char c;
        while (read(fds[0], &c, 1) == 1 && c && write(back[1], &c, 1) == 1) {}
    });
    char c = 1;
    row("pipe round trip between two threads", nsPerOp(20'000, [&] {
        if (write(fds[1], &c, 1) != 1 || read(back[0], &c, 1) != 1) abort();
    }));
    c = 0;  // tells the echo thread to stop
    if (write(fds[1], &c, 1) != 1) abort();
    echo.join();

    FILE* f = tmpfile();  // 64 MiB file, read back from the page cache
    vector<char> buf(1 << 20, 'y');
    for (int i = 0; i < 64; ++i) fwrite(buf.data(), 1, buf.size(), f);
    fflush(f);
    int fd = fileno(f);
    row("read 1 MiB from a cached file", nsPerOp(64, [&] {
        if (pread(fd, buf.data(), buf.size(), 0) != ssize_t(buf.size())) abort();
    }));
    row("write 4 KiB and fsync", nsPerOp(20, [&] {
        if (pwrite(fd, buf.data(), 4096, 0) != 4096 || fsync(fd) != 0) abort();
    }));
    fclose(f);
}
```

Output (one run on the session's cloud machine, a 4-core x86-64 virtual machine):

```text
mutex lock + unlock, uncontended               6.6 ns
atomic increment, one thread                   6.3 ns
new + delete of 64 bytes                      14.2 ns
system call (getppid)                        114.7 ns
memcpy 1 MiB                                  43.2 us
start and join a thread                       41.7 us
pipe round trip between two threads           23.7 us
read 1 MiB from a cached file                 50.7 us
write 4 KiB and fsync                        162.7 us
```

#### Reading the results

Over five runs:

| Operation | This machine | Order of magnitude |
|---|---|---|
| uncontended mutex lock and unlock | 6.1 to 6.7 ns | 10 ns |
| atomic increment, one thread | 5.4 to 6.3 ns | 10 ns |
| `new` and `delete` of 64 bytes | 12 to 14 ns | 10 ns |
| system call | 106 to 115 ns | 100 ns |
| copy 1 MiB | 37 to 44 µs (about 25 GB/s) | 10 to 100 µs |
| start and join a thread | 36 to 42 µs | 10 to 100 µs |
| read 1 MiB of a cached file | 48 to 56 µs | 10 to 100 µs |
| pipe round trip between threads | 23.0 to 23.7 µs | 10 µs |
| write 4 KiB and fsync | 147 to 163 µs | 0.1 to 10 ms |

With the [memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy) measurements (about 1.5 ns for L1, 5 ns for L2, 25 ns for L3 and 140 to 340 ns for random reads from RAM on this machine), the ladder spans eight orders of magnitude. Some numbers here are specific to a virtual machine: the pipe round trip between threads on different CPUs includes waking an idle virtual CPU, and fsync goes to a virtual disk with its own cache, so a physical disk could be far slower.

#### Using the numbers

- A service that makes 5 sequential calls to a database in the same data center spends at least 2.5 ms waiting on the network, however fast the database is.
- Scanning 1 GiB sequentially from RAM takes about a tenth of a second; following 10 million random pointers through it takes one to three seconds.
- Starting a thread per tiny task (tens of µs) can cost more than the task; that is what [thread pools](#/concept/conc.patterns.thread-pools) are for.

#### Common mistakes

- **Quoting numbers to three digits.** They are orders of magnitude; the point is the ratios.
- **Adding latencies that overlap.** Independent requests can run in parallel; dependent ones add.

Connects to: [memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy), [cost of system calls and context switches](#/concept/arch.performance.cost-of-system-calls-and-context-switches), [back-of-the-envelope estimation](#/concept/sysd.method.back-of-the-envelope-estimation), [Fermi estimation](#/concept/math.mental.fermi-estimation).

### questions
Q: Roughly how long does a main memory access take compared with an L1 cache hit?
A: About 100 ns against about 1 ns, so roughly a hundred times longer. That is why cache-friendly code can be many times faster than code doing the same arithmetic on scattered data.

Q: Put these in order: disk seek, system call, round trip in a data center, L2 cache hit.
A: L2 hit (a few ns), system call (about 100 ns to 1 µs), round trip within a data center (about 0.5 ms), disk seek (about 10 ms).

Q: How long would a million random reads from RAM take?
A: At roughly 100 ns each, about 0.1 seconds if they are dependent and can't overlap. Sequential reads of the same data would take a few milliseconds.

Q: Why should you measure rather than rely on the published list?
A: The list gives orders of magnitude from one era of hardware. Actual numbers vary with the processor, virtualization, the operating system and the storage device, and the decision may depend on the exact ratio.

## arch.performance.data-oriented-design
name: "Data-oriented design"
importance: important
tracks: [quant]
prereqs: [arch.cpu-memory.cache-lines-and-locality]
scope: "struct of arrays vs array of structs"

### simple
Data-oriented design means arranging data in memory around how the program uses it, not around how we like to think of objects. If a loop only needs one or two fields of many objects, storing each field in its own array lets it read exactly what it needs. It is like a warehouse that shelves all the screws together instead of packing a few screws into every toolbox.

### interview
- **Array of structs (AoS)**: `vector<Particle>`, each element holding all fields. Good when you use most fields of each element together.
- **Struct of arrays (SoA)**: one array per field. Good when hot loops touch a few fields of many elements: every byte loaded is used, and the loops vectorize easily.
- **Hot/cold splitting**: keep frequently used fields together and move rarely used ones elsewhere.
- **Layout and padding**: each field sits at a multiple of its alignment, so field order changes a struct's size. Order fields from largest to smallest alignment to avoid holes.
- Prefer contiguous containers and indices over pointer-linked objects; process data in batches.
- Common in game engines, trading systems and numerical code, where a few loops over many items dominate.

### deep
#### Layout and alignment

Checked on x86-64 with GCC and clang:

```cpp
// Field order changes a struct's size: each field sits at a multiple of its alignment, and the
// size is rounded up to a multiple of the largest alignment so arrays stay aligned.
struct Loose { char tag; double price; char side; int qty; };
struct Tight { double price; int qty; char tag; char side; };

int main() {
    printf("alignof: char %zu, int %zu, double %zu\n", alignof(char), alignof(int),
           alignof(double));
    printf("Loose: size %zu; offsets tag %zu, price %zu, side %zu, qty %zu\n", sizeof(Loose),
           offsetof(Loose, tag), offsetof(Loose, price), offsetof(Loose, side),
           offsetof(Loose, qty));
    printf("Tight: size %zu; offsets price %zu, qty %zu, tag %zu, side %zu\n", sizeof(Tight),
           offsetof(Tight, price), offsetof(Tight, qty), offsetof(Tight, tag),
           offsetof(Tight, side));
    printf("1M orders: %zu MiB loose, %zu MiB tight\n", sizeof(Loose) * (1 << 20) >> 20,
           sizeof(Tight) * (1 << 20) >> 20);
    struct alignas(64) Padded { long counter; };
    printf("alignas(64) struct holding one long: size %zu\n", sizeof(Padded));
}
```

Output:

```text
alignof: char 1, int 4, double 8
Loose: size 24; offsets tag 0, price 8, side 16, qty 20
Tight: size 16; offsets price 0, qty 8, tag 12, side 13
1M orders: 24 MiB loose, 16 MiB tight
alignas(64) struct holding one long: size 64
```

`Loose` wastes 10 of its 24 bytes: 7 after `tag` so `price` starts at 8, 3 after `side` so `qty` starts at 20. `Tight` holds the same fields in 16 bytes, so a million orders need 16 MiB instead of 24, and more of them fit in each cache line. `alignas(64)` does the opposite on purpose: one `long` takes a whole line, the standard defense against [false sharing](#/concept/conc.atomics.false-sharing-and-cache-line-padding).

#### Array of structs against struct of arrays

Moving 4 million particles one step uses 24 of each particle's 64 bytes.

```cpp
// Build with: g++ -std=c++20 -O2
// Move 4M particles one step: only the position and velocity are read and written.
struct Particle {  // array of structs: 64 bytes each, one cache line
    float x, y, z, vx, vy, vz;
    float mass, charge, radius, temperature;
    int id, flags;
    double createdAt, lifetime;
};
struct Particles {  // struct of arrays: each field in its own array
    vector<float> x, y, z, vx, vy, vz, mass, charge, radius, temperature;
    vector<int> id, flags;
    vector<double> createdAt, lifetime;
};

template <class F> double bestMs(F f) {
    double best = 1e18;
    for (int rep = 0; rep < 5; ++rep) {
        auto t0 = chrono::steady_clock::now();
        f();
        best = min(best, chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count());
    }
    return best;
}

int main() {
    const size_t n = 1 << 22;
    const float dt = 0.01f;
    vector<Particle> aos(n, Particle{0, 0, 0, 1, 2, 3, 1, 0, 1, 300, 0, 0, 0, 1});
    Particles soa;
    for (auto* v : {&soa.x, &soa.y, &soa.z, &soa.mass, &soa.charge, &soa.radius, &soa.temperature})
        v->assign(n, 0);
    soa.vx.assign(n, 1), soa.vy.assign(n, 2), soa.vz.assign(n, 3);
    soa.id.assign(n, 0), soa.flags.assign(n, 0);
    soa.createdAt.assign(n, 0), soa.lifetime.assign(n, 1);

    printf("sizeof(Particle) = %zu bytes; the update uses 24 of them\n", sizeof(Particle));
    double a = bestMs([&] {
        for (auto& p : aos) p.x += p.vx * dt, p.y += p.vy * dt, p.z += p.vz * dt;
    });
    double s = bestMs([&] {
        for (size_t i = 0; i < n; ++i) soa.x[i] += soa.vx[i] * dt;
        for (size_t i = 0; i < n; ++i) soa.y[i] += soa.vy[i] * dt;
        for (size_t i = 0; i < n; ++i) soa.z[i] += soa.vz[i] * dt;
    });
    printf("array of structs: %.1f ms; struct of arrays: %.1f ms (%.1fx faster)\n", a, s, a / s);
    printf("check: %.2f %.2f\n", aos[n / 2].z, soa.z[n / 2]);
}
```

Output (one run on the session's cloud machine):

```text
sizeof(Particle) = 64 bytes; the update uses 24 of them
array of structs: 31.3 ms; struct of arrays: 13.0 ms (2.4x faster)
check: 0.15 0.15
```

Over five runs the array of structs took 29 to 33 ms and the struct of arrays 12.8 to 13.9 ms, 2.1 to 2.6 times faster. With whole structs, every cache line brought in carries 40 bytes the loop never reads; with separate arrays, every byte loaded is a position or a velocity.

#### Common mistakes

- **Converting everything to SoA.** When code uses most fields of one element at a time (an order being matched), AoS keeps them in one line.
- **Ignoring padding** in large arrays of small structs.
- **Guessing instead of measuring**: the gain depends on the fraction of each element a loop really uses.

Connects to: [cache lines and locality](#/concept/arch.cpu-memory.cache-lines-and-locality), [SIMD basics](#/concept/arch.performance.simd-basics), [low-latency techniques](#/concept/arch.performance.low-latency-techniques), [stack vs heap memory](#/concept/os.memory.stack-vs-heap-memory).

### questions
Q: What is the difference between an array of structs and a struct of arrays?
A: An array of structs stores each element's fields together; a struct of arrays stores each field in its own array. The first suits code that uses whole elements, the second code that runs over one or two fields of many elements.

Q: Why can a struct of arrays be faster for a loop that updates positions?
A: The loop then loads only positions and velocities, so every byte in every cache line it brings in is used and the loop is easy to vectorize. With an array of structs, most of each line carries fields the loop ignores.

Q: Why does the order of fields in a struct change its size?
A: Each field must start at a multiple of its alignment, so the compiler inserts padding after smaller fields, and the total size is rounded up to the largest alignment. Ordering fields from largest to smallest alignment removes most padding.

Q: What is hot/cold splitting?
A: Separating the fields a hot loop uses from those it rarely touches, often into a different struct or array, so that cache lines loaded by the loop are filled with useful data.

## arch.performance.simd-basics
name: "SIMD basics"
importance: advanced
tracks: [quant]
prereqs: [arch.performance.data-oriented-design]
scope: "vectorized operations"

### simple
SIMD stands for single instruction, multiple data: one instruction adds, multiplies or compares several numbers at once, packed side by side in a wide register. A 256-bit register holds eight floats, so one addition does eight. It is like a stamp that prints eight labels in one press instead of one at a time.

### interview
- x86-64 has 128-bit SSE, 256-bit AVX/AVX2 and, on some CPUs, 512-bit AVX-512 registers: 4, 8 or 16 floats per instruction. ARM has NEON and SVE.
- **Auto-vectorization**: compilers vectorize simple loops over contiguous arrays (`-O3`, and in easy cases `-O2` in recent GCC). Check with `-fopt-info-vec` (GCC) or `-Rpass=loop-vectorize` (clang).
- Compilers keep floating-point additions in their original order, because reordering changes the result, so a float sum gains nothing from SIMD until `-ffast-math` (or `-fassociative-math`) permits reordering, or you write the vector code yourself.
- **Intrinsics** such as `_mm256_add_ps` give explicit control; guard them with a runtime CPU check when the target may lack the instruction set.
- Vectorizes well: contiguous data, no loop-carried dependencies except reductions, few branches. Poorly: pointer chasing, gathers from scattered memory.

### deep
#### Worked example

Summing 16,384 floats (64 KiB) ten thousand times, three ways: a plain loop, AVX2 intrinsics with four 8-lane accumulators, and an integer loop the compiler vectorizes on its own. `[[gnu::target("avx2")]]` compiles just that function for AVX2, and `__builtin_cpu_supports` checks the CPU before calling it.

```cpp
// Build with: g++ -std=c++20 -O2
// Sum 16,384 floats (64 KiB, cache-resident) many times: scalar, then 8 floats per instruction.
float sumScalar(const float* a, size_t n) {
    float s = 0;
    for (size_t i = 0; i < n; ++i) s += a[i];  // one chain; the compiler may not reorder it
    return s;
}

[[gnu::target("avx2")]] float sumAvx2(const float* a, size_t n) {
    __m256 acc[4] = {_mm256_setzero_ps(), _mm256_setzero_ps(), _mm256_setzero_ps(),
                     _mm256_setzero_ps()};
    for (size_t i = 0; i < n; i += 32)  // 4 independent accumulators of 8 lanes each
        for (int k = 0; k < 4; ++k)
            acc[k] = _mm256_add_ps(acc[k], _mm256_loadu_ps(a + i + 8 * k));
    __m256 v = _mm256_add_ps(_mm256_add_ps(acc[0], acc[1]), _mm256_add_ps(acc[2], acc[3]));
    float lanes[8];
    _mm256_storeu_ps(lanes, v);
    float s = 0;
    for (float x : lanes) s += x;
    return s;
}

int sumInts(const int* a, size_t n) {  // integers may be reordered: the compiler vectorizes it
    int s = 0;
    for (size_t i = 0; i < n; ++i) s += a[i];
    return s;
}

// Tells the compiler memory may have changed, so each pass must really run (not be hoisted).
void clobber() { asm volatile("" : : : "memory"); }

template <class F> double bestMs(F f) {
    double best = 1e18;
    for (int rep = 0; rep < 5; ++rep) {
        auto t0 = chrono::steady_clock::now();
        f();
        best = min(best, chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count());
    }
    return best;
}

int main() {
    if (!__builtin_cpu_supports("avx2")) return puts("no AVX2 on this CPU"), 0;
    const size_t n = 16384;
    const int reps = 10000;
    vector<float> f(n);
    vector<int> v(n);
    for (size_t i = 0; i < n; ++i) f[i] = float(i % 7) * 0.25f, v[i] = int(i % 7);
    float r1 = 0, r2 = 0;
    long long r3 = 0;
    auto run = [&](auto pass) { for (int r = 0; r < reps; ++r) pass(), clobber(); };
    double scalar = bestMs([&] { run([&] { r1 += sumScalar(f.data(), n); }); });
    double avx = bestMs([&] { run([&] { r2 += sumAvx2(f.data(), n); }); });
    double ints = bestMs([&] { run([&] { r3 += sumInts(v.data(), n); }); });
    printf("float, scalar: %6.1f ms (sum of one pass %.2f)\n", scalar, sumScalar(f.data(), n));
    printf("float, AVX2:   %6.1f ms (sum of one pass %.2f), %.1fx faster\n", avx,
           sumAvx2(f.data(), n), scalar / avx);
    printf("int, compiler-vectorized: %6.1f ms (sum of one pass %d)\n", ints, sumInts(v.data(), n));
    if (r1 < 0 || r2 < 0 || r3 < 0) puts("");
}
```

Output (one run on the session's cloud machine):

```text
float, scalar:  115.3 ms (sum of one pass 12286.50)
float, AVX2:     18.2 ms (sum of one pass 12286.50), 6.3x faster
int, compiler-vectorized:   14.6 ms (sum of one pass 49146)
```

#### Reading the results

- **Explicit SIMD**: 18.0 to 18.7 ms against 112 to 116 ms for the plain loop over five runs, about 6 times faster. The ideal would be 32 times (4 accumulators × 8 lanes); loads from L2 (the 64 KiB array doesn't fit in the 48 KiB L1) and loop overhead eat the rest.
- **The plain float loop** runs at about 0.7 ns per element, one addition's latency, as in [out-of-order execution](#/concept/arch.cpu-memory.out-of-order-and-superscalar-execution).
- **Integers are vectorized automatically** (14.6 to 15.1 ms) because integer addition can be reordered freely.
- **Other builds, one run each**: at `-O3` the plain float loop still took 115 ms, with `-O3 -ffast-math` 28.6 ms (4 floats at a time), and with `-O3 -ffast-math -march=native` 14.8 ms, using the widest vectors this CPU has.

g++ 13's vectorizer report (`-fopt-info-vec-all`) for a file holding only the two plain loops, float on line 4 and int on line 9:

```text
g++ -O2: vecinfo.cpp:4:26: missed: couldn't vectorize loop
g++ -O2: vecinfo.cpp:9:26: missed: couldn't vectorize loop
g++ -O3: vecinfo.cpp:4:26: optimized: loop vectorized using 16 byte vectors
g++ -O3: vecinfo.cpp:9:26: optimized: loop vectorized using 16 byte vectors
```

At `-O2`, GCC 13 vectorizes only when it is very cheap, such as when the trip count is known after inlining, which is what happened to both loops in the benchmark. "Vectorized" doesn't mean faster for the float loop: GCC loads several floats at once but still adds them one by one in order, which is why it stays at 115 ms until `-ffast-math`.

#### Common mistakes

- **Enabling `-ffast-math` globally** to get one loop vectorized: it also assumes no NaNs or infinities everywhere.
- **Using AVX2 intrinsics without a CPU check**, or building everything with `-march=native` and shipping it to other machines.
- **Expecting SIMD to fix memory-bound code**: if the data comes from RAM, wider arithmetic doesn't help.

Connects to: [data-oriented design](#/concept/arch.performance.data-oriented-design), [floating point (IEEE 754)](#/concept/arch.representation.floating-point-ieee-754), [compiler optimizations](#/concept/arch.performance.compiler-optimizations), [out-of-order and superscalar execution](#/concept/arch.cpu-memory.out-of-order-and-superscalar-execution).

### questions
Q: What is SIMD?
A: Single instruction, multiple data: instructions that operate on several values packed in one wide register, such as eight floats in a 256-bit AVX register. One instruction then does the work of several scalar ones.

Q: Why doesn't the compiler speed up a simple float sum with SIMD at default settings?
A: A fast SIMD sum adds the numbers in a different order, and floating-point addition isn't associative, so the result could change. Without permission such as fast-math or associative-math flags the compiler keeps the original order, so you write the vector code yourself or allow reordering.

Q: How do you check whether a loop was vectorized?
A: Ask the compiler: GCC's fopt-info-vec options and clang's Rpass options report each loop that was or wasn't vectorized and why. Reading the generated assembly for vector instructions also works.

Q: How can you use AVX2 safely in a program that may run on older CPUs?
A: Compile only the AVX2 functions for that target, for example with a target attribute, and check at run time whether the CPU supports AVX2 before calling them, falling back to a scalar version otherwise.

## arch.performance.numa
name: "NUMA"
importance: advanced
needsReview: true
tracks: [quant]
scope: "memory locality on multi-socket machines"

### simple
On a machine with several processor sockets, each socket has its own memory attached, and reaching another socket's memory takes longer. That design is called NUMA, non-uniform memory access. It is like an office with two kitchens: you can use the far one, but it takes a longer walk, so it pays to keep your lunch in the one next to your desk.

### interview
- A **NUMA node** is a group of cores with its local memory; accesses to another node's memory cross an interconnect and are slower, with less bandwidth.
- Linux shows the layout with `numactl --hardware` or under `/sys/devices/system/node`; the distance table gives relative costs (10 means local).
- **First-touch policy**: Linux places a page on the node of the CPU that first writes it. Initialize data from the threads that will use it.
- **Pinning**: bind threads to cores (`pthread_setaffinity_np`, `taskset`, `numactl --cpunodebind --membind`) so they stay near their memory.
- Remote accesses are commonly quoted as roughly 1.5 to 2 times the latency of local ones, but it depends on the machine; measure with and without binding.
- Single-socket machines, and many cloud virtual machines, have a single node, so NUMA doesn't apply there.

### deep
#### What this machine reports

```cpp
// Build with: g++ -std=c++20 -O2
// What does this machine's NUMA layout look like? Linux describes it under /sys.
string readFile(const string& path) {
    ifstream in(path);
    string text((istreambuf_iterator<char>(in)), istreambuf_iterator<char>());
    while (!text.empty() && text.back() == '\n') text.pop_back();
    return text;
}

int main() {
    string online = readFile("/sys/devices/system/node/online");
    printf("NUMA nodes online: %s\n", online.c_str());
    for (int node = 0; node < 8; ++node) {
        string base = "/sys/devices/system/node/node" + to_string(node);
        string cpus = readFile(base + "/cpulist");
        if (cpus.empty()) continue;
        string distance = readFile(base + "/distance");
        string mem = readFile(base + "/meminfo");
        mem = mem.substr(0, mem.find('\n'));  // first line: MemTotal
        printf("node %d: CPUs %s, distances [%s]\n  %s\n", node, cpus.c_str(), distance.c_str(),
               mem.c_str());
    }
    printf("this thread is running on CPU %d\n", sched_getcpu());

    // First touch: Linux places a page on the node of the CPU that first writes it, so
    // initialize data from the threads (pinned to CPUs) that will use it.
    vector<vector<double>> parts(2);
    int usedCpu[2];
    vector<thread> workers;
    for (int t = 0; t < 2; ++t)
        workers.emplace_back([&, t] {
            cpu_set_t set;
            CPU_ZERO(&set);
            CPU_SET(t, &set);
            pthread_setaffinity_np(pthread_self(), sizeof set, &set);
            parts[t].assign(1 << 20, 1.0);  // the first write happens on CPU t
            usedCpu[t] = sched_getcpu();
        });
    for (auto& w : workers) w.join();
    for (int t = 0; t < 2; ++t) printf("worker %d touched its data on CPU %d\n", t, usedCpu[t]);
}
```

Output (one run on the session's cloud machine):

```text
NUMA nodes online: 0
node 0: CPUs 0-3, distances [10]
  Node 0 MemTotal:        8358116 kB
this thread is running on CPU 2
worker 0 touched its data on CPU 0
worker 1 touched its data on CPU 1
```

The session's virtual machine has one node: all 4 CPUs are local to all of its memory, and the distance table has the single entry 10 (the value for local). There is nothing to measure here, so the remote-access penalty quoted above comes from published measurements of multi-socket servers rather than this machine; that is why this concept is marked for review. The program still shows the habit that matters on a NUMA machine: each worker pins itself to a CPU and then writes its own data first, so under the first-touch policy its pages land on that CPU's node.

#### What goes wrong on real NUMA machines

- **Initializing everything from the main thread**: all pages land on one node, and threads on the other sockets read remote memory all the time.
- **Threads migrating** between sockets while their memory stays behind.
- **Shared data written from both sockets**: cache lines bounce across the interconnect, a costlier form of [false sharing](#/concept/conc.atomics.false-sharing-and-cache-line-padding).

#### Tools

`numactl --hardware` lists nodes and distances; `numactl --cpunodebind=0 --membind=0 ./app` runs a program on node 0 with its memory there; `numastat` shows how many allocations hit or missed their preferred node.

Connects to: [memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy), [threads vs processes](#/concept/os.threads.threads-vs-processes), [low-latency techniques](#/concept/arch.performance.low-latency-techniques), [virtual memory and demand paging](#/concept/os.memory.virtual-memory-and-demand-paging).

### questions
Q: What does NUMA mean?
A: Non-uniform memory access: on multi-socket machines each socket has local memory, and accessing another socket's memory is slower and has less bandwidth than local access.

Q: What is the first-touch policy, and how should you initialize data because of it?
A: Linux places a physical page on the NUMA node of the CPU that first writes it. Initialize each thread's data from that thread, after pinning it, so its memory ends up local.

Q: How do you keep a process and its memory on one NUMA node?
A: Bind it with numactl, using cpunodebind for the CPUs and membind for the memory, or set thread affinity in code and rely on first touch.

Q: Why might NUMA not matter for a program on a cloud virtual machine?
A: Many virtual machines expose a single NUMA node, so all memory looks local. Large instances can span sockets, though, so check the reported topology.

## arch.performance.profiling
name: "Profiling"
importance: important
scope: "finding hot spots, perf and sampling profilers"

### simple
A profiler tells you where a program actually spends its time, so you optimize the part that matters instead of the part you suspect. A sampling profiler interrupts the program many times a second and notes what it was doing; the places that show up most often are the hot spots. It is like checking what everyone in an office is doing at random moments: after enough checks you know where the day goes.

### interview
- **Sampling profilers** (`perf`, VTune, Instruments) interrupt the program periodically and record the instruction pointer and often the call stack; cost is low and proportional to the sample rate.
- **Instrumenting profilers** (gprof, manual timers, tracing) record every function entry and exit: exact counts, but more overhead and distortion.
- `perf record -g ./app` then `perf report`; `perf stat` counts events such as cycles, cache misses and branch misses when hardware counters are available.
- Build with optimization and symbols (`-O2 -g`, often `-fno-omit-frame-pointer` for call stacks); profile realistic inputs.
- Read results as percentages of samples: with $n$ samples, a share $p$ has a standard error of about $\sqrt{p(1-p)/n}$.
- Inlined functions are charged to their callers, so a hot spot may appear under the calling function's name.

### deep
#### Intuition

If a function accounts for 70% of the running time, a timer that fires at random moments finds the program in that function about 70% of the time. No instrumentation is needed, and the more samples you take, the more precise the shares.

#### A sampling profiler in 30 lines

The program sets a CPU-time timer; each time it fires, the signal handler counts which phase was running.

```cpp
// Build with: g++ -std=c++20 -O2 -g -fno-omit-frame-pointer
// A tiny sampling profiler: a timer interrupts the program every millisecond of CPU time, and
// the signal handler counts which phase was running. perf does the same with real addresses.
volatile sig_atomic_t phase = 0;
const char* names[] = {"parse", "sort", "count"};
long samples[3];
void onTick(int) { ++samples[phase]; }

vector<long> parse(int n) {  // turn text into numbers
    vector<long> out;
    char buf[32];
    for (int i = 0; i < n; ++i) {
        snprintf(buf, sizeof buf, "%lld", (i * 7919LL) % 1000003);
        out.push_back(strtol(buf, nullptr, 10));
    }
    return out;
}

int main() {
    signal(SIGPROF, onTick);
    itimerval every1ms{{0, 1000}, {0, 1000}};
    setitimer(ITIMER_PROF, &every1ms, nullptr);

    auto t0 = chrono::steady_clock::now();
    phase = 0;
    vector<long> v = parse(3'000'000);
    phase = 1;
    for (int r = 0; r < 3; ++r) {
        auto copy = v;
        sort(copy.begin(), copy.end());
    }
    phase = 2;
    unordered_map<long, int> counts;
    for (int r = 0; r < 3; ++r)
        for (long x : v) ++counts[x % 100003];

    setitimer(ITIMER_PROF, nullptr, nullptr);
    double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
    long total = samples[0] + samples[1] + samples[2];
    printf("ran %.0f ms, %ld samples\n", ms, total);
    for (int i = 0; i < 3; ++i)
        printf("%-6s %5ld samples  %5.1f%%\n", names[i], samples[i], 100.0 * samples[i] / total);
    printf("(%zu distinct keys)\n", counts.size());
}
```

Output (one run on the session's cloud machine):

```text
ran 1088 ms, 271 samples
parse     53 samples   19.6%
sort     192 samples   70.8%
count     26 samples    9.6%
(100003 distinct keys)
```

Over five runs, sorting took 68 to 73% of the samples, parsing 19 to 23% and counting 9 to 10%. The program asked for a sample every millisecond, but got about one every 4 ms (271 samples in 1,088 ms): profiling timers fire on the kernel's periodic tick, whose rate is chosen when the kernel is built. With about 270 samples, a 70% share has a standard error near 3 points, which matches the spread between runs.

#### The same program under perf

`perf record -e cpu-clock -F 999 ./prof` then `perf report --sort dso,symbol` (this virtual machine exposes no hardware counters, so perf samples on a software clock). Top lines of one run, template arguments shortened:

```text
    56.36%  prof.bin           [.] std::__introsort_loop<...>
    10.59%  prof.bin           [.] main
     6.02%  prof.bin           [.] std::__detail::_Map_base<...>::operator[]
     5.76%  libc.so.6          [.] __printf_buffer
     3.14%  libc.so.6          [.] _itoa_word
     2.97%  libc.so.6          [.] __GI_____strtoll_l_internal
     2.63%  [kernel.kallsyms]  [k] do_user_addr_fault
     1.95%  libc.so.6          [.] __memmove_avx512_unaligned_erms
```

perf names real functions instead of phases: most of the time is inside `std::sort`'s introsort loop, the formatting and parsing show up as C library functions, and `main` collects everything the compiler inlined into it, including the parse loop and the final insertion-sort pass. The kernel line is page faults while the vectors grow, and `memmove` is the copy made before each sort.

#### Common mistakes

- **Profiling a debug build**: the hot spots move once the optimizer runs.
- **Optimizing without measuring first**, or measuring once on a noisy machine.
- **Reading small percentages as meaningful** when there are few samples.

Connects to: [compiler optimizations](#/concept/arch.performance.compiler-optimizations), [latency numbers](#/concept/arch.performance.latency-numbers-every-programmer-should-know), [interrupts, traps and exceptions](#/concept/os.fundamentals.interrupts-traps-and-exceptions), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation).

### questions
Q: How does a sampling profiler work?
A: It interrupts the program at regular intervals, from a timer or a hardware event counter, and records where the program was, often with its call stack. Functions that appear in many samples are where the time goes.

Q: What is the difference between sampling and instrumenting profilers?
A: Sampling takes periodic snapshots with low overhead and statistical accuracy. Instrumentation records every function entry and exit, giving exact call counts but adding overhead that can distort the timings of small functions.

Q: Why should you profile an optimized build?
A: The optimizer inlines, reorders and removes code, so the hot spots of a debug build are often not those of the real program. Build with optimization plus debug symbols to get realistic profiles with readable names.

Q: A function shows 2% of 100 samples. Should you optimize it?
A: Probably not. With 100 samples the share has a standard error of about 1.4 points, and even if it is real, removing it entirely would save only about 2% of the time. Focus on the largest shares first.

## arch.performance.compiler-optimizations
name: "Compiler optimizations"
importance: advanced
scope: "inlining, loop unrolling, what -O2 does"

### simple
An optimizing compiler rewrites your program into faster machine code that gives the same results. It inlines small functions, computes constant expressions ahead of time, removes code whose result is never used, unrolls and vectorizes loops, and keeps values in registers. It is like an editor who tightens your sentences without changing what they say.

### interview
- `-O0`: no optimization, every variable in memory, every call real; good for debugging. `-O1`: basic cleanups. `-O2`: the usual release level (inlining, constant propagation, dead code elimination, loop optimizations, and cheap vectorization in recent GCC). `-O3`: more aggressive inlining, unrolling and vectorization.
- **Inlining** replaces a call with the function body, removing call overhead and exposing the body to further optimization; it is why small helpers and standard containers cost nothing at `-O2`.
- **Constant folding and propagation**: expressions with known values are computed at compile time.
- **Loop optimizations**: unrolling, invariant hoisting, strength reduction, vectorization, sometimes replacing a whole loop by a formula.
- The compiler may assume there is no undefined behavior, so code that relies on it can be "optimized" into something else.
- Look at the output with `-S`, `objdump -d` or an online compiler explorer, and measure.

### deep
#### Inlining and constant folding

```cpp
// The functions compiled below.
int square(int x) { return x * x; }
int useIt() { return square(5) + square(6); }
```

g++ 13 for x86-64, Intel syntax, directives removed. At `-O0`:

```text
_Z5useItv:
	push	rbp
	mov	rbp, rsp
	push	rbx
	mov	edi, 5
	call	_Z6squarei
	mov	ebx, eax
	mov	edi, 6
	call	_Z6squarei
	add	eax, ebx
	mov	rbx, QWORD PTR -8[rbp]
	leave
	ret
```

At `-O2`, `square` is inlined into `useIt`, $25 + 36$ is computed at compile time, and the whole function becomes:

```text
_Z5useItv:
	mov	eax, 61
	ret
```

#### Replacing a loop by a formula

For `long sumTo(long n) { long s = 0; for (long i = 1; i <= n; ++i) s += i; return s; }`, g++ 13 at `-O2` keeps a loop, unrolled to handle two values per iteration, while clang 18 at `-O2` removes the loop and computes the sum from a closed form with a multiplication (`mul`) and a few shifts and adds: its output contains no loop at all.

#### What it is worth

```cpp
// Build with: g++ -std=c++20 -O2
// (also built with -O0, -O1 and -O3 to compare)
// Small helpers and standard containers: free when inlined, costly when every call is real.
int scaled(int x) { return clamp(x * 3, 0, 1000); }

long long work(const vector<int>& v) {
    long long total = 0;
    for (size_t i = 0; i < v.size(); ++i) total += scaled(v[i]);
    return total;
}

int main() {
    vector<int> v(10'000'000);
    for (size_t i = 0; i < v.size(); ++i) v[i] = int(i % 997) - 300;
    double best = 1e18;
    long long result = 0;
    for (int rep = 0; rep < 5; ++rep) {
        auto t0 = chrono::steady_clock::now();
        result = work(v);
        best = min(best, chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count());
    }
    printf("result %lld, best of 5: %.2f ms (%.2f ns per element)\n", result, best,
           best * 1e6 / v.size());
}
```

Output (one run of the `-O2` build on the session's cloud machine):

```text
result 5314224990, best of 5: 7.02 ms (0.70 ns per element)
```

Three interleaved runs of each build gave 104 to 105 ms at `-O0`, 17.5 to 17.8 ms at `-O1`, 7.0 to 10.1 ms at `-O2` and 4.1 to 4.2 ms at `-O3` (vectorized). At `-O0` every `v[i]`, `v.size()`, `clamp` and `scaled` is a real function call, so the loop is 10 to 15 times slower than at `-O2` in these runs. An earlier set of runs the same day was up to twice as slow at `-O2` and `-O3`: timings on a shared machine drift, so compare builds side by side.

#### Common mistakes

- **Benchmarking at `-O0`**: abstractions look expensive only because nothing is inlined.
- **Benchmarks the optimizer deletes**: if the result is unused, the work may vanish; consume results.
- **Relying on undefined behavior** such as signed overflow, which the optimizer assumes never happens.

Connects to: [how a CPU executes instructions](#/concept/arch.cpu-memory.how-a-cpu-executes-instructions), [SIMD basics](#/concept/arch.performance.simd-basics), [profiling](#/concept/arch.performance.profiling), [integer overflow and limits](#/concept/lang.general.integer-overflow-and-limits).

### questions
Q: What does inlining do, and why does it matter so much?
A: It replaces a function call with the function's body. That removes the call overhead and, more importantly, lets the compiler optimize the body together with its caller, folding constants and simplifying code across the old boundary.

Q: What is the difference between -O2 and -O3?
A: Both optimize fully for speed; -O3 adds more aggressive inlining, loop unrolling and vectorization, which can help numeric loops but also grows the code. Most projects ship -O2 and measure before switching.

Q: Why should you never benchmark a -O0 build?
A: At -O0 every variable lives in memory and every small function, including container accessors, is a real call, so the timings mostly measure overhead that an optimized build removes.

Q: How can undefined behavior interact with optimization?
A: The compiler assumes undefined behavior never happens and optimizes on that basis, for example treating x plus 1 greater than x as always true for signed integers. Code that relies on the undefined case can then behave unexpectedly.

## arch.performance.cost-of-system-calls-and-context-switches
name: "Cost of system calls and context switches"
importance: important
scope: "Cost of system calls and context switches"

### simple
When a program asks the operating system for something, such as reading a file, it makes a system call: the processor switches into the kernel, does the work and switches back. A context switch goes further and swaps one running thread for another. Both are far more expensive than an ordinary function call, like stepping out of your office to ask a colleague instead of looking something up on your desk.

### interview
- A **system call** switches the CPU into kernel mode and back: roughly 100 ns to a microsecond with modern mitigations, versus about 1 ns for a function call.
- Some calls avoid the kernel: `clock_gettime` and `gettimeofday` run in user space through the **vDSO**.
- A **context switch** saves one thread's registers, picks another thread, restores its state and may switch address spaces: a few µs directly, plus the indirect cost of cold caches and TLB.
- Waking a thread on another, idle CPU adds interrupt and wake-up latency: often tens of µs.
- Reduce the cost by batching work per call (large reads and writes, `writev`, `io_uring`), avoiding needless blocking, and keeping hot threads on their own cores.

### deep
#### Measuring them

```cpp
// Build with: g++ -std=c++20 -O2
template <class F> double nsPerOp(int ops, F f) {  // best of 5 batches
    double best = 1e18;
    for (int batch = 0; batch < 5; ++batch) {
        auto t0 = chrono::steady_clock::now();
        for (int i = 0; i < ops; ++i) f();
        best = min(best, chrono::duration<double, nano>(chrono::steady_clock::now() - t0).count());
    }
    return best / ops;
}

[[gnu::noinline]] long plainCall(long x) {
    asm volatile("");  // an empty function the compiler can't remove
    return x + 1;
}

void pin(int cpu) {
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(cpu, &set);
    pthread_setaffinity_np(pthread_self(), sizeof set, &set);
}

double pingPong(int cpuA, int cpuB) {  // one byte there and back through two pipes
    int there[2], back[2];
    if (pipe(there) || pipe(back)) abort();
    thread echo([&] {
        pin(cpuB);
        char c;
        while (read(there[0], &c, 1) == 1 && c && write(back[1], &c, 1) == 1) {}
    });
    pin(cpuA);
    char c = 1;
    double ns = nsPerOp(20'000, [&] {
        if (write(there[1], &c, 1) != 1 || read(back[0], &c, 1) != 1) abort();
    });
    c = 0;
    if (write(there[1], &c, 1) != 1) abort();
    echo.join();
    for (int fd : {there[0], there[1], back[0], back[1]}) close(fd);
    return ns;
}

int main() {
    long x = 0;
    timespec ts;
    int devNull = open("/dev/null", O_WRONLY);
    printf("function call:                     %7.1f ns\n",
           nsPerOp(10'000'000, [&] { x = plainCall(x); }));
    printf("clock_gettime (vDSO, no kernel):   %7.1f ns\n",
           nsPerOp(1'000'000, [&] { clock_gettime(CLOCK_MONOTONIC, &ts); }));
    printf("clock_gettime as a real syscall:   %7.1f ns\n",
           nsPerOp(200'000, [&] { syscall(SYS_clock_gettime, CLOCK_MONOTONIC, &ts); }));
    printf("getppid syscall:                   %7.1f ns\n",
           nsPerOp(200'000, [] { syscall(SYS_getppid); }));
    printf("write 1 byte to /dev/null:         %7.1f ns\n",
           nsPerOp(200'000, [&] { if (write(devNull, &x, 1) != 1) abort(); }));
    printf("pipe round trip, both on CPU 0:    %7.1f us\n", pingPong(0, 0) / 1000);
    printf("pipe round trip, CPUs 0 and 1:     %7.1f us\n", pingPong(0, 1) / 1000);
}
```

Output (one run on the session's cloud machine):

```text
function call:                         1.2 ns
clock_gettime (vDSO, no kernel):      30.2 ns
clock_gettime as a real syscall:     165.6 ns
getppid syscall:                     115.9 ns
write 1 byte to /dev/null:           128.7 ns
pipe round trip, both on CPU 0:        2.7 us
pipe round trip, CPUs 0 and 1:        23.4 us
```

#### Reading the results

Over five runs, with every line stable to within about 10%:

- **A function call** costs 1.2 to 1.4 ns; **entering the kernel** for a trivial call (`getppid`) 114 to 116 ns, about 90 times more. On this virtual machine the mitigations for speculative-execution attacks add part of that.
- **The vDSO**: `clock_gettime` answered in user space costs 28.6 to 30.2 ns, and the same call forced through the kernel 164 to 167 ns.
- **Context switches on one CPU**: a round trip through two pipes needs two switches and four system calls, 2.7 to 2.8 µs, so about 1.4 µs per switch including its share of the pipe calls.
- **Across CPUs**: the same round trip with the threads on different CPUs took 23.4 to 24.0 µs: each message wakes a sleeping CPU, and in a virtual machine that goes through the hypervisor. Keeping communicating threads together, or busy-polling on dedicated cores, avoids it.

#### Common mistakes

- **Writing one byte at a time**: at 129 ns per `write`, a million tiny writes cost 0.13 s; buffer them.
- **Timing with a syscall-based clock in a hot loop**, instead of the vDSO or the CPU's timestamp counter.
- **Counting only the direct cost** of a switch; the caches and TLB it disturbs cost more afterwards.

Connects to: [system calls](#/concept/os.fundamentals.system-calls), [context switching](#/concept/os.processes.context-switching), [kernel mode vs user mode](#/concept/os.fundamentals.kernel-mode-vs-user-mode), [low-latency techniques](#/concept/arch.performance.low-latency-techniques).

### questions
Q: Why is a system call more expensive than a function call?
A: The CPU must switch into kernel mode, save state, run the kernel's entry and security checks, do the work and return to user mode. That is roughly a hundred times the cost of a plain call, before any real work is done.

Q: What is the vDSO?
A: A small shared library the kernel maps into every process so that some calls, such as reading the clock, can be answered in user space without entering the kernel.

Q: What does a context switch cost?
A: Directly, about a microsecond or a few to save and restore state and run the scheduler. Indirectly, more: the new thread finds cold caches and TLB entries, and waking a thread on an idle CPU can add tens of microseconds.

Q: How do you reduce system call overhead in an I/O-heavy program?
A: Do more work per call: buffer small writes, read in large chunks, use vectored or batched interfaces such as writev or io_uring, and avoid polling calls that return nothing.

## arch.performance.low-latency-techniques
name: "Low-latency techniques"
importance: advanced
tracks: [quant]
scope: "avoiding allocation on hot paths, busy polling, kernel bypass idea"

### simple
Low-latency programming is about making the rare slow case rare enough, not just making the average fast. You prepare everything before the critical moment, avoid asking the operating system for anything on the hot path, and keep a core spinning so it can react at once. It is like a sprinter in the blocks: set before the gun, instead of tying their shoes when it fires.

### interview
- Measure **tail latency** (p99, p99.9, max), not just the average: rare slow events are what hurt.
- **No allocation on the hot path**: preallocate buffers and object pools, reuse memory; the allocator occasionally takes a slow path.
- **Pre-fault and lock memory**: touch pages at startup (and `mlock` them) so the first real message doesn't take page faults.
- **Busy polling**: a thread spinning on a flag reacts in well under a microsecond, where waking a blocked thread takes microseconds or more; the price is a whole core.
- **Pin threads** to isolated cores, avoid system calls and locks on the hot path, and use lock-free queues between threads.
- **Kernel bypass**: user-space networking (the NIC's queues mapped into the process) skips system calls and interrupts for each packet.

### deep
#### Measuring three techniques

```cpp
// Build with: g++ -std=c++20 -O2
using Clock = chrono::steady_clock;
double ns(Clock::duration d) { return chrono::duration<double, nano>(d).count(); }

void report(const char* name, vector<double> t) {
    sort(t.begin(), t.end());
    auto at = [&](double q) { return t[size_t(q * (t.size() - 1))]; };
    printf("%-34s median %7.0f  p99 %7.0f  p99.9 %8.0f  max %9.0f ns\n", name, at(0.5), at(0.99),
           at(0.999), t.back());
}

int main() {
    // 1. A message handler that allocates a buffer per message, or reuses a preallocated one.
    const int messages = 200'000;
    vector<double> alloc, pooled;
    vector<unique_ptr<char[]>> keep(1000);  // keep some buffers alive, as a real program would
    array<char, 4096> pool;
    for (int i = 0; i < messages; ++i) {
        size_t size = 64 + (i * 2654435761u) % 4032;
        auto t0 = Clock::now();
        auto buf = make_unique_for_overwrite<char[]>(size);  // no zeroing
        buf[0] = char(i);
        keep[i % keep.size()] = std::move(buf);  // frees whatever was there
        auto t1 = Clock::now();
        pool[i % size] = char(i);  // the pooled version just writes into reserved memory
        auto t2 = Clock::now();
        alloc.push_back(ns(t1 - t0)), pooled.push_back(ns(t2 - t1));
    }
    report("allocate per message", alloc);
    report("preallocated buffer", pooled);

    // 2. Wake-up latency: a thread waits for a flag, blocked on a condition variable or spinning.
    for (bool spin : {false, true}) {
        mutex m;
        condition_variable cv;
        atomic<long> sentAt{0};
        vector<double> wake;
        thread waiter([&] {
            for (int k = 0; k < 2000; ++k) {
                long t;
                if (spin) {
                    while ((t = sentAt.load(memory_order_acquire)) == 0) {}
                } else {
                    unique_lock lock(m);
                    cv.wait(lock, [&] { return sentAt.load() != 0; });
                    t = sentAt.load();
                }
                wake.push_back(double(Clock::now().time_since_epoch().count() - t));
                sentAt.store(0);
            }
        });
        for (int k = 0; k < 2000; ++k) {
            this_thread::sleep_for(50us);  // give the waiter time to go to sleep
            while (sentAt.load() != 0) {}  // previous message consumed
            {
                lock_guard lock(m);
                sentAt.store(Clock::now().time_since_epoch().count(), memory_order_release);
            }
            if (!spin) cv.notify_one();
        }
        waiter.join();
        report(spin ? "wake-up, spinning" : "wake-up, condition variable", wake);
    }

    // 3. Page faults: the first write to each page of fresh memory traps into the kernel.
    const size_t bytes = size_t(256) << 20;
    char* mem = static_cast<char*>(malloc(bytes));
    for (int pass = 1; pass <= 2; ++pass) {
        rusage before, after;
        getrusage(RUSAGE_SELF, &before);
        auto t0 = Clock::now();
        for (size_t i = 0; i < bytes; i += 4096) mem[i] = char(pass);
        double ms = ns(Clock::now() - t0) / 1e6;
        getrusage(RUSAGE_SELF, &after);
        printf("pass %d over 256 MiB: %6.1f ms, %6ld page faults\n", pass, ms,
               after.ru_minflt - before.ru_minflt);
    }
    free(mem);
}
```

Output (one run on the session's cloud machine; times include about 30 ns for reading the clock twice):

```text
allocate per message               median     117  p99     408  p99.9     3221  max    701555 ns
preallocated buffer                median      29  p99      54  p99.9      236  max    251777 ns
wake-up, condition variable        median   14011  p99   63154  p99.9   137062  max    249606 ns
wake-up, spinning                  median     212  p99   32395  p99.9   902246  max   1600803 ns
pass 1 over 256 MiB:  131.5 ms,  65535 page faults
pass 2 over 256 MiB:    1.5 ms,      0 page faults
```

#### Reading the results

Over five runs:

- **Allocation**: allocating and freeing a buffer per message had a median of 111 to 131 ns and a p99.9 of 2.0 to 3.2 µs; writing into a preallocated buffer had a median of 29 to 31 ns (mostly the clock reads) and a p99.9 of 0.2 to 0.4 µs. The allocator is fast on average, but once in a thousand messages it is about twenty times slower.
- **Wake-up**: a thread blocked on a condition variable woke a median 12 to 14 µs after the signal; a spinning thread saw the flag after 212 to 419 ns. Their tails on this shared virtual machine were ragged (p99 of 7 to 35 µs even when spinning), because the host sometimes deschedules the virtual CPU; dedicated machines isolate cores so that a spinner is never interrupted.
- **Page faults**: the first write to each page of 256 MiB took 125 to 141 ms for 65,535 faults, about 2 µs per page; the second pass took under 2 ms with no faults. Touch memory at startup, not on the first message.

#### Kernel bypass

Every packet received through the normal network stack costs an interrupt, kernel processing and a system call to copy it out. Kernel-bypass stacks map the network card's receive and transmit queues into the process, which polls them in a loop, so a packet can be handled without entering the kernel at all. It trades generality and a dedicated core for microseconds.

#### Common mistakes

- **Optimizing the median** while the p99.9 comes from a page fault or a lock.
- **Spinning on more threads than cores**: spinners then steal time from each other and latency gets worse.
- **Logging on the hot path**: formatting and writing belong on another thread.

Connects to: [cost of system calls and context switches](#/concept/arch.performance.cost-of-system-calls-and-context-switches), [how malloc works](#/concept/os.memory.how-malloc-works), [lock-free data structures](#/concept/conc.atomics.lock-free-data-structures), [virtual memory and demand paging](#/concept/os.memory.virtual-memory-and-demand-paging).

### questions
Q: Why do low-latency systems avoid heap allocation on the hot path?
A: The allocator is usually fast but occasionally takes a slow path, such as asking the kernel for memory or consolidating free lists, which shows up in the tail latency. Preallocating and reusing buffers makes the cost small and predictable.

Q: What is busy polling, and what does it cost?
A: A thread repeatedly checks a flag or queue instead of blocking, so it reacts within a fraction of a microsecond rather than waiting to be woken by the scheduler. It burns a whole core the entire time.

Q: Why touch memory at startup?
A: The first write to each page causes a page fault that the kernel must handle, a microsecond or more each. Touching (and locking) the memory in advance moves that cost out of the latency-critical path.

Q: What is kernel bypass?
A: Letting a process read and write the network card's queues directly from user space, usually by polling, so packets are handled without interrupts or system calls. It gives the lowest latency at the cost of dedicated cores and a special networking stack.

Q: Why measure p99.9 and not just the average?
A: In latency-sensitive systems the rare slow events decide outcomes, and they are invisible in the average. A handler with a 100 ns median and a 3 µs p99.9 is slow once in a thousand messages.
