---
topic: prob.markov
name: "Markov chains and random walks"
subject: prob
order: 5
prereqs: [prob.expected-value, math.linear-algebra]
---

## prob.markov.markov-chains
name: "Markov chains"
importance: important
scope: "states, transition matrices, the Markov property"

### simple
A Markov chain is a system that hops between states, where the chance of the next state depends only on the current one, not on how it got there. Tomorrow's weather modeled only from today's weather is the classic example. A table of hopping probabilities, the transition matrix, describes everything, and multiplying it by itself predicts several steps ahead.

### interview
- **States** $1..m$ and a **transition matrix** $P$ with $P_{ij} = P(X_{t+1} = j \mid X_t = i)$; each row sums to 1.
- **Markov property**: given the present state, the future is independent of the past.
- **$n$-step transitions**: $P(X_{t+n} = j \mid X_t = i) = (P^n)_{ij}$; a starting distribution row vector $\mu$ evolves as $\mu P^n$.
- Classifying states: **absorbing** (never leaves), **transient** (eventually left for good), **recurrent**; **irreducible** chains can reach every state from every state; **periodic** chains return only at multiples of some $d > 1$.
- Many interview problems are Markov chains in disguise: coin patterns, gambler's ruin, board games, queues, the weather.
- If the next step depends on the last two states, enlarge the state to the pair; almost anything can be made Markov that way.

### deep
#### Worked example: weather

Model the weather as sunny (S) or rainy (R) with

$$P = \begin{pmatrix} 0.8 & 0.2 \\ 0.4 & 0.6 \end{pmatrix}$$

(row = today, column = tomorrow). If today is sunny, the chance of rain the day after tomorrow sums over tomorrow's weather:

$$(P^2)_{SR} = 0.8 \cdot 0.2 + 0.2 \cdot 0.6 = 0.28.$$

