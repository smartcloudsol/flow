export type FormStatus =
  | "idle"
  | "validating"
  | "submitting"
  | "saving-draft"
  | "loading-draft"
  | "deleting-draft"
  | "success"
  | "error";

export interface FormActionDefinition {
  actionKey?: string;
  label?: string;
  allowedFromStatuses?: string[];
  targetStatus?: string;
  templateKey?: string;
  eventName?: string;
  wpHookName?: string;
  enabled?: boolean;
}

export interface FormAttributes {
  formId?: string;
  allowDrafts?: boolean;
  showDraftResumePanel?: boolean;
  draftExpiryDays?: number;
  draftAllowDelete?: boolean;
  draftResumeTitle?: string;
  draftResumeDescription?: string;
  draftSaveSuccessMessage?: string;
  formName?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  hideFormOnSuccess?: boolean;
  endpointPath?: string;
  actions?: FormActionDefinition[];
  autoReplyTemplateKey?: string;
  workflowIds?: string[];
  language?: string;
  direction?: string;
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  primaryShade?: { light?: number; dark?: number };
  colors?: Record<string, string>;

  themeOverrides?: string;
  configB64?: string;
  configFormat?: string;
  aiSuggestionsPresetId?: string;
}

export interface FormStateContent {
  html?: string;
}

export type SuccessStateTrigger = "submit-success" | "ai-accepted";

export interface FormStateContents {
  success?: FormStateContent;
  successStates?: Partial<Record<SuccessStateTrigger, FormStateContent>>;
}

export type ConditionalOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterOrEqual"
  | "lessOrEqual"
  | "isEmpty"
  | "isNotEmpty"
  | "isChecked"
  | "isNotChecked"
  | "isAnyOf"
  | "isNoneOf";

export type ConditionalAction =
  | "show"
  | "hide"
  | "enable"
  | "disable"
  | "setRequired"
  | "setOptional"
  | "updateOptions"
  | "setValue"
  | "clearValue";

export interface SelectOption {
  label: string;
  value: string;
}

export type OptionsSource = "static" | "api" | "autocomplete";

export interface ConditionalRuleOptionSource {
  optionsSource?: OptionsSource;
  options?: SelectOption[];
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export interface ConditionalCondition {
  id: string;
  field: string;
  operator: ConditionalOperator;
  value?: unknown;
}

export interface ConditionalRule {
  id: string;
  matchType?: "all" | "any";
  conditions?: ConditionalCondition[];
  when?: {
    field: string;
    operator: ConditionalOperator;
    value?: unknown;
  };
  then: {
    action: ConditionalAction;
    params?: {
      options?: SelectOption[];
      value?: unknown;
      optionsSource?: OptionsSource;
      apiEndpoint?: string;
      apiMethod?: "GET" | "POST";
      apiHeaders?: string;
      apiParams?: string;
      apiResponsePath?: string;
      cacheEnabled?: boolean;
      cacheTTL?: number;
      autocompleteMinChars?: number;
      autocompleteDebounce?: number;
      searchParam?: string;
    };
  };
}

export interface ConditionalLogic {
  enabled?: boolean;
  rules?: ConditionalRule[];
}

export interface ConditionalAttributes {
  hidden?: boolean;
  conditionalLogic?: ConditionalLogic;
}

// Field block attributes (for Gutenberg editor)
export interface TextFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  validationType?:
    | "none"
    | "email"
    | "url"
    | "phone"
    | "numeric"
    | "alphanumeric"
    | "custom";
  validationPattern?: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  anchor?: string; // WordPress anchor attribute
}

export interface TextareaFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
  validationType?:
    | "none"
    | "email"
    | "url"
    | "phone"
    | "numeric"
    | "alphanumeric"
    | "custom";
  validationPattern?: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  anchor?: string;
}

export interface SelectFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  optionsText?: string; // Stored as text in Gutenberg
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
  anchor?: string;
}

export interface CheckboxFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  checkedLabel?: string;
  required?: boolean;
  anchor?: string;
}

export interface DateFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  anchor?: string;
}

export interface SwitchFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  onLabel?: string;
  offLabel?: string;
  anchor?: string;
}

export interface NumberFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimalScale?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  anchor?: string;
}

export interface RadioFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  optionsText?: string;
  anchor?: string;
}

export interface CheckboxGroupFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  optionsText?: string;
  anchor?: string;
}

export interface PasswordFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  visible?: boolean;
  anchor?: string;
}

export interface PinFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  length?: number;
  mask?: boolean;
  inputType?: "number" | "alphanumeric";
  type?: "number" | "alphanumeric";
  anchor?: string;
}

