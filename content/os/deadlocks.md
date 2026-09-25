---
topic: os.deadlocks
name: "Deadlocks"
subject: os
order: 6
prereqs: [os.sync]
---

## os.deadlocks.deadlock-conditions
name: "Deadlock conditions"
importance: must
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "mutual exclusion, hold and wait, no preemption, circular wait"

### simple
A deadlock is when a group of processes are all stuck forever, each waiting for something another one in the group is holding. Picture four cars at a four-way crossing, each waiting for the car on its right to move first: nobody can ever go. Deadlock needs four conditions at once, so removing any one of them makes it impossible.

### interview
- **Deadlock**: a set of processes where each is waiting for an event (usually a resource release) that only another process in the set can cause, so none ever proceeds.
- The four **Coffman conditions**, all **necessary**: (1) **mutual exclusion** (a resource can be held by only one process), (2) **hold and wait** (a process holds resources while waiting for more), (3) **no preemption** (resources cannot be taken away, only released voluntarily), (4) **circular wait** (a cycle P1 → P2 → … → P1 of processes each waiting for the next).
- Together they are **sufficient** when each resource has a single instance; with multiple instances a cycle is necessary but may not be enough.
- Four strategies: **prevention** (make one condition impossible), **avoidance** (refuse requests that could lead to deadlock, such as Banker's algorithm), **detection and recovery** (let it happen, find it, break it), and **ignoring** it (the "ostrich" approach most general-purpose OSes take for user programs).
- Classic code example: thread A locks X then Y while thread B locks Y then X. The standard fix is a global **lock order**.
- Not the same as livelock (active but no progress) or starvation (some progress, but one process never gets its turn).

### deep
#### Intuition

Deadlock is a traffic jam that can never clear: everyone holds a piece and waits for another piece held inside the same circle. It needs exclusive pieces, holding while waiting, nobody taking pieces away and a closed circle. Break any link in that chain and the jam cannot form.

#### The four conditions, with the classic two-lock example

```cpp
mutex x, y;

void threadA() {
    lock_guard<mutex> a(x);                          // holds X...
    this_thread::sleep_for(chrono::milliseconds(10));
    lock_guard<mutex> b(y);                          // ...and waits for Y
}

void threadB() {
    lock_guard<mutex> a(y);                          // holds Y...
    this_thread::sleep_for(chrono::milliseconds(10));
    lock_guard<mutex> b(x);                          // ...and waits for X: deadlock
}
```

| condition | in this example |
|---|---|
| mutual exclusion | a mutex has one owner at a time |
| hold and wait | each thread keeps its first lock while waiting for the second |
| no preemption | nobody can force a thread to give up a mutex |
| circular wait | A waits for B (Y), B waits for A (X) |

#### Worked example: the timeline

| time (ms) | thread A | thread B | X | Y |
|---|---|---|---|---|
| 0 | locks X | locks Y | A | B |
| 0 to 10 | sleeps | sleeps | A | B |
| 10 | waits for Y | waits for X | A | B |
| forever | blocked | blocked | A | B |

The sleep only makes the bad interleaving likely; without it the program deadlocks occasionally, which is worse because it slips through testing.

#### The fix: impose an order

```cpp
mutex x, y;

void threadA() {
    scoped_lock both(x, y);            // C++17: locks both with a deadlock-avoidance algorithm
}

void threadB() {
    lock_guard<mutex> a(x);            // or: follow one global order everywhere, X before Y
    lock_guard<mutex> b(y);
}

int main() {
    thread t1(threadA), t2(threadB);
    t1.join(); t2.join();
    cout << "no deadlock\n";
}
```

#### Deadlocks outside threads

- **Databases**: two transactions update rows in opposite orders; the database detects the cycle and aborts one.
- **Processes and pipes**: a parent waits for a child to exit while the child blocks writing to a full pipe the parent never reads.
- **Distributed systems**: services calling each other synchronously in a cycle, each holding a thread from a pool.

#### Handling strategies at a glance

| strategy | idea | cost |
|---|---|---|
| prevention | make a condition impossible (lock ordering) | design constraints, sometimes lower utilization |
| avoidance | check every request for safety (Banker's) | needs maximum demands in advance; runtime overhead |
| detection and recovery | find cycles, abort or roll back | lost work; detection overhead |
| ignore | reboot or kill by hand if it happens | rare hangs |

Connects to: resource allocation graphs, deadlock prevention, deadlock avoidance, dining philosophers, deadlocks in databases.

### questions
Q: What is a deadlock?
A: A state in which a set of processes or threads are all blocked, each waiting for a resource or event that only another member of the same set can provide, so none of them can ever continue.

Q: What are the four necessary conditions for deadlock?
A: Mutual exclusion, where resources are held exclusively; hold and wait, where a process holds some resources while requesting others; no preemption, where resources cannot be forcibly taken away; and circular wait, where there is a cycle of processes each waiting for a resource held by the next.

Q: Two threads each lock two mutexes in opposite orders. What can happen and how do you fix it?
A: Each can acquire its first mutex and then block forever waiting for the other's, which is a circular wait and therefore a deadlock. Fix it by acquiring locks in one global order in every thread, or by using a helper such as std::scoped_lock that locks several mutexes with a deadlock-avoidance algorithm.

Q: What are the main strategies for dealing with deadlocks?
A: Prevention, which designs the system so one of the four conditions can never hold; avoidance, which grants a request only if the system stays in a safe state; detection and recovery, which lets deadlocks happen, detects them and breaks them; and ignoring the problem, which many general-purpose operating systems do for user programs.

Q: Are the four conditions sufficient for deadlock?
A: They are all necessary. When every resource has a single instance, a circular wait together with the other three does mean deadlock. With multiple instances of a resource type, a cycle can exist without a deadlock, because another process outside the cycle may release an instance.

## os.deadlocks.resource-allocation-graphs
name: "Resource allocation graphs"
importance: must
prereqs: [os.deadlocks.deadlock-conditions]
scope: "cycles and deadlock"

### simple
A resource allocation graph is a drawing of which process holds which resource and which process is waiting for which resource. Processes are circles, resources are boxes, and arrows show "wants" and "has". If the arrows form a loop and every resource is one of a kind, the processes in the loop are deadlocked.

### interview
- Two kinds of nodes: **processes** (circles) and **resource types** (rectangles, with a dot per **instance**).
- Two kinds of edges: a **request edge** P → R (P is waiting for R) and an **assignment edge** R → P (an instance of R is held by P).
- **No cycle ⇒ no deadlock.**
- **Single instance per resource**: a **cycle ⇔ deadlock**.
- **Multiple instances**: a cycle is **necessary but not sufficient**; a process outside the cycle may release an instance and break it.
- With single instances, collapse the graph to a **wait-for graph** (P → Q when P waits for a resource Q holds) and detect deadlock by finding a cycle with DFS in O(V + E).
- Avoidance variant: **claim edges** (dashed P → R: P may request R later); a request is granted only if turning it into an assignment edge creates no cycle.

### deep
#### Worked example 1: a deadlock

Resources R1 and R2 each have one instance.

```text
P1 ──requests──> R2 ──held by──> P2
^                                 │
│                              requests
held by                           │
│                                 v
R1 <──────────────────────────────┘
```

Edges: R1 → P1 (P1 holds R1), P1 → R2 (P1 wants R2), R2 → P2 (P2 holds R2), P2 → R1 (P2 wants R1). The cycle P1 → R2 → P2 → R1 → P1 involves only single-instance resources, so P1 and P2 are deadlocked.

#### Worked example 2: a cycle without deadlock

R1 and R2 each have **two** instances.

| edge | meaning |
|---|---|
| R1 → P2, R1 → P3 | both instances of R1 are held by P2 and P3 |
| R2 → P1, R2 → P4 | both instances of R2 are held by P1 and P4 |
| P1 → R1 | P1 waits for R1 |
| P3 → R2 | P3 waits for R2 |

There is a cycle P1 → R1 → P3 → R2 → P1, yet no deadlock: P4 is not waiting for anything, so it finishes and releases its R2 instance, P3 gets it and finishes, releasing R1, and P1 can then proceed. Cycles in multi-instance graphs only raise the possibility.

#### Code: cycle detection in a wait-for graph

```cpp
// waitsFor[p] lists the processes p is waiting on. Returns a cycle if one exists.
vector<int> findCycle(const vector<vector<int>>& waitsFor) {
    int n = waitsFor.size();
    vector<int> color(n, 0), parent(n, -1);           // 0 new, 1 on stack, 2 done
    vector<int> cycle;
    function<bool(int)> dfs = [&](int u) {
        color[u] = 1;
        for (int v : waitsFor[u]) {
            if (color[v] == 1) {                       // back edge: a cycle u -> v -> ... -> u
                for (int x = u; x != v; x = parent[x]) cycle.push_back(x);
                cycle.push_back(v);
                reverse(cycle.begin(), cycle.end());
                return true;
            }
            if (color[v] == 0) { parent[v] = u; if (dfs(v)) return true; }
        }
        color[u] = 2;
        return false;
    };
    for (int s = 0; s < n; ++s)
        if (color[s] == 0 && dfs(s)) return cycle;
    return {};
}

int main() {
    // P0 waits for P1, P1 for P2, P2 for P0 (deadlocked);
    // P3 waits for P0 (blocked, but not in the cycle).
    auto c = findCycle({{1}, {2}, {0}, {0}});
    for (int p : c) cout << "P" << p << " ";          // P0 P1 P2
    cout << "\n";
}
```

Note that P3 (and T4) are stuck too, because they wait on a deadlocked process, but they are not part of the cycle; aborting a process in the cycle frees them as well.

#### From allocation graph to wait-for graph

Remove the resource nodes and connect P → Q whenever P requests a resource that Q holds. This works for single-instance resources; with multiple instances you need the matrix-based detection algorithm instead.

Connects to: deadlock conditions, deadlock detection and recovery, cycle detection in directed graphs, deadlock avoidance.

### questions
Q: What are the nodes and edges of a resource allocation graph?
A: Nodes are processes, drawn as circles, and resource types, drawn as rectangles with one dot per instance. A request edge from a process to a resource means the process is waiting for it; an assignment edge from a resource instance to a process means the process holds it.

Q: Does a cycle in a resource allocation graph always mean deadlock?
A: Only if every resource in the cycle has a single instance. With multiple instances, a cycle is necessary but not sufficient, because a process outside the cycle may hold an instance and release it, which lets the cycle unwind.

Q: What is a wait-for graph?
A: A simplified graph for single-instance resources that has only process nodes, with an edge from P to Q when P is waiting for a resource that Q holds. A cycle in the wait-for graph means the processes in it are deadlocked, and it can be found with depth-first search.

Q: How do you detect a cycle in a wait-for graph efficiently?
A: Run a depth-first search that marks nodes as unvisited, on the current path or finished. Reaching a node that is on the current path means a back edge and therefore a cycle. This takes time proportional to the number of processes plus edges.

## os.deadlocks.deadlock-prevention
name: "Deadlock prevention"
importance: must
prereqs: [os.deadlocks.deadlock-conditions]
scope: "breaking each condition"

### simple
Deadlock prevention means designing the rules so that one of the four deadlock conditions can never happen. It is like a kitchen rule that everyone must take the salt before the pepper: nobody can end up holding pepper while waiting for salt, so the standoff cannot happen. Each prevention rule costs some flexibility or efficiency.

### interview
- Break **mutual exclusion**: make resources shareable (read-only data, lock-free structures) or funnel access through one owner (a print spooler). Often impossible for truly exclusive resources.
- Break **hold and wait**: request **all resources at once** before starting, or release everything before asking for more. Downsides: low utilization (resources idle while held) and possible starvation of processes needing many popular resources.
- Break **no preemption**: if a request cannot be granted, **release what you hold** and retry (`try_lock` with back-off), or let the system preempt resources whose state can be saved (CPU registers, memory pages). Does not work for resources like a half-printed page or a mutex protecting inconsistent data.
- Break **circular wait**: impose a **global order** on resources and always acquire in increasing order (lock hierarchies, ordering by account id or memory address). The **most practical** technique.
- Library help: `std::scoped_lock` / `std::lock` lock several mutexes at once without deadlock; `std::timed_mutex::try_lock_for` to give up after a timeout; databases acquire row locks in key order.
- Prevention is decided at design time and has zero runtime bookkeeping, unlike avoidance.

### deep
#### Breaking each condition

| condition | how to break it | example | cost |
|---|---|---|---|
| mutual exclusion | share or spool the resource | read-only files, a spooler owns the printer, lock-free queues | not always possible |
| hold and wait | all-or-nothing requests | a job declares and gets all its locks before running | resources idle; starvation |
| no preemption | give up held resources on failure | `try_lock` both, else release and retry | wasted work; possible livelock |
| circular wait | acquire in a global order | always lock the lower account id first | must know an order; discipline |

#### Worked example: bank transfers

Transfer A → B locks A then B; a concurrent transfer B → A locks B then A: a textbook deadlock. With ordering by id:

| transfer | locks taken, in order |
|---|---|
| A (id 7) → B (id 3) | 3, then 7 |
| B (id 3) → A (id 7) | 3, then 7 |

Both threads now reach for lock 3 first; one waits at the very first step while holding nothing, so no cycle can form.

#### Code: three prevention techniques

```cpp
struct Account {
    int id;
    long long balance;
    mutex m;
};

// 1. Circular wait broken: a global order by id.
void transferOrdered(Account& from, Account& to, long long amt) {
    Account& first = from.id < to.id ? from : to;
    Account& second = from.id < to.id ? to : from;
    lock_guard<mutex> a(first.m), b(second.m);
    from.balance -= amt;
    to.balance += amt;
}

// 2. No preemption broken: never wait for the second lock while holding the first.
void transferBackoff(Account& from, Account& to, long long amt) {
    while (true) {
        unique_lock<mutex> a(from.m);
        unique_lock<mutex> b(to.m, try_to_lock);
        if (b.owns_lock()) {
            from.balance -= amt;
            to.balance += amt;
            return;
        }
        a.unlock();                                  // give back what we hold
        this_thread::yield();                        // back off, then retry
    }
}

// 3. Hold and wait broken: take both at once (std::lock uses a deadlock-avoidance algorithm).
void transferBoth(Account& from, Account& to, long long amt) {
    scoped_lock both(from.m, to.m);
    from.balance -= amt;
    to.balance += amt;
}

int main() {
    Account x{7, 1000, {}}, y{3, 1000, {}};
    vector<thread> ts;
    for (int i = 0; i < 2; ++i) {                    // opposite directions: the risky case
        ts.emplace_back([&] { for (int k = 0; k < 10000; ++k) transferOrdered(x, y, 1); });
        ts.emplace_back([&] { for (int k = 0; k < 10000; ++k) transferBackoff(y, x, 1); });
        ts.emplace_back([&] { for (int k = 0; k < 10000; ++k) transferBoth(x, y, 1); });
        ts.emplace_back([&] { for (int k = 0; k < 10000; ++k) transferBoth(y, x, 1); });
    }
    for (auto& t : ts) t.join();
    cout << x.balance << " " << y.balance << "\n";   // 1000 1000: every transfer finished
}
```

#### Choosing

- **Circular wait** is the go-to for application code: document a lock hierarchy and enforce it (some codebases assert the order at runtime in debug builds).
- **All-at-once** works when a task's needs are known up front, such as a batch job or two-phase locking's growing phase.
- **Back-off** helps when an order is impossible to define, but add randomness to the retry delay to avoid livelock.

Connects to: deadlock conditions, deadlock avoidance, dining philosophers, livelock and starvation, mutex locks.

### questions
Q: How can each of the four deadlock conditions be prevented?
A: Mutual exclusion by making resources shareable or spooled; hold and wait by requesting all resources at once or releasing everything before new requests; no preemption by releasing held resources when a request fails or letting the system preempt resources whose state can be saved; circular wait by acquiring resources in a fixed global order.

Q: Why is breaking circular wait the most common prevention technique?
A: It only requires that every thread acquire locks in the same agreed order, such as by resource id or address. It costs almost nothing at runtime, does not force processes to hold resources longer than needed, and works for exclusive resources where other techniques do not.

Q: What are the drawbacks of requesting all resources at once?
A: Resources are held long before and after they are actually used, which lowers utilization, and processes must know all their needs up front. A process needing several popular resources may also wait a long time, possibly starving.

Q: How does try_lock with back-off prevent deadlock, and what new risk does it add?
A: If the second lock is unavailable, the thread releases the lock it already holds instead of waiting, so it never holds while waiting and a cycle cannot form. The risk is livelock: two threads can keep grabbing and releasing in lockstep, which random back-off delays reduce.

## os.deadlocks.deadlock-avoidance
name: "Deadlock avoidance"
importance: must
prereqs: [os.deadlocks.resource-allocation-graphs]
scope: "safe states, Banker's algorithm"

### simple
Deadlock avoidance means the system checks every request and grants it only if it can still guarantee that everyone will eventually finish. A careful banker lends money only if, even in the worst case, they could still satisfy every customer's full credit line in some order. If granting a request would make that impossible, the customer is asked to wait.

### interview
- Each process declares its **maximum** need of each resource type in advance. On every request, the system grants it only if the resulting state is **safe**.
- **Safe state**: there exists a **safe sequence** of all processes in which each one's remaining needs can be met by what is available plus what earlier processes in the sequence release when they finish.
- **Safe ⇒ no deadlock. Unsafe ⇏ deadlock**, but an unsafe state *may* lead to one, so avoidance never enters it.
- **Banker's algorithm** (Dijkstra): matrices **Available** (m), **Max**, **Allocation** and **Need = Max − Allocation** (n × m). The **safety algorithm** costs **O(m · n²)**.
- **Request algorithm**: if Request > Need, it is an error; if Request > Available, wait; otherwise pretend to allocate, run the safety check, and grant only if safe (otherwise roll back and wait).
- Rarely used in general-purpose OSes (maximum needs are unknown, processes come and go, it is costly), but it is a favorite numerical in exams and interviews.

### deep
#### The data

For n processes and m resource types:

| structure | size | meaning |
|---|---|---|
| Available | m | free instances of each type |
| Max | n × m | the most each process may ever request |
| Allocation | n × m | what each process holds now |
| Need | n × m | Max − Allocation: what it may still request |

#### Safety algorithm

1. Work = Available; Finish[i] = false for all i.
2. Find an unfinished i with Need[i] ≤ Work (every component).
3. Pretend it runs to completion: Work += Allocation[i]; Finish[i] = true; go to step 2.
4. If every Finish[i] is true, the state is safe and the order found is a safe sequence.

#### Worked example (the classic)

Five processes, three resource types with 10, 5 and 7 instances. Available = (3, 3, 2).

| process | Allocation | Max | Need |
|---|---|---|---|
| P0 | 0 1 0 | 7 5 3 | 7 4 3 |
| P1 | 2 0 0 | 3 2 2 | 1 2 2 |
| P2 | 3 0 2 | 9 0 2 | 6 0 0 |
| P3 | 2 1 1 | 2 2 2 | 0 1 1 |
| P4 | 0 0 2 | 4 3 3 | 4 3 1 |

Scanning in order and repeating:

| step | pick | Need ≤ Work? | Work after release |
|---|---|---|---|
| start | | | 3 3 2 |
| 1 | P1 | 1 2 2 ≤ 3 3 2 | 5 3 2 |
| 2 | P3 | 0 1 1 ≤ 5 3 2 | 7 4 3 |
| 3 | P4 | 4 3 1 ≤ 7 4 3 | 7 4 5 |
| 4 | P0 | 7 4 3 ≤ 7 4 5 | 7 5 5 |
| 5 | P2 | 6 0 0 ≤ 7 5 5 | 10 5 7 |

Safe sequence: P1, P3, P4, P0, P2 (others, such as P1, P3, P4, P2, P0, also exist).

**Requests.** P1 asks for (1, 0, 2): within its Need and within Available, and the pretend state (Available 2 3 0) is still safe, so it is **granted**. Then P4 asks for (3, 3, 0): more than Available (2 3 0), so it **waits**. P0 asks for (0, 2, 0): available, but the pretend state leaves (2, 1, 0) and no process's Need fits, so the state would be **unsafe** and P0 must wait.

#### Code

```cpp
using Vec = vector<int>;

bool lessEq(const Vec& a, const Vec& b) {
    for (size_t j = 0; j < a.size(); ++j) if (a[j] > b[j]) return false;
    return true;
}

// Returns a safe sequence, or an empty vector if the state is unsafe.
vector<int> safeSequence(Vec work, const vector<Vec>& alloc, const vector<Vec>& need) {
    int n = alloc.size();
    vector<bool> done(n, false);
    vector<int> seq;
    for (bool progress = true; progress;) {
        progress = false;
        for (int i = 0; i < n; ++i) {
            if (done[i] || !lessEq(need[i], work)) continue;
            // i finishes, releases
            for (size_t j = 0; j < work.size(); ++j) work[j] += alloc[i][j];
            done[i] = true;
            seq.push_back(i);
            progress = true;
        }
    }
    return (int)seq.size() == n ? seq : vector<int>{};
}

int main() {
    Vec avail = {3, 3, 2};
    vector<Vec> alloc = {{0, 1, 0}, {2, 0, 0}, {3, 0, 2}, {2, 1, 1}, {0, 0, 2}};
    vector<Vec> mx = {{7, 5, 3}, {3, 2, 2}, {9, 0, 2}, {2, 2, 2}, {4, 3, 3}};
    vector<Vec> need = mx;
    for (int i = 0; i < 5; ++i)
        for (int j = 0; j < 3; ++j) need[i][j] -= alloc[i][j];
    for (int p : safeSequence(avail, alloc, need)) cout << "P" << p << " ";
    cout << "\n";                                                          // P1 P3 P4 P0 P2
}
```

#### Why it is rare in practice

Processes seldom know their maximum needs, the set of processes changes constantly, resources come and go (a disk fails), and running an O(m · n²) check on every request is expensive. Real systems prefer prevention (lock ordering) or detection (databases). The single-instance version uses the resource allocation graph with claim edges instead of matrices.

Connects to: resource allocation graphs, deadlock prevention, deadlock detection and recovery, deadlock conditions.

### questions
Q: What is a safe state?
A: A state in which there exists at least one ordering of all processes, a safe sequence, such that each process's remaining maximum need can be satisfied by the currently available resources plus those released by the processes before it in the sequence. From a safe state the system can always avoid deadlock.

Q: Is every unsafe state a deadlock?
A: No. An unsafe state only means the system can no longer guarantee that deadlock will be avoided; processes might still release resources early or request less than their maximum. Avoidance algorithms simply refuse to enter unsafe states.

Q: Describe the Banker's algorithm.
A: Each process declares its maximum need. The system tracks Available, Allocation and Need, which is Max minus Allocation. When a process requests resources, the system checks the request is within its Need and within Available, tentatively grants it, and runs the safety algorithm; if the resulting state is safe the request is granted, otherwise it is rolled back and the process waits.

Q: What is the time complexity of the Banker's safety algorithm?
A: O(m times n squared) for n processes and m resource types, because each of up to n passes scans n processes and compares vectors of length m.

Q: Why is the Banker's algorithm rarely used in real operating systems?
A: It requires every process to declare its maximum resource needs in advance, which is usually unknown, assumes a fixed set of processes and resources, and adds a costly safety check to every request. Prevention and detection are more practical.

## os.deadlocks.deadlock-detection-and-recovery
name: "Deadlock detection and recovery"
importance: important
prereqs: [os.deadlocks.resource-allocation-graphs]
scope: "wait-for graphs, killing or rolling back"

### simple
Detection and recovery lets deadlocks happen, notices them, and then breaks them. A traffic controller watching a jammed junction might tow away one car so the rest can move. The system picks a victim, stops it or rolls it back, and lets everyone else continue.

### interview
- **Detection with single-instance resources**: maintain a **wait-for graph** and look for a **cycle** (DFS, O(V + E)).
- **Detection with multiple instances**: a Banker-like algorithm that uses current **Request** instead of Need: repeatedly "finish" any process whose current request fits in Work; processes that can never finish are deadlocked. O(m · n²).
- **When to run it**: on every blocked request (catches deadlocks instantly, costly), periodically (for example every few seconds), or when CPU utilization drops suspiciously.
- **Recovery by termination**: abort all deadlocked processes (simple, loses much work) or **one at a time** until the cycle breaks, choosing a **victim** by lowest cost (priority, work done, resources held, how many more it needs, whether it is interactive).
- **Recovery by preemption**: take resources from a victim and **roll it back** to a checkpoint (or restart it); count rollbacks in the cost so the same victim does not **starve**.
- Databases do exactly this: a lock manager keeps a wait-for graph, and on a cycle it aborts one transaction (often the youngest or the one with the least work), which the application retries. Some systems use lock **timeouts** instead.

### deep
#### Detection with multiple instances

Same shape as the safety algorithm, but it asks "can each process finish with what it is **currently** requesting?":

1. Work = Available. For each process, Finish[i] = true if it holds nothing, else false.
2. Find i with Finish[i] = false and Request[i] ≤ Work.
3. Work += Allocation[i]; Finish[i] = true; go to step 2.
4. Every i with Finish[i] = false is deadlocked.

#### Worked example

Resources A, B, C with 7, 2 and 6 instances; Available = (0, 0, 0).

| process | Allocation | Request |
|---|---|---|
| P0 | 0 1 0 | 0 0 0 |
| P1 | 2 0 0 | 2 0 2 |
| P2 | 3 0 3 | 0 0 0 |
| P3 | 2 1 1 | 1 0 0 |
| P4 | 0 0 2 | 0 0 2 |

P0 requests nothing, so it finishes: Work = (0, 1, 0). P2 finishes: (3, 1, 3). Now P1 (2, 0, 2), P3 and P4 all fit, and every process finishes: no deadlock. If P2 then requested one more C, Work after P0 would be (0, 1, 0), and no other process's request fits: P1, P2, P3 and P4 are deadlocked.

```cpp
using Vec = vector<int>;

vector<int> deadlocked(Vec work, const vector<Vec>& alloc, const vector<Vec>& request) {
    int n = alloc.size(), m = work.size();
    vector<bool> finish(n);
    for (int i = 0; i < n; i++)                      // holding nothing: cannot be deadlocked
        finish[i] = all_of(alloc[i].begin(), alloc[i].end(), [](int a) { return a == 0; });
    for (bool changed = true; changed;) {
        changed = false;
        for (int i = 0; i < n; i++) {
            if (finish[i]) continue;
            bool fits = true;
            for (int r = 0; r < m; r++) fits = fits && request[i][r] <= work[r];
            if (!fits) continue;
            for (int r = 0; r < m; r++) work[r] += alloc[i][r];   // it finishes and releases
            finish[i] = changed = true;
        }
    }
    vector<int> stuck;
    for (int i = 0; i < n; i++)
        if (!finish[i]) stuck.push_back(i);
    return stuck;
}

int main() {
    vector<Vec> alloc = {{0, 1, 0}, {2, 0, 0}, {3, 0, 3}, {2, 1, 1}, {0, 0, 2}};
    vector<Vec> request = {{0, 0, 0}, {2, 0, 2}, {0, 0, 0}, {1, 0, 0}, {0, 0, 2}};
    cout << deadlocked({0, 0, 0}, alloc, request).size() << "\n";   // 0: no deadlock
    request[2] = {0, 0, 1};
    for (int p : deadlocked({0, 0, 0}, alloc, request)) cout << "P" << p << " ";
    cout << "\n";                                                    // P1 P2 P3 P4
}
```

#### Choosing a victim

| factor | prefer to abort a process that… |
|---|---|
| priority | has lower priority |
| progress | has run for less time, or has less left to lose |
| resources | holds resources that break the cycle, or holds more of them |
| future needs | still needs many more resources |
| kind | is batch rather than interactive |
| history | has been rolled back fewer times (avoids starvation) |

#### Recovery cost

Aborting a process can leave files or shared data half-updated; systems that recover by abort need transactions or other ways to undo partial work. That is why detection and recovery fits databases so well: every transaction can already be rolled back.

Connects to: resource allocation graphs, deadlock avoidance, cycle detection in directed graphs, deadlocks in databases, livelock and starvation.

### questions
Q: How is deadlock detected when every resource has a single instance?
A: Build a wait-for graph with an edge from each blocked process to the process holding the resource it needs, and search it for a cycle with depth-first search. Any cycle means the processes in it are deadlocked.

Q: How does the multiple-instance detection algorithm differ from the Banker's safety algorithm?
A: It uses each process's current outstanding request instead of its maximum remaining need, and treats processes holding nothing as finished. It repeatedly lets any process whose request fits in the available pool finish and release its allocation; processes that can never finish are deadlocked.

Q: How can a system recover from a deadlock?
A: By terminating processes, either all deadlocked ones or one at a time until the cycle is broken, or by preempting resources from a victim and rolling it back to a safe checkpoint or restarting it. The victim is chosen to minimize cost, and repeated victims are avoided to prevent starvation.

Q: How often should deadlock detection run?
A: It is a trade-off. Checking on every blocked request finds deadlocks immediately but is expensive; checking periodically or when CPU utilization drops is cheaper but lets deadlocked processes sit idle longer and makes it harder to tell which request caused the cycle.

## os.deadlocks.livelock-and-starvation
name: "Livelock and starvation"
importance: important
prereqs: [os.deadlocks.deadlock-conditions]
scope: "how they differ from deadlock"

### simple
Livelock is when processes keep busily reacting to each other but never get anything done, and starvation is when one process keeps missing its turn while others carry on. Two people in a hallway who both step aside the same way, again and again, are in a livelock. A shy customer who keeps getting pushed back in a crowded queue is starving, even though the shop keeps serving other people.

### interview
- **Deadlock**: processes are **blocked**, doing nothing, waiting forever for each other. No progress for anyone in the set.
- **Livelock**: processes are **running and changing state**, but only in response to each other, so no real progress is made. Typical cause: symmetric retry or back-off logic (both threads release and retry at the same moment).
- **Starvation**: a process waits **indefinitely** while others make progress, due to an unfair policy: priority scheduling without aging, reader-preference locks, unfair lock handoff, a victim chosen for rollback every time.
- Fixes for livelock: **randomized** back-off (as in Ethernet's exponential back-off), breaking symmetry (priorities or ids decide who yields), or a global order.
- Fixes for starvation: **aging**, FIFO or fair queues (ticket locks), bounded waiting, counting rollbacks in victim selection.
- Deadlock implies no progress; starvation can happen in a system that is making lots of progress overall. Livelock burns CPU; deadlock usually does not.

### deep
#### Side by side

| | deadlock | livelock | starvation |
|---|---|---|---|
| threads' state | blocked | running | the victim waits; others run |
| CPU use | idle | busy | normal |
| overall progress | none (in the set) | none | yes, except for the victim |
| typical cause | circular wait | symmetric retries | unfair scheduling or locking |
| typical fix | lock ordering, detection | randomized back-off | aging, FIFO fairness |

#### Worked example: a livelock and its cure

Two polite threads each hold one lock and need the other's; whenever one sees a conflict, it releases and retries after a delay.

| round | thread A | thread B | result |
|---|---|---|---|
| 1 | takes X, sees Y busy, releases | takes Y, sees X busy, releases | nothing |
| 2 | waits 1 ms, retakes X | waits 1 ms, retakes Y | the same conflict |
| … | identical every round | identical every round | busy forever |

With the same fixed delay they stay in lockstep. A random delay breaks the symmetry: sooner or later one thread retries while the other is still waiting, and it gets both locks.

```cpp
int roundsUntilSuccess(bool randomized, unsigned seed = 1, int limit = 1000) {
    mt19937 rng(seed);
    uniform_int_distribution<int> pick(1, 3);
    for (int round = 1; round <= limit; round++) {
        int delayA = randomized ? pick(rng) : 1;     // when A will grab its first lock
        int delayB = randomized ? pick(rng) : 1;     // when B will grab its first lock
        if (delayA != delayB) return round;          // one went first and got both locks
    }
    return -1;                                       // still colliding: livelock
}

int main() {
    cout << roundsUntilSuccess(false) << " " << roundsUntilSuccess(true) << "\n";
    // -1 (never), then a small number of rounds
}
```

The model is simplified (real threads have jitter), but it shows the principle: identical, deterministic back-off can collide forever, while random back-off succeeds within a few rounds on average. Ethernet's exponential back-off after collisions uses the same idea.

#### Worked example: starvation under strict priority

A scheduler always runs the highest-priority ready task. High-priority requests arrive every 5 ms and each takes 5 ms. A low-priority task never runs, even though the CPU is busy doing useful work the whole time. Aging (raising the waiting task's priority over time) or reserving a share of CPU for lower levels fixes it.

#### Starvation with locks

```cpp
int main() {
    mutex m;
    atomic<bool> stop{false};
    vector<long long> counts(4, 0);
    vector<thread> ts;
    for (int i = 0; i < 4; ++i)
        ts.emplace_back([&, i] {
            while (!stop) {
                lock_guard<mutex> g(m);    // std::mutex makes no fairness promise
                ++counts[i];
            }
        });
    this_thread::sleep_for(chrono::milliseconds(200));
    stop = true;
    for (auto& t : ts) t.join();
    for (auto c : counts) cout << c << " ";   // the counts differ: nothing promises equal turns
    cout << "\n";
}
```

In three test runs the busiest thread got up to about 1.4 times as many turns as the least busy one. The gap is small here, but nothing in `std::mutex` stops one thread from being passed over again and again: a thread that releases a lock and immediately re-requests it often wins because it is already running. A **ticket lock** (take a number, serve in order) guarantees FIFO order at the cost of some throughput.

Connects to: deadlock conditions, priority scheduling, readers-writers problem, dining philosophers, deadlock prevention.

### questions
Q: What is the difference between deadlock and livelock?
A: In a deadlock the processes are blocked and do nothing while waiting for each other. In a livelock they keep running and changing state in response to each other, for example repeatedly releasing and retrying locks in step, but still make no progress. Livelock consumes CPU while deadlock usually does not.

Q: What is starvation, and how is it different from deadlock?
A: Starvation is when a process waits indefinitely for a resource or the CPU because others are always chosen first, even though the system as a whole keeps making progress. In a deadlock, no process in the set can make any progress at all.

Q: How can livelock be avoided?
A: Break the symmetry between the competing processes: use randomized or exponential back-off before retrying, let a priority or id decide who yields, or impose a global order on resource acquisition so conflicts cannot repeat identically.

Q: What techniques prevent starvation?
A: Aging, which raises the priority of processes the longer they wait; fair queuing such as FIFO or ticket locks; bounded waiting guarantees in synchronization algorithms; and, in deadlock recovery, counting how often a process has been chosen as a victim.
