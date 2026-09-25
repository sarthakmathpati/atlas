---
topic: sysd.classics
name: "Classic system design problems"
subject: sysd
order: 10
prereqs: [sysd.caching, sysd.data, sysd.messaging]
---

## sysd.classics.url-shortener
name: "URL shortener"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.building-blocks.unique-id-generation]
scope: "ID generation, redirects, analytics"

### simple
A URL shortener turns a long web address into a short link and, when someone opens the short link, sends them on to the original address. Its core is a lookup table from short codes to long URLs, read far more often than written. The interesting parts are making codes short but unique, and making redirects fast for billions of clicks.

### interview
- Requirements: create a short link (optionally a custom alias and an expiry), redirect fast, count clicks. Scale in the classic prompt: 100 million new links a month, 10 times more redirects.
- **Code generation**: a unique counter (a Snowflake id or ranges handed out to each server) encoded in **base 62** gives short, collision-free codes: 7 characters hold 3.5 trillion. Alternatives: hash the URL and take a prefix (must handle collisions), or random codes with a uniqueness check. Avoid guessable sequential codes if links can be private.
- **Storage**: a key-value lookup by code (a NoSQL store or a sharded relational table keyed by code). About 6 TB for 10 years at 500 bytes per link.
- **Read path**: cache hot codes (Redis, and a CDN or edge for the most popular), since a small share of links gets most clicks. Return **301** (permanent: browsers cache it, fewer hits, less analytics) or **302** (temporary: every click reaches you, better analytics).
- **Analytics**: never slow the redirect; publish a click event to a queue and aggregate asynchronously.
- Extras: abuse and malware checks on creation, rate limits per user, expiry cleanup, custom aliases checked for uniqueness.

### deep
#### Estimates and encoding

```cpp
const string alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

string to_base62(uint64_t n) {
    string s;
    do { s += alphabet[n % 62]; n /= 62; } while (n > 0);
    return string(s.rbegin(), s.rend());
}

uint64_t from_base62(const string& s) {
    uint64_t n = 0;
    for (char c : s) n = n * 62 + alphabet.find(c);
    return n;
}

int main() {
    for (uint64_t id : {125ULL, 1000000ULL, 3521614606207ULL})
        printf("id %13llu -> %-8s -> %llu\n", (unsigned long long)id, to_base62(id).c_str(),
               (unsigned long long)from_base62(to_base62(id)));
    printf("7 characters hold %.2e ids\n", pow(62, 7));

    const double links_per_month = 100e6, redirects_per_month = 1e9, years = 10;
    double links = links_per_month * 12 * years;
    printf("links in %g years: %.1e (fits in 7 characters: %s)\n", years, links,
           links < pow(62, 7) ? "yes" : "no");
    printf("writes %.0f/s, redirects %.0f/s average\n", links_per_month / (30 * 86400),
           redirects_per_month / (30 * 86400));
    printf("storage at 500 bytes per link: %.1f TB\n", links * 500 / 1e12);
}
```

Output:

```text
id           125 -> 21       -> 125
id       1000000 -> 4c92     -> 1000000
id 3521614606207 -> ZZZZZZZ  -> 3521614606207
7 characters hold 3.52e+12 ids
links in 10 years: 1.2e+10 (fits in 7 characters: yes)
writes 39/s, redirects 386/s average
storage at 500 bytes per link: 6.0 TB
```

Base 62 (digits, lowercase, uppercase) turns ids into short codes and back without any lookup table: `4c92` is simply one million written in base 62. Seven characters cover 3.5 trillion ids, far more than the 12 billion links of ten years. The traffic is small on average (39 writes and 386 redirects per second), so peaks, cache efficiency and redirect latency matter more than raw capacity; the whole link table (6 TB) fits a small sharded cluster.

#### API and data model

```text
POST /v1/links   {"url": "https://example.com/some/long/path", "alias": null, "expires": null}
  -> 201 {"code": "4c92", "short_url": "https://s.example.com/4c92"}
GET  /{code}     -> 302 Location: https://example.com/some/long/path

links: code (primary key) | long_url | owner_id | created_at | expires_at
```

#### Design

```text
create:  client -> API servers -> id service (Snowflake / ranges) -> base62 -> links DB
redirect: client -> CDN/edge -> redirect servers -> Redis (hot codes) -> links DB on a miss
                                      |
                                      +--> click event -> queue -> analytics aggregator
```

Deep dives interviewers like:

- **Why not hash the URL?** A hash prefix of 7 characters collides once millions of links exist (the birthday bound), so every insert needs a check and a retry; the same URL shortened twice gets the same code, which may or may not be wanted. Counter-based ids never collide.
- **The id service** must not be a single point of failure: give each API server a block of 1,000 ids from a database sequence, or use Snowflake ids from machine ids. Then no request waits on a central counter.
- **Caching**: a few links (a viral post) get most clicks; an LRU cache with hit ratios above 90% keeps the database load tiny, and the CDN can even serve the most popular redirects at the edge.
- **301 vs 302**: 301 lets browsers skip you next time, which saves load but loses click counts and makes changing the target impossible; most commercial shorteners use 302.
- **Analytics** is written asynchronously: the redirect server emits an event and returns within milliseconds; a stream processor aggregates clicks per code, country and hour.

#### Bottlenecks and failures

Redirect servers are stateless and scale out; the cache absorbs hot keys; the database is sharded by code (hash). If the analytics pipeline is down, clicks queue and are counted late, and redirects keep working.

Connects to: unique ID generation, back-of-the-envelope estimation, where to cache, sharding strategies, message queues, HTTP basics (redirect status codes).

### questions
Q: How would you generate short codes for a URL shortener?
A: Take a unique numeric id from a distributed id generator, such as Snowflake ids or blocks of ids from a database sequence per server, and encode it in base 62. Seven characters give about 3.5 trillion codes with no collisions to check; random codes need a uniqueness check, and hash prefixes collide at scale.

Q: Should a shortener return 301 or 302?
A: A 301 is permanent, so browsers and intermediaries cache it and skip the service next time, reducing load but losing click analytics and the ability to change the target. A 302 sends every click through the service, which most shorteners prefer for analytics and control.

Q: How do you keep redirects fast at high read volume?
A: Make redirect servers stateless and cache code-to-URL mappings in memory and a distributed cache, since a small fraction of links receives most clicks; serve the hottest at the CDN edge. Keep analytics off the request path by emitting events asynchronously.

Q: How do you estimate storage for a URL shortener?
A: Multiply links created per period by the bytes per record and the retention: 100 million links a month for 10 years is 12 billion links, and at about 500 bytes each, including the long URL and metadata, that is roughly 6 TB before replication.

## sysd.classics.rate-limiter-service
name: "Rate limiter service"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.reliability.rate-limiting-algorithms]
scope: "distributed counters, placement"

### simple
A rate limiter service enforces limits like "100 requests per minute per API key" across a whole fleet of servers, not just one. Every server asks a shared counter before letting a request through, so the limit holds no matter which server a client reaches. The design questions are where the check happens, how to keep counters correct under concurrency, and what to do when the counter store itself fails.

### interview
- Requirements: limits per API key, user, IP and endpoint; configurable rules; accurate enough across dozens of servers; adds at most a few milliseconds; clear responses (429 with `Retry-After` and rate-limit headers).
- **Algorithm**: token bucket (allows bursts, two numbers per key) or sliding window counter (smooth, two counters); both fit in a small Redis hash per key.
- **Shared store with atomic updates**: Redis with a Lua script (read, refill, decide and write in one step) or `INCR` with `EXPIRE` for fixed windows. Read-then-write from app servers races and lets extra requests through.
- **Placement**: at the API gateway (central, before any work), as a library in each service, or in a sidecar; rules loaded from configuration.
- **Failure policy**: if Redis is unreachable, **fail open** (allow; protects availability) or **fail closed** (deny; protects the backend). Most public APIs fail open with local fallback limits.
- **Scale**: shard counters by key across Redis nodes; for extreme rates, each server keeps a local bucket with a share of the limit and syncs periodically (approximate but no network hop).

### deep
#### Why the update must be atomic

```cpp
struct Store { int tokens = 1; };            // one token left for this API key (in Redis)

int main() {
    // Two API servers handle requests for the same key at the same moment.
    {
        Store s;
        int seen_a = s.tokens, seen_b = s.tokens;          // both GET: 1 token left
        bool a_ok = seen_a > 0, b_ok = seen_b > 0;
        if (a_ok) s.tokens = seen_a - 1;                   // both SET tokens = 0
        if (b_ok) s.tokens = seen_b - 1;
        printf("read then write:    server A %s, server B %s (limit exceeded)\n",
               a_ok ? "allowed" : "429", b_ok ? "allowed" : "429");
    }
    {
        Store s;
        auto take = [&] {                                  // runs atomically, like a Lua script
            if (s.tokens <= 0) return false;
            --s.tokens;
            return true;
        };
        bool a_ok = take(), b_ok = take();
        printf("atomic check-and-take: server A %s, server B %s\n",
               a_ok ? "allowed" : "429", b_ok ? "allowed" : "429");
    }
}
```

