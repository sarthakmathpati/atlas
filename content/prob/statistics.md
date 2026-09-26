---
topic: prob.statistics
name: "Statistics"
subject: prob
order: 8
prereqs: [prob.limits]
---

## prob.statistics.sampling-and-estimators
name: "Sampling and estimators"
importance: must
scope: "sample mean and variance, bias, consistency"

### simple
Statistics works backwards from data to the unknown truth that produced it. An estimator is a recipe, like "average the sample", that turns data into a guess about an unknown number. Good recipes are right on average (unbiased), get closer with more data (consistent), and don't wobble much from sample to sample.

### interview
- A **sample** $X_1, \dots, X_n$ of independent draws from a population; an **estimator** $\hat\theta$ is a function of the sample; its **standard error** is its standard deviation across samples.
- **Bias** $E[\hat\theta] - \theta$; **variance**; **mean squared error** $\text{MSE} = \text{bias}^2 + \text{variance}$. A little bias can buy a lot less variance.
- **Sample mean** $\bar X$: unbiased for $\mu$, standard error $\frac{\sigma}{\sqrt n}$.
- **Sample variance** $s^2 = \frac{1}{n-1}\sum (X_i - \bar X)^2$ is unbiased; dividing by $n$ gives expectation $\frac{n-1}{n}\sigma^2$ (too small), because deviations are measured from $\bar X$, which sits closer to the data than $\mu$ does (Bessel's correction).
- **Consistency**: $\hat\theta \to \theta$ as $n \to \infty$ (the law of large numbers for $\bar X$). The sample standard deviation $s$ is consistent but slightly biased low, even though $s^2$ is unbiased.
- Sampling must be random and representative; bias from how data were collected (survivorship, non-response) is not fixed by a larger $n$.

### deep
#### Why divide by $n - 1$

$\sum (X_i - \bar X)^2 = \sum (X_i - \mu)^2 - n(\bar X - \mu)^2$. Taking expectations, $E\left[\sum (X_i - \bar X)^2\right] = n\sigma^2 - n\cdot\frac{\sigma^2}{n} = (n - 1)\sigma^2$. One degree of freedom was used up estimating the mean.

#### Worked example: samples of 5 die rolls

The population is a fair die: $\mu = 3.5$, $\sigma^2 = \frac{35}{12} \approx 2.9167$, $\sigma \approx 1.7078$. For samples of size 5:

- $E[\bar X] = 3.5$, standard error $\frac{1.7078}{\sqrt 5} \approx 0.7638$.
- $E\left[\frac{1}{5}\sum (X_i - \bar X)^2\right] = \frac{4}{5}\cdot\frac{35}{12} = \frac{7}{3} \approx 2.3333$ (biased), while $E[s^2] = \frac{35}{12}$.
- $E[s] < \sigma$ by Jensen's inequality, since the square root is concave; the simulation measures how much.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long reps = 2'000'000;
    const int n = 5;
    double sumMean = 0, sumMean2 = 0, sumBiased = 0, sumUnbiased = 0, sumSd = 0;
    double mseBiased = 0, mseUnbiased = 0;
    const double var = 35.0 / 12;
    for (long r = 0; r < reps; ++r) {
        double x[n], m = 0;
        for (double& v : x) { v = double(rng() % 6 + 1); m += v / n; }
        double ss = 0;
        for (double v : x) ss += (v - m) * (v - m);
        sumMean += m, sumMean2 += m * m;
        sumBiased += ss / n, sumUnbiased += ss / (n - 1), sumSd += sqrt(ss / (n - 1));
        mseBiased += (ss / n - var) * (ss / n - var);
        mseUnbiased += (ss / (n - 1) - var) * (ss / (n - 1) - var);
    }
    double em = sumMean / reps;
    printf("sample mean:       average %.4f (exact 3.5), standard error %.4f (exact %.4f)\n", em,
           sqrt(sumMean2 / reps - em * em), sqrt(var / n));
    printf("divide by n:       average %.4f (exact %.4f)\n", sumBiased / reps, var * (n - 1) / n);
    printf("divide by n - 1:   average %.4f (exact %.4f)\n", sumUnbiased / reps, var);
    printf("sample sd s:       average %.4f (sigma %.4f)\n", sumSd / reps, sqrt(var));
    printf("MSE for variance:  divide by n %.4f, divide by n - 1 %.4f\n", mseBiased / reps,
           mseUnbiased / reps);
}
```

Output:

```text
sample mean:       average 3.5001 (exact 3.5), standard error 0.7633 (exact 0.7638)
divide by n:       average 2.3339 (exact 2.3333)
divide by n - 1:   average 2.9173 (exact 2.9167)
sample sd s:       average 1.6467 (sigma 1.7078)
MSE for variance:  divide by n 1.6793, divide by n - 1 2.0932
```

Both variance estimators average to their exact expectations to within 0.0006, and the sample standard deviation averages 1.647, about 3.6% below $\sigma$ for samples of 5. The last line is the surprise: dividing by $n$ is biased yet has the smaller mean squared error, 1.68 against 2.09.

#### Pitfalls

- **Biased sampling** beats every formula: surveying only customers who stayed, or only funds that survived, misleads no matter how large the sample.
- **Confusing the standard deviation of the data** ($\sigma$) with the standard error of the mean ($\frac{\sigma}{\sqrt n}$).
- **Chasing unbiasedness**: the biased variance estimator above has a *smaller* MSE; what matters depends on the use.

Connects to: [law of large numbers](#/concept/prob.limits.law-of-large-numbers), [maximum likelihood estimation](#/concept/prob.statistics.maximum-likelihood-estimation), [confidence intervals](#/concept/prob.statistics.confidence-intervals).

### questions
Q: Why does the sample variance divide by n minus 1?
A: Deviations are measured from the sample mean, which is closer to the data than the true mean, so the sum of squared deviations averages n minus 1 times sigma squared instead of n times. Dividing by n minus 1 makes the estimator unbiased.

Q: What is the difference between bias, variance and mean squared error of an estimator?
A: Bias is how far the estimator's average is from the truth, variance is how much it fluctuates between samples, and the mean squared error is bias squared plus variance, the average squared distance from the truth.

Q: What is the standard error of the sample mean?
A: Sigma over the square root of n, the standard deviation of the sample mean across repeated samples. It is estimated by s over the square root of n.

Q: Is the sample standard deviation unbiased?
A: No. The sample variance with n minus 1 is unbiased, but the square root is concave, so by Jensen's inequality the average sample standard deviation is slightly below sigma, noticeably so for small samples.

Q: What does it mean for an estimator to be consistent?
A: It converges to the true value as the sample size grows. The sample mean is consistent by the law of large numbers, and so are the sample variance and standard deviation.

## prob.statistics.maximum-likelihood-estimation
name: "Maximum likelihood estimation"
importance: important
prereqs: [prob.statistics.sampling-and-estimators]
scope: "intuition and simple examples"

### simple
Maximum likelihood estimation picks the value of an unknown parameter that makes the data you actually saw most probable. If a coin shows 7 heads in 10 flips, a bias of 0.7 makes that result more likely than any other bias, so 0.7 is the estimate. It is the most common way to fit a model to data.

### interview
- **Likelihood** $L(\theta) = \prod_i f(x_i \mid \theta)$, the probability (or density) of the observed data as a function of the parameter; maximize its log, $\ell(\theta) = \sum_i \ln f(x_i \mid \theta)$.
- **Coin**: $h$ heads in $n$ flips gives $\hat p = \frac{h}{n}$. **Exponential**: $\hat\lambda = \frac{1}{\bar x}$. **Normal**: $\hat\mu = \bar x$ and $\hat\sigma^2 = \frac{1}{n}\sum (x_i - \bar x)^2$ (biased). **Poisson**: $\hat\lambda = \bar x$.
- **Uniform(0, $\theta$)**: $\hat\theta = \max_i x_i$, found by reasoning, not calculus (the likelihood $\theta^{-n}$ decreases, but $\theta$ must exceed every observation). It is biased low: $E[\max] = \frac{n}{n+1}\theta$.
- Good large-sample properties: consistent, asymptotically normal, and as efficient as possible under regularity conditions; small samples can be biased.
- **Invariance**: the MLE of $g(\theta)$ is $g(\hat\theta)$.
- Least squares regression is the MLE under normal errors; logistic regression is fit by maximum likelihood.

### deep
#### Worked example 1: a coin

With $h$ heads in $n$ flips, $\ell(p) = h\ln p + (n - h)\ln(1 - p)$. Setting $\ell'(p) = \frac{h}{p} - \frac{n-h}{1-p} = 0$ gives $\hat p = \frac{h}{n}$. For 7 heads in 10, $\hat p = 0.7$.

#### Worked example 2: serial numbers (the German tank problem)

Tanks (or taxis) are numbered $1..N$; you observe a random sample of 5 serial numbers and want $N$. The discrete MLE is the sample maximum $m$, since $N < m$ is impossible and larger $N$ makes the observed sample less likely. It underestimates on average; the minimum-variance unbiased estimator is $m\left(1 + \frac{1}{k}\right) - 1$ for $k$ observations: with $k = 5$ and $m = 60$, that is $71$. The continuous version, Uniform(0, $\theta$), gives $\hat\theta = \max$ with bias fixed by $\frac{n+1}{n}\max$.

#### Code: bias and error of three estimators of $\theta$

For Uniform(0, 10) samples of size 5, compare the MLE $\max$, the bias-corrected $\frac{6}{5}\max$, and the method-of-moments estimator $2\bar x$ (unbiased, since $E[X] = \frac{\theta}{2}$).

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double theta = 10;
    const int n = 5;
    const long reps = 2'000'000;
    double mean[3] = {}, mse[3] = {};
    for (long r = 0; r < reps; ++r) {
        double mx = 0, sum = 0;
        for (int i = 0; i < n; ++i) {
            double x = theta * u01();
            mx = max(mx, x);
            sum += x;
        }
        double est[3] = {mx, mx * (n + 1) / n, 2 * sum / n};
        for (int k = 0; k < 3; ++k) {
            mean[k] += est[k] / reps;
            mse[k] += (est[k] - theta) * (est[k] - theta) / reps;
        }
    }
    const char* names[] = {"MLE max", "(n+1)/n max", "2 x mean"};
    double exactMean[] = {theta * n / (n + 1.0), theta, theta};
    double exactMse[] = {2 * theta * theta / ((n + 1.0) * (n + 2)),
                         theta * theta / (n * (n + 2.0)), theta * theta / (3.0 * n)};
    for (int k = 0; k < 3; ++k)
        printf("%-12s mean %.4f (exact %.4f)  MSE %.4f (exact %.4f)\n", names[k], mean[k],
               exactMean[k], mse[k], exactMse[k]);

    double pSum = 0;                             // coin: MLE of p from 10 flips, p = 0.7
    for (long r = 0; r < reps; ++r) {
        int h = 0;
        for (int i = 0; i < 10; ++i) h += u01() < 0.7;
        pSum += h / 10.0;
    }
    printf("coin, p = 0.7: average MLE %.4f (unbiased: exact 0.7000)\n", pSum / reps);
}
```

