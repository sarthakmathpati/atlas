---
topic: oop.pillars
name: "The four pillars"
subject: oop
order: 2
prereqs: [oop.foundations]
---

## oop.pillars.encapsulation
name: "Encapsulation"
importance: must
prereqs: [oop.foundations.access-modifiers]
scope: "hiding state, getters and setters, invariants"

### simple
Encapsulation means an object keeps its data to itself and lets others change it only through its own methods. A vending machine is a good picture: you can press buttons and insert coins, but you cannot reach in and rearrange the snacks or the cash box. Because every change goes through the machine's buttons, it can make sure the rules are never broken.

### interview
- **Encapsulation** = bundling data with the member functions that operate on it **and** restricting direct access to that data (private members, public operations).
- Its purpose is protecting **invariants**: facts that must always hold, such as `balance >= 0`, a date that is always valid, or a list that stays sorted. Every member function checks or preserves them.
- Getters and setters for every member are not encapsulation by themselves. Prefer operations that express intent (`withdraw(amount)`) over raw setters (`setBalance(x)`), often summarized as "tell, don't ask".
- Do not leak mutable internals: returning a non-const reference or pointer to an internal container lets callers change it behind your back. Return a copy or a `const&`.
- Benefits: you can change the internal representation without touching callers, bugs are localized to one class, and objects are easier to use correctly.
- Encapsulation vs abstraction: encapsulation hides and protects **state**; abstraction decides which **operations** to expose.

### deep
#### Intuition

If any code anywhere can write a member, then any code anywhere can break it, and when it breaks you have to search the whole program. If only the class's own functions can write it, a broken value has at most a handful of suspects. Encapsulation shrinks the places a bug can come from.

#### Invariants

An **invariant** is a condition that is true whenever no member function of the object is running. Constructors establish it, and each public function may bend it temporarily but must restore it before returning.

Examples:

- `BankAccount`: `balance >= 0`.
- `Fraction`: denominator is positive and the fraction is in lowest terms.
- `SortedList`: elements are in non-decreasing order.

#### Worked example

A `Fraction` class keeps itself reduced, so `==` can compare members directly.

| call | numerator | denominator | why |
|---|---|---|---|
| `Fraction f(6, -8)` | -3 | 4 | the constructor moves the sign up and divides by gcd 2 |
| `f.add(Fraction(1, 4))` | -1 | 2 | -3/4 + 1/4 = -2/4, reduced |
| `f.den = 0` | - | - | does not compile: the member is private |

#### Code

```cpp
class Fraction {
    long long num, den;                 // invariant: den > 0 and gcd(|num|, den) == 1
    void normalize() {
        if (den == 0) throw invalid_argument("zero denominator");
        if (den < 0) { num = -num; den = -den; }
        long long g = gcd(llabs(num), den);
        num /= g; den /= g;
    }
public:
    Fraction(long long n, long long d) : num(n), den(d) { normalize(); }
    Fraction& add(const Fraction& o) {
        num = num * o.den + o.num * den;
        den = den * o.den;
        normalize();                    // restore the invariant before returning
        return *this;
    }
    long long numerator() const { return num; }
    long long denominator() const { return den; }
    bool operator==(const Fraction& o) const { return num == o.num && den == o.den; }
};

int main() {
    Fraction f(6, -8);
    f.add(Fraction(1, 4));
    cout << f.numerator() << "/" << f.denominator() << "\n";   // -1/2
    cout << (f == Fraction(2, -4)) << "\n";                    // 1
}
```

An even safer design returns a new `Fraction` from a `const` function `plus` instead of changing itself: then nobody can ever observe a half-updated fraction.

#### Leaking internals

```cpp
class Team {
    vector<string> members;
public:
    vector<string>& getMembers() { return members; }             // leak: callers can clear it
    const vector<string>& viewMembers() const { return members; } // read-only view
    vector<string> copyMembers() const { return members; }        // the caller's own copy
    void addMember(const string& name) { if (!name.empty()) members.push_back(name); }
};
```

A `const&` is cheap but only valid while the `Team` lives; a copy costs more but is independent.

#### Getters and setters

A setter that assigns anything is a public member with extra steps. Add a setter only when changing that value is a real operation, and validate in it. Many good classes have no setters at all (immutable value types).

#### Pitfalls

- Public members "for convenience" that later need validation.
- Returning internal containers or pointers through non-const references.
- A constructor that skips validation, so an invalid object exists from the start.
- Checking the invariant in callers instead of in the class.

Connects to: access modifiers, abstraction, immutability, single responsibility principle.

### questions
Q: What is encapsulation?
A: Encapsulation bundles an object's data with the member functions that operate on it and hides the data so it can change only through those functions. This lets the class guarantee its invariants and change its internal representation without affecting the code that uses it.

Q: What is a class invariant? Give an example.
A: An invariant is a condition that is true whenever no member function of the object is running. The constructor establishes it and every public function preserves it. For example, a bank account keeps its balance at least zero, and a fraction keeps a positive denominator in lowest terms.

