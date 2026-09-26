---
topic: math.mental
name: "Mental math and estimation"
subject: math
order: 5
prereqs: []
---

## math.mental.fast-arithmetic
name: "Fast arithmetic"
importance: must
scope: "multiplication tricks, squaring, splitting numbers"

### simple
Fast mental arithmetic is mostly a handful of tricks for turning hard products into easy ones. You split a number into friendly parts, round to a nearby easy number and correct, or use a pattern like squaring numbers that end in 5. With practice the tricks become automatic, like typing without looking at the keys.

### interview
- **Split**: $47 \times 6 = 240 + 42$; $36 \times 24 = 720 + 144$.
- **Round and correct**: $49 \times 17 = 850 - 17$; $998 \times 7 = 7000 - 14$.
- **Difference of squares**: $48 \times 52 = 50^2 - 2^2 = 2496$; $97 \times 103 = 9991$.
- **Squares**: ending in 5, $75^2 = (7 \cdot 8)\,|\,25 = 5625$; near a round base, $47^2 = 2500 - 300 + 9 = 2209$.
- **Easy factors**: $\times 5 = \times 10 \div 2$, $\times 25 = \times 100 \div 4$, $\times 125 = \times 1000 \div 8$; double one factor and halve the other ($16 \times 35 = 8 \times 70$).
- **Same tens digit, units adding to 10**: $63 \times 67 = (6 \cdot 7)\,|\,(3 \cdot 7) = 4221$.
- Work left to right (the big part first) and check the last digit and the size of the answer.

### deep
#### Intuition

Every trick is the distributive law or $(a + b)(a - b) = a^2 - b^2$ in disguise. Your working memory holds only a few numbers, so the goal is to reach the answer through as few, and as round, intermediate numbers as possible, and to handle the largest part first so an interruption still leaves you close.

#### Techniques with worked examples

| technique | example | steps |
|---|---|---|
| split one factor | $36 \times 24$ | $36 \times 20 + 36 \times 4 = 720 + 144 = 864$ |
| round and correct | $49 \times 17$ | $50 \times 17 - 17 = 850 - 17 = 833$ |
| difference of squares | $97 \times 103$ | $100^2 - 3^2 = 9991$ |
| square ending in 5 | $75^2$ | $7 \times 8 = 56$, append 25: $5625$ |
| square near a base | $104^2$ | $10000 + 800 + 16 = 10816$ |
| square by splitting | $63^2$ | $3600 + 2 \cdot 180 + 9 = 3969$ |
| $\times 125$ | $48 \times 125$ | $48000 \div 8 = 6000$ |
| double and halve | $14 \times 45$ | $7 \times 90 = 630$ |
| $\times 11$ | $85 \times 11$ | write $8 + 5 = 13$ between 8 and 5, carry the 1: $935$ |
| units add to 10 | $63 \times 67$ | $6 \times 7 = 42$, $3 \times 7 = 21$: $4221$ |
| left-to-right sum | $367 + 485$ | $700 + 140 + 12 = 852$ |
| complement | $1000 - 386$ | each digit to 9, the last to 10: $614$ |

Why "units add to 10" works: $(10t + u)(10t + 10 - u) = 100t(t + 1) + u(10 - u)$. The square of a number ending in 5 is the special case $u = 5$.

#### Timed practice

Say each answer aloud and aim for about 10 seconds per item; a line of six should take about a minute.

- **Line A (squares)**: $45^2$, $38 \times 42$, $96 \times 104$, $59^2$, $71^2$, $85^2$
- **Line B (split and round)**: $7 \times 86$, $19 \times 23$, $49 \times 32$, $125 \times 36$, $11 \times 67$, $998 \times 6$
- **Line C (mixed)**: $24 \times 35$, $16 \times 45$, $84 \times 86$, $1000 - 427$, $583 + 279$, $58 \times 11$

The program below prints the answer key and checks the two digit patterns for every case they cover.

