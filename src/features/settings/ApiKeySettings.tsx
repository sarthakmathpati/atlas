// Settings → Claude → Your API key (F21, standalone web app only; the artifact build leaves this
// module out). The key is masked, saved only in this browser's IndexedDB, never exported, synced
// or logged, and sent only in the request header to Anthropic. Test connection makes one tiny
// request per model tier.
import { CheckCircle2, Eye, EyeOff, KeyRound, PlugZap, Trash2, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input } from "@/components/ui/Field";
import {
  removeApiKey,
  saveApiKey,
  testApiConnection,
  useAIStore,
  type TierTestResult,
} from "@/stores/aiStore";
import { toast } from "@/stores/toastStore";

const TIER_LABEL = { quick: "Quick", default: "Default", complex: "Complex" } as const;
const CONSOLE_KEYS = "https://console.anthropic.com/settings/keys";

export default function ApiKeySettings() {
  const id = useId();
  const hasKey = useAIStore((s) => s.hasKey);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [results, setResults] = useState<TierTestResult[] | null>(null);
  const looksWrong = draft.trim() !== "" && !draft.trim().startsWith("sk-ant-");

  const save = async () => {
    setBusy("save");
    const ok = await saveApiKey(draft);
    setBusy(null);
    if (!ok) {
      toast("This browser is blocking storage, so the key can't be saved here.", { tone: "error" });
      return;
    }
    setDraft("");
    setShow(false);
    setResults(null);
    toast("API key saved in this browser.");
  };

  const test = async () => {
    setBusy("test");
    setResults(null);
    try {
      setResults(await testApiConnection());
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    await removeApiKey();
    setResults(null);
    toast("API key removed from this browser.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-base">
        <KeyRound size={16} aria-hidden="true" className="text-muted" />
        {hasKey ? (
          <span className="text-text">A key is saved in this browser.</span>
        ) : (
          <span className="text-muted">No key saved yet.</span>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`${id}-key`} className="sr-only">
            {hasKey ? "Replace your API key" : "Your Anthropic API key"}
          </label>
          <Input
            id={`${id}-key`}
            type={show ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={hasKey ? "Paste a new key to replace it" : "sk-ant-…"}
            autoComplete="off"
            spellCheck={false}
            className="pr-11 font-mono text-sm"
            aria-describedby={`${id}-note`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide the key" : "Show the key"}
            className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-control text-muted hover:bg-surface-sunken hover:text-text max-md:size-10"
          >
            {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
        <Button
          variant="primary"
          disabled={draft.trim() === "" || busy !== null}
          onClick={() => void save()}
        >
          {busy === "save" ? "Saving…" : "Save key"}
        </Button>
      </div>
      {looksWrong && (
        <p className="text-sm text-warning">
          Anthropic API keys start with “sk-ant-”. Check that you copied the whole key.
        </p>
      )}
      <p id={`${id}-note`} className="text-sm text-muted">
        API use is billed separately by Anthropic, not by your Claude plan. The key stays in this
        browser: it isn't synced, exported or included in backups. Create one in the{" "}
        <a
          href={CONSOLE_KEYS}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline"
        >
          Anthropic Console
        </a>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={PlugZap}
          disabled={!hasKey || busy !== null}
          onClick={() => void test()}
        >
          {busy === "test" ? "Testing…" : "Test connection"}
        </Button>
        {hasKey && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void remove()}>
            Remove key
          </Button>
        )}
      </div>
      {results && (
        <ul className="divide-y divide-rule rounded-control border border-rule" aria-live="polite">
          {results.map((r) => (
            <li key={r.tier} className="flex items-start gap-2 px-3 py-2 text-sm">
              {r.ok ? (
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-success"
                />
              ) : (
                <XCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
              )}
              <span className="min-w-0">
                <span className="font-medium text-text">{TIER_LABEL[r.tier]}</span>{" "}
                <span className="font-mono text-xs text-muted">{r.model}</span>
                <span className={cx("block", r.ok ? "text-muted" : "text-text")}>{r.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
