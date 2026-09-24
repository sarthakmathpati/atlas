// The Phase 0 and 1 preview page: the foundations that are ready, a picture of the whole map, the
// full syllabus, and a working backup. Phase 2 replaces this page with the real app shell.
import { Check, Circle, Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { syllabus } from "@/data/syllabus";
import { APP_EMOJI, APP_NAME } from "@/lib/constants";
import { backupFilename } from "@/lib/storage/exportImport";
import { MapPreview } from "./MapPreview";
import { SyllabusExplorer } from "./SyllabusExplorer";
import { TextFileDialog } from "./TextFileDialog";
import { ThemeToggle } from "./ThemeToggle";

const STATS: { label: string; value: number; note?: string }[] = [
  { label: "Subjects", value: syllabus.counts.subjects },
  { label: "Topics", value: syllabus.counts.topics },
  { label: "Concepts", value: syllabus.counts.concepts, note: `${syllabus.counts.must} must-know` },
  { label: "DSA patterns", value: syllabus.counts.patterns },
  { label: "LeetCode problems", value: LEETCODE_PROBLEMS.length },
  { label: "Quant puzzles", value: QUANT_PUZZLES.length },
  { label: "Design prompts", value: DESIGN_PROBLEMS.length },
  { label: "Behavioral questions", value: BEHAVIORAL_QUESTIONS.length },
];

const PHASES: { title: string; detail: string; state: "done" | "next" | "later" }[] = [
  {
    title: "Project setup",
    detail: "Two builds: this website and a Claude artifact.",
    state: "done",
  },
  {
    title: "Data foundation",
    detail: "Syllabus, map layout, practice banks, storage and backups.",
    state: "done",
  },
  {
    title: "Design system and app shell",
    detail: "Navigation, settings and search.",
    state: "next",
  },
  {
    title: "Everything else",
    detail: "Problem tracker, the zoomable map, content, Claude, daily plans and practice.",
    state: "later",
  },
];

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-panel border border-rule bg-surface ${className}`}>
      <h2 className="border-b border-rule px-4 py-3 text-md font-semibold text-text">{title}</h2>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function DataPanel() {
  const state = useServicesState();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === "connecting") {
    return (
      <Panel title="Your data">
        <p className="text-base text-muted" role="status">
          Connecting to storage…
        </p>
      </Panel>
    );
  }
  if (state.status === "error") {
    return (
      <Panel title="Your data">
        <p className="text-base text-muted">{state.message}</p>
        <button
          type="button"
          onClick={state.retry}
          className="mt-3 h-10 rounded-control border border-rule px-4 text-base font-medium text-text hover:bg-surface-sunken"
        >
          Try again
        </button>
      </Panel>
    );
  }

  const { runtime, repository, fileSaver, storageNotice } = state.services;
  const where =
    repository.kind === "claude-db"
      ? "Synced to your Claude account, so it follows you across devices."
      : repository.kind === "dexie"
        ? "Saved in this browser. Backups move it to another device."
        : "Not saved: this browser is blocking storage.";
  const claude = runtime.sample
    ? "Built in, using your own Claude plan."
    : "Copy-prompt mode, which works everywhere. Claude features arrive in a later phase.";

  const exportBackup = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const backup = await repository.exportAll();
      const result = await fileSaver.save({
        filename: backupFilename(),
        data: JSON.stringify(backup, null, 2),
        mime: "application/json",
      });
      if (result.status === "saved" || result.status === "shown-in-dialog") {
        await repository.profile.patch({ lastBackupAt: new Date().toISOString() });
        setMessage(result.status === "saved" ? "Backup exported." : null);
      } else if (result.status === "declined") {
        setMessage("Export cancelled.");
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Couldn't export right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Your data">
      <dl className="space-y-3 text-base">
        <div>
          <dt className="text-sm text-muted">Where it lives</dt>
          <dd className="text-text">{where}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Claude</dt>
          <dd className="text-text">{claude}</dd>
        </div>
      </dl>
      {storageNotice && (
        <p className="mt-3 rounded-control border border-rule bg-surface-sunken px-3 py-2 text-sm text-muted">
          {storageNotice}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportBackup}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-control bg-accent px-4 text-base font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60 sm:h-10"
        >
          <Download size={16} aria-hidden="true" />
          Export backup
        </button>
        <span className="text-sm text-muted" role="status">
          {message}
        </span>
      </div>
      <p className="mt-2 text-xs text-faint">
        {runtime.kind === "artifact" ? "Running as a Claude artifact." : "Running as a web app."}
      </p>
    </Panel>
  );
}

export function FoundationPreview() {
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null);

  const selectFromMap = (id: string) => {
    setSelected(id);
    setOpen((prev) => new Set(prev).add(id));
    setFocusRequest((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
  };

  const toggleSubject = (id: string) => {
    const opening = !open.has(id);
    setOpen((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    setSelected(opening ? id : null);
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-rule bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-xl leading-none">
              {APP_EMOJI}
            </span>
            <span className="text-lg font-semibold tracking-tight text-text">{APP_NAME}</span>
            <span className="ml-1 rounded-full border border-rule px-2 py-0.5 text-xs text-muted">
              Preview
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="lg:col-start-1 lg:row-start-1">
            <div>
              <h1 className="text-2xl text-text sm:text-3xl">
                Your map for SDE and quant interviews
              </h1>
              <p className="mt-4 max-w-[62ch] text-md text-muted">
                Atlas puts everything you need for SDE and quant interviews on one map: every idea
                from arrays to options pricing, linked by what to learn first. Each idea will be
                colored by how well you really know it, based on the problems you solve and the
                checks you pass.
              </p>
              <p className="mt-3 max-w-[62ch] text-base text-muted">
                This is an early preview. The app is built in phases, and this page shows the parts
                that are ready.
              </p>
            </div>
          </div>
          <div className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <section
              aria-labelledby="map-heading"
              className="overflow-hidden rounded-panel border border-rule bg-canvas"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-surface px-4 py-3">
                <h2 id="map-heading" className="text-md font-semibold text-text">
                  The map
                </h2>
                <p className="text-sm text-muted">Pick a region to see its topics below.</p>
              </div>
              <div className="p-2 sm:p-4">
                <MapPreview selected={selected} onSelect={selectFromMap} />
              </div>
            </section>
            <dl className="grid grid-cols-2 overflow-hidden rounded-panel border border-rule bg-surface sm:grid-cols-4">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="border-rule px-4 py-3 not-last:border-b sm:border-r sm:[&:nth-child(4n)]:border-r-0 sm:[&:nth-last-child(-n+4)]:border-b-0"
                >
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="text-xl font-medium text-text tabular-nums">
                    {s.value}
                    {s.note && (
                      <span className="ml-2 text-sm font-normal text-muted">{s.note}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-6 lg:col-start-1 lg:row-start-2">
            <Panel title="Build progress">
              <ol className="space-y-3">
                {PHASES.map((phase) => (
                  <li key={phase.title} className="flex gap-3">
                    <span className="mt-0.5 shrink-0">
                      {phase.state === "done" ? (
                        <span className="grid size-5 place-items-center rounded-full bg-strong text-canvas">
                          <Check size={13} strokeWidth={3} aria-hidden="true" />
                        </span>
                      ) : (
                        <Circle
                          size={20}
                          strokeWidth={phase.state === "next" ? 2.25 : 1.5}
                          className={phase.state === "next" ? "text-accent" : "text-faint"}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-text">
                        {phase.title}
                        <span className="sr-only">
                          {phase.state === "done"
                            ? " (done)"
                            : phase.state === "next"
                              ? " (next)"
                              : " (later)"}
                        </span>
                        {phase.state === "next" && (
                          <span className="ml-2 text-sm font-normal text-accent">Next</span>
                        )}
                      </p>
                      <p className="text-sm text-muted">{phase.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <DataPanel />
          </div>
        </div>

        <div className="mt-12">
          <SyllabusExplorer
            selected={selected}
            open={open}
            onToggle={toggleSubject}
            focusRequest={focusRequest}
          />
        </div>
      </main>
      <TextFileDialog />
    </div>
  );
}
