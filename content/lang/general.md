---
topic: lang.general
name: "Language-agnostic essentials"
subject: lang
order: 6
prereqs: []
---

## lang.general.cost-of-built-in-operations
name: "Cost of built-in operations"
importance: must
scope: "know the complexity of every container method you use"

### simple
A single line of code can hide a lot of work, like a short sentence in a recipe that says "peel all the potatoes". Removing the first item of a vector looks like one step, but every other item has to shuffle forward. Knowing what each container call really costs is how you tell a fast solution from one that quietly repeats a big job inside a loop.

### interview
- Count the loop **and** what each call inside it costs: `v.erase(v.begin())`, `v.insert(v.begin(), x)` and `find(v.begin(), v.end(), x)` are O(n), so doing them n times is O(n^2).
- Strings: `s1 + s2`, `substr`, `==` and `find` are O(length). `s += c` is amortized O(1), but `s = c + s` (prepending) copies the whole string every time.
- Hidden copies: passing a container **by value**, `for (auto x : v)` on big elements, `auto row = grid[i];` and returning a member by value all copy. Use `const auto&`.
- Ordered containers: O(log n) for insert, find, erase and member `lower_bound`; but `std::lower_bound` on set iterators is O(n), and `multiset::count(x)` is O(log n + count).
- Hash containers: O(1) average, O(n) worst case; iteration costs O(n + bucket count). `priority_queue`: `top` O(1), `push` and `pop` O(log n).
- Allocation and reset costs: `vector<vector<int>> g(n, vector<int>(n))` is O(n^2) time and memory; re-creating or `memset`ting a 10^6-element array in each of 10^5 test cases is 10^11 operations.
- Budget: a C++ judge does very roughly 10^8 simple operations per second. From the constraints: n ≤ 20 allows 2^n, n ≤ 500 allows n^3, n ≤ 5000 allows n^2, n ≤ 10^6 needs n log n or better.

### deep
#### Intuition

Big-O analysis is only as good as your knowledge of each call's cost. Most accidental O(n^2) solutions are an O(n) library call sitting inside an O(n) loop.

#### Worked example: counting the hidden work

The type below counts every copy or move of an element, so the program measures work instead of time.

```cpp
struct Tracked {                          // counts every element copy or move
    static inline long long ops = 0;
    int v = 0;
    Tracked(int x = 0) : v(x) {}
    Tracked(const Tracked& o) : v(o.v) { ++ops; }
    Tracked(Tracked&& o) noexcept : v(o.v) { ++ops; }
    Tracked& operator=(const Tracked& o) { v = o.v; ++ops; return *this; }
    Tracked& operator=(Tracked&& o) noexcept { v = o.v; ++ops; return *this; }
};

long long cost(auto work) { Tracked::ops = 0; work(); return Tracked::ops; }

long long sizeByValue(vector<Tracked> v) { return v.size(); }          // copies the vector
long long sizeByRef(const vector<Tracked>& v) { return v.size(); }

int main() {
    const int n = 1000;
    cout << "vector, erase front:  " << cost([&] {
        vector<Tracked> v(n);
        while (!v.empty()) v.erase(v.begin());   // shifts everything left each time
    }) << "\n";
    cout << "deque, pop_front:     " << cost([&] {
        deque<Tracked> d(n);
        while (!d.empty()) d.pop_front();
    }) << "\n";
    cout << "vector, insert front: " << cost([&] {
        vector<Tracked> v;
        for (int i = 0; i < n; ++i) v.insert(v.begin(), Tracked(i));
    }) << "\n";
    cout << "push_back, reverse:   " << cost([&] {
        vector<Tracked> v;
        v.reserve(n);
        for (int i = 0; i < n; ++i) v.push_back(Tracked(i));
        reverse(v.begin(), v.end());
    }) << "\n";
    vector<Tracked> data(n);
    cout << "100 calls by value:   " << cost([&] { for (int i = 0; i < 100; ++i) sizeByValue(data); }) << "\n";
    cout << "100 calls by ref:     " << cost([&] { for (int i = 0; i < 100; ++i) sizeByRef(data); }) << "\n";
    cout << "range-for by value:   " << cost([&] { long long s = 0; for (auto x : data) s += x.v; (void)s; }) << "\n";
}
```

