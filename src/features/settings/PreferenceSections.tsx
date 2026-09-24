// Settings → Appearance and Learning (F24).
import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { setTheme, type ThemeChoice } from "@/app/theme";
import { Select, Switch } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Profile } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";
import { SettingsRow, SettingsSection } from "./layout";

export function AppearanceSection({ profile }: { profile: Profile }) {
  const updatePrefs = useProfileStore((s) => s.updatePrefs);
  return (
    <SettingsSection id="appearance" title="Appearance">
      <SettingsRow label="Theme" description="Match your system, or always use light or dark.">
        <SegmentedControl<ThemeChoice>
          label="Theme"
          value={profile.theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "System", icon: Monitor },
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label="Reduce motion"
        description="Panels and the map change instantly instead of animating."
      >
        <SegmentedControl<Profile["prefs"]["reducedMotion"]>
          label="Reduce motion"
          value={profile.prefs.reducedMotion}
          onChange={(reducedMotion) => updatePrefs({ reducedMotion })}
          options={[
            { value: "system", label: "Match system" },
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
      </SettingsRow>
      <SettingsRow
        label="Map labels"
        description="How many concept names show on the map when it's crowded."
      >
        <SegmentedControl<Profile["prefs"]["labelDensity"]>
          label="Map labels"
          value={profile.prefs.labelDensity}
          onChange={(labelDensity) => updatePrefs({ labelDensity })}
          options={[
            { value: "low", label: "Fewer" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "More" },
          ]}
        />
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="Show advanced concepts"
          description="Optional, deeper concepts. You can also switch this on the map."
          checked={profile.prefs.showAdvanced}
          onChange={(showAdvanced) => updatePrefs({ showAdvanced })}
        />
      </div>
    </SettingsSection>
  );
}

const FOCUS_OPTIONS = [15, 20, 25, 30, 45, 50, 60];
const BREAK_OPTIONS = [3, 5, 10, 15];

export function LearningSection({ profile }: { profile: Profile }) {
  const update = useProfileStore((s) => s.update);
  const updatePrefs = useProfileStore((s) => s.updatePrefs);
  const ids = useId();
  return (
    <SettingsSection id="learning" title="Learning">
      <SettingsRow
        label="Review intensity"
        description="Gentle spaces reviews a quarter further apart; intense brings them a fifth closer."
      >
        <SegmentedControl<Profile["reviewIntensity"]>
          label="Review intensity"
          value={profile.reviewIntensity}
          onChange={(reviewIntensity) => update({ reviewIntensity })}
          options={[
            { value: "gentle", label: "Gentle" },
            { value: "normal", label: "Normal" },
            { value: "intense", label: "Intense" },
          ]}
        />
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="Streak freeze"
          description="One missed day a week doesn't break your streak."
          checked={profile.prefs.streakFreeze}
          onChange={(streakFreeze) => updatePrefs({ streakFreeze })}
        />
      </div>
      <SettingsRow label="Focus timer" description="Session lengths for the timer in the top bar.">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`${ids}-focus`} className="sr-only">
            Focus length
          </label>
          <Select
            id={`${ids}-focus`}
            value={String(profile.prefs.focusMinutes)}
            onChange={(e) => updatePrefs({ focusMinutes: Number(e.target.value) })}
            options={FOCUS_OPTIONS.map((m) => ({ value: String(m), label: `Focus ${m} min` }))}
            className="w-40"
          />
          <label htmlFor={`${ids}-break`} className="sr-only">
            Break length
          </label>
          <Select
            id={`${ids}-break`}
            value={String(profile.prefs.breakMinutes)}
            onChange={(e) => updatePrefs({ breakMinutes: Number(e.target.value) })}
            options={BREAK_OPTIONS.map((m) => ({ value: String(m), label: `Break ${m} min` }))}
            className="w-40"
          />
        </div>
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="Start the attempt timer when I start typing"
          description="In the problem workspace, the timer starts with your first keystroke."
          checked={profile.prefs.timerAutoStart}
          onChange={(timerAutoStart) => updatePrefs({ timerAutoStart })}
        />
      </div>
    </SettingsSection>
  );
}
