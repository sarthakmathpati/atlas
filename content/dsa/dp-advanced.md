---
topic: dsa.dp-advanced
name: "Dynamic programming: advanced"
subject: dsa
order: 33
prereqs: [dsa.dp-foundations, dsa.bits, dsa.trees]
---

## dsa.dp-advanced.dp-on-trees
name: "DP on trees"
importance: important
pattern: true
prereqs: [dsa.trees.bottom-up-tree-recursion, dsa.dp-foundations.designing-dp-states]
scope: "returning several values per node"

## dsa.dp-advanced.bitmask-dp
name: "Bitmask DP"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.bits.bitmask-enumeration]
scope: "subsets as states, travelling salesman style, partition into k subsets"

## dsa.dp-advanced.digit-dp
name: "Digit DP"
importance: advanced
scope: "counting numbers with digit constraints"

## dsa.dp-advanced.dp-with-binary-search
name: "DP with binary search"
importance: advanced
prereqs: [dsa.binary-search.lower-and-upper-bound]
scope: "weighted job scheduling"

## dsa.dp-advanced.dp-optimization-overview
name: "DP optimization overview"
importance: advanced
scope: "monotonic queue optimization, prefix sums inside transitions"
