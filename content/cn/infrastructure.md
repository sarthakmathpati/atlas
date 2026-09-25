---
topic: cn.infrastructure
name: "Network infrastructure"
subject: cn
order: 7
prereqs: [cn.application]
---

## cn.infrastructure.proxy-vs-reverse-proxy
name: "Proxy vs reverse proxy"
importance: must
scope: "forward proxies, reverse proxies, gateways"

### simple
A proxy is a middleman that passes requests along. A forward proxy works for clients, like an assistant who makes calls for the people in an office, so the outside world only sees the assistant. A reverse proxy works for servers, like a hotel front desk that greets every guest and quietly sends each request to the right staff member behind the scenes.

### interview
- **Forward proxy**: sits in front of **clients**; clients send their requests to it and it fetches from the internet. Uses: company egress filtering and logging, caching, bypassing geo restrictions, anonymity. The server sees the proxy's IP.
- **Reverse proxy**: sits in front of **servers**; clients think it is the site. Uses: **TLS termination**, **load balancing**, caching static content, compression, rate limiting, WAF rules, routing by host or path to different services, hiding backend addresses. Nginx, HAProxy, Envoy, cloud load balancers.
- **API gateway**: a reverse proxy for APIs with authentication, rate limits and quotas, request transformation and routing to microservices.
- The key question is **who configured it and whom it represents**: the client side (forward) or the server side (reverse).
- The original client IP is passed to backends in `X-Forwarded-For` or `Forwarded` headers (or the PROXY protocol at layer 4); trust these only from your own proxies.
- A reverse proxy is also a single point of failure and a possible bottleneck, so it is run in redundant pairs or clusters.

### deep
#### Intuition

Both are the same kind of program: accept a request, make another request on someone's behalf, pass the answer back. What differs is whom they serve. A forward proxy hides and controls clients; a reverse proxy hides and protects servers.

```text
forward:   [client]  [client] --> [forward proxy] ---- internet ----> [any server]
           (company network, configured by the company for its users)

reverse:   [any client] ---- internet ----> [reverse proxy] --> [app server 1]
                                                           \--> [app server 2]
           (run by the site, invisible to clients)
```

#### What a reverse proxy does to one request

A request for `GET /api/orders/7` arrives over HTTPS:

1. **TLS termination**: the proxy holds the certificate and decrypts; backends can speak plain HTTP on a private network (or TLS again for defense in depth).
2. **Routing**: `/api/` goes to the orders service, `/static/` to a file server or cache, a different `Host` to a different site.
3. **Policy**: rate limiting, authentication checks, WAF rules, request size limits.
4. **Load balancing** across the chosen service's instances, skipping unhealthy ones.
5. **Headers**: adds `X-Forwarded-For: <client IP>` and `X-Forwarded-Proto: https`, so the app knows who asked and how.
6. **Response**: optionally compressed and cached, then encrypted back to the client.

#### Code: routing and balancing

```cpp
struct Route { string prefix; vector<string> backends; size_t next = 0; };

struct ReverseProxy {
    vector<Route> routes;

    string handle(const string& clientIp, const string& path) {
        Route* best = nullptr;                       // the longest matching path prefix wins
        for (auto& r : routes)
            if (path.rfind(r.prefix, 0) == 0 && (!best || r.prefix.size() > best->prefix.size()))
                best = &r;
        if (!best) return path + " -> 404 (no route)";
        const string& backend = best->backends[best->next++ % best->backends.size()];
        return path + " -> " + backend + "  X-Forwarded-For: " + clientIp;
    }
};

int main() {
    ReverseProxy proxy{{{"/", {"web-1"}},
                        {"/api/", {"orders-1", "orders-2"}},
                        {"/api/users/", {"users-1"}}}};
    for (auto [ip, path] : vector<pair<string, string>>{{"198.51.100.7", "/api/orders/7"},
             {"203.0.113.20", "/api/orders/8"}, {"198.51.100.7", "/api/users/42"},
             {"203.0.113.20", "/index.html"}, {"198.51.100.7", "/api/orders/9"}})
        cout << proxy.handle(ip, path) << "\n";
}
```

Output:

```text
/api/orders/7 -> orders-1  X-Forwarded-For: 198.51.100.7
/api/orders/8 -> orders-2  X-Forwarded-For: 203.0.113.20
/api/users/42 -> users-1  X-Forwarded-For: 198.51.100.7
/index.html -> web-1  X-Forwarded-For: 203.0.113.20
/api/orders/9 -> orders-1  X-Forwarded-For: 198.51.100.7
```

