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
   both themes and at 390 px. Fix what looks off.
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
  - `src/lib/ai/AIProvider.ts`: `SampleAIProvider`, `AnthropicApiProvider`, `CopyPromptProvider` (Phase 6).
  - `src/lib/files/FileSaver.ts`: `BrowserFileSaver`, `ClaudeDownloadsSaver`, `DialogFileSaver`.
  - Chosen once at startup in `src/app/providers/ServicesProvider.tsx` from `detectRuntime()`.
    ESLint forbids importing `dexie` or reading `window.claude` outside `lib/storage|runtime|ai|files`.
- **Runtime contract 0.2.54**: authoritative type files are copied in `docs/claude-runtime-0.2.54/`.
  `src/lib/runtime/claude.ts` mirrors the parts we use. `src/lib/runtime/fakeClaude.ts` is an
  in-memory fake of `db`/`user`/`downloads` for tests.
- **Content pipeline**: `content/<subject>/<topic>.md` (format in `content/README.md`) →
  `scripts/build-syllabus.mjs` → `src/data/syllabus.generated.json` → `scripts/build-layout.mjs`
  → `src/data/layout.json`. Both generated files are committed. `build`, `build:artifact` and `dev`
  regenerate them first. Tests fail if they are stale.
- **Seed banks**: `src/data/*.seed.ts` (problems, quant puzzles, designs, behavioral questions,
  mistake tags, drills), validated against the syllabus by `tests/seed/*`.
- **Types**: `src/lib/types.ts` (section 4). zod schemas for every stored entity in
  `src/lib/storage/schemas.ts`; AI JSON schemas in `src/lib/ai/schemas.ts`.
- **State**: Zustand, one store per domain in `src/stores/` (profile, activity, focus timer,
  concept statuses and checks, problems, mistake tags, today's date, toasts, shell UI), loaded by
  `stores/hydrate.ts` (via `app/providers/StoreHydrator.tsx`) once storage is ready, reloaded after
  import/reset and on remote changes. Stores write through the Repository. Saving an attempt
  (`problemStore.saveAttempt`) reschedules, refreshes linked concept statuses, logs activity and
  ticks a matching Today item.
- **Algorithms** (section 11, pure, tested): `lib/srs/` (intervals, grace, problem and concept
  scheduling), `lib/mastery/status.ts` (knowledge, practice, status rules, "what would turn it
  green"), `lib/review/queue.ts`, `lib/mistakes/stats.ts`. Problem helpers in `lib/problems/`
  (catalog of seed plus custom problems, filters, quick add, CSV, offline hints, progress labels).
- **Routing**: hash routes (`#/map`, `#/problems/lc-1`) from a small router in `src/app/router.ts`;
  `src/app/routes.tsx` maps every route to a lazy page. Links are plain `<a href="#/…">`.
- **Shell**: `src/app/shell/` (AppShell, Sidebar, TopBar, MobileNav, PageHeader, PageFrame,
  shortcuts, Ask Claude panel, focus timer). Every page starts with `<PageFrame><PageHeader/>`.
- **Component kit**: `src/components/ui/` (section 12.7). Heavy parts are default exports loaded
  with `lazy()`: `MarkdownView`, `code/CodeEditor`, `code/DiffView` (named), `charts`. The design
  kit page `#/kit` (Settings → About) shows every component.
- **Styling**: Tailwind v4 + CSS custom properties in `src/styles/tokens.css` (section 12);
  `src/styles/components.css` (in `@layer components`) holds dialog motion, code token colors
  and reading text. Always join classes with `cx()` so overrides win.
- **Dates**: local time; due dates stored as `yyyy-mm-dd` (`src/lib/time.ts`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Regenerate data, start the dev server |
| `npm run build:syllabus [-- --strict]` | Parse and validate `content/` |
| `npm run build:layout [-- --force]` | Recompute map positions (skipped if structure unchanged) |
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
   is mirrored to `localStorage["atlas.theme"]` so `index.html` can set `data-theme` before first
   paint (no flash). "system" leaves `data-theme` unset.
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
    (it embeds a GitHub link; `lib/time.ts` formats dates itself). API-key mode is standalone-only,
    so its code is excluded from the artifact via the `__ARTIFACT__` build constant (Phase 6).
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
    `claude-sonnet-5`, complex `claude-opus-5-5`); re-check the current list in Phase 6. They are
    editable in Settings.
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
27. **Later-phase routes** render "Arrives in phase N" pages (what the page will do, plus links to
    what works). Concept, problem and design pages already show everything the seed data knows.
28. **Per-browser conveniences in localStorage** (never synced, always in try/catch):
    `atlas.theme`, `atlas.sidebar`, `atlas.recent` (palette), `atlas.setup.map|search` (Today
    checklist), `atlas.askWidth` (drawer width), `atlas.split` (workspace split), `atlas.template`
    (start attempts from the starter template).
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
    the most distinctive words (IDF-weighted). Claude suggestions arrive in Phase 6.
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
39. **Claude buttons before Phase 6** ("Review my code", "Dry run", "Suggest with Claude") open a
    short dialog saying what they will do (`LaterClaudeButton`); nothing pretends to work.
