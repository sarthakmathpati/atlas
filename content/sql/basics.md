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

## sql.basics.distinct-limit-and-offset
name: "DISTINCT, LIMIT and OFFSET"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "deduplication and pagination"

## sql.basics.null-handling
name: "NULL handling"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "IS NULL, COALESCE, NULL in comparisons and aggregates"

## sql.basics.case-when
name: "CASE WHEN"
importance: must
prereqs: [sql.basics.select-where-and-order-by]
scope: "conditional logic in queries"

## sql.basics.string-and-date-functions
name: "String and date functions"
importance: important
scope: "CONCAT, SUBSTRING, date arithmetic, formatting"
