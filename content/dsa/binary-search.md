---
topic: dsa.binary-search
name: "Binary search"
subject: dsa
order: 7
prereqs: [dsa.arrays]
---

## dsa.binary-search.classic-binary-search
name: "Classic binary search"
importance: must
pattern: true
scope: "invariants, safe mid calculation, loop conditions"

### simple
Binary search finds a value in a sorted list by checking the middle and throwing away the half that cannot contain it. It is how you look up a word in a paper dictionary: open near the middle, see whether your word comes before or after, and repeat on the right half. Each check halves what is left, so even a million items need only about 20 checks.

### interview
- Requires a **sorted** array (or any monotonic condition). **O(log n)** time, **O(1)** space iteratively.
- Closed interval: `lo = 0, hi = n - 1, while (lo <= hi)`; on a miss, `lo = mid + 1` or `hi = mid - 1`.
- Safe midpoint: `mid = lo + (hi - lo) / 2` avoids overflow of `lo + hi` in fixed-width integers.
- State the **invariant**: "if the target exists, it is in `[lo, hi]`". Every update must preserve it and shrink the range.
- Most bugs are infinite loops (the range doesn't shrink) or off-by-one ends; test with 0, 1 and 2 elements.
- Library: `std::binary_search` (found or not) and `std::lower_bound` / `std::upper_bound` (positions), all O(log n) on a sorted range.

### deep
#### Intuition

In a sorted array, comparing the target with the middle element tells you which half it must be in. Discarding the other half each time means the range goes $n, n/2, n/4, \dots, 1$: about $\log_2 n$ steps. For $n = 10^9$ that is 30 comparisons.

#### The invariant

Write down what the pointers mean and keep it true.

- **Closed** `[lo, hi]`: the target, if present, is between `lo` and `hi` inclusive. The range is empty when `lo > hi`, so loop while `lo <= hi`. Updates: `hi = mid - 1` or `lo = mid + 1` (mid is ruled out).
- **Half-open** `[lo, hi)`: loop while `lo < hi`; updates `hi = mid` or `lo = mid + 1`. This is the natural form for lower bound.

Mixing the two styles (closed loop condition with a half-open update) is the usual cause of infinite loops.

#### Worked example

Find 23 in `2 5 8 12 16 23 38 56 72 91` (indices 0 to 9).

| lo | hi | mid | a[mid] | action |
|---|---|---|---|---|
| 0 | 9 | 4 | 16 | 16 < 23: lo = 5 |
| 5 | 9 | 7 | 56 | 56 > 23: hi = 6 |
| 5 | 6 | 5 | 23 | found at 5 |

#### Code

```cpp
int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;           // target is in [lo, hi] if present
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;             // no overflow
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;        // target is right of mid
        else hi = mid - 1;                        // target is left of mid
    }
    return -1;                                    // lo is now the insertion point
}
```

Time $O(\log n)$, space $O(1)$ (a recursive version uses $O(\log n)$ stack).

#### The overflow detail

With 32-bit ints, `(lo + hi) / 2` overflows when `lo + hi > 2^{31} - 1`, which happens for arrays over about a billion elements, and more often when searching over a value range. `lo + (hi - lo) / 2` never overflows. C++20's `std::midpoint(lo, hi)` computes it safely too.

#### Edge cases and bugs

- Empty array: `hi = -1`, loop doesn't run.
- `while (lo < hi)` with closed updates misses the last candidate.
- `lo = mid` in a `lo < hi` loop with `mid` rounded down can loop forever when `hi = lo + 1`; round up (`mid = lo + (hi - lo + 1) / 2`) when you update with `lo = mid`.
- After a failed search in the closed form, `lo` is where the target would be inserted.

#### Variants

- Duplicates: which occurrence? Use lower and upper bound.
- Search on a condition instead of equality: binary search on the answer.
- Unknown length (infinite stream): double `hi` until it passes the target (exponential search), then search: $O(\log p)$ for position $p$.
- Search in a rotated array, peak finding, searching a matrix: the array isn't fully sorted, but one comparison still rules out half.

Connects to: lower and upper bound, binary search on the answer, BST search, bisection on real numbers.

### questions
Q: Why is binary search O(log n)?
A: Each comparison with the middle element eliminates half of the remaining range. Starting from n elements, after k steps n / 2^k remain, which reaches 1 when k = log₂ n.

Q: Why write mid = lo + (hi − lo) / 2 instead of (lo + hi) / 2?
A: lo + hi can exceed the largest int and overflow when both are large, giving a negative mid. lo + (hi − lo) / 2 computes the same value without ever exceeding hi.

Q: How do you choose between while (lo <= hi) and while (lo < hi)?
A: It depends on the interval you maintain. A closed interval [lo, hi] is empty only when lo > hi, so loop while lo <= hi and move to mid ± 1. A half-open [lo, hi) is empty when lo == hi, so loop while lo < hi and set hi = mid.

Q: What causes infinite loops in binary search, and how do you prevent them?
A: An update that doesn't shrink the range, typically lo = mid when mid rounds down to lo. Either always move past mid (mid + 1 or mid − 1) or round mid up when you assign lo = mid. Tracing a two-element range catches it.

Q: Where does lo end up after an unsuccessful closed-interval search?
A: At the first index whose value is greater than the target, which is where the target would be inserted to keep the array sorted. hi ends at lo − 1.

### signals
- a sorted array and a lookup that must beat O(n)
- "O(log n)" required in the problem statement
- find a value or its position in sorted data
- repeated membership tests on data that is sorted once

### template
```cpp
// Closed-interval binary search. Invariant: the answer, if any, lies in [lo, hi].
int search(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {                      // non-empty range
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;   // found
        if (a[mid] < target) lo = mid + 1;  // discard the left half, mid included
        else hi = mid - 1;                  // discard the right half, mid included
    }
    return -1;                              // lo = insertion point
}
```

## dsa.binary-search.lower-and-upper-bound
name: "Lower and upper bound"
importance: must
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "first and last occurrence, insert position"

### simple
Lower bound finds the first position whose value is at least your target, and upper bound finds the first position whose value is greater than it. Picture a bookshelf sorted by year: lower bound is where the first 2020 book starts, upper bound is where the 2020 books end. The gap between them is how many 2020 books there are.

### interview
- `lower_bound(x)`: first index `i` with `a[i] >= x` (or `n`). `upper_bound(x)`: first index with `a[i] > x`.
- First occurrence of `x`: `lower_bound(x)` if it is in range and equals `x`. Last occurrence: `upper_bound(x) - 1`. Count of `x`: `upper_bound(x) - lower_bound(x)`.
- Insert position that keeps the array sorted: `lower_bound(x)`.
- Half-open search: `lo = 0, hi = n, while (lo < hi)`; `if (a[mid] < x) lo = mid + 1; else hi = mid;` (use `<=` for upper bound).
- Library: `std::lower_bound` / `std::upper_bound` return iterators (subtract `begin()` for an index); `std::equal_range` returns both at once.
- General idea: find the **first index where a monotone condition becomes true**.

### deep
#### Intuition

Think of a Boolean array `a[i] >= x`. On sorted data it looks like `F F F T T T`: once true, it stays true. Lower bound is the position of the first `T`. Every "find the first/last" binary search is this same question with a different condition, which is why lower bound is the most reusable form.

#### Worked example

`a = 1 2 2 2 5 7`, `x = 2`.

Lower bound (first `a[i] >= 2`), half-open `[0, 6)`:

| lo | hi | mid | a[mid] | a[mid] < 2? | update |
|---|---|---|---|---|---|
| 0 | 6 | 3 | 2 | no | hi = 3 |
| 0 | 3 | 1 | 2 | no | hi = 1 |
| 0 | 1 | 0 | 1 | yes | lo = 1 |

Result 1. Upper bound (first `a[i] > 2`) gives 4. Count of 2s: 4 − 1 = 3. Last occurrence: 3.

#### Code

```cpp
int lowerBound(const vector<int>& a, int x) {   // first i with a[i] >= x
    int lo = 0, hi = a.size();                   // answer in [lo, hi]; hi = n means none
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) lo = mid + 1;            // a[mid] is too small: answer is right
        else hi = mid;                           // a[mid] qualifies: answer is mid or left
    }
    return lo;
}

int upperBound(const vector<int>& a, int x) {   // first i with a[i] > x
    int lo = 0, hi = a.size();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

pair<int, int> firstAndLast(const vector<int>& a, int x) {
    int first = lowerBound(a, x);
    if (first == (int)a.size() || a[first] != x) return {-1, -1};
    return {first, upperBound(a, x) - 1};
}
```

Each search is $O(\log n)$; the count of a value takes two searches.

#### Floor and ceiling of a value

- Ceiling (smallest element ≥ x): `a[lower_bound(x)]` if it exists.
- Floor (largest element ≤ x): `a[upper_bound(x) - 1]` if `upper_bound(x) > 0`.
- Strictly smaller: `a[lower_bound(x) - 1]`; strictly larger: `a[upper_bound(x)]`.

#### Edge cases and bugs

- `hi = n` (not `n - 1`): the answer can be "past the end".
- Dereferencing the result without checking `== n`.
- Using `lo <= hi` with `hi = mid` loops forever.
- For descending arrays, flip the comparison or search the negated values.

#### Variants

- Search insert position, count occurrences, closest element to x (compare the neighbors around lower bound).
- Find the k closest elements: lower bound, then expand two pointers, or binary search the left edge of the window.
- H-index on a sorted array: the first index where `a[i] >= n - i`.
- Any "first position where a condition flips" (first bad version).

Connects to: classic binary search, binary search on the answer, ordered maps (floor and ceiling), BST floor and ceiling.

### questions
Q: What do lower_bound and upper_bound return?
A: lower_bound(x) is the first position whose value is at least x, and upper_bound(x) is the first position whose value is greater than x. Both return the end position when no such element exists. The elements equal to x are exactly those between them.

Q: How do you find the first and last positions of a value in a sorted array in O(log n)?
A: The first position is lower_bound(x), if it is in range and holds x. The last position is upper_bound(x) − 1. That is two binary searches, O(log n) in total.

Q: How do you count occurrences of x in a sorted array?
A: upper_bound(x) − lower_bound(x). This works even when x is absent, where both return the same index and the count is 0.

Q: Why is the half-open form with hi = n convenient for lower bound?
A: The answer can be n, meaning every element is smaller than x. Starting with hi = n makes that a valid result, and the loop while lo < hi with hi = mid never skips the candidate at mid.

Q: How do you find the floor of x (the largest element at most x)?
A: Compute i = upper_bound(x). If i is 0, no element is at most x; otherwise the floor is a[i − 1].

### signals
- first or last occurrence of a value in sorted data with duplicates
- insert position that keeps an array sorted
- count how many elements are below, at most, or equal to a value
- the first index where a monotone condition becomes true ("first bad version")
- closest value, floor or ceiling in a sorted array

### template
```cpp
// First index in [lo, hi) where pred(i) is true; pred must be F...F T...T. Returns hi if none.
template <class Pred>
int firstTrue(int lo, int hi, Pred pred) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (pred(mid)) hi = mid;   // mid qualifies: the answer is mid or to its left
        else lo = mid + 1;         // mid fails: the answer is to its right
    }
    return lo;
}
// lower_bound: firstTrue(0, n, [&](int i) { return a[i] >= x; })
// upper_bound: firstTrue(0, n, [&](int i) { return a[i] > x; })
```

## dsa.binary-search.rotated-sorted-arrays
name: "Rotated sorted arrays"
importance: must
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "search, find minimum, the duplicates case"

### simple
A rotated sorted array is a sorted list that was cut once and had its two pieces swapped, like a clock face read starting from 4 o'clock. It is no longer fully sorted, but if you split it anywhere, at least one half is still in order. Binary search works by checking which half is in order and whether your target fits inside it.

### interview
- In a rotated array (distinct values), for any `mid`, one of `[lo, mid]` and `[mid, hi]` is sorted.
- **Search**: if `a[lo] <= a[mid]` the left half is sorted; go left if `a[lo] <= target < a[mid]`, else right. Otherwise the right half is sorted; go right if `a[mid] < target <= a[hi]`, else left.
- **Find minimum**: compare `a[mid]` with `a[hi]`: if `a[mid] > a[hi]`, the minimum is right of `mid` (`lo = mid + 1`); else it is at `mid` or left (`hi = mid`).
- The index of the minimum is the rotation count.
- **Duplicates**: when `a[mid] == a[hi]` you can't tell which side is sorted; shrink with `hi--`. Worst case becomes **O(n)** (for example all equal except one).
- Distinct values: **O(log n)** time, **O(1)** space.

### deep
#### Intuition

Rotation creates one "drop" where a large value is followed by a small one. Any interval that doesn't contain the drop is sorted. Since the drop is in at most one of the two halves around `mid`, the other half is sorted, and for a sorted range you can test "is the target inside?" by comparing with its ends.

#### Worked example: search for 0

`a = 4 5 6 7 0 1 2`

| lo | hi | mid | a[mid] | sorted half | target inside? | update |
|---|---|---|---|---|---|---|
| 0 | 6 | 3 | 7 | left (4..7) | 4 <= 0 < 7? no | lo = 4 |
| 4 | 6 | 5 | 1 | left (0..1) | 0 <= 0 < 1? yes | hi = 4 |
| 4 | 4 | 4 | 0 | found | | return 4 |

#### Code

```cpp
int searchRotated(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[lo] <= a[mid]) {                          // left half [lo, mid] is sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                        // right half [mid, hi] is sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}

int findMin(const vector<int>& a) {                     // works with duplicates too
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > a[hi]) lo = mid + 1;               // the drop is right of mid
        else if (a[mid] < a[hi]) hi = mid;              // mid..hi is sorted: min at mid or left
        else hi--;                                      // equal: can't tell, discard hi safely
    }
    return a[lo];
}
```

#### Why compare with `a[hi]` for the minimum

Comparing with `a[hi]` works for every rotation, including zero rotation. Comparing with `a[lo]` fails on an unrotated array: `a[mid] >= a[lo]` would push the search right, away from the minimum at index 0.

#### The duplicates case

With `a = 1 1 1 0 1`, `a[lo] = a[mid] = a[hi] = 1`: the drop could be on either side. Dropping `hi` is safe because `a[mid]` equals it, so the minimum value survives. But in the worst case this removes one element per step: $O(n)$. No algorithm can do better in the worst case, since finding the single 0 among 1s requires looking at every position.

#### Edge cases and bugs

- `a[lo] <= a[mid]` must be `<=`, not `<`: when `lo == mid`, the one-element left half is sorted.
- The strict and non-strict comparisons in the "target inside?" tests must match the half's inclusive ends.
- Arrays of length 1 and 2, and unrotated arrays, are the tests to run.

#### Variants

- Search with duplicates: when `a[lo] == a[mid] == a[hi]`, shrink both ends; otherwise as above.
- Find the rotation count: the index of the minimum.
- Search after finding the pivot: binary search one of the two sorted pieces.

Connects to: classic binary search, peak finding (another "partially sorted" search).

### questions
Q: How do you search for a target in a rotated sorted array in O(log n)?
A: At each step, one half around mid is sorted: the left half if a[lo] <= a[mid], otherwise the right half. If the target lies within the sorted half's range, search there; otherwise search the other half.

Q: How do you find the minimum of a rotated sorted array?
A: Compare a[mid] with a[hi]. If a[mid] > a[hi], the drop, and so the minimum, is to the right of mid; otherwise the minimum is at mid or to its left. Loop while lo < hi and return a[lo].

Q: Why do duplicates make the problem O(n) in the worst case?
A: When a[lo], a[mid] and a[hi] are all equal, the comparison gives no information about which side holds the drop, so you can only discard one element (hi−−). An array of all equal values except one hidden smaller value forces examining nearly every element.

Q: How do you find how many times a sorted array was rotated?
A: The rotation count equals the index of the minimum element, which you find with the a[mid] versus a[hi] binary search.

Q: Why compare a[mid] with a[hi] rather than a[lo] when looking for the minimum?
A: Comparing with a[hi] correctly handles the unrotated case, where the minimum is at index 0. With a[lo], an unrotated array looks like "left half sorted, go right", which moves away from the minimum.

### signals
- a sorted array that has been rotated or shifted by an unknown amount
- find the minimum, maximum or the pivot of a rotated sequence
- search in a "circularly sorted" list in O(log n)
- a sorted log that wrapped around at some point

### template
```cpp
// Rotated search: decide which half is sorted, then test whether the target fits in it.
int rotatedSearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[lo] <= a[mid]) {                                 // [lo, mid] sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                               // [mid, hi] sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```

## dsa.binary-search.binary-search-on-the-answer
name: "Binary search on the answer"
importance: must
pattern: true
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "monotonic predicate, minimize the maximum or maximize the minimum"

### simple
Sometimes the thing to search for is the answer itself, not a position in an array. If you can quickly check "is speed 5 fast enough?", and every faster speed is also fast enough, you can binary search on the speed. It is like tuning an oven: try the middle temperature, and you know which half of the dial to keep.

### interview
- Define a **monotone predicate** `ok(x)`: once true, true for all larger x (or all smaller). Binary search the smallest (or largest) x where it holds.
- Pick bounds: `lo` = smallest possible answer, `hi` = one that is surely feasible (for example the max element, the total sum, 10⁹).
- Total cost: **O(log(range) × cost of ok)**, typically O(n log(sum)).
- **Minimize the maximum** (split array so the largest part sum is smallest, ship within D days) and **maximize the minimum** (place k items as far apart as possible) are the classic shapes.
- Write `ok` as a greedy check: "with capacity x, how many groups do I need?"
- Watch overflow in `ok` (sums) and in `mid` over large ranges.

### deep
#### Intuition

Many optimization problems are hard to solve directly but easy to **check**: "can the packages be shipped in D days if the ship holds at most C?" is a greedy pass. If the check is monotone in C (a bigger ship never hurts), the answers look like `F F F T T T` over C, and the optimum is the first `T`. Binary search finds it with $\log(\text{range})$ checks.

#### Worked example: ship within D days

Weights `3 2 2 4 1 4` in order, D = 3 days. Capacity must be at least the heaviest package (4) and at most the total (16).

Check for capacity C: fill a day greedily; start a new day when the next package doesn't fit.

| lo | hi | mid | days needed with mid | ok? | update |
|---|---|---|---|---|---|
| 4 | 16 | 10 | [3,2,2] [4,1,4]: 2 | yes | hi = 10 |
| 4 | 10 | 7 | [3,2,2] [4,1] [4]: 3 | yes | hi = 7 |
| 4 | 7 | 5 | [3,2] [2] [4,1] [4]: 4 | no | lo = 6 |
| 6 | 7 | 6 | [3,2] [2,4] [1,4]: 3 | yes | hi = 6 |

`lo == hi == 6`: the smallest capacity is **6**.

#### Code

```cpp
// Smallest capacity that ships all packages, in order, within `days` days.
int shipWithinDays(const vector<int>& w, int days) {
    auto daysNeeded = [&](long long cap) {
        int d = 1;
        long long load = 0;
        for (int x : w) {
            if (load + x > cap) { d++; load = 0; }  // start a new day
            load += x;
        }
        return d;
    };
    long long lo = *max_element(w.begin(), w.end());
    long long hi = accumulate(w.begin(), w.end(), 0LL);
    while (lo < hi) {                               // first capacity that is ok
        long long mid = lo + (hi - lo) / 2;
        if (daysNeeded(mid) <= days) hi = mid;
        else lo = mid + 1;
    }
    return (int)lo;
}

// Maximize the minimum gap when placing k items at sorted positions.
int maxMinDistance(vector<int> pos, int k) {
    sort(pos.begin(), pos.end());
    auto canPlace = [&](int gap) {
        int placed = 1, last = pos[0];
        for (int p : pos)
            if (p - last >= gap) { placed++; last = p; }
        return placed >= k;
    };
    int lo = 0, hi = pos.back() - pos[0];
    while (lo < hi) {                               // last gap that is ok: round mid up
        int mid = lo + (hi - lo + 1) / 2;
        if (canPlace(mid)) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}
```

#### Complexity

With $n$ items and an answer range of size $R$: $O(n \log R)$ time, $O(1)$ extra space. For $R = 10^{9}$ that is 30 checks.

#### Proving the predicate is monotone

State it in the interview: "If capacity C works, any capacity above C works, because every day's load that fit still fits." And for maximize-the-minimum: "If gap g is achievable, any smaller gap is achievable with the same placement." Without monotonicity, binary search on the answer is wrong.

#### Edge cases and bugs

- `lo` too low: capacity below the heaviest package makes the greedy check loop or lie. Set `lo = max(w)`.
- Rounding: for "largest x that is ok" with `lo = mid`, round `mid` up.
- The greedy check must be correct in its own right; test it separately on a small case.

#### Variants

- Eating speed to finish piles within H hours (`sum(ceil(p / k))`).
- Split array largest sum (same check as shipping).
- Minimum days to make m bouquets (feasible by day d?).
- Kth smallest in a sorted matrix or of pair distances (count elements ≤ x).
- Real-valued answers: bisection with a fixed iteration count.

Connects to: lower and upper bound (first true), greedy algorithms (the check), kth smallest by counting.

### questions
Q: What makes a problem suitable for binary search on the answer?
A: You can check a candidate answer quickly, and the check is monotone: if x works, every larger x works too (or every smaller one). Then feasible answers form a contiguous range, and binary search finds its boundary.

Q: How do you pick the search bounds?
A: lo is the smallest value that could possibly be the answer (for example the largest single item), and hi is a value that surely works (for example the total sum or the maximum possible). Wrong bounds either miss the answer or make the check meaningless.

Q: What is the complexity of binary search on the answer?
A: O(log R × C), where R is the size of the answer range and C is the cost of one feasibility check. With an O(n) greedy check and R up to 10^9, it is about 30n operations.

Q: How do "minimize the maximum" and "maximize the minimum" problems map to this pattern?
A: For minimize-the-maximum, ask "can every part stay at most x?", which is monotone upward, and find the smallest x that works. For maximize-the-minimum, ask "can every gap be at least x?", which is monotone downward, and find the largest x that works.

Q: Why do you round mid up when searching for the largest feasible value?
A: The update on success is lo = mid. With mid rounded down and hi = lo + 1, mid equals lo and the range never shrinks. Rounding up makes mid = hi in that case, so either branch shrinks the range.

### signals
- minimize the maximum or maximize the minimum
- "the smallest capacity, speed or size such that it finishes in time"
- a yes/no check that is easy for a guessed value and monotone in it
- answers in a huge numeric range (up to 10^9) with a greedy feasibility test
- kth smallest value where counting how many are at most x is easy

### template
```cpp
// Binary search on the answer: smallest x in [lo, hi] with ok(x), where ok is F...F T...T.
template <class Ok>
long long smallestOk(long long lo, long long hi, Ok ok) {
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (ok(mid)) hi = mid;        // mid works: try smaller
        else lo = mid + 1;            // mid fails: need larger
    }
    return lo;                        // assumes ok(hi) is true
}

// Largest x with ok(x), where ok is T...T F...F: round mid up.
template <class Ok>
long long largestOk(long long lo, long long hi, Ok ok) {
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (ok(mid)) lo = mid;
        else hi = mid - 1;
    }
    return lo;                        // assumes ok(lo) is true
}
```

## dsa.binary-search.peak-finding
name: "Peak finding"
importance: important
pattern: true
prereqs: [dsa.binary-search.classic-binary-search]
scope: "binary search on slopes, 2D peak"

### simple
A peak is a value bigger than its neighbors, like a hilltop on a walking trail. If the trail goes uphill where you stand, a hilltop must lie ahead, because the trail can't climb forever. So you can binary search by looking at the slope at the middle and walking uphill.

### interview
- Peak: `a[i] > a[i-1]` and `a[i] > a[i+1]`, with `a[-1] = a[n] = -∞`. Adjacent elements differ (or define ties).
- If `a[mid] < a[mid + 1]` (rising), a peak exists in `(mid, hi]`: `lo = mid + 1`. Otherwise one exists in `[lo, mid]`: `hi = mid`. **O(log n)**.
- The array isn't sorted; binary search works because the slope tells you which side is guaranteed to contain a peak.
- **Mountain array** (strictly up then down): the same search finds its single peak; then binary search each side to find a target.
- **2D peak**: take the middle column, find its maximum, compare with left and right neighbors, and move toward the larger one: **O(R log C)**.

### deep
#### Intuition

Stand at `mid`. If the next element is larger, walk right: values can't rise forever because `a[n] = -∞`, so somewhere to the right the sequence stops rising, and that point is a peak. The same argument works leftward. Each comparison discards half, even though the array is unsorted.

#### Worked example

`a = 1 2 1 3 5 6 4`

| lo | hi | mid | a[mid] vs a[mid+1] | update |
|---|---|---|---|---|
| 0 | 6 | 3 | 3 < 5 rising | lo = 4 |
| 4 | 6 | 5 | 6 > 4 falling | hi = 5 |
| 4 | 5 | 4 | 5 < 6 rising | lo = 5 |

Peak at index 5 (value 6). Index 1 (value 2) is also a peak; the search returns any one.

#### Code

```cpp
int findPeak(const vector<int>& a) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;          // mid + 1 <= hi, always valid
        if (a[mid] < a[mid + 1]) lo = mid + 1; // rising: a peak is to the right
        else hi = mid;                         // falling: mid or something left is a peak
    }
    return lo;
}

// 2D: some cell larger than its four neighbors, in O(R log C).
pair<int, int> findPeak2D(const vector<vector<int>>& m) {
    int R = m.size(), lo = 0, hi = (int)m[0].size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2, best = 0;
        for (int r = 1; r < R; r++) if (m[r][mid] > m[best][mid]) best = r;  // column max
        if (m[best][mid] < m[best][mid + 1]) lo = mid + 1;   // climb toward the larger side
        else hi = mid;
    }
    int best = 0;
    for (int r = 1; r < R; r++) if (m[r][lo] > m[best][lo]) best = r;
    return {best, lo};
}
```

#### Why the 2D version works

The maximum of the middle column beats everything else in its column. If its right neighbor is larger, the maximum of the right half is larger than every value in the middle column, so climbing from there can never cross back into the middle column: a peak exists in the right half. Each step halves the columns and scans one column: $O(R \log C)$.

#### Complexity

1D: $O(\log n)$ time, $O(1)$ space. 2D: $O(R \log C)$ (choose columns or rows so the log is over the larger side).

#### Edge cases and bugs

- One element: it is a peak.
- `lo <= hi` with `hi = mid` loops forever.
- With equal neighbors (plateaus), the "a peak exists on the rising side" guarantee fails; a strict inequality in the definition is required.

#### Variants

- Peak index in a mountain array; search in a mountain array (find peak, then two binary searches, one ascending and one descending).
- Minimum of a "valley" array: flip the comparison.
- Ternary search on a unimodal function over reals or integers: similar idea, compares two interior points.

Connects to: classic binary search, rotated sorted arrays, ternary search.

### questions
Q: How can binary search find a peak in an unsorted array?
A: Compare a[mid] with a[mid + 1]. If the next element is larger, the values rise to the right, and because they must stop rising by the end of the array, a peak exists on the right; otherwise one exists at mid or to its left. Each step halves the range.

Q: Does the algorithm find the global maximum?
A: No, it finds some local peak. Finding the global maximum of an unsorted array needs O(n), because any element could be the largest.

Q: How do you find a peak in a 2D grid efficiently?
A: Binary search over columns. In the middle column find the maximum cell, then compare it with its left and right neighbors and move to the half with the larger neighbor. That takes O(R log C).

Q: How do you search for a target in a mountain array?
A: Find the peak with the slope binary search, then binary search the increasing part and, if not found, the decreasing part with reversed comparisons. That is O(log n) overall.

### signals
- find any element larger than its neighbors
- a "mountain" or bitonic sequence that rises then falls
- O(log n) required on an array that isn't sorted
- local maximum or minimum in a grid

### template
```cpp
// Slope binary search: move toward the rising neighbor; a peak must exist there.
int peakIndex(const vector<int>& a) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < a[mid + 1]) lo = mid + 1;  // uphill to the right
        else hi = mid;                          // downhill: peak at mid or to the left
    }
    return lo;
}
```

## dsa.binary-search.searching-a-2d-matrix
name: "Searching a 2D matrix"
importance: important
prereqs: [dsa.binary-search.classic-binary-search]
scope: "flattened index, staircase search"

### simple
How you search a grid of numbers depends on how it is sorted. If the rows continue one after another like lines of a book, treat the whole grid as one long sorted list and binary search it. If rows and columns are each sorted on their own, start at the top-right corner and step left or down, like walking down a staircase.

### interview
- **Fully sorted** (each row starts after the previous row ends): binary search on `0..R*C-1`, mapping `idx` to `(idx / C, idx % C)`. **O(log(RC))**.
- **Rows and columns sorted independently**: start at the **top-right**. If the value is too big, move left (the column below is even bigger); if too small, move down. **O(R + C)**.
- The bottom-left corner works too; the top-left and bottom-right do not (both moves go the same direction).
- Counting elements ≤ x in a row-and-column-sorted matrix uses the same staircase in O(R + C), which powers "kth smallest in a sorted matrix".
- Binary searching every row gives O(R log C), better only when R is much smaller than C.

### questions
Q: How do you search a matrix where each row is sorted and each row's first element is larger than the previous row's last?
A: Treat it as one sorted array of R·C elements and binary search index idx in [0, R·C − 1], reading m[idx / C][idx % C]. That is O(log(R·C)).

Q: How do you search a matrix whose rows and columns are each sorted?
A: Start at the top-right corner. If the value there is larger than the target, move left, because everything below it in that column is even larger; if smaller, move down, because everything to its left is even smaller. Each step discards a row or a column, so it is O(R + C).

Q: Why can't you start the staircase search at the top-left corner?
A: From the top-left, both moving right and moving down increase the value, so when the current value is too small you can't tell which way to go. The top-right and bottom-left corners have one direction that increases and one that decreases.

Q: How do you count the elements at most x in a row-and-column-sorted matrix quickly?
A: Walk a staircase from the bottom-left: while the value is at most x, all elements above it in that column count, so add row + 1 and move right; otherwise move up. That is O(R + C) and is the counting step for finding the kth smallest element.

## dsa.binary-search.binary-search-on-real-numbers
name: "Binary search on real numbers"
importance: important
prereqs: [dsa.binary-search.binary-search-on-the-answer]
scope: "precision, fixed iteration count"

### simple
Binary search also works on a continuous range of numbers, such as finding a square root to many decimal places. You keep halving the interval where the answer must be, like narrowing down a temperature with a thermometer that only says "too hot" or "too cold". Because the range never becomes a single integer, you stop after a set number of halvings.

### interview
- Keep `lo` and `hi` as doubles; set one of them to `mid` (not `mid ± 1`).
- Stop after a **fixed number of iterations** (60 to 100 halvings is plenty for doubles) rather than `while (hi - lo > eps)`, which can loop forever when floating-point rounding stops progress.
- 100 iterations shrink the range by 2¹⁰⁰; precision is then limited by doubles, not the loop.
- Uses: square or cube roots, the minimum time or maximum average (maximum average subarray with length ≥ k), geometry (position where two conditions balance).
- For unimodal functions (one peak), use **ternary search** or binary search on the derivative's sign.

### questions
Q: Why use a fixed number of iterations instead of a precision check when bisecting doubles?
A: A condition like hi − lo > 1e−9 may never become false for large values, because the gap between adjacent doubles near 10^9 is larger than 1e−9, so mid equals lo or hi and nothing changes. A fixed count, such as 100 halvings, always terminates and reaches full double precision.

Q: How do you compute the square root of x to high precision with binary search?
A: Search over [0, max(1, x)]: if mid² < x set lo = mid, else hi = mid. After about 100 iterations lo and hi agree to double precision. Newton's method converges faster, but bisection is simpler and safe.

Q: How can binary search find the maximum average of a subarray of length at least k?
A: Guess an average m and subtract m from every element; a subarray with average at least m exists exactly when some subarray of length at least k has a non-negative sum, which a prefix-minimum pass checks in O(n). Bisection on m gives O(n log(range / precision)).

Q: When would you use ternary search instead?
A: When you want the maximum or minimum of a unimodal function rather than the point where a monotone condition flips. Ternary search compares f at two interior points and discards a third of the range each time.

## dsa.binary-search.median-of-two-sorted-arrays
name: "Median of two sorted arrays"
importance: advanced
scope: "partition-based binary search"

### simple
To find the median of two sorted lists without merging them, you cut both lists so that the left pieces together hold half the items. The cut is correct when everything on the left side is no bigger than everything on the right side. You binary search where to cut the shorter list, and the other cut follows automatically.

### interview
- Binary search a cut `i` in the smaller array A (0..m); the cut in B is `j = (m + n + 1) / 2 - i`, so the left side has half the elements.
- Valid when `A[i-1] <= B[j]` and `B[j-1] <= A[i]` (use -∞/+∞ past the ends).
- If `A[i-1] > B[j]`, move the cut left (`hi = i - 1`); else move it right.
- Median: odd total → `max(A[i-1], B[j-1])`; even → average of that and `min(A[i], B[j])`.
- **O(log(min(m, n)))** time, **O(1)** space. A merge gives O(m + n); the k-th element recursion gives O(log(m + n)).

### questions
Q: What condition makes a partition of the two arrays correct for the median?
A: The left parts together must contain half of all elements, and every left element must be at most every right element. Since each array is sorted, that reduces to two checks: A[i − 1] <= B[j] and B[j − 1] <= A[i].

Q: Why binary search on the smaller array?
A: The search range is 0 to m, and j = (m + n + 1)/2 − i must stay between 0 and n. Choosing the smaller array keeps j valid for every i and makes the running time O(log(min(m, n))).

Q: How do you compute the median once the partition is found?
A: If the total length is odd, the median is the largest left element, max(A[i − 1], B[j − 1]). If even, average that with the smallest right element, min(A[i], B[j]). Treat missing neighbors past the ends as −∞ or +∞.

Q: What is a simpler O(m + n) approach, and when is it enough?
A: Merge the arrays with two pointers until you reach the middle position, without storing the merged array. It is fine when the arrays are small or the O(log) bound isn't required.

## dsa.binary-search.kth-smallest-by-counting
name: "Kth smallest by counting"
importance: advanced
prereqs: [dsa.binary-search.binary-search-on-the-answer]
scope: "sorted matrix, pair distances"

### simple
Instead of sorting everything to find the kth smallest value, you guess a value and count how many items are at most that guess. If fewer than k are, the guess is too small; otherwise it may be too big. Binary searching the guess finds the smallest value with at least k items at or below it, which is the answer.

### interview
- Answer = smallest `x` with `count(≤ x) >= k`; `count` is monotone in `x`, so binary search on the value range.
- **Kth smallest in a row-and-column-sorted matrix**: count with a staircase in O(n): total **O(n log(max − min))**.
- **Kth smallest pair distance**: sort, then count pairs with distance ≤ d using two pointers in O(n): total **O(n log n + n log W)**.
- Also: kth smallest in a multiplication table, kth smallest fraction (count with two pointers).
- The found value is guaranteed to exist in the data: the smallest x with count ≥ k is always an actual element value.

### questions
Q: How do you find the kth smallest element in a matrix whose rows and columns are sorted?
A: Binary search on the value range [m[0][0], m[n−1][n−1]]. For a guess x, count elements at most x with a staircase walk from the bottom-left in O(n). The smallest x with count at least k is the answer, for O(n log(range)) in total.

Q: Why is the result of the counting binary search always a value that appears in the data?
A: count(≤ x) only increases at values present in the data. The smallest x where the count reaches k must therefore be a value where the count just jumped, which is an actual element.

Q: How do you count pairs with distance at most d in O(n)?
A: Sort the array, then for each right index r move a left pointer forward while a[r] − a[l] > d. All indices from l to r − 1 pair with r, so add r − l. Both pointers only move forward.

Q: When is a heap a better choice than counting?
A: When k is small: a min-heap seeded with the first element of each row pops k times in O(k log n). Counting wins when k is large or the value range is small relative to the data.