Q: Do getters and setters give you encapsulation?
A: Not by themselves. A setter that assigns any value is effectively a public member. Encapsulation comes from exposing meaningful operations that validate input and keep invariants, and from not exposing a setter at all when a value should not change.

Q: How can a class accidentally break its own encapsulation?
A: By returning a non-const reference or pointer to an internal object, such as its internal vector, which lets callers change the state without going through the class's functions. Return a copy or a const reference instead.

Q: How is encapsulation different from abstraction?
A: Encapsulation is about protecting state: keeping data private and controlling how it changes. Abstraction is about design: deciding which operations to expose and hiding how they work. A well-designed class uses both.

## oop.pillars.abstraction
name: "Abstraction"
importance: must
scope: "exposing what, hiding how; abstract classes and interfaces"

### simple
Abstraction means showing what something does and hiding how it does it. When you drive, you use a steering wheel and two pedals, and you never think about fuel injection or gear ratios. A good class gives the same simple controls, so you can use it without knowing its insides.

### interview
- **Abstraction** = modeling only what matters for the caller: a small set of operations described by what they do, with the how hidden behind them.
- Tools: **interfaces** (classes with only pure virtual functions), **abstract classes** (a contract plus shared code; cannot be instantiated), templates with concepts, and simply good public functions.
- Callers depend on the abstraction (`Shape::area()`, `PaymentGateway::charge()`), so implementations can change or be swapped without touching them.
- A class is abstract when it has at least one **pure virtual** function (`virtual double area() const = 0;`); derived classes stay abstract until they override every one.
- Leaky abstractions: the hidden details sometimes show through (a `list` hides that indexing is linear; a remote call can time out). Know which details your abstraction cannot hide.
- Abstraction is a design decision (what to expose); encapsulation is the protection that keeps the rest hidden.

### deep
#### Intuition

Humans handle complexity by ignoring most of it. You call `sort(v.begin(), v.end())` without knowing it runs introsort. A `PaymentGateway` interface with `charge(amount)` lets checkout code ignore whether the money goes through one bank's API or another's. Abstraction is choosing that small surface well.

#### Levels of abstraction

1. **A function**: `sqrt(x)` hides the numerical method.
2. **A class**: `Fraction` hides the gcd bookkeeping.
3. **An interface**: `Shape` says every shape has `area()` and `name()`, with no code at all.
4. **A module or service**: a storage layer hides whether data lives in memory, a file or a database.

#### Code: an abstract base

```cpp
class Shape {                                   // abstract: cannot be instantiated
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;            // pure virtual: the "what"
    virtual string name() const = 0;
    string describe() const {                   // shared code built on the abstraction
        return name() + " with area " + to_string(area());
    }
};

class Rect : public Shape {
    double w, h;
public:
    Rect(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }   // the "how"
    string name() const override { return "rect"; }
};

class Circle : public Shape {
    double r;
public:
    explicit Circle(double r) : r(r) {}
    double area() const override { return 3.14159265358979 * r * r; }
    string name() const override { return "circle"; }
};

double totalArea(const vector<unique_ptr<Shape>>& shapes) {
    double sum = 0;
    for (const auto& s : shapes) sum += s->area();   // knows only the abstraction
    return sum;
}

int main() {
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Rect>(2, 3));
    shapes.push_back(make_unique<Circle>(1));
    cout << totalArea(shapes) << "\n";          // 9.14159
    cout << shapes[0]->describe() << "\n";      // rect with area 6.000000
    // Shape s;                                 // error: Shape is abstract
}
```

#### Worked example: swapping an implementation

`totalArea` was written against `Shape`. Adding a `Triangle` class later needs no change to `totalArea`, to `describe`, or to any caller. Only code that creates shapes learns about triangles.

| change | classes edited |
|---|---|
| add `Triangle` | only the new class (and whoever constructs it) |
| make `Circle::area` use a cached value | only `Circle` |
| add `perimeter()` to every shape | `Shape` and each derived class: widening an abstraction costs more |

The last row is the lesson: an abstraction is cheap to implement again and expensive to change, so keep it small.

#### Choosing a good abstraction

- Name operations by intent (`send(message)`), not by mechanism (`writeToSocket`).
- Keep it minimal: every function is a promise every implementation must keep.
- Do not expose implementation types in signatures (return `vector<Order>` or a range, not the internal `map` iterator).
- Accept that some abstractions leak: a remote call can fail in ways a local call cannot, so make that visible in the interface (timeouts, errors).

#### Pitfalls

- Abstracting too early: an interface with one implementation and no second in sight adds indirection without benefit.
- Giant interfaces that force implementers to stub functions (see interface segregation).
- Forgetting the virtual destructor on an abstract base.

Connects to: encapsulation, abstract class vs interface, polymorphism, dependency inversion principle.

