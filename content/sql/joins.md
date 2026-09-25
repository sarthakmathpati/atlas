---
topic: sql.joins
name: "Joins"
subject: sql
order: 3
prereqs: [sql.basics]
---

## sql.joins.inner-join
name: "Inner join"
importance: must
scope: "matching rows"

### simple
An inner join glues rows from two tables together wherever they match, like pairing each order slip with the customer card that has the same customer number. Rows that find no partner on the other side are left out. Normalized databases split data into many tables, and joins put it back together.

### interview
- `A JOIN B ON condition` (same as `INNER JOIN`) returns **one output row for every pair** of rows that satisfies the condition. Unmatched rows from either side disappear.
- `ON a.id = b.a_id` for the condition; `USING (col)` when both columns share a name. The old form `FROM a, b WHERE a.id = b.a_id` means the same, but forgetting the `WHERE` silently makes a cross join.
- **Row multiplication**: a one-to-many join repeats the "one" side once per match. Joining a table to two different "many" tables multiplies their rows (the **fan-out trap**), so sums double count. Aggregate each side first, then join.
- `NULL` never equals anything, so rows with a NULL join key never match.
- For inner joins, the order of tables doesn't change the result; the optimizer picks the order and the algorithm: **nested loop** with an index on the inner table, **hash join** (MySQL 8.0.18+, PostgreSQL), or **merge join** over sorted inputs (PostgreSQL).
- Index the foreign key column you join on (`orders.customer_id`); primary keys are indexed already.

### deep
#### Worked example

```sql
CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL, city VARCHAR(20));
CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, amount INT NOT NULL);
INSERT INTO customers VALUES (1, 'Asha', 'Pune'), (2, 'Ravi', 'Delhi'),
                             (3, 'Meera', 'Pune'), (4, 'Kabir', 'Mumbai');
INSERT INTO orders VALUES (101, 1, 450), (102, 1, 120), (103, 2, 90),
                          (104, 3, 300), (105, 9, 75);

SELECT c.name, o.id AS order_id, o.amount
FROM customers c
JOIN orders o ON o.customer_id = c.id
ORDER BY o.id;
```

Result:

| name | order_id | amount |
|---|---|---|
| Asha | 101 | 450 |
| Asha | 102 | 120 |
| Ravi | 103 | 90 |
| Meera | 104 | 300 |

Asha appears twice because she has two orders: the join produces one row per matching pair. Kabir has no orders, and order 105 points to a customer 9 that doesn't exist (no foreign key stopped it), so both vanish. Keeping them needs an outer join.

#### How the database runs it

Conceptually a join takes every pair and keeps the matching ones, but nobody builds the full product. A **nested loop join** walks the outer table and, for each row, looks up matches through an index on the inner table: O(n log m). A **hash join** builds a hash table on the smaller input and probes it with the other: O(n + m) with memory for the build side. A **merge join** walks two inputs sorted on the key in step. `EXPLAIN` shows which one was chosen.

#### The fan-out trap

Add payments, and ask for each customer's order total and payment total:

```sql
CREATE TABLE payments (id INT PRIMARY KEY, customer_id INT NOT NULL, paid INT NOT NULL);
INSERT INTO payments VALUES (1, 1, 300), (2, 1, 270), (3, 2, 90);

SELECT c.name, SUM(o.amount) AS ordered, SUM(p.paid) AS paid
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
```

Result:

| name | ordered | paid |
|---|---|---|
| Asha | 1140 | 1140 |
| Ravi | 90 | 90 |

Asha really ordered 570 and paid 570. Her 2 orders were paired with her 2 payments, giving 4 rows, and each amount was summed twice. Aggregate each "many" table on its own first, then join the one-row-per-customer results:

```sql
SELECT c.name, o.ordered, p.paid
FROM customers c
JOIN (SELECT customer_id, SUM(amount) AS ordered FROM orders GROUP BY customer_id) o
  ON o.customer_id = c.id
JOIN (SELECT customer_id, SUM(paid) AS paid FROM payments GROUP BY customer_id) p
  ON p.customer_id = c.id
ORDER BY c.id;
```

