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

## prob.learning.overfitting-and-the-bias-variance-trade-off
name: "Overfitting and the bias-variance trade-off"
importance: important
prereqs: [prob.learning.linear-regression]
scope: "train vs test error"

## prob.learning.regularization
name: "Regularization"
importance: important
prereqs: [prob.learning.overfitting-and-the-bias-variance-trade-off]
scope: "ridge and lasso intuition"

## prob.learning.time-series-basics
name: "Time series basics"
importance: advanced
scope: "stationarity, autocorrelation, mean reversion"

## prob.learning.cross-validation-and-backtesting-pitfalls
name: "Cross-validation and backtesting pitfalls"
importance: advanced
prereqs: [prob.learning.overfitting-and-the-bias-variance-trade-off]
scope: "look-ahead bias, data snooping"
