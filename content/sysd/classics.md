---
topic: sysd.classics
name: "Classic system design problems"
subject: sysd
order: 10
prereqs: [sysd.caching, sysd.data, sysd.messaging]
---

## sysd.classics.url-shortener
name: "URL shortener"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.building-blocks.unique-id-generation]
scope: "ID generation, redirects, analytics"

## sysd.classics.rate-limiter-service
name: "Rate limiter service"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.reliability.rate-limiting-algorithms]
scope: "distributed counters, placement"

## sysd.classics.pastebin
name: "Pastebin"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "blob storage and expiry"

## sysd.classics.key-value-store
name: "Key-value store"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "partitioning, replication, consistency"

## sysd.classics.web-crawler
name: "Web crawler"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "frontier, politeness, deduplication"

## sysd.classics.notification-system
name: "Notification system"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "channels, fan-out, retries"

## sysd.classics.news-feed
name: "News feed"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "fan-out on write vs read, ranking"

## sysd.classics.chat-application
name: "Chat application"
importance: must
prereqs: [sysd.method.the-interview-framework, sysd.messaging.real-time-delivery]
scope: "WebSockets, delivery receipts, storage"

## sysd.classics.photo-sharing-app
name: "Photo sharing app"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "uploads, feeds, CDN"

## sysd.classics.video-streaming-platform
name: "Video streaming platform"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "encoding, adaptive bitrate, CDN"

## sysd.classics.file-storage-and-sync
name: "File storage and sync"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "chunking, deduplication, conflicts"

## sysd.classics.ride-hailing
name: "Ride-hailing"
importance: important
prereqs: [sysd.method.the-interview-framework, sysd.building-blocks.geospatial-indexing]
scope: "location updates, matching, geo-indexing"

## sysd.classics.typeahead-autocomplete
name: "Typeahead autocomplete"
importance: must
prereqs: [sysd.method.the-interview-framework]
scope: "trie service, top-k caching"

## sysd.classics.e-commerce-and-flash-sales
name: "E-commerce and flash sales"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "inventory, oversell prevention"

## sysd.classics.ticket-booking
name: "Ticket booking"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "seat locking, payments, consistency"

## sysd.classics.payment-system
name: "Payment system"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "idempotency, ledgers, reconciliation"

## sysd.classics.leaderboard
name: "Leaderboard"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "sorted sets, sharding scores"

## sysd.classics.distributed-cache
name: "Distributed cache"
importance: important
prereqs: [sysd.method.the-interview-framework]
scope: "eviction, consistent hashing, replication"

## sysd.classics.distributed-message-queue
name: "Distributed message queue"
importance: important
prereqs: [sysd.method.the-interview-framework, sysd.messaging.message-queues]
scope: "partitions, offsets, consumer groups"

## sysd.classics.stock-exchange-matching-engine
name: "Stock exchange matching engine"
importance: advanced
tracks: [sde, quant]
prereqs: [sysd.method.the-interview-framework]
scope: "order book, price-time priority, low latency"

## sysd.classics.collaborative-document-editing
name: "Collaborative document editing"
importance: advanced
prereqs: [sysd.method.the-interview-framework]
scope: "operational transforms and CRDTs overview"

## sysd.classics.metrics-and-monitoring-system
name: "Metrics and monitoring system"
importance: advanced
prereqs: [sysd.method.the-interview-framework]
scope: "time-series ingestion"