Result:

| name | ordered | paid |
|---|---|---|
| Asha | 570 | 570 |
| Ravi | 90 | 90 |

A quick sanity check in any join query: count the rows before and after the join and ask whether the change makes sense.

#### Edge cases and bugs

- Joining on the wrong column (`o.id = c.id`) often "works" on small test data and returns nonsense.
- Joining on columns of different types (a string code against an integer) makes MySQL convert values, which can skip the index and match `'007'` with `7`.
- `SELECT *` in a join returns both `id` columns; name them explicitly.
- A missing join condition among several tables creates a partial cross join; row counts that jump by a factor are the symptom.

Connects to: normal forms (normalized data is rejoined), left, right and full outer joins, self join, join algorithms, GROUP BY and HAVING.

### questions
Q: What does an inner join return?
A: One row for every pair of rows, one from each table, that satisfies the join condition. Rows with no match on the other side are left out, and a row with several matches appears several times.

Q: Why can SUM give inflated numbers after joining a table to two child tables?
A: Each parent row is paired with every combination of its children in both tables, so a customer with 2 orders and 2 payments yields 4 rows and every amount is counted twice. Aggregate each child table per parent in a subquery first, then join the summaries.

Q: What join algorithms do databases use?
A: Nested loop joins, ideally with an index lookup on the inner table; hash joins, which build a hash table on the smaller input and probe it with the larger, in O(n + m); and merge joins, which walk two inputs sorted on the key. The optimizer chooses based on sizes, indexes and sort orders.

Q: Does the order of tables in an inner join matter?
A: Not for the result: inner joins are commutative and associative, so the optimizer is free to reorder them. It can matter for readability, and outer joins are a different story because the preserved side changes.

Q: Which columns should be indexed for joins?
A: The columns you look up on the inner side, usually the foreign key column such as orders.customer_id; the primary key side already has an index. Without it, each lookup becomes a scan, unless the optimizer switches to a hash join.

## sql.joins.left-right-and-full-outer-joins
name: "Left, right and full outer joins"
importance: must
prereqs: [sql.joins.inner-join]
scope: "keeping unmatched rows"

### simple
An outer join is an inner join that refuses to drop anyone. A left join keeps every row of the left table, and where no partner exists it fills the right side's columns with NULL. It is like a class list with each student's exam score: a student who skipped the exam still appears, with a blank score.

### interview
- `A LEFT JOIN B ON ...`: every row of A at least once; unmatched A rows get NULLs for B's columns. `RIGHT JOIN` is the mirror image (rewrite it as a `LEFT JOIN` for readability). `FULL OUTER JOIN` keeps unmatched rows from both sides.
- **Conditions on the right table belong in `ON`, not `WHERE`.** `WHERE b.x = 'y'` removes the NULL-filled rows and quietly turns the left join into an inner join.
- Counting after a left join: `COUNT(b.id)` counts matches (0 for none); `COUNT(*)` would count the NULL-filled row as 1.
- **MySQL has no `FULL OUTER JOIN`**: emulate it with a `LEFT JOIN`, `UNION ALL`, and the right-only rows (a `RIGHT JOIN ... WHERE a.id IS NULL`). PostgreSQL supports it directly.
- Use `COALESCE` to show defaults for missing values (`COALESCE(SUM(o.amount), 0)`).
- Order of tables matters for outer joins, unlike inner joins.

### deep
#### Worked example

```sql
CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL);
CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, amount INT NOT NULL,
                     status VARCHAR(10) NOT NULL);
INSERT INTO customers VALUES (1, 'Asha'), (2, 'Ravi'), (3, 'Meera'), (4, 'Kabir');
INSERT INTO orders VALUES (101, 1, 450, 'paid'), (102, 1, 120, 'refunded'),
                          (103, 2, 90, 'refunded'), (104, 3, 300, 'paid'),
                          (105, 9, 75, 'paid');

SELECT c.name, COUNT(o.id) AS orders, COALESCE(SUM(o.amount), 0) AS spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
```

