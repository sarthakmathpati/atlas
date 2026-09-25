---
topic: sysd.building-blocks
name: "Building blocks toolkit"
subject: sysd
order: 9
prereqs: [sysd.data]
---

## sysd.building-blocks.unique-id-generation
name: "Unique ID generation"
importance: must
scope: "UUIDs, database sequences, Snowflake IDs"

### simple
Every order, message and user needs an id that no other record will ever get, even when many servers create records at the same moment. One database handing out 1, 2, 3 is simple but becomes a bottleneck; random ids need no coordination but are long and unordered. Schemes like Snowflake combine the time, a machine number and a counter, like a ticket stamped with the date, the counter window and the ticket number.

### interview
- **Database auto-increment**: simple, compact, ordered; a single point of contention and failure across shards, and it leaks business volume (order 1,000,017 tells competitors your sales). Workarounds: per-shard offsets (shard 1 uses 1, 3, 5 ...), or a ticket server handing out **ranges** (blocks of 1,000) to each app server.
- **UUID v4**: 122 random bits; generated anywhere without coordination; collisions are practically impossible. 16 bytes, unordered, so B-tree inserts land on random pages (poor locality).
- **UUID v7** (and ULID): a millisecond timestamp prefix plus random bits: sortable by time, index-friendly, still coordination-free.
- **Snowflake-style** 64-bit ids: 41 bits of milliseconds since a custom epoch (about 70 years), 10 bits of machine id (1,024 machines), 12 bits of sequence (4,096 ids per machine per millisecond). Compact, roughly time-ordered, decentralized. Needs unique machine ids and a clock that doesn't go backwards.
- Choose by needs: sortable (time-based), compact (64-bit), unguessable (random, for public ids), coordination-free.
- For public URLs, don't expose sequential ids (enumeration); use random ids or encode them.

### deep
#### A Snowflake generator

```cpp
class Snowflake {                  // 1 sign bit | 41 bits ms | 10 bits machine | 12 bits sequence
    const uint64_t epoch_ms = 1735689600000ULL;       // 2025-01-01 00:00:00 UTC
    uint64_t machine, last_ms = 0, sequence = 0;
public:
    explicit Snowflake(uint64_t machine_id) : machine(machine_id & 0x3FF) {}
    uint64_t next(uint64_t now_ms) {                  // real code reads the clock itself
        if (now_ms == last_ms) {
            sequence = (sequence + 1) & 0xFFF;
            if (sequence == 0) ++now_ms;              // 4,096 ids used: wait for next ms
        } else sequence = 0;
        last_ms = now_ms;
        return ((now_ms - epoch_ms) << 22) | (machine << 12) | sequence;
    }
};

int main() {
    Snowflake gen(7);
    uint64_t t = 1772359200000ULL;                    // 2026-03-01 10:00:00 UTC
    for (uint64_t ms : {t, t, t, t + 1}) {
        uint64_t id = gen.next(ms);
        printf("%llu  = ms %llu, machine %llu, seq %llu\n", (unsigned long long)id,
               (unsigned long long)(id >> 22), (unsigned long long)((id >> 12) & 0x3FF),
               (unsigned long long)(id & 0xFFF));
    }
    printf("41 bits of milliseconds last %.1f years\n", pow(2, 41) / 1000 / 3600 / 24 / 365.25);
    printf("ids per machine per ms: %d, machines: %d\n", 1 << 12, 1 << 10);

    // birthday bound: P(collision) ~ n^2 / (2 * 2^bits) for n random ids
    for (int bits : {64, 122}) {
        double n = 1e9;
        printf("1 billion random %3d-bit ids: collision probability about %.1e\n", bits,
               n * n / (2 * pow(2, bits)));
    }
}
```

Output:

```text
153803449958428672  = ms 36669600000, machine 7, seq 0
153803449958428673  = ms 36669600000, machine 7, seq 1
153803449958428674  = ms 36669600000, machine 7, seq 2
153803449962622976  = ms 36669600001, machine 7, seq 0
41 bits of milliseconds last 69.7 years
ids per machine per ms: 4096, machines: 1024
1 billion random  64-bit ids: collision probability about 2.7e-02
1 billion random 122-bit ids: collision probability about 9.4e-20
```

Three ids created in the same millisecond differ only in the sequence; the next millisecond resets the sequence and the ids keep increasing, so sorting by id sorts by creation time (across machines, only to the precision of their clocks). The layout gives about 70 years of ids from the chosen epoch and over 4 million ids per second per machine.

The last two lines are the birthday bound: for n random b-bit ids, the chance of any collision is about $\frac{n^2}{2 \cdot 2^b}$. A billion random 64-bit ids already collide with 2.7% probability, which is why purely random ids need about 122 bits (UUID v4), while Snowflake avoids randomness altogether by construction.

#### Things that go wrong

- **Clock moves backwards** (NTP correction): a Snowflake generator could repeat ids. Real implementations refuse to issue ids until the clock passes the last timestamp used, or keep a logical clock.
- **Duplicate machine ids** after autoscaling: assign them from a coordination service (ZooKeeper, etcd) or derive them from something unique, and check at startup.
- **Sequence exhausted** within a millisecond: wait for the next millisecond, as the code does by advancing the time.
- **Random UUIDs as primary keys** in InnoDB, which clusters rows by primary key, scatter inserts over the whole B+ tree; time-ordered ids (UUID v7, Snowflake) append near the end instead.

#### Choosing

| requirement | scheme |
|---|---|
| single database, internal ids | auto-increment |
| no coordination, unguessable | UUID v4 |
| no coordination, time-sortable, index-friendly | UUID v7 or ULID |
| compact 64-bit, time-sortable, very high rate | Snowflake-style |
| short human-friendly codes (URL shortener) | a counter or Snowflake id encoded in base 62 |

