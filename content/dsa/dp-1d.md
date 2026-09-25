---
topic: dsa.dp-1d
name: "Dynamic programming: 1D"
subject: dsa
order: 27
prereqs: [dsa.dp-foundations]
---

## dsa.dp-1d.linear-dp
name: "Linear DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "climbing stairs, min cost climbing stairs"

### simple
Linear DP walks along a line of positions and computes each position's answer from the few positions just before it. Climbing stairs is the classic: the number of ways to reach a step is the ways to reach the step below plus the ways to reach the one two below. One pass from left to right fills everything in.

### interview
- State `dp[i]` for position i; transition from a constant number of earlier positions (`i-1`, `i-2`, …) or from all earlier ones (O(n²)).
- **Climbing stairs**: `dp[i] = dp[i-1] + dp[i-2]` (Fibonacci). **Min cost climbing stairs**: `dp[i] = cost[i] + min(dp[i-1], dp[i-2])`, answer `min(dp[n-1], dp[n-2])`.
- **O(n)** time; **O(1)** space when only the last few values are needed.
- Variants with k step sizes: `dp[i] = Σ dp[i - s]`; with a sliding window sum it stays O(n).
- Tribonacci, tiling a 2×n board, number of ways to paint a fence with at most two same-colored neighbors: all linear DP.

### deep
#### Intuition

Many problems ask about reaching the end of a line, where each move is a short hop. Whatever happens at position i depends only on how you arrived: from one of a few earlier positions. So the answer at i is a simple combination of a few earlier answers, and a single left-to-right pass computes them all.

#### Worked example: min cost climbing stairs

`cost = [10, 15, 20]`. You can start at step 0 or 1, pay a step's cost when you stand on it, then climb 1 or 2 steps; the top is past the last step.

| i | cost | dp[i] = cost[i] + min(dp[i-1], dp[i-2]) |
|---|---|---|
| 0 | 10 | 10 |
| 1 | 15 | 15 |
| 2 | 20 | 20 + min(15, 10) = 30 |

Answer: `min(dp[1], dp[2]) = min(15, 30) = 15` (start at step 1, jump 2 steps to the top).

#### Code

```cpp
int minCostClimbing(const vector<int>& cost) {
    int a = 0, b = 0;                         // dp[i-2], dp[i-1] (cost to stand on those steps)
    for (int c : cost) {
        int cur = c + min(a, b);
        a = b;
        b = cur;
    }
    return min(a, b);                         // the top is reached from either of the last two
}

// Ways to climb n steps with allowed step sizes (mod 1e9+7).
long long waysWithSteps(int n, const vector<int>& steps) {
    const long long MOD = 1'000'000'007;
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int s : steps)
            if (s <= i) dp[i] = (dp[i] + dp[i - s]) % MOD;
    return dp[n];
}
```

#### Recognizing it

The words to listen for are "positions in a line", "each step you may move 1 or 2" (or any small set of moves), and "how many ways" or "what is the minimum cost to reach the end". Before coding, say the state in one sentence ("`dp[i]` is the cheapest way to stand on step i"), list the ways to arrive at i, and check the first two positions by hand, because off-by-one mistakes at the start (can you begin on step 1 for free?) are the most common bug in this pattern.

#### Complexity

$O(n)$ time for a constant number of previous states ($O(n \cdot k)$ with $k$ step sizes), and $O(1)$ space with rolling variables.

#### Edge cases and bugs

- Start conditions: can you start at step 0 and 1 for free? Read the problem.
- n = 0 or 1: make sure the rolling variables give the right answer without the loop running.
- Counting problems overflow: take the modulus.

#### Variants

- Frog jumps with costs `|h[i] - h[j]|` for the last k stones: O(n·k).
- Delete and earn: bucket values, then it's house robber on the buckets.
- Domino and tromino tiling: a few states per column (full, top missing, bottom missing).

Connects to: what DP is, take or skip DP, decoding and segmentation DP, space optimization.

