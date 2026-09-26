# PROGRESS

Read `CLAUDE.md` first, then this file, then `BUILD_SPEC.md`. Update this file at the end of every
work session and at least every hour.

**Current state:** Phases 0 to 4 are done (sessions 1 to 4, 24 Sep 2026). Phase 5 (content) is
under way. Session 5 finished DSA (all 249 concepts, every must-know with a deep article, every
pattern with signals and a template) and wrote the pattern drill bank (276 original prompts).
Session 6 finished **OOP** (53 / 53 concepts, a deep article for every one, 24 of them must-know;
246 flashcard questions) and **OS** (65 / 65 concepts, a deep article for every one, 29 of them
must-know; 287 questions). Every C++ block compiles and was run against its worked example;
scheduling, Banker's algorithm, page replacement, disk scheduling and inode numbers were computed
by small simulators. Concept text loads per subject on demand, so the startup bundle stays small.
Session 7 made all written content **C++ only**, as the owner asked: no Python or Java code and no
comparisons with them in DSA, OOP or OS (and a test keeps it that way for every later subject).
Session 8 finished **CN** (55 / 55 concepts, a deep article for every one, 32 of them must-know;
250 flashcard questions, 48 C++ blocks) and **DBMS** (56 / 56 concepts, a deep article for
every one, 24 of them must-know; 247 questions, 41 C++ blocks plus SQL checked on PostgreSQL
16). All C++; every runnable block was executed and its output compared line by line with the
text.
Session 9 finished **SQL** (34 / 34 concepts, a deep article for every one, 20 of them
must-know; 146 questions, 116 SQL blocks written for MySQL 8, every one run on a real MySQL 8.0
and PostgreSQL 16 with all 113 result tables compared cell by cell).
Session 9 also finished **System Design** (79 / 79 concepts, a deep article for every one, 34
of them must-know; 307 questions, 74 C++ simulations, each run and checked against its output).
Session 10 finished **Language core** (46 / 46 concepts, all 22 must-know with deep articles; the
C++ topics and `lang.general` have a deep article for every concept, while the Java and Python
topics are kept short, with deep articles only for their must-know concepts, as the owner asked;
198 questions) and **Concurrency** (20 / 20 concepts, a deep article for every one, 9 of them must-know; 85
questions, 26 C++ blocks, every threaded one run repeatedly under ThreadSanitizer).
Session 11 finished **LLD** (32 / 32 concepts, a deep article for every one, 11 of them must-know;
158 questions; every class design compiles and runs a demo under AddressSanitizer and UBSan, and
each classic article covers every rubric point of its design prompt, checked by a test) and
**Probability** (62 / 62 concepts, a deep article for every one, 30 of them must-know; 309
questions; every number exact and confirmed by a seeded C++ simulation that says how close it
came). It also wrote 57 original quant puzzles (section 8.2 asks for 40 or more), each answer
recomputed independently in the tests, and added links between concepts inside content.
Session 12 finished **Math** (31 / 31 concepts, a deep article for every one, 9 of them must-know;
135 questions; every numeric answer exact and confirmed by one of 31 C++ programs that print the
same output with GCC and clang) and **Puzzles** (21 / 21 concepts, a deep article for every one,
8 of them must-know; 85 questions; each classic family worked on an original instance, proved,
and checked by one of 21 brute-force searches or seeded simulations), and let content link to
quant puzzles (`#/problems/q-…`, CLAUDE.md decision 67).
Session 13 finished **Markets** (28 / 28 concepts, a deep article for every one, 11 of them
must-know; 140 questions; 28 C++ programs, each run under ASan and UBSan with identical output from
GCC and clang, every simulated number reported with its distance in standard errors).
Session 13 also finished **Architecture** (19 / 19 concepts, a deep article for every one, 4 of
them must-know; 82 questions): every claim about data representation is checked by a program
under GCC and clang, and performance effects are measured by 13 benchmarks, each labelled as one
machine's run with the range over five runs.
Session 14 finished **Aptitude** (16 / 16 concepts, a deep article for every one, 5 of them
must-know; 80 questions; 15 C++ programs that solve every worked example exactly or by brute force,
print the answer keys of timed practice lines, and give identical output with GCC and clang).
Session 14 also finished **Engineering essentials** (27 / 27 concepts, a deep article for every
one, 7 of them must-know; 135 questions): every git, shell, Linux, curl, ssh, cron, Docker and
kubectl example was run on the session's machine and its real output pasted (Git with fixed
names and dates, so the hashes repeat), and the 14 C++ programs (a SHA-1 that recomputes Git's
object ids, a notes server, test runners, mocks, a debugging example) were run under sanitizers.
**Next up:** Phase 5 finishes with Career (section 5.3 order), one or two subjects per session,
never two content sessions at once. Follow `content/README.md` → "Writing conventions", run `npm run check:content-code -- <subject>`, and add each finished subject
to `FINISHED` in `tests/syllabus/content.test.ts`. Never change concept metadata (ids, names,
scopes, prerequisites, importance) while writing content: the map layout depends on it, and
`tests/syllabus/layout.test.ts` fails if it moves. For SQL, PostgreSQL 16 is installed in the cloud
environment (start it with `pg_ctlcluster 16 main start`) to run every query for real. The extra
quant puzzles (section 8.2) and the design prompts with rubrics (section 8.4) are complete, so only
concept content remains in Phase 5. The Puzzles and Markets subjects can link to the new puzzles
through their concepts (each puzzle is tagged with 1 to 3 concepts).

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | Done | Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, ESLint, Prettier, Vitest, aliases. Two builds (`dist/`, single-file `dist-artifact/index.html` at about 1.3 MB), `check-artifact.mjs`, `release-artifact.mjs`, CI and Pages workflows. Owner: merge the PR, then Settings → Pages → Source: GitHub Actions. |
| 1. Data foundation | Done | Types and zod schemas; Dexie, claude.ai `db` and memory repositories with an in-memory fake of the `db` contract; migrations and id aliases; runtime detection; services provider; FileSaver adapters; export/import with merge and round-trip tests; `content/` for all 146 topics and 909 concepts; syllabus and layout builds with every validation; all seed banks. 111 tests. |
| 2. Design system and shell | Done | Tokens (plus code, diff, chart and feedback tokens, contrast-checked), component kit (all of section 12.7, including Markdown with KaTeX, the CodeMirror editor, code and diff views, Recharts wrappers), hash router with every F1 route, shell for desktop and phones, Settings, command palette, focus timer and streak, keyboard shortcuts. 166 tests. Screens reviewed at 360, 390, 800, 1280, 1440 and 2560 px in both themes; artifact tested with a simulated claude.ai runtime (synced and fallback). |
| 3. Version 1: problem tracker | Done | Library (filters in the URL, sorting, grouping, stats, quick add, CSV import with preview and undo), workspace (split view or tabs, CodeMirror, language and template, timer, 2-second drafts, save dialog, attempts timeline, code viewer, diff, re-solve mode with reveal), offline hint ladder, scheduling and Review page with badges, mistake journal with tag management and merge, Markdown export of notes, palette commands. 256 tests. Screens reviewed at 390, 800, 1280 and 1440 px in both themes; the artifact file tested with a simulated claude.ai runtime (synced storage survives reload, notes download through `downloads`, no network requests). |
| 4. Version 2: map and concepts | Done | React Flow map (far, middle, near zoom; regions; prerequisite and connection lines; fixed-size labels that never overlap; filters in the URL; focus mode; dragging with saved positions; minimap; search fly-to with pulse; right-click and long-press menus; ink moment), concept panel and page, "Why this color?", manual status and never fade, welcome and self-assessment, path to a concept, offline flashcards and explain it back, concept reviews, the owner's own concepts, Today additions. 314 tests. Screens reviewed at 390, 1280 and 1440 px in both themes; artifact tested with a simulated claude.ai runtime (statuses and notes survive reload, no network requests). |
| 5. Content | In progress | Split across sessions, one or two subjects each, never in parallel. Session 14: Engineering essentials complete (27 / 27, 7 / 7 must-know deep, 27 deep in all; real command output from recorded sessions, 14 C++ programs; Docker ran for real, Kubernetes could not and says so). Aptitude complete (16 / 16, 5 / 5 must-know deep, 16 deep in all; 15 C++ programs run under ASan and UBSan with identical GCC and clang output; exact fractions for quantitative answers, brute force for arrangements, relations, syllogisms, series, codes and data sufficiency; timed practice with printed keys). 424 tests. Session 13: Markets complete (28 / 28, 11 / 11 must-know deep, 28 deep in all; 28 C++ programs with identical GCC and clang output, every simulated number within 1.9 standard errors of its exact value) and Architecture complete (19 / 19, 4 / 4 must-know deep, 19 deep in all; representation claims checked by programs, 13 labelled benchmarks with five-run ranges); the code check's prelude gained `<immintrin.h>`. 420 tests. Session 12: Math complete (31 / 31, 9 / 9 must-know deep, 31 deep in all) and Puzzles complete (21 / 21, 8 / 8 must-know deep, 21 deep in all); all 52 C++ programs run under ASan and UBSan and print the same output with GCC 13 and clang 18; content can link to quant puzzles (checked by the build and a test); the map panel opens a linked concept at the top. 412 tests. Session 11: LLD complete (32 / 32, 11 / 11 must-know deep, 32 deep in all; every design runs a demo under ASan and UBSan, all under ThreadSanitizer too; each classic covers its prompt's rubric, tested) and Probability complete (62 / 62, 30 / 30 must-know deep, 62 deep in all; 62 seeded simulations with identical output from GCC and clang). 57 original quant puzzles; links between concepts in content (checked by the build, opened in the map panel). 402 tests. Session 10: Language core complete (46 / 46, 22 / 22 must-know deep, 36 deep in all: every C++ and `lang.general` concept, plus the must-know Java and Python ones); every C++ block run under ASan and UBSan at -O1 and -O2, Java 21 and Python 3.11 examples run; the code check gained GCC's policy-based tree headers, `<coroutine>` and a marker for blocks that warn or show undefined behavior on purpose. Concurrency complete (20 / 20, 9 / 9 must-know deep, 20 deep in all); every threaded example run many times under ASan, GCC and clang ThreadSanitizer and at -O2. Backticks in scope text now show as inline code (`CodeSpans`). 362 tests. Session 5: DSA complete (249 / 249, 115 / 115 deep, 90 / 90 patterns); every C++ and Python block compiles (`check:content-code`) and was run against its worked example or a brute force. Pattern drill bank: 276 prompts. Concept text split into per-subject chunks loaded on demand. 327 tests. Session 6: OOP complete (53 / 53, 24 / 24 must-know deep, 53 deep in all) and OS complete (65 / 65, 29 / 29 must-know deep, 65 deep in all); `check:content-code` now also compiles Java blocks and has POSIX headers for C++. 335 tests. Session 9: SQL complete (34 / 34, 20 / 20 must-know deep, 34 deep in all); every query run on MySQL 8 and PostgreSQL 16. System Design complete (79 / 79, 34 / 34 must-know deep, 79 deep in all); 74 C++ simulations run with sanitizers; Redis commands checked on Redis 7. 353 tests. Session 8: CN complete (55 / 55, 32 / 32 must-know deep, 55 deep in all) and DBMS complete (56 / 56, 24 / 24 must-know deep, 56 deep in all); the code check gained socket headers; example URLs use reserved documentation domains (CLAUDE.md decision 59); SQL examples, isolation levels, deadlocks and query plans were checked on a real PostgreSQL 16. 345 tests. Session 7: C++ only at the owner's request (CLAUDE.md decision 58): 149 Python blocks removed from DSA; every Python and Java example in OOP and OS rewritten in C++ and run; text reworded around C++; "equals and hashCode in Java" renamed "Equality and hashing" with its id kept; a test forbids Python or Java in any concept outside the `lang` Java and Python topics. 337 tests. |
| 6. Version 3: Claude inside | Not started | |
| 7. Version 4: planning and insight | Not started | |
| 8. Practice extensions | Not started | |
| 9. Polish and ship | Not started | |

