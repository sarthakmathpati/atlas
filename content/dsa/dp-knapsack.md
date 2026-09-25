---
topic: dsa.dp-knapsack
name: "Dynamic programming: knapsack family"
subject: dsa
order: 29
prereqs: [dsa.dp-foundations]
---

## dsa.dp-knapsack.0-1-knapsack
name: "0/1 knapsack"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "include or exclude, 1D optimization with a reverse loop"

### simple
The 0/1 knapsack problem picks items with weights and values to fit in a bag of limited capacity, maximizing total value, and each item can be taken at most once. For each item and each capacity you decide: leave it out, or take it and use the best answer for the remaining capacity. A table of "best value for this many items and this much room" answers everything.

### interview
- State `dp[i][c]` = best value using the first i items with capacity c. Transition: `max(dp[i-1][c], dp[i-1][c - w_i] + v_i)` (if `w_i <= c`).
- **O(n · W)** time; **O(W)** space with one array, looping capacity **from high to low** so each item is used once.
- Pseudo-polynomial: fine for W up to about 10⁵ to 10⁶; hopeless for W = 10⁹ (then swap roles: dp over value → minimum weight, or meet in the middle).
- Greedy by value/weight ratio is **wrong** for 0/1 (right only for fractional knapsack).
- Many problems are knapsack in disguise: subset sum, partition, target sum, ones and zeroes, last stone weight II.
- Answer is `dp[W]` (capacity at most W) with initialization 0; for "exactly W" initialize unreachable capacities to −∞.

### deep
#### Intuition

Consider items one at a time. For the current item, either it isn't in the optimal bag (so the answer is the best without it), or it is (so the rest of the bag is the best selection of earlier items in the remaining capacity). Both options refer to the problem with one fewer item, which is why a table over (items considered, capacity) works.

#### Worked example

Capacity 5; items (weight, value): A (1, 1), B (3, 4), C (4, 5).

| capacity → | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| no items | 0 | 0 | 0 | 0 | 0 | 0 |
| + A (1, 1) | 0 | 1 | 1 | 1 | 1 | 1 |
| + B (3, 4) | 0 | 1 | 1 | 4 | 5 | 5 |
| + C (4, 5) | 0 | 1 | 1 | 4 | 5 | 6 |

At capacity 5 with C: max(skip C: 5, take C: dp[1] + 5 = 1 + 5 = 6) = **6** (items A and C).

#### Code

```cpp
int knapsack01(const vector<int>& w, const vector<int>& v, int W) {
    vector<int> dp(W + 1, 0);                        // dp[c]: best value within capacity c
    for (int i = 0; i < (int)w.size(); i++)
        for (int c = W; c >= w[i]; c--)              // downward: dp[c - w] is from before item i
            dp[c] = max(dp[c], dp[c - w[i]] + v[i]);
    return dp[W];
}
```

#### Why the loop goes downward

With one array, `dp[c - w]` must still hold the value **before** considering the current item. Looping capacities downward updates larger capacities first, so the smaller `dp[c - w]` hasn't changed yet. Looping upward would let `dp[c - w]` already include the current item, which is exactly the unbounded knapsack (items reusable).

#### Complexity

$O(n \cdot W)$ time, $O(W)$ space (or $O(n \cdot W)$ to reconstruct the chosen items). This is pseudo-polynomial: polynomial in the numeric value $W$, exponential in the number of bits needed to write $W$; 0/1 knapsack is NP-hard in general.

#### Edge cases and bugs

- Upward loop in the 1D version: silently turns it into unbounded knapsack.
- "At most W" (initialize with 0) versus "exactly W" (initialize `dp[0] = 0`, others −∞).
- Huge W with few items: switch the DP to be over total value, or enumerate subsets (meet in the middle for n ≤ 40).

#### Variants

- Subset sum, partition equal subset sum, target sum (count assignments of + and −).
- Last stone weight II: split into two groups with the closest sums (subset sum up to total / 2).
- Ones and zeroes: two capacities (zeros and ones), 2D knapsack.
- Knapsack with item counts (bounded): binary splitting of counts into 0/1 items.

