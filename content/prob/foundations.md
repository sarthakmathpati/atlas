---
topic: prob.foundations
name: "Probability foundations"
subject: prob
order: 1
prereqs: [math.combinatorics]
---

## prob.foundations.sample-spaces-and-events
name: "Sample spaces and events"
importance: must
scope: "outcomes, events, complements, unions, intersections"

### simple
A sample space is the list of everything that can happen in an experiment, and an event is any group of those outcomes you care about. Rolling two dice has 36 possible outcomes, and "the dice sum to 7" is an event made of 6 of them. When all outcomes are equally likely, the probability of an event is just how many outcomes it contains divided by how many there are.

### interview
- **Sample space** $\Omega$: the set of all outcomes of one run of the experiment; an **event** is a subset of $\Omega$.
- With **equally likely** outcomes, $P(A) = \frac{|A|}{|\Omega|}$. Choosing a sample space whose outcomes really are equally likely (ordered pairs for two dice, not sums) is most of the work.
- Set operations: **complement** $A^c$ (not A), **union** $A \cup B$ (A or B or both), **intersection** $A \cap B$ (both). De Morgan: $(A \cup B)^c = A^c \cap B^c$.
- **Disjoint** (mutually exclusive) events share no outcomes: $A \cap B = \emptyset$.
- The complement is often the shortcut: "at least one" is $1 - P(\text{none})$.
- Pitfall: treating unequal outcomes as equally likely, such as "0, 1 or 2 heads" as three equally likely results of two flips.

### deep
#### Intuition

Probability questions become counting questions once the sample space is right. The rule of thumb for dice, coins and cards: keep outcomes **ordered and labeled** (first die, second die), because those are the outcomes that are equally likely. Sums, counts of heads and "same or different" are events built from them, not outcomes in their own right.

#### Worked example: two fair dice

The sample space is the 36 ordered pairs $(x, y)$ with $x, y \in \{1, \dots, 6\}$, all equally likely (the dice are fair and independent). Take

- $A$: the sum is 7, the outcomes $(1,6), (2,5), \dots, (6,1)$, so $|A| = 6$;
- $B$: the first die is even, $3 \times 6 = 18$ outcomes;
- $A \cap B$: sum 7 with an even first die: $(2,5), (4,3), (6,1)$, so 3 outcomes;
- $A \cup B$: $|A| + |B| - |A \cap B| = 6 + 18 - 3 = 21$;
- "no six at all": $5 \times 5 = 25$ outcomes, so "at least one six" has $36 - 25 = 11$.

| event | count | probability |
|---|---|---|
| $A$ | 6 | $\frac{1}{6}$ |
| $B$ | 18 | $\frac{1}{2}$ |
| $A \cap B$ | 3 | $\frac{1}{12}$ |
| $A \cup B$ | 21 | $\frac{7}{12}$ |
| at least one six | 11 | $\frac{11}{36}$ |

#### Checking by enumeration and simulation

The program counts the outcomes exactly, then rolls a million pairs with a fixed seed and compares. A simulation only estimates: with $N$ trials, its **standard error** is $\sqrt{p(1-p)/N}$, about 0.0004 here, so differences of that size are expected.

```cpp
mt19937_64 rng(2026);                            // fixed seed: the same run every time
int die() { return int(rng() % 6) + 1; }         // the % 6 bias on 64-bit numbers is negligible

void report(const char* what, int count, long hits, long n) {
    double exact = count / 36.0, p = double(hits) / n, se = sqrt(exact * (1 - exact) / n);
    printf("%-18s exact %2d/36 = %.5f  simulated %.5f  off by %.1f standard errors\n", what,
           count, exact, p, fabs(p - exact) / se);
}

int main() {
    int a = 0, b = 0, both = 0, either = 0, six = 0;
    for (int x = 1; x <= 6; ++x)                 // exact: count the 36 ordered outcomes
        for (int y = 1; y <= 6; ++y) {
            bool A = x + y == 7, B = x % 2 == 0;
            a += A, b += B, both += A && B, either += A || B, six += x == 6 || y == 6;
        }
    const long n = 1'000'000;
    long sa = 0, sb = 0, sboth = 0, seither = 0, ssix = 0;
    for (long i = 0; i < n; ++i) {               // simulation
        int x = die(), y = die();
        bool A = x + y == 7, B = x % 2 == 0;
        sa += A, sb += B, sboth += A && B, seither += A || B, ssix += x == 6 || y == 6;
    }
    report("A: sum is 7", a, sa, n);
    report("B: first is even", b, sb, n);
    report("A and B", both, sboth, n);
    report("A or B", either, seither, n);
    report("at least one six", six, ssix, n);
}
```

Output:

```text
A: sum is 7        exact  6/36 = 0.16667  simulated 0.16643  off by 0.6 standard errors
B: first is even   exact 18/36 = 0.50000  simulated 0.50040  off by 0.8 standard errors
A and B            exact  3/36 = 0.08333  simulated 0.08335  off by 0.1 standard errors
A or B             exact 21/36 = 0.58333  simulated 0.58347  off by 0.3 standard errors
at least one six   exact 11/36 = 0.30556  simulated 0.30550  off by 0.1 standard errors
```

The counts match the table exactly, and every simulated value is within one standard error of it (the largest gap is 0.0004), which is what a correct model should produce. A simulation that is off by 5 or more standard errors signals a mistake in the reasoning or the code.

#### Common mistakes