Output:

```text
vector, erase front:  499500
deque, pop_front:     0
vector, insert front: 500500
push_back, reverse:   2500
100 calls by value:   100000
100 calls by ref:     0
range-for by value:   1000
```

- Erasing the front of a 1000-element vector 1000 times moved 999 + 998 + … + 1 = 499,500 elements: quadratic. `deque::pop_front` moved none.
- Building in reverse with front inserts cost 500,500 operations; pushing to the back and reversing once cost 2,500 (1,000 moves plus 500 swaps of three moves each).
- Passing a vector by value copied all 1,000 elements on each of 100 calls.

With n = 10^5 the first line becomes about 5 × 10^9 element moves, far beyond a typical time limit, while the deque stays at zero.

#### Cheat sheet

| operation | cost | watch out |
|---|---|---|
| `vector` `push_back`, `pop_back`, `[]`, `size` | O(1) (push amortized) | |
| `vector` `insert`/`erase` at position i | O(n − i) | front is worst |
| `find`, `count`, `accumulate`, `min_element` on a range | O(n) | inside a loop: O(n^2) |
| `sort` | O(n log n) | times the cost of one comparison |
| `string` `+`, `substr`, `==`, `find` | O(length) | `s = c + s` in a loop is O(n^2) |
| `set`/`map` insert, erase, find, member `lower_bound` | O(log n) | `std::lower_bound` on them: O(n) |
| `multiset::count(x)` | O(log n + count) | use `find` for "exists" |
| `unordered_map` operations | O(1) average | O(n) worst; iteration O(n + buckets) |
| `priority_queue` push, pop | O(log n) | `top` O(1) |
| `deque` push/pop at both ends | O(1) | middle is O(n) |
| `list` insert/erase at an iterator, `size` | O(1) | reaching position i is O(i) |
| `vector<T> v(n)`, `fill`, `memset` | O(n) | per test case adds up |

#### Edge cases and bugs

- `v.size()` is O(1) for every standard container, including `list` since C++11.
- `s.find(t)` is not guaranteed linear: naive search can be O(|s| × |t|) in bad cases; use KMP or Z-function for guaranteed bounds.
- Clearing a container is O(size) (each element is destroyed); `unordered_map::clear` also walks the buckets.
- Sorting strings or vectors costs O(n log n) comparisons, and each comparison is O(length).

Connects to: time complexity, strings and vectors, sequence containers, ordered containers, unordered containers, container adaptors.

### questions
Q: Why can a loop that calls v.erase(v.begin()) be too slow?
A: Each erase at the front shifts every remaining element one place left, which is O(n). Doing it n times costs about n squared over 2 element moves, so for 10 to the 5 elements that is billions of moves. A deque or a moving start index makes each removal O(1).

Q: What is the complexity of s1 + s2, s.substr(i, k) and s1 == s2?
A: They are linear in the lengths involved: concatenation copies both strings, substr copies k characters, and comparison may scan the whole shorter string. Inside a loop over n positions they easily become O(n squared).

Q: Name three ways a C++ program copies a container without an obvious copy statement.
A: Passing it to a function by value, iterating with for (auto x : v) over elements that are themselves containers or strings, and writing auto row = grid[i] instead of const auto& row = grid[i]. Returning a member container by value from a getter also copies it.

Q: What input size suggests an O(n squared) solution is acceptable?
A: As a rough rule, a judge runs about 10 to the 8 simple operations per second, so n up to a few thousand allows O(n squared), while n around 10 to the 5 or more needs O(n log n) or O(n). The constraints are often a strong hint about the intended complexity.

