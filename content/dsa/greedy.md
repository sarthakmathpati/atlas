---
topic: dsa.greedy
name: "Greedy algorithms"
subject: dsa
order: 18
prereqs: [dsa.sorting]
---

## dsa.greedy.greedy-fundamentals
name: "Greedy fundamentals"
importance: must
scope: "greedy choice property, optimal substructure, when greedy fails"

## dsa.greedy.exchange-argument
name: "Exchange argument"
importance: must
prereqs: [dsa.greedy.greedy-fundamentals]
scope: "how to justify a greedy choice"

## dsa.greedy.reachability-greedy
name: "Reachability greedy"
importance: must
pattern: true
prereqs: [dsa.greedy.greedy-fundamentals]
scope: "jump game I and II, gas station"

## dsa.greedy.greedy-with-sorting
name: "Greedy with sorting"
importance: important
pattern: true
prereqs: [dsa.greedy.exchange-argument]
scope: "assign cookies, boats, two city scheduling, partition labels"

## dsa.greedy.greedy-with-heaps
name: "Greedy with heaps"
importance: important
pattern: true
scope: "reorganize string, IPO, refueling stops"

## dsa.greedy.classic-greedy-algorithms
name: "Classic greedy algorithms"
importance: important
prereqs: [dsa.greedy.exchange-argument]
scope: "activity selection, fractional knapsack, Huffman coding"

## dsa.greedy.hard-greedy-problems
name: "Hard greedy problems"
importance: advanced
prereqs: [dsa.greedy.greedy-with-sorting]
scope: "candy with two passes, patching array"
