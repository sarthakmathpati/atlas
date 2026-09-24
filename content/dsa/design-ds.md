---
topic: dsa.design-ds
name: "Designing data structures"
subject: dsa
order: 37
prereqs: [dsa.hashing, dsa.linked-lists, dsa.heaps]
---

## dsa.design-ds.lru-cache
name: "LRU cache"
importance: must
prereqs: [dsa.linked-lists.doubly-linked-list-with-hash-map]
scope: "hash map plus doubly linked list, O(1) get and put"

### simple
An LRU cache keeps a limited number of items and, when it's full, throws out the one that was used least recently. Think of a small desk with room for five books: every time you use a book you put it on top of the pile, and when a new book arrives you remove the one at the bottom. A hash map finds any book instantly, and a doubly linked list keeps the pile's order.

### interview
- Operations `get(key)` and `put(key, value)`, both **O(1)**; capacity fixed.
- **Hash map** key → list node; **doubly linked list** ordered from most to least recently used.
- `get`: if present, move the node to the front and return its value. `put`: update and move to the front, or insert at the front; if over capacity, remove the **back** node and erase its key from the map.
- Use **sentinel head and tail** nodes; store the **key** in each node so eviction can erase the map entry.
- C++: `list<pair<K,V>>` plus `unordered_map<K, list::iterator>` with `splice`. Java: `LinkedHashMap` with access order and `removeEldestEntry`. Python: `OrderedDict` with `move_to_end` and `popitem(last=False)`.
- Follow-ups: thread safety (a lock, or sharded caches), TTL expiry, LFU instead of LRU.

### deep
#### Intuition

You need three things fast: find a key (hash map), know which key is least recently used (an ordered structure), and move any key to "most recent" when it's touched. A doubly linked list gives O(1) removal of a known node and O(1) insertion at either end, and the hash map gives you the node for a key in O(1). Together every operation is constant time.

#### Worked example: capacity 2

| operation | list (most recent first) | result |
|---|---|---|
| put(1, A) | 1 | |
| put(2, B) | 2 1 | |
| get(1) | 1 2 | A |
| put(3, C) | 3 1 (evict 2, the least recent) | |
| get(2) | 3 1 | miss (−1) |
| put(4, D) | 4 3 (evict 1) | |
| get(1) | 4 3 | miss |
| get(3) | 3 4 | C |

#### Code

```cpp
class LRUCache {
    int capacity;
    list<pair<int, int>> order;                                   // front = most recent
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    explicit LRUCache(int cap) : capacity(cap) {}
    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        order.splice(order.begin(), order, it->second);          // move to front, O(1)
        return it->second->second;
    }
    void put(int key, int value) {
        if (capacity <= 0) return;                                // nothing can be stored
        auto it = where.find(key);
        if (it != where.end()) {
            it->second->second = value;
            order.splice(order.begin(), order, it->second);
            return;
        }
        if ((int)order.size() == capacity) {                      // evict the least recent
            where.erase(order.back().first);
            order.pop_back();
        }
        order.emplace_front(key, value);
        where[key] = order.begin();
    }
};
```

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key=0, value=0):
        self.key, self.value, self.prev, self.next = key, value, None, None

class LRUCacheManual:
    """Explicit doubly linked list with sentinels (what interviewers usually want to see)."""
    def __init__(self, capacity):
        self.capacity, self.map = capacity, {}
        self.head, self.tail = Node(), Node()          # head.next = most recent
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node):
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return -1
        self._remove(node)
        self._add_front(node)
        return node.value

    def put(self, key, value):
        if self.capacity <= 0:
            return
        if key in self.map:
            node = self.map[key]
            node.value = value
            self._remove(node)
            self._add_front(node)
            return
        if len(self.map) == self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]                      # the node stores its key for this
        node = Node(key, value)
        self.map[key] = node
        self._add_front(node)
