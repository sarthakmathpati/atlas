---
topic: puzzles.logic
name: "Logic and strategy puzzles"
subject: puzzles
order: 2
prereqs: [puzzles.method]
---

## puzzles.logic.weighing-puzzles
name: "Weighing puzzles"
importance: must
scope: "finding the odd coin with a balance"

### simple
A balance scale can do three things: tip left, tip right or stay level. So each weighing splits the possibilities into three groups, and a good plan makes those groups as equal as possible. That idea, counting outcomes, tells you both the best strategy and why you can't do better.

### interview
- **Information bound**: $k$ weighings have at most $3^k$ outcome sequences, so they can tell apart at most $3^k$ possibilities.
- Known heavier fake: up to $3^k$ coins; split into three equal groups, weigh two, and recurse on the heavy or the idle group.
- Fake heavier *or* lighter, and you must say which: $2n$ possibilities, and the best possible is $\frac{3^k - 3}{2}$ coins, or $\frac{3^k - 1}{2}$ with one extra coin known to be genuine.
- Design each weighing so the three outcomes leave roughly equal numbers of possibilities.
- Coins cleared by a balanced weighing become known-genuine and are useful as padding later.
- A digital scale gives far more than 3 outcomes: one weighing of $1, 2, \dots, 10$ coins from 10 bags finds the bag of light coins.

### deep
#### Intuition

Think of the possibilities as cards: "coin 3 is heavy", "coin 7 is light", and so on. A weighing sorts the cards into three piles by the outcome it would produce. After $k$ weighings each pile must hold at most one card, so you can't handle more than $3^k$ cards, and a weighing that leaves one pile much larger than a third wastes information.

#### Worked example: four coins and one genuine coin

*Four coins look alike, and one is a fake that is either heavier or lighter. You also have one coin you know is genuine. Can two weighings find the fake and say whether it is heavy or light?*

There are 8 possibilities and 9 outcome pairs, so the bound allows it. A plan:

1. Weigh coins 1 and 2 against coin 3 and the genuine coin.
2. **Level**: coin 4 is fake; weigh it against the genuine coin to see whether it is heavy or light.
3. **Left side heavy**: coin 1 heavy, coin 2 heavy or coin 3 light. Weigh 1 against 2: the heavier one is the fake (and heavy); if level, coin 3 is light.
4. **Left side light**: the mirror image: 1 light, 2 light or 3 heavy; weigh 1 against 2 again.

Without the genuine coin it fails: one coin against one, or two against two, always leaves some branch with more than 3 possibilities. Five coins fail even with it, since 10 possibilities exceed 9 outcomes.

#### Checking by exhaustive search

The program tries every plan. A state needs only counts: coins that could be heavy or light, only heavy, only light, and known-genuine coins for evening out the pans.

```cpp
map<array<int, 6>, bool> memo;
int pow3(int k) { return k ? 3 * pow3(k - 1) : 1; }

// u: heavy or light, h: only heavy, l: only light, g: known genuine; k weighings left.
bool solvable(int u, int h, int l, int g, int k, int needDir) {
    if (2 * u + h + l <= 1 || (!needDir && u + h + l <= 1)) return true;
    if (k == 0 || (needDir ? 2 * u + h + l : u + h + l) > pow3(k)) return false;
    array<int, 6> key{u, h, l, min(g, 60), k, needDir};
    if (auto it = memo.find(key); it != memo.end()) return it->second;
    bool ok = false;
    int all = u + h + l;
    for (int uL = 0; uL <= u && !ok; ++uL)
        for (int uR = 0; uL + uR <= u && !ok; ++uR)
            for (int hL = 0; hL <= h && !ok; ++hL)
                for (int hR = 0; hL + hR <= h && !ok; ++hR)
                    for (int lL = 0; lL <= l && !ok; ++lL)
                        for (int lR = 0; lL + lR <= l && !ok; ++lR) {
                            int left = uL + hL + lL, right = uR + hR + lR;
                            if (left + right == 0 || abs(left - right) > g) continue;
                            int tipL = uL + hL + uR + lR, tipR = uR + hR + uL + lL;
                            ok = solvable(0, uL + hL, uR + lR, g + all - tipL, k - 1, needDir) &&
                                 solvable(0, uR + hR, uL + lL, g + all - tipR, k - 1, needDir) &&
                                 solvable(u - uL - uR, h - hL - hR, l - lL - lR,
                                          g + left + right, k - 1, needDir);
                        }
    return memo[key] = ok;
}

int main() {
    printf("4 coins + genuine, 2 weighings: %s\n", solvable(4, 0, 0, 1, 2, 1) ? "yes" : "no");
    printf("4 coins alone, 2 weighings: %s\n", solvable(4, 0, 0, 0, 2, 1) ? "yes" : "no");
    printf("5 coins + genuine, 2 weighings: %s\n", solvable(5, 0, 0, 1, 2, 1) ? "yes" : "no");
    for (int k : {2, 4}) {
        auto most = [&](auto ok) {
            int best = 0;
            for (int n = 1; n <= pow3(k); ++n) best = ok(n) ? n : best;
            return best;
        };
        int heavy = most([&](int n) { return solvable(0, n, 0, 0, k, 1); });
        int either = most([&](int n) { return solvable(n, 0, 0, 0, k, 1); });
        int withGenuine = most([&](int n) { return solvable(n, 0, 0, 1, k, 1); });
        printf("%d weighings, most coins: heavy known %d; heavy or light %d, "
               "with a genuine coin %d\n", k, heavy, either, withGenuine);
    }
}
```

Output:

```text
4 coins + genuine, 2 weighings: yes
4 coins alone, 2 weighings: no
5 coins + genuine, 2 weighings: no
2 weighings, most coins: heavy known 9; heavy or light 3, with a genuine coin 4
4 weighings, most coins: heavy known 81; heavy or light 39, with a genuine coin 40
```

The search confirms the worked example and the formulas $3^k$, $\frac{3^k - 3}{2}$ and $\frac{3^k - 1}{2}$.

#### Common mistakes

- **Halving instead of thirding**: two groups waste the "level" outcome.
- **Forgetting the direction**: "find the coin" and "find it and say heavy or light" have different limits.
- **Unequal pans**: a pan with more coins tips for the wrong reason; pad with known-genuine coins.

