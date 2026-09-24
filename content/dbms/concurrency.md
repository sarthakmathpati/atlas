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

## dbms.concurrency.isolation-levels
name: "Isolation levels"
importance: must
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "read uncommitted, read committed, repeatable read, serializable"

## dbms.concurrency.read-anomalies
name: "Read anomalies"
importance: must
prereqs: [dbms.concurrency.isolation-levels]
scope: "dirty read, non-repeatable read, phantom read, lost update"

## dbms.concurrency.deadlocks-in-databases
name: "Deadlocks in databases"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "detection and prevention"

## dbms.concurrency.timestamp-ordering-protocols
name: "Timestamp ordering protocols"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "Timestamp ordering protocols"

## dbms.concurrency.mvcc
name: "MVCC"
importance: must
prereqs: [dbms.concurrency.isolation-levels]
scope: "multi-version concurrency control"

## dbms.concurrency.optimistic-vs-pessimistic-concurrency
name: "Optimistic vs pessimistic concurrency"
importance: important
prereqs: [dbms.concurrency.lock-based-protocols]
scope: "Optimistic vs pessimistic concurrency"

## dbms.concurrency.write-skew-and-snapshot-isolation
name: "Write skew and snapshot isolation"
importance: advanced
prereqs: [dbms.concurrency.mvcc]
scope: "Write skew and snapshot isolation"
