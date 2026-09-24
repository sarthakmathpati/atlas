---
topic: dsa.prefix-sums
name: "Prefix sums"
subject: dsa
order: 3
prereqs: [dsa.arrays]
---

## dsa.prefix-sums.1d-prefix-sums
name: "1D prefix sums"
importance: must
pattern: true
scope: "range sum queries in O(1)"

### simple
A prefix sum array stores the running total up to each position. It is like the odometer in a car: to know how far you drove between two towns, subtract the reading at the first town from the reading at the second. After one pass to build it, any range sum takes a single subtraction.

### interview
- Define `P[0] = 0` and `P[i + 1] = P[i] + a[i]`, so `P` has length `n + 1` and `P[i]` is the sum of the first `i` elements.
- Sum of `a[l..r]` (inclusive) is `P[r + 1] - P[l]`. Build **O(n)**, each query **O(1)**.
- The extra leading 0 removes the special case for ranges starting at index 0.
- Only works for **static** arrays; with updates between queries, use a Fenwick tree or segment tree (O(log n) each).
- Works for any invertible operation: sums, XOR, counts of a property (number of vowels in a range). Not for min or max (no inverse).
- Use 64-bit integers for sums of large values.

### deep
#### Intuition

Answering "what is the sum from index l to r?" by looping costs $O(n)$ per question. With $10^5$ questions on an array of $10^5$ values, that is $10^{10}$ steps. A prefix sum array does the looping once, then every question is a subtraction:

$$\text{sum}(l, r) = \sum_{i=l}^{r} a_i = P[r + 1] - P[l]$$

because $P[r+1]$ adds up everything through $r$ and $P[l]$ is the part before $l$ that you don't want.

#### Worked example

Array `a`: `3 1 4 1 5 9`

| i | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| a[i] | 3 | 1 | 4 | 1 | 5 | 9 | |
| P[i] | 0 | 3 | 4 | 8 | 9 | 14 | 23 |

Sum of `a[2..4]` = `4 + 1 + 5` = `P[5] - P[2]` = `14 - 4` = **10**.

#### Code

```cpp
class RangeSum {
    vector<long long> P;  // P[i] = a[0] + ... + a[i-1]
public:
    explicit RangeSum(const vector<int>& a) : P(a.size() + 1, 0) {
        for (int i = 0; i < (int)a.size(); i++) P[i + 1] = P[i] + a[i];
    }
    long long query(int l, int r) const { return P[r + 1] - P[l]; }  // inclusive
};

// Pivot index: left sum equals right sum, using the total instead of a second array.
int pivotIndex(const vector<int>& a) {
    long long total = accumulate(a.begin(), a.end(), 0LL), left = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        if (left == total - left - a[i]) return i;
        left += a[i];
    }
    return -1;
}
```

```python
from itertools import accumulate

class RangeSum:
    def __init__(self, a):
        self.P = [0] + list(accumulate(a))

    def query(self, l, r):          # inclusive
        return self.P[r + 1] - self.P[l]
```

Build $O(n)$ time and $O(n)$ space; each query $O(1)$.

#### Prefix counts

Prefix sums work for any quantity you can add up, including indicator values. To answer "how many vowels are in `s[l..r]`?", let `P[i + 1] = P[i] + (s[i] is a vowel)`. Several properties give several prefix arrays (or one array of counts per character: 26 prefix arrays answer "how many of each letter" in O(26) per query).

#### Edge cases and bugs

- **Off by one**: mixing inclusive and exclusive ends. Stick to `P` of length `n + 1` and the formula `P[r + 1] - P[l]`.
- **Overflow**: $10^5$ values of $10^9$ sum to $10^{14}$; `int` overflows.
- **Updates**: if the array changes, every later prefix changes: $O(n)$ per update. Switch to a Fenwick tree.
- **Negative numbers** are fine for range sums; they only break sliding-window tricks, not prefix sums.

#### Variants

