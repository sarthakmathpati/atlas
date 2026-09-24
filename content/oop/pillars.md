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
- **Encapsulation** = bundling data with the methods that operate on it **and** restricting direct access to that data (private fields, public operations).
- Its purpose is protecting **invariants**: facts that must always hold, such as `balance >= 0`, a date that is always valid, or a list that stays sorted. Every method checks or preserves them.
- Getters and setters for every field are not encapsulation by themselves. Prefer operations that express intent (`withdraw(amount)`) over raw setters (`setBalance(x)`), often summarized as "tell, don't ask".
- Do not leak mutable internals: returning a reference to an internal list lets callers change it behind your back. Return a copy, an unmodifiable view or a const reference.
- Benefits: you can change the internal representation without touching callers, bugs are localized to one class, and objects are easier to use correctly.
- Encapsulation vs abstraction: encapsulation hides and protects **state**; abstraction decides which **operations** to expose.

### deep
#### Intuition

If any code anywhere can write a field, then any code anywhere can break it, and when it breaks you have to search the whole program. If only the class's own methods can write it, a broken value has at most a handful of suspects. Encapsulation shrinks the places a bug can come from.

#### Invariants

An **invariant** is a condition that is true whenever no method of the object is running. Constructors establish it, and each public method may bend it temporarily but must restore it before returning.

Examples:

- `BankAccount`: `balance >= 0`.
- `Fraction`: denominator is positive and the fraction is in lowest terms.
- `SortedList`: elements are in non-decreasing order.

#### Worked example

A `Fraction` class keeps itself reduced, so `==` can compare fields directly.

| call | numerator | denominator | why |
|---|---|---|---|
| `Fraction f(6, -8)` | -3 | 4 | the constructor moves the sign up and divides by gcd 2 |
| `f.add(Fraction(1, 4))` | -1 | 2 | -3/4 + 1/4 = -2/4, reduced |
| `f.denominator = 0` | - | - | does not compile: the field is private |

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

```python
from math import gcd


class Fraction:
    def __init__(self, num, den):
        if den == 0:
            raise ValueError("zero denominator")
        if den < 0:
            num, den = -num, -den
        g = gcd(num, den)
        self._num, self._den = num // g, den // g

    def add(self, other):
        return Fraction(self._num * other._den + other._num * self._den,
                        self._den * other._den)

    @property
    def numerator(self):
        return self._num

    @property
    def denominator(self):
        return self._den


f = Fraction(6, -8).add(Fraction(1, 4))
print(f.numerator, f.denominator)   # -1 2
```

The Python version returns a new object instead of changing itself, which is even safer: nothing can ever observe a half-updated fraction.

#### Leaking internals

```cpp
class Team {
    vector<string> members;
public:
    vector<string>& getMembers() { return members; }             // leak: callers can clear it
    const vector<string>& viewMembers() const { return members; } // read-only view
    void addMember(const string& name) { if (!name.empty()) members.push_back(name); }
};
```

In Java, return `List.copyOf(members)` or `Collections.unmodifiableList(members)`. In Python, return a tuple or a copy.

#### Getters and setters

A setter that assigns anything is a public field with extra steps. Add a setter only when changing that value is a real operation, and validate in it. Many good classes have no setters at all (immutable value types).

#### Pitfalls

- Public fields "for convenience" that later need validation.
- Returning internal mutable collections or pointers.
- A constructor that skips validation, so an invalid object exists from the start.
- Checking the invariant in callers instead of in the class.

Connects to: access modifiers, abstraction, immutability, single responsibility principle.

### questions
Q: What is encapsulation?
A: Encapsulation bundles an object's data with the methods that operate on it and hides the data so it can change only through those methods. This lets the class guarantee its invariants and change its internal representation without affecting the code that uses it.

Q: What is a class invariant? Give an example.
A: An invariant is a condition that is true whenever no method of the object is running. The constructor establishes it and every public method preserves it. For example, a bank account keeps balance at least zero, and a fraction keeps a positive denominator in lowest terms.

Q: Do getters and setters give you encapsulation?
A: Not by themselves. A setter that assigns any value is effectively a public field. Encapsulation comes from exposing meaningful operations that validate input and keep invariants, and from not exposing a setter at all when a value should not change.