$P^2 = \begin{pmatrix} 0.72 & 0.28 \\ 0.56 & 0.44 \end{pmatrix}$. As $n$ grows, both rows of $P^n$ approach $(\frac{2}{3}, \frac{1}{3})$: the chain forgets where it started, converging to its [stationary distribution](#/concept/prob.markov.stationary-distributions). The gap shrinks by the second eigenvalue, $0.8 + 0.6 - 1 = 0.4$, each day.

#### Code: matrix powers against simulated paths

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

using Mat = array<array<double, 2>, 2>;
Mat mul(const Mat& a, const Mat& b) {
    Mat c{};
    for (int i = 0; i < 2; ++i)
        for (int j = 0; j < 2; ++j)
            for (int k = 0; k < 2; ++k) c[i][j] += a[i][k] * b[k][j];
    return c;
}

int main() {
    const Mat P = {{{0.8, 0.2}, {0.4, 0.6}}};    // 0 = sunny, 1 = rainy
    Mat Pn = P;
    for (int n = 2; n <= 10; ++n) {
        Pn = mul(Pn, P);
        if (n == 2 || n == 5 || n == 10)
            printf("P^%-2d: sunny row (%.5f, %.5f), rainy row (%.5f, %.5f)\n", n, Pn[0][0],
                   Pn[0][1], Pn[1][0], Pn[1][1]);
    }
    const long paths = 1'000'000;
    long rainDay2 = 0, rainDay10 = 0;
    for (long t = 0; t < paths; ++t) {
        int state = 0;                           // start sunny
        for (int day = 1; day <= 10; ++day) {
            state = u01() < P[state][1] ? 1 : 0;
            if (day == 2) rainDay2 += state;
        }
        rainDay10 += state;
    }
    printf("from sunny: P(rain on day 2) exact 0.28000, simulated %.5f\n",
           double(rainDay2) / paths);
    printf("from sunny: P(rain on day 10) exact %.5f, simulated %.5f\n",
           (1 - pow(0.4, 10)) / 3, double(rainDay10) / paths);
}
```

Output:

```text
P^2 : sunny row (0.72000, 0.28000), rainy row (0.56000, 0.44000)
P^5 : sunny row (0.67008, 0.32992), rainy row (0.65984, 0.34016)
P^10: sunny row (0.66670, 0.33330), rainy row (0.66660, 0.33340)
from sunny: P(rain on day 2) exact 0.28000, simulated 0.28042
from sunny: P(rain on day 10) exact 0.33330, simulated 0.33300
```

The powers of $P$ show both rows converging to $(\frac{2}{3}, \frac{1}{3})$, and a million simulated ten-day paths agree with the matrix values to within about one standard error (0.0005). The closed form used for day 10 comes from the eigen-decomposition of a two-state chain: $P(\text{rain on day } n \mid \text{sunny today}) = \frac{1}{3}(1 - 0.4^n)$.

#### Modeling tips

- **Choose states so the future depends only on them.** For "two sunny days in a row makes rain less likely", use states (yesterday, today).
- **Check rows sum to 1**; columns need not.
- **Absorbing states** turn questions into "which end, and how long": see [absorbing chains](#/concept/prob.markov.absorbing-chains).

Connects to: [stationary distributions](#/concept/prob.markov.stationary-distributions), [eigenvalues and eigenvectors](#/concept/math.linear-algebra.eigenvalues-and-eigenvectors), [first-step analysis](#/concept/prob.expected-value.first-step-analysis).

### questions
Q: What is the Markov property?
A: Given the current state, the next state is independent of the earlier history. All the information needed to predict the future is contained in the present state.

Q: How do you compute the probability of being in state j after n steps from state i?
A: Take the (i, j) entry of the n-th power of the transition matrix. For a starting distribution given as a row vector, multiply it by the matrix n times.

Q: In a weather chain where sunny stays sunny with probability 0.8 and rainy stays rainy with probability 0.6, what is the chance of rain two days after a sunny day?
A: 0.8 times 0.2 plus 0.2 times 0.6, which is 0.28: sum over tomorrow being sunny or rainy.

Q: What if the next state depends on the last two states?
A: Enlarge the state to the pair of the last two states. The process on pairs is then a Markov chain, at the cost of more states.

Q: What do absorbing, transient and recurrent states mean?
A: An absorbing state is never left once entered. A transient state is visited only finitely many times with probability 1, because the chain eventually leaves it for good. A recurrent state is returned to with probability 1, infinitely often.

## prob.markov.absorbing-chains
name: "Absorbing chains"
importance: important
prereqs: [prob.markov.markov-chains]
scope: "absorption probabilities and expected steps"

### simple
An absorbing Markov chain has states it can never leave, like "game over", and the natural questions are which ending you reach and how long it takes. A tennis game at deuce bounces between deuce and advantage until someone wins two points in a row. Linear algebra answers both questions for any chain at once.

### interview
- Order states as transient first, then absorbing: $P = \begin{pmatrix} Q & R \\ 0 & I \end{pmatrix}$, where $Q$ holds transient-to-transient moves and $R$ transient-to-absorbing ones.
- **Fundamental matrix** $N = (I - Q)^{-1}$: $N_{ij}$ is the expected number of visits to transient state $j$ starting from $i$.
- **Expected steps to absorption**: $t = N\mathbf{1}$ (row sums of $N$).
- **Absorption probabilities**: $B = NR$; $B_{ik}$ is the probability of ending in absorbing state $k$ from $i$.
- The same numbers come from first-step analysis; the matrix form scales to many states and to code.
- Examples: deuce in tennis, gambler's ruin, board games with a finish square, coin-pattern races.

### deep
#### Worked example: deuce in tennis

A player wins each point with probability $p = 0.6$ (independently; $q = 0.4$). From deuce, winning a point gives advantage; from advantage, winning wins the game and losing returns to deuce. Transient states: Deuce, Adv-A, Adv-B; absorbing: A wins, B wins.

By first-step analysis with $w$ = P(A wins from deuce): $w = p \cdot (p + q w) + q \cdot (p w)$, so $w = \frac{p^2}{1 - 2pq} = \frac{p^2}{p^2 + q^2} = \frac{0.36}{0.52} = \frac{9}{13} \approx 0.6923$. Every two points from deuce, the game ends with probability $p^2 + q^2 = 0.52$ or returns to deuce, so the expected number of points is $\frac{2}{0.52} = \frac{50}{13} \approx 3.846$.

The matrix route gives the same:

$$Q = \begin{pmatrix} 0 & 0.6 & 0.4 \\ 0.4 & 0 & 0 \\ 0.6 & 0 & 0 \end{pmatrix}, \quad R = \begin{pmatrix} 0 & 0 \\ 0.6 & 0 \\ 0 & 0.4 \end{pmatrix}.$$

#### Code: fundamental matrix and simulation

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

using Mat = vector<vector<double>>;
Mat inverse(Mat a) {                             // Gauss-Jordan elimination
    int n = int(a.size());
    Mat inv(n, vector<double>(n));
    for (int i = 0; i < n; ++i) inv[i][i] = 1;
    for (int c = 0; c < n; ++c) {
        int p = c;
        for (int r = c + 1; r < n; ++r) if (fabs(a[r][c]) > fabs(a[p][c])) p = r;
        swap(a[c], a[p]), swap(inv[c], inv[p]);
        double d = a[c][c];
        for (int k = 0; k < n; ++k) a[c][k] /= d, inv[c][k] /= d;
        for (int r = 0; r < n; ++r) {
            if (r == c) continue;
            double f = a[r][c];
            for (int k = 0; k < n; ++k) a[r][k] -= f * a[c][k], inv[r][k] -= f * inv[c][k];
        }
    }
    return inv;
}

int main() {
    const double p = 0.6, q = 0.4;
    Mat Q = {{0, p, q}, {q, 0, 0}, {p, 0, 0}};   // Deuce, Adv-A, Adv-B
    Mat R = {{0, 0}, {p, 0}, {0, q}};            // to "A wins", "B wins"
    Mat I_Q(3, vector<double>(3));
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j) I_Q[i][j] = (i == j) - Q[i][j];
    Mat N = inverse(I_Q);
    double steps = N[0][0] + N[0][1] + N[0][2], winA = 0;
    for (int k = 0; k < 3; ++k) winA += N[0][k] * R[k][0];
    printf("from deuce: visits to deuce %.4f, expected points %.4f (50/13 = %.4f)\n", N[0][0],
           steps, 50.0 / 13);
    printf("from deuce: P(A wins) %.5f (9/13 = %.5f)\n", winA, 9.0 / 13);

    const long games = 1'000'000;
    long aWins = 0, points = 0;
    for (long g = 0; g < games; ++g) {
        int lead = 0;                            // -1, 0 or +1: B advantage, deuce, A advantage
        while (lead > -2 && lead < 2) {
            lead += u01() < p ? 1 : -1;
            ++points;
        }
        aWins += lead == 2;
    }
    printf("simulated: P(A wins) %.5f, expected points %.4f\n", double(aWins) / games,
           double(points) / games);
}
```

Output:

```text
from deuce: visits to deuce 1.9231, expected points 3.8462 (50/13 = 3.8462)
from deuce: P(A wins) 0.69231 (9/13 = 0.69231)
simulated: P(A wins) 0.69251, expected points 3.8464
```

The fundamental matrix gives exactly $\frac{9}{13}$ and $\frac{50}{13}$, and a million simulated deuce games agree to within half a standard error. The expected number of visits to deuce, $N_{11} = \frac{1}{0.52} \approx 1.923$, counts the starting visit, which is why the expected number of points is twice it.

#### Pitfalls

- **Forgetting the starting visit**: $N_{ii} \ge 1$ counts time zero.
- **Singular $I - Q$** means some transient states can never reach absorption; check that every transient state can reach an absorbing one.
- **Rows versus columns**: $B = NR$ multiplies in that order, with rows indexed by the starting state.

Connects to: [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [gambler's ruin](#/concept/prob.markov.gamblers-ruin), [determinants and inverses](#/concept/math.linear-algebra.determinants-and-inverses).

### questions
Q: What is the fundamental matrix of an absorbing Markov chain?
A: N equals the inverse of I minus Q, where Q is the transition matrix restricted to transient states. Its (i, j) entry is the expected number of visits to transient state j starting from i, including the start.

Q: How do you get absorption probabilities and expected absorption times from N?
A: The expected number of steps before absorption from each state is the row sum of N, and the matrix of absorption probabilities is N times R, where R holds the transient-to-absorbing transition probabilities.

Q: In tennis, a player wins each point with probability 0.6. What is the chance of winning the game from deuce?
A: p squared over p squared plus q squared, which is 0.36 over 0.52, or 9 thirteenths, about 0.69, assuming points are independent.

Q: How many points does a game last on average from deuce with p equal to 0.6?
A: Every two points, the game ends with probability 0.52 or returns to deuce, so the expected number of points is 2 over 0.52, about 3.85.

Q: How does the matrix method relate to first-step analysis?
A: They solve the same linear equations: first-step analysis writes them state by state, and the fundamental matrix solves them all at once, which is easier to program for many states.

## prob.markov.gamblers-ruin
name: "Gambler's ruin"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "probability of ruin, expected duration"

### simple
In gambler's ruin, a player bets one unit at a time until they either reach a target or run out of money. With a fair coin, your chance of reaching the target is simply your stake divided by the target: start with 3 and aim for 10, and you succeed 3 times in 10. With even a slight disadvantage, the odds of a long run turn sharply against you.

### interview
- Bankroll $i$, target $N$, each bet wins 1 with probability $p$ and loses 1 with $q = 1 - p$, independently; stop at 0 or $N$.
- **Fair game** ($p = \frac{1}{2}$): $P(\text{reach } N) = \frac{i}{N}$; **expected duration** $i(N - i)$.
- **Unfair game**: with $r = \frac{q}{p}$, $P(\text{reach } N) = \frac{1 - r^i}{1 - r^N}$.
- With $p$ slightly below $\frac{1}{2}$, large targets are nearly hopeless: at $p = 0.49$, starting at 50 of 100 succeeds only about 12% of the time, while at 5 of 10 it is 45%.
- Derivation: first-step analysis $P_i = pP_{i+1} + qP_{i-1}$ with $P_0 = 0$, $P_N = 1$; or a martingale argument (fair game: expected wealth stays $i$, so $N \cdot P = i$).
- Against an infinitely rich opponent with $p \le \frac{1}{2}$, ruin is certain.

### deep
#### Deriving the fair case

Let $P_i$ be the probability of reaching $N$ from $i$. First-step analysis gives $P_i = \frac{1}{2}P_{i+1} + \frac{1}{2}P_{i-1}$, so the differences $P_{i+1} - P_i$ are all equal: $P_i$ is linear in $i$, and the boundary values $P_0 = 0$, $P_N = 1$ force $P_i = \frac{i}{N}$. For the duration, $D_i = 1 + \frac{1}{2}D_{i+1} + \frac{1}{2}D_{i-1}$ with $D_0 = D_N = 0$ is solved by $D_i = i(N - i)$.

With 3 of 10: success $\frac{3}{10}$, expected $3 \cdot 7 = 21$ bets.

#### The unfair case

Now $P_i = pP_{i+1} + qP_{i-1}$ gives $P_{i+1} - P_i = r(P_i - P_{i-1})$ with $r = \frac{q}{p}$: geometric differences, so $P_i = \frac{1 - r^i}{1 - r^N}$ when $r \ne 1$. The expected duration is

$$D_i = \frac{i}{q - p} - \frac{N}{q - p}\cdot\frac{1 - r^i}{1 - r^N}.$$

At $p = 0.49$ (a small house edge, like roulette's even-money bets at about 0.486), halving the stakes does not help you; *bold play*, fewer and larger bets, is better when the odds are against you.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

pair<double, double> exact(int i, int N, double p) {    // P(reach N), expected bets
    double q = 1 - p;
    if (p == 0.5) return {double(i) / N, double(i) * (N - i)};
    double r = q / p, win = (1 - pow(r, i)) / (1 - pow(r, N));
    return {win, i / (q - p) - N / (q - p) * win};
}

void simulate(int i, int N, double p, long games) {
    long wins = 0;
    double bets = 0;
    for (long g = 0; g < games; ++g) {
        int x = i;
        while (x > 0 && x < N) {
            x += u01() < p ? 1 : -1;
            bets += 1;
        }
        wins += x == N;
    }
    auto [w, d] = exact(i, N, p);
    printf("%2d of %3d, p %.2f: win exact %.5f sim %.5f; bets exact %6.1f sim %6.1f\n", i, N,
           p, w, double(wins) / games, d, bets / games);
}

int main() {
    simulate(3, 10, 0.5, 1'000'000);
    simulate(5, 10, 0.49, 1'000'000);
    simulate(50, 100, 0.49, 100'000);
    simulate(50, 100, 0.5, 100'000);
}
```

Output:

```text
 3 of  10, p 0.50: win exact 0.30000 sim 0.30054; bets exact   21.0 sim   21.0
 5 of  10, p 0.49: win exact 0.45016 sim 0.44918; bets exact   24.9 sim   24.9
50 of 100, p 0.49: win exact 0.11917 sim 0.12230; bets exact 1904.1 sim 1905.4
50 of 100, p 0.50: win exact 0.50000 sim 0.50005; bets exact 2500.0 sim 2504.8
```

The fair games and the 5-to-10 game land within about 2 standard errors of the formulas, and every simulated duration is within one. The 50-to-100 game at $p = 0.49$ came out 0.1223 against the exact 0.1192, 3.1 standard errors high: rare, so it was checked twice more. Solving the equations $P_i = pP_{i+1} + qP_{i-1}$ by direct iteration gives 0.119175, the same as the closed form, and repeating the simulation with 40 other seeds gave errors averaging zero with the expected spread. This run was unlucky, which is a useful reminder that one simulation checks a formula only up to its noise.

#### Pitfalls

- **Using $\frac{i}{N}$ for unfair games**: it overstates your chances, dramatically for big targets.
- **Expecting to "grind out" a small edge against you**: more bets means more exposure to the negative drift; the duration formula shows long games are the norm.
- **Infinite targets**: with $p > \frac{1}{2}$ the probability of never going broke is $1 - r^i$, positive; with $p \le \frac{1}{2}$ it is 0.

Connects to: [random walks](#/concept/prob.markov.random-walks), [martingales](#/concept/prob.stochastic.martingales), [variance and risk of ruin](#/concept/markets.betting.variance-and-risk-of-ruin).

### questions
Q: You start with 3 and bet 1 on fair coin flips until you have 0 or 10. What is the probability you reach 10?
A: 3 tenths. In a fair game the probability of reaching the target is linear in the bankroll, i over N, which also follows from expected wealth staying constant.

Q: How long does that game last on average?
A: i times N minus i, which is 3 times 7, or 21 bets.

Q: What is the probability of reaching N from i when each bet is won with probability p not equal to one half?
A: With r equal to q over p, it is 1 minus r to the i, over 1 minus r to the N. For p equal to 0.49, starting at 50 with target 100, that is only about 0.12.

Q: Why is betting against a house edge in many small bets worse than a few large ones?
A: Each bet has negative expected value, and many small bets let the negative drift act for a long time while reducing the variance that could carry you to the target. Bold play keeps the number of bets small.

Q: How can gambler's ruin be solved with a martingale?
A: In a fair game your wealth is a martingale, so its expected value at the stopping time equals the start, i. The final wealth is N with probability P and 0 otherwise, so N times P equals i and P equals i over N.

## prob.markov.stationary-distributions
name: "Stationary distributions"
importance: important
prereqs: [prob.markov.markov-chains]
scope: "long-run behavior"

### simple
A stationary distribution describes where a Markov chain spends its time in the long run. If the weather model says sunny days follow sunny days often, then over years about two thirds of days might be sunny, whatever today is. Once the chain is in its stationary distribution, one more step leaves the proportions unchanged.

### interview
- A row vector $\pi$ with $\pi P = \pi$, $\pi_i \ge 0$ and $\sum_i \pi_i = 1$; solve the linear equations, replacing one of them by the normalization.
- **Two states** with $P(1 \to 2) = a$ and $P(2 \to 1) = b$: $\pi = \left(\frac{b}{a + b}, \frac{a}{a + b}\right)$.
- For a finite, **irreducible, aperiodic** chain, $\pi$ is unique and $P(X_n = j) \to \pi_j$ from any start; the long-run fraction of time in $j$ is $\pi_j$ (irreducible is enough for that), and the expected return time to $j$ is $\frac{1}{\pi_j}$.
- **Detailed balance** $\pi_i P_{ij} = \pi_j P_{ji}$ implies stationarity and is often easier to solve (reversible chains, birth-death chains).
- A random walk on an undirected graph has $\pi_v \propto \deg(v)$. PageRank is the stationary distribution of a random surfer.
- Periodic chains (a walk alternating between two sides) have $\pi$ but don't converge to it step by step.

### deep
#### Worked example: the weather again

With $P(S \to R) = 0.2$ and $P(R \to S) = 0.4$: $\pi = \left(\frac{0.4}{0.6}, \frac{0.2}{0.6}\right) = \left(\frac{2}{3}, \frac{1}{3}\right)$. Check: $\frac{2}{3} \cdot 0.8 + \frac{1}{3} \cdot 0.4 = \frac{2}{3}$. The expected time between rainy days is $\frac{1}{\pi_R} = 3$ days.

#### Worked example: a random walk on a small graph

A walker moves each step to a uniformly random neighbor on the graph with edges A–B, A–C, B–C, C–D. Degrees are A 2, B 2, C 3, D 1, total 8, so $\pi = \left(\frac{2}{8}, \frac{2}{8}, \frac{3}{8}, \frac{1}{8}\right)$ by the degree rule (detailed balance holds: $\frac{\deg u}{8}\cdot\frac{1}{\deg u} = \frac{1}{8}$ in both directions of every edge). The expected return time to D is 8 steps.

#### Code: solve, iterate and simulate

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    // Graph A-B, A-C, B-C, C-D as adjacency lists: 0 = A, 1 = B, 2 = C, 3 = D.
    vector<vector<int>> adj = {{1, 2}, {0, 2}, {0, 1, 3}, {2}};
    const int n = 4;
    vector<double> pi(n, 0.25);                  // power iteration: pi <- pi P
    for (int it = 0; it < 200; ++it) {
        vector<double> next(n, 0);
        for (int u = 0; u < n; ++u)
            for (int v : adj[u]) next[v] += pi[u] / adj[u].size();
        pi = next;
    }
    long visits[4] = {}, returns = 0, stepsBetween = 0;
    int at = 0;
    long lastD = -1;
    const long steps = 4'000'000;
    for (long s = 0; s < steps; ++s) {
        at = adj[at][rng() % adj[at].size()];
        ++visits[at];
        if (at == 3) {
            if (lastD >= 0) { ++returns; stepsBetween += s - lastD; }
            lastD = s;
        }
    }
    const char* names = "ABCD";
    for (int v = 0; v < n; ++v)
        printf("%c: degree rule %.5f  power iteration %.5f  time share %.5f\n", names[v],
               double(adj[v].size()) / 8, pi[v], double(visits[v]) / steps);
    printf("mean return time to D: exact 8, simulated %.4f\n", double(stepsBetween) / returns);
}
```

Output:

```text
A: degree rule 0.25000  power iteration 0.25000  time share 0.24989
B: degree rule 0.25000  power iteration 0.25000  time share 0.24998
C: degree rule 0.37500  power iteration 0.37500  time share 0.37512
D: degree rule 0.12500  power iteration 0.12500  time share 0.12502
mean return time to D: exact 8, simulated 7.9989
```

The degree rule, 200 steps of power iteration and the share of 4 million simulated steps agree to within 0.0002, and the simulated mean return time to D is 7.999.

#### Pitfalls

- **Periodicity**: on a bipartite graph (say, a square A–B–C–D–A), the walk alternates sides, so $P(X_n = A)$ oscillates; the time average still converges to $\pi$.
- **Reducible chains** can have several stationary distributions, one per closed class; the long run depends on where you start.
- **Absorbing chains** put all stationary mass on absorbing states, which is why they are studied differently ([absorbing chains](#/concept/prob.markov.absorbing-chains)).

Connects to: [Markov chains](#/concept/prob.markov.markov-chains), [eigenvalues and eigenvectors](#/concept/math.linear-algebra.eigenvalues-and-eigenvectors), [law of large numbers](#/concept/prob.limits.law-of-large-numbers).

### questions
Q: What is a stationary distribution of a Markov chain?
A: A probability vector pi with pi P equal to pi: if the chain starts in pi, it stays in pi after every step. For irreducible chains it gives the long-run fraction of time spent in each state.

Q: What is the stationary distribution of a two-state chain that moves from state 1 to 2 with probability a and from 2 to 1 with probability b?
A: b over a plus b for state 1 and a over a plus b for state 2, which balances the flows a pi1 and b pi2 between the two states.

Q: When does a Markov chain converge to its stationary distribution?
A: A finite chain that is irreducible and aperiodic converges from any starting state. A periodic chain keeps oscillating, although its long-run time averages still match the stationary distribution.

Q: What is the stationary distribution of a random walk on an undirected graph?
A: Each vertex's probability is its degree divided by twice the number of edges, which satisfies detailed balance on every edge.

Q: How is the stationary probability related to return times?
A: For an irreducible chain the expected time to return to state j, starting from j, is 1 over pi j. A state visited a third of the time is returned to every three steps on average.

## prob.markov.random-walks
name: "Random walks"
importance: important
prereqs: [prob.markov.gamblers-ruin]
scope: "symmetric walks, return probability, hitting times"

### simple
A random walk takes steps of plus or minus one at random, like a person flipping a coin at every corner to decide whether to walk left or right. After n steps the walker is typically about the square root of n away from the start, not n. On a line or a flat grid the walker is sure to come back home eventually, but in three dimensions there is a real chance of wandering off forever.

### interview
- Simple symmetric walk: $S_n = X_1 + \dots + X_n$ with independent $X_i = \pm 1$ equally likely. $E[S_n] = 0$, $\text{Var}(S_n) = n$, so typical distance $\approx \sqrt{n}$; $E|S_n| \approx \sqrt{\frac{2n}{\pi}}$.
- **Being at 0**: $P(S_{2n} = 0) = \binom{2n}{n}4^{-n} \approx \frac{1}{\sqrt{\pi n}}$.
- **Recurrence (Pólya)**: the walk returns to its start with probability 1 in one and two dimensions, but only about 0.3405 in three.
- **Hitting times**: the walk reaches +1 with probability 1, yet the expected time to get there is infinite; with absorbing barriers you get [gambler's ruin](#/concept/prob.markov.gamblers-ruin).
- **Reflection principle**: paths that touch a level can be reflected there, giving $P(\max_{k \le n} S_k \ge a) = 2P(S_n > a) + P(S_n = a)$ and the ballot theorem.
- A surprising identity: the chance of no return to 0 in the first $2n$ steps equals $P(S_{2n} = 0)$.

### deep
#### Distance grows like $\sqrt{n}$

Each step adds variance 1 and the steps are independent, so $\text{Var}(S_n) = n$. For $n = 100$ the walk is typically about 10 away, and exactly

$$E|S_{2m}| = 2m\binom{2m}{m}4^{-m}, \qquad E|S_{100}| = 100 \cdot 0.0795892 = 7.95892,$$

close to $\sqrt{200/\pi} \approx 7.979$.

#### Being back at zero

$P(S_{100} = 0) = \binom{100}{50}2^{-100} \approx 0.0795892$. The identity above says the walk avoids 0 throughout steps 1 to 100 with that same probability, so it returns at least once within 100 steps with probability $1 - 0.0795892 \approx 0.9204$.

#### Reaching a level

$P(\max_{k \le 100} S_k \ge 10) = 2P(S_{100} > 10) + P(S_{100} = 10)$: every path that ends above 10 has a mirror image (reflected after its first visit to 10) that ends below 10, and both touched 10.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

double choose(int n, int k) {                    // via logs, to avoid overflow
    return exp(lgamma(n + 1.0) - lgamma(k + 1.0) - lgamma(n - k + 1.0));
}

int main() {
    const int steps = 100;
    double atZero = choose(100, 50) / pow(2.0, 100), meanAbs = steps * atZero;
    double above10 = 0;                          // P(S_100 > 10): S = 2k - 100 > 10
    for (int k = 56; k <= 100; ++k) above10 += choose(100, k) / pow(2.0, 100);
    double exactMax = 2 * above10 + choose(100, 55) / pow(2.0, 100);
    const long walks = 1'000'000;
    long zero = 0, returned = 0, reached = 0;
    double sumAbs = 0;
    for (long w = 0; w < walks; ++w) {
        int s = 0, best = 0;
        bool back = false;
        for (int i = 0; i < steps; ++i) {
            s += (rng() & 1) ? 1 : -1;
            back |= s == 0;
            best = max(best, s);
        }
        zero += s == 0, returned += back, reached += best >= 10, sumAbs += abs(s);
    }
    printf("P(S_100 = 0):            exact %.5f  simulated %.5f\n", atZero, double(zero) / walks);
    printf("E|S_100|:                exact %.5f  simulated %.5f\n", meanAbs, sumAbs / walks);
    printf("returns within 100:      exact %.5f  simulated %.5f\n", 1 - atZero,
           double(returned) / walks);
    printf("max reaches 10:          exact %.5f  simulated %.5f\n", exactMax,
           double(reached) / walks);
}
```

Output:

```text
P(S_100 = 0):            exact 0.07959  simulated 0.07953
E|S_100|:                exact 7.95892  simulated 7.95497
returns within 100:      exact 0.92041  simulated 0.92050
max reaches 10:          exact 0.31973  simulated 0.31878
```

All four simulated values are within about 2 standard errors of the exact ones: the walk ends at 0 about 8% of the time, returns at least once within 100 steps 92% of the time, and ends about 8 steps from home on average.

#### Pitfalls

- **Expecting the walk to balance out**: after a run of +1 steps the walk is not pulled back; its future is a fresh walk from where it stands (no mean reversion).
- **Infinite expected hitting time** despite certain hitting: most paths hit +1 quickly, but rare long excursions below 0 make the average diverge.
- **The arcsine law**: the fraction of time a walk spends positive is more likely near 0 or 1 than near one half; long leads are normal, not evidence of skill.

Connects to: [gambler's ruin](#/concept/prob.markov.gamblers-ruin), [Brownian motion intuition](#/concept/prob.stochastic.brownian-motion-intuition), [central limit theorem](#/concept/prob.limits.central-limit-theorem).

### questions
Q: How far does a simple symmetric random walk typically get in n steps?
A: About the square root of n: the position has mean 0 and variance n, and the expected absolute distance is about the square root of 2n over pi. After 100 steps that is about 8.

Q: What is the probability that a simple random walk is back at 0 after 2n steps?
A: 2n choose n over 4 to the n, about 1 over the square root of pi n for large n. After 100 steps it is about 0.08.

Q: Does a random walk always return to its starting point?
A: In one and two dimensions it returns with probability 1; in three dimensions only with probability about 0.34. This is Pólya's recurrence theorem.

Q: A symmetric walk on the integers starts at 0. Will it reach +1, and how long does it take on average?
A: It reaches +1 with probability 1, but the expected time is infinite, because rare paths wander far below 0 for a very long time before coming back.

Q: What is the reflection principle?
A: For a symmetric walk, the paths that reach a level a and end below it correspond one to one with paths that end above it, by reflecting the part after the first visit to a. This gives the distribution of the walk's maximum from the distribution of its endpoint.