Result:

| name | orders | spent |
|---|---|---|
| Asha | 2 | 570 |
| Ravi | 1 | 90 |
| Meera | 1 | 300 |
| Kabir | 0 | 0 |

Kabir has no orders, so the join produced one row for him with NULL in every order column. `COUNT(o.id)` skips that NULL and gives 0; `COUNT(*)` would have said 1. `SUM` of only NULLs is NULL, which `COALESCE` turns into 0.

#### ON vs WHERE

Now count only paid orders per customer:

```sql
SELECT c.name, COUNT(o.id) AS paid_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY c.id;
```

Result:

| name | paid_orders |
|---|---|
| Asha | 1 |
| Meera | 1 |

Ravi and Kabir vanished. Kabir's NULL-filled row has `o.status` NULL, and Ravi's only order is refunded, so `WHERE` removed their rows after the join. Move the condition into `ON`, where it decides which orders count as matches:

```sql
SELECT c.name, COUNT(o.id) AS paid_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY c.id;
```

Result:

| name | paid_orders |
|---|---|
| Asha | 1 |
| Ravi | 0 |
| Meera | 1 |
| Kabir | 0 |

Rule: conditions on the preserved (left) table go in `WHERE`; conditions on the optional (right) table go in `ON`, unless you really want to drop rows without a match.

#### Full outer join in MySQL

Every customer and every order, matched where possible, including order 105 whose customer doesn't exist:

```sql
SELECT c.name, o.id AS order_id
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
UNION ALL
SELECT c.name, o.id
FROM customers c RIGHT JOIN orders o ON o.customer_id = c.id
WHERE c.id IS NULL
ORDER BY order_id IS NULL, order_id;
```

Result:

| name | order_id |
|---|---|
| Asha | 101 |
| Asha | 102 |
| Ravi | 103 |
| Meera | 104 |
| NULL | 105 |
| Kabir | NULL |

The first half gives all customers with their orders; the second adds only the orders that found no customer. `UNION ALL` plus the `IS NULL` filter avoids duplicates without the cost of `UNION`'s deduplication (plain `UNION` would also merge genuinely identical rows). In PostgreSQL the whole thing is one clause, `FROM customers c FULL OUTER JOIN orders o ON o.customer_id = c.id`; MySQL rejects `FULL OUTER JOIN` with a syntax error.

#### Edge cases and bugs

- Chaining `LEFT JOIN b ... JOIN c ON c.id = b.c_id`: the inner join to `c` drops the rows where `b` was NULL. Keep later joins `LEFT` too.
- A right table with several matches still multiplies rows; a left join guarantees "at least once", not "exactly once".
- `ORDER BY` on a column from the right table puts the unmatched rows first in MySQL (NULLs sort first) and last in PostgreSQL.

Connects to: inner join, anti-joins and semi-joins, NULL handling, set operations.

### questions
Q: What is the difference between an inner join and a left join?
A: An inner join returns only matched pairs. A left join returns every row of the left table at least once; where there is no match, the right table's columns are NULL. Use a left join whenever rows without a partner must still be reported, such as customers with zero orders.

Q: Why did adding WHERE orders.status = 'paid' remove customers from a left join?
A: For customers without matching orders, orders.status is NULL, and the WHERE test is unknown, so those rows are filtered out after the join, which turns it into an inner join. Put the condition in the ON clause so it only restricts which orders match.

Q: How do you emulate a FULL OUTER JOIN in MySQL?
A: Combine a LEFT JOIN with the rows only a RIGHT JOIN would add: A LEFT JOIN B, then UNION ALL with A RIGHT JOIN B WHERE A.key IS NULL. MySQL doesn't support FULL OUTER JOIN; PostgreSQL does.

