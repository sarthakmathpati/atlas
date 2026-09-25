---
topic: dsa.arrays
name: "Arrays"
subject: dsa
order: 2
prereqs: [dsa.complexity]
---

## dsa.arrays.array-basics
name: "Array basics"
importance: must
scope: "indexing, traversal, in-place updates, memory layout"

### simple
An array stores items side by side in one block of memory, like numbered lockers in a row. Because every locker has the same size, you can jump straight to locker 500 without walking past the first 499. Adding or removing in the middle is slow, because everything after it has to shift over.

### interview
- Contiguous memory: `a[i]` is at `base + i * size`, so indexing is **O(1)** and scans are cache-friendly (fast in practice).
- Access and update by index: O(1). Search in an unsorted array: O(n). Insert or delete in the middle: O(n) because of shifting; at the end of a dynamic array: O(1) amortized.
- Static arrays (`int a[10]`, `std::array`) have a fixed size; dynamic arrays (`std::vector`) grow by reallocating and copying.
- In-place updates overwrite the input to save memory; ask whether modifying the input is allowed.
- Common bugs: off-by-one at the ends, reading `a[i + 1]` on the last element, and changing an array's length while iterating over it.

### deep
#### Intuition

An array is the simplest data structure and the one every other structure is built on. It is a single block of memory with equal-sized slots, so the machine can compute where element $i$ lives with one multiplication. This is why indexing is $O(1)$, and why arrays are the fastest structure to scan: neighboring elements share cache lines, so the CPU loads several at once.

#### Operations and their costs

| Operation | Static array | Dynamic array (end) |
|---|---|---|
| Read or write `a[i]` | $O(1)$ | $O(1)$ |
| Append | not possible | $O(1)$ amortized |
| Insert or delete at index $i$ | $O(n - i)$ shifts | $O(n - i)$ shifts |
| Search unsorted | $O(n)$ | $O(n)$ |
| Search sorted | $O(\log n)$ with binary search | $O(\log n)$ |

#### Traversal patterns

Most array problems are one of a handful of traversals:

1. **Left to right** with running state (sum, maximum, count).
2. **Right to left**, when the answer for $i$ depends on what comes after it (suffix maximum, next greater element).
3. **Two passes**, one in each direction, when the answer needs both sides (product of everything except self, trapping rain water).
4. **Two indices** moving through the array (see two pointers).

#### Worked example: in-place compaction

Remove every occurrence of a value and return the new length, using $O(1)$ extra space. Keep a write index `w`; copy each kept element to `a[w]`.

| i | a[i] | keep? | array after | w |
|---|---|---|---|---|
| 0 | 3 | no (value 3) | 3 2 2 3 | 0 |
| 1 | 2 | yes | 2 2 2 3 | 1 |
| 2 | 2 | yes | 2 2 2 3 | 2 |
| 3 | 3 | no | 2 2 2 3 | 2 |

The answer is 2 and the first two slots hold `2 2`.

```cpp
int removeValue(vector<int>& a, int val) {
    int w = 0;                       // next slot to write a kept element
    for (int i = 0; i < (int)a.size(); i++)
        if (a[i] != val) a[w++] = a[i];
    return w;                        // a[0..w-1] holds the kept elements
}
```

Time $O(n)$, one pass. Space $O(1)$: the input is reused as the output.

#### Memory layout details

- A 2D array in C and C++ is stored **row by row** (row-major). Looping over rows in the outer loop and columns in the inner loop reads memory in order and is much faster than the reverse.
- `vector<vector<int>>` stores each row separately; a flat `vector<int>` of size `rows * cols` indexed by `r * cols + c` is more cache-friendly.
- `vector<int>` stores the ints themselves, side by side; `vector<int*>` or `vector<unique_ptr<T>>` stores pointers, so the objects are scattered and scans lose cache locality.

#### Edge cases and bugs

- Empty array: loops that read `a[0]` first will crash.
- One element: two-index loops such as `i < n - 1` may never run.
- Deleting while iterating forward skips elements; iterate backwards or use a write index.
- Integer overflow when summing large values; use `long long` in C++.

#### Variants

Circular arrays (index with `i % n`), sparse arrays (hash map of index to value), and bit arrays (one bit per slot) all reuse the same indexing idea.

Connects to: two pointers, prefix sums, dynamic arrays and amortized analysis, cache locality.

### questions
Q: Why is accessing an array element by index O(1)?
A: The elements are stored contiguously and all have the same size, so the address of a[i] is base + i × size. The machine computes it with one multiplication and addition, no matter how large the array is.

Q: Why is inserting into the middle of an array O(n)?
A: Every element after the insertion point must shift one slot to make room. In the worst case (inserting at the front) that is all n elements.

Q: How do you remove elements from an array in place without extra memory?
A: Use a write index. Scan with a read index, and copy each element you keep to the write position, then advance it. After one pass the first w slots hold the kept elements, in O(n) time and O(1) space.

Q: Why does loop order matter for performance on a 2D array in C++?
A: C++ stores 2D arrays row by row. Iterating along a row reads consecutive memory and uses the cache well, while iterating down a column jumps by a whole row each step and causes many cache misses. Both are O(n·m), but the row-order loop can be several times faster.

