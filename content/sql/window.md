---
topic: sql.window
name: "Window functions"
subject: sql
order: 5
prereqs: [sql.aggregation]
---

## sql.window.row-number-rank-and-dense-rank
name: "ROW_NUMBER, RANK and DENSE_RANK"
importance: must
scope: "ranking and ties"

### simple
Ranking functions number the rows of a result in a chosen order, like placing runners at the end of a race. They differ only in how they treat ties: ROW_NUMBER gives everyone a different number, RANK lets tied runners share a place and then skips places, and DENSE_RANK lets them share without skipping. Unlike GROUP BY, every row stays in the result and simply gains a number.

### interview
- A **window function** computes a value for each row from a set of related rows (its window), written `f() OVER (PARTITION BY ... ORDER BY ...)`. Rows are not collapsed.
- For ordered values 90, 85, 85, 80: `ROW_NUMBER` gives 1, 2, 3, 4 (ties in arbitrary order unless you add a tiebreaker); `RANK` gives 1, 2, 2, 4 (gaps); `DENSE_RANK` gives 1, 2, 2, 3 (no gaps).
- Choose by question: "the 3rd highest distinct value" → `DENSE_RANK`; "Olympic places" → `RANK`; "exactly one row per group / pagination / dedup" → `ROW_NUMBER`.
- Window functions are evaluated **after `WHERE`, `GROUP BY` and `HAVING`**, before `ORDER BY`/`LIMIT`, so you can't filter on them in `WHERE`: wrap the query in a subquery or CTE (neither MySQL nor PostgreSQL has Snowflake's `QUALIFY`).
- MySQL has window functions from **8.0** (none in 5.7). **`RANK` is a reserved word in MySQL 8**: `AS rank` is a syntax error, so write `` AS `rank` `` or another name; PostgreSQL accepts `AS rank`.
- The `ORDER BY` inside `OVER` sets the ranking order; the query's final `ORDER BY` sets the output order. They are independent.
- Also: `PERCENT_RANK()` = (rank − 1) / (rows − 1) and `CUME_DIST()` for percentiles.

### deep
#### Worked example

```sql
CREATE TABLE scores (player VARCHAR(20) PRIMARY KEY, points INT NOT NULL);
INSERT INTO scores VALUES
  ('asha', 90), ('ravi', 85), ('meera', 85), ('kabir', 80), ('zoya', 70);

SELECT player, points,
       ROW_NUMBER() OVER (ORDER BY points DESC, player) AS row_num,
       RANK()       OVER (ORDER BY points DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY points DESC) AS dense_rnk
FROM scores
ORDER BY points DESC, player;
```

Result:

| player | points | row_num | rnk | dense_rnk |
|---|---|---|---|---|
| asha | 90 | 1 | 1 | 1 |
| meera | 85 | 2 | 2 | 2 |
| ravi | 85 | 3 | 2 | 2 |
| kabir | 80 | 4 | 4 | 3 |
| zoya | 70 | 5 | 5 | 4 |

How each is computed, walking down the sorted rows:

- `ROW_NUMBER` just counts: 1, 2, 3, 4, 5. Meera gets 2 and Ravi 3 only because `player` breaks the tie; without it the database may pick either order.
- `RANK` is 1 + the number of rows strictly ahead: Kabir has 3 players ahead, so he is 4th. That is where the gap comes from.
- `DENSE_RANK` is 1 + the number of *distinct* values ahead: Kabir has two distinct scores ahead (90 and 85), so he is 3rd.

#### Filtering on a rank

"Who has the second highest distinct score?"

```sql
SELECT player, points FROM (
  SELECT player, points, DENSE_RANK() OVER (ORDER BY points DESC) AS dr
  FROM scores
) ranked
WHERE dr = 2
ORDER BY player;
```

Result:

| player | points |
|---|---|
| meera | 85 |
| ravi | 85 |

`WHERE DENSE_RANK() OVER (...) = 2` directly in the outer query is an error in both databases, because `WHERE` runs before window functions exist. The derived table (or a CTE) computes the rank first, then the outer query filters.

