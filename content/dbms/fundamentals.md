---
topic: dbms.fundamentals
name: "DBMS fundamentals"
subject: dbms
order: 1
prereqs: []
---

## dbms.fundamentals.dbms-vs-file-systems
name: "DBMS vs file systems"
importance: must
scope: "why databases exist"

### simple
A database management system is software that stores data safely and lets many programs read and change it at the same time without breaking it. Keeping data in plain files works for one small program, but it falls apart when a crash happens mid-update, when two users edit at once, or when you need a new kind of question answered. A database is like a well-run library with a catalog and a librarian, instead of books piled in a room.

### interview
- With plain **files**, every program handles format, search, locking and recovery itself, which leads to **redundancy and inconsistency** (the same data copied in several files), **hard access** (each new question needs new code), **integrity rules buried in code**, no **atomicity** (a crash leaves half-done updates), **concurrent access anomalies** (lost updates) and coarse **security**.
- A **DBMS** provides a declarative query language (SQL), **transactions** with ACID guarantees, **concurrency control**, **crash recovery** through logging, **integrity constraints**, **indexes** and a query optimizer, access control, and backup and replication.
- **Data independence**: applications work with a logical schema, so storage layouts and indexes can change without rewriting programs.
- Costs: the DBMS is software to run, tune and pay for; overhead makes it overkill for a single small file, logs, or very large blobs such as videos (stored as files with metadata in the database).
- Interview framing: "files store bytes; a database manages shared, structured data correctly under crashes and concurrency."

### deep
#### Intuition

Imagine a shop that keeps accounts in a text file. It works until two cashiers save at the same moment and one sale disappears, the power fails halfway through a transfer, or the owner asks "which customers bought twice this month?" and someone has to write a new program. Databases were built to solve these problems once, for everyone.

#### Worked example: a crash in the middle of a transfer

```cpp
#include <filesystem>
#include <fstream>

namespace fs = std::filesystem;

map<string, int> load(const fs::path& file) {
    map<string, int> accounts;
    ifstream in(file);
    string name;
    int balance;
    while (in >> name >> balance) accounts[name] = balance;
    return accounts;
}

void save(const fs::path& file, const map<string, int>& accounts) {
    ofstream out(file, ios::trunc);
    for (auto& [name, balance] : accounts) out << name << " " << balance << "\n";
}

void transfer(const fs::path& file, const string& from, const string& to, int amount,
              bool crash) {
    auto accounts = load(file);
    accounts[from] -= amount;
    save(file, accounts);                            // the debit reaches the file
    if (crash) return;                               // the program dies here
    accounts[to] += amount;
    save(file, accounts);                            // the credit would follow
}

int total(const fs::path& file) {
    int sum = 0;
    for (auto& [name, balance] : load(file)) sum += balance;
    return sum;
}

int main() {
    fs::path file = fs::temp_directory_path() / "atlas-accounts.txt";
    save(file, {{"asha", 500}, {"ravi", 300}});
    transfer(file, "asha", "ravi", 100, false);
    cout << "after a normal transfer: total " << total(file) << "\n";
    transfer(file, "asha", "ravi", 100, true);
    cout << "after a crash mid-transfer: total " << total(file) << "\n";
    fs::remove(file);
}
```

Output:

```text
after a normal transfer: total 800
after a crash mid-transfer: total 700
```

100 rupees vanished. A database runs the two updates as one **transaction**: its log lets recovery undo the debit after the crash (or redo both if the commit was recorded), so the total is always 800. Two programs transferring at once would add a second problem, lost updates, which the database prevents with locks or versioning.

#### File system vs DBMS

| problem | with files | with a DBMS |
|---|---|---|
| a new question | write a new program to scan files | write a query: `SELECT ... WHERE ...` |
| duplicate data | each app keeps its own copy, copies drift | one shared, normalized copy |
| rules (balance never negative) | checked (or forgotten) in every program | declared once as constraints |
| crash in the middle | half-written data | atomic transactions, recovery from the log |
| two users at once | lost updates, corrupted files | concurrency control |
| finding one record | scan everything | indexes |
| who may see what | file permissions, all or nothing | per-table, per-column grants and views |

#### When files are still right

Append-only logs, configuration, large media (store the file in object storage, and its path and metadata in the database), and data processed in bulk by analytics engines (Parquet files in a data lake) are often better as files. Many databases themselves store their data in files; the point is the management layer on top.

