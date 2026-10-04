// ADHD mode's styles (F32, session 9.4): the calm screen's text one step larger (interface 16 px,
// reading 19 px) through the --fs-* sizes; no red with the calm screen or gentle language (danger
// becomes the warning color, still readable in every theme); motion kept for feedback; and the
// pre-paint script in index.html that sets <html data-adhd> from its localStorage mirror before
// the first paint, agreeing with lib/adhd/prefs.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composite, contrast, parseColor, type Rgba } from "../../scripts/lib/color.mjs";
import { ADHD_PARTS, adhdAttribute, cleanAdhdAttribute } from "@/lib/adhd/prefs";
import { parseRules, themeTokens, type ThemeName } from "../styles/tokens";

const css = readFileSync(new URL("../../src/styles/adhd.css", import.meta.url), "utf8");
const rules = parseRules(css);
const indexCss = readFileSync(new URL("../../src/styles/index.css", import.meta.url), "utf8");
const index = parseRules(indexCss);
const tokens = themeTokens();
const THEMES: ThemeName[] = ["day", "dusk", "night"];

const ruleFor = (selector: string) => {
  const rule = rules.find((r) => r.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return rule;
};

describe("the calm screen's sizes", () => {
  it("are one step larger: interface 16 px, reading 19 px", () => {
    const base = index.find((r) => r.selector === ":root" && r.declarations["--fs-base"]);
    expect(base?.declarations).toMatchObject({
      "--fs-xs": "12px",
      "--fs-sm": "13px",
      "--fs-base": "14px",
      "--fs-md": "16px",
      "--fs-lg": "18px",
      "--fs-xl": "22px",
    });
    // Tailwind's text sizes read the --fs-* sizes, so every text-* class follows the calm screen.
    for (const size of ["xs", "sm", "base", "md", "lg", "xl"]) {
      expect(indexCss).toContain(`--text-${size}: var(--fs-${size});`);
    }

    expect(ruleFor(':root[data-adhd~="calm"]').declarations).toEqual({
      "--fs-xs": "13px",
      "--fs-sm": "14px",
      "--fs-base": "16px",
      "--fs-md": "17px",
      "--fs-lg": "19px",
      "--fs-xl": "23px",
    });
    expect(ruleFor(':root[data-adhd~="calm"] body').declarations["font-size"]).toBe("16px");
    expect(ruleFor(':root[data-adhd~="calm"] .atlas-prose').declarations["font-size"]).toBe("19px");
  });

  it("keep motion only as feedback: the map's ink moment and the thinking dots stay still", () => {
    expect(
      ruleFor(':root[data-adhd~="calm"] :is(.map-ink, .map-ink-line, .map-check)').declarations[
        "animation-duration"
      ],
    ).toBe("0.01ms !important");
    expect(ruleFor(':root[data-adhd~="calm"] .atlas-thinking > span').declarations.animation).toBe(
      "none",
    );
  });
});

describe("reduced motion", () => {
  it("stops ADHD mode's only animation, the new ink drop, like every other", () => {
    const reduce = index.find((r) => r.selector.startsWith(':root[data-motion="reduce"] *'));
    expect(reduce?.declarations["animation-duration"]).toBe("0.01ms !important");
    const system = index.find(
      (r) =>
        r.atRules.includes("@media (prefers-reduced-motion: reduce)") &&
        r.selector.startsWith(':root:not([data-motion="full"]) *'),
    );
    expect(system?.declarations["animation-duration"]).toBe("0.01ms !important");
    // The drop's animation is a plain declaration, so those !important rules win over it.
    const drop = ruleFor(".ink-drop-new path").declarations.animation!;
    expect(drop).toMatch(/^ink-drop 300ms/);
    expect(drop).not.toContain("!important");
    // Nothing else in ADHD mode's styles moves (the disc steps without animating).
    const moving = rules
      .filter((r) =>
        Object.keys(r.declarations).some((k) => k.startsWith("animation") || k === "transition"),
      )
      .map((r) => r.selector);
    expect(moving).toHaveLength(4);
    expect(moving).toContain(".ink-drop-new path");
    // The calm screen's rules stop motion; the line focus fades its opacity (150 ms).
    expect(moving).toContain(':root[data-adhd~="calm"] .atlas-thinking > span');
    expect(moving).toContain(':root[data-adhd~="calm"] :is(.map-ink, .map-ink-line, .map-check)');
    expect(moving.filter((m) => m.startsWith("[data-line-focus]"))).toHaveLength(1);
  });
});

describe("no red", () => {
  const noRed = ruleFor(':root[data-adhd~="calm"], :root[data-adhd~="gentle"]').declarations;

  it("turns danger into the warning color with the calm screen or gentle language", () => {
    expect(noRed).toEqual({
      "--danger": "var(--warning)",
      "--danger-hover": "color-mix(in srgb, var(--warning) 82%, var(--text))",
      "--danger-soft": "var(--warning-soft)",
      "--code-invalid": "var(--warning)",
    });
  });

  /** The no-red tokens of a theme, resolved the way the browser does. */
  function resolved(theme: ThemeName) {
    const t = tokens[theme];
    const color = (name: string) => parseColor(t[name]!);
    const warning = color("--warning");
    const text = color("--text");
    // color-mix in srgb mixes the encoded channels.
    const mix = (i: number) => warning[i]! * 0.82 + text[i]! * 0.18;
    const hover: Rgba = [mix(0), mix(1), mix(2), 1];
    return { color, warning, hover, soft: color("--warning-soft") };
  }

  it.each(THEMES)(
    "stays readable in %s: labels on filled buttons, text, tints and code",
    (theme) => {
      const { color, warning, hover, soft } = resolved(theme);
      const onDanger = color("--on-danger");
      for (const [name, fill] of [
        ["--danger", warning],
        ["--danger-hover", hover],
      ] as const) {
        const ratio = contrast(onDanger, fill);
        expect(
          ratio,
          `${theme} --on-danger on ${name}: ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const bg of ["--canvas", "--surface", "--surface-raised", "--surface-sunken"]) {
        const plain = color(bg);
        expect(contrast(warning, plain), `${theme} danger text on ${bg}`).toBeGreaterThanOrEqual(
          4.5,
        );
        const tint = composite(soft, plain);
        expect(contrast(warning, tint), `${theme} danger on its tint over ${bg}`).toBeGreaterThan(
          4.5,
        );
        expect(contrast(color("--text"), tint), `${theme} text on the tint`).toBeGreaterThan(7);
      }
      const code = color("--code-bg");
      expect(contrast(warning, code), `${theme} --code-invalid on --code-bg`).toBeGreaterThan(4.5);
    },
  );
});

describe("the pre-paint script in index.html", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const source = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";

  function run(stored: string | null, blocked = false): Record<string, string> {
    const attributes: Record<string, string> = {};
    const storage = {
      getItem(key: string) {
        if (blocked) throw new Error("blocked");
        return key === "atlas.adhd" ? stored : null;
      },
    };
    const win = { matchMedia: () => ({ matches: false }) };
    const doc = {
      documentElement: {
        setAttribute: (name: string, value: string) => (attributes[name] = value),
      },
    };
    new Function("window", "document", "localStorage", "Date", source)(win, doc, storage, Date);
    return attributes;
  }

  it("is found", () => {
    expect(source).toContain('localStorage.getItem("atlas.adhd")');
  });

  it("sets data-adhd from the mirror, keeping only the parts the app knows", () => {
    expect(run(null)["data-adhd"]).toBeUndefined();
    expect(run(null, true)["data-adhd"]).toBeUndefined();
    for (const raw of [
      ADHD_PARTS.join(" "),
      "calm",
      "calm nowCard",
      "nowCard  time\tgentle",
      "calm sepia reading",
      "",
      "bogus",
    ]) {
      expect(run(raw)["data-adhd"], raw).toBe(cleanAdhdAttribute(raw));
    }
    // The app writes what the script reads.
    const written = adhdAttribute({
      adhd: {
        on: true,
        blockMinutes: 15,
        breakMinutes: 5,
        sound: "off",
        volume: 0.5,
        studyWithClaude: false,
        rewards: false,
      },
    })!;
    expect(written).toBe("calm nowCard time place breaks startHelp reading gentle");
    expect(run(written)["data-adhd"]).toBe(written);
  });
});