### questions
Q: How do you count the ways to climb n stairs taking 1 or 2 steps at a time?
A: Let ways[i] be the ways to reach step i. The last move came from i − 1 or i − 2, so ways[i] = ways[i − 1] + ways[i − 2], with ways[0] = ways[1] = 1. It's the Fibonacci sequence, computed in O(n) time and O(1) space.

Q: How does min cost climbing stairs work?
A: Let dp[i] be the cheapest way to stand on step i: cost[i] plus the cheaper of dp[i − 1] and dp[i − 2]. You can start on step 0 or 1, and the top is reached from either of the last two steps, so the answer is the smaller of the last two dp values.

Q: How do you handle a set of allowed step sizes?
A: dp[i] is the sum of dp[i − s] over every allowed step size s ≤ i, with dp[0] = 1. That's O(n · k) for k step sizes, or O(n) for consecutive step sizes 1..k with a sliding window sum.

Q: How do you reduce linear DP to O(1) space?
A: Keep only the last few values the recurrence reads, updating them as you move forward, like a and b for the previous two steps. The full array is unnecessary once each value is used.

### signals
- reach the end of a line of positions with small moves (1 or 2 steps)
- number of ways or minimum cost where each position depends on the previous few
- tilings or colorings built one column or post at a time
- "climbing stairs" style recurrences in disguise

### template
```cpp
// Linear DP: dp[i] from the previous k positions; rolling storage when k is small.
long long linearDp(int n, const vector<long long>& weight) {
    vector<long long> dp(n + 1, LLONG_MAX / 2);
    dp[0] = 0;                                         // base state
    for (int i = 1; i <= n; i++) {
        for (int step = 1; step <= 2 && step <= i; step++)   // allowed previous positions
            dp[i] = min(dp[i], dp[i - step] + weight[i - 1]); // combine (min / max / sum)
    }
    return dp[n];
}
```

## dsa.dp-1d.take-or-skip-dp
name: "Take or skip DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-1d.linear-dp]
scope: "house robber I and II"

### simple
Take-or-skip DP decides, item by item, whether to take the current item or skip it, when taking one blocks its neighbor. A burglar robbing a street can't rob two houses next to each other, so for each house they compare "rob this one plus the best up to two houses back" with "skip it and keep the best so far". The better of the two is the best for that stretch of street.

