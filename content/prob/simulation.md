---
topic: prob.simulation
name: "Monte Carlo and simulation"
subject: prob
order: 11
prereqs: [prob.random-variables]
---

## prob.simulation.monte-carlo-estimation
name: "Monte Carlo estimation"
importance: important
scope: "estimating probabilities and expectations by simulation"

### simple
Monte Carlo estimation answers a probability question by simulating the experiment many times and counting. To estimate the chance of a strange dice event, you roll virtual dice a million times and see how often it happens. The answer is approximate, but you can say how approximate: the error shrinks like one over the square root of the number of trials.

### interview
- Estimate $\theta = E[g(X)]$ by $\hat\theta = \frac{1}{N}\sum_{i=1}^N g(X_i)$ with independent draws; a probability is the case $g = \mathbf 1_A$.
- **Unbiased**, and by the CLT approximately normal with **standard error** $\frac{\sigma_g}{\sqrt N}$, estimated by the sample standard deviation over $\sqrt N$.
- Report a **confidence interval**: $\hat\theta \pm 1.96\,\widehat{\text{SE}}$. For a probability $p$, $\text{SE} = \sqrt{p(1-p)/N}$.
- **Sample size for accuracy $\varepsilon$** at 95%: $N \approx \left(\frac{1.96\,\sigma}{\varepsilon}\right)^2$; each extra digit costs 100 times more samples.
- Rare events need huge $N$ (relative error $\approx \frac{1}{\sqrt{Np}}$); use importance sampling or exact methods instead.
- Use a good generator with a **fixed seed** for reproducible results, and never reuse the same random numbers where independence is assumed.

### deep
#### Worked example: the largest of three dice

Exact first: $P(\max \ge m) = 1 - \left(\frac{m-1}{6}\right)^3$, so

$$E[\max] = \sum_{m=1}^{6}\left(1 - \frac{(m-1)^3}{216}\right) = 6 - \frac{0 + 1 + 8 + 27 + 64 + 125}{216} = 6 - \frac{225}{216} = \frac{119}{24} \approx 4.9583.$$

Its variance is $E[\max^2] - E[\max]^2$, with $E[\max^2] = \sum_m (2m - 1)\,P(\max \ge m) = \frac{5859}{216} \approx 27.125$, giving $\sigma^2 \approx 1.5402$ and $\sigma \approx 1.241$.

The Monte Carlo estimate with $N$ trials has standard error $\frac{1.241}{\sqrt N}$: about 0.0039 for $N = 100{,}000$. To get within $\pm 0.001$ with 95% confidence you need $N \approx (1.96 \cdot 1.241 / 0.001)^2 \approx 5.9$ million trials.

