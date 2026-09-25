---
topic: oop.language-specifics
name: "Copying, equality and language specifics"
subject: oop
order: 4
prereqs: [oop.pillars]
---

## oop.language-specifics.shallow-vs-deep-copy
name: "Shallow vs deep copy"
importance: must
scope: "copy constructors, clone, copy assignment"

### simple
A shallow copy duplicates an object's top layer but shares anything it points to, while a deep copy duplicates everything all the way down. Photocopying an address book page gives you the same addresses, but both copies still point at the same houses. A deep copy would be like building a second set of houses, so painting one never changes the other.

### interview
- **Shallow copy**: copies each member's value; for a pointer that value is an address, so the copy and the original **share** the pointed-to data.
- **Deep copy**: also copies what the members point to, so the copy is fully **independent**.
- The compiler-generated copy constructor and copy assignment copy **member by member**. With a raw owning pointer that is shallow, and both destructors free the same memory (**double free**).
- Fix it with a user-written deep copy (rule of three) or, better, with members that copy themselves: `vector`, `string` and other containers copy their elements, so their copies are deep.
- Containers of pointers copy only the pointers: copying a `vector<shared_ptr<T>>` shares every `T`; `unique_ptr` members make a class move-only until you write a copy.
- Copying through a base-class pointer needs a virtual `clone()` (the prototype pattern), because constructors cannot be virtual.

### deep
#### Intuition

An object is a tree of values and pointers. A copy has to decide, at every pointer, whether to copy the pointer (share) or copy the thing it points to (duplicate). Shallow copies share below the first level; deep copies duplicate everything the object owns.

#### Worked example: what does a copy share?

```cpp
int main() {
    vector<vector<int>> grid = {{0, 0}, {0, 0}};
    auto deep = grid;                                   // vector copies are deep: new rows

    vector<shared_ptr<vector<int>>> rows = {make_shared<vector<int>>(2, 0),
                                            make_shared<vector<int>>(2, 0)};
    auto shallow = rows;                                // copies the pointers, not the rows

    auto& alias = grid;                                 // not a copy at all

    grid[0][0] = 9;
    (*rows[0])[0] = 9;
    cout << alias[0][0] << " " << deep[0][0] << " " << (*shallow[0])[0] << "\n";   // 9 0 9
}
```

| after the write | outer container shared? | rows shared? | sees the 9? |
|---|---|---|---|
| `alias` (a reference) | yes | yes | yes |
| `deep` (`vector<vector<int>>` copy) | no | no | no |
| `shallow` (`vector<shared_ptr<...>>` copy) | no | yes | yes |

#### When the default copy is wrong

```cpp
class Buffer {
    size_t n;
    int* data;                               // owning raw pointer
public:
    explicit Buffer(size_t n) : n(n), data(new int[n]()) {}
    ~Buffer() { delete[] data; }

    Buffer(const Buffer& o) : n(o.n), data(new int[o.n]) {   // deep copy constructor
        copy(o.data, o.data + n, data);
    }
    Buffer& operator=(Buffer o) {            // copy-and-swap: o is already a deep copy
        swap(n, o.n);
        swap(data, o.data);
        return *this;                        // o's destructor frees our old array
    }
    int& operator[](size_t i) { return data[i]; }
};

int main() {
    Buffer a(3);
    a[0] = 7;
    Buffer b = a;                            // deep: b has its own array
    b[0] = 1;
    Buffer c(1);
    c = a;                                   // deep copy assignment
    cout << a[0] << " " << b[0] << " " << c[0] << "\n";   // 7 1 7
}
```

Without the two copy functions, `b` would share `a`'s array: `b[0] = 1` would change `a`, and at the end of `main` both destructors would `delete[]` the same pointer. The simplest fix is to store `vector<int>` instead of `int*`; then the defaults are already deep and you write nothing (the rule of zero).

#### Choosing

- Copy deeply what the object **owns** (composition) and share what it only **refers to** (aggregation); a deep copy of an order should copy its lines but not its customer.
- Immutable parts, such as `shared_ptr<const T>`, can be shared safely, since nobody can change them.
- Deep copies of graphs with cycles need a map from old node to new node, or they recurse forever.

#### Pitfalls

