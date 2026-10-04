// Settings → ADHD mode (F32): the switch, each part with its own switch (and its options), the
// block and break lengths, the learned pace, the focus sound and Study with Claude (an
// experiment, hidden in copy prompt mode). Everything saves at once and syncs with the profile.
import { Play } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Slider, Switch } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { describePace, paceRatio } from "@/lib/adhd/pace";
import { ADHD_PART_INFO, ADHD_PARTS, adhdSettings } from "@/lib/adhd/prefs";
import { cleanWhen, START_LINE_MAX } from "@/lib/adhd/startLine";
import type { AdhdPart, FocusSound, PlanItem, Profile } from "@/lib/types";
import { setAdhd, setAdhdOn, setAdhdPart } from "@/stores/adhdStore";
import { useAIMode } from "@/stores/aiStore";
import { usePaceStore } from "@/stores/paceStore";
import { previewNoise, soundAvailable } from "../adhd/sound";
import { studyModeAllowed } from "../adhd/studyWithClaude";
import { SettingsRow, SettingsSection } from "./layout";

const KIND_LABEL: Record<PlanItem["kind"], string> = {
  resolve: "Re-solves",
  "new-problem": "New problems",
  "learn-concept": "Learning a concept",
  "review-concept": "Flashcard rounds",
  drill: "Pattern drills",
  "mental-math": "Mental math",
  mock: "Mock interviews",
  design: "Design practice",
  story: "Behavioral practice",
  revision: "Revision sheets",
  thought: "Parked thoughts",
};

const BLOCK_OPTIONS = [10, 15, 20, 25, 30];
const BREAK_OPTIONS = [3, 5, 10];
const SOUND_OPTIONS: { value: FocusSound; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "brown", label: "Brown" },
  { value: "pink", label: "Pink" },
  { value: "white", label: "White" },
];

