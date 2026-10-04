// Study with Claude (F32, part 10, an experiment, off by default): at a focus block's start
// Claude sees the block's line and the plan item and answers in a sentence naming the first
// step; at the end, after "How did it go?", it acknowledges the answer and suggests what comes
// next (prompt 20, quick tier, never cached). Built-in Claude and API key mode only: in copy
// prompt mode it stays hidden and never asks.
import { create } from "zustand";
import { adhdOn, adhdSettings } from "@/lib/adhd/prefs";
import { studyEndPrompt, studyStartPrompt, type StudyOutcome } from "@/lib/ai/prompts";
import { localDate } from "@/lib/time";
import type { FocusOutcome } from "@/lib/types";
import { askAI, currentAIMode, useAIMode } from "@/stores/aiStore";
import { onBlockStart, useFocusTimerStore } from "@/stores/focusTimerStore";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { promptEnv } from "../ai/gather";

export interface StudyReply {
  status: "thinking" | "done" | "failed";
  text: string;
  /** Plain words for a failure. */
  message?: string;
}

interface StudyState {
  /** Claude's word at the start of the block. */
  start: StudyReply | null;
  /** Claude's reply after the block. */
  end: StudyReply | null;
}

export const useStudyStore = create<StudyState>(() => ({ start: null, end: null }));

/** The modes Study with Claude works in: built-in Claude and the owner's API key. */
export function studyModeAllowed(mode: string): boolean {
  return mode === "sample" || mode === "api";
}

/** True when it should speak now: the mode and the switch are on, in an allowed AI mode. */
export function studyActive(): boolean {
  const prefs = useProfileStore.getState().profile?.prefs;
  return (
    adhdOn(prefs) && adhdSettings(prefs).studyWithClaude && studyModeAllowed(currentAIMode().mode)
  );
}

/** The same, re-rendering when the mode or the settings change. */
export function useStudyActive(): boolean {
  const prefs = useProfileStore((s) => s.profile?.prefs);
  const { mode } = useAIMode();
  return adhdOn(prefs) && adhdSettings(prefs).studyWithClaude && studyModeAllowed(mode);
}

const OUTCOME_WORD: Record<FocusOutcome, StudyOutcome> = {
  done: "Done",
  partly: "Partly",
  movedOn: "Moved on",
};

let startRequest: AbortController | null = null;
let endRequest: AbortController | null = null;

async function ask(
  which: "start" | "end",
  spec: ReturnType<typeof studyStartPrompt>,
  controller: AbortController,
): Promise<void> {
  useStudyStore.setState({ [which]: { status: "thinking", text: "" } });
  const result = await askAI(spec, {
    signal: controller.signal,
    noCache: true,
    title: "A word from Claude",
    onText: (text) => {
      if (!controller.signal.aborted)
        useStudyStore.setState({ [which]: { status: "thinking", text } });
    },
  });
  if (controller.signal.aborted) return;
  useStudyStore.setState({
    [which]: result.ok
      ? { status: "done", text: result.text.trim() }
      : { status: "failed", text: "", message: result.message },
  });
}

/** Claude's word as a block starts. */
export function studyAtStart(block: {
  intention: string;
  planItemId: string | null;
  minutes: number;
}): void {
  if (!studyActive()) return;
  startRequest?.abort();
  endRequest?.abort();
  useStudyStore.setState({ end: null });
  const controller = new AbortController();
  startRequest = controller;
  const item = block.planItemId
    ? usePlanStore.getState().plans[localDate()]?.items.find((i) => i.id === block.planItemId)
    : undefined;
  void ask(
    "start",
    studyStartPrompt(promptEnv(), {
      minutes: block.minutes,
      line: block.intention,
      item: item?.title,
    }),
    controller,
  );
}

/** Claude's reply after the owner says how the block went. */
export function studyAtEnd(outcome: FocusOutcome, note: string): void {
  if (!studyActive()) return;
  endRequest?.abort();
  const controller = new AbortController();
  endRequest = controller;
  useStudyStore.setState({ start: null });
  void ask(
    "end",
    studyEndPrompt(promptEnv(), { outcome: OUTCOME_WORD[outcome], note }),
    controller,
  );
}

export function dismissStudy(which: "start" | "end"): void {
  if (which === "start") startRequest?.abort();
  else endRequest?.abort();
  useStudyStore.setState({ [which]: null });
}

let listening = false;

/** Listens for blocks starting (once, from the ADHD layer). */
export function watchStudy(): void {
  if (listening) return;
  listening = true;
  onBlockStart(studyAtStart);
  // The reply after a block belongs to its break: leaving the break view puts it away.
  useFocusTimerStore.subscribe((s, prev) => {
    if (prev.breakOpen && !s.breakOpen && useStudyStore.getState().end) dismissStudy("end");
  });
}