- Running totals left and right (pivot index, product except self).
- Prefix sums on a circular array: double the array or handle the wrap with the total.
- Prefix sums plus binary search: with non-negative values, `P` is non-decreasing, so "the shortest prefix with sum at least X" is a binary search.
- Prefix sums plus a hash map: count subarrays with a given sum (next concept).

Connects to: prefix sum with hash map, 2D prefix sums, difference arrays, Fenwick tree.

### questions
Q: How do you compute the sum of a[l..r] in O(1) after preprocessing?
A: Build P with P[0] = 0 and P[i + 1] = P[i] + a[i]. Then the sum of a[l..r] inclusive is P[r + 1] − P[l]. Building takes O(n) and every query is one subtraction.

Q: Why use a prefix array of length n + 1 with a leading zero?
A: The leading zero represents the empty prefix, so ranges starting at index 0 use the same formula (P[r + 1] − P[0]) with no special case. It removes a common source of off-by-one bugs.

Q: When do prefix sums stop being a good choice?
A: When the array is updated between queries: one update changes O(n) prefix values. A Fenwick tree or segment tree supports both updates and range sums in O(log n).

Q: Can you use prefix sums for range minimum queries?
A: No, because minimum has no inverse: knowing the minimum of a[0..r] and of a[0..l − 1] doesn't tell you the minimum of a[l..r]. Use a sparse table (static) or a segment tree instead.

Q: How would you count the vowels in many substrings quickly?
A: Build a prefix count array where P[i + 1] = P[i] + 1 if s[i] is a vowel, else P[i]. Each query is then P[r + 1] − P[l] in O(1).

### signals
- many range sum (or range count) queries on an array that doesn't change
- "sum of elements between indices i and j"
- balancing a left side against a right side (pivot index, equal halves)
- counting how often a property occurs inside many substrings or subarrays

### template
```cpp
// Prefix sums: P[i] = sum of the first i elements; sum(l..r) = P[r + 1] - P[l].
vector<long long> buildPrefix(const vector<int>& a) {
    vector<long long> P(a.size() + 1, 0);
    for (int i = 0; i < (int)a.size(); i++) P[i + 1] = P[i] + a[i];
    return P;
}

long long rangeSum(const vector<long long>& P, int l, int r) {  // inclusive l..r
    return P[r + 1] - P[l];
}
```

## dsa.prefix-sums.prefix-sum-with-hash-map
name: "Prefix sum with hash map"
importance: must
pattern: true
prereqs: [dsa.prefix-sums.1d-prefix-sums, dsa.hashing.complement-lookup]
scope: "count subarrays with sum K, longest subarray with sum K, divisibility by K"

### simple
A subarray adds up to K exactly when the running total now, minus the running total at some earlier point, equals K. So as you walk the array, you ask: "have I seen the running total minus K before?" A hash map remembers every running total you have passed, like a notebook of odometer readings.

### interview
- Subarray `a[i..j]` has sum `K` iff `P[j + 1] - P[i] = K`, that is, an earlier prefix equals `current - K`.
- **Count subarrays with sum K**: map `prefix → count`, seeded with `{0: 1}`; add `count[cur - K]` before inserting `cur`. **O(n)** time and space.
- **Longest subarray with sum K**: map `prefix → first index`, seeded with `{0: -1}`; never overwrite an earlier index.
- **Divisible by K**: store `prefix mod K` (normalized to be non-negative); equal remainders give a divisible subarray.
- Works with **negative numbers**, unlike the sliding window.
- Binary arrays: map 0 to -1, then "equal zeros and ones" is "sum 0".

### deep
#### Intuition

Prefix sums turn "sum of a subarray" into "difference of two prefixes". So counting subarrays with sum $K$ becomes counting pairs of prefixes $(P_i, P_j)$ with $i < j$ and $P_j - P_i = K$. That is the two-sum problem on the prefix array, solved in one pass with a hash map: at each position, look up how many earlier prefixes equal $P_j - K$.

#### Worked example: count subarrays with sum 3

