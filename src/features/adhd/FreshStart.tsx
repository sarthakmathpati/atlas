// Fresh start (F32, part 11, gentle language): on Review, when more than 30 items are overdue,
// one button spreads them over the next 7 days, the most urgent first. Only their due dates move
// (steps, intervals and history stay), and the toast can undo it.
import { Sunrise } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";
import {
  FRESH_START_DAYS,
  FRESH_START_OVER,
  freshStartDates,
  mergeOverdue,
} from "@/lib/adhd/freshStart";
import type { ReviewQueue } from "@/lib/review/queue";
import { useAdhdPart } from "@/stores/adhdStore";
import { restoreConceptStates, setConceptDueDates } from "@/stores/conceptStateStore";
import { restoreSnapshot, setProblemDueDates } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";

export function FreshStart({ queue, today }: { queue: ReviewQueue; today: string }) {
  const on = useAdhdPart("gentle");
  if (!on) return null;
  const overdue = mergeOverdue(
    queue.problems.map((p) => ({
      key: `problem:${p.info.id}`,
      dueAt: p.dueAt,
      daysLate: p.daysLate,
    })),
    queue.concepts.map((c) => ({
      key: `concept:${c.conceptId}`,
      dueAt: c.dueAt,
      daysLate: c.daysLate,
    })),
  );
  if (overdue.length <= FRESH_START_OVER) return null;
  const perDay = Math.ceil(overdue.length / FRESH_START_DAYS);
  const apply = () => {
    const dates = freshStartDates(overdue, today);
    const problems: Record<string, string> = {};
    const concepts: Record<string, string> = {};
    for (const [key, dueAt] of dates) {
      const at = key.indexOf(":");
      const kind = key.slice(0, at);
      const id = key.slice(at + 1);
      if (kind === "problem") problems[id] = dueAt;
      else concepts[id] = dueAt;
    }
    const problemsBefore = setProblemDueDates(problems);
    const conceptsBefore = setConceptDueDates(concepts);
    toast(
      `A fresh start: ${overdue.length} reviews spread over the next ${FRESH_START_DAYS} days, about ${perDay} a day.`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            restoreSnapshot(problemsBefore);
            restoreConceptStates(conceptsBefore);
          },
        },
      },
    );
  };
  return (
    <Callout
      className="mb-6"
      icon={Sunrise}
      title="Make a fresh start?"
      actions={
        <Button variant="primary" onClick={apply}>
          Fresh start
        </Button>
      }
    >
      {overdue.length} reviews are waiting from earlier days. A fresh start spreads them over the
      next {FRESH_START_DAYS} days, about {perDay} a day, the most urgent first. Only their dates
      move: what you know and how far apart reviews come stay the same. You can undo it.
    </Callout>
  );
}
