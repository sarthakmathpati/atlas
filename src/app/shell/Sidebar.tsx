// Desktop sidebar (F1, 12.10.5, 12.10.8): icons and labels on the sidebar tone with no dividing
// line, the current page a raised pill, then the owner's focus subjects as links with their
// square marks; collapsible to icons only.
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { cx } from "@/components/ui/cx";
import { SubjectMark } from "@/components/ui/SubjectEmblem";
import { Tooltip } from "@/components/ui/Tooltip";
import { APP_NAME } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";
import type { Route } from "../router";
import { focusSubjectHref, useFocusSubjects } from "./focusSubjects";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav";

function FocusLinks({ route, collapsed }: { route: Route; collapsed: boolean }) {
  const subjects = useFocusSubjects();
  if (subjects.length === 0) return null;
  const current = route.name === "map" ? route.query.get("subject") : null;
  return (
    <div className={cx("mt-4", collapsed && "flex flex-col items-center")}>
      <p
        id="focus-subjects-heading"
        className={cx("px-3 pb-1 text-sm font-semibold text-muted", collapsed && "sr-only")}
      >
        Your focus
      </p>
      <ul aria-labelledby="focus-subjects-heading" className="flex flex-col gap-0.5">
        {subjects.map((s) => {
          const link = (
            <a
              href={focusSubjectHref(s.id)}
              aria-current={current === s.id ? "page" : undefined}
              aria-label={collapsed ? s.name : undefined}
              className={cx(
                "flex h-9 items-center gap-3 rounded-full text-base text-muted transition-colors hover:bg-surface-sunken hover:text-text",
                collapsed ? "w-10 justify-center" : "px-3",
                current === s.id && "text-text",
              )}
            >
              <SubjectMark subjectId={s.id} className="size-3" />
              {!collapsed && <span className="truncate">{s.shortName}</span>}
            </a>
          );
          return (
            <li key={s.id} title={collapsed ? undefined : s.name}>
              {collapsed ? (
                <Tooltip content={s.name} placement="right">
                  {link}
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  badge,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const link = (
    <a
      href={`#${item.path}`}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cx(
        "group relative flex h-10 items-center gap-3 rounded-full text-base transition-colors duration-100",
        collapsed ? "w-10 justify-center" : "px-3",
        active
          ? "bg-surface-raised font-semibold text-text shadow-pill"
          : "text-muted hover:bg-surface-sunken hover:text-text",
      )}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2 : 1.75}
        aria-hidden="true"
        className={cx("shrink-0", active ? "text-text" : "text-muted group-hover:text-text")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className={cx(
            "text-xs font-medium tabular-nums",
            collapsed
              ? "absolute -top-1 -right-1 min-w-4 rounded-full bg-surface-raised px-1 text-center text-[10px] leading-4 text-text shadow-pill"
              : "ml-auto text-muted",
          )}
        >
          {badge}
          <span className="sr-only"> due</span>
        </span>
      )}
    </a>
  );
  return collapsed ? (
    <Tooltip content={item.label} placement="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

interface SidebarProps {
  route: Route;
  collapsed: boolean;
  /** Counts shown as small badges (Review due count from Phase 3). */
  badges?: Partial<Record<string, number>>;
  /** ADHD mode's calm screen keeps it to icons: no expand button. */
  lockCollapsed?: boolean;
}

export function Sidebar({ route, collapsed, badges = {}, lockCollapsed }: SidebarProps) {
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const isActive = (item: NavItem) => item.routes.includes(route.name);
  const toggle = (
    <button
      type="button"
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className={cx(
        "flex h-10 items-center gap-3 rounded-full text-base text-muted transition-colors hover:bg-surface-sunken hover:text-text",
        collapsed ? "w-10 justify-center" : "px-3",
      )}
    >
      {collapsed ? (
        <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
      {!collapsed && <span>Collapse</span>}
    </button>
  );
  return (
    <nav
      aria-label="Main"
      data-peripheral
      className={cx(
        "hidden h-full shrink-0 flex-col bg-sidebar md:flex print:hidden",
        collapsed ? "w-16 items-center" : "w-60",
      )}
    >
      <a
        href="#/today"
        className={cx(
          "flex h-16 shrink-0 items-center gap-2.5 text-text",
          collapsed ? "justify-center" : "px-5",
        )}
        aria-label={`${APP_NAME}, go to Today`}
      >
        <BrandMark size={24} className="text-accent" />
        {!collapsed && <span className="font-display text-xl font-bold">{APP_NAME}</span>}
      </a>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <NavLink
                item={item}
                active={isActive(item)}
                collapsed={collapsed}
                badge={badges[item.id]}
              />
            </li>
          ))}
        </ul>
        <FocusLinks route={route} collapsed={collapsed} />
      </div>
      <div className="flex shrink-0 flex-col gap-1 px-3 pt-2 pb-3">
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM)} collapsed={collapsed} />
        {lockCollapsed ? null : collapsed ? (
          <Tooltip content="Expand sidebar" placement="right">
            {toggle}
          </Tooltip>
        ) : (
          toggle
        )}
      </div>
    </nav>
  );
}
