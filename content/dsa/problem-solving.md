---
topic: dsa.problem-solving
name: "Problem-solving method"
subject: dsa
order: 38
prereqs: []
---

## dsa.problem-solving.reading-the-problem
name: "Reading the problem"
importance: must
scope: "inputs, outputs, constraints, clarifying questions"

## dsa.problem-solving.from-brute-force-to-optimal
name: "From brute force to optimal"
importance: must
prereqs: [dsa.problem-solving.reading-the-problem]
scope: "state the brute force, find the bottleneck, apply a pattern"

## dsa.problem-solving.pattern-recognition
name: "Pattern recognition"
importance: must
prereqs: [dsa.problem-solving.from-brute-force-to-optimal]
scope: "mapping problem signals to techniques"

## dsa.problem-solving.dry-running-and-testing
name: "Dry running and testing"
importance: must
scope: "tracing small cases by hand, testing edge cases"

## dsa.problem-solving.edge-case-checklist
name: "Edge case checklist"
importance: must
scope: "empty, single element, duplicates, negatives, overflow, sorted, reversed, all equal"

## dsa.problem-solving.communicating-in-interviews
name: "Communicating in interviews"
importance: must
scope: "thinking aloud, stating complexity, trade-offs, confirming before coding"

## dsa.problem-solving.time-management-in-interviews-and-oas
name: "Time management in interviews and OAs"
importance: important
scope: "when to move on, partial credit"

## dsa.problem-solving.debugging-under-pressure
name: "Debugging under pressure"
importance: important
prereqs: [dsa.problem-solving.dry-running-and-testing]
scope: "isolating the failing case, print debugging"