### questions
Q: What is abstraction in object-oriented programming?
A: Abstraction is exposing only the essential operations of something and hiding how they are carried out. Callers work with a simple model, such as a Shape with an area function, and the details live in the implementations, which can change without affecting callers.

Q: How do you make a class abstract in C++?
A: Declare at least one pure virtual function with = 0. The class then cannot be instantiated, and a derived class stays abstract until it overrides every pure virtual function. A pure virtual destructor also works, but it still needs a definition.

Q: What is a leaky abstraction?
A: An abstraction whose hidden details still affect the caller. For example, a remote call looks like a local function call but can time out, and a container interface can hide whether indexing is constant or linear time. Good designs make the unavoidable details visible, such as by returning errors or documenting costs.

Q: What is the difference between abstraction and encapsulation?
A: Abstraction is the design choice of which operations to expose and how to describe them. Encapsulation is the mechanism that hides and protects the state behind those operations. Abstraction answers what the user sees, encapsulation makes sure they cannot reach past it.

Q: Why is changing an abstraction more expensive than changing an implementation?
A: Every caller and every implementation depends on the abstraction. Changing one implementation touches one class, but adding a pure virtual function to an interface forces every implementation to change, and changing a function's meaning can break every caller.

## oop.pillars.inheritance
name: "Inheritance"
importance: must
scope: "single, multilevel, hierarchical, multiple; is-a relationships"

### simple
Inheritance lets a new class start from an existing one and add or adjust what it needs. A delivery van is a kind of vehicle: it has everything a vehicle has, like wheels and an engine, plus a cargo area. Use it only when the new thing truly is a kind of the old thing.

### interview
- A **derived** class inherits the members of a **base** class and can add members or override virtual functions. With `public` inheritance it models an **is-a** relationship.
- Forms: **single** (B from A), **multilevel** (C from B from A), **hierarchical** (B and C from A), **multiple** (C from A and B), and **hybrid** combinations. C++ supports all of them.
- Constructors are not inherited (opt in with `using Base::Base;`); the base part is built first, from the derived constructor's initializer list: `Derived(args) : Base(args) {}`.
- Benefits: code reuse and a common type for polymorphism. Costs: tight coupling to the base's implementation (fragile base class problem) and deep hierarchies that are hard to follow.
- Test with **substitutability**: anywhere the base is expected, the derived class must work correctly (Liskov). A square that inherits from a rectangle often fails this.
- Prefer `public` inheritance for is-a; private inheritance means "implemented in terms of", which composition usually expresses better.

### deep
#### Intuition

If `SavingsAccount` and `CheckingAccount` both need an owner, a balance and `deposit`, writing them twice invites the copies to drift apart. Inheritance puts the shared part in `Account` and lets each derived class add only its difference. More importantly, code that handles an `Account&` can accept either kind.

#### The forms

| form | shape | example |
|---|---|---|
| single | A ← B | `Vehicle ← Car` |
| multilevel | A ← B ← C | `Vehicle ← Car ← ElectricCar` |
| hierarchical | A ← B, A ← C | `Vehicle ← Car`, `Vehicle ← Truck` |
| multiple | A ← C → B | `Printer ← AllInOne → Scanner` |
| hybrid | a mix, often a diamond | see the diamond problem |

#### Code

```cpp
class Account {
protected:
    string owner;
    double balance = 0;
public:
    explicit Account(string owner) : owner(std::move(owner)) {}
    virtual ~Account() = default;
    void deposit(double x) { if (x > 0) balance += x; }
    virtual bool withdraw(double x) {
        if (x <= 0 || x > balance) return false;
        balance -= x;
        return true;
    }
    double getBalance() const { return balance; }
};

class SavingsAccount : public Account {          // single inheritance, is-a Account
    double rate;
public:
    SavingsAccount(string owner, double rate) : Account(std::move(owner)), rate(rate) {}
    void addInterest() { balance += balance * rate; }   // new behavior
};

class OverdraftAccount : public Account {        // hierarchical: a second child of Account
    double limit;
public:
    OverdraftAccount(string owner, double limit) : Account(std::move(owner)), limit(limit) {}
    bool withdraw(double x) override {           // changed behavior
        if (x <= 0 || x > balance + limit) return false;
        balance -= x;
        return true;
    }
};

int main() {
    SavingsAccount s("Asha", 0.05);
    OverdraftAccount o("Ben", 100);
    s.deposit(200); s.addInterest();
    o.deposit(50);
    Account& a = o;                              // a base reference to a derived object
    cout << s.getBalance() << " " << a.withdraw(120) << " " << o.getBalance() << "\n";  // 210 1 -70
}
```

#### Worked example: when is-a fails

A `Square` class inheriting `Rectangle` sounds right, since every square is a rectangle in geometry. Now take code written for rectangles:

| step | Rectangle r | Square (as Rectangle) |
|---|---|---|
| `setWidth(5)` | 5 × old h | 5 × 5 (setting width also sets height) |
| `setHeight(4)` | 5 × 4 | 4 × 4 |
| `assert(area() == 20)` | passes | fails: 16 |

