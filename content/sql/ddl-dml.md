---
topic: sql.ddl-dml
name: "Data definition and modification"
subject: sql
order: 6
prereqs: [sql.basics]
---

## sql.ddl-dml.create-and-alter-table
name: "CREATE and ALTER TABLE"
importance: important
scope: "data types and constraints"

## sql.ddl-dml.insert-update-and-delete
name: "INSERT, UPDATE and DELETE"
importance: important
prereqs: [sql.ddl-dml.create-and-alter-table]
scope: "safe modification, DELETE with joins"

## sql.ddl-dml.transactions-in-sql
name: "Transactions in SQL"
importance: important
prereqs: [sql.ddl-dml.insert-update-and-delete]
scope: "BEGIN, COMMIT, ROLLBACK"

## sql.ddl-dml.creating-indexes-in-practice
name: "Creating indexes in practice"
importance: important
prereqs: [sql.ddl-dml.create-and-alter-table]
scope: "CREATE INDEX and when to add one"
