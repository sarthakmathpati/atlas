---
topic: oop.principles
name: "Design principles"
subject: oop
order: 5
prereqs: [oop.relationships]
---

## oop.principles.single-responsibility-principle
name: "Single responsibility principle"
importance: must
scope: "one reason to change"

### simple
The single responsibility principle says each class should have one job, so it has only one reason to change. A restaurant keeps the chef, the cashier and the cleaner separate: a new recipe changes the chef's work, not how the cashier takes payments. When one class does all three jobs, every change risks breaking the other two.

### interview
- Robert C. Martin's wording: a class should have **one reason to change**; his later version: a module should be responsible to **one actor** (one group of people who ask for changes).
- Symptoms of a violation: a class you describe with "and", methods that use unrelated sets of fields, unrelated changes landing in the same file, and tests that need a database just to check a calculation.
- Classic example: an `Employee` class that calculates pay (accounting), formats reports (HR) and saves itself to a database (IT). Split it into `PayCalculator`, `EmployeeReport` and `EmployeeRepository` around a plain `Employee`.
- Benefits: smaller classes, localized changes, easier testing and reuse, fewer merge conflicts.
- Do not over-apply it: "one responsibility" is not "one method". Split along real axes of change, not every noun.
- It is the class-level form of **high cohesion**.

### deep
#### Intuition

A responsibility is a reason someone would ask you to change the code. If the finance team and the database team both edit the same class, a change for one can break the other, and each has to understand code they do not care about. Giving each actor its own class keeps their changes apart.

#### Worked example: an invoice class

Before, one class does four jobs:

```cpp
// Before: four reasons to change in one class
class InvoiceService {
public:
    double total(const vector<pair<string, double>>& items) {       // pricing rules
        double sum = 0;
        for (auto& [name, price] : items) sum += price;
        return sum * 1.18;                                           // tax
    }
    string render(const vector<pair<string, double>>& items) {      // presentation
        string out;
        for (auto& [name, price] : items) out += name + " " + to_string(price) + "\n";
        return out;
    }
    void save(const string& text) { cout << "INSERT " << text; }   // persistence
    void email(const string& to) { cout << "mail " << to << "\n"; }   // delivery
};
```

| change request | who asks | lines touched in `InvoiceService` |
|---|---|---|
| tax becomes 12% | finance | `total` |
| PDF instead of text | product | `render` |
| move to another database | platform | `save` |
| send through a queue | operations | `email` |

Four teams edit one file, and a unit test of `total` compiles in the database and mail code.

After, each class has one reason to change:

```cpp
struct Item { string name; double price; };

class TaxPolicy {
    double rate;
public:
    explicit TaxPolicy(double rate) : rate(rate) {}
    double apply(double amount) const { return amount * (1 + rate); }
};

class InvoiceCalculator {                    // changes when pricing rules change
    TaxPolicy tax;
public:
    explicit InvoiceCalculator(TaxPolicy t) : tax(t) {}
    double total(const vector<Item>& items) const {
        double sum = 0;
        for (const auto& i : items) sum += i.price;
        return tax.apply(sum);
    }
};

class InvoiceRenderer {                      // changes when the format changes
public:
    string render(const vector<Item>& items) const {
        string out;
        for (const auto& i : items) out += i.name + "\n";
        return out;
    }
};

int main() {
    vector<Item> items = {{"pen", 50}, {"book", 250}};
    InvoiceCalculator calc(TaxPolicy(0.18));
    cout << calc.total(items) << "\n" << InvoiceRenderer().render(items);   // 354, pen, book
}
```

A repository class and a mailer class would take the remaining two jobs. A small coordinator (an `InvoiceService` with ten lines) can still wire them together; coordinating is its one job.

```python
class InvoiceCalculator:
    def __init__(self, tax_rate):
        self.tax_rate = tax_rate

    def total(self, items):
        return sum(price for _, price in items) * (1 + self.tax_rate)


class InvoiceRenderer:
    def render(self, items):
        return "\n".join(name for name, _ in items)


items = [("pen", 50), ("book", 250)]
print(round(InvoiceCalculator(0.18).total(items), 2))   # 354.0
```

#### How to find responsibilities

- List who could request changes (actors) and group code by actor.
- Look at the fields each method uses; clusters that do not overlap are separate classes.
- Name the class honestly. If the honest name is `OrderValidatorAndEmailer`, split it.

#### Pitfalls

- **Over-splitting**: one class per method scatters one idea across many files and adds wiring with no benefit.
- Splitting by technical layer only (all SQL here, all logic there) while one business rule still spreads everywhere.
- "Manager", "Helper" and "Utils" classes that gradually absorb everything.

Connects to: coupling and cohesion, open/closed principle, facade, LLD method.

### questions
Q: What is the single responsibility principle?
A: A class or module should have one reason to change, meaning it should serve one actor or one axis of change. Code that changes for different reasons, such as business rules, presentation and persistence, belongs in different classes.

