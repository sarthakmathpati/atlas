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

### simple
Scheduling criteria are the scores we use to judge how well the CPU is shared among processes. At a busy clinic, you might care how many patients are seen per hour, how long each spends there in total, and how long they wait before the doctor first says hello. Different schedulers win on different scores, so you pick the ones that matter for your system.

### interview
- **CPU utilization**: the share of time the CPU is busy (maximize).
- **Throughput**: processes completed per unit of time (maximize).
- **Turnaround time** = completion time − arrival time: the total time from submission to finish (minimize; batch systems care most).
- **Waiting time** = turnaround time − burst time: time spent in the **ready queue** only (minimize; this is what the scheduler directly controls).
- **Response time** = first time on the CPU − arrival time: how quickly a process gets its first slice (minimize; interactive systems care most).
- Goals conflict: shortest-job-first minimizes average waiting time but can starve long jobs; round robin gives good response time but higher turnaround; fairness and priority pull in different directions. Numericals usually ask for **averages** over all processes.

### deep
#### Intuition

A scheduler decides which ready process gets the CPU next. There is no single best choice, because "best" depends on what users feel: a batch job wants to finish early, a text editor wants to respond instantly, and the machine's owner wants the CPU busy all the time. The criteria give each of these a number.

#### Definitions

For each process with arrival time $A$, CPU burst $B$, first run $F$ and completion $C$:

| metric | formula | who cares |
|---|---|---|
| turnaround time | $C - A$ | batch jobs |
| waiting time | $C - A - B$ | everyone; the scheduler controls it |
| response time | $F - A$ | interactive users |
| throughput | completed processes ÷ elapsed time | system owners |
| CPU utilization | busy time ÷ elapsed time | system owners |

Waiting time excludes time spent running and, in fuller models, time spent blocked on I/O: it counts only time in the ready queue.

#### Worked example

Three processes run first come, first served:

| process | arrival | burst |
|---|---|---|
| P1 | 0 | 5 |
| P2 | 1 | 3 |
| P3 | 2 | 1 |

Gantt chart:

```text
| P1          | P2      | P3 |
0             5         8    9
```

| process | completion | turnaround | waiting | response |
|---|---|---|---|---|
| P1 | 5 | 5 − 0 = 5 | 5 − 5 = 0 | 0 |
| P2 | 8 | 8 − 1 = 7 | 7 − 3 = 4 | 4 |
| P3 | 9 | 9 − 2 = 7 | 7 − 1 = 6 | 6 |
| average | | 6.33 | 3.33 | 3.33 |

Throughput is 3 processes in 9 units, and utilization is 100% because the CPU never idles. For non-preemptive algorithms, response time equals waiting time; with preemption they differ.

#### Code: computing the metrics

```cpp
struct Row { string id; int arrival, burst, firstRun, completion; };

void report(const vector<Row>& rows) {
    double tat = 0, wt = 0, rt = 0;
    for (const auto& r : rows) {
        int t = r.completion - r.arrival, w = t - r.burst, s = r.firstRun - r.arrival;
        printf("%s: turnaround %d, waiting %d, response %d\n", r.id.c_str(), t, w, s);
        tat += t; wt += w; rt += s;
    }
    int n = rows.size();
    printf("average: turnaround %.2f, waiting %.2f, response %.2f\n", tat / n, wt / n, rt / n);
}

int main() {
    report({{"P1", 0, 5, 0, 5}, {"P2", 1, 3, 5, 8}, {"P3", 2, 1, 8, 9}});
    // average: turnaround 6.33, waiting 3.33, response 3.33
}
```

#### Which criteria for which system

| system | primary goals |
|---|---|
| batch processing | throughput, turnaround, utilization |
| interactive desktop or phone | response time, fairness |
| server | throughput and tail latency |
| real-time (control systems) | meeting deadlines, predictability |

#### Pitfalls in numericals

- Using completion time instead of turnaround when arrivals are not all zero.
- Counting a process's own running time as waiting.
- Forgetting idle gaps when no process has arrived yet: the CPU sits idle and utilization drops below 100%.

Connects to: FCFS and SJF, round robin, solving scheduling numericals, process control block and states.

### questions
Q: What is the difference between turnaround time, waiting time and response time?
A: Turnaround time is the total time from arrival to completion. Waiting time is the part of that spent in the ready queue, which is turnaround minus the CPU burst. Response time is the time from arrival until the process first gets the CPU, which matters most for interactive programs.

Q: Which scheduling criteria should be maximized and which minimized?
A: CPU utilization and throughput should be maximized. Turnaround time, waiting time and response time should be minimized. Many systems also care about fairness and, for real-time systems, meeting deadlines.

Q: Why is waiting time a good measure of a scheduling algorithm?
A: A process's burst length and I/O behavior do not depend on the scheduler, but how long it sits in the ready queue does. Waiting time therefore isolates the effect of the scheduling decision itself.

Q: Can an algorithm optimize all criteria at once?
A: No. For example, shortest job first minimizes average waiting time but can starve long jobs and needs burst predictions, while round robin gives good response time but usually increases average turnaround. The right trade-off depends on whether the system is batch, interactive or real-time.

