---
topic: dbms.transactions
name: "Transactions"
subject: dbms
order: 5
prereqs: [dbms.relational]
---

## dbms.transactions.acid-properties
name: "ACID properties"
importance: must
scope: "atomicity, consistency, isolation, durability with examples"

### simple
A transaction is a group of database changes that must succeed or fail as one unit, like moving money from one account to another. ACID names its four promises: all or nothing, the rules stay true, people working at the same time do not see each other's half-finished work, and once done it stays done even if the power fails. It is like a notary witnessing a signed contract: either the whole deal is recorded, or none of it is.

### interview
- **Atomicity**: all operations of a transaction happen or none do; on failure or `ROLLBACK`, partial changes are undone (using an undo log or old versions).
- **Consistency**: a transaction moves the database from one valid state to another: constraints (keys, foreign keys, checks) and application invariants hold at commit. The database enforces declared constraints; the application must write correct transactions.
- **Isolation**: concurrent transactions do not interfere; ideally the result equals some serial order. Real systems offer **isolation levels** trading safety for speed.
- **Durability**: once committed, changes survive crashes: the commit record is forced to the **write-ahead log** on stable storage (fsync) before success is reported; replication adds protection against machine loss.
- Example: a transfer debits A and credits B in one transaction; a crash between the two leaves neither applied; a concurrent report sees before or after, never halfway.
- Mechanisms: logging and recovery give A and D, concurrency control (locks, MVCC) gives I, constraints plus correct code give C.

### deep
#### Intuition

A transfer is two updates. Without transactions, a crash, an error or another user can catch the database between them. ACID makes the pair behave like one indivisible, permanent step that nobody can observe halfway.

#### In SQL

```sql
CREATE TABLE accounts (
    owner   VARCHAR(20) PRIMARY KEY,
    balance INT NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('asha', 500), ('ravi', 300);

BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE owner = 'asha';
UPDATE accounts SET balance = balance + 100 WHERE owner = 'ravi';
COMMIT;

BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE owner = 'asha';   -- violates the CHECK
ROLLBACK;

SELECT owner, balance FROM accounts ORDER BY owner;
```

The result is Asha 400 and Ravi 400. The second transaction's update failed the `CHECK`, and in PostgreSQL the whole transaction is then aborted: nothing it did survives.

#### Code: atomicity with an undo log

```cpp
struct Database {
    map<string, int> data;
    vector<pair<string, int>> undo;                  // old values written by the open transaction

    void begin() { undo.clear(); }
    void write(const string& key, int value) {
        undo.push_back({key, data[key]});            // remember the old value first
        data[key] = value;
    }
    void commit() { undo.clear(); }
    void rollback() {                                // restore in reverse order
        for (auto it = undo.rbegin(); it != undo.rend(); ++it) data[it->first] = it->second;
        undo.clear();
    }
};

bool transfer(Database& db, const string& from, const string& to, int amount) {
    db.begin();
    db.write(from, db.data[from] - amount);
    if (db.data[from] < 0) {                         // the invariant would break: undo
        db.rollback();
        return false;
    }
    db.write(to, db.data[to] + amount);
    db.commit();
    return true;
}

int main() {
    Database db;
    db.data = {{"asha", 500}, {"ravi", 300}};
    for (int amount : {100, 1000}) {
        bool ok = transfer(db, "asha", "ravi", amount);
        cout << "transfer " << amount << (ok ? " committed" : " rolled back") << ": asha "
             << db.data["asha"] << ", ravi " << db.data["ravi"] << "\n";
    }
}
```

Output:

```text
transfer 100 committed: asha 400, ravi 400
transfer 1000 rolled back: asha 400, ravi 400
```

The failed transfer had already written Asha's new balance (-600) before the check failed; the undo log put the old value back, so the total stays 800.

#### What each property protects against

| property | failure it handles | how databases provide it |
|---|---|---|
| atomicity | error or crash mid-transaction | undo log or multi-version storage |
| consistency | invalid data | constraints, triggers, correct transaction code |
| isolation | concurrent transactions interfering | locking, MVCC, isolation levels |
| durability | crash after commit | write-ahead log forced to disk at commit, replication |

#### Pitfalls

