---
topic: oop.patterns-structural
name: "Structural design patterns"
subject: oop
order: 7
prereqs: [oop.principles]
---

## oop.patterns-structural.adapter
name: "Adapter"
importance: must
scope: "making incompatible interfaces work together"

### simple
An adapter wraps an object so it fits an interface it was not built for. A travel plug adapter lets your charger's plug fit a foreign wall socket without changing the charger or the wall. In code, an adapter translates calls from the interface your program expects into the calls the other class understands.

### interview
- Intent: **convert the interface of a class into another interface clients expect**, so classes with incompatible interfaces can work together.
- Typical use: integrating a **legacy class or third-party library** whose API you cannot change behind your own interface (`PaymentGateway`, `TemperatureSensor`).
- **Object adapter**: holds the adaptee and delegates (composition; the usual choice). **Class adapter**: inherits from both the target and the adaptee (needs multiple inheritance, as in C++).
- The adapter may also convert data: units, formats, error codes into exceptions, callbacks into return values.
- Library examples: `std::stack`, `std::queue` and `std::priority_queue` are container adapters over `deque` or `vector`; `std::reverse_iterator` adapts an iterator to walk backwards; `std::back_inserter` makes a container look like an output iterator.
- Adapter vs facade vs decorator: an adapter **changes** one interface to another; a facade **simplifies** a whole subsystem; a decorator **keeps** the interface and adds behavior.

### deep
#### Intuition

Your code talks to sensors through a `TemperatureSensor` interface that returns Celsius. A new vendor's library offers `LegacyThermometer::readFahrenheitTimes10()`. You cannot change their class, and you should not scatter unit conversions through your code. An adapter implements your interface once, on top of theirs.

#### Code: object adapter

```cpp
class TemperatureSensor {                          // the target: what our code expects
public:
    virtual ~TemperatureSensor() = default;
    virtual double celsius() const = 0;
};

class LegacyThermometer {                          // the adaptee: a third-party class
public:
    int readFahrenheitTimes10() const { return 986; }   // 98.6 °F
};

class ThermometerAdapter : public TemperatureSensor {   // the adapter
    const LegacyThermometer& legacy;                // composition: wraps the adaptee
public:
    explicit ThermometerAdapter(const LegacyThermometer& t) : legacy(t) {}
    double celsius() const override {
        double f = legacy.readFahrenheitTimes10() / 10.0;
        return (f - 32) * 5 / 9;                    // translate units as well as names
    }
};

void alarmIfFever(const TemperatureSensor& s) {    // client code knows only the target
    cout << (s.celsius() >= 38.0 ? "fever" : "normal") << " (" << s.celsius() << " C)\n";
}

int main() {
    LegacyThermometer vendor;
    ThermometerAdapter adapted(vendor);
    alarmIfFever(adapted);                          // normal (37 C)
}
```

#### Worked example: what the adapter translates

| our call | adapter does | legacy call | result back to us |
|---|---|---|---|
| `charge(499.5, "acct-1")` | rupees to paise: 49950 | `make_payment(49950, "acct-1")` | 0, so returns `True` |
| `charge(0, "acct-1")` | 0 paise | `make_payment(0, ...)` | 17, so raises `RuntimeError` |

Names, units and error style all change in one class. If the vendor is replaced, only the adapter is rewritten.

#### Class adapter

```cpp
class Target { public: virtual ~Target() = default; virtual string request() const = 0; };
class Adaptee { public: string specificRequest() const { return "adaptee"; } };

class ClassAdapter : public Target, private Adaptee {   // inherits the implementation privately
public:
    string request() const override { return specificRequest(); }
};
```

It avoids an extra object but binds the adapter to one concrete adaptee class; the object adapter can wrap any subclass of the adaptee and is usually preferred.

#### Pitfalls

- Leaking the adaptee's types (its exceptions, its data classes) through the adapter's interface.
- Adapters that grow business logic; keep them to translation.
- Two-way adapters that try to serve both interfaces often become confusing; write two adapters instead.

Connects to: facade, decorator, dependency inversion principle, composition over inheritance.

### questions
Q: What is the adapter pattern?
A: A structural pattern that wraps an existing class and exposes the interface a client expects, translating calls, data formats and errors between the two. It lets classes with incompatible interfaces work together without changing either of them.

