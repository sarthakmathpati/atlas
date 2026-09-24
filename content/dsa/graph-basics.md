---
topic: dsa.graph-basics
name: "Graphs: basics and traversal"
subject: dsa
order: 22
prereqs: [dsa.recursion, dsa.stacks-queues]
---

## dsa.graph-basics.graph-representations
name: "Graph representations"
importance: must
scope: "adjacency list vs matrix vs edge list, directed and undirected, weighted"

## dsa.graph-basics.bfs
name: "BFS"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.queue-and-deque-basics, dsa.graph-basics.graph-representations]
scope: "shortest path in unweighted graphs, levels"

## dsa.graph-basics.dfs
name: "DFS"
importance: must
pattern: true
prereqs: [dsa.graph-basics.graph-representations]
scope: "recursive and iterative, discovery and finish order"

## dsa.graph-basics.grids-as-graphs
name: "Grids as graphs"
importance: must
pattern: true
prereqs: [dsa.graph-basics.dfs]
scope: "4 and 8 directions, bounds checks, flood fill, islands"

## dsa.graph-basics.connected-components
name: "Connected components"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "counting components with DFS or BFS"

## dsa.graph-basics.multi-source-bfs
name: "Multi-source BFS"
importance: must
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "rotting oranges, distance to nearest"

## dsa.graph-basics.cycle-detection-in-undirected-graphs
name: "Cycle detection in undirected graphs"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "DFS with parent, DSU"

## dsa.graph-basics.cycle-detection-in-directed-graphs
name: "Cycle detection in directed graphs"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "DFS with three colors"

## dsa.graph-basics.topological-sort
name: "Topological sort"
importance: must
pattern: true
prereqs: [dsa.graph-basics.bfs, dsa.graph-basics.cycle-detection-in-directed-graphs]
scope: "Kahn's algorithm and DFS finish order, course schedule"

## dsa.graph-basics.bipartite-check
name: "Bipartite check"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "two-coloring with BFS or DFS"

## dsa.graph-basics.bfs-on-state-spaces
name: "BFS on state spaces"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "word ladder, open the lock, implicit graphs"

## dsa.graph-basics.cloning-graphs
name: "Cloning graphs"
importance: important
prereqs: [dsa.graph-basics.dfs]
scope: "clone graph with a hash map"
