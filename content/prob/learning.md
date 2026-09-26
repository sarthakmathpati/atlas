---
topic: prob.learning
name: "Statistical learning for quant research"
subject: prob
order: 9
prereqs: [prob.statistics]
---

## prob.learning.linear-regression
name: "Linear regression"
importance: important
scope: "least squares, assumptions, interpreting coefficients, R squared"

### simple
Linear regression fits a straight line (or a flat plane, with several inputs) through data so that predictions are as close as possible to the observed values. Each coefficient says how much the prediction changes when one input goes up by one, holding the others fixed. It is the workhorse model of quant research: simple, fast and easy to interpret.

### interview
- Model $y = X\beta + \varepsilon$; **least squares** minimizes $\sum (y_i - \hat y_i)^2$, giving $\hat\beta = (X^\top X)^{-1}X^\top y$. With one input, slope $= \frac{\text{Cov}(x, y)}{\text{Var}(x)}$ and the line passes through $(\bar x, \bar y)$.
- **Assumptions** for the usual inference: linear relationship, independent errors with mean 0 and constant variance, no perfect multicollinearity; normal errors for exact small-sample $t$ tests. Least squares is then unbiased and the best linear unbiased estimator (Gauss-Markov).
- **Interpretation**: $\beta_j$ is the change in the expected $y$ per unit of $x_j$ **holding the other inputs fixed**; it is an association, causal only under strong assumptions.
- **$R^2 = 1 - \frac{\text{SSE}}{\text{SST}}$**: the share of the variance of $y$ explained; with one input it is the squared correlation. More inputs never lower it, so use adjusted $R^2$ or out-of-sample error.
- Standard error of a slope: $\frac{\sigma}{\sqrt{\sum (x_i - \bar x)^2}}$; more spread in $x$ gives a sharper slope.
- Watch for outliers, heteroscedasticity, correlated errors (time series) and collinear inputs.

### deep
#### Worked example

Data come from $y = 2 + 3x + \varepsilon$ with $x$ uniform on $[0, 1]$ and noise $\varepsilon \sim N(0, 1)$. The population $R^2$ is the explained share of variance: $\text{Var}(3x) = \frac{9}{12} = 0.75$ against noise 1, so $R^2 = \frac{0.75}{1.75} = \frac{3}{7} \approx 0.4286$. With $n = 200$ points the slope's standard error is about $\frac{1}{\sqrt{200/12}} \approx 0.245$: a single fit can easily report 2.6 or 3.4.

#### Code: fitting many samples

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

struct Fit { double a, b, r2, seB; };
Fit leastSquares(const vector<double>& x, const vector<double>& y) {
    double n = x.size(), mx = 0, my = 0;
    for (size_t i = 0; i < x.size(); ++i) mx += x[i] / n, my += y[i] / n;
    double sxx = 0, sxy = 0, syy = 0;
    for (size_t i = 0; i < x.size(); ++i) {
        sxx += (x[i] - mx) * (x[i] - mx);
        sxy += (x[i] - mx) * (y[i] - my);
        syy += (y[i] - my) * (y[i] - my);
    }
    double b = sxy / sxx, a = my - b * mx, sse = syy - b * sxy;
    return {a, b, 1 - sse / syy, sqrt(sse / (n - 2) / sxx)};
}

