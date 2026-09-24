---
topic: dsa.backtracking
name: "Backtracking"
subject: dsa
order: 12
prereqs: [dsa.recursion]
---

## dsa.backtracking.subsets
name: "Subsets"
importance: must
pattern: true
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "include or exclude, iterative and bitmask versions"

## dsa.backtracking.permutations
name: "Permutations"
importance: must
pattern: true
prereqs: [dsa.backtracking.subsets]
scope: "swapping vs used array, handling duplicates"

## dsa.backtracking.combinations
name: "Combinations"
importance: must
pattern: true
prereqs: [dsa.backtracking.subsets]
scope: "start index, reuse vs no reuse, combination sum"

## dsa.backtracking.handling-duplicates-in-backtracking
name: "Handling duplicates in backtracking"
importance: must
prereqs: [dsa.backtracking.permutations]
scope: "sort, then skip equal choices at the same level"

## dsa.backtracking.grid-backtracking
name: "Grid backtracking"
importance: must
pattern: true
scope: "word search, marking visited and undoing"

## dsa.backtracking.constraint-satisfaction
name: "Constraint satisfaction"
importance: important
pattern: true
scope: "N-Queens, Sudoku, pruning with sets or bitmasks"

## dsa.backtracking.partitioning-problems
name: "Partitioning problems"
importance: important
prereqs: [dsa.backtracking.combinations]
scope: "palindrome partitioning, restore IP addresses"

## dsa.backtracking.pruning-strategies
name: "Pruning strategies"
importance: important
scope: "bounds, choice ordering, early exit"