Q: How can a class accidentally break its own encapsulation?
A: By returning a reference or pointer to a mutable internal object, such as its internal list, which lets callers change the state without going through the class's methods. Return a copy, an unmodifiable view or a const reference instead.

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
- Tools: **interfaces** (a pure contract), **abstract classes** (a contract plus shared code; cannot be instantiated), and simply good public methods.
- Callers depend on the abstraction (`Shape::area()`, `List`, `PaymentGateway`), so implementations can change or be swapped without touching them.
- An abstract class in C++ has at least one **pure virtual** function (`virtual double area() const = 0;`); Java uses `abstract` and `interface`; Python uses `abc.ABC` with `@abstractmethod`.
- Leaky abstractions: the hidden details sometimes show through (performance of a linked list vs array list, network failures behind a remote call). Know which details your abstraction cannot hide.
- Abstraction is a design decision (what to expose); encapsulation is the protection that keeps the rest hidden.

### deep
#### Intuition

Humans handle complexity by ignoring most of it. You call `sort(v.begin(), v.end())` without knowing it runs introsort. A `PaymentGateway` interface with `charge(amount)` lets checkout code ignore whether the money goes through one bank's API or another's. Abstraction is choosing that small surface well.

#### Levels of abstraction

1. **A function**: `sqrt(x)` hides the numerical method.
2. **A class**: `Fraction` hides the gcd bookkeeping.
3. **An interface**: `Shape` says every shape has `area()` and `perimeter()`, with no code at all.
4. **A module or service**: a storage layer hides whether data lives in memory, a file or a database.

#### Code: an abstract base in C++ and Python

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
}
```

```python
from abc import ABC, abstractmethod
import math


class Shape(ABC):
    @abstractmethod
    def area(self): ...

    def describe(self):
        return f"{type(self).__name__} with area {self.area():.2f}"


class Rect(Shape):
    def __init__(self, w, h):
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h


class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return math.pi * self.r ** 2


