---
topic: sysd.architecture
name: "Architecture styles"
subject: sysd
order: 8
prereqs: [sysd.scalability]
---

## sysd.architecture.monolith-vs-microservices
name: "Monolith vs microservices"
importance: must
scope: "trade-offs, when to split"

### simple
A monolith is one application that contains every feature and is deployed as a single unit. Microservices split the product into many small services, each owning one business area and its data, talking over the network. A monolith is like one big shop where everything is under one roof; microservices are like a street of specialist shops, each run independently but needing roads between them.

### interview
- **Monolith**: one codebase, one deploy, in-process calls, one database with transactions. Simple to build, test, debug and run; the right default for small teams and new products. Pain grows with size: slow builds and deploys, tangled code, one team's bug takes everything down, the whole thing scales as one unit.
- **Microservices**: services aligned with business capabilities, each with its **own data** and independent deploys. Benefits: team autonomy, independent scaling and release cadence, fault isolation, technology choice per service.
- Costs: network calls (latency, partial failures), **distributed data** (no cross-service joins or transactions: sagas, events, eventual consistency), operational load (deployment pipelines, service discovery, observability, on-call per service), harder end-to-end testing.
- **Modular monolith**: one deployable with strict internal module boundaries and separate schemas; often the best middle step, and it makes later extraction easy.
- **When to split**: when team count and coordination cost, not code size, is the bottleneck; when parts need very different scaling or reliability; along stable domain boundaries (bounded contexts). Conway's law: systems mirror the communication structure of the teams building them.
- **Anti-pattern**: the distributed monolith: services that share a database or must deploy together, with all the costs of both styles.

### deep
#### What the network costs

```cpp
int main() {
    const int calls_per_request = 20;              // internal calls to build one page
    const double in_process_us = 0.1, network_us = 500;   // function call vs network hop
    printf("monolith:      %6.1f us of call overhead per request\n",
           calls_per_request * in_process_us);
    printf("microservices: %6.1f us of call overhead per request\n",
           calls_per_request * network_us);
    for (int services : {1, 5, 20})
        printf("%2d services at 99.95%% each, all needed: %.2f%% available\n", services,
               pow(0.9995, services) * 100);
}
```

Output:

```text
monolith:         2.0 us of call overhead per request
microservices: 10000.0 us of call overhead per request
 1 services at 99.95% each, all needed: 99.95% available
 5 services at 99.95% each, all needed: 99.75% available
20 services at 99.95% each, all needed: 99.00% available
```

Twenty in-process calls cost microseconds; twenty network calls cost around 10 milliseconds even when all goes well, before serialization and retries. And if a page needs 20 services that are each 99.95% available, it works only 99% of the time unless the design tolerates some of them failing. None of this rules microservices out; it means each boundary must pay for itself, and the call graph should be shallow, with timeouts, fallbacks and asynchronous messaging where possible.

#### Comparing the styles

| | monolith | modular monolith | microservices |
|---|---|---|---|
| deploy | all at once | all at once | per service |
| calls between parts | function calls | function calls through module interfaces | network (HTTP, gRPC, messages) |
| data | one database, joins, transactions | one database, schema per module | database per service; no cross-service joins |
| scaling | the whole app | the whole app | per service |
| failure isolation | low | low | high, if designed for it |
| operational cost | low | low | high: CI/CD, discovery, tracing, on-call |
| fits | small teams, early products | growing teams, unclear boundaries | many teams, stable domains, very different scaling needs |

#### A sensible path

1. Start with a monolith, structured as modules with clear interfaces and separate data ownership.
2. Measure: where do deploys collide, which parts need different scaling, which teams block each other?
3. Extract one service at a time along a domain boundary (notifications, search, payments), usually starting with something at the edge. Put an API or events between it and the rest, and move its data out with it.
4. Invest in the platform before the number of services grows: deployment automation, service discovery, centralized logs, metrics and traces.

