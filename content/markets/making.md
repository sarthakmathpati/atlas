---
topic: markets.making
name: "Market making and trading games"
subject: markets
order: 2
prereqs: [markets.basics, prob.random-variables]
---

## markets.making.making-a-market
name: "Making a market"
importance: must
prereqs: [markets.basics.liquidity-and-market-makers]
scope: "quoting a bid and ask, width and confidence"

### simple
Making a market means naming two prices at once: one you will buy at and a higher one you will sell at, without knowing which the other person will choose. You center the pair on your best estimate of the value and keep the gap just wide enough to cover what you don't know. It is like a shop that buys and sells used books: it has to price both sides fairly, or customers will only ever trade the side that is wrong.

### interview
- A market is a **bid** (you buy) and an **ask** (you sell), for a stated size: "4.7 at 5.2, one lot each".
- Center it on your **fair value**, the expected settlement given what you know. Work it out aloud first.
- **Width** expresses uncertainty: wider when the value is hard to estimate or the other side may know more, tighter when you are confident. Too wide is useless; too tight gets picked off.
- Every trade is information. If someone buys from you, ask what they must believe, update your fair value and move your quotes.
- **Skew** for position: when you are already short, raise both quotes a little to attract sellers.
- Interviewers grade the process: a sensible fair value, a reasoned width, and clean updates after each trade, not the exact numbers.

### deep
#### Intuition

A two-sided quote is a commitment you make before seeing the other side's choice, so each side must be fair on its own. If your bid is above the value, anyone will sell to you; if your ask is below it, anyone will buy. The width is your insurance against being wrong about the value and against the counterparty knowing more than you.

#### A worked game

**Interviewer:** "I've rolled three dice and looked at one of them. Make me a market on the highest of the three."

**You, thinking aloud:** "Before your information: the highest is at most 5 with probability $(5/6)^3 = 125/216$, so there's about a 42% chance of a 6. The expected maximum is $\sum_k P(\max \ge k) = 6 - \frac{0 + 1 + 8 + 27 + 64 + 125}{216} = \frac{119}{24}$, about 4.96, with a standard deviation near 1.1. You've seen a die, so you know something I don't, and I'll be wider than I'd be against someone who knows nothing. 4.7 at 5.2."

**Interviewer:** "I buy at 5.2."

**You:** "You'd pay 5.2 only if the die you saw makes the maximum worth more. A 5 makes it worth about 5.31 and a 6 makes it 6; a 4 gives about 4.86, below 5.2. So you saw a 5 or a 6, and my fair value is now about 5.65. I'm short one at 5.2, already about 0.45 behind. New market 5.5 at 5.9, leaning up because I'm short and you look informed. If you sell at 5.5, you probably saw the 5; if you buy at 5.9, the 6."

The program checks every number by enumerating all 216 rolls, including what each trade reveals.

```cpp
// Market on the maximum of three fair dice; the counterparty has seen one die.
int main() {
    double sum = 0, sumSq = 0, given[7] = {};
    for (int a = 1; a <= 6; ++a)          // a is the die the counterparty saw
        for (int b = 1; b <= 6; ++b)
            for (int c = 1; c <= 6; ++c) {
                int m = max({a, b, c});
                sum += m, sumSq += m * m, given[a] += m / 36.0;
            }
    double mean = sum / 216, sd = sqrt(sumSq / 216 - mean * mean);
    printf("fair value %.4f (119/24 = %.4f), sd %.4f\n", mean, 119.0 / 24, sd);
    for (int a = 1; a <= 6; ++a) printf("seen %d: fair value %.4f\n", a, given[a]);

    // Quote 4.7 at 5.2. The counterparty buys only if it pays, sells only if it pays.
    double bid = 4.7, ask = 5.2, nBuy = 0, vBuy = 0, nSell = 0, vSell = 0;
    for (int a = 1; a <= 6; ++a) {
        if (given[a] > ask) nBuy += 1, vBuy += given[a];
        if (given[a] < bid) nSell += 1, vSell += given[a];
    }
    printf("they buy at %.1f after seeing %.0f of the 6 values: fair value %.4f\n", ask, nBuy,
           vBuy / nBuy);
    printf("they sell at %.1f after seeing %.0f of the 6 values: fair value %.4f\n", bid, nSell,
           vSell / nSell);
}
```

Output:

```text
fair value 4.9583 (119/24 = 4.9583), sd 1.1439
seen 1: fair value 4.4722
seen 2: fair value 4.5000
seen 3: fair value 4.6111
seen 4: fair value 4.8611
seen 5: fair value 5.3056
seen 6: fair value 6.0000
they buy at 5.2 after seeing 2 of the 6 values: fair value 5.6528
they sell at 4.7 after seeing 3 of the 6 values: fair value 4.5278
```

