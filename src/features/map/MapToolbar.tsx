// The map's toolbar (F2): filters (subjects, status, importance, ready to learn, due for review,
// track, advanced and hidden concepts), focus mode, the key to the symbols, Map or List view, and
// the map menu (add a concept, reset layout).
import {
  CalendarClock,
  Info,
  List,
  Map as MapIcon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sprout,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { BottomSheet } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Field";
import { IMPORTANCE_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/components/ui/labels";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { Menu, Popover, type TriggerProps } from "@/components/ui/Popover";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { subjects } from "@/data/syllabus";
import { activeFilterCount, type MapFilters } from "@/lib/map/filters";
import type { Importance, Status, Track } from "@/lib/types";

const SUBJECT_OPTIONS = subjects.map((s) => ({
  value: s.id,
  label: s.name,
  keywords: s.shortName,
}));

function Toggle({
  on,
  onClick,
  children,
  className,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-sm font-medium transition-colors max-md:h-11",
        on
          ? "border-accent bg-accent-soft text-text"
          : "border-rule bg-surface text-muted hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export interface FilterPanelProps {
  filters: MapFilters;
  set: (changes: Partial<MapFilters>) => void;
  profileTrack: Track;
  profileAdvanced: boolean;
  hiddenCount: number;
}

export function MapFilterPanel({
  filters,
  set,
  profileTrack,
  profileAdvanced,
  hiddenCount,
}: FilterPanelProps) {
  const track = filters.track ?? profileTrack;
  const advanced = filters.advanced ? filters.advanced === "show" : profileAdvanced;
  return (
    <div className="flex w-full flex-col gap-4 md:w-[360px]">
      <MultiCombobox
        label="Subjects"
        options={SUBJECT_OPTIONS}
        value={filters.subjects}
        onChange={(subjects) => set({ subjects })}
        placeholder="All subjects"
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-text">Status</legend>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_ORDER.map((s: Status) => (
            <Toggle
              key={s}
              on={filters.statuses.includes(s)}
              onClick={() => set({ statuses: toggleIn(filters.statuses, s) })}
            >
              <StatusGlyph status={s} size={13} />
              {STATUS_LABEL[s]}
            </Toggle>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-text">Importance</legend>
        <div className="flex gap-2">
          {(["must", "important", "advanced"] as Importance[]).map((i) => (
            <Toggle
              key={i}
              className="flex-1 justify-center"
              on={filters.importance.includes(i)}
              onClick={() => set({ importance: toggleIn(filters.importance, i) })}
            >
              {IMPORTANCE_LABEL[i]}
            </Toggle>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Track</span>
        <SegmentedControl<Track>
          label="Track"
          size="sm"
          full
          value={track}
          onChange={(t) => set({ track: t === profileTrack ? null : t })}
          options={[
            { value: "sde", label: "SDE" },
            { value: "quant", label: "Quant" },
            { value: "both", label: "Both" },
          ]}
        />
        {filters.track === null && <p className="text-sm text-muted">Your track from Settings.</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-rule pt-4">
        <Switch
          label="Ready to learn"
          description="Not started, with what it needs already learned."
          checked={filters.ready}
          onChange={(ready) => set({ ready })}
        />
        <Switch label="Due for review" checked={filters.due} onChange={(due) => set({ due })} />
        <Switch
          label="Show advanced concepts"
          description={
            filters.advanced ? undefined : "Follows your setting in Settings → Appearance."
          }
          checked={advanced}
          onChange={(v) => set({ advanced: v === profileAdvanced ? null : v ? "show" : "hide" })}
        />
        <Switch
          label={`Show hidden concepts${hiddenCount ? ` (${hiddenCount})` : ""}`}
          checked={filters.showHidden}
          onChange={(showHidden) => set({ showHidden })}
        />
      </div>
    </div>
  );
}

/** The symbols on the map, explained (color and shape, marks and lines). */
export function MapKey() {
  const row = (glyph: ReactNode, text: string) => (
    <li className="flex items-center gap-2.5">
      <span className="grid w-5 shrink-0 place-items-center">{glyph}</span>
      <span>{text}</span>
    </li>
  );
  return (
    <div className="w-[min(300px,calc(100vw-40px))] space-y-3 text-sm text-text">
      <ul className="space-y-1.5">
        {STATUS_ORDER.map((s) => row(<StatusGlyph status={s} size={16} />, STATUS_LABEL[s]))}
      </ul>
      <ul className="space-y-1.5 border-t border-rule pt-3">
        {row(
          <span className="grid size-4 place-items-center rounded-full border border-accent text-[9px] font-semibold text-accent">
            P
          </span>,
          "Pattern: problems attach to it",
        )}
        {row(
          <CalendarClock size={14} className="text-accent" aria-hidden="true" />,
          "Due for review",
        )}
        {row(
          <span className="size-2 rounded-full bg-muted" />,
          "Has linked problems (bigger: 3 or more)",
        )}
        {row(<span className="size-2 rotate-45 bg-accent" />, "Your own concept")}
        {row(
          <svg width="20" height="8" aria-hidden="true">
            <path d="M1 4H15" stroke="var(--rule-strong)" />
            <path d="M19 4L14 1.5V6.5Z" fill="var(--rule-strong)" />
          </svg>,
          "Learn this first (points to what it unlocks)",
        )}
        {row(
          <svg width="20" height="8" aria-hidden="true">
            <path d="M1 4H19" stroke="var(--text-faint)" strokeDasharray="4 3" />
          </svg>,
          "Connected idea, often in another subject",
        )}
      </ul>
      <p className="border-t border-rule pt-3 text-muted">
        Zoom out for subjects, in for topics, then concepts. Right-click or long-press a bubble for
        more.
      </p>
    </div>
  );
}

interface MapToolbarProps {
  title: ReactNode;
  filters: MapFilters;
  set: (changes: Partial<MapFilters>) => void;
  clear: () => void;
  profileTrack: Track;
  profileAdvanced: boolean;
  hiddenCount: number;
  view: "map" | "list";
  onView: (view: "map" | "list") => void;
  hops: 0 | 1 | 2;
  onHops: (hops: 0 | 1 | 2) => void;
  canFocus: boolean;
  mobile: boolean;
  sheetOpen: boolean;
  onSheet: (open: boolean) => void;
  onAddConcept: () => void;
  onResetLayout: () => void;
  canReset: boolean;
  matching: number;
}

export function MapToolbar(props: MapToolbarProps) {
  const { filters, set, mobile, view } = props;
  const count = activeFilterCount(filters);
  const panel = (
    <MapFilterPanel
      filters={filters}
      set={set}
      profileTrack={props.profileTrack}
      profileAdvanced={props.profileAdvanced}
      hiddenCount={props.hiddenCount}
    />
  );
  const filterButton = (triggerProps: Partial<TriggerProps> & { onClick: () => void }) => (
    <Button
      size="sm"
      icon={SlidersHorizontal}
      {...triggerProps}
      className={cx(count > 0 && "border-accent")}
    >
      Filters{count > 0 ? ` (${count})` : ""}
    </Button>
  );
  const focusControl = (
    <SegmentedControl<"0" | "1" | "2">
      label="Focus mode"
      size="sm"
      value={String(props.hops) as "0" | "1" | "2"}
      onChange={(v) => props.onHops(Number(v) as 0 | 1 | 2)}
      options={[
        { value: "0", label: "All" },
        { value: "1", label: "1 step" },
        { value: "2", label: "2 steps" },
      ]}
    />
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-rule bg-surface px-3 py-2 sm:px-4">
      {props.title}
      {view === "map" && (
        <>
          {mobile ? (
            <>
              {filterButton({ onClick: () => props.onSheet(true) })}
              <BottomSheet
                open={props.sheetOpen}
                onClose={() => props.onSheet(false)}
                title="Filters"
                footer={
                  <>
                    {count > 0 && (
                      <Button variant="ghost" onClick={props.clear}>
                        Clear all
                      </Button>
                    )}
                    <Button variant="primary" onClick={() => props.onSheet(false)}>
                      Show {props.matching} {props.matching === 1 ? "concept" : "concepts"}
                    </Button>
                  </>
                }
              >
                <div className="space-y-4 px-4 pb-4">
                  {props.canFocus && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-text">Focus mode</span>
                      {focusControl}
                    </div>
                  )}
                  {panel}
                </div>
              </BottomSheet>
            </>
          ) : (
            <>
              <Popover
                label="Map filters"
                placement="bottom-start"
                renderTrigger={(p) => filterButton(p)}
              >
                {() => panel}
              </Popover>
              <Toggle on={filters.ready} onClick={() => set({ ready: !filters.ready })}>
                <Sprout size={15} aria-hidden="true" />
                Ready to learn
              </Toggle>
              <Toggle on={filters.due} onClick={() => set({ due: !filters.due })}>
                <CalendarClock size={15} aria-hidden="true" />
                Due for review
              </Toggle>
              {count > 0 && (
                <Button size="sm" variant="ghost" icon={X} onClick={props.clear}>
                  Clear
                </Button>
              )}
            </>
          )}
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {view === "map" && !mobile && props.canFocus && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted max-lg:sr-only">Focus</span>
            {focusControl}
          </div>
        )}
        {view === "map" && (
          <Popover
            label="Map key"
            placement="bottom-end"
            renderTrigger={(p) => <IconButton icon={Info} label="Map key" size="sm" {...p} />}
          >
            {() => <MapKey />}
          </Popover>
        )}
        <SegmentedControl<"map" | "list">
          label="View"
          size="sm"
          compactOnMobile
          value={view}
          onChange={props.onView}
          options={[
            { value: "map", label: "Map", icon: MapIcon, ariaLabel: "Map" },
            { value: "list", label: "List", icon: List, ariaLabel: "List" },
          ]}
        />
        <Menu
          label="Map menu"
          items={[
            { id: "add", label: "Add a concept", icon: Plus, onSelect: props.onAddConcept },
            {
              id: "reset",
              label: "Reset layout",
              icon: RotateCcw,
              disabled: !props.canReset,
              hint: props.canReset ? undefined : "Nothing moved",
              onSelect: props.onResetLayout,
            },
          ]}
          renderTrigger={(p) => (
            <IconButton icon={MoreHorizontal} label="Map menu" size="sm" {...p} />
          )}
        />
      </div>
    </div>
  );
}
