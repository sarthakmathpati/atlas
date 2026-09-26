// Claude in this view (F21): which mode is in use, whether an API key is saved, and the copy
// prompt modal. The AI service comes from ServicesProvider (chosen once from the runtime); the
// owner's preferred mode lives in the profile; this store resolves the two, so switching modes
// in Settings takes effect at once, without a reload.
//
// The API key lives only in this browser's IndexedDB (SecretsStore): never exported, never in the
// artifact's synced db, and never read at all in the artifact build.
import { create } from "zustand";
import type { AIErrorCode, AIResult } from "@/lib/ai/AIProvider";
import type { CopyPromptView } from "@/lib/ai/CopyPromptProvider";
import { failure } from "@/lib/ai/errors";
import { FALLBACK_NOTE, resolveMode, type ResolvedMode } from "@/lib/ai/mode";
import type { PromptSpec } from "@/lib/ai/prompts";
import { runAI } from "@/lib/ai/run";
import type { AIService } from "@/lib/ai/service";
import { DEFAULT_TIER_MODELS } from "@/lib/constants";
import { SecretsStore } from "@/lib/storage/DexieRepository";
import type { Tier } from "@/lib/types";
import { useProfileStore } from "./profileStore";
import { toast } from "./toastStore";

interface CopyRequest {
  view: CopyPromptView;
  resolve: (reply: string | null) => void;
}

interface AIStoreState {
  service: AIService | null;
  /** A `sample` call said Claude can't be used in this view: copy prompt for the rest of the visit. */
  sampleBlocked: boolean;
  hasKey: boolean;
  copy: CopyRequest | null;
}

export const useAIStore = create<AIStoreState>(() => ({
  service: null,
  sampleBlocked: false,
  hasKey: false,
  copy: null,
}));

// ----- the API key -------------------------------------------------------------------------------

let secrets: Promise<SecretsStore | null> | null = null;

function openSecrets(): Promise<SecretsStore | null> {
  if (__ARTIFACT__) return Promise.resolve(null);
  secrets ??= SecretsStore.open();
  return secrets;
}

export async function getApiKey(): Promise<string | undefined> {
  const store = await openSecrets();
  const key = (await store?.get())?.anthropicApiKey?.trim();
  return key || undefined;
}

/** Saves the key in this browser only. Returns false when storage is blocked. */
export async function saveApiKey(key: string): Promise<boolean> {
  const store = await openSecrets();
  if (!store) return false;
  try {
    await store.set({ anthropicApiKey: key.trim() });
  } catch {
    return false;
  }
  useAIStore.setState({ hasKey: key.trim() !== "" });
  return true;
}

export async function removeApiKey(): Promise<void> {
  const store = await openSecrets();
  await store?.clear().catch(() => undefined);
  useAIStore.setState({ hasKey: false });
}

export function modelFor(tier: Tier): string {
  const models = useProfileStore.getState().profile?.ai.tierModels;
  return models?.[tier]?.trim() || DEFAULT_TIER_MODELS[tier];
}

// ----- the copy prompt modal ----------------------------------------------------------------------

/** The copy prompt provider's presenter: opens the modal and waits for the pasted reply. */
export function presentCopyPrompt(view: CopyPromptView): Promise<string | null> {
  return new Promise((resolve) => {
    useAIStore.getState().copy?.resolve(null);
    let settled = false;
    const done = (reply: string | null) => {
      if (settled) return;
      settled = true;
      if (useAIStore.getState().copy?.view === view) useAIStore.setState({ copy: null });
      resolve(reply);
    };
    view.signal?.addEventListener("abort", () => done(null), { once: true });
    useAIStore.setState({ copy: { view, resolve: done } });
  });
}

export function onSampleBlocked(_code: AIErrorCode): void {
  if (useAIStore.getState().sampleBlocked) return;
  useAIStore.setState({ sampleBlocked: true });
  toast(FALLBACK_NOTE["sample-blocked"], { id: "ai-blocked" });
}

// ----- attach, resolve, ask -------------------------------------------------------------------------

export async function attachAI(service: AIService): Promise<void> {
  useAIStore.setState({ service, sampleBlocked: false });
  if (service.apiAllowed) useAIStore.setState({ hasKey: Boolean(await getApiKey()) });
}

export function detachAI(): void {
  useAIStore.getState().copy?.resolve(null);
  useAIStore.setState({ service: null, copy: null });
}

function resolveFrom(state: AIStoreState, preferred: ReturnType<typeof preferredMode>) {
  return resolveMode({
    preferred,
    hasSample: state.service?.hasSample ?? false,
    sampleBlocked: state.sampleBlocked,
    apiAllowed: state.service?.apiAllowed ?? !__ARTIFACT__,
    hasKey: state.hasKey,
  });
}

function preferredMode() {
  return useProfileStore.getState().profile?.ai.mode ?? "copy";
}

/** The mode in use right now (outside React). */
export function currentAIMode(): ResolvedMode {
  return resolveFrom(useAIStore.getState(), preferredMode());
}

/** The mode in use, updated when the owner changes it or the view loses built-in Claude. */
export function useAIMode(): ResolvedMode & { ready: boolean } {
  const preferred = useProfileStore((s) => s.profile?.ai.mode ?? "copy");
  const service = useAIStore((s) => s.service);
  const sampleBlocked = useAIStore((s) => s.sampleBlocked);
  const hasKey = useAIStore((s) => s.hasKey);
  return {
    ...resolveFrom({ service, sampleBlocked, hasKey, copy: null }, preferred),
    ready: service !== null,
  };
}

export interface AskOptions {
  signal?: AbortSignal;
  onText?: (fullText: string) => void;
  /** Keep the result for this visit (lib/ai/run.ts). */
  cacheKey?: string;
  /** Ask again even if a cached result exists ("Try again", "Ask again"). */
  refresh?: boolean;
  /** Skip the runtime's 5-minute answer cache (chat turns). */
  noCache?: boolean;
  /** Copy-prompt modal title. */
  title?: string;
}

/** Sends one prompt through the provider for the current mode. */
export async function askAI<T>(
  spec: PromptSpec<T>,
  options: AskOptions = {},
): Promise<AIResult<T>> {
  const { service } = useAIStore.getState();
  const { mode } = currentAIMode();
  if (!service) return failure("unavailable", mode);
  const provider = await service.provider(mode);
  return runAI(
    provider,
    {
      ...spec,
      signal: options.signal,
      onText: options.onText,
      cacheKey: options.cacheKey,
      noCache: options.noCache || options.refresh,
      title: options.title,
    },
    { refresh: options.refresh },
  );
}
