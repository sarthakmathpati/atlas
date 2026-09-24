// Concept notes (F3 Notes tab): the owner's Markdown per concept plus saved Claude answers.
// Typing autosaves after a short pause; leaving the page saves at once (flushNotes).
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { ConceptNote, SavedAnswer } from "@/lib/types";
import { toast } from "./toastStore";

interface NoteState {
  notes: Record<string, ConceptNote>;
  loaded: boolean;
}

export const useConceptNoteStore = create<NoteState>(() => ({ notes: {}, loaded: false }));

let repo: Repository | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export const NOTE_SAVE_DELAY_MS = 800;

export async function hydrateConceptNotes(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.conceptNotes.list();
  useConceptNoteStore.setState({
    notes: Object.fromEntries(list.map((n) => [n.conceptId, n])),
    loaded: true,
  });
}

export function detachConceptNotes(): void {
  flushNotes();
  repo = null;
  useConceptNoteStore.setState({ notes: {}, loaded: false });
}

const saveFailed = () =>
  toast("Couldn't save your note. Check that storage is available, then try again.", {
    tone: "error",
    id: "note-save",
  });

function persist(conceptId: string) {
  timers.delete(conceptId);
  const note = useConceptNoteStore.getState().notes[conceptId];
  if (!repo) return;
  const empty =
    !note || (note.markdown.trim() === "" && note.savedAnswers.length === 0 && !note.generated);
  (empty ? repo.conceptNotes.delete(conceptId) : repo.conceptNotes.put(note)).catch(saveFailed);
}

function schedule(conceptId: string, delay = NOTE_SAVE_DELAY_MS) {
  const t = timers.get(conceptId);
  if (t) clearTimeout(t);
  if (delay <= 0) persist(conceptId);
  else
    timers.set(
      conceptId,
      setTimeout(() => persist(conceptId), delay),
    );
}

/** Saves every note with pending edits now. */
export function flushNotes(): void {
  for (const [id, t] of [...timers]) {
    clearTimeout(t);
    persist(id);
  }
}

function update(conceptId: string, change: (note: ConceptNote) => ConceptNote, delay?: number) {
  const { notes } = useConceptNoteStore.getState();
  const current = notes[conceptId] ?? {
    conceptId,
    markdown: "",
    savedAnswers: [],
    updatedAt: nowIso(),
  };
  const next = { ...change(current), updatedAt: nowIso() };
  useConceptNoteStore.setState({ notes: { ...notes, [conceptId]: next } });
  schedule(conceptId, delay);
}

export function setNoteMarkdown(conceptId: string, markdown: string): void {
  update(conceptId, (n) => ({ ...n, markdown }));
}

/** Removes a saved answer. Returns it with its position, for Undo. */
export function deleteSavedAnswer(
  conceptId: string,
  answerId: string,
): { answer: SavedAnswer; index: number } | null {
  const note = useConceptNoteStore.getState().notes[conceptId];
  const index = note?.savedAnswers.findIndex((a) => a.id === answerId) ?? -1;
  if (!note || index < 0) return null;
  const answer = note.savedAnswers[index]!;
  update(
    conceptId,
    (n) => ({ ...n, savedAnswers: n.savedAnswers.filter((a) => a.id !== answerId) }),
    0,
  );
  return { answer, index };
}

export function restoreSavedAnswer(conceptId: string, answer: SavedAnswer, index: number): void {
  update(
    conceptId,
    (n) => {
      const list = n.savedAnswers.filter((a) => a.id !== answer.id);
      list.splice(Math.min(index, list.length), 0, answer);
      return { ...n, savedAnswers: list };
    },
    0,
  );
}

/** Moves a saved answer into the note body (as a quoted section) and off the list. */
export function moveAnswerIntoNote(conceptId: string, answerId: string): ConceptNote | null {
  const before = useConceptNoteStore.getState().notes[conceptId];
  const answer = before?.savedAnswers.find((a) => a.id === answerId);
  if (!before || !answer) return null;
  update(
    conceptId,
    (n) => {
      const block = `### ${answer.question.trim()}\n\n${answer.answer.trim()}\n`;
      const markdown = n.markdown.trim() ? `${n.markdown.trimEnd()}\n\n${block}` : block;
      return { ...n, markdown, savedAnswers: n.savedAnswers.filter((a) => a.id !== answerId) };
    },
    0,
  );
  return before;
}

/** Puts a whole note back as it was (Undo). */
export function restoreNote(note: ConceptNote): void {
  update(note.conceptId, () => note, 0);
}
