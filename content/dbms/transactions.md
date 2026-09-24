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

## dbms.transactions.transaction-states
name: "Transaction states"
importance: important
prereqs: [dbms.transactions.acid-properties]
scope: "active, partially committed, committed, failed, aborted"

## dbms.transactions.schedules-and-serializability
name: "Schedules and serializability"
importance: must
prereqs: [dbms.transactions.acid-properties]
scope: "conflict serializability, precedence graphs"

## dbms.transactions.view-serializability
name: "View serializability"
importance: important
prereqs: [dbms.transactions.schedules-and-serializability]
scope: "View serializability"

## dbms.transactions.recoverable-schedules
name: "Recoverable schedules"
importance: important
prereqs: [dbms.transactions.schedules-and-serializability]
scope: "cascading rollbacks, cascadeless and strict schedules"
