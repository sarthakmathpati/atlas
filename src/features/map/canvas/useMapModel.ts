// Everything the map draws, derived from the syllabus, the layout, the owner's progress and the
// filters. Positions never come from a runtime layout: the precomputed layout, dragged positions
// (MapOverride) and, for the owner's own concepts, a spot next to their topic.
import { useEffect, useMemo } from "react";
import { layout } from "@/data/layout";
import { concepts as seedConcepts, subjects, topics } from "@/data/syllabus";
import { inScope, languageCounts, type ScopeContext } from "@/lib/concepts/scope";
import {
  conceptMatches,
  conceptOnMap,
  effectiveScope,
  type MapFilters,
  type ScopeSettings,
} from "@/lib/map/filters";
import { labelThresholds, measureLabel, type LabelItem } from "@/lib/map/labels";
import { placeNearTopic, type Circle } from "@/lib/map/place";
import { countStatuses, type StatusCounts } from "@/lib/map/summary";
import { isReady } from "@/lib/recommend/ready";
import { isDue } from "@/lib/srs/intervals";
import type {
  Concept,
  ConceptState,
  Importance,
  PrimaryLanguage,
  Profile,
  Status,
} from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { moveNode, useMapStore, type Point } from "@/stores/mapStore";
import { useProfileStore } from "@/stores/profileStore";
import { CONCEPT_LABEL_ZOOMS, SUBJECT_LABEL_ZOOMS, TOPIC_LABEL_ZOOMS } from "./viewStore";

export const BUBBLE_RADIUS: Record<Importance, number> = layout.sizes.bubbleRadius;
const PRIORITY: Record<Importance, number> = { must: 3, important: 2, advanced: 1 };
const DENSITY_SCALE = { low: 1.25, normal: 1, high: 0.8 } as const;

export interface ConceptFacts {
  status: Status;
  due: boolean;
  ready: boolean;
  /** Matches the attribute filters (otherwise dimmed). */
  match: boolean;
  /** Another language's topic the owner doesn't use (dimmed, section 6). */
  otherLanguage: boolean;
}

export interface MapModel {
  scope: ScopeSettings;
  scopeCtx: ScopeContext;
  /** Concepts on the map (after scope filters), seed and custom. */
  concepts: Concept[];
  conceptIds: ReadonlySet<string>;
  positions: ReadonlyMap<string, Point>;
  facts: ReadonlyMap<string, ConceptFacts>;
  /** Topics and subjects with at least one concept on the map. */
  topicIds: string[];
  subjectIds: string[];
  topicCounts: ReadonlyMap<string, StatusCounts>;
  topicMatch: ReadonlyMap<string, boolean>;
  subjectCounts: ReadonlyMap<string, StatusCounts>;
  subjectMatch: ReadonlyMap<string, boolean>;
  conceptLabels: ReadonlyMap<string, number>;
  topicLabels: ReadonlyMap<string, number>;
  subjectLabels: ReadonlyMap<string, number>;
  statusOf: (id: string) => Status;
}

/** Positions for the owner's concepts that were never dragged: next to their topic. */
function placeCustom(
  custom: readonly Concept[],
  overrides: Readonly<Record<string, Point>>,
): Map<string, Point> {
  const placed = new Map<string, Point>();
  const occupied: Circle[] = seedConcepts.map((c) => {
    const p = overrides[c.id] ?? layout.positions[c.id]!;
    return { x: p.x, y: p.y, r: BUBBLE_RADIUS[c.importance] };
  });
  for (const c of custom) {
    const r = BUBBLE_RADIUS[c.importance];
    const own = overrides[c.id];
    if (own) {
      occupied.push({ ...own, r });
      continue;
    }
    const t = layout.positions[c.topicId];
    if (!t) continue;
    const p = placeNearTopic({ ...t, r: layout.topics[c.topicId]?.r ?? 80 }, occupied, r);
    placed.set(c.id, p);
    occupied.push({ ...p, r });
  }
  return placed;
}

