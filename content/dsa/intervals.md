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

### simple
Merging intervals combines overlapping time ranges into single blocks, like turning a messy list of booked hours into a clean schedule of busy periods. Sort the ranges by their start time, then walk through them, stretching the current block whenever the next range begins before it ends. When a range starts after the block ends, close the block and begin a new one.

### interview
- Sort by start: **O(n log n)**. Then one pass: if `start <= last.end`, set `last.end = max(last.end, end)`; else append a new interval.
- Take the **max** of the ends: a later interval can be fully inside the current one.
- Decide whether touching intervals (`[1,2]` and `[2,3]`) count as overlapping; the usual rule `start <= lastEnd` merges them.
- Overlap test for two intervals: `a.start <= b.end && b.start <= a.end` (closed intervals).
- Output is sorted and non-overlapping; O(n) extra space for the result.
- Related: insert interval (no sort needed if the list is already sorted), employee free time (merge, then read the gaps).

### deep
#### Intuition

After sorting by start, any interval that overlaps the current merged block must come right after it in the order: if interval $j$ doesn't overlap the block, no later interval (with an even later start) can overlap it either. So a single left-to-right pass decides everything.

#### Worked example

`[1,3] [8,10] [2,6] [15,18] [17,20]` → sorted by start: `[1,3] [2,6] [8,10] [15,18] [17,20]`.

| next | current block | overlaps? | result so far |
|---|---|---|---|
| [1,3] | | first | [1,3] |
| [2,6] | [1,3] | 2 ≤ 3: yes | [1,6] |
| [8,10] | [1,6] | 8 > 6: no | [1,6] [8,10] |
| [15,18] | [8,10] | no | … [15,18] |
| [17,20] | [15,18] | 17 ≤ 18: yes | [1,6] [8,10] [15,20] |

#### Code

```cpp
vector<vector<int>> mergeIntervals(vector<vector<int>> iv) {
    sort(iv.begin(), iv.end());                          // by start (then end)
    vector<vector<int>> out;
    for (auto& cur : iv) {
        if (!out.empty() && cur[0] <= out.back()[1])
            out.back()[1] = max(out.back()[1], cur[1]);  // extend the current block
        else
            out.push_back(cur);                          // start a new block
    }
    return out;
}
```

#### Complexity

Sorting dominates: $O(n \log n)$ time. The merge pass is $O(n)$. Space $O(n)$ for the output ($O(\log n)$ to $O(n)$ for the sort).

#### Why sort by start, not by end

Sorting by end can put an early-starting long interval after short ones it covers. With `[2,3] [4,5] [1,10]` sorted by end, a single pass would close `[2,3]` and `[4,5]` before seeing `[1,10]`, which swallows both. Sorting by start guarantees that when an interval arrives, every interval that could overlap the current block from the left has already been seen. (Sorting by end is the right key for a different question: choosing the most non-overlapping intervals.)

#### When the input is already sorted or streaming

If intervals arrive already sorted by start, skip the sort and the whole thing is $O(n)$. If they arrive one at a time in any order and you must keep a merged view, store the merged intervals in an ordered map keyed by start and merge each newcomer with its neighbors in $O(\log n)$ plus the number of intervals it absorbs.

#### Edge cases and bugs

- Nested intervals: `[1,10]` then `[2,3]` must not shrink the block to 3; use `max`.
- Touching endpoints: `[1,4]` and `[4,5]` merge with `<=`, stay separate with `<`. Read the problem.
- Empty input: return an empty list.
- Modifying the input while iterating over it (sort a copy if the caller needs the original).

#### Variants

- Insert interval, remove interval, interval list intersections.
- Total covered length (merge, then sum lengths) and the gaps (employee free time).
- Merge with extra data (combine labels while merging).
- When intervals arrive online, keep them in an ordered map keyed by start.

Connects to: sorting, insert interval, sweep line, interval scheduling.

### questions
Q: How do you merge a list of overlapping intervals?
A: Sort them by start. Walk through them keeping the last merged interval: if the next one starts at or before its end, extend the end to the larger of the two ends; otherwise add the next one as a new interval. It is O(n log n) because of the sort.

Q: Why must you take the maximum of the two ends when merging?
A: The next interval may lie entirely inside the current block, like [2, 3] inside [1, 10]. Setting the end to 3 would wrongly shrink the block and could split later overlaps.

