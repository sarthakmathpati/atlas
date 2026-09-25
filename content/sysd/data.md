---
topic: sysd.data
name: "Data storage in design"
subject: sysd
order: 4
prereqs: [sysd.scalability]
---

## sysd.data.choosing-sql-vs-nosql-in-design
name: "Choosing SQL vs NoSQL in design"
importance: must
scope: "access patterns decide"

### simple
Relational (SQL) databases store data in tables with fixed columns, join them freely and protect changes with transactions. NoSQL databases give up some of that for other strengths: huge scale, flexible documents, or very fast lookups by key. The right choice comes from how the data will be read and written, like choosing between a filing cabinet with an index card system and a warehouse of labelled boxes.

### interview
- Start from **access patterns**: which queries run, how often, with what latency, and how writes arrive. Then pick the model that serves them simply.
- **Relational** (MySQL, PostgreSQL): relations and joins, ad hoc queries, strong constraints, multi-row **transactions**. Scales reads with replicas; writes scale by sharding with effort. The default for most business data.
- **Key-value** (DynamoDB, Redis): lookups by key at massive scale, predictable latency. **Document** (MongoDB): nested, flexible records read together. **Wide-column** (Cassandra, HBase): huge write throughput, rows partitioned by key and sorted within a partition (time series, messages). **Graph** (Neo4j): many-hop relationship queries. **Search** engines for text.
- NoSQL designs are **query-first**: you model tables for known queries and denormalize; new query types often need new tables. SQL designs are data-first and flexible for new queries.
- Many systems use both: SQL for users, orders and payments; a wide-column or key-value store for high-volume events; a search engine for text; object storage for blobs (**polyglot persistence**).
- "NoSQL scales, SQL doesn't" is outdated: sharded relational systems and distributed SQL (Spanner, CockroachDB) scale, and many NoSQL stores now offer transactions.

### deep
#### Deciding by access pattern

Take a food delivery app and list its data with how it's used:

| data | access pattern | good fit |
|---|---|---|
| users, restaurants, menus | read by id, occasional joins, admin queries | relational |
| orders and payments | multi-row transactions, strict consistency, reports | relational |
| courier locations | 100,000 updates per second, read "near me", keep 1 day | in-memory geo index (Redis) plus a stream |
| order status history | append-only events, read by order id in time order | wide-column (partition by order id) or a relational table |
| restaurant search | text and filters ("vegan pizza open now") | search engine, fed from the database |
| photos of dishes | large immutable files | object storage plus a CDN |

No single database handles all of these well. The relational database stays the source of truth for money and orders; the others are derived or specialized.

#### Questions that decide it

1. **Do I need transactions across several rows or entities?** (Moving money, reserving inventory.) Favors relational.
2. **Are the queries known and simple, by key?** Favors key-value or wide-column, which make them fast at any scale.
3. **Is the data shaped like a tree read all at once?** (A product with variants and attributes.) Documents fit.
4. **What's the write rate?** Tens of thousands per second of append-heavy data favors LSM-based wide-column stores.
5. **Will people ask new questions of this data?** Relational and analytics stores handle ad hoc queries; key-value stores don't.
6. **How much consistency do reads need?** Many NoSQL stores default to eventual consistency, tunable per request.

#### Modeling the same feature both ways

Messages in a chat app, read as "the latest 50 messages of conversation X":

```text
relational:   messages(id, conversation_id, sender_id, body, sent_at)
              index (conversation_id, sent_at)
              SELECT ... WHERE conversation_id = ? ORDER BY sent_at DESC LIMIT 50

wide-column:  partition key = conversation_id, clustering key = message_id (time-ordered)
              one partition read returns the latest 50, already sorted on disk
```

Both work. The relational version is simpler and supports other queries; the wide-column version keeps each conversation's messages physically together and absorbs enormous write rates across many machines, which is why large chat systems use it.

#### Pitfalls

- Choosing NoSQL for scale you don't have, then rebuilding joins and transactions in application code.
- Choosing a document store, then needing many-to-many queries across documents.
- Forgetting operations: backups, migrations, and the team's experience count as much as benchmarks.

Connects to: relational vs NoSQL (the DBMS view), NoSQL data models, sharding strategies, search systems, object storage and blobs, discussing trade-offs.

### questions
Q: How do you decide between a SQL and a NoSQL database in a design?
A: List the access patterns: the queries, their frequency and latency needs, the write rate, and the consistency and transaction needs. Relational databases fit data with relationships, transactions and evolving queries; NoSQL stores fit known, simple access patterns at very large scale, flexible document shapes or very high write rates.

Q: What does query-first modeling mean in NoSQL?
A: You design tables or partitions around the exact queries you will run, duplicating data so each query reads one partition, instead of normalizing and joining at read time. It gives fast, predictable reads but makes new kinds of queries harder, often needing new tables.

Q: Can one system use several databases?
A: Yes, and large systems usually do: a relational database for transactional core data, a key-value or wide-column store for high-volume access patterns, a search engine for text, and object storage for files. Each specialized store is fed from the source of truth, often through events or change data capture.

Q: Why is "SQL doesn't scale" misleading?
A: Relational databases scale reads with replicas and writes with sharding, and distributed SQL systems scale horizontally with transactions. The real trade-off is the effort and the features you keep, such as joins across shards, not an absolute limit.

## sysd.data.replication-in-practice
name: "Replication in practice"
importance: must
prereqs: [sysd.data.choosing-sql-vs-nosql-in-design]
scope: "read replicas, replication lag"

### simple
Replication keeps copies of the same data on several machines. Writes go to a leader, which passes each change on to followers; reads can then be spread across the followers. The catch is lag: a follower may be a moment behind, so a user who just saved something might not see it if their next read hits a slow copy.