export function positionFor(
  id: string,
  overrides: Readonly<Record<string, Point>>,
  custom: ReadonlyMap<string, Point>,
): Point | undefined {
  return overrides[id] ?? layout.positions[id] ?? custom.get(id);
}

export function useMapModel(filters: MapFilters): MapModel {
  const profile = useProfileStore((s) => s.profile);
  const states = useConceptStateStore((s) => s.states);
  const customMap = useCustomConceptStore((s) => s.concepts);
  const overrides = useMapStore((s) => s.overrides);
  const today = useToday();

  const track = profile?.track ?? "both";
  const showAdvanced = profile?.prefs.showAdvanced ?? true;
  const density = profile?.prefs.labelDensity ?? "normal";
  const primaryLanguage = profile?.primaryLanguage ?? "cpp";
  const extraKey = profile?.prefs.extraLanguages.join(",") ?? "";
  const languages = useMemo<
    Pick<Profile, "primaryLanguage"> & { prefs: Pick<Profile["prefs"], "extraLanguages"> }
  >(
    () => ({
      primaryLanguage,
      prefs: { extraLanguages: extraKey ? (extraKey.split(",") as PrimaryLanguage[]) : [] },
    }),
    [primaryLanguage, extraKey],
  );

  const custom = useMemo(
    () => Object.values(customMap).sort((a, b) => a.order - b.order),
    [customMap],
  );
  const all = useMemo(() => [...seedConcepts, ...custom], [custom]);
  const customPlaced = useMemo(() => placeCustom(custom, overrides), [custom, overrides]);

  const scope = useMemo(
    () => effectiveScope(filters, { track, showAdvanced }),
    [filters, track, showAdvanced],
  );

  // Hidden flags change rarely; keep them apart from statuses so labels don't recompute.
  const hiddenKey = useMemo(
    () =>
      Object.values(states)
        .filter((s) => s.hidden)
        .map((s) => s.conceptId)
        .sort()
        .join("|"),
    [states],
  );
  const hidden = useMemo(() => new Set(hiddenKey ? hiddenKey.split("|") : []), [hiddenKey]);

  const scopeCtx = useMemo<ScopeContext>(
    () => ({ track: scope.track, profile: languages, isHidden: (id) => hidden.has(id) }),
    [scope.track, languages, hidden],
  );

  const onMap = useMemo(
    () => all.filter((c) => conceptOnMap(c, hidden.has(c.id), filters, scope)),
    [all, hidden, filters, scope],
  );
  const conceptIds = useMemo(() => new Set(onMap.map((c) => c.id)), [onMap]);

  const positions = useMemo(() => {
    const map = new Map<string, Point>();
    for (const c of onMap) {
      const p = positionFor(c.id, overrides, customPlaced);
      if (p) map.set(c.id, p);
    }
    return map;
  }, [onMap, overrides, customPlaced]);

  const derived = useMemo(() => {
    const statusOf = (id: string): Status => states[id]?.status ?? "not_started";
    const facts = new Map<string, ConceptFacts>();
    const readyCtx = { statusOf, inScope: (c: Concept) => inScope(c, scopeCtx) };
    for (const c of onMap) {
      const state: ConceptState | undefined = states[c.id];
      const status = statusOf(c.id);
      const due = isDue(state?.srs.dueAt, today);
      const ready = status === "not_started" && isReady(c, readyCtx);
      facts.set(c.id, {
        status,
        due,
        ready,
        match: conceptMatches(c, { status, due, ready }, filters),
        otherLanguage: !languageCounts(c.topicId, languages),
      });
    }
    const byTopic = new Map<string, Concept[]>();
    const bySubject = new Map<string, Concept[]>();
    for (const c of onMap) {
      (byTopic.get(c.topicId) ?? byTopic.set(c.topicId, []).get(c.topicId)!).push(c);
      (bySubject.get(c.subjectId) ?? bySubject.set(c.subjectId, []).get(c.subjectId)!).push(c);
    }
    const topicCounts = new Map<string, StatusCounts>();
    const topicMatch = new Map<string, boolean>();
    for (const [id, list] of byTopic) {
      topicCounts.set(
        id,
        countStatuses(
          list.map((c) => c.id),
          statusOf,
        ),
      );
      topicMatch.set(
        id,
        list.some((c) => facts.get(c.id)!.match),
      );
    }
    const subjectCounts = new Map<string, StatusCounts>();
    const subjectMatch = new Map<string, boolean>();
    for (const [id, list] of bySubject) {
      const counted = list.filter((c) => !facts.get(c.id)!.otherLanguage);
      subjectCounts.set(
        id,
        countStatuses(
          counted.map((c) => c.id),
          statusOf,
        ),
      );
      subjectMatch.set(
        id,
        list.some((c) => facts.get(c.id)!.match),
      );
    }
    return { statusOf, facts, topicCounts, topicMatch, subjectCounts, subjectMatch };
  }, [onMap, states, today, filters, scopeCtx, languages]);

  const topicIds = useMemo(
    () => topics.filter((t) => derived.topicCounts.has(t.id)).map((t) => t.id),
    [derived.topicCounts],
  );
  const subjectIds = useMemo(
    () => subjects.filter((s) => derived.subjectCounts.has(s.id)).map((s) => s.id),
    [derived.subjectCounts],
  );

  const conceptLabels = useMemo(() => {
    const items: LabelItem[] = [];
    for (const c of onMap) {
      const p = positions.get(c.id);
      if (!p) continue;
      items.push({
        id: c.id,
        x: p.x,
        y: p.y,
        r: BUBBLE_RADIUS[c.importance],
        ...measureLabel(c.name),
        priority: PRIORITY[c.importance],
      });
    }
    return labelThresholds(items, CONCEPT_LABEL_ZOOMS, {
      anchor: "below",
      scale: DENSITY_SCALE[density],
    });
  }, [onMap, positions, density]);

  const topicLabels = useMemo(() => {
    const items: LabelItem[] = [];
    for (const t of topics) {
      const p = layout.positions[t.id];
      const count = derived.topicCounts.get(t.id);
      if (!p || !count) continue;
      const { w, h } = measureLabel(t.name, { maxWidth: 132, charWidth: 6.1, lineHeight: 15 });
      items.push({
        id: t.id,
        x: p.x,
        y: p.y,
        r: 0,
        w: w + 20,
        h: h + 18,
        priority: count.not_started + count.learning + count.strong + count.fading,
      });
    }
    return labelThresholds(items, TOPIC_LABEL_ZOOMS, { anchor: "center", padding: 4 });
    // Topic cards move only when the set of topics changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicIds]);

  const subjectLabels = useMemo(() => {
    const items: LabelItem[] = [];
    for (const s of subjects) {
      const region = layout.regions[s.id];
      if (!region || !subjectIds.includes(s.id)) continue;
      items.push({
        id: s.id,
        x: region.cx,
        y: region.cy,
        r: 0,
        w: Math.max(64, s.shortName.length * 7 + 16),
        h: 64,
        priority: region.area,
      });
    }
    return labelThresholds(items, SUBJECT_LABEL_ZOOMS, { anchor: "center", padding: 2 });
  }, [subjectIds]);

  // The owner's concepts keep the spot they were first given, even if others are added later.
  useEffect(() => {
    for (const [id, p] of customPlaced) moveNode(id, p);
  }, [customPlaced]);

  return {
    scope,
    scopeCtx,
    concepts: onMap,
    conceptIds,
    positions,
    facts: derived.facts,
    topicIds,
    subjectIds,
    topicCounts: derived.topicCounts,
    topicMatch: derived.topicMatch,
    subjectCounts: derived.subjectCounts,
    subjectMatch: derived.subjectMatch,
    conceptLabels,
    topicLabels,
    subjectLabels,
    statusOf: derived.statusOf,
  };
}