#### Code: estimates, intervals and their coverage

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const double exact = 119.0 / 24;
    for (long n : {1'000L, 100'000L, 10'000'000L}) {
        double sum = 0, sumSq = 0;
        for (long i = 0; i < n; ++i) {
            double m = max({rng() % 6, rng() % 6, rng() % 6}) + 1.0;
            sum += m, sumSq += m * m;
        }
        double mean = sum / n, sd = sqrt((sumSq - n * mean * mean) / (n - 1)), se = sd / sqrt(n);
        printf("N = %8ld: estimate %.4f +- %.4f (95%%), exact %.4f\n", n, mean, 1.96 * se, exact);
    }
    const int reps = 10000;                      // does the 95% interval cover 95% of the time?
    int covered = 0;
    for (int r = 0; r < reps; ++r) {
        double sum = 0, sumSq = 0;
        const int n = 1000;
        for (int i = 0; i < n; ++i) {
            double m = max({rng() % 6, rng() % 6, rng() % 6}) + 1.0;
            sum += m, sumSq += m * m;
        }
        double mean = sum / n, se = sqrt((sumSq - n * mean * mean) / (n - 1) / n);
        covered += fabs(mean - exact) <= 1.96 * se;
    }
    printf("intervals from N = 1000 covered the exact value in %.2f%% of %d runs\n",
           100.0 * covered / reps, reps);
    printf("trials needed for +-0.001 at 95%%: %.0f\n", pow(1.96 * sqrt(1.5402) / 0.001, 2));
}
```

Output:

```text
N =     1000: estimate 4.9460 +- 0.0687 (95%), exact 4.9583
N =   100000: estimate 4.9565 +- 0.0071 (95%), exact 4.9583
N = 10000000: estimate 4.9582 +- 0.0007 (95%), exact 4.9583
intervals from N = 1000 covered the exact value in 95.08% of 10000 runs
trials needed for +-0.001 at 95%: 5916832
```

How close: each estimate is within half a standard error of $\frac{119}{24}$, and the interval width shrinks tenfold for every hundredfold increase in $N$, as $\frac{1}{\sqrt N}$ predicts. The coverage 95.08% of 10,000 intervals is within 0.4 standard errors (about 0.22 percentage points) of the promised 95%. The last line is a calculation, not a simulation: about 5.9 million trials for $\pm 0.001$.

#### Pitfalls

- **Reporting a simulated number without its error**: always give the standard error or an interval.
- **Modulo bias and poor generators**: `rand() % n` with a small-range generator is biased; use a 64-bit engine and a careful mapping.
- **Dependent samples** (Markov chain Monte Carlo, overlapping windows) have larger errors than $\frac{\sigma}{\sqrt N}$ suggests.
- **Rare events**: estimating a probability of $10^{-6}$ to 10% accuracy needs about $10^8$ trials.

Connects to: [law of large numbers](#/concept/prob.limits.law-of-large-numbers), [coding probability questions](#/concept/prob.simulation.coding-probability-questions), [variance reduction ideas](#/concept/prob.simulation.variance-reduction-ideas).

### questions
Q: How does Monte Carlo estimation work?
A: Simulate the random experiment many times independently, compute the quantity of interest each time, and average. By the law of large numbers the average converges to the expected value, and a probability is the average of an indicator.

Q: How accurate is a Monte Carlo estimate?
A: Its standard error is the standard deviation of one sample divided by the square root of the number of samples, so a 95 percent interval is the estimate plus or minus about two standard errors. Accuracy improves only as 1 over root N.

Q: How many simulations do you need to estimate a probability near 0.5 to within 0.001?
A: With 95 percent confidence, about 1.96 squared times 0.25 divided by 0.001 squared, roughly a million trials.

Q: Why are rare events hard to estimate by plain Monte Carlo?
A: The relative error is about 1 over the square root of N times p, so a probability of one in a million needs hundreds of millions of trials for decent accuracy. Importance sampling or exact calculation is better.

Q: Why use a fixed seed in simulations?
A: So the run is reproducible: the same code gives the same numbers, which makes results checkable and bugs traceable. It does not make the estimate exact; it still carries sampling error.

## prob.simulation.coding-probability-questions
name: "Coding probability questions"
importance: important
prereqs: [prob.simulation.monte-carlo-estimation]
scope: "simulating to check an answer"

### simple
When you are not sure about the answer to a probability puzzle, you can write a short program that plays it out many times and counts. It is like testing a recipe by cooking it rather than arguing about it. The simulation only helps if it copies the puzzle's rules exactly, so most of the skill is modeling carefully.

### interview
- Recipe: model one trial exactly as stated, repeat $N$ times with a fixed seed, count, and compare with your answer using the standard error $\sqrt{p(1-p)/N}$.
- **Model the rules, not your solution**: in Monty Hall, code the host's behavior (never opening the prize door), not "switching wins two thirds".
- **Conditioning** means discarding trials where the condition fails (and dividing by the kept count), exactly as the problem's information arrives.
- Common bugs: modulo bias, reusing one random number for two independent things, off-by-one in loops, integer division, and simulating a different question than asked.
- A mismatch of many standard errors means the math or the code is wrong; a match within a couple of standard errors supports (but doesn't prove) the answer.
- In interviews, describe the simulation you would write and what you would expect; in machine coding rounds, write it compactly.

### deep
#### Worked example 1: the birthday problem

With 23 people and 365 equally likely birthdays (ignoring leap days and seasonality), $P(\text{a shared birthday}) = 1 - \prod_{k=0}^{22}\frac{365 - k}{365} \approx 0.5073$. The simulation draws 23 birthdays and checks for a repeat.

#### Worked example 2: Monty Hall, modeled faithfully

The host knows where the prize is, always opens a door that is neither the player's pick nor the prize, and always offers the switch. Switching wins with probability $\frac{2}{3}$.

A common mistaken model: the host opens one of the two other doors *at random*, sometimes revealing the prize; if we keep only the games where the prize was not revealed, switching wins only $\frac{1}{2}$. Both programs run without error; only the first simulates the stated game. That is the main lesson of coding probability questions: the model is the answer.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long n = 2'000'000;
    long shared = 0;
    for (long t = 0; t < n; ++t) {
        bitset<365> seen;
        for (int p = 0; p < 23; ++p) {
            int b = int(rng() % 365);
            if (seen[b]) { ++shared; break; }
            seen[b] = true;
        }
    }
    double exact = 1;
    for (int k = 0; k < 23; ++k) exact *= (365.0 - k) / 365;
    exact = 1 - exact;
    printf("birthday, 23 people: exact %.5f  simulated %.5f  (se %.5f)\n", exact,
           double(shared) / n, sqrt(exact * (1 - exact) / n));

    long switchWins = 0;                         // the real game: the host avoids the prize
    long kept = 0, switchWinsRandomHost = 0;     // the wrong model: a host who opens at random
    for (long t = 0; t < n; ++t) {
        int prize = int(rng() % 3), pick = int(rng() % 3);
        int open = 0;
        while (open == pick || open == prize) ++open;
        if (pick == prize) open = (pick + 1 + int(rng() % 2)) % 3;   // two choices: pick one
        int switched = 3 - pick - open;
        switchWins += switched == prize;
        int randomOpen = (pick + 1 + int(rng() % 2)) % 3;
        if (randomOpen == prize) continue;       // prize revealed: discard this game
        ++kept;
        switchWinsRandomHost += 3 - pick - randomOpen == prize;
    }
    printf("Monty Hall, switching:  exact %.5f  simulated %.5f\n", 2.0 / 3,
           double(switchWins) / n);
    printf("random host, prize not shown, switching: %.5f (a different game: 1/2)\n",
           double(switchWinsRandomHost) / kept);
}
```

