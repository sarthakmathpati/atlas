// WCAG contrast of every text and background token pair in every theme (BUILD_SPEC.md 12.10.2,
// session 9.1): AA (4.5:1) everywhere, AAA (7:1) for body text, 3:1 for the marks that carry
// meaning (status glyphs, focus ring, filled buttons), and the validated-ramp rules for the chart
// and heatmap ramps (decisions 23 and 90). Values are read from the CSS that ships.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composite, contrast, parseColor, rgbToOklch } from "../../scripts/lib/color.mjs";
import { ruleTheme, themeTokens, TOKEN_FILES, tokenRules, type ThemeName } from "./tokens";

const THEMES: ThemeName[] = ["day", "dusk", "night"];
const tokens = themeTokens();
const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");

function color(theme: ThemeName, name: string) {
  const value = tokens[theme][name];
  if (!value) throw new Error(`${theme}: ${name} is not defined`);
  return parseColor(value);
}

/** A translucent token painted over an opaque one, as it appears on screen. */
function over(theme: ThemeName, top: string, under: string) {
  return composite(color(theme, top), color(theme, under));
}

type Rgba = ReturnType<typeof parseColor>;
function expectContrast(label: string, fg: Rgba, bg: Rgba, min: number) {
  const ratio = contrast(fg, bg);
  expect(ratio, `${label}: ${ratio.toFixed(2)}:1, needs ${min}:1`).toBeGreaterThanOrEqual(min);
}

/** Plain backgrounds any text may sit on. */
const PLAIN = ["--canvas", "--surface", "--surface-raised", "--surface-sunken", "--sidebar"];
/** Text tokens and their minimum on plain backgrounds (--text is body text: AAA). */
const TEXT: [string, number][] = [
  ["--text", 7],
  ["--text-muted", 4.5],
  ["--text-faint", 4.5],
  ["--accent", 4.5],
  ["--danger", 4.5],
  ["--success", 4.5],
  ["--warning", 4.5],
  ["--chart-axis", 4.5],
  ["--contour-label", 4.5],
];
/** Tinted backgrounds, with the one colored text meant to sit on each. */
const TINTS: [string, string][] = [
  ["--accent-soft", "--accent"],
  ["--info-soft", "--accent"],
  ["--danger-soft", "--danger"],
  ["--warning-soft", "--warning"],
  ["--success-soft", "--success"],
];
const CODE_TEXT = [
  "--code-keyword",
  "--code-string",
  "--code-number",
  "--code-comment",
  "--code-function",
  "--code-type",
  "--code-meta",
  "--code-operator",
  "--code-invalid",
  "--code-gutter",
];

describe.each(THEMES)("%s theme", (theme) => {
  it("keeps every text token readable on every plain background", () => {
    for (const bg of PLAIN) {
      for (const [fg, min] of TEXT) {
        expectContrast(`${theme} ${fg} on ${bg}`, color(theme, fg), color(theme, bg), min);
      }
    }
  });

  it("keeps text, muted text and the matching color readable on every tint", () => {
    for (const under of ["--surface", "--canvas", "--surface-raised"]) {
      for (const [tint, own] of TINTS) {
        const bg = over(theme, tint, under);
        const label = `${theme} on ${tint} over ${under}`;
        expectContrast(`${label}: --text`, color(theme, "--text"), bg, 7);
        expectContrast(`${label}: --text-muted`, color(theme, "--text-muted"), bg, 4.5);
        expectContrast(`${label}: ${own}`, color(theme, own), bg, 4.5);
      }
    }
  });

  it("keeps labels on filled buttons readable, hovered or not", () => {
    for (const fill of ["--accent", "--accent-hover"]) {
      expectContrast(
        `${theme} --on-accent on ${fill}`,
        color(theme, "--on-accent"),
        color(theme, fill),
        4.5,
      );
    }
    for (const fill of ["--danger", "--danger-hover"]) {
      expectContrast(
        `${theme} --on-danger on ${fill}`,
        color(theme, "--on-danger"),
        color(theme, fill),
        4.5,
      );
    }
  });

  it("keeps code readable on the code background, in diffs and on the active line", () => {
    const backgrounds: [string, Rgba][] = [
      ["--code-bg", color(theme, "--code-bg")],
      ["--diff-add-bg", over(theme, "--diff-add-bg", "--code-bg")],
      ["--diff-del-bg", over(theme, "--diff-del-bg", "--code-bg")],
      ["--code-active-line", over(theme, "--code-active-line", "--code-bg")],
    ];
    for (const [name, bg] of backgrounds) {
      expectContrast(`${theme} --text on ${name}`, color(theme, "--text"), bg, 7);
      for (const fg of CODE_TEXT)
        expectContrast(`${theme} ${fg} on ${name}`, color(theme, fg), bg, 4.5);
    }
  });

  it("keeps meaningful marks at 3:1: status glyphs, the focus ring and filled buttons", () => {
    const marks = [
      "--status-not-started-stroke",
      "--status-learning-stroke",
      "--status-strong-stroke",
      "--status-fading-stroke",
      "--focus-ring",
      "--accent",
    ];
    for (const bg of ["--canvas", "--surface", "--surface-raised"]) {
      for (const fg of marks)
        expectContrast(`${theme} ${fg} on ${bg}`, color(theme, fg), color(theme, bg), 3);
    }
  });

  it("keeps the chart and heatmap ramps ordered, stepped and visible (decisions 23 and 90)", () => {
    const surface = color(theme, "--surface");
    for (const ramp of [
      ["--chart-1", "--chart-2", "--chart-3"],
      ["--heat-1", "--heat-2", "--heat-3", "--heat-4"],
    ]) {
      const steps = ramp.map((name) => rgbToOklch(color(theme, name)));
      // Day: light to dark. Dusk and Night flip, so the most salient step is the lightest.
      const direction = theme === "day" ? -1 : 1;
      for (let i = 1; i < steps.length; i++) {
        const delta = (steps[i]![0] - steps[i - 1]![0]) * direction;
        expect(
          delta,
          `${theme} ${ramp[i - 1]} to ${ramp[i]}: lightness step`,
        ).toBeGreaterThanOrEqual(0.06);
      }
      const hues = steps.map((s) => s[2]);
      expect(
        Math.max(...hues) - Math.min(...hues),
        `${theme} ${ramp.join(" ")} hue spread`,
      ).toBeLessThan(6);
      expectContrast(
        `${theme} ${ramp[0]} (the faintest step) on --surface`,
        color(theme, ramp[0]!),
        surface,
        2,
      );
    }
    expect(tokens[theme]["--chart-series"]).toBe(tokens[theme]["--chart-2"]);
  });
});

