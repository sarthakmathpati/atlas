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

## arch.cpu-memory.pipelining-and-hazards
name: "Pipelining and hazards"
importance: important
prereqs: [arch.cpu-memory.how-a-cpu-executes-instructions]
scope: "data, control and structural hazards"

## arch.cpu-memory.branch-prediction
name: "Branch prediction"
importance: important
prereqs: [arch.cpu-memory.pipelining-and-hazards]
scope: "why unpredictable branches are slow"

## arch.cpu-memory.memory-hierarchy
name: "Memory hierarchy"
importance: must
scope: "registers, L1, L2, L3, RAM, disk, and their latencies"

## arch.cpu-memory.cache-lines-and-locality
name: "Cache lines and locality"
importance: must
prereqs: [arch.cpu-memory.memory-hierarchy]
scope: "spatial and temporal locality, row-major traversal"

## arch.cpu-memory.cache-associativity-and-misses
name: "Cache associativity and misses"
importance: important
prereqs: [arch.cpu-memory.cache-lines-and-locality]
scope: "compulsory, capacity, conflict misses"

## arch.cpu-memory.out-of-order-and-superscalar-execution
name: "Out-of-order and superscalar execution"
importance: advanced
prereqs: [arch.cpu-memory.pipelining-and-hazards]
scope: "Out-of-order and superscalar execution"
