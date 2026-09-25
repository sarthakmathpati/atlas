---
topic: dsa.heaps
name: "Heaps and priority queues"
subject: dsa
order: 16
prereqs: [dsa.arrays]
---

## dsa.heaps.binary-heap
name: "Binary heap"
importance: must
scope: "array representation, push and pop in O(log n), heapify in O(n)"

### simple
A binary heap is a tree that always keeps the smallest (or largest) item at the top, where you can grab it instantly. It is like a hospital waiting room where the most urgent patient is always seen next, no matter when they arrived. Adding or removing a patient only reshuffles a few people along one path, so it stays fast.

### interview
- A **complete binary tree** stored in an array: children of `i` at `2i + 1` and `2i + 2`, parent at `(i - 1) / 2`.
- **Heap property**: every parent ≤ its children (min-heap) or ≥ (max-heap). The root is the min (or max).
- **Push**: append, then **sift up** (swap with the parent while smaller): O(log n). **Pop**: move the last element to the root, **sift down** (swap with the smaller child): O(log n). **Top**: O(1).
- **Heapify** an array in **O(n)** by sifting down from the last parent to the root.
- Not sorted and no fast search: finding an arbitrary element is O(n).
- Library: `std::priority_queue` (a max-heap by default; `priority_queue<int, vector<int>, greater<int>>` for a min-heap), or `make_heap`, `push_heap` and `pop_heap` on a vector.

### deep
#### Intuition

A heap is a compromise between an unsorted array (fast insert, slow minimum) and a sorted array (fast minimum, slow insert). It keeps just enough order, each parent beating its children, to find the minimum at the root while inserts and removals only repair one root-to-leaf path of length $\log n$.

#### Worked example: push 1 into a min-heap

Array `[2, 4, 3, 7, 9, 5]` (root 2). Push 1:

| step | array | action |
|---|---|---|
| append | 2 4 3 7 9 5 1 | 1 at index 6, parent index 2 (value 3) |
| sift up | 2 4 1 7 9 5 3 | 1 < 3: swap; now at index 2, parent index 0 (value 2) |
| sift up | 1 4 2 7 9 5 3 | 1 < 2: swap; at the root, stop |

Pop the minimum: move the last element (3) to the root and sift down: `[3, 4, 2, 7, 9, 5]` → the smaller child is 2 → swap → `[2, 4, 3, 7, 9, 5]`.

#### Code

```cpp
class MinHeap {
    vector<int> a;
    void siftUp(int i) {
        while (i > 0 && a[(i - 1) / 2] > a[i]) {
            swap(a[i], a[(i - 1) / 2]);
            i = (i - 1) / 2;
        }
    }
    void siftDown(int i) {
        int n = a.size();
        while (true) {
            int smallest = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && a[l] < a[smallest]) smallest = l;
            if (r < n && a[r] < a[smallest]) smallest = r;
            if (smallest == i) return;
            swap(a[i], a[smallest]);
            i = smallest;
        }
    }
public:
    MinHeap() = default;
    explicit MinHeap(vector<int> v) : a(std::move(v)) {        // heapify in O(n)
        for (int i = (int)a.size() / 2 - 1; i >= 0; i--) siftDown(i);
    }
    void push(int x) { a.push_back(x); siftUp(a.size() - 1); }
    int top() const { return a[0]; }
    void pop() { a[0] = a.back(); a.pop_back(); if (!a.empty()) siftDown(0); }
    bool empty() const { return a.empty(); }
};
```

#### Why heapify is O(n)

Sift-down costs the height of the node. In a heap of $n$ nodes, about $n/2$ are leaves (height 0), $n/4$ have height 1, $n/8$ height 2, and so on:

$$\sum_{h \ge 0} \frac{n}{2^{h+1}} \cdot h = n \sum_{h \ge 0} \frac{h}{2^{h+1}} = n$$

so building a heap by sifting down is linear, while inserting items one at a time is $O(n \log n)$.

#### Complexity

| Operation | Cost |
|---|---|
| top | $O(1)$ |
| push, pop | $O(\log n)$ |
| heapify | $O(n)$ |
| search or delete arbitrary | $O(n)$ (O(log n) with an index map) |