Q: How can you tell a class violates the single responsibility principle?
A: Its description needs the word and, its methods use unrelated groups of fields, unrelated feature requests keep editing the same file, and testing one behavior requires setting up dependencies for another, such as a database for a price calculation.

Q: Does the single responsibility principle mean each class should have one method?
A: No. A responsibility can need many methods, as long as they change for the same reason. Splitting every method into its own class increases coupling and scatters one concept across many files.

Q: How does the single responsibility principle relate to cohesion?
A: It is essentially high cohesion at the class level. A class with a single responsibility has members that all work toward one purpose, which is the definition of functional cohesion.

Q: Refactor an Employee class that computes pay, generates an HR report and saves itself to a database.
A: Keep Employee as plain data, move pay rules to a PayCalculator used by accounting, move formatting to an EmployeeReport used by HR, and move persistence to an EmployeeRepository. Each class then changes only when its own team's needs change.

## oop.principles.open-closed-principle
name: "Open/closed principle"
importance: must
scope: "extend without modifying"

### simple
The open/closed principle says you should be able to add new behavior without editing code that already works. A power strip is a good picture: you plug in a new lamp without rewiring the house. In code, you design a socket (an interface) once, and new features plug into it.

### interview
- Bertrand Meyer's wording: software entities should be **open for extension, closed for modification**.
- Achieved with **abstraction and polymorphism**: callers depend on an interface, and new behavior arrives as a new implementation (strategy, plug-ins, decorators, event handlers).
- Red flag: a `switch` or `if`-`else` chain on a type code that every new case must edit, often repeated in several places.
- Benefit: tested code stays untouched, so adding a feature cannot break old ones, and teams can extend without coordinating edits.
- It is a judgment call: you cannot be closed against every change. Add the extension point when a real axis of variation appears (the second or third case), not for imagined ones.
- Related: new data types are easy with polymorphism, but new operations across all types are easier with a switch or the visitor pattern.

### deep
#### Intuition

Every edit to working code is a chance to break it. If adding the tenth payment method means editing the same function that handles the other nine, each addition risks all nine. If instead each payment method is its own class behind one interface, adding the tenth means writing one new class and touching nothing else.

#### Worked example: discounts

Before:

```python
def discount(customer_type, amount):
    if customer_type == "regular":
        return 0
    elif customer_type == "student":
        return amount * 0.10
    elif customer_type == "senior":
        return amount * 0.15
    # every new customer type edits this function (and every similar switch elsewhere)
    return 0
```

After:

```python
from abc import ABC, abstractmethod


class DiscountRule(ABC):
    @abstractmethod
    def discount(self, amount): ...


class NoDiscount(DiscountRule):
    def discount(self, amount):
        return 0


class Percentage(DiscountRule):
    def __init__(self, rate):
        self.rate = rate

    def discount(self, amount):
        return amount * self.rate


class Checkout:                                  # closed: never edited for new rules
    def __init__(self, rule):
        self.rule = rule

    def pay(self, amount):
        return amount - self.rule.discount(amount)


class FestivalOffer(DiscountRule):               # open: a new rule is a new class
    def discount(self, amount):
        return min(200, amount * 0.25)


print(Checkout(Percentage(0.10)).pay(1000), Checkout(FestivalOffer()).pay(1000))   # 900.0 800
```

| new requirement | before | after |
|---|---|---|
| festival offer, capped at 200 | edit `discount` and retest all branches | add `FestivalOffer` |
| change the student rate | edit `discount` | construct `Percentage(0.12)` |
| a rule based on cart contents | edit signature and every caller | add a rule class (maybe widen the interface once) |

