---
topic: dbms.practical
name: "Practical database features"
subject: dbms
order: 10
prereqs: [dbms.relational]
---

## dbms.practical.views-and-materialized-views
name: "Views and materialized views"
importance: important
scope: "Views and materialized views"

### simple
A view is a saved query that you can use like a table: every time you read it, the database runs the query underneath. A materialized view saves the query's result itself, so reading it is instant, but the result goes stale until it is refreshed. A view is like a live window onto a room, and a materialized view is like a photograph of it.

### interview
- A **view** is a named query (`CREATE VIEW v AS SELECT ...`); it stores no data, and queries against it are expanded into the underlying query. Uses: simplify complex joins, expose a stable interface over changing tables (logical data independence), and **security** (show only some columns or rows).
- **Updatable views**: simple views over one table (no aggregates, `DISTINCT`, `GROUP BY` or joins in most databases) accept `INSERT`/`UPDATE`/`DELETE`; `WITH CHECK OPTION` rejects changes that would make a row fall out of the view.
- A **materialized view** stores the result physically, can be indexed, and must be **refreshed**: completely (recompute), incrementally (Oracle fast refresh), on a schedule or on demand. Reads are fast; data is as old as the last refresh.
- Uses of materialized views: dashboards and reports over expensive aggregations, precomputed joins, caching data from other databases.
- Support: PostgreSQL has both (`REFRESH MATERIALIZED VIEW ... CONCURRENTLY` avoids blocking readers, given a unique index); MySQL has only plain views (emulate materialized ones with a table refreshed by a job or triggers); Oracle and SQL Server (indexed views) support them natively.

### deep
#### Worked example on PostgreSQL

```sql
CREATE TABLE orders (id INT PRIMARY KEY, customer TEXT NOT NULL,
                     amount INT NOT NULL, status TEXT NOT NULL);
INSERT INTO orders VALUES (1, 'asha', 450, 'paid'), (2, 'ravi', 90, 'paid'),
                          (3, 'asha', 120, 'refunded');

CREATE VIEW paid_orders AS
SELECT id, customer, amount FROM orders WHERE status = 'paid';

CREATE MATERIALIZED VIEW revenue_by_customer AS
SELECT customer, SUM(amount) AS revenue FROM orders
WHERE status = 'paid' GROUP BY customer;

INSERT INTO orders VALUES (4, 'ravi', 300, 'paid');
SELECT * FROM paid_orders ORDER BY id;               -- 1, 2 and 4: the view is live
SELECT * FROM revenue_by_customer ORDER BY customer; -- asha 450, ravi 90: stale
REFRESH MATERIALIZED VIEW revenue_by_customer;
SELECT * FROM revenue_by_customer ORDER BY customer; -- asha 450, ravi 390
```

The plain view saw order 4 immediately because it reran its query. The materialized view kept showing Ravi's old revenue of 90 until the refresh recomputed it as 390.

#### Check option

With `WITH CHECK OPTION` on a view that includes the status column, `UPDATE paid_orders SET status = 'refunded' WHERE id = 1` fails with "new row violates check option for view": the change would move the row out of the view, which the option forbids. Updating the amount of a paid order through the view works.

#### Choosing

| need | use |
|---|---|
| always-current data, simpler queries, restricted access | view |
| an expensive aggregation read far more often than data changes | materialized view |
| results that must be current and fast | an index, a summary table maintained in the same transaction, or a cache |

Connects to: schema vs instance, three-schema architecture, data independence, denormalization, query plans, stored procedures, functions and triggers.

### questions
Q: What is the difference between a view and a materialized view?
A: A view stores only its query, which runs every time the view is read, so results are always current but cost as much as the query. A materialized view stores the query's result, so reads are fast and it can be indexed, but the data is only as fresh as the last refresh.

Q: Why use views?
A: To simplify complex queries behind a name, to present a stable interface while underlying tables change, and to restrict access by exposing only certain rows or columns to users who have no rights on the base tables.

Q: Can you update data through a view?
A: Often, if the view is simple: based on one table without aggregates, grouping, DISTINCT or set operations, so each view row maps to one base row. WITH CHECK OPTION prevents changes that would move rows out of the view. Complex views need INSTEAD OF triggers or cannot be updated.

Q: How do you keep a materialized view up to date?
A: By refreshing it, fully recomputing the query, on a schedule, after batch loads or on demand; some databases support incremental refresh that applies only changes. In PostgreSQL, REFRESH MATERIALIZED VIEW CONCURRENTLY rebuilds it without blocking readers, provided it has a unique index.

## dbms.practical.stored-procedures-functions-and-triggers
name: "Stored procedures, functions and triggers"
importance: important
scope: "Stored procedures, functions and triggers"

