---
topic: dsa.complexity
name: "Complexity analysis"
subject: dsa
order: 1
prereqs: []
---

## dsa.complexity.big-o-big-theta-and-big-omega
name: "Big-O, Big-Theta and Big-Omega"
importance: must
scope: "meaning, dropping constants, dominant terms"

### simple
Big-O describes how the work an algorithm does grows as the input grows. It is like asking how the time to read a book grows with its number of pages, not how fast you read one page. Big-O is an upper bound, Big-Omega is a lower bound, and Big-Theta means both at once.

### interview
- $f(n) = O(g(n))$ means that for large enough $n$, $f(n) \le c \cdot g(n)$ for some constant $c$: an **upper bound** on growth.
- $\Omega$ is a **lower bound**; $\Theta$ is a **tight bound** (both $O$ and $\Omega$). In interviews, "O(n)" usually means the tight bound.
- Drop constants and lower-order terms: $3n^2 + 10n + 7$ is $O(n^2)$, because the largest term dominates for big $n$.
- Common order, slowest growth first: $1 < \log n < \sqrt{n} < n < n \log n < n^2 < 2^n < n!$.
- Bounds are about a **case** (worst, average, best), which you should name: quicksort is $O(n^2)$ worst case but $\Theta(n \log n)$ on average.
- Use one variable per independent input: two arrays of sizes $n$ and $m$ give $O(n + m)$ or $O(n \cdot m)$, never just $O(n)$.

### deep
#### Intuition

Complexity analysis ignores the details that change from machine to machine (clock speed, language, compiler) and keeps only the **shape of growth**. If one algorithm does $n$ steps and another does $n^2$, then at $n = 10^5$ the first does $10^5$ steps and the second $10^{10}$. No constant factor can rescue the second one.

#### The formal definitions

- $f(n) = O(g(n))$ if there are constants $c > 0$ and $n_0$ such that $f(n) \le c \cdot g(n)$ for every $n \ge n_0$.
- $f(n) = \Omega(g(n))$ if $f(n) \ge c \cdot g(n)$ for every $n \ge n_0$.
- $f(n) = \Theta(g(n))$ if both hold (with possibly different constants).

So $5n + 3 = O(n)$ (take $c = 6$, $n_0 = 3$), and it is also $O(n^2)$, because an upper bound can be loose. It is $\Theta(n)$ but not $\Theta(n^2)$. When an interviewer asks "what is the complexity", give the tightest bound you can justify.

#### Worked example: simplifying

| Expression | Dominant term | Big-O |
|---|---|---|
| $4n^2 + 100n + 7$ | $4n^2$ | $O(n^2)$ |
| $n \log n + 50n$ | $n \log n$ | $O(n \log n)$ |
| $2^n + n^{10}$ | $2^n$ | $O(2^n)$ |
| $\log_2 n$ vs $\log_{10} n$ | differ by a constant | both $O(\log n)$ |
| $n + m$ (two inputs) | neither dominates | $O(n + m)$ |

The base of a logarithm never matters inside Big-O, because $\log_a n = \log_b n / \log_b a$ and $1/\log_b a$ is a constant. The base of an exponent does matter: $4^n = (2^n)^2$ is not $O(2^n)$.

#### Reading code

```cpp
// O(n): one pass, constant work per element.
long long sumAll(const vector<int>& a) {
    long long total = 0;
    for (int x : a) total += x;
    return total;
}

// O(n^2): every pair (i, j) with i < j, about n^2 / 2 pairs.
int countEqualPairs(const vector<int>& a) {
    int n = a.size(), count = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] == a[j]) count++;
    return count;
}
```

The $n^2 / 2$ becomes $O(n^2)$ because the $1/2$ is a constant.

#### Pitfalls

- **Hidden costs in library calls.** `s = s + c` in a loop builds a new string each time, turning an $O(n)$ loop into $O(n^2)$ (`s += c` appends in place). `v.insert(v.begin(), x)` and `v.erase(v.begin())` on a vector are $O(n)$ each.
- **Confusing the variable.** A loop over the digits of $n$ is $O(\log n)$, not $O(n)$.
- **Saying "O(n) best case".** Big-O and "best case" are separate ideas: you can give an upper bound on the best case, a lower bound on the worst case, and so on. Name the case, then the bound.
- **Constants still matter in practice.** Two $O(n \log n)$ sorts can differ by 3x. Big-O decides which algorithms are feasible; constants decide which feasible one is fastest.

Connects to: analyzing loops, recursion complexity, constraints to complexity.