Connects to: subset sum and partition, unbounded knapsack, space optimization, greedy fundamentals (fractional knapsack).

### questions
Q: What is the recurrence for 0/1 knapsack?
A: dp[i][c] = max(dp[i − 1][c], dp[i − 1][c − w_i] + v_i), the better of skipping item i or taking it and filling the remaining capacity optimally with earlier items. The answer is dp[n][W], computed in O(n · W).

Q: Why does the one-dimensional version loop over capacity in decreasing order?
A: Each dp[c] update must use dp[c − w] from before the current item was considered. Iterating downward reads smaller capacities before they're updated in this round, so each item is used at most once. Iterating upward would allow reusing the item.

Q: Is 0/1 knapsack polynomial?
A: No. O(n · W) is pseudo-polynomial: it depends on the numeric capacity W, which can be exponential in the input size (the number of digits of W). The problem is NP-hard in general, but the DP is fast when W is modest.

Q: Why doesn't the greedy value-per-weight strategy work for 0/1 knapsack?
A: Items can't be split, so taking the best-ratio item can waste capacity. With capacity 50 and items (10, 60), (20, 100), (30, 120), greedy by ratio takes the first two for 160, but the second and third give 220.

Q: How do you find which items were chosen?
A: Keep the full 2D table. Starting at (n, W), if dp[i][c] differs from dp[i − 1][c], item i was taken, so record it and subtract its weight; either way move to row i − 1.

### signals
- choose a subset of items under a capacity or budget to maximize value
- each item can be used at most once
- "can a subset reach exactly this sum", "split into two groups"
- a small numeric capacity (up to about 10^5) and a few hundred items

### template
```cpp
// 0/1 knapsack skeleton: items once each, capacities downward.
template <class Combine>
vector<long long> knapsack(const vector<int>& weight, const vector<long long>& value, int W,
                           long long init, Combine combine) {
    vector<long long> dp(W + 1, init);       // init: 0 for "at most W", -INF for "exactly W"
    dp[0] = 0;
    for (size_t i = 0; i < weight.size(); i++)
        for (int c = W; c >= weight[i]; c--)  // downward = each item at most once
            dp[c] = combine(dp[c], dp[c - weight[i]] + value[i]);
    return dp;
}
// max value: knapsack(w, v, W, 0, [](long long a, long long b) { return max(a, b); })
```

## dsa.dp-knapsack.subset-sum-and-partition
name: "Subset sum and partition"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-knapsack.0-1-knapsack]
scope: "partition equal subset sum, target sum"

### simple
Subset sum asks whether some of the numbers can add up to exactly a target, like checking whether you can pay an exact amount with the coins in your pocket. You track every total you can make, adding one number at a time. Splitting numbers into two groups with equal sums is the same question with the target set to half the total.

### interview
- `can[s]` = some subset of the items seen so far sums to s. For each x, for s from T down to x: `can[s] |= can[s - x]`. **O(n · T)**.
- **Partition equal subset sum**: total must be even; target = total / 2.
- **Target sum** (assign + or − to each number to reach S): the plus group P satisfies `P = (total + S) / 2`; count subsets with that sum (requires total + S even and non-negative, |S| ≤ total).
- Counting version: `ways[s] += ways[s - x]`, with `ways[0] = 1`. Zeros double the count (both signs), which the recurrence handles.
- **Bitset** speed-up in C++: `bits |= bits << x` does a whole row in O(T / 64).
- Last stone weight II: the largest achievable sum ≤ total / 2.

### deep
#### Intuition

Subset sum is 0/1 knapsack where every item's value equals its weight and the question is feasibility. The set of reachable sums grows as you add numbers: each new number x adds x to every sum already reachable. Tracking reachable sums in a boolean array (or bitset) makes this linear per number.

#### Worked example: partition [1, 5, 11, 5]

Total 22, target 11.

