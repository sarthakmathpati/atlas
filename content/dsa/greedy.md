---
topic: dsa.greedy
name: "Greedy algorithms"
subject: dsa
order: 18
prereqs: [dsa.sorting]
---

## dsa.greedy.greedy-fundamentals
name: "Greedy fundamentals"
importance: must
scope: "greedy choice property, optimal substructure, when greedy fails"

### simple
A greedy algorithm makes the choice that looks best right now and never takes it back. Making change with the largest coins first is greedy, and with everyday coins it gives the fewest coins. But with odd coin values it can fail, so the real skill is knowing when "best right now" is also best overall.

### interview
- Greedy works when the problem has the **greedy choice property** (some optimal solution starts with the locally best choice) and **optimal substructure** (after the choice, what remains is a smaller instance of the same problem).
- Typical shape: sort by a key, then one pass making irreversible decisions. Usually **O(n log n)**.
- Prove it (exchange argument or "stays ahead"), or at least test it against a brute force on small cases.
- Counterexample habit: before committing, try to break your greedy with 2 or 3 elements. Coins {1, 3, 4} for amount 6: greedy gives 4 + 1 + 1, optimal is 3 + 3.
- When greedy fails, the fallback is usually **DP** (it considers all choices).

### deep
#### Intuition

Dynamic programming considers every choice at every step and keeps the best. Greedy commits to one choice per step without looking back, which is much faster, but only correct if you can prove the committed choice never hurts. The proof is the heart of any greedy solution.

#### The two properties

1. **Greedy choice property**: there is an optimal solution that includes the greedy choice. (Proved by exchange: take any optimal solution and swap its first choice for the greedy one without making it worse.)
2. **Optimal substructure**: after making the greedy choice, the rest of an optimal solution is an optimal solution to the remaining subproblem.

#### Worked example: where greedy works and where it fails

Coin change with coins {1, 5, 10, 25}, amount 63: greedy takes 25, 25, 10, 1, 1, 1 (6 coins), which is optimal for these "canonical" coin systems.

Coins {1, 3, 4}, amount 6:

| method | picks | coins |
|---|---|---|
| greedy (largest first) | 4, 1, 1 | 3 |
| optimal | 3, 3 | 2 |

The greedy choice (4) isn't part of any optimal solution, so the greedy choice property fails. DP over amounts solves it.

#### Code: greedy versus DP on the same problem

```cpp
int greedyCoins(vector<int> coins, int amount) {       // correct only for canonical systems
    sort(coins.rbegin(), coins.rend());
    int count = 0;
    for (int c : coins) { count += amount / c; amount %= c; }
    return amount == 0 ? count : -1;
}

int dpCoins(const vector<int>& coins, int amount) {    // always correct, O(amount * coins)
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a && dp[a - c] != INT_MAX) dp[a] = min(dp[a], dp[a - c] + 1);
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}
```

```python
from itertools import combinations

def brute_force_check(greedy, exact, trials):
    """Compare a greedy against an exhaustive answer on small inputs; return a counterexample."""
    for case in trials:
        if greedy(case) != exact(case):
            return case
    return None

def max_sum_of_k_distinct_greedy(nums, k):
    return sum(sorted(nums, reverse=True)[:k])     # greedy: take the k largest

def max_sum_of_k_exact(nums, k):
    return max(sum(c) for c in combinations(nums, k))
```

Testing a greedy against brute force on small random inputs is the fastest way to catch a wrong greedy before an interviewer does.

#### Common greedy strategies

| Strategy | Example |
|---|---|
| Earliest deadline or end first | interval scheduling |
| Best ratio first | fractional knapsack |
| Farthest reach so far | jump game |
| Largest or smallest first | assign cookies, boats |
| Combine the two smallest | Huffman coding, connect ropes |
| Pay the debt at the right moment | gas station |

#### Edge cases and bugs

- Ties in the sort key can matter; decide a secondary key deliberately.
- A greedy that is "obviously right" on the examples but wrong on a 3-element counterexample.
- Greedy for 0/1 knapsack (by value per weight) fails; it only works for the fractional version.

#### Variants

Greedy with sorting, greedy with heaps, reachability greedy, and greedy on stacks (smallest number after removals).

Connects to: exchange argument, dynamic programming, interval scheduling, coin change.

