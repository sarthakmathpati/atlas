---
topic: conc.patterns
name: "Concurrency patterns"
subject: conc
order: 4
prereqs: [conc.locks]
---

## conc.patterns.producer-consumer-in-code
name: "Producer-consumer in code"
importance: must
prereqs: [conc.locks.condition-variables]
scope: "bounded blocking queue"

## conc.patterns.thread-pools
name: "Thread pools"
importance: must
prereqs: [conc.patterns.producer-consumer-in-code]
scope: "task queues, sizing, work stealing idea"

## conc.patterns.futures-promises-and-async
name: "Futures, promises and async"
importance: important
prereqs: [conc.patterns.thread-pools]
scope: "getting results from other threads"

## conc.patterns.concurrent-collections
name: "Concurrent collections"
importance: important
scope: "concurrent hash maps and queues, internals overview"

## conc.patterns.classic-coding-exercises
name: "Classic coding exercises"
importance: important
scope: "print in order, odd-even printing, FizzBuzz with threads, building H2O"

## conc.patterns.event-loops-and-coroutines
name: "Event loops and coroutines"
importance: advanced
prereqs: [conc.patterns.futures-promises-and-async]
scope: "async I/O model"
