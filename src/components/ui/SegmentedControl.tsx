// SegmentedControl (section 12.7): a small set of mutually exclusive options, such as
// Simple | Interview | Deep. A radio group with arrow-key navigation.
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Accessible name when the label is visually hidden on small screens. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  size?: "sm" | "md";
  /** Stretch the segments to fill the width. */
  full?: boolean;
  /** Show only icons below 640 px. */
  compactOnMobile?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  full,
  compactOnMobile,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((o) => o.value === value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        "inline-flex rounded-control border border-rule bg-surface-sunken p-0.5",
        full && "flex w-full",
        className,
      )}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap transition-colors duration-100",
              size === "sm" ? "h-7 px-2.5 text-sm max-md:h-10" : "h-8 px-3 text-base max-md:h-10",
              full && "flex-1",
              active
                ? "bg-surface text-text shadow-[0_0_0_1px_var(--rule)]"
                : "text-muted hover:text-text",
            )}
          >
            {Icon && <Icon size={15} aria-hidden="true" className="shrink-0" />}
            <span className={cx(compactOnMobile && Icon && "max-sm:sr-only")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
