---
topic: dsa.monotonic
name: "Monotonic stack and deque"
subject: dsa
order: 15
prereqs: [dsa.stacks-queues]
---

## dsa.monotonic.monotonic-stack
name: "Monotonic stack"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "next and previous greater or smaller element"

### simple
A monotonic stack keeps its items in sorted order by throwing out any item that can never be useful again. Picture people standing in a line looking right: a tall newcomer blocks the view of everyone shorter behind them, so those shorter people now know who their "next taller person" is and can leave. One pass answers "who is the next bigger one?" for everybody.

### interview
- **Next greater element**: scan left to right; while the stack's top value is smaller than the current value, pop it and record the current value as its answer; push the current index. The stack stays **decreasing**.
- Variants by comparison and direction: next smaller (increasing stack), previous greater or smaller (read the top **before** pushing), strict versus non-strict for duplicates.
- Each index is pushed once and popped at most once: **O(n)** time, O(n) space.
- Store **indices**, so you can compute distances (days until a warmer temperature) and look up values.
- Circular arrays: loop over `2n` indices using `i % n`.
- Signals: "next greater/smaller", "how many days until", "span", "nearest larger to the left", visibility and blocking.

### deep
#### Intuition

For "next greater element", a brute force looks right from every index: $O(n^2)$. Notice that once a larger value appears, every smaller value before it has found its answer and will never be the answer for anything further right (the larger value blocks it). So you only keep elements still waiting for an answer, and they are always in decreasing order: that is the monotonic stack.

#### Worked example: next greater element

`a = 2 1 2 4 3`

| i | a[i] | pops (index → answer) | stack after (values) |
|---|---|---|---|
| 0 | 2 | | 2 |
| 1 | 1 | | 2 1 |
| 2 | 2 | 1 → 2 | 2 2 |
| 3 | 4 | 2 → 4, 2 → 4 | 4 |
| 4 | 3 | | 4 3 |

Answers: `4 2 4 -1 -1`. The first 2 found 4, not the later 2, because the comparison is strict (`<`).

#### Code

```cpp
// Next greater element to the right (-1 if none).
vector<int> nextGreater(const vector<int>& a) {
    int n = a.size();
    vector<int> ans(n, -1), st;                    // st holds indices, values decreasing
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.back()] < a[i]) {
            ans[st.back()] = a[i];
            st.pop_back();
        }
        st.push_back(i);
    }
    return ans;
}

// Days until a warmer temperature (distance to the next strictly greater value).
vector<int> dailyTemperatures(const vector<int>& t) {
    int n = t.size();
    vector<int> wait(n, 0), st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && t[st.back()] < t[i]) {
            wait[st.back()] = i - st.back();
            st.pop_back();
        }
        st.push_back(i);
    }
    return wait;
}
```

```python
def previous_smaller(a):
    """Index of the nearest element to the left that is strictly smaller, or -1."""
    ans, st = [-1] * len(a), []
    for i, x in enumerate(a):
        while st and a[st[-1]] >= x:     # pop everything not smaller than x
            st.pop()
        ans[i] = st[-1] if st else -1    # read the answer before pushing
        st.append(i)
    return ans

def next_greater_circular(a):
    n = len(a)
    ans, st = [-1] * n, []
    for i in range(2 * n):               # the second lap lets elements see the start
        x = a[i % n]
        while st and a[st[-1]] < x:
            ans[st.pop()] = x
        if i < n:
            st.append(i)
    return ans
```

#### Which stack for which question

| Question | Stack order (bottom to top) | Pop while | Answer read |
|---|---|---|---|
| next greater | decreasing | top < current | when popped |
| next smaller | increasing | top > current | when popped |
| previous greater | decreasing | top <= current | top after popping |
| previous smaller | increasing | top >= current | top after popping |

Swapping `<` and `<=` decides how equal values are treated (strictly greater versus greater or equal).

#### Complexity

$O(n)$ time: each index is pushed once and popped at most once. $O(n)$ space in the worst case (a strictly decreasing input for next greater).

#### Edge cases and bugs

