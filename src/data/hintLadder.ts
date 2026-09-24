// Offline hint ladder text (F11 without AI), written for this app. For each topic that has
// practice problems: a broad area (named at level 1 without giving away the technique), a guiding
// question (level 1) and a generic step outline (level 3 when the pattern's own template isn't
// written yet). Level 2 names the pattern itself, from the syllabus. Subject entries are fallbacks.

export interface TopicHints {
  area: string;
  nudge: string;
  outline: string[];
}

const DP_OUTLINE = [
  "Write the brute-force recursion: what choice do you make at each step?",
  "Name the state: the few values that describe a subproblem (an index, a remaining amount, …).",
  "Write the transition: the answer for a state from the answers of smaller states.",
  "Set the base cases, the states you can answer directly.",
  "Memoise the recursion, or fill a table in an order where smaller states come first.",
  "Read the answer from the state that describes the whole input; shrink the table if only the last row or two are needed.",
];

const GRAPH_OUTLINE = [
  "Decide what the nodes and edges are, and build an adjacency list.",
  "Keep a visited set so each node is processed once.",
  "Start from the source (or from every unvisited node, to count components).",
  "For fewest steps, use a queue and process level by level; to explore fully, a stack or recursion is enough.",
  "When you take a node out, look at each neighbour, skip visited ones, mark and add the rest.",
  "Record what the problem asks for (distance, parent, component id) as you go.",
];

const SQL_OUTLINE = [
  "Name the tables you need and how they link (the join keys).",
  "Write the FROM and JOIN clauses, choosing LEFT JOIN when rows without a match must stay.",
  "Filter rows with WHERE before any grouping.",
  "Group with GROUP BY if the output has one row per group; filter groups with HAVING.",
  "Use a window function (OVER (PARTITION BY … ORDER BY …)) when every row must stay but you need a rank or running value.",
  "Select and name the output columns, then ORDER BY if asked. Check ties, duplicates and NULLs.",
];

const QUANT_OUTLINE = [
  "Define exactly what you're computing: the random variable, the event, or the quantity.",
  "Solve two or three tiny cases by hand to see the shape of the answer.",
  "Condition on the first step or the first outcome, and write an equation.",
  "Use symmetry or linearity of expectation to avoid long case work.",
  "Solve, then sanity-check against the small cases and against extremes (0, 1, very large).",
];

