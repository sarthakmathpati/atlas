---
topic: prob.random-variables
name: "Random variables and expectation"
subject: prob
order: 2
prereqs: [prob.foundations]
---

## prob.random-variables.random-variables
name: "Random variables"
importance: must
scope: "discrete vs continuous, PMF, PDF, CDF"

### simple
A random variable turns the outcome of an experiment into a number, like "the sum of two dice" or "the time until the next bus". Some take separate values you can list (discrete), others can land anywhere in a range (continuous). Its distribution tells you how likely each value, or each range of values, is.

### interview
- A **random variable** $X$ is a function from outcomes to numbers; its **distribution** says how probability spreads over values.
- **Discrete**: a **PMF** $p(x) = P(X = x)$, with $\sum_x p(x) = 1$. **Continuous**: a **PDF** $f(x)$ with $P(a \le X \le b) = \int_a^b f(x)\,dx$ and $\int f = 1$; any single value has probability 0.
- The **CDF** $F(x) = P(X \le x)$ works for both: non-decreasing, from 0 to 1, right-continuous; $P(a < X \le b) = F(b) - F(a)$; for continuous $X$, $f = F'$.
- A density can exceed 1 (Uniform(0, 1/2) has $f = 2$); only areas are probabilities.
- The CDF is often the easiest route to a new distribution: for the maximum of independent variables, $P(\max \le x) = \prod P(X_i \le x)$.
- Pitfall: treating $f(x)$ as $P(X = x)$ for a continuous variable.

### deep
#### Discrete: the sum of two dice

$S = X_1 + X_2$ for two independent fair dice. Counting the 36 ordered outcomes gives the PMF: $P(S = s) = \frac{6 - |s - 7|}{36}$ for $s = 2, \dots, 12$.

| $s$ | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| $p(s) \times 36$ | 1 | 2 | 3 | 4 | 5 | 6 | 5 | 4 | 3 | 2 | 1 |
| $F(s) \times 36$ | 1 | 3 | 6 | 10 | 15 | 21 | 26 | 30 | 33 | 35 | 36 |

So $P(4 < S \le 8) = F(8) - F(4) = \frac{26 - 6}{36} = \frac{5}{9}$.

#### Continuous: the larger of two uniforms

Let $M = \max(U_1, U_2)$ for independent Uniform(0, 1) variables. Its CDF comes straight from independence: $F(m) = P(U_1 \le m)\,P(U_2 \le m) = m^2$ for $0 \le m \le 1$, so the PDF is $f(m) = 2m$. The density is 0 at 0 and 2 at 1: the maximum tends to be large. For example $P(M \le \frac{1}{2}) = \frac{1}{4}$ and $P(0.5 < M \le 0.9) = 0.81 - 0.25 = 0.56$.

#### Checking both

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const long n = 1'000'000;
    long counts[13] = {};
    long below = 0, between = 0;
    for (long i = 0; i < n; ++i) {
        ++counts[int(rng() % 6) + int(rng() % 6) + 2];
        double m = max(u01(), u01());
        below += m <= 0.5;
        between += m > 0.5 && m <= 0.9;
    }
    printf(" s  exact p(s)  simulated\n");
    for (int s = 2; s <= 12; ++s)
        printf("%2d  %2d/36=%.4f  %.4f\n", s, 6 - abs(s - 7), (6 - abs(s - 7)) / 36.0,
               double(counts[s]) / n);
    long mid = counts[5] + counts[6] + counts[7] + counts[8];
    printf("P(4 < S <= 8): exact %.4f, simulated %.4f\n", 5.0 / 9, double(mid) / n);
    printf("P(max <= 0.5): exact 0.2500, simulated %.4f\n", double(below) / n);
    printf("P(0.5 < max <= 0.9): exact 0.5600, simulated %.4f\n", double(between) / n);
}
```

Output:

```text
 s  exact p(s)  simulated
 2   1/36=0.0278  0.0277
 3   2/36=0.0556  0.0555
 4   3/36=0.0833  0.0832
 5   4/36=0.1111  0.1112
 6   5/36=0.1389  0.1389
 7   6/36=0.1667  0.1666
 8   5/36=0.1389  0.1388
 9   4/36=0.1111  0.1109
