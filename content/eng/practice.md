---
topic: eng.practice
name: "Software engineering practice"
subject: eng
order: 6
prereqs: []
---

## eng.practice.sdlc-and-agile
name: "SDLC and agile"
importance: important
scope: "sprints, standups, estimation"

### simple
The software development life cycle is the path every feature takes: understand the need, design, build, test, release, then run and improve it. Agile teams walk that path in short loops of a week or two instead of one long march, showing working software at the end of each loop and adjusting the plan to what they learn. It is like steering a car with small, constant corrections rather than setting the wheel once at the start.

### interview
- **SDLC phases**: requirements, design, implementation, testing, deployment, maintenance. Waterfall does them once in order; iterative and agile methods repeat them in small slices.
- **Scrum**: fixed-length sprints (often two weeks) with sprint planning, a short daily standup, a sprint review (demo) and a retrospective (how to work better); roles are the product owner (priorities), the scrum master (process) and the developers.
- **Kanban**: continuous flow with limits on work in progress and no fixed sprints; the measure is cycle time from start to done.
- **Standups**: a few minutes on what moved, what is next and what is blocked; details go to follow-up conversations.
- **Estimation**: relative sizing in story points (planning poker, T-shirt sizes); velocity (points done per sprint) turns sizes into forecasts, which should be ranges, not dates.
- **Done means done**: a shared definition of done (reviewed, tested, merged, deployed or ready to deploy) keeps velocity honest.

### deep
#### Intuition

Plans fail because early knowledge is poor: requirements shift and estimates are guesses. Agile answers by making feedback cheap. Short iterations produce something usable, users react, and the team re-plans with facts. Rituals such as standups and retrospectives exist to surface problems early; when they become status reports for a manager, they lose their point.

#### Estimation as a forecast

Story points are relative: a 5 is about as much work as five 1s, whatever that takes in hours. Averaging past velocity and dividing gives one number that hides the spread. Replaying past sprints at random gives a probability instead, and here it can also be computed exactly, since each sprint's points are a draw from the same eight values.

```cpp
// How many sprints until 120 points are done, if future sprints look like past ones?
int main() {
    const vector<int> velocity = {21, 18, 25, 19, 23, 17, 22, 20};  // last 8 sprints (made up)
    const int backlog = 120, runs = 100000;
    double mean = accumulate(velocity.begin(), velocity.end(), 0.0) / velocity.size();
    printf("average velocity %.2f, so %.2f sprints by division\n", mean, backlog / mean);

    mt19937_64 rng(2026);  // simulate: each future sprint repeats a random past one
    map<int, int> finishedIn;
    for (int r = 0; r < runs; ++r) {
        int done = 0, sprints = 0;
        while (done < backlog) done += velocity[rng() % velocity.size()], ++sprints;
        ++finishedIn[sprints];
    }
    map<int, double> total = {{0, 1.0}};  // exact: the distribution of the sum after k sprints
    int simulated = 0;
    for (int k = 1; k <= 7; ++k) {
        map<int, double> next;
        for (auto [sum, p] : total)
            for (int v : velocity) next[sum + v] += p / velocity.size();
        total = next;
        double exact = 0;
        for (auto [sum, p] : total) exact += sum >= backlog ? p : 0;
        simulated += finishedIn[k];
        double se = sqrt(exact * (1 - exact) / runs), sim = double(simulated) / runs;
        if (k >= 5)
            printf("within %d sprints: exact %.5f%%, simulated %.3f%% (%+.1f SE)\n", k,
                   100 * exact, 100 * sim, se > 0 ? (sim - exact) / se : 0.0);
    }
}
```

Output:

```text
average velocity 20.62, so 5.82 sprints by division
within 5 sprints: exact 0.15564%, simulated 0.150% (-0.5 SE)
within 6 sprints: exact 74.96948%, simulated 75.102% (+1.0 SE)
within 7 sprints: exact 99.99995%, simulated 100.000% (+0.2 SE)
```

Dividing says 5.8 sprints, which sounds like "six sprints for sure". The distribution says six sprints is about a 75% bet, and seven is nearly certain (only seven sprints of 17 in a row would fall short). The simulation landed within 1 standard error of each exact value. "Six sprints likely, seven to be safe" is a far more useful answer for planning than "5.8". The same idea works for Kanban with past cycle times, and the assumption to keep in view is that the future resembles the past: a new team member or a new kind of work breaks it.

#### Common failure modes

