// Tabs (section 12.7): an underlined tab list with arrow-key navigation (automatic activation).
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** A small count after the label. */
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  label: string;
  className?: string;
  /** Renders the active panel. */
  children?: (value: T) => ReactNode;
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
  children,
}: TabsProps<T>) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((t) => t.value === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-rule [scrollbar-width:none]"
      >
        {items.map((item, i) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.value}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${item.value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cx(
                "relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-base font-medium whitespace-nowrap transition-colors max-md:h-11",
                "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
                active
                  ? "text-text after:bg-accent"
                  : "text-muted after:bg-transparent hover:text-text",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-surface-sunken px-1.5 text-xs text-muted tabular-nums">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children && (
        <div
          role="tabpanel"
          id={`${base}-panel-${value}`}
          aria-labelledby={`${base}-tab-${value}`}
          tabIndex={0}
          className="outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {children(value)}
        </div>
      )}
    </div>
  );
}
