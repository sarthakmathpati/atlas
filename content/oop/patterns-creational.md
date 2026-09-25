---
topic: oop.patterns-creational
name: "Creational design patterns"
subject: oop
order: 6
prereqs: [oop.principles]
---

## oop.patterns-creational.singleton
name: "Singleton"
importance: must
scope: "one instance, lazy vs eager, thread-safe variants, why it is often criticized"

### simple
A singleton is a class that allows exactly one object of itself and gives everyone the same way to reach it. A country has one official clock that everyone sets their watches by. It is handy, but because everyone depends on it, it also becomes hard to swap out or test around.

### interview
- Intent: guarantee **one instance** of a class and a **global access point** to it (config, logger, connection pool, hardware driver).
- Mechanics: private constructor, a static accessor, and no copying (delete copy and move in C++).
- **Eager** creates the instance at startup (simple, thread-safe, may waste work); **lazy** creates it on first use.
- Thread-safe lazy variants: a C++11 **function-local static** (the Meyers singleton, the usual choice), **`std::call_once`** with a `once_flag`, or **double-checked locking** with a `std::atomic` pointer (release on publish, acquire on read) and a mutex.
- Criticism: it is **global mutable state**, hides dependencies, makes tests share state and hard to fake, mixes "what it does" with "how many exist", and "one per process" breaks with several processes or with shared libraries that each carry their own copy.
- Better default: create one instance at startup and **inject** it; the object is single by configuration, not by force.

### deep
#### Intuition

Some resources really should exist once: a process-wide logger writing to one file, a pool of database connections, a registry of plugins. A singleton enforces that in the class itself and lets any code fetch it without passing it around. The convenience is also the problem: anything anywhere can depend on it invisibly.

#### C++: the Meyers singleton

```cpp
class Config {
    map<string, string> values;
    Config() { values["env"] = "prod"; }              // private: nobody else can construct
public:
    Config(const Config&) = delete;                  // no copies
    Config& operator=(const Config&) = delete;
    static Config& instance() {
        static Config inst;                          // built on first call, thread-safe (C++11)
        return inst;
    }
    string get(const string& key) const {
        auto it = values.find(key);
        return it == values.end() ? "" : it->second;
    }
};

int main() {
    Config& a = Config::instance();
    Config& b = Config::instance();
    cout << (&a == &b) << " " << a.get("env") << "\n";   // 1 prod
}
```

The C++ standard guarantees a function-local static is initialized exactly once even if several threads call `instance()` at the same time, so no explicit lock is needed.

#### Other thread-safe variants

```cpp
class Logger {                                    // lazy with std::call_once
    Logger() = default;
    static inline unique_ptr<Logger> inst;
    static inline once_flag flag;
public:
    static Logger& get() {
        call_once(flag, [] { inst.reset(new Logger); });   // runs exactly once
        return *inst;
    }
};

class Pool {                                      // double-checked locking
    Pool() = default;
    static inline atomic<Pool*> inst{nullptr};
    static inline mutex m;
public:
    static Pool& get() {
        Pool* p = inst.load(memory_order_acquire);           // first check, no lock
        if (!p) {
            lock_guard<mutex> lock(m);
            p = inst.load(memory_order_relaxed);
            if (!p) {                                        // second check, under the lock
                p = new Pool;
                inst.store(p, memory_order_release);         // publish after construction
            }
        }
        return *p;
    }
};

int main() {
    set<Pool*> seen;
    mutex seenLock;
    vector<thread> ts;
    for (int i = 0; i < 8; i++)
        ts.emplace_back([&] {
            Pool* p = &Pool::get();
            lock_guard<mutex> g(seenLock);
            seen.insert(p);
        });
    for (auto& t : ts) t.join();
    cout << seen.size() << " " << (&Logger::get() == &Logger::get()) << "\n";   // 1 1
}
```