Array `1 2 1 2 1`, $K = 3$. Map starts as `{0: 1}` (the empty prefix).

| j | a[j] | cur | need cur − 3 | count[need] | total | map after |
|---|---|---|---|---|---|---|
| 0 | 1 | 1 | -2 | 0 | 0 | {0:1, 1:1} |
| 1 | 2 | 3 | 0 | 1 | 1 | {0:1, 1:1, 3:1} |
| 2 | 1 | 4 | 1 | 1 | 2 | … 4:1 |
| 3 | 2 | 6 | 3 | 1 | 3 | … 6:1 |
| 4 | 1 | 7 | 4 | 1 | 4 | … 7:1 |

Four subarrays: `1 2`, `2 1`, `1 2`, `2 1`.

#### Code

```cpp
int countSubarraysWithSum(const vector<int>& a, int k) {
    unordered_map<long long, int> seen{{0, 1}};  // prefix value -> how many times
    long long cur = 0;
    int count = 0;
    for (int x : a) {
        cur += x;
        auto it = seen.find(cur - k);
        if (it != seen.end()) count += it->second;  // look up before inserting
        seen[cur]++;
    }
    return count;
}

int longestSubarrayWithSum(const vector<int>& a, long long k) {
    unordered_map<long long, int> first{{0, -1}};  // prefix value -> earliest index
    long long cur = 0;
    int best = 0;
    for (int j = 0; j < (int)a.size(); j++) {
        cur += a[j];
        auto it = first.find(cur - k);
        if (it != first.end()) best = max(best, j - it->second);
        first.emplace(cur, j);                      // emplace keeps the earliest index
    }
    return best;
}
```

```python
from collections import defaultdict

def count_subarrays_divisible_by_k(a, k):
    seen = defaultdict(int)
    seen[0] = 1
    cur = count = 0
    for x in a:
        cur = (cur + x) % k        # Python's % is already non-negative for k > 0
        count += seen[cur]
        seen[cur] += 1
    return count

def longest_subarray_with_sum(a, k):
    first = {0: -1}
    cur = best = 0
    for j, x in enumerate(a):
        cur += x
        if cur - k in first:
            best = max(best, j - first[cur - k])
        first.setdefault(cur, j)
    return best
```

Time $O(n)$ on average (hash operations), space $O(n)$ for the map.

#### Divisibility

A subarray sum is divisible by $K$ exactly when two prefixes have the same remainder mod $K$. So count remainders and add `seen[r]` at each step. In C++ and Java, `%` can return a negative number for negative sums; normalize with `((cur % k) + k) % k`.

#### Edge cases and bugs

- **Forgetting the seed** `{0: 1}` misses subarrays that start at index 0.
- **Inserting before looking up** counts the empty subarray when $K = 0$.
- **Overwriting the first index** in the longest-subarray version gives shorter answers.
- **Sliding window does not work** here when values can be negative: shrinking the window can increase the sum.

#### Variants

- Contiguous array (equal 0s and 1s): replace 0 with -1, find the longest subarray with sum 0.
- Continuous subarray sum of length at least 2 that is a multiple of k: store the first index of each remainder and check `j - first[r] >= 2`.
- Count submatrices with sum K: fix two rows, compress to a 1D array of column sums, then apply this pattern: $O(r^2 c)$.
- Subarrays with XOR equal to K: same idea with `cur ^ K`.

Connects to: 1D prefix sums, complement lookup (two sum), sliding window (the non-negative case).

### questions
Q: How do you count subarrays whose sum is exactly K in O(n)?
A: Keep a running prefix sum and a hash map from prefix values to how many times each occurred, starting with {0: 1}. At each index, add the count of cur − K (earlier prefixes that leave exactly K), then record cur. Each step is O(1) on average.

Q: Why does the map start with {0: 1}?
A: It represents the empty prefix before the first element. Without it, a subarray starting at index 0 whose sum is K would be missed, because it corresponds to cur − K = 0.

