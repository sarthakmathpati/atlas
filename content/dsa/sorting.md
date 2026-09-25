---
topic: dsa.sorting
name: "Sorting"
subject: dsa
order: 8
prereqs: [dsa.arrays, dsa.recursion]
---

## dsa.sorting.elementary-sorts
name: "Elementary sorts"
importance: important
scope: "bubble, selection, insertion, and when insertion sort shines"

### simple
Elementary sorts are the simple, slow sorting methods you could do by hand. Insertion sort is how most people sort playing cards: pick up one card at a time and slide it left into its place among the cards already held. They take quadratic time in general, but insertion sort is very fast when the cards are already almost in order.

### interview
- **Bubble sort**: swap adjacent out-of-order pairs, repeat passes; stable; O(n²), O(n) best with an early exit when a pass makes no swaps.
- **Selection sort**: repeatedly select the minimum of the unsorted part and swap it into place; always O(n²) comparisons, only n − 1 swaps; not stable.
- **Insertion sort**: grow a sorted prefix by inserting each element into place; stable, in place, **O(n + inversions)**: O(n) on nearly sorted input, O(n²) worst.
- Insertion sort wins on **small** arrays (tens of elements) and **nearly sorted** data, which is why Timsort and introsort use it for small pieces.
- All three use O(1) extra space.

### deep
#### Intuition

All three sorts grow a sorted region one element at a time, but they differ in where the work goes:

- **Selection** finds the right element for the next position (scans the unsorted part).
- **Insertion** finds the right position for the next element (scans the sorted part, from the right).
- **Bubble** lets large elements drift right through repeated adjacent swaps.

#### Worked example: insertion sort

`5 2 4 6 1 3`

| step | insert | sorted prefix after |
|---|---|---|
| 1 | 2 | 2 5 |
| 2 | 4 | 2 4 5 |
| 3 | 6 | 2 4 5 6 |
| 4 | 1 | 1 2 4 5 6 |
| 5 | 3 | 1 2 3 4 5 6 |

Each insertion shifts larger elements one step right. The number of shifts equals the number of **inversions** (pairs out of order), which is why nearly sorted input is fast.

#### Code

```cpp
void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int x = a[i], j = i - 1;
        while (j >= 0 && a[j] > x) {   // strict > keeps equal elements in order (stable)
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = x;
    }
}

void selectionSort(vector<int>& a) {
    for (int i = 0; i + 1 < (int)a.size(); i++) {
        int m = i;
        for (int j = i + 1; j < (int)a.size(); j++)
            if (a[j] < a[m]) m = j;
        swap(a[i], a[m]);              // this long-distance swap breaks stability
    }
}
```

#### Comparison

| Sort | Best | Average | Worst | Stable | Swaps or writes |
|---|---|---|---|---|---|
| Bubble (early exit) | $O(n)$ | $O(n^2)$ | $O(n^2)$ | yes | up to $O(n^2)$ |
| Selection | $O(n^2)$ | $O(n^2)$ | $O(n^2)$ | no | $n - 1$ swaps |
| Insertion | $O(n)$ | $O(n^2)$ | $O(n^2)$ | yes | one shift per inversion |

#### When each is useful

- **Insertion sort**: small subarrays inside faster sorts (below about 16 to 32 elements), nearly sorted data, and online sorting (elements arriving one by one).
- **Selection sort**: when writes are very expensive (flash memory), because it does at most $n - 1$ swaps.
- **Bubble sort**: teaching; its adjacent-swap structure also counts inversions and underlies odd-even sorting networks.

#### Edge cases and bugs

- Using `>=` in insertion sort's inner loop moves equal elements past each other and loses stability.
- Reading `a[j]` before checking `j >= 0`.

Connects to: merge sort, quick sort, inversions (merge-sort counting), Timsort and introsort.

### questions
Q: Why does insertion sort run fast on nearly sorted input?
A: Each element shifts left once for every larger element before it, so the total work is O(n + number of inversions). A nearly sorted array has few inversions, making the sort close to O(n).

Q: Which elementary sort does the fewest swaps, and when does that matter?
A: Selection sort, with at most n − 1 swaps, because each pass places one element with a single swap. It matters when writing is expensive compared to reading, such as with some flash storage.

Q: Why do fast library sorts still use insertion sort?
A: On small arrays, insertion sort's low overhead beats the recursion and bookkeeping of O(n log n) sorts. Introsort and Timsort switch to insertion sort for small pieces, typically below 16 to 32 elements.

Q: Is selection sort stable?
A: Not in its usual form. Swapping the minimum into position can jump an element over an equal one, reversing their order. A version that shifts elements instead of swapping is stable but does more writes.

## dsa.sorting.merge-sort
name: "Merge sort"
importance: must
scope: "divide and conquer, stability, O(n log n) time, extra space"

