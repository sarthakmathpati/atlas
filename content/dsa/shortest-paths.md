---
topic: dsa.shortest-paths
name: "Shortest paths"
subject: dsa
order: 23
prereqs: [dsa.graph-basics, dsa.heaps]
---

## dsa.shortest-paths.dijkstras-algorithm
name: "Dijkstra's algorithm"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "min-heap, non-negative weights, O((V + E) log V)"

## dsa.shortest-paths.0-1-bfs
name: "0-1 BFS"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "deque for edge weights 0 and 1"

## dsa.shortest-paths.bellman-ford
name: "Bellman-Ford"
importance: important
scope: "negative edges, negative cycle detection, the k-stops variant"

## dsa.shortest-paths.floyd-warshall
name: "Floyd-Warshall"
importance: important
scope: "all-pairs shortest paths in O(V^3)"

## dsa.shortest-paths.shortest-paths-in-a-dag
name: "Shortest paths in a DAG"
importance: important
prereqs: [dsa.graph-basics.topological-sort]
scope: "relax edges in topological order"

## dsa.shortest-paths.dijkstra-variants
name: "Dijkstra variants"
importance: important
prereqs: [dsa.shortest-paths.dijkstras-algorithm]
scope: "minimize the maximum edge, maximize probability, count shortest paths"

## dsa.shortest-paths.a-star-search
name: "A* search"
importance: advanced
prereqs: [dsa.shortest-paths.dijkstras-algorithm]
scope: "heuristics, admissibility"
