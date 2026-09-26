---
topic: math.combinatorics
name: "Combinatorics"
subject: math
order: 1
prereqs: []
---

## math.combinatorics.counting-principles
name: "Counting principles"
importance: must
scope: "sum and product rules"

### simple
Counting rests on two rules. If something happens one way or another, with no overlap, you add the ways; if it happens in steps, one choice and then another, you multiply them. With 3 shirts and 4 pairs of trousers you can dress in 3 times 4, or 12, different outfits.

### interview
- **Sum rule**: if the outcomes split into cases that don't overlap, the total is the sum of the case counts.
- **Product rule**: if a choice is made in steps and step $i$ always has $n_i$ options, whatever was chosen before, the total is $n_1 n_2 \cdots n_k$. Only the *number* of options has to stay fixed, not which options they are.
- When the number of options depends on earlier steps (a first digit that can't be 0, a last digit that must be even), split into cases in which it is fixed, multiply inside each case, then add.
- **Complement**: "at least one" is usually easier as all outcomes minus "none".
- Fill the most constrained position first, then the free ones.
- Check any count on a small case by listing it or with a brute-force loop.

### deep
#### Intuition

Picture a choice made in steps as a tree: the first step branches $n_1$ ways, each branch splits $n_2$ ways, and so on. If every node at the same depth has the same number of children, the number of leaves is the product. The product rule fails exactly when the tree is lopsided, and the cure is the sum rule: cut the tree into pieces that are each regular, count each, and add.

The sum rule on its own: passwords of 1 to 3 lowercase letters number $26 + 26^2 + 26^3 = 18{,}278$, one term per length, because a password has exactly one length.

#### Worked example: four-digit numbers with different digits

How many numbers from 1000 to 9999 have four different digits? Fill the first digit first, since it is the constrained one:

| position | options | why |
|---|---|---|
| first | 9 | 1 to 9 |
| second | 9 | 0 to 9, minus the first digit |
| third | 8 | minus the two used |
| fourth | 7 | minus the three used |

So there are $9 \cdot 9 \cdot 8 \cdot 7 = 4536$, and by the complement $9000 - 4536 = 4464$ numbers repeat some digit.

Now add "and even". Filling left to right breaks the product rule: how many even digits remain for the last place depends on which digits were used. Fill the last digit first and split on whether it is 0, since 0 is the digit that affects the first position:

- **Last digit 0**: the first digit has 9 options (1 to 9), then 8, then 7: $9 \cdot 8 \cdot 7 = 504$.
- **Last digit 2, 4, 6 or 8** (4 options): the first digit can't be 0 or the last digit, so 8 options; then 8 and 7 remain: $4 \cdot 8 \cdot 8 \cdot 7 = 1792$.

The total is $504 + 1792 = 2296$. It is not half of 4536 (that would be 2268), because 0 is even and never leads, so even endings are a little more common.

#### Checking by brute force

```cpp
int main() {
    int distinct = 0, even = 0;
    for (int n = 1000; n <= 9999; ++n) {
        int d[4] = {n / 1000, n / 100 % 10, n / 10 % 10, n % 10};
        bool ok = true;
        for (int i = 0; i < 4; ++i)
            for (int j = i + 1; j < 4; ++j) ok = ok && d[i] != d[j];
        distinct += ok;
        even += ok && d[3] % 2 == 0;
    }
    printf("different digits: %d, formula 9*9*8*7 = %d\n", distinct, 9 * 9 * 8 * 7);
    printf("different and even: %d, formula 9*8*7 + 4*8*8*7 = %d\n", even,
           9 * 8 * 7 + 4 * 8 * 8 * 7);
    printf("some digit repeats: %d\n", 9000 - distinct);
}
```

Output:

```text
different digits: 4536, formula 9*9*8*7 = 4536
different and even: 2296, formula 9*8*7 + 4*8*8*7 = 2296
some digit repeats: 4464
```

The loop visits all 9000 numbers, so these counts are exact, and they agree with the case analysis.

#### Common mistakes

- **Multiplying when the options vary.** $9 \cdot 8 \cdot 7 \cdot 5$ for "even with different digits" assumes 5 even digits are always left for the end; the count of 2520 is wrong.
- **Overlapping cases.** The sum rule needs disjoint cases. "Starts with 1 or ends with 1" counted as $1000 + 900$ counts numbers like 1231 twice.
- **Order that doesn't matter.** The product rule counts ordered choices. Choosing 2 people out of 5 as "5 then 4" counts each pair twice; divide by the orderings (see [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations)).

Connects to: [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations), [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion), [sample spaces and events](#/concept/prob.foundations.sample-spaces-and-events).

### questions
Q: When can you multiply the number of options at each step?
A: When every path through the choices has the same number of options at each step, whatever was chosen earlier. The options themselves may differ, but their count must not. If the count changes, split into cases where it is fixed and add the case totals.

Q: How many four-digit numbers have four different digits?
A: The first digit has 9 options (not 0), then 9, 8 and 7 remain for the others, so 9 times 9 times 8 times 7, which is 4536.

Q: Why fill the most constrained position first?
A: A constrained position, such as a first digit that can't be 0, would otherwise have a number of options that depends on the earlier choices. Filling it first keeps the counts fixed so the product rule applies, or shows exactly which cases you need to split.

Q: How do you count strings with at least one repeated character?
A: Count all strings and subtract those with no repeats. For four-digit numbers that is 9000 minus 4536, or 4464. The complement avoids splitting "at least one" into many overlapping cases.

Q: What is the difference between the sum rule and the product rule?
A: The sum rule adds counts of separate cases that can't happen together, like passwords of length 1 or 2 or 3. The product rule multiplies counts of successive steps that all happen, like choosing a shirt and then trousers.

## math.combinatorics.permutations-and-combinations
name: "Permutations and combinations"
importance: must
prereqs: [math.combinatorics.counting-principles]
scope: "with and without repetition, arranging with identical items"

### simple
A permutation is an ordering and a combination is a choice where order doesn't matter. Picking a president and a treasurer from 10 people gives 10 times 9, or 90, ordered pairs, but picking a two-person team gives only 45, since each team was counted twice. Most counting questions come down to deciding whether order matters and whether repeats are allowed.

### interview
- Choosing $k$ from $n$ **without repeats**: $\frac{n!}{(n-k)!}$ ordered, $\binom{n}{k} = \frac{n!}{k!\,(n-k)!}$ unordered.
- Choosing $k$ from $n$ **with repeats**: $n^k$ ordered, $\binom{n+k-1}{k}$ unordered (stars and bars).
- **Identical items**: $n$ items with groups of $a, b, c, \dots$ identical ones have $\frac{n!}{a!\,b!\,c!\cdots}$ distinct arrangements (the multinomial coefficient).
- **Circular**: $n$ people around a table have $(n-1)!$ arrangements when rotations count as the same.
- "At least" conditions: split into disjoint cases ("exactly 2, exactly 3, …") or use the complement; never "choose the required ones, then choose the rest from everyone", which double counts.
- Symmetry: $\binom{n}{k} = \binom{n}{n-k}$; compute with the smaller $k$.

### deep
#### Intuition

Every formula here is the product rule plus division for over-counting. Ordered choices without repeats: $n$ options, then $n-1$, … , $k$ factors, which is $\frac{n!}{(n-k)!}$. If order doesn't matter, each group of $k$ was produced in $k!$ orders, so divide: $\binom{n}{k}$. If some items are identical, swapping identical items changes nothing, so divide by the ways to shuffle each identical group. Around a round table, each seating was counted once per rotation, $n$ times, so divide $n!$ by $n$.

#### Worked example 1: arrangements of BANANAS

BANANAS has 7 letters: A three times, N twice, B and S once. Labeling the letters gives $7! = 5040$ orders, but each word appears $3! \cdot 2! = 12$ times (shuffling the A's and the N's), so there are

$$\frac{7!}{3!\,2!\,1!\,1!} = \frac{5040}{12} = 420$$

distinct words.

#### Worked example 2: a committee with at least two women

A committee of 4 comes from 6 women and 5 men and must include at least 2 women. Split by the exact number of women:

| women | ways |
|---|---|
| 2 | $\binom{6}{2}\binom{5}{2} = 15 \cdot 10 = 150$ |
| 3 | $\binom{6}{3}\binom{5}{1} = 20 \cdot 5 = 100$ |
| 4 | $\binom{6}{4} = 15$ |

Total 265. The tempting shortcut, "choose 2 women, then any 2 of the other 9 people", gives $15 \cdot 36 = 540$: a committee with 3 women is counted 3 times (once per pair chosen "first"), and one with 4 women 6 times. Indeed $150 + 3 \cdot 100 + 6 \cdot 15 = 540$.

#### Worked example 3: a round table

Six people sit at a round table, rotations counting as the same seating: $5! = 120$. If two of them insist on sitting together, glue them into one block: 5 units around the table give $4! = 24$, and the pair can sit in 2 orders, so 48.

#### Checking by brute force

```cpp
int main() {
    string w = "AAABNNS";                        // sorted, so next_permutation visits each once
    int words = 0;
    do ++words; while (next_permutation(w.begin(), w.end()));
    int committees = 0, shortcut = 0;            // people 0-5 are women, 6-10 are men
    for (int m = 0; m < 1 << 11; ++m) {
        if (__builtin_popcount(m) != 4) continue;
        int women = __builtin_popcount(m & 0b111111);
        committees += women >= 2;
        shortcut += women * (women - 1) / 2;     // how often the shortcut counts this committee
    }
    vector<int> p = {1, 2, 3, 4, 5};             // person 0 fixed in seat 0 removes rotations
    int seatings = 0, together = 0;
    do {
        ++seatings;
        together += p[0] == 1 || p[4] == 1;      // person 1 next to person 0
    } while (next_permutation(p.begin(), p.end()));
    printf("BANANAS: %d, committees: %d (shortcut counts %d), round table: %d, together: %d\n",
           words, committees, shortcut, seatings, together);
}
```

Output:

```text
BANANAS: 420, committees: 265 (shortcut counts 540), round table: 120, together: 48
```

All four counts match, and so does the shortcut's over-count of 540, which confirms the explanation of the mistake.

#### Edge cases and common mistakes

- $\binom{n}{0} = 1$ and $0! = 1$: there is exactly one way to choose nothing.
- **Order by accident**: "choose a team of 3" and then multiplying $10 \cdot 9 \cdot 8$ counts ordered teams; divide by $3!$.
- **Reflections**: if a necklace can also be flipped, divide the circular count by 2 more (for $n \ge 3$).
- **Large numbers**: in code, compute $\binom{n}{k}$ with the multiplicative formula or Pascal's triangle rather than dividing huge factorials (see [combinatorics in code](#/concept/dsa.math.combinatorics-in-code)).

Connects to: [counting principles](#/concept/math.combinatorics.counting-principles), [stars and bars](#/concept/math.combinatorics.stars-and-bars), [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities). Practice: [Handshakes](#/problems/q-handshakes) and [Rising digits](#/problems/q-rising-digits).

### questions
Q: How many distinct arrangements does a word with repeated letters have?
A: Divide the factorial of the length by the factorial of each letter's count. BANANAS has 7 letters with A three times and N twice, so 7! divided by 3! times 2!, which is 420.

Q: Why is "choose the required people first, then fill the rest from everyone" wrong for "at least k" conditions?
A: A group with more than k of the required kind is produced several times, once for each way of calling k of them "the required ones". Split into disjoint cases by the exact number instead, or subtract the complement.

Q: How many ways can n people sit around a round table?
A: (n minus 1) factorial, if rotations of the same seating count as one. Fix one person's seat to remove rotations, then arrange the other n minus 1 people in a line.

Q: How many ways are there to choose k items from n with repetition allowed and order ignored?
A: C(n + k - 1, k). It is a stars and bars count: k identical picks distributed among n kinds of item.

Q: What is the difference between a permutation and a combination?
A: A permutation counts ordered selections, so ABC and BAC differ; a combination counts unordered selections, so they are the same. The number of permutations of k items from n is the number of combinations times k factorial.

## math.combinatorics.stars-and-bars
name: "Stars and bars"
importance: must
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "distributing identical items"

### simple
Stars and bars counts ways to share identical things among different people. Line up the things as stars and place dividers, the bars, between them: everything before the first bar goes to the first person, and so on. Counting where the bars can go counts the ways to share.

### interview
- Solutions of $x_1 + \dots + x_k = n$ in integers $x_i \ge 0$: $\binom{n+k-1}{k-1}$ (choose the positions of $k-1$ bars among $n+k-1$ symbols).
- With $x_i \ge 1$: give everyone one first, leaving $n-k$ to share freely: $\binom{n-1}{k-1}$.
- Lower bounds $x_i \ge a_i$: subtract them first. Upper bounds $x_i \le b_i$: use [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion) on the variables that overflow.
- The items must be identical and the recipients distinct; distinct items to distinct people is $k^n$ instead.
- The same count gives multisets: choosing $n$ items from $k$ kinds with repetition, order ignored.
- Dice sums are stars and bars with an upper bound of 6 on each die.

### deep
#### Intuition

Write a sharing of $n$ identical items among $k$ people as a row of $n$ stars and $k-1$ bars. For 7 items and 3 people, `**|*****|` means 2, 5 and 0. Every row of $n + k - 1$ symbols with exactly $k - 1$ bars is one sharing, and every sharing is one such row, so the count is the number of ways to place the bars:

$$\binom{n+k-1}{k-1}.$$

If everyone must get at least one, hand out one each first; the remaining $n - k$ are shared freely, giving $\binom{n-1}{k-1}$. (Equivalently, put the $k-1$ bars in distinct gaps between the $n$ stars.)

#### Worked example: sharing with a cap

Twelve identical lots are split among 4 desks, and no desk may take more than 5. Without the cap there are $\binom{15}{3} = 455$ ways. Remove the ones where some desk overflows:

- Desk $i$ takes at least 6: give it 6 up front, share the remaining 6 freely: $\binom{9}{3} = 84$ ways, for each of the 4 desks.
- Two desks take at least 6 each: that uses all 12, so 1 way, for each of the $\binom{4}{2} = 6$ pairs.
- Three desks can't all take 6.

By inclusion-exclusion the answer is $455 - 4 \cdot 84 + 6 \cdot 1 = 125$.

#### Worked example: three dice summing to 10

Each die shows $x_i \in \{1, \dots, 6\}$. Put $y_i = x_i - 1 \in \{0, \dots, 5\}$, so $y_1 + y_2 + y_3 = 7$. Without the cap: $\binom{9}{2} = 36$. A die with $y_i \ge 6$ leaves 1 to share: $\binom{3}{2} = 3$ ways, for each of 3 dice. Two dice can't both reach 6. So $36 - 9 = 27$ outcomes, and $P(\text{sum} = 10) = \frac{27}{216} = \frac{1}{8}$.

#### Checking by brute force

```cpp
long long choose(int n, int k) {
    long long r = 1;
    for (int i = 1; i <= k; ++i) r = r * (n - k + i) / i;   // exact at every step
    return r;
}

int main() {
    int capped = 0, dice = 0;
    for (int a = 0; a <= 5; ++a)
        for (int b = 0; b <= 5; ++b)
            for (int c = 0; c <= 5; ++c) {
                int d = 12 - a - b - c;
                capped += d >= 0 && d <= 5;
            }
    for (int x = 1; x <= 6; ++x)
        for (int y = 1; y <= 6; ++y)
            for (int z = 1; z <= 6; ++z) dice += x + y + z == 10;
    printf("12 lots, 4 desks, at most 5 each: %d (formula %lld)\n", capped,
           choose(15, 3) - 4 * choose(9, 3) + 6 * choose(3, 3));
    printf("three dice summing to 10: %d of 216 (formula %lld)\n", dice,
           choose(9, 2) - 3 * choose(3, 2));
}
```

Output:

```text
12 lots, 4 desks, at most 5 each: 125 (formula 125)
three dice summing to 10: 27 of 216 (formula 27)
```

The loops try every allowed split, so both counts are exact and agree with the formulas.

#### Complexity

The formula is one binomial coefficient, $O(k)$ multiplications. With caps, inclusion-exclusion adds one term per set of overflowing variables that can overflow together, at most $2^k$ terms.

#### Edge cases and common mistakes

- **Distinct items**: stars and bars needs identical items. Giving 12 different books to 4 people is $4^{12}$.
- **Identical recipients**: splitting 12 into 4 unlabeled piles is a partition count, a different and harder problem.
- **Off by one in the bars**: $k$ people need $k - 1$ bars, not $k$.
- **Forgetting the shift**: with $x_i \ge 1$, the formula uses $n - k$ items, not $n$.

Connects to: [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations), [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion), [sums of random variables](#/concept/prob.distributions.sums-of-random-variables). Practice: [Sharing sweets](#/problems/q-sweets).

### questions
Q: How many non-negative integer solutions does x1 + x2 + x3 + x4 = 12 have?
A: C(15, 3), which is 455. There are 12 stars and 3 bars in a row of 15 symbols, and choosing the bar positions fixes the solution.

Q: How do you handle a condition like "each person gets at least 2"?
A: Give each person 2 first, then share what is left with no condition. With n items and k people that leaves n minus 2k items and C(n - 2k + k - 1, k - 1) ways.

Q: How do you handle an upper limit on each share?
A: Count without the limit, then subtract the sharings where some share exceeds its limit, using inclusion-exclusion over which shares overflow. To count sharings where a share takes at least b + 1, give it b + 1 up front and share the rest freely.

Q: Why doesn't stars and bars apply to distinct objects?
A: It counts arrangements of identical stars, so it only tells you how many items each person gets. With distinct objects, which items a person gets also matters, and each object independently picks a person, giving k to the power n.

## math.combinatorics.inclusion-exclusion
name: "Inclusion-exclusion"
importance: must
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "counting with overlaps, derangements"

### simple
Inclusion-exclusion counts things that belong to at least one of several overlapping groups. Add the group sizes, subtract what you counted twice, add back what you then removed too often, and so on. It is how you count a club's members when some belong to two committees at once.

### interview
- Two sets: $|A \cup B| = |A| + |B| - |A \cap B|$. Three: add singles, subtract pairs, add the triple.
- General: $\left|\bigcup A_i\right| = \sum_{j \ge 1} (-1)^{j+1} \sum_{|S| = j} \left|\bigcap_{i \in S} A_i\right|$.
- It is most useful through the complement: "none of the bad properties" $= \text{total} - |\text{at least one bad}|$.
- **Derangements** (no item in its own place): $D_n = n! \sum_{j=0}^{n} \frac{(-1)^j}{j!}$, the nearest integer to $n!/e$; recurrence $D_n = (n-1)(D_{n-1} + D_{n-2})$.
- **Onto functions** from $n$ items to $k$ boxes, none empty: $\sum_{j=0}^{k} (-1)^j \binom{k}{j} (k-j)^n$.
- When the intersections depend only on how many sets you intersect, each layer is $\binom{m}{j}$ times one size.

### deep
#### Intuition

Why the alternating signs? Take an element that lies in exactly $r \ge 1$ of the sets. The singles count it $r$ times, the pairs $\binom{r}{2}$ times, the triples $\binom{r}{3}$ times, so the formula counts it

$$\binom{r}{1} - \binom{r}{2} + \binom{r}{3} - \dots = 1 - (1 - 1)^r = 1$$

time, exactly once. That is the whole proof, by the [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities).

#### Worked example 1: every person gets a task

Six different tasks go to 3 people, and each person must get at least one. There are $3^6 = 729$ assignments in all. Let $A_i$ be "person $i$ gets nothing". Then $|A_i| = 2^6$ (every task goes to the other two), $|A_i \cap A_j| = 1^6$ and the triple is empty:

$$729 - 3 \cdot 64 + 3 \cdot 1 - 0 = 540.$$

#### Worked example 2: derangements

A derangement of $n$ items leaves none in its original place. Let $A_i$ be "item $i$ stays put". Any $j$ chosen items staying put leave $(n - j)!$ arrangements of the rest, so

$$D_n = \sum_{j=0}^{n} (-1)^j \binom{n}{j} (n-j)! = n! \sum_{j=0}^{n} \frac{(-1)^j}{j!}.$$

The sum is the start of the series for $e^{-1}$, so $D_n / n! \to 1/e \approx 0.3679$, and it is already within 0.002 of it at $n = 5$. The series' tail after the last term is smaller than $\frac{1}{(n+1)!}$, so $|D_n - n!/e| < \frac{1}{n+1} \le \frac{1}{2}$, which makes $D_n$ the nearest integer to $n!/e$. For exactly $k$ fixed points, choose them and derange the rest: $\binom{n}{k} D_{n-k}$.

#### Checking by brute force

```cpp
int main() {
    int onto = 0;
    for (int a = 0; a < 729; ++a) {              // a in base 3: who gets each of the 6 tasks
        int seen = 0;
        for (int t = 0, x = a; t < 6; ++t, x /= 3) seen |= 1 << (x % 3);
        onto += seen == 7;
    }
    printf("onto assignments: %d (formula %d)\n", onto, 729 - 3 * 64 + 3);
    long long fact = 1, prev2 = 0, prev1 = 1;    // D(n-2) and D(n-1), from D0 = 1
    for (int n = 1; n <= 8; ++n) {
        fact *= n;
        vector<int> p(n);
        iota(p.begin(), p.end(), 0);
        long long d = 0;
        do {
            bool fixed = false;
            for (int i = 0; i < n; ++i) fixed = fixed || p[i] == i;
            d += !fixed;
        } while (next_permutation(p.begin(), p.end()));
        long long rec = n == 1 ? 0 : (n - 1) * (prev1 + prev2);
        printf("n=%d  D=%5lld  recurrence %5lld  n!/e=%9.3f  share %.4f\n", n, d, rec,
               fact / exp(1.0), double(d) / fact);
        prev2 = prev1, prev1 = d;
    }
}
```

Output:

```text
onto assignments: 540 (formula 540)
n=1  D=    0  recurrence     0  n!/e=    0.368  share 0.0000
n=2  D=    1  recurrence     1  n!/e=    0.736  share 0.5000
n=3  D=    2  recurrence     2  n!/e=    2.207  share 0.3333
n=4  D=    9  recurrence     9  n!/e=    8.829  share 0.3750
n=5  D=   44  recurrence    44  n!/e=   44.146  share 0.3667
n=6  D=  265  recurrence   265  n!/e=  264.873  share 0.3681
n=7  D= 1854  recurrence  1854  n!/e= 1854.112  share 0.3679
n=8  D=14833  recurrence 14833  n!/e=14832.899  share 0.3679
```

Every count comes from listing all arrangements, and each matches both the recurrence and the nearest integer to $n!/e$.

#### Common mistakes

- **Stopping after the pairs.** With three or more overlapping sets, the triple term is needed.
- **Sizes that aren't equal.** The $\binom{m}{j}$ shortcut only works when every $j$-fold intersection has the same size.
- **Mixing up the target**: inclusion-exclusion gives "at least one"; subtract from the total for "none".

Connects to: [axioms and basic rules](#/concept/prob.foundations.axioms-and-basic-rules), [stars and bars](#/concept/math.combinatorics.stars-and-bars), [indicator variables](#/concept/prob.random-variables.indicator-variables).

### questions
Q: Why does inclusion-exclusion alternate signs?
A: An element in exactly r of the sets is counted r times by the singles, r choose 2 times by the pairs, and so on. The alternating sum of these is 1 minus (1 - 1) to the power r, which is 1, so every element is counted exactly once.

Q: What is a derangement and roughly what fraction of permutations are derangements?
A: A permutation that leaves no item in its original position. The fraction is the alternating sum of 1 over j factorial, which approaches 1 over e, about 0.368, very quickly.

Q: How many ways can 6 different tasks go to 3 people so that everyone gets at least one?
A: 3 to the 6th minus 3 times 2 to the 6th plus 3 times 1 to the 6th, which is 729 minus 192 plus 3, or 540. The subtracted terms remove assignments that leave someone out.

Q: How many permutations of n items have exactly k fixed points?
A: Choose which k items stay put, C(n, k) ways, and derange the other n minus k: C(n, k) times D(n - k).

Q: When is inclusion-exclusion easier than counting directly?
A: When the condition is "none of these properties" or "at least one", and the intersections of the properties are easy to count, like "these j items stay in place" or "these j people get nothing".

## math.combinatorics.pigeonhole-principle
name: "Pigeonhole principle"
importance: important
scope: "Pigeonhole principle"

### simple
If you put more pigeons than holes, some hole gets at least two pigeons. It sounds obvious, but it proves that something must happen without finding where. In any group of 13 people, two were born in the same month.

### interview
- **Basic form**: $n + 1$ objects in $n$ boxes force a box with at least 2.
- **General form**: $N$ objects in $k$ boxes force a box with at least $\lceil N/k \rceil$.
- The art is choosing the boxes: remainders mod $n$, regions of a square, pairs that sum to a constant.
- Classic uses: some contiguous block of any $n$ integers has a sum divisible by $n$ (prefix sums mod $n$); among any $n+1$ numbers from 1 to $2n$, two are consecutive and so coprime.
- To show a bound is tight, give an arrangement with one object fewer and no collision.
- It proves existence only; finding the collision is a separate algorithm (often a hash map over the boxes).

### deep
#### Intuition

If every box held at most one object, $n$ boxes would hold at most $n$ objects. More objects than that force a shared box. The general form is the same argument: if every box held at most $\lceil N/k \rceil - 1$ objects, the total would be less than $N$. The difficult part is always the modeling, deciding what the boxes are.

#### Worked example 1: a block sum divisible by n

Claim: any $n$ integers $a_1, \dots, a_n$ contain a contiguous block whose sum is divisible by $n$.

Look at the prefix sums $S_0 = 0, S_1 = a_1, S_2 = a_1 + a_2, \dots, S_n$. That is $n + 1$ numbers and only $n$ possible remainders mod $n$, so two of them, $S_i$ and $S_j$ with $i < j$, share a remainder. Then $S_j - S_i = a_{i+1} + \dots + a_j$ is divisible by $n$.

The bound is tight: $n - 1$ numbers are not enough, since $n - 1$ ones have block sums between 1 and $n - 1$. For example, with $3, 5, 2, 6, 1$ ($n = 5$), the prefix sums are $0, 3, 8, 10, 16, 17$, with remainders $0, 3, 3, 0, 1, 2$. The repeated 3 ($S_1$ and $S_2$) gives the block $5$ on its own, and the repeated 0 ($S_0$ and $S_3$) gives $3 + 5 + 2 = 10$.

#### Worked example 2: points in a square

Place 5 points in a 2 by 2 square. Cut it into four 1 by 1 squares; two points share a small square, so they are at most its diagonal, $\sqrt{2}$, apart.

#### Checking by brute force

The program tries every sequence of $n$ remainders for $n$ up to 7 (that covers all integers, since only remainders matter) and confirms that $n - 1$ numbers can fail.

```cpp
bool hasBlock(const vector<int>& a, int n) {
    vector<bool> seen(n, false);
    int s = 0;
    seen[0] = true;
    for (int x : a) {
        s = (s + x) % n;
        if (seen[s]) return true;
        seen[s] = true;
    }
    return false;
}

int main() {
    for (int n = 2; n <= 7; ++n) {
        long long total = 1, fails = 0, failsShort = 0;
        for (int i = 0; i < n; ++i) total *= n;
        for (long long code = 0; code < total; ++code) {
            vector<int> a;
            for (long long c = code; (int)a.size() < n; c /= n) a.push_back(int(c % n));
            fails += !hasBlock(a, n);
            failsShort += !hasBlock(vector<int>(a.begin() + 1, a.end()), n);
        }
        printf("n=%d: %lld sequences of n, %lld without a block; of n-1 numbers, %lld fail\n",
               n, total, fails, failsShort / n);
    }
}
```

Output:

```text
n=2: 4 sequences of n, 0 without a block; of n-1 numbers, 1 fail
n=3: 27 sequences of n, 0 without a block; of n-1 numbers, 2 fail
n=4: 256 sequences of n, 0 without a block; of n-1 numbers, 6 fail
n=5: 3125 sequences of n, 0 without a block; of n-1 numbers, 24 fail
n=6: 46656 sequences of n, 0 without a block; of n-1 numbers, 120 fail
n=7: 823543 sequences of n, 0 without a block; of n-1 numbers, 720 fail
```

No sequence of $n$ numbers escapes, and for $n - 1$ numbers exactly $(n-1)!$ remainder patterns have no block (the prefix sums must then hit every nonzero remainder once, in some order). Each short pattern appears $n$ times in the loop because the dropped first element can be anything, hence the division by $n$.

#### Variants

- **Erdős–Szekeres**: any sequence of $n^2 + 1$ distinct numbers has an increasing or a decreasing subsequence of length $n + 1$.
- **Birthday-style bounds**: with 367 people, two share a birthday for certain; [the birthday problem](#/concept/puzzles.probability.birthday-problem) asks when it becomes likely.
- **Algorithms**: the same prefix-remainder boxes, stored in a hash map, find the block in $O(n)$.

Connects to: [modular arithmetic for puzzles](#/concept/math.number-theory.modular-arithmetic-for-puzzles), [proof by contradiction](#/concept/math.proofs.proof-by-contradiction-and-contrapositive). Practice: [A matching pair in the dark](#/problems/q-sock-colors).

### questions
Q: State the general pigeonhole principle.
A: If N objects go into k boxes, some box holds at least the ceiling of N over k objects. Otherwise every box would hold at most that ceiling minus one, and the total would be less than N.

Q: Why does any list of n integers have a contiguous block whose sum is divisible by n?
A: The n + 1 prefix sums, starting with 0, have only n possible remainders mod n, so two share a remainder. The numbers between those two prefixes sum to a multiple of n.

Q: How do you show that a pigeonhole bound is tight?
A: Give an arrangement with one object fewer that avoids the collision. For the block-sum claim, n minus 1 ones have no block sum divisible by n.

Q: Does the pigeonhole principle tell you where the collision is?
A: No, only that one exists. To find it you still need an algorithm, such as storing each prefix remainder in a hash map until one repeats.

## math.combinatorics.catalan-numbers
name: "Catalan numbers"
importance: important
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "balanced parentheses, paths, trees"

### simple
Catalan numbers count structures that must never "go below zero", like strings of parentheses where every closing bracket has an opening one before it. They start 1, 1, 2, 5, 14, 42 and grow roughly four times each step. The same numbers count grid paths that stay on one side of the diagonal and the shapes of binary trees.

### interview
- $C_n = \frac{1}{n+1}\binom{2n}{n} = \binom{2n}{n} - \binom{2n}{n+1}$: 1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, 16796.
- Recurrence: $C_{n+1} = \sum_{i=0}^{n} C_i C_{n-i}$ (split at the bracket that closes the first one).
- Counts: balanced strings of $n$ pairs, monotone lattice paths from $(0,0)$ to $(n,n)$ that never cross the diagonal, binary trees with $n$ nodes, triangulations of a polygon with $n + 2$ sides, stack-sortable permutations.
- Proof of the formula: the **reflection principle** maps each bad path one-to-one to a path ending at $(n+1, n-1)$.
- Growth: $C_n \approx \frac{4^n}{n^{3/2}\sqrt{\pi}}$.
- Recognize it when a count satisfies the "first item, then two independent smaller pieces" recurrence.

### deep
#### Intuition

A balanced string is a walk: `(` steps up, `)` steps down, and the walk must end at 0 without dipping below it. Of the $\binom{2n}{n}$ walks with $n$ ups and $n$ downs, some dip below zero. Count those and subtract.

#### The reflection argument

Take a bad walk and find the first step where it reaches $-1$. Flip every step after that point (up becomes down). The walk had $n$ ups and $n$ downs; after the first visit to $-1$ it still had to rise by 1, so it had one more up than down left, and flipping turns that into one more down than up. The new walk has $n - 1$ ups and $n + 1$ downs. Every such walk must cross $-1$ (it ends at $-2$), and flipping back after its first visit to $-1$ recovers the original, so the map is a one-to-one pairing. Therefore

$$C_n = \binom{2n}{n} - \binom{2n}{n+1} = \frac{1}{n+1}\binom{2n}{n}.$$

#### Worked example: n = 3

The $\binom{6}{3} = 20$ strings with three of each bracket include $\binom{6}{4} = 15$ bad ones, leaving 5:

`((()))`, `(()())`, `(())()`, `()(())`, `()()()`.

The recurrence agrees: the first `(` closes after a balanced inside of $i$ pairs, followed by a balanced rest of $2 - i$ pairs, so $C_3 = C_0 C_2 + C_1 C_1 + C_2 C_0 = 2 + 1 + 2 = 5$.

#### Checking by brute force

```cpp
int main() {
    vector<long long> rec(11, 0);
    rec[0] = 1;
    for (int n = 1; n <= 10; ++n)
        for (int i = 0; i < n; ++i) rec[n] += rec[i] * rec[n - 1 - i];
    for (int n = 1; n <= 10; ++n) {
        long long balanced = 0;
        for (int m = 0; m < 1 << (2 * n); ++m) {           // bit set = "("
            if (__builtin_popcount(m) != n) continue;
            int h = 0;
            bool ok = true;
            for (int i = 0; i < 2 * n && ok; ++i) {
                h += (m >> i & 1) ? 1 : -1;
                ok = h >= 0;
            }
            balanced += ok;
        }
        long long c = 1;                                    // C(2n, n) / (n + 1)
        for (int i = 1; i <= n; ++i) c = c * (n + i) / i;
        printf("n=%2d  brute force %5lld  recurrence %5lld  formula %5lld\n", n, balanced,
               rec[n], c / (n + 1));
    }
}
```

Output:

```text
n= 1  brute force     1  recurrence     1  formula     1
n= 2  brute force     2  recurrence     2  formula     2
n= 3  brute force     5  recurrence     5  formula     5
n= 4  brute force    14  recurrence    14  formula    14
n= 5  brute force    42  recurrence    42  formula    42
n= 6  brute force   132  recurrence   132  formula   132
n= 7  brute force   429  recurrence   429  formula   429
n= 8  brute force  1430  recurrence  1430  formula  1430
n= 9  brute force  4862  recurrence  4862  formula  4862
n=10  brute force 16796  recurrence 16796  formula 16796
```

The brute force checks all $2^{2n}$ bracket strings (about a million for $n = 10$), and all three methods agree.

#### Spotting it in disguise

- **Binary trees** with $n$ nodes: the root has a left subtree of $i$ nodes and a right one of $n - 1 - i$, the same recurrence.
- **Grid paths** below the diagonal: right is `(`, up is `)`.
- **A queue of people with coins**: $n$ people pay with a 5 and $n$ with a 10 for a 5 ticket; the orders in which the seller can always give change are balanced strings.
- **Ballot problem**: if A gets $a$ votes and B gets $b < a$, the chance A leads throughout the count is $\frac{a - b}{a + b}$, the same reflection idea.

Connects to: [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations), [random walks](#/concept/prob.markov.random-walks), [counting DP](#/concept/dsa.dp-foundations.counting-dp-and-modulo).

### questions
Q: What are the first few Catalan numbers and the closed formula?
A: 1, 1, 2, 5, 14, 42, 132, 429. The n-th is C(2n, n) divided by n + 1, which equals C(2n, n) minus C(2n, n + 1).

Q: Explain the reflection argument for balanced parentheses.
A: Treat the string as a walk that goes up for an opening bracket and down for a closing one. At the first point a bad walk reaches minus 1, flip all later steps; this pairs bad walks one-to-one with walks of n - 1 ups and n + 1 downs, of which there are C(2n, n + 1).

Q: How many binary trees with 4 nodes are there?
A: 14, the fourth Catalan number. The root splits the other 3 nodes into left and right subtrees, giving the Catalan recurrence 5 + 2 + 2 + 5.

Q: What recurrence signals a Catalan count?
A: C(n + 1) equals the sum over i of C(i) times C(n - i): the first element pairs with a partner, leaving an independent structure inside and another after.

## math.combinatorics.binomial-theorem-and-pascals-identities
name: "Binomial theorem and Pascal's identities"
importance: important
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "Binomial theorem and Pascal's identities"

### simple
The binomial theorem tells you how to expand a power of a sum, like (x + y) to the 5th, without multiplying it out. The coefficients are the counts of ways to choose, and they form Pascal's triangle, where each number is the sum of the two above it. Many counting shortcuts are just rows of this triangle added in clever ways.

### interview
- $(x + y)^n = \sum_{k=0}^{n} \binom{n}{k} x^k y^{n-k}$: each term picks $x$ from $k$ of the $n$ factors.
- **Pascal's rule**: $\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$ (a given item is in the chosen set or not).
- Row sums: $\sum_k \binom{n}{k} = 2^n$; alternating sum $= 0$ for $n \ge 1$; $\sum_k k\binom{n}{k} = n 2^{n-1}$.
- **Vandermonde**: $\sum_k \binom{m}{k}\binom{n}{r-k} = \binom{m+n}{r}$. **Hockey stick**: $\sum_{i=r}^{n} \binom{i}{r} = \binom{n+1}{r+1}$.
- Quick approximations: $(1 + x)^n \approx 1 + nx + \binom{n}{2}x^2$ for small $x$.
- Prove identities by counting one set in two ways, or by plugging values into the theorem.

### deep
#### Intuition

Multiply out $(x + y)^n = (x + y)(x + y)\cdots(x + y)$: every term of the expansion comes from choosing $x$ or $y$ in each of the $n$ brackets. The terms with exactly $k$ choices of $x$ equal $x^k y^{n-k}$, and there are $\binom{n}{k}$ of them. That is the theorem.

Most identities follow by **counting twice**. Pascal's rule: choose $k$ from $n$ people; either Alice is chosen (then $k - 1$ more from $n - 1$) or not ($k$ from $n - 1$). Vandermonde: choose $r$ people from $m$ women and $n$ men by the number $k$ of women. And plugging in: $x = y = 1$ gives $2^n$, $x = -1, y = 1$ gives the alternating sum 0, and differentiating in $x$ then setting $x = y = 1$ gives $\sum k\binom{n}{k} = n2^{n-1}$.

#### Worked examples

1. **Coefficient of $x^3$ in $(2x - 1)^5$**: the term with $k = 3$ is $\binom{5}{3}(2x)^3(-1)^2 = 10 \cdot 8 x^3$, so 80.
2. **Constant term of $\left(x + \frac{2}{x}\right)^6$**: the general term is $\binom{6}{k} x^k \left(\frac{2}{x}\right)^{6-k} = \binom{6}{k} 2^{6-k} x^{2k - 6}$. The power is 0 when $k = 3$: $20 \cdot 8 = 160$.
3. **$1.01^{10}$ in your head**: $1 + 10(0.01) + 45(0.0001) + 120(0.000001) = 1.10462$, and the true value is $1.1046221\ldots$, so three terms already give five decimals.
4. **Hockey stick**: $\binom{2}{2} + \binom{3}{2} + \dots + \binom{9}{2} = 1 + 3 + 6 + \dots + 36 = 120 = \binom{10}{3}$. Counting subsets of $\{1, \dots, 10\}$ of size 3 by their largest element gives exactly this sum.

#### Checking in code

The program expands the powers as integer polynomials and checks the identities on every row up to 30 with exact integers.

```cpp
vector<long long> power(vector<long long> p, int n) {    // p[i] = coefficient of x^i
    vector<long long> r = {1};
    while (n--) {
        vector<long long> t(r.size() + p.size() - 1, 0);
        for (size_t i = 0; i < r.size(); ++i)
            for (size_t j = 0; j < p.size(); ++j) t[i + j] += r[i] * p[j];
        r = t;
    }
    return r;
}

int main() {
    printf("x^3 in (2x-1)^5: %lld\n", power({-1, 2}, 5)[3]);
    printf("constant term of (x + 2/x)^6: %lld\n", power({2, 0, 1}, 6)[6]);  // times x^6
    vector<vector<long long>> C(31, vector<long long>(31, 0));
    for (int n = 0; n <= 30; ++n) {
        C[n][0] = 1;
        for (int k = 1; k <= n; ++k) C[n][k] = C[n - 1][k - 1] + C[n - 1][k];
    }
    int bad = 0;
    for (int n = 1; n <= 30; ++n) {
        long long sum = 0, alt = 0, weighted = 0;
        for (int k = 0; k <= n; ++k)
            sum += C[n][k], alt += (k % 2 ? -1 : 1) * C[n][k], weighted += k * C[n][k];
        bad += sum != 1LL << n || alt != 0 || weighted != n * (1LL << (n - 1));
        for (int r = 0; r < n; ++r) {
            long long hockey = 0;
            for (int i = r; i < n; ++i) hockey += C[i][r];
            bad += hockey != C[n][r + 1];
        }
    }
    for (int m = 0; m <= 15; ++m)
        for (int n = 0; n <= 15; ++n)
            for (int r = 0; r <= m + n; ++r) {
                long long v = 0;
                for (int k = 0; k <= r; ++k) v += k <= m && r - k <= n ? C[m][k] * C[n][r - k] : 0;
                bad += v != C[m + n][r];
            }
    printf("identity failures: %d; 1.01^10 = %.7f, three terms %.7f\n", bad, pow(1.01, 10),
           1 + 10 * 0.01 + 45 * 1e-4 + 120 * 1e-6);
}
```

Output:

```text
x^3 in (2x-1)^5: 80
constant term of (x + 2/x)^6: 160
identity failures: 0; 1.01^10 = 1.1046221, three terms 1.1046200
```

Multiplying $(x + 2/x)^6$ by $x^6$ turns it into the polynomial $(x^2 + 2)^6$, whose $x^6$ coefficient is the constant term; both coefficients match the hand calculation.

#### Common mistakes

- **Dropping the inner coefficient**: the $x^3$ term of $(2x - 1)^5$ is $\binom{5}{3} 2^3$, not $\binom{5}{3}$.
- **Signs**: with $(a - b)^n$, terms with an odd power of $b$ are negative.
- **Rows start at 0**: row $n$ has $n + 1$ entries, $\binom{n}{0}$ to $\binom{n}{n}$.

Connects to: [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations), [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion), [Bernoulli and binomial](#/concept/prob.distributions.bernoulli-and-binomial), [Taylor series](#/concept/math.calculus.taylor-series).

### questions
Q: State the binomial theorem and explain why it holds.
A: (x + y) to the n equals the sum over k of C(n, k) x to the k times y to the n - k. Expanding the product means choosing x or y from each of the n factors, and exactly C(n, k) choices take x from k factors.

Q: Why is the sum of row n of Pascal's triangle 2 to the n?
A: Set x = y = 1 in the binomial theorem. Or count subsets: every subset of an n-element set has some size k, and there are 2 to the n subsets in all.

Q: What is the coefficient of x cubed in (2x - 1) to the 5th?
A: C(5, 3) times 2 cubed times (-1) squared, which is 10 times 8, or 80.

Q: Prove Pascal's rule by counting.
A: To choose k people from n, fix one person. Either they are chosen, leaving k - 1 to pick from the other n - 1, or they are not, leaving k to pick from n - 1. The two cases add to C(n - 1, k - 1) + C(n - 1, k).

Q: How can the binomial theorem approximate 1.01 to the 10th?
A: Take the first terms: 1 + 10 times 0.01 + 45 times 0.0001 + 120 times 0.000001, which is 1.10462. The true value is about 1.1046221, so three terms give five correct decimals.