### simple
Merge sort splits a list in half, sorts each half, and then merges the two sorted halves into one. It is like two people each sorting half a pile of exam papers, then combining their piles by always taking the paper with the lower roll number from the top of either pile. Splitting continues until the piles have one paper each, which are sorted by definition.

### interview
- Divide into halves, sort each recursively, **merge** in O(n). Recurrence T(n) = 2T(n/2) + O(n) = **O(n log n)** in every case.
- **Stable** (take from the left half on ties); needs **O(n)** extra space for arrays (O(log n) stack).
- Great for **linked lists** (merging needs no extra array; O(1) extra besides recursion) and **external sorting** (merging sorted runs from disk).
- Predictable: no bad inputs, unlike quicksort; but slower in practice on arrays due to copying.
- The merge step enables counting problems: inversions, reverse pairs, smaller numbers after self.
- Bottom-up (iterative) version merges runs of size 1, 2, 4, … with no recursion.

### deep
#### Intuition

Merging two sorted lists is easy and linear. So if you can get two sorted halves, one merge finishes the job. Getting sorted halves is the same problem at half the size, which you solve the same way until pieces have one element.

#### Worked example

`38 27 43 3 9 82 10`

```
split:  [38 27 43 3]          [9 82 10]
split:  [38 27] [43 3]        [9 82] [10]
split:  [38][27] [43][3]      [9][82] [10]
merge:  [27 38] [3 43]        [9 82] [10]
merge:  [3 27 38 43]          [9 10 82]
merge:  [3 9 10 27 38 43 82]
```

There are $\lceil \log_2 7 \rceil = 3$ merge levels, each touching all 7 elements.

#### Code

```cpp
void mergeSort(vector<int>& a, vector<int>& buf, int lo, int hi) {  // sorts a[lo..hi)
    if (hi - lo <= 1) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, buf, lo, mid);
    mergeSort(a, buf, mid, hi);
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) buf[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];  // <= : stable
    while (i < mid) buf[k++] = a[i++];
    while (j < hi) buf[k++] = a[j++];
    copy(buf.begin() + lo, buf.begin() + hi, a.begin() + lo);
}

void mergeSort(vector<int>& a) {
    vector<int> buf(a.size());      // one buffer, reused by every merge
    mergeSort(a, buf, 0, a.size());
}
```

#### Complexity

Each level of recursion merges $n$ elements in total, and there are $\log_2 n$ levels: $O(n \log n)$ time for best, average and worst case. Space: $O(n)$ for the buffer plus $O(\log n)$ recursion stack.

#### Merge sort on linked lists

Find the middle with fast and slow pointers, cut, sort both halves, and merge by relinking nodes. No buffer is needed, and there is no random access that would favor quicksort, so merge sort is the standard choice for lists (`std::list::sort` uses it).

#### Edge cases and bugs

- `mid = (lo + hi) / 2` can overflow on huge ranges; use `lo + (hi - lo) / 2`.
- Using `<` in the merge makes the sort unstable.
- Allocating a new buffer in every call is correct but slow; allocate once.
- Off-by-one in half-open `[lo, hi)` vs closed ranges: pick one convention.

#### Variants

- **Bottom-up merge sort**: iterative, merges widths 1, 2, 4, …; good for linked lists and avoids recursion.
- **Natural merge sort / Timsort**: detect existing sorted runs and merge them; $O(n)$ on already sorted input.
- **External merge sort**: sort chunks that fit in memory, write them to disk, then k-way merge with a heap.
- **Counting during merge**: inversions and related counts.

Connects to: divide and conquer, merging sorted sequences, merge-sort counting, k-way merge, recursion complexity.

### questions
Q: What is the time complexity of merge sort, and why is it the same in every case?
A: O(n log n). The split always halves the array regardless of the values, giving log n levels, and merging at each level touches every element once. No input can unbalance the recursion.

Q: Why is merge sort stable, and why does that matter?
A: When the two heads are equal, the merge takes the one from the left half first, so equal elements keep their original order. Stability matters when sorting records by one key after another, for example by date and then by name.

Q: What extra space does merge sort need?
A: O(n) for the merge buffer when sorting arrays, plus O(log n) for the recursion stack. On linked lists merging only relinks nodes, so the extra space is just the stack (or O(1) for the bottom-up version).

Q: When would you choose merge sort over quicksort?
A: When you need stability, a guaranteed O(n log n) worst case, when sorting linked lists, or when data doesn't fit in memory and must be merged from sorted runs. Quicksort is usually faster on arrays in memory because it is in place and cache-friendly.

Q: How does external sorting use merge sort?
A: Read chunks that fit in memory, sort each and write it back as a sorted run. Then merge all runs with a k-way merge using a min-heap of the runs' current heads, reading and writing sequentially.

## dsa.sorting.quick-sort
name: "Quick sort"
importance: must
scope: "Lomuto and Hoare partitions, pivot choice, randomization, worst case"

