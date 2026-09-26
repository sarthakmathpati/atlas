---
topic: math.proofs
name: "Proof techniques and logic"
subject: math
order: 6
prereqs: []
---

## math.proofs.induction
name: "Induction"
importance: important
scope: "weak and strong induction"

### simple
Induction proves a statement for every whole number the way dominoes fall. Show the first domino falls, and show that any falling domino knocks over the next one; then they all fall. Strong induction lets each domino lean on all the ones before it, not just the one right behind.

### interview
- **Weak induction**: prove $P(n_0)$, then prove $P(n) \Rightarrow P(n+1)$ for every $n \ge n_0$.
- **Strong induction**: prove the base cases, then prove $P(n_0), \dots, P(n) \Rightarrow P(n+1)$. Use it when the step reaches back more than one place (factorizations, recurrences like Fibonacci, "split into two smaller pieces").
- A step that reaches back $k$ places needs $k$ base cases.
- Induction proves a formula you already have; to find one, compute small cases and guess.
- Constructive induction doubles as an algorithm: the proof of the step tells you how to build the answer for $n + 1$ from smaller answers.
- Classic flaw: a step that silently fails for one value (the "all horses are the same color" proof breaks at 1 to 2).

### deep
#### Intuition

To prove infinitely many statements, prove one and a rule that passes truth along. The step $P(n) \Rightarrow P(n+1)$ may assume $P(n)$, since the statements before it were already proved; it is a proof that the chain doesn't break, not circular reasoning.

#### Worked example 1: odd numbers add to squares

Claim: $1 + 3 + \dots + (2n - 1) = n^2$. Base: $n = 1$ gives $1 = 1^2$. Step: if the first $n$ odd numbers add to $n^2$, the first $n + 1$ add to $n^2 + (2n + 1) = (n+1)^2$. Done.

#### Worked example 2: stamps of 4 and 5 (strong induction)

