---
topic: dsa.two-pointers
name: "Two pointers"
subject: dsa
order: 5
prereqs: [dsa.arrays]
---

## dsa.two-pointers.opposite-ends-pointers
name: "Opposite-ends pointers"
importance: must
pattern: true
scope: "sorted pair sum, palindrome checks, container with most water"

### simple
Opposite-ends pointers start one finger at each end of an array and move them toward each other. Think of two people searching a sorted bookshelf for two books whose prices add up to a budget: if the total is too high, the person on the expensive end steps inward; if too low, the cheap end steps inward. Each step rules out a whole row of pairs at once.

### interview
- Start `l = 0`, `r = n - 1`; loop `while (l < r)`; decide which pointer to move using a property that makes the other choice useless.
- **Sorted pair sum**: sum too small → `l++`; too big → `r--`. **O(n)** time, **O(1)** space.
- **Palindrome check**: compare `s[l]` and `s[r]`, move both inward (skip non-alphanumerics when asked).
- **Container with most water**: area is `min(h[l], h[r]) * (r - l)`; move the **shorter** side, because keeping it can only give smaller areas.
- Correctness argument: every skipped pair is provably no better than one already considered.
- Requires sorted data or a monotonic property; sort first (O(n log n)) if needed and indices aren't required.

### deep
#### Intuition

A brute force over pairs is $O(n^2)$. On sorted data, the pair $(l, r)$ tells you something about many other pairs at once. If $a_l + a_r$ is too large, then $a_r$ paired with anything at index $\ge l$ is also too large (the array is sorted), so $r$ can never be part of an answer: drop it. Each step eliminates one index, so at most $n$ steps.

#### Worked example: pair with sum 10

Sorted: `1 3 4 6 8 11`

| l | r | a[l] + a[r] | action |
|---|---|---|---|
| 0 (1) | 5 (11) | 12 | too big: r-- |
| 0 (1) | 4 (8) | 9 | too small: l++ |
| 1 (3) | 4 (8) | 11 | too big: r-- |
| 1 (3) | 3 (6) | 9 | too small: l++ |
| 2 (4) | 3 (6) | 10 | found |

#### Code

```cpp
// Sorted pair sum: indices of two values adding up to target, or {-1, -1}.
pair<int, int> pairWithSum(const vector<int>& a, long long target) {
    int l = 0, r = (int)a.size() - 1;
    while (l < r) {
        long long s = (long long)a[l] + a[r];
        if (s == target) return {l, r};
        if (s < target) l++;         // a[l] is too small for every remaining partner
        else r--;                    // a[r] is too big for every remaining partner
    }
    return {-1, -1};
}

// Container with most water: move the shorter wall.
long long maxArea(const vector<int>& h) {
    int l = 0, r = (int)h.size() - 1;
    long long best = 0;
    while (l < r) {
        best = max(best, (long long)min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++;
        else r--;
    }
    return best;
}
```

```python
def is_palindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        if not s[l].isalnum():
            l += 1
        elif not s[r].isalnum():
            r -= 1
        elif s[l].lower() != s[r].lower():
            return False
        else:
            l, r = l + 1, r - 1
    return True

def max_area(h):
    l, r, best = 0, len(h) - 1, 0
    while l < r:
        best = max(best, min(h[l], h[r]) * (r - l))
        if h[l] < h[r]:
            l += 1
        else:
            r -= 1
    return best
```

Time $O(n)$, space $O(1)$.

#### Why moving the shorter wall is safe

With walls at $l$ and $r$ and $h_l \le h_r$, any container using $l$ with a right wall $r' < r$ has width smaller than $r - l$ and height at most $h_l$. So its area is below the current one. Wall $l$ has nothing better to offer, and discarding it loses no answer.

#### Edge cases and bugs

- `l <= r` instead of `l < r` pairs an element with itself.
- Sum overflow with large values: use 64-bit.
- Forgetting to move a pointer in some branch causes an infinite loop.
- If the input isn't sorted and you sort it, you lose original indices; sort `(value, index)` pairs.

#### Variants

- **Two sum less than K**, **count pairs with sum below K**: when `a[l] + a[r] < K`, all pairs `(l, l+1..r)` qualify, so add `r - l` and move `l`.
- **Valid palindrome with one deletion**: on the first mismatch, try skipping either side once.
- **Reverse in place**, **squares of a sorted array** (fill the output from the back with the larger absolute value).
- **3Sum and kSum**: fix elements, then run this on the rest.

Connects to: kSum, binary search, palindromes, trapping rain water.

