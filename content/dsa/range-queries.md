---
topic: dsa.range-queries
name: "Range query structures"
subject: dsa
order: 36
prereqs: [dsa.prefix-sums, dsa.trees]
---

## dsa.range-queries.segment-tree
name: "Segment tree"
importance: important
scope: "build, point update, range query"

## dsa.range-queries.lazy-propagation
name: "Lazy propagation"
importance: advanced
prereqs: [dsa.range-queries.segment-tree]
scope: "range updates on segment trees"

## dsa.range-queries.fenwick-tree
name: "Fenwick tree"
importance: important
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "prefix sums with updates, counting inversions"

## dsa.range-queries.sparse-table
name: "Sparse table"
importance: advanced
scope: "O(1) range minimum on static arrays"

## dsa.range-queries.coordinate-compression
name: "Coordinate compression"
importance: advanced
scope: "mapping large values to ranks"
