---
topic: puzzles.method
name: "Puzzle-solving method"
subject: puzzles
order: 1
prereqs: []
---

## puzzles.method.how-to-attack-a-brainteaser
name: "How to attack a brainteaser"
importance: must
scope: "small cases, symmetry, working backwards, invariants"

### simple
A brainteaser looks new, but most give way to a few standard moves: try tiny versions, look for symmetry, work backwards from the goal, or find something that never changes. The skill is trying these moves on purpose instead of waiting for inspiration. Small cases are the safest first move, because patterns show up quickly.

### interview
- **Pin down the rules** first: what is a move, what do you know, what exactly is asked (a number, a strategy, a proof)?
- **Small cases**: solve sizes 1, 2, 3, 4, find the pattern, then prove it (often by [induction](#/concept/math.proofs.induction)).
- **Symmetry**: equal roles get equal answers; a mirror strategy wins many games.
- **Work backwards** from the end: last moves in games, the final state of a process, the smallest group of pirates.
- **Invariants and parity**: find what no move can change to prove "impossible".
- **Count information or extremes**: three outcomes per weighing, the worst case, the pigeonhole principle.
- **Check**: plug the answer into a small case, simulate it, and ask whether its size makes sense.

### deep
#### The toolkit

| move | reach for it when | example |
|---|---|---|
| small cases | the problem has a size $n$ | [Catalan numbers](#/concept/math.combinatorics.catalan-numbers) |
| symmetry | players, positions or outcomes look interchangeable | [symmetry and extremal principle](#/concept/math.proofs.symmetry-and-extremal-principle) |
| work backwards | there is a final move or a last round | [pirates and backward induction](#/concept/puzzles.logic.pirates-and-backward-induction) |
| invariants | "can this ever happen?" | [invariants and monovariants](#/concept/math.proofs.invariants-and-monovariants) |
| information count | "fewest weighings, tests or questions" | [weighing puzzles](#/concept/puzzles.logic.weighing-puzzles) |
| change the viewpoint | the direct count is messy | count lines instead of squares, ghosts instead of ants |
| brute force | the space is small enough to list | a quick table or a program |

When nothing is obvious, go down the table in order; small cases alone crack a large share of interview puzzles.

#### Worked example: squares on a chessboard

*How many squares of any size can you find on an 8 by 8 chessboard?*

1. **Clarify**: squares of every size from 1 by 1 to 8 by 8, aligned with the grid.
2. **Small cases**: a 1 by 1 board has 1. A 2 by 2 board has 4 small squares and 1 big one: 5. A 3 by 3 board has $9 + 4 + 1 = 14$.
3. **Pattern**: on an $n$ by $n$ board, a $k$ by $k$ square can start in $n - k + 1$ columns and $n - k + 1$ rows, so there are $(n - k + 1)^2$ of them. The total is $1^2 + 2^2 + \dots + n^2$.
4. **Answer**: by the [sum of squares](#/concept/math.number-theory.series-and-sums), $\frac{8 \cdot 9 \cdot 17}{6} = 204$.
5. **Extend by changing the viewpoint**: rectangles. A rectangle is fixed by choosing 2 of the 9 vertical grid lines and 2 of the 9 horizontal ones, so there are $\binom{9}{2}^2 = 36^2 = 1296$.

#### Checking by brute force

```cpp
int main() {
    for (int n = 1; n <= 8; ++n) {
        int squares = 0, rects = 0;
        for (int r1 = 0; r1 < n; ++r1)                 // top-left and bottom-right cells
            for (int c1 = 0; c1 < n; ++c1)
                for (int r2 = r1; r2 < n; ++r2)
                    for (int c2 = c1; c2 < n; ++c2) {
                        ++rects;
                        squares += r2 - r1 == c2 - c1;
                    }
        int lines = (n + 1) * n / 2;                   // C(n + 1, 2)
        printf("n=%d: squares %3d (formula %3d), rectangles %4d (formula %4d)\n", n, squares,
               n * (n + 1) * (2 * n + 1) / 6, rects, lines * lines);
    }
}
```

Output:

```text
n=1: squares   1 (formula   1), rectangles    1 (formula    1)
n=2: squares   5 (formula   5), rectangles    9 (formula    9)
n=3: squares  14 (formula  14), rectangles   36 (formula   36)
n=4: squares  30 (formula  30), rectangles  100 (formula  100)
n=5: squares  55 (formula  55), rectangles  225 (formula  225)
n=6: squares  91 (formula  91), rectangles  441 (formula  441)
n=7: squares 140 (formula 140), rectangles  784 (formula  784)
n=8: squares 204 (formula 204), rectangles 1296 (formula 1296)
```

Listing every pair of corners agrees with both formulas on every board size up to 8.

#### When you are stuck

- **Shrink it**: fewer coins, fewer floors, fewer players.
- **Relax a rule**: solve an easier version, then see which step breaks when the rule returns.
- **Guess and test**: propose an answer and look for a counterexample.
- **Look for the known shape**: many puzzles are a classic in disguise (a [binary code](#/concept/puzzles.logic.poisoned-bottles-and-binary-encoding), a [waiting time](#/concept/prob.expected-value.waiting-time-problems), [Nim](#/concept/puzzles.games.nim-and-impartial-games)).

#### Common mistakes

- **Answering a different question**: "fewest weighings to find the coin" and "fewest to find it and say whether it is heavy" differ.
- **Trusting a pattern without a reason**: $1, 2, 4, 8, 16$ can continue with 31 (points on a circle joined by chords); prove the pattern.
- **Stopping at the first answer**: an interviewer often asks for the general $n$ or a variant next.

Connects to: [communicating while solving](#/concept/puzzles.method.communicating-while-solving), [parity and invariants](#/concept/math.number-theory.parity-and-invariants), [Fermi estimation](#/concept/math.mental.fermi-estimation). Practice: [100 lockers](#/problems/q-lockers).

### questions
Q: What is your first move on an unfamiliar brainteaser?
A: Restate it to pin down the rules and the exact question, then try the smallest cases: size 1, 2, 3. Small cases expose the structure, suggest a pattern, and give checks for any general formula.

Q: How many squares of all sizes are on an 8 by 8 chessboard?
A: 204. A k by k square fits in (9 - k) squared positions, so the total is the sum of the squares from 1 to 64, which is 8 times 9 times 17 over 6.

Q: When should you work backwards?
A: When the problem has a clear end: the last move of a game, the final round of a vote, the last state of a process. Solving the end first often makes each earlier step forced.

Q: How do you prove something is impossible in a puzzle?
A: Find an invariant, a quantity that no move changes, such as a parity or a coloring count, and show the start and target disagree on it. Or count information: if a method has fewer possible outcomes than there are cases, it can't tell them all apart.

Q: How do you check a puzzle answer before giving it?
A: Plug it into a small case you can verify by hand, check its size and units, and, when possible, confirm it with a quick simulation or brute force.

## puzzles.method.communicating-while-solving
name: "Communicating while solving"
importance: must
prereqs: [puzzles.method.how-to-attack-a-brainteaser]
scope: "talking through the reasoning"

### simple
In a puzzle interview, the way you think counts as much as the answer. Say what you understand, what you are trying and why, so the interviewer can follow you and help if you drift. Treat it like solving at a whiteboard with a colleague, not like an exam.

### interview
- **Restate and clarify** before solving: the rules, the goal, anything ambiguous ("can the snail leave during the day?").
- **Announce a plan**: "I'll try small cases first, then look for a pattern."
- **Narrate checkpoints**, not every thought: the approach, key facts, intermediate results.
- **State assumptions** out loud, and give a quick first answer or bound before refining it.
- **When stuck**, say what you have ruled out and what you'll try next; take hints and use them.
- **Verify aloud** with a small case or sanity check, then give the final answer and the one-line reason.

### deep
#### Why it matters

An interviewer can't grade what they can't hear. A silent correct answer tells them little about how you would handle a new problem; a clear line of reasoning with a slip in arithmetic often scores better than a bare right answer. Talking also lets them give hints, which you can't get if you disappear into your head.

#### Worked example: the snail in the well

*A snail is at the bottom of a 10 meter well. Each day it climbs 3 meters, and each night it slides back 2. On which day does it get out?*

**A weak answer**: "It gains 1 meter a day, so 10 days." (Silent, no check, and wrong.)

**A strong answer, as it might be said**:

1. *Clarify*: "Once the snail reaches the top during a day, it's out and doesn't slide back, right?" (Yes.)
2. *Plan*: "The net gain is 1 meter a day, but the last day is special, because it doesn't slide back after reaching the top. So I'll look at when a day's climb reaches 10."
3. *Work*: "At the start of day $k$ it is at $k - 1$ meters. During that day it reaches $k + 2$. That is at least 10 when $k = 8$."
4. *Check a small case*: "With a 3 meter well it gets out on day 1, which the formula gives too: $k + 2 \ge 3$ at $k = 1$."
5. *Generalize*: "With climb $a$, slide $b$ and depth $d > a$, it's day $\left\lceil \frac{d - a}{a - b} \right\rceil + 1$."
6. *Summarize*: "Day 8, because the last climb doesn't slide back."

The naive 10 comes from treating the last day like the others, which is exactly the kind of edge a clarifying question exposes.

#### Checking the answer

```cpp
int simulate(int a, int b, int d) {              // climb a by day, slide b by night, depth d
    int pos = 0;
    for (int day = 1;; ++day) {
        pos += a;
        if (pos >= d) return day;
        pos -= b;
    }
}

int main() {
    printf("10 m well, 3 up, 2 down: out on day %d\n", simulate(3, 2, 10));
    int mismatches = 0, cases = 0;
    for (int a = 2; a <= 10; ++a)
        for (int b = 0; b < a; ++b)
            for (int d = a + 1; d <= 60; ++d, ++cases) {
                int formula = (d - a + (a - b) - 1) / (a - b) + 1;   // ceil((d - a)/(a - b)) + 1
                mismatches += formula != simulate(a, b, d);
            }
    printf("formula vs simulation: %d mismatches in %d cases\n", mismatches, cases);
}
```

Output:

```text
10 m well, 3 up, 2 down: out on day 8
formula vs simulation: 0 mismatches in 2856 cases
```

#### Phrases that help

- "Let me make sure I have the rules right: …"
- "My first guess is X; let me check it on a small case."
- "I'm assuming …; if that's wrong, the answer changes to …"
- "That approach doesn't work because …, so I'll try …"
- "To sanity-check: …"
- "So the answer is X, because …"

#### Common mistakes

- **Silence** for minutes, then an answer; or the opposite, narrating every half-thought without structure.
- **Ignoring a hint**: if the interviewer asks "what about the last day?", they are pointing at the bug.
- **Defending a wrong answer**: say "you're right, that breaks here" and fix it; recovering well is a strong signal.

Connects to: [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [Fermi estimation](#/concept/math.mental.fermi-estimation), [discussing trade-offs](#/concept/sysd.method.discussing-trade-offs).

### questions
Q: What should you do before starting to solve a puzzle in an interview?
A: Restate the problem in your own words and ask about anything ambiguous, such as whether the last step behaves like the others. A wrong reading of the rules is the most expensive mistake.

Q: What do you do when you get stuck?
A: Say what you have tried and why it fails, then name the next tool you will try, such as a smaller case or working backwards. That keeps the interviewer informed and invites a useful hint.

Q: On which day does a snail climbing 3 meters a day and slipping 2 each night leave a 10 meter well?
A: Day 8. It starts day 8 at 7 meters and climbs to 10 before any slide; treating every day as a net gain of 1 meter wrongly gives 10.

Q: How should you end your answer to a puzzle?
A: With a short summary: the answer and the key reason in a sentence or two, plus any assumption it depends on.
