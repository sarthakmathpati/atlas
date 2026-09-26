---
topic: career.resume
name: "Projects and resume"
subject: career
order: 2
prereqs: []
---

## career.resume.resume-writing
name: "Resume writing"
importance: must
scope: "one page, impact bullets with numbers, action verbs"

### simple
A resume is an advertisement for an interview, not a record of everything you have done. A reader skims it in well under a minute, so each line has to say what you did and what changed because of it. Think of a shop window: a few well-lit items that make someone walk in, not the whole stockroom.

### interview
- One page for students and new graduates; reverse chronological; a plain single-column layout with standard headings, saved as a PDF.
- Order for a student: contact details, education, experience, projects, skills, achievements.
- Every bullet: an action verb, what you built or changed, how (the key technique or tool), and the result with a number and its baseline.
- Tailor it: put the most relevant experience and keywords from the job description first, as long as they are true.
- Everything on it is fair game in an interview, so keep only what you can explain in depth.
- Cut filler ("responsible for", "worked on", "helped with", "various"), photos, long objective statements and skill ratings out of ten.

### deep
#### What the page has to do

Recruiters and engineers skim resumes quickly and decide whether to spend an hour interviewing you. Many companies also run resumes through software that extracts text, which works best with one column, standard headings (Education, Experience, Projects, Skills) and no text inside images or tables. The page wins when the first few lines of each section show impact.

#### A one-page layout for a student

Kiran's resume, trimmed (Kiran and every name here are made up):

```text
KIRAN
kiran@example.com | +91 00000 00000 | github.com/your-username | Bengaluru

EDUCATION
B.Tech in Computer Science, an engineering college in India     2023 to 2027
CGPA 8.4/10. Courses: data structures, operating systems, databases, networks

EXPERIENCE
Software Engineering Intern, payments team, a fintech company   May to Jul 2026
  (two impact bullets)
Backend Intern, a freight-tracking startup                       May to Jul 2025
  (two impact bullets)

PROJECTS
Campus bus tracker (TypeScript, SQLite)       Order-book simulator (C++20)
  (one or two bullets each)

SKILLS
C++, SQL, TypeScript, Git, Linux, Docker

ACHIEVEMENTS
Ran the programming club's annual contest; 2nd of 38 teams at a college hackathon
```

#### Bullets, before and after

| Before | After |
|---|---|
| Worked on the reconciliation job for the payments team. | Cut false mismatch alerts in nightly payment reconciliation from 40 to 2 a night (95% fewer) by comparing ledger and bank records on one business date. |
| Responsible for improving performance of the reconciliation job. | Reduced the nightly reconciliation run from 42 to 9 minutes (4.7 times faster) by replacing per-row lookups with one batched SQL query and an in-memory hash join. |
| Helped build a live ETA feature using GPS data. | Built map matching for live arrival times of 200 trucks, lowering median arrival-time error from 11 to 4 minutes (64% lower) on a week of replayed GPS data. |
| Made a bus tracking app for campus. | Built a campus bus tracker used by about 600 students a week; calls to the transport office asking where the bus was fell from 30 to 8 a day (73% fewer). |

The percentages and ratios come from the raw before and after numbers, computed rather than guessed:

```cpp
// Before and after measurements, turned into the numbers a resume bullet can quote.
int main() {
    struct Metric { const char* what; double before, after; };
    const vector<Metric> metrics = {
        {"false mismatch alerts per night", 40, 2},
        {"nightly reconciliation run, minutes", 42, 9},
        {"median arrival-time error, minutes", 11, 4},
        {"calls to the transport office per day", 30, 8},
    };
    for (auto& [what, before, after] : metrics)
        printf("%-38s %2g -> %-2g  %.0f%% lower, ratio %.1f\n", what, before, after,
               100 * (before - after) / before, before / after);
}
```

Output:

```text
false mismatch alerts per night        40 -> 2   95% lower, ratio 20.0
nightly reconciliation run, minutes    42 -> 9   79% lower, ratio 4.7
median arrival-time error, minutes     11 -> 4   64% lower, ratio 2.8
calls to the transport office per day  30 -> 8   73% lower, ratio 3.8
```

#### What changed and why