- **Points as a performance target**: teams inflate estimates and velocity loses meaning. Compare a team only with its own history.
- **Standups as status meetings**: long, one-way reports; keep them short and about blockers.
- **"Agile" without feedback**: two-week waterfalls that never show software to users miss the point.
- **No time for maintenance**: bugs, upgrades and refactoring belong in the plan, not in the gaps.

Connects to: [clean code](#/concept/eng.practice.clean-code), [code review etiquette](#/concept/eng.practice.code-review-etiquette), [CI/CD](#/concept/eng.devops.ci-cd), [Monte Carlo estimation](#/concept/prob.simulation.monte-carlo-estimation).

### questions
Q: What are the ceremonies of Scrum?
A: Sprint planning to choose and plan the sprint's work, a daily standup of a few minutes to coordinate and surface blockers, a sprint review to demo the result to stakeholders, and a retrospective to improve how the team works. The backlog is refined continuously between them.

Q: What is the difference between Scrum and Kanban?
A: Scrum works in fixed-length sprints with planned commitments and defined roles. Kanban has no sprints: work flows continuously through columns with limits on work in progress, and the team optimizes cycle time.

Q: Why estimate in story points instead of hours?
A: People are better at comparing sizes than predicting durations, and points absorb differences in speed between people. Velocity then calibrates points to time using the team's own history.

Q: How would you forecast when a backlog will be finished?
A: Use the team's past throughput or velocity and give a range with probabilities, for example by replaying past sprints at random, rather than dividing the backlog by the average. State the assumptions and update the forecast as sprints finish.

Q: What makes a daily standup useful?
A: It is short, focused on progress toward the sprint goal and on blockers, and aimed at teammates rather than a manager. Anything needing discussion moves to a follow-up with only the people involved.

## eng.practice.clean-code
name: "Clean code"
importance: important
scope: "naming, functions, comments"

### simple
Clean code is code that the next person, often you in six months, can read and change without fear. Good names say what things are, small functions each do one job, and comments explain why something is done rather than repeating what the code already says. It is like a well-labelled kitchen: anyone can find the salt without opening every jar.

### interview
- **Names** reveal intent (`orderTotalCents`, `isMember`), use the domain's words, include units where they matter (`timeoutMs`, `cents`) and avoid vague ones (`data`, `tmp`, `calc`, `flag`).
- **Functions** are short, do one thing at one level of abstraction, take few parameters, and prefer an enum or a small struct to a bare `bool` or `int` whose meaning the caller can't see.
- **Structure**: early returns instead of deep nesting, named constants instead of magic numbers, no duplicated logic, and the smallest scope for each variable.
- **Comments** explain why (a business rule, a workaround, a surprising choice), not what; outdated comments are worse than none. Types and names are the first documentation.
- **Refactor safely**: small steps with tests running; a refactor changes structure, never behavior.
- Consistency with the codebase beats personal taste; let a formatter and linter settle style.

### deep
#### Intuition

Code is read far more often than it is written, and every unclear name or hidden rule costs each future reader a few minutes of decoding. Clean code moves knowledge out of people's heads and into the code itself: the rule "members get 10% off orders above 50.00" should be readable in the source, not reconstructed from `r * 9 / 10` and a `5000`.

#### Before and after

Both versions are in one program, which then checks that they agree on every combination of cart, delivery option and membership:

```cpp
// Before: it works, but every reader has to decode it.
int calc(vector<pair<string, int>> v, int t, bool b) {  // calculate
    int r = 0;
    for (int i = 0; i < (int)v.size(); i++) r += v[i].second;  // add up
    if (b) {
        if (r > 5000) {
            r = r * 9 / 10;
        }
    }
    if (t == 1) r += 500; else if (t == 2) r += 1500;
    return r;
}

// After: same behavior, names and structure say what it means.
struct Item { string name; int cents; };
enum class Delivery { pickup, standard, express };

constexpr int memberDiscountPercent = 10;
constexpr int memberDiscountAboveCents = 5000;  // members save only on larger orders

int deliveryCents(Delivery d) {
    switch (d) {
        case Delivery::pickup: return 0;
        case Delivery::standard: return 500;
        case Delivery::express: return 1500;
    }
    return 0;
}

int orderTotalCents(const vector<Item>& items, Delivery delivery, bool isMember) {
    int subtotal = 0;
    for (const Item& item : items) subtotal += item.cents;
    if (isMember && subtotal > memberDiscountAboveCents)
        subtotal = subtotal * (100 - memberDiscountPercent) / 100;  // rounds as before
    return subtotal + deliveryCents(delivery);  // delivery is never discounted
}

int main() {  // a refactor must not change results: compare both on every combination
    vector<vector<Item>> carts = {{}, {{"pen", 250}}, {{"lamp", 4999}, {"bulb", 2}},
                                  {{"desk", 12000}, {"chair", 7999}}};
    int cases = 0, same = 0;
    for (auto& cart : carts)
        for (int t = 0; t < 3; ++t)
            for (bool member : {false, true}) {
                vector<pair<string, int>> old;
                for (auto& i : cart) old.push_back({i.name, i.cents});
                ++cases;
                same += calc(old, t, member) == orderTotalCents(cart, Delivery(t), member);
            }
    printf("%d of %d cases agree; express member desk and chair: %d cents\n", same, cases,
           orderTotalCents(carts[3], Delivery::express, true));
}
```

Output:

```text
24 of 24 cases agree; express member desk and chair: 19499 cents
```

What changed:

- **Names**: `calc`, `v`, `t`, `b` and `r` became `orderTotalCents`, `items`, `delivery`, `isMember` and `subtotal`. The unit, cents, is in the names.
- **Types instead of codes**: `t == 1` became `Delivery::standard`, so a call reads `orderTotalCents(cart, Delivery::express, true)` and the compiler rejects a delivery value that doesn't exist.
- **Constants with names and a why-comment**: 10 and 5000 are now the discount rule, with a comment on intent that the code can't express.
- **One job per function**: delivery pricing moved out, so it can change or be tested alone.

The comparison earned its place. The first version of the refactor wrote the discount as `subtotal -= subtotal * memberDiscountPercent / 100`, which reads naturally but rounds the discount down instead of the total, and the check reported `18 of 24 cases agree`: an order of 5001 cents came to 4501 instead of 4500. A refactor must keep behavior exactly; the tests, not good intentions, confirm it.

#### Comments: what to write

- Keep: why a rule exists, why an obvious approach was not used, units and invariants, links to the specification.
- Delete: comments that restate the code (`// add up`), commented-out code (version control remembers it), and anything the code has since contradicted.

Connects to: [single responsibility principle](#/concept/oop.principles.single-responsibility-principle), [DRY, KISS and YAGNI](#/concept/oop.principles.dry-kiss-and-yagni), [code review etiquette](#/concept/eng.practice.code-review-etiquette), [test-driven development](#/concept/eng.testing.test-driven-development).

### questions
Q: What makes a good name in code?
A: It says what the thing means in the domain, not how it is stored: orderTotalCents rather than r or calc. It includes units when they matter, is pronounceable and searchable, and is as specific as its scope requires; short names are fine only for tiny scopes like a loop index.

Q: Why is a boolean or integer parameter often a smell?
A: At the call site, orderTotal(cart, 2, true) says nothing about what 2 and true mean, and nothing stops invalid values. An enum or a small named struct makes calls readable and lets the compiler catch mistakes.

Q: When are comments useful, and when are they harmful?
A: Useful when they explain why: a business rule, a trade-off, a workaround for a bug, an invariant. Harmful when they restate what the code does or drift out of date, because readers trust them over the code.

Q: What is refactoring, and how do you do it safely?
A: Changing code's structure without changing its behavior, such as renaming, extracting functions or replacing codes with types. Do it in small steps with tests running after each one; if no tests cover the code, write characterization tests that pin down current behavior first.

Q: How small should a function be?
A: Small enough to do one thing at one level of abstraction and to be understood without scrolling; the name should describe everything it does. Length is a symptom, not the rule: split when a function mixes jobs or needs comments to separate its parts.

## eng.practice.code-review-etiquette
name: "Code review etiquette"
importance: important
scope: "giving and receiving feedback"

### simple
Code review is a teammate reading your change before it is merged, looking for bugs, confusing parts and risks. Good reviews are about the code, not the person: specific, kind, and clear about what must change and what is just a suggestion. It works like proofreading a friend's essay: you point out the mistakes and the unclear bits, and they thank you rather than argue.

### interview
- **Purpose**: catch bugs and risks, keep the code understandable, share knowledge across the team; style should be settled by formatters and linters, not people.
- **Reviewers**: review promptly (within a working day), read the description first, run or test risky changes, comment on the code not the author, explain why, ask questions instead of issuing orders, mark optional points (`nit:`), and say what is good.
- **Authors**: small, focused changes; a description with what, why and how it was tested; review your own diff first; respond to every comment; don't take feedback personally.
- **Severity is explicit**: blocking issues (bugs, security, data loss, missing tests) versus suggestions; approve with minor comments rather than holding a change hostage.
- **Disagreements**: resolve with facts (a test, a benchmark, the style guide) or a short conversation; escalate to the team's conventions, not seniority.
- Large changes get a design discussion before code, not a thousand-line review after.

### deep
#### Intuition

A review is a conversation between two people who want the same thing: working, understandable code. Its best outcome is a bug caught and a teammate who learned something; its worst is a hurt author, a stalled change and a bug that got through anyway. Clarity about what matters, and a respectful tone, decide which one you get.

#### A change to review

From the pipeline example in [CI/CD](#/concept/eng.devops.ci-cd), a one-line pull request titled "Tweak the coupon rule", with no description:

```text
$ git log --oneline
a2f676d Tweak the coupon rule
db7e8c1 Add the shop and its pipeline
$ git show --stat --format='%h %an: %s' HEAD
a2f676d Asha Rao: Tweak the coupon rule

 shop.cpp | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ git diff HEAD~1 -U2
diff --git a/shop.cpp b/shop.cpp
index 34b28c1..e0862b9 100644
--- a/shop.cpp
+++ b/shop.cpp
@@ -9,5 +9,5 @@ int total(const vector<Item>& items, const string& coupon) {
     int sum = 0;
     for (auto& i : items) sum += i.cents * i.qty;
-    if (coupon == "TEN" && sum >= 1000) sum -= sum / 10;
+    if (coupon == "TEN" && sum > 1000) sum -= sum / 10;
     return sum;
 }
```

#### Comments that don't help

- "Why would you do this?" (sounds like an accusation, and gives no reason)
- "Wrong." (no explanation, no alternative)
- "LGTM" after thirty seconds, without noticing the change breaks a boundary

#### Comments that do

- **Blocking**: "This changes behavior for an order of exactly 10.00: with `>` it gets no discount. Is that intended? The coupon rules say 10.00 or more, and the test 'the coupon applies at exactly 10.00' will fail. If the rule really changed, could you update the test and the description?"
- **Question**: "The title says tweak. Could the description say what prompted this, such as a support ticket or a rule change, so the next reader knows why it's `>`?"
- **Suggestion**: "nit: `1000` appears here and in the tests; a named constant such as `couponMinimumCents` would keep them in step. Happy for this to be a follow-up."

Each comment names the concrete problem, the evidence (a boundary case and a test), and whether it blocks the merge. In this case CI had already failed, which is exactly why automated checks run before human review: people should spend their attention on intent and design, not on what a machine can find.

#### Receiving feedback

- Assume good intent; the comment is about the code.
- Answer every comment: fix it, explain why not, or agree to a follow-up.
- If a thread goes back and forth more than twice, talk briefly, then write the outcome in the thread.
- Thank reviewers for catches; it makes the next review better.

#### Keeping reviews healthy

Small pull requests (a few hundred lines at most) get faster and deeper reviews. Agree on response times, share review load, and let formatters settle style so humans can focus on correctness, security, tests and readability.

Connects to: [collaboration workflow](#/concept/eng.git.collaboration-workflow), [clean code](#/concept/eng.practice.clean-code), [unit, integration and end-to-end tests](#/concept/eng.testing.unit-integration-and-end-to-end-tests), [documentation](#/concept/eng.practice.documentation).

### questions
Q: What makes a code review comment effective?
A: It is specific about the problem and where it is, explains why it matters (ideally with a case or a test), suggests a direction, and says whether it blocks the merge. It is about the code, phrased as an observation or a question rather than a verdict on the author.

Q: What should a pull request description contain?
A: What changed, why it changed (the problem, ticket or decision behind it), how it was tested, and anything reviewers should look at closely or can skip. For UI changes, screenshots; for risky ones, the rollout and rollback plan.

Q: How do you handle a disagreement in code review?
A: Look for facts first: a test, a benchmark, the team's style guide or an earlier decision. If it still isn't settled after a couple of exchanges, talk directly, agree, and record the outcome in the thread; for matters of taste, the author's choice usually wins.

Q: What should reviewers focus on, and what should they leave to tools?
A: People should focus on correctness, edge cases, security, tests, design and whether the code is understandable. Formatting, naming conventions and simple bug patterns should be handled by formatters, linters and CI, so reviews don't spend attention on them.

Q: How do you receive critical feedback on your code?
A: Assume good intent, separate the code from yourself, and look for the point behind the wording. Respond to every comment by fixing it or explaining your reasoning, and thank the reviewer; a caught bug is a win for both of you.

## eng.practice.documentation
name: "Documentation"
importance: advanced
scope: "READMEs and design docs"

### simple
Documentation is the part of a project that explains it to people who weren't in the room: how to run it, how to use it, and why it was built the way it was. A README gets a newcomer from zero to a working setup, and a design document records a plan and its reasons before the code is written. Good documentation works like a map left for the next traveler, including the roads you decided not to take.

### interview
- **README**: what the project does and for whom, how to build, run and test it (commands that work when copied), configuration, and where to ask for help. Keep it short and correct.
- **Design doc** (before building something significant): context and problem, goals and non-goals, the proposal, alternatives considered and why they lost, risks, rollout and open questions. Its value is the discussion it forces early.
- **Decision records (ADRs)**: one short file per significant decision with context, decision and consequences, so later readers learn why, not just what.
- **API and code docs**: interface comments on public functions (what, parameters, errors), generated references (Doxygen for C++, OpenAPI for HTTP APIs), runbooks for operations.
- **Docs as code**: keep them in the repository, review them with the code, and update them in the same pull request that changes behavior.
- Write for a specific reader and task; examples beat abstract descriptions; delete stale docs rather than leaving them to mislead.

### deep
#### Intuition

Code shows what the system does; it rarely shows why, what was tried before, or how to operate it at 2 a.m. Documentation holds that missing context. It rots when it lives far from the code or when nobody owns it, so the most durable docs are small, next to the code, and changed in the same pull request as the behavior they describe.

#### A README that gets someone running

For the notes server from [client-server architecture](#/concept/eng.web.client-server-architecture); every command in it was run in the sessions of that article and of [Docker basics](#/concept/eng.devops.docker-basics):

````markdown
# notes

A tiny HTTP backend that stores short text notes in a file.

## Run it

    g++ -std=c++20 -O2 -o notes notes.cpp
    ./notes                      # listens on 127.0.0.1:8080, data in ./notes.db
    curl -s -d 'buy milk' localhost:8080/notes

Or in a container:

    docker build -t notes:1.0 .
    docker run -d -p 8080:8080 -v notes-data:/data notes:1.0

## API

| method and path | result |
|---|---|
| GET /notes | 200, all notes as a JSON array |
| POST /notes (body: the text) | 201, the new note |
| GET /notes/{id} | 200, or 404 if there is no such note |

## Limits

One request at a time, no authentication, data in one local file. Not for production.
````

#### A decision record

````markdown
# 3. Store notes in a shared database

Status: accepted (2026-09-02)

## Context
Notes live in a file inside each server. Running three replicas (see the Kubernetes
manifest) would give each its own file, so notes would differ between requests.

## Decision
Move notes to one PostgreSQL database that all replicas share.

## Consequences
Replicas become stateless and interchangeable. We now run and back up a database,
and each request adds a network round trip (about a millisecond inside one region).
````

#### Interface comments

Comments on a public function state the contract a caller relies on, not the implementation. Doxygen turns `///` comments like these into reference pages:

```cpp
/// Parses a duration such as "45m", "2h" or "1h30m".
///
/// @param text  one or more number-and-unit pairs; units are `h` and `m`.
/// @return      the total in minutes.
/// @throws std::invalid_argument  if the text is empty, a unit is missing or unknown,
///                                or a number is negative.
long minutes(const string& text);
```

#### Habits

- Put the most-needed information first; people skim.
- Keep commands copy-pasteable, and run them when the code changes (CI can check that a README's build steps still work).
- Date or version decisions; mark superseded ones instead of deleting them.
- Prefer one clear page to five scattered ones.

Connects to: [code review etiquette](#/concept/eng.practice.code-review-etiquette), [clean code](#/concept/eng.practice.clean-code), [grammar and sentence correction](#/concept/apt.verbal.grammar-and-sentence-correction), [designing REST APIs](#/concept/eng.web.designing-rest-apis).

### questions
Q: What should a good README contain?
A: What the project is and who it is for, how to build, run and test it with commands that work as written, the essential configuration, and where to get help or report problems. Anything longer belongs in linked docs.

Q: What goes into a design document?
A: The context and problem, goals and explicit non-goals, the proposed design, alternatives considered and why they were rejected, risks and open questions, and how it will be rolled out and measured. Its main value is getting feedback before code is written.

Q: What is an architecture decision record?
A: A short, dated file recording one significant decision: the context, the decision and its consequences. Kept in the repository, a series of them explains why the system looks the way it does, even after the people involved have moved on.

Q: How do you keep documentation from going stale?
A: Keep it next to the code, change it in the same pull request as the behavior it describes, review it like code, test what can be tested (such as build commands in CI), and delete or clearly mark outdated pages.

Q: What should an interface comment on a function say?
A: What the function does from the caller's point of view, the meaning and valid range of each parameter, the return value, errors or exceptions, and any side effects or preconditions. It should not narrate the implementation.
