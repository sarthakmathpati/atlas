---
topic: dsa.dp-advanced
name: "Dynamic programming: advanced"
subject: dsa
order: 33
prereqs: [dsa.dp-foundations, dsa.bits, dsa.trees]
---

## dsa.dp-advanced.dp-on-trees
name: "DP on trees"
importance: important
pattern: true
prereqs: [dsa.trees.bottom-up-tree-recursion, dsa.dp-foundations.designing-dp-states]
scope: "returning several values per node"

### simple
DP on trees solves an optimization problem over a tree by having each node combine small summaries from its children. Often a single number isn't enough, so each node returns a few, such as "best if I'm chosen" and "best if I'm not". The parent picks the right combination, like a manager who needs two versions of each team's report to plan the department.

### interview
- Postorder: compute each child's tuple of states, then combine them into the node's tuple. The answer is at the root (or a global maximum).
- **Maximum independent set** (house robber III): `(take, skip)`: `take = val + Σ skip(child)`, `skip = Σ max(take, skip)(child)`.
- **Minimum vertex cover**, **binary tree cameras**: a few states such as "covered by child", "has camera", "needs cover".
- **Rerooting**: compute subtree answers downward first, then pass "the rest of the tree" contribution to children to get every node's answer as root in O(n) (sum of distances in a tree).
- General trees: combine children in a loop; knapsack-like combinations across children (choose k nodes in subtrees) cost O(n²) with careful merging.
- **O(n)** for constant-size states.

### deep
#### Intuition

In a rooted tree, a node's subtree is independent of the rest of the tree except through the node itself. So the best solution inside a subtree depends only on a few facts about the node (is it chosen, is it covered, how many nodes were picked). Returning the best value for each such fact lets the parent combine children without re-exploring them.

#### Worked example: maximum independent set (no two adjacent nodes chosen)

```
        3
       / \
      2   3
       \    \
        3    1
```

| node | take = val + skip(children) | skip = Σ max(take, skip)(children) |
|---|---|---|
| 3 (leaf under 2) | 3 | 0 |
| 1 (leaf under right 3) | 1 | 0 |
| 2 | 2 + 0 = 2 | max(3, 0) = 3 |
| 3 (right) | 3 + 0 = 3 | max(1, 0) = 1 |
| 3 (root) | 3 + 3 + 1 = 7 | max(2, 3) + max(3, 1) = 6 |

Answer: max(7, 6) = **7** (root 3, and the two bottom nodes 3 and 1).

#### Code

```cpp
pair<long long, long long> robTree(TreeNode* n) {       // {take, skip}
    if (!n) return {0, 0};
    auto [lt, ls] = robTree(n->left);
    auto [rt, rs] = robTree(n->right);
    long long take = n->val + ls + rs;                   // children must be skipped
    long long skip = max(lt, ls) + max(rt, rs);          // children free to choose
    return {take, skip};
}

// Sum of distances from every node to all others, by rerooting (general tree, n nodes).
vector<long long> sumOfDistances(int n, const vector<vector<int>>& adj) {
    vector<long long> down(n, 0), ans(n, 0), size(n, 1);
    function<void(int, int)> dfs1 = [&](int u, int p) {   // subtree sizes and distances down
        for (int v : adj[u]) if (v != p) {
            dfs1(v, u);
            size[u] += size[v];
            down[u] += down[v] + size[v];
        }
    };
    function<void(int, int)> dfs2 = [&](int u, int p) {   // move the root from u to each child
        for (int v : adj[u]) if (v != p) {
            ans[v] = ans[u] - size[v] + (n - size[v]);    // v's side gets closer, the rest farther
            dfs2(v, u);
        }
    };
    dfs1(0, -1);
    ans[0] = down[0];
    dfs2(0, -1);
    return ans;
}
```

```python
def min_cameras(root):
    """Minimum cameras so every node is watched (a camera covers itself, parent, children)."""
    NEED, COVERED, CAMERA = 0, 1, 2
    count = 0
    def dfs(node):
        nonlocal count
        if node is None:
            return COVERED                   # empty children need nothing
        left, right = dfs(node.left), dfs(node.right)
        if NEED in (left, right):
            count += 1
            return CAMERA                    # a child needs cover: put a camera here
        if CAMERA in (left, right):
            return COVERED
        return NEED                          # leave it to the parent
    if dfs(root) == NEED:
        count += 1
    return count
```