- Thinking consistency is automatic: the database checks declared rules, but a transfer that credits the wrong account is still "consistent".
- Assuming the default isolation level is serializable: PostgreSQL defaults to read committed and MySQL InnoDB to repeatable read.
- Durability settings: turning off synchronous commit or fsync for speed trades away the D.
- Long transactions hold locks or old versions and hurt everyone else; keep them short and never wait for user input inside one.

Connects to: transaction states, schedules and serializability, isolation levels, logs and write-ahead logging, integrity constraints.

### questions
Q: Explain the ACID properties with a bank transfer.
A: Atomicity: the debit and credit both happen or neither does. Consistency: balances never go negative and money is neither created nor lost. Isolation: a concurrent report sees the accounts before or after the transfer, never in between. Durability: once the bank confirms the transfer, it survives a crash or power loss.

Q: How does a database guarantee atomicity and durability?
A: Through logging. Before changes are applied, log records describing them are written; at commit, the commit record is forced to stable storage. After a crash, recovery redoes committed transactions whose changes did not reach disk and undoes changes of transactions that never committed.

Q: Who is responsible for the C in ACID?
A: Both. The database enforces declared constraints such as keys, foreign keys and checks, and rejects transactions that violate them. The application is responsible for writing transactions that preserve business invariants the database does not know about.

Q: Does isolation mean transactions run one after another?
A: No, they run concurrently, but under serializable isolation the outcome is equivalent to some serial order. Weaker isolation levels allow some anomalies in exchange for more concurrency, and most databases do not use serializable by default.

Q: What happens to an open transaction if the database crashes?
A: It is treated as uncommitted. During recovery, any of its changes that reached disk are undone using the log, so the database comes back as if the transaction had never started.

## dbms.transactions.transaction-states
name: "Transaction states"
importance: important
prereqs: [dbms.transactions.acid-properties]
scope: "active, partially committed, committed, failed, aborted"

### simple
A transaction passes through a few states from start to finish: it is active while running, partially committed after its last step, and committed once its changes are safely recorded. If something goes wrong it becomes failed and then aborted, with all its changes undone. It is like an online order: placed, being processed, confirmed, or cancelled and refunded.

### interview
- **Active**: executing reads and writes.
- **Partially committed**: the last statement has run, but the commit is not yet durable (the log still has to reach disk, deferred constraints still have to be checked).
- **Committed**: the commit record is on stable storage; the changes are permanent and visible to others (depending on isolation).
- **Failed**: an error, a constraint violation, a deadlock victim choice, or a crash stops normal execution.
- **Aborted**: rollback has undone all changes; the system may **restart** the transaction (if the cause was temporary, such as a deadlock) or **kill** it (a logic error).
- Committed and aborted are the two **terminated** states. A committed transaction can only be reversed by a new **compensating** transaction.

### deep
#### The diagram

```text
             last statement              log forced to disk
  active ──────────────────> partially ─────────────────────> committed
    │                        committed
    │ error, deadlock,            │ commit fails (deferred constraint,
    │ user ROLLBACK               │ disk error)
    v                             v
  failed <────────────────────────┘
    │ rollback done
    v
  aborted  ──> restart (new attempt) or kill
```

#### Worked example

| moment | state | what the system does |
|---|---|---|
| `BEGIN`, first `UPDATE` | active | writes log records and changes pages in memory |
| last `UPDATE` finished, `COMMIT` sent | partially committed | checks deferred constraints, writes the commit record |
| commit record flushed | committed | reports success; locks are released |
| (alternative) deadlock detected | failed | picks this transaction as the victim |
| undo complete | aborted | returns an error; the application retries |

Applications see only "commit succeeded" or an error. A connection lost after `COMMIT` was sent but before the reply arrived leaves the outcome unknown to the client, which is why idempotent operations and unique request ids matter.

Connects to: ACID properties, recoverable schedules, logs and write-ahead logging, deadlocks in databases.

### questions
Q: What are the states of a transaction?
A: Active while executing; partially committed after its final statement but before the commit is durable; committed once the commit record is on stable storage; failed when an error stops it; and aborted after its changes have been rolled back. Committed and aborted are terminal.

