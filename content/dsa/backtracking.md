---
topic: dsa.backtracking
name: "Backtracking"
subject: dsa
order: 12
prereqs: [dsa.recursion]
---

## dsa.backtracking.subsets
name: "Subsets"
importance: must
pattern: true
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "include or exclude, iterative and bitmask versions"

### simple
Generating all subsets means listing every way to pick some items from a set, including picking none or all. For each item you make a yes-or-no decision, like choosing toppings for a pizza one at a time. With n items there are 2 × 2 × … × 2 = 2^n different pizzas.

### interview
- **Include/exclude recursion**: at index `i`, recurse once without `a[i]` and once with it; record at `i == n`. 2ⁿ leaves.
- **Start-index loop** (backtracking style): record the current subset, then for each `j >= start` add `a[j]`, recurse with `j + 1`, remove it. Every node of the tree is a subset.
- **Iterative**: start with `[[]]`; for each element, append it to copies of all existing subsets.
- **Bitmask**: for `mask` from 0 to 2ⁿ − 1, bit `i` says whether `a[i]` is included (n ≤ about 20).
- **O(n · 2ⁿ)** time (2ⁿ subsets, O(n) to copy each), O(n) recursion depth besides the output.
- With duplicates in the input, sort and skip equal values at the same level (subsets II).

### deep
#### Intuition

A subset is a sequence of independent binary decisions, one per element. The recursion tree for include/exclude is a complete binary tree of depth $n$ whose $2^n$ leaves are the subsets. Backtracking walks that tree depth first, keeping one "current subset" that it modifies on the way down and restores on the way back up.

#### Worked example: subsets of [1, 2, 3] with the start-index loop

| path (current subset) | recorded | next choices |
|---|---|---|
| [] | [] | 1, 2, 3 |
| [1] | [1] | 2, 3 |
| [1, 2] | [1, 2] | 3 |
| [1, 2, 3] | [1, 2, 3] | none |
| [1, 3] | [1, 3] | none |
| [2] | [2] | 3 |
| [2, 3] | [2, 3] | none |
| [3] | [3] | none |

Eight subsets. Choosing only indices after the last pick avoids generating `[2, 1]` as a separate subset.

#### Code

```cpp
void subsetsFrom(const vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& out) {
    out.push_back(cur);                        // every node is a subset
    for (int j = start; j < (int)a.size(); j++) {
        cur.push_back(a[j]);                   // choose
        subsetsFrom(a, j + 1, cur, out);       // explore with later elements only
        cur.pop_back();                        // un-choose (backtrack)
    }
}

vector<vector<int>> subsets(const vector<int>& a) {
    vector<vector<int>> out;
    vector<int> cur;
    subsetsFrom(a, 0, cur, out);
    return out;
}

vector<vector<int>> subsetsBitmask(const vector<int>& a) {
    int n = a.size();
    vector<vector<int>> out;
    for (int mask = 0; mask < (1 << n); mask++) {
        vector<int> s;
        for (int i = 0; i < n; i++)
            if (mask >> i & 1) s.push_back(a[i]);
        out.push_back(s);
    }
    return out;
}
```

#### Complexity

$2^n$ subsets, each copied in $O(n)$: $O(n \cdot 2^n)$ time and output size. Recursion depth $O(n)$. For $n = 20$ that is about 20 million element copies, which is fine; for $n = 30$ it is not.

#### Edge cases and bugs

- Appending `cur` itself (not a copy) to the output: every stored subset ends up as the final state of `cur`.
- Forgetting `pop_back` after the recursive call: later branches see stale elements.
- `1 << n` overflows `int` for $n \ge 31$.

#### Variants

- Subsets with duplicates: sort, then in the loop skip `a[j] == a[j - 1]` when `j > start`.
- Subsets with a target sum: prune when the running sum exceeds the target (non-negative values).
- Count subsets with a property: often DP (subset sum), not enumeration.
- Meet in the middle: enumerate subsets of each half separately for $n$ up to 40.

Connects to: combinations, handling duplicates, bitmask enumeration, subset sum DP.

### questions
Q: How many subsets does a set of n elements have, and what does generating them all cost?
A: 2^n, because each element is either in or out independently. Generating them takes O(n · 2^n) time, since each subset has up to n elements to copy into the output.

Q: How does the bitmask method generate subsets?
A: Loop mask from 0 to 2^n − 1 and include a[i] when bit i of mask is set. Each integer corresponds to exactly one subset. It is iterative and simple, but limited to about n ≤ 20 in practice and 30 or so by integer width.

Q: Why do you pass start = j + 1 rather than j or 0 in the loop version?
A: Only elements after the last chosen one are allowed, which fixes one canonical order per subset. Starting from 0 would produce the same subset in different orders, like [1, 2] and [2, 1].

