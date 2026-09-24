# PROGRESS

Read `CLAUDE.md` first, then this file, then `BUILD_SPEC.md`. Update this file at the end of every
work session and at least every hour.

**Current state:** Phases 0 to 3 are done (sessions 1 to 3, 24 Sep 2026). The problem tracker
works: the library of all 522 problems with filters, quick add and CSV import; the workspace
(editor, timer, drafts, attempts with code, diffs, re-solve mode, offline hint ladder); review
scheduling and the Review page; the mistake journal; Markdown export of notes. Saving an attempt
already updates the linked concepts' statuses (the section 11.2 engine is in place).
**Next up:** Phase 4 (map and concepts): F2 map with semantic zoom, F3 concept panel (Learn,
Practice, Notes, Ask placeholder), F4 (the engine exists in `lib/mastery/status.ts`; add the UI,
"what would turn it green", manual status, never fade), F5 onboarding, F25 path, concept reviews
(`lib/srs/concept.ts` is ready and tested; the Review page already lists due concepts), F14
flashcards offline (record `Check`s, then call `refreshConcepts`), F13 offline self-check. The
concept page's practice list already shows problem progress.

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | Done | Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, ESLint, Prettier, Vitest, aliases. Two builds (`dist/`, single-file `dist-artifact/index.html` at about 1.3 MB), `check-artifact.mjs`, `release-artifact.mjs`, CI and Pages workflows. Owner: merge the PR, then Settings → Pages → Source: GitHub Actions. |
| 1. Data foundation | Done | Types and zod schemas; Dexie, claude.ai `db` and memory repositories with an in-memory fake of the `db` contract; migrations and id aliases; runtime detection; services provider; FileSaver adapters; export/import with merge and round-trip tests; `content/` for all 146 topics and 909 concepts; syllabus and layout builds with every validation; all seed banks. 111 tests. |
| 2. Design system and shell | Done | Tokens (plus code, diff, chart and feedback tokens, contrast-checked), component kit (all of section 12.7, including Markdown with KaTeX, the CodeMirror editor, code and diff views, Recharts wrappers), hash router with every F1 route, shell for desktop and phones, Settings, command palette, focus timer and streak, keyboard shortcuts. 166 tests. Screens reviewed at 360, 390, 800, 1280, 1440 and 2560 px in both themes; artifact tested with a simulated claude.ai runtime (synced and fallback). |
| 3. Version 1: problem tracker | Done | Library (filters in the URL, sorting, grouping, stats, quick add, CSV import with preview and undo), workspace (split view or tabs, CodeMirror, language and template, timer, 2-second drafts, save dialog, attempts timeline, code viewer, diff, re-solve mode with reveal), offline hint ladder, scheduling and Review page with badges, mistake journal with tag management and merge, Markdown export of notes, palette commands. 256 tests. Screens reviewed at 390, 800, 1280 and 1440 px in both themes; the artifact file tested with a simulated claude.ai runtime (synced storage survives reload, notes download through `downloads`, no network requests). |
| 4. Version 2: map and concepts | Not started | |
| 5. Content | Not started | Split across sessions, one or two subjects each, never in parallel. |
| 6. Version 3: Claude inside | Not started | |
| 7. Version 4: planning and insight | Not started | |
| 8. Practice extensions | Not started | |
| 9. Polish and ship | Not started | |

## Features (BUILD_SPEC.md section 9)

Status: **Not started**, **Foundation** (data or logic exists, no UI yet), **In progress**, **Done**.