- Storing values instead of indices loses positions (needed for distances and for duplicate handling).
- Getting strictness wrong with duplicates, which matters for counting problems (contribution technique).
- Elements left in the stack at the end have no answer; initialize answers to -1 or n.

#### Variants

- Stock span (previous greater or equal, count the distance).
- Largest rectangle in a histogram, maximal rectangle.
- Sum of subarray minimums (previous and next smaller).
- Remove k digits (greedy stack), 132 pattern (scan from the right with a stack).
- Trapping rain water (stack of decreasing heights, fill layer by layer).

Connects to: stack basics, largest rectangle in histogram, contribution technique, amortized analysis.

### questions
Q: How does a monotonic stack find the next greater element for every index in O(n)?
A: Scan left to right keeping indices whose values are decreasing and still waiting for an answer. When a larger value arrives, pop every smaller waiting index and record the new value as its answer, then push the current index. Each index is pushed and popped at most once.

Q: Why does the stack stay sorted?
A: Before pushing a value, you pop every value on top that it beats. So whatever remains under it is larger (for the next-greater version), and the stack is decreasing from bottom to top at all times.

Q: How do you get the previous smaller element instead?
A: Keep an increasing stack. For each index, pop while the top is greater than or equal to the current value; the remaining top, if any, is the previous smaller element. Record it, then push the current index.

Q: How do you handle a circular array?
A: Iterate over 2n positions using index i mod n, but only push indices during the first lap. During the second lap, elements near the end can find their next greater element at the beginning of the array.

Q: Why store indices instead of values?
A: Indices let you compute distances (days until warmer, span lengths), write answers into the right slots, and distinguish equal values. The value is always available as a[index].

### signals
- next greater or next smaller element for every position
- "how many days until a warmer day" or distance to the nearest larger value
- stock span, visibility, "who can see whom" in a line
- nearest element to the left or right that is larger or smaller
- O(n) required where the brute force looks right from every index

### template
```cpp
// Monotonic stack: for each i, resolve the waiting indices that a[i] beats.
vector<int> nextGreaterIndex(const vector<int>& a) {
    int n = a.size();
    vector<int> nxt(n, n), st;                       // n means "none"
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.back()] < a[i]) { // flip to > for next smaller
            nxt[st.back()] = i;                      // a[i] is the answer for the popped index
            st.pop_back();
        }
        // previous-greater-or-equal of i is st.back() here (if any)
        st.push_back(i);
    }
    return nxt;
}
```

## dsa.monotonic.largest-rectangle-in-histogram
name: "Largest rectangle in histogram"
importance: must
pattern: true
prereqs: [dsa.monotonic.monotonic-stack]
scope: "monotonic stack areas, maximal rectangle"

### simple
Given bars of different heights side by side, the largest rectangle you can draw inside them is limited by its shortest bar. For each bar, imagine it as the shortest one and stretch left and right until you hit a lower bar. A monotonic stack finds those left and right walls for every bar in one pass.

### interview
- For bar `i` as the minimum, the rectangle spans from just after the **previous smaller** bar to just before the **next smaller** bar: area `h[i] * (right - left - 1)`.
- One pass with an **increasing** stack: when a lower bar arrives, pop taller bars; for a popped bar, the current index is its right wall and the new top is its left wall.
- Append a sentinel height 0 at the end so every bar gets popped.
- **O(n)** time, O(n) space; brute force is O(n²).
- **Maximal rectangle** of 1s in a binary matrix: for each row, build heights of consecutive 1s above each column and run the histogram algorithm: **O(R · C)**.

### deep
#### Intuition

Any optimal rectangle has some shortest bar, and it extends as far as it can in both directions while every bar is at least that tall. So for every bar, compute how far it extends: the first lower bar on each side. A monotonic increasing stack gives both walls at the moment a bar is popped: the bar causing the pop is the first lower bar on the right, and the bar beneath it on the stack is the first lower (or equal) bar on the left.

#### Worked example

Heights `2 1 5 6 2 3`, with a sentinel 0 appended at index 6.

