---
topic: sql.aggregation
name: "Aggregation"
subject: sql
order: 2
prereqs: [sql.basics]
---

## sql.aggregation.aggregate-functions
name: "Aggregate functions"
importance: must
scope: "COUNT, SUM, AVG, MIN, MAX, COUNT(*) vs COUNT(col)"

### simple
Aggregate functions squash many rows into one number: how many, the total, the average, the smallest or the largest. It is like the summary line at the bottom of a shopping receipt. Without grouping, the whole table becomes one summary row.

### interview
- `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of `col`; `COUNT(DISTINCT col)` counts different non-NULL values.
- `SUM`, `AVG`, `MIN`, `MAX` **ignore NULLs**. `MIN`/`MAX` also work on strings and dates.
- With no `GROUP BY`, an aggregate query returns **exactly one row, even over zero rows**: `COUNT` gives 0, the others NULL (`COALESCE(SUM(x), 0)` for a zero). With `GROUP BY`, zero input rows give zero output rows.
- You can't mix aggregates with plain columns unless those columns are grouped (MySQL 8's default `ONLY_FULL_GROUP_BY` and PostgreSQL both reject it).
- Division: MySQL's `/` always gives a decimal (`AVG` of integers prints like `692.0000`); in PostgreSQL `SUM(x) / COUNT(x)` on integers is **integer division**, so cast or use `AVG`.
- Rates in one line: in MySQL `AVG(condition)` is the fraction of rows where it holds (true is 1); portable form `AVG(CASE WHEN cond THEN 1 ELSE 0 END)`.
- String aggregates: `GROUP_CONCAT(x ORDER BY x SEPARATOR ',')` in MySQL, `string_agg(x, ',' ORDER BY x)` in PostgreSQL.

### deep
#### Worked example

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(20) NOT NULL,
  amount INT,
  placed_on DATE NOT NULL
);
INSERT INTO orders VALUES
  (1, 'asha', 450, '2026-03-02'), (2, 'ravi', 90, '2026-03-02'),
  (3, 'asha', NULL, '2026-03-05'), (4, 'meera', 300, '2026-03-09'),
  (5, 'ravi', 2500, '2026-03-09'), (6, 'asha', 120, '2026-03-12');

SELECT COUNT(*) AS orders, COUNT(amount) AS priced,
       COUNT(DISTINCT customer) AS customers, SUM(amount) AS total,
       AVG(amount) AS average, MIN(amount) AS smallest, MAX(placed_on) AS latest
FROM orders;
```

Result:

| orders | priced | customers | total | average | smallest | latest |
|---|---|---|---|---|---|---|
| 6 | 5 | 3 | 3460 | 692.0000 | 90 | 2026-03-12 |

Order 3 has no amount yet. `COUNT(*)` counts it; `COUNT(amount)` doesn't; `AVG` divides 3460 by the 5 known amounts, not by 6. That is usually right ("average order value where we know it"), but say so in an interview.

#### Aggregates over no rows

```sql
SELECT COUNT(*) AS n, SUM(amount) AS total, MAX(amount) AS biggest
FROM orders WHERE customer = 'zoya';
```

Result:

| n | total | biggest |
|---|---|---|
| 0 | NULL | NULL |

One row, even though nothing matched: an aggregate without `GROUP BY` always summarizes the whole (possibly empty) input. Add `GROUP BY customer` and the same query returns **no rows**, because there are no groups. This difference matters for queries like "second highest salary", where an empty answer should often be a NULL row.

#### Rates and averages of conditions

```sql
SELECT ROUND(AVG(amount >= 300), 2) AS share_big,
       ROUND(AVG(CASE WHEN amount >= 300 THEN 1 ELSE 0 END), 2) AS share_case
FROM orders;
```

Result:

| share_big | share_case |
|---|---|
| 0.60 | 0.50 |

The two differ on order 3. `amount >= 300` is NULL when the amount is NULL, so `AVG` skips that row: 3 of 5. The `CASE` sends NULL to `ELSE 0`, so the row counts as "not big": 3 of 6. Decide which denominator you mean. `AVG(amount >= 300)` works only in MySQL (a true comparison is 1); PostgreSQL rejects `AVG` of a boolean, and the `CASE` form works in both.

#### Joining a group's values into a string

```sql
SELECT customer, GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS order_ids
FROM orders GROUP BY customer ORDER BY customer;
```

Result:

| customer | order_ids |
|---|---|
| asha | 1,3,6 |
| meera | 4 |
| ravi | 2,5 |

MySQL cuts `GROUP_CONCAT` output at `group_concat_max_len` (1024 bytes by default) with only a warning; raise it for long lists.

#### Integer division in PostgreSQL

```sql
-- PostgreSQL
SELECT 7 / 2 AS int_div, 7 / 2.0 AS exact, AVG(x) AS avg
FROM (VALUES (3), (4)) AS t(x);
```

Result:

| int_div | exact | avg |
|---|---|---|
| 3 | 3.5000000000000000 | 3.5000000000000000 |

A hand-written average `SUM(x) / COUNT(x)` over integers would be 3 in PostgreSQL and 3.5000 in MySQL. `AVG` is correct in both.

#### Cost

An aggregate is one pass over its input: O(n) time and O(1) memory for `COUNT`, `SUM`, `MIN`, `MAX` and `AVG`. `COUNT(DISTINCT)` needs a hash set or a sort. `MIN`/`MAX` of an indexed column can be answered from one end of the index without scanning.

#### Edge cases and bugs

- `SUM` of an empty or all-NULL input is NULL; reports usually want `COALESCE(SUM(x), 0)`.
- `COUNT(col)` where you meant `COUNT(*)` silently undercounts when `col` has NULLs; after a left join, count a column from the right table on purpose to count matches.
- Summing large `INT` values is safe in both databases: MySQL returns a `DECIMAL` and PostgreSQL a `bigint`.

Connects to: GROUP BY and HAVING, NULL handling, CASE WHEN, window functions.

### questions
Q: What is the difference between COUNT(*), COUNT(col) and COUNT(DISTINCT col)?
A: COUNT(*) counts rows, including rows full of NULLs. COUNT(col) counts rows where col is not NULL. COUNT(DISTINCT col) counts the different non-NULL values of col.

Q: What does SELECT SUM(amount) FROM orders WHERE 1 = 0 return?
A: One row containing NULL. Without GROUP BY an aggregate always returns one row, and SUM over nothing is NULL rather than 0; COUNT would return 0. With a GROUP BY the query would return no rows at all.

Q: Why can AVG(amount) differ from SUM(amount) / COUNT(*)?
A: AVG ignores NULLs, so it divides by the number of non-NULL amounts, while COUNT(*) counts every row. In PostgreSQL an integer SUM divided by an integer COUNT also truncates, which AVG avoids.

Q: How do you compute the fraction of rows meeting a condition?
A: Average an indicator: AVG(CASE WHEN condition THEN 1 ELSE 0 END), which works everywhere, or AVG(condition) in MySQL, where true counts as 1. Watch rows where the condition is NULL: the CASE form counts them as 0, the MySQL shortcut skips them.

Q: Can you select a plain column next to an aggregate without GROUP BY?
A: Not in standard SQL: the database would have to pick one value from many rows. MySQL 8 with ONLY_FULL_GROUP_BY (the default) and PostgreSQL both reject it; group by the column, aggregate it, or use a window function if every row should stay.

## sql.aggregation.group-by-and-having
name: "GROUP BY and HAVING"
importance: must
prereqs: [sql.aggregation.aggregate-functions]
scope: "grouping and filtering groups, WHERE vs HAVING"

### simple
GROUP BY sorts rows into piles that share a value, such as one pile per customer, and then each aggregate summarizes each pile separately. HAVING throws away whole piles that fail a test, like "keep customers with at least two orders". WHERE filters single rows before the piles are made; HAVING filters the piles afterwards.

### interview
- `GROUP BY k` makes **one output row per distinct value of k**; the select list may contain the grouping columns, aggregates, and columns functionally dependent on the key (such as other columns of the table whose primary key is grouped).
- **`WHERE` filters rows before grouping; `HAVING` filters groups after aggregation.** Aggregates can't appear in `WHERE`. Put every row-level condition in `WHERE`: fewer rows to group, and indexes can help.
- MySQL 8's default `ONLY_FULL_GROUP_BY` rejects ungrouped, non-dependent columns (error 1055), like PostgreSQL. `ANY_VALUE(col)` in MySQL says "any value from the group is fine".
- **Aliases**: MySQL accepts a select alias in `HAVING` (`HAVING n > 1`); PostgreSQL doesn't (repeat `COUNT(*)`). Both accept aliases in `GROUP BY` and `ORDER BY`.
- NULL keys form one group. Group order isn't guaranteed: add `ORDER BY`.
- Subtotals: MySQL `GROUP BY a, b WITH ROLLUP`, PostgreSQL `GROUP BY ROLLUP (a, b)`; `GROUPING(col)` tells a subtotal row's NULL from a real NULL.
- Classic uses: duplicates (`HAVING COUNT(*) > 1`), "at least k", totals per category, monthly reports.

### deep
#### Worked example

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(20) NOT NULL,
  amount INT NOT NULL,
  placed_on DATE NOT NULL
);
INSERT INTO orders VALUES
  (1, 'asha', 450, '2026-03-02'), (2, 'ravi', 90, '2026-03-02'),
  (3, 'asha', 700, '2026-04-05'), (4, 'meera', 300, '2026-03-09'),
  (5, 'ravi', 2500, '2026-03-09'), (6, 'asha', 120, '2026-03-12'),
  (7, 'meera', 60, '2026-03-20');

