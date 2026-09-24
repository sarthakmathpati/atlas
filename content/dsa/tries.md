---
topic: dsa.tries
name: "Tries"
subject: dsa
order: 21
prereqs: [dsa.trees, dsa.strings]
---

## dsa.tries.trie-structure
name: "Trie structure"
importance: must
scope: "insert, search, startsWith, memory trade-offs"

### simple
A trie stores words letter by letter in a tree, so words with the same beginning share the same path. It is like a phone's contact search: type "Sa" and you're already on the branch holding Sam, Sara and Sanjay. Looking up a word takes as many steps as it has letters, no matter how many words are stored.

### interview
- Each node has up to σ children (26 for lowercase) and an **end-of-word** flag (or a count).
- **Insert**, **search** (path exists and ends at a word), **startsWith** (path exists): all **O(L)** for a word of length L.
- Children as a **fixed array** (fast, more memory: 26 pointers per node) or a **hash map** (compact for large alphabets, slower).
- Memory: up to total characters × σ pointers; compressed tries (radix trees) merge single-child chains.
- Beats a hash set when you need **prefix** queries, autocomplete, or letter-by-letter matching with DFS (word search II, wildcards).
- Deleting a word: unset the flag, optionally prune nodes with no children and no flag.

### deep
#### Intuition

A hash set can answer "is this exact word stored?" but not "does any stored word start with 'pre'?" without scanning. A trie organizes words by their prefixes, so every prefix corresponds to one node. Answering any prefix query is walking down one edge per character.

#### Worked example: insert "car", "cat", "cart", "dog"

```
root
 ├─ c
 │   └─ a
 │       ├─ r*        (car)
 │       │   └─ t*    (cart)
 │       └─ t*        (cat)
 └─ d
     └─ o
         └─ g*        (dog)
```

`*` marks the end of a word. `search("ca")` walks to the `a` node but it isn't marked: false. `startsWith("ca")`: true. `search("cart")`: true.

#### Code

```cpp
class Trie {
    struct Node {
        array<int, 26> next;
        bool end = false;
        Node() { next.fill(-1); }
    };
    vector<Node> nodes{Node()};              // node 0 is the root; indices avoid pointer churn

    int walk(const string& s) const {        // index of the node for s, or -1
        int cur = 0;
        for (char c : s) {
            cur = nodes[cur].next[c - 'a'];
            if (cur == -1) return -1;
        }
        return cur;
    }
public:
    void insert(const string& word) {
        int cur = 0;
        for (char c : word) {
            if (nodes[cur].next[c - 'a'] == -1) {
                nodes[cur].next[c - 'a'] = nodes.size();
                nodes.emplace_back();
            }
            cur = nodes[cur].next[c - 'a'];
        }
        nodes[cur].end = true;
    }
    bool search(const string& word) const { int n = walk(word); return n != -1 && nodes[n].end; }
    bool startsWith(const string& prefix) const { return walk(prefix) != -1; }
};
```

```python
class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for c in word:
            node = node.setdefault(c, {})
        node["$"] = True                    # end-of-word marker

    def _walk(self, s):
        node = self.root
        for c in s:
            if c not in node:
                return None
            node = node[c]
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and "$" in node

    def starts_with(self, prefix):
        return self._walk(prefix) is not None
```

In the C++ version, `nodes.emplace_back()` can reallocate the vector, which is why the code stores indices, not references, across the call.

#### Complexity

| Operation | Time | Notes |
|---|---|---|
| insert, search, startsWith | $O(L)$ | independent of the number of words |
| build from words | $O(\text{total characters})$ | |
| space | $O(\text{total characters} \cdot \sigma)$ with arrays | hash-map children use less for sparse nodes |

#### Trie or hash set?

| Question | Better choice |
|---|---|
| Exact membership only | hash set (less memory) |
| Prefix exists, count words with a prefix | trie |
| Letter-by-letter search with pruning (word search II) | trie |
| Longest common prefix of many words | trie (or sorting) |

#### Edge cases and bugs

- Treating "ca" as found because the path exists; check the end flag.
- Empty string: the root itself; decide whether it counts as a word.
- Characters outside the expected alphabet: validate or use a map.
- Pointer-based nodes in C++ leak without a destructor; an index-based pool avoids that.