| i | h[i] | pops (bar: height × width) | stack (indices) after |
|---|---|---|---|
| 0 | 2 | | 0 |
| 1 | 1 | bar 0: 2 × 1 = 2 | 1 |
| 2 | 5 | | 1 2 |
| 3 | 6 | | 1 2 3 |
| 4 | 2 | bar 3: 6 × 1 = 6; bar 2: 5 × 2 = 10 | 1 4 |
| 5 | 3 | | 1 4 5 |
| 6 | 0 | bar 5: 3 × 1 = 3; bar 4: 2 × 4 = 8; bar 1: 1 × 6 = 6 | 6 |

Largest: **10** (bars 2 and 3 at height 5). When bar 2 is popped at i = 4, the stack top below it is index 1, so the width is `4 - 1 - 1 = 2`.

#### Code

```cpp
long long largestRectangle(vector<int> h) {
    h.push_back(0);                                   // sentinel flushes the stack
    vector<int> st;                                   // indices, heights increasing
    long long best = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!st.empty() && h[st.back()] >= h[i]) {
            long long height = h[st.back()];
            st.pop_back();
            int left = st.empty() ? -1 : st.back();   // previous smaller bar
            best = max(best, height * (i - left - 1)); // i is the next smaller bar
        }
        st.push_back(i);
    }
    return best;
}

long long maximalRectangle(const vector<vector<char>>& m) {
    if (m.empty()) return 0;
    vector<int> heights(m[0].size(), 0);
    long long best = 0;
    for (const auto& row : m) {
        for (int c = 0; c < (int)row.size(); c++)
            heights[c] = row[c] == '1' ? heights[c] + 1 : 0;  // consecutive 1s above
        best = max(best, largestRectangle(heights));
    }
    return best;
}
```

```python
def largest_rectangle(heights):
    h = heights + [0]
    st, best = [], 0
    for i, x in enumerate(h):
        while st and h[st[-1]] >= x:
            height = h[st.pop()]
            left = st[-1] if st else -1
            best = max(best, height * (i - left - 1))
        st.append(i)
    return best
```

#### Complexity

Each bar is pushed and popped once: $O(n)$ time, $O(n)$ space. Maximal rectangle: $O(R \cdot C)$ time, $O(C)$ space.

#### Equal heights

With `>=` in the pop condition, a bar is popped by an equal bar to its right, and its computed width stops early. That is fine: the last bar of an equal run is popped later with the full width, so the maximum is still found.

#### Edge cases and bugs

- Forgetting the sentinel leaves bars in the stack; you would need a second loop to process them.
- Width when the stack is empty after popping: the bar extends to the left edge, so `left = -1`.
- Overflow: height up to $10^4$ times width $10^5$ fits in 32 bits, but larger inputs need 64-bit.

#### Variants

- Maximal square in a binary matrix (DP is simpler).
- Count submatrices of all 1s (stack with running sums).
- Largest rectangle with divide and conquer or a segment tree for range minimum: $O(n \log n)$.

Connects to: monotonic stack, contribution technique, DP on grids (maximal square).

### questions
Q: What is the key idea behind the O(n) largest rectangle solution?
A: Every candidate rectangle is determined by its shortest bar, and it stretches from just after the previous shorter bar to just before the next shorter bar. An increasing monotonic stack gives both boundaries for a bar at the moment it is popped.

Q: When a bar is popped, how is its width computed?
A: The current index i is the first bar to its right that is lower, and the index now on top of the stack is the nearest lower-or-equal bar to its left (or −1 if the stack is empty). The width is i − left − 1.

Q: Why append a 0 at the end of the heights?
A: A bar of height 0 is lower than everything, so it pops every remaining bar and computes their areas. Without it, bars left on the stack at the end would need a separate cleanup loop.

Q: How do you find the largest rectangle of 1s in a binary matrix?
A: Treat each row as the base of a histogram whose heights count consecutive 1s above each column, updating heights row by row. Run the histogram algorithm on each row and take the maximum, for O(R · C) total.

