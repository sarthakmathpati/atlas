// Global error boundary (F1): a friendly message and an "Export my data" button, so a bug can
// never trap the owner's data.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { backupFilename } from "@/lib/storage/exportImport";
import { ServicesContext, type ServicesState } from "./providers/servicesContext";

interface State {
  error: Error | null;
  exportMessage: string | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
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
              : "Backup exported.",
      });
    } catch {
      this.setState({ exportMessage: "Couldn't export right now. Reload the page and try again." });
    }
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h1 className="text-xl text-text">Something went wrong</h1>
        <p className="mt-3 text-md text-muted">
          Atlas hit an unexpected problem. Your saved data is safe. Export a backup to be sure, then
          reload the page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={this.exportData}
            className="h-10 rounded-control bg-accent px-4 text-base font-medium text-on-accent hover:bg-accent-hover"
          >
            Export my data
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-control border border-rule px-4 text-base font-medium text-text hover:bg-surface-sunken"
          >
            Reload
          </button>
        </div>
        {this.state.exportMessage && (
          <p className="mt-4 text-base text-muted" role="status">
            {this.state.exportMessage}
          </p>
        )}
      </main>
    );
  }
}
