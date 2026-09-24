---
topic: dsa.linked-lists
name: "Linked lists"
subject: dsa
order: 13
prereqs: [dsa.complexity]
---

## dsa.linked-lists.linked-list-basics
name: "Linked list basics"
importance: must
scope: "singly vs doubly, insert, delete, traverse, dummy nodes"

## dsa.linked-lists.linked-list-reversal
name: "Linked list reversal"
importance: must
pattern: true
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "iterative, recursive, sublist reversal, reverse in k-groups"

## dsa.linked-lists.fast-and-slow-pointers-on-lists
name: "Fast and slow pointers on lists"
importance: must
pattern: true
prereqs: [dsa.linked-lists.linked-list-reversal]
scope: "middle node, cycle detection, cycle start with Floyd's algorithm"

## dsa.linked-lists.merging-lists
name: "Merging lists"
importance: must
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "merge two sorted lists, merge k sorted lists with a heap"

## dsa.linked-lists.removal-patterns
name: "Removal patterns"
importance: important
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "nth node from the end, remove duplicates, remove by value"

## dsa.linked-lists.tricky-pointer-problems
name: "Tricky pointer problems"
importance: important
prereqs: [dsa.linked-lists.fast-and-slow-pointers-on-lists]
scope: "copy list with random pointer, intersection, reorder list, palindrome list"

## dsa.linked-lists.doubly-linked-list-with-hash-map
name: "Doubly linked list with hash map"
importance: important
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "the LRU cache building block"
