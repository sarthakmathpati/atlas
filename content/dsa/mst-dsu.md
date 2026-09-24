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

### simple
Disjoint set union keeps track of which items belong to the same group as groups merge over time. Each group has a leader, and every item points toward it, like employees who report through managers up to a boss. Two items are in the same group exactly when they lead up to the same boss, and merging two groups just makes one boss report to the other.

### interview
- Operations: `find(x)` returns the set's representative (root); `union(a, b)` merges two sets.
- **Path compression**: during `find`, point nodes directly at the root.
- **Union by size or rank**: attach the smaller tree under the larger.
- With both: **O(α(n))** amortized per operation, where α is the inverse Ackermann function (≤ 4 for any practical n): effectively constant.
- Without optimizations, a chain can make `find` O(n).
- Uses: dynamic connectivity, counting components as edges arrive, Kruskal's MST, cycle detection in undirected graphs, grouping equal items (accounts merge, similar strings).

### deep
#### Intuition

Each set is stored as a tree of parent pointers whose root represents the set. `find` climbs to the root; `union` links one root under the other. The two optimizations keep the trees flat: union by size prevents tall trees from forming, and path compression flattens whatever height remains every time you search through it.

#### Worked example

Start with `0 1 2 3 4`, each its own set.

| operation | parent array after | sets |
|---|---|---|
| union(0, 1) | 0: 0, 1: 0 | {0,1} {2} {3} {4} |
| union(2, 3) | 2: 2, 3: 2 | {0,1} {2,3} {4} |
| union(1, 3) | root(1)=0, root(3)=2, same size: 2 → 0 | {0,1,2,3} {4} |
| find(3) | 3 → 2 → 0; compress: 3 → 0 | |
| connected(1, 4)? | roots 0 and 4 differ | no |

#### Code

```cpp
struct DSU {
    vector<int> parent, size;
    int components;
    explicit DSU(int n) : parent(n), size(n, 1), components(n) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];         // path halving (a form of compression)
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {
        a = find(a), b = find(b);
        if (a == b) return false;                  // already in the same set
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;                             // smaller tree under the larger
        size[a] += size[b];
        components--;
        return true;
    }
    bool connected(int a, int b) { return find(a) == find(b); }
};
```

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.components = n

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:          # full path compression
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b:
            return False
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.parent[b] = a
        self.size[a] += self.size[b]
        self.components -= 1
        return True