Q: Why can't you use a sliding window when the array has negative numbers?
A: A sliding window relies on the sum growing when the window expands and shrinking when it contracts. Negative numbers break that monotonicity, so you can't decide which end to move. The prefix-sum map doesn't need monotonicity.

Q: How do you count subarrays whose sum is divisible by K?
A: Two prefixes with the same remainder mod K bound a subarray whose sum is divisible by K. Count remainders in a map starting with {0: 1}, and at each step add the count of the current remainder. Normalize negative remainders in C++ and Java.

Q: For the longest subarray with sum K, why store the first index of each prefix?
A: The subarray length is j − i, so for a fixed end j you want the earliest i with the right prefix value. Storing the first occurrence (and never overwriting it) gives the longest possible subarray.

### signals
- count subarrays whose sum equals K (values may be negative)
- longest subarray with a given sum, or equal numbers of two kinds (0 and 1)
- a subarray sum divisible by K or a multiple of K
- "continuous subarray" with an exact target rather than a bound
- subarrays with a given XOR

### template
```cpp
// Prefix sum + hash map: count subarrays ending at each index whose sum is K.
long long countWithSum(const vector<int>& a, long long K) {
    unordered_map<long long, long long> seen;  // prefix value -> occurrences (or first index)
    seen[0] = 1;                               // the empty prefix
    long long cur = 0, answer = 0;
    for (int x : a) {
        cur += x;                              // or: (cur + x) % K normalized, cur ^ x, ...
        auto it = seen.find(cur - K);          // earlier prefixes that leave exactly K
        if (it != seen.end()) answer += it->second;
        seen[cur]++;                           // insert after the lookup
    }
    return answer;
}
```

## dsa.prefix-sums.2d-prefix-sums
name: "2D prefix sums"
importance: important
pattern: true
prereqs: [dsa.prefix-sums.prefix-sum-with-hash-map]
scope: "submatrix sums"

### simple
A 2D prefix sum stores, for every cell, the total of the rectangle from the top-left corner to that cell. It is like knowing the number of houses in every block measured from one corner of a city map. Any rectangle's total then comes from four lookups: the big corner rectangle, minus two strips, plus the overlap you subtracted twice.

### interview
- `P[r + 1][c + 1] = a[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]`, with a zero row and zero column at the start.
- Sum of rectangle `(r1, c1)` to `(r2, c2)` inclusive: `P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]` (inclusion-exclusion).
- Build **O(R × C)**, each query **O(1)**.
- Uses: immutable range sum 2D, counting cells with a property in a rectangle, matrix block sum, largest square with sum below a limit (with binary search).
- For "count submatrices with sum K", fix two rows and run the 1D prefix-sum-with-hash-map on column sums: **O(R² × C)**.

### deep
#### Intuition

Inclusion-exclusion does all the work. The prefix value at a corner covers everything above and to the left. To isolate a rectangle, remove the strip above it and the strip to its left; the top-left corner region was removed twice, so add it back once.

```
P[r2+1][c2+1]  -  P[r1][c2+1]  -  P[r2+1][c1]  +  P[r1][c1]
   (whole)         (strip above)   (strip left)    (overlap)
```

#### Worked example

Matrix:

```
1 2 3
4 5 6
7 8 9
```

Prefix table `P` (with the zero row and column):

| | c=0 | 1 | 2 | 3 |
|---|---|---|---|---|
| r=0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 1 | 3 | 6 |
| 2 | 0 | 5 | 12 | 21 |
| 3 | 0 | 12 | 27 | 45 |

Sum of the bottom-right 2 × 2 block (rows 1 to 2, columns 1 to 2) = `P[3][3] - P[1][3] - P[3][1] + P[1][1]` = `45 - 6 - 12 + 1` = **28** = 5 + 6 + 8 + 9.

#### Code

```cpp
class MatrixSum {
    vector<vector<long long>> P;
public:
    explicit MatrixSum(const vector<vector<int>>& a) {
        int R = a.size(), C = R ? a[0].size() : 0;
        P.assign(R + 1, vector<long long>(C + 1, 0));
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                P[r + 1][c + 1] = a[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
    }
    long long query(int r1, int c1, int r2, int c2) const {  // inclusive corners
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
};
```

