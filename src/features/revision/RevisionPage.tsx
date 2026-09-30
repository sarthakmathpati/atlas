// Revision sheets (F19): a 1-day sheet, a 1-week sheet grouped by subject, or a custom one, built
// offline from the owner's own data (lib/revision/sheet.ts). Print it (light theme, a page per
// subject; when printing is blocked in the claude.ai frame, export HTML and print that), export it
// as Markdown or HTML through the FileSaver adapter, or have Claude tighten it into a shorter cheat
// sheet (prompt 15), shown as edited by Claude next to the original. Reading a day or week sheet to
// the end, printing or exporting it ticks off today's revision item.
import { FileCode2, FileText, Printer, ScrollText, Sparkles } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate, routeHref, useRoute } from "@/app/router";
import { useServicesState } from "@/app/providers/servicesContext";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Callout, EmptyState, Skeleton } from "@/components/ui/Misc";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { conceptContentNow, loadSubjectContent, loadedSubjectContent } from "@/data/content";
import { subjectById, topicById } from "@/data/syllabus";
import { revisionTightenPrompt } from "@/lib/ai/prompts";
import { PROMPT_BUDGET_BYTES } from "@/lib/ai/context";
import { checklistTags, taggedAttempts } from "@/lib/mistakes/stats";
import { cleanRenderedHtml, sheetHtml } from "@/lib/revision/html";
import {
  buildSheet,
  sheetFilename,
  sheetMarkdown,
  subjectsNeeded,
  tightenInput,
  tightenTarget,
  withoutTitle,
  type SheetChoice,
  type SheetScope,
} from "@/lib/revision/sheet";
import { nowIso } from "@/lib/time";
import { useToday } from "@/stores/clockStore";
import { useDataReady } from "@/stores/hydrate";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { markPlanItemDone } from "@/stores/planEffects";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { useReadiness } from "../insight/useInsight";
import { keepTightened, useTightenStore } from "./tightenStore";
import { usePageFocusLine } from "@/features/focus/hooks";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

/** What Claude is sent at most (the instructions and preamble take the rest of 48 KiB). */
const TIGHTEN_INPUT_BYTES = PROMPT_BUDGET_BYTES - 6 * 1024;
/** Reading to the end counts after this long on the sheet. */
const READ_AFTER_MS = 15_000;

const SCOPES: { value: SheetScope; label: string }[] = [
  { value: "day", label: "1 day" },
  { value: "week", label: "1 week" },
  { value: "custom", label: "Custom" },
];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

function choiceFrom(query: URLSearchParams): SheetChoice {
  const scope = query.get("scope");
  if (scope === "week") return { scope: "week" };
  if (scope === "custom")
    return {
      scope: "custom",
      subjects: list(query.get("subjects")),
      topics: list(query.get("topics")),
      patterns: list(query.get("patterns")),
    };
  return { scope: "day" };
}

function choiceHref(choice: SheetChoice): string {
  const q: Record<string, string> = { scope: choice.scope };
  if (choice.scope === "custom") {
    if (choice.subjects?.length) q.subjects = choice.subjects.join(",");
    if (choice.topics?.length) q.topics = choice.topics.join(",");
    if (choice.patterns?.length) q.patterns = choice.patterns.join(",");
  }
  return routeHref("/revision", undefined, q);
}