### simple
Stored procedures and functions are small programs saved inside the database and run there, close to the data. A function returns a value you can use inside a query; a procedure performs a series of steps when you call it. A trigger is code the database runs automatically when something happens, like a doorbell that rings every time the door opens.

### interview
- **Function**: takes arguments, **returns a value** (or a table), and is used inside SQL expressions (`SELECT with_tax(price)`). Should usually avoid side effects.
- **Stored procedure**: invoked with `CALL`, runs several statements, may have output parameters and (in PostgreSQL 11+ and MySQL) control transactions with `COMMIT`/`ROLLBACK`.
- **Trigger**: runs automatically `BEFORE` or `AFTER` an `INSERT`, `UPDATE` or `DELETE` (or `INSTEAD OF` on views), **per row** or **per statement**. Uses: audit logs, maintaining derived columns or summary tables, enforcing rules constraints cannot express.
- **Pros**: fewer network round trips, logic next to the data, one place for rules shared by many applications, permissions (grant execute without table access).
- **Cons**: business logic hidden from application code and reviews, harder testing, versioning and debugging, vendor-specific languages (PL/pgSQL, T-SQL, MySQL's dialect), extra load on the hardest-to-scale machine, and triggers that surprise people (cascades of hidden work).
- Modern practice: keep most business logic in the application; use triggers sparingly for audit and integrity, and procedures for data-heavy batch work.

### deep
#### A function, a trigger and a procedure (PostgreSQL)

```sql
CREATE TABLE accounts (id INT PRIMARY KEY, balance INT NOT NULL);
CREATE TABLE audit_log (account_id INT, old_balance INT, new_balance INT,
                        changed_at TIMESTAMPTZ DEFAULT now());
INSERT INTO accounts VALUES (1, 500), (2, 300);

CREATE FUNCTION with_tax(amount INT) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$ SELECT amount * 1.18 $$;

CREATE FUNCTION log_balance_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO audit_log (account_id, old_balance, new_balance)
    VALUES (OLD.id, OLD.balance, NEW.balance);
    RETURN NEW;
END $$;

CREATE TRIGGER accounts_audit AFTER UPDATE OF balance ON accounts
FOR EACH ROW EXECUTE FUNCTION log_balance_change();

CREATE PROCEDURE transfer(src INT, dst INT, amount INT) LANGUAGE plpgsql AS $$
BEGIN
    UPDATE accounts SET balance = balance - amount WHERE id = src;
    UPDATE accounts SET balance = balance + amount WHERE id = dst;
END $$;

CALL transfer(1, 2, 100);
SELECT id, balance, with_tax(balance) AS with_tax FROM accounts ORDER BY id;
SELECT account_id, old_balance, new_balance FROM audit_log ORDER BY account_id;
```

The balances end at 400 each (`with_tax` shows 472.00 for both), and the audit log holds two rows, (1, 500, 400) and (2, 300, 400), written by the trigger without the procedure knowing about it. One `CALL` replaced two round trips from the application.

In MySQL the same ideas use a different syntax: `CREATE PROCEDURE ... BEGIN ... END` bodies (with a changed `DELIMITER` in the command-line client), `CREATE TRIGGER ... FOR EACH ROW` with the body inline, and `CALL transfer(1, 2, 100)`.

#### Row vs statement triggers

A row trigger fires once per affected row (an `UPDATE` of 10,000 rows fires it 10,000 times); a statement trigger fires once per statement and, in PostgreSQL, can see all changed rows through transition tables. Heavy row triggers are a classic source of slow bulk updates.

#### Where the logic should live

| put it in | when |
|---|---|
| constraints | the rule can be declared (keys, checks, foreign keys) |
| triggers | every writer must obey it, such as audit trails and derived columns |
| procedures | batch data processing where round trips dominate |
| application code | business workflows, anything that needs tests, reviews and frequent change |

Connects to: integrity constraints, views and materialized views, database users and languages, denormalization.

### questions
Q: What is the difference between a stored procedure and a function?
A: A function returns a value or a table and is typically used inside SQL expressions, ideally without side effects. A stored procedure is invoked with CALL, performs a sequence of statements, may return results through output parameters, and in many databases can control transactions.

Q: What is a trigger and when would you use one?
A: Code the database runs automatically before or after inserts, updates or deletes on a table, per row or per statement. Good uses are audit logs, keeping derived or summary data in sync, and enforcing rules that constraints cannot express, since every writer is covered.

Q: What are the drawbacks of putting business logic in stored procedures?
A: The logic is harder to version, test, review and debug than application code, is tied to one database's language, and runs on the database server, which is the hardest part of the system to scale. It also hides behavior from developers reading the application.

Q: Why can triggers make bulk operations slow?
A: Row-level triggers run once for every affected row, so a bulk update of many rows executes the trigger body that many times, often issuing extra queries each time. Statement-level triggers or disabling triggers during controlled bulk loads avoid this.

## dbms.practical.cursors
name: "Cursors"
importance: advanced
scope: "Cursors"

### simple
A cursor lets a program walk through the rows of a query result one at a time, or a few at a time, instead of receiving everything at once. It is like a bookmark in a long list that remembers where you stopped. Cursors are handy for huge results, but processing rows one by one is usually much slower than letting the database handle the whole set in one statement.

### interview
- A **cursor** is a pointer into a query's result set: `DECLARE`, `OPEN` (implicit in PostgreSQL), `FETCH` rows, `CLOSE`.
- **Server-side cursors** keep the result on the server and send rows in batches, so clients can process results larger than their memory. Client libraries expose them (for example, named cursors in many drivers).
- In stored procedures, cursors loop over rows with procedural logic (`FETCH ... INTO` variables, a `NOT FOUND` handler in MySQL).
- Options: scrollable (move backwards), sensitive or insensitive to concurrent changes, `WITH HOLD` (survive the transaction's commit).
- **Row-by-row processing is slow** compared with **set-based** SQL (one `UPDATE ... WHERE` or `INSERT ... SELECT`): each iteration pays per-row overhead. Rewrite loops as set operations when possible.
- Cursors held open inside long transactions keep snapshots and locks alive; for paging through data for users, **keyset pagination** is better than a long-lived cursor.

### deep
#### A cursor in PostgreSQL

```sql
CREATE TABLE orders (id INT PRIMARY KEY, customer TEXT NOT NULL, amount INT NOT NULL);
INSERT INTO orders VALUES (1, 'asha', 450), (2, 'ravi', 95), (3, 'asha', 120);

BEGIN;
DECLARE by_id CURSOR FOR SELECT id, customer, amount FROM orders ORDER BY id;
FETCH 2 FROM by_id;      -- rows 1 and 2
FETCH 2 FROM by_id;      -- row 3: only one left
CLOSE by_id;
COMMIT;
```

The first fetch returns orders 1 and 2, the second only order 3. The cursor lives inside the transaction (unless declared `WITH HOLD`), and the server keeps its position between fetches.

#### Set-based instead of a loop

A procedure that loops over every paid order and updates a customer total one row at a time does, for 100,000 orders, 100,000 fetches and 100,000 updates. The set-based equivalent is one statement the optimizer can run as a single pass:

```sql
UPDATE customers c
SET total_paid = t.total
FROM (SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer) t
WHERE c.name = t.customer;
```

Reserve cursors for work that genuinely needs row-by-row logic, such as calling an external system per row, or for streaming very large results to a client in chunks.

Connects to: stored procedures, functions and triggers, REST principles, MVCC.

### questions
Q: What is a database cursor?
A: A control structure that points into a query's result set and lets a program fetch rows one at a time or in batches, keeping its position on the server between fetches. It is declared, opened, fetched from and closed.

Q: Why are cursors often considered slow?
A: They encourage row-by-row processing, where each row costs a separate fetch and often a separate statement, while set-based SQL processes all rows in one optimized operation. Long-open cursors also hold transactions, snapshots and sometimes locks.

Q: When is a server-side cursor useful?
A: When a result is too large to load into the client's memory at once, such as exporting millions of rows: the client fetches it in manageable batches while the server keeps the result and position.

Q: What is a better alternative to cursors for paginating results for users?
A: Keyset pagination: each page query asks for rows after the last key seen, using an index, with no server-side state between requests. It scales well and does not keep transactions open while users browse.

## dbms.practical.connection-pooling
name: "Connection pooling"
importance: important
scope: "why opening connections is expensive"

### simple
Opening a database connection takes real work: a network handshake, encryption setup, logging in and preparing a session on the server. A connection pool opens a handful of connections once and lends them out to requests, taking them back when each request is done. It is like a taxi stand with cars waiting, instead of building a new car for every passenger.

### interview
- Opening a connection costs a TCP handshake, often a **TLS** handshake, **authentication** (such as SCRAM password checks), and server-side session setup: in PostgreSQL a whole new **backend process** with its own memory. Milliseconds each, versus microseconds for a simple query on an open connection.
- A **pool** keeps open connections; a request **borrows** one, runs its queries, and **returns** it. When all are busy, requests **wait** (with a timeout) rather than opening more.
- **Sizing**: small is usually better; a database with few cores gains nothing from hundreds of concurrent queries. A common starting point is around two to four times the database's CPU cores, divided among application instances.
- Pools **validate** connections (a quick test query or driver check), **recycle** them after a lifetime or idle time, and must handle **leaks** (connections never returned) with timeouts and leak detection.
- Where: in the application (HikariCP-style pools in most languages' drivers) or as a separate **proxy** (**PgBouncer**, ProxySQL, cloud RDS Proxy), which also multiplexes many clients over few server connections.
- PgBouncer modes: session pooling, **transaction pooling** (a server connection per transaction; breaks session state like temporary tables and prepared statements in older setups), statement pooling.

### deep
#### How expensive is a connection?

Measured on the test machine with a local PostgreSQL 16: opening a connection over TCP with password (SCRAM) authentication took about 9 ms, and over a local Unix socket without a password about 2 ms, while `SELECT 1` on an already open connection took about 60 µs. Opening a connection per request would multiply a small query's cost by roughly 150 before counting network latency and TLS on a real network.

#### Code: a pool

```cpp
struct Connection { int id; };

class Pool {
    mutex m;
    condition_variable returned;
    vector<unique_ptr<Connection>> idle;
    int opened = 0;
    const int maxSize;

public:
    explicit Pool(int maxSize) : maxSize(maxSize) {}

    unique_ptr<Connection> acquire() {
        unique_lock lock(m);
        returned.wait(lock, [&] { return !idle.empty() || opened < maxSize; });
        if (!idle.empty()) {                          // reuse an open connection
            auto c = std::move(idle.back());
            idle.pop_back();
            return c;
        }
        int id = ++opened;                            // open a new one, outside the lock
        lock.unlock();
        this_thread::sleep_for(chrono::milliseconds(10));   // handshake, TLS, auth, session
        return make_unique<Connection>(Connection{id});
    }
    void release(unique_ptr<Connection> c) {
        {
            lock_guard lock(m);
            idle.push_back(std::move(c));
        }
        returned.notify_one();
    }
    int openedCount() {
        lock_guard lock(m);
        return opened;
    }
};

int main() {
    Pool pool(4);
    vector<thread> workers;
    atomic<int> queries{0};
    for (int w = 0; w < 8; ++w)                       // 8 request threads, 25 queries each
        workers.emplace_back([&] {
            for (int q = 0; q < 25; ++q) {
                auto conn = pool.acquire();
                this_thread::sleep_for(chrono::microseconds(200));   // the query itself
                ++queries;
                pool.release(std::move(conn));
            }
        });
    for (auto& t : workers) t.join();
    cout << queries << " queries on " << pool.openedCount() << " connections\n";
    cout << "without a pool: " << queries << " connections opened and closed\n";
}
```

Output:

```text
200 queries on 4 connections
without a pool: 200 connections opened and closed
```

Eight threads competed for four connections; when all four were busy, a thread waited on the condition variable for one to come back instead of opening a fifth. The pool paid the opening cost four times instead of 200.

#### Sizing and failure modes

| symptom | likely cause | fix |
|---|---|---|
| requests time out waiting for a connection | pool too small for the load, or slow queries hold connections | fix slow queries first, then resize |
| database overloaded with hundreds of connections | many app instances each with a large pool | smaller pools, or a proxy like PgBouncer |
| pool slowly runs dry | connections not returned (leaks) | return in `finally` or RAII blocks; leak detection timeouts |
| errors after a network blip or failover | stale connections in the pool | validation on borrow, maximum lifetime |

Returning connections automatically, as the `unique_ptr` and RAII style above suggest, is the cheapest leak prevention.

Connects to: TCP three-way handshake and four-way teardown, HTTPS and TLS, condition variables, thread pools, load balancers.

### questions
Q: Why is opening a database connection expensive?
A: It requires a TCP handshake, often a TLS handshake, authentication, and setting up a session on the server, which in PostgreSQL means starting a dedicated backend process with its own memory. That costs milliseconds, far more than a simple query on an existing connection.

Q: How does a connection pool work?
A: It opens a limited number of connections and keeps them open. Each request borrows an idle connection, runs its queries and returns it; if none is free and the pool is at its maximum size, the request waits, up to a timeout, for one to be returned.

Q: How large should a connection pool be?
A: Usually much smaller than intuition suggests: the database can only run about as many queries in parallel as it has cores and disks allow, so a pool of a few times the database's cores, shared across all application instances, is a typical start. Measure and adjust.

Q: What is PgBouncer and why is it used?
A: A lightweight connection pooler that sits between applications and PostgreSQL. Many client connections share a small number of server connections, which protects the database from thousands of expensive backend processes, especially with many application instances or serverless functions.

Q: What is a connection leak?
A: Code that borrows a connection and never returns it, for example on an error path. The pool slowly runs out of connections and requests start timing out. Returning connections in finally blocks or with RAII, plus leak detection timeouts, prevents it.
