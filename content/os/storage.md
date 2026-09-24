---
topic: os.storage
name: "Storage and file systems"
subject: os
order: 8
prereqs: [os.memory]
---

## os.storage.file-concepts
name: "File concepts"
importance: important
scope: "files, directories, metadata, permissions"

## os.storage.file-allocation-methods
name: "File allocation methods"
importance: important
prereqs: [os.storage.file-concepts]
scope: "contiguous, linked, indexed (inodes)"

## os.storage.free-space-management
name: "Free space management"
importance: important
prereqs: [os.storage.file-allocation-methods]
scope: "bitmaps, free lists"

## os.storage.disk-scheduling
name: "Disk scheduling"
importance: important
scope: "FCFS, SSTF, SCAN, C-SCAN, LOOK"

## os.storage.raid-levels
name: "RAID levels"
importance: important
scope: "0, 1, 5, 10 trade-offs"

## os.storage.journaling-file-systems
name: "Journaling file systems"
importance: advanced
prereqs: [os.storage.file-concepts]
scope: "crash consistency"
