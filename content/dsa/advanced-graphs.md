---
topic: dsa.advanced-graphs
name: "Advanced graphs"
subject: dsa
order: 25
prereqs: [dsa.graph-basics, dsa.shortest-paths]
---

## dsa.advanced-graphs.bridges-and-articulation-points
name: "Bridges and articulation points"
importance: advanced
scope: "Tarjan's low-link values"

### simple
A bridge is a connection whose removal splits a network into pieces, and an articulation point is a single node with the same effect. Think of the only road into a valley, or the one airport connecting two regions. Tarjan's method finds them all in one depth-first search by tracking how high up each part of the search tree can reach through back routes.

### interview
- DFS assigns `tin[u]` (discovery time) and `low[u]` = the smallest `tin` reachable from u's subtree using at most one back edge.
- Edge `u–v` (v a child) is a **bridge** iff `low[v] > tin[u]`: v's subtree can't reach u or above without this edge.
- u is an **articulation point** iff (non-root) some child v has `low[v] >= tin[u]`, or (root) it has **two or more** DFS children.
- One DFS: **O(V + E)**. Skip the edge to the parent (by edge id if parallel edges exist).
- Uses: critical connections in a network, single points of failure, biconnected components.

### questions
Q: What is a low-link value?
A: low[u] is the smallest discovery time reachable from u's DFS subtree by following tree edges down and then at most one back edge up. It tells you how high in the DFS tree a subtree can climb without using the edge from its parent.

Q: What is the condition for a tree edge u–v to be a bridge?
A: low[v] > tin[u]. It means nothing in v's subtree has a back edge to u or any ancestor of u, so removing the edge disconnects v's subtree from the rest.

Q: How does the articulation point condition differ from the bridge condition?
A: For a non-root u, the condition is low[v] >= tin[u] for some child v: the subtree can reach at most u itself, so removing u cuts it off. The root is special: it is an articulation point only if it has at least two DFS children.

Q: Why must you skip the parent edge rather than the parent vertex when there are parallel edges?
A: Two parallel edges between u and its parent form a cycle, so neither is a bridge. Skipping by vertex ignores both and wrongly reports a bridge; skipping only the specific edge used to enter u keeps the other one as a back edge.

## dsa.advanced-graphs.strongly-connected-components
name: "Strongly connected components"
importance: advanced
scope: "Kosaraju and Tarjan"

### simple
In a directed graph, a strongly connected component is a group where every member can reach every other member by following the arrows. Think of groups of web pages that all link to each other in a loop, directly or indirectly. Shrinking each group to a single point leaves a graph with no cycles, which makes further analysis easy.

### interview
- **Kosaraju**: (1) DFS the graph, record vertices by finish time; (2) reverse all edges; (3) DFS the reversed graph in decreasing finish time; each DFS tree is one SCC. **O(V + E)**, two passes.
- **Tarjan**: one DFS with `tin`, `low` and a stack of vertices; when `low[u] == tin[u]`, pop the stack down to u: that's an SCC. O(V + E).
- The **condensation** (one node per SCC) is a DAG, useful for topological reasoning on cyclic graphs.
- Uses: 2-SAT, finding mutual reachability groups, minimum edges to make a graph strongly connected (max(sources, sinks) of the condensation, if more than one SCC).

### questions
Q: What is a strongly connected component?
A: A maximal set of vertices in a directed graph where every vertex can reach every other along directed paths. Every directed graph splits uniquely into SCCs.

Q: How does Kosaraju's algorithm work?
A: Run DFS on the graph and push vertices onto a list when they finish. Reverse every edge, then process vertices in decreasing finish order, running a DFS on the reversed graph from each unvisited one. Each of those DFS trees is exactly one SCC.

Q: Why is the condensation graph always acyclic?
A: If two SCCs were on a cycle in the condensation, every vertex in both could reach every vertex in the other, so they would form one larger SCC, contradicting maximality.

Q: How many edges must be added to make a directed graph strongly connected?
A: Compute the condensation DAG. If it has one node, zero. Otherwise, the answer is the maximum of the number of source components (in-degree 0) and sink components (out-degree 0).

