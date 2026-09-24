---
topic: prob.expected-value
name: "Conditional expectation and expected-value problems"
subject: prob
order: 4
prereqs: [prob.random-variables]
---

## prob.expected-value.conditional-expectation
name: "Conditional expectation"
importance: must
scope: "E[X | Y], law of total expectation"

## prob.expected-value.law-of-total-variance
name: "Law of total variance"
importance: important
prereqs: [prob.expected-value.conditional-expectation]
scope: "Law of total variance"

## prob.expected-value.first-step-analysis
name: "First-step analysis"
importance: must
prereqs: [prob.expected-value.conditional-expectation]
scope: "setting up equations over states"

## prob.expected-value.waiting-time-problems
name: "Waiting time problems"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "expected flips until HH vs HT"

## prob.expected-value.coupon-collector-problem
name: "Coupon collector problem"
importance: must
prereqs: [prob.expected-value.first-step-analysis]
scope: "expected draws to collect all types"

## prob.expected-value.expected-value-of-games
name: "Expected value of games"
importance: important
scope: "fair prices, stopping rules"

## prob.expected-value.optimal-stopping
name: "Optimal stopping"
importance: important
prereqs: [prob.expected-value.expected-value-of-games]
scope: "secretary problem, when to stop rolling"
