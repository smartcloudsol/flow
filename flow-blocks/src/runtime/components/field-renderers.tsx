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
  NumberInput,
  PasswordInput,
  PinInput,
  Radio,
  RangeSlider,
  Rating,
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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { I18n } from "aws-amplify/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { FieldConfig, RuntimeFieldState } from "../../shared/types";
import { getRuntimeKey } from "../conditional-engine";
import { useFormField } from "../hooks/useFormField";
import { useFormRuntime } from "../hooks/useFormRuntime";
import { useOptionsData } from "../hooks/useOptionsData";
import { WizardContainer } from "./WizardContainer";

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

function getBlockClassName(type: FieldConfig["type"], extraClassName?: string) {
  return joinClassNames("flow-block", `flow-block--${type}`, extraClassName);
}

function getControlClassName(type: string, extraClassName?: string) {
  return joinClassNames(
    "flow-control",
    `flow-control--${type}`,
    extraClassName,
  );
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
        `flow-block-message--${variant}`,
      )}
    >
      {children}
    </div>
  );
}

function useRuntimeByKey(runtimeKey: string): RuntimeFieldState | undefined {
  return useFormRuntime().fieldStates[runtimeKey];
}

function isHidden(runtime?: RuntimeFieldState) {
  return runtime?.visible === false;
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
    <FieldBlock type="text">
      <TextInput
        className={getControlClassName("text")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        required={required ?? field.required}
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name)}
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
    <FieldBlock type="textarea">
      <Textarea
        className={getControlClassName("textarea")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        required={required ?? field.required}
        minRows={field.minRows ?? 3}
        autosize
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name)}
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
  } = useOptionsData(field, runtime);
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="select">
      <Select
        className={getControlClassName("select")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        required={required ?? field.required}
        data={options}
        value={String(value ?? "")}
        error={error || apiError}
        disabled={isPending || isLoading || enabled === false}
        onChange={(nextValue) => setValue(nextValue ?? "")}
        onBlur={() => validateField(field.name)}
        searchable={
          (runtime?.optionsSource || field.optionsSource) === "autocomplete"
        }
        nothingFoundMessage={
          (runtime?.optionsSource || field.optionsSource) === "autocomplete"
            ? "Type to search..."
            : "No options"
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
    <FieldBlock type="checkbox">
      <Checkbox
        className={getControlClassName("checkbox")}
        label={field.label}
        description={field.description}
        checked={Boolean(value)}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.checked)}
        required={required ?? field.required}
      />
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
    <FieldBlock type="date">
      <DateInput
        className={getControlClassName("date")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        value={typeof value === "string" && value ? new Date(value) : null}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        onChange={(nextValue) => setValue(nextValue ?? "")}
        onBlur={() => validateField(field.name)}
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
    <FieldBlock type="save-draft">
      <Button
        className={joinClassNames(
          getControlClassName("save-draft"),
          "flow-action-button",
          "flow-action-button--save-draft",
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
    isPending,
    runAiSuggestions,
    acceptAiSuggestion,
    rejectAiSuggestions,
  } = useFormRuntime();

  useEffect(() => {
    if (field.mode !== "auto" || aiSuggestions.status !== "idle") return;
    void runAiSuggestions(field);
  }, [aiSuggestions.status, field, runAiSuggestions]);

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

  return (
    <FieldBlock type="ai-suggestions" className="flow-ai-suggestions">
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
          <Button
            variant="default"
            className="flow-ai-suggestions__trigger"
            onClick={() => void runAiSuggestions(field)}
            loading={aiSuggestions.status === "loading" || isPending}
          >
            {label}
          </Button>
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
                    <Text fw={600} className="flow-ai-suggestions__card-title">
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
                    <Text
                      size="sm"
                      className="flow-ai-suggestions__card-description"
                    >
                      {suggestion.description}
                    </Text>
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
                      size="xs"
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
                size="xs"
                variant="default"
                className="flow-ai-suggestions__continue-button"
                onClick={() => rejectAiSuggestions()}
                disabled={aiSuggestions.status === "rejected"}
              >
                {continueLabel}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Stack>
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
  const { submitLabel, submit, isPending } = useFormRuntime();
  const runtime = useRuntimeByKey(runtimeKey);
  if (isHidden(runtime)) return null;
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
    <FieldBlock type="submit">
      <Button
        className={joinClassNames(
          getControlClassName("submit"),
          "flow-action-button",
          "flow-action-button--submit",
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
      className={getBlockClassName("stack")}
      gap={field.gap}
      align={field.align as React.CSSProperties["alignItems"]}
      justify={field.justify as React.CSSProperties["justifyContent"]}
    >
      {field.children.map((child, index) => (
        <FieldRenderer key={index} field={child} path={[...path, index]} />
      ))}
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
      className={getBlockClassName("group")}
      gap={field.gap}
      align={field.align as React.CSSProperties["alignItems"]}
      justify={field.justify as React.CSSProperties["justifyContent"]}
      grow={field.grow}
    >
      {field.children.map((child, index) => (
        <FieldRenderer key={index} field={child} path={[...path, index]} />
      ))}
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
      className={getBlockClassName("grid")}
      cols={field.columns}
      spacing={field.spacing}
      verticalSpacing={field.verticalSpacing}
    >
      {field.children.map((child, index) => (
        <FieldRenderer key={index} field={child} path={[...path, index]} />
      ))}
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
    <FieldBlock type="switch">
      <Switch
        className={getControlClassName("switch")}
        label={field.label}
        description={field.description}
        checked={Boolean(value)}
        error={error}
        disabled={isPending || enabled === false}
        onChange={(event) => setValue(event.currentTarget.checked)}
        onLabel={field.onLabel}
        offLabel={field.offLabel}
        required={required ?? field.required}
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
    <FieldBlock type="number">
      <NumberInput
        className={getControlClassName("number")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
        value={typeof value === "number" ? value : undefined}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        onChange={setValue}
        onBlur={() => validateField(field.name)}
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
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="radio">
      <Radio.Group
        className={getControlClassName("radio")}
        label={field.label}
        description={field.description}
        value={String(value ?? "")}
        error={error}
        required={required ?? field.required}
        onChange={setValue}
      >
        <Stack gap="xs">
          {(field.options || []).map((option) => (
            <Radio
              key={option.value}
              className={getControlClassName("radio-item")}
              value={option.value}
              label={option.label}
              disabled={isPending || enabled === false}
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
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="password">
      <PasswordInput
        className={getControlClassName("password")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        visible={field.visible}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => validateField(field.name)}
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
    <FieldBlock type="pin">
      <PinInput
        className={getControlClassName("pin")}
        length={field.length}
        mask={field.mask}
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
    <FieldBlock type="color">
      <ColorInput
        className={getControlClassName("color")}
        label={field.label}
        description={field.description}
        value={String(value ?? "")}
        error={error}
        disabled={isPending || enabled === false}
        format={field.format}
        withPicker={field.withPicker}
        withEyeDropper={field.withEyeDropper}
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
    <FieldBlock type="file">
      <FileInput
        className={getControlClassName("file")}
        label={field.label}
        description={field.description}
        value={getFileInputValue(value)}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        accept={field.accept}
        multiple={field.multiple}
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
    <FieldBlock type="slider">
      <Slider
        className={getControlClassName("slider")}
        label={field.showLabelOnHover ? "" : undefined}
        min={field.min}
        max={field.max}
        step={field.step}
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
    <FieldBlock type="rangeslider">
      <RangeSlider
        className={getControlClassName("rangeslider")}
        min={field.min}
        max={field.max}
        step={field.step}
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
  if (isHidden(runtime)) return null;
  return (
    <FieldBlock type="tags">
      <TagsInput
        className={getControlClassName("tags")}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        value={Array.isArray(value) ? (value as string[]) : []}
        error={error}
        required={required ?? field.required}
        disabled={isPending || enabled === false}
        onChange={setValue as (value: string[]) => void}
      />
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
    <FieldBlock type="rating">
      <Rating
        className={getControlClassName("rating")}
        count={field.count}
        fractions={field.fractions}
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
    <Fieldset className={getBlockClassName("fieldset")} legend={field.legend}>
      <Stack>
        {field.children.map((child, index) => (
          <FieldRenderer key={index} field={child} path={[...path, index]} />
        ))}
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
  if (isHidden(runtime)) return null;
  return (
    <Stack gap="xs" className={getBlockClassName("collapse")}>
      <UnstyledButton
        className="flow-collapse-toggle"
        type="button"
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
      >
        <Group justify="space-between" wrap="nowrap">
          <Text fw={500} className="flow-collapse-title">
            {field.title || I18n.get("Show more") || "Show more"}
          </Text>
          <Text size="sm" className="flow-collapse-icon">
            {opened ? "-" : "+"}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse in={opened}>
        <Stack>
          {field.children.map((child, index) => (
            <FieldRenderer key={index} field={child} path={[...path, index]} />
          ))}
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
      className={getBlockClassName("divider")}
      label={field.label}
      labelPosition={field.labelPosition}
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
      {field.children.map((child, index) => (
        <FieldRenderer key={index} field={child} path={[...path, index]} />
      ))}
    </VisuallyHidden>
  );
}