### interview
- **Leader-follower** (primary-replica): all writes to the leader; followers apply its change log. Reads scale with followers; the leader is still the write bottleneck.
- **Synchronous** replication waits for followers before acknowledging (no data loss on failover, slower writes, blocked by a slow follower); **asynchronous** acknowledges at once (fast, but recent writes can be lost if the leader dies); **semi-synchronous** waits for one follower.
- **Replication lag** is usually milliseconds but can grow to seconds or minutes under load, causing anomalies: a user doesn't see their own write (**read-your-writes** violation), or sees data go back in time when reads hit different replicas (**monotonic reads** violation).
- Fixes: read from the leader for a while after a user writes, or track the write's log position and read only from replicas that have reached it; pin each user to one replica for monotonic reads.
- **Failover**: promote a follower when the leader dies; risks are losing unreplicated writes, two leaders (split brain) and clients still writing to the old one. Use fencing and a consensus-based coordinator.
- Multi-leader (writes in several regions, conflict resolution needed) and leaderless (quorums) replication trade simplicity for availability.

### deep
#### Lag and read-your-writes

A leader streams its log to a replica that is 300 ms behind. A user updates their display name and the next page load reads from the replica:

```cpp
struct Entry { long lsn; string key, value; };   // lsn: position in the leader's log

struct Replica {
    unordered_map<string, string> data;
    long applied = 0;                            // highest log position applied
};

int main() {
    unordered_map<string, string> leader_data = {{"name:42", "Asha"}};
    vector<pair<long, Entry>> log;               // (time committed, entry)
    Replica replica;
    replica.data = leader_data;
    const long lag_ms = 300;
    long lsn = 0;

    auto write = [&](long now, const string& k, const string& v) {
        leader_data[k] = v;
        log.push_back({now, {++lsn, k, v}});
        return lsn;                              // returned to the client
    };
    auto sync_replica = [&](long now) {          // apply entries older than the lag
        for (auto& [t, e] : log)
            if (t + lag_ms <= now && e.lsn > replica.applied) {
                replica.data[e.key] = e.value;
                replica.applied = e.lsn;
            }
    };
    // read-your-writes: use the replica only if it has applied the client's last write
    auto read = [&](long now, const string& k, long client_lsn, bool ryw) {
        sync_replica(now);
        if (ryw && replica.applied < client_lsn) return "leader: " + leader_data[k];
        return "replica: " + replica.data[k];
    };

    long my_lsn = write(1000, "name:42", "Asha Rao");
    for (long t : {1050, 1400})
        printf("t=%ld  plain read -> %-17s  ryw read -> %s\n", t,
               read(t, "name:42", my_lsn, false).c_str(),
               read(t, "name:42", my_lsn, true).c_str());
}
```

Output:

```text
t=1050  plain read -> replica: Asha      ryw read -> leader: Asha Rao
t=1400  plain read -> replica: Asha Rao  ryw read -> replica: Asha Rao
```

50 ms after saving, a plain read from the replica shows the old name, and the user thinks the save failed. Returning the write's log position (LSN) to the client and sending reads to the leader until a replica has applied it fixes this; by 1,400 ms the replica has caught up and serves the read. MySQL exposes positions as GTIDs and PostgreSQL as LSNs, so real systems can do exactly this check.

#### Choosing synchronous or asynchronous

| mode | write latency | data loss if the leader dies | availability of writes |
|---|---|---|---|
| synchronous (all followers) | slowest (the slowest follower) | none | any follower down blocks writes |
| semi-synchronous (one follower) | one extra round trip | none, if that follower survives | tolerates other followers failing |
| asynchronous | fastest | the last few writes | unaffected by followers |

A common production setup: semi-synchronous replication to one follower in another availability zone, plus asynchronous followers for read scaling and a cross-region copy for disaster recovery.

#### Failover in practice

1. Detect: the leader misses heartbeats for a few seconds (too short causes false failovers, too long extends outages).
2. Choose the most up-to-date follower and promote it.
3. Redirect writes (update service discovery or a virtual IP) and **fence** the old leader so it can't accept writes if it comes back.
4. Re-point the other followers at the new leader.

Tools like Orchestrator for MySQL and Patroni for PostgreSQL automate this with a consensus store (etcd, ZooKeeper, Consul) deciding who the leader is.

Connects to: replication (the DBMS view), consistency models, quorums, redundancy and failover, consensus basics, cache invalidation and consistency.

### questions
Q: What is replication lag and what problems does it cause?
A: The delay between a write committing on the leader and being applied on a follower. Reads from lagging followers return stale data: users may not see their own updates, or may see newer data followed by older data when successive reads hit different replicas.

Q: How do you guarantee read-your-writes with asynchronous replicas?
A: Route a user's reads to the leader for a short time after they write, or return the write's log position to the client and read only from replicas that have applied at least that position. Reading the user's own profile from the leader and everything else from replicas is a common simple version.

Q: What is the trade-off between synchronous and asynchronous replication?
A: Synchronous replication acknowledges a write only after followers have it, so failover loses no data, but writes are slower and stall when a follower is slow or down. Asynchronous replication is fast and independent of followers, but the latest writes can be lost when the leader fails.

Q: What can go wrong during a failover?
A: Writes not yet replicated are lost; the old leader may come back and still accept writes, creating two leaders; clients may keep using the old address; and a failure detector that is too sensitive can trigger needless failovers. Fencing, consensus-based leader election and careful timeouts address these.

## sysd.data.sharding-strategies
name: "Sharding strategies"
importance: must
prereqs: [sysd.data.replication-in-practice]
scope: "key choice, resharding, hot partitions"

