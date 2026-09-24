---
topic: os.scheduling
name: "CPU scheduling"
subject: os
order: 4
prereqs: [os.processes]
---

## os.scheduling.scheduling-criteria
name: "Scheduling criteria"
importance: must
scope: "throughput, turnaround, waiting and response time, CPU utilization"

## os.scheduling.fcfs-and-sjf
name: "FCFS and SJF"
importance: must
prereqs: [os.scheduling.scheduling-criteria]
scope: "convoy effect, optimality of SJF, SRTF"

## os.scheduling.priority-scheduling
name: "Priority scheduling"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "starvation and aging"

## os.scheduling.round-robin
name: "Round robin"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "time quantum trade-offs"

## os.scheduling.multilevel-queue-and-feedback-queue-scheduling
name: "Multilevel queue and feedback queue scheduling"
importance: important
prereqs: [os.scheduling.round-robin]
scope: "Multilevel queue and feedback queue scheduling"

## os.scheduling.solving-scheduling-numericals
name: "Solving scheduling numericals"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "Gantt charts, average waiting and turnaround time"

## os.scheduling.linux-cfs
name: "Linux CFS"
importance: advanced
prereqs: [os.scheduling.multilevel-queue-and-feedback-queue-scheduling]
scope: "fair scheduling with virtual runtime"