Output:

```text
read then write:    server A allowed, server B allowed (limit exceeded)
atomic check-and-take: server A allowed, server B 429
```

Two API servers read the same "1 token left", both decide to allow, and both write back 0: the client got two requests through a limit of one. With dozens of servers and bursty clients, this lets through several times the limit. Doing the check and the decrement as one atomic operation in the store, a Lua script in Redis, closes the race: the second request finds 0 tokens and gets a 429.

#### Design

```text
client -> API gateway [rate limit check] -> backend services
               |  EVALSHA token_bucket  key=rl:{api_key}:{endpoint}  (1 round trip, ~1 ms)
               v
         Redis cluster (sharded by key, replicas for failover)
rules service: per plan and endpoint limits, cached in every gateway, updated on change
```

The Lua script stores `tokens` and `last_refill` in a hash per key: refill by elapsed time × rate (up to the bucket size), take one token if available, write both back, set a TTL so idle keys disappear, and return the decision plus the remaining tokens and reset time for the response headers.

#### Deep dives

- **Latency budget**: one Redis round trip inside the data center, about a millisecond; keep Redis close to the gateways and use pipelining.
- **Hot keys**: one huge customer can overload the Redis shard holding its key; give very large keys local sub-limits or split them into several sub-keys.
- **Fail open or closed**: with Redis down, fail open for general traffic (maybe with a generous per-server local limit), but fail closed for abuse-sensitive endpoints such as login or password reset.
- **Multiple limits**: check per second and per day, per key and per IP; evaluate them in one script to keep one round trip.
- **Client experience**: 429 plus `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` and reset times, so well-behaved clients back off instead of hammering.

#### Rough numbers

1 million requests per second, each doing one Redis script call: a Redis shard handles on the order of 100,000 simple operations per second, so about 10 to 20 shards with headroom. Memory: 10 million active keys × about 100 bytes = 1 GB, small.

Connects to: rate limiting algorithms, Redis and Memcached, API gateway and service discovery, cache stampede and hot keys, graceful degradation and backpressure.

### questions
Q: Why can't each API server just keep its own counters?
A: A client's requests are spread across many servers, so each would see only part of the traffic and the effective limit would be the per-server limit times the number of servers. A shared store gives one consistent count per key; local counters only work as an approximation with each server holding a share of the limit.

Q: How do you avoid race conditions in a distributed rate limiter?
A: Make the whole check-and-update atomic in the shared store: a Redis Lua script that refills, checks and decrements a token bucket in one step, or INCR, whose atomic increment returns the new count. Separate read and write calls from different servers can both see capacity and exceed the limit.

Q: What should happen when the rate limiter's store is unavailable?
A: Choose per endpoint: fail open, allowing traffic, often with a local per-server fallback limit, to keep the API available; or fail closed, rejecting traffic, where abuse is dangerous, such as login attempts. Monitor and alert either way.

Q: Where should rate limiting run?
A: Usually at the API gateway or edge, so rejected requests cost almost nothing and limits are enforced consistently. Services may add finer limits of their own, and a sidecar can provide the same logic without changing application code.

## sysd.classics.pastebin
name: "Pastebin"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "blob storage and expiry"

### simple
A pastebin lets people paste text, get a short link and share it; the paste may be public or private and may expire. It looks like a URL shortener, but each entry carries a blob of text up to a megabyte. So the design separates small metadata, kept in a database, from the text itself, kept in object storage, and adds cleanup for expired pastes.

### interview
- Requirements: create a paste (text up to 1 MB, optional expiry and privacy), read by short key, delete; about 10 million new pastes a month and many more reads.
- **Keys**: random base-62 strings of about 8 characters (unguessable for private pastes), checked for uniqueness on insert, or pre-generated by a key generation service that hands out unused keys.
- **Storage split**: text in object storage (cheap, durable, large), metadata (key, owner, size, visibility, expires_at, blob key) in a database. Small pastes could live inline in the database, but blobs dominate storage.
- **Read path**: CDN and cache for public pastes (immutable content caches perfectly); private pastes skip the CDN or use signed URLs.
- **Expiry**: check on read (lazy) and delete in the background with a sweeper driven by an expiry index; lifecycle rules in object storage as a backstop.
- Estimates: about 6 TB of text over 5 years at 10 KB average, before copies; reads dominate, so caching matters more than write throughput.

### deep
#### Expiry: lazy checks plus a sweeper

```cpp
struct Paste { string text; long expires_at; };

int main() {
    unordered_map<string, Paste> pastes;                    // metadata + (in reality) a blob key
    auto later = [](const pair<long, string>& a, const pair<long, string>& b) {
        return a.first > b.first;
    };
    priority_queue<pair<long, string>, vector<pair<long, string>>, decltype(later)> expiry(later);
    auto put = [&](const string& key, const string& text, long expires_at) {
        pastes[key] = {text, expires_at};
        expiry.push({expires_at, key});                     // expiry index for the sweeper
    };
    auto read = [&](const string& key, long now) {          // lazy check on every read
        auto it = pastes.find(key);
        if (it == pastes.end() || now >= it->second.expires_at) return string("404 not found");
        return it->second.text;
    };
    put("aZ3kq9", "hello", 3600);                           // expires after 1 hour
    put("Qm81xT", "config dump", 600);                      // after 10 minutes
    put("7yH2pL", "notes", 86400);                          // after 1 day

    printf("t=700s  read Qm81xT -> %s (sweeper hasn't run yet)\n", read("Qm81xT", 700).c_str());
    for (long now : {900L, 4000L}) {                        // the sweeper runs periodically
        while (!expiry.empty() && expiry.top().first <= now) {
            printf("t=%lds sweeper deletes %s\n", now, expiry.top().second.c_str());
            pastes.erase(expiry.top().second);
            expiry.pop();
        }
    }
    printf("t=4000s read 7yH2pL -> %s; %zu paste left\n", read("7yH2pL", 4000).c_str(),
           pastes.size());

    const double pastes_per_month = 10e6, avg_kb = 10, years = 5;
    printf("%g years of pastes at %g KB average: %.1f TB before copies\n", years, avg_kb,
           pastes_per_month * 12 * years * avg_kb / 1e9);
}
```

Output:

```text
t=700s  read Qm81xT -> 404 not found (sweeper hasn't run yet)
t=900s sweeper deletes Qm81xT
t=4000s sweeper deletes aZ3kq9
t=4000s read 7yH2pL -> notes; 1 paste left
5 years of pastes at 10 KB average: 6.0 TB before copies
```

Readers must never see an expired paste, even if cleanup lags: the read path checks `expires_at` itself (the 404 at 700 s, before the sweeper ran). The sweeper then reclaims storage in expiry order using an index (in a database, `WHERE expires_at < now() ORDER BY expires_at LIMIT 1000` on an indexed column, run in batches). Deleting the blob as well as the row matters, since the blobs are where the space is.

#### Design

```text
create: client -> API -> key service (random 8-char key, unique) -> object storage (text)
                                                                 -> metadata DB (key, blob, expiry)
read:   client -> CDN (public, immutable) -> API -> cache -> metadata DB -> object storage
cleanup: sweeper (expiry index) deletes rows and blobs; bucket lifecycle rules as a backstop
```

#### Deep dives

- **Why random keys**: private pastes rely on the key being unguessable, so sequential ids are out. With 62^8 ≈ 2 × 10^14 possible keys and billions of pastes, collisions are rare but possible; a unique constraint on insert plus a retry handles them. A key generation service can pre-create keys in batches so creation never retries.
- **Size limits**: enforce 1 MB at the API, compress text (it shrinks well), and upload large pastes directly to object storage with a presigned URL.
- **Abuse**: rate limit anonymous users, scan for malware and leaked secrets, allow takedowns.
- **Analytics**: view counts through an asynchronous event stream, as in the URL shortener.

Connects to: URL shortener, object storage and blobs, unique ID generation, where to cache, CDNs.

### questions
Q: Why store paste contents in object storage instead of the database?
A: Paste bodies can be up to a megabyte and dominate storage; object storage is cheaper, scales without limit and serves immutable blobs well through a CDN, while the database keeps small, queryable metadata such as the key, owner, visibility and expiry.

Q: How would you handle paste expiry?
A: Store expires_at with the metadata and check it on every read so expired pastes are never served, then delete expired rows and blobs in the background using an index on expires_at, in batches. Object-storage lifecycle rules can remove any blobs the sweeper misses.

Q: How should keys for private pastes be generated?
A: Randomly, from a large enough space that they can't be guessed or enumerated, such as 8 or more base-62 characters, with a uniqueness check on insert or keys pre-generated by a key service. Sequential ids would let anyone iterate through private pastes.

## sysd.classics.key-value-store
name: "Key-value store"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "partitioning, replication, consistency"