The strangler fig pattern does this gradually: route some traffic for a feature to the new service, grow it, and retire the old code path when nothing uses it.

Connects to: API gateway and service discovery, distributed transactions in practice, synchronous vs asynchronous communication, service mesh, single responsibility principle, discussing trade-offs.

### questions
Q: What are the main trade-offs between a monolith and microservices?
A: A monolith is simpler to build, test, deploy and operate, with in-process calls and single-database transactions, but grows harder to change and scale as teams and code grow. Microservices give independent deployment, scaling and team ownership, at the cost of network latency, partial failures, distributed data consistency and much higher operational complexity.

Q: When should a company move from a monolith to microservices?
A: When the organization, not the code, becomes the bottleneck: many teams stepping on each other's deploys, parts needing very different scaling or reliability, and stable domain boundaries that can own their data. Moving early adds distributed-systems costs without those benefits.

Q: What is a distributed monolith?
A: A system split into services that still share a database, call each other synchronously in long chains, or must be deployed together. It pays the network and operational costs of microservices without gaining independent deployment or fault isolation.

Q: What is a modular monolith?
A: A single deployable application organized into strongly separated modules with explicit interfaces and separate data ownership inside one database. It keeps the operational simplicity of a monolith while making boundaries clear, so modules can be extracted into services later if needed.

## sysd.architecture.api-gateway-and-service-discovery
name: "API gateway and service discovery"
importance: important
prereqs: [sysd.architecture.monolith-vs-microservices]
scope: "API gateway and service discovery"

### simple
An API gateway is the single front door that all outside requests pass through: it checks who you are, applies limits, and forwards each request to the right internal service. Service discovery is the phone book that lets services find each other's current addresses, which change constantly as instances start and stop. Together they hide a changing crowd of services behind one stable entrance.

### interview
- **API gateway** jobs: routing by path or host, TLS termination, authentication (validating tokens), rate limiting and quotas, request and response transformation, aggregation of several backend calls, caching, logging and metrics. Examples: Kong, Envoy-based gateways, NGINX, cloud API gateways.
- **Backend for frontend (BFF)**: a gateway per client type (web, mobile) shaping responses for that client.
- Risks: the gateway is a critical dependency (run it redundantly), a latency hop, and a place where business logic shouldn't accumulate.
- **Service discovery**: instances register their address (self-registration with heartbeats or leases, or by the platform, as Kubernetes does from pod readiness); clients look them up.
- **Client-side discovery**: the client queries the registry and load balances itself (fewer hops, needs a library in each client). **Server-side discovery**: the client calls a load balancer or DNS name that knows the instances (simpler clients). Kubernetes Services give a stable DNS name and virtual IP.
- Registries: Consul, etcd, ZooKeeper, Eureka, Kubernetes API with DNS. Health checks and TTLs remove dead instances.

### deep
#### A registry with heartbeats

Three instances of an orders service send heartbeats every 5 seconds; one crashes after its first heartbeat. The registry forgets instances silent for 10 seconds, and the client spreads calls over whatever is healthy:

```cpp
struct Instance { string address; long last_heartbeat; };

class Registry {                                   // e.g. Consul or etcd with leases
    map<string, vector<Instance>> services;
    const long ttl = 10000;                         // forget instances silent for 10 s
public:
    void heartbeat(const string& service, const string& addr, long now) {
        for (auto& i : services[service])
            if (i.address == addr) { i.last_heartbeat = now; return; }
        services[service].push_back({addr, now});   // first heartbeat registers it
    }
    vector<string> healthy(const string& service, long now) {
        vector<string> out;
        for (auto& i : services[service])
            if (now - i.last_heartbeat < ttl) out.push_back(i.address);
        return out;
    }
};

int main() {
    Registry reg;
    int rr = 0;
    auto call = [&](long now) {                    // client-side load balancing
        auto hosts = reg.healthy("orders", now);
        printf("t=%2lds healthy:", now / 1000);
        for (auto& h : hosts) printf(" %s", h.c_str());
        printf("  -> call goes to %s\n", hosts[rr++ % hosts.size()].c_str());
    };
    for (long t = 0; t <= 20000; t += 5000) {
        reg.heartbeat("orders", "10.0.1.5:8080", t);
        if (t < 5000) reg.heartbeat("orders", "10.0.1.6:8080", t);   // this one dies at ~5 s
        reg.heartbeat("orders", "10.0.1.7:8080", t);
        call(t);
    }
}
```

