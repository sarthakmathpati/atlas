---
topic: dsa.problem-solving
name: "Problem-solving method"
subject: dsa
order: 38
prereqs: []
---

## dsa.problem-solving.reading-the-problem
name: "Reading the problem"
importance: must
scope: "inputs, outputs, constraints, clarifying questions"

### simple
Before solving anything, make sure you understand exactly what goes in, what must come out, and what limits apply. It is like reading a recipe completely before cooking, so you don't discover halfway through that you needed an oven. A couple of well-chosen questions at the start prevent solving the wrong problem.

### interview
- Restate the problem in your own words, with a tiny example, and confirm it with the interviewer.
- Pin down **inputs** (types, ranges, sorted or not, duplicates, negatives, empty allowed?) and **outputs** (return value or print, any valid answer or a specific one, indices or values, order).
- Ask about **constraints**: n, value ranges, time and memory limits. They decide the target complexity.
- Clarify ambiguous cases: ties, what "distinct" means, 0- or 1-indexed, can the input be modified?
- Write down the examples, and invent one small tricky example of your own.
- Two or three focused questions are enough; don't stall.

### deep
#### Intuition

Most failed interview answers aren't wrong algorithms; they're right algorithms for a slightly different problem. Reading carefully and asking targeted questions costs a minute and removes whole categories of mistakes: off-by-one boundaries, overflow, missed duplicates, wrong output format.

#### A checklist to run through

| Area | Questions to settle |
|---|---|
| Input shape | array, string, graph, tree? size range? can it be empty? |
| Values | negatives? zeros? duplicates? range (overflow)? sorted? |
| Output | exact format; any valid answer or a canonical one; indices or values |
| Constraints | n up to what? how many queries? time limit? |
| Behavior | ties, invalid input, modifying the input allowed? |
| Scale | will it be called once or many times (preprocessing worth it)? |

#### Worked example

Prompt: "Given a list of numbers, return two that add up to a target."

Questions that change the solution:

1. Is the list sorted? (Sorted allows two pointers with O(1) space.)
2. Return the values or their indices? (Sorting loses indices.)
3. Is there always exactly one answer? What if none exists?
4. Can the same element be used twice? Duplicates?
5. How large can the list and the values be? (Overflow of `a + b`.)

With "unsorted, return indices, exactly one answer, no reuse, n up to 10⁵", the answer is the O(n) hash-map complement lookup.

#### Turning the reading into code

```cpp
// Encode the clarified contract at the top of the function: preconditions and edge cases.
vector<int> twoSumIndices(const vector<int>& nums, long long target) {
    // Contract (confirmed with the interviewer): unsorted input, return indices,
    // at most one valid pair, an element can't be used twice, empty result if none.
    unordered_map<long long, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}
```

#### Pitfalls

- Starting to code after reading the first sentence.
- Assuming the input is sorted, distinct or non-empty without asking.
- Asking ten generic questions instead of the two that matter for this problem.
- Missing the output format (for example, lists sorted in a specific order, or "return −1 if impossible").

Connects to: constraints to complexity, from brute force to optimal, edge case checklist, communicating in interviews.

### questions
Q: What should you clarify before designing a solution?
A: The input's shape and ranges (sizes, negatives, duplicates, empty, sorted), the exact output (values or indices, any valid answer or a specific one, format), the constraints (n and value ranges, time and memory), and behavior in ambiguous cases such as ties or invalid input.

Q: Why ask about the input size?
A: It decides the target complexity: n ≤ 20 allows exponential search, n ≤ 5,000 allows O(n²), and n around 10^5 needs O(n log n) or better. Without it you may over- or under-engineer the solution.

Q: How do you confirm you understood the problem?
A: Restate it in your own words, walk through one of the given examples, and try a small example of your own, including an edge case, checking the expected output with the interviewer.

Q: How many clarifying questions should you ask?
A: A few targeted ones, usually two to four, that could change the approach or the edge-case handling. Asking many generic questions wastes time and suggests you aren't prioritizing.

Q: Why write down the agreed contract before coding?
A: It keeps you and the interviewer aligned on assumptions, reminds you which edge cases to handle, and gives you a checklist for testing at the end.

