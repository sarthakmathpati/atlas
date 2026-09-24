// Pages for features that arrive in later phases. Each says plainly what the page will do and
// when, and links to what already works, so no route is ever a dead end.
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/app/shell/PageHeader";
import { PageFrame } from "@/app/shell/PageFrame";

export interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Build phase that delivers it (BUILD_SPEC.md section 13). */
  phase: number;
  phaseName: string;
  features: string[];
  links?: { label: string; href: string }[];
  children?: ReactNode;
}

export function ComingSoon({
  title,
  description,
  icon: Icon,
  phase,
  phaseName,
  features,
  links = [],
  children,
}: ComingSoonProps) {
  return (
    <PageFrame>
      <PageHeader title={title} description={description} />
      <section
        aria-labelledby="coming-heading"
        className="grid gap-6 rounded-panel border border-rule bg-surface p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 id="coming-heading" className="text-md font-semibold text-text">
                Arrives in phase {phase}
              </h2>
              <p className="text-sm text-muted">{phaseName}</p>
            </div>
          </div>
          <p className="mt-4 text-base text-muted">What you'll be able to do here:</p>
          <ul className="mt-2 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex gap-2.5 text-base text-text">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-rule-strong"
                />
                {f}
              </li>
            ))}
          </ul>
          {children}
        </div>
        {links.length > 0 && (
          <div className="lg:border-l lg:border-rule lg:pl-6">
            <p className="text-sm font-medium text-muted">Ready now</p>
            <ul className="mt-2 space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="group -mx-2 flex min-h-10 items-center justify-between gap-2 rounded-control px-2 text-base text-text hover:bg-surface-sunken"
                  >
                    {l.label}
                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-muted group-hover:text-accent"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageFrame>
  );
}
