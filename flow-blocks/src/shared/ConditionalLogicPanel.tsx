import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { store as blockEditorStore } from "@wordpress/block-editor";
import {
  Button,
  Modal,
  Notice,
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { useCallback, useEffect, useMemo, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { AI_SUGGESTION_WATCHER_KEYS } from "./conditional-system-watchers";
import { OptionsSourceEditor } from "./options-source-editor";
import {
  detectConditionalIssues,
  getAllowedOperators,
  getRuleConditions,
  isOperatorAllowed,
  summarizeRule,
} from "./conditional-logic-utils";
import type {
  ConditionalAction,
  ConditionalAttributes,
  ConditionalCondition,
  ConditionalLogic,
  ConditionalOperator,
  ConditionalRule,
  FieldConfig,
} from "./types";

interface Props<T extends ConditionalAttributes = ConditionalAttributes> {
  attributes: T;
  setAttributes: (next: Partial<T>) => void;
  clientId: string;
  allowedActions?: ConditionalAction[];
}

const operatorOptions: Array<{ label: string; value: ConditionalOperator }> = [
  { label: "equals", value: "equals" },
  { label: "not equals", value: "notEquals" },
  { label: "contains", value: "contains" },
  { label: "not contains", value: "notContains" },
  { label: "starts with", value: "startsWith" },
  { label: "ends with", value: "endsWith" },
  { label: "greater than", value: "greaterThan" },
  { label: "less than", value: "lessThan" },
  { label: "greater or equal", value: "greaterOrEqual" },
  { label: "less or equal", value: "lessOrEqual" },
  { label: "is empty", value: "isEmpty" },
  { label: "is not empty", value: "isNotEmpty" },
  { label: "is checked", value: "isChecked" },
  { label: "is not checked", value: "isNotChecked" },
  { label: "is any of", value: "isAnyOf" },
  { label: "is none of", value: "isNoneOf" },
];

const actionLabels: Record<ConditionalAction, string> = {
  show: "Show this field",
  hide: "Hide this field",
  enable: "Enable this field",
  disable: "Disable this field",
  setRequired: "Set as required",
  setOptional: "Set as optional",
  updateOptions: "Update options",
  setValue: "Set value",
  clearValue: "Clear value",
};

function createCondition(): ConditionalCondition {
  return {
    id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    field: "",
    operator: "equals",
    value: "",
  };
}

function createRule(): ConditionalRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    matchType: "all",
    conditions: [createCondition()],
    then: { action: "show", params: {} },
  };
}

export function ConditionalLogicPanel<
  T extends ConditionalAttributes = ConditionalAttributes,
