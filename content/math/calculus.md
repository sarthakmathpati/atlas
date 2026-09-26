---
topic: math.calculus
name: "Calculus"
subject: math
order: 3
prereqs: []
---

## math.calculus.derivatives-and-optimization
name: "Derivatives and optimization"
importance: important
scope: "maxima, minima, constrained optimization with Lagrange multipliers"

### simple
A derivative measures how fast something changes, like the speedometer reading for a car's position. At the top of a hill the ground is flat for a moment, so a maximum or minimum of a smooth function sits where its derivative is zero. Finding the best choice then means solving "derivative equals zero" and checking which answer is the best one.

### interview
- Rules: $(x^n)' = nx^{n-1}$, $(e^x)' = e^x$, $(\ln x)' = \frac{1}{x}$, product $(fg)' = f'g + fg'$, chain $(f(g(x)))' = f'(g(x))\,g'(x)$.
- **Critical points**: $f'(x) = 0$ (or undefined). Second derivative test: $f'' < 0$ is a local maximum, $f'' > 0$ a local minimum.
- On a closed interval, also compare the endpoints: the best value may sit at the boundary.
- **Lagrange multipliers**: to optimize $f$ subject to $g = c$, solve $\nabla f = \lambda \nabla g$ with $g = c$. At the optimum the level curve of $f$ touches the constraint.
- $\lambda$ is the shadow price: how much the optimum improves per unit of extra constraint.
- Quant uses: maximizing expected log growth (Kelly), minimum-variance portfolios, maximum likelihood.

### deep
#### Intuition

If $f'(x) > 0$ the function is still rising, so a slightly larger $x$ does better; if $f'(x) < 0$, a smaller one does. Only where $f'(x) = 0$ can a smooth interior point be a peak or a valley. The second derivative says which: a curve bending down ($f'' < 0$) has a peak.

With a constraint $g(x, y) = c$, you walk along the constraint curve. At the best point, moving along the curve doesn't change $f$ to first order, which means the gradient of $f$ is perpendicular to the curve, just like the gradient of $g$. Two perpendiculars to the same curve are parallel: $\nabla f = \lambda \nabla g$.

#### Worked example 1: an open box

Cut equal squares of side $x$ from the corners of a 12 by 12 sheet and fold up the sides. The volume is $V(x) = x(12 - 2x)^2$ for $0 < x < 6$.

$$V'(x) = (12 - 2x)^2 - 4x(12 - 2x) = (12 - 2x)(12 - 6x),$$

which is zero at $x = 2$ (and at $x = 6$, the endpoint where the box is flat). $V''(x) = 24x - 96$ is $-48$ at $x = 2$, a maximum, with $V(2) = 2 \cdot 8^2 = 128$.

#### Worked example 2: a Lagrange multiplier

Maximize $f = xy^2$ subject to $x + y = 9$ with $x, y > 0$. The gradients are $\nabla f = (y^2, 2xy)$ and $\nabla g = (1, 1)$, so $y^2 = \lambda$ and $2xy = \lambda$. Then $y^2 = 2xy$, so $y = 2x$, and the constraint gives $x = 3$, $y = 6$, $f = 108$, $\lambda = 36$.

The multiplier has a meaning. With budget $c$ instead of 9, the same steps give $x = \frac{c}{3}$, $y = \frac{2c}{3}$ and a best value of $\frac{4c^3}{27}$, whose derivative at $c = 9$ is $\frac{4 \cdot 81}{9} = 36 = \lambda$. One more unit of budget buys about 36 more units of $f$.

#### Checking numerically

```cpp
double V(double x) { return x * (12 - 2 * x) * (12 - 2 * x); }
double best(double c) {                          // max of x * y^2 on x + y = c, by grid
    double b = 0;
    for (double x = 0; x <= c; x += 1e-5) b = max(b, x * (c - x) * (c - x));
    return b;
}

int main() {
    double h = 1e-5, xs = 0, vs = 0;
    for (double x = 0; x <= 6; x += 1e-5)
        if (V(x) > vs) vs = V(x), xs = x;
    printf("box: best x = %.4f, volume = %.4f\n", xs, vs);
    printf("V'(2) = %.6f, V''(2) = %.4f\n", (V(2 + h) - V(2 - h)) / (2 * h),
           (V(2 + 1e-3) - 2 * V(2) + V(2 - 1e-3)) / 1e-6);
    double b9 = best(9);
    printf("max of x*y^2 on x + y = 9: %.4f\n", b9);
    printf("shadow price (best(9.001) - best(8.999)) / 0.002 = %.3f\n",
           (best(9.001) - best(8.999)) / 0.002);
}
```