Q: Why must you copy the current list when recording a subset?
A: The current list is one shared object that keeps changing as the recursion adds and removes elements. Storing a reference would leave every recorded entry pointing at the same list, which ends empty.

Q: How do you generate subsets when the input has duplicates, without repeating subsets?
A: Sort the input, then in the loop over choices skip an element equal to the previous one at the same level (j > start and a[j] == a[j − 1]). Equal elements can still be chosen together, but a subset is never generated twice.

### signals
- every possible selection of the items is wanted, each item either in or out (the "power set")
- n up to about 20 with a choice per element
- try every selection of items and keep the ones satisfying a condition
- sum or property over every possible group of elements

### template
```cpp
// Backtracking over "pick from index start onward"; every node is a valid partial answer.
void backtrack(const vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& out) {
    out.push_back(cur);                            // record (or check a condition first)
    for (int j = start; j < (int)a.size(); j++) {
        // if (j > start && a[j] == a[j - 1]) continue;   // skip duplicates (sorted input)
        // if (cannot lead to an answer) break/continue;  // prune
        cur.push_back(a[j]);                       // choose
        backtrack(a, j + 1, cur, out);             // explore (j, not j + 1, to allow reuse)
        cur.pop_back();                            // un-choose
    }
}
```

## dsa.backtracking.permutations
name: "Permutations"
importance: must
pattern: true
prereqs: [dsa.backtracking.subsets]
scope: "swapping vs used array, handling duplicates"

### simple
A permutation is one way of arranging all the items in order. To list them all, you choose which item goes first, then which of the rest goes second, and so on, like seating guests one chair at a time. With n guests there are n × (n − 1) × … × 1 = n! seatings.

### interview
- **Used-array** method: at each position, try every element not yet used; mark, recurse, unmark. Output in lexicographic order if the input is sorted.
- **Swap** method: for position `i`, swap each `a[j]` (j ≥ i) into position `i`, recurse on `i + 1`, swap back. No extra array; order isn't lexicographic.
- **n!** permutations, **O(n · n!)** time to output; n ≤ about 10 is practical.
- **Duplicates**: sort, and skip `a[j]` if it equals `a[j-1]` and `a[j-1]` is **not used** (the used-array rule), so equal values are placed in one fixed order.
- Alternatives: `next_permutation` in a loop; the kth permutation directly with factorials.

### deep
#### Intuition

Building a permutation is filling positions one by one. Position 0 has $n$ choices, position 1 has $n - 1$, and so on. The recursion tree has $n!$ leaves. A `used` array records which elements are already placed so each appears exactly once.

#### Worked example: permutations of [1, 2, 3] with a used array

| path | used | next options |
|---|---|---|
| [1] | 1 | 2, 3 |
| [1, 2] | 1, 2 | 3 → [1, 2, 3] |
| [1, 3] | 1, 3 | 2 → [1, 3, 2] |
| [2] | 2 | 1, 3 → [2, 1, 3], [2, 3, 1] |
| [3] | 3 | 1, 2 → [3, 1, 2], [3, 2, 1] |

Six permutations, in lexicographic order.

#### Code

```cpp
void permute(const vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == a.size()) { out.push_back(cur); return; }
    for (int j = 0; j < (int)a.size(); j++) {
        if (used[j]) continue;
        // With duplicates (a sorted): skip a[j] if an equal earlier copy is not in use.
        if (j > 0 && a[j] == a[j - 1] && !used[j - 1]) continue;
        used[j] = true;
        cur.push_back(a[j]);
        permute(a, used, cur, out);
        cur.pop_back();
        used[j] = false;
    }
}

vector<vector<int>> permuteUnique(vector<int> a) {
    sort(a.begin(), a.end());
    vector<vector<int>> out;
    vector<bool> used(a.size(), false);
    vector<int> cur;
    permute(a, used, cur, out);
    return out;
}
```

#### Why the duplicate rule works

With a sorted input like `[1, 1', 2]`, the rule "use `1'` only if `1` is already in use" means the two 1s always appear in the order `1, 1'` in any permutation. Each distinct arrangement of values is then produced exactly once. The swap version uses a per-level `seen` set instead: never put the same value in position `i` twice.

#### Complexity

$n!$ leaves, each copied in $O(n)$: $O(n \cdot n!)$. For $n = 10$, $10! = 3{,}628{,}800$ permutations, which is at the edge; for $n = 12$ it is 479 million, too many.

#### Edge cases and bugs

- Forgetting to reset `used[j] = false` after recursing.
- Applying the duplicate rule without sorting first.
- Using the swap method and expecting lexicographic order.

#### Variants

