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
**Next up:** Phase 5 continues with SQL, then System Design (section 5.3 order: DSA, OOP, OS,
CN, DBMS, SQL, System Design, Language core, Concurrency, LLD, Probability, Math, Puzzles,
Markets, Architecture, Aptitude, Engineering essentials, Career), one or two subjects per
session, never two content sessions at once. Follow `content/README.md` → "Writing conventions",
run `npm run check:content-code -- <subject>`, and add each finished subject to `FINISHED` in
`tests/syllabus/content.test.ts`. For SQL, PostgreSQL 16 is installed in the cloud environment
(start it with `pg_ctlcluster 16 main start`) to run every query for real. Still to write in Phase 5 besides concepts: extra quant puzzles
(section 8.2) and design prompts with rubrics (section 8.4), unless they are already complete.

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | Done | Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, ESLint, Prettier, Vitest, aliases. Two builds (`dist/`, single-file `dist-artifact/index.html` at about 1.3 MB), `check-artifact.mjs`, `release-artifact.mjs`, CI and Pages workflows. Owner: merge the PR, then Settings → Pages → Source: GitHub Actions. |
| 1. Data foundation | Done | Types and zod schemas; Dexie, claude.ai `db` and memory repositories with an in-memory fake of the `db` contract; migrations and id aliases; runtime detection; services provider; FileSaver adapters; export/import with merge and round-trip tests; `content/` for all 146 topics and 909 concepts; syllabus and layout builds with every validation; all seed banks. 111 tests. |
| 2. Design system and shell | Done | Tokens (plus code, diff, chart and feedback tokens, contrast-checked), component kit (all of section 12.7, including Markdown with KaTeX, the CodeMirror editor, code and diff views, Recharts wrappers), hash router with every F1 route, shell for desktop and phones, Settings, command palette, focus timer and streak, keyboard shortcuts. 166 tests. Screens reviewed at 360, 390, 800, 1280, 1440 and 2560 px in both themes; artifact tested with a simulated claude.ai runtime (synced and fallback). |
| 3. Version 1: problem tracker | Done | Library (filters in the URL, sorting, grouping, stats, quick add, CSV import with preview and undo), workspace (split view or tabs, CodeMirror, language and template, timer, 2-second drafts, save dialog, attempts timeline, code viewer, diff, re-solve mode with reveal), offline hint ladder, scheduling and Review page with badges, mistake journal with tag management and merge, Markdown export of notes, palette commands. 256 tests. Screens reviewed at 390, 800, 1280 and 1440 px in both themes; the artifact file tested with a simulated claude.ai runtime (synced storage survives reload, notes download through `downloads`, no network requests). |
| 4. Version 2: map and concepts | Done | React Flow map (far, middle, near zoom; regions; prerequisite and connection lines; fixed-size labels that never overlap; filters in the URL; focus mode; dragging with saved positions; minimap; search fly-to with pulse; right-click and long-press menus; ink moment), concept panel and page, "Why this color?", manual status and never fade, welcome and self-assessment, path to a concept, offline flashcards and explain it back, concept reviews, the owner's own concepts, Today additions. 314 tests. Screens reviewed at 390, 1280 and 1440 px in both themes; artifact tested with a simulated claude.ai runtime (statuses and notes survive reload, no network requests). |
| 5. Content | In progress | Split across sessions, one or two subjects each, never in parallel. Session 5: DSA complete (249 / 249, 115 / 115 deep, 90 / 90 patterns); every C++ and Python block compiles (`check:content-code`) and was run against its worked example or a brute force. Pattern drill bank: 276 prompts. Concept text split into per-subject chunks loaded on demand. 327 tests. Session 6: OOP complete (53 / 53, 24 / 24 must-know deep, 53 deep in all) and OS complete (65 / 65, 29 / 29 must-know deep, 65 deep in all); `check:content-code` now also compiles Java blocks and has POSIX headers for C++. 335 tests. Session 8: CN complete (55 / 55, 32 / 32 must-know deep, 55 deep in all) and DBMS complete (56 / 56, 24 / 24 must-know deep, 56 deep in all); the code check gained socket headers; example URLs use reserved documentation domains (CLAUDE.md decision 59); SQL examples, isolation levels, deadlocks and query plans were checked on a real PostgreSQL 16. 345 tests. Session 7: C++ only at the owner's request (CLAUDE.md decision 58): 149 Python blocks removed from DSA; every Python and Java example in OOP and OS rewritten in C++ and run; text reworded around C++; "equals and hashCode in Java" renamed "Equality and hashing" with its id kept; a test forbids Python or Java in any concept outside the `lang` Java and Python topics. 337 tests. |
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
| F6 | Problem library | 3 | Done | All 435 LeetCode (incl. SQL), 41 quant and 46 design prompts plus the owner's own. Columns: status, number and title, difficulty, patterns, last result, last tried, next review, star; cards on phones. Filters (status incl. mastered, difficulty, source, topic or subject, pattern, owner tags, due, starred, premium) combine and live in the URL; sort by any column; group by topic; header stats. Quick add (link, number or title; own problems prefilled from the slug; offline "Suggest patterns"). CSV import with preview, options and undo. Renders progressively. Claude pattern suggestions in Phase 6. |
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
| F26 | Design practice (LLD and HLD) | 8 | Foundation | 46 original prompts with rubrics, one per `lld.classics` / `sysd.classics` concept. |
| F27 | Behavioral story bank | 8 | Foundation | The 30 spec questions with suggested story tags. |
| F28 | Quant practice: puzzles and mental math | 8 | Foundation | The 41 spec puzzles (answers verified by independent computation in tests); safe answer checker (`lib/quant/answerCheck.ts`: fractions, decimals, %, e, pi, sqrt, variables, yes/no; no eval). 40+ extra puzzles in Phase 5. |
| F29 | Focus timer, activity heatmap and streak | 7 | In progress | Focus timer in the top bar (focus and break; lengths in Settings); the activity clock adds minutes to today without double counting (the attempt timer is a source too); attempts, solves, re-solves and concepts touched are counted per day; streak with the weekly freeze (tested); minutes and streak shown small in the top bar. Heatmap on the dashboard in Phase 7. |
| F30 | Accessibility, keyboard, mobile and performance | 9 | In progress | Shortcuts: Ctrl/Cmd + K, `/`, `g` + t/m/p/r/d/s, `a`, `?`, Esc (single keys ignored while typing or in a dialog). Skip link, page headings take focus after navigation, landmarks, labelled icon buttons, 44 px touch targets on phones, reduced-motion override, contrast-checked tokens (code and chart colors too). Map: list view with statuses and status mixes (the accessible alternative), bubbles are labelled buttons (Enter opens, Shift+F10 or the context-menu key opens the menu), map key explains the symbols. Full audit in Phase 9. |

