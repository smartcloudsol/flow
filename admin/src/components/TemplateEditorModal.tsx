import {
  Alert,
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
import { resolveBackend } from "@smart-cloud/flow-core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { editor, Selection } from "monaco-editor";
import type { FlowBackendClient } from "../api/backend-client";
import type {
  BootConfig,
  EmailTemplate,
  TemplateAttachment,
  TemplatePreviewResponse,
} from "../api/types";
import { t } from "../operations/i18n";
import HtmlTemplateEditor from "./HtmlTemplateEditor";
import {
  addTemplateLocale,
  canonicalizeTemplateLocale,
  ENGLISH_LOCALE,
  getTemplateLocalizationWarnings,
  hasLegacyIncompatibleLocalizations,
  normalizeEmailTemplate,
  removeTemplateLocale,
  serializeEmailTemplate,
  syncLegacyTemplateAliases,
  templateLocaleKeys,
  updateTemplateLocalization,
} from "./email-template-localization";
import MonacoEditor from "./MonacoEditor";
import { useOperationsComboboxProps } from "./OperationsPortalContext";
import { TEMPLATE_VARIABLE_POPOVER_EVENT } from "./tiptap/TemplateVariableComponent";
import TemplateVariablePicker from "./tiptap/TemplateVariablePicker";

function emptyTemplate(boot: BootConfig): EmailTemplate {
  return normalizeEmailTemplate({
    templateKey: "",
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    name: "",
    defaultLocale: ENGLISH_LOCALE,
    localizations: {
      en: {
        subject: "",
        htmlBody: "<p>Hello {{submission.fields.name}}</p>",
        textBody: "Hello {{submission.fields.name}}",
      },
    },
    templateEngine: "handlebars",
    attachments: [],
    enabled: true,
  });
}

function createTemplateDraftId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatAttachmentSize(size?: number): string {
  if (!size || size <= 0) {
    return t("Unknown size");
  }

  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const [activeLocale, setActiveLocale] = useState(ENGLISH_LOCALE);
  const [newLocale, setNewLocale] = useState("");
  const [supportsLocalizedTemplates, setSupportsLocalizedTemplates] = useState<
    boolean | null
  >(null);
  const [preview, setPreview] = useState<TemplatePreviewResponse | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [templateVariablePopoverOpen, setTemplateVariablePopoverOpen] =
    useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const textBodyEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const textBodySelectionRef = useRef<Selection | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const draftIdRef = useRef(createTemplateDraftId());
  const skipDraftCleanupRef = useRef(false);

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
    if (!opened) return;
    let cancelled = false;
    void resolveBackend("templates.admin")
      .then((backend) => {
        if (cancelled) return;
        const version =
          backend.compatibility?.status === "verified"
            ? backend.compatibility.manifest?.capabilities["templates.admin"]
            : undefined;
        setSupportsLocalizedTemplates(
          backend.available && typeof version === "number" && version >= 2,
        );
      })
      .catch(() => {
        if (!cancelled) setSupportsLocalizedTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setPreview(null);
      setNewLocale("");
      setSelectedFormId(null);
      setTemplateVariablePopoverOpen(false);
      setIsUploadingAttachment(false);
      draftIdRef.current = createTemplateDraftId();
      skipDraftCleanupRef.current = false;
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
            const normalized = normalizeEmailTemplate(fullTemplate);
            setEditing(normalized);
            setActiveLocale(normalized.defaultLocale ?? ENGLISH_LOCALE);
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
            const normalized = normalizeEmailTemplate(initialTemplate);
            setEditing(normalized);
            setActiveLocale(normalized.defaultLocale ?? ENGLISH_LOCALE);
          }
        } finally {
          if (!cancelled) {
            setLoadingTemplate(false);
          }
        }
        return;
      }

      const normalized = normalizeEmailTemplate(
        initialTemplate ?? emptyTemplate(boot),
      );
      setEditing(normalized);
      setActiveLocale(normalized.defaultLocale ?? ENGLISH_LOCALE);
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
      const serializedTemplate = serializeEmailTemplate(
        template,
        supportsLocalizedTemplates === true,
      );
      const sanitizedTemplate: EmailTemplate = {
        ...serializedTemplate,
        attachments: (template.attachments ?? []).map((attachment) => ({
          attachmentId: attachment.attachmentId,
          key: attachment.key,
          draftKey: attachment.draftKey,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          size: attachment.size,
          disposition: attachment.disposition ?? "attachment",
          contentId: attachment.contentId,
        })),
      };
      if (isEditingExisting) {
        return client.updateTemplate(template.templateKey, sanitizedTemplate);
      }
      return client.createTemplate(sanitizedTemplate);
    },
    onSuccess: (saved) => {
      skipDraftCleanupRef.current = true;
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

  const cleanupDraftAttachments = async (attachments: TemplateAttachment[]) => {
    const draftKeys = attachments
      .filter((attachment) => attachment.draftKey && !attachment.key)
      .map((attachment) => attachment.draftKey as string);

    await Promise.all(
      draftKeys.map(async (draftKey) => {
        try {
          await client.deleteTemplateAttachmentDraft(draftKey);
        } catch {
          // Ignore cleanup failures when closing the modal.
        }
      }),
    );
  };

  const handleClose = () => {
    const attachments = editing.attachments ?? [];
    if (!skipDraftCleanupRef.current && attachments.length > 0) {
      void cleanupDraftAttachments(attachments);
    }
    onClose();
  };

  const handleRemoveAttachment = async (attachment: TemplateAttachment) => {
    if (attachment.draftKey && !attachment.key) {
      try {
        await client.deleteTemplateAttachmentDraft(attachment.draftKey);
      } catch (error) {
        notifications.show({
          message:
            error instanceof Error
              ? error.message
              : t("Failed to delete draft attachment"),
          color: "red",
        });
      }
    }

    setEditing((current) => ({
      ...current,
      attachments: (current.attachments ?? []).filter(
        (entry) =>
          entry !== attachment &&
          entry.attachmentId !== attachment.attachmentId &&
          entry.draftKey !== attachment.draftKey,
      ),
    }));
  };

  const handleAttachmentSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) {
      return;
    }

    setIsUploadingAttachment(true);

    for (const file of files) {
      try {
        const uploadTarget = await client.createTemplateAttachmentUploadTarget({
          draftId: draftIdRef.current,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        });

        const draftAttachment: TemplateAttachment = {
          attachmentId: uploadTarget.attachmentId,
          draftKey: uploadTarget.draftKey,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          disposition: "attachment",
          uploadStatus: "uploading",
        };

        setEditing((current) => ({
          ...current,
          attachments: [...(current.attachments ?? []), draftAttachment],
        }));

        const response = await fetch(uploadTarget.uploadUrl, {
          method: "PUT",
          headers: uploadTarget.headers,
          body: file,
        });

        if (!response.ok) {
          throw new Error(t("Attachment upload failed"));
        }

        setEditing((current) => ({
          ...current,
          attachments: (current.attachments ?? []).map((attachment) =>
            attachment.draftKey === uploadTarget.draftKey
              ? {
                  ...attachment,
                  uploadStatus: "uploaded",
                  errorMessage: undefined,
                }
              : attachment,
          ),
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("Attachment upload failed");
        notifications.show({ message, color: "red" });
        setEditing((current) => ({
          ...current,
          attachments: (current.attachments ?? []).map((attachment) =>
            attachment.fileName === file.name &&
            attachment.uploadStatus === "uploading"
              ? {
                  ...attachment,
                  uploadStatus: "error",
                  errorMessage: message,
                }
              : attachment,
          ),
        }));
      }
    }

    setIsUploadingAttachment(false);
  };

  const attachments = editing.attachments ?? [];
  const hasUploadingAttachments = attachments.some(
    (attachment) => attachment.uploadStatus === "uploading",
  );
  const localeKeys = templateLocaleKeys(editing);
  const activeContent = editing.localizations?.[activeLocale] ?? {};
  const localizationWarnings = getTemplateLocalizationWarnings(
    editing,
    activeLocale,
  );
  const localizedSaveBlocked =
    supportsLocalizedTemplates === false &&
    hasLegacyIncompatibleLocalizations(editing);

  const handleAddLocale = () => {
    const canonicalLocale = canonicalizeTemplateLocale(newLocale);
    if (!canonicalLocale) {
      notifications.show({
        message: t("Enter a valid BCP 47 locale, for example en, fr, or de-CH."),
        color: "red",
      });
      return;
    }
    setEditing((current) => addTemplateLocale(current, canonicalLocale));
    setActiveLocale(canonicalLocale);
    setNewLocale("");
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
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

          <SimpleGrid cols={{ base: 1, md: 3 }}>
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

          {supportsLocalizedTemplates === false ? (
            <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
              {localizedSaveBlocked
                ? t(
                    "This backend cannot save multiple localized contents. Update the backend before saving this template.",
                  )
                : t(
                    "The connected backend supports one template locale only. Update it to manage multiple localized contents.",
                  )}
            </Alert>
          ) : null}

          {supportsLocalizedTemplates === true ? (
            <Card withBorder style={{ overflow: "visible" }}>
              <Stack gap="sm">
                <Group align="flex-end" wrap="wrap">
                  <Select
                    label={t("Content locale")}
                    description={t("Choose the language content to edit")}
                    value={activeLocale}
                    onChange={(value) => {
                      if (value) {
                        setActiveLocale(value);
                        setPreview(null);
                      }
                    }}
                    data={localeKeys}
                    searchable
                    comboboxProps={comboboxProps}
                  />
                  <Select
                    label={t("Default locale")}
                    description={t("Used when the requested locale is unavailable")}
                    value={editing.defaultLocale ?? ENGLISH_LOCALE}
                    onChange={(value) => {
                      if (!value) return;
                      setEditing((current) =>
                        syncLegacyTemplateAliases({
                          ...current,
                          defaultLocale: value,
                        }),
                      );
                    }}
                    data={localeKeys}
                    comboboxProps={comboboxProps}
                  />
                  <Button
                    variant="light"
                    color="red"
                    disabled={activeLocale === ENGLISH_LOCALE}
                    onClick={() => {
                      setEditing((current) =>
                        removeTemplateLocale(current, activeLocale),
                      );
                      setActiveLocale(ENGLISH_LOCALE);
                      setPreview(null);
                    }}
                  >
                    {t("Remove locale")}
                  </Button>
                </Group>
                <Group align="flex-end">
                  <TextInput
                    label={t("Add locale")}
                    description={t("Use a BCP 47 language tag")}
                    placeholder={t("e.g., fr or de-CH")}
                    value={newLocale}
                    onChange={(event) => setNewLocale(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddLocale();
                      }
                    }}
                  />
                  <Button onClick={handleAddLocale}>{t("Add language")}</Button>
                </Group>
                <Text size="xs" c="dimmed">
                  {t(
                    "English is always retained as the final fallback. Attachments and sender settings apply to every locale.",
                  )}
                </Text>
              </Stack>
            </Card>
          ) : null}

          {localizationWarnings.incomplete ? (
            <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
              {t(
                "This locale is incomplete. Add a subject and at least one HTML or text body.",
              )}
            </Alert>
          ) : null}
          {localizationWarnings.placeholderMismatch ? (
            <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
              {t(
                "Template placeholders differ from the default locale. Check that every required variable is present.",
              )}
            </Alert>
          ) : null}

          <TextInput
            label={t("Subject")}
            description={t(
              "Use {{path}} or {{path | fallback text}} for dynamic values.",
            )}
            placeholder={t(
              "Thank you {{submission.fields.name | there}} for your submission",
            )}
            value={activeContent.subject ?? ""}
            onChange={(e) =>
              setEditing((current) =>
                updateTemplateLocalization(current, activeLocale, {
                  subject: e.currentTarget.value,
                }),
              )
            }
          />

          <Stack gap="xs">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text size="sm" fw={500}>
                  {t("Attachments")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t(
                    "Only template-owned outgoing attachments are sent with the email.",
                  )}
                </Text>
              </div>
              <Button
                variant="light"
                onClick={() => attachmentInputRef.current?.click()}
                loading={isUploadingAttachment}
              >
                {t("Add attachment")}
              </Button>
            </Group>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void handleAttachmentSelection(event);
              }}
            />
            {attachments.length > 0 ? (
              <Stack gap="xs">
                {attachments.map((attachment) => (
                  <Card
                    key={
                      attachment.draftKey ??
                      attachment.key ??
                      attachment.attachmentId ??
                      attachment.fileName
                    }
                    withBorder
                  >
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      <div>
                        <Text fw={500}>{attachment.fileName}</Text>
                        <Text size="sm" c="dimmed">
                          {attachment.contentType || "application/octet-stream"}{" "}
                          | {formatAttachmentSize(attachment.size)}
                        </Text>
                        {attachment.uploadStatus === "uploading" ? (
                          <Text size="xs" c="blue">
                            {t("Uploading...")}
                          </Text>
                        ) : null}
                        {attachment.uploadStatus === "error" ? (
                          <Text size="xs" c="red">
                            {attachment.errorMessage || t("Upload failed")}
                          </Text>
                        ) : null}
                      </div>
                      <Button
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          void handleRemoveAttachment(attachment);
                        }}
                      >
                        {t("Remove")}
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Card withBorder>
                <Text size="sm" c="dimmed">
                  {t("No attachments added yet.")}
                </Text>
              </Card>
            )}
          </Stack>

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
              value={activeContent.htmlBody ?? ""}
              onChange={(value) =>
                setEditing((current) =>
                  updateTemplateLocalization(current, activeLocale, {
                    htmlBody: value ?? "",
                  }),
                )
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
              value={activeContent.textBody ?? ""}
              onChange={(value) =>
                setEditing((current) =>
                  updateTemplateLocalization(current, activeLocale, {
                    textBody: value ?? "",
                  }),
                )
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
                (!isEditingExisting && existingKeys.has(editing.templateKey)) ||
                hasUploadingAttachments ||
                supportsLocalizedTemplates === null ||
                localizedSaveBlocked
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
                  activeLocale,
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