Output:

```text
box: best x = 2.0000, volume = 128.0000
V'(2) = 0.000000, V''(2) = -48.0000
max of x*y^2 on x + y = 9: 108.0000
shadow price (best(9.001) - best(8.999)) / 0.002 = 36.000
```

A grid search finds the same optimum as the calculus, finite differences reproduce $V'(2) = 0$ and $V''(2) = -48$, and nudging the budget reproduces $\lambda = 36$.

#### Common mistakes

- **Skipping the endpoints**: on $[a, b]$ the maximum may be at $a$ or $b$ with $f' \ne 0$ there.
- **A critical point that is a minimum** (or a saddle): check $f''$ or compare values.
- **Dropping the chain rule** inside compositions: $(\ln(1 + f))' = \frac{1}{1 + f}$, times the inner derivative.
- **Solving for $\lambda$ only**: the answer is the point $(x, y)$; $\lambda$ is extra information.

#### Variants

The [Kelly criterion](#/concept/markets.betting.kelly-criterion) maximizes $p\ln(1 + f) + (1 - p)\ln(1 - f)$; setting the derivative to zero gives the betting fraction $f = 2p - 1$ for an even-money bet. With several constraints, add one multiplier each; with inequality constraints, the KKT conditions extend the same idea.

Connects to: [inequalities](#/concept/math.number-theory.inequalities), [Taylor series](#/concept/math.calculus.taylor-series), [maximum likelihood estimation](#/concept/prob.statistics.maximum-likelihood-estimation). Practice: [Fence by a river](#/problems/q-river-fence).

### questions
Q: How do you find the maximum of a differentiable function on a closed interval?
A: Find the critical points inside, where the derivative is zero, then compare the function's values there and at the two endpoints. The largest value is the maximum; a zero derivative alone doesn't say peak or valley.

Q: What does the Lagrange condition gradient f = lambda times gradient g mean geometrically?
A: At the constrained optimum, the level curve of f just touches the constraint curve, so both gradients are perpendicular to the same curve and therefore parallel. Lambda is the ratio of their lengths.

Q: How do you interpret the Lagrange multiplier?
A: It is the rate at which the optimal value changes as the constraint is relaxed. For maximizing x y squared with x + y = 9, lambda is 36, and raising the budget from 9 to 10 raises the best value by about 36.

Q: What is the second derivative test?
A: At a point where the first derivative is zero, a negative second derivative means a local maximum and a positive one a local minimum. If it is zero, the test says nothing and you must look further.

## math.calculus.integrals
name: "Integrals"
importance: important
scope: "basic integration, integration by parts"

### simple
An integral adds up a quantity that changes continuously, like working out the distance driven from a speedometer that keeps changing. Geometrically it is the area under a curve. The fundamental theorem of calculus says you can compute it by undoing a derivative.

### interview
- **Fundamental theorem**: if $F' = f$, then $\int_a^b f(x)\,dx = F(b) - F(a)$.
- Basic antiderivatives: $\int x^n\,dx = \frac{x^{n+1}}{n+1}$ ($n \ne -1$), $\int \frac{dx}{x} = \ln|x|$, $\int e^{ax}dx = \frac{e^{ax}}{a}$, $\int \sin x\,dx = -\cos x$.
- **Substitution** reverses the chain rule: $\int f(g(x))g'(x)\,dx = \int f(u)\,du$.
- **By parts** reverses the product rule: $\int u\,dv = uv - \int v\,du$. Choose $u$ to get simpler when differentiated (a polynomial, a log).
- Useful facts: $\int_0^\infty x^n e^{-x}dx = n!$, $\int_{-\infty}^{\infty} e^{-x^2/2}dx = \sqrt{2\pi}$, odd functions integrate to 0 over symmetric intervals.
- Check any answer by differentiating it, or numerically with Simpson's rule.

### deep
#### Intuition

Chop $[a, b]$ into thin strips; each contributes about $f(x)\,\Delta x$, and the integral is the limit of the sum. If $F$ is an accumulated total, its rate of change is the height of the current strip, $F' = f$, so the total change is $F(b) - F(a)$.

By parts comes from the product rule $(uv)' = u'v + uv'$: integrate both sides and rearrange. It trades $\int u\,dv$ for $\int v\,du$, which helps when differentiating $u$ simplifies it.

#### Worked examples

1. **$\int_0^1 xe^x\,dx$**: take $u = x$, $dv = e^x dx$, so $du = dx$, $v = e^x$:
   $$\int_0^1 xe^x\,dx = \left[xe^x\right]_0^1 - \int_0^1 e^x\,dx = e - (e - 1) = 1.$$
2. **$\int_1^e \ln x\,dx$**: take $u = \ln x$, $dv = dx$, so $du = \frac{dx}{x}$, $v = x$:
   $$\left[x\ln x\right]_1^e - \int_1^e 1\,dx = e - (e - 1) = 1.$$
3. **$\int_0^\pi x\sin x\,dx$**: $u = x$, $v = -\cos x$: $\left[-x\cos x\right]_0^\pi + \int_0^\pi \cos x\,dx = \pi + 0 = \pi$.
4. **Substitution, $\int_0^1 2xe^{x^2}dx$**: with $u = x^2$, $du = 2x\,dx$, it becomes $\int_0^1 e^u du = e - 1$.
5. **Repeated parts, $\int_0^\infty x^2 e^{-x}dx$**: each round lowers the power by one, giving $2 \cdot 1 = 2! = 2$.

#### Checking with Simpson's rule

Simpson's rule fits a parabola through each pair of strips; its error shrinks like $h^4$.

```cpp
template <class F>
double simpson(F f, double a, double b, int n = 10000) {    // n even
    double h = (b - a) / n, s = f(a) + f(b);
    for (int i = 1; i < n; ++i) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
}

int main() {
    const double pi = acos(-1.0), e = exp(1.0);
    struct Row { const char* name; double numeric, exact; };
    Row rows[] = {
        {"x e^x on [0,1]", simpson([](double x) { return x * exp(x); }, 0, 1), 1.0},
        {"ln x on [1,e]", simpson([](double x) { return log(x); }, 1, e), 1.0},
        {"x sin x on [0,pi]", simpson([](double x) { return x * sin(x); }, 0, pi), pi},
        {"2x e^(x^2) on [0,1]", simpson([](double x) { return 2 * x * exp(x * x); }, 0, 1),
         e - 1},
        {"x^2 e^-x on [0,50]", simpson([](double x) { return x * x * exp(-x); }, 0, 50), 2.0},
    };
    for (auto& r : rows)
        printf("%-20s Simpson %.10f  exact %.10f  gap %.1e\n", r.name, r.numeric, r.exact,
               fabs(r.numeric - r.exact));
}
```

Output:

```text
x e^x on [0,1]       Simpson 1.0000000000  exact 1.0000000000  gap 2.1e-15
ln x on [1,e]        Simpson 1.0000000000  exact 1.0000000000  gap 5.1e-15
x sin x on [0,pi]    Simpson 3.1415926536  exact 3.1415926536  gap 8.4e-15
2x e^(x^2) on [0,1]  Simpson 1.7182818285  exact 1.7182818285  gap 2.2e-16
x^2 e^-x on [0,50]   Simpson 2.0000000000  exact 2.0000000000  gap 2.1e-11
```

All five closed forms agree with the numerical integrals to at least ten decimals. The last one stops at 50 instead of infinity; the missing tail, $e^{-50}(50^2 + 2 \cdot 50 + 2)$, is about $5 \times 10^{-19}$.

#### Common mistakes

- **Forgetting to change the limits** in a substitution (or to substitute back).
- **Choosing $u$ badly** in by parts: $u = e^x$, $dv = x\,dx$ makes $\int x^2 e^x$ appear, which is worse.
- **Signs of $\cos$**: $\int \sin x\,dx = -\cos x$.
- **Improper integrals**: $\int_0^1 \frac{dx}{x}$ diverges; check that the integral converges before computing it.

Connects to: [integrals in probability](#/concept/math.calculus.integrals-in-probability), [Taylor series](#/concept/math.calculus.taylor-series), [series and sums](#/concept/math.number-theory.series-and-sums).

### questions
Q: State integration by parts and when you would use it.
A: The integral of u dv equals u times v minus the integral of v du. Use it for products where differentiating one factor simplifies it, such as x times e to the x, or a log times a polynomial.

Q: What is the integral of x e to the x from 0 to 1?
A: 1. By parts with u = x, the antiderivative is x e to the x minus e to the x, which is 0 at 1 and minus 1 at 0.

Q: What is the integral of ln x?
A: x ln x minus x, found by parts with u = ln x and dv = dx. From 1 to e it equals 1.

Q: How can you check an integral you computed by hand?
A: Differentiate the antiderivative and compare with the integrand, or compute the definite integral numerically, for example with Simpson's rule, and compare the numbers.

## math.calculus.taylor-series
name: "Taylor series"
importance: important
prereqs: [math.calculus.derivatives-and-optimization]
scope: "approximations like e^x and ln(1 + x)"

### simple
A Taylor series rebuilds a smooth function near a point from its value, slope, curvature and so on. Close to that point a few terms give an excellent approximation, the way the first few digits of a price tell you almost everything. It is why a 5% change and its logarithm are almost the same number.

### interview
- $f(x) \approx f(a) + f'(a)(x - a) + \frac{f''(a)}{2}(x - a)^2 + \dots + \frac{f^{(n)}(a)}{n!}(x - a)^n$.
- Series at 0 to know: $e^x = 1 + x + \frac{x^2}{2} + \frac{x^3}{6} + \dots$; $\ln(1 + x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \dots$ for $|x| < 1$; $\frac{1}{1-x} = 1 + x + x^2 + \dots$; $(1 + x)^a \approx 1 + ax + \frac{a(a-1)}{2}x^2$; $\sin x \approx x - \frac{x^3}{6}$; $\cos x \approx 1 - \frac{x^2}{2}$.
- **Lagrange remainder**: the error after the degree-$n$ term is $\frac{f^{(n+1)}(c)}{(n+1)!}(x - a)^{n+1}$ for some $c$ between $a$ and $x$.
- For alternating series with shrinking terms, the error is smaller than the first omitted term.
- Quant uses: log return $\approx$ simple return $- \frac{r^2}{2}$; $e^{rt} \approx 1 + rt$; delta-gamma approximations of option prices; the rule of 72.
- Accuracy falls quickly away from the center, and $\ln(1 + x)$ diverges beyond $|x| = 1$.

### deep
#### Intuition

Match the function at a point, then match its slope, then its curvature. Each derivative you match adds a term, and the $n!$ appears because the $n$-th derivative of $x^n$ is $n!$. Near the point the powers $(x - a)^n$ shrink fast, so the first few terms dominate.

#### Worked example: three approximations

- $e^{0.1} \approx 1 + 0.1 + 0.005 + 0.0001\overline{6} = 1.1051667$. The remainder after the cubic term is $\frac{e^c}{24}(0.1)^4$ with $0 < c < 0.1$, at most $\frac{e^{0.1}}{24} \cdot 10^{-4} \approx 4.6 \times 10^{-6}$. The true value is $1.1051709$, off by about $4.25 \times 10^{-6}$.
- $\ln 1.05 \approx 0.05 - 0.00125 + 0.0000417 = 0.0487917$. The series alternates with shrinking terms, so the error is below the next term, $\frac{0.05^4}{4} \approx 1.6 \times 10^{-6}$. True value $0.0487902$.
- $\sqrt{1.1} = (1 + 0.1)^{1/2} \approx 1 + 0.05 - 0.00125 = 1.04875$; true $1.0488088$.

The log one explains a market habit: a 5% simple return is a log return of about $0.05 - \frac{0.05^2}{2} = 0.04875$, so for small moves the two are interchangeable, and the gap is half the square.

#### Checking in code

```cpp
int main() {
    double x = 0.1, term = 1, sum = 0;
    printf("e^0.1 = %.10f\n", exp(x));
    for (int n = 0; n <= 4; ++n) {
        sum += term;
        double bound = exp(x) * pow(x, n + 1) / tgamma(n + 2);
        printf("  degree %d: %.10f  error %.1e  bound %.1e\n", n, sum, exp(x) - sum, bound);
        term *= x / (n + 1);
    }
    double y = 0.05, ln = 0;
    printf("ln 1.05 = %.10f\n", log1p(y));
    for (int n = 1; n <= 4; ++n) {
        ln += (n % 2 ? 1 : -1) * pow(y, n) / n;
        printf("  %d terms: %.10f  error %.1e  next term %.1e\n", n, ln, log1p(y) - ln,
               pow(y, n + 1) / (n + 1));
    }
    printf("sqrt 1.1 = %.7f, two-term binomial %.7f\n", sqrt(1.1), 1 + 0.05 - 0.00125);
}
```

Output:

```text
e^0.1 = 1.1051709181
  degree 0: 1.0000000000  error 1.1e-01  bound 1.1e-01
  degree 1: 1.1000000000  error 5.2e-03  bound 5.5e-03
  degree 2: 1.1050000000  error 1.7e-04  bound 1.8e-04
  degree 3: 1.1051666667  error 4.3e-06  bound 4.6e-06
  degree 4: 1.1051708333  error 8.5e-08  bound 9.2e-08
ln 1.05 = 0.0487901642
  1 terms: 0.0500000000  error -1.2e-03  next term 1.3e-03
  2 terms: 0.0487500000  error 4.0e-05  next term 4.2e-05
  3 terms: 0.0487916667  error -1.5e-06  next term 1.6e-06
  4 terms: 0.0487901042  error 6.0e-08  next term 6.3e-08
sqrt 1.1 = 1.0488088, two-term binomial 1.0487500
```

Every actual error sits below its bound, and each extra term gains more than a factor of 20, as expected when $x$ is as small as 0.1 or 0.05.

#### Common mistakes

- **Using a series outside its range**: $\ln(1 + x)$'s series diverges for $x > 1$. To approximate $\ln 3$, write it as $\ln 2 + \ln 1.5$ or use known logs.
- **Forgetting the factorial** in the coefficients.
- **Expanding around the wrong point**: for $\sqrt{101}$, expand $\sqrt{100 + 1} = 10\sqrt{1 + 0.01}$, not around 0.

Connects to: [derivatives and optimization](#/concept/math.calculus.derivatives-and-optimization), [approximations](#/concept/math.mental.approximations), [binomial theorem](#/concept/math.combinatorics.binomial-theorem-and-pascals-identities), [Greeks intuition](#/concept/markets.options.greeks-intuition).

### questions
Q: Write the first terms of the Taylor series of e to the x and ln(1 + x) around 0.
A: e to the x is 1 + x + x squared over 2 + x cubed over 6 and so on. ln(1 + x) is x minus x squared over 2 plus x cubed over 3 and so on, valid for x between -1 and 1.

Q: How large is the error of a Taylor approximation?
A: The Lagrange remainder: the next derivative at some point between the center and x, times the next power of the distance, over the next factorial. For an alternating series with shrinking terms, the error is below the first term you dropped.

Q: Why are log returns and simple returns nearly equal for small moves?
A: ln(1 + r) is r minus r squared over 2 plus smaller terms. For a 5% move the difference is about 0.00125, small compared with the move itself.

Q: How would you approximate the square root of 1.1 by hand?
A: Use (1 + x) to the power one half, about 1 + x/2 - x squared/8. With x = 0.1 that is 1.04875, against the true 1.04881.

## math.calculus.integrals-in-probability
name: "Integrals in probability"
importance: important
prereqs: [math.calculus.integrals]
scope: "computing expectations of continuous variables"

### simple
For a continuous random variable, probabilities are areas under its density curve. An average is found by weighting every possible value by its density and adding it all up, which is an integral. Most continuous probability questions come down to setting up the right integral and computing it.

### interview
- A density $f \ge 0$ integrates to 1; $P(a < X < b) = \int_a^b f(x)\,dx$, and single points have probability 0.
- $E[X] = \int x f(x)\,dx$, $E[g(X)] = \int g(x) f(x)\,dx$, $\operatorname{Var}(X) = E[X^2] - E[X]^2$.
- **Tail formula** for $X \ge 0$: $E[X] = \int_0^\infty P(X > x)\,dx$, often easier than the density.
- Normalizing constants: find $c$ from $\int c\,g(x)\,dx = 1$.
- Two variables: $P((X, Y) \in A) = \iint_A f(x, y)\,dx\,dy$; with independence the density factors.
- Sanity checks: the probability is between 0 and 1, the mean lies inside the support, and a quick simulation agrees.

### deep
#### Intuition

A density is probability per unit length. Multiply it by a small width to get the probability of that small interval, weight by the value $x$, and add over all the intervals: that sum is the integral $\int x f(x)\,dx$. The tail formula comes from writing $X = \int_0^X 1\,dx$ and swapping the order: each level $x$ contributes when $X > x$.

#### Worked example: a hump-shaped density

Let $f(x) = cx(1 - x)$ on $[0, 1]$.

- **Constant**: $\int_0^1 x - x^2\,dx = \frac{1}{2} - \frac{1}{3} = \frac{1}{6}$, so $c = 6$.
- **Mean**: $E[X] = 6\int_0^1 x^2 - x^3\,dx = 6\left(\frac{1}{3} - \frac{1}{4}\right) = \frac{1}{2}$ (also clear from symmetry about $\frac{1}{2}$).
- **Second moment**: $E[X^2] = 6\left(\frac{1}{4} - \frac{1}{5}\right) = \frac{3}{10}$, so $\operatorname{Var}(X) = \frac{3}{10} - \frac{1}{4} = \frac{1}{20}$.
- **A probability**: $P(X < \frac{1}{4}) = \left[3x^2 - 2x^3\right]_0^{1/4} = \frac{3}{16} - \frac{1}{32} = \frac{5}{32}$.
- **Tail formula**: $P(X > x) = 1 - 3x^2 + 2x^3$, and $\int_0^1 (1 - 3x^2 + 2x^3)\,dx = 1 - 1 + \frac{1}{2} = \frac{1}{2}$, the mean again.

#### Checking by integration and simulation

The program integrates numerically, then samples from the density by **rejection**: propose $x$ uniform on $[0, 1]$ and accept it with probability $f(x)/1.5$ (the density's maximum is 1.5, at $\frac{1}{2}$).

```cpp
mt19937_64 rng(2026);
double unif() { return (rng() >> 11) * 0x1.0p-53; }

template <class F>
double simpson(F f, double a, double b, int n = 1000) {
    double h = (b - a) / n, s = f(a) + f(b);
    for (int i = 1; i < n; ++i) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
}

int main() {
    auto f = [](double x) { return 6 * x * (1 - x); };
    printf("integral of f: %.6f\n", simpson(f, 0, 1));
    printf("E[X] = %.6f, E[X^2] = %.6f, P(X < 1/4) = %.6f (5/32 = %.6f)\n",
           simpson([&](double x) { return x * f(x); }, 0, 1),
           simpson([&](double x) { return x * x * f(x); }, 0, 1), simpson(f, 0, 0.25), 5 / 32.0);
    printf("tail formula: %.6f\n",
           simpson([](double x) { return 1 - 3 * x * x + 2 * x * x * x; }, 0, 1));
    const int n = 1'000'000;
    long proposals = 0;
    double s = 0, s2 = 0;
    long below = 0;
    for (int got = 0; got < n; ++proposals) {
        double x = unif();
        if (unif() * 1.5 >= f(x)) continue;          // rejected
        ++got, s += x, s2 += x * x, below += x < 0.25;
    }
    double mean = s / n, var = s2 / n - mean * mean, p = double(below) / n;
    printf("simulated mean %.5f (%.1f SE off), variance %.5f, P(X < 1/4) %.5f (%.1f SE off)\n",
           mean, fabs(mean - 0.5) / sqrt(0.05 / n), var, p,
           fabs(p - 5 / 32.0) / sqrt(5 / 32.0 * 27 / 32.0 / n));
    printf("acceptance rate %.4f (expected 2/3)\n", double(n) / proposals);
}
```

Output:

```text
integral of f: 1.000000
E[X] = 0.500000, E[X^2] = 0.300000, P(X < 1/4) = 0.156250 (5/32 = 0.156250)
tail formula: 0.500000
simulated mean 0.50032 (1.4 SE off), variance 0.05001, P(X < 1/4) 0.15661 (1.0 SE off)
acceptance rate 0.6670 (expected 2/3)
```

The integrals reproduce the exact values. A million accepted samples give a mean 1.4 standard errors from $\frac{1}{2}$, a variance of 0.05001 against the exact $\frac{1}{20}$, and a probability 1.0 standard error from $\frac{5}{32}$. About $\frac{2}{3}$ of proposals are accepted, as expected: the area under $f$ is 1 and the proposal box has area 1.5.

#### Common mistakes

- **Treating the density as a probability**: $f$ can exceed 1 (here $f(\frac{1}{2}) = 1.5$); only its integral is a probability.
- **Forgetting the constant** $c$, or the limits where the density is zero.
- **$E[g(X)] \ne g(E[X])$**: $E[X^2]$ is $\frac{3}{10}$, not $\frac{1}{4}$.

Connects to: [expectation](#/concept/prob.random-variables.expectation), [joint distributions](#/concept/prob.continuous.joint-distributions), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation). Practice: [Upper half of a density](#/problems/q-density-tail).

### questions
Q: How do you find the normalizing constant of a density c times g(x)?
A: Integrate g over the support and set c to one over the result, so that the density integrates to 1. For c x(1 - x) on 0 to 1 the integral of x(1 - x) is 1/6, so c is 6.

Q: State the tail formula for the expectation of a non-negative random variable.
A: E[X] equals the integral from 0 to infinity of P(X > x). It follows from writing X as the integral of 1 up to X and swapping the order of integration and expectation.

Q: Can a probability density be larger than 1?
A: Yes. A density is probability per unit length, so it can be large on a short interval; only its integral over an interval must be at most 1. The density 6x(1 - x) reaches 1.5 at one half.

Q: How can you sample from a density you can evaluate but can't invert?
A: Rejection sampling: propose a point uniformly (or from a simpler density), and accept it with probability f(x) divided by a bound on f. Accepted points follow f, and the acceptance rate is one over the bound's area.

## math.calculus.differential-equations-basics
name: "Differential equations basics"
importance: advanced
prereqs: [math.calculus.integrals]
scope: "Differential equations basics"

### simple
A differential equation describes how something changes rather than what it is, like "hot coffee cools faster the hotter it is compared with the room". Solving it means finding the quantity over time that follows that rule. A few simple equations of this kind describe growth, decay and pulling back toward an average.

### interview
- **Exponential growth or decay**: $y' = ky$ has $y = y_0 e^{kt}$; the half-life is $\frac{\ln 2}{|k|}$.
- **Relaxation toward a level** (cooling, mean reversion): $y' = k(M - y)$ has $y = M + (y_0 - M)e^{-kt}$.
- **Separable** equations $y' = g(t)h(y)$: move the $y$ terms to one side and integrate both sides.
- **Linear first order** $y' + p(t)y = q(t)$: multiply by the integrating factor $e^{\int p\,dt}$.
- **Oscillation**: $y'' = -\omega^2 y$ has $y = A\cos\omega t + B\sin\omega t$.
- Numerically: Euler's method has error proportional to the step $h$, Runge-Kutta 4 to $h^4$.

### deep
#### Intuition

$y' = k(M - y)$ says the gap to $M$ closes at a rate proportional to its size. The gap $M - y$ therefore decays exponentially, which is the whole solution: $M - y(t) = (M - y_0)e^{-kt}$. Continuous compounding ($y' = ry$), radioactive decay, Newton's cooling and the drift of a mean-reverting price (the Ornstein-Uhlenbeck process without noise) are all this one equation.

#### Worked example: cooling coffee

Coffee at 90°C sits in a 20°C room and cools by $T' = -0.1(T - 20)$ per minute. The gap starts at 70 and decays: $T(t) = 20 + 70e^{-0.1t}$. When is it 50°C? Solve $70e^{-0.1t} = 30$: $t = 10\ln\frac{7}{3} \approx 8.473$ minutes.

#### Separable example

$y' = ty$ with $y(0) = 1$: $\frac{dy}{y} = t\,dt$, so $\ln y = \frac{t^2}{2}$ and $y = e^{t^2/2}$.

#### Checking numerically

Euler's method steps $y \leftarrow y + h\,f(t, y)$; Runge-Kutta 4 averages four slope samples per step.

```cpp
double f(double, double T) { return -0.1 * (T - 20); }

double euler(double h, double tEnd) {
    double T = 90;
    int steps = int(llround(tEnd / h));
    for (int i = 0; i < steps; ++i) T += h * f(i * h, T);
    return T;
}

double rk4(double h, double tEnd) {
    double T = 90, t = 0;
    int steps = int(llround(tEnd / h));
    for (int i = 0; i < steps; ++i, t += h) {
        double k1 = f(t, T), k2 = f(t + h / 2, T + h / 2 * k1);
        double k3 = f(t + h / 2, T + h / 2 * k2), k4 = f(t + h, T + h * k3);
        T += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    }
    return T;
}

int main() {
    double tEnd = 10 * log(7.0 / 3.0), exact = 20 + 70 * exp(-0.1 * tEnd);
    printf("t = %.4f min, exact T = %.10f\n", tEnd, exact);
    for (double h : {0.1, 0.01, 0.001}) {
        double t = h * llround(tEnd / h), ex = 20 + 70 * exp(-0.1 * t);
        printf("h = %-5g Euler error %.2e   RK4 error %.2e\n", h, fabs(euler(h, tEnd) - ex),
               fabs(rk4(h, tEnd) - ex));
    }
}
```

Output:

```text
t = 8.4730 min, exact T = 50.0000000000
h = 0.1   Euler error 1.28e-01   RK4 error 2.14e-09
h = 0.01  Euler error 1.27e-02   RK4 error 1.35e-13
h = 0.001 Euler error 1.27e-03   RK4 error 1.21e-13
```

The formula gives exactly 50°C at $t = 10\ln\frac{7}{3}$. Each tenfold smaller step makes Euler's error ten times smaller (first order) and RK4's about $10^4$ times smaller until rounding takes over. (Each line compares with the exact value at the time the steps actually reach.)

#### Common mistakes

- **Forgetting the constant** of integration: it is what the initial condition fixes.
- **Sign of $k$**: decay toward $M$ needs $y' = k(M - y)$ with $k > 0$.
- **Euler with a big step**: for $y' = -ky$ it oscillates or blows up once $hk > 2$.

Connects to: [integrals](#/concept/math.calculus.integrals), [Taylor series](#/concept/math.calculus.taylor-series), [Brownian motion intuition](#/concept/prob.stochastic.brownian-motion-intuition), [time value of money](#/concept/markets.pricing.time-value-of-money).

### questions
Q: What is the solution of y' = k(M - y)?
A: y(t) = M + (y0 - M) times e to the -kt. The gap to M shrinks exponentially at rate k; this models cooling, mean reversion and filling toward a limit.

Q: How do you solve a separable differential equation?
A: Put all y terms with dy on one side and all t terms with dt on the other, integrate both sides, and use the initial condition to fix the constant. For y' = ty this gives y = e to the t squared over 2 when y(0) = 1.

Q: What is the half-life of exponential decay with rate k?
A: ln 2 over k, about 0.693 over k. After that time the quantity (or the gap to its limit) has halved, whatever its starting size.

Q: Why is Runge-Kutta 4 preferred to Euler's method?
A: Euler's error shrinks in proportion to the step size, while RK4's shrinks with its fourth power, so RK4 reaches a given accuracy with far fewer steps for smooth problems.
