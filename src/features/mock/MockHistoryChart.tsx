// The average score of each finished mock of one type, over time (F15), with "Show as table".
// Loaded on demand with the chart library.
import { LinesChart } from "@/components/ui/charts";
import type { MockSession } from "@/lib/types";
import { trendRows } from "./history";
import type { MockKind } from "@/lib/mock/mock";

export default function MockHistoryChart({
  sessions,
  kind,
  label,
}: {
  sessions: readonly MockSession[];
  kind: MockKind;
  label: string;
}) {
  return (
    <LinesChart
      title={`${label}: average score`}
      description="The mean of the interviewer's scores, from 1 to 5."
      data={trendRows(sessions, kind)}
      xKey="date"
      xLabel="Mock"
      series={[{ key: "score", label: "Average score", color: "var(--chart-series)" }]}
      yDomain={[1, 5]}
      format={(v) => v.toFixed(1)}
      height={200}
    />
  );
}
