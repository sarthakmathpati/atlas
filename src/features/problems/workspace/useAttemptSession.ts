// The attempt in progress (F7): editor code and language, the attempt timer, hints used, and the
// re-solve reveal. Everything autosaves to ProblemState.draft 2 seconds after the last change,
// and again when the page is hidden or left, so a reload never loses work.
//
// The workspace is keyed by problem and mode, so this hook starts fresh for each: its initial
// state comes from the saved draft (read once, when it mounts).
import { useEffect, useRef, useState } from "react";
import type { CodeLanguage } from "@/components/ui/code/languages";
import { normalizeLanguage } from "@/components/ui/code/languages";
import { useLatest } from "@/components/ui/hooks";
import { useTimer, type TimerControls } from "@/components/ui/timer";
import { nowIso } from "@/lib/time";
import type { ProblemDraft } from "@/lib/types";
import { startActivitySource, stopActivitySource } from "@/stores/activityStore";
import { getProblemState, saveDraft } from "@/stores/problemStore";
import { isBlankCode, starterTemplate } from "./templates";

export type SessionMode = "normal" | "resolve";

export interface Session {
  language: CodeLanguage;
  code: string;
  startedAt?: string;
  hintsUsed: 0 | 1 | 2 | 3;
  sawSolution: boolean;
  revealed: boolean;
}

export type DraftState = "none" | "saving" | "saved";

export interface AttemptSession {
  session: Session;
  /** The timer; starting, pausing and resetting it also saves the draft. */
  timer: TimerControls;
  /** Re-solve was opened while an unsaved normal draft exists; the owner must choose. */
  conflict: boolean;
  draftState: DraftState;
  update: (changes: Partial<Session>) => void;
  /** Called on the first keystroke: marks the start and starts the timer if wanted. */
  began: (autoStart: boolean) => void;
  /** Throws away the attempt in progress; returns an undo function. */
  discard: (useTemplate: boolean) => () => void;
  /** After saving an attempt: keeps the code on screen, clears the rest. */
  afterSave: () => void;
  /** Resolves the conflict by replacing the old draft with a fresh re-solve. */
  startResolveAnyway: (useTemplate: boolean) => void;
}

const AUTOSAVE_MS = 2000;

function freshSession(language: CodeLanguage, useTemplate: boolean): Session {
  return {
    language,
    code: useTemplate ? starterTemplate(language) : "",
    hintsUsed: 0,
    sawSolution: false,
    revealed: false,
  };
}

function fromDraft(d: ProblemDraft): Session {
  return {
    language: normalizeLanguage(d.language),
    code: d.code,
    startedAt: d.startedAt,
    hintsUsed: d.hintsUsed ?? 0,
    sawSolution: d.sawSolution ?? false,
    revealed: d.revealed ?? false,
  };
}

interface Initial {
  session: Session;
  elapsedMs: number;
  conflict: boolean;
  draftState: DraftState;
}

function initialFor(
  problemId: string,
  mode: SessionMode,
  defaultLanguage: CodeLanguage,
  useTemplate: boolean,
): Initial {
  const draft = getProblemState(problemId)?.draft;
  if (draft && (draft.mode ?? "normal") === mode) {
    return {
      session: fromDraft(draft),
      elapsedMs: draft.elapsedMs ?? 0,
      conflict: false,
      draftState: "saved",
    };
  }
  const conflict =
    Boolean(draft) &&
    mode === "resolve" &&
    !isBlankCode(draft!.code, normalizeLanguage(draft!.language));
  return {
    session: freshSession(defaultLanguage, useTemplate),
    elapsedMs: 0,
    conflict,
    draftState: "none",
  };
}

