---
topic: dsa.recursion
name: "Recursion"
subject: dsa
order: 11
prereqs: [dsa.complexity]
---

## dsa.recursion.recursion-fundamentals
name: "Recursion fundamentals"
importance: must
scope: "base case, recursive case, call stack, trusting the recursion"

### simple
A recursive function solves a problem by calling itself on a smaller version of the same problem. It is like a set of Russian dolls: to count them, open the outer doll and count the dolls inside it, until you reach the smallest doll, which you just count as one. That smallest case, the base case, is what stops the calls from going on forever.

### interview
- Two parts: a **base case** that answers directly, and a **recursive case** that reduces the problem and combines the smaller answer.
- Every call must make progress toward a base case, or the recursion never ends (stack overflow).
- **Trust the recursion** (the "leap of faith"): assume the call on the smaller input returns the right answer, and only check how you use it.
- Each active call takes a **stack frame**; depth d costs O(d) space. The limit is the stack size (commonly 8 MB on Linux, 1 MB on Windows), roughly 10⁴ to 10⁶ frames depending on frame size.
- Decide what the function **returns** and what it takes as **parameters** before writing it: say it in one sentence.
- Pass results up through return values or accumulate into a parameter (a result list passed by reference).

### deep
#### Intuition

Recursion replaces "how do I do the whole thing?" with two easier questions: "what is the smallest case I can answer directly?" and "if someone handed me the answer for a slightly smaller input, how would I finish?" The call stack does the bookkeeping of remembering where each call was.

#### Anatomy

```cpp
// Sum of the digits of a non-negative n.
int digitSum(int n) {
    if (n < 10) return n;                 // base case: one digit
    return n % 10 + digitSum(n / 10);     // last digit + sum of the rest (smaller input)
}
```

One-sentence contract: "`digitSum(n)` returns the sum of the digits of n." The recursive line uses that contract on `n / 10`, trusting it, and adds the last digit.

#### Worked example: the call stack for digitSum(472)

| step | call | waiting for | returns |
|---|---|---|---|
| 1 | digitSum(472) | digitSum(47) | 2 + 11 = 13 |
| 2 | digitSum(47) | digitSum(4) | 7 + 4 = 11 |
| 3 | digitSum(4) | nothing (base case) | 4 |

Calls go down the table, and results come back up. At the deepest point three frames are on the stack.

#### Returning values versus accumulating

```cpp
struct Node { int val; vector<Node*> kids; };

// Style 1: return the answer (pure, easy to reason about).
int countNodes(Node* root) {
    if (!root) return 0;
    int total = 1;
    for (Node* k : root->kids) total += countNodes(k);
    return total;
}

// Style 2: accumulate into a reference parameter (handy for collecting many results).
void collectLeaves(Node* root, vector<int>& out) {
    if (!root) return;
    if (root->kids.empty()) out.push_back(root->val);
    for (Node* k : root->kids) collectLeaves(k, out);
}
```

#### Complexity

Time is the sum of the work over all calls (draw the recursion tree). Space is the maximum depth times the frame size, plus anything the calls allocate. `digitSum` is $O(\log_{10} n)$ time and space.

#### Edge cases and bugs

- **Missing or unreachable base case**: `f(n) = f(n - 2)` with odd `n` and base case `n == 0` never stops.
- **Not shrinking the input**: calling `f(n)` from `f(n)` with the same arguments.
- **Deep recursion**: a linked list of $10^5$ nodes recursed node by node can overflow the stack; use iteration, or raise the stack size carefully (`ulimit -s`, or a thread created with a bigger stack).
- **Shared mutable state**: appending to a list and forgetting to remove (see backtracking).
- **Copying** containers per call (passing a `vector` by value, or building a sub-vector) adds $O(n)$ per call; pass `const&` and an index instead.

#### Variants

- Multiple recursion (trees, Fibonacci), mutual recursion (`isEven` calls `isOdd`), recursion on structure (trees, nested lists), recursion with memoization (DP), and backtracking (recursion that undoes choices).