### simple
A distributed key-value store is a giant dictionary spread across many machines: put a value under a key, get it back later. To hold more data than one machine and survive failures, it splits keys across nodes and keeps several copies of each. The design is mostly about choosing where keys live, how many copies must agree, and how copies that drift apart are repaired.

### interview
- API: `put(key, value)`, `get(key)`, maybe `delete`; values up to some size limit; millisecond latency; high availability.
- **Partitioning**: consistent hashing with virtual nodes spreads keys and limits movement when nodes join or leave.
- **Replication**: each key on N nodes (the preference list: the next N distinct nodes on the ring), across racks or zones.
- **Consistency**: quorums with **R + W > N** (for example N = 3, W = 2, R = 2) for reads that see the latest write; smaller R or W for speed. Conflicting concurrent writes are resolved with **last-write-wins** timestamps or detected with **vector clocks** and merged.
- **Failures**: gossip-based membership and failure detection; **sloppy quorums with hinted handoff** keep writes available when replicas are down; **read repair** and **anti-entropy with Merkle trees** fix stale replicas.
- **Storage engine**: write-ahead log plus an LSM tree (memtable, SSTables, compaction, Bloom filters) for fast writes; or a B-tree for read-heavy use.
- This is the Dynamo design (Cassandra, Riak, DynamoDB's ancestry); strongly consistent variants use consensus per partition (etcd, TiKV) instead.

### deep
#### Writes, failures and repair

Three replicas A, B and C hold `cart:42`; C crashes during the second write and comes back:

```cpp
struct Versioned { string value; int version; };

struct Node {
    string name;
    bool up = true;
    map<string, Versioned> data;
    map<string, pair<string, Versioned>> hints;       // key -> (intended owner, value)
};

int main() {
    vector<Node> nodes = {{"A"}, {"B"}, {"C"}, {"D"}};
    const int N = 3, W = 2, R = 2;
    auto preference = [&]() { return vector<int>{0, 1, 2}; };   // ring order for "cart:42"

    auto put = [&](const string& key, const string& value, int version) {
        int acks = 0;
        for (int i : preference()) {
            if (nodes[i].up) { nodes[i].data[key] = {value, version}; ++acks; }
            else {                                           // sloppy quorum: next node holds it
                nodes[3].hints[key] = {nodes[i].name, {value, version}};
                ++acks;
                printf("  %s is down: D keeps a hint for %s\n", nodes[i].name.c_str(),
                       nodes[i].name.c_str());
            }
        }
        printf("put %s=%s v%d: %d acks (need W=%d) -> %s\n", key.c_str(), value.c_str(),
               version, acks, W, acks >= W ? "ok" : "failed");
    };
    auto get = [&](const string& key, vector<int> ask) {    // read R replicas, newest wins
        Versioned best{"", -1};
        for (int i : ask) if (nodes[i].data.count(key) && nodes[i].data[key].version > best.version)
            best = nodes[i].data[key];
        for (int i : ask)                                    // read repair
            if (nodes[i].data[key].version < best.version) {
                printf("  read repair: %s had v%d, now v%d\n", nodes[i].name.c_str(),
                       nodes[i].data[key].version, best.version);
                nodes[i].data[key] = best;
            }
        printf("get %s from %zu replicas (R=%d) -> %s v%d\n", key.c_str(), ask.size(), R,
               best.value.c_str(), best.version);
    };

    put("cart:42", "[mug]", 1);
    nodes[2].up = false;                                     // C crashes
    put("cart:42", "[mug,lamp]", 2);
    nodes[2].up = true;                                      // C returns
    get("cart:42", {1, 2});                                  // B and C answer: C is stale
    for (auto& [key, hint] : nodes[3].hints)                 // D hands the hint back to C
        printf("hinted handoff: D -> %s %s v%d\n", hint.first.c_str(), key.c_str(),
               hint.second.version);
    printf("v2 is on home replicas A and B, so any %d of A, B, C include it (N=%d, W=%d)\n",
           R, N, W);
}
```

Output:

```text
put cart:42=[mug] v1: 3 acks (need W=2) -> ok
  C is down: D keeps a hint for C
put cart:42=[mug,lamp] v2: 3 acks (need W=2) -> ok
  read repair: C had v1, now v2
get cart:42 from 2 replicas (R=2) -> [mug,lamp] v2
hinted handoff: D -> C cart:42 v2
v2 is on home replicas A and B, so any 2 of A, B, C include it (N=3, W=2)
```

The second write stays available although C is down: A and B acknowledge (enough for W = 2), and D, the next node on the ring, keeps a **hint** to deliver to C later. When C returns, a read that happens to ask B and C gets v1 from C and v2 from B; the newest version wins, and **read repair** writes v2 back to C on the spot. Hinted handoff then delivers D's copy as well. Anti-entropy with Merkle trees catches keys that are neither read nor hinted.

#### Architecture

```text
client -> any node (coordinator) -> hash(key) on the ring -> preference list [A, B, C]
                                       write: send to all 3, succeed after W acks
                                       read:  ask R replicas, return newest, repair stale ones
each node: commit log (WAL) -> memtable -> SSTables (+ Bloom filters) -> compaction
membership: gossip every second; failure detector marks nodes down; hinted handoff
```

#### Deep dives

- **Conflicts**: with W < N and network partitions, two clients can write the same key on different replicas. Last-write-wins by timestamp is simple but silently drops one write (and clocks skew). Vector clocks detect concurrent versions and return both "siblings" for the application to merge (the shopping cart union from Dynamo's paper).
- **Tunable consistency**: per request, choose `ONE` for speed or `QUORUM` for read-your-writes; `ALL` sacrifices availability.
- **Why LSM trees**: writes append to the log and memtable (sequential I/O), making writes very fast; reads check the memtable and a few SSTables, skipping most with Bloom filters; compaction merges files in the background.
- **Adding nodes**: the new node takes over virtual node ranges, streams their data from current owners, then starts serving.
- **Large values and hot keys**: cap value sizes and store big blobs elsewhere; cache hot keys or split them.

#### Estimates

10 TB of data with 3 copies is 30 TB; at 2 TB of SSD per node with 50% headroom, that is about 30 nodes. A node doing about 20,000 operations per second gives the cluster roughly 600,000 per second, divided by the replication fan-out for writes.

Connects to: consistent hashing in design, quorums, clocks and ordering, Merkle trees, LSM trees, replication in practice, CAP theorem in practice.

### questions
Q: How does a Dynamo-style key-value store decide where to store a key?
A: It hashes the key onto a consistent-hashing ring with virtual nodes and stores it on the next N distinct physical nodes clockwise, the preference list, usually spread across racks or zones. Any node can coordinate a request by computing the same list.

Q: How do N, R and W affect a key-value store?
A: N is the number of replicas, W the acknowledgments needed for a write and R the replicas consulted on a read. With R + W greater than N, reads overlap the latest successful write; lowering R or W improves latency and availability at the cost of possibly stale reads.

Q: What are hinted handoff and read repair?
A: Hinted handoff lets another node accept a write for a temporarily unavailable replica and forward it when the replica returns, keeping writes available. Read repair compares versions returned during a read and writes the newest version back to replicas that returned stale data.

Q: Why do such stores often use LSM trees?
A: LSM trees turn writes into sequential appends to a log and an in-memory table flushed to sorted files, giving very high write throughput. Reads use Bloom filters and indexes to check few files, and background compaction keeps read cost and space under control.

Q: How are conflicting writes resolved?
A: Either by last-write-wins using timestamps, which is simple but can silently lose a concurrent update, or by tracking causality with vector clocks, detecting concurrent versions and merging them in the application or with CRDT data types.

## sysd.classics.web-crawler
name: "Web crawler"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "frontier, politeness, deduplication"

### simple
A web crawler downloads web pages, finds the links inside them, and follows those links to download more pages, over and over, to build a search index or an archive. At a billion pages a month it must be spread over many machines, avoid downloading the same page twice, and never flood any one website with requests. It is like a team of librarians visiting every library in the world without overwhelming any of them.

### interview
- Loop: take a URL from the **frontier**, check robots rules, resolve DNS, fetch, store the page, extract links, **normalize** and **deduplicate** them, add new ones to the frontier.
- **Frontier**: priority queues (important and fresh pages first) feeding **per-host queues**, so each host is fetched by one worker at a time with a crawl delay (**politeness**).
- **Deduplication**: URLs normalized (lowercase host, remove fragments, sort parameters) and checked in a seen set (a Bloom filter in memory backed by a store); page **content** deduplicated by hash or near-duplicate fingerprints (SimHash).
- **robots.txt**: fetch and cache per host; obey disallow rules and crawl delays. Avoid **crawler traps** (infinite calendars, session ids in URLs) with depth limits and URL pattern limits.
- **Scale**: a billion pages a month is about 400 pages per second; at 500 KB each, about 200 MB/s and 500 TB a month of raw HTML. Distribute by host (hash the host to a crawler node) so politeness stays local; cache DNS.
- **Freshness**: recrawl pages at rates based on how often they change and how important they are.

### deep
#### Normalization, deduplication and politeness

```cpp
string normalize(string url) {                       // one canonical form per page
    if (auto h = url.find('#'); h != string::npos) url.erase(h);        // drop fragments
    size_t host_start = url.find("://") + 3, host_end = url.find('/', host_start);
    for (size_t i = 0; i < min(host_end, url.size()); ++i) url[i] = tolower(url[i]);
    if (url.ends_with("/") && url.size() > host_end + 1) url.pop_back();  // trailing slash
    return url;
}

string host_of(const string& url) {
    size_t start = url.find("://") + 3;
    return url.substr(start, url.find('/', start) - start);
}

int main() {
    vector<string> discovered = {
        "https://example.com/a", "https://EXAMPLE.com/a#top", "https://example.com/b",
        "https://example.org/x", "https://example.com/c", "https://example.org/y/",
        "https://example.org/y", "https://example.net/1"};
    unordered_set<string> seen;                      // at scale: a Bloom filter plus a store
    map<string, deque<string>> per_host;             // politeness: one queue per host
    for (auto& raw : discovered) {
        string url = normalize(raw);
        if (!seen.insert(url).second) { printf("duplicate: %s\n", raw.c_str()); continue; }
        per_host[host_of(url)].push_back(url);
    }
    // each host gets at most one request per second; hosts are served in parallel
    map<string, double> next_allowed;
    auto cmp = [](const pair<double, string>& a, const pair<double, string>& b) {
        return a > b;
    };
    priority_queue<pair<double, string>, vector<pair<double, string>>, decltype(cmp)> ready(cmp);
    for (auto& [host, q] : per_host) ready.push({0.0, host});
    while (!ready.empty()) {
        auto [t, host] = ready.top();
        ready.pop();
        printf("t=%.1fs fetch %s\n", t, per_host[host].front().c_str());
        per_host[host].pop_front();
        if (!per_host[host].empty()) ready.push({t + 1.0, host});   // crawl delay 1 s
    }
}
```

Output:

```text
duplicate: https://EXAMPLE.com/a#top
duplicate: https://example.org/y
t=0.0s fetch https://example.com/a
t=0.0s fetch https://example.net/1
t=0.0s fetch https://example.org/x
t=1.0s fetch https://example.com/b
t=1.0s fetch https://example.org/y
t=2.0s fetch https://example.com/c
```

Normalization makes `https://EXAMPLE.com/a#top` the same page as `https://example.com/a` and `/y/` the same as `/y`, so both duplicates are dropped. The scheduler then fetches from three hosts in parallel, but never two pages from the same host within one second: example.com's three pages go out at 0, 1 and 2 seconds while other hosts proceed independently. At scale, thousands of hosts are in flight at once, so politeness costs almost no throughput.

#### Architecture

```text
seed URLs -> frontier (priority queues -> per-host queues) -> fetchers (async HTTP, DNS cache)
                ^                                                    |
                |                                                    v
        new URLs <- dedup (normalize, Bloom filter + URL store) <- parser (links, content hash)
                                                                     |
                                                   page store (object storage) -> indexer
robots.txt cache per host; hosts assigned to crawler nodes by hash(host)
```

#### Deep dives

- **Assigning hosts to nodes**: hashing the host means one node owns all of a host's URLs, so the crawl delay is enforced locally without coordination; links to other hosts are forwarded to their owners.
- **DNS**: resolution can dominate latency; cache results per host and use asynchronous resolvers.
- **Content deduplication**: mirrors and boilerplate produce the same content at different URLs; store a fingerprint per page and skip indexing near-duplicates.
- **Traps**: calendars and faceted search can generate infinite URLs; cap depth and URLs per host, and detect repeating path patterns.
- **Recrawling**: estimate each page's change rate from past crawls; news front pages every few minutes, old archives rarely.

Connects to: Bloom filters, message queues, rate limiting algorithms, object storage and blobs, search systems, DNS.

### questions
Q: How does a crawler avoid overloading a website?
A: It keeps a separate queue per host and lets only one fetch per host happen at a time, waiting a crawl delay between requests, taken from robots.txt or a default. Assigning each host to one crawler node makes this easy to enforce without coordination.

Q: How do you avoid crawling the same page twice?
A: Normalize URLs into a canonical form and check them against a seen set, typically a Bloom filter in memory backed by a persistent store, before adding them to the frontier. Also fingerprint page contents to skip duplicates reachable under different URLs.

Q: What is a crawler trap and how do you defend against it?
A: A site structure that generates endless unique URLs, such as calendars with infinite next links or session ids in URLs. Defend with maximum depth and maximum URLs per host, URL pattern detection, and parameter normalization.

Q: How would you estimate a crawler's throughput needs?
A: A billion pages a month is about 400 pages per second on average. At roughly 500 KB per page that is about 200 MB per second of downloads and around 500 TB of raw pages a month, which guides fetcher count, bandwidth and storage.

## sysd.classics.notification-system
name: "Notification system"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "channels, fan-out, retries"

### simple
A notification system delivers messages to users by push, SMS and email on behalf of many product teams. Teams call one API; the system checks each user's preferences, fills in templates, and hands messages to outside providers like SMS gateways and email services, retrying when they fail. Urgent messages, like a login code, must jump ahead of big marketing campaigns.

### interview
- Requirements: many channels (push, SMS, email, in-app), about 50 million notifications a day with campaign spikes, user preferences and quiet hours, templates, urgent messages within seconds, delivery tracking, no duplicates.
- **API** accepts a request (user or segment, template, data, priority, an idempotency key), validates and stores it, and enqueues it; returns at once.
- **Queues per channel and priority**: urgent (one-time passwords, security alerts) never waits behind bulk campaigns; each channel scales its workers independently.
- **Workers**: check preferences and opt-outs, render templates, apply rate limits (per user and per provider), call the provider, record status.
- **Retries**: transient provider errors retry with backoff and jitter; the notification id is sent as an idempotency key or deduplicated so a retry doesn't send twice; permanent failures (invalid number) are not retried; dead-letter queue for the rest.
- **Tracking**: store each notification's state (queued, sent, delivered, opened, failed) from provider callbacks; expose it to product teams.
- **Fan-out** for campaigns: expand segments into per-user messages in batches, throttled so they don't swamp providers or users.

### deep
#### Why urgent messages need their own queue

A campaign enqueues 100,000 emails; five seconds later, a user asks for a one-time password. Workers send 1,000 messages per second:

```cpp
int main() {
    const double rate = 1000;                 // messages per second the workers send
    const long marketing = 100000;            // a campaign enqueued at t = 0
    const double otp_arrives = 5.0;           // a one-time password requested at t = 5 s

    // one shared FIFO queue: the OTP waits behind whatever is left of the campaign
    double backlog_at_otp = max(0.0, marketing - otp_arrives * rate);
    printf("single queue:     OTP sent after %.1f s\n", backlog_at_otp / rate + 1 / rate);

    // separate queues per priority: workers always drain the high-priority queue first
    printf("priority queues:  OTP sent after %.3f s, campaign finishes at %.3f s\n",
           1 / rate, (marketing + 1) / rate);
}
```

Output:

```text
single queue:     OTP sent after 95.0 s
priority queues:  OTP sent after 0.001 s, campaign finishes at 100.001 s
```

In a single queue, the password waits 95 seconds behind the campaign and has probably expired by the time it arrives. With a separate high-priority queue that workers always drain first (or a dedicated worker pool), it goes out within milliseconds while the campaign finishes essentially on schedule. Priority is a property of the queueing design, not something a worker can fix afterwards.

#### Architecture

```text
product services -> Notification API (auth, validation, idempotency key, store request)
                          |
                  preferences + templates (cached)
                          |
      queues: [push-high] [push-low] [sms-high] [sms-low] [email-high] [email-bulk]
                          |
      channel workers: rate limits, render, call provider, retry with backoff
                          |                              |
      providers (APNs, FCM, SMS gateways, email)   status store <- provider callbacks
                                                         |
                                                   dead-letter queue, dashboards
```

#### Deep dives

- **Duplicates**: a worker can crash after the provider accepted a message but before recording it. Store the notification id with its status and check before sending; pass the id to providers that support idempotency; for the rest, accept a small duplicate risk or deduplicate on the device.
- **Preferences**: users opt out per channel and category; quiet hours delay non-urgent messages; legal rules require honoring unsubscribes immediately.
- **Rate limits**: per user (no more than a few marketing messages a day), per provider (their API limits), per campaign (spread sends over hours).
- **Provider failover**: keep two SMS or email providers and switch when one's error rate rises (a circuit breaker per provider).
- **Estimates**: 50 million a day is about 600 per second on average; campaigns can peak at 50 times that, which is exactly why the queues and throttles exist.

Connects to: message queues, publish-subscribe and event-driven architecture, retries, timeouts and exponential backoff with jitter, idempotency and exactly-once myths, dead-letter queues and poison messages, rate limiting algorithms.

### questions
Q: How do you make sure urgent notifications aren't delayed by bulk campaigns?
A: Separate them: dedicated high-priority queues per channel that workers always drain first, or entirely separate worker pools. Bulk campaigns go to low-priority queues and are throttled, so a backlog of marketing never delays one-time passwords or security alerts.

Q: How do you avoid sending a notification twice when retrying?
A: Give every notification a unique id, record its status durably, and check it before sending; pass the id as an idempotency key to providers that support one. Retries then resend only messages that weren't accepted, and duplicates from rare crash windows can be deduplicated downstream.

Q: What should happen when an SMS provider fails?
A: Retry transient errors with exponential backoff and jitter, stop retrying permanent errors like invalid numbers, trip a circuit breaker when the provider's error rate is high and fail over to a secondary provider, and send exhausted messages to a dead-letter queue for review.

Q: Where do user preferences fit in the flow?
A: Workers, or a routing step before the queues, check each user's channel and category opt-ins, quiet hours and frequency limits before rendering and sending. Preferences are read often and change rarely, so they are cached.

## sysd.classics.news-feed
name: "News feed"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "fan-out on write vs read, ranking"

### simple
A news feed shows each user recent posts from the people they follow, usually ranked by what they're likely to care about. The central question is when to assemble each feed: when a post is written, by copying it into every follower's feed, or when a user opens the app, by gathering posts from everyone they follow. Popular accounts with millions of followers make the first approach expensive and the second slow, so real systems mix both.

### interview
- Requirements: publish posts; load a ranked feed of followed accounts quickly (p99 around 200 ms); scale to hundreds of millions of daily users; some accounts have millions of followers.
- **Fan-out on write (push)**: on each post, insert its id into every follower's precomputed feed (a list in Redis or a wide-column store). Reads are one cheap lookup; writes cost one insert per follower, and celebrities make a single post cost millions of writes. Wasted work for inactive followers.
- **Fan-out on read (pull)**: on each feed load, fetch recent posts from every followed account and merge. Writes are cheap; reads are slow and expensive for users following many accounts.
- **Hybrid**: push for normal accounts; for accounts above a follower threshold (say 100,000), don't fan out, and merge their recent posts at read time. Skip pushing to inactive users; build their feed on demand.
- **Ranking**: candidate posts (a few hundred from the precomputed feed plus celebrity posts) are scored by a model (affinity, engagement, recency, content type), then reordered; heavy ranking runs on candidates only.
- **Pagination**: cursors (the last post's score or id), not offsets, since the feed changes while scrolling. Media lives in object storage behind a CDN; the feed stores only ids.

### deep
#### Cost of each approach, and the hybrid merge

```cpp
struct Post { long time; string author; };

int main() {
    // cost at scale: 300 M daily users, 0.5 posts each per day, 200 followers on average,
    // 10 feed loads per user per day, 20 followed accounts active per load
    const double users = 300e6, posts = users * 0.5, followers = 200, loads = users * 10;
    printf("fan-out on write: %.0f billion feed inserts per day (%.0f thousand per second)\n",
           posts * followers / 1e9, posts * followers / 86400 / 1e3);
    printf("fan-out on read:  %.0f billion timeline reads per day to assemble feeds\n",
           loads * 20 / 1e9);
    printf("one post by an account with 50 million followers: %.0f million inserts on write\n",
           50e6 / 1e6);

    // hybrid: normal authors are pushed into followers' feeds; celebrities are pulled
    map<string, vector<Post>> pushed_feed = {
        {"asha", {{100, "ravi"}, {90, "meera"}, {70, "ravi"}}}};
    map<string, vector<Post>> celebrity_posts = {{"star1", {{95, "star1"}, {60, "star1"}}},
                                                  {"star2", {{80, "star2"}}}};
    vector<string> celebrities_followed = {"star1", "star2"};
    vector<Post> feed = pushed_feed["asha"];
    for (auto& c : celebrities_followed)                    // merged at read time
        feed.insert(feed.end(), celebrity_posts[c].begin(), celebrity_posts[c].end());
    sort(feed.begin(), feed.end(), [](auto& a, auto& b) { return a.time > b.time; });
    printf("asha's feed:");
    for (size_t i = 0; i < 4; ++i) printf(" %s@%ld", feed[i].author.c_str(), feed[i].time);
    printf(" ...\n");
}
```

Output:

```text
fan-out on write: 30 billion feed inserts per day (347 thousand per second)
fan-out on read:  60 billion timeline reads per day to assemble feeds
one post by an account with 50 million followers: 50 million inserts on write
asha's feed: ravi@100 star1@95 meera@90 star2@80 ...
```

Push costs 30 billion small inserts a day, which is large but steady and parallel, except that one celebrity post suddenly needs 50 million inserts. Pull costs about 60 billion timeline reads a day on the read path, where latency matters most. The hybrid removes the worst of both: Asha's precomputed feed holds posts pushed from Ravi and Meera, and posts from the two celebrities she follows are fetched and merged when she opens the app. Since each user follows only a handful of celebrities, the read-time merge stays small.

#### Architecture

```text
post:  client -> post service -> posts DB (sharded by post id) + media -> object storage/CDN
                      |
                      +-> fan-out workers (queue): followers of the author, active users only
                                -> feed cache: feed:{user} = [post ids, newest first, capped ~800]
read:  client -> feed service -> feed cache (pushed ids) + celebrity posts (pulled)
                      -> hydrate posts and authors (caches) -> ranking service -> page + cursor
```

#### Deep dives

- **Feed storage**: store only post ids (8 bytes each) per user, capped at a few hundred entries; 300 million users × 800 ids × 8 bytes is about 2 TB in memory, sharded by user id.
- **Fan-out workers** consume "post created" events from a queue, look up followers in batches, and write to feed shards; a celebrity threshold routes big accounts to the pull path.
- **Ranking**: a lightweight first pass narrows candidates, a heavier model scores the top few hundred; features come from a feature store (how often Asha interacts with Ravi, post engagement so far).
- **Consistency**: feeds are eventually consistent; a user's own new post is inserted into their own feed immediately (read-your-writes).
- **Deletes and privacy**: deleting a post removes it on read (hydration drops deleted posts) rather than chasing every feed copy.

Connects to: top K elements, fan-out in publish-subscribe and event-driven architecture, where to cache, sharding strategies, DISTINCT, LIMIT and OFFSET (cursor pagination), photo sharing app.

### questions
Q: What is the difference between fan-out on write and fan-out on read?
A: Fan-out on write copies each new post's id into every follower's precomputed feed, making reads cheap but writes expensive, especially for accounts with many followers. Fan-out on read gathers recent posts from all followed accounts when the feed is loaded, making writes cheap but reads slow and costly.

Q: How do you handle celebrities with millions of followers?
A: Use a hybrid: don't fan out their posts on write; instead, when a user loads their feed, fetch recent posts from the few celebrities they follow and merge them with the precomputed feed of normal accounts. This avoids millions of writes per celebrity post.

Q: How would you paginate a ranked feed that keeps changing?
A: With a cursor that encodes where the last page ended, such as the last item's rank score and id, or a snapshot of the ranked candidate list, instead of offsets, which would skip or repeat items as new posts arrive.

Q: Where does ranking fit in the feed pipeline?
A: After candidate generation: collect a few hundred candidate posts from the precomputed feed and pulled celebrity posts, hydrate them with features, score them with a ranking model, and return the top ones. Expensive models run only on this small candidate set.

## sysd.classics.chat-application
name: "Chat application"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.messaging.real-time-delivery]
scope: "WebSockets, delivery receipts, storage"

### simple
A chat app delivers messages between people instantly, in one-to-one and group conversations, and keeps the history on every device. Each online device keeps an open connection to a chat server so messages can be pushed the moment they arrive; offline users get a push notification and catch up later. Messages must appear in the same order for everyone and show whether they were delivered and read.

### interview
- Requirements: one-to-one and group chats, real-time delivery, sent, delivered and read receipts, history synced across a user's devices, offline delivery; for example 50 million daily users.
- **Connections**: each device holds a WebSocket to a **connection server**; a presence and session registry maps user and device to server.
- **Send path**: the sender's server passes the message to the chat service, which assigns a **per-conversation sequence number**, stores it, acknowledges the sender ("sent"), and routes it to each recipient device's connection server (via pub-sub) or to push notifications if offline.
- **Ordering**: per-conversation sequence numbers (from one owner per conversation, or a per-conversation counter) give everyone the same order; clients detect gaps and fetch missing messages.
- **Storage**: messages partitioned by conversation id, clustered by sequence (a wide-column store like Cassandra, or sharded SQL); recent messages cached; media in object storage.
- **Receipts**: store per member per conversation "delivered up to" and "read up to" watermarks instead of a row per message per reader.
- **Multi-device sync**: each device keeps its own cursor (last sequence seen) and fetches everything newer on reconnect.
- **Groups**: fan out to members' devices; large groups fan out asynchronously; cap group size or switch to pull for huge channels.

### deep
#### Ordering, gap filling and receipts

```cpp
struct Message { long seq; string from, text; };

int main() {
    // the chat service assigns a per-conversation sequence number to every message
    map<long, Message> server_log;
    long next_seq = 1;
    for (auto [from, text] : vector<pair<string, string>>{
             {"asha", "hi"}, {"ravi", "hey"}, {"asha", "lunch?"}, {"ravi", "sure"}}) {
        server_log[next_seq] = {next_seq, from, text};
        ++next_seq;
    }
    // Meera's phone received 1, 2 and 4 over the socket; message 3 was lost in a reconnect
    vector<long> received = {1, 2, 4};
    long expected = 1;
    for (long seq : received) {
        while (expected < seq) {                     // a gap: fetch what's missing
            printf("gap before %ld: fetch seq %ld -> \"%s\"\n", seq, expected,
                   server_log[expected].text.c_str());
            ++expected;
        }
        printf("show seq %ld: %s: %s\n", seq, server_log[seq].from.c_str(),
               server_log[seq].text.c_str());
        expected = seq + 1;
    }
    // receipts as watermarks per member, not one row per message
    map<string, pair<long, long>> receipts = {       // member -> (delivered, read)
        {"ravi", {4, 4}}, {"meera", {4, 2}}};
    for (auto& [who, r] : receipts)
        printf("%s: delivered up to %ld, read up to %ld\n", who.c_str(), r.first, r.second);
}
```

Output:

```text
show seq 1: asha: hi
show seq 2: ravi: hey
gap before 4: fetch seq 3 -> "lunch?"
show seq 4: ravi: sure
meera: delivered up to 4, read up to 2
ravi: delivered up to 4, read up to 4
```

Because the server numbers messages per conversation, Meera's phone knows that after 2 comes 3: receiving 4 reveals a gap, and it fetches message 3 from history before showing 4. Timestamps from senders' clocks couldn't give this guarantee. Receipts stored as two numbers per member ("delivered up to 4, read up to 2") replace millions of per-message rows: a message shows as read by everyone when every member's read watermark has passed it.

#### Architecture

```text
device --WebSocket--> connection server (holds ~500k sockets) --> chat service
                            ^                                       | assign seq, store
                            |                                       v
                      pub-sub: "deliver to user 42"         messages DB (partition: conversation,
                            |                                         cluster: seq)
presence registry: user/device -> connection server       push service (APNs/FCM) for offline
```

#### Deep dives

- **Send reliability**: the client generates a message id (idempotency key) and retries until the server acknowledges; the server deduplicates, so retries never create duplicates.
- **Delivery to offline users**: the message is stored anyway; a push notification wakes the device, which syncs from its cursor. Nothing depends on the push arriving.
- **Groups**: for small groups, fan out to each member's devices; for large groups, write once and let members' devices pull, with notifications batched.
- **Storage estimate**: 50 million users × 40 messages a day × 200 bytes = 400 GB a day, about 146 TB a year before replication; recent history is hot, old history cold.
- **End-to-end encryption** (if required) moves message content out of the server's reach: servers route and store ciphertext, and multi-device sync needs per-device keys.

Connects to: real-time delivery, message queues, publish-subscribe and event-driven architecture, choosing SQL vs NoSQL in design, notification system, idempotency and exactly-once myths.

### questions
Q: How do you keep messages in the same order for everyone in a conversation?
A: Assign each message a sequence number per conversation on the server, for example by routing each conversation to one owner that increments a counter, and have clients display messages by that number, fetching any missing numbers they detect as gaps.

Q: How are messages delivered to users who are offline?
A: Messages are always persisted first. If a recipient has no active connection, a push notification is sent through the platform's push service; when the app reconnects, each device requests all messages after the last sequence number it has seen.

Q: How would you store delivery and read receipts efficiently?
A: Store watermarks: for each member of a conversation, the highest sequence number delivered to them and the highest they have read. One small update per member replaces a receipt row per message per reader, and group read status is computed from members' watermarks.

Q: How do WebSocket connection servers scale?
A: Each server holds many persistent connections using event-driven I/O; a registry records which server holds each user's devices; messages for a user are routed to that server through a pub-sub layer. Servers are added horizontally, and clients reconnect to any server after failures.

## sysd.classics.photo-sharing-app
name: "Photo sharing app"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "uploads, feeds, CDN"

### simple
A photo sharing app lets people upload pictures, follow friends and scroll a feed of photos. The photos themselves are large files stored in object storage and delivered from a CDN near each viewer, while a database keeps who posted what. Much of the design is making uploads reliable and turning each original into several smaller sizes for fast viewing.

### interview
- Requirements: upload photos with captions, follow users, a home feed, likes and comments; about 100 million uploads a day and far more views.
- **Upload**: the client asks the API for a presigned URL and uploads the original straight to object storage (resumable for large files); an "uploaded" event triggers **processing**: validation, stripping location metadata, resizing into several sizes and formats, moderation.
- **Metadata**: photo id, owner, caption, object keys of each size, created time, in a sharded database (by photo id or owner id); likes and comment counts in counters or a separate store.
- **Feed**: the same design as a news feed: fan-out on write of photo ids for normal accounts, pull for celebrities, then ranking.
- **Serving**: images through a **CDN**; clients request the size they need (thumbnails in the grid, larger on tap); immutable keys let the CDN cache forever.
- **Estimates**: about 230 TB of new images a day (original plus variants) and hundreds of thousands of views per second, nearly all absorbed by the CDN.

### deep
#### Capacity

```cpp
int main() {
    const double uploads = 100e6, original_mb = 2.0, variants_mb = 0.3;   // thumbnails etc.
    const double viewers = 500e6, views_each = 50, view_kb = 100, cdn_hit = 0.95;
    double per_day_tb = uploads * (original_mb + variants_mb) / 1e6;
    printf("new photo data: %.0f TB per day, %.0f PB per year (before copies)\n", per_day_tb,
           per_day_tb * 365 / 1000);
    printf("uploads: %.0f per second on average\n", uploads / 86400);
    double views = viewers * views_each / 86400;
    printf("photo views: %.0f thousand per second, %.0f GB/s from the CDN\n", views / 1e3,
           views * view_kb / 1e6);
    printf("origin requests after a %.0f%% CDN hit ratio: %.1f thousand per second\n",
           cdn_hit * 100, views * (1 - cdn_hit) / 1e3);
    printf("metadata: %.0f GB per day at 500 bytes per photo\n", uploads * 500 / 1e9);
}
```

Output:

```text
new photo data: 230 TB per day, 84 PB per year (before copies)
uploads: 1157 per second on average
photo views: 289 thousand per second, 29 GB/s from the CDN
origin requests after a 95% CDN hit ratio: 14.5 thousand per second
metadata: 50 GB per day at 500 bytes per photo
```

Images dominate everything: 230 TB a day adds up to about 84 PB a year before replication, which is why object storage with erasure coding and lifecycle rules (move old originals to colder, cheaper storage) matters so much. Viewing needs about 29 GB/s at the edge, and even a 95% CDN hit ratio leaves the origin 14,500 requests per second, so a caching layer in front of object storage (or a CDN origin shield) helps. Metadata is small by comparison: 50 GB a day fits a sharded database comfortably.

#### Upload and processing pipeline

```text
client -> API: "new photo" -> presigned URL (object key photos/raw/8f3a...)
client -> object storage: PUT original (resumable multipart for big files)
object storage -> queue: "raw uploaded"
workers: validate, strip GPS metadata, resize to 150, 640 and 1080 px (WebP/AVIF + JPEG),
         moderation check -> write variants -> update metadata (status: ready)
         -> publish "photo posted" -> feed fan-out workers
```

The upload returns quickly; the photo appears in followers' feeds once processing finishes, usually within seconds. Processing is idempotent (same input, same output keys), so retries are safe.

#### Deep dives

- **Sizes and formats**: serving a 100 KB variant instead of a 2 MB original cuts bandwidth twentyfold; modern formats shrink it further; the client asks for the smallest size that looks sharp on its screen.
- **Hot photos** (a celebrity post) are served entirely from the CDN; the metadata and like counters for them need caching and sharded counters.
- **Deletion**: remove metadata at once (so it disappears from feeds), then delete objects in the background, including every variant, and purge CDN caches.

Connects to: object storage and blobs, CDNs, news feed, message queues, back-of-the-envelope estimation, video streaming platform.

### questions
Q: How should photo uploads flow in a large photo app?
A: The client gets a short-lived presigned URL from the API and uploads directly to object storage, bypassing app servers; the storage event triggers asynchronous workers that validate, strip metadata, generate resized variants and update the photo's status, after which the photo is published to feeds.

Q: Why generate several image sizes?
A: Clients rarely need the original: grids show thumbnails and phones need moderate resolutions. Serving the right size saves bandwidth, speeds up loading and increases CDN efficiency, while originals are kept for future formats or reprocessing.

Q: Where do photos and their metadata live?
A: Image bytes live in object storage, delivered through a CDN with immutable keys; metadata such as owner, caption, variant keys and timestamps lives in a sharded database, with counters and relationships in stores suited to them.

## sysd.classics.video-streaming-platform
name: "Video streaming platform"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "encoding, adaptive bitrate, CDN"

### simple
A video platform takes a creator's upload, converts it into several qualities, and streams it to viewers on phones and TVs around the world. Each video is cut into short segments of a few seconds, so the player can switch to a lower quality when the network slows down and back up when it recovers. Nearly all of the traffic is served by CDN servers close to the viewers.

### interview
- **Upload and transcoding**: the original goes to object storage; a pipeline splits it into chunks, transcodes them in parallel into a **bitrate ladder** (for example 240p to 4K, several codecs), packages them into segments with manifests, and generates thumbnails.
- **Adaptive bitrate streaming** (HLS, DASH): the video is a series of 2 to 10 second segments at every quality; a manifest lists them; the **player** measures throughput and buffer and picks the quality of each next segment.
- **CDN**: segments are static files, ideal for edge caching; popular videos are pre-positioned near viewers; the long tail is fetched from origin on demand.
- **Metadata and search** (titles, channels, recommendations) live in databases and a search index, completely separate from video delivery.
- **View counts** at scale: events into a stream, aggregated and deduplicated asynchronously; approximate counts shown in real time.
- Estimates: a 5 Mbit/s stream for a million concurrent viewers is 5 Tbit/s, which only a CDN can deliver.

### deep
#### Why adaptive bitrate

Twelve 4-second segments over a network that dips from 6 Mbit/s to under 1 Mbit/s and recovers. A player fixed at 5 Mbit/s compares with one that picks each segment's quality from recent throughput with a 20% safety margin:

```cpp
int main() {
    const vector<int> ladder = {400, 1000, 2500, 5000};             // kbit/s renditions
    const double segment_s = 4;
    vector<double> network = {6000, 6000, 5500, 1200, 900, 800, 1500, 3000, 6000, 6000,
                              6000, 6000};                          // kbit/s per segment
    for (bool adaptive : {false, true}) {
        double buffer = 0, stalled = 0;
        vector<double> recent;                                      // measured throughputs
        string picks;
        for (double bw : network) {
            int rate = 5000;
            if (adaptive) {
                double est = recent.empty() ? 1000 : 0;             // start conservatively
                if (!recent.empty()) {                              // harmonic mean of last 3
                    size_t n = min<size_t>(3, recent.size());
                    for (size_t i = recent.size() - n; i < recent.size(); ++i) est += 1 / recent[i];
                    est = n / est;
                }
                rate = ladder[0];
                for (int r : ladder) if (r <= 0.8 * est) rate = r;  // keep a safety margin
            }
            double download_s = rate * segment_s / bw;
            if (download_s > buffer) { stalled += download_s - buffer; buffer = 0; }  // waiting
            else buffer -= download_s;
            buffer += segment_s;
            recent.push_back(bw);
            char label[8];
            snprintf(label, sizeof label, "%.1f ", rate / 1000.0);
            picks += label;
        }
        printf("%-8s Mbit/s: %s| waited %.1f s\n",
               adaptive ? "adaptive" : "fixed", picks.c_str(), stalled);
    }
}
```

Output:

```text
fixed    Mbit/s: 5.0 5.0 5.0 5.0 5.0 5.0 5.0 5.0 5.0 5.0 5.0 5.0 | waited 66.2 s
adaptive Mbit/s: 0.4 2.5 2.5 2.5 1.0 1.0 0.4 0.4 1.0 1.0 2.5 2.5 | waited 1.5 s
```

The fixed player waits over a minute in total, mostly frozen during the dip, because each 5 Mbit/s segment takes longer to download than it takes to play. The adaptive player starts low (a quick start), climbs to 2.5 Mbit/s, steps down to 1 and 0.4 Mbit/s as throughput falls, and climbs back as it recovers, waiting only 1.5 seconds in total. Users forgive a few blurry seconds far more readily than a spinning wheel. Real players also weigh the buffer level (a full buffer allows riskier choices) and switch smoothly.

#### Architecture

```text
creator -> upload service -> object storage (original)
             -> transcoding queue -> workers (chunks in parallel) -> segments + manifests
             -> metadata DB (title, channel, status) -> search index, recommendations
viewer -> API (metadata, manifest URL) -> CDN edge -> segments (origin: object storage)
player -> view events -> stream processing -> view counts, analytics
```

#### Deep dives

- **Transcoding cost**: each upload becomes dozens of renditions; split into chunks so a long video transcodes in minutes on many machines; prioritize popular creators; use hardware encoders.
- **Storage**: every rendition is stored; rarely watched videos can keep fewer renditions or move to cold storage.
- **Live streaming** differs: segments are produced continuously, latency targets are seconds, and CDNs must fetch new segments as they appear.
- **Start-up time**: short first segments, a low first rendition, and a CDN hit for the first segment keep time-to-first-frame low.

Connects to: CDNs, object storage and blobs, message queues, latency vs throughput trade-offs, HyperLogLog and count-min sketch (view counting), photo sharing app.

### questions
Q: What is adaptive bitrate streaming?
A: The video is encoded at several quality levels and split into short segments listed in a manifest; the player measures network throughput and buffer level and chooses the quality of each next segment, stepping down when the network slows and up when it improves, to avoid stalls.

Q: How does a video platform process an upload?
A: It stores the original in object storage, then a pipeline splits it into chunks, transcodes them in parallel into a ladder of resolutions and bitrates, packages segments and manifests for HLS or DASH, generates thumbnails, and marks the video ready in the metadata store.

Q: Why is a CDN essential for video?
A: Video dominates bandwidth: a million viewers at a few Mbit/s each is terabits per second, far beyond any origin. Segments are static and cacheable, so edge servers near viewers serve almost all traffic with low latency.

## sysd.classics.file-storage-and-sync
name: "File storage and sync"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "chunking, deduplication, conflicts"

### simple
A cloud drive keeps your files in the cloud and in sync across your laptop and phone: edit a file on one device and the change appears on the others within seconds. To make that fast, files are cut into chunks and only the changed chunks travel. When two devices edit the same file at the same time, the system must notice the conflict instead of silently losing one person's work.

### interview
- **Chunking**: split files into chunks (about 4 to 8 MB, or smaller), each identified by the **hash of its content**. Upload only chunks the server doesn't have: resumable uploads, and **deduplication** across versions and users.
- **Content-defined chunking** (cut points chosen by a rolling hash of the content) keeps chunk boundaries stable when bytes are inserted, so an edit near the start doesn't change every chunk.
- **Metadata service**: files, folders, versions, and each version's list of chunk hashes; the source of truth for the tree. Chunks go to object storage (the "block store").
- **Sync protocol**: the client watches the file system, computes chunks, uploads missing ones, then commits a new version to the metadata service; other devices learn about changes through a long poll, WebSocket or push, and download only missing chunks.
- **Conflicts**: each commit names the version it was based on; if the server's latest version differs, it's a conflict: keep both ("conflicted copy") or merge for formats that allow it.
- **Cost**: deduplication and compression cut storage; old versions are kept for a retention period.

### deep
#### Fixed vs content-defined chunks

A 1 MB file gets 8 bytes inserted near the start. How many chunks must be uploaded again?

```cpp
uint64_t mix(uint64_t x) {
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

vector<string> fixed_chunks(const string& data, size_t size) {
    vector<string> out;
    for (size_t i = 0; i < data.size(); i += size) out.push_back(data.substr(i, size));
    return out;
}

vector<string> content_chunks(const string& data) {   // cut where a rolling hash matches
    static uint64_t gear[256];
    if (!gear[0]) for (int i = 0; i < 256; ++i) gear[i] = mix(i);
    vector<string> out;
    size_t start = 0;
    uint64_t h = 0;
    for (size_t i = 0; i < data.size(); ++i) {
        h = (h << 1) + gear[(unsigned char)data[i]];   // depends on about the last 64 bytes
        size_t len = i + 1 - start;
        if ((len >= 2048 && (h & 8191) == 0) || len >= 65536) {   // average about 8 KB
            out.push_back(data.substr(start, len));
            start = i + 1;
            h = 0;
        }
    }
    if (start < data.size()) out.push_back(data.substr(start));
    return out;
}

int changed(const vector<string>& before, const vector<string>& after) {
    unordered_set<size_t> old;
    for (auto& c : before) old.insert(hash<string>{}(c));
    int n = 0;
    for (auto& c : after) n += !old.count(hash<string>{}(c));   // chunks to upload
    return n;
}

int main() {
    string file;
    for (uint64_t i = 0; file.size() < 1000000; ++i) file += char('a' + mix(i) % 26);
    string edited = file;
    edited.insert(1000, "INSERTED");                     // add 8 bytes near the start

    auto f1 = fixed_chunks(file, 8192), f2 = fixed_chunks(edited, 8192);
    auto c1 = content_chunks(file), c2 = content_chunks(edited);
    printf("fixed 8 KB chunks:       %zu chunks, %d must be uploaded after the edit\n",
           f2.size(), changed(f1, f2));
    printf("content-defined chunks:  %zu chunks, %d must be uploaded after the edit\n",
           c2.size(), changed(c1, c2));
}
```

Output:

```text
fixed 8 KB chunks:       123 chunks, 123 must be uploaded after the edit
content-defined chunks:  126 chunks, 1 must be uploaded after the edit
```

With fixed-size chunks, the insertion shifts every later byte, so every chunk's content (and hash) changes and the whole file is re-sent. With content-defined chunking, boundaries sit where the rolling hash of the preceding bytes matches a pattern; the insertion changes only the chunk that contains it, and the cut points after it realign with the old ones. One chunk (about 8 KB) travels instead of a megabyte. (A production system identifies chunks by a strong hash such as SHA-256, not a hash table's hash.)

#### Architecture

```text
device: file watcher -> chunker -> "which chunks do you lack?" -> upload missing chunks
                                                              -> block store (object storage)
        -> commit(file, base_version, chunk list) -> metadata service (versions, tree)
                                                          |
other devices <- notification service ("folder X changed, version 18") <- change log
             -> fetch new metadata -> download missing chunks -> rebuild file
```

#### Conflicts

Laptop and phone both edit `notes.txt` starting from version 17. The laptop commits version 18 first. The phone's commit says "based on 17", but the latest is 18, so the server rejects it as a conflict (an optimistic concurrency check). The phone keeps its edit as `notes (phone's conflicted copy).txt` and syncs version 18; nobody's work is lost, and the user merges by hand. Collaborative formats avoid this with operation-level merging.

#### Estimates

50 million users with 10 GB each is 500 PB of logical data; deduplication and compression often save a large share, especially for shared and versioned files. Metadata is far smaller but hot: every sync touches it, so it's sharded by user or namespace and heavily cached.

Connects to: hashing, object storage and blobs, Merkle trees, real-time delivery, optimistic concurrency control, collaborative document editing.

### questions
Q: Why split files into chunks for sync?
A: Only changed chunks need to be uploaded or downloaded, which makes syncing large files fast; interrupted transfers resume from the last chunk; and identical chunks across versions or users are stored once when identified by their content hash.

Q: What is content-defined chunking and why is it better than fixed-size chunks?
A: Chunk boundaries are placed where a rolling hash of the recent bytes meets a condition, so they depend on content rather than offsets. An insertion then only changes the chunk around it, while fixed-size chunking shifts every later boundary and changes every following chunk.

Q: How do you detect and handle conflicting edits to the same file?
A: Each commit carries the version it was based on; if the server's latest version is newer, the commit conflicts. The system keeps both, saving the second as a conflicted copy for the user to merge, or merges automatically for formats that support it.

## sysd.classics.ride-hailing
name: "Ride-hailing"
importance: important
prereqs: [sysd.method.the-interview-framework, sysd.building-blocks.geospatial-indexing]
scope: "location updates, matching, geo-indexing"

### simple
A ride-hailing backend tracks where every available driver is, finds the nearby ones when a rider asks for a ride, offers the trip to a driver, and follows the trip until drop-off. Drivers' phones send their location every few seconds, so the system must absorb a steady flood of small updates and answer "who's near here?" instantly. It must also make sure a trip ends up with exactly one driver.

### interview
- **Location ingestion**: drivers send position every 3 to 5 seconds; 200,000 active drivers means about 50,000 updates per second. Keep **current** positions in memory (a geo index sharded by city or region); send updates to a stream for trip tracking and analytics.
- **Geospatial index**: geohash cells or a quadtree (or H3 hexagons) mapping cells to available drivers; query the rider's cell and neighbors, compute distances or ETAs on the road network.
- **Matching**: rank nearby drivers by ETA (not straight-line distance), offer the trip to the best one with a short timeout, move on if they decline or don't answer; batch matching over a few seconds can improve global efficiency.
- **Trip state machine**: requested → accepted → driver arriving → in progress → completed (or cancelled). The assignment is a **conditional update** so exactly one driver wins.
- **Surge pricing and ETAs**: compare demand and supply per area over short windows; ETA from routing services and historical speeds.
- Region sharding keeps each city's traffic local; payments and trip history go to durable storage.

### deep
#### Exactly one driver per trip

```cpp
struct Trip { string status = "requested"; string driver; };

