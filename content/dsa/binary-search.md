---
topic: dsa.binary-search
name: "Binary search"
subject: dsa
order: 7
prereqs: [dsa.arrays]
---

## dsa.binary-search.classic-binary-search
name: "Classic binary search"
importance: must
pattern: true
scope: "invariants, safe mid calculation, loop conditions"

## dsa.binary-search.lower-and-upper-bound
name: "Lower and upper bound"
importance: must
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "first and last occurrence, insert position"

## dsa.binary-search.rotated-sorted-arrays
name: "Rotated sorted arrays"
importance: must
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "search, find minimum, the duplicates case"

## dsa.binary-search.binary-search-on-the-answer
name: "Binary search on the answer"
importance: must
pattern: true
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "monotonic predicate, minimize the maximum or maximize the minimum"

## dsa.binary-search.peak-finding
name: "Peak finding"
importance: important
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "binary search on slopes, 2D peak"

## dsa.binary-search.searching-a-2d-matrix
name: "Searching a 2D matrix"
importance: important
prereqs: [dsa.binary-search.classic-binary-search]
scope: "flattened index, staircase search"

## dsa.binary-search.binary-search-on-real-numbers
name: "Binary search on real numbers"
importance: important
prereqs: [dsa.binary-search.binary-search-on-the-answer]
scope: "precision, fixed iteration count"

## dsa.binary-search.median-of-two-sorted-arrays
name: "Median of two sorted arrays"
importance: advanced
scope: "partition-based binary search"

## dsa.binary-search.kth-smallest-by-counting
name: "Kth smallest by counting"
importance: advanced
prereqs: [dsa.binary-search.binary-search-on-the-answer]
scope: "sorted matrix, pair distances"
