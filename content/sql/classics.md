---
topic: sql.classics
name: "Classic SQL interview queries"
subject: sql
order: 7
prereqs: [sql.window, sql.subqueries]
---

## sql.classics.nth-highest-salary
name: "Nth highest salary"
importance: must
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "DENSE_RANK, LIMIT OFFSET, subquery approaches"

### simple
"Find the Nth highest salary" asks for the value in position N when the different salaries are sorted from high to low. Two people earning the same amount count as one salary, like two runners sharing a place on the podium. If there aren't N different salaries, the answer should be empty, which usually means NULL.

### interview
- Clarify first: **distinct** salaries (usual) or positions with repeats? What to return if there aren't N distinct values (usually `NULL`, one row)?
- **`DENSE_RANK`**: rank salaries descending, keep rank N. Ties share a rank and no numbers are skipped, so rank N is the Nth distinct salary. Clearest answer on MySQL 8 and PostgreSQL.
- **`DISTINCT ... ORDER BY salary DESC LIMIT 1 OFFSET N - 1`**: short, but returns no rows when missing; wrap it as a scalar subquery, `SELECT (...) AS nth`, to get a NULL row. In MySQL, `LIMIT` needs a constant or a variable, so `OFFSET N - 1` is a syntax error: compute the offset into a variable first (inside a function, `DECLARE skip INT DEFAULT n - 1`).
- **Correlated count**: salaries where exactly N − 1 distinct salaries are higher. Portable to old databases, but O(n²).
- `MAX(salary) WHERE salary < (SELECT MAX(salary) ...)` works for N = 2 only.
- `RANK` would skip numbers after ties and `ROW_NUMBER` would count repeated salaries separately: both give wrong answers when salaries repeat.

### deep
#### Data with a tie

```sql
CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(20) NOT NULL, salary INT NOT NULL);
INSERT INTO employees VALUES
  (1, 'Asha', 150000), (2, 'Ravi', 120000), (3, 'Meera', 150000),
  (4, 'Kabir', 90000), (5, 'Zoya', 120000), (6, 'Arjun', 70000);
```

Distinct salaries, high to low: 150000, 120000, 90000, 70000. So the 2nd highest is 120000 and the 3rd is 90000, even though three people are above Kabir.

#### Approach 1: DENSE_RANK

```sql
WITH ranked AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT MAX(salary) AS third_highest FROM ranked WHERE dr = 3;
```

Result:

| third_highest |
|---|
| 90000 |

The ranks are 1, 1, 2, 2, 3, 4 (in salary order). `MAX` does two jobs: it collapses the tied rows of rank N into one value, and over zero rows it returns one NULL row, so asking for the 5th highest gives `NULL` instead of nothing. Compare the functions on the same data:

| salary | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 150000 | 1 | 1 | 1 |
| 150000 | 2 | 1 | 1 |
| 120000 | 3 | 3 | 2 |
| 120000 | 4 | 3 | 2 |
| 90000 | 5 | 5 | 3 |
| 70000 | 6 | 6 | 4 |

Filtering `ROW_NUMBER = 3` or `RANK = 3` would return 120000 as "3rd highest": wrong for distinct salaries.

#### Approach 2: DISTINCT with LIMIT and OFFSET

```sql
SELECT (
  SELECT DISTINCT salary FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS second_highest;
```

Result:

| second_highest |
|---|
| 120000 |

`DISTINCT` removes the repeated 150000, `OFFSET 1` skips the top value, `LIMIT 1` keeps the next. The outer `SELECT (...)` turns "no row" into a NULL row when there is no second value. For a general N in MySQL, use a function with a variable offset:

```sql
DELIMITER //
CREATE FUNCTION nth_highest(n INT) RETURNS INT
READS SQL DATA
BEGIN
  DECLARE skip INT DEFAULT n - 1;
  RETURN (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET skip);
END //
DELIMITER ;

SELECT nth_highest(1) AS n1, nth_highest(3) AS n3, nth_highest(5) AS n5;
```

Result:

| n1 | n3 | n5 |
|---|---|---|
| 150000 | 90000 | NULL |

`DELIMITER //` is a command-line client instruction: it lets the semicolons inside the body pass through until `//`. In PostgreSQL, `LIMIT 1 OFFSET n - 1` accepts the expression directly, for example in a SQL function.

#### Approach 3: correlated count

```sql
SELECT DISTINCT e1.salary AS third_highest
FROM employees e1
WHERE 2 = (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.salary > e1.salary);
```

Result:

| third_highest |
|---|
| 90000 |

"The 3rd highest is the salary with exactly 2 distinct salaries above it." It works everywhere, even without window functions, but runs the count for every row: O(n²) without help from an index.

#### Complexity

`DENSE_RANK` and `DISTINCT ... ORDER BY` need a sort, O(n log n), or an index on `salary` read from the top, which can stop after N distinct values. The correlated count is O(n²).

Connects to: ROW_NUMBER, RANK and DENSE_RANK, DISTINCT, LIMIT and OFFSET, aggregate functions (aggregates over no rows), top N per group.

### questions
Q: How do you find the second highest distinct salary and return NULL if there isn't one?
A: SELECT (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS second_highest. The scalar subquery returns NULL when no row exists. Alternatively SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees), which also returns NULL when empty.

Q: Why DENSE_RANK rather than RANK or ROW_NUMBER for the Nth highest salary?
A: With repeated salaries, ROW_NUMBER counts each row separately and RANK skips numbers after ties, so neither numbers the distinct salaries. DENSE_RANK gives equal salaries the same rank and uses consecutive ranks, so rank N is the Nth distinct salary.

Q: Why does LIMIT 1 OFFSET N - 1 fail in MySQL, and how do you work around it?
A: MySQL accepts only constants, parameters or stored-program variables in LIMIT and OFFSET, not expressions. Compute N - 1 into a variable first, for example DECLARE skip INT DEFAULT n - 1 inside a function, or use DENSE_RANK with WHERE dr = N instead.