#### The same in C++

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
struct Rect : Shape {
    double w, h;
    Rect(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
};
struct Triangle : Shape {                        // added later: no existing code changes
    double b, h;
    Triangle(double b, double h) : b(b), h(h) {}
    double area() const override { return 0.5 * b * h; }
};

double totalArea(const vector<unique_ptr<Shape>>& shapes) {   // closed for modification
    double sum = 0;
    for (const auto& s : shapes) sum += s->area();
    return sum;
}
```

#### Ways to leave code open

- **Strategy**: pass the varying algorithm in (discount rules, sorting comparators).
- **Decorator**: wrap to add behavior (logging, caching).
- **Template method**: the base fixes the steps, subclasses fill in hooks.
- **Registries and plug-ins**: new handlers register themselves by name.
- **Configuration and data**: a rate in a config file needs no code change at all.

#### Limits

Closure is always against particular kinds of change. The shape hierarchy is open to new shapes but closed only as long as operations are fixed: adding `perimeter()` edits every class. When new operations come more often than new types, a `switch` or the visitor pattern fits better. Build the extension point after the variation shows up; predicting it wrongly adds complexity without payoff (YAGNI).

Connects to: strategy, decorator, polymorphism, dependency inversion principle, single responsibility principle.

### questions
Q: What does open for extension, closed for modification mean?
A: You should be able to add new behavior, such as a new payment method or shape, by writing new code rather than editing existing, tested code. Callers depend on an abstraction, and new variants arrive as new implementations of it.

Q: What code smell usually signals an open/closed violation?
A: A switch or if-else chain on a type code that must be edited whenever a new case appears, especially when the same switch is repeated in several places. Replacing it with polymorphism moves each case into its own class.

Q: Which design patterns help follow the open/closed principle?
A: Strategy lets you plug in new algorithms, decorator adds behavior by wrapping, template method lets subclasses customize fixed steps, and observer lets new listeners react to events. Plug-in registries serve the same goal at a larger scale.

Q: Can a design be closed against every kind of change?
A: No. A class hierarchy is open to new types but adding a new operation still edits every class, while a switch-based design has the opposite trade-off. You choose which axis to keep open based on the changes you actually see.

Q: When should you not introduce an extension point?
A: When there is only one case and no evidence another is coming. A speculative interface adds indirection and maintenance cost; it is usually better to wait for the second or third variant and refactor then.

## oop.principles.liskov-substitution-principle
name: "Liskov substitution principle"
importance: must
prereqs: [oop.pillars.inheritance]
scope: "subtypes must honor base contracts"

### simple
The Liskov substitution principle says that if code works with a parent type, it must keep working when you hand it any child type. If you rent "a car", any car they give you should have a steering wheel and brakes that work the usual way. A car whose brake pedal honks the horn is technically a car, but it breaks every driver's expectations.

### interview
- Barbara Liskov (1987): objects of a subtype must be usable wherever the base type is expected **without changing the program's correctness**.
- Contract rules for an override: it may **not strengthen preconditions** (accept at least what the base accepts), may **not weaken postconditions** (promise at least what the base promises), must **preserve invariants**, and must not throw new kinds of exceptions callers do not expect.
- Classic violations: `Square` extends a mutable `Rectangle`; `Penguin` extends `Bird` whose `fly()` it cannot do; a read-only list whose `add` throws.
- Symptoms: `instanceof` or type checks before calling a method, overrides that throw "not supported" or do nothing, comments like "don't call this on X".
- Fixes: change the hierarchy (a common parent without the problematic method), use composition, split interfaces, or make objects immutable.
- Inheritance should model **behavior** ("behaves like"), not taxonomy ("is a kind of in real life").

### deep
#### Intuition

Polymorphism promises that callers can ignore which subtype they have. That promise only holds if every subtype keeps the base type's contract. LSP is the rule that makes "program to the base type" safe.

#### The contract rules

| rule | meaning | violation example |
|---|---|---|
| preconditions not stronger | accept every input the base accepts | base `withdraw` accepts any positive amount, child rejects amounts above 500 |
| postconditions not weaker | guarantee everything the base guarantees | base `sort` returns sorted output, child returns it "mostly sorted" |
| invariants preserved | keep the base's always-true facts | base guarantees `size() >= 0`, child lets it go negative |
| no surprise exceptions | only failures callers already handle | child `save` throws a new unchecked "not supported" error |
| history constraint | do not allow changes the base forbids | base is immutable, child adds a setter |

#### Worked example: rectangle and square

```cpp
class Rectangle {
protected:
    int w = 0, h = 0;
public:
    virtual ~Rectangle() = default;
    virtual void setWidth(int x) { w = x; }
    virtual void setHeight(int x) { h = x; }
    int area() const { return w * h; }
};

class Square : public Rectangle {            // looks natural, breaks LSP
public:
    void setWidth(int x) override { w = h = x; }
    void setHeight(int x) override { w = h = x; }
};

bool resizeWorks(Rectangle& r) {             // written against the base contract
    r.setWidth(5);
    r.setHeight(4);
    return r.area() == 20;                   // base postcondition: sides change independently
}

int main() {
    Rectangle r; Square s;
    cout << resizeWorks(r) << " " << resizeWorks(s) << "\n";   // 1 0
}
```

| step | Rectangle (w, h) | Square (w, h) |
|---|---|---|
| `setWidth(5)` | (5, 0) | (5, 5) |
| `setHeight(4)` | (5, 4) | (4, 4) |
| `area() == 20`? | yes | no, 16 |

`Square::setWidth` weakened the base postcondition ("only the width changes"). The fix is not a cleverer override; it is a different design: immutable shapes (`Rectangle withWidth(int)` returns a new object), or `Square` and `Rectangle` as siblings under `Shape`.

#### Worked example: birds

```python
class Bird:
    def fly(self):
        return "flap"


class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("penguins can't fly")   # callers of Bird.fly() now crash


# A better model: flying is a capability, not something every bird has.
class BetterBird:
    def eat(self):
        return "eat"


class FlyingBird(BetterBird):
    def fly(self):
        return "flap"


class BetterPenguin(BetterBird):
    def swim(self):
        return "swim"


def migrate(birds):               # asks only for what it needs
    return [b.fly() for b in birds]


print(migrate([FlyingBird()]), BetterPenguin().swim())   # ['flap'] swim
```

#### Real-world cases

- Java's `Collections.unmodifiableList` returns a `List` whose `add` throws `UnsupportedOperationException`. The `List` documentation marks `add` as optional to allow this, which shows the tension: callers must know whether a list is modifiable.
- A `ReadOnlyFile` extending `File` with a `write` that silently does nothing is worse than one that throws: it breaks the postcondition quietly.

#### How to spot violations

- `if (x instanceof Square)` checks before calling base methods.
- Overrides that throw "not supported", return dummy values or do nothing.
- Tests for the base type that fail when run with a subclass instance. A good practice is to run the base class's contract tests against every subclass.

Connects to: inheritance, polymorphism, interface segregation principle, composition over inheritance, method overloading vs overriding.

### questions
Q: What is the Liskov substitution principle?
A: If S is a subtype of T, then objects of type T can be replaced by objects of type S without breaking the correctness of the program. A subclass must honor every promise its base class makes, so code written against the base keeps working with any subclass.

Q: Why does Square extending Rectangle violate the principle?
A: A mutable rectangle promises that setting the width leaves the height unchanged. A square must keep its sides equal, so setting the width also changes the height, and code that sets width 5 and height 4 then expects area 20 gets 16. The square weakens the base's postcondition.

Q: What rules must an overriding method follow to respect the principle?
A: It must accept at least every input the base accepts (no stronger preconditions), guarantee at least what the base guarantees (no weaker postconditions), preserve the base's invariants, and not throw exceptions that callers of the base would not expect.

Q: What are common signs of an LSP violation in a codebase?
A: Type checks such as instanceof before calling a method, overrides that throw not supported or do nothing, and documentation saying a method must not be called on certain subclasses. Base class tests failing when run against a subclass are a direct signal.

Q: How do you fix an LSP violation?
A: Change the model rather than patching the override: introduce a common parent that only has behaviors every child supports, move optional capabilities into separate interfaces, prefer composition, or make objects immutable so the conflicting mutation does not exist.

## oop.principles.interface-segregation-principle
name: "Interface segregation principle"
importance: must
scope: "small, focused interfaces"

### simple
The interface segregation principle says nobody should be forced to depend on methods they do not use. A TV remote with fifty buttons is harder to use than one with the five you need, and a basic TV should not have to pretend it supports every button. Several small, focused interfaces are better than one giant one.

### interview
- Robert C. Martin: **clients should not be forced to depend on methods they do not use**.
- A "fat" interface forces implementers to write stubs that throw or do nothing (an LSP smell) and makes every client recompile or retest when an unrelated method changes.
- Fix: split into **role interfaces** by what each client needs (`Printer`, `Scanner`, `Fax`), and let a class implement several (`MultiFunctionMachine implements Printer, Scanner, Fax`).
- A client should take the narrowest interface that does its job (accept `Readable`, not `ReadWriteSeekableStream`).
- Java examples: `Iterable` vs `Collection` vs `List`; `Closeable` as its own tiny interface. Go's small interfaces (`io.Reader`, `io.Writer`) are the idea in its purest form.
- Do not overdo it: a separate interface per method becomes noise. Group methods that are always used together.

### deep
#### Intuition

Interfaces are for the people who **call** them, not for the classes that implement them. If a cheap printer has to implement `fax()` because the interface demands it, it will throw an error at runtime, and every client holding a "printer" has to wonder whether its methods really work.

#### Worked example: office machines

Before, one fat interface:

```java
interface Machine {
    void print(String doc);
    void scan(String doc);
    void fax(String doc);
}

class BasicPrinter implements Machine {
    public void print(String doc) { System.out.println("print " + doc); }
    public void scan(String doc) { throw new UnsupportedOperationException(); }   // forced stub
    public void fax(String doc) { throw new UnsupportedOperationException(); }    // forced stub
}
```

| problem | effect |
|---|---|
| stubs that throw | a `Machine` may fail at runtime; callers cannot trust the type |
| `fax` changes signature | `BasicPrinter` must change though it never faxes |
| a print queue takes `Machine` | it can call `scan`, which it should never need |

After, role interfaces:

```java
interface Printer { void print(String doc); }
interface Scanner { void scan(String doc); }
interface Fax { void fax(String doc); }

class SimplePrinter implements Printer {
    public void print(String doc) { System.out.println("print " + doc); }
}

class OfficeMachine implements Printer, Scanner, Fax {
    public void print(String doc) { System.out.println("print " + doc); }
    public void scan(String doc) { System.out.println("scan " + doc); }
    public void fax(String doc) { System.out.println("fax " + doc); }
}

class PrintQueue {
    private final Printer printer;                     // needs only printing
    PrintQueue(Printer printer) { this.printer = printer; }
    void run(List<String> docs) { docs.forEach(printer::print); }
}
```

`PrintQueue` accepts either machine, cannot misuse scanning, and is untouched when faxing changes.

#### C++ and Python

```cpp
struct Readable {
    virtual ~Readable() = default;
    virtual string read() = 0;
};
struct Writable {
    virtual ~Writable() = default;
    virtual void write(const string& s) = 0;
};

class FileStream : public Readable, public Writable {   // implements both roles
    string data;
public:
    string read() override { return data; }
    void write(const string& s) override { data += s; }
};

string firstWord(Readable& in) {                        // asks only for what it uses
    string s = in.read();
    return s.substr(0, s.find(' '));
}

int main() {
    FileStream f;
    f.write("hello world");
    cout << firstWord(f) << "\n";                       // hello
}
```

```python
from typing import Protocol


class Readable(Protocol):
    def read(self) -> str: ...


def first_word(source: Readable) -> str:   # any object with read() fits
    return source.read().split(" ")[0]


class Note:
    def read(self):
        return "hello world"


print(first_word(Note()))                   # hello
```

#### How to split

- Start from clients: list what each caller uses, and let those sets suggest interfaces.
- Keep methods that are always used together in one interface (a `Stack` with `push`, `pop` and `peek` is fine).
- Compose larger interfaces from smaller ones where convenient (`interface ReadWrite extends Readable, Writable`).

#### Pitfalls

- One interface per method everywhere, which makes signatures unreadable.
- Splitting interfaces but still passing the concrete class around, which gains nothing.
- Header interfaces that mirror a class's full public API one to one ("IUserServiceImpl"), which is fat by construction.

Connects to: Liskov substitution principle, abstract class vs interface, dependency inversion principle, coupling and cohesion.

### questions
Q: What is the interface segregation principle?
A: Clients should not be forced to depend on methods they do not use. Instead of one large interface, provide several small role interfaces, so each client depends only on what it needs and each implementer supports only what it can really do.

Q: What problems does a fat interface cause?
A: Implementers must write stub methods that throw or do nothing, which makes the type untrustworthy at runtime. Clients are affected by changes to methods they never call, and they can accidentally call operations they should not need.

Q: How does the interface segregation principle relate to Liskov substitution?
A: A fat interface often forces implementations that cannot honor part of the contract, such as a printer whose fax method throws, which is an LSP violation. Splitting the interface removes the need for such broken implementations.

Q: Give a standard library example of small, focused interfaces.
A: Java separates Iterable, Collection and List, and has tiny interfaces like Closeable, Runnable and Comparable. Go's io.Reader and io.Writer each have a single method, and functions accept exactly the capability they need.

Q: Can you take interface segregation too far?
A: Yes. Making every method its own interface fragments the design and makes signatures hard to read. Methods that clients always use together, such as push and pop on a stack, belong in the same interface.

## oop.principles.dependency-inversion-principle
name: "Dependency inversion principle"
importance: must
scope: "depend on abstractions, dependency injection"

### simple
The dependency inversion principle says important code should depend on a general promise, not on a specific tool. A lamp has a plug that fits any wall socket; it does not wire itself directly into one particular power station. Then you can switch the power company, or test the lamp with a battery pack, without changing the lamp.

### interview
- Robert C. Martin's two rules: **high-level modules should not depend on low-level modules; both should depend on abstractions**, and **abstractions should not depend on details; details should depend on abstractions**.
- "Inversion": the high-level module **owns** the interface (`MessageSender`), and the low-level module (`SmtpSender`) implements it, so the source-code dependency points upward, against the flow of control.
- **Dependency injection** is the usual technique: pass dependencies in (constructor injection preferred; also setter or method injection) instead of creating them inside with `new`.
- Benefits: swap implementations (database, payment provider), test with fakes, and build and compile modules independently.
- DI **containers** (Spring, Guice, Dagger) automate the wiring, but plain constructor injection is the principle; a container is optional.
- Do not wrap every stable, pure utility in an interface (`Math`, `std::string`); invert dependencies on volatile things such as I/O, networks, clocks and third-party services.

### deep
#### Intuition

Business rules are the most valuable, most stable part of a program. Databases, email providers and frameworks come and go. If the rules import the database class directly, every database change ripples into them. Invert it: the rules declare what they need as an interface, and the database code adapts to that interface.

#### Worked example: sending a notification

Before (high level depends on low level):

```python
class SmtpClient:
    def send_mail(self, to, text):
        print(f"SMTP to {to}: {text}")


class OrderService:
    def __init__(self):
        self.mailer = SmtpClient()              # hard-wired concrete dependency

