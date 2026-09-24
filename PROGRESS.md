# PROGRESS

Read `CLAUDE.md` first, then this file, then `BUILD_SPEC.md`. Update this file at the end of every
work session and at least every hour.

**Current state:** Phase 0 and Phase 1 are done (session 1, 24 Sep 2026). The live page is a
preview (`src/features/preview/`): build progress, a picture of the whole map, the searchable
syllabus, and a working backup export.
**Next up:** Phase 2 (design system and app shell). Phase 2 replaces the preview page with the real
shell; reuse `MapPreview`'s drawing code and `SyllabusExplorer` (the start of the map's list view).

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | Done | Vite 8, React 19, TypeScript 6 (strict), Tailwind 4, ESLint, Prettier, Vitest, aliases. Two builds (`dist/`, single-file `dist-artifact/index.html` at about 1.3 MB), `check-artifact.mjs`, `release-artifact.mjs`, CI and Pages workflows. Owner: merge the PR, then Settings → Pages → Source: GitHub Actions. |
| 1. Data foundation | Done | Types and zod schemas; Dexie, claude.ai `db` and memory repositories with an in-memory fake of the `db` contract; migrations and id aliases; runtime detection; services provider; FileSaver adapters; export/import with merge and round-trip tests; `content/` for all 146 topics and 909 concepts; syllabus and layout builds with every validation; all seed banks. 111 tests. |
| 2. Design system and shell | Not started | |
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
| F1 | App shell, navigation and theme | 2 | Foundation | Tokens, fonts, no-flash theme switching (saved to the profile), global error boundary with "Export my data". |
| F2 | Knowledge map | 4 | Foundation | `layout.json`: positions for all 1,073 nodes, organic region outlines on the F2 neighborhood sketch, no overlaps, deterministic. Static SVG preview on the current page. |
| F3 | Concept panel | 4 | Not started | |
| F4 | Mastery status and colors | 4 | Not started | Status tokens and glyph colors defined. |
| F5 | Onboarding and self-assessment | 4 | Not started | Default profile created on first run. |
| F6 | Problem library | 3 | Foundation | 435 LeetCode problems (checked against the spec: number, title, difficulty, premium, topic), each tagged with 1 to 3 concepts; every one of the 90 patterns has practice problems. `leetCodeSlug`, `leetCodeUrl`. |
| F7 | Problem workspace, code saving and attempts | 3 | Foundation | Attempt/ProblemState types, storage, 30-attempt cap in merge. |
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
| F20 | Ask Claude anywhere | 6 | Foundation | AIProvider interface. |
| F21 | AI modes and settings | 6 | Foundation | Runtime detection keeps `sample` independent of storage. |
| F22 | Export, import and backup | 3 | Foundation | Core done: export, zod-validated import with friendly errors, preview counts, merge/replace, migrations, id aliases, round-trip tests across all repositories and across runtimes. The preview page already exports a backup (browser download, or the `downloads` capability in the artifact). Import UI, reminder banner, Markdown export and reset in Phase 3. |
| F23 | Search and command palette | 2 | Not started | |
| F24 | Settings | 2 | Not started | |
| F25 | Path to a concept | 4 | Not started | Prerequisite DAG ready. |
| F26 | Design practice (LLD and HLD) | 8 | Foundation | 46 original prompts with rubrics, one per `lld.classics` / `sysd.classics` concept. |
| F27 | Behavioral story bank | 8 | Foundation | The 30 spec questions with suggested story tags. |
| F28 | Quant practice: puzzles and mental math | 8 | Foundation | The 41 spec puzzles (answers verified by independent computation in tests); safe answer checker (`lib/quant/answerCheck.ts`: fractions, decimals, %, e, pi, sqrt, variables, yes/no; no eval). 40+ extra puzzles in Phase 5. |
| F29 | Focus timer, activity heatmap and streak | 7 | Not started | |
| F30 | Accessibility, keyboard, mobile and performance | 9 | Not started | Contrast-checked tokens, reduced-motion CSS. |

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
- **Bundle size:** the web build's main JavaScript file is about 1.06 MB before compression (the
  syllabus JSON alone is about 440 KB). Fine for now; split routes and lazy-load heavy pages in
  Phase 2/4 to keep first paint under 1.5 s on phones.
- **Quant bank:** the spec table has 41 puzzles, not 40. Four prompts carry a short answer-format
  hint (for example "(Answer in minutes.)"); `q-twenty-one` has a two-part spoken answer, so it is
  self-graded against its note.
- **Screenshots:** Playwright works (global install; Chromium in /opt/pw-browsers). Session 1
  reviewed the preview page at 1440 px and 390 px in both themes, and tested the artifact file with
  a simulated claude.ai runtime (synced storage, downloads, theme restored after reload).
