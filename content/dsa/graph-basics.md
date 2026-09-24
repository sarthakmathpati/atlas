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

### simple
A graph is a set of things (vertices) and connections between them (edges), like cities and the roads joining them. You can store it as a list of neighbors for each city, as a big yes-or-no table of every pair, or as a plain list of roads. Which one you choose decides how fast each question about the graph can be answered.

### interview
- **Adjacency list**: `adj[u]` holds u's neighbors (with weights if needed). Space **O(V + E)**; iterate neighbors in O(deg u). The default for sparse graphs and interview problems.
- **Adjacency matrix**: `m[u][v]` is 1 or a weight. Space **O(V²)**; edge check O(1); iterating neighbors O(V). Good for dense graphs and Floyd-Warshall.
- **Edge list**: a list of `(u, v, w)`. Good for Kruskal and Bellman-Ford, which just scan all edges.
- **Undirected** edges are added in both directions; **directed** edges once. Weighted graphs store pairs `(v, w)`.
- Many problems give edges as input, so building the adjacency list is step one; implicit graphs (grids, states) generate neighbors on the fly.
- Say V and E out loud: complexities are written in both (BFS is O(V + E), not O(n)).

### deep
#### Intuition

A graph can be stored in several ways, and the right one depends on which operation must be fast. "Who are the neighbors of u?" favors an adjacency list. "Is there an edge from u to v?" favors a matrix. "Give me all edges sorted by weight" favors an edge list. Most interview graphs are sparse ($E$ close to $V$), so adjacency lists win.

#### Worked example

Directed, weighted edges: `0→1 (4)`, `0→2 (1)`, `2→1 (2)`, `1→3 (5)`.

| representation | contents |
|---|---|
| adjacency list | 0: [(1,4), (2,1)]; 1: [(3,5)]; 2: [(1,2)]; 3: [] |
| matrix (∞ = no edge) | row 0: [0, 4, 1, ∞]; row 1: [∞, 0, ∞, 5]; row 2: [∞, 2, 0, ∞]; row 3: [∞, ∞, ∞, 0] |
| edge list | (0,1,4), (0,2,1), (2,1,2), (1,3,5) |

#### Code

```cpp
// Build an adjacency list from an edge list.
vector<vector<pair<int, int>>> buildWeighted(int n, const vector<array<int, 3>>& edges, bool directed) {
    vector<vector<pair<int, int>>> adj(n);
    for (auto [u, v, w] : edges) {
        adj[u].push_back({v, w});
        if (!directed) adj[v].push_back({u, w});
    }
    return adj;
}

vector<vector<int>> buildMatrix(int n, const vector<array<int, 3>>& edges) {
    const int INF = INT_MAX / 2;                    // "no edge", safe to add twice
    vector<vector<int>> m(n, vector<int>(n, INF));
    for (int i = 0; i < n; i++) m[i][i] = 0;
    for (auto [u, v, w] : edges) m[u][v] = min(m[u][v], w);  // keep the lightest parallel edge
    return m;
}
```

```python
from collections import defaultdict

def build_adjacency(edges, directed=False):
    adj = defaultdict(list)          # works for any hashable vertex labels
    for u, v in edges:
        adj[u].append(v)
        if not directed:
            adj[v].append(u)
    return adj

def in_out_degrees(n, edges):
    indeg, outdeg = [0] * n, [0] * n
    for u, v in edges:
        outdeg[u] += 1
        indeg[v] += 1
    return indeg, outdeg
```

#### Cost comparison

| Operation | Adjacency list | Matrix | Edge list |
|---|---|---|---|
| Space | $O(V + E)$ | $O(V^2)$ | $O(E)$ |
| Is (u, v) an edge? | $O(\deg u)$ | $O(1)$ | $O(E)$ |
| Neighbors of u | $O(\deg u)$ | $O(V)$ | $O(E)$ |
| Full traversal | $O(V + E)$ | $O(V^2)$ | |

With $V = 10^5$, a matrix needs $10^{10}$ cells: impossible. With $V = 500$, a matrix is fine and simplifies code.

#### Implicit graphs

Many graphs are never stored: a grid (neighbors are adjacent cells), a word ladder (neighbors differ by one letter), a lock (neighbors turn one wheel). Write a `neighbors(state)` function and run the usual traversal; the complexity counts the states and transitions you generate.

#### Edge cases and bugs

- Forgetting the reverse edge in undirected graphs.
- Vertices labeled 1 to n: allocate `n + 1` slots or subtract 1.
- Self-loops and parallel edges: decide whether they matter (cycle detection, counting).
- Disconnected graphs: traversals must start from every unvisited vertex.

#### Variants

In-degree and out-degree arrays (topological sort), reversed graphs (Kosaraju, "who can reach the target"), compressed sparse row format (fast, static), and hash-map adjacency for string vertices.

Connects to: BFS, DFS, topological sort, shortest paths, Kruskal's algorithm.

### questions
Q: When would you use an adjacency matrix instead of an adjacency list?
A: When the graph is dense (E close to V²) or small, or when you need O(1) checks of whether an edge exists, as in Floyd-Warshall. For sparse graphs a matrix wastes O(V²) space and makes iterating over neighbors O(V).

Q: What is the space complexity of an adjacency list?
A: O(V + E): one list per vertex, and each edge stored once (directed) or twice (undirected). That's why BFS and DFS on adjacency lists run in O(V + E).

Q: How do you represent a weighted graph?
A: In an adjacency list, store (neighbor, weight) pairs. In a matrix, store the weight in m[u][v], with a sentinel such as infinity for missing edges. An edge list stores (u, v, weight) triples.

Q: Which algorithms work naturally on an edge list?
A: Algorithms that repeatedly scan all edges without needing neighbor lookups: Kruskal's algorithm (sort edges by weight) and Bellman-Ford (relax every edge V − 1 times).

Q: What is an implicit graph?
A: A graph whose vertices and edges aren't stored but generated on demand, such as grid cells with their adjacent cells, or puzzle states with the moves between them. You write a function that produces a state's neighbors and run BFS or DFS over it.

## dsa.graph-basics.bfs
name: "BFS"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.queue-and-deque-basics, dsa.graph-basics.graph-representations]
scope: "shortest path in unweighted graphs, levels"

### simple
BFS explores a graph in rings, like ripples spreading from a stone dropped in water. It visits everything one step away, then two steps away, and so on. That is why it finds the shortest path when every edge costs the same.

### interview
- Queue plus visited set: push the start, mark it; pop a vertex, push each **unvisited** neighbor and mark it **when pushed** (not when popped).
- Distances: `dist[v] = dist[u] + 1` when v is discovered from u. The first time a vertex is reached is along a shortest path (unweighted).
- **O(V + E)** time, **O(V)** space.
- Levels: process the queue in batches (size snapshot) to know the current distance.
- Path reconstruction: store `parent[v]`, walk back from the target.
- Weighted graphs need Dijkstra; weights 0 and 1 need 0-1 BFS.

### deep
#### Intuition

A queue releases vertices in the order they were discovered. Vertices at distance 1 are discovered before any at distance 2, those before distance 3, and so on, so BFS visits vertices in non-decreasing order of distance from the start. When every edge has the same cost, the first time you reach a vertex is therefore along a shortest path.

#### Worked example

Graph: `0–1, 0–2, 1–3, 2–3, 3–4`. BFS from 0.

| step | pop | newly discovered (dist) | queue after |
|---|---|---|---|
| 1 | 0 | 1 (1), 2 (1) | 1 2 |
| 2 | 1 | 3 (2) | 2 3 |
| 3 | 2 | (3 already seen) | 3 |
| 4 | 3 | 4 (3) | 4 |
| 5 | 4 | | |

Distances: 0:0, 1:1, 2:1, 3:2, 4:3. Path to 4 via parents: 4 ← 3 ← 1 ← 0.

#### Code

