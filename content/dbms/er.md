---
topic: dbms.er
name: "ER modeling"
subject: dbms
order: 2
prereqs: [dbms.fundamentals]
---

## dbms.er.entities-attributes-and-relationships
name: "Entities, attributes and relationships"
importance: must
scope: "attribute types (composite, multivalued, derived)"

## dbms.er.cardinality-and-participation
name: "Cardinality and participation"
importance: must
prereqs: [dbms.er.entities-attributes-and-relationships]
scope: "one-to-one, one-to-many, many-to-many, total vs partial"

## dbms.er.weak-entities
name: "Weak entities"
importance: important
prereqs: [dbms.er.entities-attributes-and-relationships]
scope: "identifying relationships"

## dbms.er.er-to-relational-mapping
name: "ER to relational mapping"
importance: must
prereqs: [dbms.er.cardinality-and-participation]
scope: "turning diagrams into tables"
