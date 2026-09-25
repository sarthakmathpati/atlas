---
topic: sql.subqueries
name: "Subqueries and set operations"
subject: sql
order: 4
prereqs: [sql.joins, sql.aggregation]
---

## sql.subqueries.subqueries
name: "Subqueries"
importance: must
scope: "scalar, IN, EXISTS"

### simple
A subquery is a query inside another query, in parentheses, whose answer the outer query uses. "Show employees who earn more than the average" needs the average first, so a small inner query computes it. It is like looking up a number on one page before you can fill in a form on another.

### interview
- **Scalar subquery**: returns one value, usable anywhere a value goes (`WHERE salary > (SELECT AVG(salary) FROM employees)`). More than one row is an error; zero rows give NULL.
- **`IN (subquery)`**: membership in a one-column list. `NOT IN` breaks if the list contains a NULL.
- **`EXISTS (subquery)`**: true if the subquery returns any row; the select list inside doesn't matter (`SELECT 1` by convention).
- **Derived table** (subquery in `FROM`): a temporary result you can join or filter. MySQL requires an alias (`AS t`); PostgreSQL 16 no longer does.
- `x > ALL (subquery)` / `x = ANY (subquery)` compare with every or some value; `= ANY` means `IN`. `> ALL` over an empty set is true.
- MySQL limits: no `LIMIT` inside an `IN`/`ANY`/`ALL` subquery (error 1235; wrap it in a derived table), and an `UPDATE`/`DELETE` can't read its own target table in a subquery (error 1093; again wrap it). PostgreSQL has neither limit.
- Uncorrelated subqueries run once; optimizers often turn `IN` and `EXISTS` into joins anyway.

### deep
#### The four places a subquery goes

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  dept VARCHAR(10) NOT NULL,
  salary INT NOT NULL
);
CREATE TABLE projects (id INT PRIMARY KEY, lead_id INT NOT NULL, budget INT NOT NULL);
INSERT INTO employees VALUES
  (1, 'Asha', 'eng', 120000), (2, 'Ravi', 'eng', 95000), (3, 'Meera', 'sales', 70000),
  (4, 'Kabir', 'sales', 82000), (5, 'Zoya', 'ops', 64000);
INSERT INTO projects VALUES (10, 1, 500000), (11, 4, 80000), (12, 1, 250000);

-- scalar: compare with one computed value
SELECT name, salary FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;
```

Result:

| name | salary |
|---|---|
| Asha | 120000 |
| Ravi | 95000 |

The average is 86,200; the inner query runs once and the outer query compares every salary with it.

```sql
-- IN: membership in a list
SELECT name FROM employees
WHERE id IN (SELECT lead_id FROM projects WHERE budget >= 100000)
ORDER BY id;

-- EXISTS: is there at least one matching row?
SELECT e.name FROM employees e
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = e.id)
ORDER BY e.id;
```

Result:

| name |
|---|
| Asha |

Result:

| name |
|---|
| Asha |
| Kabir |

Asha leads two big projects but appears once: `IN` and `EXISTS` test membership, they don't multiply rows like a join.

```sql
-- derived table: aggregate first, then query the result
SELECT dept, total FROM (
  SELECT dept, SUM(salary) AS total FROM employees GROUP BY dept
) AS per_dept
WHERE total > 150000
ORDER BY total DESC;
```

Result:

| dept | total |
|---|---|
| eng | 215000 |
| sales | 152000 |

A derived table lets you filter on an aggregate with `WHERE` (it could also be `HAVING` here) or join an aggregate to other tables.

#### Scalar subquery rules

```sql
SELECT name, (SELECT MAX(budget) FROM projects p WHERE p.lead_id = e.id) AS biggest
FROM employees e ORDER BY e.id;
```

Result:

| name | biggest |
|---|---|
| Asha | 500000 |
| Ravi | NULL |
| Meera | NULL |
| Kabir | 80000 |
| Zoya | NULL |

Zero rows give NULL. Two rows would fail: `SELECT (SELECT id FROM projects)` raises MySQL error 1242, "Subquery returns more than 1 row" (PostgreSQL: "more than one row returned by a subquery used as an expression"). Aggregate or `LIMIT 1` inside to guarantee one value.

#### MySQL restrictions and their workaround

```sql
SELECT name FROM employees
WHERE salary IN (SELECT salary FROM employees ORDER BY salary DESC LIMIT 2);  -- error 1235