Connects to: recursion tree thinking, backtracking, tree traversals, divide and conquer, space complexity.

### questions
Q: What two parts does every recursive function need?
A: A base case that returns an answer directly without recursing, and a recursive case that calls the function on a smaller or simpler input and uses its result. Each recursive call must move closer to a base case.

Q: What does "trust the recursion" mean?
A: When writing the recursive case, assume the call on the smaller input already returns the correct answer, as its contract says, and focus only on combining it correctly. You verify the base case and the combining step, and induction does the rest.

Q: Why can recursion cause a stack overflow?
A: Each call that hasn't returned keeps a frame on the call stack. If recursion goes too deep, such as 10^5 levels on a long linked list, or never reaches a base case, the stack runs out of memory.

Q: What is the space complexity of a recursive function with no extra data structures?
A: O(maximum recursion depth), because that many frames are on the stack at once. For recursion over a balanced tree it is O(log n); for recursion that decreases n by one each time it is O(n).

Q: When should you prefer iteration over recursion?
A: When the recursion would be very deep (long lists, large n with n − 1 steps), when the depth could overflow the call stack, or when the iterative version is just as clear. Tree and divide-and-conquer problems are usually clearer recursively.

## dsa.recursion.recursion-tree-thinking
name: "Recursion tree thinking"
importance: must
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "drawing the tree, counting calls"

### simple
A recursion tree is a drawing of every call a recursive function makes, with each call's own calls hanging beneath it. It is like a family tree where every parent is a function call and its children are the calls it makes. Counting the nodes and the work at each level tells you how fast the function is.

### interview
- Draw a node per call, labeled with its arguments; children are the calls it makes.
- **Number of calls** ≈ branching^depth for uniform trees: two calls, depth n → about 2ⁿ.
- **Total time** = sum over levels of (calls on that level × work per call).
- **Space** = depth of the tree (the longest root-to-leaf path), not the number of nodes.
- **Repeated labels** in the tree mean overlapping subproblems: memoize them.
- Use it to explain complexity out loud: "the tree has log n levels and each level does O(n) work."

### deep
#### Intuition

Recurrences can feel abstract; a drawing makes them concrete. Draw the first few levels, spot the pattern (how many nodes per level, how big each subproblem is), and add up the work. The same picture also shows repeated work that memoization would remove.

#### Worked example: naive Fibonacci

```
                    fib(5)
              /               \
          fib(4)             fib(3)
         /      \            /     \
     fib(3)    fib(2)    fib(2)   fib(1)
     /    \     /  \      /  \
 fib(2) fib(1) f(1) f(0) f(1) f(0)
  /  \
f(1) f(0)
```

| label | times computed |
|---|---|
| fib(3) | 2 |
| fib(2) | 3 |
| fib(1) | 5 |
| fib(0) | 3 |

That is 15 calls for `fib(5)`. The count grows like $\varphi^n$ with $\varphi \approx 1.618$, yet there are only 6 distinct labels: memoization cuts the tree to $O(n)$ nodes.

#### Worked example: counting work per level

For `solve(n)` that loops over n items and then calls `solve(n/2)` twice:

| level | calls | size each | work per level |
|---|---|---|---|
| 0 | 1 | n | n |
| 1 | 2 | n/2 | n |
| 2 | 4 | n/4 | n |
| … | … | … | n |
| log n | n | 1 | n |

Total: $n \log n$. If instead each call made **three** half-size calls, level $k$ would do $(3/2)^k n$ work and the bottom level would dominate: $O(n^{\log_2 3}) \approx O(n^{1.585})$.

#### Instrumenting a recursion

```cpp
// Count calls to see the tree's size empirically.
long long calls = 0;
long long fibNaive(int n) {
    calls++;
    return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2);
}
// fibNaive(30) makes 2,692,537 calls; the memoized version makes 59.
```