#### Variants

- Count words and prefixes (store counts on nodes), replace words by their shortest root.
- Tries with DFS (wildcard search, word search II), bitwise tries (maximum XOR), autocomplete.
- Suffix tries and suffix trees for substring queries.

Connects to: trie with DFS, autocomplete with tries, bitwise trie, hashing.

### questions
Q: What is a trie, and what are its main operations' costs?
A: A tree where each edge is a character and each node represents the prefix spelled from the root to it, with a flag marking complete words. Insert, search and startsWith each take O(L) for a word of length L, independent of how many words are stored.

Q: Why does search need an end-of-word flag?
A: The path for "car" exists whenever "cart" was inserted, even if "car" itself wasn't. The flag records that a word actually ends at that node, which distinguishes stored words from mere prefixes.

Q: When is a trie better than a hash set?
A: When you need prefix operations: checking whether any word starts with a prefix, counting such words, autocomplete, or searching letter by letter with early pruning, as in word search II. For exact membership only, a hash set is simpler and uses less memory.

Q: What are the memory trade-offs of array children versus hash-map children?
A: An array of 26 pointers per node makes each step O(1) with no hashing but wastes space when most children are empty. A hash map per node stores only existing children, which suits large alphabets or sparse tries, at the cost of hashing on every step.

Q: How would you count how many stored words start with a given prefix?
A: Store on each node the number of words passing through it, incremented during insertion. Walk to the prefix's node and return its count, in O(L).

## dsa.tries.trie-with-dfs
name: "Trie with DFS"
importance: important
pattern: true
prereqs: [dsa.tries.trie-structure]
scope: "wildcard search, word search II"

### simple
Some searches need to explore several branches of a trie at once, which is where depth-first search comes in. A wildcard like "b.d" means "any letter here", so you try every child at that position. In a letter grid, walking the trie alongside the grid lets you drop a path the moment its letters stop matching any word.

### interview
- **Wildcard search** (`.` matches any letter): DFS over the trie; for `.` try every child; for a letter follow one edge. Worst case O(σ^L) per query, usually far less.
- **Word search II**: build a trie of all words; DFS from each grid cell moving through the trie in step with the grid; mark visited cells; record a word when you reach its end node.
- Prune: stop when the trie has no child for the next letter; remove found words (clear the end flag, delete empty leaves) so branches die.
- Store the whole word at its end node to avoid rebuilding strings during DFS.
- Complexity for word search II: O(R · C · 4 · 3^(L−1)) worst case, but the trie prunes most paths.

### deep
#### Intuition

A trie turns "does any word start with this prefix?" into one pointer step. Any search that grows a string letter by letter can walk the trie at the same time and stop as soon as the prefix leaves the trie. For many words at once, this shares the work of common prefixes: one DFS over the grid finds all words together instead of one search per word.

#### Worked example: word search II

Grid and words `["oath", "eat", "rain"]`:

```
o a a n
e t a e
i h k r
i f l v
```

From the `o` at (0,0), the trie has child `o`, then `a` at (0,1), `t` at (1,1), `h` at (2,1): "oath" found. From the `e` at (1,0), `a`? Its neighbors are `o`, `t`, `i`: no `a`, pruned. From the `e` at (1,3): neighbors `a` at (1,2), then `t` at (1,1): "eat" found. "rain" is never completed, because no `a` is adjacent to the `r`.

#### Code