// Like UPDATE trips SET driver = ?, status = 'accepted' WHERE id = ? AND status = 'requested'
bool accept(Trip& trip, const string& driver) {
    if (trip.status != "requested") return false;        // the condition fails: 0 rows
    trip.status = "accepted";
    trip.driver = driver;
    return true;
}

int main() {
    const double drivers = 200000, every_s = 4;
    printf("location updates: %.0f per second from %.0f active drivers\n", drivers / every_s,
           drivers);
    Trip trip;
    for (string d : {"driver-17", "driver-42"})           // both tap "accept" at once
        printf("%s accepts: %s\n", d.c_str(),
               accept(trip, d) ? "assigned" : "too late, offered to someone else");
    printf("trip: %s by %s\n", trip.status.c_str(), trip.driver.c_str());
}
```

Output:

```text
location updates: 50000 per second from 200000 active drivers
driver-17 accepts: assigned
driver-42 accepts: too late, offered to someone else
trip: accepted by driver-17
```

Offers can overlap: the first driver's timeout expires, the trip is offered to a second, and the first taps accept just too late. The assignment must be a compare-and-set on the trip's state, in SQL `UPDATE trips SET driver_id = ?, status = 'accepted' WHERE id = ? AND status = 'requested'` (0 rows updated means someone else won), or a conditional write in a key-value store. The loser's app is told the trip is gone. The 50,000 location updates per second, meanwhile, never touch the trip database: they update an in-memory index.

#### Architecture

```text
driver app --(every 4 s)--> location service --> geo index (Redis GEO / in-memory grid,
                                  |                    sharded by city)
                                  +--> stream (trip tracking, analytics, ETA models)