Q: How would you find the Nth highest salary without window functions or LIMIT?
A: Use a correlated count: select the distinct salary for which exactly N - 1 distinct salaries are greater. It is portable but quadratic, so it suits small tables or old databases.

## sql.classics.top-n-per-group
name: "Top N per group"
importance: must
prereqs: [sql.window.partition-by]
scope: "window functions with PARTITION BY"

### simple
"Top N per group" means the best few rows inside each category, such as the three best-paid people in every department or the two best-selling products per shop. A plain ORDER BY with LIMIT gives the top N overall, not per category. Window functions number the rows separately inside each group, so you can keep the first few of each.

### interview
- Pattern: rank inside each group with `PARTITION BY group ORDER BY metric DESC`, then keep rank ≤ N in an outer query (window functions can't go in `WHERE`).
- **Pick the ranking function by the tie rule**: `ROW_NUMBER` for exactly N rows per group (ties cut arbitrarily unless you add a tiebreaker); `RANK` for "anyone tied within the top N places"; `DENSE_RANK` for "everyone earning one of the top N distinct salaries".
- Top 1 per group has other forms: join to a grouped `MAX` (returns all ties), or `NOT EXISTS` a better row in the same group.
- Without window functions (MySQL 5.7): a correlated count, "fewer than N distinct higher values in my group": O(n²) per group.
- Performance: an index on `(group, metric)` lets the database read each group's rows already sorted.
- Include the group key in the final `ORDER BY` for readable output.

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
  (1, 'Asha', 'eng', 150000), (2, 'Ravi', 'eng', 120000), (3, 'Meera', 'eng', 120000),
  (4, 'Arjun', 'eng', 100000), (5, 'Kabir', 'sales', 90000), (6, 'Zoya', 'sales', 80000),
  (7, 'Isha', 'sales', 70000), (8, 'Dev', 'ops', 60000);

WITH ranked AS (
  SELECT name, dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id) AS rn,
         RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drnk
  FROM employees
)
SELECT dept, name, salary, rn, rnk, drnk
FROM ranked
ORDER BY dept, salary DESC, name;
```

Result:

| dept | name | salary | rn | rnk | drnk |
|---|---|---|---|---|---|
| eng | Asha | 150000 | 1 | 1 | 1 |
| eng | Meera | 120000 | 3 | 2 | 2 |
| eng | Ravi | 120000 | 2 | 2 | 2 |
| eng | Arjun | 100000 | 4 | 4 | 3 |
| ops | Dev | 60000 | 1 | 1 | 1 |
| sales | Kabir | 90000 | 1 | 1 | 1 |
| sales | Zoya | 80000 | 2 | 2 | 2 |
| sales | Isha | 70000 | 3 | 3 | 3 |

Now "top 2 per department" depends on the tie rule:

| filter | engineering rows kept |
|---|---|
| `rn <= 2` | Asha, Ravi (Meera loses the tie on `id`) |
| `rnk <= 2` | Asha, Ravi, Meera (both share 2nd place) |
| `drnk <= 3` | Asha, Ravi, Meera, Arjun (the top 3 distinct salaries) |

"Employees earning one of the top three salaries in their department" is the `DENSE_RANK` version:

```sql
SELECT dept, name, salary FROM (
  SELECT dept, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drnk
  FROM employees
) t
WHERE drnk <= 3
ORDER BY dept, salary DESC, name;
```

Result:

| dept | name | salary |
|---|---|---|
| eng | Asha | 150000 |
| eng | Meera | 120000 |
| eng | Ravi | 120000 |
| eng | Arjun | 100000 |
| ops | Dev | 60000 |
| sales | Kabir | 90000 |
| sales | Zoya | 80000 |
| sales | Isha | 70000 |

Operations has only one employee and still appears: a group with fewer than N rows simply keeps what it has.

#### Top 1 per group without window functions

```sql
SELECT e.dept, e.name, e.salary
FROM employees e
JOIN (SELECT dept, MAX(salary) AS top FROM employees GROUP BY dept) m
  ON m.dept = e.dept AND m.top = e.salary