A buy at 5.2 means the fair value is $\frac{1}{2}\left(\frac{191}{36} + 6\right) = \frac{407}{72} \approx 5.65$; a sell at 4.7 would have meant a 1, 2 or 3 (fair value about 4.53); only a 4 leads to no trade. Against a counterparty who knew nothing, a tight 4.9 at 5.0 would be fine, since every trade would earn the gap to 4.96. Against one who has seen a die, both sides of that tight market lose.

#### Choosing the width

- **Uncertainty about the value.** If you can compute it exactly, as here, width only protects against information. For estimation questions the width should cover your own error; a width of about one standard deviation of your estimate is a reasonable start.
- **What the other side might know.** The more informed they could be, the wider you go; this is [adverse selection](#/concept/markets.making.adverse-selection).
- **Your position.** Already long or short? [Skew](#/concept/markets.making.inventory-and-position-risk) both quotes rather than only widening.

#### Common mistakes

- **Quoting before computing.** Say the fair value and how you got it, then the market.
- **Ignoring what a trade says.** "You bought, so I'll keep the same market" gives away edge on every repeat.
- **Answering every trade by widening.** Move the center; widen only when your uncertainty grew.
- **Forgetting your position.** Track it after each trade and include it in the next quote.

Connects to: [expected value](#/concept/prob.random-variables.expectation), [order statistics](#/concept/prob.distributions.order-statistics), [edge and expected value in trades](#/concept/markets.making.edge-and-expected-value-in-trades), [trading game practice](#/concept/markets.making.trading-game-practice). Practice: [Market on two dice](#/problems/q-dice-market) and [Market on three cards](#/problems/q-card-total-market).

### questions
Q: What does making a market mean in an interview?
A: Giving a bid and an ask at the same time, for a stated size, on some uncertain quantity, without knowing which side the interviewer will trade. The quotes should be centered on your fair value, with a width you can justify.

Q: What should decide the width of your market?
A: How uncertain your fair value is and how likely the counterparty is to know more than you. When the value can be computed exactly and the counterparty knows nothing, the market can be tight; when they may be informed, it must be wider.

Q: The interviewer buys at your ask. What do you do next?
A: Ask what they must believe to buy there, update your fair value toward it, and move your quotes. Also account for your new short position, for example by raising both quotes slightly.

Q: Why is a very wide market a poor answer?
A: It never trades, so it tells nothing and earns nothing, and it signals that you can't estimate the value. Interviewers want the tightest market you can defend.

Q: What is the fair value of the highest of three fair dice?
A: The sum over k of the probability that the maximum is at least k, which is 6 minus 225 over 216, or 119/24, about 4.96. The chance of at least one 6 is 91/216, about 42%.

## markets.making.edge-and-expected-value-in-trades
name: "Edge and expected value in trades"
importance: must
scope: "Edge and expected value in trades"

### simple
Edge is how much a trade is worth to you on average: the fair value minus what you pay when you buy, or the price minus the fair value when you sell. A single trade can still lose, because the outcome is random. Edge is like a casino's small advantage on each spin: any one spin can go either way, but thousands of spins make the advantage show.

### interview
- **Edge per unit** = fair value − price for a buy, price − fair value for a sell. Multiply by size for the trade's expected P&L.
- Measure edge against the fair value **when you trade**, not against the final outcome. A good trade can lose money and a bad one can win.
- Costs come straight out of edge: fees, the spread you cross, and impact.
- Over $n$ independent trades the mean P&L grows like $n$ but its standard deviation grows like $\sqrt{n}$, so the chance of being ahead rises toward 1.
- The number of trades needed to show an edge scales like $(\sigma / \text{edge})^2$: halve the edge and you need four times as many.
- Positive expected value is necessary, not sufficient: size decides whether you survive the variance ([Kelly criterion](#/concept/markets.betting.kelly-criterion)).

### deep
#### Intuition

Think of each trade as a small, slightly loaded coin. The load is the edge; the noise is the outcome's spread. One flip says almost nothing about the load. Many flips average the noise away, because the noise grows like the square root of the number of trades while the edge grows in proportion to it.

#### Worked example

A contract pays the roll of a fair die, so its fair value is 3.5 with standard deviation $\sqrt{35/12} \approx 1.708$. You can buy it at 3.2: an edge of 0.3 per trade. After $n$ trades your P&L has mean $0.3n$ and standard deviation $1.708\sqrt{n}$. The program computes the exact chance of being ahead, from the exact distribution of a sum of $n$ dice, and compares it with the normal approximation $\Phi(0.3\sqrt{n} / 1.708)$ and a seeded simulation.

```cpp
// Buy a contract that pays one fair die roll, at a price of 3.2 (fair value 3.5), n times.
double exactProfitChance(int n, double price) {  // P(sum of n dice > n * price), by DP
    vector<double> dist(6 * n + 1, 0.0);
    dist[0] = 1;
    for (int i = 0; i < n; ++i) {
        vector<double> next(6 * n + 1, 0.0);
        for (int s = 0; s <= 6 * i; ++s)
            for (int face = 1; face <= 6; ++face) next[s + face] += dist[s] / 6;
        dist = next;
    }
    double p = 0;
    for (int s = 0; s <= 6 * n; ++s)
        if (s > n * price + 1e-9) p += dist[s];
    return p;
}

int main() {
    const double price = 3.2, edge = 3.5 - price, sd = sqrt(35.0 / 12);
    printf("edge %.2f per trade, sd %.4f per trade\n", edge, sd);
    for (int n : {1, 10, 25, 50, 88, 90, 100, 200}) {
        double normal = 0.5 * erfc(-edge * sqrt(n) / sd / sqrt(2.0));
        printf("n = %3d: mean P&L %5.1f, sd %5.2f, P(profit) exact %.4f, normal approx %.4f\n",
               n, edge * n, sd * sqrt(n), exactProfitChance(n, price), normal);
    }
    int first = 0, last = 0;
    for (int n = 1; n <= 300; ++n)
        if (exactProfitChance(n, price) < 0.95) last = n;
        else if (!first) first = n;
    printf("P(profit) >= 0.95 first at n = %d; last n below 0.95 (up to 300): %d\n", first, last);

    mt19937_64 rng(2026);
    const int runs = 100000, n = 100;
    int wins = 0;
    for (int r = 0; r < runs; ++r) {
        int sum = 0;
        for (int i = 0; i < n; ++i) sum += int(rng() % 6) + 1;
        wins += sum > n * price;
    }
    double p = double(wins) / runs, exact = exactProfitChance(n, price);
    printf("simulated n = 100: %.4f (%+.2f SE from exact)\n", p,
           (p - exact) / sqrt(exact * (1 - exact) / runs));
}
```

Output:

```text
edge 0.30 per trade, sd 1.7078 per trade
n =   1: mean P&L   0.3, sd  1.71, P(profit) exact 0.5000, normal approx 0.5697
n =  10: mean P&L   3.0, sd  5.40, P(profit) exact 0.6760, normal approx 0.7107
n =  25: mean P&L   7.5, sd  8.54, P(profit) exact 0.7928, normal approx 0.8101
n =  50: mean P&L  15.0, sd 12.08, P(profit) exact 0.8847, normal approx 0.8929
n =  88: mean P&L  26.4, sd 16.02, P(profit) exact 0.9509, normal approx 0.9503
n =  90: mean P&L  27.0, sd 16.20, P(profit) exact 0.9490, normal approx 0.9522
n = 100: mean P&L  30.0, sd 17.08, P(profit) exact 0.9580, normal approx 0.9605
n = 200: mean P&L  60.0, sd 24.15, P(profit) exact 0.9932, normal approx 0.9935
P(profit) >= 0.95 first at n = 88; last n below 0.95 (up to 300): 90
simulated n = 100: 0.9591 (+1.86 SE from exact)
```

#### Reading the table

- **One trade is a coin flip.** With a single roll you profit only on 4, 5 or 6: exactly 50%, even with a 0.3 edge.
- **The edge wins slowly.** You need 88 trades before the chance of being ahead first reaches 95%, matching the normal estimate $n \ge (1.645 \times 1.708 / 0.3)^2 \approx 88$. At $n = 90$ it dips just below, because $3.2 \times 90 = 288$ is a whole number and breaking even doesn't count as profit; from 91 on it stays above.
- **The simulation agrees**: 0.9591 against the exact 0.9580, 1.86 standard errors away.

#### Edge after costs

If crossing the spread and fees cost 0.1 per contract, the edge falls to 0.2 and the trades needed grow by $(0.3/0.2)^2 = 2.25$ times. Small costs matter because the required number of trades depends on the square of the edge.

#### Common mistakes

- **Judging a trade by its outcome.** Score it by the edge at the time; outcomes are noisy.
- **Quoting edge without size and variance.** "0.3 per trade" means little without the 1.7 of noise around it.
- **Forgetting the costs of getting the trade.** The spread you cross is taken from the edge before anything else.

Connects to: [expected value](#/concept/prob.random-variables.expectation), [central limit theorem](#/concept/prob.limits.central-limit-theorem), [expected value decisions](#/concept/markets.betting.expected-value-decisions), [variance and risk of ruin](#/concept/markets.betting.variance-and-risk-of-ruin).

### questions
Q: How do you calculate the edge of a trade?
A: For a buy, the fair value minus the price paid; for a sell, the price received minus the fair value; then multiply by size. The fair value is your best estimate at the time of the trade, not the eventual outcome.

Q: You buy something worth 3.5 on average at 3.2 and lose money. Was it a bad trade?
A: Not necessarily. It had an edge of 0.3, and a single outcome is dominated by noise: with a die roll, you lose half the time even with that edge. Judge the decision by its expected value and repeat it at a sensible size.

Q: Why does repeating a positive-edge trade make profit more likely?
A: The expected profit grows in proportion to the number of trades, while its standard deviation grows only with the square root. The ratio of mean to spread therefore grows like the square root of n, pushing the chance of being ahead toward 1.

Q: How many more trades do you need to show an edge that is half as large?
A: About four times as many. The number needed scales with the square of the noise divided by the edge.

Q: How do trading costs affect edge?
A: They subtract directly from it: crossing the spread, fees and impact reduce the expected profit per trade. Because the trades needed grow with one over the edge squared, even small costs make a thin edge much harder to realize.

## markets.making.adverse-selection
name: "Adverse selection"
importance: must
prereqs: [markets.making.making-a-market]
scope: "why informed traders hurt market makers"

### simple
Adverse selection means the people most eager to trade with you are often the ones who know something you don't. A market maker's quote is trade-able by anyone, so when someone with better information arrives, they take exactly the side that is wrong. It is like selling used cars at one price for all of them: the buyers who inspect carefully pick the good ones, and you keep being left with the lemons.

### interview
- An informed trader buys only when the value is above your ask and sells only when it is below your bid, so you lose on every informed trade.
- You recover those losses from uninformed (noise) traders through the spread. The break-even spread grows with the share of informed traders and with how much they know.
- **Glosten-Milgrom**: quote ask = $E[V \mid \text{a buy}]$ and bid = $E[V \mid \text{a sell}]$. A buy is evidence that the value is high.
- Order flow moves prices: each trade updates your belief by Bayes' rule, and quotes drift toward the true value.
- The same effect is the **winner's curse** in auctions: winning means you were the most optimistic.
- Defenses: widen, reduce size, update faster, and pay attention to who is trading and how.

### deep
#### Intuition

Your fills are not random draws: someone trades with you when they prefer your price, which is more likely when your price is wrong. Being hit is itself bad news about what you just bought.

#### A model you can solve

The value $V$ is 90 or 110 with equal chance. Each trader is informed with probability 0.3 (buys if $V$ is high, sells if low) or else trades at random. Then

$$P(\text{buy} \mid V = 110) = 0.3 + 0.35 = 0.65, \quad P(\text{buy} \mid V = 90) = 0.35,$$

so the break-even ask is $E[V \mid \text{buy}] = \frac{110 \times 0.65 + 90 \times 0.35}{0.65 + 0.35} = 103$, and by symmetry the bid is 97. The half-spread of 3 equals the informed share times the half-distance between the values, $0.3 \times 10$. The program tests a naive 99 at 101 and 97 at 103 on a million trades each, then replays six trades when the value is in fact 110.

```cpp
// The value is 90 or 110, equally likely; 30% of traders know it, the rest trade at random.
const double lo = 90, hi = 110, informed = 0.3;
mt19937_64 rng(2026);
double uniform() { return (rng() >> 11) * 0x1.0p-53; }

// Quotes that break even, given the belief pi = P(value is high).
pair<double, double> quotes(double pi) {
    double buyHi = informed + (1 - informed) / 2, buyLo = (1 - informed) / 2;  // P(buy | value)
    double ask = (hi * pi * buyHi + lo * (1 - pi) * buyLo) / (pi * buyHi + (1 - pi) * buyLo);
    double sellHi = buyLo, sellLo = buyHi;                                      // P(sell | value)
    double bid = (hi * pi * sellHi + lo * (1 - pi) * sellLo) / (pi * sellHi + (1 - pi) * sellLo);
    return {bid, ask};
}

void simulate(double bid, double ask) {
    const int trades = 1'000'000;
    double noise = 0, info = 0, sum = 0, sumSq = 0;
    for (int t = 0; t < trades; ++t) {
        double value = uniform() < 0.5 ? hi : lo;
        bool knows = uniform() < informed;
        bool buys = knows ? value > ask : uniform() < 0.5;  // informed buy only when it pays
        double pnl = buys ? ask - value : value - bid;      // the market maker's side
        (knows ? info : noise) += pnl;
        sum += pnl, sumSq += pnl * pnl;
    }
    double mean = sum / trades, se = sqrt((sumSq / trades - mean * mean) / trades);
    printf("quote %.0f at %.0f: per trade %+.3f (SE %.3f); from noise %+.3f, from informed %+.3f\n",
           bid, ask, mean, se, noise / trades, info / trades);
}

int main() {
    auto [bid, ask] = quotes(0.5);
    printf("break-even quotes: %.2f at %.2f\n", bid, ask);
    simulate(99, 101);
    simulate(bid, ask);

    double pi = 0.5;  // the value is in fact high; watch the quotes learn from the order flow
    for (char side : string("BBSBBB")) {
        double buyHi = informed + (1 - informed) / 2, buyLo = (1 - informed) / 2;
        double likeHi = side == 'B' ? buyHi : buyLo, likeLo = side == 'B' ? buyLo : buyHi;
        pi = pi * likeHi / (pi * likeHi + (1 - pi) * likeLo);  // Bayes after the trade
        auto [b, a] = quotes(pi);
        printf("after a %s: P(high) = %.3f, quotes %.2f at %.2f\n", side == 'B' ? "buy " : "sell",
               pi, b, a);
    }
}
```

Output:

```text
break-even quotes: 97.00 at 103.00
quote 99 at 101: per trade -2.009 (SE 0.010); from noise +0.690, from informed -2.699
quote 97 at 103: per trade -0.002 (SE 0.010); from noise +2.097, from informed -2.100
after a buy : P(high) = 0.650, quotes 100.00 at 105.50
after a buy : P(high) = 0.775, quotes 103.00 at 107.30
after a sell: P(high) = 0.650, quotes 100.00 at 105.50
after a buy : P(high) = 0.775, quotes 103.00 at 107.30
after a buy : P(high) = 0.865, quotes 105.50 at 108.45
after a buy : P(high) = 0.922, quotes 107.30 at 109.13
```

#### Reading the results

- **The naive market loses 2 per trade.** Exactly: noise traders pay $0.7 \times 1 = 0.7$, informed traders take $0.3 \times 9 = 2.7$. The run shows $-2.009$, 0.9 standard errors from $-2$.
- **The break-even market makes nothing**: $0.7 \times 3 = 2.1$ in, $0.3 \times 7 = 2.1$ out (the run is 0.2 standard errors from 0). The uninformed pay for the informed.
- **Prices learn from trades.** Each buy multiplies the odds of "high" by $0.65/0.35$ and a sell undoes one buy, so after five buys and one sell the quotes are 107.30 at 109.13, close to the true 110.

#### In an interview game

**Interviewer:** "I'll buy 10 at your offer." **You:** "Why 10? You may know something. I'll raise my fair value, move both quotes up and show smaller size until I see what you do next." Saying this aloud is most of the answer.

#### Common mistakes

- **Treating fills as random.** They come more often when your quote is wrong.
- **Only widening after a trade.** The trade is evidence; move the center.

Connects to: [Bayes' theorem](#/concept/prob.foundations.bayes-theorem), [making a market](#/concept/markets.making.making-a-market), [liquidity and market makers](#/concept/markets.basics.liquidity-and-market-makers), [auctions and the winner's curse](#/concept/markets.game-theory.auctions). Practice: [Market on two dice](#/problems/q-dice-market).

### questions
Q: What is adverse selection for a market maker?
A: Losing on trades with better-informed counterparties, who buy when your ask is too low and sell when your bid is too high. Because they choose when to trade, your fills are biased toward the times your quotes are wrong.

Q: How does the spread protect a market maker against informed traders?
A: It earns a margin from uninformed traders on every trade, which pays for the losses to informed ones. The break-even half-spread grows with the share of informed traders and with how far the value can be from your estimate.

Q: In the Glosten-Milgrom model, how are the bid and ask set?
A: The ask is the expected value given that the next trader buys, and the bid is the expected value given that they sell. Since informed traders are more likely to buy when the value is high, the ask sits above the unconditional mean and the bid below it.

Q: Why do prices move after trades even when nobody announces news?
A: Each trade carries some probability of being informed, so a buy is evidence that the value is higher. Market makers update their beliefs and quotes after every trade, and prices drift toward the true value.

Q: Someone asks to buy a large size at your offer. How do you react?
A: Treat it as information: raise your fair value, move both quotes up, and reduce the size you show until you learn more. Keep track of the short position you took and how much it would cost if they were right.

## markets.making.inventory-and-position-risk
name: "Inventory and position risk"
importance: important
prereqs: [markets.making.making-a-market]
scope: "skewing quotes"

### simple
A market maker who keeps buying ends up holding a pile of inventory, and every move in the price then changes their profit. To get back to flat they skew their quotes: when long, they lower both the bid and the ask, so buyers find them cheaper and sellers less attractive. It is like a baker with too many loaves at closing time, who marks them down to clear the shelf.

### interview
- **Inventory risk**: the P&L of a position is position × price change, so a random walk in the price becomes a random walk in P&L that grows with the size held.
- **Skew** both quotes against your position: long means lower both quotes; short means raise them. You give up a little edge per trade to shrink the position.
- Skewing is not widening: widening trades less on both sides, skewing trades more on the side that reduces risk.
- A classic model (Avellaneda-Stoikov) centers quotes on a reservation price $r = s - q\gamma\sigma^2(T - t)$, which is lower when you are long ($q > 0$), more risk-averse ($\gamma$), in more volatile markets ($\sigma$) or earlier in the day.
- Other tools: position limits, hedging in a related instrument, and reducing size.

### deep
#### Intuition

Earning the spread needs trades to come in balanced, but they don't: buyers and sellers arrive at random, so the position wanders like a random walk. A position of 20 units in a market that moves one tick at a time turns every tick into 20 ticks of P&L. Skewing turns the market maker from a passive target into someone steering the position back toward zero.

#### Simulation

A made-up model in ticks: fair value moves one tick up or down each step; the market maker quotes 2 ticks each side of fair value, shifted by $k \times$ inventory ticks (rounded). A buyer and a seller each arrive with probability 0.5 per step, and trade with a probability that falls as the quote gets worse than fair value (1.0 at or better than fair, then 0.8, 0.6, 0.4, 0.25 and 0.1 for 1 to 5 ticks worse).

```cpp
mt19937_64 rng(2026);
double uniform() { return (rng() >> 11) * 0x1.0p-53; }

// Chance that an arriving customer trades at a quote d ticks worse than fair value (made up).
double fillChance(long d) {
    const double table[] = {1.0, 0.8, 0.6, 0.4, 0.25, 0.1};
    return d <= 0 ? 1.0 : d < 6 ? table[d] : 0.0;
}

int main() {
    const int steps = 1000, paths = 10000, h = 2;  // half-spread 2 ticks around fair value
    for (double k : {0.0, 0.1, 0.25, 0.5}) {       // ticks of skew per unit of inventory
        double sum = 0, sumSq = 0, absInv = 0, peak = 0, trades = 0;
        for (int path = 0; path < paths; ++path) {
            long value = 10000, cash = 0, inv = 0, maxInv = 0;
            for (int t = 0; t < steps; ++t) {
                long skew = lround(k * inv);  // long: shade both quotes down to sell more
                long bid = value - h - skew, ask = value + h - skew;
                if (uniform() < 0.5 && uniform() < fillChance(ask - value))
                    cash += ask, --inv, ++trades;  // a customer buys from us
                if (uniform() < 0.5 && uniform() < fillChance(value - bid))
                    cash -= bid, ++inv, ++trades;  // a customer sells to us
                maxInv = max(maxInv, labs(inv));
                value += uniform() < 0.5 ? 1 : -1;
            }
            double pnl = cash + inv * value;
            sum += pnl, sumSq += pnl * pnl, absInv += labs(inv), peak += maxInv;
        }
        double mean = sum / paths, sd = sqrt(sumSq / paths - mean * mean);
        printf("skew %.2f: P&L %6.1f (SE %.1f), sd %5.1f, per trade %.3f, "
               "|inventory| end %4.1f, peak %4.1f\n",
               k, mean, sd / sqrt(paths), sd, sum / trades, absInv / paths, peak / paths);
    }
}
```

Output:

```text
skew 0.00: P&L 1196.7 (SE 4.5), sd 449.4, per trade 1.995, |inventory| end 16.3, peak 25.0
skew 0.10: P&L 1162.9 (SE 1.2), sd 115.9, per trade 1.937, |inventory| end  2.9, peak  8.3
skew 0.25: P&L 1116.3 (SE 0.7), sd  70.1, per trade 1.859, |inventory| end  1.5, peak  5.8
skew 0.50: P&L 1041.1 (SE 0.6), sd  56.2, per trade 1.731, |inventory| end  1.0, peak  4.2
```

#### Reading the results

- **Without skew** the expected P&L is exact: 2 ticks a trade on $1000 \times 2 \times 0.5 \times 0.6 = 600$ expected trades, so 1,200; the run is 0.7 standard errors below. But one path's standard deviation is 449, and the inventory drifts to 25 units at its peak on average.
- **A small skew changes everything.** At $k = 0.1$ the P&L falls 3% (1,163) while its standard deviation falls to a quarter (116), and the peak inventory to 8.3. The mean-to-noise ratio goes from 2.7 to 10.
- **More skew keeps paying less.** From $k = 0.25$ to $0.5$, risk drops a little and edge per trade keeps falling (1.86 to 1.73 ticks), because the maker more often sells at or below fair value to shed inventory.

#### Common mistakes

- **Widening instead of skewing.** Wider quotes trade less on both sides; skewed quotes trade more on the side that helps.
- **Skewing so hard you pay the spread.** Quotes that cross fair value give away edge on every trade.
- **Ignoring correlated positions.** Being long two related products is one bigger position, not two small ones.

Connects to: [making a market](#/concept/markets.making.making-a-market), [liquidity and market makers](#/concept/markets.basics.liquidity-and-market-makers), [random walks](#/concept/prob.markov.random-walks), [diversification and correlation](#/concept/markets.pricing.diversification-and-correlation).

### questions
Q: What is inventory risk?
A: The risk that the price moves while you hold a position. Your P&L changes by the position times the price change, so the larger and longer you hold inventory, the noisier your results.

Q: You are long 20 units after several customers sold to you. How do you adjust your quotes?
A: Lower both the bid and the ask. A lower ask attracts buyers who take inventory off you, and a lower bid makes further sells to you less likely, at the cost of a little edge per trade.

Q: Why skew instead of simply widening your quotes?
A: Widening reduces trading on both sides, including the trades that would reduce your position. Skewing keeps you competitive on the side that helps and discourages the side that adds risk.

Q: What does the reservation price in the Avellaneda-Stoikov model depend on?
A: It is the mid-price shifted against your inventory by an amount proportional to the inventory, your risk aversion, the price variance and the time left. More inventory, more risk aversion, more volatility or more time mean a bigger shift.

Q: What limits how much you should skew?
A: Each tick of skew costs edge, and quotes on the wrong side of fair value lose money on every trade. The right amount balances the edge given up against the risk removed.

## markets.making.trading-game-practice
name: "Trading game practice"
importance: important
prereqs: [markets.making.making-a-market]
scope: "estimation markets used in interviews"

### simple
Trading interviews often turn a question into a small game: you make markets, the interviewer trades with you, new information arrives, and at the end the contract settles. You are judged on how clearly you estimate, update and manage your position, not on luck. It is like a poker hand played face up with the interviewer: every decision can be checked.

### interview
- Common formats: a market on a random quantity (dice, cards) with information revealed in rounds, or an **estimation market** on a fact nobody at the table knows exactly.
- Each round: say your fair value and how you got it, quote a market with a sensible width, trade, then update both fair value and position.
- Keep a ledger: position, average price, and P&L at the current fair value.
- **Decompose P&L**: edge captured when you trade, plus inventory gains or losses as the fair value moves.
- For estimation markets: build the estimate from parts, quote wide at first, and treat the other side's trades as information.
- Stay calm when behind: a losing position is not a reason to change a correct fair value.

### deep
#### A worked card game

**Interviewer:** "Here are ten cards numbered 1 to 10. I shuffle and deal three face down. The contract settles at their sum. I'll turn one card over each round. Make me a market."

**You (round 0):** "Each card averages 5.5, so the fair value is 16.5. Without replacement the variance is $3 \times 8.25 \times \frac{7}{9} = 19.25$, a standard deviation of about 4.4. 15.5 at 17.5, one lot."

**Interviewer:** "I buy 2 at 17.5." *You are short 2, with an edge of $2 \times 1 = 2$.*

**You (round 1, an 8 is shown):** "The other two come from nine cards summing to 47, so the fair value is $8 + 2 \times \frac{47}{9} \approx 18.44$. My short lost about 3.9 on that. I want to buy back, so I lean up: 18.0 at 19.5."

**Interviewer:** "I sell 1 at 18.0." *Short 1; edge $18.44 - 18.0 = 0.44$.*

**You (round 2, a 3 is shown):** "One card left from eight that sum to 44, so the fair value is $11 + 5.5 = 16.5$, standard deviation about 3. Still short 1: 16.0 at 17.5."

**Interviewer:** "I sell 1 at 16.0." *Flat; edge 0.5.* **Last card: a 6.** Settlement 17.

The program recomputes every fair value by enumerating all 720 deals and splits the P&L into edge and inventory.

```cpp
// Three cards are dealt from ten cards numbered 1 to 10; the contract settles at their sum.
// Fair value and standard deviation given the cards already shown, by enumeration.
pair<double, double> fair(vector<int> shown) {
    double n = 0, sum = 0, sumSq = 0;
    for (int a = 1; a <= 10; ++a)
        for (int b = 1; b <= 10; ++b)
            for (int c = 1; c <= 10; ++c) {
                if (a == b || a == c || b == c) continue;
                int deal[] = {a, b, c};
                if (!equal(shown.begin(), shown.end(), deal)) continue;
                n += 1, sum += a + b + c, sumSq += (a + b + c) * (a + b + c);
            }
    double mean = sum / n;
    return {mean, sqrt(sumSq / n - mean * mean)};
}

int main() {
    vector<vector<int>> rounds = {{}, {8}, {8, 3}, {8, 3, 6}};
    // Trades in the game: quantity (+ we buy, - we sell) and price, one per round.
    vector<pair<int, double>> trades = {{-2, 17.5}, {+1, 18.0}, {+1, 16.0}};
    double position = 0, edge = 0, carry = 0, lastFair = 0;
    for (size_t r = 0; r < rounds.size(); ++r) {
        auto [value, sd] = fair(rounds[r]);
        carry += position * (value - lastFair);  // inventory gain or loss as the value moves
        printf("shown %zu card(s): fair %.4f, sd %.4f", r, value, sd);
        if (r < trades.size()) {
            auto [qty, price] = trades[r];
            edge += qty * (value - price);
            position += qty;
            printf("; trade %+d at %.1f, edge %+.4f", qty, price, qty * (value - price));
        }
        printf("\n");
        lastFair = value;
    }
    printf("edge %+.4f + inventory %+.4f = P&L %+.4f\n", edge, carry, edge + carry);

    int count = 0, total = 0;  // the estimation market: the sum of the two-digit primes
    for (int n = 10; n < 100; ++n) {
        bool prime = true;
        for (int d = 2; d * d <= n; ++d) prime = prime && n % d != 0;
        if (prime) ++count, total += n;
    }
    printf("two-digit primes: %d of them, sum %d\n", count, total);
}
```

Output:

```text
shown 0 card(s): fair 16.5000, sd 4.3875; trade -2 at 17.5, edge +2.0000
shown 1 card(s): fair 18.4444, sd 3.8329; trade +1 at 18.0, edge +0.4444
shown 2 card(s): fair 16.5000, sd 2.9580; trade +1 at 16.0, edge +0.5000
shown 3 card(s): fair 17.0000, sd 0.0000
edge +2.9444 + inventory -1.9444 = P&L +1.0000
two-digit primes: 21 of them, sum 1043
```

The trades captured 2.94 of edge, but holding 2 short while an 8 appeared cost 3.89, partly won back (1.94) while short 1 as the 3 came. The final P&L of 1.0 is the same as the cash: sold 2 at 17.5, bought at 18.0 and 16.0.

#### An estimation market

**Interviewer:** "Make me a market on the sum of all two-digit primes."

**You:** "Near 50, about one number in $\ln 50 \approx 4$ is prime, so roughly 90/4, about 22 primes, averaging about 55: around 1,200. I could easily be 15% off. 1,050 at 1,350."

**Interviewer:** "I sell at 1,050."

**You:** "Then I move down: maybe 22 is too many, since primes thin out as numbers grow. 950 at 1,100, and I'm long one at 1,050."

The program above gives the answer: 21 primes summing to 1,043. The estimate was 15% high, and the interviewer's sale told you so.

#### Common mistakes

- **Losing track of the position.** Say it after each trade: "short 2 at 17.5".
- **Anchoring on the old fair value.** Recompute from scratch when a card is shown.
- **Explaining P&L by luck.** Split it into edge and inventory, as above.

Connects to: [making a market](#/concept/markets.making.making-a-market), [inventory and position risk](#/concept/markets.making.inventory-and-position-risk), [Fermi estimation](#/concept/math.mental.fermi-estimation), [conditional expectation](#/concept/prob.expected-value.conditional-expectation). Practice: [Market on three cards](#/problems/q-card-total-market).

### questions
Q: What should you say each round of a trading game?
A: Your fair value and how you got it, your market and why that width, and after trading your new position. Interviewers want to follow the reasoning, so say the numbers aloud.

Q: Your position lost money in a round even though every trade had positive edge. How do you explain it?
A: Split the P&L into edge captured at each trade and inventory P&L from the fair value moving while you held a position. Positive edge with a loss means the inventory moved against you, which is variance, not a mistake.

Q: How do you make a market on something you cannot compute, such as an estimate?
A: Build the estimate from parts you can reason about, judge how far off it could be, and quote around it with a width that covers that error. Then treat trades against you as information and move your quotes.

Q: Ten cards numbered 1 to 10; three are dealt and the first is an 8. What is the expected sum now?
A: The other two cards come from the nine remaining, which sum to 47 and average 47/9. The expected sum is 8 plus twice that, about 18.44.

Q: Why keep quoting a tight market after taking a loss?
A: A correct fair value does not change because you are behind, and a wide or lopsided market out of frustration gives away edge. Update on information, not on your P&L.
