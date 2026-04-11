import {
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor, Selection } from "monaco-editor";
import type { FlowBackendClient } from "../api/backend-client";
import type {
  BootConfig,
  EmailTemplate,
  TemplatePreviewResponse,
} from "../api/types";
import { t } from "../operations/i18n";
import HtmlTemplateEditor from "./HtmlTemplateEditor";
import MonacoEditor from "./MonacoEditor";
import { useOperationsComboboxProps } from "./OperationsPortalContext";
import { TEMPLATE_VARIABLE_POPOVER_EVENT } from "./tiptap/TemplateVariableComponent";
import TemplateVariablePicker from "./tiptap/TemplateVariablePicker";

function emptyTemplate(boot: BootConfig): EmailTemplate {
  return {
    templateKey: "",
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    name: "",
    subject: "",
    htmlBody: "<p>Hello {{submission.fields.name}}</p>",
    textBody: "Hello {{submission.fields.name}}",
    templateEngine: "handlebars",
    enabled: true,
  };
}

interface TemplateEditorModalProps {
  opened: boolean;
  onClose: () => void;
  client: FlowBackendClient;
  boot: BootConfig;
  initialTemplate?: EmailTemplate | null;
  mode?: "draft" | "existing";
  zIndex?: number;
  onSaved?: (saved: EmailTemplate, isNew: boolean) => void;
}