SELECT name FROM employees
WHERE salary IN (
  SELECT salary FROM (SELECT salary FROM employees ORDER BY salary DESC LIMIT 2) AS top2
)
ORDER BY salary DESC;
```

Result:

| name |
|---|
| Asha |
| Ravi |

MySQL rejects `LIMIT` directly inside `IN`, but accepts it one level deeper in a derived table. The same wrapping fixes error 1093 in `DELETE ... WHERE id IN (SELECT ... FROM same_table)`, because the derived table is materialized before the delete starts. PostgreSQL runs the first form as written.

#### Subquery or join?

Use `EXISTS`/`IN` for "has at least one", a join when you need columns from both sides, and a derived table to pre-aggregate before joining. Modern optimizers rewrite many subqueries into joins, so choose the form that states the question most clearly, then check the plan if it is slow.

Connects to: correlated subqueries, anti-joins and semi-joins, CTEs, NULL handling.

### questions
Q: What happens when a scalar subquery returns zero rows or several rows?
A: Zero rows give NULL. Several rows raise an error at run time (MySQL error 1242). Make the subquery return one value, usually with an aggregate such as MAX, or a LIMIT 1 with an ORDER BY.

Q: What is the difference between IN and EXISTS?
A: IN compares a value with the list a subquery returns; EXISTS only asks whether a subquery returns any row, usually correlated with the outer row. They are often equivalent and optimized the same way, but NOT IN and NOT EXISTS differ when NULLs appear, where NOT EXISTS is the safe one.

Q: What is a derived table and why must it have an alias in MySQL?
A: A subquery in the FROM clause, treated as a temporary table for the outer query. MySQL requires every derived table to be named (error 1248 otherwise) so its columns can be referenced; PostgreSQL 16 made the alias optional.

Q: Why does MySQL reject DELETE FROM t WHERE id IN (SELECT id FROM t WHERE ...), and how do you fix it?
A: MySQL doesn't let a statement modify a table while reading the same table in a subquery (error 1093). Wrapping the subquery in a derived table, SELECT id FROM (SELECT id FROM t WHERE ...) AS x, forces it to be computed first, which MySQL accepts.

## sql.subqueries.correlated-subqueries
name: "Correlated subqueries"
importance: must
prereqs: [sql.subqueries.subqueries]
scope: "per-row subqueries and their cost"

### simple
A correlated subquery is an inner query that refers to the current row of the outer query, so its answer changes from row to row. "Employees who earn more than their own department's average" needs a different average for each employee. It is like re-checking a price list for every item in a shopping cart instead of once for the whole cart.

### interview
- The inner query references an outer column (`WHERE i.dept = e.dept`), so **logically it runs once per outer row**.
- Typical uses: comparison with a per-group value (above the department average), the latest row per group (`placed_on = (SELECT MAX(...) WHERE same customer)`), `EXISTS`/`NOT EXISTS` checks.
- **Cost**: n outer rows × the inner query's cost. Without an index on the correlated column that is O(n × m), quadratic on one table. With an index each probe is O(log m) plus the matching rows.
- Optimizers decorrelate `EXISTS`/`IN` into semi-joins well; scalar aggregates like `(SELECT AVG(...) WHERE i.dept = e.dept)` often still run per row (MySQL shows a "dependent" subquery in `EXPLAIN`, PostgreSQL a `SubPlan`).
- Rewrites: join to a **grouped derived table** (compute every group's value once), or a **window function** (`AVG(salary) OVER (PARTITION BY dept)`).
- Correlated subqueries in `UPDATE`/`DELETE` are common and fine when indexed.

### deep
#### Worked example

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  dept VARCHAR(10) NOT NULL,
  salary INT NOT NULL
);
INSERT INTO employees VALUES
  (1, 'Asha', 'eng', 120000), (2, 'Ravi', 'eng', 95000), (3, 'Arjun', 'eng', 88000),
  (4, 'Meera', 'sales', 70000), (5, 'Kabir', 'sales', 82000), (6, 'Zoya', 'ops', 64000);

SELECT e.name, e.dept, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(i.salary) FROM employees i WHERE i.dept = e.dept)
ORDER BY e.id;
```

Result:

| name | dept | salary |
|---|---|---|
| Asha | eng | 120000 |
| Kabir | sales | 82000 |

Trace the inner query per outer row:

| outer row | inner query computes | test |
|---|---|---|
| Asha (eng) | AVG over eng = 101000 | 120000 > 101000 keep |
| Ravi (eng) | 101000 again | 95000 fails |
| Arjun (eng) | 101000 again | 88000 fails |
| Meera (sales) | AVG over sales = 76000 | 70000 fails |
| Kabir (sales) | 76000 again | keep |
| Zoya (ops) | AVG over ops = 64000 | 64000 > 64000 fails |

The engineering average was computed three times. That repetition is the cost to watch.

#### Rewrite 1: join to a grouped derived table

```sql
SELECT e.name, e.dept, e.salary
FROM employees e
JOIN (SELECT dept, AVG(salary) AS avg_salary FROM employees GROUP BY dept) d
  ON d.dept = e.dept
WHERE e.salary > d.avg_salary
ORDER BY e.id;
```

Every department's average is computed once, in one pass, then joined back.

#### Rewrite 2: a window function

```sql
SELECT name, dept, salary FROM (
  SELECT name, dept, salary, id,
         AVG(salary) OVER (PARTITION BY dept) AS dept_avg
  FROM employees
) t
WHERE salary > dept_avg
ORDER BY id;
```

Result:

| name | dept | salary |
|---|---|---|
| Asha | eng | 120000 |
| Kabir | sales | 82000 |

Each row keeps its own columns and gains its department's average, computed in one sorted pass. Both rewrites return the same two rows as the correlated version.

#### How much the cost matters

One run on the session's cloud machine, with 20,000 orders over 2,000 customers, asking for orders above their customer's average amount:

| version | MySQL 8.0 | PostgreSQL 16 |
|---|---|---|
| correlated, no index on `customer_id` | about 39 s | about 10 s |
| correlated, with that index | about 150 ms | about 180 ms |
| join to a grouped derived table | about 20 ms | about 8 ms |
| window function | about 20 ms | not measured |