| after | reachable sums up to 11 |
|---|---|
| start | 0 |
| 1 | 0, 1 |
| 5 | 0, 1, 5, 6 |
| 11 | 0, 1, 5, 6, 11 |
| 5 | 0, 1, 5, 6, 10, 11 |

11 is reachable ({11} or {1, 5, 5}), so the array can be split into two equal halves.

#### Code

```cpp
bool canPartition(const vector<int>& nums) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % 2) return false;
    int T = total / 2;
    vector<bool> can(T + 1, false);
    can[0] = true;
    for (int x : nums)
        for (int s = T; s >= x; s--)                  // downward: each number once
            if (can[s - x]) can[s] = true;
    return can[T];
}

// Bitset version: each number shifts the whole reachable set at once.
bool canPartitionBitset(const vector<int>& nums) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % 2) return false;
    bitset<20001> reach;                               // sums up to 20000 (problem bound)
    reach[0] = 1;
    for (int x : nums) reach |= reach << x;
    return reach[total / 2];
}
```

#### Why target sum reduces to subset sum

Split the numbers into P (given +) and N (given −). Then P − N = S and P + N = total, so P = (total + S) / 2. Counting sign assignments equals counting subsets with sum P. If total + S is odd or negative, the answer is 0.

#### Complexity

$O(n \cdot T)$ time, $O(T)$ space; the bitset version runs in $O(n \cdot T / 64)$.

#### Edge cases and bugs

- Odd total: partition is impossible.
- Target sum with |S| > total: 0 ways (and an index error if you don't check).
- Zeros in target sum: each zero doubles the count; the counting recurrence with the inner loop down to x = 0 (`range(goal, -1, -1)`) handles it; don't skip zeros.
- Upward loops reuse numbers.

#### Variants

- Partition into k equal-sum subsets (bitmask DP or backtracking).
- Minimum subset sum difference (last stone weight II).
- Count subsets with sum at most k, number of subsets with a given XOR (bitwise DP).
- Split an array into two parts with equal averages (DP over (count, sum)).

Connects to: 0/1 knapsack, combinations vs permutations counting, bitmask enumeration, meet in the middle.

### questions
Q: How do you check whether an array can be split into two subsets with equal sums?
A: If the total is odd, it can't. Otherwise, check whether some subset sums to total / 2 with subset-sum DP: a boolean array of reachable sums, updated for each number from high sums to low. It runs in O(n · total).

Q: How does "target sum" (assigning + or − to every number) become subset sum?
A: If P is the sum of the numbers given + and N the rest, then P − N = target and P + N = total, so P = (total + target) / 2. The number of sign assignments equals the number of subsets summing to P, which a counting subset-sum DP computes.

Q: Why must the inner loop go from high sums to low?
A: can[s − x] must reflect subsets that don't include the current number yet. Going downward updates larger sums first, so the smaller sums read are still from before this number, and each number is used at most once.

Q: How does a bitset speed up subset sum?
A: Represent reachable sums as bits and update with reach |= reach << x, which processes 64 sums per machine word. The complexity drops to O(n · T / 64), a big constant-factor gain.

Q: How do you minimize the difference between two groups' sums?
A: Compute all reachable subset sums up to total / 2 and take the largest one, s. The best difference is total − 2s, since the other group then sums to total − s.

### signals
- can some subset of the numbers sum to exactly a target
- split numbers into two groups with equal (or closest) sums
- assign + or − to each number to reach a target
- small total sum (up to about 10^4 or 10^5) with up to a few hundred numbers

### template
```cpp
// Subset-sum DP over reachable sums (counting version; use OR for feasibility).
long long countSubsetsWithSum(const vector<int>& nums, int target) {
    vector<long long> ways(target + 1, 0);
    ways[0] = 1;                                      // the empty subset
    for (int x : nums)
        for (int s = target; s >= x; s--)             // downward: each number used once
            ways[s] += ways[s - x];
    return ways[target];
}
```

## dsa.dp-knapsack.unbounded-knapsack
name: "Unbounded knapsack"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-knapsack.subset-sum-and-partition]
scope: "coin change for minimum coins, forward loop"