Q: Processes arrive at 0, 1 and 2 with bursts 5, 3 and 1 and run first come, first served. What is the average waiting time?
A: They finish at 5, 8 and 9. Turnaround times are 5, 7 and 7, so waiting times are 0, 4 and 6, and the average waiting time is 10 divided by 3, about 3.33.

## os.scheduling.fcfs-and-sjf
name: "FCFS and SJF"
importance: must
prereqs: [os.scheduling.scheduling-criteria]
scope: "convoy effect, optimality of SJF, SRTF"

### simple
First come, first served runs processes in the order they arrive, like a single queue at a ticket counter. Shortest job first lets the quickest jobs go first, like letting the person buying one stamp go ahead of someone mailing fifty parcels. Serving short jobs first makes the average wait much lower, but long jobs may wait a very long time.

### interview
- **FCFS** (first come, first served): a FIFO ready queue, **non-preemptive**. Simple and fair in arrival order, but average waiting time depends heavily on arrival order.
- **Convoy effect**: one long CPU-bound job at the front makes many short jobs wait behind it, like cars stuck behind a truck; utilization of I/O devices also suffers.
- **SJF** (shortest job first): run the ready process with the smallest next CPU burst. **Provably optimal** for minimizing average waiting time among non-preemptive schedules when all jobs are available together.
- **SRTF** (shortest remaining time first) is preemptive SJF: a newly arrived job with a shorter burst than the running job's **remaining** time preempts it. It minimizes average waiting time among all schedules.
- Problems: the next burst length is unknown, so it is **predicted** by exponential averaging $\tau_{n+1} = \alpha t_n + (1-\alpha)\tau_n$; long jobs can **starve**.
- Classic numbers: bursts 24, 3, 3 arriving together give an average wait of 17 with FCFS (order 24, 3, 3) and 3 with SJF.

### deep
#### Intuition

Every unit of time a job runs, every job behind it waits. Putting a long job first makes all the others wait through it; putting short jobs first means only the long job waits, and only a little. That is the whole argument for SJF.

#### Worked example: the convoy effect

P1 (burst 24), P2 (3) and P3 (3) all arrive at time 0.

```text
FCFS: | P1                                 | P2 | P3 |
      0                                    24   27   30
SJF:  | P2 | P3 | P1                                 |
      0    3    6                                    30
```

| process | FCFS waiting | SJF waiting |
|---|---|---|
| P1 | 0 | 6 |
| P2 | 24 | 0 |
| P3 | 27 | 3 |
| average | 17 | 3 |

#### Why SJF is optimal (exchange argument)

Take any non-preemptive order where a longer job $L$ runs immediately before a shorter job $S$. Swap them: $S$ now waits $L$ less, $L$ waits $S$ more, and everyone else waits the same. Since $S < L$, total waiting time drops by $L - S$. Repeating swaps until jobs are sorted by length can only reduce the total, so the sorted order (SJF) is optimal.

#### SRTF: the preemptive version

| process | arrival | burst |
|---|---|---|
| P1 | 0 | 8 |
| P2 | 1 | 4 |
| P3 | 2 | 9 |
| P4 | 3 | 5 |

```text
SRTF:          | P1 | P2        | P4          | P1              | P3                   |
               0    1           5             10                17                     26
SJF (non-pre): | P1                   | P2      | P4          | P3                   |
               0                      8         12            17                     26
```

At time 1, P2 (4) is shorter than P1's remaining 7, so it preempts. When P2 finishes at 5, P4 (5) beats P1 (7) and P3 (9).

| process | SRTF waiting | SJF waiting |
|---|---|---|
| P1 | 10 − 1 = 9 | 0 |
| P2 | 0 | 8 − 1 = 7 |
| P3 | 17 − 2 = 15 | 17 − 2 = 15 |
| P4 | 5 − 3 = 2 | 12 − 3 = 9 |
| average | 6.5 | 7.75 |

#### Predicting burst lengths

The OS cannot know the next burst, so it predicts from history with an exponential average:

$$\tau_{n+1} = \alpha \, t_n + (1 - \alpha)\, \tau_n$$

With $\alpha = 0.5$, initial guess $\tau_0 = 10$ and actual bursts 6, 4, 6, 4, 13:

| n | actual $t_n$ | prediction $\tau_n$ |
|---|---|---|
| 0 | 6 | 10 |
| 1 | 4 | 8 |
| 2 | 6 | 6 |
| 3 | 4 | 6 |
| 4 | 13 | 5 |
| 5 | | 9 |

A larger $\alpha$ reacts faster to recent behavior; $\alpha = 0$ ignores history entirely.

#### Code: picking the next job

```python
import heapq


def sjf(procs):
    """procs: list of (id, arrival, burst). Non-preemptive SJF; returns (id, start, end) slices."""
    procs = sorted(procs, key=lambda p: p[1])
    t, i, ready, out = 0, 0, [], []
    while i < len(procs) or ready:
        while i < len(procs) and procs[i][1] <= t:
            pid, arr, burst = procs[i]
            heapq.heappush(ready, (burst, arr, pid))   # shortest burst first, then earliest arrival
            i += 1
        if not ready:
            t = procs[i][1]                             # idle until the next arrival
            continue
        burst, _, pid = heapq.heappop(ready)
        out.append((pid, t, t + burst))
        t += burst
    return out


print(sjf([("P1", 0, 8), ("P2", 1, 4), ("P3", 2, 9), ("P4", 3, 5)]))
# [('P1', 0, 8), ('P2', 8, 12), ('P4', 12, 17), ('P3', 17, 26)]
```