### signals
- the largest rectangle under a bar chart or skyline
- the largest all-1s rectangle in a binary matrix
- area determined by the minimum height over a range times its width
- for each element, how far it extends while being the minimum

### template
```cpp
// For each index, the widest range where it is the minimum: area = h * width.
long long bestAreaAsMinimum(vector<int> h) {
    h.push_back(0);                                     // sentinel
    vector<int> st;                                     // increasing heights
    long long best = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!st.empty() && h[st.back()] >= h[i]) {
            int mid = st.back(); st.pop_back();         // h[mid] is the minimum of (left, i)
            int left = st.empty() ? -1 : st.back();
            best = max(best, 1LL * h[mid] * (i - left - 1));
        }
        st.push_back(i);
    }
    return best;
}
```

## dsa.monotonic.contribution-technique
name: "Contribution technique"
importance: important
pattern: true
prereqs: [dsa.monotonic.monotonic-stack]
scope: "sum of subarray minimums, subarray ranges"

### simple
Instead of looking at every subarray and finding its minimum, flip the question: for each element, count how many subarrays have it as their minimum. It is like crediting each player with the matches they won instead of replaying every match. The element's contribution is its value times that count, and adding contributions gives the total.

### interview
- Sum over all subarrays of min = Σ `a[i] × (number of subarrays where a[i] is the minimum)`.
- That count is `left[i] × right[i]`: `left` = distance to the previous smaller element, `right` = distance to the next smaller element. Both from monotonic stacks: **O(n)**.
- **Ties**: use strictly smaller on one side and smaller-or-equal on the other, so each subarray's minimum is credited to exactly one index.
- Sum of subarray ranges = Σ max − Σ min, each by the contribution technique.
- Take results modulo 10⁹ + 7 when asked; counts can reach n²/4.
- Also works for "sum of subarray maximums", "number of subarrays where a[i] is the max", and similar.

### deep
#### Intuition

There are $n(n+1)/2$ subarrays, so computing each minimum is at least quadratic. But each subarray's minimum sits at some index, so the total equals a sum over indices. For index $i$, the subarrays where $a_i$ is the minimum start anywhere after the previous smaller element and end anywhere before the next smaller element. Choices of start times choices of end gives the count.

#### Worked example: sum of subarray minimums of `3 1 2 4`

| i | a[i] | previous smaller (index) | next smaller (index) | left = i − prev | right = next − i | contribution |
|---|---|---|---|---|---|---|
| 0 | 3 | −1 | 1 | 1 | 1 | 3 × 1 × 1 = 3 |
| 1 | 1 | −1 | 4 (none) | 2 | 3 | 1 × 2 × 3 = 6 |
| 2 | 2 | 1 | 4 (none) | 1 | 2 | 2 × 1 × 2 = 4 |
| 3 | 4 | 2 | 4 (none) | 1 | 1 | 4 × 1 × 1 = 4 |

Total **17**. Check by listing: [3]3, [1]1, [2]2, [4]4, [3,1]1, [1,2]1, [2,4]2, [3,1,2]1, [1,2,4]1, [3,1,2,4]1 = 17.

#### Code

```cpp
long long sumSubarrayMins(const vector<int>& a) {
    const long long MOD = 1'000'000'007;
    int n = a.size();
    vector<int> prevLess(n, -1), nextLessEq(n, n), st;
    for (int i = 0; i < n; i++) {                   // previous strictly smaller
        while (!st.empty() && a[st.back()] >= a[i]) st.pop_back();
        prevLess[i] = st.empty() ? -1 : st.back();
        st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {              // next smaller or equal
        while (!st.empty() && a[st.back()] > a[i]) st.pop_back();
        nextLessEq[i] = st.empty() ? n : st.back();
        st.push_back(i);
    }
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long count = 1LL * (i - prevLess[i]) * (nextLessEq[i] - i);
        total = (total + a[i] % MOD * (count % MOD)) % MOD;
    }
    return total;
}
```

