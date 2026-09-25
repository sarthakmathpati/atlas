---
topic: dsa.dp-foundations
name: "Dynamic programming: foundations"
subject: dsa
order: 26
prereqs: [dsa.recursion]
---

## dsa.dp-foundations.what-dp-is
name: "What DP is"
importance: must
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "overlapping subproblems and optimal substructure"

### simple
Dynamic programming solves a big problem by solving smaller versions of it once each and reusing those answers. It is like climbing a staircase and writing on each step how many ways there are to reach it: the count for a step is just the sum of the counts on the one or two steps below. DP works whenever the same smaller questions keep coming up and the best answer is built from best answers to them.

### interview
- DP applies when a problem has **optimal substructure** (an optimal answer is built from optimal answers to subproblems) and **overlapping subproblems** (the same subproblems recur).
- Recipe: define the **state** (what a subproblem is), the **transition** (how it's built from smaller states), **base cases**, the **order** of computation, and where the **answer** is.
- Cost = number of states × work per transition.
- Two styles: top-down **memoization** (recursion + cache) and bottom-up **tabulation** (fill a table in order).
- Divide and conquer has independent subproblems (no overlap); greedy commits to one choice; DP considers all choices but solves each subproblem once.
- Signals: "number of ways", "minimum or maximum cost", "is it possible", choices at each step, constraints like n ≤ 5000 or target ≤ 10⁴.

### deep
#### Intuition

A naive recursion that tries every choice often recomputes the same subproblem an exponential number of times. DP notices the repetition: if the answer to a subproblem depends only on a few parameters, there are only as many distinct subproblems as parameter combinations. Solve each once, store it, and look it up afterwards.

#### Worked example: climbing stairs

You can climb 1 or 2 steps at a time. How many ways to reach step 5?

- State: `ways[i]` = number of ways to reach step i.
- Transition: the last move was from step i − 1 or i − 2, so `ways[i] = ways[i-1] + ways[i-2]`.
- Base: `ways[0] = 1` (standing at the bottom), `ways[1] = 1`.

| i | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| ways | 1 | 1 | 2 | 3 | 5 | 8 |

The naive recursion makes about $\varphi^n$ calls; the table has $n + 1$ entries.

#### The two properties

**Optimal substructure**: the best path from A to C through B consists of the best path from A to B plus the best path from B to C. If a problem's optimal solution could use a non-optimal sub-solution, DP on that state doesn't work (for example, the longest **simple** path in a general graph: the best path to B might block vertices needed later).

**Overlapping subproblems**: without overlap, memoization doesn't save anything, and the problem is divide and conquer (merge sort's halves are never shared).

#### Code: from brute force to DP

```cpp
// Minimum coins to make `amount` (unlimited coins of each value), or -1.
int minCoinsNaive(const vector<int>& coins, int amount) {     // exponential
    if (amount == 0) return 0;
    int best = INT_MAX;
    for (int c : coins)
        if (c <= amount) {
            int sub = minCoinsNaive(coins, amount - c);
            if (sub != -1) best = min(best, sub + 1);
        }
    return best == INT_MAX ? -1 : best;
}

int minCoinsDp(const vector<int>& coins, int amount) {         // O(amount * coins)
    vector<int> dp(amount + 1, INT_MAX);                        // dp[a] = min coins for a
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a && dp[a - c] != INT_MAX) dp[a] = min(dp[a], dp[a - c] + 1);
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}
```

#### Complexity

Coin change: `amount + 1` states, each trying every coin: $O(\text{amount} \cdot k)$ time, $O(\text{amount})$ space. In general, count states and multiply by the transition cost; then check it against the constraints.

#### How to approach a DP problem in an interview

1. Write the brute-force recursion with clear parameters.
2. Notice which parameters the answer depends on: that's the state.
3. Add memoization (top-down) and state the complexity.
4. If needed, convert to a table (bottom-up) and optimize space.
5. Test on the smallest cases, including the base cases.

#### Pitfalls

- A state missing information (the answer also depends on something not in the state) gives wrong results.
- A state with too much information (the whole path) blows up the number of states.
- Mixing "number of ways" (sum) with "best" (min/max) in the same recurrence.

Connects to: memoization intro, memoization vs tabulation, designing DP states, greedy fundamentals.