#### How to use the tree in an interview

1. Draw two or three levels for a small input.
2. Say the branching factor and the depth.
3. Say the work per node (excluding recursive calls).
4. Sum per level; identify whether the top, the bottom, or every level dominates.
5. Point out repeated labels and propose memoization if there are any.

#### Edge cases and bugs

- Counting nodes but forgetting non-recursive work inside each call (slicing, loops).
- Confusing total nodes (time) with depth (space).
- Trees whose branching varies (backtracking with pruning): give the worst case, then mention pruning.

Connects to: recursion complexity (recurrences and the Master theorem), memoization, backtracking, divide and conquer.

### questions
Q: How do you estimate the running time of a recursive function using its recursion tree?
A: Sum the non-recursive work over all nodes, usually level by level: number of calls on the level times the work per call. Then see which levels dominate. For merge sort, every level costs O(n) and there are log n levels, giving O(n log n).

Q: How many calls does naive recursive Fibonacci make, and what does the tree reveal?
A: About φ^n (roughly 1.618^n), since the tree branches twice with depths n and n − 2. The tree shows the same arguments repeated many times, which is the signal that memoization will collapse it to O(n) distinct calls.

Q: What determines the space used by a recursion, the size or the depth of the tree?
A: The depth. Only one root-to-leaf path of calls is active on the stack at a time, so space is proportional to the longest path, even when the tree has exponentially many nodes.

Q: A function makes two recursive calls on n − 1 and does O(1) work. What is its complexity?
A: O(2^n). The tree doubles at every level and has n levels, so it has about 2^n nodes, each doing constant work. The Tower of Hanoi and naive subset generation look like this.

## dsa.recursion.divide-and-conquer
name: "Divide and conquer"
importance: must
prereqs: [dsa.recursion.recursion-tree-thinking]
scope: "split, solve, combine; merge sort and fast power as examples"

### simple
Divide and conquer splits a problem into smaller independent parts, solves each part the same way, and combines their answers. It is like organizing a huge pile of paperwork by giving half to each of two helpers, who each split their half again, until every piece is tiny and easy. The skill is in making the combining step cheap.

### interview
- Three steps: **divide** into subproblems (usually halves), **conquer** each recursively, **combine** the results.
- Subproblems are **independent** (unlike DP, where they overlap).
- Merge sort: T(n) = 2T(n/2) + O(n) = **O(n log n)**. Binary search: T(n) = T(n/2) + O(1) = **O(log n)**.
- **Fast power**: xⁿ = (x^(n/2))² (times x if n is odd): **O(log n)** multiplications instead of n.
- Others: quicksort, maximum subarray (cross-middle case), closest pair of points (O(n log n)), Karatsuba multiplication, counting inversions.
- Analyze with the recursion tree or the Master theorem.

### deep
#### Intuition

A problem of size $n$ may be expensive to solve directly, but two problems of size $n/2$ plus a cheap combination can be far cheaper overall. The savings come from the combine step being small compared with the direct solution. Sorting is the classic case: combining two sorted halves takes $O(n)$, giving $O(n \log n)$ instead of $O(n^2)$.

#### Example 1: fast power

$x^{13} = x^{8} \cdot x^{4} \cdot x^{1}$ because $13 = 1101_2$. Recursively:

| call | n | computed as |
|---|---|---|
| pow(x, 13) | odd | pow(x, 6)² · x |
| pow(x, 6) | even | pow(x, 3)² |
| pow(x, 3) | odd | pow(x, 1)² · x |
| pow(x, 1) | odd | pow(x, 0)² · x = x |

Four levels instead of 13 multiplications: $O(\log n)$.

