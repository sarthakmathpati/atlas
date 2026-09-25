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

### simple
A linked list is a chain of nodes where each node holds a value and a pointer to the next node, like a treasure hunt where every clue tells you where the next clue is hidden. You can add or remove a clue anywhere just by changing where the previous clue points. But to reach the 50th clue you must follow the first 49.

### interview
- **Singly linked**: `next` only. **Doubly linked**: `prev` and `next`, so a known node can be removed in O(1) and the list can be walked backwards.
- Access by position **O(n)**; insert or delete **after a known node O(1)**; search O(n). No random access, poor cache locality compared with arrays.
- **Dummy (sentinel) head**: a fake node before the real head removes special cases when the head itself changes (deleting the first node, merging, partitioning). Return `dummy.next`.
- Traverse with `while (cur)`; stop at the node **before** the one you want to change, since singly linked nodes can't look back.
- Draw the pointers before and after each operation and change them in an order that never loses the rest of the list.
- Free removed nodes with `delete` (or say that the caller owns them); interview linked lists rarely use smart pointers.

### deep
#### Intuition

An array keeps elements side by side; a linked list keeps each element wherever memory is free and links them with pointers. That makes inserting and deleting cheap once you are at the right place (just rewire two pointers) but makes finding the place expensive (walk from the head).

#### The node and basic operations

```cpp
// The node type used throughout this topic (the same shape LeetCode uses).
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};

// Insert a new value after node p: O(1).
void insertAfter(ListNode* p, int v) {
    p->next = new ListNode(v, p->next);       // new node points at p's old successor first
}

// Delete every node with value v, using a dummy head so the real head is not special.
ListNode* removeAll(ListNode* head, int v) {
    ListNode dummy(0, head);
    ListNode* prev = &dummy;
    while (prev->next) {
        if (prev->next->val == v) {
            ListNode* gone = prev->next;
            prev->next = gone->next;          // unlink
            delete gone;
        } else {
            prev = prev->next;                // only advance when nothing was removed
        }
    }
    return dummy.next;
}
```

#### Worked example: remove value 6 from 6 → 1 → 6 → 2

| prev | prev.next | action | list |
|---|---|---|---|
| dummy | 6 | remove | dummy → 1 → 6 → 2 |
| dummy | 1 | advance | |
| 1 | 6 | remove | dummy → 1 → 2 |
| 1 | 2 | advance | |
| 2 | null | stop | 1 → 2 |

Without the dummy, removing the first 6 would need separate code to move `head`.

#### Singly vs doubly linked

| | Singly | Doubly |
|---|---|---|
| Memory per node | value + 1 pointer | value + 2 pointers |
| Delete a given node | O(n) (need its predecessor) | O(1) |
| Walk backwards | no | yes |
| Typical use | stacks, hash buckets, most interview problems | LRU cache, deques, editors |

#### Complexity summary

| Operation | Cost |
|---|---|
| Access k-th | $O(k)$ |
| Insert or delete at head | $O(1)$ |
| Insert or delete after a known node | $O(1)$ |
| Insert at tail | $O(1)$ with a tail pointer, else $O(n)$ |
| Search | $O(n)$ |

#### Edge cases and bugs

- Empty list (`head == nullptr`) and one-node lists.
- Dereferencing `cur->next->next` without checking `cur->next`.
- Losing the rest of the list by overwriting `next` before saving it.
- Advancing `prev` after a deletion skips the node that moved into place (two 6s in a row).

#### Variants

Circular lists (the tail points to the head), skip lists (extra "express" pointers for $O(\log n)$ search), XOR lists (one field storing `prev ^ next`), and lists with random pointers.

Connects to: linked list reversal, fast and slow pointers, merging lists, doubly linked list with hash map.

### questions
Q: What are the trade-offs between a linked list and an array?
A: A linked list inserts and deletes in O(1) once you hold the neighboring node, and grows without reallocation. But it has no random access (reaching position k is O(k)), uses extra memory for pointers, and is slow to scan because nodes are scattered in memory.

