# 🧭 Atlas

Atlas is your study map for SDE and quant interviews. All 18 subjects, 146 topics and 909
concepts sit on one map you can zoom, each colored by how well you really know it. Around the map:
a problem tracker with your code and attempts, reviews that come back at the right time, a daily
plan, practice (pattern drills, quant puzzles, mental math, designs, stories, mock interviews) and
Claude as a tutor.

## Open it

- **Website:** https://sarthakmathpati.github.io/atlas/ (laptop or phone; data stays in that
  browser).
- **Claude artifact:** `release/atlas-artifact.zip`, published on claude.ai (Claude built in,
  data synced between devices).

How to publish and update both: [DEPLOY.md](DEPLOY.md).

## A good first hour

1. **Welcome questions.** The first visit asks your track, interview date, daily time and what
   you already know, so the map starts where you are. You can change any answer later in
   Settings.
2. **Today.** Your plan for the day: a few stops that fit your time, most urgent first. Press
   Start on the first one. Each stop ticks itself off when you finish it.
3. **The map.** Zoom from subjects to topics to single concepts. Click a concept to read it at
   three depths (Simple, Interview, Deep), check yourself with flashcards or by explaining it
   back, and see its practice problems.
4. **Problems.** Open one, write your code, save the attempt with how it went. Atlas brings it
   back for a re-solve just before you'd forget it.
5. **Settings → Data → Export backup.** Do this now and then. One file keeps all your progress.

Also worth knowing: press `?` for keyboard shortcuts, `Ctrl` + `K` to search everything, `f` to
start a focus block with one line of intent, and `p` to park a stray thought for later. The
**ADHD mode** switch at the top right makes the screen calmer, shows one task at a time with
small steps, and makes time visible; each part can be turned off on its own.

## Themes

Day, Dusk and Night (or follow your device, or switch by time of day) from the theme button at
the top right or Settings → Appearance.

## For working on the code

You need [Node.js](https://nodejs.org) 22 or newer. Then `npm install` once.

| Command | What it does |
|---|---|
| `npm run dev` | Rebuild the data and start the app at `http://localhost:5173` |
| `npm run check` | Everything below that checks or builds, in one go (run it before every commit) |
| `npm run typecheck` | Check the TypeScript types |
| `npm run lint` | Check for common mistakes and style problems |
| `npm run test` | Run all the tests once |
| `npm run test:watch` | Run the tests again whenever a file changes |
| `npm run format` | Format every file with Prettier |
| `npm run format:check` | Check formatting without changing files |
| `npm run build` | Build the website into `dist/` |
| `npm run build:artifact` | Build the single-file artifact into `dist-artifact/index.html` and check its size and links |
| `npm run release:artifact` | Build the artifact and zip it into `release/atlas-artifact.zip` |
| `npm run preview` | Serve the built website locally |
| `npm run build:data` | Run the three data builds below in order |
| `npm run build:syllabus` | Read `content/` and write the syllabus data (fails on broken ids, links or cycles); add `-- --strict` to also fail on missing content |
| `npm run build:layout` | Work out the map positions (skipped when nothing structural changed; add `-- --force` to redo) |
| `npm run build:colors` | Make the subject colors from each subject's hue |
| `npm run check:content-code` | Compile every C++ block in the content (add `-- <subject>` for one subject) |

## Where things are

- `content/`: the syllabus text, one Markdown file per topic (format in `content/README.md`).
- `src/data/`: generated syllabus, map layout and colors, plus the practice banks (`*.seed.ts`).
- `src/lib/`: data types, storage, Claude, and the scheduling, readiness and planning logic.
- `src/features/`: the screens. `src/components/ui/`: shared parts.
- `tests/`: the tests. `scripts/`: the build scripts.
- `BUILD_SPEC.md` is the full specification, `PROGRESS.md` what's been built, `CLAUDE.md` notes
  and decisions for Claude Code sessions.