Q: What is the difference between partially committed and committed?
A: In the partially committed state all statements have run but the commit is not yet permanent: the log may still be in memory and deferred checks may still fail. Committed means the commit record has been forced to stable storage, so the changes will survive a crash.

Q: What can the system do after a transaction aborts?
A: Restart it as a new transaction if the failure was not caused by its own logic, such as a deadlock or a timeout, or kill it if the error is inherent, such as bad input or a constraint violation the transaction will always hit.

Q: How do you undo a committed transaction?
A: You cannot roll it back; its changes are permanent. You run a new compensating transaction that reverses its effects, such as a refund for a payment.

## dbms.transactions.schedules-and-serializability
name: "Schedules and serializability"
importance: must
prereqs: [dbms.transactions.acid-properties]
scope: "conflict serializability, precedence graphs"

### simple
When transactions run at the same time, their steps interleave, and the order they actually happen in is called a schedule. A schedule is safe, or serializable, if its result is the same as running the transactions one after another in some order. You can check this by drawing arrows between transactions whose steps clash and looking for a loop.

### interview
- A **schedule** is an interleaving of transactions' operations that keeps each transaction's own order. **Serial**: one transaction at a time. **Serializable**: equivalent to some serial schedule.
- Two operations **conflict** if they belong to different transactions, touch the **same item**, and at least one is a **write**: read-write, write-read, write-write. Swapping two adjacent non-conflicting operations does not change the outcome.
- **Conflict serializable**: can be turned into a serial schedule by such swaps.
- **Precedence graph**: a node per transaction; an edge $T_i \to T_j$ when an operation of $T_i$ conflicts with a **later** operation of $T_j$. The schedule is conflict serializable **iff the graph has no cycle**; a **topological order** gives an equivalent serial order.
- Every conflict-serializable schedule is serializable, but not the reverse (see view serializability).
- Databases do not test schedules after the fact; protocols like two-phase locking or serializable snapshot isolation only allow serializable ones.

### deep
#### Intuition

Reordering two operations only matters when one of them writes something the other touches. Every conflict fixes an order between two transactions ("T1 must come before T2"). If those required orders form a loop, no serial order can satisfy them all.

#### Code: building and testing the precedence graph

Notation: `r1(A)` is transaction 1 reading item A, `w2(B)` is transaction 2 writing B.

```cpp
struct Op { char kind; int txn; char item; };

vector<Op> parse(const string& schedule) {           // "r1(A) w2(A)" -> ops
    vector<Op> ops;
    istringstream in(schedule);
    for (string t; in >> t;) ops.push_back({t[0], t[1] - '0', t[3]});
    return ops;
}

void analyze(const string& schedule) {
    auto ops = parse(schedule);
    set<int> txns;
    set<pair<int, int>> edges;
    for (auto& o : ops) txns.insert(o.txn);
    for (size_t i = 0; i < ops.size(); ++i)
        for (size_t j = i + 1; j < ops.size(); ++j)
            if (ops[i].txn != ops[j].txn && ops[i].item == ops[j].item &&
                (ops[i].kind == 'w' || ops[j].kind == 'w'))
                edges.insert({ops[i].txn, ops[j].txn});   // earlier conflicts with later
    map<int, int> indegree;
    for (int t : txns) indegree[t] = 0;
    for (auto [a, b] : edges) ++indegree[b];
    vector<int> order;                               // Kahn's topological sort
    for (bool progress = true; progress;) {
        progress = false;
        for (auto& [t, d] : indegree)
            if (d == 0) {
                order.push_back(t);
                d = -1;
                for (auto [a, b] : edges)
                    if (a == t) --indegree[b];
                progress = true;
            }
    }
    cout << schedule << "\n  edges:";
    for (auto [a, b] : edges) cout << " T" << a << "->T" << b;
    if (order.size() < txns.size()) {
        cout << "\n  cycle: not conflict serializable\n";
        return;
    }
    cout << "\n  serializable as:";
    for (int t : order) cout << " T" << t;
    cout << "\n";
}

int main() {
    analyze("r1(A) w1(A) r2(A) w2(A) r1(B) w1(B) r2(B) w2(B)");
    analyze("r1(A) r2(A) w1(A) w2(A)");
    analyze("w2(A) r1(A) w3(B) r2(B)");
}
```

