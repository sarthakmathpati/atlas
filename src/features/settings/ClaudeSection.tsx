// Settings → Claude (F21 basics). Shows the detected runtime and which AI modes it supports, and
// saves the owner's choice and the model per tier. The Claude features themselves (and adding an
// API key) arrive in phase 6; the choice made here is what they will use.
import { RotateCcw } from "lucide-react";
import { useId } from "react";
import type { Services } from "@/app/providers/servicesContext";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input } from "@/components/ui/Field";
import { DEFAULT_TIER_MODELS } from "@/lib/constants";
import type { AIMode, Profile, Tier } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";
import { SettingsRow, SettingsSection } from "./layout";

interface ModeOption {
  value: AIMode;
  title: string;
  detail: string;
  available: boolean;
  unavailableNote?: string;
}

const TIERS: { tier: Tier; label: string; detail: string }[] = [
  { tier: "quick", label: "Quick", detail: "Hints, drill grading and short answers." },
  { tier: "default", label: "Default", detail: "Explanations, reviews and chat." },
  { tier: "complex", label: "Complex", detail: "Mock interviews and revision sheets." },
];

export function ClaudeSection({
  profile,
  services,
}: {
  profile: Profile;
  services: Services | null;
}) {
  const update = useProfileStore((s) => s.update);
  const ids = useId();
  const runtime = services?.runtime;
  const inArtifact = Boolean(runtime?.inClaudeFrame);
  const options: ModeOption[] = [
    {
      value: "sample",
      title: "Built-in Claude",
      detail:
        "Answers use your own Claude plan. No key needed. claude.ai asks for permission the first time.",
      available: Boolean(runtime?.sample),
      unavailableNote: inArtifact
        ? "This artifact wasn't published with Claude access."
        : "Available when Atlas runs as a published Claude artifact.",
    },
    {
      value: "api",
      title: "Your API key",
      detail:
        "Calls go straight from this browser to Anthropic. Billed separately from your Claude plan.",
      available: false,
      unavailableNote: inArtifact
        ? "Only in the web app version of Atlas."
        : "Adding a key arrives with the Claude features in phase 6.",
    },
    {
      value: "copy",
      title: "Copy prompt",
      detail:
        "Atlas writes a complete prompt for you to paste into claude.ai, then you can paste the answer back. Works everywhere, free.",
      available: true,
    },
  ];
  const current = options.find((o) => o.value === profile.ai.mode && o.available)
    ? profile.ai.mode
    : "copy";
  const setTier = (tier: Tier, model: string) =>
    update({ ai: { ...profile.ai, tierModels: { ...profile.ai.tierModels, [tier]: model } } });
  const isDefault = TIERS.every(
    ({ tier }) => profile.ai.tierModels[tier] === DEFAULT_TIER_MODELS[tier],
  );

  return (
    <SettingsSection
      id="claude"
      title="Claude"
      description={
        runtime
          ? runtime.sample
            ? "Atlas is running as a Claude artifact with Claude built in."
            : inArtifact
              ? "Atlas is running as a Claude artifact without Claude access."
              : "Atlas is running as a web app."
          : "Checking what this view supports…"
      }
    >
      <fieldset className="px-4 py-4 sm:px-5">
        <legend className="text-base font-medium text-text">How Claude answers</legend>
        <p className="mt-0.5 text-sm text-muted">
          Hints, reviews, quizzes and the tutor arrive in phase 6 and will use this choice.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {options.map((o) => {
            const checked = current === o.value;
            return (
              <label
                key={o.value}
                className={cx(
                  "relative flex cursor-pointer flex-col gap-1 rounded-panel border p-3 transition-colors",
                  checked ? "border-accent bg-accent-soft" : "border-rule hover:border-rule-strong",
                  !o.available && "cursor-not-allowed opacity-60 hover:border-rule",
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${ids}-mode`}
                    value={o.value}
                    checked={checked}
                    disabled={!o.available}
                    onChange={() => update({ ai: { ...profile.ai, mode: o.value } })}
                    className="size-4 accent-[var(--accent)]"
                    aria-describedby={`${ids}-${o.value}`}
                  />
                  <span className="text-base font-medium text-text">{o.title}</span>
                </span>
                <span id={`${ids}-${o.value}`} className="text-sm text-muted">
                  {o.detail}
                  {!o.available && o.unavailableNote && (
                    <span className="mt-1 block font-medium text-text">{o.unavailableNote}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <SettingsRow
        label="Models"
        description="Which Claude model each kind of task uses with an API key. Built-in Claude picks its own."
        stacked
      >
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map(({ tier, label, detail }) => (
            <div key={tier} className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-${tier}`} className="text-sm font-medium text-text">
                {label}
              </label>
              <Input
                id={`${ids}-${tier}`}
                value={profile.ai.tierModels[tier]}
                spellCheck={false}
                onChange={(e) => setTier(tier, e.target.value.trim())}
                aria-describedby={`${ids}-${tier}-hint`}
                className="font-mono text-sm"
              />
              <span id={`${ids}-${tier}-hint`} className="text-xs text-muted">
                {detail}
              </span>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={RotateCcw}
          disabled={isDefault}
          onClick={() => update({ ai: { ...profile.ai, tierModels: { ...DEFAULT_TIER_MODELS } } })}
          className="mt-3"
        >
          Use the default models
        </Button>
      </SettingsRow>
    </SettingsSection>
  );
}
