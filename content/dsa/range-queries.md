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

### simple
A segment tree answers questions about ranges of an array, such as their sum or minimum, even while the array keeps changing. It splits the array in halves again and again and stores an answer for every piece, like a tournament bracket that records the winner of every sub-bracket. Any range is covered by a few of those pieces, so both updates and questions take only logarithmic time.

### interview
- Each node stores the aggregate (sum, min, max, gcd…) of a segment; children cover the two halves; leaves are single elements.
- **Build** O(n), **point update** O(log n) (update the leaf and its ancestors), **range query** O(log n) (combine O(log n) fully covered nodes).
- Works for any **associative** operation with an identity (0 for sum, +∞ for min).
- Array layout: size 4n for the recursive version; the iterative bottom-up version uses 2n.
- Compared with prefix sums: supports updates. Compared with a Fenwick tree: more general (min, max, custom merges, lazy range updates), more code.
- Advanced: lazy propagation (range updates), persistent and dynamic (sparse) segment trees, merge sort trees.

### deep
#### Intuition

Prefix sums answer range sums in O(1) but need O(n) to update. A segment tree precomputes answers for $O(n)$ well-chosen segments (halves, quarters, …). Any range can be split into at most about $2 \log n$ of these, and changing one element only affects the $\log n$ segments that contain it.

#### Worked example: range sums over `2 1 5 3 4`

Tree of segments (sum in brackets):

```
[0,4]=15
├── [0,2]=8
│   ├── [0,1]=3
│   │   ├── [0,0]=2
│   │   └── [1,1]=1
│   └── [2,2]=5
└── [3,4]=7
    ├── [3,3]=3
    └── [4,4]=4
```

Query sum(1, 3): covered by [1,1] (1) + [2,2] (5) + [3,3] (3) = 9. Update a[2] = 0: change [2,2], [0,2] and [0,4] only.

#### Code

```cpp
class SegmentTree {                               // range sum, point assignment
    int n;
    vector<long long> t;
    void build(const vector<int>& a, int node, int l, int r) {
        if (l == r) { t[node] = a[l]; return; }
        int m = (l + r) / 2;
        build(a, 2 * node, l, m);
        build(a, 2 * node + 1, m + 1, r);
        t[node] = t[2 * node] + t[2 * node + 1];
    }
    void update(int node, int l, int r, int pos, long long val) {
        if (l == r) { t[node] = val; return; }
        int m = (l + r) / 2;
        if (pos <= m) update(2 * node, l, m, pos, val);
        else update(2 * node + 1, m + 1, r, pos, val);
        t[node] = t[2 * node] + t[2 * node + 1];
    }
    long long query(int node, int l, int r, int ql, int qr) const {
        if (qr < l || r < ql) return 0;               // disjoint: identity
        if (ql <= l && r <= qr) return t[node];        // fully covered
        int m = (l + r) / 2;
        return query(2 * node, l, m, ql, qr) + query(2 * node + 1, m + 1, r, ql, qr);
    }
public:
    explicit SegmentTree(const vector<int>& a) : n(a.size()), t(4 * max(1, (int)a.size()), 0) {
        if (n) build(a, 1, 0, n - 1);
    }
    void set(int pos, long long val) { update(1, 0, n - 1, pos, val); }
    long long sum(int l, int r) const { return query(1, 0, n - 1, l, r); }
};
```

#### Choosing a range structure

| Need | Structure |
|---|---|
| static array, range sums | prefix sums, $O(1)$ query |
| static array, range min or max | sparse table, $O(1)$ query |
| point updates, range sums | Fenwick tree (short code) |
| point updates, range min, max or custom merges | segment tree |
| range updates and range queries | segment tree with lazy propagation |

Start from the simplest structure that supports the required operations; interviewers value knowing when a segment tree is **not** needed.

#### Complexity

Build $O(n)$; update and query $O(\log n)$; memory $O(n)$ (4n or 2n entries).

#### Edge cases and bugs

- Array size 2n is not enough for the recursive layout with arbitrary n; use 4n.
- Returning the wrong identity for disjoint segments (0 for min is wrong).
- Off-by-one in inclusive versus half-open query ranges.
- Integer overflow in sums.

#### Variants

- Range minimum and maximum, gcd, count of elements satisfying a property, maximum subarray sum per segment (store four values per node).
- Lazy propagation for range updates.
- Segment tree over values (after coordinate compression) to count smaller elements.
- Segment tree beats, persistent segment trees (advanced).

Connects to: Fenwick tree, lazy propagation, prefix sums, sparse table.