Why acquire and release in double-checked locking: without them, the pointer may become visible to another thread before the constructor's writes, so that thread sees a non-null but half-built object (and the unsynchronized read is a data race, which is undefined behavior). The release store publishes the finished object and the acquire load makes its contents visible. The function-local static does all of this for you, so prefer it.

#### Worked example: two threads, lazy creation without a lock

| time | thread A | thread B | instances |
|---|---|---|---|
| 1 | reads `instance == nullptr` | | 0 |
| 2 | | reads `instance == nullptr` | 0 |
| 3 | creates object #1 | | 1 |
| 4 | | creates object #2, overwrites | 2 created, 1 kept |

A naive `if (!instance) instance = new X;` breaks the one guarantee. The variants above close this race.

#### Why it is criticized

- **Hidden dependencies**: `OrderService` calling `Config::instance()` does not show in its constructor that it needs config.
- **Testing**: tests share one instance, so state leaks between them, and substituting a fake requires extra hooks.
- **Global mutable state** invites races and ordering bugs.
- **Two responsibilities**: the class does its job and controls its own instance count.
- **Lifetime**: C++ statics are destroyed at exit in reverse order; a singleton used by another static's destructor may already be gone.

The usual alternative: create the object once in `main` (the composition root) and pass it to whoever needs it. You keep "one instance" without the global access.

Connects to: static members, dependency inversion principle, thread-safe singleton, factory method.

### questions
Q: What is the singleton pattern?
A: A creational pattern that ensures a class has exactly one instance and provides a global point of access to it. It is typically built with a private constructor, a static method returning the single instance, and copying disabled.

Q: How do you implement a thread-safe singleton in C++11?
A: Return a reference to a function-local static object from a static instance method. Since C++11 the language guarantees such a static is initialized exactly once, even when several threads call the method at the same time, so no explicit locking is needed.

Q: Why does double-checked locking need an atomic pointer with acquire and release ordering?
A: Without it, the compiler or CPU may publish the pointer to the new object before the constructor's writes are visible. Another thread passing the unlocked first check could then use a partly constructed object, and the plain read and write are a data race. A release store after construction and an acquire load in the first check prevent this.

Q: What is the difference between eager and lazy singletons?
A: An eager singleton creates its instance when the program starts, as a namespace-scope object, which is simple and thread-safe but pays the cost even if it is never used. A lazy singleton creates the instance on first use, which saves work but needs care to stay thread-safe.

Q: Why is the singleton often called an anti-pattern?
A: It introduces global mutable state and hidden dependencies, makes unit tests share state and hard to fake, couples the class to its own instance management, and can cause lifetime and concurrency problems. Creating one instance at startup and injecting it usually gives the same benefit without these costs.

## oop.patterns-creational.factory-method
name: "Factory method"
importance: must
scope: "delegating object creation to subclasses or a factory"

### simple
A factory method is a method whose job is to create objects, so the code that uses them does not have to name the exact class. When you order "a ride" in an app, you do not pick the specific car; the app decides whether a hatchback or a sedan comes. Your code asks for "a transport" and a factory decides which one to build.

### interview
- GoF intent: **define an interface for creating an object, but let subclasses decide which class to instantiate**. A creator class declares `createX()`; each subclass overrides it to return a different product.
- The everyday cousin is the **simple factory**: one function or static method that picks a class from a parameter (`NotifierFactory::create("sms")`). Not a GoF pattern, but what many interviewers mean by "factory".
- **Static factory methods** and factory functions (named constructors such as `Temperature::ofCelsius`, `make_unique`, `make_shared`) have names, can cache or reuse instances, and can return a subtype.
- Benefits: callers depend on the product interface, not concrete classes; creation logic lives in one place; new products need no change in client code (open/closed).
- Costs: more classes; a simple factory's `switch` still grows with each new type (a registry map avoids that).
- Signals to use it: `make_unique<ConcreteClass>()` scattered around, object type chosen from config or input, or setup logic repeated at every creation site.

