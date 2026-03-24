import {
  ActionIcon,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { FormDefinition } from "../api/types";

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionBuilderProps {
  conditions: WorkflowCondition[];
  onChange: (conditions: WorkflowCondition[]) => void;
  forms?: FormDefinition[];
}

const FIELD_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "email", label: "Email" },
  { value: "formId", label: "Form ID" },
  { value: "primaryLabel", label: "Primary Label" },
  { value: "summary", label: "Summary" },
  { value: "tags", label: "Tags" },
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Not Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "isEmpty", label: "Is Empty" },
  { value: "isNotEmpty", label: "Is Not Empty" },
];

const STATUS_VALUES = [
  "new",
  "seen",
  "in-progress",
  "approved",
  "completed",
  "rejected",
  "deleted",
  "resolved",
];

export default function ConditionBuilder({
  conditions,
  onChange,
  forms = [],
}: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([
      ...conditions,
      { field: "status", operator: "equals", value: "new" },
    ]);
  };

  const updateCondition = (
    index: number,
    updates: Partial<WorkflowCondition>,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const renderValueInput = (condition: WorkflowCondition, index: number) => {
    switch (condition.field) {
      case "status":
        return (
          <Select
            placeholder="Value"
            data={STATUS_VALUES}
            value={condition.value}
            onChange={(value) => updateCondition(index, { value: value ?? "" })}
            style={{ flex: 1 }}
            searchable
            comboboxProps={{ zIndex: 100001 }}
          />
        );
      case "formId":
        return (
          <Select
            placeholder="Select form"
            data={forms.map((f) => ({
              value: f.formId,
              label: `${f.name || f.formId} (${f.formId})`,
            }))}
            value={condition.value}
            onChange={(value) => updateCondition(index, { value: value ?? "" })}
            style={{ flex: 1 }}
            searchable
            comboboxProps={{ zIndex: 100001 }}
          />
        );
      case "createdAt":
      case "updatedAt":
        return (
          <DateInput
            placeholder="Select date"
            value={condition.value ? new Date(condition.value) : null}
            onChange={(value) =>
              updateCondition(index, {
                value: value ? value.toString() : "",
              })
            }
            style={{ flex: 1 }}
            popoverProps={{ zIndex: 100001 }}
          />
        );
      default:
        return (
          <TextInput
            placeholder="Value"
            value={condition.value}
            onChange={(e) =>
              updateCondition(index, { value: e.currentTarget.value })
            }
            style={{ flex: 1 }}
          />
        );
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          Trigger Conditions
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addCondition}
        >
          Add Condition
        </Button>
      </Group>

      {conditions.length === 0 ? (
        <Text size="sm" c="dimmed">
          No conditions set - workflow will run on every trigger event
        </Text>
      ) : (
        <Stack gap="sm">
          {conditions.map((condition, index) => (
            <Card key={index} withBorder p="sm">
              <Group gap="xs" wrap="nowrap">
                <Select
                  placeholder="Field"
                  data={FIELD_OPTIONS}
                  value={condition.field}
                  onChange={(value) =>
                    updateCondition(index, { field: value ?? "status" })
                  }
                  style={{ flex: 1 }}
                  comboboxProps={{ zIndex: 100001 }}
                />

                <Select
                  placeholder="Operator"
                  data={OPERATOR_OPTIONS}
                  value={condition.operator}
                  onChange={(value) =>
                    updateCondition(index, { operator: value ?? "equals" })
                  }
                  style={{ flex: 1 }}
                  comboboxProps={{ zIndex: 100001 }}
                />

                {renderValueInput(condition, index)}

                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeCondition(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {conditions.length > 1 && (
        <Text size="xs" c="dimmed">
          Note: All conditions must be satisfied (AND logic)
        </Text>
      )}
    </Stack>
  );
}
