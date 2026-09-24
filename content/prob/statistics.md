---
topic: prob.statistics
name: "Statistics"
subject: prob
order: 8
prereqs: [prob.limits]
---

## prob.statistics.sampling-and-estimators
name: "Sampling and estimators"
importance: must
scope: "sample mean and variance, bias, consistency"

## prob.statistics.maximum-likelihood-estimation
name: "Maximum likelihood estimation"
importance: important
prereqs: [prob.statistics.sampling-and-estimators]
scope: "intuition and simple examples"

## prob.statistics.confidence-intervals
name: "Confidence intervals"
importance: must
prereqs: [prob.statistics.sampling-and-estimators]
scope: "interpretation and construction"

## prob.statistics.hypothesis-testing
name: "Hypothesis testing"
importance: must
prereqs: [prob.statistics.confidence-intervals]
scope: "null and alternative, p-values, type I and II errors, power"

## prob.statistics.common-tests
name: "Common tests"
importance: important
prereqs: [prob.statistics.hypothesis-testing]
scope: "z-test, t-test, chi-square"

## prob.statistics.a-b-testing
name: "A/B testing"
importance: important
prereqs: [prob.statistics.hypothesis-testing]
scope: "sample size, significance, pitfalls"

## prob.statistics.correlation-vs-causation
name: "Correlation vs causation"
importance: important
scope: "confounders"
