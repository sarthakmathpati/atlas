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

### simple
A binary search tree keeps values in order: everything in a node's left subtree is smaller, and everything in its right subtree is larger. Finding a value is like a guessing game where each answer of "higher" or "lower" tells you which branch to take. Inserting and deleting follow the same path, with a little care when removing a node that has two children.

### interview
- **Search/insert**: compare and go left or right; insert where you fall off the tree. **O(h)**.
- **Delete** has three cases: a **leaf** (remove it), **one child** (replace the node with its child), **two children** (copy the **inorder successor**, the minimum of the right subtree, into the node, then delete the successor from the right subtree).
- h is O(log n) if balanced but **O(n)** if the tree degenerates (for example, inserting sorted keys).
- Duplicates need a policy: store counts, or send equal keys consistently to one side.
- Inorder traversal gives the keys in sorted order.
- Recursive versions return the (possibly new) subtree root, which keeps the parent's pointer updates simple.

### deep
#### Intuition

The BST property is the binary search invariant stored in a tree: at every node, the search space splits into "smaller" and "larger" halves. Operations follow one root-to-leaf path, so their cost is the tree's height. Deletion is the only tricky operation, because removing a node with two children would leave two orphaned subtrees; replacing its value with the next larger value (the successor) keeps the ordering intact.

#### Worked example: delete 3 from

```
        5
       / \
      3   6
     / \    \
    2   4    7
```

Node 3 has two children. Its inorder successor is the minimum of its right subtree: 4. Copy 4 into the node, then delete 4 from the right subtree (a leaf).

```
        5
       / \
      4   6
     /     \
    2       7
```

#### Code

```cpp
TreeNode* search(TreeNode* root, int key) {
    while (root && root->val != key) root = key < root->val ? root->left : root->right;
    return root;
}

TreeNode* insert(TreeNode* root, int key) {
    if (!root) return new TreeNode(key);
    if (key < root->val) root->left = insert(root->left, key);
    else if (key > root->val) root->right = insert(root->right, key);
    return root;                                       // duplicates are ignored
}

TreeNode* erase(TreeNode* root, int key) {
    if (!root) return nullptr;
    if (key < root->val) root->left = erase(root->left, key);
    else if (key > root->val) root->right = erase(root->right, key);
    else {
        if (!root->left) { TreeNode* r = root->right; delete root; return r; }   // 0 or 1 child
        if (!root->right) { TreeNode* l = root->left; delete root; return l; }
        TreeNode* succ = root->right;                  // two children: inorder successor
        while (succ->left) succ = succ->left;
        root->val = succ->val;
        root->right = erase(root->right, succ->val);
    }
    return root;
}
```

#### Why the successor keeps the tree valid

The inorder successor is the smallest key larger than the deleted key. Every key in the left subtree is smaller than the deleted key, so also smaller than the successor; every other key in the right subtree is larger than the successor, because the successor is the minimum there. Writing the successor's value into the node therefore preserves the BST property, and removing the original successor node is easy because it has no left child.

#### Complexity

| Operation | Balanced | Degenerate |
|---|---|---|
| search, insert, delete | $O(\log n)$ | $O(n)$ |
| min, max | $O(\log n)$ | $O(n)$ |
| inorder traversal | $O(n)$ | $O(n)$ |

Recursive versions use $O(h)$ stack; iterative search and insert use $O(1)$.

#### Edge cases and bugs

- Deleting the root, or a key that isn't present.
- Forgetting to reassign the child pointer (`root->left = erase(...)`), which leaves the tree unchanged.
- Using the predecessor (maximum of the left subtree) instead of the successor is equally valid; just be consistent.
- Inserting sorted data creates a chain; mention self-balancing trees.

#### Variants

- Iterative insert and delete with a parent pointer.
- Trim a BST to a range, convert a BST to a greater-sum tree (reverse inorder), recover a BST with two swapped nodes (inorder finds the two out-of-order spots).
- Augmented BSTs (store subtree sizes for order statistics).

Connects to: validate a BST, inorder tricks, self-balancing BSTs, binary search.

### questions
Q: How do you delete a node with two children from a BST?
A: Replace its value with its inorder successor, the smallest value in its right subtree, and then delete that successor from the right subtree. The successor has no left child, so its deletion is one of the easy cases. The inorder predecessor works too.

