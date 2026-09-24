---
topic: conc.locks
name: "Locks and coordination"
subject: conc
order: 2
prereqs: [conc.basics, os.sync]
---

## conc.locks.mutexes-and-lock-guards
name: "Mutexes and lock guards"
importance: must
prereqs: [conc.basics.thread-safety]
scope: "RAII locks, scoped locking"

## conc.locks.avoiding-deadlocks-in-code
name: "Avoiding deadlocks in code"
importance: must
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "lock ordering, try-lock, timeouts"

## conc.locks.condition-variables
name: "Condition variables"
importance: must
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "wait and notify, spurious wakeups, predicates"

## conc.locks.read-write-locks
name: "Read-write locks"
importance: important
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "many readers, one writer"

## conc.locks.semaphores-latches-and-barriers
name: "Semaphores, latches and barriers"
importance: important
prereqs: [conc.locks.condition-variables]
scope: "coordination primitives"

## conc.locks.thread-safe-singleton
name: "Thread-safe singleton"
importance: important
prereqs: [conc.locks.mutexes-and-lock-guards]
scope: "double-checked locking, static local initialization"
