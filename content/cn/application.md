---
topic: cn.application
name: "Application layer"
subject: cn
order: 5
prereqs: [cn.transport]
---

## cn.application.dns
name: "DNS"
importance: must
scope: "resolution steps, recursive vs iterative, record types, caching and TTL"

### simple
DNS is the internet's phone book: it turns names people remember, like example.com, into the IP addresses computers use. Your computer asks a resolver, which asks a chain of servers from the top of the naming tree down until one knows the answer. Answers are remembered for a while, so most lookups are answered from a nearby cache in milliseconds.

### interview
- **Hierarchy**: the **root** servers know the **TLD** servers (`com`, `org`, `in`); TLD servers know each domain's **authoritative** name servers; authoritative servers hold the actual records.
- **Recursive vs iterative**: your device asks a **recursive resolver** (ISP, company or public) to find the full answer. The resolver asks root, TLD and authoritative servers **iteratively**: each replies with an answer or a referral ("ask these servers").
- **Record types**: **A** (IPv4), **AAAA** (IPv6), **CNAME** (alias to another name), **MX** (mail servers), **NS** (name servers of a zone), **TXT** (text, such as SPF and domain verification), **SOA** (zone info), **PTR** (reverse lookup), SRV, CAA.
- **Caching with TTL**: every record carries a time to live; browsers, the operating system and resolvers cache it that long. Failed lookups are cached too (negative caching). Changes "propagate" only as old cache entries expire.
- Mostly **UDP port 53**; TCP for large responses and zone transfers. Encrypted variants: DNS over HTTPS and DNS over TLS. **DNSSEC** signs records so they cannot be forged.
- Uses beyond lookup: load balancing with several A records, geographic routing (GeoDNS), failover with short TTLs.

### deep
#### Intuition

No single server could answer every name on the internet, so the namespace is a tree split into **zones**, each run by its owner. A resolver starts at the top and follows referrals down: the root knows who runs `com`, the `com` servers know who runs `example.com`, and those servers know `www.example.com`. Caching makes this cheap: the top levels change rarely, so a resolver asks the root almost never.

#### Worked example: a resolver with a cache

```cpp
struct Record { string type, value; int ttl; };      // "NS" is a referral, "A" an answer

map<string, map<string, Record>> servers = {        // server -> the names it can answer
    {"root", {{"com", {"NS", "com-servers", 172800}}}},
    {"com-servers", {{"example.com", {"NS", "example-ns", 172800}}}},
    {"example-ns", {{"www.example.com", {"A", "203.0.113.10", 300}},
                    {"mail.example.com", {"A", "203.0.113.20", 300}}}},
};

struct Resolver {
    map<string, pair<Record, int>> cache{};          // name -> record and expiry time

    optional<Record> cached(const string& name, int now) {
        auto it = cache.find(name);
        if (it == cache.end() || it->second.second <= now) return nullopt;
        return it->second.first;
    }

    string resolve(const string& name, int now) {
        if (auto hit = cached(name, now)) return hit->value + " (cache)";
        string server = "root";                      // start at the closest cached zone
        for (size_t dot = name.find('.'); dot != string::npos; dot = name.find('.', dot + 1))
            if (auto ns = cached(name.substr(dot + 1), now)) { server = ns->value; break; }
        string trail;
        for (;;) {
            trail += " -> " + server;
            const auto& zone = servers[server];
            for (size_t cut = 0;; cut = name.find('.', cut) + 1) {   // longest known suffix
                auto it = zone.find(name.substr(cut));
                if (it != zone.end()) {
                    cache[it->first] = {it->second, now + it->second.ttl};
                    if (it->second.type == "A") return it->second.value + " (asked" + trail + ")";
                    server = it->second.value;       // a referral: ask the next server
                    break;
                }
                if (name.find('.', cut) == string::npos) return "no such name";
            }
        }
    }
};

int main() {
    Resolver r;
    for (auto [t, name] : vector<pair<int, string>>{{0, "www.example.com"},
             {10, "www.example.com"}, {20, "mail.example.com"}, {400, "www.example.com"}})
        cout << "t=" << t << " " << name << ": " << r.resolve(name, t) << "\n";
}
```

Output:

```text
t=0 www.example.com: 203.0.113.10 (asked -> root -> com-servers -> example-ns)
t=10 www.example.com: 203.0.113.10 (cache)
t=20 mail.example.com: 203.0.113.20 (asked -> example-ns)
t=400 www.example.com: 203.0.113.10 (asked -> example-ns)
```

The first lookup walks the whole tree. The second is a cache hit. The lookup of `mail` skips the root and `com` because the resolver cached the `example.com` referral (TTL two days). At t = 400, the A record's 300-second TTL has expired, so the resolver asks the authoritative server again, but still not the root.

#### The full path from a browser

1. The browser's own cache, then the operating system's cache and the hosts file.
2. The **stub resolver** in the operating system sends one recursive query to the configured resolver (often the home router, the ISP or a public resolver).
3. The recursive resolver answers from its cache or walks the tree iteratively as above.
4. The answer flows back and is cached at each level for its TTL.

#### TTL trade-offs

| TTL | good for | cost |
|---|---|---|
| long (hours to days) | stable records, NS records | changes take long to reach everyone |
| short (30 to 300 s) | failover, moving traffic between regions | more queries, more latency on misses |

Before a planned migration, lower the TTL a day ahead so the switch takes effect quickly.

#### Pitfalls

- A CNAME cannot sit at a zone apex (`example.com` itself) alongside other records; providers offer ALIAS-style records instead.
- "DNS propagation" is just caches expiring; nothing is pushed.
- Plain DNS is unencrypted and unauthenticated: on-path attackers can see and, without DNSSEC, spoof answers. DoH and DoT hide queries from the local network.

Connects to: what happens when you type a URL, UDP, email protocols, CDNs, load balancing.

### questions
Q: Walk through a DNS lookup for a name nobody has cached.
A: The stub resolver on the device sends a recursive query to its configured resolver. The resolver asks a root server, which refers it to the TLD servers for com; those refer it to the domain's authoritative servers; those return the A or AAAA record. The resolver caches every answer and referral for its TTL and returns the address to the client.

Q: What is the difference between a recursive and an iterative query?
A: In a recursive query the client asks the server to return the final answer, doing whatever work is needed; devices send these to their resolver. In an iterative query the server returns the best it knows, either the answer or a referral to closer servers, and the asker continues; resolvers use these with root, TLD and authoritative servers.

Q: Name common DNS record types.
A: A maps a name to an IPv4 address and AAAA to IPv6. CNAME makes a name an alias of another. MX lists mail servers, NS names the authoritative servers of a zone, TXT holds text such as SPF policies, SOA describes the zone, and PTR maps an address back to a name.

Q: What is TTL in DNS and what trade-off does it involve?
A: The time to live says how long a record may be cached. Long TTLs mean fewer queries and faster lookups but slow changes, since old answers live on in caches. Short TTLs allow quick failover and migrations at the cost of more queries.

Q: Why does DNS mostly use UDP, and when does it use TCP?
A: Most queries and answers fit in a single packet, so UDP needs one round trip and no connection state. TCP is used when a response is too large for UDP, signalled by the truncated flag, and for zone transfers between servers.

## cn.application.http-basics
name: "HTTP basics"
importance: must
scope: "methods, status codes, headers, statelessness"

### simple
HTTP is the language browsers and servers use to talk: the browser sends a request like "GET me this page", and the server sends back a response with a status code and the content. It works like ordering at a counter: you say what you want, and you get it along with a short note such as "here you go" or "we don't have that". Each request stands on its own, and the server does not remember earlier ones unless something extra, like a cookie, reminds it.

