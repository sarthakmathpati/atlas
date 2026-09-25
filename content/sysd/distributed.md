---
topic: sysd.distributed
name: "Consistency and distributed systems"
subject: sysd
order: 5
prereqs: [sysd.data]
---

## sysd.distributed.cap-theorem-in-practice
name: "CAP theorem in practice"
importance: must
scope: "choosing CP or AP per feature"

### simple
When the network between parts of a system breaks, each part must choose: keep answering and risk giving out-of-date answers, or refuse to answer until it can be sure. That choice between availability and consistency during a network split is the CAP theorem. In practice you make the choice per feature: a bank balance should refuse rather than be wrong, while a like counter can happily be a little off.

### interview
- **CAP**: with a **network partition** (P), a replicated system must give up either **consistency** (C, every read sees the latest write: linearizability) or **availability** (A, every request to a working node gets a non-error response). Partitions will happen, so the real choice is **CP or AP during a partition**.
- **CP**: nodes that can't reach a majority refuse or delay requests (errors, timeouts) so no one sees conflicting data. Fits payments, inventory reservations, unique usernames, leader election, locks.
- **AP**: every node keeps serving and accepting writes; replicas diverge and are **reconciled** afterwards (last write wins, merges, CRDTs, or asking the user). Fits carts, likes, feeds, presence, analytics.
- Without a partition, you can have both C and A; the trade-off then is **latency vs consistency** (PACELC).
- CAP's C (linearizability) is not ACID's C (constraints). And "availability" in CAP is strict: any non-error answer from any working node.
- Many databases are tunable (quorum sizes, consistency levels per query), so the choice can be made per request.

### deep
#### One app, two choices

Two data centers, each with a replica, lose their link. Users keep arriving on both sides. The cart is AP (keep accepting, merge later); the purchase of the last unit in stock is CP (only the side that holds the majority for that item may sell it).

```cpp
struct Replica {
    string name;
    set<string> cart;          // AP data: a set that merges by union
    int stock = 1;             // CP data: the last unit of an item
    bool has_majority;         // can this side reach a majority of the item's voters?
};

int main() {
    Replica east{"east", {"book"}, 1, true}, west{"west", {"book"}, 1, false};

    // --- the partition starts: east and west can't talk ---
    east.cart.insert("lamp");                         // AP: both sides accept cart edits
    west.cart.insert("mug");
    for (Replica* r : {&east, &west}) {               // both sides try to sell the last unit
        if (!r->has_majority) {
            printf("%s: buy -> 503, try again later\n", r->name.c_str());
            continue;
        }
        r->stock -= 1;
        printf("%s: buy -> ok, stock now %d\n", r->name.c_str(), r->stock);
    }

    // --- the partition heals: reconcile ---
    set<string> merged = east.cart;
    merged.insert(west.cart.begin(), west.cart.end());   // union: no edit is lost
    east.cart = west.cart = merged;
    west.stock = east.stock;                             // CP data had only one writer
    printf("cart after merge:");
    for (auto& item : merged) printf(" %s", item.c_str());
    printf("\nstock after merge: %d (sold once)\n", east.stock);
}
```

Output:

```text
east: buy -> ok, stock now 0
west: buy -> 503, try again later
cart after merge: book lamp mug
stock after merge: 0 (sold once)
```

The west side stayed *available* for carts (users kept adding items, and nothing was lost because a set union merges cleanly) but chose *consistency* for the purchase: it refused rather than risk selling the same unit twice. If both sides had sold, the business would have to cancel an order and apologize, which is what an AP inventory system must be prepared to do.

#### Deciding per feature

| feature | during a partition | why |
|---|---|---|
| payment, balance | CP: reject or queue | a wrong answer costs money and trust |
| last seats, inventory | CP, or AP with overbooking limits and compensation | overselling is expensive but sometimes tolerated |
| username registration | CP | uniqueness needs one authority |
| shopping cart | AP, merge by union | losing an item annoys users more than a stale view |
| likes, view counts | AP | approximate is fine |
| chat messages | AP within a conversation's region, ordered by the server | delivery matters more than instant global order |

#### Misreadings to avoid

- "Pick two of three": partitions aren't optional, so a distributed system can't "choose CA".
- "AP means no consistency": AP systems are usually **eventually consistent**, often with session guarantees like read-your-writes.
- "CP means unavailable": only the minority side (or requests needing it) fails during a partition; the majority keeps working.

Connects to: CAP theorem (the DBMS view), PACELC, consistency models, quorums, consensus basics, CRDTs in collaborative document editing.

### questions
Q: What does the CAP theorem say?
A: When a network partition separates replicas, a distributed system can't be both consistent, meaning every read sees the latest write, and available, meaning every working node answers every request. Because partitions happen, systems choose per partition whether to refuse some requests (CP) or keep serving possibly stale or conflicting data (AP).

Q: Why is "choose two of C, A and P" misleading?
A: Partitions are not optional in a distributed system; the network will fail sometimes. So the decision is only what to do when one occurs: stay consistent by refusing some requests, or stay available and reconcile later. Without a partition, a system can be both consistent and available.

Q: Give examples of features that should be CP and AP.
A: CP: payments, account balances, inventory for the last units, unique usernames, locks, where a wrong answer is worse than an error. AP: shopping carts, likes, feeds, presence and analytics, where staying responsive matters more and differences can be merged later.

Q: How do AP systems reconcile divergent replicas after a partition?
A: With last-write-wins timestamps (simple but can drop updates), version vectors to detect conflicts and merge or ask the application, or data types designed to merge automatically such as CRDTs, for example set union for a cart.

