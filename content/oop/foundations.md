---
topic: oop.foundations
name: "OOP foundations"
subject: oop
order: 1
prereqs: []
---

## oop.foundations.classes-and-objects
name: "Classes and objects"
importance: must
scope: "state and behavior, instances, `this`"

### simple
A class is a blueprint, and an object is one thing built from it. A cookie cutter (the class) decides the shape, and every cookie you press out (an object) has its own sprinkles. Each object keeps its own data but shares the same set of actions defined by the class.

### interview
- A **class** bundles **state** (fields, also called attributes or data members) with **behavior** (methods that read and change that state).
- An **object** is an **instance** of a class: it has its own copy of every instance field, while the method code is shared by all instances.
- `this` (C++ pointer, Java reference) or `self` (Python, passed explicitly) refers to the object the method was called on; use it to tell a field from a parameter with the same name or to return the object for chaining.
- Where objects live: C++ objects can sit on the stack, in static storage or on the heap; Java objects always live on the heap and variables hold references; in Python every value is an object and names are references to it.
- In C++, `struct` and `class` differ only in default access (public vs private); an empty class still has size 1 so distinct objects have distinct addresses.
- **Identity vs equality**: two objects with equal fields are still two objects (`&a != &b`, `a is not b`, `a != b` for Java references).

### deep
#### Intuition

Before classes, you would keep a bank balance in one variable and write free functions that take it as an argument. Nothing stops some other code from setting the balance to a negative number. A class puts the data and the only functions allowed to touch it in one place, so the rules live next to the data they protect.

#### The formal idea

A class defines a new type. Declaring a variable of that type creates an object with its own storage for every instance field. Calling `acct.deposit(50)` is really a call to one shared function with a hidden first argument, the address of `acct`. That hidden argument is `this` in C++ and Java and the explicit `self` in Python.

#### Worked example

Two accounts built from one class keep separate state.

| step | code | a.balance | b.balance |
|---|---|---|---|
| 1 | `Account a("Asha", 100)` | 100 | - |
| 2 | `Account b("Ben", 20)` | 100 | 20 |
| 3 | `a.deposit(50)` | 150 | 20 |
| 4 | `b.withdraw(30)` | 150 | 20 (refused) |

Step 3 runs `deposit` with `this == &a`, so only `a` changes. Step 4 is refused because the class checks its own rule.

#### Code

```cpp
class Account {
    string owner;
    long long balance;               // private: only methods below can change it
public:
    Account(string owner, long long balance) : owner(std::move(owner)), balance(balance) {}
    Account& deposit(long long amount) {
        if (amount > 0) this->balance += amount;   // this-> is optional here
        return *this;                               // returning *this allows chaining
    }
    bool withdraw(long long amount) {
        if (amount <= 0 || amount > balance) return false;
        balance -= amount;
        return true;
    }
    long long getBalance() const { return balance; }  // const: promises not to change state
};

int main() {
    Account a("Asha", 100), b("Ben", 20);
    a.deposit(50).deposit(10);          // a: 160
    bool ok = b.withdraw(30);           // false, b stays 20
    cout << a.getBalance() << " " << b.getBalance() << " " << ok << "\n";  // 160 20 0
}
```

```python
class Account:
    def __init__(self, owner, balance):
        self.owner = owner          # instance attributes live on each object
        self._balance = balance

    def deposit(self, amount):
        if amount > 0:
            self._balance += amount
        return self                 # allows chaining

    def withdraw(self, amount):
        if amount <= 0 or amount > self._balance:
            return False
        self._balance -= amount
        return True

    @property
    def balance(self):
        return self._balance


a, b = Account("Asha", 100), Account("Ben", 20)
a.deposit(50).deposit(10)
print(a.balance, b.balance, b.withdraw(30))  # 160 20 False
```

#### Why `this` matters

