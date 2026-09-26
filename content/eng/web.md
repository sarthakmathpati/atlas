---
topic: eng.web
name: "Web and APIs"
subject: eng
order: 4
prereqs: [cn.application]
---

## eng.web.client-server-architecture
name: "Client-server architecture"
importance: must
scope: "frontend, backend, database"

### simple
Most apps are split into three parts. The frontend is what you see and touch, such as a web page or a phone app; the backend is a program on a server that does the work and enforces the rules; the database keeps the data safe between visits. It is like a restaurant: the waiter takes your order, the kitchen cooks it, and the pantry holds the ingredients.

### interview
- **Client**: a browser page, mobile app or another service that sends requests; it shows data and collects input but is never trusted.
- **Server (backend)**: receives requests over HTTP, checks who is asking and whether the input is valid, applies business rules, reads and writes the database, and sends responses.
- **Database**: the durable source of truth; servers keep as little state as possible, so any server can answer any request and a restart loses nothing.
- **Request/response**: the client opens a TCP connection (usually with TLS), sends a method, a path, headers and maybe a body, and gets a status code, headers and a body back.
- **Why split**: each tier scales and fails separately (many stateless servers behind a load balancer, one carefully replicated database), and the rules live in one place that users can't tamper with.
- **Latency** adds up across hops: network to the server, then server to database; batch and cache to cut round trips.

### deep
#### Intuition

The client asks and the server decides. Anything running on the user's device can be changed by the user, so prices, permissions and validation must be checked on the server even if the frontend checks them too. The server in turn keeps its memory short: whatever must survive goes to the database, which is what lets you restart, upgrade or add servers freely.

#### A whole stack in one screen

