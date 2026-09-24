---
topic: dsa.tries
name: "Tries"
subject: dsa
order: 21
prereqs: [dsa.trees, dsa.strings]
---

## dsa.tries.trie-structure
name: "Trie structure"
importance: must
scope: "insert, search, startsWith, memory trade-offs"

## dsa.tries.trie-with-dfs
name: "Trie with DFS"
importance: important
pattern: true
prereqs: [dsa.tries.trie-structure]
scope: "wildcard search, word search II"

## dsa.tries.bitwise-trie
name: "Bitwise trie"
importance: important
pattern: true
prereqs: [dsa.tries.trie-structure]
scope: "maximum XOR of two numbers"

## dsa.tries.autocomplete-with-tries
name: "Autocomplete with tries"
importance: important
prereqs: [dsa.tries.trie-structure]
scope: "ranking suggestions"
