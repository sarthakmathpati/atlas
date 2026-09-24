---
topic: dsa.dp-subsequences
name: "Dynamic programming: subsequences and stocks"
subject: dsa
order: 30
prereqs: [dsa.dp-foundations, dsa.binary-search]
---

## dsa.dp-subsequences.longest-increasing-subsequence
name: "Longest increasing subsequence"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "O(n^2) DP and O(n log n) with patience sorting"

### simple
The longest increasing subsequence is the longest list of numbers you can pick from a sequence, keeping their order, where each is bigger than the one before. For each number you ask: what is the longest rising chain that ends here? A faster method deals the numbers into piles like a card game of patience, and the number of piles is the answer.

### interview
- **O(n²) DP**: `dp[i]` = length of the longest increasing subsequence **ending at i** = 1 + max `dp[j]` over j < i with `a[j] < a[i]`; answer = max over i.
- **O(n log n)**: keep `tails[k]` = the smallest possible last value of an increasing subsequence of length k + 1. For each x, replace the first tail ≥ x (`lower_bound`) or append. Answer = `tails.size()`.
- `tails` is sorted but is **not** itself a valid subsequence; to rebuild the actual LIS, store for each element the index it extends (parent pointers).
- Non-decreasing (allow equal): use `upper_bound` instead.
- Subsequence (any positions, order kept) versus subarray (contiguous): LIS is about subsequences.
- Variants: number of LIS, Russian doll envelopes, longest chain, minimum deletions to make an array sorted (n − LIS).

### deep
#### Intuition

For the quadratic DP, an increasing subsequence ending at i extends one ending at some earlier, smaller element. For the fast method: among all increasing subsequences of the same length, the one with the smallest last element is the most useful, because it's easiest to extend. `tails` stores exactly those best last elements for each length, and it's always sorted, so binary search finds where each new element fits.

#### Worked example: `10 9 2 5 3 7 101 18`

Quadratic DP:

| i | a[i] | dp[i] |
|---|---|---|
| 0 | 10 | 1 |
| 1 | 9 | 1 |
| 2 | 2 | 1 |
| 3 | 5 | 2 (2, 5) |
| 4 | 3 | 2 (2, 3) |
| 5 | 7 | 3 (2, 5, 7) |
| 6 | 101 | 4 (2, 5, 7, 101) |
| 7 | 18 | 4 (2, 5, 7, 18) |

Patience method:

| x | tails after |
|---|---|
| 10 | 10 |
| 9 | 9 |
| 2 | 2 |
| 5 | 2 5 |
| 3 | 2 3 |
| 7 | 2 3 7 |
| 101 | 2 3 7 101 |
| 18 | 2 3 7 18 |

Length 4. Note `2 3 7 18` happens to be valid here, but in general `tails` mixes elements from different subsequences.

#### Code

```cpp
int lengthOfLIS(const vector<int>& a) {
    vector<int> tails;                               // tails[k]: smallest end of a length-(k+1) LIS
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);   // strict: first tail >= x
        if (it == tails.end()) tails.push_back(x);
        else *it = x;                                // a better (smaller) end for that length
    }
    return tails.size();
}

vector<int> oneLIS(const vector<int>& a) {           // O(n log n) with reconstruction
    vector<int> tailIdx, parent(a.size(), -1);
    for (int i = 0; i < (int)a.size(); i++) {
        int k = lower_bound(tailIdx.begin(), tailIdx.end(), i,
                            [&](int j, int idx) { return a[j] < a[idx]; }) - tailIdx.begin();
        if (k > 0) parent[i] = tailIdx[k - 1];       // extends the best subsequence of length k
        if (k == (int)tailIdx.size()) tailIdx.push_back(i);
        else tailIdx[k] = i;
    }
    vector<int> seq;
    for (int i = tailIdx.empty() ? -1 : tailIdx.back(); i != -1; i = parent[i]) seq.push_back(a[i]);
    reverse(seq.begin(), seq.end());
    return seq;
}
```

```python
from bisect import bisect_left

def lis_quadratic(a):
    dp = [1] * len(a)
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp, default=0)

def lis_fast(a):
    tails = []
    for x in a:
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)
```

