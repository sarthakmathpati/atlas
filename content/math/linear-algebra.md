---
topic: math.linear-algebra
name: "Linear algebra"
subject: math
order: 4
prereqs: []
---

## math.linear-algebra.vectors-and-matrices
name: "Vectors and matrices"
importance: important
scope: "operations, matrix multiplication"

### simple
A vector is a list of numbers, like the amounts you hold of three stocks. A matrix is a grid of numbers that transforms vectors, for example turning holdings into exposures to several risk factors. Multiplying matrices chains two transformations into one, and the order you chain them in matters.

### interview
- **Dot product** $u \cdot v = \sum u_i v_i = |u||v|\cos\theta$; zero means perpendicular. Projection of $v$ onto $u$: $\frac{u \cdot v}{u \cdot u}u$.
- **Matrix times vector**: $Ax$ is a combination of the columns of $A$ with weights $x_i$; entry $i$ is row $i$ dotted with $x$.
- **Matrix product**: $(AB)_{ij} = \sum_k A_{ik}B_{kj}$; an $m \times n$ times an $n \times p$ gives $m \times p$. It costs $O(mnp)$, so $O(n^3)$ for square matrices.
- $AB \ne BA$ in general, but the product is associative: $(AB)C = A(BC)$. Transpose reverses order: $(AB)^T = B^T A^T$.
- Powers by repeated squaring take $O(\log n)$ products; the Fibonacci numbers come from $\begin{pmatrix}1&1\\1&0\end{pmatrix}^n$.
- Portfolio math is matrix math: returns $w^T r$, variance $w^T \Sigma w$.

### deep
#### Intuition

Read $Ax$ column by column: $A$ sends the first basis vector to its first column, the second to its second column, and any $x$ to the same combination of columns. A product $AB$ means "apply $B$, then $A$", so its columns are $A$ applied to the columns of $B$. Doing two transformations in the other order is usually a different transformation, which is why $AB \ne BA$.

#### Worked example 1: order matters

With $A = \begin{pmatrix}1&2\\3&4\end{pmatrix}$ and the swap $B = \begin{pmatrix}0&1\\1&0\end{pmatrix}$:

$$AB = \begin{pmatrix}2&1\\4&3\end{pmatrix}, \qquad BA = \begin{pmatrix}3&4\\1&2\end{pmatrix}.$$

Multiplying by $B$ on the right swaps the columns of $A$; on the left it swaps the rows.

#### Worked example 2: angle and projection

For $u = (1, 2, 2)$ and $v = (2, 0, 1)$: $u \cdot v = 4$, $|u| = 3$, $|v| = \sqrt{5}$, so $\cos\theta = \frac{4}{3\sqrt{5}} \approx 0.596$ and $\theta \approx 53.4°$. The projection of $v$ onto $u$ is $\frac{4}{9}(1, 2, 2)$.

#### Worked example 3: Fibonacci by matrix powers

$\begin{pmatrix}1&1\\1&0\end{pmatrix}\begin{pmatrix}F_{n}\\F_{n-1}\end{pmatrix} = \begin{pmatrix}F_{n+1}\\F_{n}\end{pmatrix}$, so $M^n = \begin{pmatrix}F_{n+1}&F_n\\F_n&F_{n-1}\end{pmatrix}$, and repeated squaring finds $F_{90}$ with 10 matrix products instead of 89 additions (useful when the entries are taken mod a number and $n$ is huge).

#### Checking in code

```cpp
using Mat = array<array<long long, 2>, 2>;

Mat mul(const Mat& a, const Mat& b) {
    Mat c{};
    for (int i = 0; i < 2; ++i)
        for (int j = 0; j < 2; ++j)
            for (int k = 0; k < 2; ++k) c[i][j] += a[i][k] * b[k][j];
    return c;
}

int products = 0;
Mat power(Mat m, int n) {
    Mat r{{{1, 0}, {0, 1}}};
    while (n > 0) {
        if (n & 1) r = mul(r, m), ++products;
        n >>= 1;
        if (n) m = mul(m, m), ++products;              // square only if bits remain
    }
    return r;
}

int main() {
    Mat A{{{1, 2}, {3, 4}}}, B{{{0, 1}, {1, 0}}};
    Mat ab = mul(A, B), ba = mul(B, A);
    printf("AB = [[%lld %lld] [%lld %lld]], BA = [[%lld %lld] [%lld %lld]]\n", ab[0][0],
           ab[0][1], ab[1][0], ab[1][1], ba[0][0], ba[0][1], ba[1][0], ba[1][1]);
    double u[3] = {1, 2, 2}, v[3] = {2, 0, 1}, uv = 0, uu = 0, vv = 0;
    for (int i = 0; i < 3; ++i) uv += u[i] * v[i], uu += u[i] * u[i], vv += v[i] * v[i];
    printf("u.v = %g, angle = %.1f degrees, projection = (%.3f, %.3f, %.3f)\n", uv,
           acos(uv / sqrt(uu * vv)) * 180 / acos(-1.0), uv / uu * u[0], uv / uu * u[1],
           uv / uu * u[2]);
    long long a = 0, b = 1;                            // F(0), F(1)
    for (int i = 0; i < 90; ++i) tie(a, b) = pair(b, a + b);
    Mat f = power(Mat{{{1, 1}, {1, 0}}}, 90);
    printf("F(90) by loop %lld, by matrix power %lld, using %d products\n", a, f[0][1], products);
}
```

