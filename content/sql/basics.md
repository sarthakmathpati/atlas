---
topic: sql.basics
name: "SQL basics"
subject: sql
order: 1
prereqs: [dbms.relational]
---

## sql.basics.select-where-and-order-by
name: "SELECT, WHERE and ORDER BY"
importance: must
scope: "filtering and sorting"

### simple
A SELECT query asks a table for some of its columns, WHERE keeps only the rows that pass a test, and ORDER BY sorts whatever is left. It is like asking a librarian for the title and author of every chemistry book, sorted by year. You describe the result you want, and the database works out how to fetch it.

### interview
- **Logical order**: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`. That is why a `SELECT` alias can't be used in `WHERE` but can be used in `ORDER BY`.
- `WHERE` keeps rows whose condition is **true**: comparisons, `AND`/`OR`/`NOT` (`AND` binds tighter than `OR`, so add parentheses), `BETWEEN` (inclusive at both ends), `IN (...)`, `LIKE` with `%` (any run of characters) and `_` (one character).
- `ORDER BY a DESC, b` sorts by several keys. **Without `ORDER BY` there is no guaranteed order**, even if the output looks sorted. Add a unique column as the last key so ties come out the same way every time.
- A condition on a bare indexed column can use the index; wrapping the column in a function (`YEAR(hired_on) = 2024`) usually can't. Rewrite it as a range.
- MySQL vs PostgreSQL: MySQL's default collation (`utf8mb4_0900_ai_ci`) compares strings **case- and accent-insensitively**, so `'asha' = 'Asha'` is true; PostgreSQL compares case-sensitively. In ascending order MySQL puts `NULL`s first, PostgreSQL last.

### deep
#### Intuition

Read a query in the order the database logically evaluates it, not the order it is written: take the rows (`FROM`), throw away the ones that fail the test (`WHERE`), compute the output columns (`SELECT`), then sort (`ORDER BY`). The optimizer may do the physical work in another order, using an index for example, but the result is always as if these steps ran one after another.

#### Worked example

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  dept VARCHAR(20) NOT NULL,
  salary INT NOT NULL,
  hired_on DATE NOT NULL
);
INSERT INTO employees VALUES
  (1, 'Asha', 'eng', 120000, '2021-03-15'),
  (2, 'Ravi', 'eng', 95000, '2023-07-01'),
  (3, 'Meera', 'sales', 70000, '2022-01-10'),
  (4, 'Kabir', 'sales', 82000, '2024-02-20'),
  (5, 'Zoya', 'ops', 64000, '2020-11-30'),
  (6, 'Arjun', 'eng', 95000, '2024-05-06');

SELECT name, dept, salary
FROM employees
WHERE salary >= 80000 AND dept IN ('eng', 'sales')
ORDER BY salary DESC, name;
```

Result:

| name | dept | salary |
|---|---|---|
| Asha | eng | 120000 |
| Arjun | eng | 95000 |
| Ravi | eng | 95000 |
| Kabir | sales | 82000 |

Step by step: `FROM` reads six rows. `WHERE` drops Meera (salary too low) and Zoya (salary and department both fail). `SELECT` keeps three columns. `ORDER BY` sorts by salary, highest first, and breaks the Arjun and Ravi tie by name. Without `name` as the second key, those two could come out in either order.

#### Aliases and the evaluation order

```sql
SELECT name, salary DIV 12 AS monthly
FROM employees
WHERE monthly > 7000;  -- error 1054: unknown column 'monthly' in 'where clause'

SELECT name, salary DIV 12 AS monthly
FROM employees
WHERE salary DIV 12 > 7000
ORDER BY monthly DESC, name;
```

Result:

| name | monthly |
|---|---|
| Asha | 10000 |
| Arjun | 7916 |
| Ravi | 7916 |

