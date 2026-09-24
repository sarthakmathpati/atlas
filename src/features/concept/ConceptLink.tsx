// A concept in a list of connections (Learn first, Unlocks, Connected ideas, a path): status
// glyph, name and a second line. On the map it opens that concept in the panel and flies there;
// elsewhere it is a link to the concept's page.
import { conceptHref } from "@/app/router";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import { topicById } from "@/data/syllabus";
import { useConceptStatus } from "@/stores/conceptStateStore";
import { useConcept } from "@/stores/customConceptStore";

interface ConceptLinkProps {
  id: string;
  detail?: string;
  onOpen?: (id: string) => void;
}

export function ConceptLink({ id, detail, onOpen }: ConceptLinkProps) {
  const concept = useConcept(id);
  const status = useConceptStatus(id);
  if (!concept) return null;
  const body = (
    <>
      <StatusGlyph status={status} size={14} title={STATUS_LABEL[status]} className="mt-1" />
      <span className="min-w-0">
        <span className="block text-base text-text">{concept.name}</span>
        <span className="block text-sm text-muted">
          {detail ?? topicById.get(concept.topicId)?.name ?? ""}
        </span>
      </span>
    </>
  );
  const cls =
    "-mx-2 flex w-[calc(100%+16px)] items-start gap-2.5 rounded-control px-2 py-1.5 text-left hover:bg-surface-sunken";
  return (
    <li>
      {onOpen ? (
        <button type="button" className={cls} onClick={() => onOpen(id)}>
          {body}
        </button>
      ) : (
        <a href={conceptHref(id)} className={cls}>
          {body}
        </a>
      )}
    </li>
  );
}
