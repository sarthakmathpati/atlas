// The break view (F31): when a focus block ends, the break fills the screen until "Back to work"
// or Esc. A landscape drawn by the contour engine in the theme's inks, the question about the
// block that ended (Done, Partly, Moved on), one idea from a rotating list (rest the eyes, move,
// drink water), the thoughts parked for the break, "Breathe for a minute", and the break's time
// left as a tide line along the bottom (redrawn every 5 seconds, never animated).
// Without the break view (Settings), the question opens as a small dialog instead.
import { ArrowRight, SquareParking } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardLabel } from "@/components/ui/Card";
import { ContourCanvas } from "@/components/ui/ContourCanvas";
import { Dialog, FullScreenLayer } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Misc";
import { breakThoughts } from "@/lib/focus/park";
import { breakPrompt } from "@/lib/focus/prompts";
import { horizonFraction } from "@/lib/focus/horizon";
import { localDate } from "@/lib/time";
import type { FocusOutcome } from "@/lib/types";
import { useActivityStore } from "@/stores/activityStore";
import {
  answerBlock,
  focusDurations,
  focusElapsedMs,
  leaveBreak,
  skipBlockAnswer,
  useFocusTimerStore,
  type EndedBlock,
} from "@/stores/focusTimerStore";
import { openPark, useParkStore } from "@/stores/parkStore";
import { useProfileStore } from "@/stores/profileStore";
import { Breathing } from "./Breathing";
import { useTicker } from "./hooks";
import { ThoughtRow } from "./Park";

const OUTCOMES: { value: FocusOutcome; label: string; hint: string }[] = [
  { value: "done", label: "Done", hint: "I did what I set out to do" },
  { value: "partly", label: "Partly", hint: "Some of it" },
  { value: "movedOn", label: "Moved on", hint: "I worked on something else" },
];

const OUTCOME_SAID: Record<FocusOutcome, string> = {
  done: "Counted as done.",
  partly: "Counted as partly done.",
  movedOn: "Counted as moved on.",
};

/** "How did it go?" for the block that just ended. */
function Outcome({ ended, onAnswer }: { ended: EndedBlock; onAnswer: (o: FocusOutcome) => void }) {
  const line = ended.intention
    ? ended.intention.charAt(0).toLowerCase() + ended.intention.slice(1)
    : "";
  return (
    <fieldset className="w-full">
      <legend className="w-full text-base text-text">
        {line ? (
          <>
            <span className="text-muted">In this block you planned to </span>
            {line}. How did it go?
          </>
        ) : (
          "How did the block go?"
        )}
      </legend>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAnswer(o.value)}
            className="flex min-h-14 flex-col items-center justify-center rounded-control bg-surface-sunken px-2 py-2 text-center transition-colors hover:bg-rule"
          >
            <span className="font-semibold text-text">{o.label}</span>
            <span className="text-xs text-muted max-sm:hidden">{o.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function blocksOn(date: string): number {
  const day = useActivityStore.getState().months[date.slice(0, 7)]?.days[date];
  const f = day?.focusBlocks;
  return (f?.done ?? 0) + (f?.partly ?? 0) + (f?.movedOn ?? 0);
}

function BreakContent() {
  const running = useFocusTimerStore((s) => s.running);
  const startedAt = useFocusTimerStore((s) => s.startedAt);
  const accumulatedMs = useFocusTimerStore((s) => s.accumulatedMs);
  const ended = useFocusTimerStore((s) => s.ended);
  const prefs = useProfileStore((s) => s.profile?.prefs);
  const thoughts = useParkStore((s) => s.thoughts);
  const now = useTicker(5_000, running);
  const [answered, setAnswered] = useState<FocusOutcome | null>(null);
  // The idea and the landscape stay the same for the whole break.
  const [{ prompt, seed }] = useState(() => {
    const today = localDate();
    const n = blocksOn(today);
    return { prompt: breakPrompt(today, n), seed: `break:${today}:${n}` };
  });

  const total = focusDurations(prefs).break;
  const elapsed = focusElapsedMs({ startedAt, accumulatedMs }, now);
  const over = elapsed >= total;
  const minutesLeft = Math.max(1, Math.ceil((total - elapsed) / 60_000));
  const forBreak = useMemo(() => breakThoughts(Object.values(thoughts)), [thoughts]);

  return (
    <div className="relative isolate h-full">
      <ContourCanvas seed={seed} levels={18} cell={8} className="-z-10" />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-10 text-center">
          <div className="space-y-1">
            <CardLabel>Break</CardLabel>
            <h2
              tabIndex={-1}
              data-autofocus
              className="font-display text-3xl font-semibold text-text outline-none"
            >
              {over ? "The break is over" : "Time for a break"}
            </h2>
            <p className="text-base text-muted" role="timer" aria-live="off">
              {over
                ? "Start the next block when you're ready."
                : `${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"} left`}
            </p>
          </div>

          {ended ? (
            <div className="w-full rounded-panel bg-surface/95 p-4 text-left shadow-pill">
              <Outcome
                ended={ended}
                onAnswer={(o) => {
                  answerBlock(o);
                  setAnswered(o);
                }}
              />
            </div>
          ) : (
            answered && (
              <p className="text-sm text-muted" role="status">
                {OUTCOME_SAID[answered]}
              </p>
            )
          )}

          <p className="w-full rounded-panel bg-surface/95 px-4 py-3 text-md text-text shadow-pill">
            {prompt}
          </p>

          <Breathing className="flex justify-center" />

          <div className="w-full rounded-panel bg-surface/95 px-4 py-3 text-left shadow-pill">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium text-text">
                {forBreak.length === 0
                  ? "Nothing parked for this break"
                  : forBreak.length === 1
                    ? "Parked for this break"
                    : `Parked for this break (${forBreak.length})`}
              </p>
              <Button
                size="sm"
                variant="ghost"
                icon={SquareParking}
                onClick={() => openPark({ when: "break" })}
              >
                Park a thought
              </Button>
            </div>
            {forBreak.length > 0 && (
              <ul className="divide-y divide-rule">
                {forBreak.map((t) => (
                  <ThoughtRow key={t.id} thought={t} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <Button variant="primary" trailingIcon={ArrowRight} onClick={leaveBreak}>
              Back to work
            </Button>
            <p className="text-sm text-muted max-md:hidden">
              or press <Kbd>Esc</Kbd>
            </p>
          </div>
        </div>
      </div>
      {/* The tide line: the break's time left, along the bottom edge. */}
      <div aria-hidden="true" data-testid="tide-line" className="absolute inset-x-0 bottom-0 h-1">
        <div
          className="h-full bg-accent/60"
          style={{ width: `${horizonFraction(elapsed, total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function BreakView() {
  const open = useFocusTimerStore((s) => s.breakOpen);
  return (
    <FullScreenLayer open={open} onClose={leaveBreak} label="Break">
      {open && <BreakContent />}
    </FullScreenLayer>
  );
}

/** Without the break view: a small dialog asks how the block went. */
export function BlockDoneDialog() {
  const ended = useFocusTimerStore((s) => (s.breakOpen ? null : s.ended));
  const rest = useProfileStore((s) => focusDurations(s.profile?.prefs).break);
  return (
    <Dialog
      open={ended !== null}
      onClose={skipBlockAnswer}
      title="Focus block done"
      description={`Take a ${rest / 60_000}-minute break when you're ready: start it from the timer.`}
      size="sm"
    >
      {ended && (
        <div className="px-4 py-4 sm:px-5">
          <Outcome ended={ended} onAnswer={answerBlock} />
        </div>
      )}
    </Dialog>
  );
}
