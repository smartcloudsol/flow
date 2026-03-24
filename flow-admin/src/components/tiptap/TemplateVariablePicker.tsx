import { Button, Menu, Stack, Text } from "@mantine/core";
import { IconBraces } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import type { FormDefinition } from "../../api/types";

export interface TemplateVariableOption {
  path: string;
  label: string;
  description?: string;
}

const DEFAULT_VARIABLES: TemplateVariableOption[] = [
  {
    path: "submission.email",
    label: "Submission Email",
    description: "Email associated with submission",
  },
  {
    path: "submission.status",
    label: "Status",
    description: "Current submission status",
  },
  {
    path: "submission.createdAt",
    label: "Created At",
    description: "Submission creation date",
  },
  {
    path: "form.name",
    label: "Form Name",
    description: "Name of the form",
  },
  {
    path: "site.name",
    label: "Site Name",
    description: "Name of the site",
  },
];

// Generate variables from FormDefinition fieldSchema or fields array
function generateFieldVariables(
  formDefinition?: FormDefinition,
): TemplateVariableOption[] {
  if (!formDefinition) return [];

  const fieldVars: TemplateVariableOption[] = [];

  // Try fields array first (primary source from backend)
  if (formDefinition.fields && Array.isArray(formDefinition.fields)) {
    console.log("Using fields array, length:", formDefinition.fields.length);
    (
      formDefinition.fields as Array<{
        name?: string;
        label?: string;
        description?: string;
        type?: string;
      }>
    ).forEach((field) => {
      if (field.name) {
        fieldVars.push({
          path: `submission.fields.${field.name}`,
          label: field.label || field.name,
          description:
            field.description || `Form field: ${field.name} (${field.type})`,
        });
      }
    });
  }
  // Fallback to fieldSchema if fields array not available
  else if (formDefinition.fieldSchema) {
    const schema = formDefinition.fieldSchema;

    console.log("FormDefinition:", formDefinition);
    console.log("fieldSchema:", schema);

    // Check if it's a JSON schema with properties
    if (typeof schema === "object" && schema !== null) {
      type SchemaWithProperties = {
        properties?: Record<string, { title?: string; description?: string }>;
      };
      const properties = (schema as SchemaWithProperties).properties;

      // Handle JSON Schema format with properties
      if (properties && typeof properties === "object") {
        console.log("Using JSON Schema format with properties");
        Object.keys(properties).forEach((fieldName) => {
          const field = properties[fieldName];
          const title = field.title || fieldName;
          const description = field.description || `Form field: ${fieldName}`;

          fieldVars.push({
            path: `submission.fields.${fieldName}`,
            label: title,
            description,
          });
        });
      } else {
        // Handle direct object format (field names as keys)
        console.log("Using direct object format, keys:", Object.keys(schema));
        Object.keys(schema).forEach((fieldName) => {
          const field = (schema as Record<string, unknown>)[fieldName];

          // Handle various field formats
          let title = fieldName;
          let description = `Form field: ${fieldName}`;

          if (typeof field === "object" && field !== null) {
            const fieldObj = field as {
              title?: string;
              description?: string;
              type?: string;
            };
            title = fieldObj.title || fieldName;
            description = fieldObj.description || `Form field: ${fieldName}`;
          } else if (typeof field === "string") {
            // Field is just a type string like "string", "number", etc.
            description = `Form field: ${fieldName} (${field})`;
          }

          fieldVars.push({
            path: `submission.fields.${fieldName}`,
            label: title,
            description,
          });
        });
      }
    }
  }

  console.log("Generated field variables:", fieldVars);
  return fieldVars;
}

interface TemplateVariablePickerProps {
  editor?: Editor | null;
  formDefinition?: FormDefinition;
  variables?: TemplateVariableOption[];
  size?: "xs" | "sm" | "md" | "lg";
  onInsert?: (path: string, label: string) => void;
}

export default function TemplateVariablePicker({
  editor,
  formDefinition,
  variables,
  size = "xs",
  onInsert,
}: TemplateVariablePickerProps) {
  const allVariables = useMemo(() => {
    if (variables) return variables;

    const fieldVars = generateFieldVariables(formDefinition);
    return [...fieldVars, ...DEFAULT_VARIABLES];
  }, [formDefinition, variables]);

  const insertVariable = (path: string, label: string) => {
    if (onInsert) {
      // Custom insert handler
      onInsert(path, label);
    } else if (editor) {
      // Default Tiptap insert
      const html = `<span data-template-variable="true" data-path="${path}" data-label="${label}" class="template-variable">{{${path}}}</span> `;
      editor.chain().focus().insertContent(html).run();
    }
  };

  return (
    <Menu
      shadow="md"
      width={280}
      position="bottom-start"
      withinPortal
      zIndex={100003}
    >
      <Menu.Target>
        <Button
          size={size}
          variant="light"
          leftSection={<IconBraces size={16} />}
        >
          Insert Variable
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Submission Fields</Menu.Label>
        {allVariables
          .filter((v) => v.path.startsWith("submission.fields."))
          .map((variable) => (
            <Menu.Item
              key={variable.path}
              onClick={() => insertVariable(variable.path, variable.label)}
            >
              <Stack gap={0}>
                <Text size="sm">{variable.label}</Text>
                {variable.description && (
                  <Text size="xs" c="dimmed">
                    {variable.description}
                  </Text>
                )}
              </Stack>
            </Menu.Item>
          ))}

        <Menu.Divider />
        <Menu.Label>Submission Data</Menu.Label>
        {allVariables
          .filter(
            (v) =>
              v.path.startsWith("submission.") &&
              !v.path.startsWith("submission.fields."),
          )
          .map((variable) => (
            <Menu.Item
              key={variable.path}
              onClick={() => insertVariable(variable.path, variable.label)}
            >
              <Stack gap={0}>
                <Text size="sm">{variable.label}</Text>
                {variable.description && (
                  <Text size="xs" c="dimmed">
                    {variable.description}
                  </Text>
                )}
              </Stack>
            </Menu.Item>
          ))}

        <Menu.Divider />
        <Menu.Label>Other</Menu.Label>
        {allVariables
          .filter((v) => !v.path.startsWith("submission."))
          .map((variable) => (
            <Menu.Item
              key={variable.path}
              onClick={() => insertVariable(variable.path, variable.label)}
            >
              <Stack gap={0}>
                <Text size="sm">{variable.label}</Text>
                {variable.description && (
                  <Text size="xs" c="dimmed">
                    {variable.description}
                  </Text>
                )}
              </Stack>
            </Menu.Item>
          ))}
      </Menu.Dropdown>
    </Menu>
  );
}
