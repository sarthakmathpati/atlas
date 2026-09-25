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
- A **class** bundles **state** (data members, also called fields) with **behavior** (member functions that read and change that state).
- An **object** is an **instance** of a class: it has its own copy of every non-static data member, while the member function code is shared by all instances.
- `this` is a pointer to the object a member function was called on; use it to tell a member from a parameter with the same name, or return `*this` to allow chaining.
- Objects can live on the **stack** (automatic storage), in **static storage** or on the **heap** (`new`, `make_unique`); a variable of class type is the object itself, not a reference to it.
- `struct` and `class` differ only in default access (public vs private); an empty class still has size 1 so distinct objects have distinct addresses.
- **Identity vs equality**: two objects with equal members are still two objects: `&a != &b`, while `a == b` compares values only if the class defines `operator==`.

### deep
#### Intuition

Before classes, you would keep a bank balance in one variable and write free functions that take it as an argument. Nothing stops some other code from setting the balance to a negative number. A class puts the data and the only functions allowed to touch it in one place, so the rules live next to the data they protect.

#### The formal idea

A class defines a new type. Declaring a variable of that type creates an object with its own storage for every data member. Calling `acct.deposit(50)` is really a call to one shared function with a hidden first argument, the address of `acct`; inside the function that hidden argument is called `this`.

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
    long long balance;               // private: only member functions can change it
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

#### Why `this` matters

- **Name clashes**: in a constructor `Point(int x) { this->x = x; }` the parameter hides the member, so `this->x` names the member. A member initializer list (`: x(x)`) avoids the problem.
- **Chaining**: returning `*this` by reference lets builders and fluent interfaces chain calls.
- **Passing yourself**: an object can register itself with another, as in `button.addListener(this)`.
- In a `const` member function, `this` is a pointer to const, so the function cannot change members.

#### Common mistakes

- Writing `Account a();` to create an object: it declares a function returning `Account` (the "most vexing parse"). Write `Account a;` or `Account a{};`.
- Confusing the class with an object: calling a non-static member function without an object.
- Comparing two objects with `==` when the class has no `operator==` (it does not compile; C++20 can default it), or comparing pointers, which compares addresses, not contents.
- Making every data member public, which throws away the reason to have a class.

Connects to: constructors, access modifiers, encapsulation, static members.

### questions
Q: What is the difference between a class and an object?
A: A class is a type definition: it lists the data members and member functions. An object is a concrete instance of that type, with its own values for the data members. Many objects can be created from one class, and they share the function code but not the data.

Q: What does this refer to, and when do you need to write it?
A: It is a pointer to the object the current member function was called on. You need it when a parameter or local variable has the same name as a member, when returning *this for method chaining, or when passing the current object to another function.

Q: Where can a C++ object be stored?
A: On the stack as a local variable, which is destroyed at the end of its scope; in static storage as a global or static variable, which lives until the program ends; or on the heap when created with new or make_unique, where it lives until it is deleted or its owning smart pointer goes away.

Q: What is the difference between a struct and a class in C++?
A: Only the default access. Members and base classes of a struct are public by default, while those of a class are private. By convention, struct is used for plain data and class for types that protect an invariant.

Q: Two objects have exactly the same member values. Are they the same object?
A: No. They are equal in value but have different identities, meaning different memory locations, so their addresses differ. a == b compares values only if the class defines operator==, while comparing &a and &b compares identity.

## oop.foundations.constructors-and-destructors
name: "Constructors and destructors"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "default, parameterized, copy constructors, initialization order"

### simple
A constructor is the setup routine that runs the moment an object is created, and a destructor is the cleanup routine that runs when it goes away. Think of checking into a hotel: at check-in you get a key and a made bed, and at checkout the room is cleaned for the next guest. Constructors make sure an object never exists in a half-built state.

### interview
- A **constructor** has the class's name and no return type; it establishes the object's invariants. Kinds: **default** (no arguments), **parameterized**, **copy** (`T(const T&)`), and since C++11 **move** (`T(T&&)`) and **delegating** constructors.
- The compiler writes a default constructor only when you declare **no** constructor at all; `= default` brings it back.
- **Initialization order**: base classes first, then members **in declaration order** (not the order in the initializer list), then the constructor body. Destruction runs in exactly the reverse order.
- Use the **member initializer list** for `const` members, references, members without a default constructor and base class arguments; it initializes directly instead of assigning afterwards.
- A **destructor** `~T()` runs automatically at scope exit, on `delete`, or when an owning smart pointer lets go; that is the basis of **RAII** (acquire in the constructor, release in the destructor).
- Mark single-argument constructors `explicit` to stop surprise implicit conversions.
- A virtual call inside a constructor or destructor goes to the class being built or destroyed, never to a derived override.

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