### questions
Q: What does it mean for an algorithm to be O(n log n)?
A: Its running time grows at most proportionally to n log n once the input is large enough. Formally there is a constant c such that the step count is at most c · n log n for all big n. It says nothing about small inputs or the exact constant.

Q: Why can you drop constants and lower-order terms?
A: Big-O describes growth for large n. A constant factor such as 3 in 3n² does not change how the cost scales, and a lower term such as 10n becomes negligible next to n² as n grows. Only the dominant term decides which algorithms stay feasible.

Q: What is the difference between Big-O, Big-Omega and Big-Theta?
A: Big-O is an upper bound, Big-Omega is a lower bound, and Big-Theta is a tight bound that holds in both directions. An algorithm that always does about 5n steps is O(n), Ω(n) and Θ(n); it is also O(n²), but that bound is loose.

Q: Is O(2^n) the same as O(3^n)?
A: No. 3^n / 2^n = 1.5^n grows without bound, so no constant can cover the gap. Different log bases are equivalent (they differ by a constant factor), but different exponential bases are not.

Q: Your function takes two arrays of sizes n and m and loops over both, one after the other. What is its complexity?
A: O(n + m). Keep both variables, because either array can be the larger one. If the loops were nested, it would be O(n · m).

## dsa.complexity.analyzing-loops
name: "Analyzing loops"
importance: must
prereqs: [dsa.complexity.big-o-big-theta-and-big-omega]
scope: "counting operations, nested loops, logarithmic loops"

### simple
To find a loop's cost, count how many times its body runs and multiply by the cost of one run. A loop that halves its counter each time is like tearing a phone book in half again and again: after a few dozen tears you are down to one page. That halving loop costs log n, while a plain loop costs n.

### interview
- Sequential blocks **add**: $O(n) + O(n^2) = O(n^2)$. Nested loops **multiply** when the inner count does not depend on the outer variable.
- A counter that multiplies or divides by a constant each step runs $O(\log n)$ times.
- Triangular nesting (`j` from `i` to `n`) still gives $\sum i = n(n+1)/2 = O(n^2)$.
- An inner loop that grows by doubling, `for (j = 1; j < n; j *= 2)` inside a loop over `i`, gives $O(n \log n)$.
- Harmonic nesting, `for (j = i; j <= n; j += i)`, gives $n(1 + 1/2 + \dots + 1/n) = O(n \log n)$; the sieve of Eratosthenes is $O(n \log \log n)$.
- Two pointers that each only move forward are $O(n)$ in total, even with a nested `while`: count total pointer moves, not loop nesting.

### deep
#### Intuition

A loop's cost is the **sum of the costs of its iterations**. Most of the time every iteration costs the same, so you multiply. When the cost changes per iteration, write the sum and simplify it.

#### The common shapes

| Loop shape | Iterations | Cost |
|---|---|---|
| `for i in 0..n` | $n$ | $O(n)$ |
| `for i in 0..n: for j in 0..n` | $n^2$ | $O(n^2)$ |
| `for i in 0..n: for j in i..n` | $n(n+1)/2$ | $O(n^2)$ |
| `i = n; while i > 0: i /= 2` | $\lfloor \log_2 n \rfloor + 1$ | $O(\log n)$ |
| `for i in 0..n: j = 1; while j < n: j *= 2` | $n \log n$ | $O(n \log n)$ |
| `for i in 1..n: for j = i; j <= n; j += i` | $\sum n/i$ | $O(n \log n)$ |
| `for i = 1; i * i <= n; i++` | $\sqrt{n}$ | $O(\sqrt{n})$ |

#### Worked example: the harmonic loop

```cpp
// For each i, visit its multiples i, 2i, 3i, ... up to n.
long long harmonic(int n) {
    long long steps = 0;
    for (int i = 1; i <= n; i++)
        for (int j = i; j <= n; j += i)
            steps++;
    return steps;
}
```

For $i = 1$ the inner loop runs $n$ times, for $i = 2$ about $n/2$, for $i = 3$ about $n/3$, and so on. The total is

$$n \left(1 + \tfrac{1}{2} + \tfrac{1}{3} + \dots + \tfrac{1}{n}\right) \approx n \ln n$$

so the loop is $O(n \log n)$, not $O(n^2)$ as the nesting might suggest. For $n = 10^6$ that is about $1.4 \times 10^7$ steps.

#### Worked example: amortized pointer moves

