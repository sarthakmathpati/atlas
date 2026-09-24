import { FoundationPreview } from "@/features/preview/FoundationPreview";
import { ErrorBoundary } from "./ErrorBoundary";
import { ServicesProvider } from "./providers/ServicesProvider";

export function App() {
  return (
    <ServicesProvider>
      <ErrorBoundary>
        <FoundationPreview />
      </ErrorBoundary>
    </ServicesProvider>
  );
}