### simple
Quick sort picks one item as a pivot and splits the rest into items smaller and larger than it. It is like sorting a class by height: pick one student, send shorter students to the left and taller ones to the right, then repeat within each group. The pivot is already in its final place after the split.

### interview
- **Partition** around a pivot, then recurse on both sides. Average **O(n log n)**, worst **O(n²)** when pivots are repeatedly the smallest or largest (sorted input with a first or last pivot).
- **Randomized pivot** (or median of three) makes the worst case extremely unlikely: expected O(n log n) for every input.
- **In place**, O(log n) expected stack (recurse into the smaller side first to guarantee it). **Not stable**.
- **Lomuto**: pivot at the end, one scan, simple; more swaps; degrades with many equal keys.
- **Hoare**: two pointers from the ends, fewer swaps; returns a split point, the pivot isn't necessarily in its final place.
- Many duplicates: use **three-way partitioning** (Dutch national flag). `std::sort` is introsort: quicksort that switches to heap sort if recursion gets too deep.

### deep
#### Intuition

After one partition, the pivot sits exactly where it will be in the sorted array, with smaller elements on its left and larger on its right. Nothing ever needs to cross the pivot again, so the two sides can be sorted independently. If pivots split the array roughly in half, there are $\log n$ levels of $O(n)$ partitioning.

#### Lomuto partition, traced

Pivot = last element. `i` marks the end of the "smaller than pivot" region.

`a = 7 2 1 6 8 5 3 4`, pivot 4.

| j | a[j] | a[j] < 4? | array after | i |
|---|---|---|---|---|
| 0 | 7 | no | 7 2 1 6 8 5 3 4 | 0 |
| 1 | 2 | yes, swap a[0], a[1] | 2 7 1 6 8 5 3 4 | 1 |
| 2 | 1 | yes, swap a[1], a[2] | 2 1 7 6 8 5 3 4 | 2 |
| 3 | 6 | no | | 2 |
| 4 | 8 | no | | 2 |
| 5 | 5 | no | | 2 |
| 6 | 3 | yes, swap a[2], a[6] | 2 1 3 6 8 5 7 4 | 3 |

Finally swap the pivot into `a[3]`: `2 1 3 4 8 5 7 6`. The 4 is in its final place.

#### Code

```cpp
int lomuto(vector<int>& a, int lo, int hi) {          // partitions a[lo..hi], pivot a[hi]
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);
    swap(a[i], a[hi]);
    return i;                                          // pivot's final index
}

int hoare(vector<int>& a, int lo, int hi) {           // returns p: a[lo..p] <= a[p+1..hi]
    int pivot = a[lo + (hi - lo) / 2], i = lo - 1, j = hi + 1;
    while (true) {
        do i++; while (a[i] < pivot);
        do j--; while (a[j] > pivot);
        if (i >= j) return j;
        swap(a[i], a[j]);
    }
}

void quickSort(vector<int>& a, int lo, int hi, mt19937& rng) {
    while (lo < hi) {
        swap(a[lo + (int)(rng() % (hi - lo + 1))], a[hi]);   // random pivot to the end
        int p = lomuto(a, lo, hi);
        if (p - lo < hi - p) {                  // recurse on the smaller side,
            quickSort(a, lo, p - 1, rng);       // loop on the larger: O(log n) stack
            lo = p + 1;
        } else {
            quickSort(a, p + 1, hi, rng);
            hi = p - 1;
        }
    }
}
```

With Hoare's scheme, recurse on `[lo, p]` and `[p + 1, hi]` (the pivot is included in the left side).

#### Complexity

- Best and average: $O(n \log n)$; the expected number of comparisons with random pivots is about $1.39 \, n \log_2 n$.
- Worst: $O(n^2)$: $T(n) = T(n-1) + O(n)$.
- Space: $O(\log n)$ stack when recursing on the smaller side first; otherwise $O(n)$ in the worst case.

#### Why quicksort is fast in practice

It partitions in place with sequential scans (cache-friendly), does few writes compared with merge sort's copying, and has a small inner loop. That is why it is the default for primitive arrays in many libraries (`std::sort` is introsort: quicksort that switches to heap sort when recursion gets too deep, and to insertion sort on small ranges).

#### Edge cases and bugs

- All equal elements: Lomuto puts everything on one side, $O(n^2)$. Hoare handles it better; three-way partitioning is best.
- Sorted input with a fixed first or last pivot: $O(n^2)$. Randomize.
- Hoare with `lo` as pivot and recursion on `[lo, p - 1]` loses elements; use `[lo, p]`.
- Deep recursion on adversarial input can overflow the stack.

#### Variants

- Three-way quicksort for many duplicates.
- Quickselect: recurse into one side only, average $O(n)$.
- Introsort: quicksort plus a depth limit of about $2 \log n$, then heap sort, then insertion sort for small pieces.

Connects to: Dutch national flag, quickselect, divide and conquer, heap sort.

