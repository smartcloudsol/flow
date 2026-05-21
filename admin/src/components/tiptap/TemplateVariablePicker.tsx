import { Button, Menu, ScrollArea, Stack, Text } from "@mantine/core";
import { IconBraces } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import type { FormDefinition } from "../../api/types";
import { t } from "../../operations/i18n";

export interface TemplateVariableOption {
  path: string;
  label: string;
  description?: string;
}

interface TemplateVariableGroup {
  key: string;
  label: string;
  variables: TemplateVariableOption[];
}

interface GeneratedFieldVariables {
  flatFields: TemplateVariableOption[];
  commonFields: TemplateVariableOption[];
  ungroupedFields: TemplateVariableOption[];
  stepGroups: TemplateVariableGroup[];
}

function getDefaultVariables(): TemplateVariableOption[] {
  return [
    {
      path: "submission.email",
      label: "Submission Email",
      description: t("Email associated with submission"),
    },
    {
      path: "submission.status",
      label: "Status",
      description: t("Current submission status"),
    },
    {
      path: "submission.createdAt",
      label: "Created At",
      description: t("Submission creation date"),
    },
    {
      path: "form.name",
      label: "Form Name",
      description: t("Name of the form"),
    },
    {
      path: "site.name",
      label: "Site Name",
      description: t("Name of the site"),
    },
    {
      path: "site.baseUrl",
      label: "Site Base URL",
      description: t("Base URL of the current site"),
    },
    {
      path: "currentYear",
      label: "Current Year",
      description: t("Current year calculated at send time"),
    },
  ];
}