The derived class is a special case mathematically but does not behave like a mutable rectangle. Inheritance must follow behavior, not taxonomy. Options: make shapes immutable, or give `Square` and `Rectangle` a common `Shape` base instead.

#### Costs

- **Fragile base class**: a change inside the base (say, `addAll` starts calling `add`) can silently break a derived class that overrides one of them.
- Deep hierarchies spread one concept across many files.
- Inheritance is fixed at compile time; you cannot swap a base at runtime, while you can swap a composed object.

#### Pitfalls

- Inheriting only to reuse a few functions (use composition).
- Forgetting to pass the right arguments to the base constructor.
- Deleting a derived object through a base pointer without a virtual destructor.
- `class D : B` is private inheritance by default.

Connects to: polymorphism, composition over inheritance, Liskov substitution principle, the diamond problem.

### questions
Q: What is inheritance and what relationship does it model?
A: Inheritance lets a class reuse and extend the members of another class. With public inheritance it models an is-a relationship: a SavingsAccount is an Account, so it can be used wherever an Account reference or pointer is expected.

Q: What types of inheritance are there?
A: Single (one base), multilevel (a chain such as A, B, C), hierarchical (several derived classes of one base), multiple (one derived class of several bases) and hybrid combinations. C++ supports all of them, including multiple inheritance of classes with data.

Q: In what order are constructors called with inheritance?
A: The base class constructor runs first, using the arguments given in the derived class's initializer list, then the derived class's members are initialized and its constructor body runs. Destruction happens in reverse: derived first, base last.

Q: Why might a Square class inheriting from Rectangle be a bad design?
A: A mutable rectangle lets you set width and height independently, and callers rely on that. A square must keep them equal, so setting the width also changes the height and breaks code that expected the area to be width times height. The derived class is not substitutable for its base, which violates the Liskov substitution principle.

Q: What are the main drawbacks of inheritance?
A: It couples the derived class to the base's implementation, so internal changes in the base can break derived classes (the fragile base class problem). Hierarchies can become deep and rigid, and the relationship is fixed at compile time. Composition is often more flexible.

## oop.pillars.polymorphism
name: "Polymorphism"
importance: must
prereqs: [oop.pillars.inheritance]
scope: "compile-time (overloading, templates) vs runtime (overriding, virtual dispatch)"

### simple
Polymorphism means one instruction can work on many kinds of things, each responding in its own way. If you tell a group of musicians to play, the pianist presses keys and the drummer hits drums, yet you only gave one instruction. Code can call the same function on different objects and each object does the right thing for its type.

### interview
- **Compile-time (static) polymorphism**: the compiler picks the function. Function overloading, operator overloading and templates. No runtime cost.
- **Runtime (dynamic) polymorphism**: the object's actual type picks the function while the program runs. Needs inheritance plus **overriding** of a `virtual` function, called through a base pointer or reference.
- Virtual calls typically use a **vtable**: each polymorphic class has a table of function pointers, each object a hidden **vptr**; a call loads the slot and jumps indirectly. Cost: one or two memory loads and usually no inlining.
- Only `virtual` functions dispatch at runtime. A call on an object by value, a qualified call `Base::f()`, and calls inside constructors and destructors are bound statically.
- **Object slicing**: passing a derived object **by value** as the base copies only the base part and loses the override. Pass by reference or pointer.
- Write `override` so a signature mismatch is a compile error instead of a silent new function; `final` stops further overriding.

### deep
#### Intuition

A drawing program keeps a list of shapes and calls `draw()` on each. Without polymorphism it would need a `switch` on a type tag, and every new shape would mean editing that switch. With polymorphism, each shape carries its own `draw`, and the loop never changes.

#### Two kinds

| | compile-time | runtime |
|---|---|---|
| chosen by | the compiler, from static types | the object's dynamic type |
| tools | overloading, operators, templates | `virtual` + `override` |
| cost | none at runtime | an indirect call |
| flexibility | types fixed when compiling | new derived classes plug in later |

#### Code

```cpp
struct Animal {
    virtual ~Animal() = default;
    virtual string sound() const { return "..."; }
};
struct Dog : Animal { string sound() const override { return "woof"; } };
struct Cat : Animal { string sound() const override { return "meow"; } };

void speakByRef(const Animal& a) { cout << a.sound() << " "; }   // runtime dispatch
void speakByValue(Animal a) { cout << a.sound() << " "; }        // slicing: copies only Animal

int twice(int x) { return 2 * x; }                  // overloading: chosen at compile time
string twice(const string& s) { return s + s; }

// One template, many types: also chosen at compile time.
template <typename T>
T biggest(const vector<T>& v) { return *max_element(v.begin(), v.end()); }

int main() {
    Dog d; Cat c;
    speakByRef(d); speakByRef(c);                   // woof meow
    speakByValue(d);                                // ... (sliced)
    cout << "\n" << twice(21) << " " << twice(string("ab")) << " "
         << biggest(vector<int>{3, 9, 4}) << "\n";  // 42 abab 9
}
```