### questions
Q: What is quicksort's worst case, and what input triggers it?
A: O(n²), when each partition splits off only the pivot, for example a sorted array with the first or last element as the pivot. The recursion then has n levels of O(n) work.

Q: How does a random pivot help?
A: No fixed input can reliably produce bad splits, so the expected running time is O(n log n) for every input. A bad run needs many unlucky pivot choices in a row, which is extremely unlikely.

Q: Compare the Lomuto and Hoare partition schemes.
A: Lomuto scans once with the pivot at the end and places the pivot at its final index; it is simple but does more swaps and degrades with many equal keys. Hoare moves two pointers toward each other and swaps misplaced pairs; it does about three times fewer swaps on average, but it only returns a split point and the pivot may not end in its final place.

Q: Why is quicksort not stable?
A: Partitioning swaps elements across long distances, which can reorder equal keys. Making it stable needs extra space, which removes its main advantage.

Q: How do you keep quicksort's stack depth at O(log n)?
A: Recurse into the smaller side and handle the larger side with a loop (tail-call elimination). The smaller side is at most half the size, so the recursion depth is at most log₂ n.

## dsa.sorting.heap-sort
name: "Heap sort"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "in-place, not stable"

### simple
Heap sort first arranges the array into a heap, a tree where every parent is at least as large as its children, so the largest item sits at the top. Then it repeatedly swaps the top item to the end of the array and repairs the heap. It is like a tournament where the winner leaves each round and the remaining players rerun just the part of the bracket they need.

### interview
- Build a **max-heap** in place in **O(n)** (sift down from the last parent to the root).
- Repeat n − 1 times: swap the root with the last heap element, shrink the heap, sift the new root down: **O(log n)** each.
- **O(n log n)** in every case, **O(1)** extra space, **not stable**.
- Slower than quicksort in practice (jumps around memory, poor cache locality), but has no bad inputs; introsort uses it as a fallback.
- Array layout: children of `i` are `2i + 1` and `2i + 2`; parent is `(i - 1) / 2`.

### questions
Q: How does heap sort work?
A: Turn the array into a max-heap in place, so the maximum is at index 0. Swap it with the last element, shrink the heap by one, and sift the new root down to restore the heap. Repeating this places elements from largest to smallest at the end of the array.

Q: Why is building the heap O(n) rather than O(n log n)?
A: Sifting down costs time proportional to a node's height, and most nodes are near the bottom: half the nodes are leaves with height 0, a quarter have height 1, and so on. Summing heights over all nodes gives O(n).

Q: Why is heap sort rarely the fastest choice in practice?
A: Sifting jumps between index i and 2i + 1, which touches distant memory and causes cache misses, and each step does more comparisons than quicksort's tight partition loop. Its value is the guaranteed O(n log n) with O(1) extra space.

Q: Is heap sort stable?
A: No. Swapping the root with the last element moves elements across long distances, so equal keys can change order.

## dsa.sorting.counting-radix-and-bucket-sort
name: "Counting, radix and bucket sort"
importance: important
scope: "non-comparison sorts and when they apply"

### simple
These sorts beat the usual speed limit by never comparing two items; instead they use the values themselves as positions. Counting sort is like sorting exam papers by score using one tray per possible score. Radix sort sorts by one digit at a time, and bucket sort drops values into ranges and sorts each small range.

### interview
- **Counting sort**: count each value in `[0, k]`, take prefix sums to get positions, place elements (backwards for stability). **O(n + k)** time and space; only for small integer ranges.
- **Radix sort**: stable counting sort by each digit, least significant first. **O(d · (n + b))** for d digits in base b; good for fixed-width integers and strings of equal length.
- **Bucket sort**: split the range into n buckets, sort each, concatenate. **O(n)** average for uniformly distributed data; O(n²) worst if everything lands in one bucket.
- They escape the Ω(n log n) bound because they don't sort by comparisons.
- Interview uses: sort by frequency with buckets, top k frequent, maximum gap (buckets by pigeonhole), sorting ages or grades, H-index.

### questions
Q: How can counting sort be faster than O(n log n)?
A: It doesn't compare elements; it counts how many times each value occurs and computes positions from the counts. That takes O(n + k) for values in a range of size k, which is linear when k is O(n). The comparison lower bound doesn't apply.

Q: Why must the per-digit sort inside radix sort be stable?
A: Radix sort processes digits from least to most significant. After sorting by a higher digit, elements with equal higher digits must stay in the order established by the lower digits, which only a stable sort guarantees.

Q: When does bucket sort degrade, and to what?
A: When the input isn't spread evenly and many elements fall into the same bucket. Sorting that bucket then dominates: O(n²) with insertion sort inside, or O(n log n) with a comparison sort.

Q: How do buckets solve the maximum gap problem in linear time?
A: With n numbers between min and max, the largest gap is at least (max − min)/(n − 1). Make buckets of that width: the maximum gap can't be inside one bucket, so it is between the maximum of one non-empty bucket and the minimum of the next. Tracking only each bucket's min and max gives O(n).

