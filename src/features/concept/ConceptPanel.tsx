// The concept panel (F3): header (where it sits, name, status with "Why this color?", importance,
// minutes, tracks, badges) and the Learn, Practice, Notes and Ask tabs. The map shows it as a side
// panel or a bottom sheet with back and forward through the concepts visited; #/concept/<id> shows
// it as a page.
import { ArrowLeft, ArrowRight, MoreHorizontal, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { routeHref } from "@/app/router";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, ImportanceChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Menu } from "@/components/ui/Popover";
import { Tabs } from "@/components/ui/Tabs";
import { subjectById, topicById } from "@/data/syllabus";
import { isCustomConceptId } from "@/lib/concepts/custom";
import { problemsForConcept } from "@/lib/problems/catalog";
import type { Concept } from "@/lib/types";
import { useConceptState, useConceptStatus } from "@/stores/conceptStateStore";
import { useProblemStore } from "@/stores/problemStore";
import { useUiStore } from "@/stores/uiStore";
import { conceptMenuItems, hideConcept } from "./conceptActions";
import { LearnTab } from "./LearnTab";
import { NotesTab } from "./NotesTab";
import { PracticeTab } from "./PracticeTab";
import { StatusChipButton } from "./WhyThisColor";

export type PanelTab = "learn" | "practice" | "notes" | "ask";

export function Breadcrumb({ concept, className }: { concept: Concept; className?: string }) {
  const topic = topicById.get(concept.topicId);
  const subject = subjectById.get(concept.subjectId);
  return (
    <nav aria-label="Breadcrumb" className={cx("min-w-0 text-sm text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <a
            href={routeHref("/map", undefined, { subject: concept.subjectId })}
            className="hover:text-text hover:underline"
          >
            {subject?.shortName}
          </a>
        </li>
        <li aria-hidden="true">›</li>
        <li className="min-w-0">
          <a
            href={routeHref("/map", undefined, { topic: concept.topicId })}
            className="hover:text-text hover:underline"
          >
            {topic?.name}
          </a>
        </li>
      </ol>
    </nav>
  );
}

export function ConceptChips({ concept }: { concept: Concept }) {
  const status = useConceptStatus(concept.id);
  const state = useConceptState(concept.id);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusChipButton conceptId={concept.id} status={status} />
      <ImportanceChip importance={concept.importance} />
      {concept.isPattern && (
        <Chip className="border-transparent bg-accent-soft text-accent">Pattern</Chip>
      )}
      <Chip>About {concept.estMinutes} min</Chip>
      {concept.tracks.map((t) => (
        <Chip key={t}>{t === "sde" ? "SDE" : "Quant"}</Chip>
      ))}
      {isCustomConceptId(concept.id) && (
        <Chip className="border-accent/50 text-accent" title="You added this concept">
          Yours
        </Chip>
      )}
      {state?.manualStatus && <Chip title="You set this status yourself">Set by you</Chip>}
      {state?.neverFade && (
        <Chip title="It stays strong even when a review is overdue">Never fades</Chip>
      )}
      {concept.written.needsReview && (
        <Chip
          className="border-dashed text-warning"
          title="Some facts here haven't been double-checked yet"
        >
          Unverified
        </Chip>
      )}
      {state?.hidden && (
        <button
          type="button"
          onClick={() => hideConcept(concept, false)}
          className="inline-flex h-6 items-center rounded-full border border-dashed border-rule-strong px-2 text-xs font-medium text-muted hover:text-text max-md:h-8"
        >
          Hidden from the map. Show it again
        </button>
      )}
    </div>
  );
}

function AskTab({ concept }: { concept: Concept }) {
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  return (
    <div className="space-y-3">
      <p className="text-base text-text">
        Ask Claude about {concept.name}: it will already know this concept, what you've done with
        it, and your notes.
      </p>
      <p className="text-base text-muted">
        The chat inside this tab arrives with the Claude features in phase 6. Until then, the Ask
        Claude panel shows what it will be able to do.
      </p>
      <Button icon={Sparkles} onClick={() => setAskOpen(true)}>
        Open Ask Claude
      </Button>
    </div>
  );
}

interface ConceptTabsProps {
  concept: Concept;
  onOpenConcept?: (id: string) => void;
  /** Wide layouts show the notes editor and preview side by side. */
  wide: boolean;
  className?: string;
}

export function ConceptTabs({ concept, onOpenConcept, wide, className }: ConceptTabsProps) {
  const [tab, setTab] = useState<PanelTab>("learn");
  const problems = useProblemStore((s) => problemsForConcept(concept.id, s.states).length);
  return (
    <Tabs<PanelTab>
      label="Concept"
      value={tab}
      onChange={setTab}
      className={className}
      items={[
        { value: "learn", label: "Learn" },
        { value: "practice", label: "Practice", count: problems },
        { value: "notes", label: "Notes" },
        { value: "ask", label: "Ask" },
      ]}
    >
      {(value) => (
        <div className="pt-4">
          {value === "learn" && (
            <LearnTab
              concept={concept}
              onOpenConcept={onOpenConcept}
              onWriteNotes={() => setTab("notes")}
            />
          )}
          {value === "practice" && <PracticeTab concept={concept} />}
          {value === "notes" && <NotesTab concept={concept} wide={wide} />}
          {value === "ask" && <AskTab concept={concept} />}
        </div>
      )}
    </Tabs>
  );
}

interface ConceptSidePanelProps {
  concept: Concept;
  onOpenConcept: (id: string) => void;
  onClose: () => void;
  onBack?: () => void;
  onForward?: () => void;
  /** Extra header actions (for example "Open as a page"). */
  extra?: ReactNode;
  titleId?: string;
  onDeleted?: () => void;
}

/** The map's panel: compact header with history, then the tabs. */
export function ConceptSidePanel({
  concept,
  onOpenConcept,
  onClose,
  onBack,
  onForward,
  extra,
  titleId,
  onDeleted,
}: ConceptSidePanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-rule px-4 pt-2 pb-3">
        <div className="flex items-center gap-1">
          <IconButton icon={ArrowLeft} label="Back" size="sm" disabled={!onBack} onClick={onBack} />
          <IconButton
            icon={ArrowRight}
            label="Forward"
            size="sm"
            disabled={!onForward}
            onClick={onForward}
          />
          <Breadcrumb concept={concept} className="ml-1 flex-1" />
          {extra}
          <Menu
            label={`More for ${concept.name}`}
            items={conceptMenuItems(concept, { onMap: true, onDeleted })}
            renderTrigger={(props) => (
              <IconButton icon={MoreHorizontal} label="More" size="sm" {...props} />
            )}
          />
          <IconButton icon={X} label="Close panel" size="sm" onClick={onClose} />
        </div>
        <h2 id={titleId} className="mt-1 text-xl font-semibold text-text">
          {concept.name}
        </h2>
        <ConceptChips concept={concept} />
      </div>
      {/* Keyed by concept, so a linked concept opens at the top rather than at the old scroll. */}
      <div key={concept.id} className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <ConceptTabs
          concept={concept}
          onOpenConcept={onOpenConcept}
          wide={false}
        />
      </div>
    </div>
  );
}