#### Pitfalls

- SJF needs burst lengths; in exams they are given, in real systems they are predicted.
- Long jobs can starve under a steady stream of short ones; aging fixes it.
- FCFS is still used where fairness in arrival order matters (batch queues) and as the tie-breaker in other algorithms.

Connects to: scheduling criteria, priority scheduling, round robin, solving scheduling numericals, heaps.

### questions
Q: What is the convoy effect?
A: Under first come, first served, a long CPU-bound process at the front of the queue makes many short processes wait behind it, like cars stuck behind a slow truck. Average waiting time rises sharply and I/O devices sit idle while the short, I/O-bound jobs wait for the CPU.

Q: Why is shortest job first optimal for average waiting time?
A: Swapping any longer job that runs just before a shorter one reduces the shorter job's wait by more than it increases the longer job's wait, so total waiting time falls. Repeating such swaps sorts jobs by length, so the shortest-first order has the minimum average waiting time.

Q: What is SRTF, and how does it differ from SJF?
A: Shortest remaining time first is the preemptive version of SJF. When a new process arrives with a burst shorter than the remaining time of the running process, it preempts it. Plain SJF lets the running process finish its burst before choosing again.

Q: How does an OS estimate the next CPU burst for SJF?
A: With exponential averaging of past bursts: the next prediction equals alpha times the last actual burst plus one minus alpha times the previous prediction. Alpha between 0 and 1 controls how much weight recent behavior gets.

Q: What is the main drawback of SJF besides needing burst lengths?
A: Starvation: a long process may wait indefinitely if shorter processes keep arriving. Aging, which gradually raises the priority of waiting processes, is the usual fix.

## os.scheduling.priority-scheduling
name: "Priority scheduling"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "starvation and aging"

### simple
Priority scheduling gives the CPU to the most important process first. A hospital emergency room works this way: a heart attack is seen before a sprained ankle, whatever the arrival order. The risk is that low-priority patients could wait forever, so the waiting room gradually moves long-waiting people up the list.

### interview
- Each process has a **priority number**; the scheduler runs the highest-priority ready process. Convention varies: in many textbooks (and Linux nice values) a **smaller number means higher priority**; always state your convention.
- **Non-preemptive**: a newly arrived higher-priority process waits until the current one finishes its burst. **Preemptive**: it takes the CPU immediately.
- SJF is priority scheduling with priority = predicted burst length.
- **Starvation** (indefinite blocking): low-priority processes may never run if higher-priority work keeps arriving.
- **Aging** fixes starvation by gradually raising the priority of processes that have waited a long time (for example, one level every few seconds).
- Priorities can be **internal** (measured: memory needs, I/O-to-CPU ratio) or **external** (importance, payment, user). Related hazard with locks: **priority inversion**.

### deep
#### Worked example: non-preemptive, all arriving at 0

Lower number = higher priority.

| process | burst | priority |
|---|---|---|
| P1 | 10 | 3 |
| P2 | 1 | 1 |
| P3 | 2 | 4 |
| P4 | 1 | 5 |
| P5 | 5 | 2 |

```text
| P2 | P5          | P1                      | P3   | P4 |
0    1             6                         16     18   19
```

| process | waiting time |
|---|---|
| P1 | 6 |
| P2 | 0 |
| P3 | 16 |
| P4 | 18 |
| P5 | 1 |
| average | 41 / 5 = 8.2 |

#### Worked example: preemptive vs non-preemptive with arrivals

| process | arrival | burst | priority |
|---|---|---|---|
| P1 | 0 | 4 | 2 |
| P2 | 1 | 3 | 1 |
| P3 | 2 | 2 | 3 |

```text
non-preemptive: | P1          | P2       | P3    |
                0             4          7       9
preemptive:     | P1 | P2       | P1       | P3    |
                0    1          4          7       9
```

| process | non-preemptive waiting | preemptive waiting |
|---|---|---|
| P1 | 0 | 7 − 0 − 4 = 3 |
| P2 | 4 − 1 = 3 | 0 |
| P3 | 7 − 2 = 5 | 5 |
| average | 2.67 | 2.67 |

The averages happen to match here, but the preemptive version serves the important P2 immediately (response time 0 instead of 3).

#### Aging

Suppose priorities range from 0 (highest) to 127 and a process's priority improves by 1 for every 15 minutes it waits. Even a process at 127 reaches 0 within about 32 hours and must then run. Real systems age much faster; the idea is that waiting itself earns priority.

#### Code: preemptive priority with aging