Without an index, each of the 20,000 outer rows scans all 20,000 rows: 400 million row visits. The index cuts each probe to about 10 rows; the rewrites read the table only a couple of times. Neither database rewrote the correlated scalar subquery on its own (MySQL's `EXPLAIN` shows "subquery in condition; dependent", PostgreSQL a `SubPlan`).

#### When correlated subqueries are the right tool

- `EXISTS`/`NOT EXISTS`: optimizers turn them into semi-joins and anti-joins, so they are not run per row.
- Small outer sets, or an index that makes each probe cheap.
- `UPDATE ... SET x = (SELECT ... WHERE inner.key = outer.key)` for one-off data fixes.

Connects to: subqueries, PARTITION BY, GROUP BY and HAVING, anti-joins and semi-joins, B+ tree indexes, query plans.

### questions
Q: What makes a subquery correlated?
A: It references a column of the outer query, such as WHERE i.dept = e.dept, so its result depends on the current outer row. Logically it is evaluated once per outer row, unlike an uncorrelated subquery that runs once.

Q: Why can a correlated subquery be slow, and how do you speed it up?
A: It may run once per outer row; without an index on the correlated column each run scans the inner table, giving O(n times m) work. Add an index on the correlated column, or rewrite it as a join to a grouped derived table or as a window function so each group is computed once.

Q: How do you find employees who earn more than their department's average?
A: Compare each salary with a per-department average: a correlated subquery WHERE salary > (SELECT AVG(salary) FROM employees i WHERE i.dept = e.dept), a join to a derived table of averages per department, or AVG(salary) OVER (PARTITION BY dept) in a subquery and a filter outside it.

Q: Are EXISTS subqueries executed once per row?
A: Logically yes, but optimizers usually transform EXISTS and NOT EXISTS into semi-joins and anti-joins using hash joins or index lookups, so they rarely cost a full scan per row. Scalar aggregate subqueries are the ones that more often stay per row.

## sql.subqueries.set-operations
name: "Set operations"
importance: important
scope: "UNION vs UNION ALL, INTERSECT, EXCEPT"

### simple
Set operations stack the results of two queries: UNION combines them, INTERSECT keeps rows found in both, and EXCEPT keeps rows of the first that aren't in the second. Think of two guest lists: everyone invited to either party, people invited to both, or people invited to the first but not the second. The two queries must return the same number of columns with compatible types.

### interview
- `UNION` combines and **removes duplicates** (a sort or hash over everything); `UNION ALL` keeps every row and is cheaper. Use `UNION ALL` unless you need deduplication.
- `INTERSECT` and `EXCEPT` (PostgreSQL; **MySQL 8.0.31 and later**) are set operations with deduplication; the `ALL` versions keep duplicate counts. Before 8.0.31, MySQL needed `IN`/`EXISTS` or joins for them.
- Columns match **by position**, not by name; the names come from the first query. Types must be compatible.
- `ORDER BY` and `LIMIT` at the end apply to the **whole** combined result. PostgreSQL allows only output column names or positions there; MySQL also accepts expressions.
- `INTERSECT` binds tighter than `UNION` and `EXCEPT`; use parentheses when mixing.
- Set operations compare whole rows and treat NULLs as equal (unlike `=` in a join), so `EXCEPT` is a NULL-safe anti-join on all columns.
- Common uses: merging two sources into one list, "in A but not B" checks, comparing two versions of a table.

### deep
#### Worked example

```sql
CREATE TABLE march_buyers (customer VARCHAR(20) NOT NULL);
CREATE TABLE april_buyers (customer VARCHAR(20) NOT NULL);
INSERT INTO march_buyers VALUES ('asha'), ('ravi'), ('meera'), ('ravi');
INSERT INTO april_buyers VALUES ('asha'), ('kabir'), ('asha');

SELECT customer FROM march_buyers
UNION
SELECT customer FROM april_buyers
ORDER BY customer;
```

Result:

| customer |
|---|
| asha |
| kabir |
| meera |
| ravi |

```sql
SELECT customer FROM march_buyers
UNION ALL
SELECT customer FROM april_buyers
ORDER BY customer;
```

Result:

| customer |
|---|
| asha |
| asha |
| asha |
| kabir |
| meera |
| ravi |
| ravi |

`UNION` gives each distinct customer once (4 rows); `UNION ALL` keeps all 7 rows, including Ravi's two March purchases.

```sql
SELECT customer FROM march_buyers
INTERSECT
SELECT customer FROM april_buyers;

SELECT customer FROM march_buyers
EXCEPT
SELECT customer FROM april_buyers
ORDER BY customer;
```

Result:

| customer |
|---|
| asha |

Result:

| customer |
|---|
| meera |
| ravi |

Asha bought in both months; Meera and Ravi bought in March but not in April (churn candidates).

#### Before MySQL 8.0.31

Older MySQL versions (and interview answers that must be portable) express the same with semi- and anti-joins:

```sql
SELECT DISTINCT m.customer FROM march_buyers m
WHERE NOT EXISTS (SELECT 1 FROM april_buyers a WHERE a.customer = m.customer)
ORDER BY m.customer;
```

Result:

| customer |
|---|
| meera |
| ravi |

One difference: `EXCEPT` treats two NULLs as equal, while `a.customer = m.customer` never matches NULLs. With nullable columns, write `a.customer <=> m.customer` in MySQL (`IS NOT DISTINCT FROM` in PostgreSQL) to get the same answer.

#### Matching by position

```sql
SELECT customer, 'march' AS month FROM march_buyers
UNION ALL
SELECT 'april', customer FROM april_buyers;  -- runs, but the columns are swapped
```

The second query's month lands in the `customer` column, with no error, because only positions and types are checked. Always list columns in the same order, and label the source when combining data from several places.

#### Costs

`UNION ALL` just appends: O(n + m). `UNION`, `INTERSECT` and `EXCEPT` must deduplicate: a hash table or a sort over both inputs, O(n + m) expected with hashing or O((n + m) log (n + m)) by sorting. Using `UNION` where `UNION ALL` suffices is a common hidden cost in reports over large tables.

Connects to: anti-joins and semi-joins, left, right and full outer joins (emulated with `UNION ALL`), DISTINCT, relational algebra (union, intersection, difference).

### questions
Q: What is the difference between UNION and UNION ALL?
A: UNION removes duplicate rows from the combined result, which requires a sort or hash over all rows. UNION ALL keeps every row, including duplicates, and simply appends the results, so it is faster. Use UNION ALL unless duplicates must go.

Q: How do you find rows in table A that are not in table B?
A: SELECT cols FROM A EXCEPT SELECT cols FROM B in PostgreSQL and MySQL 8.0.31 or later. Portable alternatives are NOT EXISTS with a correlated subquery or a LEFT JOIN with an IS NULL test; remember that EXCEPT treats NULLs as equal while equality joins don't.

Q: What rules must the queries in a UNION follow?
A: They must return the same number of columns with compatible types, matched by position; the result's column names come from the first query. A single ORDER BY and LIMIT at the end apply to the combined result.

Q: Does MySQL support INTERSECT and EXCEPT?
A: Since version 8.0.31, yes, including the ALL variants. Older versions need IN or EXISTS for intersection and NOT EXISTS or a left anti-join for difference.

## sql.subqueries.ctes
name: "CTEs"
importance: must
prereqs: [sql.subqueries.subqueries]
scope: "WITH clauses for readable queries"

### simple
A CTE (common table expression) gives a name to a small query at the top of a bigger one, with WITH name AS (...), so the main query can use it like a table. It is like writing intermediate results on a whiteboard, labelled, before the final calculation. Long queries become a list of readable steps instead of nested parentheses.

### interview
- `WITH step1 AS (...), step2 AS (SELECT ... FROM step1) SELECT ... FROM step2`: each CTE can use the ones before it. It exists only for that one statement.
- Benefits: **readability** (top-down steps with names), **reuse** (reference the same CTE twice instead of copying a subquery), and **recursion** (`WITH RECURSIVE`).
- MySQL supports CTEs from **8.0**; PostgreSQL for a long time. Both also allow `WITH` before `UPDATE`, `DELETE` and `INSERT ... SELECT`, and PostgreSQL even allows data-modifying CTEs (`WITH moved AS (DELETE ... RETURNING *) INSERT ...`).
- **Performance**: a CTE is not automatically a cached temp table. PostgreSQL 12+ inlines a CTE used once into the main query (like a subquery) and materializes one used several times, with `MATERIALIZED` / `NOT MATERIALIZED` to override; MySQL merges or materializes CTEs like derived tables.
- CTE vs view vs temporary table: a CTE lives for one statement, a view is a stored query, a temporary table is stored data for the session.
- A good interview habit: write complex queries as CTE steps, then check each step on its own.

### deep
#### Worked example: monthly revenue and its growth

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(20) NOT NULL,
  amount INT NOT NULL,
  placed_on DATE NOT NULL
);
INSERT INTO orders VALUES
  (1, 'asha', 400, '2026-01-05'), (2, 'ravi', 600, '2026-01-20'),
  (3, 'asha', 900, '2026-02-02'), (4, 'meera', 300, '2026-02-14'),
  (5, 'ravi', 450, '2026-03-03'), (6, 'kabir', 150, '2026-03-28'),
  (7, 'asha', 1000, '2026-03-30');