Q: Why does sorting by start make one pass enough?
A: After sorting, if an interval doesn't overlap the current block, every later interval starts even later, so none of them can overlap the block either. The block is final as soon as a non-overlapping interval appears.

Q: How do you check whether two closed intervals overlap?
A: They overlap exactly when each starts no later than the other ends: a.start <= b.end and b.start <= a.end. Equivalently, they don't overlap when one ends before the other starts.

Q: How would you find the free time common to several people's schedules?
A: Put all busy intervals together, merge them, and report the gaps between consecutive merged intervals. With k people and n intervals, that is O(n log n), or O(n log k) with a heap if each person's list is already sorted.

### signals
- overlapping ranges of time, numbers or positions to combine
- "merge", "union" or total covered length of intervals
- busy periods, free slots or gaps between bookings
- a list of [start, end] pairs in no particular order

### template
```cpp
// Sort by start, then extend or close the current block.
vector<pair<int, int>> mergeAll(vector<pair<int, int>> iv) {
    sort(iv.begin(), iv.end());
    vector<pair<int, int>> out;
    for (auto [s, e] : iv) {
        if (!out.empty() && s <= out.back().second)      // overlap (use < to keep touching apart)
            out.back().second = max(out.back().second, e);
        else
            out.push_back({s, e});
    }
    return out;
}
```

## dsa.intervals.insert-interval
name: "Insert interval"
importance: must
pattern: true
prereqs: [dsa.intervals.merge-intervals]
scope: "before, overlapping, after"

### simple
Inserting a new interval into a sorted list of non-overlapping intervals is like adding a new appointment to a tidy calendar. Appointments that end before the new one starts stay as they are, appointments that overlap it get merged into one bigger block, and appointments that start after it ends stay as they are. Three simple phases, one pass.

### interview
- Input is sorted and non-overlapping, so no sort is needed: **O(n)**.
- Phase 1: copy intervals with `end < new.start` (entirely before).
- Phase 2: while `start <= new.end`, merge: `new.start = min(...)`, `new.end = max(...)`. Then add the merged interval.
- Phase 3: copy the rest (entirely after).
- Alternatively, binary search the positions of the phases: O(log n) to find them, still O(n) to build the output.
- Watch the boundary comparisons for touching intervals.

### deep
#### Intuition

Because the list is sorted and disjoint, the intervals affected by the new one form a contiguous run. Everything before the run ends before the new interval starts; everything after starts after it ends. So you only need to find the run and fold it into one merged interval.

#### Worked example

Intervals `[1,2] [3,5] [6,7] [8,10] [12,16]`, new `[4,8]`.

| interval | phase | action | new interval |
|---|---|---|---|
| [1,2] | before (2 < 4) | copy | [4,8] |
| [3,5] | overlap (3 ≤ 8) | merge | [3,8] |
| [6,7] | overlap | merge | [3,8] |
| [8,10] | overlap (8 ≤ 8) | merge | [3,10] |
| [12,16] | after (12 > 10) | add merged, copy | |

Result: `[1,2] [3,10] [12,16]`.

#### Code

```cpp
vector<vector<int>> insertInterval(const vector<vector<int>>& iv, vector<int> nw) {
    vector<vector<int>> out;
    int i = 0, n = iv.size();
    while (i < n && iv[i][1] < nw[0]) out.push_back(iv[i++]);   // entirely before
    while (i < n && iv[i][0] <= nw[1]) {                        // overlapping: absorb
        nw[0] = min(nw[0], iv[i][0]);
        nw[1] = max(nw[1], iv[i][1]);
        i++;
    }
    out.push_back(nw);
    while (i < n) out.push_back(iv[i++]);                       // entirely after
    return out;
}
```

#### Why three phases are enough

Everything before the overlapping run ends before the new interval starts, and everything after it starts after the (possibly grown) new interval ends. The merged interval only grows while it absorbs the run, and the run is contiguous because the list is sorted and disjoint. So one forward scan sees each interval once and places it in exactly one phase.

#### Complexity

$O(n)$ time and $O(n)$ output space. With binary search the boundaries take $O(\log n)$, but copying the output still costs $O(n)$; an ordered map of intervals allows $O(\log n + k)$ insertion in place, where $k$ is the number of merged intervals.

#### Edge cases and bugs