```cpp
// Shortest distances (in edges) from src; -1 means unreachable.
vector<int> bfsDistances(const vector<vector<int>>& adj, int src) {
    vector<int> dist(adj.size(), -1);
    queue<int> q;
    dist[src] = 0;                                   // mark when pushed
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            if (dist[v] != -1) continue;             // already discovered
            dist[v] = dist[u] + 1;
            q.push(v);
        }
    }
    return dist;
}

vector<int> shortestPath(const vector<vector<int>>& adj, int src, int dst) {
    vector<int> parent(adj.size(), -2);              // -2: unseen
    queue<int> q;
    parent[src] = -1;
    q.push(src);
    while (!q.empty() && parent[dst] == -2) {
        int u = q.front(); q.pop();
        for (int v : adj[u])
            if (parent[v] == -2) { parent[v] = u; q.push(v); }
    }
    if (parent[dst] == -2) return {};
    vector<int> path;
    for (int v = dst; v != -1; v = parent[v]) path.push_back(v);
    reverse(path.begin(), path.end());
    return path;
}
```

```python
from collections import deque

def bfs_levels(adj, src):
    """Vertices grouped by distance from src."""
    seen, levels, q = {src}, [], deque([src])
    while q:
        level = []
        for _ in range(len(q)):
            u = q.popleft()
            level.append(u)
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    q.append(v)
        levels.append(level)
    return levels
```

#### Why mark on push, not on pop

If you mark a vertex only when it is popped, it can be pushed several times by different neighbors before its first pop. The answers stay correct, but the queue can grow to $O(E)$ and time increases. Marking when pushing guarantees each vertex enters the queue once.

#### Complexity

Each vertex is enqueued and dequeued once, and each adjacency list is scanned once: $O(V + E)$ time. The queue and visited array take $O(V)$ space.

#### Edge cases and bugs

- Disconnected graphs: unreachable vertices keep distance −1 (or ∞).
- Source equals target: distance 0.
- Using BFS on weighted graphs gives the fewest edges, not the least cost.
- Using a Python list as a queue (`pop(0)` is O(n)).

#### Variants

- Multi-source BFS (start with many sources at distance 0).
- Bidirectional BFS: search from both ends and meet in the middle, often exploring far fewer states.
- BFS on grids and state spaces; 0-1 BFS with a deque; BFS layers for bipartite checks.

Connects to: queues, DFS, multi-source BFS, Dijkstra's algorithm, level-order traversal.

### questions
Q: Why does BFS find shortest paths in unweighted graphs?
A: The queue processes vertices in order of discovery, so all vertices at distance d are processed before any at distance d + 1. When a vertex is first discovered, it is from a vertex one step closer to the source, so its recorded distance is the minimum possible.

Q: What is the time and space complexity of BFS?
A: O(V + E) time with an adjacency list, since each vertex is enqueued once and each edge examined once (twice for undirected graphs). O(V) space for the queue and visited markers.

Q: Why should you mark vertices as visited when you push them rather than when you pop them?
A: Otherwise a vertex can be pushed many times by different neighbors before it is processed, blowing the queue up to O(E) entries and wasting time. Marking on push ensures each vertex is queued exactly once.

Q: How do you reconstruct the actual shortest path, not just its length?
A: Record parent[v] = u when v is discovered from u. After BFS, start at the target and follow parents back to the source, then reverse the list.

Q: When is BFS the wrong choice for shortest paths?
A: When edges have different non-negative weights: BFS minimizes the number of edges, not total weight, so use Dijkstra. With weights 0 and 1 only, a 0-1 BFS with a deque works. With negative weights, use Bellman-Ford.

### signals
- shortest path or fewest steps when every move costs the same
- "minimum number of moves, jumps or transformations"
- process nodes level by level, in rings around a start
- the nearest node satisfying a condition

### template
```cpp
// BFS from a source over an implicit or explicit graph; dist doubles as "visited".
template <class Neighbors>
vector<int> bfs(int n, int src, Neighbors neighbors) {
    vector<int> dist(n, -1);
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : neighbors(u)) {
            if (dist[v] != -1) continue;       // seen already
            dist[v] = dist[u] + 1;             // mark on push
            q.push(v);                         // (return early here if v is the target)
        }
    }
    return dist;
}
```

## dsa.graph-basics.dfs
name: "DFS"
importance: must
pattern: true
prereqs: [dsa.graph-basics.graph-representations]
scope: "recursive and iterative, discovery and finish order"

### simple
DFS explores a graph by following one path as far as it can go, then backing up to the last fork and trying the next branch. It is like exploring a maze by always taking the next unexplored corridor and retracing your steps at dead ends. It naturally finds everything reachable and reveals structure such as cycles and the order in which things must be done.

### interview
- Recursive: mark u visited, recurse into each unvisited neighbor. Iterative: an explicit stack.
- **O(V + E)** time, **O(V)** space (visited plus stack depth, which can be V).
- **Discovery time** (when first visited) and **finish time** (when all descendants are done) power cycle detection, topological sort (reverse finish order) and SCCs.
- Uses: reachability, connected components, cycle detection, topological sort, path existence, backtracking over states.
- DFS does **not** give shortest paths in unweighted graphs; use BFS for those.
- Deep recursion can overflow on large graphs (a path of 10⁵ vertices); switch to an iterative stack.

### deep
#### Intuition

DFS commits to one direction and goes deep, remembering where it came from on the call stack. When a vertex has no unvisited neighbors, the search backs up. The moment a vertex "finishes" (all its reachable descendants are done) carries structural information: in a directed acyclic graph, a vertex always finishes after everything it points to, which is exactly what topological sorting needs.

#### Worked example: discovery and finish times

Directed graph: `A→B, A→C, B→D, C→D`. DFS from A, neighbors in alphabetical order.

| time | event | stack (top right) |
|---|---|---|
| 1 | discover A | A |
| 2 | discover B | A B |
| 3 | discover D | A B D |
| 4 | finish D | A B |
| 5 | finish B | A |
| 6 | discover C (D already visited) | A C |
| 7 | finish C | A |
| 8 | finish A | |

Finish order: D, B, C, A. Reversed: A, C, B, D, a valid topological order.

#### Code

```cpp
void dfs(int u, const vector<vector<int>>& adj, vector<bool>& seen, vector<int>& finishOrder) {
    seen[u] = true;                                  // discovery
    for (int v : adj[u])
        if (!seen[v]) dfs(v, adj, seen, finishOrder);
    finishOrder.push_back(u);                        // finish: all descendants done
}

// Iterative DFS (preorder of discovery), safe for very deep graphs.
vector<int> dfsIterative(const vector<vector<int>>& adj, int src) {
    vector<bool> seen(adj.size(), false);
    vector<int> order, st = {src};
    while (!st.empty()) {
        int u = st.back(); st.pop_back();
        if (seen[u]) continue;                       // a vertex can be pushed more than once
        seen[u] = true;
        order.push_back(u);
        for (int i = (int)adj[u].size() - 1; i >= 0; i--)  // reverse: visit in list order
            if (!seen[adj[u][i]]) st.push_back(adj[u][i]);
    }
    return order;
}
```

```python
def has_path(adj, src, dst):
    seen, stack = {src}, [src]
    while stack:
        u = stack.pop()
        if u == dst:
            return True
        for v in adj[u]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return False

def all_paths_dag(adj, src, dst):
    """Every path from src to dst in a DAG (backtracking DFS; no visited set needed)."""
    paths, path = [], [src]
    def go(u):
        if u == dst:
            paths.append(path[:])
            return
        for v in adj[u]:
            path.append(v)
            go(v)
            path.pop()
    go(src)
    return paths
```

#### Complexity

Each vertex is visited once and each edge examined once (twice if undirected): $O(V + E)$. The visited array is $O(V)$, and the recursion or stack can reach depth $O(V)$. Enumerating **all** paths (backtracking) is exponential in the worst case, a different problem.

#### Edge cases and bugs

- Forgetting the visited set on graphs with cycles loops forever.
- Stack overflow on long chains; Python's default limit is 1,000 frames.
- In the iterative version, marking on pop (as above) allows duplicates on the stack; marking on push changes the visiting order slightly but also works for reachability.
- Disconnected graphs: loop over all vertices and start DFS from each unvisited one.

#### Variants

- DFS with colors (white, gray, black) for directed cycle detection.
- DFS on grids (flood fill, islands).
- Tarjan's algorithms (bridges, articulation points, SCCs) use discovery times and low-links.
- Backtracking is DFS over a tree of choices, where "visited" is undone on return.

Connects to: BFS, connected components, cycle detection, topological sort, backtracking.

### questions
Q: What is the difference between BFS and DFS?
A: BFS uses a queue and explores in order of distance from the start, so it finds shortest paths in unweighted graphs. DFS uses a stack or recursion and goes as deep as possible before backing up, which suits reachability, cycle detection, topological sort and exhaustive search. Both are O(V + E).