### deep
#### Intuition

`make_unique<EmailSender>()` hard-codes a decision into the caller. If the decision depends on configuration, on the platform or on a subclass's needs, that line has to move somewhere central. A factory method is that somewhere: one place that knows how to build the right object, behind a method that returns an abstraction.

#### The GoF form: subclasses choose the product

```cpp
struct Transport {
    virtual ~Transport() = default;
    virtual string deliver() const = 0;
};
struct Truck : Transport { string deliver() const override { return "by road"; } };
struct Ship : Transport { string deliver() const override { return "by sea"; } };

class Logistics {                                        // the creator
public:
    virtual ~Logistics() = default;
    string planDelivery() const {                        // business logic uses the product
        auto t = createTransport();                      // the factory method
        return "Delivering " + t->deliver();
    }
protected:
    virtual unique_ptr<Transport> createTransport() const = 0;
};

class RoadLogistics : public Logistics {
protected:
    unique_ptr<Transport> createTransport() const override { return make_unique<Truck>(); }
};
class SeaLogistics : public Logistics {
protected:
    unique_ptr<Transport> createTransport() const override { return make_unique<Ship>(); }
};

int main() {
    RoadLogistics road; SeaLogistics sea;
    cout << road.planDelivery() << " | " << sea.planDelivery() << "\n";
    // Delivering by road | Delivering by sea
}
```

`planDelivery` is written once and never names `Truck` or `Ship`.

#### The simple factory with a registry

```cpp
struct Notifier {
    virtual ~Notifier() = default;
    virtual string send(const string& to, const string& text) const = 0;
};
struct EmailNotifier : Notifier {
    string send(const string& to, const string& t) const override {
        return "email " + to + ": " + t;
    }
};
struct SmsNotifier : Notifier {
    string send(const string& to, const string& t) const override {
        return "sms " + to + ": " + t;
    }
};

class NotifierFactory {
    map<string, function<unique_ptr<Notifier>()>> registry;
public:
    template <class T>
    void add(const string& kind) {                  // new kinds plug in without editing create()
        registry[kind] = [] { return make_unique<T>(); };
    }
    unique_ptr<Notifier> create(const string& kind) const {
        auto it = registry.find(kind);
        if (it == registry.end()) throw invalid_argument("unknown notifier: " + kind);
        return it->second();
    }
};

struct PushNotifier : Notifier {                    // added later
    string send(const string& to, const string& t) const override {
        return "push " + to + ": " + t;
    }
};

int main() {
    NotifierFactory factory;
    factory.add<EmailNotifier>("email");
    factory.add<SmsNotifier>("sms");
    factory.add<PushNotifier>("push");
    for (string kind : {"email", "sms", "push"})
        cout << factory.create(kind)->send("asha", "hi") << "\n";   // email asha: hi, ...
}
```

#### Worked example: where creation logic lives

| situation | without a factory | with a factory |
|---|---|---|
| choose the sender from config | `if` chain at every call site | one `create(config.kind)` |
| add a push sender | edit every `if` chain | register one class |
| test with a fake sender | patch constructors | register or inject a fake |
| a sender needs a retry wrapper | edit every creation site | wrap inside `create` |

#### Static factory methods

```cpp
class Temperature {
    double kelvin;
    explicit Temperature(double k) : kelvin(k) {}
public:
    static Temperature ofCelsius(double c) { return Temperature(c + 273.15); }   // named
    static Temperature ofFahrenheit(double f) { return ofCelsius((f - 32) * 5 / 9); }
    double celsius() const { return kelvin - 273.15; }
};

int main() {
    cout << Temperature::ofFahrenheit(212).celsius() << "\n";    // 100
}
```

Two constructors taking one `double` each could not coexist; named static factories can, and they read clearly at the call site. `make_shared` shows another power: it allocates the object and its reference count in one block, which a constructor call cannot do.

#### Pitfalls