### interview
- A **request**: a request line (method, path, version), **headers**, a blank line, an optional **body**. A **response**: a status line (version, status code, reason), headers, a blank line, a body.
- **Methods**: GET (read), POST (create or process), PUT (replace), PATCH (partial update), DELETE, HEAD (headers only), OPTIONS (capabilities, CORS preflight). **Safe**: GET, HEAD, OPTIONS change nothing. **Idempotent**: safe ones plus PUT and DELETE; POST is neither.
- **Status codes**: 1xx informational, **2xx** success (200 OK, 201 Created, 204 No Content), **3xx** redirect (301 permanent, 302 or 307 temporary, 304 Not Modified), **4xx** client error (400, 401 unauthenticated, 403 forbidden, 404, 405, 409 conflict, 429 too many requests), **5xx** server error (500, 502 bad gateway, 503 unavailable, 504 gateway timeout).
- **Headers**: `Host` (required in HTTP/1.1, lets one IP serve many sites), `Content-Type`, `Content-Length`, `Accept`, `Authorization`, `Cookie`, `Cache-Control`, `ETag` and `If-None-Match`, `Location`, `User-Agent`.
- **Stateless**: each request carries everything needed; the server keeps no memory between requests. State is added with cookies, tokens and server-side stores, which is what lets any server behind a load balancer handle any request.
- HTTP runs over TCP (HTTP/1.1, HTTP/2) or QUIC (HTTP/3), usually inside TLS (HTTPS, port 443).

### deep
#### Intuition

HTTP is a simple text protocol at heart: you can type an HTTP/1.1 request by hand. The client names a resource and an action; the server answers with a three-digit code that programs understand and headers that describe the content.

#### A real exchange

The program runs a tiny server on loopback and sends it two requests written by hand.

```cpp
void serveOnce(int listener) {                       // a minimal HTTP/1.1 server
    int c = accept(listener, nullptr, nullptr);
    string req;
    char buf[1024];
    while (req.find("\r\n\r\n") == string::npos) {   // headers end with an empty line
        ssize_t n = read(c, buf, sizeof buf);
        if (n <= 0) break;
        req.append(buf, n);
    }
    string requestLine = req.substr(0, req.find("\r\n"));
    bool found = requestLine == "GET /hello HTTP/1.1";
    string body = found ? "hello, atlas\n" : "no such page\n";
    string resp = string(found ? "HTTP/1.1 200 OK" : "HTTP/1.1 404 Not Found") +
                  "\r\nContent-Type: text/plain\r\nContent-Length: " + to_string(body.size()) +
                  "\r\n\r\n" + body;
    if (write(c, resp.data(), resp.size()) < 0) perror("write");
    close(c);
}

string fetch(sockaddr_in addr, const string& path) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    connect(fd, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
    string req = "GET " + path + " HTTP/1.1\r\nHost: localhost\r\nAccept: text/plain\r\n\r\n";
    if (write(fd, req.data(), req.size()) < 0) perror("write");
    string resp;
    char buf[1024];
    for (ssize_t n; (n = read(fd, buf, sizeof buf)) > 0;) resp.append(buf, n);
    close(fd);
    return resp;
}

int main() {
    int listener = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    bind(listener, reinterpret_cast<sockaddr*>(&addr), sizeof addr);   // any free port
    socklen_t len = sizeof addr;
    getsockname(listener, reinterpret_cast<sockaddr*>(&addr), &len);
    listen(listener, 4);
    for (string path : {"/hello", "/missing"}) {
        thread server(serveOnce, listener);
        cout << fetch(addr, path) << "---\n";
        server.join();
    }
}
```

Output (lines end with `\r\n` on the wire):

```text
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

hello, atlas
---
HTTP/1.1 404 Not Found
Content-Type: text/plain
Content-Length: 13

no such page
---
```

The client knows where the body ends from `Content-Length`; responses of unknown length use chunked transfer encoding instead.

#### Safe and idempotent

| method | safe | idempotent | typical use |
|---|---|---|---|
| GET | yes | yes | read a resource |
| HEAD | yes | yes | headers only, such as checking size |
| OPTIONS | yes | yes | allowed methods, CORS preflight |
| PUT | no | yes | create or replace at a known URI |
| DELETE | no | yes | remove |
| POST | no | no | create in a collection, run an action |
| PATCH | no | not guaranteed | partial update |

Idempotent means repeating the request leaves the server in the same state, so clients and proxies may retry it safely after a timeout.

#### Status codes that come up in interviews

- **401 vs 403**: 401 means "who are you?" (missing or bad credentials); 403 means "I know who you are, and you may not".
- **301 vs 302 vs 307 vs 308**: 301 and 308 are permanent (cached, links updated); 302 and 307 temporary; 307 and 308 forbid changing POST into GET on the redirect.
- **502 vs 503 vs 504**: a proxy got a bad answer from upstream, the service is overloaded or down, or the upstream did not answer in time.
- **304 Not Modified**: the cached copy is still valid (after `If-None-Match` with an `ETag`), so no body is sent.

#### Statelessness

The server does not remember that the same browser asked a second ago. That makes servers interchangeable and simple to scale, but applications need logins and carts, so state rides along in each request (cookies, tokens) and lives in shared stores (databases, caches).

Connects to: cookies and sessions, REST principles, HTTP/1.1 vs HTTP/2 vs HTTP/3, HTTPS and TLS, stateless services.

### questions
Q: What does an HTTP request look like?
A: A request line with the method, the path and the protocol version, such as GET /index.html HTTP/1.1, followed by header lines like Host and Accept, an empty line, and an optional body. The response has a status line with the version and status code, headers, an empty line and the body.

Q: What is the difference between safe and idempotent methods?
A: Safe methods, such as GET, HEAD and OPTIONS, do not change server state. Idempotent methods may change state, but repeating them has the same effect as doing them once: PUT and DELETE are idempotent, POST is not. Idempotent requests can be retried safely after a timeout.

Q: What is the difference between 401 and 403?
A: 401 Unauthorized means the request lacks valid authentication, so the client should log in or send credentials. 403 Forbidden means the server knows who the client is, but that identity is not allowed to access the resource.

Q: What does it mean that HTTP is stateless?
A: Each request is independent and carries everything the server needs; the server keeps no memory of previous requests from the same client. State such as logins is added on top with cookies, tokens and server-side storage, and statelessness lets any server behind a load balancer handle any request.

Q: What is the difference between 502, 503 and 504?
A: 502 Bad Gateway means a proxy or gateway received an invalid response from the upstream server. 503 Service Unavailable means the server is overloaded or down for maintenance. 504 Gateway Timeout means a proxy did not get any response from upstream in time.

## cn.application.cookies-and-sessions
name: "Cookies and sessions"
importance: must
prereqs: [cn.application.http-basics]
scope: "keeping state over stateless HTTP"

### simple
Because HTTP forgets you after every request, websites use cookies: small pieces of data the server asks your browser to store and send back each time. Usually the cookie holds only a random session ID, and the server keeps the real details, like who you are and what is in your cart. It is like a coat check ticket: the ticket itself is worthless, but it lets the attendant find your coat.