Q: Why use COUNT(b.id) instead of COUNT(*) after a left join?
A: A left row without matches still produces one row, with NULLs on the right. COUNT(*) counts that row as 1, while COUNT(b.id) skips the NULL and correctly reports 0 matches.

## sql.joins.self-join
name: "Self join"
importance: must
prereqs: [sql.joins.inner-join]
scope: "comparing rows in the same table"

### simple
A self join joins a table with itself, as if you had two copies of the same list side by side. It answers questions that compare one row with another row of the same table: who is this person's manager, or was today warmer than yesterday. The two copies get different nicknames so you can tell them apart.

### interview
- Same table twice with **different aliases**: `FROM employees e JOIN employees m ON e.manager_id = m.id`.
- Uses: **hierarchies** (employee and manager in one table), **comparing rows** (pairs in the same city, a salary above the manager's), **sequences** (a day and the day before).
- Use a `LEFT JOIN` to keep rows without a partner (the CEO has no manager).
- Pairs: `a.id < b.id` lists each unordered pair once and skips pairing a row with itself; `a.id <> b.id` gives both orders.
- Dates: join on `b.day = DATE_SUB(a.day, INTERVAL 1 DAY)` (MySQL) or `b.day = a.day - 1` (PostgreSQL); matching on the previous *row* instead of the previous *day* is a job for `LAG`.
- A self join only reaches one level; arbitrary depth (a whole management chain) needs a recursive CTE.
- Index the column you join on (`manager_id`), otherwise each lookup scans the table.

### deep
#### Employees and their managers

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  city VARCHAR(20) NOT NULL,
  salary INT NOT NULL,
  manager_id INT
);
INSERT INTO employees VALUES
  (1, 'Asha', 'Pune', 150000, NULL), (2, 'Ravi', 'Delhi', 90000, 1),
  (3, 'Meera', 'Pune', 95000, 1), (4, 'Kabir', 'Pune', 99000, 3),
  (5, 'Zoya', 'Delhi', 70000, 2);

SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY e.id;
```

Result:

| employee | manager |
|---|---|
| Asha | NULL |
| Ravi | Asha |
| Meera | Asha |
| Kabir | Meera |
| Zoya | Ravi |

Read `e` as "the employee's copy" and `m` as "the manager's copy". For each employee row, the join finds the row in `m` whose `id` equals the employee's `manager_id`. Asha has no manager, so only a left join keeps her.

#### Pairs in the same city

```sql
SELECT a.name AS first, b.name AS second, a.city
FROM employees a
JOIN employees b ON a.city = b.city AND a.id < b.id
ORDER BY a.id, b.id;
```

Result:

| first | second | city |
|---|---|---|
| Asha | Meera | Pune |
| Asha | Kabir | Pune |
| Ravi | Zoya | Delhi |
| Meera | Kabir | Pune |

`a.id < b.id` does two jobs: it stops a row pairing with itself, and it keeps only one of (Asha, Meera) and (Meera, Asha). Three people in Pune give 3 pairs; with `a.id <> b.id` you would get 6.

#### Comparing with the previous day

```sql
CREATE TABLE daily_sales (day DATE PRIMARY KEY, units INT NOT NULL);
INSERT INTO daily_sales VALUES ('2026-03-01', 40), ('2026-03-02', 55),
  ('2026-03-03', 50), ('2026-03-05', 70), ('2026-03-06', 90);

