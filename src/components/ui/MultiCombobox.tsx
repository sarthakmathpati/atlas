// MultiCombobox (section 12.7): search plus multi-select, used for concepts, mistake tags and
// focus subjects. ARIA 1.2 combobox pattern: the input keeps focus, arrow keys move through the
// list, Enter toggles, Backspace in an empty input removes the last choice.
import { Check, ChevronDown, Plus } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { TagChip } from "./Chip";
import { cx } from "./cx";
import { FloatingPanel } from "./floating";

export interface ComboOption {
  value: string;
  label: string;
  /** Shown under the label (for example the topic of a concept). */
  detail?: string;
  /** Extra words that should match (ids, synonyms). */
  keywords?: string;
}

interface MultiComboboxProps {
  label: string;
  options: ComboOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Maximum number of choices (for example 1 to 3 patterns). */
  max?: number;
  /** At most this many matches are listed at once (keeps long lists fast). */
  limit?: number;
  emptyText?: string;
  className?: string;
  hideLabel?: boolean;
  /** Offers "Add “…”" for text that matches no option (for example a new mistake tag). */
  onCreate?: (text: string) => void;
  /** Words for the create option, default: Add “text”. */
  createLabel?: (text: string) => string;
  /** Options listed first when the search is empty (for example suggested tags). */
  suggested?: string[];
}

function rank(option: ComboOption, q: string): number {
  const label = option.label.toLowerCase();
  if (label === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.split(/[\s(/-]+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q)) return 3;
  if (option.keywords?.toLowerCase().includes(q) || option.detail?.toLowerCase().includes(q))
    return 4;
  return -1;
}

export function MultiCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = "Search",
  max,
  limit = 60,
  emptyText = "No matches. Try another word.",
  className,
  hideLabel,
  onCreate,
  createLabel = (text) => `Add “${text}”`,
  suggested,
}: MultiComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selected = new Set(value);
  const full = max !== undefined && value.length >= max;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      if (!suggested?.length) return options.slice(0, limit);
      const first = new Set(suggested);
      const top = suggested.map((v) => options.find((o) => o.value === v)).filter(Boolean);
      return [...(top as ComboOption[]), ...options.filter((o) => !first.has(o.value))].slice(
        0,
        limit,
      );
    }
    return options
      .map((o) => ({ o, r: rank(o, q) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r)
      .slice(0, limit)
      .map((x) => x.o);
  }, [options, query, limit, suggested]);

  const trimmed = query.trim();
  const canCreate =
    Boolean(onCreate) &&
    trimmed.length > 0 &&
    !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase()) &&
    !full;
  const count = matches.length + (canCreate ? 1 : 0);

  const create = () => {
    if (!canCreate || !onCreate) return;
    onCreate(trimmed);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  const toggle = (v: string) => {
    if (selected.has(v)) onChange(value.filter((x) => x !== v));
    else if (!full) onChange([...value, v]);
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(count - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const option = matches[active];
      if (option) toggle(option.value);
      else if (active === matches.length) create();
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const activeId = open && active < count ? `${id}-opt-${active}` : undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={`${id}-input`}
        className={cx("text-sm font-medium text-text", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div
        ref={setAnchor}
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-control border border-rule bg-surface px-2 py-1.5 transition-colors hover:border-rule-strong focus-within:border-accent max-md:min-h-11"
      >
        {value.map((v) => (
          <TagChip key={v} label={byValue.get(v)?.label ?? v} onRemove={() => toggle(v)} />
        ))}
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          value={query}
          placeholder={full ? `Up to ${max}` : value.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-base text-text outline-none placeholder:text-faint"
        />
        <ChevronDown size={16} aria-hidden="true" className="mr-1 shrink-0 text-muted" />
      </div>
      <FloatingPanel
        anchor={anchor}
        open={open}
        matchWidth
        placement="bottom-start"
        onDismiss={() => setOpen(false)}
        className="p-1"
      >
        <div
          role="listbox"
          id={listId}
          aria-label={label}
          aria-multiselectable="true"
          onMouseDown={(e) => e.preventDefault()}
        >
          {count === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">{emptyText}</p>
          ) : (
            matches.map((o, i) => {
              const isSelected = selected.has(o.value);
              const disabled = !isSelected && full;
              return (
                <div
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={disabled || undefined}
                  onClick={() => !disabled && toggle(o.value)}
                  onMouseMove={() => setActive(i)}
                  ref={(el) => {
                    if (i === active && el) el.scrollIntoView({ block: "nearest" });
                  }}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 max-md:py-2.5",
                    i === active && "bg-accent-soft",
                    disabled && "cursor-default opacity-50",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-4 shrink-0 place-items-center rounded-[4px] border",
                      isSelected ? "border-accent bg-accent text-on-accent" : "border-rule-strong",
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-text">{o.label}</span>
                    {o.detail && (
                      <span className="block truncate text-xs text-muted">{o.detail}</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          {canCreate && (
            <div
              id={`${id}-opt-${matches.length}`}
              role="option"
              aria-selected={false}
              onClick={create}
              onMouseMove={() => setActive(matches.length)}
              className={cx(
                "flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 text-base text-accent max-md:py-2.5",
                active === matches.length && "bg-accent-soft",
              )}
            >
              <Plus size={14} aria-hidden="true" className="shrink-0" />
              {createLabel(trimmed)}
            </div>
          )}
        </div>
      </FloatingPanel>
    </div>
  );
}
