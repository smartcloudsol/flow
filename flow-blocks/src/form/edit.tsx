import { DEFAULT_THEME } from "@mantine/core";
import {
  FlowBackendClient,
  getDecisionForAdminBackend,
} from "@smart-cloud/flow-admin/editor-runtime";
import {
  LANGUAGE_OPTIONS,
  TEXT_DOMAIN,
  getFlowPlugin,
} from "@smart-cloud/flow-core";
import { getWpSuite, type SiteSettings } from "@smart-cloud/wpsuite-core";
import { createBlock, serialize, type BlockInstance } from "@wordpress/blocks";
import {
  BlockControls,
  InnerBlocks,
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  Button,
  CheckboxControl,
  ColorPicker,
  ComboboxControl,
  Modal,
  Notice,
  PanelBody,
  Popover,
  RadioControl,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
  ToolbarButton,
  ToolbarDropdownMenu,
  ToolbarGroup,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { store as editorStore } from "@wordpress/editor";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { check, close, plus, seen, settings } from "@wordpress/icons";
import { DIRECTION_OPTIONS } from "../index";
import { parseOptions } from "../shared/field-utils";
import type {
  FieldConfig,
  FormActionDefinition,
  FormAttributes,
  FormStateContents,
  SuccessStateTrigger,
} from "../shared/types";
import type { FormPreviewSelection } from "../runtime/context/FormPreviewContext";
import { renderForm, type RenderFormHandle } from "./renderForm";
import { useFormSync } from "./useFormSync";

type EditableFormAction = {
  actionKey: string;
  label: string;
  allowedFromStatusesText: string;
  targetStatus: string;
  templateKey: string;
  eventName: string;
  wpHookName: string;
  enabled: boolean;
};

const EMPTY_FORM_ACTION: EditableFormAction = {
  actionKey: "",
  label: "",
  allowedFromStatusesText: "",
  targetStatus: "",
  templateKey: "",
  eventName: "",
  wpHookName: "",
  enabled: true,
};

function normalizeActionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-");
}

function parseStatusesText(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((status) => status.trim())
    .filter(Boolean);
}

function isMissingTemplateError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("404") ||
    message.includes("template not found") ||
    message.includes("not found")
  );
}

function toEditableFormAction(
  action?: FormActionDefinition,
): EditableFormAction {
  if (!action) {
    return { ...EMPTY_FORM_ACTION };
  }

  return {
    actionKey: action.actionKey ?? "",
    label: action.label ?? "",
    allowedFromStatusesText: (action.allowedFromStatuses ?? []).join("\n"),
    targetStatus: action.targetStatus ?? "",
    templateKey: action.templateKey ?? "",
    eventName: action.eventName ?? "",
    wpHookName: action.wpHookName ?? "",
    enabled: action.enabled !== false,
  };
}

function toStoredFormAction(
  action: EditableFormAction,
): FormActionDefinition | null {
  const label = action.label.trim();
  const actionKey = normalizeActionKey(action.actionKey || label);

  if (!label || !actionKey) {
    return null;
  }

  const allowedFromStatuses = parseStatusesText(action.allowedFromStatusesText);

  return {
    actionKey,
    label,
    ...(allowedFromStatuses.length ? { allowedFromStatuses } : {}),
    ...(action.targetStatus.trim()
      ? { targetStatus: action.targetStatus.trim() }
      : {}),
    ...(action.templateKey.trim()
      ? { templateKey: action.templateKey.trim() }
      : {}),
    ...(action.eventName.trim() ? { eventName: action.eventName.trim() } : {}),
    ...(action.wpHookName.trim()
      ? { wpHookName: action.wpHookName.trim() }
      : {}),
    enabled: action.enabled,
  };
}

function getActionValidationMessage(
  action: EditableFormAction,
  actions: FormActionDefinition[],
  editingIndex: number | null,
): string | null {
  if (!action.label.trim()) {
    return __("Action label is required.", TEXT_DOMAIN);
  }

  const nextAction = toStoredFormAction(action);
  if (!nextAction?.actionKey) {
    return __(
      "Action key is required or must be derivable from the label.",
      TEXT_DOMAIN,
    );
  }

  const duplicateIndex = actions.findIndex(
    (item, index) =>
      index !== editingIndex && item.actionKey === nextAction.actionKey,
  );

  if (duplicateIndex >= 0) {
    return __("Action key must be unique within the form.", TEXT_DOMAIN);
  }

  return null;
}

function describeAction(action: FormActionDefinition): string {
  const parts: string[] = [];

  if (action.allowedFromStatuses?.length) {
    parts.push(
      `${__("Allowed from", TEXT_DOMAIN)}: ${action.allowedFromStatuses.join(
        ", ",
      )}`,
    );
  }
  if (action.targetStatus) {
    parts.push(`${__("Target status", TEXT_DOMAIN)}: ${action.targetStatus}`);
  }
  if (action.templateKey) {
    parts.push(`${__("Template", TEXT_DOMAIN)}: ${action.templateKey}`);
  }

  return parts.join(" · ");
}

function createContactTemplateBlocks(): BlockInstance[] {
  return [
    createBlock("smartcloud-flow/text-field", {
      name: "fullName",
      label: "Full name",
      required: true,
    }),
    createBlock("smartcloud-flow/text-field", {
      name: "email",
      label: "Email",
      required: true,
      placeholder: "you@example.com",
    }),
    createBlock("smartcloud-flow/textarea-field", {
      name: "message",
      label: "Message",
      required: true,
    }),
    createBlock("smartcloud-flow/submit-button", { label: "Send" }),
  ];
}

function createNewsletterTemplateBlocks(): BlockInstance[] {
  return [
    createBlock(
      "smartcloud-flow/group",
      {
        align: "flex-end",
        justify: "flex-start",
        gap: "sm",
        grow: false,
      },
      [
        createBlock("smartcloud-flow/text-field", {
          name: "newsletterEmail",
          label: "Email",
          required: true,
          placeholder: "you@example.com",
        }),
        createBlock("smartcloud-flow/submit-button", {
          label: "Subscribe",
        }),
      ],
    ),
  ];
}