Q: Why is calling std::lower_bound on a std::set slow?
A: std::lower_bound performs a binary search using iterator arithmetic, but set iterators are bidirectional, so moving to the middle means stepping one element at a time. The number of steps is O(n) even though only O(log n) comparisons are made. The member function s.lower_bound walks the tree in O(log n).

## lang.general.integer-overflow-and-limits
name: "Integer overflow and limits"
importance: must
scope: "32-bit vs 64-bit, when to use long long, modulo arithmetic"

### simple
Each integer type can only hold numbers up to a certain size, like a 3-digit counter that cannot show 1,000. A 32-bit int stops at about two billion, which is smaller than many real answers, such as the number of pairs among 100,000 items. Use a bigger type before the numbers get big, and when a problem asks for the answer "modulo" a prime, keep reducing as you go so the numbers never grow too large.

### interview
- `int` (32-bit) holds up to 2,147,483,647 (about 2.1 × 10^9); `long long` (64-bit) up to 9,223,372,036,854,775,807 (about 9.2 × 10^18). `unsigned long long` doubles the positive range but wraps silently.
- Use `long long` for sums of many values (10^5 values of 10^9 is 10^14), products of two ints, counts of pairs (n(n−1)/2), factorials past 12!, and distances in weighted graphs. Widen **before** the operation: `1LL * a * b`.
- Signed overflow is **undefined behavior**, not a wrap-around; it can silently corrupt results or change how the compiler optimizes nearby code.
- **Modulo arithmetic** with a prime p = 10^9 + 7: reduce after every `+`, `-` and `*`. Products of two reduced values are below 1.0 × 10^18, so they fit in `long long`. After subtraction, add p before taking `%`: `((a - b) % p + p) % p`.
- **Division** modulo a prime: multiply by the modular inverse, b^(p−2) mod p by Fermat's little theorem, computed with fast exponentiation in O(log p).
- For products of two 64-bit values, use `__int128` (GCC and Clang) for the intermediate, or `__builtin_mul_overflow` to detect overflow. `std::midpoint(a, b)` averages without overflow.

### deep
#### Intuition

Overflow bugs hide because small tests pass: the numbers only grow past the limit on the large hidden tests. So check limits while reading the constraints, not after the wrong answer.

#### Quick limits

| value | about | fits in int? |
|---|---|---|
| 10^9 + 7 | 1.0 × 10^9 | yes |
| sum of 10^5 values ≤ 10^9 | 10^14 | no |
| 10^5 × 10^5 (a product, or n² for n = 10^5) | 10^10 | no |
| pairs among 10^5 items, n(n−1)/2 | 5.0 × 10^9 | no |
| 12! | 4.8 × 10^8 | yes (13! does not) |
| 20! | 2.4 × 10^18 | no, but fits in `long long` (21! does not) |
| (10^9 + 6)² | 1.0 × 10^18 | no, but fits in `long long` |

#### Worked example

```cpp
const long long MOD = 1'000'000'007;

long long power(long long base, long long exp, long long mod) {   // fast exponentiation
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;   // both below mod, product below 2^60
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

int main() {
    int n = 100000;
    long long pairs = 1LL * n * (n - 1) / 2;          // 4,999,950,000: more than INT_MAX
    cout << pairs << "\n";

    long long a = 5, b = 7;
    cout << (a - b) % MOD << " " << ((a - b) % MOD + MOD) % MOD << "\n";

    long long inv2 = power(2, MOD - 2, MOD);          // Fermat: 2^(p-2) acts as 1/2 mod p
    cout << inv2 << " " << 2 * inv2 % MOD << " " << 10 * inv2 % MOD << "\n";

    long long fact = 1;
    for (int i = 1; i <= 20; ++i) fact *= i;           // 20! still fits in 63 bits; 21! does not
    cout << fact << "\n";

    long long x = 3'000'000'000'000, y = 4'000'000'000;
    long long product;
    bool overflowed = __builtin_mul_overflow(x, y, &product);   // GCC and Clang
    __int128 wide = (__int128)x * y;                   // 128-bit intermediate
    cout << overflowed << " " << (long long)(wide % MOD) << "\n";
    cout << midpoint(INT_MAX - 1, INT_MAX) << "\n";    // no overflow, unlike (a + b) / 2
}
```