### simple
In the unbounded knapsack you may take each kind of item as many times as you like, like buying as many copies of a product as fit in your budget. Making change with the fewest coins is the classic example: for each amount, try ending with each coin and use the best answer for the amount left over. Filling amounts from small to large lets a coin be reused naturally.

### interview
- State `dp[c]` over capacity (amount); transition over item types: `dp[c] = best(dp[c], dp[c - w] ⊕ v)`.
- One array, capacity loop **upward** (from w to W): `dp[c - w]` may already include this item, which is exactly what reuse means.
- **Coin change (minimum coins)**: `dp[a] = min(dp[a], dp[a - coin] + 1)`, `dp[0] = 0`, others ∞; return −1 if still ∞. **O(amount · coins)**.
- **Rod cutting** (maximize price): `dp[L] = max(dp[L - len] + price[len])`.
- Counting ways (coin change II) is also unbounded, but loop order decides combinations vs permutations.
- Greedy coin change only works for canonical coin systems.

### deep
#### Intuition

With unlimited copies, the last item added to an optimal bag of capacity $c$ could be any item type $i$ with $w_i \le c$, and the rest is an optimal bag of capacity $c - w_i$, which may itself contain more copies of item $i$. So each capacity depends on smaller capacities of the same "all items allowed" problem. Filling capacities upward in one array expresses exactly that.

#### Worked example: coin change, coins [1, 2, 5], amount 11

| a | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dp | 0 | 1 | 1 | 2 | 2 | 1 | 2 | 2 | 3 | 3 | 2 | 3 |

`dp[11] = min(dp[10] + 1, dp[9] + 1, dp[6] + 1) = min(3, 4, 3) = 3` (5 + 5 + 1).

#### Code

```cpp
int coinChange(const vector<int>& coins, int amount) {
    const int INF = INT_MAX / 2;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)          // upward: this coin can be reused
            dp[a] = min(dp[a], dp[a - coin] + 1);
    return dp[amount] >= INF ? -1 : dp[amount];
}

int rodCutting(const vector<int>& price, int n) {     // price[len - 1] for a piece of length len
    vector<int> dp(n + 1, 0);
    for (int L = 1; L <= n; L++)
        for (int len = 1; len <= L && len <= (int)price.size(); len++)
            dp[L] = max(dp[L], dp[L - len] + price[len - 1]);
    return dp[n];
}
```

For minimum coins (and maximum value), the loop order (coins outside or amounts outside) doesn't matter; for **counting** it does (next concept).

#### Complexity

$O(W \cdot k)$ for $k$ item types, $O(W)$ space.

#### Edge cases and bugs

- `INT_MAX + 1` overflow when extending an unreachable state; use `INT_MAX / 2` or check first.
- Amount 0: zero coins, not −1.
- Coins larger than the amount: skipped by the loop bounds.
- Using the 0/1 downward loop by mistake: each coin used at most once.

#### Variants

- Coin change II (count combinations), combination sum IV (count ordered sequences).
- Perfect squares (items are squares), minimum cost for tickets (a variant with durations), integer break.
- Bounded knapsack (each item up to k copies): binary splitting into 0/1 items or a monotonic queue.

Connects to: 0/1 knapsack, combinations vs permutations counting, DP on numbers, greedy fundamentals.

### questions
Q: How do you find the minimum number of coins to make an amount, with unlimited coins?
A: dp[a] = min over coins c ≤ a of dp[a − c] + 1, with dp[0] = 0 and everything else infinity. Fill amounts from 0 upward; if dp[amount] is still infinity, the amount can't be made. It's O(amount · coins).

Q: What is the difference between the loops for 0/1 and unbounded knapsack?
A: With one array, 0/1 knapsack loops capacity downward so dp[c − w] excludes the current item, while unbounded knapsack loops upward so dp[c − w] may already include it, allowing repeats.

