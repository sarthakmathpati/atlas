---
topic: dsa.monotonic
name: "Monotonic stack and deque"
subject: dsa
order: 15
prereqs: [dsa.stacks-queues]
---

## dsa.monotonic.monotonic-stack
name: "Monotonic stack"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "next and previous greater or smaller element"

## dsa.monotonic.largest-rectangle-in-histogram
name: "Largest rectangle in histogram"
importance: must
pattern: true
prereqs: [dsa.monotonic.monotonic-stack]
scope: "monotonic stack areas, maximal rectangle"

## dsa.monotonic.contribution-technique
name: "Contribution technique"
importance: important
pattern: true
prereqs: [dsa.monotonic.monotonic-stack]
scope: "sum of subarray minimums, subarray ranges"

## dsa.monotonic.monotonic-deque
name: "Monotonic deque"
importance: important
pattern: true
prereqs: [dsa.stacks-queues.queue-and-deque-basics]
scope: "sliding window maximum, shortest subarray with sum at least K"

## dsa.monotonic.greedy-stack
name: "Greedy stack"
importance: important
prereqs: [dsa.monotonic.monotonic-stack]
scope: "remove K digits, remove duplicate letters"
