// CodeView (section 12.7): read-only, highlighted code with optional line numbers and a Copy
// button. Wide code scrolls inside its own box; the page never scrolls sideways (section 2.5).
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { cx } from "../cx";
import { highlightLines } from "./highlight";
import { CODE_LANGUAGE_LABEL, normalizeLanguage } from "./languages";

interface CodeViewProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  /** Show the language name and a Copy button above the code. */
  toolbar?: boolean;
  /** 1-based line numbers to mark (for example lines a code review points at). */
  markLines?: number[];
  maxHeight?: number | string;
  className?: string;
}

export function CodeView({
  code,
  language,
  lineNumbers = false,
  toolbar = true,
  markLines,
  maxHeight,
  className,
}: CodeViewProps) {
  const lang = normalizeLanguage(language);
  const lines = useMemo(() => highlightLines(code.replace(/\n$/, ""), lang), [code, lang]);
  const marked = useMemo(() => new Set(markLines), [markLines]);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const gutterWidth = `${String(lines.length).length + 1}ch`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2000);
  };

  return (
    <div className={cx("overflow-hidden rounded-control border border-rule bg-code", className)}>
      {toolbar && (
        <div className="flex h-9 items-center justify-between gap-2 border-b border-rule pr-1 pl-3">
          <span className="text-xs font-medium text-muted">{CODE_LANGUAGE_LABEL[lang]}</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-muted hover:bg-surface-sunken hover:text-text max-md:h-9"
          >
            {copied === "copied" ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <Copy size={13} aria-hidden="true" />
            )}
            {copied === "copied" ? "Copied" : copied === "failed" ? "Select and copy" : "Copy"}
          </button>
        </div>
      )}
      <pre
        className="atlas-code overflow-auto py-3"
        style={{ maxHeight }}
        tabIndex={0}
        aria-label={`${CODE_LANGUAGE_LABEL[lang]} code`}
      >
        <code className="block min-w-max">
          {lines.map((tokens, i) => (
            <span
              key={i}
              className={cx(
                "block pr-4",
                lineNumbers ? "pl-0" : "pl-4",
                marked.has(i + 1) && "bg-warning-soft",
              )}
            >
              {lineNumbers && (
                <span
                  aria-hidden="true"
                  className="inline-block pr-3 pl-3 text-right text-[var(--code-gutter)] select-none"
                  style={{ width: `calc(${gutterWidth} + 24px)` }}
                >
                  {i + 1}
                </span>
              )}
              {tokens.length === 0 || (tokens.length === 1 && tokens[0]?.text === "")
                ? "​"
                : tokens.map((t, j) =>
                    t.className ? (
                      <span key={j} className={t.className}>
                        {t.text}
                      </span>
                    ) : (
                      t.text
                    ),
                  )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