```cpp
// Longest run of equal values: the inner while looks nested,
// but i and j only move forward, so the total work is O(n).
int longestRun(const vector<int>& a) {
    int n = a.size(), best = 0, i = 0;
    while (i < n) {
        int j = i;
        while (j < n && a[j] == a[i]) j++;
        best = max(best, j - i);
        i = j;
    }
    return best;
}
```

Count how far each pointer travels in total: `j` goes from 0 to $n$ once, and `i` jumps along behind it. The total is $O(n)$.

#### Method

1. Find the variable that controls each loop and how it changes (add, multiply, divide).
2. Count iterations: additive change gives about $n/\text{step}$, multiplicative change gives $\log n$.
3. If the inner count depends on the outer variable, write the sum ($\sum i$, $\sum n/i$, $\sum \log i$) and simplify.
4. Add the cost of the work inside, including library calls (a `find` on a vector is $O(n)$, a `set::insert` is $O(\log n)$).
5. Keep only the dominant term.

#### Pitfalls

- A `while` loop nested in a `for` is not automatically $O(n^2)$; count total moves.
- A loop to `n` that calls `s.substr(...)` or copies a list each time hides another factor of $n$.
- $\sum_{i=1}^{n} \log i = \log n! = \Theta(n \log n)$, not $O(\log n)$.
- A loop from 1 to $n$ stepping by 2 is still $O(n)$: the step is a constant.

Connects to: Big-O notation, amortized analysis, two pointers, sieve of Eratosthenes.

### questions
Q: What is the complexity of a loop where i starts at n and is halved each iteration until it reaches 0?
A: O(log n). After k halvings the value is n / 2^k, which drops below 1 once k exceeds log₂ n. Any loop that multiplies or divides its counter by a constant runs a logarithmic number of times.

Q: A loop runs i from 1 to n, and inside it j runs over the multiples of i up to n. What is the total cost?
A: O(n log n). The inner loop runs about n / i times, so the total is n(1 + 1/2 + … + 1/n), and the harmonic series grows like ln n. The nesting looks quadratic, but the inner work shrinks fast.

Q: How do you analyze a nested while loop where the inner pointer never moves backwards?
A: Count the total movement of each pointer instead of multiplying loop bounds. If each pointer moves forward at most n times over the whole run, the total work is O(n). This is why two-pointer and sliding-window solutions are linear.

Q: What is the cost of for (i = 1; i * i <= n; i++)?
A: O(√n), because the loop stops once i exceeds √n. Trial division for primality uses exactly this bound.

Q: Two loops run one after another, one O(n) and one O(n log n). What is the total?
A: O(n log n). Sequential costs add, and n + n log n is dominated by n log n.

## dsa.complexity.recursion-complexity
name: "Recursion complexity"
importance: must
prereqs: [dsa.complexity.analyzing-loops]
scope: "recursion trees, recurrences, the Master theorem"

### simple
A recursive function's cost is the total work done across all of its calls. Picture the calls as a family tree: each call has children, and you add up the work on every level of the tree. A recurrence is just a short equation that describes that tree.

### interview
- Write the recurrence: $T(n) = a \cdot T(n/b) + f(n)$ for $a$ subproblems of size $n/b$ plus $f(n)$ work to split and combine.
- **Recursion tree**: work per level times number of levels. Merge sort does $O(n)$ per level over $\log n$ levels, so $O(n \log n)$.
- **Master theorem**: compare $f(n)$ with $n^{\log_b a}$. Smaller: $\Theta(n^{\log_b a})$. Equal: $\Theta(n^{\log_b a} \log n)$. Bigger (and regular): $\Theta(f(n))$.
- Branching recursion without memo: roughly $O(\text{branches}^{\text{depth}})$; naive Fibonacci is $O(2^n)$ (more precisely $O(\varphi^n)$).
- With memoization: number of distinct states times work per state.
- Recursion also costs **stack space** equal to the maximum depth.

### deep
#### Intuition

Every recursive call does some local work and then makes more calls. Draw the calls as a tree, write the work done at each node, and add it up level by level. The **recurrence** is the compact way to write that tree.

#### The recursion tree method

Take merge sort: $T(n) = 2T(n/2) + cn$.

| Level | Calls | Size of each | Work per level |
|---|---|---|---|
| 0 | 1 | $n$ | $cn$ |
| 1 | 2 | $n/2$ | $cn$ |
| 2 | 4 | $n/4$ | $cn$ |
| … | … | … | … |
| $\log_2 n$ | $n$ | 1 | $cn$ |