SELECT today.day, today.units, yesterday.units AS day_before
FROM daily_sales today
JOIN daily_sales yesterday ON yesterday.day = DATE_SUB(today.day, INTERVAL 1 DAY)
WHERE today.units > yesterday.units
ORDER BY today.day;
```

Result:

| day | units | day_before |
|---|---|---|
| 2026-03-02 | 55 | 40 |
| 2026-03-06 | 90 | 70 |

5 March is missing even though 70 beats the 50 on 3 March: there is no row for 4 March, and the question was about the previous calendar day. `LAG` compares with the previous *row* instead, which would pair 5 March with 3 March; pick whichever the question means. In PostgreSQL the condition is `yesterday.day = today.day - 1`, since subtracting an integer from a `date` moves it by days.

#### Complexity

With an index on the join column, each of the n rows does one O(log n) lookup: O(n log n). Pair queries such as "same city" can return O(n²) rows when a group is large, which is inherent in the question.

Connects to: inner join, employees earning more than their managers, recursive CTEs (for whole hierarchies), LAG and LEAD.

### questions
Q: What is a self join and when do you use it?
A: A join of a table with itself under two aliases. Use it to relate rows of the same table: an employee and their manager stored in the same table, pairs of rows that share a value, or a date and the previous date.

Q: How do you list each pair of employees in the same city exactly once?
A: Join the table with itself on equal city and a.id < b.id. The inequality removes self-pairs and keeps only one ordering of each pair; a.id <> b.id would list every pair twice.

Q: Why does an employee without a manager disappear from a self join, and how do you keep them?
A: With an inner join, their manager_id is NULL and matches no row. A LEFT JOIN to the manager copy keeps them, with NULL for the manager's columns.

Q: Can a self join find all levels of a hierarchy?
A: No, each self join climbs one level, so you would need one join per level and don't know how many there are. A recursive CTE walks a hierarchy of any depth.

## sql.joins.cross-join
name: "Cross join"
importance: important
prereqs: [sql.joins.inner-join]
scope: "Cartesian products"

### simple
A cross join pairs every row of one table with every row of another, like combining every shirt size with every color to list all possible products. Two tables of 3 and 4 rows give 12 rows. It is useful on purpose and dangerous by accident.

### interview
- `A CROSS JOIN B` returns |A| × |B| rows: the **Cartesian product**. There is no join condition.
- Uses: generating combinations (sizes × colors), building a complete grid (every user × every day) to **left join** real data onto, so missing days show as 0; attaching a one-row summary (a total or a parameter) to every row.
- An **accidental cross join** comes from a missing join condition (`FROM a, b` with no `WHERE`); the symptom is a row count that multiplies.
- MySQL treats `JOIN` or `INNER JOIN` without `ON` as a cross join; PostgreSQL requires `ON` for them and wants `CROSS JOIN` spelled out.
- Cost grows as the product: two tables of 100,000 rows give 10 billion pairs. Keep at least one side tiny.

### deep
#### Combinations

```sql
CREATE TABLE sizes (size VARCHAR(2) PRIMARY KEY, rank_no INT NOT NULL);
CREATE TABLE colors (color VARCHAR(10) PRIMARY KEY);
INSERT INTO sizes VALUES ('S', 1), ('M', 2), ('L', 3);
INSERT INTO colors VALUES ('black'), ('white');

SELECT s.size, c.color
FROM sizes s CROSS JOIN colors c
ORDER BY s.rank_no, c.color;
```

Result:

| size | color |
|---|---|
| S | black |
| S | white |
| M | black |
| M | white |
| L | black |
| L | white |

3 sizes × 2 colors = 6 products.

#### Filling gaps with a grid

A report of units per store per day should show 0 on days a store sold nothing, but those days have no rows at all. Build the full grid with a cross join, then left join the facts onto it:

```sql
CREATE TABLE stores (store VARCHAR(10) PRIMARY KEY);
CREATE TABLE days (day DATE PRIMARY KEY);
CREATE TABLE sales (store VARCHAR(10), day DATE, units INT);
INSERT INTO stores VALUES ('north'), ('south');
INSERT INTO days VALUES ('2026-03-01'), ('2026-03-02'), ('2026-03-03');
INSERT INTO sales VALUES ('north', '2026-03-01', 5), ('north', '2026-03-03', 2),
                         ('south', '2026-03-02', 7);

