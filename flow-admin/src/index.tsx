import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/tiptap/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getStore, getFlowPlugin } from "@smart-cloud/flow-core";
import Main from "./main";
import { initWordPressOperationsI18n } from "./operations/i18n";

const theme = createTheme({
  respectReducedMotion: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: false,
    },
  },
});

const flow = getFlowPlugin();
if (!flow) {
  throw new Error("Flow plugin is not available");
}
if (!flow.nonce) {
  throw new Error("Flow plugin nonce is not available");
}
if (!flow.settings) {
  throw new Error("Flow plugin settings are not available");
}

// Type-safe validated plugin values
const validatedFlow = {
  nonce: flow.nonce,
  settings: flow.settings,
};

initWordPressOperationsI18n();

async function init() {
  const store = await getStore();

  createRoot(document.getElementById("smartcloud-flow-admin")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" zIndex={100002} />
          <ModalsProvider modalProps={{ zIndex: 100001 }}>
            <Main {...validatedFlow} store={store} />
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

init();
