---
topic: prob.expected-value
name: "Conditional expectation and expected-value problems"
subject: prob
order: 4
prereqs: [prob.random-variables]
---

## prob.expected-value.conditional-expectation
name: "Conditional expectation"
importance: must
scope: "E[X | Y], law of total expectation"

### simple
Conditional expectation is the average of something once you know part of the story. If you roll a die and then flip that many coins, the expected number of heads depends on the roll: half of it. Averaging those "given the roll" answers over all possible rolls gives the overall average, which is often the easiest way to compute it.

### interview
- $E[X \mid Y = y] = \sum_x x\,P(X = x \mid Y = y)$: the average of $X$ within the world where $Y = y$.
- $E[X \mid Y]$ is a **random variable**, a function of $Y$: plug in the realized $Y$.
- **Law of total expectation** (tower rule): $E[X] = E[E[X \mid Y]] = \sum_y E[X \mid Y = y]P(Y = y)$.
- Properties: $E[g(Y)X \mid Y] = g(Y)E[X \mid Y]$ ("take out what is known"); if $X$ and $Y$ are independent, $E[X \mid Y] = E[X]$.
- **Random sums** (Wald): if $N$ is independent of i.i.d. $X_i$, $E\left[\sum_{i=1}^N X_i\right] = E[N]\,E[X]$.
- Interview pattern: condition on the first step, the first roll or the unknown parameter, solve each case, then average.

### deep
#### Intuition

