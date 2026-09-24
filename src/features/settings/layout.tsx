// Building blocks for the Settings page: a section with a heading, and dense rows with the label
// on the left and the control on the right (stacked on phones).
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

interface SectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function SettingsSection({ id, title, description, children }: SectionProps) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="scroll-mt-6">
      <h2 id={`settings-${id}-title`} className="text-lg font-semibold text-text">
        {title}
      </h2>
      {description && <p className="mt-1 text-base text-muted">{description}</p>}
      <div className="mt-3 divide-y divide-rule rounded-panel border border-rule bg-surface">
        {children}
      </div>
    </section>
  );
}

interface RowProps {
  label: ReactNode;
  description?: ReactNode;
  /** Id of the control, so the label is clickable and announced. */
  htmlFor?: string;
  children: ReactNode;
  /** Put the control under the label even on wide screens (long inputs, lists). */
  stacked?: boolean;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
  stacked,
  className,
}: RowProps) {
  const LabelTag = htmlFor ? "label" : "div";
  return (
    <div
      className={cx(
        "flex flex-col gap-3 px-4 py-4 sm:px-5",
        !stacked && "md:flex-row md:items-center md:justify-between md:gap-8",
        className,
      )}
    >
      <div className="min-w-0 md:max-w-[46ch]">
        <LabelTag
          {...(htmlFor ? { htmlFor } : {})}
          className="block text-base font-medium text-text"
        >
          {label}
        </LabelTag>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <div className={cx("min-w-0", !stacked && "md:shrink-0")}>{children}</div>
    </div>
  );
}