```python
class MatrixSum:
    def __init__(self, a):
        R, C = len(a), len(a[0]) if a else 0
        self.P = [[0] * (C + 1) for _ in range(R + 1)]
        for r in range(R):
            for c in range(C):
                self.P[r + 1][c + 1] = (a[r][c] + self.P[r][c + 1]
                                        + self.P[r + 1][c] - self.P[r][c])

    def query(self, r1, c1, r2, c2):
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
```

Build $O(RC)$ time and space, query $O(1)$.

#### Counting submatrices with sum K

Fix a top row `t` and a bottom row `b`. The column sums between them form a 1D array; a submatrix between those rows is a subarray of it. Apply the prefix-sum-with-hash-map count on that array. With $R \le C$, loop over row pairs: $O(R^2 C)$.

#### Edge cases and bugs

- Getting the signs wrong in the query: it is minus, minus, plus.
- Forgetting the extra zero row and column leads to special cases at the borders.
- Clamping queries that extend past the matrix (matrix block sum): clamp `r1, c1` to 0 and `r2, c2` to the last index first.

#### Variants

- **2D difference array**: the reverse operation, for adding a value to many rectangles and reading the final grid once.
- **Maximum sum rectangle**: fix two rows, run Kadane on column sums.
- **Largest square with sum at most a limit**: prefix sums plus binary search on the side length.

Connects to: 1D prefix sums, prefix sum with hash map, difference arrays, Kadane's algorithm.

### questions
Q: What is the formula for the sum of a submatrix using a 2D prefix table?
A: With P[r][c] holding the sum of the rectangle above and left of (r, c), the sum of rows r1..r2 and columns c1..c2 is P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]. The last term adds back the corner that was subtracted twice.

Q: How do you build the 2D prefix table?
A: P[r+1][c+1] = a[r][c] + P[r][c+1] + P[r+1][c] − P[r][c], filling row by row. It takes O(R·C) time, and the zero row and column avoid boundary checks.

Q: How would you count submatrices whose sum equals K?
A: Fix a pair of rows, compress the columns between them into a 1D array of sums, and count subarrays with sum K using a prefix sum hash map. Over all row pairs that is O(R²·C).

Q: How do you handle queries that reach beyond the matrix, as in "matrix block sum"?
A: Clamp the corners to the valid range first (r1 = max(0, r − k), r2 = min(R − 1, r + k), and the same for columns), then apply the usual formula.

### signals
- many sum queries over rectangles of a fixed grid
- "sum of the submatrix" or "block sum around every cell"
- counting cells with a property inside rectangles
- submatrices with a target sum (fix two rows, then 1D)

### template
```cpp
// 2D prefix sums with a zero border; rectangle sums by inclusion-exclusion.
struct Prefix2D {
    vector<vector<long long>> P;
    explicit Prefix2D(const vector<vector<int>>& a) {
        int R = a.size(), C = R ? a[0].size() : 0;
        P.assign(R + 1, vector<long long>(C + 1, 0));
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                P[r + 1][c + 1] = a[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
    }
    // Inclusive corners (r1, c1) top-left and (r2, c2) bottom-right.
    long long sum(int r1, int c1, int r2, int c2) const {
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
};
```

## dsa.prefix-sums.difference-arrays
name: "Difference arrays"
importance: important
pattern: true
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "range updates in O(1)"

### simple
A difference array records where values start and stop changing instead of the values themselves. It is like marking a bus route with "+3 people get on here" and "3 people get off there": one pass adding up those marks tells you how full the bus is at every stop. Adding to a whole range costs only two marks.