Q: What is the difference between an object adapter and a class adapter?
A: An object adapter holds a reference to the adaptee and delegates to it, so it can adapt any subclass of the adaptee. A class adapter inherits from both the target interface and the adaptee, which needs multiple inheritance and ties it to one concrete adaptee class.

Q: How is an adapter different from a facade?
A: An adapter converts one existing interface into another specific interface a client already expects. A facade defines a new, simpler interface over a whole subsystem of many classes to make it easier to use.

Q: Give examples of adapters in standard libraries.
A: std::stack, std::queue and std::priority_queue are container adapters that present a restricted interface over another container. std::reverse_iterator adapts an iterator to walk backwards, and std::back_inserter lets algorithms such as std::copy append to a container as if it were an output iterator.

Q: When would you use an adapter in a system design or LLD interview?
A: When integrating a third-party service, such as a payment provider or SMS vendor, behind your own interface. Each vendor gets an adapter, so the core code never depends on vendor APIs and providers can be swapped or added.

## oop.patterns-structural.decorator
name: "Decorator"
importance: must
scope: "adding behavior by wrapping"

### simple
A decorator adds a feature to an object by wrapping it in another object with the same shape. It is like putting a phone in a case, then adding a screen protector: the phone still works the same way, but each layer adds something. Because each layer can be added or left out, you can mix features freely without making a new kind of phone for every mix.

### interview
- Intent: **attach extra responsibilities to an object dynamically** by wrapping it in objects that implement the **same interface** and forward to the wrapped object.
- Solves **subclass explosion**: logging, caching and retrying in every combination would need 2³ subclasses, but only three decorators.
- Decorators **stack**, and **order matters**: caching outside retrying differs from retrying outside caching.
- Classic examples: middleware chains in web servers, and stream filter chains (Boost.Iostreams stacks compression or encryption filters on a stream).
- Decorator vs proxy: both wrap with the same interface; a decorator **adds behavior** chosen by the client, a proxy **controls access** to the real object and often manages its lifecycle. Decorator vs inheritance: behavior is added at runtime, per object.
- The same idea works for functions: a higher-order function takes a callable and returns a wrapped callable with the same signature (logging, timing, memoizing).

### deep
#### Intuition

Suppose a `Fetcher` downloads pages. Some callers want logging, some want caching, some want retries, and some want all three. Subclasses such as `CachingRetryingLoggingFetcher` multiply quickly. Instead, each feature becomes a wrapper that is itself a `Fetcher`: it does its bit and passes the call on.

#### Code

```cpp
class Fetcher {
public:
    virtual ~Fetcher() = default;
    virtual string fetch(const string& path) = 0;
};

class FlakyNetwork : public Fetcher {                  // the real component, fails every other call
    int calls = 0;
public:
    string fetch(const string& path) override {
        if (++calls % 2 == 1) throw runtime_error("timeout");
        return "<page " + path + ">";
    }
    int count() const { return calls; }
};

class FetcherDecorator : public Fetcher {              // base decorator: forwards by default
protected:
    Fetcher& inner;
public:
    explicit FetcherDecorator(Fetcher& f) : inner(f) {}
    string fetch(const string& path) override { return inner.fetch(path); }
};

class Retrying : public FetcherDecorator {
    int attempts;
public:
    Retrying(Fetcher& f, int attempts) : FetcherDecorator(f), attempts(attempts) {}
    string fetch(const string& path) override {
        for (int i = 1;; ++i) {
            try { return inner.fetch(path); }
            catch (const runtime_error&) { if (i == attempts) throw; }
        }
    }
};

class Caching : public FetcherDecorator {
    unordered_map<string, string> cache;
public:
    using FetcherDecorator::FetcherDecorator;
    string fetch(const string& path) override {
        if (auto it = cache.find(path); it != cache.end()) return it->second;
        return cache[path] = inner.fetch(path);
    }
};

class Logging : public FetcherDecorator {
public:
    using FetcherDecorator::FetcherDecorator;
    string fetch(const string& path) override {
        cout << "GET " << path << "\n";
        return inner.fetch(path);
    }
};

int main() {
    FlakyNetwork net;
    Retrying retry(net, 3);
    Caching cache(retry);
    Logging log(cache);                                // log -> cache -> retry -> network
    cout << log.fetch("/home") << "\n";                // GET /home, then <page /home>
    cout << log.fetch("/home") << "\n";                // GET /home, served from cache
    cout << "network calls: " << net.count() << "\n";  // 2 (one failure, one success)
}
```

#### Worked example: tracing the calls