    def place(self, order_id, email):
        self.mailer.send_mail(email, f"order {order_id} placed")
```

Problems: testing `place` sends real mail; switching to SMS means editing `OrderService`.

After (both depend on an abstraction owned by the high level):

```python
from typing import Protocol


class Notifier(Protocol):                       # owned by the order module
    def notify(self, to: str, text: str) -> None: ...


class OrderService:
    def __init__(self, notifier: Notifier):     # constructor injection
        self.notifier = notifier

    def place(self, order_id, contact):
        self.notifier.notify(contact, f"order {order_id} placed")


class EmailNotifier:                            # a detail that depends on the abstraction
    def notify(self, to, text):
        print(f"email {to}: {text}")


class FakeNotifier:                             # used in tests
    def __init__(self):
        self.sent = []

    def notify(self, to, text):
        self.sent.append((to, text))


OrderService(EmailNotifier()).place(7, "asha@example.com")
fake = FakeNotifier()
OrderService(fake).place(8, "ben")
print(fake.sent)    # [('ben', 'order 8 placed')]
```

| dependency arrow | before | after |
|---|---|---|
| OrderService → | SmtpClient (concrete) | Notifier (abstraction) |
| SmtpClient/EmailNotifier → | nothing | Notifier (implements it) |
| to add SMS | edit OrderService | add SmsNotifier |
| to test | patch or send real mail | pass FakeNotifier |

#### The same in C++

```cpp
class Clock {                                    // volatile detail behind an interface
public:
    virtual ~Clock() = default;
    virtual int hour() const = 0;
};

class SystemClock : public Clock {
public:
    int hour() const override {
        time_t t = time(nullptr);
        return localtime(&t)->tm_hour;
    }
};

class FixedClock : public Clock {                // for tests
    int h;
public:
    explicit FixedClock(int h) : h(h) {}
    int hour() const override { return h; }
};

class Greeter {
    const Clock& clock;                          // injected, not created
public:
    explicit Greeter(const Clock& c) : clock(c) {}
    string greet() const { return clock.hour() < 12 ? "Good morning" : "Good afternoon"; }
};

int main() {
    FixedClock nine(9), three(15);
    cout << Greeter(nine).greet() << ", " << Greeter(three).greet() << "\n";
    // Good morning, Good afternoon
}
```

Without injection, testing the afternoon branch would mean waiting until noon.

#### Injection styles

- **Constructor injection** (preferred): required dependencies are explicit and the object is complete once built.
- **Setter injection**: for optional dependencies; risks half-configured objects.
- **Method injection**: pass the dependency to the one method that needs it.
- **Service locator**: the object asks a registry; it hides dependencies and is usually considered weaker than injection.

#### Pitfalls

- Interfaces that mirror one implementation's details (`MySqlUserStore` methods on a `UserStore` interface) do not really invert anything.
- Creating dependencies inside constructors "for convenience" defeats the purpose.
- Injecting a dozen dependencies is a sign the class has too many responsibilities.

Connects to: abstraction, open/closed principle, interface segregation principle, strategy, coupling and cohesion.

### questions
Q: What does the dependency inversion principle state?
A: High-level modules should not depend on low-level modules; both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions. In practice, business logic defines interfaces for what it needs, and infrastructure implements them.

Q: What is inverted in dependency inversion?
A: The direction of the source-code dependency. Normally high-level code imports low-level code. With inversion, the high-level module owns the interface, and the low-level module imports and implements it, so the dependency points from detail to policy.

Q: What is dependency injection, and how does it relate to dependency inversion?
A: Dependency injection means giving an object its dependencies from outside, typically through its constructor, instead of creating them inside. It is the common technique for applying dependency inversion, because the object then only knows the abstraction it receives.

Q: Why is constructor injection usually preferred?
A: It makes required dependencies explicit in the signature, guarantees the object is fully configured once constructed, and allows fields to be final or const. Setter injection can leave objects half configured.

Q: Should every class depend on an interface instead of a concrete class?
A: No. Stable, side-effect-free classes such as strings, collections or math utilities can be used directly. Apply inversion to volatile or external dependencies, such as databases, networks, clocks, file systems and third-party services, where swapping and testing matter.

## oop.principles.dry-kiss-and-yagni
name: "DRY, KISS and YAGNI"
importance: important
scope: "practical simplicity rules"

### simple
These three rules keep code simple: do not repeat the same knowledge in two places, keep designs as simple as they can be, and do not build things before you need them. It is like packing for a trip: one packing list instead of three copies that drift apart, a small bag instead of a complicated one, and no snow boots for a beach holiday. Each rule saves you from maintaining work that brings no value.

### interview
- **DRY** (Don't Repeat Yourself, from The Pragmatic Programmer): every piece of **knowledge** should have a single, authoritative representation. It is about rules and facts, not identical-looking lines.
- Duplicated knowledge means a change must be made in several places, and one is always missed. Fix with functions, constants, shared types or generating code from one source.
- **KISS** (Keep It Simple): prefer the simplest design that works. Clever code is harder to read, debug and change.
- **YAGNI** (You Aren't Gonna Need It, from Extreme Programming): do not build features, options or extension points for imagined future needs.
- Tensions: over-applying DRY couples unrelated code that only looks similar (the **wrong abstraction**). A common heuristic is the **rule of three**: tolerate a second copy, refactor on the third.
- In interviews, mention these when justifying a simple design or pushing back on speculative generality.

### deep
#### DRY is about knowledge

Two pieces of code can look the same and still be different knowledge. A 10% student discount and a 10% late fee both multiply by 0.10, but they change for different reasons. Merging them into one `applyTenPercent` function would couple them, and the day one changes you must untangle it. Conversely, the same business rule written in the validation layer, the database constraint and the UI is duplication even if the code looks different.

#### Worked example: one rule, one place

```python
# Before: the password rule is known in three places
def signup(password):
    if len(password) < 8:
        raise ValueError("too short")


def change_password(password):
    if len(password) < 8:
        raise ValueError("too short")


HELP_TEXT = "Passwords need at least 8 characters."   # the third copy

# After: one authoritative definition
MIN_PASSWORD_LENGTH = 12


def validate_password(password):
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"needs at least {MIN_PASSWORD_LENGTH} characters")