print(sum(s.area() for s in [Rect(2, 3), Circle(1)]))  # 9.141592653589793
# Shape() raises TypeError: can't instantiate abstract class
```

#### Worked example: swapping an implementation

`totalArea` was written against `Shape`. Adding a `Triangle` class later needs no change to `totalArea`, to `describe`, or to any caller. Only code that creates shapes learns about triangles.

| change | classes edited |
|---|---|
| add `Triangle` | only the new class (and whoever constructs it) |
| make `Circle::area` use a cached value | only `Circle` |
| add `perimeter()` to every shape | `Shape` and each subclass: widening an abstraction costs more |

The last row is the lesson: an abstraction is cheap to implement again and expensive to change, so keep it small.

#### Choosing a good abstraction

- Name operations by intent (`send(message)`), not by mechanism (`writeToSocket`).
- Keep it minimal: every method is a promise every implementation must keep.
- Do not expose implementation types in signatures (return `vector<Order>` or a range, not the internal `map` iterator).
- Accept that some abstractions leak: a remote call can fail in ways a local call cannot, so make that visible in the interface (timeouts, errors).

#### Pitfalls

- Abstracting too early: an interface with one implementation and no second in sight adds indirection without benefit.
- Giant interfaces that force implementers to stub methods (see interface segregation).
- Forgetting the virtual destructor on a C++ abstract base.

Connects to: encapsulation, abstract class vs interface, polymorphism, dependency inversion principle.

### questions
Q: What is abstraction in object-oriented programming?
A: Abstraction is exposing only the essential operations of something and hiding how they are carried out. Callers work with a simple model, such as a Shape with an area method, and the details live in the implementations, which can change without affecting callers.

Q: How do you make a class abstract in C++, Java and Python?
A: In C++, declare at least one pure virtual function with = 0. In Java, mark the class abstract or declare an interface. In Python, inherit from abc.ABC and mark methods with the abstractmethod decorator. In all three, the abstract type cannot be instantiated directly.

Q: What is a leaky abstraction?
A: An abstraction whose hidden details still affect the caller. For example, a remote call looks like a local method but can time out, and a list interface hides whether indexing is constant or linear time. Good designs make the unavoidable details visible, such as by returning errors or documenting costs.

Q: What is the difference between abstraction and encapsulation?
A: Abstraction is the design choice of which operations to expose and how to describe them. Encapsulation is the mechanism that hides and protects the state behind those operations. Abstraction answers what the user sees, encapsulation makes sure they cannot reach past it.

Q: Why is changing an abstraction more expensive than changing an implementation?
A: Every caller and every implementation depends on the abstraction. Changing one implementation touches one class, but adding a method to an interface forces every implementation to change, and changing a method's meaning can break every caller.

## oop.pillars.inheritance
name: "Inheritance"
importance: must
scope: "single, multilevel, hierarchical, multiple; is-a relationships"

### simple
Inheritance lets a new class start from an existing one and add or adjust what it needs. A delivery van is a kind of vehicle: it has everything a vehicle has, like wheels and an engine, plus a cargo area. Use it only when the new thing truly is a kind of the old thing.

### interview
- A **derived** (child, sub) class inherits the fields and methods of a **base** (parent, super) class and can add members or override behavior. It models an **is-a** relationship.
- Forms: **single** (B from A), **multilevel** (C from B from A), **hierarchical** (B and C from A), **multiple** (C from A and B; C++ and Python yes, Java only through interfaces), and **hybrid** combinations.
- Constructors are not inherited (C++ can opt in with `using Base::Base;`); the base part is built first, by `super(...)` in Java, `super().__init__()` in Python, or the initializer list in C++.
- Benefits: code reuse and a common type for polymorphism. Costs: tight coupling to the parent's implementation (fragile base class problem) and deep hierarchies that are hard to follow.
- Test with **substitutability**: anywhere the base is expected, the derived class must work correctly (Liskov). A square that inherits from a rectangle often fails this.
- In C++, prefer `public` inheritance for is-a; private inheritance means "implemented in terms of", which composition usually expresses better.

### deep
#### Intuition

If `SavingsAccount` and `CheckingAccount` both need an owner, a balance and `deposit`, writing them twice invites the copies to drift apart. Inheritance puts the shared part in `Account` and lets each subclass add only its difference. More importantly, code that handles an `Account` can accept either kind.

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

```python
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0.0

    def deposit(self, x):
        if x > 0:
            self.balance += x

    def withdraw(self, x):
        if x <= 0 or x > self.balance:
            return False
        self.balance -= x
        return True


class OverdraftAccount(Account):
    def __init__(self, owner, limit):
        super().__init__(owner)          # build the base part first
        self.limit = limit

    def withdraw(self, x):
        if x <= 0 or x > self.balance + self.limit:
            return False
        self.balance -= x
        return True


