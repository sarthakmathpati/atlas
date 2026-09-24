---
topic: dsa.dp-intervals
name: "Dynamic programming: intervals and games"
subject: dsa
order: 32
prereqs: [dsa.dp-foundations]
---

## dsa.dp-intervals.interval-dp
name: "Interval DP"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "dp over ranges, iterating by length"

## dsa.dp-intervals.matrix-chain-multiplication
name: "Matrix chain multiplication"
importance: important
prereqs: [dsa.dp-intervals.interval-dp]
scope: "the classic interval DP"

## dsa.dp-intervals.choosing-the-last-action
name: "Choosing the last action"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "burst balloons, minimum cost to cut a stick"

## dsa.dp-intervals.minimum-palindrome-cuts
name: "Minimum palindrome cuts"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "palindrome partitioning II"

## dsa.dp-intervals.game-dp
name: "Game DP"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "stone game, minimax over ranges"