```

#### Complexity

With union by size (or rank) and path compression, $m$ operations on $n$ elements take $O(m \, \alpha(n))$, where $\alpha$ grows so slowly that it is at most 4 for any input that fits in the universe. With only one of the two optimizations it is $O(\log n)$ per operation. Space $O(n)$.

#### Edge cases and bugs

- Calling `parent[a] = b` on non-roots (forgetting `find` first) corrupts the structure.
- Recursive `find` with path compression can overflow the stack on a long chain before it gets compressed; the iterative version is safe.
- Elements that aren't integers: map them to indices with a hash map first.
- DSU doesn't support splitting sets (deleting edges); process deletions offline in reverse if needed.

#### Variants

- Size tracking (largest component), component count (as above).
- Weighted DSU: store an offset to the parent (evaluate division, parity for bipartiteness).
- Rollback DSU (union by size, no compression) for offline dynamic connectivity.

Connects to: DSU applications, Kruskal's algorithm, cycle detection in undirected graphs, connected components.

### questions
Q: What are the two optimizations for disjoint set union, and what do they achieve?
A: Union by size or rank attaches the smaller tree under the larger, which keeps trees shallow. Path compression makes nodes on a find path point closer to the root. Together they make each operation O(α(n)) amortized, effectively constant.

Q: What is the inverse Ackermann function, informally?
A: A function that grows extremely slowly: it is at most 4 for any n that could ever be stored. So O(α(n)) is constant for practical purposes, though not strictly O(1).

Q: How do you use DSU to count connected components as edges are added?
A: Start with n components. For each edge, if its endpoints have different roots, unite them and decrease the count; if they share a root, the count doesn't change. Each edge costs nearly O(1).

Q: What can't DSU do efficiently?
A: Split a set or delete an edge, since unions can't be undone once paths are compressed. Problems with deletions are often solved offline by processing operations in reverse, turning deletions into unions.

Q: What happens without any optimization?
A: Unions can build a long chain, making find O(n), so m operations can cost O(m · n). Either optimization alone brings it to O(log n) per operation.

## dsa.mst-dsu.dsu-applications
name: "DSU applications"
importance: must
pattern: true
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "connectivity, redundant connection, accounts merge, grouping"

### simple
Union-find shines whenever things get grouped by "these two belong together" facts. Merging accounts that share an email, finding the extra cable that creates a loop, or grouping similar words all come down to joining pairs and asking who ends up together. Each fact is one merge, and the final groups fall out at the end.

### interview
- **Connectivity queries** as edges arrive: `unite` per edge, `find` per query.
- **Redundant connection**: the first edge whose endpoints are already connected closes a cycle: return it.
- **Accounts merge**: union accounts that share an email (map email → first account seen), then group emails by root and sort them.
- **Number of islands II** (land added over time): add a cell, union with land neighbors, report components after each addition.
- **Similar string groups**, **satisfiability of equations** (union all `==`, then check every `!=`).
- Map arbitrary keys to indices, and for grids use `r * C + c`.

### deep
#### Intuition

DSU turns a stream of "same group" facts into groups without building and traversing a graph each time. Whenever the answer only depends on which items are connected (not how), and connections only get added, DSU is the simplest and fastest tool.

#### Worked example: satisfiability of equality equations

Equations: `a==b`, `b==c`, `a!=c`.

| step | action | result |
|---|---|---|
| 1 | union a, b | {a, b} |
| 2 | union b, c | {a, b, c} |
| 3 | check a != c | find(a) == find(c): **contradiction** |

Processing all equalities first is essential; checking `!=` in input order would miss later merges.

#### Code

```cpp
struct UF {
    vector<int> p;
    explicit UF(int n) : p(n) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) { a = find(a); b = find(b); if (a == b) return false; p[a] = b; return true; }
};

vector<int> findRedundantConnection(const vector<vector<int>>& edges) {
    UF uf(edges.size() + 1);                        // vertices 1..n
    for (auto& e : edges)
        if (!uf.unite(e[0], e[1])) return e;        // already connected: this edge closes a cycle
    return {};
}

bool equationsPossible(const vector<string>& eqs) {
    UF uf(26);
    for (auto& e : eqs) if (e[1] == '=') uf.unite(e[0] - 'a', e[3] - 'a');   // all equalities first
    for (auto& e : eqs) if (e[1] == '!' && uf.find(e[0] - 'a') == uf.find(e[3] - 'a')) return false;
    return true;
}
```

```python
def accounts_merge(accounts):
    parent = list(range(len(accounts)))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    owner = {}                                   # email -> first account index
    for i, (_, *emails) in enumerate(accounts):
        for email in emails:
            if email in owner:
                parent[find(i)] = find(owner[email])
            else:
                owner[email] = i

    groups = {}
    for email, i in owner.items():
        groups.setdefault(find(i), []).append(email)
    return [[accounts[root][0]] + sorted(emails) for root, emails in groups.items()]

def islands_after_each_addition(R, C, positions):
    parent, count, out = {}, 0, []
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for r, c in positions:
        cell = r * C + c
        if cell not in parent:
            parent[cell] = cell
            count += 1
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                nb = nr * C + nc
                if 0 <= nr < R and 0 <= nc < C and nb in parent:
                    a, b = find(cell), find(nb)
                    if a != b:
                        parent[a] = b
                        count -= 1
        out.append(count)
    return out
