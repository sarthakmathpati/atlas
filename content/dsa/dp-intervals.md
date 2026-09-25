---
topic: dsa.dp-intervals
name: "Dynamic programming: intervals and games"
subject: dsa
order: 32
prereqs: [dsa.dp-foundations]
---

## dsa.dp-intervals.interval-dp
name: "Interval DP"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "dp over ranges, iterating by length"

### simple
Interval DP solves a problem on a range of items by combining answers for smaller ranges inside it. Merging a row of piles into one, for example, always ends with a final merge of a left part and a right part, so you try every split point. Computing short ranges first means the answers for the pieces are always ready.

### interview
- State `dp[l][r]` for the subarray or substring from l to r. Transition usually tries a **split point** k: `dp[l][r] = best over k of dp[l][k] ⊕ dp[k+1][r] ⊕ cost(l, r, k)`, or peels off the ends.
- **Order**: iterate by increasing **length** (or l from n−1 down to 0 and r upward), so inner ranges are ready.
- Typical cost: O(n²) states × O(n) splits = **O(n³)**; fine for n up to about 500.
- Examples: merge adjacent piles, matrix chain multiplication, burst balloons, minimum cost to cut a stick, palindromic subsequences, optimal BST, polygon triangulation, stone games.
- Prefix sums give range sums in O(1) inside the transition.
- Ask: "what is the first or last operation on this range?" That choice defines the split.

### deep
#### Intuition

When the last operation on a range combines two adjacent sub-ranges (or acts on one element while the rest is already done), the optimal answer for the range is built from optimal answers for smaller ranges. There are only $O(n^2)$ ranges, so you can compute them all, shortest first.

#### Worked example: merge adjacent piles

Piles `3 4 2`; merging two adjacent piles costs their total size; merge everything into one pile at minimum total cost. `dp[l][r] = min over k of dp[l][k] + dp[k+1][r] + sum(l..r)`.

| range | options | dp |
|---|---|---|
| [0,0], [1,1], [2,2] | single piles | 0 |
| [0,1] = 3 4 | 0 + 0 + 7 | 7 |
| [1,2] = 4 2 | 0 + 0 + 6 | 6 |
| [0,2] = 3 4 2 | k=0: 0 + 6 + 9 = 15; k=1: 7 + 0 + 9 = 16 | 15 |

Best: merge 4 and 2 first (cost 6), then with 3 (cost 9): **15**.

#### Code

```cpp
long long mergePiles(const vector<int>& a) {
    int n = a.size();
    vector<long long> pre(n + 1, 0);
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];
    vector<vector<long long>> dp(n, vector<long long>(n, 0));
    for (int len = 2; len <= n; len++)                    // shorter ranges first
        for (int l = 0; l + len - 1 < n; l++) {
            int r = l + len - 1;
            dp[l][r] = LLONG_MAX;
            for (int k = l; k < r; k++)                   // last merge joins [l,k] and [k+1,r]
                dp[l][r] = min(dp[l][r], dp[l][k] + dp[k + 1][r]);
            dp[l][r] += pre[r + 1] - pre[l];              // the final merge costs the range sum
        }
    return n ? dp[0][n - 1] : 0;
}
```

#### Complexity

$O(n^2)$ states, $O(n)$ transitions each: $O(n^3)$ time, $O(n^2)$ space. Some problems allow Knuth's optimization (restricting split points) down to $O(n^2)$.

#### Edge cases and bugs

- Loop order: iterating l upward and r upward without length ordering reads unfinished states.
- Off-by-one in split ranges (`[l, k]` and `[k+1, r]` versus `[l, k-1]`, `[k+1, r]` when k itself is removed).
- Overflow in costs; use 64-bit.

#### Variants

- Matrix chain multiplication, optimal binary search tree (weighted depths).
- Burst balloons and cutting sticks (choose the **last** action in the range).
- Remove boxes, strange printer (extra state beyond the range).
- Game on a range (stone game): the state is the remaining range; the value is a score difference.

Connects to: designing DP states, prefix sums, matrix chain multiplication, choosing the last action, game DP.

### questions
Q: How are interval DP states defined and ordered?
A: dp[l][r] holds the answer for the range l..r. Because a range depends on strictly smaller ranges inside it, fill the table by increasing range length, or with l decreasing and r increasing.

Q: What is the typical complexity of interval DP, and why?
A: O(n³): there are O(n²) ranges, and each tries O(n) split points or choices. It's practical for n up to a few hundred.

Q: How do you find the split point in an interval DP problem?
A: Ask what the first or last operation on the range is. If the last step joins two adjacent parts, try every boundary k between them. If the last step removes one element k, the two sides l..k − 1 and k + 1..r become independent.

Q: Why do prefix sums often appear inside interval DP?
A: Many transitions add a cost equal to the total of the range, such as the cost of merging piles. Prefix sums give any range total in O(1), keeping the transition cost at O(n) per state.