## dsa.problem-solving.from-brute-force-to-optimal
name: "From brute force to optimal"
importance: must
prereqs: [dsa.problem-solving.reading-the-problem]
scope: "state the brute force, find the bottleneck, apply a pattern"

### simple
A reliable way to find a good solution is to start with the simplest correct one, even if it's slow, and then improve it. You look for the slowest part, the bottleneck, and ask which technique removes it, like noticing that you keep searching the same list and deciding to index it once. Each step keeps the solution correct while making it faster.

### interview
- **Say the brute force first** with its complexity. It proves you understand the problem and gives a baseline.
- **Find the bottleneck**: which loop or repeated work dominates? Is something recomputed? Searched repeatedly? Sorted repeatedly?
- **Apply a tool**: repeated lookups → hash map; sorted data or pairs → two pointers or binary search; contiguous ranges → sliding window or prefix sums; repeated subproblems → memoization / DP; "best so far" → heap or monotonic stack.
- **Best conceivable runtime**: you must at least read the input (O(n)); if the optimal answer is near that bound, aim for it.
- **Trade space for time** when allowed (precompute, index, cache).
- Keep each step correct; verify on the example after each change.

### deep
#### Intuition

Optimizing is easier than inventing. The brute force enumerates everything; an optimal solution avoids work that can't matter or that repeats. By naming exactly which work is repeated or wasted, you usually land on a known pattern.

#### Worked example: longest substring without repeating characters

1. **Brute force**: check every substring for duplicates: $O(n^2)$ substrings, $O(n)$ each to check: $O(n^3)$.
2. **Bottleneck**: re-checking each substring from scratch. Extending a substring by one character only needs to check that character: build substrings from each start with a set, $O(n^2)$.
3. **Still repeated**: after a duplicate at position j, every start before the duplicate's earlier position will also fail at j. So don't restart; move the start past the duplicate: sliding window, $O(n)$.

| step | idea | time |
|---|---|---|
| 1 | check every substring | $O(n^3)$ |
| 2 | extend with a set from each start | $O(n^2)$ |
| 3 | sliding window with last-seen positions | $O(n)$ |

#### Code: the three stages

```cpp
int longestUniqueBrute(const string& s) {              // O(n^2) with incremental checks
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        bool seen[256] = {};
        for (int j = i; j < (int)s.size(); j++) {
            if (seen[(unsigned char)s[j]]) break;
            seen[(unsigned char)s[j]] = true;
            best = max(best, j - i + 1);
        }
    }
    return best;
}

int longestUniqueOptimal(const string& s) {             // O(n): the start only moves forward
    vector<int> last(256, -1);
    int best = 0, start = 0;
    for (int j = 0; j < (int)s.size(); j++) {
        start = max(start, last[(unsigned char)s[j]] + 1);   // jump past the previous copy
        last[(unsigned char)s[j]] = j;
        best = max(best, j - start + 1);
    }
    return best;
}
```

#### Useful questions when stuck

- What would I precompute if I could?
- Is there monotonicity (a condition that flips once) to binary search on?
- If the array were sorted, what would be easy? Is sorting allowed?
- Can I process from the end instead of the start?
- What does the answer for i tell me about the answer for i + 1?

#### A second run of the same steps
Count the pairs of positions whose values differ by exactly `k` (with `k > 0`). The brute force checks every pair, $O(n^2)$. Now name the repeated work: for each value `x`, the inner loop scans the whole array to ask "how many elements equal `x + k`?". That is a counting question, and a hash map of counts answers it in $O(1)$, so one pass gives $O(n)$ time and $O(n)$ space. If memory is tight, sorting and walking two pointers gives $O(n \log n)$ time with $O(1)$ extra space. Naming the repeated question usually names the tool:

- "Is there an element equal to …?" or "how many equal …?": a hash set or hash map.
- "How many are at most …?": sort, then binary search or two pointers.
- "What is the best among the last few?": a monotonic deque or a heap.
- "What was the answer for a smaller input?": dynamic programming.

#### Pitfalls

