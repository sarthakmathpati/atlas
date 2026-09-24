---
topic: dsa.bst
name: "Binary search trees"
subject: dsa
order: 20
prereqs: [dsa.trees, dsa.binary-search]
---

## dsa.bst.bst-operations
name: "BST operations"
importance: must
scope: "search, insert, delete (three cases)"

## dsa.bst.validate-a-bst
name: "Validate a BST"
importance: must
prereqs: [dsa.bst.bst-operations]
scope: "range bounds, increasing inorder"

## dsa.bst.inorder-tricks
name: "Inorder tricks"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "kth smallest, BST iterator, successor and predecessor"

## dsa.bst.building-balanced-bsts
name: "Building balanced BSTs"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "from a sorted array, from preorder"

## dsa.bst.self-balancing-bsts-overview
name: "Self-balancing BSTs overview"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "AVL and red-black trees, why ordered maps are O(log n)"

## dsa.bst.floor-and-ceiling-in-a-bst
name: "Floor and ceiling in a BST"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "the lower_bound analogue"