10   3/36=0.0833  0.0838
11   2/36=0.0556  0.0556
12   1/36=0.0278  0.0279
P(4 < S <= 8): exact 0.5556, simulated 0.5554
P(max <= 0.5): exact 0.2500, simulated 0.2501
P(0.5 < max <= 0.9): exact 0.5600, simulated 0.5608
```

Every simulated probability is within 0.0008 of its exact value, less than two standard errors in each case (a million trials give standard errors between 0.0002 and 0.0005 for these probabilities).

#### PMF, PDF and CDF side by side

| | discrete | continuous |
|---|---|---|
| describes | $p(x) = P(X = x)$ | $f(x)$, probability per unit length |
| total | $\sum p(x) = 1$ | $\int f(x)\,dx = 1$ |
| probability of an interval | sum of $p$ | area under $f$ |
| CDF | a staircase | a smooth curve, $F' = f$ |
| $P(X = x)$ | can be positive | always 0 |

Mixed variables exist too (an insurance payout that is 0 with positive probability and continuous otherwise); the CDF still describes them.

#### Common mistakes

- Reading a density as a probability ($f(1) = 2$ above is not a probability).
- Using $<$ versus $\le$ carelessly for discrete variables, where $P(X = x)$ can be positive; for continuous ones it doesn't matter.
- Forgetting independence when multiplying CDFs for a maximum; for a minimum use $P(\min > x) = \prod P(X_i > x)$.

Connects to: [expectation](#/concept/prob.random-variables.expectation), [uniform distribution](#/concept/prob.distributions.uniform-distribution), [order statistics](#/concept/prob.distributions.order-statistics).

### questions
Q: What is the difference between a PMF and a PDF?
A: A PMF gives the probability of each value of a discrete random variable. A PDF is a density for a continuous variable: probabilities are areas under it, a single value has probability zero, and the density itself can be larger than 1.

Q: What is a CDF and what properties does it have?
A: The CDF gives the probability that the variable is at most x. It is non-decreasing, goes from 0 to 1, is right-continuous, and the probability of an interval from a to b, excluding a, is F(b) minus F(a).

Q: What is the distribution of the larger of two independent Uniform(0,1) variables?
A: Its CDF is x squared, because both variables must be at most x and they are independent, so its density is 2x on the interval from 0 to 1.

Q: What is the PMF of the sum of two fair dice?
A: For a sum s from 2 to 12, the probability is 6 minus the distance from s to 7, divided by 36, so 7 is most likely at one sixth and 2 and 12 are least likely at one in 36.

Q: Can a probability density be greater than 1?
A: Yes. A uniform variable on an interval of length one half has density 2 everywhere on it; only the total area has to be 1.

## prob.random-variables.expectation
name: "Expectation"
importance: must
prereqs: [prob.random-variables.random-variables]
scope: "definition, expected value of functions"

### simple
The expected value is the long-run average of a random quantity if you could repeat the experiment many times. A fair die averages 3.5, even though it never shows 3.5, the same way a family can have 2.4 children on average. It is the single most used number in quant interviews, because it tells you what a bet or a game is worth on average.

### interview
- **Definition**: $E[X] = \sum_x x\,p(x)$ (discrete) or $\int x\,f(x)\,dx$ (continuous), when the sum or integral converges absolutely.
- **Functions** (the law of the unconscious statistician): $E[g(X)] = \sum_x g(x)\,p(x)$; you don't need the distribution of $g(X)$.
- In general $E[g(X)] \ne g(E[X])$: for a die, $E[X^2] = \frac{91}{6} \approx 15.17$ but $(E[X])^2 = 12.25$. For convex $g$, **Jensen**: $E[g(X)] \ge g(E[X])$.
- Linear maps pass through: $E[aX + b] = aE[X] + b$.
- For non-negative integers, the **tail sum**: $E[X] = \sum_{k \ge 1} P(X \ge k)$; for non-negative continuous $X$, $E[X] = \int_0^\infty P(X > x)\,dx$.
- Expectations can be infinite (the St. Petersburg game) or undefined (the Cauchy distribution); say so before computing.

### deep
#### Intuition

The expectation is a probability-weighted average: every value pulls on the average in proportion to its chance. It is also the balance point of the distribution: put weights $p(x)$ at positions $x$ on a ruler, and $E[X]$ is where it balances.

#### Worked examples with a fair die

$$E[X] = \frac{1 + 2 + \dots + 6}{6} = \frac{21}{6} = 3.5$$

$$E[X^2] = \frac{1 + 4 + 9 + 16 + 25 + 36}{6} = \frac{91}{6} \approx 15.167$$

$$E\left[\frac{1}{X}\right] = \frac{1}{6}\left(1 + \frac{1}{2} + \dots + \frac{1}{6}\right) = \frac{49}{120} \approx 0.4083, \quad \text{while } \frac{1}{E[X]} = \frac{2}{7} \approx 0.2857.$$

Both gaps are Jensen's inequality in action, since $x^2$ and $\frac{1}{x}$ are convex for positive $x$.

#### Tail sums: waiting for a six

Let $N$ be the number of rolls until the first 6. $N \ge k$ means the first $k - 1$ rolls all missed, which has probability $(5/6)^{k-1}$ for independent rolls, so

$$E[N] = \sum_{k \ge 1} \left(\frac{5}{6}\right)^{k-1} = \frac{1}{1 - 5/6} = 6.$$

#### A game price

You pay a fee, roll a die, and receive the square of the face in rupees. The fair fee is $E[X^2] = \frac{91}{6} \approx 15.17$, not $3.5^2 = 12.25$: pricing a nonlinear payoff at the average input undervalues it, the same effect that gives options their value.

#### Code

The program computes each exact value by summing over the six faces, then simulates. For an average, the standard error is the standard deviation divided by $\sqrt{N}$.

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    auto exactOf = [](auto g) {                  // mean and sd of g(X) over the six faces
        double m = 0, m2 = 0;
        for (int x = 1; x <= 6; ++x) m += g(x) / 6.0, m2 += g(x) * g(x) / 6.0;
        return pair{m, sqrt(m2 - m * m)};
    };
    auto id = [](int x) { return double(x); };
    auto sq = [](int x) { return double(x) * x; };
    auto inv = [](int x) { return 1.0 / x; };
    const long n = 2'000'000;
    double s1 = 0, s2 = 0, sInv = 0, waits = 0;
    for (long i = 0; i < n; ++i) {
        int x = int(rng() % 6) + 1;
        s1 += id(x), s2 += sq(x), sInv += inv(x);
        int k = 1;
        while (rng() % 6 != 5) ++k;              // rolls until the first six
        waits += k;
    }
    auto line = [&](const char* what, pair<double, double> exact, double total) {
        auto [mean, sd] = exact;
        double est = total / n;
        printf("%-9s exact %.4f  simulated %.4f  off by %.1f standard errors\n", what, mean, est,
               fabs(est - mean) / (sd / sqrt(double(n))));
    };
    line("E[X]", exactOf(id), s1);
    line("E[X^2]", exactOf(sq), s2);
    line("E[1/X]", exactOf(inv), sInv);
    line("E[N]", {6.0, sqrt(30.0)}, waits);      // geometric: variance (1 - p) / p^2 = 30
    printf("1/E[X] = %.4f and E[X]^2 = %.4f, for comparison\n", 1 / 3.5, 3.5 * 3.5);
}
```

Output:

```text
E[X]      exact 3.5000  simulated 3.5000  off by 0.0 standard errors
E[X^2]    exact 15.1667  simulated 15.1683  off by 0.2 standard errors
E[1/X]    exact 0.4083  simulated 0.4083  off by 0.0 standard errors
E[N]      exact 6.0000  simulated 5.9993  off by 0.2 standard errors
1/E[X] = 0.2857 and E[X]^2 = 12.2500, for comparison
```

