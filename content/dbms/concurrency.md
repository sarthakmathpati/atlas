---
topic: dbms.concurrency
name: "Concurrency control"
subject: dbms
order: 6
prereqs: [dbms.transactions]
---

## dbms.concurrency.lock-based-protocols
name: "Lock-based protocols"
importance: must
prereqs: [dbms.transactions.schedules-and-serializability]
scope: "shared and exclusive locks, two-phase locking, strict 2PL"

### simple
Locks let a transaction reserve the data it uses so others cannot change it at the wrong moment. Many readers can share a lock, but a writer needs the item to itself, like a library book many people can look at on the table but only one person can take home to annotate. Two-phase locking adds one rule: once a transaction releases any lock, it may not take new ones, which keeps concurrent transactions equivalent to running one at a time.

### interview
- **Shared (S)** lock for reading: many holders at once. **Exclusive (X)** lock for writing: one holder, no shared holders. Compatibility: S with S yes; anything with X no. A holder of S may **upgrade** to X when it is the only reader.
- **Two-phase locking (2PL)**: a **growing** phase (acquire only) then a **shrinking** phase (release only). Guarantees **conflict-serializable** schedules; the lock point orders the transactions.
- **Strict 2PL**: hold all **X locks until commit or abort**. Adds **strict** (cascadeless, recoverable) schedules. **Rigorous 2PL**: hold all locks until the end; the common real-world choice.
- 2PL does **not** prevent **deadlocks**; systems detect them (wait-for graph) or time out.
- **Granularity**: row, page, table locks; **intention locks** (IS, IX, SIX) on tables let row locks coexist with table locks cheaply; **lock escalation** converts many row locks into one table lock.
- SQL: `SELECT ... FOR UPDATE` (X row locks), `FOR SHARE`, `LOCK TABLE`. Phantoms need locks on ranges or predicates (**next-key / gap locks** in MySQL InnoDB).

### deep
#### Intuition

Conflicts happen when two transactions touch the same item and one writes. Locks make the second one wait until the first is done with the item. The two-phase rule makes sure the waits line up into one consistent order: a transaction that could still grab a new lock after releasing one could slip between another transaction's steps.

#### Compatibility

| held \ requested | S | X |
|---|---|---|
| none | yes | yes |
| S (by another) | yes | no |
| X (by another) | no | no |

#### Code: a lock manager under strict 2PL

```cpp
struct Lock { set<int> shared; int exclusive = 0; };

struct LockManager {
    map<char, Lock> locks;

    string tryLock(int t, char item, bool write) {    // "" means granted, else the reason
        Lock& l = locks[item];
        if (l.exclusive && l.exclusive != t)
            return "T" + to_string(l.exclusive) + " holds X";
        bool othersRead = any_of(l.shared.begin(), l.shared.end(), [t](int s) { return s != t; });
        if (write && othersRead) return "another transaction holds S";
        if (write) {
            l.shared.erase(t);                        // upgrade S to X if it had S
            l.exclusive = t;
        } else if (l.exclusive != t) {
            l.shared.insert(t);
        }
        return "";
    }
    void releaseAll(int t) {                          // strict 2PL: only at commit
        for (auto& [item, l] : locks) {
            l.shared.erase(t);
            if (l.exclusive == t) l.exclusive = 0;
        }
    }
};

int main() {
    LockManager lm;
    map<int, deque<string>> waiting;                  // blocked transactions' pending ops
    function<void(const string&)> run = [&](const string& op) {
        int t = op[1] - '0';
        if (!waiting[t].empty() && waiting[t].front() != op) {   // still blocked: queue it
            waiting[t].push_back(op);
            return;
        }
        if (op[0] == 'c') {
            lm.releaseAll(t);
            cout << op << ": T" << t << " commits and releases its locks\n";
            for (auto& [other, ops] : waiting)       // retry blocked transactions
                while (!ops.empty()) {
                    string next = ops.front();
                    if (next[0] != 'c' && !lm.tryLock(other, next[3], next[0] == 'w').empty())
                        break;
                    ops.pop_front();
                    cout << "  " << next << ": granted after the wait\n";
                }
            return;
        }
        string why = lm.tryLock(t, op[3], op[0] == 'w');
        if (why.empty()) {
            if (!waiting[t].empty()) waiting[t].pop_front();
            cout << op << ": " << (op[0] == 'w' ? "X" : "S") << " lock on " << op[3]
                 << " granted\n";
        } else {
            if (waiting[t].empty()) waiting[t].push_back(op);
            cout << op << ": T" << t << " waits (" << why << " on " << op[3] << ")\n";
        }
    };
    for (string op : {"r1(A)", "r2(A)", "w1(A)", "w2(B)", "c2", "c1"}) run(op);
}
```

Output:

```text
r1(A): S lock on A granted
r2(A): S lock on A granted
w1(A): T1 waits (another transaction holds S on A)
w2(B): X lock on B granted
c2: T2 commits and releases its locks
  w1(A): granted after the wait
c1: T1 commits and releases its locks
```

Both reads share A. T1's write must wait for T2's shared lock, so the schedule becomes equivalent to T2 then T1. Holding the X lock on B until T2's commit is the "strict" part: nobody could read T2's uncommitted B.

#### Why two phases

If T1 released its lock on A and later locked B, T2 could lock A and B in between, touching A after T1 but B before T1: a cycle T1 → T2 → T1 in the precedence graph. With two phases, each transaction has a **lock point** (when it holds all its locks), and ordering transactions by lock points gives an equivalent serial order.

#### Deadlock with 2PL

`w1(A) w2(B) w1(B) w2(A)`: T1 waits for B held by T2, T2 waits for A held by T1. Neither can proceed; the database must abort one (see deadlocks in databases).

#### Pitfalls

