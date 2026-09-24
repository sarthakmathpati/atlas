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

## math.linear-algebra.determinants-and-inverses
name: "Determinants and inverses"
importance: important
prereqs: [math.linear-algebra.vectors-and-matrices]
scope: "when a matrix is invertible"

## math.linear-algebra.eigenvalues-and-eigenvectors
name: "Eigenvalues and eigenvectors"
importance: important
prereqs: [math.linear-algebra.determinants-and-inverses]
scope: "meaning and computation for 2x2"

## math.linear-algebra.covariance-matrices
name: "Covariance matrices"
importance: important
prereqs: [math.linear-algebra.vectors-and-matrices]
scope: "positive semidefinite, portfolio variance"

## math.linear-algebra.pca-intuition
name: "PCA intuition"
importance: advanced
prereqs: [math.linear-algebra.eigenvalues-and-eigenvectors, math.linear-algebra.covariance-matrices]
scope: "directions of maximum variance"
