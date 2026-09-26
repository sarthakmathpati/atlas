---
topic: markets.game-theory
name: "Game theory for trading"
subject: markets
order: 6
prereqs: [puzzles.games]
---

## markets.game-theory.nash-equilibrium
name: "Nash equilibrium"
importance: important
scope: "definition and simple games"

### simple
A Nash equilibrium is a situation in a game where nobody can do better by changing only their own choice, given what everyone else is doing. It is a resting point, not necessarily a good outcome: players can be stuck in an equilibrium that all of them dislike. It is like drivers all keeping to the same side of the road: nobody wants to be the only one who switches.

### interview
- A strategy profile is a **Nash equilibrium** if every player's strategy is a best response to the others'. Check it by asking, for each player: "would switching alone help?"
- Find pure equilibria by marking each player's best responses in the payoff table; cells where both are best responses are equilibria.
- A game can have one, several or no pure equilibria. Every finite game has at least one equilibrium once **mixed** (randomized) strategies are allowed.
- In a mixed equilibrium each player randomizes so that the **other** is indifferent between the strategies they use.
- **Prisoner's dilemma**: the only equilibrium is worse for both players than cooperating. **Coordination games** have several equilibria, so expectations decide.
- A **dominant strategy** is best whatever the others do; if each player has one, that profile is the equilibrium.

### deep
#### Intuition

An equilibrium is a set of choices that confirm themselves: if everyone expects it, nobody has a reason to deviate, so the expectation is borne out. It says nothing about fairness or efficiency, only stability.

#### Worked example: three small games

Made-up payoffs, written (row player, column player):

- **Pricing**: two shops price high or low. Both high: 5 each; one low undercuts the other: 7 against 1; both low: 3 each.
- **Meeting**: two traders pick venue A or B and gain only if they meet: 2 each at A, 1 each at B, 0 if apart.
- **Matching**: one wins 1 if the coins match, the other wins 1 if they don't.

The program checks every cell for profitable deviations, then solves for the mixed equilibrium of each 2 × 2 game with the indifference conditions: the column player's probability $q$ of strategy 0 must make the row player indifferent, $q a_{00} + (1 - q) a_{01} = q a_{10} + (1 - q) a_{11}$, and symmetrically for the row player's $p$.

```cpp
// Two-player games with made-up payoffs: pay[i][j] = {row player's, column player's}.
struct Game { const char* name; vector<vector<pair<double, double>>> pay; };

void solve(const Game& g) {
    printf("%s: pure equilibria", g.name);
    int found = 0;
    for (int i = 0; i < 2; ++i)
        for (int j = 0; j < 2; ++j) {
            // An equilibrium: neither player gains by switching alone.
            bool rowBest = g.pay[i][j].first >= g.pay[1 - i][j].first;
            bool colBest = g.pay[i][j].second >= g.pay[i][1 - j].second;
            if (rowBest && colBest) printf(" (%d, %d)", i, j), ++found;
        }
    printf("%s\n", found ? "" : " none");
    // Mixed: q (column plays 0) makes the row player indifferent, p (row plays 0) the column.
    auto a = [&](int i, int j) { return g.pay[i][j].first; };
    auto b = [&](int i, int j) { return g.pay[i][j].second; };
    double q = (a(1, 1) - a(0, 1)) / (a(0, 0) - a(0, 1) - a(1, 0) + a(1, 1));
    double p = (b(1, 1) - b(1, 0)) / (b(0, 0) - b(1, 0) - b(0, 1) + b(1, 1));
    if (!(p > 0 && p < 1 && q > 0 && q < 1)) {  // also catches 0/0 and x/0
        printf("  no fully mixed equilibrium: some strategy is always at least as good\n");
        return;
    }
    double rowGets = q * a(0, 0) + (1 - q) * a(0, 1), colGets = p * b(0, 0) + (1 - p) * b(1, 0);
    printf("  mixed: row plays 0 with %.4f, column with %.4f; payoffs %.4f and %.4f\n", p, q,
           rowGets, colGets);
}

int main() {
    solve({"pricing (0 = high, 1 = low)", {{{5, 5}, {1, 7}}, {{7, 1}, {3, 3}}}});
    solve({"meeting (0 = venue A, 1 = venue B)", {{{2, 2}, {0, 0}}, {{0, 0}, {1, 1}}}});
    solve({"matching (0 = heads, 1 = tails)", {{{1, -1}, {-1, 1}}, {{-1, 1}, {1, -1}}}});
}
```

