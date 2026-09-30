// Focus timer (F29) with focus blocks (F31) in the top bar. Starting a block asks for one line
// ("In this block I will…"); while it runs, the time left shows here and the line beside it
// (FocusLine). The popover pauses, ends or stops the block, parks a thought, or starts a break.
// Focus minutes count toward today's activity. The controller (FocusTimerController) ends
// blocks and breaks on time.
import { CircleStop, Coffee, Flag, Pause, Play, SquareParking, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Popover } from "@/components/ui/Popover";
import { formatClock } from "@/components/ui/timer";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  askToStartBlock,
  blockActive,
  breakTimeUp,
  finishBlock,
  focusDurations,
  focusElapsedMs,
  leaveBreak,
  startBreak,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { openPark } from "@/stores/parkStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";

function useDurations() {
  const prefs = useProfileStore((s) => s.profile?.prefs);
  return focusDurations(prefs);
}

/** Re-renders four times a second while the timer runs. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

/** Ends blocks and breaks on time (mounted once, in the shell). */
export function FocusTimerController() {
  const { focus: focusMs, break: breakMs } = useDurations();
  const running = useFocusTimerStore((s) => s.running);
  useEffect(() => {
    if (!running) return;
    const check = () => {
      const state = useFocusTimerStore.getState();
      if (!state.running) return;
      const total = state.mode === "focus" ? focusMs : breakMs;
      if (focusElapsedMs(state) < total) return;
      if (state.mode === "focus") {
        finishBlock();
        // Without the break view, the question about the block opens as a small dialog.
        return;
      }
      if (state.breakOpen) {
        breakTimeUp();
        return;
      }
      state.setMode("focus");
      toast("Break over. Start another focus block when you're ready.", { tone: "success" });
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [running, focusMs, breakMs]);
  return null;
}

export function FocusTimerButton() {
  const { mode, running, startedAt, accumulatedMs, intention, start, pause, reset } =
    useFocusTimerStore();
  const durations = useDurations();
  const now = useNow(running);
  const elapsed = focusElapsedMs({ startedAt, accumulatedMs }, now);
  const remaining = Math.max(0, durations[mode] - elapsed);
  const active = running || elapsed > 0;
  const inBlock = blockActive({ mode, running, accumulatedMs: elapsed });
  const modeLabel = mode === "focus" ? "Focus block" : "Break";

  return (
    <Popover
      label="Focus timer"
      placement="bottom-end"
      className="w-80 max-w-[calc(100vw-2rem)]"
      renderTrigger={(props) => (
        <Tooltip content={active ? `${modeLabel}, ${formatClock(remaining)} left` : "Focus timer"}>
          <button
            {...props}
            type="button"
            aria-label={
              active ? `${modeLabel} timer, ${formatClock(remaining)} left` : "Focus timer"
            }
            className={cx(
              "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors max-md:h-11",
              active
                ? "bg-surface px-3 text-text hover:bg-surface-raised"
                : "w-9 text-muted hover:bg-surface hover:text-text max-md:w-11",
            )}
          >
            <Timer
              size={18}
              aria-hidden="true"
              className={running ? (mode === "focus" ? "text-accent" : "text-success") : undefined}
            />
            {active && (
              <span className="text-sm font-medium tabular-nums">{formatClock(remaining)}</span>
            )}
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          {active ? (
            <>
              <div>
                <p className="text-sm font-semibold text-accent">
                  {mode === "focus" ? (running ? "Focus block" : "Focus block, paused") : "Break"}
                </p>
                {mode === "focus" && (
                  <p className="mt-1 text-base text-text">
                    {intention ? (
                      <>
                        <span className="text-muted">In this block I will </span>
                        {intention.charAt(0).toLowerCase() + intention.slice(1)}
                      </>
                    ) : (
                      <span className="text-muted">No line for this block.</span>
                    )}
                  </p>
                )}
              </div>
              <p
                role="timer"
                className="text-center font-display text-4xl font-semibold text-text tabular-nums"
                aria-label={`${formatClock(remaining)} left`}
              >
                {formatClock(remaining)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  icon={running ? Pause : Play}
                  onClick={running ? pause : start}
                  className="flex-1"
                  data-autofocus
                >
                  {running ? "Pause" : "Resume"}
                </Button>
                {inBlock ? (
                  <Button
                    icon={Flag}
                    onClick={() => {
                      close();
                      finishBlock();
                    }}
                  >
                    End now
                  </Button>
                ) : (
                  <Button
                    icon={CircleStop}
                    onClick={() => {
                      close();
                      leaveBreak();
                    }}
                  >
                    End break
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={SquareParking}
                  onClick={() => {
                    close();
                    openPark();
                  }}
                  aria-keyshortcuts="p"
                >
                  Park a thought
                </Button>
                {inBlock && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      close();
                      reset();
                    }}
                  >
                    Stop without counting
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-base font-semibold text-text">Focus blocks</p>
                <p className="mt-1 text-sm text-muted">
                  {durations.focus / 60_000} minutes on one thing, then a {durations.break / 60_000}
                  -minute break. Focus time counts toward today's minutes and your streak.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  icon={Play}
                  onClick={() => {
                    close();
                    askToStartBlock();
                  }}
                  data-autofocus
                  aria-keyshortcuts="f"
                >
                  Start a focus block
                </Button>
                <Button
                  icon={Coffee}
                  onClick={() => {
                    close();
                    startBreak();
                  }}
                >
                  Take a {durations.break / 60_000}-minute break
                </Button>
                <Button
                  variant="ghost"
                  icon={SquareParking}
                  onClick={() => {
                    close();
                    openPark();
                  }}
                  aria-keyshortcuts="p"
                >
                  Park a thought
                </Button>
              </div>
              <p className="text-sm text-muted">
                <a href="#/settings?section=focus" className="text-accent hover:underline">
                  Focus settings
                </a>
              </p>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
