// Realistic owners for the planner, dashboard, weekly review and revision sheet tests (F16 "done
// when": a new owner, one mid-way, and one a week before interviews), plus a year of data for the
// dashboard's one-second budget. Deterministic: every random choice comes from a fixed seed, and
// concept statuses are computed by the real status engine, so the cached statuses are the ones
// the app would store.
import { conceptById, conceptsByTopic, topicsBySubject } from "@/data/syllabus";
import { DRILL_PROMPTS } from "@/data/drills.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { seedProblemsByConcept } from "@/data/seed";
import { MISTAKE_TAG_SEED } from "@/data/mistakeTags.seed";
import { evaluateConcept } from "@/lib/readiness/evaluate";
import { hashSeed, mulberry32 } from "@/lib/random";
import { createDefaultProfile, seedTagsToRecords } from "@/lib/storage/defaults";
import { emptyExportData } from "@/lib/storage/exportImport";
import type { ExportData } from "@/lib/storage/schemas";
import { MOCK_PHASES, MOCK_SCORE_KEYS } from "@/lib/ai/prompts";
import { mockDates } from "@/lib/mock/mock";
import type { PlannerInput } from "@/lib/planner/planner";
import { practiceDates } from "@/lib/stories/stories";
import { addDaysToDate, localDate } from "@/lib/time";
import { designDates } from "@/stores/designStore";
import type {
  ActivityDay,
  ActivityMonth,
  Attempt,
  AttemptResult,
  Check,
  ConceptState,
  DesignAttempt,
  Difficulty,
  MockFeedback,
  MockSession,
  ProblemState,
  Profile,
  SrsState,
} from "@/lib/types";