```python
def sum_subarray_extreme(a, want_min=True):
    """Sum over all subarrays of their minimum (or maximum), with the tie rule applied."""
    n = len(a)
    better = (lambda x, y: x < y) if want_min else (lambda x, y: x > y)
    left, right, st = [0] * n, [0] * n, []
    for i in range(n):                           # previous strictly better
        while st and not better(a[st[-1]], a[i]):
            st.pop()
        left[i] = i - (st[-1] if st else -1)
        st.append(i)
    st = []
    for i in range(n - 1, -1, -1):               # next better or equal
        while st and better(a[i], a[st[-1]]):
            st.pop()
        right[i] = (st[-1] if st else n) - i
        st.append(i)
    return sum(a[i] * left[i] * right[i] for i in range(n))

def sum_subarray_ranges(a):
    return sum_subarray_extreme(a, False) - sum_subarray_extreme(a, True)
```

#### The tie rule

With `2 2`, the subarray `[2, 2]` has two minimal positions. If both sides used "strictly smaller", both indices would claim it; if both used "smaller or equal", neither would. Using strict on one side and non-strict on the other assigns it to exactly one index (here the left one extends right over equal values).

#### Complexity

Two monotonic stack passes and one sum: $O(n)$ time, $O(n)$ space.

#### Edge cases and bugs

- Double counting with duplicates (see the tie rule).
- Overflow: $a_i \le 3 \cdot 10^4$ and counts up to $n^2/4 \approx 2.5 \cdot 10^9$ for $n = 10^5$: use 64-bit and take the modulus.

#### Variants

- Sum of subarray maximums, sum of subarray ranges (max − min).
- Count subarrays where a given element is the maximum (a building block of harder problems).
- Sum of (min × sum) over subarrays: combine with prefix sums of prefix sums.

Connects to: monotonic stack, largest rectangle in histogram, prefix sums.

### questions
Q: How do you sum the minimum of every subarray in O(n)?
A: Count, for each element, how many subarrays have it as the minimum: (i − previous smaller index) × (next smaller index − i). Multiply by the element and add over all indices. Previous and next smaller indices come from two monotonic stack passes.

Q: Why does the count equal left × right?
A: A subarray has a[i] as its minimum exactly when it contains i and doesn't reach the nearest smaller element on either side. Its start can be any of the left positions after the previous smaller element, and its end any of the right positions before the next smaller element, independently.

Q: How do you avoid double counting when values repeat?
A: Use a strict comparison on one side and a non-strict one on the other: for example, previous strictly smaller and next smaller-or-equal. Then a subarray with several equal minimums is credited to exactly one of them.

Q: How do you compute the sum of ranges (max − min) over all subarrays?
A: Compute the sum of subarray maximums and the sum of subarray minimums separately with the contribution technique, then subtract. Each is O(n), so the total is O(n).

### signals
- sum or count over all subarrays of their minimum or maximum
- "sum of subarray ranges" or of max − min
- for each element, in how many subarrays is it the smallest (or largest)
- quadratically many subarrays but an O(n) requirement

### template
```cpp
// Contribution: each a[i] is the minimum of (i - L[i]) * (R[i] - i) subarrays.
long long sumOfMins(const vector<int>& a) {
    int n = a.size();
    vector<int> L(n), R(n), st;
    for (int i = 0; i < n; i++) {                                // previous strictly smaller
        while (!st.empty() && a[st.back()] >= a[i]) st.pop_back();
        L[i] = st.empty() ? -1 : st.back();
        st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {                           // next smaller or equal
        while (!st.empty() && a[st.back()] > a[i]) st.pop_back();
        R[i] = st.empty() ? n : st.back();
        st.push_back(i);
    }
    long long total = 0;
    for (int i = 0; i < n; i++) total += 1LL * a[i] * (i - L[i]) * (R[i] - i);
    return total;                                                // take % MOD if required
}
```

## dsa.monotonic.monotonic-deque
name: "Monotonic deque"
importance: important
pattern: true
prereqs: [dsa.stacks-queues.queue-and-deque-basics]
scope: "sliding window maximum, shortest subarray with sum at least K"

