// @vitest-environment jsdom
// While the app is open the theme keeps itself right (12.10.2): By time of day switches at the
// set times, System follows the device, and a sleeping laptop catches up when the tab returns.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeController } from "@/app/theme";
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import type { ThemeChoice, ThemeSchedule } from "@/lib/types";

const shown = () => document.documentElement.dataset.theme;

function mockDevice(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn((q: string) =>
    q.includes("prefers-color-scheme") ? query : { matches: false },
  ) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      query.matches = next;
      listeners.forEach((fn) => fn());
    },
    listeners,
  };
}

describe("theme controller", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("switches at the set times while the app is open", () => {
    vi.setSystemTime(new Date(2026, 8, 27, 18, 59, 50));
    mockDevice(false);
    renderHook(() => useThemeController("schedule", DEFAULT_THEME_SCHEDULE));
    expect(shown()).toBe("day");
    act(() => vi.advanceTimersByTime(15_000));
    expect(shown()).toBe("dusk");
    act(() => vi.advanceTimersByTime(3.5 * 60 * 60_000));
    expect(shown()).toBe("night");
    act(() => vi.advanceTimersByTime(8 * 60 * 60_000));
    expect(shown()).toBe("day");
    expect(localStorage.getItem("atlas.theme")).toBe("schedule");
    expect(JSON.parse(localStorage.getItem("atlas.themeSchedule")!)).toEqual(DEFAULT_THEME_SCHEDULE);
  });

  it("catches up when the tab comes back after the laptop slept", () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0));
    mockDevice(false);
    renderHook(() => useThemeController("schedule", DEFAULT_THEME_SCHEDULE));
    expect(shown()).toBe("day");
    // The clock jumps without timers firing, as when a laptop sleeps.
    vi.setSystemTime(new Date(2026, 8, 27, 23, 0));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(shown()).toBe("night");
  });

  it("uses new start times as soon as they change", () => {
    vi.setSystemTime(new Date(2026, 8, 27, 18, 30));
    mockDevice(false);
    const { rerender } = renderHook(
      ({ schedule }: { schedule: ThemeSchedule }) => useThemeController("schedule", schedule),
      { initialProps: { schedule: DEFAULT_THEME_SCHEDULE as ThemeSchedule } },
    );
    expect(shown()).toBe("day");
    rerender({ schedule: { ...DEFAULT_THEME_SCHEDULE, dusk: "18:15" } });
    expect(shown()).toBe("dusk");
  });

  it("follows the device for System, and stops following for a fixed choice", () => {
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0));
    const device = mockDevice(false);
    const { rerender } = renderHook(
      ({ choice }: { choice: ThemeChoice }) => useThemeController(choice, DEFAULT_THEME_SCHEDULE),
      { initialProps: { choice: "system" as ThemeChoice } },
    );
    expect(shown()).toBe("day");
    act(() => device.set(true));
    expect(shown()).toBe("night");
    rerender({ choice: "dusk" });
    expect(shown()).toBe("dusk");
    expect(device.listeners.size).toBe(0);
    act(() => device.set(false));
    expect(shown()).toBe("dusk");
  });
});
