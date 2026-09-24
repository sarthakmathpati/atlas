---
topic: dbms.relational
name: "Relational model"
subject: dbms
order: 3
prereqs: [dbms.er]
---

## dbms.relational.keys
name: "Keys"
importance: must
scope: "super, candidate, primary, alternate, foreign, composite"

## dbms.relational.integrity-constraints
name: "Integrity constraints"
importance: must
prereqs: [dbms.relational.keys]
scope: "entity integrity, referential integrity, domain constraints"

## dbms.relational.relational-algebra
name: "Relational algebra"
importance: important
scope: "select, project, union, difference, product, joins, division"

## dbms.relational.relational-calculus
name: "Relational calculus"
importance: advanced
prereqs: [dbms.relational.relational-algebra]
scope: "tuple and domain calculus"