o = OverdraftAccount("Ben", 100)
o.deposit(50)
print(o.withdraw(120), o.balance, isinstance(o, Account))   # True -70.0 True
```

#### Worked example: when is-a fails

A `Square` class inheriting `Rectangle` sounds right, since every square is a rectangle in geometry. Now take code written for rectangles:

| step | Rectangle r | Square (as Rectangle) |
|---|---|---|
| `setWidth(5)` | 5 × old h | 5 × 5 (setting width also sets height) |
| `setHeight(4)` | 5 × 4 | 4 × 4 |
| `assert(area() == 20)` | passes | fails: 16 |

The subclass is a special case mathematically but does not behave like a mutable rectangle. Inheritance must follow behavior, not taxonomy. Options: make shapes immutable, or give `Square` and `Rectangle` a common `Shape` parent instead.

#### Costs

- **Fragile base class**: a change inside the parent (say, `addAll` starts calling `add`) can silently break a subclass that overrides one of them.
- Deep hierarchies spread one concept across many files.
- Inheritance is fixed at compile time; you cannot swap a parent at runtime, while you can swap a composed object.

#### Pitfalls

- Inheriting only to reuse a few methods (use composition).
- Forgetting to call the base constructor with the right arguments.
- In C++, deleting a derived object through a base pointer without a virtual destructor.
- In C++, `class D : B` is private inheritance by default.

Connects to: polymorphism, composition over inheritance, Liskov substitution principle, the diamond problem.

### questions
Q: What is inheritance and what relationship does it model?
A: Inheritance lets a class reuse and extend the fields and methods of another class. It models an is-a relationship: a SavingsAccount is an Account, so it can be used wherever an Account is expected.

Q: What types of inheritance are there?
A: Single (one parent), multilevel (a chain such as A, B, C), hierarchical (several children of one parent), multiple (one child of several parents) and hybrid combinations. Java supports multiple inheritance only of interfaces, while C++ and Python allow multiple class inheritance.

Q: In what order are constructors called with inheritance?
A: The base class constructor runs first, then the derived class's members are initialized and its constructor body runs. Destruction happens in reverse, derived first and base last. In Java and Python the child calls the parent explicitly with super.

Q: Why might a Square class inheriting from Rectangle be a bad design?
A: A mutable rectangle lets you set width and height independently, and callers rely on that. A square must keep them equal, so setting the width also changes the height and breaks code that expected the area to be width times height. The subclass is not substitutable for its parent, which violates the Liskov substitution principle.

Q: What are the main drawbacks of inheritance?
A: It couples the child to the parent's implementation, so internal changes in the parent can break children (the fragile base class problem). Hierarchies can become deep and rigid, and the relationship is fixed at compile time. Composition is often more flexible.

## oop.pillars.polymorphism
name: "Polymorphism"
importance: must
prereqs: [oop.pillars.inheritance]
scope: "compile-time (overloading, templates) vs runtime (overriding, virtual dispatch)"

### simple
Polymorphism means one instruction can work on many kinds of things, each responding in its own way. If you tell a group of musicians to play, the pianist presses keys and the drummer hits drums, yet you only gave one instruction. Code can call the same method on different objects and each object does the right thing for its type.

### interview
- **Compile-time (static) polymorphism**: the compiler picks the function. Function overloading, operator overloading and templates (C++) or generics (Java). No runtime cost.
- **Runtime (dynamic) polymorphism**: the object's actual type picks the function while the program runs. Needs inheritance plus **overriding** of a `virtual` method, called through a base pointer or reference.
- C++ implements virtual calls with a **vtable**: each polymorphic class has a table of function pointers, each object a hidden **vptr**; a call loads the slot and jumps indirectly. Cost: one or two memory loads and usually no inlining.
- Java methods are virtual by default (not `static`, `private` or `final` ones). Python uses **duck typing**: any object with the right method works, no common base needed.
- C++ **object slicing**: passing a derived object **by value** as the base copies only the base part and loses the override. Pass by reference or pointer.
- Use `override` (C++) or `@Override` (Java) so a signature mismatch is a compile error instead of a silent new method.

### deep
#### Intuition

A drawing program keeps a list of shapes and calls `draw()` on each. Without polymorphism it would need a `switch` on a type tag, and every new shape would mean editing that switch. With polymorphism, each shape carries its own `draw`, and the loop never changes.

#### Two kinds

| | compile-time | runtime |
|---|---|---|
| chosen by | the compiler, from static types | the object's dynamic type |
| C++ tools | overloading, operators, templates | `virtual` + override |
| Java tools | overloading, generics | overriding (default) |
| cost | none at runtime | an indirect call |
| flexibility | types fixed when compiling | new subclasses plug in later |

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

template <typename T>
T biggest(const vector<T>& v) { return *max_element(v.begin(), v.end()); }  // one template, many types

int main() {
    Dog d; Cat c;
    speakByRef(d); speakByRef(c);                   // woof meow
    speakByValue(d);                                // ... (sliced)
    cout << "\n" << twice(21) << " " << twice(string("ab")) << " "
         << biggest(vector<int>{3, 9, 4}) << "\n";  // 42 abab 9
}
```

