import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  DEFAULT_THEME,
  Group,
  Modal,
  NavLink,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useModals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import Editor from "@monaco-editor/react";
import type { AiSuggestionPreset, FlowSettings } from "@smart-cloud/flow-core";
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
  IconEdit,
  IconExclamationCircle,
  IconForms,
  IconInfoCircle,
  IconLock,
  IconMail,
  IconPlus,
  IconRouteAltLeft,
  IconSettings,
  IconTrash,
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

const TemplatesEditor = lazy(
  () =>
    import(
      process.env.WPSUITE_PREMIUM
        ? "./paid-features/TemplatesEditor"
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
  InfoLabelComponent: (props: {
    text: string;
    scrollToId: string;
  }) => JSX.Element;
}

function createDefaultAiPreset(index: number): AiSuggestionPreset {
  return {
    id: `preset-${Math.random().toString(36).slice(2, 10)}`,
    name: `Preset ${index}`,
    template: `User submitted the following form:

{{fields}}

Generate helpful suggestions.

Return JSON:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "confidence": 0.8
    }
  ]
}`,
    useKnowledgeBase: true,
    topK: 5,
  } satisfies AiSuggestionPreset;
}

function normalizeAiPreset(preset: AiSuggestionPreset): AiSuggestionPreset {
  return {
    ...preset,
    id: preset.id || `preset-${Math.random().toString(36).slice(2, 10)}`,
    name: preset.name?.trim() || "Untitled preset",
    template: preset.template ?? "",
    useKnowledgeBase: preset.useKnowledgeBase !== false,
    topK:
      typeof preset.topK === "number" && Number.isFinite(preset.topK)
        ? preset.topK
        : undefined,
  };
}

const DEFAULT_HIGHLIGHTED_SUBMISSION_ACTIONS = [
  "seen",
  "resolved",
  "completed",
] satisfies HighlightedSubmissionAction[];

function AiPresetModalEditor({
  opened,
  preset,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  preset: AiSuggestionPreset | null;
  onClose: () => void;
  onSubmit: (preset: AiSuggestionPreset) => void;
}) {
  const [draft, setDraft] = useState<AiSuggestionPreset | null>(preset);

  useEffect(() => {
    setDraft(preset);
  }, [preset]);

  const handleSubmit = () => {
    if (!draft) return;
    onSubmit(normalizeAiPreset(draft));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={preset?.id ? "Edit preset" : "New preset"}
      size="xl"
      zIndex={100000}
    >
      {draft ? (
        <Stack gap="md">
          <TextInput
            label="Preset name"
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.currentTarget.value })
            }
          />
          <Group align="end">
            <Switch
              checked={draft.useKnowledgeBase}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  useKnowledgeBase: event.currentTarget.checked,
                })
              }
              label="Use Knowledge Base"
            />
            <TextInput
              label="Top K"
              value={draft.topK != null ? String(draft.topK) : ""}
              onChange={(event) => {
                const value = event.currentTarget.value.trim();
                setDraft({
                  ...draft,
                  topK: value === "" ? undefined : Number(value),
                });
              }}
              style={{ maxWidth: 160 }}
            />
          </Group>
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Template
            </Text>
            <Editor
              height="360px"
              defaultLanguage="markdown"
              value={draft.template}
              onChange={(value) =>
                setDraft({ ...draft, template: value || "" })
              }
              options={{ minimap: { enabled: false }, wordWrap: "on" }}
            />
          </Box>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Changes are saved into the general settings form. Use{" "}
              <strong>Save General Settings</strong> to persist them.
            </Text>
            <Group>
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save preset</Button>
            </Group>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}

