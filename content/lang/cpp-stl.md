---
topic: lang.cpp-stl
name: "C++ STL for interviews"
subject: lang
order: 2
prereqs: [lang.cpp-core]
---

## lang.cpp-stl.sequence-containers
name: "Sequence containers"
importance: must
scope: "vector, deque, list, array and the cost of each operation"

### simple
Sequence containers keep items in the order you put them in, but they store them differently. A vector is one long shelf (fast to read, slow to squeeze something into the middle), a deque is a row of short shelves you can extend at either end, and a list is a chain of separate boxes you can re-link anywhere but must walk through one by one. An array is a shelf with a fixed number of slots decided before the program runs.

### interview
- `vector`: one contiguous buffer. O(1) random access and amortized O(1) `push_back`/`pop_back`; O(n) insert or erase anywhere else. The default choice: fastest to iterate because of cache locality.
- `deque`: a table of fixed-size blocks (512 bytes each in libstdc++). O(1) push and pop at **both** ends and O(1) random access (with an extra indirection); O(n) in the middle. Pushing at an end invalidates iterators but **not references** to elements. Not contiguous.
- `list`: a doubly linked list of heap nodes. O(1) insert, erase and `splice` at a known iterator, and iterators stay valid until their element is erased; no random access, poor cache behavior, two pointers of overhead per element. `forward_list` is singly linked.
- `array<T, N>`: fixed size known at compile time, stored inline (often on the stack), no heap allocation; `sizeof` is `N * sizeof(T)`. Safer than a C array: it knows its size, copies by value and has `at()`.
- Pick `vector` unless you need O(1) at the front (`deque`, or `queue` on top of it), stable iterators with frequent middle inserts (`list`, rarely), or a fixed small size (`array`).

### deep
#### Intuition

All four keep insertion order; they differ in memory layout, and layout decides cost. Contiguous memory (vector, array) is read in cache lines of 64 bytes, so walking it is very fast. Node-based memory (list) scatters elements across the heap, so each step can be a cache miss.

#### Costs at a glance

| operation | vector | deque | list | array |
|---|---|---|---|---|
| `v[i]` | O(1) | O(1) | no | O(1) |
| push/pop at back | amortized O(1) | O(1) | O(1) | no |
| push/pop at front | O(n) | O(1) | O(1) | no |
| insert/erase in the middle | O(n) | O(n) | O(1) at an iterator | no |
| find a value | O(n) | O(n) | O(n) | O(n) |
| contiguous memory | yes | no | no | yes |
| sort | `sort` | `sort` | `l.sort()` member | `sort` |

`list` needs its own `sort` member because `std::sort` requires random-access iterators. Finding the position to insert into a list is still O(n); the O(1) is only for the insertion itself.

#### Worked example

```cpp
int main() {
    vector<int> v = {1, 2, 3};
    v.insert(v.begin(), 0);             // O(n): every element shifts right
    deque<int> d = {1, 2, 3};
    int& middle = d[1];
    d.push_front(0);                    // O(1); references to elements stay valid
    d.push_back(4);
    list<int> a = {1, 2, 3}, b = {10, 20};
    a.splice(next(a.begin()), b);       // O(1): moves b's nodes in after the 1
    array<int, 3> fixed{};              // size fixed at compile time, zero-filled
    cout << v[0] << " " << middle << " " << d.front() << " " << d.back() << "\n";
    for (int x : a) cout << x << " ";
    cout << "(b now has " << b.size() << ")\n";
    cout << fixed.size() << " " << fixed[2] << " " << sizeof(fixed) << "\n";
}
```

Output:

```text
0 2 0 4
1 10 20 2 3 (b now has 0)
3 0 12
```

`middle` still refers to the element 2 after two pushes on the deque, because deque grows by adding blocks rather than moving existing elements. The same code with a vector would leave `middle` dangling after a reallocation. `splice` moved b's two nodes without copying or allocating anything.

#### Why vector usually wins anyway

Big-O ignores constants, and a vector's constant is tiny. Inserting in the middle of a vector moves elements with a fast memory copy, while reaching the middle of a list means following pointers one node at a time. For typical interview sizes (up to about 10^5 elements), a vector with occasional O(n) inserts often beats a list. Use a list only when you already hold iterators to the insertion points (an LRU cache is the classic case) or you need `splice`.

#### Memory per element

| container | extra memory per element |
|---|---|
| `vector<int>` | none beyond unused capacity (up to about 2× with doubling) |
| `deque<int>` | small: a pointer per 512-byte block |
| `list<int>` | two pointers (16 bytes) plus allocator overhead per node |
| `array<int, N>` | none |

#### Edge cases and bugs

- `v.front()`, `v.back()` and `pop_back()` on an empty container are undefined behavior.
- `vector<int> v(5)` makes five zeros; `vector<int> v{5}` makes one element, 5.
- `deque` iterators are invalidated by pushes at the ends even though references are not; do not keep deque iterators across pushes.
- `std::array` is not resizable, and its size is part of the type: `array<int, 3>` and `array<int, 4>` are different types.

Connects to: strings and vectors, container adaptors, cost of built-in operations, linked lists, LRU cache.

### questions
Q: When would you choose deque over vector?
A: When you need O(1) insertion and removal at the front as well as the back, such as a sliding window or a BFS queue, while keeping random access. Deque also keeps references to existing elements valid when pushing at either end. Vector remains better for contiguous memory and the fastest iteration.

