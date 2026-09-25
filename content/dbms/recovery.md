---
topic: dbms.recovery
name: "Recovery"
subject: dbms
order: 7
prereqs: [dbms.transactions]
---

## dbms.recovery.logs-and-write-ahead-logging
name: "Logs and write-ahead logging"
importance: important
scope: "undo and redo"

### simple
A database keeps a log, a diary of every change, written to disk before the change itself. After a crash, it reads the diary to redo the changes of transactions that finished and undo the changes of transactions that did not. It is like a builder's logbook: if the site floods overnight, the log says which work was signed off and must be rebuilt, and which half-done work must be torn out.

### interview
- The **log** is an append-only file of records: begin, update (transaction, page or row, **before image** and **after image**), commit, abort.
- **Write-ahead logging (WAL) rule**: a change's log record reaches stable storage **before** the changed data page does, and a transaction's **commit record** is on disk before the commit is acknowledged.
- **Redo** reapplies after images of committed transactions whose pages had not reached disk (durability). **Undo** restores before images of uncommitted transactions whose pages had (atomicity).
- Buffer policies: **steal** (uncommitted pages may be written to disk, so undo is needed) and **no-force** (committed pages need not be written at commit, so redo is needed). Steal plus no-force is the fast, common combination, and it needs both undo and redo.
- Commits are cheap because only the sequential log must be forced, not scattered data pages; many commits can share one log flush (**group commit**).
- The same log feeds replication and point-in-time recovery (PostgreSQL WAL shipping, the MySQL binary log for replication alongside InnoDB's redo log).

### deep
#### Intuition

Writing data pages to disk at every commit would mean random writes all over the disk. Instead, the database writes a small sequential log record and keeps pages in memory, flushing them later. The log is the source of truth: as long as it survives, any state can be rebuilt.

#### Code: crash and recovery

```cpp
struct LogRecord { int txn; string kind; string item; int before, after; };

void show(const string& label, const map<string, int>& disk) {
    cout << left << setw(19) << label;
    for (auto& [item, value] : disk) cout << " " << item << "=" << value;
    cout << "\n";
}

int main() {
    map<string, int> disk = {{"A", 100}, {"B", 200}, {"C", 50}};
    vector<LogRecord> log = {                        // already forced to disk (WAL)
        {1, "begin", "", 0, 0},
        {1, "update", "A", 100, 90},
        {1, "update", "B", 200, 210},
        {1, "commit", "", 0, 0},
        {2, "begin", "", 0, 0},
        {2, "update", "C", 50, 70},                  // T2 never commits
    };
    disk["C"] = 70;   // steal: the buffer manager wrote T2's dirty page before the crash
                      // no-force: T1's pages A and B were still only in memory
    show("disk after crash:", disk);

    set<int> committed;
    for (auto& r : log)
        if (r.kind == "commit") committed.insert(r.txn);

    for (auto& r : log)                              // redo: repeat history forward
        if (r.kind == "update") disk[r.item] = r.after;
    show("after redo:", disk);

    for (auto it = log.rbegin(); it != log.rend(); ++it)   // undo losers, newest first
        if (it->kind == "update" && !committed.count(it->txn)) disk[it->item] = it->before;
    show("after undo:", disk);
}
```

Output:

```text
disk after crash:   A=100 B=200 C=70
after redo:         A=90 B=210 C=70
after undo:         A=90 B=210 C=50
```

The committed transfer (A to B) was lost from disk because of no-force; redo brought it back. The uncommitted change to C was on disk because of steal; undo removed it. The result is exactly the committed state.

#### Why each rule exists

| rule | what breaks without it |
|---|---|
| log record before its data page | an uncommitted change on disk with no before image to undo it |
| commit record forced before replying | the client is told "committed", the machine crashes, and the log has no proof |
| redo pass | committed work only in memory at the crash would be lost |
| undo pass | uncommitted work flushed by steal would survive |

#### Pitfalls

- Disabling `fsync` or synchronous commit for speed: the database still works, until a power cut loses acknowledged commits (PostgreSQL's `synchronous_commit = off` risks a window of recent commits, not corruption; `fsync = off` risks corruption).
- Disks or controllers that lie about flushing (volatile write caches) break the WAL rule silently.
- The log grows forever unless checkpoints let old segments be recycled or archived.

Connects to: checkpoints, ACID properties, shadow paging and ARIES overview, journaling file systems, replication.

### questions
Q: What is write-ahead logging?
A: A rule that every change is first described in a log record that reaches stable storage before the changed data page is written, and that a transaction's commit record is forced to disk before the commit is acknowledged. The log then contains enough information to redo committed work and undo uncommitted work after a crash.

Q: What are undo and redo in recovery?
A: Redo reapplies the changes of committed transactions using the after images in the log, because their pages may not have reached disk. Undo reverses the changes of transactions that had not committed, using before images, because their pages may already be on disk.

Q: What do steal and no-force mean, and why are they used?
A: Steal lets the buffer manager write pages with uncommitted changes to disk, freeing memory; it requires undo. No-force means committed pages need not be written at commit time; it requires redo. Together they give the best performance, since commits only force the sequential log.

Q: Why is committing with a log faster than writing the data pages at commit?
A: The log is written sequentially and each commit adds only small records, often combined for many transactions in one flush, while data pages are scattered across the disk and would require many random writes. The pages are flushed later in the background.

## dbms.recovery.checkpoints
name: "Checkpoints"
importance: important
prereqs: [dbms.recovery.logs-and-write-ahead-logging]
scope: "speeding up recovery"

### simple
A checkpoint is a moment when the database writes its changed pages to disk and notes in the log that everything before this point is safely stored. After a crash, recovery can start reading the log from the last checkpoint instead of from the very beginning. It is like saving a game: if you lose, you restart from the save point, not from the first level.

### interview
- Without checkpoints, recovery would scan the **entire log**, and the log could never be trimmed.
- A **checkpoint** flushes dirty pages (or records which pages are dirty) and writes a checkpoint record listing the **active transactions**.
- **Consistent (quiescent) checkpoint**: pause new transactions, wait for active ones, flush everything. Simple, but the database stalls.
- **Fuzzy checkpoint**: keep running; record the active transactions and the dirty page table, and flush pages in the background. Recovery starts redo from the oldest change not yet on disk. ARIES and modern databases use this.
- **Undo** may still have to reach **before** the checkpoint for long transactions that were active at the time.
- Tuning: frequent checkpoints mean faster recovery but more write I/O (PostgreSQL `checkpoint_timeout`, `max_wal_size`); after a checkpoint, older log segments can be recycled or archived.

### deep
#### Code: how much log a checkpoint saves

The log below has transactions of four records each (begin, two updates, commit), one long-running transaction T11 that never commits, and a checkpoint taken while T11 was active.

```cpp
struct Rec { int txn; string kind; };

int main() {
    vector<Rec> log;
    auto shortTxn = [&](int t) {
        for (string k : {"begin", "update", "update", "commit"}) log.push_back({t, k});
    };
    for (int t = 1; t <= 10; ++t) shortTxn(t);
    log.push_back({11, "begin"});                    // a long transaction starts
    log.push_back({11, "update"});
    for (int t = 12; t <= 20; ++t) shortTxn(t);
    size_t checkpoint = log.size();
    log.push_back({0, "checkpoint (active: T11)"});   // pages flushed up to here
    for (int t = 21; t <= 25; ++t) shortTxn(t);
    log.push_back({11, "update"});                   // then the crash

    size_t redoFrom = checkpoint;                    // everything earlier is on disk
    set<int> committed;
    for (auto& r : log)
        if (r.kind == "commit") committed.insert(r.txn);
    size_t undoBackTo = log.size();
    for (size_t i = 0; i < log.size(); ++i)          // the oldest record of a loser
        if (log[i].txn && !committed.count(log[i].txn)) undoBackTo = min(undoBackTo, i);

    cout << "log records: " << log.size() << "\n";
    cout << "redo scans from record " << redoFrom << ": " << log.size() - redoFrom
         << " records\n";
    cout << "undo of T11 reaches back to record " << undoBackTo << "\n";
}
```

Output:

```text
log records: 100
redo scans from record 78: 22 records
undo of T11 reaches back to record 40
```

Redo reads 22 records instead of 100. Undo still walks back to record 40, where T11 began, which is why long-running transactions make recovery slower and keep old log segments alive. Undo follows each loser's own chain of records backwards, so it does not rescan everything in between.

#### Consistent vs fuzzy

| | consistent checkpoint | fuzzy checkpoint |
|---|---|---|
| new transactions during it | blocked | allowed |
| pages flushed | all, before the record is written | gradually, in the background |
| checkpoint record holds | "everything before is on disk" | active transactions and dirty pages with their oldest change |
| redo starts at | the checkpoint | the oldest change of any dirty page (can be before the checkpoint) |

PostgreSQL spreads checkpoint writes over time (`checkpoint_completion_target`) to avoid I/O spikes, and forces one when the WAL grows past `max_wal_size`.

Connects to: logs and write-ahead logging, shadow paging and ARIES overview, transaction states.

### questions
Q: Why do databases take checkpoints?
A: To limit how much of the log recovery must process after a crash and to allow old log segments to be recycled. After a checkpoint, changes recorded before it are known to be on disk, so redo can start there instead of at the beginning of the log.

Q: What is the difference between a consistent and a fuzzy checkpoint?
A: A consistent checkpoint stops new transactions, waits for active ones and flushes all dirty pages, so the log before it is not needed for redo, but the database stalls. A fuzzy checkpoint lets work continue, records the active transactions and dirty pages, and flushes pages in the background; recovery starts from the oldest change still missing from disk.

Q: Does recovery ever need log records from before the last checkpoint?
A: Yes. Transactions that were active at the checkpoint and never committed must be undone, and their earlier changes lie before it. With fuzzy checkpoints, redo may also start before the checkpoint for pages that were still dirty.

Q: What is the trade-off in how often checkpoints run?
A: Frequent checkpoints shorten recovery time and log storage but cause more write I/O, since hot pages are flushed repeatedly. Infrequent ones reduce write load but make crash recovery longer and require keeping more log.

## dbms.recovery.shadow-paging-and-aries-overview
name: "Shadow paging and ARIES overview"
importance: advanced
prereqs: [dbms.recovery.checkpoints]
scope: "Shadow paging and ARIES overview"

### simple
Shadow paging never overwrites data: a transaction writes changed pages to new places and, at commit, switches one pointer from the old page table to the new one, so a crash always leaves either the complete old version or the complete new one. ARIES is the log-based recovery method most big databases use instead, which replays history from the log and then undoes unfinished work. Shadow paging is like editing a copy of a document and swapping it in; ARIES is like a detailed diary that lets you reconstruct anything.

### interview
- **Shadow paging**: keep a current page table and a **shadow** (committed) page table. Updates are **copy-on-write** into new pages referenced by the current table; commit atomically switches the root pointer; abort just discards the new pages. No undo and no redo.
- Drawbacks: data fragments across the disk (bad for range scans), garbage pages need collection, committing requires flushing all changed pages and the page table, and concurrent transactions are hard to support. Its ideas live on in copy-on-write file systems and LMDB-style B-trees.
- **ARIES** (Algorithms for Recovery and Isolation Exploiting Semantics): WAL with **LSNs** (log sequence numbers) on every page, steal and no-force, fuzzy checkpoints.
- Three phases: **analysis** (from the last checkpoint, rebuild the transaction table and dirty page table), **redo** (**repeat history**: reapply all updates, even of losers, from the oldest dirty page's recLSN, skipping pages whose pageLSN shows the change is already there), **undo** (roll back losers, writing **compensation log records** so undo is never repeated after another crash).
- Used by DB2, SQL Server and others; PostgreSQL uses WAL redo but no undo pass, since MVCC simply ignores versions from aborted transactions.

### deep
#### Code: shadow paging in miniature

```cpp
struct Disk {
    vector<string> blocks;                           // physical blocks, never overwritten
    vector<int> committedTable;                      // page -> block: the shadow table
};

int main() {
    Disk disk{{"page0 v1", "page1 v1", "page2 v1"}, {0, 1, 2}};
    vector<int> current = disk.committedTable;       // the transaction's private copy
    disk.blocks.push_back("page1 v2");               // copy-on-write: a new block
    current[1] = disk.blocks.size() - 1;

    auto dump = [&](const vector<int>& table) {
        for (int b : table) cout << " " << disk.blocks[b];
        cout << "\n";
    };
    cout << "before commit, readers see:";
    dump(disk.committedTable);
    disk.committedTable = current;                   // commit: one atomic pointer switch
    cout << "after commit, readers see: ";
    dump(disk.committedTable);
    cout << "blocks on disk: " << disk.blocks.size() << " (block 1 is now garbage)\n";
}
```

Output:

```text
before commit, readers see: page0 v1 page1 v1 page2 v1
after commit, readers see:  page0 v1 page1 v2 page2 v1
blocks on disk: 4 (block 1 is now garbage)
```

A crash before the switch leaves the old table intact; a crash after it leaves the new one. Nothing needs replaying, but the old block must be garbage collected and page 1 now lives far from its neighbors.

#### ARIES in one table

| structure or phase | purpose |
|---|---|
| LSN on each log record | a total order of changes |
| pageLSN on each page | the last change applied to the page, so redo can skip work already done |
| prevLSN chain per transaction | undo walks one transaction's records backwards |
| dirty page table (recLSN) | the earliest change not yet on disk for each dirty page |
| analysis | find losers and where redo must start |
| redo | repeat history exactly, bringing the database to its state at the crash |
| undo | roll back losers, logging compensation records |

Repeating history, including losers' changes, makes redo simple and correct with fine-grained locking; compensation records make recovery itself crash-safe.

Connects to: logs and write-ahead logging, checkpoints, MVCC, copy-on-write, journaling file systems.

### questions
Q: How does shadow paging achieve atomicity?
A: Changed pages are written to new locations and recorded in a new page table, while the committed shadow table still points to the old pages. Commit atomically switches the root pointer to the new table; a crash before the switch leaves the old state and after it the new state, so no undo or redo is needed.

Q: What are the drawbacks of shadow paging?
A: Pages move around, destroying physical locality for scans; old pages become garbage to collect; every commit must write all changed pages and the page table; and supporting many concurrent transactions is difficult. That is why most databases use write-ahead logging instead.

Q: What are the three phases of ARIES recovery?
A: Analysis scans from the last checkpoint to rebuild the tables of active transactions and dirty pages. Redo repeats history from the earliest change that might be missing, reapplying every logged update whose effect is not already on the page. Undo rolls back transactions that had not committed, writing compensation log records.

Q: Why does ARIES redo the changes of transactions that will be undone?
A: Repeating history restores the exact state at the moment of the crash, including physical page layouts that other committed changes may depend on. The undo phase then removes the losers' effects through ordinary logged operations, which keeps the algorithm simple and correct with row-level locking.
