---
topic: dsa.dp-strings
name: "Dynamic programming: strings"
subject: dsa
order: 31
prereqs: [dsa.dp-foundations, dsa.strings]
---

## dsa.dp-strings.longest-common-subsequence
name: "Longest common subsequence"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "the 2D table and reconstruction"

## dsa.dp-strings.edit-distance
name: "Edit distance"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-strings.longest-common-subsequence]
scope: "insert, delete, replace transitions"

## dsa.dp-strings.palindromic-dp
name: "Palindromic DP"
importance: important
prereqs: [dsa.dp-strings.edit-distance]
scope: "longest palindromic subsequence, minimum insertions, counting palindromic substrings"

## dsa.dp-strings.counting-subsequences
name: "Counting subsequences"
importance: important
prereqs: [dsa.dp-strings.longest-common-subsequence]
scope: "distinct subsequences"

## dsa.dp-strings.interleaving-strings
name: "Interleaving strings"
importance: important
prereqs: [dsa.dp-strings.longest-common-subsequence]
scope: "2D DP over two prefixes"

## dsa.dp-strings.pattern-matching-dp
name: "Pattern matching DP"
importance: advanced
prereqs: [dsa.dp-strings.edit-distance]
scope: "regular expression and wildcard matching"
