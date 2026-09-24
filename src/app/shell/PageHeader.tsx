// Page heading (every route): the h1, an optional description and actions. Takes focus after an
// in-app navigation so screen readers announce the new page, and sets the document title.
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { consumeNavigationFocus } from "../router";
import { usePageTitle } from "./usePageTitle";

interface PageHeaderProps {
  title: ReactNode;
  /** Plain-text title for the browser tab when `title` isn't a string. */
  documentTitle?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small line above the title (a breadcrumb). */
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  documentTitle,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  usePageTitle(documentTitle ?? (typeof title === "string" ? title : ""));

  useEffect(() => {
    if (consumeNavigationFocus()) ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <header
      className={cx(
        "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-sm text-muted">{eyebrow}</div>}
        <h1 ref={ref} tabIndex={-1} className="text-2xl text-text outline-none max-sm:text-xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-[68ch] text-md text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
