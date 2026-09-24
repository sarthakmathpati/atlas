# 🧭 Atlas

Atlas is a personal study map for cracking SDE and quant interviews. Every subject, topic and
concept (909 of them) sits on one zoomable map, colored by how well you really know it, with a
problem tracker, spaced repetition, a daily plan and a built-in Claude tutor.

The full specification is in [`BUILD_SPEC.md`](BUILD_SPEC.md). Build progress is tracked in
[`PROGRESS.md`](PROGRESS.md). Notes for Claude Code sessions are in [`CLAUDE.md`](CLAUDE.md).

## Two ways to use it

- **Website (GitHub Pages).** Opens on laptop and phone. Your data is saved in that browser; use
  Settings → Data → Export to move it. Live at https://sarthakmathpati.github.io/atlas/ once Pages
  is turned on.
- **Claude artifact.** A single HTML file (`release/atlas-artifact.zip`, from a later phase) that
  you publish in claude.ai. It syncs your data across devices and uses Claude from your own plan.

## Working on the code

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install     # once
npm run dev     # start the app at http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Rebuild the syllabus data and start the development server |
| `npm run build:syllabus` | Read `content/` and write `src/data/syllabus.generated.json` (fails on broken ids, links or cycles) |
| `npm run build:syllabus -- --strict` | Same, but also fails when any required content is missing |
| `npm run build:layout` | Compute map positions into `src/data/layout.json` (skipped when nothing structural changed; add `-- --force` to redo) |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Check code style and common mistakes |
| `npm run test` | Run the unit tests |
| `npm run build` | Build the website into `dist/` |
| `npm run build:artifact` | Build the single-file artifact into `dist-artifact/index.html` and check it |
| `npm run release:artifact` | Build the artifact and zip it into `release/atlas-artifact.zip` |
| `npm run preview` | Serve the built website locally |
| `npm run format` | Format the code with Prettier |
| `npm run check` | Typecheck, lint, test and both builds, in one go |

## Where things live

- `content/`: the syllabus, one Markdown file per topic (format in `content/README.md`).
- `src/data/`: generated syllabus and layout, plus the practice banks (`*.seed.ts`).
- `src/lib/`: types, storage, runtime detection, AI, and the algorithms.
- `src/features/`: screens. `src/components/ui/`: shared components.
- `scripts/`: the syllabus, layout and artifact build scripts.
- `tests/`: unit tests.