- Writing a destructor that frees memory but keeping the default copy operations.
- Returning a non-const reference to an internal container and assuming callers get a copy.
- Expecting a copy of a container of pointers to copy the objects themselves.
- Copying a derived object through a base reference, which slices it; use a virtual `clone()`.

Connects to: rule of three and five, prototype, immutability, object lifecycle.

### questions
Q: What is the difference between a shallow copy and a deep copy?
A: A shallow copy duplicates the object's members, but members that are pointers still point to the same underlying objects, so both copies share them. A deep copy also duplicates the pointed-to objects, so the copy is fully independent of the original.

Q: Why is the default copy constructor dangerous for a class with a raw owning pointer?
A: It copies the pointer value, so two objects point to the same memory. A change through one is visible through the other, and when both are destroyed, both destructors free the same memory, which is a double free. The class needs a deep copy constructor and assignment operator, or should hold a vector or unique_ptr instead.

Q: Does copying a std::vector make a deep copy?
A: It copies every element with the element's own copy constructor, so a vector of ints, strings or vectors is copied deeply. If the elements are raw pointers or shared_ptrs, only the pointers are copied, and the pointed-to objects end up shared between the two vectors.

Q: How do you copy an object when you only have a pointer to its base class?
A: Constructors cannot be virtual, so add a virtual clone function to the base that returns a unique_ptr to the base, and override it in each derived class with make_unique of the derived type constructed from *this. The derived copy constructor does the actual work.

Q: When is a shallow copy good enough?
A: When everything it shares is immutable, such as objects held through shared_ptr to const, since nobody can change the shared parts. It is also right for pointers to objects the class does not own, like a pointer from an order to its customer.

## oop.language-specifics.rule-of-three-and-five-in-cpp
name: "Rule of three and five in C++"
importance: important
prereqs: [oop.language-specifics.shallow-vs-deep-copy]
scope: "when you write one special member, write the others"

### simple
If a class needs custom code to clean up, it almost always needs custom code to copy and move as well. Think of a rented locker: if leaving requires returning the key, then giving someone a copy of your locker also means arranging a second key and locker. The rule of three and five reminds you to handle all of these together.

### interview
- **Rule of three**: if a class needs a user-defined **destructor**, **copy constructor** or **copy assignment operator**, it almost certainly needs all three, because it manages a resource by hand.
- **Rule of five** (C++11): add the **move constructor** and **move assignment operator**, which steal the resource instead of copying it.
- Declaring a destructor or a copy operation **stops the compiler from generating move operations**, so moves silently become copies. Declaring a move operation makes the implicit copy operations **deleted**.
- **Rule of zero**: prefer members that manage themselves (`vector`, `string`, `unique_ptr`) so you declare none of the five.
- Mark move operations `noexcept`; `vector` only moves elements during reallocation when the move cannot throw, otherwise it copies.
- **Copy-and-swap** implements assignment with a strong exception guarantee and handles self-assignment for free.

### deep
#### The five special members

| member | signature | job |
|---|---|---|
| destructor | `~T()` | release the resource |
| copy constructor | `T(const T&)` | new object with its own copy |
| copy assignment | `T& operator=(const T&)` | replace contents with a copy |
| move constructor | `T(T&&) noexcept` | new object that takes the resource |
| move assignment | `T& operator=(T&&) noexcept` | release own resource, take the other's |

#### Code: a class that follows the rule of five

```cpp
class Text {
    size_t len = 0;
    char* buf = nullptr;
public:
    explicit Text(const char* s) : len(strlen(s)), buf(new char[len + 1]) {
        memcpy(buf, s, len + 1);
    }
    ~Text() { delete[] buf; }                                   // 1

    Text(const Text& o) : len(o.len), buf(new char[o.len + 1]) {   // 2: deep copy
        memcpy(buf, o.buf, len + 1);
    }
    Text(Text&& o) noexcept : len(o.len), buf(o.buf) {          // 4: steal
        o.len = 0;
        o.buf = nullptr;                                        // leave o destructible
    }
    Text& operator=(Text o) noexcept {                         // 3 and 5 in one:
        swap(len, o.len);                                       // o was copied or moved in
        swap(buf, o.buf);
        return *this;
    }
    const char* c_str() const { return buf ? buf : ""; }
};

int main() {
    Text a("hello");
    Text b = a;                  // copy constructor
    Text c = std::move(a);       // move constructor: a is now empty
    b = Text("bye");             // move assignment through the by-value parameter
    c = b;                       // copy assignment
    cout << "[" << a.c_str() << "] " << b.c_str() << " " << c.c_str() << "\n";  // [] bye bye
}
```

