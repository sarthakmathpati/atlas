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

### simple
Dijkstra's algorithm finds the cheapest route from one place to every other place when roads have different lengths. It always settles the closest unsettled place next, like spreading water that reaches nearer towns before farther ones. Once a place is settled, no cheaper route to it can appear later, as long as no road has a negative length.

### interview
- Min-heap of `(distance, vertex)`; pop the smallest; skip if **stale** (`d > dist[u]`); **relax** each edge: if `dist[u] + w < dist[v]`, update and push.
- Requires **non-negative** weights. With negative edges use Bellman-Ford.
- **O((V + E) log V)** with a binary heap (lazy deletion, so the heap can hold up to E entries: O(E log E), same order).
- Dense graphs: the O(V²) array version (no heap) can be faster.
- Store `parent[v]` to rebuild the path. Stop early when the target is popped if you only need one distance.
- Unweighted graphs: plain BFS; weights 0 and 1: 0-1 BFS.

### deep
#### Intuition

Among all unsettled vertices, the one with the smallest tentative distance can't be improved: any other route to it would pass through some other unsettled vertex, which is already at least as far away, and non-negative edges can only add more. So it is safe to finalize it and use it to improve its neighbors. A min-heap finds that vertex quickly.

#### Worked example

Edges (directed): `A→B 4, A→C 1, C→B 2, B→D 1, C→D 5`. Source A.

| pop | dist after relaxing (A, B, C, D) | heap after |
|---|---|---|
| (0, A) | 0, 4, 1, ∞ | (1,C) (4,B) |
| (1, C) | 0, 3, 1, 6 | (3,B) (4,B) (6,D) |
| (3, B) | 0, 3, 1, 4 | (4,B) (4,D) (6,D) |
| (4, B) | stale (4 > 3): skip | (4,D) (6,D) |
| (4, D) | final | (6,D) |
| (6, D) | stale: skip | |

Shortest distances: A 0, B 3, C 1, D 4. Path to D: A → C → B → D.

#### Code

```cpp
vector<long long> dijkstra(const vector<vector<pair<int, int>>>& adj, int src) {
    const long long INF = LLONG_MAX;
    vector<long long> dist(adj.size(), INF);
    using P = pair<long long, int>;                  // (distance, vertex)
    priority_queue<P, vector<P>, greater<P>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;                   // stale entry: u was settled cheaper
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {             // relax
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
```

#### Complexity

Each edge can push one heap entry, so there are at most $E + 1$ pushes and pops, each $O(\log E) = O(\log V)$: total $O((V + E) \log V)$. Space $O(V + E)$. The array-based version scans all vertices to find the minimum: $O(V^2)$, better when $E \approx V^2$.

#### Why negative edges break it

With `A→B 2`, `A→C 3`, `C→B −2`: the textbook algorithm finalizes B at distance 2 before looking at C, but the true distance is 1 (via C), and a finalized vertex is never revisited. The lazy version above happens to repair this example, because it pushes B again when its distance drops; but then vertices can be processed many times, the $O((V + E) \log V)$ bound is lost (the worst case becomes exponential), and a negative cycle would make it loop forever. With negative edges, use Bellman-Ford (or shortest paths in a DAG when the graph has no cycles).

#### Edge cases and bugs

- Integer overflow when adding to an "infinite" distance: skip relaxation from unreachable vertices, or use a large but safe INF.
- Forgetting the stale-entry check: still correct but slower (vertices processed multiple times).
- Using a max-heap by mistake in C++ (`priority_queue` is a max-heap by default).
- Undirected graphs: add both directions.

#### Variants

- Path with minimum effort (minimize the maximum edge on the path), maximum probability path (multiply, maximize).
- Cheapest flight with at most k stops: Dijkstra on (vertex, stops) states or Bellman-Ford with k + 1 rounds.
- Multi-source Dijkstra (all sources at distance 0), Dijkstra on grids with weighted cells.

Connects to: BFS, 0-1 BFS, Bellman-Ford, Dijkstra variants, Prim's algorithm (same heap structure).

### questions
Q: How does Dijkstra's algorithm work?
A: Keep tentative distances, starting at 0 for the source and infinity elsewhere, and a min-heap of (distance, vertex). Repeatedly pop the closest vertex; if the entry is stale, skip it; otherwise relax its outgoing edges, pushing improved distances. Each popped non-stale vertex has its final shortest distance.

