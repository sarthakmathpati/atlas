---
topic: sysd.method
name: "System design method"
subject: sysd
order: 1
prereqs: []
---

## sysd.method.the-interview-framework
name: "The interview framework"
importance: must
scope: "requirements, estimates, API, data model, high-level design, deep dives, bottlenecks"

## sysd.method.functional-vs-non-functional-requirements
name: "Functional vs non-functional requirements"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "scale, latency, availability, consistency"

## sysd.method.back-of-the-envelope-estimation
name: "Back-of-the-envelope estimation"
importance: must
prereqs: [sysd.method.functional-vs-non-functional-requirements]
scope: "QPS, storage, bandwidth, powers of two"

## sysd.method.api-design
name: "API design"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "REST endpoints, pagination, versioning, idempotency keys"

## sysd.method.discussing-trade-offs
name: "Discussing trade-offs"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "there is no single right answer"
