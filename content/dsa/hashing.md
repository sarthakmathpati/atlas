---
topic: dsa.hashing
name: "Hashing"
subject: dsa
order: 4
prereqs: [dsa.arrays]
---

## dsa.hashing.hash-table-internals
name: "Hash table internals"
importance: must
scope: "hash functions, buckets, load factor, resizing"

### simple
A hash table turns a key into an array index with a hash function, so it can jump straight to where the value lives. It works like a coat check: your coat's ticket number tells the attendant exactly which hook to go to. When too many coats share hooks, the attendant gets a bigger rack and rehangs everything.

### interview
- A **hash function** maps a key to an integer; `index = hash(key) mod capacity` picks a **bucket** in an array.
- Insert, lookup and delete are **O(1) on average**, **O(n) worst case** when many keys collide.
- **Load factor** = items / buckets. When it passes a threshold (1.0 by default for C++ `unordered_map`, adjustable with `max_load_factor`), the table **resizes** (roughly doubles) and rehashes every key: O(n) once, O(1) amortized per insert.
- A good hash function is deterministic, fast, and spreads keys evenly. Equal keys must have equal hashes: a custom key needs `operator==` and a hash that agrees with it.
- Keys should be immutable: changing a key after insertion leaves it in the wrong bucket.
- Iteration order of `unordered_map` is unspecified and can change after a rehash; use `std::map` when you need sorted order.

### deep
#### Intuition

An array gives $O(1)$ access if you know the index. A hash table manufactures that index from the key: compute `hash(key)`, reduce it modulo the number of buckets, and look there. Collisions (two keys landing in the same bucket) are unavoidable, so each bucket must hold several entries (chaining) or the table must probe for another slot (open addressing).

#### The pieces

1. **Hash function**: turns a key into a number. For strings, a polynomial hash $h = \sum s_i \cdot p^{i}$ mixes every character; for integers, the identity or a bit mixer.
2. **Compression**: `hash mod capacity` (or `hash & (capacity - 1)` when capacity is a power of two, which is why such tables mix the high bits of the hash into the low ones first).
3. **Buckets**: an array of lists (chaining) or of single slots (open addressing).
4. **Load factor** $\alpha = n / m$: the average number of items per bucket. Expected chain length is $\alpha$, so keeping $\alpha$ bounded keeps operations $O(1)$.
5. **Resizing**: when $\alpha$ exceeds the threshold, allocate about twice as many buckets and reinsert every key (their indices change because the modulus changes).

#### Worked example

Capacity 4, hash = the integer itself, threshold 0.75. Insert 5, 9, 2, then 13.

| insert | bucket = key mod 4 | buckets | load |
|---|---|---|---|
| 5 | 1 | [ ], [5], [ ], [ ] | 0.25 |
| 9 | 1 | [ ], [5, 9], [ ], [ ] | 0.5 |
| 2 | 2 | [ ], [5, 9], [2], [ ] | 0.75 |
| 13 | 1 | would make 1.0: resize to 8 first | |

After resizing to 8 buckets: 5 → 5, 9 → 1, 2 → 2, 13 → 5. Buckets 1: [9], 2: [2], 5: [5, 13]. Load 0.5.

#### A minimal chained hash map

```cpp
class IntHashMap {
    vector<list<pair<int, int>>> buckets;
    int count = 0;
    size_t bucketOf(int key) const { return hash<int>{}(key) % buckets.size(); }
    void rehash() {
        vector<list<pair<int, int>>> old = std::move(buckets);
        buckets.assign(old.size() * 2, {});
        for (auto& chain : old)
            for (auto& [k, v] : chain) buckets[bucketOf(k)].push_back({k, v});
    }
public:
    IntHashMap() : buckets(8) {}
    void put(int key, int value) {
        for (auto& [k, v] : buckets[bucketOf(key)])
            if (k == key) { v = value; return; }       // update existing key
        buckets[bucketOf(key)].push_back({key, value});
        if (++count > 3 * (int)buckets.size() / 4) rehash();  // load factor 0.75
    }
    optional<int> get(int key) const {
        for (auto& [k, v] : buckets[bucketOf(key)])
            if (k == key) return v;
        return nullopt;
    }
};
```

#### Complexity

With a good hash and bounded load factor, each operation inspects $O(1 + \alpha)$ entries on average: $O(1)$. Resizing costs $O(n)$ but happens after $\Theta(n)$ inserts, so it is $O(1)$ amortized. The worst case, every key in one bucket, is $O(n)$ per operation.

