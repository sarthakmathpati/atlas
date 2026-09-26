---
topic: markets.basics
name: "Market basics"
subject: markets
order: 1
prereqs: []
---

## markets.basics.asset-classes
name: "Asset classes"
importance: must
scope: "stocks, bonds, futures, options, currencies"

### simple
An asset class is a family of things you can own or trade that behave alike. A stock is a slice of a company, a bond is a loan you made, a future is a promise to trade later at a price fixed today, an option is the right but not the duty to trade, and a currency is another country's money. Think of them as different tools in a toolbox: each one moves for its own reasons and carries its own risks.

### interview
- **Stocks (equities)**: part ownership of a company. You gain from price moves and dividends, and you can lose at most what you paid.
- **Bonds**: a loan with fixed coupons and the face value repaid at maturity. The price moves opposite to yields; the main risks are interest rates and default.
- **Futures**: standardized, exchange-traded agreements to buy or sell later at a price agreed today. Gains and losses settle every day through margin, so a small deposit controls a large position (leverage).
- **Options**: the right, not the obligation, to buy (call) or sell (put) at a strike price. The buyer's loss is capped at the premium; the payoff has a kink at the strike.
- **Currencies**: quoted in pairs as the price of one unit of the base currency in the quote currency. Buying one currency means selling the other.
- Stocks, futures and currency positions are **linear** (they move one for one with what they track); options are **nonlinear**, which is why they need their own models.

### deep
#### Intuition

Each asset class answers the same question differently: what do you receive, and when? A stock gives a share of future profits with no end date. A bond gives fixed payments that stop at maturity. A future gives you the price move of something without paying for it up front. An option gives you only the favorable half of a price move, for a fee. A currency position gives you the exchange-rate move between two kinds of money.

#### One program, five instruments

Every price below is made up. The program prices each position the way a trader would.

```cpp
double bondPrice(double face, double coupon, int years, double yield) {
    double price = 0;
    for (int t = 1; t <= years; ++t) {
        double cash = face * coupon + (t == years ? face : 0);
        price += cash / pow(1 + yield, t);
    }
    return price;
}

int main() {
    // Stock: 100 shares bought at 40.00, now 43.50, one dividend of 0.50 a share.
    printf("stock:    P&L %.2f\n", 100 * (43.50 - 40.00) + 100 * 0.50);

    // Bond: face 100, 5% annual coupon, 3 years left; price at three yields.
    for (double y : {0.05, 0.06, 0.07})
        printf("bond:     yield %.0f%% -> price %.4f\n", y * 100, bondPrice(100, 0.05, 3, y));

    // Future on an index: multiplier 50, bought at 2000, settled daily.
    double settle[] = {2000, 2012, 1990, 1985, 2031};
    double total = 0;
    for (int d = 1; d < 5; ++d) {
        double flow = 50 * (settle[d] - settle[d - 1]);
        total += flow;
        printf("future:   day %d settles %.0f, variation margin %+.0f\n", d, settle[d], flow);
    }
    printf("future:   total %+.0f = 50 x (2031 - 2000) = %+.0f\n", total, 50 * (2031.0 - 2000));

    // Call option on the same index: strike 2050, premium 30 index points, multiplier 50.
    for (double s : {2000.0, 2050.0, 2080.0, 2120.0})
        printf("option:   index %.0f at expiry -> P&L %+.0f\n", s,
               50 * (max(s - 2050, 0.0) - 30));

    // Currency: 1,000,000 units of currency F bought at 1.2500 H per F, now 1.2000.
    printf("currency: P&L in H %+.0f\n", 1'000'000 * (1.2000 - 1.2500));
}
```

Output:

```text
stock:    P&L 400.00
bond:     yield 5% -> price 100.0000
bond:     yield 6% -> price 97.3270
bond:     yield 7% -> price 94.7514
future:   day 1 settles 2012, variation margin +600
future:   day 2 settles 1990, variation margin -1100
future:   day 3 settles 1985, variation margin -250
future:   day 4 settles 2031, variation margin +2300
future:   total +1550 = 50 x (2031 - 2000) = +1550
option:   index 2000 at expiry -> P&L -1500
option:   index 2050 at expiry -> P&L -1500
option:   index 2080 at expiry -> P&L +0
option:   index 2120 at expiry -> P&L +2000
currency: P&L in H -50000
```

#### What the numbers show

