// Bubbles the owner dragged to a new place on the map (F2), stored as MapOverride records and
// applied on top of the precomputed layout. "Reset layout" clears them (with Undo).
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { MapOverride } from "@/lib/types";
import { toast } from "./toastStore";

export type Point = { x: number; y: number };

interface MapState {
  overrides: Record<string, Point>;
  loaded: boolean;
}

export const useMapStore = create<MapState>(() => ({ overrides: {}, loaded: false }));

let repo: Repository | null = null;

export async function hydrateMapOverrides(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.mapOverrides.list();
  const overrides: Record<string, Point> = {};
  for (const o of list) overrides[o.nodeId] = { x: o.x, y: o.y };
  useMapStore.setState({ overrides, loaded: true });
}

export function detachMapOverrides(): void {
  repo = null;
  useMapStore.setState({ overrides: {}, loaded: false });
}

const saveFailed = () =>
  toast("Couldn't save the new position. Check that storage is available.", { tone: "error" });

const round = (v: number) => Math.round(v * 10) / 10;

export function moveNode(nodeId: string, point: Point): void {
  const p = { x: round(point.x), y: round(point.y) };
  const overrides = { ...useMapStore.getState().overrides, [nodeId]: p };
  useMapStore.setState({ overrides });
  const record: MapOverride = { nodeId, ...p, updatedAt: nowIso() };
  repo?.mapOverrides.put(record).catch(saveFailed);
}

export function removeOverride(nodeId: string): void {
  const overrides = { ...useMapStore.getState().overrides };
  if (!(nodeId in overrides)) return;
  delete overrides[nodeId];
  useMapStore.setState({ overrides });
  repo?.mapOverrides.delete(nodeId).catch(saveFailed);
}

/** Clears every dragged position. Returns the previous ones, for Undo. */
export function resetLayout(): Record<string, Point> {
  const previous = useMapStore.getState().overrides;
  useMapStore.setState({ overrides: {} });
  repo?.mapOverrides.clear().catch(saveFailed);
  return previous;
}

export function restoreOverrides(previous: Record<string, Point>): void {
  useMapStore.setState({ overrides: { ...previous } });
  const stamp = nowIso();
  const records = Object.entries(previous).map(([nodeId, p]) => ({
    nodeId,
    ...p,
    updatedAt: stamp,
  }));
  repo?.mapOverrides.bulkPut(records).catch(saveFailed);
}
