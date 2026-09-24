---
topic: dsa.complexity
name: "Complexity analysis"
subject: dsa
order: 1
prereqs: []
---

## dsa.complexity.big-o-big-theta-and-big-omega
name: "Big-O, Big-Theta and Big-Omega"
importance: must
scope: "meaning, dropping constants, dominant terms"

## dsa.complexity.analyzing-loops
name: "Analyzing loops"
importance: must
prereqs: [dsa.complexity.big-o-big-theta-and-big-omega]
scope: "counting operations, nested loops, logarithmic loops"

## dsa.complexity.recursion-complexity
name: "Recursion complexity"
importance: must
prereqs: [dsa.complexity.analyzing-loops]
scope: "recursion trees, recurrences, the Master theorem"

## dsa.complexity.space-complexity
name: "Space complexity"
importance: must
scope: "auxiliary space, recursion stack, in-place algorithms"

## dsa.complexity.amortized-analysis
name: "Amortized analysis"
importance: important
prereqs: [dsa.complexity.analyzing-loops]
scope: "dynamic array doubling, aggregate method"

## dsa.complexity.constraints-to-complexity
name: "Constraints to complexity"
importance: must
prereqs: [dsa.complexity.analyzing-loops]
scope: "n ≤ 10 allows n!, 20 allows 2^n, 500 allows n^3, 5,000 allows n^2, 10^5 to 10^6 needs n log n or n, larger needs log n or O(1)"

## dsa.complexity.best-average-and-worst-case
name: "Best, average and worst case"
importance: important
scope: "quicksort and hash table examples"