- **Unordered outcomes.** Listing two-dice results as $\{1,1\}, \{1,2\}, \dots$ gives 21 outcomes that are *not* equally likely ($\{1,2\}$ happens two ways). Keep the dice labeled.
- **Double counting in unions.** $|A \cup B| \neq |A| + |B|$ unless $A$ and $B$ are disjoint; subtract the overlap.
- **Forgetting the complement.** "At least one six in four rolls" is painful directly and easy as $1 - (5/6)^4$ (see [independence](#/concept/prob.foundations.independence)).

Connects to: [axioms and basic rules](#/concept/prob.foundations.axioms-and-basic-rules), [conditional probability](#/concept/prob.foundations.conditional-probability), [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations).

### questions
Q: What is the difference between an outcome and an event?
A: An outcome is one complete result of the experiment, such as the ordered pair of numbers shown by two dice. An event is a set of outcomes, such as all pairs that sum to 7, and its probability is the total probability of the outcomes in it.

Q: Why should you treat two dice as ordered, even if they look identical?
A: The 36 ordered pairs are equally likely, so counting them gives correct probabilities. The 21 unordered results are not equally likely, because a mixed pair like one and two can happen in two ways while a double can happen in only one.

Q: What is the probability that two fair dice show at least one six?
A: Use the complement: no six on either die has 25 of the 36 outcomes, so at least one six has 11 of 36, about 0.306.

Q: What does it mean for events to be mutually exclusive?
A: They share no outcomes, so they cannot happen together and the probability of their union is the sum of their probabilities. For example, "the sum is 2" and "the sum is 12" for two dice.

Q: How do you check a counting argument quickly?
A: Enumerate a small case exhaustively or run a simulation with a fixed seed and compare. The simulation's standard error, the square root of p times one minus p over the number of trials, tells you how close it should come.

## prob.foundations.axioms-and-basic-rules
name: "Axioms and basic rules"
importance: must
prereqs: [prob.foundations.sample-spaces-and-events]
scope: "addition rule, inclusion-exclusion for two and three events"

### simple
All of probability rests on three simple rules: probabilities are never negative, something certainly happens, and the chances of events that can't happen together add up. From these follow handy tools, like "the chance something does not happen is one minus the chance it does." Inclusion-exclusion fixes double counting when events overlap, like people who belong to two clubs being counted twice.

### interview
- **Axioms** (Kolmogorov): $P(A) \ge 0$; $P(\Omega) = 1$; for disjoint events, $P(A_1 \cup A_2 \cup \dots) = \sum P(A_i)$.
- Consequences: $P(A^c) = 1 - P(A)$, $P(\emptyset) = 0$, $A \subseteq B \Rightarrow P(A) \le P(B)$, and $0 \le P(A) \le 1$.
- **Addition rule**: $P(A \cup B) = P(A) + P(B) - P(A \cap B)$.
- **Inclusion-exclusion** for three events: add singles, subtract pairs, add the triple: $P(A \cup B \cup C) = \sum P(A) - \sum P(A \cap B) + P(A \cap B \cap C)$.
- **Union bound**: $P(\bigcup A_i) \le \sum P(A_i)$, useful when intersections are hard.
- Interview use: "at least one" questions, divisibility counts, and sanity checks (no probability above 1).

### deep
#### Intuition

The addition rule is double-counting repair. Adding $P(A)$ and $P(B)$ counts the overlap twice, so subtract it once. With three events, subtracting every pairwise overlap removes the triple overlap three times after adding it three times, so it must be added back once. The pattern continues: for $n$ events, alternate signs over all intersections of $1, 2, \dots, n$ events.

#### Worked example: divisible by 2, 3 or 5

Pick an integer uniformly from 1 to 1000. Let $A$, $B$, $C$ be "divisible by 2, 3, 5". Counting multiples, $\lfloor 1000/k \rfloor$:

| set | count |
|---|---|
| $A$, $B$, $C$ | 500, 333, 200 |
| $A \cap B$ (by 6), $A \cap C$ (by 10), $B \cap C$ (by 15) | 166, 100, 66 |
| $A \cap B \cap C$ (by 30) | 33 |

$$|A \cup B \cup C| = 500 + 333 + 200 - 166 - 100 - 66 + 33 = 734$$

so $P = \frac{734}{1000} = \frac{367}{500}$. The complement, 266 numbers, are those coprime to 30. (Divisibility by 2, 3 and 5 is not independent on 1 to 1000, because 1000 isn't a multiple of 30, which is why counting beats multiplying $\frac{1}{2} \cdot \frac{2}{3} \cdot \frac{4}{5}$ here.)

#### Code: count, formula and simulation

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    auto hit = [](long x) { return x % 2 == 0 || x % 3 == 0 || x % 5 == 0; };
    int direct = 0;
    for (int x = 1; x <= 1000; ++x) direct += hit(x);
    int formula = 500 + 333 + 200 - 166 - 100 - 66 + 33;
    const long n = 1'000'000;
    long hits = 0;
    for (long i = 0; i < n; ++i) hits += hit(long(rng() % 1000) + 1);
    double exact = formula / 1000.0, p = double(hits) / n, se = sqrt(exact * (1 - exact) / n);
    printf("counted %d, inclusion-exclusion %d, exact probability %.3f\n", direct, formula, exact);
    printf("simulated %.5f, off by %.5f = %.1f standard errors\n", p, fabs(p - exact),
           fabs(p - exact) / se);
    printf("union bound would say at most %.3f\n", (500 + 333 + 200) / 1000.0);
}
```

Output:

```text
counted 734, inclusion-exclusion 734, exact probability 0.734
simulated 0.73360, off by 0.00040 = 0.9 standard errors
union bound would say at most 1.033
```

The direct count and the formula agree exactly; the simulation of a million random picks lands 0.0004 below the exact 0.734, 0.9 standard errors away. The union bound, which ignores overlaps, gives 1.033: an upper bound, and here a useless one, which is typical when events overlap a lot.

#### Edge cases and common mistakes

- **Adding probabilities of overlapping events**: "the chance of rain Saturday is 50% and Sunday 50%, so rain this weekend is certain" is the classic error; the addition rule needs the overlap.
- **Signs in inclusion-exclusion**: odd-sized intersections are added, even-sized ones subtracted.
- **Probabilities above 1** in your working are an instant signal that something was double counted.
- For "at least one of many independent events", the complement $1 - \prod (1 - p_i)$ is simpler than inclusion-exclusion.

Connects to: [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion), [sample spaces and events](#/concept/prob.foundations.sample-spaces-and-events), [indicator variables](#/concept/prob.random-variables.indicator-variables).

### questions
Q: What are the three axioms of probability?
A: Probabilities are non-negative, the whole sample space has probability 1, and for mutually exclusive events the probability of their union is the sum of their probabilities. Every other rule, such as the complement rule, follows from these.

Q: Why does the addition rule subtract the intersection?
A: Adding the probabilities of A and B counts the outcomes in both events twice, so the intersection is subtracted once to count them exactly once. For disjoint events the intersection is empty and the rule reduces to simple addition.

Q: How many integers from 1 to 1000 are divisible by 2, 3 or 5?
A: By inclusion-exclusion: 500 plus 333 plus 200, minus 166, 100 and 66 for the pairs, plus 33 for all three, giving 734. So the probability is 0.734 for a uniform pick.

Q: What is the union bound and when is it useful?
A: The probability of a union is at most the sum of the individual probabilities. It needs no information about overlaps, so it gives a quick upper bound, tight when the events rarely happen together.

Q: If P(A) is 0.6 and P(B) is 0.7, what can P(A and B) be?
A: At least 0.3, because P(A or B) cannot exceed 1, so the overlap is at least 0.6 plus 0.7 minus 1; and at most 0.6, the smaller of the two. Without more information any value in that range is possible.

## prob.foundations.conditional-probability
name: "Conditional probability"
importance: must
prereqs: [prob.foundations.axioms-and-basic-rules]
scope: "P(A | B), the multiplication rule"

### simple
Conditional probability is the chance of something once you already know something else happened. If a card drawn from a deck is known to be red, the chance it is a heart jumps from one in four to one in two, because the black cards are ruled out. You shrink the world to the outcomes that match what you know, and measure the event inside that smaller world.

### interview
- **Definition**: $P(A \mid B) = \frac{P(A \cap B)}{P(B)}$, defined when $P(B) > 0$. Knowing $B$ happened restricts the sample space to $B$.
- **Multiplication rule**: $P(A \cap B) = P(B)\,P(A \mid B) = P(A)\,P(B \mid A)$; the **chain rule** extends it: $P(A_1 \cap A_2 \cap A_3) = P(A_1)P(A_2 \mid A_1)P(A_3 \mid A_1 \cap A_2)$.
- Sequential draws **without replacement** are the classic use: two aces in a row is $\frac{4}{52} \cdot \frac{3}{51} = \frac{1}{221}$.
- $P(A \mid B)$ and $P(B \mid A)$ are different numbers; confusing them is the prosecutor's fallacy (see Bayes' theorem).
- **How you learned the information matters**: "at least one child is a boy" gives $\frac{1}{3}$ for two boys; "the older child is a boy" gives $\frac{1}{2}$.
- Conditioning keeps all probability rules: $P(A^c \mid B) = 1 - P(A \mid B)$.

### deep
#### Intuition

Conditioning on $B$ throws away every outcome outside $B$ and rescales what is left so it sums to 1. With equally likely outcomes this is just counting inside $B$: $P(A \mid B) = \frac{|A \cap B|}{|B|}$.

#### Worked example 1: two aces without replacement

Draw two cards from a shuffled 52-card deck without putting the first back. By the multiplication rule,

$$P(\text{both aces}) = P(A_1)\,P(A_2 \mid A_1) = \frac{4}{52} \cdot \frac{3}{51} = \frac{12}{2652} = \frac{1}{221} \approx 0.004525.$$

After the first ace, 3 aces remain among 51 cards; that updated count is the conditioning.

#### Worked example 2: two children

A family has two children. Assume each child is a boy or a girl with probability $\frac{1}{2}$, independently, and all you learn is "at least one is a boy". The four equally likely ordered outcomes are BB, BG, GB, GG; conditioning removes GG, leaving three, of which one is BB:

$$P(\text{BB} \mid \text{at least one B}) = \frac{1/4}{3/4} = \frac{1}{3}.$$

If instead you learn "the older child is a boy", only BB and BG remain, and the answer is $\frac{1}{2}$. The event you condition on must describe exactly how the information was obtained; many famous paradoxes are ambiguity about this.

#### Checking both by simulation

```cpp
mt19937_64 rng(2026);                            // fixed seed

void report(const char* what, double exact, double p, double se) {
    printf("%-34s exact %.6f  simulated %.6f  off by %.1f standard errors\n", what, exact, p,
           fabs(p - exact) / se);
}

int main() {
    const long n = 2'000'000;
    long bothAces = 0;
    for (long i = 0; i < n; ++i) {
        int first = int(rng() % 52), second = int(rng() % 51);   // aces are cards 0 to 3
        if (second >= first) ++second;           // skip the card already drawn
        bothAces += first < 4 && second < 4;
    }
    double exact = 1.0 / 221;
    report("two aces", exact, double(bothAces) / n, sqrt(exact * (1 - exact) / n));

    long atLeastOneBoy = 0, twoBoys = 0, olderBoy = 0, twoBoysOlder = 0;
    for (long i = 0; i < n; ++i) {
        bool older = rng() & 1, younger = rng() & 1;   // 1 = boy, each with probability 1/2
        if (older || younger) { ++atLeastOneBoy; twoBoys += older && younger; }
        if (older) { ++olderBoy; twoBoysOlder += younger; }
    }
    report("two boys | at least one boy", 1.0 / 3, double(twoBoys) / atLeastOneBoy,
           sqrt((1.0 / 3) * (2.0 / 3) / atLeastOneBoy));
    report("two boys | older is a boy", 0.5, double(twoBoysOlder) / olderBoy,
           sqrt(0.25 / olderBoy));
}
```

Output:

```text
two aces                           exact 0.004525  simulated 0.004492  off by 0.7 standard errors
two boys | at least one boy        exact 0.333333  simulated 0.333533  off by 0.5 standard errors
two boys | older is a boy          exact 0.500000  simulated 0.500043  off by 0.1 standard errors
```

All three estimates are within one standard error of the exact values: 0.004492 against $\frac{1}{221} \approx 0.004525$, and 0.3335 and 0.5000 for the two versions of the children question. Note how the simulation mirrors the definition: a conditional probability is estimated by keeping only the trials where the condition holds and counting inside them, so its standard error uses the number of kept trials, not all of them.

#### Common mistakes

- **Swapping the condition**: $P(\text{positive test} \mid \text{sick})$ is not $P(\text{sick} \mid \text{positive test})$; [Bayes' theorem](#/concept/prob.foundations.bayes-theorem) converts one into the other.
- **Forgetting that draws change the deck**: without replacement, later probabilities depend on earlier draws.
- **Conditioning on an event with probability 0**: the definition doesn't apply; continuous problems need conditional densities ([joint distributions](#/concept/prob.continuous.joint-distributions)).

Connects to: [law of total probability](#/concept/prob.foundations.law-of-total-probability), [independence](#/concept/prob.foundations.independence), [card problems](#/concept/puzzles.probability.card-problems).

### questions
Q: What is the definition of conditional probability?
A: The probability of A given B is the probability of both A and B divided by the probability of B, defined when B has positive probability. Intuitively, you restrict the sample space to the outcomes in B and measure A inside it.

Q: What is the probability of drawing two aces in a row without replacement?
A: Four in 52 for the first ace, then three in 51 for the second given the first was an ace, so 12 in 2652, which is 1 in 221, about 0.0045.

Q: A family has two children and at least one is a boy. What is the probability both are boys?
A: One third, assuming each child is independently a boy or girl with probability one half and that "at least one boy" is all you learned. Of the equally likely BB, BG and GB, only BB has two boys.

Q: Why does the answer change if you are told the older child is a boy?
A: That information removes GG and GB rather than just GG, leaving BB and BG, so the probability of two boys is one half. The conditioning event must match exactly how the information was obtained.

Q: What is the multiplication rule?
A: The probability of A and B equals the probability of B times the probability of A given B. Applied repeatedly it gives the chain rule for sequences of events, such as successive draws without replacement.

## prob.foundations.independence
name: "Independence"
importance: must
prereqs: [prob.foundations.conditional-probability]
scope: "independent vs mutually exclusive, pairwise vs mutual independence"

### simple
Two events are independent when knowing that one happened tells you nothing about the other, like two separate coin flips. Then the chance of both is simply the product of their chances. Independent is not the same as "can't happen together": events that exclude each other are strongly linked, because one happening rules the other out.

### interview
- **Definition**: $A$ and $B$ are independent when $P(A \cap B) = P(A)\,P(B)$; equivalently $P(A \mid B) = P(A)$ when $P(B) > 0$.
- **Independent vs mutually exclusive**: disjoint events with positive probabilities are *dependent*, since $P(A \cap B) = 0 \ne P(A)P(B)$.
- **Pairwise vs mutual**: three events can be independent in every pair yet not together. Mutual independence needs every sub-collection to multiply, including $P(A \cap B \cap C) = P(A)P(B)P(C)$.
- Independent events stay independent under complements: $A$ and $B^c$ are independent too.
- Typical use: repeated trials. At least one 6 in four rolls is $1 - (5/6)^4 = \frac{671}{1296} \approx 0.518$, which assumes the rolls are independent.
- Independence is an **assumption** you state (separate dice, fresh coin flips), not something to take for granted with draws without replacement or related measurements.

### deep
#### Intuition

Independence means the second event's probability is the same inside the world where the first happened as in the whole world. Physically separate random mechanisms (two dice, two coins, rolls at different times) are modeled as independent; anything sharing a cause (the same deck, the same weather, the same market) usually is not.

#### Worked example: pairwise but not mutually independent

Flip two fair coins independently. Let $A$ = "first is heads", $B$ = "second is heads", $C$ = "the two coins match". Each has probability $\frac{1}{2}$. Over the four equally likely outcomes HH, HT, TH, TT:

| pair | intersection | probability | product |
|---|---|---|---|
| $A, B$ | HH | $\frac{1}{4}$ | $\frac{1}{4}$ |
| $A, C$ | HH | $\frac{1}{4}$ | $\frac{1}{4}$ |
| $B, C$ | HH | $\frac{1}{4}$ | $\frac{1}{4}$ |
| $A, B, C$ | HH | $\frac{1}{4}$ | $\frac{1}{8}$ |

Every pair multiplies, so the events are pairwise independent. But $A$ and $B$ together *force* $C$, so the triple fails: they are not mutually independent.

#### Worked example: at least one six in four rolls

Assuming independent fair rolls, "no six" in all four has probability $(5/6)^4 = \frac{625}{1296}$, so

$$P(\text{at least one six}) = 1 - \frac{625}{1296} = \frac{671}{1296} \approx 0.5177.$$

This is the Chevalier de Méré's even-money bet, which was slightly favorable to the player who bet on the six.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed

int main() {
    int count[8] = {};                           // exact: the 4 equally likely coin outcomes
    for (int a = 0; a < 2; ++a)
        for (int b = 0; b < 2; ++b) {
            bool C = a == b;
            count[0] += a && b, count[1] += a && C, count[2] += b && C, count[3] += a && b && C;
        }
    printf("exact: P(AB) = P(AC) = P(BC) = %d/4 each, product of two halves = 1/4\n", count[0]);
    printf("exact: P(ABC) = %d/4, product of three halves = 1/8\n", count[3]);

    const long n = 1'000'000;
    long ab = 0, abc = 0, sixes = 0;
    for (long i = 0; i < n; ++i) {
        bool a = rng() & 1, b = rng() & 1, c = a == b;
        ab += a && b;
        abc += a && b && c;
        bool six = false;
        for (int r = 0; r < 4; ++r) six |= rng() % 6 == 5;
        sixes += six;
    }
    auto line = [&](const char* what, double exact, long hits) {
        double p = double(hits) / n, se = sqrt(exact * (1 - exact) / n);
        printf("%-24s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact, p,
               fabs(p - exact) / se);
    };
    line("P(A and B)", 0.25, ab);
    line("P(A and B and C)", 0.25, abc);
    line("at least one six in 4", 671.0 / 1296, sixes);
}
```

Output:

```text
exact: P(AB) = P(AC) = P(BC) = 1/4 each, product of two halves = 1/4
exact: P(ABC) = 1/4, product of three halves = 1/8
P(A and B)               exact 0.25000  simulated 0.24968  off by 0.7 standard errors
P(A and B and C)         exact 0.25000  simulated 0.24968  off by 0.7 standard errors
at least one six in 4    exact 0.51775  simulated 0.51786  off by 0.2 standard errors
```

The simulated triple intersection matches $\frac{1}{4}$, not $\frac{1}{8}$ (the two simulated lines are identical because A and B together force C), and the four-roll estimate is within 0.0002 of $\frac{671}{1296}$.

#### Common mistakes

- **Calling disjoint events independent.** "Heads" and "tails" on one flip are disjoint and completely dependent.
- **Multiplying without independence.** $P(\text{two aces})$ from one deck is not $(4/52)^2$; the draws are dependent ([conditional probability](#/concept/prob.foundations.conditional-probability)).
- **Checking only pairs.** Pairwise independence does not give $P(A \cap B \cap C) = P(A)P(B)P(C)$.
- **Assuming independence of real-world events** (defaults of several loans, failures of servers in one rack) that share causes; correlated failures are why diversification and redundancy can disappoint.

Connects to: [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [Bernoulli and binomial](#/concept/prob.distributions.bernoulli-and-binomial), [coin and dice games](#/concept/puzzles.probability.coin-and-dice-games).

### questions
Q: What does it mean for two events to be independent?
A: The probability that both happen equals the product of their probabilities, or equivalently knowing that one happened does not change the probability of the other. It is usually an assumption about separate random mechanisms, such as two different dice.

Q: Are mutually exclusive events independent?
A: No, unless one of them has probability zero. If they cannot happen together, learning that one happened makes the other impossible, and the probability of both is zero rather than the product of two positive numbers.

Q: Give an example of events that are pairwise independent but not mutually independent.
A: With two fair coins, let A be first heads, B second heads and C the coins match. Each pair has probability one quarter, the product of halves, but all three together have probability one quarter rather than one eighth.

Q: What is the probability of at least one six in four rolls of a fair die?
A: Assuming independent rolls, one minus five sixths to the fourth power, which is 671 over 1296, about 0.518.

Q: If A and B are independent, are A and not-B independent?
A: Yes. The probability of A and not-B is P(A) minus P(A and B), which is P(A) times one minus P(B), the product of their probabilities.

## prob.foundations.law-of-total-probability
name: "Law of total probability"
importance: must
prereqs: [prob.foundations.conditional-probability]
scope: "splitting by cases"

### simple
The law of total probability works out a chance by splitting the world into cases. To find the chance a product from a factory is faulty, you take each machine's share of production times that machine's fault rate, and add them up. It turns one hard question into several easy ones.

### interview
- For a **partition** $B_1, \dots, B_k$ (disjoint cases that cover everything, each with positive probability): $P(A) = \sum_i P(A \mid B_i)\,P(B_i)$.
- It is a **weighted average** of the conditional probabilities, weighted by how likely each case is, so the answer always lies between the smallest and largest $P(A \mid B_i)$.
- Typical cases: which urn, which machine, which strategy, what the first step was (the basis of first-step analysis).
- It is the **denominator of Bayes' theorem**: $P(B_j \mid A) = \frac{P(A \mid B_j)P(B_j)}{\sum_i P(A \mid B_i)P(B_i)}$.
- The expectation version is the law of total expectation, $E[X] = \sum_i E[X \mid B_i]P(B_i)$.
- Pitfall: cases that overlap or miss part of the sample space; check that the case probabilities sum to 1.

### deep
#### Intuition

Picture a tree. The first branches are the cases $B_i$ with their probabilities; from each, a second branch leads to $A$ with probability $P(A \mid B_i)$. Multiply along each path to $A$ and add the paths. That is all the law says.

#### Worked example: two machines

Machine 1 makes 60% of a factory's parts, of which 2% are defective; machine 2 makes 40%, of which 5% are defective. Assume every part comes from exactly one machine (the cases form a partition). Then

$$P(D) = P(D \mid M_1)P(M_1) + P(D \mid M_2)P(M_2) = 0.02 \cdot 0.6 + 0.05 \cdot 0.4 = 0.012 + 0.020 = 0.032 = \frac{4}{125}.$$

The answer, 3.2%, sits between the two machines' rates, closer to machine 1's because it makes more parts.

#### Worked example: a random urn

Urn 1 has 3 red and 2 blue balls; urn 2 has 1 red and 4 blue. Flip a fair coin to choose an urn, then draw one ball:

$$P(\text{red}) = \frac{1}{2} \cdot \frac{3}{5} + \frac{1}{2} \cdot \frac{1}{5} = \frac{2}{5}.$$

With equal-sized urns chosen equally often, every ball has the same chance of being drawn, so pooling the 10 balls (4 red) happens to agree. It stops agreeing when the urns differ: if urn 2 holds 10 balls with 1 red, then

$$P(\text{red}) = \frac{1}{2} \cdot \frac{3}{5} + \frac{1}{2} \cdot \frac{1}{10} = \frac{7}{20} = 0.35,$$

while pooling the 15 balls would give $\frac{4}{15} \approx 0.267$. A ball in the small urn is more likely to be drawn, because its urn is chosen just as often but holds fewer balls.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const long n = 2'000'000;
    long defective = 0, red = 0, redBig = 0;
    for (long i = 0; i < n; ++i) {
        bool m1 = u01() < 0.6;                   // which machine made the part
        defective += u01() < (m1 ? 0.02 : 0.05);
        bool urn1 = rng() & 1;                   // equal-size urns: 3 of 5 red, 1 of 5 red
        red += urn1 ? rng() % 5 < 3 : rng() % 5 < 1;
        bool small = rng() & 1;                  // 3 of 5 red, or 1 of 10 red
        redBig += small ? rng() % 5 < 3 : rng() % 10 < 1;
    }
    auto line = [&](const char* what, double exact, long hits) {
        double p = double(hits) / n, se = sqrt(exact * (1 - exact) / n);
        printf("%-30s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact, p,
               fabs(p - exact) / se);
    };
    line("defective part", 0.032, defective);
    line("red, equal urns", 0.4, red);
    line("red, urns of 5 and 10 balls", 0.35, redBig);
    printf("pooling the 15 balls would wrongly give %.5f\n", 4.0 / 15);
}
```

Output:

```text
defective part                 exact 0.03200  simulated 0.03168  off by 2.6 standard errors
red, equal urns                exact 0.40000  simulated 0.40022  off by 0.6 standard errors
red, urns of 5 and 10 balls    exact 0.35000  simulated 0.35019  off by 0.6 standard errors
pooling the 15 balls would wrongly give 0.26667
```

Both urn estimates are within one standard error of $\frac{2}{5}$ and $\frac{7}{20}$, far from the pooled 0.267. The defect rate came out 0.03168 against the exact 0.032, 2.6 standard errors away: a gap that size turns up about once in a hundred comparisons, and repeating this simulation with 200 other seeds gave errors centered on zero, so it is chance, not bias. More trials would shrink it.

#### Common mistakes

- **Pooling instead of weighting**: when cases are chosen with given probabilities, combine the conditional probabilities with those weights, not the raw counts.
- **Cases that don't partition**: overlapping cases count some outcomes twice; missing cases leave probability unaccounted for.
- **Mixing up $P(A \mid B_i)$ and $P(B_i \mid A)$**: the law uses the first; going from the second requires [Bayes' theorem](#/concept/prob.foundations.bayes-theorem).

Connects to: [conditional probability](#/concept/prob.foundations.conditional-probability), [conditional expectation](#/concept/prob.expected-value.conditional-expectation), [first-step analysis](#/concept/prob.expected-value.first-step-analysis).

### questions
Q: State the law of total probability.
A: If events B1 to Bk form a partition of the sample space, each with positive probability, then P(A) is the sum over i of P(A given Bi) times P(Bi). It computes a probability by splitting into cases and weighting each case by its probability.

Q: Two machines make 60 and 40 percent of parts with defect rates 2 and 5 percent. What fraction of parts is defective?
A: 0.6 times 0.02 plus 0.4 times 0.05, which is 0.012 plus 0.020, or 3.2 percent.

Q: Why can't you just pool all the balls when an urn is chosen at random?
A: Because a ball's chance of being drawn depends on its urn's probability of being chosen and on the urn's size. The law of total probability weights each urn's red fraction by the urn's probability, which differs from the pooled fraction unless the urns are chosen in proportion to their sizes.

Q: How is the law of total probability related to Bayes' theorem?
A: It supplies Bayes' denominator: the overall probability of the evidence, summed over all hypotheses weighted by their prior probabilities.

## prob.foundations.bayes-theorem
name: "Bayes' theorem"
importance: must
prereqs: [prob.foundations.law-of-total-probability]
scope: "updating beliefs, base-rate fallacy, medical test problems"

### simple
Bayes' theorem tells you how to update a belief when new evidence arrives. If a rare disease has a good test, a positive result still often comes from a healthy person, simply because healthy people vastly outnumber sick ones. Bayes weighs how likely the evidence is under each explanation by how common each explanation was to begin with.

### interview
- **Formula**: $P(H \mid E) = \frac{P(E \mid H)\,P(H)}{P(E)}$, with $P(E) = \sum_i P(E \mid H_i)P(H_i)$ over all hypotheses (law of total probability).
- Vocabulary: **prior** $P(H)$, **likelihood** $P(E \mid H)$, **posterior** $P(H \mid E)$.
- **Odds form**, fastest in interviews: posterior odds = prior odds × likelihood ratio $\frac{P(E \mid H)}{P(E \mid H^c)}$.
- **Base-rate fallacy**: ignoring a small prior. A 99%-sensitive test with a 5% false-positive rate, for a disease in 1% of people, gives only a $\frac{1}{6}$ chance of disease after a positive test.
- Independent pieces of evidence multiply the odds one after another; a second independent positive test raises $\frac{1}{6}$ to about 0.80.
- State assumptions: the prior applies to this person, test errors are independent given the true status, and the numbers are exact rates.

### deep
#### Intuition with natural frequencies

Imagine 10,000 people. With 1% prevalence, 100 are sick and 9,900 healthy. A test that catches 99% of the sick flags 99 of them; a 5% false-positive rate flags 495 healthy people. Of the $99 + 495 = 594$ positives, only 99 are sick:

$$P(\text{sick} \mid +) = \frac{99}{594} = \frac{1}{6} \approx 0.167.$$

The formula says the same thing in general:

$$P(S \mid +) = \frac{P(+ \mid S)P(S)}{P(+ \mid S)P(S) + P(+ \mid S^c)P(S^c)} = \frac{0.99 \cdot 0.01}{0.99 \cdot 0.01 + 0.05 \cdot 0.99} = \frac{0.0099}{0.0594} = \frac{1}{6}.$$

#### The odds form

Prior odds of sickness: $\frac{0.01}{0.99} = \frac{1}{99}$. Likelihood ratio of a positive: $\frac{0.99}{0.05} = 19.8$. Posterior odds: $\frac{19.8}{99} = \frac{1}{5}$, which is probability $\frac{1}{1+5} = \frac{1}{6}$. A second positive from an independent test (errors independent given the true status) multiplies the odds by 19.8 again: $\frac{19.8}{5} = 3.96 = \frac{99}{25}$, so

$$P(S \mid +, +) = \frac{99/25}{1 + 99/25} = \frac{99}{124} \approx 0.798.$$

#### Code: the formula against a simulated population

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double prior = 0.01, sens = 0.99, fpr = 0.05;
    double exact1 = sens * prior / (sens * prior + fpr * (1 - prior));
    double exact2 = sens * sens * prior / (sens * sens * prior + fpr * fpr * (1 - prior));
    const long n = 10'000'000;
    long pos1 = 0, sick1 = 0, pos2 = 0, sick2 = 0;
    for (long i = 0; i < n; ++i) {
        bool sick = u01() < prior;
        bool t1 = u01() < (sick ? sens : fpr), t2 = u01() < (sick ? sens : fpr);
        if (t1) { ++pos1; sick1 += sick; }
        if (t1 && t2) { ++pos2; sick2 += sick; }
    }
    auto line = [](const char* what, double exact, long hits, long total) {
        double p = double(hits) / total, se = sqrt(exact * (1 - exact) / total);
        printf("%-24s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact,
               p, fabs(p - exact) / se);
    };
    line("P(sick | positive)", exact1, sick1, pos1);
    line("P(sick | two positives)", exact2, sick2, pos2);
    printf("positives: %ld of %ld people; positive twice: %ld\n", pos1, n, pos2);
}
```

Output:

```text
P(sick | positive)       exact 0.16667  simulated 0.16706  off by 0.8 standard errors
P(sick | two positives)  exact 0.79839  simulated 0.79815  off by 0.2 standard errors
positives: 592932 of 10000000 people; positive twice: 122862
```

Both estimates are within one standard error of $\frac{1}{6}$ and $\frac{99}{124}$. The simulation also shows *why*: of 592,932 positives among ten million people, only about 99,000 are sick.

#### Variants and pitfalls

- **Prosecutor's fallacy**: "the chance of this evidence if innocent is 1 in a million" is $P(E \mid \text{innocent})$, not $P(\text{innocent} \mid E)$. In a city of ten million, about ten innocent people match.
- **Dependent evidence**: a repeat of the *same* test on the same sample may share its error, so the second likelihood ratio is smaller than 19.8. Say the independence assumption out loud.
- **Priors matter less as evidence grows**: several strong, independent likelihood ratios overwhelm most reasonable priors; with weak evidence the prior dominates.
- **Monty Hall** is a Bayes problem where the host's behavior is the likelihood ([Monty Hall and its variants](#/concept/puzzles.probability.monty-hall-and-its-variants)).

Connects to: [law of total probability](#/concept/prob.foundations.law-of-total-probability), [conditional probability](#/concept/prob.foundations.conditional-probability), [maximum likelihood estimation](#/concept/prob.statistics.maximum-likelihood-estimation).

### questions
Q: State Bayes' theorem and name its parts.
A: The posterior P(H given E) equals the likelihood P(E given H) times the prior P(H), divided by the total probability of the evidence P(E). The denominator sums likelihood times prior over all competing hypotheses.

Q: A disease affects 1 percent of people; a test catches 99 percent of cases and falsely flags 5 percent of healthy people. You test positive. How likely is it that you are sick?
A: About one in six. Among 10,000 people, 99 of the 100 sick test positive and 495 of the 9,900 healthy do, so 99 of 594 positives are sick. This assumes the 1 percent prior applies to you.

Q: What is the odds form of Bayes' theorem?
A: Posterior odds equal prior odds times the likelihood ratio, the probability of the evidence under the hypothesis divided by its probability under the alternative. It makes repeated updates easy: each independent piece of evidence multiplies the odds by its ratio.

Q: What is the base-rate fallacy?
A: Judging a probability from the accuracy of the evidence while ignoring how rare the hypothesis was to begin with. A very accurate test for a rare condition can still produce mostly false positives.

Q: What happens after a second, independent positive test?
A: The odds are multiplied by the likelihood ratio again: from 1 to 5 against to 3.96 to 1 in favor, a probability of 99 over 124, about 0.80. This relies on the two tests' errors being independent given the true status.

## prob.foundations.symmetry-arguments
name: "Symmetry arguments"
importance: important
scope: "using symmetry to skip computation"

### simple
A symmetry argument answers a probability question by noticing that several outcomes must be equally likely, with no calculation at all. In a well-shuffled deck, the first ace is as likely to come before the first king as after it, because swapping the labels "ace" and "king" changes nothing. Spotting such symmetries turns hard questions into one-liners.

### interview
- Idea: if a relabeling or reordering maps the sample space onto itself and preserves probabilities, events that correspond under it are **equally likely**.
- Shuffled decks: any specific card is equally likely to be in any position; the first ace comes before the first king with probability $\frac{1}{2}$; the card after the first ace is the ace of spades with probability $\frac{1}{52}$.
- Draws without replacement: the $k$-th ball drawn is red with the same probability as the first, $\frac{r}{r+b}$, for every $k$.
- Continuous: for i.i.d. continuous variables, every ordering is equally likely, so $P(X_1 < X_2 < X_3) = \frac{1}{6}$ and the middle of three uniforms has mean $\frac{1}{2}$ (reflect $x \mapsto 1 - x$).
- Symmetry plus linearity of expectation solves many "expected position" questions quickly.
- Always name the symmetry and check it really holds (the same distribution under the swap); asymmetric rules break it.

### deep
#### Why it works

If two events are images of each other under a transformation that preserves probability, they have equal probability. For a uniformly random permutation, any fixed relabeling of cards or positions is such a transformation. The art is picking the right one.

#### Worked examples

1. **First ace before first king.** Look only at the 8 aces and kings in their shuffled order; swapping the labels "ace" and "king" maps orders where an ace comes first to orders where a king comes first, one to one. So $P = \frac{1}{2}$.
2. **The card after the first ace is the ace of spades.** Remove the ace of spades and shuffle the other 51 cards; then insert it into one of the 52 gaps, uniformly. It lands right after the first of the other three aces in exactly one gap. So $P = \frac{1}{52}$, the same as for any other specific card, such as the two of clubs (the clubs version uses the same insertion argument).
3. **The last ball.** An urn has 3 red and 5 blue balls, drawn one by one without replacement. By symmetry of positions, the last ball is red with probability $\frac{3}{8}$, exactly like the first.
4. **The middle of three uniforms.** For three independent Uniform(0, 1) values, $x \mapsto 1 - x$ swaps "smallest" and "largest" and keeps the middle one in the middle, so the middle value's distribution is symmetric about $\frac{1}{2}$ and its mean is $\frac{1}{2}$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

void shuffle52(array<int, 52>& d) {              // Fisher-Yates with our own generator
    for (int i = 51; i > 0; --i) swap(d[i], d[rng() % (i + 1)]);
}

int main() {
    const long n = 1'000'000;                    // cards 0-3 are aces (0 = spades), 4-7 kings
    long aceFirst = 0, spadeAfter = 0, lastRed = 0;
    double middleSum = 0;
    array<int, 52> deck;
    for (long t = 0; t < n; ++t) {
        iota(deck.begin(), deck.end(), 0);
        shuffle52(deck);
        int i = 0;
        while (deck[i] >= 8) ++i;                // the first ace or king
        aceFirst += deck[i] < 4;
        int a = 0;
        while (deck[a] >= 4) ++a;                // the first ace
        spadeAfter += a + 1 < 52 && deck[a + 1] == 0;
        int balls[8] = {1, 1, 1, 0, 0, 0, 0, 0};    // 3 red, 5 blue
        for (int k = 7; k > 0; --k) swap(balls[k], balls[rng() % (k + 1)]);
        lastRed += balls[7];
        double x[3] = {u01(), u01(), u01()};
        sort(x, x + 3);
        middleSum += x[1];
    }
    auto line = [&](const char* what, double exact, double p, double se) {
        printf("%-28s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact, p,
               fabs(p - exact) / se);
    };
    auto prob = [&](const char* what, double exact, long hits) {
        line(what, exact, double(hits) / n, sqrt(exact * (1 - exact) / n));
    };
    prob("first ace before first king", 0.5, aceFirst);
    prob("ace of spades after 1st ace", 1.0 / 52, spadeAfter);
    prob("last of 8 balls is red", 3.0 / 8, lastRed);
    line("mean of the middle uniform", 0.5, middleSum / n, sqrt(0.05 / n));   // variance 1/20
}
```

Output:

```text
first ace before first king  exact 0.50000  simulated 0.50121  off by 2.4 standard errors
ace of spades after 1st ace  exact 0.01923  simulated 0.01892  off by 2.3 standard errors
last of 8 balls is red       exact 0.37500  simulated 0.37498  off by 0.0 standard errors
mean of the middle uniform   exact 0.50000  simulated 0.50027  off by 1.2 standard errors
```

The last-ball and middle-value estimates are within about one standard error. The two deck estimates are 2.4 and 2.3 standard errors off; both come from the same million shuffles, and rerunning the shuffle with 200 other seeds gave errors centered on zero with the expected spread, so these are ordinary fluctuations rather than a biased shuffle. (The middle value of three uniforms has variance $\frac{1}{20}$, which sets its standard error; see [order statistics](#/concept/prob.distributions.order-statistics).)

#### When symmetry fails

- Unequal groups break it: "the first ace comes before the first heart" is not $\frac{1}{2}$, because there are 4 aces and 13 hearts (and the ace of hearts is both), so the labels cannot be swapped.
- Symmetry gives equal probabilities, not the value of each: it still needs the number of symmetric cases to sum to 1 (4 aces, 4 kings: each type first with probability $\frac{1}{2}$).
- In games, one player moving first breaks symmetry between players.

Connects to: [card problems](#/concept/puzzles.probability.card-problems), [ants on a pole and similar symmetry tricks](#/concept/puzzles.probability.ants-on-a-pole-and-similar-symmetry-tricks), [linearity of expectation](#/concept/prob.random-variables.linearity-of-expectation).

### questions
Q: In a shuffled deck, what is the probability that the first ace appears before the first king?
A: One half. Among the eight aces and kings, swapping the labels ace and king maps every arrangement with an ace first to one with a king first, so the two events are equally likely.

Q: You draw all balls one by one from an urn with 3 red and 5 blue. What is the probability the last ball is red?
A: Three eighths, the same as for the first ball. By symmetry every position in a random order is equally likely to hold any particular ball.

Q: What is the probability that the card right after the first ace is the ace of spades?
A: One in 52. Take out the ace of spades, shuffle the rest, and insert it into one of 52 equally likely gaps; exactly one gap is right after the first of the other aces.

Q: For three independent continuous random variables with the same distribution, what is the probability they come out in increasing order?
A: One sixth. Ties have probability zero and all 3 factorial orderings are equally likely by symmetry.

Q: How can symmetry give the mean of the middle of three uniforms?
A: Replacing each value x by 1 minus x keeps the distribution the same and maps the middle value to 1 minus the middle value, so the middle value is symmetric around one half and its mean is one half.