### questions
Q: Why does the two-pointer method find a pair with a given sum in a sorted array?
A: If a[l] + a[r] is too small, a[l] plus any element at or before r is also too small, so l can be discarded; symmetrically, if it's too large, r can be discarded. Each step removes one candidate and never removes an index that belongs to a valid pair, so the search is O(n) and complete.

Q: In "container with most water", why do you move the shorter wall?
A: The area is limited by the shorter wall. Keeping the shorter wall and moving the taller one inward can only reduce the width without raising the limiting height, so every such container is worse. Moving the shorter wall is the only move that might find a larger area.

Q: How do you count pairs with a sum less than K in a sorted array?
A: Use two pointers from both ends. If a[l] + a[r] < K, then a[l] pairs with every index from l + 1 to r, so add r − l and move l right; otherwise move r left. That is O(n) after sorting.

Q: What must you watch for if the problem needs original indices but the array is unsorted?
A: Sorting loses the positions, so sort pairs of (value, original index) and report the stored indices. Or use a hash map instead, which works on unsorted data in O(n).

Q: How would you check whether a string can become a palindrome by deleting at most one character?
A: Move two pointers inward while the characters match. At the first mismatch, check whether either s[l + 1..r] or s[l..r − 1] is a palindrome. That is O(n) because the second check runs once.

### signals
- a sorted array and a pair (or triple) with a target sum
- comparing elements from both ends: palindromes, reversal, symmetric checks
- maximize an area or distance between two chosen positions
- "squares of a sorted array" or merging from both ends toward the middle
- O(1) extra space required on sorted input

### template
```cpp
// Opposite-ends two pointers on a sorted array (or a sequence with a monotonic rule).
int twoPointersFromEnds(const vector<int>& a, long long target) {
    int l = 0, r = (int)a.size() - 1, found = 0;
    while (l < r) {
        long long s = (long long)a[l] + a[r];  // evaluate the current pair
        if (s == target) {
            found++;                           // record, then move both (skip duplicates if needed)
            l++;
            r--;
        } else if (s < target) {
            l++;                               // a[l] can't reach the target with anyone left
        } else {
            r--;                               // a[r] overshoots with everyone left
        }
    }
    return found;
}
```

## dsa.two-pointers.same-direction-pointers
name: "Same-direction pointers"
importance: must
pattern: true
scope: "remove duplicates, move zeroes, partitioning"

### simple
Same-direction pointers use a fast reader and a slow writer moving the same way through an array. The reader looks at every item, and the writer only moves when there is something worth keeping, like a librarian scanning a shelf and sliding the good books to the front. The kept items end up packed at the start, with no extra array needed.

### interview
- `read` visits every index; `write` marks the next position of the output. Invariant: `a[0..write-1]` is the answer so far.
- **Remove duplicates from a sorted array**: keep `a[read]` when it differs from `a[write - 1]`.
- **Move zeroes**: swap non-zeros to `write` (keeps their order), or copy then fill zeros.
- **Partition by a predicate** (evens first, Lomuto partition): swap matching elements to `write`.
- **O(n)** time, **O(1)** space; stable when copying in order.
- "Allow at most k copies" generalizes the duplicate check to `a[read] != a[write - k]`.

### deep
#### Intuition

Filtering an array into a new array is easy: append what you keep. Doing it in place is the same thing with the output living in the front of the input. The write pointer never passes the read pointer, so you never overwrite something you haven't read yet.

#### Worked example: remove duplicates (sorted)

`1 1 2 3 3 3 4`, `write = 1` (the first element is always kept).

| read | a[read] | a[write − 1] | keep? | array prefix | write |
|---|---|---|---|---|---|
| 1 | 1 | 1 | no | 1 | 1 |
| 2 | 2 | 1 | yes | 1 2 | 2 |
| 3 | 3 | 2 | yes | 1 2 3 | 3 |
| 4 | 3 | 3 | no | 1 2 3 | 3 |
| 5 | 3 | 3 | no | 1 2 3 | 3 |
| 6 | 4 | 3 | yes | 1 2 3 4 | 4 |

Result length 4.

#### Code

```cpp
// Sorted input; keep at most k copies of each value (k = 1 removes duplicates).
int keepAtMostK(vector<int>& a, int k) {
    int write = 0;
    for (int x : a)
        if (write < k || a[write - k] != x) a[write++] = x;
    return write;
}

// Move zeroes to the end, keeping the order of non-zero elements.
void moveZeroes(vector<int>& a) {
    int write = 0;
    for (int read = 0; read < (int)a.size(); read++)
        if (a[read] != 0) swap(a[write++], a[read]);
}
```

