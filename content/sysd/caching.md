---
topic: sysd.caching
name: "Caching"
subject: sysd
order: 3
prereqs: [sysd.scalability]
---

## sysd.caching.where-to-cache
name: "Where to cache"
importance: must
scope: "client, CDN, application, database"

## sysd.caching.caching-strategies
name: "Caching strategies"
importance: must
prereqs: [sysd.caching.where-to-cache]
scope: "cache-aside, read-through, write-through, write-back, write-around"

## sysd.caching.eviction-policies
name: "Eviction policies"
importance: must
prereqs: [sysd.caching.where-to-cache]
scope: "LRU, LFU, TTL"

## sysd.caching.cache-invalidation-and-consistency
name: "Cache invalidation and consistency"
importance: must
prereqs: [sysd.caching.caching-strategies]
scope: "stale data, versioning"

## sysd.caching.cache-stampede-and-hot-keys
name: "Cache stampede and hot keys"
importance: important
prereqs: [sysd.caching.cache-invalidation-and-consistency]
scope: "request coalescing, jitter"

## sysd.caching.redis-and-memcached
name: "Redis and Memcached"
importance: important
prereqs: [sysd.caching.caching-strategies]
scope: "data structures, persistence, use cases"