| ID | Feature | Phase | Status | Notes |
|---|---|---|---|---|
| F1 | App shell, navigation and theme | 2 | Done | Sidebar (collapsible; collapsed by default under 1024 px), top bar, bottom tabs and More sheet under 768 px, every route in the spec (plus a `#/practice` hub and `#/kit`), toasts with Undo, skeletons while loading, error boundaries (app and per page) with "Export my data", no-flash theme. The Ask Claude button opens a drawer with the context chip; the chat itself is F20 (Phase 6). |
| F2 | Knowledge map | 4 | Foundation | `layout.json`: positions for all 1,073 nodes, organic region outlines, deterministic. `#/map` shows the static picture plus the full list view (the F30 accessible alternative) and already understands `?subject=`, `?topic=` and `?focus=` links. |
| F3 | Concept panel | 4 | Foundation | `#/concept/<id>` page: breadcrumb, status, importance, pattern, minutes, tracks, unverified badge, scope, Simple/Interview/Deep (MarkdownView) when content exists, interview questions, signals, linked problems, Learn first, Unlocks, Connected ideas. Phase 4 turns it into the map drawer with tabs. |
| F4 | Mastery status and colors | 4 | In progress | StatusGlyph (color and shape at every size), StatusChip, SegmentedBar. The section 11.2 engine (knowledge, practice, overdue, status rules, "what would turn it green", everStrong/strongSince) is built and tested in `lib/mastery/status.ts`; statuses refresh after attempts, on start and at midnight. Phase 4: the UI for manual status, never fade and the "turn it green" list. |
| F5 | Onboarding and self-assessment | 4 | Not started | Default profile created on first run. |
| F6 | Problem library | 3 | Done | All 435 LeetCode (incl. SQL), 41 quant and 46 design prompts plus the owner's own. Columns: status, number and title, difficulty, patterns, last result, last tried, next review, star; cards on phones. Filters (status incl. mastered, difficulty, source, topic or subject, pattern, owner tags, due, starred, premium) combine and live in the URL; sort by any column; group by topic; header stats. Quick add (link, number or title; own problems prefilled from the slug; offline "Suggest patterns"). CSV import with preview, options and undo. Renders progressively. Claude pattern suggestions in Phase 6. |
| F7 | Problem workspace, code saving and attempts | 3 | Done | Split view (resizable) or Problem/Code tabs; insight, summary, notes (write/preview), own tags, link editing, own-problem editing and delete with undo; CodeMirror with language picker (profile language, SQL for SQL, plain text for puzzles), starter template toggle, timer (auto-start on first keystroke, counts toward activity); drafts autosave in 2 s and on leaving; save dialog (four results with honest locks, minutes from the timer, complexities, approach, mistake tags with inline add, insight nudge on the first solve); attempts timeline, code viewer, copy into editor, delete with undo, two-attempt diff; toast with the next review. Review my code and Dry run are Claude features (Phase 6, honest dialogs). Not built: the optional JavaScript runner (stretch goal). |
| F8 | Mistake journal | 3 | Done | Top mistakes for 30 days, 90 days or all time with trend arrows; pre-interview checklist (top 5, editable "how to avoid it"); by category; "where they happen" by pattern; every attempt per tag linking to its code; manage tags (add, rename, category, how to avoid, archive, merge with re-tagging and undo). "Suggest with Claude" in Phase 6; the checklist joins revision sheets in Phase 7. |
| F9 | Re-solve reminders and review queue | 3 | In progress | Problems: section 11.1 scheduling (tested table by table), Review page most urgent first with reasons and estimates, coming up this week, mastered count, badge in the sidebar and bottom tabs, re-solve mode with hidden earlier work and Reveal, "Bring it back for review" switch, retirement, tricky problems, local-midnight rollover. Concepts: scheduling functions ready and due concepts listed; the review session itself (flashcards, explain it back) comes in Phase 4. |
| F10 | Pattern drill | 8 | Foundation | `drills.seed.ts` holds the 2 spec examples; the 270+ prompt bank is written in Phase 5. |
| F11 | Hint ladder | 3 / 6 | In progress | Offline ladder done: nudge, approach, pseudocode (warning first), revealed by clicks only, hints used saved on the attempt (and in the draft), "Show full solution" with confirmation opens the LeetCode editorial or a puzzle's answer and marks "saw the solution". Works for every seed problem with patterns (tested). Claude-written, cached hints in Phase 6. |
| F12 | Claude code review and dry run | 6 | Foundation | Code review zod schema. |
| F13 | Explain it back | 4 / 6 | Foundation | Grader schema. |
| F14 | Quizzes and flashcards | 4 / 6 | Foundation | Quiz schemas. |
| F15 | Mock interview | 8 | Foundation | MockSession storage, feedback schema. |
| F16 | Today plan | 7 | Not started | |
| F17 | Readiness dashboard | 7 | Not started | Subject weights in `lib/constants.ts`. |
| F18 | Weekly review | 7 | Not started | |
| F19 | Revision sheet generator | 7 | Not started | FileSaver adapters ready. |
| F20 | Ask Claude anywhere | 6 | Foundation | AIProvider interface. Drawer (bottom sheet on phones) opens from the top bar or `a`, with the context chip for the current concept or problem. |
| F21 | AI modes and settings | 6 | Foundation | Settings → Claude shows the detected runtime, lets the owner pick Built-in Claude (when `sample` exists) or Copy prompt, and edit the model per tier. The API key field and Test connection arrive with the providers. |
| F22 | Export, import and backup | 3 | Done | Settings → Data exports (download, `downloads` capability, or copy dialog), imports with a preview then Merge or Replace (typed REPLACE, undo from the toast), resets (typed RESET, offers an export first, undo from the toast), shows the last backup, the backup banner, and "Export notes": concept notes, saved answers and problem insights, summaries and notes as Markdown grouped by subject and topic. Round-trip and merge tests. |
| F23 | Search and command palette | 2 | In progress | Ctrl/Cmd + K or `/`: fuzzy search (typos, numbers like 743) over subjects, topics, concepts, problems (including the owner's own), puzzles, design prompts and mistake tags, grouped with icons and status glyphs; Go to every page; commands (New attempt for…, Add a problem, Import problems from CSV, Ask Claude, Export backup, themes, sidebar, shortcuts); recent picks; index built when idle; queries well under 50 ms (tested). Later: notes and stories in the index, Start drill, Start flashcards, Generate 1-day revision sheet. |
| F24 | Settings | 2 | In progress | Profile (name, track, interview date, main language, other languages to count, daily time, balance, focus subjects, hide premium), Appearance (theme, reduced motion, map labels, advanced concepts), Learning (review intensity, streak freeze, focus and break lengths, timer auto-start), Claude (mode, models), Data, About (version, runtime, storage used, data version, shortcuts, design kit). Later: re-run onboarding (Phase 4), API key (Phase 6). |
| F25 | Path to a concept | 4 | Not started | Prerequisite DAG ready. |
| F26 | Design practice (LLD and HLD) | 8 | Foundation | 46 original prompts with rubrics, one per `lld.classics` / `sysd.classics` concept. |
| F27 | Behavioral story bank | 8 | Foundation | The 30 spec questions with suggested story tags. |
| F28 | Quant practice: puzzles and mental math | 8 | Foundation | The 41 spec puzzles (answers verified by independent computation in tests); safe answer checker (`lib/quant/answerCheck.ts`: fractions, decimals, %, e, pi, sqrt, variables, yes/no; no eval). 40+ extra puzzles in Phase 5. |
| F29 | Focus timer, activity heatmap and streak | 7 | In progress | Focus timer in the top bar (focus and break; lengths in Settings); the activity clock adds minutes to today without double counting (the attempt timer is a source too); attempts, solves, re-solves and concepts touched are counted per day; streak with the weekly freeze (tested); minutes and streak shown small in the top bar. Heatmap on the dashboard in Phase 7. |
| F30 | Accessibility, keyboard, mobile and performance | 9 | In progress | Shortcuts: Ctrl/Cmd + K, `/`, `g` + t/m/p/r/d/s, `a`, `?`, Esc (single keys ignored while typing or in a dialog). Skip link, page headings take focus after navigation, landmarks, labelled icon buttons, 44 px touch targets on phones, list view of the map, reduced-motion override, contrast-checked tokens (code and chart colors too). Full audit in Phase 9. |

## Content (Phase 5)

Counts from `npm run build:syllabus`. Required: simple, interview and questions for every concept;
deep for every must-know concept; signals and template for every pattern.

| Subject | Concepts with core content | Must-know with deep | Patterns with signals and template |
|---|---|---|---|
| lang | 0 / 46 | 0 / 22 | – |
| dsa | 0 / 249 | 0 / 115 | 0 / 90 |
| oop | 0 / 53 | 0 / 24 | – |
| lld | 0 / 32 | 0 / 11 | – |
| os | 0 / 65 | 0 / 29 | – |
| conc | 0 / 20 | 0 / 9 | – |
| arch | 0 / 19 | 0 / 4 | – |
| cn | 0 / 55 | 0 / 32 | – |
| dbms | 0 / 56 | 0 / 24 | – |
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

- **GitHub push (session 1):** the first push failed with "Claude doesn't have GitHub access"
  (HTTP 403); it worked after GitHub was reconnected at https://claude.ai/connect-github. If it
  happens again, commits stay safe locally, but push before the session ends.
- **Bundle size:** pages load lazily now. The web build's main file is still about 1 MB before
  compression, mostly React and the syllabus JSON (about 440 KB), which the palette and the Ask
  Claude context need at once. Heavy parts are separate chunks: CodeMirror (about 650 KB, shared by
  the editor and code highlighting), Markdown with KaTeX (about 430 KB) and Recharts (about
  380 KB, only on the design kit page for now). The artifact file is 3.4 MB (limit 15 MB). Revisit
  in Phase 9 (for example, load the syllabus JSON with a dynamic import after first paint).
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
- **Phase 3 notes (session 3):** the section 11.2 status engine and concept scheduling were built
  now (see CLAUDE.md decisions 29 to 39), so Phase 4 builds UI on them. Offline hint text lives in
  `src/data/hintLadder.ts` (original, per topic); Phase 5's templates and signals make levels 1 to
  3 more specific automatically. The optional in-browser JavaScript runner (F7 stretch goal) was
  not built. Screens reviewed: library, workspace (normal, re-solve, hints, save dialog, diff,
  quant puzzle), Review, Mistakes (overview, tag, manage), Today, concept page, palette, at 390,
  800, 1280 and 1440 px in both themes. Artifact tested with a simulated runtime (scratch script:
  bundle `src/lib/runtime/fakeClaude.ts` with `npx rolldown … --format iife` and inject it with
  Playwright's `addInitScript`).
