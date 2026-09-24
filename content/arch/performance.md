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

## arch.performance.data-oriented-design
name: "Data-oriented design"
importance: important
tracks: [quant]
prereqs: [arch.cpu-memory.cache-lines-and-locality]
scope: "struct of arrays vs array of structs"

## arch.performance.simd-basics
name: "SIMD basics"
importance: advanced
tracks: [quant]
prereqs: [arch.performance.data-oriented-design]
scope: "vectorized operations"

## arch.performance.numa
name: "NUMA"
importance: advanced
tracks: [quant]
scope: "memory locality on multi-socket machines"

## arch.performance.profiling
name: "Profiling"
importance: important
scope: "finding hot spots, perf and sampling profilers"

## arch.performance.compiler-optimizations
name: "Compiler optimizations"
importance: advanced
scope: "inlining, loop unrolling, what -O2 does"

## arch.performance.cost-of-system-calls-and-context-switches
name: "Cost of system calls and context switches"
importance: important
scope: "Cost of system calls and context switches"

## arch.performance.low-latency-techniques
name: "Low-latency techniques"
importance: advanced
tracks: [quant]
scope: "avoiding allocation on hot paths, busy polling, kernel bypass idea"
