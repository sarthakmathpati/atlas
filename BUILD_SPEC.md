# Atlas: build specification

> Working title: **Atlas**, a personal "one-stop" operating system for cracking high-paying SDE and quant interviews.
> This file is the single source of truth for building the app. It was written by the product owner (a student preparing for SDE and quant roles) together with Claude in claude.ai.
> Owner can rename the app later. Keep the name in one config constant (`APP_NAME`).

---

## Contents

0. Read this first (instructions for Claude Code)
1. Product vision
2. Runtime modes and architecture
3. Information architecture and vocabulary
4. Data model
5. Seed content: format and writing rules
6. The complete syllabus (18 subjects, 146 topics, 909 concepts)
7. Connections: cross-subject links and prerequisite chains
8. Seed practice banks (435 LeetCode problems, quant puzzles, drills, design prompts, behavioral questions, mistake tags)
9. Features (F1 to F30)
10. AI layer (providers, runtime capabilities, prompts, JSON schemas)
11. Algorithms (spaced repetition, mastery, readiness, planner, recommendations)
12. Visual design system
13. Build plan (phases 0 to 9)
14. Deployment
15. Definition of done
16. Out of scope
Appendix A and B: messages to send to Claude Code

---

## 0. Read this first (instructions for Claude Code)

You are building a complete, polished web app from this spec. The owner is a beginner programmer and will rely on you completely. Work like a careful senior engineer and a thoughtful product designer at the same time.

**Standing rules**

1. **Take as much time as you need. Quality over speed.** Every feature in this spec must be built, working smoothly, and connected to the syllabus. Do not silently skip, stub, or "leave for later" anything that is in scope. If something truly cannot work in a given runtime (see section 2), build the graceful fallback described here and note it in `PROGRESS.md`.
2. **Work phase by phase** using the build plan in section 13. Finish one phase, run the checks, commit, push and update `PROGRESS.md`, then hand over to the owner as described below. Each phase must leave the app in a usable state.
3. **Create these files at the start:**
   - `CLAUDE.md`: a short summary of the standing rules and architecture decisions below, so future sessions stay consistent.
   - `PROGRESS.md`: a checklist of every phase and every feature ID (F1 to F30), with status, notes, and known issues. Update it after every work session. Future sessions start by reading `CLAUDE.md`, `PROGRESS.md`, then this spec.
4. **Commit often** with clear messages (`feat(map): semantic zoom levels`). Never commit secrets. Never commit an API key.
5. **Run checks before every commit:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run build:artifact` once that target exists.
6. **Look at your own UI.** If your environment can take screenshots (for example with Playwright), use them to review screens for visual quality, spacing, dark and light themes, and mobile layout. Fix what looks off.
7. **Accuracy matters.** This app teaches interview material. Every explanation, complexity, and fact you write into seed content must be correct. When unsure about a fact, mark the content item `needsReview: true` instead of guessing.
8. **Never copy problem statements** from LeetCode or any other platform into the app's seed data. Store titles, numbers, links, difficulty, and patterns only. Drill prompts you write must be original.
9. **Plain, friendly language in the UI.** The owner found existing resources either overwhelming or fragmented. Every screen should feel calm, clear, and obvious.
10. **Ask the owner only when truly blocked.** Otherwise make a sensible decision, record it in `CLAUDE.md` under "Decisions", and continue.

**How the owner runs you (Claude Code cloud sessions)**

The owner builds this with Claude Code on the web, in cloud sessions connected to a GitHub repository. Work with these facts:

- Each session clones the repository and works on **its own branch**. You can push only to that branch. The owner reviews and merges your work into `main` with a pull request.
- **At the end of every phase** (and before a session ends for any reason): make sure all checks pass, commit, push your branch, update `PROGRESS.md`, and then tell the owner in plain words: "Phase N is done. Please click **Create PR**, then merge it on GitHub, then start a new session for the next phase." Keep that message short and beginner-friendly.
- **At the start of every session:** read `CLAUDE.md`, `PROGRESS.md` and this spec. Check that the branch you started from contains the previous phase's work (look at `PROGRESS.md`). If it doesn't, tell the owner the previous pull request probably wasn't merged yet, and stop.
- Update `PROGRESS.md` and commit at least every hour or so, not only at phase ends, so work is never lost if a session stops unexpectedly.
- **GitHub Actions workflow files:** if pushing files under `.github/workflows/` is rejected, save them under `setup/github-workflows/` instead and give the owner exact steps to add them on the GitHub website (Add file → Create new file → paste the name and contents → Commit changes).
- **GitHub Pages:** on a free GitHub account, Pages works only for **public** repositories. If the repository is private, tell the owner their options (make it public, use GitHub Pro, which is free with the GitHub Student Developer Pack, or skip Pages and use only the artifact build).
- **Screenshots:** try Playwright (`npx playwright install chromium`). If the browser download is blocked by the session's network, try any Chrome or Chromium already installed on the machine. If neither works, skip screenshots, do careful code-level visual review instead, and note it in `PROGRESS.md`. Never let this block progress.
- The session's network allows package registries (npm and similar) and GitHub, and blocks most other sites. Don't depend on other sites at build time.

---

## 1. Product vision

### 1.1 The problem

Preparing for high-paying SDE and quant roles means learning many subjects at once: DSA, OOP, operating systems, computer networks, DBMS, SQL, system design, and for quant roles, probability, math, brainteasers, and markets. The owner's biggest pain:

- Resources are either **complete but overwhelming** or **simple but broken into chunks**.
- Progress is scattered: problems solved on one site, notes in another, theory in videos, nothing connected.
- Solved problems are forgotten. Theory read once is forgotten.
- There is no clear answer to "what should I do today?" or "am I ready?"

### 1.2 The product in one paragraph

Atlas is a **zoomable map of everything needed to crack SDE and quant interviews**. Subjects are regions, topics are clusters, and concepts are bubbles connected by prerequisite and cross-subject links. Each bubble is colored by the owner's real mastery. Clicking a bubble opens it at three depth levels (simple, interview, deep), with notes, linked problems, quizzes, and a built-in Claude tutor that knows what the owner already understands. A problem tracker saves every attempt with code, an insight, and mistakes. A scheduler brings back problems and concepts before they are forgotten. A daily plan, readiness dashboard, mock interviews, and one-click revision sheets turn all of it into a single routine.

### 1.3 Design principles (use these to make decisions)

1. **One place, everything connected.** Every problem, note, mistake, quiz, and AI answer is attached to concepts on the map.
2. **Choose your depth.** Never force the owner to read everything. Simple first, deeper only when wanted.
3. **Honest progress.** Colors and scores come from evidence (problems solved alone, quiz and explain-back results, recency), not from clicking "done". Always show *why* a score is what it is.
4. **Remember, don't just learn.** Spaced repetition is built into everything.
5. **Claude is a tutor, not an answer machine.** Hints before solutions. Questions back to the learner. Feedback on explanations.
6. **Calm, fast, beautiful.** Smooth interactions, no clutter, works on a phone.
7. **The owner owns the data.** Everything is stored for the owner only, with export and import.

### 1.4 Who it's for

A single user (the owner). No accounts, no multi-user features, no social features. Design every screen for one motivated student using it daily for months.

### 1.5 Tracks

The owner can pick a target: **SDE**, **Quant**, or **Both**. The track filters the map, weights the readiness score, and shapes the daily plan. Every subject and concept declares which tracks it belongs to.

---

## 2. Runtime modes and architecture

The same codebase must run in **two runtimes**. This is the most important architecture decision, so read carefully.

### 2.1 Runtime A: standalone web app (GitHub Pages)

- Built with `npm run build` and deployed to GitHub Pages by a GitHub Actions workflow (free hosting; the owner can open it on laptop and phone).
- **Storage:** IndexedDB in the browser (via Dexie). Data lives in that browser only; export and import move it between devices.
- **AI:** two options the owner chooses in Settings:
  - **Copy-prompt mode (default, free):** the app builds a complete, context-rich prompt, copies it to the clipboard, and opens `https://claude.ai/new` in a new tab. The owner pastes it into Claude (covered by the owner's Pro plan), then optionally pastes the answer back into the app to save it.
  - **API key mode (optional, paid separately):** the owner enters their own Anthropic API key in Settings. The key is stored only in this browser's IndexedDB, is never exported, never logged, and never committed. Calls go directly from the browser to the Anthropic Messages API (see section 10.1).

### 2.2 Runtime B: claude.ai published artifact

- Built with `npm run build:artifact` into **one self-contained HTML file** (`dist-artifact/index.html`). `npm run release:artifact` builds it and zips it into `release/atlas-artifact.zip`, which is committed to the repository. The owner downloads the zip from GitHub, uploads it to a claude.ai chat, and asks Claude to publish the HTML inside it as an artifact with the capabilities listed below (steps in section 14.2). A zip is used because a large HTML file uploaded directly would be read into the chat as text.
- Inside a published artifact, the page can use **runtime capabilities** through `window.claude.use(name)`. Runtime contract version at the time of writing: **0.2.54**. The ones this app uses:
  - `sample`: ask Claude. Runs on the viewer's own Claude account (the owner's Pro plan usage). **No API key needed.** This is the owner's preferred way to get AI answers inside the app.
  - `db`: a persistent JSON document store that syncs across the owner's devices.
  - `user`: gives the viewer's stable id, needed for the private `data/users/<id>/` storage path.
  - `downloads`: lets the page offer a file (backup export, revision sheet) for the viewer to save. Plain download links do not work inside a published page.
- Capability declaration to request when publishing: `{ "sample": {}, "db": {}, "user": {}, "downloads": true }`.
- Section 10.2 documents the exact call contracts. Follow them precisely.

### 2.3 Detecting the runtime

At startup, the app renders immediately (never block first paint), then detects capabilities:

```ts
// src/lib/runtime/detect.ts
export async function detectRuntime(): Promise<RuntimeInfo> {
  const c = (window as any).claude;
  if (!c || typeof c.use !== "function") return { kind: "standalone" };
  const [sample, db, user, downloads] = await Promise.all([
    c.use("sample"), c.use("db"), c.use("user"), c.use("downloads"),
  ]);
  const uid = user ? await user.id() : null;
  return {
    kind: db && uid ? "artifact" : "standalone",
    sample, db, uid, downloads,
  };
}
```

Rules:
- `claude.use()` resolves `null` when a capability is not available (it may take up to about 10 seconds). Show a small "Connecting…" state for storage only if needed, and fall back to IndexedDB when `db` or the user id is `null`.
- Never read `window.claude.db` or any other member directly. Only `window.claude.use`.
- If `sample` is `null` or a call rejects `not_granted` or `sampling_disabled`, switch AI to copy-prompt mode for that session and show a small notice.
- Choose storage and AI independently: use `sample` whenever it is available, even if storage fell back to IndexedDB.

### 2.4 Adapter pattern (required)

All runtime differences live behind three interfaces. Feature code never touches IndexedDB, `claude.use`, or `fetch` directly.

```ts
// src/lib/storage/Repository.ts   (implementations: DexieRepository, ClaudeDbRepository)
// src/lib/ai/AIProvider.ts        (implementations: SampleAIProvider, AnthropicApiProvider, CopyPromptProvider)
// src/lib/files/FileSaver.ts      (implementations: BrowserFileSaver, ClaudeDownloadsSaver)
```

- `Repository`: typed async methods for every entity in section 4 (get, list, put, patch, delete), plus `exportAll()` and `importAll()`.
- `AIProvider`: one method, described in section 10.1: `ask(request): Promise<AIResult>` with streaming, cancel, JSON mode, and model tier.
- `FileSaver`: `save({ filename, data, mime })`.

Choose implementations once at startup based on `detectRuntime()` and Settings. Provide them through a React context.

### 2.5 Hard constraints for the artifact build

A published artifact page runs under a strict content-security policy. The artifact build must obey all of these, or features will silently fail:

- **One self-contained HTML file** under 16 MB. All JavaScript, CSS, fonts, and images inlined. Use `vite-plugin-singlefile` with `build.assetsInlineLimit` set very high and `cssCodeSplit: false`.
- **No network requests** to any site. No remote images, no remote fonts except Google Fonts (prefer bundling fonts via `@fontsource`, inlined). No `fetch` to anything. External scripts are allowed only from `https://cdnjs.cloudflare.com`, `https://cdn.jsdelivr.net/npm/`, `https://cdn.tailwindcss.com`, and `https://code.jquery.com`, but prefer bundling everything.
- **Viewport and safe areas:** include `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Apply `:root { box-sizing: border-box; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }` and `html { scroll-padding-top: env(safe-area-inset-top, 0px); }`. Fixed top or bottom bars add the matching inset to their padding. Sticky headers use `top: env(safe-area-inset-top, 0px)`. Size one-screen layouts with `height: 100%` on `html` and `body`, not `100vh`.
- **Theme:** define all colors as CSS custom properties on `:root`; redefine them under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and again under `:root[data-theme="dark"] { … }`. Give `body` an explicit background. The app's theme toggle sets `data-theme` on `<html>`.
- **Wide content** (tables, code, diagrams) scrolls inside its own `overflow-x: auto` container. The page body never scrolls sideways.
- **Browser storage** (localStorage, IndexedDB) is available but private to that browser. Wrap every access in `try/catch`.
- **Downloads** must go through the `downloads` capability (`FileSaver` adapter). `<a download>` links do nothing inside a published page.
- **No `window.open` dependency** for core features. Copy-prompt mode in the artifact runtime is only a fallback; copy to clipboard and show instructions.
- **Clipboard and printing may be blocked** inside the artifact frame. If `navigator.clipboard.writeText` fails, show the text in a read-only, auto-selected text area with the hint "Press Ctrl+C (or long-press and Copy)". If `window.print()` does nothing or throws, offer "Export as HTML" so the owner can print from the downloaded file.
- Favicon: one emoji (use 🧭). Keep the same one on every republish.
- Add a script `scripts/check-artifact.mjs` that fails the build if the file exceeds 15 MB or contains `http://` or `https://` URLs other than the allowed hosts, `claude.ai` links shown as text, and `leetcode.com` problem links (plain links for the owner to open are fine).

### 2.6 Tech stack

Use the latest stable versions at build time and pin exact versions in `package.json`.

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite + TypeScript (strict) | Two targets: `build` (GitHub Pages) and `build:artifact` (single file) |
| UI | React 18+ | Function components and hooks |
| Styling | Tailwind CSS v4 + CSS custom properties | Design tokens from section 12 live in CSS variables |
| State | Zustand | One store per domain, hydrated from `Repository` |
| Local storage | Dexie (IndexedDB) | Standalone runtime |
| Map canvas | `@xyflow/react` (React Flow) | Custom nodes, minimap, controls |
| Layout (build time) | `d3-force` (or `elkjs`) in a Node script | Precompute map positions into `src/data/layout.json`; never ship these to the browser |
| Diagram layout (runtime) | `@dagrejs/dagre` | Small layered layout for the design sketch (F26) |
| Text diff | `diff` | Attempt comparison (F7) |
| Fuzzy search | `minisearch` or `fuse.js` | Command palette (F23) |
| Zip (build script only) | `archiver` or `fflate` | Creates `release/atlas-artifact.zip` |
| Code editor | CodeMirror 6 via `@uiw/react-codemirror` | Languages: C++, Java, Python, JavaScript, SQL |
| Markdown | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` | KaTeX CSS and fonts bundled |
| Charts | Recharts | Dashboard |
| Command palette | `cmdk` | Ctrl/Cmd + K |
| Motion | `motion` (Framer Motion) | Restrained, respects reduced motion |
| Icons | `lucide-react` | Outline icons |
| Validation | `zod` | Imports, AI JSON outputs |
| Dates | `date-fns` | |
| IDs | `nanoid` | |
| Fonts | `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-sans-condensed`, `@fontsource/ibm-plex-mono` | Latin subset, weights 400, 500, 600 only |
| Tests | Vitest + Testing Library | Unit tests for all algorithms in section 11 |
| E2E (optional) | Playwright | Smoke tests and screenshots (best effort, see section 0) |

**Size budget for the artifact file:** aim for 12 MB or less (hard limit 15 MB in the check script). Keep heavy libraries out of the runtime bundle, subset fonts to Latin and three weights, and have `check-artifact.mjs` print the size of the largest bundled modules and of the syllabus JSON so growth is visible.

### 2.7 Folder structure

```
/
├─ BUILD_SPEC.md            (this file)
├─ CLAUDE.md                (you create)
├─ PROGRESS.md              (you create)
├─ DEPLOY.md                (you create in the final phase)
├─ release/atlas-artifact.zip (built by `npm run release:artifact`)
├─ index.html
├─ vite.config.ts           (standalone target)
├─ vite.artifact.config.ts  (single-file target)
├─ scripts/
│  ├─ build-syllabus.mjs    (parses content markdown into JSON, validates ids and DAG)
│  ├─ build-layout.mjs      (computes map positions into src/data/layout.json)
│  └─ check-artifact.mjs
├─ content/                 (human-readable seed content, one markdown file per topic)
│  ├─ dsa/graph-basics.md
│  └─ …
├─ src/
│  ├─ app/                  (App shell, routes, providers, theme)
│  ├─ features/
│  │  ├─ today/  map/  concept/  problems/  editor/  practice/
│  │  ├─ drill/  review/  mock/  mistakes/  dashboard/  revision/
│  │  ├─ ask/  designs/  stories/  mentalmath/  settings/  onboarding/
│  ├─ components/ui/        (Button, Dialog, Drawer, Tabs, Segmented, Tooltip, Toast, …)
│  ├─ lib/
│  │  ├─ runtime/  storage/  ai/  files/
│  │  ├─ srs/  mastery/  readiness/  planner/  recommend/
│  │  ├─ export/  search/  time/
│  ├─ data/
│  │  ├─ syllabus.generated.json
│  │  ├─ layout.json
│  │  ├─ problems.seed.ts
│  │  ├─ drills.seed.ts
│  │  ├─ quant.seed.ts
│  │  ├─ designs.seed.ts
│  │  └─ behavioral.seed.ts
│  └─ styles/tokens.css
└─ tests/
```

Routing: use hash-based routing (`#/map`, `#/problems/lc-1`) so it works both on GitHub Pages and inside the artifact frame without server configuration.

---

## 3. Information architecture and vocabulary

Use these words consistently in code and in the UI.

| Term | Meaning | Example |
|---|---|---|
| **Subject** | A big area of study. A region on the map. | DSA, Operating Systems, Probability |
| **Topic** | A cluster inside a subject. | Graphs: basics and traversal |
| **Concept** | One learnable idea. A bubble on the map. The unit of mastery. | BFS, Deadlock, Linearity of expectation |
| **Pattern** | A concept in DSA that describes a problem-solving technique. Problems attach to patterns. | Sliding window (variable size) |
| **Problem** | A practice question (LeetCode, SQL, quant puzzle, design prompt, or custom). | LC 1 Two Sum |
| **Attempt** | One try at a problem, with code, time, result, hints, and mistakes. | Attempt 2 on 12 Oct |
| **Insight** | The one-line lesson of a problem. | "Store what you've seen in a hash map." |
| **Mistake tag** | A reusable label for a type of error. | Off-by-one |
| **Check** | Evidence of understanding: quiz result, explain-back score, flashcard review. | Quiz 4/5 on Paging |
| **Track** | SDE, Quant, or Both. | |
| **Status** | Mastery color of a concept: not started, learning, strong, fading. | |

Map hierarchy: **Subject → Topic → Concept**. Problems link to one or more concepts. Cross-subject links connect concepts across subjects.

---

## 4. Data model

All types live in `src/lib/types.ts`. Seed data (syllabus, problems, drills) is static and bundled. User data is everything the owner creates and is stored through the `Repository`.

### 4.1 Static seed types

```ts
export type TrackId = "sde" | "quant";
export type Importance = "must" | "important" | "advanced"; // [M] [I] [A] in the syllabus
export type SubjectId = string;  // "dsa", "os", …
export type TopicId = string;    // "dsa.graph-basics"
export type ConceptId = string;  // "dsa.graph-basics.bfs"

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;       // for small map labels
  tracks: TrackId[];
  order: number;
  icon: string;            // lucide icon name
  regionHue: number;       // 0-360, used only for the faint region tint
  description: string;     // one sentence, plain language
}

export interface Topic {
  id: TopicId;
  subjectId: SubjectId;
  name: string;
  order: number;
  prereqTopics: TopicId[];
  tracks: TrackId[];       // defaults to the subject's tracks
}

export interface Concept {
  id: ConceptId;
  topicId: TopicId;
  subjectId: SubjectId;
  name: string;
  scope: string;           // the detail text after the colon in the syllabus
  importance: Importance;
  tracks: TrackId[];
  order: number;
  prereqs: ConceptId[];    // concept-level prerequisites (DAG)
  related: CrossLink[];    // cross-subject and same-subject "see also" links
  estMinutes: number;      // time to learn to interview level (default 25)
  isPattern: boolean;      // true for DSA technique concepts that problems attach to
  content: ConceptContent;
}

export interface CrossLink { to: ConceptId; reason: string; }

export interface ConceptContent {
  simple: string;          // markdown, 2 to 4 sentences, everyday analogy
  interview: string[];     // 3 to 7 bullet points, markdown allowed
  deep?: string;           // markdown article; required for "must" concepts
  questions: QA[];         // 3 to 5 interview-style questions with short model answers
  signals?: string[];      // patterns only: how to recognise this pattern in a problem
  template?: string;       // patterns only: code template (C++), markdown code block
  needsReview?: boolean;
}

export interface QA { q: string; a: string; }

export type ProblemSource = "leetcode" | "quant" | "design-lld" | "design-hld" | "custom";
export type Difficulty = "easy" | "medium" | "hard";

export interface SeedProblem {
  id: string;              // "lc-1", "q-coin-hh", "lld-parking-lot"
  source: ProblemSource;
  number?: number;         // LeetCode number
  title: string;
  slug?: string;           // LeetCode slug; url = https://leetcode.com/problems/<slug>/
  difficulty: Difficulty;
  topicId: TopicId;
  conceptIds: ConceptId[]; // 1 to 3 patterns
  premium?: boolean;
  prompt?: string;         // ONLY for original quant puzzles and design prompts written for this app
  answer?: string | null;  // quant puzzles: checkable answer (null = open-ended, graded by Claude or self-graded)
  answerNote?: string;     // quant puzzles: short reasoning shown after answering
  rubric?: string[];       // design prompts: must-discuss points
  needsReview?: boolean;
}

export interface DrillPrompt {       // original mini-problems for pattern drill (F10)
  id: string;
  text: string;            // 2 to 4 sentences, original wording
  answerConceptIds: ConceptId[];
  keyInsight: string;
  difficulty: Difficulty;
}
```

### 4.2 User data types

```ts
export type Status = "not_started" | "learning" | "strong" | "fading";

export interface Profile {
  name: string;
  track: "sde" | "quant" | "both";
  interviewDate?: string;          // ISO date
  primaryLanguage: "cpp" | "java" | "python";   // the editor also supports JavaScript and SQL
  dailyMinutes: number;            // default 90
  balance: { problems: number; theory: number }; // default 60/40
  focusSubjects: SubjectId[];      // "this week" focus, optional
  theme: "system" | "light" | "dark";
  ai: { mode: "sample" | "api" | "copy"; tierModels: { quick: string; default: string; complex: string } };
  onboardingDone: boolean;
  hidePremium: boolean;
  reviewIntensity: "gentle" | "normal" | "intense";
  prefs: {
    reducedMotion: "system" | "on" | "off";
    labelDensity: "low" | "normal" | "high";
    showAdvanced: boolean;
    streakFreeze: boolean;
    focusMinutes: number;          // default 25
    breakMinutes: number;          // default 5
    timerAutoStart: boolean;       // start the attempt timer on the first keystroke
    extraLanguages: ("cpp" | "java" | "python")[]; // other lang topics the owner wants counted
    backupReminder: boolean;
  };
  lastBackupAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface Secrets { anthropicApiKey?: string; } // IndexedDB only. Never exported. Never in the artifact db.

export interface ConceptState {
  conceptId: ConceptId;
  status: Status;                  // derived, cached; see section 11.2
  manualStatus?: Status;           // owner override
  neverFade?: boolean;
  hidden?: boolean;                // owner hid it from the map
  everStrong: boolean;
  strongSince?: string;
  studied: boolean;                // owner marked "I've studied this" or read interview level fully
  selfAssessed?: 0.3 | 0.5;        // from onboarding self-assessment (F5)
  lastLevelOpened?: "simple" | "interview" | "deep";
  knowledge: number;               // 0..1, best recent check result
  srs: SrsState;                   // concept review schedule
  firstActivityAt?: string;
  lastActivityAt?: string;
  updatedAt: string;
}

export interface SrsState {
  step: number;                    // index into the steps array
  dueAt?: string;                  // local date, yyyy-mm-dd
  lastReviewedAt?: string;
  lapses: number;
  soloStreak: number;              // consecutive solo solves at due time (problems)
  retired?: boolean;               // mastered, only shows in revision sheets
}

export interface ConceptNote {
  conceptId: ConceptId;
  markdown: string;
  savedAnswers: SavedAnswer[];     // AI answers the owner chose to keep
  generated?: { simple?: string; interview?: string[]; questions?: QA[]; createdAt: string }; // "Explain with Claude" output for concepts without seed content
  updatedAt: string;
}

export interface SavedAnswer { id: string; question: string; answer: string; createdAt: string; source: "sample" | "api" | "copy"; }

export type AttemptResult = "solved_alone" | "solved_with_hints" | "saw_solution" | "not_solved";

export interface Attempt {
  id: string;
  problemId: string;
  startedAt: string;
  finishedAt?: string;
  minutes?: number;
  language: string;
  code: string;
  result?: AttemptResult;
  hintsUsed: 0 | 1 | 2 | 3;
  approach?: string;               // markdown notes on the approach
  timeComplexity?: string;
  spaceComplexity?: string;
  mistakeTagIds: string[];
  mode: "normal" | "resolve" | "mock";
  review?: CodeReview;             // AI code review result (F12)
  dryRuns?: { input: string; output: string; createdAt: string }[];
}

export interface ProblemState {
  problemId: string;
  custom?: CustomProblem;          // present when the owner added a problem not in the seed
  status: "todo" | "attempted" | "solved";
  insight?: string;                // one-line insight
  summary?: string;                // owner's short restatement of the problem; stays visible in re-solve mode
  myNotes?: string;                // owner's approach notes; hidden in re-solve mode until revealed
  starred: boolean;
  tags: string[];                  // owner tags, e.g. company names
  srs: SrsState;
  inReview: boolean;               // default true once solved
  attempts: Attempt[];             // newest last; cap at 30, warn the owner past 20
  draft?: { language: string; code: string; updatedAt: string }; // autosaved unsaved work
  hints?: { level: 1 | 2 | 3; text: string; createdAt: string }[]; // cached hint ladder output
  updatedAt: string;
}

export interface CustomProblem {  // problemId for custom problems: "custom-<nanoid>" 
  title: string; url?: string; difficulty: Difficulty; source: ProblemSource;
  topicId?: TopicId; conceptIds: ConceptId[]; prompt?: string;
}

export interface MistakeTag { id: string; label: string; category: MistakeCategory; custom: boolean; description?: string; howToAvoid?: string; archived?: boolean; }
export type MistakeCategory = "edge-case" | "logic" | "complexity" | "pattern" | "language" | "reading" | "other";

export interface Check {
  id: string;
  conceptId: ConceptId;
  kind: "quiz" | "explain" | "flashcard" | "drill" | "manual";
  score: number;                   // 0..1
  detail?: unknown;                // quiz answers, explain-back feedback JSON
  createdAt: string;
}

export interface DayPlan {
  date: string;                    // yyyy-mm-dd, local time
  budgetMinutes: number;
  minimumDay: boolean;
  items: PlanItem[];
  generatedAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  kind: "resolve" | "review-concept" | "learn-concept" | "new-problem" | "drill" | "mock" | "mental-math" | "revision" | "design" | "story";
  refId?: string;                  // conceptId or problemId
  refIds?: string[];               // for bundles, e.g. a flashcard item covering several concepts
  title: string;
  reason: string;                  // plain-language "why this is here"
  estMinutes: number;
  done: boolean;
  skipped: boolean;
}

export interface ActivityMonth {   // aggregated to stay small
  month: string;                   // yyyy-mm
  days: Record<string, { minutes: number; problemsSolved: number; reviews: number; conceptsTouched: number }>;
  streakFreezeUsed?: string[];
}

export interface MockSession {
  id: string; kind: "dsa" | "theory" | "design" | "behavioral";
  topicOrProblemId?: string;
  turns: { role: "user" | "assistant"; content: string }[];
  code?: string;
  feedback?: MockFeedback;
  phase?: string;                  // current phase, so a reload resumes correctly
  startedAt: string; endedAt?: string; updatedAt: string;
}

export interface DesignAttempt {    // LLD and HLD practice (F26)
  id: string; problemId: string;
  sections: Record<string, string>; // requirements, entities, api, dataModel, diagram, tradeoffs…
  review?: unknown; createdAt: string; updatedAt: string;
}

export interface Story {            // behavioral STAR story bank (F27)
  id: string; title: string; situation: string; task: string; action: string; result: string;
  tags: string[]; questionIds: string[]; review?: unknown; updatedAt: string;
  practice?: { questionId: string; answer: string; critique?: unknown; createdAt: string }[];
}

export interface CustomConcept {  // owner-added bubble (F2)
  id: string;                      // "custom.<nanoid>"
  topicId: TopicId; name: string; scope: string; importance: Importance;
  createdAt: string;
}

export interface MentalMathRun { id: string; mode: string; correct: number; total: number; seconds: number; createdAt: string; }

// CodeReview, MockFeedback and the other AI result types are inferred from the zod schemas in section 10.4
// (export type CodeReview = z.infer<typeof codeReviewSchema>).
```

