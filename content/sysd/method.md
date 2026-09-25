---
topic: sysd.method
name: "System design method"
subject: sysd
order: 1
prereqs: []
---

## sysd.method.the-interview-framework
name: "The interview framework"
importance: must
scope: "requirements, estimates, API, data model, high-level design, deep dives, bottlenecks"

### simple
A system design interview is an open question such as "design a chat app", with no single right answer. A framework is a checklist that keeps you on track: agree on what the system must do, estimate how big it is, sketch its API and data, draw the main boxes, then go deep on the hardest part. It is like planning a trip: destination and budget first, then the route, then the details.

### interview
- Seven steps, with a rough budget for 45 minutes: **requirements** (5 min), **estimates** (3 to 5), **API** (5), **data model** (5), **high-level design** (10), **deep dives** (10 to 15), **bottlenecks and wrap-up** (5).
- You drive. Ask clarifying questions, write assumptions down where the interviewer can see them, and confirm scope before designing ("I'll leave out search unless you want it").
- **Start simple, then scale**: one server and one database that work, then add caches, replicas, queues and shards only where the numbers or requirements demand them.
- **Deep dives** go to what makes this problem hard: ID generation for a URL shortener, fan-out for a feed, ordering and delivery for chat. Let the interviewer steer which one.
- End with bottlenecks, failure modes (what if this box dies?), monitoring, and what you would do next with more time.
- Interviewers grade structure, trade-off reasoning, communication and depth, not a memorized architecture.

### deep
#### Why a framework

Open questions punish two habits: diving into details before knowing what matters, and drawing a famous architecture without justifying any box. A fixed sequence of steps fixes both, and it gives the interviewer natural places to redirect you.

#### The steps on a small example

Suppose the prompt is "design a shared shopping list app".

**1. Requirements.** Functional: create lists, add and check off items, share a list with family, see changes on every device. Non-functional: 5 million daily users, changes appear on other devices within a few seconds, lists are never lost, the app keeps working briefly offline. Out of scope: payments, recommendations.

**2. Estimates.** 5 million users × 20 edits a day = 100 million writes a day, about 1,200 per second on average and 3,600 at peak (3× average). Reads are maybe 5× that. Storage: 5 million users × 10 lists × 30 items × 100 bytes = 150 GB, which one database could hold, but the write rate and growth suggest planning for sharding by list.

**3. API.**

```text
POST  /v1/lists                         create a list
POST  /v1/lists/{listId}/items          add an item
PATCH /v1/lists/{listId}/items/{itemId} rename or check an item
GET   /v1/lists/{listId}?since=v42      changes after version 42
```

**4. Data model.** `lists(id, owner_id, name, version)`, `items(list_id, item_id, text, checked, updated_at)`, `list_members(list_id, user_id)`. Everything for one list shares the key `list_id`, so one shard serves a whole list.

**5. High-level design.**

```text
phones --> load balancer --> API servers (stateless) --> database, sharded by list_id
   ^                               |
   |                               v
   +---- WebSocket servers <-- change events (queue)
```

**6. Deep dives.** Two phones check the same item at once: store a version per item and let the last write win, which is fine for a shopping list. Offline edits: queue them on the phone and replay with their versions. Live updates: after a write, publish an event; the WebSocket server holding each family member's connection pushes it.

**7. Bottlenecks.** Connection servers (millions of open sockets) scale horizontally; the database scales by sharding on `list_id`; losing a WebSocket server only delays updates, because clients reconnect and fetch `?since=`.

#### Time budget

| step | minutes | what you produce |
|---|---|---|
| requirements | 5 | two lists: features, and scale and quality targets |
| estimates | 3 to 5 | QPS, storage, bandwidth, read to write ratio |
| API | 5 | the main endpoints or RPCs |
| data model | 5 | tables or documents, and the key that partitions them |
| high-level design | 10 | boxes and arrows that satisfy the functional requirements |
| deep dives | 10 to 15 | one or two hard parts, with trade-offs |
| wrap-up | 5 | bottlenecks, failures, monitoring, next steps |

#### Common mistakes

- Drawing Kafka, Redis and ten microservices in minute three, with no numbers to justify them.
- Staying silent while thinking; say the options out loud.
- Skipping estimates, then choosing storage that is off by a factor of 1,000.
- Answering every question with "it depends" and never deciding.

Connects to: functional vs non-functional requirements, back-of-the-envelope estimation, API design, discussing trade-offs, and every classic design problem.