```cpp
long long fastPow(long long x, long long n, long long mod) {   // x^n mod `mod`, n >= 0
    if (n == 0) return 1 % mod;
    long long half = fastPow(x, n / 2, mod);                   // solve one half once
    long long result = half * half % mod;                       // combine
    if (n % 2 == 1) result = result * (x % mod) % mod;          // odd: one extra factor
    return result;
}

// Maximum subarray sum by divide and conquer: best is left, right, or crosses the middle.
long long maxCross(const vector<int>& a, int lo, int mid, int hi) {
    long long best = LLONG_MIN, sum = 0, leftBest, rightBest;
    for (int i = mid; i >= lo; i--) { sum += a[i]; best = max(best, sum); }
    leftBest = best;
    best = LLONG_MIN, sum = 0;
    for (int i = mid + 1; i <= hi; i++) { sum += a[i]; best = max(best, sum); }
    rightBest = best;
    return leftBest + rightBest;
}

long long maxSubarrayDC(const vector<int>& a, int lo, int hi) {
    if (lo == hi) return a[lo];
    int mid = lo + (hi - lo) / 2;
    return max({maxSubarrayDC(a, lo, mid), maxSubarrayDC(a, mid + 1, hi), maxCross(a, lo, mid, hi)});
}
```

#### Complexity

- Fast power: $T(n) = T(n/2) + O(1) = O(\log n)$.
- Maximum subarray: $T(n) = 2T(n/2) + O(n) = O(n \log n)$ (Kadane is $O(n)$, but this version shows the pattern and parallelizes).

#### The cost of the mistake in fast power

Writing `fastPow(x, n/2) * fastPow(x, n/2)` computes the same half twice: $T(n) = 2T(n/2) + O(1) = O(n)$. Always compute the half once and reuse it.

#### When divide and conquer fits

- The problem splits into independent parts of the same kind.
- The combine step is cheaper than solving directly (often linear or constant).
- Base cases are trivial.

If the parts share subproblems, the tree repeats work: switch to memoization or DP.

#### Edge cases and bugs

- Uneven splits on odd sizes: make sure both halves shrink (`mid = lo + (hi - lo) / 2`, halves `[lo, mid]` and `[mid + 1, hi]`).
- `1 % mod` for $n = 0$ when `mod == 1`.
- Negative exponents need a modular inverse or a floating-point reciprocal.

#### Variants

- Closest pair of points: split by x, solve halves, check a strip of width $d$ around the middle sorted by y: $O(n \log n)$.
- Karatsuba: three half-size multiplications instead of four: $O(n^{1.585})$.
- Majority element, count inversions, build a balanced BST from a sorted array, the skyline problem.

Connects to: merge sort, quick sort, binary search, recursion complexity, fast exponentiation.

### questions
Q: What are the three steps of divide and conquer?
A: Divide the problem into smaller independent subproblems, conquer each by solving it recursively, and combine the sub-answers into the answer for the whole. The efficiency comes from a cheap combine step.

Q: How does fast exponentiation compute x^n in O(log n)?
A: It uses x^n = (x^(n/2))² for even n and x · (x^(n/2))² for odd n. Each step halves the exponent, so there are about log₂ n levels, each doing one or two multiplications.

Q: Why must fast power compute the half only once?
A: Calling the recursive function twice for the same half doubles the calls at every level, turning T(n) = T(n/2) + O(1) into T(n) = 2T(n/2) + O(1), which is O(n). Storing the half in a variable keeps it O(log n).

Q: How does divide and conquer differ from dynamic programming?
A: In divide and conquer the subproblems are independent and each is solved once, like the two halves in merge sort. In DP the subproblems overlap, so the same subproblem appears many times and its answer is cached or tabulated.

Q: How do you find the maximum subarray with divide and conquer?
A: The best subarray lies entirely in the left half, entirely in the right half, or crosses the middle. Solve the halves recursively, and compute the crossing case in O(n) as the best sum ending at mid plus the best sum starting at mid + 1. Total O(n log n).

## dsa.recursion.recursion-to-iteration
name: "Recursion to iteration"
importance: important
prereqs: [dsa.recursion.recursion-fundamentals]
scope: "explicit stacks, tail recursion"