SELECT st.store, d.day, COALESCE(SUM(s.units), 0) AS units
FROM stores st
CROSS JOIN days d
LEFT JOIN sales s ON s.store = st.store AND s.day = d.day
GROUP BY st.store, d.day
ORDER BY st.store, d.day;
```

Result:

| store | day | units |
|---|---|---|
| north | 2026-03-01 | 5 |
| north | 2026-03-02 | 0 |
| north | 2026-03-03 | 2 |
| south | 2026-03-01 | 0 |
| south | 2026-03-02 | 7 |
| south | 2026-03-03 | 0 |

Without the grid, the three zero rows would be missing, and a chart would silently connect the dots across them. A recursive CTE can generate the days instead of a stored calendar table.

#### Attaching a total to every row

```sql
SELECT s.store, SUM(s.units) AS units,
       ROUND(100 * SUM(s.units) / MAX(t.total), 1) AS pct
FROM sales s
CROSS JOIN (SELECT SUM(units) AS total FROM sales) t
GROUP BY s.store
ORDER BY s.store;
```

Result:

| store | units | pct |
|---|---|---|
| north | 7 | 50.0 |
| south | 7 | 50.0 |

The one-row subquery `t` is paired with every sales row, so each group can divide by the grand total. (`MAX(t.total)` just picks the single value inside the group.) A window function, `SUM(SUM(units)) OVER ()`, does the same job more directly.

#### Accidental cross joins

`SELECT ... FROM orders, customers WHERE orders.amount > 100` has no join condition: every qualifying order is paired with every customer. In MySQL, `orders JOIN customers` without `ON` does the same. When a count jumps by a factor equal to a table's size, look for the missing condition.

Connects to: inner join, recursive CTEs (generating sequences), pivoting rows to columns, running and cumulative metrics.

### questions
Q: How many rows does a cross join of a 50-row table and a 20-row table return?
A: 1,000: every row of the first table is paired with every row of the second, so the result has 50 times 20 rows.

Q: When is a cross join useful?
A: To generate all combinations of small sets, to build a complete grid such as every store for every day and left join facts onto it so gaps show as zeros, or to attach a one-row value like a grand total to every row.

Q: How can a cross join happen by accident?
A: By listing tables with commas and forgetting the join condition in WHERE, or in MySQL by writing JOIN without ON. The result multiplies row counts and usually shows up as wildly inflated totals or a very slow query.

## sql.joins.anti-joins-and-semi-joins
name: "Anti-joins and semi-joins"
importance: must
prereqs: [sql.joins.left-right-and-full-outer-joins]
scope: "finding rows without matches (LEFT JOIN … IS NULL, NOT EXISTS)"

### simple
A semi-join keeps the rows of one table that have at least one match in another, without repeating them per match: "customers who ordered something". An anti-join keeps the rows with no match at all: "customers who never ordered". It is like checking a guest list against the sign-in sheet to see who came and who didn't.

### interview
- **Semi-join**: `WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)` or `WHERE a.id IN (SELECT a_id FROM b)`. Each row of A appears **once**, however many matches it has; an inner join would repeat it.
- **Anti-join**, three spellings:
  - `WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)`: clear and NULL-safe; the default choice.
  - `LEFT JOIN b ON b.a_id = a.id WHERE b.id IS NULL`: test a column of B that can't be NULL in a real match (its primary key).
  - `WHERE a.id NOT IN (SELECT a_id FROM b)`: **wrong if the subquery returns a NULL** (then no rows come back). Add `WHERE a_id IS NOT NULL` or avoid it.
- Optimizers turn `EXISTS`/`IN` into semi-join plans and `NOT EXISTS` into anti-join plans (PostgreSQL's Hash Anti Join; MySQL 8.0.17+ antijoins). `NOT IN` can't always get that plan because of its NULL semantics.
- Classic questions: customers who never ordered, products never sold, users who signed up but never logged in.

### deep
#### Semi-join: who ordered anything

```sql
CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL);
CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, amount INT NOT NULL);
INSERT INTO customers VALUES (1, 'Asha'), (2, 'Ravi'), (3, 'Meera'), (4, 'Kabir');
INSERT INTO orders VALUES (101, 1, 450), (102, 1, 120), (103, 3, 300), (104, NULL, 75);

