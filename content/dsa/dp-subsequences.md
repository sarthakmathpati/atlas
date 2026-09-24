---
topic: dsa.dp-subsequences
name: "Dynamic programming: subsequences and stocks"
subject: dsa
order: 30
prereqs: [dsa.dp-foundations, dsa.binary-search]
---

## dsa.dp-subsequences.longest-increasing-subsequence
name: "Longest increasing subsequence"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "O(n^2) DP and O(n log n) with patience sorting"

## dsa.dp-subsequences.lis-variants
name: "LIS variants"
importance: important
prereqs: [dsa.dp-subsequences.longest-increasing-subsequence]
scope: "number of LIS, largest divisible subset, longest string chain, Russian doll envelopes"

## dsa.dp-subsequences.stock-trading-state-machine
name: "Stock trading state machine"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "buy and sell I to IV, cooldown, transaction fee"
