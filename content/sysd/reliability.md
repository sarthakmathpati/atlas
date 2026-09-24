---
topic: sysd.reliability
name: "Reliability and resilience"
subject: sysd
order: 7
prereqs: [sysd.scalability]
---

## sysd.reliability.rate-limiting-algorithms
name: "Rate limiting algorithms"
importance: must
scope: "token bucket, leaky bucket, fixed and sliding windows"

## sysd.reliability.circuit-breakers-and-bulkheads
name: "Circuit breakers and bulkheads"
importance: important
scope: "Circuit breakers and bulkheads"

## sysd.reliability.redundancy-and-failover
name: "Redundancy and failover"
importance: important
scope: "active-active, active-passive"

## sysd.reliability.slas-slos-and-slis
name: "SLAs, SLOs and SLIs"
importance: important
scope: "measuring reliability"

## sysd.reliability.disaster-recovery
name: "Disaster recovery"
importance: important
prereqs: [sysd.reliability.redundancy-and-failover]
scope: "backups, RPO and RTO"

## sysd.reliability.graceful-degradation-and-backpressure
name: "Graceful degradation and backpressure"
importance: important
prereqs: [sysd.reliability.circuit-breakers-and-bulkheads]
scope: "Graceful degradation and backpressure"