function createDraftEnabledTemplateBlocks(): BlockInstance[] {
  return [
    createBlock("smartcloud-flow/text-field", {
      name: "fullName",
      label: "Full name",
      required: true,
    }),
    createBlock("smartcloud-flow/text-field", {
      name: "email",
      label: "Email",
      required: true,
      placeholder: "you@example.com",
    }),
    createBlock("smartcloud-flow/text-field", {
      name: "company",
      label: "Company",
    }),
    createBlock("smartcloud-flow/textarea-field", {
      name: "projectGoals",
      label: "What would you like to achieve?",
      required: true,
    }),
    createBlock("smartcloud-flow/save-draft-button", {
      label: "Save draft",
    }),
    createBlock("smartcloud-flow/submit-button", { label: "Request a demo" }),
  ];
}

function createWizardTemplateBlocks(): BlockInstance[] {
  return [
    createBlock(
      "smartcloud-flow/wizard",
      {
        title: "Project inquiry",
        subtitle: "Two quick steps to get started",
        showProgress: true,
        progressType: "numbers",
      },
      [
        createBlock(
          "smartcloud-flow/wizard-step",
          {
            title: "Your details",
            description: "Tell us who you are.",
          },
          [
            createBlock("smartcloud-flow/text-field", {
              name: "fullName",
              label: "Full name",
              required: true,
            }),
            createBlock("smartcloud-flow/text-field", {
              name: "email",
              label: "Email",
              required: true,
              placeholder: "you@example.com",
            }),
          ],
        ),
        createBlock(
          "smartcloud-flow/wizard-step",
          {
            title: "Project scope",
            description: "A few details before you submit.",
          },
          [
            createBlock("smartcloud-flow/text-field", {
              name: "company",
              label: "Company",
            }),
            createBlock("smartcloud-flow/textarea-field", {
              name: "message",
              label: "Message",
              required: true,
            }),
            createBlock("smartcloud-flow/submit-button", { label: "Send" }),
          ],
        ),
      ],
    ),
  ];
}

const FIELD_BLOCK_MAPPING: Record<string, string> = {
  "smartcloud-flow/text-field": "text",
  "smartcloud-flow/textarea-field": "textarea",
  "smartcloud-flow/select-field": "select",
  "smartcloud-flow/checkbox-field": "checkbox",
  "smartcloud-flow/checkbox-group-field": "checkbox-group",
  "smartcloud-flow/date-field": "date",
  "smartcloud-flow/switch-field": "switch",
  "smartcloud-flow/number-field": "number",
  "smartcloud-flow/radio-field": "radio",
  "smartcloud-flow/password-field": "password",
  "smartcloud-flow/pin-field": "pin",
  "smartcloud-flow/color-field": "color",
  "smartcloud-flow/file-field": "file",
  "smartcloud-flow/slider-field": "slider",
  "smartcloud-flow/range-slider-field": "rangeslider",
  "smartcloud-flow/tags-field": "tags",
  "smartcloud-flow/rating-field": "rating",
  "smartcloud-flow/save-draft-button": "save-draft",
  "smartcloud-flow/ai-suggestions": "ai-suggestions",
  "smartcloud-flow/submit-button": "submit",
  "smartcloud-flow/fieldset": "fieldset",
  "smartcloud-flow/collapse": "collapse",
  "smartcloud-flow/divider": "divider",
  "smartcloud-flow/visually-hidden": "visuallyhidden",
  "smartcloud-flow/stack": "stack",
  "smartcloud-flow/group": "group",
  "smartcloud-flow/grid": "grid",
  "smartcloud-flow/wizard": "wizard",
  "smartcloud-flow/wizard-step": "wizard-step",
};

/**
 * Recursively convert Gutenberg blocks to FieldConfig
 */
function blockToFieldConfig(block: BlockInstance): FieldConfig | null {
  const fieldType = FIELD_BLOCK_MAPPING[block.name as string];
  if (!fieldType) return null;

  // Convert optionsText to options array for select and radio fields
  if (
    (fieldType === "select" ||
      fieldType === "radio" ||
      fieldType === "checkbox-group" ||
      fieldType === "tags") &&
    (block.attributes as Record<string, unknown>)?.optionsText
  ) {
    const { optionsText, ...restAttrs } = block.attributes as Record<
      string,
      unknown
    >;
    return {
      type: fieldType,
      ...restAttrs,
      options:
        !restAttrs.optionsSource || restAttrs.optionsSource === "static"
          ? parseOptions(optionsText as string)
          : undefined,
    } as FieldConfig;
  }

  if (fieldType === "pin") {
    const {
      type: legacyInputType,
      inputType,
      ...restAttrs
    } = (block.attributes as Record<string, unknown>) ?? {};

    return {
      ...restAttrs,
      type: "pin",
      inputType: inputType ?? legacyInputType ?? "number",
    } as FieldConfig;
  }

  if (fieldType === "slider" || fieldType === "rangeslider") {
    const {
      marksData,
      marks: legacyMarks,
      ...restAttrs
    } = (block.attributes as Record<string, unknown>) ?? {};

    return {
      ...restAttrs,
      type: fieldType,
      ...(Array.isArray(marksData)
        ? { marks: marksData }
        : legacyMarks === true &&
          typeof restAttrs.min === "number" &&
          typeof restAttrs.max === "number"
        ? {
            marks: [
              { value: restAttrs.min as number },
              { value: restAttrs.max as number },
            ],
          }
        : {}),
    } as FieldConfig;
  }

  // Handle container blocks (stack, group, grid, fieldset, collapse, visuallyhidden) with nested children
  if (
    fieldType === "stack" ||
    fieldType === "group" ||
    fieldType === "grid" ||
    fieldType === "fieldset" ||
    fieldType === "collapse" ||
    fieldType === "visuallyhidden"
  ) {
    const children = (block.innerBlocks || [])
      .map(blockToFieldConfig)
      .filter(Boolean) as FieldConfig[];

    return {
      type: fieldType,
      ...(block.attributes as Record<string, unknown>),
      children,
    } as FieldConfig;
  }

  // Handle wizard block with wizard-step children
  if (fieldType === "wizard") {
    const steps = (block.innerBlocks || [])
      .filter((innerBlock) => innerBlock.name === "smartcloud-flow/wizard-step")
      .map((stepBlock) => {
        const children = (stepBlock.innerBlocks || [])
          .map(blockToFieldConfig)
          .filter(Boolean) as FieldConfig[];

        return {
          title: (stepBlock.attributes as Record<string, unknown>)
            ?.title as string,
          description: (stepBlock.attributes as Record<string, unknown>)
            ?.description as string,
          hidden: Boolean(
            (stepBlock.attributes as Record<string, unknown>)?.hidden,
          ),
          conditionalLogic: (stepBlock.attributes as Record<string, unknown>)
            ?.conditionalLogic,
          children,
        };
      });

    return {
      type: "wizard",
      ...(block.attributes as Record<string, unknown>),
      steps,
    } as FieldConfig;
  }

  // wizard-step blocks are handled by the wizard block, skip them here
  if (fieldType === "wizard-step") {
    return null;
  }

  return {
    type: fieldType,
    ...(block.attributes as Record<string, unknown>),
  } as FieldConfig;
}