Output:

```text
AB = [[2 1] [4 3]], BA = [[3 4] [1 2]]
u.v = 4, angle = 53.4 degrees, projection = (0.444, 0.889, 0.889)
F(90) by loop 2880067194370816120, by matrix power 2880067194370816120, using 10 products
```

The loop and the matrix power agree on $F_{90}$, the largest Fibonacci values here fit in 64 bits ($F_{92}$ is the last that does), and the squaring stops before it would compute a power it doesn't need, which would overflow.

#### Common mistakes

- **Shape mismatch**: $AB$ needs the columns of $A$ to match the rows of $B$.
- **Assuming commutativity**: $(A + B)^2 = A^2 + AB + BA + B^2$, not $A^2 + 2AB + B^2$.
- **Transpose order**: $(AB)^T = B^T A^T$.

Connects to: [determinants and inverses](#/concept/math.linear-algebra.determinants-and-inverses), [covariance matrices](#/concept/math.linear-algebra.covariance-matrices), [fast exponentiation](#/concept/dsa.math.fast-exponentiation).

### questions
Q: What are the dimensions and cost of multiplying an m by n matrix by an n by p matrix?
A: The result is m by p, and each of its m times p entries is a dot product of length n, so the cost is m times n times p multiplications, which is n cubed for square matrices.

Q: Is matrix multiplication commutative?
A: No. AB means apply B then A, and the reverse order is usually a different map; with a swap matrix B, AB swaps the columns of A while BA swaps its rows. It is associative, though.

Q: How can matrix powers compute Fibonacci numbers quickly?
A: The matrix with rows (1, 1) and (1, 0), raised to the n-th power, holds F(n + 1), F(n) and F(n - 1). Repeated squaring computes the power with about 2 log n matrix products, which is fast even for huge n with entries taken mod a number.

Q: What does the dot product tell you about two vectors?
A: It equals the product of their lengths and the cosine of the angle between them. Zero means they are perpendicular, and dividing by the lengths gives the cosine, like a correlation of two centered data vectors.

## math.linear-algebra.determinants-and-inverses
name: "Determinants and inverses"
importance: important
prereqs: [math.linear-algebra.vectors-and-matrices]
scope: "when a matrix is invertible"

### simple
The determinant of a matrix says how much it stretches area or volume. If it is zero, the matrix squashes space flat, some information is lost, and the transformation can't be undone. If it isn't zero, there is an inverse matrix that undoes it, and systems of equations with that matrix have exactly one solution.

### interview
- $2 \times 2$: $\det\begin{pmatrix}a&b\\c&d\end{pmatrix} = ad - bc$ and $A^{-1} = \frac{1}{ad - bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}$.
- $|\det A|$ is the area (volume) scale factor; the sign says whether orientation flips.
- **Invertible** $\iff \det A \ne 0 \iff$ columns independent $\iff Ax = 0$ only for $x = 0 \iff$ no eigenvalue is 0 $\iff Ax = b$ has exactly one solution.
- $\det(AB) = \det A \det B$, $\det A^T = \det A$, $\det A^{-1} = \frac{1}{\det A}$; swapping two rows flips the sign.
- Compute larger ones by elimination (the product of the pivots, $O(n^3)$), not by cofactor expansion ($O(n!)$).
- In practice solve $Ax = b$ by elimination rather than forming $A^{-1}$.

### deep
#### Intuition

A $2 \times 2$ matrix sends the unit square to the parallelogram spanned by its columns, whose area is $|ad - bc|$. Every shape's area scales by the same factor. If the columns are parallel, the parallelogram is flat, the area factor is 0, two different inputs land on the same output, and no inverse can tell them apart.

#### Worked example: a 3 by 3 matrix

$$A = \begin{pmatrix}2&1&1\\1&3&2\\1&0&0\end{pmatrix}$$

Expand along the last row (it has two zeros): $\det A = 1 \cdot \det\begin{pmatrix}1&1\\3&2\end{pmatrix} = 2 - 3 = -1$. Since it isn't 0, $A$ is invertible. The inverse is the transposed matrix of cofactors divided by the determinant:

$$A^{-1} = \begin{pmatrix}0&0&1\\-2&1&3\\3&-1&-5\end{pmatrix}.$$

Because $\det A = \pm 1$ and the entries are integers, the inverse has integer entries too. To solve $Ax = b$ with $b = (7, 13, 1)$: $x = A^{-1}b = (1, 2, 3)$, and indeed $2 + 2 + 3 = 7$, $1 + 6 + 6 = 13$, $1 = 1$.

A singular example: $\begin{pmatrix}1&2\\2&4\end{pmatrix}$ has determinant $4 - 4 = 0$; its second column is twice the first, and $Ax = (1, 2)$ has infinitely many solutions while $Ax = (1, 0)$ has none.

#### Checking with exact elimination

Gauss-Jordan elimination with fractions reduces $[A \mid I]$ to $[I \mid A^{-1}]$; the determinant is the product of the pivots, with a sign flip for every row swap.

```cpp
struct Q {                                           // exact rational number
    long long p, q;
    Q(long long a = 0, long long b = 1) : p(a), q(b) {
        if (q < 0) p = -p, q = -q;
        long long g = gcd(llabs(p), q);
        if (g) p /= g, q /= g;
    }
    Q operator+(Q o) const { return Q(p * o.q + o.p * q, q * o.q); }
    Q operator-(Q o) const { return Q(p * o.q - o.p * q, q * o.q); }
    Q operator*(Q o) const { return Q(p * o.p, q * o.q); }
    Q operator/(Q o) const { return Q(p * o.q, q * o.p); }
};

int main() {
    const int n = 3;
    vector<vector<Q>> m = {{2, 1, 1, 1, 0, 0}, {1, 3, 2, 0, 1, 0}, {1, 0, 0, 0, 0, 1}};
    Q det = 1;
    for (int c = 0; c < n; ++c) {
        int r = c;
        while (m[r][c].p == 0) ++r;                  // a nonzero pivot (A is invertible)
        if (r != c) swap(m[r], m[c]), det = det * Q(-1);
        det = det * m[c][c];
        Q piv = m[c][c];
        for (auto& x : m[c]) x = x / piv;
        for (int i = 0; i < n; ++i)
            if (i != c) {
                Q f = m[i][c];
                for (int j = 0; j < 2 * n; ++j) m[i][j] = m[i][j] - f * m[c][j];
            }
    }
    printf("det = %lld\ninverse:\n", det.p);
    for (auto& row : m) printf("  %3lld %3lld %3lld\n", row[3].p, row[4].p, row[5].p);
    long long b[3] = {7, 13, 1};
    printf("x = A^-1 b =");
    for (int i = 0; i < n; ++i) {
        Q s = 0;
        for (int j = 0; j < n; ++j) s = s + m[i][n + j] * Q(b[j]);
        printf(" %lld", s.p);
    }
    printf("\ndet of [[1 2] [2 4]] = %d\n", 1 * 4 - 2 * 2);
}
```

Output:

```text
det = -1
inverse:
    0   0   1
   -2   1   3
    3  -1  -5
x = A^-1 b = 1 2 3
det of [[1 2] [2 4]] = 0
```

Elimination with exact fractions gives the same determinant and inverse as the cofactor calculation, and the solution $(1, 2, 3)$.

#### Common mistakes

- **Cofactor signs**: they alternate in a checkerboard, starting with $+$ at the top left.
- **Forgetting to transpose** the cofactor matrix when forming the inverse.
- **Testing invertibility with floating point**: a determinant of $10^{-17}$ may be a rounded zero; use exact arithmetic or look at the condition number.

Connects to: [vectors and matrices](#/concept/math.linear-algebra.vectors-and-matrices), [eigenvalues and eigenvectors](#/concept/math.linear-algebra.eigenvalues-and-eigenvectors), [linear regression](#/concept/prob.learning.linear-regression).

### questions
Q: When is a square matrix invertible?
A: Exactly when its determinant is nonzero. Equivalently its columns are linearly independent, Ax = 0 only for x = 0, zero is not an eigenvalue, and Ax = b has exactly one solution for every b.

Q: What does the determinant mean geometrically?
A: Its absolute value is the factor by which the matrix scales areas (in 2D) or volumes (in 3D), and its sign says whether orientation is flipped. Zero means space is squashed into a lower dimension.

Q: What is the inverse of a 2 by 2 matrix with rows (a, b) and (c, d)?
A: One over (ad - bc) times the matrix with rows (d, -b) and (-c, a): swap the diagonal entries, negate the off-diagonal ones and divide by the determinant.

Q: Why compute determinants by elimination rather than cofactor expansion?
A: Cofactor expansion takes a number of steps that grows like n factorial, while elimination takes about n cubed: the determinant is the product of the pivots, with a sign change for each row swap.

## math.linear-algebra.eigenvalues-and-eigenvectors
name: "Eigenvalues and eigenvectors"
importance: important
prereqs: [math.linear-algebra.determinants-and-inverses]
scope: "meaning and computation for 2x2"

### simple
Most vectors change direction when a matrix acts on them, but a few special ones only get stretched or shrunk. Those are the eigenvectors, and the stretch factors are the eigenvalues. Knowing them tells you what the matrix does in the long run, like which direction a repeated process settles into.

### interview
- $Av = \lambda v$ with $v \ne 0$. Eigenvalues solve $\det(A - \lambda I) = 0$.
- $2 \times 2$: $\lambda^2 - (\operatorname{tr} A)\lambda + \det A = 0$, so the eigenvalues add to the trace and multiply to the determinant.
- Symmetric matrices have real eigenvalues and perpendicular eigenvectors; covariance matrices are symmetric with eigenvalues $\ge 0$.
- **Diagonalization**: $A = PDP^{-1}$ with eigenvectors in $P$, so $A^n = PD^nP^{-1}$; the largest eigenvalue dominates $A^n$.
- **Power iteration**: multiply a vector by $A$ repeatedly and normalize; it converges to the top eigenvector at rate $|\lambda_2 / \lambda_1|$.
- Uses: Markov chain stationary distributions (eigenvalue 1), PCA, growth rates of linear recurrences (Fibonacci grows like the golden ratio $\approx 1.618$).

### deep
#### Intuition

Write any vector in the eigenvector basis. Applying $A$ multiplies each coordinate by its eigenvalue, so applying it $n$ times multiplies by $\lambda^n$. The coordinate with the largest $|\lambda|$ soon dominates, and every starting vector swings toward that eigenvector. That is why eigenvalues describe long-run behavior.

#### Worked example

$A = \begin{pmatrix}4&1\\2&3\end{pmatrix}$ has trace 7 and determinant 10, so $\lambda^2 - 7\lambda + 10 = (\lambda - 5)(\lambda - 2) = 0$.

- $\lambda = 5$: $(A - 5I)v = 0$ reads $-v_1 + v_2 = 0$, so $v = (1, 1)$. Check: $A(1, 1) = (5, 5)$.
- $\lambda = 2$: $2v_1 + v_2 = 0$, so $v = (1, -2)$. Check: $A(1, -2) = (2, -4)$.

Put the eigenvectors in the columns of $P$; then $A^n = PD^nP^{-1}$ with $D$ holding the eigenvalues:

$$P = \begin{pmatrix}1&1\\1&-2\end{pmatrix}, \qquad D^n = \begin{pmatrix}5^n&0\\0&2^n\end{pmatrix},$$

which works out to

$$A^n = \frac{1}{3}\begin{pmatrix}2 \cdot 5^n + 2^n & 5^n - 2^n\\ 2 \cdot 5^n - 2 \cdot 2^n & 5^n + 2 \cdot 2^n\end{pmatrix}.$$

At $n = 1$ this gives back $A$. Power iteration from $(1, 0)$ approaches the direction $(1, 1)$, with the error shrinking by $\frac{2}{5}$ per step.

#### Checking in code

```cpp
int main() {
    long long A[2][2] = {{4, 1}, {2, 3}}, P[2][2] = {{1, 0}, {0, 1}};
    for (int k = 0; k < 10; ++k) {                   // A^10 by multiplication
        long long t[2][2] = {};
        for (int i = 0; i < 2; ++i)
            for (int j = 0; j < 2; ++j)
                for (int m = 0; m < 2; ++m) t[i][j] += P[i][m] * A[m][j];
        memcpy(P, t, sizeof t);
    }
    long long f = 9765625, g = 1024;                 // 5^10 and 2^10
    printf("A^10 by multiplying: %lld %lld / %lld %lld\n", P[0][0], P[0][1], P[1][0], P[1][1]);
    printf("A^10 by formula:     %lld %lld / %lld %lld\n", (2 * f + g) / 3, (f - g) / 3,
           (2 * f - 2 * g) / 3, (f + 2 * g) / 3);
    double x = 1, y = 0, lambda = 0;
    for (int k = 1; k <= 20; ++k) {                  // power iteration
        double nx = 4 * x + y, ny = 2 * x + 3 * y;
        lambda = (nx * x + ny * y) / (x * x + y * y); // Rayleigh quotient
        double len = hypot(nx, ny);
        x = nx / len, y = ny / len;
        if (k == 1 || k == 5 || k == 10 || k == 20)
            printf("step %2d: direction (%.6f, %.6f), estimate %.6f\n", k, x, y, lambda);
    }
    printf("Fibonacci growth: F(41)/F(40) = %.9f, golden ratio %.9f\n",
           165580141.0 / 102334155.0, (1 + sqrt(5.0)) / 2);
}
```

Output:

```text
A^10 by multiplying: 6510758 3254867 / 6509734 3255891
A^10 by formula:     6510758 3254867 / 6509734 3255891
step  1: direction (0.894427, 0.447214), estimate 4.000000
step  5: direction (0.712530, 0.701641), estimate 5.018197
step 10: direction (0.707162, 0.707051), estimate 5.000197
step 20: direction (0.707107, 0.707107), estimate 5.000000
Fibonacci growth: F(41)/F(40) = 1.618033989, golden ratio 1.618033989
```

The diagonalization formula matches direct multiplication exactly, and power iteration settles on the direction $(1, 1)/\sqrt{2} \approx (0.7071, 0.7071)$ with eigenvalue 5: the estimate is off by 0.018 after 5 steps and 0.0002 after 10, close to the predicted factor $(2/5)^5 \approx 0.01$, and agrees to six decimals after 20.

#### Common mistakes

- **Forgetting $v \ne 0$**: the zero vector satisfies $Av = \lambda v$ for every $\lambda$ and doesn't count.
- **Assuming real eigenvalues**: a rotation matrix has complex ones; symmetric matrices are the safe case.
- **Repeated eigenvalues**: $\begin{pmatrix}1&1\\0&1\end{pmatrix}$ has only one eigenvector direction and can't be diagonalized.

Connects to: [determinants and inverses](#/concept/math.linear-algebra.determinants-and-inverses), [PCA intuition](#/concept/math.linear-algebra.pca-intuition), [stationary distributions](#/concept/prob.markov.stationary-distributions). Practice: [Largest eigenvalue](#/problems/q-eigenvalue).

### questions
Q: How do you find the eigenvalues of a 2 by 2 matrix quickly?
A: Solve lambda squared minus trace times lambda plus determinant equals zero. The eigenvalues add up to the trace and multiply to the determinant, which is a quick check.

Q: What are the eigenvalues and eigenvectors of the matrix with rows (4, 1) and (2, 3)?
A: The trace is 7 and the determinant 10, so the eigenvalues are 5 and 2. Their eigenvectors are (1, 1) and (1, -2).

Q: What does power iteration compute and how fast does it converge?
A: It finds the eigenvector of the eigenvalue largest in absolute value, by repeatedly multiplying a vector by the matrix and normalizing. The error shrinks by the ratio of the second-largest to the largest eigenvalue in each step.

Q: Why are eigenvalues useful for Markov chains?
A: A stationary distribution is a left eigenvector of the transition matrix with eigenvalue 1, and the second-largest eigenvalue in size controls how fast the chain approaches it.

## math.linear-algebra.covariance-matrices
name: "Covariance matrices"
importance: important
prereqs: [math.linear-algebra.vectors-and-matrices]
scope: "positive semidefinite, portfolio variance"

### simple
A covariance matrix records how much each asset's returns vary and how every pair moves together. With it, the risk of any portfolio is one short matrix calculation. It can never produce a negative variance, which also means not every table of correlations you might write down is possible.

### interview
- $\Sigma = E[(X - \mu)(X - \mu)^T]$: variances on the diagonal, covariances $\rho_{ij}\sigma_i\sigma_j$ off it; symmetric.
- **Portfolio variance**: $\operatorname{Var}(w^T X) = w^T \Sigma w$; for two assets, $w_1^2\sigma_1^2 + w_2^2\sigma_2^2 + 2w_1w_2\rho\sigma_1\sigma_2$.
- **Positive semidefinite**: $w^T\Sigma w \ge 0$ for all $w$, because it is a variance; equivalently all eigenvalues are $\ge 0$.
- A made-up correlation matrix may be invalid: three assets can't all have correlation $-0.6$ with each other.
- Two-asset minimum variance weight: $w_1 = \frac{\sigma_2^2 - \rho\sigma_1\sigma_2}{\sigma_1^2 + \sigma_2^2 - 2\rho\sigma_1\sigma_2}$.
- Simulate correlated returns with the Cholesky factor $L$ ($\Sigma = LL^T$): $X = \mu + LZ$ with independent standard normals $Z$.

### deep
#### Intuition

The variance of a weighted sum expands into all pairs: $\operatorname{Var}(\sum w_iX_i) = \sum_{i,j} w_iw_j\operatorname{Cov}(X_i, X_j)$, which is exactly $w^T\Sigma w$. Since a variance can't be negative, $\Sigma$ must give a non-negative number for *every* $w$. That property, positive semidefiniteness, is the test of whether a set of volatilities and correlations could come from real data.

#### Worked example 1: the minimum-variance mix

Asset 1 has volatility 10%, asset 2 has 20%, and their correlation is $-0.5$:

$$\Sigma = \begin{pmatrix}0.01 & -0.01\\ -0.01 & 0.04\end{pmatrix}.$$

The variance of $(w, 1 - w)$ is $0.01w^2 + 0.04(1 - w)^2 - 0.02w(1 - w)$. Setting the derivative to zero gives $w = \frac{0.04 + 0.01}{0.01 + 0.04 + 0.02} = \frac{5}{7} \approx 0.714$, and the variance there is $\frac{\sigma_1^2\sigma_2^2(1 - \rho^2)}{\sigma_1^2 + \sigma_2^2 - 2\rho\sigma_1\sigma_2} = \frac{0.0003}{0.07} \approx 0.0042857$, a volatility of about 6.55%, lower than either asset alone.

#### Worked example 2: an impossible correlation matrix

Can three assets have pairwise correlations of $-0.6$? Take unit variances and $w = (1, 1, 1)$: $w^T\Sigma w = 3 + 6(-0.6) = -0.6 < 0$, a negative variance. So no. (The eigenvalues of this matrix are $1 + 2\rho = -0.2$ and $1 - \rho = 1.6$ twice; one is negative.) Equal pairwise correlations among $n$ assets must be at least $-\frac{1}{n-1}$.

#### Checking by simulation

The program draws a million correlated return pairs with the Cholesky factor, then compares the sample covariance and the portfolio variance with the exact values.

```cpp
mt19937_64 rng(2026);
double unif() { return ((rng() >> 11) + 0.5) * 0x1.0p-53; }  // in (0, 1)
double normal() {                                    // Box-Muller
    double u1 = unif(), u2 = unif();                 // in this order on every compiler
    return sqrt(-2 * log(u1)) * cos(2 * acos(-1.0) * u2);
}

int main() {
    double s1 = 0.1, s2 = 0.2, rho = -0.5;
    double l21 = rho * s2, l22 = s2 * sqrt(1 - rho * rho);   // Sigma = L L^T
    double w = (s2 * s2 - rho * s1 * s2) / (s1 * s1 + s2 * s2 - 2 * rho * s1 * s2);
    double exactVar = w * w * s1 * s1 + (1 - w) * (1 - w) * s2 * s2 +
                      2 * w * (1 - w) * rho * s1 * s2;
    const int n = 1'000'000;
    double sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sp = 0, spp = 0;
    for (int i = 0; i < n; ++i) {
        double z1 = normal(), z2 = normal();
        double x = s1 * z1, y = l21 * z1 + l22 * z2, p = w * x + (1 - w) * y;
        sx += x, sy += y, sxx += x * x, syy += y * y, sxy += x * y, sp += p, spp += p * p;
    }
    auto cov = [&](double a, double b, double ab) { return (ab - a * b / n) / (n - 1); };
    printf("sample covariance: %.5f %.5f / %.5f %.5f\n", cov(sx, sx, sxx), cov(sx, sy, sxy),
           cov(sx, sy, sxy), cov(sy, sy, syy));
    double v = cov(sp, sp, spp), se = exactVar * sqrt(2.0 / (n - 1));
    printf("min-variance weight %.4f; portfolio variance exact %.7f, simulated %.7f (%.1f SE)\n",
           w, exactVar, v, fabs(v - exactVar) / se);
    printf("volatility %.4f; w = (1,1,1) with all correlations -0.6 gives %.1f\n",
           sqrt(exactVar), 3 + 6 * -0.6);
}
```

Output:

```text
sample covariance: 0.01001 -0.01000 / -0.01000 0.03996
min-variance weight 0.7143; portfolio variance exact 0.0042857, simulated 0.0042883 (0.4 SE)
volatility 0.0655; w = (1,1,1) with all correlations -0.6 gives -0.6
```

The sample covariance reproduces $\Sigma$ to within 0.00004 in every entry, and the simulated portfolio variance is 0.4 standard errors from the exact $\frac{0.0003}{0.07}$ (the standard error of a sample variance of normal data is about $\sigma^2\sqrt{2/n}$).

#### Common mistakes

- **Adding volatilities**: volatilities combine through the covariance matrix, not by addition, unless the correlation is exactly 1.
- **Mixing up correlation and covariance**: the covariance is $\rho\sigma_1\sigma_2$.
- **Estimated matrices that aren't PSD**: filling in correlations pair by pair from different time ranges can produce a negative eigenvalue; check before optimizing.

Connects to: [covariance and correlation](#/concept/prob.random-variables.covariance-and-correlation), [diversification and correlation](#/concept/markets.pricing.diversification-and-correlation), [PCA intuition](#/concept/math.linear-algebra.pca-intuition). Practice: [Two assets, half each](#/problems/q-two-asset-volatility).

### questions
Q: How do you compute the variance of a portfolio from a covariance matrix?
A: Multiply w transposed by Sigma by w, where w holds the weights. For two assets that is w1 squared sigma1 squared plus w2 squared sigma2 squared plus 2 w1 w2 rho sigma1 sigma2.

Q: Why must a covariance matrix be positive semidefinite?
A: For any weights w, w transposed Sigma w is the variance of a portfolio, and a variance can't be negative. Equivalently every eigenvalue of Sigma is at least zero.

Q: Can three assets have pairwise correlations of -0.6?
A: No. With unit variances, the equal-weighted sum would have variance 3 + 6 times -0.6, which is -0.6, impossible. Equal correlations among n assets can't be below -1 over (n - 1), which is -0.5 for three.

Q: How do you simulate correlated normal returns?
A: Factor the covariance matrix as L times L transposed (the Cholesky factorization), draw independent standard normals Z, and return the mean plus L times Z.

## math.linear-algebra.pca-intuition
name: "PCA intuition"
importance: advanced
prereqs: [math.linear-algebra.eigenvalues-and-eigenvectors, math.linear-algebra.covariance-matrices]
scope: "directions of maximum variance"

### simple
Principal component analysis finds the directions in which data varies the most. Picture a cloud of points shaped like a cigar: the first component runs along its length, the second across its width. Keeping only the first few components summarizes many correlated numbers with a handful.

### interview
- The principal components are the eigenvectors of the covariance matrix, ordered by eigenvalue; each eigenvalue is the variance along its direction.
- Share of variance explained by component $k$: $\frac{\lambda_k}{\sum_i \lambda_i}$ (the sum equals the trace).
- The first component maximizes $\operatorname{Var}(u^T X)$ over unit vectors $u$; later ones do the same while staying perpendicular to earlier ones.
- Center the data first, and scale it when the variables use different units (then you are working with the correlation matrix).
- Finance: for yield curve changes, the first three components are usually read as level, slope and curvature; in equities the first is usually the market.
- Limits: it only sees linear structure and variance, and components can be hard to interpret.

### deep
#### Intuition

For a unit vector $u$, the variance of the data projected onto $u$ is $u^T\Sigma u$. Maximizing it subject to $|u| = 1$ with a [Lagrange multiplier](#/concept/math.calculus.derivatives-and-optimization) gives $\Sigma u = \lambda u$: the best direction is an eigenvector, and the variance it captures is the eigenvalue. The eigenvectors are perpendicular because $\Sigma$ is symmetric, so the components split the total variance, $\operatorname{tr}\Sigma$, into non-overlapping pieces.

#### Worked example

Two standardized-looking signals have covariance $\Sigma = \begin{pmatrix}3&1\\1&3\end{pmatrix}$. Its eigenvalues are $3 + 1 = 4$ and $3 - 1 = 2$, with eigenvectors $\frac{1}{\sqrt{2}}(1, 1)$ and $\frac{1}{\sqrt{2}}(1, -1)$. The first component, the average of the two signals, carries $\frac{4}{6} = \frac{2}{3}$ of the variance; the second, their difference, carries $\frac{1}{3}$. Keeping only the first component loses exactly the second's variance, 2 of the 6.

#### Checking by simulation

The program samples 200,000 points with this covariance, estimates the covariance from the sample, and finds its eigenvalues with the $2 \times 2$ formula $\lambda = \frac{a + c}{2} \pm \sqrt{\left(\frac{a - c}{2}\right)^2 + b^2}$.

```cpp
mt19937_64 rng(2026);
double unif() { return ((rng() >> 11) + 0.5) * 0x1.0p-53; }
double normal() {                                    // Box-Muller
    double u1 = unif(), u2 = unif();                 // in this order on every compiler
    return sqrt(-2 * log(u1)) * cos(2 * acos(-1.0) * u2);
}

int main() {
    double l11 = sqrt(3.0), l21 = 1 / sqrt(3.0), l22 = sqrt(3 - 1.0 / 3);   // Cholesky
    const int n = 200'000;
    vector<array<double, 2>> pts(n);
    double mx = 0, my = 0;
    for (auto& p : pts) {
        double z1 = normal(), z2 = normal();
        p = {l11 * z1, l21 * z1 + l22 * z2};
        mx += p[0] / n, my += p[1] / n;
    }
    double a = 0, b = 0, c = 0;
    for (auto& p : pts) {
        double dx = p[0] - mx, dy = p[1] - my;
        a += dx * dx / (n - 1), b += dx * dy / (n - 1), c += dy * dy / (n - 1);
    }
    double mid = (a + c) / 2, r = sqrt((a - c) * (a - c) / 4 + b * b);
    double l1 = mid + r, l2 = mid - r;
    double angle = atan2(l1 - a, b) * 180 / acos(-1.0);    // eigenvector (b, l1 - a)
    printf("sample covariance: %.3f %.3f / %.3f %.3f\n", a, b, b, c);
    printf("eigenvalues %.3f and %.3f; first component at %.1f degrees; explains %.3f\n", l1,
           l2, angle, l1 / (l1 + l2));
    double lost = 0;                                   // squared distance to the PC1 line
    double ux = cos(angle * acos(-1.0) / 180), uy = sin(angle * acos(-1.0) / 180);
    for (auto& p : pts) {
        double dx = p[0] - mx, dy = p[1] - my, t = dx * ux + dy * uy;
        lost += ((dx - t * ux) * (dx - t * ux) + (dy - t * uy) * (dy - t * uy)) / (n - 1);
    }
    printf("variance lost by keeping one component: %.3f\n", lost);
}
```

Output:

```text
sample covariance: 3.011 1.005 / 1.005 3.006
eigenvalues 4.014 and 2.004; first component at 44.9 degrees; explains 0.667
variance lost by keeping one component: 2.004
```

The sample recovers eigenvalues within 0.015 of 4 and 2, a first direction within 0.1 degrees of 45, and a two-thirds share (0.667). The variance lost by projecting onto the first component equals the second eigenvalue, as the theory says.

#### Common mistakes

- **Not centering** the data, so the first "component" just points at the mean.
- **Mixing units**: a variable in dollars swamps one in percent; standardize first.
- **Reading components as causes**: they are directions of variance, not economic factors, though they sometimes line up with them.

Connects to: [eigenvalues and eigenvectors](#/concept/math.linear-algebra.eigenvalues-and-eigenvectors), [covariance matrices](#/concept/math.linear-algebra.covariance-matrices), [linear regression](#/concept/prob.learning.linear-regression), [overfitting](#/concept/prob.learning.overfitting-and-the-bias-variance-trade-off).

### questions
Q: What are the principal components of a data set?
A: The eigenvectors of its covariance matrix, ordered by eigenvalue. The first is the direction along which the data varies most, and each eigenvalue is the variance along its component.

Q: How do you measure how much variance the first k components explain?
A: Add their eigenvalues and divide by the sum of all eigenvalues, which equals the trace of the covariance matrix, the total variance.

Q: Why should you standardize variables before PCA?
A: PCA looks for variance, so a variable measured on a larger scale dominates the first component whatever its importance. Standardizing puts variables on equal footing, which amounts to using the correlation matrix.

Q: For a covariance matrix with rows (3, 1) and (1, 3), what do the components look like?
A: The eigenvalues are 4 and 2 with directions (1, 1) and (1, -1) over the square root of 2. The first component, the average of the two variables, explains two thirds of the variance.
