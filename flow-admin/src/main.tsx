import {
  Accordion,
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  DEFAULT_THEME,
  Group,
  NavLink,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import type { FlowSettings } from "@smart-cloud/flow-core";
import {
  getFlowPlugin,
  sanitizeFlowConfig,
  TEXT_DOMAIN,
  type FlowConfig,
  type Store,
} from "@smart-cloud/flow-core";
import type { SiteSettings, SubscriptionType } from "@smart-cloud/wpsuite-core";
import {
  IconAlertCircle,
  IconApi,
  IconCheck,
  IconChevronRight,
  IconExclamationCircle,
  IconForms,
  IconInfoCircle,
  IconLock,
  IconRouteAltLeft,
  IconSettings,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelect } from "@wordpress/data";
import { __ } from "@wordpress/i18n";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FlowBackendClient } from "./api/backend-client";
import type { AdminView, BootConfig } from "./api/types";
import DocSidebar from "./DocSidebar";
import classes from "./main.module.css";
import { NoRegistrationRequiredBanner } from "./noregistration";
import { FlowOnboarding } from "./onboarding";
import { OperationsSection } from "./operations/OperationsSection";
import {
  OPERATIONS_VIEW_DEFINITIONS,
  type OperationsView,
} from "./operations/views";

declare global {
  const wp: {
    data: {
      select: (store: Store) => {
        getConfig: () => FlowConfig | null;
      };
    };
    media: {
      attachment: (id: number) => {
        fetch: () => void;
      } | null;
    };
  };
}

interface Site {
  accountId: string;
  siteId: string;
  siteKey?: string;
  name: string;
  domain: string;
  subscriptionType?: SubscriptionType;
  settings: FlowConfig;
}

type AdminFlowSettings = FlowSettings & {
  highlightedSubmissionActions?: HighlightedSubmissionAction[];
};

type HighlightedSubmissionAction = "seen" | "resolved" | "completed";

let wpSuiteInstalled: boolean = false;
let wpRestUrl: string | undefined;
let wpSuiteSiteSettings: SiteSettings = {} as SiteSettings;
if (typeof WpSuite !== "undefined") {
  wpSuiteInstalled = true;
  wpSuiteSiteSettings = WpSuite.siteSettings;
  wpRestUrl = WpSuite.restUrl;
}

const production = process.env?.NODE_ENV === "production";

const apiUrl =
  !production || window.location.host === "dev.wpsuite.io"
    ? "https://api.wpsuite.io/dev"
    : "https://api.wpsuite.io";

const flow = getFlowPlugin();

const ApiSettingsEditor = lazy(
  () =>
    import(
      process.env.WPSUITE_PREMIUM
        ? "./paid-features/ApiSettingsEditor"
        : "./free-features/NullEditor"
    ),
);

const SubmissionsEditor = lazy(
  () =>
    import(
      process.env.WPSUITE_PREMIUM
        ? "./paid-features/SubmissionsEditor"
        : "./free-features/NullEditor"
    ),
);

const WorkflowsEditor = lazy(
  () =>
    import(
      process.env.WPSUITE_PREMIUM
        ? "./paid-features/WorkflowsEditor"
        : "./free-features/NullEditor"
    ),
);