Clients see one host name; behind it, requests fan out to different services, and order requests alternate between two instances. Without the forwarded header, every backend would think all traffic came from the proxy.

#### Forward proxy in a company

Browsers are configured (or traffic is forced) to go through the proxy. It can block malware sites, log access for compliance and cache popular downloads. For HTTPS, the client sends `CONNECT host:443` and the proxy just relays the encrypted bytes, unless the company installs its own root certificate on laptops to inspect traffic, which is a deliberate man in the middle.

#### Gateways

An **API gateway** is a reverse proxy specialized for APIs: it validates tokens, enforces per-client quotas, translates between protocols (for example REST outside, gRPC inside) and can combine calls to several services into one response. Adding logic there is convenient but turns the gateway into a critical, shared piece of every request, so keep it thin.

#### Pitfalls

- Trusting `X-Forwarded-For` from anyone: clients can send a fake one. Only accept it from your own proxy, and take the address the proxy appended.
- Timeouts at each hop must fit together: a proxy timeout shorter than the backend's work turns slow requests into 504s.
- Caching responses that depend on cookies or authorization headers can leak one user's data to another; mark them private.

Connects to: load balancers, CDNs, firewalls, VPNs and proxies, HTTPS and TLS, what happens when you type a URL.

### questions
Q: What is the difference between a forward proxy and a reverse proxy?
A: A forward proxy acts on behalf of clients: clients send requests to it and it contacts servers, so servers see the proxy, and it is used for filtering, caching and anonymity. A reverse proxy acts on behalf of servers: clients connect to it as if it were the site, and it forwards requests to backend servers while handling TLS, load balancing, caching and security.

Q: Why put a reverse proxy in front of application servers?
A: It gives one entry point that terminates TLS, balances load across instances, routes paths or hosts to different services, caches and compresses responses, enforces rate limits and security rules, and hides the backends' addresses. Application servers can then stay simple and be added or removed freely.

Q: How does a backend learn the real client IP behind a reverse proxy?
A: The proxy adds headers such as X-Forwarded-For or the standard Forwarded header with the client's address, or uses the PROXY protocol at layer 4. The backend must trust these values only when they come from its own proxies, since clients can forge them.

Q: What is an API gateway?
A: A reverse proxy specialized for APIs, especially in microservice systems. Besides routing and load balancing, it authenticates requests, enforces quotas and rate limits, transforms requests or protocols, and sometimes aggregates several backend calls into one response.

Q: How can HTTPS traffic pass through a forward proxy?
A: The client sends a CONNECT request naming the destination host and port, and the proxy opens a TCP connection and relays the encrypted bytes without reading them. Inspecting the content requires the proxy to terminate TLS itself, which only works if clients trust the proxy's own root certificate.

## cn.infrastructure.load-balancers
name: "Load balancers"
importance: must
prereqs: [cn.infrastructure.proxy-vs-reverse-proxy]
scope: "L4 vs L7, algorithms"

### simple
A load balancer spreads incoming requests across several servers so no single one is overwhelmed, and stops sending traffic to servers that break. It is like a host at a busy restaurant seating each new group at the table that can take them. Adding more servers behind it lets a site handle more users.

### interview
- **Layer 4** balancers route **connections** by IP and port (TCP or UDP) without reading the content: very fast, protocol-agnostic, but all requests on one connection go to one server.
- **Layer 7** balancers parse HTTP: route by **path, host, header or cookie**, terminate TLS, balance **per request**, retry failed requests, add headers. More CPU, more features.
- **Algorithms**: round robin, **weighted** round robin (bigger servers get more), **least connections** (good when request times vary), least response time, **IP or key hashing** (same client to the same server; consistent hashing limits reshuffling), random with **two choices** (pick the less loaded of two random servers).
- **Health checks** (active probes such as `GET /health`, and passive: counting failures) remove bad servers; **connection draining** lets in-flight requests finish before a server is removed.
- **Session persistence** (sticky sessions) by cookie or IP hash, if servers keep state; better to keep servers stateless.
- The balancer itself must not be a single point of failure: active-passive pairs with a floating IP, many instances behind **DNS** or **anycast**, and global balancing across regions by DNS.

