// Park it (F31): write a stray thought down with a when (at the break, tonight, tomorrow) and let
// it go; it comes back then with Done, Add to today and Dismiss. Opened with `p`, from the timer
// popover, the break view, the wrap-up note ("Park what's left") and interview day ("Park a
// worry", inline).
import { Check, CalendarPlus, SquareParking, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import {
  MAX_THOUGHT_LENGTH,
  morningTime,
  PARK_WHEN_LABEL,
  PARK_WHENS,
  PARKED_FOR,
  thoughtsWaiting,
  tonightTime,
  type ParkWhen,
} from "@/lib/focus/park";
import type { ParkedThought } from "@/lib/types";
import { blockEndsAt } from "@/stores/focusTimerStore";
import {
  addThoughtToToday,
  closePark,
  dismissThought,
  markThoughtDone,
  parkThought,
  restoreThought,
  useParkStore,
} from "@/stores/parkStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";

const clockLabel = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** When each choice brings the thought back, in words. */
function useWhenHints(): Record<ParkWhen, string> {
  const profile = useProfileStore((s) => s.profile);
  const theme = profile?.theme ?? "system";
  const schedule = profile?.prefs.themeSchedule ?? DEFAULT_THEME_SCHEDULE;
  const ends = blockEndsAt();
  return {
    break: ends ? `When this block ends, at ${clockLabel(new Date(ends))}.` : "At your next break.",
    tonight: `This evening, from ${tonightTime(theme, schedule)}.`,
    tomorrow: `Tomorrow morning, from ${morningTime(theme, schedule)}.`,
  };
}

interface ParkFormProps {
  initialWhen?: ParkWhen;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  onParked?: (thought: ParkedThought) => void;
  /** Focus the field when shown (the dialog). */
  autoFocus?: boolean;
  className?: string;
}

/** One line and a when. Enter parks it. */
export function ParkForm({
  initialWhen = "break",
  label = "What's on your mind?",
  placeholder = "Look up how TCP slow start works",
  submitLabel = "Park it",
  onParked,
  autoFocus,
  className,
}: ParkFormProps) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState<ParkWhen>(initialWhen);
  const hints = useWhenHints();
  return (
    <form
      className={cx("space-y-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const thought = parkThought(text, when);
        setText("");
        toast(`Parked ${PARKED_FOR[when]}.`, { tone: "success" });
        onParked?.(thought);
      }}
    >
      <Field label={label}>
        <Input
          value={text}
          maxLength={MAX_THOUGHT_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          {...(autoFocus ? { "data-autofocus": true } : {})}
        />
      </Field>
      <div className="space-y-1.5">
        <SegmentedControl<ParkWhen>
          label="When it comes back"
          value={when}
          onChange={setWhen}
          full
          options={PARK_WHENS.map((w) => ({ value: w, label: PARK_WHEN_LABEL[w] }))}
        />
        <p className="text-sm text-muted">{hints[when]}</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon={SquareParking} disabled={!text.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Thoughts still waiting for their time, with a way to remove one. */
function Waiting() {
  const thoughts = useParkStore((s) => s.thoughts);
  const waiting = useMemo(() => thoughtsWaiting(Object.values(thoughts), new Date()), [thoughts]);
  if (waiting.length === 0) return null;
  return (
    <div className="border-t border-rule pt-3">
      <p className="text-sm font-medium text-text">Waiting ({waiting.length})</p>
      <ul className="mt-1.5 space-y-1">
        {waiting.slice(0, 6).map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-text">{t.text}</span>
            <span className="shrink-0 text-muted">{PARK_WHEN_LABEL[t.when]}</span>
            <IconButton
              size="sm"
              icon={X}
              label={`Remove ${t.text}`}
              onClick={() => {
                const removed = dismissThought(t.id);
                if (removed)
                  toast("Removed.", {
                    action: { label: "Undo", onClick: () => restoreThought(removed) },
                  });
              }}
            />
          </li>
        ))}
      </ul>
      {waiting.length > 6 && (
        <p className="mt-1 text-sm text-muted">and {waiting.length - 6} more.</p>
      )}
    </div>
  );
}

export function ParkDialog() {
  const request = useParkStore((s) => s.dialog);
  return (
    <Dialog
      open={request !== null}
      onClose={closePark}
      title={request?.title ?? "Park a thought"}
      description="Write it down and let it go. It comes back when you choose."
      size="sm"
    >
      {request && (
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <ParkForm
            key={`${request.when}|${request.title ?? ""}`}
            initialWhen={request.when}
            autoFocus
            onParked={closePark}
          />
          <Waiting />
        </div>
      )}
    </Dialog>
  );
}

/** A parked thought that came back: Done, Add to today, Dismiss. */
export function ThoughtRow({ thought }: { thought: ParkedThought }) {
  return (
    <li className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-base text-text">{thought.text}</p>
        <p className="text-sm text-muted">Parked {PARKED_FOR[thought.when]}</p>
      </div>
      <div className="-ml-2 flex shrink-0 flex-wrap gap-1 sm:ml-0">
        <Button
          size="sm"
          variant="ghost"
          icon={Check}
          onClick={() => {
            markThoughtDone(thought.id);
            toast("Marked done.", { tone: "success" });
          }}
        >
          Done
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={CalendarPlus}
          onClick={() => {
            addThoughtToToday(thought.id);
            toast("Added to today's plan.", { tone: "success" });
          }}
        >
          Add to today
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={X}
          onClick={() => {
            const removed = dismissThought(thought.id);
            if (removed)
              toast("Dismissed.", {
                action: { label: "Undo", onClick: () => restoreThought(removed) },
              });
          }}
        >
          Dismiss
        </Button>
      </div>
    </li>
  );
}