## dsa.sorting.stability-and-custom-comparators
name: "Stability and custom comparators"
importance: must
scope: "sorting by multiple keys, comparator rules"

### simple
A stable sort keeps items with equal keys in the order they started in. If you sort a class list by grade with a stable sort, students with the same grade stay in alphabetical order from before. A comparator is the rule you give the sort to decide which of two items comes first.

### interview
- **Stable**: merge sort, insertion sort, `std::stable_sort`. **Not stable**: quicksort, heap sort, selection sort, `std::sort`.
- **Multiple keys**: compare the primary key, and only on a tie compare the next key. Or stable-sort by the least important key first, then by more important keys.
- C++ comparators must be a **strict weak ordering**: `comp(a, a)` is false; never use `<=` (undefined behavior, crashes are possible).
- Several keys in one comparator: `return tie(a.grade, a.name) < tie(b.grade, b.name);`, and swap the sides of one key to sort it descending.
- Custom orders: "largest number" (compare `a + b` vs `b + a`), sort by frequency then value, sort points by distance.

### deep
#### Intuition

Sorting libraries don't know what "smaller" means for your data, so you tell them with a comparator (or a key function). The comparator must behave like a consistent "less than", or the sort may produce garbage or crash. Stability is the other half: when two items compare equal, does their original order survive?

#### Sorting by several keys

Sort people by age ascending, then name ascending:

| original | after sort |
|---|---|
| (Ria, 25) | (Ana, 22) |
| (Ana, 22) | (Dev, 25) |
| (Dev, 25) | (Ria, 25) |

Two equivalent approaches:

1. One comparator: compare ages; if equal, compare names. (Tuples compare this way automatically.)
2. Two stable sorts: first by name, then by age. Because the second sort is stable, equal ages keep the name order from the first sort.

#### Code

```cpp
struct Person { string name; int age; };

void sortPeople(vector<Person>& people) {
    sort(people.begin(), people.end(), [](const Person& a, const Person& b) {
        if (a.age != b.age) return a.age < b.age;   // primary key
        return a.name < b.name;                     // tie-breaker
        // Equivalent: return tie(a.age, a.name) < tie(b.age, b.name);
    });
}

// Custom order: arrange numbers to form the largest concatenation.
string largestNumber(vector<int> nums) {
    vector<string> s;
    for (int x : nums) s.push_back(to_string(x));
    sort(s.begin(), s.end(), [](const string& a, const string& b) {
        return a + b > b + a;                       // strict: false when equal
    });
    if (s[0] == "0") return "0";
    string out;
    for (auto& x : s) out += x;
    return out;
}
```

#### Comparator rules (strict weak ordering)

A C++ comparator `comp` must satisfy:

1. **Irreflexive**: `comp(a, a)` is false. This is why `<=` is illegal.
2. **Asymmetric**: if `comp(a, b)` then not `comp(b, a)`.
3. **Transitive**: `comp(a, b)` and `comp(b, c)` imply `comp(a, c)`.
4. **Transitive equivalence**: if `a` ties with `b` and `b` ties with `c`, then `a` ties with `c`.

Breaking them is undefined behavior: `std::sort` may read out of bounds. A common culprit is comparing floating-point values that include NaN, or a comparator that depends on mutable state.

#### Pitfalls

- Comparing by subtraction (`return a - b < 0;`) overflows for values of large magnitude; compare directly with `a < b`.
- Sorting an array of indices by values: capture the values by reference and compare `v[i] < v[j]`, tie-breaking by index for determinism.
- Descending order: use `greater<>()` or reverse the comparison, never negate the result of `<`.
- Sorting objects by a key that is expensive to compute: compute the keys once into a vector of `pair<key, index>`, sort that, then reorder (decorate-sort-undecorate).

#### Complexity

Comparator sorts are $O(n \log n)$ comparisons; if each comparison costs $O(L)$ (strings of length $L$), the total is $O(n L \log n)$.

Connects to: merge sort (stable), quick sort (unstable), intervals (sort by start or end), greedy with sorting.

### questions
Q: What does it mean for a sort to be stable, and name stable and unstable examples?
A: A stable sort keeps elements with equal keys in their original relative order. Merge sort, insertion sort and std::stable_sort are stable; quicksort, heap sort and std::sort are not.

Q: How do you sort by two keys?
A: Compare by the primary key and use the secondary key only to break ties, for example with a tuple comparison. Alternatively, stable-sort by the secondary key first and then by the primary key.

Q: Why is using <= in a C++ sort comparator a bug?
A: std::sort requires a strict weak ordering, where comp(a, a) must be false. With <=, equal elements compare as "less than" each other, which is undefined behavior and can make the sort read past the array's end.

Q: How do you sort numbers to form the largest possible concatenated number?
A: Sort the numbers as strings with the rule that a comes before b when a + b > b + a. This ordering is transitive, so the sorted concatenation is the largest; return "0" if the first string is "0".

