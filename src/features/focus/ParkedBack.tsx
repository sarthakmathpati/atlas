// Parked thoughts that came back (F31), above every page: each with Done, Add to today and
// Dismiss. During a focus block they wait for the break (held notices), like other reminders.
import { SquareParking } from "lucide-react";
import { useMemo } from "react";
import { thoughtsBack } from "@/lib/focus/park";
import { useParkStore } from "@/stores/parkStore";
import { useHoldingNotices, useTicker } from "./hooks";
import { ThoughtRow } from "./Park";

export function ParkedBack() {
  const thoughts = useParkStore((s) => s.thoughts);
  const holding = useHoldingNotices();
  const now = useTicker(30_000);
  const back = useMemo(() => thoughtsBack(Object.values(thoughts), new Date(now)), [thoughts, now]);
  if (holding || back.length === 0) return null;
  return (
    <section aria-labelledby="parked-back-heading" className="rounded-panel bg-info-soft px-4 py-3">
      <h2
        id="parked-back-heading"
        className="flex items-center gap-2 text-base font-medium text-text"
      >
        <SquareParking size={18} aria-hidden="true" className="text-accent" />
        {back.length === 1
          ? "A thought you parked is back"
          : `${back.length} thoughts you parked are back`}
      </h2>
      <ul className="divide-y divide-rule">
        {back.slice(0, 5).map((t) => (
          <ThoughtRow key={t.id} thought={t} />
        ))}
      </ul>
      {back.length > 5 && (
        <p className="pt-1 text-sm text-muted">
          {back.length - 5} more come back after you deal with these.
        </p>
      )}
    </section>
  );
}