- **Name clashes**: in a constructor `Point(int x) { this->x = x; }` the parameter hides the field, so `this->x` names the field. A member initializer list (`: x(x)`) avoids the problem.
- **Chaining**: returning `*this` (C++) or `this` (Java) or `self` (Python) lets builders and fluent APIs chain calls.
- **Passing yourself**: an object can register itself with another, as in `button.addListener(this)`.
- In a C++ `const` method, `this` is a pointer to const, so the method cannot change fields.

#### Common mistakes

- Forgetting `self` as the first parameter of a Python method, or writing `balance` instead of `self.balance` (that makes a local variable).
- Confusing the class with an object: calling an instance method on the class name.
- Comparing objects with `==` in Java, which compares references, not contents.
- Making every field public, which throws away the reason to have a class.

Connects to: constructors, access modifiers, encapsulation, static members.

### questions
Q: What is the difference between a class and an object?
A: A class is a type definition: it lists the fields and methods. An object is a concrete instance of that type, with its own values for the instance fields. Many objects can be created from one class, and they share the method code but not the data.

Q: What does this refer to, and when do you need to write it?
A: It refers to the object the current method was called on. You need it when a parameter or local variable has the same name as a field, when returning the object for method chaining, or when passing the current object to another function. In Python the equivalent is self and it must always be written.

Q: Where is an object stored in C++ compared with Java?
A: In C++ an object can live on the stack, in static storage, or on the heap if created with new. In Java every object is on the heap and variables only hold references to it; the garbage collector frees it once nothing refers to it.

Q: What is the difference between a struct and a class in C++?
A: Only the default access. Members and base classes of a struct are public by default, while those of a class are private. By convention, struct is used for plain data and class for types that protect an invariant.

Q: Two objects have exactly the same field values. Are they the same object?
A: No. They are equal in value but have different identities, meaning different memory locations. Java's == on references and Python's is test identity, while equals and == (with __eq__) test value equality when a class defines it.

## oop.foundations.constructors-and-destructors
name: "Constructors and destructors"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "default, parameterized, copy constructors, initialization order"

### simple
A constructor is the setup routine that runs the moment an object is created, and a destructor is the cleanup routine that runs when it goes away. Think of checking into a hotel: at check-in you get a key and a made bed, and at checkout the room is cleaned for the next guest. Constructors make sure an object never exists in a half-built state.

### interview
- A **constructor** has the class's name and no return type; it establishes the object's invariants. Kinds: **default** (no arguments), **parameterized**, **copy** (`T(const T&)` in C++), and in C++11 **move** and **delegating** constructors.
- The compiler writes a default constructor only when you declare **no** constructor at all (C++ and Java alike).
- C++ **initialization order**: base classes first, then members **in declaration order** (not the order in the initializer list), then the constructor body. Destruction runs in exactly the reverse order.
- Use the **member initializer list** for `const` members, references, members without a default constructor and base class arguments; it initializes directly instead of assigning afterwards.
- A C++ **destructor** `~T()` runs automatically at scope exit or on `delete`; that is the basis of RAII. Java has no destructors (use `try`-with-resources; `finalize` is deprecated), and Python's `__del__` has no timing guarantee, so use `with`.
- Mark single-argument C++ constructors `explicit` to stop surprise implicit conversions.
- Calling a virtual method from a constructor: C++ calls the version of the class being built (the derived part does not exist yet); Java calls the derived override, which may see uninitialized fields.

### deep
#### Intuition

An object should be valid from the first instant anyone can see it. The constructor is the only code that runs before that instant, so it is where you acquire what the object needs (memory, a file, a lock) and check the arguments. The destructor is the matching last step: it gives back whatever the constructor took.

#### Kinds of constructors

```cpp
class Matrix {
    int rows, cols;
    vector<double> data;
public:
    Matrix() : Matrix(0, 0) {}                           // default, delegating to the next one
    Matrix(int r, int c) : rows(r), cols(c), data(size_t(r) * c, 0.0) {}  // parameterized
    Matrix(const Matrix& other) = default;              // copy: member-wise copy is right here
    explicit Matrix(int n) : Matrix(n, n) {}            // explicit: no silent int -> Matrix
};
```