Q: Inserting in the middle of a list is O(1). Why is vector still often faster in practice?
A: The O(1) only counts the link change; you first need an iterator to the position, and finding it is O(n) pointer chasing with cache misses. Vector's O(n) shift is a fast contiguous memory move, and its iteration is cache friendly, so for moderate sizes vector usually wins.

Q: What is the difference between std::array and a C-style array?
A: Both have a fixed size and no heap allocation, but std::array is a class: it knows its size, can be copied and assigned by value, can be returned from functions, works with the standard algorithms, and offers at() with bounds checking. A C array decays to a pointer and loses its size.

Q: Why does list have its own sort member function?
A: std::sort needs random-access iterators to split ranges and jump to positions, which a linked list cannot provide. list::sort is a merge sort that relinks nodes in O(n log n) without moving element values, and it keeps iterators valid.

Q: What is the difference between vector<int> v(5) and vector<int> v{5}?
A: Parentheses call the size constructor, giving five value-initialized elements, all 0. Braces prefer the initializer-list constructor, giving one element with value 5.

## lang.cpp-stl.ordered-containers
name: "Ordered containers"
importance: must
scope: "map, set, multiset (red-black trees), `lower_bound`, `upper_bound`"

### simple
Ordered containers keep their items sorted all the time, like a dictionary where every new word is filed in its alphabetical place at once. Because everything stays in order, you can ask quick questions such as "what is the first word after this one?" or "what is the largest number below 25?". Each insert or lookup costs a few comparisons that grow slowly with the size, like finding a word by opening the dictionary in the middle again and again.

### interview
- `set`, `map`, `multiset` and `multimap` are **balanced binary search trees** (red-black trees in the major implementations): insert, erase and find are **O(log n)**, and iteration visits keys in sorted order.
- `lower_bound(x)` returns the first element **≥ x**; `upper_bound(x)` the first **> x**. The largest element **< x** is `prev(s.lower_bound(x))` (check that it is not `begin()` first). `*s.begin()` is the minimum and `*s.rbegin()` the maximum.
- Call the **member** `s.lower_bound(x)`, which is O(log n). `std::lower_bound(s.begin(), s.end(), x)` compiles but is O(n), because set iterators cannot jump.
- `map[k]` **inserts** a default value when `k` is missing; use `find`, `count` or `contains` (C++20) to test for a key. `insert` does not overwrite an existing key; `m[k] = v` and `insert_or_assign` do.
- `multiset` keeps duplicates: `ms.erase(x)` removes **all** copies, while `ms.erase(ms.find(x))` removes one. `count(x)` costs O(log n + count).
- Keys are const inside the container (changing one would break the order). A custom comparator must be a strict weak ordering, and elements it considers equivalent are treated as duplicates.

### deep
#### Intuition

A balanced binary search tree keeps every key's left subtree smaller and right subtree larger, and rebalances on insert and erase so the height stays about $\log_2 n$ (a red-black tree's height is at most $2 \log_2(n + 1)$). Every operation walks one root-to-leaf path, so a million keys need about 20 to 40 steps.

#### Worked example

```cpp
int main() {
    set<int> s = {10, 20, 30, 40};
    cout << *s.lower_bound(20) << " " << *s.upper_bound(20) << " " << *s.lower_bound(25) << "\n";
    auto it = s.lower_bound(25);                   // first element >= 25
    cout << "largest below 25: " << *prev(it) << "\n";
    cout << (s.upper_bound(40) == s.end()) << "\n";  // nothing above 40

    multiset<int> ms = {5, 5, 5, 7};
    ms.erase(ms.find(5));                           // removes one 5
    cout << ms.count(5) << " ";
    ms.erase(5);                                    // removes every 5
    cout << ms.count(5) << " " << ms.size() << "\n";

    map<string, int> freq;
    for (string w : {"pear", "fig", "pear", "apple", "pear"}) freq[w]++;
    for (auto& [w, n] : freq) cout << w << "=" << n << " ";   // sorted by key
    cout << "\n" << freq.contains("kiwi") << " " << freq.size() << " ";
    int k = freq["kiwi"];                           // operator[] inserts kiwi = 0
    cout << k << " " << freq.size() << "\n";
}
```

Output:

```text
20 30 30
largest below 25: 20
1
2 0 1
apple=1 fig=1 pear=3 
0 3 0 4
```

| query on {10, 20, 30, 40} | result |
|---|---|
| `lower_bound(20)` | 20 (first ≥ 20) |
| `upper_bound(20)` | 30 (first > 20) |
| `lower_bound(25)` | 30 |
| `prev(lower_bound(25))` | 20, the largest < 25 |
| `upper_bound(40)` | `end()` |

The last line shows the classic bug: merely reading `freq["kiwi"]` added a key, and the size went from 3 to 4.

#### Operations and costs

| operation | cost | note |
|---|---|---|
| `insert`, `erase(key)`, `find`, `count` (set, map) | O(log n) | |
| `lower_bound`, `upper_bound`, `equal_range` | O(log n) | members, not `std::` versions |
| `erase(iterator)` | amortized O(1) | |
| `begin()`, `rbegin()` | O(1) | the minimum and maximum |
| `++it` | amortized O(1) | a full in-order walk is O(n) |
| `multiset::count(x)` | O(log n + count) | |

Each element is its own heap node: a `set<int>` node is 40 bytes in libstdc++ (three pointers, a color and the key) plus allocator overhead, so ordered containers use several times the memory of a sorted vector.

#### Custom ordering