Output:

```text
t= 0s healthy: 10.0.1.5:8080 10.0.1.6:8080 10.0.1.7:8080  -> call goes to 10.0.1.5:8080
t= 5s healthy: 10.0.1.5:8080 10.0.1.6:8080 10.0.1.7:8080  -> call goes to 10.0.1.6:8080
t=10s healthy: 10.0.1.5:8080 10.0.1.7:8080  -> call goes to 10.0.1.5:8080
t=15s healthy: 10.0.1.5:8080 10.0.1.7:8080  -> call goes to 10.0.1.7:8080
t=20s healthy: 10.0.1.5:8080 10.0.1.7:8080  -> call goes to 10.0.1.5:8080
```

At 5 seconds, the dead instance is still listed (its last heartbeat was only 5 seconds ago, within the 10-second TTL) and a call is routed to it and fails. By 10 seconds it has aged out and calls go only to the live ones. Discovery is always slightly behind reality, which is why clients still need timeouts, retries on another instance and passive health checks (stop using an instance after a few errors), and why graceful shutdown should deregister *before* stopping.

#### Where each piece sits

```text
internet --> API gateway: TLS, auth, rate limits, routing
               /v1/orders/*  --> orders service   (instances from discovery)
               /v1/users/*   --> users service
               /v1/search    --> search service
internal:  orders --(client-side discovery or a mesh sidecar)--> payments, inventory
registry:  instances register with health checks; entries expire without heartbeats
```

Keep the gateway thin: cross-cutting concerns only. Once it starts holding business rules ("if the order is over 1,000, also call fraud"), it becomes a bottleneck that every team must change.

Connects to: load balancing, monolith vs microservices, service mesh, rate limiting algorithms, authentication and authorization in systems, DNS.

### questions
Q: What does an API gateway do?
A: It is the single entry point for external clients, routing each request to the right backend service and handling cross-cutting concerns: TLS termination, authentication, rate limiting, request transformation, response aggregation, caching and observability.

Q: What is service discovery and why is it needed?
A: A way for services to find the current network locations of other services. In dynamic environments instances start, stop and move constantly, so addresses can't be hard-coded; a registry tracks healthy instances through registration and health checks, and clients or load balancers look them up.

Q: What is the difference between client-side and server-side discovery?
A: In client-side discovery, the caller queries the registry and chooses an instance itself, saving a network hop but needing discovery logic in every client. In server-side discovery, the caller sends requests to a load balancer or stable DNS name that looks up instances, keeping clients simple.

Q: Why can a client still hit a dead instance with service discovery?
A: Registries learn about failures through missed heartbeats or health checks, which take seconds, and clients may cache results. Until the entry expires, calls can reach the dead instance, so clients need timeouts, retries to other instances and outlier detection.

## sysd.architecture.service-mesh
name: "Service mesh"
importance: advanced
prereqs: [sysd.architecture.api-gateway-and-service-discovery]
scope: "sidecars"

### simple
A service mesh moves the plumbing of service-to-service calls out of the application code and into a small proxy that runs next to every service, called a sidecar. The proxies handle encryption, retries, timeouts, routing and measurements for every call, configured centrally. It is like giving every office in a building the same trained receptionist who handles all incoming and outgoing calls.