## Features (BUILD_SPEC.md section 9)

Status: **Not started**, **Foundation** (data or logic exists, no UI yet), **In progress**, **Done**.

| ID | Feature | Phase | Status | Notes |
|---|---|---|---|---|
| F1 | App shell, navigation and theme | 2 | Done | Sidebar (collapsible; collapsed by default under 1024 px), top bar, bottom tabs and More sheet under 768 px, every route in the spec (plus a `#/practice` hub and `#/kit`), toasts with Undo, skeletons while loading, error boundaries (app and per page) with "Export my data", no-flash theme. The Ask Claude button opens a drawer with the context chip; the chat itself is F20 (Phase 6). |
| F2 | Knowledge map | 4 | Done | React Flow canvas on a drafting grid with adaptive spacing. Far (below 0.3): subject cards over tinted organic regions, progress ring (share strong), coral fading badge, cross-subject links bundled per subject pair (thickness by count). Middle (to 0.7): topic cards with a status bar (culled when crowded), topic prerequisite arrows, status dots, faint subject names. Near: concept bubbles in the four status shapes, sized by importance, P mark for patterns, clock when due, dot for linked problems (bigger for 3+), diamond for your own concepts, labels that never overlap. Level changes cross-fade. Pan, zoom, pinch, zoom buttons, fit all; click a region or topic to fly there; click a concept to open the panel; hover tooltip plus prerequisite and dependent highlight; right-click or long-press menu (studied, set status, flashcards, explain it back, Ask Claude, path, add to plan, hide); drag with a mouse to move (saved, Reset layout with undo); filters (subjects, status, importance, ready to learn, due, track override, advanced, hidden) in the URL; focus mode (1 or 2 steps); minimap with status dots; search jump flies and pulses; add your own concept from a topic's menu or the map menu; the ink moment when a concept turns strong; list view (F30). Dragging is off on touch screens (touch pans; long-press opens the menu). 60 fps couldn't be measured in the headless browser; only visible bubbles render and each subscribes to its own status. |
| F3 | Concept panel | 4 | Done | Side panel (resizable, from 768 px) or bottom sheet on the map, and `#/concept/<id>` as a page. Header: breadcrumb, name, status chip with "Why this color?" (knowledge and its sources, practice by difficulty, reviews, what would turn it green, manual status and never fade), importance, minutes, tracks, pattern, unverified, yours, hidden. Learn: Simple, Interview, Deep (remembered per concept; Simple for not started), scope, Mark as studied, Flashcards, Explain it back, Quick quiz and Ask Claude (phase 6 dialogs), interview questions with hidden answers, Learn first, Unlocks, Connected ideas (fly the map there). Practice: suggested next problem (easy, medium, hard ramp), linked problems with status and next review, signals and template for patterns (when written), drill (phase 8). Notes: autosaved Markdown with preview (side by side when wide), saved answers (move into notes, delete with undo), your explanations. Ask: what arrives in phase 6. Back and forward through visited concepts. "Explain with Claude" for missing content arrives in phase 6. The text loads with its subject (skeleton meanwhile, "Try again" if it fails). |
| F4 | Mastery status and colors | 4 | Done | Section 11.2 engine with tests; statuses refresh after attempts, checks, studied, manual status, on start and at midnight. Manual status (a manual strong counts as a 0.8 check and still fades when overdue), never fade, "Why this color?" computed by the same functions as the status, status changes to strong or fading logged per day, the ink moment. |
| F5 | Onboarding and self-assessment | 4 | Done | `#/welcome` on first visit (re-run from Settings → Profile or Today): name and track, interview date and language (suggests C++ for quant), daily time and balance, per-subject self-assessment with topic checklists (some: 0.3, learning; comfortable: 0.5 plus reviews from tomorrow, at most 15 a day, must-know first), Claude mode, CSV import. Skippable; answers editable later. Today then shows ready-to-learn concepts; the full plan comes with the planner (phase 7). |
| F6 | Problem library | 3 | Done | All 435 LeetCode (incl. SQL), 98 quant (41 from the spec, 57 original) and 46 design prompts plus the owner's own. Columns: status, number and title, difficulty, patterns, last result, last tried, next review, star; cards on phones. Filters (status incl. mastered, difficulty, source, topic or subject, pattern, owner tags, due, starred, premium) combine and live in the URL; sort by any column; group by topic; header stats. Quick add (link, number or title; own problems prefilled from the slug; offline "Suggest patterns"). CSV import with preview, options and undo. Renders progressively. Claude pattern suggestions in Phase 6. |
| F7 | Problem workspace, code saving and attempts | 3 | Done | Split view (resizable) or Problem/Code tabs; insight, summary, notes (write/preview), own tags, link editing, own-problem editing and delete with undo; CodeMirror with language picker (profile language, SQL for SQL, plain text for puzzles), starter template toggle, timer (auto-start on first keystroke, counts toward activity); drafts autosave in 2 s and on leaving; save dialog (four results with honest locks, minutes from the timer, complexities, approach, mistake tags with inline add, insight nudge on the first solve); attempts timeline, code viewer, copy into editor, delete with undo, two-attempt diff; toast with the next review. Review my code and Dry run are Claude features (Phase 6, honest dialogs). Not built: the optional JavaScript runner (stretch goal). |
| F8 | Mistake journal | 3 | Done | Top mistakes for 30 days, 90 days or all time with trend arrows; pre-interview checklist (top 5, editable "how to avoid it"); by category; "where they happen" by pattern; every attempt per tag linking to its code; manage tags (add, rename, category, how to avoid, archive, merge with re-tagging and undo). "Suggest with Claude" in Phase 6; the checklist joins revision sheets in Phase 7. |
| F9 | Re-solve reminders and review queue | 3 / 4 | Done | Problems: section 11.1 scheduling (tested table by table), Review page most urgent first with reasons and estimates, coming up this week, mastered count, badge, re-solve mode with hidden earlier work and Reveal, "Bring it back for review", retirement, tricky problems, local-midnight rollover. Concepts: due concepts on the Review page with a short review (interview points, then flashcards or explain it back; counts even before the due date), "Flashcards for all", schedule moved by each check (tested). |
| F10 | Pattern drill | 8 | Foundation | The seed bank is written: 276 original prompts in everyday settings, each with its answer patterns, a one-line key insight and a difficulty; every one of the 90 patterns is the main answer of at least 3 (tested). The drill page arrives in phase 8. |
| F11 | Hint ladder | 3 / 6 | In progress | Offline ladder done: nudge, approach, pseudocode (warning first), revealed by clicks only, hints used saved on the attempt (and in the draft), "Show full solution" with confirmation opens the LeetCode editorial or a puzzle's answer and marks "saw the solution". Works for every seed problem with patterns (tested). With DSA written, the nudge uses the pattern's first signal as a clue, the approach lists its signals and the pseudocode is its C++ template. Claude-written, cached hints in Phase 6. |
| F12 | Claude code review and dry run | 6 | Foundation | Code review zod schema. |
| F13 | Explain it back | 4 / 6 | In progress | Offline self-check done: 40-word minimum with a gentle counter, then tick the interview points (or scope parts) you covered; score = ticked / total, saved as a check with your text; history in the Notes tab. Claude grading arrives in phase 6. |
| F14 | Quizzes and flashcards | 4 / 6 | In progress | Offline flashcards done: one concept, a topic, a subject or everything due (`#/quiz`, the panel, the map menu, Review, search); Again, Hard, Good, Easy; one check per concept per session; moves the review schedule; recall cards until questions are written. Claude quick quizzes arrive in phase 6. |
| F15 | Mock interview | 8 | Foundation | MockSession storage, feedback schema. |
| F16 | Today plan | 7 | Foundation | Today shows "Ready to learn next" (section 11.5, top 5), the fading count, re-solves due, and plan items added from the map or a path (done, remove with undo, Start); items complete themselves when the owner does them. The planner (11.4) arrives in phase 7. |
| F17 | Readiness dashboard | 7 | Foundation | Readiness scores (section 11.3: concept, subject, overall with track weights) in `lib/readiness/score.ts`, tested. |
| F18 | Weekly review | 7 | Not started | |
| F19 | Revision sheet generator | 7 | Not started | FileSaver adapters ready. |
| F20 | Ask Claude anywhere | 6 | Foundation | AIProvider interface. Drawer (bottom sheet on phones) opens from the top bar or `a`, with the context chip for the current concept or problem. |
| F21 | AI modes and settings | 6 | Foundation | Settings → Claude shows the detected runtime, lets the owner pick Built-in Claude (when `sample` exists) or Copy prompt, and edit the model per tier. The API key field and Test connection arrive with the providers. |
| F22 | Export, import and backup | 3 | Done | Settings → Data exports (download, `downloads` capability, or copy dialog), imports with a preview then Merge or Replace (typed REPLACE, undo from the toast), resets (typed RESET, offers an export first, undo from the toast), shows the last backup, the backup banner, and "Export notes": concept notes, saved answers and problem insights, summaries and notes as Markdown grouped by subject and topic. Round-trip and merge tests. |
| F23 | Search and command palette | 2 | In progress | Ctrl/Cmd + K or `/`: fuzzy search (typos, numbers like 743) over subjects, topics, concepts (the owner's own too), problems (including the owner's own), puzzles, design prompts and mistake tags, grouped with icons and status glyphs; concepts open on the map (fly and pulse); Go to every page; commands (New attempt for…, Start flashcards for due concepts, Show my path to…, Add a concept, Add a problem, Import problems from CSV, Ask Claude, Export backup, themes, sidebar, shortcuts); recent picks; index built when idle; queries well under 50 ms (tested). Later: notes and stories in the index, Start drill, Generate 1-day revision sheet. |
| F24 | Settings | 2 | In progress | Profile (name, track, interview date, main language, other languages to count, daily time, balance, focus subjects, hide premium), Appearance (theme, reduced motion, map labels, advanced concepts), Learning (review intensity, streak freeze, focus and break lengths, timer auto-start), Claude (mode, models), Data, About (version, runtime, storage used, data version, shortcuts, design kit). Re-run the welcome questions from Profile. Later: API key (Phase 6). |
| F25 | Path to a concept | 4 | Done | "Show my path here" (map menu, panel menu, search command): unmet prerequisites in learning order with status and minutes, total time, highlighted on the map at every zoom (the rest dims), Add to plan (next one or two), Set as focus. Tested on hand-checked examples. |
| F26 | Design practice (LLD and HLD) | 8 | Foundation | 46 original prompts with rubrics, one per `lld.classics` / `sysd.classics` concept, each at least 3 sentences (checked). Every LLD classic's article covers its prompt's "must discuss" points (tested). |
| F27 | Behavioral story bank | 8 | Foundation | The 30 spec questions with suggested story tags. |
| F28 | Quant practice: puzzles and mental math | 8 | Foundation | The 41 spec puzzles and 57 original ones across probability, math, puzzles and markets (easy to hard), every checkable answer verified by independent computation in tests; safe answer checker (`lib/quant/answerCheck.ts`: fractions, decimals, %, e, pi, sqrt, variables, yes/no; no eval). The puzzle page and answer checking arrive in phase 8. |
| F29 | Focus timer, activity heatmap and streak | 7 | In progress | Focus timer in the top bar (focus and break; lengths in Settings); the activity clock adds minutes to today without double counting (the attempt timer is a source too); attempts, solves, re-solves and concepts touched are counted per day; streak with the weekly freeze (tested); minutes and streak shown small in the top bar. Heatmap on the dashboard in Phase 7. |
| F30 | Accessibility, keyboard, mobile and performance | 9 | In progress | Shortcuts: Ctrl/Cmd + K, `/`, `g` + t/m/p/r/d/s, `a`, `?`, Esc (single keys ignored while typing or in a dialog). Skip link, page headings take focus after navigation, landmarks, labelled icon buttons, 44 px touch targets on phones, reduced-motion override, contrast-checked tokens (code and chart colors too). Map: list view with statuses and status mixes (the accessible alternative), bubbles are labelled buttons (Enter opens, Shift+F10 or the context-menu key opens the menu), map key explains the symbols. Full audit in Phase 9. |