#### Complexity

Each node is processed once with constant work per child: $O(n)$ time, $O(h)$ recursion stack. Rerooting is two passes: $O(n)$.

#### Edge cases and bugs

- Deep trees (a chain of $10^5$ nodes) overflow recursion; use an iterative postorder.
- In rerooting, forgetting that the parent's side has `n - size[v]` nodes.
- In general trees given as edges, skip the parent when iterating neighbors.

#### Variants

- Diameter, longest path with constraints (return the best downward path, update a global answer).
- Count subtrees with a property, number of good leaf pairs (return distance counts).
- Choose k nodes in a tree to maximize value (tree knapsack, merging children's arrays).

Connects to: bottom-up tree recursion, tree DP on subtrees, take or skip DP, designing DP states.

### questions
Q: Why do tree DP functions often return more than one value?
A: The parent's options depend on facts about each child, such as whether the child was chosen or covered. Returning the best result for each possibility lets the parent pick compatible combinations without recomputing the child.

Q: How do you find a maximum-weight set of tree nodes with no two adjacent?
A: For each node, return (best with the node taken, best with it skipped). Taken equals the node's value plus each child's skipped value; skipped equals the sum over children of the better of their two values. The answer is the better value at the root.

Q: What is rerooting, and when do you need it?
A: A technique for computing an answer for every node as the root in O(n): one DFS computes subtree answers, and a second DFS moves the root from a node to each child, adjusting the answer with the parts that change. You need it for questions like "the sum of distances from each node to all others".

Q: How does the sum-of-distances rerooting formula work?
A: When the root moves from u to its child v, the size[v] nodes in v's subtree get one step closer and the other n − size[v] nodes get one step farther, so ans[v] = ans[u] − size[v] + (n − size[v]).

### signals
- optimize a choice over the nodes of a tree with constraints between parent and child
- "no two adjacent nodes", "every node covered", "minimum cameras or guards"
- an answer needed for every node as the root
- subtree results combine at the parent

### template
```cpp
// Tree DP returning several states per node (postorder).
struct States { long long take, skip; };

States treeDp(TreeNode* n) {
    if (!n) return {0, 0};                        // empty subtree
    States L = treeDp(n->left), R = treeDp(n->right);
    States cur;
    cur.take = n->val + L.skip + R.skip;          // constraint: chosen parent, unchosen children
    cur.skip = max(L.take, L.skip) + max(R.take, R.skip);
    return cur;                                   // answer: max(root.take, root.skip)
}
```

## dsa.dp-advanced.bitmask-dp
name: "Bitmask DP"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.bits.bitmask-enumeration]
scope: "subsets as states, travelling salesman style, partition into k subsets"

### simple
Bitmask DP uses a row of on-off switches to remember which items have already been used, and makes that set part of the DP state. For a salesman visiting a few cities, the state is "which cities I've visited and where I am now". Because there are 2^n possible sets, it only works for small n, around 20 or fewer.

### interview
- State `dp[mask]` or `dp[mask][i]`: the best result having used exactly the items in `mask` (and ending at i).
- **Travelling salesman**: `dp[mask][i] = min over j in mask, j != i of dp[mask ^ (1 << i)][j] + dist[j][i]`: **O(2ⁿ · n²)** time, O(2ⁿ · n) space.
- **Assignment** (n workers to n jobs): `dp[mask]` where the number of set bits tells which worker is next: O(2ⁿ · n).
- **Partition into k equal-sum subsets**: `dp[mask]` = remainder of the current bucket (or −1 if unreachable), adding an unused element that fits: O(2ⁿ · n).
- Iterate masks in increasing numeric order: every subset of a mask is numerically smaller, so dependencies are ready.
- n ≤ 20 for O(2ⁿ · n); n ≤ 15 to 16 for O(2ⁿ · n²) or O(3ⁿ) (submask enumeration).

### deep
#### Intuition

When the future depends on **which** items have been used (not just how many), the used set is part of the state. With $n$ items there are $2^n$ sets, encoded as integers whose bits mark used items. Removing or adding an item is a bit operation, and iterating masks in increasing order computes smaller sets first.