- The new interval before all others, after all others, or covering all of them.
- Empty list: the result is just the new interval.
- Touching: `[1,2]` and new `[2,3]`: with `end < start` for "before" and `start <= end` for "overlap" they merge into `[1,3]`.
- Sorting or merging the caller's vector in place when they still need it; take it by value (a copy) or say that you modify it.

#### Variants

- Remove interval (split the partly covered intervals).
- Range module (add, remove, query ranges): an ordered map of disjoint intervals.
- Summary ranges and data stream as disjoint intervals: insert single points and merge neighbors.

Connects to: merge intervals, binary search, calendar booking designs.

### questions
Q: How do you insert an interval into a sorted list of disjoint intervals?
A: Copy all intervals that end before the new one starts. Then merge every interval that starts at or before the new interval's end, expanding the new interval's start and end. Add the merged interval, then copy the remaining intervals. It is O(n) with no sorting.

Q: Why is no sort needed?
A: The existing list is already sorted and disjoint, so the intervals that overlap the new one form one contiguous run, and the three phases (before, overlapping, after) can be read off in order.

Q: Can binary search make insertion faster?
A: It can find where the overlapping run starts and ends in O(log n), but building a new output array still takes O(n). To get O(log n) per insertion you need a structure like an ordered map of intervals that can be modified in place.

Q: How do you handle an interval that touches an existing one at an endpoint?
A: It depends on whether touching counts as overlap. With the conditions "end < new start" for before and "start <= new end" for overlap, touching intervals are merged; use strict comparisons if they must stay separate.

### signals
- add a new interval to a sorted, non-overlapping list
- keep a calendar or a set of ranges merged after each addition
- remove or split ranges covered by another range
- intervals that are already sorted, so a full re-merge is wasteful

### template
```cpp
// Three phases over sorted, disjoint intervals: before, overlapping (absorb), after.
vector<pair<int, int>> insertOne(const vector<pair<int, int>>& iv, pair<int, int> nw) {
    vector<pair<int, int>> out;
    size_t i = 0;
    while (i < iv.size() && iv[i].second < nw.first) out.push_back(iv[i++]);
    while (i < iv.size() && iv[i].first <= nw.second) {
        nw.first = min(nw.first, iv[i].first);
        nw.second = max(nw.second, iv[i].second);
        i++;
    }
    out.push_back(nw);
    while (i < iv.size()) out.push_back(iv[i++]);
    return out;
}
```

## dsa.intervals.interval-scheduling
name: "Interval scheduling"
importance: must
pattern: true
scope: "non-overlapping intervals, minimum arrows, sorting by end"

### simple
Interval scheduling picks the largest number of events that don't clash, like fitting the most talks into one room. The winning strategy is to always pick the talk that finishes earliest, because it leaves the most time for everything after it. Sorting by end time turns this into one simple pass.

### interview
- **Maximum set of non-overlapping intervals**: sort by **end**; keep an interval if its start ≥ the end of the last kept one. **O(n log n)**.
- **Minimum removals** to make intervals non-overlapping = n − (maximum kept).
- **Minimum arrows** to burst balloons (points hitting intervals): sort by end, shoot at the first end, skip every balloon whose start ≤ that point; each new arrow is at the next unburst balloon's end. Same greedy (touching counts as hit).
- Sorting by **start** is the classic mistake: a long early interval can block many short ones.
- Proof: exchange argument. The earliest-ending interval can replace the first interval of any optimal solution without creating overlaps.
- Weighted version (each interval has a value) needs DP with binary search, not greedy.

### deep
#### Intuition

You want to leave as much room as possible for future intervals. Whatever you choose first, the room left afterwards starts at its end time. So among all intervals you could choose first, the one that ends earliest is never worse. Repeating the argument gives the greedy: sort by end, take whatever fits.

#### Worked example: minimum removals

`[1,2] [2,3] [3,4] [1,3]` → sorted by end: `[1,2] [2,3] [1,3] [3,4]`.

| interval | last kept end | start ≥ last end? | kept |
|---|---|---|---|
| [1,2] | −∞ | yes | [1,2] |
| [2,3] | 2 | 2 ≥ 2: yes | [2,3] |
| [1,3] | 3 | 1 < 3: no | removed |
| [3,4] | 3 | yes | [3,4] |

Kept 3, so removals = 4 − 3 = **1**.

#### Code

