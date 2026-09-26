---
topic: apt.quant
name: "Quantitative aptitude"
subject: apt
order: 1
prereqs: []
---

## apt.quant.percentages-profit-and-loss
name: "Percentages, profit and loss"
importance: must
scope: "Percentages, profit and loss"

### simple
A percentage is a fraction out of 100, and every percentage is taken of something, its base. Profit and loss questions are percentage questions with named bases: profit is measured on the cost price, and a discount on the marked price. Most mistakes come from using the wrong base, like measuring a shop's discount against what the shop paid instead of the price on the tag.

### interview
- **Name the base first**: profit or loss percent is on the cost price (CP) unless the question says otherwise; a discount is on the marked price (MP); the selling price is $SP = MP \times (1 - d)$.
- **Multiply factors**: a 40% markup and 15% off give $1.4 \times 0.85 = 1.19$, a 19% profit. Two successive changes $a\%$ and $b\%$ make $a + b + \frac{ab}{100}$ percent.
- **Reverse by dividing**: 4,400 after a 12% loss means $CP = \frac{4400}{0.88} = 5000$. Never add the percentage back.
- **Undo a change**: after a rise of $r$, a fall of $\frac{r}{1 + r}$ restores the start (25% up needs 20% down).
- **Equal selling prices, $x\%$ up and $x\%$ down**: always a loss of $\frac{x^2}{100}\%$ overall.
- **False weights**: selling 950 g as a kilogram at the cost price gains $\frac{50}{950} \approx 5.26\%$, measured on what the seller really gives.

### deep
#### Intuition

Turn every percentage into a factor: a 12% rise is $\times 1.12$, 15% off is $\times 0.85$. A chain of changes is a product of factors and going backwards is a division, so profit, loss, markup, discount and successive changes become one kind of question. Profit is on the cost price, a discount on the marked price.

#### Worked examples

1. **Markup, then discount.** Cost 2,000, marked 40% up, sold at 15% off: $2000 \times 1.4 \times 0.85 = 2380$, a 19% profit.
2. **Same price, opposite percentages.** Two phones sell for 12,000 each, at a 25% profit and a 25% loss. They cost $\frac{12000}{1.25} = 9600$ and $\frac{12000}{0.75} = 16000$: 24,000 back for 25,600, a 6.25% loss ($\frac{25^2}{100}$).
3. **False weight.** Cost price, but 950 g per kilogram: $\frac{1000}{950} - 1 = \frac{1}{19} \approx 5.26\%$. With a 5% markup too, $\frac{1050}{950} - 1 \approx 10.53\%$.
4. **Reverse.** Sold for 4,400 at a 12% loss, so it cost 5,000; a 10% gain needs 5,500.
5. **Flat spending.** Fuel gets 25% dearer; use $\frac{25}{125} = 20\%$ less.
6. **Successive changes.** Raises of 10% then 20%: $1.1 \times 1.2 = 1.32$, that is $10 + 20 + \frac{200}{100} = 32\%$. Discounts of 20% then 10% make 28% off, not 30%.

#### When the shortcuts break

- $a + b + \frac{ab}{100}$ assumes the second change applies to the new amount. A 10% bonus and a 20% raise both on base pay make 30%. For three or more changes, multiply the factors.
- The $\frac{x^2}{100}$ loss needs equal **selling** prices. With equal **cost** prices, $x\%$ up and $x\%$ down cancel exactly.
- "A is 25% more than B" does not mean "B is 25% less than A": B is $\frac{25}{125} = 20\%$ less, because the base changed.

#### Code

In exact fractions: the answers above, both shortcuts checked for every whole percentage, and the practice key.

```cpp
struct Frac {
    long long n, d;
    Frac(long long a = 0, long long b = 1) : n(a), d(b) {
        long long g = gcd(n, d); if (d < 0) g = -g;
        n /= g; d /= g;
    }
};
Frac operator+(Frac a, Frac b) { return {a.n * b.d + b.n * a.d, a.d * b.d}; }
Frac operator-(Frac a, Frac b) { return {a.n * b.d - b.n * a.d, a.d * b.d}; }
Frac operator*(Frac a, Frac b) { return {a.n * b.n, a.d * b.d}; }
Frac operator/(Frac a, Frac b) { return {a.n * b.d, a.d * b.n}; }
bool operator==(Frac a, Frac b) { return a.n == b.n && a.d == b.d; }
Frac up(long long x) { return Frac(100 + x, 100); }  // a change of x percent as a factor

void show(const char* label, initializer_list<Frac> xs, bool percent) {
    printf("%s:", label);
    for (Frac f : xs) {
        Frac v = percent ? f * 100 : f;
        printf(" %lld", v.n);
        if (v.d != 1) printf("/%lld", v.d);
        if (percent) printf("%%");
        if (v.d != 1) printf(" (%.2f)", double(v.n) / v.d);
    }
    printf("\n");
}

int main() {
    Frac c1 = Frac(12000) / up(25), c2 = Frac(12000) / up(-25), bike = Frac(4400) / up(-12);
    show("examples", {up(40) * up(-15) - 1, 1 - Frac(24000) / (c1 + c2), Frac(1000, 950) - 1,
                      Frac(1050, 950) - 1, 1 - 1 / up(25), up(10) * up(20) - 1}, true);
    show("bicycle", {bike, bike * up(10)}, false);
    int bad = 0;  // check both shortcuts for every whole-number percentage
    for (int a = -50; a <= 100; ++a)
        for (int b = -50; b <= 100; ++b)
            bad += !(up(a) * up(b) - 1 == Frac(a, 100) + Frac(b, 100) + Frac(a * b, 10000));
    for (int x = 1; x <= 99; ++x)  // equal selling prices of 1, so costs 1/up(x) and 1/up(-x)
        bad += !(1 - Frac(2) / (1 / up(x) + 1 / up(-x)) == Frac(x * x, 10000));
    printf("shortcut failures: %d\n", bad);
    show("A", {up(30) * up(-10) - 1, 1 - up(-25) * up(-20), Frac(30, 24), 1 / up(-20) - 1,
               1 - 1 / up(20), 1 - Frac(2) / (1 / up(10) + 1 / up(-10))}, true);
    show("B", {Frac(360) * Frac(15, 100), Frac(3200) / up(-20), Frac(1380) / up(15),
               Frac(2700) / up(-10), Frac(3600) * up(25), Frac(840) * up(50) * up(-50)}, false);
}
```

Output:

```text
examples: 19% 25/4% (6.25) 100/19% (5.26) 200/19% (10.53) 20% 32%
bicycle: 5000 5500
shortcut failures: 0
A: 17% 40% 125% 25% 50/3% (16.67) 1%
B: 54 4000 1200 3000 4500 630
```

#### Timed practice

About 20 seconds per item; the key is lines A and B of the output above.

- **Line A (percent)**: profit when marked 30% up and sold 10% off; 25% then 20% off as one discount; 30 as a share of 24; A is 20% below B, so B is how far above A; the cut in use after a 20% price rise; loss on equal prices, 10% up and 10% down
- **Line B (amounts)**: 15% of 360; cost if 3,200 is a 20% loss; cost if 1,380 is a 15% profit; marked price if 10% off leaves 2,700; price for 25% on a cost of 3,600; 840 after +50% then −50%

