---
topic: lang.cpp-core
name: "C++ essentials"
subject: lang
order: 1
prereqs: []
---

## lang.cpp-core.types-and-operators
name: "Types and operators"
importance: must
scope: "integer types and ranges, overflow, implicit conversions, integer division, `auto`"

### simple
Every integer type in C++ is a box with a fixed number of bits, like a car's odometer with a fixed number of digits. An unsigned box rolls over to zero when it passes its largest value, just like the odometer. A signed box that overflows is worse: the program is no longer valid at all, so you pick a box big enough before you do the arithmetic.

### interview
- The standard fixes only minimum widths: `short` and `int` at least 16 bits, `long` at least 32, `long long` at least 64. On 64-bit Linux `int` is 32 bits (about ±2.1 × 10^9) and `long` and `long long` are 64 bits (about ±9.2 × 10^18); on 64-bit Windows `long` is 32 bits. Use `int32_t`, `int64_t` from `<cstdint>` when the width matters.
- **Signed overflow is undefined behavior**; **unsigned arithmetic wraps** modulo 2^N. `int a = 1e5, b = 1e5; long long x = a * b;` is still wrong, because the multiply happens in `int`: write `1LL * a * b`.
- **Implicit conversions**: `char` and `short` are promoted to `int` before arithmetic; mixing `int` with `unsigned` converts the `int` to unsigned, so `-1 < 1u` is false and `v.size() - 1` on an empty vector is 18446744073709551615.
- **Integer division truncates toward zero**: `-7 / 2 == -3` and `-7 % 2 == -1` (the remainder takes the dividend's sign). For a mathematical mod use `(a % m + m) % m`. Dividing by zero, and `INT_MIN / -1`, are undefined.
- `auto` deduces the type from the initializer and drops references and top-level `const`: `auto x = 0;` is `int` (use `0LL` for a 64-bit accumulator), and `auto c = someConstRef;` makes a copy. Write `auto&` or `const auto&` to bind instead.

### deep
#### Intuition

A type is a promise about how many bits a value has and how to read them. The compiler does arithmetic in the type of the operands, not in the type of the variable that receives the result, and most bugs in this area come from forgetting that.

#### Sizes and ranges

| type | standard minimum | 64-bit Linux | range there |
|---|---|---|---|
| `short` | 16 bits | 16 | −32,768 to 32,767 |
| `int` | 16 bits | 32 | about ±2.1 × 10^9 |
| `long` | 32 bits | 64 (32 on Windows) | about ±9.2 × 10^18 |
| `long long` | 64 bits | 64 | about ±9.2 × 10^18 |
| `unsigned` | 16 bits | 32 | 0 to about 4.3 × 10^9 |
| `size_t` | - | 64, unsigned | 0 to about 1.8 × 10^19 |

Since C++20 signed integers are guaranteed to be two's complement, and converting an out-of-range value to a signed type wraps (`int x = 3000000000LL;` gives −1294967296). Arithmetic that overflows a signed type is still undefined.

#### Worked example

```cpp
int main() {
    cout << INT_MAX << " " << LLONG_MAX << "\n";
    int a = 100000, b = 100000;
    long long area = 1LL * a * b;             // widen first, then multiply
    cout << area << "\n";

    unsigned u = 0;
    u = u - 1;                                // unsigned wraps around: 2^32 - 1
    vector<int> v;                            // empty
    cout << u << " " << v.size() - 1 << "\n"; // size_t wraps too: 2^64 - 1

    cout << -7 / 2 << " " << -7 % 2 << "\n";  // truncates toward zero
    int m = 5;
    cout << (-7 % m + m) % m << "\n";         // a mathematical mod: 3
    cout << 7 / 2 * 2.0 << " " << 7 / 2.0 * 2 << "\n";

    short s = 30000;
    auto t = s + s;                           // short + short is int: 60000
    auto total = 0LL;                         // long long, not int
    const int& ref = a;
    auto copy = ref;                          // int: auto drops const and &
    copy++;
    total += t;
    cout << total << " " << a << "\n";
}
```

Output:

```text
2147483647 9223372036854775807
10000000000
4294967295 18446744073709551615
-3 -1
3
6 7
60000 100000
```

`7 / 2 * 2.0` is 6 because `7 / 2` is integer division (3) before the double appears; `7 / 2.0 * 2` converts first and gives 7. `copy++` left `a` alone because `auto` made a copy.

The tempting version of the multiply is a bug:

```cpp
// Undefined behavior: signed overflow. Never rely on what this prints.
int main() {
    int a = 100000, b = 100000;
    long long area = a * b;    // multiplied as int: overflows before the widening
    cout << area << "\n";
}
```

Built with `-fsanitize=undefined`, it stops with `runtime error: signed integer overflow: 100000 * 100000 cannot be represented in type 'int'`. Without the sanitizer, nothing tells you.

#### Signed meets unsigned

```cpp
// Warns: g++ -Wall flags the comparison (-Wsign-compare), which is the point.
int main() {
    int i = -1;
    unsigned n = 1;
    cout << (i < n) << " " << cmp_less(i, n) << "\n";
}
```

Output:

```text
0 1
```

`i < n` converts `-1` to 4294967295 and says false. C++20's `cmp_less` compares the real values. The classic loop bug is `for (int i = 0; i < v.size() - 1; ++i)` on an empty vector: `v.size() - 1` is huge, so the loop reads far out of bounds. Write `i + 1 < v.size()` or use `ssize(v)`, which is signed.

#### Edge cases and bugs

- `INT_MAX` as "infinity" plus an edge weight overflows. Use `LLONG_MAX / 4` or `1e18` in a `long long`.
- `abs(INT_MIN)` and `-INT_MIN` overflow.
- `(lo + hi) / 2` can overflow for large indices; `lo + (hi - lo) / 2` cannot.
- `1 << 31` shifts into the sign bit of an `int`, which is `INT_MIN` since C++20; `1 << 32` is undefined (the shift count must be less than the width). Use `1LL << k` for k up to 62.
- `auto x = {5};` is a `std::initializer_list<int>`, while `auto x{5};` is an `int`.

Connects to: integer overflow and limits, undefined behavior, floating point pitfalls, bit manipulation.

### questions
Q: Why can long long x = a * b still overflow when a and b are int?
A: The multiplication is done in the operands' type, int, and only the result is converted to long long. If the product exceeds INT_MAX, the overflow has already happened and is undefined behavior. Widen one operand first, as in 1LL * a * b.

Q: What does -1 < 1u evaluate to, and why?
A: False. In a comparison between int and unsigned int, the int is converted to unsigned, so -1 becomes 4294967295 on a 32-bit int. Compilers warn with -Wsign-compare, and C++20 offers std::cmp_less to compare the actual values.

Q: What are -7 / 2 and -7 % 2 in C++?
A: -3 and -1. Since C++11 integer division truncates toward zero and the remainder has the sign of the dividend, so that (a / b) * b + a % b equals a. For a non-negative modulo, use (a % m + m) % m.

Q: What is the difference between signed and unsigned overflow?
A: Unsigned arithmetic is defined to wrap around modulo 2 to the power of the width. Signed overflow is undefined behavior: the compiler may assume it never happens and optimize on that assumption, so results can be anything.

Q: What type does auto deduce for auto x = 0, and for auto y = r where r is a const int reference?
A: Both are plain int. auto takes the type of the initializer and drops references and top-level const, so y is an independent copy. Use const auto& to bind to r, and write 0LL when you need a 64-bit accumulator.

## lang.cpp-core.functions-and-references
name: "Functions and references"
importance: must
scope: "pass by value vs reference vs const reference, overloading, default arguments"

### simple
Passing by value is like giving someone a photocopy: they can scribble on it and your original stays clean, but copying a thick book takes time. Passing by reference is lending the original book, and a const reference is lending it behind glass, so they can read it without copying but cannot change it. Overloading lets several functions share one name, and C++ picks the one whose parameters best fit the arguments.

### interview
- **By value** (`void f(vector<int> v)`) copies the argument; changes stay local. Cheap for small types (`int`, `double`, pointers, iterators, `string_view`), expensive for big containers.
- **By reference** (`void f(vector<int>& v)`) passes an alias: no copy, and the function can change the caller's object. A non-const reference cannot bind to a temporary.
- **By const reference** (`void f(const vector<int>& v)`) is the default for large read-only inputs: no copy, no changes, and it binds to temporaries.
- In recursive DSA code, passing a vector or string **by value** copies it on every call, turning O(n) work into O(n^2) or worse; pass by reference and undo changes when backtracking.
- **Overloading**: same name, different parameter lists (not just a different return type). The compiler ranks candidates: exact match, then promotion (`char` to `int`, `float` to `double`), then conversion; if two tie, the call is ambiguous and does not compile.
- **Default arguments** go at the end of the parameter list, are written once (usually in the declaration), and are chosen from the **static** type: calling a virtual function through a base reference uses the base's default value with the derived body.
- Never return a reference or pointer to a local variable: it dies when the function returns.

### deep
#### Intuition

A parameter is a new variable initialized from the argument. With a value parameter that initialization is a copy; with a reference parameter it is just a new name for the caller's object. Choosing between them is choosing between safety (the caller's data cannot change) and cost (no copy).