```cpp
int eraseOverlapIntervals(vector<vector<int>> iv) {
    sort(iv.begin(), iv.end(), [](const vector<int>& a, const vector<int>& b) {
        return a[1] < b[1];                           // by end time
    });
    int kept = 0;
    long long lastEnd = LLONG_MIN;
    for (auto& x : iv) {
        if (x[0] >= lastEnd) { kept++; lastEnd = x[1]; }   // touching is allowed
    }
    return (int)iv.size() - kept;
}

int minArrows(vector<vector<int>> balloons) {
    if (balloons.empty()) return 0;
    sort(balloons.begin(), balloons.end(), [](const vector<int>& a, const vector<int>& b) {
        return a[1] < b[1];
    });
    int arrows = 1;
    long long shot = balloons[0][1];                  // shoot at the first end
    for (auto& b : balloons)
        if (b[0] > shot) { arrows++; shot = b[1]; }   // not hit: needs a new arrow
    return arrows;
}
```

#### Why sorting by end is correct (exchange argument)

Let $g$ be the interval with the earliest end, and let $O$ be any optimal selection, with $o_1$ its earliest-ending interval. Replace $o_1$ by $g$: since $g$ ends no later than $o_1$, it overlaps nothing that $o_1$ didn't, so the new selection is still valid and has the same size. Hence some optimal solution starts with $g$; remove everything overlapping $g$ and repeat on the rest.

#### Complexity

$O(n \log n)$ for the sort, $O(n)$ for the pass, $O(1)$ extra beyond sorting.

#### Edge cases and bugs

- Sorting by start: `[1,100] [2,3] [4,5]` would keep only the first.
- Touching rules differ: meetings `[1,2]` and `[2,3]` don't conflict; balloons `[1,2]` and `[2,3]` are both hit by an arrow at 2. Hence `>=` in one problem and `>` in the other.
- Overflow when comparing with sentinel values: use a wide type or a flag for "nothing kept yet".

#### Variants

- Activity selection (the textbook name), maximum number of events you can attend (with a heap by end day).
- Weighted interval scheduling: sort by end, DP with binary search for the last compatible interval.
- Interval partitioning (minimum rooms): a different greedy, sorted by start with a heap of end times.

Connects to: exchange argument, greedy fundamentals, scheduling with heaps, DP with binary search.

### questions
Q: How do you select the maximum number of non-overlapping intervals?
A: Sort by end time and scan, keeping an interval whenever it starts at or after the end of the last kept interval. Choosing the interval that ends earliest always leaves the most room for the rest. O(n log n).

Q: Why not sort by start time or by length?
A: By start, a long interval that starts early can block many short ones. By length, a short interval in the middle can conflict with two intervals that would both fit otherwise. Only the earliest end time has the exchange-argument guarantee.

Q: How is "minimum number of intervals to remove" related?
A: The fewest removals equals the total minus the maximum number of intervals you can keep without overlap, so it is the same greedy.

Q: How do you find the minimum number of arrows to burst all balloons?
A: Sort balloons by end. Shoot the first arrow at the first balloon's end, which bursts every balloon starting at or before that point. When a balloon starts after the last arrow, shoot a new arrow at its end. The count of arrows is minimal by the same exchange argument.

Q: When does interval scheduling need DP instead of greedy?
A: When intervals have weights (values) and you maximize total weight. Then the earliest-ending interval might be worth little, so you sort by end and use dp[i] = max(dp[i − 1], w[i] + dp[last compatible interval]), finding that interval by binary search.

### signals
- the maximum number of non-overlapping meetings, talks or tasks
- the minimum number of intervals to remove so the rest don't overlap
- the minimum number of points that hit (stab) every interval
- choose events greedily to leave the most time afterwards

### template
```cpp
// Greedy by earliest end: count intervals kept without overlap.
int maxCompatible(vector<pair<int, int>> iv) {          // {start, end}
    sort(iv.begin(), iv.end(), [](auto& a, auto& b) { return a.second < b.second; });
    int kept = 0;
    long long lastEnd = LLONG_MIN;
    for (auto [s, e] : iv) {
        if (s >= lastEnd) {                              // fits after the last kept one
            kept++;
            lastEnd = e;                                 // (for stabbing points use s > lastEnd)
        }
    }
    return kept;                                         // removals = n - kept
}
```

## dsa.intervals.sweep-line
name: "Sweep line"
importance: important
pattern: true
scope: "counting overlaps with start and end events"