#### Deduplication with ROW_NUMBER

Keep the newest signup per email and ignore older duplicates:

```sql
CREATE TABLE signups (id INT PRIMARY KEY, email VARCHAR(40) NOT NULL, signed_on DATE NOT NULL);
INSERT INTO signups VALUES (1, 'asha@example.com', '2026-01-02'),
  (2, 'ravi@example.com', '2026-01-05'), (3, 'asha@example.com', '2026-02-11'),
  (4, 'asha@example.com', '2026-02-11');

SELECT id, email, signed_on FROM (
  SELECT id, email, signed_on,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY signed_on DESC, id DESC) AS rn
  FROM signups
) t
WHERE rn = 1
ORDER BY email;
```

Result:

| id | email | signed_on |
|---|---|---|
| 4 | asha@example.com | 2026-02-11 |
| 2 | ravi@example.com | 2026-01-05 |

Asha's rows 3 and 4 tie on the date; `id DESC` decides deterministically. `RANK` would have given both a 1 and kept two rows.

#### MySQL and PostgreSQL

Both support the same ranking functions and `OVER` syntax. The differences to remember: MySQL 8 reserves `RANK` (and `ROW_NUMBER`, `DENSE_RANK` and other window function names) as keywords, so they can't be bare aliases; MySQL 5.7 has no window functions at all; PostgreSQL additionally supports `FILTER (WHERE ...)` on aggregate window functions.

#### Complexity

Ranking needs the rows sorted by the window's `ORDER BY` (per partition): O(n log n), or O(n) if an index already delivers that order. Computing the ranks is then one pass.

Connects to: PARTITION BY, Nth highest salary, top N per group, DISTINCT, LIMIT and OFFSET.

### questions
Q: What is the difference between ROW_NUMBER, RANK and DENSE_RANK?
A: All three number rows in the window's order. ROW_NUMBER gives unique consecutive numbers even for ties. RANK gives tied rows the same number and then skips, so 1, 2, 2, 4. DENSE_RANK gives ties the same number without skipping, so 1, 2, 2, 3.

Q: Why can't you write WHERE ROW_NUMBER() OVER (...) = 1?
A: Window functions are computed after WHERE, GROUP BY and HAVING, so the value doesn't exist yet when WHERE runs. Compute it in a subquery or CTE and filter in the outer query.

Q: Which ranking function finds the Nth highest distinct salary?
A: DENSE_RANK ordered by salary descending, keeping rows where it equals N. Ties share a number and no numbers are skipped, so N counts distinct salaries. RANK would skip numbers after ties, and ROW_NUMBER would count duplicates separately.

Q: Why does SELECT ... AS rank fail in MySQL 8?
A: RANK became a reserved keyword when MySQL 8.0 added window functions, so it can't be used as a bare alias. Quote it with backticks or pick another name such as rnk. PostgreSQL accepts rank as an alias.

Q: How do you keep exactly one row per group, for example the latest order per customer?
A: ROW_NUMBER() OVER (PARTITION BY customer ORDER BY placed_on DESC, id DESC) in a subquery, then keep rows where it equals 1. The extra id key breaks ties so exactly one row survives per customer.

## sql.window.partition-by
name: "PARTITION BY"
importance: must
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "per-group windows"

### simple
PARTITION BY splits the rows into groups for a window function, so each row is compared only with its own group, like ranking students within their own class instead of the whole school. The difference from GROUP BY is that no rows disappear: every row stays and gains a per-group value next to it.