### questions
Q: What two properties must a problem have for dynamic programming to apply?
A: Optimal substructure, meaning an optimal solution is composed of optimal solutions to subproblems, and overlapping subproblems, meaning the same subproblems are needed many times. The first makes the recurrence correct; the second makes caching worthwhile.

Q: How is dynamic programming different from divide and conquer?
A: Both split a problem into subproblems, but divide and conquer's subproblems are independent and solved once each naturally, like merge sort's halves. DP's subproblems overlap, so their answers are stored and reused to avoid exponential repetition.

Q: How do you estimate the complexity of a DP solution?
A: Multiply the number of distinct states by the work each state's transition does. For example, coin change has amount + 1 states, each checking k coins, so O(amount · k).

Q: How does DP differ from a greedy algorithm?
A: A greedy algorithm commits to one locally best choice at each step and never reconsiders. DP evaluates every choice at each state and keeps the best, so it is correct in cases like coin change with unusual denominations where greedy fails.

Q: What are common signals that a problem needs DP?
A: Questions asking for the number of ways, the minimum or maximum cost, or whether something is achievable, where each step involves a choice and the brute force recomputes the same situations. Constraints that allow O(n²) or O(n · target) also hint at DP.

## dsa.dp-foundations.memoization-vs-tabulation
name: "Memoization vs tabulation"
importance: must
prereqs: [dsa.recursion.memoization-intro, dsa.dp-foundations.what-dp-is]
scope: "top-down vs bottom-up and when each is easier"

### simple
There are two ways to fill in DP answers. Memoization starts from the big question and works down, saving each answer the first time it's computed, like a student who looks things up only when needed and keeps notes. Tabulation starts from the smallest questions and fills a table upward in order, like a student who works through the textbook from chapter one.

### interview
- **Memoization (top-down)**: write the recursion, add a cache. Computes only **reachable** states. Easy to derive from brute force. Costs recursion overhead and stack depth.
- **Tabulation (bottom-up)**: loop over states in an order where dependencies are ready. No recursion, often faster, enables **space optimization**. Requires knowing the order.
- Same asymptotic complexity in most problems.
- Choose memoization when the state space is sparse or the order is awkward (DP on trees, on intervals, with complex states); tabulation when the order is simple and memory or speed matters.
- Deep recursion (n = 10⁵ or more) favors tabulation: there is no call stack to overflow.
- Convert between them: the memo's recursive calls tell you the dependencies; tabulation fills states so those dependencies come first.

### deep
#### Intuition

Both approaches compute the same recurrence. Memoization follows the recursion's natural order: ask for the answer, recurse into what it needs, cache on the way back. Tabulation reverses the direction: compute base cases first, then every state whose dependencies are already known, until the target state is filled.

#### Worked example: unique paths in a 3 × 3 grid (right and down moves)

Recurrence: `paths(r, c) = paths(r-1, c) + paths(r, c-1)`, with the first row and column equal to 1.

Tabulation fills row by row:

| | c=0 | c=1 | c=2 |
|---|---|---|---|
| r=0 | 1 | 1 | 1 |
| r=1 | 1 | 2 | 3 |
| r=2 | 1 | 3 | 6 |

Memoization starts at `(2,2)`, calls `(1,2)` and `(2,1)`, which both call `(1,1)`; the second call hits the cache.

#### Code

```cpp
// Top-down: recursion + cache.
long long pathsMemo(int r, int c, vector<vector<long long>>& memo) {
    if (r == 0 || c == 0) return 1;
    long long& m = memo[r][c];
    if (m != -1) return m;                          // cached
    return m = pathsMemo(r - 1, c, memo) + pathsMemo(r, c - 1, memo);
}

long long uniquePathsTopDown(int R, int C) {
    vector<vector<long long>> memo(R, vector<long long>(C, -1));
    return pathsMemo(R - 1, C - 1, memo);
}

// Bottom-up: fill in an order where dependencies are ready (row by row).
long long uniquePathsBottomUp(int R, int C) {
    vector<vector<long long>> dp(R, vector<long long>(C, 1));
    for (int r = 1; r < R; r++)
        for (int c = 1; c < C; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];
    return dp[R - 1][C - 1];
}
```

#### Comparison