#### Worked example: counting copies

```cpp
struct Big {
    static inline int copies = 0;
    vector<int> data = vector<int>(1'000'000);
    Big() = default;
    Big(const Big& o) : data(o.data) { ++copies; }
};

int byValue(Big b) { return b.data.size(); }
int byConstRef(const Big& b) { return b.data.size(); }
void reset(Big& b) { b.data.clear(); }       // changes the caller's object

int main() {
    Big big;
    byValue(big);
    byConstRef(big);
    cout << "copies: " << Big::copies << "\n";   // 1: only byValue copied
    reset(big);
    cout << "size after reset: " << big.data.size() << "\n";
    const string& greeting = string("hi") + "!"; // const& extends the temporary's life
    cout << greeting << "\n";
}
```

Output:

```text
copies: 1
size after reset: 0
hi!
```

The call by value copied a million integers; the call by const reference copied nothing. Binding a temporary to a local `const&` keeps the temporary alive as long as the reference, which is why `greeting` is safe. That extension does not apply to a reference returned from a function.

#### Choosing a parameter type

| you want to | write | example |
|---|---|---|
| read a small value | `T` | `int`, `double`, `char`, iterators |
| read a large object | `const T&` | `const vector<int>&`, `const string&` |
| change the caller's object | `T&` | `vector<int>& path` in backtracking |
| read part of a string cheaply | `string_view` | parsing tokens |
| keep the argument (store it) | `T`, then `std::move` it | a constructor taking `string name` |

#### Overloading and default arguments

```cpp
void show(int)    { cout << "int\n"; }
void show(long)   { cout << "long\n"; }
void show(double) { cout << "double\n"; }
void show(const char*) { cout << "pointer\n"; }

struct Shape {
    virtual void draw(string color = "black") { cout << "shape in " << color << "\n"; }
    virtual ~Shape() = default;
};
struct Circle : Shape {
    void draw(string color = "red") override { cout << "circle in " << color << "\n"; }
};

int main() {
    show('a');      // char -> int is a promotion
    show(2.5f);     // float -> double is a promotion
    show(2L);       // exact match
    show(nullptr);  // only the pointer overload accepts nullptr
    Circle c;
    Shape& s = c;
    s.draw();       // Circle's body, Shape's default argument
    c.draw();
}
```