#### Complexity

Quadratic DP: $O(n^2)$ time, $O(n)$ space. Patience sorting: $O(n \log n)$ time, $O(n)$ space. With $n = 10^5$, only the second is fast enough.

#### Edge cases and bugs

- Strictly increasing versus non-decreasing: `lower_bound` versus `upper_bound`.
- Returning `tails` as the subsequence (wrong in general).
- Empty input: 0.

#### Variants

- Longest decreasing subsequence (negate values), longest bitonic subsequence (LIS from the left + LDS from the right − 1).
- Minimum number of increasing subsequences to cover the array (Dilworth: equals the longest non-increasing subsequence).
- Russian doll envelopes (sort by width ascending, height descending, then LIS on heights).
- Number of LIS (keep counts with the quadratic DP).
- Longest increasing path in a matrix (DAG DP on the grid).

Connects to: designing DP states, binary search (lower bound), LIS variants, patience sorting.

### questions
Q: What is the O(n²) DP for longest increasing subsequence?
A: Let dp[i] be the length of the longest increasing subsequence ending at index i. It equals 1 plus the maximum dp[j] over earlier indices j with a[j] < a[i] (or 1 if there are none). The answer is the maximum dp[i] over all i.

Q: How does the O(n log n) algorithm work?
A: Maintain tails, where tails[k] is the smallest possible last element of an increasing subsequence of length k + 1. For each element, binary search for the first tail at least as large and replace it, or append if none is. The length of tails is the LIS length.

Q: Why is the tails array sorted, and why is it safe to overwrite an entry?
A: A longer increasing subsequence must end with a larger value than the best end of a shorter one, so tails is increasing. Replacing tails[k] with a smaller value keeps a length-(k + 1) subsequence available with an easier-to-extend end, which never hurts future extensions.

Q: Is the final tails array a valid longest increasing subsequence?
A: Not necessarily. Its entries can come from different subsequences, for example tails can end up as values whose positions aren't in increasing order. To recover an actual LIS, store for each element the index of the element it extended, then follow those links back.

Q: How do you handle a non-decreasing subsequence (equal values allowed)?
A: Use upper_bound (first element strictly greater) instead of lower_bound when placing each value, so equal values can extend a subsequence rather than replace its end.

### signals
- the longest subsequence (not contiguous) that strictly increases
- the minimum number of elements to remove so the rest is sorted
- nesting items (envelopes, boxes) by two dimensions
- chains where each element must beat the previous one

### template
```cpp
// Patience-sorting LIS: O(n log n). Use upper_bound for non-decreasing sequences.
int lisLength(const vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);   // first tail >= x
        if (it == tails.end()) tails.push_back(x);              // extends the longest
        else *it = x;                                           // improves a tail
    }
    return tails.size();
}
```

## dsa.dp-subsequences.lis-variants
name: "LIS variants"
importance: important
prereqs: [dsa.dp-subsequences.longest-increasing-subsequence]
scope: "number of LIS, largest divisible subset, longest string chain, Russian doll envelopes"

### simple
Many problems are the longest increasing subsequence in disguise, with "increasing" replaced by another rule. A chain of words where each adds one letter, a set of numbers where each divides the next, or envelopes that fit inside each other all ask for the longest chain under some "fits after" rule. Sorting first and then running the LIS idea solves them.

### interview
- **Number of LIS**: alongside `len[i]`, keep `cnt[i]` = number of LIS ending at i; when `len[j] + 1 > len[i]`, copy the count; when equal, add it. Sum counts with the maximum length. O(n²).
- **Largest divisible subset**: sort; `dp[i]` = longest chain ending at i where each divides the next (`a[i] % a[j] == 0`); keep parents to output it. O(n²).
- **Longest string chain**: sort words by length; `dp[w] = 1 + max dp[w with one letter removed]` using a hash map: O(n · L²).
- **Russian doll envelopes**: sort by width ascending and, for equal widths, height **descending**; then LIS (strict) on heights: O(n log n). The descending tie-break stops two envelopes with the same width from nesting.
- **Maximum height by stacking cuboids** / boxes: sort dimensions, then weighted LIS.