### interview
- To add `v` to every element of `[l, r]`: `D[l] += v; D[r + 1] -= v` (size `n + 1`). **O(1)** per update.
- After all updates, a prefix sum over `D` rebuilds the array: **O(n)** once.
- Inverse of prefix sums: prefix sums answer range **queries**, difference arrays apply range **updates**.
- Only works when all updates come before all reads; interleaved updates and queries need a Fenwick tree or a segment tree with lazy propagation.
- Uses: flight bookings, car pooling (is capacity ever exceeded?), counting how many intervals cover each point, 2D range additions.

### deep
#### Intuition

If you add 5 to every element from index 2 to 6, the only places where the array's **change from the previous element** is affected are index 2 (it jumps up by 5) and index 7 (it drops back by 5). A difference array stores exactly those changes: $D[i] = a[i] - a[i-1]$. A range update touches two entries, and a running sum over $D$ reconstructs every value.

#### Worked example

Length 6, starting from zeros. Updates: add 2 to `[1, 3]`, add 3 to `[2, 5]`, add -1 to `[0, 1]`.

| D after | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| `+2 [1,3]`: `D[1] += 2`, `D[4] -= 2` | 0 | 2 | 0 | 0 | -2 | 0 | 0 |
| `+3 [2,5]`: `D[2] += 3`, `D[6] -= 3` | 0 | 2 | 3 | 0 | -2 | 0 | -3 |
| `-1 [0,1]`: `D[0] -= 1`, `D[2] += 1` | -1 | 2 | 4 | 0 | -2 | 0 | -3 |
| running sum (the result) | -1 | 1 | 5 | 5 | 3 | 3 | |

Check a few cells directly: index 1 is covered by `+2` and `-1`, giving 1; index 2 by `+2` and `+3`, giving 5; index 4 only by `+3`, giving 3. Every update writes **two** entries; forgetting the closing entry (`D[r + 1] -= v`) is the classic bug, and it lets an update leak past the end of its range.

#### Code

```cpp
// Apply range additions {l, r, v} to an array of n zeros, then read it once.
vector<long long> applyRangeAdds(int n, const vector<array<int, 3>>& updates) {
    vector<long long> D(n + 1, 0);
    for (auto [l, r, v] : updates) {
        D[l] += v;
        D[r + 1] -= v;              // r + 1 <= n thanks to the extra slot
    }
    vector<long long> a(n);
    long long run = 0;
    for (int i = 0; i < n; i++) a[i] = (run += D[i]);
    return a;
}

// Car pooling: trips {passengers, from, to}; can a car of this capacity serve all?
bool carPooling(const vector<array<int, 3>>& trips, int capacity) {
    vector<int> D(1001, 0);         // stops 0..1000
    for (auto [p, from, to] : trips) { D[from] += p; D[to] -= p; }  // off at `to`
    int load = 0;
    for (int x : D) if ((load += x) > capacity) return false;
    return true;
}
```

```python
def apply_range_adds(n, updates):
    D = [0] * (n + 1)
    for l, r, v in updates:
        D[l] += v
        D[r + 1] -= v
    out, run = [], 0
    for i in range(n):
        run += D[i]
        out.append(run)
    return out
```

Updates $O(1)$ each; reconstruction $O(n)$. Total $O(n + q)$ instead of $O(nq)$.

#### Edge cases and bugs

- Forgetting `D[r + 1] -= v`, or allocating `D` of size `n` so that `r + 1 = n` is out of bounds.
- Half-open intervals (passengers leave at `to`) use `D[to] -= p`, not `D[to + 1]`: read the problem.
- Large coordinates (up to $10^9$) need coordinate compression or a sorted event list (the sweep line) instead of an array.

#### Variants

- **2D difference array**: to add `v` to a rectangle, update four corners (`+v`, `-v`, `-v`, `+v`), then take a 2D prefix sum.
- **Sweep line**: the same idea with events sorted by coordinate instead of an array indexed by position.
- **Range update, range query online**: Fenwick tree with two arrays, or a lazy segment tree.

Connects to: 1D prefix sums, sweep line, intervals, lazy propagation.

