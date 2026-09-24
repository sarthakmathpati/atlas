// Command palette (F23), Ctrl/Cmd + K: fuzzy search over concepts, topics, subjects, problems,
// puzzles, design prompts and mistake tags, plus "Go to" pages and commands. Recent picks show
// when the search is empty. Built on cmdk for keyboard handling; results come from MiniSearch.
import { Command } from "cmdk";
import {
  ArrowRight,
  CirclePlus,
  Clock,
  Code2,
  FileUp,
  Plus,
  CornerDownLeft,
  Download,
  DraftingCompass,
  Keyboard,
  Layers,
  ListChecks,
  Monitor,
  Moon,
  PanelLeft,
  Puzzle,
  Route,
  Search,
  Sparkles,
  Sun,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { navigate, routeHref } from "@/app/router";
import { ALL_NAV_ITEMS } from "@/app/shell/nav";
import { setTheme } from "@/app/theme";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Misc";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { subjectById } from "@/data/syllabus";
import type { SearchHit, SearchKind } from "@/lib/search/searchIndex";
import { openAddConcept, openFlashcards } from "@/stores/conceptDialogStore";
import { useConceptStateStore, useConceptStatus } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { isDue } from "@/lib/srs/intervals";
import { localDate } from "@/lib/time";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { useProblemStore } from "@/stores/problemStore";
import { exportBackup } from "../settings/backup";
import { markSetupStep } from "../today/setupSteps";
import { customConceptDocs, customProblemDocs, getSearchIndex, mistakeTagDocs } from "./docs";
import { pushRecent, readRecents, type RecentItem } from "./recents";

const GROUP_LABEL: Record<SearchKind, string> = {
  concept: "Concepts",
  topic: "Topics",
  subject: "Subjects",
  problem: "Problems",
  puzzle: "Quant puzzles",
  design: "Design prompts",
  mistake: "Mistake tags",
};

const KIND_ICON: Partial<Record<SearchKind, LucideIcon>> = {
  topic: Layers,
  problem: ListChecks,
  puzzle: Puzzle,
  design: DraftingCompass,
  mistake: Tag,
};

function ConceptGlyph({ conceptId }: { conceptId: string }) {
  const status = useConceptStatus(conceptId);
  return <StatusGlyph status={status} size={14} />;
}

function HitIcon({ kind, id }: { kind: SearchKind; id: string }) {
  const raw = id.slice(id.indexOf(":") + 1);
  if (kind === "concept") return <ConceptGlyph conceptId={raw} />;
  if (kind === "subject") {
    const subject = subjectById.get(raw);
    return <SubjectIcon name={subject?.icon ?? ""} size={16} />;
  }
  const Icon = KIND_ICON[kind] ?? ArrowRight;
  return <Icon size={16} aria-hidden="true" />;
}

interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string;
  group: "Go to" | "Commands";
  shortcut?: string[];
  run: () => void | Promise<void>;
  /** The palette stays open (the command asks a follow-up question). */
  keepOpen?: boolean;
}

function Row({
  value,
  onSelect,
  icon,
  title,
  subtitle,
  trailing,
}: {
  value: string;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex min-h-10 cursor-pointer items-center gap-3 rounded-control px-3 py-1.5 text-base text-text data-[selected=true]:bg-accent-soft max-md:min-h-12"
    >
      <span className="grid size-5 shrink-0 place-items-center text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {trailing}
    </Command.Item>
  );
}

/** Concepts due for review today, most overdue first (not hidden). */
function dueConceptIds(): string[] {
  const today = localDate();
  return Object.values(useConceptStateStore.getState().states)
    .filter((s) => !s.hidden && isDue(s.srs.dueAt, today))
    .sort((a, b) => (a.srs.dueAt! < b.srs.dueAt! ? -1 : 1))
    .map((s) => s.conceptId);
}

