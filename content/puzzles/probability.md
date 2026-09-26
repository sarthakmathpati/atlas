---
topic: puzzles.probability
name: "Probability brainteasers"
subject: puzzles
order: 3
prereqs: [puzzles.method, prob.foundations]
---

## puzzles.probability.monty-hall-and-its-variants
name: "Monty Hall and its variants"
importance: must
scope: "Monty Hall and its variants"

### simple
In the Monty Hall game you pick one of three doors, the host (who knows where the prize is) opens a different door with no prize, and you may switch. Switching wins two times in three, because your first pick is right only a third of the time and the host's choice is forced by where the prize is. Change what the host knows or how the host chooses, and the answer changes too.

### interview
- Standard game: staying wins $\frac{1}{3}$, switching $\frac{2}{3}$. The host's knowledge matters: the host never opens the prize door.
- Reason with Bayes or by listing cases: your first pick is wrong $\frac{2}{3}$ of the time, and then switching always wins.
- **More doors**: with $n$ doors and the host opening $k$ empty ones, switching to a random remaining door wins $\frac{n-1}{n(n-k-1)}$.
- **Ignorant host** (opens a random other door, which happens to be empty): switching and staying are both $\frac{1}{2}$.
- **Host who only offers a switch when you picked the prize**: never switch.
- Always ask how the host chooses; the answer depends on that rule, not only on what you see.

### deep
#### Intuition

Your first pick is right with probability $\frac{1}{3}$ no matter what happens next, because the host's action carries no information about your door: the host can always open an empty one. All the remaining $\frac{2}{3}$ concentrates on the one door left closed. When the host's rule changes, what the host's action tells you changes, and Bayes' theorem gives the new answer.

#### Worked example 1: four doors

*Four doors hide one prize. You pick one; the host, who knows where the prize is, opens one other door with no prize (choosing at random when there is a choice). You switch to one of the two other closed doors at random. What is your chance?*

Your first door is wrong with probability $\frac{3}{4}$. Then the prize is behind one of the two doors you might switch to, and you pick it half the time: $\frac{3}{4} \cdot \frac{1}{2} = \frac{3}{8}$, better than staying ($\frac{1}{4}$). This matches $\frac{n-1}{n(n-k-1)} = \frac{3}{4 \cdot 2}$.

#### Worked example 2: a host who doesn't know

*Three doors; the host opens one of the two other doors at random, and it happens to have no prize. Should you switch?*

Condition on what you saw. The prize is behind your door with probability $\frac{1}{3}$, and then the opened door is always empty. It is behind one of the others with probability $\frac{2}{3}$, and then the random door is empty only half the time. So $P(\text{yours} \mid \text{empty opened}) = \frac{1/3}{1/3 + 1/3} = \frac{1}{2}$: switching doesn't help. What changed is that an empty door now carries information: the host could have revealed the prize and didn't.

#### Checking exactly and by simulation

```cpp
mt19937_64 rng(2026);
int pick(int n) { return int(rng() % n); }

int main() {
    // Exact, by listing every case with its probability.
    double fourDoors = 0, fallEmpty = 0, fallWin = 0;
    for (int car = 0; car < 4; ++car)            // you pick door 0
        for (int opened = 1; opened < 4; ++opened) {
            if (opened == car) continue;
            double pOpen = 1.0 / (car == 0 ? 3 : 2);
            for (int to = 1; to < 4; ++to)
                if (to != opened) fourDoors += 0.25 * pOpen * 0.5 * (to == car);
        }
    for (int car = 0; car < 3; ++car)            // ignorant host opens door 1 or 2 at random
        for (int opened = 1; opened < 3; ++opened)
            if (opened != car) fallEmpty += 1.0 / 6, fallWin += 1.0 / 6 * (3 - opened == car);
    printf("exact: four doors switching %.6f (3/8 = %.6f); ignorant host switching %.6f\n",
           fourDoors, 3.0 / 8, fallWin / fallEmpty);
    const int n = 1'000'000;
    long winA = 0, emptyB = 0, winB = 0;
    for (int i = 0; i < n; ++i) {
        int car = pick(4), opened;               // four doors, knowing host
        do opened = 1 + pick(3); while (opened == car);
        int to;
        do to = 1 + pick(3); while (to == opened);
        winA += to == car;
        int car3 = pick(3), open3 = 1 + pick(2); // three doors, ignorant host
        if (open3 == car3) continue;             // prize revealed: this game doesn't count
        ++emptyB, winB += car3 == 3 - open3;
    }
    double pA = double(winA) / n, pB = double(winB) / emptyB;
    printf("simulated: four doors %.5f (%.1f SE), ignorant host %.5f (%.1f SE)\n", pA,
           fabs(pA - 0.375) / sqrt(0.375 * 0.625 / n), pB, fabs(pB - 0.5) / sqrt(0.25 / emptyB));
}
```

Output:

```text
exact: four doors switching 0.375000 (3/8 = 0.375000); ignorant host switching 0.500000
simulated: four doors 0.37471 (0.6 SE), ignorant host 0.49946 (0.9 SE)
```

Listing the cases gives exactly $\frac{3}{8}$ and $\frac{1}{2}$, and a million simulated games of each land within about a standard error of those values.

#### Common mistakes