### simple
A sweep line turns intervals into events, "something starts here" and "something ends here", and processes them in time order. Imagine walking along a timeline with a counter: add one when a meeting starts and subtract one when it ends. The highest the counter ever reaches is the most meetings happening at once.

### interview
- Create events `(time, +1)` for starts and `(time, −1)` for ends; sort by time; sweep with a running count. **O(n log n)**.
- **Tie-breaking** decides touching intervals: process ends before starts at the same time if `[1,2]` and `[2,3]` shouldn't overlap (sort `-1` before `+1`).
- Answers: maximum overlap (meeting rooms), total covered length, points covered by at least k intervals, the skyline (with a max-heap of active heights).
- With small integer coordinates, a **difference array** does the same in O(n + range).
- Alternative for meeting rooms: two sorted arrays of starts and ends with two pointers.

### deep
#### Intuition

The number of intervals covering a point only changes at start and end points. Sorting those events and walking through them in order lets you see every change once. Between consecutive events the count is constant, which also gives lengths of covered regions.

#### Worked example: meetings `[0,30] [5,10] [15,20]`

Events sorted (ends before starts at equal times): `(0,+1) (5,+1) (10,−1) (15,+1) (20,−1) (30,−1)`.

| event | count after | max |
|---|---|---|
| 0 start | 1 | 1 |
| 5 start | 2 | 2 |
| 10 end | 1 | 2 |
| 15 start | 2 | 2 |
| 20 end | 1 | 2 |
| 30 end | 0 | 2 |

Two rooms are needed.

#### Code

```cpp
int maxOverlap(const vector<pair<int, int>>& iv) {         // half-open [start, end)
    vector<pair<int, int>> events;
    for (auto [s, e] : iv) { events.push_back({s, +1}); events.push_back({e, -1}); }
    sort(events.begin(), events.end());                    // at equal times, -1 sorts first
    int cur = 0, best = 0;
    for (auto [t, d] : events) best = max(best, cur += d);
    return best;
}

// Total length covered by at least one interval.
long long coveredLength(const vector<pair<long long, long long>>& iv) {
    vector<pair<long long, int>> events;
    for (auto [s, e] : iv) { events.push_back({s, +1}); events.push_back({e, -1}); }
    sort(events.begin(), events.end());
    long long total = 0, prev = 0;
    int active = 0;
    for (auto [t, d] : events) {
        if (active > 0) total += t - prev;                 // the region since the last event
        active += d;
        prev = t;
    }
    return total;
}
```

#### Complexity

$O(n \log n)$ for sorting $2n$ events; the sweep is $O(n)$. The skyline adds heap operations: $O(n \log n)$.

#### Edge cases and bugs

- Tie order: with closed intervals where touching counts as overlap, starts must come before ends at equal times.
- Using the count before versus after applying the event when recording answers.
- Coordinates up to $10^9$: use sorting, not arrays.

#### Variants

- Meeting rooms II, car pooling, my calendar III (max overlap after each booking with an ordered map of deltas).
- Rectangle area union: sweep x with a segment tree over y.
- Count points covered by intervals, or the number of intervals covering each query point (sort queries too).

Connects to: difference arrays, scheduling with heaps, calendar booking designs, segment tree.

### questions
Q: How does a sweep line count the maximum number of overlapping intervals?
A: Turn each interval into a +1 event at its start and a −1 event at its end, sort the events by time, and walk through them with a running sum. The largest value the sum reaches is the maximum overlap. Sorting makes it O(n log n).

Q: Why does the tie order of events at the same time matter?
A: It decides whether intervals that touch at a point overlap. Processing ends before starts treats [1, 2] and [2, 3] as non-overlapping, which matches meetings; processing starts first counts them as overlapping.

Q: How do you compute the total length covered by a set of intervals with a sweep?
A: Sort all start and end events. Between consecutive events the number of active intervals is constant, so add the gap length whenever the active count is positive before the event.

Q: When is a difference array better than a sweep line?
A: When coordinates are small integers in a bounded range. Then you can add +1 and −1 into an array and take a prefix sum in O(n + range), with no sorting.

### signals
- the maximum number of intervals active at the same time
- events with start and end times, capacity over time
- total covered length or points covered by at least k intervals
- a skyline or outline built from overlapping shapes