def help_text():
    return f"Passwords need at least {MIN_PASSWORD_LENGTH} characters."


print(help_text())   # Passwords need at least 12 characters.
```

Changing the rule from 8 to 12 now edits one line, and the help text cannot disagree with the check.

#### KISS in practice

```python
# Over-built: a strategy base class, a subclass and a factory with a registry,
# all to format the one greeting the product has.
class GreetingStrategy:
    def greet(self, name):
        raise NotImplementedError


class EnglishGreeting(GreetingStrategy):
    def greet(self, name):
        return f"Hello, {name}"


class GreetingFactory:
    registry = {"en": EnglishGreeting}

    @classmethod
    def create(cls, lang):
        return cls.registry[lang]()


# Simple: the same behavior in one function. When a second language really arrives,
# turning this into a dictionary lookup takes a minute.
def greet(name):
    return f"Hello, {name}"


print(GreetingFactory.create("en").greet("Asha") == greet("Asha"))   # True
```

KISS is judged by the reader: fewer moving parts, obvious names, straightforward control flow, standard library over home-made machinery.

#### YAGNI in practice

| tempting addition | YAGNI question |
|---|---|
| a plug-in system for one exporter | is a second exporter actually planned? |
| configurable everything | has anyone asked to change this value? |
| a generic `Repository<T>` for one table | will the second table fit the same shape? |
| supporting three databases "later" | when later, and who pays for testing it now? |

Unused generality still costs: it must be read, tested, documented and kept compiling. When the need does come, you will know far more about it and can design it properly.

#### How they fit together

- YAGNI keeps you from building what you do not need.
- KISS keeps what you do build simple.
- DRY keeps each fact in one place so simple code stays correct as it changes.

The balance: duplication is cheaper than the wrong abstraction, and a small, obvious duplication is often fine until the third occurrence shows the real pattern.

Connects to: single responsibility principle, open/closed principle, coupling and cohesion.

### questions
Q: What does DRY actually require?
A: That every piece of knowledge, such as a business rule, a constant or a data format, has one authoritative representation in the system. It is about not duplicating knowledge, not about eliminating every pair of similar-looking lines.

Q: How can applying DRY make code worse?
A: If two pieces of code look alike but represent different concepts, merging them couples things that change for different reasons. The shared function grows flags and special cases, which is known as the wrong abstraction. Duplication is cheaper than that.

Q: What is YAGNI and why does it matter?
A: You Aren't Gonna Need It: do not build features or flexibility until there is a real need. Speculative code must be read, tested and maintained, often guesses the future wrongly, and delays what is needed now.

Q: What is the rule of three in refactoring?
A: Write something once, tolerate a second copy, and extract a shared abstraction when a third copy appears. By then you have enough examples to see what really varies, so the abstraction is more likely to be right.

Q: How would you apply KISS in an interview design question?
A: Start with the simplest design that meets the stated requirements, such as one service and one database, explain it clearly, and add complexity like caching or sharding only when a requirement or a bottleneck justifies it.

## oop.principles.law-of-demeter
name: "Law of Demeter"
importance: important
scope: "talk only to close friends"

### simple
The Law of Demeter says an object should talk only to its close friends, not to friends of friends. When you pay at a shop, you hand over the money yourself; the cashier does not reach into your pocket, open your wallet and take the notes. Code that reaches through several objects to get something done breaks the same way when any of those objects changes.

### interview
- A method `m` of object `O` should call methods only on: `O` itself, `m`'s parameters, objects `m` creates, and `O`'s own fields (its direct components).
- Nickname: "don't talk to strangers"; rule of thumb: avoid **train wrecks** like `order.getCustomer().getWallet().deduct(total)`.
- Fix: **tell, don't ask**. Add a method on the near object that does the work: `customer.pay(total)`.
- Benefits: lower coupling (a caller depends only on its direct neighbors), easier refactoring and mocking, better encapsulation.
- Not every dot is a violation: fluent APIs and builders (`builder.setA().setB()`), stream pipelines and plain data structures return the same kind of object or plain data, not strangers.
- Cost: over-applying it creates many thin forwarding methods ("wrapper explosion"); apply it where the chain exposes real internals.

### deep
#### Intuition

`order.getCustomer().getWallet().deduct(total)` means the order-processing code knows that customers have wallets, that wallets hold money and that deducting is how payment works. If wallets are replaced with payment methods, every such chain breaks. Only the customer should need to know how it pays.

#### Worked example

```python
class Wallet:
    def __init__(self, cash):
        self.cash = cash

    def deduct(self, amount):
        if amount > self.cash:
            raise ValueError("insufficient funds")
        self.cash -= amount