-- March customers with at least two orders and more than 500 spent
SELECT customer, COUNT(*) AS n, SUM(amount) AS spent
FROM orders
WHERE placed_on >= '2026-03-01' AND placed_on < '2026-04-01'
GROUP BY customer
HAVING COUNT(*) >= 2 AND SUM(amount) > 500
ORDER BY spent DESC;
```

Result:

| customer | n | spent |
|---|---|---|
| ravi | 2 | 2590 |
| asha | 2 | 570 |

Trace it in evaluation order:

| step | what remains |
|---|---|
| `FROM` | 7 orders |
| `WHERE` (March only) | 6 orders: order 3 is from April |
| `GROUP BY customer` | asha {450, 120}, meera {300, 60}, ravi {90, 2500} |
| aggregates | asha 2 and 570, meera 2 and 360, ravi 2 and 2590 |
| `HAVING` | asha and ravi pass; meera's 360 fails the total |
| `ORDER BY spent DESC` | ravi, then asha |

Asha's April order of 700 never reaches her group: `WHERE` removed it before grouping. Tracing a query step by step like this is the quickest way to catch your own mistakes in an interview.

#### WHERE vs HAVING

`HAVING placed_on >= '2026-03-01'` instead of the `WHERE` would be rejected, because `placed_on` isn't grouped. Moving the month test into `HAVING` as an aggregate (`HAVING MAX(placed_on) < '2026-04-01'`) changes the meaning: it drops Asha entirely, since one of her orders is from April, instead of ignoring that one order. Rule: row conditions in `WHERE`, conditions on aggregates in `HAVING`.

#### The ONLY_FULL_GROUP_BY error

```sql
SELECT customer, placed_on, SUM(amount) AS spent
FROM orders GROUP BY customer;  -- error 1055: placed_on is not in GROUP BY

SELECT customer, MAX(placed_on) AS last_order, SUM(amount) AS spent
FROM orders GROUP BY customer ORDER BY customer;
```

Result:

| customer | last_order | spent |
|---|---|---|
| asha | 2026-04-05 | 1270 |
| meera | 2026-03-20 | 360 |
| ravi | 2026-03-09 | 2590 |

Each customer has several dates, so "the" date is undefined. Pick one with an aggregate. Old MySQL versions (before 5.7) silently returned an arbitrary date, a source of bugs that `ONLY_FULL_GROUP_BY` now prevents.

#### Grouping by an expression, with subtotals

```sql
SELECT DATE_FORMAT(placed_on, '%Y-%m') AS month, customer, SUM(amount) AS spent
FROM orders
GROUP BY month, customer WITH ROLLUP
HAVING GROUPING(customer) = 1;
```

Result:

| month | customer | spent |
|---|---|---|
| 2026-03 | NULL | 3520 |
| 2026-04 | NULL | 700 |
| NULL | NULL | 4220 |

`WITH ROLLUP` adds a subtotal row per month and a grand total; `GROUPING(customer) = 1` keeps only those subtotal rows here. In PostgreSQL, write the month as `to_char(placed_on, 'YYYY-MM')` and group with `GROUP BY ROLLUP (month, customer)`; the result is the same three rows.

#### Complexity

Grouping is done by hashing (O(n) expected, memory for one entry per group) or by sorting (O(n log n), or free if an index already delivers rows in key order). `HAVING` is a cheap filter over the groups.

Connects to: aggregate functions, finding duplicates, pivoting rows to columns, PARTITION BY (which keeps every row instead of collapsing groups).

### questions
Q: What is the difference between WHERE and HAVING?
A: WHERE filters individual rows before grouping and can't use aggregates. HAVING filters groups after aggregation, so it can test COUNT(*) or SUM(x). Put row-level conditions in WHERE so fewer rows are grouped and indexes can be used.

Q: Why does MySQL 8 reject SELECT customer, placed_on, SUM(amount) FROM orders GROUP BY customer?
A: placed_on isn't grouped and isn't determined by customer, so each group has many possible values and the result would be arbitrary. ONLY_FULL_GROUP_BY, on by default, rejects it. Aggregate it, add it to GROUP BY, or use ANY_VALUE if any value is acceptable.

Q: How do you find customers with at least three orders?
A: SELECT customer FROM orders GROUP BY customer HAVING COUNT(*) >= 3. The GROUP BY makes one row per customer and HAVING keeps the groups whose count reaches three.

Q: Can you use a select alias in HAVING?
A: In MySQL yes, for example HAVING n > 1 where n is COUNT(*) AS n. PostgreSQL follows the standard and doesn't allow it, so you repeat the aggregate. Both allow aliases in ORDER BY.

Q: How do you get subtotals and a grand total in one query?
A: Use ROLLUP: GROUP BY a, b WITH ROLLUP in MySQL or GROUP BY ROLLUP (a, b) in PostgreSQL. It adds rows where the rolled-up columns are NULL; GROUPING(col) returns 1 on those rows, which tells them apart from real NULL values.