### questions
Q: What are the main steps of a system design interview?
A: Clarify functional and non-functional requirements, estimate scale, define the API, design the data model, draw a high-level design, deep dive into the hardest components, and finish with bottlenecks, failure handling and monitoring. Spend roughly the first quarter of the time before drawing any boxes.

Q: Why start with a simple design instead of a fully scaled one?
A: A simple design that works shows you understand the core flow, and each scaling component you add then has a stated reason, such as a read rate one database can't serve. Starting with every technology at once hides reasoning and invites questions you can't justify.

Q: How do you choose what to deep dive into?
A: Pick the component that makes this problem different from a generic CRUD app, such as ID generation for a URL shortener or fan-out for a news feed, and follow the interviewer's hints. Go deep on data flow, failure cases and trade-offs there rather than skimming everything.

Q: What should the wrap-up cover?
A: The likely bottlenecks and how you'd scale past them, what happens when each major component fails, how you'd monitor the system (key metrics and alerts), and what you would build next with more time.

## sysd.method.functional-vs-non-functional-requirements
name: "Functional vs non-functional requirements"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "scale, latency, availability, consistency"

### simple
Functional requirements say what the system does: users can post a photo, follow friends, see a feed. Non-functional requirements say how well it must do it: how many users, how fast, how rarely it may be down, how fresh the data must be. A car's features are functional; its top speed, fuel use and safety rating are non-functional, and they shape the design far more.

### interview
- **Functional**: features and flows, written as "users can ...". Agree on the core three to five and park the rest.
- **Non-functional**: **scale** (users, requests per second, data size, growth), **latency** (p50 and p99 targets), **availability** (the "nines"), **consistency** (can users see stale data, and for how long?), **durability** (can we ever lose data?), plus security, privacy and cost.
- The nines per year: 99.9% allows about 8.8 hours of downtime, 99.99% about 53 minutes, 99.999% about 5 minutes.
- **Availability multiplies in series**: three required 99.9% services give about 99.7%. Redundancy helps: two independent 99% copies give 99.99%.
- Use **percentiles**, not averages, for latency: p99 is the time 99% of requests beat; tails matter because one page makes many calls.
- Non-functional requirements often conflict (strong consistency vs availability and latency); state which one wins for each feature.

### deep
#### Turning vague goals into numbers

"Fast and always up" can't guide a design. Ask instead:

| question | example answer | what it changes |
|---|---|---|
| How many daily users, and how many actions each? | 10 million, 20 reads and 1 write | request rates, server count |
| Read or write heavy? | 20 : 1 | caching, replicas |
| Latency target? | p99 under 200 ms for reads | caches, data placement |
| Availability target? | 99.95% | redundancy, failover |
| May users see stale data? | feed: seconds are fine; balance: never | consistency model per feature |
| Can data ever be lost? | posts: no; view counts: approximate is fine | replication, write path |

Different features of the same product get different answers, which is the point: the balance screen of a wallet app and its "recent activity" feed can live on very different storage.

#### Availability math

```cpp
int main() {
    const double minutes_per_year = 365.25 * 24 * 60;
    vector<pair<string, double>> targets = {
        {"99%", 0.99}, {"99.9%", 0.999}, {"99.99%", 0.9999}, {"99.999%", 0.99999}};
    printf("%-9s %14s %15s\n", "target", "down per year", "down per month");
    for (auto [label, a] : targets) {
        double per_year = (1 - a) * minutes_per_year;
        printf("%-9s %10.1f min %11.1f min\n", label.c_str(), per_year, per_year / 12);
    }
    double series = pow(0.999, 3);           // a request needs all three services
    double redundant = 1 - pow(1 - 0.99, 2); // either of two independent copies will do
    printf("three 99.9%% services in series: %.2f%%\n", series * 100);
    printf("two redundant 99%% copies:       %.2f%%\n", redundant * 100);
}
```

Output:

```text
target     down per year  down per month
99%           5259.6 min       438.3 min
99.9%          526.0 min        43.8 min
99.99%          52.6 min         4.4 min
99.999%          5.3 min         0.4 min
three 99.9% services in series: 99.70%
two redundant 99% copies:       99.99%
```

Each extra nine cuts allowed downtime tenfold, and costs far more than tenfold in engineering: 5 minutes a year leaves no time for a human to even notice an outage, so failover must be automatic. Series composition explains why a request path through many services is fragile, and the redundancy line shows why replicas are the standard fix, as long as their failures are really independent (not in the same rack, region or deploy).

