---
topic: dsa.string-algorithms
name: "String algorithms"
subject: dsa
order: 10
prereqs: [dsa.strings]
---

## dsa.string-algorithms.kmp-and-the-prefix-function
name: "KMP and the prefix function"
importance: important
pattern: true
scope: "longest proper prefix that is also a suffix, O(n + m) matching"

## dsa.string-algorithms.rolling-hash-and-rabin-karp
name: "Rolling hash and Rabin-Karp"
importance: important
pattern: true
scope: "polynomial hashing, collisions, double hashing"

## dsa.string-algorithms.z-algorithm
name: "Z-algorithm"
importance: advanced
prereqs: [dsa.string-algorithms.kmp-and-the-prefix-function]
scope: "the Z-array for pattern matching"

## dsa.string-algorithms.manachers-algorithm
name: "Manacher's algorithm"
importance: advanced
prereqs: [dsa.strings.palindromes]
scope: "longest palindromic substring in O(n)"

## dsa.string-algorithms.suffix-arrays-and-lcp
name: "Suffix arrays and LCP"
importance: advanced
scope: "what they are and what they solve"
