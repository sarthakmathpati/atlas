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
- **Shallow copy**: copies each field's value; for pointers or references that value is an address, so the copy and the original **share** the pointed-to data.
- **Deep copy**: also copies what the fields point to, recursively, so the copy is fully **independent**.
- **C++**: the compiler-generated copy constructor and copy assignment copy member by member. With a raw owning pointer that is shallow, and both destructors free the same memory (**double free**). Fix with a user-written deep copy (rule of three) or, better, members like `vector` and `string` that copy themselves.
- **Java**: `Object.clone()` is shallow and needs `Cloneable`; arrays' `clone()` is shallow too. Copy constructors or static factories (`new ArrayList<>(other)`) are usually clearer, and still shallow for the elements.
- **Python**: assignment copies nothing; `copy.copy`, slicing and `list(x)` are shallow; `copy.deepcopy` is deep and handles cycles with a memo.
- Immutable parts (strings, numbers, tuples of immutables) can be shared safely, so a shallow copy is enough for them.

### deep
#### Intuition

An object is a tree of values and references. A copy has to decide, at every reference, whether to copy the reference (share) or copy the thing it points to (duplicate). Shallow copies share below the first level; deep copies duplicate everything reachable.

#### Worked example in Python

```python
import copy

grid = [[0, 0], [0, 0]]
alias = grid                     # no copy at all
shallow = copy.copy(grid)        # new outer list, same inner lists
deep = copy.deepcopy(grid)       # new outer and inner lists

grid[0][0] = 9
print(alias[0][0], shallow[0][0], deep[0][0])   # 9 9 0

grid.append([1, 1])
print(len(alias), len(shallow), len(deep))      # 3 2 2

rows = [[0] * 2] * 2             # the classic trap: one inner list, referenced twice
rows[0][0] = 5
print(rows)                      # [[5, 0], [5, 0]]
```

| after `grid[0][0] = 9` | outer list shared? | inner lists shared? | sees the 9? |
|---|---|---|---|
| alias | yes | yes | yes |
| shallow | no | yes | yes |
| deep | no | no | no |

#### C++: when the default copy is wrong

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

#### Java: clone and copy constructors

```java
class Team implements Cloneable {
    String name;
    List<String> members = new ArrayList<>();

    @Override
    public Team clone() {
        try {
            Team t = (Team) super.clone();            // shallow: members list is shared
            t.members = new ArrayList<>(members);     // copy the list to make it independent
            return t;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);              // cannot happen: we implement Cloneable
        }
    }

    Team(String name) { this.name = name; }
    Team(Team other) {                                // a copy constructor is often clearer
        this(other.name);
        members.addAll(other.members);
    }
}
```

`clone` is awkward: `Cloneable` has no methods, `super.clone()` skips constructors, and `final` fields cannot be reassigned after it. Effective Java recommends copy constructors or copy factories instead.

#### Choosing