#### Worked example: assignment

Costs `cost[worker][job]`, 3 workers and 3 jobs:

```
      j0 j1 j2
w0 [   9  2  7 ]
w1 [   6  4  3 ]
w2 [   5  8  1 ]
```

`dp[mask]` = min cost after assigning the first `popcount(mask)` workers to the jobs in mask.

| mask (jobs used) | worker placed | dp |
|---|---|---|
| 000 | | 0 |
| 001, 010, 100 | w0 | 9, 2, 7 |
| 011 | w1 | min(dp[010] + 6, dp[001] + 4) = 8 |
| 101 | w1 | min(dp[100] + 6, dp[001] + 3) = 12 |
| 110 | w1 | min(dp[100] + 4, dp[010] + 3) = 5 |
| 111 | w2 | min(dp[110] + 5, dp[101] + 8, dp[011] + 1) = 9 |

Minimum total **9**: w0 → j1 (2), w1 → j0 (6), w2 → j2 (1).

#### Code

```cpp
int assignment(const vector<vector<int>>& cost) {
    int n = cost.size();
    vector<int> dp(1 << n, INT_MAX);
    dp[0] = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] == INT_MAX) continue;
        int worker = __builtin_popcount(mask);            // next worker to place
        if (worker == n) continue;
        for (int job = 0; job < n; job++)
            if (!(mask >> job & 1))
                dp[mask | 1 << job] = min(dp[mask | 1 << job], dp[mask] + cost[worker][job]);
    }
    return dp[(1 << n) - 1];
}

int tsp(const vector<vector<int>>& d) {                   // start and end at city 0
    int n = d.size(), FULL = 1 << n;
    vector<vector<int>> dp(FULL, vector<int>(n, INT_MAX / 2));
    dp[1][0] = 0;                                         // visited {0}, standing at 0
    for (int mask = 1; mask < FULL; mask++)
        for (int i = 0; i < n; i++) {
            if (!(mask >> i & 1) || dp[mask][i] >= INT_MAX / 2) continue;
            for (int j = 0; j < n; j++)
                if (!(mask >> j & 1))
                    dp[mask | 1 << j][j] = min(dp[mask | 1 << j][j], dp[mask][i] + d[i][j]);
        }
    int best = INT_MAX;
    for (int i = 0; i < n; i++) best = min(best, dp[FULL - 1][i] + d[i][0]);
    return best;
}
```

```python
def can_partition_k_subsets(nums, k):
    total = sum(nums)
    if total % k:
        return False
    target, n = total // k, len(nums)
    nums = sorted(nums)
    if nums[-1] > target:
        return False
    fill = [-1] * (1 << n)            # fill[mask]: amount in the current bucket, -1 unreachable
    fill[0] = 0
    for mask in range(1 << n):
        if fill[mask] < 0:
            continue
        for i in range(n):
            if not mask >> i & 1 and fill[mask] + nums[i] <= target:
                fill[mask | 1 << i] = (fill[mask] + nums[i]) % target
            elif not mask >> i & 1:
                break                  # sorted: larger numbers won't fit either
    return fill[-1] == 0
```

#### Complexity

Assignment: $O(2^n \cdot n)$. TSP: $O(2^n \cdot n^2)$ time, $O(2^n \cdot n)$ memory (for $n = 16$: about 1 million states × 16). Partition into k subsets: $O(2^n \cdot n)$.

#### Edge cases and bugs

- `1 << n` overflows `int` for n ≥ 31; use `1LL` when shifting large values.
- Memory: `dp[1 << 20][20]` of ints is 80 MB; check limits.
- Iterating masks in the wrong order (dependencies come from smaller masks).

#### Variants

- Shortest path visiting all nodes (BFS over (node, mask)).
- Number of ways to wear different hats (mask over people, iterate hats).
- Maximum compatibility score sum, minimum incompatibility (partition with constraints).
- Sum over subsets (SOS DP): aggregate over all submasks in O(2ⁿ · n).

Connects to: bitmask enumeration, designing DP states, shortest path with bitmask state, backtracking.

### questions
Q: When is bitmask DP appropriate?
A: When the state must record which subset of a small set of items has been used, because different subsets lead to different futures, and n is small enough (about 20 or fewer) for 2^n states to fit in time and memory.