#### Pitfalls

- "A database is just a faster file": the real value is correctness under concurrency and crashes.
- Treating spreadsheets or JSON files as a shared database for a growing app: the same anomalies appear as soon as two people edit.

Connects to: ACID properties, logs and write-ahead logging, data models, schema vs instance, three-schema architecture, data independence.

### questions
Q: What problems of file-based data storage does a DBMS solve?
A: Redundancy and inconsistency across files, the need to write new programs for each question, integrity rules scattered in application code, lack of atomicity when a crash interrupts an update, anomalies when several users update at once, and weak security. A DBMS centralizes the data and provides queries, constraints, transactions, concurrency control, recovery and access control.

Q: What happens if a program crashes halfway through updating two related files?
A: One file may contain the new value and the other the old one, leaving the data inconsistent; in a money transfer, money disappears or is duplicated. A database wraps both changes in a transaction and uses its log to roll back or complete it during recovery.

Q: What is data independence and why does it matter?
A: Applications depend only on the logical schema, not on how data is physically stored. The database can add indexes, change file layouts or move data without any application change, and with logical independence some schema changes can be hidden behind views.

Q: When would you store data in files rather than a database?
A: For large binary objects such as images and videos, append-only logs, configuration, and bulk analytics data processed by specialized engines. Metadata and anything shared, queried or updated concurrently still belongs in a database.

## dbms.fundamentals.data-models
name: "Data models"
importance: important
prereqs: [dbms.fundamentals.dbms-vs-file-systems]
scope: "relational, document, key-value, graph"

### simple
A data model is the shape in which a database stores and lets you think about data: tables, documents, key-value pairs or graphs. It is like choosing between a spreadsheet, a folder of index cards, a coat check, or a map of who knows whom. Each shape makes some questions easy and others awkward.

### interview
- **Relational**: data in **tables** (relations) of rows and typed columns, linked by keys; queried with SQL; strong integrity and joins. PostgreSQL, MySQL, SQL Server, Oracle.
- **Document**: self-contained **JSON-like documents** with nested fields and arrays; flexible schema; great when data is read and written as a whole aggregate (a product with its variants). MongoDB, Couchbase.
- **Key-value**: a giant dictionary from key to opaque value; extremely fast lookups by key, little else. Redis, DynamoDB (also document-like), Memcached.
- **Wide-column**: rows grouped by a partition key with many sorted columns; built for huge write volumes spread over many machines. Cassandra, HBase, Bigtable.
- **Graph**: **nodes** and **edges** with properties; queries follow relationships (friends of friends, shortest paths). Neo4j, Amazon Neptune.
- Older models: hierarchical (trees, IBM IMS) and network (CODASYL). The choice follows the **access patterns**; many systems use several (polyglot persistence).

### deep
#### One piece of data, four shapes

A user with two orders.

**Relational**: three tables joined by keys.

| users | orders | order_items |
|---|---|---|
| id 7, name Asha | id 101, user_id 7, total 450 | order_id 101, product "lamp", qty 1 |
| | id 102, user_id 7, total 90 | order_id 102, product "bulb", qty 3 |

**Document**: one nested document per user (or per order).

```json
{ "_id": 7, "name": "Asha",
  "orders": [ { "id": 101, "total": 450, "items": [ { "product": "lamp", "qty": 1 } ] },
              { "id": 102, "total": 90,  "items": [ { "product": "bulb", "qty": 3 } ] } ] }
```

**Key-value**: `user:7` → the serialized user, `order:101` → the serialized order. The database cannot look inside the values.

**Graph**: `(Asha)-[:PLACED]->(Order 101)-[:CONTAINS]->(lamp)`, and a query like "people who bought what my friends bought" follows edges instead of joining tables.

#### Choosing

| need | good fit |
|---|---|
| many relationships, ad hoc queries, strict integrity, transactions | relational |
| aggregates read and written whole, fields that vary per record | document |
| lookups by key at very high speed, caching, sessions | key-value |
| enormous write rates, time series, data spread over many nodes | wide-column |
| deep relationship traversal: social graphs, recommendations, fraud rings | graph |

The lines blur: PostgreSQL stores and indexes JSON, MongoDB supports transactions, and DynamoDB is both key-value and document. In interviews, justify the model from the queries the system must answer.