Q: What is the difference between a static array and a dynamic array?
A: A static array has a fixed size chosen at creation. A dynamic array keeps spare capacity and reallocates to a larger block (usually double) when full, which makes appends O(1) amortized.

## dsa.arrays.kadanes-algorithm
name: "Kadane's algorithm"
importance: must
pattern: true
prereqs: [dsa.arrays.array-basics]
scope: "maximum subarray sum and its variants (circular, product)"

### simple
Kadane's algorithm finds the contiguous stretch of numbers with the largest sum in one pass. Imagine walking along a road collecting coins and paying tolls: if your running total ever becomes a debt, you are better off starting fresh from the next spot. You remember the best total you ever held.

### interview
- For each index, the best subarray **ending here** is either the element alone or the element added to the best subarray ending at the previous index: `cur = max(x, cur + x)`.
- Track the global best as `best = max(best, cur)`. Time **O(n)**, space **O(1)**.
- Initialize with the first element (not 0) so an all-negative array returns its largest element.
- Circular variant: answer is `max(maxSubarray, total - minSubarray)`, except when every element is negative (then just `maxSubarray`).
- Product variant: track both the maximum and minimum product ending here, because a negative number swaps them.
- To return the subarray itself, record the start index whenever you restart.

### deep
#### Intuition

A brute force tries every start and end, $O(n^2)$ with running sums. Kadane's insight is that the best subarray ending at index $i$ only depends on the best subarray ending at $i - 1$: either you extend it by $a_i$, or it had a negative total and you drop it and start a new subarray at $i$. That is a one-variable dynamic program.

$$\text{cur}_i = \max(a_i,\ \text{cur}_{i-1} + a_i), \qquad \text{answer} = \max_i \text{cur}_i$$

#### Worked example

Array: `-2 1 -3 4 -1 2 1 -5 4`

| i | a[i] | cur = max(a[i], cur + a[i]) | best |
|---|---|---|---|
| 0 | -2 | -2 | -2 |
| 1 | 1 | max(1, -1) = 1 | 1 |
| 2 | -3 | max(-3, -2) = -2 | 1 |
| 3 | 4 | max(4, 2) = 4 | 4 |
| 4 | -1 | 3 | 4 |
| 5 | 2 | 5 | 5 |
| 6 | 1 | 6 | 6 |
| 7 | -5 | 1 | 6 |
| 8 | 4 | 5 | 6 |

The answer is 6, from the subarray `4 -1 2 1`.

#### Code

```cpp
// Returns the maximum subarray sum (the array must be non-empty).
long long maxSubarray(const vector<int>& a) {
    long long cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = max((long long)a[i], cur + a[i]);  // extend or restart
        best = max(best, cur);
    }
    return best;
}

// Circular: the best wraps around exactly when it equals total minus the minimum subarray.
long long maxCircularSubarray(const vector<int>& a) {
    long long curMax = 0, curMin = 0, best = a[0], worst = a[0], total = 0;
    for (int x : a) {
        curMax = max((long long)x, curMax + x);
        best = max(best, curMax);
        curMin = min((long long)x, curMin + x);
        worst = min(worst, curMin);
        total += x;
    }
    return best < 0 ? best : max(best, total - worst);  // all negative: no wrap
}
```

Time $O(n)$, space $O(1)$ for all three.

#### Edge cases and bugs

- **All negative**: initializing `best = 0` returns 0, which is wrong if an empty subarray is not allowed. Start from `a[0]`.
- **Circular with all negatives**: `total - worst` would be 0 (the empty subarray); guard with `best < 0`.
- **Overflow**: sums of $10^5$ values up to $10^9$ need 64-bit integers.
- **Product with zeros**: a zero resets both `hi` and `lo` to 0, which the `max(x, hi * x)` form handles.

#### Variants

- Return the indices: when `cur` restarts at `i`, set `start = i`; when `best` improves, save `(start, i)`.
- Maximum sum with at most one deletion: two states, "no deletion yet" and "one deletion used".
- Maximum sum rectangle in a 2D matrix: fix a pair of rows, compress columns into sums, run Kadane: $O(r^2 c)$.
- Kadane is also the stock-profit problem in disguise: the best profit is the maximum subarray of daily price differences.

Connects to: dynamic programming (1D), prefix sums (answer = max of prefix[j] − min prefix before j), best time to buy and sell stock.

### questions
Q: What is the key recurrence in Kadane's algorithm?
A: The best subarray ending at index i is max(a[i], best ending at i − 1 plus a[i]). If the previous best is negative, it only hurts, so you restart at a[i]. The overall answer is the largest of these values.

Q: How do you handle an array where every number is negative?
A: Initialize both the running sum and the answer with the first element instead of 0. Then the algorithm returns the largest (least negative) element, which is the correct maximum for a non-empty subarray.

Q: How do you find the maximum circular subarray sum?
A: Either the best subarray doesn't wrap, which is normal Kadane, or it wraps, which means it is the whole array minus some middle subarray, so total − minimum subarray. Take the larger of the two, except when all numbers are negative, where the wrap case would wrongly pick the empty subarray.

