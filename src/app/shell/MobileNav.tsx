// Phone navigation (F1, under 768 px): a bottom tab bar with Today, Map, Problems, Review and
// More. "More" opens a sheet with every other destination.
import { Ellipsis, Keyboard } from "lucide-react";
import { BottomSheet } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { useUiStore } from "@/stores/uiStore";
import type { Route } from "../router";
import { ALL_NAV_ITEMS, NAV_ITEMS, type NavItem } from "./nav";

const TABS = NAV_ITEMS.filter((item) => item.tab);
const MORE = ALL_NAV_ITEMS.filter((item) => !item.tab);

export function BottomTabs({
  route,
  badges = {},
}: {
  route: Route;
  badges?: Partial<Record<string, number>>;
}) {
  const moreOpen = useUiStore((s) => s.moreOpen);
  const setMoreOpen = useUiStore((s) => s.setMoreOpen);
  const moreActive = MORE.some((item) => item.routes.includes(route.name));
  const tabClass = (active: boolean) =>
    cx(
      "relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
      active ? "font-medium text-accent" : "text-muted",
    );
  return (
    <nav aria-label="Main" className="flex shrink-0 border-t border-rule bg-surface md:hidden">
      {TABS.map((item) => {
        const active = item.routes.includes(route.name);
        const Icon = item.icon;
        const badge = badges[item.id];
        return (
          <a
            key={item.id}
            href={`#${item.path}`}
            aria-current={active ? "page" : undefined}
            className={tabClass(active)}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-medium text-on-accent">
                  {badge}
                  <span className="sr-only"> due</span>
                </span>
              )}
            </span>
            {item.label}
          </a>
        );
      })}
      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={tabClass(moreActive)}
      >
        <Ellipsis size={20} aria-hidden="true" />
        More
      </button>
    </nav>
  );
}

function SheetLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.path}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-12 items-center gap-3 rounded-control px-3 text-md",
        active ? "bg-accent-soft font-medium text-text" : "text-text hover:bg-surface-sunken",
      )}
    >
      <Icon
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
        className={active ? "text-accent" : "text-muted"}
      />
      {item.label}
    </a>
  );
}

export function MoreSheet({ route }: { route: Route }) {
  const open = useUiStore((s) => s.moreOpen);
  const setOpen = useUiStore((s) => s.setMoreOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const close = () => setOpen(false);
  return (
    <BottomSheet open={open} onClose={close} title="More">
      <ul className="grid gap-0.5 px-2 pb-3">
        {MORE.map((item) => (
          <li key={item.id}>
            <SheetLink item={item} active={item.routes.includes(route.name)} onNavigate={close} />
          </li>
        ))}
        <li className="mt-1 border-t border-rule pt-1">
          <button
            type="button"
            onClick={() => {
              close();
              setShortcutsOpen(true);
            }}
            className="flex h-12 w-full items-center gap-3 rounded-control px-3 text-md text-text hover:bg-surface-sunken"
          >
            <Keyboard size={20} strokeWidth={1.75} aria-hidden="true" className="text-muted" />
            Keyboard shortcuts
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
