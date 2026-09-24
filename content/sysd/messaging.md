---
topic: sysd.messaging
name: "Communication and messaging"
subject: sysd
order: 6
prereqs: [sysd.scalability]
---

## sysd.messaging.synchronous-vs-asynchronous-communication
name: "Synchronous vs asynchronous communication"
importance: must
scope: "Synchronous vs asynchronous communication"

## sysd.messaging.message-queues
name: "Message queues"
importance: must
prereqs: [sysd.messaging.synchronous-vs-asynchronous-communication]
scope: "decoupling, buffering, retries (Kafka, RabbitMQ)"

## sysd.messaging.publish-subscribe-and-event-driven-architecture
name: "Publish-subscribe and event-driven architecture"
importance: must
prereqs: [sysd.messaging.message-queues]
scope: "Publish-subscribe and event-driven architecture"

## sysd.messaging.rest-vs-grpc-vs-graphql
name: "REST vs gRPC vs GraphQL"
importance: important
scope: "REST vs gRPC vs GraphQL"

## sysd.messaging.idempotency-and-exactly-once-myths
name: "Idempotency and exactly-once myths"
importance: must
prereqs: [sysd.messaging.message-queues, sysd.messaging.retries-timeouts-and-exponential-backoff-with-jitter]
scope: "at-least-once delivery, idempotent consumers"

## sysd.messaging.retries-timeouts-and-exponential-backoff-with-jitter
name: "Retries, timeouts and exponential backoff with jitter"
importance: must
scope: "Retries, timeouts and exponential backoff with jitter"

## sysd.messaging.dead-letter-queues-and-poison-messages
name: "Dead-letter queues and poison messages"
importance: important
prereqs: [sysd.messaging.message-queues]
scope: "Dead-letter queues and poison messages"

## sysd.messaging.real-time-delivery
name: "Real-time delivery"
importance: important
scope: "polling, long polling, server-sent events, WebSockets"