export interface ColorFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  format?: "hex" | "rgb" | "rgba" | "hsl" | "hsla";
  withPicker?: boolean;
  withEyeDropper?: boolean;
  anchor?: string;
}

export interface FileFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  anchor?: string;
}

export interface SliderFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  showLabelOnHover?: boolean;
  anchor?: string;
}

export interface RangeSliderFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  showLabelOnHover?: boolean;
  anchor?: string;
}

export interface TagsFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  maxTags?: number;
  splitChars?: string;
  anchor?: string;
}

export interface RatingFieldAttributes extends ConditionalAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  count?: number;
  fractions?: number;
  anchor?: string;
}

export interface SubmitButtonAttributes extends ConditionalAttributes {
  label?: string;
  showTitle?: boolean;
  showIcon?: boolean;
  iconPosition?: string;
  customIcon?: string;
}

export type ValidationRule =
  | "email"
  | "url"
  | "phone"
  | "numeric"
  | "alphanumeric"
  | { pattern: string; message?: string }
  | { min: number; message?: string }
  | { max: number; message?: string }
  | { minLength: number; message?: string }
  | { maxLength: number; message?: string };

export interface BaseFieldConfig extends ConditionalAttributes {
  id: string;
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  validation?: ValidationRule | ValidationRule[];
  defaultValue?: unknown;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  placeholder?: string;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea";
  placeholder?: string;
  minRows?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  placeholder?: string;

  // Static mode
  options?: SelectOption[];

  // Dynamic mode
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string; // JSON string
  apiParams?: string; // JSON string
  apiResponsePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;

  // Autocomplete mode
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  checkedLabel?: string;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
  placeholder?: string;
}

export interface SwitchFieldConfig extends BaseFieldConfig {
  type: "switch";
  onLabel?: string;
  offLabel?: string;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  decimalScale?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  options?: SelectOption[];
}

export interface CheckboxGroupFieldConfig extends BaseFieldConfig {
  type: "checkbox-group";
  options?: SelectOption[];
}

export interface PasswordFieldConfig extends BaseFieldConfig {
  type: "password";
  placeholder?: string;
  visible?: boolean;
}

export interface PinFieldConfig extends BaseFieldConfig {
  type: "pin";
  length?: number;
  mask?: boolean;
  inputType?: "number" | "alphanumeric";
}

export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color";
  format?: "hex" | "rgb" | "rgba" | "hsl" | "hsla";
  withPicker?: boolean;
  withEyeDropper?: boolean;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
}

export interface SliderFieldConfig extends BaseFieldConfig {
  type: "slider";
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  showLabelOnHover?: boolean;
}

export interface RangeSliderFieldConfig extends BaseFieldConfig {
  type: "rangeslider";
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  showLabelOnHover?: boolean;
}

export interface TagsFieldConfig extends BaseFieldConfig {
  type: "tags";
  placeholder?: string;
  maxTags?: number;
  splitChars?: string;
}

export interface RatingFieldConfig extends BaseFieldConfig {
  type: "rating";
  count?: number;
  fractions?: number;
}

export interface SubmitButtonConfig extends ConditionalAttributes {
  type: "submit";
  label?: string;
  showTitle?: boolean;
  showIcon?: boolean;
  iconPosition?: string;
  customIcon?: string;
}

export interface SaveDraftButtonConfig extends ConditionalAttributes {
  type: "save-draft";
  label?: string;
  successMessage?: string;
  showTitle?: boolean;
  showIcon?: boolean;
  iconPosition?: string;
  customIcon?: string;
}

export interface AiSuggestionCard {
  id: string;
  title: string;
  description?: string;
  possibleAnswer?: string;
  whyThisMayHelp?: string;
  relatedDocumentation?: AiSuggestionReference[];
  nextBestAction?: string;
  confidence?: number;
  citationIds?: string[];
}

export interface AiSuggestionReference {
  title: string;
  url?: string;
}

export interface AiSuggestionsConfig extends ConditionalAttributes {
  type: "ai-suggestions";
  presetId?: string;
  title?: string;
  description?: string;
  mode?: "auto" | "manual";
  buttonLabel?: string;
  acceptLabel?: string;
  continueLabel?: string;
  continueDescription?: string;
  emptyStateText?: string;
  fallbackToRawText?: boolean;
}

export interface FieldsetContainerConfig extends ConditionalAttributes {
  type: "fieldset";
  legend?: string;
  children: FieldConfig[];
}

export interface CollapseContainerConfig extends ConditionalAttributes {
  type: "collapse";
  title?: string;
  defaultOpened?: boolean;
  children: FieldConfig[];
}

export interface DividerConfig extends ConditionalAttributes {
  type: "divider";
  label?: string;
  labelPosition?: "left" | "center" | "right";
  size?: string;
}