Q: What is the time complexity of BST operations?
A: O(h), the height of the tree, because each operation follows one root-to-leaf path. That is O(log n) for a balanced tree but O(n) for a degenerate one, such as a tree built by inserting sorted keys.

Q: Why do recursive BST insert and delete return the subtree root?
A: The subtree's root may change: inserting into an empty subtree creates a new root, and deleting can replace the root with a child. Returning it lets the parent reassign its child pointer in one line, with no special cases.

Q: How can you handle duplicate keys in a BST?
A: Store a count in each node, or consistently send equal keys to one side (for example, the right). Whichever you choose, searches and validity checks must use the same convention.

Q: How do you find the minimum and maximum of a BST?
A: The minimum is the leftmost node: keep following left children. The maximum is the rightmost node. Both take O(h).

## dsa.bst.validate-a-bst
name: "Validate a BST"
importance: must
prereqs: [dsa.bst.bst-operations]
scope: "range bounds, increasing inorder"

### simple
To check that a tree really is a binary search tree, it isn't enough to compare each node with its two children. Every node must fit between limits set by all its ancestors, like a guest who must be shorter than everyone on their right and taller than everyone on their left all the way up the family line. Passing those limits down while traversing checks every node against every ancestor at once.

### interview
- **Bounds method**: recurse with `(low, high)`; each node must satisfy `low < val < high`; the left child gets `(low, val)`, the right child `(val, high)`. **O(n)**.
- **Inorder method**: an inorder traversal of a BST is strictly increasing; keep the previous value and compare. O(n).
- Checking only parent and children is **wrong**: `5 → left 4 → right 6` passes the local check but 6 > 5 in the left subtree.
- Use 64-bit or null bounds because node values can equal `INT_MIN` or `INT_MAX`.
- Decide on duplicates (strict `<` means no duplicates allowed).

### deep
#### Intuition

The BST property is about whole subtrees, not just immediate children: every value in the left subtree of a node must be smaller than the node. As you go down, each step to the left lowers the upper limit and each step to the right raises the lower limit, so each node inherits an allowed interval from its ancestors.

#### Worked example

```
        5
       / \
      1   6
         / \
        3   7
```

| node | allowed range | ok? |
|---|---|---|
| 5 | (−∞, +∞) | yes |
| 1 | (−∞, 5) | yes |
| 6 | (5, +∞) | yes |
| 3 | (5, 6) | **no**: 3 < 5 |

Local checks would pass (3 < 6 is fine as a left child of 6), but 3 sits in the right subtree of 5, so the tree isn't a BST.

#### Code

```cpp
bool validRange(TreeNode* n, long long low, long long high) {
    if (!n) return true;
    if (n->val <= low || n->val >= high) return false;
    return validRange(n->left, low, n->val) && validRange(n->right, n->val, high);
}

bool isValidBST(TreeNode* root) {
    return validRange(root, LLONG_MIN, LLONG_MAX);   // wider than int, so INT_MIN/MAX work
}

bool isValidBSTInorder(TreeNode* root) {
    vector<TreeNode*> st;
    TreeNode* prev = nullptr;
    while (root || !st.empty()) {
        while (root) { st.push_back(root); root = root->left; }
        root = st.back(); st.pop_back();
        if (prev && root->val <= prev->val) return false;   // must strictly increase
        prev = root;
        root = root->right;
    }
    return true;
}
```

#### Which method to present

Both run in $O(n)$. The bounds method states the invariant directly and generalizes well (for example, to checking that a preorder sequence could come from a BST). The inorder method reuses a traversal you already know and makes the "strictly increasing" condition obvious. Mention that you would stop early on the first violation in either version, and state your duplicate policy before coding.

#### Complexity

$O(n)$ time, visiting each node once; $O(h)$ space for recursion or the stack.

#### Edge cases and bugs

- Using `INT_MIN`/`INT_MAX` as initial bounds when nodes can hold those values: a single node with value `INT_MAX` would be rejected. Use wider types or nullable bounds.
- Allowing equality when the problem forbids duplicates.
- Comparing only with the parent.

#### Variants

- Recover a BST where two nodes were swapped: in the inorder sequence, find the first and last out-of-order positions and swap them back.
- Largest BST subtree: bottom-up, each node returns (is BST, size, min, max).
- Validate a preorder sequence of a BST using a stack and a lower bound.

