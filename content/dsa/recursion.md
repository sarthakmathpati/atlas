---
topic: dsa.recursion
name: "Recursion"
subject: dsa
order: 11
prereqs: [dsa.complexity]
---

## dsa.recursion.recursion-fundamentals
name: "Recursion fundamentals"
importance: must
scope: "base case, recursive case, call stack, trusting the recursion"

## dsa.recursion.recursion-tree-thinking
name: "Recursion tree thinking"
importance: must
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "drawing the tree, counting calls"

## dsa.recursion.divide-and-conquer
name: "Divide and conquer"
importance: must
prereqs: [dsa.recursion.recursion-tree-thinking]
scope: "split, solve, combine; merge sort and fast power as examples"

## dsa.recursion.recursion-to-iteration
name: "Recursion to iteration"
importance: important
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "explicit stacks, tail recursion"

## dsa.recursion.memoization-intro
name: "Memoization intro"
importance: important
prereqs: [dsa.recursion.recursion-tree-thinking]
scope: "caching repeated subproblems as the bridge to DP"