ORDER BY e.dept;
```

Result:

| dept | name | salary |
|---|---|---|
| eng | Asha | 150000 |
| ops | Dev | 60000 |
| sales | Kabir | 90000 |

This returns every employee tied for the maximum. The general "top N" without windows is a correlated count: keep `e` if fewer than N distinct salaries in its department are higher, `WHERE (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.dept = e.dept AND e2.salary > e.salary) < 3`.

#### Complexity

The window approach sorts once by `(dept, salary)`: O(n log n), then one pass. With an index on `(dept, salary)`, PostgreSQL and MySQL can read rows in that order and skip the sort. The correlated count is O(n²) in the worst case.

Connects to: PARTITION BY, ROW_NUMBER, RANK and DENSE_RANK, Nth highest salary, top K elements (the same question in code), composite indexes.

### questions
Q: How do you get the top 3 earners in each department?
A: Rank rows within each department with a window function partitioned by department and ordered by salary descending, in a subquery or CTE, then keep rows with rank at most 3. Use ROW_NUMBER for exactly three people, RANK to include ties for third place, or DENSE_RANK for everyone with one of the top three distinct salaries.

Q: Why can't you write ORDER BY salary DESC LIMIT 3 for top 3 per department?
A: LIMIT applies to the whole result, so it returns the top three overall, possibly all from one department. The per-group limit needs PARTITION BY in a window function (or a correlated condition per row).

Q: How do you find the highest-paid employee in each department including ties?
A: Join employees to a grouped subquery of MAX(salary) per department on both department and salary, or use RANK or DENSE_RANK partitioned by department and keep rank 1. Both return every employee tied for the top.

Q: What index helps a top N per group query?
A: A composite index on (group column, metric column), such as (dept, salary). The database can read each department's rows already ordered by salary, avoiding a full sort, and stop early per group in some plans.

## sql.classics.finding-duplicates
name: "Finding duplicates"
importance: must
prereqs: [sql.aggregation.group-by-and-having]
scope: "GROUP BY with HAVING COUNT > 1"

### simple
Finding duplicates means spotting values that appear more than once, such as two accounts with the same email. Group the rows by that value and keep the groups with more than one row. It is like sorting a pile of forms by email address and pulling out every stack thicker than one sheet.

### interview
- Values that repeat: `SELECT email, COUNT(*) FROM t GROUP BY email HAVING COUNT(*) > 1`.
- Duplicates across several columns: group by all of them (`GROUP BY first_name, last_name, dob`).
- To see **every duplicate row** with its id: join back to the grouped result, or use `COUNT(*) OVER (PARTITION BY email)` and keep rows where it is above 1.
- To keep one and remove the rest: `ROW_NUMBER() OVER (PARTITION BY email ORDER BY id)` and delete rows with `rn > 1`, or a self join on `a.id > b.id` (see INSERT, UPDATE and DELETE). Then add a `UNIQUE` constraint.
- **Normalize before comparing**: `LOWER(TRIM(email))`. MySQL's default collation already groups 'Asha@x' with 'asha@x' (case-insensitive); PostgreSQL treats them as different.
- NULLs: `GROUP BY` puts all NULLs in one group, so several NULL emails show up as "duplicates"; filter them with `WHERE email IS NOT NULL` if that's not what you mean.

### deep
#### Worked example

```sql
CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(50), city VARCHAR(20) NOT NULL);
INSERT INTO users VALUES
  (1, 'asha@example.com', 'Pune'), (2, 'ravi@example.com', 'Delhi'),
  (3, 'Asha@Example.com', 'Pune'), (4, 'meera@example.com', 'Mumbai'),
  (5, 'ravi@example.com', 'Delhi'), (6, 'ravi@example.com', 'Goa'),
  (7, NULL, 'Pune'), (8, NULL, 'Delhi');

SELECT email, COUNT(*) AS copies
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY email;
```

Result:

| email | copies |
|---|---|
| asha@example.com | 2 |
| ravi@example.com | 3 |

Two things happened quietly. MySQL grouped `asha@example.com` and `Asha@Example.com` together because the default collation ignores case; on PostgreSQL the same query reports only Ravi, unless you group by `lower(email)`. And the two NULL emails were filtered out; without the `WHERE`, they would form a group of 2 and be reported as a "duplicate" `NULL`.

#### Showing every duplicate row

```sql
SELECT id, email, city FROM (
  SELECT id, email, city, COUNT(*) OVER (PARTITION BY LOWER(email)) AS copies
  FROM users
  WHERE email IS NOT NULL
) t
WHERE copies > 1
ORDER BY LOWER(email), id;
```

Result:

| id | email | city |
|---|---|---|
| 1 | asha@example.com | Pune |
| 3 | Asha@Example.com | Pune |
| 2 | ravi@example.com | Delhi |
| 5 | ravi@example.com | Delhi |
| 6 | ravi@example.com | Goa |

The window count keeps every row, so you see ids and other columns, which is what a cleanup needs. Grouping by `LOWER(email)` makes the result the same in both databases. The join-back form works too: `JOIN (SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1) d ON d.email = u.email`.

#### Duplicates across several columns

```sql
SELECT email, city, COUNT(*) AS copies
FROM users
WHERE email IS NOT NULL
GROUP BY email, city
HAVING COUNT(*) > 1;
```

Result:

| email | city | copies |
|---|---|---|
| asha@example.com | Pune | 2 |
| ravi@example.com | Delhi | 2 |

Ravi's Goa row is no longer a duplicate: the key is now the pair (email, city).

#### Keeping one of each

Mark the keeper with `ROW_NUMBER` and look at the rest before deleting them:

```sql
SELECT id FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY id) AS rn
  FROM users WHERE email IS NOT NULL
) t
WHERE rn > 1
ORDER BY id;
```

Result:

| id |
|---|
| 3 |
| 5 |
| 6 |

These are the rows a cleanup would delete, keeping the oldest account per email. Then `ALTER TABLE users ADD UNIQUE (email)` stops new duplicates (after normalizing emails, or with a unique index on `LOWER(email)`).

Connects to: GROUP BY and HAVING, PARTITION BY, INSERT, UPDATE and DELETE, NULL handling, string and date functions, candidate keys.

### questions
Q: How do you find emails that appear more than once?
A: SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1. GROUP BY makes one row per email and HAVING keeps the ones with more than one row. Add WHERE email IS NOT NULL if NULLs shouldn't count as a duplicate group.

Q: How do you list the full duplicate rows, not just the repeated values?
A: Either join the table back to the grouped duplicates on the key, or compute COUNT(*) OVER (PARTITION BY key) in a subquery and keep rows where it is greater than 1. Both return every row with all its columns.

Q: Why might MySQL and PostgreSQL report different duplicates for the same data?
A: String comparison depends on collation. MySQL's default utf8mb4_0900_ai_ci ignores case and accents, so 'Asha@x.com' and 'asha@x.com' group together; PostgreSQL compares case-sensitively. Normalize explicitly with LOWER and TRIM to get the same answer everywhere.

Q: After finding duplicates, how do you prevent new ones?
A: Clean up the existing ones, keeping one row per key, then add a UNIQUE constraint or unique index on the normalized key. The database will then reject any insert or update that would create a duplicate.

## sql.classics.employees-earning-more-than-their-managers
name: "Employees earning more than their managers"
importance: must
prereqs: [sql.joins.self-join]
scope: "self join"

### simple
When employees and managers live in the same table, each row has a column pointing to its manager's row. To compare someone with their manager, join the table with itself: one copy plays the employee, the other plays the manager. Then compare the two salaries side by side.

### interview
- Self join: `FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary`.
- An inner join drops employees without a manager, which is right here (there is no one to compare with).
- Name the aliases by role (`e`, `m`), and select from the right copy: a classic bug is returning `m.name`.
- Alternatives: a correlated subquery `WHERE e.salary > (SELECT salary FROM employees m WHERE m.id = e.manager_id)`, or `EXISTS`.
- Variations: compare with the skip-level manager (join a third copy), count direct reports per manager (`GROUP BY manager_id HAVING COUNT(*) >= 5`), managers with no reports earning more (anti-join), or compare with the department average instead.
- Index `manager_id` for the join; `id` is the primary key already.

### deep
#### Worked example

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  salary INT NOT NULL,
  manager_id INT
);
INSERT INTO employees VALUES
  (1, 'Asha', 200000, NULL), (2, 'Ravi', 120000, 1), (3, 'Meera', 210000, 1),
  (4, 'Kabir', 130000, 2), (5, 'Zoya', 110000, 2), (6, 'Arjun', 90000, 3);

SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary
ORDER BY e.id;
```

