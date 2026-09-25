---
topic: dbms.indexing
name: "Indexing and storage"
subject: dbms
order: 8
prereqs: [dbms.relational]
---

## dbms.indexing.why-indexes
name: "Why indexes"
importance: must
scope: "trading write cost and space for read speed"

### simple
An index is an extra, sorted structure that lets the database find rows without reading the whole table, like the index at the back of a book that sends you straight to the right page. It makes lookups dramatically faster. The price is extra storage and extra work on every insert, update and delete, because the index must be kept up to date too.

### interview
- Without an index, a query with `WHERE email = ?` does a **full table scan**: $O(n)$ rows and every page of the table read from disk or cache.
- A **B+ tree** index finds a key in $O(\log n)$ with a very high fanout: three or four page reads even for hundreds of millions of rows. **Hash** indexes do equality lookups in $O(1)$.
- Indexes also speed up **ORDER BY** (rows already sorted), **joins** (lookups on the join key), **range** queries, `MIN`/`MAX`, and enforce **uniqueness** (primary keys and `UNIQUE` are indexes).
- Costs: **space** (often a sizable fraction of the table), **slower writes** (every insert or delete touches every index on the table; updates touch indexes on changed columns), more memory pressure, and maintenance (bloat, rebuilds).
- Index columns that are **selective** and used in `WHERE`, `JOIN` and `ORDER BY` clauses of frequent queries; don't index everything.
- The **optimizer** decides whether to use an index; for queries matching a large share of rows a sequential scan is often cheaper.

### deep
#### Intuition

A table stored in insertion order is like a pile of unsorted forms: finding one person means reading every form. An index is a separate, sorted list of (key, location) pairs. Because it is sorted, you can binary search it, and because it is small and organized in pages as a tree, you touch only a handful of pages.

#### Code: rows examined

```cpp
int main() {
    const int n = 1'000'000;
    vector<int> table(n);                            // ids in insertion (not sorted) order
    for (int i = 0; i < n; ++i) table[i] = int(1LL * i * 7919 % n);   // a permutation of 0..n-1

    auto scan = [&](int id) {                        // no index: read rows until found
        int examined = 0;
        for (int v : table) {
            ++examined;
            if (v == id) break;
        }
        return examined;
    };
    vector<int> index = table;                       // a sorted index on id
    sort(index.begin(), index.end());
    auto seek = [&](int id) {                        // binary search: count the probes
        int lo = 0, hi = n, probes = 0;
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            ++probes;
            if (index[mid] < id) lo = mid + 1;
            else hi = mid;
        }
        return probes;
    };
    for (int id : {123456, 999999, -1})
        printf("id %7d: scan examines %7d rows, index needs %d probes\n", id, scan(id), seek(id));
}
```

Output:

```text
id  123456: scan examines  578625 rows, index needs 20 probes
id  999999: scan examines  982322 rows, index needs 20 probes
id      -1: scan examines 1000000 rows, index needs 20 probes
```

A missing key is the worst case for the scan: it must read everything to be sure. The index answers in about $\log_2 n = 20$ steps either way. On disk the gap is larger still: at around 100 rows per 8 KB page, the scan reads up to 10,000 pages, while a B+ tree with hundreds of keys per page reaches the row in three or four page reads.

#### The write side

Every index is another sorted structure to update. A table with five indexes turns one `INSERT` into six writes (the row and five index entries), each possibly splitting a page, plus log records for all of them. Updating an indexed column means deleting the old index entry and inserting a new one.

| more indexes | fewer indexes |
|---|---|
| faster reads for more query shapes | faster inserts, updates, deletes |
| more disk and memory | less disk and memory |
| more work for vacuum and backups | less maintenance |

#### What to index

1. Primary keys and unique columns (automatic).
2. Foreign keys used in joins and in cascading deletes.
3. Columns in frequent, selective `WHERE` clauses, and multi-column combinations used together (composite indexes).
4. Columns used for sorting with `LIMIT` (top-N queries).

Then check with `EXPLAIN` that queries actually use them, and drop indexes nothing uses.

#### Pitfalls

- Indexing a column where most rows share one value (a boolean flag): the optimizer ignores it and every write still pays for it.
- Wrapping the column in a function in the `WHERE` clause, which hides it from a normal index.
- Adding an index for every slow query without looking at the overall write load.

Connects to: B-trees and B+ trees, clustered vs non-clustered indexes, composite and covering indexes, when indexes hurt, query plans, classic binary search.

### questions
Q: What is a database index and why does it speed up queries?
A: A separate data structure, usually a B+ tree, that stores column values in sorted order with pointers to the matching rows. Instead of scanning every row, the database searches the index in logarithmic time and reads only the pages it needs.

Q: What are the costs of indexes?
A: Extra storage and memory, and slower writes: every insert and delete must also update every index, and updates must update indexes on changed columns, with page splits and extra logging. Indexes also need maintenance and can mislead with stale statistics.

Q: Which columns should you index?
A: Primary and unique keys, foreign keys used in joins, and columns that appear in frequent, selective filters, sorts and groupings, often as composite indexes matching the queries. Columns with few distinct values or rarely queried ones are usually not worth it.

Q: Why might the database not use an index you created?
A: The optimizer estimates that a sequential scan is cheaper, typically because the condition matches a large fraction of rows, the table is small, or statistics are outdated. The query may also hide the column behind a function or type conversion, or filter on a column that is not the index's leading column.

Q: How many page reads does a B+ tree lookup take on a large table?
A: Roughly its height, usually three or four, because each page holds hundreds of keys: with about 500 keys per page, three levels cover over 100 million keys. The top levels are almost always cached in memory, so often only one or two reads hit disk.

## dbms.indexing.clustered-vs-non-clustered-indexes
name: "Clustered vs non-clustered indexes"
importance: must
prereqs: [dbms.indexing.why-indexes]
scope: "primary and secondary indexes"

### simple
A clustered index decides the physical order of the table's rows on disk, so rows with nearby keys sit together, like a phone book sorted by surname. A non-clustered index is a separate list that points to rows stored elsewhere, like the index at the back of a textbook. A table can be sorted only one way, so it has at most one clustered index but can have many non-clustered ones.