### deep
#### Intuition

Many identical servers can handle many users only if work is spread well. The balancer's job is to pick a server for each new connection or request, notice when a server is sick, and hide all of this behind one address.

#### L4 vs L7

| | layer 4 | layer 7 |
|---|---|---|
| sees | IP addresses, ports, TCP or UDP | full HTTP request: method, path, headers, cookies |
| unit balanced | connection | request |
| TLS | passes it through (or terminates it) | terminates it to read requests |
| routing by path or host | no | yes |
| speed and cost | very high throughput, low latency | more CPU per request |
| typical use | databases, games, any TCP service, in front of L7 proxies | web apps, APIs, microservices |

Big sites often chain them: an L4 layer spreads connections across many L7 proxies, which route requests to services.

#### Worked example: round robin vs least connections

Twelve requests arrive one per tick; every third one is slow (9 ticks), the rest take 1 tick.

```cpp
void peakLoad(bool leastConnections) {
    const int servers = 3;
    vector<vector<int>> busyUntil(servers);          // finish times of each server's requests
    vector<int> peak(servers, 0);
    for (int t = 0; t < 12; ++t) {
        int duration = t % 3 == 0 ? 9 : 1;
        for (auto& s : busyUntil) erase_if(s, [t](int end) { return end <= t; });
        int pick = t % servers;                      // round robin
        if (leastConnections)
            for (int i = 0; i < servers; ++i)
                if (busyUntil[i].size() < busyUntil[pick].size()) pick = i;
        busyUntil[pick].push_back(t + duration);
        peak[pick] = max(peak[pick], int(busyUntil[pick].size()));
    }
    printf("%-17s peak active requests per server: %d %d %d\n",
           leastConnections ? "least connections" : "round robin", peak[0], peak[1], peak[2]);
}

int main() {
    peakLoad(false);
    peakLoad(true);
}
```

Output:

```text
round robin       peak active requests per server: 3 1 1
least connections peak active requests per server: 1 2 2
```

Round robin blindly sends every slow request to server 0, because the pattern lines up with the rotation; three slow requests pile up there while the others sit nearly idle. Least connections sees the pile-up and steers new work away, so no server ever holds more than two requests. Real traffic rarely lines up this perfectly, but uneven request costs are exactly when load-aware algorithms matter.

#### Choosing an algorithm

- **Round robin**: equal servers and similar requests.
- **Weighted**: mixed server sizes, or sending 5% of traffic to a new version (canary).
- **Least connections or least response time**: long or uneven requests, WebSockets.
- **Hashing**: when the same key should hit the same server (cache locality, sticky state). Plain `hash mod N` remaps almost every key when N changes; consistent hashing moves only about $1/N$.
- **Power of two choices**: nearly as good as least connections with little shared state, useful when many balancers act independently.

#### Health and failure

A health check that only tests "the process answers" can keep sending traffic to a server whose database connection is broken; a deep check that tests every dependency can take the whole fleet out when one shared dependency hiccups. Common practice: a shallow liveness check plus a readiness check for what the server itself needs, removal after a few failures, and gradual re-entry (slow start) after recovery.

#### Pitfalls

- Sticky sessions uneven the load and lose sessions when a server dies; prefer stateless servers with shared session stores.
- Retrying non-idempotent requests on another server can duplicate orders.
- Long-lived connections (HTTP/2, WebSockets, gRPC) defeat L4 balancing: one connection carries many requests to one server, so balance them at L7.

Connects to: proxy vs reverse proxy, consistent hashing, DNS, CDNs, load balancing.

### questions
Q: What is the difference between L4 and L7 load balancing?
A: An L4 balancer works with TCP or UDP connections using only addresses and ports, so it is very fast and works for any protocol but cannot see requests. An L7 balancer understands HTTP, so it can route by path, host, header or cookie, terminate TLS, balance each request separately and retry, at a higher processing cost.

Q: Name some load balancing algorithms and when to use each.
A: Round robin for similar servers and requests; weighted round robin when servers differ in capacity or for canary releases; least connections or least response time when request durations vary; hashing on client IP or a key, ideally with consistent hashing, when the same client or key should reach the same server; and random choice of the less loaded of two servers for a cheap, robust approach.

Q: How does a load balancer handle a failing server?
A: It runs health checks, periodic probes such as an HTTP health endpoint, and also watches real traffic for errors and timeouts. After several failures it stops sending new traffic to the server, lets in-flight requests finish, and adds the server back gradually once it passes checks again.

