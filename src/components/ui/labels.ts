// Plain-language labels shared by chips, glyphs, lists and the palette.
import type { Difficulty, Importance, Status } from "@/lib/types";

export const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  learning: "Learning",
  strong: "Strong",
  fading: "Fading",
};

export const STATUS_ORDER: Status[] = ["not_started", "learning", "strong", "fading"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  must: "Must-know",
  important: "Important",
  advanced: "Advanced",
};

/**
 * Pencil and ink (12.10.7): in lists and near-zoom map labels, concepts not started are written
 * in pencil (the faint text color), learning and fading ones in ink, and strong ones in bold ink.
 * The status glyph beside the name still carries the status; this only sets the name's tone.
 */
export const INK_CLASS: Record<Status, string> = {
  not_started: "text-faint",
  learning: "text-text",
  fading: "text-text",
  strong: "text-text font-semibold",
};
