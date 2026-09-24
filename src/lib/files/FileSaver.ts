// Saving files (backups, revision sheets) behind one interface (BUILD_SPEC.md 2.4 and 2.5).
//   BrowserFileSaver      standalone app: a normal browser download
//   ClaudeDownloadsSaver  inside a claude.ai artifact: the `downloads` capability, which asks the
//                         owner to confirm (plain <a download> links do nothing there)
//   DialogFileSaver       inside an artifact without `downloads`: show the content in a dialog
//                         with a Copy button instead
import { isCodedError, type ClaudeDownloads } from "@/lib/runtime/claude";
import type { RuntimeInfo } from "@/lib/runtime/detect";

export interface SaveFileRequest {
  filename: string;
  data: string | Blob;
  mime: string;
}

export type SaveFileResult =
  | { status: "saved" }
  | { status: "declined" } // the owner said no to the save prompt; not an error
  | { status: "shown-in-dialog" }
  | { status: "failed"; message: string };

export interface FileSaver {
  readonly kind: "browser" | "claude-downloads" | "dialog";
  save(request: SaveFileRequest): Promise<SaveFileResult>;
}

export class BrowserFileSaver implements FileSaver {
  readonly kind = "browser" as const;

  async save({ filename, data, mime }: SaveFileRequest): Promise<SaveFileResult> {
    try {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Some browsers read the blob after the click returns; revoke later.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      return { status: "saved" };
    } catch {
      return {
        status: "failed",
        message: "Your browser blocked the download. Try again, or allow downloads for this site.",
      };
    }
  }
}

export class ClaudeDownloadsSaver implements FileSaver {
  readonly kind = "claude-downloads" as const;
  constructor(private readonly downloads: ClaudeDownloads) {}

  async save({ filename, data }: SaveFileRequest): Promise<SaveFileResult> {
    try {
      await this.downloads.save({ filename, data });
      return { status: "saved" };
    } catch (e) {
      const code = isCodedError(e) ? e.code : "unavailable";
      switch (code) {
        case "declined":
          return { status: "declined" };
        case "rate_limited":
          return {
            status: "failed",
            message: "A save prompt is already open. Finish it first, then try again.",
          };
        case "too_large":
          return { status: "failed", message: "This file is too large to save here." };
        case "rejected_extension":
        case "extension_not_enabled":
          return { status: "failed", message: "This file type can't be saved here." };
        default:
          return {
            status: "failed",
            message: "Saving files isn't available in this view right now.",
          };
      }
    }
  }
}

/** Shows a file's text in a dialog (with Copy) when no real download is possible. */
export type FileDialogPresenter = (request: SaveFileRequest) => Promise<void>;

let presenter: FileDialogPresenter | null = null;

/** The app shell registers the dialog that displays files (Phase 2 UI). */
export function setFileDialogPresenter(fn: FileDialogPresenter | null): void {
  presenter = fn;
}

export class DialogFileSaver implements FileSaver {
  readonly kind = "dialog" as const;

  async save(request: SaveFileRequest): Promise<SaveFileResult> {
    if (!presenter) {
      return { status: "failed", message: "Saving files isn't available in this view." };
    }
    await presenter(request);
    return { status: "shown-in-dialog" };
  }
}

export function chooseFileSaver(runtime: RuntimeInfo): FileSaver {
  if (runtime.downloads) return new ClaudeDownloadsSaver(runtime.downloads);
  if (runtime.inClaudeFrame) return new DialogFileSaver();
  return new BrowserFileSaver();
}