- A factory with a giant `switch` that every feature edits; use a registry or the GoF form.
- Factories for classes that have one implementation and simple construction (YAGNI).
- Returning concrete types from the factory, which brings the coupling back.

Connects to: abstract factory, open/closed principle, dependency inversion principle, polymorphism.

### questions
Q: What is the factory method pattern?
A: A creational pattern where a class declares a method for creating objects and lets subclasses override it to decide which concrete class to instantiate. The rest of the class works with the returned object only through its interface.

Q: How does a simple factory differ from the GoF factory method?
A: A simple factory is a single function or static method that chooses a concrete class from a parameter, usually with a switch or a registry. The GoF factory method uses inheritance: each subclass of the creator overrides the creation method. Both hide concrete classes from clients.

Q: What are the advantages of static factory methods over constructors?
A: They have descriptive names, so several can take the same parameter types. They can return cached instances instead of new ones, and they can return any subtype of the declared return type, which hides implementation classes.

Q: How do you avoid a factory whose switch grows with every new type?
A: Keep a registry that maps a key to a constructor or class, and let new types register themselves. The creation method then looks up the key and never needs editing when types are added.

Q: When is a factory unnecessary?
A: When there is only one concrete class, construction is simple and the choice never varies. Adding a factory then only adds indirection; plain construction or dependency injection is enough.

## oop.patterns-creational.abstract-factory
name: "Abstract factory"
importance: important
prereqs: [oop.patterns-creational.factory-method]
scope: "families of related objects"

### simple
An abstract factory creates whole families of objects that are meant to go together. A furniture store might sell a modern set and a classic set: you choose the style once and every chair, sofa and table you get matches. In code, you pick one factory and every object it builds belongs to the same family.

### interview
- Intent: an interface for creating **families of related objects** without naming their concrete classes (`UIFactory` with `createButton()` and `createCheckbox()`).
- Each concrete factory (`DarkThemeFactory`, `LightThemeFactory`) returns products from one family, so products are guaranteed to be **compatible**.
- Clients receive a factory once (usually injected) and never mention concrete product classes.
- Adding a **new family** is easy (one new factory and its products). Adding a **new kind of product** is hard: every factory must gain a method.
- Each method of an abstract factory is often a factory method; the difference is scope: one product vs a family of products.
- Real uses: cross-platform UI toolkits, database drivers (connection, command, reader from one vendor), test doubles for a whole subsystem.

### deep
#### Intuition

If a screen mixes a dark-theme button with a light-theme checkbox, it looks broken. When several objects must match, choosing each one separately gives many chances to mix them up. An abstract factory makes the choice once, at the family level.

#### Code

```cpp
struct Button { virtual ~Button() = default; virtual string render() const = 0; };
struct Checkbox { virtual ~Checkbox() = default; virtual string render() const = 0; };

struct DarkButton : Button { string render() const override { return "[dark button]"; } };
struct DarkCheckbox : Checkbox { string render() const override { return "[dark checkbox]"; } };
struct LightButton : Button { string render() const override { return "[light button]"; } };
struct LightCheckbox : Checkbox { string render() const override { return "[light checkbox]"; } };

struct UIFactory {                                            // the abstract factory
    virtual ~UIFactory() = default;
    virtual unique_ptr<Button> createButton() const = 0;
    virtual unique_ptr<Checkbox> createCheckbox() const = 0;
};
struct DarkFactory : UIFactory {
    unique_ptr<Button> createButton() const override { return make_unique<DarkButton>(); }
    unique_ptr<Checkbox> createCheckbox() const override { return make_unique<DarkCheckbox>(); }
};
struct LightFactory : UIFactory {
    unique_ptr<Button> createButton() const override { return make_unique<LightButton>(); }
    unique_ptr<Checkbox> createCheckbox() const override { return make_unique<LightCheckbox>(); }
};

string buildSettingsScreen(const UIFactory& ui) {             // never names a concrete class
    return ui.createButton()->render() + " " + ui.createCheckbox()->render();
}

int main() {
    bool darkMode = true;                                     // decided once, at startup
    unique_ptr<UIFactory> ui = darkMode ? unique_ptr<UIFactory>(make_unique<DarkFactory>())
                                        : make_unique<LightFactory>();
    cout << buildSettingsScreen(*ui) << "\n";                 // [dark button] [dark checkbox]
}
```