### questions
Q: How do you count the number of longest increasing subsequences?
A: Keep two arrays: len[i], the LIS length ending at i, and cnt[i], how many such subsequences end at i. For each j < i with a[j] < a[i], if len[j] + 1 is greater than len[i], set len[i] = len[j] + 1 and cnt[i] = cnt[j]; if it's equal, add cnt[j] to cnt[i]. Sum cnt over indices with the maximum length.

Q: Why sort envelopes by width ascending and height descending?
A: After sorting by width, a strictly increasing subsequence of heights gives nested envelopes. Sorting equal widths by height descending ensures two envelopes of the same width can't both appear in an increasing run of heights, since they can't nest.

Q: How do you find the largest subset where every pair divides one another?
A: Sort the numbers. In a sorted chain where each element divides the next, every pair divides one another, so it's an LIS where "increasing" means "a[j] divides a[i]". Run the O(n²) DP with parent pointers and rebuild the chain.

Q: How do you find the longest chain of words where each adds exactly one letter?
A: Sort words by length. For each word, try deleting each letter; if the shorter word exists in a map of computed chain lengths, the chain ending at this word can be one longer. The answer is the maximum, in O(n · L²) for n words of length up to L.

## dsa.dp-subsequences.stock-trading-state-machine
name: "Stock trading state machine"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "buy and sell I to IV, cooldown, transaction fee"

### simple
Stock trading problems ask for the best profit from buying and selling a stock over several days under some rules. Each day you're in one of a few situations, such as holding a share or not, and you track the best profit for each situation. Moving from one day to the next is like following arrows between those situations: buy, sell, or wait.