```cpp
// sketch: order by length, then alphabetically
struct ByLength {
    bool operator()(const string& a, const string& b) const {
        return a.size() != b.size() ? a.size() < b.size() : a < b;
    }
};
set<string, ByLength> words;      // "fig" < "kiwi" < "apple"
```

If the comparator compared only lengths, "fig" and "cat" would be equivalent (neither is less than the other) and the set would keep only one of them. `set<int, greater<int>>` sorts in descending order.

#### When a sorted vector is better

If you build the data once and then only query, sort a vector and use `std::lower_bound` on it: same O(log n) queries, contiguous memory, much less overhead. Use `set` and `map` when inserts and erases are mixed with queries (sliding-window medians, interval scheduling, sweep lines).

#### Edge cases and bugs

- `prev(s.begin())` and `*s.end()` are undefined behavior: check before stepping.
- Erasing while iterating: `it = s.erase(it)`.
- Iterators stay valid when other elements are inserted or erased, unlike a vector's.

Connects to: binary search trees, self-balancing BSTs overview, unordered containers, policy-based ordered set, intervals.

### questions
Q: What is the difference between lower_bound and upper_bound?
A: lower_bound(x) returns an iterator to the first element that is not less than x, meaning at least x. upper_bound(x) returns the first element strictly greater than x. Together they bound the range of elements equal to x, which equal_range returns directly.

Q: How do you find the largest element smaller than x in a std::set?
A: Take it = s.lower_bound(x), which points at the first element at least x. If it equals s.begin(), no smaller element exists; otherwise prev(it) is the answer. The whole operation is O(log n).

Q: Why should you call s.lower_bound(x) instead of std::lower_bound(s.begin(), s.end(), x) on a set?
A: The member function walks down the tree in O(log n). The generic algorithm only sees bidirectional iterators, which cannot jump to the middle, so it has to step through elements and takes O(n) time.

Q: What surprising thing does map's operator[] do?
A: If the key is missing, it inserts it with a value-initialized value (0 for numbers, empty for strings) and returns a reference to it. So even reading m[k] changes the map, and it cannot be used on a const map. Use find, count or contains to test membership.

Q: How do you remove just one copy of a value from a multiset?
A: Erase through an iterator: auto it = ms.find(x); if it is not end(), call ms.erase(it). Calling ms.erase(x) with the value removes every copy of x.

## lang.cpp-stl.unordered-containers
name: "Unordered containers"
importance: must
scope: "unordered_map and unordered_set internals, custom hash, `reserve`, worst case"

### simple
An unordered map is like a coat check with numbered hooks: a formula turns your ticket into a hook number, so you walk straight to it instead of searching. That makes lookups fast on average. If the formula sends many tickets to the same hook, though, the attendant has to dig through a pile, and in the worst case every coat ends up on one hook.

### interview
- `unordered_map` and `unordered_set` are **hash tables**: average **O(1)** insert, find and erase, **O(n) worst case** when many keys share a bucket. Iteration order is unspecified.
- libstdc++ uses **separate chaining**: each bucket leads into one linked list of nodes. The **load factor** is size / bucket count; when it would exceed `max_load_factor()` (1.0 by default) the table **rehashes** into more buckets (a prime count in libstdc++), which invalidates iterators but not references to elements.
- `reserve(n)` sizes the bucket array for n elements up front, avoiding repeated rehashing when you know the count.
- `std::hash<int>` is the identity in libstdc++, so keys that are multiples of the bucket count all collide. Adversarial tests on contest sites exploit this and turn O(n) solutions into O(n^2). Defend with a custom hash that mixes bits (such as SplitMix64) and a random seed.
- There is no `std::hash` for `pair` or `vector`: write a hash functor (or encode a pair of ints into one 64-bit key). Equal keys must produce equal hashes.
- Choose unordered for pure lookups and counting; choose `map`/`set` when you need order, `lower_bound`, or guaranteed O(log n).

### deep
#### How it works

A hash table keeps an array of buckets. To find a key, it computes `hash(key) % bucketCount`, goes to that bucket and compares the key with the few nodes stored there. When keys spread evenly and the load factor stays below 1, a bucket holds about one node, so the work per operation is constant on average.

libstdc++ keeps all nodes in one singly linked list, and each bucket points just before its first node. A node for `unordered_set<int>` holds a next pointer and the key; for types whose hashes are slow to compute (such as strings) it also caches the hash. The bucket count starts small and jumps through primes: inserting 100 integers one by one grew it 1 → 13 → 29 → 59 → 127.

#### Worked example: forcing the worst case

```cpp
struct SplitMix {                 // mixes all 64 bits of the key
    size_t operator()(uint64_t x) const {
        x += 0x9e3779b97f4a7c15;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
        x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
        return x ^ (x >> 31);
    }
};

int main() {
    unordered_map<long long, int> plain;
    plain.reserve(1000);                        // enough buckets for 1000 keys
    size_t b = plain.bucket_count();
    for (int i = 0; i < 1000; ++i) plain[1LL * i * b] = i;   // keys 0, b, 2b, ...
    cout << "buckets " << b << ", keys in bucket 0: " << plain.bucket_size(0) << "\n";

    unordered_map<long long, int, SplitMix> mixed;
    mixed.reserve(1000);
    for (int i = 0; i < 1000; ++i) mixed[1LL * i * b] = i;
    size_t worst = 0;
    for (size_t k = 0; k < mixed.bucket_count(); ++k) worst = max(worst, mixed.bucket_size(k));
    cout << "with SplitMix, largest bucket: " << worst << "\n";
}
```