Q: What are discovery and finish times used for?
A: Discovery is when DFS first reaches a vertex; finish is when all vertices reachable from it are done. Reverse finish order gives a topological order in a DAG, an edge to a discovered but unfinished vertex reveals a cycle in a directed graph, and finish times drive Kosaraju's SCC algorithm.

Q: When would you use iterative DFS instead of recursion?
A: When the graph can be deep, such as a path of 10^5 vertices, which can overflow the call stack, especially in Python. An explicit stack lives on the heap and avoids the limit.

Q: Why doesn't DFS find shortest paths?
A: DFS may reach a vertex first through a long detour, because it follows one branch to the end before trying others. Nothing guarantees the first visit is along a shortest path, unlike BFS, which explores by increasing distance.

Q: What is the complexity of DFS, and why?
A: O(V + E): every vertex is marked once and never revisited, and each adjacency list is scanned once when its vertex is processed.

### signals
- can you get from A to B (reachability, path existence)
- explore everything connected to a start point
- detect cycles or compute an order that respects dependencies
- enumerate paths or configurations with backtracking

### template
```cpp
// Recursive DFS with discovery and finish hooks.
struct DFS {
    const vector<vector<int>>& adj;
    vector<int> state;                           // 0 = unseen, 1 = on the stack, 2 = finished
    explicit DFS(const vector<vector<int>>& g) : adj(g), state(g.size(), 0) {}
    void run(int u) {
        state[u] = 1;                            // discovery: pre-work here
        for (int v : adj[u]) {
            if (state[v] == 0) run(v);           // tree edge
            // state[v] == 1 here means a back edge (a cycle in a directed graph)
        }
        state[u] = 2;                            // finish: post-work here (e.g. push to an order)
    }
};
```

## dsa.graph-basics.grids-as-graphs
name: "Grids as graphs"
importance: must
pattern: true
prereqs: [dsa.graph-basics.dfs]
scope: "4 and 8 directions, bounds checks, flood fill, islands"

### simple
A grid is a graph in disguise: each cell is a vertex, and it connects to its neighbors up, down, left and right. Counting islands on a map of land and water is just counting groups of connected land cells. You explore each group with DFS or BFS, marking cells as you go, like coloring in a region with a paint bucket.

### interview
- Neighbors via direction arrays: `dr = {1, -1, 0, 0}`, `dc = {0, 0, 1, -1}`; 8 directions add the diagonals.
- Always **bounds check** before reading `grid[r][c]`: `0 <= r < R && 0 <= c < C`.
- **Flood fill / number of islands**: for each unvisited land cell, start a DFS or BFS that marks the whole island; count the starts. **O(R · C)**.
- Mark visited by **overwriting** the grid (if allowed) or with a separate boolean grid.
- Shortest path in a grid with unit steps: **BFS**. Obstacles are simply cells you skip.
- Border tricks: surrounded regions and enclaves start from the border and mark everything reachable from it.

### deep
#### Intuition

Once you see cells as vertices and adjacency as edges, grid problems become ordinary graph traversals. The only grid-specific details are generating neighbors with direction arrays and staying inside the bounds. Because each cell has at most 4 (or 8) neighbors, $E = O(V)$ and every traversal is $O(R \cdot C)$.

#### Worked example: count islands

```
1 1 0 0
1 0 0 1
0 0 1 1
0 0 0 0
```

| scan reaches | land and unvisited? | flood fill marks | islands |
|---|---|---|---|
| (0,0) | yes | (0,0), (0,1), (1,0) | 1 |
| (1,3) | yes | (1,3), (2,3), (2,2) | 2 |
| every other cell | no | | 2 |

#### Code

```cpp
int numIslands(vector<vector<char>>& g) {
    int R = g.size(), C = R ? g[0].size() : 0, islands = 0;
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (g[r][c] != '1') continue;
            islands++;
            vector<pair<int, int>> st = {{r, c}};          // iterative flood fill
            g[r][c] = '0';                                  // mark when pushed
            while (!st.empty()) {
                auto [cr, cc] = st.back(); st.pop_back();
                for (int k = 0; k < 4; k++) {
                    int nr = cr + dr[k], nc = cc + dc[k];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] != '1') continue;
                    g[nr][nc] = '0';
                    st.push_back({nr, nc});
                }
            }
        }
    return islands;
}

// Shortest path from the top-left to the bottom-right through 0-cells (8 directions).
int shortestClearPath(const vector<vector<int>>& g) {
    int n = g.size();
    if (g[0][0] || g[n - 1][n - 1]) return -1;
    vector<vector<int>> dist(n, vector<int>(n, -1));
    queue<pair<int, int>> q;
    q.push({0, 0});
    dist[0][0] = 1;                                         // counts cells on the path
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();
        for (int dr = -1; dr <= 1; dr++)
            for (int dc = -1; dc <= 1; dc++) {
                int nr = r + dr, nc = c + dc;
                if (nr < 0 || nc < 0 || nr >= n || nc >= n || g[nr][nc] || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
    }
    return dist[n - 1][n - 1];
}
```

```python
def max_area_of_island(grid):
    R, C = len(grid), len(grid[0])
    seen = [[False] * C for _ in range(R)]

    def area(r, c):
        stack, total = [(r, c)], 0
        seen[r][c] = True
        while stack:
            cr, cc = stack.pop()
            total += 1
            for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1 and not seen[nr][nc]:
                    seen[nr][nc] = True
                    stack.append((nr, nc))
        return total

    return max((area(r, c) for r in range(R) for c in range(C)
                if grid[r][c] == 1 and not seen[r][c]), default=0)
```

#### Marking visited: overwrite or keep a grid?

Overwriting cells (land becomes water, or a sentinel like `'#'`) saves memory and is common in interviews, but it destroys the input; say so and offer to restore it or copy it. A separate `visited` grid keeps the input intact and is required when the same grid is searched several times with different rules. For problems where the path matters (word search), the mark must be removed on the way back; for reachability (islands), it stays.

#### Complexity

Every cell is visited once and checks at most 4 or 8 neighbors: $O(R \cdot C)$ time. Space $O(R \cdot C)$ in the worst case for the stack, queue or visited grid.

#### Edge cases and bugs

- Bounds checks after reading the cell (crash) instead of before.
- Recursive flood fill on a 1000 × 1000 grid of land can recurse a million levels deep; use an explicit stack or BFS.
- Mixing up rows and columns (`grid[c][r]`).
- Mutating the input when the caller needs it; copy it or use a visited grid.

#### Variants

- Surrounded regions, number of enclaves, Pacific Atlantic water flow (start from the borders).
- Island perimeter (count edges to water), distinct island shapes (record the path signature).
- Shortest path with obstacles and k removals (BFS over (r, c, k) states).
- Rotting oranges and distance to the nearest 0 (multi-source BFS).

Connects to: DFS, BFS, connected components, multi-source BFS, matrix traversal.

### questions
Q: How do you count the number of islands in a grid?
A: Scan every cell. When you find unvisited land, increase the count and flood fill the whole island with DFS or BFS, marking each land cell visited. Each cell is processed once, so it's O(R · C).

Q: How do you generate the neighbors of a cell cleanly?
A: Use direction arrays such as dr = {1, −1, 0, 0} and dc = {0, 0, 1, −1} (add the four diagonals for 8 directions), and for each direction compute the new cell and check it's inside the grid before using it.

Q: Why might recursive flood fill fail on large grids, and what's the fix?
A: A large all-land region makes the recursion as deep as the number of cells, which can overflow the call stack. Use an explicit stack or BFS queue instead.

Q: How do you find the shortest path in a grid where each step costs 1?
A: BFS from the start cell, skipping walls and visited cells; the distance when the target is first reached is the shortest path length. DFS doesn't guarantee shortest paths.

Q: How do you solve "surrounded regions", where regions touching the border stay?
A: Instead of searching each region, flood fill from every border cell that is open, marking the cells connected to the border. Afterwards, every open cell not marked is surrounded and can be flipped.

### signals
- a 2D grid of cells where movement is between adjacent cells
- count islands, regions or connected blobs
- fill a region (paint bucket), or find areas cut off from the border
- shortest number of steps in a maze