Connects to: URL shortener, birthday problem, sharding strategies, clocks and ordering, B+ tree indexes, clustered vs non-clustered indexes.

### questions
Q: How does a Snowflake id work?
A: It packs a timestamp in milliseconds since a custom epoch (41 bits), a machine id (10 bits) and a per-millisecond sequence number (12 bits) into a 64-bit integer. Each machine generates ids independently, the ids are unique as long as machine ids are unique and clocks don't go backwards, and they sort roughly by creation time.

Q: What are the downsides of database auto-increment ids at scale?
A: One database becomes a bottleneck and single point of failure for id generation, sharded databases need coordination to avoid duplicates, and sequential ids reveal volumes and are easy to enumerate in public URLs.

Q: Why do random UUIDs hurt database insert performance?
A: B-tree indexes, and clustered primary keys in particular, keep keys sorted; random keys land on random pages, causing many page reads, splits and poor cache locality. Time-ordered ids like UUID v7 or Snowflake insert near the end of the index instead.

Q: How likely is a collision among random ids?
A: By the birthday bound, n random b-bit ids collide with probability about n squared divided by 2 times 2 to the b. A billion random 64-bit ids give roughly a 3% chance, while 122 random bits (UUID v4) make it around 10 to the minus 19, negligible in practice.

## sysd.building-blocks.bloom-filters
name: "Bloom filters"
importance: important
scope: "probabilistic membership"

### simple
A Bloom filter is a tiny structure that answers "have I seen this item before?" with either "definitely not" or "probably yes". It uses a row of bits and several hash functions: adding an item sets a few bits, and checking an item looks at the same bits. It is like a guest list where each name ticks a few boxes; if any of a name's boxes is empty, that person certainly isn't on the list.

### interview
- An array of m bits and k hash functions. **Add**: set the k bits the item hashes to. **Query**: if any of the k bits is 0, the item is **definitely absent**; if all are 1, it is **probably present**.
- **No false negatives**, some **false positives**: about $(1 - e^{-kn/m})^k$ for n items. Optimal $k = \frac{m}{n} \ln 2$. About **9.6 bits per item give 1%** false positives, 14.4 bits give 0.1%, regardless of item size.
- No deletion in the basic form (clearing a bit could remove other items); **counting Bloom filters** keep small counters instead. Can't list the items.
- Uses: skip disk reads for keys that don't exist (LSM stores check a per-file filter before reading an SSTable), avoid re-crawling seen URLs, check a password against a breached list, cache "one-hit wonders" filtering in CDNs, spell checkers.
- Sizing: choose the false positive rate you can afford, then m ≈ −n ln p / (ln 2)².

### deep
#### Measured vs formula

```cpp
uint64_t mix(uint64_t x) {
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

class BloomFilter {
    vector<bool> bits;
    int k;
public:
    BloomFilter(size_t m, int hashes) : bits(m), k(hashes) {}
    void add(uint64_t key) {
        uint64_t h1 = mix(key), h2 = mix(h1) | 1;      // double hashing: h1 + i * h2
        for (int i = 0; i < k; ++i) bits[(h1 + i * h2) % bits.size()] = true;
    }
    bool might_contain(uint64_t key) const {
        uint64_t h1 = mix(key), h2 = mix(h1) | 1;
        for (int i = 0; i < k; ++i)
            if (!bits[(h1 + i * h2) % bits.size()]) return false;   // definitely absent
        return true;                                                  // probably present
    }
};

int main() {
    const int n = 10000;
    for (double bits_per_key : {4.8, 9.6, 14.4}) {
        size_t m = size_t(n * bits_per_key);
        int k = max(1, (int)lround(bits_per_key * log(2)));       // optimal k = (m/n) ln 2
        BloomFilter bf(m, k);
        for (uint64_t key = 0; key < n; ++key) bf.add(key);
        int false_pos = 0;
        const uint64_t trials = 100000;
        for (uint64_t key = 1000000; key < 1000000 + trials; ++key)
            false_pos += bf.might_contain(key);            // keys never added
        double expected = pow(1 - exp(-(double)k * n / m), k);
        printf("%4.1f bits/key, k=%d: false positives %.2f%% (formula %.2f%%), %zu bytes\n",
               bits_per_key, k, 100.0 * false_pos / trials, 100 * expected, m / 8);
    }
}
```

Output:

```text
 4.8 bits/key, k=3: false positives 10.02% (formula 10.04%), 6000 bytes
 9.6 bits/key, k=7: false positives 1.05% (formula 1.00%), 12000 bytes
14.4 bits/key, k=10: false positives 0.10% (formula 0.10%), 18000 bytes
```

Measured false positive rates on 100,000 keys that were never added match the formula closely. Each extra 4.8 bits per key divides the false positive rate by about ten. For 10,000 keys, 12 KB of bits give 1% false positives whatever the keys are: URLs of hundreds of bytes cost the same 9.6 bits each. Double hashing (`h1 + i * h2`) generates the k positions from two hash values, which is as good as k independent hashes in practice.

#### Where it saves work

```text
read key K from an LSM store with 20 SSTable files on disk:
  without filters: probe up to 20 files (disk reads) to learn that K doesn't exist
  with a 1% filter per file: read ~0.2 files on average for a missing key
```

The filter sits in memory; only the "probably present" answers pay for a disk read. The same shape appears in a web crawler ("have I queued this URL?"), in a CDN that caches an object only on its second request (a filter remembers the first), and in joins that skip rows which can't match.