| | Memoization | Tabulation |
|---|---|---|
| Derivation | directly from brute force | needs a computation order |
| States computed | only reachable ones | all in the table |
| Overhead | function calls, hash lookups | tight loops |
| Stack depth | up to the longest dependency chain | none |
| Space optimization | hard | natural (rolling rows) |

#### Complexity

Both: states × transition cost. Unique paths: $O(R \cdot C)$ time; memo and table both $O(R \cdot C)$ space, and the bottom-up version reduces to $O(C)$.

#### Pitfalls

- Memo keys that miss a parameter (caching `f(i)` when the result also depends on `j`).
- A sentinel like −1 that can also be a real answer; use a separate "computed" flag or `optional`.
- Reusing a memo table between test cases with different inputs (clear it, or make it local), or keying it by arguments that don't determine the answer.
- Wrong fill order in tabulation: reading `dp[r][c+1]` before it's computed.

Connects to: what DP is, memoization intro, space optimization, transitions and base cases.

### questions
Q: What is the difference between memoization and tabulation?
A: Memoization is top-down: a recursive function stores each result in a cache the first time it computes it. Tabulation is bottom-up: an iterative loop fills a table starting from base cases in an order where every dependency is ready. Both compute the same recurrence.

Q: When is memoization easier or better?
A: When the recurrence follows naturally from a brute-force recursion, when the computation order is awkward (trees, intervals, complex states), or when only a small fraction of states is actually reachable. It avoids computing states you never need.

Q: When is tabulation better?
A: When recursion would be very deep, when speed matters (no call overhead), and when you want to reduce memory with rolling arrays, which depends on a known fill order. It also cannot overflow the call stack.

Q: How do you convert a memoized solution into a tabulated one?
A: Look at which states each call depends on, choose a loop order in which those states are always computed first (for example, increasing index or increasing length), initialize the base cases, and replace recursive calls with table reads.

Q: What bug can a sentinel value in the memo cause?
A: If the sentinel, such as −1 or 0, is also a legitimate answer, computed states look uncomputed and are recalculated every time, which can make the solution exponential again. Use a separate visited flag or a value that can't occur.

## dsa.dp-foundations.designing-dp-states
name: "Designing DP states"
importance: must
prereqs: [dsa.dp-foundations.memoization-vs-tabulation]
scope: "what information defines a subproblem"

### simple
A DP state is the smallest description of "where you are" that is enough to decide everything that comes next. When painting a row of houses so no two neighbors match, you only need to know which house you're on and what color the previous one was, not the whole history. Choosing the right state is most of the work in DP.

### interview
- Ask: "If I stopped here, what do I need to know to finish optimally?" That information is the state; the history beyond it must not matter (the **Markov property**).
- Common state shapes: prefix index `i`; pair of indices `(i, j)` for two strings or an interval; `(i, extra)` where extra is a remaining budget, the last choice, a count, or a bitmask.
- Common meanings: "best answer for the first i items", "best answer **ending at** i" (subarrays, LIS), "best for the range [i, j]".
- Size check: product of dimension sizes must fit the constraints (10⁷ to 10⁸ operations).
- If two situations with the same state can have different futures, the state is missing something; if the state count is too large, look for something redundant.
- Write the state's meaning in one sentence before writing the recurrence.

### deep
#### Intuition

The state is a compression of the past. A good state keeps exactly the information that affects the future. Too little, and the recurrence is wrong; too much, and there are too many states. Most DP difficulty is in finding this compression.

#### Worked example: paint houses with 3 colors

Costs `cost[i][c]`; adjacent houses must differ in color; minimize the total.

- Attempt 1: `dp[i]` = min cost for the first i houses. Not enough: whether house i + 1 can be red depends on house i's color, which `dp[i]` forgot.
- Attempt 2: `dp[i][c]` = min cost to paint houses 0..i with house i painted color c. Now the future depends only on c. Transition: `dp[i][c] = cost[i][c] + min(dp[i-1][c'] for c' != c)`.

Costs `[[17, 2, 17], [16, 16, 5], [14, 3, 19]]`:

| i | red | blue | green |
|---|---|---|---|
| 0 | 17 | 2 | 17 |
| 1 | 16 + min(2, 17) = 18 | 16 + min(17, 17) = 33 | 5 + min(17, 2) = 7 |
| 2 | 14 + min(33, 7) = 21 | 3 + min(18, 7) = 10 | 19 + min(18, 33) = 37 |

