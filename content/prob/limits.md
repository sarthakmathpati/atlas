---
topic: prob.limits
name: "Limit theorems and inequalities"
subject: prob
order: 6
prereqs: [prob.distributions]
---

## prob.limits.law-of-large-numbers
name: "Law of large numbers"
importance: must
scope: "averages converge"

### simple
The law of large numbers says that the average of many independent repetitions settles down to the true expected value. Flip a fair coin ten times and you might see 70% heads; flip it a million times and you will be very close to 50%. It is why casinos and insurers can count on averages even though each single bet or claim is unpredictable.

### interview
- For independent, identically distributed $X_i$ with finite mean $\mu$, the sample mean $\bar{X}_n = \frac{1}{n}\sum X_i \to \mu$.
- **Weak law**: $P(|\bar{X}_n - \mu| \ge \varepsilon) \to 0$ for every $\varepsilon > 0$; with finite variance, Chebyshev gives it directly: $P(|\bar X_n - \mu| \ge \varepsilon) \le \frac{\sigma^2}{n\varepsilon^2}$. **Strong law**: $\bar{X}_n \to \mu$ with probability 1.
- The typical error shrinks like $\frac{\sigma}{\sqrt{n}}$: 100 times more data for one more correct digit.
- It works by **dilution, not compensation**: an early excess of heads is not "corrected" by later tails; it is swamped by the growing total. This is why the gambler's fallacy is a fallacy.
- It needs a finite mean: averages of Cauchy variables (the ratio of two independent standard normals) never settle.
- It is the justification for Monte Carlo simulation and for frequency interpretations of probability.

### deep
#### Why it works

$\text{Var}(\bar{X}_n) = \frac{\sigma^2}{n}$, so the sample mean's spread shrinks toward zero; Chebyshev's inequality turns shrinking variance into shrinking probability of a big miss. The strong law says more: along almost every single infinite sequence, the running average converges.

#### Worked example: how fast?