### simple
Any recursive function can be rewritten as a loop by keeping your own stack of pending work, like a to-do list where you push new tasks and pop the most recent one. This avoids running out of the system's limited call stack on very deep inputs. When the recursive call is the very last thing a function does, a plain loop with no stack is enough.

### interview
- Replace the call stack with an **explicit stack** (a vector or deque) holding what each frame needs: arguments and, if necessary, how far it got.
- Order matters: push children in reverse to process them in the original order (for preorder DFS, push right then left).
- **Tail recursion**: the recursive call is the last action, with nothing left to do after it. It can become a loop that updates the parameters. C++ compilers often optimize it at -O2, but the standard doesn't guarantee it, so don't rely on it.
- Postorder (work after the children) needs a visited flag or two stacks.
- Reasons to convert: deep recursion (stack overflow), small stacks (threads, embedded systems), or needing to pause and resume (iterators).

### questions
Q: How do you convert a recursive DFS into an iterative one?
A: Push the start node onto an explicit stack. While the stack isn't empty, pop a node, process it, and push its unvisited neighbors (in reverse if the order matters). The stack plays the role of the call stack, and it lives on the heap, which is much larger.

Q: What is tail recursion?
A: A recursive call that is the final action of the function, so its result is returned directly with no further work. Such a function can be turned into a loop by reassigning the parameters, and some compilers do this automatically (tail-call optimization).

Q: Can you rely on tail-call optimization in C++?
A: No. GCC and Clang often turn tail calls into jumps at -O2, but the standard doesn't require it, debug builds don't do it, and destructors of local objects can prevent it. Convert deep tail recursion into a loop yourself.

Q: How do you do an iterative postorder traversal?
A: One way is to push (node, visited) pairs: the first time a node is popped, push it back marked visited and then push its children; when a visited node is popped, process it. Another is to do a modified preorder (root, right, left) and reverse the output.

## dsa.recursion.memoization-intro
name: "Memoization intro"
importance: important
prereqs: [dsa.recursion.recursion-tree-thinking]
scope: "caching repeated subproblems as the bridge to DP"

### simple
Memoization means remembering the answer to a question the first time you work it out, so you never work it out again. It is like writing answers in the margin of a textbook: next time the same question comes up, you just read your note. Recursive functions that keep solving the same small problems become dramatically faster this way.

### interview
- Add a cache keyed by the function's arguments: check it first, compute on a miss, store before returning.
- Only valid when the result depends **only on the arguments** (a pure function), not on outside mutable state.
- Cost becomes **number of distinct states × work per state**: naive Fibonacci O(φⁿ) becomes O(n).
- Keys: arrays for small integer arguments, hash maps otherwise (encode several arguments into one integer key, or use `map<tuple<...>, T>`).
- Memoization is **top-down DP**: it computes only the states actually reached; tabulation (bottom-up) fills every state in order.
- Recursion depth still applies; very deep memoized recursions may need to become bottom-up.

### questions
Q: What is memoization, and when is it valid?
A: Storing the result of a function call keyed by its arguments, and returning the stored result when the same arguments come again. It is only valid when the function's result depends solely on its arguments, with no hidden state such as a global that changes between calls.

Q: How does memoization change the complexity of a recursive solution?
A: Each distinct state is computed once, so the time becomes the number of distinct states times the work per state, ignoring cache hits. Naive Fibonacci drops from exponential to O(n), and a grid path count with states (r, c) becomes O(R · C).

Q: What is the relationship between memoization and dynamic programming?
A: Memoization is top-down dynamic programming: a recursion with a cache, which computes only the states it reaches. Tabulation is bottom-up DP, which fills a table in an order that guarantees each state's dependencies are ready. Both exploit overlapping subproblems.

Q: How do you choose the cache structure?
A: If the arguments are small integers with known bounds, use an array (fastest), initialized to a sentinel such as −1. Otherwise use a hash map keyed by the arguments.