Output:

```text
4999950000
-2 1000000005
500000004 1 5
2432902008176640000
1 588000
2147483646
```

- `(a - b) % MOD` is −2 because `%` keeps the dividend's sign; adding MOD first gives the proper residue 1,000,000,005.
- 500000004 is "one half" modulo 10^9 + 7: doubling it gives 1, and 10 times it gives 5, exactly as 10 / 2 = 5.
- x × y is 1.2 × 10^22, beyond `long long`, so the builtin reports overflow, while the 128-bit product reduces cleanly to 588,000.

#### Modular arithmetic rules

| operation | write | why |
|---|---|---|
| add | `(a + b) % p` | both below p, sum below 2p |
| subtract | `((a - b) % p + p) % p` | avoids negative results |
| multiply | `a * b % p` with `long long` | product below p² ≈ 10^18 |
| divide by b | `a * power(b, p - 2, p) % p` | only for prime p and b not divisible by p |
| exponent | fast exponentiation | O(log e) multiplications |

#### Edge cases and bugs

- `const int INF = INT_MAX;` then `dist + w` overflows. Use `long long` with `INF = 1e18`, or `INT_MAX / 2` for ints, and check `dist < INF` before adding.
- `abs(INT_MIN)` overflows; `-x` for `x = INT_MIN` too.
- `pow(10, 18)` returns a `double`; use integer multiplication for exact powers.
- Modular inverse by Fermat needs a prime modulus. For other moduli use the extended Euclidean algorithm, and an inverse exists only when `gcd(b, m) = 1`.

Connects to: types and operators, modular arithmetic, fast exponentiation, undefined behavior, floating point pitfalls.

### questions
Q: When should you use long long instead of int?
A: Whenever a value can exceed about 2.1 billion: sums of many large values, products of two ints, pair counts like n times n minus 1 over 2 for n of 10 to the 5, factorials past 12, and path lengths in weighted graphs. Widen before the operation, for example 1LL * a * b, because the arithmetic happens in the operands' type.

Q: Why is a * b % MOD safe with long long when MOD is 10^9 + 7?
A: If a and b are already reduced, both are below MOD, so the product is below about 10 to the 18, which is less than the long long limit of about 9.2 times 10 to the 18. With int operands the product would overflow first, so the values must be long long.

Q: How do you compute (a - b) mod p correctly in C++?
A: Write ((a - b) % p + p) % p. In C++, % keeps the sign of the dividend, so a - b being negative gives a negative remainder; adding p and reducing again brings it into the range 0 to p - 1.

Q: How do you divide modulo a prime?
A: Multiply by the modular inverse. By Fermat's little theorem, b to the power p - 2 is the inverse of b modulo a prime p when b is not a multiple of p, and fast exponentiation computes it in O(log p) multiplications.

Q: How can you multiply two 64-bit numbers modulo m without overflow?
A: Use a 128-bit intermediate, such as __int128 in GCC and Clang, compute the full product and reduce it modulo m. Without 128-bit support, use binary multiplication with repeated doubling and reduction, which takes O(log b) steps.

## lang.general.floating-point-pitfalls
name: "Floating point pitfalls"
importance: important
scope: "precision errors, comparing with an epsilon"

### simple
Computers store decimals in binary, and many simple decimals such as 0.1 cannot be written exactly in binary, just as one third cannot be written exactly in decimal. So small rounding errors creep in, and 0.1 + 0.2 is not exactly 0.3. Compare decimals with a small tolerance, and whenever you can, work with whole numbers instead.