Output:

```text
int
double
long
pointer
circle in black
circle in red
```

`show(2u)` would not compile: `unsigned` to `int`, `long` and `double` are all conversions of the same rank, so the call is ambiguous. The last two lines are the classic trap: the body is picked at run time (virtual dispatch), but the default argument is filled in at compile time from the static type `Shape&`. Avoid different defaults in overrides.

#### Edge cases and bugs

- Returning `const string&` to a local or to a temporary gives a dangling reference; return by value (copy elision makes it cheap).
- A `const T&` parameter can still see changes if the caller modifies the object from another alias or thread during the call.
- `void f(int* p)` versus `void f(int& r)`: use a pointer when "no object" (`nullptr`) is a valid input, a reference otherwise.
- Overloads that differ only by `int` versus `bool`, or pointer versus integer, invite surprises; `f(0)` picks `int`, not the pointer.

Connects to: pointers and memory, move semantics, virtual function internals, recursion, backtracking.

### questions
Q: When would you pass by value, by reference, and by const reference?
A: Pass small, cheap-to-copy types such as int, double and iterators by value. Pass large objects you only read by const reference to avoid a copy. Pass by non-const reference when the function must change the caller's object, such as a path vector in backtracking.

Q: Why is passing a vector by value in a recursive DFS a performance bug?
A: Every call copies the whole vector, which costs O(n) time and memory per call. Over many calls this can turn a linear algorithm into a quadratic one and exceed time or memory limits. Passing by reference and undoing changes after each call avoids the copies.

Q: Can you overload functions that differ only in return type?
A: No. The compiler chooses an overload from the arguments at the call site, and the return type is not part of that choice, so two functions with the same parameters and different return types are a redefinition error.

Q: A virtual function has different default arguments in the base and derived class. Which is used when you call it through a base reference?
A: The base class's default argument with the derived class's body. Default arguments are bound at compile time from the static type of the expression, while the function body is chosen at run time. That mismatch is why overriding functions should not change defaults.

Q: Why can a const reference bind to a temporary but a non-const reference cannot?
A: Modifying a temporary that is about to disappear is almost always a mistake, so the language forbids binding it to a non-const lvalue reference. A const reference only reads it, and for a local const reference the temporary's lifetime is extended to match the reference.

## lang.cpp-core.pointers-and-memory
name: "Pointers and memory"
importance: must
scope: "pointers vs references, `new`/`delete`, stack vs heap, dangling pointers, leaks, `nullptr`"

### simple
A pointer is a piece of paper with a house address written on it: you can cross it out and write another address, or leave it blank. A reference is a nickname for one particular house that can never be moved to another. Memory on the stack is cleaned up automatically when a function ends, while memory you ask for on the heap stays until you give it back, and forgetting to give it back is a leak.

### interview
- A **pointer** stores an address: it can be null, can be re-pointed, supports arithmetic, and needs `*` or `->` to reach the object. A **reference** is an alias: it must be initialized, cannot be re-seated, and has no null state in a valid program.
- **Stack** (automatic storage): locals, allocated by moving the stack pointer, freed automatically at the end of the scope; fast but limited (commonly 8 MB for the main thread on Linux). **Heap** (free store): `new`/`delete` or containers, lives until freed, slower to allocate, can be large.
- Pair every `new` with one `delete` and every `new[]` with `delete[]`; mixing them, deleting twice or deleting a non-heap address is undefined behavior. `delete nullptr` is a safe no-op.
- **Dangling pointer**: points at memory that is no longer valid (a returned local, deleted memory, a vector element after reallocation). **Leak**: the last pointer to heap memory is lost, so it can never be freed.
- `nullptr` (type `std::nullptr_t`) replaces `NULL` and `0`: it converts only to pointer types, so overloads taking an `int` are never picked by mistake.
- In modern C++ you rarely write `new` and `delete`: use `vector`, `string`, `make_unique` and `make_shared`. AddressSanitizer (`-fsanitize=address`) finds use-after-free, out-of-bounds and leaks.

### deep
#### Intuition

Every object lives somewhere in memory and has an address. A pointer is a variable whose value is such an address. Owning heap memory by hand means you must remember, on every path through the code (including exceptions), to give it back exactly once.

#### Worked example

```cpp
int main() {
    int x = 10, y = 20;
    int* p = &x;          // a pointer holds an address
    int& r = x;           // a reference is another name for x
    *p += 1;              // x is 11
    r += 1;               // x is 12
    p = &y;               // a pointer can be re-pointed
    r = y;                // a reference cannot: this copies y's value into x
    cout << x << " " << *p << "\n";

    int* heap = new int(42);      // lives until delete
    int* arr = new int[3]{1, 2, 3};
    cout << *heap + arr[2] << "\n";
    delete heap;                  // one delete per new
    delete[] arr;                 // delete[] for new[]
    heap = nullptr;               // no dangling address left behind
    delete heap;                  // deleting nullptr does nothing

    auto owned = make_unique<int>(7);   // freed automatically
    cout << *owned << " " << (heap == nullptr) << "\n";
}
```

Output:

```text
20 20
45
7 1
```

| after line | x | y | p points to |
|---|---|---|---|
| `*p += 1` | 11 | 20 | x |
| `r += 1` | 12 | 20 | x |
| `p = &y` | 12 | 20 | y |
| `r = y` | 20 | 20 | y |

`r = y` is the line people misread: it does not make `r` refer to `y`; it assigns 20 to `x`.

#### Stack versus heap