The copy constructor runs when an object is initialized from another of the same type: `Matrix b = a;`, passing by value, and returning by value (often removed by copy elision). Assignment to an existing object, `b = a;`, calls the copy **assignment operator** instead.

#### Worked example: initialization order

```cpp
struct Part {
    string name;
    Part(string n) : name(std::move(n)) { cout << "build " << name << "\n"; }
    ~Part() { cout << "destroy " << name << "\n"; }
};
struct Base {
    Base() { cout << "build Base\n"; }
    ~Base() { cout << "destroy Base\n"; }
};
struct Car : Base {
    Part engine;                                  // declared first
    Part wheels;                                  // declared second
    Car() : engine("engine"), wheels("wheels") { cout << "Car body\n"; }
    ~Car() { cout << "Car cleanup\n"; }
};

int main() {
    { Car c; }                                    // c is destroyed at the closing brace
}
```

| output | why |
|---|---|
| build Base | bases are built before members |
| build engine | members in declaration order |
| build wheels | |
| Car body | the body runs last |
| Car cleanup | destructor body runs first |
| destroy wheels | members in reverse declaration order |
| destroy engine | |
| destroy Base | the base goes last |

Writing `Car() : wheels("wheels"), engine("engine")` would change nothing: the order comes from the declarations, and compilers warn about the mismatch (`-Wreorder`). This matters when one member's initializer reads another.

#### The same ideas in Python and Java

```python
class TempFile:
    def __init__(self, path):        # initializer: the object already exists (made by __new__)
        self.path = path
        self.handle = open(path, "w")

    def __enter__(self):
        return self

    def __exit__(self, *exc):        # deterministic cleanup; do not rely on __del__
        self.handle.close()
        return False
```

Java runs the superclass constructor first (an implicit or explicit `super(...)`), then field initializers and instance initializer blocks in the order they appear, then the rest of the constructor body. Static initializers run once, when the class is first initialized.

#### Edge cases and bugs

- Declaring any constructor removes the implicit default one, so `T t;` or `new T()` stops compiling.
- If a constructor throws, the destructor of that object does **not** run, but already-built members and bases are destroyed. That is why raw `new` in a constructor leaks and smart pointers or member objects do not.
- Never let a destructor throw; during stack unwinding a second exception calls `std::terminate`.
- A one-argument constructor without `explicit` lets `Matrix m = 5;` compile by accident.
- Virtual calls in constructors do not reach the derived class in C++.

Connects to: shallow vs deep copy, rule of three and five, object lifecycle, RAII, virtual destructors.

### questions
Q: When does the compiler generate a default constructor?
A: Only when the class declares no constructors at all, in both C++ and Java. As soon as you write any constructor, such as one with parameters, the implicit no-argument constructor disappears, and you must write it yourself or use = default in C++.

Q: In what order are a C++ object's parts constructed and destroyed?
A: Base classes are constructed first, then data members in the order they are declared in the class, then the constructor body runs. Destruction is the exact reverse: destructor body, members in reverse declaration order, then bases. The order written in the member initializer list is ignored.

Q: Why use a member initializer list instead of assigning in the constructor body?
A: The list initializes members directly, while the body can only assign to members that were already default-constructed. It is required for const members, references, members without a default constructor and base class arguments, and it avoids doing the work twice.

Q: When is the copy constructor called?
A: When a new object is initialized from an existing one of the same type: T b = a, T b(a), passing an object by value, and returning one by value (often elided by the compiler). Assigning to an object that already exists calls the copy assignment operator instead.

Q: What happens if you call a virtual function from a C++ constructor?
A: The call goes to the version in the class whose constructor is running, not to a derived override, because the derived part has not been built yet. Java does the opposite and calls the derived override, which can then read fields that are still at their default values. Both are best avoided.

## oop.foundations.access-modifiers
name: "Access modifiers"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "public, private, protected, package-private in Java"

### simple
Access modifiers decide who is allowed to touch each part of a class. A restaurant works the same way: the menu is public, the kitchen is private to the staff, and the recipe book might be shared only with the chefs in training. Keeping the kitchen private means the restaurant can reorganize it without upsetting any customer.

