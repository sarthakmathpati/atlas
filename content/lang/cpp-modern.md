---
topic: lang.cpp-modern
name: "Modern C++"
subject: lang
order: 3
prereqs: [lang.cpp-core]
---

## lang.cpp-modern.raii
name: "RAII"
importance: must
scope: "tying resources to object lifetime, destructors, exception safety"

### simple
RAII means every resource you borrow is handed to an object whose job is to give it back. It is like a hotel key card that deactivates itself when you check out: you never have to remember to return it, even if you leave in a hurry. In C++ the "check out" is the end of the object's scope, which happens on every path, including when an error is thrown.

### interview
- **Resource Acquisition Is Initialization**: acquire a resource (memory, a file, a lock, a socket) in a constructor and release it in the destructor. Destructors of local objects run automatically when the scope ends, in **reverse order of construction**.
- That includes **stack unwinding**: when an exception propagates, every fully constructed local object in the abandoned scopes is destroyed, so nothing leaks and no lock stays held.
- Standard RAII types: `vector`, `string`, `unique_ptr`, `shared_ptr`, `lock_guard`, `scoped_lock`, `unique_lock`, `fstream`, `jthread` (joins in its destructor). With them, a class needs no hand-written destructor (rule of zero).
- **Exception-safety guarantees**: **nothrow** (never throws), **strong** (on failure, state is unchanged, as if the call never happened), **basic** (on failure, no leaks and invariants hold, but the state may have changed). RAII is what makes the basic guarantee easy.
- Destructors are implicitly `noexcept`; a destructor that throws while another exception is unwinding the stack calls `std::terminate`. If a constructor throws, that object's destructor does **not** run, but its already-built members and bases are destroyed, so give each resource its own RAII member.
- An RAII class that owns a unique resource should be non-copyable (or deep-copy) and usually movable.

### deep
#### Intuition

Manual cleanup has to be written on every exit path: every `return`, every `break`, and every place an exception might come from. That is easy to get wrong and hard to review. RAII moves the cleanup into one destructor, and the language guarantees the destructor runs when the object goes out of scope.

#### Worked example: cleanup on every path

```cpp
struct Tracer {
    string name;
    explicit Tracer(string n) : name(std::move(n)) { cout << "open " << name << "\n"; }
    ~Tracer() { cout << "close " << name << "\n"; }
    Tracer(const Tracer&) = delete;             // one owner per resource
    Tracer& operator=(const Tracer&) = delete;
};

void work(bool fail) {
    Tracer file("file");
    Tracer lock("lock");
    if (fail) throw runtime_error("disk full");
    cout << "work done\n";
}                                               // destructors run here, in reverse order

int main() {
    work(false);
    try {
        work(true);
    } catch (const exception& e) {
        cout << "caught: " << e.what() << "\n";
    }
}
```

Output:

```text
open file
open lock
work done
close lock
close file
open file
open lock
close lock
close file
caught: disk full
```

In the failing call, the exception leaves `work` before "work done", yet both resources are closed, in reverse order, **before** the `catch` block runs. Replace `Tracer` with a real file handle or a mutex lock and the program can never leak the file or leave the mutex locked.

#### Without RAII

```cpp
// sketch: the manual version needs cleanup on every path
void work(bool fail) {
    FILE* f = fopen("data.txt", "w");
    mtx.lock();
    if (fail) throw runtime_error("disk full");   // leaks f and leaves mtx locked forever
    mtx.unlock();
    fclose(f);
}
```

The RAII version is `ofstream f("data.txt"); lock_guard<mutex> g(mtx);`, with nothing to remember at the end. For C handles, `unique_ptr<FILE, decltype(&fclose)> f(fopen("data.txt", "w"), &fclose);` turns the handle into an RAII object.

#### Exception-safety guarantees

| guarantee | promise if an exception is thrown | example |
|---|---|---|
| nothrow | never throws | destructors, `swap`, move operations marked `noexcept` |
| strong | state unchanged (commit or roll back) | `vector::push_back` when the element's move cannot throw |
| basic | no leaks, invariants hold, state may differ | most operations on standard containers |
| none | anything can happen | code that owns raw resources by hand |

The standard way to get the strong guarantee is to do the risky work on a copy, then commit with a non-throwing swap (copy-and-swap).

#### Rules of thumb

- Every `new`, `lock`, `open` or `connect` should be immediately wrapped in an owning object.
- Keep one resource per RAII object. A constructor that acquires two raw resources leaks the first if acquiring the second throws, because the destructor never runs for a half-built object.
- Never let a destructor throw. If cleanup can fail (flushing a file), offer an explicit `close()` that reports errors and let the destructor be a quiet fallback.
- An exception that is never caught ends the program through `std::terminate`, and whether destructors run first is implementation-defined; catch at the top level if cleanup matters.

Connects to: smart pointers, mutexes and lock guards, move semantics, exceptions vs error codes, constructors and destructors.

### questions
Q: What is RAII?
A: Resource Acquisition Is Initialization: a resource is acquired in an object's constructor and released in its destructor, so its lifetime is tied to the object's scope. Because destructors run automatically, including during stack unwinding, the resource is released on every path out of the scope.

Q: What happens to local objects when an exception is thrown?
A: Stack unwinding destroys every fully constructed automatic object in the scopes being exited, in reverse order of construction, before the matching catch block runs. RAII objects therefore release their resources even though the normal code path was skipped.

Q: What are the three exception-safety guarantees?
A: The nothrow guarantee says the operation never throws. The strong guarantee says that if it throws, the program state is exactly as before the call. The basic guarantee says that if it throws, nothing leaks and all invariants still hold, although the state may have changed.

Q: Why must destructors not throw exceptions?
A: Destructors run during stack unwinding, and if a destructor throws while another exception is already propagating, the program calls std::terminate. Destructors are also implicitly noexcept since C++11, so an escaping exception terminates the program anyway.

Q: If a constructor throws, is the destructor called?
A: No, the object's destructor does not run because the object was never fully constructed. Members and base classes that were already constructed are destroyed, which is why each resource should be held by its own RAII member instead of raw handles owned by the enclosing class.