int main() {
    const int n = 200, reps = 20000;
    double sumB = 0, sumB2 = 0, sumA = 0, sumR2 = 0, sumSe = 0;
    vector<double> x(n), y(n);
    for (int r = 0; r < reps; ++r) {
        for (int i = 0; i < n; ++i) {
            x[i] = u01();
            y[i] = 2 + 3 * x[i] + normal();
        }
        Fit f = leastSquares(x, y);
        sumB += f.b, sumB2 += f.b * f.b, sumA += f.a, sumR2 += f.r2, sumSe += f.seB;
        if (r == 0) printf("first sample: y = %.3f + %.3f x, R^2 %.3f\n", f.a, f.b, f.r2);
    }
    double mb = sumB / reps;
    printf("average intercept %.4f (true 2), slope %.4f (true 3)\n", sumA / reps, mb);
    printf("spread of slopes %.4f; average reported standard error %.4f (about %.4f)\n",
           sqrt(sumB2 / reps - mb * mb), sumSe / reps, 1 / sqrt(n / 12.0));
    printf("average R^2 %.4f (population 3/7 = %.4f)\n", sumR2 / reps, 3.0 / 7);
}
```

Output:

```text
first sample: y = 2.047 + 2.932 x, R^2 0.470
average intercept 2.0005 (true 2), slope 2.9997 (true 3)
spread of slopes 0.2468; average reported standard error 0.2457 (about 0.2449)
average R^2 0.4294 (population 3/7 = 0.4286)
```

Across 20,000 samples the average intercept and slope match 2 and 3 to three decimals (least squares is unbiased), the actual spread of the slopes, 0.2468, matches the reported standard errors (about 0.246), and the average $R^2$ is within 0.001 of $\frac{3}{7}$. The first sample alone shows how noisy one fit is: slope 2.93 and $R^2$ 0.47.

#### Pitfalls

- **Interpreting a coefficient causally**: omitted variables that correlate with $x$ bias its coefficient ([correlation vs causation](#/concept/prob.statistics.correlation-vs-causation)).
- **Extrapolating** beyond the range of the data.
- **Chasing $R^2$**: in-sample $R^2$ rises with every added input; judge models on held-out data ([overfitting](#/concept/prob.learning.overfitting-and-the-bias-variance-trade-off)).
- **Time series**: regressing one trending series on another produces high $R^2$ with no relationship (spurious regression); errors are not independent.

Connects to: [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [maximum likelihood estimation](#/concept/prob.statistics.maximum-likelihood-estimation), [regularization](#/concept/prob.learning.regularization).

### questions
Q: How is the least squares slope computed for one input?
A: The covariance of x and y divided by the variance of x, with the intercept chosen so that the line passes through the point of means. In matrix form the coefficients are X transpose X inverse times X transpose y.

Q: What does R squared measure?
A: The fraction of the variance of y explained by the model, one minus the residual sum of squares over the total sum of squares. With one input it equals the squared correlation, and it never decreases when inputs are added, so it can't be used alone to choose models.

Q: What assumptions does ordinary least squares rely on?
A: A linear relationship, errors with mean zero that are independent and have constant variance, and no perfect collinearity among inputs; normal errors are needed for exact small-sample inference. Under these, least squares is unbiased and has the smallest variance among linear unbiased estimators.

Q: How do you interpret a regression coefficient with several inputs?
A: The expected change in y for a one-unit increase in that input, holding the other inputs fixed. It describes an association in the data; a causal reading requires that no relevant confounders are left out.

Q: What makes the slope estimate more precise?
A: Less noise, more observations and more spread in x: its standard error is sigma divided by the square root of the sum of squared deviations of x from its mean.

## prob.learning.overfitting-and-the-bias-variance-trade-off
name: "Overfitting and the bias-variance trade-off"
importance: important
prereqs: [prob.learning.linear-regression]
scope: "train vs test error"

### simple
Overfitting is when a model learns the noise in its training data instead of the real pattern, like a student who memorizes past exam answers and then fails new questions. A more flexible model always fits the training data better, but past a point it predicts new data worse. The bias-variance trade-off describes that balance between too simple and too flexible.

### interview
- **Training error** always falls as a model gets more flexible; **test error** (on new data) falls, then rises: the gap is overfitting.
- **Bias-variance decomposition** of expected test error at a point: $E[(y - \hat f(x))^2] = \text{bias}^2 + \text{variance} + \sigma^2$ (irreducible noise).
- Simple models: high bias, low variance. Flexible models: low bias, high variance. The best model balances them for the amount of data you have.
- For a correctly specified linear model with $p$ parameters and $n$ points, the expected training MSE is $\sigma^2\frac{n - p}{n}$ and the expected error on fresh noise at the same inputs is $\sigma^2\frac{n + p}{n}$: every extra parameter lowers one and raises the other.
- Remedies: more data, simpler models, regularization, cross-validation to choose complexity, early stopping.
- In finance, noise is large and signals small, so overfitting is the default failure; out-of-sample testing is essential.

### deep
#### An exact result to see it

Take $n = 20$ fixed inputs evenly spread on $[-1, 1]$, true model $y = 1 + 2x + \varepsilon$ with $\sigma = 1$, and fit polynomials of degree $d$ ($p = d + 1$ parameters, $d \ge 1$ so the truth is included). The fitted values are a projection onto a $p$-dimensional space, which absorbs $p$ of the $n$ noise dimensions:

$$E[\text{train MSE}] = \frac{n - p}{n}, \qquad E[\text{test MSE at the same } x] = \frac{n + p}{n}.$$

At degree 9 ($p = 10$): training 0.5, test 1.5, although the truth is a straight line. A degree-0 model (a constant) is **underfit**: it misses the slope, adding a bias term $\frac{1}{n}\sum (2x_i)^2 = \frac{4}{n}\sum x_i^2 \approx 1.47$ to both errors.

#### Code

The fits use a Legendre polynomial basis, which keeps the normal equations well conditioned up to degree 9.

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

vector<double> legendre(double x, int p) {       // P0..P(p-1) at x
    vector<double> P(p);
    P[0] = 1;
    if (p > 1) P[1] = x;
    for (int k = 2; k < p; ++k) P[k] = ((2 * k - 1) * x * P[k - 1] - (k - 1) * P[k - 2]) / k;
    return P;
}

vector<double> solve(vector<vector<double>> a, vector<double> b) {   // Gaussian elimination
    int n = int(b.size());
    for (int c = 0; c < n; ++c) {
        int piv = c;
        for (int r = c + 1; r < n; ++r) if (fabs(a[r][c]) > fabs(a[piv][c])) piv = r;
        swap(a[c], a[piv]), swap(b[c], b[piv]);
        for (int r = c + 1; r < n; ++r) {
            double f = a[r][c] / a[c][c];
            for (int k = c; k < n; ++k) a[r][k] -= f * a[c][k];
            b[r] -= f * b[c];
        }
    }
    vector<double> x(n);
    for (int r = n - 1; r >= 0; --r) {
        double s = b[r];
        for (int k = r + 1; k < n; ++k) s -= a[r][k] * x[k];
        x[r] = s / a[r][r];
    }
    return x;
}

int main() {
    const int n = 20, reps = 20000;
    vector<double> xs(n);
    for (int i = 0; i < n; ++i) xs[i] = -1 + 2.0 * i / (n - 1);
    printf("degree  train MSE  (exact)   test MSE  (exact)\n");
    for (int d : {0, 1, 3, 5, 9}) {
        int p = d + 1;
        vector<vector<double>> basis(n);
        for (int i = 0; i < n; ++i) basis[i] = legendre(xs[i], p);
        double train = 0, test = 0;
        for (int r = 0; r < reps; ++r) {
            vector<double> y(n);
            for (int i = 0; i < n; ++i) y[i] = 1 + 2 * xs[i] + normal();
            vector<vector<double>> A(p, vector<double>(p));
            vector<double> rhs(p);
            for (int i = 0; i < n; ++i)
                for (int j = 0; j < p; ++j) {
                    rhs[j] += basis[i][j] * y[i];
                    for (int k = 0; k < p; ++k) A[j][k] += basis[i][j] * basis[i][k];
                }
            auto beta = solve(A, rhs);
            for (int i = 0; i < n; ++i) {
                double fit = 0;
                for (int j = 0; j < p; ++j) fit += beta[j] * basis[i][j];
                double fresh = 1 + 2 * xs[i] + normal();
                train += (y[i] - fit) * (y[i] - fit) / (n * reps);
                test += (fresh - fit) * (fresh - fit) / (n * reps);
            }
        }
        double bias = 0;
        if (d == 0) for (double x : xs) bias += 4 * x * x / n;   // a constant misses 2x
        printf("%4d    %.4f     (%.4f)  %.4f    (%.4f)\n", d, train,
               (n - p) / double(n) + bias, test, (n + p) / double(n) + bias);
    }
}
```

