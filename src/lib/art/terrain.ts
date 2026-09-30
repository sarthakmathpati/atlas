// Living terrain (BUILD_SPEC.md 12.10.7): the picture in Today's page head (and the welcome
// screen). The focus subjects, or with none the three subjects with the largest weight in the
// track, are hills. A hill's height is the subject's readiness (0.35 + readiness / 100 × 1.3 of a
// full hill), its place comes from a seed of the subject id, and the background comes from a seed
// of the ISO week, so the picture changes only when readiness or the week changes. Pure.
import { getISOWeek, getISOWeekYear } from "date-fns";
import { subjectById } from "@/data/syllabus";
import { hashSeed, mulberry32 } from "@/lib/random";
import type { ReadinessModel } from "@/lib/readiness/model";
import { subjectWeight } from "@/lib/readiness/score";
import { parseLocalDate } from "@/lib/time";
import type { Profile } from "@/lib/types";
import type { ContourHill } from "./contours";

export interface TerrainSubject {
  id: string;
  /** Shown in the spot height ("DSA 57"). */
  shortName: string;
  /** 0 to 100. */
  readiness: number;
}

/** A hill's height for a readiness of 0 to 100. */
export function hillHeight(readiness: number): number {
  const r = Math.min(100, Math.max(0, readiness));
  return 0.35 + (r / 100) * 1.3;
}

/** The background's seed: the ISO week of the local date ("terrain:2026-W39"). */
export function terrainSeed(day: string): string {
  const d = parseLocalDate(day);
  return `terrain:${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

/** Where hills may sit: the right part of the head, clear of the greeting on the left. */
const AREA = { x0: 0.5, x1: 0.84, y0: 0.3, y1: 0.72 };
/** The least distance between two peaks (as a fraction of the width), so labels don't collide. */
const MIN_GAP = 0.13;

/**
 * The hills for the given subjects. Each subject draws candidate places from its own seed and
 * takes the first one far enough from the subjects placed before it (sorted by id), so a subject
 * keeps its place from week to week and the hills never pile up.
 */
export function terrainHills(subjects: readonly TerrainSubject[]): ContourHill[] {
  const placed: ContourHill[] = [];
  const ordered = [...subjects].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const s of ordered) {
    const rand = mulberry32(hashSeed(`terrain-hill:${s.id}`));
    const r = 0.075 + rand() * 0.035;
    let best: { x: number; y: number; gap: number } | null = null;
    for (let tries = 0; tries < 24; tries++) {
      const x = AREA.x0 + rand() * (AREA.x1 - AREA.x0);
      const y = AREA.y0 + rand() * (AREA.y1 - AREA.y0);
      const gap = Math.min(Infinity, ...placed.map((p) => Math.hypot(p.x - x, (p.y - y) * 0.35)));
      if (!best || gap > best.gap) best = { x, y, gap };
      if (gap >= MIN_GAP) break;
    }
    placed.push({
      x: best!.x,
      y: best!.y,
      r,
      height: hillHeight(s.readiness),
      label: `${s.shortName} ${Math.round(s.readiness)}`,
    });
  }
  return placed;
}

/** The subjects drawn as hills: the focus subjects, or the three that weigh most in the track. */
export function terrainSubjects(
  profile: Pick<Profile, "focusSubjects" | "track">,
  model: ReadinessModel | null,
): TerrainSubject[] {
  const readiness = new Map(model?.subjects.map((s) => [s.subjectId, s.readiness]) ?? []);
  const ids = profile.focusSubjects.length
    ? profile.focusSubjects
    : [...subjectById.keys()]
        .map((id) => ({ id, w: subjectWeight(id, profile.track) }))
        .filter((s) => s.w > 0)
        .sort((a, b) => b.w - a.w || (a.id < b.id ? -1 : 1))
        .slice(0, 3)
        .map((s) => s.id);
  return ids.flatMap((id) => {
    const subject = subjectById.get(id);
    return subject
      ? [{ id, shortName: subject.shortName, readiness: Math.round(readiness.get(id) ?? 0) }]
      : [];
  });
}
