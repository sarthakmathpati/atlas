// The content column for every page except the full-bleed map: left-aligned text in a centered
// column that stays readable from 360 px to 2560 px.
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx("mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10", className)}
    >
      {children}
    </div>
  );
}
