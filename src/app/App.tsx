import { Toaster } from "@/components/ui/Toaster";
import { ErrorBoundary } from "./ErrorBoundary";
import { ServicesProvider } from "./providers/ServicesProvider";
import { AppearanceSync, StoreHydrator } from "./providers/StoreHydrator";
import { AppShell } from "./shell/AppShell";
import { TextFileDialog } from "./shell/TextFileDialog";

export function App() {
  return (
    <ServicesProvider>
      <StoreHydrator />
      <AppearanceSync />
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
      <Toaster />
      <TextFileDialog />
    </ServicesProvider>
  );
}