## lang.cpp-modern.smart-pointers
name: "Smart pointers"
importance: must
prereqs: [lang.cpp-core.pointers-and-memory, lang.cpp-modern.raii]
scope: "unique_ptr, shared_ptr (reference counting cost), weak_ptr (breaking cycles)"

### simple
Smart pointers are pointers that clean up after themselves. A unique pointer is like the one key to a locker: whoever holds it owns the locker, and you can hand the key over but never copy it. A shared pointer is like a shared flat where the last tenant to move out turns off the lights, and a weak pointer is a visitor's pass that lets you check whether anyone still lives there without keeping the flat rented.

### interview
- `unique_ptr<T>`: **sole ownership**; deletes the object in its destructor; **move-only** (ownership transfers with `std::move`). With the default deleter it is the size of a raw pointer and costs nothing extra. Create with `make_unique<T>(args)`.
- `shared_ptr<T>`: **shared ownership** through a **control block** holding a strong count and a weak count; the object is destroyed when the strong count reaches 0. It is two pointers wide, and every copy and destruction updates the count **atomically**, which costs time under contention.
- `make_shared<T>(args)` allocates the object and control block together (one allocation, better locality). The trade-off: the memory is freed only when the last `weak_ptr` is gone too.
- `weak_ptr<T>`: a non-owning observer of a `shared_ptr`'s object. `lock()` returns a `shared_ptr` (null if the object is gone) and `expired()` checks. Use it to **break reference cycles** (parent and child pointing at each other) and for caches.
- A cycle of `shared_ptr`s never reaches count 0 and **leaks**. Make one direction (usually child to parent) a `weak_ptr` or a raw observing pointer.
- Guidelines: default to `unique_ptr`; use `shared_ptr` only when ownership is truly shared; pass `T&` or `T*` to functions that only use the object; never create two `shared_ptr`s from the same raw pointer (double delete); use `enable_shared_from_this` to get a `shared_ptr` to `this`.

### deep
#### Intuition

A raw pointer does not say who is responsible for deleting the object. Smart pointers put that answer in the type: `unique_ptr` means "I alone delete it", `shared_ptr` means "whoever is last deletes it", and `weak_ptr` means "I never delete it, but I can check whether it still exists".

#### Worked example

```cpp
struct Node {
    string name;
    shared_ptr<Node> next;        // owns the next node
    weak_ptr<Node> prev;          // only observes the previous one
    explicit Node(string n) : name(std::move(n)) {}
    ~Node() { cout << "free " << name << "\n"; }
};

int main() {
    cout << sizeof(int*) << " " << sizeof(unique_ptr<int>) << " " << sizeof(shared_ptr<int>) << "\n";
    auto u = make_unique<int>(5);
    auto u2 = std::move(u);                   // ownership moves; u becomes null
    cout << (u == nullptr) << " " << *u2 << "\n";
    {
        auto a = make_shared<Node>("a");
        auto b = make_shared<Node>("b");
        a->next = b;                          // a owns b
        b->prev = a;                          // b does not own a
        cout << a.use_count() << " " << b.use_count() << "\n";
        if (auto p = b->prev.lock()) cout << "b's prev is " << p->name << "\n";
    }                                         // a freed, which frees b
    weak_ptr<Node> w;
    {
        auto c = make_shared<Node>("c");
        w = c;
        cout << "expired? " << w.expired() << "\n";
    }
    cout << "expired? " << w.expired() << "\n";
}
```

Output (x86-64):

```text
8 8 16
1 5
1 2
b's prev is a
free a
free b
expired? 0
free c
expired? 1
```

| moment | strong count of a | strong count of b |
|---|---|---|
| after both `make_shared` | 1 | 1 |
| `a->next = b` | 1 | 2 |
| `b->prev = a` (weak) | 1 | 2 |
| local `a` destroyed | 0: free a, which releases `a->next` | 1 |
| local `b` destroyed | - | 0: free b |

#### The cycle leak

If `prev` were a `shared_ptr<Node>`, the table would end with both counts at 1: a keeps b alive and b keeps a alive, although nothing else can reach them. Neither "free" line is printed, and running that version under AddressSanitizer ends with `SUMMARY: AddressSanitizer: 160 byte(s) leaked in 2 allocation(s)` (each `make_shared` block holds the control block and the node). Reference counting cannot see cycles; breaking one link with `weak_ptr` fixes it.

#### What shared ownership costs

| | `unique_ptr<T>` | `shared_ptr<T>` |
|---|---|---|
| size | one pointer | two pointers (object and control block) |
| allocation | the object | object and control block (one block with `make_shared`) |
| copy | not allowed (move only) | atomic increment |
| destroy | delete if not null | atomic decrement; delete at zero |
| thread safety | none needed | counts are thread-safe; the object itself is not |

Passing `shared_ptr` by value into a hot function pays an atomic increment and decrement on every call. Pass `const shared_ptr<T>&`, or better `T&`, unless the function needs to keep a share.

#### Edge cases and bugs

- `shared_ptr<T> a(raw); shared_ptr<T> b(raw);` creates two control blocks and deletes `raw` twice. Create the object with `make_shared` once and copy the `shared_ptr`.
- `shared_ptr<T>(this)` inside a member function has the same problem; inherit from `enable_shared_from_this<T>` and call `shared_from_this()`.
- `unique_ptr<T[]>` calls `delete[]`; prefer `vector<T>` anyway.
- `lock()` can return null at any time the owners let go, so always check its result.
- A `unique_ptr` to a base class needs a virtual destructor in the base.

Connects to: RAII, pointers and memory, move semantics, virtual destructors, LRU cache.

### questions
Q: What is the difference between unique_ptr and shared_ptr?
A: unique_ptr has exactly one owner, cannot be copied, only moved, and has no overhead beyond a raw pointer. shared_ptr allows many owners through a reference-counted control block; the object is deleted when the last owner goes away, at the cost of an extra pointer, a control block and atomic count updates.