#### Pitfalls

- Changing a key after insertion (for example through a pointer): it now belongs in another bucket. `unordered_map` keys are `const` for this reason.
- A custom hash that disagrees with `operator==`: equal keys land in different buckets and lookups miss.
- Iterating over a hash map and expecting sorted order.
- In C++, `map[key]` inserts a default value when the key is missing; use `find` or `count` to test membership.

Connects to: collision handling, amortized analysis, frequency counting, ordered maps.

### questions
Q: How does a hash table achieve O(1) average lookups?
A: It hashes the key to an integer and reduces it modulo the number of buckets to get an array index. With an even hash and a bounded load factor, each bucket holds O(1) entries on average, so a lookup inspects a constant number of items.

Q: What is the load factor and why does it trigger resizing?
A: The load factor is the number of stored items divided by the number of buckets, which equals the average bucket size. As it grows, chains get longer (or probes more frequent), so tables resize, usually doubling, when it passes a threshold such as 0.75, keeping operations O(1).

Q: Why is resizing O(1) amortized even though it rehashes every key?
A: Doubling means a resize of cost n happens only after about n/2 inserts since the last one. Spreading that cost over those inserts adds a constant per insert, the same argument as for dynamic arrays.

Q: What makes a good hash function?
A: It is deterministic, fast to compute, uses every part of the key, and spreads typical keys evenly across buckets. Equal keys must hash equally; unequal keys should rarely collide.

Q: Why must hash map keys be immutable?
A: The bucket is chosen from the key's hash at insertion time. If the key changes afterwards, its hash changes too, and lookups search the wrong bucket, so the entry is effectively lost.

## dsa.hashing.collision-handling
name: "Collision handling"
importance: must
prereqs: [dsa.hashing.hash-table-internals]
scope: "chaining vs open addressing, worst case O(n)"

### simple
A collision happens when two different keys land on the same spot in a hash table. With chaining, each spot holds a small list, like several coats hanging on one hook. With open addressing, the newcomer walks along to the next free hook instead.

### interview
- **Separate chaining**: each bucket is a list (or tree). Simple, tolerates load factors above 1, deletion is easy. Used by C++ `unordered_map`, whose bucket interface effectively requires it.
- **Open addressing**: all entries live in the array; on a collision, **probe** another slot: linear (`i + 1`), quadratic (`i + k²`), or double hashing (`i + k·h2(key)`). Used by fast tables such as Abseil's `flat_hash_map` and Boost's `unordered_flat_map`.
- Open addressing needs load factor well below 1 (often at most 0.5 to 0.7), is cache-friendly, and needs **tombstones** for deletion so probe chains stay intact.
- Linear probing suffers **primary clustering**: runs of filled slots grow and slow everything down.
- **Worst case O(n)**: many keys in one chain or one probe run. Some libraries turn long chains into balanced trees, giving O(log n) worst case per bucket.

### deep
#### Intuition

By the pigeonhole principle, if there are more possible keys than buckets, some keys must share a bucket. Even with fewer keys than buckets, the birthday paradox says collisions start early: with 365 buckets, 23 random keys already have a 50% chance of a collision. So every hash table needs a collision strategy.

#### Separate chaining

Each bucket stores a list of entries. Insert appends to the list (after checking for the key), lookup scans it. The expected list length is the load factor $\alpha$, so operations cost $O(1 + \alpha)$.

- Pros: simple; performance degrades gracefully as $\alpha$ grows past 1; deletion just removes from a list.
- Cons: pointer-heavy lists are cache-unfriendly; extra memory per entry.

#### Open addressing

The table is one array of slots. To insert key $k$, try slot $h(k)$; if taken, try the next slot in a **probe sequence** until a free one appears. Lookups follow the same sequence until they find the key or an empty slot.

| Probing | Sequence | Trade-off |
|---|---|---|
| Linear | $h, h+1, h+2, \dots$ | best cache use; primary clustering |
| Quadratic | $h, h+1, h+4, h+9, \dots$ | less clustering; may not visit every slot |
| Double hashing | $h, h + h_2, h + 2h_2, \dots$ | spreads well; second hash cost |

Expected probes for an unsuccessful search with linear probing are about $\frac{1}{2}\left(1 + \frac{1}{(1-\alpha)^2}\right)$: 2.5 at $\alpha = 0.5$, but 50.5 at $\alpha = 0.9$. That is why open-addressing tables resize early.