#### How virtual dispatch works (worked example)

For `Dog` and `Cat` above the compiler builds one table per class:

| class | vtable slot 0 (destructor) | vtable slot 1 (`sound`) |
|---|---|---|
| Animal | `Animal::~Animal` | `Animal::sound` |
| Dog | `Dog::~Dog` | `Dog::sound` |
| Cat | `Cat::~Cat` | `Cat::sound` |

`a.sound()` through a reference compiles to: read the object's vptr, read slot 1, call that address. When `a` refers to a `Dog`, the vptr points at Dog's table, so `Dog::sound` runs. During `Animal`'s constructor the vptr still points at Animal's table, which is why virtual calls in constructors do not reach the derived class. (This is simplified: the layout is compiler-specific, and GCC and Clang, for example, give a virtual destructor two slots.)

#### Edge cases and bugs

- **Missing `virtual`**: the base version runs through a base pointer (static binding).
- **Signature mismatch**: `string sound()` without `const` in the derived class declares a new function and hides the base one; `override` catches it.
- **Slicing** with by-value parameters or `vector<Animal>`; store `unique_ptr<Animal>` instead.
- **Overloading is not dynamic**: `f(Animal&)` vs `f(Dog&)` is chosen from the static type, even if the object is a Dog. Double dispatch needs the visitor pattern.
- Default arguments of virtual functions are bound statically, from the declared type.

#### Variants

- **CRTP** (curiously recurring template pattern) gives static polymorphism without vtables.
- `std::variant` with `std::visit` handles a closed set of types without inheritance.
- **Type erasure** (`std::function`, `std::any`) gives runtime polymorphism without a common base class.

Connects to: inheritance, method overloading vs overriding, virtual destructors, strategy pattern, virtual function internals.

### questions
Q: What is the difference between compile-time and runtime polymorphism?
A: Compile-time polymorphism is resolved by the compiler from static types: function and operator overloading and templates. Runtime polymorphism is resolved while the program runs from the object's actual type, through overridden virtual functions called via a base reference or pointer. The first has no runtime cost, the second lets new derived classes plug in without recompiling callers.

Q: How does C++ implement virtual functions?
A: Typically each class with virtual functions has a vtable, an array of function pointers, and each object stores a hidden vptr to its class's table. A virtual call loads the vptr, looks up the function's slot and calls it indirectly. The exact layout is compiler-specific.

Q: What is object slicing?
A: When a derived object is copied into a variable of the base type by value, only the base part is copied and the derived members and overrides are lost. It happens with pass-by-value parameters and containers of base objects. Use references, pointers or smart pointers to keep polymorphic behavior.

Q: Which calls are not dispatched at runtime in C++?
A: Calls to non-virtual and static member functions, calls on an object by value rather than through a pointer or reference, calls qualified with the class name such as Base::f(), and virtual calls made inside constructors and destructors, which go to the class currently being built or destroyed.

Q: How do templates give polymorphism without virtual functions?
A: A template works with any type that supports the operations it uses, and the compiler generates a separate version for each type at compile time. There is no vtable and calls can be inlined, but the set of types is fixed when compiling and each instantiation adds code. C++20 concepts state the required operations explicitly.

## oop.pillars.abstract-class-vs-interface
name: "Abstract class vs interface"
importance: must
prereqs: [oop.pillars.abstraction]
scope: "differences, when to use each, default methods"

### simple
An interface is a list of promises, and an abstract class is a half-built product that others finish. A job description only says what any accountant must be able to do, while a training program also hands new accountants ready-made tools. In C++ both are classes with pure virtual functions; the difference is whether the class also carries data and working code.

### interview
- C++ has no `interface` keyword. An **abstract class** is any class with at least one pure virtual function; it may also have data members, constructors and implemented member functions, and it cannot be instantiated.
- An **interface** is a convention: an abstract class with **only** pure virtual functions, a virtual destructor and **no data** (sometimes called a pure abstract base or protocol class).
- A class can inherit **several interfaces** safely, since they carry no state; inheriting several abstract classes with data invites the diamond problem.
- Use an **interface** for what other code depends on (`Payable`, `Shape`); use an **abstract class** to share state and code among closely related implementations (a skeleton base, template method).
- **Default methods**: a virtual function with a body gives implementers a default they may override, so adding one does not break them; adding a new **pure** virtual function breaks every implementer.
- Pure virtual functions may still have a definition (called explicitly as `Base::f()`), and a pure virtual destructor must have one. For templates, C++20 **concepts** describe a compile-time interface.

### deep
#### Intuition

Both say "you cannot create me directly; someone must fill in the blanks". An interface is only the blanks, which makes it light: any class can adopt it, even a class that already has another base. An abstract class also brings furniture (data members, helper functions, a constructor), which saves work but ties the derived class to it.

