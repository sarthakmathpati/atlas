---
topic: dsa.trees
name: "Trees"
subject: dsa
order: 19
prereqs: [dsa.recursion, dsa.stacks-queues]
---

## dsa.trees.tree-terminology
name: "Tree terminology"
importance: must
scope: "root, leaf, depth, height, full, complete, perfect, balanced"

## dsa.trees.dfs-traversals
name: "DFS traversals"
importance: must
pattern: true
prereqs: [dsa.recursion.recursion-fundamentals, dsa.trees.tree-terminology]
scope: "preorder, inorder, postorder, recursive and iterative"

## dsa.trees.level-order-traversal
name: "Level-order traversal"
importance: must
pattern: true
prereqs: [dsa.trees.tree-terminology]
scope: "BFS by levels, zigzag, right side view, width"

## dsa.trees.bottom-up-tree-recursion
name: "Bottom-up tree recursion"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "height, diameter, balanced check, max path sum (return a value, update a global answer)"

## dsa.trees.top-down-tree-recursion
name: "Top-down tree recursion"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "passing state down, path sums, good nodes"

## dsa.trees.lowest-common-ancestor
name: "Lowest common ancestor"
importance: must
prereqs: [dsa.trees.bottom-up-tree-recursion]
scope: "in a binary tree and in a BST"

## dsa.trees.tree-construction
name: "Tree construction"
importance: important
prereqs: [dsa.trees.dfs-traversals]
scope: "from preorder and inorder, from postorder and inorder"

## dsa.trees.serialize-and-deserialize
name: "Serialize and deserialize"
importance: important
scope: "preorder with null markers, level order"

## dsa.trees.views-and-vertical-order
name: "Views and vertical order"
importance: important
prereqs: [dsa.trees.level-order-traversal]
scope: "top, bottom, left, right views, vertical traversal with coordinates"

## dsa.trees.trees-as-graphs
name: "Trees as graphs"
importance: important
scope: "nodes at distance K using parent pointers"

## dsa.trees.morris-traversal
name: "Morris traversal"
importance: advanced
scope: "O(1) space inorder"

## dsa.trees.binary-lifting
name: "Binary lifting"
importance: advanced
prereqs: [dsa.trees.lowest-common-ancestor]
scope: "kth ancestor, LCA in O(log n)"

## dsa.trees.tree-dp-on-subtrees
name: "Tree DP on subtrees"
importance: advanced
prereqs: [dsa.trees.bottom-up-tree-recursion]
scope: "house robber III, binary tree cameras"
