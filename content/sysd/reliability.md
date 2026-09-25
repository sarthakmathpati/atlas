---
topic: sysd.reliability
name: "Reliability and resilience"
subject: sysd
order: 7
prereqs: [sysd.scalability]
---

## sysd.reliability.rate-limiting-algorithms
name: "Rate limiting algorithms"
importance: must
scope: "token bucket, leaky bucket, fixed and sliding windows"

### simple
A rate limiter caps how many requests a client may make in a period, such as 100 per minute, and rejects or delays the rest. It protects a service from overload, abuse and runaway scripts, and shares capacity fairly. It is like a turnstile that lets only so many people through per minute, however hard the crowd pushes.

### interview
- **Fixed window counter**: count per client per window (per minute); reset at the boundary. Cheap (one counter), but allows **twice the limit** across a boundary (a burst at 0:59 and another at 1:00).
- **Sliding window log**: store the timestamp of each accepted request; allow if fewer than the limit fall in the last window. Exact, but memory grows with the limit.
- **Sliding window counter**: estimate = previous window's count × the share of it still inside the sliding window + the current count. Two counters, nearly exact; a popular production choice.
- **Token bucket**: tokens refill at rate r up to capacity b; each request spends one. Allows **bursts up to b** while holding the long-run average at r. Used by many APIs and gateways.
- **Leaky bucket**: requests enter a queue of fixed size that drains at a constant rate; extra requests are dropped. Produces a **smooth output rate** (traffic shaping), adding delay instead of allowing bursts.
- Respond with **429 Too Many Requests** and `Retry-After` or `X-RateLimit-*` headers; limit by API key, user, IP or endpoint, with separate limits for expensive endpoints.
- Distributed limiters keep counters in a shared store (Redis with atomic `INCR` or a Lua script) or approximate with local limits per instance.

### deep
#### Five algorithms on the same traffic

Each limiter allows 5 requests per second (for the buckets: capacity 5, refill 5 per second). Traffic: two bursts of 5 around the one-second boundary, then a few spread-out requests. `Y` means allowed:

```cpp
// Every limiter allows 5 requests per 1,000 ms. Times are in milliseconds.
struct FixedWindow {
    long window = -1; int count = 0;
    bool allow(long t) {
        if (t / 1000 != window) { window = t / 1000; count = 0; }
        return count < 5 ? (++count, true) : false;
    }
};
struct SlidingLog {
    deque<long> log;                                   // times of allowed requests
    bool allow(long t) {
        while (!log.empty() && log.front() <= t - 1000) log.pop_front();
        return log.size() < 5 ? (log.push_back(t), true) : false;
    }
};
struct SlidingCounter {                                // weighted previous + current window
    long window = 0; int prev = 0, curr = 0;
    bool allow(long t) {
        long w = t / 1000;
        if (w != window) { prev = (w == window + 1) ? curr : 0; curr = 0; window = w; }
        double weight = 1.0 - (t % 1000) / 1000.0;     // share of the previous window
        return prev * weight + curr < 5 ? (++curr, true) : false;
    }
};
struct TokenBucket {                                   // capacity 5, refill 5 per second
    double tokens = 5; long last = 0;
    bool allow(long t) {
        tokens = min(5.0, tokens + (t - last) * 5 / 1000.0);
        last = t;
        return tokens >= 1 ? (tokens -= 1, true) : false;
    }
};

struct LeakyBucket {                                   // queue of 5, drains one per 200 ms
    deque<long> done;                                  // when each queued request finishes
    vector<long> processed;
    bool allow(long t) {
        while (!done.empty() && done.front() <= t) done.pop_front();
        if (done.size() >= 5) return false;
        long start = done.empty() ? t : max(t, done.back());
        done.push_back(start + 200);
        processed.push_back(start + 200);
        return true;
    }
};

int main() {
    vector<long> reqs = {900, 920, 940, 960, 980, 1000, 1020, 1040, 1060, 1080,
                         1500, 1600, 1700, 2100, 2200};
    auto run = [&](const char* name, auto& limiter) {
        string marks;
        for (size_t i = 0; i < reqs.size(); ++i) {
            if (i == 5 || i == 10 || i == 13) marks += ' ';   // group the bursts
            marks += limiter.allow(reqs[i]) ? 'Y' : '.';
        }
        long allowed = count(marks.begin(), marks.end(), 'Y');
        printf("%-16s %s  allowed %ld\n", name, marks.c_str(), allowed);
    };
    printf("requests: 5 at 900-980 ms, 5 at 1000-1080, then 1500 1600 1700, 2100 2200\n");
    FixedWindow fw; SlidingLog sl; SlidingCounter sc; TokenBucket tb; LeakyBucket lb;
    run("fixed window", fw);
    run("sliding log", sl);
    run("sliding counter", sc);
    run("token bucket", tb);
    run("leaky bucket", lb);
    printf("leaky bucket sends them on at:");
    for (long t : lb.processed) printf(" %ld", t);
    printf("\n");
}
```

