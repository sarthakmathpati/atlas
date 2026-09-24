# Connections

Cross-subject and "see also" links between concepts (BUILD_SPEC.md section 7.1).
Each row links two concepts, written as `topic id › Concept name` with the exact concept name.
`scripts/build-syllabus.mjs` resolves both ends to concept ids, stores the link on both concepts,
and fails the build if a name does not resolve. The reason text is shown in the app, so keep it
short, specific and plain.

| From | To | Why they connect |
|---|---|---|
| dsa.bst › Self-balancing BSTs overview | dbms.indexing › B-trees and B+ trees | Both keep keys sorted in balanced trees; B+ trees are the disk-friendly, wide cousin. |
| dsa.hashing › Hash table internals | dbms.indexing › Hash indexes | A hash index is a hash table on disk: fast equality lookups, no range scans. |
| dsa.hashing › Hash table internals | lang.java-core › HashMap internals | Java's HashMap is a real-world hash table with chaining and treeified buckets. |
| dbms.nosql › Consistent hashing | sysd.data › Consistent hashing in design | Same technique, seen from the database and the system design side. |
| dsa.graph-basics › Cycle detection in directed graphs | os.deadlocks › Deadlock detection and recovery | Deadlock detection is cycle detection in a wait-for graph. |
| dsa.graph-basics › Cycle detection in directed graphs | dbms.transactions › Schedules and serializability | A schedule is conflict serializable exactly when its precedence graph has no cycle. |
| dsa.graph-basics › Topological sort | dbms.transactions › Schedules and serializability | The equivalent serial order is a topological order of the precedence graph. |
| dsa.graph-basics › Topological sort | eng.devops › CI/CD | Build systems and pipelines run dependent jobs in topological order. |
| os.deadlocks › Resource allocation graphs | dbms.concurrency › Deadlocks in databases | Databases face the same four deadlock conditions with row locks. |
| dsa.design-ds › LRU cache | os.memory › Page replacement | LRU page replacement uses the same eviction idea as an LRU cache. |
| dsa.design-ds › LRU cache | sysd.caching › Eviction policies | Cache servers evict with LRU, LFU or TTL. |
| dsa.design-ds › LRU cache | lld.classics › LRU cache as a class design | The DSA version is the core; the LLD version adds interfaces and pluggable policies. |
| lang.java-core › Specialised collections | dsa.design-ds › LRU cache | LinkedHashMap with access order is a ready-made LRU cache. |
| dsa.stacks-queues › Queue and deque basics | os.scheduling › Round robin | Round robin is a FIFO queue of ready processes. |
| dsa.heaps › Binary heap | os.scheduling › Priority scheduling | A priority scheduler is a priority queue of ready processes. |
| dsa.heaps › Top K elements | sysd.classics › Leaderboard | Leaderboards are top-K at scale. |
| dsa.heaps › Binary heap | markets.basics › Order books | An order book keeps the best bid and best ask instantly available, like two heaps or ordered maps. |
| markets.basics › How exchanges match orders | sysd.classics › Stock exchange matching engine | The matching rule becomes the core of the engine design. |
| lang.cpp-stl › Ordered containers | dsa.bst › Self-balancing BSTs overview | std::map and std::set are red-black trees. |
| lang.cpp-stl › Container adaptors | dsa.heaps › Binary heap | priority_queue is a binary heap. |
| lang.python-core › collections and heapq | dsa.heaps › Binary heap | heapq is a binary min-heap on a list. |
| dsa.tries › Autocomplete with tries | sysd.classics › Typeahead autocomplete | The trie is the heart of a typeahead service. |
| dsa.tries › Trie structure | cn.network › Routing basics | Routers look up the longest matching address prefix, a job tries do well. |
| dsa.shortest-paths › Dijkstra's algorithm | cn.network › Distance vector vs link state | Link-state routing (OSPF) runs Dijkstra on the network graph. |
| dsa.shortest-paths › Bellman-Ford | cn.network › Distance vector vs link state | Distance-vector routing (RIP) is distributed Bellman-Ford. |
| dsa.bits › Bitwise operators | cn.network › Subnetting and CIDR | Applying a subnet mask is a bitwise AND. |
| dsa.bits › Bitwise operators | arch.representation › Binary, hex and two's complement | Bit tricks rely on how integers are stored. |
| dsa.bits › Bitmask enumeration | puzzles.logic › Poisoned bottles and binary encoding | Each tester is one bit of the bottle's number. |
| dsa.sliding-window › Variable-size window | cn.transport › TCP flow control | TCP's sliding window moves over a byte stream the way a window moves over an array. |
| dsa.sliding-window › Fixed-size window | sysd.reliability › Rate limiting algorithms | Sliding-window rate limiters count requests in a moving time window. |
| dsa.binary-search › Classic binary search | dbms.indexing › Why indexes | An index turns a full scan into a search over sorted keys. |
| dsa.sorting › Merge sort | dbms.indexing › Join algorithms | Sort-merge join and external sorting are merge sort at database scale. |
| dsa.dp-foundations › Designing DP states | prob.expected-value › First-step analysis | First-step analysis writes expected values over states, exactly like a DP recurrence. |
| dsa.dp-intervals › Game DP | puzzles.games › Nim and impartial games | Both solve games by reasoning about winning and losing positions. |
| puzzles.games › Nim and impartial games | markets.game-theory › Zero-sum games and mixed strategies | Game-solving thinking carries into trading games. |
| puzzles.logic › Egg drop | dsa.dp-foundations › Designing DP states | Egg drop is a classic DP over (eggs, floors). |
| prob.markov › Markov chains | dsa.graph-basics › Graph representations | A Markov chain is a directed graph whose edge weights are probabilities. |
| dsa.math › Randomized algorithms | prob.random-variables › Linearity of expectation | Analyzing quickselect and shuffles uses expectation. |
| prob.simulation › Monte Carlo estimation | dsa.math › Randomized algorithms | Simulation is randomized computation used to estimate answers. |
| dsa.math › Combinatorics in code | math.combinatorics › Permutations and combinations | Same counting, with modular arithmetic added in code. |
| dsa.math › Modular arithmetic | math.number-theory › Modular arithmetic for puzzles | Same rules, used for coding and for puzzles. |
| oop.patterns-creational › Singleton | conc.locks › Thread-safe singleton | Lazy singletons need safe initialization across threads. |
| oop.patterns-behavioral › Observer | sysd.messaging › Publish-subscribe and event-driven architecture | Pub-sub is the observer pattern across services. |
| oop.patterns-behavioral › Strategy | lld.classics › Rate limiter | Rate-limiting algorithms plug in as strategies. |
| oop.patterns-behavioral › State | lld.classics › Vending machine | A vending machine is the textbook state pattern. |
| lang.cpp-modern › Virtual function internals | oop.pillars › Polymorphism | Runtime polymorphism is implemented with vtables. |
| os.sync › Producer-consumer problem | conc.patterns › Producer-consumer in code | The theory problem and its real implementation. |
| conc.patterns › Producer-consumer in code | sysd.messaging › Message queues | A message queue is a producer-consumer buffer between services. |
| os.memory › Paging | arch.cpu-memory › Memory hierarchy | Paging decides what lives in RAM vs disk in the hierarchy. |
| os.memory › TLB | arch.cpu-memory › Cache lines and locality | The TLB is a cache for address translations. |
| os.storage › Journaling file systems | dbms.recovery › Logs and write-ahead logging | Journaling is write-ahead logging for file system metadata. |
| os.processes › Inter-process communication | cn.transport › Ports and sockets | Sockets are IPC that also works across machines. |
| os.io › I/O multiplexing | sysd.messaging › Real-time delivery | epoll lets one server hold thousands of open connections. |
| os.processes › Context switching | arch.performance › Cost of system calls and context switches | Why switching is expensive at the hardware level. |
| os.processes › Context switching | conc.patterns › Thread pools | Thread pools reuse threads to avoid creation and switching costs. |
| conc.basics › Data races vs race conditions | os.sync › Race conditions and critical sections | Same bug class, from the OS theory side. |
| conc.atomics › Atomic operations | os.sync › Hardware support | Atomics are built on compare-and-swap instructions. |
| arch.cpu-memory › Cache lines and locality | conc.atomics › False sharing and cache-line padding | Two threads writing one cache line slow each other down. |
| arch.cpu-memory › Cache lines and locality | dsa.arrays › Matrix traversal | Row-major traversal is fast because it follows cache lines. |
| arch.representation › Floating point (IEEE 754) | lang.general › Floating point pitfalls | Why float comparisons need care. |
| arch.representation › Floating point (IEEE 754) | dsa.binary-search › Binary search on real numbers | Precision limits decide the stopping rule. |
| cn.application › HTTP basics | sysd.scalability › Stateless services | Stateless HTTP is what lets any server handle any request. |
| cn.application › DNS | sysd.scalability › Load balancing | DNS can spread traffic across servers and regions. |
| cn.security › OAuth and JWT basics | sysd.building-blocks › Authentication and authorization in systems | Token-based auth in practice. |
| cn.transport › TCP congestion control | sysd.messaging › Retries, timeouts and exponential backoff with jitter | Both back off when the network or a service is overloaded. |
| cn.infrastructure › Load balancers | sysd.scalability › Load balancing | The networking view and the design view of the same box. |
| cn.infrastructure › CDNs | sysd.caching › Where to cache | A CDN is a cache near the user. |
| dbms.concurrency › Isolation levels | conc.basics › Data races vs race conditions | Isolation levels decide which race conditions a database lets through. |
| dbms.concurrency › Lock-based protocols | os.sync › Mutex locks | Database locks are mutexes on rows and tables. |
| dbms.nosql › Replication | sysd.data › Replication in practice | Replication theory and its trade-offs in real designs. |
| dbms.nosql › CAP theorem | sysd.distributed › CAP theorem in practice | Choosing consistency or availability per feature. |
| dbms.nosql › Sharding and partitioning | sysd.data › Sharding strategies | Picking shard keys and handling hot spots. |
| dbms.indexing › LSM trees | sysd.building-blocks › Bloom filters | LSM-based stores use Bloom filters to skip files. |
| dbms.normalization › Normal forms | sql.joins › Inner join | Normalized data is put back together with joins. |
| sql.window › Running totals and moving averages | dsa.prefix-sums › 1D prefix sums | A running total is a prefix sum. |
| prob.random-variables › Expectation | markets.betting › Expected value decisions | Every trading decision starts with expected value. |
| markets.betting › Kelly criterion | math.calculus › Derivatives and optimization | The Kelly fraction maximizes expected log wealth. |
| math.linear-algebra › Covariance matrices | prob.random-variables › Covariance and correlation | The matrix form of covariance. |
| math.linear-algebra › Covariance matrices | markets.pricing › Diversification and correlation | Portfolio variance is w transpose times Sigma times w. |
| math.mental › Fast arithmetic | apt.quant › Percentages, profit and loss | The same speed skills power aptitude tests. |
| math.mental › Fermi estimation | sysd.method › Back-of-the-envelope estimation | Same skill: structured estimates with orders of magnitude. |
| puzzles.probability › Birthday problem | sysd.building-blocks › Unique ID generation | Birthday math tells you when random IDs start to collide. |
| puzzles.probability › Coin and dice games | prob.expected-value › Waiting time problems | Many games are waiting-time problems in disguise. |
| eng.git › Git internals | dsa.graph-basics › Graph representations | Commits form a directed acyclic graph. |
| eng.git › Git internals | sysd.building-blocks › Merkle trees | Git's object store is a Merkle tree of hashes. |
| sysd.distributed › Distributed locks and leases | conc.locks › Mutexes and lock guards | A mutex stretched across machines, with expiry. |
| dsa.intervals › Sweep line | lld.classics › Meeting room scheduler | Booking conflicts are interval overlaps. |
| career.resume › Project deep dives | sysd.method › Discussing trade-offs | Explaining your project is a mini design interview. |
| dsa.problem-solving › Communicating in interviews | career.search › Interview day tactics | Thinking aloud is half the interview. |