### simple
Sharding splits one big dataset into pieces stored on different machines, so each machine holds and serves only part of the data. A shard key decides where each row goes, such as the user id. Choosing the key well spreads the load evenly; choosing it badly sends most traffic to one overloaded shard, like a library that files every popular book in the same room.

### interview
- **Hash sharding**: shard = hash(key) mapped to a shard. Even spread, but range queries touch every shard.
- **Range sharding**: contiguous key ranges per shard (A to F, G to M ...). Efficient range scans, but sequential keys (timestamps, auto-increment ids) send all new writes to the last shard.
- **Directory (lookup) sharding**: a mapping service says which shard holds which key or tenant; flexible (move one big tenant) but the directory must be fast and highly available.
- **Choosing a key**: high cardinality, even access, and **locality**: the most common queries should hit one shard (shard orders by customer id if pages show one customer's orders). Cross-shard queries and transactions are slow and complex.
- **Resharding**: `hash % N` moves most keys when N changes. Use **many fixed logical partitions** (for example 1,024) mapped to physical nodes, or consistent hashing, so growth moves only a small share.
- **Hot partitions**: a celebrity or a viral item overloads one shard; split that key (salting with a suffix), cache it, or give it a dedicated shard.
- Secondary indexes are either **local** (per shard; a lookup asks every shard) or **global** (partitioned by the indexed value; writes update another shard).

### deep
#### Resharding: modulo vs fixed partitions

```cpp
uint64_t mix(uint64_t x) {                    // SplitMix64 finalizer as the hash
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

int main() {
    const int keys = 100000, partitions = 1024;
    int moved_mod = 0, moved_fixed = 0;
    // fixed partitions: partition p lives on node p % nodes, except that growing
    // from 4 to 5 nodes hands every 5th partition to the new node
    auto node_fixed = [&](int p, int nodes) { return nodes == 5 && p % 5 == 4 ? 4 : p % 4; };
    for (uint64_t k = 0; k < keys; ++k) {
        uint64_t h = mix(k);
        if (h % 4 != h % 5) ++moved_mod;
        int p = h % partitions;
        if (node_fixed(p, 4) != node_fixed(p, 5)) ++moved_fixed;
    }
    printf("hash %% N, 4 -> 5 nodes:      %.1f%% of keys move\n", 100.0 * moved_mod / keys);
    printf("1024 partitions, 4 -> 5 nodes: %.1f%% of keys move\n", 100.0 * moved_fixed / keys);
}
```

Output:

```text
hash % N, 4 -> 5 nodes:      79.9% of keys move
1024 partitions, 4 -> 5 nodes: 19.7% of keys move
```

With `hash % N`, a key stays put only if its hash gives the same remainder for 4 and 5, which happens for about 1 in 5 keys, so 80% of the data would move, saturating the network and invalidating caches. With 1,024 fixed partitions, the new node simply takes over a fifth of the partitions (204 of them) and only their data moves, the minimum possible. The key-to-partition mapping never changes; only the partition-to-node table does. Kafka, Elasticsearch, Redis Cluster (16,384 slots) and Couchbase all use this idea.

#### Picking the shard key

For an orders table, compare candidates against the main queries ("a customer's orders", "one order by id", "all orders today for reports"):

| shard key | spread | "a customer's orders" | "orders today" |
|---|---|---|---|
| `order_id` (hash) | even | every shard | every shard |
| `customer_id` (hash) | even, unless one customer is huge | one shard | every shard |
| `created_at` (range) | all new writes on one shard | every shard | one shard, but a hot one |
| `region` | uneven (a few big regions) | one shard | several shards |

`customer_id` wins for a customer-facing app: the common query is local, and writes spread evenly. Reports scanning all orders go to a separate analytics store fed by change data capture, rather than bending the shard key toward them. Include the shard key in the order id (or look it up by id) so "order by id" also finds its shard.

#### Hot partitions

Even with a good key, one entity can dominate: a celebrity's posts, a flash-sale product. A key receiving 50,000 writes per second can't be spread by any hash, because all its rows share the key. Options: append a random suffix to split its writes into, say, 10 sub-keys and read all 10 when querying; buffer and batch its updates (counters); cache it aggressively; or move it to a dedicated shard with a directory entry.

#### Costs of sharding

Cross-shard joins, transactions (needing two-phase commit or sagas), global unique constraints, and schema migrations across many databases. That is why the usual advice is: scale up and add replicas first, and shard when data size or write rate truly demands it.

Connects to: sharding and partitioning (the DBMS view), consistent hashing in design, unique ID generation, distributed transactions in practice, cache stampede and hot keys.

### questions
Q: What makes a good shard key?
A: High cardinality, an even spread of data and traffic, and locality for the most common queries so they hit one shard. For a multi-tenant or customer-facing system, the tenant or customer id is often best; avoid monotonically increasing keys with range sharding.

Q: Why does hash modulo N make resharding expensive?
A: Changing N changes almost every key's remainder, so most keys map to a different shard: going from 4 to 5 shards moves about 80% of the data. Using many fixed logical partitions mapped to nodes, or consistent hashing, moves only about 1/N of the data.

Q: What is the difference between hash and range sharding?
A: Hash sharding spreads keys evenly by their hash but scatters ranges, so range queries touch all shards. Range sharding keeps contiguous keys together, making range scans efficient, but can create hot spots when inserts are sequential, such as timestamps.

Q: How do you handle a hot partition caused by one very popular key?
A: Split the key's load: salt it with a suffix so its writes spread over several sub-keys (and read them all back), batch or buffer its updates, cache its reads, or move it to a dedicated shard. Detecting hot keys early through per-key metrics is part of the design.

Q: Why is sharding often postponed?
A: It adds cross-shard queries and transactions, global constraints, rebalancing and operational complexity. Vertical scaling, read replicas and caching often go a long way first, so shard when data size or write throughput actually requires it.

## sysd.data.consistent-hashing-in-design
name: "Consistent hashing in design"
importance: must
prereqs: [sysd.data.sharding-strategies]
scope: "virtual nodes"

### simple
Consistent hashing places both servers and keys on a circle of hash values; each key belongs to the next server clockwise. When a server joins or leaves, only the keys next to it on the circle change owner, instead of almost all keys. Giving each server many small spots on the circle, called virtual nodes, evens out how much each one gets.

### interview
- Hash servers and keys onto a ring (say 0 to 2^64 − 1); a key is owned by the first server clockwise. Lookups use a sorted structure: O(log V) for V ring points.
- Adding or removing one of N servers moves only about **1/N** of the keys: those between the changed server and its predecessor.
- **Virtual nodes**: each server gets many points (100 to 200 is common), which evens out load (one point per server leaves arcs of very different sizes), spreads a leaving server's keys over *all* others instead of one neighbor, and lets bigger machines take more points (weights).
- **Replication**: store a key on the next R *distinct physical* servers clockwise (the preference list), skipping virtual nodes of servers already chosen.
- Used by Dynamo-style stores (Cassandra, Riak), memcached clients, CDNs and load balancers for cache affinity.
- Alternatives: **rendezvous (highest random weight) hashing** (score every server per key, pick the highest; no ring, O(N) per lookup), **jump consistent hash** (tiny and fast, for numbered shards), and fixed slot tables (Redis Cluster).

### deep
#### Measuring load balance and movement

Ten servers, 100,000 keys; how uneven is the load, and what moves when an eleventh server joins?

```cpp
uint64_t mix(uint64_t x) {
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

struct Ring {
    map<uint64_t, int> points;                              // ring position -> server
    void add(int server, int vnodes) {
        for (int v = 0; v < vnodes; ++v) points[mix(server * 100003ULL + v)] = server;
    }
    int owner(uint64_t key_hash) const {
        auto it = points.lower_bound(key_hash);
        return (it == points.end() ? points.begin() : it)->second;   // wrap around
    }
    vector<int> preference(uint64_t key_hash, int r) const {         // r distinct servers
        vector<int> out;
        auto it = points.lower_bound(key_hash);
        while ((int)out.size() < r) {
            if (it == points.end()) it = points.begin();
            if (find(out.begin(), out.end(), it->second) == out.end()) out.push_back(it->second);
            ++it;
        }
        return out;
    }
};

int main() {
    const int servers = 10, keys = 100000;
    for (int vnodes : {1, 10, 100, 1000}) {
        Ring ring;
        for (int s = 0; s < servers; ++s) ring.add(s, vnodes);
        vector<int> load(servers + 1);
        vector<int> before(keys);
        for (int k = 0; k < keys; ++k) ++load[before[k] = ring.owner(mix(k + 7777777))];
        int mx = *max_element(load.begin(), load.begin() + servers);
        int mn = *min_element(load.begin(), load.begin() + servers);
        ring.add(servers, vnodes);                          // an 11th server joins
        int moved = 0;
        for (int k = 0; k < keys; ++k) moved += ring.owner(mix(k + 7777777)) != before[k];
        printf("%4d vnodes: busiest %5.2fx average, idlest %4.2fx, %4.1f%% moved on join\n",
               vnodes, mx / (keys / 10.0), mn / (keys / 10.0), 100.0 * moved / keys);
    }
    Ring ring;
    for (int s = 0; s < servers; ++s) ring.add(s, 100);
    auto pl = ring.preference(mix(42), 3);
    printf("replicas for key 42: servers %d, %d, %d\n", pl[0], pl[1], pl[2]);
}
```

Output:

```text
   1 vnodes: busiest  2.73x average, idlest 0.07x,  0.8% moved on join
  10 vnodes: busiest  1.52x average, idlest 0.51x,  9.2% moved on join
 100 vnodes: busiest  1.09x average, idlest 0.85x,  9.9% moved on join
1000 vnodes: busiest  1.04x average, idlest 0.92x,  9.0% moved on join
replicas for key 42: servers 0, 3, 4
```

With one point per server, the busiest server carries 2.7 times the average and the idlest almost nothing, because random arcs have very uneven lengths. With 100 to 1,000 virtual nodes, every server is within about 10 to 15% of the average. The same unevenness decides what a newcomer takes: with a single point, the eleventh server happened to land on a tiny arc and took only 0.8% of the keys, while with many virtual nodes it takes close to its fair share of 1/11 (9.1%). Either way, every moved key moves *to* the new server, never between old ones; plain `hash % N` would move about 91%.

The preference list for replication walks clockwise and skips virtual nodes of servers already chosen, so the three copies land on three different machines (and in production, different racks or zones).

#### Rendezvous hashing, the ring-free alternative

For each key, compute `score = hash(key, server)` for every server and pick the highest (or the top R for replicas). When a server leaves, only its keys move, each to its own second choice, spreading evenly without virtual nodes. The cost is O(N) hashing per lookup, fine for tens of servers; rings with binary search suit thousands.

#### Where it shows up in designs

- **Distributed cache**: clients map keys to cache nodes; a node failure moves only its keys, so the hit ratio dips a little instead of collapsing.
- **Key-value store**: the ring plus preference lists decides replica placement; hinted handoff covers a temporarily down node.
- **Load balancers**: hashing a user or session id to a backend gives affinity that survives scaling.

Connects to: consistent hashing (the DBMS view), sharding strategies, key-value store, distributed cache, load balancing, quorums.

### questions
Q: How does consistent hashing work?
A: Servers and keys are hashed onto the same circular space, and each key is assigned to the first server clockwise from its position. When a server is added or removed, only keys on the arc between it and its predecessor change owner, about 1/N of all keys.

Q: Why use virtual nodes?
A: With one position per server, arcs have very different sizes, so load is uneven, and a leaving server dumps all its keys on one neighbor. Giving each server many positions evens out the load, spreads moved keys across all servers, and allows weighting servers by capacity.

Q: How is replication done with consistent hashing?
A: The key is stored on the first R distinct physical servers found walking clockwise from its position, skipping extra virtual nodes of servers already chosen. Placement rules often also require the replicas to be in different racks or zones.

Q: What is rendezvous hashing?
A: Each key computes a score for every server by hashing the key with the server id and uses the server with the highest score. It needs no ring or virtual nodes and moves only the affected keys when servers change, but each lookup costs O(N), so it suits smaller clusters.

## sysd.data.object-storage-and-blobs
name: "Object storage and blobs"
importance: important
scope: "S3-style storage, CDN in front"

### simple
Object storage keeps files such as photos, videos and backups as whole objects in buckets, each found by a key, like a giant coat check that hands back exactly what you gave it. It is cheap, practically unlimited and very durable, but you replace an object rather than edit it in place. A CDN usually sits in front to deliver popular files quickly from near the user.

### interview
- **Model**: buckets of immutable objects addressed by key, with metadata; a flat namespace (the `/` in keys is just a character). Access over HTTP APIs (PUT, GET, DELETE, LIST by prefix).
- **Why not the database or a file server**: blobs bloat databases and backups; object stores scale to exabytes, cost a fraction of block storage, and are designed for extreme durability (S3 advertises eleven nines).
- **Pattern**: store the blob in object storage and its **metadata and key** in the database. Clients upload **directly** with a short-lived **presigned URL**, so large files don't pass through app servers; **multipart upload** sends big files in parallel parts and resumes after failures.
- **Durability** comes from replication across devices and zones or from **erasure coding** (split into k data and m parity fragments; any k rebuild the object), which costs about 1.4 to 1.5× the space instead of 3× for three copies.
- **Delivery**: a CDN caches objects at the edge; use content-hashed or versioned keys so updates don't need purges.
- **Lifecycle**: move old objects to cheaper, slower classes (infrequent access, archive) and expire temporary ones automatically.

### deep
#### Upload flow with a presigned URL

```text
1. client -> API:            "I want to upload avatar.jpg (2 MB)"
2. API -> client:            presigned PUT URL for key users/42/avatar-8f3a.jpg, valid 5 minutes
3. client -> object store:   PUT the bytes directly
4. object store -> queue:    "object created" event
5. worker:                   make thumbnails, scan the file, then
                             UPDATE users SET avatar_key = 'users/42/avatar-8f3a.jpg' WHERE id = 42
6. readers:                  GET through the CDN using the key
```

The app servers never carry the file's bytes, so they stay small and stateless. The presigned URL embeds a signature over the method, key and expiry, so the client can upload exactly that object and nothing else. A random or hashed suffix in the key makes each version a new object, which CDNs can cache forever.

#### Erasure coding in miniature

Real systems use Reed-Solomon codes with several parity fragments; the simplest code, one XOR parity fragment (the RAID-5 idea), already shows how a lost fragment is rebuilt from the others:

```cpp
int main() {
    string object = "photo-bytes:ABCDEFGHIJKL";          // 24 bytes
    const int k = 3;                                      // data fragments
    size_t frag = (object.size() + k - 1) / k;
    vector<string> parts(k + 1, string(frag, '\0'));      // 3 data + 1 parity
    for (int i = 0; i < k; ++i)
        for (size_t j = 0; j < frag && i * frag + j < object.size(); ++j)
            parts[i][j] = object[i * frag + j];
    for (size_t j = 0; j < frag; ++j) parts[k][j] = parts[0][j] ^ parts[1][j] ^ parts[2][j];

    parts[1] = "????????";                                 // a disk holding fragment 1 dies
    for (size_t j = 0; j < frag; ++j) parts[1][j] = parts[0][j] ^ parts[2][j] ^ parts[k][j];
    string rebuilt = parts[0] + parts[1] + parts[2];
    printf("rebuilt: %s\n", rebuilt.substr(0, object.size()).c_str());
    printf("space used: %.2fx (3 copies would use 3.00x)\n", (k + 1.0) / k);
    printf("RS(10,4) uses %.2fx and survives any 4 lost fragments\n", 14.0 / 10);
}
```

Output:

```text
rebuilt: photo-bytes:ABCDEFGHIJKL
space used: 1.33x (3 copies would use 3.00x)
RS(10,4) uses 1.40x and survives any 4 lost fragments
```

XOR of all the other fragments reproduces the missing one, since every byte XORed with itself cancels. Reed-Solomon generalizes this to m parity fragments that tolerate any m losses. The trade-off: rebuilding needs k fragments read over the network, and small objects pay CPU and latency overhead, so stores often replicate hot or small objects and erasure-code large, cold ones.

#### Design notes

- Keep object keys well distributed (many prefixes) for throughput on stores that partition by key prefix.
- Object stores are not file systems: renames are copy plus delete, listing is by prefix and can be slow, and there are no partial in-place updates (append or rewrite).
- Access control: keep buckets private and hand out presigned URLs or serve through the CDN with signed cookies, rather than public buckets.
- Deleting data for privacy requests must include every copy: CDN caches, replicas, backups and lifecycle archives.

Connects to: CDNs, where to cache, photo sharing app, video streaming platform, file storage and sync, pastebin, disaster recovery.

### questions
Q: Why store images and videos in object storage rather than in the database?
A: Large blobs bloat the database, its memory, replication and backups, and they are served better by HTTP and a CDN. Object storage is cheaper per byte, scales practically without limit and is highly durable; the database keeps only the object's key and metadata.

Q: What is a presigned URL and why use one?
A: A URL signed by the server that grants temporary permission for a specific operation, such as uploading one object key, until it expires. Clients upload or download directly with the object store, so large transfers bypass the application servers without exposing credentials.

Q: What is erasure coding and how does it compare with replication?
A: Data is split into k fragments plus m parity fragments computed so that any k of the k + m can rebuild the object. It tolerates m failures using about (k + m) / k times the space, such as 1.4 times for 10 plus 4, versus 3 times for three full copies, at the cost of more computation and network traffic on reads and repairs.

Q: How do CDNs and object storage work together?
A: The object store is the durable origin; the CDN caches objects at edge locations near users, cutting latency and origin load. Using versioned or content-hashed keys lets the CDN cache aggressively without needing purges when content changes.

## sysd.data.search-systems
name: "Search systems"
importance: important
scope: "inverted indexes, Elasticsearch basics"

### simple
A search engine finds documents containing your words quickly by keeping an inverted index: for every word, a list of the documents that contain it, like the index at the back of a book. It then ranks the matches so the most relevant come first. Databases are poor at this, so systems keep a separate search index fed from the main database.

### interview
- **Inverted index**: term → posting list of document ids (with positions and frequencies). A multi-word query intersects or merges posting lists.
- **Analysis** turns text into terms at index and query time: tokenize, lowercase, remove stop words, stem ("running" → "run"), add synonyms. Mismatched analyzers are a classic bug.
- **Ranking**: TF-IDF or **BM25** (a term matters more if frequent in the document, rare in the corpus, and the document is short), plus business signals (popularity, freshness, personalization).
- **Elasticsearch / OpenSearch** (built on Lucene): an index is split into **shards** (each a Lucene index made of immutable **segments**) with replicas; queries fan out to all shards and results are merged. New documents become searchable after a **refresh** (about 1 second): near-real-time.
- **Keeping it in sync**: the database stays the source of truth; changes flow to the index through change data capture or events, with periodic full rebuilds. The index is eventually consistent.
- Uses: full-text search, autocomplete, faceted filtering, log search. `LIKE '%term%'` in SQL can't use a B-tree index and can't rank.

### deep
#### A tiny inverted index with BM25 ranking

```cpp
vector<string> tokens(string s) {            // lowercase, split on non-letters, crude stemming
    vector<string> out;
    string cur;
    for (char c : s + " ") {
        if (isalpha((unsigned char)c)) cur += (char)tolower((unsigned char)c);
        else if (!cur.empty()) {
            if (cur.size() > 4 && cur.ends_with("ing")) {
                cur.resize(cur.size() - 3);                        // running -> runn
                if (cur[cur.size() - 1] == cur[cur.size() - 2]) cur.pop_back();   // -> run
            }
            if (cur.size() > 3 && cur.back() == 's') cur.pop_back();
            out.push_back(cur);
            cur.clear();
        }
    }
    return out;
}

int main() {
    vector<string> docs = {
        "Red running shoes for road running",
        "Blue shoes for walking",
        "Red jacket for rain",
        "Trail running shoes, lightweight and red with a grippy sole for mud",
        "Green shoes for kids",
    };
    unordered_map<string, vector<pair<int, int>>> index;   // term -> (doc, term frequency)
    vector<int> length;
    for (int d = 0; d < (int)docs.size(); ++d) {
        auto t = tokens(docs[d]);
        length.push_back(t.size());
        map<string, int> tf;
        for (auto& w : t) ++tf[w];
        for (auto& [w, f] : tf) index[w].push_back({d, f});
    }
    double avg_len = accumulate(length.begin(), length.end(), 0.0) / docs.size();
    const double k1 = 1.2, b = 0.75, n = docs.size();

    map<int, double> score;
    for (auto& term : tokens("red running shoes")) {
        auto& postings = index[term];
        double idf = log((n - postings.size() + 0.5) / (postings.size() + 0.5) + 1);
        for (auto [d, tf] : postings)
            score[d] += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * length[d] / avg_len));
    }
    vector<pair<double, int>> ranked;
    for (auto [d, s] : score) ranked.push_back({s, d});
    sort(ranked.rbegin(), ranked.rend());
    for (auto [s, d] : ranked) printf("%.3f  %s\n", s, docs[d].c_str());
}
```

Output:

```text
2.030  Red running shoes for road running
1.208  Trail running shoes, lightweight and red with a grippy sole for mud
0.624  Red jacket for rain
0.333  Green shoes for kids
0.333  Blue shoes for walking
```

The first document wins: it contains all three terms and "run" twice, and it's short. The trail shoe also has all three but is long, so BM25's length normalization lowers each term's weight. The jacket matches only "red" and the other two shoes only "shoe"; "red" scores higher than "shoe" because fewer documents contain it (3 of 5 against 4 of 5, so a higher IDF), and the two plain shoe listings tie. Only documents in at least one posting list are scored at all, which is how search stays fast on millions of documents.

#### Search at scale

```text
database --(change data capture / events)--> indexer --> search cluster
                                                           shard 1 (+ replica)
query --> coordinator --fan out--> shard 2 (+ replica)   --> merge top k --> results
                                   shard 3 (+ replica)
```

Each shard returns its local top k; the coordinator merges them. More shards spread indexing and storage; more replicas add query throughput and availability. Because the index is updated asynchronously, a just-created item may take a second or two to become searchable, which product requirements should accept explicitly.

Connects to: tries and autocomplete, typeahead autocomplete, choosing SQL vs NoSQL in design, data pipelines, hashing.

### questions
Q: What is an inverted index?
A: A map from each term to the list of documents containing it, often with frequencies and positions. A query looks up each term's posting list and merges or intersects them, so it touches only documents that contain the words instead of scanning everything.

Q: Why can't a relational database's LIKE '%word%' replace a search engine?
A: A leading wildcard prevents using a normal B-tree index, so every row is scanned, and LIKE offers no stemming, synonyms, typo tolerance or relevance ranking. Search engines precompute inverted indexes and rank results.

Q: What does BM25 reward?
A: Documents where the query terms appear often (with diminishing returns), terms that are rare across the collection (higher inverse document frequency), and shorter documents, through length normalization relative to the average document length.

Q: How do you keep a search index in sync with the primary database?
A: Treat the database as the source of truth and stream changes to the indexer through change data capture or application events, indexing asynchronously; periodically rebuild or reconcile to fix drift. Accept a short delay before new data is searchable.

## sysd.data.time-series-and-analytics-stores
name: "Time-series and analytics stores"
importance: important
scope: "Time-series and analytics stores"

### simple
Time-series data is a stream of measurements stamped with times, such as CPU usage every 10 seconds or a stock price every tick. Analytics queries scan huge amounts of data to answer questions like "average order value per city last month". Both are served by special stores that compress data and read only the columns a query needs, like reading one column of a huge spreadsheet instead of every row.

### interview
- **Time series**: append-mostly, queried by time range and aggregated (averages, percentiles per minute); recent data is hot, old data is cold. Stores: Prometheus, InfluxDB, TimescaleDB, and wide-column stores keyed by (series, time bucket).
- Tricks: **compression** (delta-of-delta timestamps and XOR-encoded floats get samples down to a couple of bytes), **downsampling** (keep raw for days, one-minute averages for months, hourly for years), **retention** policies, partitioning by time so dropping old data is cheap.
- **Cardinality** (number of distinct series, from labels like user id) is the usual scaling limit.
- **Analytics (OLAP)** vs **transactions (OLTP)**: OLTP touches few rows by key with many small writes; OLAP scans millions of rows but few columns.
- **Columnar storage** (ClickHouse, BigQuery, Redshift, Snowflake, Parquet files): each column stored contiguously, so a query reads only the columns it uses, compresses well (similar values together) and processes values in vectorized batches.
- Keep analytics off the production database: copy data with ETL or change data capture into a warehouse or lake.

### deep
#### Compressing timestamps with delta-of-delta

Samples arrive about every 10 seconds, so timestamps are large numbers that change in a very regular way:

```cpp
int main() {
    vector<long> ts = {1767225600, 1767225610, 1767225620, 1767225631, 1767225640,
                       1767225650};
    printf("raw:              ");
    for (long t : ts) printf("%ld ", t);
    printf("\ndelta:            ");
    for (size_t i = 1; i < ts.size(); ++i) printf("%ld ", ts[i] - ts[i - 1]);
    printf("\ndelta-of-delta:   ");
    for (size_t i = 2; i < ts.size(); ++i)
        printf("%ld ", (ts[i] - ts[i - 1]) - (ts[i - 1] - ts[i - 2]));
    printf("\n");

    // downsample one-second CPU readings into 10-second averages
    vector<int> cpu = {40, 42, 41, 39, 45, 44, 43, 41, 40, 42, 80, 85, 82, 84, 81, 79, 83,
                       85, 80, 81};
    for (size_t start = 0; start < cpu.size(); start += 10) {
        double sum = 0; int mx = 0;
        for (size_t i = start; i < start + 10; ++i) { sum += cpu[i]; mx = max(mx, cpu[i]); }
        printf("window %zu: avg %.1f max %d\n", start / 10, sum / 10, mx);
    }
}
```

Output:

```text
raw:              1767225600 1767225610 1767225620 1767225631 1767225640 1767225650 
delta:            10 10 11 9 10 
delta-of-delta:   0 1 -2 1 
window 0: avg 41.7 max 45
window 1: avg 82.0 max 85
```

In a long, regular series most delta-of-deltas are 0, which an encoder like Gorilla (Facebook's time-series compression) stores in a single bit; the occasional small jitter takes a few bits. Values get a similar trick: XOR with the previous float, and store only the few changed bits. Together, a sample shrinks from 16 bytes to about 1.4 bytes on typical monitoring data.

Downsampling keeps an average and a maximum per window: the average alone would hide spikes, which is why rollups usually store min, max, sum and count.

#### Row vs column layout

An `orders` table with 20 columns and a billion rows; the query is `SELECT city, AVG(amount) FROM orders WHERE placed_on >= '2026-01-01' GROUP BY city`. A row store reads every column of every qualifying row. A column store reads only `city`, `amount` and `placed_on`: 3 of 20 columns, each compressed well because values of one type sit together (`city` has a few hundred distinct values, so dictionary plus run-length encoding shrinks it dramatically). Data skipping (min and max per block of `placed_on`) avoids reading old blocks at all. That combination is why analytic scans that take minutes on a row store take seconds on a columnar one.

| | OLTP (row store) | OLAP (column store) |
|---|---|---|
| typical query | one order by id | aggregate over millions of rows |
| writes | many small, transactional | large batches or streams |
| storage | rows together | columns together, heavily compressed |
| examples | MySQL, PostgreSQL | ClickHouse, BigQuery, Snowflake |

Connects to: metrics and monitoring system, data pipelines, observability, LSM trees, choosing SQL vs NoSQL in design.

### questions
Q: What makes time-series workloads different from ordinary database workloads?
A: Data arrives as an append-mostly stream of timestamped points, queries ask for time ranges and aggregates rather than single records, recent data is hot and old data is cold, and volumes are high. Time-series stores exploit this with compression, time partitioning, downsampling and retention policies.

Q: What is delta-of-delta encoding?
A: Instead of storing each timestamp, store the difference between consecutive differences. For regularly spaced samples it is usually zero, which can be encoded in a single bit, so timestamps compress to almost nothing; irregular gaps cost a few more bits.

Q: Why are column stores faster for analytics?
A: Analytic queries read a few columns across many rows; a column store reads only those columns, compresses them well because similar values are stored together, skips blocks using min and max statistics, and processes values in vectorized batches. Row stores must read whole rows.

Q: Why keep analytical queries off the production OLTP database?
A: Large scans compete with user-facing transactions for CPU, memory and I/O and can slow the product down. Copying data to a warehouse or analytics store through ETL or change data capture isolates the workloads and lets each store use a layout suited to it.

## sysd.data.data-pipelines
name: "Data pipelines"
importance: advanced
scope: "batch vs stream processing, MapReduce idea"

### simple
A data pipeline moves data from where it is produced to where it is useful, transforming it on the way, such as turning raw click logs into daily reports. Batch processing handles a big pile of data at once, say every night; stream processing handles each event within seconds of it happening. It is like doing laundry once a week versus washing each item as soon as it's dirty.

### interview
- **Batch**: process a bounded dataset on a schedule (hourly, nightly); high throughput, simple retries (rerun the job), results are hours old. Tools: Spark, MapReduce, SQL in a warehouse, orchestrated by Airflow.
- **Stream**: process unbounded events continuously with seconds of latency; harder (state, ordering, late data, exactly-once). Tools: Kafka Streams, Flink, Spark Structured Streaming.
- **MapReduce**: **map** each input record to key-value pairs, **shuffle** (group all pairs by key, partitioned across reducers), **reduce** each key's values. Scales by splitting inputs and keys across machines; failed tasks are simply rerun because inputs are immutable.
- Streaming concepts: **windows** (tumbling, sliding, session), **event time** vs processing time, **watermarks** (how long to wait for late events), and state checkpoints for recovery.
- Architectures: **Lambda** (batch for correctness plus stream for freshness, two code paths) vs **Kappa** (one streaming path, reprocess by replaying the log).
- **ETL vs ELT**: transform before loading, or load raw data into the warehouse and transform there.

### deep
#### MapReduce word count, by hand

```cpp
int main() {
    vector<string> splits = {"to be or not", "to be is to do", "do be do"};  // one per mapper
    const int reducers = 2;
    vector<map<string, vector<int>>> shuffled(reducers);

    for (auto& split : splits) {                        // map: emit (word, 1)
        istringstream in(split);
        string w;
        while (in >> w) {
            int r = w < "m" ? 0 : 1;             // partition by key (a range split)
            shuffled[r][w].push_back(1);
        }
    }
    for (int r = 0; r < reducers; ++r) {                 // reduce: sum each key's values
        printf("reducer %d:", r);
        for (auto& [word, ones] : shuffled[r])
            printf(" %s=%d", word.c_str(), (int)accumulate(ones.begin(), ones.end(), 0));
        printf("\n");
    }
}
```

Output:

```text
reducer 0: be=3 do=3 is=1
reducer 1: not=1 or=1 to=3
```

Every occurrence of a word reaches the same reducer because the partition depends only on the key; that grouping (the shuffle) is the expensive, network-heavy step in a real cluster. Map tasks run where the input data sits, reducers pull their partitions, and any failed task is rerun from its immutable input.

#### Streams: windows and late events

A stream counts page views per minute in **event time** (when the view happened, not when it arrived). Events can arrive late (a phone was offline), so each window stays open until a **watermark** passes: "no events older than T are expected any more", typically current event time minus an allowed lateness. Events later than the watermark are dropped, sent to a side output, or trigger a correction. Choosing the lateness trades freshness (results wait longer) against completeness.

| window type | shape | example |
|---|---|---|
| tumbling | fixed, non-overlapping | views per minute |
| sliding (hopping) | fixed length, overlapping | 5-minute average every minute |
| session | ends after a gap of inactivity | user sessions with a 30-minute gap |

#### Choosing batch or stream

| need | choose |
|---|---|
| nightly reports, model training, backfills | batch |
| fraud checks, alerting, live dashboards | stream |
| both fresh and exactly correct numbers | stream with replay (Kappa), or batch corrections on top of stream (Lambda) |

Connects to: message queues, time-series and analytics stores, idempotency and exactly-once myths, search systems, metrics and monitoring system.

### questions
Q: What is the difference between batch and stream processing?
A: Batch processing runs over a bounded dataset at intervals, giving high throughput and simple reruns but results that are hours old. Stream processing handles unbounded events continuously with low latency, at the cost of managing state, ordering, late data and exactly-once guarantees.

Q: What are the phases of MapReduce?
A: Map transforms each input record into key-value pairs; shuffle groups all values by key, sending each key's values to one reducer; reduce combines each key's values into results. Inputs are split across mappers and keys across reducers, so the job scales out, and failed tasks are rerun.

Q: What are event time and watermarks in stream processing?
A: Event time is when an event actually happened, as opposed to when the system processes it. A watermark is the stream processor's estimate that no older events will arrive, which lets it close a time window and emit a result while tolerating some lateness.

Q: What is the difference between Lambda and Kappa architectures?
A: Lambda runs a batch layer for complete, correct results and a streaming layer for fresh approximate results, merging both, which means two code paths. Kappa uses a single streaming path over a replayable log and reprocesses history by replaying it when logic changes.
