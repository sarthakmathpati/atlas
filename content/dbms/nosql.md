---
topic: dbms.nosql
name: "NoSQL and distributed databases"
subject: dbms
order: 9
prereqs: [dbms.indexing]
---

## dbms.nosql.nosql-types
name: "NoSQL types"
importance: must
scope: "key-value, document, wide-column, graph, and when to use each"

### simple
NoSQL databases store data in shapes other than tables with fixed columns: key-value pairs, documents, wide rows grouped by a key, or graphs of connected nodes. Each shape is built to be very good at a particular kind of question and to spread easily across many machines. It is like choosing between a locker room (key-value), filing folders (documents), ledgers split by customer (wide-column) and a map of friendships (graph).

### interview
- **Key-value** (Redis, DynamoDB, Memcached, etcd): get and put by key, very fast, values opaque to the store. Use for caching, sessions, rate limits, feature flags, leaderboards (Redis sorted sets).
- **Document** (MongoDB, Couchbase, Firestore): JSON-like documents with nested fields, secondary indexes on fields, flexible schema. Use for aggregates read and written together: catalogs, user profiles, content.
- **Wide-column** (Cassandra, HBase, Bigtable, ScyllaDB): rows grouped into partitions by a **partition key** and sorted by **clustering columns** inside the partition; designed for huge write volumes across many nodes. Use for time series, messaging, event logs, IoT.
- **Graph** (Neo4j, Neptune): nodes and edges with properties; queries traverse relationships. Use for social graphs, recommendations, fraud detection, knowledge graphs.
- Also common: **search engines** (Elasticsearch, inverted indexes for full text) and **time-series** databases.
- Design starts from **access patterns**: in wide-column and key-value stores you model tables around the queries, duplicating data per query, because joins are limited or absent.

### deep
#### Intuition

A relational database is a generalist: any question, any join, with strong guarantees on one machine or a few. NoSQL systems specialize: they give up general joins or cross-record transactions to get horizontal scale, flexible schemas or a data model that matches the problem directly.

#### Code: modeling for a query in a wide-column store

The query "show the latest 3 messages in a chat" drives the design: partition by chat (all its messages live together on one node) and cluster by time (sorted within the partition).

```cpp
int main() {
    // Like a Cassandra table with PRIMARY KEY ((chat_id), sent_at): partition, then sort key.
    map<string, map<int, string>> messages;          // chat -> (time -> text), sorted by time
    vector<tuple<string, int, string>> incoming = {
        {"c1", 100, "hi"}, {"c2", 101, "lunch?"}, {"c1", 105, "did you see the notes"},
        {"c1", 110, "yes, page 4"}, {"c2", 111, "12:30"}, {"c1", 120, "thanks"}};
    for (auto& [chat, time, text] : incoming) messages[chat][time] = text;

    auto& chat = messages["c1"];                     // one partition: one node, one seek
    int shown = 0;
    for (auto it = chat.rbegin(); it != chat.rend() && shown < 3; ++it, ++shown)
        cout << it->first << " " << it->second << "\n";
}
```

Output:

```text
120 thanks
110 yes, page 4
105 did you see the notes
```

The query reads one partition, already in time order, however many chats exist. A different question, such as "all messages by a user", would get its own table partitioned by user, and the application writes each message to both tables.

#### Choosing by access pattern

| workload | store type | why |
|---|---|---|
| cache, sessions, counters | key-value | microsecond lookups by key, expiry |
| product catalog with varied attributes | document | flexible fields, whole-document reads |
| chat messages, sensor readings, activity feeds | wide-column | partitioned writes at scale, sorted ranges per key |
| "friends of friends who like X" | graph | multi-hop traversal without joins |
| full-text search | search engine | inverted index, relevance ranking |

#### Pitfalls

- Choosing a NoSQL store for "scale" before the data outgrows one relational database: you lose joins, constraints and transactions early.
- Modeling a wide-column store like a relational schema: every unplanned query becomes a full scan across the cluster.
- Very large or unbounded partitions (all messages of a huge group in one partition) become hot and slow; add time buckets to the partition key.

Connects to: data models, SQL vs NoSQL, sharding and partitioning, LSM trees, CAP theorem.

### questions
Q: What are the main types of NoSQL databases?
A: Key-value stores such as Redis and DynamoDB, document stores such as MongoDB, wide-column stores such as Cassandra and HBase, and graph databases such as Neo4j. Search engines and time-series databases are often counted too. Each trades general querying for scale or a data model suited to particular access patterns.

Q: When would you use a wide-column store like Cassandra?
A: For very high write volumes spread across many nodes with queries that fetch a sorted range within a known partition, such as messages per chat, events per device or time series per sensor. Tables are designed per query, with the partition key and clustering columns chosen to answer it in one partition read.

Q: When is a graph database the right choice?
A: When the questions are about relationships several hops deep, such as friends of friends, shortest paths between accounts or recommendation paths. Traversing edges is direct in a graph store, whereas a relational database would need a join per hop.

Q: Why do NoSQL designs often duplicate data?
A: Many NoSQL stores lack joins or make them expensive across nodes, so data is stored in the shape each query needs, sometimes several copies in different tables or embedded documents. Writes do more work so that reads touch a single partition or document.