### questions
Q: What two properties must a problem have for a greedy algorithm to be optimal?
A: The greedy choice property, meaning some optimal solution includes the locally best choice, and optimal substructure, meaning the rest of the solution is an optimal solution to the remaining subproblem. Together they justify making one choice and never revisiting it.

Q: Give an example where a greedy strategy fails.
A: Coin change with coins {1, 3, 4} and amount 6: taking the largest coin first gives 4 + 1 + 1, three coins, but 3 + 3 uses two. Dynamic programming over amounts finds the optimum.

Q: How do you convince yourself or an interviewer that a greedy is correct?
A: Give an exchange argument (any optimal solution can be changed to include the greedy choice without getting worse) or a "greedy stays ahead" argument (after each step the greedy is at least as good as any other solution). In practice, also test it against brute force on small inputs.

Q: What is the usual time complexity of greedy solutions, and why?
A: Often O(n log n), because most greedy algorithms sort by some key and then make one pass. When a heap chooses the next item, it's also O(n log n).

Q: When greedy doesn't work, what do you try next?
A: Dynamic programming, which considers every choice at each step instead of committing to one. If the state space is too large, look for a different ordering or an additional constraint that makes a greedy valid.

## dsa.greedy.exchange-argument
name: "Exchange argument"
importance: must
prereqs: [dsa.greedy.greedy-fundamentals]
scope: "how to justify a greedy choice"

### simple
An exchange argument proves a greedy choice is safe by showing that any best solution can be changed to include it without getting worse. It is like proving that the earliest train is never a bad pick: if your best plan takes a later train, swapping in the earlier one still gets you everywhere on time. If the swap never hurts, the greedy choice belongs in some best solution.

### interview
- Structure: (1) let O be an optimal solution that differs from the greedy G; (2) find the first place they differ; (3) swap O's choice for G's; (4) show the result is still valid and no worse; (5) repeat until O becomes G.
- **Adjacent swap** version for orderings: if two neighbors are out of the greedy order, swapping them doesn't increase the cost, so the sorted order is optimal. Used to derive sorting keys (`a + b > b + a` for the largest number, scheduling by `t/w` ratios).
- "**Greedy stays ahead**": show by induction that after each step the greedy's partial result is at least as good as any other solution's.
- Saying the argument in two or three sentences is usually enough in an interview.
- If the swap can make things worse in some case, you have likely found a counterexample.

### deep
#### Intuition

You can't compare the greedy against all possible solutions directly. Instead, take an arbitrary optimal solution and transform it, one step at a time, into the greedy solution, never making it worse. At the end, the greedy solution is as good as the optimal one, so it is optimal.

#### Worked example 1: minimize total completion time

Jobs with durations `3, 1, 2` run one after another; minimize the sum of completion times. Greedy: shortest job first.

| order | completion times | sum |
|---|---|---|
| 3, 1, 2 | 3, 4, 6 | 13 |
| 1, 2, 3 | 1, 3, 6 | 10 |

Exchange argument: suppose in some order a longer job $a$ runs right before a shorter job $b$ ($t_a > t_b$). Swapping them leaves every other job's completion time unchanged. Before the swap, the pair contributes $(T + t_a) + (T + t_a + t_b)$; after, $(T + t_b) + (T + t_b + t_a)$, where $T$ is the start time. The difference is $t_a - t_b > 0$, so swapping improves the sum. Any order with an "inversion" can be improved, hence sorted by duration is optimal.

#### Worked example 2: deriving a comparator

To concatenate numbers into the largest string, compare two neighbors $a, b$: placing $a$ first is better exactly when $ab > ba$ as strings. Because swapping an out-of-order adjacent pair never makes the result smaller (and this comparison is transitive), sorting by it gives the optimum. The adjacent-swap argument tells you **what to sort by**.

#### Code: checking an exchange-derived rule

```cpp
// Weighted completion time: minimize sum of w_i * C_i. Exchange argument gives the rule:
// put a before b when t_a * w_b < t_b * w_a (Smith's ratio rule, compared without division).
long long minWeightedCompletion(vector<pair<long long, long long>> jobs) {  // {t, w}
    sort(jobs.begin(), jobs.end(), [](auto& a, auto& b) {
        return a.first * b.second < b.first * a.second;
    });
    long long time = 0, total = 0;
    for (auto [t, w] : jobs) { time += t; total += w * time; }
    return total;
}
```