export default function RevisionPage() {
  const route = useRoute();
  const choice = useMemo(() => choiceFrom(route.query), [route.query]);
  const choiceKey = choiceHref(choice);
  usePageFocusLine(
    choice.scope === "custom"
      ? "Read my revision sheet"
      : `Read the ${choice.scope === "week" ? "1-week" : "1-day"} revision sheet`,
  );
  const profile = useProfileStore((s) => s.profile);
  const ready = useDataReady((s) => s.ready);
  const model = useReadiness();
  const problems = useProblemStore((s) => s.states);
  const tags = useMistakeTagStore((s) => s.tags);
  const today = useToday();
  const services = useServicesState();
  const request = useAIRequest<unknown>();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"original" | "tightened">("original");
  const [printBlocked, setPrintBlocked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [, setLoadedTick] = useState(0);

  // The concept text of every subject the sheet draws on, loaded before building it.
  const needed = useMemo(() => (model ? subjectsNeeded(choice, model) : []), [model, choice]);
  const neededKey = needed.join(",");
  useEffect(() => {
    if (!neededKey) return;
    let alive = true;
    Promise.all(neededKey.split(",").map((id) => loadSubjectContent(id)))
      .then(() => {
        if (!alive) return;
        setLoadFailed(false);
        setLoadedTick((n) => n + 1);
      })
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, [neededKey]);
  const contentReady = needed.every((id) => loadedSubjectContent(id));

  const checklist = useMemo(
    () => checklistTags(taggedAttempts(problems), Object.values(tags), today),
    [problems, tags, today],
  );
  const sheet = useMemo(() => {
    if (!model || !profile || !contentReady) return null;
    return buildSheet(choice, {
      today,
      track: profile.track,
      model,
      problemStates: problems,
      checklist,
      contentOf: (c) => conceptContentNow(c),
    });
  }, [model, profile, contentReady, choice, today, problems, checklist]);

  const key = `${choiceKey}|${today}`;
  const tightened = useTightenStore((s) => s.sheets[key]);
  const showing = view === "tightened" && tightened ? "tightened" : "original";

  // ----- ticking off today's revision item ---------------------------------------------------------
  const planRef = choice.scope === "custom" ? null : `revision-${choice.scope}`;
  const markDone = useCallback(() => {
    if (planRef) void markPlanItemDone(null, today, planRef, ["revision"]);
  }, [planRef, today]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = endRef.current;
    if (!el || !sheet || !planRef || typeof IntersectionObserver === "undefined") return;
    const opened = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || timer) return;
      timer = setTimeout(markDone, Math.max(0, READ_AFTER_MS - (Date.now() - opened)));
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [sheet, planRef, markDone]);

  // ----- actions -------------------------------------------------------------------------------------
  const exportFile = async (kind: "md" | "html") => {
    if (!sheet || services.status !== "ready") {
      toast("Your data is still loading. Try again in a moment.");
      return;
    }
    const isTight = showing === "tightened" && tightened;
    const note = isTight
      ? "Tightened by Claude from your revision sheet. The original is in Atlas."
      : undefined;
    let data: string;
    if (kind === "md") {
      data = isTight ? `${tightened.markdown.trim()}\n\n_${note}_\n` : `${sheetMarkdown(sheet)}\n`;
    } else {
      const body = sheetRef.current;
      if (!body) return;
      data = sheetHtml({
        title: sheet.title,
        dateLabel: sheet.dateLabel,
        bodyHtml: cleanRenderedHtml(body),
        note,
      });
    }
    const result = await services.services.fileSaver.save({
      filename: sheetFilename(sheet, today, kind, Boolean(isTight)),
      data,
      mime: kind === "md" ? "text/markdown" : "text/html",
    });
    if (result.status === "saved") {
      toast(kind === "md" ? "Sheet exported as Markdown." : "Sheet exported as HTML.", {
        tone: "success",
      });
      markDone();
    } else if (result.status === "shown-in-dialog") markDone();
    else if (result.status === "declined") toast("Export cancelled.");
    else toast(result.message, { tone: "error" });
  };

  const print = () => {
    setPrintBlocked(false);
    let fired = false;
    const before = () => {
      fired = true;
    };
    window.addEventListener("beforeprint", before);
    try {
      window.print();
    } catch {
      /* blocked: handled below */
    }
    // Inside the claude.ai frame, print() can do nothing at all; beforeprint never fires then.
    setTimeout(() => {
      window.removeEventListener("beforeprint", before);
      if (fired) markDone();
      else setPrintBlocked(true);
    }, 1000);
  };

  const tighten = (refresh = false) => {
    if (!sheet) return;
    const input = tightenInput(sheet, TIGHTEN_INPUT_BYTES);
    const target = tightenTarget(input.words);
    void request.start(
      () => ({ spec: revisionTightenPrompt(promptEnv(), input.markdown, target) }),
      {
        title: "Tighten your revision sheet",
        refresh,
        onDone: (r) => {
          keepTightened(key, {
            markdown: r.text,
            target,
            left: input.left,
            mode: r.mode,
            createdAt: nowIso(),
          });
          setView("tightened");
        },
      },
    );
  };

  // ----- custom choices ------------------------------------------------------------------------------
  const options = useMemo(() => {
    const subjects: ComboOption[] = [];
    const topics: ComboOption[] = [];
    const patterns: ComboOption[] = [];
    if (!model) return { subjects, topics, patterns };
    const seenTopics = new Set<string>();
    for (const s of model.subjects)
      subjects.push({
        value: s.subjectId,
        label: subjectById.get(s.subjectId)?.name ?? s.subjectId,
      });
    for (const e of model.byId.values()) {
      const t = e.concept.topicId;
      if (!seenTopics.has(t)) {
        seenTopics.add(t);
        topics.push({
          value: t,
          label: topicById.get(t)?.name ?? t,
          detail: subjectById.get(e.concept.subjectId)?.shortName,
        });
      }
      if (e.concept.isPattern)
        patterns.push({
          value: e.concept.id,
          label: e.concept.name,
          detail: topicById.get(t)?.name,
        });
    }
    subjects.sort(
      (a, b) => (subjectById.get(a.value)?.order ?? 0) - (subjectById.get(b.value)?.order ?? 0),
    );
    return { subjects, topics, patterns };
  }, [model]);

  const setChoice = (next: SheetChoice) => navigate(choiceHref(next), { replace: true });
  const customEmpty =
    choice.scope === "custom" &&
    !choice.subjects?.length &&
    !choice.topics?.length &&
    !choice.patterns?.length;

  return (
    <PageFrame>
      <PageHeader
        className="print:hidden"
        title="Revision sheets"
        description="Everything that matters before an interview, from your own progress, on a page or two."
      />
      <div className="space-y-5">
        <section
          aria-label="Choose a sheet"
          className="space-y-4 rounded-panel bg-surface p-4 sm:p-5 print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<SheetScope>
              label="Which sheet"
              value={choice.scope}
              onChange={(scope) => setChoice(scope === "custom" ? { ...choice, scope } : { scope })}
              options={SCOPES}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={Printer} onClick={print} disabled={!sheet}>
                Print
              </Button>
              <Button
                size="sm"
                icon={FileText}
                onClick={() => void exportFile("md")}
                disabled={!sheet}
              >
                Export as Markdown
              </Button>
              <Button
                size="sm"
                icon={FileCode2}
                onClick={() => void exportFile("html")}
                disabled={!sheet}
              >
                Export as HTML
              </Button>
              <Button
                size="sm"
                icon={Sparkles}
                onClick={() => tighten(Boolean(tightened))}
                disabled={!sheet || request.busy || customEmpty}
              >
                {tightened ? "Tighten again" : "Tighten with Claude"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted">
            {choice.scope === "day"
              ? "About two printed pages: your mistake checklist, insights from starred and tricky problems, and your weakest must-know concepts."
              : choice.scope === "week"
                ? "Grouped by subject, a page each: every learning and fading must-know concept, every pattern with its signals and template, and the insights of your solved problems."
                : "Pick subjects, topics or patterns. The sheet gathers their interview points, patterns with templates, and your insights."}
          </p>
          {choice.scope === "custom" && (
            <div className="grid gap-3 md:grid-cols-3">
              <MultiCombobox
                label="Subjects"
                options={options.subjects}
                value={[...(choice.subjects ?? [])]}
                onChange={(subjects) => setChoice({ ...choice, subjects })}
                placeholder="Add subjects"
              />
              <MultiCombobox
                label="Topics"
                options={options.topics}
                value={[...(choice.topics ?? [])]}
                onChange={(topics) => setChoice({ ...choice, topics })}
                placeholder="Add topics"
                limit={40}
              />
              <MultiCombobox
                label="Patterns"
                options={options.patterns}
                value={[...(choice.patterns ?? [])]}
                onChange={(patterns) => setChoice({ ...choice, patterns })}
                placeholder="Add patterns"
                limit={40}
              />
            </div>
          )}
        </section>

        {printBlocked && (
          <Callout
            className="print:hidden"
            tone="info"
            title="Printing is blocked in this view"
            actions={
              <Button size="sm" icon={FileCode2} onClick={() => void exportFile("html")}>
                Export as HTML
              </Button>
            }
          >
            Export the sheet as HTML, open the file in your browser, and print it from there. It
            prints in the light theme with a page per subject.
          </Callout>
        )}

        {request.state.phase !== "done" && (
          <AIRunView
            className="print:hidden"
            request={request}
            showStream={false}
            thinkingLabel="Claude is tightening your sheet…"
          />
        )}

        {tightened && (
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <SegmentedControl<"original" | "tightened">
              label="Which version"
              value={showing}
              onChange={setView}
              options={[
                { value: "original", label: "Your sheet" },
                { value: "tightened", label: "Tightened by Claude" },
              ]}
            />
            {showing === "tightened" && (
              <span className="text-sm text-muted">
                About {tightened.target} words. Your original stays one tap away.
              </span>
            )}
          </div>
        )}

        {!ready || !profile || !model ? (
          <Skeleton className="h-96 w-full" />
        ) : loadFailed ? (
          <Callout
            tone="warning"
            title="Couldn't load the concept text"
            actions={
              <Button size="sm" onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          >
            The sheet needs the text of the concepts it lists. Reload the page to try again.
          </Callout>
        ) : customEmpty ? (
          <EmptyState icon={ScrollText} drawing="trail" title="Choose what goes on the sheet">
            Pick one or more subjects, topics or patterns above.
          </EmptyState>
        ) : !sheet ? (
          <div className="space-y-3" role="status" aria-label="Building your sheet">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <article
            className={cx(
              "revision-sheet rounded-panel bg-surface px-4 py-5 sm:px-8 sm:py-7",
              "print:rounded-none print:border-0 print:p-0",
            )}
            aria-label={sheet.title}
          >
            <header className="mb-5 border-b border-rule pb-4 print:border-rule">
              <p className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-text print:font-sans">
                {sheet.title}
                {showing === "tightened" && <ClaudeTag label="Edited by Claude" />}
              </p>
              <p className="mt-1 text-sm text-muted">
                {sheet.dateLabel}. Made from your own progress in Atlas
                {showing === "tightened"
                  ? ", then tightened by Claude. Check anything that looks off against your original."
                  : "."}
              </p>
              {showing === "tightened" && tightened && tightened.left.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  These sections were too long to send with the rest and are only in your original:{" "}
                  {tightened.left.join(", ")}.
                </p>
              )}
            </header>
            <div ref={sheetRef}>
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                {showing === "tightened" && tightened ? (
                  <section className="sheet-section">
                    <MarkdownView>{withoutTitle(tightened.markdown)}</MarkdownView>
                  </section>
                ) : (
                  sheet.sections.map((s) => (
                    <section
                      key={s.id}
                      className={cx("sheet-section", s.newPage && "sheet-page-break")}
                    >
                      <MarkdownView>{s.markdown}</MarkdownView>
                    </section>
                  ))
                )}
              </Suspense>
            </div>
            <div ref={endRef} aria-hidden="true" className="h-px print:hidden" />
          </article>
        )}
      </div>
    </PageFrame>
  );
}
