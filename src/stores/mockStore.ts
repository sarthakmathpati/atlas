// Mock interviews (F15): every MockSession, saved on every exchange (turns, code, phase and the
// interview clock), so a reload mid-interview resumes where it was. Finishing a mock keeps its
// feedback and: counts it in the day's activity (the weekly review shows mocks), ticks off
// today's mock item, turns a coding mock's code into an attempt with mode "mock", finishes a
// design round's workspace attempt, and records a behavioral round as a STAR check.
import { nanoid } from "nanoid";
import { create } from "zustand";
import { feedbackMean, mockAttemptResult, MOCK_TYPES, type MockKind } from "@/lib/mock/mock";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { MockFeedback, MockSession } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { recordChecks } from "./conceptStateStore";
import { finishDesign, startDesign } from "./designStore";
import { markPlanItemDone } from "./planEffects";
import { saveAttempt } from "./problemStore";
import { toast } from "./toastStore";

interface MockState {
  sessions: Record<string, MockSession>;
  loaded: boolean;
}

export const useMockStore = create<MockState>(() => ({ sessions: {}, loaded: false }));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save the interview. Check that storage is available, then try again.", {
    tone: "error",
    id: "mock-save",
  });

export async function hydrateMocks(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.mocks.list();
  useMockStore.setState({
    sessions: Object.fromEntries(list.map((s) => [s.id, s])),
    loaded: true,
  });
}

export function detachMocks(): void {
  repo = null;
  useMockStore.setState({ sessions: {}, loaded: false });
}

function commit(session: MockSession): void {
  useMockStore.setState((s) => ({ sessions: { ...s.sessions, [session.id]: session } }));
  repo?.mocks.put(session).catch(saveFailed);
}

export function getMock(id: string): MockSession | undefined {
  return useMockStore.getState().sessions[id];
}

function patch(id: string, changes: Partial<MockSession>): MockSession | null {
  const current = getMock(id);
  if (!current) return null;
  const next = { ...current, ...changes, updatedAt: nowIso() };
  commit(next);
  return next;
}

export interface NewMock {
  kind: MockKind;
  delivery: "live" | "copy";
  topicOrProblemId?: string;
  language?: string;
  subjects?: string[];
  questionIds?: string[];
}

/** Starts a session (a design round also gets its workspace attempt); returns it. */
export function createMock(input: NewMock, now: Date = new Date()): MockSession {
  const stamp = nowIso(now);
  const session: MockSession = {
    id: `mock-${nanoid(10)}`,
    kind: input.kind,
    turns: [],
    delivery: input.delivery,
    limitMinutes: MOCK_TYPES[input.kind].minutes,
    elapsedMs: 0,
    phase: MOCK_TYPES[input.kind].phases[0],
    startedAt: stamp,
    updatedAt: stamp,
  };
  if (input.topicOrProblemId) session.topicOrProblemId = input.topicOrProblemId;
  if (input.language) session.language = input.language;
  if (input.subjects?.length) session.subjects = input.subjects;
  if (input.questionIds?.length) session.questionIds = input.questionIds;
  if (input.kind === "design" && input.topicOrProblemId && input.delivery === "live") {
    session.designAttemptId = startDesign(input.topicOrProblemId, {
      mode: "mock",
      mockId: session.id,
    }).id;
  }
  commit(session);
  return session;
}

export function addTurn(id: string, turn: MockSession["turns"][number], elapsedMs?: number) {
  const current = getMock(id);
  if (!current) return;
  patch(id, {
    turns: [...current.turns, turn],
    ...(elapsedMs !== undefined ? { elapsedMs: Math.round(elapsedMs) } : {}),
  });
}

export function setMockCode(id: string, code: string): void {
  const current = getMock(id);
  if (!current || current.code === code) return;
  patch(id, { code });
}

export function setMockPhase(id: string, phase: string): void {
  if (getMock(id)?.phase === phase) return;
  patch(id, { phase });
}

export function setMockElapsed(id: string, elapsedMs: number): void {
  const current = getMock(id);
  if (!current || current.endedAt || Math.abs((current.elapsedMs ?? 0) - elapsedMs) < 1000) return;
  patch(id, { elapsedMs: Math.round(elapsedMs) });
}

/** Ends the interview (the clock stops; feedback comes next). */
export function endMock(id: string, elapsedMs?: number, now: Date = new Date()): void {
  const current = getMock(id);
  if (!current || current.endedAt) return;
  patch(id, {
    endedAt: nowIso(now),
    ...(elapsedMs !== undefined ? { elapsedMs: Math.round(elapsedMs) } : {}),
  });
}

/** Undoes "End interview" while there is no feedback yet. */
export function resumeMock(id: string): void {
  const current = getMock(id);
  if (!current || current.feedback) return;
  const next: MockSession = { ...current, updatedAt: nowIso() };
  delete next.endedAt;
  commit(next);
}

/** Saves the feedback and everything a finished mock means for the rest of the app. */
export function completeMock(
  id: string,
  feedback: MockFeedback,
  options: { code?: string } = {},
  now: Date = new Date(),
): MockSession | null {
  const current = getMock(id);
  if (!current) return null;
  const firstTime = !current.feedback;
  const stamp = nowIso(now);
  const code = options.code ?? current.code ?? "";
  let next: MockSession = {
    ...current,
    feedback,
    endedAt: current.endedAt ?? stamp,
    updatedAt: stamp,
  };
  if (code && code !== current.code) next.code = code;
  if (firstTime) {
    const today = localDate(now);
    // A coding mock's code becomes an attempt with mode "mock" on its problem.
    if (current.kind === "dsa" && current.topicOrProblemId && code.trim() && !current.attemptId) {
      const minutes = Math.max(1, Math.round((current.elapsedMs ?? 0) / 60_000));
      const saved = saveAttempt(
        {
          problemId: current.topicOrProblemId,
          startedAt: current.startedAt,
          minutes,
          language: current.language ?? "text",
          code,
          result: mockAttemptResult(feedback),
          hintsUsed: 0,
          approach: feedback.summary,
          mistakeTagIds: [],
          mode: "mock",
        },
        now,
      );
      next = { ...next, attemptId: saved.attempt.id };
    }
    // A design round finishes its workspace attempt with the mock's average as its score.
    if (current.kind === "design" && current.designAttemptId) {
      finishDesign(current.designAttemptId, now, { overall: feedbackMean(feedback) });
    }
    // A behavioral round is practice in telling stories (a check on the STAR method).
    if (current.kind === "behavioral") {
      recordChecks(
        [
          {
            conceptId: "career.behavioral.the-star-method",
            kind: "explain",
            score: feedbackMean(feedback) / 5,
            detail: { source: "mock", mockId: current.id },
          },
        ],
        { now },
      );
    }
    recordActivity(today, { mocks: 1 });
    void markPlanItemDone(repo, today, null, ["mock"]);
  }
  commit(next);
  return next;
}

/** Deletes a session; returns it for Undo. */
export function deleteMock(id: string): MockSession | null {
  const current = getMock(id);
  if (!current) return null;
  useMockStore.setState((s) => {
    const sessions = { ...s.sessions };
    delete sessions[id];
    return { sessions };
  });
  repo?.mocks.delete(id).catch(saveFailed);
  return current;
}

export function restoreMock(session: MockSession): void {
  commit({ ...session, updatedAt: nowIso() });
}
