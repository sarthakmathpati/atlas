# PROGRESS

Read `CLAUDE.md` first, then this file, then `BUILD_SPEC.md`. Update this file at the end of every
work session and at least every hour.

**Current state:** Phase 0 and Phase 1 in progress (session 1).
**Next up:** finish Phase 1 (seed banks, placeholder shell), then Phase 2 (design system and shell).

## Phases (BUILD_SPEC.md section 13)

| Phase | Status | Notes |
|---|---|---|
| 0. Project setup | In progress | Scaffold, both builds, artifact check and zip script done. Workflows and Pages steps pending. |
| 1. Data foundation | In progress | Types, repositories, migrations, runtime detection, providers, export/import core, content files, syllabus and layout builds done. Seed banks pending. |
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
| F1 | App shell, navigation and theme | 2 | Not started | Tokens, fonts and no-flash theme bootstrap exist. |
| F2 | Knowledge map | 4 | Foundation | `layout.json`: positions for all 1,073 nodes, organic region outlines, no overlaps. |
| F3 | Concept panel | 4 | Not started | |
| F4 | Mastery status and colors | 4 | Not started | Status tokens and glyph colors defined. |
| F5 | Onboarding and self-assessment | 4 | Not started | Default profile created on first run. |
| F6 | Problem library | 3 | Foundation | Seed problem bank (Phase 1). |
| F7 | Problem workspace, code saving and attempts | 3 | Foundation | Attempt/ProblemState types, storage, 30-attempt cap in merge. |
| F8 | Mistake journal | 3 | Foundation | 33 default mistake tags seeded on first run. |
| F9 | Re-solve reminders and review queue | 3 | Not started | SRS constants defined. |
| F10 | Pattern drill | 8 | Not started | Drill bank written in Phase 5. |
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
| F22 | Export, import and backup | 3 | Foundation | Core done: export, zod-validated import, merge/replace, migrations, id aliases, round-trip tests across all repositories. UI in Phase 3. |
| F23 | Search and command palette | 2 | Not started | |
| F24 | Settings | 2 | Not started | |
| F25 | Path to a concept | 4 | Not started | Prerequisite DAG ready. |
| F26 | Design practice (LLD and HLD) | 8 | Not started | |
| F27 | Behavioral story bank | 8 | Not started | |
| F28 | Quant practice: puzzles and mental math | 8 | Not started | |
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

- None yet.
