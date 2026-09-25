---
topic: oop.patterns-behavioral
name: "Behavioral design patterns"
subject: oop
order: 8
prereqs: [oop.principles]
---

## oop.patterns-behavioral.strategy
name: "Strategy"
importance: must
scope: "swappable algorithms behind one interface"

### simple
The strategy pattern puts each way of doing a task in its own object, so you can swap one for another. A maps app can plan a trip for driving, walking or cycling: the trip stays the same, but the routing method changes with one tap. Your code keeps the task and plugs in whichever method fits.

### interview
- Intent: define a **family of algorithms**, encapsulate each one, and make them **interchangeable**; the **context** holds a strategy and delegates to it.
- Replaces `if`/`switch` chains on "which algorithm" and follows the open/closed principle: a new algorithm is a new class.
- In modern C++ a strategy is often just a **callable**: a comparator passed to `sort`, a lambda, or a `std::function` member.
- Typical uses: pricing and discount rules, payment methods, compression formats, routing, retry and backoff policies, rate-limiting algorithms (token bucket vs sliding window).
- **Strategy vs state**: the client picks a strategy and it rarely changes itself; a state object decides the next state on its own. **Strategy vs template method**: composition and swappable at runtime vs inheritance and fixed at compile time.
- Cost: clients must know the strategies exist to choose one; tiny strategies may be clearer as plain functions.

### deep
#### Intuition

A checkout needs a shipping cost, and the rule depends on the carrier. Writing `if (carrier == "standard") ... else if (carrier == "express") ...` inside `Checkout` means every new carrier edits checkout code. Moving each rule into its own object lets `Checkout` just ask "the current rule" for a price.

#### Code

```cpp
class ShippingStrategy {
public:
    virtual ~ShippingStrategy() = default;
    virtual double cost(double weightKg) const = 0;
};
class Standard : public ShippingStrategy {
public:
    double cost(double w) const override { return 40 + 10 * w; }
};
class Express : public ShippingStrategy {
public:
    double cost(double w) const override { return 100 + 25 * w; }
};
class FreeAbove : public ShippingStrategy {        // a strategy can wrap another
    double threshold; const ShippingStrategy& fallback; double orderValue;
public:
    FreeAbove(double t, const ShippingStrategy& f, double v)
        : threshold(t), fallback(f), orderValue(v) {}
    double cost(double w) const override { return orderValue >= threshold ? 0 : fallback.cost(w); }
};

class Checkout {                                  // the context
    const ShippingStrategy* shipping;
public:
    explicit Checkout(const ShippingStrategy& s) : shipping(&s) {}
    void setShipping(const ShippingStrategy& s) { shipping = &s; }   // swap at runtime
    double total(double items, double weightKg) const { return items + shipping->cost(weightKg); }
};

int main() {
    Standard standard; Express express;
    FreeAbove promo(1000, standard, 1200);
    Checkout c(standard);
    cout << c.total(500, 2) << " ";               // 560
    c.setShipping(express);
    cout << c.total(500, 2) << " ";               // 650
    c.setShipping(promo);
    cout << c.total(1200, 2) << "\n";             // 1200
    // The lightest strategy is a function: sort with a custom comparator.
    vector<string> names = {"Ravi", "Al", "Christina"};
    sort(names.begin(), names.end(),
         [](const string& a, const string& b) { return a.size() < b.size(); });
    cout << names[0] << "\n";                     // Al
}
```

#### Worked example

| call | strategy | computation | total |
|---|---|---|---|
| `total(500, 2)` | Standard | 40 + 10 × 2 = 60 | 560 |
| `total(500, 2)` | Express | 100 + 25 × 2 = 150 | 650 |
| `total(1200, 2)` | FreeAbove(1000) | order ≥ 1000, so 0 | 1200 |

Adding a "same day" carrier means one new class; `Checkout` is untouched.

#### Choosing the strategy

The context should not pick its own strategy with a `switch`, or the switch just moves. Choose it at the edge (from config, user input or a factory) and inject it. A map from name to strategy is a common registry:

```cpp
using Shipping = function<double(double)>;           // a strategy as a plain function

int main() {
    map<string, Shipping> strategies = {             // the registry lives at the edge
        {"standard", [](double w) { return 40 + 10 * w; }},
        {"express", [](double w) { return 100 + 25 * w; }},
    };
    string fromConfig = "express";
    Shipping ship = strategies.at(fromConfig);
    cout << 100 + ship(1) << "\n";                   // 225
}
```

#### Strategy vs state vs template method

| | who chooses the behavior | how it changes |
|---|---|---|
| strategy | the client, from outside | swapped by the client |
| state | the state objects themselves | each state picks the next |
| template method | subclass, at compile time | fixed per subclass |

#### Pitfalls

- Strategies that need lots of the context's data; pass what they need as arguments or give them a narrow interface to the context.
- A class hierarchy for what could be three lambdas.
- Hidden stateful strategies shared between contexts; make them stateless or give each context its own.

Connects to: open/closed principle, polymorphism, state, template method, rate limiter.

### questions
Q: What is the strategy pattern?
A: A behavioral pattern that defines a family of interchangeable algorithms behind one interface. A context object holds a reference to a strategy and delegates the varying work to it, so the algorithm can be chosen or swapped without changing the context.

Q: How does strategy help with the open/closed principle?
A: New algorithms are added as new strategy classes or functions rather than new branches in an if-else chain inside the context. The context's code stays closed to modification while its behavior is open to extension.

Q: What is the difference between strategy and state?
A: Both delegate behavior to an interchangeable object. In strategy, the client chooses the algorithm and it usually does not change on its own. In state, the state objects represent the context's current condition and trigger transitions to other states themselves.

