---
topic: markets.options
name: "Options"
subject: markets
order: 4
prereqs: [markets.basics, prob.distributions]
---

## markets.options.calls-and-puts
name: "Calls and puts"
importance: important
scope: "payoff diagrams"

### simple
A call option is the right to buy something at a fixed price (the strike) before or on a set date; a put is the right to sell at the strike. You pay a premium for that right, and you use it only if it helps you. It is like paying a small deposit to hold a flat at today's price: if prices rise you buy at the old price, and if they fall you walk away and lose only the deposit.

### interview
- **Call** payoff at expiry: $\max(S_T - K, 0)$. **Put**: $\max(K - S_T, 0)$. Profit subtracts the premium paid.
- The buyer's loss is capped at the premium; the call seller's loss is unlimited, the put seller's is at most $K$ minus the premium.
- Break-even at expiry: call $K + \text{premium}$, put $K - \text{premium}$.
- Combinations build other shapes: a **straddle** (call + put, same strike) bets on a big move either way; a **call spread** (buy one strike, sell a higher one) caps both cost and gain.
- **European** options exercise only at expiry, **American** ones any time before; the payoff diagram is the value at expiry.
- Moneyness: in the money (exercise would pay), at the money ($S \approx K$), out of the money.

### deep
#### Intuition

An option cuts off one side of a price move. A call keeps the upside above the strike and throws away the downside; a put keeps the downside below the strike. The premium is what you pay for throwing away the bad side, and a payoff diagram shows profit at expiry against the final price.

#### Worked example

One stock with made-up premiums: a 100-strike call costs 6, a 100-strike put costs 5, a 95-strike call costs 8.50 and a 105-strike call costs 3.50, so the 95/105 call spread costs 5. The program tabulates profit at expiry, finds the break-evens and draws the long call.

```cpp
// Profit at expiry of option positions on one stock (made-up premiums).
double call(double s, double k) { return max(s - k, 0.0); }
double put(double s, double k) { return max(k - s, 0.0); }

struct Position { const char* name; function<double(double)> profit; };

int main() {
    vector<Position> book = {
        {"long call 100", [](double s) { return call(s, 100) - 6; }},
        {"long put 100", [](double s) { return put(s, 100) - 5; }},
        {"short call 100", [](double s) { return 6 - call(s, 100); }},
        {"straddle 100", [](double s) { return call(s, 100) + put(s, 100) - 11; }},
        {"call spread 95/105", [](double s) { return call(s, 95) - call(s, 105) - 5; }},
    };
    printf("%-19s", "price at expiry");
    for (int s = 80; s <= 120; s += 5) printf("%6d", s);
    printf("\n");
    for (auto& [name, profit] : book) {
        printf("%-19s", name);
        for (int s = 80; s <= 120; s += 5) printf("%6.1f", profit(s));
        printf("\n");
    }
    // Break-even prices: where the profit is zero, on a grid of cents.
    for (auto& [name, profit] : book) {
        printf("%s breaks even at", name);
        for (int cents = 5000; cents <= 15000; ++cents)
            if (fabs(profit(cents / 100.0)) < 0.005) printf(" %.2f", cents / 100.0);
        printf("\n");
    }
    // A picture of the long call: profit from -6 upward, one row per 3 of profit.
    for (int row = 18; row >= -6; row -= 3) {
        printf("%4d |", row);
        for (int s = 80; s <= 124; s += 2) {
            double p = call(s, 100) - 6;
            printf("%c", fabs(p - row) < 1.5 ? '*' : row == 0 ? '-' : ' ');
        }
        printf("\n");
    }
    printf("      80   90   100  110  120\n");
}
```

Output:

```text
price at expiry        80    85    90    95   100   105   110   115   120
long call 100        -6.0  -6.0  -6.0  -6.0  -6.0  -1.0   4.0   9.0  14.0
long put 100         15.0  10.0   5.0   0.0  -5.0  -5.0  -5.0  -5.0  -5.0
short call 100        6.0   6.0   6.0   6.0   6.0   1.0  -4.0  -9.0 -14.0
straddle 100          9.0   4.0  -1.0  -6.0 -11.0  -6.0  -1.0   4.0   9.0
call spread 95/105   -5.0  -5.0  -5.0  -5.0   0.0   5.0   5.0   5.0   5.0
long call 100 breaks even at 106.00
long put 100 breaks even at 95.00
short call 100 breaks even at 106.00
straddle 100 breaks even at 89.00 111.00
call spread 95/105 breaks even at 100.00
  18 |                      *
  15 |                    ** 
  12 |                   *   
   9 |                 **    
   6 |                *      
   3 |              **       
   0 |-------------*---------
  -3 |           **          
  -6 |***********            
      80   90   100  110  120
```

#### Reading the table

- **Long call**: flat at $-6$ below 100, then rising one for one; break-even $100 + 6 = 106$. The chart shows the hockey stick.
- **Long put**: the mirror image, break-even $100 - 5 = 95$.
- **Short call**: exactly the negative of the long call: the seller keeps 6 at best and loses without limit above 106.
- **Straddle**: costs 11 and pays off only if the stock ends below 89 or above 111, a bet on movement, not direction.
- **Call spread**: costs 5, and its profit is capped at $10 - 5 = 5$ above 105; the sold call pays for part of the bought one.