Result:

| employee | salary | manager | manager_salary |
|---|---|---|---|
| Meera | 210000 | Asha | 200000 |
| Kabir | 130000 | Ravi | 120000 |

The join pairs each employee row with their manager's row:

| e | m | e.salary > m.salary? |
|---|---|---|
| Asha | (no manager, dropped by the inner join) | – |
| Ravi | Asha | 120000 > 200000, no |
| Meera | Asha | 210000 > 200000, yes |
| Kabir | Ravi | 130000 > 120000, yes |
| Zoya | Ravi | 110000 > 120000, no |
| Arjun | Meera | 90000 > 210000, no |

#### The correlated form

```sql
SELECT e.name FROM employees e
WHERE e.salary > (SELECT m.salary FROM employees m WHERE m.id = e.manager_id)
ORDER BY e.id;
```

Result:

| name |
|---|
| Meera |
| Kabir |

For Asha the subquery returns no row, so it is NULL, the comparison is unknown, and she is excluded, the same as the inner join. Because `m.id` is the primary key, each lookup is one index probe. Most optimizers turn this into the same join plan.

#### Variations interviewers ask next

```sql
-- managers with at least two direct reports
SELECT m.name, COUNT(*) AS reports
FROM employees e
JOIN employees m ON e.manager_id = m.id
GROUP BY m.id, m.name
HAVING COUNT(*) >= 2
ORDER BY m.id;
```

Result:

| name | reports |
|---|---|
| Asha | 2 |
| Ravi | 2 |

```sql
-- employees earning more than their manager's manager
SELECT e.name, e.salary, gm.name AS skip_level, gm.salary AS skip_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
JOIN employees gm ON m.manager_id = gm.id
WHERE e.salary > gm.salary
ORDER BY e.id;
```

Result: no rows.

Kabir (130000) and Zoya (110000) report to Ravi, whose manager Asha earns 200000; Arjun's skip-level is Asha too. Each extra level is one more copy of the table; for "anyone above me in the chain", use a recursive CTE.

#### Complexity

With `id` as the primary key, the join is one index lookup per employee: O(n log n), or O(n) with a hash join.

Connects to: self join, correlated subqueries, GROUP BY and HAVING, recursive CTEs.

### questions
Q: How do you find employees who earn more than their managers?
A: Self join the employees table: FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary, selecting e.name. The first copy is the employee and the second the manager, so both salaries are on one row.

Q: What happens to the top boss in that query?
A: Their manager_id is NULL, so the inner join finds no manager row and drops them, which is correct because there is no manager to compare with. A LEFT JOIN would keep them with NULL manager columns, and the WHERE comparison would then drop them anyway.

Q: How do you find managers with at least five direct reports?
A: Group employees by manager_id and keep groups with HAVING COUNT(*) >= 5; join to the employees table on the manager's id to get names. Grouping by the manager's id avoids merging two managers who share a name.

Q: Can you solve it without a join?
A: Yes, with a correlated subquery: WHERE salary > (SELECT m.salary FROM employees m WHERE m.id = e.manager_id). Each row looks up its manager's salary by primary key, and the optimizer usually executes it like the join.

## sql.classics.consecutive-records-and-streaks
name: "Consecutive records and streaks"
importance: important
prereqs: [sql.window.lag-and-lead]
scope: "gaps and islands technique"

### simple
Streak questions ask about runs of consecutive rows, such as the longest run of days a user logged in, or numbers that appear three times in a row. The "gaps and islands" trick gives every run its own label: subtract the row's position from its date, and all days of one unbroken streak get the same result. Then counting a streak is just grouping by that label.

### interview
- **Gaps and islands**: within each user, `ROW_NUMBER() OVER (PARTITION BY user ORDER BY day)` goes up by 1 per row; the date goes up by 1 per day in a streak. So `day - row_number` is **constant inside a streak** and jumps at every gap. Group by (user, that constant) to get each island's start, end and length.
- MySQL: `DATE_SUB(day, INTERVAL rn DAY)`; PostgreSQL: `day - rn::int`. For integer sequences just `id - rn`.
- Deduplicate first (two logins on one day would break the arithmetic): `SELECT DISTINCT user_id, day`.
- "Same value N times in a row": `LAG`/`LEAD` (compare with the previous two rows), or islands on value changes: `ROW_NUMBER() OVER (ORDER BY id) - ROW_NUMBER() OVER (PARTITION BY value ORDER BY id)`.
- Before window functions: self joins on `day = day + 1` and `+ 2`, which only work for a fixed run length.
- Uses: login streaks, consecutive failed payments, sensor readings above a threshold for N hours, seats together.

### deep
#### Worked example: login streaks