### interview
- The server sends `Set-Cookie: sid=...; Path=/; Secure; HttpOnly; SameSite=Lax`; the browser stores it and sends `Cookie: sid=...` on later requests to that site.
- **Server-side session**: the cookie holds a long **random session ID**; the server maps it to session data in memory, a database or Redis. Easy to revoke (delete the entry), but every server needs access to the store.
- **Attributes**: `Secure` (HTTPS only), **`HttpOnly`** (hidden from JavaScript, limiting XSS theft), **`SameSite`** (Strict, Lax or None: whether cross-site requests carry the cookie, a CSRF defense), `Domain`, `Path`, `Expires` or `Max-Age` (without them it is a session cookie, deleted when the browser closes).
- **Token-based** alternative: a signed token (such as a JWT) carries the user's claims itself, so servers need no lookup, but revoking it before expiry is hard.
- Security: generate IDs with a **cryptographically secure** random source; **regenerate the ID at login** (prevents session fixation); expire idle sessions; always use HTTPS so IDs cannot be sniffed.
- With many servers: a **shared session store**, or **sticky sessions** at the load balancer (simpler, but uneven load and lost sessions when a server dies).

### deep
#### Intuition

HTTP has no idea that request 2 comes from the same person as request 1. A cookie is the browser's promise to repeat a value back on every request to the same site, which is enough to rebuild continuity. Putting only an unguessable ID in the cookie keeps the actual data safe on the server.

#### The flow

```text
POST /login  (username, password)
             <- 200 OK
                Set-Cookie: sid=9f2c...; Path=/; Secure; HttpOnly; SameSite=Lax
GET /cart
   Cookie: sid=9f2c...
             <- server looks up sid 9f2c... -> user asha, cart [2 items]
POST /logout
   Cookie: sid=9f2c...
             <- server deletes the session; Set-Cookie: sid=; Max-Age=0
```

#### Code: a session store

```cpp
#include <sys/random.h>

string newSessionId() {                              // 128 random bits from the kernel's CSPRNG
    uint8_t bytes[16];
    if (getrandom(bytes, sizeof bytes, 0) != sizeof bytes) throw runtime_error("getrandom");
    string id;
    char hex[3];
    for (uint8_t b : bytes) {
        snprintf(hex, sizeof hex, "%02x", b);
        id += hex;
    }
    return id;
}

string cookieValue(const string& header, const string& name) {   // "a=1; sid=xyz" -> "xyz"
    istringstream in(header);
    string pair;
    while (getline(in, pair, ';')) {
        pair.erase(0, pair.find_first_not_of(' '));
        if (pair.rfind(name + "=", 0) == 0) return pair.substr(name.size() + 1);
    }
    return "";
}

int main() {
    unordered_map<string, string> sessions;          // session id -> user
    auto whoIs = [&](const string& cookieHeader) {
        auto it = sessions.find(cookieValue(cookieHeader, "sid"));
        return it == sessions.end() ? string("anonymous") : it->second;
    };

    string sid = newSessionId();                     // after a successful login
    sessions[sid] = "asha";
    cout << "Set-Cookie: sid=<" << sid.size() << " hex digits>; Secure; HttpOnly; SameSite=Lax\n";
    string header = "theme=dark; sid=" + sid;        // what the browser sends back
    cout << "with the cookie: " << whoIs(header) << "\n";
    cout << "without it: " << whoIs("theme=dark") << "\n";
    cout << "guessed id: " << whoIs("sid=00000000000000000000000000000000") << "\n";
    sessions.erase(sid);                             // logout
    cout << "after logout: " << whoIs(header) << "\n";
}
```

Output:

```text
Set-Cookie: sid=<32 hex digits>; Secure; HttpOnly; SameSite=Lax
with the cookie: asha
without it: anonymous
guessed id: anonymous
after logout: anonymous
```

The cookie carries nothing but a random key. With 128 random bits, guessing a live ID is hopeless, and deleting the entry ends the session at once, which is the main advantage over self-contained tokens.

#### Sessions vs tokens

| | server-side session | signed token (JWT) |
|---|---|---|
| where the data lives | server store, keyed by ID | inside the token |
| lookup per request | yes | no, just verify the signature |
| revoke immediately | delete the entry | hard: wait for expiry or keep a deny list |
| size in each request | small ID | larger |
| scaling | shared store or sticky sessions | any server with the key |

Many systems combine them: a short-lived access token plus a server-tracked refresh token.

#### Attacks and defenses

- **Session hijacking**: stolen IDs (sniffed over plain HTTP, read by an XSS script) let attackers act as the user. Defenses: `Secure`, `HttpOnly`, HTTPS everywhere, short idle timeouts.
- **Session fixation**: an attacker plants a known ID before the victim logs in. Defense: issue a new ID on login.
- **CSRF**: another site makes the browser send a request with the cookie attached. Defenses: `SameSite`, CSRF tokens.

Connects to: HTTP basics, OAuth and JWT basics, common attacks, CORS, stateless services.

### questions
Q: How do cookies let a server keep state over stateless HTTP?
A: The server sends a Set-Cookie header, the browser stores the value and automatically sends it back in the Cookie header on later requests to that site. Usually the value is a random session ID that the server uses to look up the user's data in its session store.

Q: What do the HttpOnly, Secure and SameSite attributes do?
A: HttpOnly hides the cookie from JavaScript, so an XSS script cannot read it. Secure sends it only over HTTPS. SameSite controls whether cross-site requests include the cookie: Strict never, Lax only on top-level navigations, None always but only with Secure. It is a main defense against CSRF.

Q: What are the trade-offs between server-side sessions and JWTs?
A: Server-side sessions keep data on the server behind a random ID, so they can be revoked instantly, but each request needs a lookup in a store shared by all servers. JWTs carry signed claims, so any server can verify them without a lookup, but they are larger and hard to revoke before they expire.

Q: How do you handle sessions across many servers?
A: Store sessions in a shared store such as Redis or a database that every server can reach, or use sticky sessions so the load balancer always sends a user to the same server. Sticky sessions are simpler but lose sessions when a server fails and can unbalance load. Stateless tokens avoid the problem altogether.

Q: What is session fixation and how is it prevented?
A: An attacker gets a victim to use a session ID the attacker already knows, for example through a crafted link, and after the victim logs in the attacker uses the same ID. Issuing a fresh session ID at login, and ignoring IDs the server did not create, prevents it.

## cn.application.http-1-1-vs-http-2-vs-http-3
name: "HTTP/1.1 vs HTTP/2 vs HTTP/3"
importance: must
prereqs: [cn.application.http-basics]
scope: "keep-alive, multiplexing, QUIC"

### simple
All three versions carry the same requests and responses; they differ in how they pack them onto the network. HTTP/1.1 sends one request at a time per connection, HTTP/2 mixes many requests on one connection, and HTTP/3 does the same over QUIC so one lost packet does not hold up everything. It is like moving from one checkout lane per shopper, to one lane serving many shoppers at once, to lanes that never block each other.

### interview
- **HTTP/1.0**: a new TCP connection per request. **HTTP/1.1** (1997): **persistent connections** (keep-alive) by default, the required `Host` header, chunked transfer encoding, caching headers. Still **one request at a time** per connection (pipelining existed but was rarely enabled), so browsers open about **6 connections per host**. Text headers are repeated on every request.
- **HTTP/2** (2015): **binary framing**; many concurrent **streams multiplexed** over **one TCP connection**; **HPACK** header compression; stream priorities; server push (since dropped by browsers). Removes HTTP-level head-of-line blocking but not TCP's.
- **HTTP/3** (2022): HTTP over **QUIC** on UDP. Independent streams (a lost packet stalls one stream only), **1-RTT** setup with TLS 1.3 built in, 0-RTT on resumption, **connection migration**, QPACK header compression.
- Semantics (methods, status codes, headers) are the same in all three; only the wire format and transport change.
- Negotiation: HTTP/2 through **ALPN** in the TLS handshake; HTTP/3 is advertised with an `Alt-Svc` header or DNS HTTPS records, and browsers fall back to TCP if UDP is blocked.
- Old HTTP/1.1 tricks (domain sharding, sprite sheets, bundling everything) hurt under HTTP/2, where one connection is best.

