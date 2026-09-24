---
topic: sysd.data
name: "Data storage in design"
subject: sysd
order: 4
prereqs: [sysd.scalability]
---

## sysd.data.choosing-sql-vs-nosql-in-design
name: "Choosing SQL vs NoSQL in design"
importance: must
scope: "access patterns decide"

## sysd.data.replication-in-practice
name: "Replication in practice"
importance: must
prereqs: [sysd.data.choosing-sql-vs-nosql-in-design]
scope: "read replicas, replication lag"

## sysd.data.sharding-strategies
name: "Sharding strategies"
importance: must
prereqs: [sysd.data.replication-in-practice]
scope: "key choice, resharding, hot partitions"

## sysd.data.consistent-hashing-in-design
name: "Consistent hashing in design"
importance: must
prereqs: [sysd.data.sharding-strategies]
scope: "virtual nodes"

## sysd.data.object-storage-and-blobs
name: "Object storage and blobs"
importance: important
scope: "S3-style storage, CDN in front"

## sysd.data.search-systems
name: "Search systems"
importance: important
scope: "inverted indexes, Elasticsearch basics"

## sysd.data.time-series-and-analytics-stores
name: "Time-series and analytics stores"
importance: important
scope: "Time-series and analytics stores"

## sysd.data.data-pipelines
name: "Data pipelines"
importance: advanced
scope: "batch vs stream processing, MapReduce idea"
