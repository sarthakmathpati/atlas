---
topic: oop.relationships
name: "Relationships and modeling"
subject: oop
order: 3
prereqs: [oop.pillars]
---

## oop.relationships.association-aggregation-and-composition
name: "Association, aggregation and composition"
importance: must
scope: "has-a relationships and lifetime ownership"

### simple
These three words describe how strongly two objects are tied together. A teacher and a student simply know each other (association), a team has players who can leave and join other teams (aggregation), and a house has rooms that do not exist without the house (composition). The question to ask is who owns whom, and what happens to the parts when the whole goes away.

### interview
- **Association**: a general "uses" or "knows about" link between independent objects (a `Doctor` and a `Patient`). Either can exist without the other; it can be one-way or two-way, with multiplicities such as one-to-many.
- **Aggregation**: a **has-a** whole-part link **without ownership**. The part can exist on its own and can even be shared (a `Team` has `Player`s; a player outlives a disbanded team). UML: hollow diamond at the whole.
- **Composition**: a **has-a** link **with ownership**. The part belongs to one whole at a time and is created and destroyed with it (an `Order` has `OrderLine`s). UML: filled diamond at the whole.
- In C++ the difference is visible in the types: composition is a member by value or a `unique_ptr`; aggregation and association are references, raw non-owning pointers, or `shared_ptr` or `weak_ptr` when lifetime is shared.
- In Java and Python everything is a reference, so the difference is in intent: composition creates the part inside and never hands it out; aggregation receives it from outside.
- Interview test: "if the whole is deleted, should the part be deleted too?" Yes means composition; no means aggregation.

### deep
#### Intuition

All three are "has-a" or "uses-a" relationships, unlike inheritance's "is-a". They differ in **lifetime** and **ownership**:

| relationship | strength | part's lifetime | shared? | example |
|---|---|---|---|---|
| association | weakest | independent | yes | Doctor ↔ Patient |
| aggregation | medium | independent of the whole | can be | Team ◇ Player |
| composition | strongest | bound to the whole | no | Order ◆ OrderLine |

A weaker relationship still is **dependency**: a class uses another only inside one method (a parameter or local variable), such as `ReportPrinter.print(Report r)`.

#### Code: ownership shows in the types

```cpp
class Player {
    string name;
public:
    explicit Player(string n) : name(std::move(n)) {}
    const string& getName() const { return name; }
};

class Team {                                   // aggregation: players are not owned
    vector<Player*> roster;                    // non-owning pointers
public:
    void add(Player& p) { roster.push_back(&p); }
    size_t size() const { return roster.size(); }
};

class OrderLine {
public:
    string item; int qty;
    OrderLine(string item, int qty) : item(std::move(item)), qty(qty) {}
};

class Order {                                  // composition: lines are owned
    vector<OrderLine> lines;                   // stored by value, die with the order
public:
    void addLine(const string& item, int qty) { lines.emplace_back(item, qty); }
    int totalQty() const {
        int t = 0;
        for (const auto& l : lines) t += l.qty;
        return t;
    }
};

class Doctor;                                  // association: they just know each other
class Patient {
    Doctor* doctor = nullptr;                  // may be null, never deleted by Patient
public:
    void assign(Doctor& d) { doctor = &d; }
};
class Doctor {};

int main() {
    Player asha("Asha"), ben("Ben");
    {
        Team t;
        t.add(asha); t.add(ben);
        cout << t.size() << "\n";              // 2
    }                                          // team gone, players still alive
    cout << asha.getName() << "\n";            // Asha
    Order o;
    o.addLine("pen", 3); o.addLine("book", 1);
    cout << o.totalQty() << "\n";              // 4; the lines vanish with o
}
```

```python
class Player:
    def __init__(self, name):
        self.name = name


class Team:
    def __init__(self, players):
        self.players = list(players)          # aggregation: players come from outside


class OrderLine:
    def __init__(self, item, qty):
        self.item, self.qty = item, qty


class Order:
    def __init__(self):
        self._lines = []                      # composition: created and kept inside

    def add_line(self, item, qty):
        self._lines.append(OrderLine(item, qty))

    def total_qty(self):
        return sum(line.qty for line in self._lines)


asha = Player("Asha")
team = Team([asha])
del team
print(asha.name)           # Asha: the player outlives the team
```