### template
```cpp
// Grid traversal skeleton: direction arrays, bounds check, visited marking.
const int DR[4] = {1, -1, 0, 0}, DC[4] = {0, 0, 1, -1};

int floodFillSize(vector<vector<int>>& g, int sr, int sc, int target, int mark) {
    int R = g.size(), C = g[0].size(), size = 0;
    if (g[sr][sc] != target) return 0;
    vector<pair<int, int>> st = {{sr, sc}};
    g[sr][sc] = mark;                                  // mark when pushed
    while (!st.empty()) {
        auto [r, c] = st.back(); st.pop_back();
        size++;
        for (int k = 0; k < 4; k++) {
            int nr = r + DR[k], nc = c + DC[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;  // bounds first
            if (g[nr][nc] != target) continue;                      // wall, water or seen
            g[nr][nc] = mark;
            st.push_back({nr, nc});
        }
    }
    return size;
}
```

## dsa.graph-basics.connected-components
name: "Connected components"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "counting components with DFS or BFS"

### simple
A connected component is a group of vertices that can all reach each other, with no path to anything outside the group. It is like the separate friend circles in a school, where everyone in a circle is connected through friends of friends. Counting them means starting a search from anyone not yet visited, marking everyone that search reaches, and repeating.

### interview
- Loop over all vertices; for each unvisited one, run DFS or BFS to mark its whole component; count the starts. **O(V + E)**.
- Label each vertex with its component id if later queries ask "are u and v connected?" (O(1) per query).
- **Union-find** is an alternative, especially when edges arrive over time (online) or you only need the count.
- Directed graphs: "connected" becomes **weakly** connected (ignore direction) or **strongly** connected (SCC algorithms).
- Number of edges needed to connect everything = components − 1 (network connections problem, if enough spare edges exist).

### deep
#### Intuition

A single traversal from a vertex finds exactly its component: everything reachable from it. Vertices not reached belong to other components. So one pass over all vertices, launching a traversal from each unvisited vertex, visits every vertex and edge once and discovers each component exactly once.

#### Worked example

`n = 6`, edges `0–1, 1–2, 3–4`. Vertex 5 is isolated.

| start | reached | component id |
|---|---|---|
| 0 | 0, 1, 2 | 0 |
| 3 | 3, 4 | 1 |
| 5 | 5 | 2 |

Three components. Queries: 0 and 2 connected (same id); 2 and 3 not.

#### Code

```cpp
vector<int> componentIds(int n, const vector<vector<int>>& adj, int& count) {
    vector<int> comp(n, -1);
    count = 0;
    for (int s = 0; s < n; s++) {
        if (comp[s] != -1) continue;
        vector<int> st = {s};
        comp[s] = count;
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            for (int v : adj[u])
                if (comp[v] == -1) { comp[v] = count; st.push_back(v); }
        }
        count++;                                     // one component fully labeled
    }
    return comp;
}

// Minimum cables to move so that n computers are connected (edges given), or -1.
int makeConnected(int n, const vector<vector<int>>& connections) {
    if ((int)connections.size() < n - 1) return -1;   // not enough cables at all
    vector<vector<int>> adj(n);
    for (auto& e : connections) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
    int count;
    componentIds(n, adj, count);
    return count - 1;
}
```

```python
def count_components(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    seen, count = [False] * n, 0
    for s in range(n):
        if seen[s]:
            continue
        count += 1
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return count
```

#### Components in other shapes

The same loop works on any representation: an adjacency matrix (scan row u for neighbors, $O(V^2)$ total), a grid (neighbors are adjacent cells), or an implicit graph where two items are connected when they share something (a row, a column, an email). In the last case, connecting every pair explicitly can create $O(n^2)$ edges; connecting each item to a shared key instead (or using union-find keyed by the shared value) keeps it linear.

#### DFS/BFS versus union-find

| Situation | Better choice |
|---|---|
| All edges known up front, need component labels | DFS or BFS, $O(V + E)$ |
| Edges arrive one at a time, "are u and v connected now?" | union-find, near $O(1)$ each |
| Also need component sizes or merging with extra data | union-find with size |
| Need paths or distances inside a component | BFS |

#### Complexity

$O(V + E)$ time and $O(V)$ space.

#### Edge cases and bugs

- Isolated vertices are components too; don't only iterate over vertices that appear in edges.
- Vertex labels 1 to n versus 0 to n − 1.
- Treating a directed graph as undirected without saying so.

#### Variants

- Number of provinces (adjacency matrix input), friend circles, accounts merge.
- Largest component, size of each component, and pairs of unreachable nodes: $\sum_i s_i (n - s_i) / 2$ from component sizes.
- Components after removing an edge or vertex (bridges and articulation points).

Connects to: DFS, BFS, disjoint set union, strongly connected components.

### questions
Q: How do you count connected components in an undirected graph?
A: Loop over every vertex. For each one not yet visited, run DFS or BFS to mark everything reachable from it, and increase the count. Each vertex and edge is processed once, so it's O(V + E).

Q: When would you use union-find instead of DFS for components?
A: When edges arrive over time and you need connectivity answers after each one, or when you only need to merge groups and count them. Union-find handles each union and query in nearly O(1) amortized without rebuilding anything.

Q: How many extra edges are needed to connect a graph with k components?
A: At least k − 1, one to join each additional component to the rest. If edges can only be moved from elsewhere, you also need the graph to have at least n − 1 edges in total.

Q: How do you count pairs of vertices that can't reach each other?
A: Compute the size of every component. A vertex in a component of size s can't reach the n − s vertices outside it, so the number of unreachable pairs is the sum of s · (n − s) over components, divided by two.

## dsa.graph-basics.multi-source-bfs
name: "Multi-source BFS"
importance: must
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "rotting oranges, distance to nearest"

### simple
Multi-source BFS starts spreading from many places at once instead of from a single start. Imagine several fires breaking out at the same moment and spreading one cell per minute: each cell burns at the time the nearest fire reaches it. Putting all the starting points in the queue together finds every cell's distance to its nearest source in one pass.

### interview
- Push **all sources** into the queue at distance 0, mark them, then run ordinary BFS. **O(V + E)** total, not O(k · (V + E)).
- Result: each vertex's distance to its **nearest** source.
- **Rotting oranges**: sources = rotten oranges; answer = number of BFS levels until no fresh orange is reached (−1 if some fresh orange stays fresh).
- **Distance to the nearest 0** (01 matrix), walls and gates, as far from land as possible (maximize the minimum distance).
- Equivalent to adding a super-source connected to every source with weight 0.
- Also used "in reverse": start from targets to compute distances **to** them.

### deep
#### Intuition

Running BFS separately from each of $k$ sources and taking minimums costs $k$ times as much. But BFS processes vertices in order of distance, so if all sources start in the queue at distance 0, the frontier expands from all of them simultaneously. Each vertex is first reached by the wave from its nearest source, which is exactly the minimum over sources.

#### Worked example: rotting oranges

Minute 0 (2 = rotten, 1 = fresh, 0 = empty):

```
2 1 1
1 1 0
0 1 1
```

| minute | newly rotten |
|---|---|
| 1 | (0,1), (1,0) |
| 2 | (0,2), (1,1) |
| 3 | (2,1) |
| 4 | (2,2) |

All fresh oranges rot after **4** minutes.

#### Code

```cpp
int orangesRotting(vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size(), fresh = 0, minutes = 0;
    queue<pair<int, int>> q;
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (g[r][c] == 2) q.push({r, c});        // every source starts at time 0
            else if (g[r][c] == 1) fresh++;
        }
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    while (!q.empty() && fresh > 0) {
        for (int size = q.size(); size > 0; size--) {   // one minute = one BFS level
            auto [r, c] = q.front(); q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] != 1) continue;
                g[nr][nc] = 2;
                fresh--;
                q.push({nr, nc});
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}
```

```python
from collections import deque

def distance_to_nearest_zero(mat):
    R, C = len(mat), len(mat[0])
    dist = [[-1] * C for _ in range(R)]
    q = deque()
    for r in range(R):
        for c in range(C):
            if mat[r][c] == 0:
                dist[r][c] = 0
                q.append((r, c))
    while q:
        r, c = q.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))
    return dist
```

#### Reversing the direction of the question