- Copy deeply what the object **owns** (composition) and share what it only **refers to** (aggregation); a deep copy of an order should copy its lines but not its customer.
- Immutable parts never need copying.
- Deep copies of graphs must handle cycles (`deepcopy`'s memo dictionary) or they recurse forever.

#### Pitfalls

- `[[0] * m] * n` in Python creates n references to one row.
- Returning an internal list from a getter and assuming callers get a copy.
- In C++, writing a destructor that frees memory but leaving the default copy operations.
- Expecting `new ArrayList<>(list)` to copy the elements themselves.

Connects to: rule of three and five, prototype, immutability, object lifecycle.

### questions
Q: What is the difference between a shallow copy and a deep copy?
A: A shallow copy duplicates the object's fields, but fields that are references still point to the same underlying objects, so both copies share them. A deep copy also duplicates the referenced objects recursively, so the copy is fully independent of the original.

Q: Why is the default copy constructor dangerous for a class with a raw owning pointer?
A: It copies the pointer value, so two objects point to the same memory. A change through one is visible through the other, and when both are destroyed, both destructors free the same memory, which is a double free. The class needs a deep copy constructor and assignment operator, or should hold a vector or unique_ptr instead.

Q: Is Java's clone a deep copy?
A: No. Object.clone copies fields one by one, so referenced objects such as lists are shared. A deep clone must copy those fields itself after calling super.clone, and many developers prefer copy constructors or copy factories because clone has awkward rules.

Q: What does copy.deepcopy do that copy.copy does not?
A: copy.copy creates a new container whose elements are the same objects as the original's. copy.deepcopy recursively copies the elements too, using a memo dictionary so shared references and cycles are copied once and the structure is preserved.

Q: When is a shallow copy good enough?
A: When everything it shares is immutable, such as strings, numbers or frozen value objects, since nobody can change the shared parts. It is also right for references the object does not own, like a pointer from an order to its customer.

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
name: "equals and hashCode in Java"
importance: important
scope: "the contract and what breaks when violated"

### simple
In Java, equals decides whether two objects mean the same thing, and hashCode decides which bucket a hash table puts them in. It is like a library where books are shelved by a number: two copies of the same book must get the same shelf number, or you will never find the second one. So whenever you define equals, you must define hashCode to match.

### interview
- Default `Object.equals` is **identity** (`==`); override it to compare **values**, and always with the signature `equals(Object o)`.
- **equals contract**: reflexive, symmetric, transitive, consistent, and `x.equals(null)` is false.
- **hashCode contract**: equal objects **must** have equal hash codes; the value must stay the same while the fields used by `equals` do not change; unequal objects **may** collide (fewer collisions give better performance).
- Override `equals` without `hashCode` and hash collections break: a `HashSet` accepts "duplicates" and `contains` fails for an equal object, because the two land in different buckets.
- Mutating a field used in `hashCode` after inserting into a `HashSet` or as a `HashMap` key strands the entry in the wrong bucket.
- Use `Objects.equals` and `Objects.hash`, or a **record** (Java 16), which generates both. Python's analog is `__eq__` with `__hash__` (defining `__eq__` alone makes a class unhashable).

### deep
#### Why the two must agree

`HashMap.get(key)` first computes `key.hashCode()` to pick a bucket, then calls `equals` only on entries in that bucket. If two equal objects have different hash codes, they sit in different buckets and `equals` is never even asked.

#### Worked example: the broken version

```java
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point)) return false;
        Point p = (Point) o;
        return x == p.x && y == p.y;
    }
    // hashCode NOT overridden: falls back to identity-based Object.hashCode
}

public class Demo {
    public static void main(String[] args) {
        Set<Point> seen = new HashSet<>();
        seen.add(new Point(1, 2));
        System.out.println(new Point(1, 2).equals(new Point(1, 2)));   // true
        System.out.println(seen.contains(new Point(1, 2)));            // almost always false
        seen.add(new Point(1, 2));
        System.out.println(seen.size());                               // almost always 2
    }
}
```

| step | hashCode of the new point | bucket searched | result |
|---|---|---|---|
| `add(p1)` | identity hash, say h1 | h1's bucket | stored |
| `contains(p2)` | a different identity hash h2 | h2's bucket, empty | false |
| `add(p2)` | h2 | h2's bucket | stored again, size 2 |

("Almost always" because two identity hashes could collide by chance.)

#### The correct version

```java
final class GoodPoint {
    private final int x, y;
    GoodPoint(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GoodPoint p = (GoodPoint) o;
        return x == p.x && y == p.y;
    }

    @Override public int hashCode() { return Objects.hash(x, y); }   // same fields as equals
}

record Coord(int x, int y) {}    // generates equals, hashCode and toString from x and y
```

#### What else breaks

- **Overloading instead of overriding**: `public boolean equals(Point p)` does not override `equals(Object)`; collections call the `Object` version and get identity. `@Override` turns this into a compile error.
- **Mutable keys**: put a point in a `HashSet`, change its `x`, and `contains` looks in the new bucket while the entry sits in the old one. It cannot be found or removed.
- **Symmetry with subclasses**: if `ColorPoint extends Point` adds a color to `equals`, then `point.equals(colorPoint)` may be true while `colorPoint.equals(point)` is false. `getClass()` comparison avoids this but makes subclasses never equal to parents; `instanceof` with a `final` class is the other clean choice.
- **Sorted sets**: `TreeSet` uses `compareTo`, not `equals`; if they disagree, a `TreeSet` and a `HashSet` of the same elements can contain different items (`BigDecimal("1.0")` and `BigDecimal("1.00")` are not equal but compare as 0).

#### The same idea elsewhere

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):                     # needed: defining __eq__ sets __hash__ to None
        return hash((self.x, self.y))