`WHERE` runs before `SELECT` creates the alias, so repeat the expression there; `ORDER BY` runs after, so the alias works. (`DIV` is MySQL's integer division; `/` would give `7916.6667`.)

#### AND binds tighter than OR

```sql
SELECT name FROM employees
WHERE dept = 'eng' OR dept = 'sales' AND salary > 100000
ORDER BY id;
```

Result:

| name |
|---|
| Asha |
| Ravi |
| Arjun |

This means "every engineer, plus salespeople above 100,000". Writing `(dept = 'eng' OR dept = 'sales') AND salary > 100000` returns only Asha.

#### Filtering dates so an index can help

```sql
SELECT name FROM employees
WHERE hired_on >= '2024-01-01' AND hired_on < '2025-01-01'
ORDER BY hired_on;
```

Result:

| name |
|---|
| Kabir |
| Arjun |

`WHERE YEAR(hired_on) = 2024` returns the same rows, but it computes `YEAR` for every row, so an index on `hired_on` can't be used for a range scan. The half-open range (`>=` start, `<` next start) also works for `DATETIME` columns, where `BETWEEN '2024-01-01' AND '2024-12-31'` would miss everything after midnight on 31 December.

#### MySQL and PostgreSQL

| behavior | MySQL 8 | PostgreSQL 16 |
|---|---|---|
| `'asha' = 'Asha'` | true (default collation ignores case and accents) | false; use `lower(name) = 'asha'` or `ILIKE` |
| `LIKE 'as%'` on `'Asha'` | matches | no match (`ILIKE` matches) |
| `NULL` in `ORDER BY x` | first | last; `NULLS FIRST` / `NULLS LAST` choose |
| quoting identifiers | backticks: `` `order` `` | double quotes: `"order"` |
| `5 / 2` | `2.5000` | `2` (integer division) |

#### Edge cases and bugs

- `= NULL` is never true; use `IS NULL` (see NULL handling).
- `ORDER BY 2` sorts by the second output column: legal, but it breaks silently when someone edits the column list.
- Comparing a string column with a number (`WHERE phone = 98765`) makes MySQL convert every value, so the index isn't used and `'098765'` matches too. Compare with a string.

Connects to: relational algebra (selection and projection), DISTINCT, LIMIT and OFFSET, NULL handling, indexes and when they are used.

### questions
Q: In what order are the clauses of a SELECT logically evaluated?
A: FROM (with joins), WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, then LIMIT. That is why an alias defined in SELECT can't be used in WHERE but can be used in ORDER BY. The optimizer may execute things differently, but the result must match this order.

Q: Why can the same query return rows in a different order on another day?
A: Without ORDER BY, SQL guarantees no order; rows come out however the plan produces them, which changes with indexes, parallel scans or new data. Always sort explicitly, and end the sort with a unique column when ties matter.

Q: What does WHERE a = 1 OR b = 2 AND c = 3 mean?
A: AND binds tighter than OR, so it means a = 1 OR (b = 2 AND c = 3). Add parentheses whenever AND and OR are mixed, because the other reading is usually what was intended.

Q: Why is WHERE YEAR(hired_on) = 2024 slower than a date range?
A: Wrapping the column in a function hides it from an ordinary index, so every row's year must be computed. hired_on >= '2024-01-01' AND hired_on < '2025-01-01' compares the bare column and can use an index range scan.

Q: Is 'asha' = 'Asha' true?
A: It depends on the collation. In MySQL 8 the default utf8mb4_0900_ai_ci collation ignores case and accents, so it is true. In PostgreSQL it is false; compare lower(name) or use ILIKE there.

## sql.basics.distinct-limit-and-offset
name: "DISTINCT, LIMIT and OFFSET"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "deduplication and pagination"

### simple
DISTINCT removes repeated rows from a result, like crossing out duplicate names on a guest list. LIMIT keeps only the first few rows, and OFFSET skips some rows first, which is how a website shows page 3 of its results. Both only make sense when the rows are sorted.

### interview
- `DISTINCT` works on the **whole output row**: `SELECT DISTINCT dept, city` removes repeated pairs, not repeated departments. All `NULL`s count as one value for `DISTINCT` and `GROUP BY`.
- `COUNT(DISTINCT col)` counts different non-NULL values.
- `LIMIT n OFFSET m` skips `m` rows and returns the next `n`. MySQL also accepts `LIMIT m, n` (offset first, an easy mix-up). PostgreSQL also has the standard `OFFSET m ROWS FETCH FIRST n ROWS ONLY`, which MySQL doesn't support.
- **`LIMIT` without a deterministic `ORDER BY` returns arbitrary rows**; ties at the page boundary can repeat or skip rows between pages.
- **Offset pagination gets slower with depth**: the database still produces and throws away the skipped rows. **Keyset (seek) pagination** remembers the last row's sort key and asks for rows after it, which an index serves directly at any depth.
- MySQL only accepts constants or variables in `LIMIT` (`LIMIT n - 1` is a syntax error) and doesn't allow `LIMIT` inside an `IN (...)` subquery.
- `DISTINCT` used to hide duplicates from a wrong join is a warning sign: fix the join instead.

### deep
#### Deduplication

```sql
CREATE TABLE visits (
  id INT PRIMARY KEY,
  user_name VARCHAR(20) NOT NULL,
  city VARCHAR(20) NOT NULL
);
INSERT INTO visits VALUES
  (1, 'asha', 'Pune'), (2, 'ravi', 'Delhi'), (3, 'asha', 'Pune'),
  (4, 'meera', 'Pune'), (5, 'asha', 'Delhi'), (6, 'ravi', 'Delhi');

SELECT DISTINCT user_name, city FROM visits ORDER BY user_name, city;
SELECT COUNT(*) AS visits, COUNT(DISTINCT user_name) AS users,
       COUNT(DISTINCT city) AS cities
FROM visits;
```

Result:

| user_name | city |
|---|---|
| asha | Delhi |
| asha | Pune |
| meera | Pune |
| ravi | Delhi |

Result:

| visits | users | cities |
|---|---|---|
| 6 | 3 | 2 |

Asha appears twice because her two cities make two different pairs. `COUNT(DISTINCT ...)` answers "how many different users?" in one pass.

#### Offset pagination

```sql
CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL, price INT NOT NULL);
INSERT INTO products VALUES
  (1, 'lamp', 40), (2, 'mug', 12), (3, 'desk', 250), (4, 'pen', 3),
  (5, 'chair', 120), (6, 'plant', 40), (7, 'book', 18);

-- page 2 with 3 items per page
SELECT id, name, price FROM products
ORDER BY price DESC, id DESC
LIMIT 3 OFFSET 3;
```

Result:

| id | name | price |
|---|---|---|
| 1 | lamp | 40 |
| 7 | book | 18 |
| 2 | mug | 12 |

Page 1 was desk, chair and plant. The tie between plant and lamp (both 40) is broken by `id`, so the boundary between pages is stable. `LIMIT 3, 3` is MySQL's short form of the same query.

#### Keyset pagination

The last row of page 1 was (price 40, id 6). Ask for the rows that come after it in the sort order:

```sql
SELECT id, name, price FROM products
WHERE price < 40 OR (price = 40 AND id < 6)
ORDER BY price DESC, id DESC
LIMIT 3;
```

Result:

| id | name | price |
|---|---|---|
| 1 | lamp | 40 |
| 7 | book | 18 |
| 2 | mug | 12 |

Same page, different mechanics. With an index on `(price, id)`, the database jumps to the position after (40, 6) and reads three entries, whether this is page 2 or page 20,000. `OFFSET 60000` would read and discard 60,000 rows first. Keyset pages also stay correct when rows are inserted while someone is paging, where offsets shift and show a row twice. The trade-off: no "jump to page 57", only next and previous. Both databases accept the row-value form `WHERE (price, id) < (40, 6)` for this condition.

#### Costs

| operation | typical cost |
|---|---|
| `DISTINCT` / `COUNT(DISTINCT)` | a sort or hash over the rows, O(n log n) or O(n) with memory |
| `ORDER BY ... LIMIT k` | a top-k heap, O(n log k), or O(k) reading an index in order |
| `LIMIT k OFFSET m` | produces m + k rows and discards m |
| keyset page | O(log n + k) with a matching index |

#### Edge cases and bugs

- `SELECT DISTINCT name ... ORDER BY salary` is rejected by MySQL 8 and PostgreSQL: after deduplication each name could have several salaries, so the sort key must be in the select list.
- `COUNT(DISTINCT a, b)` works in MySQL only; in PostgreSQL write `COUNT(DISTINCT (a, b))`.
- "Second highest value" with `LIMIT 1 OFFSET 1` returns no row at all when there is only one distinct value; interviews usually want `NULL` then (see Nth highest salary).

Connects to: SELECT, WHERE and ORDER BY, aggregate functions, Nth highest salary, B+ tree indexes, API design (cursor pagination).

### questions
Q: Does SELECT DISTINCT a, b remove rows with a repeated a?
A: No. DISTINCT applies to the whole output row, so it only removes rows whose a and b are both the same as another row's. To get one row per a you need GROUP BY a with an aggregate for b, or a window function.

Q: Why must LIMIT be used with ORDER BY?
A: Without a sort, the database may return any n rows, and the choice can change between runs or pages. Sorting on a unique key (or ending the sort with one) makes the page boundaries deterministic.

Q: Why is OFFSET pagination slow for deep pages, and what is the alternative?
A: The database must produce all the skipped rows and discard them, so OFFSET 100000 does about 100,000 rows of work. Keyset pagination filters on the last seen sort key, for example WHERE (price, id) < (40, 6), so an index can seek straight to the next page at any depth.

Q: What does LIMIT 5, 10 mean in MySQL?
A: Skip 5 rows and return the next 10: the offset comes first in this short form. It equals LIMIT 10 OFFSET 5, which is clearer and also works in PostgreSQL.

Q: What happens to duplicates and NULLs under DISTINCT?
A: Rows that are equal in every selected column collapse into one, and NULLs are treated as equal to each other for this purpose, so several NULL rows become one. COUNT(DISTINCT col) ignores NULLs completely.

## sql.basics.null-handling
name: "NULL handling"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "IS NULL, COALESCE, NULL in comparisons and aggregates"

### simple
NULL means a value is missing or unknown; it is not zero and not empty text. Comparing anything with an unknown gives "unknown", so a row whose value is NULL fails both "equals 5" and "does not equal 5". Think of a blank answer on a form: you can't say whether it was yes or no.

### interview
- SQL uses **three-valued logic**: true, false and unknown. Any comparison with `NULL` is unknown, including `NULL = NULL`. `WHERE` keeps only rows where the condition is true.
- Test with `IS NULL` / `IS NOT NULL`. Null-safe equality: `a <=> b` in MySQL; the standard `a IS NOT DISTINCT FROM b` in PostgreSQL (MySQL doesn't support it).
- `COALESCE(a, b, ...)` returns the first non-NULL argument (portable); MySQL's `IFNULL(a, b)` takes two. `NULLIF(a, b)` returns NULL when a = b, the standard trick for safe division: `x / NULLIF(y, 0)`.
- **Aggregates skip NULLs**: `COUNT(col)`, `SUM`, `AVG`, `MIN`, `MAX` ignore them; `COUNT(*)` counts rows. `SUM` over only NULLs is NULL, not 0. `AVG(col)` and `AVG(COALESCE(col, 0))` answer different questions.
- **`NOT IN` with a NULL in the list returns no rows**: `x NOT IN (1, NULL)` is unknown for every x. Use `NOT EXISTS`.
- Arithmetic with NULL is NULL. MySQL's `CONCAT` returns NULL if any argument is NULL; PostgreSQL's `CONCAT` skips NULLs, while its `||` returns NULL.
- `GROUP BY` and `DISTINCT` put all NULLs in one group; a `UNIQUE` column may hold many NULLs (both databases).

### deep
#### Three-valued logic

| a | b | a AND b | a OR b |
|---|---|---|---|
| true | unknown | unknown | true |
| false | unknown | false | unknown |
| unknown | unknown | unknown | unknown |

`NOT unknown` is unknown. The rule of thumb: an unknown value could turn out to be either true or false, so the result is known only if both possibilities give the same answer.

#### Worked example

```sql
CREATE TABLE staff (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  bonus INT,
  manager_id INT
);
INSERT INTO staff VALUES
  (1, 'Asha', 5000, NULL), (2, 'Ravi', NULL, 1),
  (3, 'Meera', 2000, 1), (4, 'Kabir', NULL, 3);

SELECT name FROM staff WHERE bonus <> 5000 ORDER BY id;
```

Result:

| name |
|---|
| Meera |

Ravi and Kabir have no bonus recorded. `NULL <> 5000` is unknown, so they are dropped even though, in plain English, their bonus "is not 5000". If they should count, say so: `WHERE bonus <> 5000 OR bonus IS NULL`.

#### Aggregates skip NULLs

```sql
SELECT COUNT(*) AS people, COUNT(bonus) AS with_bonus, SUM(bonus) AS total,
       AVG(bonus) AS avg_recorded, AVG(COALESCE(bonus, 0)) AS avg_everyone
FROM staff;
```

Result:

| people | with_bonus | total | avg_recorded | avg_everyone |
|---|---|---|---|---|
| 4 | 2 | 7000 | 3500.0000 | 1750.0000 |

`AVG(bonus)` divides by the 2 recorded bonuses; `AVG(COALESCE(bonus, 0))` treats a missing bonus as zero and divides by 4. Neither is wrong: decide which question you are answering. PostgreSQL prints the same averages with more decimals (`3500.0000000000000000`).

#### The NOT IN trap

Who is nobody's manager?

```sql
SELECT name FROM staff
WHERE id NOT IN (SELECT manager_id FROM staff)
ORDER BY id;
```

Result: no rows at all.

The subquery yields (NULL, 1, 1, 3). For Ravi, `2 NOT IN (NULL, 1, 1, 3)` means `2 <> NULL AND 2 <> 1 AND ...`, and the unknown poisons the whole `AND`. Ask "is there a matching row?" instead, which is simply true or false:

```sql
SELECT name FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM staff r WHERE r.manager_id = s.id)
ORDER BY id;
```

Result:

| name |
|---|
| Ravi |
| Kabir |

Filtering `WHERE manager_id IS NOT NULL` inside the subquery also fixes `NOT IN`.

#### Replacing and producing NULLs

```sql
SELECT name, COALESCE(bonus, 0) AS bonus, 10000 / NULLIF(bonus, 0) AS ratio
FROM staff ORDER BY id;
```

Result:

| name | bonus | ratio |
|---|---|---|
| Asha | 5000 | 2.0000 |
| Ravi | 0 | NULL |
| Meera | 2000 | 5.0000 |
| Kabir | 0 | NULL |

`NULLIF(bonus, 0)` would also turn a zero bonus into NULL, so the division yields NULL instead of an error. (MySQL returns NULL with a warning for division by zero in a `SELECT`; PostgreSQL raises an error, so the `NULLIF` guard matters more there.)

#### MySQL and PostgreSQL

| expression | MySQL 8 | PostgreSQL 16 |
|---|---|---|
| null-safe equals | `a <=> b` | `a IS NOT DISTINCT FROM b` |
| two-argument default | `IFNULL(a, b)` | `COALESCE(a, b)` (also in MySQL) |
| `CONCAT('a', NULL)` | `NULL` | `'a'` |
| `GREATEST(1, NULL)` | `NULL` | `1` (NULLs ignored) |
| `NULL`s in ascending sort | first | last |

Connects to: SELECT, WHERE and ORDER BY, aggregate functions, anti-joins and semi-joins, integrity constraints.

### questions
Q: Why does WHERE col = NULL return no rows?
A: Any comparison with NULL is unknown, not true, and WHERE keeps only true rows. Use col IS NULL. For comparing two columns that may both be NULL, use a null-safe comparison: a <=> b in MySQL or a IS NOT DISTINCT FROM b in PostgreSQL.

Q: What is the difference between COUNT(*) and COUNT(col)?
A: COUNT(*) counts rows. COUNT(col) counts rows where col is not NULL. With a nullable column they differ, which is also how you count how many values are missing: COUNT(*) minus COUNT(col).

Q: Why can NOT IN with a subquery return nothing?
A: If the subquery returns a NULL, x NOT IN (...) expands to a chain of x <> value joined by AND, and x <> NULL is unknown, so the result is never true. NOT EXISTS, or filtering the NULLs out of the subquery, gives the intended answer.

Q: How do you avoid division by zero in SQL?
A: Wrap the divisor in NULLIF(divisor, 0), which turns a zero into NULL, so the division yields NULL instead of failing. Add COALESCE around the result if a default like 0 is wanted. MySQL returns NULL with a warning anyway, but PostgreSQL raises an error.

Q: What does SUM return for a group where every value is NULL?
A: NULL, not 0, because aggregates skip NULLs and there is nothing left to add. Wrap it as COALESCE(SUM(x), 0) when a report needs a zero.

## sql.basics.case-when
name: "CASE WHEN"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "conditional logic in queries"

### simple
CASE lets a query pick a value for each row by testing conditions in turn, like an if, else if, else chain. It is how you turn a salary into a label such as "high" or "low", or count paid and unpaid orders side by side. The first condition that holds wins.

### interview
- **Searched** form: `CASE WHEN cond1 THEN v1 WHEN cond2 THEN v2 ELSE v3 END`. **Simple** form: `CASE expr WHEN value1 THEN ... END`, which compares with `=`.
- Branches are checked **in order and the first true one wins**, so put narrower conditions first. With no `ELSE`, unmatched rows get `NULL`.
- The simple form can't match NULL (`CASE x WHEN NULL` is never true, since it means `x = NULL`); use `WHEN x IS NULL`.
- CASE is an expression, so it works in `SELECT` (labels, buckets), `ORDER BY` (custom sort order), `GROUP BY`, inside aggregates (**conditional aggregation**: `SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)`) and in `UPDATE ... SET` (change several rows differently in one statement).
- All branches should return compatible types.
- MySQL shortcuts: `IF(cond, a, b)` and `SUM(cond)` (a true condition is 1). PostgreSQL uses `COUNT(*) FILTER (WHERE cond)` or `SUM(CASE ...)`. Plain CASE works everywhere.

### deep
#### Labels and buckets

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(20) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(10) NOT NULL
);
INSERT INTO orders VALUES
  (1, 'asha', 450, 'paid'), (2, 'ravi', 90, 'paid'), (3, 'asha', 1200, 'refunded'),
  (4, 'meera', 300, 'pending'), (5, 'ravi', 2500, 'paid'), (6, 'meera', 75, 'paid');

SELECT id, amount,
       CASE
         WHEN amount >= 1000 THEN 'large'
         WHEN amount >= 100 THEN 'medium'
         ELSE 'small'
       END AS size
FROM orders ORDER BY id;
```

Result:

| id | amount | size |
|---|---|---|
| 1 | 450 | medium |
| 2 | 90 | small |
| 3 | 1200 | large |
| 4 | 300 | medium |
| 5 | 2500 | large |
| 6 | 75 | small |

Order 3 matches both `>= 1000` and `>= 100`; the first branch wins, so it is "large". Swapping the two branches would label every order of 100 or more "medium", a classic bug.

#### Conditional aggregation

One pass over the table, several counts side by side:

```sql
SELECT customer,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
       COUNT(CASE WHEN status <> 'paid' THEN 1 END) AS not_paid
FROM orders
GROUP BY customer
ORDER BY customer;
```

Result:

| customer | paid | not_paid |
|---|---|---|
| asha | 450 | 1 |
| meera | 75 | 1 |
| ravi | 2590 | 0 |

`COUNT` ignores NULLs, and a CASE with no `ELSE` yields NULL for other rows, so `COUNT(CASE WHEN ... THEN 1 END)` counts matching rows. In MySQL, `SUM(status <> 'paid')` gives the same count, because a true comparison is 1; PostgreSQL rejects `SUM` of a boolean and offers `COUNT(*) FILTER (WHERE status <> 'paid')`. This pattern is the basis of pivot queries.

#### Custom sort order

```sql
SELECT id, status FROM orders
ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END, id;
```

Result:

| id | status |
|---|---|
| 4 | pending |
| 1 | paid |
| 2 | paid |
| 5 | paid |
| 6 | paid |
| 3 | refunded |

Alphabetical order would put "paid" first; the CASE maps each status to its business priority.

#### Updating rows differently in one statement

```sql
UPDATE orders
SET status = CASE status WHEN 'pending' THEN 'paid' WHEN 'paid' THEN 'settled' END
WHERE status IN ('pending', 'paid');

SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY status;
```

Result:

| status | n |
|---|---|
| paid | 1 |
| refunded | 1 |
| settled | 4 |

Every row's new value is computed from its old value, so the pending order becomes paid and the four paid ones become settled in one statement. Two separate `UPDATE`s in the wrong order would have moved the pending order all the way to settled. The `WHERE` matters: without it, the refunded order would fall through to the missing `ELSE` and become NULL (or fail on a `NOT NULL` column, as here in strict mode).

#### Edge cases and bugs

- Overlapping conditions in the wrong order (the first true branch wins).
- A forgotten `ELSE` turns unexpected values into NULL silently; add `ELSE 'other'` while exploring data.
- Mixing types (`THEN 1 ELSE 'none'`) makes MySQL convert everything to strings; PostgreSQL rejects it.

Connects to: NULL handling, GROUP BY and HAVING, pivoting rows to columns, INSERT, UPDATE and DELETE.

### questions
Q: What is the difference between the simple and searched CASE forms?
A: The simple form, CASE x WHEN 1 THEN ..., compares one expression with values using equality. The searched form, CASE WHEN condition THEN ..., takes any condition per branch, such as ranges or IS NULL. The searched form is more general; the simple form is shorter for lookups.

Q: What does a CASE return when no branch matches and there is no ELSE?
A: NULL. That is handy inside COUNT, which skips NULLs, but it can silently blank out values elsewhere, so add an explicit ELSE when every row needs a value.

Q: How do you count paid and unpaid orders per customer in one query?
A: Group by customer and use conditional aggregation: SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) and the same for the other status. Each row is read once and contributes to the right column. MySQL also accepts SUM(status = 'paid').

Q: Why does the order of WHEN branches matter?
A: Branches are evaluated top to bottom and the first true one wins. With overlapping ranges, such as amount >= 100 and amount >= 1000, the wider test must come last or it swallows the narrower cases.

## sql.basics.string-and-date-functions
name: "String and date functions"
importance: important
scope: "CONCAT, SUBSTRING, date arithmetic, formatting"

### simple
SQL has built-in functions to cut, join and clean text, and to do arithmetic on dates, such as "30 days after the order" or "which month was this". They are like the formulas in a spreadsheet, applied to every row. Their names differ between databases more than any other part of SQL.

### interview
- **Strings (MySQL)**: `CONCAT(a, b)`, `CONCAT_WS(sep, ...)` (skips NULLs), `SUBSTRING(s, start, len)` (1-based), `LEFT`/`RIGHT`, `UPPER`/`LOWER`, `TRIM`, `REPLACE`, `LOCATE(sub, s)`, `LPAD`, `CHAR_LENGTH` (characters) vs `LENGTH` (bytes), `GROUP_CONCAT` to join a group's values.
- **Dates (MySQL)**: `CURDATE()`, `NOW()`, `DATE_ADD(d, INTERVAL 7 DAY)`, `DATE_SUB`, `DATEDIFF(later, earlier)` in days, `TIMESTAMPDIFF(MONTH, a, b)`, `DATE_FORMAT(d, '%Y-%m')`, `YEAR()`, `MONTH()`, `DAYOFWEEK()`, `LAST_DAY()`.
- Adding a month to 31 January gives the **last day of February** (clamped), in both databases.
- **PostgreSQL differs**: `||` concatenates (in MySQL `||` means OR by default), `to_char(d, 'YYYY-MM')`, `date_trunc('month', ts)`, `d + INTERVAL '7 days'`, `date2 - date1` gives days, `EXTRACT(YEAR FROM d)`, `string_agg` instead of `GROUP_CONCAT`.
- Functions on a column in `WHERE` block ordinary index use; prefer ranges on the bare column, or a functional index.
- Store dates as `DATE`/`DATETIME`/`TIMESTAMP`, never as strings: string comparison of `'9/1/2026'` and `'10/1/2026'` sorts wrongly.

### deep
#### Strings

```sql
CREATE TABLE users (id INT PRIMARY KEY, first VARCHAR(20), last VARCHAR(20),
                    email VARCHAR(40), joined DATE);
INSERT INTO users VALUES
  (1, 'Asha', 'Rao', '  Asha.Rao@Example.com ', '2026-01-31'),
  (2, 'Ravi', NULL, 'ravi@example.org', '2025-11-02'),
  (3, 'Meera', 'Iyer', 'meera@example.net', '2026-03-15');

SELECT id,
       CONCAT(first, ' ', last) AS full_name,
       CONCAT_WS(' ', first, last) AS ws_name,
       LOWER(TRIM(email)) AS email,
       SUBSTRING_INDEX(TRIM(email), '@', -1) AS domain,
       UPPER(LEFT(first, 1)) AS initial
FROM users ORDER BY id;
```

Result:

| id | full_name | ws_name | email | domain | initial |
|---|---|---|---|---|---|
| 1 | Asha Rao | Asha Rao | asha.rao@example.com | Example.com | A |
| 2 | NULL | Ravi | ravi@example.org | example.org | R |
| 3 | Meera Iyer | Meera Iyer | meera@example.net | example.net | M |

`CONCAT` returns NULL for Ravi because his last name is missing; `CONCAT_WS` skips NULL arguments. `SUBSTRING_INDEX(s, '@', -1)` (MySQL only) keeps what follows the last `@`; the portable spelling is `SUBSTRING(s, LOCATE('@', s) + 1)` in MySQL or `split_part(s, '@', 2)` in PostgreSQL. Cleaning with `LOWER(TRIM(...))` before comparing or deduplicating emails avoids "same address, different spelling" bugs.

#### Dates

```sql
SELECT id, joined,
       DATE_ADD(joined, INTERVAL 1 MONTH) AS plus_month,
       DATEDIFF('2026-04-01', joined) AS days_member,
       DATE_FORMAT(joined, '%Y-%m') AS month,
       LAST_DAY(joined) AS month_end
FROM users ORDER BY id;
```

Result:

| id | joined | plus_month | days_member | month | month_end |
|---|---|---|---|---|---|
| 1 | 2026-01-31 | 2026-02-28 | 60 | 2026-01 | 2026-01-31 |
| 2 | 2025-11-02 | 2025-12-02 | 150 | 2025-11 | 2025-11-30 |
| 3 | 2026-03-15 | 2026-04-15 | 17 | 2026-03 | 2026-03-31 |

31 January plus one month is clamped to 28 February. `DATEDIFF(a, b)` is `a - b` in days, so put the later date first. Grouping by `DATE_FORMAT(joined, '%Y-%m')` gives monthly buckets.

The same in PostgreSQL:

```sql
-- PostgreSQL
CREATE TABLE users (id INT PRIMARY KEY, first TEXT, last TEXT, joined DATE);
INSERT INTO users VALUES (1, 'Asha', 'Rao', '2026-01-31'), (2, 'Ravi', NULL, '2025-11-02');

SELECT id, first || ' ' || last AS piped, concat_ws(' ', first, last) AS ws_name,
       (joined + INTERVAL '1 month')::date AS plus_month,
       DATE '2026-04-01' - joined AS days_member,
       to_char(joined, 'YYYY-MM') AS month
FROM users ORDER BY id;
```

Result:

| id | piped | ws_name | plus_month | days_member | month |
|---|---|---|---|---|---|
| 1 | Asha Rao | Asha Rao | 2026-02-28 | 60 | 2026-01 |
| 2 | NULL | Ravi | 2025-12-02 | 150 | 2025-11 |

`||` returns NULL with a NULL operand, like MySQL's `CONCAT`. In MySQL, `first || last` would be a logical OR of two strings and return 0.

#### Edge cases and bugs

- `LENGTH('héllo')` is 6 in MySQL with utf8mb4 (bytes) while `CHAR_LENGTH` is 5.
- `SUBSTRING` positions start at 1; position 0 returns an empty string in MySQL.
- `BETWEEN '2026-03-01' AND '2026-03-31'` on a `DATETIME` misses times after midnight on the 31st; use `< '2026-04-01'`.
- `NOW()` is the session's time zone; store `TIMESTAMP` (UTC internally) or UTC `DATETIME`s, and convert for display.

Connects to: SELECT, WHERE and ORDER BY, NULL handling, GROUP BY and HAVING, running and cumulative metrics.

### questions
Q: What is the difference between CONCAT and CONCAT_WS in MySQL?
A: CONCAT joins its arguments and returns NULL if any of them is NULL. CONCAT_WS takes a separator first and skips NULL arguments, so it is safer for joining optional parts like a middle name.

Q: How do you get the number of days between two dates in MySQL and in PostgreSQL?
A: In MySQL, DATEDIFF(later, earlier) returns days as an integer, and TIMESTAMPDIFF(unit, a, b) handles other units. In PostgreSQL, subtracting two date values gives the number of days directly, and age() or EXTRACT work on intervals.

Q: What is 31 January plus one month?
A: 28 February (or 29 in a leap year): both MySQL and PostgreSQL clamp to the last day of the shorter month. Code that adds months repeatedly can drift, so compute from the original date each time.

Q: Why is LENGTH different from CHAR_LENGTH?
A: In MySQL LENGTH counts bytes and CHAR_LENGTH counts characters. With utf8mb4, an accented letter takes two bytes, so they differ for non-ASCII text; use CHAR_LENGTH for user-facing limits.

Q: Why is filtering with WHERE DATE_FORMAT(created, '%Y-%m') = '2026-03' a bad idea on a big table?
A: The function must run on every row and hides the column from its index, forcing a full scan. The equivalent range created >= '2026-03-01' AND created < '2026-04-01' can use an index on created.
