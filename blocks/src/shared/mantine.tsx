import { createTheme, MantineProvider } from "@mantine/core";
import type { PropsWithChildren } from "react";

const theme = createTheme({
  defaultRadius: "md",
});

export function WpSuiteMantineProvider({ children }: PropsWithChildren) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}