export const TOPIC_HINTS: Record<string, TopicHints> = {
  "dsa.arrays": {
    area: "Arrays",
    nudge:
      "What would you need to remember about the elements you've already passed to decide about the current one? Could a single pass keep just that?",
    outline: [
      "Decide what summary of the prefix you need (best so far, current run, a count).",
      "Initialise it for the first element.",
      "Walk the array once, updating the summary from the current element.",
      "Update the answer at each step, not only at the end.",
      "Check empty input, one element, all negative values and duplicates.",
    ],
  },
  "dsa.prefix-sums": {
    area: "Arrays and subarrays",
    nudge:
      "Could you answer “what is the total between positions i and j” in constant time if you precomputed something once?",
    outline: [
      "Build prefix[0] = 0 and prefix[i + 1] = prefix[i] + a[i].",
      "The sum of a[i..j] is prefix[j + 1] − prefix[i].",
      "To count subarrays with a target sum, walk once and keep a map from prefix value to how often it appeared.",
      "At each step, add the count of (current prefix − target) seen so far, then record the current prefix.",
      "Seed the map with prefix 0 seen once, so subarrays starting at index 0 count.",
    ],
  },
  "dsa.hashing": {
    area: "Lookups",
    nudge:
      "What are you searching for again and again? Could you remember everything you've seen so each of those searches is instant?",
    outline: [
      "Decide what the key is (a value, a complement, a sorted word, a count signature).",
      "Walk the input once.",
      "Before storing the current item, check whether the key you need is already in the map or set.",
      "Store the current item with whatever you need later (its index, its count).",
      "Return as soon as the condition is met, or read the answer from the map at the end.",
    ],
  },
  "dsa.two-pointers": {
    area: "Arrays and strings",
    nudge:
      "If the input is sorted, or you sort it first, can you start at both ends and discard one candidate with every step?",
    outline: [
      "Sort the input if order isn't given and the problem allows it.",
      "Place one pointer at the start and one at the end (or both at the start, moving at different speeds).",
      "Look at the pair: if it's too small, move the left pointer right; if too large, move the right pointer left.",
      "Record the answer when the pair fits.",
      "Skip duplicates if the problem asks for unique results.",
      "Stop when the pointers meet.",
    ],
  },
  "dsa.sliding-window": {
    area: "Arrays and strings",
    nudge:
      "Is the answer a contiguous stretch? Could you grow a stretch on the right and shrink it on the left while keeping a running summary of what's inside?",
    outline: [
      "Keep two indices, left and right, and a summary of the current window (a sum, counts in a map).",
      "Move right one step at a time and add the new element to the summary.",
      "While the window breaks the rule, remove the element at left from the summary and move left forward.",
      "After the window is valid again, update the answer (its length, or the count of windows).",
      "For a fixed-size window, remove the element that falls out as each new one comes in.",
    ],
  },
  "dsa.binary-search": {
    area: "Searching",
    nudge:
      "Is there a yes-or-no question about a value that flips exactly once as the value grows? If you test the middle, can you throw away half?",
    outline: [
      "Pick the search range: indices of the array, or the range of possible answers.",
      "Write a check(mid) that says which side the answer is on.",
      "While low < high: mid = low + (high − low) / 2.",
      "If check(mid) holds, keep mid in range (high = mid); otherwise move past it (low = mid + 1).",
      "When the loop ends, low is the first value where the check holds. Test the edges and an empty range.",
    ],
  },
  "dsa.sorting": {
    area: "Ordering",
    nudge:
      "Would the problem become easier if the items were in order? What can you assume about neighbours once they are?",
    outline: [
      "Decide the order that makes the rest simple (by value, by end time, by a custom rule).",
      "Write the comparator carefully; it must be consistent.",
      "Sort, then make one pass comparing each item with its neighbour or with a running result.",
      "If counting is enough, consider counting sort or buckets instead of a comparison sort.",
    ],
  },
  "dsa.strings": {
    area: "Strings",
    nudge:
      "What does each character contribute? Would counting characters, or comparing from both ends inward, give you the answer?",
    outline: [
      "Decide what you need per character: a count, a last position, or a comparison with its mirror.",
      "Build that with one pass (an array of 26 counts is often enough).",
      "Make a second pass, or move inward from both ends, to check the condition.",
      "Watch for case, spaces and non-letter characters.",
    ],
  },
  "dsa.string-algorithms": {
    area: "Strings",
    nudge:
      "Are you comparing a pattern against every position? What work repeats between neighbouring positions that you could reuse?",
    outline: [
      "Precompute something about the pattern (a failure table, a rolling hash, or a Z-array).",
      "Scan the text once, reusing that information instead of restarting after a mismatch.",
      "For rolling hashes, update the hash in O(1) as the window moves, and confirm matches to avoid collisions.",
      "Collect the positions or counts the problem asks for.",
    ],
  },
  "dsa.recursion": {
    area: "Recursion",
    nudge:
      "Can you describe the answer for the whole input using the answer for a smaller piece of it? What is the smallest case you can answer directly?",
    outline: [
      "Write the base case first.",
      "Assume the function already works for smaller inputs.",
      "Combine the smaller answers into the answer for the current input.",
      "Make sure every call moves toward the base case.",
    ],
  },
  "dsa.backtracking": {
    area: "Exploring every choice",
    nudge:
      "Do you need every valid arrangement or selection? If you build one choice at a time, what can you choose next, and when should you stop and undo?",
    outline: [
      "Keep the partial answer in a list and a function explore(position).",
      "If the partial answer is complete, record a copy and return.",
      "For each choice available at this position: skip it if it breaks a rule (prune).",
      "Make the choice, call explore for the next position, then undo the choice.",
      "To avoid duplicate results, sort first and skip equal choices at the same depth.",
    ],
  },
  "dsa.linked-lists": {
    area: "Linked lists",
    nudge:
      "Could two pointers moving at different speeds, or a dummy node in front of the head, remove the awkward special cases?",
    outline: [
      "Put a dummy node before the head so removing or inserting at the front needs no special case.",
      "For middles and cycles, move one pointer one step and another two steps.",
      "For reversing, keep prev, current and next, and rewire one link at a time.",
      "Draw the pointers for a list of 1, 2 and 3 nodes before coding.",
      "Return dummy.next.",
    ],
  },
  "dsa.stacks-queues": {
    area: "Processing items in order",
    nudge:
      "Does the most recent unfinished item need to be handled first, or the oldest one? What would you keep open while scanning?",
    outline: [
      "Scan the input once.",
      "Push items that are still open (an opening bracket, an operand, a pending task).",
      "When an item closes something, pop and check it matches, then combine.",
      "Use a queue instead when items must be handled in arrival order.",
      "At the end, check that nothing unexpected is left.",
    ],
  },
  "dsa.monotonic": {
    area: "Arrays and sequences",
    nudge:
      "For each element, do you need the nearest element to its left or right that is bigger or smaller? Which earlier elements can never be the answer again?",
    outline: [
      "Keep a stack of indices whose values stay in increasing (or decreasing) order.",
      "For each new element, pop while it beats the value on top.",
      "Each popped index has just found its answer: the current element.",
      "Push the current index.",
      "Indices left on the stack at the end have no answer. For window maxima, use a deque and drop indices that leave the window.",
    ],
  },
  "dsa.heaps": {
    area: "Ordering and priority",
    nudge:
      "Do you repeatedly need the smallest or largest item from a set that keeps changing? Do you need everything sorted, or only the top few?",
    outline: [
      "Decide what the heap orders by, and whether you need a min-heap or a max-heap.",
      "For the k largest, keep a min-heap of size k and pop when it grows past k.",
      "For merging sorted lists, push each list's head and pop the smallest repeatedly.",
      "For a running median, keep two heaps balanced in size.",
      "The answer is at the top of the heap, or in the order of pops.",
    ],
  },
  "dsa.intervals": {
    area: "Intervals",
    nudge:
      "If you sort the intervals by their start, what's true about each interval compared with the one just before it?",
    outline: [
      "Sort by start (or by end, when choosing the most non-overlapping intervals).",
      "Keep the current merged interval.",
      "If the next one starts before the current one ends, they overlap: extend the end.",
      "Otherwise close the current one and start a new one.",
      "For rooms needed at once, sort starts and ends separately, or keep a min-heap of end times.",
    ],
  },
  "dsa.greedy": {
    area: "Optimisation",
    nudge:
      "Is there a choice that always looks best right now and can never hurt later? Can you argue why swapping it for another choice can't do better?",
    outline: [
      "Find the rule for the locally best choice (earliest end, largest value, farthest reach).",
      "Sort by that rule if needed.",
      "Walk through the items, taking the best choice and updating what's still possible.",
      "Convince yourself with an exchange argument, and test a small counterexample.",
    ],
  },
  "dsa.trees": {
    area: "Trees",
    nudge:
      "What does each node need from its children, and what does it pass back up? Or do you need to visit the tree level by level?",
    outline: [
      "Handle the empty tree as the base case.",
      "Decide what the function returns for a subtree (height, sum, whether it's valid).",
      "Call it on the left and right children.",
      "Combine the two answers with the current node, updating a global best if the answer can bend through the node.",
      "For level-by-level questions, use a queue and process one level's size at a time.",
    ],
  },
  "dsa.bst": {
    area: "Trees",
    nudge:
      "Everything smaller sits on the left and everything bigger on the right. How does that let you skip whole subtrees, or visit values in sorted order?",
    outline: [
      "To search or insert, go left or right by comparing with the node's value.",
      "For sorted order, do an in-order traversal (left, node, right).",
      "To validate, pass down the allowed range (low, high) for each node.",
      "For the k-th smallest, count nodes during the in-order walk.",
    ],
  },
  "dsa.tries": {
    area: "Strings and prefixes",
    nudge:
      "Do many words share their beginnings? Could you store characters along a path so a shared prefix is stored only once?",
    outline: [
      "Each node holds child links (26 letters or a map) and an end-of-word flag.",
      "Insert: walk the characters, creating missing children, and mark the last node.",
      "Search a word or prefix by walking the same path.",
      "For word searches on a grid, walk the trie and the grid together, pruning when no child matches.",
    ],
  },
  "dsa.graph-basics": {
    area: "Graphs",
    nudge:
      "What are the nodes and what are the edges? Once you see the graph, do you need to reach everything, count separate pieces, or find the fewest steps?",
    outline: GRAPH_OUTLINE,
  },
  "dsa.shortest-paths": {
    area: "Graphs and distances",
    nudge:
      "The edges have costs. Which node's distance can you be sure of next, and how does settling it improve its neighbours?",
    outline: [
      "Set every distance to infinity, and the source to 0.",
      "Put (0, source) in a min-heap.",
      "Pop the closest node; skip it if the popped distance is out of date.",
      "For each edge from it, if dist[u] + w < dist[v], update dist[v] and push it.",
      "With negative edges, use Bellman-Ford instead; with 0/1 weights, a deque is enough.",
    ],
  },
  "dsa.mst-dsu": {
    area: "Graphs and connectivity",
    nudge:
      "Do you keep asking whether two things are already connected, or keep joining groups together? Could you track the groups cheaply as they merge?",
    outline: [
      "Give each item a parent pointing to itself.",
      "find(x): follow parents to the root, compressing the path on the way.",
      "union(a, b): join the roots, attaching the smaller tree under the larger.",
      "For a minimum spanning tree, sort edges by weight and add each one whose ends are in different groups.",
      "Count groups, or detect a cycle when both ends already share a root.",
    ],
  },
  "dsa.advanced-graphs": {
    area: "Graphs",
    nudge:
      "Is there an order hidden in the dependencies, or a cycle that breaks it? Think about what must come before what.",
    outline: [
      "Build the directed graph and count incoming edges for each node.",
      "Start a queue with every node that has no incoming edges.",
      "Pop a node, add it to the order, and lower its neighbours' counts; enqueue any that reach zero.",
      "If the order doesn't contain every node, there is a cycle.",
    ],
  },
  "dsa.dp-foundations": {
    area: "Optimisation and counting",
    nudge:
      "Does a brute-force recursion solve the same smaller question many times? What is the smallest set of numbers that describes one of those questions?",
    outline: DP_OUTLINE,
  },
  "dsa.dp-1d": {
    area: "Optimisation and counting",
    nudge:
      "Does the answer at position i depend only on the answers at a few earlier positions? What choice do you make at each position?",
    outline: DP_OUTLINE,
  },
  "dsa.dp-grid": {
    area: "Grids",
    nudge:
      "To reach a cell, where could you have come from? Can each cell's answer be built from the cells above it and to its left?",
    outline: DP_OUTLINE,
  },
  "dsa.dp-knapsack": {
    area: "Optimisation and counting",
    nudge:
      "For each item you either take it or skip it. What do you need to remember about the capacity or target used so far?",
    outline: [
      ...DP_OUTLINE.slice(0, 4),
      "In a one-row table, loop capacity downward when each item can be used once, and upward when items can repeat.",
      DP_OUTLINE[5]!,
    ],
  },
  "dsa.dp-subsequences": {
    area: "Optimisation and counting",
    nudge:
      "For each position, what is the best answer that ends exactly there? For trading problems: which state are you in each day, holding or not?",
    outline: DP_OUTLINE,
  },
  "dsa.dp-strings": {
    area: "Strings",
    nudge:
      "Compare prefixes of the strings. If you know the answer for shorter prefixes, what does the next pair of characters change?",
    outline: [
      "Let dp[i][j] describe the first i characters of one string and the first j of the other.",
      "Base cases: an empty prefix on either side.",
      "If the characters match, build from dp[i − 1][j − 1]; otherwise take the best of the allowed moves (insert, delete, replace, skip).",
      "Fill row by row; the answer is dp[m][n]. Keep two rows to save memory.",
    ],
  },
  "dsa.dp-intervals": {
    area: "Optimisation over ranges",
    nudge:
      "Could the answer for a range be built by choosing where to split it, or which element to handle last?",
    outline: [
      "Let dp[l][r] be the answer for the range from l to r.",
      "Base case: ranges of length 0 or 1.",
      "For each split point k in the range, combine dp[l][k] and dp[k][r] with the cost of that choice.",
      "Fill by increasing range length so the smaller ranges are ready.",
      "For games, store the best score difference the player to move can guarantee.",
    ],
  },
  "dsa.dp-advanced": {
    area: "Optimisation and counting",
    nudge:
      "What is the smallest state that captures everything that matters: a bitmask of used items, a digit position, a subtree?",
    outline: DP_OUTLINE,
  },
  "dsa.bits": {
    area: "Bits and numbers",
    nudge:
      "What happens at each bit position on its own? Think about XOR cancelling equal pairs, and masks for testing or setting bits.",
    outline: [
      "Write a few small cases in binary.",
      "Use x & (x − 1) to drop the lowest set bit, x & −x to isolate it, and XOR to cancel pairs.",
      "Loop over the 32 (or 64) bit positions if each position can be handled independently.",
      "Watch signed shifts and overflow in your language.",
    ],
  },
  "dsa.math": {
    area: "Math",
    nudge:
      "Is there a formula, an invariant or a number property (divisibility, remainders, parity) that replaces the brute-force loop?",
    outline: [
      "Work out small cases by hand and look for a pattern.",
      "Name the property you use (divisibility, gcd, modular arithmetic, digit sums).",
      "Compute it directly or with a fast loop (for example fast power by squaring).",
      "Check overflow, zero, negative numbers and the largest inputs.",
    ],
  },
  "dsa.range-queries": {
    area: "Range queries",
    nudge:
      "There are many queries over ranges, maybe with updates in between. Could partial answers stored for blocks or halves make each query fast?",
    outline: [
      "With no updates, precompute prefix sums or a sparse table.",
      "With point updates and range sums, use a Fenwick tree: update and query walk the index bits.",
      "For other combine operations or range updates, use a segment tree (with lazy propagation for range updates).",
      "Keep indices consistent (0-based or 1-based) between build, update and query.",
    ],
  },
  "dsa.design-ds": {
    area: "Data structure design",
    nudge:
      "List the operations and the time each must take. Which two structures combined make every operation fast, for example a map plus a list?",
    outline: [
      "Write each operation with its required complexity.",
      "Pick a structure for fast lookup (a hash map) and one for order (a linked list, heap or stack).",
      "Keep them in sync: every insert and delete updates both.",
      "Walk through each operation on a tiny example, including capacity and empty cases.",
    ],
  },
  "conc.patterns": {
    area: "Concurrency",
    nudge:
      "Which shared state can two threads touch at the same time, and in what order must things happen? What should a thread wait on?",
    outline: [
      "List the shared state and the ordering rules between threads.",
      "Pick the tool: a mutex for exclusive access, a condition variable or semaphore to wait for a turn.",
      "Each thread waits in a loop until its condition holds, does its step, then signals the others.",
      "Check for deadlock (two locks taken in different orders) and missed wake-ups.",
    ],
  },
  "conc.locks": {
    area: "Concurrency",
    nudge:
      "What must never happen at the same time, and who should wake whom? Could counting permits express the rule?",
    outline: [
      "Name the invariant that must always hold.",
      "Guard the shared state with one lock, or use semaphores that count available turns.",
      "Wait in a loop on a condition, never with a single if.",
      "Signal after changing the state, and release locks in every path.",
    ],
  },
  "os.sync": {
    area: "Concurrency",
    nudge:
      "Which steps must not interleave between threads? What does each thread need to wait for?",
    outline: [
      "Identify the critical section.",
      "Protect it with a lock or semaphore.",
      "Use a condition to wait for the right state, and signal after changing it.",
    ],
  },
  "sql.basics": {
    area: "SQL",
    nudge:
      "Which rows do you need, and which columns? Write the filter first, then shape the output.",
    outline: SQL_OUTLINE,
  },
  "sql.aggregation": {
    area: "SQL",
    nudge:
      "Do you need one output row per group? Which column defines the group, and do you filter before grouping or after?",
    outline: SQL_OUTLINE,
  },
  "sql.joins": {
    area: "SQL",
    nudge:
      "Which tables hold the pieces, and which column links them? Should rows without a match disappear or stay with empty values?",
    outline: SQL_OUTLINE,
  },
  "sql.subqueries": {
    area: "SQL",
    nudge:
      "Could you first compute a helper result (a set of ids, a maximum per group), then use it to filter or compare?",
    outline: SQL_OUTLINE,
  },
  "sql.window": {
    area: "SQL",
    nudge:
      "Do you need a rank, a running total or the previous row's value while keeping every row? Think per group, in a given order.",
    outline: SQL_OUTLINE,
  },
  "sql.ddl-dml": {
    area: "SQL",
    nudge:
      "You're changing data rather than reading it. Which rows are affected, and which condition picks exactly those?",
    outline: SQL_OUTLINE,
  },
  "sql.classics": {
    area: "SQL",
    nudge:
      "Break it into steps: a helper query for the intermediate result, then the final filter or ranking. How do ties and missing values behave?",
    outline: SQL_OUTLINE,
  },
  "prob.expected-value": {
    area: "Probability",
    nudge:
      "Could you write the expected value in terms of itself after one step? Or split the quantity into a sum of simple yes-or-no indicators?",
    outline: QUANT_OUTLINE,
  },
  "prob.markov": {
    area: "Probability",
    nudge:
      "What are the states, and where can you go from each one? Write one equation per state and solve them together.",
    outline: QUANT_OUTLINE,
  },
  prob: {
    area: "Probability",
    nudge:
      "What is the sample space, and are its outcomes equally likely? Would conditioning on the first step, or a symmetry, make it simpler?",
    outline: QUANT_OUTLINE,
  },
  math: {
    area: "Math",
    nudge:
      "Try small cases first. What stays the same as things change, and could you count the same thing in two ways?",
    outline: QUANT_OUTLINE,
  },
  puzzles: {
    area: "Puzzles",
    nudge:
      "Solve the smallest version of the puzzle. What works for 1, 2 or 3 items, and does it extend?",
    outline: QUANT_OUTLINE,
  },
  markets: {
    area: "Markets",
    nudge:
      "What is your edge, and what is the worst case? Think in expected value and in what happens to your bankroll.",
    outline: QUANT_OUTLINE,
  },
};

export const GENERIC_HINTS: TopicHints = {
  area: "Problem solving",
  nudge:
    "Restate the problem in one sentence. What would the brute force do, and which part of it repeats work you could avoid?",
  outline: [
    "Restate the input, the output and the constraints.",
    "Work a small example by hand.",
    "Write the brute force and its complexity.",
    "Find the repeated work, and pick a structure or technique that removes it.",
    "Code it, then trace the small example and the edge cases.",
  ],
};

/** Hints for a topic: the topic's own, else its subject's, else the generic ones. */
export function hintsForTopic(topicId: string | undefined): TopicHints {
  if (!topicId) return GENERIC_HINTS;
  return TOPIC_HINTS[topicId] ?? TOPIC_HINTS[topicId.split(".")[0] ?? ""] ?? GENERIC_HINTS;
}
