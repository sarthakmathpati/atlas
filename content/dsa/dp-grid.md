---
topic: dsa.dp-grid
name: "Dynamic programming: grids"
subject: dsa
order: 28
prereqs: [dsa.dp-foundations]
---

## dsa.dp-grid.grid-path-dp
name: "Grid path DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "unique paths with and without obstacles, minimum path sum"

### simple
Grid path DP counts or optimizes routes through a grid when you can only move right or down. Each cell's answer comes from the cell above and the cell to its left, because those are the only ways in. Filling the grid row by row from the top-left corner builds every answer in one sweep.

### interview
- State `dp[r][c]` = answer for reaching cell (r, c). Moves right or down, so `dp[r][c]` combines `dp[r-1][c]` and `dp[r][c-1]`.
- **Unique paths**: sum; first row and column are 1. Also `C(R + C − 2, R − 1)` by combinatorics.
- **With obstacles**: an obstacle cell has 0 paths; the first row or column stops at the first obstacle.
- **Minimum path sum**: `grid[r][c] + min(above, left)`.
- **O(R · C)** time; **O(C)** space with one row.
- Other directions or diagonal moves change which neighbors you read, and possibly the fill order.

### deep
#### Intuition

A path that reaches (r, c) by right and down moves must have come from (r − 1, c) or (r, c − 1). So the number of paths to (r, c) is the sum of the paths to those two cells, and the cheapest path is the cheaper of the two plus the current cell. Filling rows top to bottom and columns left to right guarantees both neighbors are ready.

#### Worked example: unique paths with an obstacle

3 × 3 grid, obstacle at the center (1, 1).

| | c=0 | c=1 | c=2 |
|---|---|---|---|
| r=0 | 1 | 1 | 1 |
| r=1 | 1 | 0 (obstacle) | 1 |
| r=2 | 1 | 1 | 2 |

Two paths: around the top-right and around the bottom-left.

#### Code

```cpp
long long uniquePathsWithObstacles(const vector<vector<int>>& g) {
    int C = g[0].size();
    vector<long long> row(C, 0);
    row[0] = 1;                                         // one way to stand at the start
    for (const auto& line : g)
        for (int c = 0; c < C; c++) {
            if (line[c] == 1) row[c] = 0;               // obstacle: nothing passes through
            else if (c > 0) row[c] += row[c - 1];       // above (old row[c]) + left
        }
    return row[C - 1];
}

int minPathSumGrid(const vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size();
    vector<vector<int>> dp(R, vector<int>(C));
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (r == 0 && c == 0) dp[r][c] = g[0][0];
            else if (r == 0) dp[r][c] = dp[r][c - 1] + g[r][c];
            else if (c == 0) dp[r][c] = dp[r - 1][c] + g[r][c];
            else dp[r][c] = min(dp[r - 1][c], dp[r][c - 1]) + g[r][c];
        }
    return dp[R - 1][C - 1];
}
```

#### Complexity

$O(R \cdot C)$ time. Space $O(R \cdot C)$ for the full table, $O(C)$ with one row. The combinatorial formula is $O(\min(R, C))$ but doesn't handle obstacles.

#### Edge cases and bugs

- An obstacle at the start or the end: the answer is 0.
- Obstacles in the first row or column block everything after them in that row or column; the one-row code handles it because `row[c]` stays 0.
- Counting paths can overflow 32 bits for large grids (use 64-bit or a modulus).

#### Variants

- Paths with exactly k turns or through required cells (multiply path counts across segments).
- Minimum falling path sum (three possible predecessors), triangle.
- Dungeon game: fill from the bottom-right because the needed health depends on the future.
- Cherry pickup: two walkers moving together, state (step, r1, r2).
- Unique paths III (visit every empty cell exactly once): backtracking, not DP.

Connects to: memoization vs tabulation, space optimization, triangle and falling paths, hard grid DP.

### questions
Q: How do you count paths from the top-left to the bottom-right moving only right or down?
A: dp[r][c] = dp[r − 1][c] + dp[r][c − 1], with every cell in the first row and column equal to 1. It fills in O(R · C). The count also equals C(R + C − 2, R − 1), since a path is a choice of which moves go down.

Q: How do obstacles change the recurrence?
A: An obstacle cell gets 0 paths, so it contributes nothing to its right and lower neighbors. In the first row or column, every cell after an obstacle also gets 0, since it has no other way in.

Q: How do you compute the minimum path sum in O(C) space?
A: Keep one row where row[c] is the best cost to reach column c in the current row. Update left to right with row[c] = grid[r][c] + min(row[c], row[c − 1]): the old row[c] is the cell above and row[c − 1] is the updated cell to the left.

Q: When must you fill a grid DP from the bottom-right instead?
A: When a cell's value depends on what happens after it, as in the dungeon game, where the health needed at a cell depends on the rooms still ahead. Then the state "minimum health needed from here to the end" is computed backward from the goal.

### signals
- count paths or find the cheapest path in a grid moving only right and down (or down and diagonally)
- obstacles that block some cells of a route grid
- each cell's answer depends on the cell above and the cell to the left
- robot or person moving from one corner to the opposite corner