#### Edge cases and bugs

- `std::priority_queue` is a **max-heap** by default; forgetting `greater<>` for a min-heap is a classic bug.
- Custom comparators in C++ are reversed: `priority_queue<int, vector<int>, greater<int>>` is a min-heap.
- `pair` and `tuple` compare element by element, so `{priority, id}` breaks ties by id; a struct needs its own comparator.
- Mutating an element's priority inside the heap breaks the heap property; push a new entry instead (lazy deletion).

#### Variants

D-ary heaps (faster decrease-key for Dijkstra on dense graphs), indexed heaps (decrease-key in $O(\log n)$), Fibonacci and pairing heaps (better amortized bounds), and treaps (heap plus BST).

Connects to: heap sort, top K elements, k-way merge, two heaps, Dijkstra's algorithm.

### questions
Q: How is a binary heap stored in an array?
A: It is a complete binary tree laid out level by level. For the node at index i, the children are at 2i + 1 and 2i + 2 and the parent is at (i − 1) / 2, so no pointers are needed.

Q: How do push and pop work, and what do they cost?
A: Push appends the element and sifts it up, swapping with its parent while it is smaller. Pop moves the last element to the root and sifts it down, swapping with its smaller child. Both walk one root-to-leaf path, so they cost O(log n).

Q: Why is building a heap from an array O(n) rather than O(n log n)?
A: Sifting down from the last parent to the root costs each node its height, and most nodes are near the bottom: half are leaves, a quarter have height 1, and so on. The total, n · Σ h/2^(h+1), is at most n.

Q: What can't a heap do efficiently?
A: Search for an arbitrary value or delete an arbitrary element, which take O(n) without an extra index map. It also doesn't give sorted order; iterating over its array is not sorted.

Q: How do you make std::priority_queue a min-heap, and why does the comparator look reversed?
A: Declare priority_queue<T, vector<T>, greater<T>>. The comparator answers whether a has lower priority than b, and the top is the element nothing outranks, so less<T> gives a max-heap and greater<T> a min-heap.

## dsa.heaps.top-k-elements
name: "Top K elements"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "min-heap of size K, quickselect alternative"

### simple
To keep the K largest items from a long stream, you only need a small "leaderboard" of K spots. A new item gets on the leaderboard only if it beats the weakest current member, who then drops off. Keeping the weakest member at the top of a min-heap makes that check instant.

### interview
- **K largest**: min-heap of size k; push each item, pop when the size exceeds k. The heap holds the k largest; its top is the kth largest. **O(n log k)** time, **O(k)** space.
- **K smallest**: max-heap of size k (the mirror image).
- Works on **streams** and doesn't modify the input.
- Alternatives: sort, O(n log n); **quickselect**, O(n) average, modifies the input; bucket sort by frequency for top k frequent, O(n).
- Custom keys: distance to origin (k closest points), frequency (top k frequent words, with ties broken alphabetically).
- Choosing between heaps and quickselect: heap for streams or small k; quickselect for one-off large inputs.

### deep
#### Intuition

To know the k largest, you don't need to order everything, just to know the weakest of your current k candidates, so you can reject newcomers who are worse. A min-heap of size k keeps exactly that weakest candidate on top. Each newcomer costs $O(\log k)$ at most.

#### Worked example: 2 largest of `3 1 5 12 2 11`

| item | heap after push | size > 2? pop min | heap |
|---|---|---|---|
| 3 | {3} | | {3} |
| 1 | {1, 3} | | {1, 3} |
| 5 | {1, 3, 5} | pop 1 | {3, 5} |
| 12 | {3, 5, 12} | pop 3 | {5, 12} |
| 2 | {2, 5, 12} | pop 2 | {5, 12} |
| 11 | {5, 11, 12} | pop 5 | {11, 12} |

Answer: 11 and 12; the kth largest (k = 2) is the top, 11.

#### Code