WITH monthly AS (
  SELECT DATE_FORMAT(placed_on, '%Y-%m') AS month, SUM(amount) AS revenue
  FROM orders
  GROUP BY month
),
with_prev AS (
  SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev
  FROM monthly
)
SELECT month, revenue, prev,
       ROUND(100 * (revenue - prev) / prev, 1) AS growth_pct
FROM with_prev
ORDER BY month;
```

Result:

| month | revenue | prev | growth_pct |
|---|---|---|---|
| 2026-01 | 1000 | NULL | NULL |
| 2026-02 | 1200 | 1000 | 20.0 |
| 2026-03 | 1600 | 1200 | 33.3 |

Read it top to bottom: `monthly` turns orders into one row per month; `with_prev` puts last month's revenue next to each month; the final query computes growth. Written as nested subqueries, the same logic reads inside out.

#### Reusing a step

"Customers who spent more than the average customer" needs per-customer totals twice: once to compute the average, once to compare.

```sql
WITH totals AS (
  SELECT customer, SUM(amount) AS spent FROM orders GROUP BY customer
)
SELECT customer, spent
FROM totals
WHERE spent > (SELECT AVG(spent) FROM totals)
ORDER BY spent DESC;
```

Result:

| customer | spent |
|---|---|
| asha | 2300 |
| ravi | 1050 |

The totals are asha 2300, ravi 1050, meera 300 and kabir 150, so the average customer spent 950. The same named step feeds both the average and the comparison; without the CTE, the grouping subquery would be written out twice.

#### Materialized or inlined?

In PostgreSQL 12+, a CTE referenced once is inlined into the main query, so filters can be pushed inside it; one referenced more than once, like `totals` above, is computed once and reused. Before version 12 every CTE was an "optimization fence", a classic reason old advice warns about CTE performance. Force either behavior with `WITH totals AS MATERIALIZED (...)` or `NOT MATERIALIZED`. MySQL 8 decides the same way it does for derived tables: merge into the outer query when possible, otherwise materialize once per statement.

#### Edge cases and bugs

- A CTE's name hides a real table of the same name inside that statement.
- Column names come from the CTE's select list, or an explicit list: `WITH t (month, revenue) AS (...)`.
- CTEs don't persist: a second statement can't see them. For several statements, use a temporary table or a view.
- MySQL 5.7 and older have no CTEs; there, write the steps as derived tables.

Connects to: subqueries, recursive CTEs, window functions, views and materialized views.

### questions
Q: What is a CTE and why use one?
A: A named subquery defined with WITH at the start of a statement and usable like a table in the rest of it. It makes long queries readable as named steps, lets you reference the same intermediate result more than once, and enables recursive queries.

Q: Is a CTE computed once and cached?
A: Not necessarily. PostgreSQL 12 and later inline a CTE used once and materialize one used several times, with MATERIALIZED or NOT MATERIALIZED to force a choice. MySQL merges it into the outer query or materializes it, like a derived table. Check the plan rather than assuming.

Q: What is the difference between a CTE, a view and a temporary table?
A: A CTE exists only inside one statement. A view is a named query stored in the schema that anyone with rights can reuse. A temporary table stores actual rows for the rest of the session and can be indexed.

Q: Can a CTE refer to another CTE?
A: Yes, a CTE can use any CTE defined before it in the same WITH clause, which is how multi-step queries are built. With WITH RECURSIVE, a CTE can also refer to itself.

## sql.subqueries.recursive-ctes
name: "Recursive CTEs"
importance: important
prereqs: [sql.subqueries.ctes]
scope: "hierarchies and sequences"

### simple
A recursive CTE is a query that feeds its own output back into itself until nothing new appears. It can walk a whole family tree or org chart, level by level, or count from 1 to 100. It is like asking "who reports to Asha?", then "who reports to those people?", and so on until no one is left.

### interview
- Shape: `WITH RECURSIVE r AS (anchor UNION ALL recursive_step) SELECT ... FROM r`. The **anchor** runs once; the **recursive step** references `r` and runs on the rows produced by the previous round; it stops when a round adds no rows.
- Uses: **hierarchies** (org charts, category trees, bill of materials), **graph reachability**, **generating sequences** (numbers, dates to fill gaps).
- Always include a **termination condition** (`WHERE n < 100`, or the data running out). Cycles in the data loop forever with `UNION ALL`; `UNION` stops on repeated rows, tracking a path lets you skip visited nodes, and PostgreSQL 14+ has a `CYCLE` clause.
- **MySQL**: stops at `cte_max_recursion_depth` (default 1000 rounds) with error 3636, and sizes columns from the anchor, so a growing string needs `CAST(... AS CHAR(200))` in the anchor (otherwise error 1406, "Data too long"). **PostgreSQL** has no round limit but requires the anchor's column types to match the recursive part's exactly (cast to `text`).
- It is breadth-first by rounds: track `depth + 1` to know the level.
- Adjacency lists with recursive CTEs are the usual way to store trees; alternatives are nested sets, materialized paths and closure tables.

### deep
#### Walking an org chart

```sql
CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL, manager_id INT);
INSERT INTO employees VALUES
  (1, 'Asha', NULL), (2, 'Ravi', 1), (3, 'Meera', 1),
  (4, 'Kabir', 3), (5, 'Zoya', 3), (6, 'Arjun', 5);