```python
from itertools import permutations

def weighted_completion(order):
    time = total = 0
    for t, w in order:
        time += t
        total += w * time
    return total

def smith_rule(jobs):
    return weighted_completion(sorted(jobs, key=lambda j: j[0] / j[1]))

def brute_force(jobs):
    return min(weighted_completion(p) for p in permutations(jobs))
```

For small random inputs, `smith_rule(jobs) == brute_force(jobs)`, which is the empirical check of the proof.

#### Greedy stays ahead

For interval scheduling by earliest end: after the greedy picks $k$ intervals, its $k$-th end time is no later than the $k$-th end time of any valid selection (induction on $k$). So whenever another solution can pick a $(k+1)$-th interval, the greedy can too, and the greedy picks at least as many.

#### Pitfalls

- Swapping may be valid but change other parts of the solution (feasibility breaks); check that nothing else is affected.
- Ratio comparisons with division can suffer from rounding; cross-multiply.
- The argument must work for **every** optimal solution you start from, not just a convenient one.

Connects to: greedy fundamentals, interval scheduling, custom comparators, largest number.

### questions
Q: What is an exchange argument?
A: A proof technique for greedy algorithms: take any optimal solution that differs from the greedy one, and show you can swap one of its choices for the greedy choice without making it worse. Repeating this turns the optimal solution into the greedy solution, so the greedy is optimal too.

Q: How do you prove that shortest job first minimizes the total completion time?
A: If a longer job runs immediately before a shorter one, swapping them leaves all other completion times unchanged and reduces the sum by the difference of their durations. So any order that isn't sorted by duration can be improved, and the sorted order is optimal.

Q: How can an exchange argument tell you what key to sort by?
A: Compare the cost of placing a before b with placing b before a, for two adjacent items. The condition under which a first is no worse becomes your comparator, as with a + b > b + a for the largest concatenated number or t_a · w_b < t_b · w_a for weighted scheduling.

Q: What is the "greedy stays ahead" argument?
A: Show by induction that after each step, the greedy's partial solution is at least as good as any other solution's at the same step, by some measure such as the end time of the k-th chosen interval. Then the greedy can't finish behind.

## dsa.greedy.reachability-greedy
name: "Reachability greedy"
importance: must
pattern: true
prereqs: [dsa.greedy.greedy-fundamentals]
scope: "jump game I and II, gas station"

### simple
Reachability problems ask whether, or how cheaply, you can get from the start to the end when each position lets you move a certain distance. The greedy trick is to remember only the farthest point you can reach so far, like a hiker who keeps track of the farthest trail marker visible. If you ever stand beyond that point, you're stuck; if it covers the end, you're done.