- **A verb that names Kiran's action leads each line**: cut, reduced, built. "Worked on" and "responsible for" say where Kiran sat, not what Kiran did.
- **Every result has a baseline**: "from 42 to 9 minutes" is checkable; "improved performance" is not. The relative number (4.7 times, 95% fewer) is there for a skimming reader, the raw pair for anyone who asks.
- **The how is one concrete technique**, the thing an interviewer can dig into: a batched query and a hash join, a shared business date.
- **The measurement is stated** when it isn't obvious: "on a week of replayed GPS data" tells the reader how the 11 and 4 were measured.
- **Each bullet fits in two lines.** If it doesn't, the detail belongs in the interview.

When you have no measurement, estimate honestly and say "about", or describe the evidence: who used it, what they stopped doing. Never invent a number; interviewers ask how you measured it.

#### Rules that keep a resume out of the reject pile

- One page, consistent dates and formatting, no spelling mistakes (read it aloud, and have someone else read it).
- Put the strongest item first within each section.
- Skills list only what you could be interviewed on today.
- One version per kind of role (backend, quant developer), each tailored from a master document.
- Name the file clearly, such as "Kiran-resume.pdf".

Connects to: [project deep dives](#/concept/career.resume.project-deep-dives), [GitHub and portfolio presentation](#/concept/career.resume.github-and-portfolio-presentation), [the STAR method](#/concept/career.behavioral.the-star-method).

### questions
Q: What makes a strong resume bullet?
A: It starts with an action verb, says what you built or changed, names the key technique, and gives a measurable result with its baseline, such as from 42 to 9 minutes. It fits in about two lines and holds up to follow-up questions.

Q: Why should a student's resume be one page?
A: Readers skim quickly, and a student rarely has more than a page of relevant, strong material. Cutting to one page forces you to keep only the lines that make a case for an interview.

Q: What if you have no numbers for an achievement?
A: Estimate honestly and mark it as approximate, or describe concrete evidence of impact: who used it, what they stopped having to do, what was adopted. Never invent a figure, because interviewers ask how it was measured.

Q: Why avoid phrases like "responsible for" or "worked on"?
A: They describe a position, not an action or a result, so the reader can't tell what you did. Replace them with a verb for your own action and the outcome it produced.

Q: How should you tailor a resume for different roles?
A: Keep a master document, then make a one-page version per kind of role that puts the most relevant experience first and uses the job description's terms where they truthfully describe your work.

## career.resume.project-deep-dives
name: "Project deep dives"
importance: must
scope: "architecture, challenges, trade-offs, metrics, what you would change"

### simple
A project deep dive is an interviewer asking you to open the hood of something you built. They start with "tell me about this project" and keep asking why until they reach the edge of what you know. It is like a guide explaining a building they designed: where the load-bearing walls are, what they would move, and why the stairs are where they are.

### interview
- Open with a 30-second summary: the problem, who it is for, what you built and one result.
- Be ready to draw the architecture and follow one request or one piece of data through it.
- Pick one hard problem and tell it in STAR form: what broke or was hard, what you tried, what worked.
- Name trade-offs as choices with costs: what you chose, the alternative, and why, in this project's terms.
- Quote metrics you measured (size, speed, users, tests) and how; then say what you would change now.
- Be honest about what you did yourself, what was a library, and what a teammate or tool did.

### deep
#### What interviewers probe

A deep dive tests whether you understand your own work. Expect: the summary, the architecture, the hardest problem, why you chose X over Y, how you know it works, and what you would do differently. Each answer invites a deeper "why", so prepare two levels down on the parts you mention.

#### Worked example: Atlas

Atlas, this app, makes a good worked example because every fact is in its repository: `PROGRESS.md`, `CLAUDE.md` and the code.

**The 30-second version.** Atlas is a study map for software and quant interviews: 909 concepts in 18 subjects, each a bubble colored by how well you know it, with a problem tracker, spaced repetition and a daily plan. It runs as a static website and as a single-file claude.ai artifact from one codebase.

**Architecture.**

```text
content/*.md
    | build-syllabus: parse, validate, split the text per subject
    v
syllabus.json + text JSON per subject --build-layout--> layout.json
    |
    v
React pages (map, problems, review) --> Zustand stores, one per domain
    |-- Repository --> IndexedDB | claude.ai db | memory
    |-- FileSaver  --> download | claude.ai downloads | copy dialog
    `-- AIProvider --> an interface for now; providers in phase 6
```

Feature code never touches storage, files or AI directly. The storage and file adapters are chosen once at startup from the detected runtime, and a lint rule forbids importing the storage library anywhere else.

**A hard problem: a map that never moves.** Concept positions come from a seeded force layout, but content is edited every session. The layout file stores a hash of the structure (ids, order, importance and prerequisites), so text edits never move a bubble, and a test fails when the committed layout no longer matches the structure. One session added prerequisites by mistake; that test caught it.

**Trade-offs.**

| Choice | Why | Cost |
|---|---|---|
| Hash routes (`#/map`) | work on GitHub Pages and inside the artifact frame with no server setup | less tidy URLs |
| Concept text loaded per subject | startup syllabus chunk went from 1.5 MB to 370 KB | loading states and a "Try again" path |
| Map bubbles as React Flow nodes, lines as a few SVG paths | only visible bubbles render, and bubbles stay accessible buttons | two rendering layers to keep in sync |
| Native `<dialog>` and the Popover API | real modals and top-layer menus without a UI library | feature checks for older browsers |
| Generated data committed | reviewable diffs; CI fails if it is stale | larger commits |

**Metrics.** From the repository at the end of the content phase: 909 concepts in 146 topics with 574 prerequisite edges; practice banks of 435 LeetCode problems, 98 quant puzzles and 46 design prompts; about 37,000 lines of TypeScript in `src` (generated data excluded) and 435 tests; about 900,000 words of Markdown content with 907 C++ blocks, all compiled by a check script except 13 marked as sketches; and a single-file artifact of 9.09 MB against a 15 MB limit.

**What I would change.** The artifact inlines all concept text, and it grows with every subject, so I would compress the text inside it. The map's 60 frames a second target was never measured on a real phone, only reasoned about. The scripts that compare each content program's output with the text are local scratch tools; I would move them into CI so a changed number fails a build.

#### Being honest about how it was built

Atlas was built in sessions with an AI coding assistant, working from a written specification and recorded decisions. If you present a project like this, say so plainly, then show your part: the decisions you made or reviewed, how you verified the output, and what you would defend in a code review. Interviewers ask follow-ups until they find the edge of your understanding, so know the parts you claim.

Connects to: [discussing trade-offs](#/concept/sysd.method.discussing-trade-offs), [resume writing](#/concept/career.resume.resume-writing), [the STAR method](#/concept/career.behavioral.the-star-method).

### questions
Q: How should you open a project deep dive?
A: With a 30-second summary: the problem, who it is for, what you built and one measured result. It frames everything that follows and lets the interviewer choose where to dig.

Q: How do you present a trade-off in your project?
A: Name the choice, the main alternative, why you chose it in this project's terms, and what it cost you. For example, hash-based routes work without server configuration but give less tidy URLs.

Q: What metrics are worth quoting about a project?
A: Numbers you measured and can explain: size, speed before and after a change, users, tests, bundle size or error rates. Say how you measured them; a vague or unmeasured number invites awkward follow-ups.

Q: Why prepare an answer to what would you change?
A: It shows you can judge your own work and learned from it. Give specific changes with reasons, such as a measurement you never made or a manual check you would automate.

Q: How should you talk about parts of a project built by teammates, libraries or AI tools?
A: Say plainly who or what did each part, then explain your own decisions, how you verified the result and what you would defend. Follow-up questions quickly find anything you claim but don't understand.

## career.resume.github-and-portfolio-presentation
name: "GitHub and portfolio presentation"
importance: important
prereqs: [career.resume.resume-writing]
scope: "GitHub and portfolio presentation"

### simple
Your GitHub profile is a portfolio that interviewers may open before they meet you. A few well-presented projects, each with a clear README and a tidy history, say more than dozens of half-finished ones. It is like an artist's portfolio: five finished pieces with short captions beat a box of sketches.

### interview
- Pin your best few repositories; archive or hide practice clutter.
- Each pinned project's README answers: what it is, why it exists, a screenshot or demo link, how to run it, how it is built, and how it is tested.
- Small commits with clear messages, a sensible `.gitignore`, tests and continuous integration show engineering habits.
- Never commit secrets, and check what you commit: generated files, local databases and keys don't belong in the history.
- A deployed demo (a static site is enough) lets a reviewer try the project in seconds.
- Link the profile on your resume only if it helps; a thin profile is better left off than shown empty.

### deep
#### What a reviewer does in a minute

Someone opening your profile looks at the pinned repositories, opens one README, glances at the commit history and maybe one source file. Make each of those four stops count.

#### A README that answers the first questions

A skeleton for Kiran's bus tracker (made up):

```markdown
# Campus bus tracker

Live positions and arrival times for the campus shuttle, used by students
to stop guessing when the next bus comes.

![Screenshot of the map with two buses](docs/screenshot.png)

## Try it
A deployed demo link, and a test account if one is needed.

## Run it locally
    npm install
    npm run dev

## How it works
Phones on the buses post GPS points every 10 seconds; the server snaps
them to the route and estimates arrival times. See docs/design.md.

## Tests
    npm test
Covers route snapping, arrival estimates and a replay of one day's data.

## What I would do next
Offline mode for the stop display; a better model for traffic at 5 pm.
```

The order matters: what and why first, then proof it works (screenshot, demo), then details for someone who wants to run or read it.

#### History that reads well

Commit messages are part of the portfolio. This repository uses short conventional messages (a type, a scope, then what changed). Run here, at the commit where the previous session's work was merged:

```text
$ git log --no-merges --format='%s' -6 32d07a6
feat(content): Engineering essentials web, DevOps and practice topics; eng finished
feat(content): Engineering essentials Linux and testing topics from recorded sessions
feat(content): Engineering essentials Git topic with real, reproducible command output
feat(content): Aptitude logical and verbal topics; apt finished
feat(content): Aptitude quantitative topic, every answer exact and checked by a C++ program
feat(content): Architecture performance engineering, 13 labelled benchmarks; arch finished
```

Each message says what changed without opening the diff. The same history also holds a mistake worth learning from: a Redis server run during a content session wrote its database file into the working directory, and it was committed with that session's work.

```text
$ git show --stat --format='%h %s' 61fb60d -- dump.rdb
61fb60d feat(content): System Design content for method, scalability, caching and data storage

 dump.rdb | Bin 0 -> 89 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

It was harmless (`redis-check-rdb` reads 0 keys in it), and a later commit removed it and added it to `.gitignore`. Had it been a file with a key or password, deleting it later would not have been enough: it stays in the history, so the secret must be revoked and replaced. Check `git status` and `git diff --staged` before every commit.

#### Portfolio beyond GitHub

- A deployed demo, even a static page, beats a video.
- A short design write-up for your best project doubles as preparation for the [project deep dive](#/concept/career.resume.project-deep-dives).
- Contest ratings or published writing help if they are strong and relevant; otherwise leave them off.

#### Mistakes to avoid

- Pinned tutorial clones or course assignments with no changes of your own.
- READMEs that are the framework's default template.
- Commits named "update", "final" and "final2".
- Keys, passwords or personal data anywhere in the history.

Connects to: [resume writing](#/concept/career.resume.resume-writing), [git basics](#/concept/eng.git.git-basics), [documentation](#/concept/eng.practice.documentation).

### questions
Q: What should the README of a portfolio project contain?
A: What the project is and why it exists, a screenshot or demo link, how to run it, how it works at a high level, how it is tested, and what you would do next. Put what and why first, because most readers stop after a few lines.

Q: Why do commit messages matter on a portfolio?
A: They show how you work: small, focused changes with messages that say what changed read like a professional engineer's history. Messages such as "update" or "final2" suggest the opposite.

Q: You accidentally committed an API key and deleted it in the next commit. Is that enough?
A: No. The key is still in the history and anyone with the repository can read it. Revoke the key and issue a new one first; rewriting history is secondary and doesn't help once it has been pushed somewhere public.

Q: Should every repository be public on your profile?
A: No. Pin and show your best few projects and archive or hide tutorial clones and unfinished experiments, so a reviewer's minute is spent on work that represents you.

Q: What does a deployed demo add over a code repository?
A: A reviewer can try the project in seconds without installing anything, which makes it far more likely they will see it working. It also shows you can ship, not just write code.
