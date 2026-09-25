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

### simple
A tree is a set of nodes connected like a family tree, with one node at the top called the root and no loops. Nodes with no children are leaves, depth measures how far a node is below the root, and height measures how far the deepest leaf is below a node. Words like full, complete and balanced describe how evenly a tree is filled.

### interview
- A tree with n nodes has **n − 1 edges**, one path between any two nodes, and no cycles. A **binary tree** has at most two children per node.
- **Depth** of a node: edges from the root (root = 0). **Height** of a node: edges on the longest path down to a leaf (leaf = 0). Some problems count nodes instead (LeetCode's "maximum depth" does); say which you use.
- **Full**: every node has 0 or 2 children. **Complete**: all levels full except possibly the last, filled left to right (heaps). **Perfect**: all leaves on the same level, 2^(h+1) − 1 nodes.
- **Balanced** (height-balanced): at every node the two subtree heights differ by at most 1, so height is O(log n). A **degenerate** tree is a linked list, height n − 1.
- Most tree algorithms are O(n) time and **O(h)** space for recursion, where h is between log n and n.

### deep
#### Intuition

Trees model hierarchy: folders, organization charts, parsed expressions, decisions. The vocabulary exists so you can describe shape precisely, because shape decides cost: operations that walk from the root to a leaf take $O(h)$, and $h$ ranges from $\log_2 n$ in a balanced tree to $n - 1$ in a chain.

#### The standard node

```cpp
// The binary tree node used throughout the tree topics (LeetCode's shape).
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

int height(TreeNode* root) {              // in edges; an empty tree has height -1
    if (!root) return -1;
    return 1 + max(height(root->left), height(root->right));
}

int countNodes(TreeNode* root) {
    return root ? 1 + countNodes(root->left) + countNodes(root->right) : 0;
}
```

#### Worked example

```
        1
       / \
      2   3
     / \    \
    4   5    6
```

| property | value | reason |
|---|---|---|
| root | 1 | no parent |
| leaves | 4, 5, 6 | no children |
| depth of 5 | 2 | edges 1→2→5 |
| height of 3 | 1 | 3→6 |
| height of the tree | 2 | longest root-to-leaf path |
| full? | no | node 3 has one child |
| complete? | no | the last level isn't filled left to right (5 is followed by a gap, then 6) |
| perfect? | no | not every internal node has two children |
| balanced? | yes | every node's subtree heights differ by at most 1 |

#### Useful counts

- A perfect binary tree of height $h$ has $2^{h+1} - 1$ nodes and $2^h$ leaves.
- A complete binary tree with $n$ nodes has height $\lfloor \log_2 n \rfloor$.
- In any binary tree, the number of leaves equals the number of nodes with two children plus one.
- A binary tree with $n$ nodes has $n + 1$ null child pointers.

#### Edge cases and bugs

- The empty tree: decide what height it has (−1 in edges, 0 in nodes).
- Confusing depth (measured from the root down) with height (measured from a node to the bottom).
- Assuming balance: a BST built from sorted input is a chain.

#### Variants

N-ary trees (a list of children), trees stored as parent arrays, rooted versus unrooted trees (graph problems), and binary trees stored in arrays (heaps: children at `2i + 1` and `2i + 2`).

Connects to: DFS traversals, level-order traversal, binary heaps, balanced BSTs.

### questions
Q: What is the difference between depth and height?
A: Depth is measured from the root down to a node: the number of edges on that path, so the root has depth 0. Height is measured from a node down to its deepest leaf, so leaves have height 0; the tree's height is the root's height.

Q: Define full, complete and perfect binary trees.
A: A full tree has every node with either 0 or 2 children. A complete tree has every level full except possibly the last, whose nodes are packed to the left. A perfect tree has every internal node with two children and all leaves at the same depth, so it has 2^(h+1) − 1 nodes.

Q: What does balanced mean, and why does it matter?
A: A height-balanced binary tree has, at every node, left and right subtree heights differing by at most 1. That keeps the height O(log n), so operations that walk root to leaf, like BST search, take O(log n) instead of O(n).

Q: How many edges does a tree with n nodes have, and why?
A: n − 1. Every node except the root has exactly one edge to its parent, and there are no other edges because a tree has no cycles.

Q: What is the space complexity of a recursive traversal of a tree?
A: O(h), the height of the tree, for the call stack. That's O(log n) for a balanced tree but O(n) for a degenerate one, where the recursion may overflow on large inputs.

## dsa.trees.dfs-traversals
name: "DFS traversals"
importance: must
pattern: true
prereqs: [dsa.recursion.recursion-fundamentals, dsa.trees.tree-terminology]
scope: "preorder, inorder, postorder, recursive and iterative"

### simple
Depth-first traversal visits a tree by going as deep as possible down one branch before backing up to try the next. The three orders differ only in when you look at a node: before its children (preorder), between them (inorder) or after them (postorder). It is like exploring a building floor by floor through stairwells, noting each room on the way down, in the middle, or on the way back up.

### interview
- **Preorder** (node, left, right): copy or serialize a tree, print the structure top-down.
- **Inorder** (left, node, right): visits a **BST in sorted order**.
- **Postorder** (left, right, node): compute from children first (heights, sizes, deleting a tree).
- Recursive: three lines. Iterative: explicit stack. Preorder: pop, visit, push right then left. Inorder: go left pushing nodes, pop and visit, move to the right child.
- All are **O(n)** time and **O(h)** space; Morris traversal gets O(1) extra space.
- Choosing the order is the design decision: do you need the parent's info before the children (pre), or the children's results for the parent (post)?

### deep
#### Intuition

Every DFS visits nodes along the same path through the tree; the order only says when a node is "reported". Think of walking around the tree's outline starting at the root: preorder reports a node when you first pass it on its left side, inorder when you pass under it, postorder when you leave it on its right side.

#### Worked example

```
        1
       / \
      2   3
     / \
    4   5
```

| order | sequence |
|---|---|
| preorder | 1 2 4 5 3 |
| inorder | 4 2 5 1 3 |
| postorder | 4 5 2 3 1 |

#### Code

```cpp
void preorder(TreeNode* n, vector<int>& out) {
    if (!n) return;
    out.push_back(n->val);         // node first
    preorder(n->left, out);
    preorder(n->right, out);
}

vector<int> inorderIterative(TreeNode* root) {
    vector<int> out;
    vector<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push_back(cur); cur = cur->left; }   // go as far left as possible
        cur = st.back(); st.pop_back();
        out.push_back(cur->val);                              // visit
        cur = cur->right;                                     // then the right subtree
    }
    return out;
}

vector<int> postorderIterative(TreeNode* root) {
    vector<int> out;                                          // node, right, left, reversed
    vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* n = st.back(); st.pop_back();
        out.push_back(n->val);
        if (n->left) st.push_back(n->left);
        if (n->right) st.push_back(n->right);
    }
    reverse(out.begin(), out.end());
    return out;
}
```

#### Recursive or iterative?

Write the recursive version first in an interview: it is short and hard to get wrong. Offer the iterative version when the tree may be very deep (a chain of $10^5$ nodes overflows a default stack), when the interviewer asks for it, or when you need to pause the traversal between steps, as a BST iterator does. The iterative inorder loop is worth memorizing exactly, because several BST problems are built on it.

#### Complexity

Every node is pushed and popped (or called) once: $O(n)$ time. The stack holds at most one root-to-leaf path: $O(h)$ space.

#### Choosing an order

| Need | Order |
|---|---|
| Sorted output from a BST, kth smallest, validate BST | inorder |
| Copy, serialize, or pass information downward | preorder |
| Results computed from children (height, sums, deletion) | postorder |

#### Edge cases and bugs

- Empty tree: return an empty list, don't push null onto the stack.
- Iterative preorder must push the right child before the left.
- The "reverse of modified preorder" postorder trick produces the right order but not a true postorder walk (you can't stop early mid-traversal).

#### Variants

- N-ary tree traversals (loop over children).
- Iterative postorder with a `lastVisited` pointer (a true postorder walk).
- Morris traversal: inorder in O(1) space by temporarily threading right pointers.
- Traversals are the base of tree construction and serialization.

Connects to: recursion fundamentals, level-order traversal, BST inorder tricks, tree construction.

### questions
Q: What are preorder, inorder and postorder traversals?
A: They are depth-first orders that differ in when the node is visited relative to its subtrees: preorder visits node, left, right; inorder visits left, node, right; postorder visits left, right, node. All take O(n) time.

Q: Which traversal gives the values of a BST in sorted order, and why?
A: Inorder. In a BST everything in the left subtree is smaller than the node and everything in the right subtree is larger, so visiting left, node, right lists values in increasing order.

Q: How do you do an inorder traversal without recursion?
A: Use a stack. Push nodes while moving left until you hit null, then pop a node, visit it, and move to its right child, repeating the process. Stop when both the current pointer is null and the stack is empty.

Q: When would you choose postorder?
A: When a node's answer depends on its children's answers, such as computing heights, subtree sums or diameters, or freeing a tree's memory. Postorder guarantees both children are processed before the node.

Q: What is the space complexity of DFS on a tree?
A: O(h), where h is the height, because the recursion stack or explicit stack holds at most one path from the root. That ranges from O(log n) for a balanced tree to O(n) for a chain.

### signals
- visit every node of a tree in a specific order (before, between or after children)
- sorted order from a binary search tree
- copy, print or serialize a tree's structure
- answers that combine information from both subtrees

### template
```cpp
// DFS skeleton: choose where the "visit" happens.
void dfs(TreeNode* node) {
    if (!node) return;                 // base case: empty subtree
    // preorder work here (node before children; pass info down)
    dfs(node->left);
    // inorder work here (BST: values in sorted order)
    dfs(node->right);
    // postorder work here (children done; combine their results)
}
```

## dsa.trees.level-order-traversal
name: "Level-order traversal"
importance: must
pattern: true
prereqs: [dsa.trees.tree-terminology]
scope: "BFS by levels, zigzag, right side view, width"

### simple
Level-order traversal visits a tree one level at a time, from top to bottom and left to right, like reading a pyramid of names row by row. A queue does the work: take the next node from the front and add its children to the back. Counting how many nodes are in the queue at the start of each level lets you keep the levels apart.

### interview
- BFS with a queue: `while (!q.empty()) { int size = q.size(); for (size times) { pop, record, push children } }`. The **size snapshot** separates levels.
- **O(n)** time, **O(w)** space where w is the maximum width (up to n/2 in a perfect tree).
- **Zigzag**: alternate the direction per level (fill a level array from the back, or reverse odd levels).
- **Right side view**: the last node of each level. **Left view**: the first.
- **Maximum width** (including nulls between): track positions `i` with children `2i` and `2i + 1`; width = last − first + 1 per level; re-base positions per level to avoid overflow.
- Also: level averages, minimum depth (first leaf found), connect next pointers.

### deep
#### Intuition

A queue processes nodes in the order they were discovered, and children are discovered level by level. If at the start of a level you remember how many nodes are in the queue, you know exactly which nodes belong to that level, even though their children are being added behind them.

#### Worked example: zigzag of

```
        3
       / \
      9   20
         /  \
        15   7
```

| level | queue at start | values | direction | output row |
|---|---|---|---|---|
| 0 | 3 | 3 | left to right | 3 |
| 1 | 9 20 | 9 20 | right to left | 20 9 |
| 2 | 15 7 | 15 7 | left to right | 15 7 |

#### Code

```cpp
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> levels;
    if (!root) return levels;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();                       // nodes on this level
        vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* n = q.front(); q.pop();
            level.push_back(n->val);
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        levels.push_back(level);
    }
    return levels;
}

int widthOfBinaryTree(TreeNode* root) {
    if (!root) return 0;
    queue<pair<TreeNode*, unsigned long long>> q;  // node, position in a complete tree
    q.push({root, 0});
    unsigned long long best = 0;
    while (!q.empty()) {
        int size = q.size();
        unsigned long long first = q.front().second, last = first;
        for (int i = 0; i < size; i++) {
            auto [n, pos] = q.front(); q.pop();
            pos -= first;                          // re-base to keep numbers small
            last = pos;
            if (n->left) q.push({n->left, 2 * pos});
            if (n->right) q.push({n->right, 2 * pos + 1});
        }
        best = max(best, last + 1);
    }
    return (int)best;
}
```

#### BFS or DFS for per-level questions?

Anything phrased "per level" can also be done with DFS by passing the depth and writing into `result[depth]`: the right side view becomes "the first node seen at each depth when visiting right before left". DFS uses $O(h)$ space instead of $O(w)$, which is better for wide, shallow trees. BFS is more natural when the order within a level matters or when you want to stop at the first level that meets a condition.

#### Complexity

$O(n)$ time; $O(w)$ space for the queue, where $w$ is the widest level. A perfect tree's last level holds about $n/2$ nodes, so the worst case is $O(n)$.

#### Edge cases and bugs

- Reading `q.size()` inside the loop condition instead of snapshotting it merges levels.
- Width positions overflow for deep, sparse trees (they double each level); re-basing each level keeps them small.
- Empty tree: return an empty result.

#### Variants

- Bottom-up level order (reverse the result), level averages, largest value per level.
- Minimum depth: BFS stops at the first leaf, which is faster than DFS on unbalanced trees.
- Populate next-right pointers, including the O(1)-space version that walks each level using the pointers built for the level above.
- Vertical order (BFS with column indices).

Connects to: BFS on graphs, queues, views and vertical order, tree terminology.

### questions
Q: How do you print a binary tree level by level?
A: Use a queue starting with the root. For each level, record the queue's size, then pop exactly that many nodes, recording their values and pushing their children. The size snapshot keeps each level's nodes together.

Q: How do you get the right side view of a tree?
A: Do a level-order traversal and record the last node of each level. Alternatively, do a DFS visiting right before left and record the first node you reach at each new depth.

Q: How do you compute the maximum width of a tree, counting gaps between nodes?
A: Give nodes positions as in a complete tree: children of position p are 2p and 2p + 1. Each level's width is the last position minus the first plus one. Subtract the first position at each level to keep numbers from overflowing.

Q: Why is BFS better than DFS for the minimum depth?
A: BFS explores level by level and can stop at the first leaf it meets, which is at the minimum depth. DFS may explore a very deep branch fully before finding a shallow leaf.

Q: What is the space complexity of level-order traversal?
A: O(w), the maximum number of nodes on one level, since the queue holds at most about one level at a time. For a perfect tree the last level has roughly n/2 nodes, so the worst case is O(n).

### signals
- process or print a tree level by level
- the leftmost or rightmost node at each depth
- zigzag or spiral order of levels
- per-level values: averages, maximums, widths
- the shallowest node satisfying a condition

### template
```cpp
// BFS by levels: snapshot the queue size to process one level at a time.
template <class OnLevel>
void byLevels(TreeNode* root, OnLevel onLevel) {
    if (!root) return;
    queue<TreeNode*> q;
    q.push(root);
    for (int depth = 0; !q.empty(); depth++) {
        int size = q.size();
        vector<TreeNode*> level;
        for (int i = 0; i < size; i++) {
            TreeNode* n = q.front(); q.pop();
            level.push_back(n);
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
        onLevel(depth, level);         // first, last, sums, zigzag, ...
    }
}
```

## dsa.trees.bottom-up-tree-recursion
name: "Bottom-up tree recursion"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "height, diameter, balanced check, max path sum (return a value, update a global answer)"

### simple
Bottom-up recursion asks each subtree to report a small summary to its parent, such as its height, and the parent combines the two reports. It is like a company where each team lead reports their team's numbers to their manager, who adds their own and reports upward. Sometimes the best answer is found inside a subtree rather than at the top, so you also keep a running record of the best seen anywhere.

### interview
- Postorder: compute results for left and right children, combine them for the node, return upward.
- **Height**: `1 + max(left, right)`. **Size**, **sum**: add the children.
- **Diameter** (longest path between any two nodes): at each node, the path through it has length `leftHeight + rightHeight` (in edges); keep a **global maximum**, but return the height.
- **Balanced check**: return the height, or −1 as a "not balanced" signal that propagates up. O(n) instead of O(n²).
- **Maximum path sum**: return the best **downward** path (`node + max(0, left, right)`), and update the global answer with `node + max(0, left) + max(0, right)`.
- Key idea: what the function **returns** (usable by the parent) can differ from the **answer** (which may bend through a node).

### deep
#### Intuition

A single postorder traversal can compute many properties if each call returns exactly what the parent needs. The trap is that the best answer for the whole problem (a path that bends at some node) usually can't be extended by the parent. So you return one thing (the best path going straight down, which a parent can extend) and record another (the best bent path) in a variable outside the recursion.

#### Worked example: maximum path sum

```
       -10
       /  \
      9    20
          /  \
         15   7
```

| node | best down-path from left | from right | returns (node + max(0, l, r)) | path through node | global best |
|---|---|---|---|---|---|
| 9 | 0 | 0 | 9 | 9 | 9 |
| 15 | 0 | 0 | 15 | 15 | 15 |
| 7 | 0 | 0 | 7 | 7 | 15 |
| 20 | 15 | 7 | 35 | 20 + 15 + 7 = 42 | 42 |
| −10 | 9 | 35 | 25 | −10 + 9 + 35 = 34 | 42 |

Answer: **42** (15 → 20 → 7), a path that bends at 20 and could never be returned to the root.

#### Code

```cpp
int diameterOfBinaryTree(TreeNode* root) {
    int best = 0;                                           // in edges
    function<int(TreeNode*)> height = [&](TreeNode* n) -> int {
        if (!n) return 0;                                   // height in nodes here
        int l = height(n->left), r = height(n->right);
        best = max(best, l + r);                            // longest path bending at n
        return 1 + max(l, r);                               // what the parent can extend
    };
    height(root);
    return best;
}

int maxPathSum(TreeNode* root) {
    int best = INT_MIN;
    function<int(TreeNode*)> down = [&](TreeNode* n) -> int {
        if (!n) return 0;
        int l = max(0, down(n->left));                      // drop negative branches
        int r = max(0, down(n->right));
        best = max(best, n->val + l + r);
        return n->val + max(l, r);
    };
    down(root);
    return best;
}
```

#### Complexity

One postorder pass: $O(n)$ time, $O(h)$ space. The naive balanced check that recomputes heights at every node is $O(n^2)$ on a chain, which is why the combined "height or −1" return matters.

#### Edge cases and bugs

- Counting diameter in nodes instead of edges (off by one).
- Initializing the global max path sum to 0 when all values are negative; start at `INT_MIN` (the answer must contain at least one node).
- Returning the bent path to the parent (it can't extend a path that already uses both children).

#### Variants

- Count good subtrees (return several values: min, max, size, validity), largest BST subtree.
- Binary tree tilt, subtree sums, most frequent subtree sum.
- Distribute coins (return the excess, add absolute moves to a global counter).
- Tree DP where each node returns a small tuple (house robber III).

Connects to: DFS traversals, top-down tree recursion, tree DP on subtrees, lowest common ancestor.

### questions
Q: How do you find the diameter of a binary tree in O(n)?
A: Do a postorder traversal that returns each subtree's height. At every node, the longest path passing through it has length left height + right height, so update a global maximum with that, and return 1 + max(left, right) to the parent.

Q: Why do bottom-up problems often use a global variable?
A: The best answer may bend through a node, using both children, and such a path can't be extended upward. So the function returns what the parent can use, such as the best straight path down, while the global variable records the best bent path seen anywhere.

Q: How do you check whether a tree is height-balanced in O(n)?
A: Return the subtree height from each call, or a sentinel like −1 when a subtree is unbalanced. A node is unbalanced if either child returned −1 or their heights differ by more than 1. Each node is visited once.

Q: In maximum path sum, why take max(0, child)?
A: A child path with a negative sum only lowers the total, so it is better to not extend into that child at all. Clamping at 0 means "stop the path at this node" on that side.

Q: What is the complexity of computing heights naively inside a balance check at every node?
A: O(n²) in the worst case, since a chain recomputes the heights of long subtrees at each node. Returning the height from the same recursion that checks balance brings it to O(n).

### signals
- a property computed from both children's results: height, size, sums, diameter
- the longest or maximum-sum path anywhere in the tree, not necessarily through the root
- check a property that must hold at every node (balanced, BST, uni-value)
- "return one thing, record another"

### template
```cpp
// Bottom-up: return what the parent needs; record the answer that may bend at this node.
struct Solver {
    long long best = LLONG_MIN;              // global answer (e.g. best path)
    long long down(TreeNode* n) {            // e.g. best downward path from n
        if (!n) return 0;
        long long l = max(0LL, down(n->left));
        long long r = max(0LL, down(n->right));
        best = max(best, n->val + l + r);    // answer using both sides
        return n->val + max(l, r);           // parent can extend only one side
    }
};
```

## dsa.trees.top-down-tree-recursion
name: "Top-down tree recursion"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "passing state down, path sums, good nodes"

### simple
Top-down recursion carries information from the root toward the leaves, handing each child what it needs to know about the path above it. It is like passing a note down a line of people where each person adds their own number before handing it on. When the note reaches a leaf, it holds everything about the path from the root.

### interview
- Pass state as **parameters**: the running sum, the maximum so far, the current depth, the path.
- **Path sum** (root to leaf equals target): subtract the node's value on the way down; check at a leaf.
- **Good nodes** (no larger value above): pass the maximum seen so far; a node is good if its value ≥ that maximum.
- **All root-to-leaf paths**: pass a path list; append before recursing and pop after (backtracking), or pass copies.
- **Path sum III** (any downward path summing to K): prefix sums along the current path in a hash map; add on the way down, remove on the way up. O(n).
- Preorder shape: act on the node using the incoming state, then recurse with the updated state.

### deep
#### Intuition

Some questions depend on the path from the root, not on the subtree below: "is this node larger than every ancestor?" or "does the path from the root to here add up to K?". The answer needs information from above, so the parent passes it down. Each call receives what it needs as arguments, does its local check, and passes updated arguments to its children.

#### Worked example: count good nodes

```
        3
       / \
      1   4
     /   / \
    3   1   5
```

| node | max on the path above | good? (value ≥ max) | max passed to children |
|---|---|---|---|
| 3 (root) | −∞ | yes | 3 |
| 1 | 3 | no | 3 |
| 3 (left leaf) | 3 | yes | 3 |
| 4 | 3 | yes | 4 |
| 1 (under 4) | 4 | no | 4 |
| 5 | 4 | yes | 5 |

Four good nodes.

#### Code

```cpp
int goodNodes(TreeNode* n, int maxAbove = INT_MIN) {
    if (!n) return 0;
    int good = n->val >= maxAbove ? 1 : 0;
    int m = max(maxAbove, n->val);                          // state for the children
    return good + goodNodes(n->left, m) + goodNodes(n->right, m);
}

// Number of downward paths (any start, any end below it) summing to target.
int pathSumIII(TreeNode* root, long long target) {
    unordered_map<long long, int> prefixCount{{0, 1}};      // prefix sums on the current path
    function<int(TreeNode*, long long)> dfs = [&](TreeNode* n, long long sum) -> int {
        if (!n) return 0;
        sum += n->val;
        int count = prefixCount.count(sum - target) ? prefixCount[sum - target] : 0;
        prefixCount[sum]++;                                 // enter this node
        count += dfs(n->left, sum) + dfs(n->right, sum);
        prefixCount[sum]--;                                 // leave: undo before returning
        return count;
    };
    return dfs(root, 0);
}
```

#### Complexity

Each node is visited once: $O(n)$ time, $O(h)$ stack. Collecting all paths costs $O(n \cdot h)$ for copying the output. Path sum III is $O(n)$ with the prefix map (versus $O(n^2)$ by starting a search at every node).

#### Top-down or bottom-up?

| Information flows | Style | Example |
|---|---|---|
| from ancestors to descendants | top-down (parameters) | good nodes, path sums from the root, depth |
| from descendants to ancestors | bottom-up (return values) | height, diameter, subtree sums |
| both | combine: pass down and return up | path sum III (prefix map down, counts up) |

#### Edge cases and bugs

- Path sum must end at a **leaf**: checking at any node with a matching sum is wrong for the classic problem.
- Forgetting to undo shared state (`path.pop()`, `prefixCount[sum]--`).
- Negative values: path sum III must not stop early when the sum exceeds the target.

#### Variants

- Sum of root-to-leaf numbers (pass `value * 10 + digit`).
- Pseudo-palindromic paths (pass a bitmask of digit parities).
- Maximum difference between a node and an ancestor (pass the min and max above).
- Smallest string starting from a leaf (pass the path, compare at leaves).

Connects to: DFS traversals, bottom-up tree recursion, prefix sum with hash map, backtracking.

### questions
Q: What is top-down recursion on a tree?
A: A traversal where each call receives information about the path above it as parameters, such as a running sum or the maximum so far, uses it to decide something about the current node, and passes updated values to its children. It's the natural fit for questions about root-to-node paths.

Q: How do you count good nodes, whose value is at least every value on the path from the root?
A: DFS from the root carrying the maximum value seen so far. A node is good if its value is at least that maximum; pass max(current max, node value) to both children. It's O(n).

Q: How do you count downward paths with a given sum in O(n)?
A: Do a DFS keeping the running sum from the root and a hash map of prefix sums on the current path, seeded with {0: 1}. At each node, add the count of (sum − target) from the map, add the current sum to the map, recurse, then remove it before returning.

Q: Why must you undo changes to shared state when returning from a node?
A: The shared list or map should describe only the current root-to-node path. Once you return from a node, it's no longer on the path, so leaving its entry would corrupt the results for sibling subtrees.

### signals
- conditions on the path from the root to a node (ancestors' values, running sums)
- root-to-leaf path sums or listing all root-to-leaf paths
- "compared with all ancestors" or "maximum on the path so far"
- counting downward paths with a target sum

### template
```cpp
// Top-down: carry path state as parameters; check at nodes or leaves.
int topDown(TreeNode* n, long long state) {
    if (!n) return 0;
    long long next = state + n->val;               // update with this node (sum, max, mask...)
    int here = 0;
    if (!n->left && !n->right) here = (next == 0); // leaf check (example: remaining sum)
    return here + topDown(n->left, next) + topDown(n->right, next);
}
```

## dsa.trees.lowest-common-ancestor
name: "Lowest common ancestor"
importance: must
prereqs: [dsa.trees.bottom-up-tree-recursion]
scope: "in a binary tree and in a BST"

### simple
The lowest common ancestor of two nodes is the deepest node that has both of them below it, like the most recent shared grandparent in a family tree. In a binary search tree you find it by walking down from the root toward both values until they split to different sides. In a general tree, each subtree reports whether it contains either node, and the first node that hears "yes" from both sides is the answer.

### interview
- **BST**: from the root, if both values are smaller go left, if both larger go right, otherwise the current node is the LCA. **O(h)** time, O(1) space iteratively.
- **Binary tree**: recursive: if the node is null or equals p or q, return it; recurse left and right; if both return non-null, the node is the LCA; otherwise return the non-null side. **O(n)**.
- That recursion assumes both nodes exist; if not guaranteed, count how many were found.
- With parent pointers: walk up from both like the linked-list intersection trick, or put one node's ancestors in a set.
- Many queries: **binary lifting** (O(log n) per query after O(n log n) preprocessing) or Euler tour plus RMQ.
- Distance between two nodes = depth(p) + depth(q) − 2 · depth(LCA).

### deep
#### Intuition

In a BST, values tell you where nodes are: at a node between p and q (inclusive), p and q are on different sides (or one of them is the node), so the node is their split point. In a general binary tree, there is no order, so ask each subtree "do you contain p or q?". The first node, on the way back up, where both subtrees answer yes (or the node itself is one of them and a subtree answers yes) is the lowest common ancestor.

#### Worked example (binary tree)

```
          3
        /   \
       5     1
      / \   / \
     6   2 0   8
        / \
       7   4
```

LCA of 7 and 4: at node 2, the left subtree returns 7 and the right returns 4, so 2 is returned. Nodes 5 and 3 each get a non-null result from only one side and pass the 2 upward. Answer: **2**.

LCA of 5 and 4: the recursion at node 5 returns 5 immediately (it equals p) without exploring below. The root's right subtree returns null, so the answer is **5**, which is correct because 4 is below 5.

#### Code

```cpp
TreeNode* lcaBST(TreeNode* root, int p, int q) {
    while (root) {
        if (p < root->val && q < root->val) root = root->left;
        else if (p > root->val && q > root->val) root = root->right;
        else return root;                              // split point (or equal to one of them)
    }
    return nullptr;
}

TreeNode* lca(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (!root || root == p || root == q) return root;
    TreeNode* l = lca(root->left, p, q);
    TreeNode* r = lca(root->right, p, q);
    if (l && r) return root;                           // p and q on different sides
    return l ? l : r;                                  // pass up whatever was found
}
```

#### Complexity

- BST: $O(h)$ time, $O(1)$ space.
- Binary tree: $O(n)$ time, $O(h)$ stack.
- Parent pointers: $O(h)$ time, $O(1)$ space.

#### Edge cases and bugs

- One node is an ancestor of the other: the recursion returns the ancestor, which is correct.
- Nodes not present: the basic recursion returns the one it finds, which is wrong; use the counting version.
- Comparing values instead of node identity in the binary tree version when values repeat.

#### Variants

- LCA of deepest leaves (bottom-up returning depth and candidate).
- LCA of many nodes (return a node when it is any of the targets).
- Distance between nodes, path between nodes (via the LCA).
- Offline LCA with union-find (Tarjan's), online with binary lifting.

Connects to: bottom-up tree recursion, BST operations, binary lifting, linked list intersection.

### questions
Q: How do you find the LCA in a binary search tree?
A: Start at the root. If both values are less than the node, go left; if both are greater, go right. Otherwise the values split here (or one equals the node), so the current node is the LCA. It takes O(h) time and O(1) space.

Q: How do you find the LCA in a general binary tree?
A: Recurse: return the node if it is null, p or q. Otherwise compute the results of both subtrees. If both are non-null, p and q are on different sides, so this node is the LCA; otherwise return whichever side is non-null. It's O(n).

Q: Why is it fine to stop at a node that equals p without searching below it?
A: If q is below p, then p is the LCA and returning p is correct. If q is elsewhere, another subtree will return q, and the first common ancestor where both are found will be returned instead. The assumption is that both nodes exist in the tree.

Q: What happens in the recursive LCA if one of the nodes is missing from the tree?
A: It returns the node that was found, which is not a valid LCA. To handle missing nodes, count how many of p and q the traversal actually found and return null unless both were found.

Q: How do you answer many LCA queries quickly?
A: Preprocess with binary lifting: store each node's 2^k-th ancestor and its depth. Lift the deeper node to the same depth, then lift both together by decreasing powers of two while their ancestors differ. Each query takes O(log n) after O(n log n) preprocessing.

## dsa.trees.tree-construction
name: "Tree construction"
importance: important
prereqs: [dsa.trees.dfs-traversals]
scope: "from preorder and inorder, from postorder and inorder"

### simple
You can rebuild a binary tree from two of its traversal orders. Preorder tells you which node is the root (it comes first), and inorder tells you which nodes are on its left and which on its right. Repeating that split for each subtree rebuilds the whole tree, like reassembling a family tree from two differently sorted guest lists.

### interview
- **Preorder + inorder**: the first preorder value is the root; its position in inorder splits the left and right subtrees; recurse with the matching ranges.
- Use a **hash map value → inorder index** so each split is O(1): **O(n)** total (O(n²) with linear search).
- Keep a moving **preorder index** instead of slicing arrays.
- **Postorder + inorder**: the root is the **last** postorder value; build the **right** subtree first when consuming postorder from the end.
- Preorder + postorder doesn't determine a unique tree unless it's full.
- Values must be **distinct** for the inorder lookup to be unambiguous.

### questions
Q: How do you rebuild a binary tree from its preorder and inorder traversals?
A: The first element of preorder is the root. Find it in inorder: everything to its left forms the left subtree and everything to its right forms the right subtree. Recurse on those ranges, taking roots from preorder in order. With a hash map of inorder positions, it's O(n).

Q: Why do you need a hash map of inorder indices?
A: Each recursive call must find the root's position in the inorder range. Searching linearly costs O(n) per call, O(n²) overall; a precomputed map from value to index makes each lookup O(1).

Q: What changes when building from postorder and inorder?
A: The root is the last element of postorder. Consuming postorder from the end gives root, then right subtree, then left, so build the right subtree before the left.

Q: Can you rebuild a tree from preorder and postorder alone?
A: Not uniquely in general: a node with a single child could have it on either side, and both traversals look the same. It works for full binary trees, where every node has zero or two children.

## dsa.trees.serialize-and-deserialize
name: "Serialize and deserialize"
importance: important
scope: "preorder with null markers, level order"

### simple
Serializing a tree turns it into a string so it can be saved or sent, and deserializing rebuilds the same tree from that string. Writing each node in preorder and marking empty children with a placeholder like "#" is enough to rebuild the exact shape. It is like describing a family tree aloud so precisely that someone else can redraw it.

### interview
- **Preorder with null markers**: `1,2,#,#,3,4,#,#,5,#,#`. Deserialize by reading tokens recursively: a `#` returns null, otherwise build the node, then its left, then its right. O(n).
- **Level order with nulls** (LeetCode style): BFS writing children, including nulls; trailing nulls can be trimmed.
- The null markers make one traversal enough (without them you'd need two traversals and distinct values).
- **BST** special case: preorder alone suffices (no markers), rebuilding with value bounds; more compact.
- Use a separator between values; handle negative and multi-digit numbers.

### questions
Q: How do you serialize a binary tree so it can be rebuilt exactly?
A: Write a preorder traversal where every null child is written as a marker such as "#", with values separated by commas. Deserialize by reading tokens in the same order: a marker means null; otherwise create the node and recursively build its left and right children.

Q: Why are null markers needed?
A: Without them, a single traversal doesn't capture the shape: a node with only a left child and one with only a right child produce the same sequence. Marking nulls records exactly where subtrees end.

Q: How can a BST be serialized more compactly?
A: Store only its preorder values without null markers. To rebuild, read values in order and place each one using bounds: a value belongs in the current subtree only if it fits between the allowed minimum and maximum, which the BST ordering determines.

Q: What is the complexity of serialize and deserialize?
A: Both are O(n) time, visiting each node and each null marker once, and the string has O(n) tokens. The recursion uses O(h) stack; a BFS-based version avoids deep recursion.

## dsa.trees.views-and-vertical-order
name: "Views and vertical order"
importance: important
prereqs: [dsa.trees.level-order-traversal]
scope: "top, bottom, left, right views, vertical traversal with coordinates"

### simple
Views describe what you would see looking at a tree from one side. From the left you see the first node on each level, from the right the last one, and from above the topmost node in each vertical column. Giving every node a row and a column number turns all these questions into simple bookkeeping.

### interview
- Give coordinates: root `(row 0, col 0)`; left child `(row + 1, col − 1)`; right child `(row + 1, col + 1)`.
- **Left/right view**: first/last node per level (BFS), or DFS recording the first node seen at each new depth.
- **Top view**: for each column, the node with the smallest row (BFS guarantees the first seen is the topmost).
- **Bottom view**: for each column, the last node seen in BFS (the deepest; ties go to the later one).
- **Vertical order traversal** (sorted by column, then row, then value): collect `(col, row, val)`, sort, group by column. O(n log n).
- Columns range over `[−n, n]`; use an offset array or an ordered map.

### questions
Q: How do you compute the top view of a binary tree?
A: Assign each node a column: the root is 0, left children subtract 1, right children add 1. Traverse in BFS order and keep, for each column, the first node you meet, which is the topmost. Output columns from left to right.

Q: Why use BFS rather than DFS for the top view?
A: BFS visits nodes in order of depth, so the first node seen in a column is guaranteed to be the highest. A DFS could reach a deeper node in a column before a shallower one, requiring you to compare rows explicitly.

Q: How does vertical order traversal break ties?
A: Sort all nodes by (column, row, value): by column first, then from top to bottom, and nodes in the same row and column by value. Then group consecutive nodes with the same column. That's O(n log n).

Q: How do you get the left side view with DFS?
A: Visit the left child before the right child and pass the depth. The first time you reach a new depth, that node is the leftmost at that depth, so record it.

## dsa.trees.trees-as-graphs
name: "Trees as graphs"
importance: important
scope: "nodes at distance K using parent pointers"

### simple
A tree is a special graph, and some tree questions are easier if you forget about "up" and "down". To find all nodes at distance K from a given node, you need to move to parents as well as children. Adding parent links turns the tree into an ordinary undirected graph, and a breadth-first search from the node finds everything K steps away.

### interview
- Build a **parent map** with one DFS (or an adjacency list), then treat edges as undirected.
- **Nodes at distance K**: BFS from the target over left, right and parent, with a visited set; collect the level K frontier. **O(n)**.
- **Time to infect/burn the whole tree** from a node: BFS from it; the answer is the number of levels.
- Tree facts in graph language: connected, acyclic, n − 1 edges, a unique path between any two nodes.
- Tree diameter in a general (unrooted) tree: BFS from any node to the farthest node u, then BFS from u; the farthest distance is the diameter.

### questions
Q: How do you find all nodes at distance K from a target node in a binary tree?
A: First record each node's parent with a DFS. Then BFS from the target, treating left child, right child and parent as neighbors and marking visited nodes. The nodes in the frontier after K levels are the answer. It's O(n) time and space.

Q: Why do you need a visited set in the BFS on a tree with parent pointers?
A: With parent links, edges can be followed in both directions, so without marking you would go from a child to its parent and back to the child forever. The visited set makes it a proper BFS on an undirected graph.

Q: How do you find the diameter of an unrooted tree given as edges?
A: Run BFS or DFS from any node to find the farthest node u. Run it again from u; the farthest distance found is the diameter. This works because the farthest node from any start is an endpoint of some longest path.

Q: How long does it take for an infection to spread through a tree from one node, spreading one edge per minute?
A: Convert the tree to an undirected graph with parent pointers and BFS from the starting node. The number of BFS levels minus one, the largest distance from the start, is the time in minutes.

## dsa.trees.morris-traversal
name: "Morris traversal"
importance: advanced
scope: "O(1) space inorder"

### simple
Morris traversal walks a binary tree in order without a stack or recursion, using only a couple of pointers. It temporarily points the rightmost node of each left subtree back to the current node, like leaving a string to find your way back through a maze. After using each temporary link once, it removes it, so the tree ends up unchanged.

### interview
- For the current node: if it has no left child, visit it and go right.
- Otherwise find its **inorder predecessor** (rightmost node of the left subtree). If the predecessor's right is null, set it to the current node (a **thread**) and go left. If it already points to the current node, remove the thread, visit the current node and go right.
- **O(n)** time (each edge walked at most a constant number of times), **O(1)** extra space.
- Temporarily modifies the tree; not safe with concurrent readers. Preorder variant: visit when creating the thread.
- Use when the interviewer asks for O(1) space inorder (recover a BST, kth smallest with no stack).

### questions
Q: How does Morris traversal avoid a stack?
A: It uses the empty right pointer of each node's inorder predecessor to point back to the node, which records where to return after finishing the left subtree. When the traversal comes back along that thread, it removes it, visits the node and moves right.

Q: Why is Morris traversal still O(n) time even though it searches for predecessors?
A: Each predecessor search walks down the right edge of a left subtree, and each such edge is walked at most twice: once to create the thread and once to remove it. So the total work over all nodes is proportional to the number of edges.

Q: What is the downside of Morris traversal?
A: It modifies the tree temporarily, which is unsafe if other code reads the tree during the traversal, and the tree is left broken if the traversal stops early without cleaning up. The code is also trickier than the stack version.

Q: How would you do a Morris preorder traversal?
A: Same structure, but visit the node when you first create the thread to its predecessor (before going left), and when there is no left child. Don't visit again when the thread is removed.

## dsa.trees.binary-lifting
name: "Binary lifting"
importance: advanced
prereqs: [dsa.trees.lowest-common-ancestor]
scope: "kth ancestor, LCA in O(log n)"

### simple
Binary lifting precomputes, for every node, its ancestor 1, 2, 4, 8, … steps up. To jump k steps up, you break k into powers of two, like paying an amount with coins worth 1, 2, 4 and 8. That makes finding far ancestors, and the lowest common ancestor of two nodes, take only a few jumps.

### interview
- Table `up[k][v]` = the 2ᵏ-th ancestor of v: `up[0][v] = parent`, `up[k][v] = up[k−1][ up[k−1][v] ]`. **O(n log n)** time and space.
- **Kth ancestor**: for each set bit j of k, jump `v = up[j][v]`. O(log n).
- **LCA(u, v)**: lift the deeper node to the same depth; if equal, done; else for j from high to low, if `up[j][u] != up[j][v]`, jump both; the answer is `parent(u)`. O(log n).
- Needs depths (one DFS or BFS from the root). Use a sentinel (root's parent = root, or −1) for jumps past the root.
- Also: path maximums or sums (store aggregates alongside ancestors), jumping in functional graphs.

### questions
Q: What does the binary lifting table store and how is it built?
A: up[k][v] is the ancestor of v that is 2^k levels above it. It's built from parents with up[k][v] = up[k − 1][up[k − 1][v]], because jumping 2^k equals two jumps of 2^(k − 1). Building takes O(n log n).

Q: How do you find the kth ancestor of a node?
A: Write k in binary and, for every set bit j, jump v = up[j][v]. Each jump is O(1) and there are at most log k of them, so a query is O(log n).

Q: How does binary lifting find the LCA?
A: First lift the deeper node until both are at the same depth; if they are now equal, that node is the LCA. Otherwise, for j from the largest power down, jump both nodes by 2^j whenever their ancestors differ. They end just below the LCA, so the answer is their parent.

Q: When is binary lifting worth it compared with the simple recursive LCA?
A: When there are many queries on the same tree. The recursive method costs O(n) per query, while binary lifting costs O(n log n) once and then O(log n) per query.

## dsa.trees.tree-dp-on-subtrees
name: "Tree DP on subtrees"
importance: advanced
prereqs: [dsa.trees.bottom-up-tree-recursion]
scope: "house robber III, binary tree cameras"

### simple
Tree DP solves optimization problems on trees by having each node report the best result for its subtree under a few different situations. For a node you might ask "what's the best if I take this node?" and "what's the best if I skip it?", and the parent combines these answers. It is dynamic programming where the tree's shape decides the order of computation.

### interview
- Each node returns a **small tuple of states** computed from its children's tuples (postorder).
- **House robber III**: return `(robThis, skipThis)`; `robThis = val + skipLeft + skipRight`, `skipThis = max(left) + max(right)`. O(n).
- **Binary tree cameras**: states "covered without a camera", "has a camera", "not covered"; greedy postorder: place a camera at a parent of any uncovered child.
- **Maximum independent set**, **minimum vertex cover** on trees are the same shape.
- For general trees, loop over children; rerooting DP answers "for every node as root" in O(n).

### questions
Q: How do you solve house robber on a binary tree?
A: For each node return two values: the best total if you rob it and if you skip it. Robbing it adds its value to both children's "skip" results; skipping it adds the better of each child's two results. The answer is the larger value at the root, in O(n).

Q: Why is a single value per node not enough for tree DP problems like this?
A: The parent's choice depends on the child's choice: robbing a parent is only allowed if the children were skipped. Returning the best result under each child state lets the parent combine them correctly.

Q: How does the binary tree cameras solution work?
A: Postorder with three states per node: needs coverage, covered without a camera, or has a camera. If any child needs coverage, put a camera here; if any child has a camera, this node is covered; otherwise it needs coverage from its parent. At the end, add a camera at the root if it still needs coverage.

Q: What is rerooting DP?
A: A technique to compute a subtree-style answer for every node as the root in O(n): first compute answers for subtrees with one DFS, then do a second DFS that passes down the contribution of the rest of the tree to each child.