### template
```cpp
// Grid DP: each cell combines its upper and left neighbors.
long long gridDp(const vector<vector<int>>& g) {
    int R = g.size(), C = g[0].size();
    vector<vector<long long>> dp(R, vector<long long>(C, 0));
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (g[r][c] == 1) { dp[r][c] = 0; continue; }       // blocked cell
            if (r == 0 && c == 0) { dp[r][c] = 1; continue; }   // base: the start
            long long up = r > 0 ? dp[r - 1][c] : 0;
            long long left = c > 0 ? dp[r][c - 1] : 0;
            dp[r][c] = up + left;                               // sum (or min/max plus cost)
        }
    return dp[R - 1][C - 1];
}
```

## dsa.dp-grid.triangle-and-falling-paths
name: "Triangle and falling paths"
importance: important
prereqs: [dsa.dp-grid.grid-path-dp]
scope: "top-down vs bottom-up"

### simple
In a triangle of numbers, you walk from the top to the bottom row, stepping to one of the two numbers below you, and want the smallest total. Working from the bottom row upward is easiest: each number's best total is itself plus the better of the two below it. By the time you reach the top, the single number there holds the answer.

### interview
- **Triangle**: bottom-up `dp[j] = tri[i][j] + min(dp[j], dp[j+1])` from the second-to-last row upward; answer `dp[0]`. O(n²) time, O(n) space (can reuse the last row).
- Top-down works too but the answer is the minimum over the bottom row, with edge cells having one parent.
- **Minimum falling path sum** (square matrix, move down, down-left or down-right): `dp[r][c] = m[r][c] + min(dp[r-1][c-1..c+1])`; answer min of the last row. O(n²).
- **Falling path with non-zero shifts** (next row must use a different column): keep the smallest and second smallest of the previous row for O(n²) instead of O(n³).
- Bottom-up is often simpler because the goal (a single top cell) collects everything.

### questions
Q: Why is bottom-up convenient for the triangle problem?
A: Starting from the bottom row, each cell's best path down is itself plus the smaller of its two children's best paths, which are already known. The top ends up holding the answer, and no special handling is needed for edges or for taking a minimum over the last row.

Q: How do you solve the triangle problem in O(n) extra space?
A: Keep one array initialized to the bottom row and update it upward: dp[j] = triangle[i][j] + min(dp[j], dp[j + 1]) for each row i, left to right. Each update reads values from the row below that haven't been overwritten yet.

Q: How does minimum falling path sum differ from the triangle?
A: Each cell can be reached from up to three cells above (up-left, up, up-right), columns at the edges have fewer options, and the path can start anywhere in the top row and end anywhere in the bottom row, so the answer is the minimum over the last row.

Q: How do you handle "consecutive rows must use different columns" efficiently?
A: For each row, record the smallest and second smallest dp values of the previous row and the column of the smallest. A cell takes the smallest unless it's in the same column, in which case it takes the second smallest. That brings each row to O(n) and the total to O(n²).

## dsa.dp-grid.square-submatrices
name: "Square submatrices"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-grid.grid-path-dp]
scope: "maximal square, count square submatrices"

### simple
To find the biggest square made entirely of 1s in a grid, ask for each cell: how large a square of 1s can end here, with this cell as its bottom-right corner? That square is limited by the squares ending just above, just to the left and diagonally up-left, like a stack of blocks that can only grow as tall as its shortest support. The smallest of those three, plus one, is the answer for the cell.

### interview
- `dp[r][c]` = side of the largest all-1 square with bottom-right corner (r, c): `min(dp[r-1][c], dp[r][c-1], dp[r-1][c-1]) + 1` if the cell is 1, else 0.
- **Maximal square**: area = (max dp)². **O(R · C)**, O(C) space with one row plus a saved diagonal.
- **Count square submatrices**: the sum of all dp values (a cell with dp = k ends k squares: sides 1..k).
- Rectangles (not squares) need the histogram method instead.
- Border-only or other shapes need different states (for example, runs of 1s in each direction).

### deep
#### Intuition

A square of side $k$ ending at (r, c) contains three squares of side $k - 1$ ending at its top, left and top-left neighbors. Conversely, if all three neighbors support side $k - 1$ and the cell is 1, the square of side $k$ is filled. So the side at (r, c) is exactly one more than the minimum of the three.

#### Worked example

```
1 0 1 0 0
1 0 1 1 1
1 1 1 1 1
1 0 0 1 0
```

dp:

```
1 0 1 0 0
1 0 1 1 1
1 1 1 2 2
1 0 0 1 0
```

The maximum is 2, so the largest square has area 4 (rows 1 to 2, columns 3 to 4 or 2 to 3). Summing all dp values counts every square submatrix.

#### Code