## dsa.advanced-graphs.eulerian-paths
name: "Eulerian paths"
importance: advanced
scope: "Hierholzer's algorithm, reconstruct itinerary"

### simple
An Eulerian path walks along every edge of a graph exactly once, like drawing a figure without lifting your pen or retracing a line. Whether it exists depends only on how many edges touch each vertex. Hierholzer's algorithm builds the path by walking until stuck and splicing in detours around unused loops.

### interview
- **Undirected**: an Eulerian circuit exists iff all vertices with edges are connected and every degree is even; a path iff exactly 0 or 2 vertices have odd degree (start at an odd one).
- **Directed**: circuit iff in-degree = out-degree everywhere (and connected); path iff one vertex has out − in = 1 (start), one has in − out = 1 (end), all others balanced.
- **Hierholzer**: DFS that consumes edges; append a vertex to the answer **after** all its edges are used (post-order); reverse at the end. **O(E)**.
- **Reconstruct itinerary**: directed Eulerian path from "JFK" with lexicographically smallest order: keep each adjacency list sorted (min-heap) and always take the smallest.
- Other uses: valid arrangement of pairs, De Bruijn sequences (cracking the safe).

### questions
Q: When does an undirected graph have an Eulerian path?
A: When all vertices with at least one edge are in one connected component and the number of odd-degree vertices is 0 (then there is an Eulerian circuit) or 2 (then the path starts at one odd vertex and ends at the other).

Q: How does Hierholzer's algorithm work?
A: Start at a valid start vertex and walk along unused edges, removing each as you use it. When you reach a vertex with no unused edges, add it to the path and back up. The vertices collected in this post-order, reversed, form the Eulerian path, with side loops spliced in automatically. It runs in O(E).

Q: How do you reconstruct an itinerary using every ticket once, with the smallest lexical order?
A: Treat tickets as directed edges and find an Eulerian path from the given start with Hierholzer's algorithm, always taking the lexicographically smallest unused destination (sorted lists or a min-heap per airport). Append airports in post-order and reverse.

Q: Why does Hierholzer's algorithm add vertices in post-order instead of when first visited?
A: Greedily following edges can enter a dead end before using all edges. Adding a vertex only when it has no unused edges ensures dead ends are placed at the end of the path, and loops explored later get spliced in before them when the list is reversed.

## dsa.advanced-graphs.maximum-flow-basics
name: "Maximum flow basics"
importance: advanced
scope: "Ford-Fulkerson, Edmonds-Karp, the min-cut idea"

### simple
Maximum flow asks how much can travel from a source to a sink through a network of pipes, each with a capacity. You keep finding a route with spare capacity and pushing as much as it allows, while allowing earlier choices to be partly undone through "reverse" capacity. When no route remains, the flow is maximal, and it equals the capacity of the network's narrowest cut.

### interview
- **Residual graph**: for each edge, remaining capacity forward and "undo" capacity backward (equal to the flow sent).
- **Ford-Fulkerson**: repeatedly find any augmenting path in the residual graph and push its bottleneck. Terminates for integer capacities; time depends on the flow value.
- **Edmonds-Karp**: choose augmenting paths with **BFS** (fewest edges): **O(V · E²)**.
- **Max-flow min-cut theorem**: maximum flow = minimum total capacity of edges that separate source from sink. After max flow, vertices reachable from the source in the residual graph form the min-cut side.
- Dinic's algorithm is faster in practice (O(V² E), much better on unit graphs).
- Uses: bipartite matching, edge-disjoint paths, project selection, image segmentation.

### questions
Q: What is an augmenting path in the context of maximum flow?
A: A path from source to sink in the residual graph where every edge has positive remaining capacity. Pushing flow equal to the smallest remaining capacity along it increases the total flow.

Q: Why do reverse edges exist in the residual graph?
A: They let the algorithm cancel flow sent earlier along an edge, rerouting it when a better combination of paths exists. Without them, a poor early choice of path could block the maximum flow.

Q: What does the max-flow min-cut theorem say?
A: The maximum amount of flow from source to sink equals the minimum total capacity of a set of edges whose removal disconnects the sink from the source. The final residual graph reveals such a cut: the vertices still reachable from the source on one side, the rest on the other.

