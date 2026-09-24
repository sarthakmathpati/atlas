---
topic: os.io
name: "I/O and system internals"
subject: os
order: 9
prereqs: [os.processes]
---

## os.io.i-o-methods
name: "I/O methods"
importance: important
scope: "polling, interrupts, DMA"

## os.io.buffering-caching-and-spooling
name: "Buffering, caching and spooling"
importance: important
prereqs: [os.io.i-o-methods]
scope: "Buffering, caching and spooling"

## os.io.blocking-vs-non-blocking-i-o
name: "Blocking vs non-blocking I/O"
importance: important
scope: "Blocking vs non-blocking I/O"

## os.io.i-o-multiplexing
name: "I/O multiplexing"
importance: advanced
prereqs: [os.io.blocking-vs-non-blocking-i-o]
scope: "select, poll, epoll"

## os.io.linux-essentials-for-interviews
name: "Linux essentials for interviews"
importance: advanced
scope: "/proc, signals, process commands"