#### Worked example: a university

Model a university with departments, professors and courses.

| pair | relationship | reasoning |
|---|---|---|
| University ◆ Department | composition | closing the university removes its departments |
| Department ◇ Professor | aggregation | a professor exists without a department and may move |
| Professor → Course (teaches) | association | both exist independently; many-to-many |
| Course ◆ Syllabus | composition | a syllabus means nothing without its course |
| GradeReport ⇢ Student | dependency | a report generator only reads a student while printing |

Interviewers rarely care about perfect UML symbols; they care that you ask the lifetime question and that your code matches the answer (value members or `unique_ptr` for owned parts, references for the rest).

#### Pitfalls

- Treating aggregation and composition as the same and deleting shared parts (double free in C++, surprising data loss in a database cascade).
- Composition parts escaping: handing out a pointer to an owned part that the caller keeps after the whole dies.
- Two-way associations that both own each other (`shared_ptr` cycles leak; break one side with `weak_ptr`).
- Using inheritance where the relationship is really has-a (a `Car` extending `Engine`).

Connects to: composition over inheritance, UML class diagrams, object lifecycle, LLD entity modeling.

### questions
Q: What is the difference between aggregation and composition?
A: Both are has-a relationships. In composition the whole owns the part: the part is created with it, belongs to only that whole and is destroyed with it, like an order and its order lines. In aggregation the part has an independent lifetime and may be shared, like a team and its players.

Q: How is composition typically expressed in C++?
A: By holding the part as a member by value or through a std::unique_ptr, so the part is destroyed automatically with the owner. Aggregation and association use references, non-owning raw pointers, or shared_ptr and weak_ptr when ownership is genuinely shared.

Q: How do association and dependency differ?
A: An association is a lasting structural link: one object keeps a reference to another, such as a patient knowing its doctor. A dependency is temporary use: a class uses another only as a parameter or local variable inside a method.

Q: Give an example of each relationship in a library system.
A: A library and its catalog records are composition, since records are removed with the library. A library and its members are aggregation, since members exist on their own. A member and a borrowed book form an association, since each exists independently and they are linked while the loan lasts.

Q: What question helps you decide between aggregation and composition?
A: Ask what should happen to the part when the whole is destroyed. If the part should be destroyed too and cannot belong to another whole, it is composition. If it should survive or can be shared, it is aggregation.

## oop.relationships.composition-over-inheritance
name: "Composition over inheritance"
importance: must
prereqs: [oop.relationships.association-aggregation-and-composition]
scope: "flexibility, fragile base class problem"

### simple
Composition over inheritance means building an object out of smaller parts instead of extending a parent class. It is like building with LEGO bricks instead of carving a statue: you can swap one brick for another later, but a carved statue is stuck with its shape. When in doubt, give an object a part that does the job rather than making it a kind of something else.