Output (libstdc++):

```text
buckets 1031, keys in bucket 0: 1000
with SplitMix, largest bucket: 5
```

With the identity hash, every key is a multiple of 1031, so every key lands in bucket 0: each insert and lookup walks a chain of up to 1000 nodes, and n operations cost O(n^2). The mixing hash spreads the same keys so the longest chain is 5. In real code add a random seed (for example `chrono::steady_clock::now().time_since_epoch().count()`) to the key before mixing, so an attacker cannot predict the buckets.

#### Hashing a pair

```cpp
// sketch: a hash for pair<int, int> keys
struct PairHash {
    size_t operator()(const pair<int, int>& p) const {
        uint64_t key = (uint64_t(uint32_t(p.first)) << 32) | uint32_t(p.second);
        return SplitMix{}(key);           // one 64-bit key, then mix
    }
};
unordered_map<pair<int, int>, int, PairHash> grid;
```

Packing both halves into one 64-bit number is exact for 32-bit ints, so different pairs never produce the same packed key. Combining two hashes with `h1 ^ h2` is a common mistake: `(a, b)` and `(b, a)` collide, and so does every `(x, x)`.

#### Costs

| operation | average | worst |
|---|---|---|
| `insert`, `find`, `erase`, `count`, `operator[]` | O(1) | O(n) |
| rehash | O(n) | O(n) |
| iterate all | O(n + bucket count) | |

Rehashing makes a single insert occasionally O(n), but the total stays amortized O(1), like vector growth.

#### Edge cases and bugs

- A key's hash and equality must agree: if `a == b` then `hash(a) == hash(b)`.
- Do not change a key's contents after inserting it (the element is const for this reason).
- `unordered_map` iteration order can change after a rehash; never depend on it for output.
- For small integer keys in a known range, a plain `vector` indexed by the key is faster than any hash table.

Connects to: hash table internals, collision handling, ordered containers, cost of built-in operations, equality and hashing.

### questions
Q: How is std::unordered_map implemented?
A: As a hash table with separate chaining: an array of buckets where each bucket leads into a linked list of nodes. The key's hash modulo the bucket count selects the bucket. When the load factor would exceed max_load_factor, 1.0 by default, it rehashes into a larger bucket array.

Q: What is the worst-case complexity of unordered_map lookup, and when does it happen?
A: O(n), when many keys hash to the same bucket and the lookup must walk a long chain. With libstdc++'s identity hash for integers, inputs made of multiples of the bucket count cause this, and contest hackers use it to make solutions time out.

Q: How do you protect a solution against anti-hash tests?
A: Use a custom hash functor that mixes the bits of the key, such as SplitMix64, and add a random seed chosen at run time. Then an adversary cannot predict which keys collide, and the expected cost returns to O(1).

Q: What does reserve do on an unordered_map, and why use it?
A: reserve(n) sets the bucket count so that n elements fit without exceeding the maximum load factor. When you know roughly how many keys you will insert, it avoids repeated rehashing, each of which costs O(n) and invalidates iterators.

Q: How can you use a pair<int, int> as a key in an unordered_map?
A: Provide a hash functor as the third template argument, because the standard library has no hash for pair. A safe approach packs the two 32-bit values into one 64-bit integer and mixes it. Combining two hashes with a plain XOR is weak because swapped pairs collide.

## lang.cpp-stl.container-adaptors
name: "Container adaptors"
importance: must
scope: "stack, queue, priority_queue (max-heap default, min-heap with `greater<>`, custom comparators)"

### simple
Container adaptors are simple doors placed in front of another container, so you can only use it in one disciplined way. A stack is a pile of plates (take from the top), a queue is a line at a counter (first come, first served), and a priority queue is a hospital waiting room where the most urgent patient is always seen next. Limiting what you can do makes the intent of the code obvious and prevents mistakes.

### interview
- `stack<T>` (LIFO: `push`, `pop`, `top`) and `queue<T>` (FIFO: `push`, `pop`, `front`, `back`) wrap a `deque` by default. All operations are O(1). `pop()` returns `void`: read `top()` or `front()` first.
- `priority_queue<T>` is a **binary heap** stored in a `vector`: `top()` O(1), `push` and `pop` O(log n), building from a range O(n). It is a **max-heap** by default (the largest element is on top).
- **Min-heap**: `priority_queue<int, vector<int>, greater<int>>`. For Dijkstra: `priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>>`, since pairs compare by the first member, then the second.
- A custom comparator `cmp(a, b)` returns true when **a has lower priority than b** (a comes out **later**). This reads backwards from `sort`, where `cmp(a, b)` true means a comes first.
- No iteration, no search, no decrease-key and no erase of arbitrary elements. For Dijkstra, push a new (distance, node) pair and skip stale ones when popped (lazy deletion).
- `top()`, `front()` and `pop()` on an empty adaptor are undefined behavior: check `empty()` first.

### deep
#### Intuition

A priority queue keeps a heap: a complete binary tree stored in an array where every parent has priority at least as high as its children. The highest priority sits at index 0. Pushing appends at the end and sifts up; popping moves the last element to the root and sifts down, each along one path of height about $\log_2 n$.

#### Worked example