### interview
- `f() OVER (PARTITION BY dept ORDER BY salary DESC)`: the window function restarts for every department.
- **GROUP BY collapses** each group to one row; **PARTITION BY keeps every row** and attaches the group's value. Use it when you need row details and group figures together (salary and department average, order and customer total, share of total).
- Any aggregate can be a window function: `SUM(x) OVER (PARTITION BY k)`, `AVG`, `COUNT`, `MIN`, `MAX`. **Without `ORDER BY` in `OVER`, the window is the whole partition**; with `ORDER BY`, the default frame runs from the partition start to the current row (a running total). That default surprises people.
- `OVER ()` with nothing inside is one window over all rows: `amount / SUM(amount) OVER ()` is a share of the grand total.
- Named windows avoid repetition: `... OVER w ... WINDOW w AS (PARTITION BY dept ORDER BY salary DESC)` (MySQL 8 and PostgreSQL).
- Several windows with different partitions can appear in one query; each may need its own sort.

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
  (1, 'Asha', 'eng', 120000), (2, 'Ravi', 'eng', 95000), (3, 'Arjun', 'eng', 85000),
  (4, 'Meera', 'sales', 70000), (5, 'Kabir', 'sales', 90000), (6, 'Zoya', 'ops', 60000);

SELECT name, dept, salary,
       SUM(salary) OVER (PARTITION BY dept) AS dept_total,
       ROUND(100 * salary / SUM(salary) OVER (PARTITION BY dept), 1) AS pct_of_dept,
       RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rank_in_dept
FROM employees
ORDER BY dept, rank_in_dept;
```

Result:

| name | dept | salary | dept_total | pct_of_dept | rank_in_dept |
|---|---|---|---|---|---|
| Asha | eng | 120000 | 300000 | 40.0 | 1 |
| Ravi | eng | 95000 | 300000 | 31.7 | 2 |
| Arjun | eng | 85000 | 300000 | 28.3 | 3 |
| Zoya | ops | 60000 | 60000 | 100.0 | 1 |
| Kabir | sales | 90000 | 160000 | 56.3 | 1 |
| Meera | sales | 70000 | 160000 | 43.8 | 2 |

Every employee row survives, and each carries its department's total and its rank inside the department. The rank restarts at 1 for each department. With `GROUP BY dept` you would get three rows and lose the names.

The same query on PostgreSQL shows Ravi at 31.0 instead of 31.7: there `100 * salary / SUM(...)` divides integers and truncates before `ROUND` sees it. Write `100.0 * salary` to get decimals in both databases.

#### GROUP BY vs PARTITION BY on the same question

"Salary and department average side by side" with `GROUP BY` needs a join back:

```sql
SELECT e.name, e.salary, d.avg_salary
FROM employees e
JOIN (SELECT dept, AVG(salary) AS avg_salary FROM employees GROUP BY dept) d
  ON d.dept = e.dept
ORDER BY e.id;
```

With a window it is one expression, `AVG(salary) OVER (PARTITION BY dept)`, and one pass over sorted rows.

#### The ORDER BY inside OVER changes an aggregate

```sql
SELECT name, dept, salary,
       SUM(salary) OVER (PARTITION BY dept) AS whole_dept,
       SUM(salary) OVER (PARTITION BY dept ORDER BY salary DESC) AS so_far
FROM employees
WHERE dept = 'eng'
ORDER BY salary DESC;
```

Result:

| name | dept | salary | whole_dept | so_far |
|---|---|---|---|---|
| Asha | eng | 120000 | 300000 | 120000 |
| Ravi | eng | 95000 | 300000 | 215000 |
| Arjun | eng | 85000 | 300000 | 300000 |

Adding `ORDER BY` inside `OVER` switched the frame from "the whole partition" to "from the first row up to this one", turning the total into a running total. If you want a group total, leave `ORDER BY` out of that window.

#### Naming a window

```sql
SELECT name, dept, salary,
       RANK() OVER w AS rnk,
       salary - FIRST_VALUE(salary) OVER w AS behind_top