Output:

```text
requests: 5 at 900-980 ms, 5 at 1000-1080, then 1500 1600 1700, 2100 2200
fixed window     YYYYY YYYYY ... YY  allowed 12
sliding log      YYYYY ..... ... YY  allowed 7
sliding counter  YYYYY .Y... YYY YY  allowed 11
token bucket     YYYYY ..... YYY YY  allowed 10
leaky bucket     YYYYY ..... YYY YY  allowed 10
leaky bucket sends them on at: 1100 1300 1500 1700 1900 2100 2300 2500 2700 2900
```

- **Fixed window** let all 10 burst requests through within 180 ms, because they fell into two different windows: double the intended rate at the boundary. Then it refused 1,500 to 1,700 ms because the second window was already full.
- **Sliding log** is exact: after 5 requests at 900 to 980 ms, nothing more is allowed until those drop out of the last-second window, so only 2,100 and 2,200 pass. Exact, but it stores a timestamp per request.
- **Sliding counter** approximates the log with two numbers. At 1,020 ms, 98% of the previous window still counts (5 × 0.98 = 4.9 < 5), so one request slips through, a small, bounded error.
- **Token bucket** spent its 5 saved tokens on the first burst, refused the second (tokens refill at one per 200 ms), and had refilled by 1,500 ms.
- **Leaky bucket** made the same decisions here, but look at its last line: accepted requests leave the queue at a steady one per 200 ms whatever the arrival pattern. It shapes traffic by delaying it; the token bucket instead passes bursts straight through.

#### A distributed limiter with Redis

```text
key   = "rl:" + api_key + ":" + current_minute      e.g. rl:k42:2026-03-01T10:15
count = INCR key                                    atomic across all API servers
if count == 1: EXPIRE key 60
if count > limit: respond 429 with Retry-After
```

That is a fixed window. A sliding window counter reads the previous minute's key too; a token bucket stores (tokens, last refill time) and updates both in one Lua script so concurrent requests can't race. At very high rates, each server can hold a local token bucket with its share of the global limit and sync occasionally, trading exactness for no network hop.

Connects to: fixed-size sliding windows, rate limiter service, Redis and Memcached, API gateway and service discovery, graceful degradation and backpressure.

### questions
Q: How does a token bucket rate limiter work?
A: A bucket holds up to b tokens and refills at r tokens per second. Each request takes a token; if none is left it is rejected or delayed. It allows bursts of up to b requests while keeping the long-run rate at r, and needs only a token count and the last refill time per client.

Q: What is the weakness of a fixed window counter?
A: Counts reset at window boundaries, so a client can send a full limit's worth at the end of one window and again at the start of the next, up to twice the limit in a short span. Sliding windows or token buckets smooth this out.

Q: What is the difference between a token bucket and a leaky bucket?
A: A token bucket admits requests immediately while tokens remain, so bursts pass through up to the bucket size. A leaky bucket queues requests and releases them at a constant rate, smoothing the output into a steady stream and dropping requests when the queue is full.

Q: How does a sliding window counter approximate a sliding log?
A: It keeps only the current and previous fixed-window counts and estimates the requests in the last full window as the previous count times the fraction of the previous window still inside the sliding window, plus the current count. It is almost as accurate as a log with constant memory per client.

Q: How do you rate limit across many API servers?
A: Keep counters in a shared low-latency store such as Redis and update them atomically, with INCR and EXPIRE or a Lua script for token buckets, or give each server a local share of the limit and synchronize periodically. Return 429 with Retry-After when a client is over its limit.

## sysd.reliability.circuit-breakers-and-bulkheads
name: "Circuit breakers and bulkheads"
importance: important
scope: "Circuit breakers and bulkheads"

### simple
A circuit breaker watches calls to another service and, after repeated failures, stops calling it for a while and fails fast instead, like a household fuse that trips to prevent a fire. After a pause it lets one test call through to see whether the service has recovered. Bulkheads split resources into separate pools so one failing dependency can't use them all up, like the sealed compartments that keep a ship afloat when one floods.