## Content (Phase 5)

Counts from `npm run build:syllabus`. Required: simple, interview and questions for every concept;
deep for every must-know concept; signals and template for every pattern.

| Subject | Concepts with core content | Must-know with deep | Patterns with signals and template |
|---|---|---|---|
| lang | 46 / 46 | 22 / 22 | – |
| dsa | 249 / 249 | 115 / 115 | 90 / 90 |
| oop | 53 / 53 | 24 / 24 | – |
| lld | 32 / 32 | 11 / 11 | – |
| os | 65 / 65 | 29 / 29 | – |
| conc | 20 / 20 | 9 / 9 | – |
| arch | 19 / 19 | 4 / 4 | – |
| cn | 55 / 55 | 32 / 32 | – |
| dbms | 56 / 56 | 24 / 24 | – |
| sql | 34 / 34 | 20 / 20 | – |
| sysd | 79 / 79 | 34 / 34 | – |
| prob | 62 / 62 | 30 / 30 | – |
| math | 31 / 31 | 9 / 9 | – |
| puzzles | 21 / 21 | 8 / 8 | – |
| markets | 28 / 28 | 11 / 11 | – |
| apt | 16 / 16 | 5 / 5 | – |
| eng | 27 / 27 | 7 / 7 | – |
| career | 16 / 16 | 6 / 6 | – |

