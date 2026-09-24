---
topic: dsa.design-ds
name: "Designing data structures"
subject: dsa
order: 37
prereqs: [dsa.hashing, dsa.linked-lists, dsa.heaps]
---

## dsa.design-ds.lru-cache
name: "LRU cache"
importance: must
prereqs: [dsa.linked-lists.doubly-linked-list-with-hash-map]
scope: "hash map plus doubly linked list, O(1) get and put"

## dsa.design-ds.lfu-cache
name: "LFU cache"
importance: important
prereqs: [dsa.design-ds.lru-cache]
scope: "frequency buckets"

## dsa.design-ds.insert-delete-and-getrandom-in-o-1
name: "Insert, delete and getRandom in O(1)"
importance: important
scope: "array plus index map"

## dsa.design-ds.augmented-stacks
name: "Augmented stacks"
importance: important
scope: "min stack, maximum frequency stack"

## dsa.design-ds.time-based-key-value-store
name: "Time-based key-value store"
importance: important
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "sorted timestamps per key with binary search"

## dsa.design-ds.iterator-design
name: "Iterator design"
importance: important
scope: "peeking iterator, flatten nested list iterator"

## dsa.design-ds.circular-queue-and-deque-design
name: "Circular queue and deque design"
importance: important
scope: "fixed-size ring buffer"

## dsa.design-ds.versioned-data
name: "Versioned data"
importance: advanced
scope: "snapshot array with per-index history"

## dsa.design-ds.all-o-1-data-structure
name: "All O(1) data structure"
importance: advanced
prereqs: [dsa.design-ds.lfu-cache]
scope: "count buckets in a doubly linked list"