#### Limits

- False positives grow if you insert more items than planned; size for the maximum, or use scalable filters that add layers.
- The answer "probably present" still needs a real check when a false positive is costly.
- Cuckoo filters offer deletions and slightly better space at low false positive rates.

Connects to: hashing, LSM trees, web crawler, HyperLogLog and count-min sketch, cache stampede and hot keys, hash functions.

### questions
Q: What does a Bloom filter guarantee?
A: If it says an item is not in the set, the item is definitely not there, because at least one of its bits is zero. If it says an item is present, it might be wrong: other items may have set all of its bits, so there are no false negatives but some false positives.

Q: How do you choose the size and number of hash functions?
A: From the expected number of items n and the acceptable false positive rate p: bits m is about minus n times ln p divided by (ln 2) squared, which is about 9.6 bits per item for 1%, and the best number of hashes is m over n times ln 2, about 7 for 1%.

Q: Why can't you delete from a standard Bloom filter?
A: Bits are shared between items, so clearing the bits of one item could clear bits another item also relies on, creating false negatives. Counting Bloom filters replace bits with small counters to support deletion.

Q: Where are Bloom filters used in real systems?
A: LSM-tree databases keep one per SSTable to skip files that can't contain a key; web crawlers track seen URLs; CDNs avoid caching objects requested only once; and services check passwords against large lists of breached passwords without storing them all in memory.

## sysd.building-blocks.geospatial-indexing
name: "Geospatial indexing"
importance: important
scope: "geohash, quadtrees"

### simple
Geospatial indexing finds things near a location quickly, such as drivers within a kilometre or restaurants nearby, without measuring the distance to every item. The map is divided into cells, each with a short code, and nearby places usually share the start of their code. It is like postal codes: addresses in the same small area share most of their postal code.

### interview
- The problem: "points within r of (lat, lon)" or "k nearest" over millions of points that may move. A plain index on latitude or longitude can filter only one dimension.
- **Geohash**: alternately halve longitude and latitude ranges, writing one bit each time, and encode groups of 5 bits in base 32. Each extra character shrinks the cell about 32 times; a longer shared prefix means the points share a smaller cell. Store it as an indexed string and query by prefix.
- **Edge problem**: two points a few metres apart can sit on either side of a cell boundary and share almost no prefix; always search the target cell **plus its 8 neighbors**, then filter by real distance.
- **Quadtrees**: split a square into four children whenever it holds too many points, so dense cities get small cells and oceans stay coarse; good for in-memory indexes of moving objects.
- Others: **Google S2** (cells on a cube projected onto the sphere, Hilbert curve ordering), **Uber H3** (hexagons: uniform neighbor distances), R-trees and PostGIS for polygons, Redis `GEOADD`/`GEOSEARCH` (geohash-based sorted sets).
- Moving objects (drivers updating every few seconds) need cheap updates: an in-memory grid or geohash map sharded by region.

### deep
#### Geohash in practice

```cpp
string geohash(double lat, double lon, int length) {
    const char* base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    double lat_lo = -90, lat_hi = 90, lon_lo = -180, lon_hi = 180;
    string out;
    int bit = 0, ch = 0;
    bool even = true;                                 // bits alternate: lon, lat, lon, ...
    while ((int)out.size() < length) {
        if (even) {
            double mid = (lon_lo + lon_hi) / 2;
            if (lon >= mid) { ch = ch * 2 + 1; lon_lo = mid; } else { ch = ch * 2; lon_hi = mid; }
        } else {
            double mid = (lat_lo + lat_hi) / 2;
            if (lat >= mid) { ch = ch * 2 + 1; lat_lo = mid; } else { ch = ch * 2; lat_hi = mid; }
        }
        even = !even;
        if (++bit == 5) { out += base32[ch]; bit = 0; ch = 0; }
    }
    return out;
}

double distance_m(double lat1, double lon1, double lat2, double lon2) {   // haversine
    const double r = 6371000, rad = M_PI / 180;
    double dlat = (lat2 - lat1) * rad, dlon = (lon2 - lon1) * rad;
    double a = pow(sin(dlat / 2), 2) + cos(lat1 * rad) * cos(lat2 * rad) * pow(sin(dlon / 2), 2);
    return 2 * r * asin(sqrt(a));
}

int main() {
    printf("reference point: %s\n", geohash(57.64911, 10.40744, 11).c_str());
    struct Place { string name; double lat, lon; };
    vector<Place> places = {{"cafe A", 18.5204, 73.8567}, {"cafe B", 18.5210, 73.8575},
                            {"station", 18.5289, 73.8744}, {"shop X", 18.5204, 73.82810},
                            {"shop Y", 18.5204, 73.82815}};
    for (auto& p : places) printf("%-8s %s\n", p.name.c_str(), geohash(p.lat, p.lon, 6).c_str());
    printf("cafe A to cafe B: %.0f m, shop X to shop Y: %.0f m\n",
           distance_m(18.5204, 73.8567, 18.5210, 73.8575),
           distance_m(18.5204, 73.82810, 18.5204, 73.82815));
    for (int len : {4, 5, 6, 7}) {
        int lon_bits = (5 * len + 1) / 2, lat_bits = 5 * len / 2;
        double w = 360 / pow(2, lon_bits) * 111.32, h = 180 / pow(2, lat_bits) * 110.57;
        printf("length %d: cell about %.2f km x %.2f km at the equator\n", len, w, h);
    }
}
```

Output:

```text
reference point: u4pruydqqvj
cafe A   tek92e
cafe B   tek92e
station  tek93j
shop X   tek3rg
shop Y   tek925
cafe A to cafe B: 108 m, shop X to shop Y: 5 m
length 4: cell about 39.14 km x 19.44 km at the equator
length 5: cell about 4.89 km x 4.86 km at the equator
length 6: cell about 1.22 km x 0.61 km at the equator
length 7: cell about 0.15 km x 0.15 km at the equator
```

The first line reproduces the standard example point `u4pruydqqvj`. Cafes A and B, 108 m apart, share the whole 6-character cell `tek92e`, so a prefix query finds them together; the station 2 km away shares only `tek9`. But shops X and Y, just 5 m apart, get `tek3rg` and `tek925`: they sit on either side of a boundary and share only `tek`. A search that looked only in the searcher's own cell would miss a place across the street, which is why proximity searches always include the neighboring cells and then compute real distances (the haversine formula, as in `distance_m`).

The table shows how to pick the precision: 6 characters gives cells about 1.2 by 0.6 km at the equator (narrower in longitude away from it), a good size for "within 1 km" searches of the cell and its neighbors.

#### A nearby-drivers query

1. Compute the rider's geohash at the chosen precision (6 characters).
2. Compute its 8 neighbors' hashes.
3. Fetch drivers in those 9 cells from an index `cell → driver ids` (for example Redis sets, updated as drivers report positions every few seconds).
4. Compute exact distances, filter by radius, sort, take the nearest k.

Driver updates: when a driver's cell changes, move the id from the old cell's set to the new one. Shard the index by region so one city's traffic stays on its own servers.

#### Quadtrees for uneven density

A quadtree node holds up to, say, 100 points; when it overflows, it splits into four quadrants. Central Mumbai might be 10 levels deep while the open sea is one leaf. A radius search visits only nodes whose squares intersect the search circle. Quadtrees adapt to density automatically, which fixed-size geohash cells can't, at the cost of an in-memory tree that must be rebuilt or rebalanced as points move.

Connects to: ride-hailing, tries and prefix matching, B+ tree indexes, sharding strategies, Redis and Memcached.

### questions
Q: How does a geohash work?
A: It repeatedly halves the longitude and latitude ranges, recording a 1 or 0 for which half contains the point, alternating between the two, and encodes every 5 bits as a base-32 character. Each character narrows the cell, and points in the same cell share the same prefix, so nearby points can be found with prefix queries on an ordinary index.

Q: What is the geohash edge problem and how do you handle it?
A: Points very close together can fall on opposite sides of a cell boundary and share almost no prefix. Proximity searches therefore query the target cell and its eight neighbors, then filter candidates by their actual distance.

Q: When would you use a quadtree instead of a geohash grid?
A: When point density varies a lot, as between city centers and rural areas: a quadtree splits only crowded regions into smaller cells, keeping cells balanced by number of points. Geohash cells have fixed sizes per precision, so dense cells can be overloaded while sparse ones are nearly empty.

Q: How would you find the nearest drivers to a rider?
A: Keep drivers in an in-memory index keyed by cell, such as a geohash of suitable precision, updated as they report locations. For a query, gather drivers from the rider's cell and its neighbors, expanding the search if too few are found, compute exact distances and return the k nearest.

## sysd.building-blocks.hyperloglog-and-count-min-sketch
name: "HyperLogLog and count-min sketch"
importance: advanced
scope: "approximate counting"

### simple
Some counting questions are too big to answer exactly with little memory, such as "how many different users visited today?" or "how often was each search term used?" HyperLogLog estimates the number of distinct items using about a kilobyte, however many there are. A count-min sketch estimates how often each item appeared, sometimes a little too high but never too low.

### interview
- **HyperLogLog**: hash each item; the first p bits pick one of m = 2^p registers, and the register keeps the maximum count of leading zeros seen in the rest of the hash (a long run of zeros is rare, so it hints at many distinct items). Combine registers with a harmonic mean. Standard error about **1.04 / √m**: 1,024 registers (1 KB) give about 3%; Redis's `PFADD`/`PFCOUNT` use 16,384 registers in 12 KB for about 0.8%.
- HLL sketches **merge** by taking register-wise maxima: daily unique visitors can be combined into weekly ones without rescanning.
- **Count-min sketch**: d rows of w counters, each row with its own hash. Add: increment one counter per row. Query: the **minimum** across rows. It only overestimates (collisions add, never subtract); with w = e/ε and d = ln(1/δ), the error is at most εN with probability 1 − δ, for N total events.
- Uses: unique counts in analytics, cardinality estimates in query planners, heavy hitters and top-k (count-min plus a heap), hot key detection, rate limiting by approximate counts.
- Both trade exactness for tiny, fixed memory and mergeability, which makes them ideal for streaming and distributed aggregation.

### deep
#### Both sketches at work

