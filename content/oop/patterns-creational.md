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
- Thread-safe lazy variants: C++11 **function-local static** (the Meyers singleton); Java **holder idiom** (a nested class holds the instance), **double-checked locking with `volatile`**, or an **enum** (Effective Java's choice, safe against reflection and serialization). In Python a module-level object is already a singleton.
- Criticism: it is **global mutable state**, hides dependencies, makes tests share state and hard to fake, mixes "what it does" with "how many exist", and "one per process" breaks with multiple class loaders or processes.
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

#### Java: lazy and thread-safe variants

```java
class EagerLogger {                                   // eager: created when the class loads
    private static final EagerLogger INSTANCE = new EagerLogger();
    private EagerLogger() {}
    static EagerLogger get() { return INSTANCE; }
}

class HolderLogger {                                  // lazy via the holder idiom
    private HolderLogger() {}
    private static class Holder { static final HolderLogger INSTANCE = new HolderLogger(); }
    static HolderLogger get() { return Holder.INSTANCE; }   // Holder loads on first call
}

class DclLogger {                                     // double-checked locking
    private static volatile DclLogger instance;       // volatile is essential
    private DclLogger() {}
    static DclLogger get() {
        DclLogger local = instance;
        if (local == null) {                          // first check, no lock
            synchronized (DclLogger.class) {
                local = instance;
                if (local == null) instance = local = new DclLogger();   // second check
            }
        }
        return local;
    }
}

enum EnumLogger {                                     // Effective Java's recommendation
    INSTANCE;
    void log(String msg) { System.out.println(msg); }
}
```

Why `volatile` in double-checked locking: without it, the write of the reference may become visible to another thread before the constructor's writes, so that thread sees a non-null but half-built object. `volatile` forbids that reordering.

#### Worked example: two threads, lazy creation without a lock

| time | thread A | thread B | instances |
|---|---|---|---|
| 1 | reads `instance == null` | | 0 |
| 2 | | reads `instance == null` | 0 |
| 3 | creates object #1 | | 1 |
| 4 | | creates object #2, overwrites | 2 created, 1 kept |

A naive `if (instance == null) instance = new X();` breaks the one guarantee. The variants above close this race.

#### Python

```python
class Registry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:                 # not thread-safe; add a lock if threads race
            cls._instance = super().__new__(cls)
            cls._instance.items = {}
        return cls._instance


print(Registry() is Registry())   # True
# More idiomatic: put `registry = Registry()` in a module; imports share that one object.
```

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

Q: Why does double-checked locking in Java need volatile?
A: Without volatile, the compiler or CPU may publish the reference to the new object before its constructor's writes are visible. Another thread passing the unsynchronized first check could then use a partly constructed object. volatile prevents this reordering and makes the write visible safely.

Q: What is the difference between eager and lazy singletons?
A: An eager singleton creates its instance when the class is loaded or the program starts, which is simple and thread-safe but pays the cost even if it is never used. A lazy singleton creates the instance on first use, which saves work but needs care to stay thread-safe.

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
- The everyday cousin is the **simple factory**: one function or static method that picks a class from a parameter (`NotificationFactory.create("sms")`). Not a GoF pattern, but what many interviewers mean by "factory".
- **Static factory methods** (`Integer.valueOf`, `List.of`, `make_unique`) have names, can cache or reuse instances, and can return a subtype.
- Benefits: callers depend on the product interface, not concrete classes; creation logic lives in one place; new products need no change in client code (open/closed).
- Costs: more classes; a simple factory's `switch` still grows with each new type (a registry map avoids that).
- Signals to use it: `new ConcreteClass` scattered around, object type chosen from config or input, or setup logic repeated at every creation site.

### deep
#### Intuition

`new EmailSender()` hard-codes a decision into the caller. If the decision depends on configuration, on the platform or on a subclass's needs, that line has to move somewhere central. A factory method is that somewhere: one place that knows how to build the right object, behind a method that returns an abstraction.

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

```python
class Notifier:
    def send(self, to, text):
        raise NotImplementedError


class EmailNotifier(Notifier):
    def send(self, to, text):
        return f"email {to}: {text}"


class SmsNotifier(Notifier):
    def send(self, to, text):
        return f"sms {to}: {text}"


class NotifierFactory:
    _registry = {"email": EmailNotifier, "sms": SmsNotifier}

    @classmethod
    def register(cls, kind, klass):          # new kinds plug in without editing create()
        cls._registry[kind] = klass

    @classmethod
    def create(cls, kind):
        try:
            return cls._registry[kind]()
        except KeyError:
            raise ValueError(f"unknown notifier: {kind}") from None


class PushNotifier(Notifier):
    def send(self, to, text):
        return f"push {to}: {text}"


NotifierFactory.register("push", PushNotifier)
for kind in ["email", "sms", "push"]:
    print(NotifierFactory.create(kind).send("asha", "hi"))
```

#### Worked example: where creation logic lives

| situation | without a factory | with a factory |
|---|---|---|
| choose the sender from config | `if` chain at every call site | one `create(config.kind)` |
| add a push sender | edit every `if` chain | register one class |
| test with a fake sender | patch constructors | register or inject a fake |
| a sender needs a retry wrapper | edit every `new` | wrap inside `create` |

#### Static factory methods

```java
final class Temperature {
    private final double kelvin;
    private Temperature(double k) { kelvin = k; }
    static Temperature ofCelsius(double c) { return new Temperature(c + 273.15); }   // named
    static Temperature ofFahrenheit(double f) { return ofCelsius((f - 32) * 5 / 9); }
    double celsius() { return kelvin - 273.15; }
}
```

Two constructors taking one `double` each could not coexist; named static factories can, and they read clearly at the call site. `Integer.valueOf(5)` goes further and returns a cached object.

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

```python
class DarkFactory:
    def button(self):
        return "[dark button]"

    def checkbox(self):
        return "[dark checkbox]"


class LightFactory:
    def button(self):
        return "[light button]"

    def checkbox(self):
        return "[light checkbox]"


def settings_screen(ui):
    return f"{ui.button()} {ui.checkbox()}"


print(settings_screen(LightFactory()))   # [light button] [light checkbox]
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
- Java's common form is a static nested `Builder` (Effective Java); C++ uses a fluent builder or C++20 designated initializers for simple cases; Python usually just uses **keyword arguments with defaults**.
- The GoF form adds a **Director** that runs a fixed sequence of steps on any builder (same steps, different representations, such as HTML or PDF output).
- Examples: `StringBuilder`, HTTP request builders, query builders, `ProcessBuilder`, protobuf message builders.

### deep
#### Intuition

Some objects have a few required fields and many optional ones. Constructors force you to pass everything positionally; setters on the finished object leave it mutable and half-built in between. A builder collects the choices in a separate object, then creates the real object in one go, fully valid from its first moment.

#### Worked example: telescoping constructors

```java
// Which argument is which?
// new HttpRequest("GET", "/api/orders", null, 30, true, false, 3)
```

With a builder:

```java
final class HttpRequest {
    private final String method, url, body;
    private final int timeoutSeconds, retries;
    private final Map<String, String> headers;

    private HttpRequest(Builder b) {
        method = b.method; url = b.url; body = b.body;
        timeoutSeconds = b.timeoutSeconds; retries = b.retries;
        headers = Map.copyOf(b.headers);
    }

    static Builder builder(String url) { return new Builder(url); }   // required field up front

    static final class Builder {
        private final String url;
        private String method = "GET", body = null;
        private int timeoutSeconds = 30, retries = 0;
        private final Map<String, String> headers = new HashMap<>();

        private Builder(String url) { this.url = url; }
        Builder method(String m) { method = m; return this; }
        Builder body(String b) { body = b; return this; }
        Builder timeout(int s) { timeoutSeconds = s; return this; }
        Builder retries(int r) { retries = r; return this; }
        Builder header(String k, String v) { headers.put(k, v); return this; }

        HttpRequest build() {                                 // validate once, at the end
            if (body != null && method.equals("GET"))
                throw new IllegalStateException("GET cannot have a body");
            if (retries < 0) throw new IllegalArgumentException("retries");
            return new HttpRequest(this);
        }
    }

    @Override public String toString() {
        return method + " " + url + " timeout=" + timeoutSeconds + " retries=" + retries;
    }

    public static void main(String[] args) {
        HttpRequest r = HttpRequest.builder("/api/orders")
            .method("POST").body("{}").retries(3).header("Auth", "token").build();
        System.out.println(r);   // POST /api/orders timeout=30 retries=3
    }
}
```

| step | builder state |
|---|---|
| `builder(url)` | url set, GET, no body, 30 s, 0 retries |
| `.method("POST")` | POST |
| `.body("{}")` | body set |
| `.retries(3)` | retries 3 |
| `.build()` | checks pass, immutable `HttpRequest` created |

#### C++ and Python

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

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Pizza:                     # keyword arguments with defaults do the builder's job
    size: str
    toppings: tuple = ()
    extra_cheese: bool = False
    crust: str = field(default="thin")


print(Pizza("large", toppings=("olives",), extra_cheese=True))
```

#### Director (GoF form)

A director knows the recipe; builders know the output format:

```python
class Director:
    def make_report(self, builder):
        builder.title("Sales")
        builder.row("north", 120)
        return builder.result()


class TextBuilder:
    def __init__(self):
        self.lines = []

    def title(self, t):
        self.lines.append(t.upper())

    def row(self, k, v):
        self.lines.append(f"{k}: {v}")

    def result(self):
        return "\n".join(self.lines)


print(Director().make_report(TextBuilder()))
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

Q: Do you need the builder pattern in Python?
A: Usually not. Keyword arguments with default values already give named, optional parameters, and dataclasses can make the result frozen. A builder is still useful when construction has many steps or must produce different representations.

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
- C++: a **virtual `clone()`** returning `unique_ptr<Base>`, implemented with the copy constructor in each subclass. Java: `Cloneable` and `clone()` (awkward) or copy constructors. Python: `copy.copy` or `copy.deepcopy`.
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
    string describe() const override { return "polygon with " + to_string(points.size()) + " points"; }
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

#### Python

```python
import copy


class Document:
    def __init__(self, title, sections):
        self.title = title
        self.sections = sections          # a list of dicts: must be deep-copied

    def clone(self):
        return copy.deepcopy(self)


template = Document("Weekly report", [{"heading": "Summary", "text": ""}])
week1 = template.clone()
week1.sections[0]["text"] = "Shipped search"
print(template.sections[0]["text"] == "", week1.sections[0]["text"])   # True Shipped search
```

With `copy.copy` instead, both documents would share the same section dictionaries, and filling in week 1 would also change the template.

#### Java notes

`Object.clone()` is shallow, bypasses constructors, requires the `Cloneable` marker and throws a checked exception if it is missing. A copy constructor plus a `copy()` method is the common, clearer alternative:

```java
class Sheep {
    String name;
    List<String> tags = new ArrayList<>();
    Sheep(String name) { this.name = name; }
    Sheep(Sheep other) { this.name = other.name; this.tags = new ArrayList<>(other.tags); }
    Sheep copy() { return new Sheep(this); }
}
```

#### Pitfalls

- Shallow clones sharing owned mutable state.
- Cloning objects that hold unique resources (sockets, file handles, ids) without resetting them.
- Deep cloning object graphs with cycles without a memo (Python's `deepcopy` handles it; hand-written code must too).

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
