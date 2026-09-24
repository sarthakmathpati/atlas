---
topic: dsa.mst-dsu
name: "MST and disjoint set union"
subject: dsa
order: 24
prereqs: [dsa.graph-basics, dsa.sorting]
---

## dsa.mst-dsu.disjoint-set-union
name: "Disjoint set union"
importance: must
scope: "union by rank or size, path compression, near O(1) operations"

## dsa.mst-dsu.dsu-applications
name: "DSU applications"
importance: must
pattern: true
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "connectivity, redundant connection, accounts merge, grouping"

## dsa.mst-dsu.kruskals-algorithm
name: "Kruskal's algorithm"
importance: must
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "sort edges, union with DSU"

## dsa.mst-dsu.prims-algorithm
name: "Prim's algorithm"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "growing the tree with a heap"

## dsa.mst-dsu.dsu-with-extra-data
name: "DSU with extra data"
importance: advanced
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "component sizes, parity for bipartiteness"