| | stack | heap |
|---|---|---|
| how | local variables | `new`, containers, smart pointers |
| freed | automatically at the end of the scope | by `delete` or the owning object |
| speed | move a pointer | an allocator call |
| size | small (often 8 MB per main thread) | most of the machine's memory |
| typical bug | stack overflow from deep recursion | leaks, dangling pointers, double delete |

A `vector<int> v(1000000)` puts only its small header (three pointers, 24 bytes with libstdc++) on the stack; the million integers are on the heap.

#### What goes wrong

```cpp
// Undefined behavior: both functions misuse memory. Never rely on what they print.
int* makeCounter() {
    int count = 0;
    return &count;            // count dies when the function returns: dangling
}
int main() {
    int* p = new int(5);
    delete p;
    cout << *p << "\n";       // use after free
}
```

g++ warns about the first function (`address of local variable 'count' returned`). The second compiles silently and may even print 5, which is what makes these bugs dangerous. Built with `-fsanitize=address`, the program stops at the read with `ERROR: AddressSanitizer: heap-use-after-free` and shows where the memory was freed.

A leak needs no undefined behavior at all: `void leak() { int* p = new int[100]; }` loses its only pointer when the function returns. AddressSanitizer's leak checker reports `Direct leak of 400 byte(s) in 1 object(s)` when the program exits.

#### Rules that prevent all of this

- Own heap memory through an object: a container, `unique_ptr` or `shared_ptr` (RAII). Then there is nothing to forget, even when an exception is thrown.
- Use raw pointers and references only to **observe** objects that someone else owns, and make sure the owner outlives them.
- Do not keep pointers or references into a `vector` across `push_back`: reallocation moves the elements.
- Set a raw pointer to `nullptr` after `delete` if it stays in scope.

Connects to: RAII, smart pointers, strings and vectors (iterator invalidation), undefined behavior, recursion depth and stack overflow.

### questions
Q: What are the differences between a pointer and a reference?
A: A pointer is a variable holding an address: it can be null, can be changed to point elsewhere and supports arithmetic. A reference is an alias for an existing object: it must be initialized, cannot be re-seated and cannot be null in a valid program. Use a reference when an object must exist and a pointer when absence is possible.

Q: What is the difference between stack and heap memory?
A: Stack memory holds local variables; it is allocated and freed automatically as scopes begin and end, is very fast, but is limited in size. Heap memory is requested explicitly or by containers, lives until it is freed, and can be much larger, but allocation costs more and mistakes cause leaks or dangling pointers.

Q: What is a dangling pointer? Give two ways to create one.
A: A pointer that still holds an address whose object no longer exists. Returning the address of a local variable and using a pointer after delete both create one, as does keeping a pointer to a vector element across a reallocation. Reading through it is undefined behavior.

Q: Why prefer nullptr over NULL or 0?
A: nullptr has its own type that converts only to pointer types. NULL is an integer constant, so with overloads f(int) and f(char*) the call f(NULL) picks the int version or is ambiguous, while f(nullptr) picks the pointer version.

Q: What happens if you delete memory that was allocated with new[]?
A: It is undefined behavior: memory allocated with new[] must be released with delete[], which runs every element's destructor and uses the matching deallocation. In practice this can corrupt the heap or skip destructors. Using vector avoids the question entirely.

## lang.cpp-core.strings-and-vectors
name: "Strings and vectors"
importance: must
scope: "`std::string`, `std::vector` growth, amortized `push_back`, iterator invalidation"

### simple
A vector is a row of numbered seats in one block. When the row is full and someone new arrives, the whole group moves to a hall with about twice the seats, so moves are rare and adding people is cheap on average. After a move, any note saying "your friend is in seat 7 of the old hall" is useless, which is what iterator invalidation means.

### interview
- `vector` stores elements **contiguously**; `size()` is the number of elements and `capacity()` the room allocated. When full, `push_back` allocates a bigger buffer (libstdc++ doubles, MSVC grows by 1.5×), moves the elements, and frees the old one.
- Growing by a constant factor makes `push_back` **amortized O(1)**: with doubling, n pushes move fewer than 2n elements in total. Call `reserve(n)` when you know the size to avoid reallocations.
- **Iterator invalidation**: a reallocation invalidates **all** iterators, pointers and references into the vector; `insert` and `erase` invalidate those at or after the position. Erase while iterating with `it = v.erase(it)`, or with `erase_if` (C++20) or the erase-remove idiom.
- `string` is a vector-like sequence of `char` with `c_str()` for a null-terminated view. Short strings live inside the object (small string optimization: up to 15 characters in libstdc++), so they need no heap allocation.
- `s += c` is amortized O(1), but `s = s + c` builds a new string each time, O(n) per step and O(n^2) in a loop. `substr` copies (O(length)); `string_view` gives a non-owning view instead.
- `operator[]` is unchecked (out of range is undefined behavior); `at()` checks and throws `std::out_of_range`. `size()` returns an unsigned `size_t`.

### deep
#### Intuition

A vector owns one heap buffer. As long as there is spare capacity, `push_back` writes into the next slot. When there is none, it must find a bigger buffer, move everything, and throw the old one away. Doubling makes these moves rare enough that their total cost is linear.

#### Worked example: watching the capacity

