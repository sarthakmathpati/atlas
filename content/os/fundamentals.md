---
topic: os.fundamentals
name: "OS fundamentals"
subject: os
order: 1
prereqs: []
---

## os.fundamentals.what-an-os-does
name: "What an OS does"
importance: must
scope: "resource manager, abstraction, protection"

## os.fundamentals.kernel-mode-vs-user-mode
name: "Kernel mode vs user mode"
importance: must
prereqs: [os.fundamentals.what-an-os-does]
scope: "privilege levels, why the split exists"

## os.fundamentals.system-calls
name: "System calls"
importance: must
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "how programs ask the kernel for services, examples"

## os.fundamentals.kernel-architectures
name: "Kernel architectures"
importance: important
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "monolithic, microkernel, hybrid"

## os.fundamentals.interrupts-traps-and-exceptions
name: "Interrupts, traps and exceptions"
importance: important
prereqs: [os.fundamentals.kernel-mode-vs-user-mode]
scope: "hardware vs software interrupts"

## os.fundamentals.the-boot-process
name: "The boot process"
importance: advanced
scope: "firmware, bootloader, kernel initialization"