Conditioning splits the world into cases. Inside each case the question is easier; the law of total expectation stitches the cases back together, weighting each by its probability. It is the expectation version of the [law of total probability](#/concept/prob.foundations.law-of-total-probability).

#### Worked example 1: a die, then coins

Roll a fair die to get $N$, then flip $N$ fair coins. Given $N = n$, the number of heads $H$ is Binomial($n, \frac{1}{2}$), so $E[H \mid N] = \frac{N}{2}$. Then

$$E[H] = E\left[\frac{N}{2}\right] = \frac{3.5}{2} = 1.75.$$

#### Worked example 2: a random number of dice

Roll a die to get $N$, then roll $N$ more dice and add them. Given $N$, the total has mean $3.5N$, so $E[\text{total}] = 3.5 \cdot E[N] = 12.25$ (Wald's identity, which needs $N$ independent of the dice being added).

#### Worked example 3: conditioning on an event

For one die, $E[X \mid X > 3] = \frac{4 + 5 + 6}{3} = 5$ and $E[X \mid X \le 3] = 2$. The law checks out: $5 \cdot \frac{1}{2} + 2 \cdot \frac{1}{2} = 3.5$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
int die() { return int(rng() % 6) + 1; }

int main() {
    const long n = 2'000'000;
    double heads = 0, total = 0, highSum = 0;
    long highCount = 0;
    double byN[7] = {}, countN[7] = {};
    for (long t = 0; t < n; ++t) {
        int k = die(), h = 0;
        for (int i = 0; i < k; ++i) h += rng() & 1;
        heads += h;
        byN[k] += h, countN[k] += 1;
        int m = die();
        for (int i = 0; i < m; ++i) total += die();
        int x = die();
        if (x > 3) { highSum += x; ++highCount; }
    }
    printf("E[H | N = n] for n = 1..6:");
    for (int k = 1; k <= 6; ++k) printf(" %.3f", byN[k] / countN[k]);
    printf("  (exact n/2)\n");
    printf("E[H]:            exact 1.7500  simulated %.4f\n", heads / n);
    printf("E[random sum]:   exact 12.2500 simulated %.4f\n", total / n);
    printf("E[X | X > 3]:    exact 5.0000  simulated %.4f\n", highSum / highCount);
}
```

Output:

```text
E[H | N = n] for n = 1..6: 0.499 0.999 1.501 2.001 2.500 3.002  (exact n/2)
E[H]:            exact 1.7500  simulated 1.7499
E[random sum]:   exact 12.2500 simulated 12.2541
E[X | X > 3]:    exact 5.0000  simulated 4.9990
```

Every conditional mean $E[H \mid N = n]$ sits within 0.002 of $\frac{n}{2}$, and the three overall answers are within about one standard error of 1.75, 12.25 and 5.

#### Pitfalls

- **Conditioning on the wrong information**: $E[X \mid Y]$ must use exactly what is known; "given at least one six" and "given the first die is a six" are different conditions.
- **Wald's identity needs independence** of $N$ from the summands (or a stopping-time argument); if you stop adding dice the moment you see a 6, the terms are not independent of $N$.
- **$E[X \mid Y]$ is not $E[X]$ in general**: it varies with $Y$, and its variability is the "explained" part of the [law of total variance](#/concept/prob.expected-value.law-of-total-variance).

Connects to: [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [law of total variance](#/concept/prob.expected-value.law-of-total-variance), [martingales](#/concept/prob.stochastic.martingales).

### questions
Q: What is the law of total expectation?
A: The expectation of X equals the expectation of the conditional expectation of X given Y: average the case-by-case means, each weighted by the probability of its case. It lets you break an expectation into easier conditional pieces.

Q: You roll a die and then flip that many fair coins. What is the expected number of heads?
A: 1.75. Given the roll n, the expected number of heads is n over 2, and averaging over the roll gives 3.5 over 2.

Q: What does Wald's identity say?
A: If N is a non-negative integer random variable independent of identically distributed X1, X2 and so on, the expected sum of the first N terms is E[N] times E[X]. Rolling a die and then that many dice gives an expected total of 3.5 times 3.5, which is 12.25.

Q: Why is E[X given Y] called a random variable?
A: Its value depends on the value of Y, which is random: it is a function of Y that gives the conditional mean for each possible value. Its own expectation is E[X].

Q: What is E[X given X greater than 3] for a fair die?
A: 5, the average of 4, 5 and 6. Together with E[X given X at most 3], which is 2, weighted equally, it reproduces the overall mean 3.5.

## prob.expected-value.law-of-total-variance
name: "Law of total variance"
importance: important
prereqs: [prob.expected-value.conditional-expectation]
scope: "Law of total variance"

### simple
The law of total variance splits the uncertainty in a quantity into two parts: how much it varies within each case, and how much the case averages differ from each other. For exam scores across several schools, total spread comes from spread inside each school plus the differences between school averages. It is how analysts say how much of the variation a factor "explains".

### interview
- $\text{Var}(X) = E[\text{Var}(X \mid Y)] + \text{Var}(E[X \mid Y])$: **within-group** plus **between-group** variance (sometimes called Eve's law).
- The second term is the part "explained" by $Y$; their ratio to $\text{Var}(X)$ is the idea behind $R^2$.
- **Random sums**: for $S = \sum_{i=1}^N X_i$ with $N$ independent of i.i.d. $X_i$: $\text{Var}(S) = E[N]\,\text{Var}(X) + \text{Var}(N)\,(E[X])^2$.
- Mixtures: a variable drawn from a mixture of groups has more variance than the average group variance, because the group means differ.
- It pairs with the law of total expectation: condition, compute each case's mean and variance, then combine.
- Pitfall: forgetting the between-group term and treating a mixture as if it had the average within-group variance.

### deep
#### Intuition

Picture the data as clusters. Each cluster has its own spread (within) and its own center; the centers are themselves spread out (between). Total spread is the sum, exactly as the formula says, because the cross terms average to zero.

#### Worked example 1: die, then coins

Roll a die ($N$) and flip $N$ coins; $H$ counts heads. Given $N$: mean $\frac{N}{2}$, variance $\frac{N}{4}$. So

$$\text{Var}(H) = E\left[\frac{N}{4}\right] + \text{Var}\left(\frac{N}{2}\right) = \frac{3.5}{4} + \frac{35/12}{4} = \frac{7}{8} + \frac{35}{48} = \frac{77}{48} \approx 1.6042.$$

#### Worked example 2: a random number of dice

Roll a die for $N$, then add $N$ dice. With $E[N] = 3.5$, $\text{Var}(N) = \frac{35}{12}$, $E[X] = 3.5$, $\text{Var}(X) = \frac{35}{12}$:

$$\text{Var}(S) = 3.5 \cdot \frac{35}{12} + \frac{35}{12} \cdot 3.5^2 = \frac{245}{24} + \frac{1715}{48} = \frac{2205}{48} = 45.9375.$$

Most of the variance (35.73 of 45.94) comes from not knowing how many dice will be rolled, not from the dice themselves.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
int die() { return int(rng() % 6) + 1; }

struct Stats {                                   // Welford's running mean and variance
    long n = 0;
    double mean = 0, m2 = 0;
    void add(double x) { ++n; double d = x - mean; mean += d / n; m2 += d * (x - mean); }
    double var() const { return m2 / (n - 1); }
};

int main() {
    Stats heads, sums, within[7];
    for (long t = 0; t < 2'000'000; ++t) {
        int k = die(), h = 0;
        for (int i = 0; i < k; ++i) h += rng() & 1;
        heads.add(h);
        within[k].add(h);
        int m = die();
        double s = 0;
        for (int i = 0; i < m; ++i) s += die();
        sums.add(s);
    }
    double avgWithin = 0, betweenMean = 0, between2 = 0;
    for (int k = 1; k <= 6; ++k) {
        avgWithin += within[k].var() / 6;
        betweenMean += within[k].mean / 6;
        between2 += within[k].mean * within[k].mean / 6;
    }
    printf("Var(H): exact %.4f  simulated %.4f\n", 77.0 / 48, heads.var());
    printf("  within %.4f (exact 0.8750) + between %.4f (exact 0.7292)\n", avgWithin,
           between2 - betweenMean * betweenMean);
    printf("Var(random sum): exact %.4f  simulated %.4f\n", 2205.0 / 48, sums.var());
}
```

Output:

```text
Var(H): exact 1.6042  simulated 1.6042
  within 0.8760 (exact 0.8750) + between 0.7285 (exact 0.7292)
Var(random sum): exact 45.9375  simulated 45.9173
```

The simulated total matches $\frac{77}{48}$ to four decimals, and its two parts, computed separately from the six groups, come out at 0.8760 and 0.7285 against 0.875 and 0.7292. The random-sum variance is within 0.05% of 45.9375, well inside what 2 million samples allow.

#### Where it is used

- **Regression and ANOVA**: explained variance over total variance is $R^2$.
- **Insurance and operations**: total claims are a random sum; uncertainty in the number of claims often dominates.
- **Hierarchical models**: players' batting averages vary because of luck (within) and skill differences (between); estimating the between part is how shrinkage estimators work.

Connects to: [conditional expectation](#/concept/prob.expected-value.conditional-expectation), [variance and standard deviation](#/concept/prob.random-variables.variance-and-standard-deviation), [linear regression](#/concept/prob.learning.linear-regression).

### questions
Q: State the law of total variance.
A: The variance of X equals the expected conditional variance of X given Y plus the variance of the conditional mean of X given Y: the average spread within groups plus the spread between group means.

Q: You roll a die and flip that many coins. What is the variance of the number of heads?
A: The expected within-roll variance is 3.5 over 4 and the variance of the conditional mean N over 2 is 35 over 12 divided by 4, giving 77 over 48, about 1.60.

Q: What is the variance of a random sum of N independent identical variables?
A: E[N] times Var(X) plus Var(N) times E[X] squared, assuming N is independent of the terms. The second part is the uncertainty contributed by not knowing how many terms there are.

Q: Why does a mixture of groups have more variance than the average group variance?
A: Because the group means differ, and that between-group variation adds to the within-group variation. Treating mixed data as if it came from one group with the average within-group variance underestimates the spread.

Q: How does the law of total variance relate to R squared?
A: The variance of the conditional mean is the part of the variance explained by the conditioning variable; dividing it by the total variance gives the fraction explained, which is the idea behind R squared in regression.

## prob.expected-value.first-step-analysis
name: "First-step analysis"
importance: must
prereqs: [prob.expected-value.conditional-expectation]
scope: "setting up equations over states"

### simple
First-step analysis solves "how long until" and "what is the chance that" questions by looking at what can happen on the very next move. Each possible first move leads to a situation you describe with its own unknown, and that gives a few simple equations. It is like planning a route by asking, at each crossing, where each road leads next.

### interview
- Define the **states** that capture everything relevant (for coin patterns: how much of the pattern you have matched so far).
- For each state $s$, write one equation by conditioning on the next step: $E_s = 1 + \sum_{s'} P(s \to s')E_{s'}$ for expected steps, or $p_s = \sum_{s'} P(s \to s')p_{s'}$ for hitting probabilities, with boundary values at absorbing states.
- Solve the small linear system (by substitution in interviews, Gaussian elimination in code).
- Classic results: HH takes 6 flips on average, HT takes 4; a sum of 7 comes before a sum of 6 with probability $\frac{6}{11}$; gambler's ruin probabilities are linear in the starting stake.
- It relies on the **Markov property**: once you are in a state, the past doesn't matter. If it does, add more to the state.
- Sanity checks: probabilities between 0 and 1, expectations at least 1 where a step is needed.

### deep
#### Worked example 1: two heads in a row

States: $S_0$ (no progress, or just saw T) and $S_1$ (just saw one H). Let $a$ and $b$ be the expected flips still needed from each.

- From $S_0$: flip once; H moves to $S_1$, T stays at $S_0$: $a = 1 + \frac{1}{2}b + \frac{1}{2}a$.
- From $S_1$: flip once; H finishes, T returns to $S_0$: $b = 1 + \frac{1}{2}\cdot 0 + \frac{1}{2}a$.

Substituting, $a = 1 + \frac{1}{2}(1 + \frac{a}{2}) + \frac{a}{2}$, so $\frac{a}{4} = \frac{3}{2}$ and $a = 6$, $b = 4$.

#### Worked example 2: 7 before 6

Roll two dice repeatedly. Which comes first, a total of 7 (probability $\frac{6}{36}$ per roll) or a total of 6 ($\frac{5}{36}$)? Let $p$ be the probability that 7 comes first. A roll either decides it or leaves you where you started:

$$p = \frac{6}{36} + \left(1 - \frac{11}{36}\right)p \quad\Rightarrow\quad p = \frac{6/36}{11/36} = \frac{6}{11} \approx 0.5455.$$

The irrelevant rolls drop out: only the relative chances of the two deciding events matter.

#### Worked example 3: a three-state chain

A process moves between states 1, 2 and 3 (absorbing). From 1: to 2 with probability $\frac{1}{2}$, stays with $\frac{1}{2}$. From 2: to 3 with $\frac{1}{3}$, back to 1 with $\frac{1}{3}$, stays with $\frac{1}{3}$. Expected steps to absorption $m_1, m_2$:

$$m_1 = 1 + \tfrac{1}{2}m_1 + \tfrac{1}{2}m_2, \qquad m_2 = 1 + \tfrac{1}{3}m_1 + \tfrac{1}{3}m_2.$$

From the first equation $m_1 = 2 + m_2$; substituting into the second gives $2m_2 = 3 + m_1 = 5 + m_2$, so $m_2 = 5$ and $m_1 = 7$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

vector<double> solve(vector<vector<double>> a, vector<double> b) {   // Gaussian elimination
    int n = int(b.size());
    for (int c = 0; c < n; ++c) {
        int p = c;
        for (int r = c + 1; r < n; ++r) if (fabs(a[r][c]) > fabs(a[p][c])) p = r;
        swap(a[c], a[p]), swap(b[c], b[p]);
        for (int r = 0; r < n; ++r) {
            if (r == c) continue;
            double f = a[r][c] / a[c][c];
            for (int k = c; k < n; ++k) a[r][k] -= f * a[c][k];
            b[r] -= f * b[c];
        }
    }
    for (int i = 0; i < n; ++i) b[i] /= a[i][i];
    return b;
}

int main() {
    auto hh = solve({{0.5, -0.5}, {-0.5, 1}}, {1, 1});                 // a, b for HH
    auto chain = solve({{0.5, -0.5}, {-1.0 / 3, 2.0 / 3}}, {1, 1});    // m1, m2
    const long n = 1'000'000;
    double flips = 0, steps = 0;
    long sevenFirst = 0;
    for (long t = 0; t < n; ++t) {
        int run = 0, f = 0;
        while (run < 2) { ++f; run = (rng() & 1) ? run + 1 : 0; }
        flips += f;
        int s;
        do s = int(rng() % 6 + rng() % 6 + 2); while (s != 7 && s != 6);
        sevenFirst += s == 7;
        int state = 1, k = 0;
        while (state != 3) {
            ++k;
            uint64_t r = rng() % 6;              // 6 equally likely outcomes per step
            if (state == 1) state = r < 3 ? 2 : 1;
            else state = r < 2 ? 3 : r < 4 ? 1 : 2;
        }
        steps += k;
    }
    printf("HH: equations give %.4f (and %.4f after one H), simulated %.4f\n", hh[0], hh[1],
           flips / n);
    printf("7 before 6: exact %.5f (6/11), simulated %.5f\n", 6.0 / 11, double(sevenFirst) / n);
    printf("chain from state 1: equations give %.4f (m2 = %.4f), simulated %.4f\n", chain[0],
           chain[1], steps / n);
}
```

Output:

```text
HH: equations give 6.0000 (and 4.0000 after one H), simulated 6.0018
7 before 6: exact 0.54545 (6/11), simulated 0.54531
chain from state 1: equations give 7.0000 (m2 = 5.0000), simulated 7.0050
```

The equations and the simulations agree to within 0.005 on all three problems, less than one standard error in each case.

#### Pitfalls

- **States that forget too much**: for the pattern HTH, "number of heads so far" is not a valid state; you need how much of the pattern the recent flips match.
- **Counting the step twice or not at all**: the "1 +" appears once per equation for expected-steps problems, and never for probability problems.
- **Missing boundary conditions**: absorbing states have expected remaining time 0, and hitting probabilities 1 or 0.

Connects to: [waiting time problems](#/concept/prob.expected-value.waiting-time-problems), [absorbing chains](#/concept/prob.markov.absorbing-chains), [gambler's ruin](#/concept/prob.markov.gamblers-ruin).

### questions
Q: What is first-step analysis?
A: A method for expected hitting times and hitting probabilities: define states, and for each state write an equation by conditioning on what happens in the next step. The resulting linear equations, with boundary values at absorbing states, give the answer.

Q: What is the expected number of fair coin flips until two heads in a row?
A: Six. With a the expected flips from scratch and b after one head, a equals 1 plus half b plus half a, and b equals 1 plus half a; solving gives b equals 4 and a equals 6.

Q: Rolling two dice repeatedly, what is the probability that a total of 7 appears before a total of 6?
A: Six elevenths. Rolls that are neither just repeat the situation, so only the relative chances of 7, 6 in 36, and 6, 5 in 36, matter.

Q: How do you choose the states for first-step analysis?
A: Include exactly the information that determines the future probabilities, such as how much of a target pattern has been matched or the current bankroll. If the past still matters given the state, the state is too coarse.

Q: How do expected-time equations differ from probability equations?
A: Expected-time equations add 1 for the step taken, with 0 at the absorbing target. Probability equations have no added constant, with boundary values 1 at the target and 0 at the other absorbing states.

## prob.expected-value.waiting-time-problems
name: "Waiting time problems"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "expected flips until HH vs HT"

### simple
Waiting time problems ask how long, on average, until a pattern shows up in a random sequence, like two heads in a row. Surprisingly, patterns of the same length can take different times: HH takes 6 flips on average but HT only 4. The difference comes from what a near miss leaves you with: after HT fails you are still half-way there, after HH fails you start over.

### interview
- Model with states = **how much of the pattern the latest flips match**, then use first-step analysis.
- **HT: 4 flips.** Wait for H (2 flips on average); after that, T finishes and H keeps you in the same state, so 2 more.
- **HH: 6 flips.** After the first H, a T sends you back to the start: $a = 1 + \frac{a+b}{2}$, $b = 1 + \frac{a}{2}$ gives $a = 6$.
- **Overlap rule** (Conway's formula for fair coins): $E = \sum 2^k$ over every $k$ where the first $k$ symbols equal the last $k$. HH: $2 + 4 = 6$; HT: $4$; HHH: 14; HTH: 10; HHT: 8.
- Self-overlap makes a pattern slower to appear *on average*, even though every pattern of length $n$ has the same chance, $2^{-n}$, at any given position.
- Related: **Penney's game**, where for any pattern chosen by the first player, the second player can choose one that appears first more often.

### deep
#### Why HH and HT differ

Every length-2 pattern has probability $\frac{1}{4}$ at each position, so in a long sequence each appears at a quarter of the positions. But occurrences of HH **cluster**: HHH contains two overlapping HH's. Clustered occurrences with the same long-run frequency must leave longer gaps between clusters, so the first one takes longer to arrive.

#### Worked example: HTH by states

States by longest matched prefix: 0 (nothing), 1 (H), 2 (HT). Let $e_0, e_1, e_2$ be the expected flips still needed.

- $e_0 = 1 + \frac{1}{2}e_1 + \frac{1}{2}e_0$ (H advances, T stays).
- $e_1 = 1 + \frac{1}{2}e_1 + \frac{1}{2}e_2$ (H: still matched "H"; T: now "HT").
- $e_2 = 1 + \frac{1}{2}\cdot 0 + \frac{1}{2}e_0$ (H finishes; T: "HTT" matches nothing).

From the first, $e_0 = 2 + e_1$; from the second, $e_1 = 2 + e_2$; the third gives $e_2 = 1 + \frac{e_0}{2} = 1 + \frac{4 + e_2}{2}$, so $e_2 = 6$, $e_1 = 8$ and $e_0 = 10$, matching Conway's $2^1 + 2^3 = 10$ (HTH overlaps itself in its first and last symbols).

#### Code: simulation against the overlap rule

```cpp
mt19937_64 rng(2026);                            // fixed seed

double conway(const string& p) {                 // sum of 2^k over self-overlaps of length k
    double e = 0;
    for (size_t k = 1; k <= p.size(); ++k)
        if (p.substr(0, k) == p.substr(p.size() - k)) e += pow(2, k);
    return e;
}

double simulate(const string& p, long trials) {
    double total = 0;
    for (long t = 0; t < trials; ++t) {
        string last;
        long flips = 0;
        do {
            last += (rng() & 1) ? 'H' : 'T';
            if (last.size() > p.size()) last.erase(0, 1);
            ++flips;
        } while (last != p);
        total += flips;
    }
    return total / trials;
}

int main() {
    for (string p : {"HT", "HH", "HHT", "HTH", "HHH", "HTHT", "HHHH"})
        printf("%-5s overlap rule %5.1f   simulated %.3f\n", p.c_str(), conway(p),
               simulate(p, 400'000));
}
```

Output:

```text
HT    overlap rule   4.0   simulated 4.004
HH    overlap rule   6.0   simulated 5.997
HHT   overlap rule   8.0   simulated 8.002
HTH   overlap rule  10.0   simulated 10.009
HHH   overlap rule  14.0   simulated 14.016
HTHT  overlap rule  20.0   simulated 19.972
HHHH  overlap rule  30.0   simulated 30.011
```

Every pattern's simulated mean is within about 0.03 flips of the overlap rule, within one standard error for 400,000 trials each; HTHT (20) and HHHH (30) show that longer self-overlaps cost more.

#### Penney's game

Two players each pick a pattern of three flips, and a coin is flipped until one pattern appears. Against HHH, choosing THH wins with probability $\frac{7}{8}$: unless the first three flips are HHH, a T must come before any HHH, and then THH is guaranteed to appear first. There is no best pattern; every choice has a counter, like rock-paper-scissors.

#### Pitfalls

- **Treating the wait as geometric** with $p = 2^{-n}$ gives $2^n$, correct only for patterns with no self-overlap (like HT or HHT).
- **Resetting too far** after a mismatch: after HT fails at the second flip (HH), you still have one H.
- The overlap rule is for fair coins; with bias or larger alphabets, weight each overlap by $\frac{1}{P(\text{prefix})}$ instead of $2^k$.

Connects to: [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [geometric distribution](#/concept/prob.distributions.geometric-distribution), [coin and dice games](#/concept/puzzles.probability.coin-and-dice-games), [martingales](#/concept/prob.stochastic.martingales).

### questions
Q: Why does HH take longer to appear than HT on average?
A: After a first head, a tail ruins HH and sends you back to the start, but for HT a second head just keeps you one step away. Equivalently, HH occurrences overlap and cluster, so with the same long-run frequency they leave longer gaps.

Q: What is the expected number of fair flips until HT?
A: Four: two flips on average to get the first head, and then two more on average until a tail, since further heads don't hurt.

Q: What is the expected number of fair flips until three heads in a row?
A: Fourteen, by the overlap rule 2 plus 4 plus 8, or by first-step equations with states for zero, one and two heads matched.

Q: How do you compute the expected waiting time for any coin pattern quickly?
A: For a fair coin, add 2 to the power k for every k where the pattern's first k symbols equal its last k symbols, including the whole pattern. HTH gives 2 plus 8, which is 10.

Q: In Penney's game, what beats HHH?
A: THH, which wins seven eighths of the time: unless the first three flips are all heads, a tail appears before any HHH, and from then on THH must occur before HHH.

## prob.expected-value.coupon-collector-problem
name: "Coupon collector problem"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "expected draws to collect all types"

### simple
The coupon collector problem asks how many random draws it takes to collect every one of n types, like collecting all the stickers in an album or seeing every face of a die. The first few new types come quickly, but the last one takes ages, because most draws are repeats. For a die you need about 14.7 rolls on average, not 6.

### interview
- Split the process into stages: after collecting $k$ types, a new one appears with probability $\frac{n-k}{n}$, so that stage is **geometric** with mean $\frac{n}{n-k}$.
- $E[T] = \sum_{k=0}^{n-1}\frac{n}{n-k} = n H_n = n\left(1 + \frac{1}{2} + \dots + \frac{1}{n}\right) \approx n\ln n + 0.5772n$.
- For a die: $6 H_6 = 6 \cdot \frac{49}{20} = 14.7$. For 50 types: about 225.
- $\text{Var}(T) = \sum_{k=1}^{n}\frac{n(n-k)}{k^2} = n^2\sum \frac{1}{k^2} - nH_n < \frac{\pi^2}{6}n^2$: the standard deviation grows like $n$, so long unlucky runs are common.
- The last stage alone averages $n$ draws: most of the time goes to the final few types.
- Assumptions: independent draws, all types equally likely; unequal probabilities make it longer.

### deep
#### The stage argument

Write $T = G_0 + G_1 + \dots + G_{n-1}$, where $G_k$ is the number of draws needed to get a new type once you have $k$ types. Each $G_k$ is geometric with success probability $p_k = \frac{n-k}{n}$, independent of the others. By linearity,

$$E[T] = \sum_{k=0}^{n-1}\frac{1}{p_k} = \frac{n}{n} + \frac{n}{n-1} + \dots + \frac{n}{1} = nH_n.$$

For a die: $1 + 1.2 + 1.5 + 2 + 3 + 6 = 14.7$. The last face alone takes 6 rolls on average, 41% of the total.

#### Variance

The stages are independent, so their geometric variances $\frac{1-p_k}{p_k^2}$ add. For a die: $0 + \frac{1/6}{(5/6)^2} + \frac{2/6}{(4/6)^2} + \frac{3/6}{(3/6)^2} + \frac{4/6}{(2/6)^2} + \frac{5/6}{(1/6)^2} = 0.24 + 0.75 + 2 + 6 + 30 = 38.99$, a standard deviation of about 6.24 rolls.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    for (int types : {6, 50}) {
        double mean = 0, var = 0;
        for (int k = 0; k < types; ++k) {
            double p = double(types - k) / types;
            mean += 1 / p;
            var += (1 - p) / (p * p);
        }
        const long n = 200'000;
        double sum = 0, sumSq = 0, lastStage = 0;
        vector<char> seen(types);
        for (long t = 0; t < n; ++t) {
            fill(seen.begin(), seen.end(), 0);
            int have = 0;
            long draws = 0, beforeLast = 0;
            while (have < types) {
                ++draws;
                int c = int(rng() % types);
                if (!seen[c]) {
                    seen[c] = 1;
                    if (++have == types - 1) beforeLast = draws;
                }
            }
            sum += draws, sumSq += double(draws) * draws;
            lastStage += draws - beforeLast;
        }
        double m = sum / n;
        printf("%2d types: mean exact %.3f, simulated %.3f; last type alone %.3f (exact %d)\n",
               types, mean, m, lastStage / n, types);
        printf("          sd exact %.3f, simulated %.3f\n", sqrt(var), sqrt(sumSq / n - m * m));
    }
}
```

Output:

```text
 6 types: mean exact 14.700, simulated 14.720; last type alone 6.019 (exact 6)
          sd exact 6.244, simulated 6.259
50 types: mean exact 224.960, simulated 224.845; last type alone 49.932 (exact 50)
          sd exact 61.951, simulated 61.945
```

The simulated means and standard deviations are within 1.6 standard errors of the exact values for both 6 and 50 types, and the last type alone takes about $n$ draws in both cases.

#### Variants

- **Collecting with friends**: sharing duplicates reduces the total needed per person substantially.
- **Collecting $m$ copies of each** type: roughly $n\ln n + (m-1)n\ln\ln n$ draws for large $n$.
- **Unequal probabilities**: rare types dominate; with one type at probability $\frac{1}{1000}$ you wait at least 1000 draws on average for it alone.
- **Expected distinct types after $d$ draws**: $n\left(1 - (1 - \frac{1}{n})^d\right)$, by [indicator variables](#/concept/prob.random-variables.indicator-variables).

Connects to: [geometric distribution](#/concept/prob.distributions.geometric-distribution), [linearity of expectation](#/concept/prob.random-variables.linearity-of-expectation), [series and sums](#/concept/math.number-theory.series-and-sums).

### questions
Q: How many rolls of a fair die does it take on average to see every face?
A: 14.7. After seeing k faces, a new face comes with probability 6 minus k over 6, so that stage takes 6 over 6 minus k rolls on average; adding 1, 1.2, 1.5, 2, 3 and 6 gives 14.7.

Q: What is the general formula for the coupon collector's expected time?
A: n times the harmonic number H(n), which is about n times ln n plus 0.577 n. The stages are geometric with success probabilities n minus k over n, and linearity adds their means.

Q: Why does the last coupon take so long?
A: With one type missing, each draw succeeds with probability only 1 over n, so the last stage alone takes n draws on average: for a die, 6 of the 14.7 rolls.

Q: How spread out is the collection time?
A: The stages are independent geometric waits, so their variances add; the total variance is n squared times the sum of 1 over k squared minus n H(n), so the standard deviation grows in proportion to n. For a die it is about 6.2 rolls.

Q: What assumptions does the formula n H(n) rely on?
A: Draws are independent and every type is equally likely. With unequal probabilities the expected time is longer, dominated by the rarest types.

## prob.expected-value.expected-value-of-games
name: "Expected value of games"
importance: important
scope: "fair prices, stopping rules"

### simple
The value of a game of chance is what it pays on average when you play it as well as possible. If you may roll a die once more after seeing the first roll, you keep a high roll and reroll a low one, and the game becomes worth more than a single roll. The fair price is that average payout: pay less and you win in the long run, pay more and you lose.

### interview
- **Fair price** for a risk-neutral player = expected payout under the **optimal strategy**; a market maker would quote around it.
- **Backward induction**: solve the last decision first; each earlier decision compares "stop now" with the value of continuing.
- Reroll games: one roll is worth 3.5; with one optional reroll, keep 4 or more, value $\frac{17}{4} = 4.25$; with up to three rolls, value $\frac{14}{3} \approx 4.667$.
- **Stationary stopping rules**: when the game can go on forever at a cost per try, the value $V$ solves $V = E[\max(X, V - c)]$, and you stop at any roll of at least $V - c$.
- Always state the payout rule, what is optional, and whether you care about risk; risk-averse players pay less than the expected value.
- Sanity check: an option to continue can never lower the value, so values grow with more rolls.

### deep
#### Up to $n$ rolls

Let $v_k$ be the value of a game with $k$ rolls left, where you may stop and take the current face or roll again (losing the current face). With one roll, $v_1 = 3.5$. With $k$ rolls, after the first roll keep face $x$ exactly when $x > v_{k-1}$:

$$v_k = \frac{1}{6}\sum_{x=1}^{6}\max(x, v_{k-1}).$$

- $v_2$: keep 4, 5, 6: $\frac{4 + 5 + 6}{6} + \frac{3}{6} \cdot 3.5 = \frac{17}{4} = 4.25$.
- $v_3$: keep only 5, 6 (since $4 < 4.25$): $\frac{11}{6} + \frac{4}{6} \cdot \frac{17}{4} = \frac{14}{3} \approx 4.667$.
- $v_4 = \frac{11}{6} + \frac{4}{6}\cdot\frac{14}{3} = \frac{89}{18} \approx 4.944$.

#### Unlimited rolls at a cost

Now you may reroll as often as you like, paying 1 each time, and finally keep the face you stop on. The value $V$ satisfies $V = \frac{1}{6}\sum_x \max(x, V - 1)$. Trying "stop on 4 or more": $V = \frac{15}{6} + \frac{3}{6}(V - 1)$ gives $V = 4$, and indeed $4, 5, 6 \ge V - 1 = 3$ while $1, 2 < 3$ (a 3 is a tie: stopping or rolling on are both worth 3). So the game is worth 4.

#### Code: dynamic programming and simulation of the policies

```cpp
mt19937_64 rng(2026);                            // fixed seed
int die() { return int(rng() % 6) + 1; }

int main() {
    vector<double> v = {0, 3.5};                 // v[k]: value with k rolls allowed
    for (int k = 2; k <= 4; ++k) {
        double s = 0;
        for (int x = 1; x <= 6; ++x) s += max(double(x), v[k - 1]) / 6;
        v.push_back(s);
    }
    printf("values: v1 %.4f  v2 %.4f  v3 %.4f  v4 %.4f\n", v[1], v[2], v[3], v[4]);

    const long n = 2'000'000;
    double three = 0, naive = 0, costly = 0;
    for (long t = 0; t < n; ++t) {
        int x = die();                           // optimal 3-roll policy
        if (x < 5) { x = die(); if (x < 4) x = die(); }
        three += x;
        naive += die();                          // always keep the first roll
        int paid = 0, y = die();                 // unlimited rerolls at 1 each: stop on 4+
        while (y < 4) { ++paid; y = die(); }
        costly += y - paid;
    }
    printf("3 rolls, optimal policy: exact %.4f  simulated %.4f\n", 14.0 / 3, three / n);
    printf("keep the first roll:     exact 3.5000  simulated %.4f\n", naive / n);
    printf("rerolls cost 1, stop 4+: exact 4.0000  simulated %.4f\n", costly / n);
}
```

Output:

```text
values: v1 3.5000  v2 4.2500  v3 4.6667  v4 4.9444
3 rolls, optimal policy: exact 4.6667  simulated 4.6672
keep the first roll:     exact 3.5000  simulated 3.5005
rerolls cost 1, stop 4+: exact 4.0000  simulated 4.0003
```

The dynamic program reproduces $\frac{17}{4}$, $\frac{14}{3}$ and $\frac{89}{18}$, and each simulated policy earns within 0.0005 of its exact value.

#### Pitfalls

- **Using the average as the threshold in every round**: the threshold for the first of three rolls is the value of the remaining *two* rolls (4.25), not 3.5.
- **Forgetting that the option has value**: a game with a free reroll is worth more than one roll even though the reroll can come out lower.
- **Risk**: the fair price assumes you care only about the average; for large stakes, a player with limited capital should pay less ([utility and risk aversion](#/concept/markets.betting.utility-and-risk-aversion)).

Connects to: [optimal stopping](#/concept/prob.expected-value.optimal-stopping), [expectation](#/concept/prob.random-variables.expectation), [expected value decisions](#/concept/markets.betting.expected-value-decisions).

### questions
Q: You roll a die and are paid its face, but may reroll once and must keep the second roll. What is the game worth?
A: 4.25. Reroll only when the first roll is below 3.5, that is 1, 2 or 3; the value is 4 plus 5 plus 6 over 6, plus one half times 3.5.

Q: What if you may roll up to three times?
A: 14 over 3, about 4.67. With two rolls left the value is 4.25, so after the first roll keep only 5 or 6; the value is 11 over 6 plus four sixths of 4.25.

Q: What is backward induction?
A: Solving a sequential decision problem from the last decision backwards: the value of the final stage is known, and each earlier decision compares stopping now with the value of continuing optimally.

Q: You may reroll a die as often as you like at a cost of 1 per reroll, keeping your final face. What is the game worth?
A: 4. The value V satisfies V equals the average of the larger of the face and V minus 1; stopping on 4 or more gives V equals 15 over 6 plus half of V minus 1, so V is 4, and 4 or more is indeed at least V minus 1.

Q: Is the fair price of a game always its expected value?
A: Only for a risk-neutral player who can play many times. A risk-averse player, or one whose bankroll is small relative to the stakes, should pay less than the expected value.

## prob.expected-value.optimal-stopping
name: "Optimal stopping"
importance: important
prereqs: [prob.expected-value.expected-value-of-games]
scope: "secretary problem, when to stop rolling"

### simple
Optimal stopping is about deciding when to accept an offer when you can't go back to earlier ones, like choosing an apartment or a job candidate. The famous rule for picking the single best of many is to look at the first 37% without choosing, then take the first one better than all of those. Looking too little risks settling early; looking too long risks letting the best pass by.

### interview
- **Secretary problem**: $n$ candidates in random order, you see relative ranks only, decisions are final, and you win only by choosing the best. Skip the first $r$, then take the first candidate better than all seen.
- Success probability with cutoff $r$: $P(r) = \frac{r}{n}\sum_{i=r+1}^{n}\frac{1}{i-1}$; the best cutoff is about $\frac{n}{e}$, and the success probability tends to $\frac{1}{e} \approx 0.368$.
- **Full-information** versions (you see actual values from a known distribution) use thresholds from backward induction: with values Uniform(0, 1) and $k$ draws left, stop when the current value beats the value of continuing, $v_{k+1} = \frac{1 + v_k^2}{2}$.
- The general principle: stop when the current reward is at least the expected value of continuing optimally.
- Variants change the answer: minimizing the expected rank, allowing recall, or paying per observation.
- Interview framing: "when to stop rolling", "when to sell", "how many candidates to interview".

### deep
#### Why about 37%

With cutoff $r$, you win if the best candidate is at position $i > r$ and the best of the first $i - 1$ candidates lies within the first $r$ (otherwise you would have stopped earlier on someone else). Those events have probabilities $\frac{1}{n}$ and $\frac{r}{i-1}$, so

$$P(r) = \sum_{i=r+1}^{n}\frac{1}{n}\cdot\frac{r}{i-1} \approx \frac{r}{n}\ln\frac{n}{r}.$$

Maximizing $x\ln\frac{1}{x}$ over $x = \frac{r}{n}$ gives $x = \frac{1}{e}$ and a success probability of $\frac{1}{e}$.

#### Worked example: values you can see

You draw up to three independent Uniform(0, 1) values, one at a time, and may stop and keep the current one. With one draw left, its value is $v_1 = \frac{1}{2}$. With two left, keep the current $u$ if $u > \frac{1}{2}$: $v_2 = E[\max(U, \frac{1}{2})] = \frac{1 + (1/2)^2}{2} = \frac{5}{8}$. With three left: $v_3 = \frac{1 + (5/8)^2}{2} = \frac{89}{128} \approx 0.6953$. The thresholds are $\frac{5}{8}$ for the first draw and $\frac{1}{2}$ for the second: be pickier early.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const int n = 100;
    int bestR = 0;
    double bestP = 0;
    for (int r = 1; r < n; ++r) {                // exact success probability for each cutoff
        double p = 0;
        for (int i = r + 1; i <= n; ++i) p += 1.0 / (i - 1);
        p *= double(r) / n;
        if (p > bestP) bestP = p, bestR = r;
    }
    printf("n = 100: best cutoff skips %d, success %.5f (1/e = %.5f)\n", bestR, bestP,
           exp(-1.0));

    const long trials = 1'000'000;
    long wins = 0;
    double three = 0;
    vector<int> order(n);
    for (long t = 0; t < trials; ++t) {
        iota(order.begin(), order.end(), 0);     // 0 is the best candidate
        for (int i = n - 1; i > 0; --i) swap(order[i], order[rng() % (i + 1)]);
        int bestSeen = *min_element(order.begin(), order.begin() + bestR);
        int chosen = order[n - 1];               // forced to take the last if nobody beats them
        for (int i = bestR; i < n; ++i)
            if (order[i] < bestSeen) { chosen = order[i]; break; }
        wins += chosen == 0;
        double a = u01(), b = u01(), c = u01();  // full information, three draws
        three += a > 5.0 / 8 ? a : b > 0.5 ? b : c;
    }
    printf("secretary simulated: %.5f\n", double(wins) / trials);
    printf("three uniform draws: exact %.5f (89/128)  simulated %.5f\n", 89.0 / 128,
           three / trials);
}
```

Output:

```text
n = 100: best cutoff skips 37, success 0.37104 (1/e = 0.36788)
secretary simulated: 0.37111
three uniform draws: exact 0.69531 (89/128)  simulated 0.69536
```

For 100 candidates the exact best cutoff skips 37 and succeeds with probability 0.37104, slightly above $\frac{1}{e}$; the simulation of that policy gives 0.37111, a fraction of a standard error away. The three-draw game simulates to within 0.0001 of $\frac{89}{128}$.

#### Assumptions behind the 37% rule

The candidates arrive in uniformly random order, only relative ranks are visible, rejected candidates never return, the number of candidates is known, and **only the very best counts** (second best is as bad as the worst). Change any of these and the rule changes: if you care about the expected rank, the optimal policy stops much earlier and achieves an expected rank of about 3.87 for large $n$; if you know the values' distribution, thresholds like the ones above do better than $\frac{1}{e}$.

Connects to: [expected value of games](#/concept/prob.expected-value.expected-value-of-games), [order statistics](#/concept/prob.distributions.order-statistics), [martingales](#/concept/prob.stochastic.martingales).

### questions
Q: What is the optimal strategy in the secretary problem?
A: Reject roughly the first n over e candidates, about 37 percent, while noting the best among them, then accept the first later candidate who is better than all seen so far. The probability of picking the very best tends to 1 over e, about 0.368.

Q: Why does the success probability approach 1 over e?
A: With a cutoff fraction x, success happens when the best comes after the cutoff and the best before it lies in the rejected part, which works out to about x times ln of 1 over x. That is maximized at x equals 1 over e, with value 1 over e.

Q: You can draw up to three Uniform(0,1) numbers one at a time and keep the one you stop on. How should you play?
A: Keep the first if it exceeds five eighths, the value of two remaining draws; keep the second if it exceeds one half; otherwise take the third. The game is worth 89 over 128, about 0.695.

Q: What is the general rule for optimal stopping problems?
A: Stop when the reward available now is at least the expected value of continuing optimally, which is computed by backward induction from the last stage.

Q: What assumptions does the 37 percent rule rely on?
A: Random arrival order, a known number of candidates, only relative ranks observed, no recall of rejected candidates, and success only if the single best is chosen. Different goals, such as a good expected rank, lead to different rules.
