// The Learn tab (F3): Simple | Interview | Deep, remembered per concept; connections (Learn first,
// Unlocks, Connected ideas); interview questions with hidden answers; and the ways to check
// yourself. A concept without written content shows what it covers and "Explain with Claude".
// The text loads with its subject (data/content.ts); a skeleton shows meanwhile.
import {
  BookmarkCheck,
  BookOpenText,
  Layers,
  MessageSquareText,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Callout, CodeSpans, EmptyState, Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { dependentsOf, hasCoreContent } from "@/data/syllabus";
import { isCustomConceptId } from "@/lib/concepts/custom";
import type { Concept, ConceptContent, ConceptState } from "@/lib/types";
import { openExplainBack, openFlashcards } from "@/stores/conceptDialogStore";
import { useConceptNoteStore } from "@/stores/conceptNoteStore";
import { setLastLevel, useConceptState, useConceptStatus } from "@/stores/conceptStateStore";
import { useConceptContent } from "@/stores/contentStore";
import { useUiStore } from "@/stores/uiStore";
import { LaterClaudeButton } from "../problems/parts";
import { toggleStudied } from "./conceptActions";
import { ConceptLink } from "./ConceptLink";
import { ContentUnavailable } from "./ContentUnavailable";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

type Level = NonNullable<ConceptState["lastLevelOpened"]>;

function Block({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-rule pt-4">
      <h3 id={id} className="mb-2 text-base font-semibold text-text">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Levels({
  concept,
  content,
  onOpenConcept,
}: {
  concept: Concept;
  content: ConceptContent;
  onOpenConcept?: (id: string) => void;
}) {
  const state = useConceptState(concept.id);
  const status = useConceptStatus(concept.id);
  const initial: Level =
    state?.lastLevelOpened ?? (status === "not_started" ? "simple" : "interview");
  const [level, setLevel] = useState<Level>(
    initial === "deep" && !content.deep ? "interview" : initial,
  );
  const choose = (next: Level) => {
    setLevel(next);
    setLastLevel(concept.id, next);
  };
  const text =
    level === "simple"
      ? content.simple
      : level === "interview"
        ? content.interview.map((b) => `- ${b}`).join("\n")
        : (content.deep ?? "");
  return (
    <div className="space-y-4">
      <SegmentedControl<Level>
        label="Depth"
        value={level}
        onChange={choose}
        options={[
          { value: "simple", label: "Simple" },
          { value: "interview", label: "Interview" },
          ...(content.deep ? [{ value: "deep" as const, label: "Deep" }] : []),
        ]}
      />
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <MarkdownView onConceptLink={onOpenConcept}>{text}</MarkdownView>
      </Suspense>
      {level === "interview" && !state?.studied && (
        <Callout
          icon={BookmarkCheck}
          actions={
            <Button size="sm" onClick={() => toggleStudied(concept)}>
              Mark as studied
            </Button>
          }
        >
          Read the interview points? Mark it as studied and it comes back for a short review.
        </Callout>
      )}
    </div>
  );
}

function MissingContent({ concept, onWriteNotes }: { concept: Concept; onWriteNotes: () => void }) {
  const note = useConceptNoteStore((s) => s.notes[concept.id]);
  if (isCustomConceptId(concept.id)) {
    return note?.markdown.trim() ? (
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <MarkdownView>{note.markdown}</MarkdownView>
      </Suspense>
    ) : (
      <EmptyState
        icon={PencilLine}
        title="This is your own concept"
        compact
        actions={
          <Button size="sm" icon={PencilLine} onClick={onWriteNotes}>
            Write notes
          </Button>
        }
      >
        What you write in its notes shows here. Claude can draft an explanation once the Claude
        features arrive in phase 6.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={BookOpenText}
      title="The explanation is still being written"
      compact
      actions={
        <LaterClaudeButton size="sm" label="Explain with Claude" title="Explain with Claude">
          Claude will write the simple and interview levels for {concept.name}, using what it
          covers. You can keep the answer in this concept's notes. This arrives with the Claude
          features in phase 6.
        </LaterClaudeButton>
      }
    >
      Content is added subject by subject. Until then, the scope above says what it covers.
    </EmptyState>
  );
}

interface LearnTabProps {
  concept: Concept;
  onOpenConcept?: (id: string) => void;
  onWriteNotes: () => void;
}

export function LearnTab({ concept, onOpenConcept, onWriteNotes }: LearnTabProps) {
  const state = useConceptState(concept.id);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  const unlocks = dependentsOf.get(concept.id) ?? [];
  const { value: content, failed, retry } = useConceptContent(concept);
  const questions = content?.questions ?? [];
  return (
    <div className="space-y-5">
      <p className="max-w-[70ch] text-base text-muted">
        <span className="font-medium text-text">Covers: </span>
        <CodeSpans text={concept.scope} />
      </p>
      {!hasCoreContent(concept) ? (
        <MissingContent concept={concept} onWriteNotes={onWriteNotes} />
      ) : content ? (
        <Levels
          key={concept.id}
          concept={concept}
          content={content}
          onOpenConcept={onOpenConcept}
        />
      ) : failed ? (
        <ContentUnavailable onRetry={retry} />
      ) : (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={BookmarkCheck}
          variant={state?.studied ? "secondary" : "primary"}
          aria-pressed={Boolean(state?.studied)}
          onClick={() => toggleStudied(concept)}
        >
          {state?.studied ? "Studied" : "Mark as studied"}
        </Button>
        <Button
          size="sm"
          icon={Layers}
          onClick={() =>
            openFlashcards({ conceptIds: [concept.id], title: `Flashcards: ${concept.name}` })
          }
        >
          Flashcards
        </Button>
        <Button size="sm" icon={MessageSquareText} onClick={() => openExplainBack(concept.id)}>
          Explain it back
        </Button>
        <LaterClaudeButton size="sm" label="Quick quiz" title="Quick quiz with Claude">
          Claude will write five questions on {concept.name} (multiple choice and short answer),
          grade them, and record the result. Until phase 6, flashcards and explaining it back check
          you offline.
        </LaterClaudeButton>
        <Button size="sm" icon={Sparkles} variant="ghost" onClick={() => setAskOpen(true)}>
          Ask Claude
        </Button>
      </div>

      {questions.length > 0 && (
        <Block title="Interview questions" id={`${concept.id}-questions`}>
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {questions.map((qa, i) => (
              <li key={i}>
                <details className="group px-3 py-2">
                  <summary className="cursor-pointer list-none py-0.5 font-medium text-text marker:hidden">
                    {qa.q}
                    <span className="ml-2 text-sm font-normal text-accent group-open:hidden">
                      Show answer
                    </span>
                  </summary>
                  <p className="mt-1 max-w-[70ch] text-base text-muted">{qa.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Learn first" id={`${concept.id}-prereqs`}>
        {concept.prereqs.length === 0 ? (
          <p className="text-base text-muted">Nothing. You can start here.</p>
        ) : (
          <ul className="space-y-0.5">
            {concept.prereqs.map((id) => (
              <ConceptLink key={id} id={id} onOpen={onOpenConcept} />
            ))}
          </ul>
        )}
      </Block>
      <Block title="Unlocks" id={`${concept.id}-unlocks`}>
        {unlocks.length === 0 ? (
          <p className="text-base text-muted">No concepts build directly on this one.</p>
        ) : (
          <ul className="space-y-0.5">
            {unlocks.map((id) => (
              <ConceptLink key={id} id={id} onOpen={onOpenConcept} />
            ))}
          </ul>
        )}
      </Block>
      {concept.related.length > 0 && (
        <Block title="Connected ideas" id={`${concept.id}-related`}>
          <ul className="space-y-0.5">
            {concept.related.map((link) => (
              <ConceptLink key={link.to} id={link.to} detail={link.reason} onOpen={onOpenConcept} />
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}
