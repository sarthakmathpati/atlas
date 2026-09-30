# CLAUDE.md

Atlas is a personal, zoomable study map for cracking SDE and quant interviews. `BUILD_SPEC.md` is
the single source of truth. Every session starts by reading this file, then `PROGRESS.md`, then
`BUILD_SPEC.md`, and checks that the branch contains the previous phase's work (see `PROGRESS.md`).
If it doesn't, tell the owner the previous pull request probably wasn't merged yet, and stop.

## Standing rules (BUILD_SPEC.md section 0)

1. Quality over speed. Build every in-scope feature fully and connect it to the syllabus. Never
   silently skip or stub. If something can't work in a runtime, build the documented fallback and
   note it in `PROGRESS.md`.
2. Work phase by phase (section 13). End each phase with all checks passing, a commit, a push, an
   updated `PROGRESS.md`, and a short beginner-friendly handover: "Phase N is done. Please click
   **Create PR**, then merge it on GitHub, then start a new session for the next phase."
3. Commit often with clear messages (`feat(map): semantic zoom levels`). Commit and update
   `PROGRESS.md` at least every hour. Never commit secrets or API keys.
4. Before every commit: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
   `npm run build:artifact` (or all at once: `npm run check`).
5. Look at the UI: screenshots with Playwright (global install, Chromium at /opt/pw-browsers) in
   every theme (light and dark; Day, Dusk and Night from Phase 9) and at 390 px. Fix what looks off.
6. Accuracy: interview content must be correct. When unsure, set `needsReview: true`.
7. Never copy problem statements from LeetCode or elsewhere. Store titles, numbers, links,
   difficulty and patterns only. Drill prompts, puzzles and design prompts are original.
8. Plain, friendly UI copy: sentence case, no exclamation marks, no "successfully"/"please"/"simply".
9. Ask the owner only when truly blocked; otherwise decide, record it below, continue.
10. Workflow files: if pushing `.github/workflows/` is rejected, put them in
    `setup/github-workflows/` and give the owner exact steps to add them on GitHub.

## Architecture