A backend in C++ (sockets as in [socket programming basics](#/concept/cn.infrastructure.socket-programming-basics)), with a file as its database. It is deliberately minimal: one request per connection, no TLS, no authentication.

```cpp
// A tiny backend: HTTP/1.1 on 127.0.0.1, one request per connection, notes kept in a file.
map<int, string> notes;  // loaded from notes.db at start, written back after each change

string json(int id, const string& text) {
    string s;
    for (char ch : text) s += ch == '"' || ch == '\\' ? string("\\") + ch : string(1, ch);
    return "{\"id\":" + to_string(id) + ",\"text\":\"" + s + "\"}";
}

pair<int, string> handle(const string& method, const string& path, const string& body) {
    if (path == "/notes" && method == "GET") {
        string list;
        for (auto& [id, text] : notes) list += (list.empty() ? "" : ",") + json(id, text);
        return {200, "[" + list + "]"};
    }
    if (path == "/notes" && method == "POST" && !body.empty()) {
        int id = notes.empty() ? 1 : notes.rbegin()->first + 1;
        notes[id] = body;
        ofstream db("notes.db");
        for (auto& [k, text] : notes) db << k << '\t' << text << '\n';
        return {201, json(id, body)};
    }
    int id = path.starts_with("/notes/") ? atoi(path.c_str() + 7) : 0;
    if (method == "GET" && notes.count(id)) return {200, json(id, notes[id])};
    return {404, "{\"error\":\"not found\"}"};
}

int main() {
    ifstream db("notes.db");
    int id;
    for (string text; db >> id && db.get() && getline(db, text);) notes[id] = text;
    int server = socket(AF_INET, SOCK_STREAM, 0), on = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on);
    sockaddr_in addr{AF_INET, htons(8080), {htonl(INADDR_LOOPBACK)}, {}};
    if (bind(server, (sockaddr*)&addr, sizeof addr) || listen(server, 16)) return 1;
    fprintf(stderr, "listening on 127.0.0.1:8080, %zu notes loaded\n", notes.size());
    for (;;) {
        int client = accept(server, nullptr, nullptr);
        string req;  // read the headers, then as many body bytes as Content-Length says
        char buf[4096];
        ssize_t n = 1;
        size_t end, len = 0;
        while ((end = req.find("\r\n\r\n")) == string::npos && n > 0)
            if ((n = read(client, buf, sizeof buf)) > 0) req.append(buf, n);
        if (size_t at = req.find("Content-Length: "); at < end) len = stoul(req.substr(at + 16));
        while (n > 0 && req.size() < end + 4 + len)
            if ((n = read(client, buf, sizeof buf)) > 0) req.append(buf, n);
        string method, path;
        istringstream(req) >> method >> path;
        auto [status, body] = handle(method, path, req.substr(min(end + 4, req.size()), len));
        string out = format("HTTP/1.1 {} {}\r\nContent-Type: application/json\r\n"
                            "Content-Length: {}\r\nConnection: close\r\n\r\n{}\n", status,
                            status == 200 ? "OK" : status == 201 ? "Created" : "Not Found",
                            body.size() + 1, body);
        if (write(client, out.data(), out.size()) < 0) perror("write");
        close(client);
        fprintf(stderr, "%s %s -> %d\n", method.c_str(), path.c_str(), status);
    }
}
```

Here `curl` plays the frontend (a real one would be a web page calling the same endpoints). A recorded terminal session; the PIDs are this machine's:

```text
$ cd /work/web
$ ./notes 2> server.log &
[1] 20126
$ curl -s localhost:8080/notes
[]
$ curl -s -d 'buy milk' localhost:8080/notes
{"id":1,"text":"buy milk"}
$ curl -s -d 'call the "plumber"' localhost:8080/notes
{"id":2,"text":"call the \"plumber\""}
$ curl -i localhost:8080/notes/2
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 39
Connection: close

{"id":2,"text":"call the \"plumber\""}
$ curl -s -w 'status %{http_code}\n' localhost:8080/notes/9
{"error":"not found"}
status 404
$ kill %%
$ ./notes 2>> server.log &
[2] 20142
[1]   Terminated              ./notes 2> server.log
$ curl -s localhost:8080/notes
[{"id":1,"text":"buy milk"},{"id":2,"text":"call the \"plumber\""}]
$ cat notes.db
1	buy milk
2	call the "plumber"
$ kill %%
$ cat server.log
listening on 127.0.0.1:8080, 0 notes loaded
GET /notes -> 200
POST /notes -> 201
POST /notes -> 201
GET /notes/2 -> 200
GET /notes/9 -> 404
listening on 127.0.0.1:8080, 2 notes loaded
GET /notes -> 200
[2]+  Terminated              ./notes 2>> server.log
$ exit
exit
```

#### What the session shows

- **Every request is independent**: method and path choose the action, the body carries the data, and the status code says what happened (200 OK, 201 Created, 404 Not Found). `curl -i` shows the headers; `Content-Length` tells the client where the body ends.
- **The server escapes data** before putting it into JSON: the quotes typed by the user came back as `\"`. Output encoding like this is what stops user input from breaking a response or, in HTML, running as script.
- **State survived a restart** because it lived in `notes.db`, not in the process. The second server loaded 2 notes and answered exactly as the first would have. Two copies of this server could share one database the same way, which is the idea behind [stateless services](#/concept/sysd.scalability.stateless-services).
- **The log** records each request; real services add timings and request ids.

#### What a production version adds

A load balancer in front, TLS, authentication, input limits (body size caps, time-outs), a real database with transactions, many requests at once, and structured logs and metrics. The shape stays the same.

Connects to: [designing REST APIs](#/concept/eng.web.designing-rest-apis), [HTTP basics](#/concept/cn.application.http-basics), [what happens when you type a URL](#/concept/cn.application.what-happens-when-you-type-a-url), [stateless services](#/concept/sysd.scalability.stateless-services).

### questions
Q: What are the responsibilities of the frontend, backend and database?
A: The frontend presents data and collects input. The backend authenticates requests, validates input, applies business rules and talks to the database. The database stores data durably and consistently and is the source of truth.

Q: Why must validation happen on the server even if the frontend validates too?
A: The client runs on the user's machine, so anyone can bypass it and send any request directly, as curl does. Frontend checks are for a good experience; server checks are the ones that protect the data.

Q: Why should application servers be stateless?
A: If no request depends on memory held by one particular server, any server can handle it. That makes it easy to add servers behind a load balancer, restart or replace them, and survive a crash without losing data, because the state lives in the database or a shared cache.

Q: What happens in one request from a browser to a backend?
A: The browser resolves the name with DNS, opens a TCP connection and usually a TLS session, then sends an HTTP request with a method, path, headers and body. The server processes it, often querying the database, and returns a status code, headers and a body, which the browser renders or hands to page code.

Q: What are the costs of splitting an app into client, server and database?
A: Every hop adds latency and a way to fail, data must be serialized between tiers, and the parts must agree on interfaces and versions. In return you get independent scaling, a single trusted place for rules, and durable data.

## eng.web.designing-rest-apis
name: "Designing REST APIs"
importance: must
prereqs: [eng.web.client-server-architecture]
scope: "resources, status codes, pagination, errors"

### simple
A REST API lets programs work with a service's data through web addresses. Each kind of thing, such as orders, gets an address like `/orders`, and the HTTP method says what to do: GET reads, POST creates, PUT or PATCH changes, DELETE removes. The reply carries a status code that says how it went, like a receipt stamped "done", "not found" or "your request was wrong".

### interview
- **Resources are nouns** in the plural (`/orders`, `/orders/42`, `/users/7/orders`); methods are the verbs. Filters, sorting and paging go in the query string (`?status=open&limit=20`).
- **Method semantics**: GET is safe and idempotent; PUT (replace) and DELETE are idempotent; POST (create, or actions) is neither, so clients should send an idempotency key for retries.
- **Status codes**: 200 OK, 201 Created (with a `Location` header), 204 No Content, 400 bad input, 401 not authenticated, 403 not allowed, 404 not found, 405 wrong method (with `Allow`), 409 conflict, 422 valid syntax but invalid data, 429 too many requests, 500 server bug, 503 temporarily unavailable.
- **Errors** share one machine-readable shape, such as `{"error": {"code": "invalid_order", "message": "…"}}` (or the standard `application/problem+json`), and never leak stack traces.
- **Pagination**: offset (`?offset=40&limit=20`) is simple but slow on deep pages and skips or repeats items when data changes; cursor (`?after=<id>`) is stable and fast.
- **Evolution**: add fields, never change their meaning; version breaking changes (`/v1/…` or a header); document with a schema such as OpenAPI.

### deep
#### Intuition

A good API is predictable: once a client knows how one resource works, it can guess the rest. Uniform URLs, the standard meanings of methods and status codes, and one error format all serve that. The other half is resilience: clients retry, data changes between requests, and old clients keep calling old versions.

#### A router, exercised

The routing logic of an orders API, called directly so every response prints; over HTTP it would sit behind a server like the one in [client-server architecture](#/concept/eng.web.client-server-architecture).

```cpp
struct Order { int id; string item; int qty; };
map<int, Order, greater<>> orders;  // newest first
int lastId = 0;

struct Reply { int status; string body, header; };
string json(const Order& o) {
    return format(R"({{"id":{},"item":"{}","qty":{}}})", o.id, o.item, o.qty);
}
Reply error(int status, const string& code, const string& message, const string& header = "") {
    return {status, format(R"({{"error":{{"code":"{}","message":"{}"}}}})", code, message), header};
}
map<string, string> fields(const string& s) {  // "a=1&b=2" -> {a: 1, b: 2}
    map<string, string> f;
    istringstream in(s);
    for (string kv; getline(in, kv, '&');)
        if (auto eq = kv.find('='); eq != string::npos) f[kv.substr(0, eq)] = kv.substr(eq + 1);
    return f;
}

Reply route(const string& method, const string& target, const string& body = "") {
    string path = target.substr(0, target.find('?'));
    auto q = fields(target.find('?') == string::npos ? "" : target.substr(target.find('?') + 1));
    if (path == "/v1/orders" && method == "GET") {  // a page: ?limit=N and ?after=ID or ?offset=K
        size_t limit = q.count("limit") ? stoul(q["limit"]) : 20, skip = 0;
        auto it = q.count("after") ? orders.upper_bound(stoi(q["after"])) : orders.begin();
        if (q.count("offset")) skip = stoul(q["offset"]);
        for (; it != orders.end() && skip; ++it) --skip;
        string items, next = "null";
        for (size_t n = 0; it != orders.end() && n < limit; ++it, ++n)
            items += (items.empty() ? "" : ",") + json(it->second), next = to_string(it->first);
        if (it == orders.end()) next = "null";
        if (q.count("offset")) return {200, format(R"({{"items":[{}]}})", items), ""};
        return {200, format(R"({{"items":[{}],"next":{}}})", items, next), ""};
    }
    if (path == "/v1/orders" && method == "POST") {
        auto f = fields(body);
        if (!f.count("item") || !f.count("qty") || stoi(f["qty"]) < 1)
            return error(400, "invalid_order", "qty must be at least 1");
        Order o{++lastId, f["item"], stoi(f["qty"])};
        orders[o.id] = o;
        return {201, json(o), "Location: /v1/orders/" + to_string(o.id)};
    }
    if (path == "/v1/orders") return error(405, "method_not_allowed", method, "Allow: GET, POST");
    if (!path.starts_with("/v1/orders/")) return error(404, "not_found", path);
    int id = stoi(path.substr(11));
    if (method != "GET" && method != "DELETE")
        return error(405, "method_not_allowed", method, "Allow: GET, DELETE");
    if (!orders.count(id)) return error(404, "not_found", "no order " + to_string(id));
    if (method == "DELETE") return orders.erase(id), Reply{204, "", ""};
    return {200, json(orders[id]), ""};
}

void call(const string& method, const string& target, const string& body = "") {
    Reply r = route(method, target, body);
    string line = method + " " + target + (body.empty() ? "" : " [" + body + "]");
    line += " -> " + to_string(r.status);
    for (const string& part : {r.header, r.body})
        if (!part.empty()) line += " " + part;
    puts(line.c_str());
}

int main() {
    for (string item : {"pen", "ink", "pad"})  // three orders already exist
        route("POST", "/v1/orders", "item=" + item + "&qty=1");
    call("POST", "/v1/orders", "item=clip&qty=1");
    call("GET", "/v1/orders?limit=2");
    call("POST", "/v1/orders", "item=tape&qty=3");  // someone adds an order between pages
    call("GET", "/v1/orders?limit=2&after=3");      // page 2 by cursor
    call("GET", "/v1/orders?limit=2&offset=2");     // page 2 by offset
    call("POST", "/v1/orders", "item=glue&qty=0");
    call("GET", "/v1/orders/9");
    call("DELETE", "/v1/orders/2");
    call("DELETE", "/v1/orders/2");
    call("PUT", "/v1/orders/1", "item=pen&qty=2");
}
```

Output:

```text
POST /v1/orders [item=clip&qty=1] -> 201 Location: /v1/orders/4 {"id":4,"item":"clip","qty":1}
GET /v1/orders?limit=2 -> 200 {"items":[{"id":4,"item":"clip","qty":1},{"id":3,"item":"pad","qty":1}],"next":3}
POST /v1/orders [item=tape&qty=3] -> 201 Location: /v1/orders/5 {"id":5,"item":"tape","qty":3}
GET /v1/orders?limit=2&after=3 -> 200 {"items":[{"id":2,"item":"ink","qty":1},{"id":1,"item":"pen","qty":1}],"next":null}
GET /v1/orders?limit=2&offset=2 -> 200 {"items":[{"id":3,"item":"pad","qty":1},{"id":2,"item":"ink","qty":1}]}
POST /v1/orders [item=glue&qty=0] -> 400 {"error":{"code":"invalid_order","message":"qty must be at least 1"}}
GET /v1/orders/9 -> 404 {"error":{"code":"not_found","message":"no order 9"}}
DELETE /v1/orders/2 -> 204
DELETE /v1/orders/2 -> 404 {"error":{"code":"not_found","message":"no order 2"}}
PUT /v1/orders/1 [item=pen&qty=2] -> 405 Allow: GET, DELETE {"error":{"code":"method_not_allowed","message":"PUT"}}
```

#### What it shows

- **Create**: 201 with the new resource and a `Location` header, so the client needn't build URLs.
- **Pagination**: page 1 returned orders 4 and 3 with `"next":3`. Then order 5 arrived. Page 2 by cursor ("after 3") gave 2 and 1, correctly. Page 2 by offset skipped the two newest items of the *current* list and returned order 3 again, a duplicate the client can't detect. Cursors avoid that and use an index seek instead of skipping rows.
- **Errors**: invalid input is 400 with a code a program can branch on, a missing order 404, and a wrong method 405 with the methods that are allowed.
- **Idempotency**: deleting order 2 twice leaves the same state (gone). The second call reports 404, which is fine; some APIs return 204 again.

Connects to: [REST principles](#/concept/cn.application.rest-principles), [API design](#/concept/sysd.method.api-design), [idempotency](#/concept/sysd.messaging.idempotency-and-exactly-once-myths), [JSON and serialization](#/concept/eng.web.json-and-serialization).

### questions
Q: What makes an API RESTful?
A: Resources identified by URLs, a uniform interface through standard HTTP methods with their usual meanings, stateless requests that carry everything needed, and representations such as JSON. In practice it means predictable noun-based URLs and correct methods and status codes.

Q: Which HTTP methods are idempotent, and why does it matter?
A: GET, HEAD, PUT and DELETE are idempotent: repeating the request leaves the same server state. POST is not, so a retried POST can create a duplicate unless the client sends an idempotency key that the server remembers.

Q: What status code should creating a resource return?
A: 201 Created, with a Location header pointing to the new resource and usually the resource in the body. If the creation happens later, 202 Accepted with a way to check the status.

Q: Why prefer cursor pagination to offset pagination?
A: Offsets shift when items are added or removed between requests, so pages skip or repeat items, and the database must scan past all skipped rows. A cursor such as "after id 3" is stable and turns into an index seek.

Q: How should an API report errors?
A: With the right status code and a consistent body containing a stable machine-readable code, a human-readable message and, for validation, which field failed. Never include stack traces or internal details.

## eng.web.json-and-serialization
name: "JSON and serialization"
importance: important
scope: "JSON and serialization"

### simple
Serialization turns data in a program's memory into bytes that can be saved or sent, and deserialization turns them back. JSON is the most common text format for this on the web: objects in curly braces, lists in square brackets, strings, numbers, true, false and null. It is like writing a packing list for a parcel so whoever opens it at the other end can put everything back where it belongs.

### interview
- **JSON types**: object, array, string, number, `true`, `false`, `null`. No dates, no comments, no trailing commas, and strings must be UTF-8 with `"` and `\` escaped.
- **Numbers**: the format has no size limit, but many parsers (every JavaScript one, jq when it computes) use 64-bit doubles, exact only up to $2^{53}$. Send large ids as strings.
- **Money and time**: store amounts in the smallest unit as integers (cents) or as decimal strings, never binary floating point; send times as ISO 8601 strings with a time zone (`2026-09-01T10:00:00+05:30`).
- **Text vs binary formats**: JSON is readable and universal; binary formats such as Protocol Buffers, MessagePack or Avro are smaller and faster and carry a schema, but need tools to read.
- **Compatibility**: readers should ignore unknown fields and tolerate missing optional ones; writers add fields rather than rename or retype them.
- **Security**: validate input against a schema, cap sizes and nesting depth, and never deserialize into arbitrary types from untrusted data.

### deep
#### Intuition

Serialization is a contract between a writer and a reader who may run different code, languages and versions. Most JSON bugs are contract bugs: a number that silently loses precision, a string that isn't escaped, a date in a format the other side guesses wrongly, a field renamed without warning.

#### Writing JSON from C++

Libraries do this in practice (nlohmann/json, RapidJSON, simdjson for parsing); the two things they get right are worth seeing once. Strings need escaping, and numbers need printing so they parse back exactly.

```cpp
// Writing JSON correctly: escape strings (RFC 8259) and print numbers so they read back exactly.
string quote(string_view s) {
    string out = "\"";
    for (unsigned char c : s) {
        if (c == '"' || c == '\\') out += '\\', out += char(c);
        else if (c == '\n') out += "\\n";
        else if (c == '\t') out += "\\t";
        else if (c < 0x20) out += format("\\u{:04x}", c);  // other control characters
        else out += char(c);  // UTF-8 bytes pass through unchanged
    }
    return out + "\"";
}
string number(double x) {  // the shortest text that parses back to the same double
    char buf[32];
    return string(buf, to_chars(buf, buf + sizeof buf, x).ptr);
}

struct Item { string name; int cents, qty; };

int main() {
    long long id = 9007199254740993;  // 2^53 + 1: fits in 64 bits, not in a double
    vector<Item> items = {{"pen", 250, 2}, {"ink", 120, 1}};
    string json = "{\"id\":" + quote(to_string(id)) + ",\"customer\":" +
                  quote("Asha \"A.\" Rao") + ",\"note\":" + quote("ring twice\n\tback door") +
                  ",\"items\":[";
    for (size_t i = 0; i < items.size(); ++i)
        json += format(R"({}{{"name":{},"cents":{},"qty":{}}})", i ? "," : "", quote(items[i].name),
                       items[i].cents, items[i].qty);
    json += "],\"discount\":" + number(0.1) + ",\"share\":" + number(1.0 / 3) + "}";
    puts(json.c_str());
    fprintf(stderr, "as a double the id would be %.0f; the JSON text is %zu bytes\n",
            double(id), json.size());
}
```

#### Checking it with jq

A recorded terminal session: the program's output is fed to jq, which parses it (so it must be valid), pretty-prints and queries it.

```text
$ cd /work/json
$ g++ -std=c++20 -O2 -o order order.cpp
$ ./order
{"id":"9007199254740993","customer":"Asha \"A.\" Rao","note":"ring twice\n\tback door","items":[{"name":"pen","cents":250,"qty":2},{"name":"ink","cents":120,"qty":1}],"discount":0.1,"share":0.3333333333333333}
as a double the id would be 9007199254740992; the JSON text is 209 bytes
$ ./order 2> /dev/null | jq .
{
  "id": "9007199254740993",
  "customer": "Asha \"A.\" Rao",
  "note": "ring twice\n\tback door",
  "items": [
    {
      "name": "pen",
      "cents": 250,
      "qty": 2
    },
    {
      "name": "ink",
      "cents": 120,
      "qty": 1
    }
  ],
  "discount": 0.1,
  "share": 0.3333333333333333
}
$ ./order 2> /dev/null | jq -r .note
ring twice
	back door
$ ./order 2> /dev/null | jq -c '.items[] | select(.qty > 1)'
{"name":"pen","cents":250,"qty":2}
$ ./order 2> /dev/null | jq '[.items[] | .cents * .qty] | add'
620
$ echo '{"id": 9007199254740993}' | jq '.id, .id + 0'
9007199254740993
9007199254740992
$ echo '{"qty": 2,}' | jq .
jq: parse error: Expected another key-value pair at line 1, column 11
$ exit
exit
```

What it shows:

- **Escaping**: the quotes in the name and the newline and tab in the note were escaped by the writer, and `jq -r` turned them back into real characters. Building JSON by pasting strings together without escaping is the classic bug and, for user input, an injection hole.
- **Numbers**: `to_chars` printed `0.1` and `0.3333333333333333`, the shortest text that reads back as the same double; printing with a fixed `%.2f` would lose information. The id `2^53 + 1` survived as a string. As a plain number, jq kept its text but lost it the moment it did arithmetic (`.id + 0` gave …992), and a JavaScript client would lose it on parsing.
- **Queries**: `select` and `add` filter and sum without writing code, handy for logs and API responses.
- **Strictness**: a trailing comma is an error; JSON has no comments or trailing commas, unlike many configuration formats.

#### Choosing a format

| need | good choice |
|---|---|
| public web APIs, configuration people edit, logs | JSON |
| high-volume service-to-service calls | Protocol Buffers (with gRPC) or similar |
| analytics files | columnar formats such as Parquet |
| huge integers, exact decimals | strings with a documented format |

Connects to: [designing REST APIs](#/concept/eng.web.designing-rest-apis), [floating point (IEEE 754)](#/concept/arch.representation.floating-point-ieee-754), [character encodings](#/concept/arch.representation.character-encodings), [REST vs gRPC vs GraphQL](#/concept/sysd.messaging.rest-vs-grpc-vs-graphql).

### questions
Q: Why should large integer ids be sent as strings in JSON?
A: Many JSON parsers, including every JavaScript one, store numbers as 64-bit doubles, which are exact only up to 2 to the 53rd. A larger id is silently rounded to a neighbor, so it points at the wrong record; a string keeps every digit.

Q: How should money be represented in JSON?
A: As an integer in the smallest unit (cents or paise), or as a decimal string with a currency code. Binary floating point can't represent most decimal fractions exactly, so sums drift and comparisons fail.

Q: What must a JSON string escape?
A: The double quote, the backslash and every control character below 0x20 (newline and tab have short forms, others use \u00XX). Everything else, including non-ASCII UTF-8, may appear as is.

Q: When would you choose a binary format like Protocol Buffers over JSON?
A: For high-volume internal traffic where size and parsing speed matter and both sides share a schema. JSON stays better for public APIs, debugging and anything humans read, because it needs no special tools.

Q: How do you change a JSON API without breaking old clients?
A: Only add optional fields, never rename or change the type or meaning of existing ones, and make readers ignore fields they don't know. For a truly breaking change, publish a new version and keep the old one running for a while.

## eng.web.authentication-in-web-apps
name: "Authentication in web apps"
importance: important
prereqs: [eng.web.client-server-architecture]
scope: "sessions vs tokens"

### simple
Authentication is how a web app knows who you are on every request after you log in. With sessions, the server remembers you and hands your browser a random ticket number in a cookie; with tokens, the server hands you a signed pass that states who you are, and checks the signature each time instead of remembering anything. It is the difference between a coat-check ticket, which only works with the cloakroom's list, and a signed visitor badge.

### interview
- **Passwords** are never stored, only a slow, salted hash (argon2id, bcrypt or scrypt); comparing uses the same salt and a constant-time check. Add a second factor for important accounts.
- **Sessions**: after login the server stores `session id → user` and sets `Set-Cookie: sid=…; HttpOnly; Secure; SameSite=Lax`. Logging out or revoking is deleting the record. Cost: a shared session store across servers.
- **Tokens** (for example JWTs): the server signs claims (`sub`, `role`, `exp`) and verifies the signature on each request with no lookup, which suits many services. Cost: a token stays valid until it expires, so keep access tokens short-lived with refresh tokens, or keep a denylist.
- **Token contents are readable** (base64url, not encryption): never put secrets in them.
- **Browser storage**: HttpOnly cookies can't be read by scripts, which limits damage from XSS, but cookies are sent automatically, so defend against CSRF (SameSite, anti-CSRF tokens). Tokens in local storage avoid CSRF but are exposed to any XSS.
- Authentication (who you are) is not authorization (what you may do): check permissions on the server for every request.

### deep
#### Intuition

HTTP is stateless, so each request must prove who sent it. Sessions keep the proof on the server and give the client a meaningless random key; tokens put the proof in the client's hands, protected by a signature only the server can make. Everything else, from cookies to refresh tokens, is about keeping that proof from being stolen, forged or used for too long.

#### Sessions, in one exchange

An illustration of the headers (not a recorded run):

```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

user=asha&password=correct+horse+battery

HTTP/1.1 204 No Content
Set-Cookie: sid=q3Vz8…; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
```

Later requests carry `Cookie: sid=q3Vz8…` and the server looks the id up. The id must be long and random (at least 128 bits from a secure generator) and replaced after login, so an attacker can't guess it or fix it in advance.

#### A signed token, built and checked by hand

A recorded terminal session that makes an HS256 token (HMAC-SHA256 over the header and payload, as a JWT does) with `openssl`. The secret is a demo value; real secrets come from a secret store, never from source code.

```text
$ b64url() { base64 -w0 | tr '+/' '-_' | tr -d '='; }
$ SECRET=demo-secret-not-for-production
$ sign() { openssl dgst -sha256 -hmac "$SECRET" -binary | b64url; }
$ head=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
$ body=$(printf '{"sub":"asha","role":"user","exp":1788240600}' | b64url)
$ token="$head.$body.$(printf '%s.%s' "$head" "$body" | sign)"
$ echo "$token"
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc2hhIiwicm9sZSI6InVzZXIiLCJleHAiOjE3ODgyNDA2MDB9.5sJgsfCqF9fJdn_-oP2Gv9zIWEKwArAAILRF5ubS1Vg
$ echo "$token" | cut -d. -f2 | jq -Rr @base64d
{"sub":"asha","role":"user","exp":1788240600}
$ verify() { IFS=. read -r h b s <<< "$1"; [[ $(printf '%s.%s' "$h" "$b" | sign) == "$s" ]] && echo valid || echo "bad signature"; }
$ verify "$token"
valid
$ evil=$(printf '{"sub":"asha","role":"admin","exp":1788240600}' | b64url)
$ verify "$head.$evil.$(echo "$token" | cut -d. -f3)"
bad signature
$ date -d @1788240600
Tue Sep  1 11:00:00 IST 2026
$ openssl passwd -6 -salt 8Kx2QwZ1 'correct horse battery'
$6$8Kx2QwZ1$yfzWtKDfGzsJF3Dkp1h7Go6y2XQN2rK1VhLTn8ddmR8KPnVY4jnFnjNqvQ7XN3vJPx7S/f2Oya2pXbdrPhtuk/
$ openssl passwd -6 -salt 8Kx2QwZ1 'correct horse battery'
$6$8Kx2QwZ1$yfzWtKDfGzsJF3Dkp1h7Go6y2XQN2rK1VhLTn8ddmR8KPnVY4jnFnjNqvQ7XN3vJPx7S/f2Oya2pXbdrPhtuk/
$ openssl passwd -6 -salt Pq7Lm0Az 'correct horse battery'
$6$Pq7Lm0Az$//Yo7EY6ngMsy9t0w.nRsVsAdLPy2HQWT3SEpTYl2CRwMdyFDh8RIDGmjGR6br3WhE3SpnmL1.rWzqXp1p0nc/
$ exit
exit
```

- The payload decodes with plain base64: anyone holding the token can read it.
- Changing `role` to `admin` without the secret leaves a signature that no longer matches, so the server rejects it. The signature proves the server issued exactly these claims.
- `exp` is a Unix time (here 11:00 IST on 1 September 2026); after it, the server must refuse the token even though the signature is valid.
- The same password and salt always give the same hash, which is how a login is checked; a different salt gives an unrelated hash, so two users with one password don't match and precomputed tables are useless. `-6` is SHA-512-crypt, fine for showing salts; for new systems use argon2id or bcrypt, which are deliberately slow and, for argon2, memory-hard.

#### Choosing

| | sessions | signed tokens |
|---|---|---|
| server state | a session store | none per request |
| logout, revoke | delete the record | wait for expiry, or keep a denylist |
| many services | all need the store | each can verify with the key |
| usual client | browsers (cookies) | mobile apps, service-to-service |

Many apps combine them: a session cookie for the browser, short-lived tokens between services.

Connects to: [cookies and sessions](#/concept/cn.application.cookies-and-sessions), [OAuth and JWT basics](#/concept/cn.security.oauth-and-jwt-basics), [common attacks](#/concept/cn.security.common-attacks), [authentication and authorization in systems](#/concept/sysd.building-blocks.authentication-and-authorization-in-systems).

### questions
Q: What is the difference between session-based and token-based authentication?
A: With sessions the server stores who is logged in and gives the client a random session id, usually in a cookie. With tokens the server signs a statement of who the client is and verifies the signature on each request without storing anything. Sessions are easy to revoke; tokens scale across services without a shared store.

Q: How should passwords be stored?
A: As a salted hash from a deliberately slow algorithm such as argon2id, bcrypt or scrypt, never in plain text or with a fast hash like plain SHA-256. The salt makes identical passwords hash differently, and the slowness makes guessing expensive.

Q: Can a user read the contents of a JWT? Can they change it?
A: They can read it, because the header and payload are only base64url encoded. They can't change it undetected: any edit breaks the signature, which only the holder of the key can recompute.

Q: How do you log a user out when using stateless tokens?
A: You can't make an issued token invalid by itself, so keep access tokens short-lived and revoke the longer-lived refresh token on logout, or keep a denylist of revoked token ids checked on each request.

Q: What cookie attributes protect a session cookie?
A: HttpOnly keeps scripts from reading it, Secure sends it only over HTTPS, SameSite (Lax or Strict) stops most cross-site requests from carrying it, and a limited Max-Age ends it. Together they reduce theft by XSS and misuse by CSRF.
