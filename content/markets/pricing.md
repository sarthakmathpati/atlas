---
topic: markets.pricing
name: "Pricing and portfolios"
subject: markets
order: 5
prereqs: [markets.basics]
---

## markets.pricing.time-value-of-money
name: "Time value of money"
importance: must
scope: "discounting, present value, compounding"

### simple
Money today is worth more than the same money later, because today's money can earn interest in the meantime. Discounting turns a future amount into what it is worth now, and compounding does the reverse. It is like comparing prices in two currencies: you convert everything to the same date before you compare.

### interview
- **Future value**: $FV = PV(1 + r)^n$ with annual compounding; $m$ times a year, $PV(1 + r/m)^{mn}$; continuously, $PV e^{rn}$.
- **Present value**: $PV = \frac{CF}{(1 + r)^n}$. A stream of cash flows is worth the sum of their present values (NPV).
- **Annuity** of $C$ a year for $n$ years: $C \cdot \frac{1 - (1 + r)^{-n}}{r}$. **Perpetuity**: $C / r$.
- **IRR**: the rate that makes NPV zero. Rank projects by NPV at the right discount rate; IRR can mislead when cash flows change sign more than once.
- More frequent compounding at the same quoted rate earns more, with continuous compounding as the limit.
- Rule of 72: doubling time is about $72 / (\text{rate in percent})$ years.

### deep
#### Intuition

A present value answers "how much would I need to invest today, at this rate, to produce that cash later?" Every pricing problem in finance, from bonds to options, is a present value of uncertain cash flows, so it pays to be fluent with the certain case first.

#### Worked example

```cpp
double npv(double rate, const vector<double>& flows) {  // flows[t] arrives at the end of year t
    double v = 0;
    for (size_t t = 0; t < flows.size(); ++t) v += flows[t] / pow(1 + rate, t);
    return v;
}

int main() {
    // 1,000 at 6% a year for one year, compounded more and more often.
    for (int m : {1, 2, 12, 365})
        printf("compounded %3d times: %.4f\n", m, 1000 * pow(1 + 0.06 / m, m));
    printf("continuously:          %.4f\n", 1000 * exp(0.06));

    // 250 a year for 5 years at 7%: by summing, and by the annuity formula.
    double sum = 0;
    for (int t = 1; t <= 5; ++t) sum += 250 / pow(1.07, t);
    printf("annuity: sum %.4f, formula %.4f\n", sum, 250 * (1 - pow(1.07, -5)) / 0.07);
    printf("perpetuity of 250 at 7%%: %.4f\n", 250 / 0.07);

    // A made-up project: pay 1,000 now, receive 300, 400 and 500 over three years.
    vector<double> project = {-1000, 300, 400, 500};
    printf("NPV at 5%%: %.4f, at 10%%: %.4f\n", npv(0.05, project), npv(0.10, project));
    double lo = 0, hi = 1;  // IRR: the rate where NPV is zero (NPV falls as the rate rises)
    for (int i = 0; i < 100; ++i) (npv((lo + hi) / 2, project) > 0 ? lo : hi) = (lo + hi) / 2;
    printf("IRR %.4f%%\n", 100 * lo);

    printf("doubling time at 6%%: exact %.3f years, rule of 72 gives %.1f\n",
           log(2) / log(1.06), 72 / 6.0);
}
```

Output:

```text
compounded   1 times: 1060.0000
compounded   2 times: 1060.9000
compounded  12 times: 1061.6778
compounded 365 times: 1061.8313
continuously:          1061.8365
annuity: sum 1025.0494, formula 1025.0494
perpetuity of 250 at 7%: 3571.4286
NPV at 5%: 80.4449, at 10%: -21.0368
IRR 8.8963%
doubling time at 6%: exact 11.896 years, rule of 72 gives 12.0
```

#### Reading the results

- **Compounding**: 6% a year paid once gives 1,060; paid monthly $1000(1.005)^{12} = 1061.68$; continuously $1000e^{0.06} = 1061.84$. Daily compounding is within a cent of the limit.
- **Annuity**: 250 a year for 5 years at 7% is worth 1,025.05 today, by summing or by the formula. The perpetuity is worth $250 / 0.07 = 3571.43$: the payments after year 5 add most of the value, but each is discounted heavily.
- **NPV and IRR**: the project is worth $+80.44$ at a 5% cost of money and $-21.04$ at 10%, so the rate at which it breaks even, its IRR, is between them: 8.90%, found by bisection because NPV falls as the rate rises.
- **Rule of 72**: at 6% money doubles in $\ln 2 / \ln 1.06 = 11.90$ years; the rule says 12.