```cpp
struct Task { string id; int arrival, burst, priority; };

// Each time unit: age everyone who is waiting, then run the best ready task for one unit.
vector<string> schedule(vector<Task> ts, int agingEvery) {
    vector<string> timeline;
    vector<int> waited(ts.size(), 0);
    for (int t = 0;; ++t) {
        int best = -1;
        bool left = false;
        for (int i = 0; i < (int)ts.size(); ++i) {
            if (ts[i].burst == 0) continue;
            left = true;
            if (ts[i].arrival > t) continue;
            if (best == -1 || ts[i].priority < ts[best].priority) best = i;
        }
        if (!left) break;
        timeline.push_back(best == -1 ? "idle" : ts[best].id);
        for (int i = 0; i < (int)ts.size(); ++i) {
            if (i == best || ts[i].burst == 0 || ts[i].arrival > t) continue;
            if (++waited[i] % agingEvery == 0 && ts[i].priority > 0) --ts[i].priority;   // aging
        }
        if (best != -1) --ts[best].burst;
    }
    return timeline;
}

int main() {
    // A stream of high-priority work (priority 1) and one low-priority task (priority 9).
    vector<Task> ts = {{"low", 0, 2, 9}, {"hi1", 0, 4, 1}, {"hi2", 4, 4, 1}, {"hi3", 8, 4, 1}};
    for (int every : {2, 1}) {
        cout << "aging every " << every << ": ";
        for (auto& s : schedule(ts, every)) cout << s << " ";
        cout << "\n";
    }
}
```

```text
aging every 2: hi1 hi1 hi1 hi1 hi2 hi2 hi2 hi2 hi3 hi3 hi3 hi3 low low
aging every 1: hi1 hi1 hi1 hi1 hi2 hi2 hi2 hi2 low hi3 low hi3 hi3 hi3
```

Aging every 2 units, `low` climbs only from 9 to 3 while the stream lasts, so it runs last. Aging every unit, it reaches priority 1 by time 8, ties with `hi3` (ties go to the earlier task) and gets the CPU in the middle of the stream. Tuning the rate trades fairness against honoring priorities.

#### Pitfalls

- Mixing up "higher number = higher priority" conventions in numericals.
- Forgetting ties: break them by arrival time (FCFS) unless told otherwise.
- Ignoring priority inversion when high-priority tasks share locks with low-priority ones.

Connects to: FCFS and SJF, round robin, multilevel queue and feedback queue scheduling, priority inversion, binary heap.

### questions
Q: How does priority scheduling work?
A: Each process has a priority, and the scheduler always runs the ready process with the highest priority. In the preemptive version a newly arrived higher-priority process takes the CPU at once; in the non-preemptive version it waits until the running process finishes its burst.

Q: What is starvation in priority scheduling, and how does aging solve it?
A: Starvation happens when low-priority processes never run because higher-priority work keeps arriving. Aging gradually increases the priority of processes the longer they wait, so every process eventually reaches a priority high enough to be scheduled.

Q: How is SJF related to priority scheduling?
A: SJF is a special case where the priority is the predicted length of the next CPU burst, with shorter bursts meaning higher priority. It inherits the same starvation problem for long jobs.

Q: What is the difference between internal and external priorities?
A: Internal priorities are computed by the OS from measurable properties such as memory needs, time limits or the ratio of I/O to CPU bursts. External priorities are set from outside the OS, based on importance, the user or the price paid.

## os.scheduling.round-robin
name: "Round robin"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "time quantum trade-offs"

### simple
Round robin gives each process a short, equal turn on the CPU and then moves it to the back of the line. Kids sharing one video game controller might each get five minutes before passing it on, so nobody waits too long to play. How long each turn lasts changes everything: very long turns feel unfair, very short ones waste time passing the controller.

### interview
- The ready queue is **FIFO**; each process runs for at most one **time quantum** (time slice) $q$, then is **preempted** by the timer and placed at the tail. A process that finishes or blocks earlier gives up the CPU immediately.
- With $n$ ready processes, each waits at most $(n - 1) q$ before its next turn, so **response time is bounded**; it is designed for **time-sharing** and interactive systems.
- **Large $q$**: few context switches, but behavior approaches **FCFS** and response time suffers. **Small $q$**: great responsiveness, but **context-switch overhead** dominates. Rule of thumb: $q$ larger than most CPU bursts (about 80%) and much larger than a context switch; typical values are 10 to 100 ms.
- Average turnaround is usually worse than SJF, and it does not necessarily improve as $q$ grows.
- Numerical convention: when a new process arrives at the same moment a quantum expires, the **new arrival is queued before** the preempted process (state your convention if unsure).
- Classic numbers: bursts 24, 3, 3 at time 0 with $q = 4$ give an average waiting time of 17/3 ≈ 5.67.

### deep
#### Intuition

Round robin is FCFS with a timer. Nobody hogs the CPU, and a short interactive task never waits behind a long computation for more than a few slices. The price is paid in context switches and in longer total times for long jobs.

#### Worked example: $q = 4$

P1 (24), P2 (3), P3 (3) all arrive at 0.

```text
| P1  | P2 | P3 | P1  | P1  | P1  | P1  | P1  |
0     4    7    10    14    18    22    26    30
```

| process | completion | waiting | response |
|---|---|---|---|
| P1 | 30 | 30 − 24 = 6 | 0 |
| P2 | 7 | 7 − 3 = 4 | 4 |
| P3 | 10 | 10 − 3 = 7 | 7 |
| average | | 5.67 | 3.67 |

