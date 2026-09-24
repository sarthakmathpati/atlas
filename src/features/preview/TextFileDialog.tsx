// Fallback for saving files where downloads can't work (section 2.5): shows the file's text with a
// Copy button. If the clipboard is blocked, the text is selected with a "Press Ctrl+C" hint.
import { Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { setFileDialogPresenter, type SaveFileRequest } from "@/lib/files/FileSaver";

export function TextFileDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<{ filename: string; text: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");

  useEffect(() => {
    setFileDialogPresenter(async (request: SaveFileRequest) => {
      const text = typeof request.data === "string" ? request.data : await request.data.text();
      setCopyState("idle");
      setFile({ filename: request.filename, text });
    });
    return () => setFileDialogPresenter(null);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (file && !dialog.open) dialog.showModal();
    if (!file && dialog.open) dialog.close();
  }, [file]);

  const copy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.text);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
      textRef.current?.focus();
      textRef.current?.select();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setFile(null)}
      className="m-auto w-[min(640px,calc(100vw-32px))] rounded-panel border border-rule bg-surface-raised p-0 text-text shadow-float backdrop:bg-black/40"
    >
      {file && (
        <div className="flex max-h-[80vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
            <h2 className="truncate text-md font-semibold">{file.filename}</h2>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Close"
              className="grid size-10 place-items-center rounded-control text-muted hover:bg-surface-sunken"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="px-4 pt-3 text-base text-muted">
            Downloads aren't available here, so copy this text and save it as a file on your device.
          </p>
          <textarea
            ref={textRef}
            readOnly
            value={file.text}
            onFocus={(e) => e.currentTarget.select()}
            className="m-4 min-h-48 flex-1 resize-none rounded-control border border-rule bg-surface-sunken p-3 font-mono text-sm text-text"
          />
          <div className="flex items-center justify-end gap-3 border-t border-rule px-4 py-3">
            <span className="text-sm text-muted" role="status">
              {copyState === "copied"
                ? "Copied."
                : copyState === "manual"
                  ? "Press Ctrl+C (or long-press and Copy)."
                  : ""}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-base font-medium text-on-accent hover:bg-accent-hover"
            >
              <Copy size={16} aria-hidden="true" />
              Copy
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
