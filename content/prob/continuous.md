---
topic: prob.continuous
name: "Continuous and geometric probability"
subject: prob
order: 7
prereqs: [prob.distributions]
---

## prob.continuous.joint-distributions
name: "Joint distributions"
importance: must
scope: "joint, marginal and conditional densities"

### simple
A joint distribution describes two random quantities together, including how they relate, like the heights of a parent and a child. From it you can recover each one on its own (the marginals) and the distribution of one once you know the other (the conditionals). For continuous quantities, probabilities are volumes under a density surface instead of areas under a curve.

### interview
- **Joint density** $f(x, y) \ge 0$ with $\iint f = 1$; $P((X, Y) \in A) = \iint_A f(x, y)\,dx\,dy$.
- **Marginal**: $f_X(x) = \int f(x, y)\,dy$ (integrate out the other variable).
- **Conditional**: $f_{Y \mid X}(y \mid x) = \frac{f(x, y)}{f_X(x)}$ where $f_X(x) > 0$; it is a proper density in $y$ for each fixed $x$.
- **Independence** means the joint density factors, $f(x, y) = f_X(x)f_Y(y)$, which requires the support to be a product set (a rectangle); a triangular support already rules independence out.
- Expectations: $E[g(X, Y)] = \iint g(x, y)f(x, y)\,dx\,dy$, so $\text{Cov}(X, Y) = E[XY] - E[X]E[Y]$.
- Draw the region first; most mistakes are wrong integration limits.

### deep
#### Worked example: the minimum and maximum of two uniforms

Let $U_1, U_2$ be independent Uniform(0, 1), $X = \min$, $Y = \max$. The pair $(X, Y)$ lands in the triangle $0 \le x \le y \le 1$, and since both orderings of $(U_1, U_2)$ map to it, the density there is $f(x, y) = 2$ (the triangle has area $\frac{1}{2}$).