"How far is each cell from the nearest exit?" and "how far is each exit from the nearest cell?" look similar but differ. Multi-source BFS answers the first kind: start from all the exits at once. If the graph is directed, run the BFS on the reversed graph when you need distances **to** the sources rather than **from** them. Also note that multi-source BFS gives only the distance to the nearest source; if you need, for each cell, the distances to every source, you're back to one BFS per source.

#### Complexity

$O(V + E)$, which is $O(R \cdot C)$ on grids, no matter how many sources there are. Space $O(V)$.

#### Edge cases and bugs

- No fresh oranges at the start: the answer is 0, not −1.
- Counting a final extra minute when the last level rots nothing: stop when `fresh == 0` (as above) or subtract one.
- Unreachable targets must be detected (fresh count stays positive, or distance stays −1).
- Running single-source BFS from every source: correct but $k$ times slower.

#### Variants

- As far from land as possible: multi-source BFS from all land cells, answer the largest distance to water.
- Walls and gates: sources are gates.
- Map of highest peak (heights from water cells).
- Voronoi-style labeling: also record which source reached each cell first.

Connects to: BFS, grids as graphs, Dijkstra (multi-source with weights works the same way).

### questions
Q: How do you compute every cell's distance to the nearest 0 in a matrix efficiently?
A: Put all zero cells into the BFS queue at distance 0, then run a normal BFS; each cell's distance is set the first time it's reached. That takes O(R · C), versus O(R · C) per source if you ran BFS from each zero separately.

Q: Why does starting BFS from all sources at once give the nearest-source distance?
A: BFS expands in order of distance, and with all sources at distance 0 the waves from every source grow together. A vertex is first reached by the wave that gets there soonest, which comes from its nearest source.

Q: How do you compute the time for all oranges to rot?
A: Queue all rotten oranges, count the fresh ones, and run BFS level by level, where each level is one minute and rots fresh neighbors. If the fresh count reaches zero, the number of levels processed is the answer; if the queue empties first, return −1.

Q: What is the relationship between multi-source BFS and a super-source?
A: It is equivalent to adding a virtual vertex connected by zero-cost edges to every source and running single-source BFS from it. The same trick works for Dijkstra with weighted edges.

### signals
- distance from every cell to the nearest of many sources
- something spreads from several starting points simultaneously (rot, fire, infection)
- "minimum time until everything is reached"
- maximize the distance to the nearest special cell

### template
```cpp
// Multi-source BFS: all sources start at distance 0.
vector<int> nearestSourceDist(int n, const vector<int>& sources, const vector<vector<int>>& adj) {
    vector<int> dist(n, -1);
    queue<int> q;
    for (int s : sources) { dist[s] = 0; q.push(s); }
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u])
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return dist;                               // -1: unreachable from every source
}
```

## dsa.graph-basics.cycle-detection-in-undirected-graphs
name: "Cycle detection in undirected graphs"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "DFS with parent, DSU"

### simple
An undirected graph has a cycle if you can leave a vertex and come back to it without reusing an edge. During a search, reaching a vertex you already visited, other than the one you just came from, means you found another way around: a cycle. Union-find gives a second method: an edge whose two ends are already connected closes a loop.

### interview
- **DFS with parent**: when exploring u's neighbor v, if v is visited and **v != parent(u)**, there's a cycle. O(V + E).
- BFS works the same way, storing each vertex's parent.
- **Union-find**: for each edge (u, v), if `find(u) == find(v)` the edge closes a cycle; otherwise union them. Near O(E).
- Quick count test for a connected graph: it's a tree iff E = V − 1 (and connected); more edges imply a cycle.
- Parallel edges (two edges between the same pair) form a cycle; the parent check must use edge ids to see them.
- Must loop over all components.

### deep
#### Intuition

In a DFS of an undirected graph, every edge either leads to a new vertex (a tree edge) or to a vertex already discovered. The edge back to the parent is just the tree edge seen from the other side. Any other edge to a visited vertex connects two vertices that were already joined through the DFS tree, so together with the tree path it forms a cycle.

#### Worked example

Edges `0–1, 1–2, 2–0, 2–3`. DFS from 0.

| visit | from | neighbors checked | result |
|---|---|---|---|
| 0 | | 1 (unvisited) | go to 1 |
| 1 | 0 | 0 (parent, ignore), 2 (unvisited) | go to 2 |
| 2 | 1 | 1 (parent), 0 (visited, not parent) | **cycle** 0–1–2–0 |

With union-find: `0–1` union, `1–2` union, `2–0`: find(2) == find(0), cycle.

#### Code

```cpp
bool hasCycleDfs(int n, const vector<vector<int>>& adj) {
    vector<int> parent(n, -2);                           // -2: unvisited
    for (int s = 0; s < n; s++) {
        if (parent[s] != -2) continue;
        vector<int> st = {s};
        parent[s] = -1;
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            for (int v : adj[u]) {
                if (parent[v] == -2) { parent[v] = u; st.push_back(v); }
                else if (v != parent[u]) return true;    // visited and not the tree parent
            }
        }
    }
    return false;
}

bool hasCycleDsu(int n, const vector<pair<int, int>>& edges) {
    vector<int> p(n);
    iota(p.begin(), p.end(), 0);
    function<int(int)> find = [&](int x) { return p[x] == x ? x : p[x] = find(p[x]); };
    for (auto [u, v] : edges) {
        int a = find(u), b = find(v);
        if (a == b) return true;                         // already connected: this edge closes a loop
        p[a] = b;
    }
    return false;
}
```

```python
def valid_tree(n, edges):
    """A graph is a tree iff it has n - 1 edges and no cycle (then it is connected)."""
    if len(edges) != n - 1:
        return False
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for u, v in edges:
        a, b = find(u), find(v)
        if a == b:
            return False
        parent[a] = b
    return True
```

#### Why the iterative check is subtle

In the iterative DFS above, a vertex is marked (given a parent) when pushed. A vertex v may already be marked by a different parent while still on the stack; seeing it again from u means two different tree paths reach v, which also forms a cycle, so reporting it is correct. The only neighbor to ignore is the actual tree parent of u.

#### Complexity

DFS/BFS: $O(V + E)$. Union-find: $O(E \, \alpha(V))$, effectively linear.

#### Edge cases and bugs

- Self-loops (`u–u`) are cycles; the parent check alone may miss them if the parent is also u. Check `u == v` explicitly if self-loops can appear.
- Parallel edges `u–v` twice: a cycle of length 2 in a multigraph, invisible to a parent-vertex check; track the parent edge id.
- Forgetting disconnected parts.

#### Variants

- Redundant connection: return the edge that closes the first cycle (union-find).
- Graph valid tree (above), and find the cycle's vertices (walk parents from both endpoints).

Connects to: DFS, disjoint set union, cycle detection in directed graphs, trees.

### questions
Q: How do you detect a cycle in an undirected graph with DFS?
A: Track each vertex's parent in the DFS tree. When exploring u's neighbors, a neighbor that is already visited and isn't u's parent means there's a second path between them, so there's a cycle. It's O(V + E).

Q: Why must you ignore the parent?
A: In an undirected graph, the edge from u back to its parent is the same edge you just used to reach u. Without ignoring it, every edge would look like a cycle.

Q: How does union-find detect a cycle?
A: Process edges one at a time. If both endpoints already have the same root, they're already connected, so this edge closes a cycle. Otherwise, union their sets. It runs in near-linear time.

Q: How can you check whether a graph is a tree?
A: It must be connected and acyclic, which for n vertices is equivalent to having exactly n − 1 edges and no cycle (or n − 1 edges and being connected). Check the edge count, then run union-find or a traversal.

Q: Why is the undirected method wrong for directed graphs?
A: In a directed graph, reaching an already visited vertex doesn't imply a cycle: two separate paths can lead to the same vertex without any loop, like A→B, A→C, B→D, C→D. Directed graphs need the three-color DFS or Kahn's algorithm.

## dsa.graph-basics.cycle-detection-in-directed-graphs
name: "Cycle detection in directed graphs"
importance: must
prereqs: [dsa.graph-basics.dfs]
scope: "DFS with three colors"

### simple
In a directed graph, a cycle means following the arrows can bring you back where you started, like tasks that each wait on the next and the last waits on the first. DFS finds it by remembering which vertices are on the current path. If the search reaches a vertex that is still on the current path, the arrows loop back: that is a cycle.