#### Side by side

| | interface-style class | abstract class |
|---|---|---|
| data members | none | allowed |
| constructors | none needed | allowed |
| implemented functions | none (or default bodies) | any |
| many per class? | yes, safely | possible, but a diamond risk |
| models | "can do" | "is a kind of" |
| adding a function later | safe only with a default body | safe if given a body |

#### Code

```cpp
struct Payable {                                  // interface: a capability, no data
    virtual ~Payable() = default;
    virtual long long amountDue() const = 0;
    virtual bool isFree() const { return amountDue() == 0; }   // a default method
};

struct Auditable {                                // a second interface
    virtual ~Auditable() = default;
    virtual string auditTag() const = 0;
};

class Employee : public Payable, public Auditable {   // abstract class: shared state and code
protected:
    string name;
public:
    explicit Employee(string n) : name(std::move(n)) {}
    virtual long long monthlyPay() const = 0;         // still abstract
    long long amountDue() const override { return monthlyPay(); }
    string auditTag() const override { return "employee " + name; }
};

class Salaried : public Employee {
    long long salary;
public:
    Salaried(string n, long long s) : Employee(std::move(n)), salary(s) {}
    long long monthlyPay() const override { return salary; }
};

class Invoice : public Payable {                  // unrelated to Employee, same capability
    long long total;
public:
    explicit Invoice(long long t) : total(t) {}
    long long amountDue() const override { return total; }
};

long long totalDue(const vector<const Payable*>& bills) {   // depends only on the interface
    long long sum = 0;
    for (const Payable* p : bills) sum += p->amountDue();
    return sum;
}

int main() {
    Salaried asha("Asha", 50000);
    Invoice inv(0);
    cout << totalDue({&asha, &inv}) << " " << inv.isFree() << " " << asha.auditTag() << "\n";
    // 50000 1 employee Asha
}
```

`totalDue` depends only on `Payable`. `Invoice` could never be an `Employee`, but it can be paid.

#### Worked example: two default methods collide

```cpp
struct Walker {
    virtual ~Walker() = default;
    virtual string move() const { return "walk"; }
};
struct Swimmer {
    virtual ~Swimmer() = default;
    virtual string move() const { return "swim"; }
};
struct Duck : Walker, Swimmer {
    string move() const override {                // one override serves both bases
        return Walker::move() + " and " + Swimmer::move();
    }
};
```

| without `Duck::move` | with `Duck::move` |
|---|---|
| `duck.move()` does not compile: the name is ambiguous | "walk and swim" |
| through `Walker&` or `Swimmer&`: each base's own default | "walk and swim" through either base |

#### A compile-time interface

```cpp
template <typename T>
concept PayableLike = requires(const T& t) {
    { t.amountDue() } -> convertible_to<long long>;
};

long long sumDue(const PayableLike auto&... items) { return (items.amountDue() + ... + 0LL); }
```

Any type with a suitable `amountDue()` works, with no base class and no virtual call, but the types must be known when compiling.

Connects to: abstraction, the diamond problem, interface segregation principle, dependency inversion principle.

### questions
Q: What is the difference between an abstract class and an interface in C++?
A: C++ has no interface keyword. An abstract class is any class with at least one pure virtual function, and it may also hold data, constructors and implemented functions. An interface is an abstract class by convention that has only pure virtual functions, a virtual destructor and no data, so any class can implement several of them safely.

Q: When would you choose an abstract class over an interface?
A: When closely related classes share state and implementation, such as common data members, a constructor and a fixed sequence of steps. An interface is better for a capability that unrelated classes can offer and for the types other code depends on.

Q: What happens if you add a new pure virtual function to an interface?
A: Every class implementing it becomes abstract until it overrides the new function, so all existing implementations fail to compile. Adding a virtual function with a default body instead, or a new separate interface, extends it without breaking them.

Q: Two base classes both provide a virtual function with the same signature and a body. What happens in a class that inherits both?
A: Calling the function through the derived class does not compile because the name is ambiguous, although calls through a reference to either base still work. The derived class should override it once; that single override then serves both bases and can call Walker::move() or Swimmer::move() explicitly.

Q: How do you express an interface in C++?
A: With a class that has only pure virtual functions and a virtual destructor, and no data members. Classes implement it by inheriting publicly and overriding every pure virtual function. For templates, a C++20 concept can express the same requirements at compile time.

## oop.pillars.the-diamond-problem
name: "The diamond problem"
importance: important
prereqs: [oop.pillars.inheritance]
scope: "multiple inheritance ambiguity, virtual inheritance, diamonds of interfaces"

### simple
The diamond problem happens when a class inherits from two parents that share the same grandparent. It is like a child whose two parents each hand them a copy of the same family recipe book: which copy should they use, and should they even have two? C++ lets you choose between two copies and one shared grandparent.