```cpp
int kthLargest(const vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;   // min-heap
    for (int x : nums) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();               // drop the weakest
    }
    return heap.top();
}

vector<vector<int>> kClosest(const vector<vector<int>>& pts, int k) {
    // Max-heap by distance: the farthest of the current k is on top.
    priority_queue<pair<long long, int>> heap;
    for (int i = 0; i < (int)pts.size(); i++) {
        long long d = 1LL * pts[i][0] * pts[i][0] + 1LL * pts[i][1] * pts[i][1];
        heap.push({d, i});
        if ((int)heap.size() > k) heap.pop();
    }
    vector<vector<int>> out;
    while (!heap.empty()) { out.push_back(pts[heap.top().second]); heap.pop(); }
    return out;
}
```

#### Complexity

- Heap: $O(n \log k)$ time, $O(k)$ space.
- Heapify everything then pop k times: $O(n + k \log n)$.
- Quickselect: $O(n)$ average, $O(n^2)$ worst, in place.
- Sorting: $O(n \log n)$.

#### Edge cases and bugs

- Using a max-heap for "k largest" and popping from it keeps the smallest items instead.
- `k > n`: return everything.
- Distances: compare squared distances to avoid floating point; use 64-bit for squares.
- Ties in top k frequent words need a tiebreaker in the key, and in a min-heap of size k the tie order is reversed; `nsmallest` with a composite key avoids confusion.

#### Variants

- Kth largest element in a stream (keep the heap between queries).
- Top k frequent elements, sort characters by frequency.
- K pairs with the smallest sums (heap of candidate pairs, expanded lazily).
- Kth smallest in a sorted matrix (heap of row heads or binary search by counting).

Connects to: binary heap, quickselect, frequency counting, k-way merge.

### questions
Q: How do you find the k largest elements of a large array or stream?
A: Keep a min-heap of at most k elements. Push each element, and if the heap grows beyond k, pop its minimum. The heap then holds the k largest seen so far, with the kth largest on top. It is O(n log k) time and O(k) space.

Q: Why use a min-heap, not a max-heap, for the k largest?
A: The decision for each new element is whether it beats the weakest of the current top k, so the weakest must be instantly accessible and removable. That is the minimum, which a min-heap keeps on top.

Q: When is quickselect better than a heap for top k?
A: When the whole array is available, modifying it is allowed and you want O(n) average time, especially when k is large. A heap is better for streams, for small k, or when the input must stay unchanged.

Q: How do you find the k closest points to the origin?
A: Keep a max-heap of size k keyed by squared distance; push each point and pop the farthest when the size exceeds k. Alternatively quickselect on squared distances in O(n) average.

Q: What is the complexity of heapifying all n elements and popping k times?
A: O(n + k log n): heapify is linear and each pop is logarithmic. It is a good choice when k is small relative to n and all data is available at once.

### signals
- the k largest, k smallest, k most frequent or k closest items
- the kth largest element, especially in a stream
- "top k" leaderboards that update as data arrives
- k much smaller than n, where sorting everything is wasteful

### template
```cpp
// Keep the k "best" items: a heap whose top is the worst of the kept ones.
template <class T, class Worse>   // Worse(a, b): true if a should be dropped before b
vector<T> keepTopK(const vector<T>& items, int k, Worse worse) {
    auto cmp = [&](const T& a, const T& b) { return worse(b, a); };  // top = worst kept
    priority_queue<T, vector<T>, decltype(cmp)> heap(cmp);
    for (const T& x : items) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();   // evict the worst
    }
    vector<T> out;
    while (!heap.empty()) { out.push_back(heap.top()); heap.pop(); }
    return out;                                 // worst first
}
// k largest ints: keepTopK(v, k, [](int a, int b) { return a < b; })
```

## dsa.heaps.k-way-merge
name: "K-way merge"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "merge k sorted lists, smallest range covering k lists"

### simple
K-way merge combines several sorted lists into one sorted list. Imagine k checkout lines sorted by ticket number, and you always call the lowest ticket among the people at the front of each line. A min-heap holding just those front people tells you instantly who is next.