For a fair die, $\mu = 3.5$ and $\sigma^2 = \frac{35}{12}$. With $n = 1000$ rolls, Chebyshev bounds $P(|\bar{X} - 3.5| \ge 0.1)$ by $\frac{35/12}{1000 \cdot 0.01} \approx 0.29$. The real probability is far smaller, about 0.065 by the normal approximation with a continuity correction (the [central limit theorem](#/concept/prob.limits.central-limit-theorem)): Chebyshev is a guarantee, not an estimate.

#### Dilution, not compensation

Suppose the first 10 flips are all heads. The expected number of heads after $n$ more flips is $10 + \frac{n}{2}$: the excess of 10 heads never goes away in count, but as a *fraction* it becomes $\frac{10 + n/2}{10 + n} \to \frac{1}{2}$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {                                // Box-Muller
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

int main() {
    double sum = 0, cauchySum = 0;
    long checkpoint = 10;
    printf("       n   die average   error   Cauchy average\n");
    for (long n = 1; n <= 10'000'000; ++n) {
        sum += double(rng() % 6 + 1);
        cauchySum += normal() / normal();        // no mean: averages never settle
        if (n == checkpoint) {
            printf("%8ld   %.5f   %+.5f   %+.3f\n", n, sum / n, sum / n - 3.5, cauchySum / n);
            checkpoint *= 10;
        }
    }
    long far = 0;                                // P(|average of 1000 rolls - 3.5| >= 0.1)
    const long reps = 100'000;
    for (long r = 0; r < reps; ++r) {
        double s = 0;
        for (int i = 0; i < 1000; ++i) s += double(rng() % 6 + 1);
        far += fabs(s / 1000 - 3.5) >= 0.1;
    }
    printf("P(miss by 0.1 with 1000 rolls): Chebyshev bound %.4f, simulated %.4f\n",
           (35.0 / 12) / (1000 * 0.01), double(far) / reps);
}
```

Output:

```text
       n   die average   error   Cauchy average
      10   4.10000   +0.60000   +2.505
     100   3.20000   -0.30000   +2.293
    1000   3.41500   -0.08500   +2.326
   10000   3.52100   +0.02100   -3.395
  100000   3.49861   -0.00139   +1.484
 1000000   3.50100   +0.00100   -8.824
10000000   3.50015   +0.00015   +1.940
P(miss by 0.1 with 1000 rolls): Chebyshev bound 0.2917, simulated 0.0653
```

The die average's error shrinks roughly like $\frac{1}{\sqrt n}$, from 0.6 after 10 rolls to 0.00015 after ten million, while the Cauchy average keeps jumping: it was $-8.8$ after a million draws and back to 1.9 after ten million. For 1,000 rolls, the simulated chance of missing 3.5 by 0.1 or more, 0.0653 (standard error 0.0008), is far below Chebyshev's guarantee of 0.29 and matches the corrected normal approximation, 0.0654.

#### Pitfalls

- **The gambler's fallacy**: after a streak, the next flip is still 50/50; the law says nothing about individual outcomes.
- **Dependence**: averages of strongly dependent observations (all polls from one neighborhood) can converge to the wrong value or not at all.
- **Heavy tails**: with infinite variance the law may still hold but slowly; with no mean (Cauchy) it fails outright.
- **"Law of small numbers"**: expecting small samples to look like the population is a common reasoning error.

Connects to: [central limit theorem](#/concept/prob.limits.central-limit-theorem), [Markov and Chebyshev inequalities](#/concept/prob.limits.markov-and-chebyshev-inequalities), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation).

### questions
Q: What does the law of large numbers say?
A: For independent, identically distributed variables with a finite mean, the average of the first n values converges to the mean as n grows. The weak law says large deviations become improbable; the strong law says the average converges with probability 1.

Q: After 10 heads in a row, is tails more likely on the next flip?
A: No. The flips are independent, so the next one is still 50/50. The law of large numbers works by dilution: the early excess of heads is swamped by many later flips, not cancelled by a run of tails.

Q: How quickly does a sample average converge?
A: Its standard deviation is sigma over the square root of n, so the error shrinks like 1 over the square root of n. Each extra decimal digit of accuracy needs about 100 times more samples.

Q: When does the law of large numbers fail?
A: When the mean does not exist, as for the Cauchy distribution, whose sample averages have the same distribution as a single draw and never settle; or when observations are strongly dependent.

Q: How does Chebyshev's inequality prove the weak law?
A: The sample mean has variance sigma squared over n, so Chebyshev bounds the probability of missing the mean by epsilon or more by sigma squared over n epsilon squared, which goes to zero as n grows.

## prob.limits.central-limit-theorem
name: "Central limit theorem"
importance: must
prereqs: [prob.limits.law-of-large-numbers]
scope: "sums become normal, using it for approximations"

### simple
The central limit theorem says that adding up many independent random pieces produces a bell curve, whatever the pieces look like. A single die is flat, two dice make a triangle, and a hundred dice make a near-perfect bell. That is why the normal distribution appears everywhere and why you can estimate probabilities for sums using only a mean and a standard deviation.

### interview
- For i.i.d. $X_i$ with mean $\mu$ and finite variance $\sigma^2$: $\frac{S_n - n\mu}{\sigma\sqrt{n}} \to N(0, 1)$ in distribution, where $S_n = \sum_{i=1}^n X_i$. Equivalently $\bar{X}_n \approx N(\mu, \frac{\sigma^2}{n})$.
- **Use it**: $P(S_n \le s) \approx \Phi\left(\frac{s - n\mu}{\sigma\sqrt{n}}\right)$; for integer-valued sums, add a **continuity correction** of 0.5.
- **Accuracy**: good in the middle for moderate $n$ (dice: $n$ around 10; fair coins: $np(1-p) \ge 10$); worse for skewed summands and in the far tails.
- Conditions matter: independence (or weak dependence) and finite variance. Heavy-tailed sums converge to other (stable) laws or very slowly.
- It explains why errors of averages scale as $\frac{\sigma}{\sqrt n}$ and underlies confidence intervals, A/B tests and the Brownian limit of random walks.
- Classic interview numbers: 100 fair flips have mean 50 and standard deviation 5; 100 dice have mean 350 and standard deviation about 17.1.

### deep
#### Worked example 1: 100 fair coin flips, at least 60 heads

$S \sim$ Binomial(100, 0.5): mean 50, standard deviation 5. With the continuity correction, $P(S \ge 60) = P(S \ge 59.5) \approx 1 - \Phi\left(\frac{9.5}{5}\right) = 1 - \Phi(1.9) \approx 0.02872$. The exact binomial tail is $0.02844$. Without the correction, $1 - \Phi(2) = 0.02275$, noticeably worse.

#### Worked example 2: 100 dice

Mean $350$, variance $100 \cdot \frac{35}{12} \approx 291.67$, standard deviation $\approx 17.08$. $P(S \ge 370) \approx 1 - \Phi\left(\frac{369.5 - 350}{17.08}\right) = 1 - \Phi(1.142) \approx 0.1268$. The exact value comes from convolving the die distribution 100 times.

#### Code: exact tails, the normal approximation and simulation

```cpp
mt19937_64 rng(2026);                            // fixed seed
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

vector<double> sumOfDice(int n) {                // exact distribution by repeated convolution
    vector<double> dist = {1.0};                 // index = total
    for (int k = 0; k < n; ++k) {
        vector<double> next(dist.size() + 6, 0.0);
        for (size_t s = 0; s < dist.size(); ++s)
            for (int f = 1; f <= 6; ++f) next[s + f] += dist[s] / 6;
        dist = next;
    }
    return dist;
}

int main() {
    double coinTail = 0;                         // P(Binomial(100, 1/2) >= 60)
    for (int k = 60; k <= 100; ++k)
        coinTail += exp(lgamma(101.0) - lgamma(k + 1.0) - lgamma(101.0 - k) - 100 * log(2.0));
    auto dice = sumOfDice(100);
    double diceTail = 0;
    for (size_t s = 370; s < dice.size(); ++s) diceTail += dice[s];
    double sd = sqrt(100 * 35.0 / 12);

    const long n = 1'000'000;
    long coins60 = 0, dice370 = 0;
    for (long t = 0; t < n; ++t) {
        int heads = __builtin_popcountll(rng() & ((1ULL << 50) - 1)) +
                    __builtin_popcountll(rng() & ((1ULL << 50) - 1));   // 100 fair bits
        coins60 += heads >= 60;
        int total = 0;
        for (int i = 0; i < 100; ++i) total += int(rng() % 6) + 1;
        dice370 += total >= 370;
    }
    printf("100 flips, >= 60 heads: exact %.5f, normal %.5f (no correction %.5f), sim %.5f\n",
           coinTail, 1 - Phi(9.5 / 5), 1 - Phi(2.0), double(coins60) / n);
    printf("100 dice, total >= 370: exact %.5f, normal %.5f, sim %.5f\n", diceTail,
           1 - Phi(19.5 / sd), double(dice370) / n);
}
```

Output:

```text
100 flips, >= 60 heads: exact 0.02844, normal 0.02872 (no correction 0.02275), sim 0.02829
100 dice, total >= 370: exact 0.12695, normal 0.12677, sim 0.12695
```

The corrected normal approximation is within 0.0003 of both exact tails, while leaving out the correction misses the coin tail by 20%. The simulations, a million trials each, agree with the exact values to within 0.0002, less than one standard error.

#### When it misleads

- **Skewed summands and small $n$**: the sum of 10 exponentials is still visibly skewed; tail probabilities can be off by a factor of 2.
- **Far tails**: the CLT describes the middle of the distribution. Probabilities like $10^{-6}$ need large-deviation or exact methods.
- **Dependent data**: correlated returns or clustered samples have a larger variance of the sum than $n\sigma^2$; the $\frac{1}{\sqrt n}$ rule overstates precision.
- **Infinite variance**: sums of Pareto-tailed variables with tail exponent below 2 do not become normal.

Connects to: [law of large numbers](#/concept/prob.limits.law-of-large-numbers), [normal distribution](#/concept/prob.distributions.normal-distribution), [confidence intervals](#/concept/prob.statistics.confidence-intervals).

### questions
Q: What does the central limit theorem say?
A: For independent, identically distributed variables with finite mean and variance, the standardized sum, the sum minus n mu divided by sigma root n, converges in distribution to a standard normal. Sums and averages of many such variables are approximately normal.

Q: What is the probability of at least 60 heads in 100 fair flips?
A: About 0.028. The count has mean 50 and standard deviation 5; with a continuity correction, 59.5 is 1.9 standard deviations above the mean, giving about 0.0287, close to the exact 0.0284.

Q: What is a continuity correction?
A: When approximating an integer-valued distribution by a continuous normal, shift the boundary by one half, for example use 59.5 for "at least 60", so each integer's probability mass is covered by the matching interval.

Q: When is the normal approximation from the CLT poor?
A: With few terms of a skewed distribution, in the far tails, with dependent terms, and when the variance is infinite. In those cases use exact calculations, simulation or other limit laws.

Q: Why do averages have error proportional to 1 over the square root of n?
A: The variance of the average of n independent terms is sigma squared over n, so its standard deviation is sigma over root n, and by the CLT the average is approximately normal with that spread.

## prob.limits.markov-and-chebyshev-inequalities
name: "Markov and Chebyshev inequalities"
importance: important
scope: "bounding tails"

### simple
Markov's and Chebyshev's inequalities give guaranteed limits on how often a random quantity can be extreme, knowing only its average and spread. If the average salary is 50,000, at most a fifth of people can earn 250,000 or more, whatever the salary distribution. The bounds are often loose, but they never fail.

### interview
- **Markov**: for $X \ge 0$ and $a > 0$, $P(X \ge a) \le \frac{E[X]}{a}$.
- **Chebyshev**: for finite variance, $P(|X - \mu| \ge k\sigma) \le \frac{1}{k^2}$; at least 75% within 2 standard deviations and 89% within 3, for any distribution.
- Chebyshev is Markov applied to $(X - \mu)^2$.
- They are **worst-case** bounds: for a normal, the true 2-sigma tail is 4.6%, not 25%. Use them when you know nothing else about the distribution, or to prove convergence (the weak law of large numbers).
- Both are **tight** for some distribution: Markov for a two-point distribution at 0 and $a$; Chebyshev for three points at $\mu$ and $\mu \pm k\sigma$.
- Sharper tools: one-sided Cantelli $P(X - \mu \ge k\sigma) \le \frac{1}{1 + k^2}$, and Chernoff bounds $P(X \ge a) \le \min_t e^{-ta}E[e^{tX}]$ for sums.

### deep
#### Proofs in one line

Markov: $E[X] \ge E[X\,\mathbf{1}\{X \ge a\}] \ge a\,P(X \ge a)$, because $X$ is non-negative. Chebyshev: apply Markov to $(X - \mu)^2 \ge 0$ with threshold $k^2\sigma^2$: $P((X - \mu)^2 \ge k^2\sigma^2) \le \frac{\sigma^2}{k^2\sigma^2}$.

#### How loose are they?

| situation | bound | true value |
|---|---|---|
| Exponential(1): $P(X \ge 3)$ | Markov: $\frac{1}{3}$ | $e^{-3} \approx 0.0498$ |
| Normal: $P(\lvert Z \rvert \ge 2)$ | Chebyshev: $\frac{1}{4}$ | $0.0455$ |
| 100 dice: $P(\lvert S - 350 \rvert \ge 40)$ | Chebyshev: $\frac{291.67}{1600} \approx 0.182$ | about 0.02 |
| two-point: $X = 0$ or $3$ with $P(3) = \frac{1}{3}$ | Markov: $P(X \ge 3) \le \frac{1}{3}$ | exactly $\frac{1}{3}$ |

The last row shows Markov cannot be improved without more information: this distribution has mean 1 and puts all its "extra" mass at exactly $a = 3$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

int main() {
    const long n = 1'000'000;
    long expTail = 0, diceTail = 0;
    for (long t = 0; t < n; ++t) {
        expTail += -log(1 - u01()) >= 3;
        int s = 0;
        for (int i = 0; i < 100; ++i) s += int(rng() % 6) + 1;
        diceTail += abs(s - 350) >= 40;
    }
    printf("Exp(1), P(X >= 3):     Markov %.4f  exact %.4f  simulated %.4f\n", 1.0 / 3, exp(-3.0),
           double(expTail) / n);
    printf("Normal, P(|Z| >= 2):   Chebyshev %.4f  exact %.4f\n", 0.25, 2 * (1 - Phi(2)));
    printf("100 dice, |S-350|>=40: Chebyshev %.4f  normal approx %.4f  simulated %.4f\n",
           100 * 35.0 / 12 / 1600, 2 * (1 - Phi(39.5 / sqrt(100 * 35.0 / 12))),
           double(diceTail) / n);
}
```

Output:

```text
Exp(1), P(X >= 3):     Markov 0.3333  exact 0.0498  simulated 0.0500
Normal, P(|Z| >= 2):   Chebyshev 0.2500  exact 0.0455
100 dice, |S-350|>=40: Chebyshev 0.1823  normal approx 0.0207  simulated 0.0204
```

The simulations match the exact tails to within 0.0003, and the bounds are 5 to 9 times larger than the truth here: the price of using only a mean or a variance.

#### When to reach for them

- A proof or guarantee that must hold for **any** distribution with a given mean or variance (risk limits, algorithm analysis, the weak law of large numbers).
- A quick sanity check: if a claimed probability violates Markov, the claim is wrong.
- Not for estimating actual probabilities when you know the distribution shape; use the distribution itself, the CLT, or a Chernoff bound.

Connects to: [law of large numbers](#/concept/prob.limits.law-of-large-numbers), [variance and standard deviation](#/concept/prob.random-variables.variance-and-standard-deviation), [moments and moment generating functions](#/concept/prob.random-variables.moments-and-moment-generating-functions).

### questions
Q: State Markov's inequality.
A: For a non-negative random variable X and any positive a, the probability that X is at least a is at most E[X] divided by a. With a mean salary of 50,000, at most one fifth of people can earn 250,000 or more.

Q: State Chebyshev's inequality.
A: For a variable with mean mu and finite standard deviation sigma, the probability of being at least k sigma from the mean is at most 1 over k squared. So at least 75 percent of any distribution lies within two standard deviations.

Q: How does Chebyshev's inequality follow from Markov's?
A: Apply Markov's inequality to the non-negative variable X minus mu squared with threshold k squared sigma squared; its mean is sigma squared, so the bound is 1 over k squared.

Q: Are these bounds tight?
A: They can be attained by specific distributions, such as a two-point distribution for Markov, so they cannot be improved in general. For familiar distributions like the normal they are very loose: Chebyshev gives 25 percent for a 2-sigma deviation where the normal has 4.6 percent.

Q: What is a Chernoff bound?
A: A bound of the form P(X at least a) at most e to the minus t a times E of e to the t X, minimized over t greater than zero. For sums of independent variables it decays exponentially and is much sharper than Chebyshev.
