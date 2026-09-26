---
topic: prob.distributions
name: "Common distributions"
subject: prob
order: 3
prereqs: [prob.random-variables]
---

## prob.distributions.bernoulli-and-binomial
name: "Bernoulli and binomial"
importance: must
scope: "n trials, mean and variance"

### simple
A Bernoulli trial is a single yes-or-no experiment, like one coin flip or one free throw, that succeeds with some probability p. Repeat it n times independently and count the successes, and that count follows the binomial distribution. It answers questions like "what is the chance of exactly 5 heads in 10 flips?"

### interview
- **Bernoulli($p$)**: $X \in \{0, 1\}$, $P(X = 1) = p$; mean $p$, variance $p(1 - p)$.
- **Binomial($n, p$)**: the number of successes in $n$ **independent** trials with the **same** $p$: $P(X = k) = \binom{n}{k}p^k(1-p)^{n-k}$ for $k = 0..n$.
- Mean $np$ and variance $np(1-p)$, by adding $n$ independent Bernoulli variables (linearity; variances add).
- The most likely count is near $np$ (the mode is $\lfloor (n+1)p \rfloor$); the distribution is symmetric when $p = \frac{1}{2}$.
- Approximations: **Poisson($np$)** when $n$ is large and $p$ small; **normal** $N(np, np(1-p))$ when $np(1-p)$ is large enough (say above 10), with a continuity correction.
- Check the assumptions: a fixed number of trials, independence, constant $p$. Draws without replacement are hypergeometric, not binomial.

### deep
#### Where the formula comes from

A particular sequence with $k$ successes and $n - k$ failures, such as SSF...F, has probability $p^k(1-p)^{n-k}$ by independence. There are $\binom{n}{k}$ such sequences (choose which $k$ positions succeed), and they are disjoint, so their probabilities add.

#### Worked examples

**Ten fair flips.** $P(\text{exactly 5 heads}) = \binom{10}{5}/2^{10} = \frac{252}{1024} = \frac{63}{256} \approx 0.2461$: the single most likely count is still less likely than not. $P(\text{at least 8}) = \frac{\binom{10}{8} + \binom{10}{9} + \binom{10}{10}}{1024} = \frac{45 + 10 + 1}{1024} = \frac{7}{128} \approx 0.0547$.

**A 70% free-throw shooter takes 10 shots** (assume independent shots with a constant $p = 0.7$). The expected number made is 7 with variance $10 \cdot 0.7 \cdot 0.3 = 2.1$. The chance of making at least 8:

$$\sum_{k=8}^{10}\binom{10}{k}0.7^k\,0.3^{10-k} = 0.23347 + 0.12106 + 0.02825 \approx 0.3828.$$

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

double pmf(int n, int k, double p) {             // C(n, k) p^k (1 - p)^(n - k)
    double c = 1;
    for (int i = 1; i <= k; ++i) c = c * (n - k + i) / i;
    return c * pow(p, k) * pow(1 - p, n - k);
}

int main() {
    const long trials = 1'000'000;
    long five = 0, eightPlus = 0, made8 = 0;
    double sum = 0, sumSq = 0;
    for (long t = 0; t < trials; ++t) {
        int heads = 0, made = 0;
        for (int i = 0; i < 10; ++i) {
            heads += rng() & 1;
            made += u01() < 0.7;
        }
        five += heads == 5;
        eightPlus += heads >= 8;
        made8 += made >= 8;
        sum += made, sumSq += made * made;
    }
    double p8 = pmf(10, 8, 0.7) + pmf(10, 9, 0.7) + pmf(10, 10, 0.7);
    auto line = [&](const char* what, double exact, long hits) {
        double p = double(hits) / trials, se = sqrt(exact * (1 - exact) / trials);
        printf("%-26s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact, p,
               fabs(p - exact) / se);
    };
    line("exactly 5 heads of 10", 63.0 / 256, five);
    line("at least 8 heads of 10", 7.0 / 128, eightPlus);
    line("shooter makes 8 or more", p8, made8);
    double mean = sum / trials;
    printf("shooter: mean %.4f (exact 7), variance %.4f (exact 2.1)\n", mean,
           sumSq / trials - mean * mean);
}
```

Output:

```text
exactly 5 heads of 10      exact 0.24609  simulated 0.24604  off by 0.1 standard errors
at least 8 heads of 10     exact 0.05469  simulated 0.05465  off by 0.2 standard errors
shooter makes 8 or more    exact 0.38278  simulated 0.38368  off by 1.8 standard errors
shooter: mean 7.0024 (exact 7), variance 2.0990 (exact 2.1)
```

The coin estimates are within 0.2 standard errors of $\frac{63}{256}$ and $\frac{7}{128}$; the shooter estimate is 1.8 standard errors above 0.38278, and the simulated mean and variance are within 0.2% of 7 and 2.1.

#### Variants and common mistakes

- **Without replacement** (5 cards, count the aces): the trials are dependent, so use the [hypergeometric](#/concept/prob.distributions.negative-binomial-and-hypergeometric) distribution; the binomial is only an approximation when the population is much larger than the sample.
- **Changing $p$** (a shooter who tires): the count is a sum of Bernoullis with different $p_i$ (Poisson-binomial); its mean is still $\sum p_i$ and its variance $\sum p_i(1-p_i)$.
- **"At least one" in $n$ trials**: $1 - (1-p)^n$, not $np$ (which can exceed 1).
- **Normal approximation near 0 or $n$**: poor when $np$ or $n(1-p)$ is small; the distribution is skewed there.

Connects to: [geometric distribution](#/concept/prob.distributions.geometric-distribution), [Poisson distribution](#/concept/prob.distributions.poisson-distribution), [binomial theorem and Pascal's identities](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities).

### questions
Q: What assumptions does the binomial distribution make?
A: A fixed number n of trials, each a success or failure, independent of each other, with the same success probability p. The count of successes is then binomial with parameters n and p.

Q: What are the mean and variance of a binomial variable, and why?
A: The mean is n times p and the variance n times p times one minus p. The count is a sum of n independent Bernoulli variables, each with mean p and variance p times one minus p, and both means and independent variances add.

Q: What is the probability of exactly 5 heads in 10 fair coin flips?
A: 10 choose 5 over 2 to the tenth, which is 252 over 1024, about 0.246.

Q: When is the binomial distribution the wrong model?
A: When trials are dependent, such as drawing without replacement from a small population, which is hypergeometric; when the success probability changes between trials; or when the number of trials is itself random.

Q: When can a binomial be approximated by a Poisson or a normal distribution?
A: By a Poisson with mean n times p when n is large and p small, and by a normal with the same mean and variance when n times p times one minus p is large, using a continuity correction for probabilities of exact counts or ranges.

## prob.distributions.geometric-distribution
name: "Geometric distribution"
importance: must
prereqs: [prob.distributions.bernoulli-and-binomial]
scope: "waiting for the first success, memorylessness"

### simple
The geometric distribution counts how many tries it takes to get the first success, like rolling a die until the first six. If each try succeeds with probability p, you need 1/p tries on average, so six rolls for a six. It also has no memory: after ten failed rolls, the six is no more "due" than on the first roll.

### interview
- **Trials until the first success** (independent trials, constant $p$): $P(N = k) = (1-p)^{k-1}p$ for $k = 1, 2, \dots$
- $P(N > k) = (1-p)^k$; mean $\frac{1}{p}$; variance $\frac{1-p}{p^2}$.
- **Memoryless**: $P(N > m + k \mid N > m) = P(N > k)$; after $m$ failures, the remaining wait has the same distribution as a fresh start. It is the only memoryless distribution on the positive integers.
- Two conventions: counting **trials** (support 1, 2, ...) or **failures before the success** (support 0, 1, ..., mean $\frac{1-p}{p}$). Say which one you use.
- Uses: waiting for a six ($E = 6$), for a pattern whose tries don't overlap, the stages of the coupon collector, and the discrete cousin of the exponential distribution.
- Gambler's fallacy: past failures don't make success more likely.

### deep
#### Deriving the mean

By first-step analysis: the first trial succeeds with probability $p$ (then $N = 1$); otherwise you have used one trial and the future looks exactly like the start. So $E[N] = 1 + (1 - p)E[N]$, giving $E[N] = \frac{1}{p}$. The tail-sum formula agrees: $\sum_{k \ge 0}(1-p)^k = \frac{1}{p}$.

#### Worked examples with a die ($p = \frac{1}{6}$)

- $E[N] = 6$, $\text{Var}(N) = \frac{5/6}{1/36} = 30$, so the standard deviation is about 5.5: waits are very spread out.
- $P(N = 1) = \frac{1}{6}$ is the single most likely value.
- $P(\text{still no six after 9 rolls}) = (5/6)^9 \approx 0.1938$.
- Memorylessness: given that the first 5 rolls had no six, the expected *total* number of rolls is $5 + 6 = 11$, not 6.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long n = 2'000'000;
    long pmf[4] = {}, longWait = 0, afterFive = 0;
    double sum = 0, sumSq = 0, totalAfterFive = 0;
    for (long t = 0; t < n; ++t) {
        int k = 1;
        while (rng() % 6 != 5) ++k;              // rolls until the first six
        if (k <= 3) ++pmf[k];
        longWait += k > 9;
        sum += k, sumSq += double(k) * k;
        if (k > 5) { ++afterFive; totalAfterFive += k; }
    }
    for (int k = 1; k <= 3; ++k)
        printf("P(N = %d): exact %.5f  simulated %.5f\n", k, pow(5.0 / 6, k - 1) / 6,
               double(pmf[k]) / n);
    printf("P(N > 9):  exact %.5f  simulated %.5f\n", pow(5.0 / 6, 9), double(longWait) / n);
    double mean = sum / n;
    printf("mean: exact 6, simulated %.4f; variance: exact 30, simulated %.3f\n", mean,
           sumSq / n - mean * mean);
    printf("given no six in the first 5: mean total exact 11, simulated %.4f (%ld cases)\n",
           totalAfterFive / afterFive, afterFive);
}
```