Answer: min(21, 10, 37) = **10** (blue, green, blue).

#### Code

```cpp
int minCostPaint(const vector<array<int, 3>>& cost) {
    if (cost.empty()) return 0;
    array<int, 3> dp = cost[0];                    // dp[c]: best with the last house in color c
    for (int i = 1; i < (int)cost.size(); i++) {
        array<int, 3> next;
        for (int c = 0; c < 3; c++)
            next[c] = cost[i][c] + min(dp[(c + 1) % 3], dp[(c + 2) % 3]);  // other colors
        dp = next;
    }
    return *min_element(dp.begin(), dp.end());
}
```

The second example shows a state with an extra parameter (the common difference) stored sparsely in hash maps: the future of a subsequence depends on its last element and its difference, nothing else.

#### A checklist for states

| Question | Typical state |
|---|---|
| Choices along a sequence | index `i` (+ last choice or remaining budget) |
| Two sequences | `(i, j)` prefixes |
| Substrings or ranges | `(l, r)` |
| Subsets of a small set | bitmask |
| Trees | node (+ a small flag), computed bottom-up |
| Resource limits | `(i, capacity)` |
| Games | `(state, whose turn)` or the difference of scores |

#### Complexity

Number of states times transition cost: paint houses is $O(n \cdot 3 \cdot 2) = O(n)$; with k colors, $O(n k^2)$, or $O(n k)$ by tracking the smallest and second-smallest previous values.

#### Pitfalls

- "Ending at i" versus "within the first i" changes both the recurrence and where the answer is (max over all i versus the last entry).
- States that include things you can recompute (like the sum of chosen items when it follows from other state variables).
- Forgetting a flag that matters (holding a stock or not, whether a transaction is in progress).

Connects to: transitions and base cases, what DP is, bitmask DP, interval DP.

### questions
Q: What makes a good DP state?
A: It contains exactly the information needed to solve the rest of the problem optimally, so that two situations with the same state have the same best future. It should also be small enough that the number of states times the transition cost fits the time limit.

Q: Why isn't dp[i] = "minimum cost to paint the first i houses" enough when adjacent houses must differ?
A: The next house's allowed colors depend on the color of house i, which that state forgets. Adding the last color to the state, dp[i][c], makes the future depend only on the state.

Q: What is the difference between "best for the first i elements" and "best ending at i"?
A: "Ending at i" forces element i to be the last one used, which is needed when the next step depends on it, as in longest increasing subsequence or maximum subarray. The final answer is then the maximum over all i, not just the last entry.

Q: How do you know your state is missing information?
A: If you can find two partial solutions with the same state but different possible continuations or different best futures, the state is incomplete. Typical missing pieces are the last choice, a remaining budget, or whether something is in progress.

Q: How do you reduce a state space that is too large?
A: Look for information that can be derived from other parts of the state, for redundant dimensions (such as a count that equals the index), or for a monotonic structure that allows a smaller representation. Sometimes swapping which quantity is the value and which is the index helps, like storing the minimum weight for each value instead of the best value for each weight.

## dsa.dp-foundations.transitions-and-base-cases
name: "Transitions and base cases"
importance: must
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "writing the recurrence, order of computation"

### simple
A transition is the rule that builds one state's answer from smaller states' answers, and base cases are the smallest states you can answer directly. It is like a recipe that says a big cake needs two smaller layers, with the smallest layer made from scratch. You also need to cook in the right order, so every layer is ready before the cake that needs it.

### interview
- Transition: consider the **last decision** (or first): what options are there, and which smaller state does each lead to? Combine with min, max, sum or OR.
- Base cases: the smallest states (empty prefix, zero capacity, single element); choose them so the recurrence works without special cases (often `dp[0] = 0` or `1`).
- Unreachable states: initialize to ±∞ (or a sentinel) and skip them in transitions.
- **Order**: every state must be computed after the states it reads. Increasing index for prefixes; increasing length for intervals; any topological order in general.
- Final answer location: `dp[n]`, `dp[n][target]`, `max over i dp[i]`, or `dp[0][n-1]`.
- Verify with a hand-traced small example before coding.

### deep
#### Intuition