Taking the assignment parameter **by value** serves as both copy and move assignment: the caller's argument is copied or moved into `o`, then swapped in. It is safe under self-assignment and gives the strong guarantee, because nothing changes until the copy has fully succeeded.

#### Worked example: what the compiler generates

| you declare | copy ctor / assign | move ctor / assign |
|---|---|---|
| nothing | generated | generated |
| a destructor | generated (deprecated) | **not declared**, moves fall back to copies |
| a copy constructor | yours / generated (deprecated) | not declared |
| a move constructor | **deleted** | yours / not declared |

The middle rows explain a silent performance bug: adding a logging destructor to a class makes every `std::move` of it a full copy.

#### The rule of zero

```cpp
struct Image { vector<unsigned char> pixels; };

class Document {                 // owns memory, yet declares no special members
    string title;
    vector<string> lines;
    unique_ptr<Image> logo;      // move-only: Document becomes move-only too
public:
    explicit Document(string t) : title(std::move(t)) {}
};
```

Each member already knows how to copy, move and destroy itself, so the generated versions are correct. Write the five by hand only for a class whose whole job is managing one resource.

#### Pitfalls

- Moved-from objects must stay destructible and assignable; set pointers to `nullptr`.
- Forgetting `noexcept` on moves makes `vector<Text>` copy on every growth.
- Self-assignment in a hand-written `operator=` that deletes before copying destroys the source.
- `= default` on a destructor still counts as user-declared and suppresses implicit moves; add `= default` moves explicitly if you need them.

Connects to: shallow vs deep copy, constructors and destructors, virtual destructors, move semantics.

### questions
Q: What is the rule of three?
A: If a class needs a custom destructor, copy constructor or copy assignment operator, it almost certainly needs all three. Needing any one of them means the class manages a resource manually, and the compiler's member-wise versions of the others would copy or free that resource incorrectly.

Q: What does the rule of five add, and why?
A: It adds the move constructor and move assignment operator introduced in C++11. They transfer the resource instead of copying it, and since declaring a destructor or copy operation prevents the compiler from generating moves, you must write them yourself to keep moves cheap.

Q: What is the rule of zero?
A: Design classes so they need none of the special member functions, by holding resources in members that manage themselves, such as std::string, std::vector and std::unique_ptr. The compiler-generated versions are then correct and nothing can be forgotten.

Q: Why should move constructors be noexcept?
A: Containers like std::vector must keep their strong exception guarantee when they grow. They move elements to the new buffer only if the move constructor cannot throw; otherwise they copy. A move without noexcept therefore quietly turns every reallocation into copies.

Q: What is the copy-and-swap idiom?
A: The assignment operator takes its argument by value, which makes a copy or a move, then swaps its members with that argument. The old contents are released when the parameter is destroyed. It handles self-assignment and gives the strong exception guarantee.

## oop.language-specifics.equals-and-hashcode-in-java
name: "Equality and hashing"
renamed: true
importance: important
scope: "operator== and the hash must agree, and what breaks when they don't"

### simple
A hash table needs two rules that agree with each other: one that says when two keys mean the same thing, and one that turns a key into a bucket number. It is like a library where books are shelved by a number: two copies of the same book must get the same shelf number, or you will never find the second one. In C++ the two rules are `operator==` and the hash function you give to `unordered_map` or `unordered_set`.

### interview
- The contract: **equal keys must have equal hashes**. In C++ the pair is `operator==` and a hash functor (or a `std::hash` specialization) for unordered containers.
- Equality must be an **equivalence**: reflexive, symmetric and transitive, and it must not change while a key sits in a container.
- Unequal keys **may** share a hash; fewer collisions only mean better speed.
- Break the contract (hash a member that `==` ignores, or hash an address) and equal keys land in different buckets: duplicates get stored and lookups fail.
- A key that changes while inside a container is lost: its bucket was chosen from the old value. `unordered_set` elements and map keys are `const` for this reason, but keys reached through pointers are not protected.
- Ordered containers use `operator<` instead: `std::set` treats a and b as the same when neither is less than the other, so a `<` that disagrees with `==` makes `set` and `unordered_set` disagree.

