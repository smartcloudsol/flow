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
import { t } from "../operations/i18n";
import {
  useOperationsComboboxProps,
  useOperationsPopoverProps,
} from "./OperationsPortalContext";

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

function getFieldOptions() {
  return [
    { value: "status", label: t("Status") },
    { value: "email", label: t("Email") },
    { value: "formId", label: t("Form ID") },
    { value: "primaryLabel", label: t("Primary Label") },
    { value: "summary", label: t("Summary") },
    { value: "tags", label: t("Tags") },
    { value: "createdAt", label: t("Created At") },
    { value: "updatedAt", label: t("Updated At") },
  ];
}

function getOperatorOptions() {
  return [
    { value: "equals", label: t("Equals") },
    { value: "notEquals", label: t("Not Equals") },
    { value: "contains", label: t("Contains") },
    { value: "notContains", label: t("Not Contains") },
    { value: "startsWith", label: t("Starts With") },
    { value: "endsWith", label: t("Ends With") },
    { value: "greaterThan", label: t("Greater Than") },
    { value: "lessThan", label: t("Less Than") },
    { value: "isEmpty", label: t("Is Empty") },
    { value: "isNotEmpty", label: t("Is Not Empty") },
  ];
}

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
  const fieldOptions = getFieldOptions();
  const operatorOptions = getOperatorOptions();
  const comboboxProps = useOperationsComboboxProps(100001);
  const popoverProps = useOperationsPopoverProps(100001);

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
            placeholder={t("Value")}
            data={STATUS_VALUES}
            value={condition.value}
            onChange={(value) => updateCondition(index, { value: value ?? "" })}
            style={{ flex: 1 }}
            searchable
            comboboxProps={comboboxProps}
          />
        );
      case "formId":
        return (
          <Select
            placeholder={t("Select form")}
            data={forms.map((f) => ({
              value: f.formId,
              label: `${f.name || f.formId} (${f.formId})`,
            }))}
            value={condition.value}
            onChange={(value) => updateCondition(index, { value: value ?? "" })}
            style={{ flex: 1 }}
            searchable
            comboboxProps={comboboxProps}
          />
        );
      case "createdAt":
      case "updatedAt":
        return (
          <DateInput
            placeholder={t("Select date")}
            value={condition.value ? new Date(condition.value) : null}
            onChange={(value) =>
              updateCondition(index, {
                value: value ? value.toString() : "",
              })
            }
            style={{ flex: 1 }}
            popoverProps={popoverProps}
          />
        );
      default:
        return (
          <TextInput
            placeholder={t("Value")}
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
          {t("Trigger Conditions")}
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addCondition}
        >
          {t("Add Condition")}
        </Button>
      </Group>

      {conditions.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("No conditions set - workflow will run on every trigger event")}
        </Text>
      ) : (
        <Stack gap="sm">
          {conditions.map((condition, index) => (
            <Card key={index} withBorder p="sm" style={{ overflow: "visible" }}>
              <Group gap="xs" wrap="nowrap">
                <Select
                  placeholder={t("Field")}
                  data={fieldOptions}
                  value={condition.field}
                  onChange={(value) =>
                    updateCondition(index, { field: value ?? "status" })
                  }
                  style={{ flex: 1 }}
                  comboboxProps={comboboxProps}
                />

                <Select
                  placeholder={t("Operator")}
                  data={operatorOptions}
                  value={condition.operator}
                  onChange={(value) =>
                    updateCondition(index, { operator: value ?? "equals" })
                  }
                  style={{ flex: 1 }}
                  comboboxProps={comboboxProps}
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
          {t("Note: All conditions must be satisfied (AND logic)")}
        </Text>
      )}
    </Stack>
  );
}