```python
class Dog:
    def sound(self):
        return "woof"


class Robot:                      # unrelated class, same method name
    def sound(self):
        return "beep"


def speak(thing):                 # duck typing: anything with sound() works
    return thing.sound()


print([speak(x) for x in (Dog(), Robot())])   # ['woof', 'beep']
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
- **Signature mismatch**: `string sound()` without `const` in the child declares a new function and hides the base one; `override` catches it.
- **Slicing** with by-value parameters or `vector<Animal>`; store `unique_ptr<Animal>` instead.
- **Overloading is not dynamic**: `f(Animal&)` vs `f(Dog&)` is chosen from the static type, even if the object is a Dog. Double dispatch needs the visitor pattern.
- Default arguments of virtual functions are bound statically, from the declared type.

#### Variants

- **CRTP** (curiously recurring template pattern) gives static polymorphism without vtables in C++.
- `std::variant` with `std::visit` handles a closed set of types without inheritance.
- Java interfaces and Python protocols give polymorphism without sharing an implementation.

Connects to: inheritance, method overloading vs overriding, virtual destructors, strategy pattern, virtual function internals.

### questions
Q: What is the difference between compile-time and runtime polymorphism?
A: Compile-time polymorphism is resolved by the compiler from static types: function and operator overloading, templates and generics. Runtime polymorphism is resolved while the program runs from the object's actual type, through overridden virtual methods called via a base reference or pointer. The first has no runtime cost, the second lets new subclasses plug in without recompiling callers.

Q: How does C++ implement virtual functions?
A: Typically each class with virtual functions has a vtable, an array of function pointers, and each object stores a hidden vptr to its class's table. A virtual call loads the vptr, looks up the function's slot and calls it indirectly. The exact layout is compiler-specific.

Q: What is object slicing?
A: When a derived object is copied into a variable of the base type by value, only the base part is copied and the derived fields and overrides are lost. It happens with pass-by-value parameters and containers of base objects. Use references, pointers or smart pointers to keep polymorphic behavior.

Q: Which methods are not polymorphic in Java?
A: Static methods (they are hidden, not overridden), private methods (not visible to subclasses) and final methods (cannot be overridden). Constructors are not inherited at all. Every other instance method is virtual by default.

Q: What is duck typing?
A: In dynamically typed languages like Python, an object is usable wherever its methods fit, regardless of its class: if it has a quack method, it can be treated as a duck. Polymorphism then needs no shared base class, though abstract base classes or protocols can document the expected methods.

## oop.pillars.abstract-class-vs-interface
name: "Abstract class vs interface"
importance: must
prereqs: [oop.pillars.abstraction]
scope: "differences, when to use each, default methods"

### simple
An interface is a list of promises, and an abstract class is a half-built product that others finish. A job description says what any accountant must be able to do, while a training program gives new accountants some ready-made tools as well as tasks to complete. A class can sign up to many job descriptions but can come out of only one training program.

### interview
- **Abstract class**: cannot be instantiated; can have **state** (instance fields), **constructors**, concrete methods with any access level, and abstract methods. A Java class can extend **only one**.
- **Interface** (Java): a contract. Fields are implicitly `public static final` constants; methods are implicitly `public abstract`, except **`default`** and `static` methods (Java 8) and `private` helpers (Java 9). A class can implement **many**.
- Choose an **abstract class** for closely related types that share state and code (an "is-a" family with a common skeleton). Choose an **interface** for a capability that unrelated types can have ("can do": `Comparable`, `Runnable`, `Closeable`).
- **Default methods** exist so interfaces can grow without breaking every implementer (Java 8 added `forEach` and `stream` to collections this way). If two interfaces give the same default, the class must override it and may call `A.super.m()`.
- C++ has no interface keyword: an "interface" is a class with only pure virtual functions and a virtual destructor; an abstract class is any class with at least one pure virtual function. Python uses `abc.ABC` or `typing.Protocol`.
- Prefer interfaces for types that callers depend on; use an abstract class underneath to share code between implementations.

### deep
#### Intuition

Both say "you cannot create me directly; someone must fill in the blanks". An interface is only the blanks, which makes it light: anything can adopt it. An abstract class also brings furniture (fields, helper methods, a constructor), which saves work but ties the subclass to it, and a class can have only one such parent.

#### Side by side (Java)

| | abstract class | interface |
|---|---|---|
| instance fields | yes | no (only `static final` constants) |
| constructors | yes | no |
| method bodies | any | `default`, `static`, `private` only |
| access of members | any | public (private helpers allowed) |
| how many per class | one (`extends`) | many (`implements`) |
| models | "is a kind of" | "can do" |
| adding a method later | safe if given a body | safe only as a `default` method |

#### Code

```java
interface Payable {                               // a capability
    long amountDue();
    default boolean isFree() { return amountDue() == 0; }   // default method (Java 8)
}