FROM employees
WINDOW w AS (PARTITION BY dept ORDER BY salary DESC)
ORDER BY dept, rnk;
```

Result:

| name | dept | salary | rnk | behind_top |
|---|---|---|---|---|
| Asha | eng | 120000 | 1 | 0 |
| Ravi | eng | 95000 | 2 | -25000 |
| Arjun | eng | 85000 | 3 | -35000 |
| Zoya | ops | 60000 | 1 | 0 |
| Kabir | sales | 90000 | 1 | 0 |
| Meera | sales | 70000 | 2 | -20000 |

The `WINDOW` clause defines the window once; both functions use it.

#### Complexity and plans

The rows are sorted by the partition keys and the window's `ORDER BY` (O(n log n), or free with a matching index), then each partition is processed in one pass. Windows with different partitions or orders need separate sorts, so group functions that share a window.

Connects to: ROW_NUMBER, RANK and DENSE_RANK, GROUP BY and HAVING, correlated subqueries, top N per group, running totals and moving averages.

### questions
Q: What is the difference between GROUP BY and PARTITION BY?
A: GROUP BY collapses each group into one output row, so only grouped columns and aggregates remain. PARTITION BY, used inside OVER, keeps every row and computes the window function separately within each group, so row details and group values appear side by side.

Q: What does SUM(salary) OVER (PARTITION BY dept ORDER BY salary) compute?
A: A running total within each department, ordered by salary. With ORDER BY, the default frame runs from the start of the partition to the current row (including rows tied with it). Without ORDER BY the same expression gives the whole department's total on every row.

Q: How do you show each order's share of its customer's total spend?
A: amount / SUM(amount) OVER (PARTITION BY customer_id), multiplied by 100 for a percentage. The window sum gives each row its customer's total without collapsing the rows.

Q: What does OVER () with empty parentheses mean?
A: A single window containing every row of the result, so aggregates over it return grand totals on every row, for example amount / SUM(amount) OVER () for each row's share of the total.

## sql.window.lag-and-lead
name: "LAG and LEAD"
importance: must
prereqs: [sql.window.partition-by]
scope: "comparing with previous and next rows"

### simple
LAG reaches back to the previous row and LEAD looks ahead to the next one, in whatever order you choose. They let each row compare itself with its neighbour, like reading today's weight next to yesterday's in a diary. The first row has no previous row, so LAG gives NULL there.

### interview
- `LAG(col, n, default) OVER (PARTITION BY k ORDER BY t)`: the value of `col` n rows earlier (n defaults to 1) in the same partition; `default` replaces the NULL where no such row exists. `LEAD` looks n rows ahead.
- Uses: change from the previous value (day over day, month over month), **detecting changes** (status differs from the previous row), **gaps between events** (time since the previous login, starting a new session after 30 minutes idle), comparing with the next event (time to the next purchase).
- **Previous row is not previous day**: with a missing date, `LAG` compares with the last existing row. Use a calendar or a date join if the question means the calendar day.
- Always `PARTITION BY` the entity (user, sensor) so one entity's first row doesn't look at another's last row.
- Replaces self joins on "row n and row n − 1" that needed a `ROW_NUMBER` on both sides.
- Neither MySQL nor PostgreSQL supports `IGNORE NULLS` for `LAG`/`LEAD`; skipping NULLs needs another technique (such as a running `COUNT` to form groups, then `FIRST_VALUE`).

### deep
#### Worked example: change from the previous reading

```sql
CREATE TABLE readings (
  sensor VARCHAR(10) NOT NULL,
  day DATE NOT NULL,
  temp INT NOT NULL,
  PRIMARY KEY (sensor, day)
);
INSERT INTO readings VALUES
  ('roof', '2026-03-01', 21), ('roof', '2026-03-02', 24), ('roof', '2026-03-04', 23),
  ('lab', '2026-03-01', 19), ('lab', '2026-03-02', 19), ('lab', '2026-03-03', 22);

SELECT sensor, day, temp,
       LAG(temp) OVER w AS prev_temp,
       temp - LAG(temp) OVER w AS change_,
       LEAD(day) OVER w AS next_day