Output:

```text
r1(A) w1(A) r2(A) w2(A) r1(B) w1(B) r2(B) w2(B)
  edges: T1->T2
  serializable as: T1 T2
r1(A) r2(A) w1(A) w2(A)
  edges: T1->T2 T2->T1
  cycle: not conflict serializable
w2(A) r1(A) w3(B) r2(B)
  edges: T2->T1 T3->T2
  serializable as: T3 T2 T1
```

The first schedule interleaves heavily yet is equivalent to T1 then T2. The second is the **lost update**: both read A before either writes, so each would overwrite the other's change; the edges point both ways. The third shows that the equivalent serial order need not follow the transaction numbers.

#### Why only conflicts matter

Two reads never conflict. Operations on different items never conflict. For everything else the order can change what a transaction reads or what value survives, so the precedence graph records exactly the orders that must be preserved. Detecting a cycle is a graph problem: DFS or Kahn's algorithm in $O(V + E)$.

#### Pitfalls

- Drawing edges for pairs of reads.
- Drawing edges from the later operation to the earlier one: the edge always goes from the transaction that acted first.
- Forgetting that edges come from any two conflicting operations, not only adjacent ones.

Connects to: view serializability, recoverable schedules, lock-based protocols, cycle detection in directed graphs, topological sort.

### questions
Q: When do two operations conflict?
A: When they belong to different transactions, access the same data item, and at least one of them is a write. Read-read pairs never conflict, and operations on different items never conflict.

Q: What is conflict serializability?
A: A schedule is conflict serializable if it can be transformed into a serial schedule by swapping adjacent non-conflicting operations, meaning it orders every pair of conflicting operations the same way some serial schedule does.

Q: How do you test whether a schedule is conflict serializable?
A: Build a precedence graph with one node per transaction and an edge from Ti to Tj whenever an operation of Ti conflicts with a later operation of Tj. The schedule is conflict serializable if and only if the graph has no cycle, and any topological order of the graph is an equivalent serial order.

Q: Why is the lost update schedule r1(A) r2(A) w1(A) w2(A) not serializable?
A: r1(A) before w2(A) forces T1 before T2, while r2(A) before w1(A) forces T2 before T1, so the precedence graph has a cycle. In any serial order one transaction would read the other's write, but here both read the original value and one update is lost.

Q: Do databases check the precedence graph at runtime?
A: Generally no. They use protocols that guarantee serializable schedules by construction, such as strict two-phase locking, timestamp ordering or serializable snapshot isolation, often only at the serializable isolation level.

## dbms.transactions.view-serializability
name: "View serializability"
importance: important
prereqs: [dbms.transactions.schedules-and-serializability]
scope: "View serializability"

### simple
View serializability is a looser test than conflict serializability: a schedule passes if every transaction reads the same values as in some serial order, and the final values come from the same writes. Some schedules fail the conflict test only because of writes whose values nobody ever reads, and view serializability accepts them. It checks what everyone sees, not the exact order of every clash.

### interview
- Two schedules are **view equivalent** when: (1) each transaction that reads an item's **initial** value in one also does in the other; (2) each read **reads from** the same write in both; (3) the **final write** of each item is by the same transaction.
- **View serializable**: view equivalent to some serial schedule.
- Every conflict-serializable schedule is view serializable; the extra schedules all involve **blind writes** (writes of an item not read before by that transaction).
- Testing view serializability is **NP-complete**, so databases never use it; it matters as the theoretical definition of "correct" interleavings.
- Example: `r1(A) w2(A) w1(A) w3(A)` has a cycle between T1 and T2 but is view equivalent to T1, T2, T3, because T3's final blind write hides the other two.

### deep
#### Code: brute force over serial orders

