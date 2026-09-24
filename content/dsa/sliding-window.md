---
topic: dsa.sliding-window
name: "Sliding window"
subject: dsa
order: 6
prereqs: [dsa.two-pointers, dsa.hashing]
---

## dsa.sliding-window.fixed-size-window
name: "Fixed-size window"
importance: must
pattern: true
scope: "sliding sums and averages, anagram occurrences"

## dsa.sliding-window.variable-size-window
name: "Variable-size window"
importance: must
pattern: true
prereqs: [dsa.sliding-window.fixed-size-window]
scope: "expand right, shrink left while invalid, track longest or shortest"

## dsa.sliding-window.window-with-counts
name: "Window with counts"
importance: must
pattern: true
prereqs: [dsa.hashing.frequency-counting, dsa.sliding-window.variable-size-window]
scope: "distinct characters, character replacement"

## dsa.sliding-window.exactly-k-via-at-most-k
name: "Exactly K via at most K"
importance: important
pattern: true
prereqs: [dsa.sliding-window.window-with-counts]
scope: "exactly(K) = atMost(K) − atMost(K − 1)"

## dsa.sliding-window.minimum-window-substring
name: "Minimum window substring"
importance: important
pattern: true
prereqs: [dsa.sliding-window.window-with-counts]
scope: "need and have counters"

## dsa.sliding-window.sliding-window-maximum
name: "Sliding window maximum"
importance: advanced
prereqs: [dsa.monotonic.monotonic-deque]
scope: "monotonic deque solution"