Output:

```text
P(N = 1): exact 0.16667  simulated 0.16648
P(N = 2): exact 0.13889  simulated 0.13889
P(N = 3): exact 0.11574  simulated 0.11587
P(N > 9):  exact 0.19381  simulated 0.19368
mean: exact 6, simulated 6.0001; variance: exact 30, simulated 30.010
given no six in the first 5: mean total exact 11, simulated 10.9990 (803724 cases)
```

Every estimate is within one standard error of its exact value, including the memoryless check: runs with no six in the first 5 rolls needed 10.999 rolls in total on average, against the exact 11.

#### Pitfalls

- **Mixing conventions**: the number of failures before the first success has mean $\frac{1-p}{p} = 5$ for a die, one less than the number of rolls.
- **Using it for overlapping patterns**: waiting for HH is not geometric with $p = \frac{1}{4}$ (its mean is 6, not 4), because attempts overlap; see [waiting time problems](#/concept/prob.expected-value.waiting-time-problems).
- **Believing a success is "due"**: memorylessness is exactly the statement that it isn't.

Connects to: [exponential distribution](#/concept/prob.distributions.exponential-distribution), [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [coupon collector problem](#/concept/prob.expected-value.coupon-collector-problem).

### questions
Q: What is the expected number of rolls of a fair die until the first six?
A: Six. The number of rolls is geometric with success probability one sixth, and a geometric variable counting trials has mean 1 over p.

Q: What does memorylessness mean for the geometric distribution?
A: Given that the first m trials failed, the number of further trials needed has the same distribution as from the start. After five rolls without a six, you still expect six more rolls, not one.

Q: What is the variance of the number of rolls until the first six?
A: One minus p over p squared, which is five sixths divided by one thirty-sixth, or 30, a standard deviation of about 5.5 rolls.

Q: What is the probability that a fair die shows no six in the first 9 rolls?
A: Five sixths to the ninth power, about 0.194, assuming independent rolls.

Q: Why isn't the waiting time for two heads in a row geometric?
A: The attempts overlap and are not independent: a failed attempt can still leave you one head into the next one or send you back to the start. The waiting time has mean 6, not the 4 a geometric with p one quarter would give.

## prob.distributions.negative-binomial-and-hypergeometric
name: "Negative binomial and hypergeometric"
importance: important
prereqs: [prob.distributions.geometric-distribution]
scope: "waiting for r successes, sampling without replacement"

### simple
The negative binomial distribution counts how many tries it takes to collect several successes, like rolling until you have seen three sixes. The hypergeometric distribution counts successes when you draw without putting things back, like the number of aces in a poker hand. Both extend the familiar coin-flip counts to slightly different setups.

### interview
- **Negative binomial**: trials until the $r$-th success (independent trials, constant $p$): $P(N = k) = \binom{k-1}{r-1}p^r(1-p)^{k-r}$ for $k \ge r$ (the last trial is the $r$-th success; choose the other $r - 1$ among the first $k - 1$).
- It is a sum of $r$ independent geometric waits, so mean $\frac{r}{p}$ and variance $\frac{r(1-p)}{p^2}$; three sixes take 18 rolls on average.
- **Hypergeometric**: draw $n$ items without replacement from $N$, of which $K$ are successes: $P(X = k) = \frac{\binom{K}{k}\binom{N-K}{n-k}}{\binom{N}{n}}$.
- Mean $n\frac{K}{N}$ (same as with replacement, by linearity) and variance $n\frac{K}{N}\left(1-\frac{K}{N}\right)\frac{N-n}{N-1}$: the **finite population correction** makes it smaller than the binomial's.
- When $N$ is much larger than $n$, the hypergeometric is close to Binomial($n, K/N$).
- Uses: card hands, quality control samples, lotteries, capture-recapture estimates.

### deep
#### Negative binomial: three sixes

The number of rolls $N$ until the third six is the sum of three independent geometric waits with $p = \frac{1}{6}$, so $E[N] = 3 \cdot 6 = 18$ and $\text{Var}(N) = 3 \cdot 30 = 90$. The chance the third six arrives exactly on roll 10:

$$P(N = 10) = \binom{9}{2}\left(\frac{1}{6}\right)^3\left(\frac{5}{6}\right)^7 = 36 \cdot \frac{5^7}{6^{10}} = \frac{2812500}{60466176} \approx 0.04651.$$

#### Hypergeometric: aces in a poker hand

Five cards from 52, with $K = 4$ aces:

| aces | count of hands | probability |
|---|---|---|
| 0 | $\binom{48}{5} = 1712304$ | 0.65884 |
| 1 | $4\binom{48}{4} = 778320$ | 0.29947 |
| 2 | $6\binom{48}{3} = 103776$ | 0.03993 |
| 3 | $4\binom{48}{2} = 4512$ | 0.00174 |
| 4 | $48$ | 0.00002 |

out of $\binom{52}{5} = 2598960$ hands. The mean is $5 \cdot \frac{4}{52} = \frac{5}{13} \approx 0.3846$ and the variance $5 \cdot \frac{1}{13} \cdot \frac{12}{13} \cdot \frac{47}{51} \approx 0.3272$, a bit below the binomial's 0.3550.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

double choose(int n, int k) {
    double c = 1;
    for (int i = 1; i <= k; ++i) c = c * (n - k + i) / i;
    return c;
}

int main() {
    const long n = 1'000'000;
    long tenth = 0, aces[5] = {};
    double sumN = 0, sumA = 0, sumA2 = 0;
    for (long t = 0; t < n; ++t) {
        int rolls = 0, sixes = 0;
        while (sixes < 3) { ++rolls; sixes += rng() % 6 == 5; }
        tenth += rolls == 10;
        sumN += rolls;
        int deck[52];                            // cards 0-3 are aces; deal 5 by partial shuffle
        iota(deck, deck + 52, 0);
        int a = 0;
        for (int i = 0; i < 5; ++i) {
            swap(deck[i], deck[i + rng() % (52 - i)]);
            a += deck[i] < 4;
        }
        ++aces[a];
        sumA += a, sumA2 += a * a;
    }
    printf("third six on roll 10: exact %.5f  simulated %.5f\n",
           choose(9, 2) * pow(1.0 / 6, 3) * pow(5.0 / 6, 7), double(tenth) / n);
    printf("rolls for three sixes: mean exact 18, simulated %.4f\n", sumN / n);
    for (int k = 0; k <= 4; ++k)
        printf("%d aces: exact %.5f  simulated %.5f\n", k,
               choose(4, k) * choose(48, 5 - k) / choose(52, 5), double(aces[k]) / n);
    double m = sumA / n;
    printf("aces: mean exact %.4f simulated %.4f; variance exact %.4f simulated %.4f\n", 5.0 / 13,
           m, 5.0 / 13 * 12 / 13 * 47 / 51, sumA2 / n - m * m);
}
```

Output:

```text
third six on roll 10: exact 0.04651  simulated 0.04712
rolls for three sixes: mean exact 18, simulated 17.9961
0 aces: exact 0.65884  simulated 0.65918
1 aces: exact 0.29947  simulated 0.29936
2 aces: exact 0.03993  simulated 0.03975
3 aces: exact 0.00174  simulated 0.00168
4 aces: exact 0.00002  simulated 0.00003
aces: mean exact 0.3846 simulated 0.3840; variance exact 0.3272 simulated 0.3264
```

The ace counts, their mean and the mean of 18 rolls are all within 1.5 standard errors. The "third six on roll 10" estimate, 0.04712 against the exact 0.04651, is 2.9 standard errors high, which is rare (about 1 run in 250). Rerunning it with 100 other seeds gave errors averaging zero with the expected spread, so the formula and the simulation agree and this run was simply unlucky; a simulation is evidence, never proof.

#### Pitfalls

- **Two conventions again**: the negative binomial is sometimes defined as the number of *failures* before the $r$-th success (mean $\frac{r(1-p)}{p}$).
- **Using the binomial for small populations**: 5 cards from a 52-card deck changes the odds after every draw; the hypergeometric is exact.
- **Forgetting the last trial** in the negative binomial count: the $r$-th success must be the final trial, so choose from the first $k - 1$ only.

Connects to: [Bernoulli and binomial](#/concept/prob.distributions.bernoulli-and-binomial), [geometric distribution](#/concept/prob.distributions.geometric-distribution), [card problems](#/concept/puzzles.probability.card-problems).

### questions
Q: What is the expected number of rolls needed to see three sixes?
A: 18. The wait is a sum of three independent geometric waits, each with mean 6, so its mean is 3 times 6; its variance is 3 times 30, or 90.

Q: What distribution describes the number of aces in a 5-card hand?
A: Hypergeometric: drawing 5 from 52 without replacement with 4 aces. The probability of exactly k aces is 4 choose k times 48 choose 5 minus k, divided by 52 choose 5, and the mean is 5 times 4 over 52.

Q: How does the hypergeometric variance differ from the binomial variance?
A: It is multiplied by the finite population correction, N minus n over N minus 1, which is less than 1. Sampling without replacement reduces the spread because each draw tells you something about the remaining items.

Q: What is the probability that the third six arrives exactly on roll 10?
A: 9 choose 2 times one sixth cubed times five sixths to the seventh, about 0.047: two of the first nine rolls are sixes and the tenth roll is the third.

Q: When can you use the binomial in place of the hypergeometric?
A: When the population is much larger than the sample, so drawing without replacement barely changes the proportion of successes, for example polling 1,000 people from a city of millions.

## prob.distributions.poisson-distribution
name: "Poisson distribution"
importance: must
prereqs: [prob.distributions.bernoulli-and-binomial]
scope: "rare events, Poisson approximation to binomial"

### simple
The Poisson distribution counts how many rare, independent events happen in a fixed stretch of time or space, such as typos on a page or calls to a help desk in an hour. It needs only one number: the average count. It is what a binomial turns into when there are very many chances, each very unlikely.

### interview
- $P(X = k) = e^{-\lambda}\frac{\lambda^k}{k!}$ for $k = 0, 1, 2, \dots$; **mean and variance both equal $\lambda$**.
- **Assumptions**: events occur independently, at a constant average rate, and never two at exactly the same instant; then counts in disjoint intervals are independent Poissons (a Poisson process).
- **Poisson approximation**: Binomial($n, p$) ≈ Poisson($np$) when $n$ is large and $p$ small, since $\binom{n}{k}p^k(1-p)^{n-k} \to e^{-\lambda}\frac{\lambda^k}{k!}$.
- **Sums and splitting**: independent Poissons add (Poisson($\lambda + \mu$)); if each event is kept with probability $q$ independently, the kept count is Poisson($q\lambda$).
- $P(\text{none}) = e^{-\lambda}$: with an average of 1, you see zero events 37% of the time.
- Overdispersion (variance larger than the mean) in real data signals that the constant-rate or independence assumption fails.

### deep
#### Where it comes from

Split an hour into $n$ tiny slots, each holding an event with probability $p = \frac{\lambda}{n}$, independently. The count is Binomial($n, \frac{\lambda}{n}$), and as $n \to \infty$,

$$\binom{n}{k}\left(\frac{\lambda}{n}\right)^k\left(1 - \frac{\lambda}{n}\right)^{n-k} \to \frac{\lambda^k}{k!}e^{-\lambda},$$

because $\binom{n}{k}/n^k \to \frac{1}{k!}$ and $(1 - \frac{\lambda}{n})^n \to e^{-\lambda}$.

#### Worked example: typos

A book averages 2 typos per page. Assuming typos occur independently at a constant rate, the count on a page is Poisson(2):

| $k$ | 0 | 1 | 2 | 3 | 4 or more |
|---|---|---|---|---|---|
| $P$ | $e^{-2} \approx 0.1353$ | $2e^{-2} \approx 0.2707$ | $2e^{-2} \approx 0.2707$ | $\frac{4}{3}e^{-2} \approx 0.1804$ | $\approx 0.1429$ |

For two pages, the count is Poisson(4), and $P(\text{no typos in two pages}) = e^{-4} \approx 0.0183$.

#### Worked example: the approximation

A batch of 1,000 chips has a defect rate of 0.2% per chip, independently. The exact count is Binomial(1000, 0.002); Poisson(2) approximates it. The code compares them.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const int chips = 1000;
    const double p = 0.002, lambda = chips * p;
    double binom = pow(1 - p, chips), pois = exp(-lambda);
    const long n = 500'000;
    long hist[5] = {};
    double sum = 0, sumSq = 0;
    for (long t = 0; t < n; ++t) {
        int defects = 0;
        for (int i = 0; i < chips; ++i) defects += u01() < p;
        ++hist[min(defects, 4)];
        sum += defects, sumSq += defects * defects;
    }
    printf("k  binomial   Poisson(2)  simulated binomial\n");
    double binomTail = 1, poisTail = 1;
    for (int k = 0; k < 4; ++k) {
        printf("%d  %.5f    %.5f     %.5f\n", k, binom, pois, double(hist[k]) / n);
        binomTail -= binom, poisTail -= pois;
        binom *= double(chips - k) / (k + 1) * p / (1 - p);
        pois *= lambda / (k + 1);
    }
    printf("4+ %.5f    %.5f     %.5f\n", binomTail, poisTail, double(hist[4]) / n);
    double mean = sum / n;
    printf("mean %.4f and variance %.4f (binomial: 2 and %.4f)\n", mean, sumSq / n - mean * mean,
           chips * p * (1 - p));
}
```

Output:

```text
k  binomial   Poisson(2)  simulated binomial
0  0.13506    0.13534     0.13561
1  0.27067    0.27067     0.27148
2  0.27094    0.27067     0.26962
3  0.18063    0.18045     0.18044
4+ 0.14270    0.14288     0.14285
mean 1.9981 and variance 1.9984 (binomial: 2 and 1.9960)
```

The exact binomial and Poisson(2) columns differ by less than 0.0003 at every $k$, which is the point of the approximation. The simulated binomial, from 500,000 batches, is within about 2 standard errors of the exact binomial at every $k$ (the largest gap, 0.0013 at $k = 2$, is 2.1 standard errors), and its mean and variance both come out close to 2, as a Poisson count should.

#### Pitfalls

- **Clustered events**: accidents after a storm, or orders during a sale, arrive in bursts; the variance then exceeds the mean and a Poisson model underestimates extremes.
- **Changing rates**: calls per hour over a whole day are not Poisson with one $\lambda$; model each hour, or use a time-varying rate.
- **Using it when $p$ is not small**: Binomial(10, 0.5) is nothing like Poisson(5).

Connects to: [Poisson processes](#/concept/prob.stochastic.poisson-processes), [exponential distribution](#/concept/prob.distributions.exponential-distribution), [sums of random variables](#/concept/prob.distributions.sums-of-random-variables).

### questions
Q: What are the mean and variance of a Poisson distribution?
A: Both equal the rate parameter lambda. A variance clearly larger than the mean in real count data is a sign that the Poisson assumptions don't hold.

Q: What assumptions justify a Poisson model?
A: Events happen independently of each other, at a constant average rate over the interval, and not simultaneously. Then the count in an interval of a given length is Poisson with mean equal to rate times length.

Q: When does a Poisson approximate a binomial?
A: When the number of trials n is large and the success probability p is small, with lambda equal to n times p kept moderate. For example 1,000 chips with a 0.2 percent defect rate behave like Poisson(2).

Q: A page has 2 typos on average. What is the probability of a page with no typos?
A: e to the minus 2, about 0.135, assuming typos occur independently at a constant rate.

Q: What is the distribution of the sum of two independent Poisson variables?
A: Poisson with the sum of the two rates, which can be shown with moment generating functions or by counting events of a Poisson process over two adjacent intervals.

## prob.distributions.uniform-distribution
name: "Uniform distribution"
importance: must
scope: "discrete and continuous"

### simple
A uniform distribution gives every possible value the same chance: every face of a fair die, or every point along a ruler when you drop a pin on it without aiming. It is the "no information" distribution. It is also the raw material of simulation: computers produce uniform numbers and turn them into every other distribution.

### interview
- **Discrete uniform** on $\{a, \dots, b\}$: each of $m = b - a + 1$ values has probability $\frac{1}{m}$; mean $\frac{a+b}{2}$, variance $\frac{m^2 - 1}{12}$ (a die: $\frac{35}{12}$).
- **Continuous Uniform($a, b$)**: density $\frac{1}{b-a}$ on $[a, b]$; $P(c \le X \le d) = \frac{d - c}{b - a}$ for sub-intervals; mean $\frac{a+b}{2}$, variance $\frac{(b-a)^2}{12}$.
- **Inverse transform sampling**: if $U \sim$ Uniform(0, 1) and $F$ is a CDF, then $F^{-1}(U)$ has CDF $F$; for example $-\frac{\ln(1-U)}{\lambda}$ is exponential. And $F(X)$ is uniform for continuous $X$.
- Sums of uniforms are not uniform: $U_1 + U_2$ is triangular on $[0, 2]$; order statistics of uniforms are Beta.
- Classic results: $E|U_1 - U_2| = \frac{1}{3}$; $E[\max(U_1, U_2)] = \frac{2}{3}$; $P(U_1 + U_2 \le t) = \frac{t^2}{2}$ for $t \le 1$.
- Turning random integers into a range with `% m` is slightly biased unless $m$ divides the generator's range; for 64-bit generators and small $m$ the bias is negligible.

### deep
#### Continuous uniform facts

For $X \sim$ Uniform(2, 5): $E[X] = 3.5$, $\text{Var}(X) = \frac{9}{12} = 0.75$, and $P(3 \le X \le 4) = \frac{1}{3}$. The variance formula comes from $E[X^2] - (E[X])^2 = \frac{a^2 + ab + b^2}{3} - \frac{(a+b)^2}{4} = \frac{(b-a)^2}{12}$.

#### Worked example: two uniform points

Drop two independent points $U_1, U_2$ uniformly on $[0, 1]$. In the unit square, $|U_1 - U_2| > d$ is two corner triangles with total area $(1-d)^2$, so $P(|U_1 - U_2| \le d) = 1 - (1-d)^2$ and

$$E|U_1 - U_2| = \int_0^1 (1 - d)^2\,dd = \frac{1}{3}.$$

Similarly $U_1 + U_2 \le 1.5$ is the square minus the corner triangle of area $\frac{(0.5)^2}{2}$, so $P = 1 - 0.125 = 0.875$.

#### Worked example: inverse transform

To sample a distribution with CDF $F(x) = x^3$ on $[0, 1]$ (density $3x^2$), set $X = U^{1/3}$: then $P(X \le x) = P(U \le x^3) = x^3$. Its mean is $\int_0^1 3x^3\,dx = \frac{3}{4}$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1): 53 random bits

int main() {
    const long n = 2'000'000;
    double sx = 0, sx2 = 0, dist = 0, cubeRoot = 0;
    long inside = 0, sumBelow = 0;
    for (long t = 0; t < n; ++t) {
        double x = 2 + 3 * u01();                // Uniform(2, 5)
        sx += x, sx2 += x * x;
        inside += x >= 3 && x <= 4;
        double u = u01(), v = u01();
        dist += fabs(u - v);
        sumBelow += u + v <= 1.5;
        cubeRoot += cbrt(u01());                 // inverse transform for F(x) = x^3
    }
    double m = sx / n;
    printf("Uniform(2,5): mean %.4f (3.5), variance %.4f (0.75), P(3..4) %.4f (0.3333)\n", m,
           sx2 / n - m * m, double(inside) / n);
    printf("E|U1 - U2|:     exact 0.3333  simulated %.4f\n", dist / n);
    printf("P(U1+U2 <= 1.5): exact 0.8750  simulated %.4f\n", double(sumBelow) / n);
    printf("E[U^(1/3)]:     exact 0.7500  simulated %.4f\n", cubeRoot / n);
}
```

Output:

```text
Uniform(2,5): mean 3.4991 (3.5), variance 0.7500 (0.75), P(3..4) 0.3333 (0.3333)
E|U1 - U2|:     exact 0.3333  simulated 0.3332
P(U1+U2 <= 1.5): exact 0.8750  simulated 0.8750
E[U^(1/3)]:     exact 0.7500  simulated 0.7500
```

All estimates match the exact values to within 0.001, well inside the simulation's standard errors. The helper `u01` keeps the top 53 bits of a 64-bit random number and scales them into $[0, 1)$, so every double it returns is equally likely among $2^{53}$ evenly spaced values; that is the building block of every simulation in this subject.

#### Pitfalls

- **"Uniform" needs a stated range and scale**: a uniformly random chord of a circle is ambiguous (Bertrand's paradox; see [classic continuous problems](#/concept/prob.continuous.classic-continuous-problems)).
- **No uniform distribution on all integers or all reals**: this is why the two-envelopes "paradox" argument fails.
- **Sums are not uniform**: two dice are not uniform on 2 to 12.

Connects to: [random variables](#/concept/prob.random-variables.random-variables), [order statistics](#/concept/prob.distributions.order-statistics), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation).

### questions
Q: What are the mean and variance of a Uniform(a, b) variable?
A: The mean is the midpoint, a plus b over 2, and the variance is b minus a squared over 12. For Uniform(0,1) that is one half and one twelfth.

Q: What is the expected distance between two independent uniform points on the unit interval?
A: One third. The probability that the distance exceeds d is one minus d squared, and integrating that tail from 0 to 1 gives one third.

Q: How does inverse transform sampling work?
A: If U is uniform on 0 to 1 and F is a continuous, increasing CDF, then F inverse of U has CDF F, because the probability that F inverse of U is at most x equals the probability that U is at most F of x. For example, minus the log of one minus U, divided by lambda, is exponential.

Q: Is the sum of two independent uniforms uniform?
A: No. The sum of two Uniform(0,1) variables has a triangular density on 0 to 2, peaking at 1, because middle values can be reached in more ways.

Q: Why can't you pick an integer uniformly at random from all integers?
A: Each integer would need the same probability; if it is zero the total is zero, and if it is positive the total is infinite, so no such distribution exists. That breaks arguments that assume one, such as the two-envelopes switching argument.

## prob.distributions.exponential-distribution
name: "Exponential distribution"
importance: must
prereqs: [prob.distributions.geometric-distribution]
scope: "waiting times, memorylessness"

### simple
The exponential distribution describes waiting times for events that happen at a steady random rate, like the time until the next customer walks in. Short waits are the most common, long waits get steadily rarer, and the average wait is one over the rate. Like the geometric distribution, it has no memory: having waited ten minutes doesn't bring the next arrival any closer.

### interview
- Density $f(x) = \lambda e^{-\lambda x}$ for $x \ge 0$; CDF $1 - e^{-\lambda x}$; **survival** $P(X > x) = e^{-\lambda x}$.
- Mean $\frac{1}{\lambda}$, variance $\frac{1}{\lambda^2}$ (the standard deviation equals the mean); median $\frac{\ln 2}{\lambda}$, below the mean.
- **Memoryless**: $P(X > s + t \mid X > s) = P(X > t)$; the only continuous distribution with this property.
- **Competing exponentials**: for independent $X_i \sim$ Exp($\lambda_i$), $\min_i X_i \sim$ Exp($\sum\lambda_i$) and $P(X_j \text{ is the smallest}) = \frac{\lambda_j}{\sum_i \lambda_i}$.
- Gaps between events of a Poisson process with rate $\lambda$ are independent Exp($\lambda$); the sum of $k$ of them is Gamma (Erlang).
- Sampling by inverse transform: $X = -\frac{\ln(1 - U)}{\lambda}$.

### deep
#### Intuition

If events arrive at a constant rate with no memory, the chance of surviving another minute is the same fraction every minute, so survival decays exponentially: $P(X > t) = e^{-\lambda t}$. The geometric distribution is the same idea in discrete steps.

#### Worked example: buses

Buses arrive as a Poisson process averaging one every 10 minutes, so the wait is Exp($\lambda = 0.1$ per minute), assuming no timetable (arrivals really are memoryless).

- $E[\text{wait}] = 10$ minutes; median $10\ln 2 \approx 6.93$ minutes.
- $P(\text{wait} > 15) = e^{-1.5} \approx 0.2231$.
- Having already waited 10 minutes, the expected additional wait is still 10 minutes.

#### Worked example: which comes first

Server A fails at rate 1 per year and server B at rate 3 per year, independently. The first failure comes after Exp(4) years, mean 3 months, and it is B's with probability $\frac{3}{4}$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double expo(double rate) { return -log(1 - u01()) / rate; }   // inverse transform

int main() {
    const long n = 2'000'000;
    double sum = 0, sumSq = 0, extra = 0, firstSum = 0;
    long over15 = 0, waited10 = 0, bFirst = 0;
    for (long t = 0; t < n; ++t) {
        double w = expo(0.1);
        sum += w, sumSq += w * w;
        over15 += w > 15;
        if (w > 10) { ++waited10; extra += w - 10; }
        double a = expo(1), b = expo(3);
        firstSum += min(a, b);
        bFirst += b < a;
    }
    double m = sum / n;
    printf("wait: mean %.4f (exact 10), variance %.3f (exact 100)\n", m, sumSq / n - m * m);
    printf("P(wait > 15): exact %.5f  simulated %.5f\n", exp(-1.5), double(over15) / n);
    printf("after 10 minutes, extra wait: exact 10, simulated %.4f (%ld cases)\n",
           extra / waited10, waited10);
    printf("first failure: mean exact 0.25, simulated %.5f; B first: exact 0.75, simulated %.5f\n",
           firstSum / n, double(bFirst) / n);
}
```

Output:

```text
wait: mean 9.9860 (exact 10), variance 99.586 (exact 100)
P(wait > 15): exact 0.22313  simulated 0.22262
after 10 minutes, extra wait: exact 10, simulated 9.9786 (734815 cases)
first failure: mean exact 0.25, simulated 0.24987; B first: exact 0.75, simulated 0.75031
```

The waiting-time estimates (mean, tail probability and the wait after 10 minutes) all run about 2 standard errors low together, because they come from the same two million draws; the memoryless check still lands at 9.98 against 10. The failure race is within one standard error on both counts.

#### The inspection paradox

If you arrive at a random time, the gap you land in is *longer* than a typical gap: with exponential gaps averaging 10 minutes, the gap containing your arrival averages 20 minutes (10 behind you, 10 ahead by memorylessness). Long gaps cover more time, so they are more likely to contain you. This explains why buses always seem late and why "average class size as experienced by students" exceeds the average class size.

#### Pitfalls

- **Rate versus mean**: Exp($\lambda$) has mean $\frac{1}{\lambda}$; some texts parametrize by the mean instead. State which.
- **Real waits often have memory**: a component that wears out fails more often as it ages; use a Weibull or gamma model instead.
- **Minimum versus sum**: the minimum of exponentials is exponential; the sum is gamma, not exponential.

Connects to: [geometric distribution](#/concept/prob.distributions.geometric-distribution), [Poisson processes](#/concept/prob.stochastic.poisson-processes), [beta and gamma distributions](#/concept/prob.distributions.beta-and-gamma-distributions).

### questions
Q: What are the mean and variance of an exponential distribution with rate lambda?
A: The mean is 1 over lambda and the variance 1 over lambda squared, so the standard deviation equals the mean. The median is ln 2 over lambda, below the mean because of the long right tail.

Q: What does memorylessness mean for an exponential waiting time?
A: Given that you have already waited s, the remaining wait has the same exponential distribution as a fresh wait. After waiting 10 minutes for a bus that arrives at rate one per 10 minutes, you still expect to wait 10 more.

Q: What is the distribution of the minimum of independent exponential variables?
A: Exponential with rate equal to the sum of the rates, and the probability that a particular one is the minimum is its rate divided by the total rate.

Q: How do you simulate an exponential random variable from a uniform one?
A: Use inverse transform sampling: X equals minus the natural log of one minus U, divided by lambda, where U is uniform on 0 to 1.

Q: Why does the gap between buses you arrive in seem longer than average?
A: Arriving at a random time, you are more likely to land in a long gap than a short one, because long gaps cover more time. With exponential gaps of mean 10 minutes, the gap you land in averages 20 minutes.

## prob.distributions.normal-distribution
name: "Normal distribution"
importance: must
scope: "properties, standardization, 68-95-99.7 rule"

### simple
The normal distribution is the familiar bell curve: most values sit near the average, and values far away are increasingly rare in a symmetric way. Heights, measurement errors and sums of many small random effects all look roughly normal. Knowing only its mean and spread, you can say how often values fall within one, two or three spreads of the average.

### interview
- Density $f(x) = \frac{1}{\sigma\sqrt{2\pi}}e^{-(x - \mu)^2 / (2\sigma^2)}$, written $N(\mu, \sigma^2)$; symmetric around $\mu$, which is also the median and mode.
- **Standardize**: $Z = \frac{X - \mu}{\sigma} \sim N(0, 1)$, so $P(X \le x) = \Phi\left(\frac{x - \mu}{\sigma}\right)$, with $\Phi$ the standard normal CDF.
- **68-95-99.7 rule**: within 1, 2, 3 standard deviations: 68.27%, 95.45%, 99.73%. The 95% two-sided cutoff is $\pm 1.96$; one-sided 95% is 1.645.
- **Closed under linear maps and independent sums**: $aX + b \sim N(a\mu + b, a^2\sigma^2)$; independent normals add with means and variances adding.
- It appears through the **central limit theorem**: sums of many independent small effects are approximately normal.
- Tails are thin: 5 standard deviations happens about 6 in 10 million times, which is why real markets, with fatter tails, surprise normal models.

### deep
#### Worked example: heights

Assume adult heights are $N(170, 8^2)$ cm (a model, reasonable only near the middle of the range).

- $P(\text{height} > 186) = P(Z > 2) = 1 - \Phi(2) \approx 0.02275$.
- $P(162 < \text{height} < 178) = P(-1 < Z < 1) \approx 0.6827$.
- The 90th percentile: $\Phi^{-1}(0.9) \approx 1.2816$, so $170 + 8 \cdot 1.2816 \approx 180.3$ cm.

#### Worked example: sums

Two independent normal measurements, $N(10, 3^2)$ and $N(5, 4^2)$: their sum is $N(15, 25)$, standard deviation 5 (not 7), so $P(\text{sum} > 25) = P(Z > 2) \approx 0.0228$. Their difference is $N(5, 25)$: variances add even for differences.

#### Computing $\Phi$ exactly

$\Phi$ has no elementary closed form, but it is a standard special function: $\Phi(z) = \frac{1}{2}\text{erfc}\left(-\frac{z}{\sqrt{2}}\right)$, which C++ provides as `std::erfc`. The program computes the rule's percentages that way and checks them with normal samples made by the Box-Muller transform.

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {                                // Box-Muller: N(0, 1) from two uniforms
    double u = 1 - u01(), v = u01();             // u in (0, 1], so log(u) is finite
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

int main() {
    const long n = 4'000'000;
    long within[4] = {}, tall = 0, bigSum = 0;
    for (long t = 0; t < n; ++t) {
        double z = normal();
        for (int k = 1; k <= 3; ++k) within[k] += fabs(z) <= k;
        tall += 170 + 8 * normal() > 186;
        bigSum += (10 + 3 * normal()) + (5 + 4 * normal()) > 25;
    }
    for (int k = 1; k <= 3; ++k)
        printf("within %d sd: exact %.5f  simulated %.5f\n", k, Phi(k) - Phi(-k),
               double(within[k]) / n);
    printf("height > 186: exact %.5f  simulated %.5f\n", 1 - Phi(2), double(tall) / n);
    printf("sum > 25:     exact %.5f  simulated %.5f\n", 1 - Phi(2), double(bigSum) / n);
    printf("5 sd or more (two-sided): %.2e\n", 2 * (1 - Phi(5)));
}
```

Output:

```text
within 1 sd: exact 0.68269  simulated 0.68302
within 2 sd: exact 0.95450  simulated 0.95460
within 3 sd: exact 0.99730  simulated 0.99733
height > 186: exact 0.02275  simulated 0.02285
sum > 25:     exact 0.02275  simulated 0.02271
5 sd or more (two-sided): 5.73e-07
```

Every simulated probability is within 1.4 standard errors of the value computed from `erfc`, and the two-sided 5-sigma probability, $5.7 \times 10^{-7}$, shows how thin normal tails are.

#### Pitfalls

- **Adding standard deviations**: independent normals with standard deviations 3 and 4 sum to standard deviation 5.
- **Assuming normality in the tails**: daily stock returns have far more 5-sigma days than a normal predicts; use the normal for the middle, not for crash risk.
- **Correlated sums**: for dependent normals, add $2\,\text{Cov}$ to the variance; and marginally normal variables need not be jointly normal.

Connects to: [central limit theorem](#/concept/prob.limits.central-limit-theorem), [lognormal distribution](#/concept/prob.distributions.lognormal-distribution), [confidence intervals](#/concept/prob.statistics.confidence-intervals).

### questions
Q: How do you find a probability for a normal variable with mean mu and standard deviation sigma?
A: Standardize: subtract mu and divide by sigma to get a standard normal Z, then use the standard normal CDF. For example, a height 2 standard deviations above the mean has about a 2.3 percent chance of being exceeded.

Q: State the 68-95-99.7 rule.
A: For a normal distribution, about 68.3 percent of values lie within one standard deviation of the mean, 95.4 percent within two and 99.7 percent within three. The exact 95 percent two-sided cutoff is 1.96 standard deviations.

Q: What is the distribution of the sum of two independent normal variables?
A: Normal, with mean equal to the sum of the means and variance equal to the sum of the variances. With standard deviations 3 and 4, the sum has standard deviation 5.

Q: Why does the normal distribution appear so often?
A: By the central limit theorem, a sum or average of many independent, not-too-heavy-tailed effects is approximately normal, whatever the individual distributions. Measurement errors and many natural quantities are such sums.

Q: How can you generate normal random numbers from uniform ones?
A: The Box-Muller transform: with independent uniforms U and V, the square root of minus 2 ln U times the cosine of 2 pi V is standard normal. Inverse transform with the normal quantile function also works.

## prob.distributions.lognormal-distribution
name: "Lognormal distribution"
importance: important
prereqs: [prob.distributions.normal-distribution]
scope: "stock price modeling"

### simple
A lognormal quantity is one whose logarithm is normal: it grows by multiplying many random factors rather than adding them. Stock prices are the classic example, since each day's move multiplies the price by something close to one. The result is always positive and has a long right tail, with a few very large values pulling the average above the typical value.

### interview
- $Y = e^X$ with $X \sim N(\mu, \sigma^2)$; equivalently $\ln Y$ is normal. $Y > 0$ always.
- **Median** $e^{\mu}$; **mean** $e^{\mu + \sigma^2/2}$; variance $(e^{\sigma^2} - 1)e^{2\mu + \sigma^2}$. The mean exceeds the median: right skew.
- Products of independent lognormals are lognormal (their logs add); sums are not.
- **Stock model** (geometric Brownian motion): $S_T = S_0 \exp\left((\mu - \frac{\sigma^2}{2})T + \sigma\sqrt{T}Z\right)$, so $E[S_T] = S_0e^{\mu T}$ while the median is $S_0e^{(\mu - \sigma^2/2)T}$.
- **Volatility drag**: the typical (median) growth rate is $\mu - \frac{\sigma^2}{2}$, lower than the average growth rate $\mu$; a +50% then −50% move loses 25%.
- It has all moments but no moment generating function, and its moments don't determine it uniquely.

### deep
#### Why multiplicative growth gives a lognormal

If a price is multiplied each day by a random factor $1 + r_i$, then $\ln S_n = \ln S_0 + \sum \ln(1 + r_i)$: a sum of many independent terms, approximately normal by the central limit theorem. So $S_n$ is approximately lognormal, whatever the daily distribution.

#### Worked example: one year at 20% volatility

Take $S_0 = 100$, a drift $\mu = 0$ and volatility $\sigma = 0.2$ over $T = 1$ year in the model above, so $\ln(S_1/100) \sim N(-0.02, 0.04)$.

- Mean: $E[S_1] = 100e^{0} = 100$.
- Median: $100e^{-0.02} \approx 98.02$: more than half of the paths end *below* the starting price, although the average is unchanged.
- $P(S_1 < 100) = \Phi\left(\frac{0.02}{0.2}\right) = \Phi(0.1) \approx 0.5398$.
- $P(S_1 > 150) = 1 - \Phi\left(\frac{\ln 1.5 + 0.02}{0.2}\right) = 1 - \Phi(2.127) \approx 0.0167$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {                                // Box-Muller
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

int main() {
    const double s0 = 100, sigma = 0.2, drift = -sigma * sigma / 2;   // mu = 0
    const long n = 2'000'000;
    vector<double> prices(n);
    double sum = 0;
    long below = 0, above150 = 0;
    for (auto& s : prices) {
        s = s0 * exp(drift + sigma * normal());
        sum += s;
        below += s < 100;
        above150 += s > 150;
    }
    nth_element(prices.begin(), prices.begin() + n / 2, prices.end());
    printf("mean:     exact %.3f  simulated %.3f\n", s0, sum / n);
    printf("median:   exact %.3f  simulated %.3f\n", s0 * exp(drift), prices[n / 2]);
    printf("P(< 100): exact %.5f  simulated %.5f\n", Phi(0.1), double(below) / n);
    printf("P(> 150): exact %.5f  simulated %.5f\n", 1 - Phi((log(1.5) - drift) / sigma),
           double(above150) / n);
    printf("+50%% then -50%%: %.0f -> %.0f -> %.0f\n", s0, s0 * 1.5, s0 * 1.5 * 0.5);
}
```

Output:

```text
mean:     exact 100.000  simulated 99.981
median:   exact 98.020  simulated 98.015
P(< 100): exact 0.53983  simulated 0.54020
P(> 150): exact 0.01670  simulated 0.01663
+50% then -50%: 100 -> 150 -> 75
```

All four estimates are within 1.3 standard errors of the exact values: in particular 54% of the simulated paths end below 100 although their average stays at 100.

#### Pitfalls

- **Using the normal for prices**: a normal model allows negative prices and symmetric moves; the lognormal does not.
- **Confusing arithmetic and geometric returns**: averaging returns overstates compound growth by about $\frac{\sigma^2}{2}$ per year.
- **Real returns are not exactly lognormal**: fat tails and volatility clustering matter for risk; the lognormal is the baseline behind Black-Scholes, not a law of nature.

Connects to: [normal distribution](#/concept/prob.distributions.normal-distribution), [Brownian motion intuition](#/concept/prob.stochastic.brownian-motion-intuition), [Black-Scholes intuition](#/concept/markets.options.black-scholes-intuition).

### questions
Q: What is a lognormal random variable?
A: A positive variable whose natural logarithm is normally distributed, such as e to the power of a normal variable. It arises from multiplying many independent random factors.

Q: What are the median and mean of a lognormal variable with log-mean mu and log-variance sigma squared?
A: The median is e to the mu and the mean is e to the mu plus sigma squared over 2. The mean exceeds the median because of the long right tail.

Q: Why are stock prices often modeled as lognormal?
A: Returns compound multiplicatively, so the log of the price is a sum of many small random log-returns, approximately normal by the central limit theorem. The model also keeps prices positive.

Q: What is volatility drag?
A: With volatility sigma, the typical compound growth rate is lower than the average growth rate by about sigma squared over 2. A 50 percent gain followed by a 50 percent loss leaves you down 25 percent even though the average return was zero.

Q: Is the sum of two independent lognormal variables lognormal?
A: No. Products of independent lognormals are lognormal because their logs add, but sums are not; a portfolio of lognormal stocks is only approximately lognormal.

## prob.distributions.beta-and-gamma-distributions
name: "Beta and gamma distributions"
importance: advanced
prereqs: [prob.distributions.exponential-distribution]
scope: "Beta and gamma distributions"

### simple
The gamma distribution describes the total waiting time for several events that arrive at a steady random rate, such as the time until the third customer. The beta distribution lives between 0 and 1 and describes uncertainty about a probability itself, like how biased a coin might be. Both are flexible families that include simpler distributions as special cases.

### interview
- **Gamma($k, \lambda$)** (shape $k$, rate $\lambda$): density $\frac{\lambda^k x^{k-1}e^{-\lambda x}}{\Gamma(k)}$ for $x > 0$; mean $\frac{k}{\lambda}$, variance $\frac{k}{\lambda^2}$.
- For whole-number $k$ (the **Erlang** case) it is the sum of $k$ independent Exp($\lambda$) waits: the time of the $k$-th event of a Poisson process. $k = 1$ is the exponential; the chi-square with $d$ degrees of freedom is Gamma($\frac{d}{2}, \frac{1}{2}$).
- **Beta($a, b$)** on $[0, 1]$: density proportional to $x^{a-1}(1-x)^{b-1}$; mean $\frac{a}{a+b}$, variance $\frac{ab}{(a+b)^2(a+b+1)}$. Beta(1, 1) is Uniform(0, 1).
- The $k$-th smallest of $n$ independent uniforms is Beta($k, n + 1 - k$), so its mean is $\frac{k}{n+1}$.
- **Conjugate prior**: with a Beta($a, b$) prior on a coin's $p$, after $h$ heads and $t$ tails the posterior is Beta($a + h, b + t$).
- Shapes vary a lot: Beta(0.5, 0.5) piles up at both ends, Beta(5, 5) peaks at one half; small gamma shapes are very skewed, large ones look normal.

### deep
#### Gamma as a sum of waits

Customers arrive as a Poisson process at 2 per minute. The time until the third arrival is Gamma(3, 2): mean $\frac{3}{2} = 1.5$ minutes, variance $\frac{3}{4}$. Its CDF links to the Poisson count: the third arrival comes by time $t$ exactly when at least 3 arrivals happen in $[0, t]$:

$$P(T_3 \le 1) = P(\text{Poisson}(2) \ge 3) = 1 - e^{-2}\left(1 + 2 + \frac{4}{2}\right) = 1 - 5e^{-2} \approx 0.3233.$$

#### Beta as an updated belief

You know nothing about a coin's bias $p$, so you start with Beta(1, 1), the uniform prior. After 7 heads in 10 flips, the posterior is Beta(8, 4), with mean $\frac{8}{12} = \frac{2}{3}$ (not the raw $\frac{7}{10}$: the prior pulls slightly toward one half) and variance $\frac{32}{144 \cdot 13} \approx 0.0171$. The posterior probability that the next flip is heads is its mean, $\frac{2}{3}$ (Laplace's rule of succession, $\frac{h+1}{n+2}$).

#### Code

The program builds a Gamma(3, 2) variable as a sum of three exponentials, builds a Beta(8, 4) variable as the 8th smallest of 11 uniforms, and checks the Bayesian update by simulating coins whose bias is drawn from the prior and keeping those that showed 7 heads in 10.

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double expo(double rate) { return -log(1 - u01()) / rate; }

int main() {
    const long n = 1'000'000;
    double g = 0, g2 = 0, b = 0, b2 = 0;
    long byOne = 0;
    for (long t = 0; t < n; ++t) {
        double x = expo(2) + expo(2) + expo(2);  // Gamma(3, 2)
        g += x, g2 += x * x;
        byOne += x <= 1;
        double u[11];
        for (double& v : u) v = u01();
        nth_element(u, u + 7, u + 11);           // the 8th smallest of 11: Beta(8, 4)
        b += u[7], b2 += u[7] * u[7];
    }
    printf("Gamma(3,2): mean %.4f (1.5), variance %.4f (0.75), P(<=1) %.4f (exact %.4f)\n",
           g / n, g2 / n - (g / n) * (g / n), double(byOne) / n, 1 - 5 * exp(-2.0));
    printf("Beta(8,4) via order statistic: mean %.4f (%.4f), variance %.4f (%.4f)\n", b / n,
           8.0 / 12, b2 / n - (b / n) * (b / n), 32.0 / (144 * 13));

    long kept = 0;
    double sumP = 0, nextHeads = 0;
    for (long t = 0; t < 4'000'000; ++t) {
        double p = u01();                        // prior: Beta(1, 1)
        int heads = 0;
        for (int i = 0; i < 10; ++i) heads += u01() < p;
        if (heads != 7) continue;
        ++kept;
        sumP += p;
        nextHeads += u01() < p;
    }
    printf("coins with 7 of 10 heads: %ld; mean p %.4f and next-flip heads %.4f (exact 2/3)\n",
           kept, sumP / kept, nextHeads / kept);
}
```

Output:

```text
Gamma(3,2): mean 1.5009 (1.5), variance 0.7506 (0.75), P(<=1) 0.3230 (exact 0.3233)
Beta(8,4) via order statistic: mean 0.6665 (0.6667), variance 0.0171 (0.0171)
coins with 7 of 10 heads: 364003; mean p 0.6667 and next-flip heads 0.6674 (exact 2/3)
```

All estimates are within 1.3 standard errors of the exact values. The Bayesian check is the most striking: among 4 million simulated coins with random biases, the 364,003 that happened to show 7 heads in 10 flips had average bias 0.6667 and came up heads next 66.74% of the time, matching the Beta(8, 4) posterior.

#### Where they appear

- **Gamma**: total service time of several jobs, insurance claim sizes, the chi-square distribution in tests, rainfall amounts.
- **Beta**: priors and posteriors for rates and click-through probabilities, the distribution of order statistics of uniforms, project-duration estimates (PERT).
- Parametrizations differ (rate versus scale $\theta = \frac{1}{\lambda}$ for the gamma); state yours.

Connects to: [exponential distribution](#/concept/prob.distributions.exponential-distribution), [order statistics](#/concept/prob.distributions.order-statistics), [Bayes' theorem](#/concept/prob.foundations.bayes-theorem), [Poisson processes](#/concept/prob.stochastic.poisson-processes).

### questions
Q: How is the gamma distribution related to the exponential?
A: For a whole-number shape k, a Gamma(k, lambda) variable is the sum of k independent exponential waits with rate lambda, the time of the k-th event of a Poisson process. With k equal to 1 it is the exponential itself.

Q: What are the mean and variance of a Gamma(k, lambda) variable?
A: The mean is k over lambda and the variance k over lambda squared, which follow from adding k independent exponentials.

Q: Why is the beta distribution a natural prior for a probability?
A: It lives on 0 to 1 and is conjugate to Bernoulli data: starting from Beta(a, b) and observing h successes and t failures gives a Beta(a plus h, b plus t) posterior, so updating is just adding counts.

Q: What is the distribution of the k-th smallest of n independent Uniform(0,1) variables?
A: Beta(k, n plus 1 minus k), with mean k over n plus 1. For example the maximum of two uniforms is Beta(2, 1) with mean two thirds.

Q: With a uniform prior, what is the probability of heads on the next flip after 7 heads in 10 flips?
A: Two thirds: the posterior is Beta(8, 4) with mean 8 over 12. This is Laplace's rule of succession, heads plus 1 over flips plus 2.

## prob.distributions.sums-of-random-variables
name: "Sums of random variables"
importance: important
scope: "convolution idea, sums of normals and Poissons"

### simple
When you add independent random quantities, the total has its own distribution, found by considering every way the parts can combine. Two dice combine into the familiar triangle of sums peaking at 7. Some families stay in the family when added: normals add to normals and Poisson counts to Poisson counts.

### interview
- **Discrete convolution**: $P(X + Y = s) = \sum_k P(X = k)\,P(Y = s - k)$ for independent $X, Y$. **Continuous**: $f_{X+Y}(s) = \int f_X(x)f_Y(s - x)\,dx$.
- Means always add; variances add for independent (or uncorrelated) variables.
- **Closed families** (independent summands): normals, $N(\mu_1 + \mu_2, \sigma_1^2 + \sigma_2^2)$; Poissons, Poisson($\lambda_1 + \lambda_2$); binomials with the same $p$, Binomial($n_1 + n_2, p$); gammas with the same rate, shapes add (so exponentials sum to Erlang).
- Not closed: uniforms (two give a triangle), lognormals, and sums of different binomials.
- Tools: convolution directly, moment generating functions (products), or the central limit theorem for many terms.
- Pitfall: convolving dependent variables as if independent.

### deep
#### Worked example: three dice by convolution

The PMF of one die is $\frac{1}{6}$ on 1..6. Convolving twice gives the sum of three dice; in counts out of $6^3 = 216$:

| sum | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | ... | 18 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ways | 1 | 3 | 6 | 10 | 15 | 21 | 25 | 27 | 27 | 25 | ... | 1 |

So $P(10) = P(11) = \frac{27}{216} = \frac{1}{8}$, the most likely totals, and the distribution is symmetric about 10.5, already looking bell-shaped after three terms.

#### Worked example: two uniforms

For independent Uniform(0, 1) variables, $f_{U_1+U_2}(s) = \int_0^1 \mathbf{1}[0 \le s - x \le 1]\,dx$, which is $s$ for $0 \le s \le 1$ and $2 - s$ for $1 \le s \le 2$: a triangle. So $P(U_1 + U_2 \le 0.5) = \frac{0.5^2}{2} = \frac{1}{8}$.

#### Worked example: exponentials add to a gamma

For independent Exp(1) waits, $f_{X+Y}(s) = \int_0^s e^{-x}e^{-(s - x)}\,dx = s\,e^{-s}$, the Gamma(2, 1) density, with $P(X + Y \le 1) = 1 - 2e^{-1} \approx 0.2642$.

#### Code: exact convolution and simulation

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

vector<long> convolve(const vector<long>& a, const vector<long>& b) {   // counts by sum
    vector<long> c(a.size() + b.size() - 1);
    for (size_t i = 0; i < a.size(); ++i)
        for (size_t j = 0; j < b.size(); ++j) c[i + j] += a[i] * b[j];
    return c;
}

int main() {
    vector<long> die = {0, 1, 1, 1, 1, 1, 1};    // index = face value
    auto three = convolve(convolve(die, die), die);
    const long n = 2'000'000;
    long hist[19] = {}, lowU = 0, lowE = 0;
    for (long t = 0; t < n; ++t) {
        ++hist[3 + rng() % 6 + rng() % 6 + rng() % 6];
        lowU += u01() + u01() <= 0.5;
        lowE += -log(1 - u01()) - log(1 - u01()) <= 1;
    }
    for (int s : {3, 7, 10, 11, 14, 18})
        printf("three dice sum %2d: exact %2ld/216 = %.5f  simulated %.5f\n", s, three[s],
               three[s] / 216.0, double(hist[s]) / n);
    printf("P(U1 + U2 <= 0.5): exact %.5f  simulated %.5f\n", 0.125, double(lowU) / n);
    printf("P(E1 + E2 <= 1):   exact %.5f  simulated %.5f\n", 1 - 2 / exp(1.0),
           double(lowE) / n);
}
```

Output:

```text
three dice sum  3: exact  1/216 = 0.00463  simulated 0.00470
three dice sum  7: exact 15/216 = 0.06944  simulated 0.06956
three dice sum 10: exact 27/216 = 0.12500  simulated 0.12496
three dice sum 11: exact 27/216 = 0.12500  simulated 0.12475
three dice sum 14: exact 15/216 = 0.06944  simulated 0.06935
three dice sum 18: exact  1/216 = 0.00463  simulated 0.00455
P(U1 + U2 <= 0.5): exact 0.12500  simulated 0.12535
P(E1 + E2 <= 1):   exact 0.26424  simulated 0.26439
```

The exact convolution counts reproduce the table, and every simulated value is within 1.5 standard errors of them.

#### Pitfalls

- **Dependence**: the sum of a die and "7 minus that die" is always 7, not triangular; convolution needs independence.
- **Adding standard deviations** instead of variances.
- **Assuming family closure**: two uniforms are not uniform; lognormal prices don't sum to a lognormal portfolio.

Connects to: [moments and moment generating functions](#/concept/prob.random-variables.moments-and-moment-generating-functions), [central limit theorem](#/concept/prob.limits.central-limit-theorem), [beta and gamma distributions](#/concept/prob.distributions.beta-and-gamma-distributions).

### questions
Q: How do you find the distribution of the sum of two independent discrete random variables?
A: By convolution: the probability that the sum equals s is the sum over k of P(X equals k) times P(Y equals s minus k). For continuous variables, the density of the sum is the integral of the product of the two densities in the same way.

Q: Which distribution families are closed under adding independent members?
A: Normals (means and variances add), Poissons (rates add), binomials with the same success probability (trial counts add), and gammas with the same rate (shapes add), which includes sums of exponentials.

Q: What is the distribution of the sum of two independent Uniform(0,1) variables?
A: A triangular distribution on 0 to 2 with density s for s up to 1 and 2 minus s after that, peaking at 1.

Q: What is the most likely total when rolling three dice?
A: 10 and 11, each with 27 of the 216 outcomes, which is one eighth.

Q: What is the sum of two independent exponential variables with rate 1?
A: A Gamma(2, 1) variable with density s times e to the minus s, the waiting time until the second event of a rate-1 Poisson process.

## prob.distributions.order-statistics
name: "Order statistics"
importance: important
prereqs: [prob.distributions.uniform-distribution]
scope: "min and max of uniforms, expected kth smallest"

### simple
Order statistics are what you get when you sort random values: the smallest, the second smallest, and so on up to the largest. If you drop several pins at random on a ruler, they tend to split it into roughly equal pieces, so the smallest of n pins lands about 1 over n plus 1 of the way along. Questions about the best, worst or middle of several random draws are order statistic questions.

### interview
- For $n$ independent values with CDF $F$: $P(\max \le x) = F(x)^n$ and $P(\min > x) = (1 - F(x))^n$.
- For Uniform(0, 1): the $k$-th smallest $U_{(k)}$ is Beta($k, n + 1 - k$) with $E[U_{(k)}] = \frac{k}{n+1}$; so $E[\min] = \frac{1}{n+1}$ and $E[\max] = \frac{n}{n+1}$.
- Intuition: $n$ uniform points cut $[0, 1]$ into $n + 1$ gaps, and by symmetry every gap has the same expected length $\frac{1}{n+1}$.
- For exponentials: $\min$ of $n$ Exp($\lambda$) is Exp($n\lambda$); the gaps between sorted exponentials are independent, $X_{(k+1)} - X_{(k)} \sim$ Exp($(n - k)\lambda$), so $E[\max] = \frac{1}{\lambda}H_n$.
- Discrete version: $P(\max \text{ of two dice} \le m) = \frac{m^2}{36}$, so $E[\max] = \frac{161}{36}$.
- Uses: auctions (the highest bid), reliability (the first failure), extremes, medians of samples.

### deep
#### Worked examples

**Max of two uniforms.** $F_{\max}(x) = x^2$, density $2x$, so $E[\max] = \int_0^1 2x^2\,dx = \frac{2}{3}$.

**Min of $n$ uniforms.** $P(\min > x) = (1 - x)^n$, and by the tail formula $E[\min] = \int_0^1 (1-x)^n\,dx = \frac{1}{n+1}$.

**Middle of three.** $U_{(2)}$ of three uniforms is Beta(2, 2), density $6x(1-x)$, mean $\frac{1}{2}$ and variance $\frac{1}{20}$.

**Max of two dice.** $P(\max \le m) = \frac{m^2}{36}$, so $P(\max = m) = \frac{m^2 - (m-1)^2}{36} = \frac{2m - 1}{36}$ and

$$E[\max] = \sum_{m=1}^6 m\,\frac{2m - 1}{36} = \frac{1 + 6 + 15 + 28 + 45 + 66}{36} = \frac{161}{36} \approx 4.472.$$

**Max of $n$ exponentials** (rate 1): $E = 1 + \frac{1}{2} + \dots + \frac{1}{n}$; for $n = 5$, $\frac{137}{60} \approx 2.2833$. The first of 5 components fails after Exp(5) (mean 0.2), the next after a further Exp(4), and so on.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const long n = 2'000'000;
    double max2 = 0, min5 = 0, mid3 = 0, dice = 0, expMax = 0;
    for (long t = 0; t < n; ++t) {
        max2 += max(u01(), u01());
        double m = 1;
        for (int i = 0; i < 5; ++i) m = min(m, u01());
        min5 += m;
        double x[3] = {u01(), u01(), u01()};
        sort(x, x + 3);
        mid3 += x[1];
        dice += max(rng() % 6, rng() % 6) + 1;
        double e = 0;
        for (int i = 0; i < 5; ++i) e = max(e, -log(1 - u01()));
        expMax += e;
    }
    printf("E[max of 2 uniforms]:     exact %.5f  simulated %.5f\n", 2.0 / 3, max2 / n);
    printf("E[min of 5 uniforms]:     exact %.5f  simulated %.5f\n", 1.0 / 6, min5 / n);
    printf("E[middle of 3 uniforms]:  exact %.5f  simulated %.5f\n", 0.5, mid3 / n);
    printf("E[max of 2 dice]:         exact %.5f  simulated %.5f\n", 161.0 / 36, dice / n);
    printf("E[max of 5 exponentials]: exact %.5f  simulated %.5f\n", 137.0 / 60, expMax / n);
}
```

Output:

```text
E[max of 2 uniforms]:     exact 0.66667  simulated 0.66661
E[min of 5 uniforms]:     exact 0.16667  simulated 0.16684
E[middle of 3 uniforms]:  exact 0.50000  simulated 0.50001
E[max of 2 dice]:         exact 4.47222  simulated 4.47164
E[max of 5 exponentials]: exact 2.28333  simulated 2.28401
```

All five estimates are within 1.7 standard errors of the exact values; the largest gap is for the minimum of 5 uniforms, 0.16684 against $\frac{1}{6}$.

#### Pitfalls

- **Multiplying CDFs needs independence** (and the same distribution, or else multiply the different CDFs).
- **Min versus max formulas**: the maximum uses $F^n$; the minimum uses the survival function $(1 - F)^n$.
- **Discrete ties**: for dice, "max equals $m$" is $\frac{m^2 - (m-1)^2}{36}$, not $\frac{1}{6}$ of anything.

Connects to: [beta and gamma distributions](#/concept/prob.distributions.beta-and-gamma-distributions), [uniform distribution](#/concept/prob.distributions.uniform-distribution), [auctions](#/concept/markets.game-theory.auctions).

### questions
Q: What is the expected value of the smallest of n independent Uniform(0,1) variables?
A: 1 over n plus 1. The probability that the minimum exceeds x is one minus x to the power n, and integrating that from 0 to 1 gives 1 over n plus 1.

Q: What is the expected larger of two independent uniforms on 0 to 1?
A: Two thirds. The maximum has CDF x squared and density 2x, whose mean is two thirds.

Q: What is the expected value of the larger of two fair dice?
A: 161 over 36, about 4.47. The maximum is at most m with probability m squared over 36, so it equals m with probability 2m minus 1 over 36.

Q: What is the distribution of the k-th smallest of n uniforms?
A: Beta with parameters k and n plus 1 minus k, with mean k over n plus 1. The n points split the interval into n plus 1 gaps with equal expected lengths.

Q: What is the expected time until the last of 5 independent components with exponential lifetimes of rate 1 fails?
A: 1 plus a half plus a third plus a quarter plus a fifth, about 2.28. After each failure the time to the next is exponential with rate equal to the number still working.