- Releasing locks early "for performance" breaks serializability, and releasing X locks before commit allows cascading aborts.
- Lock upgrades by two readers of the same row deadlock each other; `SELECT ... FOR UPDATE` takes the X lock up front.
- Row locks do not stop phantoms: a new row matching a query's condition needs range or predicate locking.

Connects to: schedules and serializability, deadlocks in databases, isolation levels, mutex locks, optimistic vs pessimistic concurrency.

### questions
Q: What is two-phase locking and what does it guarantee?
A: A protocol where each transaction first acquires locks without releasing any, the growing phase, and then releases locks without acquiring any, the shrinking phase. It guarantees that every resulting schedule is conflict serializable, ordered by the transactions' lock points.

Q: What is the difference between 2PL and strict 2PL?
A: Basic 2PL may release locks before the transaction ends, so others can read its uncommitted writes, which allows cascading aborts. Strict 2PL holds all exclusive locks until commit or abort, producing strict, recoverable schedules. Rigorous 2PL holds all locks until the end.

Q: Explain shared and exclusive locks.
A: A shared lock allows reading and can be held by many transactions at once. An exclusive lock allows writing and can be held by only one transaction, with no shared holders. Requests incompatible with held locks wait.

Q: Does two-phase locking prevent deadlocks?
A: No. Two transactions can each hold a lock the other needs, as in T1 locking A then B while T2 locks B then A. Databases detect such cycles in a wait-for graph and abort a victim, or use timeouts or timestamp-based prevention schemes.

Q: What are intention locks?
A: Table-level locks, such as intention shared and intention exclusive, that announce a transaction holds or will take row-level locks inside the table. They let the system check a request for a whole-table lock against row locks without scanning every row lock.

## dbms.concurrency.isolation-levels
name: "Isolation levels"
importance: must
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "read uncommitted, read committed, repeatable read, serializable"

### simple
Isolation levels let you choose how much concurrent transactions can see of each other, trading safety for speed. At the lowest level you might see someone's unfinished changes; at the highest, every transaction behaves as if it ran alone. It is like choosing between reading a shared document while others type in it, reading a saved copy, or locking the document until you are done.

### interview
- The SQL standard defines four levels by the anomalies they allow:

| level | dirty read | non-repeatable read | phantom |
|---|---|---|---|
| read uncommitted | possible | possible | possible |
| read committed | no | possible | possible |
| repeatable read | no | no | possible (by the standard) |
| serializable | no | no | no |