- **"Two doors left, so 50-50"**: that ignores how the host chose; it is right only for the ignorant host.
- **Forgetting the host's rule** in a variant: always ask whether the host knows and how the host picks.
- **Simulating the ignorant host without discarding** the games where the host reveals the prize.

Connects to: [conditional probability](#/concept/prob.foundations.conditional-probability), [Bayes' theorem](#/concept/prob.foundations.bayes-theorem), [two envelopes and paradoxes](#/concept/puzzles.probability.two-envelopes-and-paradoxes). Practice: [Monty Hall](#/problems/q-monty).

### questions
Q: Why does switching win two thirds of the time in the standard Monty Hall game?
A: Your first pick is right only a third of the time, and the host, who knows where the prize is, can always open an empty door, so that action tells you nothing about your door. The other two thirds all sit on the door left closed.

Q: With four doors, where the host opens one empty door and you switch to a random remaining door, what is your chance?
A: 3/8. Your first door is wrong three quarters of the time, and then you pick the prize with probability one half among the two doors left.

Q: What changes if the host opens a random door and it happens to be empty?
A: Switching no longer helps: both remaining doors have probability one half. An empty door is now evidence, because the host might have revealed the prize, and it raises the chance that your own door holds it.

Q: What question should you ask first when given a Monty Hall variant?
A: How the host chooses which door to open and when the switch is offered. The probabilities come from that rule through Bayes' theorem, not only from what you see.

## puzzles.probability.birthday-problem
name: "Birthday problem"
importance: must
scope: "collisions"

### simple
In a group of just 23 people, it is more likely than not that two share a birthday. That feels too small because we think of our own birthday, but the question is about any pair, and 23 people form 253 pairs. The same effect makes random IDs collide much sooner than you would guess.

### interview
- $P(\text{no shared value among } n) = \prod_{i=0}^{n-1}\left(1 - \frac{i}{N}\right) \approx e^{-n(n-1)/(2N)}$ for $N$ equally likely values.
- The 50% point is near $n \approx 1.1774\sqrt{N}$: collisions start around the square root of the number of values.
- **Someone shares *your* value** is much rarer: $1 - \left(1 - \frac{1}{N}\right)^{n-1}$, needing about $0.69N$ people for 50%.
- Expected number of shared pairs: $\binom{n}{2}\frac{1}{N}$ (linearity of expectation).
- Engineering use: random 32-bit IDs collide with 50% probability after about 77,000; 64-bit IDs after about 5 billion.
- Real birthdays aren't uniform; unevenness only makes matches more likely.

### deep
#### Intuition

Count pairs, not people. With $n$ people there are $\binom{n}{2}$ pairs, each matching with probability $\frac{1}{N}$, so the expected number of matching pairs is about $\frac{n^2}{2N}$. Collisions become likely once that reaches about $\ln 2 \approx 0.69$, which gives $n \approx \sqrt{2N \ln 2} = 1.1774\sqrt{N}$.

#### Worked example 1: yours or anyone's

In a room of 30 people:

- $P(\text{some pair shares}) = 1 - \prod_{i=0}^{29}\frac{365 - i}{365} \approx 0.706$.
- $P(\text{someone shares your birthday}) = 1 - \left(\frac{364}{365}\right)^{29} \approx 0.076$.

For your own birthday to be matched with probability at least $\frac{1}{2}$, you need 253 other people: $\left(\frac{364}{365}\right)^{253} \approx 0.4995$.

#### Worked example 2: four-digit codes

*People pick 4-digit codes uniformly at random from 10,000. How many people make a repeated code more likely than not?* The approximation says $1.1774 \times 100 \approx 118$; the exact product (below) shows that 118 people give a probability just under one half, so the answer is **119**.

#### Checking exactly and by simulation

```cpp
mt19937_64 rng(2026);

double noMatch(int n, double N) {                // exact product
    double p = 1;
    for (int i = 0; i < n; ++i) p *= 1 - i / N;
    return p;
}

int main() {
    printf("30 people: some pair %.4f, someone shares yours %.4f\n", 1 - noMatch(30, 365),
           1 - pow(364.0 / 365, 29));
    int m = 1;
    while (1 - pow(364.0 / 365, m) < 0.5) ++m;
    printf("others needed to match your birthday: %d\n", m);
    int n = 1;
    while (1 - noMatch(n, 10000) < 0.5) ++n;
    printf("4-digit codes: %d people (P = %.5f; %d people give %.5f)\n", n, 1 - noMatch(n, 10000),
           n - 1, 1 - noMatch(n - 1, 10000));
    long double p = 1, N32 = 4294967296.0L;
    long ids = 0;
    while (p > 0.5L) p *= 1 - ids++ / N32;       // stops once P(no collision) <= 1/2
    printf("32-bit random ids: 50%% collision chance at %ld ids (1.1774 sqrt(N) = %.0f)\n", ids,
           1.1774 * 65536);
    const int trials = 1'000'000;
    long hits = 0;
    for (int t = 0; t < trials; ++t) {           // simulate a room of 30
        bitset<365> seen;
        bool shared = false;
        for (int i = 0; i < 30 && !shared; ++i) {
            int d = int(rng() % 365);
            shared = seen[d], seen[d] = true;
        }
        hits += shared;
    }
    double exact = 1 - noMatch(30, 365), sim = double(hits) / trials;
    printf("simulated room of 30: %.4f (%.1f SE from exact)\n", sim,
           fabs(sim - exact) / sqrt(exact * (1 - exact) / trials));
}
```

Output:

```text
30 people: some pair 0.7063, someone shares yours 0.0765
others needed to match your birthday: 253
4-digit codes: 119 people (P = 0.50584; 118 people give 0.49994)
32-bit random ids: 50% collision chance at 77164 ids (1.1774 sqrt(N) = 77162)
simulated room of 30: 0.7063 (0.1 SE from exact)
```

The exact products give the thresholds directly: 119 people for the 4-digit codes, one more than the approximation, because 118 fall just short of one half. The 32-bit case lands on the square-root rule, and a million simulated rooms agree with the exact 0.7063.

#### Common mistakes

- **Answering "someone shares mine"** when the question is "any two share": 253 other people versus 23 in all for 50%.
- **Adding probabilities of pairs**: $\binom{n}{2}\frac{1}{N}$ is an expected count, not a probability, and exceeds 1 for large $n$.
- **Forgetting that non-uniform values collide sooner**: the uniform answer is the best case.

Connects to: [complement rule](#/concept/prob.foundations.axioms-and-basic-rules), [indicator variables](#/concept/prob.random-variables.indicator-variables), [unique ID generation](#/concept/sysd.building-blocks.unique-id-generation), [collision handling](#/concept/dsa.hashing.collision-handling). Practice: [Birthday twins among 23](#/problems/q-birthday-23).

### questions
Q: Why do so few people make a shared birthday likely?
A: The question is about any pair, and the number of pairs grows like n squared over 2. With 23 people there are 253 pairs, enough that some match is more likely than not.

Q: How many people do you need before someone likely shares your own birthday?
A: About 253 others, since (364/365) to the 253rd is just under one half. Matching one fixed day is much harder than matching any pair.

Q: At what point do random IDs start to collide?
A: Around the square root of the number of possible IDs: the 50% point is about 1.18 times the square root of N. For 32-bit IDs that is about 77,000; for 64-bit IDs about 5 billion.

Q: How would you approximate the probability of no shared value among n people and N values?
A: The product of (1 - i/N) for i below n is close to e to the power of minus n(n - 1)/(2N), because each factor is about e to the minus i/N.

## puzzles.probability.coin-and-dice-games
name: "Coin and dice games"
importance: must
scope: "expected rolls, fair games, choosing the better bet"

### simple
Coin and dice games ask how long something takes on average, whether a game is fair, or which of two bets is better. The tool is almost always the same: write down the states of the game and how you move between them, then solve a few small equations. Intuition often misleads here, so trust the equations and a quick simulation.

### interview
- **Fair game**: expected winnings minus the price is 0. Compute the expected payout; that is the fair price.
- **Expected rolls**: set up first-step equations, one unknown per state (see [first-step analysis](#/concept/prob.expected-value.first-step-analysis)).
- **Pattern races** (Penney's game): for any 3-flip pattern the opponent can pick one that comes first more often; HHT beats HTH with probability $\frac{2}{3}$.
- Patterns that overlap with themselves (HTH, HH) take longer to appear: HTH needs 10 flips on average, HHT only 8.
- Choosing a bet: compare expected values first, then variance and the chance of ruin if the bet repeats.
- Check small games by listing outcomes, larger ones by a seeded simulation.

### deep
#### Intuition

A partial pattern is a state. From each state, one flip moves you to another state, and the expected time (or the probability of winning a race) satisfies one linear equation per state. What makes patterns differ is what happens after a failure: after HT, a flip of T wipes out all progress toward HTH, but in the race HTH against HHT, the moment two heads appear, HHT is certain to finish first, since any later tail completes it.

#### Worked example 1: which pattern first

*A fair coin is flipped until HTH or HHT appears. Which is more likely first?*

Let $p_s$ be the probability that HHT wins from state $s$, where the states are the useful endings of the flips so far:

- from HH: another H stays in HH, a T completes HHT, so $p_{HH} = 1$;
- from HT: H completes HTH (HHT loses), T restarts, so $p_{HT} = \frac{1}{2}p_\varnothing$;
- from H: $p_H = \frac{1}{2}p_{HH} + \frac{1}{2}p_{HT}$;
- from the start: $p_\varnothing = \frac{1}{2}p_H + \frac{1}{2}p_\varnothing$, so $p_\varnothing = p_H$.

Then $p_H = \frac{1}{2} + \frac{1}{4}p_H$, so $p_H = \frac{2}{3}$. **HHT comes first with probability $\frac{2}{3}$.**

#### Worked example 2: expected waiting times

For HTH alone: $E_\varnothing = 1 + \frac{1}{2}E_H + \frac{1}{2}E_\varnothing$, $E_H = 1 + \frac{1}{2}E_H + \frac{1}{2}E_{HT}$, $E_{HT} = 1 + \frac{1}{2} \cdot 0 + \frac{1}{2}E_\varnothing$. Solving gives $E_\varnothing = 10$. The same method gives 8 for HHT.

#### Worked example 3: a fair price

*Roll two dice: you receive 10 if the sum is 7 or 11, and pay 2 otherwise. Take the bet?* $P(7 \text{ or } 11) = \frac{6 + 2}{36} = \frac{2}{9}$, so the expected value is $10 \cdot \frac{2}{9} - 2 \cdot \frac{7}{9} = \frac{6}{9} = \frac{2}{3}$ per game: take it.

#### Checking by solving and simulating

```cpp
mt19937_64 rng(2026);

// Solves the state equations of a pattern game by Gauss-Jordan elimination.
vector<double> solve(vector<vector<double>> a) {        // rows: coefficients | constant
    int n = a.size();
    for (int c = 0; c < n; ++c) {
        int p = c;
        for (int r = c + 1; r < n; ++r)
            if (fabs(a[r][c]) > fabs(a[p][c])) p = r;
        swap(a[c], a[p]);
        for (int r = 0; r < n; ++r)
            if (r != c) {
                double f = a[r][c] / a[c][c];
                for (int k = c; k <= n; ++k) a[r][k] -= f * a[c][k];
            }
    }
    vector<double> x(n);
    for (int i = 0; i < n; ++i) x[i] = a[i][n] / a[i][i];
    return x;
}

int main() {
    // P(HHT first), states start, H, HH, HT:  p = 0.5 p_next(H) + 0.5 p_next(T)
    auto p = solve({{0.5, -0.5, 0, 0, 0},       // start: H -> H, T -> start
                    {0, 1, -0.5, -0.5, 0},      // H: H -> HH, T -> HT
                    {0, 0, 0.5, 0, 0.5},        // HH: H -> HH, T -> HHT wins
                    {-0.5, 0, 0, 1, 0}});       // HT: H -> HTH wins (0), T -> start
    // Expected flips for HTH (states start, H, HT) and HHT (states start, H, HH).
    auto hth = solve({{0.5, -0.5, 0, 1}, {0, 0.5, -0.5, 1}, {-0.5, 0, 1, 1}});
    auto hht = solve({{0.5, -0.5, 0, 1}, {-0.5, 1, -0.5, 1}, {0, 0, 0.5, 1}});
    printf("exact: P(HHT before HTH) = %.6f, E[HTH] = %.4f, E[HHT] = %.4f\n", p[0], hth[0],
           hht[0]);
    const int n = 1'000'000;
    long hhtFirst = 0;
    for (int i = 0; i < n; ++i) {
        int last3 = 0, flips = 0;                // bits of the last three flips, H = 1
        while (true) {
            last3 = (last3 << 1 | int(rng() & 1)) & 7, ++flips;
            if (flips >= 3 && last3 == 0b101) break;             // HTH
            if (flips >= 3 && last3 == 0b110) { ++hhtFirst; break; }  // HHT
        }
    }
    double sim = double(hhtFirst) / n;
    printf("simulated P(HHT first) = %.5f (%.1f SE)\n", sim,
           fabs(sim - 2.0 / 3) / sqrt(2.0 / 9 / n));
    long win = 0;
    for (int x = 1; x <= 6; ++x)
        for (int y = 1; y <= 6; ++y) win += x + y == 7 || x + y == 11;
    printf("dice bet: P(win) = %ld/36, expected value %.4f\n", win,
           (10.0 * win - 2.0 * (36 - win)) / 36);
}
```

Output:

```text
exact: P(HHT before HTH) = 0.666667, E[HTH] = 10.0000, E[HHT] = 8.0000
simulated P(HHT first) = 0.66716 (1.0 SE)
dice bet: P(win) = 8/36, expected value 0.6667
```

Solving the equations reproduces $\frac{2}{3}$, 10 and 8, the simulation agrees with $\frac{2}{3}$, and listing the 36 dice outcomes confirms the bet's value of $\frac{2}{3}$.

#### Common mistakes

- **"All patterns of length 3 are equally likely, so they tie"**: equally likely at a fixed position, but not equally quick to appear first.
- **Forgetting partial progress** after a failure: after HT, an H completes HTH but after HH a T completes HHT; the states must record exactly the useful suffix.
- **Judging a bet by its win probability**: a bet that wins less often can still have the higher expected value.

Connects to: [waiting time problems](#/concept/prob.expected-value.waiting-time-problems), [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [Markov chains](#/concept/prob.markov.markov-chains), [expected value decisions](#/concept/markets.betting.expected-value-decisions). Practice: [Four heads in a row](#/problems/q-four-heads).

### questions
Q: In a race between HTH and HHT on a fair coin, which pattern tends to come first?
A: HHT, with probability 2/3. Once two heads in a row appear, HHT is certain to finish first, because the next tail completes it and heads only keep the two-heads state.

Q: Why does HTH take longer to appear than HHT on average?
A: HTH overlaps with itself: its first flip equals its last, so a near miss wastes more. By Conway's rule the expected wait is the sum of 2 to the k over every k where the first k flips equal the last k: 2 + 8 = 10 for HTH, but only 8 for HHT.

Q: How do you compute the fair price of a dice game?
A: Compute the expected payout by weighting each outcome's payout by its probability. For receiving 10 on a sum of 7 or 11 and paying 2 otherwise, the expected value is 10 times 2/9 minus 2 times 7/9, or 2/3, so the game is favorable.

Q: How do you set up first-step equations for a waiting time?
A: Name one unknown per state, the expected remaining time from that state, and write that each equals 1 plus the average of the unknowns for the states one step later. Solve the linear system; the start state's value is the answer.

## puzzles.probability.card-problems
name: "Card problems"
importance: important
scope: "drawing aces, colors, positions"

### simple
Card puzzles use a shuffled deck, where every order is equally likely. Counting hands answers "what is the chance of a given hand", and symmetry answers "where does a card end up". Many position questions have a neat trick: the special cards split the rest of the deck into equal gaps on average.

### interview
- A 5-card hand is one of $\binom{52}{5} = 2{,}598{,}960$ equally likely hands; count the favorable ones by the product rule.
- **Symmetry**: any particular card is equally likely to be in any position; any two positions hold a random pair.
- **Gaps**: $m$ special cards split the other $k$ cards into $m + 1$ gaps of expected size $\frac{k}{m+1}$ each.
- **Linearity**: expected numbers of pairs, matches or runs are sums over positions of indicator probabilities.
- Without replacement, successive draws are dependent but still exchangeable: the 10th card is as likely to be an ace as the first.
- Simulate with a Fisher-Yates shuffle to check anything messy.

### deep
#### Intuition

Because every order of the deck is equally likely, a question about positions can be moved around: the chance that the 10th card is red is the chance that the first is. And sums over positions become simple through indicator variables, even when the positions are dependent.

#### Worked example 1: all four suits in a hand

*What is the chance that a 5-card hand contains all four suits?* One suit appears twice and the others once: choose that suit (4), its two cards $\binom{13}{2} = 78$, and one card of each other suit ($13^3$):

$$\frac{4 \cdot 78 \cdot 2197}{2{,}598{,}960} = \frac{685{,}464}{2{,}598{,}960} \approx 0.2637.$$

#### Worked example 2: neighbors of the same color

*On average, how many of the 51 adjacent pairs in a shuffled deck have the same color?* For any adjacent pair, the second card matches the first's color with probability $\frac{25}{51}$. By linearity, the expected count is $51 \cdot \frac{25}{51} = 25$.

#### Worked example 3: waiting for a face card

*You turn cards until the first king or queen. What is its expected position?* The 8 kings and queens split the other 44 cards into 9 gaps, each of expected size $\frac{44}{9}$ by symmetry. The first king or queen comes after the first gap: position $1 + \frac{44}{9} = \frac{53}{9} \approx 5.89$.

#### Checking exactly and by simulation

```cpp
mt19937_64 rng(2026);

int main() {
    long hands = 0, allSuits = 0;                // every 5-card hand, card c has suit c % 4
    for (int a = 0; a < 52; ++a)
        for (int b = a + 1; b < 52; ++b)
            for (int c = b + 1; c < 52; ++c)
                for (int d = c + 1; d < 52; ++d)
                    for (int e = d + 1; e < 52; ++e) {
                        ++hands;
                        int suits = 1 << a % 4 | 1 << b % 4 | 1 << c % 4;
                        suits |= 1 << d % 4 | 1 << e % 4;
                        allSuits += suits == 15;
                    }
    printf("all four suits: %ld of %ld hands = %.4f\n", allSuits, hands, double(allSuits) / hands);
    const int n = 200'000;
    double sameSum = 0, sameSq = 0, posSum = 0, posSq = 0;
    for (int t = 0; t < n; ++t) {
        int deck[52];
        iota(deck, deck + 52, 0);
        for (int i = 51; i > 0; --i) swap(deck[i], deck[rng() % (i + 1)]);
        int same = 0, first = 0;
        for (int i = 0; i + 1 < 52; ++i) same += (deck[i] % 4 < 2) == (deck[i + 1] % 4 < 2);
        while (deck[first] / 4 < 11) ++first; // ranks 11 and 12 are queen and king
        sameSum += same, sameSq += same * same;
        posSum += first + 1, posSq += (first + 1) * (first + 1);
    }
    auto report = [&](const char* what, double s, double sq, double exact) {
        double mean = s / n, se = sqrt((sq / n - mean * mean) / n);
        printf("%s: simulated %.4f, exact %.4f (%.1f SE)\n", what, mean, exact,
               fabs(mean - exact) / se);
    };
    report("same-color neighbors", sameSum, sameSq, 25);
    report("first king or queen", posSum, posSq, 53.0 / 9);
}
```

Output:

```text
all four suits: 685464 of 2598960 hands = 0.2637
same-color neighbors: simulated 24.9999, exact 25.0000 (0.0 SE)
first king or queen: simulated 5.9053, exact 5.8889 (1.5 SE)
```

Enumerating all 2,598,960 hands gives exactly 685,464, and 200,000 shuffles agree with the two expected values within the usual sampling error.

#### Common mistakes

- **Ordered versus unordered hands**: count both favorable and total hands the same way.
- **Assuming independence between draws**: the colors of neighbors aren't independent ($\frac{25}{51}$, not $\frac{1}{2}$), but linearity doesn't need independence.
- **Off by one in positions**: the expected number of cards *before* the first special card is $\frac{k}{m+1}$; its position is one more.

Connects to: [indicator variables](#/concept/prob.random-variables.indicator-variables), [symmetry arguments](#/concept/prob.foundations.symmetry-arguments), [negative binomial and hypergeometric](#/concept/prob.distributions.negative-binomial-and-hypergeometric). Practice: [Turning cards until an ace](#/problems/q-first-ace) and [Black cards before the first red](#/problems/q-black-before-red).

### questions
Q: What is the probability that a 5-card hand contains all four suits?
A: Choose the doubled suit (4 ways), two of its cards (78) and one card of each other suit (13 cubed): 685,464 of 2,598,960 hands, about 0.264.

Q: What is the expected number of adjacent same-color pairs in a shuffled deck?
A: 25. Each of the 51 adjacent pairs matches in color with probability 25/51, and linearity of expectation adds these up regardless of dependence.

Q: What is the gap trick for positions in a shuffled deck?
A: m special cards split the other k cards into m + 1 gaps, and by symmetry each gap has the same expected size, k over (m + 1). The expected position of the first special card is one more than that.

Q: Is the 20th card of a shuffled deck less likely to be an ace than the first?
A: No. Every position is equally likely to hold any given card, so each position is an ace with probability 4/52, whatever the position.

## puzzles.probability.two-envelopes-and-paradoxes
name: "Two envelopes and paradoxes"
importance: important
scope: "spotting flawed reasoning"

### simple
Probability paradoxes are arguments that sound right but reach a silly conclusion, such as "always switch envelopes, then switch back". Each one hides a mistake, usually a probability that can't exist or a condition quietly dropped. Finding the exact broken step is the skill interviewers test.

### interview
- **Two envelopes**: one holds twice the other; "the other has $2x$ or $\frac{x}{2}$ with equal chance, so switching gains $\frac{x}{4}$" assumes a 50-50 split for every amount, which no proper distribution allows.
- With any real prior, switching helps for some amounts and hurts for others, and on average it is worth exactly nothing.
- **Bertrand's box**: boxes with gold-gold, silver-silver and gold-silver coins; you draw gold, and the other coin is gold with probability $\frac{2}{3}$, not $\frac{1}{2}$ (count coins, not boxes).
- **St. Petersburg**: a payout of $2^k$ with probability $2^{-k}$ has infinite expected value, yet nobody pays much for it; utility and finite bankrolls explain the gap.
- Others: the boy-girl problem (how you learned the fact matters), Simpson's paradox (aggregation flips a trend), the inspection paradox (you tend to sample long intervals).
- Method: write the sample space and prior explicitly; the flaw appears as a step that has no probability model behind it.

### deep
#### Intuition

Most paradoxes treat a statement like "equally likely" as free. In the envelope argument, after seeing $x$, the other envelope holds $2x$ or $\frac{x}{2}$ with probabilities that depend on how the amounts were chosen. Insisting on 50-50 for every $x$ would need a uniform distribution over infinitely many amounts, which doesn't exist.

#### Worked example 1: envelopes with a real prior

*The smaller amount $x$ is chosen uniformly from 1, 2, 4, 8, 16 and 32; the envelopes hold $x$ and $2x$. You open one at random and see $y$. Should you switch?*

- $y = 1$: the other must be 2. Switch (+1).
- $y = 2, 4, 8, 16$ or $32$: the other is $\frac{y}{2}$ or $2y$ with equal chance, so switching gains $\frac{1}{2}\left(2y + \frac{y}{2}\right) - y = \frac{y}{4}$ on average.
- $y = 64$: the other must be 32. Switching loses 32.

Averaged over everything you might see, the expected gain of "always switch" is $\frac{1}{12}\left(1 + 2 \cdot \frac{2 + 4 + 8 + 16 + 32}{4} - 32\right) = \frac{1}{12}(1 + 31 - 32) = 0$. The rare large loss exactly cancels the frequent small gains.

#### Worked example 2: Bertrand's box

Three boxes hold gold-gold, silver-silver and gold-silver coins. Pick a box at random, then a coin from it: it is gold. The three gold coins are equally likely to be the one you drew, and two of them sit in the gold-gold box. So the other coin is gold with probability $\frac{2}{3}$.

#### Checking exactly and by simulation

```cpp
mt19937_64 rng(2026);

int main() {
    map<int, pair<double, double>> byY;          // y -> (probability, expected gain)
    for (int x = 1; x <= 32; x *= 2) {
        byY[x].first += 1.0 / 12, byY[x].second += 1.0 / 12 * x;          // saw x, other 2x
        byY[2 * x].first += 1.0 / 12, byY[2 * x].second += 1.0 / 12 * -x;  // saw 2x, other x
    }
    double total = 0;
    for (auto& [y, pg] : byY) {
        printf("see %2d: probability %.4f, expected gain from switching %+7.2f\n", y, pg.first,
               pg.second / pg.first);
        total += pg.second;
    }
    printf("always switching: expected gain %.4f\n", total);
    const int n = 1'000'000;
    long gold = 0, bothGold = 0;
    for (int i = 0; i < n; ++i) {
        int box = int(rng() % 3), coin = int(rng() % 2);  // boxes: GG, SS, GS
        bool drewGold = box == 0 || (box == 2 && coin == 0);
        if (!drewGold) continue;
        ++gold, bothGold += box == 0;
    }
    double p = double(bothGold) / gold;
    printf("Bertrand's box: P(other gold | drew gold) = %.5f (%.1f SE from 2/3)\n", p,
           fabs(p - 2.0 / 3) / sqrt(2.0 / 9 / gold));
}
```

Output:

```text
see  1: probability 0.0833, expected gain from switching   +1.00
see  2: probability 0.1667, expected gain from switching   +0.50
see  4: probability 0.1667, expected gain from switching   +1.00
see  8: probability 0.1667, expected gain from switching   +2.00
see 16: probability 0.1667, expected gain from switching   +4.00
see 32: probability 0.1667, expected gain from switching   +8.00
see 64: probability 0.0833, expected gain from switching  -32.00
always switching: expected gain 0.0000
Bertrand's box: P(other gold | drew gold) = 0.66642 (0.4 SE from 2/3)
```

The table shows switching gains a quarter of the amount for every middle value, yet the overall expected gain is exactly 0. The simulated box draws agree with $\frac{2}{3}$.

#### Common mistakes

- **A uniform distribution over infinitely many values**: it doesn't exist, so "each is equally likely" needs a real model.
- **Counting boxes instead of coins** (or families instead of children) when the evidence is about one coin.
- **Trusting an expected value when it is infinite** or dominated by tiny-probability events.

Connects to: [conditional probability](#/concept/prob.foundations.conditional-probability), [expected value of games](#/concept/prob.expected-value.expected-value-of-games), [utility and risk aversion](#/concept/markets.betting.utility-and-risk-aversion), [correlation vs causation](#/concept/prob.statistics.correlation-vs-causation). Practice: [Two envelopes](#/problems/q-envelopes).

### questions
Q: Where does the "always switch" argument in the two envelopes paradox go wrong?
A: It assumes that, whatever amount you see, the other envelope is equally likely to hold double or half. That would need a uniform distribution over infinitely many amounts, which doesn't exist; with any real distribution, switching helps for some amounts, hurts for others, and averages zero.

Q: In Bertrand's box problem, why is the answer 2/3 and not 1/2?
A: Seeing gold is evidence about which coin you drew, not just which box. Of the three equally likely gold coins, two are in the gold-gold box, so the other coin is gold with probability 2/3.

Q: What is the St. Petersburg paradox?
A: A game paying 2 to the k with probability 2 to the minus k for k = 1, 2, 3 and so on has infinite expected value, yet people would pay little for it. Diminishing utility of money, and the fact that no one can pay out unlimited amounts, resolve it.

Q: How do you approach a probability paradox in an interview?
A: Write down the sample space and how every quantity was generated, then redo the argument step by step. The flawed step is usually a probability with no model behind it, or a condition that was dropped.

## puzzles.probability.ants-on-a-pole-and-similar-symmetry-tricks
name: "Ants on a pole and similar symmetry tricks"
importance: important
scope: "Ants on a pole and similar symmetry tricks"

### simple
Some puzzles look like they need a complicated simulation but collapse with one change of viewpoint. When two identical ants bump and turn around, it looks exactly like they walked through each other, so you can pretend they never meet. Finding such a symmetry turns a messy process into a one-line answer.

### interview
- **Ants**: a collision where both reverse looks the same as the ants passing through each other ("ghost ants"), so the set of fall times is the set of times each ant would take walking straight.
- The ants keep their left-to-right order, so labels can be recovered afterwards if the question needs them.
- With random starting points and directions on a pole of length 1 (speed 1), each ghost falls after a uniform time, so the last fall comes after $\frac{n}{n+1}$ on average for $n$ ants.
- **Points on a circle**: $n$ random points lie in some semicircle with probability $\frac{n}{2^{n-1}}$; a random triangle contains the center with probability $\frac{1}{4}$.
- Other swaps of viewpoint: relabeling, time reversal, the complement, or rotating a circle so one point is fixed.
- Check a symmetry claim with a simulation of the real process, not the simplified one.

### deep
#### Intuition

If you can't tell ants apart, the picture of "A bounces left, B bounces right" is identical to "A continues right, B continues left". Nothing observable changes, so any question about when ants fall off (rather than which ant) can be answered as if they walk straight through each other. Every ghost walks one straight line at constant speed.

#### Worked example 1: the expected time until the pole is empty

*Five ants are placed at independent uniform points on a 1-meter pole, each facing left or right with equal chance, all walking at 1 meter per minute and reversing when they meet. On average, how long until all have fallen off?*

A ghost at $x$ walking left falls at time $x$; walking right, at $1 - x$. Either way its time is uniform on $[0, 1]$, independently of the others. The pole is empty when the last ghost falls, and the expected maximum of 5 independent uniforms is $\frac{5}{6}$ of a minute.

#### Worked example 2: points on a circle

*Place 4 random points on a circle. What is the chance they all lie in some half of it?* For each point, the event "the others all lie in the half-circle clockwise from it" has probability $\left(\frac{1}{2}\right)^{3}$, and at most one point can be that starting point. So the answer is $4 \cdot \frac{1}{8} = \frac{1}{2}$, and in general $\frac{n}{2^{n-1}}$. For 3 points it is $\frac{3}{4}$, so a random triangle contains the center with probability $\frac{1}{4}$.

#### Checking with the real collisions

The simulation moves real ants from event to event, bouncing them at every collision, and compares each run's finishing time with the ghost prediction.

```cpp
mt19937_64 rng(2026);
double unif() { return (rng() >> 11) * 0x1.0p-53; }

double realAnts(vector<double> x, vector<int> d) {   // x sorted; d = -1 left, +1 right
    double t = 0;
    while (!x.empty()) {
        double dt = 1e9;
        if (d.front() < 0) dt = min(dt, x.front());
        if (d.back() > 0) dt = min(dt, 1 - x.back());
        for (size_t i = 0; i + 1 < x.size(); ++i)
            if (d[i] > 0 && d[i + 1] < 0) dt = min(dt, (x[i + 1] - x[i]) / 2);
        t += dt;
        for (size_t i = 0; i < x.size(); ++i) x[i] += d[i] * dt;
        for (size_t i = 0; i + 1 < x.size(); ++i)
            if (d[i] > 0 && d[i + 1] < 0 && x[i + 1] - x[i] < 1e-12) d[i] = -1, d[i + 1] = 1;
        while (!x.empty() && d.front() < 0 && x.front() < 1e-12)   // fell off the left end
            x.erase(x.begin()), d.erase(d.begin());
        while (!x.empty() && d.back() > 0 && x.back() > 1 - 1e-12)  // fell off the right end
            x.pop_back(), d.pop_back();
    }
    return t;
}

int main() {
    const int n = 5, trials = 100'000;
    double sum = 0, sq = 0, worstGap = 0;
    for (int t = 0; t < trials; ++t) {
        vector<pair<double, int>> ants(n);
        for (auto& [x, d] : ants) x = unif(), d = rng() & 1 ? 1 : -1;
        sort(ants.begin(), ants.end());
        vector<double> x;
        vector<int> d;
        double ghost = 0;
        for (auto [xi, di] : ants) {
            x.push_back(xi), d.push_back(di);
            ghost = max(ghost, di < 0 ? xi : 1 - xi);             // a ghost walks straight
        }
        double real = realAnts(x, d);
        worstGap = max(worstGap, fabs(real - ghost));
        sum += real, sq += real * real;
    }
    double mean = sum / trials, se = sqrt((sq / trials - mean * mean) / trials);
    printf("largest difference real vs ghost: %.1e\n", worstGap);
    printf("mean time %.5f, exact 5/6 = %.5f (%.1f SE)\n", mean, 5.0 / 6,
           fabs(mean - 5.0 / 6) / se);
    const int pts = 1'000'000;
    for (int k = 3; k <= 5; ++k) {
        long inHalf = 0;
        for (int t = 0; t < pts; ++t) {
            vector<double> a(k);
            for (double& v : a) v = unif();
            sort(a.begin(), a.end());
            double gap = 1 - a.back() + a.front();              // largest empty arc
            for (int i = 0; i + 1 < k; ++i) gap = max(gap, a[i + 1] - a[i]);
            inHalf += gap >= 0.5;
        }
        double p = double(inHalf) / pts, exact = k / pow(2.0, k - 1);
        printf("%d points in a semicircle: %.5f, exact %.5f (%.1f SE)\n", k, p, exact,
               fabs(p - exact) / sqrt(exact * (1 - exact) / pts));
    }
}
```

Output:

```text
largest difference real vs ghost: 3.3e-16
mean time 0.83316, exact 5/6 = 0.83333 (0.4 SE)
3 points in a semicircle: 0.74993, exact 0.75000 (0.2 SE)
4 points in a semicircle: 0.50031, exact 0.50000 (0.6 SE)
5 points in a semicircle: 0.31326, exact 0.31250 (1.6 SE)
```

In every one of the 100,000 runs, bouncing the real ants gives the same finishing time as the ghost shortcut (up to rounding), and the average matches $\frac{5}{6}$. The semicircle frequencies match $\frac{n}{2^{n-1}}$.

#### Common mistakes

- **Tracking individual ants** through every bounce, which is correct but slow and error-prone.
- **Using ghosts for "which ant falls last"**: ghosts swap labels, so use the preserved left-to-right order for that.
- **Double counting in the semicircle argument**: at most one point can start a half-circle that holds all the others (with probability 1).

Connects to: [symmetry arguments](#/concept/prob.foundations.symmetry-arguments), [order statistics](#/concept/prob.distributions.order-statistics), [symmetry and extremal principle](#/concept/math.proofs.symmetry-and-extremal-principle), [geometric probability](#/concept/prob.continuous.geometric-probability). Practice: [Ants on a pole](#/problems/q-ants).

### questions
Q: Why can you pretend colliding ants pass through each other?
A: Two identical ants reversing at a collision produce exactly the same picture of positions over time as two ants walking through each other. Questions about when ants fall off don't depend on labels, so the straight-line ghosts give the answer.

Q: n ants start at random points on a unit pole, facing random directions. What is the expected time until all fall off?
A: n/(n + 1). Each ghost ant falls after a time that is uniform on 0 to 1 and independent of the others, and the pole is empty at the maximum of n such times.

Q: What is the probability that n random points on a circle lie in some semicircle?
A: n over 2 to the n - 1. For each point, the others fall in the half-circle clockwise from it with probability one half to the n - 1, and these n events can't happen together.

Q: What is the chance that a triangle with three random vertices on a circle contains the center?
A: 1/4. The triangle misses the center exactly when all three points lie in a semicircle, which has probability 3/4.