The recurrence is a statement about the last step of an optimal solution: "the best way to reach state S ends with one of these moves, each from some smaller state." If you enumerate every possible last move correctly and take the best, the recurrence is complete. Base cases stop the recursion; computation order makes the table version work.

#### Worked example: decode ways

Digits map `1..26` to letters. Count decodings of "226".

- State: `dp[i]` = number of ways to decode the first i characters.
- Last step: the last letter came from one digit (`s[i-1]`, if it isn't '0') or two digits (`s[i-2..i-1]`, if between 10 and 26).
- Transition: `dp[i] = (s[i-1] != '0' ? dp[i-1] : 0) + (10 <= two-digit <= 26 ? dp[i-2] : 0)`.
- Base: `dp[0] = 1` (empty prefix: one way, decoding nothing).

| i | prefix | one digit | two digits | dp[i] |
|---|---|---|---|---|
| 0 | "" | | | 1 |
| 1 | "2" | 2 → dp[0] = 1 | | 1 |
| 2 | "22" | 2 → dp[1] = 1 | 22 → dp[0] = 1 | 2 |
| 3 | "226" | 6 → dp[2] = 2 | 26 → dp[1] = 1 | 3 |

Three decodings: BBF, BZ, VF.

#### Code

```cpp
int numDecodings(const string& s) {
    int n = s.size();
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;                                              // base: empty prefix
    for (int i = 1; i <= n; i++) {
        if (s[i - 1] != '0') dp[i] += dp[i - 1];            // last letter from one digit
        if (i >= 2) {
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) dp[i] += dp[i - 2]; // last letter from two digits
        }
    }
    return (int)dp[n];
}
```

#### Choosing base cases well

A good base case makes the general rule work at the edges. With `dp[0] = 1` for "the empty string can be decoded one way", the two-digit case at `i = 2` needs no special handling. Similarly, for minimum coins, `dp[0] = 0` and every other entry starts at ∞, so unreachable amounts stay ∞ automatically.

#### Order of computation

| State shape | Safe order |
|---|---|
| prefix `dp[i]` depends on smaller i | i increasing |
| `dp[i][j]` depends on `[i-1][*]` and `[i][j-1]` | row by row, left to right |
| interval `dp[l][r]` depends on shorter intervals | by increasing length |
| `dp[i]` depends on larger i (suffixes) | i decreasing |
| DAG of states | topological order (or memoization) |

#### Pitfalls

- Forgetting a case in the transition (for decode ways, a '0' can't stand alone).
- Base cases that double count (initializing both `dp[0]` and `dp[1]` inconsistently).
- Returning `dp[n]` when the answer is a maximum over all states.
- Reading uninitialized states because the loop order is wrong.

Connects to: designing DP states, memoization vs tabulation, counting DP, linear DP.

### questions
Q: How do you derive a DP transition?
A: Think about the last decision in an optimal (or counted) solution for a state. List every option for that decision and the smaller state each option leaves, then combine them: minimum or maximum for optimization, sum for counting, OR for feasibility.

Q: What is the role of base cases, and how do you pick them?
A: They give answers for the smallest states directly and stop the recursion. Pick them so the general recurrence also works at the boundary, such as dp[0] = 1 for counting (one way to do nothing) or dp[0] = 0 with infinity elsewhere for minimization.

Q: How do you choose the order in which to fill a DP table?
A: Every state must be computed after all the states it depends on. Prefix states go in increasing index order, suffix states in decreasing order, interval states by increasing length, and general state graphs in topological order (or you use memoization).

Q: Why does decode ways set dp[0] = 1?
A: The empty prefix has exactly one decoding, the empty one. With that base, a two-digit code at the start adds dp[0] = 1 way without a special case, and all other counts follow from the same rule.

Q: How do you handle unreachable states in a minimization DP?
A: Initialize them to infinity (or a sentinel) and never extend from a state that is still infinity. At the end, if the target is still infinity, report that it's impossible (for example, −1 in coin change).

## dsa.dp-foundations.space-optimization
name: "Space optimization"
importance: must
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "rolling arrays, keeping only the previous row"

### simple
Many DP tables only ever look one row back, so keeping the whole table wastes memory. You can keep just the previous row and the current one, like a notepad where you only need the last page to write the next one. Sometimes even a single row works, if you fill it in the right direction.

### interview
- If `dp[i][*]` depends only on `dp[i-1][*]`, keep **two rows** (or `prev` and `cur` variables): O(n·m) → O(m).
- **One row in place**: works when each cell reads only cells that haven't been overwritten yet for this row; the loop direction decides that (0/1 knapsack loops capacity **downward**, unbounded knapsack **upward**).
- 1D recurrences reading the last k values: keep k variables (Fibonacci: two).
- For 2D grids reading the cell above and to the left: one row, left to right; the "diagonal" value (LCS, edit distance) needs one saved variable.
- Trade-off: the full table is needed to **reconstruct** the solution, unless you store choices separately or use divide-and-conquer tricks (Hirschberg).

### deep
#### Intuition

Space optimization is about data lifetimes. Once no future state will read a value, you can overwrite it. Draw the dependency arrows of one cell; if they only reach the previous row, older rows are dead weight. The remaining question is whether updating in place destroys values that are still needed.

#### Worked example: minimum path sum with one row

Grid:

```
1 3 1
1 5 1
4 2 1
```

`row[c]` holds the best cost to reach cell (r, c). Update left to right: `row[c] = grid[r][c] + min(row[c] (the cell above, old value), row[c-1] (the cell to the left, new value))`.

| after row | row |
|---|---|
| 0 | 1 4 5 |
| 1 | 2 7 6 |
| 2 | 6 8 7 |

Answer 7. Each update reads `row[c]` before overwriting it (the value from above) and `row[c-1]` after it was updated (the value to the left): exactly the two dependencies.

#### Code

```cpp
int minPathSum(const vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size();
    vector<int> row(C, INT_MAX);
    row[0] = 0;
    for (int r = 0; r < R; r++) {
        row[0] += g[r][0];                                  // only from above
        for (int c = 1; c < C; c++)
            row[c] = g[r][c] + min(row[c], row[c - 1]);     // above (old) vs left (new)
    }
    return row[C - 1];
}

// Longest common subsequence with two rows: O(m) memory.
int lcsTwoRows(const string& a, const string& b) {
    vector<int> prev(b.size() + 1, 0), cur(b.size() + 1, 0);
    for (int i = 1; i <= (int)a.size(); i++) {
        for (int j = 1; j <= (int)b.size(); j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
        swap(prev, cur);
    }
    return prev[b.size()];
}
```

#### A procedure that always works

1. Write the full-table solution and make sure it is correct.
2. For one cell, list exactly which cells it reads (above, left, diagonal, two rows up).
3. If it only reads the previous row, keep two rows and swap them after each row.
4. To go down to one row, decide the loop direction so that every value a cell reads is either already updated (if it needs the new value, like "left" in grid paths) or not yet updated (if it needs the old one, like `dp[c - w]` in 0/1 knapsack); save any value that would be overwritten too early (the diagonal).
5. Re-run the small examples; loop-direction mistakes usually show up immediately.

#### Complexity

Time is unchanged; space drops from $O(n \cdot m)$ to $O(m)$ (choose $m$ as the smaller dimension). For 1D recurrences with a fixed look-back, space becomes $O(1)$.

#### Pitfalls

- Wrong loop direction for one-row knapsacks: upward in 0/1 knapsack lets an item be used many times.
- Losing the diagonal value (top-left) in LCS or edit distance when using one row: save it before overwriting.
- Forgetting to reset `cur` between rows when a row isn't fully overwritten.
- Optimizing space before the solution is correct; do it last.

Connects to: 0/1 knapsack, unbounded knapsack, longest common subsequence, edit distance, reconstructing the answer.

### questions
Q: When can you reduce a 2D DP table to one or two rows?
A: When each row depends only on the previous row (and possibly earlier cells of the same row). Then all older rows are never read again, so keeping the previous and current rows, or a single row updated carefully, is enough.

Q: Why does the 0/1 knapsack loop over capacities in decreasing order with a single row?
A: dp[c] needs dp[c − w] from before the current item was considered. Going downward means dp[c − w] hasn't been updated yet for this item, so each item is used at most once. Going upward would reuse the updated value and allow the item multiple times.

Q: How do you keep the diagonal dependency in a one-row LCS or edit distance?
A: Before overwriting row[j], save its old value, which is the cell above; after processing j, that saved value becomes the diagonal (top-left) for j + 1. One extra variable holds the diagonal as the row is scanned.

Q: What do you lose when you optimize space?
A: The full table, which is usually needed to reconstruct the actual solution (the chosen items or the alignment), not just its value. You can keep a separate table of choices, or use divide-and-conquer techniques like Hirschberg's algorithm to recover the path in linear space.

## dsa.dp-foundations.reconstructing-the-answer
name: "Reconstructing the answer"
importance: important
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "storing choices and walking back through the table"

### simple
A DP table tells you the best value, but often you also need the actual choices that achieve it. You can walk backward from the final cell, at each step asking which option produced this value, like retracing footprints in snow. Storing the chosen option in each cell while filling the table makes the walk back simple.

### interview
- Two methods: **store the choice** (a `choice[state]` or `parent[state]` array filled with the transition), or **recompute** it by checking which option matches the stored value.
- Walk back from the answer state to a base state, collecting decisions; reverse at the end if needed.
- Examples: LCS string, the coins used in coin change, the items in knapsack, the LIS sequence (parent pointers), the edit operations.
- Requires the full table (or the choices table); space-optimized DP can't reconstruct directly.
- Ties: decide which option to prefer (for example, the lexicographically smallest answer may need a specific order).

### questions
Q: How do you recover which coins make up the minimum coin change?
A: While filling dp[a], record which coin achieved the minimum in choice[a]. Then start at the target amount, add choice[a] to the answer, subtract it, and repeat until the amount is 0.

Q: How do you reconstruct a longest common subsequence from the table?
A: Start at dp[n][m]. If the characters at i − 1 and j − 1 match, that character is in the LCS, so take it and move diagonally; otherwise move to whichever neighbor, dp[i − 1][j] or dp[i][j − 1], holds the same value. Reverse the collected characters at the end.

Q: What is the trade-off between storing choices and recomputing them?
A: Storing a choice table costs extra memory but makes the walk back trivial and unambiguous. Recomputing uses only the DP table but repeats the transition logic at each step, which must match exactly how the table was filled.

Q: Why can't you usually reconstruct the answer after optimizing the DP to one row?
A: The walk back needs values from earlier rows that were overwritten. You need either the full table, a separate record of choices, or a divide-and-conquer method that recomputes parts of the table.

## dsa.dp-foundations.counting-dp-and-modulo
name: "Counting DP and modulo"
importance: important
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "number of ways mod 1e9+7"

### simple
Counting problems ask how many ways something can happen, and the numbers grow huge very quickly. Problems usually ask for the answer modulo 1,000,000,007, meaning you only keep the remainder after dividing by that number. You take the remainder after every addition or multiplication, like an odometer that rolls over, so numbers never overflow.

### interview
- Counting DP sums over choices instead of taking min or max: `ways[state] = Σ ways[previous]`.
- Take `% MOD` after each addition and multiplication; `(a + b) % M` and `(a * b) % M` are safe with 64-bit intermediates when `a, b < M ≈ 10⁹`.
- Subtraction: `((a - b) % M + M) % M` to avoid negative results.
- Division needs a **modular inverse** (Fermat: `b^(M-2) mod M` for prime M), not `/`.
- **1e9+7** is prime and fits in 32 bits; the product of two values fits in 64 bits.
- Counting needs care about **double counting**: order matters or not (combinations vs permutations), and base cases like "one way to do nothing".

### questions
Q: Why do counting problems ask for the answer modulo 1e9+7?
A: The counts grow exponentially and overflow any fixed-width integer. Taking the result modulo a large prime keeps numbers small while still letting the judge check the exact answer's residue. 1e9 + 7 is prime and small enough that the product of two residues fits in 64 bits.

Q: How do you subtract safely under a modulus?
A: Compute ((a − b) % M + M) % M. In C++, % can return a negative number for a negative left operand, so adding M before the final modulus keeps the result in [0, M).

Q: Can you divide under a modulus?
A: Not directly. Multiply by the modular inverse instead: for a prime modulus M and b not divisible by M, the inverse is b^(M − 2) mod M by Fermat's little theorem, computed with fast exponentiation.

Q: What are common double-counting mistakes in counting DP?
A: Counting ordered sequences when the problem wants unordered combinations (or the reverse), which depends on loop order in coin-change style DP, and counting the same configuration from two base cases. Checking a tiny example by hand catches both.
