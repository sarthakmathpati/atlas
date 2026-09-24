---
topic: prob.foundations
name: "Probability foundations"
subject: prob
order: 1
prereqs: [math.combinatorics]
---

## prob.foundations.sample-spaces-and-events
name: "Sample spaces and events"
importance: must
scope: "outcomes, events, complements, unions, intersections"

## prob.foundations.axioms-and-basic-rules
name: "Axioms and basic rules"
importance: must
prereqs: [prob.foundations.sample-spaces-and-events]
scope: "addition rule, inclusion-exclusion for two and three events"

## prob.foundations.conditional-probability
name: "Conditional probability"
importance: must
prereqs: [prob.foundations.axioms-and-basic-rules]
scope: "P(A | B), the multiplication rule"

## prob.foundations.independence
name: "Independence"
importance: must
prereqs: [prob.foundations.conditional-probability]
scope: "independent vs mutually exclusive, pairwise vs mutual independence"

## prob.foundations.law-of-total-probability
name: "Law of total probability"
importance: must
prereqs: [prob.foundations.conditional-probability]
scope: "splitting by cases"

## prob.foundations.bayes-theorem
name: "Bayes' theorem"
importance: must
prereqs: [prob.foundations.law-of-total-probability]
scope: "updating beliefs, base-rate fallacy, medical test problems"

## prob.foundations.symmetry-arguments
name: "Symmetry arguments"
importance: important
scope: "using symmetry to skip computation"
