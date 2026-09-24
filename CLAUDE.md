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
- **State**: Zustand, one store per domain, hydrated from the Repository (from Phase 2).
- **Routing**: hash routes (`#/map`, `#/problems/lc-1`).
- **Styling**: Tailwind v4 + CSS custom properties in `src/styles/tokens.css` (section 12).
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
    allows three reviewed text-only strings from bundled libraries: `www.w3.org` (XML namespaces),
    `react.dev` (React's error-decoder link) and `tailwindcss.com` (license comment). Any new host
    fails the build. API-key mode is standalone-only, so its code is excluded from the artifact
    via the `__ARTIFACT__` build constant (Phase 6).
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