## Known issues and notes

- **Phase 5 notes (session 14, Engineering essentials):** all 27 concepts have simple, interview,
  questions and a deep article (must-know articles 623 to 882 words), 135 questions. Every command
  shown was run on the session's cloud machine (Ubuntu 24.04, git 2.43, bash 5.2, curl 8.5,
  OpenSSH, cron, Docker 29.3, kubectl 1.31) and its output pasted unchanged; a scratch checker
  confirms every transcript block in the text is byte-for-byte a recorded run. Sessions that need
  a terminal (job control, Ctrl-Z and Ctrl-C, background jobs, shell error messages) were recorded
  by feeding keystrokes to an interactive bash on a pseudo-terminal, so they show exactly what a
  terminal displays; carriage returns and escape codes are resolved the way a terminal would.
  Git sessions fix author names and dates (`GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`), so their
  hashes are reproducible (each was recorded twice with identical output); a C++ SHA-1 recomputes
  the blob, tree and commit ids Git printed. Machine-specific values (PIDs, paths, times, sizes,
  image ids, the random SSH key) are labelled as such. Linux: real users and groups, setgid and
  sticky bits, `pam_umask` giving users 002; ssh key login and a port forward to a local sshd; a
  backup script run by a real cron job, whose captured environment corrected a draft claim
  (Ubuntu's cron takes `PATH` from `/etc/environment` through PAM, and jobs get no `TZ`). Web: a
  small C++ notes server (checked under ASan and UBSan with odd inputs) used by curl in several
  articles; a REST router showing offset pagination duplicating an item that cursor pagination
  doesn't; a JSON writer checked with jq (jq 1.7 keeps 2^53 + 1 until it does arithmetic); an
  HS256 token built with openssl and checked against an independent HMAC. Testing: a tiny C++ test
  runner across the pyramid (timings labelled as one run with five-run ranges), a real red,
  green, refactor sequence where a refactor to `from_chars` was caught accepting "-5m", stubs,
  spies and mocks through interfaces, and gdb plus sanitizers on a program with two bugs (and
  stdout lost to buffering when piped). DevOps: a real multi-stage Docker build (the loopback
  pitfall reproduced and fixed; 461 MB build stage against a 121 MB image; a volume surviving
  container replacement). Docker Hub's anonymous pull limit was reached during the session, so
  both stages use the one base image already present; the package mirror is reached over plain
  HTTP without the HTTPS-only proxy. **Kubernetes could not run**: kind's node container started,
  but runc inside it can't start nested containers on this VM, so that article shows only
  `kubectl` output that works offline and a manifest validated by kubeconform, and explains what
  `kubectl apply` would do. GitHub Actions can't run here either; the workflow file is shown and
  the pipeline script it calls was run. `needsReview: true` on "Cloud service models" (product
  names and prices change). Other catches: a refactor that rounded a discount differently (a
  comparison harness found 6 of 24 cases off by a cent), and a test program whose `main` returned
  both `int` and `bool` (the code checker's deduced return type rejected it). Screens reviewed:
  transcripts, code and tables at 1280 and 390 px in light and dark; no console errors, no page
  overflow.

- **Phase 5 notes (session 14, Aptitude):** all 16 concepts have simple, interview, questions and
  a deep article (must-know articles 879 to 896 words; the important ones with bigger checking
  programs run to about 1,050), 80 questions. Every question, passage, table and puzzle is
  original. Every worked example was solved by hand first and then confirmed by one of 15 C++
  programs (`check:content-code` compiles them; each was run under ASan and UBSan with GCC 13 and
  at -O2 with clang 18, with identical output, and a scratch runner compared every output line with
  the text): exact fractions for percentages, ratios, work, interest and mixtures (including the
  successive-percentage and equal-selling-price shortcuts checked for every whole percentage), a
  1 ms step simulation of trains in exact integer units, minute-by-minute chases, an alternating
  work schedule played turn by turn, enumeration for every counting and probability item, a
  brute-force rule finder for number series (with the wrong-term repair and the degree-4
  polynomial that makes 1, 2, 4, 8, 16 continue with 31), every seating arrangement checked
  against the clues (each puzzle has exactly one answer, with the count after each clue), blood
  relations by trying every unstated sex and naming the shortest path in the family graph (it
  reports "not determined" when models disagree), syllogisms against every Venn diagram (128 for
  three terms, 32,768 for four), a letter-code rule finder and a sentence-code solver, walks with
  bearings, and data sufficiency by counting distinct answers over candidate ranges. Quantitative
  concepts end with timed practice lines whose keys the programs print, as the Math mental-math
  concepts do; the logical ones end with practice puzzles solved by the same programs. Verbal
  concepts use an original passage and original sentences, give the rule behind each correction,
  and list style and usage points (fewer or less, who or whom, singular they, split infinitives,
  final prepositions, collective nouns) separately from grammatical rules. Caught while writing: a
  practice key that computed the wrong quantity (B more than A), a sentence-code solver that
  applied its exclusions in the wrong order, a data-sufficiency practice item whose statements
  contradicted each other, a blood-relation solver that created parents before applying the
  "parent's spouse" convention (rewritten as a path search), and a percentages example whose
  numbers (20% up, 20% down, 4%) would have given away the linked quant puzzle (changed to 25%).
  Nothing needed `needsReview`. Screens reviewed: deep articles with tables and code at 1280 and
  390 px in light and dark; no console errors, no page overflow.

- **Phase 5 notes (session 13, Architecture):** all 19 concepts have simple, interview, questions
  and a deep article (must-know articles 674 to 870 words), 82 questions. Data representation is
  checked, not asserted: two's complement bit patterns, negation, sign extension, narrowing,
  shifts against division and unsigned wraparound (and UBSan's report for signed overflow, which
  is never run as normal code); IEEE 754 fields, the exact stored values of 0.1, 0.2 and 0.3,
  ulps, 2^53, special values and summation order with Kahan; byte order with `htonl` and a
  misread length field; struct padding with `offsetof`; a validating UTF-8 decoder. Simulators
  give deterministic numbers for a toy CPU, a 5-stage pipeline (20, 13 and 11 cycles), a 2-bit
  branch predictor and a set-associative cache that classifies compulsory, capacity and conflict
  misses. Everything else is measured on the session's 4-vCPU x86-64 virtual machine (48 KiB L1d
  and 2 MiB L2 per core, 260 MiB L3 reported, one NUMA node): each benchmark names its build flags
  on its first line, takes the best of several batches where noise matters, shows one run and gives
  the range over five runs in the text. Results: latency by working-set size (1.5 ns in L1 to
  190 to 340 ns at 1 GiB), rows against columns (13 to 15 times), one int or a whole line costing
  the same trip to memory, sorted against random branches (20 to 26 ms against 162 to 167 ms once
  if-conversion is turned off; plain `-O2` removes the branch itself), conflict misses from a
  power-of-two row pitch (17 to 21 ms against 3.4 to 3.9 ms padded), dependency chains against
  independent accumulators and overlapping cache misses, a latency table (mutex, allocation,
  system call, memcpy, threads, pipes, fsync), array of structs against struct of arrays (2.1 to
  2.6 times), AVX2 intrinsics (about 6 times), system calls against the vDSO and context switches on
  one CPU and across CPUs, `-O0` to `-O3`, a SIGPROF sampling profiler next to real `perf` output
  (software clock only: this VM exposes no hardware counters; `apt-get install linux-tools-generic`,
  then run `/usr/lib/linux-tools-*/perf` directly), and allocation tails, spin against sleep wake-up
  and page-fault cost. NUMA can't be measured on a one-node machine, so that concept shows the
  topology and first touch and is marked `needsReview` for its quoted remote-access penalty.
  Found on the way: GCC kept a 4-accumulator array in memory until the loop was fully unrolled,
  a pure SIMD sum was hoisted out of its timing loop (fixed with a compiler barrier), a cache-line
  experiment that fitted in the large L3 (moved to 512 MiB), and a signed overflow in the profiler
  example caught by UBSan (all benchmark programs were also run under ASan and UBSan). Timings on
  this shared machine drift during the day (one `-O2` benchmark ran twice as fast in the
  afternoon), so the text compares builds side by side. `check:content-code` now includes
  `<immintrin.h>`. Screens reviewed: deep articles with tables, code, assembly and pipeline
  diagrams at 1280 and 390 px in light and dark; no console errors, no page overflow. The artifact
  is 8.65 MB.
- **Phase 5 notes (session 13, Markets):** all 28 concepts have simple, interview, questions and
  a deep article (must-know articles 575 to 897 words), 140 questions. Every number is exact first
  and confirmed by one of 28 C++ programs; each was run under ASan and UBSan with GCC 13 and clang
  18 (identical output), and a scratch runner compared every output line with the text. Books,
  prices, firms and games are made up; no real market data or firm is named. Programs: five
  instruments priced side by side, an order book walked by a market order (microprice, impact), a
  sequence of order types including a stop cascade, IOC and FOK, a market maker earning the spread
  (1,000-step paths, exact expected P&L), price-time against pro-rata allocation and an opening
  auction uncross; a dice market game where the counterparty has seen one die (what each trade
  reveals), edge over repeated trades (exact DP for sums of dice: 95% chance of profit first at 88
  trades, dipping at 90 because of ties), Glosten-Milgrom quotes with a million simulated trades
  and Bayesian quote updates, inventory skew (a small skew cuts P&L noise by 4 times for 3% less
  profit), a multi-round card trading game with its P&L split into edge and inventory, and an
  estimation market checked by counting primes; de Méré's two bets, Kelly growth at 0.5 to 3 times
  Kelly (half Kelly keeps 76% of the growth; the chance of ever halving is 0.482 and 0.123, near the
  continuous 1/2 and 1/8), gambler's ruin, certainty equivalents against Arrow-Pratt; option payoff
  tables with a text chart, a put-call parity arbitrage, time value (negative for deep in-the-money
  European puts; the at-the-money price over sigma S sqrt(T) tends to 1/sqrt(2 pi)), Greeks by
  formula and by finite differences plus the Black-Scholes equation to 1e-15, delta hedging whose
  error halves when rebalancing is 4 times as frequent, Black-Scholes against a million-path Monte
  Carlo (1.43 SE) and a binomial tree, a volatility smile from a two-regime mixture; compounding,
  NPV and IRR, a cash-and-carry forward arbitrage, Cholesky-correlated portfolio variance, the
  noise in a 5-year Sharpe ratio (standard error 0.445 against a true 0.375), normal against
  fat-tailed VaR and expected shortfall (exact Student t in closed form) and VaR failing
  subadditivity; pure and mixed Nash equilibria, a rock-paper-scissors variant solved exactly and
  by a million rounds of fictitious play, a 2 by 3 game by the lower envelope, revenue
  equivalence and the winner's curse. Every simulation landed within 1.9 standard errors of its
  exact value. `needsReview: true` on "Order types" and "How exchanges match orders", whose
  details (stop triggers, time-in-force names, pro-rata rules, auction tie-breaks) vary by venue.
  Caught while writing: a guessed share of losing market-maker paths (9%; the run says 6.7%, since
  the P&L has fat tails) and an auction tie at two prices that needed an explicit tie-break.
  Screens reviewed: deep articles with code, output tables and a text chart at 1280 and 390 px in
  light and dark; no console errors, no page overflow. The artifact is 8.52 MB.
- **Phase 5 notes (session 12, Math):** all 31 concepts have simple, interview, questions and a
  deep article (must-know articles 609 to 774 words), 135 questions, math in KaTeX with short,
  complete proofs and stated assumptions. Every numeric answer is worked out exactly first and
  confirmed by a C++ program (`check:content-code` compiles all 31; each was run under ASan and
  UBSan at -O1 and with clang -O2, and a scratch runner compared every output line with the
  text): brute-force counts for combinatorics and number theory (four-digit numbers, BANANAS,
  capped stars and bars, derangements against the recurrence and n!/e, every remainder pattern
  for the prefix-sum pigeonhole claim, Catalan numbers from all bracket strings, Pascal
  identities up to row 30, divisor counts, Legendre's formula, CRT, the |a - b| game over every
  move sequence, all 2^21 handshake graphs), exhaustive checks for proofs (L-tromino tilings for
  all 64 holes, stamps, Euclid numbers factored, every tournament on up to 7 players), numerical
  checks for calculus (grid searches, finite differences, a shadow price, Simpson's rule, Taylor
  errors against their Lagrange bounds, rejection sampling, Euler against RK4) and linear algebra
  (matrix powers, exact rational Gauss-Jordan for a 3 by 3 inverse, power iteration, a million
  Cholesky-correlated returns, sampled PCA). Mental math teaches techniques with worked examples
  and timed practice lines whose answer keys the programs print, plus a Fermi error model and a
  seeded drill generator; the speed-drill article names no firm and says formats vary (80
  questions in 8 minutes is described as a widely reported format). Caught while writing: a
  guessed n!/e value, a guessed count, the misleading "reduce the exponent" example (replaced),
  and a prerequisite added by mistake (the layout test caught it; metadata is unchanged).
  Nothing needed `needsReview`.
- **Phase 5 notes (session 12, Puzzles):** all 21 concepts have simple, interview, questions and
  a deep article (must-know articles 591 to 896 words), 85 questions. The method topic teaches
  the toolkit (small cases, symmetry, working backwards, invariants, counting information) and
  how to talk while solving, with a transcript. Every classic family has a worked example in
  original wording that is not in the quant bank, proved in the text and checked in C++: an
  exhaustive search over weighing plans (reproducing 3^k, (3^k - 3)/2 and (3^k - 1)/2 for 2 and 4
  weighings), BFS and Dijkstra for crossings (and the two-plan bridge rule against 2,000 random
  groups), every guess-or-pass plan for three hats (531,441), the remainder strategy for up to 6
  players, knights and knaves by enumeration, a backward-induction solver, egg drop by DP and by
  playing all 51 thresholds, all 8! horse orders plus an exhaustive search over match plans for
  the knockout runner-up (n + ceil(log2 n) - 2 for 2 to 6 players), every event of two
  hourglasses and two uneven ropes, binary and weight-limited poison codes, a clock scan, exact
  Monty Hall variants plus simulation, exact birthday thresholds (119 people for 4-digit codes,
  77,164 ids for 32 bits), Penney's game solved and simulated, all 2,598,960 poker hands, the
  two-envelope table under a real prior, real colliding ants against the ghost shortcut in
  100,000 runs, Nim against brute force on 512 positions and a mixed Sprague-Grundy game,
  take-away tables, and auction bids by simulation and grid search. Found on the way: the
  clock scan landed exactly on 3:00 and 9:00 and first counted 20 right angles (fixed), "take 2
  or 5" has period 7, not 5 (the text now says so), and a birthday simulation with 200,000 rooms
  came out 2.75 standard errors low; 7 other seeds scattered evenly around the exact value, so it
  was a fluke, and the article uses a million rooms (0.1 standard errors). Articles link the
  matching quant puzzles for practice and Probability and Math concepts instead of repeating
  them; a linked puzzle's answer is never stated next to the link, though the general bounds
  the concepts teach (3^k weighings, n - 1 knockout matches) do determine some bank answers.
- **Session 12 fixes:** a Markdown table cell in `dsa.strings.string-basics` had `|` inside math
  (`O(|s| + |t|)`), which split the cell; it now uses `\lvert … \rvert`, and so does any new
  table. The map panel kept its scroll position when a concept link opened another concept; it
  now starts at the top. Screens reviewed: deep articles with tables, matrices, code and output
  in Math and Puzzles at 1280 px and 390 px in light and dark, and link clicks in the map panel
  (a concept link opens in the panel, a puzzle link opens the puzzle); no console errors, no page
  overflow. The artifact is 8.33 MB (limit 15 MB).

- **Phase 4 notes (session 4):** the map uses React Flow 12 (`@xyflow/react`), pinned; its
  attribution is hidden (a personal project) and its link strings are rewritten at build so the
  artifact check passes. On touch screens, bubbles can't be dragged (touch pans the map; long-press
  opens the menu). The 60 fps budget couldn't be measured in the headless browser here; only
  visible bubbles render, statuses re-render one bubble, and lines are a few SVG paths. Content is
  still empty (Phase 5), so flashcards use recall cards and explain it back uses scope parts
  until questions and interview points are written. Screens reviewed: map at far, middle and
  near zoom, with the panel, path, menu, filters and list view; concept page; welcome; Today;
  flashcards; at 390, 1280 and 1440 px in both themes. Interaction pass: flashcards turning a
  bubble strong (ink), dragging and reload, hover tooltip, search jump, adding a concept, keyboard
  Enter on a bubble. Fixed on the way: screen-reader-only text in long lists stretched the page
  (`<main>` is now positioned).

