// "Show more" (F32, calm screen): secondary cards fold behind one plain button.
import { ChevronDown } from "lucide-react";
import { cx } from "@/components/ui/cx";

export function ShowMore({
  open,
  onToggle,
  more,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  /** What's folded, after "Show more: ". */
  more: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cx(
        "flex items-center gap-2 rounded-control px-1 py-2 text-left text-base text-muted hover:text-text",
        className,
      )}
    >
      <ChevronDown
        size={16}
        aria-hidden="true"
        className={cx("shrink-0 transition-transform", open && "rotate-180")}
      />
      {open ? "Show less" : `Show more: ${more}`}
    </button>
  );
}
