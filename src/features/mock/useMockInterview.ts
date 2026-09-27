// A live mock interview (F15): the candidate's turn is saved (with its phase and time note)
// before Claude is asked, and Claude's reply is saved when it finishes, so a reload never loses
// an exchange. Replies stream; Stop keeps what arrived. The interview clock runs while the page
// is open and is saved every 15 seconds, on every exchange and when leaving, so a reload resumes
// it where it was.
import { useEffect, useRef, useState } from "react";
import { useLatest } from "@/components/ui/hooks";
import { useTimer } from "@/components/ui/timer";
import type { AIErrorCode } from "@/lib/ai/AIProvider";
import { aiErrorCopy, type AIErrorAction } from "@/lib/ai/errors";
import { mockInterviewerPrompt } from "@/lib/ai/prompts";
import { currentPhase, MOCK_TYPES, phaseNote, remainingMs, turnsToSend } from "@/lib/mock/mock";
import type { AIMode, MockSession } from "@/lib/types";
import { startActivitySource, stopActivitySource } from "@/stores/activityStore";
import { askAI, currentAIMode } from "@/stores/aiStore";
import { addTurn, getMock, setMockElapsed } from "@/stores/mockStore";
import { fitPrompt, promptEnv } from "../ai/gather";
import { mockBlocks } from "./context";

export interface PendingReply {
  phase: "thinking" | "streaming";
  text: string;
  mode: AIMode;
}

export interface MockError {
  code: AIErrorCode;
  message: string;
  action: AIErrorAction;
}

export const OPENING = "Hello, I'm ready to begin.";

export function useMockInterview(session: MockSession) {
  const live = !session.endedAt && !session.feedback;
  const timer = useTimer({ initialMs: session.elapsedMs ?? 0 });
  const [pending, setPending] = useState<PendingReply | null>(null);
  const [error, setError] = useState<MockError | null>(null);
  const [trimmed, setTrimmed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const elapsed = useLatest(timer.elapsedMs);
  const id = session.id;
  const started = session.turns.length > 0;

  // The clock runs while the interview is live and has begun; it counts toward today's minutes.
  const [autoStarted, setAutoStarted] = useState(false);
  if (live && started && !timer.running && !autoStarted) {
    setAutoStarted(true);
    timer.start();
  }
  const running = timer.running;
  useEffect(() => {
    if (!running) return;
    const source = `mock:${id}`;
    startActivitySource(source);
    return () => stopActivitySource(source);
  }, [running, id]);
  useEffect(() => {
    if (!live) timer.pause();
  }, [live, timer]);
  useEffect(() => {
    const save = () => setMockElapsed(id, elapsed.current);
    const every = setInterval(save, 15_000);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(every);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [id, elapsed]);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const ask = async () => {
    const latest = getMock(id);
    if (!latest) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setError(null);
    const mode = currentAIMode().mode;
    setPending({ phase: "thinking", text: "", mode });
    const { spec, trimmed: cut } = fitPrompt(mockBlocks(latest), (ctx) =>
      mockInterviewerPrompt(promptEnv(), ctx, latest.kind, turnsToSend(latest.turns)),
    );
    setTrimmed(cut);
    const result = await askAI(spec, {
      signal: c.signal,
      noCache: true,
      title: `${MOCK_TYPES[latest.kind].label}: the interviewer's reply`,
      onText: (text) => {
        if (controller.current === c) setPending({ phase: "streaming", text, mode });
      },
    });
    if (controller.current === c) controller.current = null;
    if (result.ok) {
      addTurn(id, { role: "assistant", content: result.text }, elapsed.current);
      setPending(null);
    } else if (result.code === "cancelled") {
      // Stopped: keep what arrived, so the conversation still makes sense after a reload.
      if (result.partialText?.trim())
        addTurn(
          id,
          { role: "assistant", content: `${result.partialText.trim()} …` },
          elapsed.current,
        );
      setPending(null);
    } else {
      setPending(null);
      setError({
        code: result.code,
        message: result.message,
        action: aiErrorCopy(result.code, result.mode).action,
      });
    }
  };

  const busy = pending !== null;

  const send = (text: string) => {
    const latest = getMock(id);
    const content = text.trim();
    if (!latest || !content || busy || latest.endedAt) return;
    if (!timer.running) timer.start();
    const note = phaseNote(currentPhase(latest), remainingMs(latest, elapsed.current));
    addTurn(id, { role: "user", content: `${note} ${content}` }, elapsed.current);
    void ask();
  };

  const stop = () => controller.current?.abort();

  /** The last candidate turn has no reply (an error, or a reload while Claude was answering). */
  const unanswered =
    !busy && session.turns.length > 0 && session.turns[session.turns.length - 1]!.role === "user";

  return {
    timer,
    elapsedMs: timer.elapsedMs,
    remaining: remainingMs(session, timer.elapsedMs),
    pending,
    error,
    trimmed,
    busy,
    live,
    started,
    unanswered,
    send,
    stop,
    retry: ask,
    begin: () => send(OPENING),
  };
}
