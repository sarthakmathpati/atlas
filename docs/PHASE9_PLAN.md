# Phase 9 plan: polish, color, focus and ship

Written at the end of session 18 (27 Sep 2026), after Phase 8. Read it with `CLAUDE.md`,
`PROGRESS.md` and `BUILD_SPEC.md` (sections 12, 13, 14, 15, F23, F29 and F30).

Phase 9 is split over two sessions, because each half is large:

- **Part 1 (session 19): a colorful visual refresh and focus sessions.** Parts A and B below.
- **Part 2 (session 20): audit, gaps, docs and ship.** Part C below.

Tick the boxes in this file as work lands, and keep `PROGRESS.md` in step.

## The owner's direction (session 18)

The owner wants the app to look **very beautiful, with plenty of color and beautiful elements**,
and wants **features that help them focus**. This deliberately goes further than section 12.1
("spend boldness in one place") and parts of 12.9 (no gradient washes). It is recorded as
CLAUDE.md decision 104. What stays fixed:

- Every color is a token in `src/styles/tokens.css`, with a light and a dark value. No hex in
  components. Never use Tailwind's `dark:` variant (decision 6).
- Text contrast meets WCAG AA in both themes (4.5:1 for body text, 3:1 for large text, icons and
  control borders). A new test checks this (A1).
- Color is never the only cue: status keeps its shapes (12.3), difficulty keeps its bars,
  subjects keep their names and icons.
- Reduced motion (system or Settings) turns every animation into an instant change.
- No external assets: fonts stay bundled (decision 12); illustrations are inline SVG drawn for
  Atlas; the artifact URL check must still pass and the artifact stays under 15 MB.
- Copy rules stay: sentence case, no exclamation marks, no "successfully", "please" or "simply".
- The drafting-table identity stays: grid paper, inked lines, the ink moment. The color is ink
  on the drafting table, not a different app.

## Part A: the visual refresh ("the drafting table, in full color")

Work in this order, taking screenshots in both themes at 1440, 768 and 390 px after each step
(the scratch Playwright script and simulated runtime in CLAUDE.md decision 103 work well).

### A1. Color system and a style tile

- [ ] **Palette in OKLCH** in `tokens.css`: keep the canvas and surface families, and add a
      richer set: a brighter primary accent with a second accent for highlights, soft tinted
      surfaces (`--tint-<hue>-soft`) for featured cards, and stronger borders for emphasis.
- [ ] **A color for each of the 18 subjects** (`--subject-<id>` and `--subject-<id>-soft`),
      derived from `Subject.regionHue` but no longer limited to cool hues; tuned so each
      passes contrast as text on its soft tint in both themes, and so no subject hue can be
      mistaken for a status color next to it (status always has its shape as well).
- [ ] **A color for each section** of the app (Today, Map, Problems, Review, Practice, Mock,
      Designs, Stories, Mistakes, Dashboard, Revision, Settings) for its icon badge in the nav
      and its page header.
- [ ] **Categorical chart palette** (6 to 8 colors) validated on both surfaces; keep the
      ordinal difficulty ramp (decision 23) and the heatmap ramp (decision 90).
- [ ] **Meaningful gradients only**: progress rings, the readiness ring, the Today budget bar,
      heat and streak, subject headers. No decorative gradient washes behind plain text.
- [ ] `tests/styles/contrast.test.ts`: parses `tokens.css` for both themes and asserts the
      contrast of every text/background pair the app uses (text, muted, faint on canvas,
      surface, sunken and each soft tint; on-accent on accent; subject text on its soft tint).
- [ ] Update the design kit `#/kit` into a **style tile**: palette swatches with their contrast
      ratios, type scale, buttons, chips, glyphs, cards, charts, empty-state illustrations.
      Review it in both themes before touching screens.

### A2. Components (`src/components/ui`)

- [ ] Buttons: clearer primary, a soft tinted secondary, pressed and loading states.
- [ ] Cards with hierarchy: plain bordered rows for dense lists (12.7 still holds), tinted
      "featured" cards for the one thing that matters on a screen, raised cards only for
      floating layers.
- [ ] Chips: subject chips in the subject color (with the icon), pattern chips, tag chips.
- [ ] Page header: a colored icon badge for the section, optional subtitle and actions; a
      subject header variant with the subject color.
- [ ] Progress: colorful ring and bar variants with gradient fills; SegmentedBar in status
      colors with shapes in its legend.
- [ ] Empty states with small original line illustrations (drafting-style, inline SVG, two or
      three tints from the tokens), one per main screen.
- [ ] Toasts, dialogs, popovers and menus with the refined elevation and a colored edge for
      success, info, warning and danger.
- [ ] Micro-interactions (150 to 250 ms, off with reduced motion): button press, checkbox tick
      on plan items, a small ink burst when a plan item or a whole day is done, tab indicator
      slide, chart bars growing once on first view.

### A3. Screens, one by one

Apply the system screen by screen, keeping every test green (tests query by role and name, so
they survive restyling; update them only when copy changes on purpose):