**Rule for all user data:** every stored user entity has an `updatedAt` timestamp (add it to any type above that lacks one, such as `ConceptNote`, `DesignAttempt`, `MistakeTag` lists and `ActivityMonth`). Import merge (F22) and multi-device sync rely on it.

### 4.3 Storage layout

**Standalone (Dexie):** one table per entity: `profile`, `secrets`, `conceptStates` (key `conceptId`), `conceptNotes`, `problemStates` (key `problemId`), `mistakeTags`, `checks` (index `conceptId`, `createdAt`), `dayPlans` (key `date`), `activity` (key `month`), `mocks`, `designs`, `stories`, `mentalMath`, `mapOverrides` (dragged node positions), `customConcepts`, `generatedDrills`.

**Artifact (`db` capability):** the store allows at most **5,000 documents per artifact** and **256 KiB per document**, so aggregate. All documents live under the owner's private path `data/users/<uid>/` (a collection), so each document path is `data/users/<uid>/<docId>` (four segments). Allowed characters in ids: letters, digits, and `_ - . ~ : @ +`.

| Doc id | Contents |
|---|---|
| `profile` | `Profile` (never secrets) |
| `concepts-<subjectId>` | `{ [conceptId]: ConceptState }` for one subject |
| `note-<conceptId>` | `ConceptNote` (only created when a note or saved answer exists) |
| `problem-<problemId>` | `ProblemState` including attempts and code |
| `mistakeTags` | `{ tags: MistakeTag[] }` |
| `checks-<subjectId>` | `{ checks: Check[] }`, keep the latest 400 per subject, prune older |
| `plan-<yyyy-mm-dd>` | `DayPlan`; prune plans older than 60 days |
| `activity-<yyyy-mm>` | `ActivityMonth` |
| `mock-<id>`, `design-<id>`, `story-<id>` | one per session or item |
| `mentalMath` | `{ runs: MentalMathRun[] }` (latest 300) |
| `mapOverrides` | `{ [nodeId]: {x, y} }` |
| `customConcepts` | `{ concepts: CustomConcept[] }` |
| `generatedDrills` | `{ drills: DrillPrompt[] }` (Claude-generated drill prompts) |

