import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// Kept identical in the seven independently built plugin admins. No foundation API.
type Options<T extends string> = {
  current: () => T;
  resolve: (search: string) => T;
  apply: (section: T) => T | false;
};
const KEY = "wpsuiteAdminSectionHistory";

/** Track only accepted navigation. Configuration hydration is not a user visit. */
export function createAdminSectionHistory<T extends string>(options: Options<T>, browser: Window = window) {
  const page = new URL(browser.location.href).searchParams.get("page") ?? "";
  const marker = (state: unknown): number | undefined => {
    const entry = (state as Record<string, unknown> | null)?.[KEY] as { page?: string; index?: number } | undefined;
    return entry?.page === page && Number.isSafeInteger(entry.index) ? entry.index : undefined;
  };
  let index = marker(browser.history.state) ?? 0;
  let committedUrl = browser.location.href;
  let restoring = false;
  const state = (position: number) => ({ ...browser.history.state, [KEY]: { page, index: position } });
  browser.history.replaceState(state(index), "", committedUrl);
  const sectionUrl = (section: T) => {
    const url = new URL(browser.location.href);
    url.searchParams.set("section", section);
    url.searchParams.delete("aikit-page");
    return url.href;
  };
  const select = (requested: T) => {
    const current = options.current();
    const accepted = options.apply(requested);
    if (accepted === false || accepted === current) return;
    ++index;
    committedUrl = sectionUrl(accepted);
    browser.history.pushState(state(index), "", committedUrl);
  };
  const pop = (event: PopStateEvent) => {
    if (restoring) { restoring = false; return; }
    const destination = marker(event.state);
    const accepted = options.apply(options.resolve(browser.location.search));
    if (accepted === false) {
      if (destination !== undefined && destination !== index) {
        restoring = true;
        browser.history.go(index - destination);
      } else {
        browser.history.replaceState(state(index), "", committedUrl);
      }
      return;
    }
    index = destination ?? index;
    committedUrl = sectionUrl(accepted);
    browser.history.replaceState(state(index), "", committedUrl);
  };
  // Product summary/detail navigation shares this history stack. Synchronize
  // the accepted entry without applying a different native settings section.
  const external = () => {
    index = marker(browser.history.state) ?? index;
    committedUrl = browser.location.href;
  };
  browser.addEventListener("popstate", pop);
  browser.addEventListener("wpsuite-admin-history-change", external);
  return { select, dispose: () => {
    browser.removeEventListener("popstate", pop);
    browser.removeEventListener("wpsuite-admin-history-change", external);
  } };
}

export function useAdminSectionHistory<T extends string>(
  section: T,
  resolve: (search: string) => T,
  apply: (section: T) => T | false,
) {
  const latest = useRef({ section, resolve, apply });
  useLayoutEffect(() => { latest.current = { section, resolve, apply }; }, [section, resolve, apply]);
  const controller = useRef<ReturnType<typeof createAdminSectionHistory<T>>>();
  useEffect(() => {
    const history = createAdminSectionHistory<T>({
      current: () => latest.current.section,
      resolve: search => latest.current.resolve(search),
      apply: next => latest.current.apply(next),
    });
    controller.current = history;
    return () => { history.dispose(); controller.current = undefined; };
  }, []);
  return useCallback((next: T) => controller.current?.select(next), []);
}