```cpp
struct Op { char kind; int txn; char item; };

struct Views {
    map<pair<int, int>, int> readsFrom;               // (txn, its k-th op) -> writer (0: initial)
    map<char, int> finalWriter;
    bool operator==(const Views&) const = default;
};

Views viewsOf(const vector<Op>& ops) {
    Views v;
    map<char, int> lastWriter;
    map<int, int> position;                           // next op index within each txn
    for (auto& o : ops) {
        int k = position[o.txn]++;
        if (o.kind == 'r') v.readsFrom[{o.txn, k}] = lastWriter[o.item];
        else lastWriter[o.item] = v.finalWriter[o.item] = o.txn;
    }
    return v;
}

int main() {
    for (string s : {"r1(A) w2(A) w1(A) w3(A)", "r1(A) r2(A) w1(A) w2(A)"}) {
        vector<Op> ops;
        istringstream in(s);
        for (string t; in >> t;) ops.push_back({t[0], t[1] - '0', t[3]});
        vector<int> txns;
        for (auto& o : ops)
            if (find(txns.begin(), txns.end(), o.txn) == txns.end()) txns.push_back(o.txn);
        sort(txns.begin(), txns.end());
        Views target = viewsOf(ops);
        cout << s << ": ";
        bool found = false;
        do {                                          // try every serial order
            vector<Op> serial;
            for (int t : txns)
                for (auto& o : ops)
                    if (o.txn == t) serial.push_back(o);
            if (viewsOf(serial) == target) {
                cout << "view equivalent to";
                for (int t : txns) cout << " T" << t;
                found = true;
                break;
            }
        } while (next_permutation(txns.begin(), txns.end()));
        cout << (found ? "\n" : "not view serializable\n");
    }
}
```

Output:

```text
r1(A) w2(A) w1(A) w3(A): view equivalent to T1 T2 T3
r1(A) r2(A) w1(A) w2(A): not view serializable
```

In the first schedule T1 reads the initial A (as it would running first) and T3 writes the final A (as it would running last); T2's and T1's writes are never read by anyone, so their order does not matter to what anyone sees. The conflict test rejects it (w2(A) before w1(A) and r1(A) before w2(A) form a cycle), but the view test accepts it. The lost update schedule fails both: in any serial order one transaction would read the other's write.

#### Why nobody implements it

Trying every serial order is factorial in the number of transactions, and no fundamentally faster algorithm is expected (the problem is NP-complete). Conflict serializability captures almost every schedule that matters, can be checked in polynomial time, and is what locking protocols guarantee.

Connects to: schedules and serializability, recoverable schedules, lock-based protocols.

### questions
Q: What conditions make two schedules view equivalent?
A: Each transaction reads the initial value of the same items in both schedules, every read reads the value produced by the same write in both, and the final write on each item is performed by the same transaction in both.

Q: How does view serializability relate to conflict serializability?
A: Every conflict-serializable schedule is view serializable, but some view-serializable schedules are not conflict serializable. Those extra schedules always contain blind writes, writes of an item the transaction did not read first.

Q: Give a schedule that is view serializable but not conflict serializable.
A: r1(A) w2(A) w1(A) w3(A). Its precedence graph has a cycle between T1 and T2, but T1 reads the initial value and T3 writes the final value exactly as in the serial order T1, T2, T3, so it is view equivalent to that order.

Q: Why don't databases enforce view serializability?
A: Testing it is NP-complete, and the additional schedules it allows, those relying on blind writes, are rare and bring little extra concurrency. Conflict serializability is cheap to guarantee with locking or timestamp protocols.

## dbms.transactions.recoverable-schedules
name: "Recoverable schedules"
importance: important
prereqs: [dbms.transactions.schedules-and-serializability]
scope: "cascading rollbacks, cascadeless and strict schedules"

### simple
A schedule is recoverable if no transaction commits after reading data from another transaction that might still be cancelled. If it could, a cancellation would leave a committed transaction that depended on data that never really existed. Stricter schedules avoid reading unfinished data at all, so one cancellation never forces a chain of others, like not building on a foundation until the concrete has set.

### interview
- **Recoverable**: if $T_j$ reads a value written by $T_i$, then $T_i$ commits **before** $T_j$ commits. Otherwise an abort of $T_i$ would require undoing an already committed $T_j$, which is impossible.
- **Cascading rollback**: an abort of $T_i$ forces aborting every transaction that read its uncommitted writes, and those that read theirs.
- **Cascadeless** (avoids cascading aborts): transactions read only **committed** values. Every cascadeless schedule is recoverable.
- **Strict**: no transaction reads **or writes** an item until the last transaction that wrote it has committed or aborted. Undo can then simply restore old values (before images). Every strict schedule is cascadeless.
- **Strict two-phase locking** produces strict schedules by holding write locks until commit; this is what real systems do.
- Hierarchy: strict ⊂ cascadeless ⊂ recoverable ⊂ all schedules. Serializability is a separate, independent property.