print(Point(1, 2) in {Point(1, 2)})        # True
```

In C++, an `unordered_set<Point>` needs `operator==` and a `std::hash<Point>` specialization that agree in the same way.

Connects to: hash table internals, immutability, abstract class vs interface.

### questions
Q: What is the contract between equals and hashCode?
A: If two objects are equal according to equals, they must return the same hashCode. hashCode must return the same value while the fields used by equals do not change. Unequal objects may share a hash code, but fewer collisions make hash tables faster.

Q: What happens if you override equals but not hashCode?
A: Equal objects keep the identity-based hash codes from Object, so hash-based collections put them in different buckets. A HashSet then stores duplicates, and contains or get fail for an object equal to one already stored.

Q: Why is public boolean equals(Point other) a bug?
A: It overloads equals instead of overriding equals(Object). Collections and most library code call the Object version, which still compares identity, so the custom logic is silently ignored. Adding the Override annotation turns this mistake into a compile error.

Q: Why is it dangerous to mutate an object that is a key in a HashMap?
A: The entry was placed in a bucket based on the hash code at insertion time. If a field used by hashCode changes, lookups compute a new hash and search a different bucket, so the entry can no longer be found or removed, which also leaks memory.

Q: What properties must equals satisfy?
A: Reflexive (x equals x), symmetric (if x equals y then y equals x), transitive (x equals y and y equals z imply x equals z), consistent (repeated calls agree while nothing changes), and x.equals(null) must return false.

## oop.language-specifics.immutability
name: "Immutability"
importance: important
scope: "immutable objects, benefits for thread safety"

### simple
An immutable object can never change after it is created; to get a different value you make a new object. A printed book works like this: you cannot edit the words, so you print a new edition instead. Because nobody can change it, anyone can share it and read it at the same time without trouble.

### interview
- An **immutable** object's observable state is fixed after construction: `String`, `Integer`, `LocalDate` in Java; `str`, `tuple`, `frozenset` in Python; `const` objects in C++.
- Recipe (Java): make the class `final` (or give it private constructors), all fields `private final`, no setters, **defensive copies** of mutable arguments and of anything returned, and do not let `this` escape the constructor.
- **Thread safety**: with no writes after construction there are no data races, so immutable objects can be shared across threads with no locks. Java's `final` fields are guaranteed visible to other threads once the constructor finishes.
- Other benefits: safe hash map keys, cacheable hash codes, simple reasoning, free sharing (interning, caching), and no half-updated states.
- Cost: every change allocates a new object. Repeated `s += x` on strings in a loop is O(n²); use a mutable builder (`StringBuilder`, `"".join`) for heavy construction.
- A `final` reference is not an immutable object: `final List<String> xs` can still be `add`ed to.

### deep
#### Intuition

Most concurrency bugs and many plain bugs come from one piece of code changing data while another piece is reading it. An immutable object removes the "changing" half. Once built, it can be handed to any thread, cached, used as a key or passed around without anyone having to wonder who else holds it.

#### Worked example: a money value

```java
final class Money {                              // final: no mutable subclass can sneak in
    private final long paise;
    private final String currency;

    Money(long paise, String currency) {
        this.paise = paise;
        this.currency = Objects.requireNonNull(currency);
    }
    Money plus(Money other) {                    // returns a new object instead of changing this
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency");
        return new Money(paise + other.paise, currency);
    }
    long paise() { return paise; }
}

final class Invoice {
    private final List<Money> items;
    Invoice(List<Money> items) { this.items = List.copyOf(items); }  // defensive, unmodifiable copy
    List<Money> items() { return items; }        // safe to return: callers cannot modify it
}
```

| code | a | b | c |
|---|---|---|---|
| `Money a = new Money(500, "INR")` | 500 | - | - |
| `Money b = a.plus(new Money(250, "INR"))` | 500 | 750 | - |
| `Money c = a` | 500 | 750 | 500, the same object as a, and that is fine |

`a` never changes, so sharing it with `c` (or another thread) is harmless. Without `List.copyOf`, the caller who passed the list could keep editing it after the invoice was built.

#### Python and C++

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Money:
    paise: int
    currency: str


a = Money(500, "INR")
b = replace(a, paise=750)        # a new object; a is unchanged
print(a, b, a == Money(500, "INR"), hash(a) == hash(Money(500, "INR")))
# Money(paise=500, currency='INR') Money(paise=750, currency='INR') True True
```