| call | Logging | Caching | Retrying | FlakyNetwork |
|---|---|---|---|---|
| 1st `fetch("/home")` | prints GET | miss | attempt 1 | throws timeout |
| | | | attempt 2 | returns the page |
| | | stores the page | | |
| 2nd `fetch("/home")` | prints GET | hit, returns | not called | not called |

Swap the order to `Caching(Logging(...))` and the second call would not print, because the cache answers before the logger is reached.

#### Decorating functions

```cpp
template <class F>
auto logged(string name, F f) {                       // wraps any callable with logging
    return [name, f](auto... args) mutable {
        cout << "call " << name << "\n";
        return f(args...);
    };
}

template <class F>
auto memoized(F f) {                                  // wraps a function of int with a cache
    return [f, cache = map<int, long long>{}](int n) mutable {
        auto it = cache.find(n);
        if (it == cache.end()) it = cache.emplace(n, f(n)).first;
        return it->second;
    };
}

int main() {
    int computed = 0;
    auto square = [&computed](int n) { ++computed; return 1LL * n * n; };
    auto fast = logged("square", memoized(square));  // caching innermost, logging outside
    long long a = fast(4), b = fast(4);              // logs twice, computes once
    cout << a << " " << b << " computed " << computed << "\n";   // 16 16 computed 1
}
```

#### Pitfalls

- Code that checks the concrete type (`dynamic_cast<FlakyNetwork*>`) breaks once the object is wrapped.
- Long stacks are hard to debug; keep each decorator small and name it clearly.
- The interface must be small enough that forwarding every method is practical; a base decorator class that forwards by default helps.
- Identity: the wrapped object is not `==` to the original.

Connects to: composition over inheritance, open/closed principle, proxy, chain of responsibility, adapter.

### questions
Q: What is the decorator pattern?
A: A structural pattern that adds behavior to an object at runtime by wrapping it in another object that implements the same interface. The wrapper does its extra work and forwards the call, and wrappers can be stacked in any combination.

Q: Why use decorators instead of subclasses?
A: Subclassing needs a new class for every combination of features, which grows exponentially, and the choice is fixed at compile time. Decorators give one class per feature and let you combine them per object at runtime.

Q: Does the order of decorators matter?
A: Yes. Each decorator sees the call before the ones inside it. For example, a cache outside a logger answers repeated requests without logging, while a logger outside the cache logs every request. Order should be chosen deliberately.

Q: How is a decorator different from a proxy?
A: Both wrap an object with the same interface. A decorator's purpose is adding behavior, and clients compose decorators themselves. A proxy's purpose is controlling access to the real object, for example lazy creation, permission checks or remote calls, and it often manages the real object's lifecycle.

Q: Where do decorators show up in everyday C++ code?
A: Wrappers that hold an object through its interface and implement the same interface: a logging or caching wrapper around a repository, a retrying HTTP client, or a stream filter that compresses what passes through. For functions, a higher-order function that returns a wrapped callable, such as a memoizing wrapper, is the same idea.

## oop.patterns-structural.facade
name: "Facade"
importance: important
scope: "a simple front for a complex subsystem"

### simple
A facade is one simple entrance to a complicated set of parts. When you press "start" on a washing machine, it fills water, heats it, spins the drum and drains, without you controlling each part. In code, a facade gives one easy method that coordinates many classes behind it.

### interview
- Intent: provide a **unified, simplified interface to a subsystem** of many classes, so common tasks take one call.
- It reduces coupling: clients depend on the facade, not on ten subsystem classes, and the subsystem can change behind it.
- It does **not hide** the subsystem completely; advanced clients can still use the parts directly.
- Examples: a `VideoConverter.convert(file, format)` over codecs, bitrate readers and mixers; an `OrderFacade.placeOrder()` over inventory, payment and shipping; a library's one-call helper such as `download(address)` over sockets, TLS and HTTP parsing.
- Facade vs adapter: a facade **defines a new, simpler interface** over many classes; an adapter **matches an existing interface** for one class. Facade vs mediator: a facade is one-way (clients call in); a mediator coordinates two-way talk among peers.
- Watch out for a facade that becomes a **god object** with every operation of the system.

### deep
#### Intuition

Placing an order touches inventory, pricing, payment, shipping and notifications, each with its own API and order of calls. If every controller orchestrates those five services, the orchestration is duplicated and every client breaks when one service changes. A facade writes the orchestration once.

#### Code