### interview
- States per day: `hold` (own a share) and `free` (don't). Transitions: `hold = max(hold, free - price)`, `free = max(free, hold + price)`.
- **I** (one transaction): track the minimum price so far; profit = max(price − minPrice). O(n).
- **II** (unlimited transactions): sum of all positive day-to-day increases, or the state machine above.
- **III** (at most 2) and **IV** (at most k): states `buy[j]`, `sell[j]` for the j-th transaction: O(n · k). If k ≥ n/2, it's the unlimited case.
- **Cooldown**: add a `cooldown` state (just sold; can't buy tomorrow). **Fee**: subtract the fee on each sale.
- Update order within a day matters; compute from the previous day's values (or order the updates so it's equivalent).

### deep
#### Intuition

What matters for the future on any day is not the full trading history but a small state: whether you hold a share, how many transactions you have used, and whether you are in a cooldown. Each state has a best profit so far, and each day's price moves profit between states through buy, sell and rest actions. The answer is the best "not holding" state at the end.

#### Worked example: unlimited transactions with cooldown

Prices `1 2 3 0 2`. States: `hold`, `sold` (sold today, cooldown tomorrow), `rest` (not holding, free to buy).

| day | price | hold = max(hold, rest − p) | sold = hold + p | rest = max(rest, sold) |
|---|---|---|---|---|
| 0 | 1 | −1 | −∞ | 0 |
| 1 | 2 | max(−1, 0 − 2) = −1 | −1 + 2 = 1 | max(0, −∞) = 0 |
| 2 | 3 | max(−1, 0 − 3) = −1 | −1 + 3 = 2 | max(0, 1) = 1 |
| 3 | 0 | max(−1, 1 − 0) = 1 | −1 + 0 = −1 | max(1, 2) = 2 |
| 4 | 2 | max(1, 2 − 2) = 1 | 1 + 2 = 3 | max(2, −1) = 2 |

Answer: max(sold, rest) = **3** (buy 1, sell 2, cool down, buy 0, sell 2). All updates on a day use the previous day's values.

#### Code

```cpp
int maxProfitCooldown(const vector<int>& prices) {
    long long hold = LLONG_MIN / 2, sold = LLONG_MIN / 2, rest = 0;
    for (int p : prices) {
        long long newHold = max(hold, rest - p);    // keep holding, or buy (only from rest)
        long long newSold = hold + p;               // sell today
        long long newRest = max(rest, sold);        // keep resting, or finish a cooldown
        hold = newHold, sold = newSold, rest = newRest;
    }
    return (int)max(sold, rest);
}

int maxProfitK(int k, const vector<int>& prices) {
    int n = prices.size();
    if (k >= n / 2) {                               // effectively unlimited transactions
        int total = 0;
        for (int i = 1; i < n; i++) total += max(0, prices[i] - prices[i - 1]);
        return total;
    }
    vector<long long> buy(k + 1, LLONG_MIN / 2), sell(k + 1, 0);
    for (int p : prices)
        for (int j = k; j >= 1; j--) {              // j-th transaction
            sell[j] = max(sell[j], buy[j] + p);
            buy[j] = max(buy[j], sell[j - 1] - p);
        }
    return (int)sell[k];
}
```

```python
def max_profit_one(prices):
    best, low = 0, float("inf")
    for p in prices:
        low = min(low, p)
        best = max(best, p - low)
    return best

def max_profit_fee(prices, fee):
    hold, free = float("-inf"), 0
    for p in prices:
        hold, free = max(hold, free - p), max(free, hold + p - fee)
    return free
```

In `maxProfitK`, updating `sell[j]` before `buy[j]`, with j going downward, means every update reads values from the previous day: `sell[j]` reads yesterday's `buy[j]`, and `buy[j]` reads `sell[j - 1]`, which this day's loop hasn't reached yet.

#### Complexity

$O(n)$ for the fixed-state versions, $O(n \cdot k)$ for at most $k$ transactions, $O(k)$ space.

#### Edge cases and bugs

- Using updated same-day values (buying and selling on the same day, or skipping the cooldown).
- Initializing `hold` to 0 instead of −∞ (you can't hold a share for free).
- k = 0 or fewer than 2 prices: profit 0.

#### Variants

- Best time with at most two transactions: two passes (best profit in the prefix and in the suffix) also work.
- Stock with a transaction limit and cooldown combined: add both dimensions.
- Maximize profit with job scheduling constraints: the same "state machine over time" idea applies to many scheduling DPs.

Connects to: designing DP states, Kadane's algorithm (one transaction = max subarray of differences), space optimization.

### questions
Q: How do you get the maximum profit with a single buy and sell?
A: Scan the prices while tracking the lowest price seen so far; at each day, the best profit selling today is the price minus that minimum. Keep the maximum. It's O(n) time and O(1) space.

Q: What is the profit with unlimited transactions, and why?
A: The sum of all positive differences between consecutive days. Any profitable holding period can be split into daily gains, and taking every upward move is achievable by buying before each rise and selling after it.

Q: How does the state machine handle a cooldown after selling?
A: Add a state for "just sold". From it you can only move to "resting" the next day, and you can only buy from "resting". The transitions are hold = max(hold, rest − price), sold = hold + price, rest = max(rest, sold), all from the previous day's values.

Q: How do you solve the problem with at most k transactions?
A: Keep buy[j] and sell[j], the best profit after the j-th buy and the j-th sell. For each price, update sell[j] = max(sell[j], buy[j] + price) and buy[j] = max(buy[j], sell[j − 1] − price). That's O(n · k); if k is at least n/2, use the unlimited solution instead.

### signals
- buy and sell a stock over days to maximize profit
- limits on the number of transactions, cooldowns or fees
- each day you are in one of a few modes (holding, free, cooling down)
- decisions over time where only a small state matters

### template
```cpp
// State-machine DP over days: best profit in each state, updated from yesterday's values.
long long stateMachine(const vector<int>& prices, int fee) {
    long long hold = LLONG_MIN / 2;   // best profit while holding a share
    long long free = 0;               // best profit while not holding
    for (int p : prices) {
        long long newHold = max(hold, free - p);        // rest, or buy today
        long long newFree = max(free, hold + p - fee);  // rest, or sell today
        hold = newHold;
        free = newFree;                                 // add states: cooldown, j-th transaction...
    }
    return free;
}
```