WITH RECURSIVE chain AS (
  SELECT id, name, 0 AS depth, CAST(name AS CHAR(200)) AS path
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, c.depth + 1, CONCAT(c.path, ' > ', e.name)
  FROM employees e
  JOIN chain c ON e.manager_id = c.id
)
SELECT name, depth, path FROM chain ORDER BY path;
```

Result:

| name | depth | path |
|---|---|---|
| Asha | 0 | Asha |
| Meera | 1 | Asha > Meera |
| Kabir | 2 | Asha > Meera > Kabir |
| Zoya | 2 | Asha > Meera > Zoya |
| Arjun | 3 | Asha > Meera > Zoya > Arjun |
| Ravi | 1 | Asha > Ravi |

Round by round:

| round | rows added |
|---|---|
| anchor | Asha (depth 0) |
| 1 | Ravi, Meera (their manager is Asha) |
| 2 | Kabir, Zoya (their manager is Meera) |
| 3 | Arjun (his manager is Zoya) |
| 4 | none, so the recursion stops |

Sorting by `path` prints the tree in depth-first order. Without the `CAST`, MySQL sizes `path` from the anchor's `name` (20 characters) and the query fails with error 1406, "Data too long for column 'path'", once a path grows. PostgreSQL is strict in a different way: it requires the anchor and the recursive part to produce exactly the same type, so both the uncast `VARCHAR(20)` and MySQL's `CHAR(200)` fail there ("column 4 has type ... in non-recursive term but type ... overall"), because `CONCAT` returns `text`. Write `name::text AS path` in PostgreSQL.

#### Generating a sequence of dates

```sql
CREATE TABLE sales (day DATE PRIMARY KEY, units INT NOT NULL);
INSERT INTO sales VALUES ('2026-03-01', 5), ('2026-03-03', 2), ('2026-03-04', 8);