#### Latency percentiles

If a page calls 20 backend services in parallel and must wait for all of them, it is slow whenever any one call is slow. With each call beating its p99 99% of the time, all 20 are fast only $0.99^{20} \approx 82\%$ of the time, so almost one page in five sees at least one p99-level delay. That is why targets are set on p99 or p999, not on the average.

#### Consistency and durability as requirements

State them per feature: "a user must see their own post immediately (read-your-writes), friends may see it a few seconds later (eventual)"; "a confirmed payment must survive a data center loss (synchronous replication across zones)". These sentences decide storage and replication choices later.

Connects to: the interview framework, back-of-the-envelope estimation, SLAs, SLOs and SLIs, latency vs throughput trade-offs, consistency models, redundancy and failover.

### questions
Q: What is the difference between functional and non-functional requirements?
A: Functional requirements describe features, what users can do, such as posting or following. Non-functional requirements describe qualities: scale, latency, availability, consistency, durability, security and cost. Non-functional requirements usually drive the architecture.

Q: How much downtime does 99.99% availability allow?
A: About 53 minutes a year, or about 4.4 minutes a month. Each additional nine reduces the allowed downtime tenfold, so 99.999% allows about 5 minutes a year.

Q: What is the availability of a request that needs three services, each 99.9% available?
A: About 99.7%, because the availabilities multiply when all must work: 0.999 cubed is about 0.997. Adding more required services lowers it further, which is why redundancy and graceful degradation matter.

Q: Why specify latency as p99 rather than an average?
A: Averages hide the slow tail that real users hit, and a page that makes many backend calls waits for the slowest one, so tail latencies dominate what users feel. A p99 target says 99% of requests must be faster than the limit.

## sysd.method.back-of-the-envelope-estimation
name: "Back-of-the-envelope estimation"
importance: must
prereqs: [sysd.method.functional-vs-non-functional-requirements]
scope: "QPS, storage, bandwidth, powers of two"

### simple
Back-of-the-envelope estimation means working out rough numbers, such as requests per second or terabytes per year, from a few simple assumptions. You only need the right order of magnitude: whether it is thousands or millions decides whether one server or a thousand are needed. It is like estimating the groceries for a party: guests times portions, rounded generously.

### interview
- **QPS** = daily active users × actions per user per day ÷ 86,400 seconds (about $10^5$). **Peak** ≈ 2 to 3 × average (more for spiky events).
- **Storage** = items per day × size per item × retention days × replication factor (usually 3).
- **Bandwidth** = QPS × response size; convert bytes to bits (× 8) for network links.
- **Servers** = peak QPS ÷ what one server handles, plus headroom (run at about 50 to 70% utilization).
- Handy facts: 1 million per day ≈ 12 per second; $2^{10} \approx 10^3$, $2^{20} \approx 10^6$, $2^{30} \approx 10^9$; a char is 1 byte in ASCII, a 64-bit id is 8 bytes, a small photo is a few hundred KB.
- Latency orders of magnitude: memory ~100 ns, SSD random read ~100 µs, same-datacenter round trip ~0.5 ms, disk seek ~10 ms, cross-continent round trip ~100 to 150 ms.
- Round aggressively, state assumptions out loud, and sanity-check the result ("40 TB a year fits on a handful of machines").

### deep
#### Worked example

A social app: 20 million daily active users; each creates 2 posts a day and reads 100; a post is 1 KB of text and metadata, and 1 post in 10 carries a 200 KB photo. Keep 5 years, replicate 3 times. (Decimal units: 1 KB = 1,000 bytes, which is close enough for estimates.)

```cpp
int main() {
    const double dau = 20e6, posts_per_user = 2, reads_per_user = 100;
    const double post_bytes = 1e3, photo_bytes = 200e3, photo_share = 0.1;
    const double day = 86400, peak_factor = 3, replicas = 3, years = 5;

    double write_qps = dau * posts_per_user / day;
    double read_qps = dau * reads_per_user / day;
    printf("writes: %.0f/s average, %.0f/s peak\n", write_qps, write_qps * peak_factor);
    printf("reads:  %.0f/s average, %.0f/s peak\n", read_qps, read_qps * peak_factor);

    double posts_per_day = dau * posts_per_user;
    double text_tb = posts_per_day * post_bytes * 365 * years * replicas / 1e12;
    double photo_tb = posts_per_day * photo_share * photo_bytes * 365 * years / 1e12;
    printf("text: %.0f TB over %g years with %g copies\n", text_tb, years, replicas);
    printf("photos: %.0f TB over %g years (before copies)\n", photo_tb, years);

    double out_bytes = read_qps * (post_bytes + photo_share * photo_bytes);
    printf("egress: %.0f MB/s = %.1f Gbit/s average\n", out_bytes / 1e6, out_bytes * 8 / 1e9);
    double per_server = 5000;   // reads one API server can handle
    printf("API servers for peak reads: %.0f (+ headroom)\n",
           ceil(read_qps * peak_factor / per_server));
}
```