- **Stock**: the profit is the price change plus dividends, $100 \times 3.50 + 100 \times 0.50 = 400$.
- **Bond**: at a 5% yield a 5% coupon bond is worth exactly its face value, because it pays exactly the market rate. At 6% it is worth $\frac{5}{1.06} + \frac{5}{1.06^2} + \frac{105}{1.06^3} = 97.33$, and at 7% only 94.75. Price falls as yield rises, and the curve is convex: the drop from 6% to 7% (2.58) is smaller than from 5% to 6% (2.67).
- **Future**: nobody paid $2000 \times 50$ up front. Gains and losses changed hands every day as variation margin, and the daily flows add up to one trade's profit, $50 \times 31 = 1550$. On day 2 the holder had to pay 1,100 in cash even though the position ended up well ahead.
- **Option**: below the strike the call expires worthless and the buyer loses the premium, $30 \times 50 = 1500$. The break-even is strike plus premium, 2,080; above it the gain grows one for one.
- **Currency**: being long F against H, a 0.05 fall in the rate costs $10^6 \times 0.05 = 50{,}000$ units of H.

#### Common mistakes

- **Getting the price and yield direction backwards.** Fixed cash flows discounted at a higher rate are worth less.
- **Treating a future as costing its full value.** It needs only margin, but daily settlement can demand cash before the position recovers.
- **Flipping a currency quote.** A rate of 1.25 H per F is 0.80 F per H; mixing up base and quote currency flips the sign of the trade.
- **Treating an option like a stock.** Its value doesn't move one for one with the underlying, and it can expire worthless.