```sql
CREATE TABLE logins (user_name VARCHAR(10) NOT NULL, day DATE NOT NULL);
INSERT INTO logins VALUES
  ('asha', '2026-03-01'), ('asha', '2026-03-02'), ('asha', '2026-03-03'),
  ('asha', '2026-03-05'), ('asha', '2026-03-06'), ('asha', '2026-03-06'),
  ('ravi', '2026-03-02'), ('ravi', '2026-03-04');

WITH days AS (
  SELECT DISTINCT user_name, day FROM logins
),
islands AS (
  SELECT user_name, day,
         DATE_SUB(day, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY day) DAY)
           AS grp
  FROM days
)
SELECT user_name, MIN(day) AS streak_start, MAX(day) AS streak_end, COUNT(*) AS days_
FROM islands
GROUP BY user_name, grp
ORDER BY user_name, streak_start;
```

Result:

| user_name | streak_start | streak_end | days_ |
|---|---|---|---|
| asha | 2026-03-01 | 2026-03-03 | 3 |
| asha | 2026-03-05 | 2026-03-06 | 2 |
| ravi | 2026-03-02 | 2026-03-02 | 1 |
| ravi | 2026-03-04 | 2026-03-04 | 1 |

Why it works, for Asha:

| day | row number | day minus row number |
|---|---|---|
| 03-01 | 1 | 02-28 |
| 03-02 | 2 | 02-28 |
| 03-03 | 3 | 02-28 |
| 03-05 | 4 | 03-01 |
| 03-06 | 5 | 03-01 |

Inside a streak both the date and the row number rise by one each step, so their difference stays put. The missing 4 March makes the date jump by two while the row number rises by one, so the difference changes and a new island starts. Asha's second login on 6 March was removed by `DISTINCT`; left in, it would give two rows the same date but different row numbers and split the streak. The longest streak per user is then `MAX(days_)` over this result. In PostgreSQL, write `day - ROW_NUMBER() OVER (...)::int` for `grp`.

#### Same value three times in a row

```sql
CREATE TABLE readings (id INT PRIMARY KEY, status VARCHAR(5) NOT NULL);
INSERT INTO readings VALUES (1, 'ok'), (2, 'fail'), (3, 'fail'), (4, 'fail'),
  (5, 'ok'), (6, 'fail'), (7, 'fail'), (8, 'ok'), (9, 'ok'), (10, 'ok');

SELECT DISTINCT status FROM (
  SELECT status,
         LAG(status, 1) OVER (ORDER BY id) AS prev1,
         LAG(status, 2) OVER (ORDER BY id) AS prev2
  FROM readings
) t
WHERE status = prev1 AND status = prev2
ORDER BY status;
```

Result:

| status |
|---|
| fail |
| ok |

A row qualifies when it equals the two rows before it: ids 4 (fail) and 10 (ok). `LAG` is enough for a fixed run length. For "runs of at least k" of any length, use islands on value changes:

```sql
SELECT status, MIN(id) AS first_id, COUNT(*) AS run_length FROM (
  SELECT id, status,
         ROW_NUMBER() OVER (ORDER BY id)
           - ROW_NUMBER() OVER (PARTITION BY status ORDER BY id) AS grp
  FROM readings
) t
GROUP BY status, grp
HAVING COUNT(*) >= 2
ORDER BY first_id;
```

Result:

| status | first_id | run_length |
|---|---|---|
| fail | 2 | 3 |
| fail | 6 | 2 |
| ok | 8 | 3 |

The overall row number rises on every row, the per-status one only on rows of that status; inside a run they rise together, so the difference is constant per run.

#### Complexity

Two window passes after a sort: O(n log n). The self-join alternative needs one extra join per step of run length.

Connects to: LAG and LEAD, ROW_NUMBER, RANK and DENSE_RANK, GROUP BY and HAVING, running and cumulative metrics.

### questions
Q: What is the gaps and islands technique?
A: A way to label runs of consecutive values. Number the rows in order with ROW_NUMBER; for consecutive values, value minus row number stays constant within a run and changes at every gap. Grouping by that difference gives each run's start, end and length.

Q: Why must you remove duplicate dates before computing login streaks?
A: Two rows with the same date get different row numbers, so date minus row number differs between them and the streak is split in two. Selecting DISTINCT user and day first makes each day appear once.

Q: How do you find values that appear at least three times in a row?
A: Compare each row with the previous two using LAG(value, 1) and LAG(value, 2) and keep rows where all three match, then take DISTINCT values. For runs of any length, use islands: the difference of ROW_NUMBER over all rows and ROW_NUMBER partitioned by value, then group and count.

Q: How do you find each user's longest login streak?
A: Compute the islands per user (distinct days, date minus ROW_NUMBER per user), count days per island, then take the MAX count per user. Tie-breaking for which streak to report can use the start date.

## sql.classics.pivoting-rows-to-columns
name: "Pivoting rows to columns"
importance: important
prereqs: [sql.basics.case-when]
scope: "conditional aggregation"

### simple
Pivoting turns values that sit in rows into separate columns, like turning a list of (month, product, sales) into a table with one column per month. SQL does it with conditional aggregation: for each new column, add up only the rows that belong to it. Unpivoting goes the other way, turning columns back into rows.

### interview
- **Conditional aggregation**: group by the row key and write one aggregate per output column: `SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1`, and so on.
- `ELSE 0` shows zero for missing combinations; `ELSE NULL` (or no `ELSE`) with `MAX` shows NULL, useful when pivoting text values.
- The output columns must be known when writing the query. A **dynamic pivot** (columns from data) needs generated SQL, such as MySQL's prepared statements built with `GROUP_CONCAT`, or doing the pivot in application code.
- MySQL shortcut: `SUM(IF(quarter = 'Q1', amount, 0))`. PostgreSQL: `SUM(amount) FILTER (WHERE quarter = 'Q1')`, or `crosstab` from the `tablefunc` extension. Neither has SQL Server's `PIVOT` keyword.
- **Unpivot**: `UNION ALL` of one `SELECT` per column; PostgreSQL can use `CROSS JOIN LATERAL (VALUES ...)`.
- Pivoted tables are for reports; keep storage in the long (row) format, which is normalized and easy to query.