function AiSuggestionsPresetEditor({
  value,
  onChange,
}: {
  value: AiSuggestionPreset[] | undefined;
  onChange: (next: AiSuggestionPreset[]) => void;
}) {
  const modals = useModals();
  const presets = (value || []).map(normalizeAiPreset);
  const [editorOpened, setEditorOpened] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AiSuggestionPreset | null>(
    null,
  );

  const openCreate = () => {
    setEditingPreset(createDefaultAiPreset(presets.length + 1));
    setEditorOpened(true);
  };

  const openEdit = (preset: AiSuggestionPreset) => {
    setEditingPreset({ ...preset });
    setEditorOpened(true);
  };

  const handleDelete = (preset: AiSuggestionPreset) => {
    modals.openConfirmModal({
      title: "Delete preset",
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{preset.name}</strong>? This
          change will only be stored after you save the general settings.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        onChange(presets.filter((item) => item.id !== preset.id));
      },
    });
  };

  const handleSubmit = (nextPreset: AiSuggestionPreset) => {
    const exists = presets.some((item) => item.id === nextPreset.id);
    const next = exists
      ? presets.map((item) => (item.id === nextPreset.id ? nextPreset : item))
      : [...presets, nextPreset];
    onChange(next);
    setEditorOpened(false);
    setEditingPreset(null);
  };

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={600}>AI Suggestions presets</Text>
            <Text size="sm" c="dimmed">
              Create and manage reusable prompt presets for the AI Suggestions
              block.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Add preset
          </Button>
        </Group>

        {presets.length ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Knowledge Base</Table.Th>
                <Table.Th>Top K</Table.Th>
                <Table.Th>Template</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {presets.map((preset) => (
                <Table.Tr key={preset.id}>
                  <Table.Td>{preset.name}</Table.Td>
                  <Table.Td>{preset.useKnowledgeBase ? "Yes" : "No"}</Table.Td>
                  <Table.Td>{preset.topK ?? "—"}</Table.Td>
                  <Table.Td>
                    <Code style={{ whiteSpace: "nowrap" }}>{preset.id}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconEdit size={14} />}
                        onClick={() => openEdit(preset)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDelete(preset)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Alert color="blue" variant="light">
            No presets configured yet.
          </Alert>
        )}

        <Text size="sm" c="dimmed">
          Preset changes are kept in the general settings form until you click{" "}
          <strong>Save General Settings</strong>.
        </Text>
      </Stack>

      <AiPresetModalEditor
        opened={editorOpened}
        preset={editingPreset}
        onClose={() => {
          setEditorOpened(false);
          setEditingPreset(null);
        }}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}

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
      aiSuggestionsPresets: settings?.aiSuggestionsPresets || [],
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
    setSettingsFormData(initialSettingsFormData);
  }, [initialSettingsFormData]);

  const [lastSavedSettings, setLastSavedSettings] = useState<AdminFlowSettings>(
    initialSettingsFormData,
  );

  useEffect(() => {
    setLastSavedSettings(initialSettingsFormData);
  }, [initialSettingsFormData]);

  const generalSettingsDirty = useMemo(
    () =>
      JSON.stringify(lastSavedSettings) !== JSON.stringify(settingsFormData),
    [lastSavedSettings, settingsFormData],
  );

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
          setLastSavedSettings(settingsFormData);
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

  const InfoLabelComponent = useCallback(
    ({ text, scrollToId }: { text: string; scrollToId: string }) => (
      <Group align="center" gap="0.25rem">
        {text}
        <ActionIcon
          component="label"
          variant="subtle"
          size="xs"
          onClick={() => {
            setScrollToId(scrollToId);
            open();
          }}
        >
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Group>
    ),
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
    if (isSiteError || !isSitePending || !loadSiteEnabled) {
      setSite(isSiteError ? null : siteRecord ?? null);
    }
  }, [siteRecord, loadSiteEnabled, isSitePending, isSiteError]);

  useEffect(() => {
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
  }, [accountId, isSiteError, site, siteId]);

  useEffect(() => {
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
        value: "templates",
        label: "Templates",
        icon: <IconMail size={16} stroke={1.5} />,
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
  }, [accountId, decryptedConfig, resolvedConfig, siteId, siteKey]);

  useEffect(() => {
    if (resolvedConfig !== undefined) {
      const fc = (resolvedConfig ?? decryptedConfig) as FlowConfig;
      setFormConfig(fc);
    }
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

  const activeOperationsView =
    activePage === "submissions" ||
    activePage === "templates" ||
    activePage === "workflows"
      ? (activePage as OperationsView)
      : null;

  const operationsEditor =
    activeOperationsView === "submissions" ? (
      <SubmissionsEditor
        client={backendClient}
        boot={{ settings: settingsFormData }}
      />
    ) : activeOperationsView === "templates" ? (
      <TemplatesEditor client={backendClient} boot={boot} />
    ) : activeOperationsView === "workflows" ? (
      <WorkflowsEditor client={backendClient} boot={boot} />
    ) : null;

  return (
    <div className={classes["wpc-container"]}>
      <DocSidebar
        opened={opened}
        close={close}
        page={activePage as never}
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
                <InfoLabelComponent
                  text={__("General", TEXT_DOMAIN)}
                  scrollToId="general-overview"
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
                    <InfoLabelComponent
                      text={__("Forms Backend Sync", TEXT_DOMAIN)}
                      scrollToId="forms-backend-sync"
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
                    <InfoLabelComponent
                      text={__('Hide "Powered by" attribution', TEXT_DOMAIN)}
                      scrollToId="enable-powered-by"
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
                    <InfoLabelComponent
                      text={__("Highlighted submission actions", TEXT_DOMAIN)}
                      scrollToId="highlighted-submission-actions"
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
                    <InfoLabelComponent
                      text={__("Enable Debug Logging", TEXT_DOMAIN)}
                      scrollToId="enable-debug-logging"
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

              <Box mt="md">
                <AiSuggestionsPresetEditor
                  value={settingsFormData.aiSuggestionsPresets}
                  onChange={(aiSuggestionsPresets) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      aiSuggestionsPresets,
                    })
                  }
                />
              </Box>

              <Group justify="space-between" mt="lg">
                <Group gap="xs">
                  <Badge
                    color={generalSettingsDirty ? "yellow" : "green"}
                    variant="light"
                  >
                    {generalSettingsDirty
                      ? "Unsaved changes"
                      : "All changes saved"}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Changes made to AI presets and general options only take
                    effect after saving.
                  </Text>
                </Group>
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
                <InfoLabelComponent
                  text={__("API Settings", TEXT_DOMAIN)}
                  scrollToId="api-settings"
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
                    InfoLabelComponent={InfoLabelComponent}
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
              infoLabelComponent={InfoLabelComponent}
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