// Generate variables from FormDefinition fieldSchema or fields array
function generateFieldVariables(
  formDefinition?: FormDefinition,
): GeneratedFieldVariables {
  if (!formDefinition) {
    return {
      flatFields: [],
      commonFields: [],
      ungroupedFields: [],
      stepGroups: [],
    };
  }

  const fieldVars = new Map<
    string,
    {
      variable: TemplateVariableOption;
      stepKeys: Set<string>;
      stepLabels: Set<string>;
      ungrouped: boolean;
    }
  >();
  const stepOrder: TemplateVariableGroup[] = [];
  const stepIndex = new Map<string, TemplateVariableGroup>();

  const ensureStepGroup = (stepKey: string, stepLabel: string) => {
    const existingGroup = stepIndex.get(stepKey);
    if (existingGroup) {
      return existingGroup;
    }

    const nextGroup: TemplateVariableGroup = {
      key: stepKey,
      label: stepLabel,
      variables: [],
    };
    stepIndex.set(stepKey, nextGroup);
    stepOrder.push(nextGroup);
    return nextGroup;
  };

  const addFieldVariable = (
    variable: TemplateVariableOption,
    stepMeta?: { key: string; label: string },
  ) => {
    const existing = fieldVars.get(variable.path);
    if (!existing) {
      fieldVars.set(variable.path, {
        variable,
        stepKeys: new Set(stepMeta ? [stepMeta.key] : []),
        stepLabels: new Set(stepMeta ? [stepMeta.label] : []),
        ungrouped: !stepMeta,
      });
      if (stepMeta) {
        ensureStepGroup(stepMeta.key, stepMeta.label);
      }
      return;
    }

    if (stepMeta) {
      existing.stepKeys.add(stepMeta.key);
      existing.stepLabels.add(stepMeta.label);
      ensureStepGroup(stepMeta.key, stepMeta.label);
      return;
    }

    existing.ungrouped = true;
  };

  const walkFields = (
    fields: unknown[],
    stepMeta?: { key: string; label: string },
  ) => {
    fields.forEach((field) => {
      if (!field || typeof field !== "object") {
        return;
      }

      const record = field as {
        name?: string;
        label?: string;
        description?: string;
        type?: string;
        children?: unknown[];
        steps?: Array<{
          title?: string;
          description?: string;
          children?: unknown[];
        }>;
        wizard?: {
          steps?: Array<{
            title?: string;
            description?: string;
            children?: unknown[];
          }>;
        };
      };

      if (record.name) {
        addFieldVariable(
          {
            path: `submission.fields.${record.name}`,
            label: record.label || record.name,
            description:
              record.description ||
              `${t("Form field:")} ${record.name}${
                record.type ? ` (${record.type})` : ""
              }`,
          },
          stepMeta,
        );
      }

      if (Array.isArray(record.children) && record.children.length > 0) {
        walkFields(record.children, stepMeta);
      }

      if (Array.isArray(record.steps)) {
        record.steps.forEach((step, index) => {
          if (Array.isArray(step.children) && step.children.length > 0) {
            walkFields(step.children, {
              key: `step:${step.title || index + 1}:${index}`,
              label: step.title?.trim() || `${t("Step")} ${index + 1}`,
            });
          }
        });
      }

      if (Array.isArray(record.wizard?.steps)) {
        record.wizard.steps.forEach((step, index) => {
          if (Array.isArray(step.children) && step.children.length > 0) {
            walkFields(step.children, {
              key: `wizard-step:${step.title || index + 1}:${index}`,
              label: step.title?.trim() || `${t("Step")} ${index + 1}`,
            });
          }
        });
      }
    });
  };

  // Try fields array first (primary source from backend)
  if (formDefinition.fields && Array.isArray(formDefinition.fields)) {
    walkFields(formDefinition.fields as unknown[]);
  }
  // Fallback to fieldSchema if fields array not available
  else if (formDefinition.fieldSchema) {
    const schema = formDefinition.fieldSchema;

    // Check if it's a JSON schema with properties
    if (typeof schema === "object" && schema !== null) {
      type SchemaWithProperties = {
        properties?: Record<string, { title?: string; description?: string }>;
      };
      const properties = (schema as SchemaWithProperties).properties;

      // Handle JSON Schema format with properties
      if (properties && typeof properties === "object") {
        Object.keys(properties).forEach((fieldName) => {
          const field = properties[fieldName];
          const title = field.title || fieldName;
          const description =
            field.description || `${t("Form field:")} ${fieldName}`;

          addFieldVariable({
            path: `submission.fields.${fieldName}`,
            label: title,
            description,
          });
        });
      } else {
        // Handle direct object format (field names as keys)
        Object.keys(schema).forEach((fieldName) => {
          const field = (schema as Record<string, unknown>)[fieldName];

          // Handle various field formats
          let title = fieldName;
          let description = `${t("Form field:")} ${fieldName}`;

          if (typeof field === "object" && field !== null) {
            const fieldObj = field as {
              title?: string;
              description?: string;
              type?: string;
            };
            title = fieldObj.title || fieldName;
            description =
              fieldObj.description || `${t("Form field:")} ${fieldName}`;
          } else if (typeof field === "string") {
            // Field is just a type string like "string", "number", etc.
            description = `${t("Form field:")} ${fieldName} (${field})`;
          }

          addFieldVariable({
            path: `submission.fields.${fieldName}`,
            label: title,
            description,
          });
        });
      }
    }
  }

  const commonFields: TemplateVariableOption[] = [];
  const ungroupedFields: TemplateVariableOption[] = [];

  Array.from(fieldVars.values()).forEach((entry) => {
    const stepLabels = Array.from(entry.stepLabels);
    const isCommonField = entry.stepKeys.size > 1;
    const variable =
      stepLabels.length > 1
        ? {
            ...entry.variable,
            description: [
              entry.variable.description,
              `${t("Appears in:")} ${stepLabels.join(", ")}`,
            ]
              .filter(Boolean)
              .join(" • "),
          }
        : entry.variable;

    if (isCommonField) {
      commonFields.push(variable);
      return;
    }

    if (entry.stepKeys.size === 1) {
      const [stepKey] = Array.from(entry.stepKeys);
      const group = stepIndex.get(stepKey);
      group?.variables.push(variable);
      return;
    }

    if (entry.ungrouped) {
      ungroupedFields.push(variable);
    }
  });

  const stepGroups = stepOrder.filter((group) => group.variables.length > 0);
  const flatFields = Array.from(fieldVars.values()).map(
    (entry) => entry.variable,
  );

  return {
    flatFields,
    commonFields,
    ungroupedFields,
    stepGroups,
  };
}

