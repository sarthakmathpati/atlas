// The disc on timed screens (F32 "time you can see"): the workspace, drill prompts, flashcards,
// mock and design rounds, sprints and story practice show it in ADHD mode beside their own
// clock. It sounds the optional soft chime at half time and at 2 minutes left, once each.
import { DiscTimer } from "@/components/ui/DiscTimer";
import { useAdhdPart } from "@/stores/adhdStore";
import { useTimeCues } from "./hooks";

interface TimeDiscProps {
  elapsedMs: number;
  totalMs: number;
  running: boolean;
  /** What the time is for, for screen readers. */
  label: string;
  /** Changes when the clock is a new one (a new prompt), so cues start over. */
  cueKey: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/** The disc, shown only with ADHD mode's "time you can see" on. */
export function TimeDisc({ cueKey, ...props }: TimeDiscProps) {
  const on = useAdhdPart("time");
  useTimeCues(props.elapsedMs, props.totalMs, props.running, cueKey);
  if (!on || props.totalMs <= 0) return null;
  return <DiscTimer {...props} />;
}