All four estimates are within 0.2 standard errors of the exact values, while $\frac{1}{E[X]}$ and $(E[X])^2$ are visibly different from $E[\frac{1}{X}]$ and $E[X^2]$.

#### Edge cases

- **Infinite expectation**: in the St. Petersburg game you win $2^k$ if the first head comes on flip $k$; $E = \sum_k 2^k \cdot 2^{-k} = \infty$, yet nobody pays much to play. Simulated averages of such games never settle.
- **Undefined expectation**: the ratio of two independent standard normals (Cauchy) has no mean; its sample average does not converge at all.
- **Expectation of a product** equals the product of expectations only for uncorrelated variables (independence is enough).

Connects to: [linearity of expectation](#/concept/prob.random-variables.linearity-of-expectation), [variance and standard deviation](#/concept/prob.random-variables.variance-and-standard-deviation), [expected value of games](#/concept/prob.expected-value.expected-value-of-games).

### questions
Q: What is the expected value of a fair die, and of its square?
A: The mean face is 21 over 6, which is 3.5. The mean of the square is 91 over 6, about 15.17, which is more than 3.5 squared, 12.25, because squaring is convex.

Q: How do you compute E[g(X)] without finding the distribution of g(X)?
A: Sum g(x) times P(X equals x) over all values x, or integrate g(x) times the density for a continuous variable. This rule is often called the law of the unconscious statistician.

Q: What does Jensen's inequality say?
A: For a convex function g, the expectation of g(X) is at least g of the expectation of X, with equality only when g is linear on the variable's range or X is constant. For concave functions the inequality reverses.

Q: How can you compute the expectation of a non-negative integer random variable from its tail?
A: E[X] equals the sum over k from 1 of P(X at least k). For the number of rolls until the first six, the tail is five sixths to the power k minus 1, which sums to 6.

Q: Can an expected value be infinite?
A: Yes. In the St. Petersburg game, winning 2 to the k when the first head is on flip k, every term of the expectation contributes 1, so the sum diverges, although the typical winnings are small.

## prob.random-variables.linearity-of-expectation
name: "Linearity of expectation"
importance: must
prereqs: [prob.random-variables.expectation]
scope: "works even for dependent variables"

### simple
Linearity of expectation says the average of a sum is the sum of the averages, always. If you roll ten dice, the expected total is ten times 3.5, and this stays true even when the parts are tangled up with each other. It lets you break a hard counting question into many tiny ones and add up the answers.

### interview
- $E[X + Y] = E[X] + E[Y]$ and $E[aX + b] = aE[X] + b$, for **any** random variables with finite means: **no independence needed**.
- By induction, $E\left[\sum_i X_i\right] = \sum_i E[X_i]$ for any finite sum (and for infinite sums of non-negative terms).
- Contrast: $E[XY] = E[X]E[Y]$ needs uncorrelated variables, and $\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y)$ needs uncorrelated variables too.
- The standard trick: write a complicated count as a sum of simple pieces (usually indicators), take each piece's expectation, and add.
- Classics: the hat problem (expected matches is 1 for any $n$), empty boxes $n(1 - \frac{1}{n})^n$, the expected sum of cards drawn without replacement.
- Interview tell: "expected number of..." almost always means linearity.

### deep
#### Why it holds

For discrete variables, $E[X + Y] = \sum_{x,y} (x + y)\,p(x,y) = \sum_{x,y} x\,p(x,y) + \sum_{x,y} y\,p(x,y) = E[X] + E[Y]$. The joint probabilities $p(x, y)$ can encode any dependence, and it never matters: the sum splits before dependence has a chance to enter.

#### Worked examples

