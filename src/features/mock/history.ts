// Chart rows for mock history (F15), apart from the chart component for fast refresh.
import { scoreTrend, type MockKind } from "@/lib/mock/mock";
import { shortDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { MockSession } from "@/lib/types";

export function trendRows(sessions: readonly MockSession[], kind: MockKind) {
  const today = localDate();
  const perDay = new Map<string, number>();
  return scoreTrend(sessions, kind).map(({ session, mean }) => {
    const day = localDate(new Date(session.endedAt ?? session.startedAt));
    const n = (perDay.get(day) ?? 0) + 1;
    perDay.set(day, n);
    return { date: n > 1 ? `${shortDate(day, today)} (${n})` : shortDate(day, today), score: mean };
  });
}
