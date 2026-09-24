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

## sql.joins.left-right-and-full-outer-joins
name: "Left, right and full outer joins"
importance: must
prereqs: [sql.joins.inner-join]
scope: "keeping unmatched rows"

## sql.joins.self-join
name: "Self join"
importance: must
prereqs: [sql.joins.inner-join]
scope: "comparing rows in the same table"

## sql.joins.cross-join
name: "Cross join"
importance: important
prereqs: [sql.joins.inner-join]
scope: "Cartesian products"

## sql.joins.anti-joins-and-semi-joins
name: "Anti-joins and semi-joins"
importance: must
prereqs: [sql.joins.left-right-and-full-outer-joins]
scope: "finding rows without matches (LEFT JOIN … IS NULL, NOT EXISTS)"
