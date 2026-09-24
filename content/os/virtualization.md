---
topic: os.virtualization
name: "Virtualization and containers"
subject: os
order: 10
prereqs: [os.processes]
---

## os.virtualization.virtual-machines-and-hypervisors
name: "Virtual machines and hypervisors"
importance: important
scope: "type 1 vs type 2"

## os.virtualization.containers-vs-vms
name: "Containers vs VMs"
importance: important
prereqs: [os.virtualization.virtual-machines-and-hypervisors]
scope: "shared kernel, isolation trade-offs"

## os.virtualization.namespaces-and-cgroups
name: "Namespaces and cgroups"
importance: advanced
prereqs: [os.virtualization.containers-vs-vms]
scope: "how containers isolate processes"
