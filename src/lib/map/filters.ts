// Map filters (F2), kept in the URL like the library's (#/map?status=fading&ready=1). Two kinds:
//   - scope filters remove bubbles: subjects, track, advanced concepts, hidden concepts;
//   - attribute filters dim what doesn't match, so the owner still sees where things are:
//     status, importance, ready to learn, due for review.
import type { Concept, Importance, Status, Track } from "@/lib/types";
import { inTrack } from "../concepts/scope";

export interface MapFilters {
  subjects: string[];
  statuses: Status[];
  importance: Importance[];
  ready: boolean;
  due: boolean;
  /** null follows Settings → Appearance → Show advanced concepts. */
  advanced: "show" | "hide" | null;
  /** null follows the profile's track. */
  track: Track | null;
  showHidden: boolean;
}

export const EMPTY_MAP_FILTERS: MapFilters = {
  subjects: [],
  statuses: [],
  importance: [],
  ready: false,
  due: false,
  advanced: null,
  track: null,
  showHidden: false,
};

const STATUSES: Status[] = ["not_started", "learning", "strong", "fading"];
const IMPORTANCE: Importance[] = ["must", "important", "advanced"];
const TRACKS: Track[] = ["sde", "quant", "both"];

function list<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  const set = new Set(value.split(","));
  return allowed.filter((v) => set.has(v));
}

export function parseMapFilters(query: URLSearchParams, subjectIds: readonly string[]): MapFilters {
  const advanced = query.get("advanced");
  const track = query.get("track");
  return {
    subjects: list(query.get("subjects"), subjectIds),
    statuses: list(query.get("status"), STATUSES),
    importance: list(query.get("importance"), IMPORTANCE),
    ready: query.get("ready") === "1",
    due: query.get("due") === "1",
    advanced: advanced === "show" || advanced === "hide" ? advanced : null,
    track: TRACKS.includes(track as Track) ? (track as Track) : null,
    showHidden: query.get("hidden") === "1",
  };
}

/** Writes the filters into a copy of the query (other keys such as focus are kept). */
export function writeMapFilters(query: URLSearchParams, f: MapFilters): URLSearchParams {
  const q = new URLSearchParams(query);
  const set = (key: string, value: string | null) => {
    if (value) q.set(key, value);
    else q.delete(key);
  };
  set("subjects", f.subjects.join(","));
  set("status", f.statuses.join(","));
  set("importance", f.importance.join(","));
  set("ready", f.ready ? "1" : null);
  set("due", f.due ? "1" : null);
  set("advanced", f.advanced);
  set("track", f.track);
  set("hidden", f.showHidden ? "1" : null);
  return q;
}

/** How many filters differ from the defaults (for the "Filters (3)" button). */
export function activeFilterCount(f: MapFilters): number {
  return (
    (f.subjects.length ? 1 : 0) +
    (f.statuses.length ? 1 : 0) +
    (f.importance.length ? 1 : 0) +
    (f.ready ? 1 : 0) +
    (f.due ? 1 : 0) +
    (f.advanced ? 1 : 0) +
    (f.track ? 1 : 0) +
    (f.showHidden ? 1 : 0)
  );
}

/** Only attribute filters (they dim rather than remove). */
export function hasAttributeFilters(f: MapFilters): boolean {
  return f.statuses.length > 0 || f.importance.length > 0 || f.ready || f.due;
}

export interface ScopeSettings {
  track: Track;
  showAdvanced: boolean;
}

/** The effective track and advanced switch: the map's override, else the profile's settings. */
export function effectiveScope(f: MapFilters, defaults: ScopeSettings): ScopeSettings {
  return {
    track: f.track ?? defaults.track,
    showAdvanced: f.advanced ? f.advanced === "show" : defaults.showAdvanced,
  };
}

/** Scope filters: whether a concept is on the map at all. */
export function conceptOnMap(
  concept: Concept,
  hidden: boolean,
  f: MapFilters,
  scope: ScopeSettings,
): boolean {
  if (hidden && !f.showHidden) return false;
  if (f.subjects.length > 0 && !f.subjects.includes(concept.subjectId)) return false;
  if (!scope.showAdvanced && concept.importance === "advanced") return false;
  return inTrack(concept.tracks, scope.track);
}

export interface ConceptFacts {
  status: Status;
  /** Due (or overdue) for its concept review today. */
  due: boolean;
  ready: boolean;
}

/** Attribute filters: whether a concept on the map matches (non-matching ones are dimmed). */
export function conceptMatches(concept: Concept, facts: ConceptFacts, f: MapFilters): boolean {
  if (f.statuses.length > 0 && !f.statuses.includes(facts.status)) return false;
  if (f.importance.length > 0 && !f.importance.includes(concept.importance)) return false;
  if (f.ready && !facts.ready) return false;
  if (f.due && !facts.due) return false;
  return true;
}