### interview
- Min-heap of `(value, list id, index)` holding the current head of each list. Pop the smallest, output it, push the next element from the same list.
- **O(N log k)** for N total elements, **O(k)** heap space.
- **Smallest range covering k lists**: heap of heads plus the current **maximum** among them; the range is [heap min, max]; advance the list that owns the minimum; stop when a list is exhausted.
- **Kth smallest in a sorted matrix** or among k sorted lists: pop k times.
- **K pairs with smallest sums**: treat row i as the sorted list `a[i] + b[0], a[i] + b[1], …`.
- Alternative for full merges: pairwise divide and conquer, also O(N log k).

### deep
#### Intuition

Each list is sorted, so the next element of the merged output must be one of the k current heads. Comparing k heads directly costs $O(k)$ per output element; a min-heap over the heads costs $O(\log k)$. Only the list that just gave up its head needs a new entry.

#### Worked example: smallest range covering three lists

Lists: `A = 4 10 15 24`, `B = 0 9 12 20`, `C = 5 18 22 30`.

| heap (min …) | max | range | advance |
|---|---|---|---|
| 0(B) 4(A) 5(C) | 5 | [0, 5] | B → 9 |
| 4(A) 5(C) 9(B) | 9 | [4, 9] | A → 10 |
| 5(C) 9(B) 10(A) | 10 | [5, 10] | C → 18 |
| 9(B) 10(A) 18(C) | 18 | [9, 18] | B → 12 |
| 10(A) 12(B) 18(C) | 18 | [10, 18] | A → 15 |
| 12(B) 15(A) 18(C) | 18 | [12, 18] | B → 20 |
| 15(A) 18(C) 20(B) | 20 | [15, 20] | A → 24 |
| 18(C) 20(B) 24(A) | 24 | [18, 24] | C → 22 |
| 20(B) 22(C) 24(A) | 24 | [20, 24] | B is exhausted: stop |

The narrowest range has width 4: **[20, 24]**. On a tie in width, the code keeps the range found first, which has the smaller start because the popped minimums never decrease.

#### Code

```cpp
vector<int> smallestRange(const vector<vector<int>>& lists) {
    using T = tuple<int, int, int>;                        // value, list, index
    priority_queue<T, vector<T>, greater<T>> heap;
    int curMax = INT_MIN;
    for (int i = 0; i < (int)lists.size(); i++) {
        heap.push({lists[i][0], i, 0});
        curMax = max(curMax, lists[i][0]);
    }
    vector<int> best = {get<0>(heap.top()), curMax};
    while (true) {
        auto [v, li, idx] = heap.top();
        heap.pop();
        if ((long long)curMax - v < (long long)best[1] - best[0]) best = {v, curMax};
        if (idx + 1 == (int)lists[li].size()) break;       // this list can't advance
        int next = lists[li][idx + 1];
        heap.push({next, li, idx + 1});
        curMax = max(curMax, next);
    }
    return best;
}
```

#### Complexity

$O(N \log k)$ time for a full merge (each element pushed and popped once), $O(k)$ extra space besides the output. Smallest range: $O(N \log k)$. K smallest pairs: $O(k \log k)$.

#### Edge cases and bugs

- Empty lists: skip them when seeding the heap (and in smallest range, the problem usually guarantees non-empty lists).
- Stop the smallest-range loop as soon as the popped list is exhausted: without an element from that list, no further range covers all lists.
- Keep the list index in each heap entry, `{value, list, position}`, so you know where to take the next element from.

#### Variants

- External sorting (merge sorted runs from disk).
- Merge k sorted linked lists (store node pointers).
- Find the median of k sorted arrays, kth smallest prime fraction, ugly numbers (a heap of generated candidates).

Connects to: merging sorted sequences, merging lists, top K elements, binary heap.

### questions
Q: How do you merge k sorted lists efficiently?
A: Put the first element of each list into a min-heap along with its list and index. Repeatedly pop the smallest, append it to the output, and push the next element from the same list. Each of the N elements is pushed and popped once: O(N log k).

Q: How do you find the smallest range that includes at least one number from each of k sorted lists?
A: Keep a heap of the current element from each list and track the maximum among them. The range [heap minimum, maximum] covers all lists; record it if it's the narrowest so far, then advance the list that holds the minimum. Stop when that list runs out.

