---
topic: dbms.nosql
name: "NoSQL and distributed databases"
subject: dbms
order: 9
prereqs: [dbms.indexing]
---

## dbms.nosql.nosql-types
name: "NoSQL types"
importance: must
scope: "key-value, document, wide-column, graph, and when to use each"

## dbms.nosql.sql-vs-nosql
name: "SQL vs NoSQL"
importance: must
prereqs: [dbms.nosql.nosql-types]
scope: "schema, scaling, consistency trade-offs"

## dbms.nosql.cap-theorem
name: "CAP theorem"
importance: must
prereqs: [dbms.nosql.sql-vs-nosql]
scope: "consistency, availability, partition tolerance"

## dbms.nosql.base-vs-acid
name: "BASE vs ACID"
importance: important
prereqs: [dbms.nosql.cap-theorem]
scope: "eventual consistency"

## dbms.nosql.replication
name: "Replication"
importance: must
scope: "leader-follower, multi-leader, leaderless"

## dbms.nosql.sharding-and-partitioning
name: "Sharding and partitioning"
importance: must
scope: "range vs hash partitioning, hot spots"

## dbms.nosql.consistent-hashing
name: "Consistent hashing"
importance: important
prereqs: [dbms.nosql.sharding-and-partitioning]
scope: "rebalancing with minimal movement"

## dbms.nosql.distributed-transactions
name: "Distributed transactions"
importance: advanced
scope: "two-phase commit, sagas"