Q: How does Edmonds-Karp improve on basic Ford-Fulkerson?
A: It always augments along a shortest path (in number of edges), found with BFS. This bounds the number of augmentations by O(V · E), giving O(V · E²) time regardless of the capacities' size.

## dsa.advanced-graphs.bipartite-matching
name: "Bipartite matching"
importance: advanced
prereqs: [dsa.advanced-graphs.maximum-flow-basics]
scope: "augmenting paths"

### simple
Bipartite matching pairs items from two groups, such as applicants and jobs, where each pair must be allowed and nobody gets two partners. The trick is to try to match each applicant, and if their preferred job is taken, ask the current holder whether they can move to another job. Each successful chain of moves adds one more pair.

### interview
- **Augmenting path**: a path that alternates unmatched and matched edges, starting and ending at unmatched vertices; flipping it adds one to the matching.
- **Kuhn's algorithm**: for each left vertex, DFS for an augmenting path with a fresh visited set: **O(V · E)**.
- **Hopcroft-Karp**: many shortest augmenting paths per phase: **O(E √V)**.
- Equivalent to max flow with unit capacities (source → left → right → sink).
- **König's theorem**: in bipartite graphs, maximum matching = minimum vertex cover.
- Uses: assigning tasks, maximum students taking an exam (seat conflicts), domino tilings.

### questions
Q: What is an augmenting path in bipartite matching?
A: A path that starts at an unmatched left vertex and ends at an unmatched right vertex, alternating between edges not in the matching and edges in it. Swapping the status of every edge on the path increases the matching size by one.

Q: How does Kuhn's algorithm find a maximum matching?
A: For each left vertex, run a DFS trying each neighbor: if the neighbor is free, match them; if it's taken, recursively try to rematch its current partner elsewhere. If the DFS succeeds, the matching grows by one. Total time O(V · E).

Q: How does bipartite matching relate to maximum flow?
A: Add a source connected to every left vertex and a sink connected from every right vertex, all with capacity 1, and direct the original edges left to right with capacity 1. The maximum flow equals the maximum matching size.

Q: What does König's theorem state?
A: In a bipartite graph, the size of a maximum matching equals the size of a minimum vertex cover (the fewest vertices touching every edge). It lets you solve some covering problems with matching.

## dsa.advanced-graphs.shortest-path-with-bitmask-state
name: "Shortest path with bitmask state"
importance: advanced
scope: "visiting all nodes"

### simple
Some shortest-path problems care not only where you are but also which places you have already visited. A bitmask records the visited set as a row of on-off switches, one per place. Running BFS over (place, visited switches) finds the fewest steps to visit everything, as long as there are only a handful of places.

### interview
- State = `(node, mask)` where bit i of `mask` means node i has been visited (or key i collected).
- **Shortest path visiting all nodes** (unweighted): multi-source BFS from every `(i, 1 << i)`; answer when `mask == full`. States: n · 2ⁿ; time **O(2ⁿ · n²)**-ish (O(2ⁿ · E)).
- Weighted version (travelling salesman): DP over subsets `dp[mask][i]`, **O(2ⁿ · n²)**.
- **Shortest path to get all keys**: BFS over (row, col, keys mask); doors need their key bit set.
- Practical for n up to about 12 to 20.

### questions
Q: How do you find the shortest path that visits every node of a small unweighted graph?
A: BFS over states (current node, set of visited nodes as a bitmask), starting from every node with only itself visited. Moving to a neighbor sets its bit. The first time any state has the full mask, its distance is the answer. With n nodes there are n · 2^n states.

Q: Why does the state need the visited mask and not just the current node?
A: The same node can be revisited with different sets of already visited nodes, and those situations have different futures. Keeping only the node would merge them and prune paths that are actually needed.

Q: How do you handle "collect all keys" in a grid maze?
A: BFS where the state is (row, column, keys collected as a bitmask). Stepping on a key sets its bit; a door can only be passed if its key's bit is set. The answer is the distance of the first state whose mask includes every key.

Q: How large can n be for bitmask-state searches?
A: The state count grows as n · 2^n, so about n ≤ 12 to 16 for BFS with heavy per-state work, and up to about 20 for tight DP loops. Beyond that, the approach is too slow or uses too much memory.