Output:

```text
writes: 463/s average, 1389/s peak
reads:  23148/s average, 69444/s peak
text: 219 TB over 5 years with 3 copies
photos: 1460 TB over 5 years (before copies)
egress: 486 MB/s = 3.9 Gbit/s average
API servers for peak reads: 14 (+ headroom)
```

What the numbers tell you:

- **Read heavy** (50 : 1): caching and read replicas pay off; the write path can stay simple.
- **1,400 writes per second at peak** is within reach of a single well-tuned relational primary, but growth and the 219 TB of text argue for sharding by user or post id.
- **Photos dominate storage** (1.46 PB before copies): they belong in object storage with a CDN in front, not in the database.
- **3.9 Gbit/s** average egress, mostly photos, is exactly what a CDN offloads.

#### The formulas

$$\text{QPS} = \frac{\text{DAU} \times \text{actions per user per day}}{86{,}400}$$

$$\text{storage} = \text{items per day} \times \text{bytes per item} \times \text{days kept} \times \text{replicas}$$

#### Powers of two and ten

| power | exact | about | name |
|---|---|---|---|
| $2^{10}$ | 1,024 | a thousand | KB |
| $2^{20}$ | 1,048,576 | a million | MB |
| $2^{30}$ | 1,073,741,824 | a billion | GB |
| $2^{40}$ | about $1.1 \times 10^{12}$ | a trillion | TB |

A 32-bit integer holds about 4.3 billion values, so ids for more than that need 64 bits. A day has 86,400 seconds; a year has about $3.15 \times 10^7$.

#### Habits that keep estimates useful

- Say each assumption and let the interviewer adjust it.
- Round to one significant figure while calculating; precision is fake here.
- Estimate only what drives a decision: if storage is obviously small, say so and move on.
- Sanity-check against known scales: a single machine does thousands to tens of thousands of simple requests per second and holds a few terabytes on local SSDs.

Connects to: functional vs non-functional requirements, Fermi estimation, latency vs throughput trade-offs, object storage and blobs, sharding strategies.

### questions
Q: How do you estimate queries per second from daily active users?
A: Multiply daily active users by the actions each performs per day and divide by 86,400 seconds, about 10 to the 5. For example 10 million users making 10 requests a day is 100 million a day, about 1,200 per second on average; multiply by 2 or 3 for the peak.

Q: How do you estimate storage for a system?
A: Items created per day times bytes per item gives daily growth; multiply by the retention period and the replication factor. Separate small metadata from large media, because media usually dominates and belongs in object storage.

Q: Why convert to bits when estimating bandwidth?
A: Network links and interfaces are rated in bits per second, while data sizes are in bytes, so multiply bytes per second by 8 to compare with link capacity, for example 500 MB/s is 4 Gbit/s.

Q: What rough latencies should you know?
A: Main memory about 100 nanoseconds, an SSD random read about 100 microseconds, a round trip inside a data center about half a millisecond, a disk seek about 10 milliseconds, and a cross-continent round trip about 100 to 150 milliseconds. They show why caches, locality and avoiding cross-region calls matter.

Q: How many servers do you need for 70,000 requests per second?
A: Divide peak load by one server's capacity and add headroom. If one server handles 5,000 requests per second, 14 servers carry the peak at full load; plan for about 20 to 25 so each runs at 50 to 70% and one can fail without overload.

## sysd.method.api-design
name: "API design"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "REST endpoints, pagination, versioning, idempotency keys"

### simple
An API is the menu a service offers to its callers: which requests exist, what to send, and what comes back. A good API is predictable, names things by what they are, lets clients page through long lists, and can evolve without breaking old apps. It also makes it safe to retry a request, because networks drop answers all the time.

