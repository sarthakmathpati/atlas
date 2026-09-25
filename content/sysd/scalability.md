---
topic: sysd.scalability
name: "Scalability foundations"
subject: sysd
order: 2
prereqs: [sysd.method]
---

## sysd.scalability.vertical-vs-horizontal-scaling
name: "Vertical vs horizontal scaling"
importance: must
scope: "Vertical vs horizontal scaling"

### simple
Vertical scaling means buying a bigger machine: more CPU, memory and disk in one box. Horizontal scaling means adding more machines and splitting the work between them. It is like a restaurant that can either hire one faster chef, who can only get so fast, or open more kitchens, which needs a way to split the orders.

### interview
- **Vertical** (scale up): simple, no code changes, no distributed-systems problems, strong consistency stays easy. Limits: the biggest machine has a ceiling, prices grow faster than capacity at the top end, upgrades often need downtime, and it's still one point of failure.
- **Horizontal** (scale out): nearly unlimited capacity from commodity machines, redundancy for free, and you can add or remove machines with load. Costs: the application must be **stateless** or its data **partitioned**, plus load balancing, network calls, partial failures and consistency questions.
- Stateless tiers (web and API servers) scale out easily; **stateful** tiers (databases) are the hard part: replicas for reads, sharding for writes.
- Scaling out has diminishing returns when nodes share something: contention and coordination eventually make adding nodes *slower* (the Universal Scalability Law).
- Practical default: scale up the database as far as is sensible (it's cheap engineering), scale out the stateless tiers from day one, and shard when a single primary can't keep up.

### deep
#### The two options

| | vertical | horizontal |
|---|---|---|
| how | bigger CPU, RAM, disks | more machines behind a load balancer |
| code changes | none | state must move out of the servers or be partitioned |
| ceiling | the largest machine you can buy | practically none for stateless work |
| failure | one box is a single point of failure | losing one of many is routine |
| consistency | easy (one copy) | needs replication and partitioning decisions |
| cost curve | superlinear at the high end | roughly linear |

#### Why adding machines doesn't scale forever

When nodes share a lock, a database row or need to agree with each other, each added node brings some waiting (**contention**) and some talking to every other node (**coherency**). The Universal Scalability Law models throughput with $N$ nodes as

$$X(N) = \frac{N}{1 + \alpha (N - 1) + \beta N (N - 1)}$$

where $\alpha$ is the fraction serialized by contention and $\beta$ the cost of coherency. With 5% contention and a small coherency cost:

```cpp
int main() {
    const double alpha = 0.05, beta = 0.0005;
    for (int n : {1, 2, 4, 8, 16, 32, 44, 64, 128}) {
        double speedup = n / (1 + alpha * (n - 1) + beta * n * (n - 1));
        printf("%3d nodes: %5.2fx\n", n, speedup);
    }
    printf("peak near %.0f nodes\n", sqrt((1 - alpha) / beta));
}
```

Output:

```text
  1 nodes:  1.00x
  2 nodes:  1.90x
  4 nodes:  3.46x
  8 nodes:  5.81x
 16 nodes:  8.56x
 32 nodes: 10.51x
 44 nodes: 10.74x
 64 nodes: 10.38x
128 nodes:  8.27x
peak near 44 nodes
```

Doubling from 1 to 2 nodes nearly doubles throughput, but 32 nodes give only about 10.5 times one node, and past about 44 nodes throughput *falls*: coordination costs more than the extra machines add. The escape is to remove sharing, not to add hardware: stateless servers (nothing shared between requests) and partitioned data (each shard's work is independent) push $\alpha$ and $\beta$ toward zero, which is why those two ideas dominate scalable designs.

#### How real systems combine both

- **Web and API tier**: horizontal from the start; it's cheap once servers are stateless.
- **Database**: vertical first (a large instance with fast SSDs and lots of memory goes a long way), read replicas for read load, sharding when writes or data size outgrow one primary.
- **Caches and queues**: horizontal by partitioning keys or topics.

In an interview, say which tier you are scaling and why: "the API servers scale out behind the load balancer; the database is one primary with two replicas until writes exceed about 10,000 per second, then we shard by user id."

#### Edge cases and pitfalls

- Horizontal scaling of a service with in-memory sessions breaks logins unless sessions move to a shared store.
- More machines means more failures per day; automation (health checks, replacement) becomes mandatory.
- A bigger machine doesn't help a single-threaded bottleneck, and more machines don't help a single hot row.

Connects to: stateless services, load balancing, autoscaling, replication in practice, sharding strategies, Amdahl's law.

### questions
Q: What is the difference between vertical and horizontal scaling?
A: Vertical scaling adds resources to one machine, which is simple but capped by the largest machine and leaves a single point of failure. Horizontal scaling adds machines and spreads the load, which scales much further and adds redundancy, but requires stateless services or partitioned data and handling distributed failures.

Q: Why can't you just keep adding servers to go faster?
A: Work that is shared or coordinated doesn't parallelize. Contention for shared resources and the cost of keeping nodes consistent grow with the number of nodes, so throughput flattens and can even drop, as the Universal Scalability Law describes. Removing shared state is what makes scaling out effective.

Q: Which tiers of a web system are easiest to scale horizontally?
A: Stateless tiers such as web and API servers, because any instance can handle any request and you only need a load balancer. Stateful tiers such as databases are harder: reads scale with replicas, and writes need sharding.

Q: When is vertical scaling the right choice?
A: Early on, and for components that are hard to distribute, such as a relational primary: a bigger machine buys time with no code changes. It stops being right when you hit hardware limits, cost grows too steep, or you need the redundancy that several machines provide.

## sysd.scalability.stateless-services
name: "Stateless services"
importance: must
prereqs: [sysd.scalability.vertical-vs-horizontal-scaling]
scope: "why state should live outside app servers"

### simple
A stateless server keeps nothing about a user between requests in its own memory; everything it needs comes with the request or from a shared store. Then any server can answer any request, so you can add, remove or restart servers freely. It is like a call center where every agent can pull up your case file, instead of only the one agent who remembers you.

### interview
- **Stateless**: the server holds no per-user data between requests; session data lives in the request (a signed token), a shared store (Redis, a database) or the client.
- Benefits: the load balancer can send any request anywhere, instances can be added, removed or crash without losing data, deploys are rolling restarts, autoscaling works.
- **Sticky sessions** (routing a user to the same server) are a workaround with costs: uneven load, lost sessions when that server dies, harder scale-down.
- Where state goes: sessions → Redis or signed cookies/JWTs; uploads → object storage; caches → a distributed cache (local caches are fine as long as they are only a cache); long jobs → a queue.
- Stateful services still exist (databases, caches, WebSocket connection servers); isolate them behind their own scaling strategy.
- Twelve-factor principle: processes are disposable and share nothing.

### deep
#### The failure without shared state

Two API servers behind a round-robin load balancer, each keeping logged-in sessions in its own memory:

```cpp
struct Server {
    string name;
    unordered_map<string, string> local_sessions;   // session id -> user
};

struct SessionStore { unordered_map<string, string> sessions; };  // e.g. Redis

int main() {
    // 1. Sessions kept inside each server
    vector<Server> servers = {{"api-1", {}}, {"api-2", {}}};
    int next = 0;
    auto pick = [&]() -> Server& { return servers[next++ % servers.size()]; };

    pick().local_sessions["s-42"] = "asha";          // login lands on api-1
    Server& second = pick();                          // next request lands on api-2
    bool found = second.local_sessions.count("s-42");
    printf("local sessions:  %s -> %s\n", second.name.c_str(),
           found ? "logged in as asha" : "401, please log in again");

    // 2. Sessions in a shared store
    SessionStore store;
    next = 0;
    pick();                                           // login on api-1 ...
    store.sessions["s-42"] = "asha";                  // ... writes to the shared store
    Server& other = pick();                           // next request on api-2
    auto it = store.sessions.find("s-42");
    printf("shared sessions: %s -> %s\n", other.name.c_str(),
           it != store.sessions.end() ? ("logged in as " + it->second).c_str() : "401");
}
```

Output:

```text
local sessions:  api-2 -> 401, please log in again
shared sessions: api-2 -> logged in as asha
```

With local state, the second request hit a server that had never seen the session. Sticky sessions would hide this until api-1 crashes or is removed during a deploy, and then every user on it is logged out at once. With the session in a shared store, the servers are interchangeable.

#### Options for where session state lives

| option | how | trade-off |
|---|---|---|
| shared store (Redis) | cookie holds a random session id; data in Redis | one lookup per request; easy revocation; the store must be highly available |
| signed token (JWT) | cookie or header holds signed claims | no lookup; hard to revoke before expiry; keep tokens small and short-lived |
| client only | preferences in local storage | only for data that isn't sensitive or authoritative |
| database | session table | durable but slower; fine at low scale |

#### What else counts as state

- **Uploaded files** written to a server's local disk vanish with the server: upload to object storage.
- **In-memory counters or rate limits** give each server its own count: keep them in a shared store.
- **Scheduled jobs** running "on the server" run once per instance: use a scheduler with a lock or a queue.
- **WebSocket connections** are inherently tied to one server; keep the connection layer thin and store everything else outside it, so a reconnect to any server works.

Connects to: HTTP basics (stateless requests), load balancing, autoscaling, OAuth and JWT basics, Redis and Memcached, authentication and authorization in systems.

### questions
Q: What does it mean for a service to be stateless?
A: Each request carries or can fetch everything needed to handle it, and the server keeps no per-client data in its own memory between requests. Any instance can serve any request, so instances can be added, removed or replaced without affecting users.

Q: Why are sticky sessions considered a workaround?
A: They pin each user to one server so in-memory sessions keep working, but load becomes uneven, users on a failed or removed server lose their sessions, and autoscaling or deploys disrupt them. Moving session data to a shared store or signed tokens removes the need.

Q: Where would you store user sessions in a horizontally scaled web app?
A: In a shared low-latency store such as Redis, keyed by a random session id kept in a secure cookie, or in a signed token such as a JWT carried by the client. The store allows instant revocation; tokens avoid a lookup but are harder to revoke.

Q: Name some kinds of state that often hide inside app servers.
A: In-memory sessions, files written to local disk, per-instance caches treated as the source of truth, in-memory rate-limit counters, and scheduled jobs that run on every instance. Each must move to shared storage, object storage, a shared counter store or a coordinated scheduler before the tier can scale out safely.

## sysd.scalability.load-balancing
name: "Load balancing"
importance: must
prereqs: [sysd.scalability.stateless-services]
scope: "algorithms (round robin, least connections, consistent hashing), health checks"

### simple
A load balancer is a traffic controller in front of a group of servers: every request arrives at it, and it forwards each one to a server that is up and not too busy. If a server fails its health check, the balancer stops sending it work. It is like a host at a busy restaurant seating guests at whichever tables are free.

### interview
- **Layer 4** balancers route by IP and port (fast, protocol-agnostic, TCP or UDP); **layer 7** balancers read HTTP (route by path, host or header, terminate TLS, retry, add headers).
- **Algorithms**: round robin (and weighted), least connections (and least response time), random, **power of two choices** (pick two at random, send to the less loaded), IP or key hash, **consistent hashing** (the same key keeps going to the same server, and only a small share of keys move when servers change: useful for caches and sticky routing).
- **Health checks**: active (probe `/health` every few seconds, remove after N failures, re-add after M successes) and passive (watch real traffic for errors and timeouts). Readiness vs liveness: "can take traffic" vs "is running".
- **Connection draining**: stop sending new requests to a server being removed, let in-flight ones finish.
- Avoid the balancer becoming a single point of failure: run pairs with a floating IP, DNS with several addresses, or a managed cloud balancer; global balancing uses DNS or anycast.
- Round robin assumes equal requests; with uneven request costs, least connections or power of two choices keeps queues shorter.

### deep
#### Comparing algorithms

Four servers, a request every time unit, and uneven work: 90% of requests take 2 units, 10% take 12 (like cheap reads mixed with heavy reports). Each server works through its own queue. The same request sequence goes through each algorithm:

```cpp
uint64_t rng_state;
uint64_t next_rand() {                       // SplitMix64: small and deterministic
    uint64_t z = (rng_state += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

int main() {
    const int servers = 4, jobs = 100000;
    rng_state = 1;
    vector<int> work(jobs);
    for (int& w : work) w = next_rand() % 10 == 0 ? 12 : 2;   // mean 3: 75% utilization

    for (string algo : {"round robin", "random", "least connections", "two choices"}) {
        rng_state = 7;
        vector<deque<long>> finish(servers);   // finish times of queued jobs per server
        vector<long> response;
        for (long t = 0; t < jobs; ++t) {
            for (auto& q : finish) while (!q.empty() && q.front() <= t) q.pop_front();
            auto load = [&](int s) { return finish[s].size(); };
            int s = 0;
            if (algo == "round robin") s = t % servers;
            else if (algo == "random") s = next_rand() % servers;
            else if (algo == "least connections") {
                for (int i = 1; i < servers; ++i) if (load(i) < load(s)) s = i;
            } else {
                int a = next_rand() % servers;                          // two distinct
                int b = (a + 1 + next_rand() % (servers - 1)) % servers;  // random servers
                s = load(a) <= load(b) ? a : b;
            }
            long start = finish[s].empty() ? t : max(t, finish[s].back());
            finish[s].push_back(start + work[t]);
            response.push_back(start + work[t] - t);
        }
        sort(response.begin(), response.end());
        double mean = accumulate(response.begin(), response.end(), 0.0) / jobs;
        printf("%-18s mean %5.1f  p99 %3ld\n", algo.c_str(), mean, response[jobs * 99 / 100]);
    }
}
```

Output:

```text
round robin        mean   6.8  p99  30
random             mean  10.1  p99  46
least connections  mean   3.4  p99  14
two choices        mean   4.4  p99  20
```

The average job needs 3 units of work, so everything above 3 is waiting. Round robin spreads *requests* evenly but not *work*: a server that drew two heavy jobs keeps receiving its share while its queue grows. Random is worse still, since it can pile several requests on one server by chance. Least connections looks at every queue and avoids busy servers, halving the mean and the p99 compared with round robin. Power of two choices gets most of that benefit (from 10.1 down to 4.4 compared with random) while looking at only two servers, which matters when many independent balancers can't share an exact, up-to-date view of every server's load.

#### Health checks and draining

A typical active check: `GET /health` every 5 seconds with a 2-second timeout; mark unhealthy after 3 consecutive failures, healthy again after 2 successes. The endpoint should check what the server needs to do its job (can it reach its database?) without being so strict that a hiccup in one dependency takes every server out at once. During deploys, a server first fails readiness, the balancer drains it (no new requests; in-flight ones complete within a timeout), then it restarts.

#### Where balancers sit

```text
clients -> DNS (region) -> L4/L7 load balancer -> API servers -> internal L7 balancing -> services
```

Global traffic is steered by DNS or anycast to the nearest healthy region; inside a region, a layer 7 balancer terminates TLS and routes by path; between services, client-side balancing or a service mesh often replaces a central box.

#### Consistent hashing for sticky routing

When the same key should keep hitting the same server, as with cache shards or per-user in-memory data, hash the key onto a ring of servers. Adding a fifth server then moves only about a fifth of the keys, where `hash % N` would move about 80%.

Connects to: load balancers (the networking view), stateless services, consistent hashing in design, autoscaling, DNS, health checks in observability.

### questions
Q: What is the difference between layer 4 and layer 7 load balancing?
A: A layer 4 balancer forwards TCP or UDP connections based on addresses and ports without reading the payload, which is fast and protocol-agnostic. A layer 7 balancer parses HTTP, so it can route by path, host or headers, terminate TLS, retry and rewrite requests, at more cost per request.

Q: When is least connections better than round robin?
A: When requests differ a lot in cost or duration. Round robin gives each server the same number of requests even if some are stuck with slow ones, while least connections steers new requests away from busy servers, keeping queues and response times shorter.

Q: What is the power of two choices?
A: For each request, pick two servers at random and send the request to the less loaded one. It needs only two load lookups yet gives most of the benefit of checking every server, and it avoids the herd effect where many balancers with stale data all pick the same "least loaded" server.

Q: How do health checks and connection draining work together?
A: The balancer probes each server and removes it after repeated failures, so traffic avoids broken instances. When a server is removed on purpose, draining stops new requests but lets in-flight requests finish, so deploys and scale-downs don't cut off users.

Q: How do you keep the load balancer from being a single point of failure?
A: Run balancers redundantly: an active-passive pair sharing a floating IP, several active balancers behind DNS or anycast, or a managed cloud balancer that is itself distributed. Clients and DNS then fail over when one balancer dies.

## sysd.scalability.autoscaling
name: "Autoscaling"
importance: important
prereqs: [sysd.scalability.load-balancing]
scope: "scaling on metrics"

### simple
Autoscaling adds servers when load rises and removes them when it falls, automatically, based on measurements such as CPU use or requests per second. You pay for what you need instead of for the busiest hour all day long. It is like a supermarket opening more checkouts when the queues grow and closing them in the quiet afternoon.

### interview
- **Target tracking**: keep a metric near a target, for example 60% CPU. Kubernetes' horizontal autoscaler computes desired replicas = ceil(current replicas × current metric ÷ target).
- **Metrics**: CPU for CPU-bound services; requests per second per instance, latency, or **queue depth** (backlog per worker) for queue consumers; custom business metrics.
- **Lag**: new instances need time to boot and warm up (seconds for containers, minutes for VMs), so a sudden spike overloads the current fleet first. Keep headroom, scale on a leading metric, and use **scheduled** or **predictive** scaling for known peaks.
- **Stability**: scale up fast, scale down slowly (a cooldown or stabilization window) to avoid flapping; set minimum and maximum instance counts.
- Prerequisites: stateless instances, health checks, connection draining, and downstream capacity (scaling the API tier to 100 instances can overwhelm the database).
- Serverless platforms autoscale per request, down to zero, at the cost of cold starts.

### deep
#### Simulating a target-tracking autoscaler

Each instance handles 100 requests per second; the target is 60% utilization; new instances take one tick to become ready; scale-down happens only after the lower count has been wanted for 3 ticks in a row; the fleet stays between 2 and 20 instances.

```cpp
int main() {
    const double capacity = 100, target = 0.6;
    vector<int> load = {300, 320, 350, 900, 1000, 950, 600, 400, 300, 300, 300, 300};
    int ready = 5, pending = 0, low_streak = 0;
    printf("tick  load  ready  util  desired\n");
    for (size_t t = 0; t < load.size(); ++t) {
        ready += pending;                       // instances started last tick are ready now
        pending = 0;
        double util = load[t] / (ready * capacity);
        int desired = (int)ceil(ready * util / target);
        desired = clamp(desired, 2, 20);
        printf("%4zu %5d %6d %4.0f%% %8d\n", t, load[t], ready, util * 100, desired);
        if (desired > ready) { pending = desired - ready; low_streak = 0; }
        else if (desired < ready && ++low_streak >= 3) { ready = desired; low_streak = 0; }
        else if (desired >= ready) low_streak = 0;
    }
}
```

Output:

```text
tick  load  ready  util  desired
   0   300      5   60%        5
   1   320      5   64%        6
   2   350      6   58%        6
   3   900      6  150%       15
   4  1000     15   67%       17
   5   950     17   56%       16
   6   600     17   35%       10
   7   400     17   24%        7
   8   300      7   43%        5
   9   300      7   43%        5
  10   300      7   43%        5
  11   300      5   60%        5
```

Three lessons are visible. At tick 3 the traffic spike hits 6 instances at 150% utilization: requests queue or fail until the new instances are ready one tick later. The autoscaler can't react faster than instances start, so keep headroom or scale ahead of known peaks. Scale-up happens at once, but scale-down waits for three low readings in a row (ticks 5 to 7), so a brief dip doesn't remove capacity that's needed again a minute later. And the fleet settles back at 5 instances, 60% utilized.

#### Choosing the metric

| workload | good scaling signal |
|---|---|
| CPU-bound API | CPU utilization, or requests per second per instance |
| I/O-bound API | latency or in-flight requests (CPU stays low while waiting) |
| queue workers | messages waiting per worker, or age of the oldest message |
| known daily peaks | a schedule, plus target tracking for surprises |

#### Pitfalls

- Scaling on CPU for a service that waits on a slow database: CPU stays low while latency explodes.
- Aggressive scale-down that kills instances in the middle of long requests (use draining and termination grace periods).
- A retry storm or attack looks like real demand; rate limits and maximum counts cap the bill and protect dependencies.

Connects to: load balancing, stateless services, message queues (queue-depth scaling), serverless, graceful degradation and backpressure, SLAs, SLOs and SLIs.

### questions
Q: How does target-tracking autoscaling decide how many instances to run?
A: It measures a metric such as average CPU and scales the instance count in proportion to how far the metric is from its target: desired equals current instances times current value divided by target, rounded up and clamped between a minimum and maximum.

Q: Why can autoscaling fail to prevent an outage during a sudden spike?
A: New instances take time to start and warm up, so for that period the existing fleet absorbs the whole spike and may be overloaded. Headroom, faster-starting instances, scheduled or predictive scaling for known events, and load shedding cover the gap.

Q: Why do autoscalers scale down more slowly than they scale up?
A: Removing capacity too eagerly causes flapping: a short dip removes instances, load returns, and new ones must start again while users wait. A stabilization window or cooldown for scale-down keeps capacity until the lower load has lasted a while.

Q: What metric would you autoscale queue consumers on?
A: The backlog per worker or the age of the oldest message, because they directly measure whether consumers keep up. CPU can be misleading for workers that mostly wait on I/O.

## sysd.scalability.latency-vs-throughput-trade-offs
name: "Latency vs throughput trade-offs"
importance: must
scope: "Latency vs throughput trade-offs"

### simple
Latency is how long one request takes; throughput is how many requests the system finishes per second. A highway's travel time is its latency and the cars per hour is its throughput. Pushing more cars onto the road raises throughput only up to a point; near capacity, traffic jams make every trip much longer.

### interview
- **Latency**: time for one operation (report percentiles: p50, p99). **Throughput**: operations per unit time. **Utilization**: share of time a resource is busy.
- **Little's law**: requests in the system = arrival rate × time in the system ($L = \lambda W$), for any stable system. Useful for sizing thread pools and connection pools.
- **Queueing**: as utilization $\rho$ approaches 1, waiting time explodes. For a simple single-server queue, time in system $= \frac{1}{\mu - \lambda}$, so going from 50% to 90% utilization multiplies latency by 5, and 99% by 50.
- **Batching** raises throughput (fixed costs shared across items) and raises latency (items wait for the batch). Same for larger buffers, Nagle's algorithm and group commit.
- **Parallelism and fan-out** cut latency for big jobs, but a request that waits for many parallel calls is as slow as the slowest: tail latency dominates.
- Run production systems at moderate utilization (often 50 to 70%) to keep latency stable and absorb bursts.

### deep
#### Queueing: why "90% busy" feels slow

```cpp
int main() {
    const double mu = 1000;                     // one server finishes 1000 requests/s (1 ms each)
    printf("utilization  arrival/s  time in system  requests inside\n");
    for (double rho : {0.5, 0.8, 0.9, 0.95, 0.99}) {
        double lambda = rho * mu;
        double w_ms = 1000 / (mu - lambda);     // M/M/1 queue: W = 1 / (mu - lambda)
        double l = lambda * w_ms / 1000;        // Little's law: L = lambda * W
        printf("%10.0f%% %10.0f %12.1f ms %14.1f\n", rho * 100, lambda, w_ms, l);
    }
    // batching: 1 ms fixed cost per call plus 0.1 ms per item
    for (int batch : {1, 10, 100}) {
        double call_ms = 1 + 0.1 * batch;
        printf("batch %3d: %6.0f items/s, each call takes %4.1f ms\n",
               batch, batch * 1000 / call_ms, call_ms);
    }
    // fan-out: chance that at least one of n calls is slower than its p99
    for (int n : {1, 10, 100})
        printf("fan-out %3d: %4.1f%% of requests hit a p99-slow call\n",
               n, (1 - pow(0.99, n)) * 100);
}
```

Output:

```text
utilization  arrival/s  time in system  requests inside
        50%        500          2.0 ms            1.0
        80%        800          5.0 ms            4.0
        90%        900         10.0 ms            9.0
        95%        950         20.0 ms           19.0
        99%        990        100.0 ms           99.0
batch   1:    909 items/s, each call takes  1.1 ms
batch  10:   5000 items/s, each call takes  2.0 ms
batch 100:   9091 items/s, each call takes 11.0 ms
fan-out   1:  1.0% of requests hit a p99-slow call
fan-out  10:  9.6% of requests hit a p99-slow call
fan-out 100: 63.4% of requests hit a p99-slow call
```

**Queueing.** The work per request never changed (1 ms), yet at 99% utilization a request spends 100 ms in the system, almost all of it waiting. Random arrivals bunch up, and near full utilization there is no idle time to drain the bunches. Little's law checks the numbers: at 900 requests per second and 10 ms each, 9 requests are inside on average. This curve is why capacity plans aim well below 100%, and why a small traffic increase near saturation causes a sudden latency cliff.

**Batching.** Sending 100 items per call multiplies throughput tenfold, because the 1 ms fixed cost (a round trip, a disk flush, a system call) is shared. But each call now takes 11 ms, and an item may also wait for its batch to fill. Kafka producers (`linger.ms`), database group commit and TCP's Nagle algorithm all make this trade; good implementations cap the wait so latency stays bounded.

**Fan-out.** A page assembled from 100 backend calls sees a p99-slow response in 63% of requests. At scale, the tail of each component becomes the median of the whole. Remedies: fewer sequential and parallel dependencies, timeouts, hedged requests (send a second copy after the p95 time, use whichever returns first), and caching.

#### Choosing what to optimize

| system | optimize for | typical techniques |
|---|---|---|
| user-facing API | latency (p99) | caching, fewer hops, headroom, timeouts |
| batch analytics, backups | throughput | large batches, sequential I/O, parallelism |
| trading systems | latency (microseconds) | no queues, pinned cores, kernel bypass |
| message pipelines | throughput with bounded latency | batching with a maximum wait |

Connects to: back-of-the-envelope estimation, Little's law, functional vs non-functional requirements, message queues, Nagle's algorithm, graceful degradation and backpressure.

### questions
Q: What is the difference between latency and throughput?
A: Latency is the time one operation takes, usually reported as percentiles; throughput is how many operations complete per unit of time. They are related but distinct: batching can raise throughput while making each item's latency worse.

Q: What is Little's law and how is it used?
A: In a stable system, the average number of items inside equals the arrival rate times the average time each spends inside, L = lambda times W. For example, 2,000 requests per second at 50 ms each means about 100 requests in flight, which sizes thread pools and connection pools.

Q: Why does latency rise sharply as utilization approaches 100%?
A: Arrivals are bursty, and queues only drain during idle time. As utilization approaches 1 there is almost no idle time, so bursts pile up and waiting time grows without bound; in a simple queue it is proportional to 1 divided by (1 minus utilization).

Q: How does batching trade latency for throughput?
A: Grouping items spreads fixed per-call costs such as network round trips or disk flushes over many items, raising throughput. Each item waits for the batch to fill and for the larger call to finish, so latency increases; systems cap the batch size and the maximum wait.

Q: Why does fan-out make tail latency worse?
A: A request that waits for many parallel calls finishes only when the slowest one returns. If each call is slow 1% of the time, a request with 100 calls is slow about 63% of the time, so the components' tail becomes the typical experience.