```

#### Recognizing a DSU problem

Look for three clues: the problem is about which things end up in the same group; the grouping facts are symmetric and transitive (if a is with b and b is with c, then a is with c); and facts only ever add connections. If connections can be removed, or you need the path between two items, DSU is the wrong tool; use a graph traversal instead.

#### Complexity

$O((n + m) \, \alpha(n))$ for $n$ items and $m$ union or find operations, plus the problem's own work (sorting emails in accounts merge: $O(E \log E)$).

#### Edge cases and bugs

- Re-adding the same land cell in islands II must not change the count.
- Emails shared by accounts with different names can't happen by problem definition, but key by email, not name.
- 1-indexed vertices in redundant connection.

#### Variants

- Most stones removed (union stones sharing a row or column; answer = stones − components).
- Smallest string with swaps (union swappable indices, sort characters within each group).
- Graph connectivity with a threshold (union multiples of each divisor greater than the threshold).
- Minimize malware spread (component sizes and counts of infected nodes).

Connects to: disjoint set union, connected components, Kruskal's algorithm, cycle detection.

### questions
Q: How do you find the edge that turns a tree into a graph with one cycle?
A: Process edges in order with union-find. The first edge whose endpoints are already in the same set connects two vertices that were already connected, so it closes the cycle; return it.

Q: How does union-find solve accounts merge?
A: Treat each account as an element. Map each email to the first account that listed it, and union any later account containing that email with it. Then group all emails by the root of their account, sort each group and attach the account name.

Q: How do you check whether equality and inequality equations between variables can all hold?
A: First union the two sides of every equality. Then check each inequality: if its two variables have the same root, they're forced equal, so the equations are unsatisfiable. The order matters: all equalities must be processed first.

Q: How do you report the number of islands after each land cell is added?
A: Keep a DSU of land cells and a component count. Adding a new land cell adds one component, then uniting it with each adjacent land cell in a different set reduces the count by one per merge. Each addition is nearly O(1).

### signals
- items are grouped by pairwise "same as" or "connected to" facts
- connectivity questions while edges keep being added
- find the edge that creates a cycle
- merge records that share any common key (emails, rows, columns)

### template
```cpp
// Grouping with union-find, then collecting members by root.
vector<vector<int>> groups(int n, const vector<pair<int, int>>& sameAs) {
    vector<int> p(n);
    iota(p.begin(), p.end(), 0);
    function<int(int)> find = [&](int x) { return p[x] == x ? x : p[x] = find(p[x]); };
    for (auto [a, b] : sameAs) p[find(a)] = find(b);     // merge (add size ranks if needed)
    unordered_map<int, vector<int>> byRoot;
    for (int i = 0; i < n; i++) byRoot[find(i)].push_back(i);
    vector<vector<int>> out;
    for (auto& [root, members] : byRoot) out.push_back(members);
    return out;
}
```

## dsa.mst-dsu.kruskals-algorithm
name: "Kruskal's algorithm"
importance: must
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "sort edges, union with DSU"

### simple
Kruskal's algorithm connects all points as cheaply as possible, forming a minimum spanning tree. It looks at connections from cheapest to most expensive and keeps each one that joins two groups not yet connected, skipping any that would form a loop. It is like building roads between villages, always building the cheapest road that actually links someone new.

### interview
- A **minimum spanning tree** (MST) connects all V vertices of a connected, undirected, weighted graph with V − 1 edges and minimum total weight.
- Kruskal: **sort edges** by weight; for each edge, if its endpoints are in different DSU sets, add it and unite. Stop at V − 1 edges.
- **O(E log E)** for sorting (DSU work is nearly linear).
- Correctness: the **cut property**: the lightest edge crossing any cut belongs to some MST.
- If fewer than V − 1 edges are added, the graph is disconnected (you get a minimum spanning forest).
- Prefer Kruskal for sparse graphs and edge lists; Prim for dense graphs or adjacency lists.

### deep
#### Intuition

Adding the cheapest edge that doesn't create a cycle is always safe. Consider the two groups (components) that edge connects: some edge must eventually join the first group to the rest, and none is cheaper than this one among the edges still possible, because all cheaper edges were already considered and either used or rejected as cycle-makers. That's the cut property.

#### Worked example

Vertices A–D. Edges sorted: `A–B 1, B–C 2, A–C 3, C–D 4, B–D 5`.

| edge | same set? | action | MST weight |
|---|---|---|---|
| A–B 1 | no | take | 1 |
| B–C 2 | no | take | 3 |
| A–C 3 | yes (A, B, C joined) | skip (cycle) | 3 |
| C–D 4 | no | take (3 edges: done) | 7 |

MST weight **7**.

#### Code

```cpp
long long kruskal(int n, vector<array<int, 3>> edges) {    // {w, u, v}
    sort(edges.begin(), edges.end());                       // by weight
    vector<int> p(n), sz(n, 1);
    iota(p.begin(), p.end(), 0);
    auto find = [&](int x) {
        while (p[x] != x) x = p[x] = p[p[x]];
        return x;
    };
    long long total = 0;
    int used = 0;
    for (auto [w, u, v] : edges) {
        int a = find(u), b = find(v);
        if (a == b) continue;                               // would create a cycle
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        total += w;
        if (++used == n - 1) break;
    }
    return used == n - 1 ? total : -1;                      // -1: graph not connected
}
```

```python
def min_cost_connect_points(points):
    """Manhattan-distance MST over points with Kruskal (O(n^2 log n) edges)."""
    n = len(points)
    edges = sorted(
        (abs(x1 - x2) + abs(y1 - y2), i, j)
        for i, (x1, y1) in enumerate(points)
        for j, (x2, y2) in enumerate(points[:i])
    )
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    total = used = 0
    for w, i, j in edges:
        a, b = find(i), find(j)
        if a != b:
            parent[a] = b
            total += w
            used += 1
            if used == n - 1:
                break
    return total
