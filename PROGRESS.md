# PROGRESS

Read `CLAUDE.md` first, then this file, then `BUILD_SPEC.md`. Update this file at the end of every
work session and at least every hour.

**Current state:** Phases 0, 1 and 2 are done (sessions 1 and 2, 24 Sep 2026). The app now has
its real shell: sidebar and bottom tabs, top bar (search, minutes and streak, focus timer, Ask
Claude, theme), every route, Settings, the command palette and the full component kit. Pages for
later phases say what they will do and when.
**Next up:** Phase 3 (problem tracker): F6, F7, F8, F9, full F22, offline F11. The kit already has
what it needs: `code/CodeEditor`, `code/DiffView`, `Timer`/`useTimer`, `MultiCombobox`, Dialog,
toasts with Undo, and the activity clock (`startActivitySource("attempt:<id>")` for attempt
timers). Replace `ProblemsPage`, `ReviewPage` and `MistakesPage` in
`src/features/placeholder/pages.tsx` and build the workspace in `features/problems/ProblemPage.tsx`.

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | Done | Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, ESLint, Prettier, Vitest, aliases. Two builds (`dist/`, single-file `dist-artifact/index.html` at about 1.3 MB), `check-artifact.mjs`, `release-artifact.mjs`, CI and Pages workflows. Owner: merge the PR, then Settings → Pages → Source: GitHub Actions. |
| 1. Data foundation | Done | Types and zod schemas; Dexie, claude.ai `db` and memory repositories with an in-memory fake of the `db` contract; migrations and id aliases; runtime detection; services provider; FileSaver adapters; export/import with merge and round-trip tests; `content/` for all 146 topics and 909 concepts; syllabus and layout builds with every validation; all seed banks. 111 tests. |
| 2. Design system and shell | Done | Tokens (plus code, diff, chart and feedback tokens, contrast-checked), component kit (all of section 12.7, including Markdown with KaTeX, the CodeMirror editor, code and diff views, Recharts wrappers), hash router with every F1 route, shell for desktop and phones, Settings, command palette, focus timer and streak, keyboard shortcuts. 166 tests. Screens reviewed at 360, 390, 800, 1280, 1440 and 2560 px in both themes; artifact tested with a simulated claude.ai runtime (synced and fallback). |
| 3. Version 1: problem tracker | Not started | |
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
| F4 | Mastery status and colors | 4 | Foundation | StatusGlyph (color and shape at every size), StatusChip, SegmentedBar; cached statuses load into `conceptStateStore`. Engine in Phase 4. |
| F5 | Onboarding and self-assessment | 4 | Not started | Default profile created on first run. |
| F6 | Problem library | 3 | Foundation | 435 LeetCode problems (checked against the spec: number, title, difficulty, premium, topic), each tagged with 1 to 3 concepts; every one of the 90 patterns has practice problems. `leetCodeSlug`, `leetCodeUrl`. |
| F7 | Problem workspace, code saving and attempts | 3 | Foundation | Types, storage, 30-attempt cap. Kit: CodeEditor (5 languages, `onFirstEdit` for timer auto-start), DiffView (side by side, unified on phones, word marks, folding), Timer. `#/problems/<id>` shows seed details and the LeetCode link. |
| F8 | Mistake journal | 3 | Foundation | 33 default mistake tags seeded on first run. |
| F9 | Re-solve reminders and review queue | 3 | Not started | SRS constants defined. |
| F10 | Pattern drill | 8 | Foundation | `drills.seed.ts` holds the 2 spec examples; the 270+ prompt bank is written in Phase 5. |
| F11 | Hint ladder | 3 / 6 | Not started | |
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
| F22 | Export, import and backup | 3 | In progress | Core plus UI: Settings → Data exports (download, `downloads` capability, or copy dialog), imports with a preview then Merge or Replace (typed REPLACE, undo from the toast), resets (typed RESET, offers an export first, undo from the toast), shows the last backup, and the backup banner (older than 7 days; "Not now" hides it for 3 days). Left for Phase 3: Markdown export of notes and saved answers. |
| F23 | Search and command palette | 2 | In progress | Ctrl/Cmd + K or `/`: fuzzy search (typos, numbers like 743) over subjects, topics, concepts, problems, puzzles, design prompts and mistake tags, grouped with icons and status glyphs; Go to every page; commands (Ask Claude, Export backup, themes, sidebar, shortcuts); recent picks; index built when idle; queries well under 50 ms (tested). Later: notes and stories in the index, and commands for features that don't exist yet (Start drill, Start flashcards, New attempt for…, Generate 1-day revision sheet). |
| F24 | Settings | 2 | In progress | Profile (name, track, interview date, main language, other languages to count, daily time, balance, focus subjects, hide premium), Appearance (theme, reduced motion, map labels, advanced concepts), Learning (review intensity, streak freeze, focus and break lengths, timer auto-start), Claude (mode, models), Data, About (version, runtime, storage used, data version, shortcuts, design kit). Later: re-run onboarding (Phase 4), API key (Phase 6). |
| F25 | Path to a concept | 4 | Not started | Prerequisite DAG ready. |
| F26 | Design practice (LLD and HLD) | 8 | Foundation | 46 original prompts with rubrics, one per `lld.classics` / `sysd.classics` concept. |
| F27 | Behavioral story bank | 8 | Foundation | The 30 spec questions with suggested story tags. |
| F28 | Quant practice: puzzles and mental math | 8 | Foundation | The 41 spec puzzles (answers verified by independent computation in tests); safe answer checker (`lib/quant/answerCheck.ts`: fractions, decimals, %, e, pi, sqrt, variables, yes/no; no eval). 40+ extra puzzles in Phase 5. |
| F29 | Focus timer, activity heatmap and streak | 7 | In progress | Focus timer in the top bar (focus and break; lengths in Settings); the activity clock adds minutes to today without double counting; streak with the weekly freeze (tested); minutes and streak shown small in the top bar. Heatmap on the dashboard in Phase 7. |
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
- **Ask Claude drawer, "Explain with Claude", API key:** each shows an honest "arrives in phase 6"
  message; nothing pretends to work.