### deep
#### Why the two must agree

`unordered_set::find(key)` first hashes the key to pick a bucket, then calls `==` only on the entries in that bucket. If two equal keys have different hashes, they sit in different buckets and `==` is never even asked.

#### Worked example: a hash that breaks the contract

```cpp
struct Account {
    int id;
    string nickname;                                   // display only: not part of equality
    bool operator==(const Account& o) const { return id == o.id; }
};

struct BadHash {                                       // breaks the contract: uses nickname too
    size_t operator()(const Account& a) const {
        return hash<string>{}(a.nickname) ^ hash<int>{}(a.id);
    }
};

struct GoodHash {                                      // hashes exactly what == compares
    size_t operator()(const Account& a) const { return hash<int>{}(a.id); }
};

int main() {
    unordered_set<Account, BadHash> bad{{7, "main"}, {7, "savings"}};
    unordered_set<Account, GoodHash> good{{7, "main"}, {7, "savings"}};
    cout << bad.size() << " " << bad.count({7, "other"}) << " | "
         << good.size() << " " << good.count({7, "other"}) << "\n";   // 2 0 | 1 1
}
```

| container | stores `{7, "main"}` and `{7, "savings"}` as | finds `{7, "other"}`? |
|---|---|---|
| `BadHash` | two entries, though `==` calls them equal | no: it looks in another bucket |
| `GoodHash` | one entry | yes |

(With `BadHash` the outcome depends on bucket placement, so it is "almost always" wrong rather than always; that is what makes such bugs hard to find.)

#### Hashing a composite key

C++ has no `std::hash` for `pair`, `tuple` or your own structs. Combine the hashes of exactly the members that `==` compares:

```cpp
struct Point {
    int x, y;
    bool operator==(const Point&) const = default;     // C++20: compares x and y
};

struct PointHash {
    size_t operator()(const Point& p) const {
        size_t h = hash<int>{}(p.x);
        return h ^ (hash<int>{}(p.y) + 0x9e3779b97f4a7c15ULL + (h << 6) + (h >> 2));   // mix
    }
};
```

Avoid plain `hx ^ hy`: it is symmetric, so `(1, 2)` and `(2, 1)` collide, and every `(x, x)` hashes to 0.

#### What else breaks

- **Changing a key**: in an `unordered_set<Point*, DerefHash, DerefEq>` that hashes the pointed-to point, changing `p->x` strands the entry in the old bucket; it can no longer be found or erased.
- **Equality vs equivalence**: a case-insensitive `set<string>` keeps one of "Apple" and "apple", while an `unordered_set<string>` keeps both. Mixing them for the same data gives inconsistent answers.
- **Floating-point keys**: `0.0 == -0.0` while their bit patterns differ, and NaN is not equal to itself. Avoid them as hash keys.

Connects to: hash table internals, immutability, operator overloading and friend functions.

### questions
Q: What is the contract between equality and hashing?
A: If two keys are equal according to operator==, the hash function must return the same value for both, and that value must not change while the key is stored. Unequal keys may share a hash, but fewer collisions make hash tables faster.

Q: What happens if the hash function uses a member that operator== ignores?
A: Two keys that compare equal can get different hashes, so they land in different buckets. The unordered container then stores both as separate entries, and looking up an equal key usually fails because it searches the wrong bucket.

Q: Why is it dangerous to change a key after inserting it into a hash container?
A: The entry was placed in a bucket computed from the old value. After the change, lookups compute a new hash and search a different bucket, so the entry can no longer be found or erased. That is why unordered_set elements and map keys are const.

Q: How do you use your own struct as a key in unordered_map?
A: Define operator== and a hash functor that combines the hashes of exactly the members operator== compares, then pass it as the Hash template argument, or specialize std::hash for the type. Combine with a mixing step rather than a plain XOR to avoid systematic collisions.

Q: How does std::set decide that two keys are the same?
A: It never calls operator==. Two keys are equivalent when neither is less than the other under the set's comparator. If that comparator disagrees with operator==, such as a case-insensitive comparison, a set and an unordered_set of the same strings can hold different items.

## oop.language-specifics.immutability
name: "Immutability"
importance: important
scope: "immutable objects, benefits for thread safety"

