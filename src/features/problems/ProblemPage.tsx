// The problem workspace (F7): the problem on the left, code on the right, in a resizable split on
// wide screens and as "Problem" and "Code" tabs on narrower ones. `?mode=resolve` starts a
// re-solve with earlier work hidden; `?attempt=<id>` opens one attempt's code.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { navigate, routeHref, useRoute } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { normalizeLanguage, type CodeLanguage } from "@/components/ui/code/languages";
import { Dialog } from "@/components/ui/Dialog";
import { useMediaQuery } from "@/components/ui/hooks";
import { Callout, PageSkeleton } from "@/components/ui/Misc";
import { Tabs } from "@/components/ui/Tabs";
import { isDesignProblem, problemInfo, type ProblemInfo } from "@/lib/problems/catalog";
import type { Attempt } from "@/lib/types";
import { deleteAttempt, restoreProblem, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { PageFrame } from "@/app/shell/PageFrame";
import { NotFoundPage } from "../placeholder/pages";
import { AttemptDialog } from "./workspace/AttemptsTimeline";
import { EditorPane } from "./workspace/EditorPane";
import { InfoPane, ProblemTitle } from "./workspace/InfoPane";
import { SaveAttemptDialog } from "./workspace/SaveAttemptDialog";
import { isBlankCode, readTemplatePref, writeTemplatePref } from "./workspace/templates";
import { useAttemptSession, type SessionMode } from "./workspace/useAttemptSession";

const SPLIT_KEY = "atlas.split";
const WIDE = "(min-width: 1024px)";

function readSplit(): number {
  try {
    const v = Number(localStorage.getItem(SPLIT_KEY));
    return Number.isFinite(v) && v >= 25 && v <= 70 ? v : 42;
  } catch {
    return 42;
  }
}

function writeSplit(v: number) {
  try {
    localStorage.setItem(SPLIT_KEY, String(Math.round(v)));
  } catch {
    /* only a convenience */
  }
}

function Workspace({ info, mode }: { info: ProblemInfo; mode: SessionMode }) {
  const route = useRoute();
  const state = useProblemStore((s) => s.states[info.id]);
  const profile = useProfileStore((s) => s.profile);
  const wide = useMediaQuery(WIDE);
  const [templateOn, setTemplateOn] = useState(readTemplatePref);
  const defaultLanguage: CodeLanguage =
    info.language === "sql"
      ? "sql"
      : info.source === "quant"
        ? "text"
        : normalizeLanguage(profile?.primaryLanguage ?? "cpp");
  const attempt = useAttemptSession(info.id, mode, defaultLanguage, templateOn);
  const { session } = attempt;
  const [hintsOpen, setHintsOpen] = useState(session.hintsUsed > 0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [revealAsk, setRevealAsk] = useState(false);
  const [tab, setTab] = useState<"problem" | "code">(
    session.code.trim() || mode === "resolve" ? "code" : "problem",
  );
  const [split, setSplit] = useState(readSplit);
  const splitRef = useRef<HTMLDivElement>(null);

  const revealed = mode === "normal" || session.revealed;
  const attemptParam = route.query.get("attempt");
  const openAttemptId = attemptParam && revealed ? attemptParam : null;

  const openAttempt = (id: string) => navigate(routeHref("/problems", info.id, { attempt: id }));
  const closeAttempt = () => navigate(routeHref("/problems", info.id), { replace: true });

  const setTemplate = (on: boolean) => {
    setTemplateOn(on);
    writeTemplatePref(on);
  };

  const discard = () => {
    const undo = attempt.discard(templateOn);
    setHintsOpen(false);
    toast("Draft discarded.", { action: { label: "Undo", onClick: undo } });
  };

  const loadIntoEditor = (a: Attempt) => {
    const prev = { code: session.code, language: session.language };
    attempt.update({ code: a.code, language: normalizeLanguage(a.language) });
    closeAttempt();
    setTab("code");
    toast(
      "Code copied into the editor.",
      isBlankCode(prev.code, prev.language)
        ? {}
        : { action: { label: "Undo", onClick: () => attempt.update(prev) } },
    );
  };

  const removeAttempt = (a: Attempt) => {
    const before = deleteAttempt(info.id, a.id);
    closeAttempt();
    toast("Attempt deleted. The review schedule stays as it is.", {
      action: before
        ? { label: "Undo", onClick: () => restoreProblem(before, info.id) }
        : undefined,
    });
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = splitRef.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    let value = split;
    const move = (ev: PointerEvent) => {
      value = Math.min(70, Math.max(25, ((ev.clientX - box.left) / box.width) * 100));
      setSplit(value);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      writeSplit(value);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onSplitKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" ? -3 : e.key === "ArrowRight" ? 3 : 0;
    if (!step) return;
    e.preventDefault();
    const v = Math.min(70, Math.max(25, split + step));
    setSplit(v);
    writeSplit(v);
  };

  const conflict = attempt.conflict && (
    <Callout
      tone="warning"
      title="You have an unsaved draft"
      className="m-3"
      actions={
        <>
          <Button
            size="sm"
            onClick={() => navigate(routeHref("/problems", info.id), { replace: true })}
          >
            Keep working on it
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => attempt.startResolveAnyway(templateOn)}
          >
            Start the re-solve
          </Button>
        </>
      }
    >
      Starting a re-solve replaces it, because the draft would show your earlier code.
    </Callout>
  );

  const info_ = (
    <InfoPane
      info={info}
      state={state}
      mode={mode}
      revealed={revealed}
      onReveal={() => setRevealAsk(true)}
      onOpenAttempt={openAttempt}
      titleOutside={!wide}
    />
  );

  const editor = (
    <EditorPane
      info={info}
      state={state}
      attempt={attempt}
      autoStart={profile?.prefs.timerAutoStart ?? true}
      templateOn={templateOn}
      onTemplateChange={setTemplate}
      hintsOpen={hintsOpen}
      onHintsOpen={setHintsOpen}
      onSave={() => setSaveOpen(true)}
      onDiscard={discard}
      fill={wide}
      disabled={attempt.conflict}
    />
  );

  return (
    <>
      {wide ? (
        <div ref={splitRef} className="flex h-full min-h-[560px]">
          <div
            className="min-w-0 shrink-0 overflow-y-auto px-6 pt-6 pb-16 xl:px-8"
            style={{ width: `${split}%` }}
          >
            {info_}
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            aria-valuemin={25}
            aria-valuemax={70}
            aria-valuenow={Math.round(split)}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={onSplitKey}
            className="relative w-px shrink-0 cursor-col-resize bg-rule outline-none before:absolute before:inset-y-0 before:-right-1.5 before:-left-1.5 before:content-[''] hover:bg-accent focus-visible:bg-accent"
          />
          <div className="flex min-w-0 flex-1 flex-col bg-surface">
            {conflict}
            <div className="min-h-0 flex-1">{editor}</div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-5 pb-8 sm:px-6">
          <ProblemTitle info={info} className="mb-2 sm:mb-2" />
          <Tabs<"problem" | "code">
            label="Workspace"
            value={tab}
            onChange={setTab}
            items={[
              { value: "problem", label: "Problem" },
              { value: "code", label: "Code" },
            ]}
            className="mb-4"
          />
          {tab === "problem" ? (
            info_
          ) : (
            <div className="-mx-4 border-y border-rule bg-surface sm:mx-0 sm:rounded-panel sm:border">
              {conflict}
              {editor}
            </div>
          )}
        </div>
      )}
      <SaveAttemptDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        info={info}
        state={state}
        session={session}
        elapsedMs={attempt.timer.elapsedMs}
        mode={mode}
        insightVisible={revealed}
        onSaved={() => {
          attempt.afterSave();
          setHintsOpen(false);
          if (mode === "resolve") navigate(routeHref("/problems", info.id), { replace: true });
        }}
      />
      <AttemptDialog
        state={state}
        attemptId={openAttemptId}
        onClose={closeAttempt}
        onLoadIntoEditor={loadIntoEditor}
        onDelete={removeAttempt}
      />
      <Dialog
        open={revealAsk}
        onClose={() => setRevealAsk(false)}
        title="Reveal your earlier work?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevealAsk(false)}>
              Keep it hidden
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setRevealAsk(false);
                attempt.update({ revealed: true, sawSolution: true });
              }}
            >
              Reveal
            </Button>
          </>
        }
      >
        <p className="px-4 py-4 text-base text-muted sm:px-5">
          Revealing marks this attempt as “saw the solution”, and the problem comes back tomorrow.
        </p>
      </Dialog>
    </>
  );
}

export default function ProblemPage() {
  const route = useRoute();
  const id = route.id ?? "";
  const loaded = useProblemStore((s) => s.loaded);
  const profileReady = useProfileStore((s) => s.profile !== null);
  const state = useProblemStore((s) => s.states[id]);
  const info = problemInfo(id, state);
  const design = info ? isDesignProblem(info) : false;
  const mode: SessionMode = route.query.get("mode") === "resolve" ? "resolve" : "normal";
  const resolveDraft = state?.draft?.mode === "resolve";

  useEffect(() => {
    if (design) navigate(routeHref("/designs", id), { replace: true });
  }, [design, id]);

  // A re-solve in progress keeps its hidden content hidden, even from a plain link.
  const mustResolve = loaded && resolveDraft && mode === "normal";
  useEffect(() => {
    if (mustResolve) navigate(routeHref("/problems", id, { mode: "resolve" }), { replace: true });
  }, [mustResolve, id]);

  if (!loaded || !profileReady || mustResolve) {
    return (
      <PageFrame>
        <PageSkeleton />
      </PageFrame>
    );
  }
  if (!info) return <NotFoundPage />;
  if (design) return null;
  return <Workspace key={`${id}|${mode}`} info={info} mode={mode} />;
}