### interview
- **Data plane**: a proxy (usually Envoy) beside each service instance (the **sidecar**) intercepts all inbound and outbound traffic. **Control plane** (Istio, Linkerd) pushes configuration and certificates to the proxies.
- Features without code changes: **mutual TLS** between services (identity and encryption), retries, timeouts and circuit breaking, traffic splitting (canary releases, A/B), fault injection for testing, and uniform metrics and tracing for every call.
- Costs: an extra hop per call in each direction (typically sub-millisecond, but it adds up), CPU and memory for thousands of proxies, operational complexity (a new critical system to run and upgrade), harder debugging when the proxy misbehaves.
- Alternatives: libraries in each service (the older approach, per-language), or **sidecar-less** meshes (per-node proxies, kernel-level eBPF) that cut the per-pod overhead.
- Worth it for many services, many languages and strong security requirements; overkill for a handful of services.

### deep
#### Traffic through a mesh

```text
service A --> [sidecar A] ==mTLS==> [sidecar B] --> service B
                  |                     |
                  +---- config, certs from the control plane ----+
                  +---- metrics, traces to the observability stack
```

Service A simply calls the `payments` service by name; its sidecar resolves the destination, applies the retry and timeout policy, opens a mutually authenticated TLS connection to B's sidecar, and records latency and status. B's sidecar checks that A is allowed to call B (an authorization policy on service identities) and forwards the request to B on localhost.

#### What moves out of the application

| concern | in each service's code | in the mesh |
|---|---|---|
| encryption and service identity | TLS setup, certificates per app | automatic mTLS, certificates rotated by the control plane |
| retries, timeouts, circuit breakers | a library per language | proxy configuration |
| canary releases | custom routing code | route 5% of traffic to v2 by configuration |
| metrics and traces | instrument every client | uniform, from the proxies (apps still pass trace headers along) |

#### Pitfalls

- Retries configured in both the application and the mesh multiply (see retry amplification).
- The mesh adds latency and resource use on every call; measure before and after.
- It doesn't replace good API design, idempotency or application-level fallbacks; it only standardizes the network behavior.

Connects to: API gateway and service discovery, circuit breakers and bulkheads, retries, timeouts and exponential backoff with jitter, observability, TLS, monolith vs microservices.

### questions
Q: What is a service mesh?
A: An infrastructure layer that handles service-to-service communication through proxies deployed next to each service instance, the sidecars, which are configured by a central control plane. It provides mutual TLS, retries, timeouts, traffic routing and telemetry without changes to application code.

Q: What is the difference between the data plane and the control plane?
A: The data plane is the set of proxies that actually carry and manipulate the traffic between services. The control plane doesn't touch requests; it distributes configuration, routing rules, policies and certificates to the proxies.

Q: What are the costs of a service mesh?
A: Extra latency from two proxy hops per call, CPU and memory for a proxy per instance, a complex new system to operate and upgrade, and harder debugging when problems sit in the proxy layer. It pays off mainly with many services, several languages and strict security needs.

## sysd.architecture.serverless
name: "Serverless"
importance: important
prereqs: [sysd.architecture.monolith-vs-microservices]
scope: "functions as a service trade-offs"

### simple
Serverless means you upload small functions and the cloud provider runs them when events arrive, such as an HTTP request or a new file, scaling from zero to thousands of copies automatically. You pay per invocation and per millisecond of running time instead of for servers sitting idle. It is like taking taxis instead of owning a car: perfect for occasional trips, expensive if you drive all day.

### interview
- **Functions as a service** (AWS Lambda, Google Cloud Functions, Azure Functions): event-triggered, stateless, short-lived executions; the platform handles servers, scaling and patching.
- Pros: no capacity planning, **scale to zero** (no cost when idle), fast scaling for spiky traffic, less operational work, fine-grained billing.
- Cons: **cold starts** (a new instance must start, adding tens of milliseconds to seconds of latency), limits on duration, memory and payload, no local state between invocations, harder local testing and debugging, vendor lock-in, and cost that exceeds always-on servers at steady high volume.
- Good fits: event glue (process an uploaded file, react to a queue message), scheduled jobs, low or spiky traffic APIs, prototypes, webhooks.
- Poor fits: steady high-throughput services, long-running jobs, latency-critical paths sensitive to cold starts, workloads needing persistent connections (unless the platform supports them).
- Downstream danger: a function can scale to 1,000 copies in seconds and exhaust a database's connections; use connection proxies, concurrency limits or queues.