### simple
An immutable object can never change after it is created; to get a different value you make a new object. A printed book works like this: you cannot edit the words, so you print a new edition instead. Because nobody can change it, anyone can share it and read it at the same time without trouble.

### interview
- An **immutable** object's observable state is fixed after construction. In C++ you get it with `const` objects, classes whose members are private and whose every public function is `const`, and sharing through `shared_ptr<const T>`.
- Recipe: private members, all state set in the constructor, only `const` member functions, "modifiers" that return a **new** object (`Money plus(const Money&) const`), and copies of any containers passed in.
- **Thread safety**: with no writes after construction there are no data races, so immutable objects can be shared across threads with no locks. The standard library guarantees that concurrent calls to `const` member functions of its types are safe.
- Other benefits: safe hash keys, results that can be cached, simple reasoning, free sharing, and no half-updated states.
- Cost: every change builds a new object. Building a big value step by step is better done with a mutable builder (a `string` with `+=`, a `vector` with `push_back`) that is then frozen.
- `T* const p` (a constant pointer) is not the same as `const T* p` (a pointer to constant data); only the second protects the object.

### deep
#### Intuition

Most concurrency bugs and many plain bugs come from one piece of code changing data while another piece is reading it. An immutable object removes the "changing" half. Once built, it can be handed to any thread, cached, used as a key or passed around without anyone having to wonder who else holds it.

#### Worked example: a money value

```cpp
class Money {
    long long paise;
    string currency;
public:
    Money(long long p, string c) : paise(p), currency(std::move(c)) {}
    Money plus(const Money& o) const {                  // returns a new object instead of changing this
        if (currency != o.currency) throw invalid_argument("currency mismatch");
        return Money(paise + o.paise, currency);
    }
    long long value() const { return paise; }
    const string& unit() const { return currency; }
};

int main() {
    const Money a(500, "INR");
    Money b = a.plus(Money(250, "INR"));
    Money c = a;                                        // sharing a's value is harmless
    cout << a.value() << " " << b.value() << " " << c.value() << "\n";   // 500 750 500
}
```

| code | a | b | c |
|---|---|---|---|
| `const Money a(500, "INR")` | 500 | - | - |
| `Money b = a.plus(Money(250, "INR"))` | 500 | 750 | - |
| `Money c = a` | 500 | 750 | 500 |

Members are private but not `const`, so `Money` can still be assigned as a whole (`b = a;`), which containers need; no single field can be changed from outside. Declaring members `const` makes the class impossible to assign, which is usually more trouble than help.

#### Sharing across threads

```cpp
struct Config {
    const string region;
    const int maxUsers;
};

int main() {
    auto cfg = make_shared<const Config>(Config{"ap-south", 100});   // built once, then frozen
    vector<thread> readers;
    atomic<int> total{0};
    for (int i = 0; i < 4; ++i)
        readers.emplace_back([cfg, &total] { total += cfg->maxUsers; });   // reads need no lock
    for (auto& t : readers) t.join();
    cout << total << "\n";                              // 400
}
```

To change the configuration, build a new `Config` and swap the pointer that readers take their copy from (atomically, or under a mutex): readers keep using the old snapshot until they fetch the new one.

#### Why it is thread-safe

A data race needs at least one write. An immutable object is written only in its constructor, before other threads can see it (as long as `this` does not escape the constructor). After that, any number of threads may read it at the same time.

#### Pitfalls

- A `const` pointer member (`T* const p`) whose target is still mutable.
- Returning a non-const reference or pointer to internal state from a `const` function.
- `mutable` members (often caches) inside "immutable" objects: they are fine only if every access is synchronized.
- Casting away `const` with `const_cast` and writing: undefined behavior if the object was defined `const`.

Connects to: encapsulation, equality and hashing, shallow vs deep copy, builder pattern, thread safety.

### questions
Q: How do you make a class immutable in C++?
A: Keep its members private, set all state in the constructor, make every public member function const, and have operations that would modify it return a new object instead. Copy any containers passed in, and never return non-const references to internal data.

Q: Why are immutable objects thread-safe?
A: A data race needs at least one thread writing while another accesses the same data. An immutable object is only written during construction, so after it is safely published any number of threads can read it without locks.

Q: What is the difference between const T* and T* const?
A: const T* is a pointer to constant data: the pointer may be moved to another object, but the object cannot be changed through it. T* const is a constant pointer: it always points to the same object, but that object can still be modified. Only the first gives immutability of the data.