Connects to: [order books](#/concept/markets.basics.order-books), [time value of money](#/concept/markets.pricing.time-value-of-money), [no-arbitrage pricing of forwards and futures](#/concept/markets.pricing.no-arbitrage-pricing), [calls and puts](#/concept/markets.options.calls-and-puts).

### questions
Q: Why does a bond's price fall when yields rise?
A: A bond's cash flows are fixed. When the market yield rises, those payments are discounted at a higher rate, so their present value, which is the price, falls. A 3-year 5% bond with face 100 is worth 100 at a 5% yield and about 97.33 at 6%.

Q: How does a futures position differ from buying the underlying asset?
A: A future is an agreement to trade later at a price fixed today, so you post margin instead of paying for the asset. Gains and losses are settled every day, which makes the position leveraged and can require cash before the contract ends.

Q: What is the most an option buyer can lose, and the most an option seller can lose?
A: The buyer can lose only the premium. The seller of a call can lose without limit, because the underlying can keep rising; the seller of a put can lose up to the strike minus the premium received.

Q: What does it mean to be long one currency against another?
A: Currencies trade in pairs, so buying one means selling the other. If you buy F with H, you gain when F strengthens against H and lose when it weakens.

Q: Which asset classes are linear in their underlying, and which are not?
A: Stocks, futures and currency positions gain or lose one for one with the price of what they track. Options are nonlinear: how much their value changes per unit move depends on where the price is, and the payoff has a kink at the strike.

## markets.basics.order-books
name: "Order books"
importance: must
prereqs: [markets.basics.asset-classes]
scope: "bids, asks, spread, depth"

### simple
An order book is the list of everyone waiting to buy or sell, sorted by price. Offers to buy (bids) sit on one side, offers to sell (asks) on the other, and the gap between the best of each is the spread. It is like a notice board at a market stall: the highest price anyone will pay and the lowest price anyone will sell for are pinned at the top.

### interview
- A limit order book holds resting **bids** (buy orders) and **asks** or offers (sell orders), each with a price and a size, grouped into price levels.
- The best bid and best ask are the **top of the book** (the touch). **Spread** = best ask − best bid; **mid** = their average.
- **Depth** is the size resting near the touch. In a thin book a large order moves the price.
- A market order **walks the book**: it fills level by level, so its average price is worse than the touch. The extra cost beyond half the spread is market impact.
- The size at the touch hints at the next move. The **microprice** weights each side's price by the other side's size, so it leans toward the side that is about to run out.
- In code: bids in a map sorted high to low, asks low to high (or two heaps), with a first-in, first-out queue of orders at each price.

### deep
#### Intuition

Each side of the book is a line of people who have already decided their price. Buyers line up from the most generous down, sellers from the cheapest up. Nothing trades while the best bid is below the best ask; the moment someone is willing to cross that gap, a trade happens at the price of the order that was waiting.

#### Worked example

A made-up stock with prices in cents. The program prints the ladder (asks above, bids below), then measures the book and the cost of a market buy of 1,500 shares.

```cpp
// Prices in cents (integer ticks of 0.01), sizes in shares. All orders are made up.
map<int, int, greater<int>> bids;  // price -> total size, best (highest) first
map<int, int> asks;                // price -> total size, best (lowest) first

void show() {
    for (auto it = asks.rbegin(); it != asks.rend(); ++it)
        printf("            %6.2f | %5d\n", it->first / 100.0, it->second);
    for (auto [p, q] : bids) printf("     %5d  %6.2f |\n", q, p / 100.0);
}

int main() {
    bids = {{2498, 300}, {2497, 500}, {2496, 900}, {2494, 1200}};
    asks = {{2501, 200}, {2502, 400}, {2503, 700}, {2505, 1500}};
    show();
    int bid = bids.begin()->first, ask = asks.begin()->first;
    double mid = (bid + ask) / 200.0;
    printf("best bid %.2f x %d, best ask %.2f x %d\n", bid / 100.0, bids.begin()->second,
           ask / 100.0, asks.begin()->second);
    printf("spread %.2f (%d ticks, %.1f bp of mid %.3f)\n", (ask - bid) / 100.0, ask - bid,
           (ask - bid) / 100.0 / mid * 1e4, mid);
    int bidDepth = 0, askDepth = 0;
    for (auto [p, q] : bids) if (p >= bid - 3) bidDepth += q;
    for (auto [p, q] : asks) if (p <= ask + 3) askDepth += q;
    printf("depth within 3 ticks of the touch: bids %d, asks %d\n", bidDepth, askDepth);
    double qb = bids.begin()->second, qa = asks.begin()->second;
    printf("imbalance at the touch %.2f, microprice %.4f\n", (qb - qa) / (qb + qa),
           (bid * qa + ask * qb) / (qa + qb) / 100.0);

    // Cost of a market buy of 1,500 shares: walk up the asks.
    int left = 1500;
    long long cents = 0;
    for (auto [p, q] : asks) {
        int take = min(left, q);
        if (take == 0) break;
        printf("  buy %4d at %.2f\n", take, p / 100.0);
        cents += 1LL * take * p;
        left -= take;
    }
    double avg = cents / 1500.0 / 100.0;
    printf("average price %.4f, %.4f above the mid, cost %.2f\n", avg, avg - mid,
           (avg - mid) * 1500);
}
```

Output:

```text
             25.05 |  1500
             25.03 |   700
             25.02 |   400
             25.01 |   200
       300   24.98 |
       500   24.97 |
       900   24.96 |
      1200   24.94 |
best bid 24.98 x 300, best ask 25.01 x 200
spread 0.03 (3 ticks, 12.0 bp of mid 24.995)
depth within 3 ticks of the touch: bids 1700, asks 1300
imbalance at the touch 0.20, microprice 24.9980
  buy  200 at 25.01
  buy  400 at 25.02
  buy  700 at 25.03
  buy  200 at 25.05
average price 25.0273, 0.0323 above the mid, cost 48.50
```

#### Reading the book

- **Spread**: 3 ticks, or 12 basis points of the mid. Anyone who buys now and sells now loses that much.
- **Imbalance**: 300 shares bid against 200 offered. The microprice, $\frac{24.98 \times 200 + 25.01 \times 300}{500} = 24.998$, sits above the mid because the ask is the side more likely to be used up first.
- **Walking the book**: the 1,500 shares cost 25.0273 on average, 0.0323 above the mid, or 48.50 in total. Half the spread explains $0.015 \times 1500 = 22.50$ of that; the other 26.00 is impact from climbing four levels. The 25.04 level was empty, so the last 200 shares jumped straight to 25.05.

#### In code

`std::map` keeps each side sorted, so the best price is `begin()`, and adding or removing a price level costs $O(\log L)$ for $L$ levels. A real book also keeps a queue of individual orders at each level so it knows who fills first, which is the subject of [how exchanges match orders](#/concept/markets.basics.how-exchanges-match-orders).

#### Common mistakes

- **Quoting the spread without the depth.** A 1-tick spread with 100 shares behind it is less liquid than a 2-tick spread with 10,000.
- **Assuming a large order fills at the touch.** Size walks the book; estimate the average price level by level.
- **Using floating point for prices.** Store integer ticks, as above, so equal prices compare equal.

Connects to: [binary heaps](#/concept/dsa.heaps.binary-heap), [order types](#/concept/markets.basics.order-types), [liquidity and market makers](#/concept/markets.basics.liquidity-and-market-makers), [making a market](#/concept/markets.making.making-a-market), [a matching engine design](#/concept/sysd.classics.stock-exchange-matching-engine).

### questions
Q: What are the spread and the mid, and why does a spread exist?
A: The spread is the best ask minus the best bid, and the mid is their average. It exists because whoever posts quotes wants paying for offering immediate trades: they carry inventory risk and the risk of trading with someone better informed.

Q: What happens when a large market order arrives in a thin book?
A: It fills at the best level, then the next, and so on until it is done, so its average price is worse than the touch. The difference beyond half the spread is market impact, and the book is left with a wider spread until new orders arrive.

Q: What is the microprice and why can it be more useful than the mid?
A: It weights the bid and the ask by the opposite side's size: bid times ask size plus ask times bid size, over the total size. When far more size rests on the bid, the ask is likely to be taken first, and the microprice moves toward it; the mid ignores that information.

Q: How would you store an order book in code?
A: Keep each side sorted by price, such as a map from price to a queue of orders, with bids in descending order and asks in ascending order. The best price is then the first entry, new levels cost logarithmic time, and the queue at each level gives the fill order.

Q: What does depth tell you that the spread does not?
A: The spread describes only the first level. Depth says how much can trade near that price, which decides the cost of a real-sized order and how easily the price can be pushed.

## markets.basics.order-types
name: "Order types"
importance: must
needsReview: true
prereqs: [markets.basics.order-books]
scope: "market, limit, stop orders"

### simple
An order tells the exchange what you want and on what conditions. A market order says "trade now at whatever price is there", a limit order says "trade only at this price or better", and a stop order waits out of sight until the price reaches a trigger, then turns into a market order. It is the difference between buying at any price, naming your maximum, and setting an alarm that buys or sells when the price crosses a line.

### interview
- **Market order**: executes at once against the best prices available. The fill is nearly certain, the price is not; it pays the spread and can walk the book.
- **Limit order**: a maximum price for a buy or a minimum for a sell. Whatever can trade immediately does (taking liquidity); the rest rests in the book (providing liquidity). The price is certain, the fill is not.
- **Stop order**: invisible until a trade happens at or through the trigger, then it becomes a market order (a stop-limit becomes a limit order instead). Used for stop-losses and breakouts; triggered stops can push the price further.
- **Time in force**: day, good till cancelled, immediate or cancel (IOC: fill what you can now, cancel the rest), fill or kill (FOK: all of it now or nothing).
- The core trade-off: a market order buys certainty of execution, a limit order buys certainty of price.
- Details vary by venue: what triggers a stop (last trade, bid or ask), which types the exchange supports natively, and whether a broker simulates the rest.

### deep
#### Intuition

Every order answers two questions: at what price, and how badly do you need the trade? A market order cares only about speed. A limit order cares only about price and will wait. A stop order cares about neither until the market proves something, such as "the price fell below 9.99, get me out". Time-in-force flags add a third answer: how long the order may wait.

#### A sequence of orders in one book

The book is made up, with prices in cents. One stop order to sell 500 waits outside the book with its trigger at 9.99.

```cpp
// A made-up book in cents: price -> total size resting at that price.
map<int, int, greater<int>> bids = {{1000, 400}, {999, 300}, {998, 500}, {997, 600}};
map<int, int> asks = {{1002, 200}, {1003, 300}, {1004, 400}, {1006, 800}};
int lastTrade = 1001, stopTrigger = 999, stopQty = 500;  // stop: sell 500 once a trade <= 9.99

// Trades against one side of the book while ok(price) holds; returns the size filled.
int sweep(auto& book, int qty, auto ok) {
    int filled = 0;
    while (qty > 0 && !book.empty() && ok(book.begin()->first)) {
        auto& [p, q] = *book.begin();
        int take = min(qty, q);
        printf("    trade %d at %.2f\n", take, p / 100.0);
        q -= take, qty -= take, filled += take, lastTrade = p;
        if (q == 0) book.erase(book.begin());
    }
    return filled;
}
int buy(int qty, int limit) { return sweep(asks, qty, [=](int p) { return p <= limit; }); }
int sell(int qty, int limit) { return sweep(bids, qty, [=](int p) { return p >= limit; }); }

int main() {
    puts("market buy 350");
    buy(350, INT_MAX);
    puts("limit buy 300 at 10.03");
    if (int left = 300 - buy(300, 1003)) bids[1003] += left, printf("    rests %d\n", left);
    puts("limit sell 200 at 10.05");
    if (int left = 200 - sell(200, 1005)) asks[1005] += left, printf("    rests %d\n", left);
    puts("market sell 1000 (a stop to sell 500 at 9.99 waits outside the book)");
    sell(1000, 0);
    if (lastTrade <= stopTrigger) {
        printf("  last trade %.2f triggers the stop: market sell %d\n", lastTrade / 100.0, stopQty);
        sell(stopQty, 0);
    }
    puts("IOC buy 600 at 10.04");
    if (int left = 600 - buy(600, 1004)) printf("    cancels the other %d\n", left);
    int available = 0;
    for (auto [p, q] : asks)
        if (p <= 1005) available += q;
    printf("FOK buy 600 at 10.05: %d available at or below 10.05\n", available);
    if (available >= 600) buy(600, 1005);
    else puts("    killed, nothing trades");
    printf("book now: best bid %.2f x %d, best ask %.2f x %d\n", bids.begin()->first / 100.0,
           bids.begin()->second, asks.begin()->first / 100.0, asks.begin()->second);
}
```

Output:

```text
market buy 350
    trade 200 at 10.02
    trade 150 at 10.03
limit buy 300 at 10.03
    trade 150 at 10.03
    rests 150
limit sell 200 at 10.05
    rests 200
market sell 1000 (a stop to sell 500 at 9.99 waits outside the book)
    trade 150 at 10.03
    trade 400 at 10.00
    trade 300 at 9.99
    trade 150 at 9.98
  last trade 9.98 triggers the stop: market sell 500
    trade 350 at 9.98
    trade 150 at 9.97
IOC buy 600 at 10.04
    trade 400 at 10.04
    cancels the other 200
FOK buy 600 at 10.05: 200 available at or below 10.05
    killed, nothing trades
book now: best bid 9.97 x 450, best ask 10.05 x 200
```

#### What happened

1. The **market buy** of 350 took 200 at 10.02 and 150 at 10.03, an average of 10.0243.
2. The **limit buy** at 10.03 crossed the spread, took the last 150 offered at 10.03, and its other 150 now rests as the best bid: one order both took and provided liquidity.
3. The **limit sell** at 10.05 couldn't trade (the best bid was 10.03), so it rests.
4. The **market sell** of 1,000 swept four bid levels down to 9.98. Trading at or below 9.99 **triggered the stop**, which sold 500 more at 9.98 and 9.97. The stop-loss sold near the low of the move and pushed the price further: this is how stops cascade.
5. The **IOC** buy found 400 at or below 10.04 and cancelled the other 200 instead of leaving them in the book.
6. The **FOK** buy needed 600 at or below 10.05 and found only 200, so nothing traded.

#### Choosing an order

| Order | Price known? | Fill certain? | Liquidity |
|---|---|---|---|
| Market | no | nearly | takes |
| Limit, marketable | capped | up to the size available | takes, then may rest |
| Limit, resting | yes | no | provides |
| Stop | no, once triggered | once triggered | takes |

#### Common mistakes

- **Treating a stop as a guaranteed exit price.** After a gap, or in a sweep like step 4, it fills well beyond the trigger. A stop-limit caps the price but may not fill at all.
- **Sending market orders into a thin or fast market.** Size walks the book; some venues add price bands or protection limits, but the rules vary.
- **Forgetting who fills a resting limit order.** It fills when someone else decides to trade with it, often just before the price moves against it; see [adverse selection](#/concept/markets.making.adverse-selection).

Connects to: [order books](#/concept/markets.basics.order-books), [how exchanges match orders](#/concept/markets.basics.how-exchanges-match-orders), [liquidity and market makers](#/concept/markets.basics.liquidity-and-market-makers).

### questions
Q: What is the trade-off between a market order and a limit order?
A: A market order is almost sure to fill but its price is uncertain, since it takes whatever the book offers. A limit order fixes the worst price you accept but may fill partly or not at all.

Q: How does a stop order work, and what is its main risk?
A: It stays out of the book until the market trades at or through its trigger price, then becomes a market order. Because it then trades at whatever is available, it can fill far beyond the trigger in a fast move or after a gap.

Q: What is the difference between immediate or cancel and fill or kill?
A: Both refuse to rest in the book. Immediate or cancel fills whatever it can right now and cancels the remainder; fill or kill trades only if the entire size can be filled at once, and otherwise does nothing.

Q: When does a limit order take liquidity and when does it provide it?
A: If its price crosses the spread, the part that can match immediately takes liquidity like a market order. Whatever is left rests in the book at the limit price and provides liquidity to later orders.

Q: Why can many stop orders make a price move worse?
A: Stops placed near the same price all turn into market orders when it trades. Their selling or buying pushes the price further, which can trigger the next group of stops.

## markets.basics.liquidity-and-market-makers
name: "Liquidity and market makers"
importance: must
prereqs: [markets.basics.order-books]
scope: "who provides prices and why"

### simple
Liquidity is how easily you can trade a meaningful amount, quickly, without moving the price much. Market makers supply it: all day they post a price to buy and a slightly higher price to sell, and they earn the gap when others trade with them. It works like a currency exchange booth, which always buys and sells and makes its money on the difference between the two rates.

### interview
- Liquidity has several sides: **tightness** (spread), **depth** (size near the best prices), **resilience** (how fast the book refills) and **immediacy**.
- **Market makers** quote both sides continuously and earn the spread from traders who want to trade now rather than wait.
- Their costs: **inventory risk** (holding a position while the price moves), **adverse selection** (trading with better-informed people), and fees, technology and capital.
- The spread is roughly the price of those risks; competition and lower uncertainty narrow it.
- Liquidity comes from exchange-designated market makers with quoting duties, electronic trading firms, and dealer banks in over-the-counter markets such as many bond and currency markets.
- A trader who buys at the ask and sells at the bid pays the full spread per round trip, plus impact for large sizes.

### deep
#### Intuition

Buyers and sellers rarely arrive at the same moment. A market maker bridges the gap in time: they buy from the seller now and sell to the buyer who turns up a minute later. They are paid for that service by buying a little below fair value and selling a little above it. The risk is what happens to the price while they hold the position in between.

#### A simulation of the spread

A made-up model in ticks. The fair value moves one tick up or down each step. The market maker quotes fair value minus $h$ to buy and plus $h$ to sell. Each step a customer arrives with a probability that falls as the quotes widen (0.9, 0.6 and 0.3 for $h = 1, 2, 3$) and is equally likely to buy or sell. At the end, inventory is valued at fair value.

```cpp
mt19937_64 rng(2026);
double uniform() { return (rng() >> 11) * 0x1.0p-53; }

int main() {
    const int steps = 1000, paths = 20000;
    const double tradeProb[] = {0, 0.9, 0.6, 0.3};  // chance a customer trades, by half-spread
    for (int h = 1; h <= 3; ++h) {
        double sum = 0, sumSq = 0, absInv = 0, losing = 0;
        for (int path = 0; path < paths; ++path) {
            long long value = 10000, cash = 0, inventory = 0;  // ticks and units
            for (int t = 0; t < steps; ++t) {
                if (uniform() < tradeProb[h]) {
                    if (uniform() < 0.5) cash += value + h, --inventory;  // customer buys at ask
                    else cash -= value - h, ++inventory;                 // customer sells at bid
                }
                value += uniform() < 0.5 ? 1 : -1;  // fair value moves one tick
            }
            double pnl = cash + inventory * value;  // mark the inventory at fair value
            sum += pnl, sumSq += pnl * pnl, absInv += llabs(inventory), losing += pnl < 0;
        }
        double mean = sum / paths, sd = sqrt(sumSq / paths - mean * mean);
        double exact = h * tradeProb[h] * steps;
        printf("half-spread %d: P&L %.1f (exact %.0f, %+.2f SE), sd %.1f\n", h, mean, exact,
               (mean - exact) / (sd / sqrt(paths)), sd);
        printf("  average |inventory| %.1f, losing paths %.1f%%\n", absInv / paths,
               100 * losing / paths);
    }
}
```

Output:

```text
half-spread 1: P&L 903.4 (exact 900, +0.72 SE), sd 661.4
  average |inventory| 24.0, losing paths 6.7%
half-spread 2: P&L 1206.3 (exact 1200, +1.61 SE), sd 553.3
  average |inventory| 19.5, losing paths 2.2%
half-spread 3: P&L 898.1 (exact 900, -0.70 SE), sd 386.5
  average |inventory| 13.7, losing paths 1.9%
```

#### Reading the results

- **Each trade earns the half-spread on average.** The expected P&L is exactly $h \times P(\text{trade}) \times 1000$, and every run lands within 2 standard errors of it. The inventory adds nothing on average, because the fair value is equally likely to go up or down.
- **Inventory is where the risk lives.** With $h = 1$ one path's standard deviation (661) is almost as large as its mean (903), and the market maker ends 1,000 steps with a loss on 6.7% of paths. Wider quotes trade less, carry less inventory and lose less often (2.2% and 1.9%).
- **Width is a business decision.** Here $h = 2$ earns the most: $2 \times 0.6 = 1.2$ ticks per step against 0.9 for the other two. The customers' willingness to pay for immediacy sets the spread, not the maker's wishes.

The model leaves out informed customers. When some traders know where the value is going, the maker loses on those trades, and the spread must widen to cover them; that is [adverse selection](#/concept/markets.making.adverse-selection).

#### The taker's view

A trader who buys at the ask and later sells at the bid, with no change in value, loses the full spread, $2h$. In the [order book example](#/concept/markets.basics.order-books) that is 3 ticks, or 12 basis points per round trip, before any market impact. Trading often in illiquid products adds up fast.

#### Common mistakes

- **Thinking market makers mainly bet on direction.** They try to stay close to flat and earn the spread; the direction of their inventory is a risk to manage, not the goal.
- **Counting on liquidity in a crisis.** When volatility jumps, inventory and adverse-selection risk jump too, and makers widen their quotes or step back just when others most want to trade.
- **Trusting displayed size.** Quotes can be cancelled before your order arrives, so the depth you see is not guaranteed.

Connects to: [order books](#/concept/markets.basics.order-books), [making a market](#/concept/markets.making.making-a-market), [inventory and position risk](#/concept/markets.making.inventory-and-position-risk), [random walks](#/concept/prob.markov.random-walks).

### questions
Q: How does a market maker make money?
A: By quoting a bid below and an ask above fair value and trading with people who want to trade immediately. Each round trip earns roughly the spread, as long as the price doesn't move against the inventory in between.

Q: What risks does a market maker take?
A: Inventory risk, because the price can move while they hold a position; adverse selection, because some counterparties know more; and operational costs such as fees, technology and capital. The spread has to cover all three.

Q: Why does liquidity tend to disappear in a crisis?
A: Higher volatility makes holding inventory riskier, and informed traders are more likely to be on the other side. Market makers respond by widening quotes, showing less size or stopping, so trading becomes expensive exactly when many people need it.

Q: What does a round trip cost a trader in a market with a 2-cent spread?
A: Buying at the ask and selling at the bid loses the full 2 cents per share even if the value doesn't change, plus market impact if the size is larger than what rests at the touch.

Q: Why would a market maker quote a wider spread even though it means fewer trades?
A: Wider quotes earn more per trade and carry less inventory, so profit can rise while risk falls, until customers stop trading. The best width balances margin against volume and risk.

## markets.basics.how-exchanges-match-orders
name: "How exchanges match orders"
importance: important
needsReview: true
prereqs: [markets.basics.order-books]
scope: "price-time priority"

### simple
When a buy order and a sell order agree on price, the exchange's matching engine pairs them into a trade. If several orders wait at the same price, most stock exchanges serve them first come, first served, like a queue at a counter. Some markets instead share each incoming order among everyone waiting in proportion to their size, and many open and close the day with an auction that finds one price for everyone.

### interview
- **Price-time priority**: the best price trades first; among orders at the same price, the earliest arrival fills first. A place near the front of the queue is valuable.
- **Pro-rata**: at the best price, an incoming order is split among resting orders in proportion to their size, often with extra rules for the first order or a minimum size. It rewards size rather than speed and is used in some futures and options markets.
- An order that improves the best price opens a new level and is first in line. Cancelling, or increasing an order's size, usually sends it to the back of the queue; reducing its size usually keeps its place.
- **Call auctions** at the open and close collect orders and choose one price that maximizes the volume traded, with tie-breaks such as smallest imbalance and closeness to a reference price.
- A trade happens at the resting order's price, so an aggressive order never trades worse than its limit.
- Exact rules (allocation formulas, rounding, auction tie-breaks, hidden-order priority) differ between exchanges.

### deep
#### Intuition

A matching engine is a sorted list of queues. The price decides which queue is served first; the priority rule decides who in that queue gets filled. Because the engine processes messages one at a time per instrument, "first" is well defined: it is the engine's own arrival order.

#### Worked example: three ways to allocate

Three made-up sell orders wait at the best ask of 10.05: A (300 shares, first), B (500) and C (200, last). A market buy for 700 arrives. Separately, before the open, an auction has collected buy and sell limit orders plus a market buy of 200.

```cpp
struct Order { char id; int qty; };

int main() {
    // Made-up sell orders resting at the best ask, 10.05, in arrival order.
    vector<Order> level = {{'A', 300}, {'B', 500}, {'C', 200}};
    int incoming = 700;  // a market buy

    puts("price-time priority (first come, first filled):");
    int left = incoming;
    for (auto [id, q] : level) {
        int fill = min(left, q);
        left -= fill;
        printf("  %c gets %d of %d\n", id, fill, q);
    }

    puts("pro-rata (in proportion to size):");
    int total = 0;
    for (auto [id, q] : level) total += q;
    for (auto [id, q] : level) printf("  %c gets %d of %d\n", id, incoming * q / total, q);

    // Opening auction: pick the price that trades the most shares.
    vector<pair<int, int>> buys = {{1010, 500}, {1008, 300}, {1005, 400}, {1002, 600}};
    vector<pair<int, int>> sells = {{998, 300}, {1000, 400}, {1004, 500}, {1006, 300}, {1010, 600}};
    int marketBuy = 200;  // a market order to buy at the open, whatever the price
    puts("opening auction:");
    puts("  price  buy at or above  sell at or below  tradable  imbalance");
    set<int> prices;
    for (auto [p, q] : buys) prices.insert(p);
    for (auto [p, q] : sells) prices.insert(p);
    int bestPrice = 0, bestVolume = -1, bestImbalance = 0;
    for (int p : prices) {
        int demand = marketBuy, supply = 0;
        for (auto [bp, q] : buys) if (bp >= p) demand += q;
        for (auto [sp, q] : sells) if (sp <= p) supply += q;
        int volume = min(demand, supply), imbalance = demand - supply;
        printf("  %5.2f  %15d  %16d  %8d  %+9d\n", p / 100.0, demand, supply, volume, imbalance);
        // Most volume first; then the smallest imbalance; then, with buyers left over, the
        // higher price (with sellers left over, the lower one). Exchanges add more rules.
        bool more = volume > bestVolume, tie = volume == bestVolume;
        bool smaller = abs(imbalance) < abs(bestImbalance);
        bool sameSize = abs(imbalance) == abs(bestImbalance);
        if (more || (tie && (smaller || (sameSize && imbalance > 0))))
            bestVolume = volume, bestPrice = p, bestImbalance = imbalance;
    }
    printf("  opens at %.2f with %d shares traded\n", bestPrice / 100.0, bestVolume);
}
```

Output:

```text
price-time priority (first come, first filled):
  A gets 300 of 300
  B gets 400 of 500
  C gets 0 of 200
pro-rata (in proportion to size):
  A gets 210 of 300
  B gets 350 of 500
  C gets 140 of 200
opening auction:
  price  buy at or above  sell at or below  tradable  imbalance
   9.98             2000               300       300      +1700
  10.00             2000               700       700      +1300
  10.02             2000               700       700      +1300
  10.04             1400              1200      1200       +200
  10.05             1400              1200      1200       +200
  10.06             1000              1500      1000       -500
  10.08             1000              1500      1000       -500
  10.10              700              2100       700      -1400
  opens at 10.05 with 1200 shares traded
```

#### Continuous matching

Under **price-time** priority A, the first in line, fills completely, B fills 400 and C gets nothing. That makes speed and queue position valuable: traders join a price level early and try not to lose their place. Under **pro-rata** everyone gets 70% ($700 \times 300 / 1000 = 210$ for A), so size matters and speed matters less, which tempts traders to show more size than they want. Here the shares divide exactly; in general the fractions are rounded down and the leftover shares are handed out by rules that differ between markets.

#### The opening auction

For each candidate price the program adds up the buyers willing to pay at least that much and the sellers willing to accept at most that much; the tradable volume is the smaller of the two. 10.04 and 10.05 both trade 1,200 shares with 200 extra shares wanted by buyers. With buyers left over, a common tie-break picks the higher price, so the market opens at 10.05. Everyone trades at that one price: the buyer who bid 10.10 pays 10.05, and the seller who asked 9.98 receives 10.05. Buyers at exactly 10.05 are the last in line, so 200 of their 400 shares don't fill.

#### In code

Each side is a map from price to a first-in, first-out queue of orders; see the [matching engine design](#/concept/sysd.classics.stock-exchange-matching-engine) for the full structure, with order ids for cancels and $O(\log L)$ work per new price level.

#### Common mistakes

- **Assuming every market is first in, first out.** Check the rule before reasoning about queue position.
- **Forgetting that modifying an order can cost its place.** Increasing size usually sends it to the back.
- **Expecting an auction to fill every order that crosses the final price.** Orders exactly at the auction price can be left partly unfilled.

Connects to: [order books](#/concept/markets.basics.order-books), [order types](#/concept/markets.basics.order-types), [auctions](#/concept/markets.game-theory.auctions).

### questions
Q: What is price-time priority?
A: Orders at better prices trade first, and among orders at the same price the one that arrived earliest fills first. It rewards both aggressive pricing and speed.

Q: How does pro-rata matching differ from price-time, and what behavior does it encourage?
A: Pro-rata splits an incoming order among all resting orders at the best price in proportion to their size, instead of filling them in arrival order. It rewards size over speed, so traders are tempted to show more size than they want to trade.

Q: How does an opening auction choose its price?
A: It collects orders without trading, then picks the single price at which the most shares can trade, where buyers willing to pay at least that price meet sellers willing to accept at most that price. Ties are broken by rules such as the smallest leftover imbalance and closeness to a reference price.

Q: At what price does a trade happen when an aggressive order crosses a resting one?
A: At the resting order's price. A buy limit at 10.10 that meets an ask of 10.05 trades at 10.05, so the aggressive order never trades worse than its own limit.

Q: Why does queue position matter to a market maker?
A: Under price-time priority, the orders at the front of a level fill first, even on small trades. Being at the back means filling mostly when a large order sweeps the level, which is often just before the price moves away.
