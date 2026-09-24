import { useEffect } from "react";
import { APP_NAME } from "@/lib/constants";

/** Sets the browser tab title for the current page. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} – ${APP_NAME}` : APP_NAME;
  }, [title]);
}
