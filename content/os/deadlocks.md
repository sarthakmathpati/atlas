---
topic: os.deadlocks
name: "Deadlocks"
subject: os
order: 6
prereqs: [os.sync]
---

## os.deadlocks.deadlock-conditions
name: "Deadlock conditions"
importance: must
prereqs: [os.sync.race-conditions-and-critical-sections]
scope: "mutual exclusion, hold and wait, no preemption, circular wait"

## os.deadlocks.resource-allocation-graphs
name: "Resource allocation graphs"
importance: must
prereqs: [os.deadlocks.deadlock-conditions]
scope: "cycles and deadlock"

## os.deadlocks.deadlock-prevention
name: "Deadlock prevention"
importance: must
prereqs: [os.deadlocks.deadlock-conditions]
scope: "breaking each condition"

## os.deadlocks.deadlock-avoidance
name: "Deadlock avoidance"
importance: must
prereqs: [os.deadlocks.resource-allocation-graphs]
scope: "safe states, Banker's algorithm"

## os.deadlocks.deadlock-detection-and-recovery
name: "Deadlock detection and recovery"
importance: important
prereqs: [os.deadlocks.resource-allocation-graphs]
scope: "wait-for graphs, killing or rolling back"

## os.deadlocks.livelock-and-starvation
name: "Livelock and starvation"
importance: important
prereqs: [os.deadlocks.deadlock-conditions]
scope: "how they differ from deadlock"