## sysd.distributed.pacelc
name: "PACELC"
importance: important
prereqs: [sysd.distributed.cap-theorem-in-practice]
scope: "latency vs consistency when there is no partition"

### simple
PACELC extends CAP with the everyday case: if there is a Partition, choose Availability or Consistency; Else, when everything is fine, choose Latency or Consistency. Even with a healthy network, making every copy agree before answering takes extra time, so fast systems often answer before all copies have caught up. It is like replying to an email immediately versus waiting until every colleague has confirmed.

### interview
- **P → A or C**: the CAP choice during partitions. **E → L or C**: in normal operation, waiting for replicas (synchronous replication, quorum reads) costs latency; not waiting risks stale reads.
- The else case matters more day to day: partitions are rare, but every request pays the latency choice.
- Classifications from Abadi's 2012 paper: Dynamo, Cassandra and Riak are **PA/EL**; fully consistent systems like VoltDB and Megastore are **PC/EC** (BigTable and HBase are commonly placed there too); MongoDB was classed **PA/EC**; Yahoo's PNUTS **PC/EL**. Google Spanner is usually described as PC/EC.
- Tunable systems move per request: Cassandra with `ONE` is EL, with `QUORUM` reads and writes it pays latency for consistency.
- Geography amplifies it: a synchronous write across continents adds a round trip of about 100 ms or more.

### deep
#### Where latency comes from

A write acknowledged after one local replica takes about a millisecond. Waiting for a second replica in another zone adds a zone round trip (about 1 ms); in another region, 50 to 150 ms. Reads have the same shape: reading one nearby replica is fast but may be stale, while reading a quorum or the leader in another region costs a round trip. PACELC names this trade.

| configuration | write latency | read latency | stale reads possible? |
|---|---|---|---|
| async replication, read any replica | lowest | lowest | yes (EL) |
| sync to one other zone, read leader | + a zone round trip | leader's distance | no (EC) |
| quorum writes and reads (W + R > N) | wait for the W-th fastest | wait for the R-th fastest | no, barring edge cases (EC) |
| sync across regions (Spanner-style) | + a region round trip, plus clock-uncertainty wait | local for snapshot reads | no (EC) |

#### Reading the four letters

