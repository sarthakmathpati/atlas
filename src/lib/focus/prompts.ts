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

/** Movement ideas: ADHD mode adds one to every break (F32, part 6). */
export const MOVEMENT_PROMPTS: readonly string[] = [
  "Stand up and stretch your arms overhead.",
  "Roll your shoulders back five times, then let them drop.",
  "Walk to another room and back.",
  "Do ten slow squats, or march on the spot for a minute.",
  "Shake out your hands and arms for a few seconds.",
  "Stand on one foot, then the other, for twenty seconds each.",
];

/** A movement idea for a break, different from the break's own idea when that is one too. */
export function movementPrompt(date: string, blocksToday: number, avoid?: string): string {
  const start = hashSeed(`move:${date}`) % MOVEMENT_PROMPTS.length;
  for (let k = 0; k < MOVEMENT_PROMPTS.length; k++) {
    const idea = MOVEMENT_PROMPTS[(start + blocksToday + k) % MOVEMENT_PROMPTS.length]!;
    if (idea !== avoid) return idea;
  }
  return MOVEMENT_PROMPTS[0]!;
}

/** True when an idea is about moving (the break then needs no second one). */
export function isMovement(idea: string): boolean {
  return MOVEMENT_PROMPTS.includes(idea);
}