### questions
Q: What does a segment tree store, and what operations does it support?
A: Each node stores an aggregate, such as the sum or minimum, of a contiguous segment, with children covering its two halves. It supports point updates and range queries in O(log n) after an O(n) build.

Q: Why is a range query O(log n)?
A: At each level of the tree, at most two nodes are partially covered by the query range, and the recursion only continues into those. Fully covered nodes are returned immediately, so the total work is proportional to the height, O(log n).

Q: When would you choose a segment tree over a Fenwick tree?
A: When the operation isn't invertible, like minimum or maximum, when nodes need to merge richer information (such as the maximum subarray sum of a segment), or when you need range updates with lazy propagation. Fenwick trees are simpler for prefix sums with point updates.

Q: What operations can a segment tree aggregate?
A: Any associative operation with an identity element: sum, product, minimum, maximum, gcd, bitwise AND/OR/XOR, or a custom merge of structured data. Associativity lets segments be combined in any grouping.

Q: How much memory does a recursive segment tree need?
A: Up to 4n nodes for an array of n elements, because the tree's height is the ceiling of log₂ n and the array layout reserves space for a full binary tree. The iterative bottom-up version needs exactly 2n entries.

## dsa.range-queries.lazy-propagation
name: "Lazy propagation"
importance: advanced
prereqs: [dsa.range-queries.segment-tree]
scope: "range updates on segment trees"

### simple
Lazy propagation lets a segment tree update a whole range at once without touching every element. When an update covers an entire segment, the tree changes that segment's stored answer and leaves a note saying "my children still owe this update", like a manager who records a team-wide raise without updating each payslip yet. The note is passed down only when someone later asks about a smaller piece.

### interview
- Each node has a **lazy tag** for a pending update to its whole segment.
- **Range update**: for a fully covered node, apply the update to its value and tag, then stop; otherwise **push down** its tag to the children and recurse.
- **Query**: push down tags on the way when splitting.
- Range add + range sum: value += add × segment length; range assign + range min, etc.
- Update and query both **O(log n)**.
- Composing tags (assign after add, add after assign) must be defined carefully when mixing operations.

### questions
Q: What problem does lazy propagation solve?
A: Updating every element in a range of a segment tree would cost O(n). Lazy propagation applies the update to the O(log n) nodes that fully cover the range and stores a pending tag for their children, making range updates O(log n).

Q: When are lazy tags pushed down?
A: Whenever an operation needs to go below a node that has a pending tag, because a query or update only partly covers it. The tag is applied to both children's values and merged into their tags, then cleared at the node.

Q: How does a range-add tag affect a node storing a range sum?
A: Adding v to every element of a segment of length len increases its sum by v · len, so the node's value is updated immediately, and v is added to its lazy tag for the children.

Q: What is tricky about supporting both "assign" and "add" range updates?
A: The tags must compose in the right order: an assignment overrides any earlier pending add, while an add after an assignment modifies the assigned value. The node needs a representation (for example, an optional assign value plus an add value) and a correct rule for combining them.

## dsa.range-queries.fenwick-tree
name: "Fenwick tree"
importance: important
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "prefix sums with updates, counting inversions"

### simple
A Fenwick tree, or binary indexed tree, keeps running totals that can be updated quickly. Each position stores the sum of a block of the array whose size is decided by the position's lowest binary 1 bit. Adding to an element or asking for a prefix total hops through only about log n blocks.

### interview
- 1-indexed array `bit`; `bit[i]` covers `(i − (i & −i), i]`.
- **Add** at i: `for (; i <= n; i += i & -i) bit[i] += v`. **Prefix sum** up to i: `for (; i > 0; i -= i & -i) s += bit[i]`. Both **O(log n)**.
- Range sum `[l, r]` = prefix(r) − prefix(l − 1). Build in O(n log n) with adds, or O(n) with a linear pass.
- Needs an **invertible** operation for range queries (sum, XOR); prefix max works only with non-decreasing updates.
- **Counting inversions**: compress values, scan from the right, add 1 at each value, and query how many smaller values are already present.
- Variants: range update + point query (Fenwick over the difference array), range update + range query (two trees), 2D Fenwick.

### questions
Q: How does a Fenwick tree compute prefix sums and handle updates in O(log n)?
A: Position i stores the sum of the i & −i elements ending at i. A prefix sum adds bit[i] and jumps to i − (i & −i), and an update adds to bit[i] and jumps to i + (i & −i); either way the number of jumps is at most the number of bits, O(log n).