- **GitHub push (session 1):** the first push failed with "Claude doesn't have GitHub access"
  (HTTP 403); it worked after GitHub was reconnected at https://claude.ai/connect-github. If it
  happens again, commits stay safe locally, but push before the session ends.
- **Bundle size:** pages load lazily. Since session 5 the concept text is out of the startup
  bundle (CLAUDE.md decision 53): the syllabus structure chunk is about 370 KB (66 KB gzipped),
  and each subject's text is its own chunk (DSA: 1.16 MB, 377 KB gzipped), loaded when a concept,
  flashcards, hints or the palette first need it. Other heavy chunks: CodeMirror (about 650 KB),
  Markdown with KaTeX (about 430 KB), Recharts (about 370 KB, design kit only). The artifact file
  inlines everything: 5.9 MB after OOP and OS, 6.23 MB after CN and DBMS (limit 15 MB; each
  subject adds about 0.15 to 0.25 MB); at this rate the remaining 13 subjects add about 2 to 3 MB,
  so it should stay under the limit, but watch `check-artifact` after each content session. If it gets close, compress the content chunks in the artifact build.
- **Quant bank:** the spec table has 41 puzzles, not 40. Four prompts carry a short answer-format
  hint (for example "(Answer in minutes.)"); `q-twenty-one` has a two-part spoken answer, so it is
  self-graded against its note.
