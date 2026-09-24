// Chart wrappers (section 12.7) on Recharts, following one set of mark specs: bars at most 24 px
// thick with a 4 px rounded end, 2 px lines, 8 px dots with a surface ring, a 2 px surface gap
// between stacked segments, hairline solid gridlines, text in text colors (never series colors),
// a legend for two or more series, a hover tooltip, and a table view for every chart.
// Colors come from tokens (--chart-*), so charts follow the light and dark themes.
import { useId, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cx } from "./cx";

export interface ChartSeries {
  key: string;
  label: string;
  /** A CSS color, normally a token such as var(--chart-2). */
  color: string;
}

type Datum = Record<string, string | number | null>;

const AXIS_TICK = {
  fill: "var(--chart-axis)",
  fontSize: 12,
  fontFamily: "var(--font-condensed)",
} as const;

const numberFormat = new Intl.NumberFormat();

function ChartTooltip({
  active,
  payload,
  label,
  series,
  format,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  series: ChartSeries[];
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(payload.map((p) => [String(p.dataKey), p.value]));
  return (
    <div className="rounded-control border border-rule bg-surface-raised px-3 py-2 text-sm text-text shadow-float">
      <p className="mb-1 font-medium">{String(label ?? "")}</p>
      <ul className="space-y-0.5">
        {series.map((s) => {
          const v = byKey.get(s.key);
          if (v === undefined || v === null) return null;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-muted">{s.label}</span>
              <span className="ml-auto pl-4 font-medium tabular-nums">{format(Number(v))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[3px]"
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartFrameProps {
  title: string;
  description?: ReactNode;
  series: ChartSeries[];
  data: Datum[];
  xKey: string;
  xLabel: string;
  format: (v: number) => string;
  children: ReactNode;
  className?: string;
}

/** Title, legend, the chart, and a "Show as table" switch (the accessible view of the data). */
function ChartFrame({
  title,
  description,
  series,
  data,
  xKey,
  xLabel,
  format,
  children,
  className,
}: ChartFrameProps) {
  const [table, setTable] = useState(false);
  const id = useId();
  return (
    <figure className={cx("min-w-0", className)} aria-labelledby={`${id}-title`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <figcaption id={`${id}-title`} className="text-base font-semibold text-text">
            {title}
          </figcaption>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="h-8 shrink-0 rounded-control px-2 text-sm text-accent hover:bg-accent-soft max-md:h-10"
        >
          {table ? "Show as chart" : "Show as table"}
        </button>
      </div>
      {table ? (
        <div className="overflow-x-auto rounded-control border border-rule">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {xLabel}
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-rule">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-text">
                    {String(d[xKey] ?? "")}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right text-text tabular-nums">
                      {d[s.key] === null || d[s.key] === undefined ? "–" : format(Number(d[s.key]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Legend series={series} />
          <div className="mt-2" aria-hidden="true">
            {children}
          </div>
          <p className="sr-only">Use "Show as table" to read the values.</p>
        </>
      )}
    </figure>
  );
}

interface BarsProps {
  title: string;
  description?: ReactNode;
  data: Datum[];
  xKey: string;
  xLabel: string;
  series: ChartSeries[];
  /** Stack the series in one column per x value (for example easy, medium and hard). */
  stacked?: boolean;
  height?: number;
  format?: (v: number) => string;
  className?: string;
}

export function BarsChart({
  title,
  description,
  data,
  xKey,
  xLabel,
  series,
  stacked,
  height = 220,
  format = (v) => numberFormat.format(v),
  className,
}: BarsProps) {
  return (
    <ChartFrame
      title={title}
      description={description}
      series={series}
      data={data}
      xKey={xKey}
      xLabel={xLabel}
      format={format}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--rule-strong)" }}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)" }}
            content={(p) => (
              <ChartTooltip
                active={p.active}
                payload={p.payload}
                label={p.label}
                series={series}
                format={format}
              />
            )}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "stack" : undefined}
              fill={s.color}
              maxBarSize={24}
              // Stacked: only the top segment gets the rounded end; the gap between segments is
              // the surface color, never a border.
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
              stroke="var(--surface)"
              strokeWidth={stacked ? 2 : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

interface LinesProps {
  title: string;
  description?: ReactNode;
  data: Datum[];
  xKey: string;
  xLabel: string;
  series: ChartSeries[];
  height?: number;
  yDomain?: [number, number];
  format?: (v: number) => string;
  className?: string;
}

export function LinesChart({
  title,
  description,
  data,
  xKey,
  xLabel,
  series,
  height = 220,
  yDomain,
  format = (v) => numberFormat.format(v),
  className,
}: LinesProps) {
  return (
    <ChartFrame
      title={title}
      description={description}
      series={series}
      data={data}
      xKey={xKey}
      xLabel={xLabel}
      format={format}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--rule-strong)" }}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--rule-strong)", strokeWidth: 1 }}
            content={(p) => (
              <ChartTooltip
                active={p.active}
                payload={p.payload}
                label={p.label}
                series={series}
                format={format}
              />
            )}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export interface MeterDatum {
  id: string;
  label: string;
  /** 0 to 100. */
  value: number;
  href?: string;
}

interface MeterListProps {
  title: string;
  description?: ReactNode;
  data: MeterDatum[];
  format?: (v: number) => string;
  className?: string;
}

/** Horizontal bars for scores out of 100 (subject readiness), weakest first by the caller. */
export function MeterList({
  title,
  description,
  data,
  format = (v) => `${Math.round(v)}`,
  className,
}: MeterListProps) {
  return (
    <figure className={cx("min-w-0", className)}>
      <figcaption className="text-base font-semibold text-text">{title}</figcaption>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <ul className="mt-3 space-y-2">
        {data.map((d) => {
          const v = Math.min(100, Math.max(0, d.value));
          const row = (
            <>
              <span className="w-32 shrink-0 truncate text-sm text-text sm:w-40">{d.label}</span>
              <span
                className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                role="meter"
                aria-label={d.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(v)}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${v}%`, background: "var(--chart-series)" }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-sm text-muted tabular-nums">
                {format(v)}
              </span>
            </>
          );
          return (
            <li key={d.id}>
              {d.href ? (
                <a
                  href={d.href}
                  className="flex items-center gap-3 rounded-control py-0.5 hover:bg-surface-sunken"
                >
                  {row}
                </a>
              ) : (
                <div className="flex items-center gap-3 py-0.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