Q: Why does maximum product subarray need both a maximum and a minimum?
A: Multiplying by a negative number turns the smallest (most negative) product into the largest. Keeping both the max and min product ending at each index lets you recover the best product after a sign flip.

Q: How is Kadane's algorithm related to prefix sums?
A: The sum of a[i..j] is prefix[j + 1] − prefix[i], so the best subarray ending at j subtracts the smallest prefix seen before it. Kadane tracks the same thing implicitly with a running sum that resets when it goes negative.

### signals
- a contiguous subarray whose sum (or product) should be as large as possible
- "maximum sum of consecutive elements"
- gains and losses over time where you pick one best stretch
- a circular array where the best stretch may wrap around
- stock profit from one buy and one later sell (maximum of daily differences)

### template
```cpp
// Kadane: best value of a contiguous subarray in O(n) time, O(1) space.
long long kadane(const vector<int>& a) {
    long long cur = a[0];   // best subarray ending at the current index
    long long best = a[0];  // best seen anywhere
    for (int i = 1; i < (int)a.size(); i++) {
        // Either extend the previous subarray or start fresh here.
        cur = max((long long)a[i], cur + a[i]);
        best = max(best, cur);
        // Variant hooks: track start/end indices here, or keep a second
        // state (min, or "one deletion used") updated from the same values.
    }
    return best;
}
```

## dsa.arrays.dutch-national-flag
name: "Dutch national flag"
importance: must
pattern: true
scope: "three-way partitioning"

### simple
The Dutch national flag algorithm sorts an array that holds only three kinds of values in one pass. Picture sorting red, white and blue socks on a line: reds get tossed to the left end, blues to the right end, and whites stay in the middle. Three markers track where each group ends.

### interview
- Three pointers: `low` (next slot for 0s), `mid` (current element), `high` (next slot for 2s).
- Invariant: `[0, low)` are 0s, `[low, mid)` are 1s, `(high, n-1]` are 2s, `[mid, high]` is unknown.
- If `a[mid] == 0`: swap with `low`, advance both. If 1: advance `mid`. If 2: swap with `high`, decrement `high` only (the swapped-in value is unexamined).
- One pass, **O(n)** time, **O(1)** space, not stable.
- Generalizes to three-way partition around a pivot (less, equal, greater), which fixes quicksort on many duplicates.

### deep
#### Intuition

