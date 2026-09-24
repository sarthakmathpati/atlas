---
topic: prob.distributions
name: "Common distributions"
subject: prob
order: 3
prereqs: [prob.random-variables]
---

## prob.distributions.bernoulli-and-binomial
name: "Bernoulli and binomial"
importance: must
scope: "n trials, mean and variance"

## prob.distributions.geometric-distribution
name: "Geometric distribution"
importance: must
prereqs: [prob.distributions.bernoulli-and-binomial]
scope: "waiting for the first success, memorylessness"

## prob.distributions.negative-binomial-and-hypergeometric
name: "Negative binomial and hypergeometric"
importance: important
prereqs: [prob.distributions.geometric-distribution]
scope: "waiting for r successes, sampling without replacement"

## prob.distributions.poisson-distribution
name: "Poisson distribution"
importance: must
prereqs: [prob.distributions.bernoulli-and-binomial]
scope: "rare events, Poisson approximation to binomial"

## prob.distributions.uniform-distribution
name: "Uniform distribution"
importance: must
scope: "discrete and continuous"

## prob.distributions.exponential-distribution
name: "Exponential distribution"
importance: must
prereqs: [prob.distributions.geometric-distribution]
scope: "waiting times, memorylessness"

## prob.distributions.normal-distribution
name: "Normal distribution"
importance: must
scope: "properties, standardization, 68-95-99.7 rule"

## prob.distributions.lognormal-distribution
name: "Lognormal distribution"
importance: important
prereqs: [prob.distributions.normal-distribution]
scope: "stock price modeling"

## prob.distributions.beta-and-gamma-distributions
name: "Beta and gamma distributions"
importance: advanced
prereqs: [prob.distributions.exponential-distribution]
scope: "Beta and gamma distributions"

## prob.distributions.sums-of-random-variables
name: "Sums of random variables"
importance: important
scope: "convolution idea, sums of normals and Poissons"

## prob.distributions.order-statistics
name: "Order statistics"
importance: important
prereqs: [prob.distributions.uniform-distribution]
scope: "min and max of uniforms, expected kth smallest"
