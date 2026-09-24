// Settings → Profile (F24): name, track, interview date, languages, daily time, balance and
// focus subjects. Every change saves at once (text fields after a short pause).
import { Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select, Slider, Switch } from "@/components/ui/Field";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { subjects } from "@/data/syllabus";
import type { PrimaryLanguage, Profile, Track } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";
import { SettingsRow, SettingsSection } from "./layout";

const LANGUAGES: { value: PrimaryLanguage; label: string }[] = [
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
];

const DAILY_PRESETS = [15, 30, 60, 90, 120];

const SUBJECT_OPTIONS = subjects.map((s) => ({
  value: s.id,
  label: s.name,
  keywords: s.shortName,
}));

/** Local text state that saves after the owner pauses typing. */
function useDebouncedField(value: string, save: (v: string) => void, delay = 500) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  // Follow changes from elsewhere (another device) unless the owner is typing.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (!dirty) setDraft(value);
  }
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      save(draft);
      setDirty(false);
    }, delay);
    return () => clearTimeout(t);
  }, [draft, dirty, delay, save]);
  return {
    value: draft,
    onChange: (v: string) => {
      setDraft(v);
      setDirty(true);
    },
    flush: () => {
      if (dirty) {
        save(draft);
        setDirty(false);
      }
    },
  };
}

export function ProfileSection({ profile }: { profile: Profile }) {
  const update = useProfileStore((s) => s.update);
  const updatePrefs = useProfileStore((s) => s.updatePrefs);
  const ids = useId();
  const saveName = useCallback((v: string) => update({ name: v.trim() }), [update]);
  const name = useDebouncedField(profile.name, saveName);
  const custom = !DAILY_PRESETS.includes(profile.dailyMinutes);
  const [customMode, setCustomMode] = useState(custom);
  const others = LANGUAGES.filter((l) => l.value !== profile.primaryLanguage);
  const suggestCpp =
    profile.track !== "sde" &&
    profile.primaryLanguage !== "cpp" &&
    !profile.prefs.extraLanguages.includes("cpp");

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      description="Shapes your plan, the map and the readiness score."
    >
      <SettingsRow
        label="Your name"
        htmlFor={`${ids}-name`}
        description="Used to greet you on Today."
      >
        <Input
          id={`${ids}-name`}
          value={name.value}
          onChange={(e) => name.onChange(e.target.value)}
          onBlur={name.flush}
          autoComplete="given-name"
          maxLength={60}
          className="md:w-72"
        />
      </SettingsRow>
      <SettingsRow
        label="Target track"
        description="Filters the map and weights the readiness score."
      >
        <SegmentedControl<Track>
          label="Target track"
          value={profile.track}
          onChange={(track) => update({ track })}
          options={[
            { value: "sde", label: "SDE" },
            { value: "quant", label: "Quant" },
            { value: "both", label: "Both" },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label="Interview date"
        htmlFor={`${ids}-date`}
        description="Atlas counts down to it and shifts toward revision in the last two weeks."
      >
        <div className="flex items-center gap-2">
          <Input
            id={`${ids}-date`}
            type="date"
            value={profile.interviewDate ?? ""}
            onChange={(e) => update({ interviewDate: e.target.value || undefined })}
            className="md:w-48"
          />
          {profile.interviewDate && (
            <IconButton
              icon={X}
              label="Clear the interview date"
              onClick={() => update({ interviewDate: undefined })}
            />
          )}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Main language"
        htmlFor={`${ids}-lang`}
        description="The editor starts in it, and its language topics count toward readiness."
      >
        <Select
          id={`${ids}-lang`}
          value={profile.primaryLanguage}
          onChange={(e) => {
            const primaryLanguage = e.target.value as PrimaryLanguage;
            update({
              primaryLanguage,
              prefs: {
                ...profile.prefs,
                extraLanguages: profile.prefs.extraLanguages.filter((l) => l !== primaryLanguage),
              },
            });
          }}
          options={LANGUAGES}
          className="md:w-48"
        />
      </SettingsRow>
      <SettingsRow
        label="Also count"
        description={
          suggestCpp
            ? "Many trading firms use C++, so it's worth counting even if you code in another language."
            : "Language topics for other languages stay on the map, dimmed, unless you count them."
        }
      >
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {others.map((l) => {
            const checked = profile.prefs.extraLanguages.includes(l.value);
            return (
              <label
                key={l.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-base text-text md:min-h-0"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    updatePrefs({
                      extraLanguages: checked
                        ? profile.prefs.extraLanguages.filter((x) => x !== l.value)
                        : [...profile.prefs.extraLanguages, l.value],
                    })
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                {l.label}
              </label>
            );
          })}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Daily time"
        htmlFor={`${ids}-daily`}
        description="The size of your daily plan."
      >
        <div className="flex items-center gap-2">
          <Select
            id={`${ids}-daily`}
            value={customMode ? "custom" : String(profile.dailyMinutes)}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setCustomMode(true);
                return;
              }
              setCustomMode(false);
              update({ dailyMinutes: Number(e.target.value) });
            }}
            options={[
              ...DAILY_PRESETS.map((m) => ({ value: String(m), label: `${m} minutes` })),
              { value: "custom", label: "Custom" },
            ]}
            className="md:w-40"
          />
          {customMode && (
            <Input
              type="number"
              min={10}
              max={600}
              step={5}
              aria-label="Minutes per day"
              value={profile.dailyMinutes}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value));
                if (Number.isFinite(v) && v >= 10 && v <= 600) update({ dailyMinutes: v });
              }}
              className="w-24"
            />
          )}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Problems and theory"
        description="How new learning time is split in your plan."
        stacked
      >
        <Slider
          label="Share of time for problems"
          value={profile.balance.problems}
          min={0}
          max={100}
          step={10}
          onChange={(problems) => update({ balance: { problems, theory: 100 - problems } })}
          format={(v) => `${v}% problems, ${100 - v}% theory`}
          className="max-w-md"
        />
      </SettingsRow>
      <SettingsRow
        label="Focus subjects"
        description="Up to three subjects to favor this week. Leave empty for a balanced plan."
        stacked
      >
        <MultiCombobox
          label="Focus subjects"
          hideLabel
          options={SUBJECT_OPTIONS}
          value={profile.focusSubjects}
          onChange={(focusSubjects) => update({ focusSubjects })}
          max={3}
          placeholder="Search subjects"
          className="max-w-xl"
        />
      </SettingsRow>
      <SettingsRow
        label="Welcome questions"
        description="Answer the first-run questions again, including what you already know. Your answers there update the map."
      >
        <Button href="#/welcome" icon={Sparkles}>
          Run the welcome again
        </Button>
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="Hide premium problems"
          description="Leave out LeetCode problems that need a subscription."
          checked={profile.hidePremium}
          onChange={(hidePremium) => update({ hidePremium })}
        />
      </div>
    </SettingsSection>
  );
}
