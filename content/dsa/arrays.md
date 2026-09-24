---
topic: dsa.arrays
name: "Arrays"
subject: dsa
order: 2
prereqs: [dsa.complexity]
---

## dsa.arrays.array-basics
name: "Array basics"
importance: must
scope: "indexing, traversal, in-place updates, memory layout"

## dsa.arrays.kadanes-algorithm
name: "Kadane's algorithm"
importance: must
pattern: true
prereqs: [dsa.arrays.array-basics]
scope: "maximum subarray sum and its variants (circular, product)"

## dsa.arrays.dutch-national-flag
name: "Dutch national flag"
importance: must
pattern: true
scope: "three-way partitioning"

## dsa.arrays.cyclic-sort
name: "Cyclic sort"
importance: important
pattern: true
prereqs: [dsa.arrays.in-place-array-tricks]
scope: "values in range 1 to n, finding missing and duplicate numbers"

## dsa.arrays.matrix-traversal
name: "Matrix traversal"
importance: must
prereqs: [dsa.arrays.array-basics]
scope: "rows and columns, spiral order, diagonals, rotate by 90 degrees, transpose"

## dsa.arrays.boyer-moore-majority-vote
name: "Boyer-Moore majority vote"
importance: important
pattern: true
scope: "majority element for n/2 and n/3"

## dsa.arrays.next-permutation
name: "Next permutation"
importance: important
scope: "the lexicographic next-order algorithm"

## dsa.arrays.in-place-array-tricks
name: "In-place array tricks"
importance: important
scope: "reversal for rotation, marking with signs or indices"