### interview
- A `double` is a 64-bit IEEE 754 number: 53 significant bits, about **15 to 17 significant decimal digits**. A `float` has 24 bits, about 7 digits, so avoid it in interview code.
- Most decimal fractions are not representable: `0.1 + 0.2 == 0.3` is **false** (the sum prints as 0.30000000000000004 with 17 digits). Summing 0.1 ten times gives 0.99999999999999989, not 1.
- Compare with a tolerance: `fabs(a - b) < 1e-9` for values of moderate size, or a relative test `fabs(a - b) <= 1e-9 * max(fabs(a), fabs(b))` for large ones.
- Integers are exact in a `double` only up to 2^53 (about 9 × 10^15). `(long long)sqrt(n)` can be off by one for large n: correct it with integer checks.
- Prefer exact integer arithmetic: compare fractions a/b < c/d as a·d < c·b (positive denominators), use cross products for geometry, and store money in cents.
- NaN (from `sqrt(-1)`, for example) compares unequal to everything, including itself. Print with `fixed << setprecision(k)` when a problem asks for k decimals.

### deep
#### Worked example

```cpp
long long isqrt(long long n) {                      // exact floor of the square root
    long long r = sqrtl(n);                         // close, but may be off by one
    while (r * r > n) --r;
    while ((r + 1) * (r + 1) <= n) ++r;
    return r;
}

int main() {
    double a = 0.1 + 0.2;
    cout << (a == 0.3) << " " << setprecision(17) << a << "\n";
    const double EPS = 1e-9;
    cout << (fabs(a - 0.3) < EPS) << "\n";

    double sum = 0;
    for (int i = 0; i < 10; ++i) sum += 0.1;
    cout << (sum == 1.0) << " " << sum << "\n";

    cout << setprecision(20) << 9007199254740993.0 << "\n";   // 2^53 + 1 rounds to 2^53
    float f = 16777217;                                       // 2^24 + 1 in a float
    cout << f << "\n";

    long long n = 999'999'999'999'999'999;                    // 10^18 - 1
    cout << (long long)sqrt((double)n) << " " << isqrt(n) << "\n";

    // Compare 1/3 and 333333333/1000000000 exactly: a/b < c/d  <=>  a*d < c*b (b, d > 0)
    long long p = 1, q = 3, r = 333333333, s = 1000000000;
    cout << (p * s < r * q) << " " << (r * q < p * s) << "\n";
    double nan = numeric_limits<double>::quiet_NaN();
    cout << (nan == nan) << "\n";
}
```

Output:

```text
0 0.30000000000000004
1
0 0.99999999999999989
9007199254740992
16777216
1000000000 999999999
0 1
0
```

- `(double)n` rounds 10^18 − 1 up to exactly 10^18, whose square root is 10^9, so the plain cast answers 1,000,000,000. The true floor is 999,999,999, which the corrected `isqrt` finds.
- The fraction test says 333333333/1000000000 < 1/3, with no rounding at all, because it compares 1 × 10^9 with 999,999,999 as integers.

#### Choosing an epsilon

An absolute epsilon such as 1e-9 works when values are around 1 to 10^6. For values near 10^12, neighbouring doubles are already about 1e-4 apart, so an absolute 1e-9 test is really an equality test; use a relative tolerance. For tiny values near 0, a relative tolerance fails, so combine both: `fabs(a - b) <= 1e-9 * max(1.0, max(fabs(a), fabs(b)))`.

#### Edge cases and bugs

- Loop counters in floating point (`for (double x = 0; x != 1; x += 0.1)`) may never stop; loop over integers and compute x.
- Subtracting nearly equal numbers loses most significant digits (catastrophic cancellation), as in the quadratic formula for a tiny root.
- Binary search on doubles: loop a fixed number of times (100 halvings is plenty) rather than until `hi - lo < eps`, which may never happen for large values.
- A result that should be a whole number can land just below it: `log(1000) / log(10)` is 2.9999999999999996, so casting it to `int` gives 2. Add a small epsilon before `floor`, or use integer methods (repeated multiplication, `__builtin_clzll` for powers of two).

Connects to: floating point (IEEE 754), integer overflow and limits, binary search, geometry basics.