### interview
- **Clustered index**: the table data itself is stored in index order (in InnoDB and SQL Server, the leaves of the primary key's B+ tree **are** the rows). One per table. Range scans on the clustered key read consecutive pages.
- **Non-clustered (secondary) index**: a separate structure of (key, row locator). The locator is a **row id** (heap tables: PostgreSQL, Oracle heap) or the **primary key** (InnoDB), which means a second lookup in the clustered index (a **bookmark** or key lookup).
- Textbook terms: a **primary index** is on the key the file is sorted by (clustered, can be sparse); a **secondary index** is on any other column (dense).
- Choosing the clustered key: narrow, stable, ever-increasing keys (an auto-increment id or a time-ordered id) append to the end; **random UUIDs** cause page splits and scattered writes, and a wide primary key bloats every secondary index in InnoDB.
- PostgreSQL has no maintained clustered index: tables are heaps; the `CLUSTER` command sorts once, and correlation decays with updates.
- A secondary index lookup that returns many rows can be slower than a scan, because each row may be on a different page.

### deep
#### Intuition

If rows are stored in the same order as the key you search by, a range query reads one run of pages. If they are scattered, each matching row may live on its own page, and the index only tells you where to jump.

#### Code: pages touched by a range query

1,000,000 rows, 100 per page. Query: ids 500,000 to 500,999.

```cpp
int main() {
    const int n = 1'000'000, perPage = 100;
    // Clustered: the row with id k is at position k.
    // Heap plus secondary index: the row with id k was inserted at a scattered position.
    vector<int> positionOf(n);
    for (int i = 0; i < n; ++i) positionOf[int(1LL * i * 7919 % n)] = i;

    set<int> clusteredPages, heapPages;
    for (int id = 500000; id < 501000; ++id) {
        clusteredPages.insert(id / perPage);
        heapPages.insert(positionOf[id] / perPage);
    }
    printf("clustered on id: %zu pages\n", clusteredPages.size());
    printf("heap + secondary index: %zu pages\n", heapPages.size());
}
```

Output:

```text
clustered on id: 10 pages
heap + secondary index: 1000 pages
```

The same 1,000 rows cost 10 page reads when clustered and 1,000 when scattered. The same effect showed up on a real PostgreSQL 16 table: a query matching 5,714 rows through a secondary index visited all 2,062 pages of the table, because the matching rows were spread evenly through it.

#### InnoDB's two-step lookup

```text
secondary index on email:   ("asha@uni.edu", pk 42) ...
                                              |
primary key (clustered) B+ tree:  ... [pk 42: whole row] ...
```

`SELECT * FROM users WHERE email = ?` searches the email index, gets the primary key 42, then searches the clustered index for row 42. If the query needs only columns stored in the secondary index (which always includes the primary key), the second search is skipped: a **covering** index.

#### Comparison

| | clustered | non-clustered |
|---|---|---|
| how many per table | one | many |
| leaf contents | the rows | key plus row locator |
| range scan on its key | sequential pages | random page reads |
| extra lookup | none | yes, unless covering |
| insert cost | position in key order (page splits if keys are random) | one index entry |

#### Pitfalls

- A random UUID primary key in InnoDB: every insert lands on a random page, causing splits, half-empty pages and poor cache use. Prefer sequential or time-ordered ids (such as UUID version 7).
- Wide composite primary keys in InnoDB: every secondary index stores them.
- Assuming PostgreSQL keeps a table ordered after `CLUSTER`: new and updated rows go wherever there is space.

Connects to: why indexes, dense vs sparse indexes, B-trees and B+ trees, composite and covering indexes, keys.

### questions
Q: What is the difference between a clustered and a non-clustered index?
A: A clustered index determines the physical order of the table's rows, and in systems like InnoDB its leaf pages are the rows themselves, so there is only one per table. A non-clustered index is a separate structure holding keys and pointers to rows, and a table can have many.

Q: Why can a table have only one clustered index?
A: Because the rows can be physically stored in only one order. Any other ordering must be provided by separate secondary indexes that point to the rows.

Q: What happens when you query through a secondary index in InnoDB?
A: InnoDB searches the secondary index to find the matching primary key values, then searches the clustered primary key index to fetch each full row. If all needed columns are in the secondary index, which always includes the primary key, the second lookup is skipped.

Q: Why is a random UUID a poor clustered primary key?
A: New rows land at random positions in the clustered B+ tree, causing frequent page splits, half-full pages and scattered writes that defeat caching. Sequential or time-ordered keys append to the end of the tree instead.

Q: Why are range queries faster on a clustered index?
A: Rows with consecutive key values are stored next to each other, so a range query reads a small run of consecutive pages. Through a non-clustered index, each matching row may sit on a different page, needing a separate read per row.

## dbms.indexing.dense-vs-sparse-indexes
name: "Dense vs sparse indexes"
importance: important
prereqs: [dbms.indexing.clustered-vs-non-clustered-indexes]
scope: "Dense vs sparse indexes"

### simple
A dense index has an entry for every key in the table, while a sparse index has an entry for only some of them, usually the first key on each page. A sparse index works like the words printed at the top of each dictionary page: find the right page by its first word, then read down the page. It only works when the data itself is sorted by that key.

### interview
- **Dense index**: one entry per search-key value (or per record). Works on any file, sorted or not; answers "does this key exist?" from the index alone.
- **Sparse index**: one entry per **block** (the first key in each page). Much smaller; needs the file **sorted** on the key (a clustered, primary index). Lookup: find the last index entry with key ≤ target, then scan that block.
- Secondary indexes must be **dense**: rows are not ordered by their key, so there is no block to scan.
- **Multilevel indexes**: when an index itself is too big, build a sparse index on top of it, and so on: that is a B+ tree, whose internal levels are sparse indexes over the level below.
- Trade-off: sparse is smaller and cheaper to maintain; dense can answer more queries without touching data (existence checks, index-only scans).

### deep
#### Code: both kinds over a sorted file

```cpp
int main() {
    vector<vector<int>> blocks = {{2, 5, 8, 11, 14}, {17, 20, 23, 26, 29},
                                  {32, 35, 38, 41, 44}, {47, 50, 53, 56, 59}};
    map<int, int> dense, sparse;                     // key -> block number
    for (int b = 0; b < int(blocks.size()); ++b) {
        for (int k : blocks[b]) dense[k] = b;
        sparse[blocks[b].front()] = b;               // first key of each block
    }
    cout << "dense entries: " << dense.size() << ", sparse entries: " << sparse.size() << "\n";

    for (int target : {23, 24}) {
        auto it = prev(sparse.upper_bound(target));  // last block starting at or below target
        const auto& block = blocks[it->second];
        bool found = find(block.begin(), block.end(), target) != block.end();
        cout << "sparse lookup " << target << ": block " << it->second << ", "
             << (found ? "found" : "not found") << " after scanning it\n";
    }
}
```

Output:

```text
dense entries: 20, sparse entries: 4
sparse lookup 23: block 1, found after scanning it
sparse lookup 24: block 1, not found after scanning it
```

The sparse index is five times smaller here (one entry per block of five); with 100 rows per page it would be 100 times smaller. The dense index could have answered "is 24 present?" without reading any block.

#### Multilevel

Index 10 million blocks sparsely and you get 10 million entries; at 400 entries per index page that is 25,000 pages, too many to search comfortably. A sparse index over those pages has 63 pages, and one more level fits in a single page. Three levels, each a sparse index over the one below, is exactly the shape of a B+ tree.

Connects to: clustered vs non-clustered indexes, B-trees and B+ trees, why indexes.

### questions
Q: What is the difference between a dense and a sparse index?
A: A dense index has an entry for every search-key value in the file, while a sparse index has entries for only some, typically the first key of each block. Sparse indexes are smaller but require the file to be sorted on the key, and a lookup must scan the block the index points to.

Q: Why must a secondary index be dense?
A: The file is not sorted on the secondary key, so records with that key can be anywhere. Only an entry for every value, or every record, can locate them; there is no block that is guaranteed to contain a range of values.

Q: How does a sparse index find a key?
A: It finds the last index entry whose key is less than or equal to the target, follows it to that block, and scans the block for the key. If the key is not in that block, it does not exist.

Q: How do multilevel indexes relate to B+ trees?
A: When an index is too large, a sparse index is built over its pages, and another over that, until the top fits in one page. A B+ tree is this structure kept balanced dynamically, with internal levels acting as sparse indexes over the level below.

## dbms.indexing.b-trees-and-b-plus-trees
name: "B-trees and B+ trees"
importance: must
prereqs: [dbms.indexing.clustered-vs-non-clustered-indexes]
scope: "structure, why databases use B+ trees"

### simple
A B+ tree is a wide, shallow, always-balanced search tree where each node is a disk page holding hundreds of keys. You start at the top and follow one pointer per level to reach the bottom, where the keys live in sorted, linked pages. Because it is so wide, even a billion keys need only a few levels, like finding a word by first choosing a shelf, then a book, then a page.

### interview
- A **B-tree** of order $m$: every node holds up to $m - 1$ sorted keys and up to $m$ children, every node except the root is at least half full, and all leaves are at the same depth. Search, insert and delete are $O(\log n)$.
- A **B+ tree** keeps **all data (or row pointers) in the leaves**; internal nodes hold only **separator keys** to route searches, and the leaves are **linked** left to right.
- **Why databases use B+ trees**: one node = one page, so **high fanout** (hundreds of keys) and a **height of 3 to 4**; internal nodes are small and stay in memory; **range scans** walk the leaf chain without climbing back up; every lookup costs the same number of levels.
- **Insert**: add to the leaf; if it overflows, **split** it and push a separator into the parent; splits can propagate up; a root split adds a level (the tree grows at the root, so it stays balanced).
- **Delete**: remove from the leaf; if it becomes less than half full, **borrow** from a sibling or **merge** with it (many databases just leave pages sparse and reorganize later).
- Compared with binary search trees and red-black trees: a BST has height about $\log_2 n$ (about 30 disk reads for a billion keys), a B+ tree about $\log_{500} n$ (about 4).

### deep
#### Code: insert with splits and a range scan

A small order (at most 3 keys per node) makes the splits visible.

```cpp
struct Node {
    bool leaf = true;
    vector<int> keys;
    vector<Node*> kids;                              // internal: keys.size() + 1 children
    Node* next = nullptr;                            // leaf: the leaf to the right
};

struct BPlusTree {
    static constexpr size_t MAX_KEYS = 3;
    deque<Node> pool;                                // owns the nodes; pointers stay valid
    Node* root = make(true);

    Node* make(bool leaf) {
        pool.emplace_back();
        pool.back().leaf = leaf;
        return &pool.back();
    }
    // Inserts below n; if n splits, returns the separator and the new right sibling.
    optional<pair<int, Node*>> insert(Node* n, int key) {
        size_t i = upper_bound(n->keys.begin(), n->keys.end(), key) - n->keys.begin();
        if (n->leaf) {
            n->keys.insert(n->keys.begin() + i, key);
        } else {
            auto split = insert(n->kids[i], key);
            if (!split) return nullopt;
            n->keys.insert(n->keys.begin() + i, split->first);
            n->kids.insert(n->kids.begin() + i + 1, split->second);
        }
        if (n->keys.size() <= MAX_KEYS) return nullopt;
        size_t mid = n->keys.size() / 2;
        int separator = n->keys[mid];
        Node* right = make(n->leaf);
        if (n->leaf) {                               // leaves copy the separator up
            right->keys.assign(n->keys.begin() + mid, n->keys.end());
            right->next = n->next;
            n->next = right;
        } else {                                     // internal nodes move it up
            right->keys.assign(n->keys.begin() + mid + 1, n->keys.end());
            right->kids.assign(n->kids.begin() + mid + 1, n->kids.end());
            n->kids.resize(mid + 1);
        }
        n->keys.resize(mid);
        return pair{separator, right};
    }
    void insert(int key) {
        if (auto split = insert(root, key)) {        // the root split: one level taller
            Node* top = make(false);
            top->keys = {split->first};
            top->kids = {root, split->second};
            root = top;
        }
    }
    vector<int> range(int lo, int hi) const {        // descend once, then follow leaves
        const Node* n = root;
        while (!n->leaf)
            n = n->kids[upper_bound(n->keys.begin(), n->keys.end(), lo) - n->keys.begin()];
        vector<int> out;
        for (; n; n = n->next)
            for (int k : n->keys) {
                if (k > hi) return out;
                if (k >= lo) out.push_back(k);
            }
        return out;
    }
    void print() const {                             // one line per level
        for (vector<const Node*> level = {root}; !level.empty();) {
            vector<const Node*> below;
            for (auto* n : level) {
                cout << "[";
                for (size_t i = 0; i < n->keys.size(); ++i) cout << (i ? " " : "") << n->keys[i];
                cout << "] ";
                below.insert(below.end(), n->kids.begin(), n->kids.end());
            }
            cout << "\n";
            level = below;
        }
    }
};

int main() {
    BPlusTree t;
    for (int k : {10, 20, 30, 40, 50, 60, 70, 80, 90, 25, 35, 95, 100}) t.insert(k);
    t.print();
    cout << "range 25..60:";
    for (int k : t.range(25, 60)) cout << " " << k;
    cout << "\n";
}
```

Output:

```text
[70] 
[30 50] [90] 
[10 20 25] [30 35 40] [50 60] [70 80] [90 95 100] 
range 25..60: 25 30 35 40 50 60
```

Inserting 40 split the first leaf (separator 30 copied up); 60 and 80 split more leaves; 95 split the leaf [70 80 90 95], pushing 90 into the root, which then held four separators and split too: 70 moved up into a new root and the tree grew to three levels. Every leaf is at the same depth, and the range query found 25 and then just walked right along the leaf chain.

#### The arithmetic of fanout

With 16 KB pages, 8-byte keys and 8-byte child pointers, an internal node holds about 1,000 separators. Three levels of internal nodes then route to $1000^3 = 10^9$ leaves' worth of keys. The root and second level (about 1,000 pages) fit easily in memory, so a lookup usually costs one or two actual disk reads.

#### B-tree vs B+ tree

| | B-tree | B+ tree |
|---|---|---|
| data stored in | every node | leaves only |
| internal node fanout | lower (keys carry data) | higher (separators only) |
| range scan | in-order traversal up and down the tree | walk the linked leaves |
| search cost | varies: can stop high up | always reaches a leaf |
| used by | some file systems | nearly every database index |

#### Pitfalls

- Confusing order conventions: some texts count maximum keys, others maximum children.
- Forgetting that leaf splits copy the separator up while internal splits move it.
- Assuming deletes shrink the tree promptly: many databases leave half-empty pages until a rebuild or vacuum.

Connects to: dense vs sparse indexes, composite and covering indexes, self-balancing BSTs overview, LSM trees, why indexes.

### questions
Q: What is the difference between a B-tree and a B+ tree?
A: In a B-tree every node stores keys with their data, and a search can end at an internal node. In a B+ tree all data lives in the leaves, internal nodes hold only separator keys for routing, and leaves are linked in key order, which gives higher fanout and efficient range scans.

Q: Why do databases use B+ trees rather than binary search trees?
A: Each B+ tree node fills a disk page with hundreds of keys, so the tree is only three or four levels deep even for billions of rows, and each level costs at most one page read. A binary tree would be about 30 levels deep with poor locality. B+ trees also stay balanced and support range scans through linked leaves.

Q: What happens when you insert into a full B+ tree leaf?
A: The leaf splits into two half-full leaves, and the first key of the new right leaf is copied into the parent as a separator. If the parent overflows, it splits too, moving its middle key up. If the root splits, a new root is created and the tree grows by one level.

Q: How does a B+ tree answer a range query?
A: It searches down to the leaf containing the lower bound, then follows the leaf-to-leaf links, reading keys in order until it passes the upper bound, without going back up the tree.

Q: How tall is a B+ tree holding a billion keys?
A: With a fanout of around a thousand keys per node, three levels of internal nodes above the leaves suffice, since a thousand cubed is a billion. The top levels are cached in memory, so a lookup typically needs one or two disk reads.

## dbms.indexing.hash-indexes
name: "Hash indexes"
importance: important
prereqs: [dbms.indexing.why-indexes]
scope: "equality lookups only"

### simple
A hash index runs each key through a hash function that tells it exactly which bucket to look in, so finding a row by an exact value takes one step. It is like a coat check that hands you ticket number 47: you go straight to hook 47. But the hooks are not in any meaningful order, so it cannot answer questions like "all coats between hooks 40 and 60".

### interview
- A **hash function** maps a key to a bucket (a page); lookups for `key = value` cost $O(1)$ page reads on average.
- **Only equality**: no range queries (`<`, `BETWEEN`), no ordering (`ORDER BY`), no prefix search (`LIKE 'ab%'`), and no use of part of a composite key.
- **Collisions** and full buckets are handled with overflow pages, or by growing the table: **extendible hashing** (a directory of $2^d$ pointers indexed by $d$ bits of the hash; a full bucket splits, and the directory doubles only when needed) or **linear hashing** (split buckets one at a time in round-robin order).
- Where they appear: PostgreSQL hash indexes (crash-safe since version 10), MySQL's MEMORY engine, InnoDB's automatic **adaptive hash index** on hot B+ tree pages, key-value stores, and **hash joins** in memory.
- In practice B+ trees are the default because they handle equality almost as fast and support everything else.

### deep
#### Code: extendible hashing

Buckets hold two keys. The directory has $2^d$ slots, indexed by the lowest $d$ bits of the hash (here the key itself). A full bucket with local depth equal to $d$ forces the directory to double; otherwise the bucket just splits.

```cpp
struct Bucket { int localDepth; vector<int> keys; };

struct ExtendibleHash {
    static constexpr size_t CAPACITY = 2;            // keys per bucket (a page in a database)
    int globalDepth = 1;
    vector<shared_ptr<Bucket>> dir = {make_shared<Bucket>(Bucket{1, {}}),
                                      make_shared<Bucket>(Bucket{1, {}})};

    size_t slot(int key) const { return key & ((1 << globalDepth) - 1); }   // low bits

    void insert(int key) {
        auto b = dir[slot(key)];
        if (b->keys.size() < CAPACITY) {
            b->keys.push_back(key);
            return;
        }
        if (b->localDepth == globalDepth) {          // no spare bit: double the directory
            auto copy = dir;                         // (inserting a vector into itself is UB)
            dir.insert(dir.end(), copy.begin(), copy.end());
            ++globalDepth;
        }
        int bit = 1 << b->localDepth;                // split b on its next bit
        auto zero = make_shared<Bucket>(Bucket{b->localDepth + 1, {}});
        auto one = make_shared<Bucket>(Bucket{b->localDepth + 1, {}});
        for (size_t i = 0; i < dir.size(); ++i)
            if (dir[i] == b) dir[i] = (i & bit) ? one : zero;
        for (int k : b->keys) ((k & bit) ? one : zero)->keys.push_back(k);
        insert(key);                                 // try again; it may split once more
    }

    void print() const {
        cout << "depth " << globalDepth << ":";
        for (size_t i = 0; i < dir.size(); ++i) {
            cout << " " << bitset<8>(i).to_string().substr(8 - globalDepth) << "->[";
            for (size_t j = 0; j < dir[i]->keys.size(); ++j)
                cout << (j ? " " : "") << dir[i]->keys[j];
            cout << "]";
        }
        cout << "\n";
    }
};

int main() {
    ExtendibleHash h;
    for (int k : {4, 7, 12, 9, 6, 5, 13}) {
        h.insert(k);
        cout << "insert " << setw(2) << k << "  ";
        h.print();
    }
}
```

Output:

```text
insert  4  depth 1: 0->[4] 1->[]
insert  7  depth 1: 0->[4] 1->[7]
insert 12  depth 1: 0->[4 12] 1->[7]
insert  9  depth 1: 0->[4 12] 1->[7 9]
insert  6  depth 2: 00->[4 12] 01->[7 9] 10->[6] 11->[7 9]
insert  5  depth 2: 00->[4 12] 01->[9 5] 10->[6] 11->[7]
insert 13  depth 3: 000->[4 12] 001->[9] 010->[6] 011->[7] 100->[4 12] 101->[5 13] 110->[6] 111->[7]
```

Inserting 6 found bucket 0 full at local depth 1 = global depth, so the directory doubled and the bucket split on the second bit (4 and 12 both end in 00; 6 ends in 10). Inserting 5 found the bucket `[7 9]` full but with local depth 1 < 2: two directory slots already pointed to it, so it split without doubling (9 ends in 01, 7 in 11). Inserting 13 needed a third bit. Slots that still share a bucket (000 and 100) show buckets whose local depth is below the global depth. A lookup is always one directory read plus one bucket read.

#### Why ranges fail

Keys 12 and 13 sit in unrelated buckets; a query `WHERE k BETWEEN 5 AND 13` would have to read every bucket. A B+ tree keeps them next to each other.

Connects to: hash table internals, why indexes, B-trees and B+ trees, join algorithms, consistent hashing.

### questions
Q: What queries can a hash index answer, and which can it not?
A: It answers exact equality lookups on the full key in about one page read. It cannot help with ranges, sorting, prefix matches such as LIKE with a fixed prefix, or conditions on only part of a composite key, because hashing destroys key order.

Q: How does extendible hashing grow?
A: It keeps a directory of 2 to the d pointers indexed by d bits of the hash. When a bucket overflows, the bucket splits on one more bit; only if its local depth already equals the global depth does the directory double. Each split rehashes only one bucket's keys.

Q: Why do most databases default to B+ tree indexes instead of hash indexes?
A: B+ trees answer equality lookups in a few page reads, nearly as fast, and also support ranges, ordering, prefixes and composite-key prefixes. Hash indexes give a small gain for pure equality at the cost of all that flexibility.

Q: What is InnoDB's adaptive hash index?
A: An in-memory hash index that InnoDB builds automatically on frequently accessed B+ tree pages, so repeated equality lookups can skip the tree descent. It is managed by the engine, not created by users.

## dbms.indexing.composite-and-covering-indexes
name: "Composite and covering indexes"
importance: must
prereqs: [dbms.indexing.b-trees-and-b-plus-trees]
scope: "leftmost prefix rule, index-only scans"

### simple
A composite index is an index on several columns at once, sorted by the first column, then by the second within it, like a phone book sorted by surname, then first name. It helps queries that filter on the first column, or the first and second, but not the second alone. A covering index holds every column a query needs, so the database can answer from the index without touching the table at all.

### interview
- An index on `(a, b, c)` is sorted **lexicographically**: by a, then b within equal a, then c.
- **Leftmost prefix rule**: usable for conditions on `a`, `a and b`, `a and b and c`; **not** for `b` or `c` alone (at best the whole index is scanned). Order of columns in the `WHERE` clause does not matter; order in the index does.
- A **range** on a column stops the seek there: with `a = 1 AND b > 5 AND c = 3`, the index narrows by a and b; c is only filtered. Rule of thumb: **equality columns first, then the range column**.
- The index also provides **sorting**: `WHERE a = ? ORDER BY b` needs no sort step.
- **Covering index**: contains every column the query uses (filter and output), enabling an **index-only scan**. Add extra columns with `INCLUDE` (PostgreSQL, SQL Server) or by appending them. In InnoDB, secondary indexes implicitly include the primary key.
- One composite index `(a, b)` usually replaces a separate index on `a`; column order should follow the most common queries and selectivity.

### deep
#### Code: which queries can seek?

An index on `(country, city)` over 7,000 people, stored as sorted tuples, just like the leaf level of a B+ tree.

```cpp
int main() {
    vector<string> countries = {"IN", "US", "DE", "BR", "JP"};
    vector<string> cities = {"Pune", "Delhi", "Austin", "Berlin", "Recife", "Osaka", "Mumbai"};
    vector<tuple<string, string, int>> index;        // (country, city, row id)
    for (int id = 0; id < 7000; ++id) index.push_back({countries[id % 5], cities[id % 7], id});
    sort(index.begin(), index.end());

    auto seek = [&](const string& country, const string* city) {   // entries in a prefix range
        auto lo = make_tuple(country, city ? *city : string(), INT_MIN);
        auto hi = city ? make_tuple(country, *city, INT_MAX)            // just past the city
                       : make_tuple(country + '\x7f', string(), 0);     // just past the country
        return upper_bound(index.begin(), index.end(), hi) -
               lower_bound(index.begin(), index.end(), lo);
    };
    string pune = "Pune";
    printf("country = IN:                 seek, %ld entries read\n", long(seek("IN", nullptr)));
    printf("country = IN and city = Pune: seek, %ld entries read\n", long(seek("IN", &pune)));
    long matches = count_if(index.begin(), index.end(),
                            [](auto& e) { return get<1>(e) == "Pune"; });
    printf("city = Pune:                  no seek, %zu entries read for %ld matches\n",
           index.size(), matches);
}
```

Output:

```text
country = IN:                 seek, 1400 entries read
country = IN and city = Pune: seek, 200 entries read
city = Pune:                  no seek, 7000 entries read for 1000 matches
```

Rows with `city = Pune` are spread through every country's section of the index, so there is no contiguous range to jump to. The same shape on PostgreSQL 16 with 200,000 rows: `country = 'IN' AND city = 'Pune'` read 9 index pages; `city = 'Pune'` alone read 174 of the index's 175 pages (the planner still preferred that to reading the 2,062-page table, since the query only counted rows).

#### Covering: skipping the table

On the same PostgreSQL table, with an index on `(country, city)`:

```text
EXPLAIN SELECT city FROM people WHERE country = 'IN' AND city = 'Pune';
 Index Only Scan using people_country_city on people

EXPLAIN SELECT name FROM people WHERE country = 'IN' AND city = 'Pune';
 Bitmap Heap Scan on people
   ->  Bitmap Index Scan on people_country_city
```

The first query needs only indexed columns, so the table is never read. The second needs `name`, so each match is fetched from the table; here that meant visiting all 2,062 table pages for 5,714 rows. An index on `(country, city) INCLUDE (name)` would make it index-only as well, at the cost of a bigger index.

#### Choosing column order

For queries `WHERE status = ? AND created_at > ? ORDER BY created_at`, the index `(status, created_at)` seeks by status, reads a contiguous date range, and returns rows already sorted. The reverse order `(created_at, status)` would scan the whole date range and filter status.

#### Pitfalls

- Creating separate single-column indexes on a and b and expecting them to behave like `(a, b)`: the database can combine them (bitmap AND), but less efficiently.
- Putting a low-selectivity column first when queries rarely filter on it.
- Covering indexes that include many wide columns: they duplicate the table and slow every write.

Connects to: B-trees and B+ trees, clustered vs non-clustered indexes, when indexes hurt, query plans.

### questions
Q: What is the leftmost prefix rule?
A: A composite index on columns a, b, c is sorted by a, then b, then c, so it can be searched only through a leading prefix of its columns: a, or a and b, or all three. A condition on b or c alone cannot use it for a seek, because matching entries are scattered across the index.

Q: What is a covering index and why is it fast?
A: An index that contains every column a query reads, both in its conditions and in its output. The database answers the query from the index alone, an index-only scan, without fetching rows from the table, avoiding many random page reads.

Q: How should you order columns in a composite index?
A: Put columns compared with equality first and a column used for a range or for sorting last, matching the most frequent queries. Among equality columns, prefer ones that queries always filter on; the index then serves those queries and their prefixes.

Q: Can an index on (a, b) be used for WHERE b = 5?
A: Not for a seek, since b values are scattered across all values of a. Some databases scan the whole index if it is smaller than the table, and some can skip through distinct values of a, but a separate index starting with b is the reliable fix.

Q: Why does a range condition limit the use of later index columns?
A: After a range on a column, entries in the range are ordered by that column first, so values of the next column are not contiguous. The database can only filter later columns entry by entry, not seek on them.

## dbms.indexing.when-indexes-hurt
name: "When indexes hurt"
importance: important
prereqs: [dbms.indexing.composite-and-covering-indexes]
scope: "writes, low selectivity, functions on columns"

### simple
Indexes are not free: each one slows down every write, uses disk and memory, and sometimes the database cannot or should not use it at all. If a query asks for most of the table, reading the table straight through is faster than jumping around an index. And if the query changes the column first, such as lowercasing it, a plain index on that column no longer matches, like looking up "smith" in a phone book that only lists "Smith".

### interview
- **Write-heavy tables**: each index adds work to every insert and delete (and updates of indexed columns), plus logging, page splits and bloat.
- **Low selectivity**: a condition matching a large fraction of rows (a boolean, a status with three values) is cheaper as a sequential scan; the optimizer ignores the index.
- **Functions or expressions on the column**: `WHERE lower(email) = ?`, `WHERE YEAR(created_at) = 2025`, `WHERE price * 1.18 > 100` hide the column. Rewrite as a range (`created_at >= '2025-01-01' AND created_at < '2026-01-01'`) or create an **expression index**.
- **Leading wildcards** `LIKE '%abc'`, **implicit type conversions** (comparing a text column with a number), and some `OR` conditions also prevent index seeks.
- **Small tables**: a scan of a few pages beats any index.
- **Too many or duplicate indexes** (an index on `a` next to one on `(a, b)`) cost writes for nothing; find unused ones in the database's statistics and drop them.

### deep
#### Measured on PostgreSQL 16

A `people` table of 200,000 rows (about 2,062 pages), with indexes on `email`, `(country, city)` and `active` (true for 90% of rows), analyzed:

```sql
EXPLAIN (COSTS OFF) SELECT * FROM people WHERE email = 'User4242@example.com';
EXPLAIN (COSTS OFF) SELECT * FROM people WHERE lower(email) = 'user4242@example.com';
EXPLAIN (COSTS OFF) SELECT * FROM people WHERE email LIKE '%4242@example.com';
EXPLAIN (COSTS OFF) SELECT * FROM people WHERE active;
EXPLAIN (COSTS OFF) SELECT * FROM people WHERE NOT active;
```

| query | plan |
|---|---|
| `email = '...'` | Index Scan using people_email |
| `lower(email) = '...'` | Parallel Seq Scan with a filter |
| `email LIKE '%4242@example.com'` | Seq Scan with a filter |
| `active` (90% of rows) | Seq Scan |
| `NOT active` (10% of rows) | Bitmap Index Scan on people_active, then Bitmap Heap Scan |

After `CREATE INDEX people_lower_email ON people (lower(email))`, the `lower(email)` query became an Index Scan using that expression index. The `active` index is used only for the rare value; for the common one it is pure write overhead.

#### Why the optimizer skips a matching index

Each index match costs a random page read in the table, while a sequential scan reads pages in order, much faster per page. When the matches are spread over most of the table's pages anyway, the scan wins. The crossover is often at a few percent of rows, depending on how well the table's physical order correlates with the index.

#### Finding indexes that hurt

- PostgreSQL: `pg_stat_user_indexes.idx_scan = 0` over a long period marks unused indexes.
- MySQL: `sys.schema_unused_indexes` and `sys.schema_redundant_indexes`.
- Look for indexes that are prefixes of other indexes, and for indexes on columns no query filters or sorts on.

Connects to: why indexes, composite and covering indexes, query plans, denormalization.

### questions
Q: When would a database ignore an index on the filtered column?
A: When the condition matches a large share of rows, so random lookups through the index would read more pages than a sequential scan; when the table is tiny; when statistics are stale; or when the query wraps the column in a function, uses a leading wildcard, or forces a type conversion so the index does not apply.

Q: Why does WHERE YEAR(created_at) = 2025 not use an index on created_at, and how do you fix it?
A: The index is sorted by created_at, not by the result of YEAR, so the database must compute the function for every row. Rewrite the condition as a range, created_at from the start of 2025 up to but not including the start of 2026, or create an expression index on the function.

Q: How do indexes slow down writes?
A: Every insert and delete must add or remove an entry in every index on the table, and updates must change entries in indexes on modified columns, each possibly splitting pages and generating log records. Many indexes can multiply the cost of a write several times.

Q: Is an index on a boolean column useful?
A: Usually not, because each value matches a large fraction of the table and a scan is cheaper. It helps only when one value is rare and queries look for that value; a partial index on just the rare rows is often better.

## dbms.indexing.query-plans
name: "Query plans"
importance: important
prereqs: [dbms.indexing.why-indexes]
scope: "reading EXPLAIN output"

### simple
A query plan is the step-by-step recipe the database chooses for running your SQL: which tables to read, which indexes to use, and how to join and sort. EXPLAIN shows you that recipe, and EXPLAIN ANALYZE runs the query and shows how long each step really took. It is like asking a navigation app to show its route before you drive, and then comparing the planned times with what actually happened.

### interview
- The **optimizer** turns SQL into a tree of operators (scans, joins, sorts, aggregates), estimates each option's cost from **table statistics**, and picks the cheapest plan.
- **EXPLAIN** shows the chosen plan with estimated cost and rows; **EXPLAIN ANALYZE** (PostgreSQL) executes it and adds actual rows, loops and time per node.
- Read the tree from the **innermost (most indented) nodes up**: they produce rows for their parents. Look for **Seq Scan** on big tables where an index was expected, **big gaps between estimated and actual rows** (stale statistics or correlated columns), expensive **sorts**, and nested loops over many rows.
- Access paths: Seq Scan, Index Scan, **Index Only Scan**, Bitmap Index Scan plus Bitmap Heap Scan (many matches, fetched in page order). Joins: Nested Loop, Hash Join, Merge Join.
- MySQL `EXPLAIN` is a table: `type` (from best: `const`, `eq_ref`, `ref`, `range`, `index`, and `ALL` for a full scan), `key` (index used), `rows` (estimate), `Extra` (`Using index` means covering, `Using filesort`, `Using temporary`).
- Fixes: add or change indexes, rewrite predicates, refresh statistics (`ANALYZE`), and only rarely force plans.

### deep
#### A plan, node by node

On the PostgreSQL `people` table (200,000 rows), `EXPLAIN ANALYZE SELECT name FROM people WHERE country = 'IN' AND city = 'Pune'` produced this tree (numbers from one run):

```text
Bitmap Heap Scan on people                       estimated rows 5661, actual rows 5714
  Recheck Cond: ((country = 'IN') AND (city = 'Pune'))
  Heap Blocks: exact=2062
  ->  Bitmap Index Scan on people_country_city   estimated rows 5661, actual rows 5714
        Index Cond: ((country = 'IN') AND (city = 'Pune'))
Execution Time: about 5 ms
```

Read it bottom-up:

1. **Bitmap Index Scan** searched the composite index for the matching entries and built a bitmap of the table pages holding them.
2. **Bitmap Heap Scan** read those pages in physical order and returned the rows. `Heap Blocks: exact=2062` means it touched every page of the table, because the matching rows are spread evenly.
3. The estimate (5,661) was close to reality (5,714), so the statistics are healthy. A bad estimate, say 10 estimated and 50,000 actual, is the most common reason for a bad plan.

The full output also shows `cost=startup..total` in arbitrary units (roughly page reads), used to compare plans, and actual times in milliseconds.

#### MySQL's EXPLAIN in one line

| column | meaning | look for |
|---|---|---|
| `type` | access method | `ALL` (full scan) on a big table |
| `possible_keys` / `key` | indexes considered / chosen | `NULL` key when you expected one |
| `rows` | estimated rows examined | large numbers |
| `Extra` | details | `Using filesort`, `Using temporary`; `Using index` is good (covering) |

#### A tuning loop

1. Find slow queries (slow query log, `pg_stat_statements`).
2. Run `EXPLAIN ANALYZE` on a realistic copy of the data (plans depend on data size and statistics).
3. Find the node where time or rows explode.
4. Change one thing: an index, a rewritten predicate, fresh statistics.
5. Compare the new plan and timing.

Connects to: why indexes, when indexes hurt, composite and covering indexes, join algorithms, relational algebra.

### questions
Q: What is the difference between EXPLAIN and EXPLAIN ANALYZE?
A: EXPLAIN shows the plan the optimizer would choose with its estimated costs and row counts, without running the query. EXPLAIN ANALYZE actually executes the query and reports actual row counts, loops and timings for each step next to the estimates.

Q: How do you read a PostgreSQL query plan?
A: It is a tree: each node receives rows from the more indented nodes beneath it, so you read from the innermost nodes outward. For each node, compare estimated and actual rows, note the access method and the time spent, and look for full scans of large tables, large sorts and big estimate errors.

Q: What does a large difference between estimated and actual rows indicate?
A: The optimizer's statistics are stale or cannot capture the data, for example correlated columns or skewed values, so it may choose a poor plan such as a nested loop over far more rows than expected. Running ANALYZE, adding extended statistics or rewriting the query often helps.

Q: What do type ALL and Using filesort mean in MySQL EXPLAIN output?
A: Type ALL means a full table scan, reading every row. Using filesort means MySQL must sort the rows itself because no index provides the requested order. Both are warning signs on large tables.

## dbms.indexing.join-algorithms
name: "Join algorithms"
importance: advanced
prereqs: [dbms.indexing.query-plans]
scope: "nested loop, hash join, sort-merge join"

### simple
To join two tables, the database has three basic strategies: compare every row with every other row, build a lookup table from the smaller side and probe it with the larger, or sort both sides and walk through them together. It is like matching guests to name tags: check every tag for every guest, sort the tags into labelled boxes first, or line both groups up alphabetically. The optimizer picks whichever is cheapest for the data.

### interview
- **Nested loop join**: for each row of the outer table, scan the inner one: $O(n \cdot m)$. Fine when the outer side is tiny. **Index nested loop**: look up each outer row in an index on the inner join column: $O(n \log m)$; the best plan for small result sets.
- **Hash join**: **build** a hash table on the smaller input's join key, then **probe** it with each row of the larger input: $O(n + m)$. Only for **equality** joins; needs memory (spills to disk in partitions, the **grace** hash join, when it does not fit).
- **Sort-merge join**: sort both inputs on the join key (or use indexes that are already sorted), then merge in one pass: $O(n \log n + m \log m)$, or $O(n + m)$ if pre-sorted. Handles equality and can support range-style join conditions; output is sorted.
- The optimizer chooses from estimated sizes, available indexes, memory and whether sorted output is useful. MySQL added hash joins in 8.0.18; PostgreSQL has all three.
- Join order matters as much as the algorithm: the optimizer searches over orders (dynamic programming for small numbers of tables).

### deep
#### Code: three algorithms, one answer

```cpp
struct Order { int id, customer; };
struct Customer { int id; string name; };

int main() {
    vector<Customer> customers;
    for (int c = 0; c < 100; ++c) customers.push_back({c, "customer" + to_string(c)});
    vector<Order> orders;
    for (int o = 0; o < 1000; ++o) orders.push_back({o, (o * 37) % 120});   // some ids unknown

    long work = 0, matches = 0;
    for (auto& o : orders)                           // nested loop
        for (auto& c : customers) {
            ++work;
            if (o.customer == c.id) ++matches;
        }
    printf("nested loop: %ld comparisons, %ld matches\n", work, matches);

    work = matches = 0;
    unordered_map<int, const Customer*> table;       // hash join: build on the smaller side
    for (auto& c : customers) table[c.id] = &c, ++work;
    for (auto& o : orders) {                         // probe with the larger side
        ++work;
        if (table.count(o.customer)) ++matches;
    }
    printf("hash join:   %ld build and probe steps, %ld matches\n", work, matches);

    work = matches = 0;
    auto byCustomer = orders;                        // sort-merge (customers already sorted)
    sort(byCustomer.begin(), byCustomer.end(),
         [&](auto& a, auto& b) { ++work; return a.customer < b.customer; });
    long sortWork = work;
    size_t i = 0, j = 0;
    while (i < byCustomer.size() && j < customers.size()) {
        ++work;
        if (byCustomer[i].customer < customers[j].id) ++i;
        else if (byCustomer[i].customer > customers[j].id) ++j;
        else ++matches, ++i;                         // customer ids are unique: keep j
    }
    printf("sort-merge:  %ld sort comparisons + %ld merge steps, %ld matches\n", sortWork,
           work - sortWork, matches);
}
```

Output:

```text
nested loop: 100000 comparisons, 834 matches
hash join:   1100 build and probe steps, 834 matches
sort-merge:  10942 sort comparisons + 934 merge steps, 834 matches
```

All three find the same 834 matching pairs (orders whose customer id is between 0 and 99). The sort comparison count is from GCC's standard library; other implementations differ slightly. The nested loop does the product of the sizes; the hash join touches each row about once; sort-merge pays mostly for sorting, and its merge is linear. If both inputs were already sorted, for example read through B+ tree indexes, sort-merge would cost only the merge.

#### When each wins

| situation | likely plan |
|---|---|
| few outer rows, index on the inner join column | index nested loop |
| large inputs, equality join, enough memory for the smaller side | hash join |
| inputs already sorted (indexes), or sorted output needed for ORDER BY or GROUP BY | merge join |
| tiny tables | nested loop |
| non-equality join such as `a.x < b.y` | nested loop (sometimes merge) |

Connects to: query plans, merge sort, hash table internals, inner join, relational algebra.

### questions
Q: Describe the three main join algorithms.
A: A nested loop join compares each row of one input with every row of the other, or looks each up in an index. A hash join builds a hash table on the smaller input's join key and probes it with the larger input. A sort-merge join sorts both inputs on the join key and merges them in one pass.

Q: When is a hash join better than a nested loop join?
A: When both inputs are large and the join is on equality: the hash join costs about the sum of the input sizes, while a nested loop without a useful index costs their product. With few outer rows and an index on the inner join column, an index nested loop is usually better.

Q: What are the limitations of a hash join?
A: It works only for equality conditions, needs memory for the hash table on the build side, and must partition and spill to disk when that side does not fit, which adds I/O. It also produces unsorted output.

Q: When does the optimizer choose a merge join?
A: When both inputs are already sorted on the join key, for example read through B+ tree indexes, or when sorted output is useful for a later ORDER BY or GROUP BY, so the sort cost is paid once or not at all.

## dbms.indexing.lsm-trees
name: "LSM trees"
importance: advanced
prereqs: [dbms.indexing.b-trees-and-b-plus-trees]
scope: "write-optimized storage (links to NoSQL)"

### simple
An LSM tree makes writes fast by never updating data in place: new writes go into a sorted table in memory, which is written to disk as a new file when it fills up. Reads check the newest data first and work backwards, and a background process merges old files together. It is like writing notes on sticky pads and periodically filing whole pads into a binder, instead of rewriting the binder for every note.

### interview
- **Write path**: append to a **write-ahead log** (for durability), insert into the **memtable** (a sorted in-memory structure); when full, **flush** it as an immutable sorted file, an **SSTable**. All disk writes are sequential.
- **Read path**: check the memtable, then SSTables from **newest to oldest**; the first hit wins. **Bloom filters** per SSTable skip files that cannot contain the key; sparse indexes locate the block inside a file.
- **Deletes** write a **tombstone**; the old value disappears only when compaction merges the files.
- **Compaction** merges SSTables, keeping the newest version of each key and dropping tombstones and overwritten values. **Size-tiered** (merge similar-sized files; less write amplification) vs **leveled** (non-overlapping levels; less space and read amplification).
- Trade-off vs B+ trees: much higher write throughput and better compression, at the cost of **read amplification**, **write amplification** from repeated compaction, and background I/O spikes.
- Used by LevelDB, RocksDB, Cassandra, HBase, ScyllaDB and many time-series stores; MyRocks puts MySQL on RocksDB.

### deep
#### Code: a tiny LSM tree

```cpp
using Value = optional<string>;                      // nullopt is a tombstone (a delete)

struct Lsm {
    map<string, Value> memtable;
    vector<map<string, Value>> sstables;             // oldest first; each one immutable
    static constexpr size_t FLUSH_AT = 3;

    void put(const string& k, Value v) {
        memtable[k] = std::move(v);
        if (memtable.size() >= FLUSH_AT) {           // flush: write one sorted file
            sstables.push_back(memtable);
            memtable.clear();
        }
    }
    pair<Value, int> get(const string& k) const {    // value and number of files checked
        if (auto it = memtable.find(k); it != memtable.end()) return {it->second, 0};
        int checked = 0;
        for (auto t = sstables.rbegin(); t != sstables.rend(); ++t) {   // newest first
            ++checked;
            if (auto it = t->find(k); it != t->end()) return {it->second, checked};
        }
        return {nullopt, checked};
    }
    void compact() {                                  // merge everything, newest wins
        map<string, Value> merged;
        for (auto& t : sstables)
            for (auto& [k, v] : t) merged[k] = v;
        erase_if(merged, [](auto& e) { return !e.second; });   // drop tombstones
        sstables = {merged};
    }
};

int main() {
    Lsm db;
    db.put("apple", "1");
    db.put("banana", "2");
    db.put("cherry", "3");                           // flush 1
    db.put("apple", "10");
    db.put("date", "4");
    db.put("banana", nullopt);                       // delete banana; flush 2
    db.put("elder", "5");
    auto show = [&](const string& k) {
        auto [v, checked] = db.get(k);
        cout << "  " << k << " = " << v.value_or("(deleted or missing)") << ", files checked "
             << checked << "\n";
    };
    cout << db.sstables.size() << " SSTables:\n";
    for (string k : {"apple", "banana", "cherry", "elder"}) show(k);
    db.compact();
    cout << "after compaction, " << db.sstables.size() << " SSTable with "
         << db.sstables[0].size() << " keys:\n";
    for (string k : {"apple", "banana", "cherry"}) show(k);
}
```

Output:

```text
2 SSTables:
  apple = 10, files checked 1
  banana = (deleted or missing), files checked 1
  cherry = 3, files checked 2
  elder = 5, files checked 0
after compaction, 1 SSTable with 3 keys:
  apple = 10, files checked 1
  banana = (deleted or missing), files checked 1
  cherry = 3, files checked 1
```

`apple` has two versions on disk; the newer file wins. `banana`'s tombstone in the newer file hides its old value. `cherry` needed two file checks: the cost that Bloom filters and compaction keep down. After compaction, one file holds `apple`, `cherry` and `date`, with the old `apple` and the deleted `banana` gone.

#### B+ tree vs LSM tree

| | B+ tree | LSM tree |
|---|---|---|
| writes | update pages in place (random I/O) | append and flush sorted files (sequential I/O) |
| reads | one tree descent | memtable plus several files (Bloom filters help) |
| space | pages partly empty after splits | old versions until compaction; compresses well |
| background work | little | compaction, sometimes heavy |
| typical fit | read-heavy OLTP | write-heavy logs, time series, large key-value stores |

Connects to: B-trees and B+ trees, NoSQL types, Bloom filters, logs and write-ahead logging, merge sort.

### questions
Q: How does an LSM tree handle writes?
A: It appends each write to a write-ahead log and inserts it into an in-memory sorted memtable. When the memtable is full, it is written to disk as an immutable sorted file, an SSTable. Writes never modify existing files, so disk I/O is sequential and fast.

Q: How are reads served in an LSM tree?
A: The memtable is checked first, then SSTables from newest to oldest, and the first version found wins. Bloom filters let the engine skip files that cannot contain the key, and per-file indexes find the right block inside a file.

Q: What is compaction and why is it needed?
A: A background process that merges SSTables, keeping only the newest version of each key and removing deleted keys and overwritten values. Without it, reads would check more and more files and disk space would fill with stale data.

Q: How is a delete implemented in an LSM tree?
A: By writing a tombstone, a special marker saying the key is deleted. Reads that hit the tombstone report the key as missing, and compaction eventually removes both the tombstone and the older values it hides.

Q: When would you choose an LSM-based store over a B+ tree database?
A: For write-heavy workloads such as event logs, metrics, messaging and large key-value stores, where sequential writes and good compression matter more than the fastest reads. Read-heavy transactional workloads usually suit B+ trees better.
