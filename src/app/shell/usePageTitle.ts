import { useEffect, useRef } from "react";
import { APP_NAME } from "@/lib/constants";
import { consumeNavigationFocus } from "../router";

/** Sets the browser tab title for the current page. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} – ${APP_NAME}` : APP_NAME;
  }, [title]);
}

/**
 * For pages that draw their own head (Today): the h1's ref, which takes focus after an in-app
 * navigation, and the browser tab's title.
 */
export function usePageHeading(documentTitle: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  usePageTitle(documentTitle);
  useEffect(() => {
    if (consumeNavigationFocus()) ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