### questions
Q: Why is 0.1 + 0.2 not equal to 0.3 in C++?
A: 0.1, 0.2 and 0.3 have no exact binary representation, so each is stored as the nearest double. The rounding errors of 0.1 and 0.2 add up to a sum that is the double just above 0.3's nearest double, so the comparison is false. Printed with 17 digits the sum shows as 0.30000000000000004.

Q: How should you compare two doubles?
A: Check whether they are close rather than equal: fabs(a - b) < eps with an absolute epsilon like 1e-9 for moderate values, or a relative tolerance scaled by the larger magnitude for large values. Better still, avoid the comparison by using integer arithmetic when the problem allows it.

Q: Up to what size are integers exact in a double?
A: Up to 2 to the 53, about 9 times 10 to the 15, because a double has 53 significant bits. Beyond that, not every integer is representable, so converting a large long long to double and back can change it.

Q: How can you compare a/b with c/d without floating point?
A: Cross-multiply: with positive denominators, a/b < c/d exactly when a times d < c times b. Use long long, or 128-bit integers if the products may exceed 64 bits.

Q: Why can (long long)sqrt(n) give the wrong answer for large n?
A: Converting n to double may round it, and sqrt's result is rounded too, so the value can land just above or below the true integer root, for example turning 10 to the 18 minus 1 into 10 to the 9. Fix it by adjusting the result with integer checks until r squared is at most n and r plus 1 squared is larger.

## lang.general.recursion-depth-and-stack-overflow
name: "Recursion depth and stack overflow"
importance: important
scope: "when to convert recursion to iteration"

### simple
Every function call puts a note on a stack of papers saying where to come back to and what its local values were. Deep recursion piles up one note per level, and the pile has a height limit; exceeding it crashes the program, which is a stack overflow. When the depth can be huge, such as walking a long chain, keep your own list of pending work instead of making the call stack do it.

### interview
- Each call uses a **stack frame** (return address, saved registers, locals). The main thread's stack is typically **8 MB on Linux** (`ulimit -s` shows 8192 KB) and 1 MB by default on Windows; other threads get their own size.
- Measured with g++ 13 for a small DFS: 64 bytes per call at `-O2` and 96 at `-O0`, so 8 MB allows roughly 100,000 levels. Frames with local arrays or sanitizers are much larger.
- Danger signs: recursion depth equal to n with n ≥ 10^5 (a DFS on a path or a skewed tree, recursion over a linked list, memoized DP whose recursion follows a long chain).
- Convert to **iteration**: an explicit stack of (node, next child index) mirrors the recursion exactly, including work after the children (post-order); BFS order or processing nodes in reverse DFS order also work for many tree problems.
- Alternatives: bottom-up DP instead of memoized recursion; tail recursion rewritten as a loop (C++ does not guarantee tail-call optimization); a bigger stack (`ulimit -s`, or running the work in a thread created with a large stack) when you control the environment.
- Recursion is still the clearest choice when depth is O(log n): balanced trees, divide and conquer, binary search.

### deep
#### Intuition

A recursive call cannot finish until everything it called finishes, so every pending call keeps its frame on the stack. Depth, not the total number of calls, decides the stack usage: a balanced binary tree with a million nodes has depth 20, while a path with a million nodes has depth one million.

#### How deep can you go?

Comparing stack addresses at the first and the thousandth level of a small subtree-size DFS (compiled with g++ 13 on x86-64) showed 64 bytes per call at `-O2` and 96 bytes at `-O0`. With an 8 MB stack that is about 130,000 levels at `-O2`, so a path of 10^6 nodes needs about 64 MB and crashes. Under AddressSanitizer the same frame was about 2 KB, so sanitized builds overflow far earlier. These sizes depend on the compiler, flags and the function's locals; treat them as orders of magnitude.

#### Worked example: the same DFS without recursion