#### RAII: the destructor as guaranteed cleanup

```cpp
class File {
    FILE* f;
public:
    File(const char* path, const char* mode) : f(fopen(path, mode)) {
        if (!f) throw runtime_error(string("cannot open ") + path);
    }
    ~File() { fclose(f); }                       // runs on every way out of the scope
    File(const File&) = delete;                  // one owner: a copy would close twice
    File& operator=(const File&) = delete;
    void write(const string& s) { fputs(s.c_str(), f); }
};

void logLine(const string& msg) {
    File out("app.log", "a");
    out.write(msg + "\n");
    if (msg.empty()) throw invalid_argument("empty message");   // the file still closes
}                                                                // ~File runs here
```

#### Edge cases and bugs

- Declaring any constructor removes the implicit default one, so `T t;` or `new T()` stops compiling.
- If a constructor throws, the destructor of that object does **not** run, but already-built members and bases are destroyed. That is why raw `new` in a constructor leaks and smart pointers or member objects do not.
- Never let a destructor throw; during stack unwinding a second exception calls `std::terminate`.
- A one-argument constructor without `explicit` lets `Matrix m = 5;` compile by accident.

Connects to: shallow vs deep copy, rule of three and five, object lifecycle, RAII, virtual destructors.

### questions
Q: When does the compiler generate a default constructor?
A: Only when the class declares no constructors at all. As soon as you write any constructor, such as one with parameters, the implicit default constructor disappears, and you must write it yourself or bring it back with = default.

Q: In what order are a C++ object's parts constructed and destroyed?
A: Base classes are constructed first, then data members in the order they are declared in the class, then the constructor body runs. Destruction is the exact reverse: destructor body, members in reverse declaration order, then bases. The order written in the member initializer list is ignored.

Q: Why use a member initializer list instead of assigning in the constructor body?
A: The list initializes members directly, while the body can only assign to members that were already default-constructed. It is required for const members, references, members without a default constructor and base class arguments, and it avoids doing the work twice.

Q: When is the copy constructor called?
A: When a new object is initialized from an existing one of the same type: T b = a, T b(a), passing an object by value, and returning one by value (often elided by the compiler). Assigning to an object that already exists calls the copy assignment operator instead.

Q: What happens if you call a virtual function from a C++ constructor?
A: The call goes to the version in the class whose constructor is running, not to a derived override, because the derived part has not been built yet. The same happens in destructors, where the derived part is already gone. Such calls are best avoided.

## oop.foundations.access-modifiers
name: "Access modifiers"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "public, private, protected, friends and struct defaults in C++"

### simple
Access modifiers decide who is allowed to touch each part of a class. A restaurant works the same way: the menu is public, the kitchen is private to the staff, and the recipe book might be shared only with the chefs in training. Keeping the kitchen private means the restaurant can reorganize it without upsetting any customer.

### interview
- **public**: anyone can use it. **private**: only the class's own members and its `friend`s. **protected**: the class, its friends and its derived classes.
- Defaults: `class` members are private, `struct` members are public. Inheritance has access too: `public`, `protected` or `private` inheritance caps what the base's members become in the derived class.
- Access is checked **per class, not per object**: a member function can read the private members of another object of the same class (common in copy constructors and `operator==`).
- A **friend** function or class is granted access to private members; friendship is given by the class, and is not inherited or transitive.
- Some languages add a **package-private** level (visible to one package). C++ has no packages; its tools for "internal to this part of the code" are `friend`, private headers, and unnamed namespaces for file-local helpers.
- Rule of thumb: make data members private, expose the smallest public interface that works, and use protected sparingly because derived classes then depend on those details.

### deep
#### Intuition

Every public member is a promise: other code will use it, so you cannot change it without breaking them. Private members are free to change. Access modifiers let you choose which parts are promises and which are details, and the compiler enforces the choice.

#### Who can use a member

| access | the class itself | friends | derived classes | everyone else |
|---|---|---|---|---|
| `public` | yes | yes | yes | yes |
| `protected` | yes | yes | yes (through their own objects) | no |
| `private` | yes | yes | no | no |