Q: What is the state and recurrence for the travelling salesman problem?
A: dp[mask][i] is the minimum cost to start at city 0, visit exactly the cities in mask, and end at city i. Extend it to an unvisited city j: dp[mask | 1 << j][j] = min(…, dp[mask][i] + dist[i][j]). The answer adds the return edge to city 0. It's O(2^n · n²).

Q: Why can masks be processed in increasing numeric order?
A: Adding an item to a set sets a bit, which makes the integer larger. So every state is only reached from numerically smaller masks, which are already final when processed in increasing order.

Q: How does the assignment problem avoid a worker index in the state?
A: Workers are assigned in a fixed order, so the number of jobs already used, popcount(mask), tells which worker comes next. The state is just the set of used jobs, giving O(2^n · n).

Q: How does bitmask DP check partitioning into k equal-sum subsets?
A: Fill buckets one at a time. dp[mask] records the amount in the current, partially filled bucket after using the items in mask (or unreachable). Adding an unused item that fits updates the amount modulo the target, which starts a new bucket when one fills. The answer is whether the full mask ends at 0.

### signals
- n up to about 20 and a need to remember which items were used
- visit all cities or nodes exactly once with minimum cost
- assign n people to n tasks with pairwise costs
- partition a small set into groups with constraints

### template
```cpp
// Bitmask DP over subsets: dp[mask] from dp[mask without one item].
long long subsetDp(int n, function<long long(int, int)> addCost) {
    vector<long long> dp(1 << n, LLONG_MAX / 2);
    dp[0] = 0;                                              // empty set
    for (int mask = 0; mask < (1 << n); mask++) {           // increasing: subsets first
        if (dp[mask] >= LLONG_MAX / 2) continue;
        for (int i = 0; i < n; i++)
            if (!(mask >> i & 1)) {                         // item i not used yet
                int next = mask | (1 << i);
                dp[next] = min(dp[next], dp[mask] + addCost(mask, i));
            }
    }
    return dp[(1 << n) - 1];
}
```

## dsa.dp-advanced.digit-dp
name: "Digit DP"
importance: advanced
scope: "counting numbers with digit constraints"

### simple
Digit DP counts numbers up to some limit whose digits follow a rule, such as "no two equal digits in a row" or "digit sum equals 10". Instead of checking every number, it builds numbers digit by digit from the left, remembering whether it is still exactly following the limit's digits. That flag decides whether the next digit can be anything or must stay at most the limit's digit.