export function useAttemptSession(
  problemId: string,
  mode: SessionMode,
  defaultLanguage: CodeLanguage,
  useTemplate: boolean,
): AttemptSession {
  const [initial] = useState(() => initialFor(problemId, mode, defaultLanguage, useTemplate));
  const [session, setSession] = useState<Session>(initial.session);
  const [conflict, setConflict] = useState(initial.conflict);
  const [draftState, setDraftState] = useState<DraftState>(initial.draftState);
  const timer = useTimer({ initialMs: initial.elapsedMs });
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useLatest({ session, elapsed: timer.elapsedMs, conflict });

  const persist = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    const { session: s, elapsed, conflict: c } = latest.current;
    if (c) return;
    const blank =
      isBlankCode(s.code, s.language) &&
      s.hintsUsed === 0 &&
      !s.sawSolution &&
      !s.revealed &&
      elapsed < 60_000;
    if (blank) {
      saveDraft(problemId, null);
      setDraftState("none");
      return;
    }
    const draft: ProblemDraft = {
      language: s.language,
      code: s.code,
      updatedAt: nowIso(),
      mode,
      elapsedMs: Math.round(elapsed),
      hintsUsed: s.hintsUsed,
    };
    if (s.startedAt) draft.startedAt = s.startedAt;
    if (s.sawSolution) draft.sawSolution = true;
    if (s.revealed) draft.revealed = true;
    saveDraft(problemId, draft);
    setDraftState("saved");
  };
  const persistLatest = useLatest(persist);

  const schedule = () => {
    dirty.current = true;
    setDraftState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistLatest.current(), AUTOSAVE_MS);
  };

  // The attempt timer counts toward today's minutes (the activity clock de-duplicates overlaps).
  const running = timer.running;
  useEffect(() => {
    if (!running) return;
    const source = `attempt:${problemId}`;
    startActivitySource(source);
    return () => stopActivitySource(source);
  }, [running, problemId]);

  // Save when the tab is hidden or closed, and when leaving the page.
  useEffect(() => {
    const save = () => persistLatest.current();
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
      save();
    };
  }, [persistLatest]);

  const update = (changes: Partial<Session>) => {
    setSession((s) => ({ ...s, ...changes }));
    schedule();
  };

  // Starting, pausing or resetting the timer is worth saving too.
  const controls: TimerControls = {
    ...timer,
    start: () => {
      timer.start();
      if (!session.startedAt) setSession((s) => ({ ...s, startedAt: nowIso() }));
      schedule();
    },
    pause: () => {
      timer.pause();
      schedule();
    },
    toggle: () => {
      if (timer.running) timer.pause();
      else {
        timer.start();
        if (!session.startedAt) setSession((s) => ({ ...s, startedAt: nowIso() }));
      }
      schedule();
    },
    reset: () => {
      timer.reset();
      schedule();
    },
  };

  const began = (autoStart: boolean) => {
    if (!session.startedAt) setSession((s) => ({ ...s, startedAt: s.startedAt ?? nowIso() }));
    if (autoStart && !timer.running) timer.start();
  };

  const discard = (template: boolean) => {
    const before = getProblemState(problemId)?.draft ?? null;
    const prevSession = session;
    const prevElapsed = timer.elapsedMs;
    dirty.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveDraft(problemId, null);
    setSession(freshSession(prevSession.language, template));
    timer.set(0);
    setDraftState("none");
    return () => {
      if (before) saveDraft(problemId, before);
      setSession(prevSession);
      timer.set(prevElapsed);
      setDraftState(before ? "saved" : "none");
    };
  };

  const afterSave = () => {
    dirty.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSession((s) => ({
      ...s,
      startedAt: undefined,
      hintsUsed: 0,
      sawSolution: false,
      revealed: false,
    }));
    timer.set(0);
    setDraftState("none");
  };

  const startResolveAnyway = (template: boolean) => {
    setConflict(false);
    setSession(freshSession(defaultLanguage, template));
    timer.set(0);
    saveDraft(problemId, null);
    setDraftState("none");
  };

  return {
    session,
    timer: controls,
    conflict,
    draftState,
    update,
    began,
    discard,
    afterSave,
    startResolveAnyway,
  };
}
