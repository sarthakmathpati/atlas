---
topic: lld.method
name: "LLD method"
subject: lld
order: 1
prereqs: [oop.principles]
---

## lld.method.clarifying-requirements
name: "Clarifying requirements"
importance: must
scope: "functional vs non-functional, scope for a 45 to 90 minute round"

### simple
A low-level design prompt is short on purpose, so the first few minutes go into asking what the system must actually do. It is like a tailor taking measurements before cutting cloth: a few questions now save a wasted suit later. You write the answers down as a short list and build exactly that.

### interview
- **Functional requirements**: what the system does, as use cases with an actor and a result ("a driver parks a car and gets a ticket", "the ticket is paid on exit").
- **Non-functional requirements** that matter in LLD: thread safety, extensibility (which parts will change), testability, in-memory versus persistent storage, and rough sizes. Latency and availability belong to high-level design.
- Ask about **actors, core flows, variations, error cases and scope**; propose sensible defaults instead of waiting for answers ("I'll assume one entry gate unless you want several").
- **Scope to the clock**: a 45-minute design round wants a class diagram, the key interfaces and one or two flows in code; a 60 to 90 minute machine-coding round wants runnable code with a demo.
- Write a numbered list of in-scope requirements and an explicit **out of scope** list, and confirm it before designing.
- Pitfalls: jumping into classes, asking twenty questions, gold-plating features nobody asked for, and silently assuming a database or a UI.

### deep
#### Why it matters

Interviewers give a one-line prompt ("design a parking lot") to see whether you can turn vagueness into a precise problem. Two candidates can build very different, equally valid systems; what is graded is that yours solves a clearly stated problem, and that the design bends where the interviewer said change would come.

#### Functional versus non-functional

| kind | question it answers | parking lot examples |
|---|---|---|
| functional | what can each actor do? | park a vehicle, get a ticket, pay on exit, see free spots per floor |
| non-functional | how well, under which constraints? | two gates at once must not take the same spot; pricing will change; runs in memory |

In LLD, non-functional requirements shape the **classes**: "pricing will change" makes pricing an interface; "many gates" puts a lock around spot assignment; "must be testable" means the clock is injected rather than read directly.

#### A question checklist

1. **Actors**: who uses it (driver, attendant, admin)? Is any actor out of scope?
2. **Core flows**: the two or three things that must work end to end.
3. **Variations**: kinds of things (vehicle types, spot sizes, payment modes).
4. **Rules and errors**: what if the lot is full, the ticket is lost, payment fails?
5. **Change**: which rule is most likely to change next (pricing, a new vehicle type)?
6. **Concurrency and storage**: several entry points at once? In memory is fine?

Ask these in two or three batches, and offer a default with each question, so a silent interviewer still leaves you with an answer.

#### Worked example: parking lot

Prompt: "Design a parking lot." After five minutes the whiteboard says:

```text
In scope
 1. Floors with spots of three sizes: small (bikes), medium (cars), large (trucks).
 2. A vehicle gets the smallest free spot that fits and a ticket on entry.
 3. On exit, the fee depends on duration and vehicle type; the spot is freed.
 4. Show free spots per floor and size.
 5. Several gates run at once: a spot is never given to two vehicles.
 6. Pricing rules will change (weekend rates are coming).
Out of scope
 - payment gateways (assume payment succeeds), reservations, a UI, persistence
Demo
 - park a bike, a car and a truck; fill a size; exit and pay; show availability
```

Each line maps to design decisions: line 2 is a spot-assignment rule, line 5 a locking decision, line 6 a strategy interface. The demo line becomes the `main` you run at the end of a machine-coding round.

#### Scoping for the time you have

| round | expect to deliver |
|---|---|
| 45-minute design | requirements, entities, a class diagram, interfaces for the parts that vary, code for one or two core methods, how you would handle concurrency |
| 60 to 90-minute machine coding | all of the above plus compiling, runnable code with in-memory storage and a demo `main` that walks through the flows |

Keep a "later" list for good ideas you will not build now (reservations, loyalty discounts). Mentioning them shows judgment; building them costs the working core.

#### Common mistakes

- Designing before agreeing what "done" means, then being told halfway that a key rule was different.
- Asking questions without proposing defaults, which stalls the round.
- Treating "scalable" as a requirement in an LLD round; it usually means "easy to extend", not "sharded".
- Forgetting error cases: full lot, unknown ticket, double exit.