Compare FCFS in the same order: average waiting 17, P3's response 27.

#### Choosing the quantum

If a context switch costs $s$ and the quantum is $q$, at most $\frac{q}{q + s}$ of the CPU does useful work when every slice is used fully:

| $q$ | $s$ | useful share |
|---|---|---|
| 100 ms | 0.01 ms | 99.99% |
| 10 ms | 0.01 ms | 99.9% |
| 1 ms | 0.01 ms | 99% |
| 0.1 ms | 0.01 ms | 91% |

The direct cost looks small until the quantum shrinks toward the switch cost; cache and TLB effects make short quanta worse still. If $q$ is longer than every burst, round robin becomes FCFS.

#### Code

```cpp
struct Job { string id; int arrival, burst; };

vector<pair<string, int>> roundRobin(vector<Job> jobs, int q) {    // returns (id, completion)
    sort(jobs.begin(), jobs.end(), [](auto& a, auto& b) { return a.arrival < b.arrival; });
    deque<int> ready;
    vector<int> rem;
    for (auto& j : jobs) rem.push_back(j.burst);
    vector<pair<string, int>> done;
    int t = 0;
    size_t next = 0;
    auto admit = [&] {
        while (next < jobs.size() && jobs[next].arrival <= t) ready.push_back(next++);
    };
    admit();
    while (done.size() < jobs.size()) {
        if (ready.empty()) { t = jobs[next].arrival; admit(); continue; }   // CPU idle
        int i = ready.front(); ready.pop_front();
        int run = min(q, rem[i]);
        t += run;
        rem[i] -= run;
        admit();  // arrivals up to now join before the preempted job
        if (rem[i] == 0) done.push_back({jobs[i].id, t});
        else ready.push_back(i);
    }
    return done;
}

int main() {
    for (auto& [id, c] : roundRobin({{"P1", 0, 24}, {"P2", 0, 3}, {"P3", 0, 3}}, 4))
        cout << id << " finishes at " << c << "\n";   // P2 at 7, P3 at 10, P1 at 30
}
```

#### Pitfalls in numericals

- Placing the preempted process before a process that arrived at the same instant (use the stated convention).
- Letting a process keep the CPU for a full quantum after it has finished its burst.
- Forgetting that a lone process simply keeps running slice after slice (its "switches" cost nothing in exam answers unless given).

Connects to: FCFS and SJF, context switching, multilevel queue and feedback queue scheduling, queue and deque basics, solving scheduling numericals.

### questions
Q: How does round robin scheduling work?
A: Ready processes wait in a FIFO queue. The scheduler gives the process at the head the CPU for at most one time quantum; if it has not finished, the timer preempts it and it goes to the tail of the queue. A process that finishes or blocks earlier gives up the CPU immediately.

Q: What happens if the time quantum is too large or too small?
A: With a very large quantum, processes rarely get preempted and round robin behaves like first come, first served, so response time suffers. With a very small quantum, the CPU spends a large share of its time on context switches, and cache effects make it worse.

Q: How do you choose a good time quantum?
A: Make it much longer than a context switch, so overhead stays small, and longer than most typical CPU bursts, a common rule of thumb is about 80 percent of them, so most interactive bursts finish within one slice. Typical systems use roughly 10 to 100 milliseconds.

Q: Why is round robin good for interactive systems?
A: With n ready processes and quantum q, every process gets the CPU again within about (n minus 1) times q, so response time is bounded and no process can monopolize the CPU. Interactive tasks with short bursts get quick service.

Q: With bursts 24, 3 and 3 all arriving at 0 and a quantum of 4, what is the average waiting time under round robin?
A: The schedule is P1 0 to 4, P2 4 to 7, P3 7 to 10, then P1 runs to 30. Waiting times are 6, 4 and 7, so the average is 17 divided by 3, about 5.67.

## os.scheduling.multilevel-queue-and-feedback-queue-scheduling
name: "Multilevel queue and feedback queue scheduling"
importance: important
prereqs: [os.scheduling.round-robin]
scope: "Multilevel queue and feedback queue scheduling"

### simple
A multilevel queue splits processes into separate lines by type, each with its own rules, like an airport with separate lines for crew, business class and economy. A multilevel feedback queue also moves people between lines based on how they behave: someone who takes forever at the counter gets moved to a slower line. This lets quick, interactive tasks stay fast without knowing their needs in advance.

### interview
- **Multilevel queue (MLQ)**: the ready queue is split into several queues by process type (system, interactive, batch); each queue has its own algorithm (for example RR for interactive, FCFS for batch). Processes are **permanently** assigned to one queue.
- Between queues: **fixed priority** (a lower queue runs only when all higher ones are empty, which can starve it) or **time slicing** (for example 80% of CPU to foreground, 20% to background).
- **Multilevel feedback queue (MLFQ)**: processes **move between queues** based on observed behavior. New processes start at the top; using up a whole quantum **demotes** a process; interactive processes that block early stay high.
- Typical setup: Q0 RR with q = 8 ms, Q1 RR with q = 16 ms, Q2 FCFS; lower queues run only when higher ones are empty.
- Refinements: **periodic priority boost** (move everyone to the top) to prevent starvation and adapt to phase changes; count **total CPU used at a level** rather than per slice so a process cannot game the scheduler by yielding just before the quantum ends.
- MLFQ approximates SRTF without knowing burst lengths; variants run in Windows, macOS and older Unix schedulers.