>({ attributes, setAttributes, clientId, allowedActions }: Props<T>) {
  const logic = useMemo<{
    enabled: boolean;
    rules: ConditionalRule[];
  }>(() => {
    const attrs = attributes as Record<string, unknown>;
    const conditionalLogic = attrs.conditionalLogic as
      | ConditionalLogic
      | undefined;
    return {
      enabled: conditionalLogic?.enabled ?? false,
      rules: conditionalLogic?.rules ?? [],
    };
  }, [attributes]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const blocks = useSelect(
    (select) => {
      const { getBlocks, getBlockRootClientId } = select(blockEditorStore);
      const rootId = getBlockRootClientId(clientId);
      return getBlocks(rootId || undefined);
    },
    [clientId],
  ) as Array<{
    clientId: string;
    name: string;
    attributes: Record<string, unknown>;
  }>;

  const availableFields = useMemo(() => {
    const namedFields = blocks
      .filter(
        (block) =>
          block.clientId !== clientId &&
          typeof block.attributes?.name === "string",
      )
      .map((block) => ({
        label: String(block.attributes.label || block.attributes.name),
        value: String(block.attributes.name),
        field: {
          type:
            String(block.name)
              .replace("smartcloud-flow/", "")
              .replace("-field", "") || "text",
          ...(block.attributes || {}),
        } as FieldConfig,
      }));

    const hasAiSuggestions = blocks.some(
      (block) => block.name === "smartcloud-flow/ai-suggestions",
    );

    if (!hasAiSuggestions) {
      return namedFields;
    }

    return [
      ...namedFields,
      {
        label: __("AI suggestions status", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.status,
        field: {
          type: "text",
          name: AI_SUGGESTION_WATCHER_KEYS.status,
          label: __("AI suggestions status", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("AI suggestions accepted", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.accepted,
        field: {
          type: "switch",
          name: AI_SUGGESTION_WATCHER_KEYS.accepted,
          label: __("AI suggestions accepted", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("AI suggestions rejected", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.rejected,
        field: {
          type: "switch",
          name: AI_SUGGESTION_WATCHER_KEYS.rejected,
          label: __("AI suggestions rejected", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("AI suggestions already ran", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.ran,
        field: {
          type: "switch",
          name: AI_SUGGESTION_WATCHER_KEYS.ran,
          label: __("AI suggestions already ran", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("AI suggestion count", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.suggestionCount,
        field: {
          type: "number",
          name: AI_SUGGESTION_WATCHER_KEYS.suggestionCount,
          label: __("AI suggestion count", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("Selected AI suggestion ID", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.selectedSuggestionId,
        field: {
          type: "text",
          name: AI_SUGGESTION_WATCHER_KEYS.selectedSuggestionId,
          label: __("Selected AI suggestion ID", TEXT_DOMAIN),
        } as FieldConfig,
      },
      {
        label: __("AI sources used", TEXT_DOMAIN),
        value: AI_SUGGESTION_WATCHER_KEYS.sourcesUsed,
        field: {
          type: "switch",
          name: AI_SUGGESTION_WATCHER_KEYS.sourcesUsed,
          label: __("AI sources used", TEXT_DOMAIN),
        } as FieldConfig,
      },
    ];
  }, [blocks, clientId]);

  const actionOptions = (
    allowedActions || (Object.keys(actionLabels) as ConditionalAction[])
  ).map((value) => ({
    label: __(actionLabels[value], TEXT_DOMAIN),
    value,
  }));

  const updateLogic = useCallback(
    (patch: Partial<typeof logic>) => {
      setAttributes({
        conditionalLogic: {
          ...logic,
          ...patch,
        },
      } as Partial<T>);
    },
    [logic, setAttributes],
  );

  const rules = useMemo(() => logic.rules || [], [logic.rules]);
  const editingRule =
    rules.find((rule: ConditionalRule) => rule.id === editingRuleId) || null;
  const editingConditions = editingRule ? getRuleConditions(editingRule) : [];
  const conditionalIssues = detectConditionalIssues(
    typeof (attributes as Record<string, unknown>).name === "string"
      ? ((attributes as Record<string, unknown>).name as string)
      : undefined,
    rules,
  );

  const watcherLabelMap = useMemo(
    () =>
      Object.fromEntries(
        availableFields.map((field) => [field.value, field.label]),
      ) as Record<string, string>,
    [availableFields],
  );

  const updateRule = useCallback(
    (ruleId: string, patch: Partial<ConditionalRule>) => {
      updateLogic({
        rules: rules.map((rule: ConditionalRule) =>
          rule.id === ruleId
            ? {
                ...rule,
                ...patch,
                then: {
                  ...rule.then,
                  ...(patch.then || {}),
                  params: {
                    ...(rule.then.params || {}),
                    ...((patch.then && patch.then.params) || {}),
                  },
                },
              }
            : rule,
        ),
      });
    },
    [rules, updateLogic],
  );

  const updateCondition = useCallback(
    (
      ruleId: string,
      conditionId: string,
      patch: Partial<ConditionalCondition>,
    ) => {
      updateLogic({
        rules: rules.map((rule: ConditionalRule) => {
          if (rule.id !== ruleId) return rule;
          const conditions = getRuleConditions(rule).map((condition) =>
            condition.id === conditionId
              ? { ...condition, ...patch }
              : condition,
          );
          return { ...rule, conditions };
        }),
      });
    },
    [rules, updateLogic],
  );

  const removeCondition = (ruleId: string, conditionId: string) => {
    updateLogic({
      rules: rules.map((rule: ConditionalRule) => {
        if (rule.id !== ruleId) return rule;
        const remaining = getRuleConditions(rule).filter(
          (condition) => condition.id !== conditionId,
        );
        return {
          ...rule,
          conditions: remaining.length ? remaining : [createCondition()],
        };
      }),
    });
  };

  const addCondition = (ruleId: string) => {
    updateLogic({
      rules: rules.map((rule: ConditionalRule) =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: [...getRuleConditions(rule), createCondition()],
            }
          : rule,
      ),
    });
  };

  useEffect(() => {
    if (!editingRule) return;
    const conditions = getRuleConditions(editingRule);
    conditions.forEach((condition) => {
      const watcher = availableFields.find(
        (field) => field.value === condition.field,
      );
      const allowedOperators = getAllowedOperators(watcher?.field);
      if (
        watcher?.field &&
        !isOperatorAllowed(condition.operator, watcher.field)
      ) {
        updateCondition(editingRule.id, condition.id, {
          operator: allowedOperators[0],
        });
      }
    });
  }, [editingRule, availableFields, updateCondition]);

  return (
    <>
      <PanelBody
        title={__("Conditional Logic", TEXT_DOMAIN)}
        initialOpen={false}
      >
        <ToggleControl
          label={__("Enable conditional logic", TEXT_DOMAIN)}
          checked={Boolean(logic.enabled)}
          onChange={(enabled) => updateLogic({ enabled })}
        />

        {logic.enabled && (
          <>
            {conditionalIssues.map((issue) => (
              <Notice key={issue} status="warning" isDismissible={false}>
                {issue}
              </Notice>
            ))}

            {rules.map((rule: ConditionalRule) => (
              <div
                key={rule.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <strong>{__("Rule", TEXT_DOMAIN)}</strong>
                <div style={{ marginTop: 4, marginBottom: 8, color: "#555" }}>
                  {summarizeRule(rule, watcherLabelMap)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="secondary"
                    onClick={() => setEditingRuleId(rule.id)}
                  >
                    {__("Edit", TEXT_DOMAIN)}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateLogic({
                        rules: rules.filter(
                          (item: ConditionalRule) => item.id !== rule.id,
                        ),
                      })
                    }
                  >
                    {__("Remove", TEXT_DOMAIN)}
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="primary"
              onClick={() => {
                const rule = createRule();
                updateLogic({ rules: [...rules, rule] });
                setEditingRuleId(rule.id);
              }}
            >
              {__("Add Rule", TEXT_DOMAIN)}
            </Button>
          </>
        )}
      </PanelBody>

      {editingRule && (
        <Modal
          title={__("Edit Conditional Rule", TEXT_DOMAIN)}
          onRequestClose={() => setEditingRuleId(null)}
        >
          {availableFields.length === 0 ? (
            <Notice status="warning" isDismissible={false}>
              {__(
                "Add another named field first so this rule has something to watch.",
                TEXT_DOMAIN,
              )}
            </Notice>
          ) : null}

          <SelectControl
            label={__("How should conditions match?", TEXT_DOMAIN)}
            value={editingRule.matchType || "all"}
            options={[
              {
                label: __("All conditions match (AND)", TEXT_DOMAIN),
                value: "all",
              },
              {
                label: __("Any condition matches (OR)", TEXT_DOMAIN),
                value: "any",
              },
            ]}
            onChange={(matchType) =>
              updateRule(editingRule.id, {
                matchType: matchType as "all" | "any",
              })
            }
          />

          {editingConditions.map((condition, index) => {
            const watcher = availableFields.find(
              (field) => field.value === condition.field,
            );
            const allowedOperators = getAllowedOperators(watcher?.field);
            const operatorValue = allowedOperators.includes(condition.operator)
              ? condition.operator
              : allowedOperators[0];

            return (
              <div
                key={condition.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ marginBottom: 8, fontWeight: 600 }}>
                  {`${__("Condition", TEXT_DOMAIN)} ${index + 1}`}
                </div>

                <SelectControl
                  label={__("When field", TEXT_DOMAIN)}
                  value={condition.field}
                  options={[
                    { label: __("Select field", TEXT_DOMAIN), value: "" },
                    ...availableFields,
                  ]}
                  onChange={(field) =>
                    updateCondition(editingRule.id, condition.id, { field })
                  }
                />

                <SelectControl
                  label={__("Operator", TEXT_DOMAIN)}
                  value={operatorValue}
                  options={operatorOptions
                    .filter((option) => allowedOperators.includes(option.value))
                    .map((option) => ({
                      label: __(option.label, TEXT_DOMAIN),
                      value: option.value,
                    }))}
                  onChange={(operator) =>
                    updateCondition(editingRule.id, condition.id, {
                      operator: operator as ConditionalOperator,
                    })
                  }
                  help={
                    watcher
                      ? __(
                          "Only operators relevant for the selected field type are shown.",
                          TEXT_DOMAIN,
                        )
                      : undefined
                  }
                />

                {![
                  "isEmpty",
                  "isNotEmpty",
                  "isChecked",
                  "isNotChecked",
                ].includes(condition.operator) && (
                  <TextareaControl
                    label={__("Value", TEXT_DOMAIN)}
                    value={
                      Array.isArray(condition.value)
                        ? JSON.stringify(condition.value)
                        : String(condition.value ?? "")
                    }
                    onChange={(raw) => {
                      let value: unknown = raw;
                      if (
                        ["isAnyOf", "isNoneOf"].includes(condition.operator)
                      ) {
                        try {
                          value = JSON.parse(raw);
                        } catch {
                          value = raw
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean);
                        }
                      }
                      updateCondition(editingRule.id, condition.id, { value });
                    }}
                    help={
                      ["isAnyOf", "isNoneOf"].includes(condition.operator)
                        ? __(
                            "Provide JSON array or comma-separated values.",
                            TEXT_DOMAIN,
                          )
                        : undefined
                    }
                  />
                )}

                <Button
                  variant="secondary"
                  onClick={() => removeCondition(editingRule.id, condition.id)}
                >
                  {__("Remove condition", TEXT_DOMAIN)}
                </Button>
              </div>
            );
          })}

          <div style={{ marginBottom: 16 }}>
            <Button
              variant="secondary"
              onClick={() => addCondition(editingRule.id)}
            >
              {__("Add condition", TEXT_DOMAIN)}
            </Button>
          </div>

          <SelectControl
            label={__("Then action", TEXT_DOMAIN)}
            value={editingRule.then.action}
            options={actionOptions}
            onChange={(action) =>
              updateRule(editingRule.id, {
                then: { action: action as ConditionalAction, params: {} },
              })
            }
          />

          {editingRule.then.action === "setValue" && (
            <TextControl
              label={__("Value to set", TEXT_DOMAIN)}
              value={String(editingRule.then.params?.value ?? "")}
              onChange={(value) =>
                updateRule(editingRule.id, {
                  then: { action: editingRule.then.action, params: { value } },
                })
              }
            />
          )}

          {editingRule.then.action === "updateOptions" && (
            <OptionsSourceEditor
              prefix={__("Updated", TEXT_DOMAIN)}
              value={
                editingRule.then.params || {
                  optionsSource: "static",
                  options: [],
                }
              }
              onChange={(params) =>
                updateRule(editingRule.id, {
                  then: { action: editingRule.then.action, params },
                })
              }
            />
          )}

          <Notice status="info" isDismissible={false}>
            {summarizeRule(editingRule, watcherLabelMap)}
          </Notice>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <Button variant="primary" onClick={() => setEditingRuleId(null)}>
              {__("Done", TEXT_DOMAIN)}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