Q: How do you avoid the load balancer being a single point of failure?
A: Run several load balancers: an active-passive pair sharing a floating virtual IP that moves on failure, or many active instances reached through DNS with multiple records or through anycast, where the same IP is announced from several places. Cloud load balancers are built this way internally.

Q: What are sticky sessions and why are they often avoided?
A: The balancer sends all of a client's requests to the same server, using a cookie or the client IP, so session state stored on that server stays available. They cause uneven load and lose sessions when that server fails or is removed, so keeping servers stateless with a shared session store is preferred.

## cn.infrastructure.cdns
name: "CDNs"
importance: must
prereqs: [cn.infrastructure.proxy-vs-reverse-proxy]
scope: "caching content near users"

### simple
A CDN is a network of servers spread around the world that keep copies of a website's files close to the people who use them. Instead of every visitor fetching an image from one faraway server, they get it from a nearby one, which is much faster. It is like a chain of local warehouses: popular items ship from the warehouse in your city, not from the factory overseas.

### interview
- A **content delivery network** runs **edge servers** in many **points of presence** (PoPs). Users are sent to a nearby edge by **DNS** (a location-aware answer) or **anycast** (one IP announced from every PoP, the internet's routing picks the closest).
- On a **hit** the edge answers immediately; on a **miss** it fetches from the **origin** (or a mid-tier "shield" cache), stores the response and serves later requests.
- Caching is controlled by headers: `Cache-Control: max-age` and `s-maxage` (for shared caches), `no-store`, `private`, `ETag` and `Last-Modified` for revalidation, `Vary` for variants. **Invalidation** by purge API, or better, **versioned file names** (`app.3f9a2c.js`) with long TTLs.
- Benefits: lower **latency** (shorter round trips, including the TCP and TLS handshakes), **offloads** the origin, absorbs **DDoS** traffic, terminates TLS near users, often speeds up dynamic requests over warm connections to the origin.
- Best for static assets, images, video segments, software downloads; dynamic and personalized content needs care (short TTLs, edge logic, or no caching).
- Measure the **cache hit ratio**; a low one means the origin still does most of the work.

### deep
#### Intuition

Distance costs time: a round trip from Mumbai to a server in Virginia is around 200 ms, and a new HTTPS connection needs several. The speed of light cannot be negotiated, so the fix is to move the content closer. A CDN is a very large, distributed reverse proxy cache.

#### How a request finds the edge

1. The site points `static.example.com` at the CDN (a CNAME).
2. The user's resolver asks the CDN's DNS, which answers with the IP address of a PoP near the resolver, or the CDN uses anycast so one address reaches the nearest PoP.
3. The TLS handshake completes with the edge, a few milliseconds away.
4. The edge checks its cache under a **cache key** (usually host, path and query, plus anything listed in `Vary`).

#### Worked example: an edge cache with a TTL

```cpp
int main() {
    const int ttl = 60;                              // Cache-Control: max-age=60
    const int edgeMs = 10, originMs = 180;           // round trips from the user's view
    map<string, int> cachedAt;                       // path -> time it was stored
    int hits = 0, misses = 0, totalMs = 0;
    vector<pair<int, string>> requests = {{0, "/logo.png"}, {5, "/logo.png"}, {8, "/app.js"},
        {20, "/logo.png"}, {30, "/app.js"}, {70, "/logo.png"}, {75, "/logo.png"},
        {80, "/app.js"}};
    for (auto [t, path] : requests) {
        auto it = cachedAt.find(path);
        bool fresh = it != cachedAt.end() && t - it->second < ttl;
        if (fresh) {
            ++hits;
            totalMs += edgeMs;
        } else {
            ++misses;
            totalMs += edgeMs + originMs;            // the edge fetches from the origin
            cachedAt[path] = t;
        }
        printf("t=%2d %-10s %s\n", t, path.c_str(), fresh ? "hit" : "miss -> origin");
    }
    printf("hit ratio %d/%zu, average %d ms (origin only: %d ms)\n", hits, requests.size(),
           totalMs / int(requests.size()), originMs);
}
```

Output:

```text
t= 0 /logo.png  miss -> origin
t= 5 /logo.png  hit
t= 8 /app.js    miss -> origin
t=20 /logo.png  hit
t=30 /app.js    hit
t=70 /logo.png  miss -> origin
t=75 /logo.png  hit
t=80 /app.js    miss -> origin
hit ratio 4/8, average 100 ms (origin only: 180 ms)
```

Every entry expires 60 seconds after it was stored, forcing a trip to the origin. With real traffic, thousands of users share each edge, so the hit ratio for popular files is far higher, and the origin sees one request per file per TTL per edge instead of one per user. When the content has not changed, the edge can **revalidate** with `If-None-Match` and receive a tiny 304 instead of the full file.

#### Invalidation strategies

| approach | how | trade-off |
|---|---|---|
| short TTL | `max-age=60` | always fairly fresh, more origin traffic |
| purge | tell the CDN to drop a path | fast, but must be triggered on every change |
| versioned names | `app.3f9a2c.js` with `max-age=31536000, immutable`; HTML points to the new name | never stale, no purges; HTML itself needs a short TTL |
| stale-while-revalidate | serve the old copy while fetching a new one in the background | smooth for users, briefly stale |

#### Pitfalls

- Caching personalized responses: a page with one user's name must be `private` or vary correctly, or it will be shown to others.
- Query strings in cache keys: tracking parameters (`?utm_source=...`) can split one file into thousands of cache entries.
- A purge storm or TTL expiring everywhere at once can stampede the origin; shields and request coalescing (one origin fetch per key) help.

Connects to: proxy vs reverse proxy, DNS, bandwidth, latency and throughput, what happens when you type a URL, where to cache.

### questions
Q: How does a CDN reduce latency?
A: Edge servers in many locations cache content close to users, so requests travel a short distance and TCP and TLS handshakes complete in a few milliseconds instead of a long round trip to the origin. Even on a miss, the edge often reaches the origin over fast, already-open connections.

Q: How are users routed to the nearest CDN edge?
A: Either by DNS, where the CDN's name servers answer with the address of a point of presence near the user's resolver, or by anycast, where every point of presence announces the same IP address and internet routing delivers packets to the closest one.

Q: How do you update a cached file on a CDN?
A: The most reliable way is versioned file names: each build gets a new name containing a content hash, cached for a year, and the HTML that references them has a short TTL. Alternatives are purging the path through the CDN's API or relying on short TTLs, with revalidation using ETags.

Q: What content should not be cached at the CDN?
A: Responses that are personal or sensitive, such as account pages or anything depending on the user's cookies or authorization header, unless the cache key varies on them correctly. These should be marked private or no-store. Rapidly changing data needs very short TTLs or no caching.

Q: What is the cache hit ratio and why does it matter?
A: The share of requests the edge answers from its cache without contacting the origin. A high ratio means lower latency for users and less load and bandwidth at the origin; a low one often points to short TTLs, cache keys split by query strings or cookies, or content that is not cacheable.

## cn.infrastructure.socket-programming-basics
name: "Socket programming basics"
importance: advanced
scope: "bind, listen, accept, connect"

### simple
Sockets are how a program talks over the network: the operating system gives it a handle it can read from and write to, like a phone handset. A server sets up a socket, gives it an address with bind, starts listening, and accepts each incoming call; a client creates a socket and connects to the server's address. After that, both sides simply send and receive bytes.

### interview
- **Server**: `socket` → `bind` (IP and port) → `listen` (backlog of pending connections) → `accept` (returns a **new socket** for each client) → `read`/`write` → `close`. **Client**: `socket` → `connect` → `write`/`read` → `close`.
- **UDP**: `socket(AF_INET, SOCK_DGRAM, 0)`, then `sendto` and `recvfrom` with an address each time; no connection, no accept.
- Byte order: port numbers and addresses in `sockaddr_in` are **network byte order** (big-endian): use `htons`, `htonl`, `inet_pton`.
- TCP is a byte stream: `read` may return **part** of a message and `write` may send part of a buffer, so loop until done and add your own **framing** (length prefix or delimiter).
- Serving many clients: a thread per connection (simple, heavy at scale), or one thread with **non-blocking** sockets and an event loop (`poll`, `epoll`, `kqueue`, io_uring), which is how high-performance servers work.
- Useful options: `SO_REUSEADDR` (restart without "address in use"), `TCP_NODELAY`, timeouts with `SO_RCVTIMEO`, and always checking return values.

### deep
#### Code: an echo server with poll

One thread serves every client: `poll` waits until the listening socket has a new connection or a client socket has data.

```cpp
int makeListener(sockaddr_in& addr) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    addr = {};
    addr.sin_family = AF_INET;
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);        // port 0: the kernel picks one
    if (bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof addr) < 0 || listen(fd, 16) < 0)
        throw runtime_error("bind or listen failed");
    socklen_t len = sizeof addr;
    getsockname(fd, reinterpret_cast<sockaddr*>(&addr), &len);
    return fd;
}

void serve(int listener, int messagesToEcho) {
    vector<pollfd> fds = {{listener, POLLIN, 0}};
    while (messagesToEcho > 0) {
        poll(fds.data(), fds.size(), -1);                    // sleep until something is ready
        for (size_t i = 0; i < fds.size(); ++i) {
            if (!(fds[i].revents & POLLIN)) continue;
            if (fds[i].fd == listener) {                     // a new client
                fds.push_back({accept(listener, nullptr, nullptr), POLLIN, 0});
                continue;
            }
            char buf[256];
            ssize_t n = read(fds[i].fd, buf, sizeof buf);
            if (n <= 0) {                                    // the client closed
                close(fds[i].fd);
                fds.erase(fds.begin() + i--);
                continue;
            }
            string reply = "echo: " + string(buf, n);
            if (write(fds[i].fd, reply.data(), reply.size()) < 0) perror("write");
            --messagesToEcho;
        }
    }
    for (auto& p : fds) close(p.fd);
}

string ask(int fd, const string& msg) {
    if (write(fd, msg.data(), msg.size()) < 0) return "write failed";
    char buf[256];
    ssize_t n = read(fd, buf, sizeof buf);                   // fine for small, local replies
    return n > 0 ? string(buf, n) : "no reply";
}

int main() {
    sockaddr_in addr;
    int listener = makeListener(addr);
    thread server(serve, listener, 3);
    int a = socket(AF_INET, SOCK_STREAM, 0), b = socket(AF_INET, SOCK_STREAM, 0);
    connect(a, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    connect(b, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    cout << "a <- " << ask(a, "hello from a") << "\n";
    cout << "b <- " << ask(b, "hello from b") << "\n";
    cout << "a <- " << ask(a, "bye") << "\n";
    close(a);
    close(b);
    server.join();
}
```

Output:

```text
a <- echo: hello from a
b <- echo: hello from b
a <- echo: bye
```

Two clients are served by one thread without either blocking the other: `poll` reports which sockets are ready, and the server only calls `read` on those. Production servers add non-blocking sockets (so a slow client can never stall the loop), buffers for partial reads and writes, framing, timeouts and `epoll` for tens of thousands of connections.

#### The calls, one line each

| call | side | does |
|---|---|---|
| `socket` | both | creates an endpoint: address family and type (stream or datagram) |
| `bind` | server (clients optional) | attaches a local IP and port |
| `listen` | server | marks the socket passive; sets the queue for finished handshakes |
| `accept` | server | takes one connection from the queue as a new socket |
| `connect` | client | runs the TCP handshake with the server |
| `read`, `write` (`recv`, `send`) | both | move bytes; may move fewer than asked |
| `close` or `shutdown` | both | release the socket, or close one direction |

Connects to: ports and sockets, TCP three-way handshake and four-way teardown, TCP vs UDP, Nagle's algorithm and delayed ACKs, I/O models.

### questions
Q: What system calls does a TCP server make, and in what order?
A: socket to create the endpoint, bind to attach an address and port, listen to start accepting connections with a backlog queue, then accept in a loop, which returns a new socket per client. It reads and writes on each client socket and closes it when done.

Q: Why does accept return a new socket?
A: The listening socket keeps waiting for more connections on the server's port, while each accepted socket represents one specific connection, identified by both endpoints. Keeping them separate lets the server talk to many clients at once through the same port.

Q: Why can a single read on a TCP socket return only part of a message?
A: TCP is a byte stream without message boundaries. Data may arrive in several segments, and read returns whatever is available, up to the buffer size. Programs must loop until a whole message has arrived, using a length prefix or delimiter to know where it ends.

Q: How can one thread serve many clients?
A: By using an event loop: put the sockets in non-blocking mode and call poll, epoll or kqueue to wait until any of them is ready, then handle only the ready ones. This avoids a thread per connection and scales to many thousands of mostly idle connections.