Q: Why can the smallest range search stop when one list is exhausted?
A: Advancing is only ever done on the list holding the minimum. If that list has no next element, any further range would have to exclude it, so no later range can cover all k lists.

Q: How do you find the k pairs with the smallest sums from two sorted arrays?
A: Treat each a[i] as the head of a sorted list a[i] + b[0], a[i] + b[1], and so on. Seed a heap with (a[i] + b[0]) for the first k values of i, then pop k times, pushing the next pair from the same row each time. That is O(k log k).

### signals
- merge several sorted lists, arrays or streams into one
- the kth smallest element across k sorted lists or a sorted matrix
- a range or window that must include an element from every list
- pairs from sorted arrays with the smallest sums

### template
```cpp
// K-way merge: heap of (value, list, position); pop the smallest, push its successor.
vector<int> mergeKSorted(const vector<vector<int>>& lists) {
    using T = tuple<int, int, int>;
    priority_queue<T, vector<T>, greater<T>> heap;
    for (int i = 0; i < (int)lists.size(); i++)
        if (!lists[i].empty()) heap.push({lists[i][0], i, 0});
    vector<int> out;
    while (!heap.empty()) {
        auto [v, li, j] = heap.top();
        heap.pop();
        out.push_back(v);                                         // process the smallest head
        if (j + 1 < (int)lists[li].size()) heap.push({lists[li][j + 1], li, j + 1});
    }
    return out;
}
```

## dsa.heaps.two-heaps
name: "Two heaps"
importance: must
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "running median"

### simple
Two heaps split numbers into a lower half and an upper half, so the middle is always at their tops. Picture a line of people sorted by height, split into a short group and a tall group: you only need the tallest of the short group and the shortest of the tall group to know the median. A max-heap and a min-heap give you exactly those two people instantly.

### interview
- **Max-heap `low`** holds the smaller half; **min-heap `high`** holds the larger half. Invariants: every value in `low` ≤ every value in `high`, and sizes differ by at most 1 (say `low` may have one extra).
- **Add**: push to `low`, move `low`'s top to `high`, and if `high` is bigger, move its top back. O(log n).
- **Median**: `low.top()` if sizes differ, else the average of both tops. O(1).
- **Sliding window median**: also remove elements leaving the window: lazy deletion (a hash map of pending removals, pruned at the tops) or ordered multisets: O(n log k).
- Also: IPO / maximize capital (a min-heap of locked projects by cost, a max-heap of affordable projects by profit).

### deep
#### Intuition

The median only depends on the middle one or two values. Keeping everything sorted costs $O(n)$ per insert (array) or needs a balanced tree. Two heaps keep only what matters accessible: the largest of the lower half and the smallest of the upper half. Rebalancing after each insert moves at most one element between the heaps.

#### Worked example: stream `5 15 1 3`

| add | low (max-heap) | high (min-heap) | median |
|---|---|---|---|
| 5 | 5 | | 5 |
| 15 | 5 | 15 | (5 + 15) / 2 = 10 |
| 1 | 5 1 | 15 | 5 |
| 3 | 3 1 | 5 15 | (3 + 5) / 2 = 4 |

Adding 3: push to `low` (5, 3, 1), move its top 5 to `high` (5, 15); now `high` has 2 and `low` 2: balanced.

#### Code

```cpp
class MedianFinder {
    priority_queue<int> low;                                   // max-heap: smaller half
    priority_queue<int, vector<int>, greater<int>> high;       // min-heap: larger half
public:
    void add(int x) {
        low.push(x);
        high.push(low.top());                                  // largest of low goes up
        low.pop();
        if (high.size() > low.size()) {                        // keep low >= high in size
            low.push(high.top());
            high.pop();
        }
    }
    double median() const {
        if (low.size() > high.size()) return low.top();
        return (low.top() + (double)high.top()) / 2.0;
    }
};
```

#### Why pushing through `low` first works

