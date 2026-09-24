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

## sql.classics.top-n-per-group
name: "Top N per group"
importance: must
prereqs: [sql.window.partition-by]
scope: "window functions with PARTITION BY"

## sql.classics.finding-duplicates
name: "Finding duplicates"
importance: must
prereqs: [sql.aggregation.group-by-and-having]
scope: "GROUP BY with HAVING COUNT > 1"

## sql.classics.employees-earning-more-than-their-managers
name: "Employees earning more than their managers"
importance: must
prereqs: [sql.joins.self-join]
scope: "self join"

## sql.classics.consecutive-records-and-streaks
name: "Consecutive records and streaks"
importance: important
prereqs: [sql.window.lag-and-lead]
scope: "gaps and islands technique"

## sql.classics.pivoting-rows-to-columns
name: "Pivoting rows to columns"
importance: important
prereqs: [sql.basics.case-when]
scope: "conditional aggregation"

## sql.classics.running-and-cumulative-metrics
name: "Running and cumulative metrics"
importance: important
prereqs: [sql.window.running-totals-and-moving-averages]
scope: "retention and growth queries"

## sql.classics.median-and-percentiles-in-sql
name: "Median and percentiles in SQL"
importance: advanced
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "Median and percentiles in SQL"
