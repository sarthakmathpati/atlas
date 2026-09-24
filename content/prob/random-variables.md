---
topic: prob.random-variables
name: "Random variables and expectation"
subject: prob
order: 2
prereqs: [prob.foundations]
---

## prob.random-variables.random-variables
name: "Random variables"
importance: must
scope: "discrete vs continuous, PMF, PDF, CDF"

## prob.random-variables.expectation
name: "Expectation"
importance: must
prereqs: [prob.random-variables.random-variables]
scope: "definition, expected value of functions"

## prob.random-variables.linearity-of-expectation
name: "Linearity of expectation"
importance: must
prereqs: [prob.random-variables.expectation]
scope: "works even for dependent variables"

## prob.random-variables.indicator-variables
name: "Indicator variables"
importance: must
prereqs: [prob.random-variables.linearity-of-expectation]
scope: "counting expected matches, fixed points, runs"

## prob.random-variables.variance-and-standard-deviation
name: "Variance and standard deviation"
importance: must
prereqs: [prob.random-variables.expectation]
scope: "definition, variance of sums"

## prob.random-variables.covariance-and-correlation
name: "Covariance and correlation"
importance: must
prereqs: [prob.random-variables.variance-and-standard-deviation]
scope: "meaning, properties, correlation vs independence"

## prob.random-variables.moments-and-moment-generating-functions
name: "Moments and moment generating functions"
importance: important
prereqs: [prob.random-variables.variance-and-standard-deviation]
scope: "Moments and moment generating functions"