Q: Why does Dijkstra require non-negative edge weights?
A: It finalizes the closest unsettled vertex on the assumption that any other path to it passes through a farther vertex and can only get longer. A negative edge could make such a path shorter after the vertex is finalized, and the classic algorithm never revisits a finalized vertex, so the answer would be wrong. Versions that re-insert improved vertices lose the O((V + E) log V) guarantee.

Q: What is the complexity of Dijkstra with a binary heap?
A: O((V + E) log V). Every edge relaxation can push one entry, and each push or pop costs O(log V). With lazy deletion the heap can hold up to E entries, which is still O(log V) per operation since log E ≤ 2 log V.

Q: What is a stale heap entry, and why skip it?
A: When a vertex's distance improves, a new entry is pushed while the old, larger one stays in the heap. When the old entry is popped, its distance is larger than the vertex's current best, so processing it would waste time; skipping it keeps each vertex processed once.

Q: How do you reconstruct the shortest path itself?
A: Record parent[v] = u whenever relaxing edge u → v improves dist[v]. After the algorithm, follow parents back from the target to the source and reverse.

### signals
- cheapest, fastest or shortest route with different non-negative edge weights
- network delay or signal travel time from one source
- a grid or graph where each move has a cost
- minimum total cost to reach a state

### template
```cpp
// Dijkstra with lazy deletion. adj[u] = {(v, w)}, w >= 0.
vector<long long> shortest(const vector<vector<pair<int, long long>>>& adj, int src) {
    vector<long long> dist(adj.size(), LLONG_MAX);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d != dist[u]) continue;                       // stale
        // (if u is the target, you can stop here)
        for (auto [v, w] : adj[u])
            if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
    }
    return dist;
}
```

## dsa.shortest-paths.0-1-bfs
name: "0-1 BFS"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "deque for edge weights 0 and 1"

### simple
0-1 BFS finds shortest paths when every move costs either nothing or one unit. It uses a line open at both ends: free moves jump to the front of the line and paid moves join the back. That keeps the line sorted by distance, so it works like Dijkstra without needing a heap.

### interview
- Deque of vertices; pop from the front; for an edge of weight 0, push the neighbor to the **front**; weight 1, to the **back** (when it improves the distance).
- The deque always holds vertices with distances d and d + 1 only, in order: a two-level priority queue.
- **O(V + E)** time, faster than Dijkstra's O((V + E) log V).
- Uses: minimum walls to remove to reach a cell, minimum cost to make a grid have a valid path (following an arrow is free, changing it costs 1), minimum edges to reverse to reach a node.
- A vertex can be pushed more than once; skip it when popped with an outdated distance, or check `dist` on relaxation as usual.

### deep
#### Intuition

Dijkstra needs a heap because distances can be anything. With weights only 0 and 1, the vertices waiting to be processed only ever have two distinct distances, the current distance $d$ and $d + 1$. A deque can keep them sorted cheaply: a 0-edge produces another vertex at distance $d$ (front), a 1-edge produces one at $d + 1$ (back).

#### Worked example: minimum edge reversals

Directed edges `0→1, 2→1, 2→3`. From 0, how many edges must be reversed to reach 3? Model each original edge as cost 0 forward and cost 1 backward.

| pop | dist (0,1,2,3) | pushes |
|---|---|---|
| 0 | 0, 0, ∞, ∞ | 1 at the front (0→1 is free) |
| 1 | 0, 0, 1, ∞ | 2 at the back (1→2 reverses 2→1: cost 1) |
| 2 | 0, 0, 1, 1 | 3 at the front (2→3 is free) |
| 3 | final | |

One reversal is needed.

#### Code

```cpp
// adj[u] = {(v, w)} with w in {0, 1}.
vector<int> zeroOneBfs(const vector<vector<pair<int, int>>>& adj, int src) {
    vector<int> dist(adj.size(), INT_MAX);
    deque<int> dq;
    dist[src] = 0;
    dq.push_back(src);
    while (!dq.empty()) {
        int u = dq.front(); dq.pop_front();
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.push_front(v);         // same distance: process soon
                else dq.push_back(v);                 // one more: process later
            }
        }
    }
    return dist;
}
```

#### Complexity

Each vertex's distance can only decrease a bounded number of times (at most twice in practice, since distances in the deque differ by at most 1), so the total work is $O(V + E)$.

