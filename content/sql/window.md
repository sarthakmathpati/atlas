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

## sql.window.partition-by
name: "PARTITION BY"
importance: must
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "per-group windows"

## sql.window.lag-and-lead
name: "LAG and LEAD"
importance: must
prereqs: [sql.window.partition-by]
scope: "comparing with previous and next rows"

## sql.window.running-totals-and-moving-averages
name: "Running totals and moving averages"
importance: important
prereqs: [sql.window.partition-by]
scope: "window frames"

## sql.window.ntile-first-value-and-last-value
name: "NTILE, FIRST_VALUE and LAST_VALUE"
importance: important
prereqs: [sql.window.row-number-rank-and-dense-rank]
scope: "NTILE, FIRST_VALUE and LAST_VALUE"