- **Read committed**: each statement sees data committed before it started. Default in PostgreSQL, Oracle and SQL Server.
- **Repeatable read**: rows read once read the same again. Default in MySQL InnoDB. In MVCC systems it is usually **snapshot isolation**: the whole transaction reads one snapshot (PostgreSQL's also prevents phantoms).
- **Serializable**: equivalent to some serial order; implemented with strict 2PL plus range locks, or with **serializable snapshot isolation** (PostgreSQL), which aborts transactions that could break serializability.
- Higher levels mean more blocking or more **serialization failures**; applications must **retry** aborted transactions.
- Set with `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ` (or `BEGIN ISOLATION LEVEL ...` in PostgreSQL).

### deep
#### Intuition

Perfect isolation costs throughput: transactions must wait for each other or be aborted. Many workloads tolerate some anomalies, so databases let each transaction choose. The key is knowing exactly what each level allows.

#### Measured on PostgreSQL 16

Two sessions ran each scenario against a real database: session A read (or wrote), session B changed data and committed, then A continued.

| scenario | read committed | repeatable read | serializable |
|---|---|---|---|
| A reads a balance twice; B changes it between | 100, then 50 | 100, then 100 | 100, then 100 |
| A counts rows over 10 twice; B inserts one | 1, then 2 | 1, then 1 | 1, then 1 |
| both read 100; B writes 120; A writes its own 110 | A succeeds, final 110 (B's update lost) | A fails: "could not serialize access due to concurrent update" | A fails the same way |
| two doctors on call both go off call (write skew) | both commit, 0 on call | both commit, 0 on call | second commit fails, 1 on call |

PostgreSQL's read uncommitted behaves like read committed, so dirty reads never happen there. MySQL InnoDB's repeatable read differs in two ways: plain reads use a snapshot, but `UPDATE` and locking reads act on the latest committed row, so the third scenario succeeds there and loses B's update, while next-key locks make locking reads safe from phantoms.

#### Code: statement snapshots vs a transaction snapshot

```cpp
struct Version { int value, committedAt; };

int readAt(const vector<Version>& versions, int snapshot) {   // newest version visible
    int value = 0;
    for (auto& v : versions)
        if (v.committedAt <= snapshot) value = v.value;
    return value;
}

int main() {
    vector<Version> balance = {{100, 0}};            // committed at time 0
    int clock = 1;
    int txStart = clock++;                           // A begins and reads
    int rcFirst = readAt(balance, clock++);          // read committed: fresh snapshot
    int rrFirst = readAt(balance, txStart);          // repeatable read: the start snapshot
    balance.push_back({50, clock++});                // B updates and commits
    int rcSecond = readAt(balance, clock++);
    int rrSecond = readAt(balance, txStart);
    cout << "read committed:  " << rcFirst << ", then " << rcSecond << "\n";
    cout << "repeatable read: " << rrFirst << ", then " << rrSecond << "\n";
}
```

Output:

```text
read committed:  100, then 50
repeatable read: 100, then 100
```

Read committed takes a new snapshot for every statement, so it sees B's commit; repeatable read keeps the snapshot from the start of the transaction, matching the first row of the PostgreSQL table.

#### Choosing a level

- Most web applications run fine on **read committed** with care around read-modify-write (use atomic updates or `SELECT ... FOR UPDATE`).
- Reports that must be internally consistent: **repeatable read** (one snapshot for the whole report).
- Invariants that span rows (at least one doctor on call, no double booking): **serializable**, with a retry loop.

#### Pitfalls

- Assuming the same level name means the same behavior everywhere: PostgreSQL's and MySQL's repeatable read differ.
- Using serializable without retrying serialization failures: errors reach users.
- Long transactions at repeatable read or serializable hold old snapshots, bloating storage and increasing conflicts.

Connects to: read anomalies, MVCC, write skew and snapshot isolation, lock-based protocols, data races vs race conditions.

### questions
Q: What are the four standard isolation levels and what does each prevent?
A: Read uncommitted prevents nothing guaranteed and may show dirty reads. Read committed prevents dirty reads. Repeatable read also prevents non-repeatable reads. Serializable prevents all anomalies including phantoms, making the result equivalent to some serial execution.

Q: What are the default isolation levels of PostgreSQL and MySQL?
A: PostgreSQL defaults to read committed, as do Oracle and SQL Server. MySQL with InnoDB defaults to repeatable read, implemented with consistent snapshots for plain reads and next-key locks for locking reads.

Q: How does read committed differ from repeatable read in an MVCC database?
A: Under read committed each statement takes a new snapshot, so two reads in the same transaction can see different committed data. Under repeatable read the transaction uses one snapshot taken at its first statement, so repeated reads return the same data.

Q: Why must applications retry transactions at higher isolation levels?
A: The database guarantees isolation by aborting transactions whose concurrent execution could not be serialized, or by detecting deadlocks. These serialization failures are expected, not bugs, and the correct response is to run the whole transaction again.

Q: When would you choose serializable isolation?
A: When correctness depends on invariants across several rows or on the absence of rows, such as never double-booking a room or always keeping one doctor on call, where lower levels allow write skew or phantoms. It costs more aborts or blocking, so it is used where those invariants matter.

## dbms.concurrency.read-anomalies
name: "Read anomalies"
importance: must
prereqs: [dbms.concurrency.isolation-levels]
scope: "dirty read, non-repeatable read, phantom read, lost update"

### simple
Read anomalies are the strange results you can get when transactions run at the same time without enough isolation. You might read a change that later gets cancelled, get two different answers to the same question inside one transaction, see new rows appear, or have your update silently overwritten. They are like two people editing the same spreadsheet cell at once: whoever saves last wins, and the other's work quietly disappears.

### interview
- **Dirty read**: reading another transaction's **uncommitted** change, which may be rolled back. Prevented from read committed up.
- **Non-repeatable read**: reading the same row twice in one transaction and getting different values, because another transaction committed an update in between. Prevented from repeatable read up.
- **Phantom read**: re-running a query with a condition returns **new or missing rows**, because another transaction inserted or deleted matching rows. Prevented by serializable (and by snapshot-based repeatable read in PostgreSQL); needs predicate or range locks with locking.
- **Lost update**: two transactions read, modify and write the same value; one write overwrites the other. Fixes: atomic `UPDATE ... SET x = x + 1`, `SELECT ... FOR UPDATE`, optimistic version checks, or an isolation level that detects it.
- Related: **write skew** (two transactions read overlapping data and update different rows, jointly breaking an invariant) and read skew (seeing parts of two different states).

### deep
#### Timelines

**Dirty read**

| T1 | T2 |
|---|---|
| `UPDATE accounts SET balance = 0 WHERE id = 1` | |
| | `SELECT balance ...` → 0 (uncommitted) |
| `ROLLBACK` | |
| | decides based on a value that never existed |

**Non-repeatable read**

| T1 | T2 |
|---|---|
| `SELECT balance ...` → 100 | |
| | `UPDATE ... SET balance = 50; COMMIT` |
| `SELECT balance ...` → 50 | |

**Phantom**

| T1 | T2 |
|---|---|
| `SELECT COUNT(*) FROM bookings WHERE room = 4 AND day = 'fri'` → 0 | |
| | `INSERT INTO bookings VALUES (4, 'fri', ...); COMMIT` |
| same query → 1 | |

#### Code: a lost update, and the fix

Two deposits run at the same time as read, compute, write. The balance is an atomic so the program itself has no data race; the lost update is in the logic, exactly as with two database clients.

```cpp
atomic<int> balance{100};                            // the row
mutex rowLock;                                       // stands in for SELECT ... FOR UPDATE

void deposit(int amount, int thinkMs, bool lockRow) {
    unique_lock<mutex> lock(rowLock, defer_lock);
    if (lockRow) lock.lock();                        // hold the row until "commit"
    int seen = balance.load();                       // SELECT balance
    this_thread::sleep_for(chrono::milliseconds(thinkMs));   // the application computes
    balance.store(seen + amount);                    // UPDATE ... SET balance = <computed>
}

int main() {
    for (bool lockRow : {false, true}) {
        balance = 100;
        thread slow(deposit, 10, 50, lockRow), fast(deposit, 20, 10, lockRow);
        slow.join();
        fast.join();
        cout << (lockRow ? "with a row lock: " : "read then write: ") << balance << "\n";
    }
}
```

Output:

```text
read then write: 110
with a row lock: 130
```

Without the lock, both deposits read 100; the fast one wrote 120, then the slow one wrote 110 over it, and the 20 vanished. With the row held from read to write, the second deposit waits and reads 110, giving 130. In SQL the simplest fix avoids the read entirely: `UPDATE accounts SET balance = balance + 10 WHERE id = 1` is atomic in every database.

#### Which level stops what

| anomaly | read committed | repeatable read (snapshot) | serializable |
|---|---|---|---|
| dirty read | prevented | prevented | prevented |
| non-repeatable read | possible | prevented | prevented |
| phantom | possible | prevented in PostgreSQL, possible by the standard | prevented |
| lost update | possible | PostgreSQL detects and aborts; MySQL allows | prevented |
| write skew | possible | possible | prevented |

#### Pitfalls

- Believing "we use transactions" prevents lost updates: at read committed, a read-then-write in application code still loses updates.
- Checking for a row's absence ("no booking yet") and then inserting: a phantom lets two transactions both succeed. A unique constraint or serializable isolation closes the gap.

Connects to: isolation levels, MVCC, write skew and snapshot isolation, optimistic vs pessimistic concurrency, lock-based protocols.

### questions
Q: What is a dirty read?
A: Reading data written by another transaction that has not committed yet. If that transaction rolls back, the reader has used a value that never officially existed. Every isolation level from read committed upward prevents it.

Q: What is the difference between a non-repeatable read and a phantom read?
A: A non-repeatable read is when the same row, read twice in one transaction, has different values because another transaction updated it and committed. A phantom is when a query with a condition returns a different set of rows because another transaction inserted or deleted rows matching the condition.

Q: What is a lost update and how do you prevent it?
A: Two transactions read the same value, each computes a new value from it, and both write, so the later write silently discards the earlier one. Prevent it with atomic updates like SET x = x + 1, with SELECT FOR UPDATE to lock the row before reading, with optimistic version checks, or with an isolation level that detects the conflict.

Q: Which isolation level prevents phantoms?
A: Serializable always does. By the SQL standard, repeatable read may allow them, but snapshot-based implementations such as PostgreSQL's repeatable read also hide them because the transaction reads a single snapshot. Lock-based systems need range or predicate locks, such as InnoDB's next-key locks.

Q: Why can checking that a row does not exist and then inserting it be unsafe?
A: Two concurrent transactions can both check, both find nothing, and both insert, because each check saw a state without the other's uncommitted row. A unique constraint, a lock on the range, or serializable isolation prevents the duplicate.

## dbms.concurrency.deadlocks-in-databases
name: "Deadlocks in databases"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "detection and prevention"

### simple
A deadlock happens when two transactions each hold a lock the other needs, so both wait forever. It is like two cars meeting on a narrow bridge, each waiting for the other to back up. Databases notice the standoff and cancel one of the transactions so the other can finish; the cancelled one is simply tried again.

### interview
- Arises under locking when transactions acquire locks in **different orders**: T1 locks row 1 then row 2, T2 locks row 2 then row 1. The same four conditions as operating system deadlocks apply.
- **Detection**: build a **wait-for graph** (edge $T_i \to T_j$ when $T_i$ waits for a lock held by $T_j$); a **cycle** is a deadlock. Pick a **victim** (least work done, youngest, fewest locks) and abort it; it releases its locks.
- PostgreSQL checks after a transaction has waited `deadlock_timeout` (1 s by default) and aborts the transaction that ran the check; MySQL InnoDB detects immediately and rolls back the transaction with the smaller undo log.
- **Prevention with timestamps**: **wait-die** (an older transaction may wait for a younger one; a younger one requesting from an older one dies and restarts with its old timestamp) and **wound-wait** (an older one wounds, meaning aborts, a younger holder; a younger one waits). Both avoid cycles and starvation.
- **Timeouts**: abort after waiting too long; simple but imprecise.
- Application side: touch rows in a **consistent order** (sort ids), keep transactions short, and **retry** on deadlock errors.

### deep
#### A real deadlock

Two sessions on PostgreSQL 16, each moving 10 between accounts 1 and 2 in opposite directions:

| session A | session B |
|---|---|
| `UPDATE acct ... WHERE id = 1` (locks row 1) | |
| | `UPDATE acct ... WHERE id = 2` (locks row 2) |
| `UPDATE acct ... WHERE id = 2` waits for B | |
| | `UPDATE acct ... WHERE id = 1` waits for A |
| after 1 s: `ERROR: deadlock detected`, rolled back | proceeds and commits |

A had been waiting longest, so its deadlock check ran first and aborted it. The application must catch the error and run A's transaction again. Had both sessions updated the lower id first, B would simply have waited for A.

#### Code: detecting the cycle

```cpp
int main() {
    // T1 waits for T2, T2 for T3, T3 for T1: a cycle. T4 waits for T1 but is not in it.
    map<int, vector<int>> waitsFor = {{1, {2}}, {2, {3}}, {3, {1}}, {4, {1}}};
    map<int, int> startTime = {{1, 10}, {2, 20}, {3, 30}, {4, 40}};

    map<int, int> state;                              // 0 unvisited, 1 on stack, 2 done
    vector<int> stack, cycle;
    function<bool(int)> dfs = [&](int t) {
        state[t] = 1;
        stack.push_back(t);
        for (int u : waitsFor[t]) {
            if (state[u] == 1) {                      // back edge: found the cycle
                cycle.assign(find(stack.begin(), stack.end(), u), stack.end());
                return true;
            }
            if (state[u] == 0 && dfs(u)) return true;
        }
        stack.pop_back();
        state[t] = 2;
        return false;
    };
    for (auto& [t, _] : waitsFor)
        if (state[t] == 0 && dfs(t)) break;

    cout << "cycle:";
    for (int t : cycle) cout << " T" << t;
    int victim = *max_element(cycle.begin(), cycle.end(),
                              [&](int a, int b) { return startTime[a] < startTime[b]; });
    cout << "\nabort the youngest: T" << victim << "\n";
}
```

Output:

```text
cycle: T1 T2 T3
abort the youngest: T3
```

Aborting T3 frees its locks, T2 can proceed, then T1, and T4 after it. T4 was waiting but was not part of the deadlock, so it is left alone.

#### Wait-die vs wound-wait

An older transaction has a smaller timestamp. When requester R wants a lock held by H:

| scheme | R older than H | R younger than H |
|---|---|---|
| wait-die | R waits | R dies (aborts, restarts later with its original timestamp) |
| wound-wait | R wounds H (H aborts) | R waits |

Waits only ever go one way in age (old waits for young, or young waits for old), so no cycle can form. Keeping the original timestamp on restart means a transaction eventually becomes the oldest and cannot starve.

Connects to: lock-based protocols, deadlock conditions, resource allocation graphs, timestamp ordering protocols, transaction states.

### questions
Q: How do databases detect deadlocks?
A: They maintain a wait-for graph with an edge from each waiting transaction to the transaction holding the lock it wants, and look for cycles, either continuously or after a transaction has waited for some time. When a cycle is found, one transaction in it is chosen as the victim and rolled back.

Q: How is a deadlock victim chosen?
A: By cost: typically the transaction that has done the least work, holds the fewest locks, has the smallest undo log, or is the youngest, so that the least effort is wasted. Some systems simply abort the transaction that detected the cycle.

Q: Explain wait-die and wound-wait.
A: Both use start timestamps. In wait-die, an older transaction may wait for a younger one, but a younger requester is aborted. In wound-wait, an older requester aborts the younger holder, while a younger requester waits. Either way waits go in one direction of age, so cycles cannot form.

Q: How can applications reduce deadlocks?
A: Access rows and tables in a consistent order, for example by sorting the ids to update, keep transactions short, lock what they intend to write up front with SELECT FOR UPDATE, and always retry a transaction that fails with a deadlock error.

## dbms.concurrency.timestamp-ordering-protocols
name: "Timestamp ordering protocols"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "Timestamp ordering protocols"

### simple
Timestamp ordering gives each transaction a ticket number when it starts and makes sure conflicting operations happen in ticket order. If a transaction arrives too late, for example trying to change something a newer transaction already read, it is cancelled and restarted with a new ticket. Nobody ever waits for a lock, so deadlocks cannot happen.

### interview
- Each transaction gets a timestamp $TS(T)$ at start; the equivalent serial order is timestamp order.
- Each item keeps $R\_TS(X)$ (largest timestamp that read it) and $W\_TS(X)$ (largest that wrote it).
- **Read** by $T$: if $TS(T) < W\_TS(X)$, a younger transaction already overwrote X: **abort** $T$. Otherwise read and set $R\_TS(X) = \max(R\_TS(X), TS(T))$.
- **Write** by $T$: if $TS(T) < R\_TS(X)$ (a younger one read the old value) or $TS(T) < W\_TS(X)$: **abort** $T$. Otherwise write and set $W\_TS(X) = TS(T)$.
- **Thomas write rule**: if $TS(T) < W\_TS(X)$ but not $< R\_TS(X)$, **skip** the obsolete write instead of aborting (it would be overwritten anyway); allows some view-serializable schedules.
- No waiting, so **no deadlocks**, but more aborts, possible starvation of long transactions, and cascading aborts unless combined with commit rules. Multiversion timestamp ordering underlies many MVCC designs.

### deep
#### Code: basic timestamp ordering

```cpp
struct Item { int readTs = 0, writeTs = 0; };

int main() {
    map<char, Item> items;
    set<int> aborted;
    bool thomas = false;
    auto run = [&](const vector<tuple<char, int, char>>& ops) {
        items.clear();
        aborted.clear();
        for (auto [kind, ts, x] : ops) {             // ts doubles as the transaction id
            if (aborted.count(ts)) continue;
            Item& it = items[x];
            string verdict = "ok";
            if (kind == 'r') {
                if (ts < it.writeTs) verdict = "abort: a younger transaction wrote it";
                else it.readTs = max(it.readTs, ts);
            } else if (ts < it.readTs) {
                verdict = "abort: a younger transaction read the old value";
            } else if (ts < it.writeTs) {
                verdict = thomas ? "skipped (Thomas write rule)" : "abort: overwritten already";
            } else {
                it.writeTs = ts;
            }
            if (verdict.starts_with("abort")) aborted.insert(ts);
            cout << "  " << kind << ts << "(" << x << "): " << verdict << "\n";
        }
    };
    vector<tuple<char, int, char>> schedule = {
        {'r', 1, 'A'}, {'r', 2, 'A'}, {'w', 2, 'A'}, {'w', 1, 'A'},
        {'w', 1, 'B'}, {'w', 3, 'B'}, {'w', 2, 'B'}};   // T3 writes B without reading it
    cout << "basic:\n";
    run(schedule);
    thomas = true;
    cout << "with the Thomas write rule:\n";
    run(schedule);
}
```

Output:

```text
basic:
  r1(A): ok
  r2(A): ok
  w2(A): ok
  w1(A): abort: a younger transaction read the old value
  w3(B): ok
  w2(B): abort: overwritten already
with the Thomas write rule:
  r1(A): ok
  r2(A): ok
  w2(A): ok
  w1(A): abort: a younger transaction read the old value
  w3(B): ok
  w2(B): skipped (Thomas write rule)
```

T1 (timestamp 1) tries to write A after T2 (timestamp 2) already read it: in timestamp order T1 comes first, so T2 should have seen T1's write; T1 must abort. `w1(B)` never runs because T1 was already aborted. T2's late write to B would be overwritten by T3's anyway, and nobody read B, so the Thomas rule simply ignores it and T2 survives. Had T3 read B before writing it, T2's write would have to abort under both rules: T3 must not miss a write that comes before it in timestamp order.

#### Locking vs timestamps

| | two-phase locking | timestamp ordering |
|---|---|---|
| on conflict | wait | abort the late transaction |
| deadlocks | possible | impossible |
| serial order | lock points (decided at run time) | start timestamps (decided up front) |
| good when | contention is high and waits are short | conflicts are rare |

Connects to: lock-based protocols, MVCC, optimistic vs pessimistic concurrency, deadlocks in databases, view serializability.

### questions
Q: How does basic timestamp ordering decide whether an operation can proceed?
A: Each transaction has a start timestamp and each item records the largest timestamps that read and wrote it. A read is rejected if a younger transaction already wrote the item. A write is rejected if a younger transaction already read or wrote the item. Rejected transactions abort and restart with a new timestamp.

Q: What is the Thomas write rule?
A: When a transaction tries to write an item that a younger transaction has already written, but no younger transaction has read, the older write is obsolete and can be ignored instead of aborting the transaction. This allows more schedules, some of which are view serializable but not conflict serializable.

Q: Why can't timestamp ordering deadlock?
A: Transactions never wait for each other; a conflicting operation either proceeds immediately or causes its transaction to abort. Without waiting there can be no cycle of waits.

Q: What are the disadvantages of timestamp ordering?
A: It can abort many transactions under contention, long transactions may starve by being aborted repeatedly, and without extra rules it allows reading uncommitted data, leading to cascading aborts. Maintaining read and write timestamps on every item also costs space and updates.

## dbms.concurrency.mvcc
name: "MVCC"
importance: must
prereqs: [dbms.concurrency.isolation-levels]
scope: "multi-version concurrency control"

### simple
MVCC lets a database keep several versions of each row, so readers see a consistent snapshot while writers create new versions instead of overwriting. Readers never wait for writers and writers never wait for readers. It is like a wiki keeping page history: someone reading the page sees the version from when they opened it, even while someone else saves an edit.

### interview
- Every update writes a **new version** of the row tagged with the creating transaction; the old version stays until no transaction needs it.
- A transaction reads from a **snapshot**: it sees versions committed before the snapshot and its own changes, and ignores versions from transactions still running or started later.
- **Readers don't block writers and writers don't block readers**; only two writers of the same row conflict (the second waits, then fails under snapshot isolation or re-reads under read committed).
- PostgreSQL stores versions in the table with `xmin` (creating transaction) and `xmax` (deleting or updating transaction); **VACUUM** removes dead versions. MySQL InnoDB and Oracle keep the latest version in place and rebuild older ones from **undo logs**; a purge thread cleans them.
- Snapshot per statement gives **read committed**; per transaction gives **repeatable read / snapshot isolation**. Serializable needs more (SSI).
- Costs: space for old versions, cleanup work, and **long-running transactions** that pin old snapshots and cause bloat.

### deep
#### Intuition

With locking, a long report blocks writers, or writers block the report. MVCC removes the conflict by never destroying a value someone might still need: the report keeps reading the world as it was when it started, while updates build new versions next to the old ones.

#### Code: versions and snapshots

```cpp
struct Version { string value; int createdBy, deletedBy; };   // deletedBy 0: still current

struct Store {
    vector<Version> versions;                        // one row's version chain
    set<int> committed;
    int nextTxn = 1;

    struct Snapshot { int self, horizon; set<int> committedAtStart; };

    Snapshot begin() { return {nextTxn, nextTxn++, committed}; }

    bool visible(int txn, const Snapshot& s) const {  // did this txn's work happen for s?
        return txn == s.self || s.committedAtStart.count(txn);
    }
    string read(const Snapshot& s) const {
        for (auto& v : versions)
            if (visible(v.createdBy, s) && !(v.deletedBy && visible(v.deletedBy, s)))
                return v.value;
        return "(none)";
    }
    void update(const Snapshot& s, const string& value) {
        for (auto& v : versions)
            if (!v.deletedBy) v.deletedBy = s.self;  // end the current version
        versions.push_back({value, s.self, 0});      // and add a new one
    }
    void commit(const Snapshot& s) { committed.insert(s.self); }
};

int main() {
    Store row;
    auto setup = row.begin();
    row.update(setup, "price 100");
    row.commit(setup);

    auto report = row.begin();                       // a long-running reader
    auto writer = row.begin();
    row.update(writer, "price 120");
    cout << "writer sees: " << row.read(writer) << "\n";
    cout << "report sees: " << row.read(report) << " (writer not committed)\n";
    row.commit(writer);
    cout << "report sees: " << row.read(report) << " (its snapshot is older)\n";
    auto later = row.begin();
    cout << "new txn sees: " << row.read(later) << "\n";
    cout << "versions kept: " << row.versions.size() << "\n";
}
```

Output:

```text
writer sees: price 120
report sees: price 100 (writer not committed)
report sees: price 100 (its snapshot is older)
new txn sees: price 120
versions kept: 2
```

The report never blocked and was never blocked. Both versions must stay until the report finishes; after that, the old version is dead and cleanup can reclaim it.

#### How PostgreSQL does it

Each row version (tuple) carries `xmin` and `xmax` transaction ids. An `UPDATE` sets `xmax` on the old tuple and inserts a new tuple with a new `xmin`. A snapshot records which transactions were in progress, and visibility checks compare against it, as in the code above. `VACUUM` (usually autovacuum) marks dead tuples' space as reusable. Because transaction ids are 32 bits, vacuum also "freezes" old tuples to prevent wraparound.

#### Write-write conflicts

Two transactions updating the same row cannot both create the next version. The second waits for the first; if the first commits, then under read committed the second re-reads the new version and applies its update, and under snapshot isolation it fails with a serialization error (first updater wins) and must retry.

#### Pitfalls

- A forgotten open transaction (an idle session in a transaction) pins its snapshot, so vacuum cannot remove anything newer: tables and indexes bloat.
- Update-heavy tables create many dead versions; they need tuned autovacuum.
- MVCC alone does not make transactions serializable: write skew remains possible under snapshot isolation.

Connects to: isolation levels, read anomalies, write skew and snapshot isolation, timestamp ordering protocols, logs and write-ahead logging.

### questions
Q: What is MVCC and what problem does it solve?
A: Multi-version concurrency control keeps several versions of each row so that each transaction reads a consistent snapshot. Readers do not block writers and writers do not block readers, which removes most lock contention between queries and updates.

Q: How does a transaction decide which version of a row to read?
A: It uses its snapshot: a version is visible if it was created by a transaction that committed before the snapshot was taken, or by the transaction itself, and not deleted by such a transaction. Versions from transactions still in progress or started later are ignored.

Q: How do PostgreSQL and MySQL store old versions differently?
A: PostgreSQL writes each new version as a new tuple in the table, with xmin and xmax transaction ids, and VACUUM later removes dead tuples. InnoDB updates the row in place and keeps the information needed to rebuild older versions in undo logs, which a purge thread cleans up.

Q: What happens when two transactions update the same row under MVCC?
A: The second one waits for the first. If the first commits, then under read committed the second proceeds on the new version, while under snapshot isolation or serializable it fails with a serialization error and must be retried. If the first aborts, the second proceeds.

Q: Why are long-running transactions harmful in MVCC databases?
A: They hold an old snapshot, so every row version created after it must be kept in case they need it. Cleanup cannot reclaim that space, tables and indexes bloat, and queries slow down.

## dbms.concurrency.optimistic-vs-pessimistic-concurrency
name: "Optimistic vs pessimistic concurrency"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "Optimistic vs pessimistic concurrency"

### simple
Pessimistic concurrency assumes conflicts will happen, so it locks data before changing it and makes others wait. Optimistic concurrency assumes conflicts are rare, so it lets everyone work freely and checks at the end whether someone else changed the data first, retrying if so. It is the difference between reserving a meeting room in advance and just walking in, then finding another room if it is taken.

### interview
- **Pessimistic**: take locks before reading data you will update (`SELECT ... FOR UPDATE`, 2PL). Others wait. Good under **high contention** or when a retry is expensive or impossible (the user already filled in a long form based on the data).
- **Optimistic** (OCC): read without locks, do the work, then **validate** at write time that nothing changed; if it did, abort and **retry**. Good under **low contention**, short transactions and long user think time.
- Classic optimistic locking in applications: a **version** column (or `updated_at`): `UPDATE items SET ..., version = version + 1 WHERE id = ? AND version = ?`; zero rows updated means someone else won.
- HTTP uses the same idea: `ETag` with `If-Match`, answered with `412 Precondition Failed` on a stale write.
- OCC phases in databases: read, validate, write. MVCC snapshot isolation is optimistic for writes (first committer or updater wins).
- Trade-off: pessimistic wastes time **waiting** (and risks deadlocks); optimistic wastes **work** when it retries.

### deep
#### Worked example: two editors

Two people open the same product page (version 3) and both press save.

```sql
CREATE TABLE products (id INT PRIMARY KEY, price INT, version INT NOT NULL);
INSERT INTO products VALUES (1, 100, 3);

-- editor A saves first: matches version 3, so it wins
UPDATE products SET price = 110, version = version + 1 WHERE id = 1 AND version = 3;
-- editor B also read version 3: now it matches nothing
UPDATE products SET price = 90, version = version + 1 WHERE id = 1 AND version = 3;

SELECT * FROM products;
```

The first update reports 1 row updated and the second 0; the table holds price 110 at version 4. The application sees B's zero count and tells B that the product changed, shows the new price, and lets B decide.

#### Code: optimistic retries

```cpp
struct Row { int value = 0, version = 0; };

bool compareAndSet(Row& row, int expectedVersion, int newValue) {   // the guarded UPDATE
    if (row.version != expectedVersion) return false;
    row.value = newValue;
    ++row.version;
    return true;
}

int main() {
    Row stock{10, 1};
    // Two clients each read version 1, then try to reserve items.
    struct Client { string name; int want, seenValue, seenVersion; };
    vector<Client> clients = {{"A", 3, stock.value, stock.version},
                              {"B", 4, stock.value, stock.version}};
    for (auto& c : clients) {
        for (int attempt = 1;; ++attempt) {
            if (compareAndSet(stock, c.seenVersion, c.seenValue - c.want)) {
                cout << c.name << " reserved " << c.want << " on attempt " << attempt
                     << ", stock now " << stock.value << "\n";
                break;
            }
            cout << c.name << " conflict on attempt " << attempt << ": re-read\n";
            c.seenValue = stock.value;                // read again and recompute
            c.seenVersion = stock.version;
        }
    }
}
```

Output:

```text
A reserved 3 on attempt 1, stock now 7
B conflict on attempt 1: re-read
B reserved 4 on attempt 2, stock now 3
```

B's first attempt was based on stock 10, which was no longer true; the version check caught it, B recomputed from 7 and succeeded. Nothing waited, and nothing was lost.

#### Choosing

| situation | choice |
|---|---|
| a user edits a record for minutes before saving | optimistic (never hold locks across user think time) |
| many workers grab jobs from the same queue rows | pessimistic, often `FOR UPDATE SKIP LOCKED` |
| a hot counter updated thousands of times a second | neither: an atomic `SET n = n + 1` or sharded counters |
| rare conflicts, short transactions | optimistic |
| retries are expensive (external side effects) | pessimistic |

Connects to: lock-based protocols, MVCC, read anomalies, timestamp ordering protocols, REST principles.

### questions
Q: What is the difference between optimistic and pessimistic concurrency control?
A: Pessimistic control prevents conflicts by locking data before using it, so conflicting transactions wait. Optimistic control lets transactions proceed without locks and checks for conflicts when they try to write, aborting and retrying the loser. Pessimistic suits high contention; optimistic suits low contention.

Q: How do you implement optimistic locking with a version column?
A: Read the row with its version number, and when writing, update only if the version is unchanged while incrementing it, as in UPDATE ... SET ..., version = version + 1 WHERE id = ? AND version = ?. If zero rows are updated, another writer won; re-read and retry or report the conflict to the user.

Q: When is pessimistic locking the better choice?
A: When conflicts are frequent, so optimistic retries would waste a lot of work, or when a retry is costly or impossible, such as after side effects outside the database. The locks must still be held only briefly, never across user interaction.

Q: How does HTTP support optimistic concurrency?
A: The server returns an ETag identifying the resource version. The client sends it back in an If-Match header with its update, and the server applies the change only if the ETag still matches, otherwise answering 412 Precondition Failed.

## dbms.concurrency.write-skew-and-snapshot-isolation
name: "Write skew and snapshot isolation"
importance: advanced
prereqs: [dbms.concurrency.mvcc]
scope: "Write skew and snapshot isolation"

### simple
Snapshot isolation lets every transaction work on a frozen picture of the database taken when it began, and it only blocks two transactions that change the same row. Write skew is the gap this leaves: two transactions each read the same facts, each change a different row, and together they break a rule neither broke alone. Two doctors each see that the other is on call and both go home, leaving nobody on call.

### interview
- **Snapshot isolation (SI)**: reads come from a snapshot taken at the start; writes are checked for **write-write conflicts** (first committer or first updater wins). Prevents dirty reads, non-repeatable reads, lost updates and (in its snapshot reads) phantoms.
- It is **not serializable**: **write skew** happens when two transactions read an overlapping set, then write **different** rows based on what they read.
- Examples: at least one doctor on call; no double booking of a room checked with `SELECT` then `INSERT`; a username unique across two tables; spending limits split across accounts.
- Fixes: **serializable** isolation (PostgreSQL's **serializable snapshot isolation** tracks read-write dependencies and aborts one transaction); `SELECT ... FOR UPDATE` on the rows the decision depends on; **materializing the conflict** (a row both must update, such as a per-shift lock row); constraints (unique indexes, exclusion constraints).
- Oracle's "serializable" and PostgreSQL's repeatable read are SI; PostgreSQL's serializable is SSI.

### deep
#### The doctors, on a real database

The invariant: at least one doctor must stay on call. Alice and Bob are both on call, and both request leave at the same moment. Each transaction counts on-call doctors, sees 2, and takes itself off call. Run on PostgreSQL 16:

| isolation | outcome |
|---|---|
| repeatable read (snapshot isolation) | both commit; 0 doctors on call |
| serializable (SSI) | the second commit fails with "could not serialize access due to read/write dependencies among transactions"; 1 doctor on call |

Under SI, neither transaction wrote a row the other wrote, so no write-write conflict was detected, yet the result matches no serial order: in either serial order, the second doctor would have seen only one on call and stayed.

#### Code: why snapshot isolation misses it

```cpp
int main() {
    map<string, bool> onCall = {{"alice", true}, {"bob", true}};
    auto snapshotA = onCall, snapshotB = onCall;     // both start before either writes
    map<string, bool> writesA, writesB;

    auto count = [](const map<string, bool>& s) {
        return count_if(s.begin(), s.end(), [](auto& d) { return d.second; });
    };
    if (count(snapshotA) >= 2) writesA["alice"] = false;   // "someone else is on call"
    if (count(snapshotB) >= 2) writesB["bob"] = false;

    bool writeWriteConflict = false;                 // what SI checks: the same row written
    for (auto& [row, value] : writesA) writeWriteConflict |= writesB.count(row) > 0;
    cout << "write-write conflict: " << boolalpha << writeWriteConflict << "\n";

    for (auto& w : {writesA, writesB})               // both commit
        for (auto& [row, value] : w) onCall[row] = value;
    cout << "doctors on call after both commit: " << count(onCall) << "\n";
}
```

Output:

```text
write-write conflict: false
doctors on call after both commit: 0
```

The conflict is between a read and a write (each read the row the other changed), which snapshot isolation does not track. SSI adds exactly that tracking: when it sees two transactions each reading something the other wrote, forming a dangerous structure, it aborts one.

#### Fixes in SQL

- `BEGIN ISOLATION LEVEL SERIALIZABLE;` and retry on serialization failure.
- Lock what the decision reads: `SELECT * FROM doctors WHERE on_call FOR UPDATE;` makes the second transaction wait, then see the new state.
- Turn it into a single-row conflict or a constraint: a unique index on bookings stops double booking outright.

Connects to: MVCC, isolation levels, read anomalies, optimistic vs pessimistic concurrency.

### questions
Q: What is write skew?
A: An anomaly where two concurrent transactions read an overlapping set of data, each makes a decision based on it, and each updates a different row. No single row is written by both, so snapshot isolation allows both commits, but together they violate an invariant, such as leaving no doctor on call.

Q: What does snapshot isolation guarantee and what does it not?
A: Each transaction reads a consistent snapshot from its start, and concurrent writes to the same row are detected so one transaction fails. That prevents dirty reads, non-repeatable reads and lost updates. It does not prevent write skew, so it is weaker than serializable.

Q: How can you prevent write skew?
A: Run the transactions at serializable isolation, such as PostgreSQL's serializable snapshot isolation, and retry failures. Or lock the rows the decision depends on with SELECT FOR UPDATE, materialize the conflict as a row both transactions must update, or express the rule as a database constraint.

Q: What is serializable snapshot isolation?
A: An extension of snapshot isolation that tracks read-write dependencies between concurrent transactions. When it detects a pattern that could produce a non-serializable result, such as two transactions each reading data the other writes, it aborts one of them, giving full serializability with snapshot reads.