- **Screenshots:** Playwright works (global install; Chromium in /opt/pw-browsers). The page
  scrolls inside `<main>`, so Playwright's `fullPage` option captures no more; use a tall viewport.
  Session 2 reviewed Today, Map, Concept, Problem, Design, Problems, Practice, Settings, the design
  kit, the palette, dialogs, drawers and the More sheet at 360 to 2560 px in both themes; ran an
  interaction pass (palette, shortcuts, theme, focus timer, settings kept after reload, export,
  import, reset and undo); and ran the artifact file with a simulated claude.ai runtime: synced
  storage with the `downloads` capability, and the fallback with no capabilities (IndexedDB notice,
  copy dialog). No network requests, no console errors.
- **Phase 2 extras pulled forward:** the focus timer, activity clock and streak (parts of F29),
  the backup banner and import/reset UI (parts of F22) and keyboard shortcuts (part of F30) are in
  the shell now, because the top bar and Settings need them.
- **Ask Claude drawer, "Explain with Claude", API key, Review my code, Dry run, Suggest with
  Claude:** each shows an honest "arrives in phase 6" message; nothing pretends to work.
- **Phase 5 notes (session 11, Probability):** all 62 concepts have simple, interview, questions
  and a deep article (must-know articles 470 to 810 words), 309 questions, math in KaTeX. Every
  numeric answer is worked out exactly first (fractions where possible) with its assumptions
  stated, then confirmed by one of 62 C++ simulations with a fixed seed; each article says how
  close the run came in standard errors and never presents a simulated number as exact. All 62
  run under ASan and UBSan and print identical output with GCC 13 and clang 18 (no
  `std::*_distribution` or `std::shuffle`, whose results differ between standard libraries;
  CLAUDE.md decision 65). Runs 2.3 to 3.1 standard errors off (a symmetry card deal, a defect
  rate by total probability, negative binomial, gambler's ruin at p = 0.49, a transformation, the
  doubling strategy) were rechecked with other seeds or an independent solve, found unbiased, and
  the text says so. Where a simulation differs from the exact value on purpose, the text explains
  it (a discretized Brownian path misses crossings: 0.309 against 0.317 at 1,000 steps, matching
  the Broadie-Glasserman-Kou correction). Errors caught by the simulations while writing: the
  variance of the mean of 10 dice (7/24, not 35/1200), a first-step example, a coupon collector
  answer and a confusing urn example, all fixed before committing. Nothing was uncertain enough
  for `needsReview`. Screens reviewed: deep articles with heavy math at 1280 and 390 px in both
  themes; no console errors, no page overflow.
- **Phase 5 notes (session 11, LLD and quant puzzles):** all 32 LLD concepts have simple,
  interview, questions and a deep article (must-know 600 to 900 words; classics run longer
  because of their code), 158 questions. Each classic has requirements, a text diagram of the
  classes (notation in CLAUDE.md decision 64), interview-sized C++ with a demo scenario and its
  output, a discussion of extensions and trade-offs, and an "Interview checklist" naming every
  "must discuss" point of its `lld-<slug>` prompt in bold, checked by a new test. Designs apply
  SOLID and link to the OOP pattern articles instead of repeating them, using a new in-content
  concept link (`[text](#/concept/<id>)`, validated by the syllabus build; on the map it opens the
  concept in the panel). All 31 runnable designs pass under ASan and UBSan at -O1 and -O2 and under
  ThreadSanitizer (14 of them start threads, such as booking, the rate limiter and pub-sub). Found on the way: the elevator demo had
  an express car serving a floor it skips (scenario and trace fixed). 18 design prompts were
  shorter than 3 sentences and were extended; a test now keeps them at 3 or more. The 57 original
  quant puzzles (21 probability, 15 math, 11 puzzles, 10 markets; 25 easy, 24 medium, 8 hard;
  3 open-ended) have fresh wording and explained answers; tests recompute every checkable answer
  by enumeration, dynamic programming, integration or search and compare it through
  `answerCheck`, and 11 probability answers were also simulated (all within 1.5 standard errors).
  `tests/app/concepts.test.tsx` waits up to 4 s for lazy routes (it was flaky under load).