Connects to: DBMS vs file systems, NoSQL types, SQL vs NoSQL, ER to relational mapping.

### questions
Q: What is a data model?
A: The conceptual shape a database uses to organize data and the operations it supports on it, such as tables with SQL in the relational model, nested documents in the document model, opaque values under keys in the key-value model, or nodes and edges in the graph model.

Q: When is a document model a better fit than a relational one?
A: When data is naturally a self-contained aggregate that is read and written as a whole, such as a product with its variants or a user profile, and when fields vary between records. It avoids joins for those reads. It is weaker when data has many cross-references that need joins or strict consistency across documents.

Q: What kind of problem suits a graph database?
A: Problems dominated by relationships and multi-hop traversals, such as social networks, recommendations, fraud rings and dependency analysis. Following edges is a direct operation there, whereas a relational database needs a join per hop.

Q: What are the limitations of a key-value store?
A: It only supports fast get, put and delete by key; it cannot query by the contents of values, join, or aggregate without scanning. Applications must design keys around their access patterns and maintain any secondary lookups themselves.

## dbms.fundamentals.schema-vs-instance-three-schema-architecture-data-independence
name: "Schema vs instance, three-schema architecture, data independence"
importance: important
prereqs: [dbms.fundamentals.dbms-vs-file-systems]
scope: "Schema vs instance, three-schema architecture, data independence"

### simple
The schema is the design of a database, the tables and columns, while the instance is the actual data stored in it at a given moment. A schema is like the blank form, and the instance is the stack of filled-in forms right now. The three-schema architecture separates how users see the data, how it is logically organized, and how it is physically stored, so each can change without breaking the others.

### interview
- **Schema** (intension): the structure, meaning table definitions, types, constraints; changes rarely. **Instance** (extension, database state): the data at one moment; changes constantly.
- **Three-schema (ANSI/SPARC) architecture**: **external** level (views tailored to each user group), **conceptual** or logical level (all entities, relationships and constraints for the whole database), **internal** or physical level (files, pages, indexes, compression).
- Mappings connect the levels: external to conceptual, conceptual to internal.
- **Physical data independence**: change storage (add an index, move to SSDs, partition a table) without changing the conceptual schema or applications. Easy to achieve and common.
- **Logical data independence**: change the conceptual schema (split a table, add a column) without changing external views or applications. Harder: views can hide some changes, not all.

### deep
#### The three levels

```text
external level      [ view: students_public ]  [ view: fees_for_accounts ]  [ app query ]
                                  \                     |                      /
conceptual level        students(id, name, dept, dob, fee_due), departments(...), ...
                                                        |
internal level          heap files, B+ tree on students(id), pages, compression
```

#### Worked example: independence in action

1. **Physical**: the DBA adds an index on `students(dept)` and moves the table to faster disks. Queries return the same results, only faster; no application changes.
2. **Logical**: the team splits `students` into `students(id, name, dept, dob)` and `student_fees(id, fee_due)`. A view named like the old table joins the two back together:

```sql
CREATE VIEW students_v AS
SELECT s.id, s.name, s.dept, s.dob, f.fee_due
FROM students s JOIN student_fees f ON f.id = s.id;
```

Applications that only read keep working through the view. Writes through such a view are limited (a join view is often not updatable), which is why logical independence is only partial in practice.

#### Schema changes in practice

Changing a live schema is a migration: add columns as nullable or with defaults, backfill, deploy code that uses both shapes, then remove the old one. Keeping applications behind views or a data access layer is the practical form of logical data independence.

Connects to: DBMS vs file systems, views and materialized views, database users and languages, clustered vs non-clustered indexes.

### questions
Q: What is the difference between a schema and an instance?
A: The schema is the database's structure: its tables, columns, types and constraints, which change rarely. The instance is the actual data stored at a particular moment, which changes with every insert, update and delete.

Q: Describe the three-schema architecture.
A: The external level holds views tailored to particular users or applications, the conceptual level describes the whole database's entities, relationships and constraints, and the internal level describes physical storage such as files, pages and indexes. Mappings between the levels let each change independently.

Q: What is the difference between physical and logical data independence?
A: Physical independence means the storage layer can change, for example new indexes or file organization, without changing the conceptual schema or applications. Logical independence means the conceptual schema can change, such as splitting a table, without changing external views or applications, which is harder and usually achieved with views.

