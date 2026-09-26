---
topic: career.search
name: "Job search strategy"
subject: career
order: 3
prereqs: []
---

## career.search.finding-openings
name: "Finding openings"
importance: important
needsReview: true
scope: "referrals, job boards, campus and off-campus routes"

### simple
Openings reach you through a few doors: campus placements, applications on company sites and job boards, referrals from people inside, and internships that turn into offers. Some doors open far more often than others, so a good search uses several at once. It is like fishing with a few lines in different spots instead of one line in one spot all day.

### interview
- **Campus placements**: companies visit through the placement cell; rules on eligibility, slots and how many offers you may hold vary by college and year, so read yours early.
- **Off-campus**: company careers pages, job boards, hiring contests and hackathons, and direct messages to small startups.
- **Referrals**: an employee vouches for you and your application reaches a person; ask politely, specifically, and make it easy to say yes.
- **Internships**: a strong internship can end in a pre-placement offer, which many students treat as their main route.
- Track every application (company, role, date, route, stage, next step) and follow up once after a week or two.
- Preparation multiplies every route: better interview performance raises your chance of an offer more than more applications do.

### deep
#### The routes

- **Campus placements.** Companies present, run a test and interview on campus. The details (who may sit, which companies count as which tier, whether you can keep interviewing after one offer) are set by each college and change between years; your placement cell's rulebook is the source of truth.
- **Internship to offer.** A pre-placement offer after an internship is one of the most reliable routes, because the company has seen your work for weeks.
- **Careers pages and job boards.** Open to everyone, so the reply rate per application is low. Apply early in a hiring cycle and tailor the resume to each role.
- **Referrals.** A referral puts your resume in front of a person. Alumni from your college and people you met at events or in open source are the natural first contacts.
- **Contests and hackathons.** Some companies hire through coding contests or hackathons; a good result can skip the screening step.
- **Small startups.** A short, specific email to an engineer or founder, with a link to one relevant project, often gets a reply when a form would not.

#### The arithmetic of a search

A search is a funnel: applications turn into interview loops, and loops turn into offers. The rates below are made up to show the arithmetic, not measured; track your own and replace them. The program assumes outcomes are independent, which is optimistic, since the same weak spot tends to sink several interviews.

```cpp
// How application plans turn into offers, with made-up conversion rates (track your own).
struct Channel { const char* name; double reply; };  // chance an application reaches interviews
const Channel cold{"cold", 0.05}, referral{"referral", 0.30}, campus{"campus drive", 0.40};

void plan(const char* label, const vector<pair<Channel, int>>& mix, double offerRate) {
    double loops = 0, noOffer = 1;  // assumes outcomes are independent, which is optimistic
    for (auto& [ch, n] : mix) {
        loops += n * ch.reply;
        noOffer *= pow(1 - ch.reply * offerRate, n);
    }
    printf("%-34s loops %4.1f  offers %4.2f  P(any offer) %5.1f%%\n", label, loops,
           loops * offerRate, 100 * (1 - noOffer));
}

int main() {
    for (double offerRate : {0.15, 0.30}) {  // chance an interview loop ends in an offer
        printf("if %.0f%% of interview loops end in an offer:\n", 100 * offerRate);
        plan("  80 cold", {{cold, 80}}, offerRate);
        plan("  40 cold + 8 referrals", {{cold, 40}, {referral, 8}}, offerRate);
        plan("  40 cold + 8 referrals + 6 campus", {{cold, 40}, {referral, 8}, {campus, 6}},
             offerRate);
    }
}
```

Output:

```text
if 15% of interview loops end in an offer:
  80 cold                          loops  4.0  offers 0.60  P(any offer)  45.2%
  40 cold + 8 referrals            loops  4.4  offers 0.66  P(any offer)  48.8%
  40 cold + 8 referrals + 6 campus loops  6.8  offers 1.02  P(any offer)  64.7%
if 30% of interview loops end in an offer:
  80 cold                          loops  4.0  offers 1.20  P(any offer)  70.2%
  40 cold + 8 referrals            loops  4.4  offers 1.32  P(any offer)  74.3%
  40 cold + 8 referrals + 6 campus loops  6.8  offers 2.04  P(any offer)  88.1%
```