type WizardPreviewOption = {
  key: string;
  label: string;
  wizardPath: string;
  stepIndex: number;
};

type SuccessStatePreviewOption = {
  key: string;
  label: string;
  trigger: SuccessStateTrigger;
  html: string;
};

function collectWizardPreviewOptions(fields: FieldConfig[]) {
  const options: WizardPreviewOption[] = [];
  let wizardCount = 0;

  const visit = (items: FieldConfig[], path: number[] = []) => {
    items.forEach((field, index) => {
      const nextPath = [...path, index];

      if (field.type === "wizard") {
        wizardCount += 1;
        const wizardLabel =
          field.title?.trim() ||
          `${__("Wizard", TEXT_DOMAIN)} ${String(wizardCount)}`;

        field.steps.forEach((step, stepIndex) => {
          const stepTitle = step.title?.trim();
          options.push({
            key: `wizard:${nextPath.join(".")}:${String(stepIndex)}`,
            label: stepTitle
              ? `${wizardLabel} · ${__("Step", TEXT_DOMAIN)} ${String(
                  stepIndex + 1,
                )}: ${stepTitle}`
              : `${wizardLabel} · ${__("Step", TEXT_DOMAIN)} ${String(
                  stepIndex + 1,
                )}`,
            wizardPath: nextPath.join("."),
            stepIndex,
          });
        });
      }

      const childFields = (field as { children?: FieldConfig[] }).children;
      if (Array.isArray(childFields) && childFields.length > 0) {
        visit(childFields, nextPath);
      }
    });
  };

  visit(fields);

  return options;
}

function collectSuccessStatePreviewOptions(blocks: BlockInstance[]) {
  const optionsByTrigger = new Map<
    SuccessStateTrigger,
    SuccessStatePreviewOption
  >();

  blocks.forEach((block) => {
    if (block.name !== "smartcloud-flow/success-state") {
      return;
    }

    const trigger =
      block.attributes?.trigger === "ai-accepted"
        ? "ai-accepted"
        : "submit-success";

    optionsByTrigger.set(trigger, {
      key: `success:${trigger}`,
      label:
        trigger === "ai-accepted"
          ? __("Success State · AI suggestion was accepted", TEXT_DOMAIN)
          : __("Success State · Form was submitted", TEXT_DOMAIN),
      trigger,
      html: serialize(block.innerBlocks ?? []),
    });
  });

  return Array.from(optionsByTrigger.values());
}