Q: What is a dummy head node, and why use it?
A: A placeholder node placed before the real head. Operations that may change the first node, such as deleting it or merging lists, then work the same way as operations elsewhere, and you return dummy.next at the end. It removes special-case code and bugs.

Q: How do you delete a node in a singly linked list when you only have a pointer to the node before it?
A: Set prev.next = prev.next.next, freeing the removed node in C++. The deletion is O(1); the cost is in finding prev, which takes O(n) from the head.

Q: How can you delete a node when you only have a pointer to that node and it isn't the tail?
A: Copy the next node's value into it and then unlink the next node. This "deletes" the value in O(1), but it doesn't work for the tail and changes node identities, so mention those caveats.

Q: When is a doubly linked list worth the extra pointer?
A: When you need to remove arbitrary known nodes in O(1) or move backwards, as in an LRU cache where a hash map points straight at the node to move. A singly linked list would need O(n) to find the predecessor.

## dsa.linked-lists.linked-list-reversal
name: "Linked list reversal"
importance: must
pattern: true
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "iterative, recursive, sublist reversal, reverse in k-groups"

### simple
Reversing a linked list means making every arrow point the other way. Walk along the chain holding three things: the node behind you, the node you are on, and the node ahead, like turning around each link of a paper chain one by one. Saving the next node before flipping an arrow keeps you from losing the rest of the chain.

### interview
- Iterative: `prev = null, cur = head`; loop: `next = cur.next; cur.next = prev; prev = cur; cur = next`. Return `prev`. **O(n)** time, **O(1)** space.
- Recursive: reverse the rest, then `head.next.next = head; head.next = null`. O(n) time, **O(n) stack**.
- **Reverse a sublist [left, right]**: walk to the node before `left`, then repeatedly move the next node to the front of the sublist ("head insertion"), or reverse the segment and reconnect both ends.
- **Reverse in k-groups**: check that k nodes remain, reverse them, connect the previous group's tail to the new group head, advance. O(n).
- Used inside other problems: palindrome list (reverse the second half), reorder list, add two numbers stored forward.

### deep
#### Intuition

Each node's `next` pointer must be turned around. The only danger is losing the rest of the list: once `cur.next` points backwards, the old next node is unreachable unless you saved it. So each step saves `next`, flips one pointer, and moves both `prev` and `cur` forward.

#### Worked example: 1 → 2 → 3 → null

| step | prev | cur | next (saved) | after flipping |
|---|---|---|---|---|
| 0 | null | 1 | 2 | 1 → null |
| 1 | 1 | 2 | 3 | 2 → 1 → null |
| 2 | 2 | 3 | null | 3 → 2 → 1 → null |
| end | 3 | null | | return 3 |

#### Code

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    while (head) {
        ListNode* next = head->next;   // save the rest
        head->next = prev;             // flip one pointer
        prev = head;                   // advance both
        head = next;
    }
    return prev;
}

