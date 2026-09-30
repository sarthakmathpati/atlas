// Top bar (F1, 12.10.8): search (Ctrl/Cmd + K), today's minutes and streak, the focus timer, Ask
// Claude and the theme menu, as pills on the canvas (no dividing line). On phones it also carries
// the app name, and search becomes an icon. While a focus block runs (F31) the block's line shows
// here (a second row on phones), held notes are counted, and the extras are marked peripheral so
// the focus lens dims them.
import { Flame, Search, Settings2, Sparkles, Timer } from "lucide-react";
import { useMemo } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Kbd } from "@/components/ui/Misc";
import { useShownTheme } from "@/components/ui/hooks";
import { MOD_KEY } from "@/components/ui/platform";
import { Menu } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { computeStreak, dayLookup } from "@/lib/activity/streak";
import { APP_NAME } from "@/lib/constants";
import { THEME_LABEL } from "@/lib/theme";
import { localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { navigate } from "../router";
import { readStoredTheme, setTheme, type ThemeChoice } from "../theme";
import { THEME_ICON, THEME_OPTIONS } from "../themeOptions";
import { FocusLine, HeldNotes } from "@/features/focus/TopBarFocus";
import { blockActive, useFocusTimerStore } from "@/stores/focusTimerStore";
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
        data-peripheral
        className="hidden h-9 items-center gap-2.5 rounded-full bg-surface px-3 text-sm whitespace-nowrap text-muted tabular-nums transition-colors hover:bg-surface-raised hover:text-text sm:inline-flex"
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

function ThemeMenu() {
  const profileTheme = useProfileStore((s) => s.profile?.theme);
  const current: ThemeChoice = profileTheme ?? readStoredTheme();
  const shown = useShownTheme();
  const Icon = THEME_ICON[current];
  return (
    <Menu
      label="Theme"
      items={[
        ...THEME_OPTIONS.map((o) => ({
          kind: "radio" as const,
          id: o.value,
          label: o.label,
          icon: o.icon,
          checked: current === o.value,
          // For the choices that pick a theme for you, say which one is showing now.
          hint:
            current === o.value && (o.value === "system" || o.value === "schedule")
              ? `${THEME_LABEL[shown]} now`
              : undefined,
          onSelect: () => setTheme(o.value),
        })),
        { kind: "separator" as const, id: "sep" },
        {
          id: "times",
          label: "Theme settings",
          icon: Settings2,
          onSelect: () => navigate("/settings?section=appearance"),
        },
      ]}
      renderTrigger={(props) => (
        <Tooltip content={`Theme: ${THEME_LABEL[shown]}`}>
          <button
            {...props}
            ref={props.ref}
            type="button"
            aria-label={`Theme, ${THEME_LABEL[shown]} showing`}
            data-peripheral
            className="inline-grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text max-md:size-11"
          >
            <Icon size={18} aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    />
  );
}

export function TopBar() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  // During a focus block the search pill narrows to make room for the block's line.
  const focusing = useFocusTimerStore((s) => blockActive(s) && s.intention !== "");
  return (
    <header className="shrink-0 bg-canvas print:hidden">
      <div className="flex h-16 items-center gap-1 px-2 sm:gap-2 sm:px-4 lg:px-6">
        <a
          href="#/today"
          className="flex h-11 items-center gap-2 rounded-full px-2 text-text md:hidden"
          aria-label={`${APP_NAME}, go to Today`}
        >
          <BrandMark size={22} className="text-accent" />
          <span className="font-display text-lg font-bold">{APP_NAME}</span>
        </a>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          data-peripheral
          aria-label={focusing ? `Search or jump to (shortcut ${MOD_KEY} K)` : undefined}
          className={cx(
            "hidden h-10 w-full max-w-md min-w-0 items-center gap-2 rounded-full bg-surface px-4 text-left text-base text-faint transition-colors hover:bg-surface-raised md:flex",
            // During a focus block, search shrinks to its icon so the block's line has room.
            focusing && "w-10 shrink-0 justify-center px-0",
          )}
        >
          <Search size={16} aria-hidden="true" className="shrink-0" />
          {!focusing && (
            <>
              <span className="flex-1 truncate">Search or jump to…</span>
              <span className="flex shrink-0 gap-1" aria-hidden="true">
                <Kbd>{MOD_KEY}</Kbd>
                <Kbd>K</Kbd>
              </span>
              <span className="sr-only">(shortcut {MOD_KEY} K)</span>
            </>
          )}
        </button>
        <div className="flex min-w-0 flex-1 px-3 max-md:hidden">
          <FocusLine />
        </div>
        <div className="flex-1 md:hidden" />
        {!focusing && <ActivityChip />}
        <HeldNotes />
        <FocusTimerButton />
        <Button
          variant="ghost"
          size="sm"
          icon={Sparkles}
          onClick={() => setAskOpen(true)}
          className="h-9 bg-accent-soft text-accent hover:bg-accent/20 max-md:hidden"
          aria-keyshortcuts="a"
          data-peripheral
        >
          Ask Claude
        </Button>
        <IconButton
          icon={Sparkles}
          label="Ask Claude"
          onClick={() => setAskOpen(true)}
          className="md:hidden"
          noTooltip
          data-peripheral
        />
        <IconButton
          icon={Search}
          label="Search"
          onClick={() => setPaletteOpen(true)}
          className="md:hidden"
          noTooltip
          data-peripheral
        />
        <ThemeMenu />
      </div>
      <FocusLine className="-mt-2 px-4 pb-2 text-sm md:hidden" />
    </header>
  );
}