```cpp
class Inventory {
    map<string, int> stock{{"pen", 5}};
public:
    void reserve(const string& item, int qty) {
        if (stock[item] < qty) throw runtime_error("out of stock");
        stock[item] -= qty;
    }
};

class Payments {
public:
    string charge(const string& user, int amount) {
        return "txn-" + user + "-" + to_string(amount);
    }
};

class Shipping {
public:
    string schedule(const string& user, const string& item) {
        return "ship " + item + " to " + user;
    }
};

class Notifier {
public:
    void send(const string& user, const string& text) {
        cout << "notify " << user << ": " << text << "\n";
    }
};

class OrderFacade {                                   // one simple entry point
    Inventory& inventory;
    Payments& payments;
    Shipping& shipping;
    Notifier& notifier;
    map<string, int> prices{{"pen", 20}};
public:
    OrderFacade(Inventory& i, Payments& p, Shipping& s, Notifier& n)
        : inventory(i), payments(p), shipping(s), notifier(n) {}

    string placeOrder(const string& user, const string& item, int qty) {
        inventory.reserve(item, qty);
        string txn = payments.charge(user, prices.at(item) * qty);
        string plan = shipping.schedule(user, item);
        notifier.send(user, plan + " (" + txn + ")");
        return txn;
    }
};

int main() {
    Inventory inv;
    Payments pay;
    Shipping ship;
    Notifier note;
    OrderFacade shop(inv, pay, ship, note);
    cout << shop.placeOrder("asha", "pen", 2) << "\n";
    // notify asha: ship pen to asha (txn-asha-40)
    // txn-asha-40
}
```

```cpp
class Amplifier { public: string on() { return "amp on"; } };
class Projector {
public:
    string on() { return "projector on"; }
    string input(const string& s) { return "input " + s; }
};
class Lights { public: string dim(int pct) { return "lights " + to_string(pct) + "%"; } };

class HomeTheater {                                  // facade over three devices
    Amplifier amp; Projector proj; Lights lights;
public:
    vector<string> watchMovie() {
        return {lights.dim(10), proj.on(), proj.input("hdmi"), amp.on()};
    }
};

int main() {
    for (const auto& step : HomeTheater().watchMovie()) cout << step << "\n";
}
```

#### Worked example: what the client no longer knows

| without the facade, a controller must know | with the facade |
|---|---|
| reserve stock before charging | `placeOrder(user, item, qty)` |
| how to compute the price | |
| how to build a shipping request | |
| to notify only after all succeed | |

If payments move to a new provider, only the facade and the payment class change.

#### Facade vs neighbors

| | facade | adapter | mediator |
|---|---|---|---|
| wraps | many classes | one class | peers that talk to each other |
| interface | new and simpler | an existing target | coordination hub |
| direction | clients call in | clients call in | two-way among colleagues |

#### Pitfalls

- Letting it become a god class; split into several facades by use case.
- Business rules drifting into the facade; it should orchestrate, not decide.
- Forcing every client through it even when they need fine control.

Connects to: adapter, mediator, coupling and cohesion, single responsibility principle.

### questions
Q: What is the facade pattern?
A: A structural pattern that provides one simplified interface to a complex subsystem of many classes. The facade coordinates the subsystem's calls for common tasks, so clients depend on one class instead of many.

Q: How is a facade different from an adapter?
A: A facade creates a new, simpler interface over a whole subsystem to make it easier to use. An adapter makes one existing class fit a specific interface a client already expects, without simplifying anything.

Q: Does a facade prevent direct access to the subsystem?
A: No. It is a convenience layer, not a wall. Clients that need fine-grained control can still use the subsystem classes directly, while most clients use the facade.

Q: What is a risk of the facade pattern?
A: The facade can grow into a god object that knows about every part of the system and contains business logic it should not. Keeping facades focused on specific use cases and limited to orchestration avoids this.

## oop.patterns-structural.proxy
name: "Proxy"
importance: important
scope: "controlling access (lazy loading, caching, protection)"

### simple
A proxy is a stand-in that controls access to the real object. A receptionist answers your call first: they may check who you are, answer common questions themselves, or put you through to the busy manager only when needed. The caller talks to the proxy exactly as if it were the real thing.

