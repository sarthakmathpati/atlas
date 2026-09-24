---
topic: dsa.dp-1d
name: "Dynamic programming: 1D"
subject: dsa
order: 27
prereqs: [dsa.dp-foundations]
---

## dsa.dp-1d.linear-dp
name: "Linear DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "climbing stairs, min cost climbing stairs"

## dsa.dp-1d.take-or-skip-dp
name: "Take or skip DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-1d.linear-dp]
scope: "house robber I and II"

## dsa.dp-1d.decoding-and-segmentation-dp
name: "Decoding and segmentation DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-1d.linear-dp]
scope: "decode ways, word break"

## dsa.dp-1d.tracking-max-and-min-together
name: "Tracking max and min together"
importance: important
prereqs: [dsa.arrays.kadanes-algorithm]
scope: "maximum product subarray"

## dsa.dp-1d.dp-on-numbers
name: "DP on numbers"
importance: important
prereqs: [dsa.dp-1d.linear-dp]
scope: "perfect squares, integer break"