describe("theme blocks", () => {
  it("define the same color tokens in Day, Dusk and Night", () => {
    for (const file of TOKEN_FILES) {
      const blocks = tokenRules([file]).filter((r) => r.selector.includes("data-theme"));
      const keysOf = (...themes: ReturnType<typeof ruleTheme>[]) =>
        blocks
          .filter((r) => themes.includes(ruleTheme(r)))
          .flatMap((r) => Object.keys(r.declarations))
          .sort();
      expect(keysOf("day").length, file).toBeGreaterThan(0);
      expect(keysOf("dusk", "shared"), file).toEqual(keysOf("day"));
      expect(keysOf("night", "shared"), file).toEqual(keysOf("day"));
    }
  });

  it("keep Dusk and Night off paper, so printing always uses Day", () => {
    for (const rule of tokenRules()) {
      const theme = ruleTheme(rule);
      if (theme === "dusk" || theme === "night" || theme === "shared") {
        expect(rule.atRules, rule.selector).toEqual(["@media not print"]);
      }
    }
  });

  it("use the values in the spec's theme table (12.10.2)", () => {
    const section = spec.slice(spec.indexOf("#### 12.10.2"), spec.indexOf("#### 12.10.3"));
    // Decision 105: faint text was darkened in Day and lightened in Dusk by the smallest step
    // that clears 4.5:1 on every plain background (the spec measured it on --surface only).
    const adjusted: Record<string, Partial<Record<ThemeName, string>>> = {
      "--text-faint": { day: "#646d60", dusk: "#948874" },
    };
    const statusToken: Record<string, string> = {
      Learning: "learning",
      Strong: "strong",
      Fading: "fading",
    };
    let rows = 0;
    for (const line of section.split("\n")) {
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < 5 || !/^(`--|Learning|Strong|Fading)/.test(cells[1]!)) continue;
      rows++;
      THEMES.forEach((theme, i) => {
        const cell = cells[i + 2]!.replace(/`/g, "").toLowerCase();
        const name = cells[1]!.replace(/`/g, "").replace(/ \(new\)$/, "");
        const status = statusToken[name.split(" ")[0]!];
        if (status) {
          const [fill, stroke] = cell.split("/").map((c) => c.trim());
          expect(tokens[theme][`--status-${status}-fill`], `${theme} ${status} fill`).toBe(fill);
          expect(tokens[theme][`--status-${status}-stroke`], `${theme} ${status} stroke`).toBe(
            stroke,
          );
          return;
        }
        const expected = adjusted[name]?.[theme];
        if (expected) {
          expect(cell, `${name} in the spec`).toBe(expected);
          return;
        }
        expect(color(theme, name), `${theme} ${name}`).toEqual(parseColor(cell));
      });
    }
    expect(rows).toBe(15);
  });
});