#### Worked example: the cost of each kind of change

| change | classes to edit or add |
|---|---|
| add a "high contrast" family | add `HighContrastFactory`, `HCButton`, `HCCheckbox`; nothing else changes |
| add a `Slider` product | add `createSlider` to `UIFactory` and to **every** concrete factory, plus a slider per family |
| switch the whole app to light | change the one line that picks the factory |

This asymmetry is the key interview point: the pattern is open to new families and closed to new product types.

#### Abstract factory vs factory method

| | factory method | abstract factory |
|---|---|---|
| creates | one product | a family of products |
| mechanism | a subclass overrides one method | an object with several creation methods |
| typical client | the creator's own code | code that receives the factory |

Connects to: factory method, dependency inversion principle, bridge, open/closed principle.

### questions
Q: What problem does the abstract factory pattern solve?
A: It creates families of related objects, such as matching UI widgets or one database vendor's connection and command objects, without the client naming concrete classes. Because one factory produces the whole family, the objects are guaranteed to be compatible.

Q: How is abstract factory different from factory method?
A: Factory method lets subclasses decide which single product to create by overriding one method. Abstract factory is an object with several creation methods that together produce a family of products; clients receive the factory and call it.

Q: What is the main drawback of abstract factory?
A: Adding a new kind of product requires changing the abstract factory interface and every concrete factory. Adding a new family is easy, but new product types ripple through all existing factories.

Q: Give a real-world example of an abstract factory.
A: A cross-platform GUI toolkit where a Windows factory creates Windows buttons, menus and dialogs and a macOS factory creates the macOS versions. The application picks the factory once at startup and builds every widget through it.

## oop.patterns-creational.builder
name: "Builder"
importance: must
scope: "step-by-step construction of complex objects"

### simple
A builder lets you create a complicated object step by step, naming each choice as you go, and then produces the finished object at the end. Ordering a custom sandwich works this way: pick the bread, then the filling, then the sauces, and only then is it made. It beats one giant order form where you must fill every box in the right order.

### interview
- Intent: **separate the construction of a complex object from its representation**, building it in named steps and returning the result from a final `build()`.
- Solves the **telescoping constructor** problem: `Pizza(size, cheese, pepperoni, olives, crust, ...)` with many optional parameters is unreadable and easy to call with arguments in the wrong order.
- Each setter returns the builder (**fluent interface**); `build()` validates everything once and returns an object that can be **immutable**.
- In C++ the builder is a separate class (a friend or nested class) whose setters return `*this`. For simple cases, C++20 **designated initializers** on an aggregate (`Options{.timeout = 5, .retries = 3}`) name each field without a builder.
- The GoF form adds a **Director** that runs a fixed sequence of steps on any builder (same steps, different representations, such as HTML or PDF output).
- Examples: `std::ostringstream` assembling a string, HTTP request builders, SQL query builders, FlatBuffers' `FlatBufferBuilder`.

### deep
#### Intuition

Some objects have a few required fields and many optional ones. Constructors force you to pass everything positionally; setters on the finished object leave it mutable and half-built in between. A builder collects the choices in a separate object, then creates the real object in one go, fully valid from its first moment.

#### Worked example: telescoping constructors

```cpp
// Which argument is which?
// HttpRequest r("GET", "/api/orders", "", 30, true, false, 3);
```

With a builder:

```cpp
class HttpRequest {
    string method, url, body;
    int timeoutSeconds = 30, retries = 0;
    map<string, string> headers;
    friend class HttpRequestBuilder;
    HttpRequest() = default;                         // only the builder can create one
public:
    string str() const {
        return method + " " + url + " timeout=" + to_string(timeoutSeconds) +
               " retries=" + to_string(retries);
    }
};

class HttpRequestBuilder {
    HttpRequest r;
public:
    explicit HttpRequestBuilder(string url) {        // the required field comes first
        r.url = std::move(url);
        r.method = "GET";
    }
    HttpRequestBuilder& method(string m) { r.method = std::move(m); return *this; }
    HttpRequestBuilder& body(string b) { r.body = std::move(b); return *this; }
    HttpRequestBuilder& timeout(int s) { r.timeoutSeconds = s; return *this; }
    HttpRequestBuilder& retries(int n) { r.retries = n; return *this; }
    HttpRequestBuilder& header(const string& k, const string& v) {
        r.headers[k] = v;
        return *this;
    }
    HttpRequest build() const {                      // validate once, at the end
        if (!r.body.empty() && r.method == "GET") throw logic_error("GET cannot have a body");
        if (r.retries < 0) throw invalid_argument("retries");
        return r;                                    // a copy: the builder can be reused
    }
};

int main() {
    const HttpRequest req = HttpRequestBuilder("/api/orders")
        .method("POST").body("{}").retries(3).header("Auth", "token").build();
    cout << req.str() << "\n";   // POST /api/orders timeout=30 retries=3
}
```

| step | builder state |
|---|---|
| `HttpRequestBuilder(url)` | url set, GET, no body, 30 s, 0 retries |
| `.method("POST")` | POST |
| `.body("{}")` | body set |
| `.retries(3)` | retries 3 |
| `.build()` | checks pass, immutable `HttpRequest` created |

#### A smaller builder

```cpp
class Pizza {
    string size;
    vector<string> toppings;
    bool extraCheese = false;
    friend class PizzaBuilder;
    Pizza() = default;
public:
    string describe() const {
        string s = size + " pizza";
        for (const auto& t : toppings) s += ", " + t;
        return extraCheese ? s + ", extra cheese" : s;
    }
};

class PizzaBuilder {
    Pizza p;
public:
    explicit PizzaBuilder(string size) { p.size = std::move(size); }
    PizzaBuilder& topping(string t) { p.toppings.push_back(std::move(t)); return *this; }
    PizzaBuilder& extraCheese() { p.extraCheese = true; return *this; }
    Pizza build() {
        if (p.toppings.size() > 5) throw invalid_argument("too many toppings");
        return p;
    }
};

int main() {
    Pizza p = PizzaBuilder("large").topping("olives").topping("corn").extraCheese().build();
    cout << p.describe() << "\n";   // large pizza, olives, corn, extra cheese
}
```

#### Director (GoF form)

A director knows the recipe; builders know the output format:

```cpp
struct ReportBuilder {
    virtual ~ReportBuilder() = default;
    virtual void title(const string& t) = 0;
    virtual void row(const string& key, int value) = 0;
};

struct TextBuilder : ReportBuilder {
    string out;
    void title(const string& t) override { out += "== " + t + " ==\n"; }
    void row(const string& k, int v) override { out += k + ": " + to_string(v) + "\n"; }
};

struct CsvBuilder : ReportBuilder {
    string out = "key,value\n";
    void title(const string&) override {}           // CSV has no title line
    void row(const string& k, int v) override { out += k + "," + to_string(v) + "\n"; }
};

void makeSalesReport(ReportBuilder& b) {             // the director: fixed steps, any builder
    b.title("Sales");
    b.row("north", 120);
    b.row("south", 95);
}

int main() {
    TextBuilder text;
    CsvBuilder csv;
    makeSalesReport(text);
    makeSalesReport(csv);
    cout << text.out << csv.out;   // == Sales ==, north: 120, ... then key,value, north,120, ...
}
```