#### Deletion and tombstones

Simply emptying a slot breaks lookups for keys that probed past it. Mark the slot as a **tombstone** instead: lookups skip it, inserts may reuse it. Too many tombstones slow lookups down, so tables rebuild periodically.

#### Worked example: linear probing

Capacity 7, `h(k) = k mod 7`. Insert 10, 17, 3, 24.

| key | h | probes | slot |
|---|---|---|---|
| 10 | 3 | 3 | 3 |
| 17 | 3 | 3 taken, 4 | 4 |
| 3 | 3 | 3, 4 taken, 5 | 5 |
| 24 | 3 | 3, 4, 5 taken, 6 | 6 |

Now delete 17 by emptying slot 4. A lookup for 3 starts at slot 3 (10), then finds slot 4 empty and wrongly stops. With a tombstone in slot 4 the search continues to slot 5 and finds 3.

```cpp
class LinearProbingSet {
    enum State { EMPTY, FULL, DELETED };
    vector<int> keys;
    vector<State> state;
public:
    explicit LinearProbingSet(int capacity) : keys(capacity), state(capacity, EMPTY) {}
    bool contains(int key) const {
        int n = keys.size(), i = ((key % n) + n) % n;
        for (int step = 0; step < n && state[i] != EMPTY; step++, i = (i + 1) % n)
            if (state[i] == FULL && keys[i] == key) return true;  // tombstones are skipped
        return false;
    }
    bool insert(int key) {                  // no resizing, for brevity
        if (contains(key)) return false;
        int n = keys.size(), i = ((key % n) + n) % n;
        for (int step = 0; step < n; step++, i = (i + 1) % n)
            if (state[i] != FULL) { keys[i] = key; state[i] = FULL; return true; }
        return false;                       // table full
    }
    void erase(int key) {
        int n = keys.size(), i = ((key % n) + n) % n;
        for (int step = 0; step < n && state[i] != EMPTY; step++, i = (i + 1) % n)
            if (state[i] == FULL && keys[i] == key) { state[i] = DELETED; return; }
    }
};
```

#### Worst case

If an adversary (or bad luck) sends keys that all hash to one bucket, a chained table degenerates into a linked list and open addressing into a linear scan: $O(n)$ per operation, $O(n^2)$ for $n$ inserts. Defenses: randomized (seeded) hash functions, and tree-shaped buckets.

#### Variants

