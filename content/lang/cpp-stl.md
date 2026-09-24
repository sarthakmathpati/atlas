---
topic: lang.cpp-stl
name: "C++ STL for interviews"
subject: lang
order: 2
prereqs: [lang.cpp-core]
---

## lang.cpp-stl.sequence-containers
name: "Sequence containers"
importance: must
scope: "vector, deque, list, array and the cost of each operation"

## lang.cpp-stl.ordered-containers
name: "Ordered containers"
importance: must
scope: "map, set, multiset (red-black trees), `lower_bound`, `upper_bound`"

## lang.cpp-stl.unordered-containers
name: "Unordered containers"
importance: must
scope: "unordered_map and unordered_set internals, custom hash, `reserve`, worst case"

## lang.cpp-stl.container-adaptors
name: "Container adaptors"
importance: must
scope: "stack, queue, priority_queue (max-heap default, min-heap with `greater<>`, custom comparators)"

## lang.cpp-stl.stl-algorithms
name: "STL algorithms"
importance: must
scope: "sort, stable_sort, comparators and strict weak ordering, binary_search, next_permutation, accumulate, unique"

## lang.cpp-stl.pairs-tuples-and-lambdas
name: "Pairs, tuples and lambdas"
importance: important
scope: "structured bindings, lambda captures, sorting with lambdas"

## lang.cpp-stl.policy-based-ordered-set
name: "Policy-based ordered set"
importance: advanced
prereqs: [lang.cpp-stl.ordered-containers]
scope: "order statistics tree for competitive programming"