### interview
- **House robber**: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`. O(n) time, O(1) space with two variables.
- **House robber II** (circular street): first and last houses are neighbors; answer = max(rob houses 0..n−2, rob houses 1..n−1). Handle n = 1 separately.
- General shape: `best(i) = max(skip: best(i-1), take: value(i) + best(last compatible before i))`.
- **Delete and earn**: taking value v removes v − 1 and v + 1; group points by value, then house robber over values.
- Tree version (house robber III) needs two values per node: robbed and not robbed.
- Also: maximum sum of non-adjacent elements, scheduling with a cooldown of one.

### deep
#### Intuition

For each item there are only two possibilities: it's in the chosen set or it isn't. If it isn't, the best is whatever was best for the previous items. If it is, its neighbor can't be, so add its value to the best for the items two back. Taking the maximum covers both cases.

#### Worked example

`nums = [2, 7, 9, 3, 1]`

| i | nums[i] | skip: dp[i-1] | take: dp[i-2] + nums[i] | dp[i] |
|---|---|---|---|---|
| 0 | 2 | 0 | 2 | 2 |
| 1 | 7 | 2 | 0 + 7 | 7 |
| 2 | 9 | 7 | 2 + 9 | 11 |
| 3 | 3 | 11 | 7 + 3 | 11 |
| 4 | 1 | 11 | 11 + 1 | 12 |

Answer **12** (houses 0, 2, 4: 2 + 9 + 1).

#### Code

```cpp
int robLine(const vector<int>& a, int lo, int hi) {   // houses lo..hi inclusive
    int prev2 = 0, prev1 = 0;                          // best up to i-2, up to i-1
    for (int i = lo; i <= hi; i++) {
        int cur = max(prev1, prev2 + a[i]);            // skip or take
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}

int robCircle(const vector<int>& a) {
    int n = a.size();
    if (n == 1) return a[0];
    return max(robLine(a, 0, n - 2), robLine(a, 1, n - 1));   // can't take both ends
}
```

#### Complexity

$O(n)$ time, $O(1)$ space. Delete and earn: $O(n \log n)$ for sorting distinct values (or $O(n + \max)$ with a bucket array).

#### Edge cases and bugs

- Empty array: 0. One house (circular version): take it.
- Circular version: running the linear solver on the whole array double-uses the first and last houses.
- Negative values (not in the classic problem): skipping everything must be allowed, so initialize with 0.

#### Variants

- House robber III (binary tree): each node returns (best if robbed, best if not).
- Maximum sum with no two chosen elements within distance k: `dp[i] = max(dp[i-1], a[i] + dp[i-k-1])`.
- Weighted interval scheduling: "take" jumps back to the last compatible interval found by binary search.
- Pizza with 3n slices (circular, choose exactly n non-adjacent): add a count dimension.

Connects to: linear DP, tree DP on subtrees, 0/1 knapsack, weighted interval scheduling.

### questions
Q: What is the recurrence for house robber?
A: dp[i] = max(dp[i − 1], dp[i − 2] + nums[i]): either skip house i and keep the best for the first i − 1 houses, or rob it and add its value to the best for the first i − 2 houses. It runs in O(n) time and O(1) space with two variables.

Q: How do you solve house robber when the houses are in a circle?
A: The first and last houses are adjacent, so they can't both be robbed. Run the linear solution twice, once without the last house and once without the first, and take the maximum. A single house is a special case.

Q: How does "delete and earn" reduce to house robber?
A: Taking a value v earns v times its count and forbids v − 1 and v + 1. Group the points by value and walk through values in order; adjacent values conflict like adjacent houses, while values with a gap between them don't.

Q: How would you solve house robber on a binary tree?
A: Each node returns two numbers: the best total if it's robbed (its value plus both children's not-robbed totals) and if it isn't (the sum of each child's better option). The answer is the larger value at the root, in O(n).

### signals
- choose items to maximize a total when adjacent items can't both be chosen
- "no two consecutive", "can't pick neighbors"
- values where picking one forbids its immediate neighbors (in position or in value)
- a circular arrangement where the first and last are neighbors

### template
```cpp
// Take-or-skip over a sequence where taking i forbids i - 1.
long long takeOrSkip(const vector<long long>& value) {
    long long skipBest = 0, takeBest = LLONG_MIN / 2;   // best with item i skipped / taken
    for (long long v : value) {
        long long take = skipBest + v;                  // previous must be skipped
        long long skip = max(skipBest, takeBest);       // previous can be anything
        takeBest = take;
        skipBest = skip;
    }
    return max(skipBest, takeBest);
}
```

## dsa.dp-1d.decoding-and-segmentation-dp
name: "Decoding and segmentation DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-1d.linear-dp]
scope: "decode ways, word break"

### simple
Segmentation DP asks whether, or in how many ways, a string can be cut into valid pieces. For each position you look back at every possible last piece, and if that piece is valid, you add up (or check) the answers for the part before it. It is like checking whether a long sentence without spaces can be split into dictionary words.

### interview
- State `dp[i]` about the prefix of length i (`dp[0]` = empty prefix: 1 way, or true).
- Transition: for each possible last piece `s[j..i-1]` that is valid, combine `dp[j]`: OR for feasibility (word break), sum for counting (decode ways), min for fewest pieces.
- **Decode ways**: last piece has length 1 (not '0') or 2 (10 to 26). O(n).
- **Word break**: try every j, or only lengths up to the longest dictionary word; use a hash set: **O(n · L)** substring checks (each O(L)), or a trie walk from j.
- Word break II (all sentences): memoize lists of sentences per suffix; the output can be exponential.
- Palindrome partitioning min cuts is the same shape with "valid = palindrome".

### deep
#### Intuition

Every valid segmentation of a prefix ends with some last piece. If you know which prefixes can be segmented (or in how many ways), then checking each possible last piece tells you about the longer prefix. The pieces are independent once you fix where the last one starts.

#### Worked example: word break

`s = "applepenapple"`, dictionary `{apple, pen}`.

| i | prefix | a valid last piece ending here | dp[i] |
|---|---|---|---|
| 0 | "" | | true |
| 5 | apple | "apple" from j = 0 (dp[0] true) | true |
| 8 | applepen | "pen" from j = 5 (dp[5] true) | true |
| 13 | applepenapple | "apple" from j = 8 (dp[8] true) | true |

All other positions are false. `dp[13]` is true, so the string can be segmented.

#### Code

```cpp
bool wordBreak(const string& s, const vector<string>& dict) {
    unordered_set<string> words(dict.begin(), dict.end());
    size_t maxLen = 0;
    for (auto& w : dict) maxLen = max(maxLen, w.size());
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;                                        // empty prefix
    for (int i = 1; i <= n; i++)
        for (int len = 1; len <= (int)maxLen && len <= i && !dp[i]; len++)
            if (dp[i - len] && words.count(s.substr(i - len, len))) dp[i] = true;
    return dp[n];
}
```

#### Complexity

Decode ways: $O(n)$. Word break: $O(n \cdot L)$ candidate pieces, each hashed in $O(L)$, so $O(n \cdot L^2)$ worst case with $L$ the longest word (a trie walk from each start avoids re-hashing). Listing all sentences is output-sensitive and can be exponential.

#### Edge cases and bugs

- Leading zeros in decode ways ("06" has no decoding; "0" alone is invalid).
- Word break without the `maxLen` bound is $O(n^2)$ substrings: fine for small n, slow for long strings with short words.
- Returning `dp[n]` for "true or false" versus counting: don't mix OR and sum.

#### Variants

- Decode ways II (`*` wildcard): multiply counts by the number of matching digits.
- Concatenated words: word break for each word against the others.
- Minimum number of pieces (or extra characters left over): replace OR with min.
- Palindrome partitioning II: minimum cuts with an `isPal` table.

Connects to: transitions and base cases, tries, palindromic DP, minimum palindrome cuts.

### questions
Q: How do you decide whether a string can be split into dictionary words?
A: Let dp[i] mean the first i characters can be segmented, with dp[0] = true. dp[i] is true if some j < i has dp[j] true and s[j..i − 1] in the dictionary. Limiting j to the longest word length and using a hash set makes it efficient.

Q: What is the transition for decode ways?
A: dp[i] = (dp[i − 1] if the last digit isn't '0') + (dp[i − 2] if the last two digits form a number from 10 to 26). With dp[0] = 1, this counts every way to split the digits into valid letters.

Q: How do you list every valid sentence in word break II without timing out?
A: Memoize, for each start index, the list of sentences that segment the suffix from that index. Each suffix is solved once, and results are combined by prefixing each valid first word. The output itself can be exponential, so the time is at least its size.

Q: How is palindrome partitioning with minimum cuts related?
A: It's the same segmentation shape: dp[i] is the fewest palindromic pieces for the first i characters, taking the minimum over j where s[j..i − 1] is a palindrome, plus one. A precomputed palindrome table makes each check O(1), giving O(n²).

### signals
- split a string into valid pieces (words, codes, palindromes)
- "can it be segmented", "in how many ways", "fewest pieces"
- digit strings mapped to letters
- the answer for a prefix depends on shorter prefixes plus one valid last piece

### template
```cpp
// Segmentation DP: dp[i] over prefixes, last piece s[j..i-1] must be valid.
template <class Valid>
long long countSegmentations(const string& s, int maxPiece, Valid valid) {
    int n = s.size();
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;                                         // empty prefix: one way
    for (int i = 1; i <= n; i++)
        for (int len = 1; len <= maxPiece && len <= i; len++)
            if (dp[i - len] && valid(i - len, len))    // last piece is s.substr(i - len, len)
                dp[i] += dp[i - len];                  // OR for feasibility, min for fewest
    return dp[n];
}
```

## dsa.dp-1d.tracking-max-and-min-together
name: "Tracking max and min together"
importance: important
prereqs: [dsa.arrays.kadanes-algorithm]
scope: "maximum product subarray"

### simple
When multiplying numbers, a very negative running product can become the largest after one more negative number. So for products you track both the largest and the smallest product ending at each position. It is like keeping both your best and worst debts in mind, because a sign flip can turn the worst into the best.

### interview
- For each i, keep `hi` = max product of a subarray ending at i and `lo` = min product ending at i.
- `hi = max(a[i], a[i]·hi_prev, a[i]·lo_prev)`, `lo = min(a[i], a[i]·hi_prev, a[i]·lo_prev)`; answer = max over i of `hi`. **O(n)**, O(1) space.
- Equivalent trick: if `a[i] < 0`, swap `hi` and `lo` before updating.
- Zeros reset both to 0 (a subarray can restart after a zero).
- The same "keep both extremes" idea applies to max subarray with the option to negate, and any DP where multiplying by a negative flips the order.
- Alternative: prefix and suffix product scans, resetting at zeros; the answer is the max over both.

### questions
Q: Why does maximum product subarray need the minimum as well as the maximum?
A: Multiplying by a negative number reverses the order: the most negative product ending at i − 1 becomes the most positive after multiplying by a negative a[i]. Tracking only the maximum would miss that candidate.

Q: What is the recurrence for maximum product subarray?
A: For each i, the new maximum is the largest of a[i], a[i] times the previous maximum, and a[i] times the previous minimum; the new minimum is the smallest of the same three. The answer is the largest maximum seen. It's O(n) time and O(1) space.

Q: How do zeros affect the algorithm?
A: A zero makes every product through it zero, so both the running maximum and minimum become 0 (or restart from the next element). The recurrence handles it automatically, since a[i] = 0 makes all three candidates 0.

Q: What is the prefix and suffix alternative?
A: Scan left to right keeping a running product and scan right to left likewise, resetting to 1 after a zero; the answer is the maximum product seen in either scan. It works because the best subarray either excludes an odd negative at the start or at the end.

## dsa.dp-1d.dp-on-numbers
name: "DP on numbers"
importance: important
prereqs: [dsa.dp-1d.linear-dp]
scope: "perfect squares, integer break"

### simple
Some DP problems are about a number itself: the fewest perfect squares that add up to n, or the best way to split n into parts with the largest product. You compute the answer for every smaller number first, then build n's answer from the smaller answers. It is like building a price list for every quantity up to the one you need.

### interview
- State `dp[x]` for every x from 0 to n; transition over "the last part": `dp[x] = best over parts p of dp[x - p] ⊕ p`.
- **Perfect squares**: `dp[x] = 1 + min(dp[x - k²])` over squares ≤ x: **O(n √n)**. (Lagrange: every number is a sum of at most 4 squares.)
- **Integer break** (max product, at least two parts): `dp[x] = max over j of max(j, dp[j]) · (x - j)`: O(n²); or the math shortcut: use as many 3s as possible (O(1) or O(log n)).
- **Coin change** is the same shape with coin values as parts.
- Count partitions of n into parts: counting version, loop order decides ordered versus unordered.

### questions
Q: How do you find the least number of perfect squares summing to n?
A: Let dp[x] be the least count for x, with dp[0] = 0. For each x, try every square k² ≤ x and set dp[x] = min(dp[x − k²] + 1). That's O(n√n). BFS over remainders also works, and number theory says the answer is at most 4.

Q: How do you split n into at least two positive integers to maximize their product?
A: DP: dp[x] = max over j from 1 to x − 1 of max(j, dp[j]) · (x − j), where max(j, dp[j]) allows j itself to stay unsplit. The math shortcut is to use as many 3s as possible, replacing a leftover 1 with a 4 (3 + 1 → 2 + 2).

Q: Why are 3s optimal in integer break?
A: For any part of 5 or more, splitting it into 2 and the rest (or 3 and the rest) increases the product, so optimal parts are 2s and 3s. Since 3 · 3 > 2 · 2 · 2 for the same sum of 6, prefer 3s, using 2s only for remainders.

Q: What do perfect squares, coin change and integer break have in common?
A: Each computes an answer for every amount from 0 to n, and each amount's answer comes from choosing the last part (a square, a coin or a piece) and combining with the answer for the remaining amount.