## Content (Phase 5)

Counts from `npm run build:syllabus`. Required: simple, interview and questions for every concept;
deep for every must-know concept; signals and template for every pattern.

| Subject | Concepts with core content | Must-know with deep | Patterns with signals and template |
|---|---|---|---|
| lang | 0 / 46 | 0 / 22 | – |
| dsa | 249 / 249 | 115 / 115 | 90 / 90 |
| oop | 53 / 53 | 24 / 24 | – |
| lld | 0 / 32 | 0 / 11 | – |
| os | 65 / 65 | 29 / 29 | – |
| conc | 0 / 20 | 0 / 9 | – |
| arch | 0 / 19 | 0 / 4 | – |
| cn | 55 / 55 | 32 / 32 | – |
| dbms | 56 / 56 | 24 / 24 | – |
| sql | 0 / 34 | 0 / 20 | – |
| sysd | 0 / 79 | 0 / 34 | – |
| prob | 0 / 62 | 0 / 30 | – |
| math | 0 / 31 | 0 / 9 | – |
| puzzles | 0 / 21 | 0 / 8 | – |
| markets | 0 / 28 | 0 / 11 | – |
| apt | 0 / 16 | 0 / 5 | – |
| eng | 0 / 27 | 0 / 7 | – |
| career | 0 / 16 | 0 / 6 | – |

## Known issues and notes

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