```cpp
class WordFinder {
    struct Node { array<int, 26> next; int word = -1; Node() { next.fill(-1); } };
    vector<Node> t{Node()};
    vector<string> found;
    const vector<string>* words = nullptr;

    void dfs(vector<vector<char>>& g, int r, int c, int node) {
        if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size()) return;
        char ch = g[r][c];
        if (ch == '#') return;                                  // on the current path
        int nxt = t[node].next[ch - 'a'];
        if (nxt == -1) return;                                  // prefix not in the trie: prune
        if (t[nxt].word != -1) {
            found.push_back((*words)[t[nxt].word]);
            t[nxt].word = -1;                                   // report each word once
        }
        g[r][c] = '#';
        dfs(g, r + 1, c, nxt); dfs(g, r - 1, c, nxt);
        dfs(g, r, c + 1, nxt); dfs(g, r, c - 1, nxt);
        g[r][c] = ch;                                           // undo
    }
public:
    vector<string> findWords(vector<vector<char>>& g, const vector<string>& ws) {
        words = &ws;
        for (int i = 0; i < (int)ws.size(); i++) {
            int cur = 0;
            for (char ch : ws[i]) {
                if (t[cur].next[ch - 'a'] == -1) { t[cur].next[ch - 'a'] = t.size(); t.emplace_back(); }
                cur = t[cur].next[ch - 'a'];
            }
            t[cur].word = i;
        }
        for (int r = 0; r < (int)g.size(); r++)
            for (int c = 0; c < (int)g[0].size(); c++) dfs(g, r, c, 0);
        return found;
    }
};
```

```python
class WordDictionary:
    """add(word) and search(pattern) where '.' matches any letter."""
    def __init__(self):
        self.root = {}

    def add(self, word):
        node = self.root
        for c in word:
            node = node.setdefault(c, {})
        node["$"] = True

    def search(self, pattern):
        def dfs(node, i):
            if i == len(pattern):
                return "$" in node
            c = pattern[i]
            if c == ".":
                return any(dfs(child, i + 1) for k, child in node.items() if k != "$")
            return c in node and dfs(node[c], i + 1)
        return dfs(self.root, 0)
```

#### Complexity

- Wildcard search: $O(L)$ without dots; with dots, up to the number of trie nodes in the worst case.
- Word search II: building the trie is $O(\text{total letters})$; the grid DFS is bounded by $O(R \cdot C \cdot 4 \cdot 3^{L-1})$ for the longest word $L$, but pruning makes it far faster in practice.

#### Edge cases and bugs

- Reporting the same word twice when it can be formed along two paths: clear the word marker after the first find (or use a set).
- Forgetting to restore the grid cell after DFS.
- Wildcard at the end of the pattern must still require an end-of-word flag.

#### Variants

- Concatenated words (DFS over a trie with memoization on the start index).
- Stream of characters: a trie of reversed words, checked against the latest characters.
- Longest word in a dictionary built one letter at a time (BFS or DFS through nodes that are words).

Connects to: trie structure, grid backtracking, DFS, autocomplete.

### questions
Q: How do you support wildcard searches where "." matches any letter?
A: Store words in a trie and search with DFS. For a normal letter, follow that single child; for ".", try every child. Return true when the pattern ends at a node marked as the end of a word.

Q: Why does a trie speed up searching for many words in a grid?
A: Without it you would run one grid search per word. With a trie, one DFS from each cell follows all words that share the current prefix at once, and stops immediately when the prefix isn't in the trie, so common prefixes are explored only once.

Q: How do you avoid reporting the same word twice in word search II?
A: When a word's end node is reached, add the word and clear its marker in the trie (or remove the node if it has no children). Later paths reaching that node then don't report it again, and pruning dead branches speeds up the rest of the search.

Q: What is the worst-case cost of a wildcard search in a trie?
A: A pattern made mostly of dots may have to visit every node of the trie, so the worst case is O(number of nodes), which is bounded by the total characters stored. Patterns with few dots are close to O(L).

### signals
- search many words at once in a grid or a text
- patterns with wildcards matched against a dictionary
- build words letter by letter and stop when no word has that prefix
- prefix pruning during backtracking

### template
```cpp
// DFS over a trie in step with some other structure (a pattern, a grid, a stream).
struct TrieNode { TrieNode* next[26] = {}; bool end = false; };

bool matchPattern(TrieNode* node, const string& p, int i) {
    if (!node) return false;                       // prefix left the trie: prune
    if (i == (int)p.size()) return node->end;      // pattern consumed: must end a word
    if (p[i] == '.') {                             // branch: try every child
        for (TrieNode* child : node->next)
            if (matchPattern(child, p, i + 1)) return true;
        return false;
    }
    return matchPattern(node->next[p[i] - 'a'], p, i + 1);  // follow one edge
}
```

## dsa.tries.bitwise-trie
name: "Bitwise trie"
importance: important
pattern: true
prereqs: [dsa.tries.trie-structure]
scope: "maximum XOR of two numbers"