### interview
- **Three colors**: white (unvisited), gray (on the current DFS path), black (finished). An edge to a **gray** vertex is a back edge: a cycle. Edges to black vertices are fine.
- O(V + E) time, O(V) space.
- **Kahn's algorithm** (BFS topological sort) also detects cycles: if fewer than V vertices get processed, the remaining ones are in or behind a cycle.
- A plain visited set is **not enough** for directed graphs (a diamond A→B, A→C, B→D, C→D revisits D without a cycle).
- Uses: course schedule (can all courses be finished?), deadlock detection, build dependency checks.
- To output the cycle: store parents and walk back from the gray vertex.

### deep
#### Intuition

A cycle exists exactly when DFS finds an edge pointing to an ancestor on the current recursion path (a back edge). Visited vertices that have already finished are safe: everything reachable from them was fully explored without returning to them, so reaching them again can't close a loop. That's why you need three states, not two.

#### Worked example

Edges `0→1, 1→2, 2→0, 2→3`. DFS from 0.

| step | vertex | colors after | edge examined |
|---|---|---|---|
| 1 | 0 | 0 gray | 0→1 |
| 2 | 1 | 0, 1 gray | 1→2 |
| 3 | 2 | 0, 1, 2 gray | 2→0: 0 is **gray**: cycle |

Contrast `0→1, 0→2, 1→3, 2→3`: when DFS reaches 3 the second time (from 2), 3 is **black**, so no cycle.

#### Code

```cpp
bool hasDirectedCycle(int n, const vector<vector<int>>& adj) {
    vector<int> color(n, 0);                          // 0 white, 1 gray, 2 black
    function<bool(int)> dfs = [&](int u) -> bool {
        color[u] = 1;
        for (int v : adj[u]) {
            if (color[v] == 1) return true;           // back edge to the current path
            if (color[v] == 0 && dfs(v)) return true;
        }
        color[u] = 2;                                 // fully explored, never part of a new cycle
        return false;
    };
    for (int s = 0; s < n; s++)
        if (color[s] == 0 && dfs(s)) return true;
    return false;
}
```

```python
from collections import deque

def can_finish(num_courses, prerequisites):
    """Kahn's algorithm: all courses can be taken iff the graph has no cycle."""
    adj = [[] for _ in range(num_courses)]
    indeg = [0] * num_courses
    for course, pre in prerequisites:
        adj[pre].append(course)
        indeg[course] += 1
    q = deque(i for i in range(num_courses) if indeg[i] == 0)
    taken = 0
    while q:
        u = q.popleft()
        taken += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return taken == num_courses

def eventual_safe_nodes(graph):
    """Nodes from which every path ends at a terminal node (none reaches a cycle)."""
    color = [0] * len(graph)                 # 0 unseen, 1 on path, 2 safe
    def safe(u):
        if color[u]:
            return color[u] == 2
        color[u] = 1
        if any(not safe(v) for v in graph[u]):
            return False                     # stays gray: part of or leads to a cycle
        color[u] = 2
        return True
    return [u for u in range(len(graph)) if safe(u)]
```

#### DFS colors or Kahn's algorithm?

Both are linear. Kahn's algorithm is iterative (no recursion depth issues), naturally produces a topological order when there is no cycle, and tells you which vertices are stuck (in-degree never reached 0). The three-color DFS finds an actual cycle quickly and extends to problems like "eventual safe states", where you need to know which vertices lead into a cycle. Pick the one that also gives you what the rest of the problem needs.

#### Complexity

$O(V + E)$ for both methods; $O(V)$ space. The recursive DFS can be deep; Kahn's algorithm avoids recursion.

#### Edge cases and bugs

- Using only visited/unvisited: false cycles on diamonds.
- Self-loops (`u→u`): the three-color method catches them (u is gray when the edge is checked).
- Forgetting to launch DFS from every white vertex.
- Edge direction in "course, prerequisite" pairs: the edge goes from prerequisite to course.

#### Variants

- Course schedule II (return an order): topological sort.
- Find eventual safe states (above), detect deadlocks in wait-for graphs.
- Find the cycle itself: store `parent` and, on hitting a gray vertex, walk back.

Connects to: DFS, topological sort, strongly connected components, cycle detection in undirected graphs.

### questions
Q: How do you detect a cycle in a directed graph?
A: Run DFS with three states: unvisited, on the current path (gray), and finished (black). An edge to a gray vertex points back to an ancestor on the current path, which closes a cycle. Edges to black vertices are safe. It's O(V + E).

Q: Why isn't a simple visited set enough for directed graphs?
A: Two different paths can lead to the same vertex without any cycle, like A→B→D and A→C→D. With only "visited", reaching D the second time would look like a cycle. The finished state distinguishes a fully explored vertex from one still on the current path.

Q: How does Kahn's algorithm detect a cycle?
A: It repeatedly removes vertices with in-degree 0. Vertices on a cycle never reach in-degree 0, because each has an incoming edge from another cycle vertex. If fewer than V vertices are removed, the graph has a cycle.

Q: How would you decide whether all courses can be finished given prerequisite pairs?
A: Build a directed graph with an edge from each prerequisite to the course that needs it, and check it for a cycle with Kahn's algorithm or three-color DFS. All courses can be finished exactly when there is no cycle.

## dsa.graph-basics.topological-sort
name: "Topological sort"
importance: must
pattern: true
prereqs: [dsa.graph-basics.bfs, dsa.graph-basics.cycle-detection-in-directed-graphs]
scope: "Kahn's algorithm and DFS finish order, course schedule"

### simple
A topological sort puts tasks in an order where every task comes after everything it depends on, like getting dressed: socks before shoes, shirt before jacket. You repeatedly pick a task with nothing left to wait for, do it, and remove it from everyone's waiting list. If you get stuck while tasks remain, the dependencies go in a circle and no valid order exists.

### interview
- Only defined for **DAGs** (directed acyclic graphs); a cycle means no order exists.
- **Kahn's algorithm** (BFS): compute in-degrees; queue all vertices with in-degree 0; pop, append to the order, decrement neighbors' in-degrees, queue those that reach 0. **O(V + E)**.
- **DFS method**: append each vertex when it **finishes**; reverse the list at the end.
- If the order has fewer than V vertices (Kahn), there's a cycle.
- Many valid orders may exist; a **min-heap** instead of a queue gives the lexicographically smallest one (O((V + E) log V)).
- Uses: course schedules, build systems, task scheduling, DP on DAGs (process in topological order), alien dictionary (derive edges from adjacent words).

### deep
#### Intuition

A vertex with no incoming edges depends on nothing, so it can go first. Removing it may free other vertices. Repeating this "peel off the sources" process produces an order in which every edge points forward. The DFS method gets the same result from the other end: a vertex finishes only after everything it points to has finished, so reversed finish order puts each vertex before its dependents.

#### Worked example: Kahn's algorithm

Edges (prerequisite → course): `0→1, 0→2, 1→3, 2→3, 3→4`.

| step | queue | pop | in-degrees after (1, 2, 3, 4) | order |
|---|---|---|---|---|
| start | 0 | | 1, 1, 2, 1 | |
| 1 | 0 | 0 | 0, 0, 2, 1 → push 1, 2 | 0 |
| 2 | 1 2 | 1 | 3 drops to 1 | 0 1 |
| 3 | 2 | 2 | 3 drops to 0 → push 3 | 0 1 2 |
| 4 | 3 | 3 | 4 drops to 0 → push 4 | 0 1 2 3 |
| 5 | 4 | 4 | | 0 1 2 3 4 |

All 5 vertices are ordered, so there is no cycle.

#### Code

```cpp
// Kahn's algorithm; returns an empty vector if there is a cycle.
vector<int> topoSort(int n, const vector<vector<int>>& adj) {
    vector<int> indeg(n, 0), order;
    for (int u = 0; u < n; u++) for (int v : adj[u]) indeg[v]++;
    queue<int> q;
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.push(u);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u])
            if (--indeg[v] == 0) q.push(v);       // all of v's prerequisites are done
    }
    if ((int)order.size() < n) return {};          // leftover vertices sit on or behind a cycle
    return order;
}

// DFS version: reverse finish order (assumes a DAG).
vector<int> topoSortDfs(int n, const vector<vector<int>>& adj) {
    vector<bool> seen(n, false);
    vector<int> order;
    function<void(int)> dfs = [&](int u) {
        seen[u] = true;
        for (int v : adj[u]) if (!seen[v]) dfs(v);
        order.push_back(u);                        // u finishes after all it points to
    };
    for (int u = 0; u < n; u++) if (!seen[u]) dfs(u);
    reverse(order.begin(), order.end());
    return order;
}
```