SELECT c.name FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)
ORDER BY c.id;
```

Result:

| name |
|---|
| Asha |
| Meera |

Asha has two orders but appears once. `JOIN orders` would list her twice, and bolting `DISTINCT` on afterwards hides the problem instead of asking the right question. Order 104 was placed as a guest (no customer), which matters below.

#### Anti-join: who never ordered

```sql
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)
ORDER BY c.id;

SELECT c.name FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL
ORDER BY c.id;
```

Result:

| name |
|---|
| Ravi |
| Kabir |

Result:

| name |
|---|
| Ravi |
| Kabir |

Both give Ravi and Kabir. The left join version keeps customers whose join produced only the NULL-filled row, detected by `o.id IS NULL`: `id` is the primary key, so it is never NULL in a real match. The join column `o.customer_id` also works, because a match needs it to equal `c.id`. Testing some other nullable column, such as a `coupon` column, would wrongly include customers whose orders simply have no coupon.

#### The NOT IN trap

```sql
SELECT c.name FROM customers c
WHERE c.id NOT IN (SELECT customer_id FROM orders)
ORDER BY c.id;
```

Result: no rows.

The guest order's NULL `customer_id` is in the list, so `c.id NOT IN (1, 1, 3, NULL)` is unknown for Ravi and Kabir, never true. Adding `WHERE customer_id IS NOT NULL` to the subquery fixes it, but `NOT EXISTS` never had the problem.

#### What the optimizer does

The plans for these tables (`EXPLAIN (COSTS OFF)` in PostgreSQL 16, `EXPLAIN FORMAT=TREE` in MySQL 8):

```text
query                               PostgreSQL 16                 MySQL 8
NOT EXISTS                          Hash Right Anti Join          Hash antijoin
LEFT JOIN ... WHERE o.id IS NULL    Hash Right Join + filter      Hash antijoin
NOT IN                              filter: NOT (hashed SubPlan)  probe of a deduplicated subquery
```

`NOT EXISTS` becomes a true anti-join in both. The left join spelling is also an anti-join in MySQL; PostgreSQL recognizes it only when the `IS NULL` test is on the join column (`o.customer_id`), otherwise it runs an ordinary hash join and filters afterwards, which costs about the same here. `NOT IN` keeps a special filter that must also notice NULLs; in PostgreSQL, when the subquery result doesn't fit in memory, it even rescans the subquery for every row, which is quadratic. Prefer `NOT EXISTS`: correct with NULLs, clear to read, and well optimized in both databases.

#### Complexity

With a hash anti-join or an index on `orders.customer_id`, each customer costs O(1) expected or O(log m), so the whole query is roughly O(n + m). Without an index or hashing, each `NOT EXISTS` probe scans orders: O(n × m).

Connects to: left, right and full outer joins, subqueries, correlated subqueries, NULL handling, set operations (EXCEPT).

### questions
Q: What is the difference between a semi-join and an inner join?
A: A semi-join returns each row of the left table at most once if it has any match, and returns only the left table's columns. An inner join returns one row per matching pair, so a row with several matches is repeated. EXISTS and IN express semi-joins.

Q: What are the ways to find customers who never placed an order?
A: NOT EXISTS with a correlated subquery on orders, a LEFT JOIN to orders keeping rows where the orders primary key IS NULL, or NOT IN on a subquery. NOT EXISTS is the safest; NOT IN returns nothing if the subquery yields a NULL.

Q: In a LEFT JOIN anti-join, which column should you test for NULL?
A: A column of the right table that can't be NULL in a real match, ideally its primary key. Then NULL can only mean "no match". Testing a nullable column would also keep rows whose match merely had a NULL there.

Q: Why is NOT EXISTS usually preferred over NOT IN?
A: NOT EXISTS is true or false for every row, so NULLs in the subquery can't break it, and optimizers turn it into an efficient anti-join. NOT IN becomes unknown when the list contains a NULL, returning no rows, and its NULL semantics block some optimizations.
