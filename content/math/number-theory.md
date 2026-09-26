---
topic: math.number-theory
name: "Number theory and algebra"
subject: math
order: 2
prereqs: []
---

## math.number-theory.divisibility-and-primes
name: "Divisibility and primes"
importance: important
scope: "factorization, number of divisors"

### simple
Every whole number above 1 breaks into primes in exactly one way, like 60 = 2 × 2 × 3 × 5. That factorization answers most divisibility questions: how many divisors a number has, whether one number divides another, and what two numbers have in common. Primes are the atoms and factorization is the recipe.

### interview
- **Fundamental theorem**: every $n > 1$ is $p_1^{a_1} p_2^{a_2} \cdots p_r^{a_r}$ in exactly one way.
- **Number of divisors** $\tau(n) = \prod (a_i + 1)$: a divisor picks each exponent from 0 to $a_i$. **Sum of divisors** $\sigma(n) = \prod \frac{p_i^{a_i+1} - 1}{p_i - 1}$.
- $n$ has an odd number of divisors exactly when it is a perfect square, since divisors pair up as $d$ and $n/d$.
- $\gcd$ and $\operatorname{lcm}$ take the minimum and maximum exponent of each prime, so $\gcd(a,b)\operatorname{lcm}(a,b) = ab$.
- **Legendre's formula**: the power of $p$ in $n!$ is $\sum_{k \ge 1} \lfloor n / p^k \rfloor$; trailing zeros of $n!$ count the factors of 5.
- Divisibility rules: 3 and 9 by digit sum, 11 by alternating digit sum, 4 and 8 by the last two or three digits.
- Test primality by trial division up to $\sqrt{n}$; about $n / \ln n$ primes lie below $n$.

### deep
#### Intuition

A divisor of $n = p_1^{a_1} \cdots p_r^{a_r}$ is built by choosing, for each prime, an exponent between 0 and $a_i$. Those choices are independent, so by the product rule there are $\prod (a_i + 1)$ divisors, and summing over the choices factors into a product of geometric series, which gives $\sigma(n)$.

#### Worked example 1: the divisors of 720

$720 = 2^4 \cdot 3^2 \cdot 5$, so

- $\tau(720) = (4+1)(2+1)(1+1) = 30$,
- $\sigma(720) = (1 + 2 + 4 + 8 + 16)(1 + 3 + 9)(1 + 5) = 31 \cdot 13 \cdot 6 = 2418$.

#### Worked example 2: the smallest number with 12 divisors

Write 12 as a product of the $(a_i + 1)$ values and give the biggest exponents to the smallest primes:

| pattern of $a_i + 1$ | number |
|---|---|
| 12 | $2^{11} = 2048$ |
| $6 \cdot 2$ | $2^5 \cdot 3 = 96$ |
| $4 \cdot 3$ | $2^3 \cdot 3^2 = 72$ |
| $3 \cdot 2 \cdot 2$ | $2^2 \cdot 3 \cdot 5 = 60$ |

The answer is 60.

#### Worked example 3: primes inside a factorial

The power of 3 in $50!$: 16 multiples of 3 up to 50, 5 of them multiples of 9, 1 a multiple of 27, so $16 + 5 + 1 = 22$. Trailing zeros of $1000!$: each zero needs a 2 and a 5, and 5s are scarcer: $200 + 40 + 8 + 1 = 249$.

#### Checking by brute force

```cpp
int tau(int n) {
    int c = 0;
    for (int d = 1; d <= n; ++d) c += n % d == 0;
    return c;
}

int powerIn(int n, int p) {                      // exponent of p in n
    int e = 0;
    for (; n % p == 0; n /= p) ++e;
    return e;
}

int main() {
    int sigma = 0;
    for (int d = 1; d <= 720; ++d) sigma += 720 % d == 0 ? d : 0;
    int smallest = 1;
    while (tau(smallest) != 12) ++smallest;
    int oddButNotSquare = 0;
    for (int n = 1; n <= 10000; ++n) {
        int r = int(sqrt(double(n)));
        oddButNotSquare += (tau(n) % 2 == 1) != (r * r == n);
    }
    int threes = 0, fives = 0, twos = 0;
    for (int k = 1; k <= 50; ++k) threes += powerIn(k, 3);
    for (int k = 1; k <= 1000; ++k) fives += powerIn(k, 5), twos += powerIn(k, 2);
    printf("tau(720) = %d, sigma(720) = %d, smallest with 12 divisors = %d\n", tau(720), sigma,
           smallest);
    printf("n <= 10000 where 'odd divisor count' and 'square' disagree: %d\n", oddButNotSquare);
    printf("3s in 50!: %d; 5s in 1000!: %d; 2s in 1000!: %d\n", threes, fives, twos);
}
```