class Customer:
    def __init__(self, cash):
        self._wallet = Wallet(cash)

    def get_wallet(self):              # exposes internals, invites train wrecks
        return self._wallet

    def pay(self, amount):             # tell, don't ask: the customer decides how to pay
        self._wallet.deduct(amount)


class Cashier:
    def charge_bad(self, customer, total):
        customer.get_wallet().deduct(total)   # talks to a stranger (the wallet)

    def charge(self, customer, total):
        customer.pay(total)                   # talks only to a parameter


c = Customer(500)
Cashier().charge(c, 120)
print(c.get_wallet().cash)   # 380
```

| change | `charge_bad` | `charge` |
|---|---|---|
| customers pay by card instead of wallet | breaks | unchanged, `Customer.pay` changes |
| wallet adds a PIN check | may break or bypass it | unchanged |
| test the cashier | needs a real or mocked wallet inside a customer | needs a customer with `pay` |

#### Who counts as a friend

For a method `m` in class `O`, allowed targets are:

1. `O` itself (`this`, `self`).
2. `m`'s parameters.
3. Objects created inside `m`.
4. `O`'s direct fields (components).
5. Globals `O` can reach (use sparingly).

Objects **returned** by those calls are strangers: calling methods on them is the violation.

#### When chains are fine

```cpp
struct Query {
    vector<string> parts;
    Query& select(const string& c) { parts.push_back("SELECT " + c); return *this; }
    Query& from(const string& t) { parts.push_back("FROM " + t); return *this; }
    Query& where(const string& w) { parts.push_back("WHERE " + w); return *this; }
    string str() const {
        string s;
        for (const auto& p : parts) s += (s.empty() ? "" : " ") + p;
        return s;
    }
};