### interview
- **public**: anyone can use it. **private**: only code inside the class (and C++ `friend`s). **protected**: the class and its subclasses (in Java also everything in the same package).
- Java's **package-private** (no keyword) means visible inside the same package only; top-level Java classes are either public or package-private.
- C++ defaults: `class` members are private, `struct` members are public. C++ also has access on inheritance: `public`, `protected` or `private` inheritance caps what the base's members become in the derived class.
- Access is checked **per class, not per object**: a method can read the private fields of another object of the same class (common in copy constructors and `equals`).
- Python has no enforcement: `_name` is a convention for internal, and `__name` triggers name mangling to `_Class__name`.
- Rule of thumb: make fields private, expose the smallest public API that works, and use protected sparingly because subclasses then depend on those details.

### deep
#### Intuition

Every public member is a promise: other code will use it, so you cannot change it without breaking them. Private members are free to change. Access modifiers let you choose which parts are promises and which are details, and the compiler enforces the choice.

#### The four levels in Java

| modifier | same class | same package | subclass in another package | everywhere |
|---|---|---|---|---|
| `public` | yes | yes | yes | yes |
| `protected` | yes | yes | yes | no |
| none (package-private) | yes | yes | no | no |
| `private` | yes | no | no | no |

Protected is wider than many people expect: any class in the same package can use it too.

```java
public class Account {
    private long balance;            // only Account's own code
    long auditCount;                 // package-private: tools in the same package
    protected String currency = "INR";   // subclasses and the package
    public long getBalance() { return balance; }   // the public promise

    public boolean sameBalance(Account other) {
        return this.balance == other.balance;      // allowed: access is per class, not per object
    }
}
```

#### C++: three levels plus inheritance access

```cpp
class Shape {
public:
    double area() const { return computeArea(); }   // public interface
protected:
    virtual double computeArea() const = 0;         // for subclasses to implement
private:
    int id = 0;                                     // nobody outside Shape
    friend void debugPrint(const Shape&);          // a friend may read private members
};

void debugPrint(const Shape& s) { cout << s.id << "\n"; }

class Circle : public Shape {                       // public inheritance keeps Shape's levels
    double r;
public:
    explicit Circle(double r) : r(r) {}
protected:
    double computeArea() const override { return 3.14159265358979 * r * r; }
};
```

The inheritance keyword caps visibility of inherited members:

| base member | `public` inheritance | `protected` inheritance | `private` inheritance |
|---|---|---|---|
| public | public | protected | private |
| protected | protected | protected | private |
| private | not accessible | not accessible | not accessible |

`class D : B` defaults to private inheritance and `struct D : B` to public, a classic source of "why can't I call this" errors.

#### Python conventions

```python
class Account:
    def __init__(self):
        self.owner = "Asha"      # public by convention
        self._limit = 500        # "internal, please don't touch"
        self.__pin = 1234        # mangled to _Account__pin

a = Account()
print(a._limit)                  # works; the underscore is only a signal
print(a._Account__pin)           # works too; mangling avoids clashes, it is not security
```

#### Worked example: why private pays off

Suppose `Account` stores `balance` as a public `double` and fifty files write to it directly. You now need to store paise as a `long` to avoid rounding errors. With a public field you edit fifty files; with a private field and `deposit`, `withdraw` and `getBalance`, you edit one class and nothing else notices.

#### Pitfalls

- Getters and setters for every field give no protection; expose operations (`withdraw`) that keep the rules, not raw state.
- Protected fields leak implementation into every subclass; prefer private fields with protected methods.
- Access control is not a security boundary: reflection in Java, pointer tricks in C++ and plain attribute access in Python can all get around it.
- Returning a reference or pointer to a private mutable member hands out write access anyway.

Connects to: encapsulation, inheritance, abstraction, friend functions.

### questions
Q: What does package-private mean in Java?
A: It is the access level you get when you write no modifier. The member or class is visible to every class in the same package but not to code in other packages, including subclasses there. It is useful for helpers shared by a package's classes that should not be part of its public API.

