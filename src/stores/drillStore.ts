// Drill prompts Claude generated for the owner's weakest patterns (F10), kept in the bank next to
// the seed prompts. Stored through the Repository (the `generatedDrills` table, one grouped
// document in the artifact).
import { nanoid } from "nanoid";
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { DrillPrompt, GeneratedDrill } from "@/lib/types";
import { toast } from "./toastStore";

interface DrillState {
  generated: Record<string, GeneratedDrill>;
  loaded: boolean;
}

export const useDrillStore = create<DrillState>(() => ({ generated: {}, loaded: false }));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save the drill prompts. Check that storage is available, then try again.", {
    tone: "error",
    id: "drill-save",
  });

export async function hydrateGeneratedDrills(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.generatedDrills.list();
  useDrillStore.setState({
    generated: Object.fromEntries(list.map((d) => [d.id, d])),
    loaded: true,
  });
}

export function detachGeneratedDrills(): void {
  repo = null;
  useDrillStore.setState({ generated: {}, loaded: false });
}

/** Adds prompts to the bank; returns the stored records. */
export function addGeneratedDrills(prompts: readonly Omit<DrillPrompt, "id">[]): GeneratedDrill[] {
  const stamp = nowIso();
  const records: GeneratedDrill[] = prompts.map((p) => ({
    id: `gen-${nanoid(10)}`,
    text: p.text.trim(),
    answerConceptIds: p.answerConceptIds,
    keyInsight: p.keyInsight.trim(),
    difficulty: p.difficulty,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  if (records.length === 0) return records;
  useDrillStore.setState((s) => ({
    generated: { ...s.generated, ...Object.fromEntries(records.map((r) => [r.id, r])) },
  }));
  repo?.generatedDrills.bulkPut(records).catch(saveFailed);
  return records;
}

export function deleteGeneratedDrill(id: string): GeneratedDrill | null {
  const record = useDrillStore.getState().generated[id];
  if (!record) return null;
  useDrillStore.setState((s) => {
    const generated = { ...s.generated };
    delete generated[id];
    return { generated };
  });
  repo?.generatedDrills.delete(id).catch(saveFailed);
  return record;
}

export function restoreGeneratedDrill(record: GeneratedDrill): void {
  useDrillStore.setState((s) => ({ generated: { ...s.generated, [record.id]: record } }));
  repo?.generatedDrills.put(record).catch(saveFailed);
}
