// Themes (BUILD_SPEC.md 12.10.2): the choice resolves to Day, Dusk or Night; By time of day
// switches at three local start times; and the pre-paint script in index.html picks exactly the
// theme the app would, so there is never a flash of the wrong one.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import {
  nextThemeSwitch,
  normalizeSchedule,
  normalizeThemeChoice,
  resolveTheme,
  scheduledTheme,
  type ThemeName,
} from "@/lib/theme";
import type { ThemeChoice, ThemeSchedule } from "@/lib/types";

const at = (hhmm: string, day = 27) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 8, day, h, m, 30);
};

describe("theme choice", () => {
  it("reads the values from before Phase 9 and falls back to System", () => {
    expect(normalizeThemeChoice("light")).toBe("day");
    expect(normalizeThemeChoice("dark")).toBe("night");
    for (const c of ["system", "day", "dusk", "night", "schedule"]) {
      expect(normalizeThemeChoice(c)).toBe(c);
    }
    expect(normalizeThemeChoice("sepia")).toBe("system");
    expect(normalizeThemeChoice(null)).toBe("system");
  });

  it("resolves System from the device and fixed choices as themselves", () => {
    const ctx = { schedule: DEFAULT_THEME_SCHEDULE, now: at("12:00") };
    expect(resolveTheme("system", { ...ctx, prefersDark: false })).toBe("day");
    expect(resolveTheme("system", { ...ctx, prefersDark: true })).toBe("night");
    expect(resolveTheme("dusk", { ...ctx, prefersDark: false })).toBe("dusk");
    expect(resolveTheme("day", { ...ctx, prefersDark: true })).toBe("day");
  });
});

describe("by time of day", () => {
  it("shows the theme that started most recently, carrying over midnight", () => {
    const s = DEFAULT_THEME_SCHEDULE;
    const cases: [string, ThemeName][] = [
      ["00:00", "night"],
      ["06:29", "night"],
      ["06:30", "day"],
      ["12:00", "day"],
      ["18:59", "day"],
      ["19:00", "dusk"],
      ["22:29", "dusk"],
      ["22:30", "night"],
      ["23:59", "night"],
    ];
    for (const [time, theme] of cases) expect(scheduledTheme(s, at(time)), time).toBe(theme);
  });

  it("works with any order of start times, such as night starting after midnight", () => {
    const late: ThemeSchedule = { day: "07:00", dusk: "20:00", night: "00:30" };
    expect(scheduledTheme(late, at("00:10"))).toBe("dusk");
    expect(scheduledTheme(late, at("00:30"))).toBe("night");
    expect(scheduledTheme(late, at("06:59"))).toBe("night");
    expect(scheduledTheme(late, at("07:00"))).toBe("day");
  });

  it("replaces a missing or broken start time with its default", () => {
    expect(normalizeSchedule({ day: "7:00", dusk: "25:00" })).toEqual(DEFAULT_THEME_SCHEDULE);
    expect(normalizeSchedule({ day: "05:45" })).toEqual({ ...DEFAULT_THEME_SCHEDULE, day: "05:45" });
  });

  it("knows when it switches next, today or tomorrow", () => {
    const s = DEFAULT_THEME_SCHEDULE;
    expect(nextThemeSwitch(s, at("12:00"))).toEqual(new Date(2026, 8, 27, 19, 0));
    expect(nextThemeSwitch(s, at("19:00"))).toEqual(new Date(2026, 8, 27, 22, 30));
    expect(nextThemeSwitch(s, at("23:10"))).toEqual(new Date(2026, 8, 28, 6, 30));
    expect(nextThemeSwitch(s, new Date(2026, 8, 30, 23, 10))).toEqual(new Date(2026, 9, 1, 6, 30));
  });
});

describe("the pre-paint script in index.html", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const source = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";

  function runScript(options: {
    stored: Record<string, string>;
    prefersDark: boolean;
    now: Date;
    blocked?: boolean;
  }): string | null {
    let applied: string | null = null;
    const storage = {
      getItem(key: string) {
        if (options.blocked) throw new Error("blocked");
        return options.stored[key] ?? null;
      },
    };
    const RealDate = Date;
    const FixedDate = class extends RealDate {
      constructor() {
        super(options.now.getTime());
      }
    };
    const win = { matchMedia: () => ({ matches: options.prefersDark }) };
    const doc = { documentElement: { setAttribute: (_: string, v: string) => (applied = v) } };
    new Function("window", "document", "localStorage", "Date", source)(win, doc, storage, FixedDate);
    return applied;
  }

  it("is found", () => {
    expect(source).toContain("atlas.theme");
  });

  it("agrees with the app for every choice, schedule, time and device setting", () => {
    const schedules: (ThemeSchedule | null | string)[] = [
      null,
      DEFAULT_THEME_SCHEDULE,
      { day: "07:00", dusk: "20:00", night: "00:30" },
      { day: "05:15", dusk: "05:15", night: "23:00" },
      "not json",
    ];
    const choices = ["system", "day", "dusk", "night", "schedule", "light", "dark", "sepia"];
    const times = ["00:00", "00:29", "00:30", "05:15", "06:29", "06:30", "12:00", "19:00", "22:30", "23:59"];
    let checked = 0;
    for (const choice of choices) {
      for (const schedule of schedules) {
        for (const time of times) {
          for (const prefersDark of [false, true]) {
            const stored: Record<string, string> = { "atlas.theme": choice };
            if (schedule !== null)
              stored["atlas.themeSchedule"] =
                typeof schedule === "string" ? schedule : JSON.stringify(schedule);
            const now = at(time);
            const parsed =
              typeof schedule === "object" && schedule !== null ? schedule : null;
            const expected = resolveTheme(normalizeThemeChoice(choice) as ThemeChoice, {
              schedule: normalizeSchedule(parsed),
              now,
              prefersDark,
            });
            const label = `${choice} ${JSON.stringify(schedule)} ${time} dark=${prefersDark}`;
            expect(runScript({ stored, prefersDark, now }), label).toBe(expected);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(800);
  });

  it("uses the device's theme when storage is blocked", () => {
    const now = at("12:00");
    expect(runScript({ stored: {}, prefersDark: true, now, blocked: true })).toBe("night");
    expect(runScript({ stored: {}, prefersDark: false, now, blocked: true })).toBe("day");
  });
});
