import { DirectionContext } from "@mantine/core";
import { useMemo, type PropsWithChildren } from "react";

/** Controlled per-root direction: never reads or changes documentElement.dir. */
export function LocaleDirectionProvider({ initialDirection = "ltr", children }: PropsWithChildren<{ initialDirection?: "ltr" | "rtl" }>) {
  const value = useMemo(() => ({ dir: initialDirection, setDirection: () => {}, toggleDirection: () => {} }), [initialDirection]);
  return <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>;
}