interface Auditable {
    default String auditTag() { return "audit"; }
}

abstract class Employee implements Payable, Auditable {   // shared state and skeleton
    protected final String name;
    protected Employee(String name) { this.name = name; }
    public abstract long monthlyPay();
    public long amountDue() { return monthlyPay(); }
    public String toString() { return name + ": " + amountDue(); }
}

class Salaried extends Employee {
    private final long salary;
    Salaried(String name, long salary) { super(name); this.salary = salary; }
    public long monthlyPay() { return salary; }
}

class Invoice implements Payable {                // unrelated to Employee, same capability
    private final long total;
    Invoice(long total) { this.total = total; }
    public long amountDue() { return total; }
}

public class Payroll {
    public static void main(String[] args) {
        List<Payable> bills = List.of(new Salaried("Asha", 50000), new Invoice(0));
        long sum = 0;
        for (Payable p : bills) sum += p.amountDue();
        System.out.println(sum + " " + bills.get(1).isFree());   // 50000 true
    }
}
```

`Payroll` depends only on `Payable`. `Invoice` could never extend `Employee`, but it can be paid.

#### The same split in C++ and Python

```cpp
struct Payable {                                  // "interface": only pure virtuals
    virtual ~Payable() = default;
    virtual long long amountDue() const = 0;
};

class Employee : public Payable {                 // abstract class: state + a pure virtual
protected:
    string name;
public:
    explicit Employee(string n) : name(std::move(n)) {}
    virtual long long monthlyPay() const = 0;
    long long amountDue() const override { return monthlyPay(); }
};
```

```python
from abc import ABC, abstractmethod
from typing import Protocol


class Payable(Protocol):          # structural: any class with amount_due() fits
    def amount_due(self) -> int: ...


class Employee(ABC):              # nominal: subclasses must inherit and implement
    def __init__(self, name):
        self.name = name

    @abstractmethod
    def monthly_pay(self) -> int: ...

    def amount_due(self):
        return self.monthly_pay()
```

#### Worked example: two defaults collide

```java
interface Walker { default String move() { return "walk"; } }
interface Swimmer { default String move() { return "swim"; } }

class Duck implements Walker, Swimmer {
    public String move() {                        // required: the defaults conflict
        return Walker.super.move() + " and " + Swimmer.super.move();
    }
}
```

Without the override, `Duck` does not compile. A method inherited from a superclass always beats an interface default ("class wins").

#### When to use which

- Start with an interface for anything other code will depend on.
- Add an abstract class (often called a skeletal implementation, like `AbstractList`) when several implementations share real code.
- Avoid abstract classes whose only purpose is a common type; that is an interface's job.

Connects to: abstraction, the diamond problem, interface segregation principle, dependency inversion principle.

### questions
Q: What are the main differences between an abstract class and an interface in Java?
A: An abstract class can have instance fields, constructors and methods of any access level, and a class can extend only one. An interface has no instance state, only constants, and its methods are public abstract unless they are default, static or private, and a class can implement many interfaces.

Q: When would you choose an abstract class over an interface?
A: When closely related classes share state and implementation, such as a common constructor, fields and a template of steps. An interface is better for a capability that unrelated classes can offer and for the types other code depends on.

Q: Why were default methods added to Java interfaces?
A: So interfaces could gain new methods without breaking every class that already implemented them. Java 8 used them to add methods like forEach and stream to the collection interfaces. They also let interfaces offer convenience methods built on their abstract ones.

Q: What happens if a class implements two interfaces with the same default method?
A: The class must override the method, otherwise it does not compile. Inside the override it can pick one or both versions with InterfaceName.super.method(). If a superclass provides the method, the class's inherited version wins over interface defaults.

Q: How do you express an interface in C++?
A: With a class that has only pure virtual functions and a virtual destructor, and no data members. Classes implement it by inheriting publicly and overriding every pure virtual function. C++ allows inheriting several such interfaces.

## oop.pillars.the-diamond-problem
name: "The diamond problem"
importance: important
prereqs: [oop.pillars.inheritance]
scope: "multiple inheritance ambiguity, virtual inheritance in C++, interfaces in Java"

### simple
The diamond problem happens when a class inherits from two parents that share the same grandparent. It is like a child whose two parents each hand them a copy of the same family recipe book: which copy should they use, and should they even have two? Languages solve it by keeping just one shared grandparent or by forcing you to choose.

### interview
- Shape: `A` at the top, `B` and `C` both derive from `A`, and `D` derives from both `B` and `C`. Draw it and it is a diamond.
- **C++ without virtual inheritance**: `D` contains **two** `A` subobjects, so `d.x` and converting `D*` to `A*` are ambiguous; you must write `d.B::x`.
- **C++ virtual inheritance** (`class B : virtual public A`): `D` has **one shared** `A`. The **most derived class** (`D`) constructs `A` directly; calls from `B` and `C` to `A`'s constructor are ignored. It adds a small cost (an extra pointer or offset per object and indirect access).
- **Java** avoids it for state: a class extends one class but may implement many interfaces. Conflicting **default methods** must be overridden, choosing with `B.super.m()`.
- **Python** allows it and resolves methods with the **MRO** (C3 linearization): for `class D(B, C)` it is `D, B, C, A, object`, and cooperative `super()` calls each class once.

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

#### Java: interfaces and defaults

Java allows only one superclass, so there is never a duplicated field. Interfaces can still form a diamond of **behavior** through default methods:

```java
interface Device { default String name() { return "device"; } }
interface Printer extends Device { default String name() { return "printer"; } }
interface Scanner extends Device { default String name() { return "scanner"; } }

