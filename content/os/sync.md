---
topic: os.sync
name: "Synchronization"
subject: os
order: 5
prereqs: [os.threads]
---

## os.sync.race-conditions-and-critical-sections
name: "Race conditions and critical sections"
importance: must
prereqs: [os.threads.threads-vs-processes]
scope: "requirements (mutual exclusion, progress, bounded waiting)"

## os.sync.petersons-solution
name: "Peterson's solution"
importance: important
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "two-process software solution"

## os.sync.mutex-locks
name: "Mutex locks"
importance: must
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "acquire and release, busy waiting vs blocking"

## os.sync.semaphores
name: "Semaphores"
importance: must
prereqs: [os.sync.mutex-locks]
scope: "binary vs counting, wait and signal"

## os.sync.monitors-and-condition-variables
name: "Monitors and condition variables"
importance: important
prereqs: [os.sync.semaphores]
scope: "higher-level synchronization"

## os.sync.hardware-support
name: "Hardware support"
importance: important
prereqs: [os.sync.mutex-locks]
scope: "test-and-set, compare-and-swap, spinlocks"

## os.sync.producer-consumer-problem
name: "Producer-consumer problem"
importance: must
prereqs: [os.sync.semaphores]
scope: "bounded buffer with semaphores"

## os.sync.readers-writers-problem
name: "Readers-writers problem"
importance: important
prereqs: [os.sync.semaphores]
scope: "reader or writer preference"

## os.sync.dining-philosophers
name: "Dining philosophers"
importance: important
prereqs: [os.sync.semaphores]
scope: "deadlock and starvation-free solutions"

## os.sync.priority-inversion
name: "Priority inversion"
importance: important
prereqs: [os.sync.mutex-locks]
scope: "cause and priority inheritance"