Output:

```text
pricing (0 = high, 1 = low): pure equilibria (1, 1)
  no fully mixed equilibrium: some strategy is always at least as good
meeting (0 = venue A, 1 = venue B): pure equilibria (0, 0) (1, 1)
  mixed: row plays 0 with 0.3333, column with 0.3333; payoffs 0.6667 and 0.6667
matching (0 = heads, 1 = tails): pure equilibria none
  mixed: row plays 0 with 0.5000, column with 0.5000; payoffs 0.0000 and 0.0000
```

#### Reading the results

- **Pricing** is a prisoner's dilemma: low is better for each shop whatever the other does (7 > 5 and 3 > 1), so both price low and earn 3, although both pricing high would give 5. No mixing happens, because a dominant strategy is never worth randomizing away from.
- **Meeting** has two pure equilibria, (A, A) and (B, B), and a mixed one where each goes to A with probability 1/3. The mixed one pays only 2/3 each, worse than either pure one: miscoordination is costly, which is why conventions and signals matter.
- **Matching** has no pure equilibrium (whoever loses always wants to switch); the only equilibrium is 50/50 for both, worth 0.

#### Common mistakes

- **Choosing your own mix to maximize your payoff directly.** In equilibrium your mix is set to make the *opponent* indifferent.
- **Calling the best joint outcome the equilibrium.** (high, high) is better for both shops but not stable.
- **Stopping at the first equilibrium.** Coordination games have several; say which is more plausible and why.