- **PA/EL** (Dynamo-style stores): always answer fast; conflicts and staleness are handled by the application. Good for carts, sessions, time series.
- **PC/EC** (Spanner, VoltDB, single-leader SQL with synchronous replicas): correct at all times, paying latency and refusing work in a partition. Good for money and inventory.
- **PA/EC**: consistent in normal operation, but prefers availability during partitions (MongoDB's historical classification, since an old primary could keep accepting writes that were later rolled back).
- **PC/EL**: rare; fast and possibly stale normally, but refuses under partition (PNUTS).

#### In an interview

After the CAP answer, add the else case: "Normally there's no partition, so the real question is whether a read must reflect every write. For the product catalog, I'll read the nearest replica (EL): a few seconds of staleness is fine. For the order status the user just changed, I'll read from the leader (EC) to guarantee read-your-writes."

Connects to: CAP theorem in practice, consistency models, quorums, replication in practice, latency vs throughput trade-offs.

### questions
Q: What does PACELC add to CAP?
A: CAP only covers behavior during a partition. PACELC adds that when there is no partition, a system still trades latency against consistency: making replicas agree before answering costs time, and answering immediately risks stale reads.

Q: Why does the "else" part matter more in daily operation?
A: Partitions are rare, but every normal request pays for the latency-versus-consistency choice. Synchronous replication or quorum reads add round trips to each operation, which dominates user-perceived performance, especially across regions.

Q: How would you classify Cassandra under PACELC?
A: By default it is PA/EL: during partitions it keeps accepting reads and writes, and normally it favors low latency with small consistency levels. Because consistency levels are tunable per query, using QUORUM for both reads and writes makes those operations behave closer to EC at a latency cost.

Q: What latency does strong consistency across regions add?
A: At least one cross-region round trip per write, typically tens to over a hundred milliseconds, since a majority of replicas in different regions must acknowledge; systems like Spanner also wait out clock uncertainty. That is why many designs keep strongly consistent data within one region.

## sysd.distributed.consistency-models
name: "Consistency models"
importance: must
prereqs: [sysd.distributed.cap-theorem-in-practice]
scope: "strong, eventual, causal, read-your-writes"

### simple
A consistency model is a promise about what readers can see when data is copied to several places. The strongest promise makes the system behave like a single copy: every read sees the latest write. Weaker promises allow some staleness but guarantee sensible things, such as you always seeing your own changes, or never seeing a reply before the message it answers.

### interview
- **Strong (linearizable)**: every operation appears to take effect at one instant between its start and end; after a write completes, all reads see it. Needs coordination (a leader or consensus): higher latency, unavailable under partitions.
- **Sequential**: all nodes see operations in one agreed order that respects each client's own order, but not necessarily real time.
- **Causal**: operations that are causally related (a reply after the message it answers; a comment after the post) are seen in that order everywhere; unrelated ones may be seen in different orders. The strongest model that stays available under partitions.
- **Eventual**: if writes stop, replicas converge; in the meantime reads may return anything recent. Weakest and cheapest.
- **Session guarantees** make eventual consistency usable: **read-your-writes**, **monotonic reads** (never go back in time), **monotonic writes**, **writes follow reads**. Implement with sticky routing or by tracking versions.
- Match the model to the feature: linearizable for locks, uniqueness and balances; causal for comments and chat; eventual with session guarantees for profiles and feeds.

### deep
#### Session anomalies from replica lag

A user saves a new bio (version 2) on the leader. Replica A has caught up; replica B is still on version 1. Their next three page loads are spread over the replicas:

```cpp
struct Replica { string name; int version; };

int main() {
    const int written = 2;                          // the user's latest write
    Replica a{"replica-a", 2}, b{"replica-b", 1};
    vector<Replica*> spread = {&a, &b, &a};         // load balancer picks per request
    vector<Replica*> sticky = {&a, &a, &a};         // same replica for the whole session
    for (auto [label, reads] : {pair{"spread", spread}, pair{"sticky", sticky}}) {
        int last_seen = 0;
        bool ryw = true, monotonic = true;
        printf("%-6s reads:", label);
        for (Replica* r : reads) {
            printf(" %s=v%d", r->name.c_str(), r->version);
            if (r->version < written) ryw = false;       // missed their own write
            if (r->version < last_seen) monotonic = false; // went back in time
            last_seen = max(last_seen, r->version);
        }
        printf("\n       read-your-writes %s, monotonic reads %s\n", ryw ? "ok" : "broken",
               monotonic ? "ok" : "broken");
    }
}
```

Output:

```text
spread reads: replica-a=v2 replica-b=v1 replica-a=v2
       read-your-writes broken, monotonic reads broken
sticky reads: replica-a=v2 replica-a=v2 replica-a=v2
       read-your-writes ok, monotonic reads ok
```

With reads spread across replicas, the user sees their new bio, then the old one, then the new one again: both session guarantees break, though the system is "eventually consistent". Pinning the session to one replica fixes monotonic reads; read-your-writes is only safe here because replica A had caught up, so robust systems also check versions (route to a replica that has applied the user's last write, or to the leader).

#### The ladder of models

| model | guarantees | cost | typical use |
|---|---|---|---|
| linearizable | behaves like one copy, in real time | coordination on every operation; unavailable in a minority partition | locks, leader election, balances, uniqueness |
| sequential | one global order, per-client order kept | coordination | replicated state machines |
| causal | cause before effect everywhere | tracking dependencies (vector clocks) | comments, chat, collaborative apps |
| read-your-writes, monotonic reads | per-session sanity | routing or version checks | profiles, settings, feeds |
| eventual | convergence when writes stop | none | counters, analytics, caches |

#### Causal consistency in one example

Asha posts "I lost my ring"; Ravi replies "found it!". Under eventual consistency, Meera may see Ravi's reply before Asha's post, which reads as nonsense. Causal consistency forbids that: Ravi's reply depends on the post he read, so every replica shows the post first. Unrelated posts can still appear in different orders in different regions, which nobody notices. Implementations attach dependency information (vector clocks or explicit dependencies) to each write and delay showing a write until its dependencies have arrived.

Connects to: replication in practice, CAP theorem in practice, clocks and ordering, quorums, cache invalidation and consistency, isolation levels (the single-node counterpart).

### questions
Q: What is linearizability?
A: The strongest single-object consistency model: every operation appears to happen atomically at some instant between its invocation and completion, so once a write completes, every later read, from any client, returns it or something newer. It makes a replicated system behave like a single copy.

Q: What is the difference between eventual and causal consistency?
A: Eventual consistency only promises that replicas converge once writes stop; reads can show updates in any order meanwhile. Causal consistency also guarantees that causally related writes, like a reply and the message it answers, are seen in the same order by everyone, while unrelated writes may still differ.

Q: What are read-your-writes and monotonic reads?
A: Session guarantees on top of eventual consistency. Read-your-writes means a user always sees their own completed writes. Monotonic reads means a user never sees data older than what they already saw. Sticky routing to one replica or tracking the versions a session has seen implements them.

Q: How would you choose a consistency model for a feature?
A: Ask what goes wrong if a read is stale or out of order. If it can cause double spending, duplicate usernames or broken locks, use linearizable operations. If only order matters, as in conversations, use causal. If brief staleness is harmless, use eventual consistency plus session guarantees for the user's own data.

## sysd.distributed.quorums
name: "Quorums"
importance: important
prereqs: [sysd.distributed.consistency-models]
scope: "R + W > N"

### simple
With N copies of the data, a write can wait for W of them to confirm and a read can ask R of them. If R + W is bigger than N, every read group overlaps every write group in at least one copy, so a read always reaches someone who has the latest write. It is like asking enough people in a room that at least one of them must have heard the announcement.

### interview
- **N** replicas; a write succeeds after **W** acknowledgments; a read queries **R** replicas and takes the newest version (by version number or timestamp).
- **R + W > N** makes read and write sets overlap, so reads see the latest successful write. Common: N = 3, W = 2, R = 2. **W > N/2** also stops two conflicting writes from both succeeding.
- Tuning: W = N, R = 1 for read-heavy data (fast reads, writes blocked by any slow node); W = 1, R = N for write-heavy; R = W = 1 for speed without the overlap guarantee.
- **Latency**: a quorum waits for the W-th (or R-th) fastest reply, so it hides one slow replica but not two.
- **Sloppy quorums and hinted handoff**: during failures, write to other healthy nodes and hand the data back later; more available, but the overlap guarantee no longer holds.
- **Read repair** and anti-entropy (Merkle trees) bring stale replicas up to date.
- Quorums alone aren't full linearizability: concurrent writes, failed partial writes and clock-based versions leave edge cases; consensus protocols close them.

### deep
#### Checking the overlap exhaustively

With N = 3, a write reaches some W replicas and a later read asks some R. Enumerate every combination and count reads that miss the write entirely:

```cpp
int main() {
    const int n = 3;
    printf("W R  stale reads (of all write/read replica choices)\n");
    for (auto [w, r] : vector<pair<int, int>>{{1, 1}, {1, 2}, {2, 1}, {2, 2}, {3, 1}}) {
        int total = 0, stale = 0;
        for (int wmask = 0; wmask < (1 << n); ++wmask) {
            if (__builtin_popcount(wmask) != w) continue;
            for (int rmask = 0; rmask < (1 << n); ++rmask) {
                if (__builtin_popcount(rmask) != r) continue;
                ++total;
                if ((wmask & rmask) == 0) ++stale;           // no replica in common
            }
        }
        printf("%d %d  %d of %d%s\n", w, r, stale, total, w + r > n ? "   (R + W > N)" : "");
    }
}
```

Output:

```text
W R  stale reads (of all write/read replica choices)
1 1  6 of 9
1 2  3 of 9
2 1  3 of 9
2 2  0 of 9   (R + W > N)
3 1  0 of 3   (R + W > N)
```

Whenever R + W ≤ N, some choices of replicas miss the write; when R + W > N, none do, since two sets whose sizes add up to more than N must share a member (the pigeonhole principle). With W = 1, R = 1, a read misses the write two times in three.

#### Latency: waiting for the k-th fastest

Each replica usually answers in 2 ms but 5% of the time takes 50 ms (a garbage-collection pause, a busy disk). A quorum operation waits for the k-th fastest of 3:

```cpp
uint64_t s = 11;
uint64_t next_rand() {
    s += 0x9E3779B97F4A7C15ULL;
    uint64_t z = s;
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

int main() {
    const int trials = 100000;
    for (int k = 1; k <= 3; ++k) {
        vector<int> lat;
        s = 11;
        for (int t = 0; t < trials; ++t) {
            int r[3];
            for (int& x : r) x = next_rand() % 100 < 5 ? 50 : 2;
            sort(r, r + 3);
            lat.push_back(r[k - 1]);                  // wait for the k-th reply
        }
        sort(lat.begin(), lat.end());
        printf("wait for %d of 3: p50 %2d ms, p99 %2d ms\n", k, lat[trials / 2],
               lat[trials * 99 / 100]);
    }
}
```

Output:

```text
wait for 1 of 3: p50  2 ms, p99  2 ms
wait for 2 of 3: p50  2 ms, p99  2 ms
wait for 3 of 3: p50  2 ms, p99 50 ms
```

Waiting for all 3 means any slow replica makes the operation slow: that happens in about 14% of operations (1 − 0.95³), so the p99 is the slow case. Waiting for 2 of 3 is slow only when at least two replicas are slow together, about 0.7% of operations, so its p99 stays at 2 ms; waiting for 1 is slow only when all three are. That is the latency argument for W = 2 rather than W = 3, and for R = 1 when staleness is acceptable.

#### Sloppy quorums

If two of a key's three home replicas are down, a strict quorum write fails. Dynamo-style stores instead write to other healthy nodes with a "hint" naming the intended owner and replay it when the owner returns. Writes stay available, but a read quorum of the home replicas may not include the hinted copies, so reads can be stale until handoff completes.

Connects to: replication in practice, consistency models, consensus basics, Merkle trees (anti-entropy), key-value store, latency vs throughput trade-offs.

### questions
Q: Why does R + W > N give up-to-date reads?
A: A write is stored on W replicas and a read contacts R; if R + W exceeds N, the two sets must share at least one replica, so every read contacts a node holding the latest successful write and can pick it by version number.

Q: How would you choose W and R for a read-heavy workload with N = 3?
A: Keep R small for fast reads and W large enough to keep the overlap: W = 3 and R = 1 gives the fastest reads but any slow or failed replica blocks writes, so W = 2 and R = 2 is the common balanced choice. If some staleness is acceptable, R = 1 with W = 2 reads faster without the guarantee.

Q: How do quorums affect latency?
A: An operation waits for the W-th or R-th fastest replica, so a majority quorum tolerates one slow replica without waiting for it, while waiting for all replicas makes the slowest one decide. Larger quorums therefore raise tail latency.

Q: What is a sloppy quorum?
A: When the replicas that normally own a key are unreachable, writes go to other available nodes with a hint to hand the data back later. It keeps writes available during failures, but reads from the usual replicas may miss those writes until hinted handoff completes, so the R + W > N guarantee is lost.

## sysd.distributed.consensus-basics
name: "Consensus basics"
importance: important
scope: "leader election, Raft idea"

### simple
Consensus is how a group of machines agrees on one value, such as who the leader is or what the next entry in a shared log is, even if some of them crash. A decision counts once a majority agrees, so any two majorities share a member and can't decide differently. It is like a committee that only acts on majority votes, so two rival decisions can never both pass.

### interview
- Consensus lets nodes agree on a sequence of values despite crashes and message delays; it underpins leader election, replicated logs, configuration stores and locks (etcd, ZooKeeper, Consul).
- Needs a **majority** (quorum): with 2f + 1 nodes it tolerates f failures (3 nodes survive 1 crash, 5 survive 2). A minority partition can't make progress, by design.
- **Raft**: time is divided into **terms**; each term has at most one leader. A follower that hears nothing for a randomized **election timeout** becomes a candidate, votes for itself and asks others; a candidate with a majority of votes becomes leader. Nodes vote once per term, and only for candidates whose log is at least as up to date as theirs.
- **Log replication**: the leader appends client commands to its log and sends them to followers; an entry is **committed** once stored on a majority, then applied to each node's state machine in order.
- Paxos is the classic equivalent; Raft was designed to be easier to understand. Zab (ZooKeeper) is similar.
- Cost: a round trip to a majority per write, and the leader is a throughput bottleneck, so use consensus for small, critical metadata (who leads, which config, which lock) rather than all data.

### deep
#### An election and a commit, step by step

Five nodes start as followers with randomized election timeouts. The first to time out becomes a candidate for term 1:

```cpp
int main() {
    const int n = 5;
    vector<int> timeout_ms = {230, 157, 298, 201, 265};  // randomized per node
    vector<bool> alive = {true, true, true, true, true};
    int candidate = min_element(timeout_ms.begin(), timeout_ms.end()) - timeout_ms.begin();
    int term = 1;
    printf("t=%dms node %d times out, becomes candidate for term %d\n",
           timeout_ms[candidate], candidate, term);

    int votes = 1;                                   // votes for itself
    for (int i = 0; i < n; ++i)
        if (i != candidate && alive[i]) ++votes;     // everyone else is still waiting: grant
    printf("node %d gets %d of %d votes -> %s\n", candidate, votes, n,
           votes > n / 2 ? "leader" : "no leader");

    alive[3] = alive[4] = false;                     // two followers crash
    vector<vector<string>> logs(n);
    logs[candidate].push_back("set x=1");            // a client command reaches the leader
    int acks = 1;
    for (int i = 0; i < n; ++i)
        if (i != candidate && alive[i]) { logs[i].push_back("set x=1"); ++acks; }
    printf("entry stored on %d of %d nodes -> %s\n", acks, n,
           acks > n / 2 ? "committed" : "not committed");

    alive[2] = false;                                // a third node crashes
    logs[candidate].push_back("set x=2");
    acks = 1;
    for (int i = 0; i < n; ++i)
        if (i != candidate && alive[i]) { logs[i].push_back("set x=2"); ++acks; }
    printf("entry stored on %d of %d nodes -> %s\n", acks, n,
           acks > n / 2 ? "committed" : "not committed (waits for a majority)");
}
```

Output:

```text
t=157ms node 1 times out, becomes candidate for term 1
node 1 gets 5 of 5 votes -> leader
entry stored on 3 of 5 nodes -> committed
entry stored on 2 of 5 nodes -> not committed (waits for a majority)
```

This sketch leaves out most of Raft (heartbeats, log matching, retries), but shows the two majority rules. With two of five nodes down, the leader and two followers are still a majority, so `x=1` commits. With three down, `x=2` reaches only two nodes and must wait: committing it could conflict with a decision the other three might make later. The randomized timeouts matter because if two nodes timed out together, they would split the votes, both fail, and try again after new random timeouts.

#### Why majorities are safe

Any two majorities of the same group overlap in at least one node. A node votes at most once per term, so two leaders can't be elected in one term. A committed entry sits on a majority, and a candidate needs votes from a majority, which includes a node holding that entry, which refuses to vote for a candidate whose log is behind. So a new leader always has every committed entry.

#### Where consensus sits in a design

```text
app servers --> etcd / ZooKeeper (3 or 5 nodes, Raft or Zab)
                  stores: who is the database leader, config, locks, service registry
database   --> its own replication, with failover decided through the consensus store
```

Keep the consensus cluster small (3 or 5 nodes; more nodes make every write wait for more replies) and give it only small, critical data.

Connects to: replication in practice, distributed locks and leases, quorums, redundancy and failover, clocks and ordering.

### questions
Q: What problem does a consensus algorithm solve?
A: Getting a group of nodes to agree on the same value or the same ordered log of commands, even when some nodes crash or messages are delayed, so they can act as one reliable replicated state machine. It is used for leader election, configuration, locks and metadata.

Q: How does Raft elect a leader?
A: A follower that doesn't hear from a leader within a randomized election timeout increments the term, becomes a candidate, votes for itself and requests votes. Each node grants at most one vote per term, only to candidates whose log is at least as up to date; a candidate with a majority becomes leader and sends heartbeats. Randomized timeouts make split votes rare.

Q: When is a log entry committed in Raft?
A: When the leader has replicated it to a majority of nodes in its current term. Then it can be applied to the state machine and acknowledged to the client, and any future leader is guaranteed to have it.

Q: Why do consensus clusters use an odd number of nodes, such as 3 or 5?
A: A cluster of 2f + 1 tolerates f failures; adding a node to make it even raises the majority size without tolerating more failures. For example, 4 nodes still tolerate only 1 failure, like 3, but every write must wait for 3 acknowledgments instead of 2.

## sysd.distributed.distributed-locks-and-leases
name: "Distributed locks and leases"
importance: important
prereqs: [sysd.distributed.consensus-basics]
scope: "Distributed locks and leases"

### simple
A distributed lock lets only one machine at a time do something, such as process a given job, across a whole cluster. Because a machine holding a lock might crash, locks are granted as leases that expire after a set time unless renewed. The danger is a machine that freezes, loses its lease without knowing, and then wakes up and acts as if it still held it.

### interview
- Uses: one worker per job or partition, a single scheduler instance, leader election, protecting a shared resource.
- A **lease** is a lock with a time limit; the holder renews it periodically. If the holder crashes, the lease expires and someone else can take it.
- **The pause problem**: a holder can be paused (garbage collection, VM migration, a slow disk) past its lease expiry, while another node acquires the lease; when it resumes, both believe they hold the lock.
- **Fencing tokens** fix it: each grant comes with a monotonically increasing token; the protected resource rejects writes carrying a token lower than one it has already seen.
- Implementations: **etcd** or **ZooKeeper** (consensus-backed, with leases or ephemeral nodes and revision numbers usable as fencing tokens); **Redis** `SET key value NX PX ttl` (fast, fine for efficiency locks, but asynchronous replication can lose a lock on failover; the Redlock algorithm is debated).
- Distinguish **efficiency** locks (duplicate work is only wasteful) from **correctness** locks (duplicates corrupt data): the latter need consensus-backed locks plus fencing.
- Clocks: lease expiry depends on timing assumptions; keep leases well above clock drift and pause lengths, and never rely on synchronized wall clocks for safety.

### deep
#### The paused lock holder and fencing tokens

```cpp
struct LockService {                         // e.g. etcd: grants carry an increasing token
    long next_token = 33;
    string holder;
    long expires_at = 0;
    optional<long> acquire(const string& who, long now, long ttl) {
        if (!holder.empty() && now < expires_at) return nullopt;   // still held
        holder = who;
        expires_at = now + ttl;
        return next_token++;
    }
};

struct Storage {                             // the protected resource checks tokens
    long highest_token_seen = 0;
    string data = "v0";
    bool fencing;
    bool write(const string& who, long token, const string& value) {
        if (fencing && token < highest_token_seen) {
            printf("  storage rejects %s's write (token %ld < %ld)\n", who.c_str(), token,
                   highest_token_seen);
            return false;
        }
        highest_token_seen = max(highest_token_seen, token);
        data = value;
        return true;
    }
};

int main() {
    for (bool fencing : {false, true}) {
        printf("%s fencing:\n", fencing ? "with" : "without");
        LockService locks;
        Storage storage{0, "v0", fencing};
        long t1 = *locks.acquire("client-1", 0, 10000);          // lease for 10 s
        printf("  t=0s    client-1 gets the lease, token %ld, then pauses (GC)\n", t1);
        long t2 = *locks.acquire("client-2", 12000, 10000);      // lease expired at 10 s
        printf("  t=12s   client-2 gets the lease, token %ld, writes\n", t2);
        storage.write("client-2", t2, "written by client-2");
        printf("  t=15s   client-1 wakes up, still believes it holds the lock, writes\n");
        storage.write("client-1", t1, "written by client-1");
        printf("  final data: %s\n", storage.data.c_str());
    }
}
```

Output:

```text
without fencing:
  t=0s    client-1 gets the lease, token 33, then pauses (GC)
  t=12s   client-2 gets the lease, token 34, writes
  t=15s   client-1 wakes up, still believes it holds the lock, writes
  final data: written by client-1
with fencing:
  t=0s    client-1 gets the lease, token 33, then pauses (GC)
  t=12s   client-2 gets the lease, token 34, writes
  t=15s   client-1 wakes up, still believes it holds the lock, writes
  storage rejects client-1's write (token 33 < 34)
  final data: written by client-2
```

Without fencing, client 1's stale write silently overwrote client 2's: the lock failed to protect the data, and no one noticed. With fencing, the storage remembered the highest token it had seen and refused the older one. Client 1 couldn't have prevented this itself: checking "do I still hold the lease?" just before writing still leaves a window for a pause between the check and the write. The protected resource must do the check.

#### Choosing a lock service

| service | how it grants | good for |
|---|---|---|
| etcd, ZooKeeper, Consul | consensus; leases or sessions; revision or zxid as a fencing token | correctness-critical locks, leader election |
| Redis `SET NX PX` | one node (or several with Redlock) | efficiency locks: avoid doing the same work twice |
| database row lock or advisory lock | the database's own locks | work already inside that database's transactions |

#### Practical rules

- Set the lease long enough to survive normal pauses, renew at about a third of its length, and stop working when renewal fails.
- Release with a check that you still own it (compare the stored value before deleting).
- Prefer designs that avoid locks: partition work so each item has one owner, or make operations idempotent so duplicates are harmless.

Connects to: consensus basics, mutexes and lock guards, clocks and ordering, Redis and Memcached, idempotency and exactly-once myths.

### questions
Q: Why are distributed locks implemented as leases?
A: A lock holder can crash or be cut off without releasing the lock; a lease expires after a set time unless renewed, so the system recovers without manual intervention. The cost is that a holder that is merely slow can lose the lease without noticing.

Q: What is a fencing token?
A: A number that increases with every lock grant, passed along with every operation on the protected resource. The resource remembers the highest token it has seen and rejects operations with older tokens, so a former holder that resumes after a pause can't corrupt data.

Q: Is Redis a safe distributed lock?
A: A single Redis SET with NX and an expiry is fine when the lock only prevents duplicate work. For correctness, it is weaker: replication is asynchronous, so a failover can lose a granted lock, and it offers no natural fencing token. Consensus-based stores like etcd or ZooKeeper plus fencing are the safer choice.

Q: How can you avoid needing a distributed lock at all?
A: Partition the work so each key or job has exactly one owner (for example by consistent hashing or queue partitions), make operations idempotent so repeating them is harmless, or use conditional writes such as compare-and-set on a version in the database.

## sysd.distributed.clocks-and-ordering
name: "Clocks and ordering"
importance: advanced
prereqs: [sysd.distributed.consistency-models]
scope: "logical clocks, vector clocks"

### simple
Different machines' clocks never agree exactly, so timestamps can't reliably say which of two events on different machines happened first. Logical clocks count events instead of reading the time: a Lamport clock gives every event a number that respects cause and effect, and a vector clock can even tell when two events happened independently. It is like numbering letters in a conversation instead of trusting the postmarks.

### interview
- **Physical clocks drift** (tens of parts per million) and are corrected by NTP, which can make them jump forwards or backwards; skew between machines is often milliseconds. Never order events across machines by wall-clock time where correctness matters.
- **Happens-before**: a before b if they're in the same process in that order, or a is a send and b the receive of that message, or by transitivity. Otherwise they are **concurrent**.
- **Lamport clocks**: a counter per process; increment on every event; send it with messages; on receive, set to max(own, received) + 1. If a happened before b then L(a) < L(b), but not the reverse. Gives a total order (break ties by process id) consistent with causality.
- **Vector clocks**: one counter per process. Compare element-wise: a before b if every element ≤ and one <; otherwise concurrent. Detect conflicts in Dynamo-style stores (version vectors) and enforce causal delivery.
- **Hybrid logical clocks** combine physical time with a logical counter (CockroachDB); **TrueTime** (Spanner) exposes clock uncertainty bounds and waits them out.
- Last-write-wins with wall clocks silently drops updates when clocks are skewed.

### deep
#### Vector clocks on three processes

```cpp
using VC = array<int, 3>;

string show(const VC& v) { return "[" + to_string(v[0]) + "," + to_string(v[1]) + "," +
                                   to_string(v[2]) + "]"; }

string compare(const VC& a, const VC& b) {
    bool le = true, ge = true;
    for (int i = 0; i < 3; ++i) { le &= a[i] <= b[i]; ge &= a[i] >= b[i]; }
    if (le && !ge) return "happened before";
    if (ge && !le) return "happened after";
    if (le && ge) return "is the same as";
    return "is concurrent with";
}

int main() {
    VC p[3] = {};                                    // one clock per process
    auto local = [&](int i) { ++p[i][i]; return p[i]; };
    auto send = [&](int i) { return local(i); };      // the message carries the clock
    auto receive = [&](int i, const VC& msg) {
        for (int k = 0; k < 3; ++k) p[i][k] = max(p[i][k], msg[k]);
        return local(i);
    };

    VC a = local(0);          // P0: Asha writes a post
    VC m = send(0);           // P0 sends it to P1
    VC b = receive(1, m);     // P1 receives it
    VC c = local(1);          // P1: Ravi replies
    VC d = local(2);          // P2: Meera posts, knowing nothing of the others
    printf("a=%s b=%s c=%s d=%s\n", show(a).c_str(), show(b).c_str(), show(c).c_str(),
           show(d).c_str());
    printf("a %s c\n", compare(a, c).c_str());
    printf("b %s a\n", compare(b, a).c_str());
    printf("c %s d\n", compare(c, d).c_str());
}
```

Output:

```text
a=[1,0,0] b=[2,1,0] c=[2,2,0] d=[0,0,1]
a happened before c
b happened after a
c is concurrent with d
```

Each vector entry counts the events of one process that this event "knows about". Ravi's reply `c` = [2,2,0] includes Asha's two events, because her message carried her clock to P1, so `a` ≤ `c` in every entry and `a` happened before `c`. Meera's post `d` = [0,0,1] knows nothing of P0 or P1, and `c` knows nothing of P2: neither vector is ≤ the other, so they are concurrent. A replicated store that finds two versions with concurrent vector clocks knows it has a real conflict to merge; one whose clock dominates can simply replace the other.

#### Lamport clocks, the lighter version

Keep one counter per process instead of a vector: increment on each event, send it along, and on receive take max(own, received) + 1. In the run above the Lamport timestamps would be a = 1, the send 2, b = 3, c = 4 and d = 1. Causality is respected (a < c), but d = 1 < c = 4 only *looks* like an order: Lamport timestamps can't tell concurrent events from ordered ones. They are enough for a consistent total order (sort by timestamp, then process id), for example to order operations in a replicated log.

#### Physical time, used carefully

- **Skew**: two servers' clocks commonly differ by milliseconds; NTP corrections can step a clock backwards.
- **Last write wins** by wall-clock timestamp drops the write from the server with the slower clock, even if it came later in real time.
- **Hybrid logical clocks** keep a timestamp close to physical time but bump a logical counter when needed, so causality holds even under skew.
- **TrueTime** (Spanner) reports an interval [earliest, latest] for the current time; a transaction waits until its timestamp is certainly in the past before committing, which gives externally consistent ordering at the cost of a few milliseconds.

Connects to: consistency models, CAP theorem in practice, distributed locks and leases, collaborative document editing, Lamport timestamps.

### questions
Q: Why can't you order events across machines by their timestamps?
A: Each machine's clock drifts and is corrected by NTP at different moments, so clocks disagree by milliseconds or more and can even move backwards. An event that happened later can carry an earlier timestamp, so ordering by wall-clock time can invert cause and effect or drop updates under last-write-wins.

Q: What is a Lamport clock?
A: A per-process counter incremented on every event and sent with every message; a receiver sets its counter to the maximum of its own and the received value, plus one. If event a happened before event b, a's timestamp is smaller, so sorting by (timestamp, process id) gives a total order consistent with causality.

Q: What can vector clocks tell you that Lamport clocks can't?
A: Whether two events are concurrent. Lamport timestamps order causally related events correctly but give concurrent events arbitrary orders; vector clocks compare element-wise, so if neither vector dominates the other, the events are concurrent, which is how conflicting replica updates are detected.

Q: What are hybrid logical clocks?
A: Timestamps combining physical time with a logical counter: they stay close to wall-clock time, so they are meaningful to humans and usable for snapshots, while the logical part preserves causality when clocks are skewed or events share a millisecond.

## sysd.distributed.distributed-transactions-in-practice
name: "Distributed transactions in practice"
importance: advanced
scope: "sagas, outbox pattern"

### simple
When one business action changes data in several services or databases, like placing an order that reserves stock and charges a card, you can't wrap it all in one ordinary transaction. Two-phase commit makes everyone vote before committing but can get stuck; sagas instead run a series of local steps and undo earlier ones if a later one fails. The outbox pattern makes sure "save the data" and "tell the others" never get out of step.

### interview
- **Two-phase commit (2PC)**: a coordinator asks all participants to prepare (vote), then tells them to commit or abort. Atomic, but **blocking**: if the coordinator dies after the votes, participants hold locks until it recovers. Used inside databases (XA, distributed SQL), rarely across microservices.
- **Sagas**: a sequence of local transactions, each with a **compensating action** (refund the charge, release the stock). Failure midway runs compensations for completed steps. Not isolated: others can see intermediate states, so design for it (pending statuses, semantic locks).
- **Orchestration** (a central saga coordinator tells each service what to do) vs **choreography** (services react to each other's events). Orchestration is easier to follow and change; choreography has less coupling but scatters the flow.
- **Dual-write problem**: writing to the database and publishing an event are two separate actions; a crash between them loses the event (or publishes one for a rolled-back change).
- **Transactional outbox**: write the event into an `outbox` table in the **same local transaction** as the data change; a relay (polling or change data capture) publishes outbox rows and marks them sent. Delivery is at-least-once, so consumers must be idempotent.
- Prefer designs that keep a business action inside one service's database when possible.

### deep
#### The dual-write problem and the outbox

An order service saves an order and must tell the shipping service. The process crashes right after committing the order:

```cpp
struct Db {
    vector<string> orders;
    vector<pair<int, string>> outbox;          // (event id, event), unsent rows
};
struct Broker { vector<pair<int, string>> delivered; };

int main() {
    // 1. Dual write: commit, then publish as a separate step
    {
        Db db; Broker broker;
        db.orders.push_back("order 17");       // COMMIT succeeds
        bool crashed = true;                    // process dies before publishing
        if (!crashed) broker.delivered.push_back({1, "OrderPlaced 17"});
        printf("dual write: orders=%zu, events delivered=%zu -> shipping never hears\n",
               db.orders.size(), broker.delivered.size());
    }
    // 2. Outbox: the event row is written in the same transaction as the order
    {
        Db db; Broker broker;
        db.orders.push_back("order 17");       // one local transaction:
        db.outbox.push_back({1, "OrderPlaced 17"});   // order + outbox row commit together
        // the service crashes here; later the relay runs
        auto relay = [&](bool crash_before_marking) {
            for (auto& e : db.outbox) broker.delivered.push_back(e);   // publish
            if (!crash_before_marking) db.outbox.clear();              // mark as sent
        };
        relay(true);                            // relay publishes, then crashes
        relay(false);                           // relay restarts and publishes again
        set<int> seen;                          // idempotent consumer: dedupe by event id
        int applied = 0;
        for (auto& [id, e] : broker.delivered) if (seen.insert(id).second) ++applied;
        printf("outbox: orders=%zu, events delivered=%zu, applied by consumer=%d\n",
               db.orders.size(), broker.delivered.size(), applied);
    }
}
```

Output:

```text
dual write: orders=1, events delivered=0 -> shipping never hears
outbox: orders=1, events delivered=2, applied by consumer=1
```

With dual writes, the order exists but the event is lost forever. With the outbox, the event can't be lost, because it committed atomically with the order; the relay may publish it twice (it crashed before recording that it had sent it), so the consumer deduplicates by event id and applies it once. "At-least-once delivery plus idempotent consumers" is the practical form of exactly-once.

#### A saga with compensation

Placing an order: (1) create the order as pending, (2) reserve stock, (3) charge the card, (4) mark the order confirmed. If the charge fails, compensate in reverse: release the stock, then mark the order cancelled. Each step and compensation is a local transaction plus an outbox event, and each must be idempotent because the orchestrator may retry it. Compensations are business actions (a refund, a release), not database rollbacks, and some steps can't be undone (an email already sent), so put them last.

#### When to use what

| situation | approach |
|---|---|
| data in one database | a normal transaction: avoid distributing it |
| several databases in one trusted system, short transactions | 2PC (XA) or a distributed SQL database |
| several services owning their data | saga + outbox + idempotent consumers |
| publish an event whenever data changes | outbox, or change data capture on the table itself |

Connects to: two-phase commit, sagas (the DBMS view), idempotency and exactly-once myths, message queues, publish-subscribe and event-driven architecture, payment system.

### questions
Q: Why is two-phase commit rarely used between microservices?
A: It couples services tightly, requires every participant to support prepare and commit, holds locks across network round trips, and blocks participants if the coordinator fails after they voted. Services usually prefer sagas with compensating actions and eventual consistency.

Q: What is a saga?
A: A long-running business transaction split into a sequence of local transactions, each committed by one service. If a step fails, previously completed steps are undone by compensating transactions, such as a refund or a stock release. Sagas give eventual consistency without distributed locks but aren't isolated.

Q: What is the transactional outbox pattern?
A: A service writes the event describing a change into an outbox table in the same database transaction as the change itself; a separate relay reads the outbox and publishes the events, marking them sent. It solves the dual-write problem, since the data change and the event commit or fail together.

Q: Why must consumers of outbox events be idempotent?
A: The relay can publish an event and crash before recording that it was sent, so after a restart it publishes it again. Consumers must detect duplicates, for example by storing processed event ids, so repeated delivery has the effect of a single one.