Q: Why does the greedy "largest coin first" fail for coin change in general?
A: With coins {1, 3, 4} and amount 6, greedy takes 4 + 1 + 1, three coins, while 3 + 3 needs two. Greedy only works for special (canonical) coin systems like common currencies.

Q: How do you solve rod cutting?
A: For each length L, try every first piece length len ≤ L, and take the best price[len] + dp[L − len], with dp[0] = 0. Pieces can repeat, so it's unbounded knapsack over lengths, O(n²).

### signals
- unlimited copies of each item, coin or piece
- fewest coins or items to make an exact amount
- cut something into pieces of given sizes to maximize value
- "you may use each element any number of times"

### template
```cpp
// Unbounded knapsack: capacities upward so an item can be taken again.
vector<long long> unbounded(const vector<int>& weight, const vector<long long>& value, int W) {
    vector<long long> dp(W + 1, LLONG_MIN / 2);       // -INF: capacity not reachable exactly
    dp[0] = 0;
    for (size_t i = 0; i < weight.size(); i++)
        for (int c = weight[i]; c <= W; c++)          // upward = reuse allowed
            dp[c] = max(dp[c], dp[c - weight[i]] + value[i]);
    return dp;                                        // for "at most W" initialize with 0
}
```

## dsa.dp-knapsack.combinations-vs-permutations-counting
name: "Combinations vs permutations counting"
importance: must
prereqs: [dsa.dp-knapsack.unbounded-knapsack]
scope: "coin change II vs combination sum IV loop order"

### simple
When counting ways to reach an amount, it matters whether 1 + 2 and 2 + 1 count as the same way or as two different ways. If the outer loop goes over the coins, each combination is built in one fixed coin order, so it is counted once. If the outer loop goes over the amounts, every ordering is built separately, so different orders are counted as different ways.

