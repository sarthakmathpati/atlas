---
topic: dbms.recovery
name: "Recovery"
subject: dbms
order: 7
prereqs: [dbms.transactions]
---

## dbms.recovery.logs-and-write-ahead-logging
name: "Logs and write-ahead logging"
importance: important
scope: "undo and redo"

## dbms.recovery.checkpoints
name: "Checkpoints"
importance: important
prereqs: [dbms.recovery.logs-and-write-ahead-logging]
scope: "speeding up recovery"

## dbms.recovery.shadow-paging-and-aries-overview
name: "Shadow paging and ARIES overview"
importance: advanced
prereqs: [dbms.recovery.checkpoints]
scope: "Shadow paging and ARIES overview"
