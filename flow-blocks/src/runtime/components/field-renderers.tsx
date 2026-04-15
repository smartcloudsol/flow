import {
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Collapse,
  ColorInput,
  Divider,
  Fieldset,
  FileInput,
  Group,
  Loader,
  NumberInput,
  PasswordInput,
  PinInput,
  Radio,
  RangeSlider,
  Rating,
  MultiSelect,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  TagsInput,
  Progress,
  Paper,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
  VisuallyHidden,
  RadioIconProps,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { I18n } from "aws-amplify/utils";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  FieldConfig,
  FlowIconName,
  FlowRatingSymbolName,
  RuntimeFieldState,
} from "../../shared/types";
import { getAiSuggestionsInputScope } from "../ai/input-scope";
import { buildAiSuggestionsInputSignature } from "../ai/prompt-builder";
import { evaluateRule, getRuntimeKey } from "../conditional-engine";
import { useFormField } from "../hooks/useFormField";
import { useFormRuntime } from "../hooks/useFormRuntime";
import { useOptionsData } from "../hooks/useOptionsData";
import { validateField } from "../validation";
import { WizardContainer } from "./WizardContainer";

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

function getBlockClassName(type: FieldConfig["type"], extraClassName?: string) {
  return joinClassNames("flow-block", `flow-block__${type}`, extraClassName);
}

function getControlClassName(type: string, extraClassName?: string) {
  return joinClassNames(
    "flow-control",
    `flow-control__${type}`,
    extraClassName,
  );
}

function getFieldExtraClassName(field: FieldConfig): string | undefined {
  const candidate = field as unknown as {
    classNames?: unknown;
    className?: unknown;
  };

  const tokens = [
    ...(Array.isArray(candidate.classNames)
      ? candidate.classNames.flatMap((value) =>
          typeof value === "string" ? value.split(/\s+/) : [],
        )
      : []),
    ...(typeof candidate.className === "string"
      ? candidate.className.split(/\s+/)
      : []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return undefined;
  }

  return Array.from(new Set(tokens)).join(" ");
}

function getFieldRenderKey(field: FieldConfig, path: number[]) {
  return getRuntimeKey(field, path);
}

function resolveInputSize(field: { size?: string; inputSize?: string }) {
  return field.inputSize || field.size;
}

function resolveMantineSize(size?: string) {
  return size === "xs" ||
    size === "sm" ||
    size === "md" ||
    size === "lg" ||
    size === "xl"
    ? size
    : undefined;
}

function resolveFileCapture(capture?: string) {
  if (capture === "user" || capture === "environment") {
    return capture;
  }

  if (capture === "true") {
    return true;
  }

  if (capture === "false") {
    return false;
  }

  return undefined;
}

function FlowCheckIcon(props: RadioIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      {...props}
    >
      <path d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}

function FlowCrossIcon(props: RadioIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      {...props}
    >
      <path d="M7 7 17 17" />
      <path d="M17 7 7 17" />
    </svg>
  );
}

function FlowMinusIcon(props: RadioIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      {...props}
    >
      <path d="M6 12h12" />
    </svg>
  );
}

function FlowDotIcon(props: RadioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

function getIndicatorIcon(icon?: FlowIconName) {
  switch (icon) {
    case "check":
      return FlowCheckIcon;
    case "x":
      return FlowCrossIcon;
    case "minus":
      return FlowMinusIcon;
    case "dot":
      return FlowDotIcon;
    default:
      return undefined;
  }
}

function getThumbIcon(icon?: FlowIconName) {
  switch (icon) {
    case "check":
      return <span aria-hidden="true">✓</span>;
    case "x":
      return <span aria-hidden="true">✕</span>;
    case "star":
      return <span aria-hidden="true">★</span>;
    case "heart":
      return <span aria-hidden="true">♥</span>;
    case "thumb-up":
      return <span aria-hidden="true">👍</span>;
    case "sun":
      return <span aria-hidden="true">☀</span>;
    case "moon":
      return <span aria-hidden="true">☾</span>;
    default:
      return undefined;
  }
}

function getRatingSymbol(symbol?: FlowRatingSymbolName, filled = true) {
  switch (symbol) {
    case "heart":
      return <span aria-hidden="true">{filled ? "♥" : "♡"}</span>;
    case "check":
      return <span aria-hidden="true">✓</span>;
    case "dot":
      return <span aria-hidden="true">•</span>;
    case "star":
      return <span aria-hidden="true">{filled ? "★" : "☆"}</span>;
    default:
      return undefined;
  }
}

function getLoaderSections(position: "left" | "right" = "right") {
  const loader = <Loader size="xs" />;

  return position === "left"
    ? { leftSection: loader }
    : { rightSection: loader };
}

function getRequiredLabel(label: string | undefined, required?: boolean) {
  if (!label || !required) {
    return label;
  }

  return label.endsWith("*") ? label : `${label} *`;
}

function FieldBlock({
  type,
  children,
  className,
}: {
  type: FieldConfig["type"];
  children: ReactNode;
  className?: string;
}) {
  return <div className={getBlockClassName(type, className)}>{children}</div>;
}

function FieldMessage({
  variant,
  children,
}: {
  variant: "error" | "required" | "caption";
  children: ReactNode;
}) {
  return (
    <div
      className={joinClassNames(
        "flow-block-message",
        `flow-block-message__${variant}`,
      )}
    >
      {children}
    </div>
  );
}

function OptionsLoadingIndicator() {
  return (
    <Group gap="xs" align="center">
      <Loader size="xs" />
      <Text size="sm" c="dimmed">
        {I18n.get("Loading options...") || "Loading options..."}
      </Text>
    </Group>
  );
}

function useRuntimeByKey(runtimeKey: string): RuntimeFieldState | undefined {
  return useFormRuntime().fieldStates[runtimeKey];
}

function isHidden(runtime?: RuntimeFieldState) {
  return runtime?.visible === false;
}

function hasVisibleAiSuggestionsField(
  fields: FieldConfig[],
  fieldStates: Record<string, RuntimeFieldState>,
) {
  return fields.some((candidate, index) => {
    if (candidate.type !== "ai-suggestions") {
      return false;
    }

    const runtimeState = fieldStates[getRuntimeKey(candidate, [index])];
    return !isHidden(runtimeState);
  });
}

function isBrowserFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

type UploadedFileReference = {
  fileName?: string;
  bucket?: string;
  key?: string;
  contentType?: string;
  size?: number;
};

function isUploadedFileReference(
  value: unknown,
): value is UploadedFileReference {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("fileName" in (value as Record<string, unknown>) ||
        "key" in (value as Record<string, unknown>)),
  );
}