```python
from collections import defaultdict, deque

def alien_order(words):
    """Letter order of an alien language from a sorted word list ('' if invalid)."""
    letters = {c for w in words for c in w}
    adj, indeg = defaultdict(set), {c: 0 for c in letters}
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                if y not in adj[x]:
                    adj[x].add(y)
                    indeg[y] += 1
                break
        else:
            if len(a) > len(b):
                return ""                  # "abc" before "ab" is impossible
    q = deque(sorted(c for c in letters if indeg[c] == 0))
    out = []
    while q:
        c = q.popleft()
        out.append(c)
        for d in sorted(adj[c]):
            indeg[d] -= 1
            if indeg[d] == 0:
                q.append(d)
    return "".join(out) if len(out) == len(letters) else ""
```

#### Complexity

Both methods: $O(V + E)$ time, $O(V)$ extra space (plus recursion depth for DFS).

#### Edge cases and bugs

- Edge direction: "a depends on b" is the edge `b → a`.
- Duplicate edges inflate in-degrees; deduplicate or handle consistently (the alien dictionary uses a set).
- Isolated vertices must appear in the order too.
- DFS method with a cycle silently returns an invalid order unless you add three-color detection.

#### Variants

- Course schedule II, parallel courses (count BFS levels to get the minimum number of semesters), sequence reconstruction (unique order iff the queue always has exactly one vertex).
- Longest path in a DAG: DP in topological order.
- Lexicographically smallest order: min-heap instead of queue.

Connects to: cycle detection in directed graphs, BFS, DFS, shortest paths in a DAG, DP.

### questions
Q: What is a topological order, and when does one exist?
A: An ordering of a directed graph's vertices in which every edge u → v has u before v. It exists exactly when the graph has no directed cycle.

Q: Describe Kahn's algorithm.
A: Compute every vertex's in-degree and queue those with in-degree 0. Repeatedly pop a vertex, append it to the order, and decrement the in-degree of each vertex it points to, queueing any that drop to 0. If the order ends with fewer than V vertices, there's a cycle. O(V + E).

Q: How does the DFS approach produce a topological order?
A: Run DFS and record each vertex when it finishes, after all vertices reachable from it. For any edge u → v in a DAG, v finishes before u, so reversing the finish order puts u before v.

Q: How do you find the minimum number of semesters to finish courses with prerequisites?
A: Run Kahn's algorithm level by level: all courses with in-degree 0 form the first semester, the courses they unlock form the next, and so on. The number of levels is the answer, if every course gets processed.

Q: How do you check whether a topological order is unique?
A: With Kahn's algorithm, the order is unique exactly when the queue never holds more than one vertex at a time. If two vertices are ever available together, they could be swapped.

### signals
- tasks with prerequisites or dependencies that must be ordered
- "can all courses be finished" or "give a valid build order"
- derive an order from pairwise "comes before" facts (alien dictionary)
- DP over a directed acyclic graph

### template
```cpp
// Kahn's algorithm skeleton (prerequisite -> dependent edges).
vector<int> kahn(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> indeg(n, 0), order;
    for (auto [u, v] : edges) { adj[u].push_back(v); indeg[v]++; }
    queue<int> q;                                      // priority_queue for smallest-first order
    for (int u = 0; u < n; u++) if (!indeg[u]) q.push(u);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);                            // (process levels here for "rounds")
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    return (int)order.size() == n ? order : vector<int>{};   // empty: there is a cycle
}
```

## dsa.graph-basics.bipartite-check
name: "Bipartite check"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "two-coloring with BFS or DFS"

### simple
A graph is bipartite if you can split its vertices into two teams so that every edge connects players from different teams. You check by coloring: give a starting vertex one color, all its neighbors the other color, their neighbors the first color, and so on. If two neighbors ever need the same color, the split is impossible.

### interview
- BFS or DFS assigning colors 0/1; each neighbor gets the opposite color; a neighbor with the **same** color means not bipartite. **O(V + E)**.
- Check every component (start a coloring from each uncolored vertex).
- A graph is bipartite **iff it has no odd-length cycle**.
- Trees and even cycles are bipartite; a triangle isn't.
- Union-find alternative: for each vertex, union all its neighbors together; a vertex in the same set as a neighbor means not bipartite (or DSU with parity).
- Uses: possible bipartition (people who dislike each other), two-team assignments, matching problems.

### deep
#### Intuition

Walking along any path alternates colors. If you return to the start after an odd number of steps, the colors disagree: that's an odd cycle. BFS layers make this concrete: vertices at even distance get color 0 and odd distance get color 1, and an edge between two vertices of the same layer parity reveals an odd cycle.

#### Worked example

Edges `0–1, 1–2, 2–3, 3–0` (a square): colors 0, 1, 0, 1: bipartite. Add `0–2`: vertex 2 has color 0, same as 0: not bipartite (triangle 0–1–2).

| vertex | color | neighbors and check |
|---|---|---|
| 0 | 0 | 1 → 1, 3 → 1 |
| 1 | 1 | 2 → 0 |
| 3 | 1 | 2 is 0: ok |
| 2 | 0 | with edge 0–2: 0 has color 0 = 2's color: **conflict** |

#### Code

```cpp
bool isBipartite(const vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> color(n, -1);
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;
        queue<int> q;
        q.push(s);
        color[s] = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) {
                if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                else if (color[v] == color[u]) return false;   // same color on an edge
            }
        }
    }
    return true;
}
```

```python
def possible_bipartition(n, dislikes):
    """People 1..n; each dislike pair must be on different sides."""
    adj = [[] for _ in range(n + 1)]
    for a, b in dislikes:
        adj[a].append(b)
        adj[b].append(a)
    color = [None] * (n + 1)
    for s in range(1, n + 1):
        if color[s] is not None:
            continue
        color[s] = 0
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if color[v] is None:
                    color[v] = 1 - color[u]
                    stack.append(v)
                elif color[v] == color[u]:
                    return False
    return True
```

#### Complexity

$O(V + E)$ time, $O(V)$ space.

#### Edge cases and bugs

- Disconnected graphs: color each component.
- Self-loops make a graph non-bipartite (a vertex adjacent to itself).
- 1-indexed input.

#### Variants

- Is graph bipartite (adjacency list input), possible bipartition, two-coloring a map region graph.
- Maximum bipartite matching once the graph is known to be bipartite.
- Online bipartiteness as edges arrive: DSU with parity.

Connects to: BFS, DFS, DSU with extra data, bipartite matching.

### questions
Q: How do you check whether a graph is bipartite?
A: Try to 2-color it with BFS or DFS: color a start vertex 0, give every uncolored neighbor the opposite color, and fail if an edge connects two vertices of the same color. Repeat from every uncolored vertex for disconnected graphs. It's O(V + E).

Q: What structural property characterizes bipartite graphs?
A: A graph is bipartite exactly when it contains no cycle of odd length. Coloring alternates along any path, so an odd cycle forces two adjacent vertices to share a color.

Q: Is every tree bipartite?
A: Yes. A tree has no cycles at all, so coloring vertices by the parity of their depth always gives adjacent vertices different colors.

Q: How can union-find check bipartiteness?
A: For each vertex, all its neighbors must end up on the same side, opposite to the vertex. Union all neighbors of each vertex together; if a vertex ever ends up in the same set as one of its neighbors, the graph isn't bipartite. A parity-tracking DSU does the same while edges arrive one by one.

### signals
- split items into two groups so that conflicting pairs are separated
- two-color a graph, or check for an odd cycle
- "dislike", "rival" or "conflict" pairs with two teams
- a matching problem that needs two sides first

### template
```cpp
// Two-coloring by BFS; returns false on the first same-color edge.
bool twoColor(const vector<vector<int>>& adj, vector<int>& color) {
    int n = adj.size();
    color.assign(n, -1);
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;                  // new component
        color[s] = 0;
        queue<int> q; q.push(s);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) {
                if (color[v] == -1) { color[v] = 1 - color[u]; q.push(v); }
                else if (color[v] == color[u]) return false;   // odd cycle
            }
        }
    }
    return true;
}
```