FROM readings
WINDOW w AS (PARTITION BY sensor ORDER BY day)
ORDER BY sensor, day;
```

Result:

| sensor | day | temp | prev_temp | change_ | next_day |
|---|---|---|---|---|---|
| lab | 2026-03-01 | 19 | NULL | NULL | 2026-03-02 |
| lab | 2026-03-02 | 19 | 19 | 0 | 2026-03-03 |
| lab | 2026-03-03 | 22 | 19 | 3 | NULL |
| roof | 2026-03-01 | 21 | NULL | NULL | 2026-03-02 |
| roof | 2026-03-02 | 24 | 21 | 3 | 2026-03-04 |
| roof | 2026-03-04 | 23 | 24 | -1 | NULL |

Each sensor starts over: the roof's first row doesn't see the lab's last row, thanks to `PARTITION BY sensor`. The roof's 4 March reading is compared with 2 March, the previous *row*, because 3 March is missing. If the question is "compared with the previous calendar day", check `DATEDIFF(day, LAG(day) OVER w) = 1` too, or use a self join on the date.

#### Detecting changes

Which days did the lab's temperature change?

```sql
SELECT day, temp FROM (
  SELECT day, temp, LAG(temp) OVER (ORDER BY day) AS prev
  FROM readings WHERE sensor = 'lab'
) t
WHERE prev IS NULL OR temp <> prev
ORDER BY day;
```

Result:

| day | temp |
|---|---|
| 2026-03-01 | 19 |
| 2026-03-03 | 22 |

The first row counts as a change (there was nothing before it); 2 March repeats 19 and is dropped. This "keep rows where the value differs from the previous one" pattern compresses a long log into its transitions.

#### Sessions from gaps

A new session starts when a user is idle for more than 30 minutes. Mark session starts with `LAG`, then number sessions with a running sum:

```sql
CREATE TABLE clicks (user_name VARCHAR(10) NOT NULL, at DATETIME NOT NULL);
INSERT INTO clicks VALUES
  ('asha', '2026-03-01 10:00:00'), ('asha', '2026-03-01 10:10:00'),
  ('asha', '2026-03-01 11:05:00'), ('asha', '2026-03-01 11:20:00'),
  ('ravi', '2026-03-01 10:02:00');

SELECT user_name, at,
       SUM(new_session) OVER (PARTITION BY user_name ORDER BY at) AS session_no
