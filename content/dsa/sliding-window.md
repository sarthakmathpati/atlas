---
topic: dsa.sliding-window
name: "Sliding window"
subject: dsa
order: 6
prereqs: [dsa.two-pointers, dsa.hashing]
---

## dsa.sliding-window.fixed-size-window
name: "Fixed-size window"
importance: must
pattern: true
scope: "sliding sums and averages, anagram occurrences"

### simple
A fixed-size window looks at k consecutive items at a time and slides one step at a time. It is like a train window showing exactly three fields: as the train moves, one new field appears on the right and one disappears on the left. You update your summary with just those two changes instead of recounting everything.

### interview
- Keep a running summary (sum, counts) of `a[i-k+1..i]`. Each step adds `a[i]` and removes `a[i - k]`: **O(n)** total instead of **O(nk)**.
- Build the first window, then slide; or use one loop that adds, removes when `i >= k`, and records when `i >= k - 1`.
- Uses: maximum sum or average of k consecutive values, count of windows meeting a threshold, **anagram occurrences** (compare letter counts of the window with the pattern's).
- For anagram checks, track how many of the 26 counts currently match to compare in O(1) per step.
- Window **max or min** needs a monotonic deque, not a running sum (removing the maximum can't be undone with subtraction).

### deep
#### Intuition

Adjacent windows of length $k$ share $k - 1$ elements. Recomputing each window from scratch wastes that overlap. Instead, keep a summary of the current window and update it with the element entering on the right and the one leaving on the left. The summary must support removal: sums and counts do; maximums don't.

#### Worked example: maximum sum of 3 consecutive values

Array `2 1 5 1 3 2`, $k = 3$.

| i | add | remove | window | sum | best |
|---|---|---|---|---|---|
| 0 | 2 | | 2 | 2 | |
| 1 | 1 | | 2 1 | 3 | |
| 2 | 5 | | 2 1 5 | 8 | 8 |
| 3 | 1 | 2 | 1 5 1 | 7 | 8 |
| 4 | 3 | 1 | 5 1 3 | 9 | 9 |
| 5 | 2 | 5 | 1 3 2 | 6 | 9 |

#### Code

```cpp
long long maxWindowSum(const vector<int>& a, int k) {
    long long sum = 0, best = LLONG_MIN;
    for (int i = 0; i < (int)a.size(); i++) {
        sum += a[i];                          // element entering
        if (i >= k) sum -= a[i - k];          // element leaving
        if (i >= k - 1) best = max(best, sum);
    }
    return best;
}

// Start indices of every anagram of p inside s (lowercase letters).
vector<int> findAnagrams(const string& s, const string& p) {
    vector<int> out;
    int k = p.size();
    if ((int)s.size() < k) return out;
    array<int, 26> need{}, have{};
    for (char c : p) need[c - 'a']++;
    for (int i = 0; i < (int)s.size(); i++) {
        have[s[i] - 'a']++;
        if (i >= k) have[s[i - k] - 'a']--;
        if (i >= k - 1 && have == need) out.push_back(i - k + 1);  // 26 comparisons
    }
    return out;
}
```

```python
def find_anagrams(s, p):
    k, out = len(p), []
    need, have = [0] * 26, [0] * 26
    for c in p:
        need[ord(c) - 97] += 1
    matches = sum(need[x] == have[x] for x in range(26))  # letters whose counts agree

    def update(idx, delta):
        nonlocal matches
        matches -= have[idx] == need[idx]
        have[idx] += delta
        matches += have[idx] == need[idx]

    for i, c in enumerate(s):
        update(ord(c) - 97, 1)
        if i >= k:
            update(ord(s[i - k]) - 97, -1)
        if i >= k - 1 and matches == 26:
            out.append(i - k + 1)
    return out
```

The Python version keeps a `matches` counter (how many of the 26 letters currently agree), so each step is $O(1)$ rather than $O(26)$.

#### Complexity

$O(n)$ time: each element enters and leaves once. Space $O(1)$ for sums, $O(\sigma)$ for an alphabet of size $\sigma$.

#### Edge cases and bugs

- $k > n$: no window exists; return early.
- Recording the answer before the first window is full.
- Initializing `best` to 0 when all sums can be negative.
- Averages: compare sums instead of dividing, to avoid floating-point noise; divide once at the end.

#### Variants

- Count windows whose average is at least a threshold (compare `sum >= threshold * k`).
- Maximum number of vowels in a window of length k.
- Permutation in string (does any anagram exist?): return on the first match.
- Distinct elements in every window: a hash map of counts, adding and removing keys.
- Windows over a circular array: iterate `i` up to `n + k - 1` with indices mod n.

Connects to: variable-size window, window with counts, prefix sums (another way to get window sums), monotonic deque (window maximum).

### questions
Q: How do you compute the sum of every window of size k in O(n)?
A: Sum the first k elements, then slide: for each new index i, add a[i] and subtract a[i − k]. Each element is added once and removed once, so the whole pass is O(n) instead of O(n·k).

Q: How do you find all anagrams of a pattern inside a longer string?
A: Slide a window of the pattern's length over the string, maintaining letter counts for the window. The window is an anagram when its counts equal the pattern's counts. Comparing 26 counts per step is O(26n); tracking how many letters currently match makes it O(n).

Q: Why doesn't a running value work for the maximum of each window?
A: When the maximum leaves the window, you can't recover the next largest value from the old maximum alone. Use a monotonic deque that keeps candidates in decreasing order, which gives O(n) overall.

Q: What are the common off-by-one issues in fixed windows?
A: Removing a[i − k] only once i ≥ k, and recording results only once i ≥ k − 1, when the first full window exists. Also handle k > n, where there is no window at all.

### signals
- a window of exactly k consecutive elements or characters
- "every subarray of length k" or "every substring of length k"
- average, sum or count over consecutive blocks of a fixed size
- anagram or permutation of a pattern occurring inside a longer string

### template
```cpp
// Fixed-size window: add the entering element, remove the leaving one, record full windows.
template <class Add, class Remove, class Record>
void fixedWindow(int n, int k, Add add, Remove remove, Record record) {
    for (int i = 0; i < n; i++) {
        add(i);                      // a[i] enters the window
        if (i >= k) remove(i - k);   // a[i - k] leaves the window
        if (i >= k - 1) record(i);   // window a[i-k+1..i] is complete
    }
}
```

## dsa.sliding-window.variable-size-window
name: "Variable-size window"
importance: must
pattern: true
prereqs: [dsa.sliding-window.fixed-size-window]
scope: "expand right, shrink left while invalid, track longest or shortest"

### simple
A variable-size window stretches and shrinks as it moves along the array. It is like a caterpillar crawling forward: the front grows until the body breaks a rule, then the back pulls in until the rule holds again. Each end only moves forward, so the whole walk takes one pass.

### interview
- Expand `r` one step at a time; while the window is **invalid**, shrink from `l`. Record the answer when the window is valid.
- **Longest valid window**: record after shrinking (`r - l + 1`). **Shortest window meeting a goal**: record inside the shrink loop while the goal still holds.
- Correctness needs **monotonicity**: if a window is invalid, every larger window containing it is invalid too (for longest), or shrinking only helps.
- With non-negative numbers: "sum at most S" (longest) and "sum at least S" (shortest) both work. With negatives it breaks: use prefix sums.
- **O(n)** time: each index enters and leaves at most once.

### deep
#### Intuition

For a brute force you would try every start and extend to every end: $O(n^2)$. The sliding window notices that when you move the start forward, the best end for the new start is never earlier than the best end for the old one. So both pointers only ever move right, and the total work is linear.

#### Worked example: shortest subarray with sum at least 7

Array `2 3 1 2 4 3` (non-negative).

| r | a[r] | sum after adding | shrink steps (record, then remove a[l]) | best |
|---|---|---|---|---|
| 0 | 2 | 2 | | ∞ |
| 1 | 3 | 5 | | ∞ |
| 2 | 1 | 6 | | ∞ |
| 3 | 2 | 8 | record 4 (l=0..3), remove 2 → 6 | 4 |
| 4 | 4 | 10 | record 4 (1..4), remove 3 → 7; record 3 (2..4), remove 1 → 6 | 3 |
| 5 | 3 | 9 | record 3 (3..5), remove 2 → 7; record 2 (4..5), remove 4 → 3 | 2 |

Answer: 2 (`4 3`).

#### Code

```cpp
// Shortest subarray with sum >= target (all values non-negative); 0 if none.
int minSubarrayLen(int target, const vector<int>& a) {
    int l = 0, best = INT_MAX;
    long long sum = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        sum += a[r];                          // expand
        while (sum >= target) {               // valid: try to shrink
            best = min(best, r - l + 1);
            sum -= a[l++];
        }
    }
    return best == INT_MAX ? 0 : best;
}

// Longest subarray with sum <= limit (non-negative values).
int longestWithSumAtMost(const vector<int>& a, long long limit) {
    int l = 0, best = 0;
    long long sum = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        sum += a[r];
        while (sum > limit) sum -= a[l++];    // shrink until valid again
        best = max(best, r - l + 1);          // window is valid here
    }
    return best;
}
```

```python
def min_subarray_len(target, a):
    l, total, best = 0, 0, float("inf")
    for r, x in enumerate(a):
        total += x
        while total >= target:
            best = min(best, r - l + 1)
            total -= a[l]
            l += 1
    return 0 if best == float("inf") else best

def longest_ones_with_k_flips(bits, k):
    l = zeros = best = 0
    for r, b in enumerate(bits):
        zeros += b == 0
        while zeros > k:                    # too many zeros to flip
            zeros -= bits[l] == 0
            l += 1
        best = max(best, r - l + 1)
    return best
```

#### Complexity

`r` moves $n$ times and `l` moves at most $n$ times in total: $O(n)$ time. Space is $O(1)$ beyond whatever the window summary needs.

#### When it doesn't apply

The method relies on a monotone validity condition. With negative numbers, "sum at least S" is not monotone (adding an element can decrease the sum), so the shrink step can throw away a window that would have become valid. Use prefix sums with a monotonic deque (shortest subarray with sum at least K) or a prefix-sum hash map (exact sums).

#### Edge cases and bugs

- Recording "longest" inside the shrink loop (the window is invalid there).
- Recording "shortest" after the loop (the window has just become invalid).
- Returning `INT_MAX` when no window qualifies.
- Forgetting that `l` can pass `r` in some shrink conditions (an empty window); guard with `l <= r` when needed.

#### Variants

- Longest subarray of 1s after flipping at most k zeros (count zeros in the window).
- Fruits into baskets, longest substring with at most k distinct characters (window with counts).
- Count subarrays with product less than k: every valid window ending at `r` adds `r - l + 1` subarrays.
- Maximum points from cards taken from both ends: the complement is a fixed window in the middle.

Connects to: fixed-size window, window with counts, exactly K via at most K, prefix sum with hash map.

### questions
Q: Describe the variable-size sliding window template.
A: Move the right end forward one element at a time, updating the window's summary. While the window breaks the condition, remove elements from the left. Record the answer at the point where the window is valid: after shrinking for longest problems, inside the shrink loop for shortest problems.

Q: Why is the sliding window O(n) even with a while loop inside the for loop?
A: The left pointer only moves forward and never passes the end of the array, so across the whole run it moves at most n times. Together with the n moves of the right pointer, the total work is O(n).

Q: Why does the sliding window fail for "subarray with sum at least K" when values can be negative?
A: The method assumes that shrinking a window never helps an invalid window and that growing never hurts a valid one. Negative numbers break that: adding an element can lower the sum. Use prefix sums with a monotonic deque instead.

Q: How do you count subarrays whose product is less than k (positive values)?
A: Slide a window keeping the product below k, shrinking from the left while it is at least k. For each right end r, every subarray ending at r and starting in [l, r] qualifies, so add r − l + 1.

Q: What is the difference between tracking the longest and the shortest window?
A: For the longest valid window, shrink until the window is valid again, then record its length. For the shortest window that meets a goal, record inside the shrink loop while it still meets the goal, because each shrink step can only make it shorter.

### signals
- longest or shortest contiguous subarray or substring satisfying a condition
- "at most K" of something inside a contiguous range
- non-negative numbers with a sum limit or sum target bound
- flip or replace at most K elements to make a run
- count subarrays where a monotone condition holds (add r − l + 1)

### template
```cpp
// Variable-size window: expand right, shrink left while invalid.
template <class Add, class Remove, class Invalid>
int longestValidWindow(int n, Add add, Remove remove, Invalid invalid) {
    int best = 0;
    for (int l = 0, r = 0; r < n; r++) {
        add(r);                          // 1. a[r] enters the window state
        while (invalid()) remove(l++);   // 2. shrink from the left until valid again
        best = max(best, r - l + 1);     // 3. longest: record after shrinking
    }
    // Shortest window meeting a goal: while (meetsGoal()) { record r - l + 1; remove(l++); }
    return best;
}
```

## dsa.sliding-window.window-with-counts
name: "Window with counts"
importance: must
pattern: true
prereqs: [dsa.hashing.frequency-counting, dsa.sliding-window.variable-size-window]
scope: "distinct characters, character replacement"

### simple
Some windows need to know what is inside them, not just a total. You keep a small tally of each character in the window, like a cashier counting how many of each coin is in the drawer. The tally tells you when the window has too many distinct values or too many repeats, so you know when to shrink it.

### interview
- Maintain a count map (or a 26 or 128 int array) for the window; also track a derived number such as `distinct` (keys with count > 0).
- **Longest substring without repeating characters**: shrink while the new character's count is above 1. Or store last seen index and jump `l` to `last[c] + 1` (never move `l` backwards).
- **At most K distinct**: shrink while `distinct > K`; decrement `distinct` when a count drops to 0.
- **Character replacement** (make the window one letter with at most k changes): valid while `windowLength - maxCount <= k`. `maxCount` may be left stale (never decreased) without breaking the answer.
- All **O(n)** time, **O(σ)** space for alphabet size σ.

### deep
#### Intuition

A variable window needs a validity test that can be updated in $O(1)$ as elements enter and leave. Counts per value make that possible: the number of distinct values changes only when a count goes from 0 to 1 or from 1 to 0, and "has a duplicate" is just "some count exceeds 1", which can only be caused by the element that just entered.

#### Worked example: longest substring without repeats

`s = "abcabcbb"`

| r | char | counts after add | shrink | window | best |
|---|---|---|---|---|---|
| 0 | a | a1 | | a | 1 |
| 1 | b | a1 b1 | | ab | 2 |
| 2 | c | a1 b1 c1 | | abc | 3 |
| 3 | a | a2 b1 c1 | drop a | bca | 3 |
| 4 | b | b2 c1 a1 | drop b | cab | 3 |
| 5 | c | c2 a1 b1 | drop c | abc | 3 |
| 6 | b | a1 b2 c1 | drop a, drop b | cb | 3 |
| 7 | b | c1 b2 | drop c, drop b | b | 3 |

Answer: 3.

#### Code

```cpp
int lengthOfLongestSubstring(const string& s) {
    array<int, 128> count{};                     // ASCII
    int l = 0, best = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        count[(unsigned char)s[r]]++;
        while (count[(unsigned char)s[r]] > 1)   // only s[r] can be duplicated
            count[(unsigned char)s[l++]]--;
        best = max(best, r - l + 1);
    }
    return best;
}

int longestWithAtMostKDistinct(const string& s, int k) {
    unordered_map<char, int> count;
    int l = 0, best = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        count[s[r]]++;
        while ((int)count.size() > k) {
            if (--count[s[l]] == 0) count.erase(s[l]);  // keep size() == distinct
            l++;
        }
        best = max(best, r - l + 1);
    }
    return best;
}
```

```python
def character_replacement(s, k):
    count = [0] * 26
    l = max_count = best = 0
    for r, c in enumerate(s):
        count[ord(c) - 65] += 1                # uppercase letters
        max_count = max(max_count, count[ord(c) - 65])
        while (r - l + 1) - max_count > k:     # more than k letters to replace
            count[ord(s[l]) - 65] -= 1
            l += 1
        best = max(best, r - l + 1)
    return best
```

#### Why a stale `max_count` is fine

In character replacement, `max_count` is never decreased when the window shrinks. It can overstate the true maximum, which can only make the window look valid when it isn't. But the answer only grows when a window of a new, larger length is valid with a genuinely larger `max_count`, so the recorded best is still correct. Recomputing the maximum over 26 counts each step also works and is still $O(26n)$.

#### Complexity

$O(n)$ time: each character enters and leaves once, and each count update is $O(1)$. Space $O(\sigma)$.

#### Edge cases and bugs

- Leaving zero counts in a hash map makes `size()` overcount distinct values; erase them.
- With the last-index jump version, `l = max(l, last[c] + 1)`: without `max`, `l` can move backwards.
- `char` can be negative in C++ for non-ASCII bytes; cast to `unsigned char` before indexing.

#### Variants

- Longest substring with at most two distinct characters, fruits into baskets (k = 2).
- Longest subarray where each value appears at most k times.
- Longest substring with each character appearing at least k times: not directly monotone; iterate over the number of distinct characters allowed (1 to 26) and run a window for each.
- Count substrings containing all three characters (shortest-window counting: add `l` after shrinking).

Connects to: frequency counting, variable-size window, exactly K via at most K, minimum window substring.

### questions
Q: How do you find the longest substring without repeating characters?
A: Slide a window with a count per character. After adding s[r], shrink from the left while s[r] appears more than once; the window is then duplicate-free, so record its length. Each character enters and leaves once, so it is O(n).

Q: How do you keep track of the number of distinct values in a window?
A: Keep counts per value. Increase the distinct counter when a count goes from 0 to 1, and decrease it when a count drops from 1 to 0 (or erase zero entries from a hash map and use its size).

Q: In "longest repeating character replacement", when is a window valid?
A: When its length minus the count of its most frequent letter is at most k, because those other letters are the ones you would replace. Shrink from the left while that number exceeds k.

Q: Why can you avoid decreasing maxCount in the character replacement problem?
A: A stale maxCount is at least as large as the true one, so it never rejects a truly valid window. The answer only increases when a longer window has a truly higher count, so the final result is still correct.

### signals
- longest substring with no repeated characters
- at most K distinct values or characters in a contiguous range
- replace at most K characters to make a run of the same letter
- each value may appear at most some number of times inside the window

### template
```cpp
// Window with counts: counts[] per value plus a derived measure (distinct, max, dups).
int longestWithCounts(const string& s, int k) {
    unordered_map<char, int> count;
    int l = 0, best = 0, distinct = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        if (count[s[r]]++ == 0) distinct++;      // add s[r]
        while (distinct > k) {                   // invalid: shrink
            if (--count[s[l]] == 0) distinct--;  // remove s[l]
            l++;
        }
        best = max(best, r - l + 1);
    }
    return best;
}
```

## dsa.sliding-window.exactly-k-via-at-most-k
name: "Exactly K via at most K"
importance: important
pattern: true
prereqs: [dsa.sliding-window.window-with-counts]
scope: "exactly(K) = atMost(K) − atMost(K − 1)"

### simple
Counting windows with exactly K of something is awkward, but counting windows with at most K is easy with a sliding window. So you count "at most K" and subtract "at most K − 1", like finding how many people are exactly 30 by counting everyone 30 or younger and removing everyone 29 or younger. What is left is exactly the group you want.

### interview
- `exactly(K) = atMost(K) − atMost(K − 1)`, valid whenever the property is monotone (more elements never reduce the measured quantity).
- `atMost(K)`: standard window; for each `r`, after shrinking, **add `r − l + 1`** (the number of valid subarrays ending at `r`).
- Examples: subarrays with exactly K distinct integers, binary subarrays with sum exactly S (non-negative), number of "nice" subarrays with exactly K odd numbers.
- Each `atMost` call is O(n), so the total is **O(n)**.
- Guard `atMost(-1) = 0` (for K = 0).

### deep
#### Intuition

For a window condition like "at most K distinct values", the set of valid start positions for a fixed end `r` is a contiguous range `[l, r]`, so counting them is one subtraction. "Exactly K" doesn't have that shape: the valid starts form a band in the middle, whose ends are hard to track with one left pointer. Subtracting two "at most" counts isolates the band.

#### Worked example: subarrays with exactly 2 distinct values

Array `1 2 1 2 3`. Count subarrays with at most 2 distinct, and with at most 1.

At most 2 (add `r − l + 1` after shrinking):

| r | a[r] | window | l | added | total |
|---|---|---|---|---|---|
| 0 | 1 | 1 | 0 | 1 | 1 |
| 1 | 2 | 1 2 | 0 | 2 | 3 |
| 2 | 1 | 1 2 1 | 0 | 3 | 6 |
| 3 | 2 | 1 2 1 2 | 0 | 4 | 10 |
| 4 | 3 | shrink to 2 3 | 3 | 2 | 12 |

At most 1: every single element (5), and no longer runs of equal values, total 5.

Exactly 2 = 12 − 5 = **7**: `[1,2]`, `[2,1]`, `[1,2]`, `[2,3]`, `[1,2,1]`, `[2,1,2]`, `[1,2,1,2]`.

#### Code

```cpp
long long atMostKDistinct(const vector<int>& a, int k) {
    if (k < 0) return 0;
    unordered_map<int, int> count;
    long long total = 0;
    int l = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        count[a[r]]++;
        while ((int)count.size() > k) {
            if (--count[a[l]] == 0) count.erase(a[l]);
            l++;
        }
        total += r - l + 1;               // subarrays a[l..r], a[l+1..r], ..., a[r..r]
    }
    return total;
}

long long exactlyKDistinct(const vector<int>& a, int k) {
    return atMostKDistinct(a, k) - atMostKDistinct(a, k - 1);
}
```

```python
def at_most_sum(bits, s):
    """Subarrays of a 0/1 (or non-negative) array with sum at most s."""
    if s < 0:
        return 0
    l = total = window = 0
    for r, x in enumerate(bits):
        window += x
        while window > s:
            window -= bits[l]
            l += 1
        total += r - l + 1
    return total

def exactly_sum(bits, s):
    return at_most_sum(bits, s) - at_most_sum(bits, s - 1)
```

#### Complexity

Two linear passes: $O(n)$ time, $O(\text{distinct})$ space.

#### When the trick is valid

The subtraction needs the counted quantity to be monotone in the window: extending a window never decreases the number of distinct values, or the sum of non-negative numbers, or the count of odd numbers. For sums with negative numbers it fails; use the prefix-sum hash map instead (which counts exact sums directly).

#### Edge cases and bugs

- `atMost(K − 1)` with K = 0 must return 0, not run with a negative bound.
- Adding `r − l + 1` before shrinking counts invalid subarrays.
- Overflow: the count of subarrays is up to $n(n+1)/2$, about $5 \cdot 10^9$ for $n = 10^5$.

#### Variants

- Count "nice" subarrays: exactly K odd numbers (map each value to `x % 2`, then exact sum).
- Binary subarrays with sum S.
- A one-pass alternative keeps two left pointers (the leftmost and rightmost valid starts) and adds their gap.

Connects to: window with counts, variable-size window, prefix sum with hash map.

### questions
Q: How do you count subarrays with exactly K distinct integers?
A: Count subarrays with at most K distinct values and subtract those with at most K − 1. Each count uses a sliding window that, for each right end r, adds r − l + 1 after shrinking until the window has at most the allowed number of distinct values.

Q: Why is counting "exactly K" directly with one window hard?
A: For a fixed right end, the valid starts for "exactly K" form a band that ends before r, not a range ending at r, and both ends of the band move. "At most K" has valid starts forming the full range [l, r], which one pointer can track.

Q: Why do you add r − l + 1 in the at-most count?
A: After shrinking, a[l..r] is the longest valid window ending at r, and every shorter window ending at r is valid too, because removing elements can't increase the measured quantity. There are r − l + 1 such windows.

Q: When does exactly(K) = atMost(K) − atMost(K − 1) not work with a sliding window?
A: When the measured quantity isn't monotone, such as sums with negative numbers, because the at-most window can't be maintained by shrinking from the left. In that case count exact sums with a prefix-sum hash map.

### signals
- count subarrays with exactly K distinct values
- count subarrays with exactly K odd numbers or exactly sum S in a 0/1 array
- "exactly" counts where the "at most" version is a simple window
- the number of subarrays (not the longest one) under a monotone condition

### template
```cpp
// exactly(K) = atMost(K) - atMost(K - 1), for a monotone window measure.
template <class AtMost>
long long exactly(int k, AtMost atMost) {
    return atMost(k) - (k > 0 ? atMost(k - 1) : 0);
}

long long atMostCount(const vector<int>& a, int k) {    // example measure: sum of 0/1 values
    long long total = 0, window = 0;
    for (int l = 0, r = 0; r < (int)a.size(); r++) {
        window += a[r];                                // add a[r]
        while (window > k) window -= a[l++];           // shrink while invalid
        total += r - l + 1;                            // valid subarrays ending at r
    }
    return total;
}
```

## dsa.sliding-window.minimum-window-substring
name: "Minimum window substring"
importance: important
pattern: true
prereqs: [dsa.sliding-window.window-with-counts]
scope: "need and have counters"

### simple
Minimum window substring finds the shortest stretch of a text that contains every letter you need, with repeats. Imagine walking down a market street with a shopping list: you walk forward until your basket holds everything, then you drop items from the start of your route while the list is still covered. The shortest route that still covers the list is the answer.

### interview
- `need[c]` = required count of each character; `missing` (or `formed`) tracks how many requirements are not yet met.
- Expand `r`: decrement `need[s[r]]`; if it was positive, one requirement got satisfied (`missing--`).
- While `missing == 0`: record the window if shorter, then remove `s[l]`: increment `need[s[l]]`; if it becomes positive, a requirement broke (`missing++`); `l++`.
- **O(|s| + |t|)** time, **O(σ)** space. Store the best start and length, build the substring once at the end.
- Same shape: smallest subarray containing all K distinct values, shortest range covering all categories.

### deep
#### Intuition

This is a shortest-valid-window problem where "valid" means "covers every required character with multiplicity". The trick is making the validity check $O(1)$: rather than comparing two count tables each step, keep one number, `missing`, the total count of required characters not yet in the window. It changes only when a needed character enters or leaves.

#### Worked example

`s = "ADOBECODEBANC"`, `t = "ABC"`. Need A1 B1 C1, `missing = 3`.

| r | char | missing after adding | what happens |
|---|---|---|---|
| 0 | A | 2 | |
| 3 | B | 1 | |
| 5 | C | 0 | valid: record "ADOBEC" (6); dropping the A at index 0 breaks it |
| 9 | B | 1 | B was already covered, so nothing changes |
| 10 | A | 0 | valid from index 1: shrinking drops D, O, B, E (the B at 9 still covers), then the C at index 5 breaks it; nothing shorter than 6 |
| 12 | C | 0 | valid from index 6: shrinking records "EBANC" (5), then "BANC" (4); dropping the B at 9 breaks it |

Answer: **"BANC"**.

#### Code

```cpp
string minWindow(const string& s, const string& t) {
    array<int, 128> need{};
    for (char c : t) need[(unsigned char)c]++;
    int missing = t.size(), l = 0, bestStart = 0, bestLen = INT_MAX;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[(unsigned char)s[r]]-- > 0) missing--;  // s[r] satisfied a requirement
        while (missing == 0) {
            if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestStart = l; }
            if (++need[(unsigned char)s[l]] > 0) missing++;  // s[l] was required
            l++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}
```

```python
from collections import Counter

def min_window(s, t):
    need = Counter(t)
    missing = len(t)
    l, best = 0, (float("inf"), 0)
    for r, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        while missing == 0:
            best = min(best, (r - l + 1, l))
            need[s[l]] += 1
            if need[s[l]] > 0:
                missing += 1
            l += 1
    length, start = best
    return "" if length == float("inf") else s[start:start + length]
```

Characters not in `t` go negative in `need` and never affect `missing`, which is why a single table suffices.

#### Complexity

Each index enters and leaves the window once: $O(|s| + |t|)$ time. Space $O(\sigma)$.

#### Edge cases and bugs

- `t` longer than `s`: no window; the loop finds none and returns "".
- Duplicates in `t` ("AABC") must be counted, not just checked for presence.
- Building substrings inside the loop turns $O(n)$ into $O(n^2)$; store indices.
- Case sensitivity and non-letter characters: size the table for the full character set.

#### Variants

- Smallest subarray containing every distinct value of the array (need = all distinct values once).
- Smallest range covering elements from k lists: flatten to (value, list) pairs, sort, and run this window over list ids.
- Minimum window subsequence (order matters) is different: DP or two-pointer backtracking.

Connects to: window with counts, variable-size window, frequency counting, k-way merge (smallest range).

### questions
Q: How do you check in O(1) whether the current window contains all of t's characters?
A: Keep need counts for t's characters and a single counter missing, the number of required characters still absent. When a needed character enters with a positive need, missing drops by one; when one leaves and its need becomes positive, missing rises. The window is valid exactly when missing is 0.

Q: Why can one table hold both the needs and the window counts?
A: Store need − have in one array. Characters not in t start at 0 and go negative when they enter, which never changes missing. Only transitions across zero for required characters matter.

Q: What is the complexity of minimum window substring?
A: O(|s| + |t|) time, because each character of s enters and leaves the window at most once and t is scanned once to build the table. Space is O(alphabet size).

Q: How does the approach change if t can contain repeated characters?
A: It doesn't: need[c] holds the required multiplicity, and missing starts at the length of t. A window is valid only when every character appears at least as many times as in t.

### signals
- the smallest substring or subarray that contains all required items (with counts)
- "covers every character of t" or "contains all K categories"
- shortest range that includes at least one of each kind
- a shopping-list style requirement checked over a contiguous stretch

### template
```cpp
// Shortest window covering all requirements: need[] and a single "missing" counter.
pair<int, int> shortestCovering(const string& s, const string& t) {
    array<int, 128> need{};
    for (char c : t) need[(unsigned char)c]++;
    int missing = t.size(), l = 0, bestL = -1, bestLen = INT_MAX;
    for (int r = 0; r < (int)s.size(); r++) {
        if (need[(unsigned char)s[r]]-- > 0) missing--;      // a requirement got met
        while (missing == 0) {                              // valid: record, then shrink
            if (r - l + 1 < bestLen) bestLen = r - l + 1, bestL = l;
            if (++need[(unsigned char)s[l++]] > 0) missing++;  // a requirement broke
        }
    }
    return {bestL, bestLen};                                 // bestL == -1: no window
}
```

## dsa.sliding-window.sliding-window-maximum
name: "Sliding window maximum"
importance: advanced
prereqs: [dsa.monotonic.monotonic-deque]
scope: "monotonic deque solution"

### simple
To find the largest value in every window of size k, you keep a short line of candidates in decreasing order. A new value knocks out every smaller candidate behind it, because those can never be the maximum again, like a taller person joining a queue and hiding everyone shorter behind them. The front of the line is always the current maximum.

### interview
- Deque of **indices** whose values are strictly decreasing from front to back.
- For each `i`: pop from the back while `a[back] <= a[i]`; push `i`; pop the front if it is outside the window (`front <= i - k`); once `i >= k - 1`, the answer is `a[front]`.
- Each index is pushed and popped at most once: **O(n)** time, **O(k)** space.
- Alternatives: max-heap with lazy deletion (O(n log n)), balanced BST or multiset (O(n log k)), block prefix/suffix maxima (O(n), no deque).
- Store indices, not values, so you can tell when the front has left the window.

### questions
Q: Why does the monotonic deque give the sliding window maximum in O(n)?
A: Every index is pushed once and popped at most once, from either end. A smaller value that arrives before a larger one can never be a maximum again once the larger one is in the window, so removing it loses nothing, and the front always holds the current maximum.

Q: Why store indices instead of values in the deque?
A: You must know when the front element falls out of the window, which requires its position. Indices also give the values through a lookup, so nothing is lost.

Q: What are the alternatives to the deque, and their costs?
A: A max-heap of (value, index) with lazy removal of expired entries is O(n log n). A multiset with insert and erase per step is O(n log k). Splitting the array into blocks of size k and combining suffix maxima of one block with prefix maxima of the next is O(n) without a deque.

Q: Should the pop condition be a[back] <= a[i] or a[back] < a[i]?
A: Either gives correct maxima. Using <= removes equal older values, which keeps the deque smaller; using < keeps duplicates, which is needed if you must report which index holds the maximum under a tie rule.