Q: Why should you prefer make_shared over shared_ptr<T>(new T)?
A: make_shared allocates the object and its control block in one allocation, which is faster and more cache friendly, and it avoids a leak if something throws between the new and the shared_ptr constructor. The trade-off is that the combined memory is released only after the last weak_ptr also goes away.

Q: What is a reference cycle, and how does weak_ptr fix it?
A: Two objects that hold shared_ptrs to each other keep each other's count above zero, so neither is ever destroyed even when nothing else refers to them: a leak. Making one of the links a weak_ptr removes it from the strong count, so the cycle can be freed; the weak side calls lock to use the object if it still exists.

Q: Is shared_ptr thread-safe?
A: The reference counting is: different threads can copy and destroy their own shared_ptr instances pointing to the same object safely, because counts are updated atomically. Access to the pointed-to object is not synchronized, and modifying the same shared_ptr instance from several threads without a lock is a data race.

Q: Why is unique_ptr free to use compared with a raw pointer?
A: With the default deleter it stores only the raw pointer, so it has the same size, and its operations compile down to the same loads and a delete in the destructor. You get automatic cleanup and clear ownership at no run-time cost.

## lang.cpp-modern.move-semantics
name: "Move semantics"
importance: must
scope: "lvalues vs rvalues, move constructor and assignment, `std::move`, rule of three, five and zero"

### simple
Copying a box of books means buying new books and filling a second box; moving it means simply handing over the box. Move semantics let C++ hand over the insides of an object that is about to be thrown away, such as a temporary, instead of copying them. The old object is left empty but still safe to reuse or destroy.

### interview
- An **lvalue** has a name and an address you can take (`x`, `v[i]`); an **rvalue** is a temporary or a value about to expire (`f()`, `x + 1`, `std::move(x)`). An rvalue reference `T&&` binds only to rvalues.
- A **move constructor** `T(T&& other)` and **move assignment** `T& operator=(T&& other)` steal the resources of `other` (pointers, buffers) and leave it in a valid but unspecified state. Moving a `vector` or `string` is O(1); copying is O(n).
- `std::move(x)` does not move anything: it is a cast to `T&&` that says "you may steal from x". After it, use `x` only to assign a new value or destroy it. Moving from a `const` object silently copies.
- Returning a local by value is cheap: the compiler elides the copy (guaranteed since C++17 for temporaries, and usually done for named locals) or moves. `return std::move(local);` blocks that elision; `-Wall` warns about it.
- Mark move operations **`noexcept`**: `vector` moves elements during reallocation only if the move cannot throw, and copies them otherwise.
- **Rule of five**: a class that manages a resource by hand defines destructor, copy constructor, copy assignment, move constructor and move assignment. **Rule of zero**: build from members that manage themselves and declare none of them. Declaring a destructor or a copy operation suppresses the implicit moves.

### deep
#### Intuition

A `vector` object is a small header (a pointer to the heap buffer, a size and a capacity) plus the buffer. Copying it allocates a new buffer and copies every element. Moving it copies the three header fields and sets the source's pointer to null, so the buffer changes owner without being touched. The source is not destroyed yet, so it must be left in a state its destructor can handle.

#### Worked example: counting copies and moves

```cpp
template <bool NoexceptMove>
struct Buffer {
    vector<int> data;
    static inline int copies = 0, moves = 0;
    explicit Buffer(size_t n) : data(n) {}
    Buffer(const Buffer& o) : data(o.data) { ++copies; }
    Buffer(Buffer&& o) noexcept(NoexceptMove) : data(std::move(o.data)) { ++moves; }
    Buffer& operator=(const Buffer& o) { data = o.data; ++copies; return *this; }
    Buffer& operator=(Buffer&& o) noexcept(NoexceptMove) {
        data = std::move(o.data);
        ++moves;
        return *this;
    }
};
using Buf = Buffer<true>;

Buf make(size_t n) { Buf b(n); return b; }       // returning a local: no copy

template <class B>
void grow(const char* label) {
    vector<B> v;
    for (int i = 0; i < 5; ++i) v.push_back(B(100));   // temporaries: moved in
    cout << label << ": copies " << B::copies << ", moves " << B::moves << "\n";
}

int main() {
    Buf a(1000);
    Buf b = a;                    // copy: a is an lvalue with a name
    Buf c = std::move(a);         // move: std::move turns a into an rvalue
    cout << a.data.size() << " " << b.data.size() << " " << c.data.size() << "\n";
    Buf d = make(10);             // elided or moved, never copied
    b = Buf(5);                   // move assignment from a temporary
    cout << "copies " << Buf::copies << ", moves " << Buf::moves << "\n";
    Buf::copies = Buf::moves = 0;
    grow<Buffer<true>>("noexcept move");
    grow<Buffer<false>>("throwing move");
}
```

Output (g++ 13):

```text
0 1000 1000
copies 1, moves 2
noexcept move: copies 0, moves 12
throwing move: copies 7, moves 5
```