Output:

```text
degree  train MSE  (exact)   test MSE  (exact)
   0    2.4213     (2.4237)  2.5316    (2.5237)
   1    0.8971     (0.9000)  1.0986    (1.1000)
   3    0.7979     (0.8000)  1.2047    (1.2000)
   5    0.7000     (0.7000)  1.3012    (1.3000)
   9    0.4982     (0.5000)  1.4986    (1.5000)
```

Every simulated error is within 0.01 of the exact formula. From degree 1 to degree 9 the training error falls from 0.90 to 0.50 while the test error climbs from 1.10 to 1.50; the constant model is worst on both counts because of its bias.

#### Pitfalls

- **Judging by training error**, or by $R^2$ on the data used to fit.
- **Tuning on the test set**: choosing complexity by test error turns the test set into training data; keep a final holdout or use cross-validation.
- **More data helps variance, not bias**: a model too simple for the pattern stays wrong however much data you add.

Connects to: [linear regression](#/concept/prob.learning.linear-regression), [regularization](#/concept/prob.learning.regularization), [cross-validation and backtesting pitfalls](#/concept/prob.learning.cross-validation-and-backtesting-pitfalls).

### questions
Q: What is overfitting?
A: When a model fits the noise in its training data along with the signal, so it looks accurate in-sample but predicts new data poorly. Training error keeps falling as flexibility grows while test error eventually rises.

Q: State the bias-variance decomposition.
A: The expected squared prediction error at a point equals the squared bias of the model's average prediction, plus the variance of the prediction across training sets, plus the irreducible noise variance.

Q: For a correctly specified linear model with p parameters fit to n points, what are the expected training and test errors?
A: The training error averages sigma squared times n minus p over n and the error on fresh noise at the same inputs averages sigma squared times n plus p over n. Each extra parameter lowers the first and raises the second.

Q: How do you reduce overfitting?
A: Use more data, a simpler model, regularization such as ridge or lasso, and choose complexity by cross-validation or a validation set rather than training error; for iterative methods, stop early.

Q: Why is overfitting especially dangerous in quantitative finance?
A: Returns are noisy and real signals are weak, so flexible models and many trial strategies easily find patterns that are pure noise and vanish out of sample.

## prob.learning.regularization
name: "Regularization"
importance: important
prereqs: [prob.learning.overfitting-and-the-bias-variance-trade-off]
scope: "ridge and lasso intuition"

### simple
Regularization keeps a model from overfitting by charging a penalty for large coefficients, so the model only uses an input strongly when the data clearly support it. Ridge regression shrinks all coefficients a little; lasso shrinks too, and pushes some all the way to zero, dropping those inputs. A little deliberate bias buys a big cut in variance.

### interview
- **Ridge** (L2): minimize $\sum (y_i - x_i^\top\beta)^2 + \lambda\sum_j \beta_j^2$; solution $\hat\beta = (X^\top X + \lambda I)^{-1}X^\top y$, always well defined, coefficients shrink smoothly toward 0.
- **Lasso** (L1): penalty $\lambda\sum_j |\beta_j|$; no closed form in general, but it sets small coefficients **exactly** to 0, doing variable selection. Solved by coordinate descent with soft-thresholding.
- With orthonormal inputs ($X^\top X = I$): ridge gives $\frac{\hat\beta^{\text{OLS}}}{1 + \lambda}$; lasso gives $\text{sign}(\hat\beta^{\text{OLS}})\max(|\hat\beta^{\text{OLS}}| - \frac{\lambda}{2}, 0)$.
- Choose $\lambda$ by cross-validation; **standardize** inputs first so the penalty treats them equally; don't penalize the intercept.
- Ridge handles many correlated inputs well (it spreads weight); lasso picks one of a correlated group somewhat arbitrarily. Elastic net mixes both.
- Bayesian view: ridge is a normal prior on coefficients, lasso a Laplace prior.

### deep
#### Exact formulas in the orthonormal case

If the input columns are orthonormal, least squares gives $\hat\beta^{\text{OLS}} = X^\top y$, and the penalized problems separate by coefficient. Minimizing $(\beta_j - b_j)^2 + \lambda\beta_j^2$ gives $\frac{b_j}{1+\lambda}$; minimizing $(\beta_j - b_j)^2 + \lambda|\beta_j|$ gives the soft threshold. So with $\lambda = 1$ and OLS coefficients $(3, 0.4, -1.2)$, ridge returns $(1.5, 0.2, -0.6)$ and lasso $(2.5, 0, -0.7)$.

#### Worked example: many inputs, few matter

Twenty inputs, only three with real effects (2, −1.5 and 1), noise $\sigma = 1$, and just 30 training points. Least squares fits 20 coefficients from 30 points and overfits badly; ridge and lasso trade a little bias for much less variance. The program measures average test error over many simulated data sets; these are estimates, not exact values.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}
using Mat = vector<vector<double>>;