Q: What would you use Redis for?
A: As an in-memory key-value store for caching, sessions, rate limiting counters, distributed locks with care, leaderboards with sorted sets, queues and pub/sub. Its data lives in memory, with optional persistence, so it is not usually the system of record.

## dbms.nosql.sql-vs-nosql
name: "SQL vs NoSQL"
importance: must
prereqs: [dbms.nosql.nosql-types]
scope: "schema, scaling, consistency trade-offs"

### simple
SQL databases store data in tables with a fixed structure and strong guarantees, and they let you ask almost any question with joins. NoSQL databases are more flexible in structure and easier to spread across many machines, but you usually design them around the specific questions you will ask. It is like choosing between a well-organized library with a strict catalog and a set of fast, specialized warehouses.

### interview
- **Schema**: SQL has a declared schema (schema on write) with constraints; NoSQL is often schemaless or flexible (schema on read), so the application enforces structure.
- **Queries**: SQL supports ad hoc queries, joins and aggregations; NoSQL queries are usually by key or within a partition, and designs follow known **access patterns**.
- **Scaling**: SQL traditionally scales **vertically** plus read replicas, with sharding added manually or by an extension; many NoSQL systems **shard and replicate automatically** across commodity nodes.
- **Consistency and transactions**: SQL gives **ACID** transactions across rows and tables; many NoSQL systems offer tunable or eventual consistency and transactions only within a partition or document (although MongoDB and DynamoDB now support multi-document transactions).
- The line is blurring: **NewSQL** / distributed SQL (Spanner, CockroachDB, YugabyteDB) scale horizontally with SQL and ACID; PostgreSQL stores and indexes JSON.
- Interview answer: default to a relational database for core business data with relationships and invariants; choose NoSQL for a specific need: massive write throughput, flexible documents, key-based access at scale, graph traversal or caching.

### deep
#### Side by side

| | SQL (relational) | NoSQL (typical) |
|---|---|---|
| data model | tables, rows, typed columns | key-value, documents, wide rows, graphs |
| schema | fixed, migrations for changes | flexible, per record |
| relationships | foreign keys and joins | embedding, duplication, application-side joins |
| query language | SQL, ad hoc | API or query language per product, access-pattern driven |
| transactions | ACID across many rows and tables | often per document or partition; some offer more |
| consistency | strong by default | tunable, often eventual by default |
| scaling writes | a bigger machine, or manual sharding | built-in partitioning across nodes |
| strengths | integrity, complex queries, reporting | scale-out, availability, flexible fields, specialized models |

#### Worked example: two features of one app

A food delivery app:

- **Orders, payments, restaurants, menus**: relationships everywhere (an order has items, belongs to a user and a restaurant), money that must add up, and reports across all of it. Relational, with ACID transactions.
- **Courier location pings**: millions of small writes per minute, queried as "latest positions of this courier" and expired after a day. A wide-column or time-series store partitioned by courier, or a key-value store for the latest position.
- **Session and cart cache**: a key-value store with expiry.

Many real systems use several stores (polyglot persistence) and keep them in sync with change data capture.

#### Common misconceptions

- "NoSQL has no schema": the schema still exists, just in application code, where it is harder to enforce and migrate.
- "SQL cannot scale": single relational databases handle very large workloads, and distributed SQL scales horizontally; what is hard is scaling **cross-shard joins and transactions**, in any system.
- "NoSQL is always faster": it is fast for the access patterns it was designed for and slow or impossible for others.

Connects to: NoSQL types, CAP theorem, BASE vs ACID, sharding and partitioning, denormalization.

### questions
Q: What are the main differences between SQL and NoSQL databases?
A: SQL databases use a fixed relational schema with joins, ad hoc queries and ACID transactions, and traditionally scale vertically. NoSQL databases use other data models with flexible schemas, are designed around specific access patterns, often scale horizontally by built-in sharding, and frequently offer tunable or eventual consistency.

Q: When would you choose a NoSQL database over a relational one?
A: When a workload needs horizontal scale beyond one machine for writes, flexible or rapidly changing record structures, very fast key-based access, or a model like a graph that fits the queries directly, and when the queries are known in advance. Core data with relationships and invariants usually stays relational.

Q: Can relational databases scale horizontally?
A: Yes, with read replicas, application or middleware sharding, extensions such as Citus, or distributed SQL systems like Spanner and CockroachDB. The hard part is not SQL itself but keeping joins and transactions efficient across shards.

Q: What does schemaless really mean?
A: The database does not enforce a structure, but the application still depends on one. Validation, defaults and migrations move into code, and old records with old shapes must be handled when reading.

## dbms.nosql.cap-theorem
name: "CAP theorem"
importance: must
prereqs: [dbms.nosql.sql-vs-nosql]
scope: "consistency, availability, partition tolerance"

### simple
The CAP theorem says that when the network between database servers breaks, a distributed database must choose: stay correct by refusing some requests, or keep answering everyone and risk giving out-of-date answers. It cannot do both during the break. It is like two branch offices whose phone line is cut: either they stop taking bookings until the line is back, or they keep booking and risk selling the same seat twice.