### deep
#### Cost: per request vs always on

With illustrative prices (not any provider's current rates), a function using 0.5 GB for 100 ms per request against a small server costing 30 a month:

```cpp
int main() {
    // Illustrative prices, not any provider's real ones: $0.20 per million invocations,
    // $0.0000167 per GB-second; a small always-on server costs $30 per month.
    const double per_million = 0.20, per_gb_second = 0.0000167, server_month = 30;
    const double memory_gb = 0.5, duration_s = 0.1;
    printf("requests/month  serverless  one server\n");
    for (double reqs : {1e5, 1e6, 1e7, 3e7, 1e8}) {
        double cost = reqs / 1e6 * per_million + reqs * memory_gb * duration_s * per_gb_second;
        printf("%14.0f %10.2f %11.2f\n", reqs, cost, server_month);
    }
    double per_request = per_million / 1e6 + memory_gb * duration_s * per_gb_second;
    printf("break-even near %.1f million requests per month\n", server_month / per_request / 1e6);
}
```

Output:

```text
requests/month  serverless  one server
        100000       0.10       30.00
       1000000       1.03       30.00
      10000000      10.35       30.00
      30000000      31.05       30.00
     100000000     103.50       30.00
break-even near 29.0 million requests per month
```

At low and moderate volumes, serverless costs a fraction of a server that would idle most of the time. The lines cross near 29 million requests a month (about 11 per second on average); beyond that, steady traffic is cheaper on provisioned machines, and much cheaper at hundreds of millions of requests. Real comparisons must also count what serverless saves (operations work, over-provisioning for peaks) and what it adds (API gateway charges, data transfer).

#### Cold starts

When no warm instance is free, the platform starts one: download the code, start the runtime, run initialization. For small functions in lightweight runtimes this adds tens to hundreds of milliseconds; large packages and heavy frameworks can take seconds. If 1% of requests are cold, they show up directly in p99 latency. Mitigations: keep packages small, do expensive setup once per instance (reused across warm invocations), use provisioned concurrency for latency-critical paths, or keep those paths on always-on services.

#### A typical serverless design

```text
client --> API gateway --> function: validate, write to a queue, return 202
upload --> object storage --"object created" event--> function: make thumbnails
queue  --> function (concurrency capped at 50) --> database (through a connection proxy)
schedule (every night) --> function: send digest emails
```

Each function does one small job triggered by an event; state lives in managed services (object storage, queues, databases); concurrency caps protect the database.

Connects to: autoscaling, stateless services, message queues, monolith vs microservices, object storage and blobs, latency vs throughput trade-offs.

### questions
Q: What are the main benefits of serverless functions?
A: No servers to provision or manage, automatic scaling from zero to high concurrency, paying only for actual executions, and fast delivery for event-driven glue code. It suits spiky or low traffic, scheduled jobs and reactions to events.

Q: What is a cold start?
A: The extra latency when the platform must create a new function instance, loading code, starting the runtime and running initialization, before handling a request. It ranges from tens of milliseconds to seconds and mostly affects tail latency after idle periods or during scale-up.

Q: When is serverless more expensive than servers?
A: For steady, high-volume traffic: per-invocation and per-millisecond pricing exceeds the cost of servers kept busy most of the time. Past a break-even volume, provisioned instances or containers are cheaper.

Q: How can serverless functions overload a database?
A: They scale out quickly to hundreds or thousands of concurrent instances, each opening its own database connections, which can exhaust the database's connection limit. Use a connection pooler or proxy, cap function concurrency, or put a queue in between.