interface TemplateVariablePickerProps {
  editor?: Editor | null;
  formDefinition?: FormDefinition;
  variables?: TemplateVariableOption[];
  size?: "xs" | "sm" | "md" | "lg";
  zIndex?: number;
  onInsert?: (path: string, label: string) => void;
}

export default function TemplateVariablePicker({
  editor,
  formDefinition,
  variables,
  size = "xs",
  zIndex = 100003,
  onInsert,
}: TemplateVariablePickerProps) {
  const { fieldVars, commonFields, ungroupedFields, stepGroups, allVariables } =
    useMemo(() => {
      if (variables) {
        return {
          fieldVars: variables,
          commonFields: [] as TemplateVariableOption[],
          ungroupedFields: [] as TemplateVariableOption[],
          stepGroups: [] as TemplateVariableGroup[],
          allVariables: [...variables, ...getDefaultVariables()],
        };
      }

      const generated = generateFieldVariables(formDefinition);
      return {
        fieldVars: generated.flatFields,
        commonFields: generated.commonFields,
        ungroupedFields: generated.ungroupedFields,
        stepGroups: generated.stepGroups,
        allVariables: [...generated.flatFields, ...getDefaultVariables()],
      };
    }, [formDefinition, variables]);

  const hasStepGroups = stepGroups.length > 0 && !variables;

  const insertVariable = (path: string, label: string) => {
    if (onInsert) {
      // Custom insert handler
      onInsert(path, label);
    } else if (editor) {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "templateVariable",
            attrs: { path, label },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();
    }
  };

  const renderVariableItems = (items: TemplateVariableOption[]) =>
    items.map((variable) => (
      <Menu.Item
        key={variable.path}
        onClick={() => insertVariable(variable.path, t(variable.label))}
      >
        <Stack gap={0}>
          <Text size="sm">{t(variable.label)}</Text>
          {variable.description && (
            <Text size="xs" c="dimmed">
              {variable.description}
            </Text>
          )}
        </Stack>
      </Menu.Item>
    ));

  return (
    <Menu shadow="md" width={280} position="bottom-start" zIndex={zIndex}>
      <Menu.Target>
        <Button
          size={size}
          variant="light"
          leftSection={<IconBraces size={16} />}
        >
          {t("Insert Variable")}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <ScrollArea.Autosize
          mah="min(24rem, calc(100vh - 10rem))"
          scrollbarSize={8}
        >
          <Menu.Label>{t("Submission Fields")}</Menu.Label>
          {hasStepGroups ? (
            <>
              {commonFields.length > 0 && (
                <>
                  <Menu.Label>{t("Common Across Steps")}</Menu.Label>
                  {renderVariableItems(commonFields)}
                </>
              )}

              {ungroupedFields.length > 0 && (
                <>
                  <Menu.Label>{t("General")}</Menu.Label>
                  {renderVariableItems(ungroupedFields)}
                </>
              )}

              {stepGroups.map((group) => (
                <div key={group.key}>
                  <Menu.Label>{group.label}</Menu.Label>
                  {renderVariableItems(group.variables)}
                </div>
              ))}
            </>
          ) : (
            renderVariableItems(
              fieldVars.filter((v) => v.path.startsWith("submission.fields.")),
            )
          )}

          <Menu.Divider />
          <Menu.Label>{t("Submission Data")}</Menu.Label>
          {renderVariableItems(
            allVariables.filter(
              (v) =>
                v.path.startsWith("submission.") &&
                !v.path.startsWith("submission.fields."),
            ),
          )}

          <Menu.Divider />
          <Menu.Label>{t("Other")}</Menu.Label>
          {renderVariableItems(
            allVariables.filter((v) => !v.path.startsWith("submission.")),
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
