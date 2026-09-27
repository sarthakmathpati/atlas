// Score and speed over time for one sprint mode (F28), as two small line charts with "Show as
// table". Loaded on demand with the chart library.
import { LinesChart } from "@/components/ui/charts";
import type { MentalMathRun } from "@/lib/types";
import { historyRows } from "./history";

const pct = (v: number) => `${Math.round(v)}%`;
const secs = (v: number) => `${v.toFixed(1)} s`;

export default function HistoryCharts({ runs }: { runs: readonly MentalMathRun[] }) {
  const data = historyRows(runs);
  return (
    <div className="space-y-6">
      <LinesChart
        title="Score"
        description="Share of the sprint's questions right."
        data={data}
        xKey="run"
        xLabel="Run"
        series={[{ key: "score", label: "Score", color: "var(--chart-series)" }]}
        yDomain={[0, 100]}
        format={pct}
        height={180}
      />
      <LinesChart
        title="Speed"
        description="Seconds per answer. Lower is faster."
        data={data}
        xKey="run"
        xLabel="Run"
        series={[{ key: "speed", label: "Seconds per answer", color: "var(--chart-3)" }]}
        format={secs}
        height={180}
      />
    </div>
  );
}