#### Common mistakes

- **Mixing rate and period**: a monthly cash flow needs a monthly rate, $(1.06)^{1/12} - 1$ for a 6% effective annual rate.
- **Off-by-one timing**: an annuity paid at the start of each year is worth $(1 + r)$ times the same annuity paid at the end.
- **Trusting IRR for odd cash flows**: with several sign changes NPV can cross zero more than once, so IRR is not unique.

Connects to: [series and sums](#/concept/math.number-theory.series-and-sums), [no-arbitrage pricing](#/concept/markets.pricing.no-arbitrage-pricing), [asset classes](#/concept/markets.basics.asset-classes), [binary search on real numbers](#/concept/dsa.binary-search.binary-search-on-real-numbers). Practice: [Three yearly payments](#/problems/q-three-payments).

### questions
Q: What is the present value of 1,000 received in 3 years at 5% a year, compounded annually?
A: 1,000 divided by 1.05 cubed, which is about 863.84. Discounting is compounding run backwards.

Q: Why does monthly compounding give more than annual compounding at the same quoted rate?
A: Interest is added earlier and then earns interest itself. 6% compounded monthly grows 1,000 to about 1,061.68 in a year, compared with 1,060 compounded annually; continuous compounding gives about 1,061.84.

Q: What is the value of a perpetuity paying C every year at rate r?
A: C divided by r, the sum of a geometric series of discounted payments. At 7%, 250 a year forever is worth about 3,571.

Q: What is the internal rate of return, and when is it misleading?
A: The discount rate at which a project's net present value is zero. With cash flows that change sign more than once there can be several such rates, and ranking projects by IRR can disagree with ranking them by NPV, which is the right measure.

Q: How long does money take to double at 6% a year?
A: The natural log of 2 divided by the natural log of 1.06, about 11.9 years. The rule of 72 gives 72 divided by 6, which is 12.

## markets.pricing.no-arbitrage-pricing
name: "No-arbitrage pricing"
importance: must
prereqs: [markets.pricing.time-value-of-money]
scope: "forwards and futures"

### simple
An arbitrage is a riskless profit with no money down, and in a working market such chances disappear almost as soon as they appear. So if two strategies always end with the same result, they must cost the same today. A forward price can be worked out this way: it must equal the cost of buying the asset now and holding it until delivery, like the price of delivery next week being today's price plus the cost of storing it.

### interview
- **Law of one price**: identical future cash flows must have identical prices today; otherwise buy the cheap one, sell the dear one.
- **Forward on a non-dividend asset**: $F = S e^{rT}$ (or $S(1 + r)^T$). With a dividend yield $q$: $F = S e^{(r - q)T}$; with known dividends: $F = (S - PV(D))e^{rT}$; with storage costs, add them.
- **Cash and carry**: if the forward is too high, borrow, buy the asset and sell the forward. If it is too low, do the reverse (short the asset, lend, buy the forward).
- The forward price is not a forecast of the future price; it is set by the cost of carrying the asset.
- **Futures** are exchange-traded forwards with daily settlement; with interest rates known in advance, their prices equal forward prices.
- Real limits: trading costs, borrowing and short-selling constraints and capital keep small deviations alive.

### deep
#### Intuition

Owning the asset at delivery can be done two ways: buy it now and hold it, or agree today to buy it later at $F$. The first costs $S$ now (financed at rate $r$) and earns any dividends; the second costs nothing now and $F$ later. Since both end with the asset, the costs must match: $F$ = financing cost of $S$ minus income from holding it.

#### Worked example

A made-up stock at 80 with a 2% dividend yield, a 5% rate, delivery in 9 months. The fair forward is $80 e^{0.03 \times 0.75} = 81.82$. Suppose someone quotes 83. Sell the forward, borrow to buy $e^{-qT}$ shares (the dividends, reinvested, grow them to exactly one share), and deliver.

```cpp
int main() {
    // A made-up stock at 80 with a 2% dividend yield; rate 5%; delivery in 9 months.
    double s = 80, r = 0.05, q = 0.02, t = 0.75, quoted = 83;
    double fair = s * exp((r - q) * t);
    printf("fair forward %.4f, quoted %.2f\n", fair, quoted);

    // Cash and carry: sell the forward at 83; buy e^(-qT) shares with borrowed money; reinvest the
    // dividends in more shares, so exactly one share is held at delivery.
    double shares = exp(-q * t), loan = s * shares;
    printf("buy %.6f shares for %.4f, all borrowed\n", shares, loan);
    double repay = loan * exp(r * t);
    printf("loan to repay at delivery: %.4f\n", repay);
    for (double st : {60.0, 80.0, 100.0})
        printf("stock at %3.0f: share alone %+8.4f, share delivered for 83 %+.4f\n", st,
               st - repay, quoted - repay);

    // A known dividend instead: 1.50 paid in 4 months. Forward = (S - PV(dividend)) e^(rT).
    double pvDiv = 1.50 * exp(-r * 4.0 / 12);
    printf("with a 1.50 dividend in 4 months: forward %.4f\n", (s - pvDiv) * exp(r * t));

}
```

Output:

```text
fair forward 81.8204, quoted 83.00
buy 0.985112 shares for 78.8090, all borrowed
loan to repay at delivery: 81.8204
stock at  60: share alone -21.8204, share delivered for 83 +1.1796
stock at  80: share alone  -1.8204, share delivered for 83 +1.1796
stock at 100: share alone +18.1796, share delivered for 83 +1.1796
with a 1.50 dividend in 4 months: forward 81.5254
```

The share on its own makes or loses money depending on the price; delivered against the forward it always makes 1.1796, which is $83 - 81.8204$ at delivery. That is the arbitrage, and it is why the quote can't stay at 83. With a known dividend of 1.50 in 4 months instead of a yield, subtract its present value from the spot: the forward drops to 81.53.

#### Futures

A future is a standardized forward traded on an exchange, with gains and losses settled every day as variation margin (see [asset classes](#/concept/markets.basics.asset-classes) for a daily settlement example). When interest rates are known in advance, futures and forward prices are equal. When rates move with the asset, daily settlement makes a difference, because gains are reinvested at rates correlated with the gains.

#### Common mistakes

- **Treating the forward as a forecast.** It follows from the spot and carry costs; expectations don't enter.
- **Forgetting income or costs of carry.** Dividends lower the forward; storage costs raise it.
- **Running only half the arbitrage.** Buying the cheap side without selling the expensive one is a bet, not an arbitrage.

Connects to: [time value of money](#/concept/markets.pricing.time-value-of-money), [put-call parity](#/concept/markets.options.put-call-parity), [asset classes](#/concept/markets.basics.asset-classes), [stock exchange matching engine](#/concept/sysd.classics.stock-exchange-matching-engine).

### questions
Q: What is the forward price of a stock that pays no dividends?
A: The spot price grown at the risk-free rate to delivery, S times e to the rT. Anything else allows an arbitrage between buying the stock with borrowed money and trading the forward.

Q: A forward is quoted above its fair value. How do you profit without risk?
A: Sell the forward, borrow money and buy the asset now, hold it until delivery, then deliver it at the forward price and repay the loan. The profit is the quote minus the fair forward price, fixed today.

Q: How do dividends change the forward price?
A: They reduce it, because the buyer of the forward doesn't receive dividends paid before delivery while the holder of the stock does. With a yield q the forward is S times e to the (r minus q)T; with known dividends, subtract their present value from the spot first.

Q: Is the forward price the market's forecast of the future spot price?
A: No. It is fixed by the spot price and the costs and income of carrying the asset. A forecast different from the forward is a view you could trade on, but it doesn't set the forward price.

Q: How do futures differ from forwards?
A: Futures are standardized and exchange-traded, with daily settlement of gains and losses through margin, which removes most counterparty risk. With known interest rates, their prices equal forward prices.

## markets.pricing.diversification-and-correlation
name: "Diversification and correlation"
importance: important
scope: "portfolio variance"

### simple
Spreading money across assets that don't move together makes a portfolio steadier than any one of them, because their ups and downs partly cancel. How much steadier depends on correlation, how much they tend to move together. It is like carrying both an umbrella and sunglasses: you are ready for more kinds of weather than with either one alone.

### interview
- Portfolio variance: $\sigma_p^2 = w^\top \Sigma w = \sum_i \sum_j w_i w_j \rho_{ij} \sigma_i \sigma_j$.
- Two assets: $\sigma_p^2 = w_1^2\sigma_1^2 + w_2^2\sigma_2^2 + 2w_1w_2\rho\sigma_1\sigma_2$. Unless $\rho = 1$, $\sigma_p$ is below the weighted average of the volatilities.
- $n$ equal-weight assets with volatility $\sigma$ and pairwise correlation $\rho$: $\sigma_p^2 = \sigma^2\left(\rho + \frac{1 - \rho}{n}\right)$. The $\rho\sigma^2$ part can't be diversified away (systematic risk).
- Two-asset minimum variance weight: $w_1 = \frac{\sigma_2^2 - \rho\sigma_1\sigma_2}{\sigma_1^2 + \sigma_2^2 - 2\rho\sigma_1\sigma_2}$.
- Correlations are unstable: they often rise in crises, just when diversification is needed.

### deep
#### Intuition

Variance adds the individual variances plus twice every covariance. With low correlation the cross terms are small, and as you add assets each one's own variance matters less and less. What is left is the part all assets share.

#### Worked example

Three made-up assets with volatilities 20%, 25% and 15% and correlations 0.6, 0.2 and 0.4. The program computes the equal-weight portfolio's volatility, checks it with 200,000 correlated draws built from a Cholesky factor, finds the minimum-variance mix of assets 1 and 3, and shows the limit for many assets.

```cpp
mt19937_64 rng(2026);
double normal() {  // Box-Muller
    double u1 = 1 - (rng() >> 11) * 0x1.0p-53;
    double u2 = (rng() >> 11) * 0x1.0p-53;
    return sqrt(-2 * log(u1)) * cos(2 * numbers::pi * u2);
}

int main() {
    // Three made-up assets: annual volatilities and correlations.
    double vol[3] = {0.20, 0.25, 0.15};
    double rho[3][3] = {{1, 0.6, 0.2}, {0.6, 1, 0.4}, {0.2, 0.4, 1}};
    double cov[3][3], w[3] = {1.0 / 3, 1.0 / 3, 1.0 / 3}, var = 0;
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j) cov[i][j] = rho[i][j] * vol[i] * vol[j];
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j) var += w[i] * w[j] * cov[i][j];
    printf("equal weights: volatility %.4f (average of the three: %.4f)\n", sqrt(var),
           (vol[0] + vol[1] + vol[2]) / 3);

    // Check by simulation: correlated normals from the Cholesky factor L, with L L^T = cov.
    double L[3][3] = {};
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j <= i; ++j) {
            double s = cov[i][j];
            for (int k = 0; k < j; ++k) s -= L[i][k] * L[j][k];
            L[i][j] = i == j ? sqrt(s) : s / L[j][j];
        }
    const int n = 200000;
    double sum = 0, sumSq = 0;
    for (int t = 0; t < n; ++t) {
        double z[3], port = 0;
        for (double& x : z) x = normal();
        for (int i = 0; i < 3; ++i) {
            double ret = 0;
            for (int k = 0; k <= i; ++k) ret += L[i][k] * z[k];
            port += w[i] * ret;
        }
        sum += port, sumSq += port * port;
    }
    double simVar = sumSq / n - (sum / n) * (sum / n), se = var * sqrt(2.0 / n);
    printf("simulated variance %.6f vs exact %.6f (%+.2f SE)\n", simVar, var, (simVar - var) / se);

    // Minimum-variance mix of assets 1 and 3.
    double a = cov[0][0], c = cov[2][2], b = cov[0][2], w1 = (c - b) / (a + c - 2 * b);
    printf("min-variance weight on asset 1: %.4f, volatility %.4f\n", w1,
           sqrt(w1 * w1 * a + (1 - w1) * (1 - w1) * c + 2 * w1 * (1 - w1) * b));

    // n equal-weight assets, each 30% volatility, every pair correlated 0.3.
    for (int k : {1, 2, 5, 10, 50, 1000})
        printf("%4d assets: volatility %.4f\n", k, 0.3 * sqrt(0.3 + 0.7 / k));
    printf("limit: %.4f\n", 0.3 * sqrt(0.3));
}
```

Output:

```text
equal weights: volatility 0.1588 (average of the three: 0.2000)
simulated variance 0.025121 vs exact 0.025222 (-1.27 SE)
min-variance weight on asset 1: 0.3267, volatility 0.1308
   1 assets: volatility 0.3000
   2 assets: volatility 0.2419
   5 assets: volatility 0.1990
  10 assets: volatility 0.1825
  50 assets: volatility 0.1681
1000 assets: volatility 0.1645
limit: 0.1643
```

#### Reading the results

- **Equal weights**: 15.9% volatility, well below the 20% average of the three volatilities. The simulated variance is 1.27 standard errors from the exact $w^\top\Sigma w = 0.025222$.
- **Two assets can beat the safer one**: 32.7% in asset 1 and 67.3% in asset 3 gives 13.1%, less than asset 3's 15% alone, because their correlation is only 0.2.
- **The limit**: with 30% volatility and correlation 0.3, going from 1 to 10 assets cuts volatility from 30% to 18.3%, but no number of assets gets below $0.3\sqrt{0.3} = 16.4\%$. The first few assets do most of the work.

#### Common mistakes

- **Averaging volatilities.** Variances and covariances add; volatilities don't.
- **Assuming correlations stay put.** In a sell-off many correlations jump toward 1.
- **Counting assets instead of independent risks.** Ten stocks in one industry are closer to one bet than ten.

Connects to: [covariance matrices](#/concept/math.linear-algebra.covariance-matrices), [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [Sharpe ratio](#/concept/markets.pricing.sharpe-ratio-and-risk-adjusted-returns), [inventory and position risk](#/concept/markets.making.inventory-and-position-risk). Practice: [Two assets, half each](#/problems/q-two-asset-volatility).

### questions
Q: How do you compute a portfolio's variance?
A: As w transposed times the covariance matrix times w: the sum over all pairs of weights times their covariance, including each asset with itself. For two assets that is each weight squared times its variance, plus twice the product of the weights and the covariance.

Q: Why is a portfolio's volatility usually below the average of its assets' volatilities?
A: Because assets that are not perfectly correlated partly offset each other. Only with correlation 1 does portfolio volatility equal the weighted average.

Q: What happens to the volatility of an equal-weight portfolio as you add many assets with the same pairwise correlation?
A: Its variance falls toward rho times sigma squared, the risk every asset shares. With 30% volatility and correlation 0.3, it never falls below about 16.4% however many assets you add.

Q: Can combining a risky asset with a less risky one give less risk than the safer one alone?
A: Yes, when their correlation is low enough. Two assets with volatilities 20% and 15% and correlation 0.2 combine to about 13.1% at the minimum-variance mix.

Q: Why is diversification less reliable than the formula suggests?
A: Correlations estimated in calm periods tend to rise in crises, so assets fall together just when protection is needed. Estimates of the covariance matrix are also noisy.

## markets.pricing.sharpe-ratio-and-risk-adjusted-returns
name: "Sharpe ratio and risk-adjusted returns"
importance: important
prereqs: [markets.pricing.diversification-and-correlation]
scope: "Sharpe ratio and risk-adjusted returns"

### simple
The Sharpe ratio measures how much extra return a strategy earns for each unit of risk it takes. You subtract what a risk-free investment would have earned, then divide by the volatility. It is like comparing cars by distance per liter of fuel rather than top speed: it tells you how efficiently the result was produced.

### interview
- $SR = \frac{E[R] - r_f}{\sigma}$, usually annualized: daily Sharpe times $\sqrt{252}$, which assumes returns are independent from day to day.
- **Leverage doesn't change it**: borrowing at $r_f$ to double the position doubles both excess return and volatility.
- Combining $k$ uncorrelated strategies with equal Sharpe ratios and equal risk gives $SR\sqrt{k}$.
- Estimation error is large: the standard error of an estimated Sharpe ratio is about $\sqrt{(1 + SR_d^2/2)/n} \cdot \sqrt{252}$ with $n$ daily returns, roughly $1/\sqrt{\text{years}}$.
- Variants: **Sortino** (only downside volatility), **information ratio** (excess over a benchmark divided by tracking error).
- It treats upside and downside alike and ignores fat tails, so a strategy that sells insurance can look great until it doesn't.

### deep
#### Intuition

Two strategies with 10% returns are not equally good if one swings 5% a year and the other 30%. The Sharpe ratio divides out the risk, so strategies can be compared and combined, and since leverage scales both numbers together, it measures the quality of the bet rather than its size.

#### Worked example

A made-up strategy returns 8% a year on average with 16% volatility; cash earns 2%. Its true Sharpe ratio is $0.06 / 0.16 = 0.375$. The program checks leverage and combination, then estimates the ratio from 5 years of simulated daily returns, 4,000 times, to see how noisy the estimate is.

```cpp
mt19937_64 rng(2026);
double normal() {  // Box-Muller
    double u1 = 1 - (rng() >> 11) * 0x1.0p-53;
    double u2 = (rng() >> 11) * 0x1.0p-53;
    return sqrt(-2 * log(u1)) * cos(2 * numbers::pi * u2);
}

int main() {
    // A made-up strategy: 8% a year on average, 16% volatility; the risk-free rate is 2%.
    const double mu = 0.08, vol = 0.16, rf = 0.02, days = 252;
    double sharpe = (mu - rf) / vol;
    printf("true Sharpe ratio %.4f\n", sharpe);
    printf("2x leverage: excess return %.2f, volatility %.2f, Sharpe %.4f\n", 2 * (mu - rf),
           2 * vol, 2 * (mu - rf) / (2 * vol));
    printf("two uncorrelated copies, equal risk: Sharpe %.4f\n", sharpe * sqrt(2.0));

    // Estimate it from 5 years of daily returns, 4,000 times.
    const int years = 5, samples = 4000, n = years * days;
    double sum = 0, sumSq = 0;
    int negative = 0;
    for (int s = 0; s < samples; ++s) {
        double a = 0, b = 0;
        for (int d = 0; d < n; ++d) {
            double excess = (mu - rf) / days + vol / sqrt(days) * normal();
            a += excess, b += excess * excess;
        }
        double mean = a / n, sd = sqrt(b / n - mean * mean), est = mean / sd * sqrt(days);
        sum += est, sumSq += est * est, negative += est < 0;
    }
    double m = sum / samples, spread = sqrt(sumSq / samples - m * m);
    double daily = sharpe / sqrt(days), formula = sqrt((1 + daily * daily / 2) / n) * sqrt(days);
    printf("estimates: mean %.4f (%+.2f SE from the truth)\n", m,
           (m - sharpe) / (spread / sqrt(samples)));
    printf("estimates: standard deviation %.4f (formula %.4f)\n", spread, formula);
    printf("share of 5-year samples with a negative Sharpe ratio: %.3f\n",
           double(negative) / samples);
    printf("years of data for the estimate to be 2 standard errors from zero: %.1f\n",
           pow(2 / sharpe, 2));
}
```

Output:

```text
true Sharpe ratio 0.3750
2x leverage: excess return 0.12, volatility 0.32, Sharpe 0.3750
two uncorrelated copies, equal risk: Sharpe 0.5303
estimates: mean 0.3684 (-0.94 SE from the truth)
estimates: standard deviation 0.4448 (formula 0.4473)
share of 5-year samples with a negative Sharpe ratio: 0.204
years of data for the estimate to be 2 standard errors from zero: 28.4
```

#### Reading the results

- **Leverage**: twice the position gives 12% excess return and 32% volatility, still 0.375.
- **Combination**: two uncorrelated copies at equal risk give $0.375\sqrt{2} = 0.53$. Independent sources of return are worth more than a bigger version of one.
- **Estimation noise**: five years of daily data give estimates centered on the truth (0.94 standard errors from it) but spread by 0.445, more than the Sharpe ratio itself, and the formula predicts 0.447. One sample in five shows a negative ratio for a strategy that truly makes money.
- **Proof needs time**: to put a 0.375 Sharpe ratio two standard errors above zero takes about $(2 / 0.375)^2 = 28$ years of data.

#### Common mistakes

- **Annualizing with $\sqrt{252}$ when returns are autocorrelated.** Smoothed or illiquid returns overstate the ratio.
- **Comparing Sharpe ratios from short backtests.** Differences of 0.5 are within noise over a few years; many tried strategies make the best one look better still.
- **Ignoring tails.** Selling out-of-the-money options earns steady small gains, a high Sharpe ratio, and rare large losses.

Connects to: [diversification and correlation](#/concept/markets.pricing.diversification-and-correlation), [confidence intervals](#/concept/prob.statistics.confidence-intervals), [backtesting pitfalls](#/concept/prob.learning.cross-validation-and-backtesting-pitfalls), [Kelly criterion](#/concept/markets.betting.kelly-criterion). Practice: [A fund's Sharpe ratio](#/problems/q-sharpe).

### questions
Q: How is the Sharpe ratio defined?
A: The expected return in excess of the risk-free rate divided by the volatility of returns. It measures excess return per unit of risk and is usually quoted annualized.

Q: Why doesn't leverage change the Sharpe ratio?
A: Borrowing at the risk-free rate to scale a position by k multiplies both the excess return and the volatility by k, so their ratio stays the same.

Q: How do you annualize a Sharpe ratio computed from daily returns, and what does that assume?
A: Multiply by the square root of the number of trading days, about 252. That assumes daily returns are independent and identically distributed; autocorrelation makes the result misleading.

Q: How long a track record do you need to trust a Sharpe ratio of 0.4?
A: Its standard error is roughly one over the square root of the number of years, so being two standard errors above zero needs about (2 divided by 0.4) squared, 25 years. Short records are dominated by noise.

Q: What does combining uncorrelated strategies do to the Sharpe ratio?
A: With k uncorrelated strategies of equal Sharpe ratio, weighted to equal risk, the combined ratio is the individual one times the square root of k. The excess returns add while the volatilities add only in quadrature.

## markets.pricing.value-at-risk
name: "Value at risk"
importance: advanced
scope: "Value at risk"

### simple
Value at risk answers one question: how much could we lose on a bad day that is not a disaster? A one-day 99% VaR of 30,000 means that on 99 days out of 100 the loss should be smaller than that. It is like a flood line on a riverbank: it tells you how high the water usually gets, but not how bad the rare big flood will be.

### interview
- **VaR** at level $\alpha$ over a horizon: the loss exceeded with probability $1 - \alpha$, a quantile of the loss distribution.
- **Parametric** (normal): $\text{VaR} = z_\alpha \sigma V$ ($z_{0.99} = 2.326$). **Historical**: the quantile of past or simulated P&L. **Monte Carlo**: the quantile of simulated P&L under a model.
- Scaling to $h$ days by $\sqrt{h}$ assumes independent, identically distributed returns.
- VaR says nothing about losses beyond it. **Expected shortfall** (the average loss beyond VaR) does, and is used alongside or instead of VaR.
- VaR is not **subadditive**: a portfolio's VaR can exceed the sum of its parts' VaR, which punishes diversification. Expected shortfall is subadditive.
- Normal assumptions understate the far tail when returns have fat tails.

### deep
#### Worked example

A made-up portfolio worth 1,000,000 with 1.2% daily volatility. The program compares normal VaR with a fat-tailed model (a Student $t$ with 4 degrees of freedom, scaled to the same volatility), checks the fat-tailed numbers with a million simulated days, and shows VaR failing subadditivity for two bonds.

```cpp
mt19937_64 rng(2026);
double normal() {  // Box-Muller
    double u1 = 1 - (rng() >> 11) * 0x1.0p-53;
    double u2 = (rng() >> 11) * 0x1.0p-53;
    return sqrt(-2 * log(u1)) * cos(2 * numbers::pi * u2);
}
double tCdf4(double x) {  // Student t with 4 degrees of freedom, in closed form
    double s = x / sqrt(x * x + 4);
    return 0.5 + 0.75 * (s - s * s * s / 3);
}
double quantile(function<double(double)> cdf, double p) {
    double lo = -50, hi = 50;
    for (int i = 0; i < 200; ++i) (cdf((lo + hi) / 2) < p ? lo : hi) = (lo + hi) / 2;
    return lo;
}

int main() {
    const double value = 1'000'000, vol = 0.012;  // a made-up portfolio, 1.2% daily volatility
    auto normalCdf = [](double x) { return 0.5 * erfc(-x / sqrt(2.0)); };
    // Fat tails: t with 4 degrees of freedom has variance 2, so divide by sqrt(2).
    for (double level : {0.95, 0.99}) {
        double zN = -quantile(normalCdf, 1 - level), zT = -quantile(tCdf4, 1 - level) / sqrt(2.0);
        printf("%.0f%% one-day VaR: normal %.0f, fat-tailed %.0f\n", 100 * level,
               zN * vol * value, zT * vol * value);
    }
    printf("10-day 99%% VaR by the square-root rule: %.0f\n",
           -quantile(normalCdf, 0.01) * vol * value * sqrt(10.0));

    // Historical simulation: a million fat-tailed days; VaR and expected shortfall at 99%.
    vector<double> loss;
    for (int d = 0; d < 1'000'000; ++d) {
        double z = normal(), chi = 0;
        for (int k = 0; k < 4; ++k) {
            double g = normal();
            chi += g * g;
        }
        loss.push_back(-z / sqrt(chi / 4) / sqrt(2.0) * vol * value);
    }
    sort(loss.begin(), loss.end());
    size_t n = loss.size(), cut = n * 99 / 100;
    double tail = 0, tailSq = 0;
    for (size_t i = cut; i < n; ++i) tail += loss[i], tailSq += loss[i] * loss[i];
    tail /= n - cut;
    double scale = vol * value / sqrt(2.0), x = -quantile(tCdf4, 0.01);  // raw t quantile
    double exactVar = x * scale, exactEs = 0.5 * pow(1 + x * x / 4, -1.5) / 0.01 * scale;
    double density = 0.375 * pow(1 + x * x / 4, -2.5) / scale;  // of the loss at the VaR
    double seVar = sqrt(0.01 * 0.99 / n) / density;
    double seEs = sqrt((tailSq / (n - cut) - tail * tail) / (n - cut));
    printf("simulated fat-tailed 99%% VaR %.0f (exact %.0f, %+.2f SE)\n", loss[cut], exactVar,
           (loss[cut] - exactVar) / seVar);
    printf("simulated fat-tailed 99%% expected shortfall %.0f (exact %.0f, %+.2f SE)\n", tail,
           exactEs, (tail - exactEs) / seEs);
    double zN = -quantile(normalCdf, 0.01);
    printf("normal 99%% expected shortfall: %.0f\n",
           exp(-zN * zN / 2) / sqrt(2 * numbers::pi) / 0.01 * vol * value);

    // VaR is not subadditive: two independent bonds, each losing 100 with probability 4%.
    double p0 = 0.96 * 0.96, p1 = 2 * 0.04 * 0.96, p2 = 0.04 * 0.04;
    printf("one bond: P(loss) = 4%% < 5%%, so 95%% VaR = 0; both: P(any loss) = %.2f%%\n",
           100 * (p1 + p2));
    printf("both bonds: 95%% VaR = 100, expected shortfall %.1f (one bond alone: %.1f)\n",
           (p2 * 200 + (0.05 - p2) * 100) / 0.05, 0.04 * 100 / 0.05);
    printf("check: probabilities add to %.4f\n", p0 + p1 + p2);
}
```

Output:

```text
95% one-day VaR: normal 19738, fat-tailed 18089
99% one-day VaR: normal 27916, fat-tailed 31794
10-day 99% VaR by the square-root rule: 88279
simulated fat-tailed 99% VaR 31702 (exact 31794, -0.95 SE)
simulated fat-tailed 99% expected shortfall 44077 (exact 44298, -1.30 SE)
normal 99% expected shortfall: 31983
one bond: P(loss) = 4% < 5%, so 95% VaR = 0; both: P(any loss) = 7.84%
both bonds: 95% VaR = 100, expected shortfall 103.2 (one bond alone: 80.0)
check: probabilities add to 1.0000
```

#### Reading the results

- **Same volatility, different tails.** At 95% the fat-tailed model's VaR is lower than the normal one (18,089 against 19,738); at 99% it is higher (31,794 against 27,916). Fat tails concentrate more of the probability near the center and in the far tails; which VaR is bigger depends on the level you look at.
- **Expected shortfall shows the tail.** Beyond the 99% VaR, the fat-tailed model's average loss is 44,298, against 31,983 for the normal: 39% more. The simulation lands within 1.3 standard errors of both exact values.
- **Square-root scaling**: $27{,}916 \times \sqrt{10} = 88{,}279$ for 10 days, only if days are independent and normal.
- **Not subadditive**: each bond alone loses with probability 4%, under 5%, so its 95% VaR is 0. Together, $1 - 0.96^2 = 7.84\%$ exceeds 5%, so the pair's 95% VaR is 100, more than $0 + 0$. Expected shortfall behaves: 103.2 for the pair, below $80 + 80$.

#### Common mistakes

- **Reading VaR as the worst case.** It is the loss exceeded 1% of the time; the losses in that 1% can be far larger.
- **Assuming normal returns** for positions with options or credit risk, whose losses are lopsided.
- **Trusting a historical window** that contains no crisis.

Connects to: [normal distribution](#/concept/prob.distributions.normal-distribution), [order statistics](#/concept/prob.distributions.order-statistics), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation), [diversification and correlation](#/concept/markets.pricing.diversification-and-correlation).

### questions
Q: What does a one-day 99% value at risk of 1 million mean?
A: That the loss over one day is expected to exceed 1 million on only 1% of days. It says nothing about how large the loss is on those days.

Q: How do you compute VaR assuming normal returns?
A: Multiply the portfolio value by the daily volatility and by the normal quantile for the confidence level, 1.645 at 95% or 2.326 at 99%. For h days, multiply by the square root of h if days are independent.

Q: What is expected shortfall and why is it preferred to VaR?
A: The average loss on the days that exceed VaR. It measures how bad the tail is, not just where it starts, and unlike VaR it is subadditive, so it never penalizes diversification.

Q: Give an example where VaR is not subadditive.
A: Two independent bonds each lose 100 with probability 4%. Each has a 95% VaR of zero, but the chance that at least one loses is 7.84%, so the pair's 95% VaR is 100.

Q: How do fat tails affect a normal VaR estimate?
A: At high confidence levels, such as 99% and beyond, a normal model with the right volatility understates the loss, because extreme days are more common than the normal allows. At moderate levels it can even overstate it.
