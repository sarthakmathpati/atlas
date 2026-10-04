// ADHD mode's layer (F32), mounted once in the shell. It puts the parts that are on into
// <html data-adhd> (mirrored to localStorage so the pre-paint script shows the calm screen from
// the first paint), brings back the Now card's clock after a reload, keeps the place for "Where
// you left off", watches for the 90-minute check-in, ticks a flashcard round's steps as its
// concepts are checked, plays the focus sound while a block runs, gives Claude's word at a
// block's start (Study with Claude), and hosts the small notes that float under the top bar.
import { Coffee, Hourglass, Sparkles, Sunrise } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { navigate } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { adhdAttribute, adhdSettings } from "@/lib/adhd/prefs";
import { clockInText, clockLabel, startReminderDue, startWhenFor } from "@/lib/adhd/startLine";
import { currentStep, ticksOf } from "@/lib/adhd/steps";
import { localDate } from "@/lib/time";
import { useAdhd } from "@/stores/adhdStore";
import { notNow, takeBreakNow, useCheckInStore, watchCheckIn } from "@/stores/checkInStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { blockRunning, focusDurations, useFocusTimerStore } from "@/stores/focusTimerStore";
import {
  itemSteps,
  keepGoing,
  onInk,
  restoreNowClock,
  stopHere,
  tickCheckedCards,
  useNowStore,
} from "@/stores/nowStore";
import { setPlaceDetail, watchPlace } from "@/stores/placeStore";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { ClaudeTag } from "../ai/parts";
import { useTicker } from "../focus/hooks";
import { AdhdIntro } from "./AdhdIntro";
import { FloatingNotes, Note } from "./FloatingNotes";
import { playInk, setKeepPlaying, startNoise, stopNoise } from "./sound";
import { dismissStudy, useStudyStore, watchStudy } from "./studyWithClaude";

const ATTRIBUTE_KEY = "atlas.adhd";

/** <html data-adhd> and its localStorage mirror for the pre-paint script. */
function useAdhdAttribute(): void {
  const adhd = useProfileStore((s) => s.profile?.prefs.adhd);
  const loaded = useProfileStore((s) => s.profile !== null);
  const value = adhdAttribute({ adhd });
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    if (value === null) root.removeAttribute("data-adhd");
    else root.setAttribute("data-adhd", value);
    try {
      if (value === null) localStorage.removeItem(ATTRIBUTE_KEY);
      else localStorage.setItem(ATTRIBUTE_KEY, value);
    } catch {
      /* the pre-paint mirror is only a convenience */
    }
  }, [value, loaded]);
}

/** The plan item being worked on: the Now clock's item, else the first not done today. */
function currentItem(today: string) {
  const plan = usePlanStore.getState().plans[today];
  if (!plan) return undefined;
  const clock = useNowStore.getState().clock;
  const byClock =
    clock && clock.date === today ? plan.items.find((i) => i.id === clock.itemId) : undefined;
  return byClock ?? plan.items.find((i) => !i.done && !i.skipped);
}

/** The watchers, started once the profile has loaded. */
function useWatchers(): void {
  const loaded = useProfileStore((s) => s.profile !== null);
  const adhd = useAdhd();
  const placeOn = adhd.on && adhd.parts.place;
  const restored = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    if (!restored.current) {
      restored.current = true;
      restoreNowClock();
    }
    watchCheckIn();
    watchStudy();
    // A flashcard round's steps tick as its concepts get their checks.
    const unsubscribe = useConceptStateStore.subscribe((s, prev) => {
      if (s.checks !== prev.checks) tickCheckedCards();
    });
    setPlaceDetail(() => {
      const item = currentItem(localDate());
      if (!item) return undefined;
      const steps = itemSteps(item);
      const index = currentStep(ticksOf(item, steps.length));
      return {
        item: item.title,
        step:
          index >= 0 && steps.length > 0
            ? { index, count: steps.length, text: steps[index]! }
            : undefined,
      };
    });
    return () => {
      unsubscribe();
      setPlaceDetail(null);
    };
  }, [loaded]);

  // The place is kept only while that part is on.
  useEffect(() => {
    if (!placeOn) return;
    return watchPlace();
  }, [placeOn]);

  // The small sound for a finished step, when chosen.
  const rewardSound = adhd.on && adhd.parts.rewards && adhd.rewardSound === true;
  const volume = adhd.volume;
  useEffect(() => {
    onInk(rewardSound ? () => playInk(volume) : null);
    return () => onInk(null);
  }, [rewardSound, volume]);
}

/** The focus sound plays while a block runs (not while paused, never on a break). */
function useFocusSound(): void {
  const running = useFocusTimerStore((s) => blockRunning(s));
  const adhd = useAdhd();
  const color = adhd.on && adhd.sound !== "off" ? adhd.sound : null;
  const volume = adhd.volume;
  useEffect(() => {
    if (running && color) {
      setKeepPlaying(true);
      startNoise(color, volume);
      return;
    }
    setKeepPlaying(false);
    stopNoise();
  }, [running, color, volume]);
  useEffect(() => () => stopNoise(), []);
}

