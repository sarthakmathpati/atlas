---
topic: puzzles.games
name: "Game theory puzzles"
subject: puzzles
order: 4
prereqs: [puzzles.method]
---

## puzzles.games.nim-and-impartial-games
name: "Nim and impartial games"
importance: important
scope: "winning positions, XOR strategy"

### simple
In Nim, players take turns removing any number of objects from one pile, and whoever takes the last object wins. The winner is decided by a single calculation: combine the pile sizes with XOR, and if the result isn't zero, the player to move can always win. Many other take-turns games turn out to be Nim in disguise.

### interview
- A position is **losing** (P) if every move leads to a winning position, and **winning** (N) if some move leads to a losing one.
- **Nim**: the position is losing exactly when the XOR of the pile sizes is 0.
- Winning move: with total XOR $X \ne 0$, find a pile $h$ with $h \oplus X < h$ and reduce it to $h \oplus X$.
- **Sprague-Grundy**: every impartial game position has a Grundy number, the smallest non-negative integer not among its options' numbers (the mex); a sum of games has the XOR of the numbers.
- A position is losing exactly when its Grundy number is 0; a Nim pile of size $h$ has Grundy number $h$.
- **Misère Nim** (last to move loses): play as normal until your move would leave only piles of size 1, then leave an odd number of them.

### deep
#### Intuition

XOR adds bits without carries. From a position with XOR 0, any move changes one pile and so changes the XOR to something nonzero. From a nonzero XOR, look at its highest set bit; some pile has that bit set, and replacing that pile $h$ by $h \oplus X$ (smaller, because it clears that bit) makes the XOR 0. So the player facing XOR 0 can never make it 0 again, while the other player always can, and the final position (all zeros) has XOR 0. The player who keeps handing over XOR 0 takes the last object.

#### Worked example: piles of 2, 5 and 6

$2 \oplus 5 = 7$ and $7 \oplus 6 = 1$, so $X = 1 \ne 0$: the first player wins. Try each pile: $2 \oplus 1 = 3$ (bigger, not allowed), $5 \oplus 1 = 4$ (allowed), $6 \oplus 1 = 7$ (bigger). The only winning move is to take 1 from the pile of 5, leaving $2, 4, 6$, whose XOR is 0.

#### A game that isn't Nim

Add a pile from a different game: a heap where each move removes 1, 2 or 3 objects. Its Grundy numbers repeat $0, 1, 2, 3, 0, 1, 2, 3, \dots$ (size mod 4). A position made of such a heap of size 6 (Grundy number 2) and a Nim pile of size 2 (Grundy number 2) has XOR 0, so the player to move loses, even though the two parts are different games.

#### Checking by brute force

The program solves every position directly by trying all moves (no XOR involved), then compares.

```cpp
map<vector<int>, bool> memo;

bool wins(vector<int> piles) {                   // true if the player to move wins
    sort(piles.begin(), piles.end());
    if (auto it = memo.find(piles); it != memo.end()) return it->second;
    bool w = false;
    for (size_t i = 0; i < piles.size() && !w; ++i)
        for (int take = 1; take <= piles[i] && !w; ++take) {
            auto next = piles;
            next[i] -= take;
            w = !wins(next);
        }
    return memo[piles] = w;
}

int mixedMemo[13][7];                            // 0 unknown, 1 win, 2 loss

bool mixedWins(int heap, int nimPile) {          // heap: take 1-3; nim pile: take any
    int& m = mixedMemo[heap][nimPile];
    if (m) return m == 1;
    bool w = false;
    for (int t = 1; t <= 3 && t <= heap && !w; ++t) w = !mixedWins(heap - t, nimPile);
    for (int t = 1; t <= nimPile && !w; ++t) w = !mixedWins(heap, nimPile - t);
    m = w ? 1 : 2;
    return w;
}

int main() {
    int checked = 0, disagree = 0;
    for (int a = 0; a <= 7; ++a)
        for (int b = 0; b <= 7; ++b)
            for (int c = 0; c <= 7; ++c, ++checked)
                disagree += wins({a, b, c}) != ((a ^ b ^ c) != 0);
    printf("3-pile positions up to 7: %d checked, %d disagree with the XOR rule\n", checked,
           disagree);
    for (int from = 0; from < 3; ++from) {
        vector<int> p = {2, 5, 6};
        for (int take = 1; take <= p[from]; ++take) {
            auto q = p;
            q[from] -= take;
            if (!wins(q)) printf("winning move: take %d from the pile of %d\n", take, p[from]);
        }
    }
    int mismatch = 0;
    for (int h = 0; h <= 12; ++h)
        for (int n = 0; n <= 6; ++n) mismatch += mixedWins(h, n) != ((h % 4) != n);
    printf("heap of 6 with a nim pile of 2: mover %s; Grundy rule mismatches: %d\n",
           mixedWins(6, 2) ? "wins" : "loses", mismatch);
}
```

