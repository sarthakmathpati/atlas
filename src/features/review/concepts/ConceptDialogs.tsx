// The concept activities, rendered once in the shell (see stores/conceptDialogStore):
//   - Flashcards (F14, offline): one concept, a topic, a subject or everything due.
//   - Explain it back (F13, offline self-check): write it, then tick the points you covered.
//   - Concept review (F9): the interview points, then flashcards or explain it back.
//   - Set status (F4): automatic or a manual status, and "never fade".
//   - Add a concept (F2): the owner's own bubble in a topic.
import { BookOpenText, Layers, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";
import { navigate, routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Switch, Textarea, type SelectOption } from "@/components/ui/Field";
import { IMPORTANCE_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/components/ui/labels";
import { CodeSpans, Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { subjects, topicById, topicsBySubject } from "@/data/syllabus";
import { deckSize } from "@/lib/review/flashcards";
import {
  MIN_EXPLAIN_WORDS,
  plainText,
  selfCheckItems,
  selfCheckScore,
  wordCount,
} from "@/lib/review/selfCheck";
import type { Importance, Status } from "@/lib/types";
import { openExplainBack, openFlashcards, useConceptDialogs } from "@/stores/conceptDialogStore";
import {
  recordChecks,
  restoreConceptState,
  setManualStatus,
  setNeverFade,
  useConceptState,
} from "@/stores/conceptStateStore";
import { useConceptContent } from "@/stores/contentStore";
import { addCustomConcept, findConcept, useConcept } from "@/stores/customConceptStore";
import { toast } from "@/stores/toastStore";
import { ContentUnavailable } from "../../concept/ContentUnavailable";
import { FlashcardIntro, FlashcardSession } from "./FlashcardSession";

// ----- flashcards ------------------------------------------------------------------------------

function FlashcardsDialog() {
  const request = useConceptDialogs((s) => s.flashcards);
  const [started, setStarted] = useState<string | null>(null);
  const key = request ? `${request.title}|${request.conceptIds.join(",")}` : null;
  const deck = useMemo(() => {
    if (!request) return { cards: 0, covered: 0 };
    return deckSize(request.conceptIds.map((id) => findConcept(id)).filter((c) => c !== undefined));
  }, [request]);
  const close = () => {
    setStarted(null);
    useConceptDialogs.setState({ flashcards: null });
  };
  // A single concept starts right away; bigger sessions show how many cards first.
  const autoStart = request?.conceptIds.length === 1;
  const running = key !== null && (autoStart || started === key);
  return (
    <Dialog
      open={request !== null}
      onClose={close}
      title={request?.title ?? "Flashcards"}
      size="md"
    >
      {request &&
        (running ? (
          <FlashcardSession
            key={key}
            conceptIds={request.conceptIds}
            session={request.session}
            onDone={close}
          />
        ) : (
          <FlashcardIntro
            count={request.conceptIds.length}
            covered={deck.covered}
            cards={deck.cards}
            onStart={() => setStarted(key)}
          />
        ))}
    </Dialog>
  );
}

// ----- explain it back -------------------------------------------------------------------------

function ExplainBody({
  conceptId,
  session,
  onDone,
}: {
  conceptId: string;
  session?: boolean;
  onDone: () => void;
}) {
  const concept = useConcept(conceptId);
  const [text, setText] = useState("");
  const [step, setStep] = useState<"write" | "check" | "done">("write");
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [score, setScore] = useState(0);
  // The points to tick come from the interview level, which loads while the owner writes.
  const { value: content, failed, retry } = useConceptContent(concept);
  const items = useMemo(
    () => (concept && content ? selfCheckItems(concept, content) : []),
    [concept, content],
  );
  if (!concept) return null;
  const words = wordCount(text);
  const enough = words >= MIN_EXPLAIN_WORDS;
  const fromScope = (content?.interview.length ?? 0) === 0;

  const save = () => {
    const s = selfCheckScore(ticked.size, items.length);
    recordChecks(
      [
        {
          conceptId,
          kind: "explain",
          score: s,
          detail: {
            mode: "self",
            text: text.trim(),
            covered: items.filter((i) => ticked.has(i.id)).map((i) => i.text),
            missed: items.filter((i) => !ticked.has(i.id)).map((i) => i.text),
          },
        },
      ],
      { session },
    );
    setScore(s);
    setStep("done");
  };

  if (step === "write") {
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <Field
          label={`Explain ${concept.name} as if to a friend who's never heard of it`}
          hint={
            <span className={cx("tabular-nums", enough && "text-success")} aria-live="polite">
              {enough
                ? `${words} words. Enough to check.`
                : `${words} of ${MIN_EXPLAIN_WORDS} words. A few sentences in your own words.`}
            </span>
          }
        >
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What it is, why it matters, how it works, and when you'd use it."
            data-autofocus
          />
        </Field>
        <div className="flex justify-end">
          <Button variant="primary" disabled={!enough} onClick={() => setStep("check")}>
            Check my explanation
          </Button>
        </div>
      </div>
    );
  }

  if (step === "check" && !content) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        {failed ? (
          <ContentUnavailable onRetry={retry} />
        ) : (
          <div role="status" aria-label="Loading the points to check">
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => setStep("write")}>
            Edit my explanation
          </Button>
        </div>
      </div>
    );
  }

  if (step === "check") {
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <p className="text-base text-text">
          Tick the points your explanation covered. Be honest: this sets when it comes back.
        </p>
        {fromScope && (
          <p className="text-sm text-muted">
            These come from what the concept covers, until its interview points are written.
          </p>
        )}
        <fieldset>
          <legend className="sr-only">Points you covered</legend>
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface-sunken">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                    checked={ticked.has(item.id)}
                    onChange={(e) => {
                      const next = new Set(ticked);
                      if (e.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      setTicked(next);
                    }}
                  />
                  <span className="text-base text-text">{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Your explanation</summary>
          <p className="mt-2 whitespace-pre-wrap text-text">{text}</p>
        </details>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => setStep("write")}>
            Edit my explanation
          </Button>
          <Button variant="primary" onClick={save}>
            Save result
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-5 sm:px-5" role="status">
      <p className="text-lg font-semibold text-text">
        You covered {ticked.size} of {items.length} points ({Math.round(score * 100)}%)
      </p>
      <p className="text-base text-muted">
        {score >= 0.8
          ? "A strong explanation. It counts toward this concept turning green."
          : "Read the points you missed, then try again another day. Your explanation is saved in the concept's notes."}
      </p>
      {items.some((i) => !ticked.has(i.id)) && (
        <ul className="list-disc space-y-1 pl-5 text-base text-text">
          {items
            .filter((i) => !ticked.has(i.id))
            .map((i) => (
              <li key={i.id}>{plainText(i.text)}</li>
            ))}
        </ul>
      )}
      <p className="text-sm text-muted">Claude feedback on explanations arrives in phase 6.</p>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function ExplainBackDialog() {
  const request = useConceptDialogs((s) => s.explain);
  const concept = useConcept(request?.conceptId);
  const close = () => useConceptDialogs.setState({ explain: null });
  return (
    <Dialog
      open={request !== null}
      onClose={close}
      title={concept ? `Explain it back: ${concept.name}` : "Explain it back"}
      size="md"
      closeOnBackdrop={false}
    >
      {request && (
        <ExplainBody
          key={request.conceptId}
          conceptId={request.conceptId}
          session={request.session}
          onDone={close}
        />
      )}
    </Dialog>
  );
}

// ----- concept review --------------------------------------------------------------------------

function ConceptReviewDialog() {
  const conceptId = useConceptDialogs((s) => s.review);
  const concept = useConcept(conceptId ?? undefined);
  const close = () => useConceptDialogs.setState({ review: null });
  const { value: content, failed, retry } = useConceptContent(concept);
  const points = content?.interview ?? [];
  return (
    <Dialog
      open={conceptId !== null}
      onClose={close}
      title={concept ? `Review: ${concept.name}` : "Review"}
      description="Read the key points, then check yourself. How it goes sets the next review."
      size="md"
      footer={
        concept && (
          <>
            <Button
              icon={MessageSquareText}
              onClick={() => {
                close();
                openExplainBack(concept.id, true);
              }}
            >
              Explain it back
            </Button>
            <Button
              variant="primary"
              icon={Layers}
              onClick={() => {
                close();
                openFlashcards({
                  conceptIds: [concept.id],
                  title: `Flashcards: ${concept.name}`,
                  session: true,
                });
              }}
            >
              Flashcards
            </Button>
          </>
        )
      }
    >
      {concept && (
        <div className="px-4 py-4 sm:px-5">
          {failed ? (
            <ContentUnavailable onRetry={retry} />
          ) : !content ? (
            <Skeleton className="h-32 w-full" />
          ) : points.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5 text-base text-text">
              {points.map((p) => (
                <li key={p}>{plainText(p)}</li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-muted">
                <BookOpenText size={16} aria-hidden="true" />
                What it covers
              </p>
              <p className="text-base text-text">
                <CodeSpans text={concept.scope} />
              </p>
              <p className="text-sm text-muted">
                The interview points for this concept are still being written.
              </p>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

// ----- manual status ---------------------------------------------------------------------------

type Choice = "auto" | Status;

function StatusDialogBody({ conceptId, onDone }: { conceptId: string; onDone: () => void }) {
  const concept = useConcept(conceptId);
  const state = useConceptState(conceptId);
  const [choice, setChoice] = useState<Choice>(state?.manualStatus ?? "auto");
  const [neverFade, setNever] = useState(Boolean(state?.neverFade));
  if (!concept) return null;
  const save = () => {
    const before = state ?? null;
    if ((state?.manualStatus ?? "auto") !== choice)
      setManualStatus(conceptId, choice === "auto" ? null : choice);
    if (Boolean(state?.neverFade) !== neverFade) setNeverFade(conceptId, neverFade);
    onDone();
    toast(
      choice === "auto"
        ? "Status follows your progress again."
        : `Status set to ${STATUS_LABEL[choice].toLowerCase()}.`,
      {
        action: { label: "Undo", onClick: () => restoreConceptState(conceptId, before) },
      },
    );
  };
  const options: { value: Choice; label: string; detail: string }[] = [
    { value: "auto", label: "Automatic", detail: "From your checks, problems and reviews." },
    ...STATUS_ORDER.map((s) => ({
      value: s as Choice,
      label: STATUS_LABEL[s],
      detail:
        s === "strong"
          ? "Counts as a manual check. It still fades when a review is overdue."
          : s === "not_started"
            ? "Shows it as not started, whatever the evidence."
            : s === "learning"
              ? "Keeps it yellow until you change it back."
              : "Flags it for review.",
    })),
  ];
  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">Status for {concept.name}</legend>
          <div
            className="divide-y divide-rule rounded-control border border-rule"
            role="radiogroup"
          >
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface-sunken"
              >
                <input
                  type="radio"
                  name="manual-status"
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                />
                {o.value !== "auto" && (
                  <StatusGlyph status={o.value} size={16} className="mt-0.5" />
                )}
                <span className="min-w-0">
                  <span className="block text-base text-text">{o.label}</span>
                  <span className="block text-sm text-muted">{o.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Switch
          label="Never fade"
          description="For trivial concepts: it stays strong even when a review is overdue."
          checked={neverFade}
          onChange={setNever}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-rule px-4 py-3 sm:px-5">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </div>
    </>
  );
}

function StatusDialog() {
  const conceptId = useConceptDialogs((s) => s.status);
  const close = () => useConceptDialogs.setState({ status: null });
  return (
    <Dialog open={conceptId !== null} onClose={close} title="Set status" size="sm">
      {conceptId && <StatusDialogBody key={conceptId} conceptId={conceptId} onDone={close} />}
    </Dialog>
  );
}

// ----- add a concept ---------------------------------------------------------------------------

const TOPIC_OPTIONS: SelectOption[] = [
  { value: "", label: "Choose a topic" },
  ...subjects.flatMap((s) =>
    (topicsBySubject.get(s.id) ?? []).map((t) => ({ value: t.id, label: t.name, group: s.name })),
  ),
];

function AddConceptBody({ initialTopic, onDone }: { initialTopic: string; onDone: () => void }) {
  const [topicId, setTopicId] = useState(initialTopic);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [importance, setImportance] = useState<Importance>("important");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!topicId) return setError("Choose the topic it belongs to.");
    if (!trimmed) return setError("Give it a name.");
    // The map places it next to its topic the first time it draws it, and keeps that spot.
    const id = addCustomConcept({ topicId, name: trimmed, scope, importance });
    onDone();
    toast(`${trimmed} added to ${topicById.get(topicId)?.name}.`, {
      action: {
        label: "Show it",
        onClick: () => navigate(routeHref("/map", undefined, { focus: id })),
      },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <Field label="Topic">
          <Select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            options={TOPIC_OPTIONS}
          />
        </Field>
        <Field label="Name" error={error && !name.trim() ? error : null}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="For example: Euler tour technique"
            data-autofocus
          />
        </Field>
        <Field
          label="What it covers"
          hint="Optional. A short line, like the scope of other concepts."
        >
          <Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Importance</span>
          <SegmentedControl<Importance>
            label="Importance"
            value={importance}
            onChange={setImportance}
            full
            options={(["must", "important", "advanced"] as Importance[]).map((i) => ({
              value: i,
              label: IMPORTANCE_LABEL[i],
            }))}
          />
        </div>
        {error && topicId && name.trim() && <p className="text-sm text-danger">{error}</p>}
        {!topicId && error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-rule px-4 py-3 sm:px-5">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          Add concept
        </Button>
      </div>
    </>
  );
}

function AddConceptDialog() {
  const topicId = useConceptDialogs((s) => s.addConcept);
  const close = () => useConceptDialogs.setState({ addConcept: null });
  return (
    <Dialog
      open={topicId !== null}
      onClose={close}
      title="Add a concept"
      description="Your own bubble on the map. Write its notes yourself, or ask Claude once the Claude features arrive."
      size="sm"
    >
      {topicId !== null && <AddConceptBody key={topicId} initialTopic={topicId} onDone={close} />}
    </Dialog>
  );
}

export default function ConceptDialogs() {
  return (
    <>
      <FlashcardsDialog />
      <ExplainBackDialog />
      <ConceptReviewDialog />
      <StatusDialog />
      <AddConceptDialog />
    </>
  );
}