int main() {
    // Every call returns the same Query object: no strangers involved.
    cout << Query().select("name").from("users").where("age > 30").str() << "\n";
    // SELECT name FROM users WHERE age > 30
}
```

Fluent builders, stream pipelines (`list.stream().filter(...).map(...)`) and navigation of plain data (a parsed JSON tree, a record's fields) do not expose behavior-owning internals, so the law's purpose is not at stake.

#### Pitfalls

- Hiding chains behind getters (`getCustomerWalletCash()`) still leaks the structure; move the behavior instead.
- Forwarding every method of every component makes classes large and noisy; forward only what callers really need as an operation.
- Confusing it with "only one dot" mechanically.

Connects to: coupling and cohesion, encapsulation, facade, dependency inversion principle.

### questions
Q: What is the Law of Demeter?
A: A method should only call methods on its own object, its parameters, objects it creates, and its object's direct fields. It should not call methods on objects returned by those calls, because that makes it depend on the internal structure of objects it does not directly know.

Q: What is a train wreck and how do you fix it?
A: A chain of calls like order.getCustomer().getWallet().deduct(total) that reaches through several objects. Fix it by telling the nearest object what you want, for example customer.pay(total), and letting it handle the details internally.

Q: What does tell, don't ask mean?
A: Instead of asking an object for its data and making decisions with it outside, tell the object to perform the operation that uses its data. This keeps behavior next to the data and avoids exposing internal structure.

Q: Is a fluent builder chain a Law of Demeter violation?
A: No. Each call returns the same builder object, or an object of the same abstraction, so the code is still talking to one friend. The law targets chains that navigate into other objects' internal components.

Q: What is the downside of applying the Law of Demeter strictly?
A: It can create many small forwarding methods on intermediate classes just to pass calls along, which bloats their interfaces. Apply it where chains expose real internals that are likely to change.