Connects to: [zero-sum games and mixed strategies](#/concept/markets.game-theory.zero-sum-games-and-mixed-strategies), [auctions](#/concept/markets.game-theory.auctions), [pirates and backward induction](#/concept/puzzles.logic.pirates-and-backward-induction), [bidding and auction puzzles](#/concept/puzzles.games.bidding-and-auction-puzzles).

### questions
Q: What is a Nash equilibrium?
A: A choice of strategy for every player such that no player can gain by changing only their own strategy while the others keep theirs. Each strategy is a best response to the rest.

Q: Why do both players in the prisoner's dilemma end up worse off?
A: Defecting is better for each player whatever the other does, so both defect. The resulting equilibrium pays each less than mutual cooperation, which is not stable because each would then gain by defecting.

Q: How do you find a mixed-strategy equilibrium in a two-by-two game?
A: Choose each player's probabilities so that the other player is indifferent between their two strategies, and check the probabilities are between 0 and 1. If one strategy is always at least as good, there is no fully mixed equilibrium.

Q: Can a game have more than one Nash equilibrium?
A: Yes. A coordination game where two players gain only by choosing the same option has an equilibrium for each shared choice, plus a mixed one in which they often miss each other.

Q: Does every game have a Nash equilibrium?
A: Every finite game has at least one once mixed strategies are allowed, which is Nash's theorem. Some games, such as matching pennies, have none in pure strategies.

## markets.game-theory.zero-sum-games-and-mixed-strategies
name: "Zero-sum games and mixed strategies"
importance: important
prereqs: [markets.game-theory.nash-equilibrium]
scope: "Zero-sum games and mixed strategies"

### simple
In a zero-sum game one player's gain is exactly the other's loss, like a bet between two people. If either player is predictable, the other can exploit it, so the best play is often to randomize in carefully chosen proportions. The right mix makes your opponent's choice irrelevant: whatever they do, they can't do better against you than the game's value.

### interview
- A zero-sum game is one payoff matrix $A$: the row player gets $a_{ij}$, the column player $-a_{ij}$.
- **Minimax theorem** (von Neumann): $\max_x \min_y x^\top A y = \min_y \max_x x^\top A y$, the **value** of the game. Optimal mixes guarantee it against any opponent.
- A **saddle point** (an entry that is the minimum of its row and the maximum of its column) means pure strategies are optimal.
- Otherwise use indifference: the optimal mix makes every strategy the opponent uses equally good for them. Strategies outside the support pay the opponent less.
- For 2 × n games, plot the row player's payoff against each column as a line in $p$ and take the highest point of the lowest envelope.
- Symmetric games ($A = -A^\top$) have value 0. Larger games are solved by linear programming; fictitious play also converges to the value.

### deep
#### Intuition

In a zero-sum game you should assume the opponent will find your weakness. A mixed strategy removes weaknesses by making you unpredictable in exactly the proportions that leave every reply equally good for them, so knowing your mix doesn't help them.

#### Worked example: rock, paper, scissors with a bonus

Change the usual game so that winning with rock pays 2 (paper and scissors wins still pay 1). Against a mix $(r, p, s)$, rock pays $-p + 2s$, paper $r - s$, scissors $-2r + p$. The game is symmetric, so its value is 0; setting all three to 0 gives $p = 2r$ and $s = r$, so the optimal mix is $\left(\frac{1}{4}, \frac{1}{2}, \frac{1}{4}\right)$. The bonus for rock makes paper, rock's counter, the most frequent choice, while rock stays at 1/4.

The program checks the indifference, runs a million rounds of fictitious play (each player best-responds to the other's history), and solves a 2 × 3 game by the lower envelope: the row player mixes $p$ on row $(5, 1, 3)$ and $1 - p$ on row $(1, 4, 2)$.

```cpp
// Rock, paper, scissors where a win with rock pays 2. Row player's payoffs (the column gets minus).
const double A[3][3] = {{0, -1, 2}, {1, 0, -1}, {-2, 1, 0}};  // rows and columns: R, P, S

int main() {
    // Indifference: against (r, p, s), rock pays -p + 2s, paper r - s, scissors -2r + p.
    // Setting all three equal (to the value 0) gives p = 2r and s = r.
    double mix[3] = {0.25, 0.5, 0.25};
    for (int i = 0; i < 3; ++i) {
        double pay = 0;
        for (int j = 0; j < 3; ++j) pay += A[i][j] * mix[j];
        printf("%c against the mix pays %+.4f\n", "RPS"[i], pay);
    }

    // Fictitious play: each round, both players best-respond to the other's past frequencies.
    double countRow[3] = {1, 0, 0}, countCol[3] = {1, 0, 0};
    const int rounds = 1'000'000;
    for (int t = 1; t < rounds; ++t) {
        int bestRow = 0, bestCol = 0;
        double rowPay[3] = {}, colPay[3] = {};
        for (int i = 0; i < 3; ++i)
            for (int j = 0; j < 3; ++j) {
                rowPay[i] += A[i][j] * countCol[j];
                colPay[j] -= A[i][j] * countRow[i];
            }
        for (int k = 1; k < 3; ++k) {
            if (rowPay[k] > rowPay[bestRow]) bestRow = k;
            if (colPay[k] > colPay[bestCol]) bestCol = k;
        }
        ++countRow[bestRow], ++countCol[bestCol];
    }
    printf("fictitious play after %d rounds: R %.4f, P %.4f, S %.4f\n", rounds,
           countRow[0] / rounds, countRow[1] / rounds, countRow[2] / rounds);

    // A 2 x 3 game: the row player mixes p on row 0; each column gives a line in p.
    // Maximize the lowest line; check every crossing point and both ends.
    const double B[2][3] = {{5, 1, 3}, {1, 4, 2}};
    auto worst = [&](double p) {
        double m = 1e9;
        for (int j = 0; j < 3; ++j) m = min(m, p * B[0][j] + (1 - p) * B[1][j]);
        return m;
    };
    vector<double> candidates = {0, 1};
    for (int j = 0; j < 3; ++j)
        for (int k = j + 1; k < 3; ++k) {
            double slopeJ = B[0][j] - B[1][j], slopeK = B[0][k] - B[1][k];
            if (slopeJ != slopeK) candidates.push_back((B[1][k] - B[1][j]) / (slopeJ - slopeK));
        }
    double bestP = 0;
    for (double p : candidates)
        if (p >= 0 && p <= 1 && worst(p) > worst(bestP)) bestP = p;
    printf("2 x 3 game: row plays row 0 with %.4f, value %.4f\n", bestP, worst(bestP));
    double y[3] = {0, 0.25, 0.75};  // the column player's answer: columns 1 and 2 only
    for (int i = 0; i < 2; ++i)
        printf("column mix (0, 1/4, 3/4) against row %d: %.4f\n", i,
               y[0] * B[i][0] + y[1] * B[i][1] + y[2] * B[i][2]);
}
```

Output:

```text
R against the mix pays +0.0000
P against the mix pays +0.0000
S against the mix pays +0.0000
fictitious play after 1000000 rounds: R 0.2503, P 0.5002, S 0.2496
2 x 3 game: row plays row 0 with 0.5000, value 2.5000
column mix (0, 1/4, 3/4) against row 0: 2.5000
column mix (0, 1/4, 3/4) against row 1: 2.5000
```

#### Reading the results

- **Every pure strategy pays exactly 0** against the mix, so no reply can exploit it.
- **Fictitious play converges** to $(0.2503, 0.5002, 0.2496)$, within 0.0004 of the exact mix, without anyone solving an equation.
- **The 2 × 3 game**: against column 0 the row player gets $1 + 4p$, against column 1 $4 - 3p$, against column 2 $2 + p$. The lowest of the three is highest where columns 1 and 2 cross, at $p = \frac{1}{2}$, value 2.5. The column player uses only those two columns, with $\frac{1}{4}$ and $\frac{3}{4}$, which holds both rows to exactly 2.5. Column 0 is never used: it would pay the row player 3 at $p = \frac{1}{2}$.

#### Common mistakes

- **Playing your own best-looking strategy more often.** The mix depends on the opponent's payoffs, as the rock bonus shows.
- **Forgetting to check for a saddle point.** If one exists, don't randomize.
- **Assuming the support includes every strategy.** Check that unused strategies do no better than the value.

Connects to: [Nash equilibrium](#/concept/markets.game-theory.nash-equilibrium), [Nim and impartial games](#/concept/puzzles.games.nim-and-impartial-games), [linearity of expectation](#/concept/prob.random-variables.linearity-of-expectation), [making a market](#/concept/markets.making.making-a-market). Practice: [Value of a small game](#/problems/q-zero-sum-value).

### questions
Q: What does the minimax theorem say?
A: In a finite two-player zero-sum game, the best payoff the row player can guarantee equals the least payoff the column player can hold them to, once mixed strategies are allowed. That common number is the value of the game.

Q: How do you find optimal mixed strategies in a small zero-sum game?
A: First look for a saddle point. If there is none, choose each player's mix so the opponent is indifferent between the strategies they use, solve the linear equations, and check that unused strategies do no better.

Q: In rock, paper, scissors where a rock win pays 2, how often should you play rock?
A: One quarter of the time, with paper one half and scissors one quarter. The bonus for rock makes paper, which beats rock, the most frequent choice; every pure strategy then earns zero against the mix.

Q: What is a saddle point in a payoff matrix?
A: An entry that is the smallest in its row and the largest in its column. The row player can guarantee it and the column player can hold the row player to it, so pure strategies are optimal and the entry is the value.

Q: Why does mixing help in a zero-sum game?
A: Any predictable pure strategy can be exploited by the right reply. The optimal mix makes every reply equally good for the opponent, so even knowing your probabilities doesn't let them do better than the value.

## markets.game-theory.auctions
name: "Auctions"
importance: important
scope: "first-price, second-price, winner's curse"

### simple
An auction sells something to the highest bidder, but the rules for what the winner pays change how people should bid. In a second-price auction you should bid what the item is worth to you; in a first-price auction you should bid less, because you pay your own bid. When the item is worth the same to everyone but nobody knows exactly how much, winning is a warning that you were probably the most optimistic.

### interview
- **Formats**: English (ascending, open), Dutch (descending), sealed first-price (pay your bid), sealed second-price or Vickrey (pay the second-highest bid).
- **Second-price**: bidding your true value is a dominant strategy; your bid decides whether you win, not what you pay. The English auction works the same way.
- **First-price**: shade your bid below your value. With $n$ bidders and values uniform on $[0, 1]$ the equilibrium bid is $\frac{n-1}{n}v$.
- **Revenue equivalence**: with independent private values and symmetric bidders, standard formats give the same expected revenue: $\frac{n-1}{n+1}$ for uniform values.
- **Winner's curse**: with a common value and noisy estimates, the winner is the one with the highest estimate, which is biased upward. Bid below your estimate by the expected overestimate of the winner.
- Trading parallels: filling a large order is like winning an auction for it, so the same adverse selection logic applies.

### deep
#### Intuition

In a private-value auction everyone knows what the item is worth to them; the only question is strategy. In a common-value auction, such as buying a block of shares or a lease whose worth is the same for everyone, each bidder has only an estimate, and winning means your estimate was the highest of several. That is good news about your position in the auction and bad news about the item.

#### Worked example

First, 4 bidders with private values uniform on $[0, 1]$: the first-price auction with equilibrium bids $\frac{3}{4}v$ against the second-price auction with truthful bids, a million auctions each. Second, a common value $V$, uniform on $[20, 80]$, where each of 5 bidders sees $V$ plus noise uniform on $[-10, 10]$ and bids in a first-price auction.

```cpp
mt19937_64 rng(2026);
double uniform() { return (rng() >> 11) * 0x1.0p-53; }

int main() {
    // Private values: 4 bidders, values uniform on [0, 1].
    const int n = 4, auctions = 1'000'000;
    double first = 0, firstSq = 0, second = 0, secondSq = 0;
    for (int a = 0; a < auctions; ++a) {
        double top = 0, next = 0;
        for (int i = 0; i < n; ++i) {
            double v = uniform();
            if (v > top) next = top, top = v;
            else if (v > next) next = v;
        }
        double payFirst = (n - 1.0) / n * top;  // equilibrium bid (n-1)/n of value; top wins
        double paySecond = next;                // truthful bids; the winner pays the second
        first += payFirst, firstSq += payFirst * payFirst;
        second += paySecond, secondSq += paySecond * paySecond;
    }
    double exact = (n - 1.0) / (n + 1);
    for (auto [name, sum, sq] :
         {tuple{"first-price", first, firstSq}, {"second-price", second, secondSq}}) {
        double mean = sum / auctions, se = sqrt((sq / auctions - mean * mean) / auctions);
        printf("%s revenue %.4f (exact %.4f, %+.2f SE)\n", name, mean, exact, (mean - exact) / se);
    }

    // Common value: worth V (uniform on [20, 80]) to everyone; each of 5 bidders sees V plus
    // noise uniform on [-10, 10]. Bidding your own estimate in a first-price auction:
    const int bidders = 5;
    double naive = 0, naiveSq = 0, shaded = 0, shade = 10.0 * (bidders - 1) / (bidders + 1);
    for (int a = 0; a < auctions; ++a) {
        double value = 20 + 60 * uniform(), best = -1e9;
        for (int i = 0; i < bidders; ++i) best = max(best, value - 10 + 20 * uniform());
        naive += value - best, naiveSq += (value - best) * (value - best);
        shaded += value - (best - shade);
    }
    double mean = naive / auctions, se = sqrt((naiveSq / auctions - mean * mean) / auctions);
    printf("winner bidding its estimate: profit %.4f (exact %.4f, %+.2f SE)\n", mean, -shade,
           (mean + shade) / se);
    printf("bidding the estimate minus %.4f: profit %.4f\n", shade, shaded / auctions);
}
```

Output:

```text
first-price revenue 0.5999 (exact 0.6000, -0.54 SE)
second-price revenue 0.6001 (exact 0.6000, +0.29 SE)
winner bidding its estimate: profit -6.6644 (exact -6.6667, +0.81 SE)
bidding the estimate minus 6.6667: profit 0.0023
```

#### Reading the results

- **Revenue equivalence**: both formats raise 0.6 on average, $\frac{n-1}{n+1}$ for $n = 4$; the runs are within 0.6 standard errors. In the first-price auction the winner pays $\frac{3}{4}$ of the highest value, whose average is $\frac{4}{5}$; in the second-price auction the winner pays the second-highest value, whose average is also $\frac{3}{5}$.
- **The winner's curse**: a bidder who bids its own estimate loses 6.67 per win on average, because the winning estimate is $V$ plus the largest of 5 noises, and the largest of 5 uniforms on $[-10, 10]$ averages $10 \cdot \frac{5-1}{5+1} = 6.67$. The run is 0.81 standard errors from that.
- **The fix**: shading every estimate by 6.67 brings the winner's average profit to about zero. The right shade grows with the number of bidders and the noise: more rivals mean a more extreme winning estimate.

#### Why truthful bidding wins in a second-price auction

Compare bidding your value $v$ with bidding $b > v$: they differ only when the highest other bid lands between $v$ and $b$, and then the higher bid wins and pays more than $v$, a loss. Bidding $b < v$ differs only when the highest other bid is between $b$ and $v$, and then the lower bid gives up a profitable win. So truthful bidding is never worse.

#### Common mistakes

- **Bidding your value in a first-price auction**: you win only at zero profit.
- **Ignoring the winner's curse** in common-value settings: condition on winning.
- **Assuming revenue equivalence always holds**: risk-averse bidders, correlated values or asymmetric bidders break it.

Connects to: [bidding and auction puzzles](#/concept/puzzles.games.bidding-and-auction-puzzles), [adverse selection](#/concept/markets.making.adverse-selection), [order statistics](#/concept/prob.distributions.order-statistics), [how exchanges match orders](#/concept/markets.basics.how-exchanges-match-orders). Practice: [Bidding in a second-price auction](#/problems/q-second-price).

### questions
Q: Why is bidding your true value a dominant strategy in a second-price auction?
A: Your bid only decides whether you win; the price is the second-highest bid. Bidding above your value adds only wins at prices above your value, and bidding below it only gives up wins that were profitable.

Q: How should you bid in a first-price auction with private values?
A: Below your value, trading a lower chance of winning for a larger profit when you win. With n bidders and values uniform on zero to one, the equilibrium bid is (n minus 1) over n times your value.

Q: What is revenue equivalence?
A: Under independent private values, risk-neutral symmetric bidders and a few other conditions, standard auction formats give the seller the same expected revenue. With uniform values and n bidders it is (n minus 1) over (n plus 1).

Q: What is the winner's curse?
A: In a common-value auction, the winner is the bidder with the highest estimate, which is likely to be an overestimate. Bidding your unbiased estimate therefore loses money on average when you win; you must bid less, and more so with more bidders.

Q: How does the winner's curse show up in trading?
A: A resting order is filled when someone chooses to trade with it, often because they know it is mispriced, just as winning an auction signals you overestimated. Market makers widen and move quotes to account for it.