### deep
#### The same request, three ways

- **HTTP/1.1** sends text: `GET /app.js HTTP/1.1`, then headers, one after another on the connection. The next request waits until this response ends.
- **HTTP/2** splits each request and response into **frames** tagged with a stream ID (HEADERS and DATA frames). Frames from many streams interleave on one TCP connection, and repeated headers (cookies, user agent) are sent as small references into a shared table.
- **HTTP/3** sends the same kind of frames on QUIC streams, each delivered independently.

#### Worked example: loading a page with 30 small files

Assume a 50 ms round trip, bandwidth not the limit, and files that each take one round trip to fetch. With HTTP/1.1, the browser uses 6 connections, assumed already open in parallel.

| step | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| handshakes (transport + TLS 1.3) | 2 RTT | 2 RTT | 1 RTT |
| fetch the HTML | 1 RTT | 1 RTT | 1 RTT |
| fetch 30 files | ⌈30 / 6⌉ = 5 RTT | 1 RTT (all multiplexed) | 1 RTT |
| total | 8 RTT = 400 ms | 4 RTT = 200 ms | 3 RTT = 150 ms |

Real pages are messier (dependencies, bandwidth, server time), but the shape holds: multiplexing removes the queueing of requests, and QUIC removes a handshake round trip.

#### When packets are lost

HTTP/2's single TCP connection is a weakness under loss: one lost segment stalls every stream, while six HTTP/1.1 connections would only stall one. On lossy mobile networks HTTP/2 can be slower than HTTP/1.1. HTTP/3 fixes this with independent QUIC streams, and QUIC's connection IDs let downloads survive a switch from Wi-Fi to cellular.

#### Comparison

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| transport | TCP | TCP | QUIC over UDP |
| format | text | binary frames | binary frames |
| concurrency per connection | one request at a time | many streams | many independent streams |
| header compression | none | HPACK | QPACK |
| head-of-line blocking | HTTP and TCP level | TCP level only | none across streams |
| encryption | optional | effectively required (browsers) | always (TLS 1.3 built in) |
| setup with TLS | 2 to 3 RTT | 2 to 3 RTT | 1 RTT, 0 on resumption |

#### Keep-alive

Even HTTP/1.1's persistent connections were a big win over 1.0: no new TCP and TLS handshake per request, and TCP's congestion window stays warm. Servers close idle connections after a timeout, and clients reuse connections from a pool.

#### Pitfalls

- Saying HTTP/2 removes all head-of-line blocking: only HTTP's.
- Keeping HTTP/1.1 workarounds such as many subdomains: under HTTP/2 they add DNS lookups and handshakes and split what should share one connection.
- Assuming HTTP/3 is always available: corporate networks often block UDP 443, so clients must fall back.

Connects to: HTTP basics, head-of-line blocking, QUIC, HTTPS and TLS, TCP congestion control.

### questions
Q: What did HTTP/1.1 add over HTTP/1.0?
A: Persistent connections by default, so many requests reuse one TCP connection, the mandatory Host header that lets one IP address host many sites, chunked transfer encoding for responses of unknown length, and richer caching and content negotiation headers.

Q: What are the main improvements in HTTP/2?
A: A binary framing layer that multiplexes many concurrent request and response streams over a single TCP connection, header compression with HPACK, and stream prioritization. It removes HTTP-level head-of-line blocking and the need for many parallel connections.

Q: Why was HTTP/3 created if HTTP/2 already multiplexes?
A: HTTP/2 multiplexes over one TCP connection, so a single lost packet blocks all streams until it is retransmitted. HTTP/3 runs over QUIC, whose streams are independent, and also cuts connection setup to one round trip and supports connection migration.

Q: How does a browser know a server supports HTTP/2 or HTTP/3?
A: HTTP/2 is negotiated during the TLS handshake with ALPN, where the client lists supported protocols and the server picks one. HTTP/3 is advertised by the server in an Alt-Svc response header or a DNS HTTPS record, after which the browser tries QUIC and falls back to TCP if it fails.

Q: Why can domain sharding hurt performance under HTTP/2?
A: Sharding spread files across several hostnames to get more HTTP/1.1 connections. With HTTP/2 one connection can carry everything, so extra hostnames only add DNS lookups, TCP and TLS handshakes, and separate congestion windows that each start slow.

## cn.application.https-and-tls
name: "HTTPS and TLS"
importance: must
prereqs: [cn.application.http-basics]
scope: "TLS handshake, certificates, encryption in transit"

### simple
HTTPS is HTTP sent inside a TLS tunnel, which encrypts the conversation and proves you are talking to the real website. During a quick handshake, the browser checks the site's certificate, like checking an ID card issued by a trusted office, and both sides agree on a secret key nobody else can learn. After that, everything they send is scrambled for outsiders and cannot be changed without detection.