1. **Strongly dependent parts.** Roll a die: $X$ is the face, $Y = 7 - X$ is the face underneath. $E[X + Y] = 3.5 + 3.5 = 7$, and indeed $X + Y = 7$ always, although $Y$ is completely determined by $X$.
2. **The hat problem.** $n$ people take hats at random (a uniform random permutation). Person $i$ gets their own hat with probability $\frac{1}{n}$, so the expected number of matches is $n \cdot \frac{1}{n} = 1$, for every $n$. The matches are dependent (if $n - 1$ people match, so does the last), and it doesn't matter.
3. **Empty boxes.** Throw $n$ balls independently and uniformly into $n$ boxes. A given box stays empty with probability $(1 - \frac{1}{n})^n$, so $E[\text{empty}] = n(1 - \frac{1}{n})^n$; for $n = 10$ that is $10 \cdot 0.9^{10} \approx 3.4868$, and for large $n$ about $\frac{n}{e}$.
4. **Cards without replacement.** Draw 5 cards from ten cards numbered 1 to 10. Each draw alone is uniform on 1 to 10 (by symmetry), with mean 5.5, so the expected total is $5 \times 5.5 = 27.5$, although the draws are dependent.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long n = 1'000'000;
    const int people = 10;
    double matches = 0, empty = 0, total = 0;
    for (long t = 0; t < n; ++t) {
        int perm[people];
        iota(perm, perm + people, 0);
        for (int i = people - 1; i > 0; --i) swap(perm[i], perm[rng() % (i + 1)]);
        for (int i = 0; i < people; ++i) matches += perm[i] == i;
        bool used[10] = {};
        for (int b = 0; b < 10; ++b) used[rng() % 10] = true;
        for (bool u : used) empty += !u;
        int cards[10];
        iota(cards, cards + 10, 1);
        for (int i = 0; i < 5; ++i) {            // partial shuffle: 5 draws without replacement
            swap(cards[i], cards[i + rng() % (10 - i)]);
            total += cards[i];
        }
    }
    printf("hat matches (10 people):   exact 1.0000   simulated %.4f\n", matches / n);
    printf("empty boxes (10 into 10):  exact %.4f   simulated %.4f\n", 10 * pow(0.9, 10),
           empty / n);
    printf("sum of 5 of cards 1..10:   exact 27.5000  simulated %.4f\n", total / n);
}
```

Output:

```text
hat matches (10 people):   exact 1.0000   simulated 0.9999
empty boxes (10 into 10):  exact 3.4868   simulated 3.4853
sum of 5 of cards 1..10:   exact 27.5000  simulated 27.4998
```

All three estimates are within about 1.5 standard errors of the exact values; the largest gap is 0.0015 for the empty boxes, whose count has a standard deviation close to 1.

#### Where people go wrong

- **Believing dependence breaks it.** It doesn't; only products and variances care about dependence.
- **Computing the full distribution** of the count first. For expectations you rarely need it; for probabilities like "no matches at all" you do (that is $\approx \frac{1}{e}$ for the hat problem, found by inclusion-exclusion, not linearity).
- **Mixing up "expected number" and "probability of at least one"**: with 23 people the expected number of shared-birthday pairs is 0.69 but the probability of at least one is 0.507.

Connects to: [indicator variables](#/concept/prob.random-variables.indicator-variables), [expectation](#/concept/prob.random-variables.expectation), [variance and standard deviation](#/concept/prob.random-variables.variance-and-standard-deviation).

### questions
Q: Does linearity of expectation require independence?
A: No. The expectation of a sum is the sum of the expectations for any random variables with finite means, however they depend on each other. Independence or zero correlation is only needed for products and for adding variances.

Q: n people pick hats at random. What is the expected number who get their own hat?
A: One, for every n. Each person matches with probability 1 over n, and adding n such expectations gives 1, even though the matches are dependent.

Q: n balls are thrown into n boxes uniformly at random. How many boxes are expected to stay empty?
A: Each box stays empty with probability one minus 1 over n, to the power n, so the expected number is n times that, about n divided by e for large n; for 10 boxes it is about 3.49.

Q: What is the expected sum of 5 cards drawn without replacement from cards numbered 1 to 10?
A: Each drawn card on its own is equally likely to be any of the ten, so it has mean 5.5, and by linearity the expected sum is 27.5, despite the dependence between draws.

Q: Why is linearity so useful for counting problems?
A: A complicated count can be written as a sum of simple indicator variables whose expectations are just probabilities. Adding those probabilities gives the expected count without ever finding its distribution.

## prob.random-variables.indicator-variables
name: "Indicator variables"
importance: must
prereqs: [prob.random-variables.linearity-of-expectation]
scope: "counting expected matches, fixed points, runs"

### simple
An indicator variable is a switch that equals 1 when something happens and 0 when it doesn't, so its average is just the probability of that thing. To count how many things happen, you add up the switches. Then the expected count is simply the sum of the individual probabilities, which is usually easy to find.

### interview
- $I_A = 1$ if $A$ happens, else 0; $E[I_A] = P(A)$ and $\text{Var}(I_A) = P(A)(1 - P(A))$.
- **Counting recipe**: write the count as $X = \sum_i I_{A_i}$, so $E[X] = \sum_i P(A_i)$ by linearity; often all $P(A_i)$ are equal by symmetry.
- **Runs** in $n$ fair flips: a new run starts at flip 1 and at each flip that differs from the previous one, so $E = 1 + \frac{n-1}{2}$; 5.5 for 10 flips.
- **First ace**: each of the 48 non-aces comes before all four aces with probability $\frac{1}{5}$, so $E[\text{position}] = 1 + \frac{48}{5} = \frac{53}{5} = 10.6$.
- **Records** (values larger than all before) in a random order of $n$ distinct numbers: position $i$ is a record with probability $\frac{1}{i}$, so $E = H_n = 1 + \frac{1}{2} + \dots + \frac{1}{n}$.
- Pairs: the expected number of pairs with a property is $\binom{n}{2}$ times the probability for one pair (shared birthdays: $\binom{23}{2}/365 \approx 0.69$).

### deep
#### The method

1. Decide what you are counting.
2. Define one indicator per "thing that could be counted": a position, a person, a pair, a box.
3. Find $P$ for one indicator, using symmetry if they are alike.
4. Multiply by the number of indicators (or add their different probabilities).

Variances need more: $\text{Var}(\sum I_i) = \sum \text{Var}(I_i) + 2\sum_{i<j}\text{Cov}(I_i, I_j)$, and the covariances depend on how the events interact.

#### Worked example 1: runs in 10 flips

For HHTHHHTT the runs are HH, T, HHH, TT: 4 runs. Let $I_1 = 1$ (the first flip always starts a run) and, for $k = 2..10$, $I_k = 1$ if flip $k$ differs from flip $k-1$, which has probability $\frac{1}{2}$ for a fair coin with independent flips. So $E[\text{runs}] = 1 + 9 \cdot \frac{1}{2} = 5.5$.

#### Worked example 2: position of the first ace

Shuffle a deck. The first ace's position is 1 plus the number of non-aces before it. A particular non-ace (say the 7 of clubs) is before all four aces exactly when it comes first among itself and the four aces: probability $\frac{1}{5}$ by symmetry. With 48 non-aces,

$$E[\text{position}] = 1 + \frac{48}{5} = \frac{53}{5} = 10.6.$$

#### Worked example 3: records

In a random order of the numbers 1 to 10, position $i$ holds a new maximum exactly when it has the largest of the first $i$ values: probability $\frac{1}{i}$. So $E[\text{records}] = H_{10} = \frac{7381}{2520} \approx 2.929$. Even for a million numbers, only about 14.4 are records ($H_n \approx \ln n + 0.5772$).

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long n = 1'000'000;
    double runs = 0, firstAce = 0, records = 0, pairs = 0;
    for (long t = 0; t < n; ++t) {
        int prev = -1;
        for (int k = 0; k < 10; ++k) {           // runs in 10 flips
            int f = int(rng() & 1);
            runs += f != prev;
            prev = f;
        }
        int deck[52];                            // cards 0-3 are aces
        iota(deck, deck + 52, 0);
        int pos = 0;
        for (int i = 0; i < 52; ++i) {           // shuffle only as far as the first ace
            swap(deck[i], deck[i + rng() % (52 - i)]);
            if (deck[i] < 4) { pos = i + 1; break; }
        }
        firstAce += pos;
        int perm[10];
        iota(perm, perm + 10, 1);
        for (int i = 9; i > 0; --i) swap(perm[i], perm[rng() % (i + 1)]);
        int best = 0;
        for (int v : perm) if (v > best) { best = v; ++records; }
        int bday[23];
        for (int& b : bday) b = int(rng() % 365);
        for (int i = 0; i < 23; ++i)
            for (int j = i + 1; j < 23; ++j) pairs += bday[i] == bday[j];
    }
    double h10 = 0;
    for (int i = 1; i <= 10; ++i) h10 += 1.0 / i;
    printf("runs in 10 flips:          exact 5.5000   simulated %.4f\n", runs / n);
    printf("position of first ace:     exact 10.6000  simulated %.4f\n", firstAce / n);
    printf("records among 10:          exact %.4f   simulated %.4f\n", h10, records / n);
    printf("shared-birthday pairs, 23: exact %.4f   simulated %.4f\n", 253.0 / 365, pairs / n);
}
```

