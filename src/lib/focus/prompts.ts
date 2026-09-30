// Break prompts (F31): one idea per break, in turn: rest the eyes, move, drink water.
import { hashSeed } from "@/lib/random";

export const BREAK_PROMPTS: readonly string[] = [
  "Look at something far away for 20 seconds.",
  "Stand up and stretch your arms overhead.",
  "Drink a glass of water.",
  "Look out of a window, or at the far wall, and let your eyes relax.",
  "Roll your shoulders back five times, then let them drop.",
  "Fill your water bottle.",
  "Close your eyes for a few slow breaths.",
  "Walk to another room and back.",
];

/** The prompt for a break: the next one after each block of the day, from a daily start. */
export function breakPrompt(date: string, blocksToday: number): string {
  const start = hashSeed(`break:${date}`) % BREAK_PROMPTS.length;
  return BREAK_PROMPTS[(start + blocksToday) % BREAK_PROMPTS.length]!;
}
