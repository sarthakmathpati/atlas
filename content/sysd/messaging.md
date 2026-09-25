---
topic: sysd.messaging
name: "Communication and messaging"
subject: sysd
order: 6
prereqs: [sysd.scalability]
---

## sysd.messaging.synchronous-vs-asynchronous-communication
name: "Synchronous vs asynchronous communication"
importance: must
scope: "Synchronous vs asynchronous communication"

### simple
In synchronous communication, a service calls another and waits for the answer before continuing, like a phone call. In asynchronous communication, it leaves a message and carries on, and the work happens later, like sending a text. Waiting is simple but ties both sides together; leaving messages keeps things running even when the other side is slow or down.

### interview
- **Synchronous** (HTTP, gRPC request-response): simple to reason about, immediate result and errors. But latencies add up along a chain, availability multiplies (four 99.9% services in a row give about 99.6%), and a slow dependency ties up the caller's threads (cascading failure).
- **Asynchronous** (message queues, events): the caller hands off work and returns; the receiver processes it when it can. Absorbs bursts, survives downstream outages (messages wait in the queue), decouples teams and deploys. Costs: eventual consistency, harder debugging and tracing, duplicate and out-of-order messages, a broker to run.
- Rule of thumb: synchronous when the caller **needs the answer now** to respond to the user (checking a password, reading a price); asynchronous for **work that can happen after the response** (sending email, generating thumbnails, updating search, analytics).
- A common shape: a synchronous API that validates and records the request, then publishes an event; the user sees "order received" and background consumers do the rest.
- Asynchronous request-response exists too: return 202 Accepted with a job id, and let the client poll or get a callback or push.

### deep
#### What an outage does to each style

An order service must notify a shipping service. Orders arrive at 10 per second for two minutes; shipping is down from second 30 to second 90. Synchronous calls fail during the outage; asynchronous messages wait in a queue that shipping drains at 25 per second once it is back.

```cpp
int main() {
    const int arrive_until = 120, rate = 10, drain = 25;
    auto shipping_up = [](int t) { return t < 30 || t >= 90; };

    int sync_ok = 0, sync_failed = 0;
    for (int t = 0; t < arrive_until; ++t) (shipping_up(t) ? sync_ok : sync_failed) += rate;

    int queued = 0, processed = 0, max_depth = 0, caught_up_at = -1;
    for (int t = 0; t < 200; ++t) {
        if (t < arrive_until) queued += rate;           // the order service never waits
        if (shipping_up(t)) {
            int n = min(queued, drain);
            queued -= n;
            processed += n;
        }
        max_depth = max(max_depth, queued);
        if (t >= 90 && queued == 0 && caught_up_at < 0) caught_up_at = t;
    }
    printf("synchronous:  %d orders ok, %d failed while shipping was down\n", sync_ok,
           sync_failed);
    printf("asynchronous: %d processed, 0 failed, backlog peaked at %d, cleared at t=%ds\n",
           processed, max_depth, caught_up_at);
    printf("four synchronous 99.9%% services in a chain: %.2f%% available\n",
           pow(0.999, 4) * 100);
}
```

Output:

```text
synchronous:  600 orders ok, 600 failed while shipping was down
asynchronous: 1200 processed, 0 failed, backlog peaked at 600, cleared at t=125s
four synchronous 99.9% services in a chain: 99.60% available
```