### deep
#### Worked example

```sql
CREATE TABLE sales (region VARCHAR(10) NOT NULL, quarter CHAR(2) NOT NULL, amount INT NOT NULL);
INSERT INTO sales VALUES
  ('north', 'Q1', 100), ('north', 'Q2', 150), ('north', 'Q2', 20), ('north', 'Q4', 90),
  ('south', 'Q1', 80), ('south', 'Q3', 60), ('west', 'Q2', 40);

SELECT region,
       SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1,
       SUM(CASE WHEN quarter = 'Q2' THEN amount ELSE 0 END) AS q2,
       SUM(CASE WHEN quarter = 'Q3' THEN amount ELSE 0 END) AS q3,
       SUM(CASE WHEN quarter = 'Q4' THEN amount ELSE 0 END) AS q4,
       SUM(amount) AS total
FROM sales
GROUP BY region
ORDER BY region;
```

Result:

| region | q1 | q2 | q3 | q4 | total |
|---|---|---|---|---|---|
| north | 100 | 170 | 0 | 90 | 360 |
| south | 80 | 0 | 60 | 0 | 140 |
| west | 0 | 40 | 0 | 0 | 40 |

For each region's group, every `CASE` passes through only its quarter's amounts and turns the others into 0, so each `SUM` adds one quarter. North's two Q2 rows (150 and 20) add up to 170. In MySQL the same columns can be written `SUM(IF(quarter = 'Q1', amount, 0))`; in PostgreSQL, `SUM(amount) FILTER (WHERE quarter = 'Q1')` (which gives NULL instead of 0 for an empty quarter).

#### Pivoting text

```sql
CREATE TABLE settings (user_name VARCHAR(10) NOT NULL, setting VARCHAR(10) NOT NULL,
                       value VARCHAR(10) NOT NULL);
INSERT INTO settings VALUES ('asha', 'theme', 'dark'), ('asha', 'lang', 'hi'),
                            ('ravi', 'theme', 'light');

SELECT user_name,
       MAX(CASE WHEN setting = 'theme' THEN value END) AS theme,
       MAX(CASE WHEN setting = 'lang' THEN value END) AS lang
FROM settings
GROUP BY user_name
ORDER BY user_name;
```

Result:

| user_name | theme | lang |
|---|---|---|
| asha | dark | hi |
| ravi | light | NULL |

`MAX` picks the one non-NULL value in each group (any aggregate that ignores NULLs works). Ravi has no language setting, so his `lang` is NULL.

#### Unpivot: columns back into rows

```sql
CREATE TABLE quarterly (region VARCHAR(10) PRIMARY KEY, q1 INT, q2 INT);
INSERT INTO quarterly VALUES ('north', 100, 170), ('south', 80, NULL);

SELECT region, 'Q1' AS quarter, q1 AS amount FROM quarterly WHERE q1 IS NOT NULL
UNION ALL
SELECT region, 'Q2', q2 FROM quarterly WHERE q2 IS NOT NULL
ORDER BY region, quarter;
```

Result:

| region | quarter | amount |
|---|---|---|
| north | Q1 | 100 |
| north | Q2 | 170 |
| south | Q1 | 80 |

One `SELECT` per column, stacked with `UNION ALL`.

#### Dynamic columns

If the quarters (or product names) aren't known in advance, SQL can't produce a variable number of columns in a static query. Options: generate the query text (in MySQL, build it with `GROUP_CONCAT` and run it with `PREPARE` and `EXECUTE`), use PostgreSQL's `crosstab`, or return the long format and pivot in the application or spreadsheet.

Connects to: CASE WHEN, GROUP BY and HAVING, aggregate functions, set operations, first normal form (the long format is the normalized one).

### questions
Q: How do you pivot rows into columns in SQL?
A: Group by the row key and write one conditional aggregate per output column, such as SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1. Each aggregate only sees rows belonging to its column.

Q: How do you pivot text values rather than numbers?
A: Use an aggregate that returns the single non-NULL value, such as MAX(CASE WHEN setting = 'theme' THEN value END). Rows for other settings produce NULL, which MAX ignores.

Q: What if the list of columns isn't known in advance?
A: A static SQL query can't return a variable number of columns. Build the query text dynamically, for example with GROUP_CONCAT and a prepared statement in MySQL, use PostgreSQL's crosstab, or pivot in application code.

Q: How do you unpivot columns into rows?
A: Write one SELECT per column that outputs the key, a label for the column and its value, and combine them with UNION ALL. PostgreSQL can also do it with CROSS JOIN LATERAL over a VALUES list.

## sql.classics.running-and-cumulative-metrics
name: "Running and cumulative metrics"
importance: important
prereqs: [sql.window.running-totals-and-moving-averages]
scope: "retention and growth queries"

### simple
Product teams ask cumulative questions: how many users have we had so far, how fast is revenue growing month over month, and how many new users come back the next day. SQL answers them by first summarizing per period and then comparing periods with window functions. The trick is to decide carefully who counts in each group and what the denominator is.

### interview
- **Cumulative count**: aggregate per period first (`COUNT(*)` of signups per month), then `SUM(n) OVER (ORDER BY month)`.
- **Growth**: `(this - LAG(this)) / LAG(this)` per period; guard against division by zero and fill missing periods with a calendar first, or `LAG` compares with a non-adjacent period.
- **Retention**: define the cohort (users by first activity date), then check activity on a later day or month. Day-1 retention = users active the day after their first day / all new users.
- **Cohort tables**: first period per user (`MIN(day)`), period offset of each activity (`TIMESTAMPDIFF(MONTH, ...)`), count distinct users per (cohort, offset), divide by cohort size.
- Count **distinct users**, not events. Use `LEFT JOIN`s so users who never came back still count in the denominator.
- MySQL: `DATE_FORMAT`, `TIMESTAMPDIFF`, `DATE_ADD`; PostgreSQL: `date_trunc`, `age`, date arithmetic.