- **Two runtimes, one codebase** (section 2). `npm run build` → `dist/` for GitHub Pages
  (IndexedDB via Dexie; AI by copy-prompt or the owner's API key). `npm run build:artifact` →
  one self-contained `dist-artifact/index.html` for a claude.ai published artifact (`db`, `sample`,
  `user`, `downloads` capabilities). `npm run release:artifact` zips it to `release/atlas-artifact.zip`.
- **Adapters** (section 2.4). Feature code never touches IndexedDB, `window.claude` or `fetch`:
  - `src/lib/storage/Repository.ts`: `DexieRepository`, `ClaudeDbRepository`, `MemoryRepository`.
  - `src/lib/ai/AIProvider.ts`: `SampleAIProvider`, `AnthropicApiProvider` (web app only),
    `CopyPromptProvider`; `lib/ai/service.ts` says which ones the view offers.
  - `src/lib/files/FileSaver.ts`: `BrowserFileSaver`, `ClaudeDownloadsSaver`, `DialogFileSaver`.
  - Chosen once at startup in `src/app/providers/ServicesProvider.tsx` from `detectRuntime()`.
    ESLint forbids importing `dexie`, reading `window.claude` or calling `fetch` outside
    `lib/storage|runtime|ai|files`.
- **Runtime contract 0.2.54**: authoritative type files are copied in `docs/claude-runtime-0.2.54/`.
  `src/lib/runtime/claude.ts` mirrors the parts we use. `src/lib/runtime/fakeClaude.ts` is an
  in-memory fake of `db`/`user`/`downloads`/`sample` for tests; `fakeSampleDemo.ts` answers every
  prompt in the right shape (tests and the simulated artifact run; the app never imports it).
- **Claude** (Phase 6, section 10): `lib/ai/` holds the providers, tolerant JSON with zod
  (`json.ts`), plain error copy (`errors.ts`), `runAI` (one retry for unreadable JSON, a visit
  cache), mode resolution (`mode.ts`), the context builder (`context.ts`) and all 19 prompts
  (`prompts.ts`). `stores/aiStore.ts` resolves the mode, keeps the API key presence and the copy
  prompt modal, and exposes `askAI`. Features use `features/ai/` (`useAIRequest`, `AIRunView`,
  `ClaudeTag`, `gather.ts` for context from the stores, `ChatPanel` and `chatStore` for Ask Claude,
  `CopyPromptModal` in the shell).
- **Content pipeline**: `content/<subject>/<topic>.md` (format in `content/README.md`) →
  `scripts/build-syllabus.mjs` → `src/data/syllabus.generated.json` (structure, with `written`
  flags) plus `src/data/content/<subject>.generated.json` (the text) → `scripts/build-layout.mjs`
  → `src/data/layout.json`. All generated files are committed. `build`, `build:artifact` and `dev`
  regenerate them first. Tests fail if they are stale. Concept text loads per subject on demand:
  `src/data/content.ts` (loaders) and `useConceptContent(s)` in `stores/contentStore.ts`.
- **Seed banks**: `src/data/*.seed.ts` (problems, quant puzzles, designs, behavioral questions,
  mistake tags, drills), validated against the syllabus by `tests/seed/*`.
- **Types**: `src/lib/types.ts` (section 4). zod schemas for every stored entity in
  `src/lib/storage/schemas.ts`; AI JSON schemas in `src/lib/ai/schemas.ts`.
- **State**: Zustand, one store per domain in `src/stores/` (profile, activity, focus timer,
  concept statuses and checks, concept notes, custom concepts, map positions, today's plan,
  problems, mistake tags, today's date, toasts, shell UI, concept dialogs, Claude, the open
  workspace, generated drill prompts, mental math runs, stories, design attempts, mock
  sessions, parked thoughts), loaded by
  `stores/hydrate.ts` (via `app/providers/StoreHydrator.tsx`) once storage is ready, reloaded after
  import/reset and on remote changes. Stores write through the Repository. Saving an attempt
  (`problemStore.saveAttempt`) reschedules, refreshes linked concept statuses, logs activity and
  ticks a matching Today item; `conceptStateStore.recordChecks` does the same for checks.
  `findConcept(id)` (customConceptStore) finds any concept, seed or the owner's own.
- **Algorithms** (section 11, pure, tested): `lib/srs/` (intervals, grace, problem and concept
  scheduling), `lib/mastery/status.ts` (knowledge with its breakdown, practice, status rules,
  "what would turn it green"), `lib/readiness/score.ts` (11.3), `lib/recommend/ready.ts` (11.5),
  `lib/path/path.ts` (F25), `lib/review/` (queue, flashcards, offline self-check),
  `lib/onboarding/selfAssess.ts` (F5), `lib/map/` (filters, label culling, placement, summaries),
  `lib/concepts/` (scope: track, hidden, other languages; custom concepts),
  `lib/mistakes/stats.ts`. Problem helpers in `lib/problems/` (catalog of seed plus custom
  problems, filters, quick add, CSV, offline hints, progress labels, suggested next problem).
- **Planning and insight** (Phase 7): `lib/readiness/model.ts` and `evaluate.ts` evaluate every
  concept in scope once (the shared readiness model); `lib/planner/` (the daily planner 11.4,
  its input from the records, plan kinds and reasons); `lib/insight/dashboard.ts` and
  `weekly.ts` (F17, F18 numbers); `lib/revision/` (F19 sheet builder and HTML export);
  `lib/activity/heatmap.ts` (F29). Screens in `features/today/PlanSection.tsx`,
  `features/dashboard/`, `features/weekly/`, `features/revision/`; `features/insight/` holds the
  store hooks (`useReadiness`, `plannerInputNow`, `useActivityInsight`), the heatmap and the
  `ExplainNumber` popover. `stores/hydrate.ts` exposes `useDataReady` (all stores loaded).
  Fixture owners for tests and screenshots: `tests/fixtures/scenarios.ts`.
- **Practice extensions** (Phase 8): pure logic in `lib/quant/mentalMath.ts` (sprint generators,
  grading, check scores) and `lib/quant/puzzles.ts` (library filters, answer checks, the honest
  result), `lib/stories/stories.ts` (coverage matrix, speaking time, practice concepts),
  `lib/designs/sketch.ts` (sketch parser and dagre layout) and `designs.ts` (sections, review
  results), `lib/mock/` (`mock.ts` types, phases, time notes, transcript, results; `brief.ts`
  what the interviewer is told; `pick.ts` what a round is about). Stores `mentalMathStore`,
  `storyStore`, `designStore`, `mockStore` save every change and do what a finished session
  means (checks, attempts, activity, plan items). Screens in `features/mentalmath/`,
  `features/puzzles/` (plus `problems/workspace/PuzzleAnswer.tsx`), `features/stories/`,
  `features/designs/` (`SketchView` on React Flow, `DesignWorkspace`), `features/mock/`
  (`MockPage` setup and history, `MockSessionPage` live, `CopyMock` for copy prompt mode,
  `useMockInterview` the exchange loop) and the hub `features/practice/PracticePage.tsx`.
- **Map** (`features/map/`): React Flow canvas (`canvas/MapCanvas.tsx`) with memoized bubbles
  (`canvas/nodes.tsx`), everything under the bubbles in one SVG viewport portal
  (`canvas/layers.tsx`), a custom minimap, the model hook (`canvas/useMapModel.ts`) and a small
  view store (`canvas/viewStore.ts`). The concept panel lives in `features/concept/`; concept
  activities (flashcards, explain it back, reviews, status, add a concept) in
  `features/review/concepts/ConceptDialogs.tsx`, opened through `stores/conceptDialogStore.ts`.
- **Routing**: hash routes (`#/map`, `#/problems/lc-1`) from a small router in `src/app/router.ts`;
  `src/app/routes.tsx` maps every route to a lazy page. Links are plain `<a href="#/…">`.
- **Shell**: `src/app/shell/` (AppShell, Sidebar, TopBar, MobileNav, PageHeader, PageFrame,
  shortcuts, Ask Claude panel, focus timer). Every page starts with `<PageFrame><PageHeader/>`.
- **Component kit**: `src/components/ui/` (sections 12.7 and 12.10). Heavy parts are default
  exports loaded with `lazy()`: `MarkdownView`, `code/CodeEditor`, `code/DiffView` (named),
  `charts`. Survey parts: `Card`/`CardLabel` (surface card, the one focal card),
  `ContourCanvas` (the contour texture), `SubjectEmblem`/`SubjectMark`. The design kit page
  `#/kit` (Settings → About) shows Day, Dusk and Night side by side, the subject colors, the
  texture and every component (`features/kit/KitThemes.tsx`).
- **Styling**: Tailwind v4 + CSS custom properties in `src/styles/tokens.css` (Day, Dusk, Night;
  section 12.10) and `src/styles/subjects.generated.css` (subject colors, generated);
  `src/styles/components.css` (in `@layer components`) holds dialog motion, code token colors
  and reading text. Always join classes with `cx()` so overrides win. Contrast of every text
  and background pair is tested (`tests/styles/contrast.test.ts`).
- **Themes** (12.10.2): `lib/theme.ts` (pure: choices, the schedule, the next switch),
  `app/theme.ts` (applies it, mirrors it to localStorage, `useThemeController` follows the device
  and the clock), `app/themeOptions.ts`; the pre-paint script in `index.html` mirrors
  `lib/theme.ts` (tested). `useShownTheme()` (components/ui/hooks) reads `<html data-theme>`.
- **Art**: `lib/art/contours.ts` (the contour engine: seeded hills and waves, marching squares,
  soundings and spot heights), `lib/art/emblem.ts` (a subject's emblem lines),
  `lib/art/terrain.ts` (living terrain: which subjects are hills, their heights and places, the
  week's seed) and `lib/map/paper.ts` (the map's contour paper). Line drawings (compass, trail,
  flag, tent, telescope) in `components/ui/LineDrawing.tsx`; `INK_CLASS` (pencil and ink) in
  `components/ui/labels.ts`.
- **Survey screens** (9.2): Today is `features/today/` (`TodayHead` with the terrain, scale bar
  and minutes ring; `PlanSection` with `UpNextCard` and `RouteCard`; `TodaySide` with the streak
  strip, ready cards and review count; `useTodayPlan`). The dashboard's summit profile and
  subject ring are `features/dashboard/summit.tsx` with `features/insight/useSummit.ts` over
  `lib/insight/summit.ts` (readiness as of a past day, weeks, the projection trail, weekly
  stamps); stamps render with `features/insight/Stamp.tsx` (`stamps.ts` reads the stores).
  Focus subjects in the frame come from `app/shell/focusSubjects.ts`.
- **Focus layer** (F31, session 9.3): pure parts in `lib/focus/` (`horizon.ts` steps and dots,
  `park.ts` when a thought comes back, `bedtime.ts` the wrap-up window, `interviewDay.ts`,
  `breathing.ts`, `prompts.ts` break ideas, `intention.ts` a block's line, `walk.ts` the memory
  walk, `prefs.ts` the settings with defaults). `stores/focusTimerStore.ts` runs the timer and
  blocks (the line, the outcome, the break, held notices through the toast gate, the mirror in
  localStorage); `stores/parkStore.ts` keeps parked thoughts. Screens in `features/focus/`
  (`FocusLayer` mounted in the shell: `WindowHorizon`, `FocusStartDialog`, `ParkDialog`,
  `BreakView` and `BlockDoneDialog`; `TopBarFocus` the line and held notes; `ParkedBack` and
  `WrapUpNote` in `ShellNotices`; `Breathing`; `hooks.ts` with `usePageFocusLine` for pages);
  `components/ui/Horizon.tsx` (the line, also on timed rounds); `FullScreenLayer` in
  `components/ui/Dialog.tsx`; interview day in `features/today/InterviewDay.tsx`; the memory walk
  in `features/review/concepts/walkOrder.ts` and `WalkStrip.tsx`.
- **Dates**: local time; due dates stored as `yyyy-mm-dd` (`src/lib/time.ts`).
- **Phase 9 design**: BUILD_SPEC.md 12.10 (the Survey look: Day, Dusk and Night themes, subject
  colors, the contour engine, living terrain, emblems, pencil and ink, the route, the summit
  profile, stamps), F31 (focus layer) and F32 (ADHD mode). Session 9.1 built the foundations
  (12.10.1 to 12.10.6); session 9.2 every screen (12.10.7, 12.10.8); session 9.3 the focus layer
  (F31, 12.10.9). Research with sources and evidence levels:
  `docs/design/phase9-research.md`. Mockups: `docs/design/phase9-plan.html` (open in a browser;
  a reference, the spec wins).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Regenerate data, start the dev server |
| `npm run build:syllabus [-- --strict]` | Parse and validate `content/` |
| `npm run build:layout [-- --force]` | Recompute map positions (skipped if structure unchanged) |
| `npm run build:colors` | Generate the subject colors from the hues in `content/*/_subject.md` |
| `npm run check:content-code [-- <subject>]` | Compile every C++ block in `content/` (Python and Java blocks too, for the `lang` topics) |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run build` / `build:artifact` | GitHub Pages build / single-file artifact + `check-artifact.mjs` |
| `npm run release:artifact` | Build and zip the artifact into `release/` |
| `npm run check` | All checks and both builds |

## Decisions

1. **TypeScript 6.0.3**, not 7.x: typescript-eslint 8.70 supports TypeScript below 6.1. All
   versions are pinned exactly in `package.json`.
2. **Concept id slug**: lowercase; drop apostrophes; `++` → `pp`, `+` → `plus`, `*` → `star`;
   every other run of non-alphanumerics → one hyphen (`TCP/IP model` → `tcp-ip-model`,
   `A* search` → `a-star-search`, `B-trees and B+ trees` → `b-trees-and-b-plus-trees`).
3. **Content format additions**: concept blocks carry `name:` and `scope:` (quoted) besides the
   spec's keys; topic front matter has `order:`; subject metadata lives in
   `content/<subject>/_subject.md`; cross-links in `content/connections.md` (same table format as
   section 7.1). Only the six reserved `### simple|interview|deep|questions|signals|template`
   headings start sections, so deep articles use `####` sub-headings.
4. **Prerequisites**: section 7.2 is transcribed as explicit edges in `scripts/lib/spec-prereqs.mjs`
   (its semicolons are ambiguous). About 440 further obvious edges were added, mostly within topics,
   giving 574 edges for 909 concepts. The build rejects cycles AND "backwards" edges (a concept
   needing one from a topic that comes later in the topic order), which would make "ready to learn"
   unsatisfiable.
5. **Layout**: each subject is laid out on its own (topic clusters packed with prerequisite
   attraction; concepts contained in their topic circle; seeded d3-force), then regions are placed
   on the F2 neighborhood sketch and separated. Region outlines are smooth contours of a density
   field ("islands"), with a rounded-hull fallback. `layout.json` stores a structure hash, so content
   text edits never move the map.
6. **Theme**: never use Tailwind's `dark:` variant; tokens switch with the theme. The theme choice
   is mirrored to `localStorage["atlas.theme"]` (and the schedule to `atlas.themeSchedule`) so
   `index.html` can set `data-theme` before first paint (no flash). Since Phase 9, `data-theme` is
   always `day`, `dusk` or `night` (decision 106).
7. **Synced storage documents**: every body is `{ kind, key, v, updatedAt, data }`. Grouped
   documents (`concepts-<subject>`, `checks-<subject>`, `mistakeTags`, `mentalMath`, …) store
   records keyed by id (checks as a record, not an array). Keys with characters the store forbids
   are hex-encoded (`x~…`).
8. **Storage fallback**: claude.ai `db` (+ user id) → IndexedDB (with a "won't sync" notice) →
   memory (with a "not saved after closing" warning). If synced data fails to load, the visit uses
   IndexedDB and says so. The API key lives only in IndexedDB (`SecretsStore`), in every runtime.
9. **Import merge extras**: besides "newer updatedAt wins" and "attempts unioned by id", merge also
   unions saved answers, story practice and activity days, and never downgrades a problem's status.
   Attempts are capped at 30 (newest kept) and the summary reports how many were trimmed.
10. **Artifact URL check**: besides the allowed CDN hosts, claude.ai and leetcode.com, the check
    allows reviewed text-only strings from bundled libraries, matched as narrowly as possible:
    `www.w3.org` (XML namespaces), `react.dev` (React error links), `tailwindcss.com` (license
    comment), `json-schema.org/draft…` (zod identifiers), two exact Dexie doc links, and zod's local
    `http://[${…}]` IPv6 check. Any new URL fails the build. `date-fns`'s `format` is avoided
    (it embeds a GitHub link; `lib/time.ts` formats dates itself). API-key mode is standalone-only:
    `AnthropicApiProvider` and `features/settings/ApiKeySettings.tsx` are imported only behind
    `!__ARTIFACT__`, so the artifact has no API URL, key field or console link (checked by grep).
11. **Type additions beyond section 4**: `Subject.mapTracks`, `SeedProblem.language` ("sql"),
    `ProblemState.urlOverride` (owner-corrected link), `Profile.backupReminderDismissedAt`,
    `MapOverride`, `GeneratedDrill`, `BehavioralQuestion`, `Syllabus`, `MapLayout`; `updatedAt` on
    every user entity (including `Check`, `MistakeTag`, `ActivityMonth`, `MentalMathRun`,
    `CustomConcept`).
12. **Fonts**: IBM Plex Sans, Sans Condensed and Mono, Latin, weights 400/500/600, woff2 only,
    bundled from `@fontsource` (alias `@fontsource-files`). About 180 KB total.
13. **Seed ids**: LeetCode `lc-<number>`; quant puzzles `q-<slug>`; design prompts `lld-<slug>` /
    `hld-<slug>` (one per concept in `lld.classics` / `sysd.classics`); behavioral questions
    `bq-<slug>`; mistake tags `mt-<slug>` (each with a default "how to avoid it" line).
14. **Default AI models** come from the spec (quick `claude-haiku-4-5-20251001`, default
    `claude-sonnet-5`, complex `claude-opus-5-5`), re-checked on 26 Sep 2026 against the current
    model list (Haiku 4.5, Sonnet 5 and Opus 5.5 are current). They are editable in Settings.
15. **Quant answers**: `src/lib/quant/answerCheck.ts` (built in Phase 1 so tests can verify every
    seed answer) evaluates answers with a small recursive-descent parser, never `eval`: numbers,
    fractions, `%`, `+ - * / ^`, `e`, `pi`, `sqrt`, implicit multiplication, variables such as `n`
    (compared at n = 2, 3, 5, 10), and yes/no words. Tolerance 0.5% relative.
16. **Preview page** (Phases 0 and 1) was replaced by the shell in Phase 2. The theme toggle became
    a menu in the top bar and a segmented control in Settings; TextFileDialog moved to
    `app/shell`; ErrorBoundary wraps the app and, inline, each page (the shell keeps working).
17. **GitHub Actions** use `actions/checkout@v5`, `setup-node@v5` (Node from `.nvmrc`),
    `configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4`. CI also fails if the
    committed generated data in `src/data` is stale.
18. **Layers without a UI library**: Dialog, Drawer and BottomSheet use native `<dialog>` (real
    modal, Escape, top layer); popovers, menus, comboboxes, tooltips and toasts use
    `@floating-ui/react-dom` for position and the Popover API (`popover="manual"`, set only where
    supported) to sit above dialogs. Motion is CSS (`@starting-style`, 150 to 200 ms); the `motion`
    library isn't used yet. Reduced motion: `data-motion` on `<html>` from Settings, else the system.
19. **Class merging**: `cx()` is tailwind-merge (with the `control`/`panel` radius and `float`
    shadow tokens), so a `className` passed to a kit component overrides its defaults.
20. **Code colors**: the editor and static views share lezer's `classHighlighter` (`tok-*`
    classes) styled by `--code-*` tokens. CodeMirror is themed in JS (`EditorView.theme` on
    tokens) because its injected styles beat layered CSS. Languages: C++, Java, Python,
    JavaScript, SQL (MySQL dialect), plus TypeScript in Markdown.
21. **KaTeX**: pinned to 0.16.x (rehype-katex's range) so one copy ships; a build plugin keeps
    only woff2 fonts; one-line `$$…$$` is turned into display math (`components/ui/markdown.ts`).
22. **Library link rewrites**: rather than allowing more hosts in `check-artifact.mjs`, the build
    rewrites three error-message links (hast-util-to-jsx-runtime on GitHub, Redux and Redux
    Toolkit error pages) into words (`vite.shared.ts`).
23. **Charts** (Recharts wrappers in `components/ui/charts.tsx`): bars at most 24 px with a 4 px
    rounded end, 2 px lines, hairline grid, legend for 2+ series, hover tooltip, and "Show as
    table" on every chart. Difficulty uses an ordinal blue ramp validated against the surfaces
    (light `#86b6ef/#2a78d6/#104281`; dark flips to `#2a78d6/#5598e7/#9ec5f4`).
24. **Search** (F23): MiniSearch over subjects, topics, concepts, problems, puzzles, design prompts
    and mistake tags; ids prefixed by kind (`concept:…`); prefix + fuzzy (0.25, words of 4+
    letters), AND then OR; boosts must 1.3, important 1.1, topics 1.15, subjects 1.3. Built when the
    browser is idle after first paint; mistake tags refresh when the palette opens.
25. **Activity** (F29): an activity clock counts time while any source runs (focus timer now,
    attempt timers from Phase 3); overlapping sources count once and gaps over 2 minutes (sleep)
    don't count. `ActivityDay` gained optional `attempts`, `checks`, `planItemsDone` counters (no
    migration needed). The streak freeze is derived, not stored: it covers one missed day with
    active days on both sides, once per ISO week, and doesn't add to the count.
26. **Backups**: the reminder counts from `createdAt` when there has never been a backup; showing
    the file in the copy dialog counts as a backup. Replace-import and reset keep an in-memory
    snapshot so the toast can undo them during the visit.
27. **Later-phase routes** rendered "Arrives in phase N" pages until Phase 8 gave every route its
    real page; `features/placeholder/pages.tsx` now holds only the not-found page.
28. **Per-browser conveniences in localStorage** (never synced, always in try/catch):
    `atlas.theme`, `atlas.themeSchedule`, `atlas.sidebar`, `atlas.recent` (palette), `atlas.setup.map|search` (Today
    checklist), `atlas.askWidth` (drawer width), `atlas.split` (workspace split), `atlas.template`
    (start attempts from the starter template), `atlas.mapPanel` (map panel width),
    `atlas.focusBlock` (a running or paused focus block, so a reload keeps it) and `atlas.wrapUp`
    (the night the wrap-up note was closed).
29. **Problem scheduling reading of 11.1**: "first ever attempt" means the problem has never been
    scheduled (`srs.dueAt` unset). Retirement needs a solo solve made *at* step 5 or higher (the
    60-day interval was reached) with `soloStreak ≥ 3` after it; a retired problem that is later
    not solved alone comes back. Status is never downgraded (solved once stays solved). Deleting an
    attempt keeps the schedule. CSV imports replay the whole history through the same scheduler
    (`replaySchedule`), so imported and hand-saved history schedule identically.
30. **Mastery engine pulled into Phase 3** (section 11.2 in `lib/mastery/status.ts`), because an
    attempt must update its concepts' statuses. Without checks, attempts on linked problems make a
    concept "learning"; strong needs checks (Phase 4). Statuses are recomputed after attempts, on
    start and when the local date changes (`clockStore`); only changed ConceptStates are written.
31. **Draft = attempt in progress**: `ProblemDraft` adds `mode`, `startedAt`, `elapsedMs`,
    `hintsUsed`, `sawSolution`, `revealed` to the spec's `{ language, code, updatedAt }`, so reloads
    keep the timer, hints and re-solve state. Autosave 2 s after the last change, plus on
    `pagehide`, tab hidden and leaving the page. A re-solve draft forces `?mode=resolve`, and a
    re-solve opened over an unsaved normal draft asks before replacing it.
32. **Workspace layout**: full-bleed (no PageFrame, like the map); a resizable split from 1024 px,
    "Problem" and "Code" tabs below; the workspace is keyed by problem and mode, so each starts
    from its own draft. Re-solve hides patterns, insight, notes, attempts and mistakes; revealing
    marks the attempt "saw the solution". Hints used lock "Solved alone"; a revealed or opened
    solution locks both "solved" results.
33. **Offline hint ladder** (F11): `src/data/hintLadder.ts` has original per-topic text (a broad
    area that doesn't name the technique, a guiding question, a step outline) with subject and
    generic fallbacks. Level 2 names the pattern with its scope and signals; level 3 shows the
    pattern's template, or the outline until templates are written (Phase 5). "Show full solution"
    opens the LeetCode editorial (quant puzzles show their answer).
34. **Offline "Suggest patterns"** in quick add: patterns of the seed problems whose titles share
    the most distinctive words (IDF-weighted). "Ask Claude" beside it uses prompt 17 (ids checked,
    difficulty offered, never applied over the owner's choice).
35. **Library filters live in the URL** (`#/problems?status=solved&difficulty=easy&topic=dsa`);
    a subject id works as a topic filter. Rows render progressively (150, then more on scroll).
36. **CSV import**: header synonyms, `,` `;` or tab, dates day first by default (switchable),
    rows without a result count as the chosen default, unmatched rows can become own problems,
    attempt ids are stable hashes so re-importing adds nothing, and the import can be undone.
37. **Links without a scheme** go through `withScheme()` (a protocol-relative URL resolved against
    leetcode.com), because a literal `https://${…}` would fail the artifact URL check.
38. **Mistake numbers**: counts once per attempt; the trend compares the window with the one
    before it (all time: last 30 days against the 30 before); the checklist is the top 5 of the
    last 90 days, topped up from all time; archived tags stay on attempts but leave the pickers.
39. **Claude buttons** were honest placeholders until Phase 6 (`LaterClaudeButton`, now removed);
    every one is a real feature now.
40. **Map rendering**: React Flow (`@xyflow/react` 12, attribution hidden for this personal
    project; its link strings are rewritten at build time like decision 22). Bubbles are React
    Flow nodes (fixed `width`/`height`, `nodeOrigin` centered, `onlyRenderVisibleElements`, node
    objects reused when unchanged); regions, lines, arrowheads, topic rings and middle-zoom dots
    are a few SVG paths in a viewport portal, not React Flow edges. Labels keep a fixed screen
    size through `--map-inv` (1 / zoom) and show from a precomputed zoom step
    (`lib/map/labels.ts`, greedy by importance, never overlapping; density from Settings).
41. **Semantic zoom**: far below 0.3 (subject cards on region circles, ring = share strong,
    coral fading badge, cross-subject links bundled per pair), middle to 0.7 (topic cards with a
    status bar, topic arrows, status dots), near above (concept bubbles). Near in, lines to
    other subjects are drawn only for emphasised concepts (hover, focus mode, a path); otherwise
    they would cross the whole map.
42. **Map URL**: `focus` (selected concept; links fly there and pulse), `topic`, `subject`,
    `path` (F25), `hops` (focus mode), `view=list`, and filters (`subjects`, `status`,
    `importance`, `ready`, `due`, `advanced`, `track`, `hidden`). Scope filters (subjects,
    track, advanced, hidden) remove bubbles; attribute filters (status, importance, ready, due)
    dim them. The map's own URL changes never fly it. Search results for concepts open
    `#/map?focus=…`.
43. **Map interaction**: dragging only with a fine pointer (touch pans; long-press opens the
    menu). The owner's concepts get a spot next to their topic the first time the map draws
    them, saved as a MapOverride so later additions never move them; Reset layout re-places
    them. Hover dims gently (0.4) and keeps the selection bright; focus mode and paths dim firmly.
44. **Concept panel**: an in-flow, resizable side panel from 768 px (`atlas.mapPanel` width),
    a bottom sheet below; back and forward through the last 30 concepts visited.
    `#/concept/<id>` shows the same header and tabs as a page. "Why this color?" reads
    `knowledgeDetails` and `computeStatus`, the same functions that set the color.
45. **Checks**: `recordChecks` stores the check, moves the concept schedule (11.1; the first check
    starts review; `session` makes an explicit review count before the due date), recomputes the
    status, and logs checks, reviews and concepts touched. A manual "strong" also records a
    manual check (score 1, worth 0.8), which starts its review so it can still fade. Status
    changes to strong or fading are counted per day (`ActivityDay.turnedStrong/turnedFading`)
    for the weekly review.
46. **Offline checks**: flashcards use the seeded questions; until a concept's content exists
    it gets one recall card (its name, answered by its scope and interview points). Again, Hard,
    Good, Easy score 0, 0.4, 0.8, 1; one check per concept per session (the average); closing
    part way keeps what was rated. Explain it back without Claude needs 40 words, then a
    checklist of the interview points (or the scope's parts); score = ticked / total; the text is
    kept in the check and listed in the Notes tab.
47. **Onboarding** at `#/welcome`: the first visit to Today redirects there (once per load)
    while `onboardingDone` is false; answers are saved at Finish; "Skip for now" keeps defaults.
    Comfortable topics get reviews from tomorrow, at most 15 a day, must-know first (beyond a
    week if needed). A re-run starts from the answers implied by stored `selfAssessed` values.
48. **Path to a concept**: its prerequisites followed transitively, plus the must-know concepts
    of its topic's prerequisite topics (and their prerequisites); a learning or strong concept
    ends its branch; fading ones stay on the path (they need a review first, as in 11.5).
49. **Pulled forward from Phase 7**: readiness (11.3, `lib/readiness`) to rank "ready to learn";
    Today shows the top 5 ready concepts, the fading count, and plan items the owner adds from
    the map or a path (`planStore`); the generated plan arrives with the planner.
50. **Ink moment**: `refreshConcepts` notes concepts that newly turn strong (`inkStore`, fresh
    for 60 s); a bubble on screen plays it once, after any modal dialog closes, then lines to
    the concepts it made ready draw in.
51. **Studied** is always explicit ("Mark as studied", also offered at the end of the Interview
    level), never inferred from scrolling, so a status never changes without a visible reason.
52. **`<main>` is `position: relative`**, so screen-reader-only text in long lists can't stretch
    the page beyond the scroll area.
53. **Concept text is split from the structure** (Phase 5): the spec's `Concept.content` became
    `Concept.written` flags (`core`, `deep`, `questions`, `any`, `needsReview`); the text is one
    generated JSON per subject, loaded when first needed, with skeletons meanwhile and "Try again"
    if it fails. Deck sizes come from the flags (`deckSize`); search indexes names and scopes at
    start and adds simple levels when the palette opens; the hint ladder takes the pattern's text
    as an argument. The startup syllabus chunk went from 1.5 MB to 370 KB. The artifact still
    inlines everything (5.2 MB with DSA written).
54. **Content conventions**: questions, answers and signals are plain text (they render without
    Markdown); a question ends with `?` or `.`; a pattern's first signal is a clue that doesn't name
    it (the hint nudge shows "A clue to look for: …"); must-know deep articles are 300 to 900 words
    including code; code is C++ only (decision 58), and every ```` ```cpp ```` block must pass
    `npm run check:content-code` (a block starting with `// sketch` is skipped). A `###` heading
    that isn't one of the six sections fails the build. When a subject is finished, add it to
    `FINISHED` in `tests/syllabus/content.test.ts` so the strict rules stay enforced for it.
55. **Drill bank** (`src/data/drills.seed.ts`, 276 prompts): each prompt's first answer id is its
    main pattern, and every one of the 90 patterns is the main answer of at least three prompts;
    further ids are also fully correct. Tested in `tests/seed/drills.test.ts`.
56. **Hint nudge wording**: "A clue to look for: <first signal>." (works for noun and verb
    phrases); level 1 never contains the pattern's name (tested for every seed problem).
57. **Content code checks** (Phase 5, OOP and OS): the C++ prelude includes POSIX and Linux
    headers (`unistd.h`, `sys/wait.h`, `sys/mman.h`, `semaphore.h`, `sys/epoll.h`,
    `sys/resource.h`, `sys/utsname.h`, `ucontext.h`, …), so C++ checks need Linux;
    a block's `int main` is renamed to a function with a deduced return type. Code lines stay
    within 100 characters, and examples never print real URLs (the artifact URL check would
    fail; only the reserved example domains are allowed, decision 59).
    The checker still parses `python` and compiles `java` blocks (with `javac`, one package per
    block) for the `lang` subject's Java and Python topics.
58. **C++ only** (the owner's choice, session 7): concept content has no Python or Java code and
    no comparisons with them, in DSA, OOP, OS and every later subject; ideas are explained through
    C++ and its standard library. `tests/syllabus/content.test.ts` fails on a `python`/`java`
    block or the words "Python"/"Java" in any concept's name, scope or text, except in
    `lang.java-core` and `lang.python-core` (still in the syllabus, dimmed while the primary
    language is C++). Other languages appear only as a named real-world example of a systems idea
    (Go's goroutines for M:N threading), never as code. "equals and hashCode in Java" became
    "Equality and hashing" with its id kept (`renamed: true` in content, `(id: …)` in the spec).
59. **Example URLs in content** (session 8, CN): networking needs real-looking URLs (URL anatomy,
    CORS origins, redirects), so `check-artifact.mjs` allows the reserved documentation domains
    `example.com`, `example.org` and `example.net` (and their subdomains). Content keeps such URLs
    inside code (inline or fenced), because remark-gfm would turn bare URLs into links. Public IP
    addresses in examples come from the documentation ranges (192.0.2.0/24, 198.51.100.0/24,
    203.0.113.0/24). The code-check prelude also has the socket headers (`arpa/inet.h`, `netdb.h`,
    `netinet/in.h`, `netinet/tcp.h`, `netinet/ip_icmp.h`, `ifaddrs.h`, `net/if.h`, `sys/uio.h`,
    `sys/random.h`); CN socket examples run over loopback, and ping needs root for its raw socket.
60. **SQL content** (session 9): queries are written for MySQL 8 (the app's SQL dialect) and
    run on a real MySQL 8.0 and PostgreSQL 16; each deep article is self-contained (it creates
    its own tables), shows query output as a Markdown table after a line starting "Result:"
    ("Result: no rows." for an empty result), marks statements that must fail with a trailing
    `-- error ...` comment, and starts PostgreSQL-only blocks with `-- PostgreSQL`. Differences
    between the two databases are stated where they matter. Examples use original tables and
    data, never LeetCode's.
61. **Language core content** (session 10): C++ blocks that show undefined behavior start with
    `// Undefined behavior: ...` and are compiled but never run; blocks that trigger a compiler
    warning on purpose start with `// Warns: ...`. `check:content-code` does not report warnings for
    either. The text never uses a UB program's output as evidence, only sanitizer or debug-mode
    reports and generated assembly. The `lang.java-core` and `lang.python-core` topics are short:
    deep articles only for must-know concepts, no comparisons with C++; their Java and Python code
    is checked by `check:content-code` and was run on Java 21 and Python 3.11.
62. **Concurrency content** (session 10): threaded examples must print the same output on every run:
    force rare interleavings with barriers or latches, and print invariants instead of timing-dependent
    splits. Anything machine-dependent (timings, litmus-test counts) is labelled as one run with the
    range seen. Check with ThreadSanitizer from both GCC and clang: GCC 13's misreports
    `timed_mutex` timed locks. Scope text may contain backticks; show it with `CodeSpans`
    (`components/ui/Misc.tsx`), which renders them as inline code.
63. **Concept links in content** (session 11): content may link to another concept with
    `[text](#/concept/<id>)` (LLD links to the OOP patterns instead of repeating them). The
    syllabus build rejects any other `#…` link (except quant puzzles, decision 67), a missing id
    and a link to the concept itself.
    `MarkdownView` takes `onConceptLink`, so on the map a plain click opens the concept in the
    panel (with back and forward); elsewhere the link is an ordinary hash route.
64. **LLD designs** (session 11): class relationships are text diagrams in PlantUML-style
    notation (`*--` composition, `o--` aggregation, `-->` association, `..>` dependency,
    `..|>` realizes, `--|>` inherits, multiplicities in quotes). Every design compiles and runs a
    short demo under ASan and UBSan with its output shown; concurrent parts also ran under
    ThreadSanitizer. A classic's article ends with `#### Interview checklist`, naming each
    "must discuss" point of its `lld-<slug>` prompt in bold, word for word
    (`tests/syllabus/content.test.ts` checks it). Design prompts have at least 3 sentences.
65. **Probability numbers** (session 11): every answer is exact first (fractions where possible),
    then confirmed by a C++ simulation with a fixed seed (`mt19937_64 rng(2026)`, uniforms from
    the top 53 bits, dice by `rng() % 6` (bias below 1e-19), own Fisher-Yates and Box-Muller,
    never the implementation-defined `std::*_distribution` or `std::shuffle`), so GCC and clang
    print the same output. The text says how close the run came in standard errors and never
    presents a simulated number as exact; a run beyond about 2.5 standard errors is rechecked with
    other seeds (or an independent solve) and the text says what was found. Each formula states its
    assumptions (independence, replacement, equally likely outcomes). Nothing needed
    `needsReview`.
66. **Original quant puzzles** (session 11): 57 beyond the spec's 41 in `quant.seed.ts`, across
    `prob`, `math`, `puzzles` and `markets`, easy to hard. Every checkable answer is recomputed
    independently in `tests/seed/quant.test.ts` (enumeration, dynamic programming, integration,
    search) and compared through `answerCheck`; yes/no answers are checked by brute force.
    Answers may be expressions (`10*(1-0.9^8)`, `100 - sqrt(5000)`); percentages use `%`.
67. **Links to quant puzzles in content** (session 12): `[text](#/problems/q-<slug>)` points at a
    puzzle to practice on instead of repeating it. `build-syllabus.mjs` reads the ids from the
    `id: "q-…"` lines of `src/data/quant.seed.ts` (it can't import TypeScript) and rejects unknown
    ones; `tests/seed/quant.test.ts` keeps that list equal to `QUANT_PUZZLES`. Articles use a
    different instance from the bank for their worked example and never state a linked puzzle's
    answer next to the link. In the map panel a concept link opens in place (the panel's scroll
    resets per concept); a puzzle link opens the puzzle page.
68. **Math and Puzzles content** (session 12): every numeric answer is exact first (fractions or
    closed forms) and confirmed by a C++ program: brute-force counts, exhaustive game or strategy
    searches, exact rational elimination, Simpson or Runge-Kutta checks, or a seeded simulation
    reported in standard errors (decision 65's rules). Two random draws in one expression are
    unsequenced in C++, so draw them in separate declarations to keep GCC and clang identical.
    Mental math concepts end with timed practice lines whose answer keys the programs print.
    Never put a `|` inside math in a Markdown table cell (it splits the cell); use `\lvert`
    and `\rvert`.
69. **Markets content** (session 13): numbers are exact first (enumeration, DP, closed forms) and
    confirmed by a C++ program; simulations follow decision 65 and report their distance in
    standard errors. Order books, prices, firms and games are made up; no real market data and no
    real firm's practices. Market-making and trading-game articles include a worked game as a
    transcript (**Interviewer:** / **You:**) with the reasoning said aloud. Venue-dependent details
    (stop triggers, time-in-force names, pro-rata rules, auction tie-breaks) are marked
    `needsReview: true`. Articles link Probability, Math and Puzzles concepts and quant puzzles.
70. **Architecture content** (session 13): claims about data representation (two's complement,
    IEEE 754, endianness, alignment, UTF-8) are printed by programs checked under GCC and clang.
    Benchmarks start with `// Build with: g++ ...` (their flags), take the best of several batches
    where noise matters, show one run after a line that says "one run", and give the range over
    five runs in the text; machine-specific numbers are never presented as general. The
    code-check prelude includes `<immintrin.h>`; intrinsics live in `[[gnu::target("avx2")]]`
    functions behind a `__builtin_cpu_supports` check. The cloud VM exposes no hardware counters:
    `perf` (from `linux-tools-generic`, run as `/usr/lib/linux-tools-*/perf`) samples the software
    `cpu-clock` event.
71. **Aptitude content** (session 14): every question, passage, table and puzzle is original.
    Quantitative answers are exact first (a small `Frac` type) and confirmed by a C++ program;
    each shortcut says when it applies and when it breaks; every quantitative concept ends with
    timed practice lines whose key the program prints. Logical items are checked by brute force
    over every model, and the programs show that each puzzle has exactly one answer (or report
    "not determined"). Stated conventions: distinct names are distinct people, siblings share
    parents and a parent's spouse is the other parent (blood relations); "all A are B" implies A
    exist (syllogisms, unlike modern formal logic). Verbal content separates grammatical rules
    from style and usage points and says which is which. A linked quant puzzle's numbers never
    appear in a worked example next to the link.
72. **Engineering content** (session 14): every command example is run for real on the session's
    machine and pasted unchanged, with machine-specific values labelled. Git sessions fix
    `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` (one hour apart from 1 September 2026, 09:00 IST)
    and names from `example.com`, so hashes are reproducible. Sessions needing a terminal are
    recorded through an interactive bash on a pseudo-terminal. Local HTTP examples call
    `curl localhost:PORT/...` without a scheme, because `http://localhost` would fail the artifact
    URL check; output that embeds other URLs is filtered with `grep -o` and the text says so. Program
    code stays C++ (a notes server, test runners, mocks); shell, Dockerfile, YAML, JSON and HTTP
    appear as tools. What can't run here (Kubernetes clusters, hosted CI) is shown as files with
    an explanation, never invented output. Cloud product names are marked `needsReview`.
73. **Career content** (session 15): one made-up candidate, Kiran (a final-year student in India
    with two internships and a few projects), runs through every example; the articles say that
    every person, company and number is invented, and nothing names a real company's practices.
    STAR and values answers are shown weak and strong in one table, followed by "What changed and
    why". Computed numbers (percentages, word counts, speaking time at an assumed 140 words a
    minute, pay, tax, weighted scores) come from C++ programs; story facts are premises. The app
    has no page per behavioral question yet, so the story bank links to the bank inside its program
    (ids and suggested tags), and `tests/syllabus/content.test.ts` keeps that copy equal to
    `BEHAVIORAL_QUESTIONS`. Tax uses India's new regime for FY 2025-26, stated in the text, with
    `needsReview`; so do OA formats, the quant firm process and campus routes. The Atlas project
    deep dive quotes numbers measured from the repository at the end of Phase 5 and says so.
74. **AI modes** (Phase 6, F21): ServicesProvider creates the AI service from the runtime (which
    providers exist); the profile keeps the owner's choice; `resolveMode` picks what runs now:
    built-in Claude needs `sample` and no blocking error this visit, an API key needs the web app
    and a saved key, otherwise copy prompt. A first run with `sample` starts in built-in mode.
    `not_granted`, `sampling_disabled`, `not_declared`, `capability_disabled` and
    `capability_removed` switch the visit to copy prompt (toast); "Try again" then opens the modal.
    Switching modes in Settings needs no reload.
75. **API key mode**: plain `fetch` to `/v1/messages` (the spec's contract; mocked in tests), the
    instructions in `system`, `stream: true`, text from `text_delta` events; no `temperature` or
    `thinking` fields. Output budgets are quick 4,096, default 16,000, complex 32,000 tokens (not
    the spec's 1,024 / 4,096 / 8,192), because Sonnet 5 and Opus 5.5 think first and thinking
    counts toward `max_tokens`. No headers in 60 s or no bytes for 90 s is a timeout. HTTP and
    stream errors map to plain copy (401/403 key, 404 model name, 429, 529, too long). Test
    connection sends a tiny request per tier and stops after a key or network failure.
76. **JSON replies**: read tolerantly (whole text, a fence, first bracket to last) and validated
    with zod; an object wrapping the one expected array is accepted. An unreadable reply is asked
    for once more with a firmer reminder and no cache (built-in and API only; never a loop; never
    in copy mode); then the raw reply shows with Try again. With a schema, built-in Claude uses
    `sample.json` (a missing `json` falls back to text plus parsing).
77. **Caching**: chat turns and every "Try again" or "Ask again" pass `cache: false`; other
    built-in calls keep the runtime's 5-minute cache. Claude hints are kept per problem and level
    in `ProblemState.hints`, reviews on the attempt, generated explanations in the note;
    `cacheKey` keeps a full solution or an older attempt's review for the visit.
78. **Context** (`features/ai/gather.ts`): the learner block always (track, language, countdown,
    up to 15 strong concepts nearest the topic, top 5 mistakes); the concept with its written (or
    kept Claude) text and the owner's notes; the problem with summary, insight and notes, except
    that an unrevealed re-solve hides the insight and notes (patterns stay, hints need them); code
    clipped to 12,000 characters keeping both ends. `fitPrompt` keeps every prompt under 48 KiB,
    trimming older turns, then notes, then code, then other context, and says when it did.
    Code Claude writes or reviews is in the profile's main language (preamble line).
79. **Workspace AI**: one panel under the editor at a time (hints, review, dry run). Reviews and
    dry runs belong to the attempt: the draft carries `review`, `reviewedCode`, `dryRuns` and
    `pendingTagIds`, saved onto the attempt; tags taken from a review start selected in the save
    dialog and its other suggestions are listed first; labels that match none of the owner's tags
    show but can't be added. Older attempts can be reviewed from the attempt dialog. Claude hints
    count as used only once shown; the hint source defaults to Claude except in copy prompt mode.
    "Explain it with Claude" for the full solution marks the attempt "saw the solution".
80. **Explain with Claude**: a concept with nothing written (the owner's own) gets a Claude draft
    (prompt 2) that the owner keeps in `ConceptNote.generated`; flashcards and explain it back use
    it through `studyContent`. Written concepts get "Explain it another way" (prompt 1) at a chosen
    level, which can be saved as a saved answer. Nothing overwrites the owner's notes.
81. **Grading and quizzes**: a Claude-graded explanation is saved at once (score / 5, detail mode
    `claude`); answering the follow-up regrades and records a new check only if the score rises.
    Quick quizzes drop unusable questions (bad answer index, duplicate options), map unknown
    concept ids to the first concept, mark multiple choice at once, batch-grade short answers on
    the quick tier (or "Mark them myself" when grading fails), and record one check per concept.
82. **Pattern drill pulled forward from Phase 8**, because it hosts F10's grading and generation:
    `#/drill` runs 3, 5, 8 or 10 prompts from the bank (seed plus kept Claude prompts) or from
    solved problems; unseen prompts (14 days) first, weakest first on request, one per pattern
    when possible, shuffled from a seed. A pick is correct, partial (same topic) or wrong (1, 0.5,
    0), recorded as a drill check on the main pattern at reveal; accuracy over 60 days and
    confusion pairs (twice or more, top 5) follow 11.6. Claude grades a typed approach on a button
    and writes 5 prompts for the weakest patterns, kept only if every id is one of the 90
    patterns. `?pattern=<id>` drills one pattern (the Practice tab links there).
83. **Ask Claude chats** live in memory only (a drawer thread and one per concept Ask tab). Chips
    come from the screen (concept, problem, the editor's code read at send time) and can be left
    out; the learner block ("Your progress") always goes. Quick actions sit under the newest
    answer; "Save to concept" under any answer. Enter sends, Shift+Enter adds a line.
84. **Copy prompt modal**: one host in the shell (`aiStore.copy`): the prompt read-only with Copy
    (selected with a "Press Ctrl+C" hint when the clipboard is blocked), Open Claude
    (`claude.ai/new`) only outside the claude.ai frame, and a paste box. Cancel ends the request
    quietly. Every feature is tested in all three modes (`tests/app/claudeModes.test.tsx`).
85. **Plan kinds are planned only once their screen works** (`AVAILABLE_PLAN_KINDS` in
    `lib/planner/kinds.ts`, so Start never leads nowhere). Since Phase 8 every kind is available:
    mental math (`#/mental-math?mode=speed`), story practice (`#/stories?question=…`), design
    practice (`#/designs/<id>`) and mocks (`#/mock?type=dsa`). `plannerHistoryNow()` passes the
    local dates of finished mocks, designs and story practice as `PlannerInput.history`, and each
    finished session ticks off its item. The weekly review always shows mock counts.
86. **Planner readings of 11.4**: the minimum day takes the most overdue easy re-solve (it fits the
    15 minutes), else a medium one, else up to 3 due or fading concepts, else a drill. The most
    urgent re-solve and the first flashcard bundle always get a place when they fit the day; the
    rest of the reviews fit the 45% (60%) share, and a bundle of 4 shrinks to 3 to fit. Slots stay
    free for a bundle and one learning item, so short re-solves can't fill all 8. Weekly extras
    are placed before the reviews. New learning alternates problems and theory by the balance
    until the budget. Fit: at most B + min(15, 10% of B), filled toward 90% of B, then at least 3
    items from the smallest; no item longer than B; at big budgets the 8-item cap wins over 90%.
    A gentle start: while no pattern is learning or ready (the first days), easy problems on the
    earliest patterns whose own prerequisites are met. Near the interview, re-solves due within a
    week (and before it) are pulled forward after the due ones, and new problems are medium ones
    from started patterns. A mock prefers weekends (on a weekday only 10 days after the last);
    story practice never on two days running. Ties use `seededRank(date)`; item ids are
    `kind:refs`, so two devices planning the same day agree.
87. **The day's plan**: `PlanItem.origin` (planner or owner; stored items without it are the
    owner's) and `DayPlan.plannedAt` (the planner ran). A new time or the minimum day plans again
    and keeps done, skipped and the owner's items (they count toward the budget and are never
    planned twice); skipped items don't count. The bar shows the minutes of done items against the
    budget, with activity minutes beside it. Drills and mental math have no Swap (one a day).
    Items complete themselves: attempts (re-solves, new problems), a check or "Mark as studied"
    (learning), a flashcard bundle once each of its concepts has a check that day, a finished
    drill session, and printing, exporting or reading a sheet to the end (after 15 s) for a
    revision item. Store updates happen before the storage write, so marks never race.
88. **Dashboard numbers**: each one is an `ExplainNumber` popover with its data and formula. Due
    today = review date today, overdue = earlier (together the Review count); retention =
    re-solves (any attempt after a problem's first) solved alone over all re-solves in 30 days;
    the weakness report lists must-know learning or fading concepts with the lowest scores,
    patterns with solves but no hard one solved alone (offering an unsolved hard problem), and
    subjects with progress but nothing for 14 days, each with "Add to today" (an owner item). The
    projection's pace counts must-know `strongSince` in 14 days; the range is ±20% of the growth.
    Pattern tiles are tinted by practice in 5 steps (`--heat-2` mixed into the surface, at most
    50%), dashed when no hard problem is solved alone. A year of data (358 problems, 1,433
    attempts, 3,000 checks) renders in about 150 ms on navigation and 400 to 550 ms cold.
89. **Chart axis labels** are drawn by our own `AxisTick` with fixed label intervals, and the grid
    gets an empty vertical generator: Recharts measured every label with a hidden span and
    `getBoundingClientRect`, forcing a whole-page layout per label (one second on the dashboard).
90. **Heatmap**: `--heat-0` to `--heat-4` (one blue, validated as ordinal ramps on both surfaces;
    in the dark more activity is lighter), ISO weeks Monday first, days the weekly freeze covered
    (from `computeStreak`) outlined, a hover tooltip and "Show as table" by week.
91. **Activity clock**: part-minutes carry across midnight and between sessions, and each minute
    goes to the local date of the instant just before it completes, so days add up to the time
    spent. Tested in six time zones (including +05:30, +12:45 and −02:30) and on DST days.
92. **Activity counters** added: `solvedEasy/Medium/Hard` (they add up to `problemsSolved`; older
    days fall back to the attempts), `drillSessions`, `drillAnswers`, `mocks` (Phase 8). Weekly
    notes live in `ActivityMonth.weeks` keyed by the week's Monday (reflection, suggested focus,
    acceptedAt), merged newer-wins on import.
93. **Weekly review**: opens once on the first visit to Today after Sunday 18:00 local
    (`Profile.weeklyReviewSeenAt`), only for an owner who had Atlas before then; it covers that
    Monday to Sunday; Today shows a note when the owner arrived elsewhere; `?week=` shows past
    weeks. Without Claude: a summary from the numbers and a focus suggestion (subjects with fading
    concepts first, then weight × distance from ready). Claude's reflection (prompt 14) reads the
    week's numbers and subject readiness; the reply is split by `parseWeeklyReflection` and kept in
    the week's note; "Use as my focus" sets `focusSubjects`, with Undo.
94. **Revision sheets**: Markdown sections are the one source for the screen, printing and both
    exports. 1-day limits: checklist 5, insights 10, weak concepts 6 with 3 points each, formulas
    10 (the first interview point with math and "=" of started must-know prob, math and markets
    concepts, Quant and Both tracks). 1-week: the checklist, then a page per subject with its
    learning and fading must-know concepts (every point), every pattern with signals and template,
    and solved problems' insights grouped by their first pattern. Custom picks subjects, topics
    and patterns (in the URL). Printing hides the shell (`print:` classes; the page frame drops its padding, which had
    spilled onto a blank page), forces the light tokens
    (`:root:root:root` in `@media print`) and breaks pages per subject; when `beforeprint` doesn't
    fire within a second (the claude.ai frame), a note offers Export as HTML. The HTML export is the
    rendered sheet, cleaned, in a standalone page with light styles, MathML for math and code
    colors, and no URLs or scripts. "Tighten with Claude" (prompt 15, complex tier) sends whole
    sections up to 42 KiB (naming any left out) for about half the words; the result is kept for
    the visit, marked "Edited by Claude", with the original one tap away; exports take the version
    shown.
95. **Fixture owners** (`tests/fixtures/scenarios.ts`): a new owner, one mid-way, one a week
    before interviews, and a year of data, generated from fixed seeds with statuses from the real
    engine. `ATLAS_FIXTURES_DIR=<dir> TZ=Asia/Kolkata npx vitest run tests/fixtures/write.test.ts`
    writes them as backup data for screenshots and timing runs.
96. **Puzzle answers** (F28): a checkable puzzle is "solved" only once its answer checks out with
    `answerCheck` (equivalent forms, 0.5%); tries are counted, and hints limit it to "solved with
    hints". An open-ended puzzle is graded by Claude (prompt 16) or by the owner against the
    answer note ("I had it" 1, "Partly" 0.5, "I missed it" 0); a correct grade of 0.8 or more is
    a solve, 0.4 or more a solve with help. "Show the answer" means "saw the solution". The
    answer, tries and grade ride in the draft and are kept on the attempt.
97. **Mental math sprints** (F28): generators are seeded; division is always clean; one-decimal
    operands are never whole numbers; sequences are shown only when every simple rule the
    checker knows predicts the same next term (`isUnambiguous`); estimation accepts 5%. Tiers run
    from 2 × 1 to 3 × 2 digits. A finished sprint is a check on its mode's concepts with score
    correct ÷ total × tier weight (easy 0.8), capped at 1; "End early" saves nothing.
98. **Stories** (F27): one record of each question link (on the story), so the editor, the
    coverage matrix and practice agree. Practice without a story is kept on a hidden story
    `story-unsorted` ("Unsorted practice"); "Tell me about yourself" is the story `story-intro`
    (`kind: "intro"`). A practice is an explain check on the concepts `practiceConcepts` names
    (STAR, plus the story bank when a story was used), scored by the critique's four scores ÷ 20
    or by the self-check lines ticked ÷ 6. Speaking time assumes 140 words a minute.
99. **Design sketches** (F26): one edge per line, `A -> B : label`, chains, `<-`, `<->`, `-->`
    (dashed), `--` (plain), a kind in brackets (`[db]`) or guessed from the name. Unreadable lines
    are listed with their line number and what to write, and the good lines still draw. Layout
    is dagre (layered); the direction that draws it largest is used until the owner picks one.
    Rendered with React Flow custom nodes and edges from dagre's points, no library styles. A
    review's overall score sets the saved attempt: 4 or 5 solved alone, 3 with hints, else not
    solved; design attempts stay out of the re-solve queue (`keepOutOfReview`).
100. **Mock interviews** (F15): every candidate turn starts with `[Phase: <phase> | N min left]`
    (stripped for display) and is saved before Claude is asked; the reply is saved when it ends
    (Stop keeps what arrived, ending in " …"); consecutive turns of one speaker are merged before
    sending. The clock (`elapsedMs`) is saved every exchange, every 15 s and on leaving, so a
    reload resumes it. The coding problem is never shown or stored as a statement: the brief
    gives Claude its name, difficulty and patterns and asks it to describe the problem in its own
    words without naming the pattern; its name appears after the feedback. Feedback (prompt 11)
    turns the code into an attempt with mode "mock" (problem solving 4+ solved alone, 3 with
    hints, else not solved); a design round writes in the design workspace (its own clock off)
    and finishes that attempt with the mock's mean; a behavioral round is an explain check on the
    STAR method (mean ÷ 5); every finished mock counts in the day's `mocks`. A session's delivery
    is fixed when it starts: live (built-in Claude or an API key) or copy (a whole script for a
    claude.ai chat and a form that validates the pasted feedback JSON).
101. **Leaving the page flushes storage**: `pagehide` and a hidden tab call `repository.flush()`
    (after the notes debounce), so a reload within the synced store's 800 ms write debounce keeps
    the last exchange.
102. **Pattern recognition on the dashboard** (F10 "results feed the dashboard"): the pattern grid
    shows drill accuracy over 60 days, the patterns recognized least often (2+ answers, under
    100%) and the top 3 confusion pairs, each linking to a drill on that pattern; every tile's
    explanation gives its own drill results.
103. **Simulated claude.ai runtime for screenshots**: bundle a scratch entry that builds
    `createFakeClaude` with a `FakeClaudeDb` saved to `localStorage` on every write (so reloads
    keep it), `FakeClaudeDownloads` and `createFakeSample({ responder: demoSampleResponder,
    delayMs: 40, chunks: 12 })` with `npx rolldown <entry> --format iife`, and inject it with
    Playwright's `addInitScript` into the dev server or `dist-artifact/index.html`. Fixture
    backups with `profile.ai.mode = "sample"` start in built-in mode.
104. **Phase 9 plan** (planning session after Phase 8, 27 Sep 2026): the owner asked for research
    on colors for long study, focus and ADHD, and asked Claude to take the open decisions. Taken:
    the Survey look over Studio; three themes as three kinds of map (Day survey sheet, Dusk old
    atlas, Night sea chart) with System and "By time of day"; one OKLCH color per subject
    (replacing the cool-only `regionHue` rule; hues are outside the layout hash, so the map never
    moves); Bricolage Grotesque for display; no mascot (emblems and line drawings instead); a
    focus layer for everyone (F31); ADHD mode with every part, focus sound and Study with Claude
    off by default (F32); five Phase 9 sessions ending with polish and ship. Ideas the research
    didn't support stay out (bionic reading, colored overlays, "red lowers scores", worry-writing
    before exams). All-caps labels stay banned (12.9), so the mockups use sentence case. Details:
    BUILD_SPEC.md 12.10.10 and `docs/design/phase9-research.md`.
105. **Survey tokens** (session 19, 9.1): the 12.10.2 values are used as given, except
    `--text-faint`, darkened in Day (`#616A5D`) and lightened in Dusk (`#978B77`) by the smallest
    step that clears 4.5:1 on every plain background (the spec measured it on `--surface` only).
    Every other token is re-derived per theme on the same hue families: danger is crimson (OKLCH
    hue 12, apart from the coral of fading), Dusk's soft tints are 10% so muted text clears AA
    on them, chart and heat ramps sit on the accent's hue (246) and pass the dataviz ordinal
    checks (monotone lightness, steps of 0.06 or more, faintest step 2:1 on the surface; Dusk and
    Night flip). The contrast test covers: every text token on every plain background (canvas,
    surface, raised, sunken, sidebar) at AA, `--text` at AAA; text, muted and the matching color
    on every tint; labels on filled buttons (hovered too); code on the code background, diff rows
    and the active line; status strokes, focus ring and accent at 3:1; the ramps; the same token
    names in every theme; and the 12.10.2 table itself. A subject mark on its own tint needs only
    3:1 (emblems, icons): subject names on a tint are written in `--text`.
106. **Theme mechanics** (9.1): data version 2 (`Profile.theme` system, day, dusk, night or
    schedule; `prefs.themeSchedule`; migration light → day, dark → night). Dusk and Night sit in
    `@media not print`, so printing always uses Day (the print block only whitens the paper).
    `[data-theme-preview="…"]` draws a subtree in another theme (the kit's panels). The switch
    cross-fades with the View Transitions API (200 ms; instant with reduced motion or a hidden
    tab). By time of day re-arms a timer for the next start time and re-checks when the tab
    comes back (timers pause in sleep). The pre-paint script is checked against `lib/theme.ts`
    for 800 combinations of choice, schedule, time and device setting. The optional bedtime
    (12.10.8) arrived with the wrap-up note in 9.3 (decision 131).
107. **Subject colors** (9.1): `scripts/build-subject-colors.mjs` (part of `build:data`) turns
    each `regionHue` into OKLCH marks and tints, clipping out-of-gamut channels, which reproduces
    all 72 values of the 12.10.3 table (a test compares them). `[data-subject="<id>"]` sets
    `--subject-mark` and `--subject-tint` (Tailwind `bg-subject`, `bg-subject-tint`). Map regions
    fill with the tint (Day 0.55, far 0.9; Dusk and Night 0.5, far 0.75) and stroke with the mark;
    the hues stay out of the layout hash, and a forced layout rebuild gave a byte-identical
    `layout.json`.
108. **Contour engine** (9.1): hill `x`, `y` are fractions of the size, `r` a fraction of the
    span (the longer side, at least 320 px). Each hill is a Gaussian times a window that reaches
    exactly zero at 3 radii, and the level spacing comes from the seeded background alone (plus
    one unit when hills are given), so changing a hill moves lines only within its reach (tested).
    Saddles use one fixed pairing; every fourth line is an index contour; at most 64 lines.
    `ContourCanvas` keeps spot heights and soundings off the text beside it by measuring its
    siblings' text line boxes (plus icons and controls), so callers rarely pass quiet zones;
    soundings number about one per 9,000 px² (at most 16). Spot heights show in every theme when
    the picture is 480 px or wider, since they carry numbers. Emblems are SVG, drawn once in a
    64 px box (hills from `emblem:<id>`, background from the id) and scaled; memoized.
109. **Kit restyle** (9.1, 12.10.5): buttons are semibold pills (primary filled accent, secondary
    sunken, ghost bare); chips are sunken pills without borders, and a chip given `border-dashed`
    outlines in its own text color; segmented controls are pill tracks; layers (dialogs, drawers,
    sheets, popovers, toasts) drop their hairline for `--layer-edge` (none by day, a faint rim in
    Dusk and Night) and dialogs take 18 px corners; tiles are a sunken field; empty states sit on
    sunken paper with the contour texture; callouts are tints without borders; `Card` and
    `CardLabel` give 9.2 the surface card and the focal card. Page titles are Bricolage Grotesque
    600 at 30 px (28 on phones); reading text (MarkdownView) is 17 px, 18 px from 1280 px, with
    Plex headings (lessons stay plain). `cx` knows the custom `text-page`, `rounded-focal` and
    `shadow-focal`/`shadow-pill` tokens. The sidebar sits on `--sidebar` with a raised pill for
    the current page; the top bar is pills on the canvas with the theme menu (five choices, "Dusk
    now" for System and By time of day, and a link to the times in Settings). Screens keep their
    own layouts until 9.2.
110. **Focus subjects in the frame** (session 20, 9.2): `Profile.focusSubjects` show under "Your
    focus" in the sidebar (square marks; marks only, with tooltips, when collapsed) and in the
    More sheet on phones; each opens its region (`#/map?subject=<id>`). Nothing shows without
    focus subjects.
111. **Today** (9.2): the head is living terrain: the focus subjects, or the three heaviest in the
    track, as hills 0.35 + readiness / 100 × 1.3 high, placed from a seed of the subject id
    (candidates in the right part of the head, x 0.5 to 0.84, at least 0.13 apart), on a
    background seeded by the ISO week (`terrain:2026-W39`, 20 levels); the scale bar links to
    the interview date; the ring is minutes done against the time for today. Up next is the
    first stop not done, the focal card with a big Start (full width on phones), Done, Swap and
    Skip (Remove for the owner's items); every stop is on the route (its marker is the Done
    checkbox, the next stop ringed, the last a flag), the next stop's buttons live on the card
    and the others keep small Start, Swap and Skip. The ink stroke (250 ms) plays only when a
    stop turns done on screen. The side has the last 7 days (the heat ramp; an active day of
    few minutes shows at least the first step; a day the freeze covered is hatched), ready
    cards (subject tint tile with the status glyph, names in pencil and ink), the review count
    and "Your atlas". On phones the setup checklist comes after the side cards.
112. **Summit profile** (9.2): a past week's point is `evaluateReadiness` on the records as of its
    Sunday 23:59: checks and attempts up to then; a schedule with nothing recorded later is the
    stored one (so today's point equals the live readiness exactly), otherwise it is replayed
    (problems with `replaySchedule`, concepts check by check as plain checks, since whether a
    check came from a review session isn't stored); "studied" and a manual status count from
    the concept's first activity (a manual strong from its manual check), "ever strong" from
    `strongSince`. Weeks are the Sundays of finished weeks from the first week with any check,
    attempt or active day (at most 104); this week's point is live. Weeks are worked out one
    per idle callback after first paint, published every four, and cached for the visit under a
    fingerprint of the records up to that day. The trail applies F17's projection rule to
    readiness (the 14-day pace carried to the interview, ±20% of the growth, capped at 100,
    never below today). Points are one tab stop (arrow keys, Home, End), each an ExplainNumber;
    Show as table. A year of data takes about 17 ms a week in Node; the dashboard's cold load
    stays 0.5 to 0.7 s in the screenshot harness (the old build 0.46 to 0.55 s), and the profile
    fills in about 3.7 s later.
113. **Linked problems indexed once** per readiness evaluation (`linkedProblemsIndex`): the same
    lists in the same order as `linkedProblems`, without scanning every problem per concept
    (the live evaluation with a year of data went from about 18 to 11 ms).
114. **Ring and stamps** (9.2): the readiness ring fills to the score with each counted subject's
    share (weight × readiness ÷ Σ weights) in its own color, largest first, with a legend of the
    top five (a color never stands alone). A Monday to Sunday week with 5 or more active days
    earns a stamp: its ISO week number and the subject with the most checks plus attempts that
    week (ties by id; with none, the flag drawing and the day count), a steady tilt from the
    week's hash. Stamps are derived, never stored; the dashboard shows those of the last 12
    weeks (or says how one is earned) and the weekly review its own week's.
115. **Map paper** (9.2): contour lines in map coordinates (`lib/map/paper.ts`: each region a hill
    of 0.75 × its radius, height 0.9, a 48-unit cell, 14 levels, 1,600 units of margin), worked
    out once when the browser is idle; full at far zoom, 0.45 in the middle, hidden near. Dusk's
    grid is dotted (the map and the sketch canvas). Far-zoom rings hold the subject's emblem on
    its tint; near-zoom labels follow pencil and ink through `data-status`.
116. **Pencil and ink** (`INK_CLASS`): not started in `--text-faint`, learning and fading in
    `--text`, strong in `--text` semibold; used by ready to learn, the palette's concept
    results, paths, concept links (Learn first, Unlocks), the map's list view and map labels.
117. **Problems and workspace** (9.2): a row's subject mark comes from its first concept (else its
    topic); rows are taller, the last result is a chip, the stats strip is set apart by tone. The
    workspace timer is `large` (display face); hints, review and dry run are soft trays (sunken,
    rounded, floating on the surface); `EmptyState plain` skips the texture on data screens.
118. **Concept reading** (9.2): the page head sits on the subject's tint with its emblem and
    contour lines (the map panel's head takes the tint too); interview points are a sunken card;
    each level ends with "Check yourself": one question (simple the first, interview the second,
    deep the third, cycling) with its answer hidden, and one way to check with its own label
    ("Check by explaining it", "Check with flashcards", "Check with a quick quiz"), so no button
    name repeats the row below.
119. **Flashcards and drill** (9.2): a card turns (240 ms from −80° about the vertical axis;
    instant with reduced motion); the back keeps the question small above the answer. The
    flashcard dialog is the large size; the finish lists each concept's status before and after
    and its next review. The drill's prompt card turns on reveal; Ctrl or Cmd + Enter reveals and
    Enter goes on (not while typing, on a button or under a dialog); the clock uses the display
    face; the results say how many drill checks were recorded on how many patterns.
120. **Other screens** (9.2): the practice hub leads with one wider focal tile (the drill); the
    weekly review's head is a ruled logbook page with a margin rule and its week's stamp;
    revision sheets read as one centered column with display headings on screen (print styles
    unchanged); the welcome page has a first living terrain (the track's heaviest subjects) and
    emblems in the self-assessment; empty states carry line drawings (flag when nothing is due,
    tent for no stories or mocks, trail for no mistakes, telescope for no matches, compass for
    a missing page). Cards are set apart by tone rather than hairlines across the app; dense
    lists and tables keep bordered rows, and code panels and the sketch keep their edge.
121. **Tests for 9.2**: Up next is a region labelled `Up next: <title>` (an `aria-label`, since
    jsdom joins screen-reader-only text without a space); two plan tests find the next stop's
    Start and Swap on that card; the theme menu test matches `/^Night/`, because before 06:30
    the By time of day item reads "Night now". `tests/app/survey.test.tsx` covers the new parts.
122. **Focus blocks** (session 21, 9.3): starting a block (the timer's popover, `f`, a plan item's
    "Start a focus block", the palette) opens "In this block I will…" with a line filled in: the
    plan item for what's on screen (a page names its problem or concept with `usePageFocusLine`),
    else the page's own line ("Solve 1. Two Sum", "Finish a pattern drill"), else the next plan
    item; plan titles become lines by kind (`intentionForItem`: "Re-solve 69. Sqrt(x)"). Enter
    starts; an empty line is allowed. The line shows in the top bar ("In this block: …"; a
    second row on phones). "End now" ends the block early and asks how it went; "Stop without
    counting" discards it. Done, Partly and Moved on count in `ActivityDay.focusBlocks`
    (`{ done, partly, movedOn }`, optional, merged with the day). A running or paused block is
    mirrored to `atlas.focusBlock` and comes back after a reload unless its time ran out
    meanwhile (then it is dropped without an outcome); breaks are not kept. The block's length
    is read once the profile has loaded.
123. **Horizon line**: the elapsed time is counted in whole 5-second steps (`horizonFraction`), so
    the line moves every 5 s and never animates; dotted for the last 2 minutes, or the last
    quarter of a round shorter than 8 minutes (a 2-minute drill prompt dots at 30 s left, not
    all along). The block's line runs along the window's top edge in the top layer (re-shown
    each step so a dialog opened since doesn't hide it for long), on every page, and stops at
    the break. Timed rounds show their own line in place of their progress bar, with the same
    accessible name: drill prompts, mental math sprints and story practice under their clock,
    design and mock rounds along the top edge of their sticky bar. The break view's tide line is
    the same idea along the bottom edge.
124. **Focus lens and held notices**: `<html data-focus-lens>` is set only while a block runs
    (not paused) with dimming on; parts marked `data-peripheral` (the sidebar, the bottom tabs,
    the top bar's search, minutes chip, Ask Claude and theme menu, Today's side column, a
    concept's connections, the map's minimap) fade to 45% and come back on hover or
    `:focus-within`, never nested (opacities would multiply). While a block runs, a toast marked
    `notice` (storage notices below error level, the weekly review hand-over) goes to a gate in
    the focus store instead of the screen, and the backup reminder, thoughts that came back and
    the wrap-up note hide; the top bar counts them all ("2 notes held for your break"). Errors
    and answers to what the owner just did always show. Everything shows at the break, when the
    block stops or pauses, or on "Show them now" (which stops holding for the rest of the
    block). During a block the search pill shrinks to its icon and the minutes chip steps aside
    so the line has room; on phones the app name gives up its place.
125. **Park it**: `ParkedThought` is a new table (Dexie version 2; one grouped `parkedThoughts`
    document in the artifact, latest 300; merged newer-wins). When: the break is the running
    block's end (without a block, one block's length from now); tonight is the Dusk start time
    with By time of day, else 19:00, or an hour from now once that has passed; tomorrow is the
    next morning at the Day start time with By time of day, else 06:30. A break that starts
    makes every open break thought due, so they stay listed after the break view. Done sets
    `doneAt`; Add to today adds the owner's plan item of the new kind `thought` (10 minutes, no
    Start, no Swap, never planned by the planner) and sets `doneAt`; Dismiss deletes (Undo puts
    it back). Thoughts that came back show above every page, five at a time; the Park dialog
    lists those still waiting.
126. **Break views**: a full-screen native `<dialog>` (`FullScreenLayer`, Esc through the cancel
    event and a keydown fallback) that opens when a block ends and when a break is started from
    the timer. Order: the question about the block, one idea (eye rest, movement, water) that
    moves on after each block of the day from a daily start, "Breathe for a minute", the
    thoughts parked for the break with Park a thought, Back to work. The landscape is seeded per
    break; spot heights, the Dusk graticule and Night soundings keep off the text as elsewhere.
    When the break's time is up the view says so (no toast); "Back to work" or Esc readies the
    timer for the next block. With break views off in Settings, a small "Focus block done"
    dialog asks the question and the break waits in the timer, as before.
127. **Breathing**: six breaths of 5 s growing and 5 s shrinking (`breathingAt`), only when
    started; the ring is a 5 s CSS transition (`@starting-style` lets the first breath grow);
    with reduced motion the ring is left out and a large count (1 to 5 per half breath) keeps
    the rhythm; "Breathe in" and "Breathe out" are a polite live region; focus moves to Stop.
128. **Memory walk**: `FlashcardRequest.walk` is set for a topic's or a subject's set (the
    Flashcards and quizzes page, a topic's menu on the map), never for "everything due". The
    concepts a session reaches (the first 30, chosen as before) are reordered by a
    nearest-neighbour walk over their map places (moved bubbles, then the layout, then the
    topic's place for the owner's own concepts), starting from the one that comes first in the
    syllabus; each concept's cards stay together. A strip of dots joined by a dashed line shows
    the stops, the current one ringed, with "stop N of M".
129. **Interview day**: on the interview date and the day before (`interviewDay`), Today shows the
    calm view instead of the plan: the head with a calm line and no minutes ring, the 1-day
    sheet (a link, as the sheet is two printed pages), the mistake checklist (top 5 with how to
    avoid each), Breathe for a minute and Park a worry (tonight by default). `#/today?view=plan`
    shows the plan with a link back; the plan is still made that day, so items keep completing
    themselves.
130. **Themes by the clock** were built in 9.1 (decision 106) and are unchanged.
131. **Bedtime and wrap-up**: `prefs.bedtime` (optional "HH:MM") is set in Settings → Appearance
    with a switch (23:00 when first turned on). The note shows from 30 minutes before bedtime
    until bedtime, across midnight too; Close hides it for that night (`atlas.wrapUp`). "Park
    what's left" opens Park it with Tomorrow; "Plan tomorrow" turns tonight's open thoughts into
    the owner's items on the plan of the day after sleep (the date 12 hours ahead, so a bedtime
    after midnight plans the same date), reading that plan from storage first.
132. **Focus settings**: `prefs.focus` holds optional flags (`dim`, `holdNotices`, `breakView`),
    each on when missing (`focusPrefs`), so the data version stays 2 and nothing migrates.
    Settings → Focus sessions holds the block and break lengths (moved from Learning) and the
    three switches; the timer popover links there. Shortcuts `f` and `p` and two palette
    commands start a block and park a thought.
133. **Performance (9.3)**: the dashboard's cold load with a year of data, measured by
    alternating the Phase 9.2 build and this one in the same harness (8 runs each): 0.87 to
    1.04 s before, 0.89 to 0.96 s after (this machine is slower than session 20's, where the
    same page took 0.51 to 0.76 s). The focus layer adds one small table read at start and no
    work to the dashboard.