export default function TemplateEditorModal({
  opened,
  onClose,
  client,
  boot,
  initialTemplate,
  mode = "existing",
  zIndex = 100000,
  onSaved,
}: TemplateEditorModalProps) {
  const queryClient = useQueryClient();
  const comboboxProps = useOperationsComboboxProps(zIndex + 1);
  const variablePickerZIndex = zIndex + 2;
  const [editing, setEditing] = useState<EmailTemplate>(emptyTemplate(boot));
  const [preview, setPreview] = useState<TemplatePreviewResponse | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [templateVariablePopoverOpen, setTemplateVariablePopoverOpen] =
    useState(false);
  const textBodyEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const textBodySelectionRef = useRef<Selection | null>(null);

  useEffect(() => {
    const handleTemplateVariablePopover = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setTemplateVariablePopoverOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener(
      TEMPLATE_VARIABLE_POPOVER_EVENT,
      handleTemplateVariablePopover as EventListener,
    );

    return () => {
      window.removeEventListener(
        TEMPLATE_VARIABLE_POPOVER_EVENT,
        handleTemplateVariablePopover as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!opened) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setPreview(null);
      setSelectedFormId(null);
      setTemplateVariablePopoverOpen(false);
      const editingExisting =
        mode === "existing" && Boolean(initialTemplate?.templateKey);
      setIsEditingExisting(editingExisting);

      if (editingExisting && initialTemplate?.templateKey) {
        setLoadingTemplate(true);
        try {
          const fullTemplate = await client.getTemplate(
            initialTemplate.templateKey,
          );
          if (!cancelled) {
            setEditing(fullTemplate);
          }
        } catch (error) {
          if (!cancelled) {
            notifications.show({
              message:
                error instanceof Error
                  ? error.message
                  : t("Failed to load template"),
              color: "red",
            });
            setEditing(initialTemplate);
          }
        } finally {
          if (!cancelled) {
            setLoadingTemplate(false);
          }
        }
        return;
      }

      setEditing(initialTemplate ?? emptyTemplate(boot));
      setLoadingTemplate(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [opened, initialTemplate, client, boot, mode]);

  const listQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => client.listTemplates(),
  });

  const formsQuery = useQuery({
    queryKey: ["forms"],
    queryFn: () => client.listForms(),
  });

  const selectedFormQuery = useQuery({
    queryKey: ["forms", selectedFormId],
    queryFn: () => client.getForm(selectedFormId as string),
    enabled: Boolean(selectedFormId),
  });

  const existingKeys = useMemo(
    () =>
      new Set((listQuery.data?.items ?? []).map((item) => item.templateKey)),
    [listQuery.data?.items],
  );

  const selectedFormDefinition = selectedFormQuery.data;
  const previewVariables = useMemo(() => {
    const previewBaseUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://example.com";

    return {
      submission: {
        fields: { name: "John Doe", email: "john@example.com" },
        email: "john@example.com",
        source: {
          baseUrl: previewBaseUrl,
          pageUrl: `${previewBaseUrl}/contact`,
        },
      },
      form: {
        formId: selectedFormDefinition?.formId ?? "preview-form",
        name: selectedFormDefinition?.name ?? "Contact",
      },
      site: {
        siteId: selectedFormDefinition?.siteId ?? boot.siteId ?? "preview-site",
        name: selectedFormDefinition?.siteName ?? "Example Site",
        baseUrl: previewBaseUrl,
      },
      currentYear: new Date().getUTCFullYear(),
    };
  }, [boot.siteId, selectedFormDefinition]);

  const insertTextBodyVariable = (path: string) => {
    const currentEditor = textBodyEditorRef.current;
    if (!currentEditor) return;

    const model = currentEditor.getModel();
    if (!model) return;

    const lineNumber = model.getLineCount();
    const column = model.getLineMaxColumn(lineNumber);
    const selection = currentEditor.getSelection() ||
      textBodySelectionRef.current || {
        startLineNumber: lineNumber,
        startColumn: column,
        endLineNumber: lineNumber,
        endColumn: column,
      };

    const textToInsert = `{{${path}}}`;
    currentEditor.executeEdits("", [
      {
        range: selection,
        text: textToInsert,
        forceMoveMarkers: true,
      },
    ]);

    currentEditor.setPosition({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn + textToInsert.length,
    });
    currentEditor.focus();
  };

  const saveMutation = useMutation({
    mutationFn: (template: EmailTemplate) => {
      if (isEditingExisting) {
        return client.updateTemplate(template.templateKey, template);
      }
      return client.createTemplate(template);
    },
    onSuccess: (saved) => {
      notifications.show({
        message: t("Template saved"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onSaved?.(saved, !isEditingExisting);
      setPreview(null);
      onClose();
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error: Error) =>
      notifications.show({ message: error.message, color: "red" }),
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      closeOnEscape={!templateVariablePopoverOpen}
      size="xl"
      zIndex={zIndex}
      title={isEditingExisting ? t("Edit template") : t("New template")}
    >
      {loadingTemplate ? (
        <Text>{t("Loading template...")}</Text>
      ) : (
        <Stack>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label={t("Name")}
              description={t("Display name for this template")}
              placeholder={t("e.g., Welcome Email")}
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("Template key")}
              description={t(
                "Unique identifier (lowercase, hyphens, underscores)",
              )}
              placeholder={t("e.g., welcome-email")}
              value={editing.templateKey}
              disabled={isEditingExisting}
              autoComplete="off"
              error={
                !isEditingExisting && existingKeys.has(editing.templateKey)
                  ? t("This template key already exists")
                  : undefined
              }
              onChange={(e) =>
                setEditing({ ...editing, templateKey: e.currentTarget.value })
              }
            />
          </SimpleGrid>

          <Textarea
            label={t("Description")}
            description={t(
              "Optional description of this email template's purpose",
            )}
            minRows={3}
            styles={{
              input: {
                resize: "vertical",
                overflow: "auto",
                minHeight: "90px",
              },
            }}
            placeholder={t(
              "This template is used for sending welcome emails to new subscribers...",
            )}
            value={editing.description ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, description: e.currentTarget.value })
            }
          />

          <SimpleGrid cols={{ base: 1, md: 4 }}>
            <TextInput
              label={t("Locale")}
              description={t("Language code")}
              placeholder={t("en, hu, de")}
              value={editing.locale ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, locale: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("From email")}
              description={t("Sender email address")}
              placeholder={t("noreply@example.com")}
              value={editing.fromEmail ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, fromEmail: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("From name")}
              description={t("Sender display name")}
              placeholder={t("Company Name")}
              value={editing.fromName ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, fromName: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("Reply-to")}
              description={t("Reply address")}
              placeholder={t("support@example.com")}
              value={editing.replyToEmail ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  replyToEmail: e.currentTarget.value,
                })
              }
            />
          </SimpleGrid>

          <Switch
            label={t("Enabled")}
            checked={Boolean(editing.enabled)}
            onChange={(e) =>
              setEditing({ ...editing, enabled: e.currentTarget.checked })
            }
          />

          <TextInput
            label={t("Subject")}
            description={t(
              "Use {{path}} or {{path | fallback text}} for dynamic values.",
            )}
            placeholder={t(
              "Thank you {{submission.fields.name | there}} for your submission",
            )}
            value={editing.subject ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, subject: e.currentTarget.value })
            }
          />

          <Select
            label={t("Reference form (for field suggestions)")}
            placeholder={t("Select a form to see its fields")}
            value={selectedFormId}
            onChange={setSelectedFormId}
            data={
              formsQuery.data?.items.map((form) => ({
                value: form.formId,
                label: `${form.name} (${form.formId})`,
              })) ?? []
            }
            clearable
            searchable
            comboboxProps={comboboxProps}
            description={t(
              "Choose a form to see field-specific template variables",
            )}
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              {t("HTML body")}
            </Text>
            <HtmlTemplateEditor
              height="400px"
              value={editing.htmlBody ?? ""}
              onChange={(value) =>
                setEditing({ ...editing, htmlBody: value ?? "" })
              }
              variablePickerZIndex={variablePickerZIndex}
              placeholder={t(
                "Use {{submission.fields.fieldName}} for template variables",
              )}
              formDefinition={selectedFormDefinition}
            />
          </Stack>

          <Stack gap={4}>
            <Group>
              <Text size="sm" fw={500}>
                {t("Text body")}
              </Text>
              <TemplateVariablePicker
                formDefinition={selectedFormDefinition}
                size="xs"
                zIndex={variablePickerZIndex}
                onInsert={(path) => insertTextBodyVariable(path)}
              />
            </Group>
            <MonacoEditor
              language="plaintext"
              height="200px"
              minHeight="160px"
              value={editing.textBody ?? ""}
              onChange={(value) =>
                setEditing({ ...editing, textBody: value ?? "" })
              }
              onMount={(currentEditor) => {
                textBodyEditorRef.current = currentEditor;
                textBodySelectionRef.current = currentEditor.getSelection();
                currentEditor.onDidChangeCursorSelection((event) => {
                  textBodySelectionRef.current = event.selection;
                });
              }}
            />
          </Stack>

          <Group>
            <Button
              onClick={() => void saveMutation.mutate(editing)}
              disabled={
                !isEditingExisting && existingKeys.has(editing.templateKey)
              }
              loading={saveMutation.isPending}
            >
              {t("Save template")}
            </Button>
            <Button
              variant="light"
              disabled={!editing.templateKey}
              onClick={async () => {
                const result = await client.previewTemplate(
                  editing.templateKey,
                  previewVariables,
                );
                setPreview(result);
              }}
            >
              {t("Preview")}
            </Button>
          </Group>

          {preview ? (
            <Card withBorder>
              <Title order={5}>{t("Rendered preview")}</Title>
              <Stack mt="sm">
                <TextInput
                  readOnly
                  label={t("Subject")}
                  value={preview.subject ?? ""}
                />
                <Textarea
                  readOnly
                  label={t("Text body")}
                  autosize
                  minRows={5}
                  value={preview.textBody ?? ""}
                />
                <Textarea
                  readOnly
                  label={t("HTML body")}
                  autosize
                  minRows={10}
                  value={preview.htmlBody ?? ""}
                />
              </Stack>
            </Card>
          ) : null}
        </Stack>
      )}
    </Modal>
  );
}