```cpp
int main() {
    vector<int> v;
    size_t moved = 0;
    for (int i = 0; i < 1000; ++i) {
        if (v.size() == v.capacity()) {       // this push_back must reallocate
            moved += v.size();                // every element moves to the new buffer
            cout << v.capacity() << " -> ";
        }
        v.push_back(i);
    }
    cout << v.capacity() << "\nmoved " << moved << " elements for 1000 pushes\n";

    vector<int> w = {1, 2, 3, 4, 5, 6};
    for (auto it = w.begin(); it != w.end();) {
        if (*it % 2 == 0) it = w.erase(it);   // erase returns the next valid iterator
        else ++it;
    }
    erase_if(w, [](int x) { return x == 5; }); // C++20: the same in one line
    for (int x : w) cout << x << " ";
    cout << "\n";

    string s;
    for (int i = 0; i < 5; ++i) s += char('a' + i);  // amortized O(1) append
    cout << s << " " << s.substr(1, 3) << " " << s.find("cd") << "\n";
}
```

Output (g++ with libstdc++; other libraries grow differently):

```text
0 -> 1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64 -> 128 -> 256 -> 512 -> 1024
moved 1023 elements for 1000 pushes
1 3 
abcde bcd 2
```

#### Why amortized O(1)

With doubling, the last reallocation happens at some size $2^k < n$, so the moves add up to $1 + 2 + 4 + \dots + 2^k = 2^{k+1} - 1 < 2n$; above we counted 1023 moves for 1000 pushes. Any constant growth factor gives a geometric sum like this; growing by a fixed amount (say 10 slots) would give $O(n^2)$ total work. A single `push_back` can still take O(n) when it reallocates, which matters for latency, not for totals.

#### Iterator invalidation

| operation on a vector | invalidates |
|---|---|
| `push_back`, `emplace_back`, `insert` with reallocation | every iterator, pointer and reference |
| same without reallocation | `end()` (and for `insert`, everything at or after the position) |
| `erase` | everything at or after the erased position |
| `reserve` that grows, `shrink_to_fit` | everything |
| `pop_back` | the last element and `end()` |

```cpp
// Undefined behavior: ref may point into the freed old buffer. Never rely on what this prints.
int main() {
    vector<int> v = {1, 2, 3};
    int& first = v[0];
    v.push_back(4);           // capacity was 3: the elements move
    cout << first << "\n";    // dangling reference
}
```

Fix it by keeping an index instead of a reference, or by calling `reserve` up front so no reallocation happens.

#### Strings

- Comparing strings, `find` and `substr` are O(length). Sorting n strings of length L is O(n L log n) in the worst case, not O(n log n).
- `s.find(x)` returns `string::npos` (the largest `size_t`) when nothing is found; compare with `npos`, never with −1 stored in an `int`.
- `string` does not know about Unicode: `size()` counts bytes (`char`s), and one accented letter in UTF-8 can be two bytes.
- `const char*` literals are not `string`s: `"a" + "b"` does not compile, while `string("a") + "b"` does.

#### Edge cases and bugs

- `v[v.size() - 1]` on an empty vector reads index 18446744073709551615; check `empty()` first.
- `vector<bool>` is a packed specialization whose `operator[]` returns a proxy, not a `bool&`; use `vector<char>` or `bitset` when that matters.
- `v.erase(v.begin())` is O(n) because everything shifts left; for queue behavior use `deque`.

Connects to: sequence containers, pointers and memory, cost of built-in operations, move semantics (why `noexcept` moves speed up growth).

### questions
Q: Why is push_back amortized O(1) even though it sometimes copies every element?
A: The vector grows its capacity by a constant factor, so reallocations happen at sizes 1, 2, 4, 8 and so on. The total number of element moves over n pushes is a geometric sum below 2n, so the average cost per push is constant even though one push can cost O(n).

Q: What is iterator invalidation? Give an example with vector.
A: An iterator, pointer or reference stops being valid because the container moved or removed the element it refers to. For a vector, a push_back that exceeds capacity reallocates and invalidates all of them, and erase invalidates everything from the erased position onward. Using an invalidated iterator is undefined behavior.

Q: How do you remove elements from a vector while iterating over it?
A: Use the iterator returned by erase: it = v.erase(it) when removing, otherwise ++it. Better still, use std::erase_if in C++20 or the erase-remove idiom, which remove all matches in one O(n) pass instead of O(n) per erase.

Q: What is the difference between size and capacity, and what does reserve do?
A: size is the number of elements stored; capacity is how many fit before the next reallocation. reserve(n) raises capacity to at least n without changing size, so later push_backs up to n cause no reallocation and no iterator invalidation.

Q: Why is building a string with s = s + c in a loop slow?
A: s + c creates a brand new string of length n + 1 and then assigns it, so each step copies the whole string and the loop is O(n squared). s += c or push_back appends in place in amortized O(1).

## lang.cpp-core.classes-and-const-correctness
name: "Classes and const correctness"
importance: important
scope: "const member functions, initializer lists, `mutable`"

### simple
Marking a member function const is a promise written on the door: "this function only looks, it never changes the object." Const objects, and const references to them, may only use those looking-only doors. A mutable member is a small notepad the object may still scribble on behind that door, such as a cache, because it does not change what the object means.

### interview
- A **const member function** (`int size() const;`) cannot modify members (its `this` is a pointer to const) and is the only kind you can call on a const object or through a `const T&`. Mark every function that does not change observable state as const.
- You can **overload on const**: `T& at(size_t)` for writable objects and `const T& at(size_t) const` for read-only ones; the compiler picks by the constness of the object.
- **Member initializer lists** (`Point(int x) : x_(x) {}`) initialize members directly instead of default-constructing and then assigning. They are required for `const` members, reference members, members without a default constructor, and base classes.
- Members are initialized in **declaration order**, not in the order of the initializer list; using a later-declared member to initialize an earlier one reads an uninitialized value (`-Wall` warns with `-Wreorder`).
- `mutable` members may change inside const functions: caches, lazy results, statistics, and a `mutex` that guards the object. This is **logical** constness (the observable value is unchanged), not bitwise.
- Standard library convention: calling const member functions concurrently is safe, so mutable state that const functions change must be synchronized (a mutex or an atomic).