function previewSelectionKey(selection: FormPreviewSelection) {
  if (selection.mode === "wizard-step") {
    return `wizard:${selection.wizardPath || ""}:${String(
      selection.stepIndex ?? 0,
    )}`;
  }

  if (selection.mode === "success-state") {
    return `success:${selection.successTrigger || "submit-success"}`;
  }

  return "form";
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: FormAttributes;
  setAttributes: (next: Partial<FormAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps({
    className: "smartcloud-flow-form-editor",
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<RenderFormHandle | null>(null);
  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(
    null,
  );
  const colorButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { replaceInnerBlocks } = useDispatch(blockEditorStore) as unknown as {
    replaceInnerBlocks: (
      rootClientId: string,
      blocks: BlockInstance[],
      updateSelection?: boolean,
    ) => void;
  };

  // State for available templates and workflows
  const [availableTemplates, setAvailableTemplates] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(
    null,
  );
  const [editingAction, setEditingAction] = useState<EditableFormAction>({
    ...EMPTY_FORM_ACTION,
  });

  // Get current post ID
  const postId = useSelect((select) => {
    const editorSelect = select(editorStore) as unknown as {
      getCurrentPostId: () => string | number;
    };
    const id = editorSelect.getCurrentPostId();
    return typeof id === "number" ? id : parseInt(String(id), 10);
  }, []);

  // Get backend sync settings
  const backendSyncEnabled = useSelect(() => {
    const plugin = getFlowPlugin();
    return plugin?.settings?.formsBackendSyncEnabled ?? true;
  }, []);

  // Get inner blocks from block editor store
  const innerBlocks = useSelect(
    (select) => {
      const { getBlocks } = select(blockEditorStore) as unknown as {
        getBlocks: (id: string) => BlockInstance[];
      };
      return getBlocks(clientId);
    },
    [clientId],
  );

  // Convert inner blocks to field configs (memoized to avoid unnecessary re-renders)
  const fields: FieldConfig[] = useMemo(
    () =>
      (innerBlocks || [])
        .map(blockToFieldConfig)
        .filter(Boolean) as FieldConfig[],
    [innerBlocks],
  );
  const wizardPreviewOptions = useMemo(
    () => collectWizardPreviewOptions(fields),
    [fields],
  );
  const successStatePreviewOptions = useMemo(
    () => collectSuccessStatePreviewOptions(innerBlocks || []),
    [innerBlocks],
  );
  const previewStates = useMemo<FormStateContents>(() => {
    const states: FormStateContents = {
      successStates: {},
    };

    successStatePreviewOptions.forEach((option) => {
      states.successStates![option.trigger] = { html: option.html };

      if (option.trigger === "submit-success") {
        states.success = { html: option.html };
      }
    });

    return states;
  }, [successStatePreviewOptions]);
  const [previewSelection, setPreviewSelection] =
    useState<FormPreviewSelection>({
      mode: "form",
    });
  const previewSelectionKeyValue = useMemo(
    () => previewSelectionKey(previewSelection),
    [previewSelection],
  );
  const previewControls = useMemo(
    () => [
      {
        icon: previewSelection.mode === "form" ? check : undefined,
        title: __("Form", TEXT_DOMAIN),
        onClick: () => setPreviewSelection({ mode: "form" }),
      },
      ...wizardPreviewOptions.map((option) => ({
        icon: option.key === previewSelectionKeyValue ? check : undefined,
        title: option.label,
        onClick: () =>
          setPreviewSelection({
            mode: "wizard-step",
            wizardPath: option.wizardPath,
            stepIndex: option.stepIndex,
          }),
      })),
      ...successStatePreviewOptions.map((option) => ({
        icon: option.key === previewSelectionKeyValue ? check : undefined,
        title: option.label,
        onClick: () =>
          setPreviewSelection({
            mode: "success-state",
            successTrigger: option.trigger,
          }),
      })),
    ],
    [
      previewSelection.mode,
      previewSelectionKeyValue,
      successStatePreviewOptions,
      wizardPreviewOptions,
    ],
  );

  useEffect(() => {
    const validKeys = new Set<string>([
      "form",
      ...wizardPreviewOptions.map((option) => option.key),
      ...successStatePreviewOptions.map((option) => option.key),
    ]);

    if (!validKeys.has(previewSelectionKeyValue)) {
      setPreviewSelection({ mode: "form" });
    }
  }, [
    previewSelectionKeyValue,
    successStatePreviewOptions,
    wizardPreviewOptions,
  ]);

  const applyBuiltInTemplate = useCallback(
    (blocks: BlockInstance[], nextAttributes: Partial<FormAttributes>) => {
      if (innerBlocks.length > 0) {
        const confirmed = window.confirm(
          __(
            "This will replace the current form fields with the selected template. Continue?",
            TEXT_DOMAIN,
          ),
        );

        if (!confirmed) {
          return;
        }
      }

      replaceInnerBlocks(clientId, blocks, true);
      setAttributes(nextAttributes);
      setShowCustomization(true);
    },
    [clientId, innerBlocks.length, replaceInnerBlocks, setAttributes],
  );

  const templateControls = useMemo(
    () => [
      {
        title: __("Contact form", TEXT_DOMAIN),
        onClick: () => {
          applyBuiltInTemplate(createContactTemplateBlocks(), {
            formName: "Contact us",
            endpointPath: "",
            allowDrafts: false,
            showDraftResumePanel: true,
          });
        },
      },
      {
        title: __("Newsletter signup", TEXT_DOMAIN),
        onClick: () => {
          applyBuiltInTemplate(createNewsletterTemplateBlocks(), {
            formName: "Newsletter signup",
            endpointPath: "",
            allowDrafts: false,
            showDraftResumePanel: true,
          });
        },
      },
      {
        title: __("Lead form with draft saving (PRO)", TEXT_DOMAIN),
        onClick: () => {
          applyBuiltInTemplate(createDraftEnabledTemplateBlocks(), {
            formName: "Lead form (PRO)",
            endpointPath: "",
            allowDrafts: true,
            showDraftResumePanel: true,
          });
        },
      },
      {
        title: __("Wizard starter form", TEXT_DOMAIN),
        onClick: () => {
          applyBuiltInTemplate(createWizardTemplateBlocks(), {
            formName: "Wizard form",
            endpointPath: "",
            allowDrafts: false,
            showDraftResumePanel: true,
          });
        },
      },
    ],
    [applyBuiltInTemplate],
  );
  const configuredActions = useMemo(
    () => attributes.actions ?? [],
    [attributes.actions],
  );
  const actionValidationMessage = useMemo(
    () =>
      getActionValidationMessage(
        editingAction,
        configuredActions,
        editingActionIndex,
      ),
    [configuredActions, editingAction, editingActionIndex],
  );

  const openCreateActionModal = useCallback(() => {
    setEditingActionIndex(null);
    setEditingAction({ ...EMPTY_FORM_ACTION });
    setActionModalOpen(true);
  }, []);

  const openEditActionModal = useCallback(
    (index: number) => {
      setEditingActionIndex(index);
      setEditingAction(toEditableFormAction(configuredActions[index]));
      setActionModalOpen(true);
    },
    [configuredActions],
  );

  const closeActionModal = useCallback(() => {
    setActionModalOpen(false);
    setEditingActionIndex(null);
    setEditingAction({ ...EMPTY_FORM_ACTION });
  }, []);

  const saveEditedAction = useCallback(() => {
    const nextAction = toStoredFormAction(editingAction);
    if (!nextAction || actionValidationMessage) {
      return;
    }

    const nextActions = [...configuredActions];
    if (editingActionIndex === null) {
      nextActions.push(nextAction);
    } else {
      nextActions[editingActionIndex] = nextAction;
    }

    setAttributes({ actions: nextActions });
    closeActionModal();
  }, [
    actionValidationMessage,
    closeActionModal,
    configuredActions,
    editingAction,
    editingActionIndex,
    setAttributes,
  ]);

  const deleteAction = useCallback(
    (index: number) => {
      const action = configuredActions[index];
      if (!action) {
        return;
      }

      const confirmed = window.confirm(
        __(
          "Delete this manual action from the form configuration?",
          TEXT_DOMAIN,
        ),
      );

      if (!confirmed) {
        return;
      }

      setAttributes({
        actions: configuredActions.filter(
          (_, actionIndex) => actionIndex !== index,
        ),
      });
    },
    [configuredActions, setAttributes],
  );

  // Load available templates and workflows from backend
  useEffect(() => {
    const loadBackendOptions = async () => {
      if (!backendSyncEnabled) return;

      try {
        const decision = await getDecisionForAdminBackend();
        if (!decision.backendAvailable) return;

        const siteSettings = getWpSuite()?.siteSettings as
          | SiteSettings
          | undefined;
        const boot = {
          settings: getFlowPlugin()!.settings,
          accountId: String(siteSettings?.accountId || ""),
          siteId: String(siteSettings?.siteId || ""),
        };

        const client = new FlowBackendClient(boot);

        // Load templates
        try {
          const templatesResponse = await client.listTemplates();
          const templateOptions = (templatesResponse.items || []).map((t) => ({
            value: t.templateKey,
            label: t.name || t.templateKey,
          }));
          const currentAutoReplyTemplateKey =
            attributes.autoReplyTemplateKey?.trim() ?? "";

          if (
            currentAutoReplyTemplateKey &&
            !templateOptions.some(
              (template) => template.value === currentAutoReplyTemplateKey,
            )
          ) {
            try {
              const currentTemplate = await client.getTemplate(
                currentAutoReplyTemplateKey,
              );
              templateOptions.unshift({
                value: currentTemplate.templateKey,
                label: currentTemplate.name || currentTemplate.templateKey,
              });
            } catch (error) {
              if (isMissingTemplateError(error)) {
                setAttributes({ autoReplyTemplateKey: "" });
              } else {
                console.warn("Failed to verify auto-reply template:", error);
              }
            }
          }

          setAvailableTemplates(templateOptions);
        } catch (error) {
          console.warn("Failed to load templates:", error);
        }

        // Load workflows
        try {
          const workflowsResponse = await client.listWorkflows();
          setAvailableWorkflows(
            (workflowsResponse.items || []).map((w) => ({
              value: w.workflowId,
              label: w.name || w.workflowId,
            })),
          );
        } catch (error) {
          console.warn("Failed to load workflows:", error);
        }
      } catch (error) {
        console.error("Failed to initialize backend options:", error);
      }
    };

    loadBackendOptions();
  }, [attributes.autoReplyTemplateKey, backendSyncEnabled, setAttributes]);

  // Use backend sync hook
  const { syncStatus, performSync } = useFormSync({
    postId,
    enabled: backendSyncEnabled,
    formAttributes: attributes,
    fields,
    setAttributes,
  });

  // Serialize fields for dependency tracking
  const fieldsKey = JSON.stringify(fields);

  // Render/update form preview in shadow DOM
  useEffect(() => {
    if (!previewRef.current) return;

    let cancelled = false;

    // Async render function
    const doRender = async () => {
      // Unmount previous render
      if (handleRef.current) {
        handleRef.current.unmount();
        handleRef.current = null;
      }

      if (cancelled) return;

      // Render new preview
      try {
        const handle = await renderForm({
          target: previewRef.current!,
          form: attributes,
          fields,
          states: previewStates,
          preview: previewSelection,
        });

        if (!cancelled) {
          handleRef.current = handle;
        } else {
          // If cancelled during render, cleanup immediately
          handle.unmount();
        }
      } catch (error) {
        console.error("Failed to render form preview:", error);
      }
    };

    doRender();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (handleRef.current) {
        handleRef.current.unmount();
        handleRef.current = null;
      }
    };
    // fieldsKey already includes fields serialization, so fields dependency is not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, fieldsKey, previewSelection, previewStates]);

  return (
    <div {...blockProps}>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarDropdownMenu
            icon={seen}
            label={__("Preview state", TEXT_DOMAIN)}
            controls={previewControls}
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon={showCustomization ? close : settings}
            label={
              showCustomization
                ? __("Hide Form Editor", TEXT_DOMAIN)
                : __("Show Form Editor", TEXT_DOMAIN)
            }
            onClick={() => setShowCustomization(!showCustomization)}
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarDropdownMenu
            icon={plus}
            label={__("Insert form template", TEXT_DOMAIN)}
            controls={templateControls}
          />
        </ToolbarGroup>
      </BlockControls>
      <InspectorControls>
        <PanelBody title={__("Form settings", TEXT_DOMAIN)} initialOpen>
          <ComboboxControl
            label={__("Language", TEXT_DOMAIN)}
            value={attributes.language || ""}
            options={[
              { value: "", label: __("--- Select ---", TEXT_DOMAIN) },
              ...LANGUAGE_OPTIONS,
            ]}
            onChange={(value) => {
              setAttributes({ language: value || undefined });
            }}
            help={__("Set the form's display language.", TEXT_DOMAIN)}
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={attributes.direction || "auto"}
            options={DIRECTION_OPTIONS}
            onChange={(value) => {
              setAttributes({ direction: value });
            }}
            help={__(
              "Choose the form's layout direction—Auto (default; follows the selected language), Left‑to‑Right, or Right‑to‑Left.",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <TextControl
            label={__("Form name", TEXT_DOMAIN)}
            value={attributes.formName ?? ""}
            onChange={(formName) => setAttributes({ formName })}
            help={__(
              "Display name for the form. Shown in admin and analytics.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Endpoint path", TEXT_DOMAIN)}
            value={attributes.endpointPath ?? ""}
            onChange={(endpointPath) => setAttributes({ endpointPath })}
            help={__(
              "API endpoint for form submission. Leave empty for default.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Submit label", TEXT_DOMAIN)}
            value={attributes.submitLabel ?? __("Submit", TEXT_DOMAIN)}
            placeholder={__("Submit", TEXT_DOMAIN)}
            onChange={(submitLabel) => setAttributes({ submitLabel })}
            help={__("Button text for submitting the form.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Success message", TEXT_DOMAIN)}
            value={attributes.successMessage ?? ""}
            onChange={(successMessage) => setAttributes({ successMessage })}
            help={__("Message shown after successful submission.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Error message", TEXT_DOMAIN)}
            value={attributes.errorMessage ?? ""}
            onChange={(errorMessage) => setAttributes({ errorMessage })}
            help={__("Message shown if submission fails.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hide form on success", TEXT_DOMAIN)}
            checked={attributes.hideFormOnSuccess ?? true}
            onChange={(hideFormOnSuccess) =>
              setAttributes({ hideFormOnSuccess })
            }
            help={__(
              "Hide form fields after successful submission and only show the success message.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>

        <PanelBody title={__("Drafts", TEXT_DOMAIN)} initialOpen={false}>
          <ToggleControl
            label={__("Allow draft saving", TEXT_DOMAIN)}
            checked={attributes.allowDrafts ?? false}
            onChange={(allowDrafts) => setAttributes({ allowDrafts })}
            help={__(
              "Allow visitors to save a partially completed form and resume it later.",
              TEXT_DOMAIN,
            )}
          />

          <ToggleControl
            label={__("Show draft resume panel", TEXT_DOMAIN)}
            checked={attributes.showDraftResumePanel ?? true}
            onChange={(showDraftResumePanel) =>
              setAttributes({ showDraftResumePanel })
            }
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "Display a resume panel above the form where users can load an existing draft.",
              TEXT_DOMAIN,
            )}
          />

          <TextControl
            label={__("Draft expiry (days)", TEXT_DOMAIN)}
            type="number"
            min={1}
            value={String(attributes.draftExpiryDays ?? 30)}
            onChange={(value) => {
              const next = parseInt(value, 10);
              setAttributes({
                draftExpiryDays: Number.isNaN(next) ? 30 : next,
              });
            }}
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "How long saved drafts remain resumable before expiring.",
              TEXT_DOMAIN,
            )}
          />

          <ToggleControl
            label={__("Allow draft deletion", TEXT_DOMAIN)}
            checked={attributes.draftAllowDelete ?? true}
            onChange={(draftAllowDelete) => setAttributes({ draftAllowDelete })}
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "Allow users to delete a saved draft from the resume panel.",
              TEXT_DOMAIN,
            )}
          />

          <TextControl
            label={__("Resume panel title", TEXT_DOMAIN)}
            value={attributes.draftResumeTitle ?? ""}
            onChange={(draftResumeTitle) => setAttributes({ draftResumeTitle })}
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "Heading shown above the draft resume inputs.",
              TEXT_DOMAIN,
            )}
          />

          <TextareaControl
            label={__("Resume panel description", TEXT_DOMAIN)}
            value={attributes.draftResumeDescription ?? ""}
            onChange={(draftResumeDescription) =>
              setAttributes({ draftResumeDescription })
            }
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "Helper text shown in the draft resume panel.",
              TEXT_DOMAIN,
            )}
          />

          <TextControl
            label={__("Draft save success message", TEXT_DOMAIN)}
            value={attributes.draftSaveSuccessMessage ?? ""}
            onChange={(draftSaveSuccessMessage) =>
              setAttributes({ draftSaveSuccessMessage })
            }
            disabled={!(attributes.allowDrafts ?? false)}
            help={__(
              "Message shown after a draft is successfully saved.",
              TEXT_DOMAIN,
            )}
          />

          {!(attributes.allowDrafts ?? false) && (
            <Notice status="warning" isDismissible={false}>
              <p style={{ margin: 0, fontSize: "13px" }}>
                {__(
                  "Draft-related buttons stay hidden in the form until draft saving is enabled here.",
                  TEXT_DOMAIN,
                )}
              </p>
            </Notice>
          )}
        </PanelBody>

        {/* Backend Sync Panel */}
        {backendSyncEnabled && (
          <PanelBody
            title={__("Backend Sync", TEXT_DOMAIN)}
            initialOpen={false}
          >
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong style={{ fontSize: "13px" }}>
                  {__("Status:", TEXT_DOMAIN)}
                </strong>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    backgroundColor:
                      syncStatus.status === "synced"
                        ? "#d4edda"
                        : syncStatus.status === "syncing"
                        ? "#d1ecf1"
                        : syncStatus.status === "error"
                        ? "#f8d7da"
                        : "#e2e3e5",
                    color:
                      syncStatus.status === "synced"
                        ? "#155724"
                        : syncStatus.status === "syncing"
                        ? "#0c5460"
                        : syncStatus.status === "error"
                        ? "#721c24"
                        : "#383d41",
                  }}
                >
                  {syncStatus.status === "synced" && __("Synced", TEXT_DOMAIN)}
                  {syncStatus.status === "syncing" &&
                    __("Syncing...", TEXT_DOMAIN)}
                  {syncStatus.status === "error" && __("Error", TEXT_DOMAIN)}
                  {syncStatus.status === "idle" &&
                    __("Not synced", TEXT_DOMAIN)}
                </span>
              </div>
            </div>

            {syncStatus.formId && (
              <TextControl
                label={__("Backend Form ID", TEXT_DOMAIN)}
                value={syncStatus.formId}
                onChange={() => {}} // Read-only field
                disabled
                help={__(
                  "Unique identifier assigned by the backend service. Read-only.",
                  TEXT_DOMAIN,
                )}
              />
            )}

            {syncStatus.lastSynced && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#757575",
                  marginTop: "8px",
                  marginBottom: "12px",
                }}
              >
                {__("Last synced:", TEXT_DOMAIN)}{" "}
                {new Date(syncStatus.lastSynced).toLocaleString()}
              </p>
            )}

            {syncStatus.lastError && (
              <Notice status="error" isDismissible={false}>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  {syncStatus.lastError}
                </p>
              </Notice>
            )}

            <Button
              variant="secondary"
              onClick={performSync}
              disabled={syncStatus.status === "syncing"}
            >
              {syncStatus.status === "syncing"
                ? __("Syncing...", TEXT_DOMAIN)
                : __("Sync Now", TEXT_DOMAIN)}
            </Button>

            <p
              style={{
                fontSize: "12px",
                color: "#757575",
                marginTop: "12px",
                marginBottom: 0,
              }}
            >
              {__(
                "Form definitions are automatically synced to the backend when you save this post.",
                TEXT_DOMAIN,
              )}
            </p>
          </PanelBody>
        )}

        {/* Workflows & Automation Panel */}
        {backendSyncEnabled && (
          <PanelBody
            title={__("Workflows & Automation", TEXT_DOMAIN)}
            initialOpen={false}
          >
            <SelectControl
              label={__("Auto-reply Template", TEXT_DOMAIN)}
              value={attributes.autoReplyTemplateKey ?? ""}
              options={[
                { label: __("None", TEXT_DOMAIN), value: "" },
                ...availableTemplates,
              ]}
              onChange={(autoReplyTemplateKey) =>
                setAttributes({ autoReplyTemplateKey })
              }
              help={__(
                "Email template to send automatically after successful form submission.",
                TEXT_DOMAIN,
              )}
            />

            {availableTemplates.length === 0 && (
              <Notice status="info" isDismissible={false}>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  {__(
                    "No email templates found. Create templates in the Flow admin panel.",
                    TEXT_DOMAIN,
                  )}
                </p>
              </Notice>
            )}

            <div style={{ borderTop: "1px solid #ddd", margin: "16px 0" }} />

            <label
              style={{
                fontWeight: 600,
                display: "block",
                marginBottom: "8px",
              }}
            >
              {__("Trigger Workflows", TEXT_DOMAIN)}
            </label>
            <p
              style={{
                fontSize: "12px",
                color: "#757575",
                marginTop: 0,
                marginBottom: "12px",
              }}
            >
              {__(
                "Select which workflows should be triggered when this form is submitted.",
                TEXT_DOMAIN,
              )}
            </p>

            {availableWorkflows.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {availableWorkflows.map((workflow) => (
                  <CheckboxControl
                    key={workflow.value}
                    label={workflow.label}
                    checked={
                      attributes.workflowIds?.includes(workflow.value) ?? false
                    }
                    onChange={(checked) => {
                      const currentWorkflows = attributes.workflowIds || [];
                      if (checked) {
                        setAttributes({
                          workflowIds: [...currentWorkflows, workflow.value],
                        });
                      } else {
                        setAttributes({
                          workflowIds: currentWorkflows.filter(
                            (id) => id !== workflow.value,
                          ),
                        });
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <Notice status="info" isDismissible={false}>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  {__(
                    "No workflows found. Create workflows in the Flow admin panel.",
                    TEXT_DOMAIN,
                  )}
                </p>
              </Notice>
            )}

            <div style={{ borderTop: "1px solid #ddd", margin: "16px 0" }} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <label style={{ fontWeight: 600, display: "block" }}>
                {__("Manual Actions", TEXT_DOMAIN)}
              </label>
              <Button variant="secondary" onClick={openCreateActionModal}>
                {__("Add New", TEXT_DOMAIN)}
              </Button>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#757575",
                marginTop: 0,
                marginBottom: "12px",
              }}
            >
              {__(
                "Define manual actions that can be triggered from a submission record and can update status, fire events, or attach templates.",
                TEXT_DOMAIN,
              )}
            </p>

            {configuredActions.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {configuredActions.map((action, index) => (
                  <div
                    key={
                      action.actionKey || `${action.label || "action"}-${index}`
                    }
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      padding: "12px",
                      background: action.enabled === false ? "#f6f7f7" : "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {action.label || action.actionKey}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#757575",
                            marginBottom: 4,
                            wordBreak: "break-word",
                          }}
                        >
                          {action.actionKey}
                        </div>
                        {describeAction(action) ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#50575e",
                              wordBreak: "break-word",
                            }}
                          >
                            {describeAction(action)}
                          </div>
                        ) : null}
                        {action.enabled === false ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#d63638",
                              marginTop: 6,
                            }}
                          >
                            {__("Disabled", TEXT_DOMAIN)}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Button
                          variant="secondary"
                          onClick={() => openEditActionModal(index)}
                        >
                          {__("Edit", TEXT_DOMAIN)}
                        </Button>
                        <Button
                          variant="secondary"
                          isDestructive
                          onClick={() => deleteAction(index)}
                        >
                          {__("Delete", TEXT_DOMAIN)}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Notice status="info" isDismissible={false}>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  {__(
                    "No manual actions configured yet. Add one to expose custom actions on submission records.",
                    TEXT_DOMAIN,
                  )}
                </p>
              </Notice>
            )}
          </PanelBody>
        )}

        <PanelBody title={__("Theming", TEXT_DOMAIN)} initialOpen={false}>
          <RadioControl
            label={__("Color Mode", TEXT_DOMAIN)}
            selected={attributes.colorMode || "light"}
            options={[
              { label: __("Light", TEXT_DOMAIN), value: "light" },
              { label: __("Dark", TEXT_DOMAIN), value: "dark" },
              { label: __("Auto", TEXT_DOMAIN), value: "auto" },
            ]}
            onChange={(colorMode) =>
              setAttributes({
                colorMode: colorMode as FormAttributes["colorMode"],
              })
            }
            help={__(
              "Select the form's color scheme—Light, Dark, or Auto (follows the user's system preference).",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <ComboboxControl
            label={__("Primary Color", TEXT_DOMAIN)}
            value={attributes.primaryColor || ""}
            options={[
              ...Object.keys(DEFAULT_THEME.colors).map((color) => ({
                label: __(color, TEXT_DOMAIN),
                value: color,
              })),
              ...(attributes.colors
                ? Object.keys(attributes.colors).map((color) => ({
                    label: __(color, TEXT_DOMAIN),
                    value: color,
                  }))
                : []),
            ]}
            onChange={(value) => {
              setAttributes({ primaryColor: value ?? "" });
            }}
            help={__(
              "Set the primary color for the form (default Mantine colors and your custom colors).",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{ fontWeight: 600, display: "block", marginBottom: 4 }}
            >
              {__("Custom Colors", TEXT_DOMAIN)}
            </label>
            {!attributes.colors ||
            Object.keys(attributes.colors).length === 0 ? (
              <div style={{ color: "#888", marginBottom: 8 }}>
                {__("No custom color definitions yet.", TEXT_DOMAIN)}
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {Object.entries(attributes.colors).map(([key, val]) => (
                  <li
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 8,
                    }}
                  >
                    <TextControl
                      label={__("Name", TEXT_DOMAIN)}
                      value={key}
                      style={{ minWidth: 80, flex: 1 }}
                      onChange={(newKey) => {
                        if (!newKey || newKey === key) return;
                        const newColors = { ...attributes.colors };
                        delete newColors[key];
                        newColors[newKey] = val;
                        setAttributes({ colors: newColors });
                      }}
                    />
                    <TextControl
                      label={__("Value", TEXT_DOMAIN)}
                      value={val}
                      style={{ maxWidth: 70 }}
                      onChange={(newValue) => {
                        const newColors = {
                          ...attributes.colors,
                          [key]: newValue,
                        };
                        setAttributes({ colors: newColors });
                      }}
                    />
                    <Button
                      ref={(el) => {
                        colorButtonRefs.current[key] = el;
                      }}
                      type="button"
                      onClick={() =>
                        setActiveColorPicker(
                          activeColorPicker === key ? null : key,
                        )
                      }
                      aria-label={__("Pick color", TEXT_DOMAIN)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        padding: 0,
                        border: "1px solid #ccc",
                        backgroundColor: val || "#000000",
                      }}
                    />
                    {activeColorPicker === key &&
                      colorButtonRefs.current[key] && (
                        <Popover
                          anchor={colorButtonRefs.current[key]}
                          onClose={() => setActiveColorPicker(null)}
                          focusOnMount={false}
                        >
                          <ColorPicker
                            color={val}
                            onChangeComplete={(color) => {
                              const nextColor = (color as { hex: string }).hex;
                              const newColors = {
                                ...attributes.colors,
                                [key]: nextColor,
                              };
                              setAttributes({ colors: newColors });
                            }}
                            disableAlpha
                          />
                        </Popover>
                      )}
                    <Button
                      icon="no-alt"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        const newColors = { ...attributes.colors };
                        delete newColors[key];
                        setAttributes({ colors: newColors });
                      }}
                      style={{
                        color: "#d63638",
                        cursor: "pointer",
                        fontSize: 16,
                        background: "none",
                        border: "none",
                      }}
                      aria-label={__("Remove color", TEXT_DOMAIN)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="secondary"
              style={{
                marginTop: 8,
                padding: "4px 12px",
                fontSize: 14,
              }}
              onClick={() => {
                // Find a unique name
                let idx = 1;
                const name = "custom";
                while (attributes.colors && attributes.colors[name + idx])
                  idx++;
                const newName = name + idx;
                setAttributes({
                  colors: {
                    ...(attributes.colors || {}),
                    [newName]: "#000000",
                  },
                });
              }}
            >
              {__("Add Color", TEXT_DOMAIN)}
            </Button>
            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              {__(
                "Define custom colors as name and base color (e.g. my-color: #ff0000). Mantine will generate 10 shades for each.",
                TEXT_DOMAIN,
              )}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <ComboboxControl
            label={__("Primary Shade (Light)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.light?.toString() || ""}
            options={Array.from({ length: 10 }, (_, i) => ({
              label: i.toString(),
              value: i.toString(),
            }))}
            onChange={(value) => {
              const parsed = value ? parseInt(value) : undefined;
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  light: parsed,
                },
              });
            }}
            help={__(
              "Set the primary shade for light mode (0–9). Leave empty for default.",
              TEXT_DOMAIN,
            )}
          />
          <ComboboxControl
            label={__("Primary Shade (Dark)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.dark?.toString() || ""}
            options={Array.from({ length: 10 }, (_, i) => ({
              label: i.toString(),
              value: i.toString(),
            }))}
            onChange={(value) => {
              const parsed = value ? parseInt(value) : undefined;
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  dark: parsed,
                },
              });
            }}
            help={__(
              "Set the primary shade for dark mode (0–9). Leave empty for default.",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <TextareaControl
            label={__("Theme Overrides", TEXT_DOMAIN)}
            value={attributes.themeOverrides || ""}
            onChange={(themeOverrides) => setAttributes({ themeOverrides })}
            help={__(
              "Add scoped CSS to the form's inner container—primarily to override design tokens (--mantine), but you can include other styles too.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
      </InspectorControls>

      {actionModalOpen && (
        <Modal
          title={
            editingActionIndex === null
              ? __("Add Manual Action", TEXT_DOMAIN)
              : __("Edit Manual Action", TEXT_DOMAIN)
          }
          onRequestClose={closeActionModal}
        >
          <ToggleControl
            label={__("Enabled", TEXT_DOMAIN)}
            checked={editingAction.enabled}
            onChange={(enabled) =>
              setEditingAction((current) => ({ ...current, enabled }))
            }
            help={__(
              "Disabled actions stay in the form definition but do not appear on submission records.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Action Label", TEXT_DOMAIN)}
            value={editingAction.label}
            onChange={(label) =>
              setEditingAction((current) => ({
                ...current,
                label,
              }))
            }
            help={__(
              "Human-friendly label shown as the action button on a submission record.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Action Key", TEXT_DOMAIN)}
            value={editingAction.actionKey}
            onChange={(actionKey) =>
              setEditingAction((current) => ({
                ...current,
                actionKey: normalizeActionKey(actionKey),
              }))
            }
            help={__(
              "Unique machine key. Leave it blank to auto-generate from the label when saving.",
              TEXT_DOMAIN,
            )}
          />
          <TextareaControl
            label={__("Allowed From Statuses", TEXT_DOMAIN)}
            value={editingAction.allowedFromStatusesText}
            onChange={(allowedFromStatusesText) =>
              setEditingAction((current) => ({
                ...current,
                allowedFromStatusesText,
              }))
            }
            help={__(
              "Optional. Enter one status per line to limit when the action is shown. Leave empty to allow all statuses.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Target Status", TEXT_DOMAIN)}
            value={editingAction.targetStatus}
            onChange={(targetStatus) =>
              setEditingAction((current) => ({
                ...current,
                targetStatus,
              }))
            }
            help={__(
              "Optional. Status to apply after the manual action is invoked.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Template", TEXT_DOMAIN)}
            value={editingAction.templateKey}
            options={[
              { label: __("None", TEXT_DOMAIN), value: "" },
              ...availableTemplates,
            ]}
            onChange={(templateKey) =>
              setEditingAction((current) => ({
                ...current,
                templateKey,
              }))
            }
            help={__(
              "Optional. Template associated with this action for downstream processing.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Event Name", TEXT_DOMAIN)}
            value={editingAction.eventName}
            onChange={(eventName) =>
              setEditingAction((current) => ({
                ...current,
                eventName,
              }))
            }
            help={__(
              "Optional custom event name to publish when the action runs.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("WordPress Hook Name", TEXT_DOMAIN)}
            value={editingAction.wpHookName}
            onChange={(wpHookName) =>
              setEditingAction((current) => ({
                ...current,
                wpHookName,
              }))
            }
            help={__(
              "Optional WordPress hook to fire locally when the action runs.",
              TEXT_DOMAIN,
            )}
          />

          {actionValidationMessage ? (
            <Notice status="error" isDismissible={false}>
              <p style={{ margin: 0, fontSize: "13px" }}>
                {actionValidationMessage}
              </p>
            </Notice>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
            }}
          >
            <Button variant="tertiary" onClick={closeActionModal}>
              {__("Cancel", TEXT_DOMAIN)}
            </Button>
            <Button
              variant="primary"
              onClick={saveEditedAction}
              disabled={Boolean(actionValidationMessage)}
            >
              {__("Save", TEXT_DOMAIN)}
            </Button>
          </div>
        </Modal>
      )}

      {/* Preview container - rendered in shadow DOM */}
      <div ref={previewRef} style={{ marginBottom: "20px" }} />

      {/* Editor section - normal Gutenberg blocks */}
      <div style={{ display: showCustomization ? "block" : "none" }}>
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "16px",
            backgroundColor: "#f5f5f5",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#757575",
                margin: 0,
                marginBottom: "8px",
              }}
            >
              {__("Edit form fields:", TEXT_DOMAIN)}
            </p>
            <InnerBlocks
              allowedBlocks={[
                "smartcloud-flow/text-field",
                "smartcloud-flow/textarea-field",
                "smartcloud-flow/select-field",
                "smartcloud-flow/checkbox-field",
                "smartcloud-flow/checkbox-group-field",
                "smartcloud-flow/date-field",
                "smartcloud-flow/switch-field",
                "smartcloud-flow/number-field",
                "smartcloud-flow/radio-field",
                "smartcloud-flow/password-field",
                "smartcloud-flow/pin-field",
                "smartcloud-flow/color-field",
                "smartcloud-flow/file-field",
                "smartcloud-flow/slider-field",
                "smartcloud-flow/range-slider-field",
                "smartcloud-flow/tags-field",
                "smartcloud-flow/rating-field",
                "smartcloud-flow/save-draft-button",
                "smartcloud-flow/ai-suggestions",
                "smartcloud-flow/submit-button",
                "smartcloud-flow/fieldset",
                "smartcloud-flow/collapse",
                "smartcloud-flow/divider",
                "smartcloud-flow/visually-hidden",
                "smartcloud-flow/stack",
                "smartcloud-flow/group",
                "smartcloud-flow/grid",
                "smartcloud-flow/wizard",
                "smartcloud-flow/success-state",
              ]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
