// Edit one of the owner's own problems: title, link, difficulty, patterns and topic.
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { subjects, topics } from "@/data/syllabus";
import type { CustomProblem, Difficulty } from "@/lib/types";
import { updateCustomProblem } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { conceptOptions } from "../problemUi";

const TOPIC_OPTIONS = [
  { value: "", label: "No topic" },
  ...subjects.flatMap((s) =>
    topics
      .filter((t) => t.subjectId === s.id)
      .map((t) => ({ value: t.id, label: t.name, group: s.name })),
  ),
];

interface EditProblemDialogProps {
  open: boolean;
  onClose: () => void;
  id: string;
  custom: CustomProblem;
}

export function EditProblemDialog({ open, onClose, id, custom }: EditProblemDialogProps) {
  const [draft, setDraft] = useState(custom);
  const [was, setWas] = useState(open);
  if (was !== open) {
    setWas(open);
    if (open) setDraft(custom);
  }
  const save = () => {
    if (!draft.title.trim()) return;
    const url = draft.url?.trim();
    updateCustomProblem(id, {
      ...draft,
      title: draft.title.trim(),
      url: url ? (/^https?:/i.test(url) ? url : `https://${url}`) : undefined,
      topicId: draft.topicId || undefined,
      source:
        url && /leetcode\.(com|cn)/i.test(url)
          ? "leetcode"
          : draft.source === "leetcode"
            ? "custom"
            : draft.source,
    });
    onClose();
    toast("Problem updated.");
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit problem"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!draft.title.trim()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <Field label="Title" error={draft.title.trim() ? null : "Give the problem a title."}>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Link">
          <Input
            value={draft.url ?? ""}
            inputMode="url"
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Difficulty</span>
          <SegmentedControl<Difficulty>
            label="Difficulty"
            value={draft.difficulty}
            onChange={(difficulty) => setDraft({ ...draft, difficulty })}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </div>
        <MultiCombobox
          label="Patterns"
          options={conceptOptions()}
          value={draft.conceptIds}
          onChange={(conceptIds) => setDraft({ ...draft, conceptIds })}
          max={3}
          placeholder="Search patterns and concepts"
        />
        <Field label="Topic">
          <Select
            value={draft.topicId ?? ""}
            onChange={(e) => setDraft({ ...draft, topicId: e.target.value })}
            options={TOPIC_OPTIONS}
          />
        </Field>
      </div>
    </Dialog>
  );
}