Output:

```text
MLE max      mean 8.3324 (exact 8.3333)  MSE 4.7689 (exact 4.7619)
(n+1)/n max  mean 9.9989 (exact 10.0000)  MSE 2.8626 (exact 2.8571)
2 x mean     mean 9.9978 (exact 10.0000)  MSE 6.6652 (exact 6.6667)
coin, p = 0.7: average MLE 0.7000 (unbiased: exact 0.7000)
```

The exact MSEs come from the Beta distribution of $\frac{\max}{\theta}$ (a Beta(5, 1)): $E[\max] = \frac{5}{6}\theta$ and $E[\max^2] = \frac{5}{7}\theta^2$, so the MLE's MSE is $\theta^2\left(\frac{5}{7} - \frac{10}{6} + 1\right) = \frac{2\theta^2}{42} \approx 4.762$; the corrected estimator has $\frac{\theta^2}{35} \approx 2.857$; and $2\bar x$ has variance $\frac{4}{n}\cdot\frac{\theta^2}{12} = \frac{\theta^2}{15} \approx 6.667$. The simulated means and mean squared errors agree with the exact values to within about 1%, a standard error or so: the MLE is biased low, the corrected maximum is unbiased and the most accurate, and $2\bar x$ is unbiased but has more than twice its error, because it ignores that the maximum carries the most information about $\theta$.

