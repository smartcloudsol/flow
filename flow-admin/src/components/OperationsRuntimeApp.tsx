import { Alert, Box, Card, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  getFlowPlugin,
  getStoreSelect,
  type FlowSettings,
  type Store,
} from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FlowBackendClient } from "../api/backend-client";
import type { BootConfig } from "../api/types";
import {
  resolveOperationsDirection,
  syncAmplifyOperationsI18n,
  t,
} from "../operations/i18n";
import {
  OPERATIONS_VIEW_DEFINITIONS,
  OPERATIONS_VIEW_ORDER,
} from "../operations/views";
import SubmissionsEditor from "../paid-features/SubmissionsEditor";
import WorkflowsEditor from "../paid-features/WorkflowsEditor";

type OperationsTab = "submissions" | "workflows";
type FlowHighlightedSubmissionAction = "seen" | "resolved" | "completed";

type SubmissionsEditorBoot = {
  settings?: {
    highlightedSubmissionActions?: FlowHighlightedSubmissionAction[];
  };
};

export interface OperationsRuntimeAppProps {
  store: Store;
  initialTab?: OperationsTab;
  availableTabs?: OperationsTab[];
  title?: string;
  language?: string;
  direction?: "ltr" | "rtl" | "auto";
}

function sanitizeTabs(availableTabs?: OperationsTab[]): OperationsTab[] {
  const defaultTabs: OperationsTab[] = [...OPERATIONS_VIEW_ORDER];

  const next = (availableTabs ?? defaultTabs).filter((value, index, values) => {
    return defaultTabs.includes(value) && values.indexOf(value) === index;
  });

  return next.length ? next : defaultTabs;
}

export default function OperationsRuntimeApp({
  store,
  initialTab = "submissions",
  availableTabs,
  title,
  language: languageOverride,
  direction: directionOverride,
}: OperationsRuntimeAppProps) {
  const tabs = useMemo(() => sanitizeTabs(availableTabs), [availableTabs]);
  const [activeTab, setActiveTab] = useState<OperationsTab>(
    tabs.includes(initialTab) ? initialTab : tabs[0],
  );

  const language = useSelect(
    () => getStoreSelect(store).getLanguage(),
    [store],
  );
  const direction = useSelect(
    () => getStoreSelect(store).getDirection(),
    [store],
  );
  const customTranslations = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [store],
  );

  useLayoutEffect(() => {
    syncAmplifyOperationsI18n(store, {
      language: languageOverride,
      direction: directionOverride,
    });
  }, [
    customTranslations,
    direction,
    directionOverride,
    language,
    languageOverride,
    store,
  ]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      queueMicrotask(() => {
        setActiveTab(tabs[0]);
      });
    }
  }, [activeTab, tabs]);

  const flow = getFlowPlugin();
  const siteSettings = globalThis.WpSuite?.siteSettings as
    | {
        accountId?: string;
        siteId?: string;
      }
    | undefined;

  const boot = useMemo<BootConfig>(
    () => ({
      nonce: flow?.nonce,
      settings: (flow?.settings ?? {}) as FlowSettings,
      accountId: siteSettings?.accountId ?? "",
      siteId: siteSettings?.siteId ?? "",
    }),
    [
      flow?.nonce,
      flow?.settings,
      siteSettings?.accountId,
      siteSettings?.siteId,
    ],
  );

  const effectiveLanguage =
    typeof languageOverride === "string" && languageOverride
      ? languageOverride
      : typeof language === "string" && language !== "system"
      ? language
      : undefined;

  const client = useMemo(() => new FlowBackendClient(boot), [boot]);
  const submissionsBoot = useMemo<SubmissionsEditorBoot>(
    () => ({
      settings: {
        highlightedSubmissionActions: (
          flow?.settings as FlowSettings & {
            highlightedSubmissionActions?: FlowHighlightedSubmissionAction[];
          }
        )?.highlightedSubmissionActions,
      },
    }),
    [flow?.settings],
  );
  const resolvedDirection = resolveOperationsDirection(
    effectiveLanguage,
    directionOverride ?? direction ?? undefined,
  );

  if (!boot.accountId || !boot.siteId) {
    return (
      <Alert color="yellow" variant="light">
        {t("This site is not connected to a backend workspace yet.")}
      </Alert>
    );
  }

  return (
    <Box dir={resolvedDirection} lang={effectiveLanguage}>
      <Stack gap="md">
        <Card withBorder>
          <Stack gap={4}>
            <Title order={3}>{title ? t(title) : t("Flow Operations")}</Title>
            <Text size="sm" c="dimmed">
              {t(
                "Use the tabs to manage submissions and the unified workflows/process maps surface from the frontend.",
              )}
            </Text>
          </Stack>
        </Card>

        <Tabs
          value={activeTab}
          onChange={(value) =>
            setActiveTab((value as OperationsTab) || tabs[0])
          }
        >
          <Tabs.List>
            {tabs.includes("submissions") ? (
              <Tabs.Tab value="submissions">
                {t(OPERATIONS_VIEW_DEFINITIONS.submissions.title)}
              </Tabs.Tab>
            ) : null}
            {tabs.includes("workflows") ? (
              <Tabs.Tab value="workflows">
                {t(OPERATIONS_VIEW_DEFINITIONS.workflows.title)}
              </Tabs.Tab>
            ) : null}
          </Tabs.List>

          {tabs.includes("submissions") ? (
            <Tabs.Panel value="submissions" pt="md">
              <SubmissionsEditor client={client} boot={submissionsBoot} />
            </Tabs.Panel>
          ) : null}
          {tabs.includes("workflows") ? (
            <Tabs.Panel value="workflows" pt="md">
              <WorkflowsEditor
                client={client}
                boot={boot}
                navigationMode="segmented"
              />
            </Tabs.Panel>
          ) : null}
        </Tabs>
      </Stack>
    </Box>
  );
}
