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

### simple
CREATE TABLE describes a new table: its columns, the type of data each holds, and the rules every row must follow. ALTER TABLE changes that description later, such as adding a column. It is like designing a paper form with labelled boxes and "required" marks, so wrong or missing answers are refused at the door.

### interview
- **Types**: `INT`/`BIGINT` (ids that may exceed 2.1 billion need `BIGINT`), `DECIMAL(p, s)` for money (never `FLOAT`/`DOUBLE`, which can't hold 0.1 exactly), `VARCHAR(n)`/`TEXT`, `DATE`, `DATETIME`/`TIMESTAMP`, `BOOLEAN` (a `TINYINT(1)` in MySQL), `JSON`.
- **Constraints** keep bad data out: `PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK` (enforced by MySQL only from **8.0.16**; earlier versions parsed and ignored it), `FOREIGN KEY ... REFERENCES` with `ON DELETE CASCADE | SET NULL | RESTRICT`, `DEFAULT`.
- Auto-generated keys: `AUTO_INCREMENT` in MySQL; `GENERATED ALWAYS AS IDENTITY` (or the older `SERIAL`) in PostgreSQL.
- `ALTER TABLE` adds, changes (`MODIFY` in MySQL, `ALTER COLUMN ... TYPE` in PostgreSQL), renames or drops columns and constraints. On big tables it can lock or rewrite the table: MySQL 8 adds columns instantly (`ALGORITHM=INSTANT`), PostgreSQL 11+ adds a column with a constant default without a rewrite, but changing a type or adding `NOT NULL` checks every row.
- **DDL and transactions**: PostgreSQL DDL is transactional (a `CREATE TABLE` can be rolled back); MySQL commits implicitly before and after DDL.
- MySQL `TIMESTAMP` is stored in UTC and ends in 2038; `DATETIME` has no time zone and reaches year 9999.

### deep
#### A table with its rules

```sql
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL
);
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT
);

INSERT INTO customers (email, name) VALUES ('asha@example.com', 'Asha');
INSERT INTO orders (customer_id, amount) VALUES (1, 499.50);
INSERT INTO orders (customer_id, amount) VALUES (1, -5);       -- error 3819: check constraint
INSERT INTO orders (customer_id, amount) VALUES (7, 100);      -- error 1452: foreign key fails
INSERT INTO customers (email, name) VALUES ('asha@example.com', 'A');  -- error 1062: duplicate
INSERT INTO customers (email) VALUES ('ravi@example.com');     -- error 1364: no default for name

SELECT id, customer_id, amount, status FROM orders;
```

Result:

| id | customer_id | amount | status |
|---|---|---|---|
| 1 | 1 | 499.50 | pending |

Four bad rows were refused by the database itself, whatever application sent them: a negative amount (`CHECK`), an order for a customer who doesn't exist (`FOREIGN KEY`), a second account with the same email (`UNIQUE`), a customer without a name (`NOT NULL`, which strict mode reports as "Field 'name' doesn't have a default value"). The one good order got its `status` and `placed_at` from the defaults.

#### Why DECIMAL for money

```sql
SELECT 0.1e0 + 0.2e0 = 0.3e0 AS with_double, 0.1 + 0.2 = 0.3 AS with_decimal;
```

Result:

| with_double | with_decimal |
|---|---|
| 0 | 1 |

In MySQL a literal with an exponent, `0.1e0`, is a binary floating-point `DOUBLE`, which can only approximate 0.1, so the sum is 0.30000000000000004. Decimal literals and `DECIMAL` columns store base-10 digits exactly. (PostgreSQL reads `0.1e0` as an exact `numeric`; the same experiment there needs `0.1::float8`, which also gives false.) Many systems store money as an integer number of cents (`BIGINT`) for the same reason.

#### Changing a table

```sql
ALTER TABLE orders ADD COLUMN coupon VARCHAR(20) NULL;
ALTER TABLE orders MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE customers ADD CONSTRAINT email_has_at CHECK (email LIKE '%@%');

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' ORDER BY ORDINAL_POSITION;
```

Result:

| COLUMN_NAME | COLUMN_TYPE | IS_NULLABLE |
|---|---|---|
| id | bigint | NO |
| customer_id | int | NO |
| amount | decimal(10,2) | NO |
| status | varchar(20) | NO |
| placed_at | datetime | NO |
| coupon | varchar(20) | YES |

Adding a constraint checks the existing rows first, so it fails if any row already breaks it. In PostgreSQL, the column change is `ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20)` (plus separate `SET NOT NULL` and `SET DEFAULT` clauses), and new constraints can be added `NOT VALID` and validated later to avoid a long lock.

#### MySQL and PostgreSQL

| topic | MySQL 8 | PostgreSQL 16 |
|---|---|---|
| auto ids | `AUTO_INCREMENT` | `GENERATED ALWAYS AS IDENTITY` |
| boolean | `TINYINT(1)`, `TRUE` is 1 | real `boolean` |
| `CHECK` | enforced from 8.0.16 | always enforced |
| DDL in a transaction | implicit commit, can't roll back | transactional, can roll back |
| index on a foreign key column | created automatically by InnoDB | not created: add it yourself |

The last row matters in practice: in PostgreSQL, deleting a customer checks `orders.customer_id` for references, which is a full scan of orders unless you indexed that column.

Connects to: integrity constraints, keys, INSERT, UPDATE and DELETE, creating indexes in practice, transactions in SQL.

### questions
Q: Why store money in DECIMAL rather than FLOAT?
A: FLOAT and DOUBLE are binary fractions, so values like 0.1 are stored approximately and sums drift, for example 0.1 + 0.2 is not exactly 0.3. DECIMAL stores base-10 digits exactly, and so does an integer count of cents.

Q: What constraints can a table declare, and why declare them in the database?
A: PRIMARY KEY, NOT NULL, UNIQUE, CHECK, FOREIGN KEY and DEFAULT. The database enforces them for every writer, including scripts, other services and manual fixes, so invalid data can't slip in through a path the application didn't guard.

Q: Can you roll back a CREATE TABLE?
A: In PostgreSQL yes, because DDL is transactional. In MySQL no: DDL statements commit the current transaction implicitly before and after they run, so they can't be undone with ROLLBACK.

Q: What should you watch out for when altering a large table?
A: Some changes rewrite or scan the whole table while holding locks, such as changing a column type or adding NOT NULL or a constraint that must be checked. Use operations the database does instantly or online (adding a nullable column, MySQL's ALGORITHM=INSTANT, PostgreSQL's NOT VALID then VALIDATE) or an online migration tool.

## sql.ddl-dml.insert-update-and-delete
name: "INSERT, UPDATE and DELETE"
importance: important
prereqs: [sql.ddl-dml.create-and-alter-table]
scope: "safe modification, DELETE with joins"

### simple
INSERT adds rows, UPDATE changes values in existing rows, and DELETE removes rows. UPDATE and DELETE act on every row their WHERE clause matches, so a missing or wrong WHERE can change the whole table in one go. It is like a find-and-replace: always check what it will match before you press the button.

### interview
- `INSERT INTO t (cols) VALUES (...), (...)` (several rows at once is much faster than one per statement), `INSERT INTO t (cols) SELECT ...` to copy data.
- **Upsert**: MySQL `INSERT ... AS new ON DUPLICATE KEY UPDATE qty = qty + new.qty` (8.0.19+; older code uses `VALUES(qty)`); PostgreSQL `INSERT ... ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + EXCLUDED.qty`. `INSERT IGNORE` silently skips rows with errors: avoid it.
- **Safe changes**: run the `WHERE` as a `SELECT` first, do it inside a transaction, check the affected row count, and keep backups. MySQL's `--safe-updates` mode refuses `UPDATE`/`DELETE` without a key condition.
- **Joins in modifications**: MySQL `UPDATE a JOIN b ON ... SET a.x = b.y` and `DELETE a FROM a JOIN b ON ...`; PostgreSQL `UPDATE a SET x = b.y FROM b WHERE ...` and `DELETE FROM a USING b WHERE ...`.
- MySQL can't read the target table in a subquery of the same `UPDATE`/`DELETE` (error 1093): use a join or wrap the subquery in a derived table.
- `DELETE` removes rows one by one (logged, fires triggers, can be rolled back); `TRUNCATE` empties the table quickly; `DROP` removes the table.
- Big changes in batches: MySQL allows `DELETE ... ORDER BY id LIMIT 1000`; PostgreSQL doesn't take `LIMIT` on `DELETE` (use `WHERE id IN (SELECT id ... LIMIT 1000)`). PostgreSQL's `RETURNING` gives back the changed rows; MySQL has no `RETURNING`.

### deep
#### Removing duplicates, keeping the oldest row

```sql
CREATE TABLE subscribers (id INT PRIMARY KEY, email VARCHAR(50) NOT NULL);
INSERT INTO subscribers VALUES (1, 'asha@example.com'), (2, 'ravi@example.com'),
  (3, 'asha@example.com'), (4, 'meera@example.com'), (5, 'asha@example.com'),
  (6, 'ravi@example.com');

-- 1. look before you delete
SELECT s1.id FROM subscribers s1
JOIN subscribers s2 ON s1.email = s2.email AND s1.id > s2.id
ORDER BY s1.id;
```

Result:

| id |
|---|
| 3 |
| 5 |
| 5 |
| 6 |

Row 5 appears twice because it has two older twins (1 and 3); the delete below removes it once. Rows 3, 5 and 6 each have an older row with the same email, so they are the ones to go.

```sql
-- 2. delete them (MySQL multi-table DELETE)
DELETE s1 FROM subscribers s1
JOIN subscribers s2 ON s1.email = s2.email AND s1.id > s2.id;

SELECT id, email FROM subscribers ORDER BY id;
```

Result:

| id | email |
|---|---|
| 1 | asha@example.com |
| 2 | ravi@example.com |
| 4 | meera@example.com |

A tempting alternative, `DELETE FROM subscribers WHERE id NOT IN (SELECT MIN(id) FROM subscribers GROUP BY email)`, fails in MySQL with error 1093 because the subquery reads the table being deleted from; wrapping it, `... NOT IN (SELECT keep FROM (SELECT MIN(id) AS keep FROM subscribers GROUP BY email) AS k)`, works. In PostgreSQL the plain subquery version runs as written, and the join form is `DELETE FROM subscribers s1 USING subscribers s2 WHERE s1.email = s2.email AND s1.id > s2.id`. Afterwards, add `UNIQUE (email)` so duplicates can't come back.

#### Update with a join

```sql
CREATE TABLE products (sku VARCHAR(10) PRIMARY KEY, price INT NOT NULL);
CREATE TABLE price_changes (sku VARCHAR(10) PRIMARY KEY, new_price INT NOT NULL);
INSERT INTO products VALUES ('pen', 30), ('mug', 250), ('lamp', 900);
INSERT INTO price_changes VALUES ('mug', 199), ('lamp', 950), ('desk', 5000);

UPDATE products p
JOIN price_changes c ON c.sku = p.sku
SET p.price = c.new_price;

SELECT sku, price FROM products ORDER BY sku;
```

Result:

| sku | price |
|---|---|
| lamp | 950 |
| mug | 199 |
| pen | 30 |

Only products with a matching change were updated; 'desk' isn't a product, so the inner join ignores it. PostgreSQL: `UPDATE products p SET price = c.new_price FROM price_changes c WHERE c.sku = p.sku`.

#### Upsert

```sql
CREATE TABLE inventory (sku VARCHAR(10) PRIMARY KEY, qty INT NOT NULL);
INSERT INTO inventory VALUES ('pen', 10);

INSERT INTO inventory (sku, qty) VALUES ('pen', 5), ('mug', 3) AS new
ON DUPLICATE KEY UPDATE qty = inventory.qty + new.qty;

SELECT sku, qty FROM inventory ORDER BY sku;
```

Result:

| sku | qty |
|---|---|
| mug | 3 |
| pen | 15 |

The existing pen row was incremented and the new mug row inserted, atomically, in one statement: no "check if it exists, then insert or update" race between two clients. PostgreSQL: `INSERT INTO inventory VALUES ('pen', 5), ('mug', 3) ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + EXCLUDED.qty`.

#### A safety checklist

1. Write the `WHERE` as a `SELECT` and read the rows (and their count).
2. `START TRANSACTION`, run the change, compare the affected row count with step 1, then `COMMIT` or `ROLLBACK`.
3. For millions of rows, work in batches of a few thousand to keep locks, undo logs and replication lag small.

Connects to: CREATE and ALTER TABLE, transactions in SQL, finding duplicates, subqueries, inner join.

### questions
Q: How do you delete duplicate rows but keep one of each?
A: Pair each row with an older row that has the same key and delete the newer ones: in MySQL DELETE s1 FROM t s1 JOIN t s2 ON s1.email = s2.email AND s1.id > s2.id. Alternatives keep ROW_NUMBER() = 1 per key or MIN(id) per group. Then add a UNIQUE constraint so duplicates can't return.

Q: How do you update rows of one table from another table?
A: In MySQL with a multi-table UPDATE: UPDATE a JOIN b ON a.key = b.key SET a.col = b.col. In PostgreSQL with UPDATE a SET col = b.col FROM b WHERE a.key = b.key. Only rows with a match change.

Q: What is an upsert and how do you write one?
A: Insert a row, or update it if a row with the same unique key exists, atomically. MySQL uses INSERT ... ON DUPLICATE KEY UPDATE, PostgreSQL uses INSERT ... ON CONFLICT (key) DO UPDATE. It avoids the race of checking first and then inserting.

Q: What is the difference between DELETE, TRUNCATE and DROP?
A: DELETE removes the rows matching a WHERE, one by one, firing triggers and logging each change, and can be rolled back. TRUNCATE removes all rows at once by resetting the table's storage, much faster, and resets auto-increment counters. DROP removes the table itself.

Q: How do you make a risky UPDATE safer?
A: Preview the affected rows with a SELECT using the same WHERE, run the UPDATE inside a transaction, check that the affected row count matches, then commit. For very large changes, update in batches.

## sql.ddl-dml.transactions-in-sql
name: "Transactions in SQL"
importance: important
prereqs: [sql.ddl-dml.insert-update-and-delete]
scope: "BEGIN, COMMIT, ROLLBACK"

### simple
A transaction groups several statements so that they all happen or none do. Moving money between two accounts needs a debit and a credit; if something fails halfway, a rollback undoes the debit. It is like a shopping basket: nothing is yours until you pay, and you can put everything back before that.

### interview
- `START TRANSACTION` (or `BEGIN`) ... `COMMIT` makes changes permanent; `ROLLBACK` undoes everything since the start. Without an explicit transaction, **autocommit** makes every statement its own transaction (both databases).
- `SAVEPOINT s` and `ROLLBACK TO SAVEPOINT s` undo part of a transaction.
- **Errors differ**: in MySQL a failed statement is rolled back on its own and the transaction continues (you decide to commit or roll back); in PostgreSQL any error aborts the whole transaction, and every later statement fails until `ROLLBACK` (or a rollback to a savepoint).
- **DDL**: MySQL commits implicitly around `CREATE`/`ALTER`/`DROP`; PostgreSQL can roll them back.
- **Isolation**: `SET TRANSACTION ISOLATION LEVEL ...`. Defaults: InnoDB **repeatable read**, PostgreSQL **read committed**.
- Locking reads: `SELECT ... FOR UPDATE` locks rows until commit (read-modify-write safely); `FOR SHARE`; `NOWAIT` and `SKIP LOCKED` (both databases) for job queues.
- Keep transactions short: open transactions hold locks and old row versions, and one forgotten open transaction can block writers or bloat the database.

### deep
#### A transfer that must be all or nothing

```sql
CREATE TABLE accounts (id INT PRIMARY KEY, owner VARCHAR(10) NOT NULL,
                       balance INT NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 'asha', 500), (2, 'ravi', 100);

START TRANSACTION;
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
UPDATE accounts SET balance = balance + 200 WHERE id = 2;
COMMIT;

START TRANSACTION;
UPDATE accounts SET balance = balance + 400 WHERE id = 2;
UPDATE accounts SET balance = balance - 400 WHERE id = 1;  -- error 3819: balance would be -100
ROLLBACK;

SELECT id, owner, balance FROM accounts ORDER BY id;
```

Result:

| id | owner | balance |
|---|---|---|
| 1 | asha | 300 |
| 2 | ravi | 300 |

The first transfer committed. In the second, the credit to Ravi succeeded, the debit failed the `CHECK`, and the application rolled back, which also undid the credit. Without the transaction, Ravi would have received 400 that never left Asha's account.

#### Savepoints

```sql
START TRANSACTION;
INSERT INTO accounts VALUES (3, 'meera', 50);
SAVEPOINT before_bonus;
UPDATE accounts SET balance = balance + 1000 WHERE id = 3;
ROLLBACK TO SAVEPOINT before_bonus;
COMMIT;

SELECT id, balance FROM accounts WHERE id = 3;
```

Result:

| id | balance |
|---|---|
| 3 | 50 |

The insert survived; only the work after the savepoint was undone.

#### When a statement fails: MySQL vs PostgreSQL

```sql
START TRANSACTION;
INSERT INTO accounts VALUES (4, 'kabir', 10);
INSERT INTO accounts VALUES (4, 'kabir', 10);  -- error 1062: duplicate key
INSERT INTO accounts VALUES (5, 'zoya', 20);
COMMIT;

SELECT id FROM accounts WHERE id IN (4, 5) ORDER BY id;
```

Result:

| id |
|---|
| 4 |
| 5 |

MySQL rolled back only the failed statement; the other two inserts committed. The same script in PostgreSQL:

```sql
-- PostgreSQL
CREATE TABLE accounts (id INT PRIMARY KEY, owner TEXT NOT NULL, balance INT NOT NULL);
BEGIN;
INSERT INTO accounts VALUES (4, 'kabir', 10);
INSERT INTO accounts VALUES (4, 'kabir', 10);  -- error: duplicate key value
INSERT INTO accounts VALUES (5, 'zoya', 20);   -- error: current transaction is aborted
COMMIT;

SELECT count(*) AS n FROM accounts;
```

Result:

| n |
|---|
| 0 |

After the first error, PostgreSQL refuses everything ("current transaction is aborted, commands ignored until end of transaction block"), and `COMMIT` performs a rollback, so nothing was saved, not even row 4. Code that catches an error and carries on must, in PostgreSQL, roll back to a savepoint first. In MySQL it must decide explicitly, since committing would keep the statements that did succeed.

#### Locking reads for read-modify-write

`SELECT balance FROM accounts WHERE id = 1 FOR UPDATE` inside a transaction locks the row until commit, so a concurrent transfer can't read the old balance and overwrite your update (the lost update). Job queues use `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 10` so several workers take different jobs without waiting on each other.

Connects to: ACID properties, isolation levels, lost updates and locking, deadlocks, INSERT, UPDATE and DELETE.

### questions
Q: What do COMMIT and ROLLBACK do?
A: COMMIT makes all the changes of the current transaction permanent and visible to others. ROLLBACK undoes every change since the transaction began. Together they give atomicity: all of the transaction's statements take effect, or none do.

Q: What happens in PostgreSQL when a statement inside a transaction fails?
A: The whole transaction enters an aborted state: every later statement fails with "current transaction is aborted" until ROLLBACK, and a COMMIT then rolls back. MySQL instead rolls back only the failed statement and lets the transaction continue. Savepoints let PostgreSQL code recover from an expected error.

Q: What is autocommit?
A: The default mode in which each statement runs as its own transaction and commits immediately. Starting a transaction explicitly with BEGIN or START TRANSACTION groups statements until COMMIT or ROLLBACK.

Q: Why keep transactions short?
A: An open transaction holds row locks that block other writers, keeps old row versions alive (undo logs in InnoDB, dead tuples in PostgreSQL), and can cause long waits or deadlocks. Do slow work such as network calls outside the transaction.

Q: What does SELECT ... FOR UPDATE SKIP LOCKED do?
A: It locks the selected rows for the rest of the transaction but skips rows other transactions have already locked instead of waiting. Several workers can then pull different jobs from the same queue table concurrently.

## sql.ddl-dml.creating-indexes-in-practice
name: "Creating indexes in practice"
importance: important
prereqs: [sql.ddl-dml.create-and-alter-table]
scope: "CREATE INDEX and when to add one"

### simple
An index is a sorted lookup structure, like the index at the back of a book, that lets the database jump straight to matching rows instead of reading the whole table. You create one on the columns your frequent queries search, join or sort by. Each index speeds up some reads but makes every write a little slower and uses space.

### interview
- `CREATE INDEX idx_orders_customer ON orders (customer_id)`; `CREATE UNIQUE INDEX` also enforces uniqueness. Primary keys are indexed automatically.
- **Add one for** columns in frequent `WHERE`, `JOIN` and `ORDER BY` clauses that are **selective** (return a small share of rows). A column like `status` with two values rarely helps alone.
- **Composite indexes** follow the **leftmost prefix** rule: `(customer_id, placed_on)` serves `customer_id = ?`, `customer_id = ? AND placed_on > ?` and `customer_id = ? ORDER BY placed_on`, but not `placed_on = ?` alone. Put equality columns first, then the range or sort column.
- **Covering index**: when the index holds every column the query needs, the table isn't touched ("Using index" in MySQL, Index Only Scan in PostgreSQL).
- Functions hide columns: `WHERE LOWER(email) = ?` needs a **functional index** (MySQL 8.0.13+ `((LOWER(email)))`, PostgreSQL `(lower(email))`). PostgreSQL also has **partial indexes** (`WHERE status = 'pending'`) and `CREATE INDEX CONCURRENTLY` (no write lock); MySQL builds indexes online and has **invisible indexes** to test a drop safely.
- Foreign keys: InnoDB indexes them automatically; PostgreSQL doesn't, and unindexed foreign keys make joins and parent deletes slow.
- Always confirm with `EXPLAIN`: an index that the plan doesn't use is pure cost.

### deep
#### Before and after

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  placed_on DATE NOT NULL,
  amount INT NOT NULL,
  email VARCHAR(40) NOT NULL
);
SET SESSION cte_max_recursion_depth = 20000;
INSERT INTO orders (customer_id, placed_on, amount, email)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
SELECT i % 2000, DATE_ADD('2025-01-01', INTERVAL i % 365 DAY), i % 500,
       CONCAT('User', i % 2000, '@example.com')
