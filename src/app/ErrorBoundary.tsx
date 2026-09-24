// Error boundaries (F1): a friendly message and an "Export my data" button, so a bug can never
// trap the owner's data. The shell wraps each page in an inline boundary (the sidebar and top bar
// keep working); the whole app has an outer one as a last resort.
import { Download, RotateCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { backupFilename } from "@/lib/storage/exportImport";
import { ServicesContext, type ServicesState } from "./providers/servicesContext";

interface Props {
  children: ReactNode;
  /** Render inside the page area instead of taking over the whole screen. */
  inline?: boolean;
}

interface State {
  error: Error | null;
  exportMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  static override contextType = ServicesContext;
  declare context: ServicesState;
  override state: State = { error: null, exportMessage: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Atlas crashed", error, info.componentStack);
  }

  private exportData = async () => {
    if (this.context.status !== "ready") {
      this.setState({
        exportMessage: "Your data is still loading. Reload the page and try again.",
      });
      return;
    }
    const { repository, fileSaver } = this.context.services;
    try {
      const backup = await repository.exportAll();
      const result = await fileSaver.save({
        filename: backupFilename(),
        data: JSON.stringify(backup, null, 2),
        mime: "application/json",
      });
      this.setState({
        exportMessage:
          result.status === "failed"
            ? result.message
            : result.status === "declined"
              ? "Export cancelled."
              : result.status === "saved"
                ? "Backup exported."
                : null,
      });
    } catch {
      this.setState({ exportMessage: "Couldn't export right now. Reload the page and try again." });
    }
  };

  override render() {
    if (!this.state.error) return this.props.children;
    const inline = this.props.inline;
    return (
      <div
        role="alert"
        className={
          inline
            ? "mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10"
            : "mx-auto max-w-xl px-4 py-16 sm:px-6"
        }
      >
        <h1 className="text-xl text-text">
          {inline ? "This page hit a problem" : "Something went wrong"}
        </h1>
        <p className="mt-3 max-w-[60ch] text-md text-muted">
          Atlas hit an unexpected problem. Your saved data is safe. Export a backup to be sure, then
          reload the page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" icon={Download} onClick={this.exportData}>
            Export my data
          </Button>
          <Button icon={RotateCw} onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
        {this.state.exportMessage && (
          <p className="mt-4 text-base text-muted" role="status">
            {this.state.exportMessage}
          </p>
        )}
      </div>
    );
  }
}
