// Timer (section 12.7): a stopwatch or countdown with start, pause and reset. Time is measured
// from timestamps, never by counting ticks, so it stays right when the tab sleeps.
import { Pause, Play, RotateCcw } from "lucide-react";
import { IconButton } from "./Button";
import { cx } from "./cx";
import { formatClock, type TimerControls } from "./timer";

interface TimerProps {
  timer: TimerControls;
  label: string;
  className?: string;
  /** Hide the reset button (for example while a mock interview runs). */
  noReset?: boolean;
}

/** Displays a timer from useTimer() with its controls. */
export function Timer({ timer, label, className, noReset }: TimerProps) {
  const shown = timer.remainingMs ?? timer.elapsedMs;
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("inline-flex items-center gap-1", className)}
    >
      <span
        role="timer"
        aria-live="off"
        className={cx(
          "min-w-14 px-1 text-center text-md font-medium tabular-nums",
          timer.running ? "text-text" : "text-muted",
        )}
      >
        {formatClock(shown)}
      </span>
      <IconButton
        icon={timer.running ? Pause : Play}
        label={timer.running ? "Pause timer" : "Start timer"}
        size="sm"
        onClick={timer.toggle}
      />
      {!noReset && (
        <IconButton
          icon={RotateCcw}
          label="Reset timer"
          size="sm"
          onClick={timer.reset}
          disabled={timer.elapsedMs === 0}
        />
      )}
    </div>
  );
}