There are $\log_2 n + 1$ levels, each doing $cn$ work, so $T(n) = \Theta(n \log n)$.

Binary search: $T(n) = T(n/2) + c$. One call per level, $\log n$ levels, $\Theta(\log n)$.

#### The Master theorem

For $T(n) = a \, T(n/b) + f(n)$ with $a \ge 1$, $b > 1$, let $k = \log_b a$ (the number of leaves is $n^k$):

1. If $f(n) = O(n^{k - \epsilon})$, the leaves dominate: $T(n) = \Theta(n^k)$.
2. If $f(n) = \Theta(n^k)$, every level costs the same: $T(n) = \Theta(n^k \log n)$.
3. If $f(n) = \Omega(n^{k + \epsilon})$ and $a f(n/b) \le c f(n)$ for some $c < 1$, the root dominates: $T(n) = \Theta(f(n))$.

| Recurrence | $k$ | Case | Result |
|---|---|---|---|
| $2T(n/2) + n$ (merge sort) | 1 | 2 | $n \log n$ |
| $T(n/2) + 1$ (binary search) | 0 | 2 | $\log n$ |
| $2T(n/2) + 1$ (tree traversal) | 1 | 1 | $n$ |
| $4T(n/2) + n$ | 2 | 1 | $n^2$ |
| $3T(n/2) + n$ (Karatsuba) | 1.585 | 1 | $n^{1.585}$ |
| $2T(n/2) + n^2$ | 1 | 3 | $n^2$ |

#### Recurrences the Master theorem does not cover