### interview
- **REST**: resources as nouns, HTTP methods as verbs: `GET /v1/orders/{id}`, `POST /v1/orders`, `PATCH /v1/orders/{id}`, `DELETE ...`. Nest only for real ownership (`/users/{id}/orders`).
- **Status codes**: 200 OK, 201 Created, 204 No Content, 400 bad input, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict, 422 validation, 429 rate limited, 500 server bug, 503 overloaded or down.
- **Pagination**: offset (`?page=3`) is simple but slow and unstable on deep pages; **cursor** (`?cursor=<opaque>&limit=20`, the cursor encoding the last seen sort key) is fast at any depth and stable under inserts.
- **Versioning**: `/v1/` in the path or a header; make additive changes (new optional fields) without a new version, and never change the meaning of an existing field.
- **Idempotency**: GET, PUT and DELETE are idempotent by definition; for POST, clients send an **`Idempotency-Key`** header, and the server stores the first response per key and replays it on retries, so a retried payment isn't charged twice.
- Also: consistent error bodies, rate-limit headers, filtering and sorting parameters, authentication (tokens), and returning only needed fields.

### deep
#### Endpoints for an orders service

```text
GET    /v1/orders?status=open&limit=20&cursor=...   list, newest first
POST   /v1/orders                                   create (with Idempotency-Key)
GET    /v1/orders/{orderId}                         read one
PATCH  /v1/orders/{orderId}                         change some fields
POST   /v1/orders/{orderId}/cancel                  an action that isn't plain CRUD
```

Actions that don't map to create, read, update or delete become sub-resources or verbs under the resource (`/cancel`), instead of overloading `PATCH` with a magic status.

#### Cursor pagination

A response returns items and an opaque cursor for the next page:

```text
GET /v1/orders?limit=2
-> {"items": [{"id": 125}, {"id": 124}], "next_cursor": "eyJpZCI6MTIzfQ=="}

GET /v1/orders?limit=2&cursor=eyJpZCI6MTIzfQ==
```

The cursor here is just base64 of `{"id":123}`: the server decodes it and runs `WHERE id <= 123 ORDER BY id DESC LIMIT 2`, an index seek however deep the page. Making it opaque lets you change what's inside later (a timestamp plus id, a shard number) without breaking clients.

#### Idempotency keys

Networks lose responses. If a client sends "charge 500" and the reply times out, it can't know whether the charge happened. Retrying blindly could charge twice; not retrying could lose the order. The fix: the client generates a unique key per logical operation and sends it with every attempt.

```cpp
struct Response { int status; string body; };

class PaymentsApi {
    unordered_map<string, Response> first_response;  // idempotency key -> response
    int next_id = 1, charged = 0;
public:
    Response create_payment(const string& key, int amount) {
        if (auto it = first_response.find(key); it != first_response.end())
            return it->second;                            // a retry: replay, don't redo
        charged += amount;
        Response r{201, "payment " + to_string(next_id++) + " for " + to_string(amount)};
        first_response.emplace(key, r);
        return r;
    }
    int total_charged() const { return charged; }
};

int main() {
    PaymentsApi api;
    for (auto [key, amount] : vector<pair<string, int>>{
             {"k-7f3a", 500},     // the reply to this one is lost on the network
             {"k-7f3a", 500},     // so the client retries with the same key
             {"k-91bc", 500}}) {  // a genuinely new payment gets a new key
        Response r = api.create_payment(key, amount);
        printf("%s -> %d %s\n", key.c_str(), r.status, r.body.c_str());
    }
    printf("total charged: %d\n", api.total_charged());
}
```

Output:

```text
k-7f3a -> 201 payment 1 for 500
k-7f3a -> 201 payment 1 for 500
k-91bc -> 201 payment 2 for 500
total charged: 1000
```

The retry got the same answer and charged nothing. In production, three details matter: store the key and the charge **in the same database transaction** (or a crash between them breaks the guarantee); make concurrent requests with the same key wait or get 409 while the first is in flight; and reject a reused key with a different body (422). Keys typically expire after a day or so.

#### Evolving an API

Adding an optional field or a new endpoint is backward compatible; removing or renaming a field, changing its type or meaning, or making an optional input required is not. Breaking changes get a new version (`/v2/`), and the old one is kept until clients migrate. Mobile apps make this critical: old versions stay installed for years.

Connects to: HTTP basics, REST vs gRPC vs GraphQL, idempotency and exactly-once myths, DISTINCT, LIMIT and OFFSET (keyset pagination), rate limiting algorithms.

### questions
Q: What is the difference between offset and cursor pagination?
A: Offset pagination skips N rows each time, so deep pages get slower and rows shift when data changes. Cursor pagination returns an opaque token encoding the last item's sort key, and the next request continues after it with an index seek, so it stays fast and stable, at the cost of no random page jumps.