```python
def keep_at_most_k(a, k):
    write = 0
    for x in a:
        if write < k or a[write - k] != x:
            a[write] = x
            write += 1
    return write

def move_zeroes(a):
    write = 0
    for read in range(len(a)):
        if a[read] != 0:
            a[write], a[read] = a[read], a[write]
            write += 1
```

Time $O(n)$, space $O(1)$.

#### Why `a[write - k]` works

In sorted input, the kept prefix is sorted too. If `x` equals `a[write - k]`, then the last `k` kept elements are all equal to `x` (they lie between `a[write - k]` and `x`), so adding another would exceed `k` copies.

#### Swap or copy?

- Copying (`a[write++] = a[read]`) is simpler when you don't care what is left after `write`.
- Swapping keeps every element in the array (a permutation), which move-zeroes and partitioning need.
- Swapping with `write == read` is harmless.

#### Edge cases and bugs

- Empty array: return 0 without reading `a[0]`.
- Comparing `a[read]` with `a[read - 1]` instead of the last **kept** element breaks the at-most-k version.
- The approach needs **sorted** input for duplicates; unsorted duplicate removal needs a hash set.

#### Variants

- Lomuto partition in quicksort is this pattern with the predicate `a[read] < pivot`.
- Remove element, squares of sorted array (from the ends instead), string compression (read runs, write counts).
- Backspace string compare: process from the right with a skip counter, or use the write pointer as a stack top.
- Linked lists: the same idea with `prev` and `cur` node pointers.

Connects to: array basics (in-place compaction), Dutch national flag, sliding window, quick sort.

### questions
Q: How do you remove duplicates from a sorted array in place?
A: Keep a write index starting at 1. For each element from index 1 onward, if it differs from a[write − 1], the last kept value, copy it to a[write] and advance. The first write elements are the unique values, in O(n) time and O(1) space.

Q: How do you move all zeroes to the end while keeping the other elements in order?
A: Scan with a read pointer and keep a write pointer at the next slot for a non-zero. When a[read] is non-zero, swap it with a[write] and advance write. Non-zeros keep their relative order and zeros collect at the end.

Q: How do you allow at most two copies of each value in a sorted array?
A: Keep x if fewer than two elements have been written or if a[write − 2] != x. Because the kept prefix is sorted, a[write − 2] == x means the last two kept values are both x.

Q: Why can the write pointer never overwrite unread data?
A: It only advances when the read pointer advances, so write ≤ read at every step. Everything at or after read hasn't been overwritten yet.

### signals
- modify the array in place and return the new length
- remove, filter or compact elements while keeping their order
- move certain values (zeros, a given value) to one end
- sorted input with duplicates to remove or limit
- partition elements by a condition with O(1) extra space

### template
```cpp
// Same-direction pointers: compact the elements to keep into the front of the array.
template <class Keep>
int compact(vector<int>& a, Keep keep) {
    int write = 0;                               // a[0..write-1] is the result so far
    for (int read = 0; read < (int)a.size(); read++) {
        if (keep(a, read, write)) {              // decide using a[read] and the kept prefix
            swap(a[write], a[read]);             // or a[write] = a[read] if the tail doesn't matter
            write++;
        }
    }
    return write;                                // new logical length
}
// Example: remove duplicates in sorted input:
// compact(a, [](auto& v, int r, int w) { return w == 0 || v[w - 1] != v[r]; });
```

## dsa.two-pointers.fast-and-slow-pointers
name: "Fast and slow pointers"
importance: must
pattern: true
scope: "cycle detection, middle element, happy number"

### simple
Fast and slow pointers move through a sequence at different speeds, like two runners on a track where one runs twice as fast. If the track is a loop, the fast runner eventually laps the slow one and they meet. If the track has an end, the fast runner reaches it when the slow runner is exactly halfway.