FROM n;
ANALYZE TABLE orders;

EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
CREATE INDEX idx_orders_customer ON orders (customer_id);
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

The two plans, trimmed to the important columns (row counts are the optimizer's estimates):

```text
             type  key                   rows
before       ALL   NULL                  ~20000   full table scan
after        ref   idx_orders_customer   10       index lookup
```

Before the index, MySQL reads all 20,000 rows to find customer 42's ten orders. After it, the B+ tree takes it straight to those ten.

#### Composite indexes and the leftmost prefix

```sql
DROP INDEX idx_orders_customer ON orders;
CREATE INDEX idx_cust_day ON orders (customer_id, placed_on);

EXPLAIN SELECT id FROM orders WHERE customer_id = 42 AND placed_on >= '2025-06-01';
EXPLAIN SELECT id FROM orders WHERE customer_id = 42 ORDER BY placed_on DESC LIMIT 3;
EXPLAIN SELECT id, amount FROM orders WHERE placed_on = '2025-06-01';
```

```text
query                                    type   key            notes
customer = 42 AND placed_on >= ...       range  idx_cust_day   seek, then scan a small range
customer = 42 ORDER BY placed_on DESC    ref    idx_cust_day   Backward index scan; no sort step
placed_on = ... (no customer)            ALL    NULL           leftmost column missing: full scan
```

The index is sorted by customer, then by date within each customer, like a phone book sorted by surname then first name. Finding one customer's dates is easy; finding one date across all customers isn't, just as a phone book can't list everyone called "Ravi" quickly. The second query even reads the index backwards to get the newest three orders without sorting, and since the index plus the primary key (`id`) covers it, it never touches the table.

#### Functions, partial indexes, invisible indexes

```sql
CREATE INDEX idx_email_lower ON orders ((LOWER(email)));
EXPLAIN SELECT id FROM orders WHERE LOWER(email) = 'user42@example.com';
```

Without `idx_email_lower`, that query is a full scan (`type` ALL); with it, an index lookup (`ref`). The query must use the same expression as the index. PostgreSQL's partial index indexes only some rows, for example `CREATE INDEX orders_pending ON orders (placed_on) WHERE status = 'pending'`: small, and used by queries that include `status = 'pending'`. Before dropping an index in MySQL, `ALTER TABLE orders ALTER INDEX idx_cust_day INVISIBLE` hides it from the optimizer while still maintaining it, so you can watch for slow queries and make it visible again instantly.

#### When not to add an index

- Small tables: a scan of a few hundred rows is already fast.
- Low-selectivity columns alone: an index on a yes/no flag makes the database hop between index and table for half the rows, slower than a scan.
- Write-heavy tables: each insert updates every index; five indexes can multiply write cost several times.
- Duplicates: `(a)` is redundant next to `(a, b)`, which already serves `a` lookups.

Connects to: B+ tree indexes, composite indexes, clustered vs non-clustered indexes, query plans, SELECT, WHERE and ORDER BY.

### questions
Q: How do you decide which columns to index?
A: Look at the frequent and slow queries: columns used for equality filters and joins first, then range and sort columns, preferring selective ones. Confirm with EXPLAIN that the index is used, and weigh the extra cost on writes and storage.

Q: What is the leftmost prefix rule?
A: A composite index on (a, b, c) is sorted by a, then b, then c, so it can serve conditions on a, on a and b, or on a, b and c, but not on b or c alone. Put equality columns first and a range or sort column last.

Q: Why doesn't WHERE LOWER(email) = 'x' use an index on email?
A: The index stores email values, not LOWER(email), so the database can't search it for the computed value. Create a functional index on the same expression (MySQL 8.0.13 and later, PostgreSQL), or store a normalized column and index that.

Q: Are foreign key columns indexed automatically?
A: In MySQL's InnoDB, yes: it requires an index on the referencing columns and creates one if needed. PostgreSQL doesn't, so you must add it yourself, or joins on the key and deletes of parent rows scan the child table.

Q: What is a covering index?
A: An index that contains every column a query reads, so the answer comes from the index alone without visiting the table rows. MySQL shows "Using index" in EXPLAIN and PostgreSQL shows an Index Only Scan.