### interview
- **C (consistency)**: linearizability: every read sees the most recent completed write, as if there were one copy.
- **A (availability)**: every request to a non-failing node gets a non-error response.
- **P (partition tolerance)**: the system keeps working despite lost messages between nodes.
- Partitions happen in any real network, so the real choice is **during a partition**: **CP** (refuse or delay some requests to stay consistent: ZooKeeper, etcd, HBase, Spanner) or **AP** (keep answering, reconcile later: Cassandra, DynamoDB's default reads, Riak).
- "Pick two of three" is misleading: without a partition, a system can be both consistent and available.
- **PACELC** extends it: if Partition, choose A or C; **E**lse choose **L**atency or **C**onsistency (synchronous replication costs latency even when all is well).
- Many systems make it tunable per request (quorum sizes, read consistency levels).

### deep
#### Code: a partition, two policies

Two replicas of one value. The network between them breaks, and clients write to each side.

```cpp
struct Replica { int value = 0; long long stamp = 0; };

void scenario(bool preferConsistency) {
    Replica a, b;
    bool partitioned = false;
    long long clock = 0;
    auto write = [&](Replica& to, Replica& other, int value) -> string {
        if (partitioned && preferConsistency) return "rejected";   // cannot reach the peer
        to = {value, ++clock};
        if (!partitioned) other = to;                // replicate while connected
        return "ok";
    };
    cout << (preferConsistency ? "CP:" : "AP:") << "\n";
    cout << "  write 1 via A: " << write(a, b, 1) << "\n";
    partitioned = true;
    cout << "  partition; write 2 via A: " << write(a, b, 2) << ", write 3 via B: "
         << write(b, a, 3) << "\n";
    cout << "  reads during the partition: A=" << a.value << " B=" << b.value << "\n";
    partitioned = false;                             // heal: last writer wins
    Replica winner = a.stamp >= b.stamp ? a : b;
    a = b = winner;
    cout << "  after healing: A=" << a.value << " B=" << b.value << "\n";
}

int main() {
    scenario(true);
    scenario(false);
}
```

Output:

```text
CP:
  write 1 via A: ok
  partition; write 2 via A: rejected, write 3 via B: rejected
  reads during the partition: A=1 B=1
  after healing: A=1 B=1
AP:
  write 1 via A: ok
  partition; write 2 via A: ok, write 3 via B: ok
  reads during the partition: A=2 B=3
  after healing: A=3 B=3
```

The CP system stayed correct but turned writes away. The AP system accepted both writes, served different answers on each side, and on healing kept the later write, silently discarding the write of 2. With three or more nodes, a CP system can keep the **majority** side available and reject only the minority, which is what consensus-based systems do.

#### Choosing per feature

| feature | better choice | why |
|---|---|---|
| bank balance, inventory count, unique usernames | CP | wrong answers cost money or break invariants |
| social feed, likes, product reviews | AP | a slightly stale view is fine; downtime is not |
| shopping cart | AP with merge | keep accepting adds; merge carts on healing |
| leader election, configuration, locks | CP | two leaders would be a disaster |

#### Pitfalls

- Saying a system is "CA": if nodes communicate over a network, partitions will happen; CA only describes a single node.
- Equating CAP's C with ACID's C: CAP's consistency is about replicas agreeing (linearizability), ACID's about constraints.
- Ignoring the normal case: most of the time the real trade-off is latency against consistency (PACELC).

Connects to: replication, BASE vs ACID, consistent hashing, CAP theorem in practice, distributed transactions.

### questions
Q: What does the CAP theorem state?
A: A distributed data store cannot simultaneously guarantee consistency, meaning every read sees the latest write, availability, meaning every request to a working node gets a response, and partition tolerance. Since network partitions cannot be ruled out, during a partition the system must give up either consistency or availability.

Q: What is the difference between CP and AP systems? Give examples.
A: During a partition, a CP system refuses or delays requests that could return stale or conflicting data, as ZooKeeper, etcd, HBase and Spanner do. An AP system keeps serving reads and writes on every reachable node and reconciles divergent copies afterwards, as Cassandra and Riak do by default.

Q: Why is choose two of three a misleading summary of CAP?
A: Partition tolerance is not optional for a distributed system, and the trade-off only applies while a partition exists. Without partitions a system can be consistent and available; many systems also let each request choose its consistency level.

Q: What is PACELC?
A: An extension of CAP: if there is a partition, choose between availability and consistency; else, in normal operation, choose between latency and consistency. It captures that synchronous replication for strong consistency costs latency even when the network is healthy.

Q: Would you design a payment ledger as CP or AP?
A: CP. Accepting conflicting writes on both sides of a partition could double-spend or lose money, and reconciling afterwards is painful. It is better to reject or delay some requests during a partition, usually by requiring a majority quorum.

## dbms.nosql.base-vs-acid
name: "BASE vs ACID"
importance: important
prereqs: [dbms.nosql.cap-theorem]
scope: "eventual consistency"

### simple
ACID databases promise that every transaction is complete, correct and immediately visible to everyone. BASE systems promise less: they stay available, their data may be briefly out of sync between copies, and all copies agree eventually. It is like a group chat where a message may reach one phone a moment before another, but everyone sees the same conversation in the end.

### interview
- **BASE**: **B**asically **A**vailable (answers even during failures, possibly with stale data), **S**oft state (replicas may change without new input as they converge), **E**ventual consistency (if writes stop, all replicas converge to the same value).
- **ACID** prioritizes correctness and isolation; **BASE** prioritizes availability and scale. They sit at two ends of a spectrum rather than being opposites.
- Useful guarantees between the two: **read-your-writes**, **monotonic reads** (never go back in time), **causal consistency** (effects never appear before causes), bounded staleness.
- **Conflict resolution** when replicas accept concurrent writes: last-writer-wins (simple, loses data), version vectors to detect conflicts and merge in the application, and **CRDTs** (data types whose merges always converge: counters, sets, registers).
- Design techniques: idempotent operations, append-only events, compensating actions instead of rollback, and showing users "pending" states.

### deep
#### Code: a counter that converges

Three replicas count likes while they cannot talk to each other. A **G-counter** (grow-only counter CRDT) keeps one slot per replica; merging takes the maximum of each slot, so merges can happen in any order, any number of times.

```cpp
struct GCounter {
    map<string, int> slots;                          // replica -> its own increments
    void increment(const string& replica, int n) { slots[replica] += n; }
    int value() const {
        int sum = 0;
        for (auto& [r, n] : slots) sum += n;
        return sum;
    }
    void merge(const GCounter& other) {              // commutative, associative, idempotent
        for (auto& [r, n] : other.slots) slots[r] = max(slots[r], n);
    }
};

int main() {
    GCounter a, b, c;
    a.increment("A", 3);                             // likes seen by each replica
    b.increment("B", 2);
    c.increment("C", 1);
    cout << "before syncing: " << a.value() << " " << b.value() << " " << c.value() << "\n";
    a.merge(b);                                      // gossip in some order...
    c.merge(a);
    b.merge(c);
    a.merge(c);
    a.merge(c);                                      // ...even repeated
    cout << "after syncing:  " << a.value() << " " << b.value() << " " << c.value() << "\n";

    int lastWriterWins = 0;                          // a plain integer with last-writer-wins
    for (int local : {3, 2, 1}) lastWriterWins = local;
    cout << "a plain register would keep: " << lastWriterWins << "\n";
}
```

Output:

```text
before syncing: 3 2 1
after syncing:  6 6 6
a plain register would keep: 1
```

Every replica ends at 6, whatever the order of merges. Storing a single number and keeping the latest write would have kept only one replica's view and lost five likes.

#### ACID vs BASE

| | ACID | BASE |
|---|---|---|
| goal | correctness, isolation | availability, scale |
| after a write | everyone sees it at once | replicas converge over time |
| during failures | may refuse requests | keeps answering, possibly stale |
| conflicts | prevented (locks, aborts) | resolved later (merge rules, CRDTs) |
| typical use | payments, orders, inventory | feeds, counters, carts, presence |

Connects to: CAP theorem, replication, ACID properties, SQL vs NoSQL.

### questions
Q: What does BASE stand for?
A: Basically available, soft state, eventually consistent: the system keeps responding even during failures, replicas may temporarily hold different values that change as they sync, and without new writes all replicas eventually converge.

Q: What is eventual consistency?
A: A guarantee that if no new updates are made, all replicas will eventually return the same value. It does not say how long that takes or what readers see in the meantime, so applications may read stale data.

Q: How are conflicting concurrent writes resolved in eventually consistent systems?
A: By last-writer-wins using timestamps, which is simple but loses data; by version vectors that detect concurrent versions and let the application merge them; or by CRDTs, data types designed so that merging replicas in any order always converges to the same result.

Q: What consistency guarantees fit between eventual and strong consistency?
A: Read-your-writes, where a client always sees its own updates; monotonic reads, where a client never sees older data after newer; causal consistency, where related updates appear in cause-and-effect order; and bounded staleness, where reads lag by at most a set time or number of versions.

## dbms.nosql.replication
name: "Replication"
importance: must
scope: "leader-follower, multi-leader, leaderless"

### simple
Replication keeps copies of the same data on several machines, so the system survives a machine failing and can serve more reads. One design has a single leader that takes all writes and passes them to followers; others let several machines accept writes. It is like a teacher writing on the board while students copy it into their notebooks: anyone can read a notebook, but only the teacher changes the lesson.

### interview
- **Leader-follower** (primary-replica): all writes go to the leader, which streams its log to followers; reads can go to followers. Simple and common (PostgreSQL, MySQL, MongoDB replica sets).
- **Synchronous** replication waits for followers before confirming a write (no data loss on failover, higher latency, blocked if a follower is down); **asynchronous** does not (fast, but recent writes can be lost on failover). Semi-synchronous: wait for one follower.
- **Replication lag** causes stale follower reads: fix with **read-your-writes** (read from the leader after writing), **monotonic reads** (stick a user to one replica).
- **Failover**: detect leader failure, promote the most up-to-date follower, redirect clients; risks include lost writes and **split brain** (two leaders), avoided with consensus and fencing.
- **Multi-leader**: several nodes accept writes (multiple data centers, offline clients); needs **conflict resolution**.
- **Leaderless** (Dynamo-style: Cassandra, Riak): clients write to and read from several replicas; **quorums** with $W + R > N$ make read and write sets overlap. Repairs through **read repair** and anti-entropy; **hinted handoff** covers temporarily down nodes.

### deep
#### Code: why W + R > N works

With N replicas, a write is confirmed after W acknowledge it and a read asks R replicas. The program counts how many possible read sets miss every replica holding the latest write.

```cpp
int main() {
    const int n = 3;
    for (auto [w, r] : vector<pair<int, int>>{{1, 1}, {2, 1}, {2, 2}, {3, 1}, {1, 3}}) {
        unsigned written = (1u << w) - 1;            // the latest write reached w replicas
        int stale = 0, readSets = 0;
        for (unsigned mask = 0; mask < (1u << n); ++mask) {
            if (popcount(mask) != r) continue;       // every possible choice of r replicas
            ++readSets;
            if (!(mask & written)) ++stale;          // no overlap: a stale read is possible
        }
        printf("N=%d W=%d R=%d (W+R %s N): %d of %d read sets can miss the latest write\n", n,
               w, r, w + r > n ? "> " : "<=", stale, readSets);
    }
}
```

Output:

```text
N=3 W=1 R=1 (W+R <= N): 2 of 3 read sets can miss the latest write
N=3 W=2 R=1 (W+R <= N): 1 of 3 read sets can miss the latest write
N=3 W=2 R=2 (W+R >  N): 0 of 3 read sets can miss the latest write
N=3 W=3 R=1 (W+R >  N): 0 of 3 read sets can miss the latest write
N=3 W=1 R=3 (W+R >  N): 0 of 1 read sets can miss the latest write
```

When $W + R > N$, any read set and write set share at least one replica, so a read always meets the latest version (taking the highest version number among replies). N = 3, W = 2, R = 2 is the common balanced choice; W = N, R = 1 makes reads cheap but writes fail if any replica is down.

#### Leader-follower in one picture

```text
client writes ──> leader ──log──> follower 1 ──> reads
                      └────log──> follower 2 ──> reads (may lag behind)
```

#### Comparing the designs

| | leader-follower | multi-leader | leaderless |
|---|---|---|---|
| who accepts writes | one leader | several leaders | any replica (quorum) |
| write conflicts | none | yes: must be resolved | yes: versions and repair |
| failover | promote a follower | other leaders keep going | none needed |
| typical use | most OLTP databases | multi-region, offline apps | high-availability key-value stores |

#### Pitfalls

- Reading from followers right after writing to the leader: users "lose" what they just saved. Route those reads to the leader or wait for the replica to catch up.
- Treating replication as a backup: a mistaken `DELETE` replicates instantly. Keep backups and point-in-time recovery separately.
- Quorums are not linearizability: with sloppy quorums, concurrent writes and clock-based resolution, stale reads remain possible at the edges.

Connects to: CAP theorem, BASE vs ACID, sharding and partitioning, logs and write-ahead logging, replication in practice.

### questions
Q: How does leader-follower replication work?
A: One node, the leader, receives all writes and records them in its log, which it streams to follower nodes that apply the same changes. Reads can be served by followers to scale read traffic, and if the leader fails, a follower is promoted.

Q: What is the difference between synchronous and asynchronous replication?
A: Synchronous replication confirms a write only after followers have stored it, so no confirmed write is lost if the leader fails, but writes are slower and can stall if a follower is unavailable. Asynchronous replication confirms immediately and ships changes later, which is faster but can lose recent writes on failover and lets followers lag.

Q: What is replication lag and how do you handle it?
A: The delay before a follower applies the leader's latest writes, so reads from it may be stale. Techniques include reading your own recent writes from the leader, pinning a user to one replica for monotonic reads, and routing reads to replicas only when their lag is small.

Q: Why does W + R > N give consistent reads in leaderless replication?
A: A write succeeds only after W of the N replicas store it and a read queries R replicas; if W plus R exceeds N, the two sets must overlap in at least one replica, so the read always sees the latest successful write, identified by its version.

Q: What is split brain and how is it prevented?
A: Two nodes both believing they are the leader and accepting writes, for example after a network partition, which leads to divergent data. It is prevented by electing leaders through a consensus protocol with majority quorums and by fencing tokens that make the old leader's writes rejected.

## dbms.nosql.sharding-and-partitioning
name: "Sharding and partitioning"
importance: must
scope: "range vs hash partitioning, hot spots"

### simple
Sharding splits one big dataset across many machines, each holding a slice, so no single machine has to store or serve everything. You pick a shard key, like user id, to decide which machine each record lives on. A good key spreads the work evenly; a bad one sends most of the traffic to one overloaded machine, like a supermarket where everyone lines up at the same checkout.

### interview
- **Partitioning** splits data into pieces; **sharding** usually means placing those pieces on different nodes (horizontal partitioning). **Vertical** partitioning splits columns or tables instead.
- **Range partitioning**: contiguous key ranges per shard (A–F, G–M...). Efficient range scans; risk of **hot spots** with sequential keys (timestamps, auto-increment ids all hit the last shard).
- **Hash partitioning**: shard = hash(key) mod N or a hash range. Even spread; no efficient range queries on the key; naive mod N moves most keys when N changes (use consistent hashing or many fixed partitions).
- **Directory-based**: a lookup service maps keys to shards; flexible, but the directory must be fast and highly available.
- **Choosing the shard key**: high cardinality, even distribution, and present in most queries so they hit **one shard**. Cross-shard queries become **scatter-gather**; cross-shard transactions need 2PC or sagas.
- **Hot keys** (a celebrity's account) need special handling: split the key with a suffix, cache it, or give it its own shard. **Secondary indexes** are either local (query all shards) or global (partitioned by the indexed value, updated asynchronously).

### deep
#### Code: sequential keys under range vs hash partitioning

Four shards. Orders get increasing ids, and the busiest data is always the newest: the last 1,000 orders.

```cpp
uint64_t hashOf(const string& s) {                   // FNV-1a, then a SplitMix64 finalizer
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : s) h = (h ^ c) * 1099511628211ULL;
    h ^= h >> 30, h *= 0xbf58476d1ce4e5b9ULL;         // the finalizer spreads every input bit
    h ^= h >> 27, h *= 0x94d049bb133111ebULL;         // over the whole 64-bit result
    return h ^ (h >> 31);
}

int main() {
    const int shards = 4;
    array<int, shards> byRange{}, byHash{};
    for (int id = 999000; id < 1000000; ++id) {      // the newest 1,000 orders
        byRange[id / 250000]++;                      // shard k holds ids [250000k, 250000(k+1))
        byHash[hashOf(to_string(id)) % shards]++;
    }
    cout << "range partitioning:";
    for (int n : byRange) cout << " " << setw(4) << n;
    cout << "\nhash partitioning: ";
    for (int n : byHash) cout << " " << setw(4) << n;
    cout << "\n";
}
```

Output:

```text
range partitioning:    0    0    0 1000
hash partitioning:   260  239  242  259
```

With range partitioning on an increasing id, every new order (and most reads, which favor recent orders) lands on the last shard while the others sit idle. Hashing spreads them almost evenly, at the cost of making "orders 999,000 to 999,999" a query to every shard.

#### Picking a key: an example

A multi-tenant SaaS app shards by `tenant_id`:

- Almost every query includes the tenant, so it hits one shard.
- Transactions stay within one tenant, so they stay on one shard.
- One giant tenant can overload its shard: move it to a dedicated shard or sub-partition it by `(tenant_id, user_id)`.

Sharding by `created_at` would have been a hot spot; sharding by `user_id` would split every tenant across all shards.

#### Rebalancing

Adding nodes means moving data. Common strategies: many more partitions than nodes (say 1,000 fixed partitions), moving whole partitions between nodes; splitting ranges that grow too big (Bigtable, HBase, MongoDB); or consistent hashing with virtual nodes. Moves should be throttled so they do not overload the cluster.

#### Pitfalls

- Sharding too early: it adds cross-shard complexity that a single well-indexed database might not need for years.
- A shard key missing from most queries: every request becomes scatter-gather.
- `hash(key) % N` without a plan for changing N.

Connects to: consistent hashing, replication, distributed transactions, sharding strategies, CAP theorem.

### questions
Q: What is the difference between range and hash partitioning?
A: Range partitioning assigns contiguous key ranges to shards, which keeps related keys together and makes range scans efficient but can create hot spots with sequential keys. Hash partitioning assigns keys by the hash of the key, spreading load evenly but scattering neighboring keys, so range queries must ask every shard.

Q: How do you choose a good shard key?
A: It should have many distinct values with an even spread of data and traffic, avoid monotonically increasing values, and appear in most queries so they can be routed to a single shard, with transactions confined to one shard. Tenant id or user id are common choices.

Q: What is a hot spot and how do you fix one?
A: A shard or key that receives far more traffic than the others, such as the newest time range or a celebrity account. Fixes include hashing instead of range partitioning, adding a random suffix to split a hot key across shards, caching it, or giving it a dedicated shard.

Q: What problems does sharding introduce?
A: Queries without the shard key must fan out to every shard and merge results; joins and transactions across shards need distributed protocols like two-phase commit or sagas; rebalancing data when adding nodes is complex; and global unique constraints and secondary indexes are harder to maintain.

Q: Why is hash mod N a poor way to assign keys to shards?
A: When N changes, almost every key maps to a different shard, so adding or removing one node forces most of the data to move. Consistent hashing or a fixed large number of partitions assigned to nodes moves only a small fraction.

## dbms.nosql.consistent-hashing
name: "Consistent hashing"
importance: important
prereqs: [dbms.nosql.sharding-and-partitioning]
scope: "rebalancing with minimal movement"

### simple
Consistent hashing places both servers and keys on a circle and gives each key to the next server clockwise. When a server is added or removed, only the keys next to it on the circle move, instead of almost everything. It is like guests sitting around a round table, each served by the next waiter to their right: a new waiter takes over only the guests between them and the previous waiter.

### interview
- Hash every node (and every key) onto a ring of positions $0 \ldots 2^{64} - 1$; a key belongs to the first node at or after its position, wrapping around.
- Adding a node moves only the keys between it and its predecessor: about $1/N$ of all keys, versus nearly all of them with `hash % N`.
- **Virtual nodes**: each physical node takes many positions on the ring (for example 100 to 256), which evens out the load, spreads a leaving node's keys over many others, and lets stronger machines take more positions.
- Lookups use a sorted structure of positions: binary search, $O(\log V)$ for $V$ virtual nodes.
- **Replication**: store each key on the next R distinct nodes clockwise (the preference list).
- Used in Dynamo, Cassandra and Riak partitioning, memcached client libraries, CDN and load balancer request routing (Maglev and jump consistent hash are related variants).

### deep
#### Code: movement and balance

```cpp
uint64_t hashOf(const string& s) {                   // FNV-1a, then a SplitMix64 finalizer
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : s) h = (h ^ c) * 1099511628211ULL;
    h ^= h >> 30, h *= 0xbf58476d1ce4e5b9ULL;         // the finalizer spreads every input bit
    h ^= h >> 27, h *= 0x94d049bb133111ebULL;         // over the whole 64-bit result
    return h ^ (h >> 31);
}

struct Ring {
    map<uint64_t, string> points;                    // ring position -> node
    void add(const string& node, int vnodes) {
        for (int v = 0; v < vnodes; ++v) points[hashOf(node + "#" + to_string(v))] = node;
    }
    const string& owner(const string& key) const {   // first node clockwise
        auto it = points.lower_bound(hashOf(key));
        return (it == points.end() ? points.begin() : it)->second;
    }
};

int main() {
    vector<string> keys;
    for (int i = 0; i < 100000; ++i) keys.push_back("user:" + to_string(i));

    int movedMod = 0;
    for (auto& k : keys) movedMod += hashOf(k) % 4 != hashOf(k) % 5;

    Ring before, after;
    for (string n : {"n0", "n1", "n2", "n3"}) before.add(n, 100), after.add(n, 100);
    after.add("n4", 100);
    int movedRing = 0;
    for (auto& k : keys) movedRing += before.owner(k) != after.owner(k);
    printf("4 -> 5 nodes: hash mod N moves %.1f%% of keys, the ring moves %.1f%%\n",
           100.0 * movedMod / keys.size(), 100.0 * movedRing / keys.size());

    for (int vnodes : {1, 100}) {
        Ring ring;
        for (string n : {"n0", "n1", "n2", "n3", "n4"}) ring.add(n, vnodes);
        map<string, int> load;
        for (auto& k : keys) ++load[ring.owner(k)];
        auto [lo, hi] = minmax_element(load.begin(), load.end(),
                                       [](auto& a, auto& b) { return a.second < b.second; });
        printf("%3d virtual node(s) each: busiest node %.1f%% of keys, quietest %.1f%%\n",
               vnodes, 100.0 * hi->second / keys.size(), 100.0 * lo->second / keys.size());
    }
}
```

Output:

```text
4 -> 5 nodes: hash mod N moves 80.1% of keys, the ring moves 18.8%
  1 virtual node(s) each: busiest node 44.4% of keys, quietest 4.1%
100 virtual node(s) each: busiest node 22.0% of keys, quietest 17.6%
```

Going from 4 to 5 nodes, `hash % N` reassigns about 80% of keys (a key stays only if its hash gives the same remainder mod 4 and mod 5), while the ring moves about 19%, close to the new node's ideal share of 20%, all of it to the new node. With one position per node, the arcs between nodes are uneven and one node gets 44% of the keys; with 100 virtual nodes each, every node lands near the ideal 20%.

The hash matters as much as the ring. Plain FNV-1a without the finalizer gives similar names such as `n0#1` and `n0#2` nearby positions: in the same test it put 88% of the keys on one node with one position each, and still 37% with 100. Real systems use hashes with strong mixing (Cassandra uses MurmurHash3, Dynamo used MD5).

#### Adding a node, step by step

1. The new node takes its (virtual) positions on the ring.
2. For each position, the keys between the previous position and it now belong to the new node; they are copied from their old owners.
3. Once copied, routing switches over; nothing else in the cluster moves.

Connects to: sharding and partitioning, replication, hash table internals, load balancers, consistent hashing in design.

### questions
Q: What problem does consistent hashing solve?
A: Assigning keys to a changing set of nodes without reshuffling almost everything. With hash mod N, adding or removing a node remaps most keys; with consistent hashing only the keys in the affected arc of the ring move, about one Nth of the total.

Q: How does a consistent hashing ring assign keys to nodes?
A: Nodes and keys are hashed to positions on the same circular space. Each key is owned by the first node position found moving clockwise from the key's position, wrapping around at the end; lookups binary search a sorted list of node positions.

Q: Why use virtual nodes?
A: With one position per node, the arcs are uneven, so some nodes get much more data, and a leaving node dumps all its keys on one neighbor. Giving each node many positions evens out the load, spreads a departing node's keys across many nodes, and lets bigger machines take more positions.

Q: How is replication combined with consistent hashing?
A: Each key is stored on the owner and the next distinct physical nodes clockwise, forming its preference list. When a node fails, reads and writes continue on the others in the list, and hinted handoff or repair restores the missing copies later.

## dbms.nosql.distributed-transactions
name: "Distributed transactions"
importance: advanced
scope: "two-phase commit, sagas"

### simple
A distributed transaction has to succeed or fail as a whole across several databases or services, like booking a flight, a hotel and a car for one trip. Two-phase commit asks every participant "can you commit?" and only then tells all of them "commit". Sagas instead run the steps one by one and, if a later step fails, undo the earlier ones with compensating actions, like cancelling the hotel when the flight falls through.

### interview
- **Two-phase commit (2PC)**: a **coordinator** sends **prepare**; each participant makes the change durable but not final, holds its locks, and votes yes or no. If all vote yes, the coordinator logs the decision and sends **commit**; otherwise **abort**.
- 2PC gives atomicity across nodes but is **blocking**: if the coordinator fails after prepare, participants must wait (holding locks) until it recovers. It adds round trips and couples availability to every participant. Used inside databases (XA, Spanner with Paxos-replicated participants).
- **Sagas**: a sequence of local transactions $T_1 \ldots T_n$, each with a **compensating** transaction $C_i$; on failure at step k, run $C_{k-1} \ldots C_1$. No global locks; intermediate states are **visible** (no isolation), so steps must tolerate that.
- **Orchestration** (a central coordinator drives the steps) vs **choreography** (services react to each other's events).
- Supporting patterns: **idempotent** steps and compensations, the **transactional outbox** (write the event in the same local transaction as the change), retries with unique request ids.

### deep
#### 2PC timeline

| step | coordinator | participant A (orders DB) | participant B (payments DB) |
|---|---|---|---|
| 1 | send PREPARE | write changes, log "prepared", vote YES | write changes, log "prepared", vote YES |
| 2 | log COMMIT decision | (holding locks) | (holding locks) |
| 3 | send COMMIT | commit, release locks, ack | commit, release locks, ack |

If B had voted NO, the coordinator would send ABORT to both. If the coordinator crashes between steps 1 and 3, A and B are stuck "prepared": they cannot commit or abort on their own, because the other might have decided differently. That blocking window is the main criticism of 2PC.

#### Code: a saga with compensation

```cpp
int main() {
    vector<pair<string, string>> steps = {{"reserve seat", "release seat"},
                                          {"charge card", "refund card"},
                                          {"issue ticket", "cancel ticket"}};
    auto run = [&](int failingStep) {
        vector<int> done;
        for (int i = 0; i < int(steps.size()); ++i) {
            if (i == failingStep) {
                cout << "  " << steps[i].first << ": failed\n";
                for (auto j = done.rbegin(); j != done.rend(); ++j)   // undo in reverse order
                    cout << "  compensate: " << steps[*j].second << "\n";
                return;
            }
            cout << "  " << steps[i].first << ": ok\n";
            done.push_back(i);
        }
        cout << "  saga complete\n";
    };
    cout << "happy path:\n";
    run(-1);
    cout << "ticketing fails:\n";
    run(2);
}
```

Output:

```text
happy path:
  reserve seat: ok
  charge card: ok
  issue ticket: ok
  saga complete
ticketing fails:
  reserve seat: ok
  charge card: ok
  issue ticket: failed
  compensate: refund card
  compensate: release seat
```

Between "charge card" and the refund, the customer could see the charge: a saga is atomic in the end, not isolated along the way. Compensations must be **semantic** undos (a refund, not deleting the payment record) and safe to retry.

#### Choosing

| | 2PC | saga |
|---|---|---|
| atomicity | strict, all or nothing | eventual, through compensation |
| isolation | yes (locks held until the end) | no (intermediate states visible) |
| availability | blocked by a failed coordinator or participant | each step independent |
| fits | a few databases in one trusted system | long-running business processes across services |

Connects to: ACID properties, sharding and partitioning, replication, CAP theorem, retries, timeouts and exponential backoff with jitter.

### questions
Q: How does two-phase commit work?
A: The coordinator asks every participant to prepare; each makes its changes durable in a prepared state, keeps its locks and votes yes or no. If all vote yes, the coordinator records a commit decision and tells everyone to commit; if any votes no or times out, it tells everyone to abort.

Q: Why is two-phase commit called a blocking protocol?
A: Once a participant has voted yes, it cannot decide alone: it must wait for the coordinator's decision. If the coordinator crashes at that point, prepared participants stay stuck, holding locks, until the coordinator recovers or an operator intervenes.

Q: What is a saga?
A: A long-running transaction split into a sequence of local transactions, each with a compensating action. If a step fails, the compensations for the already completed steps run in reverse order, so the overall effect is all or nothing without holding locks across services.

Q: What is the difference between orchestrated and choreographed sagas?
A: In orchestration, a central coordinator tells each service which step to run next and handles failures and compensations. In choreography, there is no coordinator: each service performs its step when it sees an event from the previous one and publishes its own events, which is more decoupled but harder to follow.

Q: What is the transactional outbox pattern?
A: A service writes its business change and an outgoing event to an outbox table in the same local transaction, and a separate process publishes events from the outbox. The change and the event can then never disagree, which saga steps rely on.
