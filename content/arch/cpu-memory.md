---
topic: arch.cpu-memory
name: "CPU and memory hierarchy"
subject: arch
order: 2
prereqs: [arch.representation]
---

## arch.cpu-memory.how-a-cpu-executes-instructions
name: "How a CPU executes instructions"
importance: important
scope: "fetch, decode, execute, registers"

### simple
A CPU runs a program by repeating one small loop billions of times a second: fetch the next instruction from memory, decode what it asks for, execute it, and move on. It keeps the numbers it is working on in a handful of very fast storage slots called registers. It is like a cook following a recipe card by card: read the step, understand it, do it, turn to the next card.

### interview
- The **program counter** holds the address of the next instruction. Each cycle of the loop: **fetch** the instruction, **decode** it (which operation, which registers), **execute** it (in the ALU, or as a memory access), **write back** the result, then advance the program counter or jump.
- **Registers** are the CPU's working storage: x86-64 has 16 general-purpose 64-bit registers plus vector registers. Everything else lives in memory and must be loaded.
- The **instruction set architecture** (x86-64, ARM64, RISC-V) is the contract between compiled code and hardware; the microarchitecture decides how fast it runs.
- A branch or jump just writes a new address into the program counter; loops and `if` compile to compare-and-branch instructions.
- Real cores overlap these steps (pipelining) and run several instructions at once (superscalar, out of order), but the result must look as if they ran one by one.

### deep
#### A toy CPU

The program below is a whole CPU in miniature: 4 registers, a program counter and 32-bit instruction words whose top byte is the operation and whose other bytes name registers or small constants. The machine code sums 1 to 5.

```cpp
// A toy CPU: 4 registers, a program counter, and 32-bit instructions laid out as
// opcode (8 bits) | a (8) | b (8) | c (8).
enum Op : uint8_t { LOADI, ADD, ADDI, BNE, HALT };
uint32_t encode(Op op, int a = 0, int b = 0, int c = 0) {
    return uint32_t(op) << 24 | uint32_t(a) << 16 | uint32_t(b) << 8 | uint32_t(c);
}

int main() {
    vector<uint32_t> memory = {        // sum of 1..5
        encode(LOADI, 0, 0),           // 0: r0 = 0       (sum)
        encode(LOADI, 1, 1),           // 1: r1 = 1       (i)
        encode(LOADI, 2, 6),           // 2: r2 = 6       (limit)
        encode(ADD, 0, 0, 1),          // 3: r0 = r0 + r1
        encode(ADDI, 1, 1, 1),         // 4: r1 = r1 + 1
        encode(BNE, 1, 2, 3),          // 5: if r1 != r2 goto 3
        encode(HALT),                  // 6: stop
    };
    int64_t reg[4] = {};
    uint32_t pc = 0;
    int executed = 0;
    for (bool running = true; running; ++executed) {
        uint32_t word = memory[pc];                      // fetch
        Op op = Op(word >> 24);                          // decode the fields
        int a = word >> 16 & 0xFF, b = word >> 8 & 0xFF, c = word & 0xFF;
        uint32_t next = pc + 1;
        switch (op) {                                    // execute and write back
            case LOADI: reg[a] = b; break;
            case ADD: reg[a] = reg[b] + reg[c]; break;
            case ADDI: reg[a] = reg[b] + c; break;
            case BNE: if (reg[a] != reg[b]) next = c; break;
            case HALT: running = false; break;
        }
        if (executed < 8 || !running)
            printf("step %2d: pc %u, word 0x%08X -> r0 %lld, r1 %lld\n", executed + 1, pc, word,
                   (long long)reg[0], (long long)reg[1]);
        pc = next;
    }
    printf("%d instructions executed, r0 = %lld\n", executed, (long long)reg[0]);
}
```

Output:

```text
step  1: pc 0, word 0x00000000 -> r0 0, r1 0
step  2: pc 1, word 0x00010100 -> r0 0, r1 1
step  3: pc 2, word 0x00020600 -> r0 0, r1 1
step  4: pc 3, word 0x01000001 -> r0 1, r1 1
step  5: pc 4, word 0x02010101 -> r0 1, r1 2
step  6: pc 5, word 0x03010203 -> r0 1, r1 2
step  7: pc 3, word 0x01000001 -> r0 3, r1 2
step  8: pc 4, word 0x02010101 -> r0 3, r1 3
step 19: pc 6, word 0x04000000 -> r0 15, r1 6
19 instructions executed, r0 = 15
```

Each step fetches a word, pulls the fields out with shifts and masks, and executes. The loop body (steps 4 to 6) runs five times; the branch at address 5 sends the program counter back to 3 until `r1` reaches 6, for 19 instructions in all.

#### The same loop on a real CPU

A C++ function that sums 1 to `n`, compiled by g++ 13 with `-O1` for x86-64 (Intel syntax, directives removed):

```text
_Z5sumTol:
	test	rdi, rdi
	jle	.L4
	add	rdi, 1
	mov	eax, 1
	mov	edx, 0
.L3:
	add	rdx, rax
	add	rax, 1
	cmp	rax, rdi
	jne	.L3
.L1:
	mov	rax, rdx
	ret
.L4:
	mov	edx, 0
	jmp	.L1
```

`n` arrives in register `rdi`, `rax` plays the role of `i` and `rdx` the sum; the four instructions at `.L3` are the loop, ending in a compare and a conditional jump, exactly like the toy machine's `ADD`, `ADDI` and `BNE`. The result is returned in `rax`.

#### Common mistakes

- **Thinking a line of C++ is one instruction.** A statement can compile to none (optimized away) or to dozens.
- **Forgetting that memory is not a register.** Every value outside the few registers costs a load, which is why [the memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy) matters.