"Through their own objects": inside `Circle`, a protected member of `Shape` can be used on a `Circle`, but not on some unrelated `Shape` object.

#### Code

```cpp
class Shape {
public:
    double area() const { return computeArea(); }   // public interface
    bool sameId(const Shape& other) const { return id == other.id; }  // per class, not per object
protected:
    virtual double computeArea() const = 0;         // for derived classes to implement
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

The inheritance keyword caps the visibility of inherited members:

| base member | `public` inheritance | `protected` inheritance | `private` inheritance |
|---|---|---|---|
| public | public | protected | private |
| protected | protected | protected | private |
| private | not accessible | not accessible | not accessible |

`class D : B` defaults to private inheritance and `struct D : B` to public, a classic source of "why can't I call this" errors.

#### Internal to a file, not to a class

What other languages call package-private, C++ approximates at the file level. An unnamed namespace (or `static` at namespace scope) makes a helper invisible outside its `.cpp` file:

```cpp
namespace {                                        // internal linkage: this file only
    bool validAmount(long long x) { return x > 0; }
}

bool deposit(long long& balance, long long x) {
    if (!validAmount(x)) return false;
    balance += x;
    return true;
}
```

#### Worked example: why private pays off

Suppose `Account` stores `balance` as a public `double` and fifty files write to it directly. You now need to store paise as a `long long` to avoid rounding errors. With a public member you edit fifty files; with a private member and `deposit`, `withdraw` and `getBalance`, you edit one class and nothing else notices.

#### Pitfalls

- Getters and setters for every member give no protection; expose operations (`withdraw`) that keep the rules, not raw state.
- Protected data leaks implementation into every derived class; prefer private data with protected member functions.
- Access control protects against mistakes, not attackers: pointer casts can reach private data.
- Returning a non-const reference or pointer to a private member hands out write access anyway.

Connects to: encapsulation, inheritance, abstraction, friend functions.

### questions
Q: Who can access a protected member in C++?
A: The class itself, its friends, and classes derived from it. A derived class may use the protected member only through objects of its own type or types derived from it, not through an arbitrary base-class object.

Q: What does private inheritance mean?
A: The base's public and protected members become private members of the derived class, and outside code cannot convert a Derived to a Base. It models "implemented in terms of" rather than "is a", and composition usually expresses that more clearly.

Q: Can a member function access the private members of another object of the same class?
A: Yes. Access control is checked per class, not per object, so code inside a class can read the private members of any instance of that class. Copy constructors and comparison operators rely on this.

Q: What is a friend, and when is it reasonable to use one?
A: A function or class that a class explicitly allows to access its private and protected members. It is reasonable for operators such as operator<< that need the class's data, or for a tightly coupled helper class. Friendship is not inherited and not transitive.

Q: What is the default access for class and struct members in C++, and for inheritance?
A: Members of a class and inheritance from a class are private by default, while members of a struct and inheritance from a struct are public by default. That is the only difference between the two keywords.

## oop.foundations.static-members
name: "Static members"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "class-level vs instance-level data and methods"

### simple
A static member belongs to the class itself rather than to any one object. In a school, each student has their own name, but the school's total enrollment is a single number shared by everyone. Static data is that shared number, and a static function is a job anyone can ask the school office to do without picking a student first.

### interview
- A **static data member** has one copy for the whole class, shared by every instance; a non-static data member has one copy per object.
- A **static member function** has no `this`, so it can use only static members directly (or objects passed to it). Call it on the class: `Counter::total()`, `std::numeric_limits<int>::max()`.
- Common uses: counters and ids, constants, caches, factory functions (`Widget::create()`), utility functions, singletons.
- A non-`const` static data member needs one out-of-class definition unless declared `inline` (C++17); `static constexpr` members are implicitly inline.
- A function-local `static` is initialized once, the first time control reaches it, and that is thread-safe since C++11.
- Static member functions cannot be `virtual` or `const`. At namespace scope, `static` means something else: **internal linkage** (visible only in that file).
- Downsides: static mutable state is global state, hard to test and needs synchronization across threads.

### deep
#### Intuition

Some facts are about the whole kind of thing, not about one instance: how many accounts exist, the interest rate every account uses, the function that parses an account number. Storing those in every object would waste space and invite inconsistency. Static members give them one home, on the class.

#### Worked example: numbering objects

Each new `Ticket` needs a unique id. A non-static member cannot know what earlier objects did, but a static counter can.

| action | Ticket::nextId (static) | t.id (per object) |
|---|---|---|
| start | 1 | - |
| `Ticket a;` | 2 | a.id = 1 |
| `Ticket b;` | 3 | b.id = 2 |
| `Ticket c;` | 4 | c.id = 3 |

#### Code

```cpp
class Ticket {
    inline static int nextId = 1;        // C++17: defined here, one copy for the class
    static constexpr int MAX_ID = 1'000'000;
    int id;                               // one per object
public:
    Ticket() : id(nextId++) {}
    int getId() const { return id; }
    static int issued() { return nextId - 1; }   // no this: cannot read id here
    static bool valid(int value) { return value > 0 && value <= MAX_ID; }
};