### deep
#### Cumulative signups and month-over-month growth

```sql
CREATE TABLE signups (user_id INT PRIMARY KEY, signed_up DATE NOT NULL);
INSERT INTO signups VALUES
  (1, '2026-01-04'), (2, '2026-01-19'), (3, '2026-02-02'), (4, '2026-02-10'),
  (5, '2026-02-25'), (6, '2026-03-01'), (7, '2026-03-15'), (8, '2026-03-16'),
  (9, '2026-03-30'), (10, '2026-03-31');

WITH monthly AS (
  SELECT DATE_FORMAT(signed_up, '%Y-%m') AS month, COUNT(*) AS new_users
  FROM signups GROUP BY month
)
SELECT month, new_users,
       SUM(new_users) OVER (ORDER BY month) AS total_users,
       ROUND(100 * (new_users - LAG(new_users) OVER (ORDER BY month))
             / LAG(new_users) OVER (ORDER BY month), 1) AS growth_pct
FROM monthly
ORDER BY month;
```

Result:

| month | new_users | total_users | growth_pct |
|---|---|---|---|
| 2026-01 | 2 | 2 | NULL |
| 2026-02 | 3 | 5 | 50.0 |
| 2026-03 | 5 | 10 | 66.7 |

Aggregate first, then window: the window functions run over three monthly rows, not ten signups. The first month has no previous month, so growth is NULL (not 0 and not infinite). In PostgreSQL, integer division would truncate 66.7 to 66, so write `100.0 *` there.

#### Day-1 retention

What share of new users came back on the day after their first visit?

```sql
CREATE TABLE app_opens (user_id INT NOT NULL, day DATE NOT NULL);
INSERT INTO app_opens VALUES
  (1, '2026-03-01'), (1, '2026-03-02'), (1, '2026-03-05'),
  (2, '2026-03-01'), (2, '2026-03-04'),
  (3, '2026-03-02'), (3, '2026-03-03'),
  (4, '2026-03-03');

WITH firsts AS (
  SELECT user_id, MIN(day) AS first_day FROM app_opens GROUP BY user_id
)
SELECT COUNT(*) AS new_users,
       COUNT(a.user_id) AS came_back,
       ROUND(COUNT(a.user_id) / COUNT(*), 2) AS day1_retention
FROM firsts f
LEFT JOIN (SELECT DISTINCT user_id, day FROM app_opens) a
  ON a.user_id = f.user_id AND a.day = DATE_ADD(f.first_day, INTERVAL 1 DAY);
```

Result:

| new_users | came_back | day1_retention |
|---|---|---|
| 4 | 2 | 0.50 |

Users 1 and 3 returned the next day; user 2 came back later (not day 1), and user 4 never returned. The `LEFT JOIN` keeps users 2 and 4 in the denominator; an inner join would drop them and report 100%. `DISTINCT` guards against counting a user twice if they opened the app twice that day.

#### A cohort table

```sql
WITH firsts AS (
  SELECT user_id, MIN(day) AS first_day FROM app_opens GROUP BY user_id
),
activity AS (
  SELECT DISTINCT a.user_id, f.first_day, DATEDIFF(a.day, f.first_day) AS day_offset
  FROM app_opens a JOIN firsts f ON f.user_id = a.user_id
)
SELECT first_day AS cohort,
       COUNT(DISTINCT user_id) AS size_,
       COUNT(DISTINCT CASE WHEN day_offset = 1 THEN user_id END) AS d1,
       COUNT(DISTINCT CASE WHEN day_offset BETWEEN 1 AND 3 THEN user_id END) AS d1_to_d3
FROM activity
GROUP BY first_day
ORDER BY first_day;
```

Result:

| cohort | size_ | d1 | d1_to_d3 |
|---|---|---|---|
| 2026-03-01 | 2 | 1 | 2 |
| 2026-03-02 | 1 | 1 | 1 |
| 2026-03-03 | 1 | 0 | 0 |

Each cohort is the users who first appeared that day; each column counts how many of them were active within a window after it. Real products use weekly or monthly cohorts, with `TIMESTAMPDIFF(WEEK, ...)` or `TIMESTAMPDIFF(MONTH, ...)` as the offset.

Connects to: running totals and moving averages, LAG and LEAD, left, right and full outer joins, aggregate functions, CTEs.

### questions
Q: How do you compute a cumulative number of users per month?
A: First count signups per month with GROUP BY, then apply SUM(new_users) OVER (ORDER BY month) to the monthly rows. Aggregating first keeps the window small and avoids double counting.

Q: How do you calculate month-over-month growth?
A: Aggregate per month, then compute (value - LAG(value) OVER (ORDER BY month)) / LAG(value) OVER (ORDER BY month). The first month gives NULL, missing months should be filled with a calendar so LAG compares adjacent months, and a zero previous value needs NULLIF to avoid dividing by zero.

Q: How do you compute day-1 retention?
A: Find each user's first active day, then LEFT JOIN their activity on the day after it. Retention is the number of users with a match divided by the number of new users; the left join keeps users who never returned in the denominator.

Q: What are common mistakes in retention queries?
A: Counting events instead of distinct users, using an inner join that drops users who didn't return, defining the cohort by signup in one place and by first activity in another, and comparing periods with LAG when some periods are missing.

## sql.classics.median-and-percentiles-in-sql
name: "Median and percentiles in SQL"
importance: advanced
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "Median and percentiles in SQL"