```cpp
int main() {
    priority_queue<int> maxq;                              // largest on top
    priority_queue<int, vector<int>, greater<int>> minq;   // smallest on top
    for (int x : {5, 1, 8, 3}) { maxq.push(x); minq.push(x); }
    cout << maxq.top() << " " << minq.top() << "\n";

    // Earliest deadline first, ties by name. The comparator answers
    // "should a come out after b?"
    auto later = [](const pair<int, string>& a, const pair<int, string>& b) {
        return a.first != b.first ? a.first > b.first : a.second > b.second;
    };
    priority_queue<pair<int, string>, vector<pair<int, string>>, decltype(later)> tasks(later);
    tasks.push({3, "email"});
    tasks.push({1, "deploy"});
    tasks.push({3, "backup"});
    tasks.push({2, "review"});
    while (!tasks.empty()) {
        auto [day, name] = tasks.top();                    // read, then pop
        tasks.pop();
        cout << day << ":" << name << " ";
    }
    cout << "\n";

    stack<int> st;
    queue<int> q;
    for (int x : {1, 2, 3}) { st.push(x); q.push(x); }
    cout << st.top() << " " << q.front() << " " << q.back() << "\n";
}
```

Output:

```text
8 1
1:deploy 2:review 3:backup 3:email 
3 1 3
```

The comparator uses `>` to get the **smallest** deadline first: with `priority_queue`, "less than" means "lower priority", so reversing the comparison reverses which end comes out. Because `pair` already compares by first then second, `greater<>` would give the same order here without a lambda.

#### The comparator rule, once more

| you want on top | comparator `cmp(a, b)` returns |
|---|---|
| largest | `a < b` (the default `less`) |
| smallest | `a > b` (`greater`) |
| earliest deadline | `a.deadline > b.deadline` |
| highest score, then smallest id | `a.score != b.score ? a.score < b.score : a.id > b.id` |

Mnemonic: the comparator describes what goes to the **bottom**.

#### Costs

| operation | stack / queue | priority_queue |
|---|---|---|
| push | O(1) | O(log n) |
| pop | O(1) | O(log n) |
| top / front | O(1) | O(1) |
| build from n elements | - | O(n) with the range constructor |
| find or erase an arbitrary element | not supported | not supported |

#### Patterns built on them

- **Top k largest**: keep a min-heap of size k; push each element and pop when the size exceeds k. O(n log k).
- **Merge k sorted lists**: a min-heap of (value, list index). O(N log k).
- **Dijkstra**: min-heap of (distance, node); when a popped distance is larger than the best known, skip it.
- **Monotonic stack** and **BFS** use `stack`/`vector` and `queue` directly.

#### Edge cases and bugs

- Declaring a min-heap as `priority_queue<int, greater<int>>` does not compile: the container comes second.
- Storing large objects in a heap copies them on every sift; store indices or `pair<key, index>`.
- Changing an element's priority in place is impossible; push the new version instead.

Connects to: binary heap, stacks and queues, Dijkstra's algorithm, top-k elements, sequence containers.

### questions
Q: How do you make a min-heap with priority_queue?
A: Pass the container and a greater comparator: priority_queue<int, vector<int>, greater<int>>. The default comparator less produces a max-heap; greater reverses it so the smallest element is on top.

Q: What does the comparator of a priority_queue mean?
A: cmp(a, b) returning true means a has lower priority than b, so b comes out before a. With less, larger values have higher priority and come out first. This is the opposite of how sort reads a comparator.

Q: What are the complexities of priority_queue operations?
A: top is O(1); push and pop are O(log n) because they sift an element along one path of the heap; building from a range of n elements with the constructor is O(n). It does not support searching, erasing an arbitrary element or decreasing a key.

Q: How do you handle decrease-key in Dijkstra with priority_queue?
A: Use lazy deletion: whenever a distance improves, push a new (distance, node) pair. When you pop a pair whose distance is larger than the node's current best, skip it. The heap may hold up to E entries, giving O(E log E), which is O(E log V).

Q: Why does stack::pop not return the popped element?
A: For exception safety: if pop returned by value and copying the element threw, the element would already be removed and lost. Splitting the job into top, which returns a reference, and pop, which returns void, avoids that.

## lang.cpp-stl.stl-algorithms
name: "STL algorithms"
importance: must
scope: "sort, stable_sort, comparators and strict weak ordering, binary_search, next_permutation, accumulate, unique"

### simple
The algorithms header is a toolbox of well-tested routines that work on any range of elements: sorting, searching, counting, summing, shuffling into the next arrangement. Using them is like using a power drill instead of a hand screwdriver: less code, fewer bugs and usually faster. Each tool has a few rules, such as "the range must already be sorted", and breaking them gives wrong answers.

### interview
- `sort` is O(n log n) in the worst case (introsort: quicksort that falls back to heapsort, plus insertion sort for small ranges) and **not stable**. `stable_sort` keeps equal elements in their original order; O(n log n) with extra memory, O(n log^2 n) without.
- A comparator must be a **strict weak ordering**: `cmp(a, a)` is false, `cmp(a, b)` and `cmp(b, a)` are never both true, and it is transitive. Using `<=` breaks this and is undefined behavior: `sort` can read out of bounds or crash.
- On a sorted range: `binary_search` returns only a bool; `lower_bound` (first ≥ x) and `upper_bound` (first > x) return iterators, and `upper_bound - lower_bound` counts copies of x. All O(log n) on random-access iterators.
- `next_permutation` rearranges into the next lexicographic permutation and returns false after the last one (leaving the range sorted again). Start from the sorted order to visit every distinct permutation once.
- `accumulate(first, last, init)` sums in the **type of init**: `accumulate(v.begin(), v.end(), 0)` on `long long` values truncates to `int`; write `0LL`.
- `unique` removes **adjacent** duplicates and returns the new logical end without shrinking the container: `sort`, then `v.erase(unique(v.begin(), v.end()), v.end())`.
- Also worth knowing: `reverse`, `min_element`/`max_element`, `count`/`count_if`, `fill`, `iota`, `partial_sum`, `nth_element` (average O(n)), and C++20 `ranges::sort(v)`.