Output:

```text
3-pile positions up to 7: 512 checked, 0 disagree with the XOR rule
winning move: take 1 from the pile of 5
heap of 6 with a nim pile of 2: mover loses; Grundy rule mismatches: 0
```

The exhaustive search agrees with the XOR rule on all 512 positions, finds the single winning move from 2, 5, 6, and confirms the Sprague-Grundy prediction for the mixed game on every size tried.

#### Common mistakes

- **Adding pile sizes** instead of XORing them.
- **Reducing the wrong pile**: only piles with the top bit of $X$ set can be reduced to $h \oplus X$.
- **Using Nim strategy for misère play to the end**: the last few moves differ.

Connects to: [XOR tricks](#/concept/dsa.bits.xor-tricks), [game DP](#/concept/dsa.dp-intervals.game-dp), [take-away games](#/concept/puzzles.games.take-away-games), [zero-sum games](#/concept/markets.game-theory.zero-sum-games-and-mixed-strategies). Practice: [Nim with 3, 4 and 5](#/problems/q-nim).

### questions
Q: How do you decide who wins a game of Nim?
A: XOR the pile sizes. If the result is 0, the player to move loses with best play; otherwise they win by moving to a position with XOR 0.

Q: How do you find the winning move in Nim?
A: Compute the total XOR X, find a pile h for which h XOR X is smaller than h, and reduce that pile to h XOR X. The new total XOR is 0.

Q: What does the Sprague-Grundy theorem say?
A: Every position of an impartial game is equivalent to a Nim pile whose size is its Grundy number, the smallest non-negative integer not reached by any move. A sum of independent games is won or lost according to the XOR of their Grundy numbers.

Q: How does misère Nim differ from normal Nim?
A: Play the same XOR strategy until a move would leave only piles of size 1; then leave an odd number of such piles, so the opponent is forced to take the last object.

## puzzles.games.take-away-games
name: "Take-away games"
importance: important
scope: "finding the pattern of losing positions"

### simple
In a take-away game, players remove a few objects from a single pile under fixed rules, like "take 1 or 4", and whoever takes the last one wins. Mark the losing positions from zero upward, and a repeating pattern quickly appears. Then you win by always leaving your opponent a losing position.

### interview
- Position 0 is losing (no move). A position is winning if some allowed move reaches a losing one, otherwise losing.
- Fill the table from 0 upward; with a finite set of allowed moves, the win/lose pattern eventually repeats.
- **Take 1 to $k$**: the losing positions are the multiples of $k + 1$.
- **Take 1 or 4**: losing positions are those $\equiv 0$ or $2 \pmod 5$.
- Prove a guessed period by induction: from every losing position all moves reach winning ones, and from every winning one some move reaches a losing one.
- Variants: last-to-move loses (misère), moves that depend on the previous move (Fibonacci nim), two piles (Wythoff).

### deep
#### Intuition

The only facts you need are the definitions: a position is losing when every move leads to a winning position. Starting from 0, each position's status depends only on a few smaller ones, so a table fills itself in. Once a window as long as the largest move repeats, the whole pattern repeats forever.

#### Worked example: take 1 or 4

| position | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| status | L | W | L | W | W | L | W | L | W | W | L |

Position 2 is losing because its only move reaches 1, a winning position; position 5 because it reaches 4 or 1, both winning. The pattern L, W, L, W, W repeats with period 5, so the losing positions are those $\equiv 0$ or $2 \pmod 5$.

**Proof of the pattern**: from a position $\equiv 0$ or $2$, taking 1 or 4 lands on $\equiv 4, 1$ or $3, 3$, never on 0 or 2. From $\equiv 1$ take 1 (to 0), from $\equiv 3$ take 1 (to 2), from $\equiv 4$ take 4 (to 0).

*A pile of 48: what should the first player do?* $48 \equiv 3 \pmod 5$, a winning position: take 1, leaving 47 $\equiv 2$.

#### Checking by computation

```cpp
string pattern(const vector<int>& moves, int upTo) {
    vector<bool> win(upTo + 1, false);
    for (int n = 1; n <= upTo; ++n)
        for (int m : moves)
            if (m <= n && !win[n - m]) win[n] = true;
    string s;
    for (int n = 0; n <= upTo; ++n) s += win[n] ? 'W' : 'L';
    return s;
}

int main() {
    string s = pattern({1, 4}, 200);
    bool periodic = true;
    for (int n = 5; n <= 200; ++n) periodic = periodic && s[n] == s[n - 5];
    printf("take 1 or 4, positions 0-19: %s; period 5 holds to 200: %s\n",
           s.substr(0, 20).c_str(), periodic ? "yes" : "no");
    printf("pile of 48 is %c; after taking 1, 47 is %c\n", s[48], s[47]);
    printf("take 2 or 5, positions 0-20: %s\n", pattern({2, 5}, 20).c_str());
    printf("take 1 to 3, positions 0-12: %s\n", pattern({1, 2, 3}, 12).c_str());
}
```

Output:

```text
take 1 or 4, positions 0-19: LWLWWLWLWWLWLWWLWLWW; period 5 holds to 200: yes
pile of 48 is W; after taking 1, 47 is L
take 2 or 5, positions 0-20: LLWWLWWLLWWLWWLLWWLWW
take 1 to 3, positions 0-12: LWWWLWWWLWWWL
```

The table confirms the period-5 pattern for "take 1 or 4" up to 200 and the winning reply from 48. For "take 2 or 5" the pattern has period 7, not 5: the losing positions are those $\equiv 0, 1$ or $4 \pmod 7$ (a pile of 1 allows no move at all). "Take 1 to 3" gives the multiples of 4. The period is not always the largest move plus one, which is why you compute before guessing.

#### Common mistakes

- **Guessing a period from too few terms**: check at least a few full periods, then prove it.
- **Forgetting positions with no legal move**: with "take 2 or 5", a pile of 1 is a loss for the mover.
- **Mixing win conditions**: if the player who takes the last object *loses*, recompute the table from the new rule.

Connects to: [Nim and impartial games](#/concept/puzzles.games.nim-and-impartial-games), [game DP](#/concept/dsa.dp-intervals.game-dp), [induction](#/concept/math.proofs.induction). Practice: [Take 1 to 3 from 21](#/problems/q-twenty-one) and [Take 1, 3 or 4](#/problems/q-take-134).

### questions
Q: How do you find the losing positions of a take-away game?
A: Position 0 is losing. Go upward: a position is winning if some allowed move reaches a losing position, and losing otherwise. The pattern repeats after a while, and you prove the period by checking the moves from each residue.

Q: In the game "take 1 to k", which positions are losing?
A: The multiples of k + 1. From a multiple of k + 1, every move leaves a non-multiple; from anything else you can take the remainder and leave a multiple.

Q: With the moves "take 1 or 4", who wins from a pile of 48, and how?
A: The first player. Losing positions are those that leave remainder 0 or 2 when divided by 5, and 48 leaves 3, so take 1 to leave 47, which leaves remainder 2.

Q: Why must the win/lose pattern of a subtraction game eventually repeat?
A: Each position's status depends only on the statuses of the previous m positions, where m is the largest allowed move. There are finitely many such windows, so one repeats, and from then on the sequence repeats too.

## puzzles.games.bidding-and-auction-puzzles
name: "Bidding and auction puzzles"
importance: important
scope: "Bidding and auction puzzles"

### simple
Bidding puzzles ask how much to offer when you know less than the other side, or when others are bidding against you. The trap is forgetting what winning tells you: if your offer is accepted, it is often because the thing was worth less than you hoped. Good bids account for that bad news in advance.

### interview
- **Winner's curse**: winning means your estimate or your bid was the highest, which is itself evidence you overestimated. Condition on winning.
- **Buying from an informed seller**: a seller who knows the value $V$ accepts a bid $b$ only if $V \le b$, so your expected value is $E[\text{your value} \mid V \le b]$, not $E[\text{your value}]$.
- **Second-price (Vickrey) auction**: bidding your true value is a dominant strategy.
- **First-price auction** with $n$ bidders and values uniform on $[0, 1]$: the equilibrium bid is $\frac{n-1}{n}v$ (bid shading).
- Revenue equivalence: under standard assumptions, first- and second-price auctions give the seller the same expected revenue.
- **Dollar auction** (both top bidders pay): escalation traps players; the lesson is to decide your limit before starting.

### deep
#### Intuition

Your bid matters only in the cases where it wins. So the right question is never "what is this worth on average" but "what is it worth on average in the cases where my bid is accepted". Against a seller who knows the value, those are exactly the cases where the value is low.

#### Worked example 1: buying from someone who knows

*A company is worth $V$ to its owner, uniform between 0 and 60. In your hands it would be worth $1.4V$. The owner knows $V$ and accepts your one bid $b$ if $b \ge V$. What should you bid?*

If you bid $b \le 60$, the owner accepts when $V \le b$, which happens with probability $\frac{b}{60}$, and given acceptance $V$ is uniform on $[0, b]$, so your expected value is $1.4 \cdot \frac{b}{2} = 0.7b$. You pay $b$:

$$E[\text{profit}] = \frac{b}{60}(0.7b - b) = -\frac{b^2}{200}.$$

Every positive bid loses money on average: **bid nothing**, even though the company is worth 40% more to you. With a multiplier $m$ instead of 1.4, the profit is $\frac{b^2}{60}\left(\frac{m}{2} - 1\right)$, positive only when $m > 2$.

#### Worked example 2: shading in a first-price auction

*Three bidders have private values uniform on $[0, 1]$; the highest bid wins and pays its bid. If the other two bid $\frac{2}{3}$ of their values, what should you bid with value $v$?* You win with bid $b \le \frac{2}{3}$ when both others bid less, probability $\left(\frac{3b}{2}\right)^2$, so your expected profit is $(v - b)\frac{9b^2}{4}$. Its derivative is zero at $b = \frac{2v}{3}$: bidding $\frac{2}{3}$ of your value is a best response, so it is an equilibrium.

#### Checking numerically

```cpp
mt19937_64 rng(2026);
double unif() { return (rng() >> 11) * 0x1.0p-53; }

int main() {
    for (double b : {10.0, 30.0, 60.0}) {
        const int n = 1'000'000;
        double sum = 0, sq = 0;
        for (int i = 0; i < n; ++i) {
            double v = 60 * unif(), profit = v <= b ? 1.4 * v - b : 0;
            sum += profit, sq += profit * profit;
        }
        double mean = sum / n, se = sqrt((sq / n - mean * mean) / n);
        printf("bid %2.0f: simulated profit %+.3f, exact %+.3f (%.1f SE)\n", b, mean,
               -b * b / 200, fabs(mean + b * b / 200) / se);
    }
    for (double v : {0.3, 0.6, 0.9}) {           // best response when others bid 2/3 of value
        double best = 0, bestB = 0;
        for (double b = 0; b <= 2.0 / 3; b += 1e-5) {
            double win = pow(min(1.0, 1.5 * b), 2), profit = (v - b) * win;
            if (profit > best) best = profit, bestB = b;
        }
        printf("value %.1f: best bid %.4f (2v/3 = %.4f), expected profit %.4f\n", v, bestB,
               2 * v / 3, best);
    }
}
```

Output:

```text
bid 10: simulated profit -0.500, exact -0.500 (0.2 SE)
bid 30: simulated profit -4.493, exact -4.500 (0.7 SE)
bid 60: simulated profit -18.015, exact -18.000 (0.6 SE)
value 0.3: best bid 0.2000 (2v/3 = 0.2000), expected profit 0.0090
value 0.6: best bid 0.4000 (2v/3 = 0.4000), expected profit 0.0720
value 0.9: best bid 0.6000 (2v/3 = 0.6000), expected profit 0.2430
```

The simulated profits match $-\frac{b^2}{200}$ at every bid tried, and a fine grid search finds the best reply at $\frac{2}{3}$ of the value for each bidder type.

#### Common mistakes

- **Using the unconditional average value**: $E[1.4V] = 42$ tempts a bid near 40, which loses about 8 on average.
- **Bidding your value in a first-price auction**: you then never profit when you win.
- **Shading in a second-price auction**: it can lose you auctions you would have wanted and never lowers what you pay.

Connects to: [auctions](#/concept/markets.game-theory.auctions), [adverse selection](#/concept/markets.making.adverse-selection), [conditional expectation](#/concept/prob.expected-value.conditional-expectation), [Nash equilibrium](#/concept/markets.game-theory.nash-equilibrium). Practice: [Bidding in a second-price auction](#/problems/q-second-price).

### questions
Q: What is the winner's curse?
A: When several bidders estimate the same unknown value, the winner is usually the one who overestimated most, so winning is bad news about the value. Rational bidders lower their bids to allow for it.

Q: A seller knows a company's value V, uniform on 0 to 60, and accepts any bid at least V. The company would be worth 1.4V to you. What should you bid?
A: Nothing. If your bid b is accepted, V is uniform on 0 to b, so the company is worth 0.7b to you on average while you pay b; the expected profit is minus b squared over 200 for every positive bid.

Q: Why is bidding your true value optimal in a second-price auction?
A: Your bid only decides whether you win, not what you pay, which is the next-highest bid. Bidding your value wins exactly when the price is below your value, so no other bid can do better in any situation.

Q: How much should you shade your bid in a first-price auction with n bidders and uniform values?
A: In the symmetric equilibrium each bidder bids (n - 1)/n of their value. With three bidders that is two thirds, which balances a higher chance of winning against a smaller profit when you win.
