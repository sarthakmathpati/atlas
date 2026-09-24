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

## math.calculus.integrals
name: "Integrals"
importance: important
scope: "basic integration, integration by parts"

## math.calculus.taylor-series
name: "Taylor series"
importance: important
prereqs: [math.calculus.derivatives-and-optimization]
scope: "approximations like e^x and ln(1 + x)"

## math.calculus.integrals-in-probability
name: "Integrals in probability"
importance: important
prereqs: [math.calculus.integrals]
scope: "computing expectations of continuous variables"

## math.calculus.differential-equations-basics
name: "Differential equations basics"
importance: advanced
prereqs: [math.calculus.integrals]
scope: "Differential equations basics"
