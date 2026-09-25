---
topic: dsa.math
name: "Math for coding interviews"
subject: dsa
order: 35
prereqs: [dsa.complexity]
---

## dsa.math.gcd-and-lcm
name: "GCD and LCM"
importance: must
scope: "Euclid's algorithm and its complexity"

### simple
The greatest common divisor of two numbers is the largest number that divides both, and the least common multiple is the smallest number both divide into. Euclid's algorithm finds the GCD by repeatedly replacing the larger number with the remainder of dividing it by the smaller, like cutting the largest possible square tiles off a rectangle until it's all squares. Once you have the GCD, the LCM is the product divided by it.

### interview
- **Euclid**: `gcd(a, b) = gcd(b, a mod b)`, `gcd(a, 0) = a`. **O(log min(a, b))** steps.
- **LCM**: `lcm(a, b) = a / gcd(a, b) * b` (divide first to avoid overflow).
- GCD of a list: fold `gcd` over it; LCM of a list: fold `lcm` (watch overflow).
- Library: C++17 `std::gcd` and `std::lcm` in `<numeric>`.
- Uses: reduce fractions (slopes in "max points on a line"), water jug problems (a target is reachable iff it's a multiple of gcd), string GCD (`s + t == t + s` then the prefix of length gcd), synchronizing cycles (LCM).
- `gcd(0, 0)` is 0 by convention; `gcd` of negative numbers: use absolute values.

### deep
#### Intuition

Any common divisor of a and b also divides `a − b`, and so `a mod b` (which is a minus a multiple of b). So the pair (a, b) and the pair (b, a mod b) have exactly the same common divisors, and therefore the same greatest one. The numbers shrink quickly, and when one reaches 0, the other is the GCD.

#### Worked example: gcd(252, 105)

| a | b | a mod b |
|---|---|---|
| 252 | 105 | 42 |
| 105 | 42 | 21 |
| 42 | 21 | 0 |
| 21 | 0 | done |

GCD = 21. LCM = 252 / 21 × 105 = 12 × 105 = 1260.

#### Code

```cpp
long long gcdLL(long long a, long long b) {
    a = llabs(a), b = llabs(b);
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

long long lcmLL(long long a, long long b) {
    if (a == 0 || b == 0) return 0;
    return a / gcdLL(a, b) * b;              // divide first: smaller intermediate value
}

// Largest string that divides both (t divides s if s is t repeated).
string gcdOfStrings(const string& s, const string& t) {
    if (s + t != t + s) return "";           // otherwise no common repeating unit exists
    return s.substr(0, gcdLL(s.size(), t.size()));
}
```

#### Recursive form and a sanity check

The recursive version is one line, `gcd(a, b) = b == 0 ? a : gcd(b, a % b)`, and its depth is only $O(\log \min(a, b))$, so recursion is safe. A quick check of any implementation: `gcd(a, b) * lcm(a, b) == a * b` for positive a and b, and `gcd(a, 0) == a`. If the inputs are in the wrong order (a < b), the first step simply swaps them, because `a % b = a`.

#### Complexity

Euclid's algorithm takes $O(\log \min(a, b))$ iterations: every two steps the smaller number at least halves (if $b \le a/2$, then $a \bmod b < b \le a/2$; otherwise $a \bmod b = a - b < a/2$). Consecutive Fibonacci numbers are the worst case (Lamé's theorem).

#### Edge cases and bugs

- `a * b / gcd` overflows even when the LCM fits; divide first.
- Negative inputs: `%` in C++ can return negatives; take absolute values.
- LCM of many numbers grows fast; check the problem's bounds or use modular arithmetic.

#### Variants