FROM (
  SELECT user_name, at,
         CASE WHEN TIMESTAMPDIFF(MINUTE, LAG(at) OVER (PARTITION BY user_name ORDER BY at), at)
                   <= 30 THEN 0 ELSE 1 END AS new_session
  FROM clicks
) t
ORDER BY user_name, at;
```

Result:

| user_name | at | session_no |
|---|---|---|
| asha | 2026-03-01 10:00:00 | 1 |
| asha | 2026-03-01 10:10:00 | 1 |
| asha | 2026-03-01 11:05:00 | 2 |
| asha | 2026-03-01 11:20:00 | 2 |
| ravi | 2026-03-01 10:02:00 | 1 |

The first click has no previous click, so `TIMESTAMPDIFF` is NULL, the `CASE` falls to `ELSE 1`, and a session starts. The 55-minute gap before 11:05 starts session 2. In PostgreSQL, write the gap as `at - LAG(at) OVER (...) <= INTERVAL '30 minutes'`.

#### Complexity

One sort by partition and order keys, then one pass: O(n log n). The self-join alternative needs row numbers on both sides and a join, which is slower and harder to read.

Connects to: PARTITION BY, self join, consecutive records and streaks, running and cumulative metrics.

### questions
Q: What do LAG and LEAD return?
A: LAG returns a column's value from a row n positions earlier in the window's order, and LEAD from n positions later, within the same partition; n defaults to 1. Where no such row exists they return NULL, or the default given as the third argument.

Q: How do you compute the change from the previous day's value for each sensor?
A: value - LAG(value) OVER (PARTITION BY sensor ORDER BY day). The partition keeps sensors separate. If days can be missing and the question means the calendar day, also check that the previous row's date is exactly one day earlier.

Q: How do you split a stream of events into sessions separated by 30 idle minutes?
A: Use LAG to get each event's previous timestamp per user and flag a new session when the gap exceeds 30 minutes or there is no previous event. A running SUM of that flag, partitioned by user and ordered by time, numbers the sessions.

Q: What is the difference between the previous row and the previous day?
A: LAG gives the previous existing row in the chosen order, which may be several days earlier if data is missing. A question about the calendar day needs a date comparison, a self join on day minus one, or a calendar table to fill the gaps.

## sql.window.running-totals-and-moving-averages
name: "Running totals and moving averages"
importance: important
prereqs: [sql.window.partition-by]
scope: "window frames"

### simple
A running total adds up everything so far, row by row, like the balance column in a bank statement. A moving average averages only the last few rows, such as the last seven days, which smooths out day-to-day noise. In SQL both come from a window frame: the slice of rows around the current row that the function looks at.

### interview
- A **frame** narrows the window around the current row: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` (3 physical rows), `UNBOUNDED PRECEDING` (from the start), `UNBOUNDED FOLLOWING` (to the end).
- Running total: `SUM(x) OVER (ORDER BY day)`. Moving average: `AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.
- **Default frame with `ORDER BY`**: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which includes all **peers** (rows tied on the order key). With duplicate keys the running total jumps by the whole tie at once. Use `ROWS` for a strictly row-by-row total, or make the order key unique.
- `ROWS` counts rows; `RANGE` uses values: `RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW` (MySQL) or `INTERVAL '6 days'` (PostgreSQL) covers the last 7 **calendar days** even when some days have no rows.
- The first rows of a moving average have fewer rows in their frame; filter them out or show the count if a full window is required.
- A running total is a prefix sum; the difference of two running totals gives a range sum.

### deep
#### Worked example

```sql
CREATE TABLE daily (day DATE PRIMARY KEY, units INT NOT NULL);
INSERT INTO daily VALUES
  ('2026-03-01', 10), ('2026-03-02', 20), ('2026-03-03', 30),
  ('2026-03-04', 10), ('2026-03-06', 40), ('2026-03-07', 20);