- **Phase 5 notes (session 10, Concurrency):** all 20 concepts have simple, interview, questions
  and a deep article (must-know articles 480 to 670 words), written around the C++ standard library
  (`thread`, `jthread`, `async`, mutexes and lock wrappers, `condition_variable`, `shared_mutex`,
  C++20 semaphores, latches, barriers and coroutines, atomics and memory orders), with the OS
  theory left to the `os.sync` articles. Every threaded example was run at least 10 times under
  ThreadSanitizer (GCC 13, and clang 18 after `apt-get install libclang-rt-18-dev`), several times
  under AddressSanitizer and UBSan, and 30 to 50 times at -O2; all of them print the same output on
  every run. Interleavings that would otherwise be luck are forced with barriers (the overdraft race
  condition, two threads each holding one lock), and programs print invariants rather than
  timing-dependent splits. Machine-dependent numbers are labelled as one run and give the range seen:
  concurrency versus parallelism (4 threads: 0.45 to 0.63 s on 4 cores, about 1.7 s pinned to one
  core, as long as running them one after another), false sharing (1.6 to 1.7 s packed versus
  0.13 to 0.16 s padded), thread creation (about 45 µs), and a store-buffering litmus test (both
  loads read 0 in 500 to 130,000 of 200,000 rounds with relaxed or release/acquire; never with
  seq_cst, over 60 runs). Undefined-behavior examples (a racy counter, relaxed publishing,
  double-checked locking on a plain pointer) are labelled and compiled only; the text quotes
  ThreadSanitizer's reports about them. The ABA problem is replayed step by step on one thread, so
  it is deterministic. Found on the way: GCC 13's ThreadSanitizer does not intercept
  `pthread_mutex_clocklock`, so `timed_mutex::try_lock_for` gives a false "unlock of an unlocked
  mutex" report (clang 18's is clean); a timeout demo whose result depended on which timeout fired
  first (fixed with a second barrier); `bits/stdc++.h` in g++ 13 leaves out `<coroutine>` (added to
  the checker's prelude). Also this session: code lines in the new content were kept within 100
  characters (a few older DSA, OOP, OS and DBMS lines are slightly longer); scope text with
  backticks (Language core uses them) now shows inline code on the concept page, the map tooltip,
  the list view and the explain-it-back dialog. Screens reviewed: deep articles in both subjects at
  1280 px (light and dark) and 390 px (light and dark), the list view and the design kit; no console
  errors, no page overflow.
- **Phase 5 notes (session 10, Language core):** all 46 concepts have simple, interview and
  questions; deep articles for all 22 must-know concepts (360 to 740 words) and for every other
  C++ and `lang.general` concept. The Java and Python topics stay in the syllabus for other primary
  languages and are deliberately short (deep articles only for their 8 must-know concepts, no
  comparisons with C++); everything else is C++ only, and the C++-only test still covers it. Every
  C++ claim was checked against C++20 and g++ 13: each runnable block (27) was compiled with the
  checker's prelude, run under AddressSanitizer and UBSan at -O1 and at -O2, and its output
  compared with the text by a scratch runner. Undefined behavior appears only in blocks whose first
  line starts `// Undefined behavior`; they are compiled but never run, and the text quotes only
  what tools report about them (UBSan, ASan and libstdc++ debug-mode messages from real runs) or
  what g++ 13's assembly shows (a signed-overflow check folded to "return false", an off-by-one
  loop folded to "return true"). Implementation facts are labelled as libstdc++ or x86-64 ones
  (vector doubling, 15-character small strings, 40-byte set nodes, prime bucket counts, a 1031-bucket
  table whose 1000 multiples of 1031 all land in bucket 0). Timings are one machine's runs and say
  so (fast input); counts that do not depend on the machine come from `strace` (1,000,000 `write`
  calls with `endl` versus 841 with `'\n'`) or from counting element copies and moves. Java
  examples ran on OpenJDK 21 (HashMap treeification checked through reflection: the 9th colliding
  key converts a bucket, or the table resizes first when it has fewer than 64 buckets); Python
  examples on CPython 3.11. `check:content-code` now includes GCC's `pb_ds` headers and accepts
  blocks starting `// Warns` or `// Undefined behavior` with their warnings. Fixed on the way: added
  prerequisite links that would have moved the map (removed; metadata stays frozen), a loose
  amortized bound, an ODR sentence and a `log2` example that was actually exact (replaced with
  `log(1000) / log(10)`).
- **Phase 5 notes (session 9, System Design):** all 79 concepts have simple, interview,
  questions and a deep article (must-know articles 440 to 850 words). Every idea that can run
  does: 74 C++ programs (queueing and Little's law, the Universal Scalability Law, load balancer
  algorithms, an autoscaler, cache strategies and eviction policies, cache leases and single-flight,
  Redis Cluster key slots, replication lag, resharding, consistent hashing, erasure coding, BM25,
  delta-of-delta, MapReduce, quorums, a Raft-style election, fencing tokens, vector clocks, the
  outbox, retries with jitter, dead-letter queues, five rate limiters, a circuit breaker, error
  budgets, Snowflake ids, Bloom filters, geohash, HyperLogLog, count-min, Merkle trees, and a core
  piece of each of the 22 classic designs, such as base 62 codes, content-defined chunking, adaptive
  bitrate, a price-time matching engine and operational transformation). Each was compiled with
  the checker's prelude, run under AddressSanitizer and UBSan, and its output compared with the
  text (a scratch runner; programs were run before their articles were written, so every number
  in the prose comes from a real run). Redis commands and `CLUSTER KEYSLOT` values were checked on
  a real Redis 7.0 (`apt-get install redis-server`); SQL snippets (conditional updates for flash
  sales, seat holds and trips; a dedup table) on MySQL 8. The 22 classic articles cover every
  "must discuss" point of the matching design prompt's rubric. Fixed on the way: guessed outputs
  in first drafts (replaced by real ones), a load-balancer "two choices" that could pick one server
  twice, a count-min stream whose two random choices were correlated, and a URL that the artifact check
  would have rejected (`http://payments`, reworded). The artifact is now 6.90 MB.