### deep
#### Const as a contract

`const` on a member function changes the type of `this` from `Scores*` to `const Scores*`. The compiler then rejects any write to a member and any call to a non-const member. Because a `const Scores&` parameter only allows const calls, a class without const member functions cannot be passed around by const reference at all, so const correctness spreads outward from the class.

#### Worked example: const overloads and a mutable cache

```cpp
class Scores {
public:
    Scores(string owner, vector<int> s) : owner_(std::move(owner)), scores_(std::move(s)) {}

    const string& owner() const { return owner_; }     // callable on const objects
    int& at(size_t i) { cachedValid_ = false; return scores_[i]; }  // may change a score
    int at(size_t i) const { return scores_[i]; }      // read-only overload

    double average() const {                           // logically const
        if (!cachedValid_) {
            cached_ = accumulate(scores_.begin(), scores_.end(), 0.0) / scores_.size();
            cachedValid_ = true;                        // allowed: mutable
            ++recomputes_;
        }
        return cached_;
    }
    int recomputes() const { return recomputes_; }

private:
    string owner_;
    vector<int> scores_;
    mutable double cached_ = 0;
    mutable bool cachedValid_ = false;
    mutable int recomputes_ = 0;
};

void report(const Scores& s) {                          // only const members here
    cout << s.owner() << ": " << s.average() << " (first " << s.at(0) << ")\n";
}

int main() {
    Scores s("Asha", {70, 80, 90});
    report(s);
    report(s);                  // served from the cache
    s.at(0) = 100;              // non-const at: invalidates the cache
    report(s);
    cout << "recomputed " << s.recomputes() << " times\n";
}
```

Output:

```text
Asha: 80 (first 70)
Asha: 80 (first 70)
Asha: 90 (first 100)
recomputed 2 times
```

Inside `report`, `s.at(0)` calls the const overload (returns a copy), while in `main` the object is non-const, so `s.at(0) = 100` calls the version that returns `int&`. The constructor takes its arguments by value and moves them into the members, which costs one move when the caller passes a temporary.

This cache is not safe if two threads call `average()` at the same time on one shared object: both may write `cached_`. Guard it with a `mutable mutex` or compute the average eagerly.

#### Initializer lists and declaration order

```cpp
// Warns: -Wall reports -Wreorder and an uninitialized use. length is declared first.
struct Range {
    int length;
    int start, end;
    Range(int s, int e) : start(s), end(e), length(end - start) {}
};
```

`length` is declared first, so it is initialized first, from `end` and `start` that are not yet set. The list order is ignored. Fix it by declaring `start` and `end` before `length`, or by computing from the parameters: `length(e - s)`.

#### Pointers and const

| declaration | can change the pointer? | can change the int? |
|---|---|---|
| `const int* p` | yes | no |
| `int* const p` | no | yes |
| `const int* const p` | no | no |

Read right to left: `int* const p` is "p is a const pointer to int".

#### Edge cases

- A const member function may still change what a member **pointer** points to, because only the pointer itself becomes const; const-correct classes return `const T&` or copies for such data.
- `const_cast` that removes const from an object defined const, followed by a write, is undefined behavior.
- `static` members are not part of any object, so const member functions can change them (they are not protected by const).

Connects to: functions and references, const, constexpr and inline, immutability, mutexes and lock guards.

### questions
Q: What does it mean for a member function to be const?
A: It promises not to modify the object's members: inside it, this is a pointer to const, so writes and calls to non-const members do not compile. Only const member functions can be called on const objects or through const references, so marking read-only functions const is required for const correctness.

Q: When must you use a member initializer list instead of assignment in the constructor body?
A: For const members and reference members, which cannot be assigned after construction; for members and base classes without a default constructor; and whenever you want to avoid default-constructing a member and then overwriting it. The list initializes members directly.

Q: In what order are members initialized?
A: In the order they are declared in the class, regardless of the order in the initializer list. If one member's initializer uses another that is declared later, it reads an uninitialized value. Compilers warn about mismatched order with -Wreorder.

Q: What is the mutable keyword for?
A: It lets a member change inside const member functions. It is meant for state that does not affect the object's observable value, such as caches, lazily computed results, counters, or a mutex that protects the object. Such state still needs synchronization if const functions can run concurrently.

Q: How can a class provide both read-only and writable access through operator[]?
A: Overload it on const: T& operator[](size_t i) for non-const objects and const T& operator[](size_t i) const for const objects. The compiler chooses the overload from the constness of the object it is called on.

## lang.cpp-core.compilation-model
name: "Compilation model"
importance: important
scope: "preprocessing, compiling, linking, headers, one-definition rule, optimization flags"

### simple
Building a C++ program is like publishing a book with many chapters written by different authors. First each chapter's references are pasted in, then each chapter is translated on its own, and finally an editor binds the chapters together and checks that every "see chapter 5" actually points somewhere. Most confusing build errors come from that last step, when a promised chapter is missing or two chapters claim the same title.

### interview
- Stages: **preprocess** (`#include` pastes files, macros expand, `#if` removes code), **compile** each `.cpp` file (a **translation unit**) into an object file, then **link** object files and libraries into one executable. `g++ -E`, `-S` and `-c` stop after each stage.
- **Headers declare, source files define**: a header says "this function exists" so other files can call it; one `.cpp` provides the body. Include guards or `#pragma once` stop a header being pasted twice into one translation unit.
- **One-definition rule (ODR)**: every non-inline function and variable has exactly one definition in the whole program. Classes, templates and `inline` functions may be defined in several translation units if every definition is identical.
- Error types: a **compiler error** (syntax, types) names a line; `undefined reference to 'f'` is a **linker** error (declared but never defined, or the file or library was not linked); `multiple definition of 'f'` means a non-inline definition sits in a header included by two `.cpp` files.
- Templates usually live entirely in headers, because the compiler needs the full definition to instantiate them in every translation unit that uses them.
- Flags: `-O0` (default, easy debugging), `-O2` (typical release and judge setting), `-O3`, `-g` (debug info), `-Wall -Wextra` (warnings), `-DNDEBUG` (disables `assert`), `-fsanitize=address,undefined` (runtime checks). Code with undefined behavior can change behavior between `-O0` and `-O2`.