```cpp
uint64_t mix(uint64_t x) {
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

class HyperLogLog {                          // m = 2^p registers of "max leading zeros + 1"
    int p;
    vector<uint8_t> reg;
public:
    explicit HyperLogLog(int precision) : p(precision), reg(1u << precision) {}
    void add(uint64_t item) {
        uint64_t h = mix(item);
        uint64_t idx = h >> (64 - p);                         // first p bits pick a register
        uint64_t rest = h << p;
        uint8_t rank = rest ? __builtin_clzll(rest) + 1 : 64 - p + 1;
        reg[idx] = max(reg[idx], rank);
    }
    double estimate() const {
        double m = reg.size(), sum = 0;
        int zeros = 0;
        for (uint8_t r : reg) { sum += pow(2.0, -r); zeros += r == 0; }
        double e = 0.7213 / (1 + 1.079 / m) * m * m / sum;   // harmonic mean
        if (e < 2.5 * m && zeros) e = m * log(m / zeros);     // small-range correction
        return e;
    }
};

class CountMin {                             // d rows of w counters; answer = min over rows
    int w;
    vector<vector<uint32_t>> rows;
public:
    CountMin(int depth, int width) : w(width), rows(depth, vector<uint32_t>(width)) {}
    void add(uint64_t item) {
        for (size_t r = 0; r < rows.size(); ++r) ++rows[r][mix(item * 31 + r) % w];
    }
    uint32_t count(uint64_t item) const {
        uint32_t best = UINT32_MAX;
        for (size_t r = 0; r < rows.size(); ++r) best = min(best, rows[r][mix(item * 31 + r) % w]);
        return best;
    }
};

int main() {
    HyperLogLog hll(10);                               // 1,024 registers: 1 KB
    for (uint64_t user = 0; user < 250000; ++user) hll.add(user % 100000);   // 100k distinct
    printf("HyperLogLog: %.0f distinct (true 100000), standard error about %.1f%%\n",
           hll.estimate(), 104 / sqrt(1024.0));

    CountMin cms(4, 1000);                             // 4 x 1000 counters
    map<uint64_t, uint32_t> exact;
    uint64_t s = 1;
    for (int i = 0; i < 200000; ++i) {                 // skewed stream: a few hot items
        s = mix(s);
        bool hot = (s >> 40) % 100 < 50;               // half the traffic: 10 hot items
        uint64_t item = hot ? s % 10 : 10 + (s >> 8) % 20000;
        cms.add(item);
        ++exact[item];
    }
    for (uint64_t item : {3ULL, 7ULL, 12345ULL, 99999999ULL})   // the last never appears
        printf("count-min item %8llu: estimate %6u, true %6u\n", (unsigned long long)item,
               cms.count(item), exact[item]);
}
```

Output:

```text
HyperLogLog: 103224 distinct (true 100000), standard error about 3.2%
count-min item        3: estimate  10076, true   9991
count-min item        7: estimate  10241, true  10157
count-min item    12345: estimate     71, true      5
count-min item 99999999: estimate     75, true      0
```

HyperLogLog saw 250,000 events from 100,000 distinct users and, with 1,024 one-byte registers, estimated about 103,000: within its typical 3% error, using 1 KB instead of a set of 100,000 ids. Duplicates don't matter: the same user always hashes to the same register and zero-run length.

The count-min sketch tracked 200,000 events in 4,000 counters. The hot items (3 and 7, each about 10,000 times) are estimated within 1%. The rare item 12345 (5 occurrences) reads 71 and an item never seen reads 75: collisions from other items only ever add, so small counts are dominated by noise. The guarantee here is ε = e / 1000 ≈ 0.27% of all 200,000 events, about 544, with probability about 98%; the observed error of about 70 is well inside it. Count-min is therefore excellent for finding heavy hitters and useless for telling a count of 5 from 0.

#### Why leading zeros count distinct items

In a uniformly random hash, a run of k leading zeros appears with probability $2^{-k}$. Seeing a run of 20 suggests about a million distinct values have been hashed. One register would be very noisy, so HLL splits items across m registers and averages them with a harmonic mean, which damps the effect of a single lucky long run; corrections handle very small and very large counts.

Connects to: Bloom filters, cache stampede and hot keys, time-series and analytics stores, top K elements, hashing, metrics and monitoring system.

### questions
Q: How much memory does HyperLogLog need, and how accurate is it?
A: A fixed amount set by the number of registers m, independent of the number of distinct items: typically about 1 to 12 KB. The standard error is about 1.04 divided by the square root of m, so 16,384 registers give roughly 0.8%.

Q: Why can HyperLogLog sketches be merged?
A: Each register stores a maximum over the items hashed to it, and the maximum of two sets' registers equals the register value for their union. Taking register-wise maxima of daily sketches gives the sketch for the whole week without revisiting the data.

Q: How does a count-min sketch estimate a count?
A: Each item increments one counter in each of d rows, chosen by that row's hash. To estimate an item's count, look up its counter in every row and take the minimum; collisions only inflate counters, so the minimum is the least inflated estimate and never below the true count.

Q: What are count-min sketches good and bad at?
A: Good at estimating frequencies of heavy hitters in huge streams with small fixed memory, and at combining sketches from many servers. Bad at small counts, which can be swamped by collision noise, and they can never report an exact zero.

## sysd.building-blocks.merkle-trees
name: "Merkle trees"
importance: advanced
scope: "detecting differences between replicas"

### simple
A Merkle tree summarizes a large collection of data with a tree of hashes: each leaf is the hash of a piece of data, and each parent is the hash of its children. Two machines can compare just their top hashes to know whether they hold identical data, and if not, follow the branches that differ to find exactly which pieces are out of sync. It is like checking two copies of a book by comparing chapter checksums first, then only the pages of the chapter that differs.

### interview
- Leaves hash data blocks or key ranges; parents hash their children's hashes; the **root** summarizes everything. Any change changes every hash up to the root.
- **Comparing replicas**: exchange roots; if equal, done. Otherwise recurse only into children whose hashes differ. Finding d differing ranges among n costs about O(d log n) hash comparisons instead of transferring everything.
- Uses: **anti-entropy** repair in Dynamo-style stores (Cassandra, Riak) between replicas; **Git** (commits and trees are content hashes); **blockchains** (proving a transaction is in a block with a log-size proof); file sync and backup deduplication; certificate transparency logs.
- **Membership proofs**: to prove a leaf belongs to a tree with a known root, provide the sibling hashes along its path (log n hashes).
- Costs: maintaining the tree as data changes (rehash the path, O(log n)); trees are often rebuilt per key range periodically.