### interview
- **Combinations** (order doesn't matter, coin change II): `for coin in coins: for a = coin..amount: ways[a] += ways[a - coin]`.
- **Permutations / ordered sequences** (combination sum IV, climbing stairs with steps): `for a = 1..amount: for coin in coins: ways[a] += ways[a - coin]`.
- Base `ways[0] = 1` in both.
- Why: with coins outside, when coin k is processed, only coins ≤ k have been used, so every combination is generated in non-decreasing coin order exactly once.
- Example, coins {1, 2}, amount 3: combinations 2 ({1,1,1}, {1,2}); permutations 3 (1+1+1, 1+2, 2+1).
- Same idea in 0/1 settings: counting subsets (combinations) uses items outside.

### deep
#### Intuition

A combination is a multiset of coins; to count each multiset once, fix a canonical order in which it's built, such as "all 1s, then all 2s, then all 5s". Putting the coin loop outside does exactly that: when processing coin k, the table only contains ways using coins before k, and adding coin k on top extends them in that fixed order. With the amount loop outside, every amount can end with any coin, so every order of the same coins is a different path to the total.

#### Worked example: coins {1, 2}, amount 4

Coins outside (combinations):

| after coin | ways[0..4] |
|---|---|
| start | 1 0 0 0 0 |
| 1 | 1 1 1 1 1 |
| 2 | 1 1 2 2 3 |

`ways[4] = 3`: {1,1,1,1}, {1,1,2}, {2,2}.

Amounts outside (ordered):

| a | ways[a] = ways[a-1] + ways[a-2] |
|---|---|
| 0 | 1 |
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 5 |

`ways[4] = 5`: 1111, 112, 121, 211, 22.

#### Code

```cpp
long long countCombinations(const vector<int>& coins, int amount) {
    vector<long long> ways(amount + 1, 0);
    ways[0] = 1;
    for (int c : coins)                      // coins outside: each multiset counted once
        for (int a = c; a <= amount; a++)
            ways[a] += ways[a - c];
    return ways[amount];
}

long long countOrdered(const vector<int>& nums, int target) {
    vector<unsigned long long> ways(target + 1, 0);   // unsigned: the problem only guarantees
    ways[0] = 1;                                       // the final answer fits
    for (int a = 1; a <= target; a++)        // amounts outside: every order counted
        for (int x : nums)
            if (x <= a) ways[a] += ways[a - x];
    return (long long)ways[target];
}
```

#### Complexity

Both $O(\text{amount} \cdot k)$ time and $O(\text{amount})$ space; only the loop order differs.

#### Edge cases and bugs

- Swapping the loops by accident gives the other count, silently.
- Ordered counts grow fast; use a modulus or unsigned arithmetic as the problem specifies.
- `ways[0] = 1` (one way to make zero: choose nothing).

#### Variants

- Number of dice rolls with a target sum (ordered: the dice are distinct positions, dp over dice count).
- Count partitions of n (combinations with coins 1..n).
- Count compositions of n with parts in a set (ordered).

Connects to: unbounded knapsack, counting DP and modulo, linear DP (climbing stairs is the ordered case).

### questions
Q: Why does putting the coin loop outside count combinations rather than permutations?
A: With coins in the outer loop, each coin is added only on top of ways that use earlier coins, so every multiset of coins is built in one fixed order, all copies of the first coin, then the second, and so on. Each combination is therefore counted exactly once.

Q: How do you count ordered sequences that sum to a target instead?
A: Put the amount loop outside and the coin loop inside: ways[a] = sum of ways[a − c] over all coins c. Every amount can end with any coin, so different orders produce different sequences, each counted separately.

Q: With coins {1, 2} and amount 3, what do the two versions return?
A: Combinations: 2 ({1, 1, 1} and {1, 2}). Ordered sequences: 3 (1+1+1, 1+2, 2+1).

Q: Why is ways[0] = 1 in both versions?
A: There is exactly one way to make amount zero: choose nothing. Every counted way to make a positive amount extends that empty choice, so the base must be 1 rather than 0.

## dsa.dp-knapsack.multi-dimensional-knapsack
name: "Multi-dimensional knapsack"
importance: important
prereqs: [dsa.dp-knapsack.0-1-knapsack]
scope: "ones and zeroes"

### simple
Sometimes each item uses up two kinds of resource, like a trip that costs both money and vacation days. The knapsack table then has one dimension per resource, and each item is tested against both budgets at once. Everything else works exactly like the ordinary knapsack.

### interview
- State `dp[a][b]` = best with at most a units of resource 1 and b of resource 2. For each item (costs x, y): for a from A down to x, for b from B down to y: `dp[a][b] = max(dp[a][b], dp[a-x][b-y] + value)`.
- **Ones and zeroes**: strings are items, costs are their counts of 0s and 1s, value 1 each; maximize the number of strings with at most m zeros and n ones. **O(L · m · n)**.
- Both capacity loops go **downward** for 0/1 items.
- A third dimension is usually "count of items chosen" (choose exactly k items).
- Memory grows with each dimension; check the product of capacities against the limits.

### questions
Q: How do you solve "ones and zeroes", choosing the most strings with at most m zeros and n ones?
A: Treat each string as an item costing its number of zeros and ones, with value 1. Use a 2D knapsack dp[i][j] = most strings with at most i zeros and j ones, and for each string update i and j downward: dp[i][j] = max(dp[i][j], dp[i − zeros][j − ones] + 1).

Q: Why do both capacity loops run downward?
A: For 0/1 items, each update must read the table as it was before this item was considered. Iterating both dimensions from high to low guarantees dp[i − zeros][j − ones] hasn't been updated for the current item yet.

Q: What is the complexity of a two-constraint knapsack?
A: O(number of items · capacity1 · capacity2) time and O(capacity1 · capacity2) space with the rolling technique. It's practical when the product of the capacities is up to about 10^5 to 10^6.

Q: How do you handle "choose exactly k items" in a knapsack?
A: Add the number of items chosen as another dimension: dp[count][capacity]. Process count downward along with capacity for 0/1 items, and read the answer at count = k.