### interview
- **Jump game I** (can you reach the end?): keep `far = max(far, i + a[i])`; fail if `i > far`. O(n), O(1).
- **Jump game II** (fewest jumps): BFS by levels without a queue. Track `curEnd` (end of the current jump's range) and `far`; when `i == curEnd`, take a jump and set `curEnd = far`. O(n).
- **Gas station**: if total gas < total cost, impossible. Otherwise scan with a tank; whenever it goes negative at `i`, no start in `[start, i]` works, so set `start = i + 1` and reset the tank. O(n).
- **Video stitching / minimum taps to water a garden**: same as jump game II after converting clips to "max reach from each start".
- Proof ideas: reachable positions form a prefix (jump I); the jump II levels are BFS layers (a jump count can't be beaten).

### deep
#### Intuition

In jump game I, the set of reachable indices is always a prefix `[0, far]`: if you can reach `i`, you can reach every index before it. So a single number, `far`, describes everything you need. Jump game II asks for the minimum number of jumps, which is BFS on an implicit graph; because each jump's reachable set is again an interval, BFS layers can be tracked with two numbers instead of a queue.

#### Worked example: jump game II on `2 3 1 1 4`

| i | a[i] | far = max(far, i + a[i]) | i == curEnd? | jumps | curEnd |
|---|---|---|---|---|---|
| 0 | 2 | 2 | yes | 1 | 2 |
| 1 | 3 | 4 | no | 1 | 2 |
| 2 | 1 | 4 | yes | 2 | 4 |
| 3 | 1 | 4 | stop (last index reached by curEnd) | 2 | |

Two jumps: 0 → 1 → 4.

#### Code

```cpp
bool canJump(const vector<int>& a) {
    int far = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        if (i > far) return false;                 // i is unreachable
        far = max(far, i + a[i]);
    }
    return true;
}

int minJumps(const vector<int>& a) {               // assumes the end is reachable
    int jumps = 0, curEnd = 0, far = 0;
    for (int i = 0; i + 1 < (int)a.size(); i++) {  // no jump needed from the last index
        far = max(far, i + a[i]);
        if (i == curEnd) {                         // the current layer is exhausted
            jumps++;
            curEnd = far;
        }
    }
    return jumps;
}

int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank < 0) {                            // can't get past i from `start`
            start = i + 1;
            tank = 0;
        }
    }
    return total < 0 ? -1 : start;
}
```

```python
def min_taps(n, ranges):
    """Minimum taps to water [0, n]; tap i covers [i - ranges[i], i + ranges[i]]."""
    reach = [0] * (n + 1)                       # farthest right point starting from each left
    for i, r in enumerate(ranges):
        left, right = max(0, i - r), min(n, i + r)
        reach[left] = max(reach[left], right)
    taps = cur_end = far = 0
    for i in range(n):
        far = max(far, reach[i])
        if i == cur_end:
            if far <= i:
                return -1                       # a gap nobody covers
            taps += 1
            cur_end = far
    return taps
```

#### Why the gas station reset is correct

If the tank goes negative when arriving past station $i$ starting from `start`, then starting from any station $k$ between `start` and $i$ is also hopeless: you would arrive at $k$ from `start` with a non-negative tank, so starting fresh at $k$ (tank 0) is no better. So the next candidate is $i + 1$. And if the total is non-negative, the last candidate found works for the whole circle.

#### Complexity

All three are $O(n)$ time and $O(1)$ space.

#### Edge cases and bugs

- Jump game II: looping to the last index and jumping from it adds one extra jump; stop at `n - 2`.
- A zero at a position that is the farthest you can reach: jump I fails there.
- Gas station with a single station: return 0 if gas ≥ cost.

#### Variants

- Jump game III and IV (BFS over indices with arbitrary moves).
- Video stitching, minimum number of refueling stops (a heap version), and frog jumps with DP when costs vary.

Connects to: BFS, greedy fundamentals, greedy with heaps (refueling stops).

### questions
Q: How do you decide whether you can reach the last index in jump game I?
A: Scan left to right, tracking the farthest index reachable so far, far = max(far, i + a[i]). If you ever reach an index greater than far, it's unreachable and so is the end. It's O(n) time and O(1) space.

Q: How do you find the minimum number of jumps in O(n)?
A: Treat it as BFS where each layer is an interval of indices. Track the end of the current layer and the farthest index reachable from it. When the scan reaches the end of the layer, count a jump and move the layer end to the farthest reach.

Q: How does the gas station greedy find the starting station?
A: If total gas is less than total cost, no start works. Otherwise keep a running tank from a candidate start; when it goes negative at station i, none of the stations from the start to i can work, so the next candidate is i + 1 and the tank resets.

Q: Why is only one pass needed for the gas station problem?
A: The reset argument rules out every skipped station, and when the total is non-negative, the deficit before the final candidate is covered by the surplus after it, so the final candidate completes the circle. No second lap is needed.

### signals
- can you reach the end when each position allows jumps up to some length
- the fewest jumps, taps, clips or intervals to cover a range
- a circular route with gains and costs at each stop
- the farthest reachable point matters more than the exact path

### template
```cpp
// Fewest "jumps" to cover [0, n-1] when position i reaches up to reach(i): BFS layers as intervals.
template <class Reach>
int fewestSteps(int n, Reach reach) {
    int steps = 0, layerEnd = 0, far = 0;
    for (int i = 0; i + 1 < n; i++) {
        far = max(far, reach(i));          // best reach from the current layer
        if (i == layerEnd) {               // leaving the current layer
            if (far <= i) return -1;       // stuck: nothing reaches further
            steps++;
            layerEnd = far;
        }
    }
    return steps;
}
// Jump game II: fewestSteps(n, [&](int i) { return i + a[i]; })
```

## dsa.greedy.greedy-with-sorting
name: "Greedy with sorting"
importance: important
pattern: true
prereqs: [dsa.greedy.exchange-argument]
scope: "assign cookies, boats, two city scheduling, partition labels"

### simple
Many greedy problems become obvious once the items are sorted the right way. To give cookies to children, match the smallest cookie that satisfies each child, starting with the least demanding child. The hard part is choosing the sort key, and the exchange argument tells you which key is safe.

### interview
- **Assign cookies**: sort greed and cookie sizes; two pointers; give each child the smallest cookie that satisfies them. O(n log n).
- **Boats to save people** (at most 2 per boat, weight limit): sort; pair the heaviest with the lightest if they fit, else the heaviest goes alone. Two pointers.
- **Two city scheduling**: sort by `costA − costB`; the first half fly to A, the rest to B.
- **Partition labels**: record each letter's last index; extend the current part's end to the max last index of its letters; cut when `i == end`. O(n).
- **Minimum cost to connect sticks / ropes**: always combine the two smallest (a heap).
- State the exchange argument for the key you sort by.

### deep
#### Intuition

Sorting creates structure that makes local decisions safe. Once children and cookies are both sorted, a child who can't be satisfied by the current cookie can't be satisfied by any smaller cookie, and a cookie that is too small for the current child is too small for every greedier child. Each pointer only moves forward.

#### Worked example: boats, limit 3

People `3 2 2 1` → sorted `1 2 2 3`.

| light | heavy | fit together? | boats |
|---|---|---|---|
| 1 | 3 | 1 + 3 = 4 > 3: heavy alone | 1 |
| 1 | 2 | 1 + 2 = 3: together | 2 |
| 2 | (same person) | alone | 3 |

Three boats. Pairing the heaviest with the lightest is safe: if the heaviest can't go with the lightest, it can't go with anyone.

#### Code

```cpp
int assignCookies(vector<int> greed, vector<int> sizes) {
    sort(greed.begin(), greed.end());
    sort(sizes.begin(), sizes.end());
    int child = 0;
    for (int s = 0; s < (int)sizes.size() && child < (int)greed.size(); s++)
        if (sizes[s] >= greed[child]) child++;     // smallest cookie that satisfies this child
    return child;
}

int numBoats(vector<int> people, int limit) {
    sort(people.begin(), people.end());
    int l = 0, r = (int)people.size() - 1, boats = 0;
    while (l <= r) {
        if (people[l] + people[r] <= limit) l++;   // lightest joins the heaviest
        r--;                                       // heaviest always leaves
        boats++;
    }
    return boats;
}

vector<int> partitionLabels(const string& s) {
    int last[26] = {};
    for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
    vector<int> sizes;
    int start = 0, end = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        end = max(end, last[s[i] - 'a']);          // this part must reach every copy of s[i]
        if (i == end) { sizes.push_back(end - start + 1); start = i + 1; }
    }
    return sizes;
}
```

```python
def two_city_cost(costs):
    """costs[i] = [to A, to B]; exactly half go to each city."""
    costs = sorted(costs, key=lambda c: c[0] - c[1])   # most A-favored first
    half = len(costs) // 2
    return sum(c[0] for c in costs[:half]) + sum(c[1] for c in costs[half:])
```

#### Why two city scheduling sorts by the difference

Everyone must go somewhere, so start from "everyone flies to B" and pay the extra `costA − costB` for each person moved to A. To minimize the total, move the half with the smallest (most negative) differences.

#### Complexity

Sorting: $O(n \log n)$; the passes are $O(n)$. Partition labels is $O(n)$ with a fixed alphabet.

#### Edge cases and bugs

- Boats: the loop condition `l <= r` so a single remaining person gets a boat.
- Assign cookies: iterate over cookies and advance the child only when satisfied (or the reverse), not both unconditionally.
- Partition labels: the part's end must be updated before checking `i == end`.

#### Variants

- Minimum number of platforms or rooms (sweep line), maximum units on a truck (sort by units per box), bag of tokens (two pointers after sorting), advantage shuffle (sort and match with a greedy "just beat it").

Connects to: exchange argument, two pointers, interval scheduling, sorting.

### questions
Q: How do you maximize the number of content children given cookie sizes?
A: Sort both lists. Walk the cookies from smallest to largest and give a cookie to the least greedy unsatisfied child whenever it's big enough. Using the smallest sufficient cookie keeps bigger cookies for greedier children.

Q: Why does pairing the heaviest person with the lightest work for boats?
A: The heaviest person needs a boat either way. If the lightest person can't fit with them, nobody can, so the heaviest goes alone; if the lightest fits, pairing them uses the boat as fully as any other choice could. Either way the remaining problem is smaller and optimal choices remain.

Q: How do you split a string into as many parts as possible so each letter appears in only one part?
A: Record the last index of each letter. Scan while extending the current part's end to the last index of every letter seen; when the scan reaches that end, cut the part there. It's O(n).

Q: How do you minimize the cost of sending half the people to city A and half to city B?
A: Sort people by cost to A minus cost to B. Send the first half, who save the most by going to A, to A, and the rest to B. This is optimal by an exchange argument on the differences.

### signals
- match items to requests (sizes to needs, people to boats) with the fewest leftovers
- split people or tasks between two options with costs
- partition a sequence so each kind of item stays in one part
- "maximize the number satisfied" after sorting both sides

### template
```cpp
// Sort both sides, then match greedily with two pointers.
int greedyMatch(vector<int> need, vector<int> have) {
    sort(need.begin(), need.end());
    sort(have.begin(), have.end());
    int i = 0, matched = 0;                     // i: smallest unmet need
    for (int h : have) {
        if (i < (int)need.size() && h >= need[i]) {  // h is the smallest resource that works
            matched++;
            i++;
        }                                       // otherwise h is too small for everyone left
    }
    return matched;
}
```

## dsa.greedy.greedy-with-heaps
name: "Greedy with heaps"
importance: important
pattern: true
scope: "reorganize string, IPO, refueling stops"

### simple
Some greedy choices depend on what is currently available, and that changes as you go. A heap keeps the best available option on top, so each greedy step is quick, like a chef always cooking the order with the most waiting customers among those ready to start. As new options become available, they join the heap.

### interview
- **Reorganize string** (no two equal neighbors): max-heap by count; repeatedly take the most frequent letter different from the last one placed. Impossible iff the top count > `(n + 1) / 2`. O(n log σ).
- **IPO** (maximize capital with k projects): sort projects by required capital; push affordable ones into a max-heap by profit; take the best k times.
- **Minimum refueling stops**: drive past stations, pushing their fuel into a max-heap; when you'd run out, refuel from the largest fuel passed (retroactively). O(n log n).
- **Connect ropes / sticks**: min-heap, always join the two smallest (Huffman-like).
- **Course schedule III**: sort by deadline; keep a max-heap of durations; if over the deadline, drop the longest course taken.
- Pattern: sort by when an option becomes available, and use a heap for "the best available now".

### deep
#### Intuition

A static sort can't express choices whose candidates change over time: in the refueling problem, which stations you may use depends on how far you've driven. A heap gives the best candidate among those currently allowed, and "retroactive" decisions (pretending you stopped at the best station you passed) are safe because the order of refueling doesn't change how far you can go.

#### Worked example: minimum refueling stops

Target 100, start fuel 10, stations (position, fuel): `(10, 60) (20, 30) (30, 30) (60, 40)`.

| step | reach | passed stations pushed | refuel (pop max) | stops |
|---|---|---|---|---|
| start | 10 | (10, 60) | reach < 100: +60 → 70 | 1 |
| | 70 | (20, 30), (30, 30), (60, 40) | reach < 100: +40 → 110 | 2 |
| | 110 ≥ 100 | | done | 2 |

#### Code

```cpp
int minRefuelStops(int target, int fuel, const vector<vector<int>>& stations) {
    priority_queue<int> passed;                   // fuel amounts of stations we drove past
    long long reach = fuel;
    int stops = 0, i = 0, n = stations.size();
    while (reach < target) {
        while (i < n && stations[i][0] <= reach) passed.push(stations[i++][1]);
        if (passed.empty()) return -1;            // can't reach the next station or target
        reach += passed.top();                    // refuel at the best station behind us
        passed.pop();
        stops++;
    }
    return stops;
}

string reorganizeString(const string& s) {
    int count[26] = {};
    for (char c : s) count[c - 'a']++;
    priority_queue<pair<int, char>> heap;
    for (int c = 0; c < 26; c++) if (count[c]) heap.push({count[c], char('a' + c)});
    string out;
    while (heap.size() >= 2) {                    // place the two most frequent, different letters
        auto [c1, a] = heap.top(); heap.pop();
        auto [c2, b] = heap.top(); heap.pop();
        out += a;
        out += b;
        if (--c1) heap.push({c1, a});
        if (--c2) heap.push({c2, b});
    }
    if (!heap.empty()) {
        if (heap.top().first > 1) return "";      // one letter left more than once: impossible
        out += heap.top().second;
    }
    return out;
}
```

```python
import heapq

def schedule_courses(courses):
    """courses: [duration, deadline]; maximum number of courses you can finish."""
    taken, time = [], 0                       # max-heap of durations (negated)
    for duration, deadline in sorted(courses, key=lambda c: c[1]):
        heapq.heappush(taken, -duration)
        time += duration
        if time > deadline:
            time += heapq.heappop(taken)      # drop the longest course so far
    return len(taken)

def connect_ropes(lengths):
    heap = list(lengths)
    heapq.heapify(heap)
    cost = 0
    while len(heap) > 1:
        a, b = heapq.heappop(heap), heapq.heappop(heap)
        cost += a + b
        heapq.heappush(heap, a + b)
    return cost
```

#### Complexity

Each item is pushed and popped at most once or twice: $O(n \log n)$ time, $O(n)$ space. Reorganize string is $O(n \log 26)$.

#### Edge cases and bugs

- Refueling: stations exactly at the current reach are reachable (`<=`).
- Reorganize string: the impossibility condition is `maxCount > (n + 1) / 2`.
- Course schedule III: sort by deadline first; the heap only corrects the choice of which courses to keep.

#### Variants

- Task scheduler (cooldowns), maximum performance of a team (sort by efficiency, min-heap of speeds), furthest building you can reach (use ladders on the largest climbs with a min-heap).

Connects to: binary heap, scheduling with heaps, greedy fundamentals, Huffman coding.

### questions
Q: How do you rearrange a string so no two adjacent letters are equal?
A: Count the letters and use a max-heap by count. Repeatedly take the two most frequent letters, append both, and push them back with decremented counts. It's impossible exactly when the most frequent letter appears more than (n + 1)/2 times.

Q: How does the minimum refueling stops greedy work?
A: Drive as far as the current fuel allows, pushing the fuel of every station passed into a max-heap. When you can't reach the target, pretend you stopped at the passed station with the most fuel. Each such stop adds the most distance possible, so the number of stops is minimal.

Q: How do you maximize capital after at most k projects, each with a minimum capital and a profit?
A: Sort projects by required capital. Each round, push every newly affordable project's profit into a max-heap, then take the most profitable one and add its profit to your capital. Repeat k times or until nothing is affordable.

Q: Why is it fine to decide which stations to refuel at only after passing them?
A: The total distance you can cover depends only on the set of stations you refueled at, not on when you decided. Choosing retroactively the largest fuel among reachable stations is therefore equivalent to having stopped there.

### signals
- repeatedly pick the best option among those currently available
- options unlock over time (capital, distance, deadlines)
- rearrange items so that equal items aren't adjacent
- combine or drop items to optimize a running total (ropes, courses)

### template
```cpp
// Unlock options in sorted order; take the best available each round.
long long greedyUnlock(vector<pair<long long, long long>> items, long long budget, int rounds) {
    sort(items.begin(), items.end());               // {requirement, gain}, by requirement
    priority_queue<long long> available;            // gains of unlocked items
    size_t i = 0;
    while (rounds-- > 0) {
        while (i < items.size() && items[i].first <= budget) available.push(items[i++].second);
        if (available.empty()) break;               // nothing unlocked: stop
        budget += available.top();                  // take the best one now
        available.pop();
    }
    return budget;
}
```

## dsa.greedy.classic-greedy-algorithms
name: "Classic greedy algorithms"
importance: important
prereqs: [dsa.greedy.exchange-argument]
scope: "activity selection, fractional knapsack, Huffman coding"

### simple
A few greedy algorithms are textbook classics worth knowing by name. Activity selection picks the most non-clashing activities by earliest finish, fractional knapsack fills a bag with the most valuable-per-kilo items first, and Huffman coding builds short codes for common letters by repeatedly joining the two rarest ones. Each works because of a clean exchange argument.

### interview
- **Activity selection**: sort by finish time, take each compatible activity. O(n log n). (Same as interval scheduling.)
- **Fractional knapsack**: sort by value/weight descending, take whole items while they fit, then a fraction of the next. O(n log n). **0/1 knapsack is not greedy** (needs DP).
- **Huffman coding**: min-heap of frequencies; repeatedly merge the two smallest into a node with their sum; codes come from the tree paths. O(n log n). Produces an optimal **prefix-free** code.
- Also classic: Dijkstra, Prim and Kruskal (greedy on graphs), and coin change for canonical coin systems.
- Know one line of proof for each: earliest finish leaves the most room; best ratio can replace any worse ratio unit for unit; the two rarest symbols can be siblings at the deepest level.

### questions
Q: Why does greedy work for fractional knapsack but not for 0/1 knapsack?
A: In the fractional version, any weight spent on a lower value-per-weight item can be swapped for the same weight of a higher-ratio item without loss, so best ratio first is optimal. In 0/1 knapsack items can't be split, so a high-ratio item may leave capacity that a combination of other items would use better; DP is needed.

Q: How does Huffman coding build its code?
A: Put every symbol in a min-heap keyed by frequency. Repeatedly remove the two least frequent nodes, join them under a new node whose frequency is their sum, and push it back. When one node remains, the path from the root to each symbol (0 for left, 1 for right) is its code.

Q: What is a prefix-free code and why does Huffman produce one?
A: A code where no codeword is the beginning of another, so a bit string decodes without separators. Huffman codes are prefix-free because symbols are only at the leaves of the tree, and a leaf's path can't continue into another leaf's path.

Q: What does activity selection optimize, and what is the greedy rule?
A: It maximizes the number of mutually compatible activities in one resource. The rule is to sort by finishing time and pick every activity that starts after the last chosen one finishes.

## dsa.greedy.hard-greedy-problems
name: "Hard greedy problems"
importance: advanced
prereqs: [dsa.greedy.greedy-with-sorting]
scope: "candy with two passes, patching array"

### simple
Some greedy problems need a clever twist, such as scanning twice or tracking exactly what range of sums you can already make. In the candy problem, each child must get more than a neighbor with a higher rating, so you fix left neighbors in one pass and right neighbors in a second pass. The skill is finding the invariant that makes each small step safe.

### interview
- **Candy**: left pass `c[i] = c[i-1] + 1` if `r[i] > r[i-1]`; right pass `c[i] = max(c[i], c[i+1] + 1)` if `r[i] > r[i+1]`; sum. O(n) time, O(n) space (an O(1) slope-counting version exists).
- **Patching array**: maintain `miss`, the smallest sum not yet formable (all of `[1, miss)` are formable). If the next number ≤ `miss`, use it (`miss += num`); else patch with `miss` itself (`miss *= 2`). O(n + log target).
- **Minimum number of increments to make an array strictly increasing / unique**: sort and push each value above the previous.
- **Queue reconstruction by height**: sort by height descending, then by k ascending, and insert each person at index k.
- The common thread: find an invariant (a covered range, a lower bound per position) that each step can maintain cheaply.

### questions
Q: How do you distribute the minimum number of candies so higher-rated children get more than their neighbors?
A: Give everyone 1. In a left-to-right pass, if a child's rating beats the left neighbor's, give them one more than that neighbor. In a right-to-left pass, if a child's rating beats the right neighbor's, raise them to at least one more than that neighbor. The sum is minimal because each count is the smallest that satisfies both sides.

Q: How does the patching array greedy work?
A: Keep miss, the smallest sum you can't yet form, knowing every sum in [1, miss) can be formed. If the next array number is at most miss, adding it extends the range to [1, miss + num). Otherwise, patching the number miss itself is the best choice, doubling the range. Count patches until miss exceeds the target.

Q: Why is patching with miss the optimal choice?
A: Any patch must be at most miss, or miss itself still can't be formed. Among those, the largest value, miss, extends the formable range the most, to [1, 2 · miss), so it's never worse than any other patch.

Q: How do you reconstruct a queue from (height, number of taller-or-equal people in front) pairs?
A: Sort by height descending and, for equal heights, by that count ascending. Insert each person at the index equal to their count. Taller people are already placed, and shorter ones inserted later don't affect the counts of taller people.
