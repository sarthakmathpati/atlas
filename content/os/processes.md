---
topic: os.processes
name: "Processes"
subject: os
order: 2
prereqs: [os.fundamentals]
---

## os.processes.process-vs-program
name: "Process vs program"
importance: must
scope: "address space layout (text, data, heap, stack)"

## os.processes.process-control-block-and-states
name: "Process control block and states"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "new, ready, running, waiting, terminated"

## os.processes.context-switching
name: "Context switching"
importance: must
prereqs: [os.processes.process-control-block-and-states]
scope: "what is saved, why it is expensive"

## os.processes.fork-exec-and-wait
name: "fork, exec and wait"
importance: must
prereqs: [os.fundamentals.system-calls, os.processes.process-vs-program]
scope: "creating processes in Unix, copy-on-write"

## os.processes.zombie-and-orphan-processes
name: "Zombie and orphan processes"
importance: important
prereqs: [os.processes.fork-exec-and-wait]
scope: "causes and cleanup"

## os.processes.inter-process-communication
name: "Inter-process communication"
importance: must
prereqs: [os.processes.process-vs-program]
scope: "pipes, shared memory, message queues, sockets, signals"