Q: Who can access a protected member in Java compared with C++?
A: In C++, only the class itself, its friends, and derived classes. In Java, protected also opens the member to every class in the same package, so it is strictly wider than package-private.

Q: Can a method access the private fields of another object of the same class?
A: Yes. Access control in C++ and Java is checked per class, not per object, so code inside a class can read the private members of any instance of that class. Copy constructors and equals methods rely on this.

Q: How does Python handle private members?
A: It does not enforce privacy. A single leading underscore is a convention meaning internal, and a double leading underscore triggers name mangling to _ClassName__name, which avoids accidental clashes in subclasses but can still be accessed deliberately.

Q: What is the default access for class and struct members in C++, and for inheritance?
A: Members of a class and inheritance from a class are private by default, while members of a struct and inheritance from a struct are public by default. That is the only difference between the two keywords.

## oop.foundations.static-members
name: "Static members"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "class-level vs instance-level data and methods"

### simple
A static member belongs to the class itself rather than to any one object. In a school, each student has their own name, but the school's total enrollment is a single number shared by everyone. Static data is that shared number, and a static method is a job anyone can ask the school office to do without picking a student first.

### interview
- A **static field** has one copy for the whole class, shared by every instance; an **instance field** has one copy per object.
- A **static method** has no `this`, so it can use only static members directly (or objects passed to it). It is called on the class: `Math.max`, `Counter::total()`.
- Common uses: counters and ids, constants, caches, factory methods (`Integer.valueOf`), utility functions, singletons.
- C++ details: a non-`const` static data member needs one out-of-class definition unless declared `inline` (C++17); a function-local `static` is initialized once, on first use, and that is thread-safe since C++11.
- Java details: static methods are **hidden**, not overridden (no dynamic dispatch); static initializer blocks run once when the class is initialized.
- Python: class attributes are shared, `@staticmethod` takes no `self`, `@classmethod` takes `cls`. A mutable class attribute (a list) shared by all instances is a classic bug.
- Downsides: static mutable state is global state, hard to test and needs synchronization across threads.

### deep
#### Intuition

Some facts are about the whole kind of thing, not about one instance: how many accounts exist, the interest rate every account uses, the function that parses an account number. Storing those in every object would waste space and invite inconsistency. Static members give them one home, on the class.

#### Worked example: numbering objects

Each new `Ticket` needs a unique id. An instance field cannot know what earlier objects did, but a static counter can.

| action | Ticket::nextId (static) | t.id (instance) |
|---|---|---|
| start | 1 | - |
| `Ticket a;` | 2 | a.id = 1 |
| `Ticket b;` | 3 | b.id = 2 |
| `Ticket c;` | 4 | c.id = 3 |

#### Code

```cpp
class Ticket {
    inline static int nextId = 1;        // C++17: defined here, one copy for the class
    int id;                               // one per object
public:
    Ticket() : id(nextId++) {}
    int getId() const { return id; }
    static int issued() { return nextId - 1; }   // no this: cannot read id here
};

int& requestCount() {
    static int count = 0;                 // initialized once, on first call (thread-safe)
    return count;
}

int main() {
    Ticket a, b, c;
    ++requestCount();
    cout << c.getId() << " " << Ticket::issued() << " " << requestCount() << "\n";  // 3 3 1
}
```

Before C++17 you would write `static int nextId;` inside the class and `int Ticket::nextId = 1;` in exactly one `.cpp` file; forgetting that definition gives a linker error.

```python
class Ticket:
    next_id = 1                          # class attribute, shared

    def __init__(self):
        self.id = Ticket.next_id         # instance attribute
        Ticket.next_id += 1              # update through the class, not self

    @classmethod
    def issued(cls):
        return cls.next_id - 1

    @staticmethod
    def is_valid_id(value):              # no self, no cls: a plain function in the class
        return isinstance(value, int) and value > 0


a, b, c = Ticket(), Ticket(), Ticket()
print(c.id, Ticket.issued(), Ticket.is_valid_id(0))   # 3 3 False
```