### simple
A bitwise trie stores numbers by their binary digits, from the highest bit down, like a trie of words where every letter is 0 or 1. To make an XOR as large as possible, you want each bit to differ, starting from the most valuable bit. So for each number you walk the trie choosing the opposite bit whenever that branch exists.

### interview
- Insert each number's bits from the most significant (bit 31 or the highest needed) down to 0; each node has two children.
- **Maximum XOR of two numbers**: for each number, greedily go to the child with the **opposite** bit if it exists (that bit becomes 1 in the XOR), else the same bit. **O(n · B)** for B bits.
- Greedy is correct because a higher bit outweighs all lower bits combined.
- **Queries with a limit** (maximum XOR with an element ≤ m): sort queries and numbers offline, insert numbers up to m, then query.
- Store counts on nodes to support deletion (sliding windows) and "count pairs with XOR < k".
- Memory: up to n · B nodes; use arrays of children with an index pool.

### deep
#### Intuition

XOR sets a bit to 1 exactly where two numbers differ. Since bit $k$ is worth more than all lower bits together ($2^k > 2^k - 1$), the best partner for $x$ is the one that differs from $x$ in the highest possible bit, then the next highest, and so on. A trie of bits lets you make these choices one bit at a time, checking whether any stored number has the opposite bit at each position given the choices so far.

#### Worked example (4-bit numbers)

Numbers `3 (0011)`, `10 (1010)`, `5 (0101)` and `8 (1000)`. Query x = 5 (0101):

| bit | x's bit | want | available? | XOR bit |
|---|---|---|---|---|
| 3 | 0 | 1 | yes (10, 8) | 1 |
| 2 | 1 | 0 | yes (10 = 1010, 8 = 1000) | 1 |
| 1 | 0 | 1 | yes (10) | 1 |
| 0 | 1 | 0 | yes (10 ends in 0) | 1 |

Best partner 10: 5 XOR 10 = 1111 = **15**.

#### Code

```cpp
int findMaximumXOR(const vector<int>& nums) {
    const int B = 30;                                     // values < 2^31: bits 30..0
    vector<array<int, 2>> child(1, {-1, -1});
    auto insert = [&](int x) {
        int cur = 0;
        for (int b = B; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (child[cur][bit] == -1) { child[cur][bit] = child.size(); child.push_back({-1, -1}); }
            cur = child[cur][bit];
        }
    };
    auto bestWith = [&](int x) {
        int cur = 0, res = 0;
        for (int b = B; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (child[cur][bit ^ 1] != -1) { res |= 1 << b; cur = child[cur][bit ^ 1]; }
            else cur = child[cur][bit];
        }
        return res;
    };
    int best = 0;
    for (int x : nums) { insert(x); best = max(best, bestWith(x)); }  // pairs with earlier ones
    return best;
}
```

```python
def max_xor_prefix_method(nums):
    """Alternative without a trie: build the answer bit by bit with a set of prefixes."""
    answer = 0
    for b in range(max(nums).bit_length() - 1, -1, -1):
        prefixes = {x >> b for x in nums}
        candidate = (answer << 1) | 1                  # try to set this bit
        if any((candidate ^ p) in prefixes for p in prefixes):
            answer = candidate
        else:
            answer <<= 1
    return answer
```

The prefix-set version uses the same greedy (decide the highest bit first) with $O(n \cdot B)$ time and no trie.

#### Complexity

$O(n \cdot B)$ time and up to $O(n \cdot B)$ nodes, with $B \approx 31$ for 32-bit integers.

#### Edge cases and bugs

- Inserting the number before querying lets it pair with itself (XOR 0), which is harmless for the maximum but wrong for counting pairs.
- Using too few bits when values can reach $2^{31} - 1$, or signed shifts with negative numbers.
- Memory: $10^5$ numbers × 31 bits ≈ 3.1 million nodes; array-based pools keep this manageable.

#### Variants

- Maximum XOR with an element from the array not exceeding m (offline sorting).
- Maximum XOR of a subarray: insert prefix XORs, query each prefix.
- Count pairs with XOR in a range: store counts per node and walk with the limit.
- Minimum XOR pair: sort, then check adjacent elements (or use the trie choosing the same bit).

