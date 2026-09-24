---
topic: dbms.indexing
name: "Indexing and storage"
subject: dbms
order: 8
prereqs: [dbms.relational]
---

## dbms.indexing.why-indexes
name: "Why indexes"
importance: must
scope: "trading write cost and space for read speed"

## dbms.indexing.clustered-vs-non-clustered-indexes
name: "Clustered vs non-clustered indexes"
importance: must
prereqs: [dbms.indexing.why-indexes]
scope: "primary and secondary indexes"

## dbms.indexing.dense-vs-sparse-indexes
name: "Dense vs sparse indexes"
importance: important
prereqs: [dbms.indexing.clustered-vs-non-clustered-indexes]
scope: "Dense vs sparse indexes"

## dbms.indexing.b-trees-and-b-plus-trees
name: "B-trees and B+ trees"
importance: must
prereqs: [dbms.indexing.clustered-vs-non-clustered-indexes]
scope: "structure, why databases use B+ trees"

## dbms.indexing.hash-indexes
name: "Hash indexes"
importance: important
prereqs: [dbms.indexing.why-indexes]
scope: "equality lookups only"

## dbms.indexing.composite-and-covering-indexes
name: "Composite and covering indexes"
importance: must
prereqs: [dbms.indexing.b-trees-and-b-plus-trees]
scope: "leftmost prefix rule, index-only scans"

## dbms.indexing.when-indexes-hurt
name: "When indexes hurt"
importance: important
prereqs: [dbms.indexing.composite-and-covering-indexes]
scope: "writes, low selectivity, functions on columns"

## dbms.indexing.query-plans
name: "Query plans"
importance: important
prereqs: [dbms.indexing.why-indexes]
scope: "reading EXPLAIN output"

## dbms.indexing.join-algorithms
name: "Join algorithms"
importance: advanced
prereqs: [dbms.indexing.query-plans]
scope: "nested loop, hash join, sort-merge join"

## dbms.indexing.lsm-trees
name: "LSM trees"
importance: advanced
prereqs: [dbms.indexing.b-trees-and-b-plus-trees]
scope: "write-optimized storage (links to NoSQL)"
