---
topic: conc.basics
name: "Concurrency basics"
subject: conc
order: 1
prereqs: [os.threads]
---

## conc.basics.concurrency-vs-parallelism
name: "Concurrency vs parallelism"
importance: must
scope: "interleaving vs simultaneous execution"

## conc.basics.creating-threads
name: "Creating threads"
importance: must
prereqs: [conc.basics.concurrency-vs-parallelism]
scope: "std::thread, std::jthread, std::async and thread pools"

## conc.basics.data-races-vs-race-conditions
name: "Data races vs race conditions"
importance: must
scope: "the difference and examples"

## conc.basics.thread-safety
name: "Thread safety"
importance: must
prereqs: [conc.basics.data-races-vs-race-conditions]
scope: "what makes code thread-safe, immutability, confinement"