### deep
#### Code: classifying schedules

`c1` commits transaction 1.

```cpp
struct Op { char kind; int txn; char item; };

string classify(const string& schedule) {
    vector<Op> ops;
    istringstream in(schedule);
    for (string t; in >> t;) ops.push_back({t[0], t[1] - '0', t.size() > 2 ? t[3] : ' '});
    map<char, int> lastWriter;
    set<int> committed;
    map<int, set<int>> readFrom;                      // reader -> writers it read from
    bool recoverable = true, cascadeless = true, strict = true;
    for (auto& o : ops) {
        int w = o.kind == 'c' ? 0 : lastWriter[o.item];
        bool uncommittedWriter = w != 0 && w != o.txn && !committed.count(w);
        if (o.kind == 'r' && w != 0 && w != o.txn) {
            readFrom[o.txn].insert(w);
            if (uncommittedWriter) cascadeless = strict = false;   // a dirty read
        }
        if (o.kind == 'w') {
            if (uncommittedWriter) strict = false;    // overwrites uncommitted data
            lastWriter[o.item] = o.txn;
        }
        if (o.kind == 'c') {
            for (int writer : readFrom[o.txn])
                if (!committed.count(writer)) recoverable = false;
            committed.insert(o.txn);
        }
    }
    return strict ? "strict" : cascadeless ? "cascadeless, not strict"
         : recoverable ? "recoverable, not cascadeless" : "not recoverable";
}

int main() {
    for (string s : {"w1(A) r2(A) c2 c1", "w1(A) r2(A) c1 c2", "w1(A) w2(A) c1 c2",
                     "w1(A) c1 r2(A) w2(A) c2"})
        cout << left << setw(26) << s << classify(s) << "\n";
}
```

Output:

```text
w1(A) r2(A) c2 c1         not recoverable
w1(A) r2(A) c1 c2         recoverable, not cascadeless
w1(A) w2(A) c1 c2         cascadeless, not strict
w1(A) c1 r2(A) w2(A) c2   strict
```

1. T2 read T1's uncommitted A and committed first. If T1 now aborts, T2 has committed a result based on a value that never existed: unrecoverable.
2. Same dirty read, but T2 waits for T1 to commit, so an abort of T1 could still abort T2 in time: recoverable, but it would cascade.
3. No dirty reads, but T2 overwrote T1's uncommitted A. If T1 aborts, restoring "the value before T1" would wipe T2's write: not strict.
4. Everything waits for commits: strict.

#### Cascading rollback, traced

`w1(A) r2(A) w2(B) r3(B) ...` and then T1 aborts: T2 read T1's A, so T2 must abort; T3 read T2's B, so T3 must abort too. One failure spreads through a chain, wasting work. Cascadeless schedules stop the chain at the first link.

Connects to: schedules and serializability, lock-based protocols, transaction states, read anomalies.

### questions
Q: What is a recoverable schedule?
A: One in which, whenever a transaction reads a value written by another transaction, the writer commits before the reader commits. Then if the writer aborts, the reader has not committed yet and can be aborted too.

Q: What is a cascading rollback and how can it be avoided?
A: When a transaction aborts, every transaction that read its uncommitted data must also abort, and so on down the chain. It is avoided with cascadeless schedules, where transactions only read committed data, for example by holding write locks until commit.

Q: What is the difference between cascadeless and strict schedules?
A: Cascadeless schedules forbid reading uncommitted data. Strict schedules additionally forbid overwriting uncommitted data, so no item is read or written until its last writer has finished. Strictness lets recovery undo a transaction simply by restoring before images.

Q: How do real databases ensure strict schedules?
A: With strict two-phase locking: exclusive locks are held until the transaction commits or aborts, so no other transaction can read or overwrite uncommitted changes. MVCC systems achieve the same for reads by showing only committed versions.
