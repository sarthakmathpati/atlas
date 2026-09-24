---
topic: dsa.hashing
name: "Hashing"
subject: dsa
order: 4
prereqs: [dsa.arrays]
---

## dsa.hashing.hash-table-internals
name: "Hash table internals"
importance: must
scope: "hash functions, buckets, load factor, resizing"

## dsa.hashing.collision-handling
name: "Collision handling"
importance: must
prereqs: [dsa.hashing.hash-table-internals]
scope: "chaining vs open addressing, worst case O(n)"

## dsa.hashing.frequency-counting
name: "Frequency counting"
importance: must
pattern: true
prereqs: [dsa.hashing.hash-table-internals]
scope: "counting elements, anagram checks, grouping by a key"

## dsa.hashing.complement-lookup
name: "Complement lookup"
importance: must
pattern: true
prereqs: [dsa.hashing.hash-table-internals]
scope: "two-sum style \"have I seen target minus x?\""

## dsa.hashing.hash-sets-for-membership
name: "Hash sets for membership"
importance: important
scope: "deduplication, longest consecutive sequence"

## dsa.hashing.ordered-maps-vs-hash-maps
name: "Ordered maps vs hash maps"
importance: important
scope: "when you need sorted keys, floor and ceiling queries"

## dsa.hashing.custom-hashing-and-anti-hash-tests
name: "Custom hashing and anti-hash tests"
importance: advanced
prereqs: [dsa.hashing.collision-handling]
scope: "hashing pairs, why a hash map can be attacked"