Q: Why must a C++ sort comparator never use <=?
A: std::sort requires a strict weak ordering, where comp(a, a) is false. With <=, equal elements each claim to come first, which is undefined behavior: std::sort may loop forever or read past the end of the range.

## dsa.sorting.quickselect
name: "Quickselect"
importance: must
pattern: true
prereqs: [dsa.sorting.quick-sort]
scope: "kth element in average O(n)"

### simple
Quickselect finds the kth smallest item without sorting everything. It partitions around a pivot like quicksort, then continues only into the side that contains position k, ignoring the other side. It is like finding the fifth tallest student by splitting the class around one student and only re-checking the group that must contain the answer.

### interview
- Partition around a random pivot; if the pivot lands at index `k`, done; else recurse (or loop) into one side only.
- **Average O(n)** (n + n/2 + n/4 + … ≈ 2n), **worst O(n²)**; random pivots make the worst case unlikely. Median of medians guarantees O(n) but is slower in practice.
- In place, O(1) extra with the iterative version; reorders the array.
- Kth largest = index `n - k` in ascending order.
- C++ `std::nth_element` does this. Alternative: a min-heap of size k in **O(n log k)** without modifying the input, good for streams.
- After quickselect, the k smallest elements are all in `a[0..k-1]` (unsorted), which solves "k closest points".

### deep
#### Intuition

Quicksort recurses into both sides of every partition. But to find the element that belongs at index $k$, only the side containing $k$ matters. With good pivots the problem size halves each time, and the total work is a geometric series:

$$n + \frac{n}{2} + \frac{n}{4} + \dots < 2n = O(n)$$

#### Worked example: 3rd smallest (k = 2, zero-based)

`a = 7 10 4 3 20 15`

1. Pivot 15 (say). Lomuto puts smaller elements first: `7 10 4 3 15 20`, pivot at index 4. `k = 2 < 4`: continue in `[0, 3]`.
2. Pivot 3: `3 10 4 7`, pivot at index 0. `k = 2 > 0`: continue in `[1, 3]`.
3. Pivot 7: `4 7 10` in positions 1 to 3, pivot at index 2 = k. Answer **7**.

Check: sorted is `3 4 7 10 15 20`; index 2 holds 7.

#### Code

```cpp
int quickselect(vector<int> a, int k) {            // k-th smallest, 0-based
    mt19937 rng(12345);
    int lo = 0, hi = (int)a.size() - 1;
    while (true) {
        swap(a[lo + (int)(rng() % (hi - lo + 1))], a[hi]);  // random pivot to the end
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < pivot) swap(a[i++], a[j]);
        swap(a[i], a[hi]);                                   // pivot now at its final index i
        if (i == k) return a[i];
        if (i < k) lo = i + 1;                               // answer is right of the pivot
        else hi = i - 1;                                     // answer is left of the pivot
    }
}

int kthLargest(const vector<int>& a, int k) {       // k-th largest, 1-based
    return quickselect(a, (int)a.size() - k);
}
```

With many equal values, Lomuto's partition as written degrades toward $O(n^2)$ (all equal elements land on one side); a three-way partition into less, equal and greater fixes it.

#### Complexity

Expected $O(n)$ time with random pivots; worst case $O(n^2)$. Median of medians (groups of five) picks a pivot guaranteed to be between the 30th and 70th percentile, giving $T(n) \le T(n/5) + T(7n/10) + O(n) = O(n)$ worst case, with a large constant.

#### Quickselect or heap?

| | Quickselect | Min-heap of size k |
|---|---|---|
| Time | $O(n)$ average | $O(n \log k)$ |
| Extra space | $O(1)$ (in place) | $O(k)$ |
| Modifies input | yes | no |
| Works on a stream | no | yes |

#### Edge cases and bugs

- Off by one between "k-th largest" (1-based) and index `n - k`.
- Many duplicates with a two-way partition: use three-way partitioning or `<=` handling carefully.
- Forgetting to randomize: sorted input gives $O(n^2)$.

#### Variants

- K closest points to the origin: quickselect on distances, return the first k.
- Median of an unsorted array: `k = n / 2` (and `n / 2 - 1` for even n).
- Wiggle sort II: median by quickselect, then three-way partition with index mapping.
- Top k frequent: quickselect on (frequency) values.

Connects to: quick sort, top K elements with heaps, Dutch national flag, median.

### questions
Q: Why does quickselect run in O(n) on average while quicksort takes O(n log n)?
A: After partitioning, quickselect continues into only one side, the side containing position k. With balanced pivots the sizes shrink geometrically, n + n/2 + n/4 + …, which sums to about 2n. Quicksort recurses into both sides, so every level does O(n) work across log n levels.

Q: What is quickselect's worst case, and how do you avoid it?
A: O(n²), when pivots are always extreme and each step removes only one element. A random pivot makes this very unlikely; median of medians guarantees O(n) worst case but is slower in practice.