### deep
#### Worked example

```cpp
int main() {
    vector<pair<string, int>> people = {{"Ravi", 30}, {"Ana", 25}, {"Bo", 30}, {"Cy", 25}};
    stable_sort(people.begin(), people.end(),
                [](const auto& a, const auto& b) { return a.second < b.second; });
    for (auto& [name, age] : people) cout << name << age << " ";   // ties keep input order
    cout << "\n";

    vector<int> v = {5, 3, 3, 1, 5, 5, 2};
    sort(v.begin(), v.end());                                // 1 2 3 3 5 5 5
    cout << binary_search(v.begin(), v.end(), 4) << " "
         << lower_bound(v.begin(), v.end(), 5) - v.begin() << " "
         << upper_bound(v.begin(), v.end(), 5) - v.begin() << "\n";
    v.erase(unique(v.begin(), v.end()), v.end());            // drop adjacent repeats
    for (int x : v) cout << x << " ";
    cout << "\n";

    vector<long long> big = {2'000'000'000, 2'000'000'000};
    cout << accumulate(big.begin(), big.end(), 0) << " "     // the sum is kept in an int
         << accumulate(big.begin(), big.end(), 0LL) << "\n";

    string s = "abc";
    do cout << s << " ";
    while (next_permutation(s.begin(), s.end()));
    cout << "| back to " << s << "\n";
}
```

Output:

```text
Ana25 Cy25 Ravi30 Bo30 
0 4 7
1 2 3 5 
-294967296 4000000000
abc acb bac bca cab cba | back to abc
```

- `stable_sort` kept Ana before Cy and Ravi before Bo, as in the input. Plain `sort` may swap equal elements.
- In `1 2 3 3 5 5 5`, the 5s occupy indices 4 to 6, so `upper_bound - lower_bound` is 3 copies.
- With `init = 0`, each partial sum is converted back to `int`. The 4,000,000,000 total does not fit, and since C++20 the conversion wraps to −294,967,296 (before C++20 the result was implementation-defined). With `vector<int>` elements the addition itself would overflow, which is undefined behavior.

#### Strict weak ordering

```cpp
// Undefined behavior: <= is not a strict weak ordering. Never rely on what this prints.
int main() {
    vector<int> v(40, 7);
    sort(v.begin(), v.end(), [](int a, int b) { return a <= b; });
}
```