// Reverse nodes left..right (1-based) in one pass by moving nodes to the front of the segment.
ListNode* reverseBetween(ListNode* head, int left, int right) {
    ListNode dummy(0, head);
    ListNode* before = &dummy;
    for (int i = 1; i < left; i++) before = before->next;
    ListNode* tail = before->next;                 // becomes the segment's last node
    for (int i = left; i < right; i++) {
        ListNode* move = tail->next;               // next node to bring to the front
        tail->next = move->next;
        move->next = before->next;
        before->next = move;
    }
    return dummy.next;
}

ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0, head);
    ListNode* groupPrev = &dummy;
    while (true) {
        ListNode* kth = groupPrev;
        for (int i = 0; i < k && kth; i++) kth = kth->next;
        if (!kth) break;                           // fewer than k nodes left: keep as is
        ListNode *groupNext = kth->next, *prev = groupNext, *cur = groupPrev->next;
        while (cur != groupNext) {                 // reverse this group, tail -> groupNext
            ListNode* next = cur->next;
            cur->next = prev;
            prev = cur;
            cur = next;
        }
        ListNode* newTail = groupPrev->next;       // old first node is now the last
        groupPrev->next = kth;                     // connect to the new first node
        groupPrev = newTail;
    }
    return dummy.next;
}
```

#### Complexity

All versions are $O(n)$ time. Iterative versions use $O(1)$ extra space; the recursive one uses $O(n)$ stack, which can overflow on long lists.

#### Edge cases and bugs

- Empty list and single node: return as is.
- Forgetting `head.next = null` in the recursive version creates a two-node cycle at the end.
- Sublist reversal when `left == 1`: the dummy node handles it.
- K-groups: leave a final group with fewer than k nodes untouched (or reverse it, if the problem says so).

#### Variants

- Swap nodes in pairs (k = 2).
- Palindrome linked list: find the middle, reverse the second half, compare, optionally restore.
- Rotate list by k: connect into a ring, then cut at `n - k % n`.
- Add two numbers stored most significant digit first: reverse both, add, reverse the result (or use stacks).

Connects to: linked list basics, fast and slow pointers on lists, tricky pointer problems, recursion.

### questions
Q: Describe iterative linked list reversal and its complexity.
A: Keep prev (initially null) and cur (the head). At each step save cur.next, point cur.next at prev, then move prev to cur and cur to the saved node. When cur is null, prev is the new head. O(n) time and O(1) space.

Q: How does the recursive reversal work, and what does it cost?
A: Reverse everything after the head recursively, which returns the new head. Then head.next (now the last node of the reversed rest) points back to head, and head.next becomes null. It is O(n) time but uses O(n) stack space.

Q: How do you reverse only the nodes from position left to right?
A: Use a dummy head and walk to the node before position left. Then, right − left times, take the node after the segment's current tail and move it to the front of the segment. The rest of the list stays connected throughout.

Q: How do you reverse a list in groups of k?
A: For each group, first check that k nodes remain. Reverse those k nodes so the group's old first node points to the node after the group, then connect the previous group's tail to the group's new first node, and continue from the old first node. It is O(n) time and O(1) space.

Q: Why must you save cur.next before changing it?
A: Once cur.next points backwards, nothing points to the rest of the list, so it would be lost. Saving it in a temporary variable keeps the path forward.

### signals
- reverse a linked list, or part of it, in place
- process a list in groups of k nodes
- compare the first half of a list with the reversed second half (palindrome list)
- rebuild a list in a different order with O(1) extra space

### template
```cpp
// Reverse the nodes from `start` up to (not including) `stop`; returns the new first node.
// After the call, `start` is the last node of the segment and points to `stop`.
ListNode* reverseSegment(ListNode* start, ListNode* stop) {
    ListNode* prev = stop;              // the reversed segment reconnects to `stop`
    ListNode* cur = start;
    while (cur != stop) {
        ListNode* next = cur->next;     // 1. save
        cur->next = prev;               // 2. flip
        prev = cur;                     // 3. advance
        cur = next;
    }
    return prev;
}
// Whole list: reverseSegment(head, nullptr). Sublist: link the node before it to the result.
```

## dsa.linked-lists.fast-and-slow-pointers-on-lists
name: "Fast and slow pointers on lists"
importance: must
pattern: true
prereqs: [dsa.linked-lists.linked-list-reversal]
scope: "middle node, cycle detection, cycle start with Floyd's algorithm"

### simple
Two pointers walk the list at different speeds: the slow one takes one step while the fast one takes two. When the fast pointer reaches the end, the slow one is in the middle, like two friends on a trail where one walks twice as fast. If the trail loops, the faster friend eventually catches up from behind, which proves there is a loop.

### interview
- **Middle**: `while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }`. For even length, slow ends at the **second** middle; start `fast = head->next` to get the first.
- **Cycle detection** (Floyd): if `slow == fast` at some point, there is a cycle; if `fast` hits null, there isn't. O(n) time, O(1) space.
- **Cycle start**: after meeting, move one pointer to the head; step both one at a time; they meet at the cycle's entry.
- **Cycle length**: from the meeting point, count steps until the pointer returns.
- **Kth from the end**: a different two-pointer trick: move a lead pointer k steps ahead, then move both until the lead hits the end.
- Hash set alternative: O(n) extra space.

### deep
#### Intuition

With speeds 1 and 2, when fast has walked $2k$ nodes, slow has walked $k$: exactly half. So when fast runs out of list, slow is at the midpoint. In a cycle, fast gains one node per step on slow, so once both are in the cycle the gap closes by one each step and they must meet within one lap.

#### Worked example: middle of 1 → 2 → 3 → 4 → 5

| step | slow | fast |
|---|---|---|
| 0 | 1 | 1 |
| 1 | 2 | 3 |
| 2 | 3 | 5 |
| stop (fast.next is null) | 3 | |

Middle is 3. For 1 → 2 → 3 → 4, fast becomes null after two steps and slow is at 3, the second middle.

#### Code

```cpp
ListNode* middleNode(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

// Returns the node where the cycle begins, or nullptr if there is no cycle.
ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                    // inside the cycle
            ListNode* p = head;
            while (p != slow) { p = p->next; slow = slow->next; }
            return p;                          // both walked the tail length mu
        }
    }
    return nullptr;
}
```

#### Why the cycle entry is found

Let $\mu$ be the number of nodes before the cycle and $\lambda$ its length. When they meet, slow has walked $d$ steps and fast $2d$; fast has gone around some whole number of extra laps, so $d$ is a multiple of $\lambda$. The meeting point is $d - \mu$ steps past the entry. Walking $\mu$ more steps puts slow at $d$ steps past the entry modulo $\lambda$, which is the entry itself. A pointer starting at the head reaches the entry after the same $\mu$ steps, so they meet there.

#### Complexity

Middle: $O(n)$ time. Cycle detection and entry: $O(\mu + \lambda) = O(n)$ time. All $O(1)$ space.

#### Edge cases and bugs

- Checking `fast->next->next` without checking `fast->next` crashes on even-length lists.
- Comparing node values instead of node pointers gives false cycles when values repeat.
- A self-loop (a node pointing to itself) and a cycle that includes the head are good tests.

#### Variants

- Palindrome list (above), reorder list (middle, reverse second half, weave).
- Delete the middle node: stop slow one node earlier (start `fast` at `head->next->next`).
- Find the duplicate number in an array by treating indices as next pointers.
- Intersection of two lists is a different trick (switching heads), not fast and slow.

Connects to: fast and slow pointers on arrays, linked list reversal, tricky pointer problems.

### questions
Q: How do you find the middle of a linked list in one pass?
A: Move slow one node and fast two nodes at a time while fast and fast.next exist. When the loop ends, slow is at the middle (the second middle for even lengths). It is O(n) time and O(1) space.

Q: How does Floyd's algorithm detect a cycle?
A: Slow moves one step and fast moves two. If the list ends, fast reaches null and there is no cycle. If there is a cycle, both pointers eventually circle it and fast closes the gap by one node per step, so they meet.

Q: After slow and fast meet, how do you find the node where the cycle starts?
A: Put one pointer back at the head and advance both one step at a time. They meet at the cycle's entry, because the distance from the head to the entry equals the distance from the meeting point forward to the entry, modulo the cycle length.

Q: How do you check whether a linked list is a palindrome in O(1) extra space?
A: Find the middle with fast and slow pointers, reverse the second half, and compare it node by node with the first half. Reverse the second half back afterwards if the list must stay unchanged.

Q: How would you find the length of the cycle?
A: Once slow and fast meet inside the cycle, keep one pointer fixed and move the other until it returns, counting steps. The count is the cycle length.

### signals
- detect whether a linked list loops back on itself
- find the middle node in a single pass
- where does the cycle begin
- split a list into halves (for merge sort, palindrome check, reorder)

### template
```cpp
// Fast and slow pointers on a list: middle, cycle check and cycle entry.
ListNode* cycleEntry(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {            // fast needs two valid steps
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                 // met inside a cycle
            for (ListNode* p = head; p != slow; p = p->next) slow = slow->next;
            return slow;                    // entry of the cycle
        }
    }
    return nullptr;                         // no cycle; here slow is the middle node
}
```

## dsa.linked-lists.merging-lists
name: "Merging lists"
importance: must
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "merge two sorted lists, merge k sorted lists with a heap"

### simple
Merging sorted lists stitches them into one sorted list by always taking the smallest front node. For two lists, it is like merging two lines of people sorted by height, repeatedly letting the shorter person at the front of either line go next. For many lists, a priority queue keeps track of which front node is currently the smallest.

### interview
- **Two lists**: dummy head plus tail pointer; attach the smaller head, advance that list; attach the leftover list at the end. **O(n + m)**, O(1) extra (nodes are relinked, not copied).
- Recursive version: `if (a.val <= b.val) { a.next = merge(a.next, b); return a; }`; O(n + m) stack.
- **K lists with a min-heap** of current heads: pop the smallest, attach it, push its next. **O(N log k)** for N total nodes, O(k) heap.
- **Divide and conquer**: merge lists in pairs, then pairs of results: also O(N log k), no heap.
- Merging one by one into an accumulator is O(N · k): avoid.
- Stable if you take from the first list on ties.

### deep
#### Intuition

Both lists are sorted, so the smallest remaining node overall is always one of the heads. Relinking that head onto the output and advancing its list keeps everything sorted. For $k$ lists, comparing $k$ heads each step is slow, but a heap returns the minimum head in $O(\log k)$.

#### Worked example: merge 1 → 4 → 5, 1 → 3 → 4, 2 → 6

Heap of heads (value, list): {1a, 1b, 2}.

| pop | push | output so far |
|---|---|---|
| 1 (list a) | 4 (a) | 1 |
| 1 (list b) | 3 (b) | 1 1 |
| 2 (list c) | 6 (c) | 1 1 2 |
| 3 (b) | 4 (b) | 1 1 2 3 |
| 4 (a) | 5 (a) | 1 1 2 3 4 |
| 4 (b) | none | 1 1 2 3 4 4 |
| 5 (a) | none | 1 1 2 3 4 4 5 |
| 6 (c) | none | 1 1 2 3 4 4 5 6 |

#### Code

```cpp
ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode dummy;
    ListNode* tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }   // <= keeps it stable
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;                  // attach whatever is left
    return dummy.next;
}