### deep
#### The pipeline

| stage | input | output | command |
|---|---|---|---|
| preprocess | `main.cpp` | one big text file (headers pasted in) | `g++ -E main.cpp` |
| compile | preprocessed text | assembly | `g++ -S main.cpp` |
| assemble | assembly | object file `main.o` | `g++ -c main.cpp` |
| link | all `.o` files and libraries | executable | `g++ main.o geometry.o -o app` |

Each `.cpp` is compiled alone and knows only what its headers declare. With g++ 13, a file whose only include is `<iostream>` becomes about 36,600 lines after preprocessing, and `<bits/stdc++.h>` becomes about 164,000. That is why real projects include only the headers they use, while contest code accepts the slower compile.

#### Worked example: three files

```cpp
// sketch: geometry.h
#pragma once                        // paste this file at most once per .cpp

int area(int w, int h);             // declaration: "this exists somewhere"
inline int perimeter(int w, int h) { return 2 * (w + h); }  // inline: may be in many .cpp files
```

```cpp
// sketch: geometry.cpp
#include "geometry.h"

int area(int w, int h) { return w * h; }   // the one definition
```

```cpp
// sketch: main.cpp
#include <iostream>
#include "geometry.h"

int main() { std::cout << area(3, 4) << " " << perimeter(3, 4) << "\n"; }
```

Commands and output (paths of temporary files trimmed):

```text
$ g++ -std=c++20 -Wall -c geometry.cpp
$ g++ -std=c++20 -Wall -c main.cpp
$ g++ geometry.o main.o -o app && ./app
12 14
$ g++ -std=c++20 main.cpp -o app          # forgot geometry.cpp
main.cpp:(.text+0x18): undefined reference to `area(int, int)'
collect2: error: ld returned 1 exit status
```

`main.cpp` compiles fine on its own: the header's declaration is enough. Only the linker notices that no object file defines `area`.

#### Breaking the one-definition rule

Put a normal (non-inline) function body in a header and include it from two files:

```text
$ cat dup.h
int twice(int x) { return 2 * x; }
$ g++ a.cpp b.cpp -o dup                  # both include dup.h
b.cpp:(.text+0x0): multiple definition of `twice(int)'; a.cpp:(.text+0x0): first defined here
```

Fix it by marking the function `inline` (the linker then keeps one copy), by moving the body into one `.cpp`, or by making it `static` or putting it in an unnamed namespace (each file gets its own private copy). The worse ODR violation is silent: two different inline definitions, or two different classes with the same name, in different files. The program then has undefined behavior with no error message required (for inline functions the linker quietly keeps one of the copies).

#### Optimization flags in practice

- Judges usually compile with `-O2`. Test locally with the same flag, because code with undefined behavior may "work" at `-O0` and fail at `-O2`.
- Debug with `-O0 -g`, and turn on `-Wall -Wextra -fsanitize=address,undefined` while developing. Add `-D_GLIBCXX_DEBUG` to make libstdc++ check indices and iterators.
- `assert` disappears with `-DNDEBUG`, so never put required work inside an `assert(...)`.

Connects to: undefined behavior, templates, const, constexpr and inline, fast input and output.

### questions
Q: What are the stages of building a C++ program?
A: Preprocessing expands includes and macros for each source file, compilation turns each resulting translation unit into an object file, and linking combines the object files and libraries into an executable while resolving references between them. g++ -E, -S and -c stop after each stage.

Q: What does "undefined reference to f" mean, and how do you fix it?
A: It is a linker error: some object file calls f, which was declared, but no object file or library linked into the program defines it. Fix it by adding the source file or library that defines f to the link command, or by writing the missing definition with the exact same signature.

Q: What is the one-definition rule?
A: Every non-inline function and variable must be defined exactly once in the whole program, while classes, templates and inline functions may be defined in several translation units as long as all definitions are identical. Violations cause multiple-definition link errors or, worse, silent undefined behavior.

Q: Why are templates usually defined in header files?
A: The compiler generates code for a template only when it sees it used with concrete types, and it needs the full definition at that point. Since each translation unit is compiled separately, the definition must be visible in every file that uses the template, which means putting it in a header.

Q: Why should you test with the same optimization flags as the judge or production build?
A: Optimizations change how code with undefined behavior behaves, and can hide or expose bugs such as uninitialized variables or out-of-bounds reads. Something that works at -O0 may fail at -O2, so test with the flags that will actually be used, plus sanitizers during development.

## lang.cpp-core.undefined-behavior
name: "Undefined behavior"
importance: important
scope: "out-of-bounds access, signed overflow, uninitialized reads, why it matters"

### simple
Undefined behavior is what happens when your program breaks one of the language's rules: the C++ standard then makes no promise about anything the program does. It is like ignoring a "do not open while running" label on a machine: it might keep working, stop, or break something else, and it might behave differently tomorrow. The compiler assumes you never break the rules and optimizes on that assumption, which is why these bugs look so strange.