Q: What is the downside of immutability, and how do you work around it?
A: Every change creates a new object, which costs allocation and copying and can be slow in loops. Build the value with a mutable object, such as a string or vector, and freeze it at the end, or share large unchanged parts between versions with shared_ptr to const.

Q: Why do immutable objects make good hash keys?
A: Their hash never changes, so an entry always stays in the bucket where it was inserted. The hash can even be computed once in the constructor and stored.

## oop.language-specifics.operator-overloading-and-friend-functions
name: "Operator overloading and friend functions"
importance: important
scope: "C++ specifics"

### simple
Operator overloading lets your own types use symbols like plus and double equals, so code with them reads like ordinary math. A friend function is an outside helper that a class allows to see its private parts. It is like giving a trusted accountant access to your private records so they can prepare your statement.

### interview
- C++ lets you define operators for your types: `a + b` calls `operator+(a, b)` or `a.operator+(b)`. You cannot invent operators or change **precedence, associativity or arity**, and you cannot overload `::`, `.`, `.*`, `?:`, `sizeof` or `typeid`.
- `=`, `[]`, `()` and `->` must be **members**. Symmetric binary operators (`+`, `==`, `<`) are better as **non-members** so implicit conversions work on both sides (`2 + x` as well as `x + 2`).
- `operator<<` for printing must be a non-member, because the left operand is `ostream`; it is often a **friend** to read private fields.
- A **friend** function or class may access private and protected members. Friendship is granted by the class, is not inherited, not transitive and not mutual.
- Canonical forms: implement `+=` as a member returning `*this`, then `+` in terms of it; prefix `++` returns a reference, postfix `++` takes a dummy `int` and returns the old value. C++20 can default `==` and `<=>` to generate all comparisons.
- `operator()` makes a **function object** (comparators, hashers, and the classes the compiler writes for lambdas). Mark conversion operators **`explicit`** (`explicit operator bool`) so they work in `if` but never sneak into arithmetic.

### deep
#### Intuition

`total = price * qty + tax` is easier to read than `add(multiply(price, qty), tax)`. Operator overloading gives user types the same readability as built-in numbers, as long as each operator means what readers expect.

#### Code: a 2D vector

```cpp
class Vec2 {
    double x, y;
public:
    Vec2(double x = 0, double y = 0) : x(x), y(y) {}   // not explicit: 2.0 converts to Vec2(2, 0)

    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }   // member, returns *this
    Vec2 operator-() const { return {-x, -y}; }                             // unary minus
    double& operator[](int i) { return i == 0 ? x : y; }                     // must be a member

    friend Vec2 operator+(Vec2 a, const Vec2& b) { a += b; return a; }  // symmetric, non-member
    friend bool operator==(const Vec2&, const Vec2&) = default;              // C++20
    friend ostream& operator<<(ostream& os, const Vec2& v) {  // friend: reads x and y
        return os << "(" << v.x << ", " << v.y << ")";
    }
};

class Counter {
    int n = 0;
public:
    Counter& operator++() { ++n; return *this; }        // prefix: ++c
    Counter operator++(int) { Counter old = *this; ++n; return old; }   // postfix: c++
    int get() const { return n; }
};

int main() {
    Vec2 a(1, 2), b(3, 4);
    Vec2 c = a + b;                      // (4, 6)
    Vec2 d = 2.0 + a;                    // works because operator+ is a non-member: (3, 2)
    c[1] = 10;
    cout << c << " " << d << " " << -a << " " << (a == Vec2(1, 2)) << "\n";
    // (4, 10) (3, 2) (-1, -2) 1
    Counter k;
    Counter before = k++;
    ++k;
    cout << before.get() << " " << k.get() << "\n";     // 0 2
}
```

#### Worked example: member vs non-member

If `operator+` were a member `Vec2 operator+(const Vec2&) const`:

| expression | member `+` | non-member `+` |
|---|---|---|
| `a + b` | `a.operator+(b)`, fine | `operator+(a, b)`, fine |
| `a + 2.0` | `a.operator+(Vec2(2.0))`, fine | fine |
| `2.0 + a` | error: `double` has no member `operator+` | `operator+(Vec2(2.0), a)`, fine |

Implicit conversions apply to arguments, never to the object a member is called on, so only the non-member version is symmetric.