### deep
#### MLQ

```text
highest  [ system processes     ]  RR, small quantum
         [ interactive          ]  RR
         [ interactive editing  ]  RR
lowest   [ batch                ]  FCFS
```

Each process is placed in one queue at creation. With fixed priority between queues, a batch job runs only when all three queues above are empty, which is simple but can starve it; time slicing between queues avoids that.

#### MLFQ rules (as usually stated)

1. If A has higher priority than B, A runs.
2. If they have equal priority, they share the CPU round robin.
3. A new job enters the highest-priority queue.
4. Once a job uses up its time allotment at a level (in total, however many times it gave up the CPU), it moves down one level.
5. After some period S, move every job to the top queue (priority boost).

#### Worked example

Queues: Q0 (q = 8), Q1 (q = 16), Q2 (FCFS). Job A is CPU-bound and needs 30 ms. Job B is interactive and arrives at 10 ms: it computes 2 ms, then waits for input, repeatedly.

| time (ms) | runs | why | A's queue | B's queue |
|---|---|---|---|---|
| 0 to 8 | A | only job; uses its whole 8 ms | Q0 → Q1 | - |
| 8 to 10 | A | Q0 empty; A runs in Q1 | Q1 | - |
| 10 to 12 | B | B arrives in Q0 and preempts A | Q1 | Q0 |
| 12 | - | B blocks for input before using 8 ms | Q1 | Q0 (stays) |
| 12 to 26 | A | continues its Q1 quantum (16 ms in total) | Q1 → Q2 | waiting |
| … | B | whenever B wakes, it preempts A at once | Q2 | Q0 |