Connects to: BST operations, DFS traversals (inorder), bottom-up tree recursion.

### questions
Q: Why isn't it enough to check each node against its left and right child?
A: The BST property says every node in the left subtree is smaller than the node, not just the child. A grandchild can satisfy the local check with its parent while violating the order with an ancestor, like 6 in the left subtree of 5.

Q: How do you validate a BST with bounds?
A: Recurse with an allowed open interval (low, high), starting from (−∞, +∞). Each node's value must lie strictly inside; its left child gets (low, value) and its right child (value, high). It's O(n).

Q: How does an inorder traversal validate a BST?
A: The inorder sequence of a valid BST is strictly increasing. Traverse in order while remembering the previous value, and fail as soon as a value is not larger than the previous one.

Q: What goes wrong if you use INT_MIN and INT_MAX as the initial bounds?
A: A node whose value is exactly INT_MIN or INT_MAX would fail the strict check even in a valid tree. Use a wider integer type, or pass nullable bounds meaning "no limit".

## dsa.bst.inorder-tricks
name: "Inorder tricks"
importance: must
pattern: true
prereqs: [dsa.trees.dfs-traversals]
scope: "kth smallest, BST iterator, successor and predecessor"

### simple
Walking a binary search tree in order visits its values from smallest to largest, like reading a sorted list. That one fact solves many problems: the kth smallest value is the kth one you visit, and the next larger value after any node is the next one in that walk. Doing the walk step by step with a stack lets you pause and resume it.

### interview
- **Kth smallest**: iterative inorder, stop at the kth visit. **O(h + k)** time.
- **BST iterator**: keep a stack of the left spine; `next()` pops a node and pushes the left spine of its right child. **O(1) amortized** per call, **O(h)** memory.
- **Inorder successor** of p: if p has a right subtree, it's that subtree's leftmost node; otherwise it's the last ancestor where you went left. Walk from the root in O(h): `if (p->val < cur->val) { succ = cur; cur = cur->left; } else cur = cur->right;`
- **Predecessor** is the mirror image.
- Reverse inorder (right, node, left) visits values in **decreasing** order (greater-sum tree, kth largest).
- Two-sum in a BST: two iterators, one forward and one backward, like two pointers on a sorted array.

### deep
#### Intuition

The inorder walk of a BST is a sorted sequence that you never have to materialize. An explicit stack holding the "left spine" of the unvisited part lets you produce the next value on demand, so problems that would need a sorted array (kth element, two pointers, merging) work directly on the tree in $O(h)$ memory.

#### Worked example: BST iterator

```
        7
       / \
      3   15
         /  \
        9    20
```

| call | stack before (top right) | returns | pushes |
|---|---|---|---|
| init | | | 7, 3 (left spine) |
| next | 7 3 | 3 | (3 has no right child) |
| next | 7 | 7 | 15, 9 (left spine of 15) |
| next | 15 9 | 9 | |
| next | 15 | 15 | 20 |
| next | 20 | 20 | |

#### Code

```cpp
class BSTIterator {
    vector<TreeNode*> st;
    void pushLeft(TreeNode* n) { for (; n; n = n->left) st.push_back(n); }
public:
    explicit BSTIterator(TreeNode* root) { pushLeft(root); }
    bool hasNext() const { return !st.empty(); }
    int next() {
        TreeNode* n = st.back(); st.pop_back();
        pushLeft(n->right);                           // the next values live there
        return n->val;
    }
};

int kthSmallest(TreeNode* root, int k) {
    BSTIterator it(root);
    int v = 0;
    while (k-- > 0) v = it.next();
    return v;
}

TreeNode* inorderSuccessor(TreeNode* root, TreeNode* p) {
    TreeNode* succ = nullptr;
    while (root) {
        if (p->val < root->val) { succ = root; root = root->left; }  // candidate; look for smaller
        else root = root->right;
    }
    return succ;
}
```

#### When the tree keeps changing

If the BST is modified often and you are asked for the kth smallest repeatedly, an $O(h + k)$ walk per query is wasteful. Store in every node the size of its subtree (updated on insert and delete). Then at a node with left subtree size $L$: if $k \le L$ go left, if $k = L + 1$ the node is the answer, otherwise go right with $k - L - 1$. Each query is $O(h)$, which is $O(\log n)$ in a balanced tree.

#### Complexity

