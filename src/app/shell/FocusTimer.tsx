// Focus timer (F29) in the top bar: focus and break sessions. Focus minutes count toward today's
// activity. When a session ends, a toast says so and the timer switches to the other mode.
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Popover } from "@/components/ui/Popover";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatClock } from "@/components/ui/timer";
import { Tooltip } from "@/components/ui/Tooltip";
import { focusElapsedMs, useFocusTimerStore, type FocusMode } from "@/stores/focusTimerStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";

function useDurations() {
  const prefs = useProfileStore((s) => s.profile?.prefs);
  return {
    focus: (prefs?.focusMinutes ?? 25) * 60_000,
    break: (prefs?.breakMinutes ?? 5) * 60_000,
  };
}

/** Re-renders every half second while the timer runs. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

/** Ends sessions on time (mounted once, in the shell). */
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
      const finished = state.mode;
      state.setMode(finished === "focus" ? "break" : "focus");
      toast(
        finished === "focus"
          ? "Focus session done. Take a short break."
          : "Break over. Start another focus session when you're ready.",
        { tone: "success" },
      );
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [running, focusMs, breakMs]);
  return null;
}

export function FocusTimerButton() {
  const { mode, running, startedAt, accumulatedMs, start, pause, reset, setMode } =
    useFocusTimerStore();
  const durations = useDurations();
  const now = useNow(running);
  const elapsed = focusElapsedMs({ startedAt, accumulatedMs }, now);
  const remaining = Math.max(0, durations[mode] - elapsed);
  const active = running || elapsed > 0;
  const modeLabel = mode === "focus" ? "Focus" : "Break";

  return (
    <Popover
      label="Focus timer"
      placement="bottom-end"
      className="w-72"
      renderTrigger={(props) => (
        <Tooltip content={active ? `${modeLabel} timer` : "Focus timer"}>
          <button
            {...props}
            type="button"
            aria-label={
              active ? `${modeLabel} timer, ${formatClock(remaining)} left` : "Focus timer"
            }
            className={cx(
              "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control transition-colors hover:bg-surface-sunken max-md:h-11",
              active ? "px-2.5 text-text" : "w-9 text-muted hover:text-text max-md:w-11",
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
      {() => (
        <div className="flex flex-col gap-4">
          <SegmentedControl<FocusMode>
            label="Timer mode"
            value={mode}
            onChange={setMode}
            full
            options={[
              { value: "focus", label: `Focus ${durations.focus / 60_000} min` },
              { value: "break", label: `Break ${durations.break / 60_000} min` },
            ]}
          />
          <p
            role="timer"
            className="text-center text-3xl font-medium text-text tabular-nums"
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
              {running ? "Pause" : elapsed > 0 ? "Resume" : `Start ${mode}`}
            </Button>
            <Button
              icon={RotateCcw}
              onClick={reset}
              disabled={elapsed === 0}
              aria-label="Reset timer"
            >
              Reset
            </Button>
          </div>
          <p className="text-sm text-muted">
            {mode === "focus"
              ? "Focus time counts toward today's minutes and your streak."
              : "Breaks don't count toward your minutes."}{" "}
            <a href="#/settings?section=learning" className="text-accent hover:underline">
              Change lengths
            </a>
          </p>
        </div>
      )}
    </Popover>
  );
}