/** Sunday 27 September 2026, the day the scenarios look at. */
export const DAY = "2026-09-27";
export const noonOf = (day: string) => new Date(`${day}T12:00:00`);
const iso = (day: string, hour = 10, minute = 0) =>
  new Date(
    `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
  ).toISOString();

export type ScenarioName = "new" | "mid" | "week";

interface Builder {
  data: ExportData;
  rand: () => number;
  checks: Check[];
  states: Record<string, ConceptState>;
  problems: Record<string, ProblemState>;
}

function baseProfile(overrides: Partial<Profile>, createdDay: string): Profile {
  const p = createDefaultProfile(noonOf(createdDay));
  return {
    ...p,
    name: "Sam",
    track: "sde",
    onboardingDone: true,
    // Last week's review was seen on Monday, so this week's opens after Sunday 18:00.
    weeklyReviewSeenAt: iso(addDaysToDate(DAY, -6), 9),
    ...overrides,
    updatedAt: iso(DAY, 8),
  };
}

function srs(step: number, dueAt: string | undefined, extra: Partial<SrsState> = {}): SrsState {
  const s: SrsState = { step, lapses: 0, soloStreak: 0, ...extra };
  if (dueAt) s.dueAt = dueAt;
  return s;
}

function conceptState(id: string, day: string, extra: Partial<ConceptState>): ConceptState {
  return {
    conceptId: id,
    status: "not_started",
    everStrong: false,
    studied: false,
    knowledge: 0,
    srs: srs(0, undefined),
    firstActivityAt: iso(day, 9),
    lastActivityAt: iso(day, 9),
    updatedAt: iso(day, 9),
    ...extra,
  };
}

function check(b: Builder, conceptId: string, kind: Check["kind"], score: number, day: string) {
  const stamp = iso(day, 11, b.checks.length % 60);
  b.checks.push({
    id: `chk-${b.checks.length}`,
    conceptId,
    kind,
    score,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

let attemptSeq = 0;
function attempt(
  problemId: string,
  day: string,
  result: AttemptResult,
  minutes: number,
  tags: string[] = [],
  mode: Attempt["mode"] = "normal",
): Attempt {
  attemptSeq++;
  return {
    id: `att-${problemId}-${attemptSeq}`,
    problemId,
    startedAt: iso(day, 19, 0),
    finishedAt: iso(day, 19, Math.min(59, minutes)),
    minutes,
    language: "cpp",
    code: `class Solution {\npublic:\n  int solve(vector<int>& a) {\n    // attempt ${attemptSeq}\n    return 0;\n  }\n};\n`,
    result,
    hintsUsed: result === "solved_with_hints" ? 1 : 0,
    mistakeTagIds: tags,
    mode,
  };
}

/** Topics of a subject in learning order. */
const topicIds = (subjectId: string, count: number) =>
  (topicsBySubject.get(subjectId) ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .map((t) => t.id);

const MISTAKES = ["mt-off-by-one", "mt-empty-input", "mt-integer-overflow", "mt-wrong-pattern"];

/** Marks the concepts of some topics as learned in a realistic mix and solves their problems. */
function progress(b: Builder, topics: string[], day: string, opts: { problems: boolean }) {
  let i = 0;
  let j = 0;
  for (const topicId of topics) {
    const list = (conceptsByTopic.get(topicId) ?? []).slice().sort((a, x) => a.order - x.order);
    for (const c of list) {
      const k = i++ % 6;
      if (k === 5) {
        check(b, c.id, "quiz", 0.9, addDaysToDate(day, -40));
        b.states[c.id] = conceptState(c.id, addDaysToDate(day, -40), {
          studied: true,
          everStrong: true,
          srs: srs(1, addDaysToDate(day, -12), { lastReviewedAt: iso(addDaysToDate(day, -40)) }),
        });
      } else if (k === 4) {
        check(b, c.id, "flashcard", 0.85, addDaysToDate(day, -10));
        b.states[c.id] = conceptState(c.id, addDaysToDate(day, -10), {
          studied: true,
          srs: srs(1, day, { lastReviewedAt: iso(addDaysToDate(day, -10)) }),
        });
      } else if (k === 2 || k === 3) {
        b.states[c.id] = conceptState(c.id, addDaysToDate(day, -3), {
          studied: true,
          srs: srs(0, addDaysToDate(day, 1)),
        });
      } else {
        check(b, c.id, "explain", 0.9, addDaysToDate(day, -8));
        b.states[c.id] = conceptState(c.id, addDaysToDate(day, -8), {
          studied: true,
          srs: srs(2, addDaysToDate(day, 4), { lastReviewedAt: iso(addDaysToDate(day, -8)) }),
        });
      }
      if (!opts.problems || !c.isPattern) continue;
      const linked = (seedProblemsByConcept.get(c.id) ?? []).filter(
        (p) => p.source === "leetcode" && !p.premium,
      );
      const byDiff = (d: Difficulty) => linked.filter((p) => p.difficulty === d);
      const picks = [...byDiff("easy").slice(0, 2), ...byDiff("medium").slice(0, i % 2 ? 1 : 0)];
      for (const p of picks) {
        if (b.problems[p.id]) continue;
        const n = j++;
        const solvedDay = addDaysToDate(day, -(8 + (n % 40)));
        const tricky = n % 11 === 3;
        const tags = n % 4 === 0 ? [MISTAKES[n % MISTAKES.length]!] : [];
        const attempts = [attempt(p.id, solvedDay, "solved_alone", 18 + (n % 20), tags)];
        let state: SrsState;
        if (tricky) {
          attempts.push(
            attempt(
              p.id,
              addDaysToDate(day, -6),
              "not_solved",
              35,
              ["mt-wrong-pattern"],
              "resolve",
            ),
          );
          attempts.push(
            attempt(p.id, addDaysToDate(day, -3), "saw_solution", 30, ["mt-off-by-one"], "resolve"),
          );
          state = srs(0, addDaysToDate(day, -2), { lapses: 2 });
        } else {
          const due =
            n % 5 === 0
              ? day
              : n % 5 === 1
                ? addDaysToDate(day, -3)
                : addDaysToDate(day, 2 + (n % 9));
          state = srs(2, due, { soloStreak: 1, lastReviewedAt: iso(solvedDay) });
        }
        b.problems[p.id] = {
          problemId: p.id,
          status: "solved",
          insight:
            n % 3 === 0
              ? `Keep a running ${n % 2 ? "window" : "map"}; each element moves once.`
              : undefined,
          starred: n % 7 === 0,
          tags: [],
          srs: state,
          inReview: true,
          attempts,
          updatedAt: iso(solvedDay, 20),
        };
        if (!b.problems[p.id]!.insight) delete b.problems[p.id]!.insight;
      }
    }
  }
}

/** Statuses from the real engine, as refreshConcepts would store them. */
function settleStatuses(b: Builder, day: string, profile: Profile) {
  const checksBy: Record<string, Check[]> = {};
  for (const c of b.checks) (checksBy[c.conceptId] ??= []).push(c);
  const now = noonOf(day);
  for (const [id, state] of Object.entries(b.states)) {
    const c = conceptById.get(id);
    if (!c) continue;
    const result = evaluateConcept(c, {
      profile,
      conceptStates: b.states,
      checks: checksBy,
      problemStates: b.problems,
      today: day,
      now,
      intensity: profile.reviewIntensity,
    });
    if (!result) continue;
    state.status = result.status;
    state.knowledge = Math.round(result.knowledge * 1000) / 1000;
    if (result.status === "strong") {
      state.everStrong = true;
      state.strongSince ??= iso(addDaysToDate(day, -9));
    }
  }
}

/** Activity for every day from `from` to the day before `to`, with a few quiet days. */
function activity(from: string, to: string, seed: string): ActivityMonth[] {
  const rand = mulberry32(hashSeed(seed));
  const months = new Map<string, ActivityMonth>();
  for (let d = from; d < to; d = addDaysToDate(d, 1)) {
    const r = rand();
    if (r < 0.12) continue; // a quiet day
    const minutes = Math.round(25 + rand() * 95);
    const solved = Math.floor(rand() * 3);
    const easy = Math.min(solved, Math.floor(rand() * 2));
    const hard = solved - easy > 0 && rand() < 0.2 ? 1 : 0;
    const day: ActivityDay = {
      minutes,
      problemsSolved: solved,
      solvedEasy: easy,
      solvedMedium: solved - easy - hard,
      solvedHard: hard,
      reviews: Math.floor(rand() * 4),
      conceptsTouched: Math.floor(rand() * 5),
      attempts: solved + (rand() < 0.3 ? 1 : 0),
      checks: Math.floor(rand() * 6),
      planItemsDone: Math.floor(rand() * 4),
      turnedStrong: rand() < 0.3 ? 1 : 0,
      turnedFading: rand() < 0.1 ? 1 : 0,
      drillSessions: rand() < 0.5 ? 1 : 0,
    };
    day.drillAnswers = (day.drillSessions ?? 0) * 5;
    const key = d.slice(0, 7);
    const m = months.get(key) ?? { month: key, days: {}, updatedAt: iso(d, 22) };
    m.days[d] = day;
    m.updatedAt = iso(d, 22);
    months.set(key, m);
  }
  return [...months.values()];
}

function finish(b: Builder, profile: Profile): ExportData {
  b.data.profile = profile;
  b.data.conceptStates = Object.values(b.states);
  b.data.checks = b.checks;
  b.data.problemStates = Object.values(b.problems);
  b.data.mistakeTags = seedTagsToRecords(MISTAKE_TAG_SEED, noonOf("2026-07-20"));
  return b.data;
}

function builder(seed: string): Builder {
  attemptSeq = 0;
  return {
    data: emptyExportData(),
    rand: mulberry32(hashSeed(seed)),
    checks: [],
    states: {},
    problems: {},
  };
}

/** Scores for a finished mock's feedback (the type's rubric, in order). */
function feedbackOf(keys: readonly string[], scores: number[], hire: MockFeedback["hireSignal"]) {
  return {
    scores: Object.fromEntries(keys.map((k, i) => [k, scores[i % scores.length]!])),
    strengths: ["Asked clarifying questions before starting."],
    improvements: ["Walk through a small test out loud before saying you're done."],
    hireSignal: hire,
    summary: "A steady interview with room to test earlier.",
  } satisfies MockFeedback;
}

/**
 * Phase 8 practice for the mid-way owner: coding mocks 17, 10 and 3 days ago (improving), a
 * behavioral mock 8 days ago, finished designs 9 and 2 days ago, a STAR story practiced
 * yesterday, 15 pattern drill answers (three wrong), and mental math sprints.
 */
function practiceHistory(b: Builder, day: string) {
  const mock = (
    id: string,
    kind: MockSession["kind"],
    daysAgo: number,
    scores: number[],
    hire: MockFeedback["hireSignal"],
    extra: Partial<MockSession> = {},
  ): MockSession => {
    const d = addDaysToDate(day, -daysAgo);
    return {
      id,
      kind,
      turns: [
        { role: "user", content: "[Phase: Clarify | 45 min left] Hello, I'm ready to begin." },
        { role: "assistant", content: "Hi, thanks for joining. Here's the problem, in my words." },
      ],
      phase: MOCK_PHASES[kind].at(-1),
      delivery: "live",
      limitMinutes: kind === "dsa" || kind === "design" ? 45 : 20,
      elapsedMs: 41 * 60_000,
      feedback: feedbackOf(MOCK_SCORE_KEYS[kind], scores, hire),
      startedAt: iso(d, 18),
      endedAt: iso(d, 18, 45),
      updatedAt: iso(d, 18, 46),
      ...extra,
    };
  };
  b.data.mocks = [
    mock("mock-fixture-1", "dsa", 17, [2, 3, 3, 2, 2], "lean no", { topicOrProblemId: "lc-1" }),
    mock("mock-fixture-2", "dsa", 10, [3, 3, 4, 3, 3], "lean no", { topicOrProblemId: "lc-49" }),
    mock("mock-fixture-3", "behavioral", 8, [4, 3, 3, 4, 4], "yes", {
      questionIds: ["bq-tell-me-about-yourself"],
    }),
    mock("mock-fixture-4", "dsa", 3, [4, 4, 4, 3, 4], "yes", { topicOrProblemId: "lc-3" }),
  ];

  const design = (id: string, problemId: string, daysAgo: number): DesignAttempt => {
    const d = addDaysToDate(day, -daysAgo);
    return {
      id,
      problemId,
      sections: {
        requirements: "Functional and non-functional requirements, with rough numbers.",
        api: "The main calls and what they return.",
      },
      selfReview: [2, 1, 1, 0, 2],
      elapsedMs: 44 * 60_000,
      finishedAt: iso(d, 20, 45),
      mode: "practice",
      createdAt: iso(d, 20),
      updatedAt: iso(d, 20, 45),
    };
  };
  b.data.designs = [
    design("design-fixture-1", "lld-parking-lot", 9),
    design("design-fixture-2", "hld-url-shortener", 2),
  ];
  const yesterday = addDaysToDate(day, -1);
  b.data.stories = [
    {
      id: "story-fixture-1",
      kind: "star",
      title: "The checkout bug in my second internship",
      situation: "Checkout failed for about one order in fifty, and nobody owned the bug.",
      task: "I took it on alongside my intern project.",
      action: "I added logging, traced it to a retry that charged twice, and fixed it with a test.",
      result: "Failures dropped to zero within a week.",
      tags: ["ownership", "debugging"],
      questionIds: ["bq-your-most-challenging-project"],
      practice: [
        {
          questionId: "bq-your-most-challenging-project",
          answer: "Told the checkout story from the bank.",
          mode: "story",
          seconds: 104,
          score: 0.67,
          selfCheck: ["situation", "action", "result", "number"],
          createdAt: iso(yesterday, 21),
        },
      ],
      createdAt: iso(addDaysToDate(day, -12), 21),
      updatedAt: iso(yesterday, 21),
    },
  ];
  // Pattern drill: 15 answers over three weeks on patterns under way; one pattern is mistaken
  // for a sibling in its topic twice (a confusion pair), and one other answer is wrong.
  const started = new Set(Object.keys(b.states));
  const siblingOf = (main: string) =>
    [...started].find(
      (id) =>
        id !== main &&
        conceptById.get(id)?.isPattern &&
        conceptById.get(id)?.topicId === conceptById.get(main)?.topicId,
    );
  const pool = DRILL_PROMPTS.filter((p) => started.has(p.answerConceptIds[0]!));
  const pairMain = pool
    .map((p) => p.answerConceptIds[0]!)
    .find((m) => siblingOf(m) && pool.filter((p) => p.answerConceptIds[0] === m).length >= 2)!;
  const chosen = [
    ...pool.filter((p) => p.answerConceptIds[0] === pairMain).slice(0, 2),
    ...pool.filter((p) => p.answerConceptIds[0] !== pairMain).slice(0, 13),
  ];
  chosen.forEach((p, i) => {
    const main = p.answerConceptIds[0]!;
    const wrong = i < 2 || i === 7;
    const picked = wrong ? (siblingOf(main) ?? main) : main;
    const d = addDaysToDate(day, -(20 - i));
    const stamp = iso(d, 7, i);
    b.checks.push({
      id: `drill-fixture-${i}`,
      conceptId: main,
      kind: "drill",
      score: picked === main ? 1 : 0.5,
      detail: {
        promptId: p.id,
        correctConceptIds: p.answerConceptIds,
        pickedConceptIds: [picked],
        correct: picked === main,
        result: picked === main ? "correct" : "partial",
        source: "bank",
      },
      createdAt: stamp,
      updatedAt: stamp,
    });
  });
  b.data.mentalMath = [12, 6, 1].map((daysAgo, i) => {
    const d = addDaysToDate(day, -daysAgo);
    return {
      id: `mm-fixture-${i + 1}`,
      mode: "speed",
      tier: "medium" as const,
      correct: [41, 48, 55][i]!,
      total: 80,
      answered: [52, 57, 61][i]!,
      seconds: 480,
      createdAt: iso(d, 8),
      updatedAt: iso(d, 8),
    };
  });
}

/** Each finished mock counts on its day in the activity (the weekly review shows mocks). */
function countMocks(b: Builder) {
  for (const m of b.data.mocks) {
    const d = localDate(new Date(m.endedAt!));
    const month = b.data.activity.find((a) => a.month === d.slice(0, 7));
    if (!month) continue;
    const entry = (month.days[d] ??= {
      minutes: 45,
      problemsSolved: 0,
      reviews: 0,
      conceptsTouched: 0,
    });
    entry.mocks = (entry.mocks ?? 0) + 1;
  }
}

/**
 * - new: finished the welcome questions today (SDE, 90 minutes a day), nothing studied yet.
 * - mid: two months in: the first dozen DSA topics, some OS, OOP and C++; problems solved on
 *   those patterns, some due, two tricky; concepts learning, strong, due and fading; focus OS;
 *   Phase 8 practice (mocks, designs, a story, mental math; see practiceHistory).
 * - week: the same owner a week before interviews (120 minutes a day).
 */
export function scenario(name: ScenarioName, day = DAY): ExportData {
  const b = builder(`scenario-${name}`);
  if (name === "new") {
    return finish(b, baseProfile({ dailyMinutes: 90 }, day));
  }
  const start = addDaysToDate(day, -69);
  const profile = baseProfile(
    name === "mid"
      ? { dailyMinutes: 90, focusSubjects: ["os"], interviewDate: addDaysToDate(day, 70) }
      : { dailyMinutes: 120, focusSubjects: ["dsa"], interviewDate: addDaysToDate(day, 7) },
    start,
  );
  progress(b, topicIds("dsa", 12), day, { problems: true });
  progress(b, topicIds("os", 3), day, { problems: false });
  progress(b, topicIds("oop", 2), day, { problems: false });
  progress(b, ["lang.cpp-core"], day, { problems: false });
  practiceHistory(b, day);
  settleStatuses(b, day, profile);
  b.data.activity = activity(start, day, `activity-${name}`);
  countMocks(b);
  return finish(b, profile);
}

/** What the planner needs to know about recent weekly practice (decision 85). */
export function practiceDatesOf(data: ExportData): PlannerInput["history"] {
  const day = (iso: string) => localDate(new Date(iso));
  return {
    mocks: mockDates(data.mocks, day),
    designs: designDates(Object.fromEntries(data.designs.map((d) => [d.id, d])), day),
    stories: practiceDates(data.stories, day),
  };
}

/**
 * A year of steady use for the dashboard's one-second budget: 365 days of activity, most of the
 * DSA syllabus and several other subjects under way, about 350 problems with 1,300 attempts
 * (with code), 3,000 checks and drill answers.
 */
export function yearOfData(day = DAY): ExportData {
  const b = builder("year");
  const start = addDaysToDate(day, -364);
  const profile = baseProfile(
    { dailyMinutes: 90, focusSubjects: ["sysd", "os"], interviewDate: addDaysToDate(day, 40) },
    start,
  );
  progress(b, topicIds("dsa", 40), day, { problems: true });
  for (const s of ["os", "oop", "cn", "dbms", "sysd", "lld", "sql", "conc"])
    progress(b, topicIds(s, 6), day, { problems: false });
  // Most of the LeetCode bank tried at some point in the year (about 350 problems).
  const rand = b.rand;
  const code = (n: number) =>
    Array.from(
      { length: 40 },
      (_, i) =>
        `  // step ${i}: keep the invariant for index ${n + i}\n  int v${i} = a[${i}] + ${n};`,
    ).join("\n");
  for (const p of LEETCODE_PROBLEMS) {
    if (b.problems[p.id] || rand() < 0.2) continue;
    const d = addDaysToDate(start, Math.floor(rand() * 350));
    const solved = rand() < 0.85;
    const first = attempt(
      p.id,
      d,
      solved ? "solved_alone" : "not_solved",
      20 + Math.floor(rand() * 30),
    );
    first.code = `class Solution {\npublic:\n  int solve(vector<int>& a) {\n${code(first.id.length)}\n    return 0;\n  }\n};\n`;
    b.problems[p.id] = {
      problemId: p.id,
      status: solved ? "solved" : "attempted",
      starred: rand() < 0.08,
      tags: [],
      srs: srs(Math.floor(rand() * 5), addDaysToDate(day, Math.floor(rand() * 60) - 10), {
        lastReviewedAt: iso(d),
      }),
      inReview: true,
      attempts: [first],
      updatedAt: iso(d, 20),
    };
  }
  // More history: every problem gets re-solves spread over the year.
  for (const state of Object.values(b.problems)) {
    const extra = 1 + Math.floor(rand() * 5);
    for (let k = 0; k < extra; k++) {
      const d = addDaysToDate(start, Math.floor(rand() * 330));
      const r: AttemptResult =
        rand() < 0.7 ? "solved_alone" : rand() < 0.5 ? "solved_with_hints" : "not_solved";
      state.attempts.push(
        attempt(state.problemId, d, r, 15 + Math.floor(rand() * 30), [], "resolve"),
      );
    }
    state.attempts.sort((a, x) => (a.finishedAt! < x.finishedAt! ? -1 : 1));
  }
  // Checks spread over the year (flashcards and drills), about 3,000 in all.
  const ids = Object.keys(b.states);
  while (b.checks.length < 3000) {
    const id = ids[Math.floor(rand() * ids.length)]!;
    const d = addDaysToDate(start, Math.floor(rand() * 360));
    check(b, id, rand() < 0.8 ? "flashcard" : "quiz", Math.round(rand() * 100) / 100, d);
  }
  settleStatuses(b, day, profile);
  b.data.activity = activity(start, day, "activity-year");
  return finish(b, profile);
}

/** Records keyed the way the stores keep them. */
export function records(data: ExportData) {
  const conceptStates = Object.fromEntries(data.conceptStates.map((s) => [s.conceptId, s]));
  const problemStates = Object.fromEntries(data.problemStates.map((s) => [s.problemId, s]));
  const checks: Record<string, Check[]> = {};
  for (const c of [...data.checks].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)))
    (checks[c.conceptId] ??= []).push(c);
  return { profile: data.profile!, conceptStates, problemStates, checks };
}
