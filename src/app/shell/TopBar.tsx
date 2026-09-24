// Top bar (F1): search (Ctrl/Cmd + K), today's minutes and streak, the focus timer, Ask Claude
// and the theme menu. On phones it also carries the app name, and search becomes an icon.
import { Flame, Monitor, Moon, Search, Sparkles, Sun, Timer } from "lucide-react";
import { useMemo } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Kbd } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { Menu } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { computeStreak, dayLookup } from "@/lib/activity/streak";
import { APP_NAME } from "@/lib/constants";
import { localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { readStoredTheme, setTheme, type ThemeChoice } from "../theme";
import { FocusTimerButton } from "./FocusTimer";

function ActivityChip() {
  const loaded = useActivityStore((s) => s.loaded);
  const months = useActivityStore((s) => s.months);
  const freeze = useProfileStore((s) => s.profile?.prefs.streakFreeze ?? true);
  const today = localDate();
  const { minutes, streak } = useMemo(() => {
    const lookup = dayLookup(Object.values(months));
    return {
      minutes: Math.round(lookup(today)?.minutes ?? 0),
      streak: computeStreak(lookup, today, freeze).current,
    };
  }, [months, today, freeze]);
  if (!loaded) return null;
  const label = `${minutes} ${minutes === 1 ? "minute" : "minutes"} today, ${streak}-day streak`;
  return (
    <Tooltip content={label}>
      <a
        href="#/dashboard"
        aria-label={label}
        className="hidden h-8 items-center gap-2.5 rounded-control px-2 text-sm whitespace-nowrap text-muted tabular-nums transition-colors hover:bg-surface-sunken hover:text-text sm:inline-flex"
      >
        <span className="inline-flex items-center gap-1">
          <Timer size={14} aria-hidden="true" />
          {minutes} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame size={14} aria-hidden="true" className={streak > 0 ? "text-warning" : undefined} />
          {streak}
        </span>
      </a>
    </Tooltip>
  );
}

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

function ThemeMenu() {
  const profileTheme = useProfileStore((s) => s.profile?.theme);
  const current: ThemeChoice = profileTheme ?? readStoredTheme();
  const options: { value: ThemeChoice; label: string }[] = [
    { value: "system", label: "Match system" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  return (
    <Menu
      label="Theme"
      items={options.map((o) => ({
        kind: "radio" as const,
        id: o.value,
        label: o.label,
        icon: THEME_ICON[o.value],
        checked: current === o.value,
        onSelect: () => setTheme(o.value),
      }))}
      renderTrigger={(props) => (
        <Tooltip content="Theme">
          <button
            {...props}
            ref={props.ref}
            type="button"
            aria-label="Theme"
            className="inline-grid size-9 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-surface-sunken hover:text-text max-md:size-11"
          >
            {(() => {
              const Icon = THEME_ICON[current];
              return <Icon size={18} aria-hidden="true" />;
            })()}
          </button>
        </Tooltip>
      )}
    />
  );
}

export function TopBar() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-rule bg-canvas px-2 sm:gap-2 sm:px-4">
      <a
        href="#/today"
        className="flex h-11 items-center gap-2 rounded-control px-2 text-text md:hidden"
        aria-label={`${APP_NAME}, go to Today`}
      >
        <BrandMark size={22} className="text-accent" />
        <span className="text-md font-semibold tracking-tight">{APP_NAME}</span>
      </a>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className={cx(
          "hidden h-9 w-full max-w-md min-w-0 items-center gap-2 rounded-control border border-rule bg-surface px-3 text-left text-base text-faint transition-colors hover:border-rule-strong md:flex",
        )}
      >
        <Search size={16} aria-hidden="true" className="shrink-0" />
        <span className="flex-1 truncate">Search or jump to…</span>
        <span className="flex shrink-0 gap-1" aria-hidden="true">
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>K</Kbd>
        </span>
        <span className="sr-only">(shortcut {MOD_KEY} K)</span>
      </button>
      <div className="flex-1" />
      <ActivityChip />
      <FocusTimerButton />
      <Button
        variant="ghost"
        size="sm"
        icon={Sparkles}
        onClick={() => setAskOpen(true)}
        className="text-muted hover:text-text max-md:hidden"
        aria-keyshortcuts="a"
      >
        Ask Claude
      </Button>
      <IconButton
        icon={Sparkles}
        label="Ask Claude"
        onClick={() => setAskOpen(true)}
        className="md:hidden"
        noTooltip
      />
      <IconButton
        icon={Search}
        label="Search"
        onClick={() => setPaletteOpen(true)}
        className="md:hidden"
        noTooltip
      />
      <ThemeMenu />
    </header>
  );
}