#### Pitfalls

- **Small-sample bias**: the normal variance MLE divides by $n$; the uniform MLE is too small.
- **Boundary maxima**: when the likelihood is maximized at the edge of the allowed range (as for the uniform), setting the derivative to zero finds nothing; think about the shape instead.
- **Overfitting**: with many parameters the MLE fits noise; regularization adds a penalty (see [regularization](#/concept/prob.learning.regularization)).

Connects to: [sampling and estimators](#/concept/prob.statistics.sampling-and-estimators), [order statistics](#/concept/prob.distributions.order-statistics), [linear regression](#/concept/prob.learning.linear-regression), [beta and gamma distributions](#/concept/prob.distributions.beta-and-gamma-distributions).

### questions
Q: What is maximum likelihood estimation?
A: Choosing the parameter value that maximizes the probability, or density, of the observed data, usually by maximizing the log-likelihood, the sum of the log probabilities of the observations.

Q: What is the maximum likelihood estimate of a coin's bias after 7 heads in 10 flips?
A: 0.7. The log-likelihood h ln p plus n minus h times ln of 1 minus p is maximized at p equals h over n.

Q: What is the MLE of theta for a Uniform(0, theta) sample, and is it biased?
A: The sample maximum, since theta must be at least every observation and the likelihood decreases as theta grows. It is biased low, with expectation n over n plus 1 times theta, so multiplying by n plus 1 over n removes the bias.

Q: How would you estimate the number of taxis in a city from 5 observed serial numbers?
A: Use the maximum m, adjusted upward for the gap above it: m times 1 plus 1 over 5, minus 1. With a maximum of 60 that gives 71, which is unbiased and has the smallest variance among unbiased estimators.

Q: What are the main properties of maximum likelihood estimators?
A: Under regularity conditions they are consistent, approximately normal in large samples, and asymptotically efficient, and the MLE of a function of the parameter is that function of the MLE. In small samples they can be biased.

## prob.statistics.confidence-intervals
name: "Confidence intervals"
importance: must
prereqs: [prob.statistics.sampling-and-estimators]
scope: "interpretation and construction"

### simple
A confidence interval is a range computed from data that is meant to contain the true value, built by a method that succeeds a stated fraction of the time, such as 95%. Think of throwing a hoop at a hidden peg: the method lands the hoop around the peg in 95 of 100 throws, but any particular throw either caught it or didn't. Wider intervals mean more uncertainty, and more data makes them narrower.

### interview
- **Known $\sigma$**: $\bar x \pm z_{\alpha/2}\frac{\sigma}{\sqrt n}$, with $z = 1.96$ for 95%.
- **Unknown $\sigma$, normal data**: $\bar x \pm t_{n-1,\alpha/2}\frac{s}{\sqrt n}$; the $t$ critical value (2.262 for $n = 10$) is larger than 1.96 to pay for estimating $\sigma$. For large $n$, $t \approx z$ and the CLT covers non-normal data.
- **Proportions**: the Wald interval $\hat p \pm 1.96\sqrt{\hat p(1-\hat p)/n}$ undercovers for small $n$ or $p$ near 0 or 1; the **Wilson** interval is the better default.
- **Interpretation**: "95% of intervals built this way contain the true value", not "the true value has a 95% chance of being in this interval" (the value is fixed; the interval is random).
- Width scales as $\frac{1}{\sqrt n}$: halving it needs four times the data. Choose $n$ from the required width: $n = \left(\frac{z\sigma}{w}\right)^2$ for half-width $w$.
- Duality with tests: a two-sided test at level $\alpha$ rejects $\theta_0$ exactly when $\theta_0$ is outside the $1 - \alpha$ interval.

### deep
#### What the 95% refers to

Before sampling, the interval's endpoints are random; the procedure is designed so that $P(\text{interval contains } \mu) = 0.95$. After sampling, a particular interval like $[9.1, 11.4]$ either contains $\mu$ or not. The simulation below checks **coverage**: build many intervals from fresh samples and count how often they contain the known truth.

#### Worked example: why $t$ and not $z$

Draw $n = 10$ values from $N(10, 2^2)$. Using $\bar x \pm 1.96\frac{s}{\sqrt n}$ ignores the uncertainty in $s$ and covers less than 95%; the $t$ interval with $t_{9, 0.025} \approx 2.262$ covers exactly 95% when the data are normal. The program computes that critical value itself by integrating the $t$ density.

#### Worked example: a proportion with 20 trials

With $n = 20$ and true $p = 0.1$, the Wald interval is useless whenever $\hat p = 0$ (it has zero width). Its exact coverage is a finite sum over the 21 possible outcomes: $\sum_k P(K = k)\,\mathbf 1[p \in \text{interval}(k)]$, computed below for both Wald and Wilson intervals.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

double tCdf(double x, int nu) {                  // P(T <= x) for x >= 0, Simpson's rule
    double c = exp(lgamma((nu + 1) / 2.0) - lgamma(nu / 2.0)) / sqrt(nu * numbers::pi);
    auto f = [&](double t) { return c * pow(1 + t * t / nu, -(nu + 1) / 2.0); };
    int steps = 20000;
    double h = x / steps, s = f(0) + f(x);
    for (int i = 1; i < steps; ++i) s += f(i * h) * (i % 2 ? 4 : 2);
    return 0.5 + s * h / 3;
}
double tQuantile(double p, int nu) {             // bisection on the CDF
    double lo = 0, hi = 20;
    for (int i = 0; i < 60; ++i) (tCdf((lo + hi) / 2, nu) < p ? lo : hi) = (lo + hi) / 2;
    return lo;
}

int main() {
    const int n = 10;
    double t = tQuantile(0.975, n - 1);
    long zCover = 0, tCover = 0;
    const long reps = 1'000'000;
    for (long r = 0; r < reps; ++r) {
        double x[n], m = 0, ss = 0;
        for (double& v : x) { v = 10 + 2 * normal(); m += v / n; }
        for (double v : x) ss += (v - m) * (v - m);
        double se = sqrt(ss / (n - 1) / n);
        zCover += fabs(m - 10) <= 1.96 * se;
        tCover += fabs(m - 10) <= t * se;
    }
    printf("t critical value, 9 degrees of freedom: %.4f\n", t);
    printf("coverage with 1.96 s/sqrt(n): %.4f;  with t s/sqrt(n): %.4f (target 0.95)\n",
           double(zCover) / reps, double(tCover) / reps);

    const int trials = 20;
    const double p = 0.1, z = 1.96;
    double wald = 0, wilson = 0;
    for (int k = 0; k <= trials; ++k) {          // exact coverage: sum over every outcome
        double prob = exp(lgamma(trials + 1.0) - lgamma(k + 1.0) - lgamma(trials - k + 1.0)) *
                      pow(p, k) * pow(1 - p, trials - k);
        double ph = double(k) / trials;
        wald += prob * (fabs(ph - p) <= z * sqrt(ph * (1 - ph) / trials));
        double denom = 1 + z * z / trials, center = (ph + z * z / (2 * trials)) / denom;
        double half = z * sqrt(ph * (1 - ph) / trials + z * z / (4.0 * trials * trials)) / denom;
        wilson += prob * (fabs(center - p) <= half);
    }
    printf("n = 20, p = 0.1: exact coverage Wald %.4f, Wilson %.4f\n", wald, wilson);
}
```

Output:

```text
t critical value, 9 degrees of freedom: 2.2622
coverage with 1.96 s/sqrt(n): 0.9181;  with t s/sqrt(n): 0.9499 (target 0.95)
n = 20, p = 0.1: exact coverage Wald 0.8760, Wilson 0.9568
```

The numerical integration reproduces the tabulated $t_{9,0.025} = 2.262$. With a million samples (standard error 0.0002), the $1.96\,s$ interval covers only 91.8% while the $t$ interval covers 94.99%. The exact binomial sums show the Wald interval covering only 87.6% for $n = 20$, $p = 0.1$, while Wilson covers 95.7%.

#### Pitfalls

- **"95% probability the parameter is in this interval"**: that is a Bayesian credible interval's meaning, which needs a prior; the confidence interval's 95% is about the procedure.
- **Overlapping intervals do not imply no significant difference**: compare the difference directly.
- **Non-random or dependent samples**: the formulas assume independent draws; clustered data need wider intervals.

Connects to: [hypothesis testing](#/concept/prob.statistics.hypothesis-testing), [central limit theorem](#/concept/prob.limits.central-limit-theorem), [sampling and estimators](#/concept/prob.statistics.sampling-and-estimators).

### questions
Q: How do you interpret a 95 percent confidence interval?
A: The procedure that produced it captures the true value in 95 percent of repeated samples. A particular computed interval either contains the fixed true value or not; the 95 percent describes the method, not a probability for that one interval.

Q: When should you use a t interval instead of a z interval?
A: When the population standard deviation is unknown and estimated from a small sample, assuming roughly normal data. The t critical value is larger than 1.96, widening the interval to account for the uncertainty in s; for large samples the two agree.

Q: Why is the simple Wald interval for a proportion often poor?
A: With small samples or proportions near 0 or 1, the normal approximation fails and the estimated standard error can be tiny or zero, as when no successes are seen. Its actual coverage can be far below 95 percent; the Wilson interval behaves much better.

Q: How does the width of a confidence interval depend on sample size?
A: It shrinks like 1 over the square root of n, so halving the width requires four times as many observations.

Q: How are confidence intervals related to hypothesis tests?
A: A two-sided test at level alpha rejects a hypothesized value exactly when that value lies outside the 1 minus alpha confidence interval, so an interval shows every value the test would not reject.

## prob.statistics.hypothesis-testing
name: "Hypothesis testing"
importance: must
prereqs: [prob.statistics.confidence-intervals]
scope: "null and alternative, p-values, type I and II errors, power"

### simple
A hypothesis test asks whether data are surprising enough to reject a default assumption, such as "this coin is fair". The p-value is the chance of seeing data at least as extreme as yours if the default were true; a small p-value means the default explains your data poorly. Two errors are possible: crying wolf when nothing is there, and missing a real effect.

### interview
- **Null hypothesis** $H_0$ (the default, such as $p = \frac{1}{2}$) and **alternative** $H_1$ ($p \ne \frac{1}{2}$, two-sided; or $p > \frac{1}{2}$, one-sided).
- **Test statistic** and **rejection region** chosen so that $P(\text{reject} \mid H_0) \le \alpha$, the **significance level** (often 0.05).
- **p-value**: $P(\text{a result at least as extreme} \mid H_0)$; reject when $p \le \alpha$. It is **not** the probability that $H_0$ is true.
- **Type I error**: rejecting a true $H_0$ (rate $\alpha$). **Type II error**: failing to reject a false $H_0$ (rate $\beta$). **Power** $= 1 - \beta$ depends on the true effect size, $n$ and $\alpha$.
- For discrete statistics the actual $\alpha$ is usually below the nominal level; report the exact size.
- Pitfalls: p-hacking and multiple testing, "not significant" read as "no effect", statistical versus practical significance.

### deep
#### Worked example: is the coin fair?

Flip 100 times. Under $H_0: p = \frac{1}{2}$, the number of heads $S$ is Binomial(100, $\frac{1}{2}$), mean 50, standard deviation 5.

- **p-value for 60 heads** (two-sided): $P(|S - 50| \ge 10) = 2P(S \ge 60) = 2 \times 0.02844 = 0.0569$. Not significant at 0.05, though close.
- **A level-0.05 test**: reject when $|S - 50| \ge 11$ ($S \le 39$ or $S \ge 61$). Its exact size is $2P(S \ge 61) \approx 0.0352$; the region $|S - 50| \ge 10$ would have size 0.0569, too big. Discreteness makes the achievable levels jump.
- **Power** if the coin really has $p = 0.6$: $P(S \ge 61 \mid p = 0.6) + P(S \le 39 \mid p = 0.6) \approx 0.46$. A test on 100 flips misses a 60% coin more than half the time.

#### Code: exact binomial calculations and simulated tests

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

double binom(int n, int k, double p) {
    return exp(lgamma(n + 1.0) - lgamma(k + 1.0) - lgamma(n - k + 1.0) + k * log(p) +
               (n - k) * log(1 - p));
}
double reject(double p) {                        // P(S <= 39 or S >= 61) for Binomial(100, p)
    double r = 0;
    for (int k = 0; k <= 100; ++k) if (k <= 39 || k >= 61) r += binom(100, k, p);
    return r;
}

int main() {
    double tail60 = 0;
    for (int k = 60; k <= 100; ++k) tail60 += binom(100, k, 0.5);
    printf("two-sided p-value for 60 heads: %.5f\n", 2 * tail60);
    printf("size of the test |S-50| >= 11: %.5f;  power at p = 0.6: %.5f\n", reject(0.5),
           reject(0.6));
    const long reps = 400'000;
    long falseAlarms = 0, detections = 0;
    for (long r = 0; r < reps; ++r) {
        int fair = 0, biased = 0;
        for (int i = 0; i < 100; ++i) {
            fair += u01() < 0.5;
            biased += u01() < 0.6;
        }
        falseAlarms += abs(fair - 50) >= 11;
        detections += abs(biased - 50) >= 11;
    }
    printf("simulated: type I error rate %.5f, power %.5f\n", double(falseAlarms) / reps,
           double(detections) / reps);
}
```

Output:

```text
two-sided p-value for 60 heads: 0.05689
size of the test |S-50| >= 11: 0.03520;  power at p = 0.6: 0.46209
simulated: type I error rate 0.03541, power 0.46365
```

The simulated type I error rate and power, from 400,000 runs each, are within 0.002 of the exact binomial values, less than one and a half standard errors.

#### Reading p-values correctly

- $p = 0.03$ means: if the coin were fair, results this extreme would happen 3% of the time. It does not mean a 3% chance the coin is fair; that requires a prior ([Bayes' theorem](#/concept/prob.foundations.bayes-theorem)).
- **Multiple testing**: run 20 independent tests of true nulls at 0.05 and the chance of at least one false alarm is $1 - 0.95^{20} \approx 0.64$. Correct with Bonferroni ($\frac{\alpha}{m}$) or control the false discovery rate.
- **Low power** makes "not significant" uninformative, and makes the significant results that do appear exaggerate the effect.
- **Stopping when significant** (peeking) inflates the type I error; see [A/B testing](#/concept/prob.statistics.a-b-testing).

Connects to: [confidence intervals](#/concept/prob.statistics.confidence-intervals), [common tests](#/concept/prob.statistics.common-tests), [Bernoulli and binomial](#/concept/prob.distributions.bernoulli-and-binomial).

### questions
Q: What is a p-value?
A: The probability, computed assuming the null hypothesis is true, of getting a test statistic at least as extreme as the one observed. A small p-value means the data would be unusual under the null; it is not the probability that the null is true.

Q: What are type I and type II errors?
A: A type I error rejects a null hypothesis that is true, and its rate is the significance level alpha. A type II error fails to reject a null that is false; its rate is beta, and the power of the test is 1 minus beta.

Q: What determines the power of a test?
A: The true size of the effect, the sample size, the noise in the data and the significance level. Larger effects, more data, less noise and a larger alpha all increase power.

Q: A coin shows 60 heads in 100 flips. Is it significantly unfair at the 5 percent level?
A: Not quite. Under a fair coin, a result at least 10 away from 50 has probability about 0.057 in total, so the two-sided p-value is just above 0.05.

Q: Why is running many tests a problem?
A: Each true null has an alpha chance of a false rejection, so with many tests some false positives are nearly certain; 20 tests at 5 percent give about a 64 percent chance of at least one. Corrections such as Bonferroni or false discovery rate control address this.

## prob.statistics.common-tests
name: "Common tests"
importance: important
prereqs: [prob.statistics.hypothesis-testing]
scope: "z-test, t-test, chi-square"

### simple
A handful of standard tests cover most everyday questions: is an average different from a claimed value, are two groups' averages different, and do observed counts match what a model predicts. Each test turns the data into one number that has a known distribution when nothing interesting is going on. Picking the right test is mostly about what kind of data you have and what you know about its spread.

### interview
- **z-test**: mean with **known** $\sigma$ (or large $n$): $z = \frac{\bar x - \mu_0}{\sigma/\sqrt n}$ against $N(0, 1)$; also for proportions with large samples.
- **One-sample t-test**: unknown $\sigma$, roughly normal data: $t = \frac{\bar x - \mu_0}{s/\sqrt n}$ with $n - 1$ degrees of freedom.
- **Two-sample t-test**: compare two group means; **Welch's** version (unequal variances) is the safe default. **Paired t-test**: before and after on the same units, test the differences.
- **Chi-square goodness of fit**: $\chi^2 = \sum \frac{(O - E)^2}{E}$ with (categories − 1 − fitted parameters) degrees of freedom; needs expected counts of about 5 or more. **Chi-square independence** for contingency tables uses $(r-1)(c-1)$ degrees of freedom.
- Assumptions: independent observations; approximate normality for t-tests with small $n$; large enough expected counts for chi-square.
- Non-parametric alternatives (Mann-Whitney, sign test) trade some power for fewer assumptions.

### deep
#### Worked example 1: a one-sample t-test

A maker claims batteries last 20 hours. Eight tested batteries last 18.2, 19.5, 17.9, 20.1, 18.8, 19.0, 18.4 and 19.7 hours. Then $\bar x = 18.95$, $s^2 = \frac{4.18}{7} \approx 0.5971$, $s \approx 0.7728$, standard error $\frac{s}{\sqrt 8} \approx 0.2732$, and

$$t = \frac{18.95 - 20}{0.2732} \approx -3.843$$

with 7 degrees of freedom. The two-sided 5% critical value is about 2.365, so the claim is rejected; the p-value is about 0.006. (Assumes independent batteries and roughly normal lifetimes.)

#### Worked example 2: is a die fair?

120 rolls give counts 15, 25, 18, 22, 17, 23, each expected 20:

$$\chi^2 = \frac{25 + 25 + 4 + 4 + 9 + 9}{20} = 3.8$$

with 5 degrees of freedom. For odd degrees of freedom the tail has a closed form; for 5, $P(\chi^2_5 > x) = 2(1 - \Phi(\sqrt x)) + \sqrt{\frac{2x}{\pi}}\,e^{-x/2}\left(1 + \frac{x}{3}\right)$, giving $p \approx 0.579$: no evidence against fairness. The chi-square distribution is an approximation for the statistic's null distribution; the simulation below measures the real one for 120 fair rolls.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

double tCdf(double x, int nu) {                  // P(T <= x), x >= 0, by Simpson's rule
    double c = exp(lgamma((nu + 1) / 2.0) - lgamma(nu / 2.0)) / sqrt(nu * numbers::pi);
    auto f = [&](double t) { return c * pow(1 + t * t / nu, -(nu + 1) / 2.0); };
    int steps = 20000;
    double h = x / steps, s = f(0) + f(x);
    for (int i = 1; i < steps; ++i) s += f(i * h) * (i % 2 ? 4 : 2);
    return 0.5 + s * h / 3;
}

int main() {
    vector<double> hours = {18.2, 19.5, 17.9, 20.1, 18.8, 19.0, 18.4, 19.7};
    double n = hours.size(), m = 0, ss = 0;
    for (double h : hours) m += h / n;
    for (double h : hours) ss += (h - m) * (h - m);
    double t = (m - 20) / sqrt(ss / (n - 1) / n);
    double lo = 0, hi = 10;
    for (int i = 0; i < 60; ++i) (tCdf((lo + hi) / 2, 7) < 0.975 ? lo : hi) = (lo + hi) / 2;
    printf("battery t-test: mean %.4f, s %.4f, t %.4f, critical %.4f, p-value %.5f\n", m,
           sqrt(ss / (n - 1)), t, lo, 2 * (1 - tCdf(fabs(t), 7)));

    int counts[6] = {15, 25, 18, 22, 17, 23};
    double chi2 = 0;
    for (int c : counts) chi2 += (c - 20.0) * (c - 20.0) / 20;
    double pApprox = 2 * (1 - Phi(sqrt(chi2))) + sqrt(2 * chi2 / numbers::pi) *
                                                     exp(-chi2 / 2) * (1 + chi2 / 3);
    const long reps = 1'000'000;
    long atLeast = 0;
    for (long r = 0; r < reps; ++r) {            // the real null distribution: 120 fair rolls
        int c[6] = {};
        for (int i = 0; i < 120; ++i) ++c[rng() % 6];
        double x = 0;
        for (int k : c) x += (k - 20.0) * (k - 20.0) / 20;
        atLeast += x >= chi2 - 1e-9;
    }
    printf("die: chi-square %.2f, p-value from chi-square(5) %.5f, simulated %.5f\n", chi2,
           pApprox, double(atLeast) / reps);
}
```

Output:

```text
battery t-test: mean 18.9500, s 0.7728, t -3.8432, critical 2.3646, p-value 0.00635
die: chi-square 3.80, p-value from chi-square(5) 0.57856, simulated 0.58747
```

The numeric integration gives the critical value 2.3646 and a p-value of 0.0064 for the battery test. For the die, the simulated p-value for 120 fair rolls, 0.5875, differs from the chi-square value by 0.009, many standard errors (0.0005): that gap is the chi-square approximation's own error at this sample size, small enough not to change the conclusion.

#### Choosing a test

| data and question | test |
|---|---|
| one mean, $\sigma$ known or $n$ large | z-test |
| one mean, $\sigma$ unknown, small $n$ | one-sample t |
| two independent groups' means | Welch two-sample t |
| same units measured twice | paired t on the differences |
| counts in categories versus a model | chi-square goodness of fit |
| two categorical variables related? | chi-square independence (or Fisher's exact test for small counts) |

Connects to: [hypothesis testing](#/concept/prob.statistics.hypothesis-testing), [confidence intervals](#/concept/prob.statistics.confidence-intervals), [A/B testing](#/concept/prob.statistics.a-b-testing).

### questions
Q: When do you use a t-test instead of a z-test?
A: When the population standard deviation is unknown and estimated from a small sample of roughly normal data. The t distribution has heavier tails than the normal to account for the uncertainty in s; with large samples the two tests agree.

Q: What is the difference between a two-sample t-test and a paired t-test?
A: A two-sample test compares the means of two independent groups. A paired test is for two measurements on the same units, such as before and after, and tests whether the mean of the differences is zero, which removes variation between units.

Q: How does a chi-square goodness-of-fit test work?
A: Compare observed counts O with expected counts E under the model, compute the sum of O minus E squared over E, and compare it with a chi-square distribution whose degrees of freedom are the number of categories minus 1 minus any fitted parameters.

Q: What assumptions do chi-square tests need?
A: Independent observations and large enough expected counts, commonly at least about 5 per cell, because the chi-square distribution is only an approximation to the statistic's null distribution. With small counts use an exact test.

Q: Why is Welch's t-test often preferred for comparing two means?
A: It does not assume the two groups have equal variances, and it loses little power when they do, so it is a safer default than the pooled-variance test.

## prob.statistics.a-b-testing
name: "A/B testing"
importance: important
prereqs: [prob.statistics.hypothesis-testing]
scope: "sample size, significance, pitfalls"

### simple
An A/B test shows two versions of something, like two checkout pages, to randomly split groups of users and compares how they do. Randomization makes the groups alike in everything except the version, so a clear difference in results can be credited to the change. The hard parts are running it long enough to detect a real difference and not fooling yourself by stopping early.

### interview
- **Randomize** users into A and B; pick one primary metric (such as conversion) and the minimum effect worth detecting **before** starting.
- **Sample size** for two proportions at level $\alpha$ and power $1 - \beta$: $n \approx \frac{(z_{\alpha/2} + z_\beta)^2\,[p_1(1-p_1) + p_2(1-p_2)]}{(p_1 - p_2)^2}$ per group; 10% versus 12% at 5% and 80% power needs about 3,840 per group.
- Analyze with a two-proportion z-test (or t-test on means); report the effect with a confidence interval, not just a p-value.
- **Peeking**: checking repeatedly and stopping at the first significant result inflates false positives far above 5%. Fix the sample size, or use sequential methods designed for repeated looks.
- Other pitfalls: many metrics or segments (multiple testing), novelty effects, sample ratio mismatch (the split isn't what was intended), interference between users, and seasonality.
- Small effects need big samples: the required $n$ grows with $\frac{1}{\text{effect}^2}$.

### deep
#### Sample size for 10% versus 12%

With $z_{0.025} = 1.96$ and $z_{0.2} = 0.8416$:

$$n = \frac{(1.96 + 0.8416)^2(0.10 \cdot 0.90 + 0.12 \cdot 0.88)}{(0.02)^2} = \frac{7.849 \times 0.1956}{0.0004} \approx 3838.1,$$

so about 3,839 users per group. Halving the detectable lift to one percentage point roughly quadruples it.

#### Why peeking fails

Under no real difference (an A/A test), each individual look has a 5% false-positive chance, but checking 10 times and stopping at the first $p < 0.05$ gives many chances to cross the line by luck. The simulation estimates how bad it gets; there is no simple closed form, so the result below is an estimate with its standard error.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

bool significant(long convA, long convB, long n) {   // two-proportion z-test, pooled
    double pa = double(convA) / n, pb = double(convB) / n, pool = (pa + pb) / 2;
    double se = sqrt(pool * (1 - pool) * 2.0 / n);
    return se > 0 && 2 * (1 - Phi(fabs(pa - pb) / se)) < 0.05;
}

int main() {
    const double za = 1.959964, zb = 0.841621, p1 = 0.10, p2 = 0.12;
    long n = long(ceil((za + zb) * (za + zb) * (p1 * (1 - p1) + p2 * (1 - p2)) /
                       ((p1 - p2) * (p1 - p2))));
    printf("sample size per group: %ld\n", n);

    const int experiments = 4000;
    int detected = 0;
    for (int e = 0; e < experiments; ++e) {
        long a = 0, b = 0;
        for (long i = 0; i < n; ++i) a += u01() < p1, b += u01() < p2;
        detected += significant(a, b, n);
    }
    double power = double(detected) / experiments;
    printf("simulated power: %.4f (target 0.80, standard error %.4f)\n", power,
           sqrt(0.8 * 0.2 / experiments));

    int once = 0, peeked = 0;
    for (int e = 0; e < experiments; ++e) {      // A/A tests: no real difference
        long a = 0, b = 0;
        bool stoppedEarly = false;
        for (long i = 1; i <= 5000; ++i) {
            a += u01() < p1, b += u01() < p1;
            if (i % 500 == 0 && significant(a, b, i)) stoppedEarly = true;
        }
        once += significant(a, b, 5000);
        peeked += stoppedEarly;
    }
    printf("A/A false positives: one look at the end %.4f, ten looks %.4f (se about %.4f)\n",
           double(once) / experiments, double(peeked) / experiments,
           sqrt(0.2 * 0.8 / experiments));
}
```

Output:

```text
sample size per group: 3839
simulated power: 0.7960 (target 0.80, standard error 0.0063)
A/A false positives: one look at the end 0.0488, ten looks 0.1965 (se about 0.0063)
```

The formula gives 3,839 per group, and 4,000 simulated experiments of that size detected the lift 79.6% of the time, within one standard error of the planned 80%. For A/A tests, a single look at the end gave false positives 4.9% of the time as designed, but stopping at the first of ten looks with $p < 0.05$ gave about 19.7%, four times the promised rate. That last number is a simulation estimate (standard error about 0.006), not an exact value.

#### A checklist before trusting a result

1. Was the split random, and is the observed ratio close to the planned one (no sample ratio mismatch)?
2. Was the sample size fixed in advance, or was a sequential method used?
3. Is the effect reported with a confidence interval and judged for practical size?
4. How many metrics and segments were examined? Adjust or treat extra findings as hypotheses.
5. Could novelty, holidays or interference between users explain the change?

Connects to: [hypothesis testing](#/concept/prob.statistics.hypothesis-testing), [confidence intervals](#/concept/prob.statistics.confidence-intervals), [correlation vs causation](#/concept/prob.statistics.correlation-vs-causation).

### questions
Q: How do you choose the sample size for an A/B test?
A: Fix the significance level, the power and the smallest effect worth detecting, then use n per group equal to z alpha over 2 plus z beta, squared, times the sum of the two variances, divided by the effect squared. For 10 versus 12 percent conversion at 5 percent significance and 80 percent power that is about 3,840 per group.

Q: Why is peeking at an A/B test and stopping when it becomes significant a problem?
A: Each look is another chance for noise to cross the significance threshold, so the overall false positive rate climbs well above the nominal 5 percent. Fix the sample size in advance or use a sequential testing method that accounts for repeated looks.

Q: Why does randomization matter in an A/B test?
A: It makes the two groups alike on average in every respect except the change being tested, including things you can't measure, so a difference in outcomes can be attributed to the change rather than to a confounder.

Q: What is sample ratio mismatch?
A: When the observed split between groups differs significantly from the planned one, such as 52 to 48 instead of 50 to 50 with many users. It signals a bug in assignment or logging, and the results should not be trusted until it is explained.

Q: How does the required sample size change if you want to detect half as large an effect?
A: It roughly quadruples, because the required n is inversely proportional to the square of the effect size.

## prob.statistics.correlation-vs-causation
name: "Correlation vs causation"
importance: important
scope: "confounders"

### simple
Two things can rise and fall together without one causing the other. Ice cream sales and drownings both go up in summer, but ice cream doesn't cause drowning; hot weather drives both. Telling correlation from causation means asking what else could link the two, and the most reliable way to settle it is a randomized experiment.

### interview
- **Confounder**: a variable that influences both the supposed cause and the outcome (temperature drives ice cream sales and swimming). Adjusting for it (stratifying, regression) can remove a spurious association.
- **Reverse causation**: the outcome drives the "cause" (sick people take more medicine).
- **Selection bias and collider bias**: selecting on a consequence of both variables creates correlation from nothing (among admitted students, test scores and grades can look negatively related).
- **Simpson's paradox**: a treatment can be better in every subgroup yet worse overall, when the groups receive it at different rates.
- **Randomized experiments** break confounding by assigning the cause at random; observational data need assumptions (no unmeasured confounders) or natural experiments.
- Correlation also misses non-linear relationships and is sensitive to outliers; causation needs a mechanism, timing and robustness.

### deep
#### Worked example 1: a pure confounder

Let temperature $Z \sim N(0, 1)$, ice cream sales $X = Z + \varepsilon_1$ and swimming accidents $Y = Z + \varepsilon_2$, with independent standard normal noise and **no** effect of $X$ on $Y$. Then $\text{Cov}(X, Y) = \text{Var}(Z) = 1$ and $\text{Var}(X) = \text{Var}(Y) = 2$, so

$$\text{Corr}(X, Y) = \frac{1}{2}.$$

Regressing $Y$ on $X$ alone gives a slope of $\frac{1}{2}$; regressing on both $X$ and $Z$ gives $X$ a coefficient of 0, because once temperature is known, sales carry no extra information.

#### Worked example 2: Simpson's paradox (invented numbers)

| | mild cases | severe cases | all cases |
|---|---|---|---|
| treatment A | 90 of 100 recover (90%) | 120 of 200 (60%) | 210 of 300 (70%) |
| treatment B | 170 of 200 (85%) | 25 of 50 (50%) | 195 of 250 (78%) |

A is better for mild cases *and* for severe cases, yet worse overall, because A was mostly given to severe cases, which recover less often whatever the treatment. Severity confounds the comparison; the within-severity comparison is the fair one here.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

int main() {
    const long n = 2'000'000;
    double sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, szz = 0, sxy = 0, sxz = 0, syz = 0;
    for (long i = 0; i < n; ++i) {
        double z = normal(), x = z + normal(), y = z + normal();   // no effect of x on y
        sx += x, sy += y, sz += z;
        sxx += x * x, syy += y * y, szz += z * z, sxy += x * y, sxz += x * z, syz += y * z;
    }
    auto cov = [&](double sab, double sa, double sb) { return sab / n - (sa / n) * (sb / n); };
    double vx = cov(sxx, sx, sx), vy = cov(syy, sy, sy), vz = cov(szz, sz, sz);
    double cxy = cov(sxy, sx, sy), cxz = cov(sxz, sx, sz), cyz = cov(syz, sy, sz);
    printf("Corr(X, Y): exact 0.5000  simulated %.4f\n", cxy / sqrt(vx * vy));
    printf("slope of Y on X alone: exact 0.5000  simulated %.4f\n", cxy / vx);
    // Regression of Y on X and Z: solve the 2x2 normal equations.
    double det = vx * vz - cxz * cxz;
    double bx = (cxy * vz - cyz * cxz) / det, bz = (cyz * vx - cxy * cxz) / det;
    printf("Y on X and Z: coefficient of X %.4f (exact 0), of Z %.4f (exact 1)\n", bx, bz);

    int recovered[2][2] = {{90, 120}, {170, 25}}, treated[2][2] = {{100, 200}, {200, 50}};
    const char* names = "AB";
    for (int t = 0; t < 2; ++t)
        printf("treatment %c: mild %.0f%%, severe %.0f%%, overall %.0f%%\n", names[t],
               100.0 * recovered[t][0] / treated[t][0], 100.0 * recovered[t][1] / treated[t][1],
               100.0 * (recovered[t][0] + recovered[t][1]) / (treated[t][0] + treated[t][1]));
}
```

Output:

```text
Corr(X, Y): exact 0.5000  simulated 0.4997
slope of Y on X alone: exact 0.5000  simulated 0.4995
Y on X and Z: coefficient of X 0.0005 (exact 0), of Z 0.9980 (exact 1)
treatment A: mild 90%, severe 60%, overall 70%
treatment B: mild 85%, severe 50%, overall 78%
```

The simulated correlation and slope are within 0.0005 of $\frac{1}{2}$, and adding temperature to the regression drives the coefficient on ice cream sales to 0.0005, essentially zero. The Simpson table is exact arithmetic on the invented counts.

#### Questions to ask of any correlation

1. What else could cause both? (confounders)
2. Could the direction be reversed?
3. How were the data selected, and could selection create the pattern?
4. Does it hold within relevant subgroups (Simpson's paradox)?
5. Is there an experiment, or a natural experiment, that isolates the cause?

Connects to: [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [A/B testing](#/concept/prob.statistics.a-b-testing), [linear regression](#/concept/prob.learning.linear-regression).

### questions
Q: What is a confounder?
A: A variable that affects both the supposed cause and the outcome, creating an association between them even without a causal link, like hot weather driving both ice cream sales and swimming accidents. Adjusting for it can remove the spurious association.

Q: What is Simpson's paradox?
A: A trend that holds within every subgroup reverses when the groups are combined, because the groups differ in size or composition across the compared options. For example, a treatment better for both mild and severe cases can look worse overall if it was mostly given to severe cases.

Q: Why do randomized experiments establish causation better than observational data?
A: Random assignment makes the treated and untreated groups alike on average in every other respect, measured or not, so confounders cannot explain a difference in outcomes.

Q: What is reverse causation?
A: When the outcome actually drives the supposed cause, such as more firefighters being sent to bigger fires, not firefighters making fires bigger.

Q: Can two variables be strongly dependent but uncorrelated?
A: Yes. Correlation measures linear association only; a variable and its square on a symmetric range are uncorrelated yet one determines the other.
