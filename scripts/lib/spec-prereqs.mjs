// The concept-level prerequisite chains from BUILD_SPEC.md section 7.2, written out as explicit
// edges ("learn `from` before `to`"). Section 7.2 uses a compact arrow notation whose semicolons
// are ambiguous to parse automatically, so the edges are listed by hand here, one per line, in the
// order they appear in the spec. tests/syllabus-spec.test.ts checks that every edge is present in
// the generated syllabus. References use the "topic id › Concept name" form from section 7.

/** A chain a → b → c inside one topic (names without a "topic ›" prefix inherit the previous topic). */
function chain(...refs) {
  const full = [];
  let topic = null;
  for (const ref of refs) {
    if (ref.includes("›")) {
      full.push(ref);
      topic = ref.split("›")[0].trim();
    } else {
      full.push(`${topic} › ${ref}`);
    }
  }
  const edges = [];
  for (let i = 0; i + 1 < full.length; i++) edges.push([full[i], full[i + 1]]);
  return edges;
}

/** One source, many targets (a → b; c; d). */
function fan(from, ...targets) {
  const topic = from.split("›")[0].trim();
  return targets.map((t) => [from, t.includes("›") ? t : `${topic} › ${t}`]);
}

/** Concept edges spelled out explicitly. */
export const SPEC_PREREQ_EDGES = [
  ...fan(
    "dsa.recursion › Recursion fundamentals",
    "dsa.backtracking › Subsets",
    "dsa.trees › DFS traversals",
    "dsa.dp-foundations › What DP is",
  ),
  ["dsa.recursion › Memoization intro", "dsa.dp-foundations › Memoization vs tabulation"],
  ["dsa.hashing › Frequency counting", "dsa.sliding-window › Window with counts"],
  ["dsa.hashing › Complement lookup", "dsa.prefix-sums › Prefix sum with hash map"],
  ...chain(
    "dsa.prefix-sums › 1D prefix sums",
    "dsa.prefix-sums › Prefix sum with hash map",
    "dsa.prefix-sums › 2D prefix sums",
  ),
  ...chain(
    "dsa.binary-search › Classic binary search",
    "Lower and upper bound",
    "Binary search on the answer",
  ),
  ["dsa.two-pointers › Opposite-ends pointers", "dsa.two-pointers › kSum"],
  ...chain(
    "dsa.stacks-queues › Stack basics",
    "dsa.monotonic › Monotonic stack",
    "dsa.monotonic › Largest rectangle in histogram",
  ),
  ...fan(
    "dsa.stacks-queues › Queue and deque basics",
    "dsa.graph-basics › BFS",
    "dsa.monotonic › Monotonic deque",
  ),
  ...fan(
    "dsa.heaps › Binary heap",
    "Top K elements",
    "K-way merge",
    "Two heaps",
    "dsa.shortest-paths › Dijkstra's algorithm",
    "dsa.mst-dsu › Prim's algorithm",
  ),
  ...chain("dsa.graph-basics › DFS", "Cycle detection in directed graphs", "Topological sort"),
  ...fan(
    "dsa.graph-basics › BFS",
    "Multi-source BFS",
    "BFS on state spaces",
    "Topological sort",
    "dsa.shortest-paths › 0-1 BFS",
  ),
  ...fan("dsa.mst-dsu › Disjoint set union", "Kruskal's algorithm", "DSU applications"),
  ...chain(
    "dsa.linked-lists › Linked list basics",
    "Linked list reversal",
    "Fast and slow pointers on lists",
  ),
  ["dsa.linked-lists › Doubly linked list with hash map", "dsa.design-ds › LRU cache"],
  ["dsa.trees › DFS traversals", "dsa.bst › Inorder tricks"],
  ["dsa.trees › Bottom-up tree recursion", "dsa.dp-advanced › DP on trees"],
  ...chain(
    "dsa.dp-knapsack › 0/1 knapsack",
    "Subset sum and partition",
    "Unbounded knapsack",
    "Combinations vs permutations counting",
  ),
  ...chain("dsa.dp-strings › Longest common subsequence", "Edit distance", "Palindromic DP"),
  ...chain("dsa.bits › Bitwise operators", "Bitmask enumeration", "dsa.dp-advanced › Bitmask DP"),
  ...chain(
    "os.processes › Process vs program",
    "os.threads › Threads vs processes",
    "os.sync › Race conditions and critical sections",
    "Mutex locks",
    "Semaphores",
    "Producer-consumer problem",
  ),
  ["os.sync › Race conditions and critical sections", "os.deadlocks › Deadlock conditions"],
  ...chain(
    "os.memory › Paging",
    "TLB",
    "Virtual memory and demand paging",
    "Page replacement",
    "Thrashing and working sets",
  ),
  ...chain("cn.fundamentals › OSI model", "TCP/IP model", "Encapsulation"),
  ...chain("cn.network › IPv4 addressing", "Subnetting and CIDR", "NAT"),
  ...chain(
    "cn.transport › TCP vs UDP",
    "TCP three-way handshake and four-way teardown",
    "TCP reliability",
    "TCP flow control",
    "TCP congestion control",
  ),
  ...[
    "cn.application › DNS",
    "cn.application › HTTP basics",
    "cn.application › HTTPS and TLS",
    "cn.transport › TCP three-way handshake and four-way teardown",
  ].map((from) => [from, "cn.application › What happens when you type a URL"]),
  ...chain(
    "dbms.transactions › ACID properties",
    "Schedules and serializability",
    "dbms.concurrency › Lock-based protocols",
    "Isolation levels",
    "MVCC",
  ),
  ...chain(
    "dbms.indexing › Why indexes",
    "Clustered vs non-clustered indexes",
    "B-trees and B+ trees",
    "Composite and covering indexes",
  ),
  ...chain(
    "prob.foundations › Conditional probability",
    "Law of total probability",
    "Bayes' theorem",
  ),
  ...chain(
    "prob.random-variables › Expectation",
    "Linearity of expectation",
    "Indicator variables",
  ),
  ...chain("prob.expected-value › Conditional expectation", "First-step analysis"),
  ...fan(
    "prob.expected-value › First-step analysis",
    "Waiting time problems",
    "Coupon collector problem",
  ),
];

/** Rules that expand to many edges once the syllabus is known. */
export const SPEC_PREREQ_RULES = [
  {
    from: "dsa.dp-foundations › Designing DP states",
    toPatternsInTopics: [
      "dsa.dp-1d",
      "dsa.dp-grid",
      "dsa.dp-knapsack",
      "dsa.dp-subsequences",
      "dsa.dp-strings",
      "dsa.dp-intervals",
      "dsa.dp-advanced",
    ],
  },
  { from: "sysd.method › The interview framework", toAllInTopic: "sysd.classics" },
  { from: "lld.method › Clarifying requirements", toAllInTopic: "lld.classics" },
];