### interview
- TLS gives three things: **confidentiality** (encryption), **integrity** (tampering is detected) and **authentication** of the server (and optionally the client) through **certificates**.
- **TLS 1.3 handshake (1 RTT)**: ClientHello (supported ciphers, a **key share**, **SNI** hostname, ALPN) → ServerHello (its key share) plus, already encrypted, the certificate, a signature over the handshake (CertificateVerify) and Finished → client verifies and sends Finished. Resumed sessions can send **0-RTT** data (replayable).
- **Key exchange** with ephemeral (EC)**Diffie-Hellman** gives **forward secrecy**: stealing the server's private key later does not decrypt old traffic. The certificate's key only **signs**; it does not encrypt the session key (TLS 1.2's RSA key exchange did, and lacked forward secrecy).
- Bulk data uses fast **symmetric AEAD** ciphers (AES-GCM, ChaCha20-Poly1305) with keys derived from the shared secret.
- The browser validates the certificate: the name matches the host, the chain leads to a trusted **root CA**, it is within its dates and not revoked.
- Not hidden: IP addresses, the SNI hostname (unless Encrypted Client Hello is used), timing and sizes. **HSTS** makes browsers refuse plain HTTP for a site, blocking downgrade tricks.

### deep
#### Intuition

Two strangers want a private conversation in a crowded room where anyone can listen and even tamper. Diffie-Hellman lets them agree on a secret by exchanging public values in the open. A certificate, signed by an authority the browser already trusts, proves that the other side is really the bank and not someone in the middle.

#### The TLS 1.3 handshake

```text
client                                           server
ClientHello: TLS 1.3, cipher suites,
  key share (g^a), SNI "shop.example.com", ALPN h2     ->
                         <-  ServerHello: chosen suite, key share (g^b)
                             [encrypted from here on]
                             Certificate chain
                             CertificateVerify (signature over the handshake so far)
                             Finished (MAC over the handshake)
check certificate and signature
Finished                                               ->
GET / (encrypted application data)                     ->
```

Both sides compute the shared secret $g^{ab}$ from their own private value and the other's public share, and derive traffic keys from it. The server's signature ties the key exchange to its certificate, so a man in the middle cannot substitute its own key share without failing the check.

#### Worked example: Diffie-Hellman with tiny numbers

Real TLS uses elliptic curves with 256-bit keys; the arithmetic idea is the same.

```cpp
uint64_t powMod(uint64_t base, uint64_t exp, uint64_t mod) {
    uint64_t result = 1;
    base %= mod;
    for (; exp; exp >>= 1, base = base * base % mod)
        if (exp & 1) result = result * base % mod;
    return result;
}

int main() {
    const uint64_t p = 23, g = 5;                    // public: a prime and a generator
    uint64_t a = 6, b = 15;                          // private: never sent
    uint64_t A = powMod(g, a, p), B = powMod(g, b, p);   // public shares, sent in the clear
    cout << "client sends " << A << ", server sends " << B << "\n";
    cout << "client computes " << powMod(B, a, p) << ", server computes " << powMod(A, b, p)
         << "\n";
}
```

Output:

```text
client sends 8, server sends 19
client computes 2, server computes 2
```

An eavesdropper sees 23, 5, 8 and 19 but would need to solve the discrete logarithm to find 6 or 15. With 23 that is trivial; with the sizes TLS uses it is infeasible. Because `a` and `b` are fresh for every connection and then discarded, recorded traffic stays safe even if the server's long-term key leaks later: forward secrecy.

#### Certificate checks

1. The certificate's subject alternative names include the host being visited (`shop.example.com`, or a wildcard like `*.example.com`).
2. Each certificate in the chain is signed by the next, ending at a root CA in the browser's or operating system's trust store.
3. The current date is within the validity period, and the certificate is not revoked (OCSP stapling or revocation lists).

Any failure produces the full-page browser warning; clicking through defeats the protection.

#### TLS 1.2 vs 1.3

TLS 1.3 needs one round trip instead of two, removes weak options (RSA key exchange, CBC-mode ciphers, SHA-1 signatures, compression), always provides forward secrecy, and encrypts the certificate so observers cannot see which certificate the server sent.

#### Pitfalls

- HTTPS protects data in transit, not on the server or in the browser: XSS and SQL injection work just as well over HTTPS.
- Mixed content (HTTP scripts on an HTTPS page) reopens the hole; browsers block it.
- Disabling certificate verification in client code "to make it work" silently allows any man in the middle.

Connects to: symmetric vs asymmetric encryption, certificates and certificate authorities, hashing and digital signatures, what happens when you type a URL, QUIC.

### questions
Q: Walk through the TLS 1.3 handshake.
A: The client sends ClientHello with supported cipher suites, a Diffie-Hellman key share and the server name. The server replies with ServerHello and its key share; both now derive the handshake keys. Encrypted, the server sends its certificate, a signature over the handshake proving it holds the certificate's private key, and a Finished message. The client verifies them, sends Finished, and application data flows, all after one round trip.

Q: What is forward secrecy and how does TLS achieve it?
A: Forward secrecy means recorded traffic cannot be decrypted later even if the server's long-term private key is stolen. TLS achieves it with ephemeral Diffie-Hellman: each connection uses fresh key shares that are discarded afterwards, and the certificate key is only used to sign the handshake.

Q: Why does TLS use both asymmetric and symmetric cryptography?
A: Asymmetric cryptography, meaning Diffie-Hellman key exchange and certificate signatures, lets strangers agree on a secret and authenticate each other, but it is slow. Symmetric ciphers such as AES-GCM are fast enough for bulk data, so the handshake establishes shared keys and the rest of the session uses symmetric encryption.

Q: What does a browser check in a server certificate?
A: That the host name matches one of the certificate's names, that the chain of signatures leads to a trusted root certificate authority, that it is within its validity dates, and that it has not been revoked. If any check fails, the browser warns and does not proceed by default.

Q: What does HTTPS not protect?
A: It does not hide the IP addresses, the domain name in SNI unless Encrypted Client Hello is used, or the timing and size of traffic. It does not protect data once it reaches the server or the browser, so application flaws like XSS or SQL injection remain possible.

## cn.application.rest-principles
name: "REST principles"
importance: must
prereqs: [cn.application.http-basics]
scope: "resources, verbs, idempotency, statelessness"

### simple
REST is a style for designing web APIs around resources, the things your app deals with, like users or orders, each with its own address. You act on them with the standard HTTP methods: GET to read, POST to create, PUT or PATCH to change, DELETE to remove. It is like a library where every book has a shelf number and everyone uses the same few actions to borrow, return or look up any book.

### interview
- **Resources** are nouns with URIs: `/users`, `/users/42`, `/users/42/orders`. Use plural nouns and nesting for ownership; keep verbs out of paths (the method is the verb).
- **Uniform interface**: standard methods with standard meaning; representations (usually JSON) in bodies; standard status codes (201 with `Location` after create, 204 after delete, 404, 409, 422).
- **Stateless**: every request carries its own authentication and context; the server keeps no client session between requests, so it scales horizontally.
- **Idempotency**: GET, PUT and DELETE can be retried safely; POST cannot, so APIs accept an **idempotency key** header to make retried creates safe (payments).
- Also part of REST: **cacheable** responses (`Cache-Control`, `ETag`), a layered system (clients cannot tell proxies from servers), client-server separation; hypermedia links (HATEOAS) are rarely used in practice.
- Practical design: pagination (cursor-based scales better than offset), filtering and sorting through query parameters, versioning (`/v1/` or a header), consistent error bodies.

### deep
#### Intuition

REST borrows the web's own design for APIs. The web works at huge scale because everything is a resource with a URL, every client understands the same few methods, and caches and proxies can help without understanding the application. An API designed the same way inherits those properties.

#### Designing the endpoints

| action | method and path | success |
|---|---|---|
| list orders of user 42 | GET `/users/42/orders?status=open&limit=20` | 200 |
| read one order | GET `/orders/981` | 200 |
| create an order | POST `/users/42/orders` | 201, `Location: /orders/982` |
| replace an order | PUT `/orders/981` | 200 or 204 |
| change the status only | PATCH `/orders/981` with `{"status": "shipped"}` | 200 |
| cancel (delete) | DELETE `/orders/981` | 204 |

Avoid `POST /createOrder` or `GET /deleteOrder?id=981`: the verb belongs in the method, and a GET must never change data (crawlers and prefetchers follow GET links).

#### Worked example: idempotency in practice

```cpp
struct Api {
    map<int, string> users;
    map<string, int> seenKeys;                      // idempotency key -> the user it created
    int nextId = 1;

    string handle(const string& method, const string& path, const string& body = "",
                  const string& key = "") {
        if (method == "POST" && path == "/users") {
            if (!key.empty() && seenKeys.count(key))
                return "200 user " + to_string(seenKeys[key]) + " (same result as before)";
            int id = nextId++;
            users[id] = body;
            if (!key.empty()) seenKeys[key] = id;
            return "201 created /users/" + to_string(id);
        }
        int id = stoi(path.substr(path.rfind('/') + 1));   // /users/<id>
        if (method == "GET") return users.count(id) ? "200 " + users[id] : "404";
        if (method == "PUT") {
            bool existed = users.count(id);
            users[id] = body;
            return (existed ? "200 " : "201 ") + body;
        }
        if (method == "DELETE") return users.erase(id) ? "204" : "404";
        return "405";
    }
};

int main() {
    Api api;
    auto call = [&](const string& m, const string& p, const string& b = "", const string& k = "") {
        cout << left << setw(7) << m << setw(10) << p << setw(7) << b << "-> "
             << api.handle(m, p, b, k) << "\n";
    };
    call("POST", "/users", "asha");                 // a client times out and retries...
    call("POST", "/users", "asha");                 // ...creating a duplicate
    call("PUT", "/users/1", "ravi");
    call("PUT", "/users/1", "ravi");                // same state after the retry
    call("DELETE", "/users/2");
    call("DELETE", "/users/2");                     // different code, same state: still gone
    call("POST", "/users", "meera", "k-77");        // with an idempotency key...
    call("POST", "/users", "meera", "k-77");        // ...the retry is harmless
    call("GET", "/users/3");
}
```

Output:

```text
POST   /users    asha   -> 201 created /users/1
POST   /users    asha   -> 201 created /users/2
PUT    /users/1  ravi   -> 200 ravi
PUT    /users/1  ravi   -> 200 ravi
DELETE /users/2         -> 204
DELETE /users/2         -> 404
POST   /users    meera  -> 201 created /users/3
POST   /users    meera  -> 200 user 3 (same result as before)
GET    /users/3         -> 200 meera
```

A retried POST created a duplicate user; PUT and DELETE retries did not change the outcome. Idempotency is about the server's **state**, not the response: the second DELETE returns 404, but the user is gone either way. With an idempotency key, the server remembers the first result and returns it for the retry, which is how payment APIs avoid charging twice.

#### Statelessness and caching

Each request carries its credentials (a token or session cookie) and all parameters, so any server instance can serve it. GET responses can carry `Cache-Control` and an `ETag`; a client revalidates with `If-None-Match` and gets a cheap 304 when nothing changed.

#### Pagination

Offset pagination (`?offset=10000&limit=20`) is simple, but the database still walks past 10,000 rows, and inserts shift pages. **Cursor** pagination (`?after=order_981&limit=20`) continues from the last seen key using an index, and stays stable as data changes.

#### REST vs alternatives

- **GraphQL**: one endpoint; the client asks for exactly the fields it needs. Good for varied front ends; harder to cache at the HTTP level.
- **gRPC**: binary Protocol Buffers over HTTP/2, generated clients, streaming. Fast for service-to-service calls; not browser-native.

Connects to: HTTP basics, cookies and sessions, OAuth and JWT basics, caching, stateless services.

### questions
Q: What are the main principles of REST?
A: Everything is a resource identified by a URI; clients use a uniform interface of standard HTTP methods and status codes on representations such as JSON; the interaction is stateless, so each request carries all needed context; responses declare whether they are cacheable; and the system can be layered with proxies and caches in between.

Q: Which HTTP methods are idempotent and why does it matter?
A: GET, HEAD, OPTIONS, PUT and DELETE are idempotent: repeating them leaves the server in the same state. POST is not, and PATCH is not guaranteed. It matters because networks fail, and clients, proxies and libraries retry idempotent requests automatically without causing duplicates.

Q: How do you make a POST safe to retry?
A: Have the client send a unique idempotency key with the request. The server stores the key with the result of the first request, and returns that stored result for any retry with the same key instead of performing the action again.

Q: How would you design endpoints for a user's orders?
A: Use nouns and nesting: GET /users/42/orders to list with query parameters for filtering and pagination, POST /users/42/orders to create and return 201 with a Location header, and GET, PUT or PATCH, and DELETE on /orders/{id} for a single order. Verbs stay out of the paths because the HTTP method is the verb.

Q: Why is cursor pagination preferred over offset pagination for large data sets?
A: With offsets, the database must skip all the earlier rows, which gets slower as the offset grows, and inserts or deletes shift the pages so items are duplicated or skipped. A cursor continues from the last seen key using an index, so each page costs the same and stays stable.

## cn.application.websockets
name: "WebSockets"
importance: important
scope: "full-duplex connections"

### simple
A WebSocket is a long-lived, two-way connection between a browser and a server, so either side can send a message at any moment. Plain HTTP is like sending letters, where the server can only answer when asked, while a WebSocket is like an open phone line. Chat apps, live scores and multiplayer games use it to push updates instantly.

### interview
- Starts as an HTTP/1.1 request with `Upgrade: websocket`, `Connection: Upgrade` and a random `Sec-WebSocket-Key`; the server answers **101 Switching Protocols** with `Sec-WebSocket-Accept` (a hash of the key), and the same TCP connection then carries WebSocket **frames** both ways.
- **Full duplex**, low overhead per message (2 to 14 bytes of framing), text or binary messages, ping and pong frames for keepalive. `wss://` runs over TLS.
- Frames from the client are **masked** with a random key, so its bytes cannot be crafted to confuse proxies and caches.
- Alternatives: **polling** (simple, wasteful), **long polling** (the server holds a request until there is news), **Server-Sent Events** (server-to-client only, over plain HTTP, reconnects automatically).
- Scaling: each client holds an open connection, so servers need to handle many idle connections (event loops), load balancers must support long-lived connections, and messages between clients on different servers go through a **pub/sub** backplane (such as Redis).

### deep
#### The handshake

```text
GET /chat HTTP/1.1
Host: chat.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

The accept value is the base64 SHA-1 hash of the key joined with a fixed string from the standard. It proves the server really speaks WebSocket rather than being a confused HTTP server.

#### Frames

```cpp
vector<uint8_t> textFrame(const string& text, const uint8_t* mask) {   // payload under 126 bytes
    vector<uint8_t> f = {0x81};                      // FIN = 1, opcode 1 = text
    f.push_back((mask ? 0x80 : 0) | text.size());    // mask bit and payload length
    if (mask) f.insert(f.end(), mask, mask + 4);
    for (size_t i = 0; i < text.size(); ++i)
        f.push_back(text[i] ^ (mask ? mask[i % 4] : 0));   // XOR with the masking key
    return f;
}

int main() {
    const uint8_t key[4] = {0x37, 0xfa, 0x21, 0x3d};
    for (auto f : {textFrame("Hello", nullptr), textFrame("Hello", key)}) {
        for (size_t i = 0; i < f.size(); ++i) printf("%s%02x", i ? " " : "", f[i]);
        printf("\n");
    }
}
```

Output:

```text
81 05 48 65 6c 6c 6f
81 85 37 fa 21 3d 7f 9f 4d 51 58
```

The first is how a server sends "Hello" (7 bytes in all); the second is how a client must send it, masked. Both match the examples in the WebSocket standard. An HTTP request for the same five bytes would carry hundreds of bytes of headers.

#### Choosing a push technique

| technique | direction | cost | good for |
|---|---|---|---|
| polling | client asks every few seconds | wasted requests, delayed updates | rare changes, simplicity |
| long polling | client asks, server answers when news arrives | one request per update | fallback when others fail |
| Server-Sent Events | server to client | one open HTTP response | feeds, notifications, progress |
| WebSocket | both ways | one open connection, custom protocol | chat, games, collaboration |

Connects to: HTTP basics, TCP vs UDP, load balancers, NAT, HTTP/1.1 vs HTTP/2 vs HTTP/3.

### questions
Q: How is a WebSocket connection established?
A: The client sends an HTTP/1.1 GET with Upgrade: websocket, Connection: Upgrade and a random Sec-WebSocket-Key. The server replies 101 Switching Protocols with Sec-WebSocket-Accept, a hash derived from the key, and from then on the same TCP connection carries WebSocket frames in both directions.

Q: When would you choose WebSockets over plain HTTP requests?
A: When the server must push data to the client as soon as it happens, or both sides exchange frequent small messages, such as chat, live dashboards, collaborative editing and multiplayer games. For occasional updates or one-way server-to-client streams, polling or Server-Sent Events are simpler.

Q: What makes WebSockets harder to scale than regular HTTP?
A: Each client keeps a long-lived connection, so servers must hold many open connections, load balancers must support them, and deploys must drain them. Clients connected to different servers need a shared pub/sub system to exchange messages, and reconnection logic must handle dropped connections.

Q: What is the difference between WebSockets and Server-Sent Events?
A: WebSockets are full duplex with their own framing after an HTTP upgrade, and carry text or binary data. Server-Sent Events are one-way from server to client over a normal long-lived HTTP response with text events, and browsers reconnect them automatically.

## cn.application.email-protocols
name: "Email protocols"
importance: important
scope: "SMTP, POP3, IMAP"

### simple
Email uses one protocol to send messages and another to read them. SMTP carries a message from your app to your mail server and from server to server, like postal vans moving letters between post offices. IMAP or POP3 lets you collect mail from your server's mailbox, like picking it up from your post office box.

### interview
- **SMTP** (Simple Mail Transfer Protocol) **sends** and **relays** mail. Clients submit on port **587** (with authentication, STARTTLS) or 465 (TLS from the start); servers relay to each other on port **25**.
- The sending server finds the recipient's server with a **DNS MX lookup** for the domain after the `@`.
- **POP3** (port 110, 995 with TLS) **downloads** messages, traditionally deleting them from the server: one device, offline copies.
- **IMAP** (port 143, 993 with TLS) keeps mail **on the server** with folders, flags and search, and **syncs** across devices. Most people use IMAP or a provider's own API.
- Sender authentication against spoofing: **SPF** (which servers may send for a domain, a DNS TXT record), **DKIM** (a signature over the message, public key in DNS), **DMARC** (policy for failures and reports).
- Messages are text with headers (From, To, Subject, Date) and MIME parts for attachments and HTML.

### deep
#### Following one message

`asha@example.com` writes to `ravi@example.org`:

1. Asha's mail app submits the message to her provider's server over SMTP on port 587, after logging in.
2. That server looks up the MX record of `example.org`, finds `mx.example.org`, and relays the message to it over SMTP on port 25 (usually with STARTTLS).
3. The receiving server checks SPF, DKIM and DMARC, filters spam, and stores the message in Ravi's mailbox.
4. Ravi's phone and laptop both read it over IMAP; marking it read on one shows as read on the other.

#### An SMTP conversation

SMTP is a text protocol of commands and three-digit replies:

```text
S: 220 mx.example.org ESMTP ready
C: EHLO mail.example.com
S: 250-mx.example.org hello
S: 250 STARTTLS
C: MAIL FROM:<asha@example.com>
S: 250 OK
C: RCPT TO:<ravi@example.org>
S: 250 OK
C: DATA
S: 354 End data with <CR><LF>.<CR><LF>
C: Subject: Lunch?
C:
C: Are you free on Friday?
C: .
S: 250 OK: queued
C: QUIT
S: 221 Bye
```

The envelope (`MAIL FROM`, `RCPT TO`) decides delivery; the `From:` header inside the message is what the reader sees, and the two can differ, which is why SPF, DKIM and DMARC exist.

#### POP3 vs IMAP

| | POP3 | IMAP |
|---|---|---|
| where mail lives | downloaded to the device | on the server |
| several devices | poorly (each downloads its own copy) | yes, synced state |
| folders, flags, search | local only | on the server |
| offline use | full | cached copies |

Connects to: DNS, TCP vs UDP, HTTPS and TLS, hashing and digital signatures.

### questions
Q: What is the difference between SMTP, POP3 and IMAP?
A: SMTP sends mail, from a client to its server and between servers. POP3 and IMAP retrieve mail from a mailbox: POP3 downloads messages to one device, traditionally removing them from the server, while IMAP keeps them on the server with folders and flags, synchronized across all devices.

Q: How does a mail server know where to deliver a message?
A: It takes the domain after the at sign in the recipient's address and looks up its MX records in DNS, which list the domain's mail servers with priorities. It connects to the preferred one over SMTP and relays the message.

Q: What are SPF, DKIM and DMARC?
A: SPF is a DNS record listing which servers may send mail for a domain. DKIM adds a cryptographic signature to messages, verified with a public key published in DNS. DMARC tells receivers what to do when these checks fail and where to send reports, which together make spoofing a domain much harder.

Q: Why are there different SMTP ports?
A: Port 25 is for server-to-server relay. Port 587 is for mail clients submitting messages, with authentication and STARTTLS upgrading to encryption. Port 465 is submission with TLS from the first byte.

## cn.application.ftp-and-ssh
name: "FTP and SSH"
importance: important
scope: "file transfer and secure shell"

### simple
FTP is an old protocol for moving files between computers, and SSH is the secure way to log in to a remote machine and run commands on it. FTP sends everything, even passwords, as readable text, like shouting across a room. SSH encrypts the whole session, like talking through a private sealed tube, and can also copy files safely.

### interview
- **FTP**: a **control connection** on port 21 for commands (USER, PASS, LIST, RETR, STOR) and a separate **data connection** per transfer. **Active mode**: the server connects back to the client (from port 20), which breaks behind NAT and firewalls. **Passive mode**: the client opens the data connection to a port the server names; the usual choice today.
- FTP sends credentials and data **in plain text**. Secure options: **FTPS** (FTP over TLS) and **SFTP** (a different protocol running inside SSH).
- **SSH** (port 22): encrypted remote login and command execution. The server proves its identity with a **host key** (the client remembers it in `known_hosts`; a changed key triggers a warning). Users authenticate with passwords or, better, **key pairs** (the public key in the server's `authorized_keys`).
- SSH extras: `scp` and `sftp` for files, **port forwarding** (`-L` local, `-R` remote tunnels), jump hosts, agent forwarding.
- Its handshake mirrors TLS: key exchange with Diffie-Hellman, then symmetric encryption and integrity checks.

### deep
#### FTP's two connections

```text
client                                   server
  :51000  --- control, port 21 --->      USER, PASS, PASV, RETR report.pdf
          <-- "227 Entering Passive Mode (…,195,80)" (data port 195*256+80 = 50000)
  :51001  --- data, port 50000 --->      the file's bytes, then the data connection closes
```

In passive mode both connections are opened by the client, so they pass through the client's NAT. The server's reply writes the port as two bytes, high and low. Because the control connection carries IP addresses and ports inside its text, NATs and firewalls need special helpers for FTP, one reason it has faded.

#### SSH authentication with keys

1. The user generates a key pair and copies the **public** key to `~/.ssh/authorized_keys` on the server.
2. At login, after the encrypted channel is set up, the server challenges the client, and the client signs data tied to this session with its **private** key.
3. The server verifies the signature with the stored public key. The private key never leaves the client, and there is no password to phish or guess.

The first connection to a new server shows its host key fingerprint ("trust on first use"). If the fingerprint later changes, SSH refuses loudly: either the server was reinstalled or someone is in the middle.

#### Tunnels

`ssh -L 5432:db.internal:5432 bastion` makes port 5432 on your laptop reach a database that only the bastion host can see, with the traffic encrypted inside SSH. `-R` does the reverse, exposing a local port on the remote machine.

Connects to: HTTPS and TLS, symmetric vs asymmetric encryption, ports and sockets, NAT, firewalls, VPNs and proxies.

### questions
Q: Why does FTP use two connections?
A: One control connection on port 21 carries commands and replies for the whole session, and a separate data connection is opened for each file transfer or directory listing. Separating them keeps commands responsive, but it complicates NAT and firewalls, especially in active mode where the server connects back to the client.

Q: What is the difference between active and passive FTP?
A: In active mode, the client tells the server a port and the server opens the data connection back to the client, which firewalls and NATs usually block. In passive mode, the server tells the client a port and the client opens the data connection, so both connections are outbound from the client.

Q: How does SSH public key authentication work?
A: The user's public key is stored in the server's authorized_keys file. During login the client proves it holds the matching private key by signing data unique to the session, and the server checks the signature with the public key. The private key never leaves the client.

Q: What is the difference between SFTP and FTPS?
A: FTPS is classic FTP with TLS added, keeping FTP's separate control and data connections. SFTP is an unrelated file transfer protocol that runs as a subsystem inside an SSH connection on port 22, using SSH's encryption and authentication.

## cn.application.what-happens-when-you-type-a-url
name: "What happens when you type a URL"
importance: must
prereqs: [cn.transport.tcp-three-way-handshake-and-four-way-teardown, cn.application.dns, cn.application.http-basics, cn.application.https-and-tls]
scope: "DNS, TCP, TLS, HTTP, rendering, end to end"

### simple
When you type an address and press Enter, the browser finds the server's IP address with DNS, opens a connection to it, sets up encryption, asks for the page with HTTP, and then draws what comes back on the screen. It is like calling a shop: look up the number, dial and wait for an answer, agree to speak privately, place your order, and unpack the delivery. All of this usually takes well under a second.

### interview
- **Parse** the input: URL or search term; add the scheme (browsers try `https` first; HSTS forces it); split host, port, path and query.
- **Caches first**: a service worker or the HTTP cache may answer without the network.
- **DNS**: browser cache, operating system cache and hosts file, then the recursive resolver, which may walk root → TLD → authoritative servers. Result: an IP address.
- **Connect**: TCP three-way handshake (1 RTT) and TLS 1.3 handshake (1 RTT) with certificate validation, SNI and ALPN (h2); or a single QUIC handshake for HTTP/3.
- **Request and response**: `GET /` with Host, cookies, Accept headers. On the server side: CDN or load balancer → reverse proxy → application servers → caches and databases. The response may be a redirect (301 to `https` or `www`), then HTML.
- **Render**: parse HTML into the DOM, CSS into the CSSOM, run JavaScript, build the render tree, **layout**, **paint**, **composite**. Sub-resources (CSS, JS, images, fonts) are fetched in parallel, over the same HTTP/2 connection when possible.
- Interview tip: go end to end first, then go deep wherever the interviewer steers (DNS caching, TLS, load balancing, rendering).

### deep
#### Step 1: understand the input

```cpp
struct Url { string scheme, host, port, path, query, fragment; };

Url parse(string s) {                                 // a teaching parser: no user info or IPv6
    Url u;
    if (size_t i = s.find('#'); i != string::npos) { u.fragment = s.substr(i + 1); s.erase(i); }
    if (size_t i = s.find('?'); i != string::npos) { u.query = s.substr(i + 1); s.erase(i); }
    if (size_t i = s.find("://"); i != string::npos) {
        u.scheme = s.substr(0, i);
        s.erase(0, i + 3);
    } else {
        u.scheme = "https";                           // typed without a scheme: try https
    }
    size_t slash = s.find('/');
    string authority = s.substr(0, slash);
    u.path = slash == string::npos ? "/" : s.substr(slash);
    if (size_t i = authority.find(':'); i != string::npos) {
        u.port = authority.substr(i + 1);
        authority.erase(i);
    } else {
        u.port = u.scheme == "https" ? "443" : "80";  // default ports
    }
    u.host = authority;
    return u;
}

int main() {
    cout << "scheme | host | port | path | query | fragment\n";
    for (string s : {"https://shop.example.com:8443/search?q=lamp&page=2#reviews",
                     "example.com/news"}) {
        Url u = parse(s);
        cout << u.scheme << " | " << u.host << " | " << u.port << " | " << u.path << " | "
             << (u.query.empty() ? "-" : u.query) << " | "
             << (u.fragment.empty() ? "-" : u.fragment) << "\n";
    }
}
```

Output:

```text
scheme | host | port | path | query | fragment
https | shop.example.com | 8443 | /search | q=lamp&page=2 | reviews
https | example.com | 443 | /news | - | -
```

The fragment never leaves the browser; it only picks a spot on the page.

#### Step 2 to 5 on a timeline

Assume a 40 ms round trip, nothing cached, and TLS 1.3 over TCP:

| step | what happens | cost |
|---|---|---|
| DNS | resolver cache miss: root, com and authoritative servers asked (their answers are often cached) | 1 RTT to the resolver, plus its own lookups |
| TCP | SYN, SYN-ACK, ACK | 1 RTT |
| TLS | ClientHello with SNI and ALPN; ServerHello, certificate, Finished; the browser checks the chain and name | 1 RTT |
| HTTP | `GET /` with cookies; the server works; the first bytes return | 1 RTT + server time |
| total to first byte | | about 4 RTT = 160 ms + server time |

A redirect (such as `example.com` to `www.example.com`) can add a full DNS, TCP and TLS cycle, which is why sites avoid redirect chains. A CDN edge nearby shrinks every RTT in the table.

#### Step 4 in more depth: the server side

The IP address usually belongs to a CDN edge or a load balancer, not a single machine. It terminates TLS, serves cached static files directly, and forwards other requests to a reverse proxy and application servers. Those check the session cookie, read from caches and databases, render or assemble JSON, and send the response back through the same chain, often compressed with gzip or Brotli.

#### Step 6: from bytes to pixels

1. **Parse HTML** into the DOM as bytes stream in. A `<link rel=stylesheet>` or `<script>` triggers more requests; plain scripts block parsing unless marked `defer` or `async`.
2. **Parse CSS** into the CSSOM. Rendering waits for CSS, so pages do not flash unstyled.
3. **Render tree**: visible DOM nodes with their computed styles.
4. **Layout**: compute each box's position and size.
5. **Paint** pixels into layers, then **composite** the layers on the GPU.
6. JavaScript runs, may fetch more data and change the DOM, triggering further layout and paint.

The connection stays open (keep-alive or HTTP/2) for the page's other requests, and responses are cached according to their headers for the next visit.

#### What to emphasize in an interview

Mention the caches at every stage, the round trips (and how HTTP/2, TLS 1.3, QUIC and CDNs cut them), what TLS verifies, and what the server side looks like at scale. Then follow the interviewer: every step here is its own topic.

Connects to: DNS, TCP three-way handshake and four-way teardown, HTTPS and TLS, HTTP basics, CDNs, load balancers.

### questions
Q: What happens when you type a URL into the browser and press Enter?
A: The browser parses the URL and checks its caches. It resolves the host name through DNS, opens a TCP connection and performs a TLS handshake, verifying the certificate, or does a QUIC handshake for HTTP/3. It sends an HTTP GET with headers and cookies; the request passes through CDNs, load balancers and application servers, and the response returns. The browser then parses the HTML and CSS, runs JavaScript, fetches sub-resources, and lays out and paints the page.

Q: How many round trips does it take to get the first byte of a new HTTPS page?
A: With TLS 1.3 over TCP: about one for DNS if the resolver has the answer cached, one for the TCP handshake, one for TLS and one for the HTTP request, so roughly four, plus server time. TLS 1.2 adds one more, HTTP/3 removes one, and caches or reused connections remove more.

Q: Where can caching short-circuit this process?
A: The browser's HTTP cache or a service worker can answer without any network request. DNS answers are cached in the browser, the operating system and resolvers. A CDN edge can serve the response without reaching the origin, and application caches can avoid database work on the server.

Q: Why do render-blocking CSS and scripts matter?
A: The browser cannot paint until it has the CSS needed to style the page, and a plain script tag stops HTML parsing until the script downloads and runs. Inlining critical CSS and marking scripts defer or async lets the first paint happen sooner.

Q: What does the browser check before trusting the TLS connection?
A: That the certificate chain leads to a trusted root authority, that the certificate covers the host name being visited, that it is within its validity period and not revoked, and that the server proved possession of the private key by signing the handshake.
