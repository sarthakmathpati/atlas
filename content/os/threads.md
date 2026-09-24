---
topic: os.threads
name: "Threads"
subject: os
order: 3
prereqs: [os.processes]
---

## os.threads.threads-vs-processes
name: "Threads vs processes"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "what threads share and what they don't"

## os.threads.user-level-vs-kernel-level-threads
name: "User-level vs kernel-level threads"
importance: important
prereqs: [os.threads.threads-vs-processes]
scope: "many-to-one, one-to-one, many-to-many"

## os.threads.benefits-and-costs-of-multithreading
name: "Benefits and costs of multithreading"
importance: important
prereqs: [os.threads.threads-vs-processes]
scope: "responsiveness, overhead, complexity"