#### Edge cases and bugs

- Pushing weight-0 neighbors to the back breaks the ordering (the result can be wrong).
- Weights other than 0 and 1: use Dijkstra, or Dial's algorithm (buckets) for small integer weights.

#### Variants

- Minimum cost to make at least one valid path in a grid (arrows: following costs 0, changing costs 1).
- Reorder routes so every city reaches city 0 (count reversed edges; a plain DFS also works on trees).
- Dial's algorithm: buckets for weights 0 to k, $O(V \cdot k + E)$.

Connects to: BFS, Dijkstra's algorithm, deques, grids as graphs.

### questions
Q: How does 0-1 BFS find shortest paths without a heap?
A: It uses a deque. When relaxing an edge of weight 0, the neighbor has the same distance as the current vertex, so it goes to the front; with weight 1 it goes to the back. The deque stays sorted by distance, so popping from the front always gives the closest vertex, like Dijkstra's heap.

Q: What is the complexity of 0-1 BFS, and how does it compare with Dijkstra?
A: O(V + E), since deque operations are O(1), versus O((V + E) log V) for Dijkstra with a binary heap. It only applies when every weight is 0 or 1.

Q: How can "minimum edge reversals to reach a node" be modeled as 0-1 BFS?
A: For each directed edge u → v, add a cost-0 edge u → v and a cost-1 edge v → u, meaning "use this edge backwards by reversing it". The shortest distance to the target counts the minimum reversals.

Q: What happens if you push a weight-0 neighbor to the back instead of the front?
A: The deque may stop being sorted by distance, so a vertex can be processed before its true shortest distance is known. The result can then be wrong, unless you keep relaxing, which loses the linear-time guarantee.

### signals
- each move is either free or costs exactly one
- minimum number of walls, obstacles or changes along a path
- minimum edge reversals or direction changes
- a grid where following an arrow is free but changing it costs 1

### template
```cpp
// 0-1 BFS on a grid: entering a cell costs cost(r, c), which is 0 or 1.
template <class Cost>
int zeroOneGrid(int R, int C, Cost cost) {
    vector<vector<int>> dist(R, vector<int>(C, INT_MAX));
    deque<pair<int, int>> dq;
    dist[0][0] = 0;
    dq.push_back({0, 0});
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    while (!dq.empty()) {
        auto [r, c] = dq.front(); dq.pop_front();
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
            int w = cost(nr, nc);
            if (dist[r][c] + w < dist[nr][nc]) {
                dist[nr][nc] = dist[r][c] + w;
                w ? dq.push_back({nr, nc}) : dq.push_front({nr, nc});
            }
        }
    }
    return dist[R - 1][C - 1];
}
```

## dsa.shortest-paths.bellman-ford
name: "Bellman-Ford"
importance: important
scope: "negative edges, negative cycle detection, the k-stops variant"

### simple
Bellman-Ford finds shortest paths even when some roads have negative costs, like a route that pays you a rebate. It simply tries to improve every road's destination again and again: after enough rounds, every shortest path has been discovered one edge at a time. If an improvement is still possible after that, there is a loop that keeps getting cheaper forever.