#### Friend functions

A friend declared inside the class (a "hidden friend", as above) is found only through argument-dependent lookup, which keeps overload sets small. Friendship is a deliberate hole in encapsulation: grant it to functions that are logically part of the class's interface (stream operators, symmetric operators), not as a shortcut around a missing getter.

```cpp
class Matrix;                          // friend class example
class Vector3 {
    double v[3] = {0, 0, 0};
    friend class Matrix;               // Matrix may read v; Vector3 may not read Matrix's privates
};
class Matrix {
public:
    double firstOf(const Vector3& x) const { return x.v[0]; }
};
```

#### Call and conversion operators

```cpp
struct ByLength {                          // a function object: operator() makes it callable
    bool operator()(const string& a, const string& b) const { return a.size() < b.size(); }
};

class Handle {
    int fd = -1;
public:
    explicit Handle(int f) : fd(f) {}
    explicit operator bool() const { return fd >= 0; }   // if (h) works; int n = h does not
};

int main() {
    vector<string> w{"pear", "fig", "banana"};
    sort(w.begin(), w.end(), ByLength{});
    cout << w[0] << " " << w[2] << "\n";       // fig banana
    Handle ok(3), bad(-1);
    if (ok && !bad) cout << "ok\n";            // ok
    // int n = ok;                             // error: the conversion is explicit
}
```

A lambda is shorthand for such a class: the compiler writes a struct with an `operator()` and stores the captures as its fields. Before `explicit` conversions (C++11), a plain `operator bool` let `handle + 1` compile, which is why older code used the "safe bool" idiom.

#### Pitfalls

- Operators with surprising meanings (`+` that mutates, `==` that is not an equivalence).
- Overloading `&&` or `||`: an overload always evaluates both operands, so short-circuiting is lost (and before C++17 even their order was unspecified). Avoid it, and the comma operator too.
- Returning a reference to a local from `operator+`.
- Defining `==` without `!=` before C++20, or `<` inconsistently with `==`.

Connects to: polymorphism, encapsulation, access modifiers, equality and hashing.

### questions
Q: Which C++ operators cannot be overloaded?
A: The scope resolution operator ::, member access ., pointer-to-member access .*, the conditional operator ?:, sizeof and typeid (along with alignof and noexcept). You also cannot create new operators or change an operator's precedence, associativity or number of operands.

Q: Why is operator<< for printing usually a friend non-member function?
A: Its left operand is the output stream, not your object, so it cannot be a member of your class. Making it a friend lets it read the private fields it needs to print, while keeping the natural cout << obj syntax.

Q: When should a binary operator be a non-member?
A: When it should treat both operands symmetrically, like + or ==. Implicit conversions are applied to function arguments but not to the object a member function is called on, so only a non-member lets both 2 + v and v + 2 compile.

Q: How do you tell prefix and postfix increment apart when overloading?
A: The postfix form takes an unused int parameter: T operator++(int). By convention the prefix version increments and returns a reference to the object, while the postfix version saves a copy, increments, and returns the old copy by value, which makes it slightly more expensive.

Q: What are the properties of friendship in C++?
A: A class grants friendship explicitly; nobody can claim it. It is not inherited by derived classes of the friend, not transitive (a friend of a friend is not a friend) and not mutual (if A declares B a friend, A gets no access to B).

## oop.language-specifics.virtual-destructors
name: "Virtual destructors"
importance: important
prereqs: [oop.pillars.polymorphism]
scope: "why base classes need them"

### simple
A base class that others inherit from needs a virtual destructor so that deleting an object through a base pointer cleans up the whole object. Imagine a moving company told to remove "the furniture", which only takes the frame of a bunk bed and leaves the top bunk behind. A virtual destructor makes sure the most specific cleanup runs first, then the general one.

### interview
- Deleting a derived object **through a base pointer** whose destructor is **not virtual** is **undefined behavior**; in practice only the base destructor runs and the derived part leaks.
- Rule: a class meant to be used polymorphically (has any virtual function, or is deleted through a base pointer) needs a **public virtual destructor**, or a **protected non-virtual** one to forbid deleting through the base.
- With a virtual destructor, `delete basePtr` calls the derived destructor first, then each base destructor in reverse order of construction.
- `virtual ~Base() = default;` is enough. A **pure virtual** destructor (`virtual ~Base() = 0;`) is allowed but must still have a definition, because derived destructors call it.
- Cost: a vptr per object if the class had no virtual functions before. Do not add one to small value types that are never used as bases.
- `unique_ptr<Base>` needs the virtual destructor; `shared_ptr<Base>` built from `make_shared<Derived>` remembers the right deleter, but do not rely on that. Standard containers have no virtual destructor, so do not inherit from them to delete polymorphically.

