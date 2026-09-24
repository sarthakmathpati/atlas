---
topic: sysd.scalability
name: "Scalability foundations"
subject: sysd
order: 2
prereqs: [sysd.method]
---

## sysd.scalability.vertical-vs-horizontal-scaling
name: "Vertical vs horizontal scaling"
importance: must
scope: "Vertical vs horizontal scaling"

## sysd.scalability.stateless-services
name: "Stateless services"
importance: must
prereqs: [sysd.scalability.vertical-vs-horizontal-scaling]
scope: "why state should live outside app servers"

## sysd.scalability.load-balancing
name: "Load balancing"
importance: must
prereqs: [sysd.scalability.stateless-services]
scope: "algorithms (round robin, least connections, consistent hashing), health checks"

## sysd.scalability.autoscaling
name: "Autoscaling"
importance: important
prereqs: [sysd.scalability.load-balancing]
scope: "scaling on metrics"

## sysd.scalability.latency-vs-throughput-trade-offs
name: "Latency vs throughput trade-offs"
importance: must
scope: "Latency vs throughput trade-offs"
