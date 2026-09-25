---
topic: sysd.caching
name: "Caching"
subject: sysd
order: 3
prereqs: [sysd.scalability]
---

## sysd.caching.where-to-cache
name: "Where to cache"
importance: must
scope: "client, CDN, application, database"

### simple
A cache keeps a copy of data somewhere faster or closer than where it really lives, so repeated requests don't pay the full cost. Caches can sit in the user's browser, in a CDN near the user, in the application's memory or a cache server, and inside the database itself. It is like keeping the snacks you eat daily on your desk instead of walking to the shop each time.

### interview
- **Client**: browser and app caches controlled by HTTP headers (`Cache-Control: max-age`, `ETag` with `If-None-Match` for cheap revalidation returning 304). Fastest (no network) but you can't invalidate it remotely.
- **CDN**: edge servers close to users cache static assets and cacheable API responses; cuts latency and origin load. Invalidate by purging or by versioned URLs (`app.3f9c.js`).
- **Application**: in-process (a map in the server's memory: nanoseconds, but per instance and duplicated) or **distributed** (Redis, Memcached: shared, about 0.5 ms over the network).
- **Database**: the buffer pool caches pages in memory; materialized views and read replicas act as caches of results. (MySQL 8 removed its old query cache.)
- The math: average latency = hit ratio × cache time + miss ratio × (cache + source time); the database sees only the misses. Going from 90% to 99% hits cuts database load tenfold.
- Cache what is **read often, changes rarely, and is expensive to compute**; think about staleness each layer adds.

### deep
#### Layers from the user inward

| layer | where it sits | answers in about |
|---|---|---|
| browser or app cache | on the user's device | 0 ms (no network at all) |
| CDN edge | a city near the user | 10 to 30 ms from the user |
| reverse proxy cache | in front of the app servers | 1 ms inside the data center |
| in-process cache | inside each app server | a microsecond |
| distributed cache (Redis) | its own servers | 0.5 ms |
| database buffer pool | the database's memory | 0.1 ms plus the query's work |
| disk | the database's storage | 0.1 ms (SSD) to 10 ms (hard disk) |

Each layer closer to the user saves more work but is harder to invalidate. A browser holding a response for a day can't be told to drop it; a Redis key can be deleted in a millisecond.

#### Hit ratio is everything

Say Redis answers in 0.5 ms, the database in 10 ms, and 50,000 reads arrive per second:

```cpp
int main() {
    const double cache_ms = 0.5, db_ms = 10, reads_per_s = 50000;
    printf("hit ratio  avg latency  database reads/s\n");
    for (double h : {0.0, 0.5, 0.8, 0.9, 0.99}) {
        double avg = h * cache_ms + (1 - h) * (cache_ms + db_ms);  // a miss pays both
        printf("%8.0f%% %9.2f ms %14.0f\n", h * 100, avg, (1 - h) * reads_per_s);
    }
}
```

Output:

```text
hit ratio  avg latency  database reads/s
       0%     10.50 ms          50000
      50%      5.50 ms          25000
      80%      2.50 ms          10000
      90%      1.50 ms           5000
      99%      0.60 ms            500
```

The last two rows are the important ones: from 90% to 99% hits, average latency drops 2.5 times, but database load drops **tenfold**, from 5,000 to 500 reads per second. That is often the difference between needing read replicas or not, and it is why hit ratio is the first cache metric to watch. It also shows the danger: if the cache is flushed or fails, the database suddenly receives all 50,000 reads.

#### HTTP caching at the edges

```text
HTTP/1.1 200 OK
Cache-Control: public, max-age=300
ETag: "v42"

GET /v1/products/9  (five minutes later)
If-None-Match: "v42"
-> 304 Not Modified   (no body; the cached copy is still valid)
```

`max-age=300` lets browsers and CDNs reuse the response for 5 minutes without asking. After that, the `ETag` lets them revalidate cheaply. `private` keeps per-user responses out of shared caches like CDNs, and `no-store` forbids caching sensitive data at all. Static files get long lifetimes with a content hash in the file name, so a new deploy simply references new URLs.

#### What to cache, and what not to

| good candidates | poor candidates |
|---|---|
| product pages, profiles, configuration | balances, inventory counts at checkout |
| expensive aggregates (dashboards, counts) | data written far more often than read |
| rendered HTML fragments, feed pages | per-request unique results |
| session data, rate-limit counters | anything that must never be stale |

Connects to: CDNs, HTTP basics, caching strategies, cache invalidation and consistency, eviction policies, buffer management (the database's own cache).

### questions
Q: Where can a web system cache data?
A: In the client (browser or app, via HTTP cache headers), at a CDN edge near users, in a reverse proxy, inside the application process, in a distributed cache such as Redis or Memcached, and in the database's own memory (buffer pool). Closer layers save more latency but are harder to invalidate.

Q: How does the hit ratio affect the database?
A: The database only serves the misses, so its load is (1 - hit ratio) times the read rate. Raising the hit ratio from 90% to 99% cuts database reads tenfold, which is why small hit-ratio changes have large capacity effects.

Q: What is the difference between an in-process cache and a distributed cache?
A: An in-process cache lives in each server's memory: extremely fast, but duplicated per instance, lost on restart and hard to invalidate everywhere. A distributed cache like Redis is shared by all instances and survives app restarts, at the cost of a network hop of about half a millisecond.

Q: How do ETags make HTTP caching cheaper?
A: The server labels a response with an ETag; when the cached copy expires, the client asks again with If-None-Match. If the resource hasn't changed, the server answers 304 Not Modified without a body, so the client reuses its copy and little data is sent.

## sysd.caching.caching-strategies
name: "Caching strategies"
importance: must
prereqs: [sysd.caching.where-to-cache]
scope: "cache-aside, read-through, write-through, write-back, write-around"

### simple
A caching strategy decides who fills the cache and what happens on a write. The application might load data into the cache only when someone asks for it, or write every change to both cache and database, or write only to the cache and save to the database later. Each choice trades speed against the risk of stale or lost data.

### interview
- **Cache-aside** (lazy loading): the app reads the cache; on a miss it reads the database and fills the cache. On a write it updates the database and **deletes** the cache key. The most common pattern; the cache only holds what's asked for, and a cache failure just means slower reads.
- **Read-through**: the same lazy loading, but the cache library or service loads from the database itself; the app only talks to the cache.
- **Write-through**: every write goes to the cache and the database synchronously. Reads after writes hit a fresh cache; writes are slower, and data written but never read still takes cache space.
- **Write-back** (write-behind): writes go to the cache only and are flushed to the database later, often batched. Very fast writes and fewer database writes, but **data is lost if the cache dies before flushing**; used for counters, metrics, and inside disks and CPUs.
- **Write-around**: writes go straight to the database, skipping the cache; the next read misses. Good when written data is rarely read soon.
- **Refresh-ahead**: popular keys are reloaded before they expire, so readers never see a miss.

### deep
#### Five strategies on the same workload

The workload writes a key, reads it twice, writes it three more times and reads it once, then the cache server crashes. Each strategy is counted by database reads and writes, and by what the database holds after the crash:

```cpp
struct Db { unordered_map<string, int> rows; int reads = 0, writes = 0; };

struct Strategy {
    string name;
    Db db;
    unordered_map<string, int> cache;
    unordered_set<string> dirty;               // write-back only
    int misses = 0;

    int read(const string& k) {
        if (auto it = cache.find(k); it != cache.end()) return it->second;
        ++misses; ++db.reads;
        int v = db.rows[k];
        cache[k] = v;                           // lazy fill on a miss
        return v;
    }
    void write(const string& k, int v) {
        if (name == "cache-aside") { db.rows[k] = v; ++db.writes; cache.erase(k); }
        else if (name == "write-through") { cache[k] = v; db.rows[k] = v; ++db.writes; }
        else if (name == "write-back") { cache[k] = v; dirty.insert(k); }
        else if (name == "write-around") { db.rows[k] = v; ++db.writes; cache.erase(k); }
    }
    void flush() {                              // write-back: runs every few seconds
        for (auto& k : dirty) { db.rows[k] = cache[k]; ++db.writes; }
        dirty.clear();
    }
};

int main() {
    printf("%-14s %8s %9s %7s %16s\n", "strategy", "db reads", "db writes", "misses",
           "db after crash");
    for (string name : {"cache-aside", "write-through", "write-back", "write-around"}) {
        Strategy s{name, {}, {}, {}, 0};
        s.write("price", 100);
        s.read("price"); s.read("price");
        if (name == "write-back") s.flush();   // one flush happened in time
        s.write("price", 110); s.write("price", 120); s.write("price", 130);
        s.read("price");
        s.cache.clear();                         // the cache server crashes
        printf("%-14s %8d %9d %7d %16d\n", name.c_str(), s.db.reads, s.db.writes, s.misses,
               s.db.rows["price"]);
    }
}
```

Output:

```text
strategy       db reads db writes  misses   db after crash
cache-aside           2         4       2              130
write-through         0         4       0              130
write-back            0         1       0              100
write-around          2         4       2              130
```

- **Cache-aside** paid a miss after the first write and again after the last (writes delete the key), but the database is always correct.
- **Write-through** never missed: each write refreshed the cache. Every write still cost a database write, plus a cache write.
- **Write-back** did one database write instead of four, the whole point, but lost the last three updates when the cache died: the database says 100 while users last saw 130.
- **Write-around** behaves like cache-aside here: in this form it deletes the cached key on write so readers don't see stale data, and the difference shows when written data isn't read soon, since the cache isn't filled with it.

Read-through isn't listed separately: its counts equal cache-aside's; only *who* loads the data differs.

#### Choosing

| workload | strategy |
|---|---|
| read heavy, general purpose | cache-aside (with a TTL as a safety net) |
| reads right after writes must be fast and fresh | write-through |
| extremely write heavy, loss acceptable or cache is durable | write-back |
| bulk writes rarely read soon (logs, imports) | write-around |
| a few very hot keys that must never miss | refresh-ahead |

#### Why delete instead of update on write

In cache-aside, updating the cache on write lets two concurrent writers leave the older value behind: writer A updates the database to 1, writer B to 2, then B's cache update lands before A's, and the cache keeps 1 forever. Deleting is idempotent: whichever order the deletes land in, the next reader loads the current value. A small race still remains (see cache invalidation), which a TTL bounds.

Connects to: where to cache, cache invalidation and consistency, write-ahead logging (write-back with durability), eviction policies, Redis and Memcached.

### questions
Q: How does the cache-aside pattern work?
A: On a read, the application checks the cache and, on a miss, loads from the database and stores the result in the cache. On a write, it updates the database and deletes the cache entry so the next read reloads fresh data. The cache holds only requested data, and if the cache is down, reads fall back to the database.

Q: What is the difference between write-through and write-back caching?
A: Write-through writes to the cache and the database synchronously, so both are always in step but every write pays the database cost. Write-back writes only to the cache and persists later in batches, making writes fast and reducing database load, but data not yet flushed is lost if the cache fails.

Q: When would you use write-around?
A: When written data is unlikely to be read soon, such as bulk imports or logs. Writing around the cache avoids filling it with data that would evict useful entries; the rare later read just misses once.

Q: Why do cache-aside implementations delete the cache entry on write instead of updating it?
A: Concurrent writers can apply their cache updates in a different order than their database writes, leaving an older value cached indefinitely. Deleting is safe in any order because the next read reloads the latest value from the database.

## sysd.caching.eviction-policies
name: "Eviction policies"
importance: must
prereqs: [sysd.caching.where-to-cache]
scope: "LRU, LFU, TTL"

### simple
A cache has limited memory, so when it is full it must throw something out to make room: that choice is the eviction policy. Least recently used throws out what hasn't been touched for the longest time; least frequently used throws out what has been used the fewest times; a time to live removes entries after a fixed age. It is like clearing a small fridge by removing what nobody has eaten in a while.

### interview
- **LRU** (least recently used): evict the entry untouched for the longest. O(1) with a hash map plus a doubly linked list. Great for recency-driven workloads; hurt by **scans** (one pass over many cold keys flushes the hot ones).
- **LFU** (least frequently used): evict the entry with the fewest hits. Resists scans and keeps long-term favorites; slow to adapt when popularity shifts, so real LFUs **decay** counts over time. O(1) with frequency buckets.
- **FIFO**: evict the oldest insertion regardless of use; simple, usually worse. **Random**: surprisingly decent and cheap.
- **TTL**: entries expire after a set time regardless of memory; bounds staleness, not size. Usually combined with LRU or LFU.
- Real systems approximate: Redis samples a few keys and evicts the best candidate among them (`allkeys-lru`, `allkeys-lfu` with decay, `volatile-*` for keys with a TTL); CLOCK approximates LRU with a reference bit. Newer designs (W-TinyLFU, ARC) combine recency and frequency.
- Size the cache so the **working set** fits; no policy saves a cache that is far too small.

### deep
#### LRU, LFU and FIFO on the same trace

The trace mimics a real cache: 80% of requests go to 10 hot keys, the rest to a thousand others; halfway through, a batch job scans 500 cold keys once each; then the hot set changes to 10 new keys. The cache holds 20 entries.

```cpp
class Lru {
    size_t cap; list<int> order; unordered_map<int, list<int>::iterator> pos;
public:
    explicit Lru(size_t c) : cap(c) {}
    bool get(int k) {
        auto it = pos.find(k);
        if (it != pos.end()) { order.splice(order.begin(), order, it->second); return true; }
        if (order.size() == cap) { pos.erase(order.back()); order.pop_back(); }
        order.push_front(k); pos[k] = order.begin();
        return false;
    }
};

class Lfu {   // frequency buckets; ties broken by recency inside a bucket
    size_t cap; int min_freq = 0;
    unordered_map<int, list<int>> bucket;                       // freq -> keys, newest first
    unordered_map<int, pair<int, list<int>::iterator>> where;   // key -> (freq, position)
public:
    explicit Lfu(size_t c) : cap(c) {}
    bool get(int k) {
        if (auto it = where.find(k); it != where.end()) {
            auto [f, p] = it->second;
            bucket[f].erase(p);
            if (bucket[f].empty() && min_freq == f) ++min_freq;
            bucket[f + 1].push_front(k);
            it->second = {f + 1, bucket[f + 1].begin()};
            return true;
        }
        if (where.size() == cap) {
            int victim = bucket[min_freq].back();
            bucket[min_freq].pop_back();
            where.erase(victim);
        }
        bucket[1].push_front(k);
        where[k] = {1, bucket[1].begin()};
        min_freq = 1;
        return false;
    }
};

class Fifo {
    size_t cap; deque<int> q; unordered_set<int> in;
public:
    explicit Fifo(size_t c) : cap(c) {}
    bool get(int k) {
        if (in.count(k)) return true;
        if (q.size() == cap) { in.erase(q.front()); q.pop_front(); }
        q.push_back(k); in.insert(k);
        return false;
    }
};

uint64_t rng = 3;
uint64_t next_rand() { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; return rng; }

int main() {
    vector<int> trace;
    auto phase = [&](int hot_base, int n) {
        for (int i = 0; i < n; ++i)
            trace.push_back(next_rand() % 10 < 8 ? hot_base + (int)(next_rand() % 10)
                                                 : 1000 + (int)(next_rand() % 1000));
    };
    phase(0, 5000);
    for (int i = 0; i < 500; ++i) trace.push_back(5000 + i);   // a one-off scan
    phase(0, 5000);
    phase(100, 5000);                                         // popularity shifts
    Lru lru(20); Lfu lfu(20); Fifo fifo(20);
    int h[3] = {0, 0, 0};
    int seg_hits[3][3] = {};
    for (size_t i = 0; i < trace.size(); ++i) {
        bool r[3] = {lru.get(trace[i]), lfu.get(trace[i]), fifo.get(trace[i])};
        int seg = i >= 10500 ? 2 : i >= 5000 ? 1 : 0;
        for (int p = 0; p < 3; ++p) { h[p] += r[p]; seg_hits[seg][p] += r[p]; }
    }
    const char* names[3] = {"LRU", "LFU", "FIFO"};
    int seg_len[3] = {5000, 5500, 5000};
    printf("policy  overall  before scan  scan+after  after shift\n");
    for (int p = 0; p < 3; ++p)
        printf("%-6s %7.1f%% %11.1f%% %10.1f%% %11.1f%%\n", names[p], 100.0 * h[p] / trace.size(),
               100.0 * seg_hits[0][p] / seg_len[0], 100.0 * seg_hits[1][p] / seg_len[1],
               100.0 * seg_hits[2][p] / seg_len[2]);
}
```

Output:

```text
policy  overall  before scan  scan+after  after shift
LRU       75.1%        77.6%       71.1%        77.1%
LFU       71.6%        79.5%       72.8%        62.2%
FIFO      64.0%        66.1%       60.7%        65.6%
```

The hot keys bring about 80% of requests, so that is roughly the best any policy can do here.

- **Before the scan**, LFU is best: a key used hundreds of times is never evicted by a key seen once, while LRU occasionally lets a burst of cold keys push a hot one out.
- **During the scan**, LRU loses its hot set to 500 keys touched once and pays misses to reload it; LFU shrugs the scan off.
- **After the shift**, LFU collapses to 62%: the old hot keys have huge counts and squat in the cache while the new hot keys, starting at count 1, are evicted again and again. This is why production LFUs decay counts over time. LRU adapts within a few requests.
- **FIFO** is worst throughout: it evicts hot keys on schedule, however popular they are.

Overall LRU wins on this trace because it adapts to change; with stable popularity and frequent scans, LFU would. Policies like W-TinyLFU combine both behaviors.

#### TTL

A time to live bounds how stale an entry can get and cleans up keys nobody asks for again. It is not a size policy: a cache with only TTLs can still run out of memory. Redis removes expired keys lazily (when touched) and by periodically sampling keys with a TTL.

#### Complexity

| policy | get and put | memory per entry |
|---|---|---|
| LRU (map + list) | O(1) | key, two pointers |
| LFU (freq buckets) | O(1) | key, count, pointers |
| FIFO | O(1) | key |
| sampled LRU (Redis) | O(sample size) | a timestamp |

Connects to: LRU cache (the data structure), page replacement algorithms, where to cache, Redis and Memcached, cache stampede and hot keys.

### questions
Q: How do you implement an LRU cache with O(1) operations?
A: Combine a hash map from key to a node in a doubly linked list ordered by recency. A get moves the node to the front; a put inserts at the front and, when full, evicts the node at the back and removes it from the map. All steps are constant time.

Q: When does LFU beat LRU?
A: When the workload has stable popular items plus one-off accesses such as scans or crawlers. LRU lets a burst of once-used keys evict the popular ones, while LFU keeps items with many hits. LFU adapts slowly when popularity changes, so real implementations decay counts.

Q: Is a TTL an eviction policy?
A: It is an expiry rule rather than a capacity policy: entries disappear after a fixed time whether or not memory is full, which bounds staleness. Caches pair TTLs with a capacity policy such as LRU or LFU to handle memory pressure.

Q: How does Redis implement LRU eviction?
A: Approximately: when memory is full, it samples a handful of keys (5 by default) and evicts the least recently used among them, keeping a pool of good candidates. This avoids maintaining a global linked list over millions of keys. Its LFU mode similarly uses a small, decaying frequency counter per key.

## sysd.caching.cache-invalidation-and-consistency
name: "Cache invalidation and consistency"
importance: must
prereqs: [sysd.caching.caching-strategies]
scope: "stale data, versioning"

### simple
A cache is a copy, so when the real data changes, the copy is wrong until it is updated or removed; removing it at the right time is invalidation. Get it wrong and users see old prices or deleted posts. It is like updating a price in the shop's system but forgetting the paper label on the shelf.

### interview
- **Staleness** is the price of caching. Decide per data type how stale is acceptable, and make the design meet it.
- Tools: **TTL** (bounds staleness, the safety net for every other method), **delete on write** (cache-aside), **write-through**, **versioned keys** (`product:9:v7`; a new version means a new key, so old entries age out), and **change data capture** (a service tails the database log and deletes affected keys, which also catches writes that bypass the app).
- **The race**: a reader misses and loads the old value; a writer updates the database and deletes the key; the reader then stores its old value, which stays until the TTL. Fixes: **leases** (a miss gets a token; a delete invalidates it; a set with a stale token is refused), version checks on set, a short TTL, or deleting again after a delay.
- Update the database first, then invalidate. Invalidating first lets a reader refill the old value before the database changes.
- Multiple layers (browser, CDN, app, Redis) each need an invalidation story; CDN purges take time, and browsers can't be purged at all.
- Invalidation messages can be lost; TTLs and idempotent deletes make that survivable.

### deep
#### The stale-set race, step by step

```cpp
struct Cache {
    unordered_map<string, int> data;
    unordered_map<string, int> lease;   // key -> outstanding lease token
    int next_token = 1;
    bool use_leases;

    optional<int> get(const string& k, int* token) {
        if (auto it = data.find(k); it != data.end()) return it->second;
        if (use_leases) { lease[k] = next_token; *token = next_token++; }
        return nullopt;
    }
    void del(const string& k) { data.erase(k); lease.erase(k); }   // also voids leases
    bool set(const string& k, int v, int token) {
        if (use_leases) {
            auto it = lease.find(k);
            if (it == lease.end() || it->second != token) return false;  // stale lease
            lease.erase(it);
        }
        data[k] = v;
        return true;
    }
};

int main() {
    for (bool leases : {false, true}) {
        unordered_map<string, int> db = {{"price", 100}};
        Cache cache{{}, {}, 1, leases};
        int token = 0;
        cache.get("price", &token);              // reader: miss
        int loaded = db["price"];                // reader: loads 100 from the database
        db["price"] = 120;                       // writer: updates the database ...
        cache.del("price");                      // ... and invalidates the cache
        bool stored = cache.set("price", loaded, token);   // reader: fills the cache late
        auto seen = cache.get("price", &token);
        printf("%-11s reader's set %-8s next read: %s (database: %d)\n",
               leases ? "with leases" : "no leases", stored ? "stored," : "refused,",
               seen ? to_string(*seen).c_str() : "miss, reload", db["price"]);
    }
}
```

Output:

```text
no leases   reader's set stored,  next read: 100 (database: 120)
with leases reader's set refused, next read: miss, reload (database: 120)
```

Without protection, the slow reader put 100 back after the writer's delete, and every later read sees 100 until the TTL expires. With leases (the scheme Facebook described for its memcache fleet), the delete voided the reader's token, the late set was refused, and the next read reloads 120. Leases also help against stampedes: only the holder of the lease loads from the database, and others wait briefly.

#### Picking a strategy per data type

| data | acceptable staleness | approach |
|---|---|---|
| product description | minutes | TTL of a few minutes plus delete on write |
| price at checkout | none | read from the database, skip the cache |
| user profile | seconds, but the user's own edits immediately | delete on write, read your own writes from the database |
| static assets | never stale | versioned URLs, cache forever |
| aggregates (counts, dashboards) | minutes | recompute on a schedule, TTL |

#### Invalidation from the database log

Apps sometimes forget to invalidate: a batch job or an admin fixes rows directly. Tailing the database's change log (MySQL binlog, PostgreSQL logical replication) with a change data capture service and deleting the affected keys catches every write, in commit order, in one place. It adds some delay (usually under a second), so it is combined with TTLs.

#### Edge cases and bugs

- Invalidating before the database commit: a reader can reload the old value in between. Delete after the commit.
- Caching "not found": useful against repeated lookups of missing keys, but it must be invalidated when the row is created.
- Keys derived from many rows (a user's feed, a count) need every contributing write to invalidate them, which is where versioning or recomputation is simpler.

Connects to: caching strategies, consistency models (read-your-writes), change data capture, cache stampede and hot keys, replication in practice.

### questions
Q: What race makes cache-aside serve stale data even when writes delete the key?
A: A reader misses and reads the old value from the database; before it stores that value, a writer updates the database and deletes the key; the reader then stores the old value, which stays until the TTL. Leases, version checks on set, short TTLs or a delayed second delete close or bound the window.

Q: What are cache leases?
A: On a miss, the cache hands the client a token; a delete of that key invalidates outstanding tokens; a later set is accepted only with a valid token. A reader that loaded data before a concurrent write can therefore no longer store its stale value, and the cache can also limit how many clients reload a key at once.

Q: Why use versioned cache keys?
A: If the key includes a version, such as product:9:v7, an update produces a new key instead of changing an old one, so there is nothing to invalidate: readers of the new version never see old data, and old entries simply expire. It works well for content with a clear version, like assets or documents.

Q: Why should the database be updated before the cache is invalidated?
A: If the cache is invalidated first, a reader can miss, load the still-old value from the database and cache it before the update commits, leaving stale data. Updating first and invalidating after the commit ensures the next reload sees the new value.

## sysd.caching.cache-stampede-and-hot-keys
name: "Cache stampede and hot keys"
importance: important
prereqs: [sysd.caching.cache-invalidation-and-consistency]
scope: "request coalescing, jitter"

### simple
A cache stampede happens when a popular cached item expires and hundreds of requests miss at the same moment, all rushing to rebuild it from the database at once. A hot key is a single item so popular that the one cache server holding it is overwhelmed. It is like a bakery's display running out and every customer in the queue walking into the kitchen together.

### interview
- **Stampede** (thundering herd, dogpile): many concurrent misses for the same key all hit the database. Common after a popular key's TTL expires, after a cache restart, or when many keys were set with the same TTL.
- **Request coalescing** (single-flight): the first miss loads; concurrent misses for the same key wait for that result. A **lock** or lease in the cache gives the same effect across servers.
- **Serve stale while revalidating**: keep the expired value and refresh it in the background; readers never wait.
- **Early probabilistic refresh**: each reader, as expiry approaches, refreshes with a small probability that rises toward expiry, so one reader refreshes early.
- **TTL jitter**: randomize TTLs (for example ±10%) so keys created together don't expire together.
- **Hot keys**: replicate the key under several names (`home#1` to `home#8`) spread over shards and read a random copy; add a small in-process cache in front of Redis; for writes, split counters into shards and sum them.

### deep
#### Coalescing concurrent misses

Fifty requests arrive together for a key that just expired; the database takes 200 ms to rebuild it. Both versions read the cache first.

```cpp
atomic<int> db_calls{0};
mutex cache_mutex;
unordered_map<string, string> cache;       // stands in for Redis

optional<string> cache_get(const string& k) {
    lock_guard lock(cache_mutex);
    if (auto it = cache.find(k); it != cache.end()) return it->second;
    return nullopt;
}
void cache_set(const string& k, const string& v) { lock_guard lock(cache_mutex); cache[k] = v; }

string load_from_db(const string& key) {
    ++db_calls;
    this_thread::sleep_for(chrono::milliseconds(200));   // an expensive query
    return "page for " + key;
}

string read_plain(const string& key) {     // cache-aside with no protection
    if (auto v = cache_get(key)) return *v;
    string v = load_from_db(key);
    cache_set(key, v);
    return v;
}

class SingleFlight {                       // one load per key at a time; others wait for it
    mutex m;
    unordered_map<string, shared_future<string>> inflight;
public:
    string read(const string& key) {
        if (auto v = cache_get(key)) return *v;
        unique_lock lock(m);
        if (auto it = inflight.find(key); it != inflight.end()) {
            auto f = it->second;
            lock.unlock();
            return f.get();                // wait for the leader's result
        }
        promise<string> p;
        shared_future<string> f = p.get_future().share();
        inflight[key] = f;
        lock.unlock();
        string v = load_from_db(key);      // the leader loads once
        cache_set(key, v);
        p.set_value(v);
        lock.lock();
        inflight.erase(key);
        return v;
    }
};

int main() {
    for (bool coalesce : {false, true}) {
        db_calls = 0;
        cache.clear();                     // the popular key has just expired
        SingleFlight sf;
        latch start(50);
        vector<thread> readers;
        for (int i = 0; i < 50; ++i)
            readers.emplace_back([&] {
                start.arrive_and_wait();   // 50 requests arrive together
                if (coalesce) sf.read("home"); else read_plain("home");
            });
        for (auto& t : readers) t.join();
        printf("%-15s database calls: %d\n", coalesce ? "coalesced:" : "no coalescing:",
               db_calls.load());
    }
}
```

Output:

```text
no coalescing:  database calls: 50
coalesced:      database calls: 1
```

Single-flight inside one server turns 50 loads into 1. Across 100 servers there would still be up to 100 loads, so large systems add a distributed lock or lease per key (only the lease holder reloads; others briefly retry or serve the stale value).

#### TTL jitter

If 10,000 keys are cached at deploy time with a TTL of exactly one hour, they all expire in the same second an hour later. With a TTL of one hour plus or minus 10%, expirations spread over 12 minutes, about 14 per second on average instead of 10,000 at once. It costs one line: `ttl = base + random(-0.1 * base, 0.1 * base)`.

#### Early probabilistic refresh

Store with each value the time it took to compute (`delta`) and its expiry. On each read, refresh early if `now - delta * beta * ln(random())` is past the expiry (random in (0, 1], beta around 1). Because `ln(random())` is negative, each read has a small chance of pretending it is already past expiry, and that chance grows as expiry nears and for slow-to-compute values. Typically one reader refreshes shortly before expiry, and nobody ever sees a miss.

#### Hot keys

One Redis shard handles perhaps 100,000 simple operations per second. A celebrity's profile read 1,000,000 times per second overloads whichever shard owns its key, however many shards exist. Options:

- **Key replication**: write `profile:42#0` to `profile:42#7`; readers pick one at random, spreading load over up to 8 shards. Writes update all copies.
- **Local cache**: each app server keeps hot keys in memory for a second or two; 1,000,000 reads become a few hundred Redis reads.
- **Hot counters**: split a like counter into 16 sub-counters incremented at random and summed on read.
- **Detection**: track per-key request rates (sampling or a count-min sketch) to find hot keys automatically.

Connects to: cache invalidation and consistency, eviction policies, retries, timeouts and exponential backoff with jitter, HyperLogLog and count-min sketch, consistent hashing in design.

### questions
Q: What is a cache stampede and how do you prevent it?
A: When a popular key expires or the cache is cold, many concurrent requests miss and all recompute or query the database at once, overloading it. Prevent it with request coalescing or locks so only one request rebuilds the value, serving stale data while refreshing, early probabilistic refresh, and jittered TTLs.

Q: What is request coalescing?
A: Concurrent requests for the same missing key are merged: the first one performs the load, and the others wait for and share its result. It turns N simultaneous database queries into one per server, or one overall with a distributed lock or lease.

Q: Why add jitter to TTLs?
A: Keys cached at the same time with the same TTL expire at the same time, causing a burst of misses. Randomizing each TTL by a small percentage spreads expirations out, smoothing the load on the database.

Q: How do you handle a hot key in a distributed cache?
A: Spread its reads: replicate it under several keys on different shards and read a random copy, and put a short-lived in-process cache in front so most reads never reach the shared cache. For write-hot keys like counters, split them into several sub-keys and aggregate on read.

## sysd.caching.redis-and-memcached
name: "Redis and Memcached"
importance: important
prereqs: [sysd.caching.caching-strategies]
scope: "data structures, persistence, use cases"

### simple
Redis and Memcached are in-memory key-value stores used as caches: they answer in well under a millisecond because everything sits in RAM. Memcached is a simple, very fast cache of strings. Redis also offers lists, sets, sorted sets and more, can save its data to disk, and doubles as a store for counters, leaderboards, queues and locks.

### interview
- **Memcached**: strings only, multithreaded, slab memory allocator with LRU, no persistence, no replication; sharding is done by clients (consistent hashing). Excellent as a pure, big, simple cache.
- **Redis**: rich types (strings, hashes, lists, sets, **sorted sets**, bitmaps, HyperLogLog, streams, geo), atomic commands, Lua scripts and transactions, pub/sub, TTL per key.
- Redis executes commands on **one thread** (I/O threads help with networking since 6.0), so each command is atomic, and one slow command (`KEYS *`, a huge `SMEMBERS`) blocks everyone.
- **Persistence**: RDB snapshots (compact, fork-based, can lose the last minutes) and AOF (append every write; `fsync` every second loses about a second). **Replication**: asynchronous replicas; **Sentinel** for failover; **Redis Cluster** shards keys over 16,384 hash slots (CRC16 of the key mod 16384; `{tags}` keep related keys together).
- Use cases: cache, sessions, rate limiters (`INCR` + `EXPIRE`), leaderboards (`ZADD`, `ZREVRANK`), queues (lists, streams), distributed locks (`SET key value NX PX 30000`), counting uniques (`PFADD`).
- Not a primary database for data you can't lose: asynchronous replication and periodic fsync can drop recent writes on failover.

### deep
#### Commands for common jobs

A session run with `redis-cli` against Redis 7.0:

```text
> SET session:s42 "asha" EX 1800        # session with a 30-minute TTL
OK
> INCR rate:asha:2026-03-01T10:15       # fixed-window rate limit counter
(integer) 1
> EXPIRE rate:asha:2026-03-01T10:15 60
(integer) 1
> ZADD leaderboard 3100 asha 2800 ravi 3350 meera
(integer) 3
> ZREVRANGE leaderboard 0 1 WITHSCORES   # top 2
1) "meera"
2) "3350"
3) "asha"
4) "3100"
> ZREVRANK leaderboard ravi              # 0-based rank from the top
(integer) 2
> SET lock:order:9 "worker-7" NX PX 30000
OK
> SET lock:order:9 "worker-8" NX PX 30000
(nil)
```

Each command is atomic, which is what makes the counter, the leaderboard and the lock safe without extra locking in the application: the second worker's `SET ... NX` fails because the key exists. A sorted set keeps members ordered by score in a skip list, so rank and range queries cost O(log n).

#### How Redis Cluster places keys

A key belongs to one of 16,384 slots: CRC16 of the key, modulo 16384. If the key contains `{...}`, only the part inside the braces is hashed, so related keys can be forced onto the same node (needed for multi-key commands).

```cpp
uint16_t crc16(const string& s) {        // CRC-16/XMODEM, the variant Redis uses
    uint16_t crc = 0;
    for (unsigned char c : s) {
        crc ^= c << 8;
        for (int i = 0; i < 8; ++i) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    return crc;
}

int key_slot(const string& key) {
    size_t open = key.find('{');
    if (open != string::npos) {
        size_t close = key.find('}', open + 1);
        if (close != string::npos && close > open + 1)   // non-empty tag: hash only the tag
            return crc16(key.substr(open + 1, close - open - 1)) % 16384;
    }
    return crc16(key) % 16384;
}

int main() {
    for (string k : {"foo", "somekey", "{user1000}.following", "{user1000}.followers"})
        printf("%-22s slot %d\n", k.c_str(), key_slot(k));
}
```

Output:

```text
foo                    slot 12182
somekey                slot 11058
{user1000}.following   slot 3443
{user1000}.followers   slot 3443
```

The same four keys give the same slots with `CLUSTER KEYSLOT` on a real Redis 7.0 node. Slots, not nodes, are the unit of rebalancing: adding a node moves some slots to it, and clients learn the new owner from `MOVED` redirects.

#### Redis or Memcached?

| need | choose |
|---|---|
| plain cache of blobs, many cores per node, simplest operation | Memcached |
| data structures (rankings, sets, counters), atomic operations | Redis |
| survive restarts, replicas and failover | Redis |
| pub/sub, streams, geo queries, unique counts | Redis |

#### Pitfalls

- `KEYS *` or big collections scanned in one command block the single command thread; use `SCAN` and keep collections bounded.
- A lock with `SET NX PX` must store a unique value and be released only by its owner (compare and delete in a Lua script), and it is not safe for correctness under failover without fencing tokens.
- Memory is the limit: set `maxmemory` and an eviction policy, or writes fail when full.

Connects to: eviction policies, caching strategies, rate limiting algorithms, leaderboard, distributed locks and leases, skip lists, HyperLogLog and count-min sketch.

### questions
Q: What are the main differences between Redis and Memcached?
A: Memcached stores plain strings, is multithreaded, and has no persistence or replication, which makes it a simple, fast cache. Redis offers data structures such as hashes, lists, sets and sorted sets, atomic operations, scripting, pub/sub, persistence and replication with clustering, so it also serves as a store for counters, leaderboards, queues and locks.

Q: Why are single Redis commands atomic?
A: Redis executes commands one at a time on a single thread, so a command like INCR or ZADD completes without interleaving with others. That makes counters and conditional sets safe without extra locking, but also means one slow command delays all clients.

Q: How does Redis persist data, and what can be lost?
A: RDB takes periodic point-in-time snapshots, losing writes since the last snapshot on a crash. AOF logs every write and, with the default fsync every second, can lose about a second of writes. Replication is asynchronous, so a failover can also lose writes the replica hadn't received.

Q: How does Redis Cluster decide which node holds a key?
A: It hashes the key with CRC16 and takes the result modulo 16,384 to get a hash slot, and each node owns a range of slots. A hash tag in braces makes only that part of the key hashed, so related keys land in the same slot for multi-key operations.

Q: How would you build a leaderboard with Redis?
A: Use a sorted set: ZADD or ZINCRBY to set or add to a player's score, ZREVRANGE with WITHSCORES for the top N, and ZREVRANK for a player's position. The sorted set keeps members ordered by score, so these are O(log n) operations.