- Skipping the brute force and freezing when the optimal idea doesn't come.
- Optimizing the wrong part (a loop that isn't the bottleneck).
- Breaking correctness while optimizing; retest the example after each step.

Connects to: pattern recognition, constraints to complexity, dry running and testing.

### questions
Q: Why should you state a brute-force solution first?
A: It shows you understand the problem, gives a correct baseline to compare against, and often reveals the bottleneck to optimize. It also guarantees you have something to fall back on if time runs out.

Q: How do you find the bottleneck in a brute-force solution?
A: Look at which part does the most work and whether that work is repeated: nested loops that re-search the same data, subproblems recomputed many times, sums recomputed over overlapping ranges. The repeated work is what a better technique should eliminate.

Q: What is the "best conceivable runtime"?
A: A lower bound on any solution, usually the time to read the input or to produce the output. If your current solution is O(n log n) and the bound is O(n), there may be room to improve; if you're already at the bound, you're done optimizing time.

Q: Give examples of mapping a bottleneck to a technique.
A: Repeated lookups in unsorted data suggest a hash map; repeated range sums suggest prefix sums or a sliding window; recomputed subproblems suggest memoization; repeatedly finding the minimum suggests a heap; pairs in sorted data suggest two pointers.

Q: How do you keep the solution correct while optimizing?
A: Change one thing at a time and re-run the small examples after each change, ideally comparing against the brute force on random small inputs when writing code outside the interview.

## dsa.problem-solving.pattern-recognition
name: "Pattern recognition"
importance: must
prereqs: [dsa.problem-solving.from-brute-force-to-optimal]
scope: "mapping problem signals to techniques"

### simple
Most interview problems are variations of a few dozen patterns, and certain words in the question hint at which one applies. "Contiguous subarray" suggests a sliding window or prefix sums, "shortest path" suggests BFS or Dijkstra, and "number of ways" suggests dynamic programming. Learning these signals lets you narrow down the approach quickly, like a doctor recognizing symptoms.

### interview
- Read for **structure**: sorted? contiguous? pairs? intervals? grid? dependencies? tree? stream?
- Read for **question type**: count ways / min / max (DP, greedy), exists (DFS/BFS, DP), kth or top k (heap, quickselect), shortest (BFS, Dijkstra), all combinations (backtracking).
- Check **constraints** to confirm (n ≤ 20: bitmask or backtracking; n ≤ 10⁵: O(n log n)).
- Keep a **signal table** (below) and practice mapping each solved problem to its pattern.
- When two patterns fit, compare complexities and simplicity; mention the alternative.
- Beware false signals: "subarray with sum K" with negatives is prefix sums + hash map, not a sliding window.

### deep
#### Intuition

Patterns are reusable solution shapes. Each has recognizable fingerprints in the problem statement, the input structure and the constraints. Mapping signals to candidate patterns turns a blank page into a short list of approaches to test.

#### A signal table

| Signal in the problem | Candidate techniques |
|---|---|
| sorted array, find a pair or position | two pointers, binary search |
| contiguous subarray or substring with a condition | sliding window (non-negative), prefix sums + hash map |
| "k-th", "top k", running median | heap, quickselect, two heaps |
| next greater or smaller, spans | monotonic stack |
| intervals, meetings, overlaps | sort + sweep, merge intervals, heap of end times |
| dependencies, ordering | topological sort |
| connectivity, groups | DFS/BFS, union-find |
| shortest path, unweighted | BFS (multi-source if many starts) |
| shortest path, weighted | Dijkstra (non-negative), Bellman-Ford (negative) |
| all subsets, permutations, combinations | backtracking, bitmasks |
| count ways, min or max cost with choices | dynamic programming |
| minimize the maximum or maximize the minimum | binary search on the answer |
| prefix lookups, many words | trie |
| appears twice except one, bit-level | XOR, bit manipulation |
| range queries with updates | Fenwick tree, segment tree |

#### Worked example

"Given daily temperatures, for each day find how many days until a warmer day."

- Structure: array, "until a warmer day" = next greater element.
- Pattern: monotonic stack, $O(n)$.
- Brute force for comparison: scan ahead from each day, $O(n^2)$; with $n = 10^5$, too slow.

"Given course prerequisites, can you finish all courses?"

- Structure: dependencies, possible cycles.
- Pattern: topological sort (Kahn) or three-color DFS; $O(V + E)$.

#### Code: a tiny self-quiz helper

```cpp
// Map a few keywords to candidate patterns (a study aid, not an oracle).
vector<string> candidatePatterns(const string& statement) {
    vector<pair<string, string>> rules = {
        {"subarray", "sliding window / prefix sums"},
        {"k-th", "heap / quickselect"},
        {"next greater", "monotonic stack"},
        {"prerequisite", "topological sort"},
        {"shortest", "BFS / Dijkstra"},
        {"number of ways", "dynamic programming"},
        {"all combinations", "backtracking"},
    };
    vector<string> out;
    for (auto& [key, pattern] : rules)
        if (statement.find(key) != string::npos) out.push_back(pattern);
    return out;
}
```

#### Pitfalls

- Pattern-matching on one keyword and ignoring constraints that rule the pattern out.
- Forcing a favorite pattern; if the complexity doesn't fit, look again.
- Not verifying the pattern's precondition (sliding window needs monotonicity; greedy needs a proof).

Connects to: from brute force to optimal, constraints to complexity, every pattern concept on the map (their signals sections).

### questions
Q: How do you recognize which technique a problem needs?
A: Look at the input's structure (sorted, contiguous ranges, graphs, intervals, trees), the kind of answer requested (count, optimum, existence, kth element, shortest path), and the constraints, then match these signals to known patterns and confirm the complexity fits.

Q: What does "contiguous subarray" usually suggest, and what is a common trap?
A: A sliding window or prefix sums. The trap is using a sliding window when values can be negative: then the window's validity isn't monotone, and prefix sums with a hash map are needed instead.

Q: Which signals suggest dynamic programming?
A: Questions asking for the number of ways, the minimum or maximum cost, or whether something is achievable, where each step makes a choice and the same subproblems repeat. Constraints that allow O(n²) or O(n · target) support it.

Q: How do constraints help confirm a pattern?
A: They bound the feasible complexity. With n ≤ 20, exponential enumeration or bitmask DP is fine; with n ≤ 10^5, you need O(n log n) or O(n), which rules out quadratic DP and brute force.

Q: What should you do when two patterns seem to fit?
A: Compare their complexities and preconditions for this input, pick the simpler one that fits the constraints, and mention the alternative to the interviewer, since showing you considered options is valuable.

## dsa.problem-solving.dry-running-and-testing
name: "Dry running and testing"
importance: must
scope: "tracing small cases by hand, testing edge cases"

### simple
Dry running means walking through your code by hand with a small input, writing down how each variable changes, like following a recipe step by step on paper before cooking. It catches mistakes before the code ever runs. Testing then checks the normal case plus the awkward ones: empty input, a single item, duplicates and extremes.

### interview
- After coding, trace a **small, representative** input line by line, tracking variables in a table. Speak while you trace.
- Then test **edge cases**: empty, single element, all equal, sorted and reverse sorted, negatives, maximum values (overflow), no valid answer.
- Check **loop boundaries** (first and last iterations) and **off-by-one** indices explicitly.
- When you find a bug, fix it calmly, then re-run the trace that exposed it.
- Outside interviews: write a **brute force** and compare on random small inputs (stress testing).
- Mention what you would unit test if this were production code.

### deep
#### Intuition

Code is usually right in the middle and wrong at the edges. A trace forces you to execute the boundary iterations, where off-by-one errors, uninitialized variables and wrong conditions live. Interviewers watch this step closely because it shows you can find your own bugs.

#### Worked example: tracing a binary search

Code under test (looking for 7 in `1 3 5 7`):

```
lo = 0, hi = 3
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < target: lo = mid + 1
    else: hi = mid
return lo if a[lo] == target else -1
```

| iteration | lo | hi | mid | a[mid] | action |
|---|---|---|---|---|---|
| 1 | 0 | 3 | 1 | 3 | 3 < 7: lo = 2 |
| 2 | 2 | 3 | 2 | 5 | 5 < 7: lo = 3 |
| end | 3 | 3 | | | a[3] = 7: return 3 |

Now the edge case: empty array. `hi = -1`, the loop doesn't run, and `a[lo]` reads `a[0]`: a crash. The trace found a bug: add `if not a: return -1`.

#### Code: a stress test harness

```cpp
// Compare a fast solution with a brute force on random small inputs.
int fastMaxSubarray(const vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) { cur = max(a[i], cur + a[i]); best = max(best, cur); }
    return best;
}

int bruteMaxSubarray(const vector<int>& a) {
    int best = INT_MIN;
    for (int i = 0; i < (int)a.size(); i++) {
        int s = 0;
        for (int j = i; j < (int)a.size(); j++) best = max(best, s += a[j]);
    }
    return best;
}

bool stressTest(int rounds) {
    mt19937 rng(7);
    for (int r = 0; r < rounds; r++) {
        int n = 1 + rng() % 8;
        vector<int> a(n);
        for (int& x : a) x = (int)(rng() % 21) - 10;       // small values, both signs
        if (fastMaxSubarray(a) != bruteMaxSubarray(a)) return false;   // print a here to debug
    }
    return true;
}
```

#### What to trace

1. The given example (confirms the main logic).
2. The smallest non-trivial input (one or two elements).
3. One edge case from the checklist that your code handles specially.

Keep traces short: three to six steps is usually enough to expose boundary bugs.

#### Choosing test inputs
Pick inputs for what they can break, not at random. Start with the given example, then the smallest valid input (one element, an empty string if allowed), all values equal, already sorted and reverse sorted, the answer at the first or last position, and the case with no answer at all. Each of these exercises a different boundary: loop bounds, tie handling, and what you return when nothing matches.

#### When the stress test finds a mismatch
Shrink the failing input before you read it. Lower the maximum length and the value range in the generator until the smallest failing case is only a few elements long, then trace that case by hand. A five-element counterexample usually points straight at the wrong comparison or the wrong loop bound, while a fifty-element one hides it.

#### Pitfalls

- "Tracing" by reading the code and assuming it works, instead of tracking actual values.
- Choosing a large example that takes too long to trace.
- Testing only inputs where the answer exists.

Connects to: edge case checklist, debugging under pressure, communicating in interviews.

### questions
Q: What is a dry run, and why do interviewers value it?
A: Executing your code by hand on a small input, tracking every variable's value step by step. It catches bugs before running the code and shows the interviewer that you verify your own work instead of relying on them to find errors.

Q: How do you choose inputs for a dry run?
A: Use the given example to confirm the main logic, then the smallest non-trivial input to exercise the boundaries, then one or two edge cases such as an empty input or all equal values. Keep them small enough to trace in a minute.

Q: What is stress testing?
A: Writing a simple, obviously correct brute-force solution and comparing it with the optimized solution on many random small inputs. The first input where they disagree is a failing test case you can trace by hand.

Q: Which parts of a loop deserve the closest attention when tracing?
A: The first and last iterations, where off-by-one errors live, and the loop condition itself: whether it runs once too many or too few times, especially with < versus <= and index ranges like n − 1.

Q: What should you do after finding a bug during a dry run?
A: Fix it deliberately, explain the fix, and re-run the trace that exposed it, plus any related case. Avoid patching blindly, which often introduces a new bug.

## dsa.problem-solving.edge-case-checklist
name: "Edge case checklist"
importance: must
scope: "empty, single element, duplicates, negatives, overflow, sorted, reversed, all equal"

### simple
Edge cases are the unusual inputs where code tends to break: nothing at all, just one item, all items equal, or numbers so big they overflow. A short checklist you run through every time, like a pilot's preflight checklist, catches most of these before the interviewer does. Handling them explicitly also shows care and experience.

### interview
- **Size**: empty, one element, two elements, maximum size (performance).
- **Values**: zero, negatives, duplicates, all equal, extreme values (`INT_MIN`, `INT_MAX`, 10⁹ sums overflowing 32 bits).
- **Order**: already sorted, reverse sorted, alternating.
- **Answer**: no valid answer, multiple valid answers, answer at the first or last position.
- **Strings**: empty string, single character, all same character, case and non-letters, Unicode if relevant.
- **Graphs and trees**: empty tree, single node, skewed tree (deep recursion), disconnected graph, self-loops, cycles.

### deep
#### Intuition

Algorithms are designed around typical inputs; edge cases sit at the boundaries of loops, data structures and number ranges, where assumptions like "there is a previous element" or "the sum fits in an int" break. A fixed checklist turns remembering them into a habit.

#### The checklist in action: "maximum sum of any subarray"

| edge case | what can go wrong | fix |
|---|---|---|
| empty array | reading `a[0]` | clarify: return 0 or error |
| one element | loop starting at 1 never runs | initialize with `a[0]` |
| all negative | initializing best to 0 returns 0 | initialize best with `a[0]` |
| large values (10⁵ × 10⁹) | 32-bit overflow | use 64-bit sums |
| all equal | none (sanity check) | |

#### Worked example: overflow in averages and midpoints

```cpp
int midpointBad(int lo, int hi) { return (lo + hi) / 2; }           // overflows near INT_MAX
int midpointGood(int lo, int hi) { return lo + (hi - lo) / 2; }     // safe for lo <= hi

long long sumSafe(const vector<int>& a) {
    long long s = 0;                        // 1e5 values of 1e9 need 64 bits
    for (int x : a) s += x;
    return s;
}

int absSafe(int x) {                        // abs(INT_MIN) overflows; decide what to return
    return x == INT_MIN ? INT_MAX : abs(x);
}
```

The same inputs also expose logic errors unrelated to overflow, such as an empty result or a flipped sign.

#### Where each category bites

- **Empty and single**: loops with `i + 1`, `a[0]` reads, `n - 1` on unsigned sizes in C++ (`size() - 1` wraps to a huge number when empty).
- **Duplicates**: two pointers skipping, binary search returning any match, sets dropping repeats.
- **Negatives**: sliding windows, modulo results, `abs` of the minimum int.
- **Sorted inputs**: quicksort without randomization becomes $O(n^2)$; unbalanced BSTs become chains.
- **Deep inputs**: recursion depth on skewed trees and long lists.

#### Turning the checklist into tests
Edge cases are only useful if they reach the code. After you list them, write each one as a concrete input with its expected output before you run anything, for example `[]` gives `0`, `[5]` gives `5`, `[-3, -1]` gives `-1`. Saying the expected answers out loud also shows the interviewer that you know what correct looks like, and it catches misreadings: if you can't say what an empty input should return, ask. When time is short, pick the two cases most likely to break your specific code (for a sliding window, a window that never becomes valid; for binary search, a target smaller than every element) rather than the whole list.

#### Pitfalls

- Handling edge cases with special-case code everywhere instead of choosing boundaries (dummy nodes, sentinels, `n + 1` sized arrays) that make the general code work.
- Forgetting to mention edge cases you decided to ignore (say so explicitly).

Connects to: dry running and testing, reading the problem, constraints to complexity.

### questions
Q: What edge cases should you check for an array problem?
A: Empty and single-element arrays, two elements, all elements equal, duplicates, negatives and zeros, very large values that can overflow, already sorted and reverse sorted input, and the case where no valid answer exists.

Q: Why is size() − 1 dangerous in C++?
A: size() returns an unsigned type, so when the container is empty, size() − 1 wraps around to a huge number instead of −1. Loops like for (i = 0; i < v.size() − 1; i++) then read far out of bounds. Cast to int first or restructure the loop.

Q: How can a sorted input become an edge case for performance?
A: Some algorithms have worst cases on sorted data: quicksort with a first or last element pivot degrades to O(n²), and a plain BST built from sorted keys becomes a linked list with O(n) operations.

Q: How do you avoid special-casing many edge cases?
A: Choose representations whose boundaries handle them naturally: dummy heads in linked lists, prefix arrays with an extra leading zero, sentinel values at the ends of arrays, and initial values taken from the first element rather than 0.

Q: What overflow risks are common in interview problems?
A: Summing many large values in 32-bit integers, computing (lo + hi) / 2, multiplying two values near 10^9, and taking abs() or negating INT_MIN. Use 64-bit types and safe formulas.

## dsa.problem-solving.communicating-in-interviews
name: "Communicating in interviews"
importance: must
scope: "thinking aloud, stating complexity, trade-offs, confirming before coding"

### simple
In a coding interview, how you explain your thinking matters almost as much as the final code. Talk through your ideas as you go, like a guide narrating a hike, so the interviewer can follow and help if you drift. Agree on the approach before writing code, and finish by stating how fast it runs and how you tested it.

### interview
- Structure: **clarify → examples → brute force → optimize → agree → code → test → complexity**.
- **Think aloud**: say what you're considering and why you're rejecting options; silence hides good reasoning.
- **Confirm before coding**: "I'll use a hash map for O(n) time and O(n) space; does that sound good?"
- **State complexity** (time and space, with the variables' meanings) and trade-offs (for example, sorting in place versus copying).
- Treat **hints** as collaboration: acknowledge, incorporate, and continue.
- Write readable code: meaningful names, small helpers, consistent style; explain non-obvious lines briefly.

### deep
#### Intuition

The interviewer is evaluating problem solving, communication and code quality, not just whether the final program is right. Narrating lets them give credit for sound reasoning, notice misunderstandings early, and steer you with a hint instead of watching you head the wrong way for twenty minutes.

#### A 45-minute shape

| minutes | phase | what to say |
|---|---|---|
| 0 to 5 | clarify | restate, ask 2 to 4 questions, work an example |
| 5 to 12 | approach | brute force with complexity, then the optimization and why |
| 12 to 15 | agree | "Here's the plan: …; shall I code it?" |
| 15 to 32 | code | narrate the structure; name helper functions |
| 32 to 40 | test | dry run the example and one or two edge cases |
| 40 to 45 | wrap up | complexity, trade-offs, possible extensions |

#### Worked example: phrases that help

- Clarifying: "Can the array contain negative numbers? That changes whether a sliding window works."
- Brute force: "A straightforward way is to check every pair, O(n²). With n up to 10⁵ that's too slow, so let's find the repeated work."
- Optimization: "For each element I only need to know whether its complement was seen, so a hash set gets this to O(n)."
- Agreement: "I'll go with the hash map: O(n) time and O(n) space. Any concerns before I code?"
- Testing: "Let me trace the example… now an empty input… and duplicates."
- Complexity: "Time is O(n log n) for sorting plus O(n) for the scan; space is O(1) extra if sorting in place is allowed."

#### Code that communicates

```cpp
// Readable structure: a named helper and clear variable names make narration easy.
bool isValidWindow(const array<int, 26>& need, const array<int, 26>& have) {
    for (int c = 0; c < 26; c++)
        if (have[c] < need[c]) return false;
    return true;
}

int shortestWindowContaining(const string& s, const string& t) {
    if (t.empty()) return 0;                          // the empty window already contains it
    array<int, 26> need{}, have{};
    for (char c : t) need[c - 'a']++;
    int best = INT_MAX, left = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        have[s[right] - 'a']++;
        while (isValidWindow(need, have)) {           // O(26) check, fine for lowercase input
            best = min(best, right - left + 1);
            have[s[left++] - 'a']--;
        }
    }
    return best == INT_MAX ? -1 : best;
}
```

#### Pitfalls

- Coding in silence, then presenting a finished (possibly wrong) solution.
- Arguing with hints instead of using them.
- Stating complexity without saying what n is (length of the string? number of edges?).
- Over-talking: narrate decisions, not every keystroke.

Connects to: reading the problem, from brute force to optimal, dry running and testing, time management.

### questions
Q: Why should you think aloud during a coding interview?
A: The interviewer evaluates your reasoning, not just the final code. Explaining what you're considering lets them credit good ideas, spot misunderstandings early, and give useful hints; silence gives them nothing to evaluate until the end.

Q: What should you do before writing code?
A: Summarize the approach, its time and space complexity, and any assumptions, then ask the interviewer whether they're happy for you to code it. Agreement prevents spending the interview implementing something they wanted done differently.

Q: How should you respond to a hint?
A: Acknowledge it, think about how it changes your approach, and say how you'll use it. Hints are part of the collaboration being evaluated; taking them well is a positive signal.

Q: How should you present complexity?
A: Give both time and space in Big-O, say what the variables mean (for example n is the number of nodes and m the number of edges), and mention the dominant step, such as sorting. Note trade-offs, like using extra memory to avoid a second pass.

Q: What makes code easy to follow in an interview?
A: Meaningful variable names, small helper functions for sub-steps, consistent structure, and a brief comment or remark for any non-obvious line. It helps the interviewer read along and helps you debug.

## dsa.problem-solving.time-management-in-interviews-and-oas
name: "Time management in interviews and OAs"
importance: important
scope: "when to move on, partial credit"

### simple
Interviews and online assessments are timed, so managing the clock is part of the skill. Getting a working, slower solution first is usually worth more than an unfinished perfect one, like handing in a complete essay instead of a brilliant half. In online tests, solve the easy problems quickly and don't sink all your time into one stubborn question.

### interview
- **Live interviews**: aim to have a working solution by about two thirds of the time; leave time to test and discuss.
- If the optimal idea isn't coming after about 5 to 10 minutes, **code the brute force** (with the interviewer's agreement) and optimize afterwards.
- **Online assessments** (OAs): skim all problems first; do them easiest first; budget time per problem.
- Hidden test cases often give **partial credit**: a correct brute force passing small tests beats no submission.
- Watch for time-limit traps: use fast I/O in C++ (`ios::sync_with_stdio(false)`), avoid O(n²) on 10⁵.
- Keep a short personal template (fast I/O, common helpers) ready if the platform allows it.

### questions
Q: What should you do if you can't find the optimal solution in a live interview?
A: Say so, explain the brute force and its complexity, and ask whether to code it first. A correct simpler solution, followed by discussion of how to improve it, usually scores better than an unfinished optimal attempt.

Q: How should you allocate time in an online assessment with several problems?
A: Read every problem briefly, solve the easiest ones first to secure points, and set a time budget per problem. If you're stuck past the budget, submit what you have (even a brute force for partial credit) and move on.

Q: Why can a brute force still earn points in an OA?
A: Many assessments score each hidden test case separately, and small cases pass even with slow algorithms. A correct brute force can earn a meaningful share of the points while an unfinished optimal solution earns none.

Q: How do you avoid losing time to slow input and output in C++?
A: Turn off synchronization with C streams (ios::sync_with_stdio(false); cin.tie(nullptr)) and prefer '\n' over endl, which flushes. For very large inputs these changes can make the difference between passing and timing out.

## dsa.problem-solving.debugging-under-pressure
name: "Debugging under pressure"
importance: important
prereqs: [dsa.problem-solving.dry-running-and-testing]
scope: "isolating the failing case, print debugging"

### simple
When code fails in an interview, the goal is to find the bug calmly and systematically rather than by guessing. Shrink the problem to the smallest input that still fails, then check what the code does step by step against what you expect, like a mechanic listening to one part of an engine at a time. The first point where expectation and reality differ is where the bug is.

### interview
- **Reproduce and shrink**: find the smallest input that fails (remove elements until it passes, then step back).
- **Form a hypothesis** from the symptom (wrong by one, crash on empty, wrong only with duplicates) and test it.
- **Print debugging** where available: print state at key points (loop start, after updates); compare with a hand trace.
- Check the usual suspects: off-by-one bounds, uninitialized or reused variables, integer overflow, wrong comparison (`<` vs `<=`), mutation of shared state, missing reset between test cases.
- Change **one thing at a time** and re-run; revert experiments that didn't help.
- Narrate: "The output is one too large; I suspect the loop includes the last index twice."

### questions
Q: What is the first step when a solution fails a test?
A: Reproduce the failure and shrink it to the smallest input that still fails. A tiny failing case can be traced by hand, and the difference between expected and actual behavior usually points straight at the bug.

Q: What are the most common bugs to check first?
A: Off-by-one errors in loop bounds and indices, wrong comparison operators, integer overflow, variables not initialized or not reset between test cases, and shared state being modified by recursion or aliasing.

Q: How do you use print debugging effectively?
A: Print the key variables at a few chosen points, such as the start of each loop iteration or after each update, for the small failing input. Compare the printed values with a hand trace to find the first step where they diverge.

Q: Why change only one thing at a time when debugging?
A: If you change several things and the result changes, you won't know which change mattered, and you may introduce new bugs. One change per run keeps cause and effect clear, and failed experiments can be reverted cleanly.