#### Pitfalls

- Using a builder for a class with two fields.
- Forgetting validation in `build()`, which loses the main benefit over setters.
- Reusing one builder for several objects when `build()` shares mutable state (copy collections in the product).

Connects to: immutability, factory method, fluent interfaces, Law of Demeter.

### questions
Q: What problem does the builder pattern solve?
A: It makes constructing objects with many parameters, especially optional ones, readable and safe. Instead of a long positional constructor, you set each value through a named method and create the object with build, which can validate the combination and return an immutable result.

Q: What is the telescoping constructor anti-pattern?
A: Providing a chain of constructors with more and more parameters to cover optional values. Call sites become long lists of positional arguments that are hard to read and easy to get in the wrong order, especially when several have the same type.

Q: Why does a builder pair well with immutable objects?
A: The builder is the mutable part that collects values step by step, and build creates the final object in one go with every field set. The product never needs setters, so it can be immutable and valid from the moment it exists.

Q: When can C++ code skip a builder?
A: When the object is a plain aggregate with sensible defaults. C++20 designated initializers such as Options{.timeout = 5, .retries = 3} already name each field and let you leave out the rest. A builder is still useful when fields must be validated together, when construction has many steps, or when the same steps must produce different representations.

Q: What does the director do in the GoF builder pattern?
A: The director encodes a fixed sequence of building steps and runs them on any builder. Different builders turn the same steps into different products, such as the same report rendered as plain text or HTML.

## oop.patterns-creational.prototype
name: "Prototype"
importance: important
scope: "cloning existing objects"

### simple
The prototype pattern creates new objects by copying an existing one instead of building from scratch. A baker who has perfected one cake decoration can copy it for the next order and change only the name written on top. Copying a ready example is quicker and does not require knowing every step that went into making it.

### interview
- Intent: create objects by **cloning a prototype** instance, then adjusting the copy.
- Useful when construction is **expensive** (loaded from disk, heavy computation), when the exact class is only known at runtime (you hold a `Shape*` and need another one like it), or to avoid a parallel hierarchy of factories.
- In C++: a **virtual `clone()`** returning `unique_ptr<Base>`, implemented with the copy constructor in each subclass (the "virtual constructor" idiom). The clone is only as deep as that copy constructor.
- A **prototype registry** maps names to preconfigured prototypes: `registry.get("red-circle")` returns a fresh clone.
- Main decision: **shallow vs deep** cloning; cloned objects must not share mutable parts they are supposed to own.
- Examples: duplicating slides or shapes in an editor, game units spawned from templates, preconfigured request objects.

### deep
#### Intuition

A drawing editor has "duplicate" for any selected shape. The code holds a `Shape*` and cannot write `new Circle(*s)` because it does not know the shape is a circle. Asking the object to copy itself solves this: each class knows how to clone itself, and the caller only needs the base interface.

#### Code: polymorphic clone

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual unique_ptr<Shape> clone() const = 0;          // "copy yourself"
    virtual string describe() const = 0;
    int x = 0, y = 0;
};

struct Circle : Shape {
    int r;
    explicit Circle(int r) : r(r) {}
    unique_ptr<Shape> clone() const override { return make_unique<Circle>(*this); }   // copy ctor
    string describe() const override {
        return "circle r=" + to_string(r) + " at " + to_string(x) + "," + to_string(y);
    }
};

struct Polygon : Shape {
    vector<pair<int, int>> points;                        // owned: copied by vector's copy ctor
    unique_ptr<Shape> clone() const override { return make_unique<Polygon>(*this); }
    string describe() const override {
        return "polygon with " + to_string(points.size()) + " points";
    }
};

class Registry {                                          // prototype registry
    map<string, unique_ptr<Shape>> prototypes;
public:
    void add(const string& name, unique_ptr<Shape> s) { prototypes[name] = std::move(s); }
    unique_ptr<Shape> make(const string& name) const { return prototypes.at(name)->clone(); }
};