### interview
- Intent: provide a **surrogate with the same interface** as the real object to **control access** to it.
- Kinds: **virtual proxy** (create an expensive object lazily, on first use), **protection proxy** (check permissions), **caching proxy** (reuse results), **remote proxy** (a local stub that forwards calls over the network, as in RPC and gRPC clients), **smart reference** (counting, locking; `shared_ptr` is one).
- The client cannot tell the proxy from the real subject, so it can be introduced without changing client code.
- Proxy vs decorator: same structure; a proxy **manages access or lifecycle** and often creates the subject itself, while a decorator **adds features** and is composed by the client.
- Real uses: `std::vector<bool>::reference` (a proxy for one bit), lazy-loaded records in ORMs, generated RPC client stubs, CDN and reverse proxies at system scale.
- Watch out for hidden latency (a remote proxy looks like a cheap local call) and for thread safety in lazy initialization.

### deep
#### Intuition

A gallery shows a hundred high-resolution images, but the user looks at five. Loading all hundred at startup wastes seconds and memory. A virtual proxy for each image knows the file name and loads the real image only when someone draws it.

#### Code: virtual and protection proxies

```cpp
class Image {
public:
    virtual ~Image() = default;
    virtual string draw() = 0;
};

class RealImage : public Image {                    // expensive to create
    string file;
public:
    explicit RealImage(string f) : file(std::move(f)) { cout << "loading " << file << "\n"; }
    string draw() override { return "pixels of " + file; }
};

class LazyImage : public Image {                    // virtual proxy
    string file;
    unique_ptr<RealImage> real;                     // created on first use
public:
    explicit LazyImage(string f) : file(std::move(f)) {}
    string draw() override {
        if (!real) real = make_unique<RealImage>(file);
        return real->draw();
    }
};

class SecureImage : public Image {                  // protection proxy
    Image& inner;
    bool allowed;
public:
    SecureImage(Image& img, bool allowed) : inner(img), allowed(allowed) {}
    string draw() override { return allowed ? inner.draw() : "access denied"; }
};

int main() {
    vector<unique_ptr<Image>> gallery;
    for (string f : {"a.png", "b.png", "c.png"}) gallery.push_back(make_unique<LazyImage>(f));
    cout << "gallery ready\n";                      // nothing loaded yet
    cout << gallery[1]->draw() << "\n";             // loading b.png, pixels of b.png
    cout << gallery[1]->draw() << "\n";             // no second load
    SecureImage locked(*gallery[0], false);
    cout << locked.draw() << "\n";                  // access denied, a.png never loads
}
```

#### Worked example: when loading happens

| event | a.png | b.png | c.png |
|---|---|---|---|
| gallery built | proxy only | proxy only | proxy only |
| `gallery[1]->draw()` | proxy only | loaded | proxy only |
| second `draw()` of b | proxy only | reused | proxy only |
| locked `draw()` of a | proxy only (denied) | loaded | proxy only |

#### Caching proxy

```cpp
class Weather {
public:
    virtual ~Weather() = default;
    virtual string forecast(const string& city) = 0;
};

class WeatherService : public Weather {
public:
    int calls = 0;
    string forecast(const string& city) override {
        ++calls;                                      // pretend this is a slow network call
        return city + ": sunny";
    }
};

class CachedWeather : public Weather {                // same interface, controls access
    Weather& service;
    unordered_map<string, string> cache;
public:
    explicit CachedWeather(Weather& s) : service(s) {}
    string forecast(const string& city) override {
        auto it = cache.find(city);
        if (it == cache.end()) it = cache.emplace(city, service.forecast(city)).first;
        return it->second;
    }
};

int main() {
    WeatherService real;
    CachedWeather proxy(real);
    proxy.forecast("Delhi");
    proxy.forecast("Delhi");
    proxy.forecast("Pune");
    cout << real.calls << "\n";                       // 2
}
```

#### Remote proxies

A gRPC client stub has the same methods as the server object, but each call serializes the arguments, sends them over the network and waits for the reply. It is convenient, and dangerous if callers forget that the "method call" can take 200 ms or fail with a timeout.

#### Pitfalls

- Lazy initialization shared across threads needs synchronization.
- Proxies that change semantics (a cache that serves stale data) must say so.
- Identity and type checks (`dynamic_cast<RealImage*>`) fail on proxies.

Connects to: decorator, adapter, lazy loading, caching, smart pointers.

### questions
Q: What is the proxy pattern?
A: A structural pattern where a stand-in object with the same interface as the real object controls access to it. Clients use the proxy exactly like the real object, and the proxy decides when and whether to forward calls.

