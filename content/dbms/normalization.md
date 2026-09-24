---
topic: dbms.normalization
name: "Normalization"
subject: dbms
order: 4
prereqs: [dbms.relational]
---

## dbms.normalization.anomalies
name: "Anomalies"
importance: must
scope: "insertion, update and deletion anomalies"

## dbms.normalization.functional-dependencies
name: "Functional dependencies"
importance: must
prereqs: [dbms.relational.keys, dbms.normalization.anomalies]
scope: "closure, Armstrong's axioms"

## dbms.normalization.normal-forms
name: "Normal forms"
importance: must
prereqs: [dbms.normalization.functional-dependencies]
scope: "1NF, 2NF, 3NF, BCNF with examples"

## dbms.normalization.decomposition
name: "Decomposition"
importance: important
prereqs: [dbms.normalization.normal-forms]
scope: "lossless join and dependency preservation"

## dbms.normalization.minimal-cover-and-higher-normal-forms
name: "Minimal cover and higher normal forms"
importance: advanced
prereqs: [dbms.normalization.normal-forms]
scope: "4NF, 5NF"

## dbms.normalization.denormalization
name: "Denormalization"
importance: important
prereqs: [dbms.normalization.normal-forms]
scope: "when and why to break the rules"