#### Common mistakes

- **Forgetting the premium.** A call finishing in the money can still lose money: at 105 the long call above loses 1.
- **Mixing payoff and profit.** The payoff ignores what you paid; profit subtracts it.
- **Treating short options like long ones.** Selling an option collects a small premium in exchange for a large or unlimited risk.

Connects to: [asset classes](#/concept/markets.basics.asset-classes), [put-call parity](#/concept/markets.options.put-call-parity), [intrinsic and time value](#/concept/markets.options.intrinsic-and-time-value).

### questions
Q: What are the payoffs at expiry of a call and a put?
A: A call pays the stock price minus the strike when that is positive and nothing otherwise. A put pays the strike minus the stock price when that is positive and nothing otherwise.

Q: What is the break-even of a call bought for 6 with strike 100?
A: 106 at expiry: the stock must rise far enough above the strike to repay the premium. Between 100 and 106 the call is exercised but still loses money overall.

Q: Who can lose more, a call buyer or a call seller?
A: The seller. The buyer's loss is capped at the premium, while the seller must deliver the stock at the strike however high it goes, so the loss is unlimited.

Q: When would you buy a straddle?
A: When you expect a large move but don't know its direction, such as before an announcement. It profits if the stock moves beyond the strike by more than the combined premium in either direction.

Q: Why would you buy a call spread instead of a call?
A: Selling the higher-strike call lowers the cost. In exchange the gain is capped at the difference between the strikes, which suits a view that the stock will rise moderately.

## markets.options.put-call-parity
name: "Put-call parity"
importance: important
prereqs: [markets.options.calls-and-puts, markets.pricing.no-arbitrage-pricing]
scope: "the no-arbitrage relationship"

### simple
A call and a put with the same strike and expiry are tied together: owning the call and selling the put gives exactly the same result as owning the stock and owing the strike price. Because the two combinations always end up equal, their prices today must be equal too. It is like two roads that always arrive at the same place at the same time: they must cost the same toll, or everyone takes the cheaper one.

### interview
- For European options on a stock without dividends: $C - P = S - K e^{-rT}$.
- Proof by payoffs: call + bond paying $K$ pays $\max(S_T, K)$; put + stock also pays $\max(S_T, K)$. Equal payoffs, so equal prices today.
- It holds regardless of any model or volatility, which makes it a check on quotes and on pricing code.
- With dividends, subtract their present value from $S$; with a dividend yield $q$, use $S e^{-qT}$.
- A violation is an arbitrage: buy the cheap side, sell the expensive side, and lock in the difference.
- It does not hold exactly for American options, where early exercise matters; there it becomes a pair of inequalities.

### deep
#### Intuition

Long a call and short a put (same strike, same expiry) means you will buy the stock at $K$ no matter what: if it ends above $K$ you exercise the call, if below, the put is exercised against you. That is a forward purchase at $K$, worth $S - K e^{-rT}$ today. So $C - P$ has to equal that.

#### Worked example: a mispriced put

Made-up quotes: stock 50, strike 55, half a year, rate 4% continuously compounded, call 3.20, put 6.00. Parity says the put should be $3.20 - 50 + 55 e^{-0.02} = 7.11$, so the put is cheap. Buy it, and sell a synthetic put: sell the call, buy the stock, borrow $K e^{-rT}$.

```cpp
double N(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }
// Black-Scholes call and put, each from its own formula (no dividends).
pair<double, double> bs(double s, double k, double t, double r, double vol) {
    double d1 = (log(s / k) + (r + vol * vol / 2) * t) / (vol * sqrt(t)), d2 = d1 - vol * sqrt(t);
    return {s * N(d1) - k * exp(-r * t) * N(d2), k * exp(-r * t) * N(-d2) - s * N(-d1)};
}

int main() {
    // Made-up quotes: stock 50, strike 55, half a year, 4% continuously compounded.
    double s = 50, k = 55, t = 0.5, r = 0.04, call = 3.20, marketPut = 6.00;
    double bond = k * exp(-r * t);  // today's price of receiving K at expiry
    double fairPut = call - s + bond;
    printf("K e^(-rT) = %.4f, parity put = %.4f, market put = %.2f\n", bond, fairPut, marketPut);

    // The put is cheap: buy it, and sell the synthetic put (sell call, buy stock, borrow).
    double cashToday = -marketPut + call - s + bond;
    printf("cash received today: %+.4f\n", cashToday);
    for (double st : {30.0, 50.0, 55.0, 70.0, 90.0}) {
        double atExpiry = max(k - st, 0.0) - max(st - k, 0.0) + st - k;  // put, -call, stock, -loan
        printf("stock at %4.0f: positions pay %+.4f at expiry\n", st, atExpiry);
    }

    double worst = 0;  // a model's prices must satisfy parity too
    for (double strike = 30; strike <= 80; strike += 5)
        for (double vol : {0.1, 0.3, 0.6}) {
            auto [c, p] = bs(s, strike, t, r, vol);
            worst = max(worst, fabs(c - p - (s - strike * exp(-r * t))));
        }
    printf("Black-Scholes prices break parity by at most %.1e\n", worst);
}
```

Output:

```text
K e^(-rT) = 53.9109, parity put = 7.1109, market put = 6.00
cash received today: +1.1109
stock at   30: positions pay +0.0000 at expiry
stock at   50: positions pay +0.0000 at expiry
stock at   55: positions pay +0.0000 at expiry
stock at   70: positions pay +0.0000 at expiry
stock at   90: positions pay +0.0000 at expiry
Black-Scholes prices break parity by at most 1.1e-14
```

You receive 1.1109 today, and at expiry the four positions cancel exactly whatever the stock does: the put and the short call together pay $K - S_T$, the stock is worth $S_T$, and the loan costs $K$. If the put were too expensive instead, you would do the opposite: sell the put, buy the call, short the stock and lend. The last line checks that model prices obey parity for any strike and volatility, to rounding error.

#### Uses

- **Checking quotes**: a violation larger than trading costs is either an error or an arbitrage.
- **Synthetic positions**: long call + short put = a forward; long put + long stock behaves like a long call plus a bond.
- **Testing code**: a pricing library whose calls and puts break parity has a bug.

#### Common mistakes

- **Using $K$ instead of $K e^{-rT}$**: the strike is paid at expiry, so it is discounted.
- **Ignoring dividends**: they lower the forward and therefore the call relative to the put.
- **Applying it to American options as an equality**: early exercise breaks it.

Connects to: [no-arbitrage pricing](#/concept/markets.pricing.no-arbitrage-pricing), [calls and puts](#/concept/markets.options.calls-and-puts), [time value of money](#/concept/markets.pricing.time-value-of-money). Practice: [Put from a call](#/problems/q-put-from-call).

### questions
Q: State put-call parity for European options on a stock without dividends.
A: The call price minus the put price equals the stock price minus the present value of the strike, K times e to the minus rT. It follows because both sides give the same payoff at expiry.

Q: How do you prove put-call parity?
A: Compare two portfolios: a call plus a bond that pays K at expiry, and a put plus one share. Both pay the larger of the stock price and K at expiry, so without arbitrage they must cost the same today.

Q: The put trades below its parity value. How do you make a riskless profit?
A: Buy the put and sell the synthetic put: sell the call, buy the stock and borrow the present value of the strike. You receive the difference today, and all positions cancel at expiry.

Q: Does put-call parity depend on volatility or on a pricing model?
A: No. It uses only the payoffs and the ability to trade the stock and borrow or lend, so it holds whatever the model, which makes it a useful check on quotes and code.

Q: How do dividends change put-call parity?
A: The stock price is replaced by the stock minus the present value of dividends paid before expiry, because the option holder doesn't receive them. Higher dividends make calls cheaper relative to puts.

## markets.options.intrinsic-and-time-value
name: "Intrinsic and time value"
importance: important
prereqs: [markets.options.calls-and-puts]
scope: "Intrinsic and time value"

### simple
An option's price has two parts. Intrinsic value is what you would get by exercising right now, and time value is the extra you pay for the chance that things get better before expiry. It is like the price of a concert ticket before the show: part is the seat itself, and part is the chance the tickets become more sought after before the date.

### interview
- **Intrinsic value**: $\max(S - K, 0)$ for a call, $\max(K - S, 0)$ for a put. **Time value** = price − intrinsic.
- Time value is largest **at the money**, where the outcome is most uncertain, and small deep in or out of the money.
- It shrinks toward zero at expiry, roughly with $\sqrt{T}$: an at-the-money option is worth about $0.4\,\sigma S \sqrt{T}$ when rates are near zero.
- A European call on a stock without dividends is worth at least $S - K e^{-rT}$, more than intrinsic when $r > 0$, so an American call on such a stock is never exercised early.
- A deep in-the-money European put can have **negative** time value: its holder would rather have $K$ now than at expiry.

### deep
#### Intuition

Time value pays for optionality: the chance to benefit from a move without suffering from the opposite move. That chance is worth most when the stock sits at the strike and a move either way changes the outcome. Deep in the money the option behaves like the stock itself; far out of the money it is unlikely ever to pay.

#### Worked example

Black-Scholes prices with the stock at 100, half a year to expiry, a 5% rate and 25% volatility, for strikes 70 to 130. Then at-the-money prices as expiry approaches, with the rate set to 0.

```cpp
double N(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }
pair<double, double> bs(double s, double k, double t, double r, double vol) {
    double d1 = (log(s / k) + (r + vol * vol / 2) * t) / (vol * sqrt(t)), d2 = d1 - vol * sqrt(t);
    return {s * N(d1) - k * exp(-r * t) * N(d2), k * exp(-r * t) * N(-d2) - s * N(-d1)};
}

int main() {
    const double s = 100, t = 0.5, r = 0.05, vol = 0.25;
    puts("strike   call  intrinsic   time |   put  intrinsic   time");
    for (double k = 70; k <= 130; k += 10) {
        auto [c, p] = bs(s, k, t, r, vol);
        double ci = max(s - k, 0.0), pi = max(k - s, 0.0);
        printf("%6.0f %6.2f %10.2f %6.2f | %5.2f %10.2f %6.2f\n", k, c, ci, c - ci, p, pi, p - pi);
    }
    puts("at the money, r = 0: time value as expiry approaches");
    for (double days : {365.0, 182.0, 91.0, 30.0, 7.0, 1.0}) {
        double tt = days / 365, c = bs(s, s, tt, 0, vol).first;
        printf("%3.0f-day option: %5.2f, divided by vol * S * sqrt(T) = %.4f\n", days, c,
               c / (vol * s * sqrt(tt)));
    }
    printf("1 / sqrt(2 pi) = %.4f\n", 1 / sqrt(2 * numbers::pi));
}
```

Output:

```text
strike   call  intrinsic   time |   put  intrinsic   time
    70  31.81      30.00   1.81 |  0.08       0.00   0.08
    80  22.54      20.00   2.54 |  0.57       0.00   0.57
    90  14.44      10.00   4.44 |  2.22       0.00   2.22
   100   8.26       0.00   8.26 |  5.79       0.00   5.79
   110   4.23       0.00   4.23 | 11.51      10.00   1.51
   120   1.95       0.00   1.95 | 18.99      20.00  -1.01
   130   0.82       0.00   0.82 | 27.61      30.00  -2.39
at the money, r = 0: time value as expiry approaches
365-day option:  9.95, divided by vol * S * sqrt(T) = 0.3979
182-day option:  7.03, divided by vol * S * sqrt(T) = 0.3984
 91-day option:  4.98, divided by vol * S * sqrt(T) = 0.3987
 30-day option:  2.86, divided by vol * S * sqrt(T) = 0.3989
  7-day option:  1.38, divided by vol * S * sqrt(T) = 0.3989
  1-day option:  0.52, divided by vol * S * sqrt(T) = 0.3989
1 / sqrt(2 pi) = 0.3989
```

#### Reading the results

- **Time value peaks at the money**: 8.26 for the call and 5.79 for the put at 100, falling to 0.82 and 0.08 far out of the money.
- **Deep in-the-money calls still have time value** (1.81 at 70), mostly interest: paying 70 in half a year rather than now is worth $70(1 - e^{-0.025}) = 1.73$.
- **Deep in-the-money puts have negative time value** ($-1.01$ at 120, $-2.39$ at 130). A European put can't be exercised early, and receiving $K$ later is worth less than receiving it now. An American put would be exercised early here.
- **The square-root rule**: dividing the at-the-money price by $\sigma S \sqrt{T}$ gives values approaching $1/\sqrt{2\pi} = 0.3989$ as expiry nears. One year is worth 9.95, one month 2.86, one day 0.52. A quarter of the time left leaves half the time value, so the decay speeds up near expiry.

#### Common mistakes

- **Expecting linear decay.** At-the-money time value falls like $\sqrt{T}$, fastest in the last weeks.
- **Assuming time value is never negative.** It can be for European puts (and for calls on stocks paying large dividends).
- **Exercising an American call early on a stock without dividends.** Selling it is always worth more than exercising it.

Connects to: [calls and puts](#/concept/markets.options.calls-and-puts), [Greeks intuition](#/concept/markets.options.greeks-intuition), [time value of money](#/concept/markets.pricing.time-value-of-money), [normal distribution](#/concept/prob.distributions.normal-distribution).

### questions
Q: What are intrinsic value and time value?
A: Intrinsic value is what exercising now would pay: the stock minus the strike for a call, the strike minus the stock for a put, or zero. Time value is the rest of the option's price, the value of the chance of a better outcome before expiry.

Q: Where is time value largest, and why?
A: At the money, because that is where the final outcome is most uncertain and a move in either direction matters most. Deep in the money the option behaves like the stock; far out of the money it rarely pays.

Q: How does an at-the-money option's value change as expiry approaches?
A: It shrinks roughly in proportion to the square root of the time left, about 0.4 times volatility times the stock price times the square root of the time in years. So a quarter of the time left means half the value, and the decay is fastest near expiry.

Q: Can time value be negative?
A: Yes, for a deep in-the-money European put when interest rates are positive. The holder would prefer to receive the strike now, but must wait until expiry, so the option is worth less than its intrinsic value.

Q: Why is an American call on a stock without dividends never exercised early?
A: Its European version is already worth at least the stock price minus the present value of the strike, which is more than the intrinsic value when rates are positive. Selling the call therefore always beats exercising it.

## markets.options.greeks-intuition
name: "Greeks intuition"
importance: important
prereqs: [markets.options.intrinsic-and-time-value]
scope: "delta, gamma, vega, theta"

### simple
The Greeks measure how an option's price reacts when something changes. Delta is the change for a small move in the stock, gamma is how fast delta itself changes, vega is the change when volatility changes, and theta is how much value leaks away each day. They are like the gauges on a car's dashboard: each one tells you how sensitive your position is to one kind of bump.

### interview
- **Delta** $\Delta = \partial V / \partial S$: a call's delta is between 0 and 1 ($N(d_1)$ in Black-Scholes), a put's between $-1$ and 0. It is also the hedge ratio: the shares that offset small moves.
- **Gamma** $\Gamma = \partial^2 V / \partial S^2$: largest at the money near expiry. Long options have positive gamma: they gain from big moves either way.
- **Vega** $\partial V / \partial \sigma$: largest at the money for long-dated options; long options gain when volatility rises.
- **Theta** $\partial V / \partial t$: usually negative for long options, the cost of carrying gamma.
- The Black-Scholes equation ties them: $\Theta + \frac{1}{2}\sigma^2 S^2 \Gamma + rS\Delta - rV = 0$. A delta-hedged long option earns from gamma and pays theta.
- Delta hedging in discrete steps leaves an error that shrinks like $1/\sqrt{\text{number of rebalances}}$.

### deep
#### Intuition

A delta-hedged long option gains from moves of either sign (gamma) and pays for that every day (theta). It wins if the stock moves more than the price assumed.

#### Worked example

A call with stock and strike 100, half a year, rate 5% and volatility 20%. The program computes each Greek by formula and by finite differences (bump one input, reprice), checks the Black-Scholes equation, then sells the call and delta-hedges it 5 to 320 times, 20,000 paths each, with the stock drifting at 10% a year.

```cpp
double N(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }
double phi(double x) { return exp(-x * x / 2) / sqrt(2 * numbers::pi); }
double call(double s, double k, double t, double r, double v) {
    double d1 = (log(s / k) + (r + v * v / 2) * t) / (v * sqrt(t));
    return s * N(d1) - k * exp(-r * t) * N(d1 - v * sqrt(t));
}

mt19937_64 rng(2026);
double normal() {  // Box-Muller
    double u1 = 1 - (rng() >> 11) * 0x1.0p-53;
    double u2 = (rng() >> 11) * 0x1.0p-53;
    return sqrt(-2 * log(u1)) * cos(2 * numbers::pi * u2);
}

int main() {
    const double s = 100, k = 100, t = 0.5, r = 0.05, v = 0.2, h = 0.01;
    double d1 = (log(s / k) + (r + v * v / 2) * t) / (v * sqrt(t)), d2 = d1 - v * sqrt(t);
    double price = call(s, k, t, r, v);
    double delta = N(d1), gamma = phi(d1) / (s * v * sqrt(t)), vega = s * phi(d1) * sqrt(t);
    double theta = -s * phi(d1) * v / (2 * sqrt(t)) - r * k * exp(-r * t) * N(d2);  // per year
    double fdDelta = (call(s + h, k, t, r, v) - call(s - h, k, t, r, v)) / (2 * h);
    double fdGamma = (call(s + h, k, t, r, v) - 2 * price + call(s - h, k, t, r, v)) / (h * h);
    double fdVega = (call(s, k, t, r, v + 1e-4) - call(s, k, t, r, v - 1e-4)) / 2e-4;
    double fdTheta = -(call(s, k, t + 1e-4, r, v) - call(s, k, t - 1e-4, r, v)) / 2e-4;
    printf("price %.4f\n", price);
    printf("delta %.5f  finite difference %.5f\n", delta, fdDelta);
    printf("gamma %.5f  finite difference %.5f\n", gamma, fdGamma);
    printf("vega  %.4f  finite difference %.4f (per 1.00 of volatility)\n", vega, fdVega);
    printf("theta %.4f  finite difference %.4f (per year)\n", theta, fdTheta);
    printf("theta + 0.5 v^2 S^2 gamma + r S delta - r V = %.1e\n",
           theta + 0.5 * v * v * s * s * gamma + r * s * delta - r * price);

    // Sell the call at its price and delta-hedge n times. The stock drifts at 10% a year.
    for (int n : {5, 20, 80, 320}) {
        const int paths = 20000;
        double dt = t / n, sum = 0, sumSq = 0;
        for (int p = 0; p < paths; ++p) {
            double st = s, held = N(d1), cash = price - held * st;
            for (int i = 1; i <= n; ++i) {
                cash *= exp(r * dt);
                st *= exp((0.10 - v * v / 2) * dt + v * sqrt(dt) * normal());
                if (i == n) break;  // expiry: settle below
                double left = t - i * dt;
                double want = N((log(st / k) + (r + v * v / 2) * left) / (v * sqrt(left)));
                cash -= (want - held) * st, held = want;  // rebalance to the new delta
            }
            double pnl = cash + held * st - max(st - k, 0.0);
            sum += pnl, sumSq += pnl * pnl;
        }
        double mean = sum / paths, sd = sqrt(sumSq / paths - mean * mean);
        printf("hedge %3d times: mean P&L %+.4f (SE %.4f), sd %.4f\n", n, mean,
               sd / sqrt(paths), sd);
    }
}
```

Output:

```text
price 6.8887
delta 0.59773  finite difference 0.59773
gamma 0.02736  finite difference 0.02736
vega  27.3587  finite difference 27.3587 (per 1.00 of volatility)
theta -8.1160  finite difference -8.1160 (per year)
theta + 0.5 v^2 S^2 gamma + r S delta - r V = 1.9e-15
hedge   5 times: mean P&L -0.0193 (SE 0.0145), sd 2.0471
hedge  20 times: mean P&L +0.0045 (SE 0.0075), sd 1.0540
hedge  80 times: mean P&L +0.0027 (SE 0.0038), sd 0.5390
hedge 320 times: mean P&L -0.0001 (SE 0.0019), sd 0.2736
```

#### Reading the results

- **Formulas and bumps agree** to every printed digit, and the Black-Scholes equation holds to rounding error. Theta of $-8.12$ a year is about $-0.022$ a day; vega of 27.4 means about 0.27 per volatility point.
- **Hedging works on average**: every mean P&L is within 1.4 standard errors of zero, although the stock drifts at 10%, not 5%. The hedge removes the direction.
- **The hedging error halves every time rebalancing becomes 4 times as frequent** (2.05, 1.05, 0.54, 0.27): it shrinks like $1/\sqrt{n}$. Gamma is what makes a discrete hedge imperfect.

#### Reading a position

| Position | Delta | Gamma | Vega | Theta |
|---|---|---|---|---|
| long call | + | + | + | − |
| long put | − | + | + | − |
| short straddle | about 0 | − | − | + |

#### Common mistakes

- **Treating delta as a probability.** $N(d_2)$, not $N(d_1)$, is the risk-neutral probability of finishing in the money.
- **Hedging only delta.** A delta-neutral book can still lose a lot on a large move if it is short gamma.

Connects to: [derivatives and optimization](#/concept/math.calculus.derivatives-and-optimization), [Taylor series](#/concept/math.calculus.taylor-series), [Black-Scholes intuition](#/concept/markets.options.black-scholes-intuition), [intrinsic and time value](#/concept/markets.options.intrinsic-and-time-value).

### questions
Q: What does an option's delta tell you?
A: How much its price changes for a small move in the stock, and therefore how many shares hedge it. An at-the-money call has a delta a little above one half; deep in the money it approaches 1, far out of the money 0.

Q: What is gamma, and where is it largest?
A: The rate at which delta changes as the stock moves, the curvature of the option's value. It is largest for at-the-money options close to expiry, where a small move can swing the option from worthless to in the money.

Q: Why do long options lose value over time, and what do they get in return?
A: Theta is negative because time value decays. In return they have positive gamma: a delta-hedged long option gains from moves in either direction, and it profits overall if the stock moves more than the volatility in its price.

Q: How does the error of a delta hedge depend on how often you rebalance?
A: It shrinks roughly like one over the square root of the number of rebalances: four times as often halves the error. Rebalancing more often costs more in trading, so traders balance the two.

Q: What does vega measure, and which options have the most?
A: The change in price for a change in implied volatility. At-the-money options with a long time to expiry have the most, because volatility has longest to act on them.

## markets.options.black-scholes-intuition
name: "Black-Scholes intuition"
importance: advanced
prereqs: [markets.options.greeks-intuition]
scope: "assumptions and inputs"

### simple
The Black-Scholes formula prices a European option from five inputs: the stock price, the strike, the time left, the interest rate and the volatility. Its key idea is that an option can be copied by holding a changing amount of the stock and cash, so the option must cost what the copy costs. Like a recipe that fixes the price of a cake from the price of its ingredients, it never needs to know whether you expect the stock to rise.

### interview
- $C = S\,N(d_1) - K e^{-rT} N(d_2)$, with $d_{1,2} = \frac{\ln(S/K) + (r \pm \sigma^2/2)T}{\sigma\sqrt{T}}$; the put follows from parity.
- **Inputs**: $S$, $K$, $T$, $r$, $\sigma$ (plus a dividend yield). Only $\sigma$ is not observable, which is why prices are quoted as implied volatilities.
- **Assumptions**: the stock follows geometric Brownian motion with constant volatility, trading is continuous and free, rates are constant, and there are no jumps or arbitrage.
- The expected return of the stock does **not** appear: delta hedging removes it, so you can price as if the stock grew at the risk-free rate (risk-neutral pricing).
- Numerically the price is the discounted average payoff under risk-neutral growth: Monte Carlo or a binomial tree give the same answer.
- Where the assumptions fail (jumps, changing volatility, costs), traders adjust the volatility input, which produces the smile.

### deep
#### Intuition

If you can hold $\Delta$ shares against one option so that small moves cancel, the combined position is riskless over the next instant, so it must earn the risk-free rate. That condition is the Black-Scholes equation, and its solution for a call at expiry payoff $\max(S_T - K, 0)$ is the formula. Nothing in the argument involves how fast the stock is expected to grow.

#### Worked example

Stock 100, strike 105, one year, rate 3%, volatility 25%. The program compares the formula with a Monte Carlo average of discounted payoffs under risk-neutral growth, the same average under 12% growth (a real-world guess), and a binomial tree.

```cpp
double N(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }
double bsCall(double s, double k, double t, double r, double v) {
    double d1 = (log(s / k) + (r + v * v / 2) * t) / (v * sqrt(t));
    return s * N(d1) - k * exp(-r * t) * N(d1 - v * sqrt(t));
}

mt19937_64 rng(2026);
double normal() {  // Box-Muller
    double u1 = 1 - (rng() >> 11) * 0x1.0p-53;
    double u2 = (rng() >> 11) * 0x1.0p-53;
    return sqrt(-2 * log(u1)) * cos(2 * numbers::pi * u2);
}

// Discounted average payoff when the stock grows at `drift`; returns {price, standard error}.
pair<double, double> monteCarlo(double s, double k, double t, double r, double v, double drift) {
    const int paths = 1'000'000;
    double sum = 0, sumSq = 0;
    for (int i = 0; i < paths; ++i) {
        double st = s * exp((drift - v * v / 2) * t + v * sqrt(t) * normal());
        double pay = exp(-r * t) * max(st - k, 0.0);
        sum += pay, sumSq += pay * pay;
    }
    double mean = sum / paths;
    return {mean, sqrt((sumSq / paths - mean * mean) / paths)};
}

double binomial(double s, double k, double t, double r, double v, int steps) {  // CRR tree
    double dt = t / steps, u = exp(v * sqrt(dt)), d = 1 / u, q = (exp(r * dt) - d) / (u - d);
    vector<double> value(steps + 1);
    for (int j = 0; j <= steps; ++j) value[j] = max(s * pow(u, j) * pow(d, steps - j) - k, 0.0);
    for (int n = steps - 1; n >= 0; --n)
        for (int j = 0; j <= n; ++j)
            value[j] = exp(-r * dt) * (q * value[j + 1] + (1 - q) * value[j]);
    return value[0];
}

int main() {
    const double s = 100, k = 105, t = 1, r = 0.03, v = 0.25;
    double exact = bsCall(s, k, t, r, v);
    printf("Black-Scholes: %.4f\n", exact);
    auto [mc, se] = monteCarlo(s, k, t, r, v, r);
    printf("Monte Carlo, growth at r:   %.4f (SE %.4f, %+.2f SE)\n", mc, se, (mc - exact) / se);
    auto [wrong, se2] = monteCarlo(s, k, t, r, v, 0.12);
    printf("Monte Carlo, growth at 12%%: %.4f (SE %.4f), not the price\n", wrong, se2);
    for (int steps : {10, 100, 1000})
        printf("binomial tree, %4d steps: %.4f\n", steps, binomial(s, k, t, r, v, steps));
    for (double vol : {0.15, 0.25, 0.35})
        printf("volatility %.2f: %.4f\n", vol, bsCall(s, k, t, r, vol));
}
```

Output:

```text
Black-Scholes: 9.1218
Monte Carlo, growth at r:   9.0985 (SE 0.0163, -1.43 SE)
Monte Carlo, growth at 12%: 14.6748 (SE 0.0209), not the price
binomial tree,   10 steps: 9.2854
binomial tree,  100 steps: 9.1004
binomial tree, 1000 steps: 9.1207
volatility 0.15: 5.1340
volatility 0.25: 9.1218
volatility 0.35: 13.0954
```

#### Reading the results

- **Monte Carlo agrees** with the formula: 9.0985 against 9.1218, 1.43 standard errors away with a million paths.
- **Averaging real-world payoffs is not the price.** With 12% growth the discounted average is 14.67, but anyone selling at that price could hedge and lock in the difference. The price is set by the cost of hedging, not by forecasts.
- **The binomial tree converges** to the formula as steps increase (9.29, 9.10, 9.12), oscillating a little on the way, a known feature of the tree.
- **Volatility is the input that matters most** here: 15%, 25% and 35% give 5.13, 9.12 and 13.10.

#### What the assumptions miss

- **Jumps**: stocks gap on news, which a continuous path can't do; hedges fail exactly then.
- **Changing volatility**: volatility rises in sell-offs and clusters in time.
- **Costs and discrete hedging**: every rebalance costs money, and the error shrinks only like $1/\sqrt{n}$ ([Greeks intuition](#/concept/markets.options.greeks-intuition)).

Connects to: [lognormal distribution](#/concept/prob.distributions.lognormal-distribution), [Brownian motion](#/concept/prob.stochastic.brownian-motion-intuition), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation), [implied volatility and the smile](#/concept/markets.options.implied-volatility-and-the-volatility-smile).

### questions
Q: What are the inputs to the Black-Scholes formula?
A: The stock price, the strike, the time to expiry, the risk-free interest rate and the volatility, plus a dividend yield if there is one. Volatility is the only input you cannot look up, so it is the one traders argue about.

Q: Why doesn't the stock's expected return appear in the Black-Scholes price?
A: Because the option can be replicated by a continuously rebalanced hedge in the stock and cash. The hedged position is riskless and earns the risk-free rate whatever the stock's drift, so the price depends only on the cost of replication.

Q: What are the main assumptions of Black-Scholes?
A: Geometric Brownian motion with constant volatility, continuous trading without costs, constant interest rates, no jumps and no arbitrage. European exercise is assumed for the basic formula.

Q: How would you price a European call by simulation?
A: Simulate the stock at expiry growing at the risk-free rate with the given volatility, average the payoffs, discount at the risk-free rate, and report the standard error. With a million paths the error is a small fraction of the price.

Q: Where does Black-Scholes fail in practice?
A: Real prices jump, volatility changes over time and rises in sell-offs, and hedging is discrete and costly. Traders compensate by using different volatilities for different strikes and expiries.

## markets.options.implied-volatility-and-the-volatility-smile
name: "Implied volatility and the volatility smile"
importance: advanced
prereqs: [markets.options.black-scholes-intuition]
scope: "Implied volatility and the volatility smile"

### simple
Implied volatility is the volatility you must put into Black-Scholes to get an option's market price. Traders quote options this way because it makes prices comparable across strikes and expiries. If the formula were perfect, every strike would show the same number; in practice they don't, and plotted against strike they often curve up at the ends like a smile.

### interview
- Implied volatility inverts the pricing formula: find $\sigma$ with $BS(\sigma) = \text{market price}$. The price rises with $\sigma$, so bisection or Newton's method (using vega) always works.
- Quoting in volatility removes the effects of strike, expiry and rates, so options can be compared directly.
- A **smile** (higher implied volatility away from the money) means the market prices fatter tails than a lognormal distribution.
- A **skew** (higher implied volatility for low strikes) is typical for stock indexes: sharp falls are feared more than sharp rises.
- The **term structure** is how implied volatility varies with expiry; together with strike it forms a volatility surface.
- Implied volatility is a price, not a forecast: it includes a premium for risk.

### deep
#### Intuition

A single volatility means a single lognormal shape for the final price. If the market thinks both large rises and large falls are more likely than that shape allows, options far from the money are worth more than one volatility can explain, and inverting their prices gives higher volatilities there.

#### Worked example: where a smile comes from

The program first checks that inverting a price recovers its volatility. Then it makes up a market where the next three months are calm (15% volatility) or stormy (35%) with equal chance, so every option is worth the average of its two Black-Scholes prices. The mixture has fatter tails than any single lognormal; the implied volatilities show it.

```cpp
double N(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }
double bsCall(double s, double k, double t, double r, double v) {
    double d1 = (log(s / k) + (r + v * v / 2) * t) / (v * sqrt(t));
    return s * N(d1) - k * exp(-r * t) * N(d1 - v * sqrt(t));
}

// The volatility at which Black-Scholes matches a price (the call price rises with volatility).
double impliedVol(double price, double s, double k, double t, double r) {
    double lo = 1e-4, hi = 3;
    for (int i = 0; i < 100; ++i) {
        double mid = (lo + hi) / 2;
        (bsCall(s, k, t, r, mid) < price ? lo : hi) = mid;
    }
    return (lo + hi) / 2;
}

int main() {
    const double s = 100, t = 0.25, r = 0.02;
    printf("round trip: price at 20%% volatility -> implied %.6f\n",
           impliedVol(bsCall(s, 110, t, r, 0.2), s, 110, t, r));
    // A made-up market: calm (15% volatility) or stormy (35%) with equal chance, so each option
    // is worth the average of its two Black-Scholes prices.
    puts("strike   price   implied volatility");
    for (double k = 70; k <= 130; k += 10) {
        double price = 0.5 * bsCall(s, k, t, r, 0.15) + 0.5 * bsCall(s, k, t, r, 0.35);
        printf("%6.0f %7.4f   %.4f\n", k, price, impliedVol(price, s, k, t, r));
    }
}
```

Output:

```text
round trip: price at 20% volatility -> implied 0.200000
strike   price   implied volatility
    70 30.4007   0.3175
    80 20.7518   0.2963
    90 11.8854   0.2662
   100  5.2237   0.2500
   110  1.9804   0.2613
   120  0.7872   0.2842
   130  0.3112   0.3022
```

Near the money the implied volatility is 25%, the average of the two regimes: there the price is almost proportional to volatility, so averaging two prices is like averaging two volatilities. Away from the money it rises to 30.2% at 130 and 31.8% at 70 (by parity that call carries the same volatility as the out-of-the-money 70 put). Out-of-the-money options pay almost only in the stormy regime, and their price grows faster than in proportion to volatility, so the average price needs a single volatility well above 25%. Nothing in this market is mispriced; the smile is what fat tails look like through the Black-Scholes lens.

#### Newton's method

Bisection is safe but slow. Newton's method, $\sigma_{n+1} = \sigma_n - \frac{BS(\sigma_n) - \text{price}}{\text{vega}(\sigma_n)}$, converges in a few steps from a good start, such as the at-the-money approximation $\sigma \approx \text{price} / (0.4\,S\sqrt{T})$; far from the money vega is tiny and Newton can jump away, so production code falls back to bisection.

#### Common mistakes

- **Reading implied volatility as a forecast.** It is the market's price for volatility, including a risk premium.
- **Using one volatility for every strike.** That misprices the wings.
- **Inverting prices below the no-arbitrage bound** (for a call, $S - K e^{-rT}$): no volatility matches them, which signals bad data or an arbitrage.

Connects to: [Black-Scholes intuition](#/concept/markets.options.black-scholes-intuition), [Greeks intuition](#/concept/markets.options.greeks-intuition), [binary search on real numbers](#/concept/dsa.binary-search.binary-search-on-real-numbers), [moments](#/concept/prob.random-variables.moments-and-moment-generating-functions).

### questions
Q: What is implied volatility?
A: The volatility that makes the Black-Scholes price equal to the option's market price. It turns prices at different strikes and expiries into one comparable number.

Q: How do you compute implied volatility?
A: Solve the pricing formula for volatility numerically. The price increases with volatility, so bisection always converges; Newton's method using vega is faster from a good starting point.

Q: What does a volatility smile tell you?
A: That the market prices extreme moves in both directions as more likely than a single lognormal distribution allows. Out-of-the-money options are then worth more than one volatility can explain, so their implied volatilities are higher.

Q: Why do stock index options usually show a skew rather than a symmetric smile?
A: Low-strike puts, which protect against crashes, are in high demand, and large falls tend to come with rising volatility. Both push implied volatility up at low strikes more than at high ones.

Q: Is implied volatility the market's forecast of future volatility?
A: Not exactly. It is a price that includes a premium for bearing volatility risk, so it is often above the volatility that is later realized.
