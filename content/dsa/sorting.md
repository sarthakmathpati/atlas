---
topic: dsa.sorting
name: "Sorting"
subject: dsa
order: 8
prereqs: [dsa.arrays, dsa.recursion]
---

## dsa.sorting.elementary-sorts
name: "Elementary sorts"
importance: important
scope: "bubble, selection, insertion, and when insertion sort shines"

## dsa.sorting.merge-sort
name: "Merge sort"
importance: must
scope: "divide and conquer, stability, O(n log n) time, extra space"

## dsa.sorting.quick-sort
name: "Quick sort"
importance: must
scope: "Lomuto and Hoare partitions, pivot choice, randomization, worst case"

## dsa.sorting.heap-sort
name: "Heap sort"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "in-place, not stable"

## dsa.sorting.counting-radix-and-bucket-sort
name: "Counting, radix and bucket sort"
importance: important
scope: "non-comparison sorts and when they apply"

## dsa.sorting.stability-and-custom-comparators
name: "Stability and custom comparators"
importance: must
scope: "sorting by multiple keys, comparator rules"

## dsa.sorting.quickselect
name: "Quickselect"
importance: must
pattern: true
prereqs: [dsa.sorting.quick-sort]
scope: "kth element in average O(n)"

## dsa.sorting.merge-sort-counting
name: "Merge-sort counting"
importance: important
pattern: true
prereqs: [dsa.sorting.merge-sort]
scope: "inversions, reverse pairs, count of smaller numbers after self"

## dsa.sorting.comparison-sorting-lower-bound
name: "Comparison sorting lower bound"
importance: important
scope: "why Ω(n log n)"