SELECT day, units,
       SUM(units) OVER (ORDER BY day) AS running,
       ROUND(AVG(units) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
         AS avg_3_rows,
       ROUND(AVG(units) OVER (ORDER BY day
             RANGE BETWEEN INTERVAL 2 DAY PRECEDING AND CURRENT ROW), 2) AS avg_3_days
FROM daily
ORDER BY day;
```

Result:

| day | units | running | avg_3_rows | avg_3_days |
|---|---|---|---|---|
| 2026-03-01 | 10 | 10 | 10.00 | 10.00 |
| 2026-03-02 | 20 | 30 | 15.00 | 15.00 |
| 2026-03-03 | 30 | 60 | 20.00 | 20.00 |
| 2026-03-04 | 10 | 70 | 20.00 | 20.00 |
| 2026-03-06 | 40 | 110 | 26.67 | 25.00 |
| 2026-03-07 | 20 | 130 | 23.33 | 30.00 |

On 6 March the two frames disagree. `ROWS` takes the last 3 rows (3, 4 and 6 March: 80 / 3 = 26.67). `RANGE` with an interval takes 4 to 6 March by date; 5 March has no row, so it averages 10 and 40 = 25.00. For "the last 3 days" as a business question, the date-based frame is the right one.

#### The peer trap

```sql
CREATE TABLE payments (id INT PRIMARY KEY, day DATE NOT NULL, amount INT NOT NULL);
INSERT INTO payments VALUES (1, '2026-03-01', 100), (2, '2026-03-02', 50),
                            (3, '2026-03-02', 70), (4, '2026-03-03', 30);

SELECT id, day, amount,
       SUM(amount) OVER (ORDER BY day) AS default_frame,
       SUM(amount) OVER (ORDER BY day, id ROWS UNBOUNDED PRECEDING) AS row_by_row
FROM payments
ORDER BY day, id;
```

Result:

| id | day | amount | default_frame | row_by_row |
|---|---|---|---|---|
| 1 | 2026-03-01 | 100 | 100 | 100 |
| 2 | 2026-03-02 | 50 | 220 | 150 |
| 3 | 2026-03-02 | 70 | 220 | 220 |
| 4 | 2026-03-03 | 30 | 250 | 250 |

Payments 2 and 3 share a day, so they are peers under `ORDER BY day`, and the default `RANGE` frame includes both in each other's total: both show 220. That is right for "total up to the end of this day", wrong for a statement-style balance after each payment. Adding `id` to the order and using `ROWS` gives a true row-by-row balance.

#### Per-group running totals

Add `PARTITION BY account` to restart the total for each account: `SUM(amount) OVER (PARTITION BY account ORDER BY day, id)`. Retention and growth queries build on this (cumulative signups per month, cumulative revenue per customer).

#### MySQL and PostgreSQL

Both support `ROWS`, `RANGE` with numeric or interval offsets, and `UNBOUNDED`. Spell intervals `INTERVAL 2 DAY` in MySQL and `INTERVAL '2 days'` in PostgreSQL. PostgreSQL also has `GROUPS` frames (count peer groups) and `EXCLUDE CURRENT ROW`; MySQL has neither.

#### Complexity

After the sort, a running `SUM` is one pass. A sliding frame is maintained incrementally (add the entering row, remove the leaving one), so it stays O(n) for `SUM`, `COUNT` and `AVG`; `MIN`/`MAX` over a sliding frame may cost more.

Connects to: 1D prefix sums, PARTITION BY, LAG and LEAD, running and cumulative metrics, fixed-size sliding windows.

### questions
Q: How do you compute a running total in SQL?
A: SUM(amount) OVER (ORDER BY day), adding PARTITION BY for per-group totals. If the order key can repeat, add a unique tiebreaker and a ROWS frame, otherwise tied rows share the same total.

Q: What is the difference between ROWS and RANGE frames?
A: ROWS counts physical rows around the current one, such as the previous 2 rows. RANGE uses the ordering values, so it includes all rows whose key is within the offset, all peers with equal keys, and with dates it can cover a calendar interval even when days are missing.

Q: What is the default window frame when ORDER BY is present?
A: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: from the start of the partition to the current row including its peers. Without ORDER BY, the default frame is the whole partition.

Q: How do you compute a 7-day moving average when some days have no data?
A: Use a date-based frame, RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW in MySQL or INTERVAL '6 days' in PostgreSQL, or first fill the missing days with a calendar and then use ROWS BETWEEN 6 PRECEDING AND CURRENT ROW. A row-based frame alone would span more than 7 days across gaps.

## sql.window.ntile-first-value-and-last-value
name: "NTILE, FIRST_VALUE and LAST_VALUE"
importance: important
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "NTILE, FIRST_VALUE and LAST_VALUE"

### simple
NTILE deals the rows into a number of equal buckets, like splitting a class into four groups by score to find the top quarter. FIRST_VALUE and LAST_VALUE fetch the value from the first or last row of each row's window, such as the best salary in the department. LAST_VALUE has a trap: by default the window ends at the current row.

### interview
- `NTILE(n) OVER (ORDER BY x)` assigns bucket numbers 1 to n with sizes as equal as possible; when rows don't divide evenly, the **first buckets get one extra row**. Ties can land in different buckets.
- `FIRST_VALUE(x) OVER (PARTITION BY k ORDER BY t)`: the value from the first row of the frame (the best, earliest, cheapest).
- **`LAST_VALUE` gotcha**: with `ORDER BY` the default frame ends at the current row (and its peers), so `LAST_VALUE` returns the current row's value. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, or use `FIRST_VALUE` with the order reversed.
- `NTH_VALUE(x, n)` returns the n-th row's value in the frame (same frame caveat).
- Uses: quartiles and deciles for segmentation, "difference from the best in group", first and last event per user (first page seen, last status).
- NTILE buckets are row counts, not value ranges: for true percentiles use `PERCENT_RANK`, `CUME_DIST` or PostgreSQL's `percentile_cont`.

### deep
#### NTILE

```sql
CREATE TABLE students (name VARCHAR(10) PRIMARY KEY, score INT NOT NULL);
INSERT INTO students VALUES ('a', 95), ('b', 90), ('c', 84), ('d', 80), ('e', 77),
  ('f', 70), ('g', 66), ('h', 60), ('i', 51), ('j', 40);

SELECT name, score, NTILE(4) OVER (ORDER BY score DESC) AS quartile
FROM students ORDER BY score DESC;
```

Result:

| name | score | quartile |
|---|---|---|
| a | 95 | 1 |
| b | 90 | 1 |
| c | 84 | 1 |
| d | 80 | 2 |
| e | 77 | 2 |
| f | 70 | 2 |
| g | 66 | 3 |
| h | 60 | 3 |
| i | 51 | 4 |
| j | 40 | 4 |

Ten rows into four buckets: 10 = 4 × 2 + 2, so the first two buckets get 3 rows and the last two get 2. Bucket sizes depend only on the row count, so two students with equal scores can straddle a boundary.

#### FIRST_VALUE and the LAST_VALUE trap

```sql
CREATE TABLE employees (name VARCHAR(10) PRIMARY KEY, dept VARCHAR(10) NOT NULL,
                        salary INT NOT NULL);
INSERT INTO employees VALUES ('Asha', 'eng', 120000), ('Ravi', 'eng', 95000),
  ('Arjun', 'eng', 85000), ('Meera', 'sales', 70000), ('Kabir', 'sales', 90000);

SELECT name, dept, salary,
       FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC) AS top_earner,
       LAST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC) AS last_default,
       LAST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS lowest_earner
