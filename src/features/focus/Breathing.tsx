// "Breathe for a minute" (F31, 12.10.9): a ring grows for 5 seconds and shrinks for 5, six
// times. Only when the owner starts it. With reduced motion the ring is left out and a text count
// (1 to 5 for each half breath) keeps the rhythm.
import { Wind } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { prefersReducedMotion } from "@/components/ui/hooks";
import { BREATHS, breathingAt } from "@/lib/focus/breathing";
import { useTicker } from "./hooks";

export function Breathing({ className }: { className?: string }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useTicker(250, startedAt !== null);
  const [reduced] = useState(prefersReducedMotion);

  if (startedAt === null) {
    return (
      <div className={className}>
        <Button icon={Wind} onClick={() => setStartedAt(Date.now())}>
          Breathe for a minute
        </Button>
      </div>
    );
  }
  const moment = breathingAt(now - startedAt);
  if (moment.done) {
    return (
      <div className={cx("flex flex-col items-center gap-2", className)} role="status">
        <p className="text-base text-text">That was a minute of slow breathing.</p>
        <Button size="sm" variant="ghost" icon={Wind} onClick={() => setStartedAt(Date.now())}>
          Again
        </Button>
      </div>
    );
  }
  const phase = moment.phase === "in" ? "Breathe in" : "Breathe out";
  return (
    <div
      role="group"
      aria-label="Breathe for a minute"
      className={cx("flex flex-col items-center gap-3", className)}
      data-testid="breathing"
    >
      {reduced ? (
        <p
          aria-hidden="true"
          data-testid="breath-count"
          className="grid size-24 place-items-center rounded-full bg-accent-soft font-display text-4xl font-semibold text-accent tabular-nums"
        >
          {moment.second}
        </p>
      ) : (
        <div className="grid size-32 place-items-center">
          <div
            aria-hidden="true"
            data-phase={moment.phase}
            data-testid="breath-ring"
            className="breath-ring size-24 rounded-full border-2 border-accent bg-accent-soft"
          />
        </div>
      )}
      <p aria-live="polite" className="font-display text-xl font-semibold text-text">
        {phase}
      </p>
      <p className="text-sm text-muted">
        Breath {moment.breath} of {BREATHS}
      </p>
      {/* Focus moves here when breathing starts, so the keyboard keeps its place. */}
      <Button size="sm" variant="ghost" onClick={() => setStartedAt(null)} autoFocus>
        Stop
      </Button>
    </div>
  );
}