- Letter case permutation, generate all strings from a phone keypad (choices per position differ).
- Permutations with constraints (beautiful arrangement): check the constraint as you place each element and prune.
- Kth permutation sequence: compute directly with factorials rather than enumerating.
- Next permutation: the in-place successor algorithm.

Connects to: subsets, handling duplicates in backtracking, next permutation, pruning strategies.

### questions
Q: How many permutations do n distinct elements have, and what is the cost of generating them?
A: n! permutations. Generating and copying them all takes O(n · n!) time, so the approach is only practical for n up to about 10.

Q: Compare the used-array and swapping methods.
A: The used-array method builds a separate current list and marks which indices are taken; with sorted input it outputs in lexicographic order. The swap method rearranges the array in place, fixing position i by swapping each candidate into it, which needs no extra array but produces a non-lexicographic order.

Q: How do you avoid duplicate permutations when the input has repeated values?
A: Sort the input and skip a[j] when it equals a[j − 1] and a[j − 1] isn't currently used. This forces equal values to be placed in a fixed relative order, so each distinct arrangement appears once.

Q: Why is the duplicate check !used[j − 1] and not used[j − 1]?
A: Both conditions give correct results, but !used[j − 1] prunes much earlier: it rejects using a later copy before the earlier one at the same level, cutting whole branches. With used[j − 1] the duplicates are only removed deeper in the tree.

### signals
- all orderings or arrangements of a set of items
- "every possible order" with n up to about 10
- placing each item exactly once under constraints
- rearranging letters or digits in all possible ways

### template
```cpp
// Permutations with a used[] array; sort first if duplicates must be skipped.
void perms(const vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == a.size()) { out.push_back(cur); return; }   // all positions filled
    for (int j = 0; j < (int)a.size(); j++) {
        if (used[j]) continue;                                     // already placed
        if (j > 0 && a[j] == a[j - 1] && !used[j - 1]) continue;   // duplicate at this level
        used[j] = true; cur.push_back(a[j]);                       // place a[j] next
        perms(a, used, cur, out);
        cur.pop_back(); used[j] = false;                           // undo
    }
}
```

## dsa.backtracking.combinations
name: "Combinations"
importance: must
pattern: true
prereqs: [dsa.backtracking.subsets]
scope: "start index, reuse vs no reuse, combination sum"

### simple
A combination is a selection of items where order doesn't matter, like choosing 3 friends out of 10 to invite. Backtracking builds combinations by only choosing items after the last one picked, so the same group is never listed twice. Some problems let you pick the same item again, like buying several scoops of one flavor, which changes one small detail.

### interview
- Use a **start index**: after choosing `a[j]`, recurse from `j + 1` (no reuse) or from `j` (unlimited reuse).
- **Choose k of n**: stop when the size reaches k; prune when not enough elements remain (`n - j < k - size`). There are C(n, k) results.
- **Combination sum** (reuse allowed): recurse from `j`, subtract from the remaining target, stop at 0, prune when an element exceeds the remaining target (sort first to `break` early).
- **Each element once, input has duplicates**: sort, recurse from `j + 1`, skip `a[j] == a[j-1]` when `j > start`.
- Output-sensitive: O(k · C(n, k)) for choose-k.
- Counting combinations (rather than listing) is usually DP.

### deep
#### Intuition

Combinations are subsets with an extra condition (a size, or a sum). The start index gives each combination one canonical order (indices increasing), which prevents duplicates like `[2, 3]` and `[3, 2]`. Whether the recursive call starts at `j` or `j + 1` decides whether an element can be reused.

#### Worked example: combination sum, candidates [2, 3, 6, 7], target 7, reuse allowed

| path | remaining | action |
|---|---|---|
| [2] | 5 | recurse from 2 |
| [2, 2] | 3 | recurse from 2 |
| [2, 2, 2] | 1 | 2 > 1 and the rest are larger: stop |
| [2, 2, 3] | 0 | record [2, 2, 3] |
| [2, 3] | 2 | 3 > 2: stop (sorted, so break) |
| [3] | 4 | [3, 3] leaves 1: stop |
| [6] | 1 | stop |
| [7] | 0 | record [7] |

Result: `[2, 2, 3]` and `[7]`.

#### Code

```cpp
void combinationSum(const vector<int>& c, int start, int remaining,
                    vector<int>& cur, vector<vector<int>>& out) {   // c sorted ascending
    if (remaining == 0) { out.push_back(cur); return; }
    for (int j = start; j < (int)c.size(); j++) {
        if (c[j] > remaining) break;           // sorted: everything after is too big
        cur.push_back(c[j]);
        combinationSum(c, j, remaining - c[j], cur, out);  // j: the same value may repeat
        cur.pop_back();
    }
}

void chooseK(int n, int k, int start, vector<int>& cur, vector<vector<int>>& out) {
    if ((int)cur.size() == k) { out.push_back(cur); return; }
    for (int x = start; x <= n - (k - (int)cur.size()) + 1; x++) {  // leave room for the rest
        cur.push_back(x);
        chooseK(n, k, x + 1, cur, out);        // x + 1: each number at most once
        cur.pop_back();
    }
}
```