Rules for the `ClaudeDbRepository`:
- Build paths only with the awaited user id: `db.doc(\`data/users/${uid}/${docId}\`)`.
- One write at a time per document. Debounce edits (800 ms) and coalesce. Never write from render code, snapshot callbacks, or timers that rewrite unchanged data.
- Every document body includes two top-level fields, `kind` (for example `"problem"`, `"note"`, `"plan"`) and `key` (the document id). The `db` query API has no cursor, so load at startup kind by kind and page with the key: `collection.where("kind","==",k).where("key",">",lastKey).orderBy("key").limit(500)`, repeating until a page returns fewer than 500 documents. Keep the results in an in-memory cache and write through it.
- Subscribe with `onSnapshot` once per document only where live updates matter (profile and today's plan), so edits from the owner's phone appear on the laptop.
- Handle error codes: `quota_exceeded` (tell the owner which data to prune, offer to archive old plans), `resource_exhausted` (slow down), `unavailable` (retry once after a short random delay), `revoked` (switch to read-only notice).
- Before writing a `problem-*` doc, estimate its JSON size; if over 200 KiB, keep the latest 20 attempts in full and trim older attempts' code to their first 2,000 characters, and tell the owner.

### 4.4 Schema versioning and migrations

- `Profile.schemaVersion` starts at 1. Keep `src/lib/storage/migrations.ts` with ordered migration functions. Run them on load for both repositories and on import.
- Exports carry `{ app: APP_NAME, schemaVersion, exportedAt, data: {...} }` and are validated with zod on import.
- If the seed syllabus changes ids later, keep an `idAliases` map (`oldId → newId`) and apply it during load and import so the owner's progress is never lost.

---

## 5. Seed content: format and writing rules

### 5.1 How to read the syllabus in section 6

- `### N. Subject name` with a line `id: … | tracks: … | icon: …`
- `#### Topic name` with a line `id: … | prereqs: …`. Always use the id written on that line (it is not derived from the topic name).
- Each bullet under a topic is **one concept** (one bubble on the map):
  `- [M] Concept name: scope details`
  - `[M]` must-know, `[I]` important, `[A]` advanced or optional.
  - A track list in parentheses after the tag, such as `(quant)` or `(sde, quant)`, sets that concept's tracks and overrides the topic's tracks. Without it, the concept inherits the topic's tracks. A subject region is shown for a track whenever at least one of its concepts belongs to that track.
  - `(pattern)` marks a DSA technique concept that problems attach to (`isPattern: true`).
  - The concept id is `<topicId>.<slug of the concept name>` (lowercase, words joined by hyphens, symbols removed). Example: `dsa.graph-basics.bfs`.
  - The text after the first colon is the **scope**: what the content for that concept must cover. The colon and scope are optional; when a bullet has no colon, the whole text is the name and the scope equals the name.
- Concepts inside a topic are listed in a sensible learning order. Use this order for the "suggested path" inside a topic.

### 5.2 Turning the syllabus into data

1. Copy each topic into `content/<subjectId>/<rest of the topic id>.md` (for example `dsa.graph-basics` becomes `content/dsa/graph-basics.md`) using the structure below, then write the content for every concept. Quote front-matter values that contain a colon.
2. `scripts/build-syllabus.mjs` parses all content files into `src/data/syllabus.generated.json`, and **fails the build** if an id is duplicated, a prerequisite or cross-link points to a missing id, or the prerequisite graph has a cycle. Missing content is only a **warning** with a per-subject count (content is written over time, section 13, Phase 5). With `--strict`, used in Phase 9, missing required content (simple, interview and questions everywhere; deep for every `[M]` concept; signals and template for every pattern) also fails the build.
3. Resolve every cross-link in section 7 to real concept ids and store them in both directions.

Content file structure (one file per topic):

````markdown
---
topic: dsa.graph-basics
name: "Graphs: basics and traversal"
subject: dsa
prereqs: [dsa.recursion, dsa.stacks-queues]
---

## dsa.graph-basics.bfs
importance: must
pattern: true
prereqs: [dsa.graph-basics.graph-representations]

### simple
…

### interview
- …

### deep
…

### questions
Q: …
A: …

### signals
- …

### template
```cpp
…
```
````

### 5.3 Writing rules for every concept

**Simple level** (always): 2 to 4 short sentences. One everyday analogy. No unexplained jargon. A beginner should understand it on first read.
> Example (BFS): "BFS explores a graph in rings, like ripples spreading from a stone dropped in water. It visits everything one step away, then two steps away, and so on. That is why it finds the shortest path when every edge costs the same."

**Interview level** (always): 3 to 7 bullets. What the owner would actually say in an interview: definition, key facts, complexity, when to use it, the classic follow-up questions, common pitfalls. Precise and compact.

**Deep level** (required for `[M]`, recommended for `[I]`, optional for `[A]`): a markdown article of roughly 300 to 900 words:
- Intuition first, then the formal idea.
- A worked example traced step by step (a small table or list of states is great).
- Code in C++ first, then Python, in fenced code blocks, for anything implementable. Keep code clean and interview-style.
- Time and space complexity with a one-line justification.
- Edge cases and common bugs.
- Variants and how they change the solution.
- "Connects to" line naming related concepts (these also appear as links).
- Math uses KaTeX: `$E[X]$`, `$$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$`.

**Questions** (always): 3 to 5 interview-style questions with short model answers (2 to 5 sentences). These power flashcards and offline quizzes. Mix "what/why/how/compare/what happens if".

**Signals** (patterns only): 3 to 6 phrases that hint a problem uses this pattern. Example for sliding window: "contiguous subarray or substring", "longest/shortest window satisfying a condition", "at most K distinct".

**Template** (patterns only): a reusable C++ skeleton with comments.

**Tone:** warm, direct, clear. Short sentences. Use "you". No filler. No motivational fluff.

**Accuracy:** double-check complexities, definitions, and formulas. Mark uncertain items `needsReview: true`; the UI shows a small "unverified" badge on them.

**Volume plan:** the syllabus has 909 concepts (400 must-know, 397 important, 112 advanced) in 146 topics. Write content subject by subject in this order: DSA, OOP, OS, CN, DBMS, SQL, System Design, Language core, Concurrency, LLD, Probability, Math, Puzzles, Markets, Architecture, Aptitude, Engineering essentials, Career. The app must work while content is incomplete: a concept without content shows its scope text and an "Explain with Claude" button.

---

## 6. The complete syllabus

Eighteen subjects, 146 topics and 909 concepts (90 of them DSA patterns). Map regions are arranged so related subjects sit next to each other (see section 9, F2).

| # | Subject | id | Tracks |
|---|---|---|---|
| 1 | Programming language core (C++, Java, Python) | `lang` | sde, quant |
| 2 | Data structures and algorithms | `dsa` | sde, quant |
| 3 | Object-oriented programming and design principles | `oop` | sde, quant |
| 4 | Low-level design (machine coding) | `lld` | sde |
| 5 | Operating systems | `os` | sde, quant |
| 6 | Concurrency and multithreading | `conc` | sde, quant |
| 7 | Computer architecture and performance | `arch` | quant, sde |
| 8 | Computer networks | `cn` | sde |
| 9 | Database management systems | `dbms` | sde |
| 10 | SQL | `sql` | sde |
| 11 | System design (high-level) | `sysd` | sde |
| 12 | Probability and statistics | `prob` | quant |
| 13 | Mathematics for quant | `math` | quant |
| 14 | Brainteasers and puzzles | `puzzles` | quant, sde |
| 15 | Markets and trading | `markets` | quant |
| 16 | Aptitude and mental math | `apt` | sde, quant |
| 17 | Engineering essentials (Git, Linux, testing, APIs, cloud) | `eng` | sde |
| 18 | Behavioral and career | `career` | sde, quant |

Language note: the owner picks a primary language in Settings (C++, Java or Python). In the `lang` subject, the topics for the other languages (C++: `lang.cpp-core`, `lang.cpp-stl`, `lang.cpp-modern`; Java: `lang.java-core`; Python: `lang.python-core`) are dimmed but still visible, and are excluded from readiness and the daily plan unless the owner adds them in `prefs.extraLanguages`. `lang.general` always counts. For the Quant track, suggest adding C++ even if the primary language is Python, because many trading firms use it.

### 1. Programming language core
id: lang | tracks: sde, quant | icon: code

#### C++ essentials
id: lang.cpp-core | prereqs: none
- [M] Types and operators: integer types and ranges, overflow, implicit conversions, integer division, `auto`
- [M] Functions and references: pass by value vs reference vs const reference, overloading, default arguments
- [M] Pointers and memory: pointers vs references, `new`/`delete`, stack vs heap, dangling pointers, leaks, `nullptr`
- [M] Strings and vectors: `std::string`, `std::vector` growth, amortized `push_back`, iterator invalidation
- [I] Classes and const correctness: const member functions, initializer lists, `mutable`
- [I] Compilation model: preprocessing, compiling, linking, headers, one-definition rule, optimization flags
- [I] Undefined behavior: out-of-bounds access, signed overflow, uninitialized reads, why it matters

#### C++ STL for interviews
id: lang.cpp-stl | prereqs: lang.cpp-core
- [M] Sequence containers: vector, deque, list, array and the cost of each operation
- [M] Ordered containers: map, set, multiset (red-black trees), `lower_bound`, `upper_bound`
- [M] Unordered containers: unordered_map and unordered_set internals, custom hash, `reserve`, worst case
- [M] Container adaptors: stack, queue, priority_queue (max-heap default, min-heap with `greater<>`, custom comparators)
- [M] STL algorithms: sort, stable_sort, comparators and strict weak ordering, binary_search, next_permutation, accumulate, unique
- [I] Pairs, tuples and lambdas: structured bindings, lambda captures, sorting with lambdas
- [A] Policy-based ordered set: order statistics tree for competitive programming

#### Modern C++
id: lang.cpp-modern | prereqs: lang.cpp-core
- [M] RAII: tying resources to object lifetime, destructors, exception safety
- [M] Smart pointers: unique_ptr, shared_ptr (reference counting cost), weak_ptr (breaking cycles)
- [M] Move semantics: lvalues vs rvalues, move constructor and assignment, `std::move`, rule of three, five and zero
- [I] Templates: function and class templates, specialization basics, compile-time polymorphism
- [I] const, constexpr and inline: compile-time computation and its uses
- [I] Virtual function internals: vtable, vptr, cost of virtual calls, virtual destructors
- [A] (quant) CRTP and static polymorphism: avoiding virtual dispatch in low-latency code
- [A] (quant) Object memory layout: size, alignment, padding, cache-friendly structs

#### Java essentials
id: lang.java-core | prereqs: none
- [M] JVM, JRE and JDK: bytecode, class loading, JIT compilation
- [M] Java memory and garbage collection: stack vs heap, references, generational GC, stop-the-world pauses
- [M] Strings in Java: immutability, string pool, StringBuilder, `equals` vs `==`
- [M] Collections framework: List, Set, Map, Queue; ArrayList vs LinkedList; HashSet vs TreeSet
- [M] HashMap internals: buckets, hashing, equals and hashCode contract, resizing, treeification
- [I] Specialised collections: PriorityQueue, ArrayDeque, TreeMap floor and ceiling, LinkedHashMap as LRU
- [I] Generics: type erasure, bounded types, wildcards
- [I] Exceptions: checked vs unchecked, try-with-resources, finally
- [I] Modern Java features: lambdas, streams, Optional, functional interfaces
- [I] Keywords that matter: final, static, abstract, interfaces with default methods
- [A] Java threads overview: Thread vs Runnable, ExecutorService, synchronized, volatile, ConcurrentHashMap

#### Python essentials
id: lang.python-core | prereqs: none
- [M] Python data model: everything is an object, mutability, references, `is` vs `==`
- [M] Built-in structures: list, tuple, dict, set and their operation costs
- [M] collections and heapq: deque, Counter, defaultdict, heapq min-heap and the max-heap trick
- [I] Comprehensions and generators: lazy evaluation, `yield`, iterators
- [I] Functions and closures: `*args`, `**kwargs`, decorators, the mutable default argument pitfall
- [I] Classes in Python: dunder methods, inheritance, method resolution order
- [I] The GIL: what it is, threads vs processes vs asyncio
- [A] Interview performance tips: recursion limit, fast input, `bisect`, `lru_cache`

#### Language-agnostic essentials
id: lang.general | prereqs: none
- [M] Cost of built-in operations: know the complexity of every container method you use
- [M] Integer overflow and limits: 32-bit vs 64-bit, when to use long long, modulo arithmetic
- [I] Floating point pitfalls: precision errors, comparing with an epsilon
- [I] Recursion depth and stack overflow: when to convert recursion to iteration
- [I] Fast input and output: when it matters in online assessments

---

### 2. Data structures and algorithms
id: dsa | tracks: sde, quant | icon: git-branch

#### Complexity analysis
id: dsa.complexity | prereqs: none
- [M] Big-O, Big-Theta and Big-Omega: meaning, dropping constants, dominant terms
- [M] Analyzing loops: counting operations, nested loops, logarithmic loops
- [M] Recursion complexity: recursion trees, recurrences, the Master theorem
- [M] Space complexity: auxiliary space, recursion stack, in-place algorithms
- [I] Amortized analysis: dynamic array doubling, aggregate method
- [M] Constraints to complexity: n ≤ 10 allows n!, 20 allows 2^n, 500 allows n^3, 5,000 allows n^2, 10^5 to 10^6 needs n log n or n, larger needs log n or O(1)
- [I] Best, average and worst case: quicksort and hash table examples

#### Arrays
id: dsa.arrays | prereqs: dsa.complexity
- [M] Array basics: indexing, traversal, in-place updates, memory layout
- [M] (pattern) Kadane's algorithm: maximum subarray sum and its variants (circular, product)
- [M] (pattern) Dutch national flag: three-way partitioning
- [I] (pattern) Cyclic sort: values in range 1 to n, finding missing and duplicate numbers
- [M] Matrix traversal: rows and columns, spiral order, diagonals, rotate by 90 degrees, transpose
- [I] (pattern) Boyer-Moore majority vote: majority element for n/2 and n/3
- [I] Next permutation: the lexicographic next-order algorithm
- [I] In-place array tricks: reversal for rotation, marking with signs or indices

#### Prefix sums
id: dsa.prefix-sums | prereqs: dsa.arrays
- [M] (pattern) 1D prefix sums: range sum queries in O(1)
- [M] (pattern) Prefix sum with hash map: count subarrays with sum K, longest subarray with sum K, divisibility by K
- [I] (pattern) 2D prefix sums: submatrix sums
- [I] (pattern) Difference arrays: range updates in O(1)
- [I] Prefix products and prefix XOR: product of array except self, XOR range queries

#### Hashing
id: dsa.hashing | prereqs: dsa.arrays
- [M] Hash table internals: hash functions, buckets, load factor, resizing
- [M] Collision handling: chaining vs open addressing, worst case O(n)
- [M] (pattern) Frequency counting: counting elements, anagram checks, grouping by a key
- [M] (pattern) Complement lookup: two-sum style "have I seen target minus x?"
- [I] Hash sets for membership: deduplication, longest consecutive sequence
- [I] Ordered maps vs hash maps: when you need sorted keys, floor and ceiling queries
- [A] Custom hashing and anti-hash tests: hashing pairs, why a hash map can be attacked

#### Two pointers
id: dsa.two-pointers | prereqs: dsa.arrays
- [M] (pattern) Opposite-ends pointers: sorted pair sum, palindrome checks, container with most water
- [M] (pattern) Same-direction pointers: remove duplicates, move zeroes, partitioning
- [M] (pattern) Fast and slow pointers: cycle detection, middle element, happy number
- [M] (pattern) Merging sorted sequences: merge two sorted arrays
- [M] (pattern) kSum: 3Sum and 4Sum with sorting and deduplication
- [I] Trapping rain water: two pointers with running maximums

#### Sliding window
id: dsa.sliding-window | prereqs: dsa.two-pointers, dsa.hashing
- [M] (pattern) Fixed-size window: sliding sums and averages, anagram occurrences
- [M] (pattern) Variable-size window: expand right, shrink left while invalid, track longest or shortest
- [M] (pattern) Window with counts: distinct characters, character replacement
- [I] (pattern) Exactly K via at most K: exactly(K) = atMost(K) − atMost(K − 1)
- [I] (pattern) Minimum window substring: need and have counters
- [A] Sliding window maximum: monotonic deque solution

#### Binary search
id: dsa.binary-search | prereqs: dsa.arrays
- [M] (pattern) Classic binary search: invariants, safe mid calculation, loop conditions
- [M] (pattern) Lower and upper bound: first and last occurrence, insert position
- [M] (pattern) Rotated sorted arrays: search, find minimum, the duplicates case
- [M] (pattern) Binary search on the answer: monotonic predicate, minimize the maximum or maximize the minimum
- [I] (pattern) Peak finding: binary search on slopes, 2D peak
- [I] Searching a 2D matrix: flattened index, staircase search
- [I] Binary search on real numbers: precision, fixed iteration count
- [A] Median of two sorted arrays: partition-based binary search
- [A] Kth smallest by counting: sorted matrix, pair distances

#### Sorting
id: dsa.sorting | prereqs: dsa.arrays, dsa.recursion
- [I] Elementary sorts: bubble, selection, insertion, and when insertion sort shines
- [M] Merge sort: divide and conquer, stability, O(n log n) time, extra space
- [M] Quick sort: Lomuto and Hoare partitions, pivot choice, randomization, worst case
- [I] Heap sort: in-place, not stable
- [I] Counting, radix and bucket sort: non-comparison sorts and when they apply
- [M] Stability and custom comparators: sorting by multiple keys, comparator rules
- [M] (pattern) Quickselect: kth element in average O(n)
- [I] (pattern) Merge-sort counting: inversions, reverse pairs, count of smaller numbers after self
- [I] Comparison sorting lower bound: why Ω(n log n)

#### Strings
id: dsa.strings | prereqs: dsa.arrays, dsa.hashing
- [M] String basics: immutability, building strings efficiently, character arithmetic, ASCII and Unicode basics
- [M] (pattern) Palindromes: two-pointer checks, expand around center
- [M] Anagrams and character counts: fixed-size count arrays
- [I] Parsing strings: tokenizing, atoi rules, signs and spaces
- [I] Classic string manipulation: reverse words, longest common prefix, isomorphic strings, Roman numerals
- [I] Big-number arithmetic on strings: add and multiply strings

#### String algorithms
id: dsa.string-algorithms | prereqs: dsa.strings
- [I] (pattern) KMP and the prefix function: longest proper prefix that is also a suffix, O(n + m) matching
- [I] (pattern) Rolling hash and Rabin-Karp: polynomial hashing, collisions, double hashing
- [A] Z-algorithm: the Z-array for pattern matching
- [A] Manacher's algorithm: longest palindromic substring in O(n)
- [A] Suffix arrays and LCP: what they are and what they solve

#### Recursion
id: dsa.recursion | prereqs: dsa.complexity
- [M] Recursion fundamentals: base case, recursive case, call stack, trusting the recursion
- [M] Recursion tree thinking: drawing the tree, counting calls
- [M] Divide and conquer: split, solve, combine; merge sort and fast power as examples
- [I] Recursion to iteration: explicit stacks, tail recursion
- [I] Memoization intro: caching repeated subproblems as the bridge to DP

#### Backtracking
id: dsa.backtracking | prereqs: dsa.recursion
- [M] (pattern) Subsets: include or exclude, iterative and bitmask versions
- [M] (pattern) Permutations: swapping vs used array, handling duplicates
- [M] (pattern) Combinations: start index, reuse vs no reuse, combination sum
- [M] Handling duplicates in backtracking: sort, then skip equal choices at the same level
- [M] (pattern) Grid backtracking: word search, marking visited and undoing
- [I] (pattern) Constraint satisfaction: N-Queens, Sudoku, pruning with sets or bitmasks
- [I] Partitioning problems: palindrome partitioning, restore IP addresses
- [I] Pruning strategies: bounds, choice ordering, early exit

#### Linked lists
id: dsa.linked-lists | prereqs: dsa.complexity
- [M] Linked list basics: singly vs doubly, insert, delete, traverse, dummy nodes
- [M] (pattern) Linked list reversal: iterative, recursive, sublist reversal, reverse in k-groups
- [M] (pattern) Fast and slow pointers on lists: middle node, cycle detection, cycle start with Floyd's algorithm
- [M] Merging lists: merge two sorted lists, merge k sorted lists with a heap
- [I] Removal patterns: nth node from the end, remove duplicates, remove by value
- [I] Tricky pointer problems: copy list with random pointer, intersection, reorder list, palindrome list
- [I] Doubly linked list with hash map: the LRU cache building block

#### Stacks and queues
id: dsa.stacks-queues | prereqs: dsa.arrays, dsa.linked-lists
- [M] Stack basics: LIFO, array and list implementations, real uses (undo, call stack)
- [M] Queue and deque basics: FIFO, circular buffer, deque operations
- [M] (pattern) Bracket matching: valid parentheses, longest valid parentheses
- [M] (pattern) Expression evaluation: postfix evaluation, infix with precedence, basic calculator
- [I] (pattern) Stack-based string processing: decode string, simplify path, adjacent duplicates, asteroid collision
- [I] Stack and queue designs: min stack, queue using stacks, stack using queues

#### Monotonic stack and deque
id: dsa.monotonic | prereqs: dsa.stacks-queues
- [M] (pattern) Monotonic stack: next and previous greater or smaller element
- [M] (pattern) Largest rectangle in histogram: monotonic stack areas, maximal rectangle
- [I] (pattern) Contribution technique: sum of subarray minimums, subarray ranges
- [I] (pattern) Monotonic deque: sliding window maximum, shortest subarray with sum at least K
- [I] Greedy stack: remove K digits, remove duplicate letters

#### Heaps and priority queues
id: dsa.heaps | prereqs: dsa.arrays
- [M] Binary heap: array representation, push and pop in O(log n), heapify in O(n)
- [M] (pattern) Top K elements: min-heap of size K, quickselect alternative
- [M] (pattern) K-way merge: merge k sorted lists, smallest range covering k lists
- [M] (pattern) Two heaps: running median
- [I] (pattern) Scheduling with heaps: task scheduler, meeting rooms, CPU simulation
- [I] Custom comparators and lazy deletion: stale entries, indexed heap idea

#### Intervals
id: dsa.intervals | prereqs: dsa.sorting
- [M] (pattern) Merge intervals: sort by start, merge overlaps
- [M] (pattern) Insert interval: before, overlapping, after
- [M] (pattern) Interval scheduling: non-overlapping intervals, minimum arrows, sorting by end
- [I] (pattern) Sweep line: counting overlaps with start and end events
- [I] Interval list intersections: two pointers over sorted lists
- [A] Calendar booking designs: ordered map and segment tree approaches

#### Greedy algorithms
id: dsa.greedy | prereqs: dsa.sorting
- [M] Greedy fundamentals: greedy choice property, optimal substructure, when greedy fails
- [M] Exchange argument: how to justify a greedy choice
- [M] (pattern) Reachability greedy: jump game I and II, gas station
- [I] (pattern) Greedy with sorting: assign cookies, boats, two city scheduling, partition labels
- [I] (pattern) Greedy with heaps: reorganize string, IPO, refueling stops
- [I] Classic greedy algorithms: activity selection, fractional knapsack, Huffman coding
- [A] Hard greedy problems: candy with two passes, patching array

#### Trees
id: dsa.trees | prereqs: dsa.recursion, dsa.stacks-queues
- [M] Tree terminology: root, leaf, depth, height, full, complete, perfect, balanced
- [M] (pattern) DFS traversals: preorder, inorder, postorder, recursive and iterative
- [M] (pattern) Level-order traversal: BFS by levels, zigzag, right side view, width
- [M] (pattern) Bottom-up tree recursion: height, diameter, balanced check, max path sum (return a value, update a global answer)
- [M] (pattern) Top-down tree recursion: passing state down, path sums, good nodes
- [M] Lowest common ancestor: in a binary tree and in a BST
- [I] Tree construction: from preorder and inorder, from postorder and inorder
- [I] Serialize and deserialize: preorder with null markers, level order
- [I] Views and vertical order: top, bottom, left, right views, vertical traversal with coordinates
- [I] Trees as graphs: nodes at distance K using parent pointers
- [A] Morris traversal: O(1) space inorder
- [A] Binary lifting: kth ancestor, LCA in O(log n)
- [A] Tree DP on subtrees: house robber III, binary tree cameras

#### Binary search trees
id: dsa.bst | prereqs: dsa.trees, dsa.binary-search
- [M] BST operations: search, insert, delete (three cases)
- [M] Validate a BST: range bounds, increasing inorder
- [M] (pattern) Inorder tricks: kth smallest, BST iterator, successor and predecessor
- [I] Building balanced BSTs: from a sorted array, from preorder
- [I] Self-balancing BSTs overview: AVL and red-black trees, why ordered maps are O(log n)
- [I] Floor and ceiling in a BST: the lower_bound analogue

#### Tries
id: dsa.tries | prereqs: dsa.trees, dsa.strings
- [M] Trie structure: insert, search, startsWith, memory trade-offs
- [I] (pattern) Trie with DFS: wildcard search, word search II
- [I] (pattern) Bitwise trie: maximum XOR of two numbers
- [I] Autocomplete with tries: ranking suggestions

#### Graphs: basics and traversal
id: dsa.graph-basics | prereqs: dsa.recursion, dsa.stacks-queues
- [M] Graph representations: adjacency list vs matrix vs edge list, directed and undirected, weighted
- [M] (pattern) BFS: shortest path in unweighted graphs, levels
- [M] (pattern) DFS: recursive and iterative, discovery and finish order
- [M] (pattern) Grids as graphs: 4 and 8 directions, bounds checks, flood fill, islands
- [M] Connected components: counting components with DFS or BFS
- [M] (pattern) Multi-source BFS: rotting oranges, distance to nearest
- [M] Cycle detection in undirected graphs: DFS with parent, DSU
- [M] Cycle detection in directed graphs: DFS with three colors
- [M] (pattern) Topological sort: Kahn's algorithm and DFS finish order, course schedule
- [I] (pattern) Bipartite check: two-coloring with BFS or DFS
- [I] (pattern) BFS on state spaces: word ladder, open the lock, implicit graphs
- [I] Cloning graphs: clone graph with a hash map

#### Shortest paths
id: dsa.shortest-paths | prereqs: dsa.graph-basics, dsa.heaps
- [M] (pattern) Dijkstra's algorithm: min-heap, non-negative weights, O((V + E) log V)
- [I] (pattern) 0-1 BFS: deque for edge weights 0 and 1
- [I] Bellman-Ford: negative edges, negative cycle detection, the k-stops variant
- [I] Floyd-Warshall: all-pairs shortest paths in O(V^3)
- [I] Shortest paths in a DAG: relax edges in topological order
- [I] Dijkstra variants: minimize the maximum edge, maximize probability, count shortest paths
- [A] A* search: heuristics, admissibility

#### MST and disjoint set union
id: dsa.mst-dsu | prereqs: dsa.graph-basics, dsa.sorting
- [M] Disjoint set union: union by rank or size, path compression, near O(1) operations
- [M] (pattern) DSU applications: connectivity, redundant connection, accounts merge, grouping
- [M] Kruskal's algorithm: sort edges, union with DSU
- [I] Prim's algorithm: growing the tree with a heap
- [A] DSU with extra data: component sizes, parity for bipartiteness

#### Advanced graphs
id: dsa.advanced-graphs | prereqs: dsa.graph-basics, dsa.shortest-paths
- [A] Bridges and articulation points: Tarjan's low-link values
- [A] Strongly connected components: Kosaraju and Tarjan
- [A] Eulerian paths: Hierholzer's algorithm, reconstruct itinerary
- [A] Maximum flow basics: Ford-Fulkerson, Edmonds-Karp, the min-cut idea
- [A] Bipartite matching: augmenting paths
- [A] Shortest path with bitmask state: visiting all nodes

#### Dynamic programming: foundations
id: dsa.dp-foundations | prereqs: dsa.recursion
- [M] What DP is: overlapping subproblems and optimal substructure
- [M] Memoization vs tabulation: top-down vs bottom-up and when each is easier
- [M] Designing DP states: what information defines a subproblem
- [M] Transitions and base cases: writing the recurrence, order of computation
- [M] Space optimization: rolling arrays, keeping only the previous row
- [I] Reconstructing the answer: storing choices and walking back through the table
- [I] Counting DP and modulo: number of ways mod 1e9+7

#### Dynamic programming: 1D
id: dsa.dp-1d | prereqs: dsa.dp-foundations
- [M] (pattern) Linear DP: climbing stairs, min cost climbing stairs
- [M] (pattern) Take or skip DP: house robber I and II
- [M] (pattern) Decoding and segmentation DP: decode ways, word break
- [I] Tracking max and min together: maximum product subarray
- [I] DP on numbers: perfect squares, integer break

#### Dynamic programming: grids
id: dsa.dp-grid | prereqs: dsa.dp-foundations
- [M] (pattern) Grid path DP: unique paths with and without obstacles, minimum path sum
- [I] Triangle and falling paths: top-down vs bottom-up
- [I] (pattern) Square submatrices: maximal square, count square submatrices
- [A] Hard grid DP: cherry pickup, dungeon game with reverse DP

#### Dynamic programming: knapsack family
id: dsa.dp-knapsack | prereqs: dsa.dp-foundations
- [M] (pattern) 0/1 knapsack: include or exclude, 1D optimization with a reverse loop
- [M] (pattern) Subset sum and partition: partition equal subset sum, target sum
- [M] (pattern) Unbounded knapsack: coin change for minimum coins, forward loop
- [M] Combinations vs permutations counting: coin change II vs combination sum IV loop order
- [I] Multi-dimensional knapsack: ones and zeroes

#### Dynamic programming: subsequences and stocks
id: dsa.dp-subsequences | prereqs: dsa.dp-foundations, dsa.binary-search
- [M] (pattern) Longest increasing subsequence: O(n^2) DP and O(n log n) with patience sorting
- [I] LIS variants: number of LIS, largest divisible subset, longest string chain, Russian doll envelopes
- [I] (pattern) Stock trading state machine: buy and sell I to IV, cooldown, transaction fee

#### Dynamic programming: strings
id: dsa.dp-strings | prereqs: dsa.dp-foundations, dsa.strings
- [M] (pattern) Longest common subsequence: the 2D table and reconstruction
- [M] (pattern) Edit distance: insert, delete, replace transitions
- [I] Palindromic DP: longest palindromic subsequence, minimum insertions, counting palindromic substrings
- [I] Counting subsequences: distinct subsequences
- [I] Interleaving strings: 2D DP over two prefixes
- [A] Pattern matching DP: regular expression and wildcard matching

#### Dynamic programming: intervals and games
id: dsa.dp-intervals | prereqs: dsa.dp-foundations
- [I] (pattern) Interval DP: dp over ranges, iterating by length
- [I] Matrix chain multiplication: the classic interval DP
- [A] Choosing the last action: burst balloons, minimum cost to cut a stick
- [A] Minimum palindrome cuts: palindrome partitioning II
- [A] Game DP: stone game, minimax over ranges

#### Dynamic programming: advanced
id: dsa.dp-advanced | prereqs: dsa.dp-foundations, dsa.bits, dsa.trees
- [I] (pattern) DP on trees: returning several values per node
- [I] (pattern) Bitmask DP: subsets as states, travelling salesman style, partition into k subsets
- [A] Digit DP: counting numbers with digit constraints
- [A] DP with binary search: weighted job scheduling
- [A] DP optimization overview: monotonic queue optimization, prefix sums inside transitions

#### Bit manipulation
id: dsa.bits | prereqs: dsa.complexity
- [M] Bitwise operators: AND, OR, XOR, NOT, shifts, two's complement
- [M] Single-bit tricks: check, set, clear, toggle, lowest set bit, clearing the lowest set bit
- [M] (pattern) XOR tricks: single number, missing number, swapping without a temporary
- [I] Counting set bits: popcount, Brian Kernighan's method, DP counting bits
- [I] (pattern) Bitmask enumeration: iterating subsets and submasks
- [I] Arithmetic with bits: add without plus, divide two integers, power of two checks
- [A] Meet in the middle: splitting subsets of size up to 40

#### Math for coding interviews
id: dsa.math | prereqs: dsa.complexity
- [M] GCD and LCM: Euclid's algorithm and its complexity
- [M] Primes: trial division, Sieve of Eratosthenes, prime factorization
- [M] Modular arithmetic: sums and products mod m, negative mod, 1e9+7
- [M] Fast exponentiation: binary exponentiation in O(log n)
- [I] Modular inverse and nCr mod p: Fermat's little theorem, factorial precomputation
- [I] Combinatorics in code: nCr with Pascal's triangle, Catalan numbers
- [I] (pattern) Randomized algorithms: reservoir sampling, Fisher-Yates shuffle, weighted random pick, rand7 to rand10
- [A] Geometry basics: cross product, orientation, points on a line, convex hull idea
- [A] Number theory extras: Euler's totient, extended Euclid

#### Range query structures
id: dsa.range-queries | prereqs: dsa.prefix-sums, dsa.trees
- [I] Segment tree: build, point update, range query
- [A] Lazy propagation: range updates on segment trees
- [I] Fenwick tree: prefix sums with updates, counting inversions
- [A] Sparse table: O(1) range minimum on static arrays
- [A] Coordinate compression: mapping large values to ranks

#### Designing data structures
id: dsa.design-ds | prereqs: dsa.hashing, dsa.linked-lists, dsa.heaps
- [M] LRU cache: hash map plus doubly linked list, O(1) get and put
- [I] LFU cache: frequency buckets
- [I] Insert, delete and getRandom in O(1): array plus index map
- [I] Augmented stacks: min stack, maximum frequency stack
- [I] Time-based key-value store: sorted timestamps per key with binary search
- [I] Iterator design: peeking iterator, flatten nested list iterator
- [I] Circular queue and deque design: fixed-size ring buffer
- [A] Versioned data: snapshot array with per-index history
- [A] All O(1) data structure: count buckets in a doubly linked list

#### Problem-solving method
id: dsa.problem-solving | prereqs: none
- [M] Reading the problem: inputs, outputs, constraints, clarifying questions
- [M] From brute force to optimal: state the brute force, find the bottleneck, apply a pattern
- [M] Pattern recognition: mapping problem signals to techniques
- [M] Dry running and testing: tracing small cases by hand, testing edge cases
- [M] Edge case checklist: empty, single element, duplicates, negatives, overflow, sorted, reversed, all equal
- [M] Communicating in interviews: thinking aloud, stating complexity, trade-offs, confirming before coding
- [I] Time management in interviews and OAs: when to move on, partial credit
- [I] Debugging under pressure: isolating the failing case, print debugging

---

### 3. Object-oriented programming and design principles
id: oop | tracks: sde, quant | icon: boxes

#### OOP foundations
id: oop.foundations | prereqs: none
- [M] Classes and objects: state and behavior, instances, `this`
- [M] Constructors and destructors: default, parameterized, copy constructors, initialization order
- [M] Access modifiers: public, private, protected, package-private in Java
- [M] Static members: class-level vs instance-level data and methods
- [I] Object lifecycle: creation, copying, destruction, garbage collection vs manual cleanup

#### The four pillars
id: oop.pillars | prereqs: oop.foundations
- [M] Encapsulation: hiding state, getters and setters, invariants
- [M] Abstraction: exposing what, hiding how; abstract classes and interfaces
- [M] Inheritance: single, multilevel, hierarchical, multiple; is-a relationships
- [M] Polymorphism: compile-time (overloading, templates) vs runtime (overriding, virtual dispatch)
- [M] Abstract class vs interface: differences, when to use each, default methods
- [I] The diamond problem: multiple inheritance ambiguity, virtual inheritance in C++, interfaces in Java
- [I] Method overloading vs overriding: rules, return types, covariant returns

#### Relationships and modeling
id: oop.relationships | prereqs: oop.pillars
- [M] Association, aggregation and composition: has-a relationships and lifetime ownership
- [M] Composition over inheritance: flexibility, fragile base class problem
- [I] UML class diagrams: classes, attributes, methods, arrows for each relationship
- [I] Coupling and cohesion: what good module boundaries look like

#### Copying, equality and language specifics
id: oop.language-specifics | prereqs: oop.pillars
- [M] Shallow vs deep copy: copy constructors, clone, copy assignment
- [I] Rule of three and five in C++: when you write one special member, write the others
- [I] equals and hashCode in Java: the contract and what breaks when violated
- [I] Immutability: immutable objects, benefits for thread safety
- [I] Operator overloading and friend functions: C++ specifics
- [I] Virtual destructors: why base classes need them

#### Design principles
id: oop.principles | prereqs: oop.relationships
- [M] Single responsibility principle: one reason to change
- [M] Open/closed principle: extend without modifying
- [M] Liskov substitution principle: subtypes must honor base contracts
- [M] Interface segregation principle: small, focused interfaces
- [M] Dependency inversion principle: depend on abstractions, dependency injection
- [I] DRY, KISS and YAGNI: practical simplicity rules
- [I] Law of Demeter: talk only to close friends

#### Creational design patterns
id: oop.patterns-creational | prereqs: oop.principles
- [M] Singleton: one instance, lazy vs eager, thread-safe variants, why it is often criticized
- [M] Factory method: delegating object creation to subclasses or a factory
- [I] Abstract factory: families of related objects
- [M] Builder: step-by-step construction of complex objects
- [I] Prototype: cloning existing objects

#### Structural design patterns
id: oop.patterns-structural | prereqs: oop.principles
- [M] Adapter: making incompatible interfaces work together
- [M] Decorator: adding behavior by wrapping
- [I] Facade: a simple front for a complex subsystem
- [I] Proxy: controlling access (lazy loading, caching, protection)
- [I] Composite: tree structures of objects treated uniformly
- [A] Bridge: separating abstraction from implementation
- [A] Flyweight: sharing state to save memory

#### Behavioral design patterns
id: oop.patterns-behavioral | prereqs: oop.principles
- [M] Strategy: swappable algorithms behind one interface
- [M] Observer: publish and subscribe to changes
- [I] Command: requests as objects, undo and redo
- [I] State: behavior changes with internal state
- [I] Template method: fixed skeleton, customizable steps
- [I] Iterator: sequential access without exposing internals
- [I] Chain of responsibility: passing a request along handlers
- [A] Mediator: central coordination between objects
- [A] Visitor: adding operations without changing classes

#### Error handling design
id: oop.errors | prereqs: oop.foundations
- [I] Exceptions vs error codes: trade-offs, exception safety guarantees
- [I] Designing custom exceptions: hierarchy, meaningful messages
- [A] Defensive programming: validation, assertions, fail fast

---

### 4. Low-level design (machine coding)
id: lld | tracks: sde | icon: layout-grid

#### LLD method
id: lld.method | prereqs: oop.principles
- [M] Clarifying requirements: functional vs non-functional, scope for a 45 to 90 minute round
- [M] Identifying entities: nouns to classes, verbs to methods
- [M] Defining relationships and class diagrams: associations, composition, interfaces
- [M] Designing APIs and methods: signatures, responsibilities, validation
- [M] Applying design patterns: where strategy, factory, observer and state fit
- [I] Handling concurrency in LLD: locks around shared state, thread-safe booking
- [I] Extensibility and testing: adding features without rewrites, unit-testable design
- [I] Machine coding round strategy: working code first, clean structure, demo flow

#### Classic LLD problems
id: lld.classics | prereqs: lld.method
- [M] Parking lot: spots, vehicles, tickets, pricing strategies
- [M] Elevator system: requests, scheduling strategy, states
- [M] Movie ticket booking: shows, seats, seat locking, payments
- [M] Splitwise: expenses, split types, balances, simplifying debts
- [I] Snake and ladder: board, dice, players, game loop
- [I] Tic-tac-toe and chess: board modeling, move validation, win detection
- [M] LRU cache as a class design: interfaces, eviction policy strategy
- [M] Rate limiter: token bucket, sliding window, per-user limits
- [I] Logger framework: levels, sinks, chain of responsibility
- [I] Vending machine: state pattern
- [I] ATM: states, cash dispenser, transactions
- [I] Library management: books, members, loans, fines
- [I] Hotel booking: rooms, availability, reservations
- [I] Ride sharing: riders, drivers, matching, trip states
- [I] Food delivery: restaurants, orders, delivery assignment
- [I] Notification service: channels, templates, retries
- [I] Pub-sub message queue: topics, subscribers, offsets
- [I] In-memory key-value store: get, set, delete, TTL, transactions
- [A] File system: directories, files, paths, permissions
- [A] Online shopping cart and inventory: cart, stock reservation, checkout
- [A] Meeting room scheduler: bookings, conflicts, recurring meetings
- [A] Task scheduler: delayed and recurring jobs
- [A] Stack Overflow: questions, answers, votes, reputation
- [A] Car rental and Amazon locker: reservations and slot assignment

---

### 5. Operating systems
id: os | tracks: sde, quant | icon: cpu

#### OS fundamentals
id: os.fundamentals | prereqs: none
- [M] What an OS does: resource manager, abstraction, protection
- [M] Kernel mode vs user mode: privilege levels, why the split exists
- [M] System calls: how programs ask the kernel for services, examples
- [I] Kernel architectures: monolithic, microkernel, hybrid
- [I] Interrupts, traps and exceptions: hardware vs software interrupts
- [A] The boot process: firmware, bootloader, kernel initialization

#### Processes
id: os.processes | prereqs: os.fundamentals
- [M] Process vs program: address space layout (text, data, heap, stack)
- [M] Process control block and states: new, ready, running, waiting, terminated
- [M] Context switching: what is saved, why it is expensive
- [M] fork, exec and wait: creating processes in Unix, copy-on-write
- [I] Zombie and orphan processes: causes and cleanup
- [M] Inter-process communication: pipes, shared memory, message queues, sockets, signals

#### Threads
id: os.threads | prereqs: os.processes
- [M] Threads vs processes: what threads share and what they don't
- [I] User-level vs kernel-level threads: many-to-one, one-to-one, many-to-many
- [I] Benefits and costs of multithreading: responsiveness, overhead, complexity

#### CPU scheduling
id: os.scheduling | prereqs: os.processes
- [M] Scheduling criteria: throughput, turnaround, waiting and response time, CPU utilization
- [M] FCFS and SJF: convoy effect, optimality of SJF, SRTF
- [M] Priority scheduling: starvation and aging
- [M] Round robin: time quantum trade-offs
- [I] Multilevel queue and feedback queue scheduling
- [M] Solving scheduling numericals: Gantt charts, average waiting and turnaround time
- [A] Linux CFS: fair scheduling with virtual runtime

#### Synchronization
id: os.sync | prereqs: os.threads
- [M] Race conditions and critical sections: requirements (mutual exclusion, progress, bounded waiting)
- [I] Peterson's solution: two-process software solution
- [M] Mutex locks: acquire and release, busy waiting vs blocking
- [M] Semaphores: binary vs counting, wait and signal
- [I] Monitors and condition variables: higher-level synchronization
- [I] Hardware support: test-and-set, compare-and-swap, spinlocks
- [M] Producer-consumer problem: bounded buffer with semaphores
- [I] Readers-writers problem: reader or writer preference
- [I] Dining philosophers: deadlock and starvation-free solutions
- [I] Priority inversion: cause and priority inheritance

#### Deadlocks
id: os.deadlocks | prereqs: os.sync
- [M] Deadlock conditions: mutual exclusion, hold and wait, no preemption, circular wait
- [M] Resource allocation graphs: cycles and deadlock
- [M] Deadlock prevention: breaking each condition
- [M] Deadlock avoidance: safe states, Banker's algorithm
- [I] Deadlock detection and recovery: wait-for graphs, killing or rolling back
- [I] Livelock and starvation: how they differ from deadlock

#### Memory management
id: os.memory | prereqs: os.processes
- [M] Logical vs physical addresses: MMU and address binding
- [I] Contiguous allocation: first fit, best fit, worst fit
- [M] Fragmentation: internal vs external, compaction
- [M] Paging: pages, frames, page tables, address translation
- [M] TLB: caching translations, hit ratio, effective access time
- [I] Multi-level and inverted page tables: reducing page table size
- [I] Segmentation: segments vs pages, segmentation with paging
- [M] Virtual memory and demand paging: page faults and how they are handled
- [M] Page replacement: FIFO, LRU, Optimal, Clock; Belady's anomaly
- [M] Thrashing and working sets: causes and cures
- [I] Copy-on-write and memory-mapped files
- [I] Stack vs heap memory: allocation, lifetime, fragmentation
- [A] How malloc works: free lists, bins, brk and mmap

#### Storage and file systems
id: os.storage | prereqs: os.memory
- [I] File concepts: files, directories, metadata, permissions
- [I] File allocation methods: contiguous, linked, indexed (inodes)
- [I] Free space management: bitmaps, free lists
- [I] Disk scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK
- [I] RAID levels: 0, 1, 5, 10 trade-offs
- [A] Journaling file systems: crash consistency

#### I/O and system internals
id: os.io | prereqs: os.processes
- [I] I/O methods: polling, interrupts, DMA
- [I] Buffering, caching and spooling
- [I] Blocking vs non-blocking I/O
- [A] I/O multiplexing: select, poll, epoll
- [A] Linux essentials for interviews: /proc, signals, process commands

#### Virtualization and containers
id: os.virtualization | prereqs: os.processes
- [I] Virtual machines and hypervisors: type 1 vs type 2
- [I] Containers vs VMs: shared kernel, isolation trade-offs
- [A] Namespaces and cgroups: how containers isolate processes

---

### 6. Concurrency and multithreading
id: conc | tracks: sde, quant | icon: git-merge

#### Concurrency basics
id: conc.basics | prereqs: os.threads
- [M] Concurrency vs parallelism: interleaving vs simultaneous execution
- [M] Creating threads: std::thread, Java threads and executors, Python threading
- [M] Data races vs race conditions: the difference and examples
- [M] Thread safety: what makes code thread-safe, immutability, confinement

#### Locks and coordination
id: conc.locks | prereqs: conc.basics, os.sync
- [M] Mutexes and lock guards: RAII locks, scoped locking
- [M] Avoiding deadlocks in code: lock ordering, try-lock, timeouts
- [M] Condition variables: wait and notify, spurious wakeups, predicates
- [I] Read-write locks: many readers, one writer
- [I] Semaphores, latches and barriers: coordination primitives
- [I] Thread-safe singleton: double-checked locking, static local initialization

#### Atomics and lock-free programming
id: conc.atomics | prereqs: conc.locks
- [I] Atomic operations: atomic counters, compare-and-swap
- [A] Memory ordering: relaxed, acquire, release, sequentially consistent
- [A] Lock-free data structures: lock-free queue idea, the ABA problem
- [A] (quant) False sharing and cache-line padding: why it slows multithreaded code

#### Concurrency patterns
id: conc.patterns | prereqs: conc.locks
- [M] Producer-consumer in code: bounded blocking queue
- [M] Thread pools: task queues, sizing, work stealing idea
- [I] Futures, promises and async: getting results from other threads
- [I] Concurrent collections: concurrent hash maps and queues, internals overview
- [I] Classic coding exercises: print in order, odd-even printing, FizzBuzz with threads, building H2O
- [A] Event loops and coroutines: async I/O model

---

### 7. Computer architecture and performance
id: arch | tracks: quant, sde | icon: microchip

#### Data representation
id: arch.representation | prereqs: none
- [M] Binary, hex and two's complement: signed integer representation
- [M] Floating point (IEEE 754): sign, exponent, mantissa, why 0.1 + 0.2 is not 0.3
- [I] Endianness: big-endian vs little-endian
- [I] Character encodings: ASCII, UTF-8

#### CPU and memory hierarchy
id: arch.cpu-memory | prereqs: arch.representation
- [I] How a CPU executes instructions: fetch, decode, execute, registers
- [I] Pipelining and hazards: data, control and structural hazards
- [I] Branch prediction: why unpredictable branches are slow
- [M] Memory hierarchy: registers, L1, L2, L3, RAM, disk, and their latencies
- [M] Cache lines and locality: spatial and temporal locality, row-major traversal
- [I] Cache associativity and misses: compulsory, capacity, conflict misses
- [A] Out-of-order and superscalar execution

#### Performance engineering
id: arch.performance | prereqs: arch.cpu-memory
- [I] Latency numbers every programmer should know: orders of magnitude
- [I] (quant) Data-oriented design: struct of arrays vs array of structs
- [A] (quant) SIMD basics: vectorized operations
- [A] (quant) NUMA: memory locality on multi-socket machines
- [I] Profiling: finding hot spots, perf and sampling profilers
- [A] Compiler optimizations: inlining, loop unrolling, what -O2 does
- [I] Cost of system calls and context switches
- [A] (quant) Low-latency techniques: avoiding allocation on hot paths, busy polling, kernel bypass idea

---

### 8. Computer networks
id: cn | tracks: sde | icon: network

#### Network fundamentals
id: cn.fundamentals | prereqs: none
- [M] What a network is: nodes, links, LAN, WAN, the internet
- [M] OSI model: the seven layers and what each is responsible for
- [M] TCP/IP model: four layers and how they map to OSI
- [M] Encapsulation: headers at each layer, PDUs (frame, packet, segment)
- [M] Bandwidth, latency and throughput: definitions and the difference
- [I] Network topologies: bus, star, ring, mesh
- [I] Circuit switching vs packet switching

#### Data link layer
id: cn.data-link | prereqs: cn.fundamentals
- [I] Framing and error detection: parity, checksums, CRC
- [M] MAC addresses and Ethernet: frames, broadcast
- [M] Hubs, switches and routers: which layer each works at and why
- [M] ARP: mapping IP addresses to MAC addresses
- [I] Flow control protocols: stop-and-wait, Go-Back-N, Selective Repeat
- [A] CSMA/CD and CSMA/CA: medium access control
- [A] VLANs: logical network separation

#### Network layer
id: cn.network | prereqs: cn.data-link
- [M] IPv4 addressing: address classes (history), public vs private addresses
- [M] Subnetting and CIDR: subnet masks, calculating network, broadcast and host ranges
- [M] NAT: sharing one public IP, port translation
- [I] IPv6: why it exists, address format
- [M] ICMP: ping and traceroute
- [M] DHCP: how a device gets an IP address
- [I] Routing basics: routing tables, static vs dynamic routing
- [I] Distance vector vs link state: RIP vs OSPF
- [A] BGP overview: routing between networks on the internet
- [A] IP fragmentation and MTU

#### Transport layer
id: cn.transport | prereqs: cn.network
- [M] Ports and sockets: identifying processes, well-known ports
- [M] TCP vs UDP: reliability, ordering, overhead, use cases
- [M] TCP three-way handshake and four-way teardown: SYN, SYN-ACK, ACK, FIN
- [I] TCP states: TIME_WAIT and why it exists
- [M] TCP reliability: sequence numbers, acknowledgements, retransmission
- [M] TCP flow control: receiver window, sliding window
- [M] TCP congestion control: slow start, congestion avoidance, AIMD, fast retransmit
- [I] Head-of-line blocking: in TCP and HTTP
- [A] Nagle's algorithm and delayed ACKs
- [A] QUIC: transport over UDP for HTTP/3

#### Application layer
id: cn.application | prereqs: cn.transport
- [M] DNS: resolution steps, recursive vs iterative, record types, caching and TTL
- [M] HTTP basics: methods, status codes, headers, statelessness
- [M] Cookies and sessions: keeping state over stateless HTTP
- [M] HTTP/1.1 vs HTTP/2 vs HTTP/3: keep-alive, multiplexing, QUIC
- [M] HTTPS and TLS: TLS handshake, certificates, encryption in transit
- [M] REST principles: resources, verbs, idempotency, statelessness
- [I] WebSockets: full-duplex connections
- [I] Email protocols: SMTP, POP3, IMAP
- [I] FTP and SSH: file transfer and secure shell
- [M] What happens when you type a URL: DNS, TCP, TLS, HTTP, rendering, end to end

#### Network security
id: cn.security | prereqs: cn.application
- [M] Symmetric vs asymmetric encryption: keys, speed, where each is used
- [M] Hashing and digital signatures: integrity and authenticity
- [I] Certificates and certificate authorities: chain of trust
- [M] Common attacks: man-in-the-middle, DDoS, XSS, CSRF, SQL injection
- [I] Firewalls, VPNs and proxies
- [I] CORS: same-origin policy and how browsers relax it
- [I] OAuth and JWT basics: delegated authorization, tokens

#### Network infrastructure
id: cn.infrastructure | prereqs: cn.application
- [M] Proxy vs reverse proxy: forward proxies, reverse proxies, gateways
- [M] Load balancers: L4 vs L7, algorithms
- [M] CDNs: caching content near users
- [A] Socket programming basics: bind, listen, accept, connect

---

### 9. Database management systems
id: dbms | tracks: sde | icon: database

#### DBMS fundamentals
id: dbms.fundamentals | prereqs: none
- [M] DBMS vs file systems: why databases exist
- [I] Data models: relational, document, key-value, graph
- [I] Schema vs instance, three-schema architecture, data independence
- [I] Database users and languages: DDL, DML, DCL, TCL

#### ER modeling
id: dbms.er | prereqs: dbms.fundamentals
- [M] Entities, attributes and relationships: attribute types (composite, multivalued, derived)
- [M] Cardinality and participation: one-to-one, one-to-many, many-to-many, total vs partial
- [I] Weak entities: identifying relationships
- [M] ER to relational mapping: turning diagrams into tables

#### Relational model
id: dbms.relational | prereqs: dbms.er
- [M] Keys: super, candidate, primary, alternate, foreign, composite
- [M] Integrity constraints: entity integrity, referential integrity, domain constraints
- [I] Relational algebra: select, project, union, difference, product, joins, division
- [A] Relational calculus: tuple and domain calculus

#### Normalization
id: dbms.normalization | prereqs: dbms.relational
- [M] Anomalies: insertion, update and deletion anomalies
- [M] Functional dependencies: closure, Armstrong's axioms
- [M] Normal forms: 1NF, 2NF, 3NF, BCNF with examples
- [I] Decomposition: lossless join and dependency preservation
- [A] Minimal cover and higher normal forms: 4NF, 5NF
- [I] Denormalization: when and why to break the rules

#### Transactions
id: dbms.transactions | prereqs: dbms.relational
- [M] ACID properties: atomicity, consistency, isolation, durability with examples
- [I] Transaction states: active, partially committed, committed, failed, aborted
- [M] Schedules and serializability: conflict serializability, precedence graphs
- [I] View serializability
- [I] Recoverable schedules: cascading rollbacks, cascadeless and strict schedules

#### Concurrency control
id: dbms.concurrency | prereqs: dbms.transactions
- [M] Lock-based protocols: shared and exclusive locks, two-phase locking, strict 2PL
- [M] Isolation levels: read uncommitted, read committed, repeatable read, serializable
- [M] Read anomalies: dirty read, non-repeatable read, phantom read, lost update
- [I] Deadlocks in databases: detection and prevention
- [I] Timestamp ordering protocols
- [M] MVCC: multi-version concurrency control
- [I] Optimistic vs pessimistic concurrency
- [A] Write skew and snapshot isolation

#### Recovery
id: dbms.recovery | prereqs: dbms.transactions
- [I] Logs and write-ahead logging: undo and redo
- [I] Checkpoints: speeding up recovery
- [A] Shadow paging and ARIES overview

#### Indexing and storage
id: dbms.indexing | prereqs: dbms.relational
- [M] Why indexes: trading write cost and space for read speed
- [M] Clustered vs non-clustered indexes: primary and secondary indexes
- [I] Dense vs sparse indexes
- [M] B-trees and B+ trees: structure, why databases use B+ trees
- [I] Hash indexes: equality lookups only
- [M] Composite and covering indexes: leftmost prefix rule, index-only scans
- [I] When indexes hurt: writes, low selectivity, functions on columns
- [I] Query plans: reading EXPLAIN output
- [A] Join algorithms: nested loop, hash join, sort-merge join
- [A] LSM trees: write-optimized storage (links to NoSQL)

#### NoSQL and distributed databases
id: dbms.nosql | prereqs: dbms.indexing
- [M] NoSQL types: key-value, document, wide-column, graph, and when to use each
- [M] SQL vs NoSQL: schema, scaling, consistency trade-offs
- [M] CAP theorem: consistency, availability, partition tolerance
- [I] BASE vs ACID: eventual consistency
- [M] Replication: leader-follower, multi-leader, leaderless
- [M] Sharding and partitioning: range vs hash partitioning, hot spots
- [I] Consistent hashing: rebalancing with minimal movement
- [A] Distributed transactions: two-phase commit, sagas

#### Practical database features
id: dbms.practical | prereqs: dbms.relational
- [I] Views and materialized views
- [I] Stored procedures, functions and triggers
- [A] Cursors
- [I] Connection pooling: why opening connections is expensive

---

### 10. SQL
id: sql | tracks: sde | icon: table

#### SQL basics
id: sql.basics | prereqs: dbms.relational
- [M] SELECT, WHERE and ORDER BY: filtering and sorting
- [M] DISTINCT, LIMIT and OFFSET: deduplication and pagination
- [M] NULL handling: IS NULL, COALESCE, NULL in comparisons and aggregates
- [M] CASE WHEN: conditional logic in queries
- [I] String and date functions: CONCAT, SUBSTRING, date arithmetic, formatting

#### Aggregation
id: sql.aggregation | prereqs: sql.basics
- [M] Aggregate functions: COUNT, SUM, AVG, MIN, MAX, COUNT(*) vs COUNT(col)
- [M] GROUP BY and HAVING: grouping and filtering groups, WHERE vs HAVING

#### Joins
id: sql.joins | prereqs: sql.basics
- [M] Inner join: matching rows
- [M] Left, right and full outer joins: keeping unmatched rows
- [M] Self join: comparing rows in the same table
- [I] Cross join: Cartesian products
- [M] Anti-joins and semi-joins: finding rows without matches (LEFT JOIN … IS NULL, NOT EXISTS)

#### Subqueries and set operations
id: sql.subqueries | prereqs: sql.joins, sql.aggregation
- [M] Subqueries: scalar, IN, EXISTS
- [M] Correlated subqueries: per-row subqueries and their cost
- [I] Set operations: UNION vs UNION ALL, INTERSECT, EXCEPT
- [M] CTEs: WITH clauses for readable queries
- [I] Recursive CTEs: hierarchies and sequences

#### Window functions
id: sql.window | prereqs: sql.aggregation
- [M] ROW_NUMBER, RANK and DENSE_RANK: ranking and ties
- [M] PARTITION BY: per-group windows
- [M] LAG and LEAD: comparing with previous and next rows
- [I] Running totals and moving averages: window frames
- [I] NTILE, FIRST_VALUE and LAST_VALUE

#### Data definition and modification
id: sql.ddl-dml | prereqs: sql.basics
- [I] CREATE and ALTER TABLE: data types and constraints
- [I] INSERT, UPDATE and DELETE: safe modification, DELETE with joins
- [I] Transactions in SQL: BEGIN, COMMIT, ROLLBACK
- [I] Creating indexes in practice: CREATE INDEX and when to add one

#### Classic SQL interview queries
id: sql.classics | prereqs: sql.window, sql.subqueries
- [M] Nth highest salary: DENSE_RANK, LIMIT OFFSET, subquery approaches
- [M] Top N per group: window functions with PARTITION BY
- [M] Finding duplicates: GROUP BY with HAVING COUNT > 1
- [M] Employees earning more than their managers: self join
- [I] Consecutive records and streaks: gaps and islands technique
- [I] Pivoting rows to columns: conditional aggregation
- [I] Running and cumulative metrics: retention and growth queries
- [A] Median and percentiles in SQL

---

### 11. System design (high-level)
id: sysd | tracks: sde | icon: server

#### System design method
id: sysd.method | prereqs: none
- [M] The interview framework: requirements, estimates, API, data model, high-level design, deep dives, bottlenecks
- [M] Functional vs non-functional requirements: scale, latency, availability, consistency
- [M] Back-of-the-envelope estimation: QPS, storage, bandwidth, powers of two
- [M] API design: REST endpoints, pagination, versioning, idempotency keys
- [I] Discussing trade-offs: there is no single right answer

#### Scalability foundations
id: sysd.scalability | prereqs: sysd.method
- [M] Vertical vs horizontal scaling
- [M] Stateless services: why state should live outside app servers
- [M] Load balancing: algorithms (round robin, least connections, consistent hashing), health checks
- [I] Autoscaling: scaling on metrics
- [M] Latency vs throughput trade-offs

#### Caching
id: sysd.caching | prereqs: sysd.scalability
- [M] Where to cache: client, CDN, application, database
- [M] Caching strategies: cache-aside, read-through, write-through, write-back, write-around
- [M] Eviction policies: LRU, LFU, TTL
- [M] Cache invalidation and consistency: stale data, versioning
- [I] Cache stampede and hot keys: request coalescing, jitter
- [I] Redis and Memcached: data structures, persistence, use cases

#### Data storage in design
id: sysd.data | prereqs: sysd.scalability
- [M] Choosing SQL vs NoSQL in design: access patterns decide
- [M] Replication in practice: read replicas, replication lag
- [M] Sharding strategies: key choice, resharding, hot partitions
- [M] Consistent hashing in design: virtual nodes
- [I] Object storage and blobs: S3-style storage, CDN in front
- [I] Search systems: inverted indexes, Elasticsearch basics
- [I] Time-series and analytics stores
- [A] Data pipelines: batch vs stream processing, MapReduce idea

#### Consistency and distributed systems
id: sysd.distributed | prereqs: sysd.data
- [M] CAP theorem in practice: choosing CP or AP per feature
- [I] PACELC: latency vs consistency when there is no partition
- [M] Consistency models: strong, eventual, causal, read-your-writes
- [I] Quorums: R + W > N
- [I] Consensus basics: leader election, Raft idea
- [I] Distributed locks and leases
- [A] Clocks and ordering: logical clocks, vector clocks
- [A] Distributed transactions in practice: sagas, outbox pattern

#### Communication and messaging
id: sysd.messaging | prereqs: sysd.scalability
- [M] Synchronous vs asynchronous communication
- [M] Message queues: decoupling, buffering, retries (Kafka, RabbitMQ)
- [M] Publish-subscribe and event-driven architecture
- [I] REST vs gRPC vs GraphQL
- [M] Idempotency and exactly-once myths: at-least-once delivery, idempotent consumers
- [M] Retries, timeouts and exponential backoff with jitter
- [I] Dead-letter queues and poison messages
- [I] Real-time delivery: polling, long polling, server-sent events, WebSockets

#### Reliability and resilience
id: sysd.reliability | prereqs: sysd.scalability
- [M] Rate limiting algorithms: token bucket, leaky bucket, fixed and sliding windows
- [I] Circuit breakers and bulkheads
- [I] Redundancy and failover: active-active, active-passive
- [I] SLAs, SLOs and SLIs: measuring reliability
- [I] Disaster recovery: backups, RPO and RTO
- [I] Graceful degradation and backpressure

#### Architecture styles
id: sysd.architecture | prereqs: sysd.scalability
- [M] Monolith vs microservices: trade-offs, when to split
- [I] API gateway and service discovery
- [A] Service mesh: sidecars
- [I] Serverless: functions as a service trade-offs

#### Building blocks toolkit
id: sysd.building-blocks | prereqs: sysd.data
- [M] Unique ID generation: UUIDs, database sequences, Snowflake IDs
- [I] Bloom filters: probabilistic membership
- [I] Geospatial indexing: geohash, quadtrees
- [A] HyperLogLog and count-min sketch: approximate counting
- [A] Merkle trees: detecting differences between replicas
- [I] Observability: logs, metrics, traces, alerting
- [M] Authentication and authorization in systems: sessions, OAuth, JWT, API keys

#### Classic system design problems
id: sysd.classics | prereqs: sysd.caching, sysd.data, sysd.messaging
- [M] URL shortener: ID generation, redirects, analytics
- [M] Rate limiter service: distributed counters, placement
- [I] Pastebin: blob storage and expiry
- [M] Key-value store: partitioning, replication, consistency
- [I] Web crawler: frontier, politeness, deduplication
- [M] Notification system: channels, fan-out, retries
- [M] News feed: fan-out on write vs read, ranking
- [M] Chat application: WebSockets, delivery receipts, storage
- [I] Photo sharing app: uploads, feeds, CDN
- [I] Video streaming platform: encoding, adaptive bitrate, CDN
- [I] File storage and sync: chunking, deduplication, conflicts
- [I] Ride-hailing: location updates, matching, geo-indexing
- [M] Typeahead autocomplete: trie service, top-k caching
- [I] E-commerce and flash sales: inventory, oversell prevention
- [I] Ticket booking: seat locking, payments, consistency
- [I] Payment system: idempotency, ledgers, reconciliation
- [I] Leaderboard: sorted sets, sharding scores
- [I] Distributed cache: eviction, consistent hashing, replication
- [I] Distributed message queue: partitions, offsets, consumer groups
- [A] (sde, quant) Stock exchange matching engine: order book, price-time priority, low latency
- [A] Collaborative document editing: operational transforms and CRDTs overview
- [A] Metrics and monitoring system: time-series ingestion

---

### 12. Probability and statistics
id: prob | tracks: quant | icon: dice-5

#### Probability foundations
id: prob.foundations | prereqs: math.combinatorics
- [M] Sample spaces and events: outcomes, events, complements, unions, intersections
- [M] Axioms and basic rules: addition rule, inclusion-exclusion for two and three events
- [M] Conditional probability: P(A | B), the multiplication rule
- [M] Independence: independent vs mutually exclusive, pairwise vs mutual independence
- [M] Law of total probability: splitting by cases
- [M] Bayes' theorem: updating beliefs, base-rate fallacy, medical test problems
- [I] Symmetry arguments: using symmetry to skip computation

#### Random variables and expectation
id: prob.random-variables | prereqs: prob.foundations
- [M] Random variables: discrete vs continuous, PMF, PDF, CDF
- [M] Expectation: definition, expected value of functions
- [M] Linearity of expectation: works even for dependent variables
- [M] Indicator variables: counting expected matches, fixed points, runs
- [M] Variance and standard deviation: definition, variance of sums
- [M] Covariance and correlation: meaning, properties, correlation vs independence
- [I] Moments and moment generating functions

#### Common distributions
id: prob.distributions | prereqs: prob.random-variables
- [M] Bernoulli and binomial: n trials, mean and variance
- [M] Geometric distribution: waiting for the first success, memorylessness
- [I] Negative binomial and hypergeometric: waiting for r successes, sampling without replacement
- [M] Poisson distribution: rare events, Poisson approximation to binomial
- [M] Uniform distribution: discrete and continuous
- [M] Exponential distribution: waiting times, memorylessness
- [M] Normal distribution: properties, standardization, 68-95-99.7 rule
- [I] Lognormal distribution: stock price modeling
- [A] Beta and gamma distributions
- [I] Sums of random variables: convolution idea, sums of normals and Poissons
- [I] Order statistics: min and max of uniforms, expected kth smallest

#### Conditional expectation and expected-value problems
id: prob.expected-value | prereqs: prob.random-variables
- [M] Conditional expectation: E[X | Y], law of total expectation
- [I] Law of total variance
- [M] First-step analysis: setting up equations over states
- [M] Waiting time problems: expected flips until HH vs HT
- [M] Coupon collector problem: expected draws to collect all types
- [I] Expected value of games: fair prices, stopping rules
- [I] Optimal stopping: secretary problem, when to stop rolling

#### Markov chains and random walks
id: prob.markov | prereqs: prob.expected-value, math.linear-algebra
- [I] Markov chains: states, transition matrices, the Markov property
- [I] Absorbing chains: absorption probabilities and expected steps
- [M] Gambler's ruin: probability of ruin, expected duration
- [I] Stationary distributions: long-run behavior
- [I] Random walks: symmetric walks, return probability, hitting times

#### Limit theorems and inequalities
id: prob.limits | prereqs: prob.distributions
- [M] Law of large numbers: averages converge
- [M] Central limit theorem: sums become normal, using it for approximations
- [I] Markov and Chebyshev inequalities: bounding tails

#### Continuous and geometric probability
id: prob.continuous | prereqs: prob.distributions
- [M] Joint distributions: joint, marginal and conditional densities
- [M] Geometric probability: random points in shapes, area ratios
- [I] Classic continuous problems: breaking a stick into three pieces, random chords, meeting problem
- [A] Transformations of random variables: change of variables

#### Statistics
id: prob.statistics | prereqs: prob.limits
- [M] Sampling and estimators: sample mean and variance, bias, consistency
- [I] Maximum likelihood estimation: intuition and simple examples
- [M] Confidence intervals: interpretation and construction
- [M] Hypothesis testing: null and alternative, p-values, type I and II errors, power
- [I] Common tests: z-test, t-test, chi-square
- [I] A/B testing: sample size, significance, pitfalls
- [I] Correlation vs causation: confounders

#### Statistical learning for quant research
id: prob.learning | prereqs: prob.statistics
- [I] Linear regression: least squares, assumptions, interpreting coefficients, R squared
- [I] Overfitting and the bias-variance trade-off: train vs test error
- [I] Regularization: ridge and lasso intuition
- [A] Time series basics: stationarity, autocorrelation, mean reversion
- [A] Cross-validation and backtesting pitfalls: look-ahead bias, data snooping

#### Stochastic processes
id: prob.stochastic | prereqs: prob.markov, prob.limits
- [A] Brownian motion intuition: continuous random walks
- [A] Martingales: fair games, optional stopping theorem
- [A] Poisson processes: arrivals over time

#### Monte Carlo and simulation
id: prob.simulation | prereqs: prob.random-variables
- [I] Monte Carlo estimation: estimating probabilities and expectations by simulation
- [I] Coding probability questions: simulating to check an answer
- [A] Variance reduction ideas: antithetic variables, control variates

---

### 13. Mathematics for quant
id: math | tracks: quant | icon: sigma

#### Combinatorics
id: math.combinatorics | prereqs: none
- [M] Counting principles: sum and product rules
- [M] Permutations and combinations: with and without repetition, arranging with identical items
- [M] Stars and bars: distributing identical items
- [M] Inclusion-exclusion: counting with overlaps, derangements
- [I] Pigeonhole principle
- [I] Catalan numbers: balanced parentheses, paths, trees
- [I] Binomial theorem and Pascal's identities

#### Number theory and algebra
id: math.number-theory | prereqs: none
- [I] Divisibility and primes: factorization, number of divisors
- [I] Modular arithmetic for puzzles: last digits, remainders
- [I] Parity and invariants: using parity to prove impossibility
- [M] Series and sums: arithmetic, geometric, sum of squares, telescoping
- [I] Inequalities: AM-GM, Cauchy-Schwarz, Jensen intuition

#### Calculus
id: math.calculus | prereqs: none
- [I] Derivatives and optimization: maxima, minima, constrained optimization with Lagrange multipliers
- [I] Integrals: basic integration, integration by parts
- [I] Taylor series: approximations like e^x and ln(1 + x)
- [I] Integrals in probability: computing expectations of continuous variables
- [A] Differential equations basics

#### Linear algebra
id: math.linear-algebra | prereqs: none
- [I] Vectors and matrices: operations, matrix multiplication
- [I] Determinants and inverses: when a matrix is invertible
- [I] Eigenvalues and eigenvectors: meaning and computation for 2x2
- [I] Covariance matrices: positive semidefinite, portfolio variance
- [A] PCA intuition: directions of maximum variance

#### Mental math and estimation
id: math.mental | prereqs: none
- [M] Fast arithmetic: multiplication tricks, squaring, splitting numbers
- [M] Fractions, decimals and percentages: quick conversions
- [I] Approximations: square roots, logs, compound growth, rule of 72
- [M] Fermi estimation: structured guessing with orders of magnitude
- [M] Speed drills: timed arithmetic tests used by trading firms

#### Proof techniques and logic
id: math.proofs | prereqs: none
- [I] Induction: weak and strong induction
- [I] Proof by contradiction and contrapositive
- [I] Invariants and monovariants: proving processes end or cannot reach a state
- [I] Symmetry and extremal principle

---

### 14. Brainteasers and puzzles
id: puzzles | tracks: quant, sde | icon: puzzle

#### Puzzle-solving method
id: puzzles.method | prereqs: none
- [M] How to attack a brainteaser: small cases, symmetry, working backwards, invariants
- [M] Communicating while solving: talking through the reasoning

#### Logic and strategy puzzles
id: puzzles.logic | prereqs: puzzles.method
- [M] Weighing puzzles: finding the odd coin with a balance
- [M] River crossing and bridge puzzles: scheduling under constraints
- [M] Hat and prisoner puzzles: parity strategies, coordination
- [I] Liars and truth-tellers
- [I] Pirates and backward induction: game solving from the end
- [I] Egg drop: minimizing worst-case trials
- [I] 25 horses and tournament puzzles
- [I] Burning ropes and measuring time
- [I] Poisoned bottles and binary encoding
- [I] Clocks and angles

#### Probability brainteasers
id: puzzles.probability | prereqs: puzzles.method, prob.foundations
- [M] Monty Hall and its variants
- [M] Birthday problem: collisions
- [M] Coin and dice games: expected rolls, fair games, choosing the better bet
- [I] Card problems: drawing aces, colors, positions
- [I] Two envelopes and paradoxes: spotting flawed reasoning
- [I] Ants on a pole and similar symmetry tricks

#### Game theory puzzles
id: puzzles.games | prereqs: puzzles.method
- [I] Nim and impartial games: winning positions, XOR strategy
- [I] Take-away games: finding the pattern of losing positions
- [I] Bidding and auction puzzles

---

### 15. Markets and trading
id: markets | tracks: quant | icon: candlestick-chart

#### Market basics
id: markets.basics | prereqs: none
- [M] Asset classes: stocks, bonds, futures, options, currencies
- [M] Order books: bids, asks, spread, depth
- [M] Order types: market, limit, stop orders
- [M] Liquidity and market makers: who provides prices and why
- [I] How exchanges match orders: price-time priority

#### Market making and trading games
id: markets.making | prereqs: markets.basics, prob.random-variables
- [M] Making a market: quoting a bid and ask, width and confidence
- [M] Edge and expected value in trades
- [M] Adverse selection: why informed traders hurt market makers
- [I] Inventory and position risk: skewing quotes
- [I] Trading game practice: estimation markets used in interviews

#### Betting and risk
id: markets.betting | prereqs: prob.expected-value
- [M] Expected value decisions: when to take a bet
- [M] Kelly criterion: optimal bet sizing, fractional Kelly
- [I] Variance and risk of ruin
- [I] Utility and risk aversion

#### Options
id: markets.options | prereqs: markets.basics, prob.distributions
- [I] Calls and puts: payoff diagrams
- [I] Put-call parity: the no-arbitrage relationship
- [I] Intrinsic and time value
- [I] Greeks intuition: delta, gamma, vega, theta
- [A] Black-Scholes intuition: assumptions and inputs
- [A] Implied volatility and the volatility smile

#### Pricing and portfolios
id: markets.pricing | prereqs: markets.basics
- [M] Time value of money: discounting, present value, compounding
- [M] No-arbitrage pricing: forwards and futures
- [I] Diversification and correlation: portfolio variance
- [I] Sharpe ratio and risk-adjusted returns
- [A] Value at risk

#### Game theory for trading
id: markets.game-theory | prereqs: puzzles.games
- [I] Nash equilibrium: definition and simple games
- [I] Zero-sum games and mixed strategies
- [I] Auctions: first-price, second-price, winner's curse

---

### 16. Aptitude and mental math
id: apt | tracks: sde, quant | icon: brain

#### Quantitative aptitude
id: apt.quant | prereqs: none
- [M] Percentages, profit and loss
- [M] Ratios, proportions and averages
- [M] Time, speed and distance: relative speed, trains, boats and streams
- [M] Time and work: pipes and cisterns
- [I] Simple and compound interest
- [I] Mixtures and alligation
- [I] Number series and sequences
- [I] Permutations, combinations and probability basics for OAs

#### Logical reasoning
id: apt.logical | prereqs: none
- [M] Seating arrangements and puzzles
- [I] Blood relations
- [I] Syllogisms
- [I] Coding-decoding and directions
- [I] Data sufficiency
- [I] Data interpretation: tables and charts

#### Verbal ability
id: apt.verbal | prereqs: none
- [A] Reading comprehension
- [A] Grammar and sentence correction

---

### 17. Engineering essentials
id: eng | tracks: sde | icon: wrench

#### Git
id: eng.git | prereqs: none
- [M] Git basics: commits, staging, branches, the commit graph
- [M] Merging vs rebasing: when to use each, resolving conflicts
- [I] Undoing things: reset, revert, restore, stash
- [I] Collaboration workflow: pull requests, code review, cherry-pick
- [A] Git internals: objects, content-addressed hashing, the DAG

#### Linux and the shell
id: eng.linux | prereqs: none
- [M] Navigating and managing files: ls, cd, cp, mv, rm, find
- [M] Permissions: chmod, chown, users and groups
- [I] Processes: ps, top, kill, background jobs, signals
- [I] Text processing: grep, sed, awk basics, pipes and redirection
- [I] Networking commands: curl, ping, netstat or ss, ssh
- [A] Shell scripting basics and cron

#### Testing and debugging
id: eng.testing | prereqs: none
- [M] Unit, integration and end-to-end tests: the test pyramid
- [I] Test-driven development: red, green, refactor
- [I] Mocks and stubs: isolating dependencies
- [I] Debugging tools: debuggers, breakpoints, logging strategy

#### Web and APIs
id: eng.web | prereqs: cn.application
- [M] Client-server architecture: frontend, backend, database
- [M] Designing REST APIs: resources, status codes, pagination, errors
- [I] JSON and serialization
- [I] Authentication in web apps: sessions vs tokens

#### Cloud and DevOps
id: eng.devops | prereqs: none
- [I] Docker basics: images, containers, Dockerfiles
- [I] CI/CD: automated builds, tests and deployments
- [I] Cloud service models: IaaS, PaaS, SaaS; common AWS services map
- [A] Kubernetes overview: pods, services, deployments

#### Software engineering practice
id: eng.practice | prereqs: none
- [I] SDLC and agile: sprints, standups, estimation
- [I] Clean code: naming, functions, comments
- [I] Code review etiquette: giving and receiving feedback
- [A] Documentation: READMEs and design docs

---

### 18. Behavioral and career
id: career | tracks: sde, quant | icon: user-round

#### Behavioral interviews
id: career.behavioral | prereqs: none
- [M] The STAR method: situation, task, action, result
- [M] Tell me about yourself: a 90-second story
- [M] Building a story bank: conflict, failure, leadership, ownership, deadline pressure, disagreement, learning fast, biggest achievement
- [M] Why this company and why this role
- [I] Company values questions: mapping stories to values
- [I] Questions to ask the interviewer

#### Projects and resume
id: career.resume | prereqs: none
- [M] Resume writing: one page, impact bullets with numbers, action verbs
- [M] Project deep dives: architecture, challenges, trade-offs, metrics, what you would change
- [I] GitHub and portfolio presentation

#### Job search strategy
id: career.search | prereqs: none
- [I] Finding openings: referrals, job boards, campus and off-campus routes
- [I] Online assessment strategy: time management, partial solutions, common formats
- [I] Interview day tactics: preparing the environment, thinking aloud, asking clarifying questions
- [I] Quant firm process: typical rounds at trading firms (OA, mental math, probability, trading games, technical)

#### Offers
id: career.offers | prereqs: none
- [I] Understanding compensation: base, bonus, stock, CTC breakdown, in-hand pay
- [I] Negotiation basics: competing offers, being polite and specific
- [I] Choosing between offers: learning, team, growth, compensation

---

## 7. Connections: cross-subject links and prerequisite chains

Connections are what make Atlas different from a list of topics. Links are written as `topic id › Concept name` using the exact concept names from section 6. Resolve each one to concept ids in `build-syllabus.mjs`, store it on **both** concepts, and fail the build if a name does not resolve. The reason text is shown in the UI, so keep it as written.

### 7.1 Cross-subject links (shown as dashed "connection" lines on the map)

| From | To | Why they connect |
|---|---|---|
| dsa.bst › Self-balancing BSTs overview | dbms.indexing › B-trees and B+ trees | Both keep keys sorted in balanced trees; B+ trees are the disk-friendly, wide cousin. |
| dsa.hashing › Hash table internals | dbms.indexing › Hash indexes | A hash index is a hash table on disk: fast equality lookups, no range scans. |
| dsa.hashing › Hash table internals | lang.java-core › HashMap internals | Java's HashMap is a real-world hash table with chaining and treeified buckets. |
| dbms.nosql › Consistent hashing | sysd.data › Consistent hashing in design | Same technique, seen from the database and the system design side. |
| dsa.graph-basics › Cycle detection in directed graphs | os.deadlocks › Deadlock detection and recovery | Deadlock detection is cycle detection in a wait-for graph. |
| dsa.graph-basics › Cycle detection in directed graphs | dbms.transactions › Schedules and serializability | A schedule is conflict serializable exactly when its precedence graph has no cycle. |
| dsa.graph-basics › Topological sort | dbms.transactions › Schedules and serializability | The equivalent serial order is a topological order of the precedence graph. |
| dsa.graph-basics › Topological sort | eng.devops › CI/CD | Build systems and pipelines run dependent jobs in topological order. |
| os.deadlocks › Resource allocation graphs | dbms.concurrency › Deadlocks in databases | Databases face the same four deadlock conditions with row locks. |
| dsa.design-ds › LRU cache | os.memory › Page replacement | LRU page replacement uses the same eviction idea as an LRU cache. |
| dsa.design-ds › LRU cache | sysd.caching › Eviction policies | Cache servers evict with LRU, LFU or TTL. |
| dsa.design-ds › LRU cache | lld.classics › LRU cache as a class design | The DSA version is the core; the LLD version adds interfaces and pluggable policies. |
| lang.java-core › Specialised collections | dsa.design-ds › LRU cache | LinkedHashMap with access order is a ready-made LRU cache. |
| dsa.stacks-queues › Queue and deque basics | os.scheduling › Round robin | Round robin is a FIFO queue of ready processes. |
| dsa.heaps › Binary heap | os.scheduling › Priority scheduling | A priority scheduler is a priority queue of ready processes. |
| dsa.heaps › Top K elements | sysd.classics › Leaderboard | Leaderboards are top-K at scale. |
| dsa.heaps › Binary heap | markets.basics › Order books | An order book keeps the best bid and best ask instantly available, like two heaps or ordered maps. |
| markets.basics › How exchanges match orders | sysd.classics › Stock exchange matching engine | The matching rule becomes the core of the engine design. |
| lang.cpp-stl › Ordered containers | dsa.bst › Self-balancing BSTs overview | std::map and std::set are red-black trees. |
| lang.cpp-stl › Container adaptors | dsa.heaps › Binary heap | priority_queue is a binary heap. |
| lang.python-core › collections and heapq | dsa.heaps › Binary heap | heapq is a binary min-heap on a list. |
| dsa.tries › Autocomplete with tries | sysd.classics › Typeahead autocomplete | The trie is the heart of a typeahead service. |
| dsa.tries › Trie structure | cn.network › Routing basics | Routers look up the longest matching address prefix, a job tries do well. |
| dsa.shortest-paths › Dijkstra's algorithm | cn.network › Distance vector vs link state | Link-state routing (OSPF) runs Dijkstra on the network graph. |
| dsa.shortest-paths › Bellman-Ford | cn.network › Distance vector vs link state | Distance-vector routing (RIP) is distributed Bellman-Ford. |
| dsa.bits › Bitwise operators | cn.network › Subnetting and CIDR | Applying a subnet mask is a bitwise AND. |
| dsa.bits › Bitwise operators | arch.representation › Binary, hex and two's complement | Bit tricks rely on how integers are stored. |
| dsa.bits › Bitmask enumeration | puzzles.logic › Poisoned bottles and binary encoding | Each tester is one bit of the bottle's number. |
| dsa.sliding-window › Variable-size window | cn.transport › TCP flow control | TCP's sliding window moves over a byte stream the way a window moves over an array. |
| dsa.sliding-window › Fixed-size window | sysd.reliability › Rate limiting algorithms | Sliding-window rate limiters count requests in a moving time window. |
| dsa.binary-search › Classic binary search | dbms.indexing › Why indexes | An index turns a full scan into a search over sorted keys. |
| dsa.sorting › Merge sort | dbms.indexing › Join algorithms | Sort-merge join and external sorting are merge sort at database scale. |
| dsa.dp-foundations › Designing DP states | prob.expected-value › First-step analysis | First-step analysis writes expected values over states, exactly like a DP recurrence. |
| dsa.dp-intervals › Game DP | puzzles.games › Nim and impartial games | Both solve games by reasoning about winning and losing positions. |
| puzzles.games › Nim and impartial games | markets.game-theory › Zero-sum games and mixed strategies | Game-solving thinking carries into trading games. |
| puzzles.logic › Egg drop | dsa.dp-foundations › Designing DP states | Egg drop is a classic DP over (eggs, floors). |
| prob.markov › Markov chains | dsa.graph-basics › Graph representations | A Markov chain is a directed graph whose edge weights are probabilities. |
| dsa.math › Randomized algorithms | prob.random-variables › Linearity of expectation | Analyzing quickselect and shuffles uses expectation. |
| prob.simulation › Monte Carlo estimation | dsa.math › Randomized algorithms | Simulation is randomized computation used to estimate answers. |
| dsa.math › Combinatorics in code | math.combinatorics › Permutations and combinations | Same counting, with modular arithmetic added in code. |
| dsa.math › Modular arithmetic | math.number-theory › Modular arithmetic for puzzles | Same rules, used for coding and for puzzles. |
| oop.patterns-creational › Singleton | conc.locks › Thread-safe singleton | Lazy singletons need safe initialization across threads. |
| oop.patterns-behavioral › Observer | sysd.messaging › Publish-subscribe and event-driven architecture | Pub-sub is the observer pattern across services. |
| oop.patterns-behavioral › Strategy | lld.classics › Rate limiter | Rate-limiting algorithms plug in as strategies. |
| oop.patterns-behavioral › State | lld.classics › Vending machine | A vending machine is the textbook state pattern. |
| lang.cpp-modern › Virtual function internals | oop.pillars › Polymorphism | Runtime polymorphism is implemented with vtables. |
| os.sync › Producer-consumer problem | conc.patterns › Producer-consumer in code | The theory problem and its real implementation. |
| conc.patterns › Producer-consumer in code | sysd.messaging › Message queues | A message queue is a producer-consumer buffer between services. |
| os.memory › Paging | arch.cpu-memory › Memory hierarchy | Paging decides what lives in RAM vs disk in the hierarchy. |
| os.memory › TLB | arch.cpu-memory › Cache lines and locality | The TLB is a cache for address translations. |
| os.storage › Journaling file systems | dbms.recovery › Logs and write-ahead logging | Journaling is write-ahead logging for file system metadata. |
| os.processes › Inter-process communication | cn.transport › Ports and sockets | Sockets are IPC that also works across machines. |
| os.io › I/O multiplexing | sysd.messaging › Real-time delivery | epoll lets one server hold thousands of open connections. |
| os.processes › Context switching | arch.performance › Cost of system calls and context switches | Why switching is expensive at the hardware level. |
| os.processes › Context switching | conc.patterns › Thread pools | Thread pools reuse threads to avoid creation and switching costs. |
| conc.basics › Data races vs race conditions | os.sync › Race conditions and critical sections | Same bug class, from the OS theory side. |
| conc.atomics › Atomic operations | os.sync › Hardware support | Atomics are built on compare-and-swap instructions. |
| arch.cpu-memory › Cache lines and locality | conc.atomics › False sharing and cache-line padding | Two threads writing one cache line slow each other down. |
| arch.cpu-memory › Cache lines and locality | dsa.arrays › Matrix traversal | Row-major traversal is fast because it follows cache lines. |
| arch.representation › Floating point (IEEE 754) | lang.general › Floating point pitfalls | Why float comparisons need care. |
| arch.representation › Floating point (IEEE 754) | dsa.binary-search › Binary search on real numbers | Precision limits decide the stopping rule. |
| cn.application › HTTP basics | sysd.scalability › Stateless services | Stateless HTTP is what lets any server handle any request. |
| cn.application › DNS | sysd.scalability › Load balancing | DNS can spread traffic across servers and regions. |
| cn.security › OAuth and JWT basics | sysd.building-blocks › Authentication and authorization in systems | Token-based auth in practice. |
| cn.transport › TCP congestion control | sysd.messaging › Retries, timeouts and exponential backoff with jitter | Both back off when the network or a service is overloaded. |
| cn.infrastructure › Load balancers | sysd.scalability › Load balancing | The networking view and the design view of the same box. |
| cn.infrastructure › CDNs | sysd.caching › Where to cache | A CDN is a cache near the user. |
| dbms.concurrency › Isolation levels | conc.basics › Data races vs race conditions | Isolation levels decide which race conditions a database lets through. |
| dbms.concurrency › Lock-based protocols | os.sync › Mutex locks | Database locks are mutexes on rows and tables. |
| dbms.nosql › Replication | sysd.data › Replication in practice | Replication theory and its trade-offs in real designs. |
| dbms.nosql › CAP theorem | sysd.distributed › CAP theorem in practice | Choosing consistency or availability per feature. |
| dbms.nosql › Sharding and partitioning | sysd.data › Sharding strategies | Picking shard keys and handling hot spots. |
| dbms.indexing › LSM trees | sysd.building-blocks › Bloom filters | LSM-based stores use Bloom filters to skip files. |
| dbms.normalization › Normal forms | sql.joins › Inner join | Normalized data is put back together with joins. |
| sql.window › Running totals and moving averages | dsa.prefix-sums › 1D prefix sums | A running total is a prefix sum. |
| prob.random-variables › Expectation | markets.betting › Expected value decisions | Every trading decision starts with expected value. |
| markets.betting › Kelly criterion | math.calculus › Derivatives and optimization | The Kelly fraction maximizes expected log wealth. |
| math.linear-algebra › Covariance matrices | prob.random-variables › Covariance and correlation | The matrix form of covariance. |
| math.linear-algebra › Covariance matrices | markets.pricing › Diversification and correlation | Portfolio variance is w transpose times Sigma times w. |
| math.mental › Fast arithmetic | apt.quant › Percentages, profit and loss | The same speed skills power aptitude tests. |
| math.mental › Fermi estimation | sysd.method › Back-of-the-envelope estimation | Same skill: structured estimates with orders of magnitude. |
| puzzles.probability › Birthday problem | sysd.building-blocks › Unique ID generation | Birthday math tells you when random IDs start to collide. |
| puzzles.probability › Coin and dice games | prob.expected-value › Waiting time problems | Many games are waiting-time problems in disguise. |
| eng.git › Git internals | dsa.graph-basics › Graph representations | Commits form a directed acyclic graph. |
| eng.git › Git internals | sysd.building-blocks › Merkle trees | Git's object store is a Merkle tree of hashes. |
| sysd.distributed › Distributed locks and leases | conc.locks › Mutexes and lock guards | A mutex stretched across machines, with expiry. |
| dsa.intervals › Sweep line | lld.classics › Meeting room scheduler | Booking conflicts are interval overlaps. |
| career.resume › Project deep dives | sysd.method › Discussing trade-offs | Explaining your project is a mini design interview. |
| dsa.problem-solving › Communicating in interviews | career.search › Interview day tactics | Thinking aloud is half the interview. |

### 7.2 Key concept-level prerequisite chains

Topic prerequisites are in section 6. Add these concept-level prerequisites too (arrows mean "learn first"). Then add further obvious ones carefully, keeping the graph acyclic. Keep concept prerequisites sparse: they drive "ready to learn" suggestions, and too many edges make the map noisy.

- dsa.recursion › Recursion fundamentals → dsa.backtracking › Subsets; dsa.trees › DFS traversals; dsa.dp-foundations › What DP is
- dsa.recursion › Memoization intro → dsa.dp-foundations › Memoization vs tabulation
- dsa.hashing › Frequency counting → dsa.sliding-window › Window with counts
- dsa.hashing › Complement lookup → dsa.prefix-sums › Prefix sum with hash map
- dsa.prefix-sums › 1D prefix sums → dsa.prefix-sums › Prefix sum with hash map → dsa.prefix-sums › 2D prefix sums
- dsa.binary-search › Classic binary search → Lower and upper bound → Binary search on the answer
- dsa.two-pointers › Opposite-ends pointers → dsa.two-pointers › kSum
- dsa.stacks-queues › Stack basics → dsa.monotonic › Monotonic stack → dsa.monotonic › Largest rectangle in histogram
- dsa.stacks-queues › Queue and deque basics → dsa.graph-basics › BFS; dsa.monotonic › Monotonic deque
- dsa.heaps › Binary heap → Top K elements; K-way merge; Two heaps; dsa.shortest-paths › Dijkstra's algorithm; dsa.mst-dsu › Prim's algorithm
- dsa.graph-basics › DFS → Cycle detection in directed graphs → Topological sort
- dsa.graph-basics › BFS → Multi-source BFS; BFS on state spaces; Topological sort; dsa.shortest-paths › 0-1 BFS
- dsa.mst-dsu › Disjoint set union → Kruskal's algorithm; DSU applications
- dsa.linked-lists › Linked list basics → Linked list reversal → Fast and slow pointers on lists
- dsa.linked-lists › Doubly linked list with hash map → dsa.design-ds › LRU cache
- dsa.trees › DFS traversals → dsa.bst › Inorder tricks; dsa.trees › Bottom-up tree recursion → dsa.dp-advanced › DP on trees
- dsa.dp-foundations › Designing DP states → every `(pattern)` concept in the DP topics
- dsa.dp-knapsack › 0/1 knapsack → Subset sum and partition → Unbounded knapsack → Combinations vs permutations counting
- dsa.dp-strings › Longest common subsequence → Edit distance → Palindromic DP
- dsa.bits › Bitwise operators → Bitmask enumeration → dsa.dp-advanced › Bitmask DP
- os.processes › Process vs program → os.threads › Threads vs processes → os.sync › Race conditions and critical sections → Mutex locks → Semaphores → Producer-consumer problem
- os.sync › Race conditions and critical sections → os.deadlocks › Deadlock conditions
- os.memory › Paging → TLB → Virtual memory and demand paging → Page replacement → Thrashing and working sets
- cn.fundamentals › OSI model → TCP/IP model → Encapsulation
- cn.network › IPv4 addressing → Subnetting and CIDR → NAT
- cn.transport › TCP vs UDP → TCP three-way handshake and four-way teardown → TCP reliability → TCP flow control → TCP congestion control
- cn.application › DNS, HTTP basics, HTTPS and TLS, and cn.transport › TCP three-way handshake and four-way teardown → cn.application › What happens when you type a URL
- dbms.transactions › ACID properties → Schedules and serializability → dbms.concurrency › Lock-based protocols → Isolation levels → MVCC
- dbms.indexing › Why indexes → Clustered vs non-clustered indexes → B-trees and B+ trees → Composite and covering indexes
- prob.foundations › Conditional probability → Law of total probability → Bayes' theorem
- prob.random-variables › Expectation → Linearity of expectation → Indicator variables
- prob.expected-value › Conditional expectation → First-step analysis → Waiting time problems; Coupon collector problem
- sysd.method › The interview framework → every concept in sysd.classics
- lld.method › Clarifying requirements → every concept in lld.classics

---

## 8. Seed practice banks

### 8.1 LeetCode problem bank

Format per line: `difficulty number title` (E easy, M medium, H hard; P premium, which may need a LeetCode subscription). Group headings are topic ids. For each problem:

- `id` = `lc-<number>`; `slug` = title lowercased, every character other than letters, digits, spaces and hyphens removed, then runs of spaces and hyphens collapsed into one hyphen (for example `Pow(x, n)` becomes `powx-n`, `Two Sum II - Input Array Is Sorted` becomes `two-sum-ii-input-array-is-sorted`).
- Link: `https://leetcode.com/problems/<slug>/`. Let the owner edit a link if one is wrong.
- Tag each problem with 1 to 3 concept ids from its topic (and from other topics if clearly relevant), choosing the `(pattern)` concepts that best describe the intended solution.
- Double-check every difficulty and title against your knowledge. If unsure, keep the entry and set `needsReview: true`.
- Store **no problem statements**. The owner can write a private summary in `myNotes`.

#### dsa.arrays
E 118 Pascal's Triangle · M 53 Maximum Subarray · M 918 Maximum Sum Circular Subarray · M 75 Sort Colors · E 169 Majority Element · M 229 Majority Element II · M 31 Next Permutation · M 189 Rotate Array · M 48 Rotate Image · M 54 Spiral Matrix · M 73 Set Matrix Zeroes · E 121 Best Time to Buy and Sell Stock · M 287 Find the Duplicate Number · E 448 Find All Numbers Disappeared in an Array · E 268 Missing Number · H 41 First Missing Positive

#### dsa.prefix-sums
E 303 Range Sum Query - Immutable · M 304 Range Sum Query 2D - Immutable · M 560 Subarray Sum Equals K · M 525 Contiguous Array · M 974 Subarray Sums Divisible by K · M 523 Continuous Subarray Sum · M 238 Product of Array Except Self · M 1109 Corporate Flight Bookings · M 1310 XOR Queries of a Subarray

#### dsa.hashing
E 1 Two Sum · E 217 Contains Duplicate · E 242 Valid Anagram · M 49 Group Anagrams · M 347 Top K Frequent Elements · M 36 Valid Sudoku · M 128 Longest Consecutive Sequence · E 387 First Unique Character in a String · E 290 Word Pattern

#### dsa.two-pointers
E 125 Valid Palindrome · M 167 Two Sum II - Input Array Is Sorted · M 15 3Sum · M 16 3Sum Closest · M 18 4Sum · M 11 Container With Most Water · H 42 Trapping Rain Water · E 283 Move Zeroes · E 26 Remove Duplicates from Sorted Array · E 88 Merge Sorted Array · E 977 Squares of a Sorted Array · M 881 Boats to Save People · E 844 Backspace String Compare · E 202 Happy Number

#### dsa.sliding-window
E 643 Maximum Average Subarray I · M 3 Longest Substring Without Repeating Characters · M 424 Longest Repeating Character Replacement · M 567 Permutation in String · M 438 Find All Anagrams in a String · M 209 Minimum Size Subarray Sum · M 1004 Max Consecutive Ones III · M 904 Fruit Into Baskets · M 1423 Maximum Points You Can Obtain from Cards · M 930 Binary Subarrays With Sum · M 1248 Count Number of Nice Subarrays · M 1358 Number of Substrings Containing All Three Characters · H 992 Subarrays with K Different Integers · H 76 Minimum Window Substring · H 239 Sliding Window Maximum

#### dsa.binary-search
E 704 Binary Search · E 35 Search Insert Position · M 34 Find First and Last Position of Element in Sorted Array · E 69 Sqrt(x) · M 74 Search a 2D Matrix · M 240 Search a 2D Matrix II · M 33 Search in Rotated Sorted Array · M 81 Search in Rotated Sorted Array II · M 153 Find Minimum in Rotated Sorted Array · M 162 Find Peak Element · M 540 Single Element in a Sorted Array · M 875 Koko Eating Bananas · M 1011 Capacity To Ship Packages Within D Days · M 1482 Minimum Number of Days to Make m Bouquets · M 1283 Find the Smallest Divisor Given a Threshold · H 410 Split Array Largest Sum · M 981 Time Based Key-Value Store · M 378 Kth Smallest Element in a Sorted Matrix · H 719 Find K-th Smallest Pair Distance · H 4 Median of Two Sorted Arrays

#### dsa.sorting
M 912 Sort an Array · M 148 Sort List · M 179 Largest Number · M 215 Kth Largest Element in an Array · M 274 H-Index · H 493 Reverse Pairs · H 315 Count of Smaller Numbers After Self

#### dsa.strings
E 14 Longest Common Prefix · M 151 Reverse Words in a String · E 205 Isomorphic Strings · E 13 Roman to Integer · M 12 Integer to Roman · M 8 String to Integer (atoi) · M 5 Longest Palindromic Substring · M 647 Palindromic Substrings · M 43 Multiply Strings · E 67 Add Binary · E 796 Rotate String

#### dsa.string-algorithms
E 28 Find the Index of the First Occurrence in a String · E 459 Repeated Substring Pattern · M 187 Repeated DNA Sequences · H 214 Shortest Palindrome · H 1392 Longest Happy Prefix · H 1044 Longest Duplicate Substring

#### dsa.backtracking
M 78 Subsets · M 90 Subsets II · M 46 Permutations · M 47 Permutations II · M 77 Combinations · M 39 Combination Sum · M 40 Combination Sum II · M 216 Combination Sum III · M 17 Letter Combinations of a Phone Number · M 22 Generate Parentheses · M 79 Word Search · M 131 Palindrome Partitioning · M 93 Restore IP Addresses · M 698 Partition to K Equal Sum Subsets · M 473 Matchsticks to Square · H 51 N-Queens · H 52 N-Queens II · H 37 Sudoku Solver · H 301 Remove Invalid Parentheses · H 282 Expression Add Operators

#### dsa.linked-lists
E 206 Reverse Linked List · E 21 Merge Two Sorted Lists · E 141 Linked List Cycle · M 142 Linked List Cycle II · E 876 Middle of the Linked List · M 19 Remove Nth Node From End of List · M 143 Reorder List · M 138 Copy List with Random Pointer · M 2 Add Two Numbers · E 160 Intersection of Two Linked Lists · E 234 Palindrome Linked List · M 92 Reverse Linked List II · M 24 Swap Nodes in Pairs · M 61 Rotate List · M 328 Odd Even Linked List · M 82 Remove Duplicates from Sorted List II · H 25 Reverse Nodes in k-Group · H 23 Merge k Sorted Lists

#### dsa.stacks-queues
E 20 Valid Parentheses · M 155 Min Stack · M 150 Evaluate Reverse Polish Notation · E 232 Implement Queue using Stacks · E 225 Implement Stack using Queues · M 394 Decode String · M 71 Simplify Path · E 1047 Remove All Adjacent Duplicates In String · M 735 Asteroid Collision · M 946 Validate Stack Sequences · M 227 Basic Calculator II · H 224 Basic Calculator · H 32 Longest Valid Parentheses

#### dsa.monotonic
E 496 Next Greater Element I · M 503 Next Greater Element II · M 739 Daily Temperatures · M 901 Online Stock Span · M 853 Car Fleet · M 907 Sum of Subarray Minimums · M 2104 Sum of Subarray Ranges · M 456 132 Pattern · M 402 Remove K Digits · M 316 Remove Duplicate Letters · M 1438 Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit · M 1696 Jump Game VI · H 84 Largest Rectangle in Histogram · H 85 Maximal Rectangle · H 862 Shortest Subarray with Sum at Least K · H 895 Maximum Frequency Stack

#### dsa.heaps
E 703 Kth Largest Element in a Stream · E 1046 Last Stone Weight · M 973 K Closest Points to Origin · M 692 Top K Frequent Words · M 621 Task Scheduler · M 767 Reorganize String · M 373 Find K Pairs with Smallest Sums · M 1834 Single-Threaded CPU · M 355 Design Twitter · H 295 Find Median from Data Stream · H 632 Smallest Range Covering Elements from K Lists · H 502 IPO · H 871 Minimum Number of Refueling Stops · H 2402 Meeting Rooms III

#### dsa.intervals
M 56 Merge Intervals · M 57 Insert Interval · M 435 Non-overlapping Intervals · M 452 Minimum Number of Arrows to Burst Balloons · M 986 Interval List Intersections · M 1288 Remove Covered Intervals · M 729 My Calendar I · M 731 My Calendar II · H 732 My Calendar III · P M 253 Meeting Rooms II

#### dsa.greedy
E 455 Assign Cookies · E 860 Lemonade Change · M 55 Jump Game · M 45 Jump Game II · M 134 Gas Station · M 846 Hand of Straights · M 763 Partition Labels · M 678 Valid Parenthesis String · M 406 Queue Reconstruction by Height · M 1029 Two City Scheduling · H 135 Candy · H 330 Patching Array

#### dsa.trees
E 94 Binary Tree Inorder Traversal · E 144 Binary Tree Preorder Traversal · E 145 Binary Tree Postorder Traversal · E 104 Maximum Depth of Binary Tree · E 226 Invert Binary Tree · E 100 Same Tree · E 101 Symmetric Tree · E 110 Balanced Binary Tree · E 543 Diameter of Binary Tree · E 572 Subtree of Another Tree · E 112 Path Sum · M 113 Path Sum II · M 437 Path Sum III · M 102 Binary Tree Level Order Traversal · M 103 Binary Tree Zigzag Level Order Traversal · M 199 Binary Tree Right Side View · M 662 Maximum Width of Binary Tree · M 1448 Count Good Nodes in Binary Tree · M 236 Lowest Common Ancestor of a Binary Tree · M 863 All Nodes Distance K in Binary Tree · M 105 Construct Binary Tree from Preorder and Inorder Traversal · M 114 Flatten Binary Tree to Linked List · M 337 House Robber III · H 987 Vertical Order Traversal of a Binary Tree · H 124 Binary Tree Maximum Path Sum · H 297 Serialize and Deserialize Binary Tree · H 968 Binary Tree Cameras

#### dsa.bst
E 700 Search in a Binary Search Tree · M 701 Insert into a Binary Search Tree · M 450 Delete Node in a BST · M 98 Validate Binary Search Tree · M 230 Kth Smallest Element in a BST · M 235 Lowest Common Ancestor of a Binary Search Tree · M 173 Binary Search Tree Iterator · E 108 Convert Sorted Array to Binary Search Tree · M 1008 Construct Binary Search Tree from Preorder Traversal · E 653 Two Sum IV - Input is a BST · H 1373 Maximum Sum BST in Binary Tree

#### dsa.tries
M 208 Implement Trie (Prefix Tree) · M 211 Design Add and Search Words Data Structure · M 648 Replace Words · M 421 Maximum XOR of Two Numbers in an Array · H 212 Word Search II · H 1707 Maximum XOR With an Element From Array · H 336 Palindrome Pairs · H 472 Concatenated Words

#### dsa.graph-basics
E 733 Flood Fill · M 200 Number of Islands · M 695 Max Area of Island · M 547 Number of Provinces · M 133 Clone Graph · M 994 Rotting Oranges · M 542 01 Matrix · M 130 Surrounded Regions · M 417 Pacific Atlantic Water Flow · M 1020 Number of Enclaves · M 841 Keys and Rooms · E 997 Find the Town Judge · M 785 Is Graph Bipartite? · M 207 Course Schedule · M 210 Course Schedule II · M 802 Find Eventual Safe States · M 1462 Course Schedule IV · M 2115 Find All Possible Recipes from Given Supplies · M 310 Minimum Height Trees · M 752 Open the Lock · M 1091 Shortest Path in Binary Matrix · M 399 Evaluate Division · H 127 Word Ladder · H 126 Word Ladder II · H 329 Longest Increasing Path in a Matrix · H 1293 Shortest Path in a Grid with Obstacles Elimination

#### dsa.shortest-paths
M 743 Network Delay Time · M 787 Cheapest Flights Within K Stops · M 1631 Path With Minimum Effort · M 1514 Path with Maximum Probability · M 1334 Find the City With the Smallest Number of Neighbors at a Threshold Distance · M 1976 Number of Ways to Arrive at Destination · H 778 Swim in Rising Water · H 1368 Minimum Cost to Make at Least One Valid Path in a Grid

#### dsa.mst-dsu
M 684 Redundant Connection · M 1584 Min Cost to Connect All Points · M 721 Accounts Merge · M 1319 Number of Operations to Make Network Connected · M 947 Most Stones Removed with Same Row or Column · M 990 Satisfiability of Equality Equations · H 685 Redundant Connection II · H 827 Making A Large Island · H 1579 Remove Max Number of Edges to Keep Graph Fully Traversable

#### dsa.advanced-graphs
H 1192 Critical Connections in a Network · H 332 Reconstruct Itinerary · H 847 Shortest Path Visiting All Nodes

#### dsa.dp-1d
E 70 Climbing Stairs · E 746 Min Cost Climbing Stairs · E 509 Fibonacci Number · M 198 House Robber · M 213 House Robber II · M 91 Decode Ways · M 139 Word Break · M 152 Maximum Product Subarray · M 279 Perfect Squares · M 343 Integer Break · H 403 Frog Jump

#### dsa.dp-grid
M 62 Unique Paths · M 63 Unique Paths II · M 64 Minimum Path Sum · M 120 Triangle · M 931 Minimum Falling Path Sum · M 221 Maximal Square · M 1277 Count Square Submatrices with All Ones · H 174 Dungeon Game · H 741 Cherry Pickup

#### dsa.dp-knapsack
M 416 Partition Equal Subset Sum · M 494 Target Sum · M 322 Coin Change · M 518 Coin Change II · M 377 Combination Sum IV · M 1049 Last Stone Weight II · M 474 Ones and Zeroes

#### dsa.dp-subsequences
M 300 Longest Increasing Subsequence · M 673 Number of Longest Increasing Subsequence · M 368 Largest Divisible Subset · M 1048 Longest String Chain · H 354 Russian Doll Envelopes · M 122 Best Time to Buy and Sell Stock II · H 123 Best Time to Buy and Sell Stock III · H 188 Best Time to Buy and Sell Stock IV · M 309 Best Time to Buy and Sell Stock with Cooldown · M 714 Best Time to Buy and Sell Stock with Transaction Fee

#### dsa.dp-strings
M 1143 Longest Common Subsequence · M 72 Edit Distance · M 583 Delete Operation for Two Strings · M 516 Longest Palindromic Subsequence · M 97 Interleaving String · H 1312 Minimum Insertion Steps to Make a String Palindrome · H 115 Distinct Subsequences · H 10 Regular Expression Matching · H 44 Wildcard Matching

#### dsa.dp-intervals
M 1039 Minimum Score Triangulation of Polygon · M 877 Stone Game · H 312 Burst Balloons · H 1547 Minimum Cost to Cut a Stick · H 132 Palindrome Partitioning II · H 87 Scramble String · H 1000 Minimum Cost to Merge Stones

#### dsa.dp-advanced
M 96 Unique Binary Search Trees · H 1235 Maximum Profit in Job Scheduling · H 1125 Smallest Sufficient Team · H 943 Find the Shortest Superstring · H 233 Number of Digit One · H 902 Numbers At Most N Given Digit Set

#### dsa.bits
E 136 Single Number · M 137 Single Number II · M 260 Single Number III · E 191 Number of 1 Bits · E 338 Counting Bits · E 190 Reverse Bits · E 231 Power of Two · E 461 Hamming Distance · M 477 Total Hamming Distance · M 371 Sum of Two Integers · M 201 Bitwise AND of Numbers Range · M 29 Divide Two Integers

#### dsa.math
E 9 Palindrome Number · M 7 Reverse Integer · E 66 Plus One · M 50 Pow(x, n) · M 204 Count Primes · M 172 Factorial Trailing Zeroes · M 372 Super Pow · M 470 Implement Rand10() Using Rand7() · M 382 Linked List Random Node · M 398 Random Pick Index · M 528 Random Pick with Weight · M 384 Shuffle an Array · H 149 Max Points on a Line

#### dsa.range-queries
M 307 Range Sum Query - Mutable · H 1649 Create Sorted Array through Instructions · H 218 The Skyline Problem · H 715 Range Module · H 699 Falling Squares

#### dsa.design-ds
M 146 LRU Cache · H 460 LFU Cache · M 380 Insert Delete GetRandom O(1) · M 1146 Snapshot Array · M 622 Design Circular Queue · M 641 Design Circular Deque · E 706 Design HashMap · E 705 Design HashSet · M 284 Peeking Iterator · M 341 Flatten Nested List Iterator · M 1352 Product of the Last K Numbers · H 432 All O`one Data Structure · E 1603 Design Parking System

#### conc.patterns (LeetCode concurrency problems)
E 1114 Print in Order · M 1115 Print FooBar Alternately · M 1116 Print Zero Even Odd · M 1117 Building H2O · M 1195 Fizz Buzz Multithreaded · M 1226 The Dining Philosophers

#### sql (LeetCode database problems; language `sql`; tag with the sql topic that fits)
E 175 Combine Two Tables · M 176 Second Highest Salary · M 177 Nth Highest Salary · M 178 Rank Scores · M 180 Consecutive Numbers · E 181 Employees Earning More Than Their Managers · E 182 Duplicate Emails · E 183 Customers Who Never Order · M 184 Department Highest Salary · H 185 Department Top Three Salaries · E 196 Delete Duplicate Emails · E 197 Rising Temperature · H 262 Trips and Users · M 550 Game Play Analysis IV · M 570 Managers with at Least 5 Direct Reports · M 585 Investments in 2016 · H 601 Human Traffic of Stadium · M 602 Friend Requests II: Who Has the Most Friends · M 608 Tree Node · M 626 Exchange Seats · M 1164 Product Price at a Given Date · M 1204 Last Person to Fit in the Bus · M 1321 Restaurant Growth · M 1341 Movie Rating · M 1934 Confirmation Rate

### 8.2 Quant puzzle bank (original wording, answers included)

These are classic folk puzzles written in our own words. Store them as `SeedProblem` with `source: "quant"`, the `prompt` text, and a separate `answer` and `answerNote` field (hidden until the owner submits or asks). Answers are for automatic checking: accept equivalent forms (fractions, decimals within 0.5%). Mark open-ended ones `answer: null` and grade them with Claude.

| id | Topic | Prompt | Answer |
|---|---|---|---|
| q-hh | prob.expected-value | You flip a fair coin until you see two heads in a row. On average, how many flips does it take? | 6 |
| q-ht | prob.expected-value | You flip a fair coin until you see a head immediately followed by a tail. On average, how many flips? | 4 |
| q-first-six | prob.distributions | You roll a fair die until the first 6 appears. What is the expected number of rolls? | 6 |
| q-all-faces | prob.expected-value | You roll a fair die until every face has appeared at least once. Expected number of rolls? | 14.7 |
| q-birthday-23 | puzzles.probability | 23 people, birthdays uniform over 365 days. Probability that at least two share a birthday? | about 0.507 |
| q-monty | puzzles.probability | Three doors, one prize. You pick a door; the host, who knows where the prize is, opens another door with no prize and offers a switch. Probability of winning if you switch? | 2/3 |
| q-stick | prob.continuous | A stick is broken at two independent uniformly random points. Probability the three pieces form a triangle? | 1/4 |
| q-max-two-uniform | prob.distributions | Expected value of the larger of two independent Uniform(0,1) numbers? | 2/3 |
| q-min-n-uniform | prob.distributions | Expected value of the smallest of n independent Uniform(0,1) numbers? | 1/(n+1) |
| q-ruin-prob | prob.markov | You start with 3 rupees and bet 1 rupee on fair coin flips until you have 0 or 10. Probability you reach 10? | 3/10 |
| q-ruin-time | prob.markov | In the game above, what is the expected number of flips until it ends? | 21 |
| q-hats | prob.random-variables | n people put hats in a pile and each takes one at random. Expected number who get their own hat? | 1 |
| q-derangement | math.combinatorics | In the hat game, as n grows large, what is the probability nobody gets their own hat? | 1/e (about 0.368) |
| q-two-children | prob.foundations | A family has two children and at least one is a boy. Probability both are boys? | 1/3 |
| q-disease-test | prob.foundations | A disease affects 1% of people. A test catches 99% of sick people and wrongly flags 5% of healthy people. You test positive. Probability you are sick? | 1/6 (about 0.167) |
| q-sum-seven | prob.foundations | Probability that two fair dice sum to 7? | 1/6 |
| q-reroll-once | prob.expected-value | You roll a die and are paid its value, but you may reroll once and must accept the second roll. With the best strategy, what is the game worth? | 4.25 |
| q-reroll-twice | prob.expected-value | Same game but you may roll up to three times, taking the last roll you choose to stop at. Value of the game? | 14/3 (about 4.667) |
| q-first-ace | prob.random-variables | A standard deck is shuffled. Expected number of cards you turn over up to and including the first ace? | 53/5 = 10.6 |
| q-meeting | prob.continuous | Two friends each arrive at a uniformly random time between 12:00 and 1:00 and wait 15 minutes for the other. Probability they meet? | 7/16 |
| q-uniform-sum-one | prob.expected-value | You keep adding independent Uniform(0,1) numbers until the total exceeds 1. Expected count of numbers drawn? | e (about 2.718) |
| q-max-two-dice | prob.random-variables | Expected value of the larger of two fair dice? | 161/36 (about 4.472) |
| q-six-in-four | prob.foundations | Probability of at least one 6 in four rolls of a fair die? | 671/1296 (about 0.518) |
| q-runs | prob.random-variables | Expected number of runs (maximal blocks of equal outcomes) in 10 fair coin flips? | 5.5 |
| q-second-smallest | prob.distributions | Expected value of the middle one of three independent Uniform(0,1) numbers? | 1/2 |
| q-ants | puzzles.probability | Many ants sit on a 1-meter pole, each walking left or right at 1 meter per minute. When two meet, both turn around. What is the longest possible time before every ant has fallen off? | 1 minute |
| q-lockers | puzzles.logic | 100 closed lockers. Person k toggles every kth locker, for k = 1 to 100. How many lockers end open? | 10 (perfect squares) |
| q-poison | puzzles.logic | 1,000 bottles, exactly one poisoned. A tester shows symptoms 24 hours after drinking any poison. Minimum testers needed to find the bottle in 24 hours? | 10 |
| q-twelve-coins | puzzles.logic | 12 coins, one counterfeit that is either heavier or lighter. Minimum balance weighings to find it and say whether it is heavier or lighter? | 3 |
| q-ropes | puzzles.logic | Two ropes each take exactly 60 minutes to burn but burn unevenly. How do you measure exactly 45 minutes? | open (method): light rope A at both ends and rope B at one end; when A is gone (30 min), light B's other end (15 more) |
| q-egg-drop | puzzles.logic | Two identical eggs and a 100-floor building. Minimum number of drops that guarantees finding the highest safe floor? | 14 |
| q-bridge | puzzles.logic | Four people cross a bridge at night with one torch; at most two cross at a time at the slower person's pace. Their times are 1, 2, 5 and 10 minutes. Minimum total time? | 17 |
| q-horses | puzzles.logic | 25 horses, races of 5, no timer. Minimum races to find the three fastest? | 7 |
| q-clock | puzzles.logic | Angle between the hour and minute hands at 3:15? | 7.5 degrees |
| q-nim | puzzles.games | Nim with heaps of 3, 4 and 5; players alternate removing any number from one heap; taking the last object wins. Does the first player win with perfect play? | Yes (3 XOR 4 XOR 5 = 2, not 0) |
| q-twenty-one | puzzles.games | 21 coins; players alternately take 1 to 3; whoever takes the last coin wins. Who wins, and what is the first move? | First player; take 1 and leave a multiple of 4 |
| q-kelly | markets.betting | A bet pays even money and you win it 60% of the time. What fraction of your bankroll does the Kelly criterion bet? | 0.2 |
| q-dice-market | markets.making | Make a two-sided market on the sum of two dice, then explain how you'd adjust after someone lifts your offer. | open |
| q-fermi-cars | math.mental | Estimate the number of cars in a city of 20 million people. Show your structure. | open |
| q-sqrt50 | math.mental | Estimate the square root of 50 to two decimal places without a calculator. | about 7.07 |
| q-envelopes | puzzles.probability | Two envelopes, one holds twice the other. You open one and see X. "Switching gives 1.25X on average," says a friend. What is wrong with the argument? | open |

Add at least 40 more of your own original puzzles across `prob`, `math`, `puzzles` and `markets` (mix easy, medium, hard), with verified answers.

### 8.3 Pattern drill prompts (F10)

Write **at least 270 original drill prompts**: at least 3 for each of the 90 DSA `(pattern)` concepts. Each prompt is 2 to 4 sentences, describes a problem in an everyday setting in fresh words, and is **not** a rewording of a known platform problem. Include `answerConceptIds`, a one-line `keyInsight`, and a difficulty. Examples of the style:

- "A delivery app logs how many orders arrive each minute. Find the longest stretch of consecutive minutes where the total stayed at or below 500 orders." → sliding window (variable size). Insight: all values are non-negative, so shrink from the left whenever the sum exceeds 500.
- "You have a list of meeting times for one room and want to know the fewest meetings to cancel so the rest don't overlap." → interval scheduling. Insight: keep meetings that end earliest.
- "Each city has flights with prices. Find the cheapest route from A to B using at most three flights." → Bellman-Ford (k-stops variant) or BFS by levels with relaxation. Insight: limit relaxation rounds to k + 1.

### 8.4 Design practice prompts (F26)

For every concept in `lld.classics` and `sysd.classics`, create a `SeedProblem` (`source: "design-lld"` or `"design-hld"`) with an original 3 to 6 sentence prompt stating the scope for a 45-minute interview, plus 3 to 5 "must discuss" points used as a rubric. Example:

- **Parking lot (LLD):** "Design the classes for a multi-floor parking lot that supports bikes, cars and trucks. Vehicles get a ticket on entry and pay on exit based on duration and vehicle type. Show how you'd add electric charging spots later." Must discuss: spot types and assignment strategy, ticket and payment flow, pricing as a strategy, concurrency when two cars take the same spot, extensibility.
- **URL shortener (HLD):** "Design a service that turns long URLs into short links and redirects users, handling 100 million new links per month and 10 times more redirects." Must discuss: ID generation and collisions, storage choice and size estimate, read-heavy caching, redirect latency, analytics without slowing redirects.

### 8.5 Behavioral question bank (F27)

Seed these questions (id, text, suggested story tags). Stories map to questions many-to-many.

Tell me about yourself · Why this company? · Why this role? · Tell me about a time you failed · A time you disagreed with a teammate · A time you had a conflict and how you resolved it · A time you took ownership beyond your role · Your most challenging project · A time you learned something quickly · A time you missed a deadline · A time you received critical feedback · A time you led without authority · A time you made a decision with incomplete data · A time you simplified something complex · A time you went above and beyond for a user · A mistake you made and what you changed · A time you had to prioritise between competing tasks · A time you convinced others to change direction · A time you worked under pressure · The project you're proudest of · Where do you see yourself in 3 years? · What are your strengths and weaknesses? · Why should we hire you? · A time you helped a struggling teammate · A time you improved a process · A time you handled ambiguity · A time you dealt with a difficult person · A time you had to say no · What would you do in your first 90 days? · Do you have any questions for us?

### 8.6 Default mistake tags (F8)

| Category | Tags |
|---|---|
| edge-case | Empty input · Single element · Duplicates not handled · Negative numbers · All elements equal · Very large input · Null or missing node |
| logic | Off-by-one · Wrong loop bounds · Forgot to reset state · Mutated input by accident · Wrong base case · Missing DP state or transition · Wrong comparison operator · Visited set misuse · Cycle not handled |
| complexity | Time limit exceeded (suboptimal approach) · Memory limit exceeded · Unnecessary copying |
| pattern | Wrong pattern chosen · Greedy used where DP was needed · Missed a simpler approach |
| language | Integer overflow · Floating point precision · Container misuse (wrong method or cost) · Iterator invalidation · Comparator bug |
| reading | Misread the problem · Missed a constraint · Wrong output format |
| other | Ran out of time · Panicked or froze · Didn't test before submitting |

The owner can add, rename, merge and archive tags. Merging re-tags all attempts.

---

## 9. Features

Every feature below is in scope. Each lists **why** (the pain point it solves), **what the owner sees**, **how it behaves**, and **done when** (acceptance criteria). Feature IDs (F1 to F30) must appear in `PROGRESS.md`.

### F1. App shell, navigation and theme

**Why:** everything must feel like one calm place.

**What the owner sees:**
- Desktop: a slim left sidebar with icons and labels: Today, Map, Problems, Review, Practice (drill, quizzes, mental math, puzzles), Mock interview, Designs, Stories, Mistakes, Dashboard, Revision, Settings. The sidebar collapses to icons only.
- A top bar with: global search (Ctrl/Cmd + K), today's minutes and streak (small), focus timer (F29), "Ask Claude" button (F20), theme toggle.
- Mobile (under 768 px): bottom tab bar with Today, Map, Problems, Review, More. "More" opens a sheet with the rest.
- Toasts for confirmations ("Attempt saved. Next review in 3 days"), always with undo when an action is destructive.

**Behavior:**
- Hash routes: `#/today` (home), `#/map`, `#/map?focus=<conceptId>`, `#/concept/<id>`, `#/problems`, `#/problems/<id>`, `#/review`, `#/drill`, `#/quiz`, `#/mental-math`, `#/puzzles`, `#/mock`, `#/mock/<id>`, `#/designs`, `#/designs/<id>`, `#/stories`, `#/mistakes`, `#/dashboard`, `#/weekly`, `#/revision`, `#/settings`.
- Theme: system, light or dark; sets `data-theme` on `<html>`.
- Loading: show the shell and a skeleton instantly; hydrate data in the background.
- Global error boundary with a friendly message and "Export my data" button, so data is never trapped by a bug.

**Done when:** every route renders, navigation works with keyboard and touch, theme switching is instant with no flash, and the layout works from 360 px to 2560 px wide.

### F2. The knowledge map

**Why:** the core idea. One zoomable picture of everything, showing what is learned, what is fading, and how ideas connect.

**What the owner sees:** a full-screen canvas on a subtle drafting grid. Subjects are soft regions with a name label. Topics and concepts are bubbles. Lines show prerequisites (solid, thin, with a small arrowhead) and cross-subject connections (dashed). Bubbles are colored by status (section 12.3).

**Region layout (neighborhoods):**
```
          lang ── oop ── lld
            \               \
   eng       DSA (largest,   os ── conc ── arch
            /   center)  \    |
   math ── prob            \  cn ── sysd
     |       |              \  |      |
  puzzles  markets    apt    dbms ── sql
                   career
```
`scripts/build-layout.mjs` computes positions at build time:
1. Place each subject's region center from the sketch above (scaled so regions never overlap; DSA region about 2.5 times the area of an average subject).
2. Place topics on a ring or spiral around their subject center, ordered by `order`, radius scaled by topic count.
3. Place concepts around their topic center in an arc, ordered by learning order.
4. Run a force simulation (collision radius by node size, a strong pull toward the topic center, weak link force on prerequisite edges inside a subject) for a fixed number of ticks with a fixed random seed, so the layout is identical on every build.
5. Write `src/data/layout.json` with `{ id: { x, y } }` for subjects, topics and concepts, plus a region outline (padded convex hull or smoothed blob path) per subject.

**Semantic zoom (answers "overwhelming vs fragmented"):**
- **Far (zoom below 0.3):** only subject regions, each with name, icon, a progress ring (share of track concepts that are strong), and a small coral badge with the count of fading concepts. Cross-subject links are bundled into one line per subject pair, thickness by link count.
- **Middle (0.3 to 0.7):** topic bubbles with a thin segmented bar showing the status mix of their concepts. Topic prerequisite arrows appear. Subject names stay as faint large labels.
- **Near (0.7 and above):** concept bubbles with labels, status fill, size by importance (must 36 px, important 28 px, advanced 22 px at zoom 1), a small "P" corner mark for patterns, a dot showing linked problem count, and a small clock mark when a review is due.
- Level changes cross-fade in about 150 ms. Labels never overlap: hide lower-importance labels when crowded.

**Interactions:**
- Pan by dragging the background; zoom with wheel, trackpad or pinch; zoom buttons and "fit all".
- Click a subject region at far zoom to fly to it. Click a topic to fly to it. Click a concept to open the concept panel (F3): a right-side drawer on desktop (about 440 px wide, resizable), a bottom sheet on mobile.
- Hover a concept (desktop) to show a tooltip (name, status, one-line scope) and highlight its prerequisites and dependents.
- Right-click or long-press a concept for a menu: Mark as studied, Set status manually, Quick quiz, Explain it back, Ask Claude, Show my path here (F25), Add to today's plan, Hide from map.
- Drag a bubble to move it; the new position is saved in `mapOverrides`. "Reset layout" in the map menu clears overrides.
- Filter bar: subjects (multi-select), status, importance, "Ready to learn" (as defined in section 11.5), "Due for review", and a switch to show or hide advanced concepts. The track filter comes from the profile but can be overridden on the map.
- **Focus mode:** with a concept selected, dim everything except its one-hop (or two-hop) neighborhood.
- Minimap in a corner with status-colored dots.
- Search (Ctrl/Cmd + K or `/`) jumps to a concept: the map flies there and the bubble pulses once.
- **Add your own concept:** from a topic's menu, "Add concept" (name, scope, importance). Custom concepts are stored as user data (`CustomConcept`, section 4), placed next to their topic without overlapping, look identical, and show a small "yours" mark. Their content can be written by the owner or generated with Claude (F20).

**Performance:** 60 fps panning with about 1,100 nodes (18 subjects, 146 topics, 909 concepts, plus custom concepts) on a mid-range laptop. Use React Flow's `onlyRenderVisibleElements`, memoized custom node components, Zustand selectors per node so a status change re-renders one bubble, not the map, and no layout computation at runtime.

**Done when:** all three zoom levels work smoothly, every concept from the syllabus is visible at near zoom, statuses update live after activity, filters and focus mode work, positions persist, and the map is usable with touch on a phone.

### F3. Concept panel

**Why:** "choose your depth" plus everything about one idea in one place.

**Layout:**
- **Header:** breadcrumb (Subject › Topic), concept name, status chip, importance tag, estimated minutes, track tags, "unverified" badge if `needsReview`. The status chip opens a **"Why this color?"** popover showing the evidence: knowledge score and where it came from, problems solved alone (by difficulty) for patterns, last review, next review, and what would turn it green.
- **Tabs:** Learn, Practice, Notes, Ask.
- **Learn tab:** a segmented control **Simple | Interview | Deep**. It remembers the last level per concept and defaults to Simple for not-started concepts and Interview otherwise. Below the content:
  - **Connections:** "Learn first" (prerequisites with status dots), "Unlocks" (dependents), "Connected ideas" (cross-links with their reason text). Each item is clickable and flies the map there.
  - **Interview questions:** collapsible list; each answer hidden until tapped.
  - Actions: **Mark as studied**, **Quick quiz** (F14), **Explain it back** (F13), **Ask Claude** (F20).
  - If content is missing: show the scope text and "Explain with Claude" (generates simple and interview levels, which the owner can save into the concept's note).
- **Practice tab:** linked problems (seed and custom) with difficulty, status and next review; "Suggested next problem" (easy first, then medium once two easy ones are solved alone, then hard once three medium ones are solved alone); for patterns, the **signals** and **template**; "Drill this pattern" (F10).
- **Notes tab:** markdown editor with live preview (split on desktop, toggle on mobile), autosaved. Below it, **Saved answers** from Claude, each collapsible, deletable, and movable into the note body.
- **Ask tab:** an inline Claude chat already scoped to this concept (the same component as F20).
- Back and forward buttons inside the panel keep a small history when jumping between connected concepts.

**Done when:** all three levels render with KaTeX and code highlighting, connections navigate correctly, notes autosave and survive reloads, and the "Why this color?" popover always matches the actual status calculation.

### F4. Mastery status and colors

**Why:** honest progress the owner can trust.

**Behavior:** statuses are computed from evidence by `lib/mastery` (algorithm in section 11.2) and recomputed after every relevant event (attempt saved, check recorded, concept studied, day change). The owner can set a manual status; manual strong still fades when a review is overdue, unless the owner turns on "never fade" for that concept (for trivial concepts). Status changes are logged in activity. When a concept turns strong, play the one "ink fill" moment described in section 12.6.

**Done when:** status logic is covered by unit tests for every rule in section 11.2, and a status never changes without a visible reason in the "Why this color?" popover.

### F5. Onboarding and self-assessment

**Why:** the owner has already studied some things; the map must not start as a sea of grey.

**Steps (a short, friendly wizard, skippable, re-runnable from Settings):**
1. Name and target track (SDE, Quant, Both).
2. Interview date (or "no date yet") and primary language.
3. Daily time (15, 30, 60, 90, 120 minutes or custom) and problem-to-theory balance.
4. Quick self-assessment per subject: "Haven't started", "Some", "Comfortable". For "Some" and "Comfortable", show that subject's topics as a checklist so the owner can tick topics they know.
   - Ticked topics under "Some": set `selfAssessed = 0.3` on their concepts (they show as `learning`).
   - Ticked topics under "Comfortable": set `selfAssessed = 0.5` and schedule a concept review within 3 days, so the app verifies with quick checks before turning anything green. Nothing turns strong from self-assessment alone.
   - Self-assessment is spread over the next week's reviews (at most about 15 concept reviews per day) so the owner isn't flooded.
5. AI mode: explain the modes available in this runtime and let the owner choose.
6. Import: "Already tracking problems somewhere?" → CSV import (F6) or skip.

**Done when:** a new owner reaches a useful Today plan in under 3 minutes, and all answers are editable later.

### F6. Problem library

**Why:** every problem in one place, attached to the map.

**What the owner sees:** a list with columns: status icon, number and title, difficulty chip, pattern chips, last result, last attempted, next review, star. On mobile, compact cards.

**Behavior:**
- Filters: topic, pattern concept, difficulty, status (to do, attempted, solved), due for re-solve, starred, source (LeetCode, SQL, quant, design, custom), owner tags, hide premium. Sort by any column. Text search by title or number. Toggle "group by topic".
- Header stats: solved counts by difficulty, solved this week, due today.
- **Quick add:** paste a LeetCode URL or type a title or number. If it matches the seed (by slug or number), open it. Otherwise create a custom problem, prefilled from the URL slug, asking for difficulty and concepts (with a "Suggest concepts with Claude" button).
- **CSV import:** columns `title, url, difficulty, date, result, minutes, notes` (all optional except title or url). Match to seed by slug or number; create attempts without code; show a preview with matched and unmatched rows before importing.
- Opening a problem goes to its workspace (F7).

**Done when:** all 435 seed LeetCode problems, the quant puzzles, the design prompts and custom problems are listed, filters combine correctly, quick add and CSV import work, and the list stays fast (virtualize if needed).

### F7. Problem workspace, code saving and attempts

**Why:** the owner asked for this directly: write code for a problem, save it under that problem, and see it again later.

**Layout (desktop split view, resizable):**
- **Left pane:** title, number, difficulty, "Open on LeetCode" link, pattern chips (click to open the concept), star, owner tags. Then:
  - **Insight** (one line, prominent, editable): "The one thing to remember about this problem."
  - **Problem summary** (short, editable): the owner's own restatement of the problem, so they don't need to open LeetCode every time.
  - **My notes** (markdown, collapsible): approach ideas, constraints and observations.
  - **Attempts timeline:** each attempt shows date, result icon, minutes, hints used, language, mode (normal, re-solve, mock). Click to view its code read-only. Select two attempts to see a **side-by-side diff** (use the `diff` package).
  - **Mistakes on this problem:** tags from all attempts.
- **Right pane:** CodeMirror editor with a language picker (defaults to the profile language; SQL for SQL problems; plain text for quant puzzles), line numbers, bracket matching, auto-indent, and a toggle for a starter template (a generic skeleton for the language, such as includes and an empty `class Solution`; the app doesn't know LeetCode's exact function signatures). A **timer** (start, pause, reset) that starts on the first keystroke when `prefs.timerAutoStart` is on. Buttons: **I'm stuck** (hint ladder, F11), **Review my code** (F12), **Dry run** (F12), **Save attempt**.
- **Mobile:** tabs "Problem" and "Code".

**Save attempt dialog:**
- Result as four large buttons: Solved alone, Solved with hints (auto-selected when hints were used), Saw the solution (auto-selected when the full solution was revealed), Not solved.
- Minutes (prefilled from the timer), time and space complexity, approach notes.
- Mistake tags (multi-select with search; suggested tags from the code review appear first).
- Insight field (required on the first successful solve; the dialog nudges but can be skipped).
- On save: append the attempt, update problem status and SRS (section 11.1), update linked concepts' evidence and statuses, log activity, mark a matching Today item done, show a toast with the next review date.

**Drafts:** unsaved editor content autosaves to `draft` 2 seconds after the owner stops typing and is restored when returning. "Discard draft" clears it.

**Limits:** code is stored as plain text. The app does not run C++ or Java code; the owner tests on LeetCode and saves the final code here. (Optional stretch, standalone runtime only: run JavaScript in a sandboxed worker. Hide the Run button where it cannot work.)

**Done when:** code for every attempt is saved and reappears after a reload and on another device (artifact runtime), diffs work, drafts never lose work, and saving an attempt updates the map within one second.

### F8. Mistake journal

**Why:** the owner repeats the same small mistakes.

**What the owner sees:**
- **Top mistakes** bar chart for the last 30 days, 90 days or all time, with a trend arrow per tag.
- **My pre-interview checklist:** the top 5 tags, each with a one-line "how to avoid it" (owner-editable; "Suggest with Claude" fills a draft).
- Breakdown by category and by pattern ("Off-by-one shows up most in binary search").
- Click a tag to list every attempt with it, linking to the code.
- Manage tags: add, rename, merge (re-tags attempts), archive.

**Done when:** tags from attempts roll up correctly, merge works, and the checklist appears in revision sheets (F19).

### F9. Re-solve reminders and review queue

**Why:** "I solved it last month and now I can't."

**What the owner sees:** a **Review** page with two lists: problems due for re-solve and concepts due for review, each sorted by urgency (overdue first), with counts in the sidebar badge.

**Re-solve mode:**
- Opens the workspace with an empty editor (or the starter template). The problem summary and the LeetCode link stay visible. Previous attempts, code, insight and notes are hidden behind a **Reveal** button that warns: "Revealing marks this attempt as 'saw the solution'."
- The owner solves and saves the attempt as usual; the scheduler updates the next review (section 11.1) and the toast says when it comes back.
- Solved problems enter review automatically; the owner can switch a problem out of review ("Don't bring this back").
- After three solo re-solves once the interval reaches 60 days, a problem is **retired** (mastered). Retired problems appear only in revision sheets and in their concept's problem list with a small "mastered" mark.

**Concept reviews:** a due concept opens a short review: its interview bullets, then a quick quiz or flashcards (F14), or explain it back (F13). The result updates the concept's schedule.

**Done when:** scheduling matches the unit-tested algorithm, hidden content really stays hidden until revealed, and the review queue is correct across day boundaries in the owner's local time zone.

### F10. Pattern drill

**Why:** recognizing the pattern is most of the battle in interviews.

**Flow:**
1. Choose a source: **Fresh prompts** (from the drill bank, section 8.3) or **My solved problems** (titles and the owner's own notes only, testing recall), and optionally focus on weak patterns.
2. A session of 5 prompts (configurable 3 to 10). Each shows the prompt and a 2-minute countdown.
3. The owner picks one or two pattern concepts from a searchable list and may type a one or two line approach.
4. Reveal: correct patterns, key insight, and the owner's result. Exact match is correct; a concept from the same topic counts as partial.
5. With AI available, Claude grades the typed approach (quick tier) and can **generate 5 new drill prompts** for the owner's weakest patterns (validated JSON, saved to the bank as `generated`).

**Tracking:** each answer records a `Check` of kind `drill` on the correct pattern concept, with a lower weight in knowledge (section 11.2). The drill page shows accuracy per pattern and **confusion pairs** ("You often pick two pointers when it's sliding window").

**Done when:** sessions work offline with the seed bank, results feed the dashboard, and confusion pairs are computed correctly.

### F11. Hint ladder

**Why:** stuck students either waste an hour or read the full solution and learn nothing.

**Behavior:** "I'm stuck" in the workspace opens a small panel with three steps revealed one at a time by explicit clicks:
1. **Nudge:** a question or observation pointing in the right direction, without naming the technique.
2. **Approach:** the technique and the key idea, in words.
3. **Pseudocode:** step-by-step outline, no real code. A warning appears before this level.

A fourth, separate button **Show full solution** asks for confirmation and marks the attempt as "saw the solution". With AI it shows a full explained solution (prompt 19 in section 10.4); without AI it opens the problem's LeetCode editorial page (`https://leetcode.com/problems/<slug>/editorial/`).

- **With AI:** Claude generates each level on demand (prompt in section 10.4). Hints are cached per problem and level so reopening costs nothing. The owner's current code is included so hints respond to where they are stuck.
- **Without AI:** a helpful offline ladder built from seed data: level 1 names the topic area and asks a guiding question from the pattern's signals; level 2 shows the pattern name and signals; level 3 shows the pattern template.
- Hints used are tracked on the attempt (`hintsUsed`).

**Done when:** levels only appear after clicks, the result auto-updates, hints are cached, and the offline ladder works for every seed problem with patterns.

### F12. Claude code review and dry run

**Why:** "my code works but I don't know if it's good."

**Review my code:** sends the problem, language, owner's claimed complexity and the code. Shows a structured result (JSON schema in section 10.4):
- Correctness concerns with line references.
- Time and space complexity, and whether it is optimal (with the optimal complexity).
- Edge cases missed.
- Better approach, described in words (code only if the owner asks).
- Code quality notes (naming, structure, idiomatic use of the language).
- **Suggested insight** (one click to use) and **suggested mistake tags** (one click to add).

The review is stored on the attempt. **Dry run:** the owner gives a small input (or lets Claude choose one); Claude traces the code step by step in a table of variable states and states the output, flagging where behavior differs from the expected answer.

**Done when:** reviews render cleanly, suggestions can be applied in one click, invalid JSON is handled gracefully (show the raw text and a "Try again" button), and both features are hidden or switched to copy-prompt mode when AI is unavailable.

### F13. Explain it back

**Why:** explaining in your own words is how real understanding forms, and interviews test explanation.

**Behavior:** in the concept panel, "Explain it back" opens a text area: "Explain <concept> as if to a friend who's never heard of it." Minimum 40 words (show a gentle counter).
- **With AI:** Claude grades with the rubric in section 10.4 and returns a score from 0 to 5, what was right, what was missing, any misconceptions, a better short explanation, and one follow-up question. The owner can answer the follow-up to improve the score.
- **Without AI:** a self-check: the concept's interview bullets appear as a checklist; the owner ticks the ones they covered; score = ticked / total.
- The result is saved as a `Check` (score divided by 5 for AI grading).

**Done when:** both modes record checks, and history of past explanations is visible in the concept's Notes tab.

### F14. Quizzes and flashcards

**Why:** fast, repeatable checks for theory subjects (OS, CN, DBMS, OOP, probability).

**Modes:**
- **Flashcards (offline):** from seeded `questions`. Show the question, reveal the answer, rate **Again, Hard, Good, Easy** (scores 0, 0.4, 0.8, 1). Sessions can cover one concept, a topic, a subject, or "everything due".
- **Quick quiz (AI):** 5 questions (mix of multiple choice and short answer) generated for a concept or topic (schema in section 10.4). Multiple choice is auto-graded; short answers are graded by Claude in one batch call.
- Each session writes `Check` records per concept and updates concept SRS.

**Done when:** flashcards work completely offline for every concept with seeded questions, quizzes validate JSON before showing, and results move statuses as specified.

### F15. Mock interview

**Why:** practicing under interview conditions, including communication.

**Types:**
- **DSA (45 minutes):** Claude acts as the interviewer. It picks a problem from the seed matching the owner's weakest patterns (or the owner picks one) and states it in its own words, the way an interviewer would, or invents an original problem for that pattern. A stepper shows the phases: Clarify, Approach, Code, Test, Complexity, Follow-ups. The owner chats in a side panel and codes in the editor. Claude asks follow-ups ("What if the input is sorted?", "Can you do it in O(1) space?"). A visible countdown runs; Claude wraps up near time.
- **Theory rapid-fire (20 minutes):** questions across chosen subjects, one at a time, with brief feedback after each.
- **Design (45 minutes):** LLD or HLD using the design workspace (F26), with Claude as interviewer.
- **Behavioral (20 minutes):** questions from the bank; the owner answers in text; Claude probes like a real interviewer.

**End of session:** feedback JSON (section 10.4): scores 1 to 5 for problem solving, communication, code quality, complexity analysis, edge cases (or the relevant rubric for other types), strengths, improvements, and a hire signal on a four-point scale. Saved as a `MockSession`; the code becomes an attempt with mode `mock`. A history page shows past sessions and score trends.

**AI availability:** needs `sample` or API mode. In copy-prompt mode, generate a complete mock interview script prompt to paste into a claude.ai chat, plus a form to paste back the final feedback.

**Done when:** a full DSA mock runs end to end with streaming replies, a Stop button works, sessions survive a page reload mid-way (turns are saved every exchange), and feedback is saved.

### F16. Today plan (home screen)

**Why:** "what should I do today?" should never need thinking.

**What the owner sees:**
- A short greeting with the date, and the interview countdown if a date is set ("41 days to go").
- **Time budget** selector: 15, 30, 60, 90, 120 minutes or custom. Changing it regenerates the not-yet-done items and keeps done ones.
- **Minimum day** switch for bad days: a 15-minute plan with one small thing that keeps momentum.
- **The plan:** 3 to 8 items, each with an icon, title, plain-language reason ("You solved this 7 days ago. Time to check it stuck."), estimated minutes, and actions: **Start** (deep link to the right screen), **Done**, **Skip**, **Swap** (shows up to 3 alternatives of the same kind).
- A progress bar of minutes done vs budget.
- Below the plan: **Ready to learn next** (up to 5 concepts, section 11.5), **Fading** (count, link to Review), and a small streak and heatmap preview.

**Behavior:** generated by `lib/planner` (section 11.4) on first open each day and saved as `DayPlan`. Items auto-complete when the owner does the underlying action anywhere in the app. Focus subjects ("This week: Graphs and OS") bias new learning. Near the interview date (14 days or less) the plan shifts toward revision: more re-solves, no new advanced concepts, and a daily revision sheet item.

**Done when:** the plan is sensible for a new owner, a mid-way owner and one a week before interviews (write unit tests with fixture data for all three), items auto-complete, and swapping never produces duplicates.

### F17. Readiness dashboard

**Why:** "am I ready, and where am I weak?"

**Sections:**
- **Overall readiness** ring (0 to 100) for the chosen track, with a "Why?" breakdown by subject weight (section 11.3).
- **Subjects** bars, weakest first; click opens the subject on the map.
- **Pattern grid:** a tile per DSA pattern, colored by practice score, showing easy, medium and hard counts solved alone. Tiles with zero hard problems get a subtle outline.
- **Status mix** per subject (stacked bars: not started, learning, strong, fading).
- **Problems over time:** weekly solved count by difficulty (line or bar chart).
- **Memory health:** reviews due today, overdue count, and retention (share of re-solves solved alone in the last 30 days).
- **Weakness report:** top 5 weakest must-know concepts, top 3 patterns without any hard problem solved, and subjects untouched for 14 days. Each item has a one-click "Add to today".
- **Projection** (if an interview date is set): "At your pace over the last 14 days, you'll reach about X of Y must-know concepts by <date>." Show the math on hover.

**Done when:** every number is traceable to data (hover or popover explains it), charts render in both themes, and the page loads in under a second with a year of data.

### F18. Weekly review

**Why:** step back once a week without guilt.

**Behavior:** on the first open after Sunday 18:00 local time (or on demand from the dashboard), show a summary of the past 7 days: minutes, problems solved by difficulty, concepts that turned strong, new fading concepts, top mistakes, drills and mocks done. With AI, Claude writes a short, kind, specific reflection and suggests up to 3 focus subjects for next week; the owner can accept them (sets `focusSubjects`). Past weekly summaries are viewable (store the numbers in `activity` so they are cheap to rebuild).

**Done when:** the numbers match the activity data and the owner can accept suggested focus subjects in one click.

### F19. Revision sheet generator

**Why:** before an interview, everything that matters, from the owner's own data, in one place.

**Scopes:**
- **1-day sheet** (aim for two printed pages): pre-interview mistake checklist, insights from starred and "tricky" problems (two or more lapses), interview bullets for fading and weak must-know concepts, and key formulas for quant.
- **1-week sheet:** grouped by subject: interview bullets for all learning and fading must-know concepts, every pattern with signals and template, insights of all solved problems grouped by pattern, and the mistake checklist.
- **Custom:** pick subjects, topics or patterns.

**Output:** a clean, printable page (print stylesheet, page breaks between subjects), plus **Export as Markdown** and **Export as HTML** through the `FileSaver` adapter. Optional "Tighten with Claude" (complex tier) compresses a sheet into a shorter cheat sheet, clearly labeled as AI-edited, keeping the original too.

If printing is blocked in the artifact frame, the Print button falls back to exporting HTML (section 2.5).

**Done when:** sheets build fully offline from local data, printing looks good in light theme regardless of the app theme, and exports download in both runtimes.

### F20. Ask Claude anywhere

**Why:** a tutor who knows your context, available on every screen.

**Behavior:**
- A drawer opened from the top bar button or the `A` shortcut. A chat interface with streaming answers and a Stop button.
- **Context chips** automatically attached based on the current screen (current concept, current problem with the owner's code, current mock, or "general"). The owner can remove chips before sending.
- Quick actions under each answer: **Simpler**, **Deeper**, **Give an example**, **Quiz me on this**, **Save to concept** (pick a concept; default is the current one).
- Chat history stays in memory for the session; only saved answers persist.
- Never calls Claude automatically on load; every call is an explicit owner action.

**Done when:** context chips build correct prompts (section 10.3), streaming and cancel work with built-in Claude and with an API key, copy-prompt mode opens the copy modal, and saved answers appear in the concept's Notes tab.

### F21. AI modes and settings

**Why:** AI must work in every runtime and never surprise the owner.

**Behavior:**
- Settings shows the detected runtime and available modes:
  - **Built-in Claude** (artifact runtime, `sample` capability): answers use the owner's Claude plan. The first call asks for permission (handled by claude.ai).
  - **API key** (standalone): key field (masked), "Test connection" button, model per tier (editable), and a note that API use is billed separately by Anthropic.
  - **Copy prompt** (anywhere): no setup.
- Every AI feature goes through `AIProvider` and shows a consistent **thinking** state ("Thinking…" until the first text arrives), streaming text, a Stop button, and clear errors (section 10.5).
- **Copy-prompt UX:** a modal showing the full prompt, a **Copy** button, an **Open Claude** button (standalone only), and a paste-back box. If the feature expects JSON, the app parses the pasted text tolerantly (the whole text, a fenced block, or the first `{` to the last `}`); if parsing fails, it saves the text as a plain note and tells the owner. If copying to the clipboard is blocked, use the selectable text area fallback from section 2.5.

**Done when:** switching modes works without reload, the API key never leaves IndexedDB except in the request header to `api.anthropic.com`, and every AI feature degrades to copy-prompt mode instead of breaking.

### F22. Export, import and backup

**Why:** months of work must never be lost.

**Behavior:**
- **Export everything** to one JSON file (`atlas-backup-YYYY-MM-DD.json`) excluding secrets.
- **Import:** validate with zod, run migrations, preview counts (concept states, problems, attempts, notes), then **Merge** (newer `updatedAt` wins per item; attempts are unioned by id) or **Replace** (typed confirmation).
- **Backup reminder:** a gentle banner if the last export is older than 7 days (dismissable for 3 days). Show "Last backup: <date>" in Settings.
- **Markdown export** of all notes and saved answers, grouped by subject and topic.
- Exports use the `FileSaver` adapter (the `downloads` capability in the artifact runtime, a Blob download in standalone). Import uses a file input with `FileReader`.
- **Reset** all data with typed confirmation ("RESET"), after offering an export.

**Done when:** export then import into a fresh browser reproduces identical state (write a round-trip test), and merge handles conflicts as specified.

### F23. Search and command palette

**Why:** jump anywhere instantly.

**Behavior:** Ctrl/Cmd + K opens a palette (use `cmdk`). Searches concepts (name, scope, and simple content), topics, subjects, problems (title, number), notes, mistake tags, stories and design problems. Fuzzy matching with typo tolerance; results grouped by type with icons and status dots. Commands: Go to any page, Start drill, Start flashcards for due concepts, New attempt for…, Ask Claude…, Export backup, Toggle theme, Generate 1-day revision sheet. Recent items appear when the query is empty. Build the search index once at load and update it incrementally.

**Done when:** results appear within 50 ms for typical queries, and every command works from the keyboard alone.

### F24. Settings

Profile (name, track, interview date, primary language, daily minutes, problem-to-theory balance, focus subjects), appearance (theme, reduced motion override, map label density, show advanced concepts), learning (review intensity: gentle, normal or intense, which multiplies SRS intervals by 1.25, 1 or 0.8; streak freeze on or off), AI (F21), data (export, import, backup reminder, reset), and About (app version, runtime detected, storage used, schema version, a link to `DEPLOY.md` instructions).

### F25. Path to a concept

**Why:** "I want to learn Dijkstra. What do I need first?"

**Behavior:** "Show my path here" computes every unmet prerequisite: transitive concept-level prerequisites, plus the must-know concepts of prerequisite topics, minus anything already learning or strong. It lists them in topological order with status and estimated minutes, shows the total time, and highlights the path on the map (dimming everything else). **Add to plan** puts the next one or two items into today's plan; **Set as focus** adds the concept's subject to focus subjects.

**Done when:** paths are correct on hand-checked examples (unit tests), and highlighting works at all zoom levels.

### F26. Design practice (LLD and HLD)

**Why:** design rounds need structured practice too.

**What the owner sees:** a list of design problems from section 8.4 with status and last score. Opening one gives a workspace with a 45-minute timer and sectioned editors:
- **LLD:** Requirements, Entities and classes, Relationships, Key methods and APIs, Design patterns used, Concurrency concerns, Code (CodeMirror), Extensions.
- **HLD:** Functional and non-functional requirements, Estimates, API, Data model, High-level architecture, Deep dives, Bottlenecks and trade-offs.
- **Architecture sketch:** the owner writes lines like `Client -> API Gateway : HTTPS` and `API Gateway -> URL Service`; the app renders a clean box-and-arrow diagram with React Flow and an automatic layered layout (`@dagrejs/dagre`). No drawing tools needed.
- **Review with Claude:** grades against the problem's must-discuss rubric (JSON in section 10.4): a score per rubric point, missed points, and concrete suggestions. Attempts are saved as `DesignAttempt` and count as practice evidence for the linked `lld.classics` or `sysd.classics` concept.

**Done when:** sections autosave, the sketch renders reliably from the text syntax (with helpful error messages for bad lines), and reviews are stored with the attempt.

### F27. Behavioral story bank

**Why:** behavioral rounds reward prepared, specific stories.

**Behavior:**
- Stories list with a STAR editor (situation, task, action, result), tags (leadership, conflict, failure, ownership…), and linked questions from section 8.5.
- **Coverage matrix:** questions × stories, highlighting questions with no story yet.
- **Practice:** a random question, a 2-minute timer, the owner answers in text (or picks a story to deliver). With AI, Claude critiques clarity, specificity, measurable impact, length and structure, and suggests a tighter version.
- **"Tell me about yourself" builder:** a guided template (present, past, why this role) producing a 90-second script with a word count and estimated speaking time.

Practice answers and critiques are saved in the story's `practice` list (or, when no story was picked, on a story titled "Unsorted practice"), and each practice records a `Check` on `career.behavioral` concepts.

**Done when:** stories link to questions both ways, the matrix is accurate, and practice results are saved.

### F28. Quant practice: puzzles and mental math

**Why:** quant interviews test probability, puzzles and fast arithmetic.

**Puzzles:** a library of the quant seed (section 8.2) filtered by topic and difficulty. Each puzzle has an answer box. Numeric answers are checked automatically (accept fractions, decimals and simple expressions such as `1/e`, within 0.5% relative tolerance; parse expressions with a small safe parser supporting numbers, `+ - * / ^`, parentheses, `e`, `pi` and `sqrt`, never with `eval`); open-ended ones are graded by Claude or self-graded against the answer note. Hint ladder (F11) works here too. Attempts are saved like problems and feed the linked concepts.

**Mental math sprint** (fully offline, generated locally):
- Modes: **Speed arithmetic** (80 questions in 8 minutes: mixed addition, subtraction, multiplication and division with integers and one-decimal numbers, answers that divide cleanly), **Fractions and percentages**, **Number sequences** (find the next term), and **Estimation** (answers within 5% count).
- Difficulty tiers from 2-digit by 1-digit up to 3-digit by 2-digit multiplication.
- Keyboard-first: type the answer and press Enter; instant green or red feedback; skip with Tab.
- Results saved as `MentalMathRun`; a chart shows score and speed over time. Runs record checks on the matching concepts: speed arithmetic on `math.mental` "Fast arithmetic" and "Speed drills"; fractions and percentages on "Fractions, decimals and percentages"; estimation on "Approximations".

**Done when:** answer checking handles equivalent forms, the sprint feels instant (no lag between questions), and history charts work.

### F29. Focus timer, activity heatmap and streak

**Why:** gentle structure, no guilt.

**Behavior:**
- A focus timer in the top bar (25 and 5 minutes by default, configurable). Minutes count toward today's activity. Attempt timers also count; overlapping time is not double-counted.
- A year heatmap on the dashboard (color intensity by minutes).
- A streak counter shown small. One **streak freeze** per week: a missed day uses the freeze automatically instead of breaking the streak. No red warnings, no shaming copy.

**Done when:** activity totals are correct across midnight and time zones, and the heatmap and streak agree with the data.

### F30. Accessibility, keyboard, mobile and performance

- **Keyboard:** everything reachable by keyboard with visible focus rings. Shortcuts (shown with `?`): `Ctrl/Cmd + K` palette, `g t` Today, `g m` Map, `g p` Problems, `g r` Review, `a` Ask Claude, `n` new attempt (in a problem), `Ctrl/Cmd + S` save attempt (prevent the browser's own save), `Esc` closes panels. Single-key shortcuts work only when the focus is not in a text field or the editor.
- **Screen readers:** semantic landmarks, labeled controls, and a **list view of the map** (subjects → topics → concepts with statuses) as an accessible alternative to the canvas.
- **Color independence:** status uses shape as well as color (section 12.3). Contrast meets WCAG AA in both themes.
- **Reduced motion:** honor `prefers-reduced-motion` and the Settings override; replace motion with instant state changes.
- **Mobile:** touch targets at least 44 px; bottom sheets instead of side drawers; the editor stays usable with the on-screen keyboard; no horizontal page scrolling.
- **Performance budgets:** first render of the shell under 1.5 s on a mid-range phone; interactions respond within 100 ms; map pans at 60 fps; the artifact file stays under 15 MB.

---

## 10. AI layer

### 10.1 The `AIProvider` interface

```ts
export type Tier = "quick" | "default" | "complex";

export interface AIRequest {
  task: AITask;                          // e.g. "hint", "review", "explain-grade" (for logging and caching)
  instructions: string;                  // standing instructions (see 10.4)
  input: string | { role: "user" | "assistant"; content: string }[]; // prompt, or chat turns ending on a user turn
  tier?: Tier;                           // default "default"
  json?: ZodSchema<any>;                 // when set, parse and validate the reply
  onText?: (fullTextSoFar: string) => void;
  signal?: AbortSignal;                  // a NEW AbortController per call
  cacheKey?: string;                     // app-level cache in memory and storage (hints, generated content)
}

export type AIResult<T = unknown> =
  | { ok: true; text: string; data?: T; truncated: boolean; tierUsed?: Tier }
  | { ok: false; code: AIErrorCode; message: string; partialText?: string };
```

`AITask` is a string union with one entry per prompt in section 10.4 (for example `"explain" | "generate-content" | "hint" | "review" | "dry-run" | …`). `AIErrorCode` covers the `sample` error codes in section 10.2 plus `"network"`, `"auth"` (bad API key) and `"http_error"` for API mode. `ZodSchema` comes from `zod`.

Three implementations:

1. **`SampleAIProvider`** (artifact runtime). Because `sample` has no separate system prompt, send the instructions as the first user turn: `input = [{ role: "user", content: instructions + "\n\n" + prompt }]` for one-shot calls, or `[{ role: "user", content: instructions }, ...turns]` for chats. Use `sample.json()` when a schema is given, then validate with zod.
2. **`AnthropicApiProvider`** (standalone, owner's key). `POST https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`, and `anthropic-dangerous-direct-browser-access: true` (required for browser calls). Put `instructions` in `system`. Always send `max_tokens` (quick 1,024, default 4,096, complex 8,192; raise to 8,192 for deep explanations and revision sheets). Stream with `stream: true` and parse server-sent events for `content_block_delta` text deltas. Map tiers to model ids from Settings. Defaults at the time of writing: quick `claude-haiku-4-5-20251001`, default `claude-sonnet-5`, complex `claude-opus-5-5`. **Check the current model list at docs.claude.com when you build**, and keep these editable in Settings. For JSON tasks, instruct "Reply with only JSON matching this shape" and parse tolerantly.
3. **`CopyPromptProvider`**: builds `instructions + "\n\n" + prompt` as one text, opens the copy modal (F21), and resolves with whatever the owner pastes back (or `{ ok: false, code: "cancelled" }`).

**Tolerant JSON parsing** (API and copy modes): try the whole text; else the body of the first fenced code block; else the substring from the first `{` or `[` to the last `}` or `]`. Validate with zod. On failure return `invalid_json` with the raw text.

**App-level cache:** hints, generated concept explanations, and code reviews are stored with the related data (so they cost nothing to reopen). Chat turns are never cached.

### 10.2 Using the artifact runtime capabilities correctly (contract 0.2.54)

Follow these rules exactly; they come from the platform's type definitions.

**`sample` (ask Claude):**
- `const sample = await claude.use("sample")`; `null` means unavailable: fall back to copy-prompt mode.
- `await sample(input, options)` resolves `{ text, truncated, modelTierApplied }`. `await sample.json(input, options)` resolves the parsed JSON (validate it yourself).
- `input` is a string or turns `[{ role: "user" | "assistant", content }]` that start and end with a user turn. There is no system role. At most 64 KiB of text in total: truncate context (see 10.3).
- Options: `onText({ text, delta })` where `text` is the **whole answer so far** (assign it, never append it); `signal` from a **new** `AbortController` per call; `modelTier: "quick" | "default" | "complex"`; `cache: false` for chat turns and "try again" buttons (the default caches identical calls for 5 minutes).
- Show "Thinking…" from the call until `onText` first fires (this covers the consent dialog and queueing). Calls on the default and complex tiers can take 5 to 60 seconds before the first text; always offer a Stop button.
- Errors reject with `{ code, message, text? }`. Branch on `code`, never retry from a loop:
  - `cancelled`: restore the idle UI (keep `e.text` if useful).
  - `not_granted`, `sampling_disabled`, `not_declared`, `capability_disabled`, `capability_removed`: switch this session to copy-prompt mode and show a small notice.
  - `rate_limited`: tell the owner to try again in a bit; keep the button.
  - `refused`: clear any partial text and say Claude declined; suggest rephrasing.
  - `invalid_json`: show the raw text (`e.text`) with a "Try again" button.
  - `prompt_too_large`: shrink context and tell the owner.
  - `upstream_error` and unknown codes: keep partial text, mark it interrupted, offer manual retry.
- Only call on an explicit owner action (a button), never on load, from a loop, or on a timer.

**`db` (storage):** see section 4.3 for layout and rules. Key reminders: `db.doc(path)` needs an even number of segments; `db.collection(path)` an odd number; subscribe with `onSnapshot` once per document (never in render); one write at a time per document; no transactions (last writer wins); at most 64 subscriptions per view; 5,000 documents and 256 KiB per document.

**`user`:** `const user = await claude.use("user")`; `await user.id()` gives the stable id used in `data/users/<id>/`. If it resolves `null`, use IndexedDB instead and tell the owner their data won't sync across devices.

**`downloads`:** `const downloads = await claude.use("downloads")`; `await downloads.save({ filename, data })` shows a confirmation to the owner. Allowed extensions include `json`, `md`, `html`, `txt`, `csv`, `pdf`. A `declined` rejection is normal; never auto-retry. If `downloads` is `null`, show the content in a dialog with a Copy button instead.

**Publishing declaration:** `{ "sample": {}, "db": {}, "user": {}, "downloads": true }`. A page that declares `db` is organization-internal, which is fine because only the owner uses it.

### 10.3 Context builder

`lib/ai/context.ts` assembles context blocks for prompts. Every block is plain text with a heading, and the total prompt stays under 48 KiB (leaving headroom under the 64 KiB limit). Truncation order when too long: older chat turns, then long notes, then code (keep the start and end), never the instructions.

```
## Learner
Track: SDE | Primary language: C++ | Interview in 41 days
Strong concepts (use these for analogies): Hash table internals, BFS, Two pointers …   (max 15, most related first)
Frequent mistakes: Off-by-one, Empty input, Integer overflow   (top 5)

## Concept
Name: Dijkstra's algorithm (DSA › Shortest paths) | Importance: must | Status: learning
Scope: min-heap, non-negative weights, O((V + E) log V)
Simple: …   Interview points: …   (from seed content, trimmed)

## Problem
LC 743 Network Delay Time (medium) | Patterns: Dijkstra's algorithm
Learner's own notes: … (max 1,500 characters)

## Learner's code (C++)
…(max 12,000 characters)
```

### 10.4 Prompt library

All prompts live in `lib/ai/prompts.ts` as functions returning `{ instructions, input, tier, json? }`. Every set of instructions starts with this shared preamble:

```
You are the tutor inside Atlas, a study app for a student preparing for SDE and quant interviews.
Write in plain, friendly English with short sentences. Use markdown. Use the learner's primary language for code unless asked otherwise.
Be accurate. If you are not sure about something, say so. Never invent facts. When you describe a known problem, use your own words and don't claim to quote its official statement.
Tailor explanations to what the learner already knows (see "Strong concepts").
```

Task-specific instructions and output formats:

**1. Explain a concept at a level** (tier: default; complex for Deep)
> "Explain {concept} at the {simple | interview | deep} level. Simple: 2 to 4 sentences with one everyday analogy. Interview: 4 to 7 bullets covering definition, key facts, complexity, when to use it, common follow-ups and pitfalls. Deep: a structured explanation with intuition, a small worked example traced step by step, code, complexity, edge cases and variants. Where helpful, connect it to one of the learner's strong concepts."

**2. Generate missing seed-style content** (tier: complex, JSON)
Output: `{ "simple": string, "interview": string[], "questions": [{ "q": string, "a": string }], "signals"?: string[] }`

**3. Hint ladder** (tier: default)
> "The learner is stuck on this problem. Give ONLY hint level {1 | 2 | 3}. Level 1: one guiding question or observation; do not name the technique or data structure. Level 2: name the technique and explain the key idea in words; no code, no pseudocode. Level 3: numbered pseudocode steps; no real code in any language. Respond to where the learner's code currently is. Keep it under 120 words. Never reveal the full solution."

Offline fallback in section 9, F11.

**4. Code review** (tier: default, JSON)
```json
{
  "verdict": "correct" | "likely correct" | "has bugs" | "incomplete",
  "correctnessConcerns": [{ "line": 12, "issue": "string" }],
  "timeComplexity": "O(n log n)",
  "spaceComplexity": "O(n)",
  "isOptimal": true,
  "optimalComplexity": "O(n)",
  "edgeCasesMissed": ["string"],
  "betterApproach": "string (words only, no code)",
  "codeQuality": ["string"],
  "suggestedInsight": "one line, under 20 words",
  "suggestedMistakeTags": ["exact labels from the provided tag list"]
}
```
Provide the owner's tag list in the prompt so suggestions match real tags.

**5. Dry run** (tier: default)
> "Trace the learner's code on this input: {input or 'choose a small, revealing input'}. Show a markdown table of the important variables after each meaningful step (at most 15 rows), then the final output, then say whether it matches the expected answer and where it first goes wrong if not."

**6. Explain-it-back grader** (tier: default, JSON)
```json
{
  "score": 0-5,
  "correctPoints": ["string"],
  "missingPoints": ["string"],
  "misconceptions": ["string"],
  "betterExplanation": "3 to 5 sentences",
  "followUpQuestion": "string"
}
```
Rubric in the instructions: 5 = complete, accurate, clear, with an example; 4 = accurate with one minor gap; 3 = mostly right, missing an important point; 2 = partial understanding or one misconception; 1 = mostly incorrect; 0 = off-topic. Grade against the concept's interview points, which are included in the prompt.

**7. Quiz generator** (tier: default, JSON): 5 questions.
```json
[{ "type": "mcq", "question": "string", "options": ["a","b","c","d"], "answerIndex": 2, "explanation": "string", "conceptId": "string" },
 { "type": "short", "question": "string", "modelAnswer": "string", "explanation": "string", "conceptId": "string" }]
```
Short answers are graded in one batch call returning `[{ "index": 0, "score": 0-1, "feedback": "string" }]` (tier: quick).

**8. Drill approach grader** (tier: quick, JSON): `{ "patternCorrect": boolean, "approachScore": 0-1, "feedback": "one or two sentences" }`

**9. Drill prompt generator** (tier: default, JSON): `[{ "text": string, "answerConceptIds": string[], "keyInsight": string, "difficulty": "easy" | "medium" | "hard" }]`. Include the list of allowed pattern concept ids and names in the prompt; validate that every returned id exists.

**10. Mock interviewer** (tier: default, chat, `cache: false`)
> "Act as a friendly but rigorous interviewer at a top tech company for a {type} interview. Run the phases in order: {phases}. Ask one thing at a time. Don't give away the solution; if the candidate is stuck for a while, offer a small hint and note it. Ask realistic follow-ups. Keep replies short, like a real interviewer speaking. When the candidate says they're done or time is almost up, wrap up politely."
The app sends phase and remaining time as a short note in each user turn (for example `[Phase: Code | 18 min left]`).

**11. Mock feedback** (tier: complex, JSON)
```json
{
  "scores": { "problemSolving": 1-5, "communication": 1-5, "codeQuality": 1-5, "complexity": 1-5, "edgeCases": 1-5 },
  "strengths": ["string"],
  "improvements": ["string"],
  "hireSignal": "strong yes" | "yes" | "lean no" | "no",
  "summary": "3 to 5 sentences"
}
```
For design and behavioral mocks, replace the score keys with the relevant rubric (design: requirements, high-level design, deep dive, trade-offs, communication; behavioral: structure, specificity, impact, reflection, communication).

**12. Design review** (tier: complex, JSON): `{ "rubric": [{ "point": string, "score": 0-2, "comment": string }], "missed": [string], "suggestions": [string], "overall": 1-5 }`

**13. Story critique** (tier: default, JSON): `{ "clarity": 1-5, "specificity": 1-5, "impact": 1-5, "structure": 1-5, "lengthNote": string, "tighterVersion": string, "tips": [string] }`

**14. Weekly reflection** (tier: default): short markdown (under 150 words) plus JSON on the last line `{ "focusSubjects": ["dsa", "os"] }`, parsed separately.

**15. Revision sheet tightening** (tier: complex): "Compress this revision sheet to about {n} words, keeping every formula, complexity and mistake item; remove repetition; keep the section structure."

**16. Open-ended puzzle grader** (tier: default, JSON): `{ "correct": boolean, "score": 0-1, "feedback": string, "idealReasoning": string }`

**17. Concept suggestions for a custom problem** (tier: quick, JSON): `{ "conceptIds": [string], "difficulty": "easy" | "medium" | "hard" }` (validate ids).

**18. Mistake "how to avoid" suggestions** (tier: quick, JSON): `[{ "tag": string, "howToAvoid": "one line" }]`

**19. Full solution** (tier: default; only after the owner confirms "Show full solution")
> "Explain a complete, optimal solution to this problem: the key insight, the approach step by step, clean code in the learner's language with brief comments, time and space complexity, and the edge cases handled. Then give a one-line insight the learner should remember."

### 10.5 AI UX rules

- Every AI button states what will happen ("Get hint 1", "Review my code"), never a vague "Generate".
- Show "Thinking…" with a subtle animated indicator until text arrives, then stream. Always show Stop for calls that may take more than a few seconds.
- Label AI-generated content with a small "Claude" tag. Let the owner save, copy, or discard it.
- Never overwrite owner-written notes with AI text; append or offer "Move into notes".
- Errors are specific and actionable ("Claude isn't available in this view. Use copy-prompt mode?"), never raw error strings.

---

## 11. Algorithms

All algorithms are pure functions in `src/lib/*` with unit tests. Constants live in `src/lib/constants.ts`. Dates use the owner's local time; "day" boundaries are local midnight; due dates are stored as dates (`yyyy-mm-dd`) so "due today" is stable all day.

The fields these algorithms use (`soloStreak`, `everStrong`, `strongSince`, `reviewIntensity`) are defined in section 4.

### 11.1 Spaced repetition

**Problems.** `PROBLEM_STEPS_DAYS = [1, 3, 7, 14, 30, 60, 120]`.

`interval(step) = round(PROBLEM_STEPS_DAYS[step] × intensity × difficultyFactor)`, where `intensity` is 1.25 (gentle), 1 (normal) or 0.8 (intense), and `difficultyFactor` is 1.1 for easy, 1 for medium and 0.9 for hard. Minimum 1 day.

On saving an attempt:

| Situation | Result | New step | Other effects |
|---|---|---|---|
| First ever attempt | solved alone | 1 | status `solved`, `soloStreak = 1` |
| First ever attempt | solved with hints | 0 | status `solved`, `soloStreak = 0` |
| First ever attempt | saw solution or not solved | 0 | status `attempted` (it comes back tomorrow) |
| Attempt when due or overdue | solved alone | step + 1 (max 6) | `soloStreak += 1` |
| Attempt when due or overdue | solved with hints | same step | `soloStreak = 0` |
| Attempt when due or overdue | saw solution or not solved | 0 | `lapses += 1`, `soloStreak = 0` |
| Early attempt (before due) | solved alone | same step, rescheduled from today | none |
| Early attempt (before due) | anything else | as "due" rows above | |

Every first attempt puts the problem in review (`inReview = true`) unless the owner turned review off for it. `dueAt = today + interval(newStep)`. **Retire** when a solo solve happens at step 5 or higher and `soloStreak ≥ 3`. A problem is **tricky** when `lapses ≥ 2`. Attempts in mock mode count like normal attempts.

**Concepts.** `CONCEPT_STEPS_DAYS = [2, 5, 12, 25, 50, 90]`, multiplied by the same `intensity` (no difficulty factor). A concept enters review when it is first marked studied or receives its first check (step 0, due in 2 days). Each review event (a check recorded while the concept is due or overdue, or an explicit concept review session) updates:

| Check score | New step |
|---|---|
| ≥ 0.8 | step + 1 (max 5) |
| 0.5 to 0.79 | same step |
| < 0.5 | max(0, step − 2), `lapses += 1` |

Checks recorded before the due date update `knowledge` but do not move the step. Drill checks move the step only when the answer was fully correct and the concept was due.

### 11.2 Knowledge, practice and status

**Knowledge (0 to 1)** for a concept:
- Take the latest check of each kind within the last 180 days: explain (weight 1.0), quiz (1.0), flashcard (average of the last 3, weight 0.9), drill (fraction correct of the last 5, weight 0.6), manual (a manual "strong" counts as 0.8).
- `knowledge = max(kindScore × kindWeight)` over kinds present.
- If the concept is marked studied, knowledge is at least 0.3. If it has `selfAssessed`, knowledge is at least that value (0.3 or 0.5) until real checks exist (section 9, F5).
- If the newest check is older than 120 days, multiply by 0.8.

**Practice (0 to 1)** for concepts with linked problems:
- For each linked problem, use its most recent attempt: solved alone counts full weight, solved with hints counts half; saw solution or not solved counts zero. Weights: easy 0.5, medium 1, hard 1.5.
- `practice = min(1, sum / 3)`. Also compute `hasMediumPlus` (a medium or hard solved alone).

**Overdue:** a concept is overdue when `today > dueAt + grace`, with `grace = max(2 days, 25% of the current interval)`. A pattern concept is also treated as overdue if two or more of its linked problems are overdue beyond their own grace.

**Status rules**, applied in order:
1. **Manual status set:** use it, except a manual `strong` becomes `fading` when overdue (unless `neverFade`).
2. **No evidence** (not studied, not self-assessed, no checks, no attempts on linked problems): `not_started`.
3. **Strong criteria:** `knowledge ≥ 0.8`, and additionally:
   - for pattern concepts with linked problems: `practice ≥ 1` and `hasMediumPlus`;
   - for other concepts with linked problems (for example SQL topics or quant puzzles): `practice ≥ 0.66`.
4. Strong criteria met and not overdue: `strong` (set `everStrong = true`, and `strongSince` if newly strong).
5. Overdue, and (`everStrong` or `knowledge ≥ 0.6`): `fading`.
6. Otherwise: `learning`.

**"What would turn it green"** lists the unmet parts of rule 3 in plain words: "Score 80% or more on a quick quiz or explain it back", "Solve 1 more medium problem on your own", "Review it (due 3 days ago)".

Topic and subject summaries are counts and shares of these statuses over the concepts in the current track.

### 11.3 Readiness score

```
conceptScore = 0                                          if not_started
             = 100 × base × recency                        otherwise
base    = 0.5 × knowledge + 0.5 × practice                 if the concept has linked problems
        = knowledge                                        otherwise
recency = 1                                                if not overdue
        = max(0.5, 1 − overdueDays / (2 × currentInterval)) if overdue
```

When a pattern is overdue because of its linked problems, use the most overdue linked problem's `overdueDays` and interval.

- **Subject readiness** = weighted mean of concept scores in the track, weights by importance: must 3, important 2, advanced 0.5. Exclude hidden concepts and other-language `lang` concepts.
- **Overall readiness** = weighted mean of subject readiness with these subject weights (sum to 100):

| Subject | SDE | Quant |
|---|---|---|
| dsa | 34 | 24 |
| sysd | 12 | 0 |
| oop | 7 | 2 |
| lld | 7 | 0 |
| os | 8 | 4 |
| cn | 7 | 0 |
| dbms | 7 | 0 |
| sql | 4 | 0 |
| lang | 4 | 7 |
| conc | 3 | 4 |
| eng | 2 | 0 |
| career | 2 | 2 |
| apt | 2 | 3 |
| prob | 0 | 22 |
| math | 0 | 10 |
| puzzles | 1 | 9 |
| markets | 0 | 8 |
| arch | 0 | 5 |

For **Both**, average the two columns. A subject with weight 0 for a track still appears on the map and can be studied; it just doesn't count toward that track's overall readiness. Every number on the dashboard must be explainable from these formulas in a popover.

**Projection:** `pace = (must-know concepts that became strong in the last 14 days) / 14`; `projected = currentStrongMust + pace × daysLeft`, capped at the total. Show as a range (±20%) because pace varies.

### 11.4 Daily planner

Inputs: date, budget `B` minutes, profile, all states, due lists. Deterministic for the same inputs (seed any tie-breaking randomness with the date string).

**Time estimates:** re-solve easy 15, medium 25, hard 40; concept review bundle 8 to 12; learn a concept = `estMinutes` (default 25); new problem easy 20, medium 30, hard 45; drill 6; mental math 8; mock 45; design practice 45; story practice 10; revision sheet 20.

**Steps:**
1. **Minimum day** (switch on, or `B ≤ 15`): one item only. Prefer the most overdue easy or medium re-solve; else a flashcard bundle of up to 3 due or fading concepts; else a drill. Done.
2. **Daily staples** (when `B ≥ 45`): one drill; plus mental math for Quant or Both tracks.
3. **Reviews block** (up to 45% of `B`; 60% within 14 days of the interview): overdue and due problem re-solves ranked by `(overdueDays / interval) × importanceWeight`, tricky problems first; then fading concepts, then due concepts, bundled 3 or 4 per flashcard item.
4. **New learning** with the remaining time, split by the balance setting (default 60% problems, 40% theory):
   - **Theory:** the top recommended concepts (section 11.5), at most 2 new concepts per day.
   - **Problems:** pick the pattern with the lowest practice score among patterns that are learning or ready to learn (focus subjects first); pick an unsolved seed problem using the difficulty ramp (easy until 2 easy are solved alone in that pattern, then medium; hard after 3 medium solved alone). Skip premium problems if the owner hides them.
5. **Weekly extras:**
   - A mock interview if none in the last 7 days, `B ≥ 90`, and overall readiness ≥ 30 (prefer weekends).
   - Design practice once a week for SDE or Both if `sysd` readiness < 60 and `B ≥ 90`.
   - Story practice (10 minutes) twice a week when the interview is 45 days away or less.
6. **Interview within 14 days:** add a revision sheet item daily (1-week sheet if more than 3 days away, 1-day sheet otherwise); no new advanced concepts; new problems only medium from the weakest patterns.
7. **Fit to budget:** total within ±10% of `B`, never more than 15 minutes over. If one item alone exceeds the budget, choose a smaller alternative.
8. **Reasons:** every item gets a plain-language reason from templates, for example: "Due for review: you solved it alone 7 days ago." "Ready to learn: you're strong in its prerequisites BFS and Heaps." "Your weakest pattern: sliding window (1 medium solved)."

**Swap** offers the next best candidates of the same kind that are not already in the plan.

### 11.5 Recommendations ("ready to learn")

A concept is **ready** when it is `not_started`, belongs to the track, every concept-level prerequisite is learning or strong, and at least 60% of the must-know concepts in each prerequisite topic are learning or strong. Ignore prerequisites that are outside the owner's track, and treat a prerequisite topic with no must-know concepts as satisfied.

Rank ready concepts by, in order: importance (must first); in a focus subject; `subjectWeight × (1 − subjectReadiness / 100)`; learning order within the topic (earlier first). Exclude advanced concepts within 14 days of the interview.

### 11.6 Drill statistics and confusion pairs

Each drill answer stores `{ promptId, correctConceptIds, pickedConceptIds, correct: boolean }` in the check's `detail`. Accuracy per pattern = correct / total over the last 60 days. A **confusion pair** (picked X, correct Y, X ≠ Y) is shown when it occurs at least twice; show the top 5.

### 11.7 Activity and streaks

A day is **active** if it has at least 10 minutes of activity or any attempt, check, or completed plan item. The streak counts consecutive active days ending today (or yesterday, if today isn't over). One **freeze** per ISO week covers a single missed day when the next day is active. Heatmap color levels: 0, 1 to 29, 30 to 59, 60 to 119, 120 or more minutes.

---

## 12. Visual design system

### 12.1 Design brief

- **Subject:** a personal study atlas for an engineering student preparing for demanding interviews.
- **Audience:** one person, using it daily for months, often late at night, on a laptop and a phone.
- **Primary job:** show clearly what to do next and how far they've come, without overwhelm.
- **Concept: "the drafting table".** The map is a plan being drawn over time. The canvas is a calm drafting surface with a faint grid; knowledge is "inked in" as it is mastered. Engineering drawings are the owner's future profession, so the metaphor is grounded, and it steers away from generic dashboard looks.
- **Spend boldness in one place:** the map, and the moment a concept is inked in. Everything else is quiet, disciplined, and fast.

### 12.2 Tokens

Define every value as a CSS custom property in `src/styles/tokens.css`, with light and dark sets following the artifact theming rules in section 2.5. Default theme: follow the system.

**Dark theme, "night drafting":**

| Token | Hex | Use |
|---|---|---|
| `--canvas` (Blueprint) | `#0E2233` | App and map background |
| `--surface` (Plate) | `#142C40` | Panels, drawers, cards |
| `--surface-raised` | `#1A3550` | Popovers, menus |
| `--rule` (Rule) | `#25445E` | Borders, dividers; grid lines at 35% opacity |
| `--text` (Chalk) | `#E6EEF5` | Primary text |
| `--text-muted` (Graphite) | `#93A9BD` | Secondary text |
| `--accent` (Cyan ink) | `#6CC3F0` | Links, focus rings, primary buttons, selection |

**Light theme, "drafting table":**

| Token | Hex | Use |
|---|---|---|
| `--canvas` (Paper) | `#F3F6F9` | Background (cool, not cream) |
| `--surface` (Sheet) | `#FFFFFF` | Panels, cards |
| `--surface-raised` | `#FFFFFF` + shadow | Popovers |
| `--rule` | `#D3DEE8` | Borders, grid |
| `--text` (Ink) | `#0E2233` | Primary text |
| `--text-muted` (Pencil) | `#4E6477` | Secondary text |
| `--accent` | `#1F6FB2` | Links, focus, primary buttons |

Subject regions get a faint tint (6 to 8% opacity) from `regionHue` using cool hues only (blues, teals, violets, slate), so region tints never compete with status colors. Regions are also labeled by name and icon, so hue is never the only cue.

Spacing: 4 px base (4, 8, 12, 16, 24, 32, 48). Radius: 6 px for controls, 10 px for panels, full round for bubbles and chips. Use hierarchy in radius and elevation deliberately; don't put the same card treatment on everything. Shadows only for floating layers (popovers, menus, dialogs), none on in-flow content.

### 12.3 Status glyphs (color **and** shape)

| Status | Dark fill / stroke | Light fill / stroke | Shape |
|---|---|---|---|
| Not started | none / `#93A9BD` | none / `#7C90A2` | hollow ring |
| Learning | `#F0B442` half / `#F0B442` | `#F4C75A` half / `#A97408` | ring with the lower half filled |
| Strong | `#4CC38A` / `#4CC38A` | `#57C28F` / `#1F7A4D` | solid disc with a small check cut-out at large sizes |
| Fading | `#EF6B5B` / `#EF6B5B` | `#F08A7E` / `#B23A2C` | solid disc with a dashed outer ring |

Use the same glyphs everywhere (map, lists, chips, dashboard). Difficulty is shown differently to avoid confusion with status: a neutral chip with 1, 2 or 3 small bars plus the word "Easy", "Medium" or "Hard".

### 12.4 Typography

- **IBM Plex Sans** for the interface and reading text (weights 400, 500, 600).
- **IBM Plex Sans Condensed** for map labels, dense tables and chart labels, where width is precious.
- **IBM Plex Mono** only for code, not for decorative labels.
- Scale (px): 12, 13, 14, 16, 18, 22, 28, 36. Body 15 to 16 with line height 1.55. Headings line height 1.2, weight 600, sentence case. Reading content (concept levels, notes) at 16 px with a max line length of about 70 characters.

### 12.5 Layout wireframes

**Today (home):**
```
┌ sidebar ┬──────────────────────────────────────────────────────────┐
│ Today   │ Good evening, <name>           41 days to go    [60 min▾] │
│ Map     │ ───────────────────────────────────────────────────────── │
│ Problems│ ▓▓▓▓▓▓░░░░░░░░  25 of 60 min            [Minimum day ○]   │
│ Review 4│                                                           │
│ Practice│ ◐ Re-solve: LC 739 Daily Temperatures       25 min [Start]│
│ Mock    │   Due for review. You solved it alone 7 days ago.         │
│ Designs │ ● Flashcards: Paging, TLB, Deadlock          10 min [Start]│
│ Stories │ ○ Learn: Dijkstra's algorithm                 25 min [Start]│
│ Mistakes│   Ready: you're strong in BFS and Heaps.                  │
│ Dash    │ ○ New problem: LC 743 Network Delay Time      30 min [Start]│
│ Revision│                                                           │
│ Settings│ Ready to learn next · Fading (3) · Streak 12 days          │
└─────────┴──────────────────────────────────────────────────────────┘
```

**Map with the concept panel:**
```
┌───────────────────────────────────────────┬──────────────────────┐
│ [Subjects▾][Status▾][Ready][Due]  ⌕        │ DSA › Shortest paths │
│                                           │ Dijkstra's algorithm │
│      ·  ·  grid  ·  ·                      │ ◐ Learning  Must  25m│
│   ( OS )        ○──◐                       │ [Learn][Practice]... │
│            ◐──●──○   DSA                   │ (Simple|Interview|Deep)
│    ( CN )   ●─ ─ ─ ─◐                      │ …content…            │
│                                           │ Learn first: ● BFS   │
│ [minimap]                     [+][−][fit] │ Unlocks: ○ 0-1 BFS   │
└───────────────────────────────────────────┴──────────────────────┘
```

**Problem workspace:**
```
┌──────────────────────────────┬──────────────────────────────────┐
│ LC 743 Network Delay Time    │ [C++ ▾] [template]   ⏱ 12:40 ⏸   │
│ Medium · Dijkstra ↗ LeetCode │ 1  class Solution {              │
│ Insight: _________________   │ 2    ...                         │
│ ▸ My notes                   │                                  │
│ Attempts                     │                                  │
│  ● 12 Sep  alone  22m  C++   │                                  │
│  ◐ 2 Sep   hints(2) 40m      │ [I'm stuck] [Review] [Dry run]   │
│ Mistakes: Off-by-one         │                  [Save attempt]  │
└──────────────────────────────┴──────────────────────────────────┘
```

**Dashboard:** a readiness ring with its "Why?" breakdown at top left, subject bars to its right, then the pattern grid full width, then charts in two columns, then the weakness report. Left-aligned throughout; no centered hero.

### 12.6 Motion

- Panels and sheets: 160 to 200 ms ease-out slide and fade. Dialogs: 150 ms fade and scale from 98%.
- Map fly-to: 400 ms ease-in-out.
- **The signature moment (the only decorative animation):** when a concept becomes strong, its bubble fills like ink spreading from the center (about 500 ms), then prerequisite lines to newly ready concepts draw in with a stroke animation (about 400 ms). It plays once per change, only if the concept is on screen.
- No looping animations, no entrance animations on every section, no hover effects on every card.
- With reduced motion: state changes are instant.

### 12.7 Components

Build a small component kit in `src/components/ui` on the tokens: Button (primary, secondary, ghost; at most one primary per view), IconButton (with accessible label), SegmentedControl, Tabs, Drawer, BottomSheet, Dialog, Popover, Tooltip, Toast, Chip (status, difficulty, pattern, tag), StatusGlyph, ProgressRing, SegmentedBar, Tile, Input, Textarea, Select, MultiCombobox (search plus multi-select), Switch, Slider, Timer, Kbd, EmptyState, Skeleton, MarkdownView (KaTeX and code highlighting), CodeEditor, CodeView, DiffView, chart wrappers. Dense lists use bordered rows, not stacks of rounded cards.

### 12.8 Writing in the interface

- Sentence case everywhere. Plain verbs on buttons: "Save attempt", "Start drill", "Review my code". The same action keeps the same name through the flow ("Save attempt" leads to the toast "Attempt saved").
- No exclamation marks in system copy, no "successfully", no "please", no "simply".
- Empty states invite action: "No problems yet. Add your first one by pasting a LeetCode link." with an "Add problem" button.
- Errors say what happened and what to do: "Couldn't reach Claude. Check your connection and try again."
- Reasons in the plan and popovers are specific and kind, never guilt-inducing.

### 12.9 Avoid these generic defaults

- All-caps labels and tracked-out eyebrow text above headings.
- Monospace fonts for non-code labels.
- Arrows appended to button text, and "A · B · C" meta strings in the interface (a single separator in dense metadata rows is fine).
- Warm cream backgrounds with a terracotta accent; near-black with a neon accent.
- Identical rounded cards with soft shadows for every piece of content; gradient washes as decoration.
- Big-number hero stats with a gradient accent.
- Fade-and-slide entrance animations on every section.

---

## 13. Build plan

Build in this order. The owner asked for the problem tracker first (it is useful from day one), then the map, then Claude features, then planning. Each phase ends with: all checks passing, a commit and push, `PROGRESS.md` updated, and a short summary for the owner of what now works, how to try it, and what to click (section 0). One phase per session is a good default; a large phase can span several sessions.

### Phase 0: project setup
- Vite + React + TypeScript (strict), Tailwind v4, ESLint, Prettier, Vitest, path aliases.
- `CLAUDE.md` and `PROGRESS.md` (section 0).
- Two build targets: `vite.config.ts` (GitHub Pages, `base: "./"`) and `vite.artifact.config.ts` (single file). `scripts/check-artifact.mjs`.
- npm scripts: `dev`, `build`, `build:artifact`, `release:artifact`, `build:syllabus` (accepts `--strict`), `build:layout`, `typecheck`, `lint`, `test`. `build` and `build:artifact` run `build:syllabus` and `build:layout` first.
- GitHub Actions: `ci.yml` (typecheck, lint, test, both builds, artifact check) on every push; `deploy.yml` (build and deploy to GitHub Pages on pushes to `main`).
- Give the owner exact steps to turn on GitHub Pages (Settings → Pages → Source: GitHub Actions) after the first pull request is merged, and to check the site URL.
- **Done when:** `dist-artifact/index.html` is produced and passes the check, and a placeholder shell is live on GitHub Pages once the owner has merged the pull request and turned Pages on (or the owner has chosen to skip Pages).

### Phase 1: data foundation
- `src/lib/types.ts` (section 4), `Repository` interface, `DexieRepository`, `ClaudeDbRepository` (plus an in-memory fake implementing the same `db` contract for tests), migrations, runtime detection, providers.
- Export and import core (F22) with the round-trip test.
- `content/` folder with **every** topic file and **every** concept heading from section 6 (scope only at first), `scripts/build-syllabus.mjs` with all validations, cross-links from section 7 resolved, prerequisite chains added.
- `scripts/build-layout.mjs` producing `layout.json`.
- Seed banks from section 8 in `src/data/*.seed.ts` (problems, quant puzzles, design prompts, behavioral questions, mistake tags).
- **Done when:** `syllabus.generated.json` contains all 18 subjects with every topic and concept, validation passes (no duplicates, no missing references, no cycles), and seed data type-checks.

### Phase 2: design system and shell
- Tokens, fonts, theme switching, component kit (section 12.7), app shell and routing (F1), basic Settings (F24), command palette skeleton (F23).
- Review screenshots in both themes and on a 390 px wide viewport; fix issues.
- **Done when:** the shell looks finished and consistent, navigation works on desktop and mobile.

### Phase 3: Version 1, the problem tracker
- F6 problem library (seed plus custom, quick add, CSV import), F7 workspace with CodeMirror, attempts, drafts, timer, diff view, F8 mistake journal, F9 problem re-solve scheduling and review queue, full F22 export and import.
- Offline hint ladder (F11 without AI).
- **Done when:** the owner can add problems, write and save code per attempt, see it again after reloading, get re-solve reminders, and back up and restore everything.

### Phase 4: Version 2, the map and concepts
- F2 map with semantic zoom, filters, focus mode, drag persistence, minimap, search fly-to, custom concepts.
- F3 concept panel (Learn, Practice, Notes tabs; Ask tab placeholder until Phase 6), F4 mastery engine, F5 onboarding, F25 path to a concept, concept SRS, F14 flashcards offline, F13 offline self-check, accessible list view of the map.
- **Done when:** the map shows every concept with live statuses, statuses follow section 11.2 (unit tests), and onboarding produces a sensible starting map.

### Phase 5: content (must finish; split it across several sessions, one or two subjects per session, and never run two content sessions at the same time, to avoid merge conflicts)
- Write content for every concept following section 5.3, in the subject order given there. Mark uncertain facts `needsReview`.
- Write the pattern drill bank (section 8.3), extra quant puzzles (section 8.2), and design prompts with rubrics (section 8.4).
- Track counts per subject in `PROGRESS.md` (for example "DSA: 249 of 249 concepts have simple, interview and questions; 115 of 115 must-know have deep").
- **Done when:** every concept has simple, interview and questions; every must-know concept has deep; every pattern has signals and a template.

### Phase 6: Version 3, Claude inside
- `AIProvider` with all three implementations, context builder, prompt library (section 10), F21 settings and copy-prompt modal.
- F20 Ask Claude anywhere and the concept Ask tab, "Explain with Claude" for missing content, F11 AI hints, F12 code review and dry run, F13 AI grading, F14 AI quizzes, F10 drill grading and generation.
- **Done when:** every AI feature works in `sample` mode (test with a fake `sample` in unit tests and manually after publishing), in API mode, and in copy-prompt mode, with correct error handling.

### Phase 7: Version 4, planning and insight
- F16 Today plan with the planner (section 11.4) and its fixture tests, F17 dashboard, F18 weekly review, F19 revision sheets, F29 focus timer, heatmap and streak.
- **Done when:** the three planner scenarios in F16 produce sensible plans, and every dashboard number is explainable.

### Phase 8: practice extensions
- F15 mock interviews (all four types), F26 design practice with the sketch renderer, F27 story bank, F28 quant puzzles and mental math, full F10 drill with confusion pairs.
- **Done when:** each feature runs end to end and saves its results.

### Phase 9: polish and ship
- F30 audit: keyboard paths, screen reader labels, contrast, reduced motion, mobile layouts, performance budgets.
- Visual review of every screen in both themes and on mobile, with screenshots. Fix spacing, alignment and empty states.
- Run `npm run build:syllabus -- --strict` and fix every missing content item.
- Run `npm run release:artifact` and commit `release/atlas-artifact.zip`.
- Write `DEPLOY.md` (section 14) and a short `README.md` for the owner.
- **Done when:** the definition of done (section 15) is fully checked.

Also run `npm run release:artifact` at the end of Phases 3, 4, 6, 7 and 8, so the owner can try the artifact version as it grows.

---

## 14. Deployment

### 14.1 GitHub Pages (standalone runtime)
1. The `deploy.yml` workflow builds with `npm run build` and deploys `dist/` using `actions/upload-pages-artifact` and `actions/deploy-pages`.
2. The owner enables Pages once: repository Settings → Pages → Source: "GitHub Actions". On a free GitHub account this works only for public repositories (see section 0).
3. The workflow runs when changes reach `main`, which happens when the owner merges a pull request.
4. The site URL appears in the workflow run and in Settings → Pages. It works on phone and laptop. Data is stored per browser; use export and import to move it.

### 14.2 claude.ai artifact (Claude built in, synced storage)
1. `npm run release:artifact` builds `dist-artifact/index.html` and zips it into `release/atlas-artifact.zip`, which is committed. The owner opens that file on GitHub (after merging the pull request) and clicks the download button.
2. The owner opens claude.ai, starts a new chat, uploads `atlas-artifact.zip`, and writes: **"Unzip this file and publish the index.html inside it as an artifact named Atlas, with the capabilities sample, db, user and downloads. Use the favicon 🧭."**
3. **Updating later (important):** to keep all saved data, the owner must update the **same** artifact, not publish a new one, because the `db` store belongs to one artifact. Before any update, export a backup from Settings. Then upload the new zip and write: **"Unzip this file and update my existing Atlas artifact at <artifact link> with the index.html inside it, keeping the same capabilities and favicon."**
4. The first time Claude is used inside the artifact, claude.ai asks the owner to allow it. Answers use the owner's own Claude plan.

### 14.3 API key mode (optional)
The owner creates a key at console.anthropic.com, pastes it into Settings → AI in the standalone app, and taps "Test connection". API usage is billed separately from the Claude subscription. The key stays in that browser only.

### 14.4 Local development
`npm install`, then `npm run dev`. Document every script in `README.md`.

---

## 15. Definition of done (final checklist)

- [ ] All 18 subjects, every topic and every concept from section 6 are on the map, with content complete per Phase 5.
- [ ] All cross-links in section 7 appear on both concepts and as dashed lines on the map.
- [ ] All seed banks from section 8 are loaded and linked to concepts.
- [ ] Features F1 to F30 are complete and marked done in `PROGRESS.md`, each with its "done when" satisfied.
- [ ] Every algorithm in section 11 has unit tests, including the planner scenarios and SRS tables.
- [ ] Export then import round-trip reproduces identical state.
- [ ] Both runtimes work: GitHub Pages build (IndexedDB, copy-prompt and API modes) and the single-file artifact build (db, sample, downloads), with graceful fallbacks when any capability is missing.
- [ ] The artifact file passes `check-artifact.mjs` (size and URLs).
- [ ] No secrets in the repository or in exports.
- [ ] Visual review done in light and dark themes and at 390 px, 768 px and 1440 px widths.
- [ ] Keyboard-only use works for every main flow; reduced motion is respected; contrast passes WCAG AA.
- [ ] `README.md` and `DEPLOY.md` are written for a beginner.

---

## 16. Out of scope (don't build unless the owner asks)

- Multiple users, accounts, sharing, leaderboards or social features.
- Running C++ or Java code inside the app (the owner tests on LeetCode).
- Scraping or copying problem statements from any platform.
- Push notifications and email reminders.
- Automatic sync between the GitHub Pages copy and the artifact copy (export and import cover this).
- Native mobile apps.

---

## Appendix A: first message to send to Claude Code

> Read `BUILD_SPEC.md` in the repository root from start to finish. It is the complete specification for the app I want you to build, and I'm a beginner, so follow it closely. Create `CLAUDE.md` and `PROGRESS.md` as described in section 0, then do Phase 0 and Phase 1 of the build plan in section 13. Take as much time as you need: I care about quality, smooth UI and UX, a beautiful design, and every feature working and connected to the full syllabus. When a phase is done, run all checks, commit, push, and tell me in simple words what I need to click (Create PR, merge, turn on GitHub Pages) and what I can try.

## Appendix B: message for later sessions

> Continue building the app. Read `CLAUDE.md`, `PROGRESS.md` and `BUILD_SPEC.md`. Check that the previous phase's work is in this branch, then do the next phase in `PROGRESS.md`. Keep following the phase order and the standing rules, and when the phase is done, tell me what to click and what I can try.