```

For all-pairs complete graphs like "connect points", Prim's $O(V^2)$ version beats sorting $O(V^2)$ edges.

#### Complexity

Sorting: $O(E \log E) = O(E \log V)$. DSU operations: $O(E \, \alpha(V))$. Space $O(V + E)$.

#### Edge cases and bugs

- Disconnected graphs: fewer than V − 1 edges are taken; report it.
- Equal weights: any tie order gives a valid MST (MSTs may not be unique, but their weight is).
- Directed graphs: MST is defined for undirected graphs (the directed analogue is an arborescence, a different algorithm).

#### Variants

- Critical and pseudo-critical edges (force-include or exclude each edge and compare weights).
- Minimum spanning tree with some edges pre-built (union them first at cost 0).
- Maximum spanning tree (sort descending), and "minimize the maximum edge" (the MST's largest edge is the answer, the bottleneck property).
- Optimize water distribution: add a virtual vertex whose edges cost the well prices.

Connects to: disjoint set union, Prim's algorithm, greedy fundamentals (exchange argument), sorting.

### questions
Q: How does Kruskal's algorithm build a minimum spanning tree?
A: Sort all edges by weight. Go through them from lightest to heaviest and add an edge whenever its endpoints are in different components, uniting those components in a DSU; skip edges that would create a cycle. Stop after V − 1 edges.

Q: What is the cut property, and why does it justify Kruskal?
A: For any partition of the vertices into two sides, the lightest edge crossing between them belongs to some MST. When Kruskal adds an edge, it is the lightest edge leaving its component (all lighter edges were already processed), so by the cut property it is safe.

Q: What is Kruskal's time complexity?
A: O(E log E) for sorting, which dominates; the DSU operations add O(E · α(V)). Since E ≤ V², log E is O(log V), so it is also written O(E log V).

Q: When would you choose Prim's algorithm instead?
A: For dense graphs, especially complete graphs defined by coordinates, where Prim's O(V²) array version avoids generating and sorting all V² edges. Kruskal is simpler when you already have an edge list of a sparse graph.

Q: How can a precomputed set of mandatory edges be handled?
A: Add them first: unite their endpoints and add their weights, then run Kruskal on the remaining edges. The result is the cheapest spanning tree that includes the mandatory edges.

## dsa.mst-dsu.prims-algorithm
name: "Prim's algorithm"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "growing the tree with a heap"

### simple
Prim's algorithm grows a minimum spanning tree outward from one starting point. At each step it adds the cheapest connection from the tree built so far to a new point, like a city expanding its road network by always building the cheapest road to a town not yet connected. After every point is reached, the roads form the cheapest possible network.

### interview
- Start at any vertex; min-heap of `(weight, vertex)` for edges leaving the tree; pop the lightest edge to an unvisited vertex, add it, push that vertex's edges. **O(E log V)**.
- Dense or complete graphs: array version with `minEdge[v]` and a linear scan: **O(V²)**, no heap.
- Correct by the **cut property** (the tree versus the rest is a cut).
- Very similar to Dijkstra; the difference is the key: the edge weight itself, not the distance from the source.
- Produces a tree only if the graph is connected; otherwise it covers one component.

### questions
Q: How does Prim's algorithm work?
A: Start from any vertex as the tree. Repeatedly add the lightest edge that connects a tree vertex to a non-tree vertex, using a min-heap of candidate edges, until all vertices are in the tree. By the cut property each chosen edge belongs to an MST.

Q: How is Prim's algorithm different from Dijkstra's?
A: Both grow a set from a start vertex using a priority queue. Dijkstra prioritizes a vertex by its total distance from the source (dist[u] + w), while Prim prioritizes it by the single edge weight connecting it to the tree (w).

Q: What are the complexities of the heap and array versions of Prim?
A: With a binary heap and lazy deletion, O(E log V). With an array of best edge weights and a linear scan for the minimum, O(V²), which is better for dense graphs where E is close to V².

Q: When is Prim preferable to Kruskal?
A: For dense graphs, especially complete graphs given by coordinates (like connecting points by distance), where the O(V²) array version avoids building and sorting all V² edges.

## dsa.mst-dsu.dsu-with-extra-data
name: "DSU with extra data"
importance: advanced
prereqs: [dsa.mst-dsu.disjoint-set-union]
scope: "component sizes, parity for bipartiteness"

### simple
Union-find can carry extra information about each group, such as how many members it has or which side of a split each member is on. When two groups merge, their extra information is combined at the leader. It is like merging two clubs and adding up their member counts in the new club's record.

### interview
- Store data at the **root**: size, sum, min, max, count of special members; combine it in `union`.
- **Weighted / parity DSU**: each node stores its relation to its parent (for example, parity = "same side or opposite side"); `find` accumulates relations along the path while compressing.
- **Online bipartiteness**: union(u, v) with the constraint "different sides"; if they're already connected with the same parity, the graph isn't bipartite.
- **Evaluate division**: weight = ratio to the parent; `a / b` = weight(a) / weight(b) when they share a root.
- Update relations carefully during path compression (multiply or XOR the accumulated values).

### questions
Q: How do you track the size of each component in union-find?
A: Keep a size array that is meaningful only at roots. On union, attach one root under the other and add its size to the new root's size. The component size of x is size[find(x)].

Q: How does a parity DSU check bipartiteness as edges are added?
A: Each node stores the parity of its path to its parent. find returns the root together with the node's parity to the root. For an edge u–v, if they have the same root and the same parity, the edge creates an odd cycle; otherwise union them, setting the new link's parity so that u and v end up on opposite sides.

Q: How does union-find solve "evaluate division" queries?
A: Store for each variable its ratio to its parent. An equation a / b = k unites the two sets and sets the link weight so the ratio holds. A query a / b is answerable when both share a root, and equals weight(a to root) divided by weight(b to root).

Q: What must path compression do in a weighted DSU?
A: When a node is re-pointed directly to the root, its stored relation must become its relation to the root, which is the combination (sum, XOR or product) of the relations along the old path. Otherwise the stored weights become wrong.