Q: Name the common kinds of proxy.
A: A virtual proxy delays creating an expensive object until it is needed. A protection proxy checks permissions before forwarding. A caching proxy stores results. A remote proxy represents an object in another process or machine. A smart reference adds bookkeeping such as reference counting.

Q: What is the difference between a proxy and a decorator?
A: They have the same structure, but a proxy's purpose is to control access to the subject, often creating and managing it itself. A decorator's purpose is to add responsibilities, and the client usually composes decorators around an object it already has.

Q: What risk does a remote proxy introduce?
A: It makes a network call look like a cheap local method call. Callers may ignore latency, partial failure and timeouts, so remote proxies should make those visible, for example through timeouts, error types or asynchronous signatures.

## oop.patterns-structural.composite
name: "Composite"
importance: important
scope: "tree structures of objects treated uniformly"

### simple
The composite pattern lets you treat a single thing and a group of things the same way. A folder can contain files and other folders, yet you can ask any of them "how big are you?" and get an answer. The group simply asks each of its members and adds up the replies.

### interview
- Intent: compose objects into **tree structures** and let clients treat **individual objects (leaves) and groups (composites) uniformly** through one interface.
- Roles: `Component` (common interface, such as `size()` or `render()`), `Leaf` (does the work), `Composite` (holds children and implements the operation by delegating to them, usually recursively).
- Examples: file systems (files and folders), UI widget trees, organization charts, scene graphs, arithmetic expression trees, menus with submenus.
- Design choice: put `add` and `remove` on `Component` (**transparency**: uniform, but leaves must reject them) or only on `Composite` (**safety**: type-safe, but clients must know which is which).
- Operations are naturally recursive: cost is **O(n)** in the number of nodes; watch for cycles if the structure is not a strict tree.
- Pairs well with iterator (walk the tree) and visitor (add operations over the tree).

### deep
#### Intuition

Code that computes a folder's size should not need `if (isFile) ... else for (child) ...` in every place that walks the tree. If files and folders both answer `size()`, the folder's version sums its children and the recursion handles any depth automatically.

#### Code

```cpp
class Node {                                         // the component
public:
    virtual ~Node() = default;
    virtual long long size() const = 0;
    virtual void print(const string& indent) const = 0;
};

class File : public Node {                           // leaf
    string name; long long bytes;
public:
    File(string n, long long b) : name(std::move(n)), bytes(b) {}
    long long size() const override { return bytes; }
    void print(const string& indent) const override {
        cout << indent << name << " (" << bytes << ")\n";
    }
};

class Folder : public Node {                         // composite
    string name;
    vector<unique_ptr<Node>> children;               // owns its children
public:
    explicit Folder(string n) : name(std::move(n)) {}
    Folder& add(unique_ptr<Node> child) { children.push_back(std::move(child)); return *this; }
    long long size() const override {
        long long total = 0;
        for (const auto& c : children) total += c->size();   // delegate to children
        return total;
    }
    void print(const string& indent) const override {
        cout << indent << name << "/ (" << size() << ")\n";
        for (const auto& c : children) c->print(indent + "  ");
    }
};

int main() {
    auto src = make_unique<Folder>("src");
    src->add(make_unique<File>("main.cpp", 1200)).add(make_unique<File>("util.cpp", 800));
    Folder root("project");
    root.add(make_unique<File>("README.md", 300)).add(std::move(src));
    root.print("");
    // project/ (2300)
    //   README.md (300)
    //   src/ (2000)
    //     main.cpp (1200)
    //     util.cpp (800)
}
```

#### Worked example: the recursion

| call | returns |
|---|---|
| `project.size()` | README (300) + src.size() |
| `src.size()` | main (1200) + util (800) = 2000 |
| back in `project` | 300 + 2000 = 2300 |

Adding a `Symlink` leaf or a `ZipArchive` composite needs no change to `Folder` or the client.

#### Transparency vs safety

| choice | pros | cons |
|---|---|---|
| `add` on `Component` | clients never check types | `File::add` must throw or do nothing |
| `add` only on `Composite` | type-safe | clients must know or check the node kind |

Many modern designs choose safety.

#### Pitfalls

- Shared children (the same node in two folders) turn the tree into a graph: sizes double count and ownership gets unclear.
- Deep trees and recursion: very deep structures can overflow the stack.
- Recomputing expensive aggregates repeatedly; cache them and invalidate on change if needed.