- **Marginals**: $f_X(x) = \int_x^1 2\,dy = 2(1 - x)$ and $f_Y(y) = \int_0^y 2\,dx = 2y$, so $E[X] = \frac{1}{3}$ and $E[Y] = \frac{2}{3}$ (as in [order statistics](#/concept/prob.distributions.order-statistics)).
- **Conditional**: $f_{Y \mid X}(y \mid x) = \frac{2}{2(1-x)} = \frac{1}{1-x}$ on $[x, 1]$: given the minimum, the maximum is uniform above it, so $E[Y \mid X = x] = \frac{1 + x}{2}$.
- **A probability**: $P(Y > 2X) = \int_0^1 \int_0^{y/2} 2\,dx\,dy = \int_0^1 y\,dy = \frac{1}{2}$.
- **Covariance**: $E[XY] = \int_0^1\int_0^y 2xy\,dx\,dy = \int_0^1 y^3\,dy = \frac{1}{4}$, so $\text{Cov}(X, Y) = \frac{1}{4} - \frac{1}{3}\cdot\frac{2}{3} = \frac{1}{36}$. Positive: a larger minimum forces a larger maximum.

The triangular support alone shows $X$ and $Y$ are dependent: $f_X(0.9)f_Y(0.1) > 0$ but $f(0.9, 0.1) = 0$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const long n = 4'000'000;
    double sx = 0, sy = 0, sxy = 0, condSum = 0;
    long condCount = 0, above = 0;
    for (long t = 0; t < n; ++t) {
        double a = u01(), b = u01(), x = min(a, b), y = max(a, b);
        sx += x, sy += y, sxy += x * y;
        above += y > 2 * x;
        if (fabs(x - 0.3) < 0.005) { condSum += y; ++condCount; }   // x close to 0.3
    }
    double ex = sx / n, ey = sy / n;
    printf("E[X] exact %.5f simulated %.5f;  E[Y] exact %.5f simulated %.5f\n", 1.0 / 3, ex,
           2.0 / 3, ey);
    printf("Cov(X, Y): exact %.5f  simulated %.5f\n", 1.0 / 36, sxy / n - ex * ey);
    printf("P(Y > 2X): exact 0.50000  simulated %.5f\n", double(above) / n);
    printf("E[Y | X near 0.3]: exact 0.65000  simulated %.5f (%ld pairs)\n",
           condSum / condCount, condCount);
}
```

Output:

```text
E[X] exact 0.33333 simulated 0.33323;  E[Y] exact 0.66667 simulated 0.66654
Cov(X, Y): exact 0.02778  simulated 0.02777
P(Y > 2X): exact 0.50000  simulated 0.50018
E[Y | X near 0.3]: exact 0.65000  simulated 0.65036 (55789 pairs)
```

Every simulated value is within about 1.5 standard errors of the exact one. The conditional mean is estimated the only way a simulation can condition on a continuous value: by keeping the 55,789 pairs whose minimum fell within 0.005 of 0.3.

#### Pitfalls

- **Limits of integration**: on the triangle, $x$ runs from 0 to $y$ (or $y$ from $x$ to 1); integrating both over $[0, 1]$ doubles the mass.
- **Assuming independence from zero covariance**: jointly normal is the special case where that works.
- **Conditioning on a single point** of a continuous variable is fine through densities, but $\frac{P(A \cap B)}{P(B)}$ with $P(B) = 0$ is not defined; simulations approximate it with a thin band, as the code does.

Connects to: [geometric probability](#/concept/prob.continuous.geometric-probability), [conditional expectation](#/concept/prob.expected-value.conditional-expectation), [integrals in probability](#/concept/math.calculus.integrals-in-probability).

### questions
Q: How do you get a marginal density from a joint density?
A: Integrate the joint density over all values of the other variable: f of x equals the integral of f(x, y) over y. For discrete variables, sum instead.

Q: How is the conditional density of Y given X equal to x defined?
A: As the joint density f(x, y) divided by the marginal density of X at x, wherever that marginal is positive. For each x it is a density in y that integrates to 1.

Q: How can you tell from the support that two variables are not independent?
A: Independence requires the joint density to factor into a product of marginals, so the region where it is positive must be a product of intervals, a rectangle. A triangular support, as for the minimum and maximum of two uniforms, rules out independence.

Q: What is the covariance of the minimum and maximum of two independent Uniform(0,1) variables?
A: One thirty-sixth: E[XY] is one quarter, the means are one third and two thirds, and one quarter minus two ninths is one thirty-sixth.

Q: Given that the smaller of two uniforms is x, what is the expected larger one?
A: One plus x over 2: conditionally the larger value is uniform between x and 1.

## prob.continuous.geometric-probability
name: "Geometric probability"
importance: must
prereqs: [prob.continuous.joint-distributions]
scope: "random points in shapes, area ratios"

### simple
Geometric probability turns chance questions into questions about lengths, areas or volumes. If a point is dropped uniformly at random in a square, the chance it lands in some region is that region's area divided by the square's area. Drawing the picture is usually most of the solution.

### interview
- For a point uniform in a region $\Omega$: $P(A) = \frac{\text{area}(A)}{\text{area}(\Omega)}$ (length in 1D, volume in 3D).
- Two independent uniforms on $[0, 1]$ are one uniform point in the unit square; many "two random times" or "two random points" questions become areas there.
- Classics: a random point in the unit square lies in the quarter disc with probability $\frac{\pi}{4}$ (the basis of estimating $\pi$ by simulation); three uniform points on a circle form an acute triangle with probability $\frac{1}{4}$; Buffon's needle of length $l \le d$ crosses a line with probability $\frac{2l}{\pi d}$.
- Symmetry often halves the work: order the points, or rotate so one point is fixed.
- "At random" must be specified: uniform in what? Different choices give different answers (Bertrand's paradox).
- Check with a quick simulation: area questions are ideal for Monte Carlo.

### deep
#### Worked example 1: the quarter disc

A point $(X, Y)$ uniform in the unit square lies in $x^2 + y^2 \le 1$ with probability $\frac{\pi/4}{1} = \frac{\pi}{4} \approx 0.7854$. So $4 \times$ (fraction of points inside) estimates $\pi$; with $N$ points the standard error is $4\sqrt{\frac{(\pi/4)(1 - \pi/4)}{N}} \approx \frac{1.64}{\sqrt N}$, which is why this is a slow way to compute $\pi$.

#### Worked example 2: an acute triangle from three points on a circle

Fix the first point by rotation. The triangle is acute exactly when no arc between consecutive points is at least half the circle (an angle is obtuse or right when its opposite arc is a half or more). Placing the other two points uniformly, the three arcs behave like the three pieces of a stick broken at two uniform points, and the probability that all pieces are shorter than half is $\frac{1}{4}$ (the same computation as the [broken stick](#/concept/prob.continuous.classic-continuous-problems)).

#### Worked example 3: Buffon's needle

Parallel lines are $d$ apart; drop a needle of length $l \le d$ with uniformly random position and angle. With $x$ the distance from the needle's center to the nearest line, uniform on $[0, \frac{d}{2}]$, and $\theta$ uniform on $[0, \frac{\pi}{2}]$, it crosses when $x \le \frac{l}{2}\sin\theta$:

$$P = \frac{\int_0^{\pi/2}\frac{l}{2}\sin\theta\,d\theta}{\frac{d}{2}\cdot\frac{\pi}{2}} = \frac{2l}{\pi d}.$$

For $l = d$ that is $\frac{2}{\pi} \approx 0.6366$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double pi = numbers::pi;
    const long n = 4'000'000;
    long inDisc = 0, acute = 0, crosses = 0;
    for (long t = 0; t < n; ++t) {
        double x = u01(), y = u01();
        inDisc += x * x + y * y <= 1;
        double a[3] = {0, u01(), u01()};         // three points on a circle, as fractions
        sort(a, a + 3);
        double arcs[3] = {a[1] - a[0], a[2] - a[1], 1 - a[2] + a[0]};
        acute += *max_element(arcs, arcs + 3) < 0.5;
        double center = 0.5 * u01(), angle = 0.5 * pi * u01();   // needle length = spacing = 1
        crosses += center <= 0.5 * sin(angle);
    }
    auto line = [&](const char* what, double exact, long hits) {
        double p = double(hits) / n, se = sqrt(exact * (1 - exact) / n);
        printf("%-24s exact %.5f  simulated %.5f  off by %.1f standard errors\n", what, exact, p,
               fabs(p - exact) / se);
    };
    line("point in quarter disc", pi / 4, inDisc);
    line("acute triangle", 0.25, acute);
    line("Buffon's needle crosses", 2 / pi, crosses);
    printf("pi estimated from the quarter disc: %.5f\n", 4.0 * inDisc / n);
}
```

Output:

```text
point in quarter disc    exact 0.78540  simulated 0.78515  off by 1.2 standard errors
acute triangle           exact 0.25000  simulated 0.25022  off by 1.0 standard errors
Buffon's needle crosses  exact 0.63662  simulated 0.63647  off by 0.6 standard errors
pi estimated from the quarter disc: 3.14060
```

All three simulated probabilities are within 1.2 standard errors of the exact values, yet four million points pin $\pi$ down only to 3.1406: the quarter-disc estimate has a standard error of about 0.0008 at this size.

#### Pitfalls

- **Unspecified "random"**: a random chord, a random point in a triangle, a random direction; state the model (see Bertrand's paradox in [classic continuous problems](#/concept/prob.continuous.classic-continuous-problems)).
- **Non-uniform densities**: area ratios only work for uniform points; otherwise integrate the density over the region.
- **Estimating $\pi$ this way is slow**: four million points give about three correct decimals, a vivid example of the $\frac{1}{\sqrt N}$ rate.

Connects to: [joint distributions](#/concept/prob.continuous.joint-distributions), [uniform distribution](#/concept/prob.distributions.uniform-distribution), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation).

### questions
Q: How do you compute a probability for a uniformly random point in a region?
A: Divide the area of the favorable part by the area of the whole region, or lengths in one dimension and volumes in three. This only works when the point is uniform over the region.

Q: How can you estimate pi with random numbers?
A: Drop uniform points in the unit square and count the fraction inside the quarter circle of radius 1; it approaches pi over 4, so four times the fraction estimates pi. The error shrinks only like 1 over the square root of the number of points.

Q: What is the probability that three uniform random points on a circle form an acute triangle?
A: One quarter. The triangle is acute exactly when all three arcs between the points are shorter than half the circle, which is the broken-stick condition with probability one quarter.

Q: What is the answer to Buffon's needle problem?
A: A needle of length l dropped on lines spaced d apart, with l at most d, crosses a line with probability 2 l over pi d; for l equal to d that is 2 over pi, about 0.64.

Q: Why must you specify what "random" means in geometric problems?
A: Different natural ways of choosing a random object, such as a chord by random endpoints or by a random distance from the center, give different probabilities, as Bertrand's paradox shows. The model must be stated before the answer means anything.

## prob.continuous.classic-continuous-problems
name: "Classic continuous problems"
importance: important
prereqs: [prob.continuous.geometric-probability]
scope: "breaking a stick into three pieces, random chords, meeting problem"

### simple
A few continuous puzzles come up again and again in quant interviews: breaking a stick into three pieces, choosing a random chord of a circle, and two friends who agree to meet within an hour. Each becomes an area calculation once you draw the right square or triangle. The chord puzzle adds a twist: the answer depends on what "random chord" means.

### interview
- **Broken stick**: break a unit stick at two independent uniform points; the three pieces form a triangle with probability $\frac{1}{4}$ (every piece must be shorter than $\frac{1}{2}$).
- **Meeting problem**: two people arrive uniformly in an hour and wait 15 minutes: $P(\text{meet}) = 1 - \left(\frac{3}{4}\right)^2 = \frac{7}{16}$.
- **Random chords (Bertrand's paradox)**: the chance a chord is longer than the side of the inscribed equilateral triangle is $\frac{1}{3}$ (random endpoints), $\frac{1}{2}$ (random distance from the center along a radius) or $\frac{1}{4}$ (random midpoint in the disc).
- **Sum of uniforms passing 1**: the expected number of Uniform(0, 1) draws until the total exceeds 1 is $e$, because $P(N > n) = \frac{1}{n!}$.
- Method: map the random choices to a point in a square or triangle, shade the favorable region, compute its area.
- State the assumptions (independent, uniform) and check with a simulation.

### deep
#### The broken stick

With break points $U, V$ and $a = \min$, $b = \max$, the pieces are $a$, $b - a$, $1 - b$. They form a triangle iff each is less than $\frac{1}{2}$ (the triangle inequality). In the unit square of $(U, V)$ the favorable region is two small triangles, each of area $\frac{1}{8}$, so $P = \frac{1}{4}$.

#### The meeting problem

Times $X, Y$ uniform on $[0, 60]$ minutes; they meet iff $|X - Y| \le 15$. The complement is two corner triangles with legs 45, total area $45^2 = 2025$ out of $3600$, so $P = 1 - \frac{2025}{3600} = \frac{7}{16} = 0.4375$.

#### Bertrand's chords (unit circle; the triangle side is $\sqrt 3$)

1. **Random endpoints**: fix one endpoint; the chord beats $\sqrt 3$ when the other lands in the middle third of the circle: $\frac{1}{3}$.
2. **Random radius and distance**: pick a radius, then a point uniformly along it as the chord's midpoint; long iff the distance is below $\frac{1}{2}$: $\frac{1}{2}$.
3. **Random midpoint in the disc**: long iff the midpoint is within radius $\frac{1}{2}$: area ratio $\frac{1}{4}$.

All three are "uniform", about different things. The puzzle's lesson is to define the random mechanism before computing.

#### Sums of uniforms passing 1

$P(U_1 + \dots + U_n \le 1) = \frac{1}{n!}$ (the volume of a simplex), and $N > n$ exactly when the first $n$ sum to at most 1, so $E[N] = \sum_{n \ge 0}P(N > n) = \sum_{n \ge 0}\frac{1}{n!} = e$.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double pi = numbers::pi, side = sqrt(3.0);
    const long n = 4'000'000;
    long triangle = 0, meet = 0, c1 = 0, c2 = 0, c3 = 0;
    double draws = 0;
    for (long t = 0; t < n; ++t) {
        double a = u01(), b = u01(), lo = min(a, b), hi = max(a, b);
        triangle += lo < 0.5 && hi - lo < 0.5 && 1 - hi < 0.5;
        meet += fabs(60 * u01() - 60 * u01()) <= 15;
        c1 += 2 * sin(pi * u01()) > side;        // endpoints: chord = 2 sin(half the angle)
        double d = u01();                        // distance of the midpoint along a radius
        c2 += 2 * sqrt(1 - d * d) > side;
        double x, y;                             // uniform midpoint in the disc
        do x = 2 * u01() - 1, y = 2 * u01() - 1; while (x * x + y * y > 1);
        c3 += 2 * sqrt(1 - x * x - y * y) > side;
        double s = 0;
        int k = 0;
        while (s <= 1) s += u01(), ++k;
        draws += k;
    }
    auto line = [&](const char* what, double exact, double p) {
        printf("%-30s exact %.5f  simulated %.5f\n", what, exact, p);
    };
    line("stick forms a triangle", 0.25, double(triangle) / n);
    line("friends meet", 7.0 / 16, double(meet) / n);
    line("chord > side, random endpoints", 1.0 / 3, double(c1) / n);
    line("chord > side, random radius", 0.5, double(c2) / n);
    line("chord > side, random midpoint", 0.25, double(c3) / n);
    line("uniforms needed to pass 1", exp(1.0), draws / n);
}
```

Output:

```text
stick forms a triangle         exact 0.25000  simulated 0.24973
friends meet                   exact 0.43750  simulated 0.43759
chord > side, random endpoints exact 0.33333  simulated 0.33314
chord > side, random radius    exact 0.50000  simulated 0.49942
chord > side, random midpoint  exact 0.25000  simulated 0.24969
uniforms needed to pass 1      exact 2.71828  simulated 2.71786
```

Four million trials reproduce every answer to within about 0.0006; the largest gap, for the random-radius chord, is 2.3 standard errors, and the others are within 1.4. The three chord estimates land on three different answers, exactly as Bertrand's paradox says.

#### Pitfalls

- **Breaking the stick sequentially** (break once, then break the *longer* piece, or a random piece) changes the answer; the $\frac{1}{4}$ is for two independent uniform break points.
- **Forgetting that waiting is symmetric**: in the meeting problem, either friend may arrive first; both corner triangles count.
- **Answering Bertrand's question without a model**: all three answers are right for their own model.

Connects to: [geometric probability](#/concept/prob.continuous.geometric-probability), [joint distributions](#/concept/prob.continuous.joint-distributions), [coin and dice games](#/concept/puzzles.probability.coin-and-dice-games).

### questions
Q: A stick is broken at two independent uniform points. What is the probability the three pieces form a triangle?
A: One quarter. The pieces form a triangle exactly when each is shorter than half the stick, and in the unit square of break points that region has area one quarter.

Q: Two friends arrive uniformly at random within an hour and each waits 15 minutes. What is the chance they meet?
A: Seven sixteenths. They miss only if their arrival times differ by more than 15 minutes, two corner triangles of total area three quarters squared.

Q: What is Bertrand's paradox?
A: The probability that a "random chord" of a circle is longer than the side of the inscribed equilateral triangle can be one third, one half or one quarter, depending on whether you choose random endpoints, a random point along a random radius, or a random midpoint in the disc. The answer depends on the random mechanism.

Q: How many Uniform(0,1) numbers do you need on average until their sum exceeds 1?
A: e, about 2.718. The first n uniforms sum to at most 1 with probability 1 over n factorial, and summing these tail probabilities gives e.

Q: What is the general method for such continuous puzzles?
A: Represent the random choices as a uniform point in a square, cube or simplex, describe the favorable event as a region, compute its area or volume relative to the whole, and check with a quick simulation.

## prob.continuous.transformations-of-random-variables
name: "Transformations of random variables"
importance: advanced
prereqs: [prob.continuous.joint-distributions]
scope: "change of variables"

### simple
A transformation creates a new random quantity from an old one, like squaring a random number or taking its logarithm. Its distribution is found by asking which old values lead to each new value, and stretching or squeezing the probability accordingly. This is how random number generators turn plain uniform numbers into every other distribution.

### interview
- **CDF method** (always works): $F_Y(y) = P(g(X) \le y)$; solve the inequality for $X$, then differentiate.
- **Density formula** for a monotone $g$: $f_Y(y) = f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|$; the derivative accounts for stretching.
- Non-monotone $g$ (like $x^2$ on $[-1, 1]$): add the contributions of every preimage.
- **Two variables**: $f_{U,V}(u, v) = f_{X,Y}(x, y)\,|J|$ with $J$ the Jacobian determinant of $(x, y)$ with respect to $(u, v)$. Box-Muller and polar coordinates are the classic uses.
- Standard results: $-\ln U \sim$ Exp(1); $U^2$ has density $\frac{1}{2\sqrt y}$; $\frac{Z_1}{Z_2}$ for independent standard normals is Cauchy; $e^{Z}$ is lognormal.
- Expectations need no transformation: $E[g(X)] = \int g(x)f_X(x)\,dx$.

### deep
#### Worked example 1: squaring a uniform

$Y = U^2$ with $U$ uniform on $[0, 1]$: $F_Y(y) = P(U \le \sqrt y) = \sqrt y$, so $f_Y(y) = \frac{1}{2\sqrt y}$ on $(0, 1]$. The density blows up at 0 (squaring crowds small values together) yet integrates to 1. $P(Y \le 0.25) = 0.5$ and $E[Y] = \frac{1}{3}$.

#### Worked example 2: exponential from uniform

$Y = -\ln U$: $P(Y > y) = P(U < e^{-y}) = e^{-y}$, the Exp(1) survival function. This is inverse transform sampling in reverse.

#### Worked example 3: Box-Muller via the Jacobian

For independent standard normals $(Z_1, Z_2)$, switch to polar coordinates $R, \Theta$. The joint density $\frac{1}{2\pi}e^{-r^2/2}$ times the Jacobian $r$ gives $f_{R,\Theta}(r, \theta) = \frac{1}{2\pi}\,r e^{-r^2/2}$: $\Theta$ is uniform, independent of $R$, and $R^2 = -2\ln U$ is exponential with mean 2. Running this backwards turns two uniforms into two independent normals.

#### Worked example 4: the ratio of normals

$C = \frac{Z_1}{Z_2}$ has density $\frac{1}{\pi(1 + c^2)}$, the Cauchy distribution: $P(|C| \le 1) = \frac{1}{2}$ and it has no mean, which is why its sample averages never settle ([law of large numbers](#/concept/prob.limits.law-of-large-numbers)).

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)

int main() {
    const double pi = numbers::pi;
    const long n = 4'000'000;
    long sqLow = 0, expHigh = 0, cauchyIn = 0, radiusSmall = 0;
    double sq = 0;
    for (long t = 0; t < n; ++t) {
        double u = u01();
        sq += u * u;
        sqLow += u * u <= 0.25;
        expHigh += -log(1 - u01()) > 2;
        double r = sqrt(-2 * log(1 - u01())), theta = 2 * pi * u01();   // Box-Muller
        double z1 = r * cos(theta), z2 = r * sin(theta);
        cauchyIn += fabs(z1 / z2) <= 1;
        radiusSmall += z1 * z1 + z2 * z2 <= 2;   // R^2 ~ Exp(mean 2): P(R^2 <= 2) = 1 - 1/e
    }
    printf("P(U^2 <= 0.25): exact 0.50000  simulated %.5f\n", double(sqLow) / n);
    printf("E[U^2]:         exact %.5f  simulated %.5f\n", 1.0 / 3, sq / n);
    printf("P(-ln U > 2):   exact %.5f  simulated %.5f\n", exp(-2.0), double(expHigh) / n);
    printf("P(R^2 <= 2):    exact %.5f  simulated %.5f\n", 1 - exp(-1.0),
           double(radiusSmall) / n);
    printf("P(|Z1/Z2| <= 1): exact 0.50000  simulated %.5f\n", double(cauchyIn) / n);
}
```

Output:

```text
P(U^2 <= 0.25): exact 0.50000  simulated 0.50067
E[U^2]:         exact 0.33333  simulated 0.33310
P(-ln U > 2):   exact 0.13534  simulated 0.13520
P(R^2 <= 2):    exact 0.63212  simulated 0.63216
P(|Z1/Z2| <= 1): exact 0.50000  simulated 0.50034
```

Every estimate is within 2.7 standard errors of its exact value, most within 1.6. The two largest gaps, for $P(U^2 \le 0.25)$ and $E[U^2]$, come from the same draws of $U$ (a few more small values than average in this run), so they are one fluctuation, not two.

#### Pitfalls

- **Forgetting the derivative**: $f_Y(y) = f_X(g^{-1}(y))$ alone is wrong; the Jacobian keeps the total probability at 1.
- **Non-monotone maps**: $Y = X^2$ for $X$ on $[-1, 1]$ has two preimages, $\pm\sqrt y$; add both.
- **Division by values near zero** produces heavy tails (Cauchy); ratios of estimates can be wildly unstable.

Connects to: [joint distributions](#/concept/prob.continuous.joint-distributions), [uniform distribution](#/concept/prob.distributions.uniform-distribution), [normal distribution](#/concept/prob.distributions.normal-distribution).

### questions
Q: How do you find the density of Y equal to g(X) for an increasing function g?
A: Use the CDF: F of Y at y equals F of X at g inverse of y, and differentiating gives f of X at g inverse of y times the derivative of g inverse. For a decreasing g, take the absolute value of that derivative.

Q: What is the distribution of the square of a Uniform(0,1) variable?
A: Its CDF is the square root of y, so its density is 1 over 2 root y on 0 to 1: values pile up near zero. Its mean is one third.

Q: What is the distribution of minus the natural log of a Uniform(0,1) variable?
A: Exponential with rate 1, because the probability it exceeds y equals the probability that U is below e to the minus y, which is e to the minus y.

Q: What is the role of the Jacobian in a change of variables?
A: When mapping two variables to two new ones, the joint density must be multiplied by the absolute value of the Jacobian determinant of the inverse map, which measures how areas are stretched, so total probability stays 1.

Q: What is the distribution of the ratio of two independent standard normals?
A: The standard Cauchy distribution, with density 1 over pi times 1 plus c squared. It has no mean or variance, and half its mass lies between minus 1 and 1.
