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
