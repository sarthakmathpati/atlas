---
topic: dsa.prefix-sums
name: "Prefix sums"
subject: dsa
order: 3
prereqs: [dsa.arrays]
---

## dsa.prefix-sums.1d-prefix-sums
name: "1D prefix sums"
importance: must
pattern: true
scope: "range sum queries in O(1)"

## dsa.prefix-sums.prefix-sum-with-hash-map
name: "Prefix sum with hash map"
importance: must
pattern: true
prereqs: [dsa.prefix-sums.1d-prefix-sums, dsa.hashing.complement-lookup]
scope: "count subarrays with sum K, longest subarray with sum K, divisibility by K"

## dsa.prefix-sums.2d-prefix-sums
name: "2D prefix sums"
importance: important
pattern: true
prereqs: [dsa.prefix-sums.prefix-sum-with-hash-map]
scope: "submatrix sums"

## dsa.prefix-sums.difference-arrays
name: "Difference arrays"
importance: important
pattern: true
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "range updates in O(1)"

## dsa.prefix-sums.prefix-products-and-prefix-xor
name: "Prefix products and prefix XOR"
importance: important
prereqs: [dsa.prefix-sums.1d-prefix-sums]
scope: "product of array except self, XOR range queries"