With many equal elements, libstdc++'s partition step trusts the comparator to stop at an equal element and can run past the end of the array. Compiled with `-D_GLIBCXX_DEBUG`, libstdc++ checks the comparator and stops with `comparison doesn't meet irreflexive requirements, assert(!(a < a))`. Write comparators with `<` on each key in turn, or compare tuples: `return tie(a.x, a.y) < tie(b.x, b.y);`.

#### Costs

| algorithm | cost | requirement |
|---|---|---|
| `sort`, `stable_sort` | O(n log n) | random-access iterators |
| `binary_search`, `lower_bound`, `upper_bound`, `equal_range` | O(log n) comparisons | range sorted by the same comparator |
| `next_permutation` | O(n) per call | returns false after the last |
| `accumulate`, `count`, `find`, `min_element` | O(n) | |
| `unique` | O(n) | removes adjacent duplicates only |
| `nth_element` | O(n) on average | puts the k-th element in place |
| `reverse`, `rotate` | O(n) | |

#### Edge cases and bugs

- `lower_bound` on an unsorted range returns a meaningless answer without any error.
- `unique` without a preceding `sort` keeps non-adjacent duplicates.
- A comparator taking arguments by value copies strings on every comparison; take `const T&`.
- `max_element` on an empty range returns `end()`, and dereferencing it is undefined behavior.

Connects to: sorting, binary search, backtracking (permutations), pairs, tuples and lambdas, cost of built-in operations.

### questions
Q: What is the difference between sort and stable_sort?
A: sort does not guarantee the relative order of equal elements, while stable_sort keeps them in their original order. Stability matters when you sort by one key after another, such as by name and then by age. stable_sort is typically a merge sort that uses extra memory.

Q: What is a strict weak ordering, and why does it matter for sort?
A: It is a comparison that is irreflexive (a is never less than itself), asymmetric and transitive, with equivalence also transitive. sort relies on these properties, for example to stop scans at equal elements. A comparator like a <= b breaks irreflexivity, which is undefined behavior and can cause out-of-bounds reads or crashes.

Q: How do you count how many times x appears in a sorted vector in O(log n)?
A: Compute upper_bound(v.begin(), v.end(), x) minus lower_bound(v.begin(), v.end(), x). The first points just past the last copy of x and the second at the first copy, so their difference is the count. equal_range returns both at once.

Q: What does unique actually do?
A: It moves one copy of each run of adjacent equal elements to the front and returns an iterator to the new logical end, without changing the container's size. To remove duplicates completely, sort first so equal elements are adjacent, then erase from the returned iterator to the end.

Q: Why can accumulate give a wrong sum for a vector of long long?
A: Its result has the type of the initial value. With 0, an int, every partial sum is converted back to int, so a large total is truncated. Passing 0LL makes the accumulator a long long.

## lang.cpp-stl.pairs-tuples-and-lambdas
name: "Pairs, tuples and lambdas"
importance: important
scope: "structured bindings, lambda captures, sorting with lambdas"

### simple
A pair or tuple is a small envelope holding two or more values of possibly different types, handy for returning several results or sorting by several keys. A lambda is a function written right where you need it, like a sticky note with instructions handed to sort or a search. The lambda can take a copy of nearby variables, or a way to look at them later, and choosing which one matters.

### interview
- `pair<A, B>` and `tuple<...>` compare **lexicographically** (first member, then second, and so on), which makes them natural keys for sorting, heaps and ordered sets.
- **Structured bindings** unpack them: `auto [dist, node] = pq.top();` copies; `for (auto& [key, value] : m)` binds references, so changes affect the map. `tie(a, b) = f();` assigns into existing variables, and `tie(x.a, x.b) < tie(y.a, y.b)` compares several fields.
- A **lambda** is `[captures](params) -> ret { body }`. It creates a function object of a unique, unnamed type.
- Captures: `[x]` copies x when the lambda is **created**; `[&x]` refers to x and sees later changes; `[=]` and `[&]` capture everything used; `[this]` gives access to members; `[y = std::move(v)]` is an init capture. By-value captures are const unless the lambda is `mutable`.
- A lambda that captures by reference must not outlive those variables (for example when stored in a thread, a callback or a returned `std::function`).
- Recursive lambdas: pass the lambda to itself (`auto dfs = [&](auto&& self, int u) -> void {...}; dfs(dfs, 0);`), use `std::function` (slower, heap-allocating), or in C++23 name the object with `this auto&& self`.

### deep
#### Worked example

```cpp
int main() {
    pair<int, string> a{2, "b"}, b{2, "a"};
    cout << (b < a) << "\n";                       // compares first, then second
    tuple<int, int, int> t{1, 2, 3};
    auto [x, y, z] = t;                            // structured binding (copies)
    map<string, int> stock = {{"apple", 3}, {"pear", 0}};
    for (auto& [fruit, count] : stock) count += 10; // references into the map
    cout << x + y + z << " " << stock["apple"] << " " << get<2>(t) << "\n";

    int base = 100;
    auto addByValue = [base](int v) { return base + v; };   // copies base now
    auto addByRef = [&base](int v) { return base + v; };    // reads base later
    base = 200;
    cout << addByValue(1) << " " << addByRef(1) << "\n";

    auto counter = [n = 0]() mutable { return ++n; };         // init capture, own state
    counter();
    counter();
    cout << counter() << "\n";

    vector<string> words = {"kiwi", "fig", "banana", "apple"};
    sort(words.begin(), words.end(), [](const string& p, const string& q) {
        if (p.size() != q.size()) return p.size() < q.size();  // shorter first
        return p < q;                                           // then alphabetical
    });
    for (auto& w : words) cout << w << " ";
    cout << "\n";

    vector<vector<int>> adj = {{1, 2}, {3}, {}, {}};
    vector<int> order;
    auto dfs = [&](auto&& self, int u) -> void {                // recursive lambda
        order.push_back(u);
        for (int v : adj[u]) self(self, v);
    };
    dfs(dfs, 0);
    for (int u : order) cout << u << " ";
    cout << "\n";
}
```

Output:

```text
1
6 13 3
101 201
3
fig kiwi apple banana 
0 1 3 2 
```

- `b < a` because the first members tie (2 and 2) and "a" < "b".
- `addByValue` froze `base` at 100 when it was created; `addByRef` read 200 at the call.
- `counter` keeps its own `n` inside the lambda object; `mutable` lets the call change it.
- The DFS lambda cannot refer to `dfs` inside its own initializer, so it receives itself as `self`. The `-> void` is needed because the return type of a recursive generic lambda cannot be deduced from its own call.

#### What a lambda really is

The compiler turns `[base](int v) { return base + v; }` into a small class with a member `base` and an `operator()(int v) const`. That is why lambdas passed to `sort` are usually inlined and cost nothing extra, and why a by-value capture is a copy taken at creation. `std::function<int(int)>` can hold any callable with that signature, but it may allocate memory and calls through an indirection, so prefer `auto` or templates for hot code.

#### Edge cases and bugs

- `[&]` in a lambda handed to a thread or stored for later can leave dangling references when the enclosing function returns.
- `[=]` inside a member function captures `this` (the pointer), not a copy of the object; C++20 deprecates the implicit capture of `this` through `[=]`. Write `[this]` or `[*this]` explicitly.
- `auto [a, b] = p;` copies p; changing `a` does not change `p`. Use `auto& [a, b]` to modify.
- A lambda comparator for `set` or `priority_queue` goes in as `decltype(cmp)`; before C++20 the object itself must also be passed to the constructor.

Connects to: STL algorithms, container adaptors, templates, backtracking, graph traversal.

### questions
Q: How do pairs and tuples compare?
A: Lexicographically: first by the first member, and only if those are equal by the second, and so on. That is why a priority queue of pair of distance and node orders by distance first, and why tuples make simple multi-key sort comparators.

Q: What is the difference between capturing a variable by value and by reference in a lambda?
A: By value copies the variable when the lambda is created, so later changes outside are not seen and the lambda owns its copy. By reference stores a reference, so the lambda sees the current value at each call, but it becomes dangling if the variable's lifetime ends before the lambda is used.

Q: What does the mutable keyword do on a lambda?
A: The lambda's call operator is const by default, so it cannot modify its by-value captures. mutable removes that const, letting the lambda change its own copies, such as a counter kept inside the lambda object. It never affects the original variables.

Q: How can you write a recursive lambda?
A: A lambda cannot name itself in its own initializer, so pass it as a parameter: auto dfs = [&](auto&& self, int u) -> void { ... self(self, v); }; and call dfs(dfs, start). Alternatives are std::function, which adds overhead, or C++23's explicit object parameter.

Q: What does auto& [k, v] give you when iterating over a map?
A: References to the key and value of each element, so assigning to v updates the map in place without a copy. The key is const, because changing it would break the map's ordering.

## lang.cpp-stl.policy-based-ordered-set
name: "Policy-based ordered set"
importance: advanced
prereqs: [lang.cpp-stl.ordered-containers]
scope: "order statistics tree for competitive programming"

### simple
A normal set can tell you whether a number is present, but not quickly how many numbers are smaller, or which number is fifth in line. The policy-based ordered set is a set where every tree node also remembers the size of its subtree, like a filing cabinet where each drawer is labelled with how many folders it holds. With those counts you can jump straight to the k-th item or count everything below a value in logarithmic time.

### interview
- GCC ships a non-standard library, `__gnu_pbds`, with a `tree` that supports **order statistics**: `find_by_order(k)` returns an iterator to the k-th smallest element (0-based) and `order_of_key(x)` returns how many elements are **strictly less** than x. Both are O(log n).
- Declaration: `tree<int, null_type, less<int>, rb_tree_tag, tree_order_statistics_node_update>`, from `<ext/pb_ds/assoc_container.hpp>` and `<ext/pb_ds/tree_policy.hpp>`, in namespace `__gnu_pbds`.
- It behaves like a `set` (unique keys, `insert`, `erase`, `find`, `lower_bound`). For duplicates, store `pair<value, uniqueIndex>` rather than using `less_equal`, which breaks `find`, `erase` and `lower_bound`.
- Uses: counting inversions, the k-th smallest in a dynamic set, rank queries, sliding-window medians.
- Only in GCC's libstdc++ (fine on Codeforces-style judges, not portable, never in production code). A Fenwick tree over compressed values does the same counting portably.

### deep
#### Worked example

```cpp
using namespace __gnu_pbds;
template <class T>
using ordered_set = tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>;

