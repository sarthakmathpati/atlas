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

## sql.subqueries.correlated-subqueries
name: "Correlated subqueries"
importance: must
prereqs: [sql.subqueries.subqueries]
scope: "per-row subqueries and their cost"

## sql.subqueries.set-operations
name: "Set operations"
importance: important
scope: "UNION vs UNION ALL, INTERSECT, EXCEPT"

## sql.subqueries.ctes
name: "CTEs"
importance: must
prereqs: [sql.subqueries.subqueries]
scope: "WITH clauses for readable queries"

## sql.subqueries.recursive-ctes
name: "Recursive CTEs"
importance: important
prereqs: [sql.subqueries.ctes]
scope: "hierarchies and sequences"