```cpp
class Money {
    const long long paise;                       // const members: fixed after construction
    const string currency;
public:
    Money(long long p, string c) : paise(p), currency(std::move(c)) {}
    Money plus(const Money& o) const { return Money(paise + o.paise, currency); }
    long long value() const { return paise; }
};
```

In C++ it is more common to keep members non-`const` (so the type stays assignable) and expose only `const` methods, or to share `shared_ptr<const T>`.

#### Why it is thread-safe

A data race needs at least one write. An immutable object is written only inside its constructor, before other threads can see it (as long as `this` does not escape). Java adds a guarantee for `final` fields: any thread that obtains a reference to the object after construction sees those fields' final values, even without synchronization.

#### Costs and remedies

- Creating many short-lived objects adds allocation and garbage-collection work; this is usually cheap, and persistent data structures share most of their structure between versions.
- Building a big value step by step: use a mutable builder, then freeze (`StringBuilder` then `toString`, a list then `tuple`).
- Deep immutability needs every field to be immutable too; a record holding an `ArrayList` is only shallowly immutable.

#### Pitfalls

- A `final` field pointing at a mutable object.
- Getters that return internal arrays.
- Letting `this` escape from the constructor (registering a listener), which lets another thread see a half-built object.

Connects to: encapsulation, equals and hashCode, shallow vs deep copy, builder pattern, thread safety.

### questions
Q: How do you make a class immutable in Java?
A: Declare the class final, make every field private and final, provide no setters, make defensive copies of mutable objects passed into the constructor, and never return references to internal mutable objects. Also avoid letting this escape during construction.

Q: Why are immutable objects thread-safe?
A: A data race needs at least one thread writing while another accesses the same data. An immutable object is only written during construction, so after it is safely published any number of threads can read it without locks.

Q: What is the difference between a final variable and an immutable object?
A: final means the variable cannot be made to point to another object. The object it points to can still change if its class allows it, as with a final ArrayList that you can still add to. Immutability is a property of the object itself.

Q: What is the downside of immutability, and how do you work around it?
A: Every change creates a new object, which costs allocation and can be slow in loops, such as building a string with repeated concatenation. Use a mutable builder for construction and convert to the immutable form at the end, or use persistent data structures that share structure.

Q: Why do immutable objects make good hash map keys?
A: Their hash code never changes, so an entry always stays in the bucket where it was inserted. The hash can even be computed once and cached, as Java's String does.

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
- Java has no user operator overloading; Python uses dunder methods (`__add__`, `__radd__`, `__eq__`, `__lt__`, `__getitem__`).

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

#### Python's version

```python
class Vec2:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __add__(self, other):
        return Vec2(self.x + other.x, self.y + other.y)

    def __mul__(self, k):              # v * 3
        return Vec2(self.x * k, self.y * k)

    __rmul__ = __mul__                 # 3 * v: Python tries int.__mul__, then Vec2.__rmul__

    def __eq__(self, other):
        return (self.x, self.y) == (other.x, other.y)

    def __repr__(self):
        return f"Vec2({self.x}, {self.y})"


print(Vec2(1, 2) + Vec2(3, 4), 3 * Vec2(1, 2))   # Vec2(4, 6) Vec2(3, 6)
```

#### Pitfalls

- Operators with surprising meanings (`+` that mutates, `==` that is not an equivalence).
- Overloading `&&` or `||`: an overload always evaluates both operands, so short-circuiting is lost (and before C++17 even their order was unspecified). Avoid it, and the comma operator too.
- Returning a reference to a local from `operator+`.
- Defining `==` without `!=` before C++20, or `<` inconsistently with `==`.

Connects to: polymorphism, encapsulation, access modifiers, equals and hashCode.

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