### simple
The median is the middle value when the numbers are sorted: half are below it and half above. With an even count, it's the average of the two middle values. PostgreSQL has a built-in function for it; in MySQL you find the middle row yourself by numbering the rows.

### interview
- **PostgreSQL**: `percentile_cont(0.5) WITHIN GROUP (ORDER BY x)` interpolates (the average of the two middle values for an even count); `percentile_disc(0.5)` returns an actual value from the data. Any fraction works (0.9 for the 90th percentile), per group with `GROUP BY`.
- **MySQL has no median or percentile aggregate.** Number the rows with `ROW_NUMBER() OVER (ORDER BY x)` and count them with `COUNT(*) OVER ()`, keep the rows at positions `FLOOR((n + 1) / 2)` and `FLOOR((n + 2) / 2)` (the same row when n is odd), and average them.
- Per group: add `PARTITION BY group` to both windows and `GROUP BY group` outside.
- `PERCENT_RANK()` = (rank − 1) / (n − 1) and `CUME_DIST()` = share of rows ≤ this one give each row's percentile position (both databases).
- Medians resist outliers: one huge salary moves the average a lot and the median barely.
- Cost: a sort, O(n log n). Exact percentiles over huge data are expensive; systems use approximate sketches (t-digest).

### deep
#### MySQL: positions from window functions

```sql
CREATE TABLE salaries (id INT PRIMARY KEY, dept VARCHAR(10) NOT NULL, salary INT NOT NULL);
INSERT INTO salaries VALUES
  (1, 'eng', 100), (2, 'eng', 300), (3, 'eng', 200), (4, 'eng', 900),
  (5, 'ops', 50), (6, 'ops', 70), (7, 'ops', 60);

SELECT dept, AVG(salary) AS median
FROM (
  SELECT dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,
         COUNT(*) OVER (PARTITION BY dept) AS n
  FROM salaries
) t
WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2))
GROUP BY dept
ORDER BY dept;
```

Result:

| dept | median |
|---|---|
| eng | 250.0000 |
| ops | 60.0000 |

Engineering has 4 salaries (100, 200, 300, 900): positions `FLOOR(5 / 2) = 2` and `FLOOR(6 / 2) = 3`, so the median is (200 + 300) / 2 = 250. Operations has 3 (50, 60, 70): both formulas give position 2, so the median is 60. Engineering's average is 375, pulled up by the 900; the median isn't.

#### PostgreSQL: built-in ordered-set aggregates

```sql
-- PostgreSQL
CREATE TABLE salaries (id INT PRIMARY KEY, dept TEXT NOT NULL, salary INT NOT NULL);
INSERT INTO salaries VALUES
  (1, 'eng', 100), (2, 'eng', 300), (3, 'eng', 200), (4, 'eng', 900),
  (5, 'ops', 50), (6, 'ops', 70), (7, 'ops', 60);

SELECT dept,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY salary) AS median_cont,
       percentile_disc(0.5) WITHIN GROUP (ORDER BY salary) AS median_disc,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY salary) AS p90
FROM salaries GROUP BY dept ORDER BY dept;
```

Result:

| dept | median_cont | median_disc | p90 |
|---|---|---|---|
| eng | 250 | 200 | 720.0000000000001 |
| ops | 60 | 60 | 68 |

`percentile_cont` interpolates: engineering's 90th percentile sits 0.9 × 3 = 2.7 positions into the 4 sorted values, 70% of the way from 300 to 900, which is 720. It computes in `double precision`, hence the floating-point dust in `720.0000000000001`; round it for display. `percentile_disc` returns the first actual value whose cumulative share reaches the fraction: 200 is at 50%, so it is the discrete median.

#### Percentile positions for every row

```sql
SELECT id, salary,
       ROUND(PERCENT_RANK() OVER (ORDER BY salary), 2) AS pct_rank,
       ROUND(CUME_DIST() OVER (ORDER BY salary), 2) AS cume
FROM salaries WHERE dept = 'eng' ORDER BY salary;
```

Result:

| id | salary | pct_rank | cume |
|---|---|---|---|
| 1 | 100 | 0 | 0.25 |
| 3 | 200 | 0.33 | 0.5 |
| 2 | 300 | 0.67 | 0.75 |
| 4 | 900 | 1 | 1 |

`PERCENT_RANK` runs from 0 to 1 by rank; `CUME_DIST` is the share of rows at or below this value. Both exist in MySQL 8 and PostgreSQL and return floating-point numbers, which is why MySQL prints `0.5` rather than `0.50` after rounding.

Connects to: ROW_NUMBER, RANK and DENSE_RANK, NTILE, FIRST_VALUE and LAST_VALUE, find median from a data stream (the two-heap version in code), descriptive statistics.

### questions
Q: How do you compute a median in MySQL?
A: MySQL has no median function. Number rows with ROW_NUMBER() OVER (ORDER BY x) and count them with COUNT(*) OVER (), keep rows at positions FLOOR((n + 1) / 2) and FLOOR((n + 2) / 2), and average them; for an odd count both positions are the same row.

Q: What is the difference between percentile_cont and percentile_disc in PostgreSQL?
A: percentile_cont treats the values as continuous and interpolates between neighbours, so the median of an even count is the average of the two middle values. percentile_disc returns an actual value from the data: the first value whose cumulative share reaches the fraction.

Q: Why report a median rather than an average salary?
A: The median depends only on the middle of the sorted data, so a few extreme values barely move it, while the average can be dragged far by one outlier. Salaries, latencies and prices are skewed, so medians and high percentiles describe them better.

Q: How do you compute a median per department?
A: Partition the window functions by department, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) and COUNT(*) OVER (PARTITION BY dept), keep the middle positions, and GROUP BY department when averaging. In PostgreSQL, GROUP BY dept with percentile_cont(0.5) WITHIN GROUP (ORDER BY salary).