Connects to: trie structure, XOR tricks, prefix XOR, greedy on bits.

### questions
Q: How does a bitwise trie find the maximum XOR of two numbers?
A: Insert every number's bits from the most significant down. For each number, walk the trie preferring the child with the opposite bit at each level, which sets that bit of the XOR to 1. The best result over all numbers is the answer, in O(n · bits).

Q: Why is choosing the opposite bit greedily from the top correct?
A: Bit k is worth 2^k, more than all lower bits combined (2^k − 1). So a partner that differs at a higher bit always beats one that doesn't, no matter what happens at lower bits, and the greedy choice at each level is safe.

Q: How do you find the maximum XOR of any subarray?
A: The XOR of a subarray equals the XOR of two prefix XORs. Insert prefix XORs (starting with 0) into a bitwise trie as you go, and for each new prefix query the trie for its best partner. It's O(n · bits).

Q: How can a bitwise trie support deletions?
A: Store a count on each node of how many inserted numbers pass through it. Deleting decrements the counts along the path, and queries treat nodes with a count of 0 as absent. This supports sliding windows.

### signals
- maximize (or minimize) the XOR of a pair of numbers
- maximum XOR of a subarray via prefix XORs
- queries asking for the best XOR partner under a limit
- greedy decisions bit by bit from the most significant bit

### template
```cpp
// Binary trie over B+1 bits with counts (supports insert, erase, best-XOR query).
struct BitTrie {
    static const int B = 30;
    vector<array<int, 2>> ch{{-1, -1}};
    vector<int> cnt{0};
    void add(int x, int d) {                           // d = +1 insert, -1 erase
        int cur = 0;
        for (int b = B; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (ch[cur][bit] == -1) { ch[cur][bit] = ch.size(); ch.push_back({-1, -1}); cnt.push_back(0); }
            cur = ch[cur][bit];
            cnt[cur] += d;
        }
    }
    int maxXor(int x) const {                          // requires at least one stored number
        int cur = 0, res = 0;
        for (int b = B; b >= 0; b--) {
            int want = ((x >> b) & 1) ^ 1;             // prefer the opposite bit
            int nx = ch[cur][want];
            if (nx != -1 && cnt[nx] > 0) { res |= 1 << b; cur = nx; }
            else cur = ch[cur][want ^ 1];
        }
        return res;
    }
};
```

## dsa.tries.autocomplete-with-tries
name: "Autocomplete with tries"
importance: important
prereqs: [dsa.tries.trie-structure]
scope: "ranking suggestions"

### simple
Autocomplete suggests whole words or phrases after you type a few letters. A trie finds every stored phrase that starts with what you typed, and a score such as popularity decides which few to show first. To keep it fast while typing, each node can remember its own short list of best suggestions.

### interview
- Walk to the prefix's node in O(L); then collect completions below it with DFS, and pick the top k by score (a heap of size k).
- **Precompute top-k per node**: during insertion, update the k best (sentence, score) pairs stored on every node along the path. Queries become O(L + k), inserts O(L · k).
- Ranking: frequency first, then lexicographic order for ties (a common interview rule), or recency.
- Typing character by character: keep the current node pointer and move one step per keystroke instead of restarting from the root.
- System design angle: tries sharded by prefix, cached top results, offline aggregation of query logs.
- Alternative: a sorted list of words with binary search for the prefix range, then sort that range by score.

### questions
Q: How does a trie support autocomplete?
A: Walk down the trie following the typed prefix; every word below that node starts with the prefix. Collect them with a DFS and return the best few by score, for example with a min-heap of size k.

Q: How do you make each query fast even when a prefix has millions of completions?
A: Store, on each node, the top k suggestions for its prefix, maintained during insertion by updating every node on the word's path. A query then only walks the prefix and reads the stored list, in O(L + k).

Q: How should ties in popularity be ordered?
A: A common rule is lexicographic order for equal counts, so the ranking is deterministic. Encode it in the comparator: higher count first, then the smaller string.

Q: How do you handle the user typing one character at a time?
A: Keep a pointer to the node for the current prefix and advance it by one child per new character, rather than walking from the root each time. If the child doesn't exist, all later suggestions are empty until the input is cleared.