With synchronous calls, half the orders failed: every request during the 60-second outage got an error (or hung until a timeout, tying up the order service's threads). With a queue, the order service never noticed. The backlog grew to 600 messages, and once shipping returned it drained at 15 per second net (25 processed minus 10 arriving), clearing about 35 seconds after the outage. Shipping ran late, but nothing was lost, which is the typical asynchronous trade: latency for resilience.

#### Choosing per interaction

| interaction | style | why |
|---|---|---|
| log in, check a password | synchronous | the user waits for the answer |
| show a product with its price | synchronous (cached) | needed to render the page |
| send the order confirmation email | asynchronous | can happen seconds later |
| resize uploaded photos | asynchronous | slow; retry on failure |
| update search index, analytics | asynchronous (events) | many consumers, eventual is fine |
| charge a card at checkout | synchronous call to the payment provider, with an idempotency key | the user needs the result, and retries must be safe |

#### Making synchronous calls safer

Set a timeout on every call (shorter than the caller's own deadline), retry only idempotent operations with backoff, cap concurrency per dependency (bulkheads), open a circuit breaker when a dependency keeps failing, and degrade gracefully (show cached or partial data). And keep chains short: each extra hop multiplies the ways a request can fail.

Connects to: message queues, publish-subscribe and event-driven architecture, retries, timeouts and exponential backoff with jitter, circuit breakers and bulkheads, REST vs gRPC vs GraphQL.

### questions
Q: When should services communicate synchronously?
A: When the caller needs the result to continue or to answer the user right away, such as authentication, reading a price, or checking availability before confirming. Keep such chains short and protected with timeouts, retries and circuit breakers.

Q: What are the benefits of asynchronous communication?
A: The producer isn't blocked by the consumer's speed or availability: messages buffer bursts, survive consumer outages and can be retried, and services can be deployed and scaled independently. The price is eventual consistency, duplicates, ordering concerns and harder debugging.

Q: Why does a long chain of synchronous calls hurt availability and latency?
A: Every call must succeed, so availabilities multiply: four 99.9% services in series give about 99.6%. Latencies add up, and a slow service ties up threads in every caller above it, which can cascade into an outage.

Q: How can an API accept work that takes minutes?
A: Validate and record the request, enqueue the work, and respond with 202 Accepted and a job id. The client then polls a status endpoint, receives a webhook, or gets a push notification when the job finishes.

## sysd.messaging.message-queues
name: "Message queues"
importance: must
prereqs: [sysd.messaging.synchronous-vs-asynchronous-communication]
scope: "decoupling, buffering, retries (Kafka, RabbitMQ)"

### simple
A message queue sits between services like a mailbox: producers drop messages in, and consumers take them out and process them at their own pace. If a burst of work arrives, it waits in the queue instead of overwhelming the consumers, and if a consumer crashes, the message is delivered again. It is like the order rail in a busy kitchen, where tickets pile up during the rush and the cooks work through them.

### interview
- **Decoupling** (producers don't know consumers or their availability), **buffering** (absorb bursts, smooth load), **retries** (unacknowledged messages come back), **scaling** (add consumers to drain faster).
- **Acknowledgments**: a consumer acks after processing; if it crashes first, the message is redelivered (after a visibility timeout in SQS-style queues). That makes delivery **at-least-once**, so consumers must be idempotent.
- **RabbitMQ**-style brokers: exchanges route messages to queues; each message goes to one consumer of a queue and is deleted after ack; per-message routing, priorities, TTLs, dead-lettering. Good for task distribution.
- **Kafka**-style logs: topics split into **partitions**, each an append-only ordered log retained for days; consumers track **offsets** and can replay; a **consumer group** shares partitions (one consumer per partition), and different groups each read everything. Order is guaranteed within a partition only; choose the message key (such as order id) so related messages share a partition. Very high throughput.
- Watch **consumer lag** (backlog): if it keeps growing, consumers are too slow; scale them (up to the partition count in Kafka) or shed load.
- Queues bound work but not forever: set retention and maximum sizes, and move repeatedly failing messages to a dead-letter queue.

### deep
#### Absorbing a burst

Producers send 200 messages per second, with a 10-second burst of 1,000 per second. Each worker processes 60 per second.

```cpp
int main() {
    // producers: 200 msg/s, with a 10-second burst of 1,000 msg/s at t = 10..19
    for (int workers : {5, 10}) {
        const int capacity = workers * 60;            // each worker handles 60 msg/s
        long backlog = 0, peak = 0;
        int cleared_at = -1;
        for (int t = 0; t < 120; ++t) {
            backlog += (t >= 10 && t < 20) ? 1000 : 200;
            backlog -= min<long>(backlog, capacity);
            peak = max(peak, backlog);
            if (t >= 20 && backlog == 0 && cleared_at < 0) cleared_at = t;
        }
        printf("%2d workers (%3d msg/s): backlog peaked at %ld, cleared at t=%ds\n", workers,
               capacity, peak, cleared_at);
    }
}
```

Output:

```text
 5 workers (300 msg/s): backlog peaked at 7000, cleared at t=89s
10 workers (600 msg/s): backlog peaked at 4000, cleared at t=29s
```

With 5 workers, the burst adds 700 messages per second to the backlog for 10 seconds (7,000), and the spare capacity after the burst is only 100 per second, so it takes 70 seconds to catch up. Nothing is lost, and the producers never slowed down; the cost is that a message arriving at the peak waits over 20 seconds. Doubling the workers (autoscaling on backlog) keeps the peak at 4,000 and clears it within 10 seconds of the burst ending. The queue turned a spike that would have overloaded a synchronous service into a delay.

#### Kafka and RabbitMQ in one picture

```text
RabbitMQ:  producer -> exchange --routing key--> queue A -> consumer 1, consumer 2 (compete)
                                             \-> queue B -> consumer 3
           a message is deleted from a queue once a consumer acks it

Kafka:     producer --key--> topic "orders": partition 0 [m0 m1 m2 m3 ...]
                                             partition 1 [m0 m1 m2 ...]
           consumer group "billing":  c1 reads p0, c2 reads p1   (offsets: p0=3, p1=2)
           consumer group "search":   c3 reads p0 and p1          (its own offsets)
           messages stay for the retention period; groups can rewind and replay
```

| | RabbitMQ (broker queues) | Kafka (partitioned log) |
|---|---|---|
| model | messages routed to queues, removed on ack | append-only log, retained, consumers keep offsets |
| ordering | per queue, weakened by redelivery and competing consumers | per partition |
| replay | no (once acked, gone) | yes, by resetting offsets |
| throughput | high | very high (sequential disk I/O, batching) |
| fits | task queues, complex routing, per-message features | event streams, many independent consumers, analytics pipelines |

#### Delivery guarantees

- **At-most-once**: ack before processing; a crash loses the message.
- **At-least-once**: ack after processing; a crash causes redelivery, so duplicates happen. The usual choice.
- **Exactly-once**: not achievable end to end by the queue alone; approximate it with at-least-once delivery plus idempotent processing (or Kafka transactions when both input and output are Kafka topics).

Connects to: producer-consumer in code, synchronous vs asynchronous communication, publish-subscribe and event-driven architecture, idempotency and exactly-once myths, dead-letter queues and poison messages, distributed message queue.

### questions
Q: What problems does a message queue solve?
A: It decouples producers from consumers in time and availability, buffers bursts so consumers process at a sustainable rate, enables retries through redelivery of unacknowledged messages, and lets you scale consumers independently. It turns load spikes and downstream outages into delays instead of failures.

Q: What is the difference between Kafka and a traditional message broker like RabbitMQ?
A: RabbitMQ routes messages to queues and deletes each message once a consumer acknowledges it, which suits task distribution with flexible routing. Kafka stores messages in partitioned, append-only logs retained for a period; consumers track their own offsets, can replay, and many consumer groups can read the same data independently with ordering per partition.

Q: How does Kafka keep messages in order?
A: Only within a partition: messages with the same key go to the same partition and are read in order by the single consumer in each group that owns it. To keep all events of one order in sequence, use the order id as the key.

Q: What is consumer lag and why monitor it?
A: The number of messages produced but not yet processed, or how far a consumer's offset trails the end of the log. Steadily growing lag means consumers can't keep up and messages are waiting longer, so it is the main signal to scale consumers or investigate slow processing.

## sysd.messaging.publish-subscribe-and-event-driven-architecture
name: "Publish-subscribe and event-driven architecture"
importance: must
prereqs: [sysd.messaging.message-queues]
scope: "Publish-subscribe and event-driven architecture"

### simple
In publish-subscribe, a service announces that something happened, such as "order placed", without knowing who is interested; every service that subscribed to that kind of event gets its own copy. It is like a news channel: the broadcaster doesn't know the viewers, and new viewers can tune in any time. An event-driven architecture builds a whole system out of services reacting to such events.

### interview
- **Queue** (point-to-point): each message goes to **one** consumer. **Pub-sub**: each event goes to **every** subscriber (each subscription or consumer group gets a copy).
- Publishers don't know subscribers, so adding a new reaction (loyalty points, fraud checks) needs no change to the publisher: loose coupling and extensibility.
- Event styles: **event notification** (small "order 17 placed", subscribers fetch details), **event-carried state transfer** (the event carries the data, so subscribers need no call back), and **event sourcing** (the log of events is the source of truth; state is rebuilt by replaying).
- Choreography: services react to each other's events with no central coordinator; easy to extend, harder to see the whole flow (use tracing and documented event catalogs).
- Hard parts: **schema evolution** (version events, add fields compatibly, use a schema registry), **duplicates and ordering** (idempotent handlers, keys for per-entity order), **eventual consistency**, and debugging chains of reactions.
- Implementations: Kafka topics with consumer groups, SNS fan-out to SQS queues, Google Pub/Sub, Redis pub/sub (fire and forget, no persistence).

### deep
#### Fan-out with an in-process bus

```cpp
class EventBus {
    map<string, vector<function<void(const string&)>>> subscribers;   // topic -> handlers
public:
    void subscribe(const string& topic, function<void(const string&)> handler) {
        subscribers[topic].push_back(move(handler));
    }
    void publish(const string& topic, const string& event) {
        for (auto& handler : subscribers[topic]) handler(event);   // fan-out to everyone
    }
};

auto handler(string service, string action) {
    return [=](const string& event) {
        printf("%-10s %s %s\n", service.c_str(), action.c_str(), event.c_str());
    };
}

int main() {
    EventBus bus;
    bus.subscribe("order.placed", handler("email", "send a receipt for"));
    bus.subscribe("order.placed", handler("inventory", "reserve the items of"));
    bus.subscribe("order.placed", handler("analytics", "count"));
    bus.publish("order.placed", "order 17");
    // a new team adds loyalty points without touching the order service
    bus.subscribe("order.placed", handler("loyalty", "add points for"));
    bus.publish("order.placed", "order 18");
}
```

Output:

```text
email      send a receipt for order 17
inventory  reserve the items of order 17
analytics  count order 17
email      send a receipt for order 18
inventory  reserve the items of order 18
analytics  count order 18
loyalty    add points for order 18
```

The order service publishes one event and never names email, inventory or analytics. When the loyalty team subscribes, order 18 reaches them with no change to the publisher. Across services the bus is a broker (a Kafka topic with one consumer group per subscribing service, or a topic fanning out to one queue per subscriber), which adds durability: a subscriber that is down receives its events when it returns.

#### Designing events

```text
event: order.placed (version 2)
{
  "event_id": "e-8c1f",            unique, for deduplication
  "occurred_at": "2026-03-01T10:15:00Z",
  "order_id": 17,                  also the partition key: per-order ordering
  "customer_id": 42,
  "total": 1250,
  "items": [{"sku": "mug", "qty": 2}]
}
```

- Name events in the past tense: they are facts, not commands.
- Include an id for deduplication and a key for ordering.
- Evolve compatibly: add optional fields; never rename or repurpose. Breaking changes get a new event version, with both published during migration.
- Carry enough state that most subscribers don't need to call back (which would couple them to the publisher's availability).

#### When not to use events

A request that needs an immediate answer, a flow that must be strictly transactional across steps (use a single service, or a saga with explicit orchestration), or a system small enough that a direct function call is clearer. Event-driven designs trade simplicity of each service for complexity of the whole flow.

Connects to: observer pattern, message queues, distributed transactions in practice (outbox), idempotency and exactly-once myths, notification system, news feed.

### questions
Q: What is the difference between a message queue and publish-subscribe?
A: In a queue, each message is processed by one consumer among competitors, which suits distributing tasks. In publish-subscribe, each event is delivered to every subscriber, so several independent services can react to the same event.

Q: What are the benefits of an event-driven architecture?
A: Loose coupling, since publishers don't know subscribers; easy extension, since new features subscribe without changing existing services; resilience, since events wait for slow or down subscribers; and a natural audit trail of what happened.

Q: What is event sourcing?
A: Storing the sequence of events that changed an entity as the source of truth, instead of only its current state. Current state is derived by replaying events, which gives a full history and lets you build new views, at the cost of more complex queries, schema evolution and replay performance.

Q: How do you evolve event schemas without breaking consumers?
A: Make backward-compatible changes such as adding optional fields, never remove or change the meaning of existing fields, version events explicitly, and use a schema registry to validate compatibility. For a breaking change, publish a new event version alongside the old one until consumers migrate.

## sysd.messaging.rest-vs-grpc-vs-graphql
name: "REST vs gRPC vs GraphQL"
importance: important
scope: "REST vs gRPC vs GraphQL"

### simple
REST, gRPC and GraphQL are three styles for services to talk over a network. REST uses web addresses for resources and plain HTTP methods, usually with JSON. gRPC calls functions on another machine using a compact binary format, and GraphQL lets the client ask for exactly the fields it wants in one query.

### interview
- **REST**: resources and HTTP verbs, usually JSON; simple, cacheable with HTTP caches and CDNs, universally supported (browsers, curl), human-readable. Can over-fetch or under-fetch (several round trips for one screen).
- **gRPC**: RPC over HTTP/2 with **Protocol Buffers**; a `.proto` contract generates typed clients and servers; compact binary encoding, multiplexed connections, deadlines, and **streaming** (client, server, bidirectional). Great between internal services; needs a proxy (gRPC-Web) in browsers and isn't human-readable.
- **GraphQL**: one endpoint and a typed schema; the client specifies the fields and nested relations it wants, so one request fetches exactly one screen's data. Good for varied clients (mobile, web) over many backends. Costs: HTTP caching is harder (mostly POST to one URL), expensive queries must be limited (depth, cost), and naive resolvers cause **N+1** backend calls (fixed by batching with a data loader).
- Typical split: REST or GraphQL at the public edge, gRPC between internal services.
- All three need versioning or compatible evolution: REST by paths or headers, protobuf by field numbers (never reuse one), GraphQL by adding fields and deprecating old ones.

### deep
#### Why binary encodings are compact

Protocol Buffers write each field as a tag (field number and wire type) followed by its value, with integers as **varints**: 7 bits per byte, and the top bit says "more bytes follow".

```cpp
void put_varint(vector<uint8_t>& out, uint64_t v) {   // 7 bits per byte, low bits first
    while (v >= 0x80) { out.push_back(uint8_t(v) | 0x80); v >>= 7; }
    out.push_back(uint8_t(v));
}

int main() {
    // message User { int32 id = 1; string name = 2; }  with id = 150, name = "asha"
    vector<uint8_t> pb;
    pb.push_back((1 << 3) | 0);          // field 1, wire type 0 (varint)
    put_varint(pb, 150);
    pb.push_back((2 << 3) | 2);          // field 2, wire type 2 (length-delimited)
    string name = "asha";
    put_varint(pb, name.size());
    pb.insert(pb.end(), name.begin(), name.end());

    string json = R"({"id":150,"name":"asha"})";
    printf("protobuf: ");
    for (uint8_t b : pb) printf("%02x ", b);
    printf("(%zu bytes)\njson:     %s (%zu bytes)\n", pb.size(), json.c_str(), json.size());
}
```

Output:

```text
protobuf: 08 96 01 12 04 61 73 68 61 (9 bytes)
json:     {"id":150,"name":"asha"} (24 bytes)
```

`08` is field 1 with wire type 0; `96 01` is 150 as a varint (the low 7 bits `0010110` with the continuation bit set give `0x96`, then the remaining `1`); `12` is field 2, length-delimited; `04` is the length; then the four bytes of "asha". The field names never travel: both sides know them from the `.proto` file, which is why the message is less than half the JSON size and faster to parse. The price is that you need the schema to read it.

#### The same screen three ways

A mobile screen shows a user, their 3 latest orders, and each order's item count.

| | requests | payload |
|---|---|---|
| REST | `GET /users/42`, then `GET /users/42/orders?limit=3` (or a custom endpoint) | whatever each endpoint returns, often more than needed |
| GraphQL | one `POST /graphql` with `{ user(id: 42) { name orders(last: 3) { id itemCount } } }` | exactly the requested fields |
| gRPC | one `GetUserSummary` call defined for this purpose, or two calls | compact protobuf |

#### Choosing

| situation | good fit |
|---|---|
| public API for third parties, cacheable resources | REST |
| internal service-to-service calls, low latency, streaming | gRPC |
| many client types needing different shapes of the same data | GraphQL (often in front of REST or gRPC services) |
| browser clients only, simple CRUD | REST |

Connects to: API design, HTTP basics, synchronous vs asynchronous communication, API gateway and service discovery.

### questions
Q: What are the main differences between REST and gRPC?
A: REST exposes resources over HTTP with standard verbs, usually with JSON, and is simple, cacheable and universally supported. gRPC calls typed remote procedures defined in protobuf over HTTP/2, with compact binary messages, generated clients, deadlines and streaming, which makes it efficient between services but harder to use directly from browsers.

Q: What problem does GraphQL solve?
A: Over-fetching and under-fetching: with fixed REST endpoints, clients often get more fields than needed or must make several round trips for one screen. GraphQL lets the client request exactly the fields and nested relations it needs in a single query against a typed schema.

Q: What is the N+1 problem in GraphQL and how is it fixed?
A: Resolving a list of N items and then a field of each item separately triggers one query for the list plus N queries for the field. Batching loaders collect the ids requested within one execution step and fetch them in a single query, with caching for repeats.

Q: Why is protobuf smaller than JSON?
A: It sends field numbers instead of field names, encodes integers as variable-length varints, and uses binary lengths instead of quotes and delimiters. Both sides rely on the shared schema to interpret the bytes.

## sysd.messaging.idempotency-and-exactly-once-myths
name: "Idempotency and exactly-once myths"
importance: must
prereqs: [sysd.messaging.message-queues, sysd.messaging.retries-timeouts-and-exponential-backoff-with-jitter]
scope: "at-least-once delivery, idempotent consumers"

### simple
Networks and servers fail in ways that make it impossible to know whether a message was processed, so systems resend messages to be safe, and some get processed twice. "Exactly once" delivery isn't really possible; what you can build is processing whose effect is the same whether a message arrives once or three times. That property is called idempotency, like pressing a lift button again, which doesn't call a second lift.

### interview
- **Delivery semantics**: at-most-once (may lose), at-least-once (may duplicate), exactly-once (neither). A sender that gets no acknowledgment can't tell "lost" from "processed, ack lost", so it must choose to resend (duplicates) or not (loss).
- **Exactly-once processing** = at-least-once delivery + **idempotent** or **deduplicated** processing.
- Ways to be idempotent: naturally idempotent operations (`SET status = 'shipped'`, upsert by key, delete by id); **dedup table** of processed message ids written **in the same transaction** as the effect; **conditional writes** (only if version = N); **idempotency keys** on APIs.
- Non-idempotent operations to watch: increments, appends, sending emails or charges, "create" without a unique key.
- Kafka's "exactly-once semantics" covers read-process-write **within Kafka** (idempotent producers plus transactions); side effects outside Kafka (emails, other databases) still need idempotency.
- Dedup windows: keep processed ids long enough to cover the maximum redelivery delay, then expire them.

### deep
#### Duplicates in practice

A consumer adds deposits to a balance. It applied message m2, then crashed before acknowledging it, so the broker delivered m2 again:

```cpp
struct Message { string id; int amount; };

int main() {
    // The broker delivers at least once: the consumer crashed after applying m2 but
    // before acknowledging it, so m2 comes again.
    vector<Message> deliveries = {{"m1", 100}, {"m2", 100}, {"m2", 100}, {"m3", 100}};

    int naive_balance = 0;
    for (auto& m : deliveries) naive_balance += m.amount;

    int balance = 0;
    unordered_set<string> processed;         // stored in the same transaction as balance
    for (auto& m : deliveries) {
        if (!processed.insert(m.id).second) {  // seen before: acknowledge and skip
            printf("duplicate %s skipped\n", m.id.c_str());
            continue;
        }
        balance += m.amount;
    }
    printf("naive consumer balance:      %d\n", naive_balance);
    printf("idempotent consumer balance: %d\n", balance);
}
```

Output:

```text
duplicate m2 skipped
naive consumer balance:      400
idempotent consumer balance: 300
```

The naive consumer credited m2 twice. The idempotent one records each processed id and skips repeats. The crucial detail is **atomicity**: the processed id and the balance change must commit together (one database transaction), otherwise a crash between them either loses the credit or forgets that it happened:

```sql
START TRANSACTION;
INSERT INTO processed_messages (message_id) VALUES ('m2');   -- fails on a duplicate key
UPDATE accounts SET balance = balance + 100 WHERE id = 42;
COMMIT;
```

If the insert hits the primary key (the message was already processed), roll back and acknowledge the message.

#### Why exactly-once delivery is impossible

The sender sends a message and waits. If no acknowledgment arrives, either the message was lost, or it was processed and the ack was lost, or everything is just slow. These cases look identical from the sender's side (the two generals problem), so no protocol can guarantee both "never lost" and "never duplicated" over an unreliable network. Systems choose at-least-once and push deduplication to the receiver, where the effect is visible.

#### Making operations idempotent

| operation | idempotent version |
|---|---|
| `balance = balance + 100` | record the message id with the change; skip seen ids |
| `INSERT` a new order | `INSERT ... ON DUPLICATE KEY UPDATE` keyed by a client-generated order id |
| "set status to shipped" | already idempotent; make it conditional: only from "packed" |
| send an email | store "email sent for event e" before or with sending; check first |
| charge a card | pass an idempotency key to the payment provider |

Connects to: API design (idempotency keys), message queues, distributed transactions in practice (outbox), retries, timeouts and exponential backoff with jitter, payment system.

### questions
Q: Why is exactly-once delivery considered a myth?
A: When an acknowledgment doesn't arrive, the sender can't tell whether the message was lost or processed with the ack lost, so it must either resend and risk a duplicate or not resend and risk a loss. Real systems deliver at least once and make processing idempotent, which gives exactly-once effects.

Q: What is an idempotent consumer?
A: A consumer whose processing has the same effect however many times a message is delivered. It either performs naturally idempotent operations, such as setting a value or upserting by key, or records processed message ids and skips duplicates, storing the id in the same transaction as the effect.

Q: Why must the deduplication record and the effect be written atomically?
A: If the effect commits but the record doesn't, a redelivery repeats the effect; if the record commits but the effect doesn't, the message is skipped and its effect is lost. Writing both in one transaction makes them succeed or fail together.

Q: What does Kafka's exactly-once semantics actually cover?
A: Reading from Kafka topics, processing, and writing results and consumer offsets back to Kafka atomically, using idempotent producers and transactions. Any side effect outside Kafka, such as a database write or an email, is not covered and still needs its own idempotency.

## sysd.messaging.retries-timeouts-and-exponential-backoff-with-jitter
name: "Retries, timeouts and exponential backoff with jitter"
importance: must
scope: "Retries, timeouts and exponential backoff with jitter"

### simple
Calls between services sometimes fail or hang for a moment, so clients wait only a limited time (a timeout) and then try again (a retry). To avoid hammering a struggling service, each retry waits longer than the last (exponential backoff), and a random amount is added (jitter) so thousands of clients don't all retry at the same instant. It is like redialing a busy phone line after longer and longer pauses.

### interview
- **Timeouts** on every remote call: without one, a hung dependency holds your threads and connections forever. Set them from the dependency's latency (for example a bit above its p99), and within the caller's overall deadline; propagate deadlines downstream.
- **Retry only** transient errors (timeouts, 503, connection resets) and only **idempotent** operations (or with an idempotency key). Don't retry 400-class errors.
- **Exponential backoff**: wait base × 2^attempt, capped (100 ms, 200 ms, 400 ms, ... up to a few seconds), with a maximum number of attempts.
- **Jitter** spreads retries: **full jitter** waits random(0, backoff); **equal jitter** waits backoff/2 + random(0, backoff/2); **decorrelated jitter** bases each wait on the previous one. Without jitter, clients that failed together retry together, recreating the spike.
- **Retry amplification**: if 3 layers each try 3 times, one user request can become 27 calls at the bottom. Retry at one layer (usually the edge or the caller nearest the failure), and use **retry budgets** (retries at most 10% of traffic) and **circuit breakers**.
- Honor `Retry-After` headers and 429 responses.

### deep
#### Synchronized retries vs jitter

A brief outage makes 1,000 clients fail at the same moment. Each retries 4 times with exponential backoff (base 100 ms), and each retry fails again while the service recovers:

```cpp
uint64_t s = 5;
double uniform01() {                          // SplitMix64 -> [0, 1)
    uint64_t z = (s += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return (z ^ (z >> 31)) / 18446744073709551616.0;
}

int main() {
    const int clients = 1000, retries = 4;
    const double base_ms = 100, cap_ms = 10000;
    for (string mode : {"no jitter", "full jitter", "equal jitter"}) {
        s = 5;
        map<int, int> per_slot;                   // 10 ms slot -> retries arriving then
        double last = 0;
        for (int c = 0; c < clients; ++c) {
            double t = 0;                         // everyone failed at t = 0
            for (int k = 0; k < retries; ++k) {
                double backoff = min(cap_ms, base_ms * pow(2, k));
                if (mode == "full jitter") backoff = uniform01() * backoff;
                if (mode == "equal jitter") backoff = backoff / 2 + uniform01() * backoff / 2;
                t += backoff;
                ++per_slot[(int)(t / 10)];
            }
            last = max(last, t);
        }
        int peak = 0;
        for (auto [slot, n] : per_slot) peak = max(peak, n);
        printf("%-13s peak %4d retries in one 10 ms slot, last retry at %4.0f ms\n",
               mode.c_str(), peak, last);
    }
    printf("3 layers x 3 attempts each: up to %d calls reach the bottom service\n", 3 * 3 * 3);
}
```

Output:

```text
no jitter     peak 1000 retries in one 10 ms slot, last retry at 1500 ms
full jitter   peak  186 retries in one 10 ms slot, last retry at 1378 ms
equal jitter  peak  224 retries in one 10 ms slot, last retry at 1439 ms
3 layers x 3 attempts each: up to 27 calls reach the bottom service
```

Without jitter, every client retries at exactly 100, 300, 700 and 1,500 ms: four walls of 1,000 simultaneous requests hitting a service that is trying to recover, which can keep it down indefinitely. Full jitter spreads the same retries over time, cutting the worst instant by more than a factor of 5 while finishing just as fast. Equal jitter keeps a guaranteed minimum wait at the cost of slightly more clumping. The last line is the other trap: retries at every layer multiply.

#### A retry policy that behaves well

```cpp
// sketch: a well-behaved retry loop for an idempotent call
for (int attempt = 0; attempt < max_attempts; ++attempt) {
    auto result = call(timeout = min(per_try_timeout, deadline - now()));
    if (result.ok() || !result.retryable()) return result;       // 4xx: don't retry
    if (!retry_budget.try_spend()) return result;                // limit retries globally
    double backoff = min(cap, base * pow(2, attempt));
    sleep(result.retry_after().value_or(random_between(0, backoff)));   // full jitter
}
```

#### Timeouts, concretely

A service calls a dependency whose p99 is 80 ms. A 100 ms timeout with 2 retries costs at most about 300 ms plus backoff, which must fit inside the caller's own deadline (say 500 ms for the whole request). A 30-second default timeout, by contrast, lets one slow dependency hold hundreds of threads for half a minute each, turning its slowness into your outage. Hedged requests (send a second copy after the p95 time, take the first answer) are an alternative for latency-critical idempotent reads.

Connects to: TCP congestion control, circuit breakers and bulkheads, idempotency and exactly-once myths, cache stampede and hot keys, graceful degradation and backpressure.

### questions
Q: Why add jitter to exponential backoff?
A: Clients that failed at the same moment would otherwise retry at the same moments too, creating synchronized spikes that can keep an overloaded service down. Randomizing each wait spreads retries out over time, smoothing the load while keeping the overall backoff.

Q: Which requests are safe to retry?
A: Idempotent requests, such as GET, PUT and DELETE, or non-idempotent ones carrying an idempotency key, and only after transient failures such as timeouts, connection errors, 503 or 429. Client errors like 400 or 404 won't succeed on retry.

Q: What is retry amplification and how do you prevent it?
A: When several layers of a call chain each retry, attempts multiply: three layers with three attempts each can send 27 requests to the bottom service for one user request. Retry at a single layer, cap retries with budgets, use circuit breakers, and propagate deadlines so lower layers stop when the caller has given up.

Q: How should you choose a timeout?
A: From the dependency's observed latency, typically a little above its p99, and small enough that retries still fit inside the caller's overall deadline. Every remote call needs one, because a missing or huge timeout lets a slow dependency exhaust your threads and connections.

## sysd.messaging.dead-letter-queues-and-poison-messages
name: "Dead-letter queues and poison messages"
importance: important
prereqs: [sysd.messaging.message-queues]
scope: "Dead-letter queues and poison messages"

### simple
A poison message is one that makes its consumer fail every time, for example because its data is malformed. If the queue keeps redelivering it, it can block the messages behind it or burn resources forever. A dead-letter queue is a side queue where such messages are parked after a few failed attempts, so the rest of the work flows and someone can inspect them later.

### interview
- **Poison message**: fails processing deterministically (bad format, a bug triggered by its content, a reference to missing data). Retrying doesn't help.
- **Dead-letter queue (DLQ)**: after N failed attempts (a max receive count or retry count), move the message there, with the error and attempt metadata. Main processing continues.
- In **ordered** queues or Kafka partitions, one poison message blocks everything behind it (head-of-line blocking) until it is skipped or dead-lettered.
- Separate **transient** failures (timeouts, a dependency down: retry with backoff, perhaps via a delayed retry queue) from **permanent** ones (validation errors: dead-letter at once).
- Operate the DLQ: alert when it grows, inspect messages, fix the bug or data, then **redrive** them to the main queue. An unwatched DLQ is silent data loss.
- Set the retry limit with idempotency in mind: every retry reprocesses the message.

### deep
#### One bad message in an ordered queue

Message 2 contains an amount that can't be parsed. Without a dead-letter queue, the consumer retries it forever and messages 3 and 4 never run. With one, it is parked after 3 attempts:

```cpp
struct Msg { int id; string body; int attempts = 0; };

bool process(const Msg& m) { return m.body.find("amount=abc") == string::npos; }  // poison?

int main() {
    for (bool use_dlq : {false, true}) {
        deque<Msg> queue = {{1, "amount=10"}, {2, "amount=abc"}, {3, "amount=7"},
                            {4, "amount=5"}};
        vector<int> done, dead;
        int deliveries = 0;
        while (!queue.empty() && deliveries < 12) {       // ordered queue, head first
            Msg& m = queue.front();
            ++deliveries;
            if (process(m)) { done.push_back(m.id); queue.pop_front(); continue; }
            if (use_dlq && ++m.attempts == 3) { dead.push_back(m.id); queue.pop_front(); }
        }
        printf("%-12s processed:", use_dlq ? "with DLQ" : "without DLQ");
        for (int id : done) printf(" %d", id);
        printf("  dead-lettered:");
        for (int id : dead) printf(" %d", id);
        printf("  still stuck: %zu after %d deliveries\n", queue.size(), deliveries);
    }
}
```

Output:

```text
without DLQ  processed: 1  dead-lettered:  still stuck: 3 after 12 deliveries
with DLQ     processed: 1 3 4  dead-lettered: 2  still stuck: 0 after 6 deliveries
```

Without the DLQ, 11 of 12 deliveries were wasted on the same message and the queue made no progress: in production, that is a consumer at full CPU and a growing backlog behind it. With the DLQ, three attempts establish that the message is poison, it moves aside with its error, and messages 3 and 4 complete.

#### A retry and dead-letter pipeline

```text
main queue --> consumer --ok--> done
                 | transient failure (timeout, 503)
                 +--> retry queue (delay 1 min, then 10 min) --> back to main queue
                 | permanent failure, or retries exhausted
                 +--> dead-letter queue --> alert --> fix --> redrive to main queue
```

Delayed retry queues keep the main queue moving while a dependency recovers; the DLQ collects what needs a human. Store the error message, stack trace, attempt count and original timestamps with each dead-lettered message so it can be diagnosed without reproducing the failure.

#### Pitfalls

- Dead-lettering on the first transient error (a brief database blip) floods the DLQ; retry transient errors first.
- Redriving before fixing the cause sends everything straight back to the DLQ.
- Ordering: after a message is dead-lettered, later messages for the same entity may be processed before it is fixed. If per-entity order matters, park the entity's later messages too, or make handlers tolerate gaps.

Connects to: message queues, retries, timeouts and exponential backoff with jitter, idempotency and exactly-once myths, observability.

### questions
Q: What is a poison message?
A: A message that fails processing every time it is delivered, for example because of malformed data or content that triggers a bug. Redelivery can't fix it, so without special handling it loops forever, wasting resources and blocking messages behind it in ordered queues.

Q: What is a dead-letter queue?
A: A separate queue where messages go after exceeding a maximum number of processing attempts or failing permanently. It keeps the main flow moving and preserves the failed messages, with their errors, for inspection, fixing and later reprocessing.

Q: How should transient and permanent failures be handled differently?
A: Transient failures such as timeouts or an unavailable dependency should be retried with backoff, often through delayed retry queues. Permanent failures such as validation errors will never succeed, so they should go to the dead-letter queue immediately with the error recorded.

Q: What should happen to messages in a dead-letter queue?
A: They should trigger alerts, be inspected to find the cause, and after the bug or data is fixed be redriven back to the main queue for processing, which requires idempotent consumers. A DLQ nobody watches is silent data loss.

## sysd.messaging.real-time-delivery
name: "Real-time delivery"
importance: important
scope: "polling, long polling, server-sent events, WebSockets"

### simple
Real-time delivery gets new data to a user's screen the moment it exists, like a chat message or a live score. The simplest way is to ask the server every few seconds whether anything is new (polling), which is wasteful and slow. Better ways keep a connection open so the server can push updates immediately: long polling, server-sent events, or WebSockets.

### interview
- **Short polling**: the client asks every N seconds. Simple and works everywhere, but wastes requests when nothing changed and adds up to N seconds of delay.
- **Long polling**: the client asks; the server holds the request until there is data or a timeout (say 30 s), then the client asks again. Near-instant delivery over plain HTTP; one request per message or timeout.
- **Server-sent events (SSE)**: one long-lived HTTP response that streams events from server to client (`text/event-stream`); automatic reconnect with `Last-Event-ID`. One direction only; simple and proxy-friendly.
- **WebSockets**: an HTTP upgrade to a persistent, full-duplex connection; low overhead per message in both directions. Needs connection-aware infrastructure (load balancers, heartbeats, reconnection logic).
- Scaling: millions of open connections are held by dedicated **connection servers** (event-driven I/O like epoll: memory per connection matters more than CPU); a registry maps user → connection server; other services publish to that server through pub-sub.
- Mobile apps in the background use push notifications (APNs, FCM) instead of held connections.

### deep
#### Cost and delay over one hour

A client receives 30 messages at random times during an hour; the network adds 50 ms each way.

```cpp
uint64_t s = 9;
double uniform01() {
    uint64_t z = (s += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return (z ^ (z >> 31)) / 18446744073709551616.0;
}

int main() {
    const double hour = 3600, one_way = 0.05;           // 50 ms network latency each way
    vector<double> msgs(30);                              // 30 messages in an hour
    for (double& m : msgs) m = uniform01() * hour;
    sort(msgs.begin(), msgs.end());

    // short polling every 5 s: a message waits for the next poll to reach the server
    double poll_every = 5, delay_sum = 0;
    for (double m : msgs) delay_sum += ceil(m / poll_every) * poll_every - m + one_way;
    printf("short polling (5 s):  %4.0f requests, average delay %.2f s\n",
           hour / poll_every, delay_sum / msgs.size());

    // long polling: the server holds each request up to 30 s; after any response the
    // client sends a new request, which reaches the server one_way later
    double t = 0;
    int requests = 0;
    delay_sum = 0;
    size_t i = 0;
    while (t < hour) {
        ++requests;
        double arrives = t + one_way;                     // request reaches the server
        if (i < msgs.size() && msgs[i] < arrives + 30) {  // a message is (or becomes) ready
            double send = max(arrives, msgs[i]);
            delay_sum += send + one_way - msgs[i];
            ++i;
            t = send + one_way;                           // client gets it, polls again
        } else {
            t = arrives + 30 + one_way;                   // timeout, empty response
        }
    }
    printf("long polling (30 s):  %4d requests, average delay %.2f s\n", requests,
           delay_sum / msgs.size());
    printf("WebSocket or SSE:     %4d connection, average delay %.2f s (+ %d heartbeats)\n",
           1, one_way, (int)(hour / 30));
}
```

Output:

```text
short polling (5 s):   720 requests, average delay 2.59 s
long polling (30 s):   136 requests, average delay 0.05 s
WebSocket or SSE:        1 connection, average delay 0.05 s (+ 120 heartbeats)
```

Short polling sent 720 requests to deliver 30 messages (96% returned nothing) and still delayed messages by half the polling interval on average; polling faster cuts the delay but multiplies the requests. Long polling delivered instantly with 136 requests: one per message plus one per 30-second timeout. A persistent connection delivers instantly with a single connection, plus small periodic heartbeats that keep proxies from closing it and detect dead peers.

#### Choosing

| need | choose |
|---|---|
| updates every few minutes, simplest infrastructure | short polling |
| occasional real-time updates, must work through any proxy | long polling |
| server-to-client stream (notifications, live scores, dashboards) | SSE |
| two-way, frequent messages (chat, games, collaborative editing) | WebSocket |
| app in the background on a phone | platform push notifications |

#### Running connection servers

```text
client --WebSocket--> LB (sticky per connection) --> connection server 7
                                                      holds 500,000 sockets
presence registry: user 42 -> server 7
chat service --publish "to user 42"--> pub-sub --> server 7 --> socket of user 42
```

Connections are long-lived, so load balancers must support upgrades and long idle timeouts, and deploys must drain connections gradually (clients reconnect with backoff and jitter, or a restart turns into a reconnect storm). Clients resume from the last event id they saw so nothing is missed across reconnects. Heartbeats every 20 to 30 seconds detect half-open connections.

Connects to: I/O multiplexing, chat application, notification system, TCP connection management, load balancing, publish-subscribe and event-driven architecture.

### questions
Q: How does long polling work?
A: The client sends a request that the server holds open until new data exists or a timeout passes; the server then responds, and the client immediately sends the next request. Updates arrive almost instantly over ordinary HTTP, with one request per update or timeout instead of constant polling.

Q: What is the difference between server-sent events and WebSockets?
A: SSE is a one-way stream from server to client over a normal HTTP response, with built-in reconnection and event ids, and works well through proxies. WebSockets upgrade the connection to a full-duplex channel where both sides can send messages at any time, which suits chat and games but needs more infrastructure support.

Q: Why is short polling inefficient?
A: Most polls return nothing, wasting requests, bandwidth and server work, and updates still wait for the next poll, adding on average half the interval as delay. Making it faster to reduce delay multiplies the wasted requests.

Q: How do you scale WebSocket connections to millions of users?
A: Use dedicated connection servers built on event-driven I/O to hold many sockets each, keep a registry of which server holds each user's connection, and route outgoing messages to the right server through pub-sub. Add heartbeats, graceful draining on deploys, and client reconnection with backoff and resume from the last event id.
