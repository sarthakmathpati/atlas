---
topic: math.combinatorics
name: "Combinatorics"
subject: math
order: 1
prereqs: []
---

## math.combinatorics.counting-principles
name: "Counting principles"
importance: must
scope: "sum and product rules"

## math.combinatorics.permutations-and-combinations
name: "Permutations and combinations"
importance: must
prereqs: [math.combinatorics.counting-principles]
scope: "with and without repetition, arranging with identical items"

## math.combinatorics.stars-and-bars
name: "Stars and bars"
importance: must
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "distributing identical items"

## math.combinatorics.inclusion-exclusion
name: "Inclusion-exclusion"
importance: must
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "counting with overlaps, derangements"

## math.combinatorics.pigeonhole-principle
name: "Pigeonhole principle"
importance: important
scope: "Pigeonhole principle"

## math.combinatorics.catalan-numbers
name: "Catalan numbers"
importance: important
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "balanced parentheses, paths, trees"

## math.combinatorics.binomial-theorem-and-pascals-identities
name: "Binomial theorem and Pascal's identities"
importance: important
prereqs: [math.combinatorics.permutations-and-combinations]
scope: "Binomial theorem and Pascal's identities"