Output:

```text
runs in 10 flips:          exact 5.5000   simulated 5.4990
position of first ace:     exact 10.6000  simulated 10.5981
records among 10:          exact 2.9290   simulated 2.9299
shared-birthday pairs, 23: exact 0.6932   simulated 0.6923
```

All four estimates are within about one standard error of the exact values, which each took one line of reasoning.

#### Pitfalls

- **Indicators for the wrong things.** For the first ace, indicators over positions ("is position $k$ the first ace?") lead to a messy sum; indicators over non-aces are one line.
- **Expected count versus probability.** The expected number of shared-birthday pairs among 23 people is 0.69, but the probability of at least one pair is 0.507; indicators give the first directly, not the second.
- **Assuming independence for the variance.** The run indicators happen to be pairwise independent for a fair coin; birthday-pair indicators that share a person are pairwise independent too, but match indicators in the hat problem are not.

Connects to: [linearity of expectation](#/concept/prob.random-variables.linearity-of-expectation), [symmetry arguments](#/concept/prob.foundations.symmetry-arguments), [birthday problem](#/concept/puzzles.probability.birthday-problem).

### questions
Q: What is the expected value of an indicator variable?
A: The probability of its event, since it is 1 with that probability and 0 otherwise. Its variance is p times one minus p.

Q: What is the expected number of runs in 10 fair coin flips?
A: 5.5. The first flip starts a run, and each of the other nine flips starts a new run when it differs from the previous flip, which happens with probability one half.

Q: In a shuffled deck, what is the expected position of the first ace?
A: 53 over 5, which is 10.6. Each of the 48 non-aces comes before all four aces with probability one fifth, so on average 9.6 non-aces precede the first ace.

Q: What is the expected number of records in a random ordering of n distinct numbers?
A: The harmonic number H(n), because position i is a record exactly when it holds the largest of the first i values, which has probability 1 over i.

Q: How many pairs of people are expected to share a birthday among 23 people?
A: There are 253 pairs and each shares a birthday with probability 1 in 365, assuming 365 equally likely birthdays, so about 0.69 pairs.

## prob.random-variables.variance-and-standard-deviation
name: "Variance and standard deviation"
importance: must
prereqs: [prob.random-variables.expectation]
scope: "definition, variance of sums"

### simple
Variance measures how spread out a random quantity is around its average, and the standard deviation is its square root, back in the original units. Two games can both pay 10 on average, one always paying exactly 10 and the other paying 0 or 20 at random; the second has a large variance. Risk, noise and uncertainty in quant work are all measured this way.

### interview
- $\text{Var}(X) = E[(X - \mu)^2] = E[X^2] - (E[X])^2$; standard deviation $\sigma = \sqrt{\text{Var}(X)}$, in the units of $X$.
- $\text{Var}(aX + b) = a^2\,\text{Var}(X)$: shifting changes nothing, scaling multiplies by the square.
- **Sums**: $\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\,\text{Cov}(X, Y)$; add variances (not standard deviations) only for uncorrelated variables.
- Averages of $n$ independent copies: $\text{Var}(\bar{X}) = \frac{\sigma^2}{n}$, so the standard deviation shrinks like $\frac{1}{\sqrt{n}}$, the reason simulations need 100 times more trials for one more digit.
- Reference values: fair die $\frac{35}{12}$; Bernoulli $p(1-p)$; binomial $np(1-p)$; Uniform(0,1) $\frac{1}{12}$; exponential with rate $\lambda$: $\frac{1}{\lambda^2}$.
- Pitfall: $\text{Var}(2X) = 4\text{Var}(X)$, not $\text{Var}(X + X') = 2\text{Var}(X)$ for an independent copy $X'$; doubling one bet is riskier than making two independent bets.

### deep
#### Intuition

Variance is the average squared distance from the mean. Squaring keeps negative and positive deviations from cancelling and weights big misses heavily; the standard deviation undoes the squaring so the number is back in rupees, metres or points.

#### Worked example: dice

For one fair die, $E[X] = \frac{7}{2}$ and $E[X^2] = \frac{91}{6}$, so

$$\text{Var}(X) = \frac{91}{6} - \frac{49}{4} = \frac{182 - 147}{12} = \frac{35}{12} \approx 2.917, \qquad \sigma \approx 1.708.$$

For the sum of 10 independent dice, variances add: $10 \cdot \frac{35}{12} = \frac{175}{6} \approx 29.17$ ($\sigma \approx 5.40$). For their average, divide by $10^2$: $\frac{175/6}{100} = \frac{7}{24} \approx 0.2917$, which is $\frac{35}{12}$ divided by 10.

#### Worked example: one big bet versus two small ones

Bet A: roll one die and receive twice its face, $2X$: variance $4 \cdot \frac{35}{12} = \frac{35}{3} \approx 11.67$. Bet B: roll two independent dice and receive their sum, $X + X'$: variance $2 \cdot \frac{35}{12} = \frac{35}{6} \approx 5.83$. Both have mean 7; B has half the variance. This is diversification in one line.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

struct Stats {                                   // running mean and variance (Welford)
    long n = 0;
    double mean = 0, m2 = 0;
    void add(double x) {
        ++n;
        double d = x - mean;
        mean += d / n;
        m2 += d * (x - mean);
    }
    double var() const { return m2 / (n - 1); }
};

int main() {
    auto die = [] { return double(rng() % 6 + 1); };
    Stats one, sum10, avg10, twice, twoDice;
    for (long t = 0; t < 1'000'000; ++t) {
        double x = die();
        one.add(x);
        double s = 0;
        for (int i = 0; i < 10; ++i) s += die();
        sum10.add(s);
        avg10.add(s / 10);
        twice.add(2 * die());
        twoDice.add(die() + die());
    }
    auto line = [](const char* what, double exact, const Stats& st) {
        printf("%-18s exact %8.4f  simulated %8.4f  (%+.2f%%)\n", what, exact, st.var(),
               100 * (st.var() - exact) / exact);
    };
    line("one die", 35.0 / 12, one);
    line("sum of 10 dice", 175.0 / 6, sum10);
    line("average of 10", 7.0 / 24, avg10);
    line("twice one die", 35.0 / 3, twice);
    line("two dice", 35.0 / 6, twoDice);
}
```

Output:

```text
one die            exact   2.9167  simulated   2.9145  (-0.07%)
sum of 10 dice     exact  29.1667  simulated  29.0964  (-0.24%)
average of 10      exact   0.2917  simulated   0.2910  (-0.24%)
twice one die      exact  11.6667  simulated  11.6448  (-0.19%)
two dice           exact   5.8333  simulated   5.8318  (-0.03%)
```

Every estimate is within 0.25% of the exact variance. From a million values, the relative standard error of an estimated variance is about 0.1% to 0.15% for these distributions, so gaps of this size are ordinary. The program uses Welford's running update, which avoids the cancellation that $E[X^2] - (E[X])^2$ suffers when the mean is large compared with the spread; dividing by $n - 1$ makes the sample variance unbiased (see [sampling and estimators](#/concept/prob.statistics.sampling-and-estimators)).

#### Common mistakes

- **Adding standard deviations.** For independent variables, variances add; standard deviations add only for perfectly correlated ones.
- **Forgetting the square on scaling.** $\text{Var}(-X) = \text{Var}(X)$ and $\text{Var}(3X) = 9\,\text{Var}(X)$.
- **Dropping covariance.** Two positions in the same stock are not independent; see [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation).
- **The naive one-pass formula** $\frac{\sum x^2}{n} - \bar{x}^2$ in floating point can even go negative for data like prices around 10,000 with tiny changes.

Connects to: [expectation](#/concept/prob.random-variables.expectation), [central limit theorem](#/concept/prob.limits.central-limit-theorem), [diversification and correlation](#/concept/markets.pricing.diversification-and-correlation).

### questions
Q: What are the two formulas for variance?
A: The expected squared distance from the mean, E of X minus mu squared, and the equivalent shortcut, the mean of X squared minus the square of the mean. The standard deviation is the square root and is in the same units as X.

Q: What is the variance of a fair die?
A: 35 over 12, about 2.92: the mean of the squares is 91 over 6 and the square of the mean is 12.25.

Q: How does variance behave under scaling and shifting?
A: Adding a constant leaves it unchanged, and multiplying by a constant a multiplies it by a squared, so the standard deviation is multiplied by the absolute value of a.

Q: Is betting twice as much on one die roll as risky as making two independent bets?
A: No. Doubling one bet multiplies the variance by 4, while two independent bets add their variances, doubling it, so the single doubled bet has twice the variance of the two independent ones for the same mean.

Q: How does the variance of an average of n independent observations behave?
A: It is the single-observation variance divided by n, so the standard deviation of the average shrinks like 1 over the square root of n. Halving the error needs four times as many observations.

## prob.random-variables.covariance-and-correlation
name: "Covariance and correlation"
importance: must
prereqs: [prob.random-variables.variance-and-standard-deviation]
scope: "meaning, properties, correlation vs independence"

### simple
Covariance and correlation measure whether two random quantities tend to move together. Ice cream sales and temperature rise together (positive), umbrella sales and sunshine move oppositely (negative). Correlation is covariance rescaled to lie between −1 and 1, and it only captures straight-line relationships.

### interview
- $\text{Cov}(X, Y) = E[(X - \mu_X)(Y - \mu_Y)] = E[XY] - E[X]E[Y]$; $\text{Cov}(X, X) = \text{Var}(X)$.
- **Correlation** $\rho = \frac{\text{Cov}(X, Y)}{\sigma_X \sigma_Y} \in [-1, 1]$; $|\rho| = 1$ exactly when $Y = aX + b$ with probability 1.
- **Bilinear**: $\text{Cov}(aX + b, cY + d) = ac\,\text{Cov}(X, Y)$; $\text{Cov}(X + Y, Z) = \text{Cov}(X, Z) + \text{Cov}(Y, Z)$.
- **Independent ⇒ uncorrelated**, but not conversely: $X$ uniform on $[-1, 1]$ and $Y = X^2$ have zero correlation although $Y$ is a function of $X$. (For jointly normal variables, uncorrelated does imply independent.)
- Variance of a sum uses it: $\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X, Y)$; for a portfolio, $\text{Var}(w^\top R) = w^\top \Sigma w$.
- Correlation is not causation, and it is sensitive to outliers and to non-linear relationships.

### deep
#### Intuition

The product $(X - \mu_X)(Y - \mu_Y)$ is positive when both are above or both below their means, negative when they disagree. Covariance averages it; correlation divides out the units so the number is comparable across pairs.

#### Worked example: a die and a sum

Let $X$ be the first die and $S = X + Y$ the sum with an independent second die $Y$. By bilinearity and independence,

$$\text{Cov}(X, S) = \text{Cov}(X, X) + \text{Cov}(X, Y) = \frac{35}{12} + 0 = \frac{35}{12}.$$

With $\text{Var}(S) = \frac{35}{6}$, the correlation is $\rho = \frac{35/12}{\sqrt{35/12}\sqrt{35/6}} = \frac{1}{\sqrt{2}} \approx 0.7071$. And $X$ against $X - Y$ also gives $\frac{1}{\sqrt 2}$, while $S$ and $X - Y$ are uncorrelated: $\text{Cov}(X + Y, X - Y) = \text{Var}(X) - \text{Var}(Y) = 0$. They are nevertheless dependent: if $S = 12$ then $X - Y$ must be 0.

#### Worked example: zero correlation, full dependence

Take $X$ uniform on $[-1, 1]$ and $Y = X^2$. Then $E[X] = 0$ and $E[XY] = E[X^3] = 0$ by symmetry, so $\text{Cov}(X, Y) = 0$. Yet knowing $X$ determines $Y$ exactly. Correlation only detects the linear part of a relationship.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

struct Pairs {                                   // sums needed for correlation
    double n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    void add(double x, double y) {
        n += 1, sx += x, sy += y, sxx += x * x, syy += y * y, sxy += x * y;
    }
    double cov() const { return (sxy - sx * sy / n) / (n - 1); }
    double corr() const {
        return (sxy - sx * sy / n) / sqrt((sxx - sx * sx / n) * (syy - sy * sy / n));
    }
};

int main() {
    Pairs xs, sd, sq;
    for (long t = 0; t < 1'000'000; ++t) {
        double x = double(rng() % 6 + 1), y = double(rng() % 6 + 1);
        xs.add(x, x + y);
        sd.add(x + y, x - y);
        double u = 2 * u01() - 1;
        sq.add(u, u * u);
    }
    printf("Cov(X, S):       exact %.4f  simulated %.4f\n", 35.0 / 12, xs.cov());
    printf("Corr(X, S):      exact %.4f  simulated %.4f\n", 1 / sqrt(2.0), xs.corr());
    printf("Corr(S, X - Y):  exact %.4f  simulated %.4f\n", 0.0, sd.corr());
    printf("Corr(U, U^2):    exact %.4f  simulated %.4f\n", 0.0, sq.corr());
}
```

Output:

```text
Cov(X, S):       exact 2.9167  simulated 2.9129
Corr(X, S):      exact 0.7071  simulated 0.7068
Corr(S, X - Y):  exact 0.0000  simulated -0.0008
Corr(U, U^2):    exact 0.0000  simulated -0.0003
```

The estimates are within about one standard error of the exact values: the covariance of 2.9129 against $\frac{35}{12} \approx 2.9167$ has a standard error near 0.004, and the correlations have standard errors near 0.0005 to 0.001. (The single-pass sums are fine here because the values are small; for large values with small spread, center them first or use a Welford-style update.)

#### Pitfalls

- **Reading zero correlation as independence.** $S$ and $X - Y$, or $U$ and $U^2$, are uncorrelated but dependent.
- **Outliers**: one extreme point can create or destroy a correlation; rank correlation (Spearman) is more robust.
- **Correlation is not a slope**: the regression slope of $Y$ on $X$ is $\rho\frac{\sigma_Y}{\sigma_X}$.
- **Unstable estimates**: financial correlations change over time and jump toward 1 in crises, exactly when diversification is needed.

Connects to: [variance and standard deviation](#/concept/prob.random-variables.variance-and-standard-deviation), [covariance matrices](#/concept/math.linear-algebra.covariance-matrices), [correlation vs causation](#/concept/prob.statistics.correlation-vs-causation), [linear regression](#/concept/prob.learning.linear-regression).

### questions
Q: What is the difference between covariance and correlation?
A: Covariance measures how two variables move together in their own units, so its size depends on scale. Correlation divides by both standard deviations, giving a unitless number between minus 1 and 1 that is comparable across pairs.

Q: Does zero correlation imply independence?
A: No. If X is uniform on minus 1 to 1 and Y is X squared, the covariance is zero by symmetry, yet Y is completely determined by X. Zero correlation only rules out a linear relationship; for jointly normal variables it does imply independence.

Q: What is the correlation between the first die and the sum of two independent dice?
A: The covariance is the first die's variance, 35 over 12, and the sum's variance is twice that, so the correlation is 1 over the square root of 2, about 0.71.

Q: How does covariance enter the variance of a sum?
A: The variance of X plus Y is the variance of X plus the variance of Y plus twice their covariance. Positively correlated positions add risk faster than independent ones, and negatively correlated ones partly cancel.

Q: When is the correlation exactly 1 or minus 1?
A: Exactly when one variable is a linear function of the other with probability 1, with a positive slope for 1 and a negative slope for minus 1.

## prob.random-variables.moments-and-moment-generating-functions
name: "Moments and moment generating functions"
importance: important
prereqs: [prob.random-variables.variance-and-standard-deviation]
scope: "Moments and moment generating functions"

### simple
Moments are the averages of powers of a random quantity: the first is the mean, the second (around the mean) is the variance, and higher ones describe lopsidedness and heavy tails. A moment generating function packs all the moments into one formula, the way a recipe card packs a whole dish. Its best trick is that adding independent quantities multiplies their generating functions.

### interview
- The $k$-th **moment** is $E[X^k]$; the $k$-th **central moment** is $E[(X - \mu)^k]$. Variance is the second central moment.
- **Skewness** $E[(X-\mu)^3]/\sigma^3$ measures asymmetry (exponential: 2); **kurtosis** $E[(X-\mu)^4]/\sigma^4$ measures tail weight (normal: 3; "excess kurtosis" subtracts 3).
- **MGF**: $M_X(t) = E[e^{tX}]$, when finite near $t = 0$. Then $E[X^k] = M_X^{(k)}(0)$.
- **Sums of independent variables**: $M_{X+Y}(t) = M_X(t)\,M_Y(t)$; this proves that sums of independent Poissons are Poisson and sums of independent normals are normal.
- **Uniqueness**: if two MGFs agree on an interval around 0, the distributions are equal.
- Some distributions have no MGF (lognormal, Cauchy, heavy power-law tails); the characteristic function $E[e^{itX}]$ always exists.

### deep
#### Standard MGFs

| distribution | $M(t)$ | mean, variance |
|---|---|---|
| Bernoulli($p$) | $1 - p + pe^t$ | $p$, $p(1-p)$ |
| Binomial($n, p$) | $(1 - p + pe^t)^n$ | $np$, $np(1-p)$ |
| Poisson($\lambda$) | $e^{\lambda(e^t - 1)}$ | $\lambda$, $\lambda$ |
| Exponential($\lambda$) | $\frac{\lambda}{\lambda - t}$ for $t < \lambda$ | $\frac{1}{\lambda}$, $\frac{1}{\lambda^2}$ |
| Normal($\mu, \sigma^2$) | $e^{\mu t + \sigma^2 t^2 / 2}$ | $\mu$, $\sigma^2$ |

The binomial row follows from the Bernoulli one by the product rule for sums: $n$ independent Bernoulli trials multiply $n$ identical MGFs.

#### Worked example: moments from a die's MGF

$M(t) = \frac{1}{6}\sum_{k=1}^6 e^{tk}$. Differentiating, $M'(0) = \frac{1}{6}\sum k = 3.5$ and $M''(0) = \frac{1}{6}\sum k^2 = \frac{91}{6}$, the mean and second moment found directly in [expectation](#/concept/prob.random-variables.expectation).

#### Worked example: sums of Poissons

If $X \sim$ Poisson($\lambda$) and $Y \sim$ Poisson($\mu$) are independent, $M_{X+Y}(t) = e^{\lambda(e^t - 1)}e^{\mu(e^t - 1)} = e^{(\lambda + \mu)(e^t - 1)}$, the MGF of Poisson($\lambda + \mu$). By uniqueness, $X + Y \sim$ Poisson($\lambda + \mu$).

#### Code: derivatives and a simulated MGF

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int poisson(double lambda) {                     // Knuth's method: multiply uniforms
    double limit = exp(-lambda), prod = u01();
    int k = 0;
    while (prod > limit) { prod *= u01(); ++k; }
    return k;
}

int main() {
    auto M = [](double t) {                      // the die's MGF
        double s = 0;
        for (int k = 1; k <= 6; ++k) s += exp(t * k) / 6;
        return s;
    };
    double h = 1e-4;
    printf("die: M'(0) ~ %.4f (exact 3.5), M''(0) ~ %.4f (exact %.4f)\n",
           (M(h) - M(-h)) / (2 * h), (M(h) - 2 * M(0) + M(-h)) / (h * h), 91.0 / 6);

    const long n = 1'000'000;
    const double t = 0.5;
    double sumE = 0;
    long hist[40] = {};
    for (long i = 0; i < n; ++i) {
        int x = poisson(1.5), y = poisson(2.5);
        sumE += exp(t * x);
        ++hist[min(x + y, 39)];
    }
    printf("Poisson(1.5): E[e^(0.5X)] exact %.4f, simulated %.4f\n", exp(1.5 * (exp(t) - 1)),
           sumE / n);
    printf(" k  P(X+Y=k) for Poisson(4)  simulated\n");
    double p = exp(-4.0);
    for (int k = 0; k <= 8; ++k, p *= 4.0 / k)
        printf("%2d  %.5f                  %.5f\n", k, p, double(hist[k]) / n);
}
```

Output:

```text
die: M'(0) ~ 3.5000 (exact 3.5), M''(0) ~ 15.1667 (exact 15.1667)
Poisson(1.5): E[e^(0.5X)] exact 2.6461, simulated 2.6467
 k  P(X+Y=k) for Poisson(4)  simulated
 0  0.01832                  0.01843
 1  0.07326                  0.07323
 2  0.14653                  0.14620
 3  0.19537                  0.19587
 4  0.19537                  0.19570
 5  0.15629                  0.15612
 6  0.10420                  0.10372
 7  0.05954                  0.05957
 8  0.02977                  0.02972
```

The finite-difference derivatives reproduce 3.5 and $\frac{91}{6}$ to four decimals. The simulated $E[e^{0.5X}]$ is 0.0006 from the exact $e^{1.5(e^{0.5}-1)}$, a quarter of a standard error, and the histogram of $X + Y$ matches the Poisson(4) probabilities to within about 1.3 standard errors at every $k$.

#### When MGFs fail

The lognormal distribution has all moments finite but $E[e^{tX}] = \infty$ for every $t > 0$, and its moments do not determine it uniquely. Heavy-tailed returns (power laws) may not even have a finite variance. In those cases work with the CDF, quantiles or the characteristic function. The MGF also underlies the Chernoff bound, $P(X \ge a) \le e^{-ta}M(t)$, a sharper cousin of [Markov and Chebyshev](#/concept/prob.limits.markov-and-chebyshev-inequalities).

Connects to: [sums of random variables](#/concept/prob.distributions.sums-of-random-variables), [Poisson distribution](#/concept/prob.distributions.poisson-distribution), [central limit theorem](#/concept/prob.limits.central-limit-theorem).

### questions
Q: What is a moment generating function and how do you get moments from it?
A: It is the expectation of e to the power t times X, viewed as a function of t near zero. Its k-th derivative at t equals zero is the k-th moment, so the first derivative gives the mean and the second gives E of X squared.

Q: Why are MGFs useful for sums of independent random variables?
A: The MGF of a sum of independent variables is the product of their MGFs. Recognizing the product as a known MGF identifies the distribution of the sum, for example two independent Poissons summing to a Poisson with the added rate.

Q: What do skewness and kurtosis measure?
A: Skewness is the third central moment divided by sigma cubed and measures asymmetry. Kurtosis is the fourth central moment divided by sigma to the fourth and measures how heavy the tails are; the normal distribution has kurtosis 3.

Q: Does every distribution have a moment generating function?
A: No. The lognormal and Cauchy distributions, and many heavy-tailed ones, have infinite E of e to the tX for every positive t. The characteristic function, which uses an imaginary exponent, always exists instead.

Q: What does the uniqueness theorem for MGFs say?
A: If two random variables have MGFs that exist and agree on an open interval around zero, they have the same distribution. That is what lets you identify a distribution from its MGF.