Connects to: [pipelining and hazards](#/concept/arch.cpu-memory.pipelining-and-hazards), [binary, hex and two's complement](#/concept/arch.representation.binary-hex-and-twos-complement), [compiler optimizations](#/concept/arch.performance.compiler-optimizations), [interrupts, traps and exceptions](#/concept/os.fundamentals.interrupts-traps-and-exceptions).

### questions
Q: What are the steps of the instruction cycle?
A: Fetch the instruction at the address in the program counter, decode it into an operation and operands, execute it, write the result back to a register or memory, and move the program counter to the next instruction or to a jump target.

Q: What is a register and why does it matter?
A: A small, very fast storage slot inside the CPU that instructions operate on directly. There are only a few of them, so compilers work hard to keep hot values in registers and avoid loads from memory.

Q: What is the difference between an instruction set architecture and a microarchitecture?
A: The instruction set is the contract: the instructions, registers and their meaning, such as x86-64 or ARM64. The microarchitecture is one implementation of it, with its own pipeline, caches and predictors; the same program runs on both but at different speeds.

Q: How does a loop look at the machine level?
A: As a block of instructions ending in a compare and a conditional branch that jumps back to the start of the block while the condition holds.

## arch.cpu-memory.pipelining-and-hazards
name: "Pipelining and hazards"
importance: important
prereqs: [arch.cpu-memory.how-a-cpu-executes-instructions]
scope: "data, control and structural hazards"

### simple
A pipelined CPU works like an assembly line: while one instruction is being executed, the next is being decoded and the one after that fetched. Ideally one instruction finishes every cycle even though each takes several. Hazards are the moments the line must pause, for example when an instruction needs a result that the one ahead hasn't produced yet.

### interview
- Classic 5-stage pipeline: fetch (F), decode and read registers (D), execute (X), memory (M), write back (W). Up to 5 instructions in flight, ideally one completing per cycle.
- **Data hazards** (read after write): an instruction needs a value still in the pipeline. **Forwarding** passes an ALU result straight to the next instruction; a load's value arrives a cycle later, so the next instruction must still stall one cycle (**load-use** hazard).
- **Control hazards**: after a branch, which instruction comes next isn't known until the branch resolves. Guess (predict), and flush the wrong instructions if the guess was wrong.
- **Structural hazards**: two instructions need the same hardware at once, such as one memory port for fetch and data; solved with duplicated resources (separate instruction and data caches).
- Deeper pipelines allow higher clock speeds but make each flush more costly.

### deep
#### Worked example

A simulator of the 5-stage pipeline runs six instructions: a load, an add that needs the loaded value, a subtract that needs the add, a branch that needs the subtract (taken), and two instructions at the branch target. It prints the pipeline diagram with forwarding and counts cycles under three designs.

```cpp
// A classic 5-stage pipeline: F(etch) D(ecode) X (execute) M(emory) W(rite back).
struct Ins { const char* text; int dst, src1, src2; bool load, takenBranch; };

// Runs the program and returns the total cycles; draws the pipeline if asked ("-" = stalled).
int run(const vector<Ins>& prog, bool forwarding, bool predictTaken, bool draw) {
    vector<int> ex(prog.size());
    int nextFetch = 1;
    for (size_t i = 0; i < prog.size(); ++i) {
        int f = nextFetch;
        int d = max(f + 1, i ? ex[i - 1] : 0);        // enter D once the one ahead has left it
        int e = d + 1;
        for (size_t p = 0; p < i; ++p) {                // wait for operands (RAW hazards)
            if (prog[p].dst != prog[i].src1 && prog[p].dst != prog[i].src2) continue;
            if (!forwarding) e = max(e, ex[p] + 3);     // read in D during the producer's W
            else e = max(e, ex[p] + (prog[p].load ? 2 : 1));  // forwarded from M or from X
        }
        ex[i] = e;
        nextFetch = f + 1;
        if (prog[i].takenBranch && !predictTaken) nextFetch = e + 1;  // resolved in X: refetch
        if (draw) {
            string row(e + 3, '-');
            fill(row.begin(), row.begin() + f, ' ');
            row[f] = 'F', row[d] = 'D', row[e] = 'X', row[e + 1] = 'M', row[e + 2] = 'W';
            printf("%-18s|%s\n", prog[i].text, row.substr(1).c_str());
        }
    }
    return ex.back() + 2;  // the cycle of the last write back
}

int main() {
    vector<Ins> prog = {
        {"lw  r1, 0(r2)", 1, 2, -1, true, false},
        {"add r3, r1, r4", 3, 1, 4, false, false},   // needs r1 from the load
        {"sub r5, r3, r6", 5, 3, 6, false, false},   // needs r3
        {"beq r5, r0, L", -1, 5, 0, false, true},    // taken branch
        {"L: add r7, r8, r9", 7, 8, 9, false, false},
        {"or  r10, r7, r1", 10, 7, 1, false, false}, // needs r7
    };
    puts("with forwarding, predicting not taken (cycles 1, 2, 3, ...):");
    int cycles = run(prog, true, false, true);
    printf("no forwarding:                   %d cycles\n", run(prog, false, false, false));
    printf("forwarding:                      %d cycles\n", cycles);
    printf("forwarding, branch predicted:    %d cycles\n", run(prog, true, true, false));
    printf("no hazards at all would take:    %zu cycles\n", prog.size() + 4);
}
```

Output:

```text
with forwarding, predicting not taken (cycles 1, 2, 3, ...):
lw  r1, 0(r2)     |FDXMW
add r3, r1, r4    | FD-XMW
sub r5, r3, r6    |  F-DXMW
beq r5, r0, L     |   F-DXMW
L: add r7, r8, r9 |       FDXMW
or  r10, r7, r1   |        FDXMW
no forwarding:                   20 cycles
forwarding:                      13 cycles
forwarding, branch predicted:    11 cycles
no hazards at all would take:    10 cycles
```

#### Reading the diagram

- **Load-use stall**: the `lw` produces `r1` at the end of M (cycle 4), so `add` can't execute until cycle 5: one bubble (`-`) in its decode stage. The `sub` and `beq` behind it are held up by one cycle each.
- **Forwarding** lets `sub` use `add`'s result in the very next cycle, and `or` use `L: add`'s.
- **Control hazard**: the branch resolves in X at cycle 7. Predicting "not taken", the pipeline fetched the next two sequential instructions, which are thrown away (not shown), so the target is fetched only in cycle 8: two lost cycles.
- **Totals**: 20 cycles without forwarding (every dependent instruction waits for write back), 13 with forwarding, 11 if the branch is also predicted correctly, against 10 for a pipeline with no hazards (6 instructions plus 4 cycles to fill).

#### Common mistakes

- **Assuming forwarding removes every stall.** A load's value is ready only after the memory stage, so an immediately dependent instruction still waits.
- **Forgetting the cost of a wrong guess.** It grows with pipeline depth; modern cores lose roughly 15 to 25 cycles on a mispredicted branch.

Connects to: [branch prediction](#/concept/arch.cpu-memory.branch-prediction), [out-of-order and superscalar execution](#/concept/arch.cpu-memory.out-of-order-and-superscalar-execution), [how a CPU executes instructions](#/concept/arch.cpu-memory.how-a-cpu-executes-instructions).

### questions
Q: What is instruction pipelining?
A: Splitting instruction execution into stages, such as fetch, decode, execute, memory and write back, and working on a different instruction in each stage at once. Throughput approaches one instruction per cycle even though each instruction takes several cycles.

Q: What are the three kinds of pipeline hazard?
A: Data hazards, when an instruction needs a result not yet produced; control hazards, when the next instruction depends on an unresolved branch; and structural hazards, when two instructions need the same hardware in the same cycle.

Q: What is forwarding, and which hazard does it not fully fix?
A: Sending a result from a later pipeline stage straight to an instruction that needs it, instead of waiting for write back. It cannot fix a load followed immediately by a use of the loaded value, because the value arrives only after the memory stage, so one stall remains.

Q: Why does a taken branch cost cycles in a simple pipeline?
A: The branch is resolved only in the execute stage, and the instructions fetched after it in the meantime may be the wrong ones. They are flushed and fetching restarts at the target, losing a few cycles unless the branch was predicted correctly.

## arch.cpu-memory.branch-prediction
name: "Branch prediction"
importance: important
prereqs: [arch.cpu-memory.pipelining-and-hazards]
scope: "why unpredictable branches are slow"

### simple
A CPU doesn't wait to find out which way an `if` goes: it guesses from the branch's history and keeps working on the guessed path. When the guess is right, the branch is almost free; when it is wrong, the work is thrown away and the pipeline restarts. It is like a waiter who starts pouring your usual drink as you walk in: great if you order it, wasted if you don't.

### interview
- A branch predictor guesses each conditional branch's direction (and target) before it is resolved, based on its history and the history of recent branches.
- A misprediction flushes the speculative work: roughly 15 to 25 cycles on modern cores.
- Predictable patterns (always taken, loops, sorted data) are nearly free; random, data-dependent branches are mispredicted about half the time.
- Fixes: make data predictable (sort, partition), or remove the branch (conditional moves, masks, arithmetic), which compilers often do themselves.
- `[[likely]]` and `[[unlikely]]` guide code layout, not the hardware predictor.

### deep
#### Worked example

Sum the bytes that are at least 128 in 32 MiB of random bytes, once in random order and once sorted. The branch `x >= 128` is a coin flip in random order and changes direction only once in sorted order. A model of the simplest predictor, a 2-bit saturating counter, shows the misprediction rates; the timings show the cost.

```cpp
// Build with: g++ -std=c++20 -O2 -fno-tree-vectorize -fno-if-conversion -fno-if-conversion2
// Sum the values >= 128 in 32 MiB of random bytes, unsorted then sorted.
long long sumBig(const vector<uint8_t>& v) {
    long long s = 0;
    for (uint8_t x : v)
        if (x >= 128) s += x;
    return s;
}
long long sumBigBranchless(const vector<uint8_t>& v) {
    long long s = 0;
    for (uint8_t x : v) s += x & -(x >> 7);  // mask is all ones when x >= 128, else zero
    return s;
}

// A 2-bit saturating counter, the textbook predictor: predict taken when the counter >= 2.
double mispredictRate(const vector<uint8_t>& v) {
    int counter = 2;
    size_t wrong = 0;
    for (uint8_t x : v) {
        bool taken = x >= 128;
        wrong += (counter >= 2) != taken;
        counter = taken ? min(counter + 1, 3) : max(counter - 1, 0);
    }
    return double(wrong) / v.size();
}

int main() {
    vector<uint8_t> data(32 << 20);
    mt19937_64 rng(2026);
    for (auto& x : data) x = rng() & 0xFF;
    vector<uint8_t> sorted = data;
    sort(sorted.begin(), sorted.end());
    printf("2-bit counter mispredicts: random %.1f%%, sorted %.4f%%\n", 100 * mispredictRate(data),
           100 * mispredictRate(sorted));
    for (auto [name, v] : {pair{"random", &data}, pair{"sorted", &sorted}})
        for (auto f : {sumBig, sumBigBranchless}) {
            auto t0 = chrono::steady_clock::now();
            long long s = f(*v);
            double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
            printf("%s, %-10s %6.1f ms (sum %lld)\n", name, f == sumBig ? "branch:" : "branchless:",
                   ms, s);
        }
}
```

Output (one run on the session's cloud machine, an x86-64 virtual machine):

```text
2-bit counter mispredicts: random 50.0%, sorted 0.0000%
random, branch:     167.4 ms (sum 3213018109)
random, branchless:   17.8 ms (sum 3213018109)
sorted, branch:      23.2 ms (sum 3213018109)
sorted, branchless:   18.0 ms (sum 3213018109)
```

#### Reading the results

- **The model**: a 2-bit counter guesses wrong half the time on random data and almost never on sorted data (it can miss only at the single switch).
- **The cost**: with the branch kept, random order took 162 to 167 ms over five runs and sorted order 20 to 26 ms. About 16.8 million mispredicted branches cost roughly 140 ms, about 8 ns each.
- **Branchless code doesn't care about order**: 17.6 to 19.9 ms either way. The mask `-(x >> 7)` is all ones for $x \ge 128$ and zero otherwise, so there is nothing to predict.
- **Why the unusual build flags**: at plain `-O2`, g++ 13 turns this `if` into a conditional move by itself, and both orders take the same time (34 to 37 ms in three runs). The flags keep the branch so its cost can be measured. Check the compiler's output before rewriting code by hand.

#### Common mistakes

- **Optimizing branches blindly.** Predictable branches are cheap; measure first.
- **Assuming branchless is always faster.** When a branch is predictable it skips work that branchless code always does.

Connects to: [pipelining and hazards](#/concept/arch.cpu-memory.pipelining-and-hazards), [profiling](#/concept/arch.performance.profiling), [compiler optimizations](#/concept/arch.performance.compiler-optimizations), [bitwise operators](#/concept/dsa.bits.bitwise-operators).

### questions
Q: Why can sorting an array make a loop over it faster, even though the work is the same?
A: If the loop contains a data-dependent branch, sorting makes the branch go one way for a long stretch and then the other, which the predictor learns. On random data it mispredicts about half the time, and each misprediction flushes the pipeline.

Q: What happens on a branch misprediction?
A: The CPU has already fetched and started executing instructions on the guessed path. When the branch resolves the other way, that work is discarded and fetching restarts at the correct target, costing roughly 15 to 25 cycles on modern cores.

Q: How can you remove an unpredictable branch?
A: Compute both outcomes and select with arithmetic, a mask or a conditional move, so no guess is needed. Compilers often do this themselves at higher optimization levels, so look at the generated code first.

Q: What does a 2-bit saturating counter predictor do?
A: It keeps a small counter per branch, counting up when taken and down when not, clamped between 0 and 3, and predicts taken when the counter is 2 or 3. A single surprise doesn't flip its prediction, which suits loop branches.

## arch.cpu-memory.memory-hierarchy
name: "Memory hierarchy"
importance: must
scope: "registers, L1, L2, L3, RAM, disk, and their latencies"

### simple
Memory comes in layers: a few tiny, very fast storage slots right inside the processor, then small fast caches, then large but slow main memory, then disks that are larger and slower still. The processor keeps recently used data in the fast layers, so most accesses never go all the way down. It is like keeping your tools on the desk, spare parts in a drawer, and the rest in a storeroom across the building.

### interview
- Registers (fastest, a few dozen) → L1 cache (tens of KiB per core, about 1 ns) → L2 (hundreds of KiB to a few MiB per core, a few ns) → L3 (MiB to hundreds of MiB, shared, tens of ns) → RAM (GiB, about 100 ns) → SSD (tens of µs) → hard disk (milliseconds).
- Each level is larger, cheaper per byte and slower than the one above; the gap between CPU speed and RAM latency is what caches hide.
- Caches work because of **locality**: programs reuse recent data (temporal) and data near it (spatial).
- Data moves between levels in **cache lines** (64 bytes on x86-64), not single bytes.
- Performance rule: keep the working set small and access it predictably; one miss to RAM costs as much as hundreds of simple instructions.
- The exact sizes and latencies differ between processors; measure on the machine that matters.

### deep
#### Intuition

A processor can do several operations per nanosecond, but fetching a byte from RAM takes around 100 ns. Caches close the gap by keeping copies of recently used memory close to the core. If the data you need fits in a level, you pay that level's latency; once it spills out, you pay the next level down.

#### Measuring the hierarchy

To expose latency, the program follows a random cycle of pointers: each load's address comes from the previous load, so nothing can overlap and prefetchers can't guess the next address. Changing the size of the cycle changes which level it fits in.

```cpp
// Build with: g++ -std=c++20 -O2
// Memory latency by working-set size: follow a random cycle of pointers, so every load depends
// on the one before and the hardware can't prefetch the next address.
double nsPerLoad(size_t bytes) {
    size_t n = bytes / sizeof(size_t);
    vector<size_t> order(n), next(n);
    iota(order.begin(), order.end(), 0);
    mt19937_64 rng(2026);
    for (size_t i = n - 1; i > 0; --i) swap(order[i], order[rng() % (i + 1)]);  // Fisher-Yates
    for (size_t i = 0; i < n; ++i) next[order[i]] = order[(i + 1) % n];         // one big cycle
    size_t p = 0, steps = 10'000'000;
    for (size_t i = 0; i < n; ++i) p = next[p];  // warm up
    double best = 1e18;
    for (int pass = 0; pass < 3; ++pass) {  // best of 3: the machine is shared
        auto t0 = chrono::steady_clock::now();
        for (size_t i = 0; i < steps; ++i) p = next[p];
        best = min(best, chrono::duration<double, nano>(chrono::steady_clock::now() - t0).count());
    }
    if (p == size_t(-1)) puts("");  // use p so the loop is not removed
    return best / steps;
}

int main() {
    for (size_t kib : {16, 32, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576})
        printf("%8zu KiB: %6.1f ns per load\n", kib, nsPerLoad(kib * 1024));
}
```

Output (one run on the session's cloud machine, an x86-64 virtual machine reporting 48 KiB of L1 data cache and 2 MiB of L2 per core and 260 MiB of shared L3):

```text
      16 KiB:    1.5 ns per load
      32 KiB:    1.5 ns per load
      64 KiB:    2.7 ns per load
     256 KiB:    4.3 ns per load
    1024 KiB:    7.6 ns per load
    4096 KiB:   24.8 ns per load
   16384 KiB:   44.5 ns per load
   65536 KiB:  117.0 ns per load
  262144 KiB:  142.3 ns per load
 1048576 KiB:  194.1 ns per load
```

#### Reading the results

Over five runs:

| Working set | ns per load | Level |
|---|---|---|
| 16 to 32 KiB | 1.5 to 1.9 | L1 |
| 64 KiB to 1 MiB | 2.6 to 7.6 | L2 |
| 4 MiB | 23.8 to 26.1 | L3 |
| 16 MiB | 44 to 164 | L3, with address translation misses and neighbors sharing it |
| 64 to 256 MiB | 117 to 190 | mostly RAM |
| 1 GiB | 191 to 336 | RAM plus page-table walks |

Each step down costs several times the one above. Beyond a few MiB the numbers also include misses in the TLB, the cache of address translations, and they vary from run to run because this virtual machine shares its L3 and memory with others. The random order is the worst case: sequential access runs much faster because the hardware prefetches the next lines (see [cache lines and locality](#/concept/arch.cpu-memory.cache-lines-and-locality)).

#### Typical orders of magnitude

Register: under 1 ns. L1: about 1 ns. L2: a few ns. L3: 10 to 40 ns. RAM: about 100 ns. SSD read: tens of µs. Hard disk seek: several ms. These are commonly quoted approximations, not properties of any one chip.

#### Common mistakes

- **Counting operations and ignoring memory.** An $O(n)$ loop over a linked list can be slower than an $O(n \log n)$ sort of an array.
- **Benchmarking with data that fits in L1** and expecting the same speed at full size.

Connects to: [cache lines and locality](#/concept/arch.cpu-memory.cache-lines-and-locality), [paging](#/concept/os.memory.paging), [TLB](#/concept/os.memory.tlb), [latency numbers](#/concept/arch.performance.latency-numbers-every-programmer-should-know).

### questions
Q: Describe the memory hierarchy and rough latencies.
A: Registers take less than a nanosecond, L1 cache about 1 ns, L2 a few ns, L3 tens of ns, RAM around 100 ns, an SSD tens of microseconds and a hard disk several milliseconds. Each level is larger and slower than the one above it.

Q: Why do caches work?
A: Because programs show locality: they reuse data they touched recently and touch data near it. Keeping recently used lines close to the core means most accesses are served quickly.

Q: How can you measure memory latency in a program?
A: Chase pointers through a random cycle so that each load depends on the previous one and cannot be prefetched, then divide the time by the number of loads. Varying the size of the cycle shows each cache level.

Q: Why is traversing a linked list often slower than traversing an array of the same length?
A: List nodes can be scattered through memory, so each step may miss the cache, and the next address is known only after the current load finishes. An array is contiguous, so each cache line brings several elements and the prefetcher can fetch ahead.

Q: What is the working set, and why does its size matter?
A: The data a program touches repeatedly during some phase. If it fits in a cache level, accesses cost that level's latency; once it grows past it, many accesses fall to the next, slower level.

## arch.cpu-memory.cache-lines-and-locality
name: "Cache lines and locality"
importance: must
prereqs: [arch.cpu-memory.memory-hierarchy]
scope: "spatial and temporal locality, row-major traversal"

### simple
Caches don't fetch single bytes from memory; they fetch whole blocks of 64 bytes, called cache lines. Reading one number brings its neighbors along for free, so code that walks through memory in order runs much faster than code that jumps around. It is like buying eggs by the dozen: if you need several, one trip to the shop covers them all.

### interview
- A **cache line** is the unit of transfer between memory levels: 64 bytes on x86-64 and most ARM cores. Touching one byte loads the whole line.
- **Spatial locality**: using data near what you just used (arrays, sequential scans). **Temporal locality**: using the same data again soon (loops over a small working set).
- C and C++ arrays are **row-major**: `a[i][j]` and `a[i][j + 1]` are adjacent. Loop over the last index innermost.
- Hardware **prefetchers** detect sequential and strided streams and fetch lines ahead; random access defeats them.
- Arrays of values beat node-based structures for scans; structs laid out so hot fields share lines help too.
- Two threads writing different variables in one line slow each other down (**false sharing**).

### deep
#### Intuition

A cache miss is expensive, but everything else in the line comes with it. Code that uses all 64 bytes of each line it brings in pays one miss per 16 ints; code that uses one int per line pays one miss per int.

#### Worked example

First, a 4096 × 4096 matrix of ints (64 MiB) is summed row by row and then column by column. Second, the program walks a random cycle through 8M lines (512 MiB), 2M steps, and at each line also reads $k$ of its other 15 ints.

```cpp
// Build with: g++ -std=c++20 -O2
struct alignas(64) Line { uint32_t next; int value[15]; };  // exactly one 64-byte cache line

int main() {
    printf("cache line: %ld bytes (sysconf), %zu (hardware_destructive_interference_size)\n",
           sysconf(_SC_LEVEL1_DCACHE_LINESIZE), hardware_destructive_interference_size);

    // Sum a 4096 x 4096 matrix of ints (64 MiB) row by row, then column by column.
    const int n = 4096;
    vector<int> m(size_t(n) * n, 1);
    long long sum = 0;
    auto t0 = chrono::steady_clock::now();
    for (int i = 0; i < n; ++i)
        for (int j = 0; j < n; ++j) sum += m[size_t(i) * n + j];
    auto t1 = chrono::steady_clock::now();
    for (int j = 0; j < n; ++j)
        for (int i = 0; i < n; ++i) sum += m[size_t(i) * n + j];
    auto t2 = chrono::steady_clock::now();
    double rows = chrono::duration<double, milli>(t1 - t0).count();
    double cols = chrono::duration<double, milli>(t2 - t1).count();
    printf("rows %.1f ms, columns %.1f ms (%.1fx slower), sum %lld\n", rows, cols, cols / rows,
           sum);

    // Walk 2M steps of a random cycle through 8M lines (512 MiB), bigger than every cache;
    // at each line, also read k of its other ints.
    const size_t count = 1 << 23, steps = 1 << 21;
    vector<Line> lines(count);
    vector<uint32_t> order(count);
    iota(order.begin(), order.end(), 0);
    mt19937_64 rng(2026);
    for (size_t i = count - 1; i > 0; --i) swap(order[i], order[rng() % (i + 1)]);
    for (size_t i = 0; i < count; ++i) {
        lines[order[i]].next = order[(i + 1) % count];
        fill(begin(lines[i].value), end(lines[i].value), 1);
    }
    for (int k : {0, 1, 3, 7, 15}) {
        double best = 1e18;  // best of 3 passes: the machine is shared, so take the quietest
        for (int pass = 0; pass < 3; ++pass) {
            uint32_t p = 0;
            auto s0 = chrono::steady_clock::now();
            for (size_t step = 0; step < steps; ++step) {
                for (int j = 0; j < k; ++j) sum += lines[p].value[j];
                p = lines[p].next;  // the next line depends on this one: no overlap, no prefetch
            }
            auto s1 = chrono::steady_clock::now();
            best = min(best, chrono::duration<double, nano>(s1 - s0).count());
        }
        printf("read %2d more ints of each line: %5.1f ns per line\n", k, best / steps);
    }
    printf("(checksum %lld)\n", sum);
}
```

Output (one run on the session's cloud machine):

```text
cache line: 64 bytes (sysconf), 64 (hardware_destructive_interference_size)
rows 10.9 ms, columns 155.0 ms (14.2x slower), sum 33554432
read  0 more ints of each line: 174.0 ns per line
read  1 more ints of each line: 171.2 ns per line
read  3 more ints of each line: 191.5 ns per line
read  7 more ints of each line: 205.6 ns per line
read 15 more ints of each line: 211.9 ns per line
(checksum 197132288)
```

#### Reading the results

- **Rows against columns**: over five runs the row loop took 10.0 to 12.7 ms and the column loop 146 to 167 ms, 13 to 15 times slower. Going down a column, consecutive accesses are 16 KiB apart, so every access touches a new line (and often a new page), and by the time the loop returns to a line for the next column it has been evicted.
- **Whole lines cost the same as single ints**: each step cost 164 to 187 ns when reading nothing else from the line, and 184 to 212 ns when reading all 15 other ints: 7 to 22% more for 16 times the data. The cost is the trip to memory for the line; the other ints are already in L1.
- The line size, 64 bytes, is what both `sysconf` and the C++17 constant report.

#### Common mistakes

- **Swapping loop order in matrix code.** The innermost loop should run along the last index.
- **Storing hot data behind pointers** (a vector of pointers to objects) when a vector of objects would keep it contiguous.
- **Padding everything to 64 bytes.** It helps only against false sharing between threads; elsewhere it wastes cache.

Connects to: [matrix traversal](#/concept/dsa.arrays.matrix-traversal), [false sharing and cache-line padding](#/concept/conc.atomics.false-sharing-and-cache-line-padding), [TLB](#/concept/os.memory.tlb), [data-oriented design](#/concept/arch.performance.data-oriented-design).

### questions
Q: What is a cache line and why does it matter for performance?
A: The fixed-size block, 64 bytes on x86-64, in which data moves between memory and caches. Reading one byte loads the whole line, so using all of it makes each miss worthwhile, while touching one value per line wastes most of the transfer.

Q: Why is iterating over a 2D array by columns slower than by rows in C++?
A: C++ stores arrays row by row, so walking a column jumps a whole row between accesses and touches a new line every time. By the time the next column needs the same lines, they have been evicted; walking a row uses every element of each line.

Q: What are spatial and temporal locality?
A: Spatial locality is accessing data close to recently accessed data, such as the next array element. Temporal locality is accessing the same data again soon. Caches exploit both.

Q: Why do hardware prefetchers help arrays but not linked lists?
A: A prefetcher recognizes sequential or regularly strided addresses and loads upcoming lines before they are requested. A linked list's next address is known only after the current node arrives and is usually unrelated to it, so there is no pattern to follow.

Q: What is false sharing?
A: Two threads writing different variables that happen to sit in the same cache line. Each write takes the line away from the other core, so the line bounces between them and both slow down, even though they share no data.

## arch.cpu-memory.cache-associativity-and-misses
name: "Cache associativity and misses"
importance: important
prereqs: [arch.cpu-memory.cache-lines-and-locality]
scope: "compulsory, capacity, conflict misses"

### simple
A cache is divided into small groups called sets, and each memory line may only be stored in one particular set. If too many lines that your program uses fall into the same set, they keep pushing each other out even when the rest of the cache is empty. It is like a coat check with numbered hooks where your ticket decides the hook: a crowd with the same number fights over one hook while others stay empty.

### interview
- An **$N$-way set-associative** cache has sets of $N$ lines; a line's address picks its set (usually by the bits just above the line offset). Direct-mapped is 1-way; fully associative is one set.
- Misses come in three kinds (the "3 Cs"): **compulsory** (the first touch of a line), **capacity** (the working set is bigger than the cache), **conflict** (too many lines map to the same set, though the cache has room).
- Power-of-two strides are the classic cause of conflict misses: addresses 4096 bytes apart land in the same set of a typical L1.
- Fixes: pad rows so strides aren't powers of two, block (tile) loops so the working set fits, and reorder data.
- Replacement within a set is typically LRU or an approximation of it.

### deep
#### Worked example: classifying misses

A simulated 32 KiB cache with 64-byte lines and 8 ways (64 sets) classifies each miss: compulsory if the line was never seen, capacity if a fully associative cache of the same size would also miss, conflict otherwise.

```cpp
// A 32 KiB cache with 64-byte lines, 8 ways per set (64 sets), least recently used replacement.
// Each miss is classified as compulsory (first touch of the line), capacity (a fully
// associative LRU cache of the same size would miss too) or conflict (only the sets are to blame).
struct Lru {  // an LRU set of line numbers with a fixed number of ways
    size_t ways;
    list<uint64_t> order;
    bool access(uint64_t line) {  // true on a hit
        auto it = find(order.begin(), order.end(), line);
        bool hit = it != order.end();
        if (hit) order.erase(it);
        else if (order.size() == ways) order.pop_back();
        order.push_front(line);
        return hit;
    }
};

void simulate(const char* name, const vector<uint64_t>& addresses) {
    const size_t lineBytes = 64, sets = 64, ways = 8;
    vector<Lru> cache(sets, Lru{ways});
    Lru full{sets * ways};
    set<uint64_t> seen;
    int hits = 0, compulsory = 0, capacity = 0, conflict = 0;
    for (uint64_t a : addresses) {
        uint64_t line = a / lineBytes;
        bool hit = cache[line % sets].access(line), fullHit = full.access(line);
        if (hit) ++hits;
        else if (seen.insert(line).second) ++compulsory;
        else if (!fullHit) ++capacity;
        else ++conflict;
    }
    printf("%-34s hits %6d, compulsory %5d, capacity %6d, conflict %6d\n", name, hits, compulsory,
           capacity, conflict);
}

int main() {
    vector<uint64_t> small, big, column, padded;
    for (int pass = 0; pass < 10; ++pass) {
        for (uint64_t a = 0; a < 16 * 1024; a += 4) small.push_back(a);  // 16 KiB of ints
        for (uint64_t a = 0; a < 64 * 1024; a += 4) big.push_back(a);    // 64 KiB of ints
        for (uint64_t row = 0; row < 64; ++row) {  // one float per row, 64 rows, 10 times
            column.push_back(row * 4096);          // rows of 4096 bytes: all in one set
            padded.push_back(row * (4096 + 64));   // one line of padding per row
        }
    }
    simulate("sweep 16 KiB ten times", small);
    simulate("sweep 64 KiB ten times", big);
    simulate("column, 4096-byte rows", column);
    simulate("column, 4160-byte rows", padded);
}
```

Output:

```text
sweep 16 KiB ten times             hits  40704, compulsory   256, capacity      0, conflict      0
sweep 64 KiB ten times             hits 153600, compulsory  1024, capacity   9216, conflict      0
column, 4096-byte rows             hits      0, compulsory    64, capacity      0, conflict    576
column, 4160-byte rows             hits    576, compulsory    64, capacity      0, conflict      0
```

- **16 KiB, swept 10 times**: it fits, so only the 256 first touches miss.
- **64 KiB, swept 10 times**: twice the cache size. With LRU, a cyclic sweep evicts each line just before it is needed again, so every line misses on every pass: 1,024 compulsory plus 9,216 capacity misses.
- **A column with 4,096-byte rows**: only 64 lines, a quarter of what the cache holds, yet every access misses, because all 64 lines map to one 8-way set: 576 conflict misses.
- **The same column with 64 bytes of padding per row**: the lines spread over all 64 sets, and after the first pass every access hits.

#### The same effect on real hardware

Summing a 1024 × 1024 float matrix column by column, four times, with different distances between rows:

```cpp
// Build with: g++ -std=c++20 -O2
// Sum a 1024 x 1024 float matrix column by column, with rows stored 4096 bytes apart (a power
// of two) and with 64 or 128 bytes of padding added to each row.
int main() {
    for (int pitch : {1024, 1040, 2048, 2064}) {  // floats from one row to the next
        vector<float> m(size_t(1024) * pitch, 1.0f);
        float s = 0;
        auto t0 = chrono::steady_clock::now();
        for (int rep = 0; rep < 4; ++rep)
            for (int j = 0; j < 1024; ++j)
                for (int i = 0; i < 1024; ++i) s += m[size_t(i) * pitch + j];
        double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
        printf("row pitch %4d floats (%5zu bytes): %5.1f ms (sum %.0f)\n", pitch,
               pitch * sizeof(float), ms, s);
    }
}
```

Output (one run on the session's cloud machine):

```text
row pitch 1024 floats ( 4096 bytes):  17.4 ms (sum 4194304)
row pitch 1040 floats ( 4160 bytes):   3.4 ms (sum 4194304)
row pitch 2048 floats ( 8192 bytes):  17.2 ms (sum 4194304)
row pitch 2064 floats ( 8256 bytes):   4.9 ms (sum 4194304)
```

Over five runs, rows 4,096 or 8,192 bytes apart took 17 to 21 ms, while padding each row by one line brought it to 3.4 to 3.9 ms (4,160 bytes) and 3.5 to 11.2 ms (8,256 bytes). Same data, same work: only the set mapping changed.

#### Common mistakes

- **Choosing power-of-two sizes for arrays of rows** in code that walks columns.
- **Blaming capacity for conflict misses.** If the working set is much smaller than the cache and still misses, suspect the set mapping.

Connects to: [cache lines and locality](#/concept/arch.cpu-memory.cache-lines-and-locality), [memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy), [LRU cache](#/concept/dsa.design-ds.lru-cache), [page replacement](#/concept/os.memory.page-replacement).

### questions
Q: What are compulsory, capacity and conflict misses?
A: Compulsory misses are first touches of a line, which nothing can avoid. Capacity misses happen because the working set is larger than the cache. Conflict misses happen because too many lines map to the same set, even though other sets have room.

Q: What does it mean for a cache to be 8-way set-associative?
A: The cache is divided into sets of 8 lines each, and each memory line can be stored only in the one set its address selects, in any of that set's 8 slots.

Q: Why can a power-of-two row size make matrix code slow?
A: Walking down a column then steps through addresses a power of two apart, which all select the same cache set. Only as many lines as the set has ways can stay cached, so the rest keep evicting each other. Padding each row by a line spreads them across sets.

Q: How would you tell a conflict miss from a capacity miss?
A: Compare with a fully associative cache of the same size: if it would hit, the miss is a conflict miss. In practice, many misses on a working set much smaller than the cache point to conflicts.

## arch.cpu-memory.out-of-order-and-superscalar-execution
name: "Out-of-order and superscalar execution"
importance: advanced
prereqs: [arch.cpu-memory.pipelining-and-hazards]
scope: "Out-of-order and superscalar execution"

### simple
Modern CPUs don't run instructions strictly one after another: they look ahead in the program, find instructions whose inputs are ready, and run several of them at once. The results are then put back in program order, so the program can't tell. It is like a kitchen with several cooks who start any dish whose ingredients are ready instead of waiting for the order ahead of it.

### interview
- **Superscalar**: several execution units, so several instructions can start in the same cycle.
- **Out-of-order**: instructions wait in a window (the reorder buffer, hundreds of entries on recent cores) and run when their operands are ready, not in program order; they retire in order.
- **Register renaming** removes false dependencies caused by reusing register names.
- The limit is the **dependency chain**: a chain of dependent operations runs at the latency of each step, while independent work runs at the machines' throughput.
- Independent cache misses overlap too (**memory-level parallelism**); dependent ones, like pointer chasing, cannot.
- Speed-ups come from breaking chains: several accumulators, independent traversals, fewer dependent loads.

### deep
#### Worked example

The same 82 million double additions, as one dependency chain or as 2, 4 or 8 independent chains (separate accumulators) over a 32 KiB array that stays in L1. Then two pointer chases through 256 MiB, run one at a time or interleaved.

```cpp
// Build with: g++ -std=c++20 -O2 -fno-tree-vectorize
// Latency against throughput: the same additions as one dependency chain or as k chains.
template <int K> double sum(const vector<double>& v, int reps) {
    double acc[K] = {};
    for (int r = 0; r < reps; ++r)
        for (size_t i = 0; i < v.size(); i += K)
#pragma GCC unroll 8  // unrolled fully, so acc[] lives in registers
            for (int k = 0; k < K; ++k) acc[k] += v[i + k];  // K independent chains
    double s = 0;
    for (double a : acc) s += a;
    return s;
}

template <class F> void timeIt(const char* name, F f) {
    auto t0 = chrono::steady_clock::now();
    double r = f();
    double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - t0).count();
    printf("%-34s %6.1f ms (result %.0f)\n", name, ms, r);
}

int main() {
    vector<double> v(1 << 12, 1.0);  // 32 KiB: fits in L1, so memory is not the limit
    const int reps = 20000;          // 82 million additions in total
    timeIt("1 chain", [&] { return sum<1>(v, reps); });
    timeIt("2 chains", [&] { return sum<2>(v, reps); });
    timeIt("4 chains", [&] { return sum<4>(v, reps); });
    timeIt("8 chains", [&] { return sum<8>(v, reps); });
    // Memory-level parallelism: chase one random cycle, or two at once, through 256 MiB.
    const size_t n = 1 << 25;
    vector<uint32_t> next(n), order(n);
    iota(order.begin(), order.end(), 0);
    mt19937_64 rng(2026);
    for (size_t i = n - 1; i > 0; --i) swap(order[i], order[rng() % (i + 1)]);
    for (size_t i = 0; i < n; ++i) next[order[i]] = order[(i + 1) % n];
    const size_t steps = 10'000'000;
    timeIt("one chase, 10M loads", [&] {
        uint32_t p = 0;
        for (size_t i = 0; i < steps; ++i) p = next[p];
        return double(p);
    });
    timeIt("two chases, 10M loads each", [&] {
        uint32_t p = 0, q = order[n / 2];
        for (size_t i = 0; i < steps; ++i) p = next[p], q = next[q];
        return double(p) + q;
    });
}
```

Output (one run on the session's cloud machine):

```text
1 chain                              56.4 ms (result 81920000)
2 chains                             28.5 ms (result 81920000)
4 chains                             14.6 ms (result 81920000)
8 chains                             15.6 ms (result 81920000)
one chase, 10M loads               1486.1 ms (result 26872981)
two chases, 10M loads each         1460.5 ms (result 47191954)
```

#### Reading the results

- **One chain is latency-bound**: 56 to 67 ms over five runs, about 0.7 ns per addition, because each addition waits for the one before.
- **Independent chains overlap**: 25 to 31 ms with two, 12.4 to 14.6 ms with four, and no better with eight (12.3 to 15.6 ms). About four additions in flight saturate the adders; beyond that the machine is at its throughput limit.
- **Memory-level parallelism**: two interleaved chases perform twice the loads in about the same time as one (1.34 to 1.49 s each way over five runs). Each chase's loads are dependent, but the two chains are not, so their misses overlap.
- The flag `-fno-tree-vectorize` keeps the compiler from using SIMD here, so the effect measured is instruction-level parallelism alone; floating-point addition isn't reordered by the compiler without `-ffast-math`, which is why one accumulator stays one chain.

#### Common mistakes

- **Counting instructions as cost.** Ten independent instructions can finish sooner than three dependent ones.
- **Expecting speculation to be invisible.** Its side effects on caches are what timing attacks such as Spectre exploit.

Connects to: [pipelining and hazards](#/concept/arch.cpu-memory.pipelining-and-hazards), [branch prediction](#/concept/arch.cpu-memory.branch-prediction), [SIMD basics](#/concept/arch.performance.simd-basics), [memory hierarchy](#/concept/arch.cpu-memory.memory-hierarchy).

### questions
Q: What is the difference between superscalar and out-of-order execution?
A: Superscalar means the core can start several instructions in one cycle using multiple execution units. Out-of-order means it may run later instructions before earlier ones when their inputs are ready, then retire them in program order.

Q: Why can splitting a sum into several accumulators make it faster?
A: With one accumulator each addition depends on the previous one, so the loop runs at the addition latency. Several accumulators form independent chains that the core executes in parallel, up to its throughput.

Q: What is memory-level parallelism?
A: Having several cache misses outstanding at once. Independent loads overlap their memory latency, while dependent loads, such as following a linked list, must wait for each other.

Q: What is register renaming for?
A: It maps the few architectural register names onto a larger set of physical registers, so instructions that merely reuse a name without depending on each other can run in parallel.
