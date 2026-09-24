---
topic: dsa.dp-foundations
name: "Dynamic programming: foundations"
subject: dsa
order: 26
prereqs: [dsa.recursion]
---

## dsa.dp-foundations.what-dp-is
name: "What DP is"
importance: must
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "overlapping subproblems and optimal substructure"

## dsa.dp-foundations.memoization-vs-tabulation
name: "Memoization vs tabulation"
importance: must
prereqs: [dsa.recursion.memoization-intro, dsa.dp-foundations.what-dp-is]
scope: "top-down vs bottom-up and when each is easier"

## dsa.dp-foundations.designing-dp-states
name: "Designing DP states"
importance: must
prereqs: [dsa.dp-foundations.memoization-vs-tabulation]
scope: "what information defines a subproblem"

## dsa.dp-foundations.transitions-and-base-cases
name: "Transitions and base cases"
importance: must
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "writing the recurrence, order of computation"

## dsa.dp-foundations.space-optimization
name: "Space optimization"
importance: must
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "rolling arrays, keeping only the previous row"

## dsa.dp-foundations.reconstructing-the-answer
name: "Reconstructing the answer"
importance: important
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "storing choices and walking back through the table"

## dsa.dp-foundations.counting-dp-and-modulo
name: "Counting DP and modulo"
importance: important
prereqs: [dsa.dp-foundations.transitions-and-base-cases]
scope: "number of ways mod 1e9+7"