### template
```cpp
// Sweep line: sort +1/-1 events and track the running count.
template <class OnChange>
void sweep(const vector<pair<long long, long long>>& iv, OnChange onChange) {
    vector<pair<long long, int>> ev;
    for (auto [s, e] : iv) { ev.push_back({s, +1}); ev.push_back({e, -1}); }
    sort(ev.begin(), ev.end());                // ties: -1 (end) before +1 (start)
    int active = 0;
    for (auto [t, d] : ev) {
        active += d;
        onChange(t, active);                   // e.g. track the max, or covered length
    }
}
```

## dsa.intervals.interval-list-intersections
name: "Interval list intersections"
importance: important
prereqs: [dsa.intervals.merge-intervals]
scope: "two pointers over sorted lists"

### simple
Given two people's sorted lists of free time, the times when both are free are the intersections. Walk through both lists together with one finger on each, like comparing two calendars page by page. Whichever interval ends first can't overlap anything later in the other list, so you move past it.

### interview
- Two pointers `i`, `j` over the two sorted, disjoint lists.
- Intersection of `A[i]` and `B[j]`: `lo = max(starts)`, `hi = min(ends)`; if `lo <= hi`, record `[lo, hi]`.
- Advance the pointer whose interval **ends first** (it can't intersect anything further in the other list).
- **O(n + m)** time, output size at most n + m.
- Same technique: meeting scheduler (first common slot of at least a given duration), merging two sorted interval lists.

### questions
Q: How do you find all intersections of two sorted lists of disjoint intervals?
A: Use two pointers. For the current pair, the intersection is [max of the starts, min of the ends], recorded if the start is at most the end. Then advance whichever interval ends first. It runs in O(n + m).

Q: Why advance the interval that ends first?
A: The interval that ends earlier can't overlap any later interval in the other list, because those start after the current one there, which already starts before this interval's end. The one ending later might still overlap the next interval, so it stays.

Q: How do you find the earliest time slot of at least d minutes that works for two people?
A: Sort both lists of free slots, then walk them with two pointers, computing each intersection. Return the first intersection whose length is at least d, as [start, start + d], and advance the slot that ends first otherwise.

Q: What is the maximum number of intersection intervals?
A: At most n + m − 1, because each step either records an intersection or not and always advances one of the two pointers, and there are at most n + m steps.

## dsa.intervals.calendar-booking-designs
name: "Calendar booking designs"
importance: advanced
prereqs: [dsa.intervals.sweep-line]
scope: "ordered map and segment tree approaches"

### simple
A booking system must answer, for each new request, whether it clashes with bookings already made. Keeping bookings sorted by start time lets you check only the neighbors of the new one, like looking at the appointments just before and just after a slot in a paper diary. For counting how many bookings overlap, keep a timeline of +1 and −1 changes.

### interview
- **No double booking**: ordered map `start → end`. For `[s, e)`, find the first booking with start ≥ s (it must start at or after e) and the previous booking (it must end at or before s). **O(log n)** per booking.
- **Allow double but not triple booking**: keep a list of single bookings and a list of double-booked overlaps; reject if the new interval hits any overlap. O(n) per booking.
- **Maximum overlap after each booking** (k-booking): ordered map of time → delta (+1 at start, −1 at end); sweep the map: O(n) per booking. A segment tree with lazy propagation over compressed or dynamic coordinates gives O(log C).
- Half-open intervals `[start, end)` make back-to-back bookings legal.

### questions
Q: How do you check a new booking for conflicts in O(log n)?
A: Store bookings in an ordered map keyed by start. Look up the first booking starting at or after the new start: it must start no earlier than the new end. Look at the booking just before it: it must end no later than the new start. If both hold, insert.

Q: How do you report the maximum number of simultaneous bookings after each new booking?
A: Keep an ordered map of time to change: +1 at each start and −1 at each end. After adding a booking, sweep the map in order with a running sum and take the maximum. That's O(n) per booking; a segment tree with range add and range max makes it O(log n).

Q: Why use half-open intervals [start, end) for bookings?
A: So that a booking ending at 10 and one starting at 10 don't conflict, which matches how calendars work. It also makes lengths equal to end − start without off-by-one adjustments.

Q: When would a segment tree be preferable to the ordered map sweep?
A: When there are many bookings and queries, because the sweep costs O(n) each time. A segment tree over the time range (compressed or created dynamically) supports adding 1 to a range and reading the maximum in O(log C).
