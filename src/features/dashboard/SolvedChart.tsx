// Problems solved per week by difficulty (F17), a stacked bar chart on the kit's Recharts wrapper
// (loaded on demand with the page). The ordinal blue ramp reads easy to hard in both themes.
import { BarsChart } from "@/components/ui/charts";
import { shortDay, type WeekSolved } from "@/lib/insight/dashboard";

export default function SolvedChart({ weeks }: { weeks: WeekSolved[] }) {
  const data = weeks.map((w) => ({
    week: shortDay(w.week),
    easy: w.easy,
    medium: w.medium,
    hard: w.hard,
  }));
  return (
    <BarsChart
      title="Problems solved per week"
      description="Every attempt saved as solved (alone or with hints), re-solves included, by the week it was saved (Monday to Sunday)."
      data={data}
      xKey="week"
      xLabel="Week of"
      stacked
      series={[
        { key: "easy", label: "Easy", color: "var(--chart-1)" },
        { key: "medium", label: "Medium", color: "var(--chart-2)" },
        { key: "hard", label: "Hard", color: "var(--chart-3)" },
      ]}
    />
  );
}