### simple
A monotonic deque is a monotonic stack that can also drop items from the front when they get too old. For the largest value in a sliding window, it keeps a short line of candidates in decreasing order: newcomers push out weaker candidates from the back, and candidates that left the window fall off the front. The front is always the answer for the current window.

### interview
- Deque of indices with values in decreasing order (for maximum). For each `i`: pop from the **back** while `a[back] <= a[i]`; push `i`; pop from the **front** if it left the window; read the max at the front.
- **O(n)**: each index enters and leaves once.
- **Shortest subarray with sum at least K** (negatives allowed): deque of prefix-sum indices kept **increasing**; pop from the front while `P[i] - P[front] >= K` (record the length); pop from the back while `P[back] >= P[i]`. O(n).
- Also: DP optimizations where `dp[i] = max(dp[j]) + cost` over a sliding range of j (constrained subsequence sum, jump game VI).
- Min version: flip the comparisons (increasing deque).

### deep
#### Intuition

In a window, an element that is smaller than a newer element can never be the maximum again: the newer one is larger and will stay in the window at least as long. So discard it from the back. The remaining candidates are in decreasing order of value and increasing order of index; the oldest (front) is the largest, and it is removed once it falls out of the window.

#### Worked example: window maximum, k = 3

`a = 1 3 -1 -3 5 3 6 7`

| i | a[i] | deque after (values) | window | max |
|---|---|---|---|---|
| 0 | 1 | 1 | | |
| 1 | 3 | 3 | | |
| 2 | -1 | 3 -1 | 1 3 -1 | 3 |
| 3 | -3 | 3 -1 -3 | 3 -1 -3 | 3 |
| 4 | 5 | 5 | -1 -3 5 | 5 |
| 5 | 3 | 5 3 | -3 5 3 | 5 |
| 6 | 6 | 6 | 5 3 6 | 6 |
| 7 | 7 | 7 | 3 6 7 | 7 |

At i = 4, the 5 pops everything; the 3 (index 1) would also have expired from the front.

#### Code

```cpp
vector<int> maxSlidingWindow(const vector<int>& a, int k) {
    deque<int> dq;                                     // indices, values decreasing
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();  // dominated
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();       // expired
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}

// Shortest non-empty subarray with sum >= K (values may be negative), -1 if none.
int shortestSubarray(const vector<int>& a, long long K) {
    int n = a.size(), best = INT_MAX;
    vector<long long> P(n + 1, 0);
    for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
    deque<int> dq;                                     // prefix indices, P increasing
    for (int i = 0; i <= n; i++) {
        while (!dq.empty() && P[i] - P[dq.front()] >= K) {
            best = min(best, i - dq.front());          // a later i can't do better with it
            dq.pop_front();
        }
        while (!dq.empty() && P[dq.back()] >= P[i]) dq.pop_back();  // i is a better start
        dq.push_back(i);
    }
    return best == INT_MAX ? -1 : best;
}
```

```python
from collections import deque

def max_sliding_window(a, k):
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(a[dq[0]])
    return out

def constrained_subsequence_sum(a, k):
    """Max sum of a subsequence where consecutive picks are at most k apart."""
    dp, dq = [0] * len(a), deque()             # dq: indices with dp decreasing
    for i, x in enumerate(a):
        if dq and dq[0] < i - k:
            dq.popleft()
        dp[i] = x + max(0, dp[dq[0]] if dq else 0)
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return max(dp)
```

#### Why the shortest-subarray deque works

For a start index $j$, once some end $i$ satisfies $P_i - P_j \ge K$, later ends only give longer subarrays for that $j$, so $j$ can be popped from the front after recording. And if a newer index $i$ has $P_i \le P_{back}$, then $i$ is a better start than `back` for every future end (smaller prefix, shorter length), so `back` is popped.

#### Complexity

$O(n)$ time for all versions; $O(k)$ or $O(n)$ space.

#### Edge cases and bugs

- Pushing values instead of indices makes expiry impossible to detect.
- Checking expiry before pushing versus after: either works if the condition uses the right index.
- In the shortest-subarray problem, forgetting the empty prefix `P[0] = 0`.

