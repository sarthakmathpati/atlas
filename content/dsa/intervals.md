---
topic: dsa.intervals
name: "Intervals"
subject: dsa
order: 17
prereqs: [dsa.sorting]
---

## dsa.intervals.merge-intervals
name: "Merge intervals"
importance: must
pattern: true
scope: "sort by start, merge overlaps"

## dsa.intervals.insert-interval
name: "Insert interval"
importance: must
pattern: true
prereqs: [dsa.intervals.merge-intervals]
scope: "before, overlapping, after"

## dsa.intervals.interval-scheduling
name: "Interval scheduling"
importance: must
pattern: true
scope: "non-overlapping intervals, minimum arrows, sorting by end"

## dsa.intervals.sweep-line
name: "Sweep line"
importance: important
pattern: true
scope: "counting overlaps with start and end events"

## dsa.intervals.interval-list-intersections
name: "Interval list intersections"
importance: important
prereqs: [dsa.intervals.merge-intervals]
scope: "two pointers over sorted lists"

## dsa.intervals.calendar-booking-designs
name: "Calendar booking designs"
importance: advanced
prereqs: [dsa.intervals.sweep-line]
scope: "ordered map and segment tree approaches"