### interview
- Shape: `A` at the top, `B` and `C` both derive from `A`, and `D` derives from both `B` and `C`. Draw it and it is a diamond.
- **Without virtual inheritance**: `D` contains **two** `A` subobjects, so `d.x` and converting `D&` to `A&` are ambiguous; you must write `d.B::x`.
- **Virtual inheritance** (`class B : virtual public A`): `D` has **one shared** `A`. The **most derived class** (`D`) constructs `A` directly; the calls from `B` and `C` to `A`'s constructor are ignored.
- Cost: a hidden pointer or offset per object and an indirection to reach the virtual base.
- A diamond of **interfaces** (no data) is mostly harmless: nothing is duplicated and one override serves both paths, which is why many languages allow multiple inheritance of interfaces only. Converting to the shared base can still be ambiguous unless it is inherited virtually.
- The standard library uses it: `std::iostream` derives from `istream` and `ostream`, which both inherit `basic_ios` virtually.

### deep
#### The problem

```cpp
struct Device { int id = 0; void powerOn() {} };
struct Printer : Device {};
struct Scanner : Device {};
struct Copier : Printer, Scanner {};   // two Device subobjects

void demo() {
    Copier c;
    // c.id = 1;                  // error: ambiguous (Printer::id or Scanner::id?)
    c.Printer::id = 1;            // must name the path
    c.Scanner::id = 2;            // a second, separate id
}
```

A copier with two device ids is nonsense: there is one physical device.

#### Virtual inheritance

```cpp
struct Device {
    int id;
    explicit Device(int id) : id(id) { cout << "Device " << id << "\n"; }
};
struct Printer : virtual Device { Printer() : Device(1) {} };
struct Scanner : virtual Device { Scanner() : Device(2) {} };
struct Copier : Printer, Scanner {
    Copier() : Device(3) {}          // the most derived class builds the shared base
};

int main() {
    Copier c;                        // prints "Device 3" once
    Device& d = c;                   // no longer ambiguous
    cout << d.id << "\n";            // 3
}
```

Worked example of construction order for `Copier`:

| step | what happens |
|---|---|
| 1 | virtual base `Device(3)`, called by `Copier` |
| 2 | `Printer`'s constructor; its `Device(1)` is skipped |
| 3 | `Scanner`'s constructor; its `Device(2)` is skipped |
| 4 | `Copier`'s body |

Virtual bases are always built first, by the most derived class. If `Copier` did not mention `Device`, the compiler would try `Device`'s default constructor, which here does not exist, so it would not compile.

#### A diamond of interfaces

```cpp
struct Named {                                   // an interface: no data
    virtual ~Named() = default;
    virtual string name() const = 0;
};
struct Printer2 : Named { string print() const { return "printing"; } };
struct Scanner2 : Named { string scan() const { return "scanning"; } };
struct Copier2 : Printer2, Scanner2 {
    string name() const override { return "copier"; }   // one override for both paths
};
```

| expression | result |
|---|---|
| `Printer2& p = c; p.name()` | "copier" |
| `Scanner2& s = c; s.name()` | "copier" |
| `Named& n = c;` | error: `Named` is an ambiguous base (two subobjects, both empty) |

There is no duplicated state, and one override satisfies both paths. Inheriting `Named` virtually would also make the last line legal.

#### Takeaways

- Multiple inheritance of **interfaces** is harmless and common. Multiple inheritance of **state** is where diamonds hurt.
- Reach for virtual inheritance only when a shared base truly must be one object, as in the iostream hierarchy.
- Composition sidesteps the whole issue.

Connects to: inheritance, abstract class vs interface, composition over inheritance.

### questions
Q: What is the diamond problem?
A: It arises when a class inherits from two classes that share a common base. The derived class may end up with two copies of the base's state, and uses of the base's members, or conversions to the base, become ambiguous because the compiler cannot tell which path to use.

Q: How does virtual inheritance solve the diamond problem?
A: Declaring the middle classes with virtual inheritance makes them share a single base subobject, so the most derived class has exactly one copy of the base. The most derived class is then responsible for calling the virtual base's constructor, and the middle classes' calls to it are ignored.

Q: Why is a diamond of interfaces less of a problem?
A: Interfaces carry no data, so nothing is duplicated, and a single override in the most derived class serves both inheritance paths. The only remaining issue is that converting to the shared interface is ambiguous unless it is inherited virtually.

Q: What does virtual inheritance cost?
A: Each object needs a hidden pointer or offset to find its virtual base, accessing the base's members takes an extra indirection, and the most derived class must construct the virtual base. That is why it is used only where a shared base really must be one object.

## oop.pillars.method-overloading-vs-overriding
name: "Method overloading vs overriding"
importance: important
prereqs: [oop.pillars.polymorphism]
scope: "rules, return types, covariant returns"

### simple
Overloading is giving several functions the same name but different inputs, and overriding is a derived class replacing a virtual function it inherited. A coffee machine with separate buttons for "espresso" and "espresso with a size" is overloading. A newer model that makes its espresso differently when you press the same button is overriding.

