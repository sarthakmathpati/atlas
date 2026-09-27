// What the problem workspace has open right now (F20 context chips): the problem, the code in the
// editor and whether a re-solve hides the owner's earlier work. Memory only; the draft in
// ProblemState is what survives a reload.
import { create } from "zustand";

interface WorkspaceState {
  problemId: string | null;
  language: string;
  code: string;
  /** A re-solve that hasn't been revealed: Claude doesn't see the old insight and notes. */
  hideOwnWork: boolean;
}

export const useWorkspaceStore = create<WorkspaceState>(() => ({
  problemId: null,
  language: "cpp",
  code: "",
  hideOwnWork: false,
}));

export function setWorkspace(next: WorkspaceState): void {
  useWorkspaceStore.setState(next);
}

export function clearWorkspace(problemId: string): void {
  if (useWorkspaceStore.getState().problemId === problemId)
    useWorkspaceStore.setState({ problemId: null, code: "", hideOwnWork: false });
}