## dsa.graph-basics.bfs-on-state-spaces
name: "BFS on state spaces"
importance: important
pattern: true
prereqs: [dsa.graph-basics.bfs]
scope: "word ladder, open the lock, implicit graphs"

### simple
Sometimes the "graph" isn't given at all: each possible situation is a vertex, and each allowed move is an edge. A combination lock's positions, or words that differ by one letter, form such a graph. BFS over these situations finds the fewest moves to reach a goal, generating neighbors only as it needs them.

### interview
- Define the **state** (what fully describes a situation), the **moves** (neighbors), the **start** and the **goal**; then plain BFS with a visited set of states.
- **Open the lock**: states are 4-digit strings; each wheel turns ±1 (8 neighbors); dead ends are blocked states. At most 10,000 states.
- **Word ladder**: states are dictionary words; neighbors differ by one letter. Generate candidates by changing each position to 'a'..'z' and checking the word set: O(N · L · 26) overall.
- Encode states compactly (strings, integers, bitmasks, tuples) so they hash fast.
- **Bidirectional BFS** (expand from both ends, always the smaller frontier) cuts the explored states dramatically.
- Extra state dimensions appear often: (cell, keys held), (cell, obstacles removed), (position, speed).

### deep
#### Intuition

BFS doesn't care whether vertices are stored in an adjacency list or generated by rules. If each move costs the same, the minimum number of moves to reach the goal is a shortest path in the state graph. The work is choosing a state that captures everything that affects future moves, and nothing more (to keep the state count small).

#### Worked example: open the lock

Start `0000`, target `0202`, dead ends `{0201, 0101, 0102, 1212, 2002}`.

| level | some states reached |
|---|---|
| 0 | 0000 |
| 1 | 1000, 9000, 0100, 0900, 0010, 0090, 0001, 0009 |
| 2 | …, 0200, 0110, 0011, 0019, 0002, … (0101 is a dead end, skipped) |
| 3 | …, 0210, 0290, … |
| … | … |

BFS finds `0202` at depth **6** (for example 0000 → 1000 → 1100 → 1200 → 1201 → 1202 → 0202); the direct routes through 0201 or 0102 are blocked by dead ends.

#### Code

```cpp
int openLock(const vector<string>& deadends, const string& target) {
    unordered_set<string> blocked(deadends.begin(), deadends.end()), seen;
    if (blocked.count("0000")) return -1;
    queue<string> q;
    q.push("0000");
    seen.insert("0000");
    for (int steps = 0; !q.empty(); steps++) {
        for (int size = q.size(); size > 0; size--) {
            string s = q.front(); q.pop();
            if (s == target) return steps;
            for (int i = 0; i < 4; i++)
                for (int d : {1, 9}) {                         // +1 or -1 (mod 10)
                    string t = s;
                    t[i] = '0' + (t[i] - '0' + d) % 10;
                    if (!blocked.count(t) && seen.insert(t).second) q.push(t);
                }
        }
    }
    return -1;
}
```

```python
from collections import deque
from string import ascii_lowercase

def ladder_length(begin, end, words):
    """Number of words in the shortest transformation sequence, or 0."""
    word_set = set(words)
    if end not in word_set:
        return 0
    q, seen = deque([(begin, 1)]), {begin}
    while q:
        word, length = q.popleft()
        if word == end:
            return length
        for i in range(len(word)):
            for c in ascii_lowercase:
                nxt = word[:i] + c + word[i + 1:]
                if nxt in word_set and nxt not in seen:
                    seen.add(nxt)
                    q.append((nxt, length + 1))
    return 0
```

#### Bidirectional BFS

Search from the start and the goal at the same time, each step expanding the smaller frontier, and stop when they meet. With branching factor $b$ and distance $d$, one-sided BFS explores about $b^d$ states and bidirectional about $2 b^{d/2}$, often a huge saving (word ladder, sliding puzzles).

#### Complexity

$O(S \cdot M)$, where $S$ is the number of reachable states and $M$ the cost of generating one state's neighbors (including hashing the new state). Open the lock: $10^4$ states × 8 moves × 4-char strings.

#### Edge cases and bugs

- The start itself is a dead end or equals the target.
- Forgetting to mark states as seen when pushing, which multiplies work.
- A state that misses information (for example, keys collected) makes BFS give wrong answers.

#### Variants

- Sliding puzzle (state = board string), minimum genetic mutation, jump game with teleports.
- Shortest path to get all keys: state (cell, bitmask of keys).
- Shortest path with at most k obstacles removed: state (cell, removals left).
- Word ladder II (all shortest paths): BFS for distances, then DFS backtracking along decreasing distances.

Connects to: BFS, graph representations (implicit graphs), bitmask state, shortest path with bitmask state.

### questions
Q: What is an implicit graph, and how do you run BFS on it?
A: A graph whose vertices are states generated by rules rather than stored in memory, such as lock combinations or words. You write a function that lists a state's neighbors by applying every allowed move, then run BFS with a hash set of visited states.

Q: How do you find the shortest word ladder efficiently?
A: BFS from the start word. For each word, generate neighbors by changing one position to each of the 26 letters and keep those in the dictionary that aren't visited yet. That's O(N · L · 26) candidate checks, far better than comparing every pair of words.

Q: What should a state contain?
A: Everything that affects which moves are possible later or whether the goal is reached, and nothing else. For a maze with keys, the position alone isn't enough; the state must be (position, keys held), otherwise BFS would merge situations that behave differently.

Q: What does bidirectional BFS gain?
A: It searches from both ends and stops when the frontiers meet, so each side only goes about half the distance. With branching factor b and distance d, that's roughly 2 · b^(d/2) states instead of b^d.

### signals
- the minimum number of moves between configurations (locks, puzzles, words)
- each move changes one small part of the state
- the state graph is too large to build but easy to generate
- shortest path where position alone isn't the full state (keys, remaining budget)

### template
```cpp
// BFS over hashable states generated on the fly.
template <class State, class Next, class IsGoal>
int minMoves(State start, Next next, IsGoal isGoal) {
    queue<State> q;
    set<State> seen;                        // unordered_set with a hash for speed
    q.push(start);
    seen.insert(start);
    for (int steps = 0; !q.empty(); steps++) {
        for (int size = q.size(); size > 0; size--) {
            State s = q.front(); q.pop();
            if (isGoal(s)) return steps;
            for (const State& t : next(s))  // all states one move away
                if (seen.insert(t).second) q.push(t);
        }
    }
    return -1;                              // goal unreachable
}
```

## dsa.graph-basics.cloning-graphs
name: "Cloning graphs"
importance: important
prereqs: [dsa.graph-basics.dfs]
scope: "clone graph with a hash map"

### simple
Cloning a graph means building a brand-new copy with the same shape, where no copy points back into the original. Because the graph can have cycles, you keep a map from each original vertex to its copy, like a seating chart telling you which new chair matches each old chair. Whenever you meet a vertex already in the map, you reuse its copy instead of making another.

### interview
- DFS or BFS with a hash map `original → clone`. Create the clone **when first discovered**, then connect clone neighbors to the neighbors' clones.
- The map doubles as the visited set, which handles cycles and shared neighbors.
- **O(V + E)** time and O(V) space.
- Same idea: copy a linked list with random pointers, deep-copy an object graph, clone a tree with parent pointers.
- Pitfall: creating a clone for every visit (infinite recursion on cycles, or duplicate clones).

### questions
Q: How do you clone a graph that may contain cycles?
A: Traverse it with DFS or BFS while keeping a hash map from each original node to its clone. When you first meet a node, create its clone and store it; when you meet it again, reuse the stored clone. Then fill each clone's neighbor list with the clones of the original's neighbors.

Q: Why is the hash map essential?
A: It serves as the visited set, preventing infinite loops on cycles, and it guarantees that every original node has exactly one clone, so two nodes sharing a neighbor end up sharing the same cloned neighbor.

Q: When should you insert a node into the map, before or after cloning its neighbors?
A: Before. With a cycle, recursing into neighbors can lead back to the current node, and it must already be in the map at that point, or the recursion would create a second clone and never terminate.

Q: What are the time and space costs of cloning a graph?
A: O(V + E) time, since each node is cloned once and each edge copied once, and O(V) space for the map plus the traversal stack or queue.
