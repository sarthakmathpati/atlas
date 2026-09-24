// Which concept activity is open (F13, F14, F9 concept reviews, F4 manual status, F2 add
// concept). One host in the shell renders them, so the map, the concept panel, the Review page
// and search can all start them.
import { create } from "zustand";

export interface FlashcardRequest {
  conceptIds: string[];
  /** "Flashcards: Paging", "Flashcards: everything due". */
  title: string;
  /** An explicit concept review: checks count even before the due date. */
  session?: boolean;
}

interface ConceptDialogState {
  flashcards: FlashcardRequest | null;
  explain: { conceptId: string; session?: boolean } | null;
  review: string | null;
  status: string | null;
  /** Add a concept: the topic it goes in (or "" to pick one). */
  addConcept: string | null;
}

export const useConceptDialogs = create<ConceptDialogState>(() => ({
  flashcards: null,
  explain: null,
  review: null,
  status: null,
  addConcept: null,
}));

export const openFlashcards = (request: FlashcardRequest) =>
  useConceptDialogs.setState({ flashcards: request });
export const openExplainBack = (conceptId: string, session?: boolean) =>
  useConceptDialogs.setState({ explain: { conceptId, session } });
export const openConceptReview = (conceptId: string) =>
  useConceptDialogs.setState({ review: conceptId });
export const openStatusDialog = (conceptId: string) =>
  useConceptDialogs.setState({ status: conceptId });
export const openAddConcept = (topicId = "") => useConceptDialogs.setState({ addConcept: topicId });
export const closeConceptDialogs = () =>
  useConceptDialogs.setState({
    flashcards: null,
    explain: null,
    review: null,
    status: null,
    addConcept: null,
  });