What it shows:

- Swapping forty cold applications for eight referrals raises the expected interview loops from 4.0 to 4.4, with a fraction of the applications.
- Adding six campus drives does more than either, because each one reaches interviews often.
- Doubling the share of loops that end in an offer, from 15% to 30%, lifts the chance of at least one offer from 45.2% to 70.2% even with the weakest plan. Preparation is the biggest lever you control.

#### Asking for a referral

Make it specific and easy to say yes to. A message Kiran (made up) might send to a graduate of the same college:

> Hi Meera, I'm Kiran, a final-year computer science student at our college; I saw that you work on the payments platform. I'm applying for the new-graduate backend role posted last week. This summer I fixed a reconciliation job that raised forty false alarms a night, so the role's focus on matching payments caught my eye. Would you be comfortable referring me? I've attached my resume and a two-line summary you can paste into the form. Either way, thank you for reading.

It names the role, gives one relevant proof point, does the work for the referrer, and leaves an easy way to say no. Follow up once if there is no reply; never pressure.

#### Keeping track

A simple sheet with company, role, route, date applied, stage, next step and a notes column keeps a long search under control, and shows which routes are working for you.

Connects to: [resume writing](#/concept/career.resume.resume-writing), [online assessment strategy](#/concept/career.search.online-assessment-strategy), [GitHub and portfolio presentation](#/concept/career.resume.github-and-portfolio-presentation).

### questions
Q: Why do referrals matter so much in a job search?
A: A referral puts your resume in front of a person instead of a pile, so far more referred applications reach interviews than cold ones. Asked for politely with a specific role and a proof point, they are the highest-yield route most students have outside campus placements.

Q: What should a referral request contain?
A: Who you are, the specific role, one relevant proof point, what you are attaching to make it easy, and a polite way to decline. Keep it short and follow up only once.

Q: Why use several routes at once rather than one?
A: Each route has a low chance per application and the chances add up across routes. Campus drives, referrals, internships and direct applications also reach different companies and hiring cycles.

Q: Which lever raises the chance of an offer most: more applications or better interview performance?
A: Usually better interview performance, because it multiplies the result of every route. More applications help only if the interviews they lead to go well.

Q: What is a pre-placement offer and why is it valuable?
A: It is a full-time offer made after an internship, based on the work the company saw. It is valuable because it rests on weeks of evidence rather than a few hours of interviews, and it can come before campus placements start.

## career.search.online-assessment-strategy
name: "Online assessment strategy"
importance: important
needsReview: true
scope: "time management, partial solutions, common formats"

### simple
An online assessment is a timed test, usually on a coding platform, that decides who gets an interview. It rewards a plan more than raw speed: read everything first, take the easy points, and bank partial credit before chasing a perfect solution. It is like an exam where you answer the questions you know before wrestling with the hardest one.

### interview
- Common formats (they vary by firm and year): two to four coding problems scored by hidden test cases, multiple-choice sections on aptitude and computer science basics, and for quant roles, mental math, probability or sequences.
- Spend the first minutes reading every problem and its constraints; solve the easiest first.
- The constraints tell you the target complexity; if you can't reach it, submit a correct brute force for the small tests and move on.
- Stress test: compare your fast solution with a brute force on many small random inputs.
- Check edge cases before submitting: empty input, one element, duplicates, overflow (use long long), and the exact output format.
- Follow the rules: assessments are proctored, and outside help ends the process.

### deep
#### Formats you may meet

Formats differ between companies and change from year to year, so treat this as a list of possibilities rather than a promise. Candidates widely report coding sections with a few problems of rising difficulty scored by hidden tests, often with partial credit per test; multiple-choice sections on aptitude, output prediction and fundamentals (operating systems, networks, databases); and, for quant roles, mental arithmetic under time pressure, probability questions and number sequences. Many are proctored through the camera and screen.

#### A time plan

1. Read every problem and its constraints before writing code.
2. Solve the one you are surest of first and submit it.
3. Timebox each remaining problem. When the box runs out, submit what passes and move on.
4. Return with leftover time to improve partial solutions.

#### Partial credit and stress testing

Scoring by test cases rewards a correct slow solution: it passes the small tests. Here is an original problem. A delivery app logs n delivery times in minutes, not sorted and possibly repeated; count the pairs of deliveries whose times differ by at most d, for n up to 200,000. The brute force checks every pair. The fast version sorts and slides a window. The first draft of the window used `>=` where it needed `>`, and a stress test against the brute force found it:

```cpp
// Stress testing an OA solution: count pairs of delivery times that differ by at most d.
long long brute(const vector<int>& t, int d) {  // O(n^2): obviously right, too slow for big n
    long long pairs = 0;
    for (size_t i = 0; i < t.size(); ++i)
        for (size_t j = i + 1; j < t.size(); ++j) pairs += abs(t[i] - t[j]) <= d;
    return pairs;
}

long long fast(vector<int> t, int d, bool firstDraft) {  // O(n log n): sort, then two pointers
    sort(t.begin(), t.end());
    long long pairs = 0;
    for (size_t i = 0, j = 0; j < t.size(); ++j) {
        while (firstDraft ? t[j] - t[i] >= d : t[j] - t[i] > d) ++i;  // window [i, j]
        pairs += j - i;
    }
    return pairs;
}

int main() {
    mt19937_64 rng(2026);
    for (bool firstDraft : {true, false}) {
        int test = 0;
        for (; test < 1000; ++test) {  // many tiny random cases: small values force ties
            vector<int> t(rng() % 7);
            for (int& x : t) x = rng() % 10;
            int d = 1 + rng() % 3;
            if (brute(t, d) == fast(t, d, firstDraft)) continue;
            printf("%s fails test %d: d = %d, times", firstDraft ? "draft" : "fixed", test, d);
            for (int x : t) printf(" %d", x);
            printf(": brute %lld, fast %lld\n", brute(t, d), fast(t, d, firstDraft));
            break;
        }
        if (test == 1000) printf("%s passes 1000 random tests\n", firstDraft ? "draft" : "fixed");
    }
    const long long n = 200000;  // the full limit: only the fast version fits
    vector<int> big(n);
    for (int& x : big) x = rng() % 1000000;
    printf("n = %lld: brute force needs %.1e comparisons; fast answer %lld\n", n,
           n * (n - 1) / 2.0, fast(big, 50, false));
}
```

Output:

```text
draft fails test 3: d = 1, times 7 2 3 3: brute 3, fast 1
fixed passes 1000 random tests
n = 200000: brute force needs 2.0e+10 comparisons; fast answer 2018065
```

The failing case is tiny and readable: with d = 1, the times 2, 3 and 3 form three pairs within one minute, but the draft counted only the pair of 3s, because it dropped pairs whose difference was exactly d. The brute force costs about 2.0e+10 comparisons at the full limit, far too slow, but it is the perfect judge for small inputs. Write it first: it earns the small-test points and checks the fast version.

#### Before you press submit

- Edge cases: empty input, one element, all equal, the largest values (does anything overflow an `int`?).
- Output format exactly as specified: spaces, new lines, case.
- Fast input for large data (`ios::sync_with_stdio(false)` and `cin.tie(nullptr)`).
- Remove debug prints.

#### Multiple-choice sections

Answer the quick ones first, flag the slow ones, and check whether wrong answers cost marks before guessing; [the quant firm process](#/concept/career.search.quant-firm-process) works out when a guess pays.

Connects to: [constraints to complexity](#/concept/dsa.complexity.constraints-to-complexity), [from brute force to optimal](#/concept/dsa.problem-solving.from-brute-force-to-optimal), [time management in interviews and OAs](#/concept/dsa.problem-solving.time-management-in-interviews-and-oas).

### questions
Q: How should you spend the first few minutes of a coding assessment?
A: Read every problem and its constraints before writing code, then start with the one you are most confident about. This avoids sinking the whole test into a hard problem while easy points wait.

Q: Why submit a brute force solution in a test-case-scored assessment?
A: A correct slow solution passes the small tests and earns partial credit, and it gives you a reference to check a faster solution against. It is better than a fast solution that is wrong.

Q: What is stress testing and why is it useful?
A: Generating many small random inputs and comparing a fast solution with a simple, obviously correct one. It finds wrong answers on edge cases quickly and hands you a tiny failing input to debug.

Q: Name three checks worth doing before submitting.
A: Edge cases such as empty input, one element and duplicates; overflow at the largest values, using long long where needed; and the exact output format. Also remove debug output.

Q: How do the constraints guide your solution?
A: They tell you roughly how many operations fit in the time limit, so they point to the target complexity. For example, n up to 200,000 rules out checking every pair and suggests sorting, hashing or a linear scan.

## career.search.interview-day-tactics
name: "Interview day tactics"
importance: important
scope: "preparing the environment, thinking aloud, asking clarifying questions"

### simple
On interview day, small things decide whether your preparation shows: a working setup, a calm start, and talking through your thinking. Clarifying questions come first, because solving the wrong problem well still fails. It is like a pilot's checklist before take-off: routine, quick, and it prevents the avoidable crashes.

### interview
- **Online**: test the camera, microphone, internet and the interview's coding tool the day before; keep a phone hotspot and charger ready, a quiet room, water, pen and paper, notifications off.
- **Onsite**: know the route, arrive early, carry an ID and a printed resume, and eat something.
- **Clarify first**: input size and ranges, duplicates, empty input, sorted or not, what to return on ties, and whether you may modify the input.
- **Think aloud**: say your plan before coding, what you are checking, and when you change your mind; silence leaves the interviewer guessing.
- **Test by hand**: walk a small example through your code and fix bugs out loud; interviewers value finding your own bug.
- When stuck, say what you know, try a smaller case or a brute force, and ask for a hint rather than freezing.

### deep
#### Before the day

For online rounds, the setup is part of the performance. Use the same tool the interview uses, with the language you will write in, and try it once end to end. Put the camera at eye level, close other applications, and have a backup connection. For onsite rounds, plan the route with slack, and bring an ID, a printed resume and something to write with.

#### Clarifying questions

Most coding prompts leave details open on purpose. Ask about:

- size (how many items, how large the values);
- shape (sorted, unique, empty allowed, negative numbers);
- output (what exactly to return, what to do on ties or invalid input);
- constraints on the approach (extra memory, modifying the input).

Repeat the problem back in your own words with one small example before you plan.

#### A worked exchange

An original problem, played through (Kiran and the interviewer are made up):

**Interviewer:** A shop logs the minute each customer walks in during the day. Find the busiest ten-minute stretch.

**You:** Let me check a few things. Is the log sorted by time, and can two customers arrive in the same minute?

**Interviewer:** Not sorted, and yes, minutes can repeat.

**You:** Does a stretch starting at minute s cover s up to but not including s + 10?

**Interviewer:** Yes.

**You:** What should I return: the count, the time, or both? And if two stretches tie?

**Interviewer:** Both. For ties, the earliest stretch, reported by the minute of its first arrival.

**You:** And for an empty day?

**Interviewer:** Return a count of 0 and minute -1.

**You:** How long can the log be?

**Interviewer:** Up to a million entries.

**You:** Then checking every pair is too slow. I'll sort the minutes and slide a window over them: for each arrival as the right end, move the left end forward until the window spans less than ten minutes, and keep the largest count. Sorting makes it O(n log n), the sweep is linear. Let me code it, then run the cases we just discussed.

```cpp
// Busiest stretch: the most arrivals in any window [s, s + width), reported with the minute of
// its first arrival; the earliest such stretch wins ties, and an empty day gives {0, -1}.
pair<int, int> busiest(vector<int> minutes, int width = 10) {
    if (minutes.empty()) return {0, -1};
    sort(minutes.begin(), minutes.end());  // the log is not sorted and may repeat minutes
    int best = 0, start = -1;
    for (size_t i = 0, j = 0; j < minutes.size(); ++j) {
        while (minutes[j] - minutes[i] >= width) ++i;  // keep minutes[i..j] within the width
        int count = j - i + 1;
        if (count > best) best = count, start = minutes[i];
    }
    return {best, start};
}

int main() {
    struct Case { const char* why; vector<int> minutes; pair<int, int> expected; };
    const vector<Case> cases = {
        {"empty day", {}, {0, -1}},
        {"one customer", {5}, {1, 5}},
        {"minute 10 is outside [0, 10)", {0, 10}, {1, 0}},
        {"tie: earliest stretch", {3, 12, 13, 22}, {2, 3}},
        {"unsorted, same minute", {30, 1, 30, 2, 30}, {3, 30}},
        {"busiest in the middle", {0, 9, 10, 10, 19}, {3, 9}},
    };
    for (auto& [why, minutes, expected] : cases) {
        auto got = busiest(minutes);
        printf("%-30s -> %d from minute %2d  %s\n", why, got.first, got.second,
               got == expected ? "ok" : "WRONG");
    }
}
```

Output:

```text
empty day                      -> 0 from minute -1  ok
one customer                   -> 1 from minute  5  ok
minute 10 is outside [0, 10)   -> 1 from minute  0  ok
tie: earliest stretch          -> 2 from minute  3  ok
unsorted, same minute          -> 3 from minute 30  ok
busiest in the middle          -> 3 from minute  9  ok
```

Every test came from a clarifying question: the empty day, the half-open window (minute 10 is outside a stretch starting at 0), ties, repeats and an unsorted log. Asking first turned the edge cases into tests instead of surprises.

#### While you work

- State the plan and its complexity before coding; get a nod.
- Narrate intent, not keystrokes: "now I shrink the window" rather than reading code aloud.
- Keep an eye on time. If a third of the slot has gone and there is no plan, say so and propose a brute force.
- Trace a small example by hand after writing the code, and fix bugs out loud.

#### After the round

Write down the questions and how you felt, while they are fresh. They improve your preparation and feed your notes for [questions to ask the interviewer](#/concept/career.behavioral.questions-to-ask-the-interviewer) in later rounds.

Connects to: [communicating in interviews](#/concept/dsa.problem-solving.communicating-in-interviews), [reading the problem](#/concept/dsa.problem-solving.reading-the-problem), [edge case checklist](#/concept/dsa.problem-solving.edge-case-checklist), [dry running and testing](#/concept/dsa.problem-solving.dry-running-and-testing).

### questions
Q: What should you check the day before an online interview?
A: The camera, microphone, internet connection and the exact coding tool the interview uses, with your language selected. Also prepare a backup connection, a charger, a quiet room and pen and paper.

Q: Which clarifying questions are worth asking before coding?
A: The size of the input and value ranges, whether it is sorted or has duplicates, whether it can be empty, what exactly to return including ties, and any limits on memory or modifying the input. Then restate the problem with a small example.

Q: Why think aloud during a coding interview?
A: The interviewer is judging how you think, not only the final code. Talking through your plan lets them follow and help, and it shows reasoning even if you don't finish.

Q: What should you do when you get stuck?
A: Say what you know and what you are trying, work a smaller example, fall back to a brute force you can improve, and ask for a hint if needed. Freezing in silence is the worst option.

Q: How do clarifying questions help with testing?
A: Each answer defines an edge case, such as an empty input or a tie, which becomes a test you run on your code. You find bugs before the interviewer does.

## career.search.quant-firm-process
name: "Quant firm process"
importance: important
needsReview: true
scope: "typical rounds at trading firms (OA, mental math, probability, trading games, technical)"

### simple
Trading firms usually hire through a series of rounds that test quick, careful thinking with numbers: online tests, mental arithmetic, probability questions, games where you make markets or bet, and technical interviews for developer roles. Each round checks a different skill, and the details differ from firm to firm and year to year. It is like a decathlon, where steady scores in every event beat one brilliant event and a disaster.

### interview
- Roles differ: traders are tested hardest on mental math, probability and games; researchers on probability, statistics and modelling; developers on C++, data structures, systems and low latency.
- Widely reported stages: an online assessment, one or more phone or video rounds, trading games, and a final set of interviews, with some fit questions throughout.
- Mental math tests are fast and strict; know your pace and whether wrong answers cost marks.
- Probability and brainteaser rounds reward thinking aloud, exact answers and quick sanity checks.
- Trading games reward consistent reasoning: tight but sensible markets, updating on new information, and sizing bets by edge.
- Formats vary by firm and change between years; treat any list as a guide, not a script.

### deep
#### The shape of the process

What follows is a general picture of widely reported formats, not any particular firm's practice; firms change their process often, so check the details for the firm and year you apply to.

1. **Online assessment.** Mental arithmetic under time pressure, probability and statistics questions, number sequences, and for developer roles, coding problems.
2. **Phone or video rounds.** Probability, expected value, brainteasers and mental math, often in quick succession, with follow-ups that change one assumption.
3. **Trading games.** Making two-sided markets on uncertain quantities, betting games with edge and variance, sometimes with new information revealed as the game goes on.
4. **Technical rounds for developers.** C++ in depth, data structures and algorithms, operating systems, networking and performance.
5. **Final interviews.** Several rounds in a day mixing the above, with questions about motivation and teamwork.

#### Pace and guessing

Mental math tests are short and fast. For the widely reported format of 80 questions in 8 minutes, the program below gives the pace; it then works out, exactly, when a guess pays if wrong answers cost marks (+1 for a right answer, minus the penalty for a wrong one, with a given number of options still in play).

```cpp
// Pacing a timed test, and when a guess pays off if wrong answers cost marks.
struct Frac {  // an exact fraction, always reduced
    long long p, q;
    Frac(long long a, long long b = 1) : p(a / gcd(a, b)), q(b / gcd(a, b)) {}
    Frac operator-(Frac o) const { return {p * o.q - o.p * q, q * o.q}; }
    Frac operator*(Frac o) const { return {p * o.p, q * o.q}; }
    string str() const { return q == 1 ? to_string(p) : to_string(p) + "/" + to_string(q); }
};

int main() {
    const int questions = 80, minutes = 8;  // a widely reported mental math format
    printf("%d questions in %d minutes: %d seconds each\non pace:", questions, minutes,
           minutes * 60 / questions);
    for (int m = 2; m <= minutes; m += 2)
        printf(" %d by minute %d%s", questions * m / minutes, m, m < minutes ? "," : "\n");
    // Expected marks from a guess among the options left: +1 if right, -penalty if wrong.
    for (int options : {4, 5})
        for (Frac penalty : {Frac(1, 4), Frac(1, 3), Frac(1, 2)}) {
            printf("%d options, a wrong answer costs %s:", options, penalty.str().c_str());
            for (int left = options; left >= 2; --left) {
                Frac ev = Frac(1, left) - penalty * Frac(left - 1, left);
                printf("  %d left %5s", left, ev.str().c_str());
            }
            printf("\n");
        }
}
```

Output:

```text
80 questions in 8 minutes: 6 seconds each
on pace: 20 by minute 2, 40 by minute 4, 60 by minute 6, 80 by minute 8
4 options, a wrong answer costs 1/4:  4 left  1/16  3 left   1/6  2 left   3/8
4 options, a wrong answer costs 1/3:  4 left     0  3 left   1/9  2 left   1/3
4 options, a wrong answer costs 1/2:  4 left  -1/8  3 left     0  2 left   1/4
5 options, a wrong answer costs 1/4:  5 left     0  4 left  1/16  3 left   1/6  2 left   3/8
5 options, a wrong answer costs 1/3:  5 left -1/15  4 left     0  3 left   1/9  2 left   1/3
5 options, a wrong answer costs 1/2:  5 left  -1/5  4 left  -1/8  3 left     0  2 left   1/4
```

How to read it:

- At six seconds a question, anything slow gets skipped and revisited; check your position against the pace line as you go.
- When the penalty equals 1 over (options minus 1), a blind guess is worth exactly 0: 1/3 with four options, 1/4 with five.
- Ruling out one option turns that fair penalty into a profitable guess (1/9 with four options, 1/16 with five). With a harsher penalty of 1/2 and four options, ruling out one only makes the guess fair; ruling out two makes it pay (1/4).
- Always check whether the test has negative marking before deciding; the rules differ.

#### Trading games

These games reward how you think more than the final P&L. Say how you estimated a value, quote a market around it, update when someone trades with you (they may know something), and size bets by your edge. Practice with [making a market](#/concept/markets.making.making-a-market), [adverse selection](#/concept/markets.making.adverse-selection), [trading game practice](#/concept/markets.making.trading-game-practice) and [the Kelly criterion](#/concept/markets.betting.kelly-criterion), then try the bank's [market on two dice](#/problems/q-dice-market) and [market on three cards](#/problems/q-card-total-market).

#### Preparing with Atlas

| Round | Where to practise |
|---|---|
| Mental math | [fast arithmetic](#/concept/math.mental.fast-arithmetic), [speed drills](#/concept/math.mental.speed-drills), [Fermi estimation](#/concept/math.mental.fermi-estimation) |
| Probability | [conditional probability](#/concept/prob.foundations.conditional-probability), [first-step analysis](#/concept/prob.expected-value.first-step-analysis), [coin and dice games](#/concept/puzzles.probability.coin-and-dice-games) |
| Brainteasers | [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [communicating while solving](#/concept/puzzles.method.communicating-while-solving) |
| Trading games | [expected value decisions](#/concept/markets.betting.expected-value-decisions), [edge and expected value in trades](#/concept/markets.making.edge-and-expected-value-in-trades) |

Developer roles add the C++, operating systems, concurrency and performance subjects.

#### Mistakes to avoid

- Silence while solving: interviewers want your reasoning.
- An exact answer with no sanity check; a quick estimate catches slips.
- Markets that are too wide to be useful or too tight to survive being hit.
- Doubling down after a loss in a betting game instead of sizing by edge.

Connects to: [online assessment strategy](#/concept/career.search.online-assessment-strategy), [interview day tactics](#/concept/career.search.interview-day-tactics).

### questions
Q: What rounds are widely reported in trading firm hiring?
A: An online assessment (mental math, probability, sequences, and coding for developers), phone or video rounds on probability and brainteasers, trading games, technical rounds for developer roles, and a final set of interviews. The details vary by firm and year.

Q: In a test where a wrong answer costs one third of a mark and each question has four options, should you guess blindly?
A: A blind guess is then worth exactly zero on average: a quarter chance of plus one against three quarters of minus one third. If you can rule out even one option, the guess becomes worth one ninth of a mark on average, so guess.

Q: What do interviewers look for in a trading game?
A: Clear reasoning about value, sensible two-sided markets, updating when others trade with you, and bet sizes tied to edge and risk. The final profit matters less than consistent, explainable decisions.

Q: How does preparation differ for trader and developer roles at a quant firm?
A: Traders focus on mental math, probability and trading games. Developers add C++ in depth, data structures, operating systems, networking and performance, while still being comfortable with probability basics.

Q: Why is a quick sanity check worth the seconds in a probability round?
A: It catches slips such as a probability above one or an expectation outside the possible range, and saying it aloud shows the interviewer disciplined thinking.