int main() {
    Registry reg;
    reg.add("big-circle", make_unique<Circle>(50));
    auto a = reg.make("big-circle");
    auto b = a->clone();                                  // we don't know it's a Circle
    b->x = 10;
    cout << a->describe() << " | " << b->describe() << "\n";
    // circle r=50 at 0,0 | circle r=50 at 10,0
}
```

#### Worked example: cloning a level in a game

| step | action | objects |
|---|---|---|
| 1 | load "goblin" prototype from disk once (slow) | 1 prototype |
| 2 | spawn 3 goblins by `clone()` | prototype + 3 clones |
| 3 | change clone 2's position and health | only clone 2 changes |
| 4 | patch the prototype's sprite | later clones get the new sprite; existing clones keep theirs |

Step 4 shows the semantics: a clone is a snapshot, not a live link.

#### Deep enough clones

```cpp
struct Section { string heading, text; };

struct Document {
    string title;
    vector<shared_ptr<Section>> sections;             // pointers: the default copy shares them

    Document clone() const {                          // deep: copies each Section too
        Document d{title, {}};
        for (const auto& s : sections) d.sections.push_back(make_shared<Section>(*s));
        return d;
    }
};

int main() {
    Document tmpl{"Weekly report", {make_shared<Section>(Section{"Summary", ""})}};
    Document week1 = tmpl.clone();
    Document shallow = tmpl;                          // copies the pointers only
    week1.sections[0]->text = "Shipped search";
    shallow.sections[0]->text = "oops";
    cout << tmpl.sections[0]->text << " | " << week1.sections[0]->text << "\n";
    // oops | Shipped search
}
```

The default copy (`shallow`) copies the pointers, so both documents share one `Section` and filling in the copy also changed the template. `clone()` copies the sections themselves.

#### Writing clone() once

Every subclass repeating the same `clone()` is boilerplate. A small CRTP helper writes it once:

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual unique_ptr<Shape> clone() const = 0;
    virtual string name() const = 0;
};

template <class Derived>
struct ShapeCloner : Shape {                          // writes clone() once for every subclass
    unique_ptr<Shape> clone() const override {
        return make_unique<Derived>(static_cast<const Derived&>(*this));
    }
};

struct Square : ShapeCloner<Square> {
    int side = 2;
    string name() const override { return "square " + to_string(side); }
};

int main() {
    Square s;
    s.side = 7;
    unique_ptr<Shape> copy = s.clone();
    cout << copy->name() << "\n";                     // square 7
}
```

#### Pitfalls

- Shallow clones sharing owned mutable state.
- Cloning objects that hold unique resources (sockets, file handles, ids) without resetting them.
- Deep cloning object graphs with cycles or shared nodes without a memo (a map from each old node to its copy), which loops forever or duplicates the shared nodes.

Connects to: shallow vs deep copy, factory method, polymorphism, method overloading vs overriding.

### questions
Q: What is the prototype pattern?
A: A creational pattern where new objects are created by copying an existing instance, the prototype, and then adjusting the copy. Each class implements its own clone, so callers can duplicate objects through a base interface without knowing their concrete class.

Q: When is prototype better than constructing a new object?
A: When construction is expensive, such as loading or computing initial state, when the concrete class is only known at runtime, or when many preconfigured variants are needed and a registry of prototypes is simpler than a factory per variant.

Q: How do you implement a polymorphic clone in C++?
A: Declare a virtual clone method in the base class that returns a unique_ptr to the base, and override it in each subclass to return make_unique of the subclass constructed from *this. The subclass's copy constructor does the actual copying.

Q: What is the main pitfall when cloning objects?
A: Accidentally making a shallow copy, so the clone shares mutable parts the original owns, like lists or nested objects, and changing one changes the other. Owned parts must be deep-copied, while unique resources such as ids or file handles need resetting.
