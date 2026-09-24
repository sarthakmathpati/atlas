// DiffView (section 12.7, F7): compares two attempts' code side by side (unified on phones),
// with syntax highlighting, changed words marked, and long unchanged stretches folded.
import { ChevronsUpDown } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { cx } from "../cx";
import { useIsMobile } from "../hooks";
import { applyMarks, diffRows, foldRows, type DiffRow, type DiffSide } from "./diffRows";
import { highlightLines, type Token } from "./highlight";
import { normalizeLanguage } from "./languages";

interface DiffViewProps {
  before: string;
  after: string;
  language?: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** "auto" is side by side on wide screens and unified on phones. */
  mode?: "auto" | "split" | "unified";
  className?: string;
}

function Code({ side, tokens }: { side: DiffSide; tokens: Token[][] }) {
  const lineTokens = tokens[side.n - 1] ?? [{ text: side.text, className: "" }];
  const parts = applyMarks(lineTokens, side.marks);
  if (side.text === "") return <>{"​"}</>;
  return (
    <>
      {parts.map((p, i) => (
        <span
          key={i}
          className={cx(p.className, p.marked && "rounded-[2px]")}
          data-marked={p.marked || undefined}
        >
          {p.text}
        </span>
      ))}
    </>
  );
}

const ROW_BG: Record<"add" | "del", string> = {
  add: "bg-[var(--diff-add-bg)]",
  del: "bg-[var(--diff-del-bg)]",
};

function Gutter({ n }: { n: number | null }) {
  return (
    <td className="w-px border-r border-rule px-2 text-right align-top text-[var(--code-gutter)] select-none">
      {n ?? ""}
    </td>
  );
}

export function DiffView({
  before,
  after,
  language,
  beforeLabel = "Before",
  afterLabel = "After",
  mode = "auto",
  className,
}: DiffViewProps) {
  const isMobile = useIsMobile();
  const unified = mode === "unified" || (mode === "auto" && isMobile);
  const lang = normalizeLanguage(language);
  const leftTokens = useMemo(() => highlightLines(before, lang), [before, lang]);
  const rightTokens = useMemo(() => highlightLines(after, lang), [after, lang]);
  const allRows = useMemo(() => diffRows(before, after), [before, after]);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  const rows = useMemo(() => {
    const folded = foldRows(allRows);
    const out: DiffRow[] = [];
    for (const row of folded) {
      if (row.kind === "gap" && expanded.has(row.from)) {
        out.push(...allRows.slice(row.from, row.from + row.hidden));
      } else out.push(row);
    }
    return out;
  }, [allRows, expanded]);

  const changes = allRows.filter((r) => r.kind !== "same").length;
  const markStyle =
    "[&_[data-marked]]:bg-[var(--diff-del-mark)] [&_.diff-add_[data-marked]]:bg-[var(--diff-add-mark)]";

  const gapRow = (row: Extract<DiffRow, { kind: "gap" }>, cols: number) => (
    <tr key={`gap-${row.from}`}>
      <td colSpan={cols} className="border-y border-rule bg-surface-sunken p-0">
        <button
          type="button"
          onClick={() => setExpanded((s) => new Set(s).add(row.from))}
          className="flex h-8 w-full items-center gap-2 px-3 font-sans text-xs text-muted hover:text-text max-md:h-10"
        >
          <ChevronsUpDown size={14} aria-hidden="true" />
          Show {row.hidden} unchanged {row.hidden === 1 ? "line" : "lines"}
        </button>
      </td>
    </tr>
  );

  return (
    <div className={cx("overflow-hidden rounded-control border border-rule bg-code", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2 text-xs text-muted">
        <span>
          {changes === 0
            ? "No differences."
            : `${changes} changed ${changes === 1 ? "line" : "lines"}.`}
        </span>
        {!unified && (
          <span className="hidden gap-6 sm:flex">
            <span>{beforeLabel}</span>
            <span>{afterLabel}</span>
          </span>
        )}
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Changes from ${beforeLabel} to ${afterLabel}`}
      >
        <table
          className={cx("atlas-code w-full min-w-max border-collapse whitespace-pre", markStyle)}
        >
          <tbody>
            {unified
              ? rows.map((row, i) => {
                  if (row.kind === "gap") return gapRow(row, 3);
                  const lines: {
                    kind: "same" | "add" | "del";
                    left: number | null;
                    right: number | null;
                    side: DiffSide;
                    tokens: Token[][];
                  }[] = [];
                  if (row.kind === "same")
                    lines.push({
                      kind: "same",
                      left: row.left.n,
                      right: row.right.n,
                      side: row.right,
                      tokens: rightTokens,
                    });
                  if (row.kind === "change" || row.kind === "del")
                    lines.push({
                      kind: "del",
                      left: row.left.n,
                      right: null,
                      side: row.left,
                      tokens: leftTokens,
                    });
                  if (row.kind === "change" || row.kind === "add")
                    lines.push({
                      kind: "add",
                      left: null,
                      right: row.right.n,
                      side: row.right,
                      tokens: rightTokens,
                    });
                  return (
                    <Fragment key={i}>
                      {lines.map((l, j) => (
                        <tr
                          key={j}
                          className={cx(
                            l.kind !== "same" && ROW_BG[l.kind],
                            l.kind === "add" && "diff-add",
                          )}
                        >
                          <Gutter n={l.left} />
                          <Gutter n={l.right} />
                          <td className="px-3">
                            <span
                              aria-hidden="true"
                              className="mr-2 inline-block w-2 text-muted select-none"
                            >
                              {l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}
                            </span>
                            <span className="sr-only">
                              {l.kind === "add" ? "Added: " : l.kind === "del" ? "Removed: " : ""}
                            </span>
                            <Code side={l.side} tokens={l.tokens} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              : rows.map((row, i) => {
                  if (row.kind === "gap") return gapRow(row, 4);
                  const left = row.left;
                  const right = row.right;
                  const leftBg = row.kind === "del" || row.kind === "change" ? ROW_BG.del : "";
                  const rightBg = row.kind === "add" || row.kind === "change" ? ROW_BG.add : "";
                  return (
                    <tr key={i}>
                      <Gutter n={left?.n ?? null} />
                      <td
                        className={cx(
                          "w-1/2 border-r border-rule px-3",
                          leftBg,
                          !left && "bg-surface-sunken/60",
                        )}
                      >
                        {left && (
                          <>
                            {row.kind !== "same" && <span className="sr-only">Removed: </span>}
                            <Code side={left} tokens={leftTokens} />
                          </>
                        )}
                      </td>
                      <Gutter n={right?.n ?? null} />
                      <td
                        className={cx(
                          "diff-add w-1/2 px-3",
                          rightBg,
                          !right && "bg-surface-sunken/60",
                        )}
                      >
                        {right && (
                          <>
                            {row.kind !== "same" && <span className="sr-only">Added: </span>}
                            <Code side={right} tokens={rightTokens} />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