Q: How are strategies usually expressed in modern languages?
A: Often as lambdas or other callables instead of classes: a comparator passed to sort, or a std::function member that holds the chosen behavior. A class hierarchy is still useful when strategies carry configuration or several related methods.

Q: Give an interview example where strategy fits naturally.
A: A rate limiter that supports token bucket, fixed window and sliding window algorithms behind one RateLimiter interface, or a payment service with card, UPI and wallet payment strategies. The calling code stays the same while the algorithm is chosen by configuration.

## oop.patterns-behavioral.observer
name: "Observer"
importance: must
scope: "publish and subscribe to changes"

### simple
The observer pattern lets objects sign up to hear about changes in another object. It is like subscribing to a newspaper: the publisher does not need to know who you are, it just sends each new issue to everyone on the list. When something changes, all subscribers are told automatically.

### interview
- Intent: a **one-to-many dependency** so that when the **subject** changes state, all registered **observers** are notified.
- API: `subscribe` (attach), `unsubscribe` (detach), `notify`. The subject knows only an observer interface, so it is loosely coupled to them.
- **Push** model (send the new data with the notification) vs **pull** model (notify, then observers query what they need).
- Pitfalls: **lapsed listener** memory leaks (forgotten unsubscribes keep observers alive), observers changing the list during notification, slow or throwing observers blocking the rest, unpredictable ordering, update cascades.
- **Observer vs publish-subscribe**: in observer the subject holds its observers directly; pub-sub puts a **broker or event bus** in between, so publishers and subscribers never know each other (and it often runs asynchronously across services).
- Real uses: GUI event listeners, model-view updates, reactive streams (RxJS), stock tickers, webhooks at system scale.

### deep
#### Intuition

A stock price changes, and a chart, an alert rule and a portfolio total all need to react. If the price object called each of them by name, adding a fourth reaction would mean editing the price class. Instead, anything interested registers a callback, and the price object just says "I changed" to whoever is on the list.

#### Code

```cpp
class Stock {                                           // the subject
public:
    using Listener = function<void(const string&, double)>;
    int subscribe(Listener l) { listeners[nextId] = std::move(l); return nextId++; }
    void unsubscribe(int id) { listeners.erase(id); }
    void setPrice(double p) {
        price = p;
        auto snapshot = listeners;  // copy: listeners may unsubscribe while notified
        for (auto& [id, l] : snapshot) l(symbol, price);   // push model: send the new price
    }
    explicit Stock(string s) : symbol(std::move(s)) {}
private:
    string symbol;
    double price = 0;
    map<int, Listener> listeners;
    int nextId = 0;
};

int main() {
    Stock infy("INFY");
    int chart = infy.subscribe([](const string& s, double p) {
        cout << "chart " << s << " " << p << "\n";
    });
    double highest = 0;
    infy.subscribe([&highest](const string&, double p) { highest = max(highest, p); });
    infy.setPrice(1500);                                // both listeners run
    infy.unsubscribe(chart);
    infy.setPrice(1520);                                // only the tracker runs
    cout << "highest " << highest << "\n";              // highest 1520
}
```

#### Worked example

| event | observers registered | who is called |
|---|---|---|
| subscribe chart (id 0) | chart | - |
| subscribe tracker (id 1) | chart, tracker | - |
| `setPrice(1500)` | chart, tracker | chart prints, tracker sets 1500 |
| `unsubscribe(0)` | tracker | - |
| `setPrice(1520)` | tracker | tracker sets 1520 |

#### Problems to design for

- **Lapsed listeners**: a subject that outlives its observers keeps them alive (in GC languages) or calls dead objects (in C++). Return an unsubscribe token, unsubscribe in destructors, or hold weak references.
- **Modification during notification**: iterate over a snapshot, as both examples do.
- **Error isolation**: one observer throwing should not stop the others; catch and log per observer if needed.
- **Slow observers**: synchronous notification blocks the subject; hand events to a queue for heavy work.
- **Cascades and cycles**: an observer that updates another subject can trigger loops; guard against re-entrant updates.

#### Observer and pub-sub

| | observer | publish-subscribe |
|---|---|---|
| coupling | subject holds observers | both sides know only the broker and topic |
| delivery | usually synchronous, in-process | often asynchronous, across processes |
| example | GUI listener, model-view | Kafka, Redis pub/sub, cloud event buses |

Connects to: publish-subscribe and event-driven architecture, mediator, dependency inversion principle, MVC.

### questions
Q: What is the observer pattern?
A: A behavioral pattern where a subject keeps a list of observers and notifies them all when its state changes. Observers register and unregister themselves, and the subject depends only on an observer interface, not on their concrete classes.

Q: What is the difference between the push and pull models?
A: In the push model the subject sends the changed data along with the notification. In the pull model it only signals that something changed, and each observer queries the subject for the data it needs. Push is simpler for small updates; pull avoids sending data observers do not want.

Q: What is the lapsed listener problem?
A: Observers that are never unsubscribed stay referenced by the subject, so they cannot be garbage collected and may keep receiving events after they are no longer needed. The fix is to unsubscribe explicitly, return unsubscribe handles, or use weak references.

Q: How does the observer pattern differ from publish-subscribe?
A: In observer, the subject knows and calls its observers directly, usually synchronously. In publish-subscribe, publishers send messages to a broker or event bus on a topic, and subscribers receive them from the broker, so neither side knows the other and delivery is often asynchronous.

Q: What can go wrong if an observer unsubscribes during notification?
A: The subject may be iterating over the same list that is being modified, which can skip observers, call removed ones, or invalidate iterators and crash in C++. Iterating over a copy of the list, or deferring removals until notification ends, avoids this.

## oop.patterns-behavioral.command
name: "Command"
importance: important
scope: "requests as objects, undo and redo"

