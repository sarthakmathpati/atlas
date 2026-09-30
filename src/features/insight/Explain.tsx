// Every number on the dashboard and in the weekly review can show where it comes from (F17 "every
// number is traceable"): the number is a button with a dotted underline that opens a popover with
// the data and the formula behind it.
import { Info } from "lucide-react";
import type { CSSProperties, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { Popover } from "@/components/ui/Popover";

interface ExplainNumberProps {
  /** What is shown (the number, or a short phrase). */
  children: ReactNode;
  /** The popover's heading and the button's name: "Overall readiness". */
  label: string;
  /** Plain text of the value for screen readers ("72 out of 100"). */
  valueText: string;
  /** The explanation. */
  explain: ReactNode;
  className?: string;
  style?: CSSProperties;
  wide?: boolean;
  /** For a group of numbers with one tab stop (the summit profile's points move with arrows). */
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus?: (e: FocusEvent<HTMLButtonElement>) => void;
  /** Marks the trigger, for example `data-point`. */
  dataPoint?: number;
}

export function ExplainNumber({
  children,
  label,
  valueText,
  explain,
  className,
  style,
  wide,
  tabIndex,
  onKeyDown,
  onFocus,
  dataPoint,
}: ExplainNumberProps) {
  return (
    <Popover
      label={label}
      placement="bottom-start"
      className={cx(wide ? "w-[26rem]" : "w-80", "max-w-[calc(100vw-2rem)]")}
      renderTrigger={(props) => (
        <button
          {...props}
          ref={props.ref}
          type="button"
          aria-label={`${label}: ${valueText}. Show how it's worked out`}
          style={style}
          tabIndex={tabIndex}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          data-point={dataPoint}
          className={cx(
            "cursor-help rounded-[3px] text-left underline decoration-rule-strong decoration-dotted underline-offset-4 hover:decoration-accent focus-visible:decoration-accent",
            className,
          )}
        >
          {children}
        </button>
      )}
    >
      {() => (
        <div className="space-y-2 text-sm text-text">
          <p className="font-semibold">{label}</p>
          {explain}
        </div>
      )}
    </Popover>
  );
}

/** An info button with the same popover, for a section as a whole. */
export function ExplainButton({
  label,
  explain,
  wide,
}: {
  label: string;
  explain: ReactNode;
  wide?: boolean;
}) {
  return (
    <Popover
      label={label}
      placement="bottom-end"
      className={cx(wide ? "w-[26rem]" : "w-80", "max-w-[calc(100vw-2rem)]")}
      renderTrigger={(props) => (
        <button
          {...props}
          ref={props.ref}
          type="button"
          aria-label={label}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control px-2 text-sm text-accent hover:bg-accent-soft max-md:h-10"
        >
          <Info size={15} aria-hidden="true" />
          How it's worked out
        </button>
      )}
    >
      {() => (
        <div className="space-y-2 text-sm text-text">
          <p className="font-semibold">{label}</p>
          {explain}
        </div>
      )}
    </Popover>
  );
}

/** A formula line, set in the reading font with tabular numbers. */
export function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-control bg-surface-sunken px-2.5 py-1.5 text-sm text-text tabular-nums">
      {children}
    </p>
  );
}

/** A small two-column table of the numbers behind a figure. */
export function MathTable({
  rows,
  head,
}: {
  head?: [string, ...string[]];
  rows: (string | number)[][];
}) {
  return (
    <div className="max-h-64 overflow-auto rounded-control border border-rule">
      <table className="w-full text-sm">
        {head && (
          <thead className="sticky top-0 bg-surface-sunken text-left text-muted">
            <tr>
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cx("px-2.5 py-1.5 font-medium", i > 0 && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-rule first:border-t-0">
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-2.5 py-1 text-left font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="px-2.5 py-1 text-right tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