Q: What does i & −i mean in a Fenwick tree?
A: It's the lowest set bit of i, which is the length of the block that bit[i] covers. For example, 12 is 1100 in binary, so bit[12] covers the 4 elements from 9 to 12.

Q: How do you count inversions with a Fenwick tree?
A: Compress the values to ranks 1..n. Scan the array from right to left; for each value, query the Fenwick tree for how many smaller ranks have been added (they are to its right and smaller), then add 1 at its rank. The total over all elements is the inversion count, in O(n log n).

Q: What can't a basic Fenwick tree do that a segment tree can?
A: Arbitrary range minimum or maximum queries with updates, because those operations can't be undone by subtraction to isolate a range. Fenwick trees work best for sums, counts and XOR.

## dsa.range-queries.sparse-table
name: "Sparse table"
importance: advanced
scope: "O(1) range minimum on static arrays"

### simple
A sparse table answers "what is the minimum in this range?" instantly for an array that never changes. It precomputes the minimum of every block whose length is a power of two, starting at every position. Any range is covered by two such blocks that may overlap, and because overlapping doesn't matter for a minimum, one comparison gives the answer.

### interview
- `st[k][i]` = min of `a[i .. i + 2ᵏ − 1]`; `st[k][i] = min(st[k-1][i], st[k-1][i + 2^(k-1)])`. Build **O(n log n)** time and space.
- Query `[l, r]`: `k = floor(log2(r − l + 1))`, answer `min(st[k][l], st[k][r − 2ᵏ + 1])`: **O(1)**.
- Works in O(1) only for **idempotent** operations (min, max, gcd, AND, OR) where overlap is harmless; sums need a non-overlapping O(log n) decomposition.
- **Static arrays only**: no updates.
- Uses: LCA via Euler tour + RMQ, range min/max queries in bulk, sliding window extremes (though a deque is simpler).

### questions
Q: How does a sparse table answer range minimum queries in O(1)?
A: It stores the minimum of every block of length 2^k starting at every index. For a query [l, r], take the largest k with 2^k ≤ r − l + 1; the two blocks starting at l and ending at r cover the range, possibly overlapping, and the answer is the smaller of their minimums.

Q: Why doesn't the O(1) query work for sums?
A: The two blocks can overlap, and an overlapping element would be counted twice in a sum. Minimum, maximum, gcd and bitwise AND/OR are idempotent, so double-counting doesn't change them.

Q: What are the build cost and limitations of a sparse table?
A: Building takes O(n log n) time and memory. It supports no updates: changing one element would affect O(n) entries, so it's only for static arrays.

Q: How is a sparse table used to find lowest common ancestors?
A: Record an Euler tour of the tree with the depth of each visited node. The LCA of u and v is the shallowest node between their first occurrences in the tour, which is a range minimum query answered in O(1) by a sparse table.

## dsa.range-queries.coordinate-compression
name: "Coordinate compression"
importance: advanced
scope: "mapping large values to ranks"

### simple
Coordinate compression replaces large or scattered values by their rank among all values, keeping only their order. The values 1000, 7 and 5000000 become 2, 1 and 3. That lets you use arrays, Fenwick trees or segment trees indexed by value, even when the original values are huge or negative.

### interview
- Collect all values that matter (including query endpoints), **sort and deduplicate**, then map each value to its index with binary search (`lower_bound`) or a hash map.
- **O(n log n)**; ranks range over 0..k−1 for k distinct values.
- Preserves order (and equality), which is all that comparisons, counting and ordering need; distances between values are lost.
- Uses: Fenwick tree over values (count smaller elements, inversions), sweep lines with large coordinates, 2D grids from sparse points, segment trees over time.
- When distances matter (covered length), keep the original coordinates in the sorted array and use differences between neighbors.

### questions
Q: What is coordinate compression, and why is it useful?
A: Mapping each value to its rank among the sorted distinct values. It turns huge, negative or sparse values into small indices from 0 to k − 1, so they can index arrays, Fenwick trees or segment trees, while preserving their relative order.

Q: How do you implement it?
A: Copy all relevant values, sort them and remove duplicates, then find each value's rank with a binary search (lower_bound) or by building a map from value to index. The total cost is O(n log n).

Q: What information is lost, and when does that matter?
A: The gaps between values are lost: ranks 1 and 2 might have been 5 and 5,000,000. It matters for questions about lengths or distances, such as total covered length, where you must keep the sorted original values and use differences between consecutive ones.

Q: Why must query values be included when compressing?
A: If a later query uses a value that wasn't in the compressed set, it has no rank. Including every value that can appear, from the data and from the queries, before sorting guarantees a consistent mapping.