Claim: every amount of 12 or more can be paid with 4s and 5s. Base cases: $12 = 4 + 4 + 4$, $13 = 4 + 4 + 5$, $14 = 4 + 5 + 5$, $15 = 5 + 5 + 5$. Step: for $n \ge 16$, the amount $n - 4 \ge 12$ can be paid by assumption; add one 4. The step reaches back 4 places, which is why it needs 4 base cases. (11 can't be paid, so 12 is the best possible start.)

#### Worked example 3: L-shaped tiles (constructive induction)

Claim: a $2^k \times 2^k$ board with any one square removed can be tiled by L-shaped tiles of 3 squares. Base: $k = 0$ is a single removed square, nothing to tile. Step: split the $2^{k+1}$ board into four quarters. The missing square lies in one of them; place one L tile at the center covering one corner square of each of the *other* three quarters. Now every quarter is a $2^k$ board missing one square, and each is tiled by the assumption. The proof is a recursive algorithm:

```cpp
int grid[8][8], nextTile = 0;

// Tiles the size x size square at (r, c), whose one covered square is (mr, mc).
void tile(int r, int c, int size, int mr, int mc) {
    if (size == 1) return;
    int h = size / 2, id = ++nextTile;
    for (int qr = 0; qr < 2; ++qr)
        for (int qc = 0; qc < 2; ++qc) {
            int r0 = r + qr * h, c0 = c + qc * h;
            bool hasHole = mr >= r0 && mr < r0 + h && mc >= c0 && mc < c0 + h;
            int hr = r + h - 1 + qr, hc = c + h - 1 + qc;   // this quarter's corner at the center
            if (!hasHole) grid[hr][hc] = id;
            tile(r0, c0, h, hasHole ? mr : hr, hasHole ? mc : hc);
        }
}

int main() {
    int good = 0;
    for (int m = 0; m < 64; ++m) {               // every choice of removed square
        memset(grid, 0, sizeof grid);
        nextTile = 0;
        grid[m / 8][m % 8] = -1;
        tile(0, 0, 8, m / 8, m % 8);
        map<int, vector<pair<int, int>>> cells;
        for (int r = 0; r < 8; ++r)
            for (int c = 0; c < 8; ++c)
                if (grid[r][c] > 0) cells[grid[r][c]].push_back({r, c});
        bool ok = (int)cells.size() == 21;
        for (auto& [id, v] : cells) {            // an L: 3 cells inside one 2x2 square
            if (v.size() != 3) {
                ok = false;
                continue;
            }
            int r0 = min({v[0].first, v[1].first, v[2].first});
            int c0 = min({v[0].second, v[1].second, v[2].second});
            for (auto [r, c] : v) ok = ok && r - r0 <= 1 && c - c0 <= 1;
        }
        good += ok;
    }
    vector<int> unpaid;
    for (int n = 1; n <= 100; ++n) {
        bool can = false;
        for (int fives = 0; fives * 5 <= n; ++fives) can = can || (n - 5 * fives) % 4 == 0;
        if (!can) unpaid.push_back(n);
    }
    printf("boards tiled correctly: %d of 64\namounts up to 100 without 4s and 5s:", good);
    for (int n : unpaid) printf(" %d", n);
    printf("\n");
}
```

Output:

```text
boards tiled correctly: 64 of 64
amounts up to 100 without 4s and 5s: 1 2 3 6 7 11
```

For every removed square, the recursion places 21 tiles, each covering 3 squares of one 2 by 2 block, and together they cover the other 63 squares. The stamp search confirms 11 is the largest amount that can't be paid.

#### Where induction goes wrong

"All horses are the same color": in a group of $n + 1$ horses, the first $n$ match and the last $n$ match, so all match. The step needs the two groups to overlap, which fails when $n + 1 = 2$. A step must work for *every* $n$ from the base case on; check the smallest one by hand.

Connects to: [series and sums](#/concept/math.number-theory.series-and-sums), [divide and conquer](#/concept/dsa.recursion.divide-and-conquer), [proof by contradiction](#/concept/math.proofs.proof-by-contradiction-and-contrapositive).

### questions
Q: What is the difference between weak and strong induction?
A: Weak induction proves the next case from the one before it. Strong induction may use all earlier cases, which suits statements where n + 1 splits into smaller pieces of any size, such as prime factorizations.

Q: Why does the stamp proof for 4s and 5s need four base cases?
A: Its step builds amount n from n - 4 by adding a 4, reaching back four places. The cases 12, 13, 14 and 15 must be checked directly, and every larger amount then follows from one of them.

Q: Where does the "all horses are the same color" proof fail?
A: Its step compares the first n horses with the last n and relies on the two groups overlapping. For n + 1 = 2 the groups are single horses with no overlap, so the step from 1 to 2 is invalid.

Q: How can an induction proof give an algorithm?
A: A constructive step shows how to build the answer for size n + 1 from answers for smaller sizes, which is a recursive procedure. The L-tile proof places one tile at the center and recurses on the four quarters.

## math.proofs.proof-by-contradiction-and-contrapositive
name: "Proof by contradiction and contrapositive"
importance: important
scope: "Proof by contradiction and contrapositive"

### simple
Sometimes the easiest way to prove something is to imagine it is false and show that leads to nonsense. That is proof by contradiction. A contrapositive flips a statement around: "if it rained, the street is wet" means exactly the same as "if the street is dry, it didn't rain".

### interview
- **Contradiction**: assume the statement is false, derive something impossible ($0 = 1$, a smaller counterexample than the smallest), conclude the statement is true.
- **Contrapositive**: $P \Rightarrow Q$ is equivalent to $\neg Q \Rightarrow \neg P$. The **converse** $Q \Rightarrow P$ is a different statement.
- Classics: $\sqrt{2}$ is irrational; there are infinitely many primes; if $n^2$ is even then $n$ is even (prove the contrapositive: odd $n$ gives odd $n^2$).
- Use contradiction for "there is no…" and "infinitely many" claims, where there is nothing to construct.
- Combine with the extremal principle: take the smallest counterexample and find a smaller one.
- Negate carefully: "for every $x$, $P$" becomes "for some $x$, not $P$".

### deep
#### Intuition

A statement and its denial can't both be true. If assuming the denial forces something impossible, the denial is false. The contrapositive is the same logic arranged as a direct proof: to show "$n^2$ even ⇒ $n$ even", show "$n$ odd ⇒ $n^2$ odd", which is one line: $(2k+1)^2 = 2(2k^2 + 2k) + 1$.

#### Worked example 1: the square root of 2

Suppose $\sqrt{2} = \frac{p}{q}$ in lowest terms. Then $p^2 = 2q^2$, so $p^2$ is even, so $p$ is even (the contrapositive above): $p = 2m$. Then $4m^2 = 2q^2$, so $q^2 = 2m^2$ and $q$ is even too. Both even contradicts lowest terms. So no such fraction exists.

#### Worked example 2: infinitely many primes

Suppose the primes were only $p_1, \dots, p_k$. Let $N = p_1 p_2 \cdots p_k + 1$. Dividing $N$ by any $p_i$ leaves remainder 1, so none of them divides $N$; but $N > 1$ has some prime factor, which must be a prime missing from the list. Contradiction.

A common misreading is "$N$ itself is prime". It needn't be: $2 \cdot 3 \cdot 5 \cdot 7 \cdot 11 \cdot 13 + 1 = 30031 = 59 \cdot 509$. The proof only needs $N$ to have a prime factor outside the list.

#### Checking in code

Code can't prove irrationality, but it can test the claims around it: the program factors the numbers $N$ from Euclid's proof, and searches for a fraction with $p^2 = 2q^2$.

```cpp
int main() {
    int primes[] = {2, 3, 5, 7, 11, 13, 17, 19};
    long long prod = 1;
    for (int p : primes) {
        prod *= p;
        long long n = prod + 1, m = n;
        printf("%lld + 1 = %lld =", prod, n);
        for (long long d = 2; d * d <= m; ++d)
            for (; m % d == 0; m /= d) printf(" %lld", d);
        if (m > 1) printf(" %lld", m);
        printf("\n");
    }
    long long found = 0, closest = 0;
    for (long long q = 1; q <= 1'000'000; ++q) {
        long long p = llround(sqrtl(2.0L * q * q));
        found += p * p == 2 * q * q;
        if (llabs(p * p - 2 * q * q) == 1) closest = q;
    }
    printf("fractions p/q with q <= 1e6 and p^2 = 2q^2: %lld\n", found);
    printf("largest q <= 1e6 with p^2 - 2q^2 = +-1: %lld\n", closest);
}
```

Output:

```text
2 + 1 = 3 = 3
6 + 1 = 7 = 7
30 + 1 = 31 = 31
210 + 1 = 211 = 211
2310 + 1 = 2311 = 2311
30030 + 1 = 30031 = 59 509
510510 + 1 = 510511 = 19 97 277
9699690 + 1 = 9699691 = 347 27953
fractions p/q with q <= 1e6 and p^2 = 2q^2: 0
largest q <= 1e6 with p^2 - 2q^2 = +-1: 470832
```

The first five numbers happen to be prime, and the next three are not, yet every prime factor is larger than the primes multiplied. No fraction with denominator up to a million squares to 2. The closest ones miss $p^2 = 2q^2$ by exactly 1, never by 0: they solve the Pell equation $p^2 - 2q^2 = \pm 1$, and the largest found, $\frac{665857}{470832}$, matches $\sqrt{2}$ to 11 decimal places.

#### Common mistakes

- **Proving the converse**: "if $n$ is even, $n^2$ is even" is true but is not the contrapositive of "if $n^2$ is even, $n$ is even".
- **A contradiction that comes from an error**: if the argument never used the assumption, the "contradiction" is a mistake elsewhere.
- **Wrong negation**: the negation of "every prime is odd" is "some prime is even", not "every prime is even".

Connects to: [induction](#/concept/math.proofs.induction), [divisibility and primes](#/concept/math.number-theory.divisibility-and-primes), [symmetry and extremal principle](#/concept/math.proofs.symmetry-and-extremal-principle), [pigeonhole principle](#/concept/math.combinatorics.pigeonhole-principle).

### questions
Q: What is the contrapositive of "if P then Q", and why is it equivalent?
A: "If not Q then not P." Both statements are false in exactly the same situation, when P holds and Q fails, so they are true or false together.

Q: How does Euclid prove there are infinitely many primes?
A: Suppose the primes are a finite list, multiply them and add 1. That number leaves remainder 1 when divided by each listed prime, so its prime factors are missing from the list, a contradiction.

Q: Is the product of the first k primes plus 1 always prime?
A: No. 2 times 3 times 5 times 7 times 11 times 13 plus 1 is 30031, which is 59 times 509. The proof only needs its prime factors to be new, not the number itself to be prime.

Q: Sketch the proof that the square root of 2 is irrational.
A: Assume it is p over q in lowest terms. Then p squared is 2 q squared, so p is even; writing p as 2m gives q squared = 2 m squared, so q is even too, contradicting lowest terms.

Q: What is the difference between the contrapositive and the converse?
A: The contrapositive of "P implies Q" is "not Q implies not P", which is equivalent. The converse is "Q implies P", which can be false: every square is a rectangle, but not every rectangle is a square.

## math.proofs.invariants-and-monovariants
name: "Invariants and monovariants"
importance: important
scope: "proving processes end or cannot reach a state"

### simple
An invariant is something a process never changes, and a monovariant is something that only ever moves one way, like the amount of sand left in an hourglass. Invariants prove a state can never be reached. Monovariants prove a process must stop, because a whole number can't keep going down forever.

### interview
- **Invariant**: unchanged by every move. If the start and target disagree on it, the target is unreachable. Common choices: parity, a sum mod 3, a coloring count, the parity of a permutation.
- **Monovariant**: strictly increases (or decreases) with every move and is bounded, such as a count of inversions or a non-negative integer. It proves the process ends, and often bounds the number of steps.
- Find them by writing down what one move does to candidates: sums, differences, products, counts mod small numbers.
- Examples: bubble sort's swaps each remove exactly one inversion, so it performs exactly as many swaps as there are inversions; Euclid's algorithm ends because the second number strictly decreases.
- The 15-puzzle with two tiles swapped is unsolvable: permutation parity together with the blank's row is invariant.
- An invariant only rules states out; showing a state *is* reachable needs a construction or search.

### deep
#### Intuition

Think of every reachable state as colored by the invariant's value; moves never change the color, so states of a different color are out of reach. A monovariant is a height that every move lowers; since it can't go below 0, the process stops after at most as many moves as the starting height.

#### Worked example 1: tokens that change color

A bag holds 5 red, 7 green and 9 blue tokens. When two tokens of different colors are taken out, both are replaced by tokens of the third color. Can all 21 tokens end up one color?

A move changes the counts $(r, g, b)$ by $(-1, -1, +2)$ in some order. Look at differences: $r - g$ changes by 0 or $\pm 3$. So each difference mod 3 is invariant. To end with all tokens one color, two counts must both be 0, so their difference must be $\equiv 0 \pmod 3$ from the start. Here $r - g = -2$, $g - b = -2$, $r - b = -4$: none is a multiple of 3, so it is impossible.

With 4 red, 7 green and 10 blue, all differences are multiples of 3, so the invariant doesn't forbid it, and a search shows it can be done.

#### Worked example 2: sorting must stop

Repeatedly pick any two neighbors that are out of order and swap them. Does this always end? Count **inversions**, pairs $i < j$ with $a_i > a_j$. Swapping an out-of-order neighbor pair fixes that pair and changes no other pair's order, so inversions drop by exactly 1. They start at most at $\binom{n}{2}$ and never go negative, so the process ends, after exactly as many swaps as there were inversions, whichever pairs you pick.

#### Checking by search

```cpp
mt19937_64 rng(2026);

bool canUnify(int r, int g, int b) {                   // BFS over (r, g, b)
    set<array<int, 3>> seen;
    queue<array<int, 3>> q;
    q.push({r, g, b});
    seen.insert({r, g, b});
    while (!q.empty()) {
        auto s = q.front();
        q.pop();
        if ((s[0] == 0) + (s[1] == 0) + (s[2] == 0) == 2) return true;
        for (int i = 0; i < 3; ++i) {                  // the two colors other than i meet
            int j = (i + 1) % 3, k = (i + 2) % 3;
            if (s[j] == 0 || s[k] == 0) continue;
            auto t = s;
            --t[j], --t[k], t[i] += 2;
            if (seen.insert(t).second) q.push(t);
        }
    }
    return false;
}

int main() {
    printf("5, 7, 9 can become one color: %s\n", canUnify(5, 7, 9) ? "yes" : "no");
    printf("4, 7, 10 can become one color: %s\n", canUnify(4, 7, 10) ? "yes" : "no");
    int mismatches = 0;
    for (int t = 0; t < 1000; ++t) {
        vector<int> a(12);
        iota(a.begin(), a.end(), 0);
        for (int i = 11; i > 0; --i) swap(a[i], a[rng() % (i + 1)]);   // Fisher-Yates
        int inv = 0, swaps = 0;
        for (int i = 0; i < 12; ++i)
            for (int j = i + 1; j < 12; ++j) inv += a[i] > a[j];
        for (bool again = true; again;) {              // swap a random out-of-order pair
            vector<int> bad;
            for (int i = 0; i + 1 < 12; ++i)
                if (a[i] > a[i + 1]) bad.push_back(i);
            again = !bad.empty();
            if (again) {
                int i = bad[rng() % bad.size()];
                swap(a[i], a[i + 1]);
                ++swaps;
            }
        }
        mismatches += swaps != inv;
    }
    printf("random orders where swaps != inversions: %d of 1000\n", mismatches);
}
```

Output:

```text
5, 7, 9 can become one color: no
4, 7, 10 can become one color: yes
random orders where swaps != inversions: 0 of 1000
```

The search agrees with the invariant in both cases, and in 1000 shuffles, swapping random out-of-order neighbors always took exactly as many swaps as there were inversions.

#### Variants

- **Bounded steps**: a monovariant that drops by at least 1 per move from a start of $M$ proves at most $M$ moves.
- **Potential functions** in algorithms (amortized analysis) are monovariants with a cost attached.
- **Permutation parity**: every swap of two items flips the parity of the permutation, which is why the 15-puzzle with 14 and 15 swapped can't be solved.

Connects to: [parity and invariants](#/concept/math.number-theory.parity-and-invariants), [induction](#/concept/math.proofs.induction), [amortized analysis](#/concept/dsa.complexity.amortized-analysis). Practice: [Dominoes on a cut board](#/problems/q-cut-chessboard).

### questions
Q: What is the difference between an invariant and a monovariant?
A: An invariant never changes, so it proves some states can't be reached. A monovariant changes in only one direction, so if it is bounded it proves the process must stop.

Q: Why does repeatedly swapping out-of-order neighbors always sort a list?
A: Each such swap removes exactly one inversion and creates none. The number of inversions is a non-negative whole number, so the swaps must stop, and they stop only when no neighbors are out of order, which means the list is sorted.

Q: Tokens of three colors change so that two different-colored tokens both become the third color. How do you decide whether all can become one color?
A: Every move changes each difference of two counts by 0 or 3, so the differences mod 3 are invariant. Ending with one color needs two counts at 0, so some pair must start with a difference divisible by 3; if none does, it is impossible.

Q: Why is the 15-puzzle with two tiles swapped unsolvable?
A: Each move of the blank changes the permutation's parity and moves the blank one step, so the parity of the permutation combined with the blank's row distance is invariant. Swapping two tiles flips the parity alone, which no sequence of moves can undo.

## math.proofs.symmetry-and-extremal-principle
name: "Symmetry and extremal principle"
importance: important
scope: "Symmetry and extremal principle"

### simple
Symmetry arguments notice that two situations are mirror images, so whatever holds for one holds for the other. The extremal principle looks at the biggest or smallest thing, like the tallest person in a room, where extra facts are forced. Both turn hard puzzles into short arguments.

### interview
- **Symmetry**: if a situation looks the same after relabeling, the answers for the relabeled parts are equal (each of $n$ symmetric outcomes has probability $\frac{1}{n}$).
- **Strategy stealing by mirroring**: make the position symmetric, then copy every opponent move on the other side; you always have a reply, so you make the last move.
- **Extremal principle**: consider the largest, smallest, first or last object; its extremeness forces a property, or a counterexample would give something even more extreme.
- It pairs with contradiction: "take the smallest counterexample" and derive a smaller one.
- Examples: a player with the most wins in a round robin is a "king"; numbers on a circle that each equal the average of their neighbors are all equal (look at the maximum).
- Check that the symmetry is real: a biased coin or a first-mover advantage breaks it.

### deep
#### Intuition

Symmetry saves computation: if relabeling doesn't change the setup, it can't change the answer. Extremal objects save search: the largest element can't have anything larger next to it, which is often exactly the fact the proof needs.

#### Worked example 1: a mirroring strategy

A row of $n$ pins stands in a line. Players alternately knock down either one pin or two adjacent pins; whoever knocks down the last pin wins. Who wins?

The first player knocks down the middle pin (if $n$ is odd) or the middle two (if $n$ is even), leaving two equal rows with a gap between them. From then on, whatever the opponent does in one row, the first player does the same in the mirror position of the other row. The position is symmetric after every one of the first player's moves, so the opponent is never the one who faces an empty board last: the first player always has a reply, and so makes the final move. The first player wins for every $n \ge 1$.

#### Worked example 2: the most wins makes a king

In a round-robin tournament (every pair plays once, no draws), call a player a **king** if, for every other player, the king beat them directly or beat someone who beat them. Claim: a player with the most wins is a king.

Extremal argument: let $X$ have the most wins, and suppose some $Y$ is not reached in one or two steps. Then $Y$ beat $X$, and $Y$ also beat everyone $X$ beat (otherwise $X$ would reach $Y$ in two steps). So $Y$ has all of $X$'s wins plus the win over $X$, more than $X$. That contradicts $X$ having the most.

#### Checking by brute force

The program solves the pin game by searching every position (a sorted list of row lengths) without using the mirror argument, and checks every tournament on up to 7 players.

```cpp
map<vector<int>, bool> memo;

bool wins(vector<int> rows) {                    // true if the player to move wins
    if (rows.empty()) return false;
    if (auto it = memo.find(rows); it != memo.end()) return it->second;
    bool w = false;
    for (size_t i = 0; i < rows.size() && !w; ++i)
        for (int take = 1; take <= 2 && !w; ++take)
            for (int left = 0; left + take <= rows[i] && !w; ++left) {
                vector<int> next;
                for (size_t j = 0; j < rows.size(); ++j)
                    if (j != i) next.push_back(rows[j]);
                int right = rows[i] - left - take;
                if (left) next.push_back(left);
                if (right) next.push_back(right);
                sort(next.begin(), next.end());
                w = !wins(next);
            }
    return memo[rows] = w;
}

int main() {
    int firstWins = 0;
    for (int n = 1; n <= 16; ++n) firstWins += wins({n});
    printf("rows of 1 to 16 pins won by the first player: %d of 16\n", firstWins);
    for (int n = 3; n <= 7; ++n) {
        int m = n * (n - 1) / 2, failures = 0;
        for (int mask = 0; mask < 1 << m; ++mask) {
            bool beat[7][7] = {};
            for (int a = 0, e = 0; a < n; ++a)
                for (int b = a + 1; b < n; ++b, ++e)
                    (mask >> e & 1 ? beat[a][b] : beat[b][a]) = true;
            int w[7] = {}, best = 0;
            for (int a = 0; a < n; ++a) {
                for (int b = 0; b < n; ++b) w[a] += beat[a][b];
                best = max(best, w[a]);
            }
            for (int x = 0; x < n; ++x) {
                if (w[x] != best) continue;
                for (int y = 0; y < n; ++y) {
                    bool reach = x == y || beat[x][y];
                    for (int z = 0; z < n && !reach; ++z) reach = beat[x][z] && beat[z][y];
                    failures += !reach;
                }
            }
        }
        printf("%d players: %d tournaments, top scorers who are not kings: %d\n", n, 1 << m,
               failures);
    }
}
```

Output:

```text
rows of 1 to 16 pins won by the first player: 16 of 16
3 players: 8 tournaments, top scorers who are not kings: 0
4 players: 64 tournaments, top scorers who are not kings: 0
5 players: 1024 tournaments, top scorers who are not kings: 0
6 players: 32768 tournaments, top scorers who are not kings: 0
7 players: 2097152 tournaments, top scorers who are not kings: 0
```

The game search explores every line of play, and it agrees that the first player wins every row from 1 to 16 pins. All 2,131,016 tournaments on 3 to 7 players confirm that every top scorer is a king.

#### Common mistakes

- **Fake symmetry**: after a move that breaks the mirror (the middle pin in a row of even length), copying is no longer possible; the first move must create the symmetry.
- **Extremal objects that may not exist**: an infinite set of numbers may have no largest element; say why the maximum exists (finite set, bounded integers).

Connects to: [symmetry arguments](#/concept/prob.foundations.symmetry-arguments), [proof by contradiction](#/concept/math.proofs.proof-by-contradiction-and-contrapositive), [Nim and impartial games](#/concept/puzzles.games.nim-and-impartial-games), [ants on a pole](#/concept/puzzles.probability.ants-on-a-pole-and-similar-symmetry-tricks).

### questions
Q: How does a mirroring strategy win a game?
A: The first player makes the position symmetric, then answers every opponent move with the mirror-image move. Each reply is always available, so the first player is never left without a move and makes the last one.

Q: Why is the player with the most wins in a round robin a king?
A: If some player Y were not beaten by the top scorer X directly or through one intermediate, Y would have beaten X and everyone X beat. Then Y would have more wins than X, which contradicts X having the most.

Q: What is the extremal principle?
A: Look at an extreme object, such as the largest number, the first time something happens or the smallest counterexample. Its extremeness forces a useful fact, or produces an even more extreme object, which is a contradiction.

Q: Numbers are placed around a circle, each equal to the average of its two neighbors. Why are they all equal?
A: Take the largest number. It is the average of two numbers that are no larger, so both neighbors equal it; repeating around the circle makes every number equal to the maximum.