vector<double> ridge(const Mat& X, const vector<double>& y, double lambda) {
    int n = int(X.size()), p = int(X[0].size());
    Mat a(p, vector<double>(p + 1));             // augmented normal equations
    for (int j = 0; j < p; ++j) {
        for (int k = 0; k < p; ++k)
            for (int i = 0; i < n; ++i) a[j][k] += X[i][j] * X[i][k];
        a[j][j] += lambda;
        for (int i = 0; i < n; ++i) a[j][p] += X[i][j] * y[i];
    }
    for (int c = 0; c < p; ++c)                  // Gauss-Jordan (positive definite: no pivoting)
        for (int r = 0; r < p; ++r) {
            if (r == c) continue;
            double f = a[r][c] / a[c][c];
            for (int k = c; k <= p; ++k) a[r][k] -= f * a[c][k];
        }
    vector<double> b(p);
    for (int j = 0; j < p; ++j) b[j] = a[j][p] / a[j][j];
    return b;
}

vector<double> lasso(const Mat& X, const vector<double>& y, double lambda) {
    int n = int(X.size()), p = int(X[0].size());
    vector<double> b(p, 0), r = y;               // r = residuals y - X b
    for (int sweep = 0; sweep < 200; ++sweep)    // coordinate descent
        for (int j = 0; j < p; ++j) {
            double rho = 0, norm = 0;
            for (int i = 0; i < n; ++i) {
                rho += X[i][j] * (r[i] + X[i][j] * b[j]);
                norm += X[i][j] * X[i][j];
            }
            double nb = copysign(max(fabs(rho) - lambda / 2, 0.0), rho) / norm;   // soft threshold
            for (int i = 0; i < n; ++i) r[i] -= X[i][j] * (nb - b[j]);
            b[j] = nb;
        }
    return b;
}