### deep
#### Finding the one range that differs

Two replicas each split their keys into 8 ranges; one range has a different value on the second replica:

```cpp
uint64_t mix(uint64_t x) {
    x += 0x9E3779B97F4A7C15ULL;
    x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL;
    x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL;
    return x ^ (x >> 31);
}

// Each replica keeps 8 key ranges; a leaf hashes one range, parents hash their children.
// (A toy hash; real systems use a cryptographic or strong hash such as SHA-256.)
vector<uint64_t> build(const vector<uint64_t>& ranges) {
    int n = ranges.size();
    vector<uint64_t> tree(2 * n);                     // tree[1] is the root, leaves at n..2n-1
    for (int i = 0; i < n; ++i) tree[n + i] = mix(ranges[i]);
    for (int i = n - 1; i >= 1; --i) tree[i] = mix(tree[2 * i] * 31 + tree[2 * i + 1]);
    return tree;
}

int compared = 0;
void diff(const vector<uint64_t>& a, const vector<uint64_t>& b, int node, int n,
          vector<int>& out) {
    ++compared;
    if (a[node] == b[node]) return;                  // identical subtree: skip it entirely
    if (node >= n) { out.push_back(node - n); return; }
    diff(a, b, 2 * node, n, out);
    diff(a, b, 2 * node + 1, n, out);
}

int main() {
    vector<uint64_t> r1 = {11, 22, 33, 44, 55, 66, 77, 88};   // content hash of each range
    vector<uint64_t> r2 = r1;
    r2[5] = 67;                                                // one range differs
    auto t1 = build(r1), t2 = build(r2);
    vector<int> differing;
    diff(t1, t2, 1, 8, differing);
    printf("roots equal: %s\n", t1[1] == t2[1] ? "yes" : "no");
    printf("differing ranges:");
    for (int i : differing) printf(" %d", i);
    printf("\nhashes compared: %d of %zu nodes\n", compared, t1.size() - 1);
}
```

Output:

```text
roots equal: no
differing ranges: 5
hashes compared: 7 of 15 nodes
```

The roots differ, so the replicas know they are out of sync. The search compares node 1 (root), then both children, and follows only the mismatching side at each level: 7 comparisons to pinpoint range 5, out of 15 nodes. Exchanging those few hashes and then only range 5's data costs far less than shipping all 8 ranges. With a million ranges, one difference is found in about 40 comparisons (two per level).

#### Proofs of membership

To prove that range 5 belongs to a tree with root R, send range 5's data plus the three sibling hashes on its path (range 4's leaf, the pair covering 6 and 7, and the half covering 0 to 3). The verifier rehashes upward and compares with R. With a cryptographic hash, a forged path can't reproduce R. This is how light clients verify transactions and how Git knows two trees are identical by comparing one hash.

#### Anti-entropy in a key-value store

Each node periodically builds Merkle trees over the key ranges it shares with each replica and exchanges them. Differences found this way are repaired by copying the newer values (by version or vector clock). Read repair fixes stale data that is read; anti-entropy fixes data that is never read.

Connects to: Git internals, hashing, quorums, key-value store, file storage and sync, tries.

### questions
Q: What is a Merkle tree?
A: A tree in which each leaf is the hash of a data block and each internal node is the hash of its children, so the root hash summarizes all the data. Any change in a block changes the hashes on its path up to the root.

Q: How do replicas use Merkle trees to find differences?
A: They compare root hashes; if they match, the data is identical. If not, they compare the children and descend only into subtrees whose hashes differ, reaching the out-of-sync leaves in a logarithmic number of steps per difference, then exchange only that data.

Q: What is a Merkle proof?
A: Evidence that a data block is part of a tree with a given root: the block plus the sibling hashes along its path to the root. The verifier recomputes the hashes upward and checks that the result equals the trusted root, using only about log n hashes.

## sysd.building-blocks.observability
name: "Observability"
importance: important
scope: "logs, metrics, traces, alerting"

### simple
Observability is how well you can understand what a running system is doing from the outside, especially when something goes wrong. It rests on three kinds of data: logs record individual events, metrics count and measure things over time, and traces follow one request as it travels through many services. It is like a car's dashboard, its trip log and a replay of a single journey.

### interview
- **Logs**: timestamped event records; make them **structured** (JSON with fields like request id, user id, latency) so they can be searched and aggregated; include a correlation id; watch volume and cost; never log secrets.
- **Metrics**: numeric time series with labels: **counters** (requests), **gauges** (queue depth), **histograms** (latency distributions, from which percentiles are estimated). Cheap to store and query; keep label **cardinality** low (no user ids as labels).
- **Traces**: a trace id propagated through every call (W3C `traceparent` header); each service records **spans** with start, duration and parent; shows where time went across services. Usually **sampled**.
- **What to measure**: RED for services (Rate, Errors, Duration) and USE for resources (Utilization, Saturation, Errors), plus the four golden signals (latency, traffic, errors, saturation).
- **Alerting**: page on **symptoms users feel** (SLO burn rate, error rate, latency) rather than every cause (CPU at 80%); every page should be actionable, with a runbook.
- Tools: Prometheus and Grafana, OpenTelemetry for instrumentation, log stores (Elasticsearch, Loki), tracing backends (Jaeger, Tempo).

### deep
#### Latency histograms and percentiles

Services don't keep every latency; they count requests into buckets and estimate percentiles from the counts:

```cpp
uint64_t s = 21;
double uniform01() {
    uint64_t z = (s += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return (z ^ (z >> 31)) / 18446744073709551616.0;
}

int main() {
    vector<double> bounds = {5, 10, 25, 50, 100, 250, 500, 1000};   // bucket upper bounds, ms
    vector<long> buckets(bounds.size() + 1);
    vector<double> all;
    for (int i = 0; i < 100000; ++i) {
        double ms = uniform01() < 0.97 ? 8 + 30 * uniform01() : 150 + 600 * uniform01();
        all.push_back(ms);
        ++buckets[lower_bound(bounds.begin(), bounds.end(), ms) - bounds.begin()];
    }
    sort(all.begin(), all.end());
    auto from_buckets = [&](double q) {        // interpolate inside the bucket holding q
        double target = q * all.size(), seen = 0, lo = 0;
        for (size_t b = 0; b < bounds.size(); ++b) {
            if (seen + buckets[b] >= target)
                return lo + (bounds[b] - lo) * (target - seen) / buckets[b];
            seen += buckets[b];
            lo = bounds[b];
        }
        return bounds.back();
    };
    double mean = accumulate(all.begin(), all.end(), 0.0) / all.size();
    printf("mean %.1f ms (hides the slow tail)\n", mean);
    for (double q : {0.5, 0.95, 0.99})
        printf("p%-2.0f exact %6.1f ms, from 8 histogram buckets %6.1f ms\n", q * 100,
               all[size_t(q * all.size())], from_buckets(q));
}
```

Output:

```text
mean 35.7 ms (hides the slow tail)
p50 exact   23.3 ms, from 8 histogram buckets   23.4 ms
p95 exact   37.4 ms, from 8 histogram buckets   48.8 ms
p99 exact  539.2 ms, from 8 histogram buckets  582.3 ms
```

The mean of 35.7 ms says nothing about the 3% of requests that take hundreds of milliseconds; the p99 does. Estimates from buckets are close where buckets are narrow and the data is dense (p50), but coarse where a bucket is wide: p95 lands in the 25 to 50 ms bucket and linear interpolation guesses 48.8 ms for a true 37.4 ms. Choose bucket boundaries around the values you alert on (your SLO threshold should be a boundary), or use exponential or sparse histograms that keep relative error small everywhere. And percentiles can't be averaged across servers; merge the bucket counts, then compute the percentile.

#### A trace of one request

```text
trace 4bf92f3577b34da6  GET /v1/checkout                        total 412 ms
  api-gateway          |=|                                           8 ms
  checkout-service       |==============================|          380 ms
    inventory.reserve     |===|                                     35 ms
    payments.charge            |======================|            290 ms  <- here
      bank-api.authorize         |====================|            270 ms
    orders.create                                   |==|            25 ms
```

Metrics told the team that checkout's p99 rose; the trace shows the time is spent waiting on the bank's authorization call, not in their own code. Logs for that trace id then show the details (a retry after a timeout). The three signals are most useful linked together by ids.

#### Alerts that work

- Alert on SLO burn rate or user-visible error and latency, with a short and a long window.
- Route non-urgent issues (disk 70% full, a slow burn) to tickets, not pages.
- Every alert names the likely cause and links a runbook and a dashboard.
- Review alerts that fired without action and delete or fix them: alert fatigue makes people ignore real ones.

Connects to: SLAs, SLOs and SLIs, metrics and monitoring system, time-series and analytics stores, latency vs throughput trade-offs, dead-letter queues and poison messages.

### questions
Q: What are the three pillars of observability?
A: Logs, which record individual events with context; metrics, which are numeric time series such as request rates, error counts and latency histograms; and traces, which follow a single request across services as a tree of timed spans. Together they tell you that something is wrong, where, and why.

Q: Why use histograms for latency rather than averages?
A: Averages hide the slow tail that many users experience, while histograms keep the distribution, so percentiles like p99 can be estimated and aggregated across servers by merging bucket counts. Percentile values themselves can't be averaged correctly.

Q: What is distributed tracing?
A: Propagating a trace id with every request across service boundaries and recording spans for each operation with timing and parent-child relationships. A trace shows the full path and timing of one request, revealing which service or dependency caused latency or errors.

Q: What makes a good alert?
A: It fires on symptoms users actually experience, such as SLO burn rate, error rate or latency, rather than on every internal cause; it is actionable and urgent when it pages; and it comes with context and a runbook. Noisy alerts should be tuned or removed.

## sysd.building-blocks.authentication-and-authorization-in-systems
name: "Authentication and authorization in systems"
importance: must
scope: "sessions, OAuth, JWT, API keys"

### simple
Authentication checks who you are, like showing an ID card at the door. Authorization decides what you are allowed to do once inside, like which rooms your badge opens. Systems check identity with passwords, tokens or keys, and then check permissions on every request, usually close to the data being protected.

### interview
- **Sessions**: after login, the server stores session data and gives the browser a random session id in a secure cookie (`HttpOnly`, `Secure`, `SameSite`); easy to revoke; needs a shared session store when scaled out.
- **Tokens (JWT)**: signed claims (user id, roles, expiry) the client sends in a header; services verify the signature without a lookup, so they scale easily; hard to revoke before expiry, so keep access tokens short-lived (minutes) and use **refresh tokens** (longer-lived, revocable, stored server-side).
- **OAuth 2.0**: delegated authorization, letting an app act on a user's behalf at another service without the password. The **authorization code flow with PKCE** is the standard for web and mobile apps; **OpenID Connect** adds an identity layer (ID tokens) for "log in with ...". **Client credentials** flow for service-to-service.
- **API keys**: identify a calling program for server-to-server APIs; store only a hash, scope them, allow rotation, rate limit per key. Not a user login mechanism.
- **Authorization models**: **RBAC** (roles grant permissions), **ABAC** (rules on attributes: owner, department, time), **ReBAC** (relationships, as in Google Zanzibar: "viewer of a folder that contains this doc"). Deny by default.
- **Where to check**: the gateway authenticates and applies coarse rules; each service enforces fine-grained, resource-level authorization (it knows who owns what). Between services, use mutual TLS or signed service tokens.

