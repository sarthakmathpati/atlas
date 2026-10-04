// The disc in a flashcard session (F32 "time you can see"): the round's time, from its first
// card, against about 40 seconds a card.
import { useState } from "react";
import { flashcardMinutes } from "@/lib/adhd/time";
import { useAdhdPart } from "@/stores/adhdStore";
import { useTicker } from "../focus/hooks";
import { TimeDisc } from "./TimeDisc";

export function FlashcardDisc({ cards, running }: { cards: number; running: boolean }) {
  const on = useAdhdPart("time");
  const [startedAt] = useState(() => Date.now());
  const now = useTicker(5_000, on && running);
  if (!on) return null;
  const minutes = flashcardMinutes(cards);
  return (
    <TimeDisc
      elapsedMs={Math.max(0, now - startedAt)}
      totalMs={minutes * 60_000}
      running={running}
      label={`Time for this round, about ${minutes} minutes`}
      cueKey={`cards:${startedAt}`}
      size="sm"
      showText={false}
    />
  );
}