int main() {
    Mat Q = {{1, 0, 0}, {0, 1, 0}, {0, 0, 1}};   // orthonormal design: y equals the OLS fit
    vector<double> yq = {3, 0.4, -1.2};
    auto rq = ridge(Q, yq, 1), lq = lasso(Q, yq, 1);
    printf("orthonormal, lambda 1: ridge (%.2f, %.2f, %.2f), lasso (%.2f, %.2f, %.2f)\n", rq[0],
           rq[1], rq[2], lq[0], lq[1], lq[2]);

    const int p = 20, n = 30, reps = 400;
    vector<double> truth(p, 0);
    truth[0] = 2, truth[1] = -1.5, truth[2] = 1;
    double err[4] = {}, zeros = 0;
    const char* names[] = {"least squares", "ridge, lambda 5", "lasso, lambda 10",
                           "true coefficients"};
    for (int r = 0; r < reps; ++r) {
        Mat X(n, vector<double>(p));
        vector<double> y(n);
        for (int i = 0; i < n; ++i) {
            for (double& v : X[i]) v = normal();
            y[i] = normal();
            for (int j = 0; j < p; ++j) y[i] += truth[j] * X[i][j];
        }
        vector<double> fits[4] = {ridge(X, y, 0), ridge(X, y, 5), lasso(X, y, 10), truth};
        for (int j = 0; j < p; ++j) zeros += fits[2][j] == 0;
        for (int k = 0; k < 4; ++k) {            // test error for new x: 1 + |b - truth|^2
            double d = 1;
            for (int j = 0; j < p; ++j) d += (fits[k][j] - truth[j]) * (fits[k][j] - truth[j]);
            err[k] += d / reps;
        }
    }
    for (int k = 0; k < 4; ++k) printf("%-18s average test MSE %.3f\n", names[k], err[k]);
    printf("lasso set %.1f of the 17 useless coefficients to exactly zero, on average\n",
           zeros / reps);
}
```

Output:

```text
orthonormal, lambda 1: ridge (1.50, 0.20, -0.60), lasso (2.50, 0.00, -0.70)
least squares      average test MSE 3.295
ridge, lambda 5    average test MSE 2.400
lasso, lambda 10   average test MSE 1.451
true coefficients  average test MSE 1.000
lasso set 11.9 of the 17 useless coefficients to exactly zero, on average
```

The orthonormal case reproduces the formulas exactly. In the simulation (400 data sets, so these are estimates), least squares has an average test error of 3.3 against the ideal 1.0; ridge cuts it to 2.4 and lasso to 1.45, setting 11.9 of the 17 useless coefficients to exactly zero on average. With so few observations per coefficient, shrinkage wins clearly.

#### Pitfalls

- **Unscaled inputs**: a penalty on coefficients depends on the inputs' units; standardize first.
- **Choosing $\lambda$ on the test set**: use cross-validation on the training data.
- **Reading lasso's zeros as proof of no effect**: with correlated inputs, which one survives is partly luck.

Connects to: [overfitting and the bias-variance trade-off](#/concept/prob.learning.overfitting-and-the-bias-variance-trade-off), [linear regression](#/concept/prob.learning.linear-regression), [cross-validation and backtesting pitfalls](#/concept/prob.learning.cross-validation-and-backtesting-pitfalls).

### questions
Q: What is the difference between ridge and lasso regression?
A: Ridge adds a penalty proportional to the sum of squared coefficients and shrinks all of them smoothly toward zero; lasso penalizes the sum of absolute values and sets some coefficients exactly to zero, selecting variables. Ridge has a closed-form solution; lasso is solved iteratively.

Q: Why does regularization improve predictions even though it biases the coefficients?
A: It reduces the variance of the estimates by much more than it adds in squared bias, especially with many inputs or few observations, so the expected prediction error falls.

Q: With orthonormal inputs, what do ridge and lasso do to the least squares coefficients?
A: Ridge divides each coefficient by 1 plus lambda. Lasso subtracts lambda over 2 from each coefficient's absolute value and sets it to zero if that would cross zero, a soft threshold.

Q: How should you choose the regularization strength?
A: By cross-validation on the training data: try a range of values and pick the one with the lowest validation error, often the largest value within one standard error of the best.

Q: Why should inputs be standardized before ridge or lasso?
A: The penalty depends on the size of each coefficient, which depends on the input's units; without standardizing, inputs measured in small units are penalized more heavily for the same effect.

## prob.learning.time-series-basics
name: "Time series basics"
importance: advanced
scope: "stationarity, autocorrelation, mean reversion"

### simple
A time series is data recorded in order over time, like daily prices or hourly temperatures, where today's value is usually related to yesterday's. Stationary series keep the same average and spread over time and tend to wander back to their mean; random walks drift anywhere. Knowing which kind you have decides which models and statistics make sense.

### interview
- **Stationarity** (weak): constant mean, constant variance, and correlation between $x_t$ and $x_{t+k}$ depending only on the lag $k$.
- **Autocorrelation** $\rho(k) = \text{Corr}(x_t, x_{t+k})$ measures memory; the ACF plot shows it by lag.
- **AR(1)**: $x_t = \phi x_{t-1} + \varepsilon_t$ with $|\phi| < 1$ is stationary with variance $\frac{\sigma^2}{1 - \phi^2}$ and $\rho(k) = \phi^k$: shocks fade geometrically. **Mean reversion half-life**: $\frac{\ln 0.5}{\ln \phi}$ steps.
- $\phi = 1$ is a **random walk**: not stationary, variance grows with time; differences are stationary. Prices are close to random walks; returns are close to stationary.
- Regressing one random walk on another gives **spurious** high $R^2$; work with differences or test for cointegration.
- Tests and tools: augmented Dickey-Fuller for a unit root, ACF and PACF for order selection, ARIMA and GARCH models.

### deep
#### AR(1) facts

With $x_t = \phi x_{t-1} + \varepsilon_t$ and white noise of variance $\sigma^2$, stationarity requires $\text{Var}(x_t) = \phi^2\text{Var}(x_{t-1}) + \sigma^2$ to have a fixed point: $\frac{\sigma^2}{1 - \phi^2}$, finite only when $|\phi| < 1$. Multiplying the equation by $x_{t-k}$ and taking expectations gives $\rho(k) = \phi\rho(k-1)$, so $\rho(k) = \phi^k$.

For $\phi = 0.9$ and $\sigma = 1$: variance $\frac{1}{0.19} \approx 5.263$, $\rho(1) = 0.9$, $\rho(5) = 0.9^5 \approx 0.5905$, half-life $\frac{\ln 0.5}{\ln 0.9} \approx 6.58$ steps.

#### Code: estimates from one long simulated series

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}

double autocorr(const vector<double>& x, int k) {
    double m = accumulate(x.begin(), x.end(), 0.0) / x.size(), num = 0, den = 0;
    for (size_t t = 0; t < x.size(); ++t) {
        den += (x[t] - m) * (x[t] - m);
        if (t + k < x.size()) num += (x[t] - m) * (x[t + k] - m);
    }
    return num / den;
}

int main() {
    const double phi = 0.9;
    const int n = 2'000'000;
    vector<double> x(n);
    x[0] = normal() / sqrt(1 - phi * phi);       // start in the stationary distribution
    for (int t = 1; t < n; ++t) x[t] = phi * x[t - 1] + normal();
    double m = accumulate(x.begin(), x.end(), 0.0) / n, v = 0;
    for (double a : x) v += (a - m) * (a - m) / n;
    printf("AR(1), phi 0.9: variance %.4f (exact %.4f)\n", v, 1 / (1 - phi * phi));
    for (int k : {1, 2, 5, 10})
        printf("  autocorrelation at lag %2d: %.4f (exact %.4f)\n", k, autocorr(x, k),
               pow(phi, k));
    printf("  half-life: %.2f steps\n", log(0.5) / log(phi));

    // Two independent random walks: regress one on the other, many times.
    const int len = 500, reps = 2000;
    int spurious = 0;
    double r2sum = 0;
    for (int r = 0; r < reps; ++r) {
        double a = 0, b = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
        for (int t = 0; t < len; ++t) {
            a += normal(), b += normal();
            sa += a, sb += b, saa += a * a, sbb += b * b, sab += a * b;
        }
        double cov = sab / len - sa * sb / (1.0 * len * len);
        double r2 = cov * cov / ((saa / len - sa * sa / (1.0 * len * len)) *
                                 (sbb / len - sb * sb / (1.0 * len * len)));
        r2sum += r2;
        spurious += r2 > 0.2;
    }
    printf("independent random walks: average R^2 %.3f; R^2 above 0.2 in %.1f%% of pairs\n",
           r2sum / reps, 100.0 * spurious / reps);
}
```

