// Manage mistake tags (F8): add a tag, rename it, change its category, write how to avoid it,
// archive it (it stays on old attempts but leaves the pickers), or merge it into another tag,
// which re-tags every attempt that used it. Merges can be undone from the toast.
import { Archive, ArchiveRestore, Merge, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { CATEGORY_LABEL, CATEGORY_ORDER, usageByTag } from "@/lib/mistakes/stats";
import type { MistakeCategory, MistakeTag } from "@/lib/types";
import {
  addMistakeTag,
  mergeMistakeTags,
  updateMistakeTag,
  useMistakeTagStore,
} from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";

const CATEGORY_OPTIONS = CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));

function EditTagDialog({
  tag,
  onClose,
  tags,
  usage,
}: {
  tag: MistakeTag | null;
  onClose: () => void;
  tags: MistakeTag[];
  usage: Map<string, number>;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<MistakeCategory>("other");
  const [howToAvoid, setHowToAvoid] = useState("");
  const [description, setDescription] = useState("");
  const [into, setInto] = useState("");
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [forId, setForId] = useState<string | null>(null);
  if (tag && forId !== tag.id) {
    setForId(tag.id);
    setLabel(tag.label);
    setCategory(tag.category);
    setHowToAvoid(tag.howToAvoid ?? "");
    setDescription(tag.description ?? "");
    setInto("");
    setConfirmMerge(false);
  }
  if (!tag && forId !== null) setForId(null);

  const duplicate =
    tag &&
    tags.some(
      (t) => t.id !== tag.id && t.label.trim().toLowerCase() === label.trim().toLowerCase(),
    );

  const save = () => {
    if (!tag || !label.trim() || duplicate) return;
    updateMistakeTag(tag.id, { label: label.trim(), category, howToAvoid, description });
    onClose();
    toast("Tag saved.");
  };

  const merge = () => {
    if (!tag || !into) return;
    const target = tags.find((t) => t.id === into);
    const { attempts, undo } = mergeMistakeTags(tag.id, into);
    onClose();
    toast(
      `Merged “${tag.label}” into “${target?.label ?? into}”. ${attempts} ${attempts === 1 ? "attempt" : "attempts"} re-tagged.`,
      { action: { label: "Undo", onClick: undo } },
    );
  };

  const count = tag ? (usage.get(tag.id) ?? 0) : 0;
  return (
    <Dialog
      open={Boolean(tag)}
      onClose={onClose}
      title="Edit tag"
      description={tag ? `Used on ${count} ${count === 1 ? "attempt" : "attempts"}.` : undefined}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!label.trim() || Boolean(duplicate)}>
            Save tag
          </Button>
        </>
      }
    >
      {tag && (
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <Field
            label="Name"
            error={
              !label.trim()
                ? "Give the tag a name."
                : duplicate
                  ? "Another tag already has this name. Merge them instead."
                  : null
            }
          >
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Category">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as MistakeCategory)}
              options={CATEGORY_OPTIONS}
            />
          </Field>
          <Field label="How to avoid it" hint="One line for your pre-interview checklist.">
            <Input value={howToAvoid} onChange={(e) => setHowToAvoid(e.target.value)} />
          </Field>
          <Field label="Description" hint="Optional.">
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="space-y-2 border-t border-rule pt-4">
            <p className="text-sm font-medium text-text">Merge into another tag</p>
            <p className="text-sm text-muted">
              Every attempt tagged “{tag.label}” gets the other tag instead, and this tag is
              removed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Select
                aria-label="Merge into"
                value={into}
                onChange={(e) => {
                  setInto(e.target.value);
                  setConfirmMerge(false);
                }}
                options={[
                  { value: "", label: "Choose a tag" },
                  ...tags
                    .filter((t) => t.id !== tag.id)
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((t) => ({
                      value: t.id,
                      label: t.label,
                      group: CATEGORY_LABEL[t.category],
                    }))
                    .sort((a, b) => a.group.localeCompare(b.group)),
                ]}
                className="min-w-0 flex-1"
              />
              {confirmMerge ? (
                <Button variant="danger" icon={Merge} onClick={merge}>
                  Merge {count} {count === 1 ? "attempt" : "attempts"}
                </Button>
              ) : (
                <Button icon={Merge} disabled={!into} onClick={() => setConfirmMerge(true)}>
                  Merge
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function ManageTagsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tagMap = useMistakeTagStore((s) => s.tags);
  const states = useProblemStore((s) => s.states);
  const usage = useMemo(() => usageByTag(states), [states]);
  const tags = useMemo(() => Object.values(tagMap), [tagMap]);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<MistakeCategory>("logic");
  const [editing, setEditing] = useState<MistakeTag | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = tags.filter((t) => t.archived).length;

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const tag = addMistakeTag(label, newCategory);
    setNewLabel("");
    toast(`Added “${tag.label}”.`);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Manage mistake tags" size="lg">
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Field label="New tag" className="flex-1">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="For example: forgot to sort first"
              />
            </Field>
            <Field label="Category" className="sm:w-48">
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MistakeCategory)}
                options={CATEGORY_OPTIONS}
              />
            </Field>
            <Button type="submit" icon={Plus} disabled={!newLabel.trim()}>
              Add tag
            </Button>
          </form>
          {CATEGORY_ORDER.map((category) => {
            const list = tags
              .filter((t) => t.category === category && (showArchived || !t.archived))
              .sort((a, b) => a.label.localeCompare(b.label));
            if (list.length === 0) return null;
            return (
              <section key={category} aria-label={CATEGORY_LABEL[category]}>
                <h3 className="mb-1.5 text-sm font-semibold text-muted">
                  {CATEGORY_LABEL[category]}
                </h3>
                <ul className="overflow-hidden rounded-control border border-rule">
                  {list.map((t) => {
                    const n = usage.get(t.id) ?? 0;
                    return (
                      <li
                        key={t.id}
                        className={cx(
                          "flex items-center gap-3 border-t border-rule px-3 py-1.5 first:border-t-0",
                          t.archived && "opacity-60",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base text-text">
                            {t.label}
                            {t.archived && (
                              <span className="ml-2 text-sm text-muted">Archived</span>
                            )}
                          </span>
                          {t.howToAvoid && (
                            <span className="block truncate text-sm text-muted">
                              {t.howToAvoid}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm text-muted tabular-nums">
                          {n} {n === 1 ? "use" : "uses"}
                        </span>
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${t.label}`}
                          size="sm"
                          onClick={() => setEditing(t)}
                        />
                        <IconButton
                          icon={t.archived ? ArchiveRestore : Archive}
                          label={t.archived ? `Restore ${t.label}` : `Archive ${t.label}`}
                          size="sm"
                          onClick={() => {
                            updateMistakeTag(t.id, { archived: !t.archived });
                            toast(
                              t.archived ? `Restored “${t.label}”.` : `Archived “${t.label}”.`,
                              {
                                action: {
                                  label: "Undo",
                                  onClick: () =>
                                    updateMistakeTag(t.id, { archived: t.archived ?? false }),
                                },
                              },
                            );
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived tags" : `Show archived tags (${archivedCount})`}
            </Button>
          )}
        </div>
      </Dialog>
      <EditTagDialog tag={editing} onClose={() => setEditing(null)} tags={tags} usage={usage} />
    </>
  );
}
