---
topic: os.memory
name: "Memory management"
subject: os
order: 7
prereqs: [os.processes]
---

## os.memory.logical-vs-physical-addresses
name: "Logical vs physical addresses"
importance: must
scope: "MMU and address binding"

## os.memory.contiguous-allocation
name: "Contiguous allocation"
importance: important
prereqs: [os.memory.logical-vs-physical-addresses]
scope: "first fit, best fit, worst fit"

## os.memory.fragmentation
name: "Fragmentation"
importance: must
prereqs: [os.memory.contiguous-allocation]
scope: "internal vs external, compaction"

## os.memory.paging
name: "Paging"
importance: must
prereqs: [os.memory.logical-vs-physical-addresses]
scope: "pages, frames, page tables, address translation"

## os.memory.tlb
name: "TLB"
importance: must
prereqs: [os.memory.paging]
scope: "caching translations, hit ratio, effective access time"

## os.memory.multi-level-and-inverted-page-tables
name: "Multi-level and inverted page tables"
importance: important
prereqs: [os.memory.paging]
scope: "reducing page table size"

## os.memory.segmentation
name: "Segmentation"
importance: important
prereqs: [os.memory.paging]
scope: "segments vs pages, segmentation with paging"

## os.memory.virtual-memory-and-demand-paging
name: "Virtual memory and demand paging"
importance: must
prereqs: [os.memory.tlb]
scope: "page faults and how they are handled"

## os.memory.page-replacement
name: "Page replacement"
importance: must
prereqs: [os.memory.virtual-memory-and-demand-paging]
scope: "FIFO, LRU, Optimal, Clock; Belady's anomaly"

## os.memory.thrashing-and-working-sets
name: "Thrashing and working sets"
importance: must
prereqs: [os.memory.page-replacement]
scope: "causes and cures"

## os.memory.copy-on-write-and-memory-mapped-files
name: "Copy-on-write and memory-mapped files"
importance: important
prereqs: [os.memory.virtual-memory-and-demand-paging]
scope: "Copy-on-write and memory-mapped files"

## os.memory.stack-vs-heap-memory
name: "Stack vs heap memory"
importance: important
scope: "allocation, lifetime, fragmentation"

## os.memory.how-malloc-works
name: "How malloc works"
importance: advanced
prereqs: [os.memory.stack-vs-heap-memory]
scope: "free lists, bins, brk and mmap"