### deep
#### A permission check combining roles and attributes

```cpp
struct User { string id; set<string> roles; };
struct Document { string id, owner, visibility; };

const map<string, set<string>> role_permissions = {
    {"viewer", {"doc:read"}},
    {"editor", {"doc:read", "doc:write"}},
    {"admin", {"doc:read", "doc:write", "doc:delete"}},
};

bool can(const User& u, const string& action, const Document& d) {
    if (action == "doc:read" && d.visibility == "public") return true;   // attribute rule
    if (d.owner == u.id) return true;                                     // owners may do anything
    for (auto& role : u.roles)                                            // role-based rules
        if (auto it = role_permissions.find(role); it != role_permissions.end() &&
                                                   it->second.count(action))
            return true;
    return false;                                                          // deny by default
}

int main() {
    User asha{"asha", {"editor"}}, ravi{"ravi", {"viewer"}}, meera{"meera", {}};
    Document plan{"plan", "meera", "private"}, blog{"blog", "asha", "public"};
    for (auto* u : {&asha, &ravi, &meera})
        for (string action : {"doc:read", "doc:write", "doc:delete"})
            printf("%-5s %-10s plan: %-5s  blog: %s\n", u->id.c_str(), action.c_str(),
                   can(*u, action, plan) ? "allow" : "deny",
                   can(*u, action, blog) ? "allow" : "deny");
}
```

Output:

```text
asha  doc:read   plan: allow  blog: allow
asha  doc:write  plan: allow  blog: allow
asha  doc:delete plan: deny   blog: allow
ravi  doc:read   plan: allow  blog: allow
ravi  doc:write  plan: deny   blog: deny
ravi  doc:delete plan: deny   blog: deny
meera doc:read   plan: allow  blog: allow
meera doc:write  plan: allow  blog: deny
meera doc:delete plan: allow  blog: deny
```

Three rules combine. Anyone may read a public document (an attribute rule: the blog). An owner may do anything with their own document (Meera and her plan, Asha and her blog). Otherwise roles decide: editors read and write, viewers only read, and nobody but an admin or the owner deletes. Everything not explicitly allowed is denied. The output also exposes a weakness of plain roles: Asha, an editor, may write Meera's private plan, because her role is global. Real systems scope roles to a resource (editor *of this workspace*) or use relationship-based models where permissions follow sharing and folder membership.

#### Login and API calls in a typical web system

```text
1. browser -> auth service: user name + password (+ second factor)
2. auth service: verify the password hash (bcrypt or argon2), create a session
   -> Set-Cookie: sid=<random>; HttpOnly; Secure; SameSite=Lax
3. browser -> API gateway: request with the cookie
4. gateway: look up the session (Redis) -> user 42, roles [editor]
   -> forwards with a short-lived internal token (signed: user 42, roles, expiry 5 min)
5. documents service: verifies the token signature, loads the document,
   checks "may user 42 write document 9?" against owner and sharing rules
```

The gateway handles authentication once; each service still makes its own authorization decision, because only it knows the resource. For mobile apps and third-party integrations, OAuth access tokens replace the cookie in step 3.

#### Sessions or JWTs?

| | server-side session | JWT access token |
|---|---|---|
| each request | one store lookup | signature check only |
| revoke now (logout, stolen) | delete the session | wait for expiry, or keep a deny list |
| size | a small id | hundreds of bytes of claims |
| fits | browser apps with a backend | APIs, mobile, service-to-service, many independent services |

A common hybrid: a session or refresh token at the edge, short-lived JWTs inside.

#### Mistakes to avoid

- Trusting data from the client (a role or user id in a request body) instead of the verified token.
- Long-lived JWTs with no revocation path; putting secrets in JWT payloads (they are only encoded, not encrypted).
- Checking permissions only in the UI or only at the gateway.
- Storing API keys or passwords in plain text; logging tokens.

Connects to: OAuth and JWT basics, stateless services, API gateway and service discovery, hashing and password storage, TLS, service mesh.

### questions
Q: What is the difference between authentication and authorization?
A: Authentication establishes who the caller is, through a password, a token, a key or a certificate. Authorization decides what that authenticated caller may do with a given resource, using roles, attributes or relationships, and must be checked on every request.

Q: What are the trade-offs between server-side sessions and JWTs?
A: Sessions need a lookup in a shared store on each request but can be revoked instantly. JWTs are verified locally from their signature, which scales well across services, but can't easily be revoked before they expire, so they are kept short-lived with refresh tokens.

Q: What is OAuth 2.0 used for?
A: Delegated authorization: letting an application access a user's resources at another service with the user's consent, without handing over the password. The authorization code flow with PKCE is standard for web and mobile apps, and OpenID Connect builds login on top of it.

Q: Where should authorization checks happen in a microservice system?
A: Coarse checks can happen at the API gateway, such as requiring an authenticated user or a scope, but fine-grained checks belong in the service that owns the resource, because only it knows ownership and sharing. Services should also authenticate each other, for example with mutual TLS.

Q: How should API keys be stored and managed?
A: Store only a hash of each key, like a password, show the key once at creation, scope it to the permissions it needs, support rotation and revocation, and rate limit and log usage per key. Never embed keys in client-side code.