```cpp
int maximalSquare(const vector<vector<char>>& m) {
    int R = m.size(), C = m[0].size(), best = 0;
    vector<int> row(C + 1, 0);                       // row[c + 1] = dp for column c
    for (int r = 0; r < R; r++) {
        int diag = 0;                                // dp[r-1][c-1]
        for (int c = 0; c < C; c++) {
            int above = row[c + 1];                  // dp[r-1][c], before overwriting
            row[c + 1] = m[r][c] == '1' ? 1 + min({above, row[c], diag}) : 0;
            diag = above;
            best = max(best, row[c + 1]);
        }
    }
    return best * best;
}
```

#### Complexity

$O(R \cdot C)$ time. Space $O(R \cdot C)$, or $O(C)$ with one row and a saved diagonal.

#### Edge cases and bugs

- Char grids ('0'/'1') versus int grids.
- Returning the side instead of the area.
- In the one-row version, losing the diagonal value (save the old value above before overwriting).

#### Variants

- Largest square of 1s on the border only: precompute runs of 1s to the left and up.
- Largest plus sign: runs of 1s in four directions, take the minimum.
- Maximal rectangle: histogram with a monotonic stack per row.

Connects to: grid path DP, space optimization, largest rectangle in histogram.

### questions
Q: What does dp[r][c] mean in the maximal square problem, and what is the recurrence?
A: It's the side length of the largest all-1 square whose bottom-right corner is at (r, c). If the cell is 1, it equals 1 + min(dp above, dp left, dp diagonally up-left); if the cell is 0, it's 0. The answer is the square of the maximum value.

Q: Why is the minimum of the three neighbors the right limit?
A: A square of side k at (r, c) requires squares of side k − 1 ending at the cells above, to the left and diagonally above-left, which together with the cell cover it exactly. If any of the three supports less, a side-k square has a 0 inside it.

Q: How do you count all square submatrices of 1s?
A: Use the same dp and add up every value. A cell with dp = k is the bottom-right corner of exactly k squares, with sides 1 through k, so the total sum counts each square once.

Q: Why doesn't this approach find the largest rectangle?
A: Rectangles aren't determined by one side length: a cell can end many rectangles of different widths and heights, and the three-neighbor minimum doesn't capture them. Use the histogram method with a monotonic stack instead.

### signals
- the largest square of 1s (or of equal cells) in a binary matrix
- count all square submatrices made of 1s
- a cell's answer limited by the smallest of its neighbors' answers
- growing squares from the bottom-right corner

### template
```cpp
// Square DP: side of the largest square ending at each cell.
vector<vector<int>> squareSides(const vector<vector<int>>& a) {
    int R = a.size(), C = a[0].size();
    vector<vector<int>> dp(R, vector<int>(C, 0));
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (!a[r][c]) continue;                                   // blocked cell
            if (r == 0 || c == 0) dp[r][c] = 1;                       // edges: side 1
            else dp[r][c] = 1 + min({dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]});
        }
    return dp;                                 // max for the largest square, sum to count them
}
```

## dsa.dp-grid.hard-grid-dp
name: "Hard grid DP"
importance: advanced
prereqs: [dsa.dp-grid.grid-path-dp]
scope: "cherry pickup, dungeon game with reverse DP"

### simple
Some grid problems break the simple "look above and to the left" rule. In the dungeon game, the health you need at a room depends on the rooms still ahead, so you compute from the exit backward. In cherry pickup, two trips interact, so you move two walkers at the same time and track both of their positions.

### interview
- **Dungeon game** (minimum starting health): reverse DP from the bottom-right: `need[r][c] = max(1, min(need[r+1][c], need[r][c+1]) - dungeon[r][c])`. Forward DP fails because both the current health and the minimum so far matter.
- **Cherry pickup** (go to the corner and back): model as two walkers from the start moving simultaneously; state `(step, r1, r2)` (columns follow from the step): O(n³). If both are on the same cell, count its cherries once.
- **Cherry pickup II** (two robots moving down rows): state `(row, c1, c2)`, 9 transitions each: O(R · C²).
- Lesson: when a path's value depends on the future, reverse the direction; when two paths interact, move them together.

### questions
Q: Why must the dungeon game be solved from the bottom-right?
A: The health needed when entering a room depends on the rooms after it: you need enough to survive this room and still have what the rest of the path requires. Computing from the exit backward makes "minimum health needed from here" well-defined, while a forward DP would have to track both current health and the lowest point reached.

Q: What is the recurrence for the dungeon game?
A: need[r][c] = max(1, min(need[r + 1][c], need[r][c + 1]) − dungeon[r][c]), with the cells past the exit set so that the exit needs max(1, 1 − dungeon[exit]). Health must always stay at least 1.

Q: Why is cherry pickup solved with two walkers instead of two separate trips?
A: Taking the best first trip greedily can leave a poor second trip, and the trips interact because a cherry can be picked only once. Moving two walkers simultaneously from the start, with state (step, r1, r2), lets the DP see both paths together and avoid counting a shared cell twice.

Q: What is the complexity of the two-walker cherry pickup DP?
A: There are about 2n steps and n choices for each walker's row, so O(n³) states with 4 transitions each, O(n³) time. Rolling over steps reduces space to O(n²).
