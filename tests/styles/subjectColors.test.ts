// Subject colors (BUILD_SPEC.md 12.10.3): the hues in content/, the spec's table, the generated
// CSS and the map agree; every mark is readable on its theme's surface; and the hues never move
// the map.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  readSubjectHues,
  renderSubjectCss,
  subjectColors,
} from "../../scripts/build-subject-colors.mjs";
import { structureHash } from "../../scripts/build-layout.mjs";
import { contrast, parseColor } from "../../scripts/lib/color.mjs";
import { layout } from "@/data/layout";
import { syllabus } from "@/data/syllabus";
import { themeTokens } from "./tokens";

const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");
const onDisk = readFileSync(
  new URL("../../src/styles/subjects.generated.css", import.meta.url),
  "utf8",
);

/** Rows of the 12.10.3 table: | `dsa` | 255 | `#3D6DAA` | ... */
function specTable() {
  const section = spec.slice(spec.indexOf("#### 12.10.3"), spec.indexOf("#### 12.10.4"));
  const rows = section
    .split("\n")
    .filter((line) => /^\| `[a-z]+` \|/.test(line))
    .map((line) => line.split("|").map((cell) => cell.trim().replace(/`/g, "")));
  return rows.map((cells) => ({
    id: cells[1]!,
    hue: Number(cells[2]),
    dayMark: cells[3]!.toLowerCase(),
    dayTint: cells[4]!.toLowerCase(),
    darkMark: cells[5]!.toLowerCase(),
    darkTint: cells[6]!.toLowerCase(),
  }));
}

const colors = subjectColors(readSubjectHues());
const tokens = themeTokens();

describe("subject colors", () => {
  it("give every subject the hue in the spec's table", () => {
    const table = specTable();
    expect(table).toHaveLength(18);
    expect(new Set(table.map((r) => r.id))).toEqual(new Set(syllabus.subjects.map((s) => s.id)));
    for (const row of table) {
      expect(syllabus.subjects.find((s) => s.id === row.id)?.regionHue, row.id).toBe(row.hue);
    }
  });

  it("reproduce every value in the spec's table", () => {
    const byId = new Map(colors.map((c) => [c.id, c]));
    for (const row of specTable()) expect(byId.get(row.id), row.id).toEqual(row);
  });

  it("are generated and committed (run `npm run build:colors`)", () => {
    expect(onDisk).toBe(renderSubjectCss(colors));
  });

  it("define a mark and a tint for every subject in every theme, and a data-subject shorthand", () => {
    for (const theme of ["day", "dusk", "night"] as const) {
      for (const s of syllabus.subjects) {
        expect(tokens[theme][`--subject-${s.id}-mark`], `${theme} ${s.id}`).toMatch(/^#/);
        expect(tokens[theme][`--subject-${s.id}-tint`], `${theme} ${s.id}`).toMatch(/^#/);
      }
    }
    for (const s of syllabus.subjects) {
      expect(onDisk).toContain(`[data-subject="${s.id}"] {`);
    }
  });

  it("keep every mark readable as text on its theme's surfaces", () => {
    for (const theme of ["day", "dusk", "night"] as const) {
      const t = tokens[theme];
      // Spec: every Day mark clears 4.69:1 on the Day surface; every Night mark 7.2:1 on Night's.
      const floor = theme === "day" ? 4.69 : theme === "night" ? 7.2 : 4.5;
      for (const s of syllabus.subjects) {
        const mark = parseColor(t[`--subject-${s.id}-mark`]!);
        const tint = parseColor(t[`--subject-${s.id}-tint`]!);
        const surface = parseColor(t["--surface"]!);
        const onSurface = Math.round(contrast(mark, surface) * 100) / 100; // the spec rounds to 0.01
        expect(onSurface, `${theme} ${s.id} mark on surface`).toBeGreaterThanOrEqual(floor);
        // On its tint the mark draws emblems and icons (3:1); names on a tint are in --text.
        expect(contrast(mark, tint), `${theme} ${s.id} mark on its tint`).toBeGreaterThan(3);
        const text = parseColor(t["--text"]!);
        expect(contrast(text, tint), `${theme} ${s.id} text on its tint`).toBeGreaterThan(7);
      }
    }
  });

  it("never move the map: hues are not part of the layout's structure hash", () => {
    const recolored = {
      ...syllabus,
      subjects: syllabus.subjects.map((s) => ({ ...s, regionHue: (s.regionHue + 97) % 360 })),
    };
    expect(structureHash(recolored)).toBe(structureHash(syllabus));
    expect(layout.inputHash).toBe(structureHash(syllabus));
  });
});