Output:

```text
AR(1), phi 0.9: variance 5.2601 (exact 5.2632)
  autocorrelation at lag  1: 0.9000 (exact 0.9000)
  autocorrelation at lag  2: 0.8100 (exact 0.8100)
  autocorrelation at lag  5: 0.5904 (exact 0.5905)
  autocorrelation at lag 10: 0.3485 (exact 0.3487)
  half-life: 6.58 steps
independent random walks: average R^2 0.244; R^2 above 0.2 in 47.5% of pairs
```

One series of two million steps reproduces the variance to within 0.1% and every autocorrelation to three decimals. The last line is the spurious regression problem: independent random walks of 500 steps give an average $R^2$ of 0.24, and nearly half the pairs show $R^2$ above 0.2 (an estimate from 2,000 simulated pairs).

#### Pitfalls

- **Treating prices as stationary**: means and correlations of price levels are meaningless over time; use returns.
- **Spurious regression**: as the last line shows, unrelated random walks routinely look related.
- **Autocorrelated errors** make standard errors too small in regressions on time series; use robust (Newey-West) errors or model the dependence.
- **Mean reversion is not guaranteed**: a series that looked stationary in the past can break (regime changes).

Connects to: [random walks](#/concept/prob.markov.random-walks), [linear regression](#/concept/prob.learning.linear-regression), [cross-validation and backtesting pitfalls](#/concept/prob.learning.cross-validation-and-backtesting-pitfalls).

### questions
Q: What does it mean for a time series to be stationary?
A: In the weak sense, its mean and variance are constant over time and the correlation between two values depends only on how far apart they are, not on when. Most statistical tools for time series assume it.

Q: What are the variance and autocorrelations of a stationary AR(1) process?
A: With coefficient phi of absolute value below 1 and noise variance sigma squared, the variance is sigma squared over 1 minus phi squared and the autocorrelation at lag k is phi to the k.

Q: What is the half-life of mean reversion for an AR(1) process?
A: The number of steps for a deviation to halve on average: ln 0.5 divided by ln phi. For phi equal to 0.9 it is about 6.6 steps.

Q: Why is regressing one random walk on another dangerous?
A: Random walks wander, so two independent ones often trend together or apart by chance, producing large R squared and significant-looking slopes with no real relationship. Use differences, or test for cointegration.

Q: Are stock prices or stock returns closer to stationary?
A: Returns. Prices behave roughly like random walks with growing variance, while daily returns fluctuate around a roughly stable mean, although their volatility changes over time.

## prob.learning.cross-validation-and-backtesting-pitfalls
name: "Cross-validation and backtesting pitfalls"
importance: advanced
prereqs: [prob.learning.overfitting-and-the-bias-variance-trade-off]
scope: "look-ahead bias, data snooping"

### simple
Cross-validation estimates how well a model will do on new data by repeatedly hiding part of the data, training on the rest, and testing on the hidden part. Backtesting does the same for trading strategies by replaying history. Both are easy to fool: peeking at the future or trying hundreds of ideas and reporting the best makes random noise look like skill.

### interview
- **k-fold cross-validation**: split into $k$ folds, train on $k - 1$, test on the held-out fold, average; use it to choose complexity or $\lambda$, then refit on all training data.
- **Time series need time order**: use walk-forward validation (train on the past, test on the next period, roll forward); random folds leak the future into training.
- **Look-ahead bias**: using information not available at decision time (revised data, future index membership, same-day close to trade at that close).
- **Data snooping and multiple testing**: the best of many strategies tested on the same data has an inflated in-sample result; the expected maximum of 200 pure-noise Sharpe ratios is large.
- **Survivorship bias**: testing only on assets that still exist today excludes the failures.
- Remedies: a final untouched holdout, adjusting for the number of trials (deflated Sharpe ratio), realistic costs and delays, and paper trading.

### deep
#### Why the best of many noise strategies looks good

Suppose each of $m$ strategies has zero true edge, and its in-sample annualized Sharpe ratio over a year of daily data is approximately standard normal. The best one's expected Sharpe is $E[\max_{i \le m} Z_i] = \int x\, m\,\varphi(x)\Phi(x)^{m-1}\,dx$, about 2.75 for $m = 200$: an impressive number from pure noise, which then averages about zero out of sample.

#### Worked example: leaking the future

A random-fold cross-validation on a trending or autocorrelated series lets the model train on days right after the test days, so it "predicts" by interpolation. Walk-forward validation, with the training window strictly before the test window, gives the honest (worse) number.

#### Code

```cpp
mt19937_64 rng(2026);                            // fixed seed
double u01() { return (rng() >> 11) * 0x1.0p-53; }   // uniform on [0, 1)
double normal() {
    double u = 1 - u01(), v = u01();
    return sqrt(-2 * log(u)) * cos(2 * numbers::pi * v);
}
double Phi(double z) { return 0.5 * erfc(-z / sqrt(2.0)); }

double sharpe(const vector<double>& r) {         // annualized, from daily returns
    double m = 0, v = 0;
    for (double x : r) m += x / r.size();
    for (double x : r) v += (x - m) * (x - m) / (r.size() - 1);
    return m / sqrt(v) * sqrt(252.0);
}

int main() {
    const int m = 200;                           // exact E[max of 200 standard normals]
    double expMax = 0, h = 0.0005;
    for (double x = -8; x < 8; x += h) {
        double pdf = exp(-x * x / 2) / sqrt(2 * numbers::pi);
        expMax += x * m * pdf * pow(Phi(x), m - 1) * h;
    }
    printf("expected best of %d noise Sharpe ratios: %.4f\n", m, expMax);

    const int trials = 500, days = 252;
    double bestIn = 0, bestOut = 0;
    for (int t = 0; t < trials; ++t) {
        double best = -1e9, itsOut = 0;
        for (int s = 0; s < m; ++s) {            // each strategy: zero-mean daily returns
            vector<double> in(days), out(days);
            for (double& x : in) x = 0.01 * normal();
            for (double& x : out) x = 0.01 * normal();
            double sIn = sharpe(in);
            if (sIn > best) { best = sIn; itsOut = sharpe(out); }
        }
        bestIn += best / trials;
        bestOut += itsOut / trials;
    }
    printf("simulated: best in-sample Sharpe %.3f, the same strategy next year %.3f\n", bestIn,
           bestOut);
}
```

Output:

```text
expected best of 200 noise Sharpe ratios: 2.7460
simulated: best in-sample Sharpe 2.759, the same strategy next year -0.101
```

Numerical integration gives 2.746 for the expected best Sharpe ratio, and the best in-sample strategies in the simulation average 2.759. The same strategies the following year average $-0.10$, which is zero within about two standard errors for 500 trials: the in-sample star had no edge at all.

#### A backtest checklist

1. Could any input have been unknown at the decision time (look-ahead, revised data, point-in-time universe)?
2. Does the universe include delisted and failed assets (survivorship)?
3. How many variants were tried, and is the reported result adjusted for that?
4. Are costs, slippage, borrow fees and execution delays realistic?
5. Is there an untouched out-of-sample period, used once?

Connects to: [overfitting and the bias-variance trade-off](#/concept/prob.learning.overfitting-and-the-bias-variance-trade-off), [hypothesis testing](#/concept/prob.statistics.hypothesis-testing), [Sharpe ratio and risk-adjusted returns](#/concept/markets.pricing.sharpe-ratio-and-risk-adjusted-returns).

### questions
Q: How does k-fold cross-validation work?
A: Split the data into k parts; for each part, train on the other k minus 1 and measure error on the held-out part; average the k errors. It estimates out-of-sample performance and is used to choose model complexity or regularization strength.

Q: Why is ordinary k-fold cross-validation wrong for time series?
A: Random folds put future observations in the training set of past test points, leaking information and overstating accuracy. Walk-forward validation, training on the past and testing on the next period, respects time order.

Q: What is look-ahead bias?
A: Using information in a backtest that would not have been available at the time of the decision, such as revised economic data, today's index members or the closing price to decide a trade at that same close.

Q: Why is the best of many backtested strategies misleading?
A: Even with no real edge, the maximum of many noisy performance estimates is large: the best of 200 zero-edge strategies has an expected annual Sharpe ratio around 2.75. Out of sample it reverts toward zero, so results must be adjusted for the number of trials.

Q: What is survivorship bias in backtesting?
A: Testing on a universe of assets that still exist today, which excludes companies that went bankrupt or were delisted, making historical returns look better than an investor could actually have achieved.