function TwoMinuteNote() {
  const asking = useNowStore((s) => s.clock?.trial === "ask");
  if (!asking) return null;
  return (
    <Note
      label="Two minutes done"
      title="Two minutes done"
      icon={Hourglass}
      actions={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              stopHere();
              toast("Stopped after two minutes. Starting is the hard part, and you did it.");
            }}
          >
            Stop here
          </Button>
          <Button size="sm" variant="primary" onClick={keepGoing}>
            Keep going
          </Button>
        </>
      }
    >
      Keep going, or stop here? Both are fine.
    </Note>
  );
}

function CheckInNote() {
  const due = useCheckInStore((s) => s.due);
  const breakMinutes = useProfileStore((s) =>
    Math.round(focusDurations(s.profile?.prefs).break / 60_000),
  );
  if (!due) return null;
  return (
    <Note
      label="Time for water and a stretch?"
      title="Time for water and a stretch?"
      icon={Coffee}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={notNow}>
            Not now
          </Button>
          <Button size="sm" variant="primary" onClick={() => takeBreakNow()}>
            Take {breakMinutes}
          </Button>
        </>
      }
    >
      You've been at it for 90 minutes without a break. A few minutes away helps the next stretch.
    </Note>
  );
}

const START_SHOWN_KEY = "atlas.startLineShown";

function shownToday(today: string): boolean {
  try {
    return localStorage.getItem(START_SHOWN_KEY) === today;
  } catch {
    return false;
  }
}

/** The if-then line's reminder at the clock time it names (while the app is open). */
function StartLineNote() {
  const adhd = useAdhd();
  const on = adhd.on && adhd.parts.startHelp;
  const now = useTicker(30_000, on);
  const today = localDate(new Date(now));
  const when = startWhenFor(adhd, today);
  const plan = usePlanStore((s) => s.plans[today]);
  const next = plan?.items.find((i) => !i.done && !i.skipped);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const due =
    on &&
    next !== undefined &&
    closedFor !== today &&
    !shownToday(today) &&
    startReminderDue(when, new Date(now));
  if (!due) return null;
  const minute = clockInText(when)!;
  const close = () => {
    try {
      localStorage.setItem(START_SHOWN_KEY, today);
    } catch {
      /* the reminder may show again after a reload */
    }
    setClosedFor(today);
  };
  return (
    <Note
      label="Time to start"
      title={`It's ${clockLabel(minute)}`}
      icon={Sunrise}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            Not now
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              close();
              navigate("/today");
            }}
          >
            Go to the first stop
          </Button>
        </>
      }
    >
      Your plan: when {when}, start the first stop. It's {next.title}.
    </Note>
  );
}

/** Claude's word at a block's start (Study with Claude). */
function StudyStartNote() {
  const reply = useStudyStore((s) => s.start);
  if (!reply) return null;
  return (
    <Note
      label="A word from Claude"
      title={
        <span className="flex items-center gap-2">
          A word as you start <ClaudeTag />
        </span>
      }
      icon={Sparkles}
      actions={
        <Button size="sm" variant="ghost" onClick={() => dismissStudy("start")}>
          Close
        </Button>
      }
    >
      {reply.status === "failed" ? (
        <span>{reply.message}</span>
      ) : reply.text ? (
        <span className="text-text">{reply.text}</span>
      ) : (
        <span role="status">Thinking…</span>
      )}
    </Note>
  );
}

/** Claude's reply after a block, when there's no break view to show it in. */
function StudyEndNote() {
  const reply = useStudyStore((s) => s.end);
  const breakOpen = useFocusTimerStore((s) => s.breakOpen);
  if (!reply || breakOpen) return null;
  return (
    <Note
      label="Claude after your block"
      title={
        <span className="flex items-center gap-2">
          After your block <ClaudeTag />
        </span>
      }
      icon={Sparkles}
      actions={
        <Button size="sm" variant="ghost" onClick={() => dismissStudy("end")}>
          Close
        </Button>
      }
    >
      {reply.status === "failed" ? (
        <span>{reply.message}</span>
      ) : reply.text ? (
        <span className="text-text">{reply.text}</span>
      ) : (
        <span role="status">Thinking…</span>
      )}
    </Note>
  );
}

function Notes() {
  const asking = useNowStore((s) => s.clock?.trial === "ask");
  const due = useCheckInStore((s) => s.due);
  const study = useStudyStore((s) => s.start !== null);
  const count = (asking ? 1 : 0) + (due ? 1 : 0) + (study ? 1 : 0) + 1;
  return (
    <FloatingNotes count={count}>
      <TwoMinuteNote />
      <CheckInNote />
      <StartLineNote />
      <StudyStartNote />
      <StudyEndNote />
    </FloatingNotes>
  );
}

export function AdhdLayer() {
  useAdhdAttribute();
  useWatchers();
  useFocusSound();
  const on = useProfileStore((s) => adhdSettings(s.profile?.prefs).on);
  const asking = useNowStore((s) => s.clock?.trial === "ask");
  // Notes only matter in ADHD mode (and while a 2-minute start is still asking).
  const show = on || asking;
  return (
    <>
      <AdhdIntro />
      {show && <Notes />}
    </>
  );
}