int& requestCount() {
    static int count = 0;                 // initialized once, on first call (thread-safe)
    return count;
}

int main() {
    Ticket a, b, c;
    ++requestCount();
    cout << c.getId() << " " << Ticket::issued() << " " << Ticket::valid(0) << " "
         << requestCount() << "\n";       // 3 3 0 1
}
```

Before C++17 you would write `static int nextId;` inside the class and `int Ticket::nextId = 1;` in exactly one `.cpp` file; forgetting that definition gives a linker error.

#### The meanings of `static`

| where | meaning |
|---|---|
| data member | one copy shared by the whole class |
| member function | no `this`; called on the class |
| local variable | lives for the whole program, initialized on first use |
| function or variable at namespace scope | internal linkage: invisible to other files |

The last row has nothing to do with classes; an unnamed namespace is the modern way to say it.

#### The static initialization order problem

Globals and static members in different `.cpp` files are initialized in an unspecified order. If `a.cpp` has `Logger log;` and `b.cpp` has `Config cfg;` whose constructor calls `log.write(...)`, `log` may not be built yet. A function-local static avoids this, because it is built the first time it is used:

```cpp
struct Logger {
    vector<string> lines;
    void write(const string& s) { lines.push_back(s); }
};

Logger& logger() {
    static Logger instance;               // built on first call, never too early
    return instance;
}
```

#### Pitfalls

- Static mutable data is shared across threads; guard it with a mutex or an atomic.
- Tests that touch static state affect each other unless they reset it.
- Non-static member functions can read static members, but static member functions cannot read non-static members without an object.
- Defining a non-inline static data member in a header included by several files breaks the one-definition rule (a linker error).

Connects to: classes and objects, singleton, factory method, immutability.

### questions
Q: What is the difference between a static data member and a non-static one?
A: A static data member has a single copy that belongs to the class and is shared by all instances. A non-static member has a separate copy in each object. Changing a static member through one object is visible from every other object.

Q: Why can't a static member function access non-static members directly?
A: It is not called on any object, so it has no this pointer to say whose members to read. It can work with an object's data only if that object is passed to it as an argument.

Q: Can a static member function be virtual?
A: No. Virtual dispatch uses the vtable pointer stored in an object, and a static member function is called without any object. For the same reason it cannot be declared const.

Q: What does static mean for a function or variable at namespace scope?
A: It gives the name internal linkage: it is visible only inside its own translation unit, the .cpp file, so other files cannot use it or clash with it. It is unrelated to class-level static members; an unnamed namespace achieves the same thing.

Q: When is a function-local static variable initialized?
A: The first time control passes through its declaration. Since C++11 that initialization is guaranteed to happen exactly once even if several threads arrive together, which makes it a simple way to build lazily created shared objects.

## oop.foundations.object-lifecycle
name: "Object lifecycle"
importance: important
prereqs: [oop.foundations.constructors-and-destructors]
scope: "creation, copying, destruction, garbage collection vs manual cleanup"

### simple
Every object is born, used, maybe copied or moved, and eventually destroyed. In C++ you are like a camper who packs out their own tent: an object is cleaned up at a known moment, when its scope ends or its owner lets go. Garbage-collected languages instead send a park ranger around to collect whatever nobody uses anymore, which is convenient but happens whenever the ranger gets there.

### interview
- **Creation**: storage is obtained, then the constructor runs. **Use**: the object may be copied or moved. **Destruction**: the destructor runs and the storage is released.
- Four **storage durations**: automatic (a local; dies at the end of its scope), static (lives until the program ends), thread (lives as long as its thread), dynamic (`new`/`delete`, usually managed by a smart pointer).
- Destruction is **deterministic**: locals die in reverse order of construction, statics at program exit in reverse order, heap objects when deleted or when their last owning smart pointer goes away. **RAII** ties any resource (file, lock, socket) to that moment.
- Ownership tools: `unique_ptr` (one owner), `shared_ptr` (reference-counted owners; freed when the count reaches zero, but **cycles leak**), `weak_ptr` (non-owning, breaks cycles), raw pointers and references for non-owning access.
- **Garbage collection** (used by many other languages) frees unreachable objects at an unspecified later time and needs separate cleanup code for files and locks; C++ has no garbage collector and cleans up everything, memory and other resources alike, in destructors.
- Typical C++ bugs: leaks, dangling pointers, double delete, use-after-free, `shared_ptr` cycles.

### deep
#### Three phases

1. **Birth**: storage is found (a stack frame, static storage or the heap), then the constructor turns that raw memory into a valid object.
2. **Life**: the object is used, passed around, copied (a new object with the same value) or moved (its resources handed to a new object).
3. **Death**: the destructor runs, then the storage is released.

#### Deterministic destruction

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

With raw `new`, forgetting `delete` leaks, deleting twice is undefined behavior, and using the pointer afterwards is use-after-free. Smart pointers make destruction automatic while keeping it deterministic.

#### Worked example: a shared_ptr cycle and weak_ptr

```cpp
struct Node {
    string name;
    shared_ptr<Node> next;                            // owning link
    weak_ptr<Node> prev;                              // non-owning back link
    explicit Node(string n) : name(std::move(n)) {}
    ~Node() { cout << "free " << name << "\n"; }
};