- [ ] Shell: sidebar with colored section badges and the active item tinted; top bar with the
      daily-minutes ring and the streak flame; mobile bottom tabs and More sheet.
- [ ] Today: a greeting band with the date and countdown, an "Up next" featured card (B2), the
      plan as colored rows by kind, ready-to-learn with subject colors, the streak card.
- [ ] Map: richer region colors from the subject palette (still behind the bubbles), subject
      cards in their color at far zoom, topic cards with colored status bars, legend.
- [ ] Concept panel and page: subject-colored breadcrumb and header, level tabs, callouts in
      the interview and deep levels.
- [ ] Problems library and workspace, Review, Mistakes.
- [ ] Practice hub (a colored tile per kind with its stat), drill, flashcards and quizzes,
      mental math (a bold sprint screen), puzzles, mock setup, the live mock and its feedback
      (scores as colored bars), designs and the sketch (node kinds in color), stories,
      coverage matrix, intro builder.
- [ ] Dashboard (readiness ring in gradient, subject bars in subject colors, pattern tiles),
      weekly review, revision sheets on screen (printing stays light and plain, decision 94).
- [ ] Settings, welcome and onboarding, error and not-found pages, the command palette.

**Done when:** the style tile and every screen above were reviewed in both themes at 1440, 768
and 390 px, the contrast test passes, reduced motion removes every animation, and `npm run
check` passes.

## Part B: focus sessions

Naming: call these **focus sessions**, to keep them apart from the map's focus mode (decision 42)
and the week's focus subjects. They build on the existing focus timer (`stores/focusTimerStore.ts`,
`app/shell/FocusTimer.tsx`, F29) and the activity clock.

- [ ] **B1. Focus session mode.** Start from the top bar timer, a plan item's "Start with focus",
      the palette ("Start a focus session") or the `f` shortcut. The shell hides the sidebar,
      badges, the backup banner and non-urgent toasts (they wait until the session ends); a
      floating pill shows the task, the time left as a small ring, Pause and End. The owner
      keeps working on the real screen (the workspace, a drill, flashcards). Esc or End leaves.
- [ ] **B2. "Up next" on Today.** The single next plan item as a featured card with Start and
      Start with focus, and the rest of the plan below it.
- [ ] **B3. Pomodoro rhythm.** Focus and break lengths from Settings (25 and 5 by default);
      after four sessions suggest a longer break (15). The break screen is calm: time left, one
      small suggestion (stand up, water, look far away), and "Skip break".
- [ ] **B4. Session wrap-up.** When a session ends: minutes, what was done in it (attempts saved,
      checks, plan items ticked), "Mark the plan item done" if it wasn't, and "Next: <item>".
- [ ] **B5. Focus numbers.** `ActivityDay.focusSessions` (optional counter, no migration, like
      decision 92); focus sessions today in the top bar ring's popover; sessions per day in the
      weekly review and the dashboard's activity section.
- [ ] **B6. Gentle sound (optional, off by default).** A soft chime at the end of a session made
      with the Web Audio API (no audio files, no URLs); a switch in Settings → Learning.
- [ ] Tests: the session state machine (start, pause, resume, break, long break, end), hidden
      chrome and queued toasts, the wrap-up counts, the activity counter across midnight, the
      `f` shortcut not firing while typing.

**Done when:** a focus session runs end to end from Today and from the palette, survives a
reload (like the mock clock), counts in activity once, and works at 390 px and with reduced
motion.

## Part C: audit, gaps, docs and ship (session 20)

- [ ] **F30 audit:** keyboard-only paths for every main flow (Today, map list view, a problem
      attempt, flashcards, drill, mock, design, story practice, settings, import and export);
      visible focus rings on the new styles; screen reader labels and landmarks (axe-core in a
      Playwright pass is a good start); contrast (A1 test); reduced motion; 44 px touch targets;
      no horizontal scroll at 390 px; the editor with the on-screen keyboard.
- [ ] **Performance budgets:** shell first render under 1.5 s on a mid-range phone (Playwright
      with CPU throttling), interactions within 100 ms, map panning, artifact under 15 MB.
- [ ] **F23 gap:** notes (concept notes, problem notes and insights) and stories in the search
      index, updated incrementally when they change; then mark F23 done.
- [ ] `npm run build:syllabus -- --strict` and fix anything it reports.
- [ ] Visual review of every screen in both themes at 390, 768 and 1440 px (section 15), with
      fixes for spacing, alignment and empty states.
- [ ] `DEPLOY.md` (section 14, for a beginner: GitHub Pages, the claude.ai artifact and updating
      the same artifact, API key mode, local development) and a short `README.md` (what Atlas
      is, every npm script, where things live).
- [ ] `npm run release:artifact` and commit `release/atlas-artifact.zip`.
- [ ] Walk the definition of done (section 15) and tick it in `PROGRESS.md`.

**Done when:** every box in section 15 is ticked.

## Not planned (tell the owner if they ask)

- Changing the status colors or shapes (12.3) or the difficulty ramp: they carry meaning.
- Background music or looping ambient animation: against 12.6 and reduced motion.
- Anything in section 16 (out of scope).