Connects to: [identifying entities](#/concept/lld.method.identifying-entities), [machine coding round strategy](#/concept/lld.method.machine-coding-round-strategy), [parking lot](#/concept/lld.classics.parking-lot), [the system design interview framework](#/concept/sysd.method.the-interview-framework).

### questions
Q: What is the difference between functional and non-functional requirements in a low-level design round?
A: Functional requirements describe what each actor can do, such as parking a car and paying on exit. Non-functional requirements describe constraints on how it is built, such as thread safety, which rules will change, testability and in-memory storage; in LLD they decide where interfaces and locks go.

Q: How do you handle an interviewer who gives very little detail?
A: Ask a few batched questions, each with a proposed default, such as "I'll assume one entry gate unless you want several." Then write down the agreed in-scope and out-of-scope lists and confirm them before designing.

Q: What should you deliver in a 45-minute design round compared with a 90-minute machine-coding round?
A: In 45 minutes, aim for requirements, entities, a class diagram, interfaces for the parts that vary and code for one or two core methods. In a longer machine-coding round, the code must also compile and run, with in-memory storage and a demo that walks through the main flows.

Q: Why write an explicit out-of-scope list?
A: It protects your time and shows judgment: the interviewer agrees that payments, persistence or a UI are not being built, so nobody expects them later. It also gives you a ready answer when asked how you would extend the design.

Q: Which requirement should you always ask about in LLD, even if the interviewer does not mention it?
A: What is most likely to change, and whether several users act at the same time. The first tells you where to put interfaces such as a pricing strategy, and the second tells you which state needs locking.

## lld.method.identifying-entities
name: "Identifying entities"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "nouns to classes, verbs to methods"

### simple
Once the requirements are written down, you read them looking for nouns and verbs. Nouns such as member, book and loan are candidates for classes, and verbs such as borrow and return are candidates for methods. It is like casting a play: you decide who is on stage and what each actor does.

### interview
- Underline the **nouns** in the requirements; each becomes a class, a value type, an attribute, an external actor, or nothing (a synonym or out of scope).
- A noun earns a class when it has **identity and changing state** (a `Loan`) or real behavior; small immutable quantities become **value types** (`Money`, `TimeSlot`); descriptive words become attributes.
- Underline the **verbs**; give each to the class that owns the data it needs (the **information expert**). A verb that coordinates several entities goes to a **service** (`Library::borrow`).
- Separate a **thing** from its **physical instances** when both matter: a book title versus its copies, a show versus its seats.
- Pitfalls: one god class that does everything, a class for every noun, and classes that only hold getters and setters while all logic lives elsewhere.

### deep
#### The method

1. Take the agreed requirements (see [clarifying requirements](#/concept/lld.method.clarifying-requirements)).
2. Underline every noun and every verb.
3. Classify each noun: entity, value type, attribute, actor, or drop it.
4. Give each verb an owner: the class holding most of the data the verb touches.
5. Sketch the result and walk one use case through it. Missing data or a method with no home means a missing entity.

#### Worked example: a small library

Requirements: "A **member** **borrows** a **book**. The library holds several **copies** of each book. A member may hold at most two **loans**. A loan lasts 14 **days**; a member who **returns** a copy late **pays** a **fine** of 10 rupees per day."

| noun | decision | reason |
|---|---|---|
| library | `Library` service | coordinates the borrow and return use cases |
| member | `Member` entity | has identity and a changing loan count |
| book | `Book` entity (the title) | the catalog entry: title and ISBN |
| copy | `Copy` entity | each physical copy is on loan or not |
| loan | `Loan` entity | links a copy to a member with a due day |
| day | an `int` day number | a value, no behavior needed here |
| fine | computed by `Loan::fineOn` | derived from the due day; no state of its own |

| verb | owner | why |
|---|---|---|
| borrow | `Library::borrow` | touches a member, a copy and a new loan |
| return | `Library::giveBack` | the same three objects (`return` is a C++ keyword) |
| compute fine | `Loan::fineOn` | the loan knows its due day |

The book and copy split is the key insight: availability belongs to copies, while search belongs to titles.

#### The resulting code

```cpp
struct Book { string isbn, title; };                       // a title in the catalog
struct Copy { int id; string isbn; bool onLoan = false; };  // one physical copy
struct Member { int id; string name; int activeLoans = 0; };

struct Loan {
    int copyId, memberId, dueDay;
    int fineOn(int day) const { return max(0, day - dueDay) * 10; }  // 10 rupees a day
};

class Library {                                  // coordinates entities per use case
    map<string, Book> catalog;
    map<int, Copy> copies;
    map<int, Member> members;
    map<int, Loan> loans;                        // keyed by copy id
    int nextCopyId = 1;
public:
    static constexpr int kMaxLoans = 2, kLoanDays = 14;
    void addBook(const Book& b, int count) {
        catalog[b.isbn] = b;
        for (int i = 0; i < count; ++i, ++nextCopyId)
            copies[nextCopyId] = {nextCopyId, b.isbn};
    }
    void join(const Member& m) { members[m.id] = m; }
    optional<int> borrow(int memberId, const string& isbn, int today) {  // copy id
        Member& m = members.at(memberId);
        if (m.activeLoans == kMaxLoans) return nullopt;
        for (auto& [id, c] : copies)
            if (c.isbn == isbn && !c.onLoan) {
                c.onLoan = true;
                ++m.activeLoans;
                loans[id] = {id, memberId, today + kLoanDays};
                return id;
            }
        return nullopt;                          // every copy is out
    }
    int giveBack(int copyId, int today) {        // returns the fine
        Loan loan = loans.at(copyId);
        loans.erase(copyId);
        copies.at(copyId).onLoan = false;
        --members.at(loan.memberId).activeLoans;
        return loan.fineOn(today);
    }
};

int main() {
    Library lib;
    lib.addBook({"isbn-7", "Dune"}, 1);
    lib.join({1, "asha"});
    lib.join({2, "ravi"});
    auto show = [](optional<int> c) { return c ? "copy " + to_string(*c) : string("none free"); };
    cout << "asha borrows Dune on day 1: " << show(lib.borrow(1, "isbn-7", 1)) << "\n";
    cout << "ravi borrows Dune on day 2: " << show(lib.borrow(2, "isbn-7", 2)) << "\n";
    cout << "asha returns on day 18, fine " << lib.giveBack(1, 18) << "\n";
    cout << "ravi tries again on day 18: " << show(lib.borrow(2, "isbn-7", 18)) << "\n";
}
```

Output:

```text
asha borrows Dune on day 1: copy 1
ravi borrows Dune on day 2: none free
asha returns on day 18, fine 30
ravi tries again on day 18: copy 1
```

Asha's loan was due on day 15, so returning on day 18 costs 3 × 10 = 30 rupees.

#### Mistakes to avoid

- **A god class**: `LibrarySystem` with forty methods and every field. Split by entity; keep the service thin.
- **A class per noun**: "fine" and "day" do not need classes yet. Add one when it gains state or rules.
- **Anemic entities**: if `Loan` had no `fineOn`, fine logic would be scattered across callers.
- **Missing the instance split**: modeling only `Book` makes "two copies, one on loan" impossible.

Connects to: [defining relationships](#/concept/lld.method.defining-relationships-and-class-diagrams), [single responsibility](#/concept/oop.principles.single-responsibility-principle), [classes and objects](#/concept/oop.foundations.classes-and-objects), [library management](#/concept/lld.classics.library-management).

### questions
Q: How do you turn a requirements paragraph into classes?
A: Underline the nouns and verbs. Nouns with identity and changing state become entities, small immutable quantities become value types, descriptive words become attributes, and synonyms or out-of-scope nouns are dropped. Each verb goes to the class that owns the data it needs, or to a service when it coordinates several entities.

Q: When does a noun deserve its own class?
A: When it has identity and state that changes over time, or real behavior and rules of its own, like a loan with a due date and a fine. A noun that is just a number or a label, like a day or a color, stays an attribute until it gains rules.

Q: Why separate a book from its copies?
A: The title and the physical items answer different questions: search and descriptions belong to the title, while availability, loans and damage belong to each copy. Modeling only one makes it impossible to have two copies with one on loan.

Q: What is the information expert principle?
A: Give a responsibility to the class that has the information needed to fulfil it. A loan knows its due date, so it computes its own fine, instead of a caller pulling the date out and doing the arithmetic.

Q: What is a god class and how do you avoid it?
A: A class that holds most of the data and logic of the system, so every change touches it. Avoid it by giving entities their own behavior and keeping service classes thin coordinators of use cases.

## lld.method.defining-relationships-and-class-diagrams
name: "Defining relationships and class diagrams"
importance: must
prereqs: [lld.method.identifying-entities]
scope: "associations, composition, interfaces"

### simple
After finding the classes, you decide how they connect: which object owns another, which one only knows about another, and which ones share a common interface. It is like drawing a family tree and a company chart at once. A quick diagram of these links lets the interviewer check your design before you write code.

### interview
- **Composition**: the whole owns the part and the part dies with it (a floor owns its spots). In C++, a member by value or a `unique_ptr`.
- **Aggregation**: the whole has a part that lives on without it (a car has a driver). A non-owning pointer or reference.
- **Association**: one object knows another to call it or look it up (a ticket refers to a vehicle); prefer ids or one-way pointers.
- **Dependency**: a class uses another only inside a method (a parameter); **realization**: a class implements an interface (an abstract class with pure virtual functions); **inheritance**: is-a.
- Add **multiplicity** (1, 0..1, *, 1..*) and **direction**: most associations should be one-way.
- Prefer **interfaces at the points that vary** and composition over inheritance for reuse.
- In interviews a text diagram of five to ten classes is enough; notation matters less than clearly showing ownership and the interfaces.

### deep
#### The text notation used in this subject

UML boxes and arrows (see [UML class diagrams](#/concept/oop.relationships.uml-class-diagrams)) are hard to draw in a text editor, so the designs in this subject use a compact notation in the style of PlantUML:

```text
Car *-- Engine               composition: the car owns its engine; it dies with the car
Car o-- Driver               aggregation: the car has a driver, who lives on without it
Trip --> Rider               association: a trip knows its rider (pointer or id)
Car ..> PricingStrategy      dependency: used inside one method only
PerKm ..|> PricingStrategy   realization: PerKm implements the interface
ElectricCar --|> Car         inheritance: an electric car is a car
Lot "1" *-- "1..*" Floor     multiplicity at each end
```

#### Choosing the relationship

| question | answer | relationship | C++ |
|---|---|---|---|
| Does B exist without A? | no | composition | member by value, `unique_ptr<B>`, `vector<B>` |
| Does A hold B for a long time without owning it? | yes | aggregation or association | `B*`, `B&`, or B's id |
| Does A use B only during one call? | yes | dependency | a parameter `const B&` |
| Are there several interchangeable kinds of B? | yes | realization | abstract class with pure virtuals |
| Is A a special kind of B, usable wherever B is? | yes | inheritance | `class A : public B` |

Two tests guard against misuse. Inheritance must pass [Liskov substitution](#/concept/oop.principles.liskov-substitution-principle): every place that takes a `Car` must work with an `ElectricCar`. And ownership must be single: exactly one object is responsible for destroying each part.

#### Worked example: the lifetimes in code

```cpp
struct Engine { ~Engine() { cout << "engine destroyed\n"; } };
struct Driver {
    string name;
    ~Driver() { cout << name << " destroyed\n"; }
};

struct PricingStrategy {                          // an interface
    virtual ~PricingStrategy() = default;
    virtual int fare(int km) const = 0;
};
struct PerKm : PricingStrategy {                  // realization
    int fare(int km) const override { return 12 * km; }
};

class Car {
    Engine engine;                                // composition: same lifetime as the car
    Driver* driver = nullptr;                     // aggregation: not owned
public:
    void assign(Driver& d) { driver = &d; }
    int quote(const PricingStrategy& p, int km) const { return p.fare(km); }  // dependency
    ~Car() { cout << "car destroyed\n"; }
};

int main() {
    Driver meera{"meera"};
    {
        Car car;
        car.assign(meera);
        cout << "fare for 5 km: " << car.quote(PerKm{}, 5) << "\n";
    }                                             // car and its engine end here
    cout << meera.name << " is still here\n";
}
```

Output:

```text
fare for 5 km: 60
car destroyed
engine destroyed
meera is still here
meera destroyed
```

The destructor body runs first, then members are destroyed, which is why "car destroyed" prints before "engine destroyed". The driver outlives the car because the car never owned the driver.

#### Drawing a design

For a parking lot, the diagram an interviewer wants to see:

```text
ParkingLot "1" *-- "1..*" Floor
Floor "1" *-- "*" Spot
ParkingLot --> SpotPicker            <<interface>>
ParkingLot --> PricingStrategy       <<interface>>
SmallestFit ..|> SpotPicker
HourlyByType ..|> PricingStrategy
ParkingLot "1" *-- "*" Ticket
Ticket --> Spot
Ticket --> Vehicle                   (value: plate and type)
```

Read it aloud: the lot owns floors, floors own spots, and the lot owns tickets; each ticket refers to a spot and a vehicle. Two interfaces mark the parts expected to change.

#### Pitfalls

- **Bidirectional links everywhere**: `Spot` pointing back to `Ticket` and `Ticket` to `Spot` doubles the bookkeeping. Keep one direction and look up the other through the owner.
- **`shared_ptr` by default**: it hides who owns what, and cycles of `shared_ptr` leak. Use it only when ownership is truly shared.
- **Inheritance for code reuse**: a `Truck` that inherits from `ParkingSpot` to reuse a size field. Use [composition over inheritance](#/concept/oop.relationships.composition-over-inheritance).

Connects to: [association, aggregation and composition](#/concept/oop.relationships.association-aggregation-and-composition), [abstract class vs interface](#/concept/oop.pillars.abstract-class-vs-interface), [designing APIs and methods](#/concept/lld.method.designing-apis-and-methods).

### questions
Q: What is the difference between composition and aggregation?
A: In composition the whole owns the part and the part is destroyed with it, like a floor and its spots; in C++ the part is a member by value or a unique_ptr. In aggregation the whole holds a part that can outlive it, like a car and its driver, usually through a non-owning pointer or reference.

Q: How do you represent an interface in C++?
A: With an abstract class that has only pure virtual functions and a virtual destructor. Implementations derive from it publicly and override every function, and clients hold a reference or pointer to the interface.

Q: Why should most associations be one-way?
A: Two-way links must be kept in sync on every change, which adds code and bugs, and pointer cycles complicate ownership. Keep one direction and find the other through the owning object or a lookup map.

Q: When is inheritance the right relationship?
A: When the subclass truly is a kind of the base class and can be used anywhere the base is expected without surprises, which is the Liskov substitution principle. Reusing code alone is not a reason; use composition for that.

Q: What should a class diagram in an LLD interview show?
A: The five to ten main classes, who owns whom, the direction of associations with multiplicity, and the interfaces placed where behavior varies. Fields and methods only where they explain a decision.

## lld.method.designing-apis-and-methods
name: "Designing APIs and methods"
importance: must
prereqs: [lld.method.defining-relationships-and-class-diagrams]
scope: "signatures, responsibilities, validation"

### simple
A class's public methods are its promises to the rest of the program, so each one should be easy to use correctly and hard to misuse. A good method is like a well-labeled machine button: its name says what happens, it only accepts sensible inputs, and it tells you clearly when it cannot do its job.

### interview
- **Name by intent**: verbs for commands that change state (`hold`, `cancel`), nouns or questions for queries (`total`, `isFree`); keep queries `const` and free of side effects (command-query separation).
- **Use domain types, not raw strings and ints**: `enum class VehicleType`, a `Money` value in the smallest unit (paise, cents), strong ids. Never use `double` for money.
- **Report failure explicitly**: a result type (`optional`, `variant` of value and error, or C++23 `expected`) for expected failures such as "seat taken"; exceptions for broken preconditions and bugs. Pick one convention and keep it.
- **Validate at the boundary**: public methods check inputs; constructors establish invariants so an object is never half-valid; inside, trust the types.
- **All or nothing**: validate everything before changing anything, so a failed call leaves no partial state.
- Keep methods small with one responsibility; avoid boolean flag parameters (`book(seats, true)`); prefer "tell, don't ask".

### deep
#### Intuition

Most bugs in machine-coding rounds come from the seams: a caller passes seat "Z9" that doesn't exist, money is added as floating point, or a booking half-succeeds. A careful API makes these mistakes either impossible (types) or loud (validation and clear errors).

#### A checklist for each public method

1. **Who calls it and why?** The name should read naturally at the call site: `show.hold(user, seats)`.
2. **What can go wrong that the caller must handle?** Make those outcomes part of the return type.
3. **What must always be true?** Check it once on entry; after that the object stays valid.
4. **Does it change state?** Then it is a command; make every query `const`.

#### Worked example: holding seats for a show

```cpp
struct Money {                                  // a value type: whole paise, never double
    long long paise = 0;
    static Money rupees(long long r) { return {r * 100}; }
    Money times(long long n) const { return {paise * n}; }
    string str() const {
        return "Rs " + to_string(paise / 100) + "." + (paise % 100 < 10 ? "0" : "") +
               to_string(paise % 100);
    }
};

enum class HoldError { NoSeats, TooMany, NoSuchSeat, Taken };
string describe(HoldError e) {
    switch (e) {
        case HoldError::NoSeats: return "choose at least one seat";
        case HoldError::TooMany: return "at most 6 seats per booking";
        case HoldError::NoSuchSeat: return "no such seat";
        case HoldError::Taken: return "seat already taken";
    }
    return "";
}

class Show {
    set<string> seats;
    map<string, string> heldBy;                 // seat -> user
    Money price;
public:
    Show(set<string> s, Money p) : seats(std::move(s)), price(p) {
        if (seats.empty() || price.paise <= 0)  // invariant: never a half-valid show
            throw invalid_argument("a show needs seats and a positive price");
    }
    bool isFree(const string& seat) const {    // query: const, no side effects
        return seats.count(seat) && !heldBy.count(seat);
    }
    variant<Money, HoldError> hold(const string& user, const vector<string>& wanted) {
        if (wanted.empty()) return HoldError::NoSeats;
        if (wanted.size() > 6) return HoldError::TooMany;
        for (const auto& s : wanted) {          // validate everything first...
            if (!seats.count(s)) return HoldError::NoSuchSeat;
            if (heldBy.count(s)) return HoldError::Taken;
        }
        for (const auto& s : wanted) heldBy[s] = user;  // ...then change state
        return price.times(wanted.size());
    }
};

int main() {
    Show show({"A1", "A2", "A3"}, Money{24950});
    auto report = [](const variant<Money, HoldError>& r) {
        if (auto m = get_if<Money>(&r)) return "held, pay " + m->str();
        return "refused: " + describe(get<HoldError>(r));
    };
    cout << report(show.hold("asha", {"A1", "A2"})) << "\n";
    cout << report(show.hold("ravi", {"A3", "B7"})) << "\n";
    cout << "A3 still free: " << boolalpha << show.isFree("A3") << "\n";
    cout << report(show.hold("ravi", {"A2"})) << "\n";
    try {
        Show broken({}, Money::rupees(100));
    } catch (const invalid_argument& e) {
        cout << "constructor: " << e.what() << "\n";
    }
}
```

Output:

```text
held, pay Rs 499.00
refused: no such seat
A3 still free: true
refused: seat already taken
constructor: a show needs seats and a positive price
```

Notice the third line: Ravi's request for A3 and B7 failed on B7, and A3 was not left held, because nothing changes until every seat is validated. The two kinds of failure are handled differently on purpose: a taken seat is a normal outcome the caller must handle (a result), while a show with no seats is a programming error (an exception).

#### Responsibilities

A method should do one thing at one level of detail ([single responsibility](#/concept/oop.principles.single-responsibility-principle)). "Tell, don't ask": call `show.hold(...)` rather than reading `show.heldBy` and deciding outside, which would spread the booking rule across callers and break [encapsulation](#/concept/oop.pillars.encapsulation). Avoid reaching through objects (`lot.floor(2).spot(5).ticket().vehicle()`), which the [Law of Demeter](#/concept/oop.principles.law-of-demeter) warns about.

#### Pitfalls

- `bool` returns that hide why something failed; the caller cannot show a useful message.
- Boolean flags: `book(seats, true, false)` is unreadable; use an enum or two methods.
- Validating deep inside helpers instead of at the public entry point, so some paths skip it.
- Partial updates on failure; always validate first, then mutate.
- `double` for money: `0.1 + 0.2 != 0.3`.

Connects to: [exceptions vs error codes](#/concept/oop.errors.exceptions-vs-error-codes), [defensive programming](#/concept/oop.errors.defensive-programming), [applying design patterns](#/concept/lld.method.applying-design-patterns).

### questions
Q: How should a method report an expected failure such as a seat already being taken?
A: Make the failure part of the return type, for example an optional, a variant of the result and an error enum, or expected in C++23, so the caller must handle it and can show a precise message. Reserve exceptions for broken preconditions and bugs, and keep one convention across the design.

Q: Why should money never be stored as a double?
A: Binary floating point cannot represent most decimal fractions exactly, so sums drift and comparisons fail, such as 0.1 plus 0.2 not equaling 0.3. Store whole smallest units such as paise or cents in a 64-bit integer, usually inside a small value type.

Q: What does all-or-nothing mean for a method like holding several seats?
A: The method validates every input before it changes any state, so a failure leaves the object exactly as it was. Otherwise a request that fails on its third seat could leave the first two held.

Q: What is command-query separation?
A: Methods either change state and return little (commands), or return information without changing anything (queries). In C++ queries are marked const, which lets callers read state freely and keeps side effects easy to find.

Q: Where should input validation happen in a class design?
A: At the boundary: public methods check their arguments and constructors establish the class invariants, so an object can never exist in an invalid state. Inside the class, code can then trust its own fields and the types it receives.

## lld.method.applying-design-patterns
name: "Applying design patterns"
importance: must
prereqs: [lld.method.designing-apis-and-methods]
scope: "where strategy, factory, observer and state fit"

### simple
Design patterns are proven shapes for common design problems, and in an LLD round the skill is spotting which requirement calls for which shape. It is like a carpenter who hears "this shelf must fold away" and reaches for a hinge. You add a pattern where the requirements say something will vary or react, not everywhere.

### interview
- **Strategy**: "the rule may change" or "several algorithms" (pricing, spot assignment, matching, eviction). An interface plus implementations, chosen by configuration.
- **Factory**: "create one of several kinds from input" (a vehicle from a type string, a channel from a config). Keeps `new` and `switch` in one place.
- **Observer**: "notify these parties when that happens" (order status to customer, restaurant and courier). Publishers don't know their listeners' concrete types.
- **State**: "what you may do depends on the current status" (vending machine, ATM, order, elevator). Each state is a class, or a transition table when states hold little logic.
- Others that show up: decorator (add-ons such as toppings or taxes), chain of responsibility (handlers in order: log levels, cash denominations), command (undo, queues of requests), composite (file trees), builder (many optional fields).
- Name the requirement that motivates each pattern; a pattern with no reason behind it is over-engineering.

### deep
#### Mapping cues to patterns

| cue in the requirements | pattern | classic uses |
|---|---|---|
| "pricing will change", "support several algorithms" | [strategy](#/concept/oop.patterns-behavioral.strategy) | pricing, rate limit algorithms, eviction, driver matching |
| "created from a type or a config value" | [factory method](#/concept/oop.patterns-creational.factory-method) | vehicles, notification channels, payment methods |
| "tell X, Y and Z when this happens" | [observer](#/concept/oop.patterns-behavioral.observer) | order updates, stock alerts, pub-sub |
| "allowed actions depend on the status" | [state](#/concept/oop.patterns-behavioral.state) | vending machine, ATM, order and trip lifecycles |
| "extra features stack on a base" | [decorator](#/concept/oop.patterns-structural.decorator) | add-ons, logging, compression |
| "pass along until someone handles it" | [chain of responsibility](#/concept/oop.patterns-behavioral.chain-of-responsibility) | log levels, cash dispensing, approvals |
| "undo" or "queue requests" | [command](#/concept/oop.patterns-behavioral.command) | editors, task schedulers |

#### Worked example: an order with all four

Requirements: the discount rule changes during festivals (strategy); SMS and email listeners are chosen by configuration (factory); both hear about every status change (observer); an order can only ship after payment, and a shipped order cannot be cancelled (state).

```cpp
struct Pricing {                                            // strategy
    virtual ~Pricing() = default;
    virtual long long total(long long subtotal) const = 0;
};
struct Regular : Pricing { long long total(long long s) const override { return s; } };
struct Festive : Pricing { long long total(long long s) const override { return s * 9 / 10; } };

struct OrderListener {                                      // observer
    virtual ~OrderListener() = default;
    virtual void onStatus(int orderId, const string& status) = 0;
};
struct Sms : OrderListener {
    void onStatus(int id, const string& s) override {
        cout << "sms: order " << id << " " << s << "\n";
    }
};
struct Email : OrderListener {
    void onStatus(int id, const string& s) override {
        cout << "email: order " << id << " " << s << "\n";
    }
};
unique_ptr<OrderListener> makeListener(const string& channel) {   // factory
    if (channel == "sms") return make_unique<Sms>();
    if (channel == "email") return make_unique<Email>();
    throw invalid_argument("unknown channel " + channel);
}

struct OrderState {                                         // state
    virtual ~OrderState() = default;
    virtual string name() const = 0;
    virtual unique_ptr<OrderState> on(const string& event) const = 0;  // nullptr: refused
};
struct Shipped : OrderState {
    string name() const override { return "shipped"; }
    unique_ptr<OrderState> on(const string&) const override { return nullptr; }
};
struct Cancelled : OrderState {
    string name() const override { return "cancelled"; }
    unique_ptr<OrderState> on(const string&) const override { return nullptr; }
};
struct Paid : OrderState {
    string name() const override { return "paid"; }
    unique_ptr<OrderState> on(const string& e) const override {
        if (e == "ship") return make_unique<Shipped>();
        if (e == "cancel") return make_unique<Cancelled>();
        return nullptr;
    }
};
struct Placed : OrderState {
    string name() const override { return "placed"; }
    unique_ptr<OrderState> on(const string& e) const override {
        if (e == "pay") return make_unique<Paid>();
        if (e == "cancel") return make_unique<Cancelled>();
        return nullptr;
    }
};

class Order {
    int id;
    long long subtotal;
    const Pricing& pricing;
    unique_ptr<OrderState> state = make_unique<Placed>();
    vector<OrderListener*> listeners;
public:
    Order(int id, long long subtotal, const Pricing& p) : id(id), subtotal(subtotal), pricing(p) {}
    void subscribe(OrderListener& l) { listeners.push_back(&l); }
    long long total() const { return pricing.total(subtotal); }
    bool apply(const string& event) {
        auto next = state->on(event);
        if (!next) {
            cout << event << " refused while " << state->name() << "\n";
            return false;
        }
        state = std::move(next);
        for (auto* l : listeners) l->onStatus(id, state->name());
        return true;
    }
};

int main() {
    Festive festive;
    Order order(7, 2000, festive);
    vector<unique_ptr<OrderListener>> listeners;
    for (string channel : {"sms", "email"}) {
        listeners.push_back(makeListener(channel));
        order.subscribe(*listeners.back());
    }
    cout << "total " << order.total() << "\n";
    order.apply("ship");
    order.apply("pay");
    order.apply("ship");
    order.apply("cancel");
}
```

Output:

```text
total 1800
ship refused while placed
sms: order 7 paid
email: order 7 paid
sms: order 7 shipped
email: order 7 shipped
cancel refused while shipped
```

Each pattern answers one sentence of the requirements. A new "weekend" discount is a new `Pricing` class; a WhatsApp listener is one class and one factory line; a "returned" status is one state class plus one transition. No existing class body changes, which is the [open-closed principle](#/concept/oop.principles.open-closed-principle) at work.

#### When not to use a pattern

- Only one pricing rule and no hint of change: a plain function is clearer than an interface.
- Two statuses with no rules: an `enum` and an `if` beat four state classes.
- Singletons for services: they hide dependencies and make tests hard; pass objects in instead ([dependency inversion](#/concept/oop.principles.dependency-inversion-principle)).

Connects to: [extensibility and testing](#/concept/lld.method.extensibility-and-testing), [vending machine](#/concept/lld.classics.vending-machine), [notification service](#/concept/lld.classics.notification-service).

### questions
Q: How do you decide which design pattern to use in an LLD round?
A: Start from the requirement, not the pattern: a rule that may change suggests strategy, creating one of several kinds from input suggests a factory, several parties reacting to an event suggests observer, and actions that depend on the current status suggest state. Say which requirement motivates each pattern.

Q: Where does the strategy pattern appear in classic LLD problems?
A: Wherever an algorithm or rule is expected to vary: pricing in a parking lot, dispatch in an elevator system, driver matching and fares in ride sharing, eviction in a cache, and the algorithm in a rate limiter. Each is an interface with implementations chosen by configuration.

Q: What is the difference between using the state pattern and an enum with a switch?
A: The state pattern puts each state's rules in its own class, so adding a state or changing one state's behavior touches one place. An enum with switch statements is simpler for a few states with little logic, but the rules spread across every method that switches on the state.

Q: Why is a singleton usually a poor choice for services in LLD?
A: A singleton is global state reached from anywhere, which hides dependencies, couples classes to one concrete object, and makes it hard to substitute fakes in tests. Creating the service once and passing it into constructors gives the same single instance without those costs.

Q: How can you show the interviewer that your design is extensible?
A: Walk through a likely change, such as a new discount or notification channel, and show that it needs one new class and perhaps one line in a factory, with no edits to existing classes. That demonstrates the open-closed principle concretely.

## lld.method.handling-concurrency-in-lld
name: "Handling concurrency in LLD"
importance: important
scope: "locks around shared state, thread-safe booking"

### simple
When many people use a system at once, two of them can grab the same seat or the same parking spot in the same instant. Handling concurrency means finding the shared things and making each check-then-take step happen as one uninterrupted action. It is like a ticket counter with one clerk per show: people may queue, but no seat is sold twice.

### interview
- Find the **shared mutable state**: seats, spots, stock, balances, driver availability. Everything else (value objects, per-request data) needs no locking.
- The classic bug is **check-then-act**: "is the seat free?" then "take it" as two steps lets two threads both see it free. Do both under one lock or with one atomic operation.
- **Granularity**: one lock per service is simple and correct; a lock per show, per floor or per key allows more parallelism. Start coarse, refine if asked.
- **Several locks**: take them together with `std::scoped_lock` or in a fixed global order (by id) to avoid deadlock.
- Keep slow work (payment calls, I/O) **outside** locks: hold the seat briefly, release the lock, pay, then confirm or release the hold.
- Alternatives: optimistic concurrency with a version number (compare and swap), atomic counters for simple quotas, one thread owning the state and receiving requests through a queue.

### deep
#### Intuition

Concurrency questions in LLD are rarely about fancy lock-free code. The interviewer wants to hear which objects are shared, where the critical section is, and why your choice cannot double-book. The theory lives in [data races vs race conditions](#/concept/conc.basics.data-races-vs-race-conditions) and [mutexes and lock guards](#/concept/conc.locks.mutexes-and-lock-guards); here is how it lands in a design.

#### Worked example: eight users race for the same two seats

```cpp
class Show {
    mutable mutex m;
    map<string, int> holder;                    // seat -> user id
    friend bool moveHold(Show&, Show&, const string&, int);
public:
    bool tryHold(const vector<string>& seats, int user) {
        lock_guard lock(m);                     // check and act as one step
        for (const auto& s : seats)
            if (holder.count(s)) return false;
        for (const auto& s : seats) holder[s] = user;
        return true;
    }
    int holderOf(const string& seat) const {
        lock_guard lock(m);
        auto it = holder.find(seat);
        return it == holder.end() ? 0 : it->second;
    }
};

// Moving a hold between shows touches two locks: take both at once.
bool moveHold(Show& from, Show& to, const string& seat, int user) {
    scoped_lock both(from.m, to.m);             // no deadlock, whatever the order of arguments
    auto it = from.holder.find(seat);
    if (it == from.holder.end() || it->second != user || to.holder.count(seat)) return false;
    from.holder.erase(it);
    to.holder[seat] = user;
    return true;
}

int main() {
    Show evening;
    const int users = 8;
    latch start(users);
    atomic<int> winners = 0;
    {
        vector<jthread> threads;
        for (int u = 1; u <= users; ++u)
            threads.emplace_back([&, u] {
                start.arrive_and_wait();        // everyone tries at the same moment
                if (evening.tryHold({"A1", "A2"}, u)) ++winners;
            });
    }                                           // jthreads join here
    int a1 = evening.holderOf("A1"), a2 = evening.holderOf("A2");
    cout << "winners: " << winners << "\n";
    cout << "both seats held by the winner: " << boolalpha << (a1 == a2 && a1 != 0) << "\n";

    // Two threads move holds in opposite directions many times.
    Show late;
    evening.tryHold({"C1"}, 100);
    late.tryHold({"D1"}, 200);
    {
        jthread a([&] {
            for (int i = 0; i < 20000; ++i) {
                moveHold(evening, late, "C1", 100);
                moveHold(late, evening, "C1", 100);
            }
        });
        jthread b([&] {
            for (int i = 0; i < 20000; ++i) {
                moveHold(late, evening, "D1", 200);
                moveHold(evening, late, "D1", 200);
            }
        });
    }
    cout << "C1 back in evening: " << (evening.holderOf("C1") == 100) << "\n";
    cout << "D1 back in late: " << (late.holderOf("D1") == 200) << "\n";
}
```

Output:

```text
winners: 1
both seats held by the winner: true
C1 back in evening: true
D1 back in late: true
```

The latch makes all eight threads call `tryHold` together, which is exactly when a check-then-act bug would double-book; with the lock, exactly one wins every time. The second part is the classic deadlock setup (thread `a` locks evening then late while `b` locks late then evening); `std::scoped_lock` acquires both mutexes with a deadlock-avoidance algorithm, so it finishes. This program was run 30 times under GCC's ThreadSanitizer, 20 times under clang's, and 30 times at -O2 after an AddressSanitizer and UBSan run: no reports and the same output every time.

#### Choosing granularity

| approach | parallelism | risk | use when |
|---|---|---|---|
| one mutex for the whole service | low | simplest, hard to get wrong | interview default, small systems |
| a mutex per entity (show, floor, key) | high | operations on two entities need two locks | contention on one big lock |
| read-write lock | many readers | writer starvation if misused | reads far outnumber writes (availability views) |
| optimistic version check | high | retries under contention | rare conflicts, state in a database |
| a single owner thread with a queue | serialised, no locks | queue becomes the bottleneck | event loops, matching engines |

#### Slow work outside the lock

Booking with payment follows three steps: (1) under the lock, mark seats "held by user until time T"; (2) without any lock, call the payment gateway; (3) under the lock, turn the hold into a booking, or release it if payment failed or T passed. Holding a mutex during a network call would block every other customer of the show for seconds.

#### Pitfalls

- Locking inside `isFree` and again inside `take` still leaves a gap between them; the whole check-then-act must be one critical section.
- Returning references to internal maps lets callers read without the lock.
- Calling listeners (observers) while holding a lock invites deadlock if a listener calls back in; copy what you need, unlock, then notify.

Connects to: [avoiding deadlocks in code](#/concept/conc.locks.avoiding-deadlocks-in-code), [thread safety](#/concept/conc.basics.thread-safety), [movie ticket booking](#/concept/lld.classics.movie-ticket-booking), [parking lot](#/concept/lld.classics.parking-lot).

### questions
Q: What is the check-then-act problem in a booking system?
A: Checking whether a seat is free and then taking it as two separate steps lets two threads both see it free and both take it. The fix is to make the check and the update one critical section under a lock, or one atomic operation such as a conditional update.

Q: How do you pick lock granularity in an LLD design?
A: Start with one lock around the service's shared state, which is simple and clearly correct, then refine to a lock per show, floor or key if contention matters. Finer locks allow more parallelism but operations that span two entities then need both locks.

Q: How do you avoid deadlock when an operation needs two locks?
A: Acquire them together with std::scoped_lock, which uses a deadlock-avoidance algorithm, or always acquire locks in a fixed global order, such as by entity id. Never hold one lock while waiting for another in an arbitrary order.

Q: Why should a payment call not happen while holding the booking lock?
A: A network call can take seconds, and holding the lock that long blocks every other customer of that show. Instead, hold the seats with an expiry under the lock, release it, call the payment service, and then confirm or release the hold under the lock again.

## lld.method.extensibility-and-testing
name: "Extensibility and testing"
importance: important
prereqs: [lld.method.applying-design-patterns]
scope: "adding features without rewrites, unit-testable design"

### simple
A good design lets you add a feature by adding a new piece rather than rewriting old ones, and lets you check each piece on its own. It is like a power strip: you plug in a new lamp without rewiring the house, and you can test the lamp in any socket. The same seams that make code easy to extend also make it easy to test.

### interview
- Put **interfaces at the points of change** you identified in the requirements (pricing, notification channel, matching), so new behavior is a new class ([open-closed principle](#/concept/oop.principles.open-closed-principle)).
- **Inject dependencies** through constructors: the clock, random numbers, id generators, payment gateways and repositories. No hidden globals, singletons or direct calls to the system time inside business logic.
- **Unit tests** then use fakes: a fake clock set to a chosen day, a payment gateway that always fails, an in-memory repository.
- Keep **business rules pure** where possible (inputs in, result out); push I/O to the edges.
- Show extensibility in the interview by walking through a likely change and pointing to the one new class it needs.
- Pitfalls: `time(nullptr)` or `rand()` inside logic, static state shared between tests, and interfaces added "just in case" with a single implementation forever.

### deep
#### Two properties, one technique

A class is hard to extend when it hard-codes a decision, and hard to test when it hard-codes a dependency. Both are fixed the same way: depend on an interface and receive the concrete object from outside ([dependency inversion](#/concept/oop.principles.dependency-inversion-principle)).

#### Worked example: library fines

The first version charges 10 rupees per late day. The owner then asks for a cap of 100 rupees for students. And the tests must not depend on today's date.

```cpp
struct Clock {                                   // time comes from outside
    virtual ~Clock() = default;
    virtual int today() const = 0;               // a day number
};
struct FinePolicy {                              // the rule that changes
    virtual ~FinePolicy() = default;
    virtual int fine(int daysLate) const = 0;
};
struct PerDay : FinePolicy {
    int rate;
    explicit PerDay(int r) : rate(r) {}
    int fine(int daysLate) const override { return daysLate * rate; }
};
struct Capped : FinePolicy {                     // added later: a new class, no edits
    int rate, cap;
    Capped(int r, int c) : rate(r), cap(c) {}
    int fine(int daysLate) const override { return min(daysLate * rate, cap); }
};

class ReturnDesk {
    const Clock& clock;
    const FinePolicy& policy;
public:
    ReturnDesk(const Clock& c, const FinePolicy& p) : clock(c), policy(p) {}
    int checkIn(int dueDay) const { return policy.fine(max(0, clock.today() - dueDay)); }
};

// Test doubles and a tiny test runner.
struct FakeClock : Clock {
    int day = 0;
    int today() const override { return day; }
};

int failures = 0, passed = 0;
void check(bool ok, const string& name) {
    if (ok) ++passed;
    else { ++failures; cout << "FAILED: " << name << "\n"; }
}

void onTimeIsFree() {
    FakeClock clock; clock.day = 10;
    PerDay rule(10);
    check(ReturnDesk(clock, rule).checkIn(12) == 0, "early return costs nothing");
    check(ReturnDesk(clock, rule).checkIn(10) == 0, "return on the due day is free");
}
void lateReturnsPayPerDay() {
    FakeClock clock; clock.day = 18;
    PerDay rule(10);
    check(ReturnDesk(clock, rule).checkIn(15) == 30, "3 days late at 10 a day");
}
void studentFinesAreCapped() {
    FakeClock clock; clock.day = 40;
    Capped rule(10, 100);
    check(ReturnDesk(clock, rule).checkIn(15) == 100, "25 days late, capped at 100");
    clock.day = 20;
    check(ReturnDesk(clock, rule).checkIn(15) == 50, "below the cap, normal rate");
}

int main() {
    onTimeIsFree();
    lateReturnsPayPerDay();
    studentFinesAreCapped();
    cout << passed << " checks passed, " << failures << " failed\n";
}
```

Output:

```text
5 checks passed, 0 failed
```

Every test runs in microseconds, needs no waiting for real days to pass, and states its scenario in one line. Adding `Capped` touched no existing class: `ReturnDesk` only knows the `FinePolicy` interface.

#### Seams worth injecting

| dependency | why inject it | fake in tests |
|---|---|---|
| clock | expiry, fines, schedules depend on "now" | a settable day or time |
| randomness | dice, shuffles, sampling | a fixed sequence |
| id generator | tickets, bookings | 1, 2, 3, ... |
| payment gateway, SMS provider | slow, external, can fail | always succeeds, always fails, fails once |
| repository | storage may become a database | an in-memory map |

#### Walking through a change in the interview

"Suppose weekend pricing arrives. `ParkingLot` depends on `PricingStrategy`, so I add `WeekendPricing` and choose it in the factory; `ParkingLot`, `Ticket` and the tests of the other strategies do not change." One sentence like this, pointing at the diagram, is stronger than a paragraph about SOLID.

#### Pitfalls

- An interface for everything: if a rule has one implementation and no hint of change, a plain class is fine ([DRY, KISS and YAGNI](#/concept/oop.principles.dry-kiss-and-yagni)).
- Tests that pass only on some dates, because logic read the real clock.
- A static registry shared between tests, so the order of tests changes results.

Connects to: [applying design patterns](#/concept/lld.method.applying-design-patterns), [machine coding round strategy](#/concept/lld.method.machine-coding-round-strategy), [library management](#/concept/lld.classics.library-management).

### questions
Q: How do you make business logic that depends on the current time testable?
A: Inject a clock interface through the constructor instead of reading the system time inside the logic. Production code passes a real clock, and tests pass a fake clock set to any day, so expiry and fine rules can be checked instantly and deterministically.

Q: What does it mean to add a feature without a rewrite?
A: The design has interfaces at the points of change, so a new pricing rule, channel or policy is a new class that implements the interface, plus perhaps one line where objects are created. Existing classes and their tests stay untouched, which is the open-closed principle.

Q: Which dependencies should you inject in an LLD design?
A: Anything slow, external, random or time-dependent: clocks, random number sources, id generators, payment and messaging providers, and storage repositories. Injecting them lets tests replace each with a simple fake.

Q: Can a design have too many interfaces?
A: Yes. An interface with one implementation and no expected change adds indirection without benefit. Add interfaces where the requirements suggest variation or where a dependency must be faked in tests.

## lld.method.machine-coding-round-strategy
name: "Machine coding round strategy"
importance: important
scope: "working code first, clean structure, demo flow"

### simple
A machine coding round asks you to build a small working program, such as a parking lot or a splitting app, in about 60 to 120 minutes. The winning approach is to get a simple version running early and then improve it, like building a bicycle before dreaming of a car. Interviewers grade working code, clear structure and a demo that shows the features.

### interview
- **Timeline** (90 minutes): 10 requirements and entities, 5 to 10 class sketch, 50 core code, 10 demo and edge cases, 10 extensions and cleanup. Compile every few minutes.
- **Working first**: in-memory maps, a driver `main` that runs the scenario from the prompt, no UI or database unless asked.
- **Structure**: models (entities and value types), strategies (the parts that vary), services (use cases, validation, locking), repositories (storage), and the demo driver. Separate files or clearly separated sections.
- **Clean code signals**: meaningful names, enums instead of strings, small methods, consistent error handling, no duplicated logic, constants instead of magic numbers.
- **Demo flow**: print readable steps that exercise every requirement, including failures (full lot, invalid input).
- If time runs short, say what you would do next rather than leaving half-written code that doesn't compile.

### deep
#### How these rounds are graded

Rubrics usually cover: does it run and do what was asked (the biggest weight), is it structured so a new feature fits, is it readable, are edge cases handled, and can you explain your choices. A beautiful design that doesn't compile scores worse than a plain one that runs.

#### A layout that scales with the problem

```text
models       Vehicle, Spot, Ticket, Money         data plus invariants
strategies   PricingStrategy, SpotPicker          interfaces and implementations
repository   InMemoryRepository<T>                storage behind a small interface
services     ParkingService                       use cases, validation, locking
main         demo of the prompt's scenario        prints each step and result
```

In a single-file C++ solution, keep the same order top to bottom. A generic repository keeps storage out of the services and makes a later switch to a database a local change:

```cpp
template <class T>
class InMemoryRepository {                       // id -> entity; swap for a DB later
    map<int, T> items;
    int nextId = 1;
public:
    int add(T item) { items.emplace(nextId, std::move(item)); return nextId++; }
    T* find(int id) {
        auto it = items.find(id);
        return it == items.end() ? nullptr : &it->second;
    }
    bool remove(int id) { return items.erase(id) > 0; }
    size_t size() const { return items.size(); }
};

struct Ticket { string plate; int spot; };

class ParkingService {
    InMemoryRepository<Ticket> tickets;
    set<int> freeSpots{1, 2};
public:
    optional<int> enter(const string& plate) {   // returns a ticket id
        if (freeSpots.empty()) return nullopt;
        int spot = *freeSpots.begin();
        freeSpots.erase(freeSpots.begin());
        return tickets.add({plate, spot});
    }
    bool exit(int ticketId) {
        Ticket* t = tickets.find(ticketId);
        if (!t) return false;                    // unknown or already used ticket
        freeSpots.insert(t->spot);
        return tickets.remove(ticketId);
    }
};

void step(const string& what, const string& result) {
    cout << "- " << what << ": " << result << "\n";
}

int main() {
    ParkingService lot;
    auto name = [](optional<int> t) { return t ? "ticket " + to_string(*t) : string("lot full"); };
    auto t1 = lot.enter("KA01");
    step("KA01 enters", name(t1));
    step("KA02 enters", name(lot.enter("KA02")));
    step("KA03 enters", name(lot.enter("KA03")));
    step("KA01 exits", lot.exit(*t1) ? "ok" : "rejected");
    step("KA01 exits again", lot.exit(*t1) ? "ok" : "rejected");
    step("KA03 enters", name(lot.enter("KA03")));
}
```

Output:

```text
- KA01 enters: ticket 1
- KA02 enters: ticket 2
- KA03 enters: lot full
- KA01 exits: ok
- KA01 exits again: rejected
- KA03 enters: ticket 3
```

The demo reads like the requirements and includes the failure cases, which is what an evaluator scans for. Start this skeleton in the first 20 minutes, then grow each piece: spot sizes, a pricing strategy, floors, locking.

#### A 90-minute plan

| minutes | activity | checkpoint |
|---|---|---|
| 0 to 10 | clarify, write requirements and the demo scenario | agreed list |
| 10 to 20 | entities, relationships, interfaces | quick diagram |
| 20 to 40 | models and one end-to-end flow | compiles and runs |
| 40 to 70 | remaining flows, strategies, validation | every requirement in the demo |
| 70 to 80 | edge cases, concurrency if asked | failure lines in the demo |
| 80 to 90 | tidy names, walk through an extension | explanation ready |

#### Habits that help

- Compile after every class; fix errors while the change is small.
- Hard-code configuration in `main` rather than parsing input, unless input handling is part of the task.
- Use `enum class` for kinds and statuses, and one error convention throughout.
- Leave concurrency for last unless the prompt stresses it, but mention where the locks would go.
- If a feature won't fit, stub nothing silently: say "not implemented: reservations; they would add a `Reservation` entity and a hold state on `Spot`."

Connects to: [clarifying requirements](#/concept/lld.method.clarifying-requirements), [extensibility and testing](#/concept/lld.method.extensibility-and-testing), [parking lot](#/concept/lld.classics.parking-lot).

### questions
Q: How would you split 90 minutes in a machine coding round?
A: About 10 minutes for requirements and the demo scenario, 10 for entities and interfaces, most of the time for code with one flow working end to end early, then 10 for edge cases and 10 for cleanup and explaining extensions. Compile and run continuously rather than at the end.

Q: What structure do interviewers look for in machine coding solutions?
A: Clear separation of models, the strategies that vary, services that implement use cases with validation, storage behind a repository, and a driver that demonstrates the flows. Meaningful names, enums instead of strings and consistent error handling signal clean code.

Q: Why use in-memory repositories instead of a real database?
A: The round is about object design and working code in limited time; a database adds setup and failure points without showing design skill. A small repository interface keeps storage swappable, so moving to a database later is a local change.

Q: What should the demo in main show?
A: The scenario from the prompt step by step with readable output, covering every requirement and the main failure cases such as a full lot, an invalid input or a double exit. An evaluator should be able to read it like a checklist of features.

Q: What do you do if time runs out before every feature is built?
A: Keep what exists compiling and running, and explain the missing feature precisely: which classes it would add and which interfaces it would plug into. Half-written code that breaks the build costs more than a clearly described gap.