- Iterator: each node is pushed and popped once over a full traversal, so `next` is $O(1)$ amortized; memory $O(h)$.
- Kth smallest: $O(h + k)$.
- Successor from the root: $O(h)$.

#### Edge cases and bugs

- `k` larger than the number of nodes.
- Successor of the maximum: return null.
- In two-sum, stop when both iterators point at the same node (a value can't pair with itself).

#### Variants

- Kth smallest with frequent updates: store subtree sizes in each node, answer in $O(h)$.
- Recover a swapped BST, minimum absolute difference between values (compare consecutive inorder values).
- Merge two BSTs into a sorted list (two iterators), closest value to a target.

Connects to: DFS traversals, BST operations, opposite-ends pointers, validate a BST.

### questions
Q: How do you find the kth smallest element in a BST?
A: Do an inorder traversal, which visits values in increasing order, and stop at the kth visited node. With an iterative traversal that is O(h + k) time and O(h) space.

Q: How does a BST iterator achieve O(1) amortized next() with O(h) memory?
A: It keeps a stack of the left spine of the unvisited part. next() pops the smallest node and pushes the left spine of its right subtree. Over a full traversal each node is pushed and popped once, so the average cost per call is O(1).

Q: How do you find the inorder successor of a node in a BST without parent pointers?
A: Walk from the root: when the target is smaller than the current node, the current node is a candidate successor, so remember it and go left; otherwise go right. The last candidate remembered is the successor. It's O(h).

Q: How do you check whether two values in a BST sum to a target in O(h) space?
A: Use two iterators: one yields values in increasing order and the other in decreasing order. Move them like two pointers on a sorted array until the sum matches or they meet.

### signals
- kth smallest or kth largest value in a BST
- iterate a BST in sorted order on demand
- next larger or next smaller value (successor, predecessor)
- two-pointer style questions on a BST instead of an array

### template
```cpp
// Controlled inorder walk: pushLeft + pop gives values in increasing order.
struct InorderWalk {
    vector<TreeNode*> st;
    explicit InorderWalk(TreeNode* root) { pushLeft(root); }
    void pushLeft(TreeNode* n) { while (n) { st.push_back(n); n = n->left; } }
    bool done() const { return st.empty(); }
    TreeNode* next() {                   // next node in sorted order
        TreeNode* n = st.back(); st.pop_back();
        pushLeft(n->right);
        return n;
    }
};
// Mirror (push right spines, then pushLeft of the left child) for decreasing order.
```

## dsa.bst.building-balanced-bsts
name: "Building balanced BSTs"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "from a sorted array, from preorder"

### simple
If you already have sorted values, you can build a perfectly balanced search tree by always making the middle value the root. The middle splits the values into a smaller half and a larger half, which become the left and right subtrees, built the same way. It is like organizing a tournament bracket so both halves are always equal in size.

### interview
- **Sorted array → balanced BST**: root = middle element; recurse on the left and right halves. **O(n)**, height ⌈log₂(n + 1)⌉ − 1.
- **Sorted linked list → BST**: find the middle with fast and slow pointers (O(n log n)), or build in inorder order while advancing the list pointer (O(n)).
- **From preorder** (BST): the first value is the root; build with bounds `(low, high)`, consuming values that fit: **O(n)**. Alternatively a monotonic stack.
- **Rebalance an existing BST**: inorder to a sorted array, then rebuild from the middle: O(n).
- Pass index ranges, not slices, to keep the time linear.

### questions
Q: How do you convert a sorted array into a height-balanced BST?
A: Pick the middle element as the root, then recursively build the left subtree from the left half and the right subtree from the right half. Each element is placed once, so it's O(n), and the sizes of the halves differ by at most one, so the tree is balanced.

Q: How do you build a BST from its preorder traversal in O(n)?
A: Keep a global index into the preorder array and recurse with bounds. A call builds a node from the current value only if it fits within (low, high), then builds its left subtree with bound (low, value) and its right subtree with (value, high). Each value is consumed once.

Q: How do you convert a sorted linked list into a balanced BST in O(n)?
A: Count the nodes, then build the tree by an inorder recursion over index ranges: build the left subtree from the first half, create the root from the current list node and advance the list pointer, then build the right subtree. The list is consumed in order, so no middle-finding is needed.

Q: How would you rebalance an unbalanced BST?
A: Do an inorder traversal to get the values in sorted order, then build a balanced tree from that array by always choosing the middle element as the root. It takes O(n) time and O(n) extra space.

## dsa.bst.self-balancing-bsts-overview
name: "Self-balancing BSTs overview"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "AVL and red-black trees, why ordered maps are O(log n)"

### simple
A plain binary search tree can become lopsided and slow, like a shelf where every new book is added at one end. Self-balancing trees fix their shape after each insert or delete with small local moves called rotations. That keeps the height around log n, so searches, inserts and deletes stay fast no matter the order of the data.

### interview
- **Rotations** (left and right) change the local shape while keeping the inorder order, in O(1).
- **AVL trees**: every node's subtree heights differ by at most 1; rebalanced with single or double rotations; height ≤ about 1.44 log₂ n; faster lookups, more rotations on updates.
- **Red-black trees**: nodes are red or black; no red node has a red child; every root-to-null path has the same number of black nodes; height ≤ 2 log₂(n + 1); fewer rotations per update.
- `std::map` and `std::set` are red-black trees in the common standard libraries: search, insert, delete, floor and ceiling in **O(log n)** worst case.
- Alternatives: B-trees (databases, many keys per node), skip lists, treaps, splay trees (amortized).
- In interviews you rarely implement these; know the guarantees and when to use an ordered map.

### questions
Q: What is a rotation in a BST, and why is it safe?
A: A rotation restructures a node and one of its children, making the child the new subtree root and moving one grandchild subtree across. It changes heights but keeps the inorder order of all keys, so the tree remains a valid BST, and it takes O(1).

Q: How do AVL trees and red-black trees differ?
A: AVL trees keep a strict balance (subtree heights differ by at most 1), so they are shorter and faster to search but rotate more on updates. Red-black trees use a looser color-based rule that bounds the height by about 2 log n, so updates need fewer rotations. Standard libraries typically use red-black trees.

Q: Why are ordered maps like std::map O(log n) per operation?
A: They're implemented as self-balancing BSTs, whose invariants keep the height O(log n) after every insertion and deletion. Each operation follows one root-to-leaf path and does O(1) rotations or O(log n) recolorings.

Q: When would you use an ordered map instead of a hash map in an interview?
A: When you need keys in sorted order or queries like floor, ceiling, smallest, largest, or range iteration. Hash maps are faster on average for plain lookups but can't answer order-based questions.

## dsa.bst.floor-and-ceiling-in-a-bst
name: "Floor and ceiling in a BST"
importance: important
prereqs: [dsa.bst.bst-operations]
scope: "the lower_bound analogue"

### simple
The floor of a value is the largest item not bigger than it, and the ceiling is the smallest item not smaller than it. In a binary search tree you find them by walking down as in a normal search, remembering the best candidate on the way. It is the tree version of looking up the nearest page number in a book's index.

### interview
- **Floor(x)**: walk from the root; if `node.val == x` return it; if `node.val < x`, it's a candidate, go right for something closer; else go left.
- **Ceiling(x)**: mirror image: if `node.val > x`, candidate, go left; else go right.
- **O(h)** time, O(1) space iteratively.
- Equivalent to `lower_bound` (ceiling) and the element before `upper_bound` (floor) on a sorted array; with `std::set`: `s.lower_bound(x)` is the ceiling and `prev(s.upper_bound(x))` is the floor (check for `begin()` first).
- Uses: closest value in a BST, scheduling (next free slot), range counting with an augmented tree.

### questions
Q: How do you find the floor of x in a BST?
A: Start at the root with no candidate. If the node equals x, it's the floor. If it's less than x, it's a candidate, so remember it and go right looking for a larger one. If it's greater than x, go left. The last candidate is the answer, in O(h).

Q: How is finding the ceiling different?
A: It's the mirror image: when the node is greater than x, it's a candidate, so remember it and go left to look for a smaller one; when it's less than x, go right. Equal values are returned immediately.

Q: How do you find the value in a BST closest to a target?
A: Walk down as in a search, updating the best value whenever the current node is closer to the target, and go left or right by comparing the target with the node. The floor and the ceiling are both visited on this path, so the closest value is found in O(h).

Q: Which std::set calls give floor and ceiling?
A: s.lower_bound(x) returns the first element not less than x, which is the ceiling. The element just before s.upper_bound(x) is the floor, if that iterator is not s.begin(). Both are O(log n).