### interview
- **Undefined behavior (UB)**: the standard places no requirements on the program, not just on the faulty line. The compiler may assume UB never happens and optimize accordingly, so results can differ between compilers, flags and runs.
- Common sources: **out-of-bounds** access (`v[v.size()]`), **signed overflow**, reading an **uninitialized** variable, dereferencing null or dangling pointers, use after free, double delete, a **data race**, shifting by a negative amount or by the type's width or more, modifying a string literal, and falling off the end of a non-void function.
- Not the same as **unspecified** behavior (one of several allowed outcomes, such as the order in which function arguments are evaluated) or **implementation-defined** behavior (documented per platform, such as `sizeof(long)`).
- Why it matters: "works on my machine" can fail on the judge with `-O2`, and out-of-bounds writes are a classic security hole.
- Tools: `-Wall -Wextra`, `-fsanitize=address,undefined` (sanitizers), `-D_GLIBCXX_DEBUG` or `-D_GLIBCXX_ASSERTIONS` (checked containers), `v.at(i)`, and `constexpr` evaluation, which rejects UB at compile time.

### deep
#### Why the compiler "breaks" your code

The standard says a program that has UB has no meaning. So when the compiler optimizes, it may assume every path it sees is free of UB. That assumption is what makes optimizations such as keeping loop counters in registers legal, and it is also what turns a small bug into a baffling one.

#### Two real examples of the optimizer using UB

Both functions below are shown to explain what compilers do; they are wrong code.

```cpp
// Undefined behavior: signed overflow makes this check meaningless.
bool willOverflow(int x) {
    return x + 1 < x;      // can only be true if x + 1 overflowed
}
```

Since signed overflow cannot happen in a valid program, `x + 1 < x` is always false, and g++ 13 compiles the whole function to "return false" (checked in the generated assembly at `-O0` and at `-O2`). The correct check tests before doing the arithmetic: `x == INT_MAX`, or `__builtin_add_overflow(x, 1, &result)` in GCC and Clang.

```cpp
// Undefined behavior: the loop reads table[4], one past the end.
int table[4];
bool exists(int v) {
    for (int i = 0; i <= 4; i++)
        if (table[i] == v) return true;
    return false;
}
```

Reading `table[4]` is UB, so the compiler may assume the loop returns before `i` reaches 4, which is only possible by returning true. At `-O2`, g++ 13 compiles `exists` to "return true" for every input (again read from the assembly), with no warning under `-Wall`. The fix is `i < 4`.

#### Finding UB instead of guessing

| tool | catches | how |
|---|---|---|
| `-fsanitize=undefined` | signed overflow, bad shifts, null dereference, misaligned access | stops with `runtime error: signed integer overflow` |
| `-fsanitize=address` | out-of-bounds, use after free, leaks | stops with `heap-use-after-free` and similar |
| `-D_GLIBCXX_DEBUG` | out-of-range `operator[]`, invalid iterators in libstdc++ | stops with `attempt to subscript container with out-of-bounds index` |
| `-Wall -Wextra` | uninitialized uses, returning a local's address, wrong member order | compile-time warnings |
| `-fsanitize=thread` | data races | reports the two conflicting accesses |

Uninitialized reads are the hardest to catch: GCC's sanitizers do not detect them at run time (Clang's MemorySanitizer does). Initialize every variable where you declare it.

The messages quoted in the table come from running small faulty programs under each tool with g++ 13. The tools report the bug itself; what the faulty program would otherwise print proves nothing.

#### Undefined, unspecified, implementation-defined

| kind | meaning | example |
|---|---|---|
| undefined | no requirements at all | `INT_MAX + 1`, `v[10]` on a 3-element vector |
| unspecified | one of the allowed results, not documented | the order `f(a(), b())` evaluates `a()` and `b()` |
| implementation-defined | the platform documents its choice | `sizeof(long)`, whether `char` is signed |

#### Habits that avoid it

- Use `long long` and `1LL * a * b` before values can overflow `int`.
- Check indices (`i < v.size()`, `!v.empty()` before `v.back()`), or use `at()` while debugging.
- Initialize every variable; use `vector<int> a(n)` or `array<int, N> a{}` (both zero-filled) rather than a plain local `int a[N];`.
- Compile with sanitizers while practicing, and test at `-O2`.

Connects to: types and operators, pointers and memory, strings and vectors, compilation model, data races vs race conditions.

### questions
Q: What is undefined behavior, and why can it make a program behave strangely?
A: It is what happens when a program breaks a language rule for which the standard imposes no requirements, such as reading out of bounds or overflowing a signed int. Compilers optimize under the assumption that it never happens, so they may remove checks or reorder code, and the program can do anything, differently at different optimization levels.

Q: Name five common sources of undefined behavior in C++.
A: Out-of-bounds array or vector access, signed integer overflow, reading an uninitialized variable, dereferencing a null or dangling pointer (including use after free), and a data race between threads. Others include shifting by at least the type's width, double delete and falling off the end of a non-void function.

Q: Why might a program pass locally but fail on an online judge?
A: If it has undefined behavior, the result depends on the compiler, flags and memory layout. The judge may compile with -O2 while you tested at -O0, or memory beyond an array may happen to hold harmless values on your machine. Testing with sanitizers and the judge's flags finds these bugs.

Q: What is the difference between undefined and unspecified behavior?
A: Undefined behavior means the standard imposes no requirements on the whole program. Unspecified behavior means the program is valid and the result is one of a set of allowed outcomes, such as the evaluation order of function arguments, but which one is not documented and may vary.

Q: How do you find undefined behavior in your code?
A: Compile with warnings (-Wall -Wextra) and run tests under sanitizers: -fsanitize=address for memory errors and -fsanitize=undefined for overflow, bad shifts and null dereferences. libstdc++'s debug mode checks container indices and iterators, and ThreadSanitizer finds data races.