int main() {
    ordered_set<int> s;
    for (int x : {40, 10, 30, 20}) s.insert(x);
    cout << *s.find_by_order(0) << " " << *s.find_by_order(2) << "\n";
    cout << s.order_of_key(25) << " " << s.order_of_key(40) << "\n";
    cout << (s.find_by_order(4) == s.end()) << "\n";          // k past the end

    // Count inversions: pairs i < j with a[i] > a[j].
    vector<int> a = {3, 1, 2, 5, 4, 2};
    ordered_set<pair<int, int>> seen;                         // (value, index): duplicates stay apart
    long long inversions = 0;
    for (int i = 0; i < (int)a.size(); ++i) {
        inversions += i - seen.order_of_key({a[i], INT_MAX}); // earlier elements greater than a[i]
        seen.insert({a[i], i});
    }
    cout << inversions << "\n";
    s.erase(30);
    cout << s.size() << " " << *s.find_by_order(2) << "\n";
}
```

Output:

```text
10 30
2 3
1
6
3 40
```

`order_of_key({a[i], INT_MAX})` counts earlier pairs whose value is at most `a[i]`, so `i` minus that count is the number of earlier values that are strictly greater. The six inversions of `3 1 2 5 4 2` are (3,1), (3,2), (3,2), (5,4), (5,2) and (4,2).

#### How it works

The tree is a red-black tree whose nodes also store their subtree size, kept up to date by the node-update policy on every rotation. `find_by_order(k)` compares k with the left subtree's size at each node to decide where to go; `order_of_key(x)` adds up left-subtree sizes along the search path. Both walk one path, so O(log n).

#### Pitfalls

- `find_by_order(k)` with `k >= size()` returns `end()`; dereferencing it is undefined behavior.
- `less_equal<int>` as the comparator makes a "multiset", but equal keys are then never "found", and `erase(x)` does nothing. Use pairs with a unique second member.
- Compile times and memory are higher than for `std::set`; for static data, sort and binary search instead.

Connects to: ordered containers, merge sort (inversion counting), Fenwick tree, self-balancing BSTs overview.

### questions
Q: What do find_by_order and order_of_key return?
A: find_by_order(k) returns an iterator to the element at position k in sorted order, counting from 0, or end() if k is too large. order_of_key(x) returns the number of elements strictly less than x. Both run in O(log n).

Q: How does the tree answer rank queries in logarithmic time?
A: Every node stores the size of its subtree, and the update policy keeps the sizes correct through inserts, erases and rotations. A query walks from the root, using left-subtree sizes to decide the direction and to add up how many elements lie to the left.

Q: How do you store duplicate values in the policy-based ordered set?
A: Store pairs of the value and a unique id, such as the insertion index, so every element is distinct while still ordering by value. Using less_equal as the comparator seems to work but breaks find, erase and lower_bound.

Q: What portable alternative gives the same counting queries?
A: A Fenwick tree (binary indexed tree) over coordinate-compressed values: adding 1 at a value's position and taking prefix sums gives the count of smaller elements, and binary lifting on the tree finds the k-th smallest, all in O(log n).