#### Complexity

Choose-k produces $\binom{n}{k}$ results in $O(k \binom{n}{k})$ time. Combination sum with reuse is exponential in target / smallest candidate; pruning with sorting keeps it fast in practice. Depth is at most $k$ or target / smallest candidate.

#### Edge cases and bugs

- Recursing from `j + 1` when reuse is allowed (misses `[2, 2, 3]`), or from `j` when it isn't (reuses elements).
- `break` on `c[j] > remaining` only works if `c` is sorted; otherwise use `continue`.
- Target 0: the empty combination is usually the one valid answer.
- Negative numbers break the pruning and can make sums loop forever with reuse.

#### Variants

- Combination sum III (k numbers from 1 to 9 summing to n), letter combinations of a phone number, factor combinations.
- Counting the number of combinations to reach a target: coin change II (DP, order doesn't matter).
- Counting ordered sequences: combination sum IV (DP where order matters).

Connects to: subsets, handling duplicates in backtracking, unbounded knapsack, pruning strategies.

### questions
Q: How do you make sure each combination is generated only once?
A: Only choose elements at or after a start index, so every combination is built in increasing index order. [2, 3] can be built, but [3, 2] can't, because after choosing 3 the loop never goes back to 2.

Q: What changes between "each element may be reused" and "each element at most once"?
A: Only the start index of the recursive call: recurse from j to allow picking a[j] again, or from j + 1 to move past it. Everything else stays the same.

Q: How do you prune a combination sum search?
A: Sort the candidates and stop the loop as soon as a candidate exceeds the remaining target, since every later candidate is larger. For choose-k, stop when too few elements remain to reach size k.

Q: How do you handle duplicate values in the input for "each element at most once"?
A: Sort the input and skip a[j] when j > start and a[j] == a[j − 1]. This avoids starting the same branch twice at one level while still allowing equal values deeper in the same combination.

Q: How is counting combinations different from listing them?
A: Listing is output-sensitive and exponential in the worst case. Counting can often be done with dynamic programming, such as coin change II for ways to reach a sum, in polynomial time.

### signals
- choose k items out of n, where order doesn't matter
- all groups of numbers that add up to a target
- "each number may be used unlimited times" versus "at most once"
- letter or digit combinations from a fixed set of choices per slot

### template
```cpp
// Combinations toward a target: sorted input, start index, reuse controlled by j vs j + 1.
void combos(const vector<int>& c, int start, int remaining, vector<int>& cur, vector<vector<int>>& out) {
    if (remaining == 0) { out.push_back(cur); return; }         // found one
    for (int j = start; j < (int)c.size(); j++) {
        if (j > start && c[j] == c[j - 1]) continue;             // (no-reuse + duplicates) skip repeats
        if (c[j] > remaining) break;                             // prune: sorted input
        cur.push_back(c[j]);
        combos(c, j + 1, remaining - c[j], cur, out);            // j for reuse, j + 1 for once
        cur.pop_back();
    }
}
```

## dsa.backtracking.handling-duplicates-in-backtracking
name: "Handling duplicates in backtracking"
importance: must
prereqs: [dsa.backtracking.permutations]
scope: "sort, then skip equal choices at the same level"

### simple
When the input has repeated values, backtracking can produce the same answer several times, like listing both "apple, apple(2)" and "apple(2), apple" when they are really the same fruit. The fix is to sort the input so equal values sit together, then never try the same value twice for the same slot. Answers stay complete, but each appears once.

### interview
- Sort first so duplicates are adjacent.
- **Skip rule for subsets and combinations**: in the loop `for j in start..n-1`, skip when `j > start && a[j] == a[j-1]`. It prevents two branches at the **same level** starting with the same value.
- **Skip rule for permutations**: skip `a[j]` when `a[j] == a[j-1]` and `a[j-1]` is not used; equal values then always appear in index order.
- Alternative: a per-level `seen` set of values already tried at this position (works without sorting, costs a set per level).
- Deduplicating the output with a set afterwards works but wastes time exploring duplicate branches, which can be exponentially many.

### deep
#### Intuition

Duplicates come from making "the same choice" twice at the same decision point. If two equal values are both available for the next slot, choosing either one leads to identical subtrees. So at each level, allow each distinct value once. Deeper levels are different decision points, where the second copy is still allowed, so combinations like `[1, 1, 2]` remain possible.

#### Worked example: subsets of [1, 2, 2]

Without the rule, the start-index loop produces `[2]` twice (from index 1 and index 2) and `[1, 2]` twice. With the rule (skip `j > start` and `a[j] == a[j - 1]`):

| level (start) | candidates tried | skipped |
|---|---|---|
| 0 | 1 (j=0), 2 (j=1) | 2 at j=2 (same as j=1 at this level) |
| after [1], start 1 | 2 (j=1) | 2 at j=2 |
| after [1, 2], start 2 | 2 (j=2): j == start, allowed | |
| after [2], start 2 | 2 (j=2): allowed | |

Output: `[]`, `[1]`, `[1, 2]`, `[1, 2, 2]`, `[2]`, `[2, 2]`: six distinct subsets.

#### Code

```cpp
void subsetsWithDup(const vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& out) {
    out.push_back(cur);
    for (int j = start; j < (int)a.size(); j++) {
        if (j > start && a[j] == a[j - 1]) continue;   // same value already tried at this level
        cur.push_back(a[j]);
        subsetsWithDup(a, j + 1, cur, out);
        cur.pop_back();
    }
}

vector<vector<int>> subsetsII(vector<int> a) {
    sort(a.begin(), a.end());                          // duplicates must be adjacent
    vector<vector<int>> out;
    vector<int> cur;
    subsetsWithDup(a, 0, cur, out);
    return out;
}
```

#### Why `j > start` and not `j > 0`

`j > 0` would also skip the second 2 when it is the first choice at a deeper level (start = 2), which removes valid answers like `[1, 2, 2]`. The duplicate is only a problem among siblings, which are the choices of the same loop, so compare with the previous candidate **in this loop**, meaning `j > start`.

#### Complexity

The skip rule doesn't change the worst case (distinct input), but with many duplicates it cuts the search to the number of distinct answers. Sorting adds $O(n \log n)$. Deduplicating the output with a set instead would still explore every duplicate branch.

#### Edge cases and bugs

- Forgetting to sort: equal values aren't adjacent, and the rule misses duplicates.
- Using `j > 0` (removes valid answers) or no condition (keeps duplicates).
- For permutations, using the combination rule (`j > start`) doesn't apply because there is no start index; use the `used` rule or a per-level set.

Connects to: subsets, permutations, combinations, sorting.

### questions
Q: What is the standard way to avoid duplicate results in backtracking?
A: Sort the input so equal values are adjacent, then at each level of the recursion skip a candidate equal to the previous candidate in the same loop. Each distinct value is tried once per decision point, so identical subtrees are never explored twice.

Q: Why is the condition j > start rather than j > 0 in subsets II?
A: The rule should only compare siblings, the choices made by the same loop. With j > 0, a deeper level whose first candidate equals the element just used would be skipped, removing valid results such as [1, 2, 2].

Q: How do you avoid duplicates in permutations of an array with repeated values?
A: Sort, and skip a[j] if a[j] == a[j − 1] and a[j − 1] isn't currently used. Alternatively, keep a set of values already placed at the current position and skip values in it.

Q: Why not generate everything and remove duplicates with a set at the end?
A: It gives correct output but explores every duplicate branch, which can be exponentially more work than the number of distinct answers, and it needs extra memory to hash every result. Skipping at each level prunes those branches before exploring them.

## dsa.backtracking.grid-backtracking
name: "Grid backtracking"
importance: must
pattern: true
scope: "word search, marking visited and undoing"

### simple
Grid backtracking explores paths through a grid of cells, stepping to neighbors and retreating when a path fails. It is like tracing a word in a letter puzzle with your finger: you mark the letters you have used so you don't reuse them, and lift the mark when you back up to try another route. Undoing the mark is what lets other paths use that cell later.

### interview
- DFS from each start cell; at each step check bounds, "already on the path", and whether the cell fits (the next letter).
- **Mark** the cell before recursing (a `visited` grid or overwrite it with a sentinel like `'#'`), and **unmark** after: the cell is only blocked for the current path.
- **Word search**: O(R · C · 3^L) for a word of length L (4 directions first, then 3 since you can't go back).
- Unlike flood fill, cells are unmarked on return, because different paths may pass through the same cell.
- Prune early: first-letter check, letter-count check against the grid, or search from the rarer end of the word.
- Multiple words: build a trie of words and DFS once (word search II).

### deep
#### Intuition

In a flood fill, once a cell is visited it stays visited: you only care which cells are reachable. In grid backtracking you care about **paths**, where each cell can appear at most once per path but different paths may share cells. So the visited mark belongs to the current path and must be removed when the path retreats.

#### Worked example: find "SEE"

```
A B C E
S F C S
A D E E
```

The S at (1,0) fails at once: none of its neighbors is an E. From the S at (1,3), the code tries down first: the E at (2,3) matches the second letter, and its left neighbor (2,2) is an E, so the word is found. Had that failed, the search would clear the mark on (2,3) and try the E above, at (0,3). As the recursion unwinds, the marks on (1,3) and (2,3) are cleared, so later searches can use those cells again.

#### Code

```cpp
bool dfs(vector<vector<char>>& g, const string& w, int i, int r, int c) {
    if (i == (int)w.size()) return true;                       // matched every letter
    if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size() || g[r][c] != w[i])
        return false;                                          // off grid, used, or wrong letter
    char saved = g[r][c];
    g[r][c] = '#';                                             // mark as on the current path
    bool found = dfs(g, w, i + 1, r + 1, c) || dfs(g, w, i + 1, r - 1, c) ||
                 dfs(g, w, i + 1, r, c + 1) || dfs(g, w, i + 1, r, c - 1);
    g[r][c] = saved;                                           // unmark on the way back
    return found;
}

bool exist(vector<vector<char>>& g, const string& w) {
    for (int r = 0; r < (int)g.size(); r++)
        for (int c = 0; c < (int)g[0].size(); c++)
            if (dfs(g, w, 0, r, c)) return true;
    return false;
}
```

The `||` and `any` short-circuit, so the search stops at the first success; the cell is still restored before returning.

#### Complexity

From each of $R \cdot C$ start cells, the path branches at most 4 ways at the first step and 3 afterwards: $O(R \cdot C \cdot 3^{L})$ time, $O(L)$ recursion depth. Pruning makes real inputs much faster.

#### Pruning ideas

- If the word has more of some letter than the grid, return false immediately.
- If the last letter is rarer in the grid than the first, search for the reversed word.
- In word search II, remove found words from the trie so their branches die.

#### Edge cases and bugs

- Returning before restoring the cell leaves the grid corrupted for later searches.
- Using a global visited set that is never cleared (that is flood fill, not backtracking).
- Single-cell grids and one-letter words.

#### Variants

- Longest path or number of paths visiting cells at most once (unique paths III: count paths covering every empty cell).
- Gold collection: maximize the sum along a path, restore cells on return.
- Word search II: trie plus DFS.
- Knight's tour, rat in a maze (all paths).

Connects to: grids as graphs (flood fill without unmarking), tries (word search II), DFS.

### questions
Q: Why must a grid backtracking search unmark cells when it returns?
A: The mark means "used by the current path". Another path, starting elsewhere or branching differently, may legitimately pass through the same cell. Leaving it marked would wrongly block those paths.

Q: How does word search differ from counting islands, which also uses DFS on a grid?
A: Counting islands asks about reachability, so a visited cell stays visited forever and each cell is processed once, O(R · C). Word search asks about simple paths spelling a word, so marks are undone on return and cells can be visited many times, which is exponential in the word length.

Q: What is the time complexity of word search?
A: O(R · C · 3^L) for a word of length L: every cell can start a path, and after the first step each cell has at most 3 unvisited neighbors to try. Recursion depth is O(L).

Q: How would you search for many words in the same grid efficiently?
A: Put all words in a trie and run one DFS from each cell that walks the trie alongside the grid, stopping when the prefix leaves the trie. Removing found words (or pruning empty trie nodes) avoids redundant searching.

### signals
- find a word or path by moving between adjacent cells, each cell used at most once per path
- count or list all paths through a grid under constraints
- "letters of sequentially adjacent cells"
- maximize a sum over a path that can't revisit cells

### template
```cpp
// Grid backtracking: mark on the way in, unmark on the way out.
int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};

bool explore(vector<vector<char>>& g, int r, int c, int depth, const string& goal) {
    if (depth == (int)goal.size()) return true;                  // complete path found
    if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size()) return false;
    if (g[r][c] != goal[depth]) return false;                    // blocked, used or wrong
    char keep = g[r][c];
    g[r][c] = '#';                                               // mark on the current path
    bool ok = false;
    for (int k = 0; k < 4 && !ok; k++) ok = explore(g, r + dr[k], c + dc[k], depth + 1, goal);
    g[r][c] = keep;                                              // undo before returning
    return ok;
}
```

## dsa.backtracking.constraint-satisfaction
name: "Constraint satisfaction"
importance: important
pattern: true
scope: "N-Queens, Sudoku, pruning with sets or bitmasks"

### simple
Constraint satisfaction problems ask you to fill slots so that every rule is respected, like placing queens on a chessboard so none attack each other, or filling a Sudoku. You fill one slot at a time and check the rules immediately, abandoning a partial answer the moment it breaks one. Fast checks with sets or bit masks make this practical.

### interview
- Fill one variable at a time (a row for N-Queens, an empty cell for Sudoku); try each value; **check constraints before recursing**; undo after.
- **N-Queens**: one queen per row; track used columns, diagonals (`r - c`) and anti-diagonals (`r + c`) in sets or boolean arrays for O(1) checks.
- **Bitmasks**: available columns = `~(cols | diag1 | diag2) & full`; pick the lowest bit with `x & -x`; shift diagonal masks each row. The fastest N-Queens counter.
- **Sudoku**: row, column and box masks of used digits; choose the empty cell with the **fewest options** first (most constrained variable) to prune hard.
- Worst case exponential (N-Queens is roughly O(N!)), but pruning makes typical inputs fast.

### deep
#### Intuition

Enumerating complete assignments and checking them at the end is hopeless ($N^N$ placements for N-Queens). Checking each partial assignment as it grows cuts off entire subtrees at the first violated rule. The two big levers are how quickly you can check a constraint (sets or bitmasks for O(1)) and which variable you fill next (the most constrained one).

#### Worked example: 4-Queens

Place one queen per row, trying columns left to right.

| row | try column | conflict? | result |
|---|---|---|---|
| 0 | 0 | no | queen at (0,0) |
| 1 | 0, 1 | column, diagonal | |
| 1 | 2 | no | queen at (1,2) |
| 2 | 0..3 | all attacked | backtrack row 1 |
| 1 | 3 | no | queen at (1,3) |
| 2 | 1 | no | queen at (2,1) |
| 3 | 0..3 | all attacked | backtrack to row 0 eventually |
| 0 | 1 | no | (0,1), then (1,3), (2,0), (3,2): solution |

The first solution is columns `1 3 0 2`; there are 2 solutions for N = 4 and 92 for N = 8.

#### Code

```cpp
// Count N-Queens solutions with bitmasks.
int countQueens(int n, int row = 0, int cols = 0, int d1 = 0, int d2 = 0) {
    if (row == n) return 1;
    int count = 0, full = (1 << n) - 1;
    int avail = full & ~(cols | d1 | d2);           // columns not attacked in this row
    while (avail) {
        int bit = avail & -avail;                   // lowest available column
        avail -= bit;
        count += countQueens(n, row + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);
    }
    return count;
}
```

In the bitmask version, shifting `d1` left and `d2` right moves each diagonal's attack one column over as you go down a row, and `full &` discards bits that fall off the board.

#### Sudoku with masks

Keep `rowMask[9]`, `colMask[9]`, `boxMask[9]` of used digits. The candidates of cell `(r, c)` are the digits not in `rowMask[r] | colMask[c] | boxMask[3*(r/3) + c/3]`. Picking the empty cell with the fewest candidates first (popcount of the free mask) usually solves hard puzzles with very little backtracking.

#### Complexity

N-Queens without pruning is $O(N^N)$; with one queen per row and column checks it is $O(N!)$; diagonal pruning cuts it further, though it stays exponential. Space $O(N)$.

#### Edge cases and bugs

- Forgetting to remove a value from all three sets when backtracking.
- Diagonal keys: `r - c` can be negative; offset by `n - 1` if you use arrays.
- In the bitmask version, forgetting `& full` lets shifted bits outside the board block nothing but inflate numbers; with `int` and large n, shifts can overflow.

#### Variants

- Word puzzles, graph coloring with k colors, scheduling with conflicts.
- Exact cover (Knuth's Algorithm X) solves Sudoku and pentomino tilings generally.
- For optimization rather than feasibility, add bounds (branch and bound).

Connects to: pruning strategies, bitmask enumeration, permutations, matrix traversal (diagonal keys).

### questions
Q: How do you check whether a queen can be placed at (r, c) in O(1)?
A: Keep sets (or boolean arrays) of used columns, used diagonals keyed by r − c, and used anti-diagonals keyed by r + c. A cell is safe when its column and both diagonal keys are unused. Placing one queen per row handles row conflicts.

Q: How do bitmasks speed up N-Queens?
A: Represent attacked columns, diagonals and anti-diagonals as bits of three integers. The free columns in a row are ~(cols | d1 | d2) & full, the lowest free column is x & −x, and moving to the next row shifts the diagonal masks by one. Each step is a few machine instructions.

Q: What is the "most constrained variable" heuristic, and why does it help Sudoku?
A: Fill next the empty cell with the fewest legal values. If a cell has zero options, the branch fails immediately; if it has one, there is no branching. This detects dead ends early and shrinks the search tree dramatically.

Q: What is the time complexity of N-Queens backtracking?
A: Exponential: at most N choices for the first row, fewer for the next, so bounded by O(N!), with diagonal checks pruning much more. Space is O(N) for the board and recursion.

### signals
- place items on a board so that no two conflict (queens, rooks, colors)
- fill a puzzle grid under row, column and box rules
- assign values to variables with pairwise constraints
- "find one valid configuration" or "count all valid configurations" with small n

### template
```cpp
// Constraint backtracking: fill slot i with each value that passes the fast checks.
bool solve(int i, int n, vector<int>& assign,
           function<bool(int, int)> ok, function<void(int, int, bool)> apply) {
    if (i == n) return true;                 // every slot filled consistently
    for (int v = 0; v < n; v++) {            // candidate values (order them if useful)
        if (!ok(i, v)) continue;             // O(1) check with sets or bitmasks
        apply(i, v, true);                   // record the constraint effects
        assign[i] = v;
        if (solve(i + 1, n, assign, ok, apply)) return true;   // stop at the first solution
        apply(i, v, false);                  // undo the effects
    }
    return false;                            // no value works: backtrack
}
```

## dsa.backtracking.partitioning-problems
name: "Partitioning problems"
importance: important
prereqs: [dsa.backtracking.combinations]
scope: "palindrome partitioning, restore IP addresses"

### simple
Partitioning problems cut a string into pieces where every piece must follow a rule, like slicing a loaf so each slice is a certain type. You choose where the first cut goes, check that the first piece is valid, and then solve the rest of the string the same way. Every valid set of cuts is one answer.

### interview
- Recursion on the **start index**: for each end `e`, if `s[start..e]` is valid, add it and recurse from `e + 1`; record when `start == n`.
- **Palindrome partitioning**: validity = palindrome; precompute an `isPal[i][j]` table in O(n²) to check in O(1). Up to 2ⁿ⁻¹ partitions, O(n · 2ⁿ) worst case.
- **Restore IP addresses**: exactly 4 parts, each 1 to 3 digits, value ≤ 255, no leading zeros (except "0" itself); prune when the remaining length can't fit the remaining parts (between 1 and 3 each).
- Word break (list all sentences): pieces must be dictionary words; memoize on the start index to avoid recomputation.
- When only a **count** or **minimum number of cuts** is needed, use DP instead of enumeration.

### questions
Q: What is the recursive structure of partitioning problems?
A: Choose the first piece s[start..end] for every valid end, and recursively partition the remainder starting at end + 1. When start reaches the end of the string, the pieces chosen so far form one complete answer.

Q: How do you make palindrome checks O(1) in palindrome partitioning?
A: Precompute isPal[i][j] with DP: s[i..j] is a palindrome if s[i] == s[j] and s[i+1..j−1] is a palindrome (or the length is at most 2). This costs O(n²) once, after which each check is a table lookup.

Q: What makes a part of an IP address valid?
A: It has one to three digits, its value is at most 255, and it has no leading zero unless it is exactly "0". A valid address has exactly four such parts and uses every digit.

Q: How do you prune the IP address search?
A: With k parts left and m digits left, continue only if k ≤ m ≤ 3k, since each part needs at least one and at most three digits. This removes most branches before trying them.

## dsa.backtracking.pruning-strategies
name: "Pruning strategies"
importance: important
scope: "bounds, choice ordering, early exit"

### simple
Pruning means cutting off branches of a search as soon as you can tell they won't lead anywhere useful. It is like a detective ruling out suspects early instead of following every lead to the end. Good pruning can turn a search that would take hours into one that takes milliseconds.

### interview
- **Feasibility pruning**: stop when a partial answer already breaks a rule (sum over target, queen attacked).
- **Bound pruning** (branch and bound): stop when even the best possible completion can't beat the best answer found so far.
- **Choice ordering**: try the most promising or most constrained choices first so good answers (and failures) are found early; sort candidates descending for bin packing.
- **Symmetry breaking**: avoid exploring mirrored or equivalent states (fix the first queen in the left half, identical buckets).
- **Early exit**: return as soon as one solution is found if only existence is asked.
- **Memoize failures**: remember states that are known to fail (a visited set of (index, state)).

### questions
Q: What is the difference between feasibility pruning and bound pruning?
A: Feasibility pruning cuts a branch that already violates a constraint, so it can't produce any valid answer. Bound pruning, used for optimization, cuts a valid branch whose optimistic best outcome is still no better than the best answer already found.

Q: Why does choice ordering matter in backtracking?
A: Trying promising choices first finds a good or valid answer early, which makes bound pruning stronger and lets existence searches stop sooner. Trying the most constrained variable first exposes failures near the root, where cutting saves the most work.

Q: How would you prune "partition an array into k subsets with equal sum"?
A: Check that the total is divisible by k and no element exceeds the target, sort descending so large elements fail early, skip a bucket whose current sum equals one already tried (symmetric states), and stop filling a bucket once it exceeds the target.

Q: How can memoization act as pruning in backtracking?
A: If the future depends only on a compact state, such as the index plus a bitmask of used items, record states that are known to fail. Reaching the same state again returns immediately instead of re-exploring it.