Q: What is an idempotency key and why is it needed?
A: A unique value the client sends with a non-idempotent request such as POST, reused on every retry of the same logical operation. The server records the key with the first result and returns that result for repeats, so a retry after a lost response can't create a duplicate order or charge.

Q: Which HTTP methods are idempotent?
A: GET, HEAD, PUT, DELETE and OPTIONS: repeating them has the same effect as doing them once. POST is not, and PATCH isn't guaranteed to be, which is why they need idempotency keys for safe retries.

Q: How do you version an API without breaking clients?
A: Make additive, backward-compatible changes within a version, such as new optional fields and new endpoints. For breaking changes, publish a new version in the path or a header, run both, and retire the old one after clients migrate.

Q: What status code should a rate-limited request get?
A: 429 Too Many Requests, ideally with a Retry-After header or rate-limit headers saying when the client may try again. 503 is for the service being overloaded or unavailable in general.

## sysd.method.discussing-trade-offs
name: "Discussing trade-offs"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "there is no single right answer"

### simple
Every design choice gains something and gives something up: a cache makes reads fast but can serve old data, and a second copy of the database adds safety but also cost and complexity. Interviewers want to hear you weigh these, pick one for a reason, and say what would change your mind. It is like choosing between a fast, expensive flight and a slow, cheap train: neither is wrong, it depends on what matters most.

### interview
- A good trade-off statement: **options**, **criteria** (latency, consistency, cost, complexity, operability, time to build), **decision** tied to this system's requirements, **mitigation** for the downside, and **what would change the decision**.
- Classic pairs: consistency vs availability, latency vs consistency, read cost vs write cost (fan-out on write or read), normalization vs denormalization, SQL vs NoSQL, sync vs async, build vs buy, simplicity vs flexibility.
- Tie choices to numbers from your estimates and requirements, not to fashion ("Kafka because big companies use it").
- Different features can make different choices: strong consistency for payments, eventual for likes.
- Avoid both extremes: never deciding ("it depends") and never acknowledging costs.

### deep
#### A template to say out loud

> "For the feed we could build each timeline when it's read, or precompute it when someone posts. Reading is 100 times more common than posting and we need p99 under 200 ms, so I'll precompute on write. The cost is heavy writes for accounts with millions of followers, so for those I'll switch to merging their posts at read time. If most users followed thousands of accounts and rarely read, I'd reverse this."

Four moves: the options, the deciding criterion taken from the requirements, the choice with its known weakness and a mitigation, and the condition that would flip it.

#### Common trade-offs and what decides them

| choice | option A wins when | option B wins when |
|---|---|---|
| strong vs eventual consistency | money, inventory, uniqueness, anything users act on immediately | counters, feeds, analytics, when availability and latency matter more |
| fan-out on write vs read | reads far outnumber writes, most users have few followers | huge follower counts, or users rarely read |
| SQL vs NoSQL | relations, transactions, ad hoc queries | simple key access at huge scale, flexible documents, write-heavy |
| sync vs async | the caller needs the answer now | work can finish later; absorbing bursts and failures matters |
| cache vs no cache | read heavy, tolerates slight staleness | data changes constantly or must be exact |
| normalize vs denormalize | writes and correctness dominate | reads dominate and joins are too slow |
| monolith vs microservices | small team, early product | many teams needing independent deploys and scaling |

#### Signals of a strong answer

- Numbers appear in the reasoning ("50,000 reads per second is too many for one primary").
- The downside is named before the interviewer asks.
- The design stays as simple as the requirements allow.
- When the interviewer changes a requirement, you revise the design instead of defending the old one.

Connects to: the interview framework, CAP theorem in practice, PACELC, choosing SQL vs NoSQL in design, news feed, monolith vs microservices.

### questions
Q: How should you present a design trade-off in an interview?
A: Name the options, the criteria that matter for this system, your choice and why the requirements favor it, how you'll mitigate its downside, and what would make you choose differently. This shows judgment instead of a memorized answer.

Q: Why is "it depends" a weak answer on its own?
A: It avoids the decision the interviewer wants to see you make. Say what it depends on, pick an option for the stated requirements, and explain the conditions under which the other option would win.

Q: Can different parts of one system make opposite choices?
A: Yes, and they usually should. A shopping site can keep inventory and payments strongly consistent while product reviews and view counts are eventually consistent and heavily cached, because each feature has different correctness and latency needs.