```cpp
// Recursive: depth equals the height of the tree.
int subtreeSize(const vector<vector<int>>& adj, int u, int parent, vector<int>& size) {
    size[u] = 1;
    for (int v : adj[u]) if (v != parent) size[u] += subtreeSize(adj, v, u, size);
    return size[u];
}

// Iterative: each stack entry is a saved "frame": the node and its next child to visit.
vector<int> subtreeSizes(const vector<vector<int>>& adj, int root) {
    vector<int> size(adj.size(), 1), parent(adj.size(), -1);
    vector<pair<int, size_t>> stack = {{root, 0}};
    while (!stack.empty()) {
        auto [u, next] = stack.back();              // a copy: push_back may reallocate
        if (next < adj[u].size()) {
            stack.back().second++;                  // resume after this child later
            int v = adj[u][next];
            if (v != parent[u]) { parent[v] = u; stack.push_back({v, 0}); }   // "call"
        } else {
            if (parent[u] != -1) size[parent[u]] += size[u];                  // "return"
            stack.pop_back();
        }
    }
    return size;
}

int main() {
    vector<vector<int>> tree = {{1, 2}, {0, 3, 4}, {0}, {1}, {1}};   // 0 has children 1, 2
    vector<int> rec(5);
    subtreeSize(tree, 0, -1, rec);
    vector<int> it = subtreeSizes(tree, 0);
    for (int i = 0; i < 5; ++i) cout << rec[i] << "/" << it[i] << " ";
    cout << "\n";

    int n = 1'000'000;                                // a path: depth one million
    vector<vector<int>> path(n);
    for (int i = 0; i + 1 < n; ++i) { path[i].push_back(i + 1); path[i + 1].push_back(i); }
    cout << subtreeSizes(path, 0)[0] << " " << subtreeSizes(path, 0)[n - 1] << "\n";
}
```

Output:

```text
5/5 3/3 1/1 1/1 1/1 
1000000 1
```

On the small tree both versions agree. On the million-node path only the iterative version is called: its "stack" is a vector on the heap, which can grow to millions of entries. The recursive one would need about a million frames.

The copy in `auto [u, next] = stack.back();` matters: binding references to `stack.back()` and then calling `push_back` could leave them dangling after a reallocation.

#### Edge cases

- Memoized DP (`solve(i)` calling `solve(i - 1)`) has depth n too; fill the table bottom-up instead.
- Debug builds and sanitizers use bigger frames, so a program can pass at `-O2` and overflow when debugging.
- A stack overflow usually shows up as a segmentation fault with no message, which is easy to confuse with an out-of-bounds bug.

Connects to: recursion, DFS, pointers and memory (stack versus heap), dynamic programming foundations.

### questions
Q: Why can a recursive DFS crash on a large input?
A: Each recursive call keeps a stack frame until it returns, so the stack usage grows with the recursion depth. On a path-shaped graph with 10 to the 6 nodes the depth is 10 to the 6, which needs tens of megabytes, more than the typical 8 MB stack, so the program crashes with a stack overflow.

Q: How do you convert a recursive DFS into an iterative one?
A: Keep an explicit stack whose entries play the role of call frames, such as the node plus the index of the next child to visit. Pushing an entry is the call, advancing the index resumes the frame, and popping it is the return, where post-order work like adding a subtree size to the parent happens.

Q: Does C++ guarantee tail-call optimization?
A: No. Compilers often turn tail calls into jumps at higher optimization levels, but the standard does not require it, and debug builds usually do not. Code that relies on it for deep recursion can overflow at -O0, so write such recursion as a loop.

Q: When is recursion safe to use?
A: When the depth is bounded by something small, such as O(log n) for balanced trees, binary search and divide and conquer, or when constraints keep the depth to a few thousand. Then it is often the clearest and least error-prone way to write the algorithm.

## lang.general.fast-input-and-output
name: "Fast input and output"
importance: important
scope: "when it matters in online assessments"

### simple
Reading and printing a million numbers can take longer than solving the problem, because the default settings of C++ streams play it safe. Two lines at the start of main switch off that caution, and printing a plain newline instead of endl stops the program from pushing every single line out to the screen right away. It is like carrying all your shopping in one trip instead of walking to the car for each item.