export interface VisuallyHiddenConfig extends ConditionalAttributes {
  type: "visuallyhidden";
  children: FieldConfig[];
}

export interface StackContainerConfig extends ConditionalAttributes {
  type: "stack";
  gap?: string;
  align?: string;
  justify?: string;
  children: FieldConfig[];
}

export interface GroupContainerConfig extends ConditionalAttributes {
  type: "group";
  gap?: string;
  align?: string;
  justify?: string;
  grow?: boolean;
  children: FieldConfig[];
}

export interface GridContainerConfig extends ConditionalAttributes {
  type: "grid";
  columns?: number;
  spacing?: string;
  verticalSpacing?: string;
  children: FieldConfig[];
}

export interface WizardStepConfig extends ConditionalAttributes {
  title?: string;
  description?: string;
  children: FieldConfig[];
}

export interface WizardContainerConfig extends ConditionalAttributes {
  type: "wizard";
  title?: string;
  subtitle?: string;
  steps: WizardStepConfig[];
  showProgress?: boolean;
  progressType?: "dots" | "numbers" | "bar";
  allowStepNavigation?: boolean;
  nextButtonLabel?: string;
  prevButtonLabel?: string;
  submitButtonLabel?: string;
  gap?: string;
}

export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | DateFieldConfig
  | SwitchFieldConfig
  | NumberFieldConfig
  | RadioFieldConfig
  | CheckboxGroupFieldConfig
  | PasswordFieldConfig
  | PinFieldConfig
  | ColorFieldConfig
  | FileFieldConfig
  | SliderFieldConfig
  | RangeSliderFieldConfig
  | TagsFieldConfig
  | RatingFieldConfig
  | SubmitButtonConfig
  | SaveDraftButtonConfig
  | AiSuggestionsConfig
  | FieldsetContainerConfig
  | CollapseContainerConfig
  | DividerConfig
  | VisuallyHiddenConfig
  | StackContainerConfig
  | GroupContainerConfig
  | GridContainerConfig
  | WizardContainerConfig;

export interface RuntimeFieldState {
  visible: boolean;
  enabled: boolean;
  required?: boolean;
  setValue?: unknown;
  clearValue?: boolean;
  options?: SelectOption[];
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export type RuntimeFieldStateMap = Record<string, RuntimeFieldState>;
export type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string | undefined>;

export interface AiSuggestionsSubmissionMetadata {
  ran: boolean;
  suggestionCount: number;
  accepted: boolean;
  selectedSuggestionId?: string;
  sourcesUsed: boolean;
  status?: "idle" | "loading" | "done" | "accepted" | "rejected";
  suggestions?: AiSuggestionCard[];
  rawText?: string;
  citations?: unknown;
  metadata?: Record<string, unknown>;
}

export interface FormSubmitRequest {
  accountId?: string;
  siteId?: string;
  formId: string;
  formName?: string;
  values: FormValues;
  metadata?: {
    pageUrl?: string;
    pageTitle?: string;
    userAgent?: string;
    aiSuggestions?: AiSuggestionsSubmissionMetadata;
  };
}

export interface FormSubmitResponse {
  submissionId: string;
  acceptedAt: string;
  status: "accepted" | "rejected" | "submitted";
  message?: string;
}

export interface FormDraftRequest {
  accountId?: string;
  siteId?: string;
  submissionId?: string;
  password?: string;
  formId: string;
  formName?: string;
  values: FormValues;
  metadata?: {
    pageUrl?: string;
    pageTitle?: string;
    userAgent?: string;
    aiSuggestions?: AiSuggestionsSubmissionMetadata;
  };
}

export interface FormDraftResponse {
  ok: boolean;
  submissionId: string;
  status: "draft";
  password?: string;
  updatedAt: string;
  expiresAt?: string;
  message?: string;
  fields: FormValues;
  formVersion?: string;
}

export interface FormDraftLoadRequest {
  submissionId: string;
  password: string;
}

export interface FormDraftLoadResponse {
  ok: boolean;
  submissionId: string;
  status: "draft";
  password?: string;
  updatedAt: string;
  expiresAt?: string;
  message?: string;
  fields: FormValues;
  formVersion?: string;
}

export interface FormDraftDeleteResponse {
  ok: boolean;
  submissionId: string;
  status: "deleted";
}

export interface SubmissionListItem {
  submissionId: string;
  createdAt: string;
  formId: string;
  status: "draft" | "accepted" | "submitted" | "deleted" | "spam" | string;
  summary: string;
}

export interface SubmissionDetail extends SubmissionListItem {
  values: FormValues;
  metadata?: Record<string, unknown>;
}