const HEADING =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted";

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  const setCsvImportOpen = useUiStore((s) => s.setCsvImportOpen);
  /** "New attempt for…" asks which problem, "Show my path to…" which concept. */
  const [pick, setPick] = useState<null | "problem" | "path">(null);
  const services = useServicesState();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [tagsVersion, setTagsVersion] = useState(0);

  // Start fresh each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setPick(null);
      setRecents(readRecents());
    }
  }

  // The owner's own problems and mistake tags change, so refresh them when the palette opens.
  useEffect(() => {
    if (!open) return;
    getSearchIndex().replaceGroup(
      "custom-problems",
      customProblemDocs(useProblemStore.getState().states),
    );
    getSearchIndex().replaceGroup(
      "custom-concepts",
      customConceptDocs(Object.values(useCustomConceptStore.getState().concepts)),
    );
    if (services.status !== "ready") return;
    let cancelled = false;
    services.services.repository.mistakeTags
      .list()
      .then((tags) => {
        if (cancelled) return;
        getSearchIndex().replaceKind("mistake", mistakeTagDocs(tags));
        setTagsVersion((v) => v + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, services]);

  const close = () => setOpen(false);

  const actions = useMemo<PaletteAction[]>(() => {
    const goTo: PaletteAction[] = ALL_NAV_ITEMS.map((item) => ({
      id: `go:${item.id}`,
      label: item.label,
      icon: item.icon,
      keywords: `go open page ${item.keywords ?? ""}`,
      group: "Go to",
      shortcut: item.goKey ? ["G", item.goKey.toUpperCase()] : undefined,
      run: () => navigate(item.path),
    }));
    goTo.splice(goTo.findIndex((a) => a.id === "go:dashboard") + 1, 0, {
      id: "go:weekly",
      label: "Weekly review",
      icon: ALL_NAV_ITEMS.find((i) => i.id === "dashboard")!.icon,
      keywords: "go week summary reflection",
      group: "Go to",
      run: () => navigate("/weekly"),
    });
    const commands: PaletteAction[] = [
      {
        id: "cmd:attempt",
        label: "New attempt for…",
        icon: Code2,
        keywords: "attempt solve code problem workspace editor",
        group: "Commands",
        keepOpen: true,
        run: () => {
          setPick("problem");
          setQuery("");
        },
      },
      {
        id: "cmd:flashcards-due",
        label: "Start flashcards for due concepts",
        icon: Layers,
        keywords: "flashcards review due concepts cards quiz",
        group: "Commands",
        run: () => {
          const due = dueConceptIds();
          if (due.length === 0) {
            toast("No concepts are due for review today.");
            return;
          }
          openFlashcards({ conceptIds: due, title: "Flashcards: everything due", session: true });
        },
      },
      {
        id: "cmd:path",
        label: "Show my path to…",
        icon: Route,
        keywords: "path prerequisites learn first roadmap concept",
        group: "Commands",
        keepOpen: true,
        run: () => {
          setPick("path");
          setQuery("");
        },
      },
      {
        id: "cmd:add-concept",
        label: "Add a concept",
        icon: CirclePlus,
        keywords: "new concept bubble map custom own",
        group: "Commands",
        run: () => openAddConcept(""),
      },
      {
        id: "cmd:add-problem",
        label: "Add a problem",
        icon: Plus,
        keywords: "new problem leetcode link quick add custom",
        group: "Commands",
        run: () => setQuickAddOpen(true),
      },
      {
        id: "cmd:import-csv",
        label: "Import problems from CSV",
        icon: FileUp,
        keywords: "csv spreadsheet history tracker import problems",
        group: "Commands",
        run: () => setCsvImportOpen(true),
      },
      {
        id: "cmd:ask",
        label: "Ask Claude",
        icon: Sparkles,
        keywords: "ai tutor chat help",
        group: "Commands",
        shortcut: ["A"],
        run: () => setAskOpen(true),
      },
      {
        id: "cmd:export",
        label: "Export backup",
        icon: Download,
        keywords: "backup save download data json",
        group: "Commands",
        run: async () => {
          if (services.status !== "ready") {
            toast("Your data is still loading. Try again in a moment.");
            return;
          }
          const result = await exportBackup(services.services);
          if (result.message) toast(result.message, { tone: result.ok ? "success" : "error" });
        },
      },
      {
        id: "cmd:theme-dark",
        label: "Switch to dark theme",
        icon: Moon,
        keywords: "theme night appearance",
        group: "Commands",
        run: () => setTheme("dark"),
      },
      {
        id: "cmd:theme-light",
        label: "Switch to light theme",
        icon: Sun,
        keywords: "theme day appearance",
        group: "Commands",
        run: () => setTheme("light"),
      },
      {
        id: "cmd:theme-system",
        label: "Match the system theme",
        icon: Monitor,
        keywords: "theme auto appearance",
        group: "Commands",
        run: () => setTheme("system"),
      },
      {
        id: "cmd:sidebar",
        label: sidebarCollapsed ? "Expand the sidebar" : "Collapse the sidebar",
        icon: PanelLeft,
        keywords: "sidebar navigation menu",
        group: "Commands",
        run: () => setSidebarCollapsed(!sidebarCollapsed),
      },
      {
        id: "cmd:shortcuts",
        label: "Show keyboard shortcuts",
        icon: Keyboard,
        keywords: "keys help hotkeys",
        group: "Commands",
        shortcut: ["?"],
        run: () => setShortcutsOpen(true),
      },
    ];
    return [...goTo, ...commands];
  }, [
    services,
    setAskOpen,
    setShortcutsOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    setQuickAddOpen,
    setCsvImportOpen,
  ]);

  const q = deferred.trim().toLowerCase();
  const matchedActions = useMemo(() => {
    if (pick) return [];
    if (!q) return actions;
    const words = q.split(/\s+/);
    return actions
      .filter((a) => {
        const hay = `${a.label} ${a.keywords}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 5);
  }, [actions, q, pick]);

  const groups = useMemo(() => {
    void tagsVersion;
    const all = q ? getSearchIndex().search(q) : [];
    if (pick === "problem") return all.filter((g) => g.kind === "problem" || g.kind === "puzzle");
    if (pick === "path") return all.filter((g) => g.kind === "concept");
    return all;
  }, [q, tagsVersion, pick]);

  const runAction = (action: PaletteAction) => {
    if (action.keepOpen) {
      void action.run();
      return;
    }
    close();
    markSetupStep("search");
    void action.run();
  };

  const openHit = (hit: SearchHit | RecentItem) => {
    close();
    markSetupStep("search");
    if (pick === "path" && hit.kind === "concept") {
      navigate(routeHref("/map", undefined, { path: hit.id.replace(/^concept:/, "") }));
      return;
    }
    setRecents(pushRecent(hit));
    navigate(hit.href);
  };

  const hasResults = matchedActions.length > 0 || groups.length > 0;

  // Keep the top result selected as results change, so Enter always opens the best match.
  const firstValue =
    (q
      ? (matchedActions[0]?.id ?? groups[0]?.hits[0]?.id)
      : recents[0]
        ? `recent:${recents[0].id}`
        : actions[0]?.id) ?? "";
  const [selected, setSelected] = useState(firstValue);
  const [selectedFor, setSelectedFor] = useState(firstValue);
  if (selectedFor !== firstValue) {
    setSelectedFor(firstValue);
    setSelected(firstValue);
  }

  const actionRows = (list: PaletteAction[]) =>
    list.map((a) => {
      const Icon = a.icon;
      return (
        <Row
          key={a.id}
          value={a.id}
          onSelect={() => runAction(a)}
          icon={<Icon size={16} aria-hidden="true" />}
          title={a.group === "Go to" && q ? `Go to ${a.label}` : a.label}
          trailing={
            a.shortcut && (
              <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                {a.shortcut.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            )
          }
        />
      );
    });

  return (
    <Dialog
      open={open}
      onClose={close}
      bare
      label="Search and commands"
      title="Search"
      size="md"
      className="mt-[10vh] max-md:mt-4"
    >
      <Command
        label="Search and commands"
        shouldFilter={false}
        loop
        value={selected}
        onValueChange={setSelected}
        className={HEADING}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={
              pick === "problem"
                ? "Which problem? Type a title or number"
                : pick === "path"
                  ? "Your path to which concept? Type its name"
                  : "Search concepts, problems and pages"
            }
            className="h-13 min-w-0 flex-1 bg-transparent text-md text-text outline-none placeholder:text-faint"
            data-autofocus
          />
          <button
            type="button"
            onClick={close}
            className="h-8 shrink-0 rounded-control px-2 text-sm text-muted hover:bg-surface-sunken hover:text-text max-md:h-10"
          >
            Esc
          </button>
        </div>
        <Command.List className="max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain p-2">
          {q && !hasResults && (
            <div className="px-3 py-8 text-center text-base text-muted">
              No results for “{deferred.trim()}”. Try fewer letters or another word.
            </div>
          )}
          {pick && !q && (
            <div className="px-3 py-8 text-center text-base text-muted">
              {pick === "problem"
                ? "Type a problem's title or number to open its workspace."
                : "Type a concept's name to see everything you need before it."}
            </div>
          )}
          {!q && !pick && recents.length > 0 && (
            <Command.Group heading="Recent">
              {recents.map((r) => (
                <Row
                  key={`recent:${r.id}`}
                  value={`recent:${r.id}`}
                  onSelect={() => openHit(r)}
                  icon={<Clock size={16} aria-hidden="true" />}
                  title={r.title}
                  subtitle={r.subtitle}
                />
              ))}
            </Command.Group>
          )}
          {!q && !pick && (
            <>
              <Command.Group heading="Go to">
                {actionRows(actions.filter((a) => a.group === "Go to"))}
              </Command.Group>
              <Command.Group heading="Commands">
                {actionRows(actions.filter((a) => a.group === "Commands"))}
              </Command.Group>
            </>
          )}
          {q && matchedActions.length > 0 && (
            <Command.Group heading="Pages and commands">{actionRows(matchedActions)}</Command.Group>
          )}
          {groups.map((g) => (
            <Command.Group key={g.kind} heading={GROUP_LABEL[g.kind]}>
              {g.hits.map((hit) => (
                <Row
                  key={hit.id}
                  value={hit.id}
                  onSelect={() => openHit(hit)}
                  icon={<HitIcon kind={hit.kind} id={hit.id} />}
                  title={hit.title}
                  subtitle={hit.subtitle}
                />
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="hidden items-center gap-4 border-t border-rule px-4 py-2 text-xs text-muted md:flex">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>
              <CornerDownLeft size={11} aria-hidden="true" />
            </Kbd>
            to open
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </Command>
    </Dialog>
  );
}
