// The focus layer in the top bar (F31): the block's line while it runs, and "2 notes held for
// your break" while notices wait. The held notes open a small popover with "Show them now".
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Popover } from "@/components/ui/Popover";
import { inlineIntention } from "@/lib/focus/intention";
import { blockActive, showHeldNow, useFocusTimerStore } from "@/stores/focusTimerStore";
import { useHeldCount } from "./hooks";

/** "In this block: re-solve 69. Sqrt(x)" (hidden when the block has no line). */
export function FocusLine({ className }: { className?: string }) {
  const intention = useFocusTimerStore((s) => (blockActive(s) ? s.intention : ""));
  const paused = useFocusTimerStore((s) => !s.running);
  if (!intention) return null;
  const line = inlineIntention(intention);
  return (
    <p
      className={cx("min-w-0 truncate text-base text-text", className)}
      title={`In this block I will ${line}`}
      data-testid="focus-line"
    >
      <span className="font-semibold">In this block:</span> {line}
      {paused && <span className="text-muted"> (paused)</span>}
    </p>
  );
}

export function HeldNotes() {
  const count = useHeldCount();
  if (count === 0) return null;
  const label = `${count} ${count === 1 ? "note" : "notes"} held for your break`;
  return (
    <Popover
      label="Held notes"
      placement="bottom-end"
      className="w-72"
      renderTrigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={label}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-sm whitespace-nowrap text-muted transition-colors hover:text-text max-md:h-11"
        >
          <BellOff size={14} aria-hidden="true" />
          <span className="max-xl:hidden">{label}</span>
          <span className="xl:hidden" aria-hidden="true">
            {count} held
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-3">
          <p className="text-base text-text">{label}.</p>
          <p className="text-sm text-muted">
            Reminders and sync notes wait until the block ends, so you can stay with your work.
            Problems that stop you working still show at once.
          </p>
          <Button
            size="sm"
            onClick={() => {
              close();
              showHeldNow();
            }}
          >
            Show them now
          </Button>
        </div>
      )}
    </Popover>
  );
}