- `a` is empty after the move (a vector's move constructor guarantees that); `c` took its buffer.
- The two moves are `c = std::move(a)` and `b = Buf(5)`. `make(10)` cost nothing because g++ built `b` directly in `d` (named return value optimization). With `-fno-elide-constructors` it costs one move, still no copy.
- `grow`: five `push_back`s of temporaries are five moves, and reallocations at sizes 1, 2 and 4 relocate 1 + 2 + 4 = 7 elements. With a `noexcept` move those are moves too (12 in total). If the move might throw, `vector` **copies** during reallocation so it can keep the strong guarantee: 7 copies of 100-element buffers.

#### Value categories in one table

| expression | category | binds to `T&&`? |
|---|---|---|
| `x` (a named variable, even of type `T&&`) | lvalue | no |
| `f()` returning `T` | prvalue (temporary) | yes |
| `std::move(x)` | xvalue (expiring) | yes |
| `x + 1`, `string("a")` | prvalue | yes |

A named rvalue reference parameter is itself an lvalue: inside `void f(string&& s)`, write `std::move(s)` to pass it on as an rvalue. In templates, `T&&` with deduced `T` is a forwarding reference, and `std::forward<T>(x)` passes along whatever category the caller used.

#### Rule of three, five and zero

A class owning a raw resource needs all five special members, or copies share the resource and it is freed twice. Writing a destructor alone also silently removes the implicit moves, so "moves" become copies. The better answer is almost always the rule of zero: hold the resource in a `vector`, `string` or `unique_ptr`, and the compiler-generated five do the right thing.

#### Edge cases and bugs

- `std::move` on a `const string` produces `const string&&`, which binds to the copy constructor: a silent copy.
- Using a moved-from object as if it still had its value (`v.size()` after moving `v`) is a logic bug; standard types only promise it is valid.
- Self-move-assignment (`x = std::move(x)`) must not destroy the data; libraries leave it valid but unspecified.
- Small types (`int`, `array<int, 3>`) gain nothing from moving: a move is a copy for them.

Connects to: RAII, smart pointers, rule of three and five in C++, strings and vectors, templates.

### questions
Q: What is the difference between an lvalue and an rvalue?
A: An lvalue refers to an object with identity that persists beyond the expression, like a named variable, and you can take its address. An rvalue is a temporary or an expiring value, like a function's return value or std::move(x). Rvalue references bind only to rvalues, which is how overloads know it is safe to steal resources.

Q: What does std::move actually do?
A: Nothing at run time: it is a cast of its argument to an rvalue reference. That lets overload resolution pick the move constructor or move assignment, which do the actual transfer. The moved-from object is left valid but in an unspecified state.

Q: Why should move constructors be marked noexcept?
A: Containers like vector must keep the strong exception guarantee when they reallocate. They use move_if_noexcept: if the element's move constructor might throw, they copy elements instead, so a failure cannot leave some elements moved and others not. A noexcept move lets them move, which is much cheaper.

Q: Should you write return std::move(local) in a function that returns by value?
A: No. Returning a local by name already lets the compiler construct it directly in the caller's space or, failing that, move it automatically. Wrapping it in std::move turns the expression into a reference, which prevents that elision and can only make things slower; compilers warn about it.

Q: What are the rule of three, the rule of five and the rule of zero?
A: Rule of three: a class that needs a custom destructor, copy constructor or copy assignment usually needs all three. Rule of five adds the move constructor and move assignment. Rule of zero: design classes so that members manage their own resources, and declare none of the special members.

## lang.cpp-modern.templates
name: "Templates"
importance: important
scope: "function and class templates, specialization basics, compile-time polymorphism"

### simple
A template is a cookie cutter: you write the shape once, and the compiler stamps out a separate version for each type you use it with. A function that finds the largest item can work on numbers, strings or your own types without being rewritten. Because each version is made while compiling, the result is as fast as if you had written it by hand for that type.

### interview
- A **function template** (`template <typename T> T largest(const vector<T>& v)`) is a recipe; the compiler **instantiates** a real function for each set of template arguments, usually **deducing** them from the call.
- A **class template** (`template <typename T> class Stack`) is instantiated per argument list: `Stack<int>` and `Stack<string>` are unrelated types. `vector`, `map` and `array<T, N>` (with a non-type parameter N) are templates.
- **Full specialization** (`template <> string describe<int>(const int&)`) replaces the recipe for one exact type. **Partial specialization** (a pattern such as `IsPointer<T*>`) is allowed for class templates only; for functions, overload instead.
- Templates give **compile-time polymorphism**: calls are resolved statically and can be inlined, with no vtable. The costs: longer compile times, larger binaries (code bloat), and error messages at instantiation time.
- Template definitions normally live in **headers**, because every translation unit that uses one needs the full definition to instantiate it.
- **C++20 concepts** state requirements on the arguments (`template <std::integral T>` or a `requires` clause), turning long instantiation errors into one clear message and making the interface self-documenting.

### deep
#### Worked example

```cpp
template <typename T>
T largest(const vector<T>& v) {                    // one definition, many types
    T best = v[0];
    for (const T& x : v) if (best < x) best = x;
    return best;
}

template <typename T>
class Stack {
    vector<T> items;
public:
    void push(T x) { items.push_back(std::move(x)); }
    T pop() { T x = std::move(items.back()); items.pop_back(); return x; }
    bool empty() const { return items.empty(); }
};

template <typename T>
string describe(const T&) { return "something"; }
template <>
string describe<int>(const int& x) { return "the int " + to_string(x); }   // full specialization

template <typename T> struct IsPointer { static constexpr bool value = false; };
template <typename T> struct IsPointer<T*> { static constexpr bool value = true; };  // partial

template <integral T>                               // C++20 concept: integers only
T gcdOf(T a, T b) { return b == 0 ? a : gcdOf(b, a % b); }

int main() {
    cout << largest(vector<int>{3, 9, 2}) << " " << largest(vector<string>{"pear", "apple"}) << "\n";
    Stack<string> s;
    s.push("a");
    s.push("b");
    string top = s.pop();
    cout << top << " " << s.pop() << " " << s.empty() << "\n";
    cout << describe(2.5) << ", " << describe(7) << "\n";
    cout << IsPointer<int>::value << IsPointer<int*>::value << "\n";
    cout << gcdOf(84, 36) << " " << gcdOf(10LL, 4LL) << "\n";
}
```

Output:

```text
9 pear
b a 1
something, the int 7
01
12 2
```

The compiler generated `largest<int>`, `largest<string>`, `Stack<string>`, `gcdOf<int>` and `gcdOf<long long>`. `largest` works for any `T` that supports `<` and copying; `"pear"` wins because strings compare alphabetically.

#### What concepts buy you

Calling `gcdOf(2.0, 4.0)` fails to compile. With the concept, g++ 13 reports `no matching function for call to 'gcdOf(double, double)'` and explains that `is_integral_v<_Tp> [with _Tp = double]` evaluated to false. Without it, the error would point inside the body at `%` on doubles, which is much harder to read in a large template.

#### Compile-time versus run-time polymorphism

| | templates | virtual functions |
|---|---|---|
| resolved | at compile time | at run time through the vtable |
| inlining | yes | usually not |
| mixing types in one container | no (`Stack<int>` and `Stack<string>` differ) | yes, through base pointers |
| binary size | one copy per type | one copy |
| adding a new type | recompile users | no recompile needed |

#### Edge cases and bugs

- Templates are checked in two phases: syntax when defined, and everything that depends on `T` only when instantiated, so a template that is never used can hide errors.
- Inside a template, a dependent type name needs `typename`: `typename vector<T>::iterator it;`.
- A full specialization of a function template must be declared before its first use, or calls may use the generic version.
- `largest` on an empty vector reads `v[0]`: templates do not add safety that the code does not have.

Connects to: STL algorithms, CRTP and static polymorphism, const, constexpr and inline, compilation model, virtual function internals.

### questions
Q: What is template instantiation?
A: When code uses a template with specific arguments, the compiler generates a concrete function or class for those arguments by substituting them into the template. Each distinct argument list produces its own instantiation, which is why vector<int> and vector<string> are separate types with separate code.

Q: What is the difference between full and partial specialization?
A: A full specialization provides a separate definition for one exact set of template arguments, such as describe<int>. A partial specialization provides a definition for a pattern of arguments, such as all pointer types T*, and is only allowed for class templates; functions use overloading instead.

Q: Why are templates usually defined in header files?
A: The compiler needs the whole template definition at the point of instantiation to generate code for the concrete types. Each translation unit is compiled separately, so every file that uses the template must see its definition, which in practice means putting it in a header.

Q: What problem do C++20 concepts solve?
A: They let a template state requirements on its arguments, such as being an integral type or supporting a certain operation. Calls that do not meet them are rejected at the call site with a short message, instead of deep errors from inside the template body, and overloads can be selected by which concept a type satisfies.

Q: Compare templates and virtual functions as ways to get polymorphism.
A: Templates resolve the call at compile time, allowing inlining and no per-call overhead, but produce one copy of the code per type and cannot mix types in one container. Virtual functions resolve the call at run time through a vtable, which costs an indirect call and blocks inlining, but lets you store different derived types behind one base pointer.

## lang.cpp-modern.const-constexpr-and-inline
name: "const, constexpr and inline"
importance: important
scope: "compile-time computation and its uses"

### simple
const is a promise that a value will not change once set, even if it is only known when the program runs. constexpr goes further: the value, or a function's result, can be worked out by the compiler before the program ever runs, like a calculator answer printed in the manual. inline, despite its name, mostly means "this definition may appear in several files", which lets you put small functions and constants in headers.

### interview
- `const`: the object cannot be modified after initialization, but its value may be computed at run time (`const int limit = n * 2;`).
- `constexpr` variable: must be initialized with a **constant expression**, so it is known at compile time and usable where the language needs a constant (array sizes, template arguments, `static_assert`). It implies `const`.
- `constexpr` function: can be evaluated at compile time when its arguments are constants and the result is needed as a constant; otherwise it runs like a normal function. Since C++20 it may use loops, local variables, `std::array` and even `vector` and `string` inside the evaluation.
- `consteval` (C++20) functions **must** run at compile time; `constinit` guarantees a static variable is initialized at compile time without making it const; `if constexpr` discards the untaken branch of a template at compile time.
- Undefined behavior is a **compile error** during constant evaluation (for example, signed overflow), which makes `static_assert` tests of `constexpr` functions surprisingly strong.
- `inline` on a function or variable (C++17) allows identical definitions in several translation units without breaking the one-definition rule; whether a call is actually inlined is the optimizer's decision. Functions defined inside a class body, `constexpr` functions and `static constexpr` data members are implicitly inline.

### deep
#### Worked example

```cpp
constexpr long long factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }

constexpr array<int, 10> squares() {              // a table built by the compiler
    array<int, 10> t{};
    for (int i = 0; i < 10; ++i) t[i] = i * i;
    return t;
}

consteval int kib(int n) { return n * 1024; }     // C++20: compile time only

constexpr int MOD = 1'000'000'007;                // a true constant
inline constexpr double PI = 3.141592653589793;   // inline: one object across all files

int main() {
    constexpr auto table = squares();
    static_assert(factorial(10) == 3'628'800);    // checked while compiling
    static_assert(table[9] == 81);
    int n;
    cin >> n;
    const int limit = n * 2;                      // const, but only known at run time
    cout << factorial(n) << " " << limit << " " << table[n] << " " << kib(4) << "\n";
    cout << MOD % 1000 << " " << PI << "\n";
}
```

Input:

```text
5
```

Output:

```text
120 10 25 4096
7 3.14159
```

- `factorial(10)` inside `static_assert` ran in the compiler; `factorial(n)` ran at run time because `n` comes from input. One function serves both.
- `table` was computed during compilation and is stored in the program as data, so reading `table[n]` costs one load.
- `kib(4)` is a compile-time call. `kib(n)` with a run-time `n` does not compile: g++ 13 says `'n' is not a constant expression`.
- `limit` is `const` but not a constant expression, so it could not size a `std::array`.

#### Undefined behavior is caught at compile time

```cpp
// sketch: does not compile. Constant evaluation rejects the signed overflow.
constexpr int next(int x) { return x + 1; }
constexpr int bad = next(INT_MAX);
```

g++ stops with `error: overflow in constant expression`. The same call at run time would be undefined behavior with no diagnostic, which is why testing helper functions with `static_assert` catches real bugs.

#### What inline means today

| you write | effect |
|---|---|
| `inline int twice(int x)` in a header | every file may contain the definition; the linker keeps one |
| `inline constexpr double PI` in a header | one variable with one address in the whole program |
| `constexpr int MOD` at namespace scope in a header | each file gets its own copy (const implies internal linkage), usually fine |
| a member function defined in the class body | implicitly inline |

Compilers inline small functions at `-O2` whether or not you write `inline`, and may ignore the keyword for large ones. Use it for the linkage rule, not as a speed hint.

#### Uses in interviews and contests

- Precomputed tables (squares, factorials modulo a prime, bit masks) with zero start-up cost.
- `static_assert` checks of assumptions: `static_assert(sizeof(long long) == 8);`.
- `if constexpr` in templates to handle integer and floating types differently in one function.

Connects to: templates, compilation model, classes and const correctness, undefined behavior.

### questions
Q: What is the difference between const and constexpr?
A: const means the object cannot be changed after initialization, but its value may be known only at run time. constexpr on a variable requires its value to be computable at compile time, so it can be used where constants are required, such as array sizes and template arguments. Every constexpr variable is also const.

Q: Is a constexpr function always evaluated at compile time?
A: No. It is evaluated at compile time when it is called in a context that requires a constant, such as static_assert or a constexpr variable, and its arguments are constants. Otherwise it runs like an ordinary function. consteval functions, added in C++20, must always be evaluated at compile time.

Q: What does the inline keyword mean in modern C++?
A: Mainly that a function or variable may be defined in several translation units, as long as all definitions are identical, without violating the one-definition rule. The linker keeps one copy. Whether calls are actually inlined is decided by the optimizer regardless of the keyword.

Q: What happens if a constexpr function hits undefined behavior during compile-time evaluation?
A: The compiler must reject it: undefined behavior is not allowed in a constant expression, so signed overflow or out-of-bounds access becomes a compile error. This makes static_assert checks of constexpr helpers a cheap way to find such bugs.

Q: Give two practical uses of constexpr.
A: Building lookup tables at compile time, such as powers or factorials, so the program starts with them ready and pays nothing at run time. And checking assumptions or small functions with static_assert, which fails the build instead of producing wrong results later.

## lang.cpp-modern.virtual-function-internals
name: "Virtual function internals"
importance: important
scope: "vtable, vptr, cost of virtual calls, virtual destructors"

### simple
When you call a virtual function through a base-class pointer, the program has to look up which version to run, like calling a company's main number and being transferred to the right department. Each class with virtual functions has one directory of its versions (the vtable), and each object carries a hidden pointer to its class's directory (the vptr). The lookup is quick, but it stops the compiler from pasting the function's code straight into the caller.

### interview
- The standard only says virtual calls dispatch on the dynamic type; every mainstream compiler implements it the same way. Each polymorphic class has one **vtable**: a static array of function pointers (plus type information). Each object has a hidden **vptr**, usually at offset 0, pointing to its class's vtable.
- A virtual call `p->f()` loads the vptr, loads the function pointer from a fixed slot, and makes an **indirect call**. Direct calls, calls on objects (not pointers or references) and qualified calls (`p->Base::f()`) skip the lookup.
- **Costs**: 8 bytes per object for the vptr (plus padding: a class with one `int` goes from 4 to 16 bytes), an indirect call that the CPU usually predicts well, and, most importantly, **no inlining** across the call. The compiler can **devirtualize** when it knows the exact type, for example when the class is marked `final`.
- During a base-class **constructor or destructor**, the vptr points to the base's vtable, so virtual calls run the base version; calling a pure virtual function there terminates the program.
- A class used polymorphically needs a **virtual destructor**, or deleting a derived object through a base pointer is undefined behavior (the derived part is not destroyed).
- Multiple inheritance gives an object several vptrs; virtual inheritance adds offsets to find the shared base.

### deep
#### Worked example

```cpp
struct Plain { int x; void f() {} };
struct Poly { int x; virtual void f() {} virtual ~Poly() = default; };

struct Base {
    Base() { hello(); }                        // runs Base::hello: Derived isn't built yet
    virtual void hello() { cout << "Base::hello\n"; }
    void greet() { hello(); }                  // a virtual call through this
    virtual ~Base() { cout << "~Base\n"; }
};
struct Derived : Base {
    string name = "D";
    void hello() override { cout << "Derived::hello " << name << "\n"; }
    ~Derived() override { cout << "~Derived\n"; }
};

int main() {
    cout << sizeof(Plain) << " " << sizeof(Poly) << "\n";
    unique_ptr<Base> p = make_unique<Derived>();   // prints Base::hello
    p->greet();                                    // dynamic dispatch
    p->Base::hello();                              // qualified: no dispatch
}                                                  // virtual destructor: ~Derived, then ~Base
```

Output (x86-64):

```text
4 16
Base::hello
Derived::hello D
Base::hello
~Derived
~Base
```

- `Poly` is 16 bytes: an 8-byte vptr, the 4-byte `int`, and 4 bytes of padding to keep the size a multiple of 8.
- While `Base()` runs, the object is only a `Base` (its `name` member does not exist yet), so the vptr points to Base's vtable and `hello()` runs `Base::hello`. That rule prevents a derived override from reading uninitialized members.
- `greet` is not virtual, but the call to `hello` inside it is, so it reaches `Derived::hello`.

#### What the call compiles to

```cpp
// sketch: two callers of the same virtual function
struct Shape { virtual double area() const = 0; virtual ~Shape() = default; };
struct Square final : Shape { double s = 2; double area() const override { return s * s; } };
double viaBase(const Shape& x) { return x.area(); }
double viaFinal(const Square& x) { return x.area(); }
```

For `viaBase`, g++ 13 at `-O2` loads the vptr from the object, loads the `area` slot from the vtable and calls through it (it even adds a guess: if the slot holds the only override it knows, it runs that inlined and skips the indirect call). For `viaFinal`, the generated code is just the inlined multiply: no vptr load at all, because no further override can exist.

```text
a Derived object            Derived's vtable (one per class, simplified)
+--------------+            +----------------------+
| vptr --------+----------> | &Derived::hello      |
| name "D"     |            | &Derived::~Derived   |
+--------------+            +----------------------+
```

The real table also holds the type information used by `dynamic_cast` and `typeid`.

#### Measuring the cost honestly

A well-predicted indirect call costs only a few cycles; the real price is that the compiler cannot inline the body, so it cannot fold constants, vectorize loops or remove redundant work across the call. In tight loops over many small objects, prefer templates, `final`, or grouping objects by type so each loop calls one concrete function. Timings vary widely by CPU and by how predictable the targets are, so measure in your own program before changing a design for speed.

#### Edge cases and bugs

- Deleting through a base pointer without a virtual destructor is undefined behavior.
- `override` makes the compiler check that a base virtual function with that exact signature exists; without it, a typo creates a new function silently.
- Object slicing: copying a `Derived` into a `Base` value copies only the base part and sets the vptr to Base's vtable.
- `sizeof` a class grows by the vptr only once, however many virtual functions it has; the vtable is shared by all objects of the class.

Connects to: polymorphism, virtual destructors, CRTP and static polymorphism, object memory layout, templates.

### questions
Q: How are virtual functions typically implemented?
A: Each class with virtual functions has a vtable, a static table of pointers to its implementations of each virtual function. Each object stores a hidden vptr pointing to its class's vtable. A virtual call loads the vptr, reads the function pointer from a fixed slot and calls it indirectly.

Q: What does a virtual function cost?
A: Memory for the vptr in every object, an extra load of the vptr and the table entry, and an indirect call. The bigger cost is usually that the compiler cannot inline the call, which blocks further optimizations. Branch predictors make the call itself cheap when the target is predictable.

Q: What happens if you call a virtual function from a base class constructor?
A: The base class's version runs, not the derived override. During the base constructor the derived part has not been constructed, so the object's vptr points to the base's vtable. If the function is pure virtual in the base, the call is undefined behavior and typically terminates the program.

Q: Why does a polymorphic base class need a virtual destructor?
A: When you delete a derived object through a base pointer, the destructor call itself is dispatched like any other. Without virtual, only the base destructor runs, which is undefined behavior and in practice leaks or skips the derived part's cleanup. With virtual, the derived destructor runs first, then the base.

Q: How can the compiler avoid the cost of a virtual call?
A: By devirtualizing it when it can prove the dynamic type: calling on an object rather than a pointer, calling through a class or function marked final, or seeing the exact type after inlining. Then it emits a direct call or inlines the body.

## lang.cpp-modern.crtp-and-static-polymorphism
name: "CRTP and static polymorphism"
importance: advanced
tracks: [quant]
prereqs: [lang.cpp-modern.templates, lang.cpp-modern.virtual-function-internals]
scope: "avoiding virtual dispatch in low-latency code"

### simple
The curiously recurring template pattern lets a base class know its derived class while compiling, as if a form template came pre-printed with the name of the person who will fill it in. The base can then call the derived class's functions directly, with no run-time lookup. You keep the shared code in one place, and the program runs as if you had written each class by hand.

### interview
- **CRTP**: `struct Derived : Base<Derived>`. Inside `Base<D>`, `static_cast<D&>(*this).impl()` calls the derived function, resolved at **compile time**.
- Benefits: no vptr, no indirect call, and the calls can be **inlined**, which is why low-latency code (market data handlers, order book updates) uses it on hot paths.
- Limits: each `Base<D>` is a different type, so you cannot store different derived types in one container behind one base pointer (use `std::variant`, or a virtual interface outside the hot path); more template code and longer compiles.
- Also used for **mixins** that add behavior per class: instance counters (each derived type gets its own static counter), comparison operators, `std::enable_shared_from_this<T>`.
- Pitfall: `struct B : Base<A>` (the wrong argument) makes the `static_cast` undefined behavior. A private base constructor with `friend D;` turns that mistake into a compile error.
- C++23's explicit object parameter (deducing `this`) covers many CRTP uses with simpler code.

### deep
#### Worked example

```cpp
template <class Derived>
struct Strategy {
    // The base knows its derived type at compile time, so no vtable is needed.
    int onPrice(int price) { return self().decide(price) * self().size; }
    Derived& self() { return static_cast<Derived&>(*this); }
};

struct BuyLow : Strategy<BuyLow> {
    int size = 10;
    int decide(int price) { return price < 100 ? 1 : 0; }     // 1 = buy, 0 = wait
};
struct SellHigh : Strategy<SellHigh> {
    int size = 5;
    int decide(int price) { return price > 105 ? -1 : 0; }   // -1 = sell
};

template <class D>
int run(Strategy<D>& s, const vector<int>& prices) {         // one copy per strategy type
    int position = 0;
    for (int p : prices) position += s.onPrice(p);
    return position;
}

template <class D>                                          // a mixin: counts live objects
struct Counted {
    static inline int alive = 0;
    Counted() { ++alive; }
    Counted(const Counted&) { ++alive; }
    ~Counted() { --alive; }
};
struct Order : Counted<Order> { int id; };
struct Quote : Counted<Quote> { double px; };

int main() {
    vector<int> prices = {98, 101, 107, 99, 110};
    BuyLow b;
    SellHigh s;
    cout << run(b, prices) << " " << run(s, prices) << "\n";
    cout << sizeof(BuyLow) << "\n";                           // no vptr
    vector<Order> orders(3);
    Quote q;
    cout << Counted<Order>::alive << " " << Counted<Quote>::alive << "\n";  // separate counters
}
```

Output:

```text
20 -10
4
3 1
```

BuyLow buys 10 at 98 and at 99 (position 20); SellHigh sells 5 at 107 and at 110 (−10). `sizeof(BuyLow)` is 4: the empty base adds nothing and there is no vptr. `Counted<Order>` and `Counted<Quote>` are different classes, so each has its own `alive`.

#### Compared with virtual dispatch

| | virtual | CRTP |
|---|---|---|
| dispatch | run time, through the vptr | compile time |
| inlining of `decide` | no (unless devirtualized) | yes |
| per-object overhead | 8-byte vptr | none |
| heterogeneous container | `vector<unique_ptr<Base>>` | not directly; `variant` or separate vectors |
| new strategy at run time (plugins) | yes | no |

A common design keeps the hot loop generic over `D` (for example one `run<BuyLow>` per strategy chosen at start-up) and keeps a virtual interface only at the edges, where a call happens rarely.

#### Pitfalls

- Calling a function that the derived class forgot to define recurses into the base's own version if the names match, which can loop forever; give the derived hook a different name (`decide` versus `onPrice`).
- Templates in headers mean every change recompiles the users.
- Measure before and after: the gain comes from inlining in hot loops, and is negligible for calls that happen rarely.

Connects to: templates, virtual function internals, object memory layout, false sharing and cache-line padding.

### questions
Q: What is the curiously recurring template pattern?
A: A class derives from a base template instantiated with itself, as in struct D : Base<D>. The base can then cast this to D and call D's functions directly, so the dispatch is decided at compile time instead of through a vtable.

Q: Why is CRTP popular in low-latency trading code?
A: It removes the vptr and the indirect call, and it lets the compiler inline the derived functions into hot loops, enabling further optimizations. Handlers called millions of times per second benefit, while the code shared between strategies stays in one base template.

Q: What can CRTP not do that virtual functions can?
A: Store different derived types in one container and choose the behavior at run time through a common base pointer, because each Base<D> is a distinct, unrelated type. Adding a new type also requires recompiling code that uses it. std::variant or a thin virtual layer outside the hot path fill that gap.

Q: How does CRTP give each derived class its own static counter?
A: The counter is a static member of the template Counted<D>, and Counted<Order> and Counted<Quote> are different instantiations, so each has its own static variable. A non-template base would share one counter between all derived classes.

## lang.cpp-modern.object-memory-layout
name: "Object memory layout"
importance: advanced
tracks: [quant]
scope: "size, alignment, padding, cache-friendly structs"

### simple
An object's members are laid out in memory like boxes on a shelf, and some boxes may only start at positions that are multiples of their size. When a small box sits before a big one, the gap left over is wasted space called padding. Ordering members sensibly makes objects smaller, so more of them fit in each chunk the processor loads, which makes loops over them faster.

### interview
- Every type has an **alignment** (`alignof`): its address must be a multiple of it (8 for `double` and pointers on x86-64, 4 for `int`, 1 for `char`). The compiler inserts **padding** so each member is aligned, and pads the end so the size is a multiple of the struct's alignment.
- Members are laid out in **declaration order**; the compiler does not reorder them. Sorting members from largest to smallest alignment usually removes most padding.
- The CPU reads memory in **cache lines** (64 bytes on common x86-64 and most ARM cores). Smaller objects mean more per line and fewer cache misses when iterating.
- **Array of structs** versus **struct of arrays**: if a hot loop reads only one field, storing that field in its own contiguous array (SoA) avoids loading the unused fields.
- `alignas(64)` puts an object on its own cache line (used against false sharing between threads). An empty class has size 1, but an empty **base** adds nothing (empty base optimization), and `[[no_unique_address]]` (C++20) does the same for members.
- `#pragma pack(1)` removes padding for wire formats, but misaligned access can be slower, and taking a reference to a packed member is unsafe; copy the fields out instead.

### deep
#### Worked example

```cpp
struct Loose { char flag; double price; char side; int qty; };   // declared in a careless order
struct Tight { double price; int qty; char flag; char side; };   // largest members first
struct alignas(64) Padded { atomic<long long> count; };          // one per cache line
struct Empty {};
struct WithEmpty { int x; Empty e; };
struct NoUnique { int x; [[no_unique_address]] Empty e; };

int main() {
    cout << sizeof(Loose) << " " << alignof(Loose) << "\n";
    cout << offsetof(Loose, flag) << " " << offsetof(Loose, price) << " "
         << offsetof(Loose, side) << " " << offsetof(Loose, qty) << "\n";
    cout << sizeof(Tight) << "\n";
    cout << sizeof(Padded) << " " << alignof(Padded) << "\n";
    cout << sizeof(Empty) << " " << sizeof(WithEmpty) << " " << sizeof(NoUnique) << "\n";
    cout << sizeof(Loose) * 1000 << " vs " << sizeof(Tight) * 1000 << "\n";
}
```

Output (x86-64 Linux):

```text
24 8
0 8 16 20
16
64 64
1 8 4
24000 vs 16000
```

| offset | Loose | Tight |
|---|---|---|
| 0 | `flag` (1) + 7 padding | `price` (8) |
| 8 | `price` (8) | `qty` (4) |
| 12 | | `flag` (1), `side` (1), 2 padding |
| 16 | `side` (1) + 3 padding | end: 16 bytes |
| 20 | `qty` (4) | |
| 24 | end: 24 bytes | |

The same four fields take 24 or 16 bytes depending only on order: a third of the memory, and a third fewer cache lines in a loop over a million orders. `WithEmpty` pays 4 bytes of padding for an empty member, which `[[no_unique_address]]` avoids.

#### Struct of arrays

```cpp
// sketch: summing one field
struct OrderAoS { double price; int qty; char side; };
vector<OrderAoS> orders;                     // each 64-byte line holds 4 orders
struct OrdersSoA { vector<double> price; vector<int> qty; vector<char> side; };
// Summing prices: AoS loads all fields; SoA streams only price, 8 per cache line,
// and the loop can use SIMD instructions.
```

#### Rules of thumb

- Order members by decreasing alignment unless readability or a wire format requires otherwise.
- Keep hot fields together at the start of a struct and move rarely used ones elsewhere (hot/cold splitting).
- Give data written by different threads its own cache line (`alignas(64)`, or C++17's `hardware_destructive_interference_size`, which is 64 with g++ 13 on x86-64).
- `static_assert(sizeof(Order) == 16);` guards a layout that matters.

Connects to: false sharing and cache-line padding, cache lines and locality, CRTP and static polymorphism, virtual function internals.

### questions
Q: Why can sizeof a struct be larger than the sum of its members?
A: Each member must sit at an address that is a multiple of its alignment, so the compiler inserts padding between members, and it pads the end so that in an array every element stays aligned. A char followed by a double wastes 7 bytes, for example.

Q: How do you reduce padding in a struct?
A: Declare members in decreasing order of alignment, such as doubles and pointers first, then ints, then chars, because the compiler keeps declaration order. Grouping small members together lets them share what would otherwise be padding.

Q: What is the difference between array of structs and struct of arrays?
A: Array of structs keeps each object's fields together, which suits code that uses all fields of one object. Struct of arrays keeps each field in its own array, so a loop that reads one field streams only that data, uses cache lines fully and vectorizes well.

Q: What does alignas(64) do, and when would you use it?
A: It forces the type or variable to start at an address that is a multiple of 64 and rounds its size up to 64, giving it a whole cache line. It is used for data written by different threads, such as per-thread counters, so that they do not share a cache line and cause false sharing.