WITH RECURSIVE days AS (
  SELECT DATE '2026-03-01' AS day
  UNION ALL
  SELECT DATE_ADD(day, INTERVAL 1 DAY) FROM days WHERE day < '2026-03-05'
)
SELECT d.day, COALESCE(s.units, 0) AS units
FROM days d LEFT JOIN sales s ON s.day = d.day
ORDER BY d.day;
```

Result:

| day | units |
|---|---|
| 2026-03-01 | 5 |
| 2026-03-02 | 0 |
| 2026-03-03 | 2 |
| 2026-03-04 | 8 |
| 2026-03-05 | 0 |

The recursive part adds one day per round until the condition fails; the left join then fills the gaps with zeros. PostgreSQL has `generate_series('2026-03-01'::date, '2026-03-05', '1 day')` for this, which MySQL lacks.

#### Limits and cycles

A sequence longer than 1,000 rows fails in MySQL with error 3636 ("Recursive query aborted after 1001 iterations") unless you raise it: `SET SESSION cte_max_recursion_depth = 10000`. That limit is also a safety net: if the data contains a cycle (A manages B, B manages A), the recursion would otherwise never end. In PostgreSQL, which has no default limit, guard against cycles by carrying the path and skipping nodes already in it, or use `CYCLE id SET is_cycle USING visited` (version 14+).

#### Complexity

Each round joins the newest rows with the base table; with an index on `manager_id`, a tree of n nodes costs O(n log n) in total. The number of rounds equals the depth of the tree.

Connects to: CTEs, self join, BFS (each round is one BFS level), trees, graph representations.

### questions
Q: How does a recursive CTE execute?
A: The anchor query runs once and produces the first rows. Then the recursive query runs repeatedly, each time on the rows produced by the previous round, and its results are appended; when a round produces no new rows, it stops. The final SELECT reads everything accumulated.

Q: How do you find everyone under a given manager, at any depth?
A: Start the anchor at the manager's direct reports (or the manager), and in the recursive step join employees whose manager_id equals an id already found. Carry a depth column (depth + 1 per round) if you need levels, and a path if you need the chain.

Q: What stops a recursive CTE from running forever?
A: A condition that eventually produces no new rows, such as WHERE n < 100 or reaching the leaves of a tree. Cyclic data breaks that, so track visited nodes in a path, use UNION instead of UNION ALL, or PostgreSQL's CYCLE clause. MySQL also stops after cte_max_recursion_depth rounds, 1000 by default, with an error.

Q: Why does a MySQL recursive CTE fail with "Data too long for column"?
A: MySQL fixes each column's type from the anchor query, so a string that grows in later rounds can exceed the anchor's width. Cast the anchor's column to a wide enough type, such as CAST(name AS CHAR(200)).