rider app --> ride service --> matching: candidates from geo index -> ETA ranking
                  |                -> offer to driver (timeout 10 s) -> conditional accept
                  +--> trips DB (state machine) --> payments, notifications
```

#### Deep dives

- **Why in memory**: positions are overwritten every few seconds and only the latest matters; a database write per update would be wasteful. Losing the index on a crash is tolerable, since drivers report again within seconds.
- **ETA vs distance**: the nearest driver across a river may be 20 minutes away; rank candidates with a routing service's ETA.
- **Hot spots**: a stadium letting out concentrates requests in a few cells; shard by finer cells, and use surge pricing to rebalance supply.
- **Trip tracking**: during a trip, the driver's updates also flow to the rider (via a push channel) and are stored for fare calculation and safety.

Connects to: geospatial indexing, real-time delivery, sharding strategies, optimistic concurrency control, message queues, latency vs throughput trade-offs.

### questions
Q: How do you handle the stream of driver location updates?
A: Accept them through a location service that updates an in-memory geospatial index of available drivers, sharded by region, since only the latest position matters; forward the stream to trip tracking and analytics asynchronously. At 200,000 drivers reporting every 4 seconds this is about 50,000 updates per second.

Q: How do you find nearby drivers quickly?
A: Index available drivers by geohash, quadtree or hexagon cell; for a request, look up drivers in the rider's cell and neighboring cells, widen the search if too few are found, then rank candidates by estimated time of arrival rather than straight-line distance.

Q: How do you ensure a trip is assigned to only one driver?
A: Make acceptance a conditional update on the trip's state, such as setting the driver only where status is still requested; exactly one update succeeds, and any other accepting driver is told the trip is no longer available.

## sysd.classics.typeahead-autocomplete
name: "Typeahead autocomplete"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "trie service, top-k caching"

## sysd.classics.e-commerce-and-flash-sales
name: "E-commerce and flash sales"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "inventory, oversell prevention"

## sysd.classics.ticket-booking
name: "Ticket booking"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "seat locking, payments, consistency"

## sysd.classics.payment-system
name: "Payment system"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "idempotency, ledgers, reconciliation"

## sysd.classics.leaderboard
name: "Leaderboard"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "sorted sets, sharding scores"

## sysd.classics.distributed-cache
name: "Distributed cache"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "eviction, consistent hashing, replication"

## sysd.classics.distributed-message-queue
name: "Distributed message queue"
importance: important
prereqs: [sysd.method.the-interview-framework, sysd.messaging.message-queues]
scope: "partitions, offsets, consumer groups"

## sysd.classics.stock-exchange-matching-engine
name: "Stock exchange matching engine"
importance: advanced
tracks: [sde, quant]
prereqs: [sysd.method.the-interview-framework]
scope: "order book, price-time priority, low latency"

## sysd.classics.collaborative-document-editing
name: "Collaborative document editing"
importance: advanced
prereqs: [sysd.method.the-interview-framework]
scope: "operational transforms and CRDTs overview"

## sysd.classics.metrics-and-monitoring-system
name: "Metrics and monitoring system"
importance: advanced
prereqs: [sysd.method.the-interview-framework]
scope: "time-series ingestion"