ListNode* mergeK(vector<ListNode*>& lists) {
    auto cmp = [](ListNode* x, ListNode* y) { return x->val > y->val; };  // min-heap
    priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);
    for (ListNode* l : lists) if (l) pq.push(l);
    ListNode dummy;
    ListNode* tail = &dummy;
    while (!pq.empty()) {
        ListNode* node = pq.top();
        pq.pop();
        tail->next = node;
        tail = node;
        if (node->next) pq.push(node->next);
    }
    return dummy.next;
}
```

`tail.next = tail = node` assigns left to right: first `tail.next = node`, then `tail = node`.

#### Complexity

- Two lists: $O(n + m)$ time, $O(1)$ extra space.
- $k$ lists with a heap: each of the $N$ nodes is pushed and popped once, $O(N \log k)$ time, $O(k)$ space.
- Pairwise divide and conquer: $\log k$ rounds, each touching all $N$ nodes: $O(N \log k)$.
- Sequential merging: the accumulator grows each time, $O(N k)$.

#### Edge cases and bugs

- Empty lists in the input (skip nulls when building the heap).
- Comparing `ListNode*` pointers in the heap instead of their values: that orders nodes by memory address.
- Forgetting to attach the leftover list after the two-list loop.

#### Variants

- Merge two sorted arrays (same loop, arrays).
- Sort a linked list with merge sort (split with fast and slow pointers, merge).
- Smallest range covering elements from k lists (heap of heads plus the current maximum).
- Kth smallest element in a sorted matrix (heap of row heads).

Connects to: merging sorted sequences, k-way merge, merge sort, heaps.

### questions
Q: How do you merge two sorted linked lists in O(1) extra space?
A: Use a dummy node and a tail pointer. Repeatedly attach the smaller of the two current heads to the tail and advance that list. When one list runs out, attach the other list's remainder. Nodes are relinked rather than copied.

Q: What is the best way to merge k sorted lists, and what does it cost?
A: Keep a min-heap of the current head of each list. Pop the smallest node, append it to the output, and push its successor. With N total nodes that is O(N log k) time and O(k) extra space.

Q: Why is merging lists one at a time into a result list slow?
A: The result grows with each merge, so the i-th merge touches about i · (N/k) nodes. Summed over k lists that is O(N · k), compared with O(N log k) for a heap or pairwise merging.

Q: How does the pairwise (divide and conquer) approach work?
A: Merge list 0 with 1, 2 with 3, and so on, halving the number of lists each round. There are log k rounds and each touches every node once, so the total is O(N log k) without a heap.

Q: What comparator does a min-heap of list nodes need in C++?
A: priority_queue keeps the element that nothing outranks on top, so pass a comparator returning a->val > b->val to put the smallest value on top. Comparing the ListNode pointers themselves would order the nodes by memory address.

## dsa.linked-lists.removal-patterns
name: "Removal patterns"
importance: important
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "nth node from the end, remove duplicates, remove by value"

### simple
Removing nodes from a linked list is about stopping at the node just before the one to remove and skipping over it. To remove the nth node from the end in one pass, send a scout pointer n steps ahead first; when the scout reaches the end, the follower is right before the target. A dummy head makes removing the very first node work the same way as any other.

### interview
- **Remove by value**: dummy head; `while (prev.next)`: skip matching nodes, else advance `prev`.
- **Nth from the end in one pass**: move `lead` n + 1 steps ahead of `trail` (both starting at the dummy); move both until `lead` is null; `trail.next` is the target.
- **Remove duplicates from a sorted list, keep one**: if `cur.val == cur.next.val`, skip `cur.next`; else advance.
- **Remove all nodes that have duplicates** (sorted): with `prev` at the last kept node, when a run of equal values starts, skip the whole run.
- Remove duplicates from an **unsorted** list: hash set of seen values, O(n) time and space (or O(n²) without extra space).
- All single-pass versions are **O(n)** time, **O(1)** extra space.

### questions
Q: How do you remove the nth node from the end of a list in one pass?
A: Start two pointers at a dummy node before the head. Move the lead pointer n + 1 steps, then move both until the lead is null. The trailing pointer is now just before the node to remove, so set trail.next = trail.next.next.

Q: Why use a dummy node when removing nodes?
A: The node to remove might be the head, which would otherwise need special handling to update the head pointer. With a dummy in front, every node has a predecessor, and the answer is dummy.next.

Q: How do you remove all nodes whose value appears more than once in a sorted list?
A: Keep prev at the last node known to be unique (starting at a dummy). If the node after prev starts a run of equal values, skip past the whole run and link prev to the node after it; otherwise advance prev.

Q: How do you remove duplicates from an unsorted linked list?
A: Walk the list with a hash set of values seen so far, unlinking any node whose value is already in the set. That is O(n) time and O(n) space; without extra space, check each node against all later nodes in O(n²).

## dsa.linked-lists.tricky-pointer-problems
name: "Tricky pointer problems"
importance: important
prereqs: [dsa.linked-lists.fast-and-slow-pointers-on-lists]
scope: "copy list with random pointer, intersection, reorder list, palindrome list"

### simple
Some linked list problems combine several small tricks, and the challenge is keeping every pointer straight. Copying a list with extra random pointers, finding where two lists join, and reordering a list by weaving its halves together each have a clever idea. Drawing the arrows on paper before coding is the best habit.

### interview
- **Copy list with random pointer**: hash map old → new (O(n) space), or **interleave** copies (A → A' → B → B'…), set `copy.random = orig.random.next`, then separate the lists (O(1) extra space).
- **Intersection of two lists**: two pointers that switch to the other list's head at the end; they meet at the intersection (or both reach null) after at most m + n steps.
- **Reorder list** (L0 → Ln → L1 → Ln−1 …): find the middle, reverse the second half, weave the two halves.
- **Palindrome list**: middle, reverse the second half, compare, restore.
- **Odd-even list**, **partition list** around x (two dummy lists joined at the end), **rotate list** (ring then cut).
- All are O(n) time; most can be done in O(1) extra space.

### questions
Q: How do you deep-copy a linked list with random pointers in O(1) extra space?
A: Insert each node's copy right after it, so the list reads A, A′, B, B′, and so on. Then set each copy's random to original.random.next (the copy of the random target), and finally unweave the two lists, restoring the original. It is O(n) time.

Q: How do you find the node where two singly linked lists intersect?
A: Walk two pointers, one per list; when a pointer reaches the end, restart it at the other list's head. Both then travel m + n steps in total, so they line up and meet at the intersection node, or both reach null together if there is none.

Q: How do you reorder a list into L0, Ln, L1, Ln−1, …?
A: Find the middle with fast and slow pointers, cut the list there, reverse the second half, then alternately take one node from each half. Each step is O(n), with O(1) extra space.

Q: How do you partition a list around a value x while keeping the relative order?
A: Build two lists with two dummy heads, one for nodes less than x and one for the rest, appending nodes as you walk the original. Connect the end of the first list to the start of the second and terminate the second with null.

## dsa.linked-lists.doubly-linked-list-with-hash-map
name: "Doubly linked list with hash map"
importance: important
prereqs: [dsa.linked-lists.linked-list-basics]
scope: "the LRU cache building block"

### simple
Combining a hash map with a doubly linked list gives you instant lookup and instant reordering at the same time. The list keeps items in order of use, like a stack of papers where the most recently touched one goes on top. The map tells you exactly where each paper sits, so you can pull it out and move it to the top without searching.

### interview
- The hash map stores `key → node`; the doubly linked list stores the order (most recent at the front, least recent at the back).
- **Get**: look up the node, move it to the front: O(1). **Put**: update or insert at the front; if over capacity, remove the back node and erase its key from the map: O(1).
- **Sentinel head and tail** nodes remove all null checks: every real node always has both neighbors.
- Removing a known node in O(1) requires the `prev` pointer, which is why the list is doubly linked.
- The node must store its **key** so the map entry can be erased on eviction.
- C++ shortcut: `std::list` plus `unordered_map<key, list::iterator>` and `splice` to move nodes.

### questions
Q: Why does an LRU cache need both a hash map and a doubly linked list?
A: The hash map finds a key's node in O(1), and the doubly linked list keeps the usage order so the least recently used item can be found at one end and any node moved to the other end in O(1). Neither structure alone gives both operations in O(1).

Q: Why must the list be doubly linked?
A: To unlink a node in O(1) you need its predecessor. With a singly linked list, finding the predecessor takes O(n), so moving an accessed node to the front would be slow.

Q: Why store the key inside each list node?
A: When the cache is full, you evict the node at the least recent end, and you must also remove its entry from the hash map. The key stored in the node tells you which map entry to erase.

Q: What do sentinel head and tail nodes simplify?
A: With permanent dummy nodes at both ends, every real node has non-null prev and next pointers, so insertion and removal never need special cases for an empty list or for the first and last nodes.
