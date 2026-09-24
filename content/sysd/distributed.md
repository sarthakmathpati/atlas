---
topic: sysd.distributed
name: "Consistency and distributed systems"
subject: sysd
order: 5
prereqs: [sysd.data]
---

## sysd.distributed.cap-theorem-in-practice
name: "CAP theorem in practice"
importance: must
scope: "choosing CP or AP per feature"

## sysd.distributed.pacelc
name: "PACELC"
importance: important
prereqs: [sysd.distributed.cap-theorem-in-practice]
scope: "latency vs consistency when there is no partition"

## sysd.distributed.consistency-models
name: "Consistency models"
importance: must
prereqs: [sysd.distributed.cap-theorem-in-practice]
scope: "strong, eventual, causal, read-your-writes"

## sysd.distributed.quorums
name: "Quorums"
importance: important
prereqs: [sysd.distributed.consistency-models]
scope: "R + W > N"

## sysd.distributed.consensus-basics
name: "Consensus basics"
importance: important
scope: "leader election, Raft idea"

## sysd.distributed.distributed-locks-and-leases
name: "Distributed locks and leases"
importance: important
prereqs: [sysd.distributed.consensus-basics]
scope: "Distributed locks and leases"

## sysd.distributed.clocks-and-ordering
name: "Clocks and ordering"
importance: advanced
prereqs: [sysd.distributed.consistency-models]
scope: "logical clocks, vector clocks"

## sysd.distributed.distributed-transactions-in-practice
name: "Distributed transactions in practice"
importance: advanced
scope: "sagas, outbox pattern"