```cpp
int main() {
    int bad = 0;
    for (int t = 1; t <= 9; ++t)
        for (int u = 1; u <= 9; ++u) {
            int a = 10 * t + u, b = 10 * t + 10 - u;
            bad += a * b != 100 * t * (t + 1) + u * (10 - u);   // includes squares ending in 5
            bad += a * 11 != 100 * t + 10 * (t + u) + u;         // the carry takes care of itself
        }
    printf("pattern failures over all two-digit cases: %d\n", bad);
    printf("A: %d %d %d %d %d %d\n", 45 * 45, 38 * 42, 96 * 104, 59 * 59, 71 * 71, 85 * 85);
    printf("B: %d %d %d %d %d %d\n", 7 * 86, 19 * 23, 49 * 32, 125 * 36, 11 * 67, 998 * 6);
    printf("C: %d %d %d %d %d %d\n", 24 * 35, 16 * 45, 84 * 86, 1000 - 427, 583 + 279, 58 * 11);
}
```

Output:

```text
pattern failures over all two-digit cases: 0
A: 2025 1596 9984 3481 5041 7225
B: 602 437 1568 4500 737 5988
C: 840 720 7224 573 862 638
```

Check your line against the key, note which items took longest, and repeat those first next time.

#### Common mistakes

- **Losing a carry** in the $\times 11$ trick: $85 \times 11$ is 935, not 8135.
- **Correcting the wrong way**: $49 \times 17$ rounds 49 up, so subtract one 17.
- **Reading $(a - b)^2$ as $a^2 - b^2$**: $47^2$ needs the middle term, $2 \cdot 50 \cdot 3 = 300$.

