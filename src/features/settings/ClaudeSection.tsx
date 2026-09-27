// Settings → Claude (F21): the detected runtime, how Claude answers (built-in Claude, your API key,
// or copy prompt), the API key with Test connection (web app only), and the model per tier.
// Switching modes takes effect at once; when a choice can't be used in this view, the note says
// why and copy prompt fills in.
import { RotateCcw } from "lucide-react";
import { lazy, Suspense, useId } from "react";
import type { Services } from "@/app/providers/servicesContext";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Misc";
import { FALLBACK_NOTE, MODE_LABEL } from "@/lib/ai/mode";
import { DEFAULT_TIER_MODELS } from "@/lib/constants";
import type { AIMode, Profile, Tier } from "@/lib/types";
import { useAIMode, useAIStore } from "@/stores/aiStore";
import { useProfileStore } from "@/stores/profileStore";
import { SettingsRow, SettingsSection } from "./layout";

// Left out of the artifact build entirely (CLAUDE.md decision 10).
const ApiKeySettings = __ARTIFACT__ ? null : lazy(() => import("./ApiKeySettings"));

interface ModeOption {
  value: AIMode;
  title: string;
  detail: string;
  available: boolean;
  unavailableNote?: string;
}

const TIERS: { tier: Tier; label: string; detail: string }[] = [
  { tier: "quick", label: "Quick", detail: "Grading short answers, drills and suggestions." },
  { tier: "default", label: "Default", detail: "Hints, reviews, explanations and chat." },
  { tier: "complex", label: "Complex", detail: "Deep explanations and new study material." },
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
  const sampleBlocked = useAIStore((s) => s.sampleBlocked);
  const hasKey = useAIStore((s) => s.hasKey);
  const resolved = useAIMode();
  const apiAllowed = services?.ai.apiAllowed ?? false;
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
      available: apiAllowed,
      unavailableNote: "Only in the web app version of Atlas.",
    },
    {
      value: "copy",
      title: "Copy prompt",
      detail:
        "Atlas writes a complete prompt for you to paste into claude.ai, then you paste the answer back. Works everywhere, free.",
      available: true,
    },
  ];
  const preferred = profile.ai.mode;
  const selected = options.find((o) => o.value === preferred && o.available) ? preferred : "copy";
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
        <p className="mt-0.5 text-sm text-muted" role="status">
          In use now: <span className="font-medium text-text">{MODE_LABEL[resolved.mode]}</span>.
          {resolved.fallback ? ` ${FALLBACK_NOTE[resolved.fallback]}` : ""}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {options.map((o) => {
            const checked = selected === o.value;
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
                  {o.available && o.value === "sample" && sampleBlocked && (
                    <span className="mt-1 block font-medium text-text">
                      Not allowed in this view right now. Reload to ask again.
                    </span>
                  )}
                  {o.available && o.value === "api" && !hasKey && (
                    <span className="mt-1 block font-medium text-text">Add a key below first.</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {ApiKeySettings && apiAllowed && (
        <SettingsRow
          label="Your API key"
          description="For the API key mode. Get one from Anthropic, then test it here."
          stacked
        >
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <ApiKeySettings />
          </Suspense>
        </SettingsRow>
      )}
      <SettingsRow
        label="Models"
        description="Which Claude model each kind of task uses with your API key. Built-in Claude picks its own, and with copy prompt you choose on claude.ai."
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