B keeps getting the CPU within moments of waking, while A settles into the bottom queue and soaks up the leftover time. The scheduler learned which job is interactive without being told. (Whether A's remaining 6 ms of Q1 allotment resumes after preemption, or restarts, depends on the implementation; rule 4 counts the total.)

#### Gaming and starvation

- Without rule 4's total accounting, a job could run 7.9 ms, yield briefly, and stay in Q0 forever while monopolizing the CPU.
- Without rule 5, a steady stream of interactive jobs could starve A in Q2 forever, and a job whose behavior changes (from computing to interactive) would be stuck low.

#### Code: a small MLFQ

```python
from collections import deque


def mlfq(jobs, quanta):
    """jobs: {name: burst}, all arriving at 0 and never blocking; quanta per level."""
    queues = [deque() for _ in quanta]
    for name in jobs:
        queues[0].append(name)
    rem, t, log = dict(jobs), 0, []
    while any(queues):
        level = next(i for i, q in enumerate(queues) if q)
        name = queues[level].popleft()
        run = min(quanta[level], rem[name])
        log.append((name, level, t, t + run))
        t += run
        rem[name] -= run
        if rem[name]:
            queues[min(level + 1, len(quanta) - 1)].append(name)   # used a full slice: demote
    return log


for entry in mlfq({"A": 30, "B": 6}, [8, 16, 1000]):
    print(entry)
# ('A', 0, 0, 8), ('B', 0, 8, 14), ('A', 1, 14, 30), ('A', 2, 30, 36)
```

Connects to: round robin, priority scheduling, FCFS and SJF, Linux CFS.

### questions
Q: What is the difference between a multilevel queue and a multilevel feedback queue?
A: In a multilevel queue, each process is permanently assigned to one queue based on its type, and each queue has its own scheduling algorithm. In a multilevel feedback queue, processes move between queues based on their behavior, typically moving down when they use their whole time quantum.

Q: How does an MLFQ favor interactive processes?
A: New processes start in the highest-priority queue with a short quantum. Interactive processes block for input before their quantum ends, so they stay in high-priority queues and get the CPU quickly, while CPU-bound processes use full quanta and sink to lower queues.

Q: How can an MLFQ prevent starvation and gaming?
A: A periodic priority boost moves all processes back to the top queue, so long-running jobs eventually run and jobs that change behavior are re-evaluated. Charging a process for its total CPU time at a level, rather than per slice, stops it from staying high by yielding just before its quantum expires.

Q: How are the queues scheduled relative to each other in a multilevel queue?
A: Either with fixed priority, where a lower queue runs only when all higher queues are empty, which can starve lower queues, or with time slicing, where each queue gets a fixed share of CPU time, such as 80 percent for foreground and 20 percent for background.

## os.scheduling.solving-scheduling-numericals
name: "Solving scheduling numericals"
importance: must
prereqs: [os.scheduling.fcfs-and-sjf]
scope: "Gantt charts, average waiting and turnaround time"

### simple
Scheduling numericals ask you to play the scheduler by hand: given arrival times and burst lengths, draw who runs when and compute the averages. It is like filling in a timetable for a single meeting room, one booking at a time, following the room's rules. A careful, step-by-step table makes these problems mechanical and quick.

### interview
- Method: (1) list processes with arrival and burst (and priority); (2) walk through time, at each **decision point** (start, arrival, completion, quantum expiry) pick the next process by the algorithm's rule; (3) draw the **Gantt chart**; (4) read off completion times; (5) compute turnaround $= C - A$, waiting $= TAT - B$, response $= first\ run - A$; (6) average.
- Decision points: non-preemptive algorithms decide only when the CPU becomes free; preemptive ones also decide at **every arrival**; round robin also at every **quantum expiry**.
- **Tie-breaking**: equal bursts or priorities go by arrival time, then process id, unless the question says otherwise. For round robin, a process arriving exactly when a quantum ends usually joins the queue **before** the preempted process.
- **Idle time**: if nothing has arrived, the CPU idles; show it in the Gantt chart and do not count it as waiting.
- Sanity checks: the sum of bursts plus idle time equals the final completion time; every waiting time is at least 0; for non-preemptive schedules response time equals waiting time.
- Quick facts: SRTF gives the minimum average waiting time; FCFS is sensitive to order; RR has the best response time for small quanta.

### deep
#### The example

| process | arrival | burst |
|---|---|---|
| P1 | 0 | 5 |
| P2 | 1 | 3 |
| P3 | 2 | 1 |
| P4 | 4 | 2 |

#### FCFS

```text
| P1             | P2       | P3 | P4    |
0                5          8    9       11
```

#### SJF (non-preemptive)

At 5, P2 (3), P3 (1) and P4 (2) are waiting: pick P3, then P4, then P2.

```text
| P1             | P3 | P4    | P2       |
0                5    6       8          11
```

#### SRTF (preemptive)

```text
| P1 | P2 | P3 | P2    | P4    | P1          |
0    1    2    3       5       7             11
```

At 1, P2 (3) beats P1's remaining 4. At 2, P3 (1) beats P2's remaining 2. At 4, P4 (2) arrives but P2's remaining 1 is shorter, so P2 finishes at 5.

#### Round robin, $q = 2$

```text
| P1    | P2    | P3 | P1    | P4    | P2 | P1 |
0       2       4    5       7       9    10   11
```

Queue trace: at 2 the queue is P2, P3 (arrived during P1's slice), then P1. At 4, P4 arrives and joins before P2 is re-queued.

#### Results

| | P1 WT | P2 WT | P3 WT | P4 WT | avg WT | avg TAT | avg RT |
|---|---|---|---|---|---|---|---|
| FCFS | 0 | 4 | 6 | 5 | 3.75 | 6.50 | 3.75 |
| SJF | 0 | 7 | 3 | 2 | 3.00 | 5.75 | 3.00 |
| SRTF | 6 | 1 | 0 | 1 | 2.00 | 4.75 | 0.25 |
| RR (q = 2) | 6 | 6 | 2 | 3 | 4.25 | 7.00 | 1.50 |

SRTF wins on waiting time, as theory predicts; RR has a good response time but the worst turnaround here.

#### Code: a unit-step simulator

```cpp
struct P { string id; int arrival, burst; };

// FCFS when !shortest; SJF when shortest && !preemptive; SRTF when both.
vector<int> simulate(const vector<P>& ps, bool shortest, bool preemptive, string& gantt) {
    int n = ps.size(), t = 0, done = 0, cur = -1;
    vector<int> rem(n), finish(n);
    for (int i = 0; i < n; ++i) rem[i] = ps[i].burst;
    while (done < n) {
        if (cur == -1 || preemptive) {
            int best = -1;
            for (int i = 0; i < n; ++i) {
                if (ps[i].arrival > t || rem[i] == 0) continue;
                auto key = [&](int j) {
                    return shortest ? pair{rem[j], ps[j].arrival} : pair{ps[j].arrival, j};
                };
                if (best == -1 || key(i) < key(best)) best = i;
            }
            cur = best;
        }
        gantt += cur == -1 ? "." : ps[cur].id.substr(1);   // one character per time unit
        ++t;
        if (cur != -1 && --rem[cur] == 0) { finish[cur] = t; ++done; cur = -1; }
    }
    return finish;
}

int main() {
    vector<P> ps = {{"P1", 0, 5}, {"P2", 1, 3}, {"P3", 2, 1}, {"P4", 4, 2}};
    auto runs = {tuple{"FCFS", false, false}, {"SJF", true, false}, {"SRTF", true, true}};
    for (auto [name, sh, pre] : runs) {
        string g;
        auto fin = simulate(ps, sh, pre, g);
        double wt = 0;
        for (int i = 0; i < 4; ++i) wt += fin[i] - ps[i].arrival - ps[i].burst;
        printf("%-4s %s  avg waiting %.2f\n", name, g.c_str(), wt / 4);
    }
    // FCFS 11111222344  avg waiting 3.75
    // SJF  11111344222  avg waiting 3.00
    // SRTF 12322441111  avg waiting 2.00
}
```

#### Checklist before you answer

- Did the Gantt chart's total length equal the sum of bursts plus idle time?
- Did every preemptive decision consider remaining time, not the original burst?
- Did you subtract arrival times for turnaround?

Connects to: scheduling criteria, FCFS and SJF, round robin, priority scheduling.

### questions
Q: How do you calculate turnaround time and waiting time from a Gantt chart?
A: Read each process's completion time from the chart. Turnaround time is completion minus arrival, and waiting time is turnaround minus the CPU burst. Average each over all processes.

Q: When does a preemptive scheduler make a decision that a non-preemptive one does not?
A: At every process arrival. A preemptive scheduler compares the new process against the running one, using remaining time for SRTF or priority for preemptive priority scheduling, and may switch immediately. A non-preemptive scheduler decides only when the running process finishes or blocks.

Q: Processes arrive at 0, 1, 2 and 4 with bursts 5, 3, 1 and 2. What is the average waiting time under SRTF?
A: The schedule is P1 0 to 1, P2 1 to 2, P3 2 to 3, P2 3 to 5, P4 5 to 7 and P1 7 to 11. Waiting times are 6, 1, 0 and 1, so the average is 8 divided by 4, which is 2.

Q: In round robin, what if a new process arrives exactly when a quantum expires?
A: The usual convention is that the newly arrived process joins the ready queue before the preempted process is put back at the tail. Since conventions differ, state the one you use in an exam or interview.

Q: What quick checks catch mistakes in scheduling numericals?
A: The final completion time should equal the sum of all bursts plus any idle time, no waiting time can be negative, and for non-preemptive algorithms response time equals waiting time. Also confirm each preemption used remaining rather than original burst times.

## os.scheduling.linux-cfs
name: "Linux CFS"
importance: advanced
prereqs: [os.scheduling.multilevel-queue-and-feedback-queue-scheduling]
scope: "fair scheduling with virtual runtime"

### simple
The Completely Fair Scheduler tried to give every runnable task an equal share of the CPU by always running whoever has had the least time so far. Picture children sharing a swing: whoever has had the fewest minutes gets the next turn. Tasks with a higher priority simply have their minutes counted more slowly, so they end up with a bigger share.

### interview
- CFS was Linux's default scheduler for normal tasks from 2.6.23 (2007); since **Linux 6.6 (2023)** its core policy was replaced by **EEVDF** (earliest eligible virtual deadline first), which keeps the same virtual-runtime idea and adds deadlines for better latency.
- Each task has a **virtual runtime** (`vruntime`): actual CPU time scaled by its weight, $\Delta vruntime = \Delta t \times \frac{1024}{weight}$. CFS always runs the task with the **smallest vruntime**.
- Runnable tasks sit in a **red-black tree** ordered by vruntime: picking the leftmost is O(1) with a cached pointer; insertions and removals are O(log n).
- **Nice values** (−20 to 19) map to weights (nice 0 = 1024; each step is about 1.25×, so roughly 10% more or less CPU per step when competing).
- No fixed quantum: a **target latency** (for example 6 ms) is divided among runnable tasks by weight, with a minimum granularity so slices do not get too tiny.
- Sleeping tasks are placed near the current minimum vruntime when they wake, so they get a prompt turn without banking unlimited credit.

### deep
#### Worked example: two tasks with different nice values

Task A (nice 0, weight 1024) and task B (nice 5, weight 335) are both CPU-bound.

$$\text{share}_A = \frac{1024}{1024 + 335} \approx 75\%, \qquad \text{share}_B \approx 25\%$$

| event | A's vruntime | B's vruntime | next to run |
|---|---|---|---|
| start | 0 | 0 | A (tie) |
| A runs 3 ms | 3 | 0 | B |
| B runs 1 ms | 3 | 1 × 1024/335 ≈ 3.06 | A |
| A runs 3 ms | 6 | 3.06 | B |

Over time A gets about 3 ms of real CPU for every 1 ms B gets, which matches the 75% and 25% shares, while their vruntimes stay level.

```python
def cfs(weights, total_ms, slice_ms=1):
    vr = {t: 0.0 for t in weights}
    used = {t: 0 for t in weights}
    for _ in range(total_ms // slice_ms):
        t = min(vr, key=vr.get)                     # the leftmost task in the red-black tree
        used[t] += slice_ms
        vr[t] += slice_ms * 1024 / weights[t]
    return used


print(cfs({"A": 1024, "B": 335}, 1000))   # about {'A': 753, 'B': 247}
```

Connects to: multilevel queue and feedback queue scheduling, priority scheduling, red-black trees.

### questions
Q: How does Linux CFS decide which task to run next?
A: It tracks each task's virtual runtime, the CPU time it has used scaled by its weight, and always runs the runnable task with the smallest virtual runtime. Tasks are kept in a red-black tree ordered by virtual runtime, so the next task is the leftmost node.

Q: How do nice values affect CFS?
A: Nice values map to weights, with nice 0 equal to 1024 and each step changing the weight by about 1.25 times. A higher weight makes virtual runtime grow more slowly, so the task is picked more often and receives a proportionally larger share of the CPU.

Q: Is CFS still Linux's scheduler?
A: Since Linux 6.6, released in 2023, the fair scheduling class uses EEVDF, earliest eligible virtual deadline first, instead of the original CFS algorithm. It keeps the idea of weighted virtual runtime but also gives tasks virtual deadlines to improve latency.