Q: How do you find the kth largest element with quickselect?
A: The kth largest is the element at index n − k in ascending order, so run quickselect for index n − k. Alternatively, reverse the partition comparison.

Q: When would you prefer a heap over quickselect for top k?
A: When the data arrives as a stream, when the input must not be modified, or when k is small compared with n. A min-heap of size k gives O(n log k) time and O(k) space.

Q: After quickselect for index k, what else do you know about the array?
A: Every element before index k is at most a[k] and every element after is at least a[k]. So the first k elements are the k smallest, in no particular order, which answers "k closest" style questions directly.

### signals
- kth smallest or kth largest element in an unsorted array
- median of unsorted data without sorting
- "the k closest", "the k smallest" where their order doesn't matter
- expected O(n) required, and modifying the array is allowed

### template
```cpp
// Quickselect (iterative, random pivot): returns the element that belongs at index k.
int selectKth(vector<int>& a, int k) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        swap(a[lo + rand() % (hi - lo + 1)], a[hi]);      // random pivot
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; j++)                     // Lomuto partition
            if (a[j] < pivot) swap(a[i++], a[j]);
        swap(a[i], a[hi]);
        if (i == k) break;
        if (i < k) lo = i + 1;                            // keep only the side with k
        else hi = i - 1;
    }
    return a[k];                                          // a[0..k-1] <= a[k] <= a[k+1..]
}
```

## dsa.sorting.merge-sort-counting
name: "Merge-sort counting"
importance: important
pattern: true
prereqs: [dsa.sorting.merge-sort]
scope: "inversions, reverse pairs, count of smaller numbers after self"

### simple
Merge sort can count pairs of items that are out of order while it sorts. When merging two sorted halves, if an item from the right half is placed before items remaining in the left half, it was out of order with all of them. It is like two sorted queues merging at a gate: every time someone from the second queue goes first, you know how many people they overtook.

### interview
- An **inversion** is a pair `i < j` with `a[i] > a[j]`. Brute force O(n²); merge sort counting **O(n log n)**.
- During the merge, when `right[j] < left[i]`, the right element forms an inversion with **all remaining left elements**: add `mid - i`.
- **Reverse pairs** (`a[i] > 2·a[j]`): before merging, count with a separate two-pointer pass over the sorted halves, then merge normally.
- **Count of smaller numbers after self**: sort indices instead of values; when a left element is placed, add the number of right elements already placed.
- Alternative: a Fenwick tree over compressed values, scanning from the right.
- Inversion count = the number of adjacent swaps bubble sort would make.

### deep
#### Intuition

Every pair $(i, j)$ with $i < j$ is split at exactly one level of merge sort: the level where $i$ lands in the left half and $j$ in the right half. At that merge, both halves are sorted, so the pairs across the halves can be counted in bulk. When the right head is smaller than the left head, it is smaller than every remaining left element too.

#### Worked example: counting inversions

`2 4 1 3 5`: inversions are (2,1), (4,1), (4,3) = 3.

Merge `[2 4]` with `[1 3 5]` (both already sorted at this level; the halves themselves contain no inversions here):

| left remaining | right head | take | added |
|---|---|---|---|
| 2 4 | 1 | 1 (from right) | 2 (both 2 and 4) |
| 2 4 | 3 | 2 (from left) | 0 |
| 4 | 3 | 3 (from right) | 1 (the 4) |
| 4 | 5 | 4 | 0 |
| | 5 | 5 | 0 |

Total 3.

#### Code

```cpp
long long sortCount(vector<int>& a, vector<int>& buf, int lo, int hi) {  // a[lo..hi)
    if (hi - lo <= 1) return 0;
    int mid = lo + (hi - lo) / 2;
    long long count = sortCount(a, buf, lo, mid) + sortCount(a, buf, mid, hi);
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) buf[k++] = a[i++];
        else {
            count += mid - i;                 // a[j] is smaller than all of a[i..mid)
            buf[k++] = a[j++];
        }
    }
    while (i < mid) buf[k++] = a[i++];
    while (j < hi) buf[k++] = a[j++];
    copy(buf.begin() + lo, buf.begin() + hi, a.begin() + lo);
    return count;
}

long long countInversions(vector<int> a) {
    vector<int> buf(a.size());
    return sortCount(a, buf, 0, a.size());
}
```

#### Reverse pairs

For `a[i] > 2 * a[j]`, the counting condition differs from the merge order, so count in a separate pass before merging: for each `i` in the sorted left half, advance `j` in the sorted right half while `a[i] > 2 * a[j]` (use 64-bit), and add `j - mid`. Both pointers only move forward, so the pass is linear and the total stays $O(n \log n)$.

#### Complexity

$O(n \log n)$ time (merge sort plus a linear pass per merge), $O(n)$ extra space.

#### Edge cases and bugs