### interview
- **Circuit breaker states**: **closed** (calls pass; failures are counted), **open** (calls fail immediately for a cool-down period), **half-open** (a trial call or a few are allowed; success closes, failure reopens).
- Trip conditions: consecutive failures, or an error rate or slow-call rate over a sliding window with a minimum number of calls.
- Benefits: callers stop waiting on timeouts (threads freed, latency stays low), the struggling service gets breathing room to recover, and a fallback can run (cached data, a default, a degraded feature).
- **Bulkheads**: separate thread pools, connection pools or concurrency limits per dependency (or per tenant), so a slow dependency exhausts only its own pool. Without them, one slow service can take all threads of its caller.
- Combine with timeouts (required), retries with backoff (outside the breaker, and not while open), and fallbacks. Libraries: Resilience4j-style libraries in many languages, and service meshes (Envoy's outlier detection and connection limits).
- Tune carefully: a breaker that trips too easily causes outages of its own; monitor its state changes.

### deep
#### A breaker through an outage

A dependency is down from 2 s to 12 s; the caller calls it every 500 ms. The breaker opens after 3 failures in a row and tries again after 5 seconds:

```cpp
class CircuitBreaker {
public:
    enum State { Closed, Open, HalfOpen };
    State state = Closed;
    bool allow(long now) {
        if (state == Open && now - opened_at >= cool_down) state = HalfOpen;
        return state != Open;         // in half-open, let one trial call through
    }
    void record(bool ok, long now) {
        if (ok) { state = Closed; consecutive_failures = 0; return; }
        if (state == HalfOpen || ++consecutive_failures >= threshold) {
            state = Open;             // a failed trial reopens at once
            opened_at = now;
            consecutive_failures = 0;
        }
    }
private:
    int consecutive_failures = 0;
    long opened_at = 0;
    const int threshold = 3;          // open after 3 failures in a row
    const long cool_down = 5000;      // stay open 5 s, then allow one trial call
};

int main() {
    const char* names[] = {"closed", "open", "half-open"};
    CircuitBreaker breaker;
    auto dependency_up = [](long t) { return t < 2000 || t >= 12000; };   // down 2 s to 12 s
    int reached = 0, fast_failed = 0;
    for (long t = 0; t < 20000; t += 500) {                               // a call every 500 ms
        auto before = breaker.state;
        if (!breaker.allow(t)) { ++fast_failed; continue; }
        if (breaker.state == CircuitBreaker::HalfOpen)
            printf("t=%5ld ms  half-open: one trial call\n", t);
        ++reached;
        bool ok = dependency_up(t);
        breaker.record(ok, t);
        if (breaker.state != before || !ok)
            printf("t=%5ld ms  call %s -> breaker %s\n", t, ok ? "ok" : "failed",
                   names[breaker.state]);
    }
    printf("calls that reached the dependency: %d, failed fast without waiting: %d\n",
           reached, fast_failed);
}
```

Output:

```text
t= 2000 ms  call failed -> breaker closed
t= 2500 ms  call failed -> breaker closed
t= 3000 ms  call failed -> breaker open
t= 8000 ms  half-open: one trial call
t= 8000 ms  call failed -> breaker open
t=13000 ms  half-open: one trial call
t=13000 ms  call ok -> breaker closed
calls that reached the dependency: 22, failed fast without waiting: 18
```

Three failures opened the breaker at 3 s. For the next five seconds, calls failed instantly without touching the dependency. The trial at 8 s found it still down, so the breaker reopened for another five seconds; the trial at 13 s succeeded and closed it. Of 40 calls, 18 were answered immediately with an error (or a fallback) instead of each waiting for a timeout, and the recovering service received 18 fewer requests. With a real 2-second timeout per failing call, those 18 calls would otherwise have held threads for 36 seconds in total.

#### Bulkheads

```text
without bulkheads: one pool of 200 threads
  payments API slows to 10 s per call -> all 200 threads wait on it -> search, profile,
  and checkout all stop, although their own dependencies are healthy

with bulkheads: payments 40 threads | search 60 | profile 50 | other 50
  payments slows -> its 40 threads fill up and further payment calls fail fast
  -> everything else keeps working
```

The same idea applies to connection pools per database, concurrency limits per downstream service, separate queues or worker pools per tenant, and even separate clusters for critical and non-critical traffic.

#### Fallbacks when the breaker is open

- Serve cached or stale data (product details, recommendations).
- Return a sensible default (an empty "you may also like" list).
- Queue the work for later (send the email when the mail service is back).
- Fail clearly and quickly ("payments are temporarily unavailable") rather than spinning.

Connects to: retries, timeouts and exponential backoff with jitter, graceful degradation and backpressure, synchronous vs asynchronous communication, service mesh, state pattern.

### questions
Q: What are the states of a circuit breaker?
A: Closed, where calls pass through and failures are counted; open, where calls fail immediately without reaching the dependency for a cool-down period; and half-open, where a limited number of trial calls test recovery, closing the breaker on success and reopening it on failure.

Q: Why use a circuit breaker when you already have timeouts?
A: Timeouts still make each call wait the full timeout before failing, tying up threads and adding latency, and they keep sending traffic to a struggling service. An open breaker fails instantly, frees resources, enables fallbacks and gives the dependency time to recover.

Q: What is the bulkhead pattern?
A: Partitioning resources such as thread pools, connection pools or concurrency limits per dependency or per tenant, so exhaustion in one partition doesn't spread. A slow dependency then blocks only its own pool while requests to other dependencies keep being served.

Q: What should a service do when a circuit is open?
A: Use a fallback: cached or stale data, a default response, deferring the work to a queue, or a fast, clear error. The goal is to degrade one feature while the rest of the product stays usable.

## sysd.reliability.redundancy-and-failover
name: "Redundancy and failover"
importance: important
scope: "active-active, active-passive"

### simple
Redundancy means having spare copies of every important part so that one failure doesn't take the system down. Failover is switching work to a spare when the main one fails, either by keeping a standby ready (active-passive) or by running several copies that all share the work (active-active). It is like a plane with two engines: losing one is a problem, not a crash.

### interview
- Eliminate **single points of failure**: load balancers, app servers, databases, caches, network paths, availability zones, even the deploy pipeline and DNS.
- **Active-passive**: a standby takes over when the primary fails (database replicas, paired load balancers). Simple, but the standby's capacity sits idle and failover takes seconds to minutes; it must be tested.
- **Active-active**: all copies serve traffic; losing one reduces capacity instead of causing a switch. Better utilization and faster recovery; needs stateless services or data that tolerates multiple writers (or partitioning).
- **Failover mechanics**: detect (heartbeats, health checks), decide (a quorum or consensus to avoid split brain), switch (virtual IP, DNS with low TTL, service discovery update), and **fence** the old primary.
- Capacity planning: **N+1** or **N+2** (survive one or two failures without overload); spread copies across racks and zones so failures are independent.
- Independent failures multiply: two 99.5% copies give about 99.997%; correlated failures (same zone, same bad deploy) don't follow that math.

### deep
#### The numbers behind redundancy

A server fails 4 times a year and takes 11 hours to repair. Compare one server, an active-passive pair with a 30-second failover, and three active nodes where any one can serve:

```cpp
int main() {
    const double hours = 365.25 * 24;
    const double failures_per_year = 4, repair_hours = 11;    // per server
    double down = failures_per_year * repair_hours;            // hours a server is down
    double a = 1 - down / hours;
    printf("one server:                %.3f%% available, %.1f h down per year\n", a * 100, down);

    double both_down = pow(1 - a, 2) * hours;                  // independent failures
    double failover_gap = failures_per_year * 30 / 3600.0;     // 30 s to detect and switch
    double pair_down = both_down + failover_gap;
    printf("active-passive pair:       %.4f%% available, %.0f min down per year\n",
           (1 - pair_down / hours) * 100, pair_down * 60);
    printf("  of which failover gaps:  %.0f min, both down at once: %.0f min\n",
           failover_gap * 60, both_down * 60);

    double three_down = pow(1 - a, 3) * hours;
    printf("three active nodes, 1 needed: %.6f%% available, %.1f s down per year\n",
           (1 - three_down / hours) * 100, three_down * 3600);
}
```

Output:

```text
one server:                99.498% available, 44.0 h down per year
active-passive pair:       99.9971% available, 15 min down per year
  of which failover gaps:  2 min, both down at once: 13 min
three active nodes, 1 needed: 99.999987% available, 4.0 s down per year
```

One server is down about 44 hours a year. A pair cuts that to about 15 minutes, and most of what remains is the rare overlap of both being broken, plus the short gaps while failover happens. Three active nodes reach seconds per year on paper. The catch is the word *independent*: if all three sit in one availability zone, share a power supply, or receive the same bad deploy at once, they fail together and the multiplication doesn't apply. That is why real redundancy spans zones and deploys are rolled out gradually.

#### Active-passive vs active-active

| | active-passive | active-active |
|---|---|---|
| normal operation | primary serves, standby idle or read-only | all nodes serve |
| on failure | detect, promote standby, redirect (seconds to minutes) | remaining nodes absorb the load (immediate) |
| capacity cost | standby is idle | must keep headroom: N+1 |
| data | one writer: simple consistency | multiple writers need partitioning or conflict handling |
| typical use | relational primary with a standby | stateless app servers, multi-region reads |

#### Split brain

If a network problem makes the standby think the primary is dead while it is actually alive, both may accept writes. Prevent it with a quorum-based decision (a majority must agree the primary is gone), fencing (cut the old primary off from storage or revoke its lease; "shoot the other node in the head"), and fencing tokens for anything it might still write.

#### Test it

A failover path that is never exercised usually fails when needed. Practice with game days, scheduled failovers and chaos experiments (terminate instances, cut a zone), and alert on reduced redundancy (a standby that has stopped replicating).

Connects to: replication in practice, consensus basics, distributed locks and leases, disaster recovery, load balancing, functional vs non-functional requirements.

### questions
Q: What is the difference between active-passive and active-active redundancy?
A: In active-passive, a standby waits idle and takes over when the primary fails, which is simple but involves a failover delay and wasted capacity. In active-active, all nodes serve traffic simultaneously, so a failure only reduces capacity, giving faster recovery and better utilization but requiring stateless services or multi-writer data handling.

Q: What is split brain and how is it prevented?
A: Two nodes both believe they are the primary, typically after a network partition, and accept conflicting writes. It is prevented by requiring a quorum to elect a primary, fencing the old primary so it can't write, and using leases or fencing tokens.

Q: Why must redundant components fail independently?
A: The availability gain from redundancy assumes one failure doesn't cause another. Copies in the same rack, zone or power domain, or running the same bad configuration, fail together, so redundancy should span failure domains and changes should roll out gradually.

Q: What does N+1 mean?
A: Provision enough capacity for peak load plus one extra unit, so the system still handles peak traffic after any single component fails. N+2 tolerates a failure during maintenance of another unit.

## sysd.reliability.slas-slos-and-slis
name: "SLAs, SLOs and SLIs"
importance: important
scope: "measuring reliability"

### simple
An SLI is a measurement of how the service is doing, such as the share of requests that succeed quickly. An SLO is the internal target for that measurement, such as 99.9% over 30 days. An SLA is a promise to customers, with a penalty, such as credits, if it is broken. It is like a delivery company that measures on-time rate (SLI), aims for 99% (SLO) and refunds customers below 97% (SLA).

### interview
- **SLI** (indicator): a ratio of good events to total events that users care about: availability (non-5xx responses), latency (requests under 300 ms), freshness, correctness. Measure as close to the user as possible.
- **SLO** (objective): a target for an SLI over a window, such as "99.9% of requests succeed, over 30 days". Set it from user needs, not from current performance.
- **SLA** (agreement): a contractual commitment with consequences; set looser than the SLO so there's room to react before paying.
- **Error budget** = 1 − SLO: at 99.9%, 0.1% of requests may fail (about 43 minutes of full outage in 30 days). While budget remains, ship features; when it's spent, prioritize reliability. This turns reliability into an explicit trade with velocity.
- **Burn-rate alerts**: alert when the budget is consumed much faster than planned (a burn rate of 14.4 uses 2% of a 30-day budget in an hour) rather than on every error spike.
- 100% is the wrong target: it's unachievable, infinitely expensive, and users can't tell 99.99% from 100% through their own networks.

### deep
#### Error budget and burn rate

```cpp
int main() {
    const double slo = 0.999, days = 30, requests_per_day = 10e6;
    double budget_requests = (1 - slo) * requests_per_day * days;
    double budget_minutes = (1 - slo) * days * 24 * 60;
    printf("SLO %.1f%% over %g days: error budget %.0f failed requests, or %.1f min of outage\n",
           slo * 100, days, budget_requests, budget_minutes);

    for (double error_rate : {0.0005, 0.002, 0.015, 0.05}) {
        double burn = error_rate / (1 - slo);                  // 1.0 = exactly on budget
        printf("error rate %5.2f%%: burn rate %5.1f, budget gone in %5.1f days%s\n",
               error_rate * 100, burn, days / burn,
               burn >= 14.4 ? "  -> page now" : burn >= 1 ? "  -> ticket" : "");
    }
}
```

Output:

```text
SLO 99.9% over 30 days: error budget 300000 failed requests, or 43.2 min of outage
error rate  0.05%: burn rate   0.5, budget gone in  60.0 days
error rate  0.20%: burn rate   2.0, budget gone in  15.0 days  -> ticket
error rate  1.50%: burn rate  15.0, budget gone in   2.0 days  -> page now
error rate  5.00%: burn rate  50.0, budget gone in   0.6 days  -> page now
```

At 99.9% over 30 days with 10 million requests a day, the team may "spend" 300,000 failed requests. The burn rate says how fast: 1.0 means the budget would be exactly used up at the end of the window. A 0.2% error rate (burn 2) isn't an emergency but will exhaust the budget in 15 days: open a ticket. At 1.5% (burn 15) the budget is gone in two days: page someone now. Alerting on burn rate over two windows (for example a fast one over 1 hour and a confirming one over 5 minutes) catches real problems fast while ignoring brief blips.

#### Writing good SLIs

| SLI | good event | measured where |
|---|---|---|
| availability | request returned non-5xx | load balancer or client logs |
| latency | request finished in under 300 ms | load balancer |
| freshness (pipelines) | data updated within 10 minutes | a probe checking the newest record |
| correctness | a probe's known query returns the known answer | synthetic checks |

Averages hide pain, so latency SLIs are thresholds on each request ("good if under 300 ms") or percentiles. Measure from the user's side where possible: a server that returns 200 while the load balancer times out looks healthy from inside.

#### SLA vs SLO

An SLA of 99.9% with credits below it should sit on top of an internal SLO of, say, 99.95%, so the team reacts (freezes risky launches, fixes reliability) while still within the customer promise. Dependencies matter too: a service can't promise more than what its critical dependencies deliver multiplied together.

Connects to: functional vs non-functional requirements, observability, redundancy and failover, graceful degradation and backpressure, metrics and monitoring system.

### questions
Q: What is the difference between an SLI, an SLO and an SLA?
A: An SLI is the measured indicator, such as the fraction of successful requests. An SLO is the internal target for it over a period, such as 99.9% over 30 days. An SLA is a contract with customers that specifies consequences, like credits, if a stated level isn't met; it is usually looser than the SLO.

Q: What is an error budget?
A: The amount of unreliability an SLO allows, 1 minus the target: at 99.9%, 0.1% of requests may fail in the window. Teams spend it on releases and experiments; when it runs out, they slow feature work and focus on reliability.

Q: What is a burn rate and why alert on it?
A: The rate at which the error budget is being consumed relative to the rate that would use it up exactly at the end of the window. Alerting on high burn rates over short and long windows pages for fast, significant budget consumption and ignores small blips.

Q: Why not aim for 100% availability?
A: It's impossible in practice, each extra nine costs far more, and users can't perceive the difference beyond a point because their own devices and networks fail more often. An explicit, lower SLO leaves room to ship changes.

## sysd.reliability.disaster-recovery
name: "Disaster recovery"
importance: important
prereqs: [sysd.reliability.redundancy-and-failover]
scope: "backups, RPO and RTO"

### simple
Disaster recovery is the plan for getting a system back after something big goes wrong: a data center outage, a deleted database, ransomware. Two numbers define the plan: how much recent data you can afford to lose (the recovery point objective) and how long you can afford to be down (the recovery time objective). It is like deciding how often to save a document and how quickly you must be able to reopen it after the computer dies.

### interview
- **RPO** (recovery point objective): maximum acceptable data loss, measured in time. Set by backup and replication frequency.
- **RTO** (recovery time objective): maximum acceptable downtime until service is restored. Set by the recovery method and automation.
- **Backups**: full, incremental, and continuous log archiving for **point-in-time recovery** (restore the last full backup, replay logs to just before the incident). Backups protect against *logical* disasters (bad deletes, corruption, ransomware) that replication faithfully copies.
- **3-2-1 rule**: 3 copies, on 2 kinds of media, 1 off-site (plus one immutable or offline copy against ransomware).
- **Strategies**, cheapest to fastest: backup and restore (hours), pilot light (core data replicated, servers started on demand), warm standby (a scaled-down copy running), multi-site active-active (near-zero RTO and RPO, highest cost).
- **Test restores**: an untested backup is a hope, not a plan. Measure the real RTO in drills.

### deep
#### RPO and RTO for one database

A 2 TB database takes nightly full backups at 02:00; a disaster strikes at 17:30.

```cpp
int main() {
    // A disaster at 17:30. Nightly full backups run at 02:00.
    const double incident = 17.5, nightly = 2.0;
    printf("RPO with nightly backups only:        %.1f hours of data lost\n", incident - nightly);
    printf("RPO with log archiving every 5 min:   up to 5 minutes\n");
    printf("RPO with a synchronous standby:       0 (committed data survives)\n");

    const double data_gb = 2000, restore_mb_s = 500;          // restore throughput
    double restore_min = data_gb * 1000 / restore_mb_s / 60;
    double replay_min = 15.5 * 60 * 0.05;                       // replay logs at 20x real time
    printf("RTO restoring 2 TB at 500 MB/s:       %.0f min + %.0f min log replay\n",
           restore_min, replay_min);
    printf("RTO promoting a warm standby:         a few minutes\n");
}
```

Output:

```text
RPO with nightly backups only:        15.5 hours of data lost
RPO with log archiving every 5 min:   up to 5 minutes
RPO with a synchronous standby:       0 (committed data survives)
RTO restoring 2 TB at 500 MB/s:       67 min + 46 min log replay
RTO promoting a warm standby:         a few minutes
```

Nightly backups alone lose the whole day's data. Archiving the write-ahead log every few minutes shrinks the loss to minutes, and a synchronous standby to nothing. RTO is dominated by moving and replaying data: restoring 2 TB and replaying a day's logs takes about two hours, while promoting a standby that's already running takes minutes. Every step down the table costs more money, so choose per system: the payments database might need a synchronous standby in another region, while an analytics warehouse can be rebuilt from raw data in a day.

#### Strategies

| strategy | RPO | RTO | cost |
|---|---|---|---|
| backup and restore | hours (or minutes with log archiving) | hours | low |
| pilot light (data replicated, servers off) | minutes | tens of minutes | moderate |
| warm standby (small copy running) | seconds to minutes | minutes | higher |
| multi-site active-active | near zero | near zero | highest |

#### What a DR plan contains

- Which systems matter most, with an RPO and RTO for each.
- Where backups live (another region and account, immutable), how long they're kept, and encryption keys stored separately.
- A written, rehearsed runbook: who decides to fail over, the steps, and how to fail back.
- Regular restore tests that measure the real RTO, and alerts when backups fail or replication falls behind.

Replication is not a backup: a `DROP TABLE` replicates to every replica within seconds. Point-in-time recovery from backups, or delayed replicas, cover mistakes that replication copies.

Connects to: redundancy and failover, replication in practice, recovery (the DBMS view), write-ahead logging, object storage and blobs, SLAs, SLOs and SLIs.

### questions
Q: What are RPO and RTO?
A: The recovery point objective is the maximum acceptable amount of data loss, expressed as time, such as 5 minutes of writes. The recovery time objective is the maximum acceptable time to restore service after a disaster, such as 1 hour.

Q: Why isn't replication enough to protect data?
A: Replication copies every change, including mistakes: an accidental delete, corruption from a bug or a ransomware encryption reaches the replicas within seconds. Backups with point-in-time recovery, kept separately and immutably, let you go back to before the damage.

Q: What is point-in-time recovery?
A: Restoring the latest full backup and then replaying the archived transaction log up to a chosen moment, such as just before a bad deployment. With frequent log archiving it limits data loss to minutes.

Q: Name disaster recovery strategies from cheapest to most resilient.
A: Backup and restore, with hours of RTO; pilot light, keeping data replicated and infrastructure ready to start; warm standby, running a scaled-down copy that can scale up; and multi-site active-active, serving from several sites at once with near-zero RTO and RPO at the highest cost.

## sysd.reliability.graceful-degradation-and-backpressure
name: "Graceful degradation and backpressure"
importance: important
prereqs: [sysd.reliability.circuit-breakers-and-bulkheads]
scope: "Graceful degradation and backpressure"

### simple
Graceful degradation means that when part of a system is struggling, the product keeps working in a reduced form instead of failing completely, like a shop that turns off fancy recommendations but still takes orders. Backpressure means a busy component tells the ones sending it work to slow down, rather than accepting work it can't finish. Together they keep an overloaded system useful instead of letting it collapse.

### interview
- **Degrade by priority**: identify critical paths (checkout, login) and optional features (recommendations, reviews, live counts); under stress, turn optional ones off with feature flags or serve them from cache.
- **Load shedding**: when over capacity, reject some requests early and cheaply (503 or 429 with Retry-After) rather than accepting everything and timing out everything. Shed low-priority traffic first.
- **Backpressure**: bounded queues and buffers; when full, block or slow the producer, or reject. Unbounded queues turn overload into ever-growing latency and memory until something crashes.
- Mechanisms: bounded thread pools and queues, concurrency limits (adaptive ones measure latency to find the limit), TCP flow control, reactive streams' demand signals, Kafka consumers pulling at their own pace.
- **Time budgets**: drop requests whose deadline has already passed instead of doing useless work.
- Serve stale data, reduce quality (lower video bitrate, smaller result pages), or queue non-urgent writes.

### deep
#### Why unbounded queues are a trap

A service can process 100 requests per second; for a minute, 120 arrive per second:

```cpp
int main() {
    const int seconds = 60, arrivals = 120, capacity = 100;   // 20% overloaded
    for (int limit : {-1, 100}) {                              // -1: unbounded queue
        long queue = 0, rejected = 0, served = 0;
        double worst_wait = 0;
        for (int t = 0; t < seconds; ++t) {
            for (int i = 0; i < arrivals; ++i) {
                if (limit >= 0 && queue >= limit) { ++rejected; continue; }   // shed: 503
                ++queue;
            }
            worst_wait = max(worst_wait, queue / (double)capacity);        // seconds to drain
            long n = min<long>(queue, capacity);
            queue -= n;
            served += n;
        }
        printf("%-15s served %ld, rejected %ld, queue at the end %ld, worst wait %.1f s\n",
               limit < 0 ? "unbounded queue" : "bounded (100)", served, rejected, queue,
               worst_wait);
    }
}
```

Output:

```text
unbounded queue served 6000, rejected 0, queue at the end 1200, worst wait 13.0 s
bounded (100)   served 6000, rejected 1200, queue at the end 0, worst wait 1.0 s
```

Both served the same 6,000 requests: overload means someone won't be served, whatever you do. The unbounded queue hides that: latency climbs to 13 seconds, so nearly every user waits (and most clients have long since timed out, so much of the work is wasted), and 1,200 requests still sit in memory when the minute ends. The bounded queue rejected 1,200 requests immediately, which the callers can retry later or show a friendly message for, and kept the wait for everyone else to at most a second. Rejecting quickly is the kindest thing an overloaded service can do.

#### A degradation plan for a shop

| pressure level | action |
|---|---|
| normal | everything on |
| recommendations slow | serve cached recommendations, then hide the widget |
| database under strain | stop live stock counts on listing pages, cache product pages longer |
| severe overload | shed anonymous browsing first, keep carts and checkout |
| payment provider down | take orders as "pending payment" and email a payment link later |

Decide these in advance, wire them to feature flags, and practice switching them.

#### Backpressure along a pipeline

In a chain producer → queue → consumer → database, pressure must flow backwards: when the database slows, consumers slow; their bounded work queues fill; the producer is told to wait or gets rejections, or a queue broker buffers durably on disk. Each hop needs a limit, or the pressure piles up in the one place without one, usually as memory until the process dies.

Connects to: latency vs throughput trade-offs, circuit breakers and bulkheads, rate limiting algorithms, message queues, TCP flow control, autoscaling.

### questions
Q: What is graceful degradation?
A: Keeping the core of a product working when parts of the system fail or are overloaded, by disabling or simplifying non-essential features, serving cached or stale data, or deferring work, instead of failing entirely.

Q: What is backpressure?
A: A signal from a component that it is at capacity, propagated back to whoever sends it work, so producers slow down, wait or get rejections instead of piling up unbounded work. Bounded queues, flow control and consumers pulling at their own pace are common mechanisms.

Q: Why are unbounded queues dangerous under overload?
A: When arrivals exceed capacity, the queue grows without limit, so latency grows for everyone and memory eventually runs out. Most queued requests are served after their clients gave up, wasting work. Bounded queues with rejection keep latency bounded for accepted requests.

Q: What is load shedding and how do you do it well?
A: Deliberately rejecting some requests when over capacity to protect the rest. Do it early in the request path, before expensive work, return a clear retryable error, prefer shedding low-priority traffic, and drop requests whose deadlines have already passed.
