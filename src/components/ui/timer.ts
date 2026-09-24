// Timer logic (section 12.7): a stopwatch or countdown measured from timestamps, never by counting
// ticks, so it stays right when the tab sleeps.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "./hooks";

export interface TimerControls {
  running: boolean;
  elapsedMs: number;
  /** Countdown only: time left (never below zero). */
  remainingMs: number | null;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  /** Stops the timer and puts `ms` on the clock. */
  set: (ms: number) => void;
}

interface UseTimerOptions {
  /** Makes it a countdown of this length. */
  countdownMs?: number;
  onFinish?: () => void;
  /** Time already on the clock (for example restored from a saved draft). */
  initialMs?: number;
}

export function useTimer({
  countdownMs,
  onFinish,
  initialMs = 0,
}: UseTimerOptions = {}): TimerControls {
  const [running, setRunning] = useState(false);
  const [accumulated, setAccumulated] = useState(initialMs);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const finish = useLatest(onFinish);
  const finished = useRef(false);

  const elapsedMs =
    accumulated + (running && startedAt !== null ? Math.max(0, now - startedAt) : 0);
  const remainingMs = countdownMs === undefined ? null : Math.max(0, countdownMs - elapsedMs);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remainingMs === 0 && running && !finished.current) {
      finished.current = true;
      setRunning(false);
      setAccumulated(countdownMs ?? 0);
      setStartedAt(null);
      finish.current?.();
    }
  }, [remainingMs, running, countdownMs, finish]);

  const start = useCallback(() => {
    if (running) return;
    finished.current = false;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setRunning(true);
  }, [running]);

  const pause = useCallback(() => {
    if (!running || startedAt === null) return;
    setAccumulated((a) => a + Math.max(0, Date.now() - startedAt));
    setStartedAt(null);
    setRunning(false);
  }, [running, startedAt]);

  const reset = useCallback(() => {
    finished.current = false;
    setAccumulated(0);
    setStartedAt(running ? Date.now() : null);
    setNow(Date.now());
  }, [running]);

  const toggle = useCallback(() => (running ? pause() : start()), [running, pause, start]);

  const set = useCallback((ms: number) => {
    finished.current = false;
    setRunning(false);
    setStartedAt(null);
    setAccumulated(Math.max(0, ms));
    setNow(Date.now());
  }, []);

  return { running, elapsedMs, remainingMs, start, pause, toggle, reset, set };
}

/** 754_000 → "12:34"; an hour or more → "1:02:34". */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