Connects to: [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [poisoned bottles and binary encoding](#/concept/puzzles.logic.poisoned-bottles-and-binary-encoding), [binary search](#/concept/dsa.binary-search.classic-binary-search). Practice: [Twelve coins, one fake](#/problems/q-twelve-coins) and [One heavy coin in nine](#/problems/q-nine-coins).

### questions
Q: Why do weighing puzzles involve powers of 3?
A: A balance has three outcomes, tip left, tip right or level, so k weighings give at most 3 to the k outcome sequences. That caps the number of possibilities they can tell apart, and good plans split the possibilities into thirds each time.

Q: One of n coins is heavier. How many weighings do you need?
A: The smallest k with 3 to the k at least n. Split the coins into three nearly equal groups, weigh two of them, and continue with whichever group must hold the heavy coin.

Q: Why is "heavier or lighter" harder than "known heavier"?
A: Each coin gives two possibilities, heavy or light, so n coins give 2n cases. With k weighings at most (3 to the k minus 3) over 2 coins can be handled when you must also say which, or one more with a coin known to be genuine.

Q: Ten bags hold coins, one bag holds light coins, and you have a digital scale. How few weighings suffice?
A: One. Take 1 coin from bag 1, 2 from bag 2, up to 10 from bag 10, and weigh them together. The shortfall from the expected weight, divided by the weight difference of one coin, tells you the bag.

## puzzles.logic.river-crossing-and-bridge-puzzles
name: "River crossing and bridge puzzles"
importance: must
scope: "scheduling under constraints"

### simple
Crossing puzzles move a group across a river or bridge under rules: a boat that holds two, a torch that must come back, people who can't be left alone together. Each position is a state, and each crossing is a step to another state. The shortest plan is the shortest path through those states, which you can find by careful reasoning or by a search.

### interview
- Model the puzzle as a graph: a state is who is on each side and where the boat or torch is; a crossing is an edge.
- With equal-cost crossings, breadth-first search finds the fewest crossings; with times, use Dijkstra's algorithm.
- **Bridge and torch** (group of two walks at the slower pace, the torch must return): for the two slowest, compare $t_1 + 2t_2 + t_n$ (the two fastest shuttle) with $2t_1 + t_{n-1} + t_n$ (the fastest escorts each); take the smaller and repeat.
- The first plan is better exactly when $2t_2 < t_1 + t_{n-1}$: send the two slowest together.
- The return trips are the hidden cost; the fastest people should carry the torch back.
- For "never leave X alone with Y" rules, check every intermediate state, including the moment of arrival.

### deep
#### Intuition

Every crossing puzzle is a shortest-path problem. The state space is small (a few hundred states at most), so a search always works; the interview skill is finding the short plan by reasoning and proving nothing shorter exists.

#### Worked example 1: guards and prisoners

*Three guards and three prisoners must cross a river in a boat that holds at most two people, and someone must row it back each time. Prisoners may never outnumber guards on a bank where at least one guard is present (counting whoever has just arrived). How many crossings are needed?*

The key constraint is the return trip: to make progress the boat must bring someone back, and the safe states are few. The shortest plan uses **11 crossings**. One such plan (G is a guard, P a prisoner): PP across, P back, PP across, P back, GG across, GP back, GG across, P back, PP across, P back, PP across.

#### Worked example 2: a bridge at night

*Four hikers take 2, 3, 7 and 9 minutes to cross a bridge; at most two walk together at the slower one's pace, and their one torch must accompany every crossing.* Compare the two ways to move the slowest pair (7 and 9):

- Fastest two shuttle: 2 and 3 cross (3), 2 returns (2), 7 and 9 cross (9), 3 returns (3): 17 minutes.
- Fastest escorts: 2 and 9 cross (9), 2 returns (2), 2 and 7 cross (7), 2 returns (2): 20 minutes.

Take the 17, then 2 and 3 cross (3): **20 minutes**. Here $2t_2 = 6 < t_1 + t_{n-1} = 9$. With times 1, 6, 7 and 8 the escort plan wins instead ($12 > 8$): 17 for the slow pair, then 6, for **23**.

#### Checking by search

```cpp
int fewestTrips() {                              // BFS over (guards left, prisoners left, boat)
    auto safe = [](int g, int p) { return g == 0 || g >= p; };
    map<array<int, 3>, int> dist;
    queue<array<int, 3>> q;
    q.push({3, 3, 0});
    dist[{3, 3, 0}] = 0;
    while (!q.empty()) {
        auto [g, p, b] = q.front();
        q.pop();
        if (g == 0 && p == 0) return dist[{g, p, b}];
        int s = b == 0 ? -1 : 1;                 // boat on the left: people leave the left bank
        for (int dg = 0; dg <= 2; ++dg)
            for (int dp = 0; dg + dp <= 2; ++dp) {
                int ng = g + s * dg, np = p + s * dp;
                if (dg + dp == 0 || ng < 0 || np < 0 || ng > 3 || np > 3) continue;
                if (!safe(ng, np) || !safe(3 - ng, 3 - np)) continue;
                array<int, 3> next{ng, np, 1 - b};
                if (!dist.count(next)) dist[next] = dist[{g, p, b}] + 1, q.push(next);
            }
    }
    return -1;
}

int bridge(vector<int> t) {                      // Dijkstra over (who is across, torch side)
    int n = t.size(), full = (1 << n) - 1;
    vector<int> best(2 << n, INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    pq.push({0, 0});
    best[0] = 0;
    while (!pq.empty()) {
        auto [d, s] = pq.top();
        pq.pop();
        int across = s >> 1, torch = s & 1;
        if (d > best[s]) continue;
        if (across == full) return d;
        int here = torch ? across : full ^ across;
        for (int a = 0; a < n; ++a)
            for (int b = a; b < n; ++b) {
                if (!(here >> a & 1) || !(here >> b & 1)) continue;
                int move = (1 << a) | (1 << b), ns = ((across ^ move) << 1) | (1 - torch);
                if (d + max(t[a], t[b]) < best[ns]) pq.push({best[ns] = d + max(t[a], t[b]), ns});
            }
    }
    return -1;
}

int greedy(vector<int> t) {                      // the two-plan rule
    sort(t.begin(), t.end());
    int total = 0, n = t.size();
    for (; n > 3; n -= 2)
        total += min(t[0] + 2 * t[1] + t[n - 1], 2 * t[0] + t[n - 2] + t[n - 1]);
    return total + (n == 3 ? t[0] + t[1] + t[2] : n == 2 ? t[1] : t[0]);
}

int main() {
    printf("guards and prisoners: %d crossings\n", fewestTrips());
    printf("bridge 2,3,7,9: %d; bridge 1,6,7,8: %d\n", bridge({2, 3, 7, 9}), bridge({1, 6, 7, 8}));
    mt19937_64 rng(2026);
    int differ = 0;
    for (int trial = 0; trial < 2000; ++trial) {
        vector<int> t(2 + trial % 6);
        for (int& x : t) x = 1 + int(rng() % 20);
        differ += greedy(t) != bridge(t);
    }
    printf("rule vs search on 2000 random groups of 2 to 7: %d differences\n", differ);
}
```

Output:

```text
guards and prisoners: 11 crossings
bridge 2,3,7,9: 20; bridge 1,6,7,8: 23
rule vs search on 2000 random groups of 2 to 7: 0 differences
```

The searches confirm both answers, and the two-plan rule agrees with the exact search on every random group tried.

#### Common mistakes

- **Letting the fastest escort everyone** by habit: it loses when the second-fastest is also quick.
- **Ignoring the return trip** in a count of crossings.
- **Checking a constraint only on departure**: arrivals change the other bank.

Connects to: [BFS on state spaces](#/concept/dsa.graph-basics.bfs-on-state-spaces), [Dijkstra's algorithm](#/concept/dsa.shortest-paths.dijkstras-algorithm), [exchange arguments](#/concept/dsa.greedy.exchange-argument). Practice: [Bridge and torch](#/problems/q-bridge) and [Five hikers and one lamp](#/problems/q-five-hikers).

### questions
Q: How do you solve a crossing puzzle systematically?
A: Treat each arrangement (who is on which side and where the boat is) as a state and each legal crossing as an edge. Breadth-first search finds the fewest crossings; Dijkstra's algorithm finds the least total time when crossings take different times.

Q: What are the two ways to get the two slowest people across a bridge with one torch?
A: The two fastest shuttle (fastest two cross, fastest returns, slowest two cross, second-fastest returns), or the fastest escorts each slow person and returns. The first costs t1 + 2 t2 + tn, the second 2 t1 + t(n-1) + tn.

Q: When should the two slowest cross together?
A: When twice the second-fastest time is less than the fastest time plus the second-slowest time. Then pairing the slow ones saves more than the extra return trip by the second-fastest costs.

Q: How many crossings do three guards and three prisoners need with a two-seat boat, if prisoners may never outnumber guards on a bank with guards?
A: Eleven. A breadth-first search over the safe states confirms it, and the tight point is the middle, where a guard and a prisoner must row back together.

## puzzles.logic.hat-and-prisoner-puzzles
name: "Hat and prisoner puzzles"
importance: must
scope: "parity strategies, coordination"

### simple
In hat puzzles, players can see others' hats but not their own, and they agree on a plan in advance. No single guess can beat chance, but a clever plan coordinates the guesses, so the group's wrong guesses cluster together while right ones spread out. Parity and remainders are the usual tools.

### interview
- Every individual guess about one's own random hat is right with probability $\frac{1}{2}$ (or $\frac{1}{q}$); strategies can only change *which* outcomes the right guesses fall on.
- **Parity code**: one person announces the parity of what they see, which lets everyone else deduce their own hat.
- **Remainder strategy**: with numbers mod $n$ and $n$ players, player $i$ guesses so the total would be $\equiv i \pmod n$; exactly one player is always right.
- **Guess or pass** (3 players, win if someone is right and nobody wrong): "if the two hats you see match, guess the other color, else pass" wins $\frac{3}{4}$ of the time.
- Count outcomes: each guess is wrong as often as right, so good plans pack many wrong guesses into a few losing outcomes.
- **100 prisoners and boxes**: following the cycle from your own number succeeds with probability about $1 - \ln 2 \approx 0.31$, because it wins exactly when no cycle is longer than 50.

### deep
#### Intuition

Your own hat is independent of everything you see, so any guess you make is right half the time. The group can't change that; it can only choose *when* people are right together and when they are wrong together. In the guess-or-pass game, each person's guess is wrong in as many outcomes as it is right, so the winning plan makes all the wrong guesses land on the same two outcomes, while right guesses are spread one per outcome over the other six.

#### Worked example 1: guess or pass

*Three players get red or blue hats by fair coin flips. Each sees the other two and, at the same moment, says red, blue or pass. They win if at least one guesses right and nobody guesses wrong.*

**Plan**: if the two hats you see match, guess the opposite color; otherwise pass. Of the 8 outcomes, 6 have two hats of one color and one of the other; in those, only the odd one out sees a matching pair, guesses the opposite, and is right. In the 2 all-same outcomes, everyone guesses wrong. So the plan wins $\frac{6}{8} = \frac{3}{4}$. It is the best possible: every guess made is wrong in as many outcomes as it is right, so a winning outcome needs at least one right guess while a losing one can absorb up to three wrong ones; at most $\frac{3}{4}$ of outcomes can win.

#### Worked example 2: someone always right

*Five players each wear a hat showing a number from 0 to 4. Each sees the other four and writes a guess of their own number, all at once. Can they guarantee at least one correct guess?*

Yes. Player $i$ guesses the number that would make the total of all five hats $\equiv i \pmod 5$. The true total has some remainder $r$, and player $r$ is exactly right, whatever the hats are.

#### Checking by brute force

The program tries all $81^3 = 531{,}441$ deterministic plans for the guess-or-pass game (each player maps the 4 things they can see to red, blue or pass) and checks the remainder strategy on every assignment.

```cpp
int main() {
    int best = 0;                                // plan[p][view] in {0 red, 1 blue, 2 pass}
    for (int code = 0; code < 81 * 81 * 81; ++code) {
        int plan[3][4], c = code;
        for (int p = 0; p < 3; ++p)
            for (int v = 0; v < 4; ++v) plan[p][v] = c % 3, c /= 3;
        int wins = 0;
        for (int hats = 0; hats < 8; ++hats) {
            bool right = false, wrong = false;
            for (int p = 0; p < 3; ++p) {
                int a = hats >> ((p + 1) % 3) & 1, b = hats >> ((p + 2) % 3) & 1;
                int g = plan[p][2 * a + b];
                if (g == 2) continue;
                (g == (hats >> p & 1) ? right : wrong) = true;
            }
            wins += right && !wrong;
        }
        best = max(best, wins);
    }
    printf("best guess-or-pass plan wins %d of 8\n", best);
    for (int n = 2; n <= 6; ++n) {
        long long total = 1, bad = 0;
        for (int i = 0; i < n; ++i) total *= n;
        for (long long code = 0; code < total; ++code) {
            vector<int> h(n);
            long long c = code;
            int sum = 0;
            for (int& x : h) x = c % n, c /= n, sum += x;
            int correct = 0;
            for (int i = 0; i < n; ++i) {        // guess: make the total = i (mod n)
                int guess = ((i - (sum - h[i])) % n + n) % n;
                correct += guess == h[i];
            }
            bad += correct != 1;
        }
        printf("n=%d: %lld assignments, %lld without exactly one right guess\n", n, total, bad);
    }
}
```

Output:

```text
best guess-or-pass plan wins 6 of 8
n=2: 4 assignments, 0 without exactly one right guess
n=3: 27 assignments, 0 without exactly one right guess
n=4: 256 assignments, 0 without exactly one right guess
n=5: 3125 assignments, 0 without exactly one right guess
n=6: 46656 assignments, 0 without exactly one right guess
```

No plan wins more than 6 of the 8 outcomes, and the remainder strategy produces exactly one right guess on every one of the assignments, for every group size tried.

#### Common mistakes

- **Thinking a clever plan beats $\frac{1}{2}$ per guess**: it can't; only the correlation between guesses changes.
- **Forgetting simultaneity**: if players answer in turn and hear each other, parity codes become possible, which is a different game.
- **Off-by-one in the remainder rule**: player $i$ targets remainder $i$, and the players' targets must cover all $n$ remainders.

Connects to: [parity and invariants](#/concept/math.number-theory.parity-and-invariants), [modular arithmetic for puzzles](#/concept/math.number-theory.modular-arithmetic-for-puzzles), [XOR tricks](#/concept/dsa.bits.xor-tricks). Practice: [Hats in a line](#/problems/q-hat-line).

### questions
Q: In the three-player guess-or-pass hat game, what is the best strategy and its chance of winning?
A: If the two hats you see are the same color, guess the other color; otherwise pass. It wins in the 6 of 8 outcomes that aren't all one color, a probability of 3/4, which is the best possible.

Q: Why can't any strategy make an individual guess right more than half the time?
A: A player's own hat is independent of everything they see, so whatever rule they use, their guess matches a fair random hat half the time. Strategies only change how right and wrong guesses line up across players.

Q: n players wear hats numbered 0 to n - 1 and guess simultaneously. How can they guarantee one correct guess?
A: Player i guesses the value that would make the total of all hats equal i mod n. The actual total has exactly one remainder r, so player r is right, whatever the hats are.

Q: What is the idea behind the 100 prisoners and boxes strategy?
A: Each prisoner opens the box with their own number, then the box named inside it, and so on, following the cycle of the random permutation that contains their number. Everyone succeeds exactly when no cycle is longer than 50, which happens with probability about 31%.

## puzzles.logic.liars-and-truth-tellers
name: "Liars and truth-tellers"
importance: important
scope: "Liars and truth-tellers"

### simple
In these puzzles some people always tell the truth and others always lie, and you must work out who is who from what they say. Try each possible assignment and keep only the ones where every statement fits the speaker's type. A clever question can even make both types give you the same useful answer.

### interview
- A truth-teller's statement is true; a liar's is false. So "speaker is a truth-teller" is equivalent to "the statement is true".
- With $n$ people there are $2^n$ assignments; test each against every statement (by hand or in code).
- A statement like "I am a liar" can't be said by anyone, a quick contradiction check.
- **Embedded question**: "If I asked you whether door 1 is the exit, would you say yes?" Both types answer truthfully: a liar lies about their own lie.
- The answer may pin down only some people; say which are determined and which aren't.
- Variants: a random answerer, unknown words for yes and no, or questions that must be about others.

### deep
#### Intuition

Write $T_X$ for "X tells the truth". A statement $S$ made by X means $T_X \Leftrightarrow S$: if X is truthful, $S$ holds; if X lies, $S$ fails. Every puzzle becomes a small set of equations in true/false variables. With three people there are only 8 cases, so trying them all is fast and reliable.

#### Worked example

*On an island, knights always tell the truth and knaves always lie. You meet A, B and C. A says, "B is a knave." B says, "A and C are the same kind." What is C?*

- **A is a knight**: then B is a knave, so B's claim is false: A and C differ, so C is a knave.
- **A is a knave**: then B is a knight, so B's claim is true: A and C are the same, so C is a knave.

Either way **C is a knave**, even though A and B can't be determined: both assignments (knight, knave, knave) and (knave, knight, knave) fit.

#### The embedded question

Ask a guard of unknown type, "If I asked you whether the left door is the exit, would you say yes?" A knight says yes exactly when it is. A knave would answer the inner question falsely, and then lies about what they would say, so the two lies cancel: the knave also says yes exactly when it is. You learn the truth without learning the guard's type.

#### Checking by brute force

```cpp
int main() {
    int consistent = 0;
    for (int m = 0; m < 8; ++m) {
        bool A = m & 1, B = m & 2, C = m & 4;    // true = knight
        bool okA = A == !B;                      // A: "B is a knave"
        bool okB = B == (A == C);                // B: "A and C are the same kind"
        if (okA && okB) {
            ++consistent;
            printf("A %s, B %s, C %s\n", A ? "knight" : "knave", B ? "knight" : "knave",
                   C ? "knight" : "knave");
        }
    }
    printf("%d consistent assignments\n", consistent);
    for (int knight = 0; knight < 2; ++knight)
        for (int exitLeft = 0; exitLeft < 2; ++exitLeft) {
            auto answer = [&](bool truth) { return knight ? truth : !truth; };
            bool wouldSay = answer(exitLeft);            // their answer to the inner question
            printf("%s, exit %s: says %s\n", knight ? "knight" : "knave ",
                   exitLeft ? "left " : "right", answer(wouldSay) ? "yes" : "no");
        }
}
```

Output:

```text
A knight, B knave, C knave
A knave, B knight, C knave
2 consistent assignments
knave , exit right: says no
knave , exit left : says yes
knight, exit right: says no
knight, exit left : says yes
```

Exactly two assignments survive, and C is a knave in both. The embedded question gets "yes" exactly when the exit is on the left, from either type.

#### Common mistakes

- **Assuming a unique answer**: some people may stay undetermined.
- **Treating a liar's statement as the opposite of a specific claim**: "B is a knave" said by a liar means B is a knight, but "A and C are the same kind" said by a liar means they differ, not that both are the other kind.
- **Asking a direct question**: "Is the left door the exit?" is useless when you don't know the speaker's type.

Connects to: [proof by contradiction](#/concept/math.proofs.proof-by-contradiction-and-contrapositive), [bitmask enumeration](#/concept/dsa.bits.bitmask-enumeration), [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser). Practice: [One question for two guards](#/problems/q-guards).

### questions
Q: How do you solve a knights-and-knaves puzzle reliably?
A: Turn each statement into the rule "the speaker is a knight exactly when the statement is true", then test every assignment of types. With three people there are only 8 cases, and the answer is whatever all surviving cases share.

Q: A says B is a knave; B says A and C are the same kind. What is C?
A: A knave. If A is a knight, B is a knave and lies, so A and C differ; if A is a knave, B is a knight, so A and C match. Both cases make C a knave.

Q: Why does "If I asked you X, would you say yes?" work on a liar?
A: The liar would give the false answer to X, and then lies about what they would say, so the two falsehoods cancel and the reply is the true answer to X.

Q: Can anyone on the island say "I am a knave"?
A: No. A knight saying it would be lying and a knave saying it would be telling the truth, so the statement is impossible for both types.

## puzzles.logic.pirates-and-backward-induction
name: "Pirates and backward induction"
importance: important
scope: "game solving from the end"

### simple
Backward induction solves a game by starting at the end, where the choice is obvious, and working back one step at a time. Each earlier player knows exactly what will happen if the game continues, so they only need to beat that. The pirate gold puzzle is the classic example: the answer looks greedy but is forced.

### interview
- Solve the smallest game first (one player left, or the last round), then add one player or round at a time.
- A voter accepts an offer exactly when it beats what they would get if the game continued, with ties broken by the stated rule (the usual one: vote no when indifferent).
- The proposer buys the cheapest votes: people who would get nothing, or who would die, in the next stage.
- The answer depends on every rule: "at least half" versus "more than half", tie-breaking, whether survival comes first.
- With many pirates and few coins, proposers who can't buy enough votes die, and a surprising pattern of survivors appears.
- The same reasoning prices games in trading (sequential bargaining, ultimatum games) and solves [game DPs](#/concept/dsa.dp-intervals.game-dp).

### deep
#### Intuition

In the last stage nobody has a choice, so its outcome is known. In the stage before, every voter can compare an offer with that known outcome; the proposer offers just enough to the cheapest voters. Repeat, and the first stage is solved.

#### Worked example: four partners and nine shares

*Four partners, A (senior) to D, split 9 shares. The most senior remaining partner proposes a split, and everyone votes; it passes only with **more than half** the votes, the proposer's included. Otherwise the proposer leaves with nothing and the next partner proposes. Each partner wants first to stay, then as many shares as possible, and when indifferent votes no.*

- **D alone**: D takes 9.
- **C and D**: C needs both votes, but D gets 9 if C is removed, so D votes no. C is always removed here.
- **B, C and D**: B needs 2 votes. C knows the next stage removes C, so C accepts anything to stay. B keeps 9: (B 9, C 0, D 0).
- **A, B, C and D**: A needs 3 votes, so 2 besides A's own. In the next stage C and D get 0, so each accepts 1; B would need 10, which is impossible. A offers (A 7, B 0, C 1, D 1).

**A keeps 7.**

#### Checking with a general solver

The solver works up from one partner, tracking what each would get (or whether they would be removed) if the current proposal failed.

```cpp
struct Result { vector<int> shares; vector<bool> removed; };   // index 0 = most senior

Result solve(int n, int coins) {                  // n partners remain; strict majority
    if (n == 1) return {{coins}, {false}};
    Result next = solve(n - 1, coins);           // what happens if the proposer is removed
    int need = n / 2;                            // more than n/2 votes, minus the proposer's
    vector<pair<int, int>> cost;                 // (price of a yes vote, voter)
    for (int j = 1; j < n; ++j)
        cost.push_back({next.removed[j - 1] ? 0 : next.shares[j - 1] + 1, j});
    sort(cost.begin(), cost.end());
    int spend = 0;
    for (int i = 0; i < need; ++i) spend += cost[i].first;
    Result r{vector<int>(n, 0), vector<bool>(n, false)};
    if (spend <= coins) {
        for (int i = 0; i < need; ++i) r.shares[cost[i].second] = cost[i].first;
        r.shares[0] = coins - spend;
    } else {                                     // proposal fails: proposer removed
        r.removed[0] = true;
        for (int j = 1; j < n; ++j)
            r.shares[j] = next.shares[j - 1], r.removed[j] = next.removed[j - 1];
    }
    return r;
}

int main() {
    for (int n = 1; n <= 6; ++n) {
        Result r = solve(n, 9);
        printf("%d partners:", n);
        for (int j = 0; j < n; ++j) r.removed[j] ? printf(" out") : printf(" %d", r.shares[j]);
        printf("\n");
    }
}
```

Output:

```text
1 partners: 9
2 partners: out 9
3 partners: 9 0 0
4 partners: 7 0 1 1
5 partners: 6 0 1 2 0
6 partners: 5 0 1 2 0 1
```

The solver reproduces the hand analysis: with two partners the proposer is removed, with three the proposer keeps everything, and with four A keeps 7 and pays C and D one share each.

#### Common mistakes

- **Starting from the top**: guessing A's offer without solving the smaller games.
- **Ignoring the tie rule**: whether an indifferent voter says yes changes every price by one.
- **Mixing up "at least half" and "more than half"**: the vote count needed changes the whole chain.

Connects to: [game DP](#/concept/dsa.dp-intervals.game-dp), [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [Nash equilibrium](#/concept/markets.game-theory.nash-equilibrium). Practice: [Five pirates share gold](#/problems/q-five-pirates).

### questions
Q: What is backward induction?
A: Solving a sequential game from its last stage back to the first. Each stage's outcome is known once the later stages are solved, so every earlier decision reduces to comparing an offer with that known outcome.

Q: In a split that needs more than half the votes, why does the second-to-last proposer always lose with two players?
A: With two left, the proposer needs both votes, and the other player gets everything if the proposal fails. Voting no is at least as good for them, so the proposal fails.

Q: Why do proposers pay the most junior players rather than the senior ones?
A: They buy the cheapest votes. Players who get nothing, or would be removed, in the next stage accept one coin or even nothing, while a player who would do well next stage demands more.

Q: How does the voting rule change a pirate puzzle's answer?
A: It changes how many votes each proposer must buy, which changes who is removed and every price along the chain. "At least half" lets the proposer's own vote carry more weight than "more than half".

## puzzles.logic.egg-drop
name: "Egg drop"
importance: important
scope: "minimizing worst-case trials"

### simple
You want to find the highest floor from which an egg survives a drop, using few drops and a limited number of eggs. With one egg you must go floor by floor, but a second egg lets you jump ahead and step back when it breaks. Choosing the jumps so every branch finishes in the same number of drops gives the best worst case.

### interview
- With $e$ eggs and $t$ drops you can cover $f(t, e) = f(t-1, e-1) + f(t-1, e) + 1$ floors: the first drop's floor, plus what is left below if it breaks and above if it doesn't.
- Closed form: $f(t, e) = \sum_{i=1}^{e} \binom{t}{i}$. With 2 eggs, $f(t, 2) = \frac{t(t+1)}{2}$.
- The answer is the smallest $t$ with $f(t, e) \ge$ the number of floors.
- **Two-egg plan**: drop the first egg at floor $t$, then $t + (t - 1)$, then $+ (t - 2)$, …; when it breaks, walk up one floor at a time with the second egg.
- The direct DP over (eggs, floors) with a minimum over the first drop is $O(e n^2)$; flipping the question to "floors covered by $t$ drops" is $O(e t)$.
- Equal-sized steps (every 10 floors) are worse, because a break late costs more checking.

### deep
#### Intuition

With two eggs, a break of the first egg forces a floor-by-floor walk with the second. If the first egg is dropped at floor $x$ and breaks, you need up to $x - 1$ more drops. To keep the worst case at $t$ in total, the first drop can be at most floor $t$; the next can go $t - 1$ floors higher (one drop already used), and so on. That covers $t + (t - 1) + \dots + 1 = \frac{t(t+1)}{2}$ floors.

#### Worked example: two phones and a 50-floor tower

*A drop test uses two identical phones on a 50-floor tower. Find the fewest drops that always identify the highest floor a phone survives (it might be none, or all 50).*

The smallest $t$ with $\frac{t(t+1)}{2} \ge 50$ is 10 (45 is too few, 55 is enough). A plan: drop the first phone at floors 10, 19, 27, 34, 40, 45, 49 and 50 (steps of 9, 8, 7, …); after a break, test the floors in between from the bottom. For example, if it survives 34 and breaks at 40, test 35 to 39 with the second phone: at most $5 + 5 = 10$ drops. **10 drops.**

#### Checking every threshold

```cpp
int main() {
    const int floors = 50;
    vector<vector<int>> dp(3, vector<int>(floors + 1, 0));   // dp[e][n]: fewest drops
    for (int n = 1; n <= floors; ++n) dp[1][n] = n;
    for (int n = 1; n <= floors; ++n) {
        dp[2][n] = INT_MAX;
        for (int x = 1; x <= n; ++x)             // first drop at floor x
            dp[2][n] = min(dp[2][n], 1 + max(dp[1][x - 1], dp[2][n - x]));
    }
    vector<int> plan = {10, 19, 27, 34, 40, 45, 49, 50};
    int worst = 0;
    for (int safe = 0; safe <= floors; ++safe) { // highest surviving floor, 0 to 50
        int drops = 0, below = 0, found = -1;
        for (int f : plan) {
            ++drops;
            if (f > safe) {                      // breaks: walk up from below + 1
                for (int g = below + 1; g < f; ++g) {
                    ++drops;
                    if (g > safe) { found = g - 1; break; }
                }
                if (found < 0) found = f - 1;
                break;
            }
            below = f;
        }
        if (found < 0) found = floors;
        worst = max(worst, drops);
        if (found != safe) printf("wrong answer for %d\n", safe);
    }
    printf("DP: %d drops; plan: worst case %d drops over all 51 thresholds\n", dp[2][floors],
           worst);
    printf("floors covered by t drops and 2 eggs:");
    for (int t = 1; t <= 10; ++t) printf(" %d", t * (t + 1) / 2);
    printf("\n");
}
```

Output:

```text
DP: 10 drops; plan: worst case 10 drops over all 51 thresholds
floors covered by t drops and 2 eggs: 1 3 6 10 15 21 28 36 45 55
```

The minimum over all first-drop choices is 10, and the specific plan finds the right floor in at most 10 drops for every possible answer.

#### Common mistakes

- **Binary search with two eggs**: the first break at floor 25 leaves 24 floors for one egg.
- **Equal steps**: dropping every 7 floors needs up to $7 + 6 = 13$ drops on 50 floors.
- **Forgetting the extremes**: the answer can be "no floor is safe" or "every floor is safe".

Connects to: [designing DP states](#/concept/dsa.dp-foundations.designing-dp-states), [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities), [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser). Practice: [Two eggs, 100 floors](#/problems/q-egg-drop) and [Three eggs, 100 floors](#/problems/q-three-eggs).

### questions
Q: How many floors can t drops cover with 2 eggs, and why?
A: t(t + 1)/2. The first drop can be at most floor t so that a break leaves t - 1 drops for a floor-by-floor search; each later first-egg drop can go one step less higher, giving t + (t - 1) + ... + 1.

Q: Why isn't binary search the right plan with two eggs?
A: After the first egg breaks, the second must test floors one at a time, so a break at the midpoint leaves half the building to walk through. Binary search is only optimal when you have enough eggs to keep halving.

Q: What recurrence gives the floors coverable with e eggs and t drops?
A: f(t, e) = f(t - 1, e - 1) + f(t - 1, e) + 1: the floor you drop from, the floors below it you can still cover if the egg breaks, and those above if it survives. It solves to the sum of C(t, i) for i from 1 to e.

Q: What is the fewest number of drops for 2 eggs and 50 floors?
A: 10, because 9 drops cover only 45 floors while 10 cover 55. Start at floor 10 and step up by 9, 8, 7 and so on.

## puzzles.logic.25-horses-and-tournament-puzzles
name: "25 horses and tournament puzzles"
importance: important
scope: "25 horses and tournament puzzles"

### simple
Tournament puzzles ask how few races or matches reveal the best players. The key idea is elimination: once enough others are known to be faster than someone, that one can't be in the top group and needs no more racing. Counting how many must lose, and to whom, gives the lower bound.

### interview
- **Knockout for the winner**: every player except the champion must lose once, and each match produces one loser, so exactly $n - 1$ matches, whatever the byes.
- **Second best**: they lost only to the champion, so they are among the $\lceil \log_2 n \rceil$ players the champion beat; a knockout among those gives $n + \lceil \log_2 n \rceil - 2$ matches, which is optimal.
- **Races without a timer**: a horse can finish in the top $k$ only if fewer than $k$ horses are known to be faster; cross out the rest.
- Typical plan: heats covering everyone, a race of heat winners, then one race of the remaining candidates.
- Lower bounds come from counting: every horse must race, and the non-winners must each lose at least once.
- **Round robin**: $\binom{n}{2}$ games; a Swiss system uses far fewer but ranks less precisely.

### deep
#### Intuition

Results give "faster than" arrows. A horse with $k$ or more horses known to be faster (directly or through a chain) can't be in the top $k$. A good plan races only the horses that are still candidates, and a proof of optimality shows some candidate would always remain undecided with fewer races.

#### Worked example 1: the fastest two of eight

*Eight horses, a track with 4 lanes, no timer. How few races find the fastest two, in order?*

- Two races are not enough: every horse must race (an unraced horse might be the fastest), and 8 horses in 2 races of 4 means two separate heats whose winners never meet.
- Three suffice: race heats A and B. The fastest horse is A1 or B1. If it is A1, the second is A2 or B1; if B1, it is B2 or A1. So the top two are among A1, A2, B1 and B2, and the third race is exactly those four; its first two finish are the answer. Horses A3, A4, B3 and B4 each have two horses known to be faster, so they are out.

**3 races.**

#### Worked example 2: the runner-up in a knockout

*16 players play a knockout. How many matches, at least, identify both the best and the second-best player?*

The final's loser isn't necessarily second best; the second-best player could have met the champion in round one. The second-best lost only to the champion, so they are one of the 4 players the champion beat. A mini-knockout among those 4 takes 3 more matches: $15 + 3 = 18 = n + \lceil \log_2 n \rceil - 2$.

#### Checking by brute force

The first part checks the 3-race plan on all $8! = 40{,}320$ orders of the horses. The second tries every adaptive sequence of matches for up to 6 players, keeping the set of rankings still consistent with the results.

```cpp
using Set = vector<uint64_t>;
int n;
vector<vector<int>> rankings;                    // rankings[i][p] = place of player p
vector<vector<Set>> beats;                       // beats[a][b] = rankings with a ahead of b
map<pair<Set, int>, bool> memo;

bool decided(const Set& s) {                     // do all rankings left agree on the top 2?
    int first = -1, second = -1;
    for (size_t i = 0; i < rankings.size(); ++i) {
        if (!(s[i / 64] >> (i % 64) & 1)) continue;
        int f = int(find(rankings[i].begin(), rankings[i].end(), 0) - rankings[i].begin());
        int t = int(find(rankings[i].begin(), rankings[i].end(), 1) - rankings[i].begin());
        if (first < 0) first = f, second = t;
        else if (f != first || t != second) return false;
    }
    return true;
}

bool solvable(const Set& s, int matches) {
    if (decided(s)) return true;
    if (matches == 0) return false;
    auto key = make_pair(s, matches);
    if (auto it = memo.find(key); it != memo.end()) return it->second;
    bool ok = false;
    for (int a = 0; a < n && !ok; ++a)
        for (int b = a + 1; b < n && !ok; ++b) {
            Set win(s.size()), lose(s.size());
            bool anyWin = false, anyLose = false;
            for (size_t w = 0; w < s.size(); ++w) {
                win[w] = s[w] & beats[a][b][w], lose[w] = s[w] & ~beats[a][b][w];
                anyWin |= win[w] != 0, anyLose |= lose[w] != 0;
            }
            if (anyWin && anyLose) ok = solvable(win, matches - 1) && solvable(lose, matches - 1);
        }
    return memo[key] = ok;
}

int main() {
    vector<int> speed(8);                        // lower = faster
    iota(speed.begin(), speed.end(), 0);
    int wrong = 0, orders = 0;
    do {
        auto byPace = [&](int x, int y) { return speed[x] < speed[y]; };
        vector<int> a = {0, 1, 2, 3}, b = {4, 5, 6, 7};
        sort(a.begin(), a.end(), byPace), sort(b.begin(), b.end(), byPace);
        vector<int> race3 = {a[0], a[1], b[0], b[1]};
        sort(race3.begin(), race3.end(), byPace);
        ++orders;
        wrong += speed[race3[0]] != 0 || speed[race3[1]] != 1;
    } while (next_permutation(speed.begin(), speed.end()));
    printf("8 horses: plan wrong in %d of %d orders\n", wrong, orders);
    for (n = 2; n <= 6; ++n) {
        rankings.clear(), memo.clear();
        vector<int> p(n);
        iota(p.begin(), p.end(), 0);
        do rankings.push_back(p); while (next_permutation(p.begin(), p.end()));
        size_t words = (rankings.size() + 63) / 64;
        beats.assign(n, vector<Set>(n, Set(words, 0)));
        Set all(words, 0);
        for (size_t i = 0; i < rankings.size(); ++i) {
            all[i / 64] |= 1ULL << (i % 64);
            for (int a = 0; a < n; ++a)
                for (int b = 0; b < n; ++b)
                    if (rankings[i][a] < rankings[i][b]) beats[a][b][i / 64] |= 1ULL << (i % 64);
        }
        int m = 0, lg = 0;
        while (!solvable(all, m)) ++m;
        while ((1 << lg) < n) ++lg;
        printf("%d players: best and second best need %d matches (formula %d)\n", n, m,
               n + lg - 2);
    }
}
```

Output:

```text
8 horses: plan wrong in 0 of 40320 orders
2 players: best and second best need 1 matches (formula 1)
3 players: best and second best need 3 matches (formula 3)
4 players: best and second best need 4 matches (formula 4)
5 players: best and second best need 6 matches (formula 6)
6 players: best and second best need 7 matches (formula 7)
```

The three-race plan is right for every possible order, and the exhaustive search over match plans reproduces $n + \lceil \log_2 n \rceil - 2$ for 2 to 6 players.

#### Common mistakes

- **Taking the final's loser as second best**: in a knockout they may not be.
- **Racing horses already ruled out**: every slot should go to a candidate.
- **Forgetting that every horse must run**: an unraced horse could be the fastest.

Connects to: [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [top-k elements](#/concept/dsa.heaps.top-k-elements), [the sorting lower bound](#/concept/dsa.sorting.comparison-sorting-lower-bound). Practice: [25 horses](#/problems/q-horses) and [Knockout matches](#/problems/q-knockout).

### questions
Q: How many matches does a knockout tournament of n players need to find the winner?
A: Exactly n - 1. Every player except the winner must lose once, and each match eliminates exactly one player, whatever the byes.

Q: How do you find the second-best player in a knockout with the fewest extra matches?
A: The second-best lost only to the champion, so they are among the players the champion beat, about log2 n of them. A knockout among those finds them, for n + ceil(log2 n) - 2 matches in total, which is optimal.

Q: What is the elimination rule in horse-racing puzzles without a timer?
A: A horse can be in the top k only if fewer than k horses are known to be faster than it, directly or through a chain of results. Every other horse can be dropped from further races.

Q: With 8 horses and a 4-lane track, how many races find the fastest two?
A: Three: two heats, then a race of both heat winners and both runners-up. Two races can't work, because two heats covering all 8 horses never compare the heat winners.

## puzzles.logic.burning-ropes-and-measuring-time
name: "Burning ropes and measuring time"
importance: important
scope: "Burning ropes and measuring time"

### simple
These puzzles give you odd timers, such as ropes that burn unevenly or hourglasses of awkward lengths, and ask you to mark an exact time. The trick is that some things are still reliable: lighting both ends of a rope halves the time left, and an hourglass can be flipped the moment another one runs out. You build the target time from those reliable moments.

### interview
- A rope that takes $T$ minutes burns in $\frac{T}{2}$ when lit at both ends, however unevenly it burns. Lighting the second end of a rope with $r$ minutes left makes it finish in $\frac{r}{2}$.
- You can only act at **events**: the start, or the moment a rope or hourglass finishes.
- **Hourglasses**: flipping a glass that has run for $s$ minutes gives you $s$ more minutes; combine this with another glass's events.
- Water jugs (measure 4 liters with 3 and 5) are the same kind of puzzle: reachable amounts are multiples of the gcd.
- Search the events systematically: list every state (time left on each timer) reachable by acting at events.
- Cutting an uneven rope in half does not give half the time; only both-ends lighting does.

### deep
#### Intuition

Uneven burning makes a rope's length useless, but not its total time: two flames eating a rope from both ends meet after exactly half the remaining burn time, whatever the rope's thickness profile. Hourglasses are reliable in the same way: sand that has fallen for $s$ minutes takes $s$ minutes to fall back. Everything else must wait for an event.

#### Worked example 1: hourglasses of 5 and 9 minutes

*Measure exactly 13 minutes.*

1. Start both at time 0.
2. At 5 the small glass runs out: turn it over (it will run until 10).
3. At 9 the large glass runs out. The small glass has run 4 minutes since it was turned, so 4 minutes of sand sit in its bottom: turn it over again.
4. It runs out at $9 + 4 = 13$.

#### Worked example 2: a 60-minute and a 40-minute rope

*Both burn unevenly. Measure 35 minutes from the moment you first light a flame.*

Light both ends of the 60-minute rope and one end of the 40-minute rope. At 30 the first rope is gone, and the second has 10 minutes of burning left; light its other end, and it finishes 5 minutes later, at **35**.

#### Checking by listing every event

The programs try every choice at every event and collect all the moments that can be marked.

```cpp
set<int> glassMarks;
void glasses(int t, array<int, 2> top, array<bool, 2> running, int limit) {
    const array<int, 2> cap = {5, 9};
    for (int flip = 0; flip < 4; ++flip) {       // which glasses to turn over now
        array<int, 2> tp = top;
        array<bool, 2> run = running;
        for (int i = 0; i < 2; ++i)
            if (flip >> i & 1) tp[i] = cap[i] - tp[i], run[i] = true;
        int dt = INT_MAX;
        for (int i = 0; i < 2; ++i)
            if (run[i] && tp[i] > 0) dt = min(dt, tp[i]);
        if (dt == INT_MAX || t + dt > limit) continue;
        for (int i = 0; i < 2; ++i)
            if (run[i]) tp[i] = max(0, tp[i] - dt);
        glassMarks.insert(t + dt);
        glasses(t + dt, tp, run, limit);
    }
}

set<double> ropeMarks;                           // ends: 0 or 1 or 2 lit, -1 burned out
void ropes(double t, array<double, 2> left, array<int, 2> ends) {
    for (int e0 = max(ends[0], 0); e0 <= 2; ++e0)
        for (int e1 = max(ends[1], 0); e1 <= 2; ++e1) {
            if ((ends[0] < 0 && e0 > 0) || (ends[1] < 0 && e1 > 0)) continue;
            array<int, 2> e = {ends[0] < 0 ? -1 : e0, ends[1] < 0 ? -1 : e1};
            double dt = 1e18;
            for (int i = 0; i < 2; ++i)
                if (e[i] > 0) dt = min(dt, left[i] / e[i]);
            if (dt > 1e17) continue;
            array<double, 2> l = left;
            array<int, 2> next = e;
            for (int i = 0; i < 2; ++i)
                if (e[i] > 0 && (l[i] -= dt * e[i]) < 1e-9) next[i] = -1;
            ropeMarks.insert(t + dt);
            ropes(t + dt, l, next);
        }
}

int main() {
    glasses(0, {0, 0}, {false, false}, 20);
    printf("hourglasses 5 and 9, marks up to 20:");
    for (int m : glassMarks) printf(" %d", m);
    ropes(0, {60, 40}, {0, 0});
    printf("\nropes 60 and 40, every mark:");
    for (double m : ropeMarks) printf(" %g", m);
    printf("\n");
}
```

Output:

```text
hourglasses 5 and 9, marks up to 20: 5 9 10 11 12 13 14 15 16 17 18 19 20
ropes 60 and 40, every mark: 20 30 35 40 50 60 70 80 100
```

13 is among the marks the hourglasses can make (so are 10 to 20; nothing between 5 and 9), and 35 is among the nine marks the two ropes can make.

#### Common mistakes

- **Acting between events**: you can't know when 7 minutes have passed unless something ends then.
- **Halving by cutting**: an uneven rope cut in the middle doesn't split its time evenly.
- **Forgetting the sand already fallen**: turning a glass mid-run gives back exactly the time it has run.

Connects to: [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [GCD and LCM](#/concept/dsa.math.gcd-and-lcm), [DFS](#/concept/dsa.graph-basics.dfs). Practice: [Two burning ropes](#/problems/q-ropes).

### questions
Q: Why does lighting a rope at both ends halve its time even if it burns unevenly?
A: The two flames together consume the rope's total burn time at twice the rate, and they meet when all of it is used, so the rope lasts half its remaining time. Where they meet depends on the unevenness, but when doesn't.

Q: How do you measure 13 minutes with 5- and 9-minute hourglasses?
A: Start both. When the 5 runs out, turn it over. When the 9 runs out at minute 9, the 5 has 4 minutes of sand in its bottom; turn it over again, and it runs out at 13.

Q: Why can you only act at certain moments in these puzzles?
A: The timers are the only clock. You can recognize a moment only when something visible happens, such as a rope burning out or an hourglass emptying, so every action must happen at such an event.

Q: How are measuring puzzles with water jugs related to these?
A: They are the same kind of state search: states are the amounts in each jug, moves are fill, empty and pour. With jugs of a and b liters you can measure exactly the multiples of gcd(a, b) up to the larger jug.

## puzzles.logic.poisoned-bottles-and-binary-encoding
name: "Poisoned bottles and binary encoding"
importance: important
scope: "Poisoned bottles and binary encoding"

### simple
When one bottle out of many is poisoned and testing takes a long time, you can't test bottles one by one. Instead, number the bottles in binary and have each tester sip from every bottle whose number has a 1 in their position. The pattern of who shows symptoms spells out the poisoned bottle's number.

### interview
- Each tester reports one bit (symptoms or not), so $t$ testers distinguish $2^t$ bottles in one round: $t = \lceil \log_2 n \rceil$.
- Tester $i$ drinks from every bottle whose number has bit $i$ set; the set of testers with symptoms is the bottle's number.
- With $r$ rounds, each tester reports *when* symptoms appear (round 1 to $r$, or never): $r + 1$ outcomes each, so $(r + 1)^t \ge n$ in base $r + 1$ (a tester who reacts stops drinking).
- If at most $k$ testers may be harmed, codes may have at most $k$ ones: $\sum_{i=0}^{k} \binom{t}{i} \ge n$.
- It is the same information argument as [weighing puzzles](#/concept/puzzles.logic.weighing-puzzles), with 2 outcomes per tester instead of 3 per weighing.
- Real group testing (pooled samples) uses the same idea, with extra rounds or codes to handle several positives.

### deep
#### Intuition

Every tester is a bit: symptoms or none. With $t$ testers the outcome is a $t$-bit pattern, so at most $2^t$ bottles can be told apart. Binary numbering reaches that bound: give bottle $b$ to exactly the testers whose bits are set in $b$, and the pattern of reactions is $b$ itself.

#### Worked example 1: 8 bottles, 3 testers

| bottle | binary | drunk by |
|---|---|---|
| 0 | 000 | nobody |
| 1 | 001 | tester 0 |
| 2 | 010 | tester 1 |
| 3 | 011 | testers 0 and 1 |
| 4 | 100 | tester 2 |
| 5 | 101 | testers 0 and 2 |
| 6 | 110 | testers 1 and 2 |
| 7 | 111 | everyone |

If testers 0 and 2 react, the poisoned bottle is $101_2 = 5$; if nobody reacts, it is bottle 0.

#### Worked example 2: harming at most two testers

*A lab has 1000 samples, one contaminated, and a single round of tests. Each tester can check many samples, but at most two testers may be exposed to the contaminated sample. How many testers are needed?*

Each sample must be tested by at most two testers, and different samples need different sets of testers. With $t$ testers there are $1 + t + \binom{t}{2}$ such sets (nobody, one tester, a pair). The smallest $t$ with $1 + t + \binom{t}{2} \ge 1000$ is **45** ($1 + 45 + 990 = 1036$, while 44 gives only 991).

#### Checking by simulation

```cpp
int main() {
    int t = 10, n = 1000, wrong = 0;             // plain binary code
    for (int poison = 0; poison < n; ++poison) {
        int reacted = 0;
        for (int tester = 0; tester < t; ++tester)
            for (int b = 0; b < n; ++b)
                if ((b >> tester & 1) && b == poison) reacted |= 1 << tester;
        wrong += reacted != poison;
    }
    printf("1000 bottles, 10 testers: %d wrong identifications\n", wrong);
    int k = 1;                                   // at most two exposed testers
    while (1 + k + k * (k - 1) / 2 < n) ++k;
    vector<vector<int>> code = {{}};             // sets of size 0, 1 and 2
    for (int a = 0; a < k; ++a) code.push_back({a});
    for (int a = 0; a < k; ++a)
        for (int b = a + 1; b < k; ++b) code.push_back({a, b});
    code.resize(n);
    map<vector<int>, int> decode;
    for (int s = 0; s < n; ++s) decode[code[s]] = s;
    int errors = 0;
    for (int s = 0; s < n; ++s) errors += decode.at(code[s]) != s || code[s].size() > 2;
    printf("at most two exposed: %d testers (%d gives %d sets), decoding errors %d\n", k, k - 1,
           1 + (k - 1) + (k - 1) * (k - 2) / 2, errors);
}
```

Output:

```text
1000 bottles, 10 testers: 0 wrong identifications
at most two exposed: 45 testers (44 gives 991 sets), decoding errors 0
```

Every one of the 1000 possible poisoned bottles is identified from the reactions, and the two-exposure code gives each sample its own set of at most two testers.

#### Common mistakes

- **Forgetting the all-zero code**: bottle 0 is identified by nobody reacting, which is why $2^t$ bottles work, not $2^t - 1$.
- **Ignoring rounds**: with more time, a tester's reaction time carries more than one bit.
- **Two poisoned bottles**: plain binary codes then OR together and become ambiguous; that needs a different code.

Connects to: [bitmask enumeration](#/concept/dsa.bits.bitmask-enumeration), [weighing puzzles](#/concept/puzzles.logic.weighing-puzzles), [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities). Practice: [One poisoned bottle](#/problems/q-poison) and [Poison with two rounds](#/problems/q-poison-two-rounds).

### questions
Q: How does binary encoding find one poisoned bottle among 2 to the t with t testers?
A: Number the bottles from 0 in binary; tester i drinks from every bottle whose bit i is 1. The set of testers who react reads out the poisoned bottle's number, with nobody reacting meaning bottle 0.

Q: How do extra rounds change the number of testers needed?
A: With r rounds each tester's outcome is the round in which they react, or never, so r + 1 outcomes. Number the bottles in base r + 1, and you need the smallest t with (r + 1) to the t at least the number of bottles.

Q: What changes if at most two testers may be exposed to the poison?
A: Each bottle must be tested by at most two testers, so the codes are sets of size 0, 1 or 2. You need 1 + t + C(t, 2) to reach the number of bottles; for 1000 that means 45 testers.

Q: Why is this an information-counting problem?
A: Each tester gives one bit (reacted or not), so t testers produce at most 2 to the t different outcomes, and each bottle needs its own outcome. The binary code reaches that limit exactly.

## puzzles.logic.clocks-and-angles
name: "Clocks and angles"
importance: important
scope: "Clocks and angles"

### simple
Clock puzzles are about two hands turning at different speeds. The minute hand gains on the hour hand at a steady rate, so any question about when they meet, line up or form a right angle becomes a simple "catch up" problem. The answers are often odd fractions of a minute, which is why the rates matter more than the clock face.

### interview
- Minute hand: $6°$ per minute. Hour hand: $0.5°$ per minute. The minute hand gains $5.5°$ per minute.
- At $h$ hours and $m$ minutes the angle between them is $|30h - 5.5m|$ (take $360°$ minus it if above $180°$).
- They coincide every $\frac{360}{5.5} = \frac{720}{11} \approx 65.45$ minutes: 11 times in 12 hours, 22 times a day.
- They are at right angles 22 times in 12 hours (44 a day), and opposite 11 times in 12 hours.
- Answers come in elevenths of a minute; write them as fractions ($5\frac{5}{11}$ minutes).
- With a second hand, all three coincide only at 12:00.

### deep
#### Intuition

Work in the frame of the hour hand: the minute hand moves at $6 - 0.5 = 5.5$ degrees per minute relative to it. Any angle question asks when that relative position reaches a target, which is a single division.

#### Worked example: right angles between 4 and 5

At 4:00 the hour hand is $120°$ ahead of the minute hand. The angle is $|120 - 5.5m|$, which equals $90$ when:

- $120 - 5.5m = 90$: $m = \frac{30}{5.5} = \frac{60}{11} = 5\frac{5}{11}$ minutes, at about 4:05:27;
- $5.5m - 120 = 90$: $m = \frac{210}{5.5} = \frac{420}{11} = 38\frac{2}{11}$ minutes, at about 4:38:11.

Each 12 hours has 22 right-angle moments: the relative angle passes $90°$ and $270°$ once in each of the 11 laps the minute hand makes on the hour hand.

#### Checking by scanning the clock

The program checks the formula at these two moments, then scans 12 hours in tenth-of-a-second steps and counts how often the angle crosses $90°$ and $0°$, without using the formulas.

```cpp
double gap(double t) {                           // angle between hands, t minutes after 12:00
    double a = fmod(5.5 * t, 360);
    return a > 180 ? 360 - a : a;
}

int main() {
    printf("4:%.4f -> %.6f degrees, 4:%.4f -> %.6f degrees\n", 60 / 11.0,
           gap(240 + 60 / 11.0), 420 / 11.0, gap(240 + 420 / 11.0));
    int right = 0, together = 0;
    const double step = 1.0 / 600;               // a tenth of a second, in minutes
    for (long i = 1; i <= 720L * 600; ++i) {
        double t0 = (i - 1) * step, t1 = i * step;
        right += (gap(t0) < 90) != (gap(t1) < 90);               // reached or crossed 90
        together += fmod(5.5 * t1, 360) < fmod(5.5 * t0, 360);   // relative angle back to 0
    }
    printf("in 12 hours: right angles %d, hands together %d times\n", right, together);
    int triple = 0;                              // the hands meet at 720k/11 minutes
    for (int k = 0; k < 11; ++k) {
        long long T = 720LL * k;                 // in elevenths of a minute
        triple += T % 11 * 60 == T % 660;        // second hand's lap is 11, minute hand's 660
    }
    printf("meetings where the second hand also points there: %d (12:00)\n", triple);
}
```

Output:

```text
4:5.4545 -> 90.000000 degrees, 4:38.1818 -> 90.000000 degrees
in 12 hours: right angles 22, hands together 11 times
meetings where the second hand also points there: 1 (12:00)
```

Both computed times give exactly $90°$, the scan counts 22 right angles and 11 meetings in 12 hours (the one at the end of the scan is 12:00 again), and of the 11 meetings only 12:00 has the second hand there too.

#### Common mistakes

- **Forgetting the hour hand moves**: at 4:30 it is halfway between 4 and 5, not on the 4.
- **Assuming 24 meetings a day**: the hands meet 22 times, since there is no meeting between 11 and 1 other than 12:00.
- **Rounding too early**: keep $\frac{60}{11}$ as a fraction until the end.

Connects to: [modular arithmetic for puzzles](#/concept/math.number-theory.modular-arithmetic-for-puzzles), [time, speed and distance](#/concept/apt.quant.time-speed-and-distance). Practice: [Clock hands at 3:15](#/problems/q-clock) and [When the hands meet](#/problems/q-hands-meet).

### questions
Q: How do you compute the angle between the hands at h hours and m minutes?
A: The hour hand is at 30h + 0.5m degrees and the minute hand at 6m, so the angle is the absolute value of 30h - 5.5m, taking 360 minus it if it exceeds 180.

Q: How often do the hour and minute hands coincide?
A: Every 720/11 minutes, about 65.45 minutes, because the minute hand gains 5.5 degrees a minute and must gain 360. That is 11 times in 12 hours and 22 times a day.

Q: At what times between 4 and 5 are the hands at right angles?
A: At 4 and 60/11 minutes (about 4:05:27) and at 4 and 420/11 minutes (about 4:38:11), where 120 minus 5.5m equals plus or minus 90.

Q: How many times a day are the hands at right angles?
A: 44. In each of the 22 laps of the minute hand relative to the hour hand, the angle passes 90 degrees twice.