### questions
Q: How does a difference array add v to every element in [l, r] in O(1)?
A: It stores changes between neighbors. Adding v to D[l] raises everything from l onward, and subtracting v from D[r + 1] cancels it after r. A prefix sum over D then rebuilds the updated array.

Q: What is the relationship between prefix sums and difference arrays?
A: They are inverses. Taking the prefix sum of a difference array gives the original array, and taking differences of a prefix array gives the original back. Prefix sums make range queries cheap; difference arrays make range updates cheap.

Q: When is a difference array not enough?
A: When updates and queries are interleaved, because reading a value needs a full O(n) prefix pass. Use a Fenwick tree (range update, point query) or a segment tree with lazy propagation instead.

Q: How would you check whether a car ever carries more passengers than its capacity, given many trips?
A: Add each trip's passengers at its start stop and subtract them at its end stop in a difference array, then sweep the stops with a running sum. If the running load ever exceeds the capacity, the answer is no. That is O(trips + stops).

### signals
- many "add v to every element from l to r" updates, then read the final array once
- counting how many intervals cover each point
- capacity or occupancy over time from start and end events
- bookings or reservations applied to ranges of days or seats

### template
```cpp
// Difference array: O(1) range additions, then one O(n) pass to materialize.
struct RangeAdder {
    vector<long long> D;
    explicit RangeAdder(int n) : D(n + 1, 0) {}
    void add(int l, int r, long long v) {  // inclusive [l, r]
        D[l] += v;
        D[r + 1] -= v;
    }
    vector<long long> build() const {       // prefix sum of the differences
        vector<long long> a(D.size() - 1);
        long long run = 0;
        for (int i = 0; i < (int)a.size(); i++) a[i] = (run += D[i]);
        return a;
    }
};
```

## dsa.prefix-sums.prefix-products-and-prefix-xor
name: "Prefix products and prefix XOR"
importance: important
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "product of array except self, XOR range queries"

### simple
The running-total idea works for other operations too, such as multiplying or XOR-ing values as you go. For the product of everything except one element, multiply what is on its left by what is on its right, like a relay race where each runner knows the combined time of everyone before and after. XOR is its own undo, so XOR prefixes answer range questions just like sums do.

### interview
- **Product of array except self** without division: `left[i]` = product of `a[0..i-1]`, `right[i]` = product of `a[i+1..n-1]`, answer `left[i] * right[i]`. **O(n)** time.
- O(1) extra space version: fill the output with left products, then sweep from the right with a running product.
- Division is avoided because of zeros (and because interviewers usually forbid it).
- **Prefix XOR**: `X[0] = 0`, `X[i + 1] = X[i] ^ a[i]`; XOR of `a[l..r]` is `X[r + 1] ^ X[l]`, because `x ^ x = 0`.
- Count subarrays with XOR equal to K: map of prefix XOR counts, look up `cur ^ K` (same shape as sum K).
- Prefix products can overflow quickly; products of a range with zeros need care (count zeros separately).

### questions
Q: How do you compute the product of all elements except self without division in O(n)?
A: For each index, the answer is the product of everything to its left times everything to its right. Fill the output left to right with running left products, then sweep right to left multiplying by a running right product. That is O(n) time and O(1) extra space besides the output.

Q: Why not just divide the total product by a[i]?
A: A zero in the array makes the total 0 and division by a zero element impossible, so you would need special cases for one zero and for two or more zeros. The prefix and suffix approach handles zeros naturally, and interviewers often forbid division anyway.

Q: How do you answer XOR queries over ranges quickly?
A: Build X with X[0] = 0 and X[i + 1] = X[i] XOR a[i]. The XOR of a[l..r] is X[r + 1] XOR X[l], because the shared prefix cancels itself out (x XOR x = 0).

Q: How do you count subarrays whose XOR equals K?
A: Walk the array keeping the prefix XOR and a map of how many times each prefix XOR occurred, starting with {0: 1}. A subarray ending here has XOR K exactly when an earlier prefix equals cur XOR K, so add that count, then record cur.