int main() {
    {
        auto a = make_shared<Node>("a"), b = make_shared<Node>("b");
        a->next = b;
        b->prev = a;                                  // weak: does not raise a's count
        cout << a.use_count() << " " << b.use_count() << "\n";   // 1 2
    }                                                 // prints: free a, free b
}
```

| moment | a's count | b's count |
|---|---|---|
| both created | 1 | 1 |
| `a->next = b` | 1 | 2 |
| `b->prev = a` (weak) | 1 | 2 |
| local `b` destroyed | 1 | 1 |
| local `a` destroyed | 0: a freed, which releases `next` | 0: b freed |

If `prev` were a `shared_ptr`, each node would keep the other's count at 1 after the locals died, and neither destructor would ever run: a leak even though no raw `new` appears anywhere.

#### Manual cleanup vs garbage collection

| | C++ (RAII and smart pointers) | a tracing garbage collector |
|---|---|---|
| when memory is freed | at a known point: scope exit, `delete`, last owner gone | some time after the object becomes unreachable |
| other resources | the same destructors release them | need explicit close calls |
| runtime cost | no collector; small per-object cost for `shared_ptr` counts | collector work and pauses |
| typical bugs | dangling pointers, leaks, cycles of `shared_ptr` | leaks through references that are never dropped |

Connects to: constructors and destructors, shallow vs deep copy, virtual destructors, stack vs heap memory.

### questions
Q: What is RAII?
A: Resource Acquisition Is Initialization: an idiom where an object acquires a resource in its constructor and releases it in its destructor. Because destructors run automatically when the object goes out of scope, even during exceptions, the resource can never be forgotten. std::lock_guard, std::unique_ptr and file streams all work this way.

Q: When is a C++ object destroyed?
A: It depends on its storage duration. A local object is destroyed at the end of its scope, in reverse order of construction. A static object is destroyed at program exit. A heap object is destroyed when it is deleted, or when the last unique_ptr or shared_ptr owning it goes away.

Q: What happens when two objects hold shared_ptrs to each other, and how do you fix it?
A: Each keeps the other's reference count above zero, so neither is ever destroyed, even after all outside owners are gone: a memory leak. Make one direction a weak_ptr, which observes the object without owning it, typically the back pointer from child to parent.

Q: How does garbage collection differ from C++'s approach to cleanup?
A: A garbage collector frees objects some time after nothing can reach them, and it handles only memory, so files and locks still need explicit closing. C++ has no collector: objects are destroyed at predictable points, and their destructors release memory and every other resource at the same time.

Q: Why prefer make_unique and make_shared over calling new directly?
A: They never leave a raw owning pointer around, so an exception between allocation and taking ownership cannot leak it, and the code has no naked new or delete to get wrong. make_shared also allocates the object and its reference counts in one block.
