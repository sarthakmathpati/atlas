// Sample charts for the design kit (the dashboard in phase 7 uses the same wrappers).
import { BarsChart, LinesChart, MeterList } from "@/components/ui/charts";

const WEEKS = ["4 Aug", "11 Aug", "18 Aug", "25 Aug", "1 Sep", "8 Sep", "15 Sep", "22 Sep"];
const SOLVED = [
  [3, 1, 0],
  [4, 2, 0],
  [2, 3, 1],
  [5, 2, 0],
  [3, 4, 1],
  [2, 5, 1],
  [4, 3, 2],
  [3, 4, 1],
];

export default function KitCharts() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <BarsChart
        title="Problems solved per week"
        description="Solved on your own, by difficulty."
        xKey="week"
        xLabel="Week"
        stacked
        series={[
          { key: "easy", label: "Easy", color: "var(--chart-1)" },
          { key: "medium", label: "Medium", color: "var(--chart-2)" },
          { key: "hard", label: "Hard", color: "var(--chart-3)" },
        ]}
        data={WEEKS.map((week, i) => ({
          week,
          easy: SOLVED[i]![0]!,
          medium: SOLVED[i]![1]!,
          hard: SOLVED[i]![2]!,
        }))}
      />
      <LinesChart
        title="Mental math score"
        description="Correct answers per 8-minute sprint."
        xKey="run"
        xLabel="Run"
        yDomain={[0, 80]}
        series={[{ key: "score", label: "Score", color: "var(--chart-series)" }]}
        data={[31, 36, 35, 42, 47, 45, 52, 58].map((score, i) => ({ run: `Run ${i + 1}`, score }))}
      />
      <MeterList
        title="Subject readiness"
        description="Weakest first."
        data={[
          { id: "sysd", label: "System design", value: 18 },
          { id: "os", label: "Operating systems", value: 34 },
          { id: "cn", label: "Computer networks", value: 41 },
          { id: "dsa", label: "Data structures and algorithms", value: 63 },
        ]}
      />
    </div>
  );
}