- $T(n) = T(n-1) + O(1)$: a chain of $n$ calls, $O(n)$ (factorial, linked-list recursion).
- $T(n) = T(n-1) + O(n)$: $n + (n-1) + \dots$, $O(n^2)$ (selection sort written recursively, quicksort's worst case).
- $T(n) = 2T(n-1) + O(1)$: the tree doubles each level for $n$ levels, $O(2^n)$ (Tower of Hanoi, naive subsets).

#### Worked example: Fibonacci with and without memo

```cpp
// Naive: T(n) = T(n-1) + T(n-2) + O(1), exponential (about 1.618^n calls).
long long fibNaive(int n) {
    if (n < 2) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}

// Memoized: n + 1 distinct states, O(1) work each -> O(n) time, O(n) space.
long long fibMemo(int n, vector<long long>& memo) {
    if (n < 2) return n;
    if (memo[n] != -1) return memo[n];
    return memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
}
```

For memoized recursion, use **states times work per state**, not the tree: each state is computed once.

#### Pitfalls

- Forgetting the non-recursive work: copying a vector in each call (passing it by value, or building a sub-vector) adds $O(n)$ per call.
- Assuming "two recursive calls" means $O(2^n)$. Merge sort makes two calls but on halves, which gives $n \log n$.
- Ignoring stack depth: a recursion of depth $10^5$ or more can overflow the stack (commonly 8 MB on Linux, 1 MB on Windows).

Connects to: divide and conquer, memoization, merge sort, binary search.

### questions
Q: What is the recurrence for merge sort and how do you solve it?
A: T(n) = 2T(n/2) + O(n). The recursion tree has log n levels and each level does O(n) total merging work, so T(n) = O(n log n). The Master theorem's equal-work case gives the same answer.

Q: State the three cases of the Master theorem in words.
A: Compare the combine work f(n) with n^(log_b a), the number of leaves. If the leaves dominate, the answer is n^(log_b a); if they are equal, multiply by log n; if f(n) dominates (and shrinks geometrically down the tree), the answer is f(n).

Q: Why is naive recursive Fibonacci exponential, and how does memoization fix it?
A: Each call spawns two more and the same values are recomputed again and again, giving about φ^n ≈ 1.618^n calls. Memoization stores each fib(k) the first time it is computed, so there are only n + 1 distinct calls with O(1) work each, which is O(n).

Q: What is the complexity of T(n) = T(n − 1) + O(n)?
A: O(n²). Unrolling gives n + (n − 1) + … + 1 = n(n + 1)/2. This is quicksort's worst case, when every pivot is the smallest or largest element.

Q: How do you estimate the complexity of a memoized recursive function?
A: Multiply the number of distinct states by the work done per state, ignoring cached calls. For example, a memo over (i, j) with i, j < n and an O(n) loop inside is O(n³).

## dsa.complexity.space-complexity
name: "Space complexity"
importance: must
scope: "auxiliary space, recursion stack, in-place algorithms"

### simple
Space complexity measures how much extra memory an algorithm needs as the input grows. It is like counting the scratch paper you use while doing a sum, not the paper the question was printed on. Recursion uses hidden scratch paper too: every call waiting on the stack takes some memory.

### interview
- **Auxiliary space** is extra memory beyond the input; interviewers usually mean this when they ask about space.
- **Recursion stack** counts: a recursion of depth $d$ uses $O(d)$ space even without any arrays. DFS on a skewed tree is $O(n)$.
- **In-place** means $O(1)$ extra space (sometimes allowing $O(\log n)$ of stack, as in quicksort).
- Output space is usually not counted, but say so: "O(1) extra space besides the output".
- Common costs: hash map of $n$ items $O(n)$; 2D DP table $O(nm)$, often reducible to $O(m)$ with rolling rows.
- Trade-off: extra space often buys time (hash set for $O(1)$ lookups, memo tables).

### deep
#### Intuition

Time counts steps; space counts the **peak** memory in use at once. Memory that is freed and reused does not add up: a loop that creates a temporary array of size $n$ in each iteration uses $O(n)$ space at any moment, even though it allocates $O(n^2)$ over the whole run.

#### What counts

1. **Input**: usually excluded. If you modify it in place, say so, because some interviewers consider destroying the input a trade-off.
2. **Auxiliary data structures**: arrays, hash maps, heaps, queues you create.
3. **Call stack**: each active recursive call holds its local variables and return address. Peak depth times frame size.
4. **Output**: usually excluded (you cannot avoid producing it), but mention it.

#### Worked example: three ways to reverse an array

```cpp
// O(n) extra: builds a copy.
vector<int> reversedCopy(const vector<int>& a) {
    return vector<int>(a.rbegin(), a.rend());
}

// O(1) extra: swaps in place with two pointers.
void reverseInPlace(vector<int>& a) {
    int i = 0, j = (int)a.size() - 1;
    while (i < j) swap(a[i++], a[j--]);
}

// O(n) extra: in place, but recursion depth n / 2 uses the stack.
void reverseRecursive(vector<int>& a, int i, int j) {
    if (i >= j) return;
    swap(a[i], a[j]);
    reverseRecursive(a, i + 1, j - 1);
}
```

All three take $O(n)$ time; only the second uses $O(1)$ extra space.

#### Recursion depth examples

| Algorithm | Peak depth | Stack space |
|---|---|---|
| Binary search (recursive) | $\log n$ | $O(\log n)$ |
| DFS on a balanced tree | $\log n$ | $O(\log n)$ |
| DFS on a skewed tree or linked list | $n$ | $O(n)$ |
| Merge sort | $\log n$ | $O(\log n)$ stack plus $O(n)$ buffer |
| Quicksort (recurse on the smaller side first) | $\log n$ | $O(\log n)$ |

#### Reducing space

- **Rolling arrays in DP**: if row $i$ depends only on row $i-1$, keep two rows (or one) instead of the whole table.
- **Two pointers instead of a hash set** when the input is sorted.
- **Iterative instead of recursive** to avoid deep stacks (explicit stack still costs memory, but on the heap, which is much larger).
- **Reuse the input** as storage (marking visited cells, sign tricks) when mutation is allowed.

#### Pitfalls

- Saying "O(1) space" for a recursive DFS. The stack is real memory.
- Passing a `vector` or `string` by value copies it; pass `const&` (or indices) through recursion to avoid $O(n)$ per level.
- `s = s + t` creates a temporary string every time; build strings with `+=`, `reserve`, or an `ostringstream`.
- A 2D `vector<vector<int>>` of $10^4 \times 10^4$ ints is 400 MB. Check memory limits (usually 256 MB) against table sizes.

Connects to: recursion fundamentals, space optimization in DP, in-place array tricks.

### questions
Q: What is auxiliary space, and why do interviewers usually ask about it instead of total space?
A: Auxiliary space is the extra memory an algorithm uses beyond its input. The input has to exist anyway, so the useful comparison between two solutions is how much additional memory each needs.

Q: A recursive DFS on a binary tree uses no arrays. What is its space complexity?
A: O(h), where h is the tree's height, because each active call sits on the stack. For a balanced tree that is O(log n); for a skewed tree it is O(n).

Q: What does in-place mean for an algorithm?
A: It transforms the input using only O(1) extra memory (some definitions allow O(log n) stack, as in quicksort). Reversing an array with two pointers and heap sort are in place; merge sort on arrays is not, because it needs an O(n) buffer.

Q: How can you reduce the space of a 2D DP where each row depends only on the previous row?
A: Keep only two rows, or even one row updated in the right direction, which cuts space from O(n·m) to O(m). You lose the ability to reconstruct the path unless you store choices separately.

Q: Does allocating a new array of size n inside a loop that runs n times use O(n²) space?
A: No, if each array is discarded before the next is made. Space measures peak memory in use at once, which is O(n). It does cost O(n²) time to allocate and fill them.

## dsa.complexity.amortized-analysis
name: "Amortized analysis"
importance: important
prereqs: [dsa.complexity.analyzing-loops]
scope: "dynamic array doubling, aggregate method"

### simple
Amortized analysis averages the cost of an operation over a long sequence of operations. It is like a gym membership: one day you pay a big fee, but spread over the year it is a small cost per visit. A dynamic array occasionally copies everything to grow, yet each append still costs O(1) on average.

### interview
- Amortized cost is the **worst-case total** of a sequence of operations divided by the number of operations; no randomness is involved (unlike average case).
- Dynamic array (`std::vector`) doubles capacity when full (libstdc++ doubles; MSVC grows by 1.5×, which gives the same bound): $n$ appends cost $n + (1 + 2 + 4 + \dots + n) < 3n$, so **O(1) amortized** per append.
- Growing by a constant (+10 each time) instead of doubling gives $O(n^2)$ total, $O(n)$ per append.
- **Aggregate method**: bound the total work of $n$ operations directly. Examples: monotonic stack (each element pushed and popped once), two pointers.
- A single operation can still be slow ($O(n)$ on a resize); say "O(1) amortized" rather than "O(1)" when latency spikes matter.

### deep
#### Intuition

Some data structures do cheap work most of the time and expensive work rarely. Worst-case-per-operation analysis would call every operation expensive, which overstates the total. Amortized analysis bounds the **total** cost of any sequence of $n$ operations and divides by $n$.

#### Dynamic array doubling

Start with capacity 1 and double when full. Appending $n$ items triggers copies of size $1, 2, 4, \dots$ up to at most $n$:

$$1 + 2 + 4 + \dots + 2^k < 2 \cdot 2^k \le 2n$$

Add the $n$ writes of the new items and the total is under $3n$, so each append is $O(1)$ amortized.

| Append # | Capacity before | Copy cost | Total so far |
|---|---|---|---|
| 1 | 0 → 1 | 0 | 1 |
| 2 | 1 → 2 | 1 | 3 |
| 3 | 2 → 4 | 2 | 6 |
| 4 | 4 | 0 | 7 |
| 5 | 4 → 8 | 4 | 12 |
| 6 to 8 | 8 | 0 | 15 |
| 9 | 8 → 16 | 8 | 24 |

The total stays below $3n$ at every point. Any constant growth factor above 1 works (C++ implementations use 1.5 or 2). Growing by a fixed amount does not: copies of $10, 20, 30, \dots$ sum to $O(n^2)$.

#### The aggregate method elsewhere

Monotonic stack for "next greater element":

```cpp
vector<int> nextGreater(const vector<int>& a) {
    int n = a.size();
    vector<int> ans(n, -1);
    vector<int> st;                        // indices with no answer yet
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.back()] < a[i]) {
            ans[st.back()] = a[i];         // each index is popped at most once
            st.pop_back();
        }
        st.push_back(i);                   // each index is pushed once
    }
    return ans;
}
```

The inner `while` can pop many items in one step, but across the whole run there are at most $n$ pushes and $n$ pops, so the total is $O(n)$ and each step is $O(1)$ amortized.

#### Other methods (for depth)

- **Accounting method**: charge each cheap operation a little extra "credit" that pays for later expensive ones. Charging 3 per append pays for the item and for copying it and one older item at the next resize.
- **Potential method**: define a potential function (for the array, $2 \cdot \text{size} - \text{capacity}$) and show that actual cost plus change in potential is constant.

#### Amortized vs average case

Average case assumes a distribution over inputs (random pivots, random keys). Amortized is a **guarantee** for every sequence: no bad input can make $n$ appends cost more than $3n$. Hash tables mix both: resizing is amortized, while $O(1)$ lookups rely on keys hashing evenly.

#### Pitfalls

- A shrink policy that halves at half-full can thrash (grow, shrink, grow) around the boundary; shrinking at a quarter full avoids it.
- Amortized $O(1)$ still allows one $O(n)$ spike, which matters for real-time systems.

Connects to: dynamic arrays, monotonic stack, union-find, hash table resizing.

### questions
Q: Why is appending to a dynamic array O(1) amortized?
A: When the array is full it doubles its capacity and copies everything, but these copies have sizes 1, 2, 4, …, n, which sum to less than 2n. Over n appends the total work is under 3n, so each append costs O(1) on average over the sequence.

Q: What goes wrong if a dynamic array grows by a fixed 100 slots instead of doubling?
A: Resizes happen every 100 appends and copy 100, 200, 300, … elements, which sums to O(n²/100) = O(n²). Each append then costs O(n) amortized. Growth must be geometric for O(1) amortized appends.

Q: How is amortized analysis different from average-case analysis?
A: Amortized analysis bounds the total cost of any sequence of operations in the worst case; no randomness is assumed. Average-case analysis assumes a probability distribution over inputs and gives an expected cost.

Q: In a monotonic stack solution, the inner while loop can pop many elements. Why is the algorithm still O(n)?
A: Each element is pushed exactly once and popped at most once, so all the pops together cost at most n. Counting the total work across the run (the aggregate method) gives O(n).

## dsa.complexity.constraints-to-complexity
name: "Constraints to complexity"
importance: must
prereqs: [dsa.complexity.analyzing-loops]
scope: "n ≤ 10 allows n!, 20 allows 2^n, 500 allows n^3, 5,000 allows n^2, 10^5 to 10^6 needs n log n or n, larger needs log n or O(1)"

### simple
The input limits in a problem quietly tell you which algorithm is expected. A computer does roughly 10^8 simple steps per second, so you can work backwards from n to the slowest complexity that still fits. It is like knowing a trip must take under an hour: that tells you whether to walk, cycle or drive.

### interview
- Budget: about $10^8$ simple operations per second in C++. Typical limits are 1 to 2 seconds.
- $n \le 10$: $O(n!)$, permutations. $n \le 20$: $O(2^n)$ or $O(2^n \cdot n)$, subsets and bitmask DP. $n \le 40$: meet in the middle, $O(2^{n/2})$.
- $n \le 500$: $O(n^3)$, interval DP or Floyd-Warshall. $n \le 5000$: $O(n^2)$, 2D DP.
- $n \le 10^5$ to $10^6$: $O(n \log n)$ or $O(n)$: sorting, heaps, binary search, two pointers, hashing.
- $n$ up to $10^9$ or $10^{18}$: $O(\log n)$ or $O(1)$: binary search on the answer, math, fast exponentiation.
- Use it in both directions: pick the target complexity first, then look for a pattern that achieves it; and sanity-check your idea before coding.

### deep
#### Intuition

Problem setters choose limits so that the intended solution passes and slower ones do not. Reading $n \le 2 \cdot 10^5$ is a strong hint that $O(n^2)$ ($4 \cdot 10^{10}$ steps) is too slow and $O(n \log n)$ (about $3.6 \cdot 10^6$) is expected. In interviews the constraints are often unstated, so ask for them: "How large can the array be?"

#### The table

| Largest $n$ | Feasible complexity | Typical techniques |
|---|---|---|
| 10 to 11 | $O(n!)$, $O(n! \cdot n)$ | permutations, brute force |
| 15 to 20 | $O(2^n \cdot n)$, $O(3^n)$ at 15 | subsets, bitmask DP, backtracking |
| 40 | $O(2^{n/2} \cdot n)$ | meet in the middle |
| 100 to 500 | $O(n^3)$ | interval DP, Floyd-Warshall, triple loops |
| 1,000 to 5,000 | $O(n^2)$, $O(n^2 \log n)$ at 1,000 | 2D DP, all pairs |
| $10^5$ to $10^6$ | $O(n \log n)$, $O(n)$ | sorting, heaps, segment trees, two pointers, hashing, linear DP |
| $10^7$ to $10^8$ | $O(n)$ with small constants | a single pass, sieve |
| $10^9$ to $10^{18}$ | $O(\log n)$, $O(\sqrt{n})$ at $10^{12}$, $O(1)$ | binary search on the answer, math, matrix power |

#### Worked example: sizing a solution

Suppose the task is "count pairs $(i, j)$ with $a_i + a_j = k$" and $n \le 10^5$.

1. Brute force over all pairs: $n^2 / 2 = 5 \cdot 10^9$. Too slow.
2. Target: $O(n \log n)$ or $O(n)$.
3. Candidates: sort plus two pointers ($O(n \log n)$), or a hash map of counts ($O(n)$).

```cpp
long long countPairs(const vector<int>& a, int k) {
    unordered_map<long long, long long> seen;  // value -> how many times seen
    long long pairs = 0;
    for (int x : a) {
        auto it = seen.find((long long)k - x);
        if (it != seen.end()) pairs += it->second;
        seen[x]++;
    }
    return pairs;
}
```

The constraint pointed straight at hashing.

#### Other limits worth reading

- **Value ranges**: values up to $10^9$ mean sums can overflow 32-bit ints (use `long long`); values up to $10^6$ allow counting arrays instead of hash maps.
- **Sum of lengths**: "the total length of all strings is at most $10^5$" allows per-string work proportional to its length.
- **Number of queries**: $q \le 10^5$ queries on $n \le 10^5$ items rules out $O(n)$ per query; you need preprocessing (prefix sums, segment trees).
- **Small second dimension**: a grid $10^3 \times 10^3$ has $10^6$ cells, so BFS over cells is fine.

#### Pitfalls

- Constant factors near the limit: `unordered_map` and `set` operations cost many times a plain array access, and `endl` flushes output on every line (use `'\n'`).
- Hidden logarithms and constants: $O(n \log^2 n)$ at $n = 10^6$ is about $4 \cdot 10^8$.
- Recursion depth limits apply even when time is fine.

Connects to: Big-O notation, pattern recognition, reading the problem.

### questions
Q: The array length is up to 10^5. Is an O(n²) solution acceptable?
A: No. n² is 10^10 operations, far beyond the roughly 10^8 per second a typical time limit allows. Aim for O(n log n) or O(n), for example sorting, hashing, two pointers or a heap.

Q: What does a constraint of n ≤ 20 suggest?
A: Exponential work over subsets is fine: 2^20 is about a million, so O(2^n · n) passes. It hints at bitmask DP, backtracking over subsets, or brute force over all choices.

Q: What complexity is expected when n can be as large as 10^18?
A: Anything linear is impossible, so the solution must be O(log n) or O(1) (at most O(√n) up to about 10^12). Think binary search on the answer, fast exponentiation, or a closed-form formula.

Q: The interviewer doesn't state the input size. What should you do?
A: Ask. The size decides whether a brute force is acceptable or which complexity to target. If they leave it open, state the brute-force complexity, then say you will aim for a better bound and explain why.

Q: Why does n ≤ 500 often hint at O(n³)?
A: 500³ is 1.25 × 10^8, which fits in about a second in C++. Setters pick this limit for interval DP, Floyd-Warshall or triple loops, where O(n²) is not known and O(n⁴) would be too slow.

## dsa.complexity.best-average-and-worst-case
name: "Best, average and worst case"
importance: important
scope: "quicksort and hash table examples"

### simple
The same algorithm can be fast on one input and slow on another. Looking for your keys can take a second if they are on the hook, or an hour if they are in the last place you check. Best, average and worst case describe the lucky input, the typical input and the unluckiest input.

### interview
- **Worst case**: the maximum cost over all inputs of size $n$; the default when a bound is stated without qualification.
- **Average case**: expected cost under an assumed input distribution (or over the algorithm's own random choices).
- **Best case**: rarely useful; almost any algorithm can be fast on a lucky input.
- Quicksort: $O(n \log n)$ average, $O(n^2)$ worst (already sorted input with a first-element pivot); random pivots make the worst case very unlikely.
- Hash table lookup: $O(1)$ average, $O(n)$ worst when many keys collide in one bucket.
- Insertion sort: $O(n)$ best (already sorted), $O(n^2)$ worst and average.

### questions
Q: What input makes quicksort with a first-element pivot run in O(n²)?
A: An already sorted (or reverse sorted) array. Every partition splits off only the pivot, so the recursion goes n levels deep with n, n − 1, n − 2, … comparisons. Choosing a random pivot or the median of three avoids this in practice.

Q: Why are hash table lookups O(1) on average but O(n) in the worst case?
A: With a good hash function and a bounded load factor, keys spread evenly and each bucket holds a constant number of items on average. If many keys land in the same bucket, a lookup must scan them all, which is O(n) in the worst case.

Q: Is average case the same as amortized cost?
A: No. Average case assumes a distribution over inputs or random choices and gives an expected cost. Amortized cost is a worst-case guarantee on the total of a sequence of operations, with no randomness involved.

Q: Which case should you quote in an interview?
A: The worst case by default, and name the average case when it differs and matters, as with quicksort and hash maps. Say which one you mean, for example "O(1) average, O(n) worst case".
