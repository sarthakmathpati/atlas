// Quick add (F6): paste a LeetCode link, or type a title or number. A match opens the problem;
// anything else becomes the owner's own problem, prefilled from the link, with difficulty and
// patterns to choose ("Suggest patterns" looks at similar problems in the bank; with Claude in
// phase 6 it can also ask Claude).
import { ArrowRight, Plus, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { navigate } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { DifficultyChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { DIFFICULTY_LABEL } from "@/components/ui/labels";
import { subjects, topics } from "@/data/syllabus";
import { problemLabel, withScheme, type ProblemInfo } from "@/lib/problems/catalog";
import {
  findProblemMatches,
  parseProblemInput,
  suggestConcepts,
  titleFromSlug,
} from "@/lib/problems/quickAdd";
import type { Difficulty } from "@/lib/types";
import { addCustomProblem, useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { conceptName, conceptOptions, problemPageHref } from "./problemUi";

const TOPIC_OPTIONS = [
  { value: "", label: "No topic" },
  ...subjects.flatMap((s) =>
    topics
      .filter((t) => t.subjectId === s.id)
      .map((t) => ({ value: t.id, label: t.name, group: s.name })),
  ),
];

function MatchRow({ info, onOpen }: { info: ProblemInfo; onOpen: (info: ProblemInfo) => void }) {
  return (
    <li className="flex items-center gap-3 border-t border-rule px-3 py-2 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text">{problemLabel(info)}</span>
        <span className="block truncate text-sm text-muted">
          {info.custom ? "Added by you" : info.conceptIds.map(conceptName).join(", ")}
        </span>
      </span>
      <DifficultyChip difficulty={info.difficulty} className="max-sm:hidden" />
      <Button size="sm" trailingIcon={ArrowRight} onClick={() => onOpen(info)}>
        Open
      </Button>
    </li>
  );
}

export function QuickAddDialog() {
  const open = useUiStore((s) => s.quickAddOpen);
  const setOpen = useUiStore((s) => s.setQuickAddOpen);
  const states = useProblemStore((s) => s.states);
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [topicId, setTopicId] = useState("");
  const [summary, setSummary] = useState("");
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Start fresh each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setText("");
      setCreating(false);
      setTitle("");
      setUrl("");
      setDifficulty(null);
      setConceptIds([]);
      setTopicId("");
      setSummary("");
      setSuggested(null);
      setShowErrors(false);
    }
  }

  const parsed = useMemo(() => parseProblemInput(text), [text]);
  const { exact, matches } = useMemo(() => findProblemMatches(parsed, states), [parsed, states]);
  const close = () => setOpen(false);

  const openProblem = (info: ProblemInfo) => {
    close();
    navigate(problemPageHref(info));
  };

  const startCreate = () => {
    if (parsed.kind === "url") {
      setUrl(parsed.url);
      setTitle(parsed.slug ? titleFromSlug(parsed.slug) : "");
    } else if (parsed.kind === "title") {
      setTitle(parsed.title);
    } else if (parsed.kind === "number") {
      setTitle("");
    }
    setCreating(true);
  };

  const suggest = () => {
    const ids = suggestConcepts(title || text).filter((id) => !conceptIds.includes(id));
    setSuggested(ids);
  };

  const create = () => {
    if (!title.trim() || !difficulty) {
      setShowErrors(true);
      return;
    }
    const cleanUrl = url.trim();
    const id = addCustomProblem(
      {
        title: title.trim(),
        difficulty,
        source: /leetcode\.(com|cn)/i.test(cleanUrl) ? "leetcode" : "custom",
        conceptIds,
        ...(cleanUrl ? { url: withScheme(cleanUrl) } : {}),
        ...(topicId ? { topicId } : {}),
      },
      { summary },
    );
    close();
    navigate(`/problems/${encodeURIComponent(id)}`);
    toast("Problem added.", { tone: "success" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (exact) openProblem(exact);
    else if (parsed.kind !== "empty") startCreate();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add a problem"
      description="Paste a LeetCode link, or type a title or number."
      size="md"
      footer={
        creating ? (
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Back
            </Button>
            <Button variant="primary" icon={Plus} onClick={create}>
              Add problem
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {!creating ? (
          <>
            <Field label="Link, title or number" hideLabel>
              <Input
                data-autofocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="https://leetcode.com/problems/… or “Two Sum” or 1"
                autoComplete="off"
              />
            </Field>
            {parsed.kind !== "empty" && (
              <div className="space-y-3">
                {matches.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm text-muted">
                      {exact ? "Already in your library" : "Similar problems in your library"}
                    </p>
                    <ul className="overflow-hidden rounded-control border border-rule">
                      {matches.map((m) => (
                        <MatchRow key={m.id} info={m} onOpen={openProblem} />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-base text-muted">
                    {parsed.kind === "number"
                      ? `Problem ${parsed.number} isn't in the bank. Add it with its title and a link.`
                      : "Nothing in your library matches yet."}
                  </p>
                )}
                {!exact && (
                  <Button icon={Plus} onClick={startCreate}>
                    Add it as a new problem
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <Field
              label="Title"
              error={showErrors && !title.trim() ? "Give the problem a title." : null}
            >
              <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Link" hint="Optional. Where you solve it, for example its LeetCode page.">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                placeholder="https://"
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-text">Difficulty</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="Difficulty">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    className={cx(
                      "h-10 flex-1 rounded-control border text-base font-medium transition-colors max-md:h-11",
                      difficulty === d
                        ? "border-accent bg-accent-soft text-text"
                        : "border-rule bg-surface text-muted hover:text-text",
                    )}
                  >
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
              {showErrors && !difficulty && (
                <p className="mt-1.5 text-sm text-danger" role="alert">
                  Choose a difficulty.
                </p>
              )}
            </fieldset>
            <div className="space-y-2">
              <MultiCombobox
                label="Patterns"
                options={conceptOptions()}
                value={conceptIds}
                onChange={setConceptIds}
                max={3}
                placeholder="Search patterns and concepts"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" icon={Wand2} onClick={suggest}>
                  Suggest patterns
                </Button>
                {suggested && suggested.length === 0 && (
                  <span className="text-sm text-muted">
                    No similar problems in the bank. Pick patterns yourself.
                  </span>
                )}
                {suggested?.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={conceptIds.length >= 3}
                    onClick={() => {
                      setConceptIds((v) => (v.includes(id) ? v : [...v, id].slice(0, 3)));
                      setSuggested((s) => s?.filter((x) => x !== id) ?? null);
                    }}
                    className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-accent px-2 text-xs font-medium text-accent hover:bg-accent-soft disabled:opacity-50 max-md:h-9"
                  >
                    <Plus size={12} aria-hidden="true" />
                    {conceptName(id)}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">
                Patterns link the problem to the map, so solving it counts toward them.
              </p>
            </div>
            <Field label="Topic" hint="Optional. Groups it with similar problems.">
              <Select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                options={TOPIC_OPTIONS}
              />
            </Field>
            <Field label="Your summary" hint="Optional. The problem in your own words.">
              <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
