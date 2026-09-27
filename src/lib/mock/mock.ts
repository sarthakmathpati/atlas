// Mock interviews (BUILD_SPEC.md F15): the four types, their phases and score rubrics, the time
// note sent with every candidate turn ("[Phase: Code | 18 min left]"), the transcript Claude
// grades, and what a finished mock means for the rest of the app. Pure helpers.
import type { ChatTurn } from "@/lib/ai/AIProvider";
import { MOCK_PHASES, MOCK_SCORE_KEYS, type MockKind } from "@/lib/ai/prompts";
import type { AttemptResult, MockFeedback, MockSession } from "@/lib/types";

export type { MockKind };

export interface MockTypeInfo {
  label: string;
  /** Short name for lists and charts. */
  short: string;
  minutes: number;
  description: string;
  phases: readonly string[];
  scoreKeys: readonly string[];
}

export const MOCK_TYPES: Record<MockKind, MockTypeInfo> = {
  dsa: {
    label: "Coding interview",
    short: "Coding",
    minutes: 45,
    description:
      "A problem stated in the interviewer's words, then clarify, approach, code, test, complexity and follow-ups, with the editor beside the chat.",
    phases: MOCK_PHASES.dsa,
    scoreKeys: MOCK_SCORE_KEYS.dsa,
  },
  theory: {
    label: "Theory rapid-fire",
    short: "Theory",
    minutes: 20,
    description: "Questions across the subjects you choose, one at a time, with brief feedback.",
    phases: MOCK_PHASES.theory,
    scoreKeys: MOCK_SCORE_KEYS.theory,
  },
  design: {
    label: "Design interview",
    short: "Design",
    minutes: 45,
    description:
      "A low-level or system design prompt, worked in the design workspace while the interviewer probes.",
    phases: MOCK_PHASES.design,
    scoreKeys: MOCK_SCORE_KEYS.design,
  },
  behavioral: {
    label: "Behavioral interview",
    short: "Behavioral",
    minutes: 20,
    description: "Questions from the bank, answered in text, with follow-up probing.",
    phases: MOCK_PHASES.behavioral,
    scoreKeys: MOCK_SCORE_KEYS.behavioral,
  },
};

export const MOCK_KIND_ORDER: readonly MockKind[] = ["dsa", "theory", "design", "behavioral"];

/** "problemSolving" → "Problem solving", "tradeOffs" → "Trade-offs". */
export const SCORE_LABEL: Record<string, string> = {
  problemSolving: "Problem solving",
  communication: "Communication",
  codeQuality: "Code quality",
  complexity: "Complexity analysis",
  edgeCases: "Edge cases",
  accuracy: "Accuracy",
  depth: "Depth",
  clarity: "Clarity",
  breadth: "Breadth",
  requirements: "Requirements",
  highLevelDesign: "High-level design",
  deepDive: "Deep dive",
  tradeOffs: "Trade-offs",
  structure: "Structure",
  specificity: "Specificity",
  impact: "Impact",
  reflection: "Reflection",
};

export function scoreLabel(key: string): string {
  return SCORE_LABEL[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export const HIRE_LABEL: Record<MockFeedback["hireSignal"], string> = {
  "strong yes": "Strong yes",
  yes: "Yes",
  "lean no": "Lean no",
  no: "No",
};

// ----- time --------------------------------------------------------------------------------------

export function limitMs(session: Pick<MockSession, "kind" | "limitMinutes">): number {
  return (session.limitMinutes ?? MOCK_TYPES[session.kind].minutes) * 60_000;
}

export function remainingMs(session: Pick<MockSession, "kind" | "limitMinutes">, elapsed: number) {
  return Math.max(0, limitMs(session) - elapsed);
}

/** The note that starts each candidate turn, so the interviewer can pace the interview. */
export function phaseNote(phase: string, remaining: number): string {
  const min = Math.ceil(remaining / 60_000);
  return remaining <= 0 ? `[Phase: ${phase} | time is up]` : `[Phase: ${phase} | ${min} min left]`;
}

const NOTE = /^\[Phase: [^\]]*\]\s*/;

/** A candidate turn without its note, for display. */
export function stripNote(content: string): string {
  return content.replace(NOTE, "");
}

export function currentPhase(session: Pick<MockSession, "kind" | "phase">): string {
  const phases = MOCK_TYPES[session.kind].phases;
  return session.phase && phases.includes(session.phase) ? session.phase : phases[0]!;
}

// ----- turns -------------------------------------------------------------------------------------

/**
 * The turns to send: consecutive turns by the same speaker merged (a reply that failed leaves
 * two candidate turns in a row), empty ones dropped, and starting and ending with the candidate.
 */
export function turnsToSend(turns: readonly ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const t of turns) {
    if (!t.content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content = `${last.content}\n\n${t.content}`;
    else out.push({ role: t.role, content: t.content });
  }
  while (out.length && out[0]!.role !== "user") out.shift();
  return out;
}

/** The interview as text, for the feedback prompt (notes kept: they show the pacing). */
export function transcript(
  session: Pick<MockSession, "turns" | "code" | "language" | "kind">,
  extra?: { design?: Record<string, string> },
): string {
  const lines = session.turns.map(
    (t) => `${t.role === "assistant" ? "Interviewer" : "Candidate"}: ${t.content.trim()}`,
  );
  const parts = [`## Transcript\n\n${lines.join("\n\n")}`];
  if (session.kind === "dsa" && session.code?.trim())
    parts.push(
      `## Candidate's final code (${session.language ?? "text"})\n\n${session.code.trim()}`,
    );
  if (extra?.design) {
    const sections = Object.entries(extra.design)
      .map(([k, v]) => `### ${k}\n${v}`)
      .join("\n\n");
    if (sections) parts.push(`## Candidate's design\n\n${sections}`);
  }
  return parts.join("\n\n");
}

// ----- results -----------------------------------------------------------------------------------

/** The mean of a feedback's scores (1 to 5). */
export function feedbackMean(feedback: Pick<MockFeedback, "scores">): number {
  const values = Object.values(feedback.scores);
  if (!values.length) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

/**
 * The attempt a coding mock's code becomes (mode "mock"): 4 or more for problem solving is a solve
 * on your own, 3 a solve with help (the interviewer's nudges), less is not solved.
 */
export function mockAttemptResult(feedback: Pick<MockFeedback, "scores">): AttemptResult {
  const ps = feedback.scores.problemSolving ?? feedbackMean(feedback);
  if (ps >= 4) return "solved_alone";
  if (ps >= 3) return "solved_with_hints";
  return "not_solved";
}

export function isFinished(session: Pick<MockSession, "feedback">): boolean {
  return Boolean(session.feedback);
}

/** Local dates of finished mocks, for the planner (a mock a week). */
export function mockDates(
  sessions: readonly MockSession[],
  toLocalDate: (iso: string) => string,
): string[] {
  return [
    ...new Set(
      sessions.filter((s) => s.feedback).map((s) => toLocalDate(s.endedAt ?? s.updatedAt)),
    ),
  ].sort();
}

/** Chart rows of the average score per finished session of one type, oldest first. */
export function scoreTrend(sessions: readonly MockSession[], kind: MockKind) {
  return sessions
    .filter((s) => s.kind === kind && s.feedback)
    .sort((a, b) => ((a.endedAt ?? a.startedAt) < (b.endedAt ?? b.startedAt) ? -1 : 1))
    .map((s) => ({ session: s, mean: feedbackMean(s.feedback!) }));
}
