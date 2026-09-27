// Cards (12.10.5): surfaces set apart by tone, not hairlines. A card is the surface on the
// canvas with 16 px corners; the focal card (one per screen, such as Today's "Up next") is raised,
// 18 px, and the only in-flow element with a shadow.
import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";

interface CardProps {
  children: ReactNode;
  /** A card title in the display face. */
  title?: ReactNode;
  /** Small text at the right of the title (a count, a date). */
  aside?: ReactNode;
  /** The one focal card of a screen: raised, rounder, with a shadow. */
  focal?: boolean;
  as?: ElementType;
  className?: string;
}

export function Card({ children, title, aside, focal, as: Tag = "section", className }: CardProps) {
  return (
    <Tag
      className={cx(
        focal
          ? "rounded-focal bg-surface-raised p-5 shadow-focal sm:p-6"
          : "rounded-panel bg-surface p-4 sm:p-5",
        className,
      )}
    >
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <h2 className="font-display text-lg font-semibold text-text">{title}</h2>}
          {aside && <span className="text-sm text-muted">{aside}</span>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** A small label such as "Up next": sentence case, 13 px, semibold, in the accent (12.10.4). */
export function CardLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-sm font-semibold text-accent", className)}>{children}</p>;
}
