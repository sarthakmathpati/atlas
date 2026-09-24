// The map (F2): the zoomable canvas with its toolbar, the concept panel (a side panel from 768 px,
// a bottom sheet on phones), the path to a concept (F25), right-click and long-press menus, and
// the list view (F30's accessible alternative). Links such as #/map?focus=<concept>,
// ?topic=<id>, ?subject=<id> and ?path=<concept> fly the map there.
import { ReactFlowProvider } from "@xyflow/react";
import { Maximize2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { conceptHref, navigate, parseHash, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { usePageTitle } from "@/app/shell/usePageTitle";
import { consumeNavigationFocus } from "@/app/router";
import { IconButton } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Dialog";
import { useIsMobile } from "@/components/ui/hooks";
import { ContextMenu, type MenuItem } from "@/components/ui/Popover";
import { conceptsByTopic, subjects, topicById } from "@/data/syllabus";
import {
  EMPTY_MAP_FILTERS,
  parseMapFilters,
  writeMapFilters,
  type MapFilters,
} from "@/lib/map/filters";
import { pathTo } from "@/lib/path/path";
import { inScope } from "@/lib/concepts/scope";
import { Layers, Plus, Search, ZoomIn } from "lucide-react";
import { openAddConcept, openFlashcards } from "@/stores/conceptDialogStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { findConcept, useConcept, useCustomConceptStore } from "@/stores/customConceptStore";
import { resetLayout, restoreOverrides, useMapStore } from "@/stores/mapStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { conceptMenuItems } from "../concept/conceptActions";
import { ConceptSidePanel } from "../concept/ConceptPanel";
import { markSetupStep } from "../today/setupSteps";
import type { MenuTarget } from "./canvas/actions";
import { MapCanvas, type FlyRequest } from "./canvas/MapCanvas";
import { useMapModel } from "./canvas/useMapModel";
import { MapListView, type ListTarget } from "./MapListView";
import { MapToolbar } from "./MapToolbar";
import { PathPanel } from "./PathPanel";

const SUBJECT_IDS = subjects.map((s) => s.id);
const PANEL_KEY = "atlas.mapPanel";
const MIN_PANEL = 340;

function readPanelWidth(): number {
  try {
    const v = Number(localStorage.getItem(PANEL_KEY));
    return Number.isFinite(v) && v >= MIN_PANEL ? v : 440;
  } catch {
    return 440;
  }
}

/** What a link asks the map to show. */
function flyFromQuery(
  query: URLSearchParams,
  key: string,
  pathIds: string[] | null,
): FlyRequest | null {
  const focus = query.get("focus");
  if (focus && findConcept(focus)) return { kind: "concept", id: focus, key, pulse: true };
  if (pathIds) return { kind: "ids", ids: pathIds, key };
  const topic = query.get("topic");
  if (topic && topicById.has(topic)) return { kind: "topic", id: topic, key };
  const subject = query.get("subject");
  if (subject && SUBJECT_IDS.includes(subject)) return { kind: "subject", id: subject, key };
  return null;
}

/** The concepts on the path a link asks for (#/map?path=<concept>), in the owner's scope. */
function pathIdsFor(query: URLSearchParams): string[] | null {
  const target = query.get("path");
  if (!target || !findConcept(target)) return null;
  const profile = useProfileStore.getState().profile;
  const states = useConceptStateStore.getState().states;
  const scope = {
    track: parseMapFilters(query, SUBJECT_IDS).track ?? profile?.track ?? "both",
    profile,
    isHidden: (id: string) => Boolean(states[id]?.hidden),
  };
  const path = pathTo(target, {
    getConcept: findConcept,
    statusOf: (id) => states[id]?.status ?? "not_started",
    inScope: (c) => inScope(c, scope),
  });
  return path ? path.steps.map((s) => s.concept.id) : null;
}

function listTarget(query: URLSearchParams, key: string): ListTarget | null {
  const focus = query.get("focus");
  if (focus && findConcept(focus)) return { kind: "concept", id: focus, key };
  const topic = query.get("topic");
  if (topic && topicById.has(topic)) return { kind: "topic", id: topic, key };
  const subject = query.get("subject");
  if (subject && SUBJECT_IDS.includes(subject)) return { kind: "subject", id: subject, key };
  return null;
}

function Title() {
  const ref = useRef<HTMLHeadingElement>(null);
  usePageTitle("Map");
  useEffect(() => {
    if (consumeNavigationFocus()) ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className="mr-1 text-lg font-semibold text-text outline-none">
      Map
    </h1>
  );
}

function MapScreen() {
  const route = useRoute();
  const queryKey = route.query.toString();
  const query = useMemo(() => new URLSearchParams(queryKey), [queryKey]);
  const filters = useMemo(() => parseMapFilters(query, SUBJECT_IDS), [query]);
  const model = useMapModel(filters);
  const profile = useProfileStore((s) => s.profile);
  const states = useConceptStateStore((s) => s.states);
  const overrides = useMapStore((s) => s.overrides);
  const customLoaded = useCustomConceptStore((s) => s.loaded);
  const mobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menu, setMenu] = useState<{
    target: MenuTarget;
    at: { x: number; y: number };
    from: HTMLElement | null;
    items: MenuItem[];
  } | null>(null);
  const [panelWidth, setPanelWidth] = useState(readPanelWidth);

  const view: "map" | "list" = query.get("view") === "list" ? "list" : "map";
  const hopsParam = query.get("hops");
  const hops: 0 | 1 | 2 = hopsParam === "2" ? 2 : hopsParam === "1" ? 1 : 0;
  const focus = query.get("focus");
  const selectedConcept = useConcept(focus ?? undefined);
  const selected = selectedConcept ? selectedConcept.id : null;

  // ----- the path (F25) ---------------------------------------------------------------------
  const pathTarget = query.get("path");
  const path = useMemo(() => {
    if (!pathTarget || !findConcept(pathTarget)) return null;
    return pathTo(pathTarget, {
      getConcept: findConcept,
      statusOf: (id) => states[id]?.status ?? "not_started",
      inScope: (c) => inScope(c, model.scopeCtx),
    });
    // Recompute when statuses or scope change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathTarget, states, model.scopeCtx, customLoaded]);
  const pathIds = useMemo(
    () => (path ? new Set(path.steps.map((s) => s.concept.id)) : null),
    [path],
  );

  // ----- the URL is the map's state; changes made here don't fly the map ----------------------
  const internal = useRef<string | null>(null);
  const setQuery = useCallback(
    (change: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(queryKey);
      change(q);
      internal.current = q.toString();
      navigate(routeHref("/map", undefined, Object.fromEntries(q)), { replace: true });
    },
    [queryKey],
  );

  const [fly, setFly] = useState<FlyRequest | null>(() =>
    flyFromQuery(query, `init-${queryKey}`, pathIdsFor(query)),
  );
  const [history, setHistory] = useState<{ stack: string[]; index: number }>(() => ({
    stack: selected ? [selected] : [],
    index: selected ? 0 : -1,
  }));

  // Links from elsewhere (search, the concept page, Today) fly the map; its own changes don't.
  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash);
      if (next.name !== "map") return;
      const key = next.query.toString();
      const fromHere = internal.current === key;
      internal.current = null;
      const focusId = next.query.get("focus");
      if (focusId && findConcept(focusId)) {
        setHistory((h) => {
          if (h.stack[h.index] === focusId) return h;
          const stack = [...h.stack.slice(0, h.index + 1), focusId].slice(-30);
          return { stack, index: stack.length - 1 };
        });
      }
      if (fromHere) return;
      const request = flyFromQuery(next.query, `nav-${key}-${Date.now()}`, pathIdsFor(next.query));
      if (request) setFly(request);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Tell the owner when a concept they asked for is hidden by the filters.
  useEffect(() => {
    if (fly?.kind !== "concept" || !fly.id || !customLoaded) return;
    if (!model.conceptIds.has(fly.id)) {
      const name = findConcept(fly.id)?.name ?? "That concept";
      toast(`${name} isn't on the map with these filters.`, {
        id: "map-hidden-target",
        action: {
          label: "Show everything",
          onClick: () =>
            setQuery((q) => {
              const kept = writeMapFilters(q, EMPTY_MAP_FILTERS);
              for (const k of [...q.keys()]) q.delete(k);
              kept.forEach((v, k) => q.set(k, v));
              q.set("hidden", "1");
            }),
        },
      });
    }
    // Once per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fly?.key, customLoaded]);

  useEffect(() => markSetupStep("map"), []);

  const setFilters = (changes: Partial<MapFilters>) =>
    setQuery((q) => {
      const next = writeMapFilters(q, { ...filters, ...changes });
      for (const k of [...q.keys()]) q.delete(k);
      next.forEach((v, k) => q.set(k, v));
    });
  const clearFilters = () => setFilters(EMPTY_MAP_FILTERS);

  const select = useCallback(
    (id: string) =>
      setQuery((q) => {
        q.set("focus", id);
      }),
    [setQuery],
  );

  /** From the panel or the path: open it and fly there (no pulse). */
  const openAndFly = useCallback(
    (id: string) => {
      select(id);
      setFly({ kind: "concept", id, key: `open-${id}-${Date.now()}` });
    },
    [select],
  );

  const goHistory = (delta: number) => {
    const index = history.index + delta;
    const id = history.stack[index];
    if (!id) return;
    setHistory({ ...history, index });
    openAndFly(id);
  };

  const closePanel = () =>
    setQuery((q) => {
      q.delete("focus");
      if (q.get("hops")) q.delete("hops");
    });

  const onMenu = (target: MenuTarget, at: { x: number; y: number }, from: HTMLElement | null) => {
    let items: MenuItem[];
    if (target.kind === "concept") {
      const c = findConcept(target.id);
      items = c
        ? conceptMenuItems(c, { onMap: true, onOpen: () => select(c.id), onDeleted: closePanel })
        : [];
    } else {
      const topicId = target.id;
      const topic = topicById.get(topicId);
      const inTopic = (conceptsByTopic.get(topicId) ?? []).filter((c) =>
        model.conceptIds.has(c.id),
      );
      items = [
        {
          id: "zoom",
          label: "Zoom in to this topic",
          icon: ZoomIn,
          onSelect: () => setFly({ kind: "topic", id: topicId, key: `menu-${Date.now()}` }),
        },
        {
          id: "add",
          label: "Add a concept here",
          icon: Plus,
          onSelect: () => openAddConcept(topicId),
        },
        {
          id: "cards",
          label: "Flashcards for this topic",
          icon: Layers,
          disabled: inTopic.length === 0,
          onSelect: () =>
            openFlashcards({
              conceptIds: inTopic.map((c) => c.id),
              title: `Flashcards: ${topic?.name}`,
            }),
        },
        {
          id: "list",
          label: "Show in the list",
          icon: Search,
          onSelect: () =>
            setQuery((q) => {
              q.set("view", "list");
              q.set("topic", topicId);
            }),
        },
      ];
    }
    setMenu({ target, at, from, items });
  };

  const hiddenCount = useMemo(() => Object.values(states).filter((s) => s.hidden).length, [states]);
  const matching = useMemo(
    () => [...model.facts.values()].filter((f) => f.match).length,
    [model.facts],
  );

  const onReset = () => {
    const previous = resetLayout();
    toast("Layout reset. Every bubble is back in its place.", {
      action: { label: "Undo", onClick: () => restoreOverrides(previous) },
    });
  };

  // ----- the side panel's width (desktop) ----------------------------------------------------
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    let width = panelWidth;
    const move = (ev: PointerEvent) => {
      width = Math.min(
        Math.max(MIN_PANEL, window.innerWidth - ev.clientX),
        Math.max(MIN_PANEL, window.innerWidth - 360),
      );
      setPanelWidth(width);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      try {
        localStorage.setItem(PANEL_KEY, String(Math.round(width)));
      } catch {
        /* a remembered width is only a convenience */
      }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };

  const panel = selectedConcept && (
    <ConceptSidePanel
      concept={selectedConcept}
      onOpenConcept={openAndFly}
      onClose={closePanel}
      onBack={history.index > 0 ? () => goHistory(-1) : undefined}
      onForward={history.index < history.stack.length - 1 ? () => goHistory(1) : undefined}
      titleId="map-panel-title"
      onDeleted={closePanel}
      extra={
        <IconButton
          icon={Maximize2}
          label="Open as a page"
          size="sm"
          onClick={() => navigate(conceptHref(selectedConcept.id))}
        />
      }
    />
  );

  const toolbar = (
    <MapToolbar
      title={<Title />}
      filters={filters}
      set={setFilters}
      clear={clearFilters}
      profileTrack={profile?.track ?? "both"}
      profileAdvanced={profile?.prefs.showAdvanced ?? true}
      hiddenCount={hiddenCount}
      view={view}
      onView={(v) =>
        setQuery((q) => {
          if (v === "list") q.set("view", "list");
          else q.delete("view");
        })
      }
      hops={hops}
      onHops={(h) =>
        setQuery((q) => {
          if (h) q.set("hops", String(h));
          else q.delete("hops");
        })
      }
      canFocus={selected !== null}
      mobile={mobile}
      sheetOpen={sheetOpen}
      onSheet={setSheetOpen}
      onAddConcept={() => openAddConcept("")}
      onResetLayout={onReset}
      canReset={Object.keys(overrides).some((id) => !id.startsWith("custom."))}
      matching={matching}
    />
  );

  if (view === "list") {
    return (
      <div className="flex min-h-full flex-col">
        {toolbar}
        <PageFrame className="pt-6">
          <MapListView target={listTarget(query, queryKey)} />
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[440px] flex-col">
      {toolbar}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <MapCanvas
            model={model}
            selected={selected}
            onSelect={select}
            onMenu={onMenu}
            fly={fly}
            hops={selected ? hops : 0}
            pathIds={pathIds}
          />
          {path && (
            <div
              className={
                mobile
                  ? "absolute inset-x-2 top-2 flex max-h-full flex-col"
                  : "absolute top-3 left-3 flex h-full flex-col pb-6"
              }
            >
              <PathPanel
                path={path}
                mobile={mobile}
                onPick={openAndFly}
                onClose={() => setQuery((q) => q.delete("path"))}
              />
            </div>
          )}
        </div>
        {!mobile && panel && (
          <aside
            aria-labelledby="map-panel-title"
            className="relative shrink-0 border-l border-rule bg-surface"
            style={{ width: panelWidth }}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              tabIndex={0}
              onPointerDown={startResize}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                setPanelWidth((w) => Math.max(MIN_PANEL, w + (e.key === "ArrowLeft" ? 24 : -24)));
              }}
              className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize outline-none hover:bg-accent-soft focus-visible:bg-accent-soft"
            />
            {panel}
          </aside>
        )}
      </div>
      {mobile && (
        <BottomSheet
          open={Boolean(panel)}
          onClose={closePanel}
          title={selectedConcept?.name ?? "Concept"}
          hideTitle
        >
          <div className="h-[72vh]">{panel}</div>
        </BottomSheet>
      )}
      <ContextMenu
        at={menu?.at ?? null}
        items={menu?.items ?? []}
        label={
          menu?.target.kind === "topic"
            ? `${topicById.get(menu.target.id)?.name} menu`
            : "Concept menu"
        }
        onClose={() => setMenu(null)}
        returnFocus={menu?.from}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <ReactFlowProvider>
      <MapScreen />
    </ReactFlowProvider>
  );
}
