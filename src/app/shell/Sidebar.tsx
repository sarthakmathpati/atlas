// Desktop sidebar (F1): icons and labels, collapsible to icons only.
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { cx } from "@/components/ui/cx";
import { Tooltip } from "@/components/ui/Tooltip";
import { APP_NAME } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";
import type { Route } from "../router";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav";

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
        "group relative flex h-9 items-center gap-3 rounded-control text-base transition-colors duration-100",
        collapsed ? "w-10 justify-center" : "px-2.5",
        active
          ? "bg-accent-soft font-medium text-text"
          : "text-muted hover:bg-surface-sunken hover:text-text",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 -left-2 w-[3px] rounded-full bg-accent"
        />
      )}
      <Icon
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className={cx("shrink-0", active ? "text-accent" : "text-muted group-hover:text-text")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className={cx(
            "rounded-full bg-accent px-1.5 text-xs font-medium text-on-accent tabular-nums",
            collapsed
              ? "absolute -top-0.5 -right-0.5 min-w-4 text-center text-[10px] leading-4"
              : "ml-auto",
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
}

export function Sidebar({ route, collapsed, badges = {} }: SidebarProps) {
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const isActive = (item: NavItem) => item.routes.includes(route.name);
  const toggle = (
    <button
      type="button"
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className={cx(
        "flex h-9 items-center gap-3 rounded-control text-base text-muted transition-colors hover:bg-surface-sunken hover:text-text",
        collapsed ? "w-10 justify-center" : "px-2.5",
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
      className={cx(
        "hidden h-full shrink-0 flex-col border-r border-rule bg-surface md:flex",
        collapsed ? "w-16 items-center" : "w-58",
      )}
    >
      <a
        href="#/today"
        className={cx(
          "flex h-14 shrink-0 items-center gap-2.5 text-text",
          collapsed ? "justify-center" : "px-4",
        )}
        aria-label={`${APP_NAME}, go to Today`}
      >
        <BrandMark size={24} className="text-accent" />
        {!collapsed && <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>}
      </a>
      <ul
        className={cx(
          "flex flex-1 flex-col gap-0.5 overflow-y-auto py-2",
          collapsed ? "px-3" : "px-3",
        )}
      >
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
      <div
        className={cx(
          "flex shrink-0 flex-col gap-0.5 border-t border-rule py-2",
          collapsed ? "px-3" : "px-3",
        )}
      >
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM)} collapsed={collapsed} />
        {collapsed ? (
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