#### Two Python traps

```python
class Team:
    members = []                         # one list shared by every Team

    def add(self, name):
        self.members.append(name)        # mutates the shared list


x, y = Team(), Team()
x.add("Asha")
print(y.members)                         # ['Asha']: y sees x's member
```

Fix: create the list in `__init__` (`self.members = []`). The second trap is `self.next_id += 1`: it reads the class attribute, then **creates an instance attribute** that hides it, so the class counter never moves. Update through the class name or `type(self)`.

#### Java notes

```java
class MathUtil {
    static final double TAU = 2 * Math.PI;     // a constant
    static int calls;                           // shared counter
    static { calls = 0; }                       // static initializer: runs once
    static double circumference(double r) { calls++; return TAU * r; }
}
```

A static method with the same signature in a subclass **hides** the parent's; which one runs depends on the declared type at compile time, not the object, so there is no polymorphism.

#### Pitfalls

- Static mutable data is shared across threads; guard it with a lock or an atomic.
- Tests that touch static state affect each other unless they reset it.
- C++'s static initialization order across different source files is unspecified; a static in one file that reads a static in another may see it unbuilt. A function-local static avoids this.
- Instance methods can read static members, but static methods cannot read instance members without an object.

Connects to: classes and objects, singleton, factory method, immutability.

### questions
Q: What is the difference between a static field and an instance field?
A: A static field has a single copy that belongs to the class and is shared by all instances. An instance field has a separate copy in each object. Changing a static field through one object is visible from every other object.

Q: Why can't a static method access instance fields directly?
A: A static method is not called on any object, so it has no this or self to say whose fields to read. It can work with instance data only if an object is passed to it as an argument.

Q: Can static methods be overridden in Java?
A: No. A subclass can declare a static method with the same signature, but that hides the parent's method rather than overriding it. Which one runs is decided at compile time from the declared type, so there is no runtime polymorphism.

Q: What goes wrong with a list defined as a class attribute in Python?
A: The list is created once, when the class is defined, and every instance shares it. Appending through one instance changes what all the others see. Mutable per-object state should be created in __init__.

Q: When is a function-local static variable initialized in C++?
A: The first time control passes through its declaration. Since C++11 that initialization is guaranteed to happen exactly once even if several threads arrive together, which makes it a simple way to build lazily created shared objects.

## oop.foundations.object-lifecycle
name: "Object lifecycle"
importance: important
prereqs: [oop.foundations.constructors-and-destructors]
scope: "creation, copying, destruction, garbage collection vs manual cleanup"

### simple
Every object is born, used, maybe copied, and eventually removed, and languages differ in who cleans up at the end. In C++ you are like a camper who must pack out their own tent, while Java and Python send a park ranger around to collect whatever nobody is using anymore. The ranger is convenient, but you never know exactly when they will come by.

### interview
- **Creation**: memory is allocated (stack, heap or static storage), then the constructor runs. **Use**: the object may be copied or moved. **Destruction**: cleanup runs and the memory is reclaimed.
- **C++**: destruction is deterministic. Stack objects die at the end of their scope (in reverse order), heap objects on `delete` or when their owning smart pointer goes away, statics at program exit. **RAII** ties any resource (file, lock, socket) to an object's lifetime.
- **Java**: a tracing, usually generational **garbage collector** frees objects that are no longer reachable from the roots (stacks, statics). Timing is unpredictable, so release non-memory resources with `try`-with-resources on `AutoCloseable`; finalizers are deprecated.
- **Python (CPython)**: **reference counting** frees an object as soon as its count hits zero, and a cycle collector handles reference cycles. Use `with` for resources.
- Bugs by model: C++ has leaks, dangling pointers, double frees and use-after-free; GC languages still leak through lingering references (static caches, unremoved listeners).

### deep
#### Three phases

1. **Birth**: the runtime finds memory for the object, then its constructor turns that raw memory into a valid object.
2. **Life**: the object is used, passed around, copied (a new object with the same value) or moved (its resources handed to a new object, C++11).
3. **Death**: cleanup code runs (a destructor, a `close`, an `__exit__`) and the memory is returned.