### simple
The command pattern turns an action into an object you can store, pass around, run later or undo. A restaurant order slip is a command: the waiter writes it, the kitchen carries it out later, and it can be cancelled or repeated. Because every action is written down as an object, you can keep a history and step back through it.

### interview
- Intent: **encapsulate a request as an object** with an `execute()` method (and often `undo()`), separating who asks (**invoker**) from who does the work (**receiver**).
- Enables **undo and redo** (stacks of executed commands), **queues and scheduling** (job queues, thread pools run `Runnable`s), **macros** (a composite command), **logging and replay** (event sourcing, database redo logs).
- Undo needs each command to store enough state to reverse itself (the deleted text, the old value).
- Redo stack rule: after a new command runs, the redo stack is **cleared**, because it no longer matches the history.
- In modern code simple commands are just closures (`Runnable`, `std::function<void()>`); a class is worth it when you need undo, metadata or serialization.
- Examples: GUI buttons and menu items bound to actions, text editor operations, remote controls, transactional scripts.

### deep
#### Code: an editor with undo and redo

```cpp
class Document {                                         // the receiver
public:
    string text;
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class Insert : public Command {
    Document& doc; size_t pos; string s;
public:
    Insert(Document& d, size_t p, string s) : doc(d), pos(p), s(std::move(s)) {}
    void execute() override { doc.text.insert(pos, s); }
    void undo() override { doc.text.erase(pos, s.size()); }
};

class Erase : public Command {
    Document& doc; size_t pos, len; string removed;       // remembers what it deleted
public:
    Erase(Document& d, size_t p, size_t n) : doc(d), pos(p), len(n) {}
    void execute() override { removed = doc.text.substr(pos, len); doc.text.erase(pos, len); }
    void undo() override { doc.text.insert(pos, removed); }
};

class Editor {                                           // the invoker keeps the history
    vector<unique_ptr<Command>> undoStack, redoStack;
public:
    void run(unique_ptr<Command> c) {
        c->execute();
        undoStack.push_back(std::move(c));
        redoStack.clear();                               // new action: old redo path is invalid
    }
    void undo() {
        if (undoStack.empty()) return;
        undoStack.back()->undo();
        redoStack.push_back(std::move(undoStack.back()));
        undoStack.pop_back();
    }
    void redo() {
        if (redoStack.empty()) return;
        redoStack.back()->execute();
        undoStack.push_back(std::move(redoStack.back()));
        redoStack.pop_back();
    }
};

int main() {
    Document doc; Editor ed;
    ed.run(make_unique<Insert>(doc, 0, "hello"));
    ed.run(make_unique<Insert>(doc, 5, " world"));
    ed.run(make_unique<Erase>(doc, 0, 6));
    cout << doc.text << "\n";      // world
    ed.undo(); cout << doc.text << "\n";   // hello world
    ed.undo(); cout << doc.text << "\n";   // hello
    ed.redo(); cout << doc.text << "\n";   // hello world
}
```

#### Worked example: the two stacks

| action | text | undo stack | redo stack |
|---|---|---|---|
| insert "hello" | hello | [I1] | [] |
| insert " world" | hello world | [I1, I2] | [] |
| erase 6 at 0 | world | [I1, I2, E] | [] |
| undo | hello world | [I1, I2] | [E] |
| undo | hello | [I1] | [E, I2] |
| redo | hello world | [I1, I2] | [E] |

If the user typed something new now, the redo stack would be cleared, since `E` no longer fits the new text.

#### Commands as closures and queues

```cpp
int main() {
    queue<function<void()>> jobs;                    // each job is a command
    vector<string> log;
    jobs.push([&] { log.push_back("send email"); });
    jobs.push([&] { log.push_back("resize image"); });
    while (!jobs.empty()) {                          // the worker executes them later
        jobs.front()();
        jobs.pop();
    }
    for (const auto& s : log) cout << s << "\n";     // send email, resize image
}
```

#### Pitfalls

- Undo that depends on state other commands changed; store positions and values carefully, or snapshot (memento).
- Unbounded history eats memory; cap the stack.
- Commands holding references to objects that may be destroyed before execution.

Connects to: stacks, strategy, composite, memento, event sourcing, thread pools.

### questions
Q: What is the command pattern?
A: A behavioral pattern that wraps a request, such as an action on a receiver, in an object with an execute method. The invoker that triggers it does not need to know what it does, and the object can be stored, queued, logged, or undone.

Q: How do you implement undo and redo with commands?
A: Each command implements execute and undo and stores what it needs to reverse itself. Executed commands go on an undo stack; undo pops one, calls undo and pushes it on a redo stack; redo does the opposite. Running a new command clears the redo stack.

Q: Where is the command pattern used outside text editors?
A: Job queues and thread pools execute Runnable or task objects, GUI toolkits bind buttons to action objects, remote controls map buttons to commands, and databases and event-sourced systems log operations so they can be replayed.

Q: When is a plain function enough instead of a command class?
A: When you only need to run the action later or pass it around, a lambda or Runnable is enough. A class earns its place when the command needs undo, a name or description, serialization, or other metadata.

## oop.patterns-behavioral.state
name: "State"
importance: important
scope: "behavior changes with internal state"

### simple
The state pattern lets an object change how it behaves when its situation changes, as if it became a different object. A traffic light reacts to a timer differently when it is red, green or yellow. Instead of one big "if red, else if green" block, each color gets its own small object that knows what to do and which color comes next.