const SettingsTitle = () => {
  const isMobile = useMediaQuery(
    `(max-width: ${DEFAULT_THEME.breakpoints.sm})`,
  );
  return (
    <Card p="sm" withBorder mt="md" maw={1280}>
      <Group
        align="flex-start"
        style={{
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Title
          order={1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#218BE6",
          }}
        >
          {isMobile
            ? "SmartCloud Flow"
            : "SmartCloud Flow — Forms & Email Automation for WordPress"}
        </Title>
        <Text>
          This interface allows you to configure forms, email templates,
          workflows, and backend integration for your WordPress site.
        </Text>
        <NoRegistrationRequiredBanner />
        {!wpSuiteSiteSettings.siteId && (
          <Text c="dimmed" size="xs">
            To use Pro features, please connect this WordPress site to a{" "}
            <strong>WPSuite</strong> workspace. Go to the{" "}
            <a href="?page=hub-for-wpsuiteio">
              <strong>SmartCloud → Connect your Site to WPSuite</strong>
            </a>{" "}
            menu and complete the linking process.
          </Text>
        )}
      </Group>
    </Card>
  );
};

interface NavigationOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export interface SettingsEditorProps {
  apiUrl: string;
  config: FlowConfig;
  accountId: string;
  siteId: string;
  siteKey: string | undefined;
  onSave: (config: FlowConfig) => void;
  InfoLabel: (props: InfoLabelProps) => JSX.Element;
  openInfo: (targetScrollToId: string) => void;
}

type InfoLabelProps = {
  text: string;
  scrollToId: string;
  onOpen: (targetScrollToId: string) => void;
};

function InfoLabel({ text, scrollToId, onOpen }: InfoLabelProps) {
  return (
    <Group align="center" gap="0.25rem">
      {text}
      <ActionIcon
        component="label"
        variant="subtle"
        size="xs"
        onClick={() => onOpen(scrollToId)}
      >
        <IconInfoCircle size={16} />
      </ActionIcon>
    </Group>
  );
}

const DEFAULT_HIGHLIGHTED_SUBMISSION_ACTIONS = [
  "seen",
  "resolved",
  "completed",
] satisfies HighlightedSubmissionAction[];

interface MainProps {
  nonce: string;
  settings: AdminFlowSettings;
  store: Store;
}

export default function Main({ nonce, settings, store }: MainProps) {
  const [navigationOptions, setNavigationOptions] =
    useState<NavigationOption[]>();
  const [scrollToId, setScrollToId] = useState<string>("");
  const [accordionValue, setAccordionValue] = useState<string | null>("flow");
  const [accountId] = useState<string | undefined>(
    wpSuiteSiteSettings.accountId,
  );
  const [siteId] = useState<string | undefined>(wpSuiteSiteSettings.siteId);
  const [siteKey] = useState<string | undefined>(wpSuiteSiteSettings.siteKey);
  const [opened, { open, close }] = useDisclosure(false);

  const [site, setSite] = useState<Site | null>();
  const [activePage, setActivePage] = useState<AdminView>("general");

  const isMobile = useMediaQuery(
    `(max-width: ${DEFAULT_THEME.breakpoints.sm})`,
  );

  const boot: BootConfig = useMemo(
    () => ({
      nonce,
      wpNonce: nonce,
      settings,
      restUrl: wpRestUrl,
      accountId: accountId ?? "",
      siteId: siteId ?? "",
      siteKey: siteKey ?? "",
    }),
    [nonce, settings, accountId, siteId, siteKey],
  );

  const backendClient = useMemo(() => new FlowBackendClient(boot), [boot]);

  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const decryptedConfig: FlowConfig | null = useSelect(
    () => wp.data.select(store)?.getConfig(),
    [],
  );

  const [resolvedConfig, setResolvedConfig] = useState<
    FlowConfig | null | undefined
  >(undefined);

  const [formConfig, setFormConfig] = useState<FlowConfig>();

  const loadSiteEnabled = !!accountId && !!siteId && !!siteKey;

  const {
    data: siteRecord,
    isError: isSiteError,
    isPending: isSitePending,
  } = useQuery({
    queryKey: ["site", accountId, siteId],
    queryFn: () => fetchSite(accountId!, siteId!, siteKey!),
    enabled: loadSiteEnabled,
  });

  const initialSettingsFormData = useMemo<AdminFlowSettings>(
    () => ({
      enablePoweredBy: settings?.enablePoweredBy || false,
      debugLoggingEnabled: settings?.debugLoggingEnabled || false,
      formsBackendSyncEnabled: settings?.formsBackendSyncEnabled ?? true,
      formsAllowPermanentDelete: settings?.formsAllowPermanentDelete || false,
      highlightedSubmissionActions: settings?.highlightedSubmissionActions
        ?.length
        ? (settings.highlightedSubmissionActions as HighlightedSubmissionAction[])
        : DEFAULT_HIGHLIGHTED_SUBMISSION_ACTIONS,
    }),
    [settings],
  );

  const [settingsFormData, setSettingsFormData] = useState<AdminFlowSettings>(
    initialSettingsFormData,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setSettingsFormData(initialSettingsFormData);
    });
  }, [initialSettingsFormData]);

  const clearCache = useCallback(
    async (subscriber: boolean) => {
      if (wpSuiteInstalled && wpRestUrl && accountId && siteId && siteKey) {
        await fetch(wpRestUrl + "/update-site-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify({
            accountId,
            siteId,
            siteKey,
            lastUpdate: new Date().getTime(),
            subscriber,
          }),
          credentials: "same-origin",
        });
      }
    },
    [accountId, nonce, siteId, siteKey],
  );

  const handleUpdateSettings = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        const response = await fetch(flow!.restUrl + "/update-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify(settingsFormData),
          credentials: "same-origin",
        });
        if (response.ok) {
          notifications.show({
            title: "Settings saved",
            message: "General settings saved successfully.",
            color: "green",
            icon: <IconCheck size={16} />,
            className: classes["notification"],
          });
        } else {
          const err = await response.json();
          console.error("Failed to submit data", err);
          notifications.show({
            title: "Error occurred",
            message: (err as Error).message,
            color: "red",
            icon: <IconAlertCircle size={16} />,
            className: classes["notification"],
          });
        }
      } catch (error) {
        console.error("Error saving settings:", error);
        notifications.show({
          title: "Error occurred",
          message: (error as Error).message,
          color: "red",
          icon: <IconAlertCircle size={16} />,
          className: classes["notification"],
        });
      } finally {
        setIsSaving(false);
      }
    },
    [nonce, settingsFormData],
  );

  const openInfo = useCallback(
    (targetScrollToId: string) => {
      setScrollToId(targetScrollToId);
      open();
    },
    [open],
  );

  const handleConfigSave = useCallback(
    async (config: FlowConfig) => {
      setResolvedConfig({
        ...sanitizeFlowConfig(config),
        subscriptionType: formConfig?.subscriptionType,
      });
      await clearCache(!!formConfig?.subscriptionType);
      queryClient.invalidateQueries();
    },
    [clearCache, formConfig?.subscriptionType, queryClient],
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (isSiteError || !isSitePending || !loadSiteEnabled) {
        setSite(isSiteError ? null : siteRecord ?? null);
      }
    });
  }, [siteRecord, loadSiteEnabled, isSitePending, isSiteError]);

  useEffect(() => {
    queueMicrotask(() => {
      if (site) {
        setResolvedConfig({
          ...sanitizeFlowConfig(site.settings ?? {}),
          subscriptionType: site.subscriptionType,
        });
      } else {
        if ((!accountId && !siteId) || isSiteError) {
          setResolvedConfig(null);
        }
      }
    });
  }, [accountId, isSiteError, site, siteId]);

  useEffect(() => {
    queueMicrotask(() => {
      const paidSettingsDisabled =
        decryptedConfig && accountId && siteId && siteKey
          ? !decryptedConfig
          : !resolvedConfig;
      setNavigationOptions([
        {
          value: "general",
          label: "General",
          icon: <IconSettings size={16} stroke={1.5} />,
        },
        {
          value: "api-settings",
          label: "API Settings",
          icon: <IconApi size={16} stroke={1.5} />,
          disabled: paidSettingsDisabled,
        },
        {
          value: "submissions",
          label: "Submissions",
          icon: <IconForms size={16} stroke={1.5} />,
          disabled: paidSettingsDisabled,
        },
        {
          value: "workflows",
          label: "Workflows",
          icon: <IconRouteAltLeft size={16} stroke={1.5} />,
          disabled: paidSettingsDisabled,
        },
      ]);
      if (paidSettingsDisabled) {
        setActivePage("general");
      }
    });
  }, [accountId, decryptedConfig, resolvedConfig, siteId, siteKey]);

  useEffect(() => {
    queueMicrotask(() => {
      if (resolvedConfig !== undefined) {
        const fc = (resolvedConfig ?? decryptedConfig) as FlowConfig;
        setFormConfig(fc);
      }
    });
  }, [resolvedConfig, decryptedConfig]);

  useEffect(() => {
    if (resolvedConfig !== undefined) {
      if (
        resolvedConfig !== null &&
        ((!!resolvedConfig.subscriptionType &&
          !wpSuiteSiteSettings.subscriber) ||
          (!resolvedConfig.subscriptionType && wpSuiteSiteSettings.subscriber))
      ) {
        const subscriber = !!resolvedConfig.subscriptionType;
        wpSuiteSiteSettings.subscriber = subscriber;
        clearCache(subscriber);
      }
    }
  }, [clearCache, resolvedConfig]);

  const normalizedOperationsPage =
    activePage === "templates" ? "workflows" : activePage;

  const activeOperationsView =
    normalizedOperationsPage === "submissions" ||
    normalizedOperationsPage === "workflows"
      ? (normalizedOperationsPage as OperationsView)
      : null;

  const operationsEditor =
    activeOperationsView === "submissions" ? (
      <SubmissionsEditor
        client={backendClient}
        boot={{ settings: settingsFormData }}
      />
    ) : activeOperationsView === "workflows" ? (
      <WorkflowsEditor client={backendClient} boot={boot} />
    ) : null;

  return (
    <div className={classes["wpc-container"]}>
      <DocSidebar
        opened={opened}
        close={close}
        page={normalizedOperationsPage as never}
        scrollToId={scrollToId}
      />
      <SettingsTitle />
      <FlowOnboarding />
      <Group
        align="flex-start"
        mt="lg"
        style={{
          flexDirection: isMobile ? "column" : "row",
          width: "100%",
        }}
      >
        {isMobile ? (
          <Accordion
            w="100%"
            value={accordionValue}
            onChange={setAccordionValue}
            variant="separated"
          >
            <Accordion.Item value="flow">
              <Accordion.Control>
                <Text fw={600}>Flow</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {navigationOptions?.slice(0, 1).map((item) => (
                    <NavLink
                      key={item.value}
                      label={item.label}
                      leftSection={item.icon}
                      rightSection={
                        activePage === item.value ? (
                          <IconChevronRight size={16} stroke={1.5} />
                        ) : null
                      }
                      active={activePage === item.value}
                      onClick={() => {
                        setActivePage((item.value as AdminView) ?? "general");
                      }}
                      disabled={item.disabled}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="pro-features">
              <Accordion.Control>
                <Text fw={600}>Pro Features</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {navigationOptions?.slice(1).map((item) => (
                    <NavLink
                      key={item.value}
                      label={item.label}
                      leftSection={item.icon}
                      rightSection={
                        item.disabled ||
                        !(formConfig ?? decryptedConfig)?.subscriptionType ? (
                          <IconLock size={14} stroke={1.5} />
                        ) : activePage === item.value ? (
                          <IconChevronRight size={16} stroke={1.5} />
                        ) : null
                      }
                      active={activePage === item.value}
                      onClick={() => {
                        if (!item.disabled) {
                          setActivePage((item.value as AdminView) ?? "general");
                        }
                      }}
                      disabled={item.disabled}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        ) : (
          <Card w={240} p="md" withBorder style={{ flexShrink: 0 }}>
            <Stack gap="lg">
              <Box>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  Flow
                </Text>
                <Stack gap={0}>
                  {navigationOptions
                    ?.slice(0, 1)
                    .map((item) => (
                      <NavLink
                        key={item.value}
                        label={item.label}
                        leftSection={item.icon}
                        rightSection={
                          activePage === item.value ? (
                            <IconChevronRight size={16} stroke={1.5} />
                          ) : null
                        }
                        active={activePage === item.value}
                        onClick={() =>
                          setActivePage((item.value as AdminView) ?? "general")
                        }
                        disabled={item.disabled}
                      />
                    ))}
                </Stack>
              </Box>
              <Box>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  Pro Features
                </Text>
                <Stack gap={0}>
                  {navigationOptions?.slice(1).map((item) => (
                    <NavLink
                      key={item.value}
                      label={item.label}
                      leftSection={item.icon}
                      rightSection={
                        item.disabled ||
                        !(formConfig ?? decryptedConfig)?.subscriptionType ? (
                          <IconLock size={14} stroke={1.5} />
                        ) : activePage === item.value ? (
                          <IconChevronRight size={16} stroke={1.5} />
                        ) : null
                      }
                      active={activePage === item.value}
                      onClick={() => {
                        if (!item.disabled) {
                          setActivePage((item.value as AdminView) ?? "general");
                        }
                      }}
                      disabled={item.disabled}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Card>
        )}
        <Box style={{ flex: 1, width: isMobile ? "100%" : "auto" }} maw={1020}>
          {activePage === "general" && (
            <form name="general" onSubmit={handleUpdateSettings}>
              <Title order={2} mb="md">
                <InfoLabel
                  text={__("General", TEXT_DOMAIN)}
                  scrollToId="general-overview"
                  onOpen={openInfo}
                />
              </Title>

              <Text mb="md">
                {__(
                  "Configure general settings for SmartCloud Flow plugin.",
                  TEXT_DOMAIN,
                )}
              </Text>

              <Stack gap="sm">
                <Switch.Group
                  defaultValue={
                    settingsFormData.formsBackendSyncEnabled !== false
                      ? ["enable"]
                      : []
                  }
                  label={
                    <InfoLabel
                      text={__("Forms Backend Sync", TEXT_DOMAIN)}
                      scrollToId="forms-backend-sync"
                      onOpen={openInfo}
                    />
                  }
                  description={__(
                    "Automatically sync form definitions to the backend when saving posts. Disable this for development environments or manual form management.",
                    TEXT_DOMAIN,
                  )}
                  onChange={(values: string[]) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      formsBackendSyncEnabled: values.includes("enable"),
                    })
                  }
                >
                  <Switch
                    label={__("Enable", TEXT_DOMAIN)}
                    value="enable"
                    mt="xs"
                    disabled={isSaving}
                  />
                </Switch.Group>

                <Switch.Group
                  defaultValue={
                    settingsFormData.enablePoweredBy ? [] : ["hide"]
                  }
                  label={
                    <InfoLabel
                      text={__('Hide "Powered by" attribution', TEXT_DOMAIN)}
                      scrollToId="enable-powered-by"
                      onOpen={openInfo}
                    />
                  }
                  description={__(
                    "Control whether to hide a small 'Powered by SmartCloud Flow' attribution (where applicable).",
                    TEXT_DOMAIN,
                  )}
                  onChange={(values: string[]) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      enablePoweredBy: !values.includes("hide"),
                    })
                  }
                >
                  <Switch
                    label={__("Hide", TEXT_DOMAIN)}
                    value="hide"
                    mt="xs"
                    disabled={isSaving}
                  />
                </Switch.Group>

                <Switch.Group
                  value={
                    settingsFormData.highlightedSubmissionActions?.length
                      ? settingsFormData.highlightedSubmissionActions
                      : DEFAULT_HIGHLIGHTED_SUBMISSION_ACTIONS
                  }
                  label={
                    <InfoLabel
                      text={__("Highlighted submission actions", TEXT_DOMAIN)}
                      scrollToId="highlighted-submission-actions"
                      onOpen={openInfo}
                    />
                  }
                  description={__(
                    "Choose which quick 'Mark as...' status buttons should appear on the submission detail popup.",
                    TEXT_DOMAIN,
                  )}
                  onChange={(values: string[]) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      highlightedSubmissionActions:
                        values as HighlightedSubmissionAction[],
                    })
                  }
                >
                  <Stack gap="xs" mt="xs">
                    <Switch
                      label={__("Show 'Mark seen'", TEXT_DOMAIN)}
                      value="seen"
                      disabled={isSaving}
                    />
                    <Switch
                      label={__("Show 'Mark resolved'", TEXT_DOMAIN)}
                      value="resolved"
                      disabled={isSaving}
                    />
                    <Switch
                      label={__("Show 'Mark completed'", TEXT_DOMAIN)}
                      value="completed"
                      disabled={isSaving}
                    />
                  </Stack>
                </Switch.Group>

                <Switch.Group
                  defaultValue={
                    settingsFormData.debugLoggingEnabled ? ["enable"] : []
                  }
                  label={
                    <InfoLabel
                      text={__("Enable Debug Logging", TEXT_DOMAIN)}
                      scrollToId="enable-debug-logging"
                      onOpen={openInfo}
                    />
                  }
                  description={__(
                    "Enable detailed debug logging for Flow operations. Note: This requires WP_DEBUG and WP_DEBUG_LOG to be enabled in wp-config.php. Logs will appear in wp-content/debug.log.",
                    TEXT_DOMAIN,
                  )}
                  onChange={(values: string[]) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      debugLoggingEnabled: values.includes("enable"),
                    })
                  }
                >
                  <Switch
                    label={__("Enable", TEXT_DOMAIN)}
                    value="enable"
                    mt="xs"
                    disabled={isSaving}
                  />
                </Switch.Group>
              </Stack>

              <Group justify="flex-end" mt="lg">
                <Button
                  loading={isSaving}
                  variant="gradient"
                  type="submit"
                  leftSection={<IconCheck />}
                >
                  {__("Save General Settings", TEXT_DOMAIN)}
                </Button>
              </Group>
            </form>
          )}
          {activePage === "api-settings" && (
            <>
              <Title order={2} mb="md">
                <InfoLabel
                  text={__("API Settings", TEXT_DOMAIN)}
                  scrollToId="api-settings"
                  onOpen={openInfo}
                />
              </Title>

              <Text mb="md">
                {__(
                  "Configure how Flow reaches its backend for form submissions, templates, and workflows. Choose between Gatey/Amplify or direct base URL.",
                  TEXT_DOMAIN,
                )}
              </Text>

              {(formConfig ?? decryptedConfig)?.subscriptionType !==
                "PROFESSIONAL" && (
                <Alert
                  variant="light"
                  color="yellow"
                  title={__("PRO Feature", TEXT_DOMAIN)}
                  icon={<IconExclamationCircle />}
                  mb="md"
                >
                  {__(
                    "This feature is available in the PRO version of the plugin. You can save your settings but they will not take effect until you upgrade your subscription.",
                    TEXT_DOMAIN,
                  )}
                </Alert>
              )}
              {(formConfig ?? decryptedConfig) && (
                <Suspense
                  fallback={<Text>{__("Loading...", TEXT_DOMAIN)}</Text>}
                >
                  <ApiSettingsEditor
                    apiUrl={apiUrl}
                    config={formConfig ?? decryptedConfig}
                    accountId={accountId!}
                    siteId={siteId!}
                    siteKey={siteKey}
                    onSave={handleConfigSave}
                    InfoLabel={InfoLabel}
                    openInfo={openInfo}
                  />
                </Suspense>
              )}
            </>
          )}
          {activeOperationsView && operationsEditor ? (
            <OperationsSection
              title={OPERATIONS_VIEW_DEFINITIONS[activeOperationsView].title}
              description={
                OPERATIONS_VIEW_DEFINITIONS[activeOperationsView].description
              }
              scrollToId={
                OPERATIONS_VIEW_DEFINITIONS[activeOperationsView].scrollToId
              }
              showProFeature={
                (formConfig ?? decryptedConfig)?.subscriptionType !==
                "PROFESSIONAL"
              }
              InfoLabel={InfoLabel}
              openInfo={openInfo}
            >
              {operationsEditor}
            </OperationsSection>
          ) : null}
        </Box>
      </Group>
    </div>
  );
}

async function fetchSite(accountId: string, siteId: string, siteKey: string) {
  try {
    const response = await fetch(
      `${apiUrl}/account/${accountId}/site/${siteId}/settings`,
      {
        headers: {
          "X-Plugin": "flow",
          "X-Site-Key": siteKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch site: ${response.statusText}`);
    }

    return (await response.json()) as Site;
  } catch (error) {
    console.error("Error fetching site:", error);
    throw error;
  }
}