### interview
- By default `cin`/`cout` stay synchronized with C's `scanf`/`printf`, and `cin` flushes `cout` before every read. `ios::sync_with_stdio(false); cin.tie(nullptr);` at the start of `main` turns both off.
- After turning off synchronization, **do not mix** `cin`/`cout` with `scanf`/`printf`/`puts` in the same program: their buffers are separate and output can come out in the wrong order.
- `endl` writes `'\n'` **and flushes**; each flush can be a system call. Use `'\n'` and let the buffer flush at exit (or when full).
- It matters when input or output reaches about 10^5 to 10^6 numbers. For small inputs it makes no difference.
- In interactive problems you **must** flush after each query (`cout << q << endl;` or `cout.flush()`), or the judge never sees it.
- Faster still: reading all input at once (`fread` into a buffer) and parsing by hand, or `getchar_unlocked`, but the two lines are enough for almost every problem.

### deep
#### Worked example

```cpp
int main() {
    ios::sync_with_stdio(false);   // stop syncing with C stdio
    cin.tie(nullptr);              // don't flush cout before every cin read

    int n;
    cin >> n;
    long long total = 0;
    vector<int> values(n);
    for (int& x : values) {
        cin >> x;
        total += x;
    }
    for (int i = n - 1; i >= 0; --i) cout << values[i] << ' ';
    cout << '\n' << total << '\n';   // '\n', not endl: no flush per line
}
```

Input:

```text
5
3 1 4 1 5
```

Output:

```text
5 1 4 1 3 
14
```

#### What the two lines change

| setting | default | after the two lines |
|---|---|---|
| C++ streams share buffering with C stdio | yes: every operation must coordinate | no: `cin` and `cout` use their own buffers |
| `cout` flushed before each `cin` read | yes (needed for prompts in interactive programs) | no |
| safe to mix `printf` and `cout` | yes | no |

#### Measurements, and how much to trust them

On the machine used for this article (a cloud VM, g++ 13 at `-O2`, input from a file, three runs each), reading 10^6 integers took 0.36 to 0.46 s with default `cin`, 0.06 to 0.09 s after the two lines, and 0.07 to 0.10 s with `scanf`. These timings vary by machine, library and judge; the shape (several times faster) is typical.

Output has a cleaner, countable effect. Printing 10^6 lines with `endl` made 1,000,000 `write` system calls (counted with `strace`), while `'\n'` made 841 calls in total, because the buffer was written out in large chunks. On the same machine that was roughly 0.5 s versus 0.05 s.

#### Edge cases and bugs

- Put the two lines **before** any input or output.
- Interactive problems: flush after every question, or you wait forever for an answer. `endl` is correct there.
- `getline` after `cin >> n` reads the rest of the current line (often empty); call `cin.ignore()` or read with `>> ws` first.
- Printing doubles: set `cout << fixed << setprecision(9);` once, before printing.
- The bottleneck is sometimes the algorithm, not I/O: measure (or estimate operations) before blaming input speed.

Connects to: cost of built-in operations, strings and vectors, compilation model.

### questions
Q: What do ios::sync_with_stdio(false) and cin.tie(nullptr) do?
A: The first stops C++ streams from synchronizing with C's stdio, so cin and cout can buffer independently and run much faster. The second unties cin from cout, so cout is no longer flushed before every input operation. Together they make large input and output several times faster.

Q: Why is endl slower than a newline character?
A: endl writes a newline and then flushes the stream, which usually means a system call for every line. Writing a plain newline lets the stream collect output in its buffer and write it in large chunks, so a million lines take a few hundred system calls instead of a million.

Q: What goes wrong if you mix printf and cout after turning off synchronization?
A: The two libraries then keep separate buffers, so their output can appear in a different order from the order of the calls. Pick one style for the whole program.

Q: When must you flush output explicitly?
A: In interactive problems, where the judge replies to each query: without a flush, the query stays in the buffer and both sides wait forever. Also before a program might crash or be killed, if you need partial output, and when output must interleave with prompts.