### interview
- Intent: allow an object to **alter its behavior when its internal state changes**; each state is a class implementing the same interface, and the **context** delegates to its current state object.
- Replaces large `switch (state)` blocks repeated across many methods; each state's rules live together, and adding a state means adding a class.
- **Transitions** are usually decided by the state objects (`return next state`) or by the context from a table.
- Classic interview use: **vending machine** (idle, has money, dispensing, sold out), also ATM, traffic light, document workflow (draft, review, published), TCP connection, order lifecycle.
- Relationship to **finite state machines**: the pattern is an object-oriented implementation of an FSM; for many states with simple rules, a transition table may be clearer.
- **State vs strategy**: same structure, different intent; states know about and switch to each other, strategies are chosen from outside.

### deep
#### Code: a vending machine

```cpp
class VendingMachine;

class State {
public:
    virtual ~State() = default;
    virtual string insertCoin(VendingMachine& m) = 0;
    virtual string pressButton(VendingMachine& m) = 0;
};

class VendingMachine {                                       // the context
    unique_ptr<State> state;
public:
    int stock;
    explicit VendingMachine(int stock);
    void setState(unique_ptr<State> s) { state = std::move(s); }
    string insertCoin() { return state->insertCoin(*this); }   // delegate to the current state
    string pressButton() { return state->pressButton(*this); }
};

class SoldOut : public State {
    string insertCoin(VendingMachine&) override { return "sold out, coin returned"; }
    string pressButton(VendingMachine&) override { return "sold out"; }
};

class Idle : public State {
    string insertCoin(VendingMachine& m) override;
    string pressButton(VendingMachine&) override { return "insert a coin first"; }
};

class HasCoin : public State {
    string insertCoin(VendingMachine&) override { return "already have a coin"; }
    string pressButton(VendingMachine& m) override {
        --m.stock;
        if (m.stock == 0) m.setState(make_unique<SoldOut>());
        else m.setState(make_unique<Idle>());
        return "here is your snack";                        // no members used after setState
    }
};

string Idle::insertCoin(VendingMachine& m) {
    m.setState(make_unique<HasCoin>());
    return "coin accepted";
}

VendingMachine::VendingMachine(int stock) : stock(stock) {
    if (stock > 0) state = make_unique<Idle>();
    else state = make_unique<SoldOut>();
}

int main() {
    VendingMachine m(1);
    cout << m.pressButton() << "\n";   // insert a coin first
    cout << m.insertCoin() << "\n";    // coin accepted
    cout << m.insertCoin() << "\n";    // already have a coin
    cout << m.pressButton() << "\n";   // here is your snack (stock is now 0)
    cout << m.insertCoin() << "\n";    // sold out, coin returned
}
```

#### Worked example: the transition table

| state | insert coin | press button |
|---|---|---|
| Idle | → HasCoin, "coin accepted" | stays, "insert a coin first" |
| HasCoin | stays, "already have a coin" | stock - 1; → Idle, or SoldOut if stock is 0 |
| SoldOut | stays, "coin returned" | stays, "sold out" |

Each row is one class. With a `switch`, the same three cases would appear inside every method, and adding a "maintenance" state would edit all of them.

#### Table-driven alternative

```cpp
int main() {
    map<pair<string, string>, string> transitions = {
        {{"idle", "coin"}, "has_coin"},
        {{"has_coin", "button"}, "idle"},
        {{"idle", "button"}, "idle"},
        {{"has_coin", "coin"}, "has_coin"},
    };
    string state = "idle", trail = "idle";
    for (string event : {"button", "coin", "coin", "button"}) {
        auto it = transitions.find({state, event});
        if (it != transitions.end()) state = it->second;
        trail += " " + state;
    }
    cout << trail << "\n";   // idle idle has_coin has_coin idle
}
```

Use classes when each state has real behavior; use a table when states differ mainly in where they go next.

#### Pitfalls

- A state replacing itself and then touching its own members (it may already be destroyed); return right after `setState`, as above.
- Scattering transition logic between states and the context; pick one place.
- States that need lots of context data; pass the context in, as here.

Connects to: strategy, vending machine, finite state machines, command.

### questions
Q: What is the state pattern?
A: A behavioral pattern where an object delegates its behavior to a state object representing its current condition. Each state is a class implementing a common interface, and changing the state object changes how the context behaves, which replaces large switch statements on a state field.

Q: How would you model a vending machine with the state pattern?
A: Define a State interface with methods like insertCoin, selectItem and dispense, and states such as Idle, HasMoney, Dispensing and SoldOut. The machine holds the current state and forwards each call to it, and each state performs its action and sets the next state.

Q: What is the difference between the state and strategy patterns?
A: They share a structure, but in state the state objects represent the context's condition and trigger transitions to each other, while in strategy the client picks an algorithm from outside and it does not switch itself.

Q: When is a transition table better than state classes?
A: When there are many states and events but little behavior per state beyond choosing the next state. A table from state and event to next state is compact, easy to review and easy to validate, while classes shine when each state has distinct logic.

## oop.patterns-behavioral.template-method
name: "Template method"
importance: important
scope: "fixed skeleton, customizable steps"

### simple
The template method pattern fixes the order of steps in a process and lets subclasses fill in some of the steps. A recipe card for "make tea" always says boil water, brew, pour, add extras, and each kind of tea changes only the brewing and the extras. The base class owns the order, so no subclass can forget a step or shuffle them.