function getFileInputValue(value: unknown): File | File[] | null {
  if (isBrowserFile(value)) return value;
  if (Array.isArray(value) && value.every(isBrowserFile)) return value;
  return null;
}

function getUploadedFileReferences(value: unknown): UploadedFileReference[] {
  if (isUploadedFileReference(value)) return [value];
  if (Array.isArray(value)) {
    return value.filter(isUploadedFileReference);
  }
  return [];
}

type AiCitationSource = {
  id: string;
  title: string;
  sourceUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getStringProperty(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function normalizeSourceUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined;

  const trimmed = sourceUrl.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return trimmed.replace(/#.*$/, "").replace(/\/+$/, "") || trimmed;
  }
}

function getAiCitationSources(citations: unknown): AiCitationSource[] {
  const docs = Array.isArray(citations)
    ? citations
    : isRecord(citations) && Array.isArray(citations.docs)
    ? citations.docs
    : [];
  const seenEntries = new Set<string>();
  const seenSourceUrls = new Set<string>();

  return docs
    .filter(isRecord)
    .map((item, index) => {
      const id =
        getStringProperty(item, ["docId", "documentId", "id"]) ||
        `source-${index + 1}`;
      const sourceUrl = getStringProperty(item, ["sourceUrl", "url", "href"]);
      const title =
        getStringProperty(item, ["title", "name", "sourceTitle"]) ||
        sourceUrl ||
        `${I18n.get("Source") || "Source"} ${index + 1}`;
      return { id, title, sourceUrl };
    })
    .filter((item) => {
      const normalizedSourceUrl = normalizeSourceUrl(item.sourceUrl);
      if (normalizedSourceUrl && seenSourceUrls.has(normalizedSourceUrl)) {
        return false;
      }

      const key = `${item.id}:${normalizedSourceUrl || item.title}`;
      if (seenEntries.has(key)) return false;

      seenEntries.add(key);
      if (normalizedSourceUrl) {
        seenSourceUrls.add(normalizedSourceUrl);
      }
      return true;
    });
}

const SourcesCard = ({ sources }: { sources: AiCitationSource[] }) => {
  if (!sources.length) return null;

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      bg="var(--mantine-color-gray-0)"
      className="flow-ai-suggestions-sources"
    >
      <Stack gap="sm">
        <Text fw={600} className="flow-ai-suggestions-sources__title">
          {I18n.get("Used sources") || I18n.get("Sources") || "Used sources"}
        </Text>
        <Stack gap="xs">
          {sources.map((source, index) => (
            <Group
              key={`${source.id}-${index}`}
              wrap="nowrap"
              align="flex-start"
              className="flow-ai-suggestions-sources__item"
            >
              <Badge
                variant="light"
                radius="xl"
                className="flow-ai-suggestions-sources__index"
              >
                {index + 1}
              </Badge>
              <div className="flow-ai-suggestions-sources__body">
                {source.sourceUrl ? (
                  <Anchor
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="sm"
                    underline="hover"
                    className="flow-ai-suggestions-sources__link"
                  >
                    {source.title}
                  </Anchor>
                ) : (
                  <Text size="sm" className="flow-ai-suggestions-sources__text">
                    {source.title}
                  </Text>
                )}
              </div>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};

function hasChildren(
  field: FieldConfig,
): field is FieldConfig & { children: FieldConfig[] } {
  return (
    "children" in field &&
    Array.isArray((field as { children?: FieldConfig[] }).children)
  );
}

function hasSteps(
  field: FieldConfig,
): field is Extract<FieldConfig, { type: "wizard" }> {
  return field.type === "wizard";
}

function isWizardStepVisible(
  step: Extract<FieldConfig, { type: "wizard" }>["steps"][number],
  values: Record<string, unknown>,
) {
  let visible = !step.hidden;
  const logic = step.conditionalLogic;

  if (!logic?.enabled || !logic.rules?.length) {
    return visible;
  }

  for (const rule of logic.rules) {
    if (!evaluateRule(rule, values)) continue;

    if (rule.then.action === "show") visible = true;
    if (rule.then.action === "hide") visible = false;
  }

  return visible;
}

function isNamedInteractiveField(
  field: FieldConfig,
): field is Extract<FieldConfig, { name: string }> {
  return (
    "name" in field && typeof field.name === "string" && field.name.length > 0
  );
}

function collectFieldsBeforeTarget(
  fields: FieldConfig[],
  targetRuntimeKey: string,
  values: Record<string, unknown>,
  acc: Array<{
    field: Extract<FieldConfig, { name: string }>;
    runtimeKey: string;
  }>,
  path: number[] = [],
): boolean {
  for (const [index, field] of fields.entries()) {
    const currentPath = [...path, index];
    const runtimeKey = getRuntimeKey(field, currentPath);

    if (runtimeKey === targetRuntimeKey) {
      return true;
    }

    if (hasChildren(field)) {
      if (
        collectFieldsBeforeTarget(
          field.children,
          targetRuntimeKey,
          values,
          acc,
          currentPath,
        )
      ) {
        return true;
      }
      continue;
    }

    if (hasSteps(field)) {
      for (const [stepIndex, step] of field.steps.entries()) {
        if (!isWizardStepVisible(step, values)) continue;
        if (
          collectFieldsBeforeTarget(
            step.children,
            targetRuntimeKey,
            values,
            acc,
            [...currentPath, stepIndex],
          )
        ) {
          return true;
        }
      }
      continue;
    }

    if (isNamedInteractiveField(field)) {
      acc.push({ field, runtimeKey });
    }
  }

  return false;
}

function isMissingValue(
  field: Extract<FieldConfig, { name: string }>,
  value: unknown,
) {
  if (field.type === "checkbox") return value !== true;
  if (field.type === "checkbox-group") {
    return !Array.isArray(value) || value.length === 0;
  }
  if (field.type === "file") {
    return value === undefined || value === null || value === "";
  }
  if (Array.isArray(value)) return value.length === 0;
  return typeof value !== "string" || value.trim().length === 0;
}

function getFieldLabel(field: Extract<FieldConfig, { name: string }>) {
  return ("label" in field && field.label) || field.name;
}

function summarizeLabels(labels: string[]) {
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3}`;
}

function getAiSuggestionPrerequisites(
  fields: FieldConfig[],
  targetRuntimeKey: string,
  values: Record<string, unknown>,
  fieldStates: Record<string, RuntimeFieldState>,
) {
  const precedingFields: Array<{
    field: Extract<FieldConfig, { name: string }>;
    runtimeKey: string;
  }> = [];
  collectFieldsBeforeTarget(fields, targetRuntimeKey, values, precedingFields);

  const visibleFields = precedingFields.filter(({ runtimeKey }) => {
    const runtime = fieldStates[runtimeKey];
    return runtime?.visible !== false && runtime?.enabled !== false;
  });

  const requiredFields = visibleFields.filter(({ field, runtimeKey }) => {
    const runtime = fieldStates[runtimeKey];
    return Boolean(
      runtime?.required ?? ("required" in field && field.required),
    );
  });

  const requiredFieldLabels = requiredFields
    .filter(({ field, runtimeKey }) =>
      Boolean(
        validateField(field.name, fields, values, fieldStates, runtimeKey),
      ),
    )
    .map(({ field }) => getFieldLabel(field));
  const descriptiveField =
    [...visibleFields]
      .reverse()
      .find(
        ({ field, runtimeKey }) =>
          field.type === "textarea" &&
          Boolean(
            fieldStates[runtimeKey]?.required ??
              ("required" in field && field.required),
          ),
      ) ||
    [...visibleFields].reverse().find(({ field }) => field.type === "textarea");
  const descriptiveFieldLabel = descriptiveField
    ? getFieldLabel(descriptiveField.field)
    : undefined;
  const isDescriptiveReady = descriptiveField
    ? !isMissingValue(
        descriptiveField.field,
        values[descriptiveField.field.name],
      )
    : true;

  const missingRequiredLabels = requiredFieldLabels.filter(
    (label) => label !== descriptiveFieldLabel || isDescriptiveReady,
  );

  return {
    canRun: missingRequiredLabels.length === 0 && isDescriptiveReady,
    missingRequiredLabels,
    missingDescriptiveFieldLabel: isDescriptiveReady
      ? undefined
      : descriptiveFieldLabel,
  };
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function SuggestionSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={4} className="flow-ai-suggestions__section">
      <Text
        size="xs"
        fw={700}
        c="dimmed"
        tt="uppercase"
        className="flow-ai-suggestions__section-label"
      >
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export function FieldRenderer({
  field,
  path = [],
}: {
  field: FieldConfig;
  path?: number[];
}) {
  const runtimeKey = getRuntimeKey(field, path);
  switch (field.type) {
    case "text":
      return <TextField field={field} runtimeKey={runtimeKey} />;
    case "textarea":
      return <TextareaField field={field} runtimeKey={runtimeKey} />;
    case "select":
      return <SelectField field={field} runtimeKey={runtimeKey} />;
    case "checkbox":
      return <CheckboxField field={field} runtimeKey={runtimeKey} />;
    case "checkbox-group":
      return <CheckboxGroupField field={field} runtimeKey={runtimeKey} />;
    case "date":
      return <DateField field={field} runtimeKey={runtimeKey} />;
    case "switch":
      return <SwitchField field={field} runtimeKey={runtimeKey} />;
    case "number":
      return <NumberField field={field} runtimeKey={runtimeKey} />;
    case "radio":
      return <RadioField field={field} runtimeKey={runtimeKey} />;
    case "password":
      return <PasswordField field={field} runtimeKey={runtimeKey} />;
    case "pin":
      return <PinField field={field} runtimeKey={runtimeKey} />;
    case "color":
      return <ColorField field={field} runtimeKey={runtimeKey} />;
    case "file":
      return <FileField field={field} runtimeKey={runtimeKey} />;
    case "slider":
      return <SliderField field={field} runtimeKey={runtimeKey} />;
    case "rangeslider":
      return <RangeSliderField field={field} runtimeKey={runtimeKey} />;
    case "tags":
      return <TagsField field={field} runtimeKey={runtimeKey} />;
    case "rating":
      return <RatingField field={field} runtimeKey={runtimeKey} />;
    case "submit":
      return <SubmitField field={field} runtimeKey={runtimeKey} />;
    case "save-draft":
      return <SaveDraftField field={field} runtimeKey={runtimeKey} />;
    case "ai-suggestions":
      return <AiSuggestionsField field={field} runtimeKey={runtimeKey} />;
    case "fieldset":
      return (
        <FieldsetContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    case "collapse":
      return (
        <CollapseContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    case "divider":
      return <DividerElement field={field} runtimeKey={runtimeKey} />;
    case "visuallyhidden":
      return (
        <VisuallyHiddenContainer
          field={field}
          runtimeKey={runtimeKey}
          path={path}
        />
      );
    case "stack":
      return (
        <StackContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    case "group":
      return (
        <GroupContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    case "grid":
      return (
        <GridContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    case "wizard":
      return (
        <WizardContainer field={field} runtimeKey={runtimeKey} path={path} />
      );
    default:
      return null;
  }
}

function TextField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "text" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="text" className={getFieldExtraClassName(field)}>
      <TextInput
        className={getControlClassName("text")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        pointer={field.pointer}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        size={resolveInputSize(field)}
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name, runtimeKey)}
      />
    </FieldBlock>
  );
}

function TextareaField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "textarea" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="textarea" className={getFieldExtraClassName(field)}>
      <Textarea
        className={getControlClassName("textarea")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        minRows={field.minRows ?? 3}
        maxRows={field.maxRows}
        autosize={field.autosize ?? true}
        pointer={field.pointer}
        resize={field.resize}
        size={resolveInputSize(field)}
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name, runtimeKey)}
      />
    </FieldBlock>
  );
}

function SelectField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "select" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  const {
    options,
    isLoading,
    error: apiError,
    search,
  } = useOptionsData(field, runtime);
  const isAutocompleteSource =
    (runtime?.optionsSource || field.optionsSource) === "autocomplete";
  if (isHidden(runtime)) return null;

  if (field.multiple) {
    const selectedValues = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

    return (
      <FieldBlock type="select" className={getFieldExtraClassName(field)}>
        <MultiSelect
          className={getControlClassName("select")}
          clearable={field.clearable}
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          searchable={field.searchable || isAutocompleteSource}
          limit={field.limit}
          size={resolveInputSize(field)}
          withCheckIcon={field.withCheckIcon}
          withScrollArea={field.withScrollArea}
          data={options}
          value={selectedValues}
          error={error || apiError}
          required={required ?? field.required}
          withAsterisk={required ?? field.required}
          rightSection={isLoading ? <Loader size="xs" /> : undefined}
          disabled={isPending || isLoading || enabled === false}
          onChange={(nextValue) => setValue(nextValue)}
          onSearchChange={search}
          onBlur={() => validateField(field.name, runtimeKey)}
          nothingFoundMessage={
            isAutocompleteSource ? "Type to search..." : "No options"
          }
        />
      </FieldBlock>
    );
  }

  return (
    <FieldBlock type="select" className={getFieldExtraClassName(field)}>
      <Select
        className={getControlClassName("select")}
        allowDeselect={field.allowDeselect}
        autoSelectOnBlur={field.autoSelectOnBlur}
        chevronColor={field.chevronColor || undefined}
        clearable={field.clearable}
        defaultDropdownOpened={field.defaultDropdownOpened}
        limit={field.limit}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        pointer={field.pointer}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        searchable={field.searchable || isAutocompleteSource}
        size={resolveInputSize(field)}
        withCheckIcon={field.withCheckIcon}
        withScrollArea={field.withScrollArea}
        data={options}
        value={String(value ?? "")}
        error={error || apiError}
        rightSection={isLoading ? <Loader size="xs" /> : undefined}
        disabled={isPending || isLoading || enabled === false}
        onChange={(nextValue) => setValue(nextValue ?? "")}
        onSearchChange={search}
        onBlur={() => validateField(field.name, runtimeKey)}
        nothingFoundMessage={
          isAutocompleteSource ? "Type to search..." : "No options"
        }
      />
    </FieldBlock>
  );
}

function CheckboxField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "checkbox" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="checkbox" className={getFieldExtraClassName(field)}>
      <Checkbox
        className={getControlClassName("checkbox")}
        autoContrast={field.autoContrast}
        label={getRequiredLabel(field.label, required ?? field.required)}
        description={field.description}
        checked={Boolean(value)}
        color={field.color || undefined}
        error={error}
        disabled={isPending || enabled === false}
        icon={getIndicatorIcon(field.icon)}
        iconColor={field.iconColor || undefined}
        onChange={(event) => setValue(event.currentTarget.checked)}
        required={required ?? field.required}
        size={field.size}
      />
    </FieldBlock>
  );
}

function CheckboxGroupField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "checkbox-group" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const {
    options,
    isLoading,
    error: apiError,
    search,
  } = useOptionsData(field, runtime);
  const [searchValue, setSearchValue] = useState("");
  const isAutocompleteSource =
    (runtime?.optionsSource || field.optionsSource) === "autocomplete";
  if (isHidden(runtime)) return null;

  const selectedValues = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  const availableOptions = options.length
    ? options
    : Array.isArray(field.options)
    ? field.options
    : [];

  const handleSearchChange = (nextValue: string) => {
    setSearchValue(nextValue);
    search(nextValue);
  };

  return (
    <FieldBlock type="checkbox-group" className={getFieldExtraClassName(field)}>
      {isAutocompleteSource ? (
        <TextInput
          className={getControlClassName("checkbox-group-search")}
          placeholder={I18n.get("Type to search...") || "Type to search..."}
          value={searchValue}
          disabled={isPending || isLoading || enabled === false}
          onChange={(event) => handleSearchChange(event.currentTarget.value)}
          mb="sm"
        />
      ) : null}
      <Checkbox.Group
        label={field.label}
        description={field.description}
        withAsterisk={required ?? field.required}
        value={selectedValues}
        error={error || apiError}
        onChange={setValue}
      >
        <Stack gap="xs">
          {isLoading ? <OptionsLoadingIndicator /> : null}
          {availableOptions.map((option) => (
            <Checkbox
              key={option.value}
              className={getControlClassName("checkbox-item")}
              value={option.value}
              label={option.label}
              disabled={isPending || isLoading || enabled === false}
              required={required ?? field.required}
              size={field.size}
            />
          ))}
        </Stack>
      </Checkbox.Group>
    </FieldBlock>
  );
}

function DateField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "date" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="date" className={getFieldExtraClassName(field)}>
      <DateInput
        className={getControlClassName("date")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        size={resolveMantineSize(field.size)}
        value={typeof value === "string" && value ? new Date(value) : null}
        error={error}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        disabled={isPending || enabled === false}
        onChange={(nextValue) => setValue(nextValue ?? "")}
        onBlur={() => validateField(field.name, runtimeKey)}
      />
    </FieldBlock>
  );
}

function SaveDraftField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "save-draft" }>;
  runtimeKey: string;
}) {
  const { allowDrafts, saveDraft, isPending } = useFormRuntime();
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime) || !allowDrafts) return null;
  const label = field.label || I18n.get("Save draft") || "Save draft";
  const showTitle = field.showTitle ?? true;
  return (
    <FieldBlock type="save-draft" className={getFieldExtraClassName(field)}>
      <Button
        className={joinClassNames(
          getControlClassName("save-draft"),
          "flow-action-button",
          "flow-action-button__save-draft",
        )}
        variant="outline"
        loading={isPending}
        onClick={() => void saveDraft()}
      >
        {showTitle && label}
      </Button>
    </FieldBlock>
  );
}

function AiSuggestionsField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "ai-suggestions" }>;
  runtimeKey: string;
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  const {
    aiSuggestions,
    fieldStates,
    fields,
    isPending,
    values,
    runAiSuggestions,
    resetAiSuggestions,
    acceptAiSuggestion,
    rejectAiSuggestions,
  } = useFormRuntime();

  const aiInputScope = useMemo(
    () => getAiSuggestionsInputScope(fields, runtimeKey, values, fieldStates),
    [fieldStates, fields, runtimeKey, values],
  );

  const inputSignature = useMemo(
    () => buildAiSuggestionsInputSignature(aiInputScope.values),
    [aiInputScope],
  );

  useEffect(() => {
    if (
      field.mode !== "auto" ||
      runtime?.visible === false ||
      aiSuggestions.status === "idle" ||
      aiSuggestions.status === "loading"
    ) {
      return;
    }

    if (aiSuggestions.lastRunSignature !== inputSignature) {
      resetAiSuggestions();
    }
  }, [
    aiSuggestions.lastRunSignature,
    aiSuggestions.status,
    field.mode,
    inputSignature,
    resetAiSuggestions,
    runtime?.visible,
  ]);

  const prerequisites = useMemo(
    () => getAiSuggestionPrerequisites(fields, runtimeKey, values, fieldStates),
    [fieldStates, fields, runtimeKey, values],
  );

  useEffect(() => {
    if (
      field.mode !== "auto" ||
      aiSuggestions.status !== "idle" ||
      runtime?.visible === false ||
      !prerequisites.canRun
    ) {
      return;
    }
    void runAiSuggestions(field, runtimeKey);
  }, [
    aiSuggestions.status,
    field,
    prerequisites.canRun,
    runAiSuggestions,
    runtimeKey,
    runtime?.visible,
  ]);

  if (isHidden(runtime)) return null;

  const label =
    field.buttonLabel ||
    I18n.get("Generate suggestions") ||
    "Generate suggestions";
  const acceptLabel =
    field.acceptLabel ||
    I18n.get("Accept this answer?") ||
    I18n.get("Accept") ||
    "Accept this answer?";
  const continueLabel =
    field.continueLabel || I18n.get("Continue") || "Continue";
  const skipLabel = I18n.get("Skip suggestions") || "Skip suggestions";
  const continueDescription =
    field.continueDescription ||
    I18n.get(
      "If none of these suggestions fit, continue without accepting one.",
    ) ||
    "If none of these suggestions fit, continue without accepting one.";
  const noSuggestionsDescription =
    I18n.get("No suggestions were found for the current form values.") ||
    "No suggestions were found for the current form values.";
  const continueWhenEmptyDescription =
    I18n.get("You can continue without selecting a suggestion.") ||
    "You can continue without selecting a suggestion.";
  const citationSources = getAiCitationSources(aiSuggestions.citations);
  const showSuggestions = aiSuggestions.status === "done";
  const showContinueAction = aiSuggestions.status === "done";
  const showSources =
    aiSuggestions.status === "done" && citationSources.length > 0;
  const hasSuggestions = aiSuggestions.suggestions.length > 0;
  const emptyStateMessage =
    field.emptyStateText ||
    I18n.get("No suggestions available") ||
    "No suggestions available";
  const continueMessage = hasSuggestions
    ? continueDescription
    : continueWhenEmptyDescription;
  const isGenerating = aiSuggestions.status === "loading";
  const loadingLabel =
    I18n.get("Generating possible solutions...") ||
    "Generating possible solutions...";
  const requirementsMessage = [
    prerequisites.missingRequiredLabels.length
      ? `${
          I18n.get("Complete these required fields first") ||
          "Complete these required fields first"
        }: ${summarizeLabels(prerequisites.missingRequiredLabels)}.`
      : undefined,
    prerequisites.missingDescriptiveFieldLabel
      ? `${
          I18n.get("Add details before generating suggestions") ||
          "Add details before generating suggestions"
        }: ${prerequisites.missingDescriptiveFieldLabel}.`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldBlock
      type="ai-suggestions"
      className={joinClassNames(
        "flow-ai-suggestions",
        getFieldExtraClassName(field),
      )}
    >
      <div
        className="flow-ai-suggestions-border"
        data-flow-active={isGenerating ? "true" : "false"}
        data-flow-state={aiSuggestions.status}
      >
        <div aria-hidden="true" className="flow-ai-suggestions-border__ring" />
        <div className="flow-ai-suggestions-border__content">
          <Stack gap="sm">
            {field.title ? (
              <Text fw={600} className="flow-ai-suggestions__title">
                {field.title}
              </Text>
            ) : null}
            {field.description ? (
              <Text
                size="sm"
                c="dimmed"
                className="flow-ai-suggestions__description"
              >
                {field.description}
              </Text>
            ) : null}
            {field.mode !== "auto" ? (
              <Stack gap="xs">
                <Button
                  variant="default"
                  className={joinClassNames(
                    getControlClassName("button"),
                    "flow-action-button",
                    "flow-ai-suggestions__trigger",
                  )}
                  onClick={() => void runAiSuggestions(field, runtimeKey)}
                  loading={isGenerating || isPending}
                  disabled={!prerequisites.canRun}
                >
                  {label}
                </Button>
                {!prerequisites.canRun && requirementsMessage ? (
                  <Text
                    size="sm"
                    c="dimmed"
                    className="flow-ai-suggestions__requirements"
                  >
                    {requirementsMessage}
                  </Text>
                ) : null}
              </Stack>
            ) : null}
            {isGenerating ? (
              <Stack gap="xs">
                <Group gap="xs" className="flow-ai-suggestions__loading">
                  <Loader size="sm" />
                  <Text size="sm" fw={500}>
                    {loadingLabel}
                  </Text>
                </Group>
                <Group>
                  <Button
                    size="sm"
                    variant="default"
                    className={joinClassNames(
                      getControlClassName("button"),
                      "flow-action-button",
                      "flow-ai-suggestions__skip-button",
                    )}
                    onClick={() => rejectAiSuggestions()}
                    disabled={aiSuggestions.status === "rejected"}
                  >
                    {skipLabel}
                  </Button>
                </Group>
              </Stack>
            ) : null}
            {aiSuggestions.rawText ? (
              <Alert color="blue">{aiSuggestions.rawText}</Alert>
            ) : null}
            {aiSuggestions.status === "accepted" ? (
              <Alert color="green">
                {I18n.get("Suggestion accepted") || "Suggestion accepted"}
              </Alert>
            ) : null}
            {aiSuggestions.status === "rejected" ? (
              <Alert color="gray">
                {I18n.get("Suggestions skipped") || "Suggestions skipped"}
              </Alert>
            ) : null}
            {showSuggestions
              ? aiSuggestions.suggestions.map((suggestion) => (
                  <Paper
                    key={suggestion.id}
                    withBorder
                    p="md"
                    radius="md"
                    className="flow-ai-suggestions__card"
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text
                          fw={600}
                          className="flow-ai-suggestions__card-title"
                        >
                          {suggestion.title}
                        </Text>
                        {typeof suggestion.confidence === "number" ? (
                          <Badge
                            variant="light"
                            radius="xl"
                            className="flow-ai-suggestions__confidence"
                          >
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        ) : null}
                      </Group>
                      {suggestion.description ? (
                        suggestion.possibleAnswer !== suggestion.description ? (
                          <Text
                            size="sm"
                            c="dimmed"
                            className="flow-ai-suggestions__card-description"
                          >
                            {suggestion.description}
                          </Text>
                        ) : null
                      ) : null}
                      {suggestion.possibleAnswer || suggestion.description ? (
                        <SuggestionSection
                          label={
                            I18n.get("Possible answer") || "Possible answer"
                          }
                        >
                          <Text size="sm">
                            {suggestion.possibleAnswer ||
                              suggestion.description}
                          </Text>
                        </SuggestionSection>
                      ) : null}
                      {suggestion.whyThisMayHelp ? (
                        <SuggestionSection
                          label={
                            I18n.get("Why this may help") || "Why this may help"
                          }
                        >
                          <Text size="sm">{suggestion.whyThisMayHelp}</Text>
                        </SuggestionSection>
                      ) : null}
                      {suggestion.relatedDocumentation?.length ? (
                        <SuggestionSection
                          label={
                            I18n.get("Related documentation") ||
                            "Related documentation"
                          }
                        >
                          <Stack gap={4}>
                            {suggestion.relatedDocumentation.map(
                              (reference, index) =>
                                reference.url && isLikelyUrl(reference.url) ? (
                                  <Anchor
                                    key={`${suggestion.id}-doc-${index}`}
                                    href={reference.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="sm"
                                    underline="hover"
                                  >
                                    {reference.title}
                                  </Anchor>
                                ) : (
                                  <Text
                                    key={`${suggestion.id}-doc-${index}`}
                                    size="sm"
                                  >
                                    {reference.title}
                                  </Text>
                                ),
                            )}
                          </Stack>
                        </SuggestionSection>
                      ) : null}
                      {suggestion.nextBestAction ? (
                        <SuggestionSection
                          label={
                            I18n.get("Next best action") || "Next best action"
                          }
                        >
                          <Text size="sm">{suggestion.nextBestAction}</Text>
                        </SuggestionSection>
                      ) : null}
                      {typeof suggestion.confidence === "number" ? (
                        <Progress
                          className="flow-ai-suggestions__confidence-bar"
                          value={Math.max(
                            0,
                            Math.min(100, suggestion.confidence * 100),
                          )}
                        />
                      ) : null}
                      <Group>
                        <Button
                          size="sm"
                          className={joinClassNames(
                            getControlClassName("button"),
                            "flow-action-button",
                            "flow-ai-suggestions__accept-button",
                          )}
                          onClick={() => acceptAiSuggestion(suggestion.id)}
                          disabled={aiSuggestions.status === "accepted"}
                        >
                          {acceptLabel}
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                ))
              : null}
            {showSuggestions &&
            !aiSuggestions.suggestions.length &&
            aiSuggestions.status === "done" &&
            !aiSuggestions.rawText ? (
              <Alert
                color="gray"
                variant="light"
                className="flow-ai-suggestions__empty-state"
              >
                <Stack gap={4}>
                  <Text fw={600}>{emptyStateMessage}</Text>
                  <Text size="sm" c="dimmed">
                    {noSuggestionsDescription}
                  </Text>
                </Stack>
              </Alert>
            ) : null}
            {showSources ? <SourcesCard sources={citationSources} /> : null}
            {showContinueAction ? (
              <Stack gap="xs" className="flow-ai-suggestions__continue">
                <Divider
                  label={
                    hasSuggestions
                      ? I18n.get("Or continue") || "Or continue"
                      : I18n.get("Continue") || "Continue"
                  }
                  className="flow-ai-suggestions__continue-divider"
                />
                <Text
                  size="sm"
                  c="dimmed"
                  className="flow-ai-suggestions__continue-description"
                >
                  {continueMessage}
                </Text>
                <Group>
                  <Button
                    size="sm"
                    variant="default"
                    className={joinClassNames(
                      getControlClassName("button"),
                      "flow-action-button",
                      "flow-ai-suggestions__continue-button",
                    )}
                    onClick={() => rejectAiSuggestions()}
                    disabled={aiSuggestions.status === "rejected"}
                  >
                    {continueLabel}
                  </Button>
                </Group>
              </Stack>
            ) : null}
          </Stack>
        </div>
      </div>
    </FieldBlock>
  );
}

function SubmitField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "submit" }>;
  runtimeKey: string;
}) {
  const { submitLabel, submit, isPending, fields, aiSuggestions, fieldStates } =
    useFormRuntime();
  const runtime = useRuntimeByKey(runtimeKey);
  const deferUntilAiHandled =
    hasVisibleAiSuggestionsField(fields, fieldStates) &&
    aiSuggestions.status !== "accepted" &&
    aiSuggestions.status !== "rejected";

  if (isHidden(runtime) || deferUntilAiHandled) return null;
  const label = submitLabel || field.label || I18n.get("Submit") || "Submit";
  const showTitle = field.showTitle ?? true;
  const showIcon = field.showIcon ?? false;
  const iconPosition = field.iconPosition ?? "left";
  const customIcon = field.customIcon ?? "";

  const renderIcon = () => {
    if (!showIcon) return null;
    if (customIcon) {
      return (
        <img
          src={customIcon}
          alt=""
          style={{ width: 16, height: 16, display: "block" }}
        />
      );
    }
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 14l11 -11" />
        <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
      </svg>
    );
  };

  const icon = renderIcon();
  return (
    <FieldBlock type="submit" className={getFieldExtraClassName(field)}>
      <Button
        className={joinClassNames(
          getControlClassName("submit"),
          "flow-action-button",
          "flow-action-button__submit",
        )}
        variant="filled"
        loading={isPending}
        onClick={() => void submit()}
        leftSection={iconPosition === "left" ? icon : undefined}
        rightSection={iconPosition === "right" ? icon : undefined}
      >
        {showTitle && label}
      </Button>
    </FieldBlock>
  );
}

function StackContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "stack" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <Stack
      className={getBlockClassName("stack", getFieldExtraClassName(field))}
      gap={field.gap}
      align={field.align as React.CSSProperties["alignItems"]}
      justify={field.justify as React.CSSProperties["justifyContent"]}
    >
      {field.children.map((child, index) => {
        const childPath = [...path, index];
        return (
          <FieldRenderer
            key={getFieldRenderKey(child, childPath)}
            field={child}
            path={childPath}
          />
        );
      })}
    </Stack>
  );
}

function GroupContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "group" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <Group
      className={getBlockClassName("group", getFieldExtraClassName(field))}
      gap={field.gap}
      align={field.align as React.CSSProperties["alignItems"]}
      justify={field.justify as React.CSSProperties["justifyContent"]}
      grow={field.grow}
      preventGrowOverflow={field.preventGrowOverflow}
      wrap={field.wrap}
    >
      {field.children.map((child, index) => {
        const childPath = [...path, index];
        return (
          <FieldRenderer
            key={getFieldRenderKey(child, childPath)}
            field={child}
            path={childPath}
          />
        );
      })}
    </Group>
  );
}

function GridContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "grid" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <SimpleGrid
      className={getBlockClassName("grid", getFieldExtraClassName(field))}
      cols={field.columns}
      spacing={field.gutter ?? field.spacing}
      verticalSpacing={field.verticalSpacing}
      style={{
        gridTemplateRows: field.rows
          ? `repeat(${field.rows}, minmax(0, 1fr))`
          : undefined,
        justifyContent: field.justify,
        overflow: field.overflow,
      }}
    >
      {field.children.map((child, index) => {
        const childPath = [...path, index];
        return (
          <FieldRenderer
            key={getFieldRenderKey(child, childPath)}
            field={child}
            path={childPath}
          />
        );
      })}
    </SimpleGrid>
  );
}

function SwitchField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "switch" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="switch" className={getFieldExtraClassName(field)}>
      <Switch
        className={getControlClassName("switch")}
        color={field.color || undefined}
        label={getRequiredLabel(field.label, required ?? field.required)}
        labelPosition={field.labelPosition}
        description={field.description}
        checked={Boolean(value)}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.checked)}
        onLabel={field.onLabel}
        offLabel={field.offLabel}
        required={required ?? field.required}
        size={field.size}
        thumbIcon={getThumbIcon(field.thumbIcon)}
        withThumbIndicator={field.withThumbIndicator}
      />
    </FieldBlock>
  );
}

function NumberField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "number" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="number" className={getFieldExtraClassName(field)}>
      <NumberInput
        className={getControlClassName("number")}
        allowDecimal={field.allowDecimal}
        allowLeadingZeros={field.allowLeadingZeros}
        allowedDecimalSeparators={field.allowedDecimalSeparators}
        clampBehavior={field.clampBehavior}
        decimalScale={field.decimalScale}
        decimalSeparator={field.decimalSeparator}
        label={field.label}
        description={field.description}
        fixedDecimalScale={field.fixedDecimalScale}
        hideControls={field.hideControls}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        prefix={field.prefix}
        step={field.step}
        suffix={field.suffix}
        thousandSeparator={field.thousandSeparator}
        thousandsGroupStyle={field.thousandsGroupStyle}
        value={typeof value === "number" ? value : undefined}
        error={error}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        disabled={isPending || enabled === false}
        size={resolveInputSize(field)}
        onChange={setValue}
        onBlur={() => validateField(field.name, runtimeKey)}
      />
    </FieldBlock>
  );
}

function RadioField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "radio" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const {
    options,
    isLoading,
    error: apiError,
    search,
  } = useOptionsData(field, runtime);
  const [searchValue, setSearchValue] = useState("");
  const isAutocompleteSource =
    (runtime?.optionsSource || field.optionsSource) === "autocomplete";
  if (isHidden(runtime)) return null;

  const availableOptions = options.length
    ? options
    : Array.isArray(field.options)
    ? field.options
    : [];

  const handleSearchChange = (nextValue: string) => {
    setSearchValue(nextValue);
    search(nextValue);
  };

  return (
    <FieldBlock type="radio" className={getFieldExtraClassName(field)}>
      {isAutocompleteSource ? (
        <TextInput
          className={getControlClassName("radio-search")}
          placeholder={I18n.get("Type to search...") || "Type to search..."}
          value={searchValue}
          disabled={isPending || isLoading || enabled === false}
          onChange={(event) => handleSearchChange(event.currentTarget.value)}
          mb="sm"
        />
      ) : null}
      <Radio.Group
        className={getControlClassName("radio")}
        label={field.label}
        description={field.description}
        withAsterisk={required ?? field.required}
        value={String(value ?? "")}
        error={error || apiError}
        required={required ?? field.required}
        onChange={setValue}
      >
        <Stack gap="xs">
          {isLoading ? <OptionsLoadingIndicator /> : null}
          {availableOptions.map((option) => (
            <Radio
              key={option.value}
              autoContrast={field.autoContrast}
              className={getControlClassName("radio-item")}
              color={field.color || undefined}
              icon={getIndicatorIcon(field.icon)}
              iconColor={field.iconColor || undefined}
              size={field.size}
              value={option.value}
              label={option.label}
              disabled={isPending || isLoading || enabled === false}
            />
          ))}
        </Stack>
      </Radio.Group>
    </FieldBlock>
  );
}

function PasswordField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "password" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const { validateField } = useFormRuntime();
  const [uncontrolledVisible, setUncontrolledVisible] = useState(
    field.defaultVisible ?? false,
  );
  if (isHidden(runtime)) return null;

  const loaderSections = field.loading
    ? getLoaderSections(field.loadingPosition)
    : {};

  return (
    <FieldBlock type="password" className={getFieldExtraClassName(field)}>
      <PasswordInput
        className={getControlClassName("password")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        size={resolveInputSize(field)}
        value={String(value ?? "")}
        error={error}
        required={required ?? field.required}
        withAsterisk={required ?? field.required}
        disabled={isPending || enabled === false}
        visible={field.visible ?? uncontrolledVisible}
        onVisibilityChange={
          field.visible === undefined ? setUncontrolledVisible : undefined
        }
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name, runtimeKey)}
        {...loaderSections}
      />
    </FieldBlock>
  );
}

function PinField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "pin" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="pin" className={getFieldExtraClassName(field)}>
      <PinInput
        className={getControlClassName("pin")}
        gap={field.gap}
        inputMode={field.inputMode}
        length={field.length}
        mask={field.mask}
        placeholder={field.placeholder}
        size={resolveMantineSize(field.size)}
        type={field.inputType === "number" ? "number" : "alphanumeric"}
        value={String(value ?? "")}
        disabled={isPending || enabled === false}
        onChange={setValue}
      />
      {required ?? field.required ? (
        <FieldMessage variant="required">*</FieldMessage>
      ) : null}
      {error ? <FieldMessage variant="error">{error}</FieldMessage> : null}
    </FieldBlock>
  );
}

function ColorField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "color" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, runtime } = useFormField(
    field.name,
    runtimeKey,
  );
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="color" className={getFieldExtraClassName(field)}>
      <ColorInput
        className={getControlClassName("color")}
        closeOnColorSwatchClick={field.closeOnColorSwatchClick}
        disallowInput={field.disallowInput}
        label={field.label}
        description={field.description}
        withAsterisk={field.required}
        pointer={field.pointer}
        size={field.size}
        swatches={field.swatches}
        swatchesPerRow={field.swatchesPerRow}
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        format={field.format}
        withPicker={field.withPicker}
        withEyeDropper={field.withEyeDropper}
        withPreview={field.withPreview}
        onChange={setValue}
      />
    </FieldBlock>
  );
}

function FileField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "file" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const uploadedFiles = getUploadedFileReferences(value);
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="file" className={getFieldExtraClassName(field)}>
      <FileInput
        className={getControlClassName("file")}
        label={field.label}
        description={field.description}
        withAsterisk={required ?? field.required}
        value={getFileInputValue(value)}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        accept={field.accept}
        capture={resolveFileCapture(field.capture)}
        clearable={field.clearable}
        multiple={field.multiple}
        size={resolveInputSize(field)}
        onChange={setValue}
      />
      {uploadedFiles.length > 0 ? (
        <FieldMessage variant="caption">
          {I18n.get("Uploaded files") || "Uploaded files"}:{" "}
          {uploadedFiles
            .map((item) => item.fileName || item.key || "file")
            .join(", ")}
        </FieldMessage>
      ) : null}
    </FieldBlock>
  );
}

function SliderField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "slider" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, runtime } = useFormField(
    field.name,
    runtimeKey,
  );
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="slider" className={getFieldExtraClassName(field)}>
      <Slider
        className={getControlClassName("slider")}
        color={field.color || undefined}
        domain={field.domain}
        inverted={field.inverted}
        labelAlwaysOn={field.labelAlwaysOn}
        marks={field.marks}
        min={field.domain?.[0] ?? field.min}
        max={field.domain?.[1] ?? field.max}
        precision={field.precision}
        restrictToMarks={field.restrictToMarks}
        showLabelOnHover={field.showLabelOnHover}
        step={field.step}
        size={field.size}
        thumbSize={field.thumbSize}
        value={typeof value === "number" ? value : field.min || 0}
        disabled={isPending || enabled === false}
        onChange={setValue as (value: number) => void}
      />
      {error ? <FieldMessage variant="error">{error}</FieldMessage> : null}
    </FieldBlock>
  );
}

function RangeSliderField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "rangeslider" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, runtime } = useFormField(
    field.name,
    runtimeKey,
  );
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="rangeslider" className={getFieldExtraClassName(field)}>
      <RangeSlider
        className={getControlClassName("rangeslider")}
        color={field.color || undefined}
        domain={field.domain}
        inverted={field.inverted}
        labelAlwaysOn={field.labelAlwaysOn}
        marks={field.marks}
        min={field.domain?.[0] ?? field.min}
        max={field.domain?.[1] ?? field.max}
        maxRange={field.maxRange}
        minRange={field.minRange}
        precision={field.precision}
        pushOnOverlap={field.pushOnOverlap}
        restrictToMarks={field.restrictToMarks}
        showLabelOnHover={field.showLabelOnHover}
        step={field.step}
        size={field.size}
        thumbSize={field.thumbSize}
        value={
          Array.isArray(value)
            ? (value as [number, number])
            : [field.min || 0, field.max || 100]
        }
        disabled={isPending || enabled === false}
        onChange={setValue as (value: [number, number]) => void}
      />
      {error ? <FieldMessage variant="error">{error}</FieldMessage> : null}
    </FieldBlock>
  );
}

function TagsField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "tags" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, required, runtime } =
    useFormField(field.name, runtimeKey);
  const {
    options,
    isLoading,
    error: apiError,
    search,
  } = useOptionsData(field, runtime);
  const isAutocompleteSource =
    (runtime?.optionsSource || field.optionsSource) === "autocomplete";
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="tags" className={getFieldExtraClassName(field)}>
      {(field.loading && field.loadingPosition === "left") || isLoading ? (
        <Loader size="xs" />
      ) : null}
      <TagsInput
        className={getControlClassName("tags")}
        acceptValueOnBlur={field.acceptValueOnBlur}
        allowDuplicates={field.allowDuplicates}
        label={field.label}
        description={field.description}
        withAsterisk={required ?? field.required}
        limit={field.limit}
        maxDropdownHeight={field.maxDropdownHeight}
        placeholder={field.placeholder}
        pointer={field.pointer}
        size={resolveInputSize(field)}
        splitChars={field.splitChars ? field.splitChars.split("") : undefined}
        data={options}
        value={Array.isArray(value) ? (value as string[]) : []}
        error={error || apiError}
        required={required ?? field.required}
        disabled={isPending || isLoading || enabled === false}
        withScrollArea={field.withScrollArea}
        onSearchChange={isAutocompleteSource ? search : undefined}
        onChange={setValue as (value: string[]) => void}
      />
      {(field.loading && field.loadingPosition !== "left") || isLoading ? (
        <Loader size="xs" />
      ) : null}
    </FieldBlock>
  );
}

function RatingField({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "rating" }>;
  runtimeKey: string;
}) {
  const { value, error, isPending, setValue, enabled, runtime } = useFormField(
    field.name,
    runtimeKey,
  );
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="rating" className={getFieldExtraClassName(field)}>
      <Rating
        className={getControlClassName("rating")}
        color={field.color || undefined}
        count={field.count}
        emptySymbol={getRatingSymbol(field.emptySymbol, false)}
        fractions={field.fractions}
        fullSymbol={getRatingSymbol(field.fullSymbol, true)}
        highlightSelectedOnly={field.highlightSelectedOnly}
        size={field.size}
        value={typeof value === "number" ? value : 0}
        readOnly={isPending || enabled === false}
        onChange={setValue as (value: number) => void}
      />
      {error ? <FieldMessage variant="error">{error}</FieldMessage> : null}
    </FieldBlock>
  );
}

function FieldsetContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "fieldset" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <Fieldset
      className={getBlockClassName("fieldset", getFieldExtraClassName(field))}
      legend={field.legend}
    >
      <Stack>
        {field.children.map((child, index) => {
          const childPath = [...path, index];
          return (
            <FieldRenderer
              key={getFieldRenderKey(child, childPath)}
              field={child}
              path={childPath}
            />
          );
        })}
      </Stack>
    </Fieldset>
  );
}

function CollapseContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "collapse" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  const [opened, setOpened] = useState(field.defaultOpened ?? false);
  const isExpanded =
    typeof field.expanded === "boolean" ? field.expanded : opened;
  if (isHidden(runtime)) return null;
  return (
    <Stack
      gap="xs"
      className={getBlockClassName("collapse", getFieldExtraClassName(field))}
    >
      <UnstyledButton
        className="flow-collapse-toggle"
        type="button"
        onClick={() => {
          if (typeof field.expanded !== "boolean") {
            setOpened((current) => !current);
          }
        }}
        aria-expanded={isExpanded}
      >
        <Group justify="space-between" wrap="nowrap">
          <Text fw={500} className="flow-collapse-title">
            {field.title || I18n.get("Show more") || "Show more"}
          </Text>
          <Text size="sm" className="flow-collapse-icon">
            {isExpanded ? "-" : "+"}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse animateOpacity={field.animateOpacity} in={isExpanded}>
        <Stack>
          {field.children.map((child, index) => {
            const childPath = [...path, index];
            return (
              <FieldRenderer
                key={getFieldRenderKey(child, childPath)}
                field={child}
                path={childPath}
              />
            );
          })}
        </Stack>
      </Collapse>
    </Stack>
  );
}

function DividerElement({
  field,
  runtimeKey,
}: {
  field: Extract<FieldConfig, { type: "divider" }>;
  runtimeKey: string;
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <Divider
      className={getBlockClassName("divider", getFieldExtraClassName(field))}
      label={field.label}
      labelPosition={field.labelPosition}
      orientation={field.orientation}
      size={field.size}
    />
  );
}

function VisuallyHiddenContainer({
  field,
  runtimeKey,
  path,
}: {
  field: Extract<FieldConfig, { type: "visuallyhidden" }>;
  runtimeKey: string;
  path: number[];
}) {
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
  return (
    <VisuallyHidden>
      {field.children.map((child, index) => {
        const childPath = [...path, index];
        return (
          <FieldRenderer
            key={getFieldRenderKey(child, childPath)}
            field={child}
            path={childPath}
          />
        );
      })}
    </VisuallyHidden>
  );
}