Output:

```text
tau(720) = 30, sigma(720) = 2418, smallest with 12 divisors = 60
n <= 10000 where 'odd divisor count' and 'square' disagree: 0
3s in 50!: 22; 5s in 1000!: 249; 2s in 1000!: 994
```

The program counts divisors one by one and adds up the exponent of each factor of the factorial separately, so it doesn't rely on the formulas it checks. With 994 twos and only 249 fives, $1000!$ ends in exactly 249 zeros.

#### Common mistakes

- **Counting only multiples of 5** for trailing zeros: 25, 125 and 625 contribute extra fives.
- **Forgetting 1 and $n$** among the divisors; $\tau$ includes both.
- **Trial division past $\sqrt{n}$**: if $n$ has no prime factor up to $\sqrt{n}$, it is prime.
- **Composite "rules"**: a number divisible by 4 and 6 need not be divisible by 24 (12 isn't); use the lcm.

Connects to: [modular arithmetic for puzzles](#/concept/math.number-theory.modular-arithmetic-for-puzzles), [primes](#/concept/dsa.math.primes), [GCD and LCM](#/concept/dsa.math.gcd-and-lcm). Practice: [100 lockers](#/problems/q-lockers) and [Zeros at the end of 100!](#/problems/q-factorial-zeros).

### questions
Q: How do you count the divisors of a number?
A: Factor it as a product of prime powers and multiply one more than each exponent. For 720, which is 2 to the 4th times 3 squared times 5, that is 5 times 3 times 2, or 30 divisors.

Q: Which numbers have an odd number of divisors, and why?
A: Exactly the perfect squares. Divisors pair up as d and n over d, and only a square has a divisor paired with itself.

Q: How many zeros end 1000 factorial?
A: Count the factors of 5: 200 multiples of 5, 40 of 25, 8 of 125 and 1 of 625, for 249. There are far more factors of 2, so each 5 finds a partner and makes a zero.

Q: What is the smallest number with exactly 12 divisors?
A: 60. The exponent patterns that give 12 divisors are 11, then 5 and 1, then 3 and 2, then 2, 1 and 1; putting the largest exponents on the smallest primes gives 2048, 96, 72 and 60, and 60 is smallest.

Q: How do gcd and lcm relate to prime factorizations?
A: The gcd takes the smaller exponent of each prime and the lcm the larger, so their product has the sum of the exponents, which means gcd times lcm equals the product of the two numbers.

## math.number-theory.modular-arithmetic-for-puzzles
name: "Modular arithmetic for puzzles"
importance: important
prereqs: [math.number-theory.divisibility-and-primes]
scope: "last digits, remainders"

### simple
Modular arithmetic keeps only remainders, like a clock that wraps around after 12. You can add and multiply first and take the remainder at the end, or take remainders at every step, and you get the same answer. That makes questions like "what is the last digit of a huge power" small enough to do in your head.

### interview
- $a \equiv b \pmod n$ means $n$ divides $a - b$. Congruences survive $+$, $-$, $\times$ and powers, so reduce early.
- Last digit is mod 10, last two digits mod 100. Powers of a fixed number repeat in a cycle; find its length and reduce the exponent.
- **Fermat**: $a^{p-1} \equiv 1 \pmod p$ for prime $p$ not dividing $a$. **Euler**: $a^{\varphi(n)} \equiv 1 \pmod n$ when $\gcd(a, n) = 1$; $\varphi(100) = 40$.
- Division needs care: you may cancel $a$ only when $\gcd(a, n) = 1$.
- $10 \equiv 1 \pmod 9$ gives the digit-sum test (casting out nines); $10 \equiv -1 \pmod{11}$ gives the alternating test.
- **Chinese remainder theorem**: conditions mod pairwise coprime moduli have exactly one solution mod their product.
- In C++, `%` of a negative number is negative; use `((a % n) + n) % n`.

### deep
#### Intuition

Remainders behave like numbers on a clock. If $a = qn + r$ and $b = sn + t$, then $ab = (\dots)n + rt$, so the remainder of a product depends only on the remainders of the factors. The same holds for sums and therefore for powers. You never need the huge number, only its remainder.

#### Worked example 1: last two digits of 3 to the 2026th

Work mod 100. Square repeatedly: $3^{10} = 59049 \equiv 49$, and $3^{20} \equiv 49^2 = 2401 \equiv 1$. The powers of 3 repeat every 20 steps (Euler's theorem promises 40, and 20 divides 40). Since $2026 = 20 \cdot 101 + 6$,

$$3^{2026} \equiv 3^6 = 729 \equiv 29 \pmod{100}.$$

The last two digits are 29.

#### Worked example 2: a sum of factorials

What is $1! + 2! + \dots + 100!$ mod 12? Every $k!$ with $k \ge 4$ contains $3 \cdot 4 = 12$, so it is $\equiv 0$. The remainder is $1 + 2 + 6 = 9$.

#### Worked example 3: three conditions at once

Find $x$ with $x \equiv 1 \pmod 4$, $x \equiv 2 \pmod 5$, $x \equiv 3 \pmod 7$. Walk the numbers that are 3 mod 7 (3, 10, 17, …) until one is 2 mod 5: 17. It is also 1 mod 4, so $x = 17$, and the solutions are $17 + 140k$ (the CRT says there is exactly one mod $4 \cdot 5 \cdot 7 = 140$).

#### Worked example 4: checking a product by casting out nines

Is $3847 \times 526 = 2{,}023{,}522$? Digit sums mod 9: $3847 \to 22 \to 4$, $526 \to 13 \to 4$, and $4 \cdot 4 = 16 \to 7$. The claimed answer has digit sum 16, also 7, so it passes. (This test catches most slips, but not swapped digits.)

#### Checking in code

```cpp
long long powmod(long long b, long long e, long long m) {
    long long r = 1;
    for (b %= m; e > 0; e >>= 1, b = b * b % m)
        if (e & 1) r = r * b % m;
    return r;
}

int digitSum(long long x) { return x < 10 ? int(x) : digitSum(x / 10) + int(x % 10); }

int main() {
    int cycle = 1;
    while (powmod(3, cycle, 100) != 1) ++cycle;
    long long fact = 1, sum = 0;
    for (int k = 1; k <= 100; ++k) fact = fact * k % 12, sum = (sum + fact) % 12;
    int x = 0;
    while (!(x % 4 == 1 && x % 5 == 2 && x % 7 == 3)) ++x;
    printf("3^2026 mod 100 = %lld (cycle length %d)\n", powmod(3, 2026, 100), cycle);
    printf("1! + ... + 100! mod 12 = %lld\n", sum);
    printf("smallest x: %d\n", x);
    printf("3847 * 526 = %lld; digit sums mod 9: %d * %d -> %d, product -> %d\n",
           3847LL * 526, digitSum(3847) % 9, digitSum(526) % 9, digitSum(3847) * digitSum(526) % 9,
           digitSum(3847LL * 526) % 9);
    printf("-7 %% 3 = %d, fixed: %d\n", -7 % 3, ((-7 % 3) + 3) % 3);
}
```

Output:

```text
3^2026 mod 100 = 29 (cycle length 20)
1! + ... + 100! mod 12 = 9
smallest x: 17
3847 * 526 = 2023522; digit sums mod 9: 4 * 4 -> 7, product -> 7
-7 % 3 = -1, fixed: 2
```

The fast power works on the full exponent, so it confirms the cycle argument independently, and the other lines search or compute directly.

#### Common mistakes

- **Reducing the exponent by the modulus** instead of by the cycle length (or $\varphi(n)$): $2^{10} \bmod 7$ is not $2^{10 \bmod 7} = 2^3 \equiv 1$. Powers of 2 repeat every 3 steps mod 7, so $2^{10} \equiv 2^1 = 2$ (indeed $1024 = 7 \cdot 146 + 2$).
- **Dividing** a congruence by a number that shares a factor with the modulus: $2 \cdot 3 \equiv 2 \cdot 8 \pmod{10}$, but $3 \not\equiv 8$.
- **Negative remainders** in code, as the last output line shows.

Connects to: [divisibility and primes](#/concept/math.number-theory.divisibility-and-primes), [modular arithmetic in code](#/concept/dsa.math.modular-arithmetic), [fast exponentiation](#/concept/dsa.math.fast-exponentiation). Practice: [Last digit of a power](#/problems/q-last-digit).

### questions
Q: How do you find the last two digits of a large power?
A: Work mod 100 and find the cycle of the powers, for example by repeated squaring. Powers of 3 return to 1 after 20 steps mod 100, so 3 to the 2026th equals 3 to the 6th mod 100, which is 29.

Q: What do Fermat's little theorem and Euler's theorem say?
A: For a prime p not dividing a, a to the p - 1 is 1 mod p. More generally, if a and n share no factor, a to the phi(n) is 1 mod n, where phi(n) counts the numbers up to n coprime to n.

Q: Why does casting out nines work?
A: Since 10 leaves remainder 1 mod 9, every power of 10 does too, so a number is congruent to its digit sum mod 9. Products and sums can then be checked on the digit sums.

Q: When can you cancel a factor in a congruence?
A: Only when the factor is coprime to the modulus. For example 2 times 3 and 2 times 8 are both 6 mod 10, yet 3 and 8 differ mod 10, because 2 shares a factor with 10.

Q: What does the Chinese remainder theorem guarantee?
A: Conditions on the remainders mod pairwise coprime numbers have exactly one solution modulo their product. For example x = 1 mod 4, 2 mod 5 and 3 mod 7 has the single solution 17 mod 140.

## math.number-theory.parity-and-invariants
name: "Parity and invariants"
importance: important
scope: "using parity to prove impossibility"

### simple
Some puzzles ask whether a process can ever reach a certain state. The trick is to find something that never changes, like whether a total is odd or even. If the start and the goal disagree on that quantity, the goal is impossible, however cleverly you play.

### interview
- An **invariant** is a quantity every move preserves; parity (odd or even) is the most common one.
- To prove impossibility, show the start and target have different invariant values. To show possibility, you still need a construction.
- Common invariants: parity of a sum, a sum mod 3, a coloring count (chessboard colors), the parity of a permutation.
- **Handshake lemma**: the degrees in a graph add to twice the number of edges, so an odd number of people can't each shake an odd number of hands.
- Look for what a move does to simple quantities: the sum, the count of odd items, the difference between two counts.
- Invariants prove "never"; a quantity that only moves one way (a monovariant) proves "eventually stops".

### deep
#### Intuition

Parity arguments look at the smallest possible piece of information, odd or even, and ask whether moves can change it. Many operations can't: replacing $a$ and $b$ by $a + b$ keeps a sum's parity, and so does replacing them by $|a - b|$, because $a + b$ and $a - b$ differ by $2b$.

#### Worked example 1: the difference game

Write the numbers 1 to 10 on a board. A move erases two numbers $a$ and $b$ and writes $|a - b|$. After nine moves one number is left. Can it be 0?

Each move replaces $a + b$ by $|a - b|$ in the total, which changes the total by $2\min(a, b)$, an even number. So the parity of the total never changes. It starts at $1 + 2 + \dots + 10 = 55$, odd, so the last number is odd and can't be 0. With 1 to 7 the total is 28, even, so the last number is even; whether 0 itself is reachable needs a construction ($7 - 6 = 1$, $5 - 4 = 1$, $3 - 2 = 1$, then $1, 1, 1, 1$ pair off to 0 and 0, and $0 - 0 = 0$).

#### Worked example 2: seven people, three handshakes each

Can each of 7 people shake hands with exactly 3 of the others? Every handshake adds 2 to the sum of the counts, so the sum is even; but $7 \cdot 3 = 21$ is odd. Impossible. With 6 people it works (split into two groups of 3 and have everyone shake hands with the other group).

#### Checking by brute force

The program plays every possible sequence of moves in the difference game (collapsing equal states) and lists the reachable final numbers, then tries all $2^{21}$ ways 7 people can shake hands.

```cpp
map<vector<int>, set<int>> memo;

set<int> finals(vector<int> v) {                 // v sorted
    if (v.size() == 1) return {v[0]};
    if (auto it = memo.find(v); it != memo.end()) return it->second;
    set<int> out;
    for (size_t i = 0; i < v.size(); ++i)
        for (size_t j = i + 1; j < v.size(); ++j) {
            vector<int> w;
            for (size_t k = 0; k < v.size(); ++k)
                if (k != i && k != j) w.push_back(v[k]);
            w.push_back(abs(v[i] - v[j]));
            sort(w.begin(), w.end());
            for (int f : finals(w)) out.insert(f);
        }
    return memo[v] = out;
}

int main() {
    for (int n = 2; n <= 8; ++n) {
        vector<int> v(n);
        iota(v.begin(), v.end(), 1);
        printf("1..%d (sum %2d): finals", n, n * (n + 1) / 2);
        for (int f : finals(v)) printf(" %d", f);
        printf("\n");
    }
    vector<pair<int, int>> edges;
    for (int a = 0; a < 7; ++a)
        for (int b = a + 1; b < 7; ++b) edges.push_back({a, b});
    int regular = 0;
    for (int m = 0; m < 1 << 21; ++m) {
        int deg[7] = {};
        for (int e = 0; e < 21; ++e)
            if (m >> e & 1) ++deg[edges[e].first], ++deg[edges[e].second];
        regular += all_of(deg, deg + 7, [](int d) { return d == 3; });
    }
    printf("ways for 7 people to shake 3 hands each: %d\n", regular);
}
```

Output:

```text
1..2 (sum  3): finals 1
1..3 (sum  6): finals 0 2
1..4 (sum 10): finals 0 2 4
1..5 (sum 15): finals 1 3 5
1..6 (sum 21): finals 1 3 5
1..7 (sum 28): finals 0 2 4 6
1..8 (sum 36): finals 0 2 4 6 8
ways for 7 people to shake 3 hands each: 0
```

Every reachable final number has the parity of the starting sum, as the invariant says, and the search over all 2,097,152 handshake patterns finds none where everyone shakes exactly 3 hands.

#### How to find an invariant

1. Play a few moves and watch simple quantities: the sum, the product, the count of odd numbers, a count mod 2 or 3.
2. Write down exactly how one move changes each quantity.
3. Keep the one whose change is always a multiple of something (0 mod 2, 0 mod 3).

The chessboard-coloring argument for dominoes is the same idea with colors: every domino covers one black and one white square, so the difference between black and white squares covered is invariant.

Connects to: [invariants and monovariants](#/concept/math.proofs.invariants-and-monovariants), [modular arithmetic for puzzles](#/concept/math.number-theory.modular-arithmetic-for-puzzles), [hat and prisoner puzzles](#/concept/puzzles.logic.hat-and-prisoner-puzzles). Practice: [Dominoes on a cut board](#/problems/q-cut-chessboard).

### questions
Q: What is an invariant, and how does it prove impossibility?
A: A quantity that no allowed move changes. If the starting state and the target have different values of it, no sequence of moves can reach the target.

Q: Numbers 1 to 10 are on a board; you repeatedly replace two numbers a and b by the absolute difference. Can the last number be 0?
A: No. Each move changes the total by an even amount, so the total's parity stays odd, as it starts at 55. The last number must therefore be odd.

Q: Can 7 people each shake hands with exactly 3 others?
A: No. Each handshake adds 2 to the sum of everyone's counts, so that sum is even, but 7 times 3 is 21, which is odd.

Q: Does finding that the invariant matches prove the target is reachable?
A: No. A matching invariant only fails to rule the target out; reachability still needs an explicit sequence of moves or a separate argument.

## math.number-theory.series-and-sums
name: "Series and sums"
importance: must
scope: "arithmetic, geometric, sum of squares, telescoping"

### simple
A few sums come up again and again, and knowing their closed forms saves long additions. Adding 1 to 100 is like pairing the first and last numbers: 50 pairs that each make 101. Geometric sums, where each term is a fixed multiple of the one before, collapse to a short formula too, even when they go on forever.

### interview
- **Arithmetic**: $\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$; any arithmetic series is (number of terms) × (first + last) / 2.
- **Squares and cubes**: $\sum k^2 = \frac{n(n+1)(2n+1)}{6}$, $\sum k^3 = \left(\frac{n(n+1)}{2}\right)^2$.
- **Geometric**: $\sum_{k=0}^{n-1} ar^k = a\frac{1 - r^n}{1 - r}$; for $|r| < 1$ the infinite sum is $\frac{a}{1 - r}$.
- **Arithmetic-geometric**: $\sum_{k \ge 1} k x^k = \frac{x}{(1-x)^2}$, so $\sum k/2^k = 2$ (expected values of waiting times).
- **Telescoping**: write the term as a difference $f(k) - f(k+1)$ (often by partial fractions) and everything cancels except the ends.
- The harmonic sum grows like $\ln n + 0.5772$; it diverges, slowly.

### deep
#### Intuition

Two tricks produce most closed forms. **Pairing**: write $1 + 2 + \dots + n$ forwards and backwards; each column adds to $n + 1$, and there are $n$ columns, so twice the sum is $n(n+1)$. **Shifting**: for $S = a + ar + \dots + ar^{n-1}$, the sum $rS$ is the same list moved one place, so $S - rS = a - ar^n$.

Telescoping is shifting in general: if each term is $f(k) - f(k+1)$, adding them cancels every middle value.

#### Worked example 1: a telescoping sum

Find $\sum_{k=1}^{n} \frac{1}{k(k+2)}$. Partial fractions: $\frac{1}{k(k+2)} = \frac{1}{2}\left(\frac{1}{k} - \frac{1}{k+2}\right)$. Each $\frac{1}{k}$ cancels against the $-\frac{1}{k}$ two terms earlier, leaving only the first two positive and the last two negative terms:

$$\sum_{k=1}^{n} \frac{1}{k(k+2)} = \frac{1}{2}\left(1 + \frac{1}{2} - \frac{1}{n+1} - \frac{1}{n+2}\right) \to \frac{3}{4}.$$

For $n = 3$: $\frac{1}{3} + \frac{1}{8} + \frac{1}{15} = \frac{63}{120} = \frac{21}{40}$, and the formula gives $\frac{1}{2}\left(\frac{3}{2} - \frac{1}{4} - \frac{1}{5}\right) = \frac{21}{40}$.

#### Worked example 2: deriving the sum of squares

Telescoping also derives formulas. Since $(k+1)^3 - k^3 = 3k^2 + 3k + 1$, adding over $k = 1..n$ telescopes the left side:

$$(n+1)^3 - 1 = 3\sum k^2 + 3\frac{n(n+1)}{2} + n,$$

and solving gives $\sum k^2 = \frac{n(n+1)(2n+1)}{6}$.

#### Worked example 3: an infinite weighted sum

$S = \sum_{k \ge 1} \frac{k}{2^k} = \frac{1}{2} + \frac{2}{4} + \frac{3}{8} + \dots$ Shift: $S - \frac{S}{2} = \frac{1}{2} + \frac{1}{4} + \frac{1}{8} + \dots = 1$, so $S = 2$. This is the expected number of flips to the first head, found by the tail-sum form of [expectation](#/concept/prob.random-variables.expectation).

#### Checking with exact fractions

```cpp
struct Frac {
    long long p, q;                                  // p / q in lowest terms, q > 0
    Frac(long long a = 0, long long b = 1) : p(a), q(b) {
        long long g = gcd(llabs(p), q);
        p /= g, q /= g;
    }
    Frac operator+(Frac o) const { return Frac(p * o.q + o.p * q, q * o.q); }
    Frac operator-(Frac o) const { return Frac(p * o.q - o.p * q, q * o.q); }
    Frac operator*(Frac o) const { return Frac(p * o.p, q * o.q); }
    bool operator==(Frac o) const { return p == o.p && q == o.q; }
};

int main() {
    int bad = 0;
    Frac tele = 0;
    long long squares = 0, cubes = 0;
    for (long long n = 1; n <= 20; ++n) {
        tele = tele + Frac(1, n * (n + 2));
        squares += n * n, cubes += n * n * n;
        Frac closed = Frac(1, 2) * (Frac(3, 2) - Frac(1, n + 1) - Frac(1, n + 2));
        bad += !(tele == closed) + (squares != n * (n + 1) * (2 * n + 1) / 6) +
               (cubes != n * n * (n + 1) * (n + 1) / 4);
        if (n == 3 || n == 20) printf("n=%lld: telescoping sum = %lld/%lld\n", n, tele.p, tele.q);
    }
    double s = 0;
    for (int k = 1; k <= 60; ++k) s += k / pow(2.0, k);
    double h = 0;
    for (int k = 1; k <= 1000000; ++k) h += 1.0 / k;
    printf("formula mismatches for n = 1..20: %d\n", bad);
    printf("sum of k/2^k, 60 terms: %.12f\n", s);
    printf("H(1e6) = %.6f, ln(1e6) + 0.577216 = %.6f\n", h, log(1e6) + 0.577216);
}
```

Output:

```text
n=3: telescoping sum = 21/40
n=20: telescoping sum = 325/462
formula mismatches for n = 1..20: 0
sum of k/2^k, 60 terms: 2.000000000000
H(1e6) = 14.392727, ln(1e6) + 0.577216 = 14.392727
```

The fractions are exact, so the telescoping formula, the sum of squares and the sum of cubes hold for every $n$ up to 20, not just approximately. The partial sum of $k/2^k$ reaches 2 to twelve decimals, and the harmonic sum sits within $10^{-6}$ of $\ln n + 0.5772$ (the gap is about $\frac{1}{2n}$).

#### Complexity

Each closed form is $O(1)$ instead of $O(n)$, which matters in code: $\sum_{k \le n} k$ in a loop over $n = 10^{18}$ would never finish, and the formula needs 128-bit arithmetic for the product.

#### Common mistakes

- **Wrong number of terms**: $\sum_{k=0}^{n-1} r^k$ has $n$ terms. Check with $n = 1$.
- **Infinite geometric sums with $|r| \ge 1$**: they diverge; the formula $\frac{a}{1-r}$ then means nothing.
- **Telescoping by the wrong gap**: with $\frac{1}{k} - \frac{1}{k+2}$, two terms survive at each end, not one.
- **Overflow**: $n(n+1)(2n+1)$ overflows 64 bits long before the sum does; divide early or use `__int128`.

Connects to: [induction](#/concept/math.proofs.induction), [expectation](#/concept/prob.random-variables.expectation), [Taylor series](#/concept/math.calculus.taylor-series), [time value of money](#/concept/markets.pricing.time-value-of-money). Practice: [Bouncing ball](#/problems/q-bouncing-ball).

### questions
Q: What is the sum of the first n squares and how can you derive it?
A: n(n + 1)(2n + 1) over 6. Add the identity (k + 1) cubed minus k cubed = 3k squared + 3k + 1 over k = 1 to n; the left side telescopes to (n + 1) cubed minus 1, and solving for the sum of squares gives the formula.

Q: When does an infinite geometric series converge, and to what?
A: When the ratio r has absolute value below 1; the sum of a, ar, ar squared and so on is a over 1 - r. With r of 1 or more in size the terms don't shrink and the sum diverges.

Q: What is the sum of k over 2 to the k for k from 1 to infinity?
A: 2. Subtract half the series from itself: what remains is 1/2 + 1/4 + 1/8 and so on, which is 1, so half the sum is 1.

Q: How do you telescope 1 over k(k + 1)?
A: Write it as 1/k minus 1/(k + 1). Adding from 1 to n cancels every middle term and leaves 1 minus 1/(n + 1).

Q: How fast does the harmonic series 1 + 1/2 + ... + 1/n grow?
A: Like the natural log of n plus about 0.577. It diverges, but very slowly: the first million terms add up to only about 14.4.

## math.number-theory.inequalities
name: "Inequalities"
importance: important
scope: "AM-GM, Cauchy-Schwarz, Jensen intuition"

### simple
Inequalities give quick bounds and often find the best value without calculus. The average of two positive numbers is never smaller than the square root of their product, which is why a square fences the most area for a given length. For a curve that bends upward, the average of the outputs is at least the output at the average input.

### interview
- **AM-GM**: for $x_i \ge 0$, $\frac{x_1 + \dots + x_n}{n} \ge \sqrt[n]{x_1 \cdots x_n}$, with equality exactly when all are equal. Use it when a sum is fixed and you want the largest product, or the other way round.
- **Cauchy-Schwarz**: $\left(\sum a_i b_i\right)^2 \le \left(\sum a_i^2\right)\left(\sum b_i^2\right)$, equality when the vectors are proportional. It is why a correlation lies between $-1$ and 1.
- **Jensen**: for convex $f$, $f(E[X]) \le E[f(X)]$; for concave $f$ the inequality flips.
- Applications: $E[X^2] \ge E[X]^2$ (so variance $\ge 0$); $E[\log(1+R)] \le \log(1 + E[R])$ (volatility drag).
- Always state the equality case; interviewers ask where the bound is reached.
- Check a claimed inequality numerically on random inputs before trying to prove it.

### deep
#### Intuition

AM-GM for two numbers is a square in disguise: $(\sqrt{x} - \sqrt{y})^2 \ge 0$ expands to $x + y \ge 2\sqrt{xy}$. Equality needs $x = y$, which is why balanced choices are optimal. Jensen is a picture: for a convex (bowl-shaped) curve, the chord between two points lies above the curve, so averaging outputs gives more than the output of the average.

#### Worked example 1: minimum of x + 9/x

For $x > 0$, AM-GM on the two terms gives $x + \frac{9}{x} \ge 2\sqrt{x \cdot \frac{9}{x}} = 6$, with equality when $x = \frac{9}{x}$, so at $x = 3$. No derivative needed.

#### Worked example 2: a constrained minimum

Minimize $a^2 + b^2 + c^2$ subject to $a + 2b + 3c = 14$. Cauchy-Schwarz with $(a, b, c)$ and $(1, 2, 3)$:

$$14^2 = (a + 2b + 3c)^2 \le (a^2 + b^2 + c^2)(1 + 4 + 9),$$

so $a^2 + b^2 + c^2 \ge \frac{196}{14} = 14$. Equality needs $(a, b, c)$ proportional to $(1, 2, 3)$; with the constraint that gives $(1, 2, 3)$ itself.

#### Worked example 3: volatility drag

A position gains 20% or loses 20% each period with equal chance. The average simple return is 0, but the log is concave, so by Jensen the average log return is negative:

$$\tfrac{1}{2}\left(\ln 1.2 + \ln 0.8\right) = \tfrac{1}{2}\ln 0.96 \approx -0.0204.$$

Over many periods, the typical outcome shrinks about 2% per period even though the expected value stays flat. This is the reason for the [Kelly criterion](#/concept/markets.betting.kelly-criterion).

#### Checking numerically

```cpp
mt19937_64 rng(2026);
double unif() { return (rng() >> 11) * 0x1.0p-53; }  // uniform in [0, 1) from 53 bits

int main() {
    int amgm = 0, cs = 0, jensen = 0;
    const int trials = 1'000'000;
    for (int t = 0; t < trials; ++t) {
        double x = 10 * unif(), y = 10 * unif(), z = 10 * unif();
        amgm += (x + y + z) / 3 < cbrt(x * y * z) - 1e-12;
        double a[4], b[4], ab = 0, aa = 0, bb = 0;
        for (int i = 0; i < 4; ++i) {
            a[i] = 2 * unif() - 1, b[i] = 2 * unif() - 1;
            ab += a[i] * b[i], aa += a[i] * a[i], bb += b[i] * b[i];
        }
        cs += ab * ab > aa * bb + 1e-12;
        jensen += exp((x + y) / 2) > (exp(x) + exp(y)) / 2 + 1e-9;  // exp is convex
    }
    printf("violations in %d random trials: AM-GM %d, Cauchy-Schwarz %d, Jensen %d\n", trials,
           amgm, cs, jensen);
    double best = 1e9, where = 0;
    for (double x = 0.001; x < 10; x += 0.001)
        if (x + 9 / x < best) best = x + 9 / x, where = x;
    printf("min of x + 9/x on a grid: %.6f at x = %.3f\n", best, where);
    double low = 1e9;
    for (int t = 0; t < trials; ++t) {           // random points with a + 2b + 3c = 14
        double a = 20 * unif() - 10, b = 20 * unif() - 10, c = (14 - a - 2 * b) / 3;
        low = min(low, a * a + b * b + c * c);
    }
    printf("lowest a^2 + b^2 + c^2 found: %.4f (bound 14 at 1, 2, 3: %d)\n", low, 1 + 4 + 9);
    printf("average log return at +-20%%: %.4f\n", (log(1.2) + log(0.8)) / 2);
}
```

Output:

```text
violations in 1000000 random trials: AM-GM 0, Cauchy-Schwarz 0, Jensen 0
min of x + 9/x on a grid: 6.000000 at x = 3.000
lowest a^2 + b^2 + c^2 found: 14.0001 (bound 14 at 1, 2, 3: 14)
average log return at +-20%: -0.0204
```

A million random cases never break the three inequalities, the grid search lands on 6 at $x = 3$, and random points on the plane never go below 14 (the best comes within 0.0001 of it). Random testing can't prove an inequality, but it quickly catches a wrong one.

#### Common mistakes

- **Negative numbers in AM-GM**: it needs $x_i \ge 0$. $x + \frac{9}{x}$ is $-6$ at $x = -3$.
- **An unreachable bound**: a bound is the minimum only if equality can happen under the constraints.
- **Jensen's direction**: convex means $f(E X) \le E f(X)$; for concave $\log$ or $\sqrt{\ }$ it reverses.

Connects to: [derivatives and optimization](#/concept/math.calculus.derivatives-and-optimization), [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [variance](#/concept/prob.random-variables.variance-and-standard-deviation).

### questions
Q: State AM-GM and its equality case.
A: For non-negative numbers, the arithmetic mean is at least the geometric mean, the n-th root of the product. Equality holds exactly when all the numbers are equal.

Q: What is the minimum of x + 9/x for positive x?
A: 6, at x = 3. By AM-GM the sum is at least twice the square root of the product, and the product of the two terms is 9; equality needs the two terms equal, so x = 3.

Q: How does Cauchy-Schwarz show that a correlation lies between -1 and 1?
A: Apply it to the centered data: the squared covariance is at most the product of the two variances. Dividing by that product gives a squared correlation of at most 1.

Q: What does Jensen's inequality say about E[log(1 + R)]?
A: The log is concave, so the average of log(1 + R) is at most the log of 1 plus the average return. A strategy with zero average return has a negative average log return, so it shrinks over time.

Q: Why is E[X squared] at least E[X] squared?
A: Squaring is convex, so Jensen gives it directly; equivalently, the difference is the variance, which is an average of squares and so never negative.
