// Fallback for saving files where downloads can't work (section 2.5): shows the file's text with a
// Copy button. If the clipboard is blocked, the text is selected with a "Press Ctrl+C" hint.
import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { setFileDialogPresenter, type SaveFileRequest } from "@/lib/files/FileSaver";

export function TextFileDialog() {
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
    <Dialog
      open={Boolean(file)}
      onClose={() => setFile(null)}
      title={file?.filename ?? ""}
      description="Downloads aren't available here, so copy this text and save it as a file on your device."
      size="lg"
      footer={
        <>
          <span className="mr-auto text-sm text-muted" role="status">
            {copyState === "copied"
              ? "Copied."
              : copyState === "manual"
                ? "Press Ctrl+C (or long-press and Copy)."
                : ""}
          </span>
          <Button variant="primary" icon={Copy} onClick={copy}>
            Copy
          </Button>
        </>
      }
    >
      {file && (
        <div className="p-4">
          <textarea
            ref={textRef}
            readOnly
            value={file.text}
            aria-label={`Contents of ${file.filename}`}
            onFocus={(e) => e.currentTarget.select()}
            className="h-[50vh] w-full resize-none rounded-control border border-rule bg-surface-sunken p-3 font-mono text-sm text-text"
          />
        </div>
      )}
    </Dialog>
  );
}