Output:

```text
birthday, 23 people: exact 0.50730  simulated 0.50711  (se 0.00035)
Monty Hall, switching:  exact 0.66667  simulated 0.66698
random host, prize not shown, switching: 0.50017 (a different game: 1/2)
```

How close: every estimate is within one standard error of its exact value (about 0.0003 for Monty Hall and 0.0004 for the random-host game, which keeps only about two thirds of the games). Both Monty Hall programs are "correct" code; they answer different questions.

#### A checklist for a simulation you can trust

1. Does each trial follow the problem's rules, including who knows what?
2. Are independent quantities drawn from separate random numbers?
3. Is conditioning done by discarding trials, and is the denominator the kept count?
4. Is the seed fixed and the number of trials large enough for the precision you need?
5. Does the result come with a standard error, and does it agree with the math within about two of them?

Connects to: [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation), [Monty Hall and its variants](#/concept/puzzles.probability.monty-hall-and-its-variants), [birthday problem](#/concept/puzzles.probability.birthday-problem).

### questions
Q: How would you check your answer to a probability puzzle by simulation?
A: Code one trial exactly following the puzzle's rules, run it many times with a fixed seed, count the event, and compare the fraction with your answer using the standard error, the square root of p times one minus p over N. Agreement within about two standard errors supports the answer.

Q: How do you simulate a conditional probability?
A: Run trials, discard those where the condition fails, and compute the fraction of the remaining trials in which the event happens. The standard error uses the number of kept trials.

Q: What is the most common mistake when simulating Monty Hall?
A: Modeling the host incorrectly, for example opening a random door and then discarding games where the prize is revealed, which gives one half for switching. The real host knowingly avoids the prize, which gives two thirds.

Q: What coding bugs commonly corrupt probability simulations?
A: Biased random number mapping such as a small generator with modulo, reusing the same random number for independent events, off-by-one loop bounds, integer division, and conditioning with the wrong denominator.

Q: What is the probability that at least two of 23 people share a birthday?
A: About 0.507, one minus the product of 365 minus k over 365 for k from 0 to 22, assuming 365 equally likely birthdays and ignoring leap days.

## prob.simulation.variance-reduction-ideas
name: "Variance reduction ideas"
importance: advanced
prereqs: [prob.simulation.monte-carlo-estimation]
scope: "antithetic variables, control variates"

### simple
Variance reduction makes a simulation more accurate without running more trials, by using what you already know about the problem. Antithetic sampling pairs each random draw with its mirror image so that errors cancel. Control variates correct each estimate using a related quantity whose true average is known, the way you might adjust a noisy scale using a reference weight.

### interview
- **Antithetic variables**: pair $U$ with $1 - U$ (or $Z$ with $-Z$) and average $g(U)$ and $g(1 - U)$; for monotone $g$ the pair is negatively correlated, so the average's variance drops.
- **Control variates**: estimate $E[Y]$ using $X$ with known $E[X]$: $Y - c(X - E[X])$; the best $c^* = \frac{\text{Cov}(Y, X)}{\text{Var}(X)}$ reduces the variance by the factor $1 - \rho^2$.
- **Importance sampling**: draw from a distribution that makes rare events common and reweight by the likelihood ratio; essential for tail probabilities.
- Others: stratified sampling (fix how many samples fall in each stratum), common random numbers (compare two systems on the same randomness), conditioning (replace a random quantity by its conditional mean).
- Compare methods **per unit of work**: an antithetic pair costs two evaluations.
- In finance: pricing options by simulation uses antithetic paths and control variates (for example the underlying's known forward price, or a similar option with a closed-form price).

### deep
#### Worked example: estimating $E[e^U] = e - 1$

With $U$ uniform on $[0, 1]$, $\theta = e - 1 \approx 1.71828$. Exact variances:

- **Plain**: $\text{Var}(e^U) = \frac{e^2 - 1}{2} - (e - 1)^2 \approx 0.24204$. Two evaluations averaged: $0.12102$.
- **Antithetic**: $\text{Cov}(e^U, e^{1-U}) = E[e] - (e - 1)^2 = e - (e-1)^2 \approx -0.23421$, so $\text{Var}\left(\frac{e^U + e^{1-U}}{2}\right) = \frac{0.24204 - 0.23421}{2} \approx 0.003913$, about 31 times smaller than plain sampling with the same two evaluations.
- **Control variate** $X = U$, $E[U] = \frac{1}{2}$: $\text{Cov}(e^U, U) = E[Ue^U] - \frac{e - 1}{2} = 1 - \frac{e-1}{2} \approx 0.14086$, so $c^* = 12 \times 0.14086 \approx 1.6903$ and the variance of one corrected evaluation becomes $0.24204(1 - \rho^2) \approx 0.003940$, with $\rho^2 \approx 0.98372$. Averaging two of them gives $0.001970$, about 61 times smaller than plain sampling.

Both methods work because $e^U$ is nearly linear in $U$ on $[0, 1]$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

struct Stats {
    long n = 0;
    double mean = 0, m2 = 0;
    void add(double x) { ++n; double d = x - mean; mean += d / n; m2 += d * (x - mean); }
    double var() const { return m2 / (n - 1); }
};

int main() {
    const double e = exp(1.0), theta = e - 1;
    double varPlain = (e * e - 1) / 2 - theta * theta;
    double varAnti = (varPlain + (e - theta * theta)) / 2;
    double cov = 1 - theta / 2, c = cov * 12, varControl = varPlain - cov * cov * 12;
    const long pairs = 1'000'000;
    Stats plain, anti, control;
    for (long i = 0; i < pairs; ++i) {           // each method uses two evaluations per sample
        double u1 = u01(), u2 = u01(), u = u01();
        plain.add((exp(u1) + exp(u2)) / 2);
        anti.add((exp(u) + exp(1 - u)) / 2);
        double v1 = u01(), v2 = u01();
        control.add((exp(v1) - c * (v1 - 0.5) + exp(v2) - c * (v2 - 0.5)) / 2);
    }
    auto line = [&](const char* what, const Stats& s, double exactVar) {
        printf("%-16s estimate %.6f (exact %.6f)  variance per sample %.6f (exact %.6f)\n", what,
               s.mean, theta, s.var(), exactVar);
    };
    line("plain", plain, varPlain / 2);
    line("antithetic", anti, varAnti);
    line("control variate", control, varControl / 2);
    printf("variance reduction: antithetic %.1fx, control variate %.1fx\n",
           plain.var() / anti.var(), plain.var() / control.var());
}
```

Output:

```text
plain            estimate 1.717689 (exact 1.718282)  variance per sample 0.120974 (exact 0.121018)
antithetic       estimate 1.718310 (exact 1.718282)  variance per sample 0.003913 (exact 0.003912)
control variate  estimate 1.718222 (exact 1.718282)  variance per sample 0.001969 (exact 0.001970)
variance reduction: antithetic 30.9x, control variate 61.4x
```

How close: the estimates are within 1.7 standard errors of $e - 1$ (the standard errors are 0.00035 for plain sampling, 0.00006 for antithetic and 0.00004 for the control variate), and each sample variance matches its exact value to within 0.1%. With the same two evaluations per sample, the antithetic pair cuts the variance about 31 times and the control variate about 61 times. Here the control variate wins per evaluation because $U$ is known exactly and costs nothing, while the antithetic partner costs a second evaluation of $e^U$.

#### Pitfalls

- **Antithetic sampling can hurt** when $g$ is not monotone (for a symmetric $g$ the pair can be positively correlated).
- **Estimating $c^*$ from the same samples** introduces a small bias; with many samples it is negligible, or estimate $c$ on a pilot run.
- **Importance sampling with a poor proposal** can have infinite variance; check the weights.

Connects to: [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation), [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [Black-Scholes intuition](#/concept/markets.options.black-scholes-intuition).

### questions
Q: How do antithetic variables reduce variance?
A: Each uniform draw U is paired with 1 minus U, and the two function values are averaged. If the function is monotone, the pair is negatively correlated, so their average varies much less than the average of two independent draws.

Q: What is a control variate?
A: A quantity X correlated with the target Y whose exact mean is known. Estimate E[Y] by averaging Y minus c times X minus E[X]; with the best c, the covariance over the variance of X, the variance falls by the factor 1 minus the squared correlation.

Q: When is importance sampling useful?
A: For rare events or tail expectations: sample from a distribution under which the important outcomes are common, and reweight each sample by the ratio of the true to the sampling density, keeping the estimate unbiased.

Q: How should you compare variance reduction methods fairly?
A: By variance per unit of computing work, since an antithetic pair uses two function evaluations and should be compared with the average of two independent plain samples.

Q: Why do antithetic sampling and control variates work so well for estimating the mean of e to the U?
A: Because e to the U is nearly linear in U on the unit interval, so the mirrored value almost cancels its error and U itself is almost perfectly correlated with it, with a squared correlation of about 0.98.