Connects to: [fractions, decimals and percentages](#/concept/math.mental.fractions-decimals-and-percentages), [simple and compound interest](#/concept/apt.quant.simple-and-compound-interest), [mixtures and alligation](#/concept/apt.quant.mixtures-and-alligation). Practice: [Up 20%, down 20%](#/problems/q-up-then-down).

### questions
Q: An item is marked 40% above its cost and sold at 15% off. What is the profit percentage?
A: Multiply the factors: 1.4 times 0.85 is 1.19, so the profit is 19% of the cost. Adding and subtracting (40 minus 15 = 25) is wrong because the discount applies to the marked price, not the cost.

Q: Two items sell for the same price, one at a 25% profit and one at a 25% loss. What is the overall result?
A: A 6.25% loss. The costs are 1/1.25 and 1/0.75 of the price, so the loss-making item cost more; with equal selling prices and x% up and down, the loss is always x squared over 100 percent.

Q: A price rises 25%. By how much must consumption fall to keep spending the same?
A: By 25/125 = 20%. In general, a rise of r needs a fall of r/(1 + r), because the fall is measured on the new, higher price.

Q: A seller sells at the cost price but gives 950 g instead of a kilogram. What is the gain?
A: 50 on the 950 actually given, which is 1/19 or about 5.26%. The gain is measured on the goods handed over, not on the 1000 claimed.

Q: When does the successive-percentage shortcut a + b + ab/100 fail?
A: When the second percentage is taken of the original base rather than the changed amount, as with a bonus and a raise both computed on base pay; then the changes simply add. It also covers only two changes; for more, multiply the factors.

## apt.quant.ratios-proportions-and-averages
name: "Ratios, proportions and averages"
importance: must
scope: "Ratios, proportions and averages"

### simple
A ratio compares amounts by parts: 2:3 means that for every 2 of one thing there are 3 of the other, whatever the actual sizes. An average is the value everyone would have if the total were shared equally. Most questions come down to one idea: keep track of the total, like counting the money in a shared pot before and after someone joins.

### interview
- **Parts**: in $a:b$, the whole is $a + b$ parts; 7,000 in the ratio 8:12:15 gives $\frac{8}{35}$ of it to the first share.
- **Chain ratios** through the shared term: $A:B = 2:3$ and $B:C = 4:5$ scale $B$ to 12, so $A:B:C = 8:12:15$.
- **Proportions**: in $a:b = c:d$, $ad = bc$. The fourth proportional to 3, 7, 12 is $\frac{7 \times 12}{3} = 28$; the mean proportional of 8 and 18 is $\sqrt{8 \times 18} = 12$.
- **Average = total ÷ count**, so work with totals: a new value that lifts the average of $n$ items by $\Delta$ is $\text{new average} + n\Delta$.
- **Weighted average**: groups of 30 at 70 and 20 at 80 average $\frac{30 \times 70 + 20 \times 80}{50} = 74$, not 75.
- **Assumed mean**: pick a round guess, average the deviations, and add them back.

### deep
#### Intuition

A ratio fixes shape, not size: write $3:5$ as $3k$ and $5k$, and one more fact (a total, a difference, a later ratio) fixes $k$. An average hides a total, so turn "24 students average 62" into "the total is 1,488" first.

#### Worked examples

1. **Chained ratios.** $A:B = 2:3$ and $B:C = 4:5$. Make $B$ equal in both: $\text{lcm}(3, 4) = 12$, giving $8:12:15$ (35 parts). Shares of 7,000: 1,600, 2,400 and 3,000.
2. **Ages.** Two siblings' ages are $3:5$; in 6 years they will be $5:7$. With $3k$ and $5k$: $7(3k + 6) = 5(5k + 6)$, so $k = 3$ and the ages are 9 and 15.
3. **A new member.** 24 students average 62; one more joins and the average becomes 63. The totals are $63 \times 25 - 62 \times 24 = 87$. Shortcut: the newcomer brings the new average plus one mark for each of the other 24, $63 + 24 = 87$.
4. **A replacement.** Eight people average 1.5 kg more after a 65 kg person is replaced: the newcomer weighs $65 + 8 \times 1.5 = 77$ kg.
5. **Assumed mean.** For 47, 52, 49, 55, 51, 46, guess 50: deviations $-3, 2, -1, 5, 1, -4$ sum to 0, so the mean is 50.
6. **Weighted average.** Sections of 30 at 70 and 20 at 80 average 74. The plain average of the two averages, 75, is right only when the groups are the same size.

#### When the shortcuts break

- The "new average plus $n\Delta$" rule counts the **old** members, $n$; mixing up $n$ and $n + 1$ is the usual slip.
- Averaging averages is wrong unless the weights are equal; use totals.
- Ratios need the same units: 2 kg to 500 g is $4:1$, not $2:500$.
- Several ratios with no shared term (A to B and C to D) can't be chained without more facts.

#### Code

Age-style questions are solved by trying every pair of whole numbers up to 100, which checks the algebra.

```cpp
// Combine a:b and b:c by scaling b to lcm of its two values.
array<long long, 3> combine(long long a, long long b1, long long b2, long long c) {
    long long l = lcm(b1, b2);
    return {a * l / b1, l, c * l / b2};
}

// Every pair of whole numbers up to 100 in ratio p:q that become r:s after adding `shift`.
vector<pair<int, int>> pairs(int p, int q, int shift, int r, int s) {
    vector<pair<int, int>> found;
    for (int x = 1; x <= 100; ++x)
        for (int y = 1; y <= 100; ++y)
            if (x * q == y * p && (x + shift) * s == (y + shift) * r) found.push_back({x, y});
    return found;
}

double mean(vector<double> v) { return accumulate(v.begin(), v.end(), 0.0) / v.size(); }

int main() {
    auto r = combine(2, 3, 4, 5);
    long long parts = r[0] + r[1] + r[2];
    printf("ratio %lld:%lld:%lld, shares of 7000: %lld %lld %lld\n", r[0], r[1], r[2],
           7000 * r[0] / parts, 7000 * r[1] / parts, 7000 * r[2] / parts);
    for (auto [x, y] : pairs(3, 5, 6, 5, 7)) printf("ages: %d and %d\n", x, y);
    printf("new student: %d; replacement: %g\n", 63 * 25 - 62 * 24, 65 + 8 * 1.5);
    printf("assumed mean: %g; weighted: %g, not %g\n", mean({47, 52, 49, 55, 51, 46}),
           (30 * 70 + 20 * 80) / 50.0, (70 + 80) / 2.0);
    auto a = combine(3, 4, 6, 7);
    long long g = gcd(a[0], a[2]);
    printf("A: %d %lld:%lld %g %g %d %d\n", 1800 * 4 / 9, a[0] / g, a[2] / g, 7.0 * 12 / 3,
           sqrt(8.0 * 18), pairs(4, 5, 5, 5, 6)[0].second, pairs(3, 5, -4, 1, 2)[0].second);
    printf("B: %g %g %g %g %g %g\n", mean({42, 45, 48, 51, 54}), (10 * 30 - 48) / 9.0,
           (40 * 60 + 10 * 75) / 50.0, 3 * 18 + 3 * 23 - 5 * 20.0, 50 + 6 * 2.0,
           42 * 12 - 40 * 11.0);
}
```

Output:

```text
ratio 8:12:15, shares of 7000: 1600 2400 3000
ages: 9 and 15
new student: 87; replacement: 77
assumed mean: 50; weighted: 74, not 75
A: 800 9:14 28 12 25 20
B: 48 28 63 23 62 64
```

#### Timed practice

About 20 seconds per item; the key is lines A and B of the output.

- **Line A (ratios)**: largest share of 1,800 split $2:3:4$; $A:C$ if $A:B = 3:4$, $B:C = 6:7$; fourth proportional to 3, 7, 12; mean proportional of 8 and 18; the elder age if ages are $4:5$ now, $5:6$ in 5 years; the larger of two numbers in ratio $3:5$ that become $1:2$ when 4 is taken from each
- **Line B (averages)**: mean of 42, 45, 48, 51, 54; ten numbers average 30, the mean without 48; 40 at 60 joined by 10 at 75; five average 20, the first three 18, the last three 23, the middle one; six gain 2 on average when 50 is replaced, the newcomer; the 12th score lifting 40 over 11 games to 42

Connects to: [percentages, profit and loss](#/concept/apt.quant.percentages-profit-and-loss), [mixtures and alligation](#/concept/apt.quant.mixtures-and-alligation), [time and work](#/concept/apt.quant.time-and-work), [expectation](#/concept/prob.random-variables.expectation).

### questions
Q: How do you combine A:B = 2:3 and B:C = 4:5 into one ratio?
A: Scale both so B is the same: the least common multiple of 3 and 4 is 12, so A:B = 8:12 and B:C = 12:15, giving A:B:C = 8:12:15.

Q: The average of 24 students is 62. A new student raises it to 63. What did the new student score?
A: 87. The new total is 63 times 25 = 1575 and the old one 62 times 24 = 1488; the difference is the new score. Equivalently, the newcomer brings the new average plus one mark for each of the 24 others.

Q: Why is the average of two class averages not the average of all students?
A: Each class average must be weighted by its size. With 30 students at 70 and 20 at 80 the overall average is 74, not 75; the plain average is right only for equal group sizes.

Q: What are the fourth and mean proportionals?
A: The fourth proportional to a, b, c is d with a:b = c:d, so d = bc/a. The mean proportional of a and b is x with a:x = x:b, so x is the square root of ab.

Q: Ages are 3:5 now and will be 5:7 in six years. How do you solve it quickly?
A: Write them as 3k and 5k and cross-multiply the later ratio: 7(3k + 6) = 5(5k + 6) gives k = 3, so the ages are 9 and 15. The difference in ages stays fixed, which is a quick check.

## apt.quant.time-speed-and-distance
name: "Time, speed and distance"
importance: must
scope: "relative speed, trains, boats and streams"

### simple
Distance equals speed times time, and almost every question here is that one rule with a twist. When two things move, what matters is how fast the gap between them changes: add the speeds when they approach each other, subtract when one chases the other. A train crossing something has to travel its own length too, like a long bus that has fully passed a pole only when its back end goes by.

### interview
- $d = s \times t$; convert km/h to m/s by $\times \frac{5}{18}$ (72 km/h = 20 m/s).
- **Relative speed**: opposite directions add, same direction subtract. Time to meet or catch up = gap ÷ relative speed.
- **Trains**: passing a pole or person takes $\frac{L}{s}$; a platform or bridge $\frac{L + P}{s}$; another train $\frac{L_1 + L_2}{\text{relative speed}}$.
- **Boats**: downstream $b + s$, upstream $b - s$, so $b = \frac{d + u}{2}$ and $s = \frac{d - u}{2}$.
- **Average speed** over equal distances is the harmonic mean $\frac{2ab}{a + b}$ (40 out, 60 back: 48); over equal times it is $\frac{a + b}{2}$.
- **Late and early**: the time difference between two speeds over the same distance fixes the distance: $\frac{d}{5} - \frac{d}{6} = \frac{10}{60}$ gives 5 km.

### deep
#### Intuition

Watch the gap. Trains approaching at 54 and 36 km/h close it at 90 km/h, as if one stood still and the other ran at 90. Every meeting, chase and crossing becomes "gap ÷ closing speed"; for a crossing, the gap is the total length that must slide past.

#### Worked examples

1. **Platform.** 240 m at 72 km/h (20 m/s) crosses a 360 m platform in $\frac{600}{20} = 30$ s, a pole in 12 s.
2. **Two trains.** 180 m at 54 km/h, 120 m at 36 km/h. Opposite ways: $\frac{300}{25} = 12$ s; same way: 5 m/s relative, 60 s.
3. **Boat.** 24 km downstream in 2 h, upstream in 3 h: $d = 12$, $u = 8$, so boat 10 km/h, stream 2 km/h.
4. **Round trip.** 40 out, 60 back: $\frac{2 \times 40 \times 60}{100} = 48$ km/h, not 50; the slow leg lasts longer.
5. **Chase.** A van leaves at 9:00 at 30 km/h, a car at 9:30 at 40 km/h. The 15 km gap closes at 10 km/h: caught at 11:00, 60 km out.
6. **Late or early.** 6 minutes late at 5 km/h, 4 early at 6 km/h: $\frac{d}{5} - \frac{d}{6} = \frac{10}{60}$ hours, so $d = 5$ km.

#### When the shortcuts break

- The harmonic mean needs **equal distances**. Equal times give the plain mean; anything else needs total distance over total time.
- Relative speed on a **circular track** gives the first meeting anywhere (track length ÷ relative speed); meeting again at the start needs the least common multiple of the lap times.
- Boat formulas assume the stream and the boat's own speed stay constant for the whole trip.
- Mixing km/h with metres is the most common wrong answer, and it is usually among the options.

#### Code

Instead of the formula, the program moves the trains 1 ms at a time in exact integer units, runs the chase minute by minute and tries every distance for the late-and-early question. The boat and average-speed answers are plain arithmetic.

```cpp
// Milliseconds until A's rear passes B's far end, stepping 1 ms at a time. Lengths in m,
// speeds in km/h, positions in 1/36 mm, so v km/h moves exactly 10v units per ms.
// vB < 0: B comes the other way; vB = 0: B stands still.
long long crossMs(long long lenA, long long vA, long long lenB, long long vB) {
    long long rearA = -lenA * 36000, farB = lenB * 36000, t = 0;
    while (rearA < farB) rearA += 10 * vA, farB += 10 * vB, ++t;
    return t;
}

// Smallest whole number of metres that takes `diff` minutes longer at v1 than at v2 km/h
// (d metres at v km/h take 60d / 1000v minutes; compared exactly).
int lateEarly(int v1, int v2, int diff) {
    for (int d = 1; d <= 100000; ++d)
        if (60 * d * v2 - 60 * d * v1 == diff * 1000 * v1 * v2) return d;
    return -1;
}

int main() {
    printf("platform %lld ms, pole %lld ms\n", crossMs(240, 72, 360, 0), crossMs(240, 72, 0, 0));
    printf("opposite %lld ms, same way %lld ms\n", crossMs(180, 54, 120, -36),
           crossMs(180, 54, 120, 36));
    int minute = 30;  // the chase, minute by minute: 30 km/h from 9:00, 40 km/h from 9:30
    while (40 * (minute - 30) < 30 * minute) ++minute;
    printf("caught %d min after 9:00; late or early: %d m\n", minute, lateEarly(5, 6, 10));
    printf("A: %g %lld %lld %lld %lld %d\n", 90 / 3.6, crossMs(150, 54, 0, 0) / 1000,
           crossMs(200, 72, 300, 0) / 1000, crossMs(100, 72, 150, -18) / 1000,
           crossMs(120, 72, 180, 54) / 1000, 400 / (5 + 3));
    printf("B: %d %d %d %g %g %d\n", (15 + 9) / 2, (15 - 9) / 2, 30 / (8 + 2) + 30 / (8 - 2),
           2 * 30 * 20 / 50.0, (40 + 60) / 2.0, lateEarly(4, 5, 15));
}
```

Output:

```text
platform 30000 ms, pole 12000 ms
opposite 12000 ms, same way 60000 ms
caught 120 min after 9:00; late or early: 5000 m
A: 25 10 25 10 60 50
B: 12 3 8 24 50 5000
```

#### Timed practice

About 20 seconds per item; the key is lines A and B.

- **Line A (seconds unless stated)**: 90 km/h in m/s; 150 m at 54 km/h past a pole; 200 m at 72 km/h over a 300 m bridge; 100 m and 150 m at 72 and 18 km/h, opposite ways; 120 m at 72 overtaking 180 m at 54 km/h; 5 and 3 m/s opposite ways round a 400 m track, first meeting
- **Line B**: boat speed if downstream is 15 and upstream 9 km/h; the stream; hours for 30 km down and back at 8 km/h in a 2 km/h stream; average of 30 out and 20 back; average of 1 h at 40 and 1 h at 60; metres to school if 4 km/h is 10 minutes late and 5 km/h 5 early

Connects to: [clocks and angles](#/concept/puzzles.logic.clocks-and-angles) (the hands are two runners on a circular track), [time and work](#/concept/apt.quant.time-and-work), [ratios, proportions and averages](#/concept/apt.quant.ratios-proportions-and-averages). Practice: [When the hands meet](#/problems/q-hands-meet).

### questions
Q: Why is the average speed of a round trip at 40 and 60 km/h not 50?
A: Average speed is total distance over total time, and the slow leg takes longer, so it gets more weight. Over equal distances the average is the harmonic mean, 2 times 40 times 60 over 100 = 48 km/h.

Q: How long does a 240 m train at 72 km/h take to cross a 360 m platform?
A: 72 km/h is 20 m/s, and the train must cover its own length plus the platform, 600 m, so 30 seconds. Passing a pole would take only its own length, 12 seconds.

Q: How do you find the speeds of a boat and a stream from downstream and upstream speeds?
A: Downstream is boat plus stream and upstream is boat minus stream, so the boat's speed is their average and the stream's speed is half their difference. For 12 and 8 km/h, the boat does 10 and the stream 2.

Q: Two trains of 180 m and 120 m run at 54 and 36 km/h. How long do they take to pass each other?
A: 300 m of length must slide past. Going opposite ways the relative speed is 90 km/h = 25 m/s, so 12 seconds; going the same way it is 18 km/h = 5 m/s, so 60 seconds.

Q: When does the rule for meeting on a circular track change?
A: The first meeting anywhere comes after the track length divided by the relative speed. Meeting again at the starting point needs both runners to have finished whole laps, which is the least common multiple of their lap times.

## apt.quant.time-and-work
name: "Time and work"
importance: must
scope: "pipes and cisterns"

### simple
Think of a job as a pie and each worker as eating a fixed slice of it every day. If one person finishes in 12 days, they do one twelfth a day, and slices from several workers simply add up. Pipes filling a tank work the same way, and a leak is a worker eating backwards.

### interview
- **Rates add**: someone who takes $n$ days does $\frac{1}{n}$ of the job a day. A in 12 and B in 18 together: $\frac{1}{12} + \frac{1}{18} = \frac{5}{36}$, so $\frac{36}{5} = 7.2$ days.
- **LCM units**: call the job $\text{lcm}(12, 18) = 36$ units, so A does 3 a day and B 2: $\frac{36}{5}$ days, with no fractions until the end.
- **Efficiency**: "twice as efficient" means twice the rate, so half the time.
- **Pipes and cisterns**: filling pipes add, draining pipes and leaks subtract. A pipe that fills in 5 h but takes 6 h with a leak means the leak alone empties it in $\frac{1}{1/5 - 1/6} = 30$ h.
- **Person-days**: work $\propto$ people × days × hours, so $\frac{M_1 D_1 H_1}{W_1} = \frac{M_2 D_2 H_2}{W_2}$ (with equally efficient workers).
- **Joining, leaving, alternating**: split the job into periods with constant rates and add the work done in each.

### deep
#### Intuition

Convert everyone to "fraction of the job per day", add the rates of whoever is working, and divide the work left by the combined rate: distance, speed and time with the job as the distance.

#### Worked examples

1. **Together.** A 12 days, B 18: 36 units at 3 + 2 a day, 7.2 days.
2. **One alone.** A and B take 10 days, A alone 15: B does $\frac{1}{10} - \frac{1}{15} = \frac{1}{30}$, so 30 days.
3. **Someone leaves.** A (20 days) and B (30) start together; A stops 5 days before the end: $\frac{T - 5}{20} + \frac{T}{30} = 1$, so $T = 15$.
4. **Pipes and a drain.** Fill in 6 h and 8 h, drain in 12 h, all open: $\frac{1}{6} + \frac{1}{8} - \frac{1}{12} = \frac{5}{24}$, so 4 h 48 min.
5. **Alternate days.** A (8 days) and B (12) alternate, A first. Each pair does $\frac{5}{24}$; after 4 pairs $\frac{4}{24}$ is left, day 9 (A) does $\frac{3}{24}$, and B needs half of day 10: 9.5 days, not the 9.6 that the average rate suggests.
6. **Person-hours.** 12 people, 8 h a day, 10 days for 480 m: 2 person-hours a metre. 540 m by 18 people at 6 h a day: $\frac{540 \times 2}{18 \times 6} = 10$ days.

#### When the shortcuts break

- LCM units and "rates add" assume **constant** rates. When people join, leave or take turns, work period by period; the last turn is usually partial.
- Person-hour scaling assumes equal efficiency and perfectly divisible work. Real teams aren't like that: adding people to a late software project often slows it at first.
- "A is 50% more efficient" means rates $3:2$, so times $2:3$; mixing up rates and times inverts the answer.

#### Code

In exact fractions: $T$ is found by trying every tenth of a day, the alternating schedule is played turn by turn, and the examples line follows examples 1, 2, 4, 5 and 6.

```cpp
struct Frac {
    long long n, d;
    Frac(long long a = 0, long long b = 1) : n(a), d(b) {
        long long g = gcd(n, d); if (d < 0) g = -g;
        n /= g; d /= g;
    }
};
Frac operator+(Frac a, Frac b) { return {a.n * b.d + b.n * a.d, a.d * b.d}; }
Frac operator-(Frac a, Frac b) { return {a.n * b.d - b.n * a.d, a.d * b.d}; }
Frac operator*(Frac a, Frac b) { return {a.n * b.n, a.d * b.d}; }
Frac operator/(Frac a, Frac b) { return {a.n * b.d, a.d * b.n}; }
bool operator==(Frac a, Frac b) { return a.n == b.n && a.d == b.d; }
string str(Frac f) { return to_string(f.n) + (f.d == 1 ? "" : "/" + to_string(f.d)); }
Frac rate(long long days) { return Frac(1, days); }  // work done per day

// Workers take turns, one day each; returns the exact number of days until the job is done.
Frac alternate(vector<long long> days) {
    Frac left = 1, t = 0;
    for (size_t i = 0;; i = (i + 1) % days.size()) {
        Frac r = rate(days[i]);
        if (left.n * r.d <= r.n * left.d) return t + left / r;  // finishes during this turn
        left = left - r, t = t + 1;
    }
}

int main() {
    for (Frac T = 5; T.n < 50 * T.d; T = T + Frac(1, 10))  // every tenth of a day
        if ((T - 5) * rate(20) + T * rate(30) == 1) printf("A leaves: %s days\n", str(T).c_str());
    printf("examples: %s %s %s %s %s\n", str(1 / (rate(12) + rate(18))).c_str(),
           str(1 / (rate(10) - rate(15))).c_str(), str(1 / (rate(6) + rate(8) - rate(12))).c_str(),
           str(alternate({8, 12})).c_str(), str(Frac(540 * 12 * 8 * 10, 480 * 18 * 6)).c_str());
    printf("A: %s %s %s %s %s %s\n", str(1 / (rate(10) + rate(15))).c_str(),
           str(1 / (rate(6) + rate(12) + rate(4))).c_str(),
           str(1 / (rate(12) - rate(20))).c_str(), str(1 / (Frac(2, 3) * rate(14))).c_str(),
           str(Frac(15 * 15, 25)).c_str(), str(alternate({18, 24})).c_str());
    Frac half = 6 * (rate(20) + rate(30));
    printf("B: %s %s %s %s %s %s\n", str(1 / (rate(4) - rate(6))).c_str(),
           str(1 / (rate(10) + rate(15))).c_str(), str(1 / (rate(3) - rate(4))).c_str(),
           str((1 - half) / rate(30)).c_str(), str(1 / (rate(12) + rate(15) - rate(20))).c_str(),
           str(Frac(3, 4) / (rate(8) - rate(12))).c_str());
}
```

Output:

```text
A leaves: 15 days
examples: 36/5 30 24/5 19/2 10
A: 6 2 30 21 9 41/2
B: 12 6 12 15 10 18
```

#### Timed practice

About 30 seconds each; the key is lines A and B.

- **Line A (days)**: 10 and 15 together; 6, 12 and 4 together; A if A and B take 12, B alone 20; A if twice as fast as B and together 14; 15 people need 20 days and 10 join after 5, days left; 18 and 24 alternating, the 18 first
- **Line B (hours, minutes)**: fill 4 h, drain 6 h; pipes of 10 and 15 min; the leak if 3 h becomes 4 h; 20 and 30 min pipes for 6 min, then only the second, minutes left; fill 12 and 15 h, drain 20 h; three quarters full, drain 8 h, fill 12 h, time to empty

Connects to: [ratios, proportions and averages](#/concept/apt.quant.ratios-proportions-and-averages), [time, speed and distance](#/concept/apt.quant.time-speed-and-distance).

### questions
Q: A finishes a job in 12 days and B in 18. How long do they take together?
A: Their rates are 1/12 and 1/18 of the job per day, which add to 5/36, so the job takes 36/5 = 7.2 days. With the LCM method, call the job 36 units: A does 3 and B 2 a day.

Q: A pipe fills a tank in 5 hours, but with a leak it takes 6. How long would the leak take to empty a full tank?
A: The net rate is 1/6, so the leak removes 1/5 minus 1/6 = 1/30 of the tank per hour: 30 hours.

Q: Why can't you divide by the average rate when two workers alternate days?
A: The job usually ends partway through someone's turn, and whose turn it is matters. Do whole pairs of days first, then work out the partial last turn with that person's rate.

Q: What does "A is twice as efficient as B" tell you?
A: A's rate is twice B's, so A needs half the time. If together they take 14 days, A does two thirds of the combined rate and alone would take 21 days.

Q: How do you handle a worker leaving before the job is done?
A: Split the timeline into periods with constant rates, write the work done in each and set the total to 1. For A (20 days) leaving 5 days before the end with B (30 days), (T - 5)/20 + T/30 = 1 gives T = 15.

## apt.quant.simple-and-compound-interest
name: "Simple and compound interest"
importance: important
prereqs: [apt.quant.percentages-profit-and-loss]
scope: "Simple and compound interest"

### simple
Simple interest pays the same amount every year, always worked out on the money you first put in. Compound interest adds each year's interest to the pot, so next year's interest is earned on a bigger amount, like a snowball that picks up more snow the bigger it gets. Over one period they are equal; after that compound interest pulls ahead, slowly at first and then faster.

### interview
- **Simple interest**: $SI = \frac{PRT}{100}$; the amount grows in a straight line.
- **Compound interest**: $A = P\left(1 + \frac{r}{n}\right)^{nt}$ for $n$ compounding periods a year; $CI = A - P$.
- **CI minus SI**: $P\left(\frac{r}{100}\right)^2$ over 2 years and $P\left(\frac{r}{100}\right)^2\left(3 + \frac{r}{100}\right)$ over 3.
- **Two consecutive amounts** give the rate: $r = \frac{A_3 - A_2}{A_2}$; then divide back for the principal.
- **Effective annual rate**: 12% compounded half-yearly is $1.06^2 - 1 = 12.36\%$.
- **Rule of 72**: doubling time ≈ $\frac{72}{r}$ years, good between about 6% and 10%.
- **Equal installments**: each payment's present value, $\frac{x}{(1 + r)^k}$, adds up to the loan.

### deep
#### Intuition

Simple interest is a percentage of a fixed base; compound interest is the successive-percentage rule applied again and again. Over 2 years at 10%, the only difference is the "interest on interest", $P \times 0.1 \times 0.1$.

#### Worked examples

1. **The gap.** 8,000 at 10% for 2 years: SI 1,600, CI 1,680, gap $8000 \times 0.1^2 = 80$. Over 3 years, $8000 \times 0.01 \times 3.1 = 248$.
2. **More frequent compounding.** 12% compounded half-yearly on 10,000 is 6% twice: 11,236, an effective 12.36%. Quarterly gives 12.550881%.
3. **Two amounts.** 6,050 after 2 years and 6,655 after 3: the rate is $\frac{605}{6050} = 10\%$ and $P = \frac{6050}{1.1^2} = 5000$.
4. **Installments.** 21,000 at 10% repaid in two equal yearly payments: $\frac{x}{1.1} + \frac{x}{1.21} = 21000$, so $x = 12100$; replaying the loan leaves exactly 0.
5. **Doubling.** At SI money doubles when $RT = 100$. At CI the rule of 72 estimates: 9% gives 8 years; exactly, $\frac{\ln 2}{\ln 1.09} \approx 8.04$.

#### When the shortcuts break

- The CI minus SI formulas assume **yearly** compounding at one rate; otherwise use the period rate and count periods.
- The rule of 72 overstates doubling time at low rates and understates it at high ones (see the table); for continuous compounding the constant is $100 \ln 2 \approx 69.3$.
- "Doubles in 4 years, so 8 times in 12" holds for compound interest only; at SI, 8 times takes 28 years.

#### Code

Exact fractions, printed as decimals only at the end.

```cpp
struct Frac {
    long long n, d;
    Frac(long long a = 0, long long b = 1) : n(a), d(b) {
        long long g = gcd(n, d); if (d < 0) g = -g;
        n /= g; d /= g;
    }
};
Frac operator+(Frac a, Frac b) { return {a.n * b.d + b.n * a.d, a.d * b.d}; }
Frac operator-(Frac a, Frac b) { return {a.n * b.d - b.n * a.d, a.d * b.d}; }
Frac operator*(Frac a, Frac b) { return {a.n * b.n, a.d * b.d}; }
Frac operator/(Frac a, Frac b) { return {a.n * b.d, a.d * b.n}; }
string str(Frac f) {  // exact until here; these answers all end within 8 digits
    return format("{:.8g}", double(f.n) / f.d);
}

Frac si(Frac p, Frac r, int years) { return p * r * years; }  // r as a fraction: 10% = 1/10
Frac amount(Frac p, Frac r, int periods) {
    for (int i = 0; i < periods; ++i) p = p + p * r;
    return p;
}
Frac ci(Frac p, Frac r, int periods) { return amount(p, r, periods) - p; }
// Equal yearly payments x that clear a loan: the sum of x / (1 + r)^k equals the loan.
Frac installment(Frac loan, Frac r, int years) {
    Frac pv = 0, f = 1;
    for (int k = 1; k <= years; ++k) f = f * (1 + r), pv = pv + 1 / f;
    return loan / pv;
}

int main() {
    Frac p = 8000, r(1, 10), pc(1, 100);
    printf("2 years: SI %s, CI %s; the gaps for 2 and 3 years: %s, %s\n",
           str(si(p, r, 2)).c_str(), str(ci(p, r, 2)).c_str(),
           str(ci(p, r, 2) - si(p, r, 2)).c_str(), str(ci(p, r, 3) - si(p, r, 3)).c_str());
    printf("12%% half-yearly: %s, effective %s%%; quarterly: %s%%\n",
           str(amount(10000, 6 * pc, 2)).c_str(), str(ci(100, 6 * pc, 2)).c_str(),
           str(ci(100, 3 * pc, 4)).c_str());
    Frac g = (Frac(6655) - 6050) / 6050;  // growth from year 2 to year 3
    printf("rate %s%%, principal %s\n", str(g * 100).c_str(), str(6050 / amount(1, g, 2)).c_str());
    Frac x = installment(21000, r, 2), owed = (21000 * (1 + r) - x) * (1 + r) - x;  // replay
    printf("installment %s, owed after 2 years %s\n", str(x).c_str(), str(owed).c_str());
    for (double pct : {2, 6, 9, 24})
        printf("%2g%%: rule of 72 says %5.2f years, exact %5.2f\n", pct, 72 / pct,
               log(2) / log(1 + pct / 100));
    printf("A: %s %s %s %d %d %s\n", str(si(5000, 8 * pc, 3)).c_str(),
           str(ci(5000, r, 2)).c_str(), str(ci(20000, 5 * pc, 2) - si(20000, 5 * pc, 2)).c_str(),
           100 / 5, 4 * 3, str(ci(100, 2 * pc, 4)).c_str());
    Frac g2 = (Frac(9261) - 8820) / 8820;
    printf("B: %s %s %s %d %s %s\n", str(amount(10000, 20 * pc, 3)).c_str(),
           str(g2 * 100).c_str(), str(8820 / amount(1, g2, 2)).c_str(), 72 / 6,
           str(installment(16400, 5 * pc, 2)).c_str(), str(Frac(300 * 100, 1200 * 5)).c_str());
}
```

Output:

```text
2 years: SI 1600, CI 1680; the gaps for 2 and 3 years: 80, 248
12% half-yearly: 11236, effective 12.36%; quarterly: 12.550881%
rate 10%, principal 5000
installment 12100, owed after 2 years 0
 2%: rule of 72 says 36.00 years, exact 35.00
 6%: rule of 72 says 12.00 years, exact 11.90
 9%: rule of 72 says  8.00 years, exact  8.04
24%: rule of 72 says  3.00 years, exact  3.22
A: 1200 1050 50 20 12 8.243216
B: 17280 5 8000 12 8820 5
```

#### Timed practice

About 30 seconds per item; the key is lines A and B.

- **Line A**: SI on 5,000 at 8% for 3 years; CI on 5,000 at 10% for 2 years; CI minus SI on 20,000 at 5% for 2 years; SI rate that doubles money in 5 years; years to 8 times if CI doubles money in 4; effective rate of 8% compounded quarterly
- **Line B**: 10,000 at 20% compounded yearly for 3 years; the rate if CI amounts are 8,820 and 9,261 after 2 and 3 years; the principal there; rule-of-72 doubling at 6%; two equal yearly installments on 16,400 at 5%; SI rate turning 1,200 into 1,500 in 5 years

Connects to: [time value of money](#/concept/markets.pricing.time-value-of-money), [percentages, profit and loss](#/concept/apt.quant.percentages-profit-and-loss), [number series and sequences](#/concept/apt.quant.number-series-and-sequences) (SI amounts are arithmetic, CI amounts geometric). Practice: [Three yearly payments](#/problems/q-three-payments).

### questions
Q: What is the difference between compound and simple interest on P over 2 years at r percent?
A: P times (r/100) squared. Both earn the same interest on the principal each year; compound interest also earns interest on the first year's interest, which is exactly that extra amount.

Q: A deposit grows to 6,050 after 2 years and 6,655 after 3 at compound interest. What are the rate and principal?
A: The third year's growth is 605 on 6,050, so the rate is 10%. Dividing 6,050 by 1.1 squared gives the principal, 5,000.

Q: What is the effective annual rate of 12% compounded half-yearly?
A: 6% applied twice: 1.06 squared is 1.1236, so 12.36%. More frequent compounding raises the effective rate a little more (12.55% quarterly).

Q: How accurate is the rule of 72?
A: It estimates doubling time as 72 divided by the rate in percent and is closest around 6% to 10%. It overstates the time at low rates (36 against 35 years at 2%) and understates it at high rates (3 against 3.22 at 24%).

Q: How do you find the equal yearly installment that repays a loan?
A: Set the sum of each payment's present value, x over (1 + r) to the power k, equal to the loan. For 21,000 at 10% over two years, x/1.1 + x/1.21 = 21,000 gives x = 12,100.

## apt.quant.mixtures-and-alligation
name: "Mixtures and alligation"
importance: important
prereqs: [apt.quant.ratios-proportions-and-averages]
scope: "Mixtures and alligation"

### simple
When you mix a cheap thing with a dear one, the mixture's price lands somewhere in between, closer to whichever you used more of. Alligation is a quick way to work backwards: from the target price, it tells you the ratio to mix. It is like a seesaw: the heavier side must sit closer to the balance point.

### interview
- **Alligation**: to average $m$ from a cheaper $c$ and a dearer $d$, mix them in the ratio $(d - m) : (m - c)$. Rice at 40 and 60 averaging 46: $14 : 6 = 7 : 3$.
- It works for any **weighted average**: prices per kg, concentrations, marks, profit percentages, as long as the ratio is in the units the average is weighted by.
- **Water is a 0% ingredient**: to dilute 30 L of 20% salt water to 15%, the salt (6 L) must be 15% of the total, so add 10 L.
- **Repeated replacement**: taking out $x$ of $V$ and topping up with water $n$ times leaves $V\left(1 - \frac{x}{V}\right)^n$ of the original.
- **Two mixtures of mixtures**: track each ingredient's fraction; alloys of copper and zinc at $3:2$ and $1:3$ mixed $2:3$ are $\frac{2}{5} \cdot \frac{3}{5} + \frac{3}{5} \cdot \frac{1}{4} = \frac{39}{100}$ copper.
- With **three or more** ingredients, one average fixes infinitely many ratios; the question must add a condition.

### deep
#### Intuition

A mixture's price is a weighted average, balanced like a seesaw: each amount times its distance from the mean must match, $a(m - c) = b(d - m)$, so $a : b = (d - m) : (m - c)$. That is all of alligation, usually drawn as a cross:

```text
 cheaper 40         dearer 60
          \         /
           mean 46
          /         \
 60 - 46 = 14     46 - 40 = 6    ->  cheaper : dearer = 14 : 6 = 7 : 3
```

#### Worked examples

1. **Rice.** 40 and 60 averaging 46: $7 : 3$. Of every whole-kg mix up to 100 kg, only multiples of $7 : 3$ hit 46 exactly.
2. **Dilution.** 30 L of 20% salt water to 15%: the 6 L of salt must be 15% of 40 L, so add 10 L (alligation with water at 0% gives $1 : 3$).
3. **Replacement.** Take 8 L from 80 L of juice and top up with water, three times: $80 \times 0.9^3 = \frac{1458}{25} = 58.32$ L remain, since each round removes 10% of what is left.
4. **Alloys.** Copper to zinc $3:2$ and $1:3$, mixed $2:3$: copper is $\frac{39}{100}$, so $39 : 61$.
5. **Profit percentages.** Part of the stock sold at 10% profit, the rest at 20%, 14% overall: costs in the ratio $6 : 4 = 3 : 2$. The weights are cost prices, because profit percent is on cost.

#### When alligation breaks

The ratio comes out in the units the average is weighted by. Average speed is weighted by **time**: half the distance at 40 and half at 60 averages 48, not 50, and alligation on 48 gives a time ratio of $3 : 2$, which is equal distances. The same trap hides in profit percentages quoted on selling prices, and in strengths by weight mixed by volume. (Real alcohol and water also shrink when mixed; tests ignore that.)

#### Code

Exact fractions, brute force for the rice and a step-by-step replay of the replacements.

```cpp
struct Frac {
    long long n, d;
    Frac(long long a = 0, long long b = 1) : n(a), d(b) {
        long long g = gcd(n, d); if (d < 0) g = -g;
        n /= g; d /= g;
    }
};
Frac operator+(Frac a, Frac b) { return {a.n * b.d + b.n * a.d, a.d * b.d}; }
Frac operator-(Frac a, Frac b) { return {a.n * b.d - b.n * a.d, a.d * b.d}; }
Frac operator*(Frac a, Frac b) { return {a.n * b.n, a.d * b.d}; }
Frac operator/(Frac a, Frac b) { return {a.n * b.d, a.d * b.n}; }
bool operator==(Frac a, Frac b) { return a.n == b.n && a.d == b.d; }
string str(Frac f) { return to_string(f.n) + (f.d == 1 ? "" : "/" + to_string(f.d)); }

// Alligation: the ratio cheaper : dearer that averages to m, in lowest terms.
string alligate(Frac cheap, Frac dear, Frac m) {
    Frac r = (dear - m) / (m - cheap);
    return to_string(r.n) + ":" + to_string(r.d);
}

// Take out `out` litres and top up with water, k times; returns what is left of the original.
Frac replace(Frac volume, Frac out, int k) {
    Frac pure = volume;
    while (k-- > 0) pure = pure - out * pure / volume;
    return pure;
}

int main() {
    printf("rice:");  // every whole-kg mix up to 100 kg that averages exactly 46
    for (int a = 1; a <= 100; ++a)
        for (int b = 1; a + b <= 100; ++b)
            if (Frac(40 * a + 60 * b, a + b) == 46) printf(" %d:%d", a, b);
    printf("\nalligation %s; juice %s L; copper %s; profit mix %s\n", alligate(40, 60, 46).c_str(),
           str(replace(80, 8, 3)).c_str(), str(Frac(2, 5) * Frac(3, 5) + Frac(3, 5) / 4).c_str(),
           alligate(10, 20, 14).c_str());
    // Half the distance at 40, half at 60: the weights of an average speed are times.
    printf("speed %s; time ratio for 48: %s\n", str(2 / (Frac(1, 40) + Frac(1, 60))).c_str(),
           alligate(40, 60, 48).c_str());
    printf("A: %s %s %s %s %s %s\n", alligate(120, 180, 150).c_str(), alligate(30, 70, 40).c_str(),
           str(Frac(20 * 60, 40) - 20).c_str(), str(60 - Frac(60 * 40, 50)).c_str(),
           str(replace(40, 4, 2)).c_str(), str(1 - Frac(1, 2) / Frac(3, 4)).c_str());
    printf("B: %s %s %s %s %s %s\n", alligate(70, 85, 76).c_str(), alligate(-12, 8, 0).c_str(),
           str(Frac(7, 9) / 2 + Frac(7, 18) / 2).c_str(), str(36 * (Frac(35) - 30) / 15).c_str(),
           str(Frac(70 * 3, 7) - 20).c_str(), str(20 / (1 + Frac(50 - 40, 40 - 25))).c_str());
}
```

Output:

```text
rice: 7:3 14:6 21:9 28:12 35:15 42:18 49:21 56:24 63:27 70:30
alligation 7:3; juice 1458/25 L; copper 39/100; profit mix 3:2
speed 48; time ratio for 48: 3:2
A: 1:1 3:1 10 12 162/5 1/3
B: 3:2 2:3 7/12 12 10 12
```

#### Timed practice

About 30 seconds per item; the key is lines A and B.

- **Line A**: tea at 120 and 180 averaging 150; 30% and 70% acid for 40%; water to add to 20 L of 60% milk for 40%; water to boil off 60 L of 40% syrup for 50%; milk left after 4 L of 40 L is replaced twice; the share of a $3:1$ milk and water mix to replace with water for $1:1$
- **Line B**: boys at 70, girls at 85, class at 76, boys to girls; 12% loss and 8% profit, no overall gain, loss part to profit part; gold alloys $7:2$ and $7:11$ mixed equally, gold share; kg at 50 to mix with 36 kg at 30 for 35; water for 90 L of $7:2$ milk and water to become $7:3$; litres of 50% in 20 L of 40% from 25% and 50%

Connects to: [ratios, proportions and averages](#/concept/apt.quant.ratios-proportions-and-averages), [percentages, profit and loss](#/concept/apt.quant.percentages-profit-and-loss), [time, speed and distance](#/concept/apt.quant.time-speed-and-distance).

### questions
Q: How does alligation find the mixing ratio?
A: For a cheaper price c, a dearer price d and a target mean m, mix cheaper to dearer in the ratio (d - m) to (m - c). It is the balance condition of a weighted average: each amount times its distance from the mean must be equal on both sides.

Q: 30 L of 20% salt solution must become 15%. How much water do you add?
A: The salt stays at 6 L, and 6 L must be 15% of the new total, so the total is 40 L and you add 10 L. Alligation gives the same answer, treating water as a 0% solution.

Q: 8 L is taken from 80 L of juice and replaced with water, three times. How much juice is left?
A: Each round keeps 72/80 = 90% of the juice in the vessel, so 80 times 0.9 cubed = 58.32 L. It is not 80 minus 24, because later rounds remove diluted mixture.

Q: Why does alligation fail for average speed over equal distances?
A: An average speed is weighted by time, not distance. Alligation on speeds gives the ratio of times, so using it as a ratio of distances gives the wrong mixture; half the distance at 40 and 60 averages 48, not 50.

Q: Can alligation solve a mixture of three ingredients?
A: Not on its own: one target average leaves infinitely many possible ratios for three ingredients. You need another condition, such as a fixed amount of one ingredient, or you pair them up and alligate twice.

## apt.quant.number-series-and-sequences
name: "Number series and sequences"
importance: important
scope: "Number series and sequences"

### simple
A number series question shows a few terms and asks for the next one, or for the one that doesn't belong. You look for the hidden rule the way you would guess the next beat of a drum pattern: check how each step changes, then check whether the changes themselves follow a pattern. Tests expect the simplest rule that fits, even though, strictly speaking, many rules fit any short list.

### interview
- **Check in order**: differences (and differences of differences), ratios, "times $p$ plus $q$", squares and cubes nearby ($n^2 \pm 1$, $n^3 + n$), primes, the sum of the previous two, then two series interleaved at odd and even positions.
- Constant $k$-th differences mean a degree-$k$ polynomial: $3, 8, 15, 24, 35$ has second differences of 2, so 48 is next ($n^2 - 1$).
- **Times $p$ plus $q$**: $2, 5, 11, 23, 47$ is $\times 2 + 1$, so 95. When differences grow by a constant factor, it is this rule in disguise.
- **Interleaved**: $4, 9, 7, 18, 10, 36, 13$ is $4, 7, 10, 13$ (plus 3) mixed with $9, 18, 36$ (times 2), so 72.
- **Wrong term**: find the rule that fits all but one term; in $5, 11, 23, 48, 95, 191$ only changing 48 to 47 makes a rule fit ($\times 2 + 1$).
- Any $n$ terms fit some polynomial of degree $n - 1$, so the answer is "the simplest rule", not "the only rule".

### deep
#### Intuition

Test series come from a few families. Try the cheapest first: the difference row (it catches arithmetic, square and cube patterns), then ratios and "times $p$ plus $q$", then sums of earlier terms, and only then interleaving. The program below runs exactly this search; its first seven lines are worked examples.

#### Why "simplest" matters

$1, 2, 4, 8, 16$ looks like doubling, so 32. But joining 1 to 6 points on a circle by every chord (no three through one point) makes $1, 2, 4, 8, 16, 31$ regions, and the degree-4 polynomial through the five terms predicts 31. Tests mean the rule with the fewest moving parts.

#### Code

A brute-force rule finder prints every rule that fits exactly, then repairs a wrong term by trying every value within 50 of each term.

```cpp
using Seq = vector<long long>;
struct Fit { string rule; long long next; };

Seq diffs(const Seq& s) {
    Seq d;
    for (size_t i = 1; i < s.size(); ++i) d.push_back(s[i] - s[i - 1]);
    return d;
}

// Extend the difference table after `order` rows, as if that row stayed constant.
long long extend(const Seq& s, int order) {
    long long next = 0;
    Seq t = s;
    for (int k = 0; k <= order; ++k, t = diffs(t)) next += t.back();
    return next;
}

// Every rule from a few families that fits s exactly, with the term it predicts next.
vector<Fit> fits(const Seq& s, bool interleave = true) {
    vector<Fit> out;
    int n = s.size();
    Seq d = s;  // constant k-th differences (k + 2 terms needed to see a constant)
    for (int k = 1; k <= 3 && n >= k + 2; ++k) {
        d = diffs(d);
        if (count(d.begin(), d.end(), d[0]) == (long long)d.size()) {
            out.push_back({"differences of order " + to_string(k) + " constant", extend(s, k)});
            break;
        }
    }
    for (long long p = -3; p <= 5 && n >= 3; ++p) {  // times p, plus q
        long long q = s[1] - p * s[0];
        bool ok = p != 0 && p != 1;
        for (int i = 1; i < n; ++i) ok &= s[i] == p * s[i - 1] + q;
        if (ok) out.push_back({format("times {} plus {}", p, q), p * s.back() + q});
    }
    if (n >= 4) {  // each term is the sum of the two before, plus c
        long long c = s[2] - s[1] - s[0];
        bool ok = true;
        for (int i = 2; i < n; ++i) ok &= s[i] == s[i - 1] + s[i - 2] + c;
        if (ok) out.push_back({format("previous two plus {}", c), s[n - 1] + s[n - 2] + c});
    }
    Seq even, odd;  // two series interleaved
    for (int i = 0; i < n; ++i) (i % 2 ? odd : even).push_back(s[i]);
    if (!interleave || n < 6) return out;
    auto fe = fits(even, false), fo = fits(odd, false);
    if (!fe.empty() && !fo.empty())
        out.push_back({"interleaved: " + fe[0].rule + " / " + fo[0].rule,
                       n % 2 ? fo[0].next : fe[0].next});
    return out;
}

void show(const Seq& s) {
    for (long long x : s) printf("%lld ", x);
    auto f = fits(s);
    for (size_t i = 0; i < f.size(); ++i)
        printf("%s-> %lld (%s)\n", i ? "   " : "", f[i].next, f[i].rule.c_str());
}

int main() {
    for (Seq s : {Seq{3, 8, 15, 24, 35}, Seq{2, 5, 11, 23, 47}, Seq{4, 9, 7, 18, 10, 36, 13},
                  Seq{1, 2, 6, 15, 31}, Seq{2, 3, 5, 9, 17, 33}, Seq{3, 4, 7, 11, 18, 29},
                  Seq{1, 2, 4, 8, 16}})
        show(s);
    printf("degree-4 polynomial through 1 2 4 8 16 -> %lld\n", extend({1, 2, 4, 8, 16}, 4));
    Seq s = {5, 11, 23, 48, 95, 191};  // change one term to anything within 50 of it
    for (size_t i = 0; i < s.size(); ++i)
        for (long long v = s[i] - 50; v <= s[i] + 50; ++v) {
            Seq t = s;
            t[i] = v;
            auto f = fits(t, false);
            if (v != s[i] && !f.empty())
                printf("fix: term %zu %lld -> %lld (%s)\n", i + 1, s[i], v, f[0].rule.c_str());
        }
    printf("practice:\n");
    for (Seq s : {Seq{7, 12, 19, 28, 39}, Seq{3, 7, 15, 31, 63}, Seq{1, 4, 13, 40, 121},
                  Seq{2, 6, 12, 20, 30, 42}, Seq{6, 3, 12, 6, 18, 9, 24}, Seq{2, 5, 7, 12, 19, 31}})
        show(s);
}
```

Output:

```text
3 8 15 24 35 -> 48 (differences of order 2 constant)
2 5 11 23 47 -> 95 (times 2 plus 1)
4 9 7 18 10 36 13 -> 72 (interleaved: differences of order 1 constant / times 2 plus 0)
1 2 6 15 31 -> 56 (differences of order 3 constant)
2 3 5 9 17 33 -> 65 (times 2 plus -1)
   -> 65 (interleaved: times 4 plus -3 / times 4 plus -3)
3 4 7 11 18 29 -> 47 (previous two plus 0)
1 2 4 8 16 -> 32 (times 2 plus 0)
degree-4 polynomial through 1 2 4 8 16 -> 31
fix: term 4 48 -> 47 (times 2 plus 1)
practice:
7 12 19 28 39 -> 52 (differences of order 2 constant)
3 7 15 31 63 -> 127 (times 2 plus 1)
1 4 13 40 121 -> 364 (times 3 plus 1)
2 6 12 20 30 42 -> 56 (differences of order 2 constant)
6 3 12 6 18 9 24 -> 12 (interleaved: differences of order 1 constant / differences of order 1 constant)
2 5 7 12 19 31 -> 50 (previous two plus 0)
```

The wrong-term search finds exactly one repair. Interleaving is tried only from six terms, and not in that search, because three-term halves fit some "times $p$ plus $q$" rule too easily.

#### When the tricks break

- Differences that repeat the series ($3, 6, 12, 24$ gives $3, 6, 12$) point to ratios.
- Some series square terms ($2, 4, 16, 256$) or use letter positions (A = 1 to Z = 26), which no difference table finds.

#### Timed practice

Cover the output, take about 20 seconds for each of the six series in the program's practice list, then check against the "practice" lines.

Connects to: [series and sums](#/concept/math.number-theory.series-and-sums), [simple and compound interest](#/concept/apt.quant.simple-and-compound-interest), [coding-decoding and directions](#/concept/apt.logical.coding-decoding-and-directions). Practice: [Bouncing ball](#/problems/q-bouncing-ball).

### questions
Q: What should you check first in a number series?
A: The differences between consecutive terms, then the differences of those. Constant differences at some level reveal arithmetic, square and cube patterns; if they grow by a factor instead, try ratios or a times-p-plus-q rule.

Q: What is the next term of 2, 5, 11, 23, 47?
A: 95. Each term is twice the previous one plus 1. The differences 3, 6, 12, 24 double, which is the same rule seen another way.

Q: How do you spot an interleaved series?
A: The terms zigzag or the differences alternate in character. Split the odd and even positions into two series and solve each; the next term belongs to whichever series comes next.

Q: How do you find the wrong term in a series?
A: Find a simple rule that all but one term obey, then check that changing that one term makes every term fit. In 5, 11, 23, 48, 95, 191 the rule times 2 plus 1 fits everything except 48, which should be 47.

Q: Can a number series have more than one correct answer?
A: Mathematically yes: any n terms fit a polynomial of degree n - 1, which can predict almost anything. Tests intend the simplest rule, so prefer the rule with the fewest parameters that fits every term.

## apt.quant.permutations-combinations-and-probability-basics-for-oas
name: "Permutations, combinations and probability basics for OAs"
importance: important
scope: "Permutations, combinations and probability basics for OAs"

### simple
Counting questions ask "in how many ways?", and the first thing to settle is whether order matters. Arranging people in a queue is a permutation, where order matters; picking a team is a combination, where it doesn't. Basic probability is then counting twice: the ways you want, divided by all the ways that are equally likely, like the share of lottery tickets that win.

### interview
- **Order matters**: $^nP_r = \frac{n!}{(n - r)!}$; **it doesn't**: $^nC_r = \frac{n!}{r!(n - r)!}$.
- **Repeated letters**: divide by the repeats, $\frac{6!}{2!\,2!} = 180$ for LETTER. **Keep items together** by gluing them into one block.
- **Round table**: $(n - 1)!$ arrangements (rotations are the same); a necklace that can flip, $\frac{(n - 1)!}{2}$.
- **At least one** = all − none; "not together" = all − together.
- **Digit questions**: fill the most restricted place first (the first digit can't be 0; an even number's last digit is even), and split into cases when a choice changes another's options.
- **Probability** = favorable ÷ total, only when outcomes are **equally likely**: two dice have 36 equally likely ordered outcomes, not 11 sums.

### deep
#### Intuition

Assessments test a handful of counting moves; the theory is in [counting principles](#/concept/math.combinatorics.counting-principles) and [sample spaces and events](#/concept/prob.foundations.sample-spaces-and-events). Here the aim is speed and dodging the traps.

#### Worked examples

1. **Repeated letters.** LETTER: $\frac{6!}{2!\,2!} = 180$. With the Es glued, arrange L, T, T, R and the block: $\frac{5!}{2!} = 60$.
2. **Digits.** Three-digit even numbers from 0 to 6, no repeats. Ending in 0: $6 \times 5 = 30$; in 2, 4 or 6: $5 \times 5 = 25$ each (no leading 0). Total 105.
3. **At least two women.** A committee of 4 from 6 men and 4 women: $\binom{4}{2}\binom{6}{2} + \binom{4}{3}\binom{6}{1} + \binom{4}{4} = 90 + 24 + 1 = 115$.
4. **Round table, apart.** 6 friends, two never side by side: $5! - 2 \times 4! = 120 - 48 = 72$.
5. **Dice.** A prime sum (2, 3, 5, 7, 11) comes up in $1 + 2 + 4 + 6 + 2 = 15$ of 36 outcomes: $\frac{5}{12}$.
6. **Cards.** Two cards from 52, at least one ace: $1 - \frac{\binom{48}{2}}{\binom{52}{2}} = 1 - \frac{1128}{1326} = \frac{33}{221}$.

#### Common traps

- **Double counting**: "pick one woman, then 3 more from anyone" counts a committee with two women twice. Use exact cases or a complement.
- **Unequal outcomes**: dice sums aren't equally likely; count ordered pairs.
- **Leading zeros**: a four-digit number can't start with 0.

#### Code

Every answer is counted by listing all the outcomes. For the table, A's seat is fixed and the other five are tried in every order, wrapping around.

```cpp
// Distinct arrangements of a word, and how many of them pass a test.
long long arrangements(string w, function<bool(const string&)> ok = nullptr) {
    sort(w.begin(), w.end());
    long long n = 0;
    do n += !ok || ok(w);
    while (next_permutation(w.begin(), w.end()));
    return n;
}
bool has(const string& w, const string& part) { return w.find(part) != string::npos; }
int subsets(int n, int size, int within = -1) {  // subsets of {0..n-1} of a size, inside a mask
    int c = 0;
    for (int m = 0; m < 1 << n; ++m) c += popcount(unsigned(m)) == size && !(m & ~within);
    return c;
}
string frac(long long a, long long b) { return format("{}/{}", a / gcd(a, b), b / gcd(a, b)); }

int main() {
    int even = 0, women = 0, pairs = 0, aces = 0, red = 0, prime = 0, eight = 0;
    for (int n = 100; n <= 999; ++n) {  // 3-digit even numbers from 0-6, no repeated digit
        int a = n / 100, b = n / 10 % 10, c = n % 10;
        even += max({a, b, c}) <= 6 && a != b && b != c && a != c && c % 2 == 0;
    }
    for (int m = 0; m < 1 << 10; ++m)  // people 0-3 are the women
        women += popcount(unsigned(m)) == 4 && popcount(unsigned(m & 0b1111)) >= 2;
    for (int x = 1; x <= 6; ++x)
        for (int y = 1; y <= 6; ++y) prime += set{2, 3, 5, 7, 11}.count(x + y), eight += x + y == 8;
    for (int c1 = 0; c1 < 52; ++c1)  // cards 0-3 are aces and 0-25 red; c1 is the lower card
        for (int c2 = c1 + 1; c2 < 52; ++c2) ++pairs, aces += c1 < 4, red += c2 < 26;
    // 6 friends round a table: seat A first, then try every order of the other five.
    long long apart = arrangements("BCDEF", [](const string& w) {
        string ring = "A" + w + "A";  // the table closes back on A
        return !has(ring, "AB") && !has(ring, "BA");
    });
    printf("LETTER %lld, Es together %lld; even %d; committees %d; A and B apart %lld\n",
           arrangements("LETTER"), arrangements("LETTER", [](auto& w) { return has(w, "EE"); }),
           even, women, apart);
    printf("prime sum %s; at least one ace %s\n", frac(prime, 36).c_str(),
           frac(aces, pairs).c_str());
    int digits = 0, diagonals = 0, sundays = 0;
    for (int n = 1000; n <= 9999; ++n) {
        string s = to_string(n);
        digits += !has(s, "0") && set<char>(s.begin(), s.end()).size() == 4;
    }
    for (int i = 0; i < 10; ++i)  // vertices of a 10-gon; 0 and 9 are neighbors too
        for (int j = i + 2; j < 10; ++j) diagonals += !(i == 0 && j == 9);
    for (int start = 0; start < 7; ++start) {  // a leap year starting on each weekday
        int n = 0;
        for (int d = 0; d < 366; ++d) n += (start + d) % 7 == 0;
        sundays += n == 53;
    }
    auto oneFirst = [](const string& w) { return w.find('1') < w.find('2'); };
    printf("A: %lld %d %d %lld %d %lld\n", arrangements("BANANA"), digits, subsets(10, 3),
           arrangements("ABCDE", [](auto& w) { return has(w, "AB") || has(w, "BA"); }),
           diagonals, arrangements("BCDE"));
    printf("B: %s %s %s %s %s %s\n", frac(eight, 36).c_str(),
           frac(16 - subsets(4, 0), 16).c_str(), frac(red, pairs).c_str(),
           frac(arrangements("12345", oneFirst), 120).c_str(),
           frac(subsets(7, 3, 0b111), subsets(7, 3)).c_str(), frac(sundays, 7).c_str());
}
```

Output:

```text
LETTER 180, Es together 60; even 105; committees 115; A and B apart 72
prime sum 5/12; at least one ace 33/221
A: 60 3024 120 48 35 24
B: 5/36 15/16 25/102 1/2 1/35 2/7
```

#### Timed practice

About 30 seconds per item; the key is lines A and B.

- **Line A (count)**: arrangements of BANANA; four-digit numbers with different digits from 1 to 9; choices of 3 from 10; 5 in a row with two together; diagonals of a 10-gon; seatings of 5 at a round table
- **Line B (probability)**: two dice sum to 8; a head in 4 tosses; two cards both red; 1 before 2 in a random order of 1 to 5; 3 from 4 men and 3 women all women; 53 Sundays in a leap year

Connects to: [permutations and combinations](#/concept/math.combinatorics.permutations-and-combinations), [inclusion-exclusion](#/concept/math.combinatorics.inclusion-exclusion), [axioms and basic rules](#/concept/prob.foundations.axioms-and-basic-rules), [seating arrangements and puzzles](#/concept/apt.logical.seating-arrangements-and-puzzles). Practice: [Rising digits](#/problems/q-rising-digits) and [Two dice make seven](#/problems/q-sum-seven).

### questions
Q: How many ways can you arrange the letters of LETTER?
A: 180. There are 6! orders of 6 letters, but swapping the two Es or the two Ts gives the same word, so divide by 2! twice: 720/4 = 180.

Q: How many ways can 6 people sit at a round table if two of them must not sit together?
A: 72. Round tables have (6 - 1)! = 120 arrangements; treating the pair as one block gives 4! arrangements times 2 orders inside the block, 48; subtract to get 72.

Q: When is probability equal to favorable outcomes divided by total outcomes?
A: Only when all the outcomes you count are equally likely. For two dice, count the 36 ordered pairs rather than the 11 possible sums, because a sum of 7 happens six ways and a sum of 2 only one.

Q: Why is "choose one woman first, then fill the rest from anyone" wrong for "at least one woman"?
A: It counts committees with several women more than once, once for each woman who could have been picked first. Use all committees minus those with no women, or add exact cases.

Q: How do you count three-digit even numbers from the digits 0 to 6 without repetition?
A: Split on the last digit. If it is 0, the other two places have 6 and 5 choices: 30. If it is 2, 4 or 6, the first digit can't be 0 or that digit, so 5 choices, then 5 for the middle: 25 each. The total is 105.