Robin Hood hashing (steal slots from entries closer to home to even out probe lengths), cuckoo hashing (two tables, $O(1)$ worst-case lookup), and Swiss tables (Google's SIMD-probed open addressing, behind `absl::flat_hash_map`).

Connects to: hash table internals, custom hashing and anti-hash tests, the birthday paradox.

### questions
Q: Compare separate chaining and open addressing.
A: Chaining stores colliding entries in a per-bucket list; it is simple, handles high load factors and deletes easily, but chasing list pointers is cache-unfriendly. Open addressing keeps every entry in the array and probes for a free slot; it is cache-friendly and compact, but needs a low load factor and tombstones for deletion.

Q: Why can't open addressing just clear a slot on deletion?
A: Other keys may have probed past that slot when they were inserted. Clearing it makes lookups stop early and miss them. A tombstone marks the slot as deleted, so searches continue past it while inserts can reuse it.

Q: What is primary clustering?
A: With linear probing, filled slots form contiguous runs. Any key hashing into a run lands at its end and makes it longer, so runs grow faster and faster, and probe counts rise sharply as the load factor approaches 1.

Q: When is a hash table lookup O(n), and how do libraries defend against it?
A: When many keys collide in one bucket, from a poor hash function or adversarial input. Hardened tables randomize their hash seed, and some turn long chains into balanced trees. In C++, a custom hash such as splitmix64 with a random seed protects unordered_map from crafted inputs.

Q: Why does the birthday paradox matter for hash tables?
A: It shows collisions appear long before a table is full: with m buckets, a collision becomes likely after about √m insertions. So collision handling is required even at low load factors.

## dsa.hashing.frequency-counting
name: "Frequency counting"
importance: must
pattern: true
prereqs: [dsa.hashing.hash-table-internals]
scope: "counting elements, anagram checks, grouping by a key"

### simple
Frequency counting means tallying how many times each item appears, like counting votes by making a mark next to each candidate's name. Once you have the tally, many questions become easy: which item is most common, do two words use the same letters, which items appear exactly once. Grouping works the same way, with a list for each key instead of a count.

### interview
- Build a map `item → count` in one pass: **O(n)** time, **O(k)** space for k distinct items.
- For a small fixed alphabet (lowercase letters), use an array of 26 ints: faster and O(1) space.
- **Anagram check**: equal count arrays (or equal sorted strings, O(n log n)).
- **Group by a key**: map `key → list`, where the key is a canonical form (sorted word, count tuple, normalized shape).
- Top k frequent: count, then use a heap (O(n log k)) or bucket sort by frequency (O(n)).
- In C++, `m[key]++` works because `[]` value-initializes a missing count to 0, and `m[key].push_back(x)` groups items because it creates an empty vector.

### deep
#### Intuition

Many problems ask about **how often** things occur, not where. Replacing a nested comparison ("is this equal to any other element?") by a count lookup turns $O(n^2)$ into $O(n)$. The key design decision is the **key**: what should be considered the same?

#### Worked example: group anagrams

Words: `eat tea tan ate nat bat`. Key = the letters sorted.

| word | key | groups after |
|---|---|---|
| eat | aet | aet: [eat] |
| tea | aet | aet: [eat, tea] |
| tan | ant | ant: [tan] |
| ate | aet | aet: [eat, tea, ate] |
| nat | ant | ant: [tan, nat] |
| bat | abt | abt: [bat] |

Result: `[eat, tea, ate]`, `[tan, nat]`, `[bat]`.

#### Code

```cpp
bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    array<int, 26> count{};                 // lowercase letters only
    for (char c : s) count[c - 'a']++;
    for (char c : t) if (--count[c - 'a'] < 0) return false;
    return true;
}

vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (const string& w : words) {
        string key = w;
        sort(key.begin(), key.end());       // canonical form: sorted letters
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& [key, list] : groups) out.push_back(std::move(list));
    return out;
}

// Top k frequent with bucket sort: frequencies are at most n.
vector<int> topKFrequent(const vector<int>& a, int k) {
    unordered_map<int, int> freq;
    for (int x : a) freq[x]++;
    vector<vector<int>> bucket(a.size() + 1);
    for (auto& [x, f] : freq) bucket[f].push_back(x);
    vector<int> out;
    for (int f = a.size(); f >= 1 && (int)out.size() < k; f--)
        for (int x : bucket[f]) if ((int)out.size() < k) out.push_back(x);
    return out;
}
```

#### Complexity

Counting is $O(n)$ time. Group anagrams with sorted keys is $O(n \cdot L \log L)$ for $n$ words of length $L$; with count tuples it is $O(n \cdot (L + 26))$. Space is $O(n \cdot L)$ for the groups.

#### Choosing the key

- Anagrams: sorted letters or letter counts.
- Same "shape" (isomorphic strings): the pattern of first occurrences, such as `paper → 0 1 0 2 3`.
- Shifted strings (`abc`, `bcd`): the differences between consecutive letters mod 26.
- Points on the same line through a point: the reduced slope `(dy/g, dx/g)` with a sign convention.

#### Edge cases and bugs

- Unicode or uppercase input breaks `c - 'a'` indexing; ask about the alphabet, or use a map.
- Reading a missing key with `map[key]` in C++ inserts it; that is fine for counting, not for membership tests.
- Comparing two count maps with `==` fails when one keeps zero entries and the other erased them; erase a key when its count drops to 0, or compare fixed-size arrays.

#### Variants

First unique character (count, then scan in order), ransom note (count the magazine, spend it on the note), sort characters by frequency, valid sudoku (sets per row, column and box), and sliding-window counts for substrings.

Connects to: hash table internals, window with counts, top k elements, anagrams and character counts.

### questions
Q: How do you check whether two strings are anagrams in O(n)?
A: Count the characters of one string and subtract the counts of the other; they are anagrams if every count ends at zero (and the lengths match). For lowercase letters an array of 26 counters is enough, so the extra space is O(1).

Q: How do you group anagrams, and what key would you use?
A: Map a canonical key to a list of words. The key can be the sorted letters (O(L log L) per word) or a tuple of 26 letter counts (O(L) per word). Words with the same key are anagrams of each other.

Q: How do you find the k most frequent elements faster than sorting?
A: Count frequencies with a hash map, then either keep a min-heap of size k (O(n log k)) or bucket the elements by frequency, since frequencies are between 1 and n, and read the buckets from the top (O(n)).

Q: When is an array better than a hash map for counting?
A: When the keys come from a small known range, such as 26 lowercase letters or values up to 10^6. Array indexing has no hashing cost, is cache-friendly, and uses fixed memory.

Q: How do you find the first non-repeating character in a string?
A: Count every character in one pass, then scan the string again in order and return the first character whose count is 1. That is O(n) time and O(alphabet) space.

### signals
- how many times each value or character appears
- anagrams, permutations of letters, or "same characters in a different order"
- grouping items that share a canonical form
- most frequent, least frequent, unique or duplicated elements
- comparing two collections as multisets

### template
```cpp
// Frequency counting and grouping by a canonical key.
template <class T, class KeyFn>
unordered_map<string, vector<T>> groupBy(const vector<T>& items, KeyFn keyOf) {
    unordered_map<string, vector<T>> groups;
    for (const T& item : items) groups[keyOf(item)].push_back(item);  // same key, same group
    return groups;
}

unordered_map<int, int> countAll(const vector<int>& a) {
    unordered_map<int, int> freq;
    for (int x : a) freq[x]++;              // missing keys start at 0
    return freq;                            // then: max count, count == 1, compare maps...
}
```

## dsa.hashing.complement-lookup
name: "Complement lookup"
importance: must
pattern: true
prereqs: [dsa.hashing.hash-table-internals]
scope: "two-sum style \"have I seen target minus x?\""

### simple
Complement lookup finds pairs by remembering what you have already seen. At a party, if you need a partner whose age adds up with yours to 50, you ask whether anyone aged 50 minus your age has arrived. A hash map is the guest list that answers that question instantly.

### interview
- For each `x`, check whether `target - x` is already in a hash map; if not, store `x` (with its index). **O(n)** time, **O(n)** space.
- Look up **before** inserting so an element never pairs with itself.
- Sorted input: two pointers from both ends give O(1) extra space instead.
- Generalizes to any "partner" relation: `x + y = t`, `y - x = k`, `x ^ y = t`, prefix differences (subarray sum K).
- Count pairs by storing counts instead of indices; watch for duplicates and `k = 0` in difference problems.

### deep
#### Intuition

The brute force checks every pair: $O(n^2)$. But for each $x$ there is exactly one partner value $y = t - x$ that completes the pair, so the question becomes "have I seen $y$ before?", a single hash lookup. Walking left to right and remembering what you have seen covers every pair once, when its second element arrives.

#### Worked example

`nums = [2, 7, 11, 15]`, target 9.

| i | x | need 9 − x | in map? | map after |
|---|---|---|---|---|
| 0 | 2 | 7 | no | {2: 0} |
| 1 | 7 | 2 | yes, index 0 | answer (0, 1) |

#### Code

```cpp
vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> indexOf;             // value -> index where it was seen
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = indexOf.find(target - nums[i]);
        if (it != indexOf.end()) return {it->second, i};
        indexOf[nums[i]] = i;                    // insert after the lookup
    }
    return {};
}

// Count pairs (i < j) whose values differ by exactly k (|nums[i] - nums[j]| == k).
long long countPairsWithDiff(const vector<int>& nums, int k) {
    unordered_map<long long, long long> seen;
    long long pairs = 0;
    for (int x : nums) {
        auto a = seen.find((long long)x - k);
        if (a != seen.end()) pairs += a->second;
        if (k != 0) {                             // x + k is a different partner only if k != 0
            auto b = seen.find((long long)x + k);
            if (b != seen.end()) pairs += b->second;
        }
        seen[x]++;
    }
    return pairs;
}
```

Time $O(n)$ average, space $O(n)$.

#### Hash map or two pointers?

| | Hash map | Sort + two pointers |
|---|---|---|
| Time | $O(n)$ average | $O(n \log n)$ (O(n) if already sorted) |
| Extra space | $O(n)$ | $O(1)$ (plus sort) |
| Returns original indices | yes | only if you sort (value, index) pairs |
| Extends to 3Sum and kSum | awkward with duplicates | natural |

#### Edge cases and bugs

- **Pairing an element with itself**: `[3]` with target 6 must fail; look up first, then insert.
- **Duplicates**: `[3, 3]` with target 6 works with lookup-then-insert, because the first 3 is in the map when the second arrives.
- **k = 0 in difference problems**: `x - k` and `x + k` are the same value; counting both doubles the pairs.
- **Overflow**: `target - x` with extreme ints; use 64-bit.

#### Variants

- Two sum on a stream (data structure design): store counts, answer `find(t)` by scanning distinct values.
- Two sum in a BST: inorder traversal plus two pointers, or a set during DFS.
- Pairs whose sum is divisible by k: count remainders, pair `r` with `(k - r) % k`.
- Subarray sum equals K: complement lookup on prefix sums.
- Four sum count across four arrays: count sums of two arrays, look up the negated sums of the other two ($O(n^2)$).

Connects to: prefix sum with hash map, opposite-ends pointers, kSum.

### questions
Q: How do you solve two sum in O(n)?
A: Walk the array once with a hash map from value to index. For each x, check whether target − x is already in the map; if so, return both indices, otherwise store x. Each element is looked up and inserted once, so it is O(n) average time and O(n) space.

Q: Why check the map before inserting the current element?
A: So an element can't pair with itself. If target is 6 and x is 3, inserting first would find the same 3. Checking first still handles two different 3s correctly, because the earlier one is already in the map.

Q: When would you prefer two pointers over a hash map for pair sums?
A: When the array is already sorted or you need O(1) extra space, or when extending to 3Sum and 4Sum where skipping duplicates on sorted data is easier. The hash map is better when you must return original indices of unsorted input.

Q: How do you count pairs with a given difference k without double counting?
A: For each x, add the counts of x − k and x + k seen so far, then record x. When k is 0 both lookups are the same value, so only add it once.

Q: How is "subarray sum equals K" a complement lookup?
A: A subarray sum is a difference of two prefix sums. For the current prefix cur, you need an earlier prefix equal to cur − K, which is the complement, so you count earlier prefixes in a hash map.

### signals
- find two elements that add up to (or differ by) a target
- "have I seen the value that completes this pair?"
- unsorted input where the original indices must be returned
- pair counts with a sum, difference, XOR or remainder condition
- matching items across two lists (sum of two arrays equals a target)

### template
```cpp
// Complement lookup: for each x, ask whether its partner was seen earlier.
vector<int> findPair(const vector<int>& a, long long target) {
    unordered_map<long long, int> seen;          // value -> index (or count)
    for (int i = 0; i < (int)a.size(); i++) {
        long long partner = target - a[i];       // or a[i] - k, a[i] ^ t, (k - r) % k ...
        auto it = seen.find(partner);
        if (it != seen.end()) return {it->second, i};
        seen[a[i]] = i;                          // record after looking up
    }
    return {};
}
```

## dsa.hashing.hash-sets-for-membership
name: "Hash sets for membership"
importance: important
scope: "deduplication, longest consecutive sequence"

### simple
A hash set answers one question fast: "have I seen this before?" It is like a guest list at a door where the bouncer can check any name instantly. That makes it the tool for removing duplicates, spotting repeats, and finding runs of consecutive numbers.

### interview
- `insert`, `contains`, `erase` in **O(1)** average; stores keys only, no values.
- **Deduplication**: insert everything, or check `contains` before adding. Contains duplicate: return true when an insert finds the key already present.
- **Longest consecutive sequence** in O(n): put all values in a set; start counting only at values `x` where `x - 1` is **not** in the set, then walk `x + 1, x + 2, …`. Each value is visited at most twice.
- Set operations: intersection by probing the smaller set in the larger (O(min(n, m))).
- For small bounded values, a boolean array or bitset is faster than a hash set.

### questions
Q: How do you find the length of the longest consecutive sequence in an unsorted array in O(n)?
A: Put every value in a hash set. For each value x that has no x − 1 in the set, it starts a run, so count upward x + 1, x + 2, … while they exist. Each value is part of exactly one run and is visited at most twice, which gives O(n) average time.

Q: Why does the longest consecutive sequence solution only start counting at x when x − 1 is missing?
A: Starting from every value would recount each run from every member, which is O(n²) for one long run. Starting only at run beginnings means each run is walked once.

Q: How do you compute the intersection of two arrays efficiently?
A: Put the smaller array into a hash set, then scan the larger one and keep the elements found in the set (removing them to avoid repeats if the result should be distinct). That is O(n + m) time and O(min(n, m)) space.

Q: When would you use a bitset instead of a hash set?
A: When keys are small non-negative integers with a known bound, such as values up to 10^6. A bitset uses one bit per possible value, has no hashing cost, and supports fast bulk operations such as AND and OR.

## dsa.hashing.ordered-maps-vs-hash-maps
name: "Ordered maps vs hash maps"
importance: important
scope: "when you need sorted keys, floor and ceiling queries"

### simple
A hash map finds a key instantly but keeps keys in no useful order. An ordered map keeps keys sorted, like a dictionary on a shelf, so it can answer "what is the nearest word before this one?" It pays a little for that: each operation takes log n time instead of constant time.

### interview
- Hash map (`unordered_map`): O(1) average operations, no order.
- Ordered map (`std::map`): balanced BST (red-black tree), **O(log n)** worst case per operation, keys in sorted order.
- Ordered maps answer **floor/ceiling** and range queries: C++ `lower_bound` (first key ≥ x), `upper_bound` (first key > x), `prev(it)` for floor.
- Use an ordered map for: sorted iteration, nearest key, smallest or largest key, sliding windows needing min and max with deletions (multiset), calendars and intervals.
- `std::set` and `std::multiset` are the key-only versions; a multiset keeps duplicates, and erasing one copy needs `s.erase(s.find(x))`.

### questions
Q: When would you choose a TreeMap or std::map over a hash map?
A: When you need keys in sorted order or nearest-key queries: the smallest key, the largest key, the first key at least x, or all keys in a range. A hash map can't do these without scanning everything.

Q: What are lower_bound and upper_bound on a std::map?
A: lower_bound(x) returns an iterator to the first key not less than x (the ceiling), and upper_bound(x) returns the first key strictly greater than x. The floor, the largest key at most x, is the element before upper_bound(x), if there is one.

Q: Why are ordered map operations O(log n)?
A: They are implemented as self-balancing binary search trees, usually red-black trees, whose height stays O(log n). Every search, insert or delete walks one root-to-leaf path.

Q: How would you keep the minimum and maximum of a sliding window that supports removing arbitrary elements?
A: Use an ordered multiset (std::multiset or a TreeMap of counts). Insert new elements, erase one copy of the element leaving the window, and read the first and last keys, each in O(log n).

## dsa.hashing.custom-hashing-and-anti-hash-tests
name: "Custom hashing and anti-hash tests"
importance: advanced
prereqs: [dsa.hashing.collision-handling]
scope: "hashing pairs, why a hash map can be attacked"

### simple
Some keys, such as pairs of numbers, need you to tell the hash map how to turn them into a hash. A predictable hash function can also be attacked: someone who knows it can pick keys that all land in the same bucket, like sending every letter to one mailbox. Mixing in a random seed makes that trick impossible.

### interview
- C++ `unordered_map` has no hash for `pair` or `vector`; supply a hasher struct, or encode the pair into one 64-bit value (`(long long)a << 32 | (unsigned)b`).
- Combining hashes: avoid `h1 ^ h2` (symmetric: `(a, b)` and `(b, a)` collide, and `(x, x)` gives 0); use a multiplier or a mixing function.
- **Anti-hash tests**: libstdc++ reduces integer hashes (the identity) modulo a prime bucket count; inputs built from multiples of that prime make every key collide, turning O(1) into O(n) and a solution into O(n²).
- Defense: a randomized, well-mixed hash such as splitmix64 seeded from the clock, or switch to an ordered map.
- `std::hash` is not specialized for `pair` or `tuple` either, so every composite key needs one of these approaches.

### questions
Q: How do you use a pair as a key in C++'s unordered_map?
A: Provide a hash functor that combines both fields, for example by mixing first * a large odd constant with second, or pack the pair into one 64-bit integer when both fit in 32 bits. std::map works with pairs directly because pairs are comparable.

Q: Why is combining two hashes with XOR a bad idea?
A: XOR is symmetric, so (a, b) and (b, a) get the same hash, and any pair (x, x) hashes to 0. Structured data such as grid coordinates then collides heavily. Multiply one hash by a constant or use a proper mixing function before combining.

Q: What is an anti-hash test?
A: An input crafted so that all keys fall into the same bucket of a known, deterministic hash function, such as integers that are multiples of the bucket count used by libstdc++. Each operation then scans a long chain and the whole run becomes O(n²).

Q: How do you protect a solution against anti-hash inputs?
A: Use a hash with good bit mixing (splitmix64) plus a random seed chosen at runtime, so an attacker can't predict collisions. Alternatively use an ordered map, which is O(log n) worst case regardless of input.