Q: Why is logical data independence harder to achieve than physical?
A: Applications are written against the logical structure, so changing it changes what queries mean. Views can reproduce the old shape for reads, but updates through complex views are often impossible, and removed information cannot be recreated.

## dbms.fundamentals.database-users-and-languages
name: "Database users and languages"
importance: important
scope: "DDL, DML, DCL, TCL"

### simple
Different people use a database in different ways: administrators run it, designers plan its structure, programmers write apps on top, and end users click through those apps. SQL has groups of commands for each kind of job: defining structure, changing data, granting permissions and controlling transactions. It is like a building where architects draw plans, managers hand out keys, and residents move furniture in and out.

### interview
- **DDL** (data definition): `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`: define and change the schema.
- **DML** (data manipulation): `SELECT`, `INSERT`, `UPDATE`, `DELETE` (some texts put `SELECT` alone in **DQL**).
- **DCL** (data control): `GRANT`, `REVOKE`: permissions on tables, columns, schemas.
- **TCL** (transaction control): `BEGIN` or `START TRANSACTION`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `ROLLBACK TO SAVEPOINT`.
- **Users**: the **DBA** (installation, security, backups, tuning), database designers (schemas), application programmers (queries in code), analysts writing ad hoc SQL, and naive end users working through apps.
- Gotchas: `TRUNCATE` is DDL; it removes all rows quickly and in MySQL commits implicitly and cannot be rolled back (PostgreSQL's can, inside a transaction). DDL in MySQL causes an implicit commit.

### deep
#### One of each

```sql
-- DDL: define structure
CREATE TABLE accounts (
    id      INT PRIMARY KEY,
    owner   VARCHAR(50) NOT NULL,
    balance INT NOT NULL CHECK (balance >= 0)
);

-- DML: change and read data
INSERT INTO accounts VALUES (1, 'asha', 500), (2, 'ravi', 300);
SELECT owner, balance FROM accounts WHERE balance > 400;

-- TCL: group changes into one transaction
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
SAVEPOINT after_debit;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- DCL: permissions (the role must exist)
GRANT SELECT ON accounts TO reporting;
REVOKE SELECT ON accounts FROM reporting;
```

`SAVEPOINT` marks a point inside a transaction: `ROLLBACK TO SAVEPOINT after_debit` would undo only the work after it, keeping the transaction open.

#### DELETE vs TRUNCATE vs DROP

| command | removes | logs each row | triggers fire | rollback |
|---|---|---|---|---|
| `DELETE FROM t WHERE ...` | chosen rows | yes | yes | yes |
| `TRUNCATE t` | all rows, keeps the table | no (deallocates pages) | no row triggers | PostgreSQL yes in a transaction; MySQL no |
| `DROP TABLE t` | the table itself | no | no | PostgreSQL yes in a transaction; MySQL no |

#### Least privilege

Applications should connect with an account that can only run the DML they need on their own tables, not as the owner or superuser. Reporting users get read-only grants, often on views that hide sensitive columns. That limits the damage of a bug or a SQL injection.

Connects to: schema vs instance, three-schema architecture, data independence, ACID properties, views and materialized views, stored procedures, functions and triggers.

### questions
Q: What are DDL, DML, DCL and TCL? Give examples.
A: DDL defines structure: CREATE, ALTER, DROP, TRUNCATE. DML reads and changes data: SELECT, INSERT, UPDATE, DELETE. DCL manages permissions: GRANT and REVOKE. TCL controls transactions: BEGIN, COMMIT, ROLLBACK and SAVEPOINT.

Q: What is the difference between DELETE, TRUNCATE and DROP?
A: DELETE removes selected rows, logs each one, fires triggers and can be rolled back. TRUNCATE removes all rows quickly by deallocating pages while keeping the table definition; it is DDL and, in MySQL, commits implicitly. DROP removes the table and its definition entirely.

Q: What does a database administrator do?
A: Installs and upgrades the database, manages users and permissions, plans capacity, sets up backups, replication and recovery, monitors and tunes performance, and enforces security and data policies.

Q: What is a savepoint?
A: A named point inside a transaction. Rolling back to it undoes only the changes made after it while keeping the transaction and its earlier changes open, which is useful for handling a failure in one step of a longer transaction.