- Extended Euclid: finds x, y with `ax + by = gcd(a, b)` (modular inverses, linear Diophantine equations).
- Binary GCD (Stein's algorithm) uses shifts instead of division.
- Max points on a line: reduce slopes `(dy / g, dx / g)` with a consistent sign.
- Count lattice points on a segment: `gcd(|dx|, |dy|) + 1`.

Connects to: number theory extras (extended Euclid), modular arithmetic, fractions, geometry basics.

### questions
Q: How does Euclid's algorithm compute the GCD?
A: Repeatedly replace (a, b) with (b, a mod b) until b is 0; then a is the GCD. It works because a and b have the same common divisors as b and a mod b, and the numbers shrink quickly.

Q: What is the time complexity of Euclid's algorithm?
A: O(log min(a, b)). Every two steps, the smaller number at least halves, and consecutive Fibonacci numbers are the worst case.

Q: How do you compute the LCM safely?
A: lcm(a, b) = a / gcd(a, b) * b. Dividing before multiplying keeps the intermediate value no larger than the result, avoiding overflow when a · b would overflow but the LCM fits.

Q: How do you decide whether two jugs of sizes x and y can measure exactly z liters?
A: By Bézout's identity, the amounts you can measure are the multiples of gcd(x, y), up to x + y in total. So z is reachable when z ≤ x + y and z is a multiple of gcd(x, y) (z = 0 is always reachable).

Q: How do you find the largest string that divides two strings?
A: If s + t != t + s, there's no common repeating unit, so the answer is empty. Otherwise the answer is the prefix of s whose length is the gcd of the two lengths.

## dsa.math.primes
name: "Primes"
importance: must
scope: "trial division, Sieve of Eratosthenes, prime factorization"

### simple
A prime is a number greater than 1 whose only divisors are 1 and itself, like 2, 3, 5 and 7. To test one number, you only need to try divisors up to its square root, because divisors come in pairs. To find all primes up to a limit, the Sieve of Eratosthenes crosses out the multiples of each prime, like crossing off every second, then every third seat in a row.

### interview
- **Trial division**: check divisors from 2 to √n: **O(√n)**. Skip even numbers after 2 for a 2x speedup.
- **Sieve of Eratosthenes**: mark multiples of each prime p starting at p²: **O(n log log n)** time, O(n) memory.
- **Factorization** by trial division: divide out each factor while it divides, up to √n; any remainder > 1 is a prime. O(√n).
- **Smallest prime factor (SPF) sieve**: factorize many numbers up to N in O(log x) each.
- Counts: about n / ln n primes up to n; there are 25 primes below 100 and 78,498 below 10⁶.
- 1 is not prime; 2 is the only even prime.

### deep
#### Intuition

If n = a × b with a ≤ b, then a ≤ √n, so a composite number always has a divisor no larger than its square root. The sieve reverses the question: instead of testing each number, every prime announces all its multiples as composite. Starting at p² is enough because smaller multiples of p have a smaller prime factor that already marked them.

#### Worked example: sieve up to 30

| prime p | crosses out (starting at p²) |
|---|---|
| 2 | 4 6 8 10 12 14 16 18 20 22 24 26 28 30 |
| 3 | 9 15 21 27 (12, 18, 24, 30 already crossed) |
| 5 | 25 (30 already crossed) |
| 7 | 7² = 49 > 30: stop |

Primes: 2 3 5 7 11 13 17 19 23 29.

#### Code

```cpp
vector<int> sieve(int n) {                          // all primes <= n
    vector<bool> composite(n + 1, false);
    vector<int> primes;
    for (int p = 2; p <= n; p++) {
        if (composite[p]) continue;
        primes.push_back(p);
        for (long long m = 1LL * p * p; m <= n; m += p) composite[m] = true;
    }
    return primes;
}

vector<pair<long long, int>> factorize(long long n) {   // {prime, exponent}
    vector<pair<long long, int>> f;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d) continue;
        int e = 0;
        while (n % d == 0) { n /= d; e++; }
        f.push_back({d, e});
    }
    if (n > 1) f.push_back({n, 1});                  // leftover prime factor > sqrt
    return f;
}
```

#### Choosing the tool

For one or a few numbers up to about $10^{12}$, trial division up to $\sqrt{n}$ is enough ($10^6$ steps). For all primes up to $10^7$, use the sieve. For factorizing many numbers up to $10^7$, build the smallest-prime-factor table once. For single 64-bit numbers near $10^{18}$, trial division is too slow and you need Miller-Rabin (and Pollard's rho to factor), which interviews rarely require.

#### Complexity

- Trial division test and factorization: $O(\sqrt{n})$.
- Sieve: $O(n \log \log n)$ time (the sum of $n/p$ over primes), $O(n)$ memory; $10^7$ is fine in C++.
- SPF factorization: $O(\log x)$ per number after an $O(n \log \log n)$ sieve.

#### Edge cases and bugs

- `i * i <= n` overflows for large n with 32-bit ints; use 64-bit.
- Forgetting the leftover prime after trial division (for 14, after dividing by 2 the remainder 7 is prime).
- 0 and 1 are not prime.

#### Variants

- Count primes below n (sieve), segmented sieve for ranges near $10^{12}$.
- Miller-Rabin for primality of 64-bit numbers in $O(k \log^3 n)$.
- Linear sieve (each composite marked once) gives SPF in $O(n)$.
- Ugly numbers (only factors 2, 3, 5): three pointers or a heap.

Connects to: GCD and LCM, modular arithmetic, number theory extras.

### questions
Q: Why is it enough to test divisors up to √n?
A: If n = a · b with both factors larger than √n, their product would exceed n. So any composite n has a factor at most √n, and if none divides n, it's prime.

Q: How does the Sieve of Eratosthenes work, and what is its complexity?
A: Mark every number as prime, then for each number still marked prime, mark its multiples as composite, starting from its square. It runs in O(n log log n) time and O(n) memory.

Q: Why does the sieve start crossing out multiples at p²?
A: Any smaller multiple k · p with k < p has a prime factor smaller than p, so it was already crossed out when that smaller prime was processed.

Q: How do you factorize a number with trial division?
A: For d from 2 while d · d ≤ n, divide n by d as many times as possible, recording the count. If n is still greater than 1 at the end, the remaining value is a prime factor. It's O(√n).

Q: How do you factorize many numbers up to 10^6 quickly?
A: Precompute the smallest prime factor of every number with a sieve. Then factorize any x by repeatedly dividing by spf[x], which takes O(log x) steps per number.

## dsa.math.modular-arithmetic
name: "Modular arithmetic"
importance: must
scope: "sums and products mod m, negative mod, 1e9+7"

### simple
Modular arithmetic keeps only the remainder after dividing by a fixed number m, like a clock that wraps around after 12. Adding and multiplying work the same way on remainders as on full numbers, so you can reduce after every step and keep numbers small. That's why problems with huge answers ask for the result modulo 1,000,000,007.

### interview
- `(a + b) mod m = ((a mod m) + (b mod m)) mod m`; same for `−` and `×`. **Division is different**: multiply by a modular inverse.
- **1e9 + 7** is prime and < 2³⁰, so the sum of two residues fits in 32 bits and the product of two fits in 64 bits.
- **Negative numbers**: C++ `%` keeps the dividend's sign (−7 % 3 = −1); normalize with `((a % m) + m) % m`.
- Reduce after **every** multiplication; don't accumulate a big product first.
- Multiplying two 64-bit residues (m near 10¹⁸) needs `__int128` or a mulmod routine.
- Congruences: `a ≡ b (mod m)` means m divides a − b; useful for cycle detection, divisibility and hashing.

### deep
#### Intuition

The remainder of a sum or product depends only on the remainders of the operands. So you can throw away the multiples of m at any time without changing the final remainder, which keeps every intermediate value small enough for fixed-width integers.

#### Worked example: (123456789 × 987654321 + 555) mod 1000000007

In 64-bit: 123456789 × 987654321 = 121932631112635269, which fits (below 9.2 × 10¹⁸). Its remainder mod 1000000007 is 259106859. Adding 555 gives 259107414, still below m. The final answer is **259107414**. Had both factors been close to $10^{18}$, the product would overflow 64 bits, which is why values are always reduced below m before multiplying.

#### Code

```cpp
const long long MOD = 1'000'000'007;

long long addMod(long long a, long long b) { return ((a + b) % MOD + MOD) % MOD; }
long long subMod(long long a, long long b) { return ((a - b) % MOD + MOD) % MOD; }
long long mulMod(long long a, long long b) { return (a % MOD) * (b % MOD) % MOD; }

// Product of all elements, reduced at every step.
long long productMod(const vector<long long>& v) {
    long long p = 1;
    for (long long x : v) p = mulMod(p, ((x % MOD) + MOD) % MOD);
    return p;
}

// Safe product for moduli up to about 9e18.
unsigned long long mulMod64(unsigned long long a, unsigned long long b, unsigned long long m) {
    return (unsigned __int128)a * b % m;
}
```

#### Which operations are safe

| Operation | Rule under mod m |
|---|---|
| addition | `(a + b) % m` |
| subtraction | `((a - b) % m + m) % m` |
| multiplication | `(a % m) * (b % m) % m` (64-bit intermediate) |
| exponentiation | fast power, reducing after each multiplication |
| division by b | multiply by the inverse of b (needs gcd(b, m) = 1) |
| comparison (<, max, min) | **not preserved**: compare before reducing, or avoid |

The last row matters in DP: taking `max` of values that were already reduced mod m gives meaningless answers. Problems that ask for a count mod m never also ask for a maximum over counts for this reason.

#### Complexity

Each modular operation is $O(1)$ for word-sized moduli.

#### Edge cases and bugs

- Negative intermediate values after subtraction.
- Overflow from multiplying before reducing, or from `int` instead of `long long`.
- Dividing with `/` under a modulus: wrong; use the modular inverse (only when the divisor is coprime with m).
- Comparing values after reduction: a larger true value can have a smaller residue.

#### Variants

- Modular exponentiation, modular inverse, nCr mod p.
- Checking divisibility of large numbers digit by digit (running remainder), subarray sums divisible by k.
- Rolling hashes (polynomial hashing mod a large prime).

Connects to: fast exponentiation, modular inverse and nCr mod p, counting DP and modulo, rolling hash.

### questions
Q: Why can you take the modulus after every addition and multiplication?
A: The remainder of a sum or product depends only on the remainders of the operands: (a + b) mod m = ((a mod m) + (b mod m)) mod m, and likewise for products. Reducing early doesn't change the final result and keeps numbers small.

Q: Why is 1e9 + 7 the usual modulus?
A: It's prime, which makes modular inverses exist for every non-multiple, and it's just under 2^30, so two residues add without overflowing a 32-bit int and multiply without overflowing a 64-bit integer.

Q: How do you handle negative numbers under a modulus in C++?
A: The % operator keeps the sign of the dividend, so −7 % 3 is −1. Normalize with ((a % m) + m) % m to get a result in [0, m).

Q: Can you divide under a modulus?
A: Not with ordinary division. You multiply by the modular inverse of the divisor, which exists when the divisor and the modulus are coprime; for a prime modulus p, the inverse of b is b^(p − 2) mod p.

Q: How do you check whether a very long decimal string is divisible by 7?
A: Process digits left to right keeping a running remainder: r = (r · 10 + digit) mod 7. The number is divisible by 7 if the final remainder is 0. This never builds the huge number itself.

## dsa.math.fast-exponentiation
name: "Fast exponentiation"
importance: must
scope: "binary exponentiation in O(log n)"

### simple
Fast exponentiation computes a number raised to a huge power with only a few dozen multiplications. It uses repeated squaring: x², then x⁴, x⁸ and so on, and multiplies together just the squares that the exponent's binary digits call for. Raising a number to the power of a billion takes about 30 squarings instead of a billion multiplications.

### interview
- Write n in binary: xⁿ = ∏ x^(2ᵏ) over set bits k. Iteratively: `while (n) { if (n & 1) res = res·x; x = x·x; n >>= 1; }`. **O(log n)** multiplications.
- Do every multiplication **mod m** when a modulus is given.
- Negative exponents (real numbers): compute x^|n| and take the reciprocal; careful with `n = INT_MIN` (use a 64-bit copy).
- Works for any associative multiplication: **matrix power** computes linear recurrences (Fibonacci in O(log n)), and repeated function composition.
- C++ has no standard modular power; write the loop, and keep products in `long long` so `(a * b) % m` cannot overflow while m is below about 3·10⁹.

### deep
#### Intuition

$x^{13} = x^8 \cdot x^4 \cdot x^1$ because $13 = 1101_2$. Squaring repeatedly gives $x, x^2, x^4, x^8, \dots$, one new power per step, and the exponent's bits say which of them to multiply into the result. That turns $n - 1$ multiplications into about $2 \log_2 n$.

#### Worked example: 3¹³

| step | n (binary) | lowest bit | result | x (current square) |
|---|---|---|---|---|
| 1 | 1101 | 1 | 1 × 3 = 3 | 3² = 9 |
| 2 | 110 | 0 | 3 | 9² = 81 |
| 3 | 11 | 1 | 3 × 81 = 243 | 81² = 6561 |
| 4 | 1 | 1 | 243 × 6561 = 1594323 | |

3¹³ = 1,594,323.

#### Code

```cpp
long long powMod(long long x, long long n, long long m) {    // x^n mod m, n >= 0
    long long result = 1 % m;
    x %= m;
    if (x < 0) x += m;
    while (n > 0) {
        if (n & 1) result = result * x % m;    // this bit is set: include the current square
        x = x * x % m;                         // next square
        n >>= 1;
    }
    return result;
}

double myPow(double x, long long n) {          // n may be negative
    if (n < 0) { x = 1 / x; n = -n; }
    double result = 1;
    while (n > 0) {
        if (n & 1) result *= x;
        x *= x;
        n >>= 1;
    }
    return result;
}
```

#### Recursive version

The same idea written recursively: `pow(x, n) = pow(x, n / 2)²`, times `x` if n is odd, with `pow(x, 0) = 1`. Compute the half power once and square it; calling the function twice for the two halves turns $O(\log n)$ into $O(n)$. The iterative version above avoids recursion entirely and is the one to write in interviews.

#### Complexity

$O(\log n)$ multiplications. Matrix power of a $k \times k$ matrix costs $O(k^3 \log n)$.

#### Edge cases and bugs

- `m = 1`: every result is 0; `1 % m` handles it.
- Negative exponent with `n = INT_MIN`: `-n` overflows in 32 bits; store n in a 64-bit variable first.
- Forgetting to reduce `x` before the loop: the first square may overflow.
- Floating-point powers lose precision for large n; integer problems should stay in integers.

#### Variants

- Modular inverse via Fermat: `powMod(a, p - 2, p)`.
- Linear recurrences (tribonacci, tiling counts) with matrix exponentiation.
- Count paths of length k in a graph: the adjacency matrix to the power k.
- "Super pow" with a huge exponent given as digits: process digit by digit using $a^{10k + d} = (a^k)^{10} \cdot a^d$.

Connects to: divide and conquer, modular arithmetic, modular inverse, DP on numbers.

### questions
Q: How does binary exponentiation compute x^n in O(log n)?
A: It repeatedly squares x to get x, x², x⁴, x⁸, … and multiplies into the result the powers that correspond to set bits of n. Since n has about log₂ n bits, it needs O(log n) multiplications.

Q: How do you compute x^n mod m without overflow?
A: Reduce x mod m first, and reduce after every multiplication, both when multiplying into the result and when squaring. With m below about 3 · 10^9, products of two residues fit in 64 bits.

Q: How do you handle negative exponents?
A: Compute the power of the reciprocal: x^(−n) = (1/x)^n. Convert n to a 64-bit value before negating, because negating the smallest 32-bit integer overflows.

Q: How can fast exponentiation compute the nth Fibonacci number in O(log n)?
A: The matrix [[1, 1], [1, 0]] raised to the nth power equals [[F(n + 1), F(n)], [F(n), F(n − 1)]]. Matrix multiplication is associative, so binary exponentiation applies, costing O(log n) 2×2 multiplications.

## dsa.math.modular-inverse-and-ncr-mod-p
name: "Modular inverse and nCr mod p"
importance: important
prereqs: [dsa.math.modular-arithmetic, dsa.math.fast-exponentiation]
scope: "Fermat's little theorem, factorial precomputation"

### simple
Under a modulus you can't divide normally, but you can multiply by a special number that undoes multiplication, called the modular inverse. For a prime modulus p, the inverse of a is a raised to the power p − 2, thanks to Fermat's little theorem. With inverses of factorials precomputed, binomial coefficients like "n choose r" can be answered instantly.

### interview
- **Fermat**: for prime p and a not divisible by p, `a^(p-1) ≡ 1`, so `a⁻¹ ≡ a^(p-2) (mod p)`: O(log p).
- Non-prime modulus: inverse exists iff `gcd(a, m) = 1`; compute it with the **extended Euclidean algorithm**.
- **nCr mod p**: precompute `fact[i]` and `invFact[i]` up to N in O(N): `invFact[N] = fact[N]^(p-2)`, then `invFact[i-1] = invFact[i] · i`. Then `C(n, r) = fact[n] · invFact[r] · invFact[n-r]`: O(1) per query.
- Requires n < p (true for p = 1e9+7 and n up to 10⁶ or so). For n ≥ p use Lucas's theorem.
- Inverses of 1..n in O(n): `inv[i] = −(p / i) · inv[p mod i] mod p`.

### questions
Q: How do you compute a modular inverse modulo a prime p?
A: By Fermat's little theorem, a^(p − 1) ≡ 1 (mod p) when p doesn't divide a, so a · a^(p − 2) ≡ 1 and the inverse is a^(p − 2) mod p, computed with fast exponentiation in O(log p).

Q: How do you answer many nCr mod p queries quickly?
A: Precompute factorials fact[i] and inverse factorials invFact[i] up to the largest n: compute invFact[N] with one modular exponentiation, then invFact[i − 1] = invFact[i] · i. Each query is fact[n] · invFact[r] · invFact[n − r] mod p, in O(1).

Q: What if the modulus isn't prime?
A: An inverse of a exists only when gcd(a, m) = 1, and it can be found with the extended Euclidean algorithm, which solves a · x + m · y = 1. Fermat's shortcut doesn't apply.

Q: Why must n be smaller than p for the factorial method?
A: If n ≥ p, then n! contains the factor p and is 0 mod p, so its inverse doesn't exist. For such cases, Lucas's theorem splits n and r into base-p digits.

## dsa.math.combinatorics-in-code
name: "Combinatorics in code"
importance: important
scope: "nCr with Pascal's triangle, Catalan numbers"

### simple
Combinatorics counts arrangements and selections, such as how many ways to choose 3 people from 10. In code you usually build a table, Pascal's triangle, where each entry is the sum of the two above it. Catalan numbers are another famous sequence that counts things like valid bracket strings and different shapes of binary trees.

### interview
- **Pascal**: `C(n, k) = C(n-1, k-1) + C(n-1, k)`, `C(n, 0) = C(n, n) = 1`: O(n²) table, no division, works with any modulus.
- Direct: `C(n, k) = n! / (k! (n-k)!)`; multiplicatively `res = res · (n - i) / (i + 1)` for i < k stays exact in integers (divide at each step), O(k).
- **Catalan**: `C_n = C(2n, n) / (n + 1)`: 1, 1, 2, 5, 14, 42, 132…; recurrence `C_{n+1} = Σ C_i · C_{n-i}`.
- Catalan counts: valid parentheses strings with n pairs, structurally different BSTs with n keys, polygon triangulations, monotone lattice paths not crossing the diagonal.
- Grid paths: `C(R + C − 2, R − 1)`. Stars and bars: ways to split n identical items into k groups = `C(n + k − 1, k − 1)`.
- Use 64-bit; C(60, 30) ≈ 1.18 × 10¹⁷ fits, C(70, 35) doesn't.

### questions
Q: How do you compute binomial coefficients with Pascal's triangle?
A: Use C(n, k) = C(n − 1, k − 1) + C(n − 1, k) with C(n, 0) = C(n, n) = 1, filling a table row by row. It avoids division, so it works under any modulus, in O(n²) time.

Q: What are Catalan numbers, and what do they count?
A: The sequence 1, 1, 2, 5, 14, 42, … given by C_n = C(2n, n)/(n + 1). They count valid strings of n pairs of parentheses, structurally different binary search trees with n nodes, and triangulations of a polygon with n + 2 sides, among many others.

Q: How do you count structurally unique BSTs with n nodes?
A: Choose each value i as the root: the left subtree has i − 1 nodes and the right has n − i, so count(n) = Σ count(i − 1) · count(n − i), with count(0) = 1. That's the Catalan recurrence, O(n²) with DP.

Q: How can you compute C(n, k) exactly without overflow from factorials?
A: Build the result step by step: start with 1 and for i from 0 to k − 1 multiply by (n − i) and then divide by (i + 1). After each step the value is C(n, i + 1), an integer, so the division is exact and intermediate values stay small.

## dsa.math.randomized-algorithms
name: "Randomized algorithms"
importance: important
pattern: true
scope: "reservoir sampling, Fisher-Yates shuffle, weighted random pick, rand7 to rand10"

### simple
Randomized algorithms use random choices to be fair, fast or simple. Shuffling a deck fairly, picking a random item from a stream too long to store, or choosing items in proportion to their weights all have small, exact recipes. The key is making every outcome equally likely (or exactly as likely as it should be), not just random-looking.

### interview
- **Fisher-Yates shuffle**: for i from n − 1 down to 1, swap `a[i]` with `a[rand(0..i)]`. Every permutation is equally likely; O(n). Swapping with `rand(0..n-1)` each time is biased.
- **Reservoir sampling** (one item from a stream of unknown length): keep the i-th item with probability 1/i. Each item ends up chosen with probability 1/n. For k items: replace a random slot with probability k/i.
- **Weighted pick**: prefix sums of weights, draw `r` in [1, total], binary search the first prefix ≥ r: O(log n) per pick.
- **rand7 → rand10**: `(rand7() − 1) · 7 + rand7()` is uniform on 1..49; reject values above 40, return `(x − 1) % 10 + 1`. Expected about 2.45 calls to rand7 per result.
- **Random pick with blacklist**, **random point in a circle** (rejection sampling or `sqrt` of a uniform radius).
- Randomized quickselect and quicksort avoid worst cases on adversarial input.

### deep
#### Intuition

Fairness is about counting outcomes. Fisher-Yates makes $n \cdot (n-1) \cdots 1 = n!$ equally likely choices, one per permutation. Reservoir sampling keeps the current choice correct at every step: after seeing $i$ items, each is the kept one with probability $1/i$. Rejection sampling builds a uniform range from a smaller one by throwing away the uneven remainder.

#### Worked example: reservoir sampling over 3 items

| item | keep it with probability | P(each earlier item still kept) |
|---|---|---|
| 1 | 1 | item 1: 1 |
| 2 | 1/2 | item 1: 1 × 1/2 = 1/2; item 2: 1/2 |
| 3 | 1/3 | items 1 and 2: 1/2 × 2/3 = 1/3; item 3: 1/3 |

Each item ends up with probability 1/3, without knowing the length in advance.

#### Code

```cpp
void fisherYates(vector<int>& a, mt19937& rng) {
    for (int i = (int)a.size() - 1; i > 0; i--) {
        uniform_int_distribution<int> pick(0, i);          // position among 0..i
        swap(a[i], a[pick(rng)]);
    }
}

class WeightedPicker {
    vector<long long> prefix;
    mt19937_64 rng{42};
public:
    explicit WeightedPicker(const vector<int>& w) {
        long long s = 0;
        for (int x : w) prefix.push_back(s += x);
    }
    int pick() {
        uniform_int_distribution<long long> d(1, prefix.back());
        long long r = d(rng);                              // a point in [1, total]
        return lower_bound(prefix.begin(), prefix.end(), r) - prefix.begin();
    }
};
```

#### Why the naive shuffle is biased

Swapping each position with a random position in **0..n−1** makes $n^n$ equally likely sequences of choices. Since $n^n$ is not divisible by $n!$ in general (for $n = 3$: 27 versus 6), some permutations must come up more often than others.

#### Complexity

Shuffle and reservoir sampling: $O(n)$ time, $O(1)$ and $O(k)$ extra space. Weighted pick: $O(n)$ setup, $O(\log n)$ per pick. rand10: expected $O(1)$ (about 2.45 calls).

#### Edge cases and bugs

- `rand() % n` is slightly biased when `RAND_MAX + 1` isn't a multiple of n; use `<random>` distributions.
- Weighted pick with zero weights: they must never be chosen, which `lower_bound` on strictly increasing parts guarantees only if you draw from [1, total].
- Seeding: a fixed seed makes tests reproducible; a time-based seed avoids predictability.

#### Variants

- Random pick index for a target value in a stream (reservoir over matching items).
- Shuffle a linked list (reservoir-style or copy to an array).
- Random point in non-overlapping rectangles (weighted by area, then uniform inside).
- Monte Carlo estimates, randomized hashing (anti-hash protection).

Connects to: quickselect, custom hashing, probability basics (quant), prefix sums with binary search.

### questions
Q: How does the Fisher-Yates shuffle produce every permutation with equal probability?
A: For i from the last index down to 1, it swaps a[i] with a uniformly random index from 0 to i. This makes n · (n − 1) · … · 1 = n! equally likely choice sequences, and each corresponds to exactly one permutation.

Q: How do you choose one item uniformly from a stream whose length you don't know?
A: Reservoir sampling: keep the first item, and when the i-th item arrives, replace the kept item with it with probability 1/i. By induction, after n items each has probability 1/n of being kept.

Q: How do you pick an index with probability proportional to its weight?
A: Build prefix sums of the weights, draw a uniform integer r from 1 to the total, and binary search for the first prefix sum at least r. Each index covers a range of length equal to its weight. Setup is O(n) and each pick O(log n).

Q: How do you build rand10 from rand7?
A: Combine two calls into a uniform number from 1 to 49 with (rand7() − 1) · 7 + rand7(). Accept it if it's at most 40 and return (x − 1) mod 10 + 1; otherwise try again. Rejection keeps the result uniform, with about 2.45 calls to rand7 per result on average.

Q: Why is swapping each element with a random position anywhere in the array biased?
A: It produces n^n equally likely sequences of swaps, and n^n isn't divisible by n! in general, so the permutations can't all be equally likely. For n = 3, 27 outcomes are spread over 6 permutations.

### signals
- shuffle fairly, or sample uniformly at random
- pick one or k items from a stream of unknown length
- choose an index with probability proportional to a weight
- build a uniform generator from a different uniform generator

### template
```cpp
// Randomized building blocks with a proper generator.
struct Random {
    mt19937_64 rng{random_device{}()};
    long long uniform(long long lo, long long hi) {           // inclusive range
        return uniform_int_distribution<long long>(lo, hi)(rng);
    }
    template <class T> void shuffle(vector<T>& a) {          // Fisher-Yates
        for (int i = (int)a.size() - 1; i > 0; i--) swap(a[i], a[uniform(0, i)]);
    }
    template <class T> T reservoirOne(const vector<T>& stream) {   // one uniform item
        T kept{};
        long long seen = 0;
        for (const T& x : stream)
            if (uniform(1, ++seen) == 1) kept = x;           // keep with probability 1/seen
        return kept;
    }
};
```

## dsa.math.geometry-basics
name: "Geometry basics"
importance: advanced
scope: "cross product, orientation, points on a line, convex hull idea"

### simple
Most geometry questions in coding interviews reduce to a single tool, the cross product, which tells you whether you turn left, turn right or go straight when walking from one point to another and on to a third. With it you can check whether points lie on one line or whether segments cross, and wrap a set of points in the tightest fence, called the convex hull. Using integers instead of decimals avoids rounding errors.

### interview
- **Cross product** of vectors (x1, y1) and (x2, y2): `x1·y2 − y1·x2`. For points A, B, C: `cross(B − A, C − A)` > 0 means a left (counter-clockwise) turn, < 0 right, 0 collinear.
- **Max points on a line**: for each point, count others by reduced slope `(dy/g, dx/g)` with a normalized sign: O(n²). Avoid floating-point slopes.
- **Segment intersection**: orientations of each segment's endpoints relative to the other must differ (plus collinear overlap cases).
- **Convex hull** (Andrew's monotone chain): sort points, build lower and upper hulls popping while the turn isn't counter-clockwise: O(n log n).
- **Polygon area** (shoelace): half the absolute sum of cross products of consecutive vertices.
- Use 64-bit integers for cross products of 32-bit coordinates.

### questions
Q: How does the cross product tell you the orientation of three points?
A: Compute cross(B − A, C − A) = (Bx − Ax)(Cy − Ay) − (By − Ay)(Cx − Ax). Positive means the path A → B → C turns counter-clockwise (left), negative means clockwise (right), and zero means the points are collinear.

Q: How do you find the maximum number of points on one line?
A: For each point, group every other point by the direction to it, stored as a reduced fraction (dy/g, dx/g) with a fixed sign convention, and count duplicates of the same point separately. The largest group plus duplicates and the point itself gives the best line through it. That's O(n²).

Q: What is the monotone chain convex hull algorithm?
A: Sort the points by x then y. Build the lower hull left to right, popping the last point while it doesn't make a counter-clockwise turn with the new point, then build the upper hull right to left the same way. Joining them gives the hull in O(n log n).

Q: How do you compute a polygon's area from its vertices?
A: Use the shoelace formula: sum the cross products x_i · y_(i+1) − x_(i+1) · y_i over consecutive vertices (wrapping around) and take half the absolute value. With integer coordinates, twice the area is an integer.

## dsa.math.number-theory-extras
name: "Number theory extras"
importance: advanced
prereqs: [dsa.math.gcd-and-lcm]
scope: "Euler's totient, extended Euclid"

### simple
A couple of number theory tools show up in harder problems. The extended Euclidean algorithm not only finds the greatest common divisor of a and b but also numbers x and y with a·x + b·y equal to it, which gives modular inverses for any modulus. Euler's totient counts how many numbers up to n share no common factor with n.

### interview
- **Extended Euclid**: returns (g, x, y) with `a·x + b·y = g = gcd(a, b)`, recursively from `(b, a mod b)`: `x = y', y = x' − (a / b)·y'`. O(log min(a, b)).
- **Modular inverse** of a mod m (when gcd(a, m) = 1): x from `a·x + m·y = 1`, normalized to [0, m).
- **Linear Diophantine** `a·x + b·y = c` has integer solutions iff gcd(a, b) divides c.
- **Euler's totient** φ(n) = n · ∏(1 − 1/p) over distinct primes p dividing n: O(√n) with factorization; a sieve computes φ for all n up to N.
- **Euler's theorem**: `a^φ(m) ≡ 1 (mod m)` when gcd(a, m) = 1 (Fermat's theorem is the prime case).
- Chinese remainder theorem: combine congruences with coprime moduli.

### questions
Q: What does the extended Euclidean algorithm compute?
A: Besides g = gcd(a, b), it finds integers x and y with a · x + b · y = g. It follows Euclid's recursion and, on the way back, updates the coefficients: if b · x′ + (a mod b) · y′ = g, then x = y′ and y = x′ − (a / b) · y′.

Q: How do you find a modular inverse when the modulus isn't prime?
A: If gcd(a, m) = 1, run the extended Euclidean algorithm to get a · x + m · y = 1. Then a · x ≡ 1 (mod m), so x mod m (normalized to be non-negative) is the inverse. If the gcd isn't 1, no inverse exists.

Q: What is Euler's totient function, and how do you compute it?
A: φ(n) counts the integers from 1 to n that are coprime to n. Factor n into distinct primes and compute n · ∏(1 − 1/p), for example φ(12) = 12 · (1/2) · (2/3) = 4, corresponding to 1, 5, 7 and 11.

Q: When does a · x + b · y = c have integer solutions?
A: Exactly when gcd(a, b) divides c. A solution is obtained by scaling the extended Euclid coefficients by c / gcd(a, b), and all others differ by multiples of (b/g, −a/g).