- Use `<=` when taking from the left, so equal values are not counted as inversions.
- The count can reach $n(n-1)/2 \approx 5 \cdot 10^9$ for $n = 10^5$: use 64-bit.
- Sorting the values loses their original positions; sort indices when per-element answers are needed.

#### Variants

- Count of range sum: prefix sums, then count pairs with `lower <= P[j] - P[i] <= upper` during the merge.
- Global versus local inversions, and minimum adjacent swaps to sort (equals the inversion count).
- Fenwick tree version: coordinate-compress, scan from the right, query how many smaller values were seen.

Connects to: merge sort, Fenwick tree, coordinate compression, elementary sorts (bubble sort swaps).

### questions
Q: How do you count inversions in O(n log n)?
A: Run merge sort and count during each merge. When the right half's head is smaller than the left half's head, it is smaller than every remaining left element, so add the number of remaining left elements. Every inversion is counted exactly once, at the merge where its two elements are separated.

Q: Why must you use <= when taking from the left half?
A: Equal elements are not inversions. Taking the left element first on ties means a right element is only counted against left elements strictly greater than it.

Q: How do you count reverse pairs, where a[i] > 2·a[j]?
A: Before merging two sorted halves, run a separate two-pointer pass: for each left element, advance a pointer in the right half while a[i] > 2·a[j] and add how far it has moved. Then merge normally. The condition differs from the merge order, so it can't be counted inside the merge.

Q: How do you compute, for each element, how many smaller elements come after it?
A: Merge sort an array of indices by value. When an element from the left half is placed, the right-half elements already placed are exactly the smaller ones that come after it, so add that count to its answer. A Fenwick tree over compressed values scanning from the right also works.

### signals
- count pairs (i < j) where the earlier element is larger than the later one
- "number of smaller elements to the right" for every position
- count pairs satisfying an inequality between an earlier and a later element
- minimum adjacent swaps to sort, or how far an array is from sorted

### template
```cpp
// Merge sort that counts cross pairs (i in left, j in right) before merging.
long long countCross(vector<long long>& a, vector<long long>& buf, int lo, int hi) {
    if (hi - lo <= 1) return 0;
    int mid = lo + (hi - lo) / 2;
    long long cnt = countCross(a, buf, lo, mid) + countCross(a, buf, mid, hi);
    for (int i = lo, j = mid; i < mid; i++) {      // both halves sorted: two pointers
        while (j < hi && a[i] > a[j]) j++;         // condition, e.g. a[i] > 2 * a[j]
        cnt += j - mid;                            // right elements paired with a[i]
    }
    merge(a.begin() + lo, a.begin() + mid, a.begin() + mid, a.begin() + hi, buf.begin() + lo);
    copy(buf.begin() + lo, buf.begin() + hi, a.begin() + lo);
    return cnt;
}
```

## dsa.sorting.comparison-sorting-lower-bound
name: "Comparison sorting lower bound"
importance: important
scope: "why Ω(n log n)"

### simple
Any sort that only learns about the data by comparing pairs of items needs about n log n comparisons in the worst case. Think of a game of twenty questions where each yes-or-no answer can at best halve the possible orderings. Since there are n! possible orderings, you need about log₂(n!) questions, which grows like n log n.

### interview
- Model a comparison sort as a **decision tree**: each internal node is a comparison, each leaf an output order.
- It must distinguish all **n!** permutations, so it needs at least n! leaves; a binary tree of height h has at most 2ʰ leaves.
- So h ≥ log₂(n!) = **Θ(n log n)** (by Stirling, log₂ n! ≈ n log₂ n − 1.44n).
- Merge sort and heap sort are therefore asymptotically optimal among comparison sorts.
- Counting, radix and bucket sorts escape the bound because they use values as indices, not just comparisons.
- The same argument gives Ω(log n) for searching a sorted array and Ω(n log n) for element distinctness in the comparison model.

### questions
Q: Why can't a comparison-based sort beat Ω(n log n) in the worst case?
A: Each comparison has two outcomes, so after h comparisons the algorithm can distinguish at most 2^h cases. It must distinguish all n! orderings of the input, so 2^h ≥ n!, giving h ≥ log₂(n!) = Θ(n log n).

Q: How is log₂(n!) related to n log n?
A: n! is at least (n/2)^(n/2), because its top half of factors are each at least n/2, so log₂(n!) ≥ (n/2) log₂(n/2) = Ω(n log n). It is also at most n log₂ n, so log₂(n!) = Θ(n log n).

Q: How do counting sort and radix sort get around the lower bound?
A: They never compare two elements; they use the values directly as array indices or digits. The decision-tree argument only covers algorithms whose only access to the data is pairwise comparisons.

Q: Does the lower bound hold for the average case too?
A: Yes. The average depth of the leaves in a binary tree with n! leaves is also at least log₂(n!), so even the average number of comparisons over all input orders is Ω(n log n).
