// Text fields that save themselves (insight, summary, notes, tags) a moment after typing stops,
// and at once when the field loses focus or the page closes.
import { Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { TagChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Input, Textarea } from "@/components/ui/Field";
import { useLatest } from "@/components/ui/hooks";

const SAVE_AFTER_MS = 700;

function useAutosave(value: string, onSave: (v: string) => void) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const [dirty, setDirty] = useState(false);
  /** Unsaved typing (read only in handlers; `dirty` mirrors it for rendering). */
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useLatest({ text, onSave });

  // Take in changes made elsewhere (another tab, an import) unless the owner is typing.
  if (value !== synced && !dirty) {
    setSynced(value);
    setText(value);
  }

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!pending.current) return;
    pending.current = false;
    setDirty(false);
    latest.current.onSave(latest.current.text);
  };
  const flushLatest = useLatest(flush);

  useEffect(() => {
    const save = () => flushLatest.current();
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [flushLatest]);

  const change = (v: string) => {
    setText(v);
    setSynced(v);
    setDirty(true);
    pending.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushLatest.current(), SAVE_AFTER_MS);
  };
  return { text, change, flush };
}

interface AutoFieldProps {
  value: string;
  onSave: (value: string) => void;
  label: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  hideLabel?: boolean;
}

export function AutoField({
  value,
  onSave,
  label,
  hint,
  placeholder,
  multiline,
  rows = 3,
  className,
  inputClassName,
  hideLabel,
}: AutoFieldProps) {
  const id = useId();
  const { text, change, flush } = useAutosave(value, onSave);
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cx("text-sm font-medium text-text", hideLabel && "sr-only")}>
        {label}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          rows={rows}
          value={text}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={flush}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClassName}
        />
      ) : (
        <Input
          id={id}
          value={text}
          placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={flush}
          onKeyDown={(e) => {
            if (e.key === "Enter") flush();
          }}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClassName}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** The owner's own tags on a problem (company names, "revise", …). */
export function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    setText("");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && text === "" && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        Your tags
      </label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-control border border-rule bg-surface px-2 py-1.5 focus-within:border-accent max-md:min-h-11">
        {tags.map((t) => (
          <TagChip key={t} label={t} onRemove={() => onChange(tags.filter((x) => x !== t))} />
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          placeholder={tags.length ? "" : "For example google, revise"}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-base text-text outline-none placeholder:text-faint"
        />
        {text.trim() && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={add}
            aria-label={`Add tag ${text.trim()}`}
            className="grid size-7 place-items-center rounded-control text-muted hover:bg-surface-sunken hover:text-text"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