Connects to: trees, iterator, visitor, decorator, chain of responsibility.

### questions
Q: What is the composite pattern?
A: A structural pattern that organizes objects into tree structures and lets clients treat single objects and groups of objects through the same interface. A composite implements an operation by delegating it to its children, so clients never need to distinguish leaves from groups.

Q: What are the roles in the composite pattern?
A: The component declares the common interface. Leaves are simple elements that do the actual work. Composites hold child components and implement the interface by combining their children's results, often recursively.

Q: Give real-world examples of the composite pattern.
A: File systems with files and folders, GUI toolkits where panels contain widgets and other panels, organization charts, menus with nested submenus, and expression trees where an operator node combines operand subtrees.

Q: What is the transparency versus safety trade-off in composite?
A: Declaring child-management methods like add in the component interface keeps everything uniform but forces leaves to reject those calls at runtime. Declaring them only on composites is type-safe but means clients must know which kind of node they hold.

## oop.patterns-structural.bridge
name: "Bridge"
importance: advanced
scope: "separating abstraction from implementation"

### simple
The bridge pattern splits one class into two separate hierarchies that can change on their own: what something does and how it gets done. A universal remote can control a TV or a radio, and the TV can be driven by a basic remote or a fancy one. Connecting remotes to devices through a shared link means you never need a separate remote for every device.

### interview
- Intent: **decouple an abstraction from its implementation so the two can vary independently**, connected by composition (the "bridge").
- Solves the **n × m explosion**: shapes × renderers, remotes × devices, notifications × channels become n + m classes.
- The abstraction holds a reference to an implementor interface and delegates the low-level work to it; both sides can be extended by subclassing.
- Bridge vs adapter: bridge is designed **up front** to keep two dimensions apart; adapter is applied **after the fact** to make existing classes fit.
- Related C++ idiom: **pImpl** (pointer to implementation) hides implementation details and cuts compile dependencies, a bridge with a single implementation.
- Real examples: JDBC (the API as abstraction, drivers as implementations), graphics APIs over different rendering back ends.

### deep
#### Code

```cpp
class Device {                                       // implementor hierarchy
public:
    virtual ~Device() = default;
    virtual void setVolume(int v) = 0;
    virtual int volume() const = 0;
    virtual string name() const = 0;
};
class Tv : public Device {
    int vol = 10;
public:
    void setVolume(int v) override { vol = clamp(v, 0, 100); }
    int volume() const override { return vol; }
    string name() const override { return "TV"; }
};
class Radio : public Device {
    int vol = 30;
public:
    void setVolume(int v) override { vol = clamp(v, 0, 50); }   // radios max out at 50
    int volume() const override { return vol; }
    string name() const override { return "radio"; }
};

class Remote {                                       // abstraction hierarchy
protected:
    Device& device;                                  // the bridge
public:
    explicit Remote(Device& d) : device(d) {}
    virtual ~Remote() = default;
    void volumeUp() { device.setVolume(device.volume() + 10); }
};
class AdvancedRemote : public Remote {
public:
    using Remote::Remote;
    void mute() { device.setVolume(0); }
};

int main() {
    Tv tv; Radio radio;
    AdvancedRemote r1(tv); Remote r2(radio);
    r1.volumeUp(); r1.mute();
    r2.volumeUp(); r2.volumeUp(); r2.volumeUp();
    cout << tv.name() << " " << tv.volume() << ", "
         << radio.name() << " " << radio.volume() << "\n";
    // TV 0, radio 50
}
```

| design | classes for 2 remotes × 3 devices | adding a 4th device |
|---|---|---|
| one class per combination | 6 | 2 more classes |
| bridge | 2 + 3 = 5 | 1 more class |

#### When to reach for it

Use bridge when a class varies along two independent dimensions and both are expected to grow. With only one dimension, plain polymorphism is enough, and with a single implementation, pImpl is the lighter version.

Connects to: composition over inheritance, adapter, abstract factory, strategy.

### questions
Q: What problem does the bridge pattern solve?
A: It prevents a class hierarchy from exploding when it varies along two independent dimensions. Instead of one subclass per combination, such as each remote type for each device, it splits the dimensions into two hierarchies connected by composition, so they grow as n plus m instead of n times m.

Q: How is bridge different from adapter?
A: Bridge is designed up front to let an abstraction and its implementation evolve independently. Adapter is applied afterwards to make an existing class fit an interface it was not designed for.

