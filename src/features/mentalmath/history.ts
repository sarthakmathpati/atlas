// Chart rows for the mental math history (F28), apart from the chart component for fast refresh.
import { shortDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { MentalMathRun } from "@/lib/types";

/** Chart rows: the latest 30 runs, oldest first, labelled by day ("27 Sep", "27 Sep (2)"). */
export function historyRows(runs: readonly MentalMathRun[]) {
  const today = localDate();
  const recent = runs.slice(-30);
  const perDay = new Map<string, number>();
  return recent.map((r) => {
    const day = localDate(new Date(r.createdAt));
    const n = (perDay.get(day) ?? 0) + 1;
    perDay.set(day, n);
    const answered = r.answered ?? r.total;
    return {
      run: n > 1 ? `${shortDate(day, today)} (${n})` : shortDate(day, today),
      score: r.total > 0 ? Math.round((1000 * r.correct) / r.total) / 10 : 0,
      speed: answered > 0 ? Math.round((10 * r.seconds) / answered) / 10 : null,
    };
  });
}
