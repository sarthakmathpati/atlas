---
topic: sysd.architecture
name: "Architecture styles"
subject: sysd
order: 8
prereqs: [sysd.scalability]
---

## sysd.architecture.monolith-vs-microservices
name: "Monolith vs microservices"
importance: must
scope: "trade-offs, when to split"

## sysd.architecture.api-gateway-and-service-discovery
name: "API gateway and service discovery"
importance: important
prereqs: [sysd.architecture.monolith-vs-microservices]
scope: "API gateway and service discovery"

## sysd.architecture.service-mesh
name: "Service mesh"
importance: advanced
prereqs: [sysd.architecture.api-gateway-and-service-discovery]
scope: "sidecars"

## sysd.architecture.serverless
name: "Serverless"
importance: important
prereqs: [sysd.architecture.monolith-vs-microservices]
scope: "functions as a service trade-offs"