### signals
- the answer for a range is built from answers for smaller sub-ranges
- merging adjacent elements with a cost until one remains
- choose the order of operations on a sequence (burst, cut, multiply)
- n up to a few hundred with a cubic-time budget

### template
```cpp
// Interval DP by increasing length, trying every split point.
long long intervalDp(int n, function<long long(int, int, int)> joinCost) {
    vector<vector<long long>> dp(n, vector<long long>(n, 0));    // length-1 ranges: base 0
    for (int len = 2; len <= n; len++)
        for (int l = 0; l + len - 1 < n; l++) {
            int r = l + len - 1;
            dp[l][r] = LLONG_MAX;
            for (int k = l; k < r; k++)                           // [l, k] + [k + 1, r]
                dp[l][r] = min(dp[l][r], dp[l][k] + dp[k + 1][r] + joinCost(l, k, r));
        }
    return dp[0][n - 1];
}
```

## dsa.dp-intervals.matrix-chain-multiplication
name: "Matrix chain multiplication"
importance: important
prereqs: [dsa.dp-intervals.interval-dp]
scope: "the classic interval DP"

### simple
Multiplying a chain of matrices gives the same result no matter where you put the brackets, but the amount of work changes enormously. Matrix chain multiplication finds the cheapest bracketing. For every stretch of the chain, it tries each place for the last multiplication and keeps the cheapest.

### interview
- Matrices `A_1..A_n` with dimensions `p[0] × p[1], p[1] × p[2], …, p[n-1] × p[n]`; multiplying an a×b by a b×c matrix costs a·b·c.
- `dp[i][j]` = min cost to multiply `A_i..A_j`: `min over i ≤ k < j of dp[i][k] + dp[k+1][j] + p[i-1]·p[k]·p[j]`; `dp[i][i] = 0`.
- **O(n³)** time, O(n²) space; store the best k to print the parenthesization.
- Example: dimensions 10×30, 30×5, 5×60: (AB)C costs 1500 + 3000 = 4500; A(BC) costs 9000 + 18000 = 27000.
- The template for many interval DPs (optimal BST, polygon triangulation).

### questions
Q: What is the recurrence for matrix chain multiplication?
A: dp[i][j] = min over k from i to j − 1 of dp[i][k] + dp[k + 1][j] + p[i − 1] · p[k] · p[j], where the last term is the cost of multiplying the two resulting matrices. dp[i][i] = 0, and ranges are filled by increasing length.

Q: Why does the parenthesization matter?
A: Matrix multiplication is associative, so the result is the same, but the number of scalar multiplications depends on the intermediate matrix sizes. For 10×30, 30×5 and 5×60 matrices, (AB)C costs 4,500 multiplications and A(BC) costs 27,000.

Q: How do you output the optimal parenthesization, not just its cost?
A: Store split[i][j], the k that achieved the minimum. Then recursively print: for i..j, print "(" + solution(i, k) + solution(k + 1, j) + ")", with single matrices printed as their names.

Q: What is the complexity of the DP?
A: O(n³) time, from O(n²) ranges each trying O(n) split points, and O(n²) space for the table.

## dsa.dp-intervals.choosing-the-last-action
name: "Choosing the last action"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "burst balloons, minimum cost to cut a stick"

### simple
Some interval problems become easy only if you think about which action happens last instead of first. When bursting balloons, the first balloon you pop changes everyone's neighbors, which is messy; but the last balloon popped in a range still has the range's fixed borders as neighbors. Choosing the last action splits the range into two independent halves.

### interview
- **Burst balloons**: pad with 1 at both ends; `dp[l][r]` = best coins bursting everything strictly between l and r; last balloon k in (l, r): `dp[l][k] + dp[k][r] + a[l]·a[k]·a[r]`. O(n³).
- Choosing the **first** balloon fails because its neighbors depend on later choices; choosing the **last** fixes its neighbors as the range boundaries.
- **Minimum cost to cut a stick**: sort cuts, add 0 and n; `dp[i][j]` = min cost to make all cuts between cut i and cut j; the **first** cut k in the segment costs its length `c[j] - c[i]`: `dp[i][k] + dp[k][j] + (c[j] - c[i])`.
- The trick generalizes: pick the action that makes the two sides independent.

### questions
Q: Why does burst balloons use the last balloon popped in a range as the split?
A: When k is the last balloon popped strictly between l and r, all other balloons in the range are gone by then, so its neighbors are exactly l and r and it earns a[l] · a[k] · a[r]. The balloons on its left and right were popped independently, giving dp[l][k] + dp[k][r].

Q: Why doesn't choosing the first balloon work?
A: After popping the first balloon, its neighbors become adjacent, and the coins earned later depend on the order of all remaining pops across both sides. The two sides aren't independent, so the problem doesn't split.