class Copier implements Printer, Scanner {
    public String name() { return Printer.super.name() + "+" + Scanner.super.name(); }
}
```

If only `Printer` overrode `name`, `Copier` would use `Printer`'s version without complaint: the more specific interface wins.

#### Python: method resolution order

```python
class Device:
    def __init__(self):
        print("Device")


class Printer(Device):
    def __init__(self):
        print("Printer")
        super().__init__()


class Scanner(Device):
    def __init__(self):
        print("Scanner")
        super().__init__()


class Copier(Printer, Scanner):
    def __init__(self):
        print("Copier")
        super().__init__()


Copier()     # Copier, Printer, Scanner, Device: each once
print([k.__name__ for k in Copier.__mro__])   # ['Copier', 'Printer', 'Scanner', 'Device', 'object']
```

`super()` means "the next class in the MRO of the object", not "my parent". That is why `Printer`'s `super().__init__()` calls `Scanner` here.

#### Takeaways

- Multiple inheritance of **interfaces** is harmless and common. Multiple inheritance of **state** is where diamonds hurt.
- In C++, reach for virtual inheritance only when a shared base truly must be one object (as with `std::iostream` from `istream` and `ostream`).
- Composition sidesteps the whole issue.

Connects to: inheritance, abstract class vs interface, composition over inheritance.

### questions
Q: What is the diamond problem?
A: It arises when a class inherits from two classes that share a common base. The derived class may end up with two copies of the base's state, and calls to the base's members become ambiguous because the compiler cannot tell which path to use.

Q: How does virtual inheritance solve the diamond problem in C++?
A: Declaring the middle classes with virtual inheritance makes them share a single base subobject, so the most derived class has exactly one copy of the base. The most derived class is then responsible for calling the virtual base's constructor, and the middle classes' calls to it are ignored.

Q: Why doesn't Java have the diamond problem with classes?
A: A Java class can extend only one class, so it can never inherit two copies of the same state. It can implement many interfaces, and if two supply the same default method, the class must override it and can choose one with InterfaceName.super.method().

Q: How does Python decide which parent method to call with multiple inheritance?
A: It uses the method resolution order, computed with C3 linearization, which lists each class once, with children before parents and parents in the order written. For class D(B, C) where both extend A, the order is D, B, C, A, object, and super() moves to the next class in that list.

## oop.pillars.method-overloading-vs-overriding
name: "Method overloading vs overriding"
importance: important
prereqs: [oop.pillars.polymorphism]
scope: "rules, return types, covariant returns"

### simple
Overloading is giving several methods the same name but different inputs, and overriding is a child class replacing a method it inherited. A coffee machine with separate buttons for "espresso" and "espresso with a size" is overloading. A newer model that makes its espresso differently when you press the same button is overriding.

### interview
- **Overloading**: same name, **different parameter lists** (number, types or order), usually in the same class. Resolved at **compile time** from the argument types. Return type alone cannot distinguish overloads.
- **Overriding**: a subclass redefines an inherited virtual method with the **same signature**. Resolved at **runtime** from the object's type.
- **Covariant return types**: an override may return a **subtype** of the base method's return type (a derived pointer or reference in C++, a subclass in Java). Primitive return types must match exactly.
- Java override rules: cannot reduce visibility, cannot throw broader **checked** exceptions, cannot override `static`, `final` or `private` methods. Use `@Override`.
- C++ rules: the base method must be `virtual`; use `override`. **Name hiding**: declaring `f(double)` in a derived class hides every base `f` overload unless you add `using Base::f;`.
- Python has no overloading (a second `def` replaces the first); use default arguments, `*args` or `functools.singledispatch`. Overriding works as usual.

### deep
#### Side by side

| | overloading | overriding |
|---|---|---|
| where | same class (or scope) | base and derived class |
| signature | must differ in parameters | must match |
| return type | free, but cannot be the only difference | same or covariant |
| resolved | compile time, static types | runtime, dynamic type |
| polymorphism | compile-time | runtime |

#### Overloading

```cpp
struct Printer {
    string show(int x) { return "int " + to_string(x); }
    string show(double x) { return "double"; }
    string show(const string& s) { return "string " + s; }
    // int show(int x);          // error: differs only in return type
};
```

The compiler picks the best match for the arguments' static types. Surprises come from conversions: `show('a')` promotes `char` to `int`, and `show(5L)` is ambiguous (a `long` converts equally well to `int` and `double`).

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

#### Name hiding in C++ (worked example)

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

#### Java rules

```java
class Shape {
    protected Shape copy() throws IOException { return new Shape(); }
}