### interview
- **Overloading**: same name, **different parameter lists** (number, types, order, or `const`-ness of a member function), in the same scope. Resolved at **compile time** from the arguments. Return type alone cannot distinguish overloads.
- **Overriding**: a derived class redefines a base **virtual** function with the **same signature** (parameters, `const`, reference qualifiers). Resolved at **runtime** from the object's type.
- **Covariant return types**: an override may return a pointer or reference to a class derived from the base function's return class. Other return types must match exactly.
- Write `override` (the compiler checks the base really has that virtual function) and `final` (no further overriding). Access can differ in an override; it is checked on the static type used at the call.
- **Name hiding**: declaring `f(double)` in a derived class hides every base `f` overload unless you add `using Base::f;`.
- Default arguments of virtual functions come from the **static** type, even though the body comes from the dynamic type.

### deep
#### Side by side

| | overloading | overriding |
|---|---|---|
| where | same scope | base and derived class |
| signature | must differ in parameters | must match |
| return type | free, but cannot be the only difference | same or covariant |
| resolved | compile time, static types | runtime, dynamic type |
| needs `virtual` | no | yes |

#### Overloading

```cpp
struct Printer {
    string show(int x) { return "int " + to_string(x); }
    string show(double x) { return "double"; }
    string show(const string& s) { return "string " + s; }
    // int show(int x);          // error: differs only in return type
};
```

The compiler picks the best match for the arguments' static types: an exact match beats a promotion, which beats a conversion. Surprises come from conversions: `show('a')` promotes `char` to `int`, and `show(5L)` is ambiguous (a `long` converts equally well to `int` and `double`).

#### Overriding with a covariant return

```cpp
struct Animal {
    virtual ~Animal() = default;
    virtual Animal* clone() const { return new Animal(*this); }
    virtual string name() const { return "animal"; }
};
struct Dog : Animal {
    Dog* clone() const override { return new Dog(*this); }   // covariant: Dog* instead of Animal*
    string name() const override { return "dog"; }
};

int main() {
    Dog d;
    unique_ptr<Dog> copy(d.clone());          // no cast needed thanks to the covariant return
    Animal& a = d;
    unique_ptr<Animal> viaBase(a.clone());    // still Dog::clone at runtime
    cout << copy->name() << " " << viaBase->name() << "\n";   // dog dog
}
```

#### Name hiding (worked example)

```cpp
struct Base {
    virtual ~Base() = default;
    string f(int) { return "Base::f(int)"; }
    string f(const string&) { return "Base::f(string)"; }
};
struct Derived : Base {
    using Base::f;                              // without this line, f("x") would not compile
    string f(double) { return "Derived::f(double)"; }
};
```

| call on a `Derived` | without `using` | with `using Base::f` |
|---|---|---|
| `f(1.5)` | Derived::f(double) | Derived::f(double) |
| `f(1)` | Derived::f(double) (int converted) | Base::f(int), exact match |
| `f("x")` | error: no match in Derived | Base::f(string) |

Name lookup stops at the first scope that has the name, before overload resolution runs.

#### Default arguments and `final`

```cpp
struct Greeter {
    virtual ~Greeter() = default;
    virtual string greet(string who = "base default") const { return "hi " + who; }
};
struct Loud final : Greeter {                   // final: nothing may derive from Loud
    string greet(string who = "derived default") const override { return "hello " + who; }
};

int main() {
    Loud l;
    Greeter& g = l;
    cout << g.greet() << " | " << l.greet() << "\n";   // hello base default | hello derived default
}
```

The body comes from `Loud` both times, but the default argument comes from the type of the expression: `Greeter&` supplies "base default". Avoid giving overrides different defaults.

Connects to: polymorphism, inheritance, Liskov substitution principle, prototype pattern.

### questions
Q: What is the difference between overloading and overriding?
A: Overloading defines several functions with the same name but different parameter lists, and the compiler picks one from the argument types. Overriding redefines an inherited virtual function with the same signature in a derived class, and the choice is made at runtime from the object's actual type.

Q: Can two overloads differ only in return type?
A: No. The compiler selects an overload from the arguments at the call site, and the return type is not part of that decision, so two functions with identical parameter lists are a duplicate definition.

Q: What is a covariant return type?
A: An override may return a pointer or reference to a class derived from the one the base function returns, such as Dog* instead of Animal*. Callers using the derived type then need no cast, and callers using the base type still get a valid object.

Q: What must match for a function to override a base virtual function?
A: The name, the parameter types, and the const and reference qualifiers of the member function; the return type must be the same or covariant. The override keyword makes the compiler check this, turning a near miss, such as a missing const, into an error instead of a new hidden function.

Q: What is name hiding in C++?
A: If a derived class declares a function with the same name as base class functions, it hides all the base overloads of that name, even ones with different parameters. Calls then consider only the derived versions. Writing using Base::name in the derived class brings the base overloads back.
