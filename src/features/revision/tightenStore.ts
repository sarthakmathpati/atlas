// Tightened revision sheets (F19 "Tighten with Claude"), kept for the visit per sheet and day, so
// switching tabs or leaving the page doesn't lose them. The original is always rebuilt from data.
import { create } from "zustand";
import type { AIMode } from "@/lib/types";

export interface TightenedSheet {
  markdown: string;
  /** The word target Claude was given. */
  target: number;
  /** Section headings that didn't fit in what Claude can read at once (left unchanged). */
  left: string[];
  mode: AIMode;
  createdAt: string;
}

export const useTightenStore = create<{ sheets: Record<string, TightenedSheet> }>(() => ({
  sheets: {},
}));

export function keepTightened(key: string, sheet: TightenedSheet): void {
  useTightenStore.setState((s) => ({ sheets: { ...s.sheets, [key]: sheet } }));
}