Connects to: [fractions, decimals and percentages](#/concept/math.mental.fractions-decimals-and-percentages), [speed drills](#/concept/math.mental.speed-drills), [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities).

### questions
Q: How do you square a two-digit number ending in 5 quickly?
A: Multiply the tens digit by one more than itself and write 25 after it. For 75, 7 times 8 is 56, so 75 squared is 5625; it follows from (10t + 5) squared = 100t(t + 1) + 25.

Q: How would you compute 97 times 103 in your head?
A: Recognize a difference of squares around 100: (100 - 3)(100 + 3) = 10000 - 9, which is 9991.

Q: What is a quick way to multiply by 25 or 125?
A: Multiply by 100 or 1000 and divide by 4 or 8. For example 48 times 125 is 48000 divided by 8, which is 6000.

Q: How do you check a mental product for mistakes?
A: Check the last digit (the product of the last digits' last digit) and the size (round both factors). For 49 times 32, the last digit must be 8 and the size about 1600, and 1568 passes both.

Q: What trick works for 63 times 67?
A: The tens digits match and the units add to 10, so multiply the tens digit by one more than itself (6 times 7 = 42) and append the product of the units (3 times 7 = 21): 4221.

## math.mental.fractions-decimals-and-percentages
name: "Fractions, decimals and percentages"
importance: must
prereqs: [math.mental.fast-arithmetic]
scope: "quick conversions"

### simple
Fractions, decimals and percentages are three ways of writing the same number, and switching between them quickly saves a lot of time. If you know that one eighth is 12.5%, then three eighths is 37.5% without any division. Percent changes need care, because a rise and an equal fall don't cancel out.

### interview
- Know by heart: $\frac{1}{2}$ to $\frac{1}{12}$ and $\frac{1}{16}$ as decimals; $\frac{1}{7} = 0.\overline{142857}$ (the other sevenths rotate those digits); $\frac{k}{9} = 0.\overline{k}$; $\frac{k}{11} = k \times 0.\overline{09}$.
- $x\%$ of $y$ equals $y\%$ of $x$: 16% of 25 is 25% of 16, which is 4.
- **Successive changes multiply**: $+a$ then $+b$ is $(1 + a)(1 + b) - 1 = a + b + ab$.
- **Reverse percentages**: after a 25% rise the price is 150, so it was $\frac{150}{1.25} = 120$.
- **Points vs percent**: a rate going from 4% to 5% rose 1 percentage point, which is 25%. A basis point is 0.01%.
- **Odds**: "3 to 1 against" is a probability of $\frac{1}{4}$.
- **Compare fractions** by cross-multiplying: $\frac{7}{12} > \frac{11}{19}$ because $133 > 132$.

### deep
#### Intuition

A percentage is a fraction with denominator 100, and a decimal is one with a power of 10. Memorize a small table of unit fractions, and every other conversion becomes a multiplication by a small whole number. For percentages of amounts, break the percentage into easy pieces: 10%, 5% and 1% are just moves of the decimal point and halvings.

#### The table to know

| fraction | decimal | fraction | decimal |
|---|---|---|---|
| $\frac{1}{3}$ | 0.3333 | $\frac{1}{8}$ | 0.125 |
| $\frac{1}{6}$ | 0.1667 | $\frac{1}{9}$ | 0.1111 |
| $\frac{1}{7}$ | 0.142857… | $\frac{1}{11}$ | 0.0909 |
| $\frac{2}{7}$ | 0.285714… | $\frac{1}{12}$ | 0.0833 |
| $\frac{3}{7}$ | 0.428571… | $\frac{1}{16}$ | 0.0625 |

#### Worked examples

- **35% of 80**: 10% is 8, so 30% is 24, and 5% is 4: 28.
- **3/8 as a percentage**: $3 \times 12.5\% = 37.5\%$.
- **Two rises of 10%**: $1.1 \times 1.1 = 1.21$, a 21% rise, not 20%.
- **A rise of 25% then a fall of 20%**: $1.25 \times 0.8 = 1$, back to the start. To undo a rise of $a$, you need a fall of $\frac{a}{1 + a}$.
- **Reverse**: you paid 64 after a 20% discount, so the list price was $\frac{64}{0.8} = 80$.
- **Compare**: $\frac{7}{12}$ or $\frac{11}{19}$? Cross-multiply: $7 \times 19 = 133$, $11 \times 12 = 132$, so $\frac{7}{12}$ is (just) larger.
- **Basis points**: 25 basis points of 2,000,000 is $2{,}000{,}000 \times 0.0025 = 5000$.

#### Timed practice

Aim for about 10 seconds per item.

- **Line A (to decimals)**: $\frac{5}{8}$, $\frac{2}{7}$, $\frac{7}{9}$, $\frac{3}{16}$, $\frac{5}{12}$, $\frac{9}{11}$
- **Line B (percentages)**: 15% of 240; 4% of 175; 12.5% of 64; 60 as a percentage of 75; 1.2% of 3500; 45% of 90
- **Line C (changes)**: two rises of 20%; a rise of 50% then a fall of 40%; the original price if 170 is after 15% off; the percent change from a rate of 8% to 10%; the winning probability at odds of 3 to 2 against; the larger of $\frac{7}{8}$ and $\frac{13}{15}$

```cpp
struct Frac { long long p, q; };

int main() {
    Frac a[] = {{5, 8}, {2, 7}, {7, 9}, {3, 16}, {5, 12}, {9, 11}};
    printf("A:");
    for (auto f : a) printf(" %.6f", double(f.p) / f.q);
    printf("\nB: %g %g %g %g%% %g %g\n", 0.15 * 240, 0.04 * 175, 0.125 * 64, 60.0 / 75 * 100,
           0.012 * 3500, 0.45 * 90);
    printf("C: %+.0f%% %+.0f%% %g %+.0f%% %g %s\n", (1.2 * 1.2 - 1) * 100,
           (1.5 * 0.6 - 1) * 100, 170 / 0.85, (10.0 / 8 - 1) * 100, 2.0 / (3 + 2),
           7 * 15 > 13 * 8 ? "7/8" : "13/15");
    printf("checks: 7/12 vs 11/19 -> %lld vs %lld; 16%% of 25 = %g; 25 bp of 2e6 = %g\n",
           7LL * 19, 11LL * 12, 0.16 * 25, 2e6 * 0.0025);
}
```

Output:

```text
A: 0.625000 0.285714 0.777778 0.187500 0.416667 0.818182
B: 36 7 8 80% 42 40.5
C: +44% -10% 200 +25% 0.4 7/8
checks: 7/12 vs 11/19 -> 133 vs 132; 16% of 25 = 4; 25 bp of 2e6 = 5000
```

#### Common mistakes

- **Adding successive percentages**: two 20% rises make 44%, not 40%.
- **Reversing with the wrong base**: undoing 15% off is dividing by 0.85, not adding 15%.
- **Points and percent**: a move from 8% to 10% is 2 points but a 25% increase.
- **Odds are not probabilities**: 3 to 2 against means 2 wins in 5, a probability of 0.4.

Connects to: [fast arithmetic](#/concept/math.mental.fast-arithmetic), [approximations](#/concept/math.mental.approximations), [percentages, profit and loss](#/concept/apt.quant.percentages-profit-and-loss). Practice: [Up 20%, down 20%](#/problems/q-up-then-down).

### questions
Q: What is 1/7 as a decimal, and how do the other sevenths look?
A: 0.142857 repeating. The other sevenths use the same six digits, starting at a different place: 2/7 is 0.285714 and 3/7 is 0.428571.

Q: A price rises 25% and then falls 20%. Where does it end?
A: Exactly where it started, since 1.25 times 0.8 is 1. Successive changes multiply, and undoing a rise of a takes a fall of a over 1 + a.

Q: What is the difference between a percentage point and a percent change?
A: Points are the plain difference between two percentages; percent change is relative. A rate moving from 4% to 5% rose 1 percentage point, which is a 25% increase.

Q: How do you find 4% of 175 quickly?
A: Swap the roles: 4% of 175 equals 175% of 4, which is 7. The product of the two numbers over 100 is the same either way.

Q: How do you compare 7/12 and 11/19 without a calculator?
A: Cross-multiply: 7 times 19 is 133 and 11 times 12 is 132. The fraction whose numerator gives the larger product, 7/12, is larger.

## math.mental.approximations
name: "Approximations"
importance: important
scope: "square roots, logs, compound growth, rule of 72"

### simple
Good approximations get you within a percent or two in seconds. For a square root, start from the nearest perfect square and adjust; for growth, remember a few logarithms and the rule of 72. In interviews a quick, close answer with a sensible method beats a slow exact one.

### interview
- **Square roots**: $\sqrt{N} \approx a + \frac{N - a^2}{2a}$ from a nearby square $a^2$ (one Newton step); repeat once for more digits. $\sqrt{30} \approx 5.5$, then $5.4773$.
- **Logs to know**: $\log_{10}2 \approx 0.301$, $\log_{10}3 \approx 0.477$, $\log_{10}7 \approx 0.845$; $\ln 2 \approx 0.693$, $\ln 3 \approx 1.099$, $\ln 10 \approx 2.303$. Build others from products: $\log_{10}72 = 3(0.301) + 2(0.477)$.
- $2^{10} \approx 10^3$, so $2^{30} \approx 10^9$ (really $1.07 \times 10^9$).
- **Rule of 72**: money doubles in about $\frac{72}{r}$ years at $r\%$ a year; exact is $\frac{\ln 2}{\ln(1 + r)}$. Use 69 or 70 for continuous or small rates, and about 110 for tripling.
- **Compound growth**: $(1 + r)^n = e^{n\ln(1+r)} \approx e^{nr - nr^2/2}$.
- Always state the direction of your error (the Newton step overestimates a square root).

### deep
#### Intuition

Most approximations are the first term or two of a [Taylor series](#/concept/math.calculus.taylor-series). The square root rule is the tangent line of $\sqrt{x}$ at $a^2$; since $\sqrt{x}$ bends down, the tangent sits above the curve and the estimate is slightly high. The rule of 72 comes from $\ln 2 \approx 0.693$ and $\ln(1 + r) \approx r$; 72 is used instead of 69.3 because it corrects for $\ln(1 + r) < r$ at typical rates and divides evenly by 2, 3, 4, 6, 8, 9 and 12.

#### Worked examples

- **$\sqrt{30}$**: from $5^2 = 25$, $5 + \frac{5}{10} = 5.5$. From $5.5^2 = 30.25$: $5.5 - \frac{0.25}{11} = 5.4773$. The true value is $5.47723$.
- **$\sqrt[3]{30}$**: from $3^3 = 27$, $3 + \frac{3}{3 \cdot 9} = 3.111$ (true $3.107$).
- **$\log_{10}72$**: $72 = 8 \times 9$, so $0.903 + 0.954 = 1.857$ (true 1.8573).
- **$\ln 50$**: $\ln 100 - \ln 2 = 4.605 - 0.693 = 3.912$.
- **$1.07^{10}$**: $10\ln 1.07 \approx 10(0.07 - 0.00245) = 0.6755$, just under $\ln 2 = 0.693$, so about $2e^{-0.0176} \approx 1.965$; the true value is $1.967$.

#### The rule of 72, checked

```cpp
int main() {
    printf("rate  exact years  rule of 72  rule of 70\n");
    for (double r : {1, 2, 4, 6, 8, 10, 12, 15, 20})
        printf("%3g%%  %11.2f  %10.2f  %10.2f\n", r, log(2) / log(1 + r / 100), 72 / r, 70 / r);
    double a = 5.5, s = a - (a * a - 30) / (2 * a);
    printf("sqrt 30: one step 5.5, two steps %.5f, true %.5f\n", s, sqrt(30.0));
    printf("log10 72 = %.4f, ln 50 = %.4f, 1.07^10 = %.4f, 2^30 = %.0f\n", log10(72.0),
           log(50.0), pow(1.07, 10), pow(2.0, 30));
    printf("years to triple at 10%%: %.2f (rule of 110 says 11)\n", log(3) / log(1.1));
    printf("practice key: %.3f %.2f %.3f %.3f %.2f %.3f\n", sqrt(80.0), sqrt(150.0), log10(6.0),
           log(20.0), log(2) / log(1.09), pow(1.05, 14));
}
```

Output:

```text
rate  exact years  rule of 72  rule of 70
  1%        69.66       72.00       70.00
  2%        35.00       36.00       35.00
  4%        17.67       18.00       17.50
  6%        11.90       12.00       11.67
  8%         9.01        9.00        8.75
 10%         7.27        7.20        7.00
 12%         6.12        6.00        5.83
 15%         4.96        4.80        4.67
 20%         3.80        3.60        3.50
sqrt 30: one step 5.5, two steps 5.47727, true 5.47723
log10 72 = 1.8573, ln 50 = 3.9120, 1.07^10 = 1.9672, 2^30 = 1073741824
years to triple at 10%: 11.53 (rule of 110 says 11)
practice key: 8.944 12.25 0.778 2.996 8.04 1.980
```

The rule of 72 is within a third of a year from 4% to 12%, and nearly exact at 8%; the rule of 70 is better at low rates. The two-step square root is high by 0.00004, as the tangent-line argument predicts.

#### Timed practice

Give each to 3 significant figures in about 15 seconds: $\sqrt{80}$, $\sqrt{150}$, $\log_{10}6$, $\ln 20$, the doubling time at 9%, and $1.05^{14}$. (Answers: 8.94, 12.2, 0.778, 3.00, 8.0 years, 1.98.)

Connects to: [Taylor series](#/concept/math.calculus.taylor-series), [fractions, decimals and percentages](#/concept/math.mental.fractions-decimals-and-percentages), [time value of money](#/concept/markets.pricing.time-value-of-money). Practice: [Square root of 50](#/problems/q-sqrt50).

### questions
Q: How do you approximate a square root by hand?
A: Start from a nearby perfect square a squared and add (N - a squared) over 2a. For 30 that gives 5.5, and one more step from 5.5 gives 5.4773, against the true 5.4772.

Q: What is the rule of 72 and where does it come from?
A: Money growing at r% a year doubles in about 72 over r years. Exactly it takes ln 2 over ln(1 + r) years; ln 2 is 0.693, and 72 instead of 69.3 compensates for ln(1 + r) being a bit less than r at typical rates.

Q: What is log base 10 of 72, roughly?
A: 72 is 8 times 9, so it is 3 times 0.301 plus 2 times 0.477, about 1.857.

Q: Roughly how much does 7% a year compound to over 10 years?
A: Almost double: 10 times ln 1.07 is about 0.677, just below ln 2, so the growth factor is about 1.97.

## math.mental.fermi-estimation
name: "Fermi estimation"
importance: must
scope: "structured guessing with orders of magnitude"

### simple
A Fermi estimate answers "about how many" questions without data, by breaking them into pieces you can guess sensibly. Each guess may be rough, but the errors partly cancel, so the final answer usually lands within a small factor of the truth. The structure, said aloud, matters more than the exact number.

### interview
- Define the quantity precisely (per day or per year? which area? which kinds?).
- Split it into a product of factors you can estimate: population × share × frequency × size.
- Use round numbers and powers of ten; keep one significant figure.
- For an uncertain factor, take the geometric mean of a low and a high guess: between 10 and 1000, say 100.
- Cross-check with a second, independent route (top-down against bottom-up, supply against demand).
- Give a range and say which assumption matters most; interviewers grade the structure and the sanity checks.

### deep
#### Intuition

If each factor might be off by up to a factor of 2 either way, and the errors are independent, some are too high and some too low. In the log scale the errors add like random steps, so their total grows like the square root of the number of factors, not linearly. That is why a chain of rough guesses often beats one wild guess at the final number.

#### Worked example: haircuts in a city

*How many hairdressers and barbers work in a city of 10 million people?*

1. **Demand**: men get a haircut about every 5 weeks (10 a year), women about every 10 weeks (5 a year), children less; call it 7 a year on average. That is $7 \times 10^7$ haircuts a year, about $2 \times 10^5$ a day.
2. **Supply**: a stylist does about 12 cuts a day, working 6 days of 7, so about 10 per calendar day.
3. **Answer**: $\frac{2 \times 10^5}{10} = 2 \times 10^4$, about 20,000 stylists.
4. **Cross-check**: a neighborhood of 5,000 people might support 4 or 5 salons with 2 or 3 stylists each, about one stylist per 500 people, which also gives 20,000.

Say the answer as "about 20,000, likely between 10,000 and 40,000; the frequency of haircuts is the least certain factor".

#### How much do errors cancel?

The program below models an estimate made of four factors, each independently off by a random factor between one half and double (uniform in the log scale), and measures how far the product lands from the truth.

```cpp
mt19937_64 rng(2026);
double unif() { return (rng() >> 11) * 0x1.0p-53; }

int main() {
    double haircuts = 1e7 * 7, perDay = haircuts / 365, stylists = perDay / (12.0 * 6 / 7);
    printf("haircuts per day %.0f, stylists %.0f\n", perDay, stylists);
    const int trials = 1'000'000;
    for (int k : {1, 2, 4, 8}) {
        int within2 = 0, within4 = 0;
        for (int t = 0; t < trials; ++t) {
            double log2err = 0;
            for (int i = 0; i < k; ++i) log2err += 2 * unif() - 1;  // each factor: x0.5 to x2
            within2 += fabs(log2err) <= 1, within4 += fabs(log2err) <= 2;
        }
        printf("%d factors: worst case x%-3.0f within x2: %.3f  within x4: %.3f\n", k,
               pow(2.0, k), double(within2) / trials, double(within4) / trials);
    }
}
```

Output:

```text
haircuts per day 191781, stylists 18645
1 factors: worst case x2   within x2: 1.000  within x4: 1.000
2 factors: worst case x4   within x2: 0.751  within x4: 1.000
4 factors: worst case x16  within x2: 0.598  within x4: 0.916
8 factors: worst case x256 within x2: 0.453  within x4: 0.775
```

With four factors the worst case is 16 times off, but in this model the product lands within a factor of 2 of the truth 60% of the time and within a factor of 4 about 92% of the time. More factors widen the spread far more slowly than the worst case: with 8 factors (worst case 256 times) the product is still within a factor of 4 in 78% of runs. (The model assumes the errors are independent; errors that all lean the same way, from one wrong belief, don't cancel.)

#### Timed practice

Give yourself 2 minutes for each, and say the structure aloud before any number:

- Pizzas delivered in a city of 5 million people on a Friday evening.
- Liters of water used by a 10-story office building on a working day.
- Phone chargers sold in a country of 100 million people in a year.

There is no single right answer; compare your factors with someone else's, and check each estimate from a second direction.

#### Common mistakes

- **No structure**: guessing the final number directly hides every assumption.
- **False precision**: "18,645 stylists" suggests accuracy the method can't have; say "about 20,000".
- **Unit slips**: per day against per year is a factor of 365; write units on every line.
- **Skipping the sanity check**: compare with something you know (one stylist per 500 people is believable; one per 50 isn't).

Connects to: [back-of-the-envelope estimation](#/concept/sysd.method.back-of-the-envelope-estimation), [approximations](#/concept/math.mental.approximations), [communicating while solving](#/concept/puzzles.method.communicating-while-solving). Practice: [Cars in a big city](#/problems/q-fermi-cars) and [Office tea and coffee](#/problems/q-fermi-tea).

### questions
Q: What are the steps of a good Fermi estimate?
A: Define the quantity and its units, break it into factors you can estimate, estimate each with round numbers, multiply using powers of ten, cross-check with a second route, and give a range while naming the weakest assumption.

Q: Why do Fermi estimates often land close to the truth?
A: When several factors each have independent errors, some are too high and others too low, so in the log scale the errors partly cancel and grow only like the square root of the number of factors.

Q: How do you pick a value for a factor you are unsure about?
A: Name a low and a high value you are confident bracket it, and take their geometric mean, the square root of their product, which splits the uncertainty evenly in ratio terms.

Q: How would you sanity-check an estimate of 20,000 hairdressers in a city of 10 million?
A: Compare with local experience: that is one stylist per 500 people, about 10 for a neighborhood of 5,000, which matches a few salons with a few chairs each. A result of one per 50 people would signal an error.

## math.mental.speed-drills
name: "Speed drills"
importance: must
prereqs: [math.mental.fast-arithmetic]
scope: "timed arithmetic tests used by trading firms"

### simple
Some trading firms start with a timed arithmetic test: many quick questions in a few minutes, with no calculator. It rewards accuracy under time pressure, which comes from daily practice rather than talent. A little each day, with your mistakes tracked, improves scores steadily.

### interview
- Formats vary by firm and change over time: candidates commonly report dozens of questions in a few minutes (80 in 8 is a widely reported format), mixing sums, products, division, decimals and fractions, sometimes multiple choice and sometimes with a penalty for wrong answers.
- Pace is the constraint: 80 questions in 8 minutes is 6 seconds each, so skip anything slow and come back.
- With a penalty for wrong answers, guess only when you can eliminate enough options to make the expected score positive.
- On multiple choice, estimate: check the last digit and the size instead of computing fully.
- Practice short daily sessions (10 to 15 minutes), record accuracy and time, and drill your slowest question types.
- Warm up just before the test with a few easy items; the first minute is where most time is lost.

### deep
#### What the tests reward

A timed test measures how many correct answers you give per minute. Two levers move that number: faster recall of facts (times tables to 12 × 12, squares to 30, the [fraction table](#/concept/math.mental.fractions-decimals-and-percentages)) and better decisions about which questions to spend time on. The [tricks for products](#/concept/math.mental.fast-arithmetic) help only once they are automatic, which is what drilling builds.

#### Guessing when wrong answers cost points

Suppose a right answer scores +1, a wrong one −1 and a skip 0, with 5 options. A blind guess is right with probability $\frac{1}{5}$, so its expected score is $\frac{1}{5} - \frac{4}{5} = -0.6$: skip. If you can rule out $e$ options, the chance becomes $\frac{1}{5 - e}$ and the expected score $\frac{2}{5 - e} - 1$, which is positive only when $5 - e < 2$, that is, when you are sure of the answer. With a milder penalty of $-\frac{1}{4}$, a blind guess is worth exactly 0, and any elimination makes guessing pay. Read the scoring rules before the test; they change the best strategy.

#### A practice routine

1. Set a timer for 5 minutes and answer as many items as you can from a generator (below, or any arithmetic drill tool), typing each answer.
2. Record the score and the error rate. Accuracy comes first: aim for at least 95% correct before pushing speed.
3. Write down every question that took more than 10 seconds, and drill that type for 5 minutes.
4. Repeat daily. Scores usually rise quickly in the first weeks and then level off; the gains come from recall that no longer needs thought.

#### A generated practice set

The program makes a seeded practice set in the usual style: sums of two numbers from 2 to 100, products of a number from 2 to 12 with one from 2 to 100, and the reverse subtraction and division, with the answer key. It also prints the expected score of guessing under two penalty rules.

```cpp
mt19937_64 rng(2026);
int pick(int lo, int hi) { return lo + int(rng() % (hi - lo + 1)); }

int main() {
    for (int i = 1; i <= 12; ++i) {
        int a = pick(2, 100), b = pick(2, 100), c = pick(2, 12);
        switch (i % 4) {
            case 1: printf("%2d. %d + %d = %d\n", i, a, b, a + b); break;
            case 2: printf("%2d. %d - %d = %d\n", i, a + b, a, b); break;
            case 3: printf("%2d. %d x %d = %d\n", i, c, a, c * a); break;
            default: printf("%2d. %d / %d = %d\n", i, c * a, c, a); break;
        }
    }
    for (double penalty : {1.0, 0.25}) {
        printf("penalty %.2f:", penalty);
        for (int e = 0; e <= 3; ++e) {
            double p = 1.0 / (5 - e);
            printf("  ruled out %d: %+.3f", e, p - (1 - p) * penalty);
        }
        printf("\n");
    }
}
```

Output:

```text
 1. 10 + 44 = 54
 2. 143 - 73 = 70
 3. 6 x 47 = 282
 4. 244 / 4 = 61
 5. 72 + 95 = 167
 6. 109 - 17 = 92
 7. 9 x 92 = 828
 8. 96 / 4 = 24
 9. 78 + 13 = 91
10. 174 - 89 = 85
11. 9 x 68 = 612
12. 432 / 9 = 48
penalty 1.00:  ruled out 0: -0.600  ruled out 1: -0.500  ruled out 2: -0.333  ruled out 3: +0.000
penalty 0.25:  ruled out 0: +0.000  ruled out 1: +0.062  ruled out 2: +0.167  ruled out 3: +0.375
```

Cover the answers after the equals signs and time yourself on the twelve items; at 6 seconds each, a real test would allow about 72 seconds for them. The expected-score table shows why a full penalty makes blind guessing costly while a quarter penalty makes it neutral.

#### Common mistakes

- **Speed before accuracy**: under a penalty, a fast wrong answer is worse than a skip.
- **Getting stuck**: spending 30 seconds on one item costs about five easy ones.
- **Practicing only what you are good at**: the slowest question types give the biggest gains.

Connects to: [fast arithmetic](#/concept/math.mental.fast-arithmetic), [fractions, decimals and percentages](#/concept/math.mental.fractions-decimals-and-percentages), [expected value decisions](#/concept/markets.betting.expected-value-decisions).

### questions
Q: With 80 questions in 8 minutes, how much time do you have per question, and what does that imply?
A: Six seconds. Anything that needs more than a few steps should be skipped and revisited, and the basic facts must be recalled rather than computed.

Q: On a five-option test where a wrong answer costs a full point, should you guess blindly?
A: No. A blind guess is right one time in five, so its expected score is 0.2 minus 0.8, or -0.6. It only pays once you are sure, and it breaks even with a quarter-point penalty.

Q: How should you practice for a timed arithmetic test?
A: Short daily sessions with a timer, typing answers, recording accuracy and speed, and then drilling the question types that were slowest. Accuracy first, then speed.

Q: How can estimation help on multiple-choice arithmetic?
A: Check the last digit and the rough size of the answer instead of computing it fully; often only one option passes both checks.