function PaceList() {
  const stats = usePaceStore((s) => s.stats);
  const rows = Object.values(stats)
    .map((s) => ({ kind: s!.kind, ratio: paceRatio(s!.samples), count: s!.samples.length }))
    .filter((r) => r.ratio !== null)
    .sort((a, b) => b.count - a.count);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Your pace shows here once three items of a kind are timed. Start items from the Now card on
        Today to time them.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-rule rounded-control bg-surface-sunken px-3">
      {rows.map((r) => (
        <li key={r.kind} className="flex items-baseline justify-between gap-3 py-2 text-base">
          <span className="text-text">{KIND_LABEL[r.kind]}</span>
          <span className="text-right text-sm text-muted">
            {describePace(r.ratio!)} <span className="tabular-nums">(from {r.count})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function StartLineDefault({ value }: { value: string }) {
  const [text, setText] = useState(value);
  const save = () => {
    const clean = cleanWhen(text);
    setText(clean);
    setAdhd({ startWhen: clean || undefined });
  };
  return (
    <form
      className="flex max-w-lg items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Every day, when…" className="min-w-0 flex-1">
        <Input
          value={text}
          maxLength={START_LINE_MAX}
          placeholder="I finish dinner"
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
        />
      </Field>
      <Button type="submit" size="sm" className="mb-1">
        Save
      </Button>
    </form>
  );
}

/** Each part's own options, under its switch. */
function PartOptions({ part, profile }: { part: AdhdPart; profile: Profile }) {
  const adhd = adhdSettings(profile.prefs);
  const ids = useId();
  if (part === "time") {
    return (
      <div className="space-y-3">
        <Switch
          label="A soft chime at half time and 2 minutes left"
          checked={adhd.chime === true}
          onChange={(chime) => setAdhd({ chime })}
        />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text">Your pace</p>
          <PaceList />
        </div>
      </div>
    );
  }
  if (part === "rewards") {
    return (
      <Switch
        label="A small sound for each finished step"
        checked={adhd.rewardSound === true}
        onChange={(rewardSound) => setAdhd({ rewardSound })}
      />
    );
  }
  if (part === "breaks") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`${ids}-block`} className="sr-only">
          Focus block length in ADHD mode
        </label>
        <Select
          id={`${ids}-block`}
          value={String(adhd.blockMinutes)}
          onChange={(e) => setAdhd({ blockMinutes: Number(e.target.value) })}
          options={BLOCK_OPTIONS.map((m) => ({ value: String(m), label: `Focus ${m} min` }))}
          className="w-40"
        />
        <label htmlFor={`${ids}-break`} className="sr-only">
          Break length in ADHD mode
        </label>
        <Select
          id={`${ids}-break`}
          value={String(adhd.breakMinutes)}
          onChange={(e) => setAdhd({ breakMinutes: Number(e.target.value) })}
          options={BREAK_OPTIONS.map((m) => ({ value: String(m), label: `Break ${m} min` }))}
          className="w-40"
        />
      </div>
    );
  }
  if (part === "startHelp") return <StartLineDefault value={adhd.startWhen ?? ""} />;
  if (part === "reading") {
    return (
      <Switch
        label="Line focus"
        description="Dims the text outside the paragraph you're on (the one in the middle of the screen, or the one you tap)."
        checked={adhd.lineFocus === true}
        onChange={(lineFocus) => setAdhd({ lineFocus })}
      />
    );
  }
  return null;
}

export function AdhdSection({ profile }: { profile: Profile }) {
  const adhd = adhdSettings(profile.prefs);
  const { mode } = useAIMode();
  const canSound = soundAvailable();
  const sound = adhd.sound;
  return (
    <SettingsSection
      id="adhd"
      title="ADHD mode"
      description="Supports for starting, time and focus, shown where the work happens. It supports study habits; it doesn't treat ADHD. Each part can be turned off on its own."
    >
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="ADHD mode"
          description="Also at the right of the top bar on every page. Syncs with the rest of your data."
          checked={adhd.on}
          onChange={setAdhdOn}
        />
      </div>
      {!adhd.on && (
        <p className="px-4 py-3 text-sm text-muted sm:px-5">
          The parts below apply while ADHD mode is on. You can choose them now.
        </p>
      )}
      {ADHD_PARTS.map((part) => (
        <div key={part} className="space-y-3 px-4 py-4 sm:px-5">
          <Switch
            label={ADHD_PART_INFO[part].label}
            description={ADHD_PART_INFO[part].description}
            checked={adhd.parts[part]}
            onChange={(on) => setAdhdPart(part, on)}
          />
          {adhd.parts[part] && (
            <div className="pl-0 sm:pl-4">
              <PartOptions part={part} profile={profile} />
            </div>
          )}
        </div>
      ))}
      <SettingsRow
        label="Focus sound"
        stacked
        description="Brown, pink or white noise made in your browser, while a focus block runs. It stops when the block ends. Off by default: noise helps some people with ADHD a little and distracts others."
      >
        {canSound ? (
          <div className="space-y-4">
            <SegmentedControl<FocusSound>
              label="Focus sound"
              value={sound}
              onChange={(next) => setAdhd({ sound: next })}
              options={SOUND_OPTIONS}
            />
            <div className="flex max-w-md flex-wrap items-end gap-4">
              <Slider
                label="Volume"
                value={Math.round(adhd.volume * 100)}
                min={0}
                max={100}
                step={5}
                format={(v) => `${v}%`}
                onChange={(v) => setAdhd({ volume: v / 100 })}
                className="min-w-48 flex-1"
              />
              <Button
                size="sm"
                icon={Play}
                disabled={sound === "off"}
                onClick={() => {
                  if (sound !== "off") previewNoise(sound, adhd.volume);
                }}
              >
                Play a sample
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">This browser can't play sound made on the page.</p>
        )}
      </SettingsRow>
      {studyModeAllowed(mode) && (
        <div className="px-4 py-4 sm:px-5">
          <Switch
            label="Study with Claude (an experiment)"
            description="At the start of a focus block Claude names a first step in a sentence; at the end it asks how it went and replies briefly. Uses the quick model."
            checked={adhd.studyWithClaude}
            onChange={(studyWithClaude) => setAdhd({ studyWithClaude })}
          />
        </div>
      )}
    </SettingsSection>
  );
}