Q: What is the pImpl idiom and how does it relate to bridge?
A: pImpl stores a class's private data and helpers in a separate implementation object reached through a pointer, so header changes do not force clients to recompile and details stay hidden. It is a bridge with one implementation, used for encapsulation and build speed.

## oop.patterns-structural.flyweight
name: "Flyweight"
importance: advanced
scope: "sharing state to save memory"

### simple
The flyweight pattern saves memory by letting many objects share the parts they have in common. In a forest scene with a million trees, there might be only three kinds of tree, so the heavy pictures of each kind are stored once and every tree just remembers its position and which picture to use. Sharing the heavy part lets you have far more objects than memory would otherwise allow.

### interview
- Intent: support **huge numbers of fine-grained objects** efficiently by **sharing** the state they have in common.
- **Intrinsic state**: shared, context-free and **immutable** (a tree type's mesh and texture, a character's font glyph). **Extrinsic state**: unique per object, stored by the client or passed in (position, size).
- A **flyweight factory** caches instances by key and returns the existing one when asked again.
- Savings: memory falls from n × (intrinsic + extrinsic) to k × intrinsic + n × extrinsic, where k is the number of distinct kinds.
- Everyday examples: string interning (one shared copy per distinct string), glyphs in text editors, tiles and particles in games.
- Costs: more complex code, and flyweights must be immutable because many clients share them; thread-safe factories need care.

### deep
#### Code

```cpp
struct TreeType {                                     // intrinsic, shared, immutable
    const string name, texture;
    TreeType(string n, string t) : name(std::move(n)), texture(std::move(t)) {}
};

class TreeTypeFactory {                               // returns shared instances
    unordered_map<string, shared_ptr<const TreeType>> cache;
public:
    shared_ptr<const TreeType> get(const string& name, const string& texture) {
        auto key = name + "|" + texture;
        auto it = cache.find(key);
        if (it != cache.end()) return it->second;
        return cache[key] = make_shared<const TreeType>(name, texture);
    }
    size_t distinct() const { return cache.size(); }
};

struct Tree {                                         // extrinsic: position, plus a pointer
    int x, y;
    shared_ptr<const TreeType> type;
};

int main() {
    TreeTypeFactory factory;
    vector<Tree> forest;
    for (int i = 0; i < 100000; ++i) {
        const char* kind = i % 3 == 0 ? "oak" : i % 3 == 1 ? "pine" : "birch";
        forest.push_back({i % 1000, i / 1000, factory.get(kind, string(kind) + ".png")});
    }
    cout << forest.size() << " trees, " << factory.distinct() << " tree types\n";
    // 100000 trees, 3 tree types
}
```

#### Worked example: memory

Suppose a texture takes 1 MB and a position 8 bytes.

| design | memory for 100,000 trees of 3 kinds |
|---|---|
| every tree stores its own texture | about 100,000 MB |
| flyweight | 3 MB of textures + about 100,000 × (8 bytes + a pointer), roughly 5 MB |

#### String interning

```cpp
class Interner {                                      // one shared copy per distinct string
    unordered_set<string> pool;                       // node-based: addresses never move
public:
    const string* intern(const string& s) { return &*pool.insert(s).first; }
};

int main() {
    Interner names;
    const string* a = names.intern("hello_world");
    const string* b = names.intern(string("hello") + "_world");
    cout << (a == b) << "\n";                         // 1: one object, compare by pointer
}
```

After interning, equal strings are the same object, so comparing them is one pointer comparison and each distinct name is stored once.

Connects to: factory method, immutability, composite, caching.

### questions
Q: What is the flyweight pattern?
A: A structural pattern that reduces memory use when a program needs very many similar objects, by sharing the common immutable part, the intrinsic state, among them. Each object keeps only its unique extrinsic state, or the client supplies it when calling.

Q: What is the difference between intrinsic and extrinsic state?
A: Intrinsic state is independent of context and identical across many objects, such as a tree species' texture, so it can be shared. Extrinsic state varies per object, such as a tree's position, and is stored separately or passed in by the client.

Q: Why must flyweight objects be immutable?
A: Many clients hold references to the same flyweight instance. If one client changed it, every other object sharing it would silently change too, so shared intrinsic state must never be modified.

Q: Give everyday examples of flyweights.
A: String interning keeps one shared copy per distinct string, so equal names compare by pointer. Text editors share one glyph object per character and font, and games share one mesh and texture per tree or particle kind while each instance keeps only its position.