Pushing into `low` and immediately moving `low`'s maximum to `high` guarantees the ordering invariant (everything in `low` ≤ everything in `high`) without comparing against the tops by hand. The final size check restores the size invariant. Each add does at most three heap operations: $O(\log n)$.

#### Complexity

Add: $O(\log n)$. Median: $O(1)$. Space $O(n)$. Sliding window median with lazy deletion: $O(n \log n)$ in the worst case (stale entries can pile up), $O(n \log k)$ with ordered multisets.

#### Edge cases and bugs

- Integer overflow when averaging two large ints: average in floating point or `a + (b - a) / 2`.
- Median of an empty structure: define the behavior.
- Mixing up the two heaps' orders: `low` is a max-heap (the default `priority_queue`), `high` a min-heap (`greater<>`).

#### Variants

- Sliding window median (removals).
- Find the median of a data stream where most numbers are in a small range: counting array plus the heaps for outliers.
- Minimize total cost of moving to the median (the median minimizes the sum of absolute deviations).

Connects to: binary heap, custom comparators and lazy deletion, scheduling with heaps.

### questions
Q: How do two heaps give the running median?
A: A max-heap holds the smaller half and a min-heap the larger half, with every element of the first at most every element of the second and sizes within one. The median is the max-heap's top when sizes differ, or the average of both tops when they are equal.

Q: How do you insert a number while keeping both invariants?
A: Push it into the max-heap, then move the max-heap's top into the min-heap, which keeps the ordering correct. If the min-heap is now larger, move its top back. Each insert is O(log n).

Q: What are the costs of add and median in this design?
A: add is O(log n) because of a constant number of heap pushes and pops, and median is O(1) because it only reads the tops. Space is O(n).

Q: How do you support a sliding window median, where old elements leave?
A: Heaps can't delete arbitrary elements quickly, so mark departing elements in a hash map of pending deletions and discard them when they reach a heap's top, adjusting the size counts. Alternatively use two ordered multisets, which support erase in O(log k).

### signals
- the median of a stream of numbers as they arrive
- balance a lower half against an upper half
- sliding window median
- choose the best available option once it becomes affordable (unlock then pick)

### template
```cpp
// Two heaps: low (max-heap) and high (min-heap), |low| - |high| in {0, 1}.
struct RunningMedian {
    priority_queue<long long> low;
    priority_queue<long long, vector<long long>, greater<long long>> high;
    void add(long long x) {
        low.push(x);                                   // 1. insert on the low side
        high.push(low.top()); low.pop();               // 2. restore order: low <= high
        if (high.size() > low.size()) {                // 3. restore sizes
            low.push(high.top()); high.pop();
        }
    }
    double median() const {
        return low.size() > high.size() ? low.top() : (low.top() + high.top()) / 2.0;
    }
};
```

## dsa.heaps.scheduling-with-heaps
name: "Scheduling with heaps"
importance: important
pattern: true
prereqs: [dsa.heaps.binary-heap]
scope: "task scheduler, meeting rooms, CPU simulation"

### simple
Many scheduling problems ask "what should happen next?", and a heap answers that instantly. To count how many meeting rooms you need, you track when each room frees up and always check the one that frees up first. It is like a hotel front desk watching a list of checkout times, sorted so the earliest checkout is always on top.

### interview
- **Meeting rooms II** (minimum rooms): sort meetings by start; min-heap of end times; if the earliest end ≤ the new start, reuse that room (pop); push the new end. Answer = the heap's maximum size. **O(n log n)**.
- **Task scheduler with cooldown n**: count tasks; the formula `max(total, (maxFreq − 1) · (n + 1) + countOfMaxFreq)`, or simulate with a max-heap of counts and a cooldown queue.
- **Single-threaded CPU**: sort tasks by arrival; a min-heap of (processing time, index) for available tasks; advance time, jump to the next arrival when idle.
- **Process tasks on servers**: two heaps, free servers by (weight, index) and busy servers by (free time, …).
- Pattern: sort events by time, and use a heap for "the earliest finishing" or "the best available" item.

