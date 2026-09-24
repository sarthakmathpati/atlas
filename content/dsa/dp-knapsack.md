---
topic: dsa.dp-knapsack
name: "Dynamic programming: knapsack family"
subject: dsa
order: 29
prereqs: [dsa.dp-foundations]
---

## dsa.dp-knapsack.0-1-knapsack
name: "0/1 knapsack"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "include or exclude, 1D optimization with a reverse loop"

## dsa.dp-knapsack.subset-sum-and-partition
name: "Subset sum and partition"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-knapsack.0-1-knapsack]
scope: "partition equal subset sum, target sum"

## dsa.dp-knapsack.unbounded-knapsack
name: "Unbounded knapsack"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-knapsack.subset-sum-and-partition]
scope: "coin change for minimum coins, forward loop"

## dsa.dp-knapsack.combinations-vs-permutations-counting
name: "Combinations vs permutations counting"
importance: must
prereqs: [dsa.dp-knapsack.unbounded-knapsack]
scope: "coin change II vs combination sum IV loop order"

## dsa.dp-knapsack.multi-dimensional-knapsack
name: "Multi-dimensional knapsack"
importance: important
prereqs: [dsa.dp-knapsack.0-1-knapsack]
scope: "ones and zeroes"