### interview
- Repeat **V − 1 rounds**: relax every edge `(u, v, w)`. A shortest path has at most V − 1 edges, and round i fixes all paths with i edges. **O(V · E)**.
- A **V-th round** that still improves something means a **negative cycle** reachable from the source.
- **At most k edges** (cheapest flights within k stops = k + 1 edges): run k + 1 rounds, relaxing from a **copy** of the previous round's distances so one round adds at most one edge.
- Works on edge lists; handles negative weights (Dijkstra can't).
- SPFA (queue-based Bellman-Ford) is often faster in practice but has the same worst case.

### questions
Q: Why does Bellman-Ford run V − 1 rounds of relaxation?
A: Without negative cycles, a shortest path visits each vertex at most once, so it has at most V − 1 edges. After round i, every shortest path using at most i edges has been found, so V − 1 rounds cover all of them.

Q: How does Bellman-Ford detect a negative cycle?
A: After V − 1 rounds all shortest distances are final if no negative cycle is reachable. Run one more round: if any edge can still be relaxed, some distance keeps decreasing, which only happens with a reachable negative cycle.

Q: How do you find the cheapest flight with at most k stops?
A: Run k + 1 rounds of Bellman-Ford, since k stops means at most k + 1 flights. In each round, relax edges using a copy of the previous round's distances, so a single round can't chain several new edges together.

Q: Why must the k-stops version relax from a copy of the distances?
A: If a round updates distances in place, an edge relaxed early in the round can feed into another edge later in the same round, letting one round extend a path by several edges. Using last round's copy limits each round to one extra edge.

## dsa.shortest-paths.floyd-warshall
name: "Floyd-Warshall"
importance: important
scope: "all-pairs shortest paths in O(V^3)"

### simple
Floyd-Warshall computes the shortest distance between every pair of places at once. It asks, one place at a time, whether passing through that place gives any pair a shorter route. After every place has been considered as a possible stopover, all distances are final.

### interview
- `dist[i][j]` starts as the edge weight (0 on the diagonal, ∞ if no edge). For each `k`, for each `i`, `j`: `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`.
- **k must be the outermost loop**: after iteration k, distances use only intermediate vertices from {0..k}.
- **O(V³)** time, **O(V²)** space: fine for V up to about 400 to 500.
- Handles negative edges; a negative value on the diagonal (`dist[i][i] < 0`) means a negative cycle.
- Uses: all-pairs distances, city with the fewest reachable cities within a threshold, transitive closure (with booleans).
- For sparse graphs with non-negative weights, running Dijkstra from every vertex is O(V (V + E) log V), often faster.

### questions
Q: What does Floyd-Warshall compute, and how?
A: The shortest distance between every pair of vertices. It considers each vertex k in turn as an allowed intermediate stop and updates every pair (i, j) with dist[i][k] + dist[k][j] when that is shorter. After all k, the distances are the true shortest distances.

Q: Why must the loop over k be the outermost loop?
A: The algorithm's invariant is that after processing k, dist[i][j] is the shortest path using only intermediates among the first k vertices. That requires all pairs to be updated for one k before moving to the next; nesting k inside breaks the invariant and gives wrong answers.

Q: How does Floyd-Warshall detect a negative cycle?
A: After it finishes, a vertex i with dist[i][i] < 0 lies on a negative cycle, since there is a way to leave i and return with negative total cost.

Q: When is Floyd-Warshall a good choice?
A: When you need all-pairs distances on a small graph (a few hundred vertices), possibly with negative edges, and simple code matters. For large sparse graphs, repeated Dijkstra is faster.

## dsa.shortest-paths.shortest-paths-in-a-dag
name: "Shortest paths in a DAG"
importance: important
prereqs: [dsa.graph-basics.topological-sort]
scope: "relax edges in topological order"

### simple
In a graph with no cycles, you can list the vertices so that every edge points forward. Processing vertices in that order means that by the time you reach a vertex, every route into it has already been counted. So one pass that improves each vertex's neighbors finds all shortest (or longest) paths, even with negative edges.

### interview
- Topologically sort, then relax each vertex's outgoing edges in that order. **O(V + E)**.
- Works with **negative** weights (there are no cycles, so no negative cycles).
- **Longest path** in a DAG: same algorithm with max instead of min (or negate weights). Longest path in a general graph is NP-hard.
- It's DP on a DAG: `dist[v] = min over edges (u → v) of dist[u] + w`.
- Uses: critical path in project scheduling, longest increasing path in a matrix (edges from smaller to larger cells), counting paths.

### questions
Q: How do you compute shortest paths in a DAG in linear time?
A: Find a topological order, set the source distance to 0, and process vertices in that order, relaxing all their outgoing edges. When a vertex is processed, all edges into it have already been relaxed, so its distance is final. That's O(V + E).

Q: Why does this work with negative edge weights, unlike Dijkstra?
A: Correctness comes from the topological order, not from settling the nearest vertex first. Every predecessor of a vertex is processed before it, whatever the weights, and a DAG can't contain a negative cycle.

Q: How do you find the longest path in a DAG?
A: Use the same topological-order DP but take the maximum instead of the minimum, or negate the weights and find the shortest path. This works only because the graph is acyclic; longest simple path in a general graph is NP-hard.

Q: How is "longest increasing path in a matrix" a DAG problem?
A: Draw an edge from each cell to every neighbor with a larger value. Strictly increasing edges can't form a cycle, so the graph is a DAG, and the longest path is found with DP in topological order or memoized DFS, in O(R · C).

## dsa.shortest-paths.dijkstra-variants
name: "Dijkstra variants"
importance: important
prereqs: [dsa.shortest-paths.dijkstras-algorithm]
scope: "minimize the maximum edge, maximize probability, count shortest paths"

### simple
Dijkstra's idea, always settle the best unsettled vertex, works for more than summing distances. You can minimize the worst single step of a route, like finding a hike whose steepest climb is as gentle as possible, or maximize the chance that every link of a route works. You only change how a path's value is computed and compared.

### interview
- **Minimize the maximum edge** (path with minimum effort): path value = `max(dist[u], w)`; min-heap. Also solvable with binary search + BFS, or union-find.
- **Maximize probability**: path value = `dist[u] * p`, max-heap; works because probabilities ≤ 1 never increase along a path.
- **Count shortest paths**: when `dist[u] + w < dist[v]`, set `ways[v] = ways[u]`; when equal, `ways[v] += ways[u]` (modulo if needed).
- **State expansion**: Dijkstra over (vertex, extra state) such as stops used, fuel, or parity.
- Requirement: the path value must never improve by extending a path (monotone), like non-negative weights.

### questions
Q: How do you find a path that minimizes the largest edge weight?
A: Run Dijkstra where a path's value is the maximum edge on it: relaxing edge (u, v, w) gives max(dist[u], w). The first time the target is popped, its value is optimal. Binary search on the answer with BFS, or adding edges in increasing order with union-find, also work.

Q: How do you find the path with the maximum success probability?
A: Run Dijkstra with a max-heap, where extending a path multiplies its probability by the edge's probability. Since probabilities are at most 1, extending a path never increases its value, which is the property Dijkstra needs.

Q: How do you count the number of shortest paths to each vertex?
A: Keep ways[v] alongside dist[v]. When an edge gives a strictly shorter distance, set ways[v] = ways[u]; when it gives an equal distance, add ways[u] to ways[v]. Process vertices in Dijkstra order so ways[u] is final before it's used.

Q: What condition must a path value satisfy for Dijkstra-style algorithms to work?
A: Extending a path must never make its value better than before (monotone), just as non-negative weights never shorten a path. Maximum edge, sums of non-negative weights and products of probabilities at most 1 all satisfy this.

## dsa.shortest-paths.a-star-search
name: "A* search"
importance: advanced
prereqs: [dsa.shortest-paths.dijkstras-algorithm]
scope: "heuristics, admissibility"

### simple
A* is Dijkstra with a sense of direction: it prefers vertices that look closer to the goal. It ranks each vertex by the distance traveled so far plus an estimate of the remaining distance, like a traveler heading toward a city they can see on the horizon. If the estimate never overestimates, A* still finds the shortest path, often much faster.

### interview
- Priority = `g(v) + h(v)`: `g` = best known cost from the start, `h` = heuristic estimate to the goal.
- **Admissible** heuristic: never overestimates the true remaining cost; then A* returns an optimal path.
- **Consistent** (monotone) heuristic: `h(u) ≤ w(u, v) + h(v)`; then each vertex is settled once, like Dijkstra.
- Grid heuristics: Manhattan distance (4 directions), Chebyshev or octile (8 directions), Euclidean.
- `h = 0` gives Dijkstra; a better (larger but admissible) `h` explores fewer vertices.
- Used in games, maps and puzzles (8-puzzle with the Manhattan distance of tiles).

### questions
Q: How does A* differ from Dijkstra's algorithm?
A: Dijkstra orders vertices by the cost so far, g. A* orders them by g + h, where h estimates the remaining cost to the goal, so it expands vertices in the goal's direction first. With h = 0 the two are identical.

Q: What makes a heuristic admissible, and why does it matter?
A: An admissible heuristic never overestimates the true remaining cost. That guarantees the goal isn't popped with a suboptimal cost, because the optimal path's priority is never above the true shortest distance.

Q: What is a consistent heuristic?
A: One where for every edge u → v, h(u) ≤ w(u, v) + h(v), a triangle inequality. Consistency implies admissibility and means that, as in Dijkstra, a vertex's cost is final the first time it's popped.

Q: What heuristic would you use for shortest paths on a 4-directional grid?
A: The Manhattan distance |r1 − r2| + |c1 − c2|, since every move changes one coordinate by 1 and there's no shortcut. For 8 directions with equal diagonal cost, use the Chebyshev distance.