### interview
- Slow moves 1 step, fast moves 2. If they ever meet, there is a **cycle** (Floyd's tortoise and hare); if fast reaches the end, there isn't.
- **Middle of a list**: when fast reaches the end, slow is at the middle. For even length, the loop condition decides first or second middle.
- **Cycle start**: after they meet, reset one pointer to the head and move both one step at a time; they meet at the cycle's entrance.
- Works on any **function iteration** `x → f(x)`: happy number (sum of squared digits), find the duplicate number (index → value).
- **O(n)** time, **O(1)** space, versus O(n) space for a visited hash set.

### deep
#### Intuition

In a sequence that eventually repeats (a linked list with a cycle, or repeated application of a function), a visited set detects the repeat but costs memory. Two pointers at different speeds detect it with none: once both are inside the cycle, the gap between them shrinks by one each step, so they must meet within one lap.

#### Worked example: happy number

Is 19 happy? The next value is the sum of the squares of the digits.

| step | slow | fast |
|---|---|---|
| 0 | 19 | 19 |
| 1 | 82 | 68 |
| 2 | 68 | 1 |

Fast reaches 1, so 19 is happy. For an unhappy number such as 2, the sequence falls into the cycle `4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4`, and slow and fast meet on a value other than 1.

#### Code

```cpp
int nextValue(int n) {
    int s = 0;
    for (; n > 0; n /= 10) s += (n % 10) * (n % 10);
    return s;
}

bool isHappy(int n) {
    int slow = n, fast = nextValue(n);
    while (fast != 1 && slow != fast) {
        slow = nextValue(slow);
        fast = nextValue(nextValue(fast));
    }
    return fast == 1;
}

// Values in [1, n] in an array of n + 1 elements: find the repeated value without
// modifying the array. Treat i -> a[i] as a linked list; the duplicate is the cycle start.
int findDuplicate(const vector<int>& a) {
    int slow = a[0], fast = a[a[0]];
    while (slow != fast) { slow = a[slow]; fast = a[a[fast]]; }
    slow = 0;
    while (slow != fast) { slow = a[slow]; fast = a[fast]; }
    return slow;
}
```

```python
def is_happy(n):
    def nxt(x):
        return sum(int(d) ** 2 for d in str(x))
    slow, fast = n, nxt(n)
    while fast != 1 and slow != fast:
        slow, fast = nxt(slow), nxt(nxt(fast))
    return fast == 1

def find_duplicate(a):
    slow, fast = a[0], a[a[0]]
    while slow != fast:
        slow, fast = a[slow], a[a[fast]]
    slow = 0
    while slow != fast:
        slow, fast = a[slow], a[fast]
    return slow
```

#### Why the second phase finds the cycle start

Let the distance from the start to the cycle entrance be $\mu$ and the cycle length $\lambda$. When they meet, slow has walked $d$ steps and fast $2d$, and the difference $d$ is a multiple of $\lambda$. Slow is $d - \mu$ steps into the cycle; walking $\mu$ more steps puts it at $d$ steps into the cycle from the entrance, which is back at the entrance because $d$ is a multiple of $\lambda$. A pointer walking $\mu$ steps from the start also arrives at the entrance, so they meet there.

#### Complexity

Slow enters the cycle after $\mu$ steps, and fast catches it within $\lambda$ more steps: $O(\mu + \lambda) = O(n)$ time, $O(1)$ space.

#### Edge cases and bugs

- Check `fast` and `fast->next` for null before advancing two steps on a list.
- Initializing both pointers at the start and testing `slow == fast` before moving ends the loop immediately.
- In find-the-duplicate, index 0 is never a value, which is what makes 0 a safe "head" outside the cycle.

#### Variants

- Middle node, deleting the middle node, palindrome linked list (find middle, reverse second half, compare).
- Circular array loop (the next index is `(i + a[i]) mod n`), with a direction check.
- Brent's algorithm: a faster cycle finder with teleporting pointers.

Connects to: fast and slow pointers on linked lists, cyclic sort, functional graphs.

### questions
Q: How does Floyd's algorithm detect a cycle with O(1) memory?
A: Move one pointer one step at a time and another two steps at a time. Without a cycle, the fast pointer reaches the end. With a cycle, both pointers eventually circle it, and the gap between them shrinks by one per step, so they must meet.

Q: After slow and fast meet, how do you find where the cycle begins?
A: Move one pointer back to the start and advance both one step at a time; they meet at the cycle's entrance. The distance from the start to the entrance equals the distance from the meeting point forward to the entrance, modulo the cycle length.

Q: How do you find the middle of a linked list in one pass?
A: Advance slow by one and fast by two until fast reaches the end. Slow is then at the middle. With while (fast && fast->next), slow ends at the second middle for even lengths; with while (fast->next && fast->next->next), at the first middle.

Q: How does "find the duplicate number" become a cycle problem?
A: With n + 1 values in the range 1 to n, treat each index i as a node pointing to a[i]. Two indices point to the duplicated value, so the path from index 0 runs into a cycle whose entrance is the duplicate, found by Floyd's algorithm without modifying the array.

Q: Why is the happy number problem a cycle detection problem?
A: Repeatedly summing squared digits either reaches 1 or falls into a loop, because the values quickly drop below a few hundred and must repeat. Fast and slow pointers tell the two cases apart without storing seen values.

### signals
- detect a cycle in a linked list or in a sequence produced by repeating a function
- find the middle of a list in one pass
- "happy number" style sequences that either end or repeat
- values in 1 to n that act as next pointers (find the duplicate without modifying the array)
- O(1) extra space where a visited set would be the easy answer

### template
```cpp
// Floyd's cycle detection on any "next" function (list nodes, indices, numbers).
template <class T, class Next>
optional<T> cycleStart(T start, Next next, T end) {
    T slow = start, fast = start;
    while (true) {
        if (fast == end || next(fast) == end) return nullopt;  // reached the end: no cycle
        slow = next(slow);
        fast = next(next(fast));
        if (slow == fast) break;                                // met inside the cycle
    }
    slow = start;                                               // phase 2: find the entrance
    while (slow != fast) { slow = next(slow); fast = next(fast); }
    return slow;
}
```

## dsa.two-pointers.merging-sorted-sequences
name: "Merging sorted sequences"
importance: must
pattern: true
scope: "merge two sorted arrays"

### simple
Merging two sorted lists is like combining two sorted decks of cards face up: you always take the smaller of the two top cards and place it on the output pile. When one deck runs out, you add the rest of the other deck. Every card is looked at once, so it is fast.

### interview
- One pointer per sequence; repeatedly take the smaller head (use `<=` to keep it **stable**), then append the leftovers.
- **O(n + m)** time; O(n + m) for the output (O(1) extra when merging in place from the back).
- **Merge into the first array with spare room at its end**: fill from the back with pointers at the ends of both arrays, so nothing unread is overwritten.
- Same loop answers intersection and union of sorted lists, and "merge" in merge sort.
- K sorted sequences: use a min-heap (O(N log k)) or merge in pairs.

### deep
#### Intuition

The smallest remaining element overall is always one of the two heads, because each sequence is sorted. So repeatedly taking the smaller head produces the merged order. Each comparison outputs one element, so there are at most $n + m - 1$ comparisons.

#### Worked example: merge in place from the back

`a = 1 3 5 _ _ _` (3 values, room for 3 more), `b = 2 4 6`.

| i (a) | j (b) | write | compare | a after |
|---|---|---|---|---|
| 2 (5) | 2 (6) | 5 | 6 > 5: take 6 | 1 3 5 _ _ 6 |
| 2 (5) | 1 (4) | 4 | 5 > 4: take 5 | 1 3 5 _ 5 6 |
| 1 (3) | 1 (4) | 3 | 4 > 3: take 4 | 1 3 5 4 5 6 |
| 1 (3) | 0 (2) | 2 | 3 > 2: take 3 | 1 3 3 4 5 6 |
| 0 (1) | 0 (2) | 1 | 2 > 1: take 2 | 1 2 3 4 5 6 |
| 0 (1) | -1 | | b is empty: done | 1 2 3 4 5 6 |

When `b` runs out first, the rest of `a` is already in place.

#### Code

```cpp
vector<int> mergeSorted(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size())
        out.push_back(a[i] <= b[j] ? a[i++] : b[j++]);  // <= keeps the merge stable
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}

// a has m values followed by n free slots; b has n values.
void mergeIntoFirst(vector<int>& a, int m, const vector<int>& b, int n) {
    int i = m - 1, j = n - 1, write = m + n - 1;
    while (j >= 0) {                                    // once b is empty, a is in place
        if (i >= 0 && a[i] > b[j]) a[write--] = a[i--];
        else a[write--] = b[j--];
    }
}
```

```python
def merge_sorted(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out

def intersect_sorted(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            out.append(a[i])
            i, j = i + 1, j + 1
        elif a[i] < b[j]:
            i += 1
        else:
            j += 1
    return out
```

Time $O(n + m)$. The in-place version uses $O(1)$ extra space.

#### Edge cases and bugs

- Filling from the front when merging in place overwrites unread values of `a`.
- Forgetting the leftover loop drops the tail of one sequence.
- Using `<` instead of `<=` makes the merge unstable (equal keys from `b` go first), which matters for merge sort and for sorting records.
- Empty inputs: the loops handle them with no special case.

#### Variants

- Merge two sorted linked lists (a dummy head avoids special cases).
- Merge k sorted lists with a min-heap.
- Intersection, union, difference of sorted arrays: same loop, different emit rule.
- Median of two sorted arrays: a merge gives O(n + m); the partition binary search gives O(log(min(n, m))).
- Squares of a sorted array: merge the negative part (reversed) with the positive part.

Connects to: merge sort, merging linked lists, k-way merge, median of two sorted arrays.

### questions
Q: How do you merge two sorted arrays into the first one, which has room at its end?
A: Use three pointers from the back: the last real value of each array and the last slot. Write the larger of the two values into the slot and move that pointer. Filling from the back never overwrites unread data, and once the second array is used up, the rest of the first is already in place.

Q: Why use <= rather than < when merging?
A: With <=, equal elements from the first sequence are taken before those from the second, which keeps their original relative order. That stability is what makes merge sort stable.

Q: What is the time complexity of merging two sorted sequences, and why?
A: O(n + m). Every step outputs exactly one element, and each element is compared at most once before it is output.

Q: How do you find the intersection of two sorted arrays without extra space?
A: Walk both with two pointers. If the values are equal, record it and advance both; otherwise advance the pointer at the smaller value. That is O(n + m) time and O(1) extra space.

### signals
- two (or more) sorted arrays or lists to combine
- "merge", "union" or "intersection" of sorted sequences
- merging into an array that has free space at its end
- the combine step of a divide-and-conquer sort

### template
```cpp
// Merge two sorted ranges; change the emit rule for union, intersection or difference.
vector<int> mergeTwo(const vector<int>& a, const vector<int>& b) {
    vector<int> out;
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) out.push_back(a[i++]);   // take the smaller head (stable)
        else out.push_back(b[j++]);
    }
    out.insert(out.end(), a.begin() + i, a.end()); // leftovers are already sorted
    out.insert(out.end(), b.begin() + j, b.end());
    return out;
}
```

## dsa.two-pointers.ksum
name: "kSum"
importance: must
pattern: true
prereqs: [dsa.two-pointers.opposite-ends-pointers]
scope: "3Sum and 4Sum with sorting and deduplication"

### simple
kSum finds groups of k numbers that add up to a target. You sort the numbers, fix the first one or two, and then find the last two with a pointer at each end, like choosing a pair of items within a budget after picking the first items. Skipping equal numbers at each step keeps you from listing the same group twice.

### interview
- **3Sum**: sort, fix `i`, run opposite-ends two pointers on `i + 1..n - 1` for `-a[i]`. **O(n²)** time, O(1) extra besides the output (and the sort).
- **4Sum**: two nested fixed indices plus two pointers: **O(n³)**. General kSum: recursion down to 2Sum, **O(n^(k−1))**.
- **Deduplication**: skip `a[i] == a[i - 1]` for fixed indices; after finding a match, move both pointers past equal values.
- Pruning: stop when `a[i] > 0` (3Sum to zero), or when the smallest possible sum exceeds the target.
- Use 64-bit sums in 4Sum (values up to 10⁹ overflow 32-bit).
- 3Sum closest: same loop, track the sum with the smallest `|sum - target|`.

### deep
#### Intuition

A brute force over triples is $O(n^3)$. Sorting costs only $O(n \log n)$ and turns the inner search into the linear two-pointer scan: fix the first element, and find pairs in the rest that sum to `target - a[i]`. Sorting also puts equal values next to each other, which makes skipping duplicates a simple comparison with the neighbor.

#### Worked example: 3Sum to zero

Sorted: `-4 -1 -1 0 1 2`

| i (a[i]) | need | l, r scan | triples found |
|---|---|---|---|
| 0 (-4) | 4 | -1+2=1, -1+2=1, 0+2=2, 1+2=3: all too small | none |
| 1 (-1) | 1 | -1+2=1 ✓ → skip; then 0+1=1 ✓ | [-1,-1,2], [-1,0,1] |
| 2 (-1) | | same value as a[1]: skip | |
| 3 (0) | 0 | 1+2=3 too big | none |

Result: `[-1, -1, 2]` and `[-1, 0, 1]`.

#### Code

```cpp
vector<vector<int>> threeSum(vector<int> a) {
    sort(a.begin(), a.end());
    vector<vector<int>> out;
    int n = a.size();
    for (int i = 0; i < n - 2; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;       // same first value: same triples
        if (a[i] > 0) break;                           // three positives can't sum to 0
        int l = i + 1, r = n - 1;
        while (l < r) {
            int s = a[i] + a[l] + a[r];
            if (s < 0) l++;
            else if (s > 0) r--;
            else {
                out.push_back({a[i], a[l], a[r]});
                while (l < r && a[l] == a[l + 1]) l++; // skip equal second values
                while (l < r && a[r] == a[r - 1]) r--; // skip equal third values
                l++;
                r--;
            }
        }
    }
    return out;
}
```

```python
def k_sum(a, target, k):
    """All unique k-tuples (as lists) from a with the given sum; a must be sorted."""
    def two_sum(start, t):
        out, l, r = [], start, len(a) - 1
        while l < r:
            s = a[l] + a[r]
            if s < t or (l > start and a[l] == a[l - 1]):
                l += 1
            elif s > t or (r < len(a) - 1 and a[r] == a[r + 1]):
                r -= 1
            else:
                out.append([a[l], a[r]])
                l, r = l + 1, r - 1
        return out

    def solve(start, t, k):
        if k == 2:
            return two_sum(start, t)
        out = []
        for i in range(start, len(a) - k + 1):
            if i > start and a[i] == a[i - 1]:
                continue
            for rest in solve(i + 1, t - a[i], k - 1):
                out.append([a[i]] + rest)
        return out

    return solve(0, target, k)

# four_sums = k_sum(sorted(nums), target, 4)
```

#### Complexity

Sorting is $O(n \log n)$. For 3Sum, $n$ fixed values times an $O(n)$ scan gives $O(n^2)$. Each extra level adds a factor of $n$: kSum is $O(n^{k-1})$. Extra space is $O(\log n)$ to $O(n)$ for sorting plus the output (and $O(k)$ recursion).

#### Edge cases and bugs

- Deduplicating the fixed index with `a[i] == a[i + 1]` instead of `a[i - 1]` skips valid triples like `[-1, -1, 2]`.
- Forgetting to move both pointers after a match loops forever.
- Integer overflow in 4Sum with values near $10^9$.
- The early `break` on `a[i] > 0` is only valid for target 0; for a general target, prune with `a[i] * k > target` style bounds carefully (negative values make it tricky).

#### Variants

- 3Sum closest, 3Sum smaller (count with `r - l` like pair counting).
- 4Sum II with four separate arrays: hash map of pair sums, $O(n^2)$.
- Valid triangle number: sort, fix the largest side, count pairs with `a[l] + a[r] > a[k]`.

Connects to: opposite-ends pointers, complement lookup, sorting.

### questions
Q: How do you solve 3Sum in O(n²)?
A: Sort the array. For each index i, find pairs in the part after i that sum to −a[i] using two pointers from both ends. Each i costs O(n), so the total is O(n²) after the O(n log n) sort.

Q: How do you avoid duplicate triples in 3Sum?
A: Skip a fixed index whose value equals the previous one, because it would generate the same triples. After recording a match, move the left pointer past equal values and the right pointer past equal values before continuing.

Q: What is the time complexity of general kSum with this approach?
A: O(n^(k−1)): each fixed element adds a loop of O(n), and the innermost 2Sum is a linear two-pointer scan. So 3Sum is O(n²) and 4Sum is O(n³).

Q: Why is sorting acceptable even though the problem doesn't ask for sorted output?
A: The answer is a set of value triples, not positions, so reordering the input loses nothing. Sorting is cheaper than the O(n²) search and enables both the two-pointer scan and simple duplicate skipping.

Q: How would you find the 3Sum closest to a target?
A: Use the same sorted two-pointer loop. At each step compare |sum − target| with the best so far, then move l if the sum is below the target and r if it's above. Return immediately on an exact match.

### signals
- find all unique triples or quadruples with a given sum
- "no duplicate combinations" in the output of a sum search
- the sum of three values closest to a target
- counting triangles or triples satisfying an inequality after sorting

### template
```cpp
// 3Sum skeleton: sort, fix one element, two pointers for the rest, skip duplicates.
vector<vector<int>> threeSumTarget(vector<int> a, long long target) {
    sort(a.begin(), a.end());
    vector<vector<int>> res;
    int n = a.size();
    for (int i = 0; i + 2 < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;          // dedupe the fixed element
        int l = i + 1, r = n - 1;
        while (l < r) {
            long long s = (long long)a[i] + a[l] + a[r];
            if (s < target) l++;
            else if (s > target) r--;
            else {
                res.push_back({a[i], a[l], a[r]});
                while (l < r && a[l] == a[l + 1]) l++;    // dedupe the pair
                while (l < r && a[r] == a[r - 1]) r--;
                l++, r--;
            }
        }
    }
    return res;
}
```

## dsa.two-pointers.trapping-rain-water
name: "Trapping rain water"
importance: important
prereqs: [dsa.two-pointers.opposite-ends-pointers]
scope: "two pointers with running maximums"

### simple
Rain water trapped above a bar is limited by the tallest wall on its left and the tallest wall on its right, whichever is shorter. It is like a bathtub whose water level is set by its lower rim. Two pointers can find that level for every bar in one pass by always working on the side with the lower wall.

### interview
- Water at `i` = `min(maxLeft[i], maxRight[i]) - h[i]`.
- **Prefix and suffix maximum arrays**: O(n) time, O(n) space.
- **Two pointers**: keep `leftMax` and `rightMax`; if `h[l] < h[r]`, the left side is bounded by `leftMax` (the right has something at least as tall), so add `leftMax - h[l]` and move `l`; otherwise handle the right. **O(n)** time, **O(1)** space.
- **Monotonic stack** alternative: pop a bar when a taller bar arrives and add the water in the layer between them (computes water by horizontal layers).
- 2D version (trapping rain water II): min-heap over the boundary, BFS inward, O(RC log(RC)).

### deep
#### Intuition

For each bar, water rises until it would spill over the lower of the two highest walls around it. Storing both maxima for every bar takes two extra arrays. The two-pointer trick needs neither: whichever side currently has the lower bar is a side whose water level is already known, so process that bar and move inward.

#### Worked example

Heights `0 1 0 2 1 0 1 3 2 1 2 1`

| index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| h | 0 | 1 | 0 | 2 | 1 | 0 | 1 | 3 | 2 | 1 | 2 | 1 |
| maxLeft | 0 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 3 |
| maxRight | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 1 |
| water | 0 | 0 | 1 | 0 | 1 | 2 | 1 | 0 | 0 | 1 | 0 | 0 |

Total: 6.

#### Code

```cpp
long long trap(const vector<int>& h) {
    int l = 0, r = (int)h.size() - 1;
    long long leftMax = 0, rightMax = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) {                    // left side is the limiting side
            leftMax = max<long long>(leftMax, h[l]);
            water += leftMax - h[l];
            l++;
        } else {                              // right side is the limiting side
            rightMax = max<long long>(rightMax, h[r]);
            water += rightMax - h[r];
            r--;
        }
    }
    return water;
}
```

```python
def trap(h):
    l, r = 0, len(h) - 1
    left_max = right_max = water = 0
    while l < r:
        if h[l] < h[r]:
            left_max = max(left_max, h[l])
            water += left_max - h[l]
            l += 1
        else:
            right_max = max(right_max, h[r])
            water += right_max - h[r]
            r -= 1
    return water
```

Time $O(n)$, space $O(1)$.

#### Why the two-pointer version is correct

Suppose `h[l] < h[r]`. Every bar the left pointer has already passed was lower than the right pointer's bar at that moment, and that bar sits at or to the right of the current `r` (the right pointer only moves left). Together with `h[l] < h[r]`, this means some bar at or right of `r` is at least as tall as `leftMax`. So the tallest wall on the right of `l` is at least `leftMax`, which makes `leftMax` the lower wall, and the water above `l` is exactly `leftMax - h[l]`. The right side is symmetric.

#### Edge cases

- Fewer than 3 bars trap nothing; the loop handles it.
- Plateaus and equal heights: the `else` branch handles `h[l] == h[r]`.
- Large inputs: total water can exceed 32 bits.

Connects to: opposite-ends pointers, prefix maximums, monotonic stack, heaps (2D version).

### questions
Q: How much water sits above bar i?
A: min(highest bar to its left, highest bar to its right) − h[i], counting bar i itself in both maxima so the value is never negative. The lower of the two walls sets the water level.

Q: How does the two-pointer solution avoid storing prefix and suffix maxima?
A: It always processes the side whose current bar is lower. When h[l] < h[r], the right side is guaranteed to have a wall at least as high as leftMax needs, so the water at l depends only on leftMax. The symmetric argument handles the right side.

Q: What are the three standard approaches and their costs?
A: Prefix and suffix maximum arrays (O(n) time, O(n) space), two pointers (O(n) time, O(1) space), and a monotonic decreasing stack that fills water layer by layer (O(n) time, O(n) space).

Q: How does the 2D version differ?
A: Water can escape in four directions, so the limiting wall is the lowest point on the boundary around a region. Put all border cells in a min-heap, repeatedly pop the lowest, and push its unvisited neighbors with height max(neighbor, current level), adding the difference as water. That is O(RC log(RC)).