### interview
- Count numbers in `[0, N]` with a property; for `[L, R]` compute `f(R) − f(L − 1)`.
- State: `(position, tight, extra)`. `tight` = the prefix equals N's prefix so far (next digit ≤ N's digit, else ≤ 9). `extra` = what the property needs (digit sum, last digit, used-digits mask, remainder mod m).
- Often a `started` flag handles leading zeros (they shouldn't count as digits).
- Memoize only non-tight states (tight states occur once per position).
- Complexity: positions × states × 10: for 18 digits and small extras, tiny.
- Examples: numbers with at most one 1 in binary, numbers with unique digits, count of digit 1 in all numbers up to N, numbers divisible by the sum of their digits.

### questions
Q: What does the "tight" flag represent in digit DP?
A: Whether the digits chosen so far exactly equal the upper bound's prefix. If tight, the next digit can't exceed the bound's next digit; once a smaller digit is chosen, the number is already below the bound, and all later digits can be 0 to 9.

Q: How do you count numbers in a range [L, R] with a digit property?
A: Write a function f(N) that counts numbers from 0 to N with the property using digit DP, then compute f(R) − f(L − 1).

Q: Why is a "started" flag sometimes needed?
A: Leading zeros aren't real digits. Properties like "all digits are distinct" or "no digit 0" would be violated by padding zeros, so the state tracks whether a non-zero digit has been placed yet and ignores zeros before it.

Q: What is the typical complexity of digit DP?
A: The number of digits (up to about 19 for 64-bit values) times the number of extra-state values times 2 for tight times 10 digit choices. With small extra states, that's a few thousand operations.

## dsa.dp-advanced.dp-with-binary-search
name: "DP with binary search"
importance: advanced
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "weighted job scheduling"

### simple
Sometimes a DP transition needs "the last earlier item that is compatible with this one", and binary search finds it quickly. In weighted job scheduling, jobs sorted by end time let you ask: if I take this job, which is the latest job that finishes before it starts? The answer for that job, plus this job's profit, competes with simply skipping this job.

### interview
- **Weighted job scheduling**: sort jobs by end time; `dp[i] = max(dp[i-1], profit[i] + dp[p(i)])`, where `p(i)` = number of jobs ending at or before job i's start (binary search on end times). **O(n log n)**.
- The structure is take-or-skip DP, with the "previous compatible" index found by `upper_bound`.
- Also: maximum profit in events with k choices (add a count dimension), longest increasing subsequence (binary search on tails), minimum taps with sorted intervals.
- Sorting by end time (not start) makes all compatible earlier jobs form a prefix.

### questions
Q: How do you solve weighted job scheduling?
A: Sort jobs by end time. For each job i, the best total is either the best without it, dp[i − 1], or its profit plus the best total of jobs ending at or before its start. That index is found by binary search over the sorted end times, so the whole algorithm is O(n log n).

Q: Why sort by end time?
A: With jobs sorted by end time, the jobs compatible with job i (those ending by its start) form a prefix of the sorted list, so a single index describes them and binary search finds it. Sorting by start time doesn't give that prefix property.

Q: How does this relate to unweighted interval scheduling?
A: With equal weights, the greedy "earliest end first" is optimal. With weights, a high-value job might overlap several low-value ones, so greedy fails, and the DP compares taking and skipping each job.

Q: How would you extend it to pick at most k events?
A: Add a count to the state: dp[i][j] is the best value using the first i events with at most j chosen, with the same binary search for the previous compatible event. That costs O(n · k + n log n).

## dsa.dp-advanced.dp-optimization-overview
name: "DP optimization overview"
importance: advanced
scope: "monotonic queue optimization, prefix sums inside transitions"

### simple
Some DP solutions are correct but too slow because each state looks at many earlier states. Optimizations speed up that look-up without changing the answer, for example keeping a running sum instead of re-adding a range, or keeping the best recent value in a special queue. They turn a slow inner loop into constant or logarithmic work.

### interview
- **Prefix sums in transitions**: `dp[i] = Σ dp[j]` over a window of j becomes O(1) with a running prefix sum of dp (for example, counting ways with a range of step sizes).
- **Monotonic deque**: `dp[i] = best(dp[j]) + cost` for j in a sliding window: keep candidates in a deque: O(n) instead of O(n · k) (constrained subsequence sum, jump game VI).
- **Binary search / data structures**: when the valid j form a sorted prefix (weighted scheduling), or with a segment tree or Fenwick tree for range maximums over values (LIS variants).
- **Convex hull trick / Li Chao tree**: transitions `dp[i] = min_j (m_j · x_i + b_j)`: O(n log n) or O(n).
- **Divide and conquer optimization**, **Knuth's optimization**: when the optimal split point is monotone: O(n² log n) or O(n²) instead of O(n³).
- First find the O(n²) DP, then look at the shape of the inner loop.

### questions
Q: How can prefix sums speed up a DP transition?
A: If dp[i] sums dp[j] over a contiguous range of earlier indices, maintain a prefix sum of the dp array. Each range sum then costs O(1), so an O(n · k) DP becomes O(n).

Q: When does a monotonic deque optimize a DP?
A: When dp[i] needs the maximum (or minimum) of dp[j] over a sliding window of the previous k positions. The deque keeps candidates in decreasing order, dropping expired and dominated ones, giving O(n) total instead of O(n · k).

Q: What kind of transition does the convex hull trick handle?
A: Transitions of the form dp[i] = min over j of (m_j · x_i + b_j), where each earlier state defines a line and each new state queries the lowest line at a point. Keeping the lines in a hull (or a Li Chao tree) answers each query in O(log n), or amortized O(1) when slopes and queries are monotone.

Q: What is the general strategy for optimizing a DP in an interview?
A: First write the correct, slower DP and state its complexity. Then examine the inner loop: is it a range sum (prefix sums), a sliding-window extreme (monotonic deque), a sorted prefix (binary search) or a range query (segment tree)? Choose the structure that answers it fastest.
