import {
  ActionIcon,
  Autocomplete,
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
  getConditionFieldOptions,
  normalizeConditionFieldValue,
  normalizeConditionStoredValue,
} from "./condition-builder-utils";
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
  return getConditionFieldOptions();
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
  const fieldSuggestions = fieldOptions.map((option) => ({
    value: option.value,
    label: `${option.label} (${option.value})`,
  }));
  const formSuggestions = forms
    .map((form) => ({
      value: form.formId,
      label: `${form.name || form.formId} (${form.formId})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
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
    const normalizedField = normalizeConditionFieldValue(condition.field);
    const normalizedValue = normalizeConditionStoredValue(
      normalizedField,
      condition.value,
      forms,
    );

    switch (normalizedField) {
      case "status":
        return (
          <Autocomplete
            placeholder={t("Value")}
            data={STATUS_VALUES}
            value={condition.value}
            onChange={(value) => updateCondition(index, { value })}
            style={{ flex: 1 }}
            comboboxProps={comboboxProps}
            autoComplete="off"
          />
        );
      case "formId":
        return (
          <Autocomplete
            placeholder={
              forms.length > 0
                ? t("Select form or type backend form ID")
                : t("Type backend form ID")
            }
            data={formSuggestions}
            value={normalizedValue}
            onChange={(value) =>
              updateCondition(index, {
                value: normalizeConditionStoredValue("formId", value, forms),
              })
            }
            style={{ flex: 1 }}
            comboboxProps={comboboxProps}
            autoComplete="off"
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
      <Text size="xs" c="dimmed">
        {t(
          "Use dotted paths for nested event fields, for example event.result.routing.route or event.result.ticketId.",
        )}
      </Text>

      {conditions.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("No conditions set - workflow will run on every trigger event")}
        </Text>
      ) : (
        <Stack gap="sm">
          {conditions.map((condition, index) => (
            <Card key={index} withBorder p="sm" style={{ overflow: "visible" }}>
              <Group gap="xs" wrap="nowrap">
                <Autocomplete
                  placeholder={t("Field path")}
                  data={fieldSuggestions}
                  value={normalizeConditionFieldValue(condition.field)}
                  onChange={(value) =>
                    updateCondition(index, {
                      field: normalizeConditionFieldValue(value),
                    })
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