Q: How do you solve minimum cost to cut a stick?
A: Sort the cut positions and add the stick's ends. dp[i][j] is the minimum cost to make every cut strictly between positions c[i] and c[j]; the first cut k made in that segment costs its length c[j] − c[i], and then the two pieces are independent: dp[i][j] = min over k of dp[i][k] + dp[k][j] + c[j] − c[i].

Q: Why do we pad the balloon array with 1s?
A: Balloons at the ends have a virtual neighbor worth 1 when popped. Adding 1 at both ends makes every balloon have two neighbors, so the same formula works everywhere and the whole problem is the range between the two padding balloons.

## dsa.dp-intervals.minimum-palindrome-cuts
name: "Minimum palindrome cuts"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "palindrome partitioning II"

### simple
Minimum palindrome cuts asks for the fewest cuts that split a string into pieces that are all palindromes. First, a table records which substrings are palindromes. Then, for each prefix, you try every possible last palindrome piece and keep the split that uses the fewest cuts.

### interview
- Precompute `isPal[l][r]` in O(n²) (or expand around centers).
- `cuts[i]` = minimum cuts for `s[0..i]`: 0 if `s[0..i]` is a palindrome, else `min over j of cuts[j-1] + 1` for each j with `isPal[j][i]`. **O(n²)** total.
- It's a segmentation DP (like word break with min), not a full O(n³) interval DP.
- Expand-around-center variant: from each center, extend palindromes and update `cuts[r] = min(cuts[r], cuts[l-1] + 1)`: O(n²) time, **O(n)** space.
- Listing all partitions (palindrome partitioning I) is backtracking, exponential in the worst case.

### questions
Q: How do you compute the minimum cuts for palindrome partitioning?
A: Build a table of which substrings are palindromes. Then cuts[i] for the prefix ending at i is 0 if the whole prefix is a palindrome; otherwise it's the minimum over j where s[j..i] is a palindrome of cuts[j − 1] + 1. The answer is cuts[n − 1], in O(n²).

Q: Why isn't this an O(n³) interval DP?
A: The only split that matters is where the last palindromic piece starts, so the state can be a prefix, not a range. With O(1) palindrome checks, each prefix tries O(n) starts, giving O(n²).

Q: How can you reduce the space to O(n)?
A: Skip the palindrome table: expand around every center, and whenever s[l..r] is found to be a palindrome, update cuts[r] = min(cuts[r], cuts[l − 1] + 1) (or 0 if l = 0). Each center's expansion visits its palindromes in increasing length.

Q: How does this relate to word break?
A: Both are segmentation DPs over prefixes where the last piece must be valid. Word break checks dictionary membership and asks for feasibility; this checks palindromes and asks for the minimum number of pieces.

## dsa.dp-intervals.game-dp
name: "Game DP"
importance: advanced
prereqs: [dsa.dp-intervals.interval-dp]
scope: "stone game, minimax over ranges"

### simple
Game DP works out the best result for two players who both play perfectly. On your turn you pick the move that is best for you, knowing the opponent will then do what is best for them. Storing the score difference, your points minus theirs, for each remaining position turns this back-and-forth into one simple recurrence.

### interview
- **Stone game** (take a pile from either end; maximize your total): `diff[l][r]` = best (current player's score − opponent's score) on piles l..r: `max(a[l] - diff[l+1][r], a[r] - diff[l][r-1])`. First player wins iff `diff[0][n-1] > 0`. O(n²).
- The **score difference** trick avoids tracking whose turn it is: the opponent's best difference is subtracted.
- **Minimax** in general: value(state) = max over moves of −value(next state) (negamax), for zero-sum games.
- Win/lose games (take 1 to 3 stones, Nim-like): a state is winning if some move leads to a losing state.
- Some games have closed forms (the classic even-piles stone game: the first player always wins by parity), but the DP is the general method.

### questions
Q: How do you decide who wins a game where players take stones from either end of a row?
A: Let diff[l][r] be the best score difference the player to move can achieve on piles l..r. Taking the left pile gives a[l] − diff[l + 1][r], and the right pile gives a[r] − diff[l][r − 1], since the opponent then moves optimally. The first player wins if diff[0][n − 1] > 0.

Q: Why store the score difference rather than each player's score?
A: With the difference from the mover's point of view, the opponent's best play on the remaining range is just subtracted, so one table works for both players and you don't need to track whose turn it is.

Q: How do you determine winning and losing positions in a simple take-away game?
A: A position with no moves is losing for the player to move. A position is winning if at least one move leads to a losing position, and losing if every move leads to a winning position. Compute from small positions upward.

Q: What is negamax?
A: A formulation of minimax for two-player zero-sum games where a position's value for the player to move is the maximum over moves of the negated value of the resulting position. It's what the score-difference recurrence uses.
