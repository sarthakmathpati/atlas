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

## conc.atomics.memory-ordering
name: "Memory ordering"
importance: advanced
prereqs: [conc.atomics.atomic-operations]
scope: "relaxed, acquire, release, sequentially consistent"

## conc.atomics.lock-free-data-structures
name: "Lock-free data structures"
importance: advanced
prereqs: [conc.atomics.memory-ordering]
scope: "lock-free queue idea, the ABA problem"

## conc.atomics.false-sharing-and-cache-line-padding
name: "False sharing and cache-line padding"
importance: advanced
tracks: [quant]
scope: "why it slows multithreaded code"
