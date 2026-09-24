// Form controls (section 12.7): Field (label, hint, error), Input, Textarea, Select, Switch,
// Slider. Native elements underneath, so they work with the keyboard, screen readers and phones.
import { ChevronDown } from "lucide-react";
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

const CONTROL =
  "w-full rounded-control border border-rule bg-surface text-base text-text placeholder:text-faint transition-colors hover:border-rule-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60 aria-invalid:border-danger";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  className?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
}

/** Wraps one control with a visible label, an optional hint and an error message. */
export function Field({ label, hint, error, children, className, hideLabel }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cx("text-sm font-medium text-text", hideLabel && "sr-only")}>
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input ref={ref} className={cx(CONTROL, "h-10 px-3 max-md:h-11", className)} {...rest} />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx(CONTROL, "min-h-20 resize-y px-3 py-2 leading-relaxed", className)}
      {...rest}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
}

/** A styled native select: the phone's own picker on mobile, full keyboard support everywhere. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, ...rest },
  ref,
) {
  return (
    <div className={cx("relative", className)}>
      <select
        ref={ref}
        className={cx(CONTROL, "h-10 appearance-none pr-9 pl-3 max-md:h-11")}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
});

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label next to the switch. */
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** An on/off switch with its label; the whole row is clickable. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-base text-text">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150 disabled:opacity-55",
          // A larger invisible hit area on phones (44 px targets).
          "before:absolute before:-inset-2.5 before:content-['']",
          checked ? "border-accent bg-accent" : "border-rule-strong bg-surface-sunken",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "inline-block size-4.5 rounded-full shadow-sm transition-transform duration-150",
            checked ? "translate-x-[19px] bg-on-accent" : "translate-x-[2px] bg-surface",
          )}
        />
      </button>
    </div>
  );
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: ReactNode;
  /** Formats the value shown next to the label. */
  format?: (value: number) => string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  format,
  className,
}: SliderProps) {
  const id = useId();
  const shown = format ? format(value) : String(value);
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <output htmlFor={id} className="text-sm text-muted tabular-nums">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="atlas-range h-6 w-full cursor-pointer max-md:h-11"
      />
    </div>
  );
}
