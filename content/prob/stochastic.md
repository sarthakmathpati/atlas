---
topic: prob.stochastic
name: "Stochastic processes"
subject: prob
order: 10
prereqs: [prob.markov, prob.limits]
---

## prob.stochastic.brownian-motion-intuition
name: "Brownian motion intuition"
importance: advanced
prereqs: [prob.markov.random-walks]
scope: "continuous random walks"

### simple
Brownian motion is what a random walk looks like when the steps become tiny and very frequent: a continuous, jagged path that wanders with no memory of its direction. It was first seen in pollen grains jiggling in water. In finance it is the building block for modeling how prices wiggle over time.

### interview
- A **standard Brownian motion** $W_t$ starts at 0, has **independent increments**, $W_t - W_s \sim N(0, t - s)$ for $s < t$, and continuous paths.
- It is the limit of a scaled random walk: $n$ steps of size $\pm\frac{1}{\sqrt n}$ per unit time (Donsker's theorem, a functional CLT).
- Scaling: $W_{ct}$ has the same distribution as $\sqrt{c}\,W_t$; the typical displacement grows like $\sqrt t$.
- Paths are continuous but nowhere differentiable; their **quadratic variation** over $[0, t]$ is exactly $t$: $\sum (\Delta W)^2 \to t$. This is why Itô calculus has the extra $\frac{1}{2}\sigma^2$ term.
- **Reflection principle**: $P(\max_{s \le t} W_s \ge a) = 2P(W_t \ge a)$ for $a > 0$.
- Stock model: geometric Brownian motion $dS = \mu S\,dt + \sigma S\,dW$, so $\ln S_t$ is Brownian with drift and $S_t$ is lognormal.

### deep
#### From random walks to Brownian motion

Take a simple random walk and, over one unit of time, make $n$ steps of size $\frac{1}{\sqrt n}$. After time $t$ the position is a sum of $nt$ independent $\pm\frac{1}{\sqrt n}$ steps: mean 0, variance $t$, and by the CLT approximately $N(0, t)$. As $n \to \infty$ the whole path converges to Brownian motion.

#### Worked example: hitting a level

For standard Brownian motion on $[0, 1]$: $P(W_1 > 1) = 1 - \Phi(1) \approx 0.1587$, and by reflection $P(\max_{s \le 1} W_s \ge 1) = 2(1 - \Phi(1)) \approx 0.3173$. A discretized path with $n$ steps misses crossings that happen between grid points, so its estimate is a little lower and approaches the exact value as $n$ grows.

#### Worked example: quadratic variation

With $n$ increments of variance $\frac{1}{n}$ on $[0, 1]$, $\sum (\Delta W)^2$ has mean 1 and variance $\frac{2}{n}$: it becomes a constant. Ordinary smooth functions have quadratic variation 0; Brownian paths are rough enough that squared steps don't vanish.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

int main() {
    printf("exact: P(W1 > 1) %.5f, P(max >= 1) %.5f\n", 1 - Phi(1), 2 * (1 - Phi(1)));
    const long paths = 100'000;
    for (int n : {10, 100, 1000}) {
        long ended = 0, touched = 0;
        double qv = 0, qvSq = 0;
        for (long p = 0; p < paths; ++p) {
            double w = 0, best = 0, sq = 0;
            for (int i = 0; i < n; ++i) {
                double dw = normal() / sqrt(double(n));   // increment over 1/n
                w += dw, sq += dw * dw;
                best = max(best, w);
            }
            ended += w > 1, touched += best >= 1, qv += sq, qvSq += sq * sq;
        }
        double qvMean = qv / paths, qvSd = sqrt(qvSq / paths - qvMean * qvMean);
        printf("n = %4d: P(W1 > 1) %.5f, P(max >= 1) %.5f, quadratic variation %.4f (sd %.3f)\n",
               n, double(ended) / paths, double(touched) / paths, qvMean, qvSd);
    }
}
```

Output:

```text
exact: P(W1 > 1) 0.15866, P(max >= 1) 0.31731
n =   10: P(W1 > 1) 0.15791, P(max >= 1) 0.24219, quadratic variation 0.9991 (sd 0.448)
n =  100: P(W1 > 1) 0.15812, P(max >= 1) 0.28945, quadratic variation 0.9997 (sd 0.142)
n = 1000: P(W1 > 1) 0.15875, P(max >= 1) 0.30891, quadratic variation 0.9998 (sd 0.045)
```

How close: with 100,000 paths the standard error of each probability is about 0.0012 and of the mean quadratic variation at most 0.0014. The end point is exactly $N(0, 1)$ for every $n$ (the increments are normal), and its estimates sit within 0.7 standard errors of 0.15866. The maximum is different: 0.242, 0.289 and 0.309 are far below 0.31731 by many standard errors, and that gap is the discretization bias, not noise. It shrinks like $\frac{1}{\sqrt n}$: a known correction (Broadie, Glasserman and Kou) that raises the barrier by $\frac{0.5826}{\sqrt n}$ predicts 0.2899 for $n = 100$ and 0.3085 for $n = 1000$, both within the simulation's error. The spread of the quadratic variation matches $\sqrt{2/n}$ (0.447, 0.141, 0.045), so it really does settle on the constant 1.

#### Pitfalls

- **Treating Brownian paths as smooth**: $\frac{dW}{dt}$ does not exist; rules of ordinary calculus must be replaced (Itô's lemma).
- **Discretization bias**: simulated barrier crossings are missed between steps; use fine grids or bridge corrections.
- **Real prices** have jumps, fat tails and changing volatility; Brownian motion is the baseline, not the full story.

Connects to: [random walks](#/concept/prob.markov.random-walks), [lognormal distribution](#/concept/prob.distributions.lognormal-distribution), [Black-Scholes intuition](#/concept/markets.options.black-scholes-intuition).

### questions
Q: What defines standard Brownian motion?
A: It starts at zero, has independent increments, each increment over a time interval of length t is normal with mean 0 and variance t, and its paths are continuous.

Q: How is Brownian motion related to a random walk?
A: It is the limit of a random walk with n steps of size 1 over root n per unit time as n goes to infinity; by the central limit theorem, positions become normal with variance equal to elapsed time.

Q: What is the probability that standard Brownian motion reaches level 1 by time 1?
A: By the reflection principle, twice the probability that it ends above 1, which is 2 times 1 minus Phi of 1, about 0.317.

Q: What is quadratic variation and why does it matter?
A: The limit of the sum of squared increments over finer and finer partitions. For Brownian motion on 0 to t it equals t, not zero as for smooth paths, which is why Itô calculus has an extra second-order term.

Q: How does Brownian motion scale in time?
A: Speeding up time by a factor c is the same in distribution as multiplying the path by the square root of c, so displacement grows like the square root of time.

## prob.stochastic.martingales
name: "Martingales"
importance: advanced
scope: "fair games, optional stopping theorem"

### simple
A martingale is the mathematical model of a fair game: given everything so far, your expected fortune after the next round equals what you have now. The famous consequence is that no betting system can turn a fair game into a winning one, as long as the game and your bankroll are limited. It is also a powerful shortcut for computing probabilities and expected times.

### interview
- $M_n$ is a **martingale** if $E[M_{n+1} \mid M_0, \dots, M_n] = M_n$ (and $E|M_n| < \infty$). Examples: a symmetric random walk $S_n$; $S_n^2 - n$; the wealth of a player in a fair game; $\left(\frac{q}{p}\right)^{S_n}$ for a biased walk.
- **Optional stopping theorem**: $E[M_\tau] = M_0$ at a stopping time $\tau$ if, for example, $\tau$ is bounded, or $E[\tau] < \infty$ and increments are bounded.
- Applications: **gambler's ruin** (from $E[S_\tau] = i$: $P(\text{reach } N) = \frac{i}{N}$), **expected duration** (from $S_n^2 - n$: $E[\tau] = i(N - i)$), and pattern waiting times (the "ABRACADABRA" argument).
- **The doubling strategy** seems to guarantee a profit, but only with unlimited wealth and time; with a finite bankroll its expected gain is exactly 0: many small wins, one rare huge loss.
- A stopping time may only use information up to now ("stop when you are ahead" is fine; "stop just before the next loss" is not).
- Sub- and supermartingales model favorable and unfavorable games; a casino's roulette makes the player's wealth a supermartingale.

### deep
#### Gambler's ruin by optional stopping

A fair walk starts at $i$ and stops at 0 or $N$ ($\tau$ has finite expectation and steps are bounded). Since $S_n$ is a martingale, $E[S_\tau] = i$; $S_\tau$ is $N$ with probability $P$ and 0 otherwise, so $P = \frac{i}{N}$. Since $S_n^2 - n$ is also a martingale, $E[S_\tau^2] - E[\tau] = i^2$, and $E[S_\tau^2] = N^2 \cdot \frac{i}{N} = iN$, so $E[\tau] = iN - i^2 = i(N - i)$. For $i = 3, N = 10$: $\frac{3}{10}$ and 21, matching [gambler's ruin](#/concept/prob.markov.gamblers-ruin).

#### The doubling strategy with a finite bankroll

Bet 1 on a fair coin; after each loss double the bet; stop at the first win. With a bankroll of $1023 = 1 + 2 + \dots + 512$ you can survive 10 losses. You finish $+1$ unless all 10 bets lose, which has probability $\frac{1}{1024}$ and costs 1023:

$$E[\text{gain}] = \frac{1023}{1024}\cdot 1 - \frac{1}{1024}\cdot 1023 = 0.$$

The strategy reshapes the risk (usually a small win, rarely a catastrophe) but cannot create an edge.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    const long games = 1'000'000;
    double stopSum = 0, stopSqMinusTime = 0, duration = 0;
    long reached = 0;
    for (long g = 0; g < games; ++g) {           // fair walk from 3, stop at 0 or 10
        int s = 3;
        long t = 0;
        while (s > 0 && s < 10) { s += (rng() & 1) ? 1 : -1; ++t; }
        stopSum += s, stopSqMinusTime += double(s) * s - t, duration += t;
        reached += s == 10;
    }
    printf("E[S_tau] %.4f (exact 3), E[S_tau^2 - tau] %.4f (exact 9)\n", stopSum / games,
           stopSqMinusTime / games);
    printf("P(reach 10) %.5f (exact 0.3), E[tau] %.4f (exact 21)\n", double(reached) / games,
           duration / games);

    double gain = 0;
    long busts = 0;
    for (long g = 0; g < games; ++g) {           // doubling with a bankroll of 1023
        int bet = 1, lost = 0;
        bool won = false;
        for (int round = 0; round < 10 && !won; ++round) {
            if (rng() & 1) won = true;
            else { lost += bet; bet *= 2; }
        }
        gain += won ? 1 : -lost;
        busts += !won;
    }
    printf("doubling: average gain %.4f (exact 0), busted in %.5f of games (exact %.5f)\n",
           gain / games, double(busts) / games, 1.0 / 1024);
}
```

Output:

```text
E[S_tau] 2.9996 (exact 3), E[S_tau^2 - tau] 8.9961 (exact 9)
P(reach 10) 0.29996 (exact 0.3), E[tau] 20.9994 (exact 21)
doubling: average gain 0.0866 (exact 0), busted in 0.00089 of games (exact 0.00098)
```

How close: the walk's four averages are within 0.5 standard errors of 3, 9, 0.3 and 21 (for example, the standard error of the average duration is about 0.02). The doubling result is the instructive one. Its gain is +1 or −1023, so one game's standard deviation is about 32 and the average's standard error about 0.032: the printed 0.0866 is 2.7 standard errors above 0, because this run had 892 busts where about 977 were expected. Nineteen other seeds scatter on both sides (from 2.1 standard errors below to 3.2 above), so it is noise, not an edge. That is the doubling strategy in miniature: a rare, huge loss dominates the average, and a million games are not enough to pin it down.

#### When optional stopping fails

For the symmetric walk from 0 stopped at the first time it reaches $+1$, $E[S_\tau] = 1 \ne 0$. The theorem doesn't apply: $\tau$ is finite with probability 1 but $E[\tau] = \infty$, and there is no lower bound on the walk before stopping. The doubling strategy with unlimited credit is the same trap.

Connects to: [gambler's ruin](#/concept/prob.markov.gamblers-ruin), [waiting time problems](#/concept/prob.expected-value.waiting-time-problems), [conditional expectation](#/concept/prob.expected-value.conditional-expectation).

### questions
Q: What is a martingale?
A: A sequence of random variables where the expected next value, given all the past, equals the current value, with finite expectations. It models the wealth of a player in a fair game.

Q: What does the optional stopping theorem say?
A: Under suitable conditions, such as a bounded stopping time, or a stopping time with finite expectation and bounded increments, the expected value of a martingale at the stopping time equals its starting value.

Q: How does optional stopping solve gambler's ruin?
A: The fair walk is a martingale, so the expected final position equals the start i; the final position is N with probability P and 0 otherwise, giving P equals i over N. Using the martingale S squared minus n gives the expected duration i times N minus i.

Q: Why doesn't the doubling strategy beat a fair game?
A: With a finite bankroll you usually win 1, but occasionally lose everything after a long losing streak, and the expected gain is exactly zero. The apparent sure profit needs unlimited wealth and time, where optional stopping no longer applies.

Q: Can you stop a fair game at a clever time to make a profit on average?
A: Not with a stopping rule that uses only past information and satisfies the theorem's conditions. Stopping rules can change the distribution of outcomes, not the expected value.

## prob.stochastic.poisson-processes
name: "Poisson processes"
importance: advanced
prereqs: [prob.distributions.exponential-distribution]
scope: "arrivals over time"

### simple
A Poisson process models events that happen at random moments at a steady average rate, like calls to a help desk or orders arriving at an exchange. The number of events in any stretch of time follows the Poisson distribution, and the gaps between events are exponential. It is the simplest model of "random arrivals".

### interview
- Rate $\lambda$: the count in any interval of length $t$ is Poisson($\lambda t$), counts in disjoint intervals are independent, and events never coincide.
- **Gaps** between events are independent Exp($\lambda$) with mean $\frac{1}{\lambda}$; the time of the $k$-th event is Gamma($k, \lambda$).
- **Superposition**: merging independent processes with rates $\lambda_1, \lambda_2$ gives a Poisson process with rate $\lambda_1 + \lambda_2$; each event comes from process 1 with probability $\frac{\lambda_1}{\lambda_1 + \lambda_2}$.
- **Thinning**: keeping each event independently with probability $p$ gives a Poisson process of rate $p\lambda$, independent of the discarded one.
- **Conditional uniformity**: given $n$ events in $[0, t]$, their times are like $n$ sorted independent uniform points on $[0, t]$.
- Uses: order arrivals, queues ($M/M/1$), insurance claims, radioactive decay; real arrivals are often burstier (non-constant rates, clustering).

### deep
#### Worked example: a help desk

Calls arrive at 3 per hour as a Poisson process.

- $P(\text{no call in 20 minutes}) = e^{-3 \cdot 1/3} = e^{-1} \approx 0.3679$.
- $P(\text{exactly 2 calls in an hour}) = e^{-3}\frac{3^2}{2!} = 4.5e^{-3} \approx 0.2240$.
- If 30% of calls are urgent (independently), urgent calls form a Poisson process of rate 0.9 per hour: $P(\text{no urgent call in an hour}) = e^{-0.9} \approx 0.4066$.
- Given exactly 1 call in the hour, its time is uniform: it happens in the first 15 minutes with probability $\frac{1}{4}$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double rate = 3;                       // calls per hour
    const long hours = 1'000'000;
    long quiet20 = 0, exactlyTwo = 0, noUrgent = 0, oneCall = 0, oneEarly = 0;
    for (long h = 0; h < hours; ++h) {           // simulate one hour by exponential gaps
        double t = -log(1 - u01()) / rate;
        int calls = 0, urgent = 0;
        double first = t;
        while (t < 1) {
            ++calls;
            urgent += u01() < 0.3;               // thinning
            t += -log(1 - u01()) / rate;
        }
        quiet20 += first > 1.0 / 3;
        exactlyTwo += calls == 2;
        noUrgent += urgent == 0;
        if (calls == 1) { ++oneCall; oneEarly += first < 0.25; }
    }
    auto line = [&](const char* what, double exact, long hits, long total) {
        printf("%-30s exact %.5f  simulated %.5f\n", what, exact, double(hits) / total);
    };
    line("no call in 20 minutes", exp(-1.0), quiet20, hours);
    line("exactly 2 calls in an hour", 4.5 * exp(-3.0), exactlyTwo, hours);
    line("no urgent call in an hour", exp(-0.9), noUrgent, hours);
    line("single call in first quarter", 0.25, oneEarly, oneCall);
}
```

Output:

```text
no call in 20 minutes          exact 0.36788  simulated 0.36748
exactly 2 calls in an hour     exact 0.22404  simulated 0.22378
no urgent call in an hour      exact 0.40657  simulated 0.40661
single call in first quarter   exact 0.25000  simulated 0.25131
```

How close: with a million simulated hours the standard errors are about 0.0005 for the first three lines and 0.0011 for the last (only about 149,000 hours have exactly one call). Every estimate is within 1.2 standard errors of the exact value.

#### Pitfalls

- **Non-constant rates**: calls peak at lunchtime; use a time-varying rate (a non-homogeneous Poisson process) or model each period separately.
- **Clustering**: orders and claims arrive in bursts (after news, after a storm), giving more variance than Poisson; Hawkes processes model self-excitation.
- **The inspection paradox**: arriving at a random time, the gap you land in averages $\frac{2}{\lambda}$, twice the typical gap ([exponential distribution](#/concept/prob.distributions.exponential-distribution)).

Connects to: [Poisson distribution](#/concept/prob.distributions.poisson-distribution), [exponential distribution](#/concept/prob.distributions.exponential-distribution), [message queues](#/concept/sysd.messaging.message-queues).

### questions
Q: What is a Poisson process?
A: A model of random events at a constant average rate lambda in which the number of events in an interval of length t is Poisson with mean lambda t, counts in non-overlapping intervals are independent, and events do not occur simultaneously.

Q: What is the distribution of the time between events in a Poisson process?
A: The gaps are independent exponential variables with rate lambda, so the mean gap is 1 over lambda and the process has no memory of how long it has been since the last event.

Q: What happens when you keep each event of a Poisson process independently with probability p?
A: The kept events form a Poisson process with rate p lambda, and the discarded ones form an independent Poisson process with rate one minus p times lambda. This is called thinning.

Q: Calls arrive at 3 per hour. What is the probability of no call in 20 minutes?
A: The count in 20 minutes is Poisson with mean 1, so the probability of none is e to the minus 1, about 0.37.

Q: Given that exactly one event happened in an hour, when did it happen?
A: Its time is uniformly distributed over the hour; more generally, given n events, their times are distributed like n sorted independent uniform points.
