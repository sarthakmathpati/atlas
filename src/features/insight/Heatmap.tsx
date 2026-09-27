// The activity heatmap (F29): a cell per day in columns of ISO weeks, colored by minutes with the
// --heat-* ramp (validated for both themes), days the streak freeze covered outlined, a hover
// tooltip per cell, a legend, and "Show as table" (weeks with minutes and active days).
import { useId, useMemo, useState, type PointerEvent } from "react";
import { cx } from "@/components/ui/cx";
import { heatmapWeeks, summarize, type HeatCell } from "@/lib/activity/heatmap";
import type { DayLookup } from "@/lib/activity/streak";
import { formatMinutes, parseLocalDate } from "@/lib/time";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 26;
const TOP = 16;

const LEVELS = ["No activity", "1 to 29 min", "30 to 59 min", "60 to 119 min", "120 min or more"];

const dayLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const monthLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, { month: "short" });

function cellText(c: HeatCell): string {
  const parts = [dayLabel(c.date), c.minutes ? formatMinutes(c.minutes) : "no minutes"];
  if (c.frozen) parts.push("the streak freeze covered this day");
  else if (c.active) parts.push("an active day");
  return parts.join(", ");
}

interface HeatmapProps {
  lookup: DayLookup;
  today: string;
  weeks: number;
  frozen?: ReadonlySet<string>;
  /** Smaller, without the table switch (the Today preview). */
  compact?: boolean;
  className?: string;
}

export function Heatmap({ lookup, today, weeks, frozen, compact, className }: HeatmapProps) {
  const columns = useMemo(
    () => heatmapWeeks(lookup, today, weeks, frozen),
    [lookup, today, weeks, frozen],
  );
  const summary = useMemo(() => summarize(columns), [columns]);
  const [hover, setHover] = useState<{ cell: HeatCell; x: number; y: number } | null>(null);
  const [table, setTable] = useState(false);
  const id = useId();

  const width = LEFT + columns.length * STEP;
  const height = TOP + 7 * STEP;
  const months: { x: number; label: string }[] = [];
  columns.forEach((col, i) => {
    const first = col[0]!.date;
    const prev = columns[i - 1]?.[0]?.date;
    if (!prev || prev.slice(0, 7) !== first.slice(0, 7)) {
      // Skip a label that would crowd the previous one.
      if (months.length && i * STEP - months[months.length - 1]!.x < 3 * STEP) return;
      months.push({ x: i * STEP, label: monthLabel(first) });
    }
  });

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const date = target.getAttribute("data-date");
    if (!date) return setHover(null);
    const cell = columns.flat().find((c) => c.date === date);
    if (!cell || cell.future) return setHover(null);
    const box = e.currentTarget.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    setHover({ cell, x: r.left - box.left + CELL / 2, y: r.top - box.top });
  };

  const label = `Activity over the last ${weeks} weeks: ${summary.activeDays} active days of ${summary.days}, ${formatMinutes(summary.minutes)} in all.`;

  return (
    <figure className={cx("min-w-0", className)} aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">
        {label}
      </figcaption>
      {!compact && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {summary.activeDays} active days of {summary.days}, {formatMinutes(summary.minutes)} in
            all
          </p>
          <button
            type="button"
            onClick={() => setTable((t) => !t)}
            aria-pressed={table}
            className="h-8 shrink-0 rounded-control px-2 text-sm text-accent hover:bg-accent-soft max-md:h-10"
          >
            {table ? "Show as chart" : "Show as table"}
          </button>
        </div>
      )}
      {table ? (
        <div className="max-h-80 overflow-auto rounded-control border border-rule">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-sunken text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Week of
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Minutes
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Active days
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Freeze used
                </th>
              </tr>
            </thead>
            <tbody>
              {[...columns].reverse().map((col) => {
                const days = col.filter((c) => !c.future);
                return (
                  <tr key={col[0]!.date} className="border-t border-rule">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal text-text">
                      {dayLabel(col[0]!.date)}
                    </th>
                    <td className="px-3 py-1.5 text-right text-text tabular-nums">
                      {days.reduce((n, c) => n + c.minutes, 0)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text tabular-nums">
                      {days.filter((c) => c.active).length}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text">
                      {days.some((c) => c.frozen) ? "Yes" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative overflow-x-auto pb-1">
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            className="block"
          >
            {!compact &&
              months.map((m) => (
                <text
                  key={m.x}
                  x={LEFT + m.x}
                  y={10}
                  fontSize={11}
                  fill="var(--chart-axis)"
                  fontFamily="var(--font-condensed)"
                >
                  {m.label}
                </text>
              ))}
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) =>
              d ? (
                <text
                  key={d}
                  x={0}
                  y={TOP + i * STEP + CELL - 2}
                  fontSize={10}
                  fill="var(--chart-axis)"
                  fontFamily="var(--font-condensed)"
                >
                  {d}
                </text>
              ) : null,
            )}
            {columns.map((col, x) =>
              col.map((c, y) =>
                c.future ? null : (
                  <rect
                    key={c.date}
                    data-date={c.date}
                    x={LEFT + x * STEP}
                    y={TOP + y * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2.5}
                    fill={`var(--heat-${c.level})`}
                    stroke={
                      c.frozen ? "var(--text-muted)" : c.date === today ? "var(--text)" : "none"
                    }
                    strokeWidth={c.frozen || c.date === today ? 1.5 : 0}
                    strokeDasharray={c.frozen ? "2 1.5" : undefined}
                  />
                ),
              ),
            )}
          </svg>
          {hover && (
            <div
              role="presentation"
              className="pointer-events-none absolute z-10 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-control border border-rule bg-surface-raised px-2.5 py-1.5 text-sm text-text shadow-float"
              style={{ left: hover.x, top: hover.y - 6 }}
            >
              {cellText(hover.cell)}
            </div>
          )}
        </div>
      )}
      {!table && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {LEVELS.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-[2.5px]"
                style={{ background: `var(--heat-${i})` }}
              />
              {compact ? (i === 0 ? "0" : l.replace(" min", "").replace(" or more", "+")) : l}
            </span>
          ))}
          {frozen && frozen.size > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-[2.5px] border border-dashed border-muted"
              />
              Streak freeze
            </span>
          )}
        </div>
      )}
    </figure>
  );
}
