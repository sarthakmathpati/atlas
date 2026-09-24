// Map (F2). The zoomable canvas arrives in phase 4; until then the page shows the whole map as a
// picture (from the precomputed layout) and the full list view, and understands the same links
// the canvas will: #/map?subject=<id>, #/map?topic=<id> and #/map?focus=<conceptId>.
import { useMemo, useState } from "react";
import { navigate, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { conceptById, subjectById, topicById } from "@/data/syllabus";
import { MapListView, type ListTarget } from "./MapListView";
import { MapPreview } from "./MapPreview";

function targetFromQuery(query: URLSearchParams, key: string): ListTarget | null {
  const focus = query.get("focus");
  if (focus && conceptById.has(focus)) return { kind: "concept", id: focus, key };
  const topic = query.get("topic");
  if (topic && topicById.has(topic)) return { kind: "topic", id: topic, key };
  const subject = query.get("subject");
  if (subject && subjectById.has(subject)) return { kind: "subject", id: subject, key };
  return null;
}

function subjectOf(target: ListTarget | null): string | null {
  if (!target) return null;
  if (target.kind === "subject") return target.id;
  if (target.kind === "topic") return topicById.get(target.id)?.subjectId ?? null;
  return conceptById.get(target.id)?.subjectId ?? null;
}

export default function MapPage() {
  const route = useRoute();
  const queryKey = route.query.toString();
  // A link such as #/map?focus=… targets a concept, topic or subject: open it and scroll to it.
  const target = useMemo(
    () => targetFromQuery(new URLSearchParams(queryKey), queryKey),
    [queryKey],
  );
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const s = subjectOf(target);
    return new Set(s ? [s] : []);
  });
  const [openedFor, setOpenedFor] = useState(queryKey);
  if (openedFor !== queryKey) {
    setOpenedFor(queryKey);
    const s = subjectOf(target);
    if (s && !open.has(s)) setOpen(new Set(open).add(s));
  }

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRegion = (id: string) => navigate(`/map?subject=${encodeURIComponent(id)}`);
  const selectedSubject = subjectOf(target);

  return (
    <PageFrame>
      <PageHeader
        title="Map"
        description="Everything you need for SDE and quant interviews, linked by what to learn first. The zoomable, colored map arrives in phase 4; here is the whole picture and every concept as a list."
      />
      <section
        aria-labelledby="map-picture-heading"
        className="overflow-hidden rounded-panel border border-rule bg-canvas"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-surface px-4 py-3">
          <h2 id="map-picture-heading" className="text-md font-semibold text-text">
            The whole map
          </h2>
          <p className="text-sm text-muted">Pick a region to open it in the list below.</p>
        </div>
        <div className="p-2 sm:p-4">
          <MapPreview selected={selectedSubject} onSelect={selectRegion} />
        </div>
      </section>
      <div className="mt-10">
        <MapListView open={open} onToggle={toggle} target={target} />
      </div>
    </PageFrame>
  );
}
