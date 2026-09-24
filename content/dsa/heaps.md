---
topic: dsa.heaps
name: "Heaps and priority queues"
subject: dsa
order: 16
prereqs: [dsa.arrays]
---

## dsa.heaps.binary-heap
name: "Binary heap"
importance: must
scope: "array representation, push and pop in O(log n), heapify in O(n)"

## dsa.heaps.top-k-elements
name: "Top K elements"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "min-heap of size K, quickselect alternative"

## dsa.heaps.k-way-merge
name: "K-way merge"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "merge k sorted lists, smallest range covering k lists"

## dsa.heaps.two-heaps
name: "Two heaps"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "running median"

## dsa.heaps.scheduling-with-heaps
name: "Scheduling with heaps"
importance: important
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "task scheduler, meeting rooms, CPU simulation"

## dsa.heaps.custom-comparators-and-lazy-deletion
name: "Custom comparators and lazy deletion"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "stale entries, indexed heap idea"