- **Phase 5 notes (session 9, SQL):** all 34 concepts have simple, interview, questions and a
  deep article (must-know articles 455 to 675 words). SQL is written for **MySQL 8** (the app's
  SQL dialect and LeetCode's), with the PostgreSQL spelling and every behavior difference pointed
  out (collation and case, NULL sort order, integer division, `CONCAT` with NULL, `HAVING`
  aliases, `LIMIT` in `IN` subqueries, error 1093, no `FULL OUTER JOIN`, `INTERSECT`/`EXCEPT`
  from 8.0.31, recursive CTE column types, `RANK` as a reserved word, frames, upserts, joins in
  `UPDATE`/`DELETE`, transactional DDL, errors inside transactions, foreign key indexes).
  **MySQL 8.0 was installed** in the cloud environment (`apt-get update && apt-get install -y
  mysql-server`, then `service mysql start`) next to PostgreSQL 16. A scratch checker (Python
  with pymysql and psycopg) ran all 116 SQL blocks, per concept in a fresh database, on both
  servers: every "Result:" table in the text (113) matches MySQL's output cell by cell, every
  statement marked as an error fails with that error, and every result that differs on
  PostgreSQL was reviewed and is either explained in the text or MySQL-only syntax whose
  PostgreSQL spelling is given (those spellings were run separately). `EXPLAIN` plans and
  timings quoted in articles are from real runs (a correlated subquery took about 39 s on MySQL
  and 10 s on PostgreSQL without an index, about 20 ms rewritten). Examples use original tables
  and data; LeetCode problems are only linked from the Practice tab. Fixed on the way: a wrong
  anti-join plan claim (the two databases recognize different spellings of the left-join
  anti-join), float output that differs from `DECIMAL`, PostgreSQL's stricter recursive CTE
  types, and a `HAVING` example whose explanation didn't match the data. Screens reviewed: deep
  articles with result tables at 1280 px light and 390 px dark; no console errors, no page
  overflow.
- **Phase 5 notes (session 8, CN):** all 55 concepts have simple, interview, questions and a
  deep article (must-know articles 500 to 790 words). Code is C++ only: 48 blocks, all compiled by
  `check:content-code`, and every runnable one executed under AddressSanitizer and UBSan with its
  output compared line by line with the text by a scratch script (outputs that depend on the
  machine, such as ephemeral ports, ping and handshake times, are labelled as one run). Real
  socket demos run over loopback: ports and 4-tuples, TCP vs UDP message boundaries, the kernel
  finishing the handshake before `accept`, TCP states read from `/proc/net/tcp` (FIN_WAIT_2,
  CLOSE_WAIT, TIME_WAIT), a minimal HTTP server and client, a `poll` echo server, and ping over
  a raw socket (needs root). Simulations cover CRC, switch learning, ARP, subnetting, NAT, DHCP
  leases, longest prefix match with a trie, distance vector rounds, fragmentation, RTO
  estimation, flow control, a Reno cwnd trace, head-of-line blocking, a DNS resolver cache,
  REST idempotency, toy RSA and Diffie-Hellman, SHA-256 (checked against hashlib), a certificate
  chain, a stateful firewall, CORS decisions, JWT decoding, a reverse proxy, load balancing and a
  CDN cache. Found and fixed on the way: a wrong CRC and RSA value in first drafts, a load
  balancer example whose numbers did not match, and a TCP-states demo whose output order depended
  on the kernel's hash table. Nagle's classic write-write-read stall did not reproduce on the test
  kernel (Linux ACKs small pushed segments promptly), so that article explains it with a timeline
  and says so instead of quoting a measurement.
- **Phase 5 notes (session 8, DBMS):** all 56 concepts have simple, interview, questions and a
  deep article (must-know articles 450 to 720 words). All 41 C++ blocks compile and run under
  AddressSanitizer and UBSan, and every output matches its text block exactly (a scratch script
  compares them line by line). Simulations cover a crash mid-transfer in a file, key discovery
  from data, relational algebra with division, anomalies, attribute closure and candidate keys, a
  normal-form checker (1NF to BCNF), lossless vs lossy decomposition with spurious tuples, minimal
  cover, an undo log, precedence graphs, view serializability by brute force, recoverability
  classes, a strict 2PL lock manager, statement vs transaction snapshots, a real lost update with
  threads and its fix, deadlock detection, timestamp ordering with the Thomas write rule, MVCC,
  optimistic retries, write skew, WAL recovery with steal and no-force, checkpoints, shadow
  paging, a B+ tree with splits and range scans, extendible hashing, composite index seeks,
  three join algorithms, a tiny LSM tree, a wide-column partition, CP vs AP under a partition, a
  G-counter CRDT, quorum overlap, range vs hash sharding, consistent hashing with virtual nodes,
  a saga, and a connection pool. **PostgreSQL 16 is installed in the cloud environment**, so SQL
  was run for real (`pg_ctlcluster 16 main start`, then a scratch database): every SQL block,
  the isolation-level table (read committed, repeatable read and serializable against
  non-repeatable reads, phantoms, lost updates and write skew, in two scripted sessions), a
  deadlock, EXPLAIN plans for index use and misuse, views, a trigger, a procedure and a cursor,
  and connection cost (about 9 ms to connect with password auth vs 60 µs per query). Found and
  fixed on the way: a Thomas write rule example that could not apply (the later transaction had
  read the item), an undefined-behavior self-insert in the extendible hashing code (caught by
  ASan), a weak hash (plain FNV-1a) that clustered consistent-hashing positions (now with a
  SplitMix64 finalizer, and the article says why), and several guessed numbers replaced by
  measured ones. The concept page test now rates every flashcard of a written concept and waits
  up to 4 s for the lazily loaded subject text, as other app tests already do. Screens reviewed:
  deep articles with tables, code, output and math in CN and DBMS at 1280 and 390 px in light and
  dark (emulated color scheme); no console errors, no page overflow (wide tables and code scroll
  inside their own boxes). The artifact is now 6.23 MB (limit 15 MB).
- **Phase 5 notes (session 7, C++ only):** the owner studies in C++ only, so DSA lost its 149
  Python blocks (each repeated a C++ block) and its language comparisons. OOP had 78 Python and
  Java blocks: repeats were removed and every other example rewritten in C++ (for example
  `call_once` and atomic double-checked locking instead of Java's holder idiom, `throw_with_nested`
  instead of exception causes, iterator invalidation instead of fail-fast iterators). OS had 51
  Python blocks and one Java monitor: repeats were removed and the rest (simulators for
  scheduling, TLB, paging, working sets, FAT, journaling and deadlock detection, Linux demos
  reading `/proc`, and a `ucontext` user-level scheduler instead of Python generators) rewritten
  in C++. Every block compiles (`check:content-code`: DSA 242, OOP 111, OS 83 C++ blocks, no
  Python or Java left) and every new one was run under AddressSanitizer and UBSan with its output
  compared to the text. Ids did not change, so progress and the map are untouched; the metadata
  diff against main shows only the intended edits: one name ("Equality and hashing", id kept
  with `renamed: true`, and `(id: …)` in the spec) and three scopes that named Java or Python
  (access modifiers, diamond problem, creating threads). Must-know articles stay within 300 to
  900 words. Other languages remain only as a named real-world example of a systems idea (Go's
  goroutines for M:N threading). Open question for the owner: the `lang` subject still has Java
  and Python topics from the spec (dimmed and left out of readiness and the plan while the
  primary language is C++); they could be removed when `lang` is written. The app's editor and
  Settings still offer Java and Python as languages, as the spec asks. Screens reviewed: the
  renamed concept, singleton, user-level threads and Linux CFS deep articles at 1280 and 390 px
  in light and dark; no console errors, no page overflow.
- **Phase 5 notes (session 6, OOP and OS):** every code block was checked three ways:
  `check:content-code` (C++ with g++ -std=c++20, Python with `ast`, and now Java with `javac`),
  then each runnable block was executed (C++ with AddressSanitizer and UBSan) and its output
  compared with the text, and concept metadata was diffed against the previous build (no id,
  name, scope, prerequisite or importance changed, so the map did not move). Numbers in worked
  examples come from small simulators (scheduling Gantt charts and averages, Banker's safe
  sequence and requests, FIFO, LRU, OPT and Clock fault counts, Belady's anomaly, first, best and
  worst fit, disk scheduling totals, inode block lookup, TLB and page-fault access times). Measured
  numbers quoted in articles (system call cost, context switch cost, minor page faults, lock
  fairness) are from test runs on the session's cloud machine and say so. Fixed on the way: a
  test URL in a builder example (the artifact check rejects unknown URLs), a Rule-of-zero snippet
  that referenced another block, a broken UML text diagram, and claims that did not match
  measurements (a race counter, lock fairness). Once, in a batch run of all snippets, the
  readers-writers example (C++20 semaphores) hit the runner's 30-second timeout; about 170 reruns,
  including 120 under parallel load, and a 12-million-handoff semaphore stress test did not
  reproduce it, so it was left as is. Screens reviewed: concept pages with deep articles (tables,
  C++, Java and text diagrams) at 1280 px (light and dark) and 390 px (light and dark), and
  flashcards with the new questions; no console errors, no horizontal page overflow (wide tables
  scroll inside their own region).
- **Phase 5 notes (session 5, DSA):** content was checked three ways: `check:content-code`
  compiles every C++ block (g++ -std=c++20, in parallel, about 35 s) and parses every Python block;
  snippets were run against their worked examples and random tests against brute force (C++ with
  AddressSanitizer and UBSan); concept metadata was diffed against the Phase 4 baseline, so no id,
  name, scope, prerequisite or importance changed and the map didn't move. Bugs found and fixed on
  the way: a unary minus in the expression evaluator, capacity 0 in the LRU cache, an empty target
  in the minimum window code, and several worked-example tables. The build now fails on stray `###`
  headings. The hint nudge reads "A clue to look for: …", and a test makes sure it never names
  the pattern. Screens reviewed: Learn (simple, deep, questions), Practice (signals, template),
  flashcards with real questions, explain it back with interview points, hints in the workspace
  and search by a simple-level word, at 390 and 1280 px in both themes; no console errors. Fixed
  on the way: linked problem rows now wrap under long titles on phones.
- **Phase 3 notes (session 3):** the section 11.2 status engine and concept scheduling were built
  now (see CLAUDE.md decisions 29 to 39), so Phase 4 builds UI on them. Offline hint text lives in
  `src/data/hintLadder.ts` (original, per topic); Phase 5's templates and signals make levels 1 to
  3 more specific automatically. The optional in-browser JavaScript runner (F7 stretch goal) was
  not built. Screens reviewed: library, workspace (normal, re-solve, hints, save dialog, diff,
  quant puzzle), Review, Mistakes (overview, tag, manage), Today, concept page, palette, at 390,
  800, 1280 and 1440 px in both themes. Artifact tested with a simulated runtime (scratch script:
  bundle `src/lib/runtime/fakeClaude.ts` with `npx rolldown … --format iife` and inject it with
  Playwright's `addInitScript`).