### deep
#### The bug

```cpp
struct Base {
    ~Base() { cout << "~Base\n"; }                 // NOT virtual
};
struct Derived : Base {
    vector<int> data = vector<int>(1000);
    ~Derived() { cout << "~Derived\n"; }
};

void leaky() {
    Base* p = new Derived;
    delete p;                                      // undefined behavior: usually only ~Base runs
}
```

The compiler sees `delete` on a `Base*`, and because `~Base` is not virtual it calls `Base::~Base` directly (static binding), just as with any non-virtual function. `Derived`'s destructor never runs, so its vector's memory leaks; with more complex classes, worse things happen. AddressSanitizer reports this as a new-delete type mismatch.

#### The fix

```cpp
struct Shape {
    virtual ~Shape() { cout << "~Shape\n"; }      // virtual: dispatches to the real type
    virtual double area() const = 0;
};
struct Circle : Shape {
    double r;
    explicit Circle(double r) : r(r) {}
    ~Circle() override { cout << "~Circle\n"; }
    double area() const override { return 3.14159 * r * r; }
};
struct Ring : Circle {
    Ring() : Circle(2) {}
    ~Ring() override { cout << "~Ring\n"; }
};

int main() {
    unique_ptr<Shape> s = make_unique<Ring>();
    s.reset();                                     // ~Ring, ~Circle, ~Shape
}
```

#### Worked example: the order

| step | destructor | why |
|---|---|---|
| 1 | `~Ring` | the virtual call reaches the most derived class |
| 2 | `~Circle` | then its direct base |
| 3 | `~Shape` | then the root |

It is the reverse of construction (Shape, Circle, Ring). During `~Circle`, the object is treated as a `Circle` again, so virtual calls made there do not reach `Ring`.

#### Protected non-virtual destructor

If a base exists only to share code or declare an interface, and nobody should delete through it, make the destructor protected:

```cpp
class Comparable {
protected:
    ~Comparable() = default;          // "delete (Comparable*)p" will not compile
public:
    virtual int compare(const Comparable& other) const = 0;
};
```

This avoids undefined behavior at compile time without requiring a virtual destructor.

#### Pure virtual destructors

```cpp
struct Plugin {
    virtual ~Plugin() = 0;            // makes the class abstract even with no other pure virtuals
};
Plugin::~Plugin() = default;          // still needs a body: ~Derived calls it
```

#### Pitfalls

- Inheriting from `std::vector` or `std::string` and deleting through the base type.
- Forgetting the virtual destructor on an interface that is otherwise all pure virtual functions (`-Wdelete-non-virtual-dtor` warns).
- Adding virtual destructors to every class "just in case": it adds a vptr and signals a polymorphic type where none is meant.

Connects to: polymorphism, constructors and destructors, rule of three and five, abstract class vs interface.

### questions
Q: Why does a polymorphic base class need a virtual destructor?
A: Deleting a derived object through a base pointer calls the destructor that the pointer's static type selects unless the destructor is virtual. Without virtual, only the base destructor runs, which is undefined behavior and in practice leaks or corrupts the derived part.

Q: In what order do destructors run when a virtual destructor is called through a base pointer?
A: The most derived class's destructor runs first, then its base class destructors in reverse order of construction, ending with the root base. Members of each class are destroyed right after that class's destructor body.

Q: What is the alternative to a public virtual destructor for a base class?
A: A protected non-virtual destructor. Derived classes can still be destroyed normally, but code cannot delete an object through a pointer to the base, so the dangerous case fails to compile.

Q: Can a destructor be pure virtual?
A: Yes, it makes the class abstract. It still needs a definition outside the class, because every derived class's destructor calls the base destructor when it finishes.

Q: Should every class have a virtual destructor?
A: No. Only classes meant to be used polymorphically need one. For small value types it adds a vptr to every object and suggests the class is designed for inheritance when it is not.
