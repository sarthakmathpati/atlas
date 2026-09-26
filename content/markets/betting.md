---
topic: markets.betting
name: "Betting and risk"
subject: markets
order: 3
prereqs: [prob.expected-value]
---

## markets.betting.expected-value-decisions
name: "Expected value decisions"
importance: must
scope: "when to take a bet"

### simple
Before taking a bet, work out what it pays on average: add up each outcome times its chance, then subtract what it costs. If that average is positive and you can afford the bad outcomes, the bet is worth considering. It is like judging a shop by its average customer rather than by the one who complained loudest.

### interview
- **Expected value**: $E[X] = \sum_i p_i x_i$. For a stake $s$ that wins $w$ with probability $p$: $EV = p\,w - (1-p)\,s$.
- Take a bet when its EV is positive **after costs**, you can survive its worst outcomes, and it beats your alternatives for the risk it adds.
- Compare bets by EV per unit of risk (EV over standard deviation), not by EV alone.
- Intuition misleads with small probabilities repeated many times; compute instead.
- A one-off bet with a large stake differs from a small repeated bet with the same EV: variance and ruin decide the first ([Kelly criterion](#/concept/markets.betting.kelly-criterion), [risk of ruin](#/concept/markets.betting.variance-and-risk-of-ruin)).
- Say the calculation aloud in interviews: outcomes, probabilities, payoffs, EV, then a decision.

### deep
#### Intuition

Expected value is the average result per bet if you could repeat it forever. Linearity makes it easy to compute even for complicated games, and it is the right yardstick whenever the stakes are small compared with what you can afford. When they are not, EV is still the first question but no longer the last.

#### Two bets that feel alike

A famous pair from the history of probability: at even money, bet that one die shows at least one 6 in 4 rolls, or that two dice show at least one double 6 in 24 rolls. The second looks like the first scaled up (6 times the rarity, 6 times the tries), but

$$P(\text{a 6 in 4}) = 1 - \left(\tfrac{5}{6}\right)^4 = \tfrac{671}{1296} \approx 0.5177, \qquad P(\text{a double 6 in 24}) = 1 - \left(\tfrac{35}{36}\right)^{24} \approx 0.4914.$$

At even money a bet with win probability $p$ has EV $2p - 1$ per unit staked, so the first is worth taking and the second is not.

#### Comparing two positive bets

With a stake of 10, bet A wins 25 with probability 0.4 and bet B wins 12 with probability 0.5. Both have positive EV; which is better?

```cpp
mt19937_64 rng(2026);
int die() { return int(rng() % 6) + 1; }

int main() {
    // Even-money bets: a 6 in 4 rolls of one die; a double 6 in 24 rolls of two dice.
    double p1 = 1 - pow(5.0 / 6, 4), p2 = 1 - pow(35.0 / 36, 24);
    printf("one 6 in 4 rolls:     P = %.6f, EV per 1 staked %+.4f\n", p1, 2 * p1 - 1);
    printf("double 6 in 24 rolls: P = %.6f, EV per 1 staked %+.4f\n", p2, 2 * p2 - 1);
    const int games = 1'000'000;
    int win1 = 0, win2 = 0;
    for (int g = 0; g < games; ++g) {
        bool six = false, doubleSix = false;
        for (int i = 0; i < 4; ++i) six = die() == 6 || six;
        for (int i = 0; i < 24; ++i) {
            int a = die();
            int b = die();
            doubleSix = (a == 6 && b == 6) || doubleSix;
        }
        win1 += six, win2 += doubleSix;
    }
    for (auto [p, wins] : {pair{p1, win1}, {p2, win2}}) {
        double f = double(wins) / games;
        printf("simulated %.6f, %+.2f SE from exact\n", f, (f - p) / sqrt(p * (1 - p) / games));
    }

    // Two bets with a stake of 10: A wins 25 with p = 0.4, B wins 12 with p = 0.5.
    for (auto [name, p, win] : {tuple{"A", 0.4, 25.0}, {"B", 0.5, 12.0}}) {
        double ev = p * win - (1 - p) * 10, sd = (win + 10) * sqrt(p * (1 - p));
        printf("bet %s: EV %+.2f, sd %.2f, EV per unit of sd %.3f\n", name, ev, sd, ev / sd);
    }
}
```

Output:

```text
one 6 in 4 rolls:     P = 0.517747, EV per 1 staked +0.0355
double 6 in 24 rolls: P = 0.491404, EV per 1 staked -0.0172
simulated 0.517475, -0.54 SE from exact
simulated 0.491253, -0.30 SE from exact
bet A: EV +4.00, sd 17.15, EV per unit of sd 0.233
bet B: EV +1.00, sd 11.00, EV per unit of sd 0.091
```

The simulation lands within 0.6 standard errors of both exact probabilities. Bet A has four times the EV of B and only 1.6 times the standard deviation, so it offers much more edge per unit of risk (0.233 against 0.091). If you can place both at sizes of your choosing, prefer A; if either stake is a large part of your bankroll, size decides the answer, not the ranking.

#### A checklist for "should I take this bet?"

1. **List the outcomes and their probabilities.** Check they add to 1.
2. **Compute the EV after costs**: fees, the spread you cross, the price of entry.
3. **Look at the downside**: the worst outcome and its probability. Could it end the game?
4. **Compare**: EV per unit of risk against the other things you could do with the same money.
5. **Decide the size**, not just yes or no.

#### Common mistakes

- **Pattern-matching instead of computing**: the two dice bets above feel equal and are not.
- **Mixing up "3 to 1" and "3 for 1"**: 3 to 1 wins 3 and returns your stake; 3 for 1 returns 3 in total, a net win of 2.
- **Taking every positive-EV bet at full size**: a bet with positive EV can still ruin you if it is too large.

Connects to: [expectation](#/concept/prob.random-variables.expectation), [expected value of games](#/concept/prob.expected-value.expected-value-of-games), [edge and expected value in trades](#/concept/markets.making.edge-and-expected-value-in-trades), [Kelly criterion](#/concept/markets.betting.kelly-criterion). Practice: [Paid twice the die](#/problems/q-die-payout).

### questions
Q: How do you decide whether to take a bet?
A: List the outcomes with their probabilities and payoffs, compute the expected value after costs, and check that you can survive the bad outcomes. Then compare it with alternatives by expected value per unit of risk and choose a size.

Q: Is betting even money on at least one 6 in four rolls of a die a good bet?
A: Yes. The chance of no 6 is five sixths to the fourth power, 625/1296, so the win probability is 671/1296, about 51.8%. At even money that is an expected gain of about 3.6% of the stake.

Q: Why can a positive expected value bet still be a bad decision?
A: If the stake is large compared with your bankroll, a loss can end your ability to keep betting, and you never collect the long-run average. Costs, better alternatives and the variance also matter.

Q: How do you compare two bets with different stakes and payoffs?
A: Compute each one's expected value and standard deviation, and compare the ratio of the two, the expected value per unit of risk. The bet with more edge per unit of risk is better if you can size both freely.

Q: What is the expected value of a stake of 10 that wins 25 with probability 0.4 and otherwise loses the stake?
A: 0.4 times 25 minus 0.6 times 10, which is 10 minus 6, so plus 4 per bet.

## markets.betting.kelly-criterion
name: "Kelly criterion"
importance: must
prereqs: [markets.betting.expected-value-decisions]
scope: "optimal bet sizing, fractional Kelly"

### simple
The Kelly criterion tells you what fraction of your money to stake on a favorable bet so that your wealth grows fastest over many bets. Bet too little and you grow slowly; bet too much and the losses compound until you shrink, even though every bet has a positive edge. It is like watering a plant: too little and it grows slowly, too much and you drown it.

### interview
- Stake a fixed fraction $f$ of current wealth on a bet paying $b$ to 1 with win probability $p$ ($q = 1 - p$). The long-run growth rate per bet is $g(f) = p \ln(1 + bf) + q \ln(1 - f)$.
- Maximizing $g$ gives $f^* = p - \frac{q}{b} = \frac{bp - q}{b}$: the edge divided by the odds. Bet nothing if the edge is not positive.
- Kelly maximizes expected **log** wealth, so it is also the choice of an investor with log utility; it never risks ruin because it never stakes everything.
- For small edges, twice Kelly grows about as slowly as not betting, and more than that shrinks wealth. Overbetting is far worse than underbetting.
- **Fractional Kelly** (often half) keeps about three quarters of the growth for half the volatility, and protects against an overestimated edge.
- For an investment with excess return $\mu$ and variance $\sigma^2$, the continuous version is $f^* = \mu / \sigma^2$.

### deep
#### Intuition

With proportional stakes, a win multiplies wealth by $1 + bf$ and a loss by $1 - f$. After many bets your wealth is a product of these factors, so what matters is the average of their logarithms, not their average. A 50% loss followed by a 50% gain leaves you at 75%; losses hurt more than equal gains help, and larger stakes make that worse.

#### Derivation

$$g'(f) = \frac{pb}{1 + bf} - \frac{q}{1 - f} = 0 \;\Rightarrow\; pb(1 - f) = q(1 + bf) \;\Rightarrow\; f^* = \frac{pb - q}{b}.$$

$g$ is concave, so this is the maximum. The numerator $pb - q$ is the expected profit per unit staked (the edge); dividing by $b$ bets less on long shots.

#### Worked example

A bet pays 3 to 1 and wins 30% of the time. The edge is $0.3 \times 3 - 0.7 = 0.2$ per unit, so $f^* = 0.2 / 3 = 0.0667$. The program finds where growth falls back to zero, compares half Kelly, and simulates 20,000 bettors making 1,000 bets at 0.5, 1, 2 and 3 times Kelly.

```cpp
// A bet that pays 3 to 1 and wins 30% of the time. Stake a fixed fraction f of wealth each time.
const double p = 0.3, b = 3;
double growth(double f) { return p * log(1 + b * f) + (1 - p) * log(1 - f); }

int main() {
    double kelly = p - (1 - p) / b;
    double lo = kelly, hi = 0.99;  // the fraction beyond Kelly where growth falls to zero
    for (int i = 0; i < 100; ++i) (growth((lo + hi) / 2) > 0 ? lo : hi) = (lo + hi) / 2;
    printf("Kelly fraction %.4f; growth is zero again at f = %.4f\n", kelly, lo);
    printf("half Kelly keeps %.1f%% of the full-Kelly growth rate\n",
           100 * growth(kelly / 2) / growth(kelly));

    mt19937_64 rng(2026);
    const int bets = 1000, paths = 20000;
    for (double mult : {0.5, 1.0, 2.0, 3.0}) {
        double f = mult * kelly, sum = 0, sumSq = 0;
        vector<double> finals;
        int below = 0, halved = 0;
        for (int path = 0; path < paths; ++path) {
            double logW = 0;  // log of wealth; start at 1
            bool hitHalf = false;
            for (int i = 0; i < bets; ++i) {
                bool win = (rng() >> 11) * 0x1.0p-53 < p;
                logW += win ? log(1 + b * f) : log(1 - f);
                hitHalf = hitHalf || logW <= log(0.5);
            }
            finals.push_back(logW);
            sum += logW, sumSq += logW * logW, below += logW < 0, halved += hitHalf;
        }
        double mean = sum / paths / bets;
        double se = sqrt((sumSq / paths - pow(sum / paths, 2)) / paths) / bets;
        nth_element(finals.begin(), finals.begin() + paths / 2, finals.end());
        printf("%.1fx Kelly: growth per bet %.5f (exact %.5f, %+.2f SE)\n", mult, mean, growth(f),
               (mean - growth(f)) / se);
        printf("  median wealth x%.3g, P(below start) %.3f, P(ever halved) %.3f\n",
               exp(finals[paths / 2]), double(below) / paths, double(halved) / paths);
    }
}
```

Output:

```text
Kelly fraction 0.0667; growth is zero again at f = 0.1379
half Kelly keeps 76.0% of the full-Kelly growth rate
0.5x Kelly: growth per bet 0.00487 (exact 0.00486, +0.39 SE)
  median wealth x129, P(below start) 0.004, P(ever halved) 0.123
1.0x Kelly: growth per bet 0.00639 (exact 0.00640, -0.37 SE)
  median wealth x603, P(below start) 0.038, P(ever halved) 0.482
2.0x Kelly: growth per bet 0.00083 (exact 0.00077, +1.23 SE)
  median wealth x2.16, P(below start) 0.458, P(ever halved) 0.899
3.0x Kelly: growth per bet -0.01527 (exact -0.01520, -1.07 SE)
  median wealth x2.51e-07, P(below start) 0.934, P(ever halved) 0.994
```

#### Reading the results

- **Every simulated growth rate is within 1.3 standard errors of** $g(f)$, and the median bettor ends near $e^{1000\,g(f)}$: about 603 times the start at full Kelly.
- **Half Kelly keeps 76% of the growth** (the small-edge rule says 75%), and its bettors fall to half their starting wealth at some point only 12.3% of the time, against 48.2% at full Kelly. For small edges theory gives $\frac{1}{8}$ and $\frac{1}{2}$ for these two chances; the runs agree.
- **Twice Kelly is almost as bad as not betting**: growth 0.0008 per bet, with 46% of bettors behind after 1,000 favorable bets. Growth is zero at $f = 0.138$, about 2.07 times Kelly. **Three times Kelly** loses: the median bettor is left with a fraction $2.5 \times 10^{-7}$ of the start.

#### Why real traders bet less

The formula assumes you know $p$ and $b$ exactly. Overestimating the edge pushes you past $f^*$, where the curve falls steeply; underestimating it costs little near the peak. Add correlated bets, drawdown limits and costs, and fractional Kelly is the usual choice.

#### Common mistakes

- **Using $f = p - q$ for any odds.** That is the even-money case; in general divide the edge by $b$.
- **Maximizing expected wealth instead of its logarithm.** Expected wealth is largest when you stake everything, which ruins you almost surely.
- **Applying Kelly to a bet with no edge.** $f^* \le 0$ means don't bet.

Connects to: [derivatives and optimization](#/concept/math.calculus.derivatives-and-optimization), [law of large numbers](#/concept/prob.limits.law-of-large-numbers), [variance and risk of ruin](#/concept/markets.betting.variance-and-risk-of-ruin), [utility and risk aversion](#/concept/markets.betting.utility-and-risk-aversion). Practice: [Kelly on an even-money bet](#/problems/q-kelly) and [Kelly at 2 to 1](#/problems/q-kelly-two-to-one).

### questions
Q: What does the Kelly criterion maximize?
A: The expected logarithm of wealth, which is the long-run growth rate when you repeatedly stake a fixed fraction of your current wealth. It maximizes the typical outcome rather than the average one.

Q: What is the Kelly fraction for a bet paying b to 1 with win probability p?
A: f equals p minus q over b, which is the expected profit per unit staked divided by b. For a bet at 3 to 1 that wins 30% of the time, that is 0.3 minus 0.7 over 3, about 6.7% of wealth.

Q: Why do many traders bet half Kelly or less?
A: Half Kelly keeps about three quarters of the growth rate with half the volatility and much smaller drawdowns. It also protects against overestimating the edge, since betting beyond Kelly loses growth quickly while betting below it costs little.

Q: What happens if you bet twice the Kelly fraction?
A: For small edges your long-run growth rate falls to about zero, the same as not betting, while your wealth swings far more. Beyond about twice Kelly, wealth shrinks toward zero even though each bet is favorable.

Q: Why would maximizing expected wealth be a bad rule?
A: Expected wealth is largest when you stake everything on every favorable bet, but then a single loss wipes you out, so you are almost surely ruined over many bets. The average is carried by a tiny chance of an enormous outcome.

## markets.betting.variance-and-risk-of-ruin
name: "Variance and risk of ruin"
importance: important
prereqs: [markets.betting.expected-value-decisions]
scope: "Variance and risk of ruin"

### simple
Even a winning strategy has losing streaks, and if a streak takes all your money you never get to enjoy the average. Risk of ruin is the chance of that happening, and it depends on your edge and on how many bets' worth of money you hold. It is like a long hike with a limited water supply: the route may be downhill on average, but you still need enough water for the uphill stretches.

### interview
- For $n$ independent bets of size 1 at even money with win probability $p$, the total has mean $n(2p - 1)$ and standard deviation $2\sqrt{npq}$. The noise grows like $\sqrt{n}$, the edge like $n$.
- **Gambler's ruin** with fixed unit bets, starting with $a$ units and $p > q$: the chance of ever going broke is $(q/p)^a$. With a target $N$ at which you stop, it is $\frac{(q/p)^a - (q/p)^N}{1 - (q/p)^N}$.
- Ruin falls exponentially with bankroll: every extra unit multiplies it by $q/p$.
- Betting a fixed **fraction** of wealth (as Kelly does) never reaches zero, but it can still suffer deep drawdowns: at full Kelly the chance of ever halving is about 1/2.
- Ruin is a sizing problem: a better edge helps, a bigger bankroll relative to the bet size helps more.

### deep
#### Intuition

A bettor with a small edge is a random walk with a slight upward drift. Early on, the drift is tiny compared with the noise, so a walk that starts close to zero can easily hit it. Once the bankroll is large compared with the bet, the drift has time to carry it away and ruin becomes very unlikely.

#### Worked example

Bet 1 unit at a time at even money, winning with $p = 0.52$, so $q/p = 12/13$. Starting with 20 units and playing forever, the chance of ever going broke is $(12/13)^{20} \approx 0.2017$; stopping at 60 lowers it slightly to 0.1951; starting with 50 units it is only 0.0183. To push ruin below 1% you need $\lceil \ln 0.01 / \ln(12/13) \rceil = 58$ units.

```cpp
// Bet 1 unit at a time on an even-money bet that wins with p = 0.52.
const double p = 0.52, r = (1 - p) / p;  // r = q/p = 12/13
mt19937_64 rng(2026);

double exactRuin(int start, int target) {  // gambler's ruin; target 0 means "never stop"
    return target ? (pow(r, start) - pow(r, target)) / (1 - pow(r, target)) : pow(r, start);
}

double simulateRuin(int start, int stopAt, int paths) {
    int ruined = 0;
    for (int i = 0; i < paths; ++i) {
        int w = start;
        while (w > 0 && w < stopAt) w += (rng() >> 11) * 0x1.0p-53 < p ? 1 : -1;
        ruined += w == 0;
    }
    return double(ruined) / paths;
}

int main() {
    const int paths = 100000;
    struct Case { int start, target, stopAt; };
    // A target of 0 means playing forever; the simulation stops at 150, from where ruin has
    // probability (12/13)^150, about 6e-6, too small to see.
    for (auto [start, target, stopAt] : {Case{20, 60, 60}, Case{20, 0, 150}, Case{50, 0, 150}}) {
        double exact = exactRuin(start, target), sim = simulateRuin(start, stopAt, paths);
        printf("start %d, %s: ruin exact %.4f, simulated %.4f (%+.2f SE)\n", start,
               target ? "stop at 60" : "play forever", exact, sim,
               (sim - exact) / sqrt(exact * (1 - exact) / paths));
    }
    printf("units needed for ruin below 1%%: %.0f\n", ceil(log(0.01) / log(r)));
    int n = 1000;
    printf("after %d bets: mean %+.0f, sd %.1f\n", n, n * (2 * p - 1), 2 * sqrt(n * p * (1 - p)));
}
```

Output:

```text
start 20, stop at 60: ruin exact 0.1951, simulated 0.1931 (-1.63 SE)
start 20, play forever: ruin exact 0.2017, simulated 0.2022 (+0.38 SE)
start 50, play forever: ruin exact 0.0183, simulated 0.0184 (+0.32 SE)
units needed for ruin below 1%: 58
after 1000 bets: mean +40, sd 31.6
```

All three runs are within 1.7 standard errors of the exact values. The last line shows why ruin happens: after 1,000 bets the expected profit is 40 units, but the standard deviation is 31.6. With 20 units in hand, a one-standard-deviation bad patch early on is fatal.

#### Proportional betting

Staking a fixed fraction of wealth avoids ruin but not pain. In the [Kelly criterion](#/concept/markets.betting.kelly-criterion) simulation, full-Kelly bettors fell to half their starting wealth at some point 48% of the time, half-Kelly bettors 12%. A continuous approximation says a bettor at $c$ times Kelly falls to a fraction $x$ of the start with probability about $x^{2/c - 1}$, which gives $\frac{1}{2}$ and $\frac{1}{8}$ for $x = \frac{1}{2}$.

#### Common mistakes

- **Judging a strategy by a short run.** With 1,000 bets the noise (31.6) is nearly as large as the edge (40).
- **Sizing by edge alone.** A high-edge bet sized at the whole bankroll can still end the game on one loss.
- **Assuming independent bets.** Correlated losses (the same risk in several positions) behave like one large bet, and ruin rises sharply.

Connects to: [gambler's ruin](#/concept/prob.markov.gamblers-ruin), [random walks](#/concept/prob.markov.random-walks), [Kelly criterion](#/concept/markets.betting.kelly-criterion), [edge and expected value in trades](#/concept/markets.making.edge-and-expected-value-in-trades).

### questions
Q: With unit bets at even money, win probability p above one half and a bankroll of a units, what is the chance of ever going broke?
A: It is q over p raised to the power a. For p equal to 0.52 and 20 units that is 12/13 to the 20th, about 20%.

Q: How much does doubling the bankroll reduce the risk of ruin?
A: It squares the ruin probability, because the formula is exponential in the bankroll. A 20% chance of ruin with 20 units becomes about 4% with 40 units.

Q: Why can a strategy with a positive edge still lose money over a long period?
A: The expected profit grows in proportion to the number of bets, but the standard deviation grows with its square root, and for small edges the square root term dominates for a long time. After 1,000 even-money bets at 52% the edge is 40 units with a standard deviation of about 32.

Q: Can a bettor who stakes a fixed fraction of wealth be ruined?
A: Not literally, since they never stake everything, but they can suffer deep drawdowns. At full Kelly there is about a one in two chance of halving at some point, and bets above Kelly can shrink wealth toward zero.

Q: What reduces risk of ruin the most?
A: Betting smaller relative to the bankroll. A larger edge also helps, but halving the bet size doubles the bankroll measured in units, which squares an already small ruin probability.

## markets.betting.utility-and-risk-aversion
name: "Utility and risk aversion"
importance: important
prereqs: [markets.betting.kelly-criterion]
scope: "Utility and risk aversion"

### simple
Most people value a sure 100 more than a coin flip between 0 and 200, even though both average 100. Utility is a way to measure how much money is worth to you, and for most people each extra unit is worth a little less than the one before. It is like a hungry person and a full one offered the same sandwich: the first values it far more.

### interview
- A **utility function** $u(w)$ values wealth; risk aversion means $u$ is concave (each extra unit adds less).
- Choose by **expected utility** $E[u(W)]$, not expected wealth. The **certainty equivalent** $CE = u^{-1}(E[u(W)])$ is the sure amount you'd swap the gamble for.
- **Risk premium** = $E[W] - CE$: what you'd give up to remove the risk. Arrow-Pratt: premium $\approx \frac{1}{2} A(w)\sigma^2$ with $A(w) = -u''(w)/u'(w)$.
- **Log utility** ($A = 1/w$): the same bet looks less risky as wealth grows. A log-utility investor bets the Kelly fraction.
- Insurance works because a risk-averse buyer will pay more than the expected loss, while the insurer, spread across many independent risks, is nearly risk-neutral.

### deep
#### Intuition

A concave utility bends down, so the average of the utilities of two outcomes is below the utility of their average. A gamble therefore feels worth less than its expected value; how much less depends on the curvature and on how large the gamble is compared with your wealth.

#### Worked example

A coin flip wins 100 or loses 80, an expected value of +10 and a standard deviation of 90. The program computes the certainty equivalent under three utilities at wealth 200 and 1,000, compares the log risk premium with the Arrow-Pratt estimate $\frac{1}{2} \cdot \frac{90^2}{w}$, and finds the stake a log-utility investor would choose if the bet could be scaled.

```cpp
// A coin flip: win 100 or lose 80. Expected value +10. Would you take it?
struct Utility { const char* name; function<double(double)> u, inverse; };

int main() {
    vector<Utility> us = {
        {"linear", [](double w) { return w; }, [](double u) { return u; }},
        {"square root", [](double w) { return sqrt(w); }, [](double u) { return u * u; }},
        {"log", [](double w) { return log(w); }, [](double u) { return exp(u); }},
    };
    for (double wealth : {200.0, 1000.0}) {
        printf("wealth %.0f:\n", wealth);
        for (auto& [name, u, inverse] : us) {
            double expected = 0.5 * u(wealth + 100) + 0.5 * u(wealth - 80);
            double ce = inverse(expected);  // certainty equivalent of taking the bet
            printf("  %-11s certainty equivalent %8.2f -> %s, risk premium %.2f\n", name, ce,
                   ce > wealth ? "take it" : "refuse", wealth + 10 - ce);
        }
        printf("  Arrow-Pratt estimate of the log premium: 0.5 * 90^2 / %.0f = %.2f\n", wealth,
               0.5 * 90 * 90 / wealth);
    }
    // A log-utility investor may scale the bet: stake s wins 1.25 s or loses s, 50/50.
    for (double wealth : {200.0, 1000.0}) {
        double best = 0, bestValue = -1e300;
        for (double s = 0; s < wealth; s += 0.01) {
            double v = 0.5 * log(wealth + 1.25 * s) + 0.5 * log(wealth - s);
            if (v > bestValue) bestValue = v, best = s;
        }
        printf("wealth %.0f: best stake %.2f, %.1f%% of wealth\n", wealth, best,
               100 * best / wealth);
    }
}
```

Output:

```text
wealth 200:
  linear      certainty equivalent   210.00 -> take it, risk premium 0.00
  square root certainty equivalent   199.87 -> refuse, risk premium 10.13
  log         certainty equivalent   189.74 -> refuse, risk premium 20.26
  Arrow-Pratt estimate of the log premium: 0.5 * 90^2 / 200 = 20.25
wealth 1000:
  linear      certainty equivalent  1010.00 -> take it, risk premium 0.00
  square root certainty equivalent  1007.99 -> take it, risk premium 2.01
  log         certainty equivalent  1005.98 -> take it, risk premium 4.02
  Arrow-Pratt estimate of the log premium: 0.5 * 90^2 / 1000 = 4.05
wealth 200: best stake 20.00, 10.0% of wealth
wealth 1000: best stake 100.00, 10.0% of wealth
```

#### Reading the results

- **At wealth 200** the log investor values the flip at $\sqrt{300 \times 120} = 189.74$, below the 200 they already have, and refuses despite the positive EV. The square-root investor refuses by a hair (199.87). Only the risk-neutral (linear) one accepts.
- **At wealth 1,000** everyone accepts: the same bet is small next to their wealth. With log utility the premium falls from 20.26 to 4.02, in proportion to $1/w$.
- **Arrow-Pratt works well** for small risks: 20.25 against the exact 20.26, and 4.05 against 4.02.
- **Log utility is Kelly.** Scaling the bet so a stake $s$ wins $1.25s$, the log investor stakes exactly 10% of wealth at both levels, and Kelly gives $f^* = 0.5 - 0.5/1.25 = 0.1$. At wealth 200 that is a stake of 20, a quarter of the original bet.

#### Common mistakes

- **Averaging certainty equivalents** instead of utilities.
- **Ignoring wealth.** Whether a bet is acceptable depends on its size relative to what you have.
- **Treating risk aversion as irrational.** With a concave utility, refusing a small positive-EV bet at low wealth is consistent, as the example shows.

Connects to: [Kelly criterion](#/concept/markets.betting.kelly-criterion), [expected value decisions](#/concept/markets.betting.expected-value-decisions), [Taylor series](#/concept/math.calculus.taylor-series), [two envelopes and paradoxes](#/concept/puzzles.probability.two-envelopes-and-paradoxes). Practice: [What insurance is worth](#/problems/q-log-insurance).

### questions
Q: What is a certainty equivalent?
A: The sure amount of money that gives the same utility as a gamble: apply the inverse of the utility function to the gamble's expected utility. For a risk-averse person it is below the gamble's expected value.

Q: What does the Arrow-Pratt approximation say about the risk premium?
A: For small risks, the premium is about one half times the coefficient of absolute risk aversion times the variance. With log utility the coefficient is one over wealth, so a gamble with standard deviation 90 at wealth 200 costs about 20 in risk premium.

Q: Why might a log-utility investor refuse a positive expected value bet?
A: Because losses reduce log wealth more than equal gains increase it. A flip winning 100 or losing 80 at wealth 200 has a certainty equivalent of about 190, below the 200 they already have.

Q: How are log utility and the Kelly criterion related?
A: Kelly maximizes the expected logarithm of wealth, which is exactly what a log-utility investor maximizes for one bet. So a log-utility investor stakes the Kelly fraction of wealth.

Q: Why do both the buyer and the seller of insurance gain?
A: The buyer is risk-averse, so removing a large loss is worth more to them than its expected value. The insurer holds many independent risks, so its total is nearly certain and it only needs the premium to exceed the expected payout.