A counting sort would count the 0s, 1s and 2s and rewrite the array in two passes. The Dutch national flag algorithm (Dijkstra's) does it in one pass by growing three regions at once. The key is the invariant: at every moment the array is split into four zones.

```
[ 0 0 0 | 1 1 1 | ? ? ? ? | 2 2 2 ]
  0..low-1  low..mid-1  mid..high  high+1..n-1
```

Each step shrinks the unknown zone `[mid, high]` by one.

#### The three cases

- `a[mid] == 0`: it belongs at the left. Swap it with `a[low]`, which is a 1 (or `mid == low`), then advance both `low` and `mid`.
- `a[mid] == 1`: already in the right zone; advance `mid`.
- `a[mid] == 2`: swap with `a[high]` and shrink `high`. Do **not** advance `mid`, because the value that just arrived from `high` hasn't been looked at.

#### Worked example

Array: `2 0 2 1 1 0`

| step | array | low | mid | high | action |
|---|---|---|---|---|---|
| 0 | 2 0 2 1 1 0 | 0 | 0 | 5 | a[mid]=2, swap with high |
| 1 | 0 0 2 1 1 2 | 0 | 0 | 4 | a[mid]=0, swap with low |
| 2 | 0 0 2 1 1 2 | 1 | 1 | 4 | a[mid]=0, swap with low |
| 3 | 0 0 2 1 1 2 | 2 | 2 | 4 | a[mid]=2, swap with high |
| 4 | 0 0 1 1 2 2 | 2 | 2 | 3 | a[mid]=1, advance |
| 5 | 0 0 1 1 2 2 | 2 | 3 | 3 | a[mid]=1, advance |
| 6 | 0 0 1 1 2 2 | 2 | 4 | 3 | mid > high, stop |

#### Code

```cpp
void sortColors(vector<int>& a) {
    int low = 0, mid = 0, high = (int)a.size() - 1;
    while (mid <= high) {
        if (a[mid] == 0) swap(a[low++], a[mid++]);
        else if (a[mid] == 1) mid++;
        else swap(a[mid], a[high--]);   // don't advance mid: new value unseen
    }
}

// Three-way partition around a pivot value: < pivot, == pivot, > pivot.
pair<int, int> partition3(vector<int>& a, int pivot) {
    int low = 0, mid = 0, high = (int)a.size() - 1;
    while (mid <= high) {
        if (a[mid] < pivot) swap(a[low++], a[mid++]);
        else if (a[mid] == pivot) mid++;
        else swap(a[mid], a[high--]);
    }
    return {low, high};  // a[low..high] equals the pivot
}
```

Time $O(n)$: every step either advances `mid` or shrinks `high`, so there are at most $n$ steps. Space $O(1)$.

#### Edge cases and bugs

- Advancing `mid` after swapping with `high` skips an unexamined element: the classic bug.
- Using `mid < high` instead of `mid <= high` leaves the last unknown element unprocessed.
- Empty array: `high = -1`, the loop never runs. Fine.

#### Variants

- **Quicksort with many duplicates**: two-way partitioning degrades to $O(n^2)$ when all keys are equal; three-way partitioning puts every copy of the pivot in the middle and recurses only on the strict sides.
- **Move zeros to the end** or **partition by parity** are the two-region version (one boundary pointer).
- **K colors**: for small k, counting sort is simpler; for large k, sort normally.

Connects to: quick sort partitioning, same-direction two pointers, counting sort.

### questions
Q: What invariant does the Dutch national flag algorithm maintain?
A: Everything before low is 0, everything from low to mid − 1 is 1, everything after high is 2, and mid to high is still unexamined. Each step shrinks the unexamined zone by one, so the loop ends after at most n steps.

Q: Why don't you advance mid after swapping a 2 with a[high]?
A: The value swapped in from the high end hasn't been examined yet; it might be a 0 or a 2 that needs moving. When swapping a 0 with a[low], the incoming value is already known to be a 1 (or it is the same element), so advancing mid is safe.

Q: Why is three-way partitioning useful in quicksort?
A: With many equal keys, a two-way partition can put all duplicates on one side and degrade to O(n²). Three-way partitioning groups every element equal to the pivot in the middle, so the recursion only continues on the strictly smaller and strictly larger parts.

Q: How would you solve "sort colors" with counting instead, and why prefer the one-pass version?
A: Count the 0s, 1s and 2s, then overwrite the array with that many of each: two passes, O(1) space. The one-pass version touches each element once and generalizes to partitioning around any pivot, which is why interviewers ask for it.

### signals
- only three distinct values (or three categories) to arrange in one pass
- partitioning around a pivot into less, equal and greater
- "sort colors" or grouping items by a small number of classes in place
- O(1) extra space and a single pass required

### template
```cpp
// Three-way partition: [0, low) < pivot, [low, mid) == pivot, (high, n-1] > pivot.
void threeWayPartition(vector<int>& a, int pivot) {
    int low = 0, mid = 0, high = (int)a.size() - 1;
    while (mid <= high) {                  // [mid, high] is still unknown
        if (a[mid] < pivot) {
            swap(a[low++], a[mid++]);      // goes left; incoming value already known
        } else if (a[mid] > pivot) {
            swap(a[mid], a[high--]);       // goes right; re-check the incoming value
        } else {
            mid++;                         // equal: stays in the middle
        }
    }
}
```

## dsa.arrays.cyclic-sort
name: "Cyclic sort"
importance: important
pattern: true
prereqs: [dsa.arrays.in-place-array-tricks]
scope: "values in range 1 to n, finding missing and duplicate numbers"

### simple
When an array of size n holds numbers from 1 to n, every number has a home: value v belongs at index v − 1. Cyclic sort keeps swapping each number into its home seat, like guests taking their assigned chairs at a dinner. Afterwards, any seat with the wrong guest reveals a missing or duplicated number.

### interview
- Applies when values lie in a known range like `[1, n]` or `[0, n]` and the array has about n slots.
- Loop: while `a[i]` is in range and `a[a[i] - 1] != a[i]`, swap `a[i]` into its home. Then move on.
- **O(n)** time (each swap places at least one number permanently), **O(1)** extra space; modifies the input.
- After sorting, scan: index `i` with `a[i] != i + 1` means `i + 1` is missing and `a[i]` is a duplicate.
- Solves first missing positive (ignore values outside `[1, n]`), find all duplicates, find the missing number, find the corrupt pair.
- Check `a[a[i] - 1] != a[i]` (not `a[i] != i + 1`) or duplicates cause an infinite loop.

### deep
#### Intuition

If the values are exactly the indices shifted by one, the sorted array is known in advance: `a[i] = i + 1`. Instead of comparing, you place each number directly where it belongs. A number that finds its home already occupied by an equal value is a duplicate, and a home that stays empty marks a missing value.

#### Worked example

Array: `3 4 -1 1` (first missing positive), $n = 4$.

| i | array before | action |
|---|---|---|
| 0 | 3 4 -1 1 | a[0]=3 belongs at 2; swap with a[2] |
| 0 | -1 4 3 1 | -1 is out of range; move on |
| 1 | -1 4 3 1 | 4 belongs at 3; swap with a[3] |
| 1 | -1 1 3 4 | 1 belongs at 0; swap with a[0] |
| 1 | 1 -1 3 4 | -1 out of range; move on |
| 2, 3 | 1 -1 3 4 | already home |

Scan: index 1 holds -1, not 2, so the first missing positive is **2**.

#### Code

```cpp
void cyclicSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        // Keep swapping until a[i] is out of range or its home already holds it.
        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i])
            swap(a[i], a[a[i] - 1]);
    }
}

int firstMissingPositive(vector<int> a) {
    cyclicSort(a);
    for (int i = 0; i < (int)a.size(); i++)
        if (a[i] != i + 1) return i + 1;
    return (int)a.size() + 1;
}

vector<int> findDuplicates(vector<int> a) {  // values in [1, n], each appears once or twice
    cyclicSort(a);
    vector<int> dups;
    for (int i = 0; i < (int)a.size(); i++)
        if (a[i] != i + 1) dups.push_back(a[i]);
    return dups;
}
```

#### Complexity

Each swap puts one value into its final home, and a value at home is never moved again, so there are at most $n$ swaps in total. With the $n$ outer iterations, time is $O(n)$ and extra space is $O(1)$.

#### Edge cases and bugs

- **Infinite loop with duplicates**: the condition `a[i] != i + 1` keeps swapping two equal values forever. Compare against the home slot instead: `a[a[i] - 1] != a[i]`.
- **Out-of-range values** (0, negatives, values above n) must be skipped, not used as indices.
- **Range `[0, n-1]`**: the home of `v` is `v` itself; adjust the offset.

#### Variants

- Missing number in `[0, n]` with one value missing: cyclic sort, or XOR, or the sum formula.
- Set mismatch (one duplicate, one missing): after sorting, the bad index gives both.
- If the input must not change, use XOR, sums, or Floyd's cycle detection (find the duplicate number).

Connects to: in-place array tricks (sign marking), XOR tricks, fast and slow pointers.

### questions
Q: When can you use cyclic sort?
A: When the array's values fall in a known range that matches its indices, such as 1 to n for an array of length n. Each value then has a fixed home index, so you can place values by swapping instead of comparing, in O(n) time.

Q: Why is cyclic sort O(n) even though it has a while loop inside a for loop?
A: Every swap moves one value into its home, and a value at home is never moved again. So the total number of swaps over the whole run is at most n, and the loops together do O(n) work.

Q: What condition prevents an infinite loop when the array has duplicates?
A: Swap only while a[a[i] − 1] != a[i], that is, while the home slot doesn't already hold this value. If you test a[i] != i + 1 instead, two equal values keep swapping with each other forever.

Q: How does cyclic sort find the first missing positive?
A: Place every value in 1 to n at its home and ignore the rest. Then the first index i whose value isn't i + 1 gives the answer i + 1; if every slot is correct, the answer is n + 1.

### signals
- an array of length n whose values are in the range 1 to n (or 0 to n)
- find the missing, duplicated or first missing positive number
- O(1) extra space and O(n) time with values that map to indices
- "each number appears once or twice"

### template
```cpp
// Cyclic sort: put each value v in [1, n] at index v - 1, then scan for mismatches.
vector<int> mismatches(vector<int> a) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        // Skip values with no home (out of range) and values already home.
        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i])
            swap(a[i], a[a[i] - 1]);
    }
    vector<int> missing;
    for (int i = 0; i < n; i++)
        if (a[i] != i + 1) missing.push_back(i + 1);  // a[i] is a duplicate or junk
    return missing;
}
```

## dsa.arrays.matrix-traversal
name: "Matrix traversal"
importance: must
prereqs: [dsa.arrays.array-basics]
scope: "rows and columns, spiral order, diagonals, rotate by 90 degrees, transpose"

### simple
A matrix is a grid of numbers, like seats in a cinema with rows and columns. Most matrix problems are about visiting the seats in a particular order: row by row, around the edges in a spiral, or along the diagonals. Rotating a matrix is just two simple moves: flip it along its diagonal, then mirror each row.

### interview
- Cell `(r, c)` in an `R × C` matrix; row-major index `r * C + c`. Always check `0 <= r < R` and `0 <= c < C`.
- **Spiral**: keep four boundaries (`top`, `bottom`, `left`, `right`), walk each side, shrink it, and stop when they cross.
- **Diagonals**: cells on the same main-direction diagonal share `r - c`; on the same anti-diagonal they share `r + c`.
- **Transpose**: swap `a[r][c]` with `a[c][r]` for `c > r` (square matrices in place).
- **Rotate 90° clockwise in place**: transpose, then reverse each row. Counter-clockwise: transpose, then reverse each column (or reverse rows first).
- All of these are **O(R × C)** time; in-place rotation is **O(1)** extra space.

### deep
#### Intuition

Matrix problems test careful index handling more than clever ideas. Most bugs come from off-by-one boundaries, so name the boundaries explicitly and update them at the end of each step.

#### Spiral order

Keep four walls. Walk right along `top`, down along `right`, left along `bottom`, up along `left`, moving each wall inward after its side is done.

```
1  2  3  4
5  6  7  8
9 10 11 12
```

| step | walk | output | walls after (top, bottom, left, right) |
|---|---|---|---|
| 1 | top row, left to right | 1 2 3 4 | 1, 2, 0, 3 |
| 2 | right column, down | 8 12 | 1, 2, 0, 2 |
| 3 | bottom row, right to left | 11 10 9 | 1, 1, 0, 2 |
| 4 | left column, up | 5 | 1, 1, 1, 2 |
| 5 | top row again | 6 7 | 2, 1, 1, 2: stop |

```cpp
vector<int> spiralOrder(const vector<vector<int>>& m) {
    vector<int> out;
    if (m.empty()) return out;
    int top = 0, bottom = (int)m.size() - 1, left = 0, right = (int)m[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.push_back(m[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.push_back(m[r][right]);
        right--;
        if (top <= bottom) {                       // a row is left to walk back along
            for (int c = right; c >= left; c--) out.push_back(m[bottom][c]);
            bottom--;
        }
        if (left <= right) {                       // a column is left to walk up
            for (int r = bottom; r >= top; r--) out.push_back(m[r][left]);
            left++;
        }
    }
    return out;
}
```

The two `if` guards matter for single-row or single-column leftovers; without them the middle row of a 3 × 1 matrix is printed twice.

#### Rotate by 90 degrees in place

Clockwise rotation sends `(r, c)` to `(c, n - 1 - r)`. Transposing sends `(r, c)` to `(c, r)`, and reversing each row then sends `(c, r)` to `(c, n - 1 - r)`. Composing the two gives the rotation.

```cpp
void rotateClockwise(vector<vector<int>>& m) {
    int n = m.size();
    for (int r = 0; r < n; r++)
        for (int c = r + 1; c < n; c++) swap(m[r][c], m[c][r]);  // transpose
    for (auto& row : m) reverse(row.begin(), row.end());          // mirror
}
```

#### Diagonals

- Main-direction diagonals (top-left to bottom-right): `r - c` is constant; there are `R + C - 1` of them. Use `r - c + (C - 1)` as a bucket index.
- Anti-diagonals: `r + c` is constant, from 0 to `R + C - 2`. "Diagonal traverse" walks anti-diagonals, alternating direction.
- N-Queens uses exactly these keys to check attacks in O(1).

#### Complexity

Every traversal visits each cell once: $O(R \cdot C)$ time. Rotation and transpose in place use $O(1)$ extra space. Transposing a non-square matrix needs a new $C \times R$ matrix.

#### Edge cases and bugs

- Empty matrix or empty rows: check before reading `m[0].size()`.
- Single row, single column, and 1 × 1 matrices break spiral loops without the guards.
- Transpose loop must start at `c = r + 1`; starting at 0 swaps every pair twice and undoes itself.

#### Variants

Set matrix zeroes (use the first row and column as markers for O(1) space), search a sorted matrix (staircase from the top-right), and game of life (encode old and new states in the same cell).

Connects to: grids as graphs, N-Queens, searching a 2D matrix, 2D prefix sums.

### questions
Q: How do you rotate an n × n matrix 90 degrees clockwise in place?
A: Transpose it (swap a[r][c] with a[c][r] for c > r), then reverse each row. The transpose maps (r, c) to (c, r) and the reversal maps that to (c, n − 1 − r), which is exactly the clockwise rotation. It takes O(n²) time and O(1) extra space.

Q: What identifies cells on the same diagonal and anti-diagonal?
A: Cells on the same top-left-to-bottom-right diagonal have equal r − c, and cells on the same anti-diagonal have equal r + c. These keys let you group diagonal cells or check queen attacks in O(1).

Q: What is the usual bug in spiral traversal, and how do you avoid it?
A: When one row or one column remains, the walk back along the bottom row or up the left column repeats cells already printed. Check top <= bottom before walking the bottom row and left <= right before walking the left column.

Q: Why does the transpose loop start from c = r + 1?
A: Each off-diagonal pair should be swapped exactly once. Looping over all c swaps every pair twice, which restores the original matrix, and swapping diagonal cells with themselves is wasted work.

Q: How would you rotate a matrix counter-clockwise?
A: Transpose, then reverse each column (equivalently, reverse each row first and then transpose). You can also rotate clockwise three times, but that triples the work.

## dsa.arrays.boyer-moore-majority-vote
name: "Boyer-Moore majority vote"
importance: important
pattern: true
scope: "majority element for n/2 and n/3"

### simple
The Boyer-Moore vote finds an element that appears more than half the time, using only one counter. Imagine a crowd where each person from different teams pairs off with a rival and both leave; if one team has a strict majority, its members are the ones left standing. The algorithm simulates that pairing in one pass.

### interview
- Keep a `candidate` and a `count`. If `count == 0`, take the current element as the candidate. Then add 1 if the element equals the candidate, otherwise subtract 1.
- If a majority (more than n/2) exists, the final candidate is it. **O(n)** time, **O(1)** space.
- If a majority is not guaranteed, make a second pass to verify the candidate's count.
- For elements appearing more than n/3 times: keep **two** candidates and two counters; at most two such elements exist. Always verify in a second pass.
- Generalization: more than n/k needs k − 1 candidates (the Misra-Gries summary).

### deep
#### Intuition

Cancel out pairs of different elements. Each cancellation removes one majority element at most and one other element, so the majority (more than half) can never be fully cancelled. The candidate and counter simulate this: the counter is how many uncancelled copies of the candidate remain.

#### Worked example

Array: `2 2 1 1 1 2 2`

| i | x | candidate | count |
|---|---|---|---|
| 0 | 2 | 2 | 1 |
| 1 | 2 | 2 | 2 |
| 2 | 1 | 2 | 1 |
| 3 | 1 | 2 | 0 |
| 4 | 1 | 1 | 1 |
| 5 | 2 | 1 | 0 |
| 6 | 2 | 2 | 1 |

Final candidate 2, which appears 4 times out of 7: the majority.

#### Code

```cpp
int majorityElement(const vector<int>& a) {   // assumes a majority exists
    int candidate = 0, count = 0;
    for (int x : a) {
        if (count == 0) candidate = x;
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}

// Every value appearing more than n / 3 times (at most two of them).
vector<int> majorityThird(const vector<int>& a) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;       // distinct placeholder candidates
    for (int x : a) {
        if (x == c1) n1++;
        else if (x == c2) n2++;
        else if (n1 == 0) { c1 = x; n1 = 1; }
        else if (n2 == 0) { c2 = x; n2 = 1; }
        else { n1--; n2--; }                   // cancel a triple of distinct values
    }
    vector<int> out;
    int k1 = count(a.begin(), a.end(), c1), k2 = count(a.begin(), a.end(), c2);
    if (k1 > (int)a.size() / 3) out.push_back(c1);
    if (c2 != c1 && k2 > (int)a.size() / 3) out.push_back(c2);
    return out;
}
```

#### Why the n/3 version works

Each "cancel" step removes three distinct values at once. A value appearing more than $n/3$ times cannot be removed completely, because there are fewer than $n/3$ cancel steps that could involve it. So any such value survives as a candidate, but survivors are not guaranteed to be frequent, which is why the verification pass is required.

#### Complexity

Time $O(n)$ (two passes when verifying), space $O(1)$. Compare with a hash map count: $O(n)$ time and $O(n)$ space, or sorting and taking the middle element: $O(n \log n)$.

#### Edge cases and bugs

- Returning the candidate without verification when a majority is not guaranteed.
- In the n/3 version, checking `n1 == 0` before `x == c2` can put the same value in both slots; test for equality with both candidates first.
- Initializing both candidates to the same placeholder (such as 0 and 0) can merge them.

Connects to: frequency counting with hash maps, streaming algorithms (heavy hitters), quickselect (the median is the majority if one exists).

### questions
Q: Why does the Boyer-Moore vote find the majority element?
A: Each decrement cancels one copy of the candidate against one different element. A majority element has more copies than all other elements combined, so it cannot be cancelled completely and must be the candidate at the end.

Q: When do you need a second pass?
A: Whenever the problem doesn't guarantee that a majority exists. The algorithm always returns some candidate, and with no majority that candidate can be any value, so count its occurrences to confirm.

Q: How many elements can appear more than n/3 times, and how do you find them?
A: At most two, since three such elements would need more than n elements in total. Keep two candidates with counters, cancel triples of distinct values, then verify both candidates with a counting pass.

Q: What are the alternatives, and why is Boyer-Moore preferred?
A: A hash map of counts is O(n) time but O(n) space, and sorting then taking the middle is O(n log n). Boyer-Moore is O(n) time with O(1) space and works on a stream in one pass.

### signals
- an element that appears more than half (or more than a third) of the time
- O(1) extra space for finding a dominant value
- a stream of votes or events where you can't store counts for every value
- "at most k − 1 values can exceed n / k occurrences"

### template
```cpp
// Boyer-Moore vote: returns the only possible majority candidate; verify if not guaranteed.
int majorityCandidate(const vector<int>& a) {
    int candidate = 0, count = 0;
    for (int x : a) {
        if (count == 0) candidate = x;         // previous block fully cancelled
        count += (x == candidate) ? 1 : -1;    // pair x against the candidate
    }
    return candidate;
}

bool isMajority(const vector<int>& a, int c) {
    return 2 * count(a.begin(), a.end(), c) > (int)a.size();
}
```

## dsa.arrays.next-permutation
name: "Next permutation"
importance: important
scope: "the lexicographic next-order algorithm"

### simple
Next permutation rearranges numbers into the next larger ordering, like the next word in a dictionary made from the same letters. You look from the right for the first place where you can make the number a little bigger. Then you bump that spot up by the smallest possible amount and put the rest in the smallest order.

### interview
- Step 1: from the right, find the first index `i` with `a[i] < a[i + 1]` (the pivot). The suffix after it is non-increasing.
- If there is no pivot, the array is the largest permutation: reverse it to get the smallest and stop.
- Step 2: from the right, find the first `j` with `a[j] > a[i]` (the smallest larger value in the suffix) and swap them.
- Step 3: reverse the suffix after `i` so it becomes increasing (its smallest arrangement).
- **O(n)** time, **O(1)** space. Handles duplicates correctly with strict comparisons as above. `std::next_permutation` implements it.

### deep
#### Intuition

Think of the array as a number. To get the very next larger number, change the rightmost digit you can. The suffix that is already in decreasing order is at its maximum; no rearrangement of it alone can make the number larger. So you must increase the digit just before that suffix, by as little as possible, and then make the suffix as small as possible.

#### Worked example

Array: `1 3 5 4 2`

1. Scan from the right for a drop: `2 < 4`, `4 < 5`, `5 > 3`. The pivot is `a[1] = 3`; the suffix `5 4 2` is decreasing.
2. From the right, the first value greater than 3 is `4` (index 3). Swap: `1 4 5 3 2`.
3. Reverse the suffix after index 1: `5 3 2` becomes `2 3 5`. Result: `1 4 2 3 5`.

Check: every permutation starting with `1 3` is smaller, and `1 4 2 3 5` is the smallest one starting with `1 4`.

#### Code

```cpp
void nextPermutation(vector<int>& a) {
    int n = a.size(), i = n - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;          // find the pivot
    if (i >= 0) {
        int j = n - 1;
        while (a[j] <= a[i]) j--;                    // smallest value larger than a[i]
        swap(a[i], a[j]);
    }
    reverse(a.begin() + i + 1, a.end());             // smallest arrangement of the suffix
}
```

When there is no pivot, `i` ends at -1 and the whole array is reversed, which wraps from the largest permutation to the smallest.

#### Why reversing works

After the swap, the suffix is still non-increasing: the new value at `j` is the old `a[i]`, which is smaller than everything to its left in the suffix and at least as large as everything to its right. Reversing a non-increasing sequence gives a non-decreasing one, the smallest arrangement, without sorting.

#### Complexity

Each of the three steps scans at most $n$ elements: $O(n)$ time, $O(1)$ space.

#### Edge cases and bugs

- Using `>` instead of `>=` in the pivot search breaks on duplicates (`1 5 1` → `5 1 1`).
- Forgetting the wrap-around case (no pivot).
- Sorting the suffix instead of reversing works but costs $O(n \log n)$.

#### Variants

- **Previous permutation**: flip every comparison.
- **Next greater number with the same digits**: run it on the digit list and check for 32-bit overflow.
- **Kth permutation**: don't call next permutation k times; build it digit by digit with factorials in $O(n^2)$.

Connects to: permutations (backtracking), two pointers (reversal), greedy reasoning.

### questions
Q: Describe the three steps of the next permutation algorithm.
A: Find the rightmost index i where a[i] < a[i + 1]. Find the rightmost j with a[j] > a[i] and swap them. Then reverse everything after i. If no such i exists, reverse the whole array.

Q: Why can you reverse the suffix instead of sorting it?
A: The suffix after the pivot is non-increasing, and the swap keeps it non-increasing. Reversing a non-increasing sequence makes it non-decreasing, which is its sorted order, in O(n).

Q: What happens when the array is already the largest permutation, such as 3 2 1?
A: No pivot exists, because the whole array is non-increasing. The algorithm reverses it to 1 2 3, the smallest permutation, which is what std::next_permutation does (it also returns false).

Q: How would you find the kth permutation of 1 to n directly?
A: Use the factorial number system: the first element's index is (k − 1) / (n − 1)!, then recurse on the remaining elements with the remainder. That builds it in O(n²) (or O(n log n) with a Fenwick tree), instead of calling next permutation k times.

## dsa.arrays.in-place-array-tricks
name: "In-place array tricks"
importance: important
scope: "reversal for rotation, marking with signs or indices"

### simple
In-place tricks let you rearrange or annotate an array without making a copy. Rotating a line of people by k spots can be done by reversing the whole line and then reversing the two groups. When values double as indices, you can leave a mark at an index by flipping the sign of the number stored there.

### interview
- **Rotate right by k** with three reversals: reverse all, reverse the first `k`, reverse the rest (take `k %= n` first). O(n) time, O(1) space.
- **Sign marking**: when values are in `[1, n]`, visit value `v` and negate `a[v - 1]` to record "v was seen". A slot already negative means a duplicate; a slot still positive means a missing value.
- **Index encoding**: add `n` (or multiply) to store a second value in the same slot, then recover with `/ n` and `% n` (build array from permutation in place).
- **Write index**: compact kept elements to the front (remove element, move zeroes).
- Use `abs(a[i])` when reading after marking. Restore the array if the caller needs it unchanged.

### questions
Q: How do you rotate an array right by k positions in O(1) extra space?
A: Set k = k mod n, reverse the whole array, then reverse the first k elements and reverse the remaining n − k. The first reversal moves the last k elements to the front (backwards), and the two partial reversals fix their order.

Q: How can you find all duplicates in an array with values from 1 to n without extra space?
A: For each value v (use its absolute value), look at index v − 1. If a[v − 1] is already negative, v is a duplicate; otherwise negate it. This uses the sign bit as a visited flag, in O(n) time and O(1) extra space.

Q: How do you store two numbers in one array slot?
A: If both values are below n, store old + new × n: then old = slot % n and new = slot / n. This lets you build a permuted array in place, for example a[i] = a[a[i]], without a copy.

Q: What must you be careful about with sign marking?
A: Read values with abs() because earlier steps may have negated them, and it only works when 0 isn't a possible value (negating 0 changes nothing). Also mention that the input is modified, and restore the signs if the caller needs the original.