class Circle extends Shape {
    @Override
    public Circle copy() { return new Circle(); }   // wider access, covariant return, fewer exceptions: all allowed
    // private Shape copy() {...}                 // error: reduces visibility
    // Shape copy() throws Exception {...}        // error: broader checked exception
}
```

Overloads are chosen from static types, overrides from the runtime type, and the two combine in surprising ways: with `void greet(Object o)` and `void greet(String s)`, calling `greet(x)` where `Object x = "hi"` picks the `Object` version.

#### Python

```python
from functools import singledispatch


@singledispatch
def describe(x):
    return "something"


@describe.register
def _(x: int):
    return "an int"


@describe.register
def _(x: str):
    return "a string"


print(describe(3), describe("a"), describe(2.5))   # an int a string something
```

Connects to: polymorphism, inheritance, Liskov substitution principle, prototype pattern.

### questions
Q: What is the difference between method overloading and overriding?
A: Overloading defines several methods with the same name but different parameter lists, and the compiler picks one from the argument types. Overriding redefines an inherited method with the same signature in a subclass, and the choice is made at runtime from the object's actual type.

Q: Can two overloads differ only in return type?
A: No, in both C++ and Java. The compiler selects an overload from the arguments at the call site, and the return type is not part of that decision, so two methods with identical parameter lists are a duplicate definition.

Q: What is a covariant return type?
A: An overriding method may declare a return type that is a subtype of the overridden method's return type, such as Dog pointer instead of Animal pointer in C++ or Circle instead of Shape in Java. Callers using the derived type then need no cast, and callers using the base type still get a valid object.

Q: What rules must a Java override follow?
A: Same name and parameter types, a return type that is the same or covariant, access that is the same or wider, and no new or broader checked exceptions. Static, final and private methods cannot be overridden. The Override annotation makes the compiler check all this.

Q: What is name hiding in C++?
A: If a derived class declares a function with the same name as base class functions, it hides all the base overloads of that name, even ones with different parameters. Calls then consider only the derived versions. Writing using Base::name in the derived class brings the base overloads back.