Connects to: sliding window maximum, monotonic stack, prefix sums, DP optimization.

### questions
Q: How does a monotonic deque give the sliding window maximum in O(n)?
A: Keep indices in the deque with decreasing values. A new element removes smaller elements from the back because they can never be the maximum again, and the front is removed when it leaves the window. The front is always the current maximum, and each index enters and leaves once.

Q: Why can you discard an older element that is smaller than a newer one?
A: The newer element is larger and stays in the window at least as long as the older one. So whenever the older one is in the window, the newer one beats it, and the older one can never be the answer.

Q: How do you find the shortest subarray with sum at least K when numbers can be negative?
A: Use prefix sums and a deque of prefix indices with increasing prefix values. For each end i, pop from the front while P[i] − P[front] ≥ K, recording lengths; then pop from the back any index whose prefix is at least P[i], and push i. It runs in O(n).

Q: Where do monotonic deques appear in dynamic programming?
A: In transitions like dp[i] = a[i] + max(dp[j]) for j in the last k positions. The deque maintains the maximum of dp over a sliding window of j, cutting the cost from O(n · k) to O(n).

### signals
- maximum or minimum of every sliding window
- dp[i] depends on the best value among the previous k positions
- shortest subarray with sum at least K when values can be negative
- a queue where old items expire and dominated items can be dropped

### template
```cpp
// Monotonic deque over a sliding window of size k: front = index of the current max.
vector<int> windowMax(const vector<int>& a, int k) {
    deque<int> dq;
    vector<int> res;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();  // drop dominated (>= for min)
        dq.push_back(i);
        while (dq.front() <= i - k) dq.pop_front();                 // drop expired
        if (i >= k - 1) res.push_back(a[dq.front()]);               // best in the window
    }
    return res;
}
```

## dsa.monotonic.greedy-stack
name: "Greedy stack"
importance: important
prereqs: [dsa.monotonic.monotonic-stack]
scope: "remove K digits, remove duplicate letters"

### simple
A greedy stack builds the smallest (or largest) possible sequence by letting each new item push out worse items before it, while that is still allowed. To make a number as small as possible by deleting k digits, a smaller digit arriving should replace a bigger digit just before it, like letting a shorter person move ahead in a photo line. The stack keeps the best prefix found so far.

### interview
- **Remove K digits** (smallest result): for each digit, while `k > 0` and the top is larger than it, pop (one deletion); push. Remove leftovers from the end if `k` remains; strip leading zeros. O(n).
- Greedy reasoning: an earlier position matters more, so a smaller digit should come as early as possible.
- **Remove duplicate letters** (smallest subsequence with each letter once): skip letters already in the stack; pop a larger top only if it **appears again later** (track last occurrence). O(n).
- **Largest number from k digits**, **most competitive subsequence** (keep k items: pop while `remaining + stackSize > k`).
- The stack ends up increasing (for smallest) with pops limited by a budget or a "can I get it back later" check.

### questions
Q: How do you remove k digits from a number to make it as small as possible?
A: Scan digits with a stack. While deletions remain and the top digit is larger than the current one, pop it, since a smaller digit earlier gives a smaller number. Push the current digit. If deletions remain at the end, remove digits from the end, then strip leading zeros (returning "0" if nothing is left).

Q: Why is removing a larger digit before a smaller one always right?
A: Numbers of equal length compare by their first differing digit. Replacing a larger digit at an earlier position with the smaller digit that follows it makes the number smaller no matter what comes later, so the greedy choice is safe.

Q: How does "remove duplicate letters" decide whether it can pop a letter?
A: It pops a larger letter from the top only if that letter occurs again later in the string, so it can be added back in a better position. It also skips a letter already in the stack. Last-occurrence indices and an in-stack set make each check O(1).

Q: How do you pick the lexicographically smallest subsequence of length k?
A: Scan with a stack, and while the top is larger than the current element and there are enough elements left to still reach length k (remaining + stack size > k), pop. Push if the stack has fewer than k elements.