### questions
Q: How do you find the minimum number of meeting rooms needed?
A: Sort meetings by start time and keep a min-heap of end times of rooms in use. For each meeting, if the earliest end time is at most its start, that room is free, so pop it; then push this meeting's end. The heap's size is the number of rooms in use, and its largest size is the answer, in O(n log n).

Q: How does the task scheduler formula work?
A: The most frequent task (frequency f) forces f − 1 full cycles of length n + 1 plus a last partial cycle containing every task tied at frequency f. If other tasks overflow the idle slots, no idling is needed and the answer is just the total number of tasks, so the result is the maximum of the two.

Q: How do you simulate a single-threaded CPU that always runs the shortest available task?
A: Sort tasks by enqueue time. Keep a min-heap of available tasks keyed by (processing time, index). Add every task that has arrived by the current time; if none is available, jump the clock to the next arrival; otherwise pop and run the best one, advancing the clock by its duration.

Q: What is the general shape of heap-based scheduling problems?
A: Events are processed in time order (after sorting), and at each decision point you need the earliest finishing resource or the best available job. A heap provides that in O(log n), giving O(n log n) overall.

### signals
- the number of rooms, servers or machines needed for overlapping jobs
- always pick the job that finishes first or has the highest priority among those available
- tasks with cooldowns or deadlines
- simulate a processor or queue over time

### template
```cpp
// Resources needed over time: min-heap of end times of busy resources.
int minResources(vector<pair<int, int>> jobs) {          // {start, end}
    sort(jobs.begin(), jobs.end());                       // by start time
    priority_queue<int, vector<int>, greater<int>> busyUntil;
    int most = 0;
    for (auto [start, end] : jobs) {
        while (!busyUntil.empty() && busyUntil.top() <= start) busyUntil.pop();  // freed
        busyUntil.push(end);                              // occupy a resource
        most = max(most, (int)busyUntil.size());
    }
    return most;
}
```

## dsa.heaps.custom-comparators-and-lazy-deletion
name: "Custom comparators and lazy deletion"
importance: important
prereqs: [dsa.heaps.binary-heap]
scope: "stale entries, indexed heap idea"

### simple
Heaps usually can't remove an item from the middle or change its priority quickly. Lazy deletion works around this: instead of removing an outdated item, you leave it in place and throw it away later when it reaches the top, like ignoring expired coupons only when you pull them out of the drawer. A custom comparator tells the heap what "best" means for your data.

### interview
- Custom order: C++ `priority_queue<T, vector<T>, Cmp>` where `Cmp(a, b)` returns true if `a` has **lower** priority (so `greater<>` makes a min-heap); or push `tuple<key1, key2, payload>` and let tuples compare in order.
- **Lazy deletion**: when a priority changes or an item is removed, push a new entry (or record the deletion) and skip stale entries when they surface at the top. Dijkstra does this: skip a popped node whose distance is larger than the best known.
- Stale entries can make the heap grow to O(total pushes); rebuild when stale entries dominate.
- **Indexed heap**: keep each item's position in the heap array so decrease-key and delete are O(log n); more code, less memory.
- Alternative for arbitrary deletes: an ordered set (`std::set`, `TreeSet`) with O(log n) erase.

### questions
Q: How does lazy deletion work in a heap?
A: Instead of removing an entry when it becomes invalid, you leave it and record that it's invalid, or push a fresher entry. Whenever you look at the top, you first pop entries that are stale. Each entry is still pushed and popped once, so costs stay O(log n) amortized.

Q: How does Dijkstra's algorithm use lazy deletion?
A: When a shorter distance to a node is found, it pushes a new (distance, node) pair instead of decreasing the old key. When a pair is popped whose distance is larger than the node's best known distance, it's stale and is skipped.

Q: What does the comparator mean in C++'s priority_queue?
A: comp(a, b) returning true means a has lower priority than b, so b comes out first. With the default less<T> the largest element is on top; passing greater<T> puts the smallest on top.

Q: What is an indexed heap, and when is it worth it?
A: A heap that also stores each item's current position in the array, updated on every swap, so you can find an item and sift it up or down after changing its priority in O(log n). It's worth it when memory is tight or stale entries would pile up, such as Dijkstra on dense graphs.