```

#### Complexity

`get` and `put` are $O(1)$ average (hash map operations plus constant pointer updates). Space $O(\text{capacity})$.

#### Why each piece is there
The node keeps its own key because eviction starts from the list, not the map: you find the least recent node at the tail and then need its key to delete the map entry. The sentinels remove every special case for an empty list or for the first and last node, so `_remove` and `_add_front` are two lines each. A singly linked list would not do, because removing a node from the middle needs its predecessor, and finding it would take linear time.

#### Library shortcuts, and when to avoid them
Python's `OrderedDict` (with `move_to_end` and `popitem(last=False)`) and Java's `LinkedHashMap` (with access order and `removeEldestEntry`) already are a hash map threaded through a linked list. They are fine to mention, and fine in production code, but most interviewers ask you to build the list yourself, so write the manual version unless told otherwise.

#### Edge cases and bugs

- `put` on an existing key must update the value **and** refresh recency, without evicting.
- Capacity 0 or 1.
- Forgetting to erase the evicted key from the map (memory leak and wrong hits).
- In C++, storing iterators into a `vector` would be invalidated by reallocation; `list` iterators stay valid after `splice`.

#### Variants

- LFU cache (evict the least frequently used, ties by recency).
- LRU with time-to-live (expire entries after t seconds; check on access or with a heap).
- Concurrent LRU caches (lock striping), caches in system design (Redis eviction policies, CDN caches).

Connects to: doubly linked list with hash map, LFU cache, caching (system design), hash table internals.

### questions
Q: How do you implement an LRU cache with O(1) get and put?
A: Combine a hash map from key to node with a doubly linked list ordered by recency. get looks up the node and moves it to the front; put updates or inserts at the front and, when over capacity, removes the node at the back and deletes its key from the map. All steps are O(1).

Q: Why a doubly linked list and not a singly linked list or an array?
A: Moving an accessed node to the front requires removing it from the middle. A doubly linked list removes a known node in O(1) using its prev pointer; a singly linked list would need O(n) to find the predecessor, and an array would need O(n) shifting.

Q: Why does each list node store its key?
A: Eviction removes the tail node, and the map entry for that node must be deleted too. The node's stored key tells you which entry to erase.

Q: What happens on put for a key that's already in the cache?
A: Update its value and move it to the front as most recently used. Nothing is evicted, since the number of keys doesn't change.

Q: How would you make an LRU cache thread-safe?
A: The simplest way is a single mutex around get and put, since both modify the list. For higher throughput, shard the cache by key hash into several independent LRU caches, each with its own lock.

## dsa.design-ds.lfu-cache
name: "LFU cache"
importance: important
prereqs: [dsa.design-ds.lru-cache]
scope: "frequency buckets"

### simple
An LFU cache evicts the item used the fewest times, and among ties, the one used least recently. It keeps items grouped by how often they were used, like shelves labeled "used once", "used twice" and so on, each ordered by recency. Remembering the lowest non-empty shelf makes finding the item to evict instant.

### interview
- Maps: `key → (value, freq)` and `freq → list of keys` (most recent first), plus `minFreq`.
- `get`: move the key from list `freq` to list `freq + 1`; if list `freq` became empty and `freq == minFreq`, increment `minFreq`.
- `put` of a new key when full: evict the **least recent** key in list `minFreq`; insert the new key with freq 1 and set `minFreq = 1`.
- All operations **O(1)** (hash maps plus linked lists, with iterators stored per key).
- Compared with LRU: LFU keeps long-term popular items; it can hold stale items that were popular long ago (aging or decay fixes that).

### questions
Q: How does an LFU cache find the item to evict in O(1)?
A: It groups keys into lists by use count and tracks the smallest count that has any keys, minFreq. The victim is the least recently used key in the minFreq list, found at that list's end in O(1).

Q: How is minFreq maintained?
A: When a key's count increases from f to f + 1 and the list for f becomes empty, minFreq becomes f + 1 if it was f. When a new key is inserted, minFreq resets to 1, since the new key has been used once.

Q: How are ties between keys with the same frequency broken?
A: By recency: each frequency list is ordered from most to least recently used, so eviction takes the least recently used key among those with the minimum frequency.

Q: When is LFU better than LRU, and what is its weakness?
A: LFU keeps items that are popular over the long term even if they weren't used just now, which suits stable hot sets. Its weakness is that items that were once very popular can stay forever even after they stop being used, unless counts decay over time.

## dsa.design-ds.insert-delete-and-getrandom-in-o-1
name: "Insert, delete and getRandom in O(1)"
importance: important
scope: "array plus index map"

### simple
To pick a random item from a set quickly, the items must sit in an array so you can choose a random position. To also delete in constant time, you move the last item into the deleted item's slot and shrink the array, like filling a gap in a row of chairs by moving the last person into it. A hash map remembers where each item sits so you can find it instantly.

### interview
- `vector<int> vals` + `unordered_map<int, int> index` (value → position).
- **Insert**: if absent, append and record the index. **Remove**: swap the element with the last one, update the moved element's index, pop back, erase from the map. **getRandom**: a random index into `vals`.
- All **O(1)** average.
- **With duplicates**: map value → set of indices; on removal, move the last element and fix its index set.
- The swap-with-last trick works because order in the array doesn't matter.

### questions
Q: How do you support insert, remove and getRandom in O(1)?
A: Store values in an array for uniform random access and a hash map from value to its array index. To remove, copy the last element into the removed element's slot, update its index in the map, pop the last slot and erase the removed value from the map.

Q: Why is swapping with the last element necessary for O(1) removal?
A: Removing from the middle of an array would shift everything after it, which is O(n). Moving the last element into the hole keeps the array contiguous with a single copy, and the order of elements doesn't matter for a set.

Q: How does the design change when duplicates are allowed?
A: The map stores, for each value, the set of all indices where it appears. Removal takes any one index from the set, moves the last element there, and updates the moved element's index set by removing the old last index and adding the new one.

Q: Why can't a hash set alone support getRandom in O(1)?
A: A hash set has no indexable positions, so picking a uniformly random element would require iterating over it or over its buckets, which is O(n) or not uniform. The array provides the random access.

## dsa.design-ds.augmented-stacks
name: "Augmented stacks"
importance: important
scope: "min stack, maximum frequency stack"

### simple
An augmented stack stores a little extra information with each element so it can answer an extra question instantly. A min stack remembers, at every height, the smallest value in the stack so far, so the current minimum is always at hand. A frequency stack groups elements by how many times they were pushed, so it can pop the most frequent one.

### interview
- **Min stack**: push pairs `(value, min(value, previous min))`; `getMin` reads the top's second field. All O(1).
- Space-saving variant: a second stack pushed only when the new value ≤ current min (popped when equal).
- **Maximum frequency stack**: `freq[x]` and `group[f]` = stack of elements pushed when their frequency reached f; `maxFreq`. Push: increment freq, push onto `group[freq]`. Pop: pop from `group[maxFreq]`, decrement its freq, decrease `maxFreq` if the group empties. O(1).
- Ties in the frequency stack are broken by recency automatically (each group is a stack).
- Related: max stack with popMax (needs an ordered structure, O(log n)).

### questions
Q: How does a min stack return the minimum in O(1)?
A: Each entry stores the value together with the minimum of the stack up to and including that entry. The current minimum is the top entry's stored minimum, and popping automatically restores the previous minimum.

Q: How does a maximum frequency stack pop the most frequent element, breaking ties by recency?
A: It keeps a count per value and a stack for each frequency level, where each push appends the value to the stack for its new count. Popping takes from the stack at the maximum frequency, which holds the most recent element at that frequency, then decrements its count and lowers the maximum if that stack is empty.

Q: Why does the frequency stack keep a value in several level stacks at once?
A: A value pushed three times appears in the stacks for frequencies 1, 2 and 3, one entry for each time it reached that count. That way, after popping it from level 3, it's still correctly present at level 2 without any extra work.

Q: How can a min stack save space?
A: Keep a second stack of minimums and push onto it only when the new value is less than or equal to the current minimum; when popping a value equal to the current minimum, pop the minimum stack too. The equality case matters for duplicates.

## dsa.design-ds.time-based-key-value-store
name: "Time-based key-value store"
importance: important
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "sorted timestamps per key with binary search"

### simple
A time-based key-value store keeps every value a key has had, stamped with the time it was set. Asking for a key at some time returns the value that was current then: the latest one set at or before that moment. Because values arrive in time order, a binary search over each key's history finds the answer quickly.

### interview
- `set(key, value, t)`: append `(t, value)` to `history[key]`; timestamps are usually strictly increasing per key, so the list stays sorted.
- `get(key, t)`: binary search for the **last** entry with timestamp ≤ t (`upper_bound` − 1); return "" if none.
- `set` O(1) amortized, `get` **O(log h)** for h entries of that key.
- If timestamps can arrive out of order, use an ordered map per key (`std::map`, `TreeMap.floorEntry`).
- Related: snapshot arrays, versioned configuration, database MVCC (multi-version concurrency control).

### questions
Q: How do you design a key-value store that can return a key's value at any past time?
A: Keep, for each key, a list of (timestamp, value) pairs in increasing time order. For get(key, t), binary search for the last pair whose timestamp is at most t and return its value, or an empty result if every timestamp is later.

Q: What are the complexities of set and get?
A: set appends to the key's list in O(1) amortized, assuming timestamps arrive in increasing order. get is O(log h), where h is the number of versions stored for that key.

Q: What changes if set calls can arrive with timestamps out of order?
A: The per-key list would no longer be sorted, so use an ordered map from timestamp to value per key. Then set is O(log h) and get uses the map's floor lookup, also O(log h).

Q: Which binary search gives "the latest timestamp at most t"?
A: Find the first timestamp strictly greater than t (upper_bound) and step back one position. If upper_bound returns the start of the list, no timestamp is at most t.

## dsa.design-ds.iterator-design
name: "Iterator design"
importance: important
scope: "peeking iterator, flatten nested list iterator"

### simple
An iterator hands out elements one at a time through next() and hasNext(), hiding how the data is stored. Designing one means keeping just enough state to know what comes next, like a bookmark in a book. A peeking iterator adds the ability to look at the next element without taking it, and a flattening iterator walks through lists nested inside lists.

### interview
- **Peeking iterator**: cache the next element (`hasPeeked`, `peekedValue`); `peek` fills the cache; `next` returns the cache if filled.
- **Flatten nested list**: a stack of (list, index) positions, or of iterators; `hasNext` advances until the top is an integer (skipping empty lists). Lazy: O(1) amortized per element, O(depth) memory.
- Eager alternative: flatten everything in the constructor (simpler, O(n) memory up front).
- **Zigzag iterator** over k lists: a queue of (list, index), rotate.
- **Iterator for a BST**: stack of the left spine (see inorder tricks).
- Contract: `next` is valid only when `hasNext` is true; `hasNext` must not consume elements.

### questions
Q: How do you implement peek() on top of an iterator that only has next() and hasNext()?
A: Keep a one-element cache. peek() fetches the next element into the cache if it's empty and returns it; next() returns and clears the cache if it's filled, otherwise delegates to the underlying iterator; hasNext() is true if the cache is filled or the underlying iterator has more.

Q: How do you flatten a nested list lazily?
A: Keep a stack of positions in the lists being traversed. hasNext() advances the top position: when it points to a nested list, push that list; when a list is exhausted, pop it; stop when the top points to an integer. next() then returns that integer. Each element is visited once, O(depth) memory.

Q: Why should hasNext() do the work of finding the next integer in the flattening iterator?
A: Nested lists can be empty, like [[]], so knowing whether another integer exists requires skipping empty lists. Doing that in hasNext() makes it answer correctly, and next() can then simply return the integer found.

Q: What is the trade-off between eager and lazy iterators?
A: An eager iterator precomputes everything into a list in the constructor: simple code, but O(n) memory and upfront time. A lazy iterator computes elements on demand, using little memory and starting immediately, at the cost of more complex state.

## dsa.design-ds.circular-queue-and-deque-design
name: "Circular queue and deque design"
importance: important
scope: "fixed-size ring buffer"

### simple
A circular queue stores items in a fixed-size array whose end wraps around to the beginning, like seats around a round table. A front index and a count tell you where items are, so adding and removing never requires shifting anything. A circular deque works the same way but lets you add and remove at both ends.

### interview
- Fixed array of capacity k, `head` index and `count` (or head and tail with one slot left empty).
- Enqueue at `(head + count) % k`; dequeue by advancing `head = (head + 1) % k`; rear element at `(head + count − 1) % k`.
- **Deque**: insert at the front with `head = (head − 1 + k) % k` (avoid negative modulo); delete at the back by decrementing count.
- `isFull` = `count == k`; `isEmpty` = `count == 0`. All operations O(1).
- Uses: bounded buffers (producer-consumer), sliding windows, rate limiters, audio and network buffers.

### questions
Q: How does a circular queue avoid shifting elements?
A: It keeps a head index and a count in a fixed array and wraps indices with modulo capacity. Enqueue writes at (head + count) mod capacity, and dequeue just advances head, so each operation is O(1).

Q: How do you distinguish a full buffer from an empty one?
A: Track the number of elements explicitly, so full means count equals capacity and empty means count is 0. Alternatively, use head and tail indices and leave one slot unused, so full means the next position after tail is head.

Q: How do you insert at the front of a circular deque?
A: Move head back one position with (head − 1 + capacity) mod capacity, write the element there and increase the count. Adding capacity before the modulo avoids a negative index in languages whose % can return negatives.

Q: Where are ring buffers used in practice?
A: Anywhere a fixed amount of recent data is kept: bounded producer-consumer queues between threads, logging the last N events, network and audio buffers, and sliding-window counters in rate limiters.

## dsa.design-ds.versioned-data
name: "Versioned data"
importance: advanced
scope: "snapshot array with per-index history"

### simple
Versioned data remembers old versions without copying everything each time something changes. A snapshot array stores, for each position, a short history of (version, value) changes, like a notebook where each line records when a value changed. Reading an old version means finding the last change at or before that version.

### interview
- **Snapshot array**: `history[i]` = list of `(snapId, value)`; `set` writes to the current snap (overwriting if the last entry has the same snap id); `snap` increments the counter and returns the previous id; `get(i, snap)` binary searches for the last entry with id ≤ snap.
- Memory O(number of sets), not O(n × snaps); `set` O(1), `get` O(log changes of i).
- Same idea as the time-based key-value store.
- Generalizations: **persistent data structures** (path copying in trees: O(log n) new nodes per update), copy-on-write.
- Real systems: MVCC in databases, Git (content-addressed snapshots), immutable collections.

### questions
Q: How do you implement a snapshot array efficiently?
A: Store, for each index, a list of (snapshot id, value) entries recorded when the index is set. snap() just increments a counter. get(index, id) binary searches that index's list for the last entry with snapshot id at most id, defaulting to 0 if none.

Q: Why not copy the whole array on each snap?
A: Copying costs O(n) time and memory per snapshot, which is prohibitive with many snapshots of a large array. Recording only changes costs memory proportional to the number of set calls.

Q: What should set do if called several times before the next snap?
A: Only the last value before the snapshot matters, so if the index's latest entry already has the current snapshot id, overwrite it instead of appending. This keeps each list sorted by id without duplicates.

Q: What is a persistent data structure?
A: One where updates create a new version while keeping old versions accessible and unchanged. Trees achieve this by path copying: an update copies only the nodes on the path from the root to the change, sharing everything else, so each version costs O(log n) extra memory.

## dsa.design-ds.all-o-1-data-structure
name: "All O(1) data structure"
importance: advanced
prereqs: [dsa.design-ds.lfu-cache]
scope: "count buckets in a doubly linked list"

### simple
This structure counts keys and must, all in constant time, increase or decrease a key's count and report a key with the largest and the smallest count. The trick is to keep "count buckets" in a doubly linked list sorted by count, each bucket holding the keys that currently have that count. Moving a key up or down by one only ever moves it to a neighboring bucket.

### interview
- Doubly linked list of buckets `(count, set of keys)`, sorted by count; map key → its bucket.
- **inc(key)**: move the key to the next bucket (count + 1), creating it right after the current bucket if missing; delete the old bucket if empty.
- **dec(key)**: move to the previous bucket (count − 1) or remove the key when its count hits 0.
- **getMaxKey**: any key in the tail bucket; **getMinKey**: any key in the head bucket.
- All O(1) because counts change by exactly 1, so the target bucket is always adjacent.
- Same bucket idea as the LFU cache.

### questions
Q: How can increment, decrement, getMax and getMin all be O(1)?
A: Keep buckets of keys grouped by count in a doubly linked list sorted by count, and a map from each key to its bucket. Since counts change by one, a key always moves to an adjacent bucket, which is found or created next to its current one in O(1). The extremes are the list's first and last buckets.

Q: Why must counts change by exactly one for this design to work?
A: The new bucket for a key must be adjacent to the old one so it can be found without searching. If counts could jump by arbitrary amounts, finding the right position in the sorted bucket list would take more than O(1).

Q: What cleanup is needed after moving a key?
A: If the old bucket becomes empty, unlink it from the list so the first and last buckets always contain keys, keeping getMin and getMax correct.

Q: How does this relate to the LFU cache?
A: Both group keys into buckets by count and move keys between adjacent buckets as counts change. LFU additionally orders keys within a bucket by recency to break ties when evicting.