### interview
- Intent: define the **skeleton of an algorithm** in a base class method and let subclasses **override specific steps** without changing the overall structure.
- The template method itself is non-overridable (a public non-virtual function in C++, the non-virtual interface idiom); steps are abstract (must override) or **hooks** with a default (may override).
- "**Hollywood principle**": don't call us, we'll call you; the base class calls the subclass's steps.
- C++'s **non-virtual interface (NVI)** idiom is the same idea: public non-virtual functions that call private or protected virtual ones, so the base can add checks before and after.
- Examples: framework lifecycles (`SetUp`/`TearDown` in GoogleTest fixtures, a game loop's `update` and `render` hooks), data import pipelines (read, parse, validate, save).
- **Template method vs strategy**: inheritance and compile-time vs composition and runtime; prefer strategy when steps vary independently or need swapping.

### deep
#### Code

```cpp
class Exporter {
public:
    virtual ~Exporter() = default;
    string exportRows(const vector<pair<string, int>>& rows) {  // the template method (non-virtual)
        string out = header();
        for (const auto& [k, v] : rows) out += row(k, v);
        out += footer();                                           // hook: default does nothing
        return out;
    }
protected:
    virtual string header() = 0;                                   // required steps
    virtual string row(const string& k, int v) = 0;
    virtual string footer() { return ""; }                         // optional hook
};

class CsvExporter : public Exporter {
protected:
    string header() override { return "name,value\n"; }
    string row(const string& k, int v) override { return k + "," + to_string(v) + "\n"; }
};

class JsonExporter : public Exporter {
    bool first = true;
protected:
    string header() override { first = true; return "["; }
    string row(const string& k, int v) override {
        string s = (first ? "" : ",") + string("{\"") + k + "\":" + to_string(v) + "}";
        first = false;
        return s;
    }
    string footer() override { return "]"; }
};

int main() {
    vector<pair<string, int>> rows = {{"north", 120}, {"south", 80}};
    cout << CsvExporter().exportRows(rows);            // name,value / north,120 / south,80
    cout << JsonExporter().exportRows(rows) << "\n";   // [{"north":120},{"south":80}]
}
```

#### Worked example

| step | CsvExporter | JsonExporter |
|---|---|---|
| `header()` | `name,value` line | `[` |
| `row("north", 120)` | `north,120` line | `{"north":120}` |
| `row("south", 80)` | `south,80` line | `,{"south":80}` |
| `footer()` | default: nothing | `]` |

The loop, the order and the concatenation live in one place. A new XML exporter overrides three small methods.

#### Pitfalls

- Too many steps and hooks make subclasses hard to write; keep the skeleton small.
- Subclasses that must call `super` in the right place are fragile; prefer hooks the base calls.
- If different steps vary independently (header style and row style), strategies avoid an explosion of subclasses.

Connects to: strategy, inheritance, abstract class vs interface, open/closed principle.

### questions
Q: What is the template method pattern?
A: A behavioral pattern where a base class method defines the fixed sequence of steps of an algorithm, and subclasses override some of those steps. The overall structure cannot be changed by subclasses, only the customizable parts.

Q: What is a hook in the template method pattern?
A: A step with a default implementation, often empty, that subclasses may override but do not have to. It gives optional extension points, such as a footer or a condition deciding whether an optional step runs.

Q: What is the Hollywood principle?
A: Don't call us, we'll call you. The base class or framework controls the flow and calls the subclass's methods at the right moments, instead of the subclass calling the framework. Template method and framework lifecycle callbacks follow it.

Q: How does template method compare with strategy?
A: Template method varies steps through inheritance, fixed when the subclass is written. Strategy varies behavior through composition, so it can be swapped at runtime and combined independently. Strategy is usually more flexible; template method is simpler when there is one natural skeleton.

## oop.patterns-behavioral.iterator
name: "Iterator"
importance: important
scope: "sequential access without exposing internals"

### simple
An iterator lets you walk through a collection one item at a time without knowing how the collection is stored. A TV remote's "next channel" button works the same whether channels are stored in a list, a table or a satellite menu. You only ever ask for the next item and whether there are any left.

### interview
- Intent: provide **sequential access** to the elements of a collection **without exposing its internal representation**.
- The C++ form: iterators with `*it` and `++it`, grouped into **categories** (input, forward, bidirectional, random access, contiguous). Anything with `begin()` and `end()` works in range-for and the algorithms; C++23 adds `std::generator` for lazy sequences written with `co_yield`.
- **External** iterators (the caller asks for the next element) vs **internal** iterators (the collection calls your function for each element: `std::for_each` or a `visit(f)` member).
- Lazy iteration lets you traverse huge or infinite sequences and compute elements on demand.
- Pitfall: **iterator invalidation**. A `vector` reallocation invalidates every iterator, and `erase` invalidates those at and after the erased element; using one is undefined behavior, not an exception.
- Interview classic: a **BST iterator** giving in-order elements in O(1) amortized per `next()` and O(h) memory, using an explicit stack.

### deep
#### Intuition

A tree, a hash map and a linked list are stored very differently, yet "visit every element" is the same request. An iterator packages the traversal state (a position, a stack of nodes, a bucket index) into an object, so callers write one simple loop for any collection.

#### Code: in-order BST iterator

```cpp
class BstIterator {
    stack<TreeNode*> st;                     // the path to the next smallest node
    void pushLeft(TreeNode* n) {
        for (; n; n = n->left) st.push(n);
    }
public:
    explicit BstIterator(TreeNode* root) { pushLeft(root); }
    bool hasNext() const { return !st.empty(); }
    int next() {
        TreeNode* n = st.top(); st.pop();
        pushLeft(n->right);  // the successor is the leftmost node of the right subtree
        return n->val;
    }
};

int main() {
    //       4
    //     2   6
    //    1 3   7
    TreeNode n1(1), n3(3), n7(7), n2(2, &n1, &n3), n6(6, nullptr, &n7), n4(4, &n2, &n6);
    BstIterator it(&n4);
    while (it.hasNext()) cout << it.next() << " ";   // 1 2 3 4 6 7
    cout << "\n";
}
```

Each node is pushed and popped once, so n calls to `next` cost O(n) in total: O(1) amortized. The stack never holds more than the tree height h.

#### Worked example: the stack

| call | returns | stack after (top at right) |
|---|---|---|
| constructor | - | 4, 2, 1 |
| next | 1 | 4, 2 |
| next | 2 | 4, 3 |
| next | 3 | 4 |
| next | 4 | 6 |
| next | 6 | 7 |
| next | 7 | empty |

#### Making a type work with range-for

```cpp
class Countdown {                                    // a range: from, from - 1, ..., 1
    int from;
public:
    explicit Countdown(int f) : from(f) {}
    struct iterator {
        int cur;
        int operator*() const { return cur; }
        iterator& operator++() { --cur; return *this; }
        bool operator==(const iterator&) const = default;   // != comes free in C++20
    };
    iterator begin() const { return {from}; }
    iterator end() const { return {0}; }
};

int main() {
    for (int x : Countdown(3)) cout << x << " ";     // 3 2 1
    cout << "\n";
}
```

Range-for calls `begin()` once, then dereferences and increments until the iterator equals `end()`. Adding the iterator traits (`value_type`, `difference_type`) and postfix `++` would also let standard algorithms and ranges accept it.

#### Iterator invalidation

```cpp
int main() {
    vector<int> v{1, 2, 3, 4, 5, 6};
    // Wrong: for (auto it = v.begin(); it != v.end(); ++it) if (*it % 2 == 0) v.erase(it);
    for (auto it = v.begin(); it != v.end();) {
        if (*it % 2 == 0) it = v.erase(it);          // erase returns the next valid iterator
        else ++it;
    }
    vector<int> w{1, 2, 3, 4, 5, 6};
    erase_if(w, [](int x) { return x % 2 == 0; });   // C++20: the same in one line
    for (int x : v) cout << x << " ";
    cout << "| " << w.size() << "\n";                // 1 3 5 | 3
}
```

Erasing from a `vector` shifts the later elements, so iterators at or after that point are invalid, and a `push_back` that reallocates invalidates all of them. Node-based containers (`list`, `map`) invalidate only iterators to the erased elements.

#### Pitfalls

- Modifying a container while iterating it: the invalid iterator is undefined behavior, so the bug may show up only sometimes.
- Keeping an iterator, pointer or reference into a `vector` across a `push_back`: reallocation leaves it dangling.
- Exposing internal nodes through the iterator and letting callers mutate the structure.

Connects to: composite, BST, visitor, stacks.

### questions
Q: What is the iterator pattern?
A: A behavioral pattern that provides a way to access the elements of a collection one after another without exposing how the collection stores them. The iterator object keeps the traversal state and offers operations like hasNext and next.

Q: What is the difference between internal and external iterators?
A: With an external iterator, the client controls the loop by repeatedly asking for the next element, as with a hand-written loop over C++ iterators. With an internal iterator, the collection controls the loop and calls a function for each element, as with std::for_each or a visit member function.

Q: How do you build a BST iterator with O(h) memory?
A: Keep a stack of nodes along the path to the smallest unvisited node: push the root and all its left descendants. next pops the top, pushes the leftmost path of its right child, and returns the popped value. Each node is pushed once, so next is O(1) amortized.

Q: What is iterator invalidation?
A: An iterator becomes invalid when the container changes in a way that moves or removes the element it refers to, and using it afterwards is undefined behavior. For a vector, a reallocating push_back invalidates every iterator and erase invalidates those at or after the erased position; list and map invalidate only iterators to erased elements.

Q: How do you make your own class work with a range-based for loop?
A: Give it begin and end functions that return iterators. The iterator needs dereference, prefix increment and comparison with the end iterator; the loop calls begin once and keeps dereferencing and incrementing until the iterator equals end.

## oop.patterns-behavioral.chain-of-responsibility
name: "Chain of responsibility"
importance: important
scope: "passing a request along handlers"

### simple
Chain of responsibility passes a request along a line of handlers until one of them deals with it. A customer support call goes to a helpdesk agent first, then a specialist, then a manager, each passing it on only if they cannot solve it. The sender does not need to know who will finally handle the request.

### interview
- Intent: give **more than one object a chance to handle a request** by chaining handlers; each one handles it, passes it to the **next**, or both.
- Decouples the sender from the receivers, and handlers can be added, removed or reordered without changing the sender.
- Two flavors: **first match wins** (support escalation, exception handler lookup) and **every handler contributes** (web middleware, servlet filters, logging pipelines).
- Classic LLD question: an **ATM dispenser** with handlers for 2000, 500 and 100 notes, each paying what it can and passing the remainder on.
- Other examples: DOM event bubbling, approval workflows (manager, director, VP by amount), log levels, validation pipelines.
- Pitfalls: a request may fall off the end unhandled (add a default handler), long chains are hard to debug, and order matters.

### deep
#### Code: ATM note dispenser

```cpp
class NoteHandler {
protected:
    unique_ptr<NoteHandler> next;
    int note;
public:
    explicit NoteHandler(int note) : note(note) {}
    virtual ~NoteHandler() = default;
    NoteHandler* setNext(unique_ptr<NoteHandler> n) { next = std::move(n); return next.get(); }
    void dispense(int amount, vector<pair<int, int>>& out) const {
        int count = amount / note;
        if (count > 0) out.push_back({note, count});
        int rest = amount % note;
        if (rest == 0) return;
        if (!next) throw invalid_argument("cannot dispense " + to_string(rest));
        next->dispense(rest, out);                       // pass the remainder along
    }
};

int main() {
    NoteHandler chain(2000);
    chain.setNext(make_unique<NoteHandler>(500))->setNext(make_unique<NoteHandler>(100));
    for (int amount : {5700, 300, 2050}) {
        vector<pair<int, int>> out;
        try {
            chain.dispense(amount, out);
            cout << amount << ":";
            for (auto [n, c] : out) cout << " " << c << "x" << n;
            cout << "\n";
        } catch (const invalid_argument& e) {
            cout << amount << ": " << e.what() << "\n";
        }
    }
    // 5700: 2x2000 3x500 2x100
    // 300: 3x100
    // 2050: cannot dispense 50
}
```

A real ATM would validate before handing out anything (multiples of 100) and consider notes left in each cassette; the chain still decides which handler pays what.

#### Worked example: 5700

| handler | receives | pays | passes on |
|---|---|---|---|
| 2000 | 5700 | 2 notes (4000) | 1700 |
| 500 | 1700 | 3 notes (1500) | 200 |
| 100 | 200 | 2 notes (200) | nothing |

#### Middleware: every handler contributes

```cpp
struct Request { string user; vector<string> trail; };
using Next = function<string(Request&)>;
using Middleware = function<string(Request&, const Next&)>;

string auth(Request& r, const Next& next) {
    if (r.user.empty()) return "401 unauthorized";   // stops the chain
    return next(r);
}

string logStep(Request& r, const Next& next) {
    r.trail.push_back("logged");
    return next(r);
}

string endpoint(Request& r) {
    return "200 hello " + r.user + " after " + to_string(r.trail.size()) + " step";
}

Next buildChain(const vector<Middleware>& handlers, Next last) {
    Next chain = std::move(last);
    for (auto h = handlers.rbegin(); h != handlers.rend(); ++h)   // wrap from the inside out
        chain = [mw = *h, next = chain](Request& r) { return mw(r, next); };
    return chain;
}

int main() {
    Next app = buildChain({logStep, auth}, endpoint);
    Request ok{"asha", {}}, anon{"", {}};
    cout << app(ok) << "\n";                         // 200 hello asha after 1 step
    cout << app(anon) << "\n";                       // 401 unauthorized
}
```

#### Pitfalls

- No handler takes the request: end the chain with a default or report an error, as the ATM does.
- Hidden ordering assumptions (authentication must run before authorization); build chains in one visible place.
- Deep recursive chains can be replaced with a loop over a list of handlers.

Connects to: decorator, command, composite, linked lists, ATM design.

### questions
Q: What is the chain of responsibility pattern?
A: A behavioral pattern where a request is passed along a chain of handler objects. Each handler either processes the request, passes it to the next handler, or both, so the sender does not need to know which object will finally handle it.

Q: How would you design ATM note dispensing with this pattern?
A: Create one handler per denomination, ordered from largest to smallest, such as 2000, 500 and 100. Each handler dispenses as many of its notes as fit and passes the remainder to the next handler; if the last handler cannot finish, the amount is invalid.

Q: What is the difference between chain of responsibility and decorator?
A: Structurally both wrap or link objects with the same interface. A decorator always forwards and adds behavior around the call, while a chain handler may stop the request and handle it alone. Middleware pipelines blend both ideas.

Q: What problems can a chain of responsibility cause?
A: A request can reach the end without being handled, the order of handlers can silently change behavior, and long chains are hard to trace when debugging. A default final handler and building the chain in one explicit place help.

## oop.patterns-behavioral.mediator
name: "Mediator"
importance: advanced
prereqs: [oop.patterns-behavioral.observer]
scope: "central coordination between objects"

### simple
A mediator is a central coordinator that objects talk to instead of talking to each other directly. Planes near an airport do not radio every other plane; they all talk to the control tower, which tells each one when to land or wait. This keeps each plane simple, because only the tower needs to know about everyone.

### interview
- Intent: define an object that **encapsulates how a set of objects interact**, so they do not refer to each other directly.
- Turns a **many-to-many** web of references (n² links) into **one-to-many** links through the mediator.
- Colleagues notify the mediator of events; the mediator decides what others should do.
- Examples: chat rooms (users send to the room, not to each other), air traffic control, a form dialog where checking a box enables fields, an auction house.
- **Mediator vs observer**: observer broadcasts to whoever subscribed; a mediator contains the coordination **logic**. **Mediator vs facade**: a facade simplifies calls **into** a subsystem, while a mediator coordinates two-way talk **among** peers.
- Risk: the mediator can become a **god object**; keep one mediator per interaction and keep business rules elsewhere.

### deep
#### Code: a chat room

```cpp
class User;

class ChatRoom {                                     // the mediator
    map<string, User*> members;
    set<string> muted;
public:
    void join(User& u);
    void mute(const string& name) { muted.insert(name); }
    void send(const string& from, const string& text, const string& to = "");
};

class User {                                         // colleagues know only the room
    ChatRoom* room = nullptr;
public:
    const string name;
    vector<string> inbox;
    explicit User(string n) : name(std::move(n)) {}
    void enter(ChatRoom& r) { room = &r; }
    void say(const string& text, const string& to = "") { room->send(name, text, to); }
    void receive(const string& from, const string& text) { inbox.push_back(from + ": " + text); }
};

void ChatRoom::join(User& u) {
    members[u.name] = &u;
    u.enter(*this);
}

void ChatRoom::send(const string& from, const string& text, const string& to) {
    if (muted.count(from)) return;                   // coordination rules live here
    for (auto& [name, user] : members)
        if (to.empty() ? name != from : name == to) user->receive(from, text);
}

int main() {
    ChatRoom room;
    User asha("asha"), ben("ben"), chen("chen");
    for (User* u : {&asha, &ben, &chen}) room.join(*u);
    asha.say("hi all");
    ben.say("hi asha", "asha");
    room.mute("chen");
    chen.say("spam");
    cout << asha.inbox[0] << " | " << ben.inbox[0] << " | " << chen.inbox[0] << "\n";
    // ben: hi asha | asha: hi all | asha: hi all
}
```

Users never hold references to each other. Muting, private messages or logging change only `ChatRoom`.

| without a mediator | with a mediator |
|---|---|
| 3 users need up to 6 directed links; 10 need 90 | each user has 1 link, to the room |
| a mute rule is duplicated in every user | one rule in the room |

Connects to: observer, facade, coupling and cohesion, chat system design.

### questions
Q: What is the mediator pattern?
A: A behavioral pattern where objects communicate through a central mediator instead of referring to each other. The mediator holds the interaction logic, so each object only knows the mediator, which reduces many-to-many dependencies to one-to-many.

Q: Give an example of the mediator pattern.
A: A chat room where users send messages to the room, which delivers them to other users and applies rules like muting. Air traffic control and GUI dialogs that coordinate widgets are other classic examples.

Q: What is the main risk of the mediator pattern?
A: All coordination logic accumulates in the mediator, which can grow into a large, hard-to-change god object. Splitting mediators by interaction and keeping domain rules in separate classes limits this.

## oop.patterns-behavioral.visitor
name: "Visitor"
importance: advanced
scope: "adding operations without changing classes"

### simple
The visitor pattern lets you add new operations to a set of classes without editing those classes. A tax inspector visiting different kinds of businesses, like shops, factories and farms, applies different rules to each, while the businesses just let the inspector in. A new kind of inspector, like a safety inspector, can visit the same businesses without them changing.

### interview
- Intent: represent an **operation on the elements of an object structure** as a separate object, so new operations can be added **without changing the element classes**.
- Mechanism: **double dispatch**. Each element implements `accept(Visitor& v)` by calling `v.visit(*this)`, so the right overload runs for both the element's type and the visitor's type.
- Best when the **class hierarchy is stable** and operations change often: compiler ASTs (type check, evaluate, print), document exports, reporting over a fixed set of shapes.
- Trade-off: adding a **new operation** is easy (a new visitor); adding a **new element type** is hard (every visitor needs a new method). It is the mirror image of plain polymorphism.
- Modern alternative: C++17 `std::variant` with `std::visit` and an overload set of lambdas, for a closed set of types; a visitor that misses a type does not compile.
- It often needs elements to expose state that encapsulation would otherwise hide.

### deep
#### Code: an expression tree

```cpp
struct Num; struct Add; struct Mul;

struct Visitor {
    virtual ~Visitor() = default;
    virtual void visit(const Num&) = 0;
    virtual void visit(const Add&) = 0;
    virtual void visit(const Mul&) = 0;
};

struct Expr {
    virtual ~Expr() = default;
    virtual void accept(Visitor& v) const = 0;
};
struct Num : Expr {
    int value;
    explicit Num(int v) : value(v) {}
    void accept(Visitor& v) const override { v.visit(*this); }   // first dispatch: which Expr
};
struct Add : Expr {
    unique_ptr<Expr> l, r;
    Add(unique_ptr<Expr> a, unique_ptr<Expr> b) : l(std::move(a)), r(std::move(b)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};
struct Mul : Expr {
    unique_ptr<Expr> l, r;
    Mul(unique_ptr<Expr> a, unique_ptr<Expr> b) : l(std::move(a)), r(std::move(b)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};

struct Evaluator : Visitor {                        // operation 1
    int result = 0;
    void visit(const Num& n) override { result = n.value; }
    void visit(const Add& a) override { result = eval(*a.l) + eval(*a.r); }
    void visit(const Mul& m) override { result = eval(*m.l) * eval(*m.r); }
    int eval(const Expr& e) { Evaluator sub; e.accept(sub); return sub.result; }
};

struct Printer : Visitor {                          // operation 2, added without touching Expr
    string out;
    void visit(const Num& n) override { out += to_string(n.value); }
    void visit(const Add& a) override {
        out += "("; a.l->accept(*this); out += " + "; a.r->accept(*this); out += ")";
    }
    void visit(const Mul& m) override { m.l->accept(*this); out += " * "; m.r->accept(*this); }
};

int main() {
    // (2 + 3) * 4
    Mul e(make_unique<Add>(make_unique<Num>(2), make_unique<Num>(3)), make_unique<Num>(4));
    Evaluator ev; Printer pr;
    e.accept(pr);
    cout << pr.out << " = " << ev.eval(e) << "\n";   // (2 + 3) * 4 = 20
}
```

#### The trade-off

| change | visitor design | virtual methods on `Expr` |
|---|---|---|
| add a `Simplify` operation | one new visitor class | edit every `Expr` class |
| add a `Sub` node | edit every visitor | one new class |

#### Modern alternative in C++17

```cpp
struct Circle { double r; };
struct Square { double side; };
using Shape = variant<Circle, Square>;

double area(const Shape& s) {
    return visit([](const auto& x) -> double {
        if constexpr (is_same_v<decay_t<decltype(x)>, Circle>) return 3.14159 * x.r * x.r;
        else return x.side * x.side;
    }, s);
}
```

Connects to: polymorphism, composite, iterator, open/closed principle, method overloading vs overriding.

### questions
Q: What problem does the visitor pattern solve?
A: It lets you add new operations over a stable class hierarchy without modifying those classes. Each operation lives in its own visitor class with one visit method per element type, which keeps related logic together.

Q: What is double dispatch and how does visitor achieve it?
A: Double dispatch selects a method based on the runtime types of two objects. The element's accept method is a virtual call that picks the element type, and inside it calls visitor.visit(*this), a virtual call on the visitor with a statically known element type, so both types determine the method that runs.

Q: When is visitor a bad fit?
A: When the set of element classes changes often. Every new element type requires adding a method to the visitor interface and every concrete visitor. Visitor pays off when element types are stable and operations keep growing.