FROM employees
ORDER BY dept, salary DESC;
```

Result:

| name | dept | salary | top_earner | last_default | lowest_earner |
|---|---|---|---|---|---|
| Asha | eng | 120000 | Asha | Asha | Arjun |
| Ravi | eng | 95000 | Asha | Ravi | Arjun |
| Arjun | eng | 85000 | Asha | Arjun | Arjun |
| Kabir | sales | 90000 | Kabir | Kabir | Meera |
| Meera | sales | 70000 | Kabir | Meera | Meera |

`last_default` simply repeats each row's own name: the default frame stops at the current row, so the "last" row of the frame is the row itself. With the frame widened to the whole partition, `LAST_VALUE` returns the lowest earner. `FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary ASC)` gives the same answer without frame clauses.

#### Using them for comparisons

`salary - FIRST_VALUE(salary) OVER (PARTITION BY dept ORDER BY salary DESC)` is each person's gap to the department's top salary; `NTILE(10)` over customers by spend gives deciles for a marketing segment. Both keep every row, so they combine with other columns freely.

#### Complexity

All three need the partition sorted: O(n log n). `NTILE` needs the partition's row count, so it can't stream the first bucket before the partition is fully read.

Connects to: ROW_NUMBER, RANK and DENSE_RANK, PARTITION BY, running totals and moving averages, median and percentiles in SQL.

### questions
Q: How does NTILE distribute rows that don't divide evenly?
A: It makes buckets whose sizes differ by at most one, giving the extra rows to the first buckets. Ten rows in NTILE(4) produce bucket sizes 3, 3, 2 and 2. Buckets are based on row counts, so tied values can be split across buckets.

Q: Why does LAST_VALUE often return the current row's value?
A: With ORDER BY in the window, the default frame is from the start of the partition to the current row, so the last row of the frame is the current row (or its last peer). Specify ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING, or use FIRST_VALUE with the order reversed.

Q: How do you show each employee's department's top earner next to them?
A: FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC). Every row of the department gets the name from the first row of its partition, the highest salary, without collapsing the rows.

Q: Is NTILE(100) a good way to compute percentiles?
A: Only roughly: it splits rows into 100 groups by count, so with few rows or many ties the buckets don't match value-based percentiles. PERCENT_RANK or CUME_DIST give exact relative positions, and PostgreSQL's percentile_cont interpolates values such as the median.