The languages differ most in phase 3.

#### C++: you decide when

```cpp
struct Resource {
    string name;
    explicit Resource(string n) : name(std::move(n)) { cout << "open " << name << "\n"; }
    ~Resource() { cout << "close " << name << "\n"; }
};

int main() {
    Resource a("a");                                  // automatic storage
    {
        Resource b("b");
        auto c = make_unique<Resource>("c");          // heap, owned by a unique_ptr
    }                                                 // prints: close c, close b
    auto d = make_shared<Resource>("d");
    auto e = d;                                       // two owners share d
    d.reset();                                        // still alive: e owns it
}                                                     // prints: close d, close a
```

With raw `new`, forgetting `delete` leaks, deleting twice is undefined behavior, and using the pointer afterwards is use-after-free. Smart pointers and RAII make destruction automatic while keeping it deterministic.

#### Java: the collector decides when

An object becomes garbage once no chain of references leads to it from a **GC root** (thread stacks, static fields, JNI references). Collectors trace from the roots, keep everything they reach and reclaim the rest. Most objects die young, so generational collectors scan the young generation often and the old generation rarely. Memory is handled; files and sockets are not, because nobody knows when collection will run:

```java
static String firstLine(String path) throws IOException {
    try (var reader = new BufferedReader(new FileReader(path))) {
        return reader.readLine();
    }   // reader.close() runs here, even if readLine threw
}
```

#### Python: counts plus a cycle detector

```python
import sys

class Node:
    def __init__(self):
        self.other = None

a = Node()
print(sys.getrefcount(a))   # 2: the name a plus the temporary argument
b = Node()
a.other, b.other = b, a     # a cycle: counts never reach zero on their own
del a, b                    # the cycle collector (gc module) reclaims them later
```

#### Comparison

| | C++ | Java | Python (CPython) |
|---|---|---|---|
| Reclaiming memory | you (RAII, smart pointers) | tracing GC | reference counting plus cycle GC |
| When cleanup runs | exactly at scope exit or `delete` | unknown | usually at once, cycles later |
| Resource cleanup | destructors | `try`-with-resources | `with` |
| Typical bug | dangling pointer, leak | leak through a lingering reference | cycles with `__del__`, leaks via globals |

#### Leaks in garbage-collected code

A GC frees only unreachable objects. An ever-growing static map used as a cache, a listener that was registered and never removed, or a thread-local that is never cleared keeps objects reachable forever. The fix is to remove the reference, bound the cache, or use weak references (`WeakHashMap`, `weakref`).

Connects to: constructors and destructors, shallow vs deep copy, virtual destructors, memory management in the OS.

### questions
Q: What is RAII?
A: Resource Acquisition Is Initialization: a C++ idiom where an object acquires a resource in its constructor and releases it in its destructor. Because destructors run automatically when the object goes out of scope, even during exceptions, the resource can never be forgotten. std::lock_guard, std::unique_ptr and file streams all work this way.

Q: When does Java free an object?
A: At some point after it becomes unreachable, meaning no chain of references leads to it from a GC root such as a thread's stack or a static field. The exact time depends on the collector and memory pressure, so Java code must not rely on it for releasing files, sockets or locks.

Q: How does CPython decide when to free an object?
A: Each object keeps a reference count, and it is freed as soon as the count drops to zero. Reference cycles never reach zero on their own, so a separate cycle collector periodically finds and frees unreachable groups of objects.

Q: Can a garbage-collected program leak memory?
A: Yes. The collector frees only unreachable objects, so anything still referenced stays alive: a static cache that only grows, listeners that are never unregistered, or long-lived collections holding old entries. The fix is to drop the references, bound the cache or use weak references.

Q: Why are finalizers a poor way to release resources?
A: They run at an unpredictable time, maybe never before the program exits, and can slow collection or even resurrect objects. Java deprecated finalize for removal. Explicit close through try-with-resources, or destructors in C++, release resources at a known point.