### interview
- Prefer **has-a** (hold an object and delegate to it) over **is-a** (extend a class) when the goal is reusing behavior. Keep inheritance for true subtypes that callers use polymorphically.
- **Fragile base class problem**: a subclass depends on how the parent is implemented, so a harmless-looking change in the parent can break it. The classic case: counting inserts by overriding both `add` and `addAll` on Java's `HashSet` double counts, because `addAll` calls `add` internally.
- Composition can be changed **at runtime** (swap the engine or strategy), while a parent class is fixed at compile time.
- It avoids **class explosion**: n kinds of engine times m kinds of body would need n × m subclasses but only n + m components.
- It exposes only what you choose (the wrapper's own interface), whereas inheritance exposes every public method of the parent, even ones that break your rules (a `Stack` extending `Vector` allows inserting in the middle).
- Costs: more small classes and forwarding methods. Inheritance is still right for real type hierarchies and frameworks designed for extension.

### deep
#### Intuition

Inheritance says "I am one of those, including all its insides". Composition says "I have one of those and ask it for help". The second creates a much thinner contact surface: you depend only on the helper's public methods, not on how its own methods call each other.

#### The fragile base class problem (worked example)

Count how many elements were ever added to a set:

```java
class InstrumentedSet<E> extends HashSet<E> {
    private int addCount = 0;
    @Override public boolean add(E e) { addCount++; return super.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);            // HashSet's addAll calls add() for each element
    }
    public int getAddCount() { return addCount; }
}
```

| step | addCount |
|---|---|
| `s.addAll(List.of("a", "b", "c"))` starts | 0 |
| our `addAll` adds `c.size()` | 3 |
| inherited `addAll` calls our `add` three times | 6 |

The answer is 6, not 3. Nothing in `HashSet`'s documented interface promises that `addAll` uses `add`, so the subclass broke by relying on a detail; if a future version changed it, the subclass would break again in a different way.

The composition version wraps a set and forwards:

```java
class CountingSet<E> {
    private final Set<E> inner;            // has-a, not is-a
    private int addCount = 0;
    CountingSet(Set<E> inner) { this.inner = inner; }
    boolean add(E e) { addCount++; return inner.add(e); }
    boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return inner.addAll(c);            // inner's addAll calls inner's add, not ours
    }
    int getAddCount() { return addCount; }
}
```

Now the count is 3, and it works with any `Set` (`HashSet`, `TreeSet`), chosen by the caller.

#### Class explosion and runtime flexibility

```cpp
struct Engine {
    virtual ~Engine() = default;
    virtual string start() const = 0;
};
struct PetrolEngine : Engine { string start() const override { return "vroom"; } };
struct ElectricEngine : Engine { string start() const override { return "hum"; } };

class Car {
    unique_ptr<Engine> engine;                     // composed part
    string body;
public:
    Car(string body, unique_ptr<Engine> e) : engine(std::move(e)), body(std::move(body)) {}
    string drive() const { return body + ": " + engine->start(); }
    void swapEngine(unique_ptr<Engine> e) { engine = std::move(e); }   // change at runtime
};

int main() {
    Car c("hatchback", make_unique<PetrolEngine>());
    cout << c.drive() << "\n";                     // hatchback: vroom
    c.swapEngine(make_unique<ElectricEngine>());
    cout << c.drive() << "\n";                     // hatchback: hum
}
```

With inheritance you would need `PetrolHatchback`, `ElectricHatchback`, `PetrolSedan`, `ElectricSedan` and so on: every new engine multiplies the classes, and a car can never change its engine.

```python
class Car:
    def __init__(self, body, engine):
        self.body = body
        self.engine = engine            # any object with start() works

    def drive(self):
        return f"{self.body}: {self.engine.start()}"


class Electric:
    def start(self):
        return "hum"


print(Car("sedan", Electric()).drive())   # sedan: hum
```

#### Unwanted inherited methods

Java's `Stack` extends `Vector`, so `stack.add(0, x)` inserts at the bottom of a stack, breaking the stack's meaning. A stack that holds a list and exposes only `push`, `pop` and `peek` cannot be misused.

#### When inheritance is still right

- The subclass really is substitutable for the parent (Liskov holds) and callers use it through the parent type.
- The parent was designed and documented for extension (template method, abstract skeletons).
- You want to implement an interface; implementing interfaces is not the problem, inheriting implementation is.

#### Pitfalls

- Forgetting to forward a method after wrapping, or forwarding all of them blindly and recreating the problem.
- Deep delegation chains that are as hard to follow as deep hierarchies.
- Replacing a clean, stable hierarchy with composition for its own sake.

Connects to: inheritance, decorator, strategy, Liskov substitution principle, open/closed principle.

### questions
Q: What does composition over inheritance mean?
A: Prefer building classes that hold other objects and delegate work to them over extending a class to reuse its code. Inheritance is kept for genuine subtype relationships used polymorphically, while reuse of behavior goes through composed parts.

Q: What is the fragile base class problem?
A: A subclass depends on implementation details of its parent, such as which methods call which, so a change inside the parent can break the subclass without any change to its interface. Overriding add and addAll on a HashSet to count insertions double counts because addAll calls add internally.

Q: Why is composition more flexible than inheritance?
A: A composed part can be chosen by the caller and swapped at runtime, and several independent parts can be combined without creating a subclass for every combination. Inheritance is fixed at compile time and each new variation multiplies the number of subclasses.

Q: When is inheritance still the better choice?
A: When the child is truly a subtype that can be used anywhere the parent is expected, when callers treat the objects polymorphically, and when the parent was designed for extension, such as an abstract class with a documented template of steps.

Q: Why is Java's Stack extending Vector considered a design mistake?
A: Because Stack inherits every Vector method, including inserting and removing at any index, so code can break the last-in, first-out rule. A stack that wraps a list and exposes only push, pop and peek could not be misused.

## oop.relationships.uml-class-diagrams
name: "UML class diagrams"
importance: important
prereqs: [oop.relationships.association-aggregation-and-composition]
scope: "classes, attributes, methods, arrows for each relationship"

### simple
A UML class diagram is a standard drawing of the classes in a system and how they connect. It works like a floor plan for code: boxes are rooms, and different kinds of lines show which rooms are part of which and which just have a door between them. In interviews it is a quick way to show your design before you write any code.

### interview
- A class is a box with three compartments: **name**, **attributes** (`- balance: double`), **operations** (`+ deposit(amount: double): void`). Abstract names are italic; static members are underlined.
- Visibility: `+` public, `-` private, `#` protected, `~` package.
- Lines: **inheritance** (generalization) is a solid line with a hollow triangle at the parent; **realization** (implements an interface) is a dashed line with a hollow triangle; **association** is a solid line, with an open arrow for one-way navigation; **aggregation** has a hollow diamond at the whole; **composition** a filled diamond at the whole; **dependency** a dashed line with an open arrow.
- **Multiplicity** at each end: `1`, `0..1`, `*` (or `0..*`), `1..*`, such as one `Customer` to `*` `Order`s.
- In machine-coding and LLD interviews, a quick diagram of the main classes and their relationships comes before code; clarity beats perfect notation.

### deep
#### The class box

```text
+---------------------------+
|        Account            |   name (italic if abstract)
+---------------------------+
| - id: long                |   attributes: visibility name: type
| - balance: double         |
| # owner: Customer         |
+---------------------------+
| + deposit(x: double): void|   operations: visibility name(params): return
| + withdraw(x: double): bool
| + getBalance(): double    |
+---------------------------+
```

#### The relationship arrows

| relationship | line | end marker | read as |
|---|---|---|---|
| inheritance | solid | hollow triangle at the parent | SavingsAccount is an Account |
| realization | dashed | hollow triangle at the interface | Account implements Auditable |
| association | solid | none, or open arrow for direction | Customer knows its Accounts |
| aggregation | solid | hollow diamond at the whole | Bank has Customers (not owned) |
| composition | solid | filled diamond at the whole | Account owns its Transactions |
| dependency | dashed | open arrow at the used class | StatementPrinter uses Account |

A way to remember the diamonds: the diamond always sits at the **whole**, and filling it in means the whole holds on tightly (owns the part).

#### Worked example: a small bank

```text
          <<interface>>
            Auditable
                ^
                :  (realization, dashed)
                :
 Bank <>-------- Customer 1 ---------- * Account <|------ SavingsAccount
  (aggregation)         (association)       |
                                            <#> 1
                                            |
                                            * Transaction   (composition)

 StatementPrinter - - - - -> Account       (dependency)
```

In this text sketch `<>` is a hollow diamond, `<#>` a filled one, `<|--` an inheritance triangle and the dotted `^` a realization. Read it aloud: a bank aggregates customers; one customer has many accounts; an account owns many transactions, which die with it; a savings account is an account; accounts implement `Auditable`; the statement printer only uses accounts while printing.

The same design in code:

```java
interface Auditable { String auditTrail(); }

class Transaction {
    final double amount;
    Transaction(double amount) { this.amount = amount; }
}

class Account implements Auditable {                       // realization
    private final List<Transaction> history = new ArrayList<>();   // composition
    protected double balance;
    public void deposit(double x) { balance += x; history.add(new Transaction(x)); }
    public String auditTrail() { return history.size() + " transactions"; }
}

class SavingsAccount extends Account {                     // inheritance
    private final double rate;
    SavingsAccount(double rate) { this.rate = rate; }
}

class Customer {
    private final List<Account> accounts = new ArrayList<>();   // association, 1 to *
    void open(Account a) { accounts.add(a); }
}

class Bank {
    private final List<Customer> customers = new ArrayList<>(); // aggregation
    void register(Customer c) { customers.add(c); }
}

class StatementPrinter {
    String print(Account a) { return a.auditTrail(); }      // dependency: a parameter only
}
```

#### Tips for interviews

- Draw only the classes that matter for the question; five clear boxes beat twenty.
- Put multiplicities on associations where they carry meaning (one parking lot has many levels).
- Mark interfaces with `<<interface>>` and abstract classes in italics or with `{abstract}`.
- Use the diagram to talk: walk through a use case and point at the classes involved.

#### Common mistakes

- Putting the diamond at the part instead of the whole.
- Drawing the inheritance triangle at the child.
- Using inheritance arrows for has-a relationships.
- Listing every getter and setter, which hides the interesting operations.

Connects to: association, aggregation and composition, inheritance, LLD method.

### questions
Q: What are the three compartments of a UML class box?
A: The top holds the class name (italic if abstract, with a stereotype such as interface if needed). The middle lists attributes as visibility, name and type. The bottom lists operations with their parameters and return types.

Q: How do you draw aggregation and composition in UML?
A: Both are solid lines with a diamond at the whole's end. Aggregation uses a hollow diamond, meaning the part is not owned and can outlive the whole. Composition uses a filled diamond, meaning the whole owns the part and destroys it with itself.

Q: How do inheritance and interface realization look in a class diagram?
A: Inheritance is a solid line with a hollow triangle pointing at the parent class. Realization, a class implementing an interface, is a dashed line with a hollow triangle pointing at the interface.

Q: What does multiplicity mean on an association?
A: It states how many objects can be linked at each end, written as 1, 0..1, * or 1..*. For example, 1 at the customer end and * at the order end means each order belongs to exactly one customer and a customer can have any number of orders.

Q: What do the symbols plus, minus, hash and tilde mean before a member?
A: They show visibility: plus is public, minus is private, hash is protected, and tilde is package visibility.

## oop.relationships.coupling-and-cohesion
name: "Coupling and cohesion"
importance: important
scope: "what good module boundaries look like"

### simple
Coupling is how much one part of a program depends on others, and cohesion is how well the things inside one part belong together. A good kitchen has high cohesion, because all the cooking tools are in it, and low coupling, because you do not need to walk to the garage to boil water. Aim for parts that are focused inside and loosely connected outside.

### interview
- **Coupling**: the degree of interdependence **between** modules. **Low** coupling is the goal, so a change in one module rarely forces changes in others.
- **Cohesion**: how closely the responsibilities **within** a module relate. **High** cohesion is the goal: one clear purpose per class or module.
- Signs of tight coupling: reaching into another class's fields, long chains like `a.getB().getC().doX()`, many classes changing together, shared global state, depending on concrete classes instead of interfaces.
- Signs of low cohesion: "manager" or "utils" classes that do unrelated things, methods that use disjoint sets of fields, a class name that needs "and" to describe it.
- Tools to fix: interfaces and dependency injection, the Law of Demeter, events or messages between modules, and splitting classes by responsibility (single responsibility principle).
- Classical scales, worst to best. Coupling: content, common, external, control, stamp, data. Cohesion: coincidental, logical, temporal, procedural, communicational, sequential, functional.

### deep
#### Intuition

A change is cheap when it touches one place. High cohesion makes sure everything related to a change lives in the same place; low coupling makes sure that place does not drag others along. Together they are what "good module boundaries" means.

#### Coupling, from worst to best

| kind | meaning | example |
|---|---|---|
| content | one module changes another's internals | editing another object's private fields via reflection |
| common | modules share global data | many classes reading and writing a global config map |
| external | modules share an external format or device | two services parsing the same hand-rolled file format |
| control | one module passes a flag that steers another's logic | `render(data, isAdmin, useCache, mode)` |
| stamp | modules pass a whole structure but use only part | passing a full `User` to a function that needs an email |
| data | modules share only the plain data they need | `sendMail(address, body)` |

#### Cohesion, from worst to best

| kind | elements are together because… |
|---|---|
| coincidental | no reason: `Utils` with date parsing and PDF export |
| logical | they are the same category: all input handling, for every device |
| temporal | they run at the same time: everything done at startup |
| procedural | they follow one another in a procedure |
| communicational | they work on the same data |
| sequential | one's output is the next one's input |
| functional | they all contribute to one well-defined task |

#### Worked example: splitting a class

```python
# Low cohesion, high coupling: one class does three jobs and builds its own dependencies.
class ReportManager:
    def run(self):
        rows = self.query_database()        # data access
        html = self.to_html(rows)           # formatting
        self.send_email("boss@corp", html)  # delivery

    def query_database(self):
        return [("north", 120), ("south", 80)]

    def to_html(self, rows):
        return "".join(f"<p>{name}: {value}</p>" for name, value in rows)

    def send_email(self, to, body):
        print(f"mail to {to}: {len(body)} chars")
```

After the split, each class has one reason to change, and the coordinator depends on small interfaces that are passed in:

```python
class SalesRepository:
    def totals(self):
        return [("north", 120), ("south", 80)]


class HtmlFormatter:
    def format(self, rows):
        return "".join(f"<p>{name}: {value}</p>" for name, value in rows)


class ConsoleMailer:
    def send(self, to, body):
        print(f"mail to {to}: {len(body)} chars")


class ReportJob:
    def __init__(self, repo, formatter, mailer):   # dependencies injected
        self.repo, self.formatter, self.mailer = repo, formatter, mailer

    def run(self, to):
        self.mailer.send(to, self.formatter.format(self.repo.totals()))


ReportJob(SalesRepository(), HtmlFormatter(), ConsoleMailer()).run("boss@corp")
```

| change request | classes touched before | after |
|---|---|---|
| switch to PDF | ReportManager | a new formatter only |
| read from an API | ReportManager | a new repository only |
| test without sending mail | impossible without patching | pass a fake mailer |

#### Measuring it informally

- Count what a class imports or constructs; many concrete dependencies suggest high coupling.
- Check whether methods share fields; groups of methods using separate groups of fields suggest two classes hiding in one (low cohesion).
- Look at version history: files that always change together are coupled, whatever the design says.

#### Pitfalls

- Chasing zero coupling: modules must talk; aim for few, narrow, stable connections.
- Splitting into so many tiny classes that one feature is scattered everywhere, which lowers cohesion at a higher level.
- Passing flags that switch behavior (control coupling) instead of separate methods or strategies.

Connects to: single responsibility principle, Law of Demeter, dependency inversion principle, facade.

### questions
Q: What are coupling and cohesion, and which direction is good for each?
A: Coupling measures how much modules depend on one another, and you want it low so changes stay local. Cohesion measures how closely the parts of one module belong together, and you want it high so each module has one clear purpose.

Q: What are signs of tight coupling in object-oriented code?
A: Classes reading or writing each other's internal fields, long call chains through several objects, classes constructing their concrete dependencies themselves, shared global state, and many files that must change together for a single feature.

Q: How can you reduce coupling between two classes?
A: Make one depend on an interface instead of a concrete class and inject the implementation, pass only the data it needs, follow the Law of Demeter instead of reaching through objects, or communicate through events. Each step narrows the connection.

Q: What is the best and the worst type of cohesion?
A: Functional cohesion is the best: every element contributes to a single, well-defined task. Coincidental cohesion is the worst: elements are grouped for no real reason, as in a catch-all utilities class.

Q: What is control coupling and how do you avoid it?
A: Control coupling happens when one module passes a flag that tells another which path of logic to take, such as a boolean mode parameter. It couples the caller to the callee's internals. Split the function into separate methods or pass a strategy object instead.
