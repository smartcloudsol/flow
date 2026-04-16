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
  classNames?: string[];
  fieldOverrides?: Record<string, Record<string, unknown>>;
  configB64?: string;
  configFormat?: string;
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

export type FlowControlSize = "xs" | "sm" | "md" | "lg" | "xl" | (string & {});
export type FlowClampBehavior = "none" | "blur" | "strict";
export type FlowThousandsGroupStyle = "none" | "thousand" | "lakh" | "wan";
export type FlowInputMode =
  | "search"
  | "text"
  | "none"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal";
export type FlowLoaderPosition = "left" | "right";
export type FlowCheckboxIcon = "check" | "x" | "minus" | (string & {});
export type FlowRadioIcon = "dot" | "check" | "x" | (string & {});
export type FlowSwitchThumbIcon =
  | "check"
  | "x"
  | "star"
  | "heart"
  | "thumb-up"
  | "sun"
  | "moon"
  | (string & {});
export type FlowIconName =
  | FlowCheckboxIcon
  | FlowRadioIcon
  | FlowSwitchThumbIcon;
export type FlowRatingSymbol =
  | "star"
  | "heart"
  | "check"
  | "dot"
  | "smile"
  | (string & {});
export type FlowRatingSymbolName = FlowRatingSymbol;

export interface FlowSliderMark {
  value: number;
  label?: string;
}

export interface CommonFieldAppearanceAttributes {
  disabled?: boolean;
  size?: FlowControlSize;
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
  apiLabelPath?: string;
  apiValuePath?: string;
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
      apiLabelPath?: string;
      apiValuePath?: string;
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
export interface TextFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  inputSize?: FlowControlSize;
  pointer?: boolean;
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

export interface TextareaFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  autosize?: boolean;
  inputSize?: FlowControlSize;
  required?: boolean;
  minRows?: number;
  maxRows?: number;
  pointer?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
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

export interface SelectFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  allowDeselect?: boolean;
  autoSelectOnBlur?: boolean;
  chevronColor?: string;
  clearable?: boolean;
  defaultDropdownOpened?: boolean;
  inputSize?: FlowControlSize;
  limit?: number;
  multiple?: boolean;
  pointer?: boolean;
  required?: boolean;
  searchable?: boolean;
  selectFirstOptionOnChange?: boolean;
  withAlignedLabels?: boolean;
  withCheckIcon?: boolean;
  withScrollArea?: boolean;
  optionsText?: string; // Stored as text in Gutenberg
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
  anchor?: string;
}

export interface CheckboxFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  autoContrast?: boolean;
  checkedLabel?: string;
  color?: string;
  icon?: FlowCheckboxIcon;
  iconColor?: string;
  required?: boolean;
  anchor?: string;
}

export interface DateFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  inputSize?: FlowControlSize;
  required?: boolean;
  anchor?: string;
}

export interface SwitchFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  color?: string;
  labelPosition?: "left" | "right";
  required?: boolean;
  onLabel?: string;
  offLabel?: string;
  thumbIcon?: FlowSwitchThumbIcon;
  withThumbIndicator?: boolean;
  anchor?: string;
}

export interface NumberFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  allowedDecimalSeparators?: string[];
  allowLeadingZeros?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  clampBehavior?: FlowClampBehavior;
  decimalScale?: number;
  decimalSeparator?: string;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  fixedDecimalScale?: boolean;
  hideControls?: boolean;
  inputSize?: FlowControlSize;
  prefix?: string;
  startValue?: number;
  suffix?: string;
  thousandSeparator?: string;
  thousandsGroupStyle?: FlowThousandsGroupStyle;
  anchor?: string;
}

export interface RadioFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  autoContrast?: boolean;
  color?: string;
  icon?: FlowRadioIcon;
  iconColor?: string;
  required?: boolean;
  optionsText?: string;
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
  anchor?: string;
}

export interface CheckboxGroupFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  optionsText?: string;
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
  anchor?: string;
}

export interface PasswordFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  defaultVisible?: boolean;
  inputSize?: FlowControlSize;
  loading?: boolean;
  loadingPosition?: FlowLoaderPosition;
  required?: boolean;
  visible?: boolean;
  anchor?: string;
}

export interface PinFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  gap?: FlowControlSize;
  inputMode?: FlowInputMode;
  required?: boolean;
  length?: number;
  mask?: boolean;
  placeholder?: string;
  inputType?: "number" | "alphanumeric";
  type?: "number" | "alphanumeric";
  anchor?: string;
}

export interface ColorFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  closeOnColorSwatchClick?: boolean;
  disallowInput?: boolean;
  required?: boolean;
  format?: "hex" | "rgb" | "rgba" | "hsl" | "hsla";
  pointer?: boolean;
  swatches?: string[];
  swatchesPerRow?: number;
  withPicker?: boolean;
  withEyeDropper?: boolean;
  withPreview?: boolean;
  anchor?: string;
}

export interface FileFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  accept?: string;
  capture?: string;
  clearable?: boolean;
  inputSize?: FlowControlSize;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  anchor?: string;
}

export interface SliderFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  color?: string;
  domain?: [number, number];
  inverted?: boolean;
  labelAlwaysOn?: boolean;
  marksData?: FlowSliderMark[];
  marks?: FlowSliderMark[];
  marksEnabled?: boolean;
  precision?: number;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  restrictToMarks?: boolean;
  showLabelOnHover?: boolean;
  thumbSize?: number;
  anchor?: string;
}

export interface RangeSliderFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  color?: string;
  domain?: [number, number];
  inverted?: boolean;
  labelAlwaysOn?: boolean;
  marksData?: FlowSliderMark[];
  marks?: FlowSliderMark[];
  marksEnabled?: boolean;
  maxRange?: number;
  required?: boolean;
  min?: number;
  minRange?: number;
  max?: number;
  precision?: number;
  pushOnOverlap?: boolean;
  step?: number;
  restrictToMarks?: boolean;
  showLabelOnHover?: boolean;
  thumbSize?: number;
  anchor?: string;
}

export interface TagsFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  acceptValueOnBlur?: boolean;
  allowDuplicates?: boolean;
  inputSize?: FlowControlSize;
  limit?: number;
  loading?: boolean;
  loadingPosition?: FlowLoaderPosition;
  maxDropdownHeight?: number;
  required?: boolean;
  maxTags?: number;
  optionsText?: string;
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  pointer?: boolean;
  splitChars?: string;
  searchParam?: string;
  withScrollArea?: boolean;
  anchor?: string;
}

export interface RatingFieldAttributes
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  name?: string;
  label?: string;
  description?: string;
  color?: string;
  required?: boolean;
  count?: number;
  emptySymbol?: FlowRatingSymbol;
  fractions?: number;
  fullSymbol?: FlowRatingSymbol;
  highlightSelectedOnly?: boolean;
  anchor?: string;
}

export interface HiddenFieldAttributes extends ConditionalAttributes {
  name?: string;
  defaultValue?: string;
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

export interface BaseFieldConfig
  extends ConditionalAttributes,
    CommonFieldAppearanceAttributes {
  id: string;
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  validation?: ValidationRule | ValidationRule[];
  defaultValue?: unknown;
  classNames?: string[];
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  placeholder?: string;
  inputSize?: FlowControlSize;
  pointer?: boolean;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea";
  autosize?: boolean;
  inputSize?: FlowControlSize;
  maxRows?: number;
  placeholder?: string;
  minRows?: number;
  pointer?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  allowDeselect?: boolean;
  autoSelectOnBlur?: boolean;
  chevronColor?: string;
  clearable?: boolean;
  defaultDropdownOpened?: boolean;
  inputSize?: FlowControlSize;
  limit?: number;
  multiple?: boolean;
  pointer?: boolean;
  placeholder?: string;
  searchable?: boolean;
  selectFirstOptionOnChange?: boolean;
  withAlignedLabels?: boolean;
  withCheckIcon?: boolean;
  withScrollArea?: boolean;

  // Static mode
  options?: SelectOption[];

  // Dynamic mode
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string; // JSON string
  apiParams?: string; // JSON string
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;

  // Autocomplete mode
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  autoContrast?: boolean;
  checkedLabel?: string;
  color?: string;
  icon?: FlowCheckboxIcon;
  iconColor?: string;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
  inputSize?: FlowControlSize;
  placeholder?: string;
}

export interface SwitchFieldConfig extends BaseFieldConfig {
  type: "switch";
  color?: string;
  labelPosition?: "left" | "right";
  onLabel?: string;
  offLabel?: string;
  thumbIcon?: FlowSwitchThumbIcon;
  withThumbIndicator?: boolean;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  allowedDecimalSeparators?: string[];
  allowLeadingZeros?: boolean;
  clampBehavior?: FlowClampBehavior;
  decimalSeparator?: string;
  placeholder?: string;
  fixedDecimalScale?: boolean;
  hideControls?: boolean;
  inputSize?: FlowControlSize;
  min?: number;
  max?: number;
  prefix?: string;
  startValue?: number;
  step?: number;
  suffix?: string;
  thousandSeparator?: string;
  thousandsGroupStyle?: FlowThousandsGroupStyle;
  decimalScale?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  autoContrast?: boolean;
  color?: string;
  icon?: FlowRadioIcon;
  iconColor?: string;
  options?: SelectOption[];
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export interface CheckboxGroupFieldConfig extends BaseFieldConfig {
  type: "checkbox-group";
  options?: SelectOption[];
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  searchParam?: string;
}

export interface PasswordFieldConfig extends BaseFieldConfig {
  type: "password";
  defaultVisible?: boolean;
  inputSize?: FlowControlSize;
  loading?: boolean;
  loadingPosition?: FlowLoaderPosition;
  placeholder?: string;
  visible?: boolean;
}

export interface PinFieldConfig extends BaseFieldConfig {
  type: "pin";
  gap?: FlowControlSize;
  inputMode?: FlowInputMode;
  length?: number;
  mask?: boolean;
  inputType?: "number" | "alphanumeric";
  placeholder?: string;
}

export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color";
  closeOnColorSwatchClick?: boolean;
  disallowInput?: boolean;
  format?: "hex" | "rgb" | "rgba" | "hsl" | "hsla";
  pointer?: boolean;
  swatches?: string[];
  swatchesPerRow?: number;
  withPicker?: boolean;
  withEyeDropper?: boolean;
  withPreview?: boolean;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  accept?: string;
  capture?: string;
  clearable?: boolean;
  inputSize?: FlowControlSize;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
}

export interface SliderFieldConfig extends BaseFieldConfig {
  type: "slider";
  color?: string;
  domain?: [number, number];
  inverted?: boolean;
  labelAlwaysOn?: boolean;
  marks?: FlowSliderMark[];
  min?: number;
  max?: number;
  precision?: number;
  restrictToMarks?: boolean;
  step?: number;
  showLabelOnHover?: boolean;
  thumbSize?: number;
}

export interface RangeSliderFieldConfig extends BaseFieldConfig {
  type: "rangeslider";
  color?: string;
  domain?: [number, number];
  inverted?: boolean;
  labelAlwaysOn?: boolean;
  marks?: FlowSliderMark[];
  maxRange?: number;
  min?: number;
  minRange?: number;
  max?: number;
  precision?: number;
  pushOnOverlap?: boolean;
  restrictToMarks?: boolean;
  step?: number;
  showLabelOnHover?: boolean;
  thumbSize?: number;
}

export interface TagsFieldConfig extends BaseFieldConfig {
  type: "tags";
  acceptValueOnBlur?: boolean;
  allowDuplicates?: boolean;
  inputSize?: FlowControlSize;
  limit?: number;
  loading?: boolean;
  loadingPosition?: FlowLoaderPosition;
  maxDropdownHeight?: number;
  options?: SelectOption[];
  optionsSource?: OptionsSource;
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: string;
  apiParams?: string;
  apiResponsePath?: string;
  apiLabelPath?: string;
  apiValuePath?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  autocompleteMinChars?: number;
  autocompleteDebounce?: number;
  placeholder?: string;
  maxTags?: number;
  pointer?: boolean;
  splitChars?: string;
  searchParam?: string;
  withScrollArea?: boolean;
}

export interface RatingFieldConfig extends BaseFieldConfig {
  type: "rating";
  color?: string;
  count?: number;
  emptySymbol?: FlowRatingSymbol;
  fractions?: number;
  fullSymbol?: FlowRatingSymbol;
  highlightSelectedOnly?: boolean;
}

export interface HiddenFieldConfig extends ConditionalAttributes {
  type: "hidden";
  name: string;
  defaultValue?: string;
  classNames?: string[];
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
  promptOverride?: string;
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
  animateOpacity?: boolean;
  expanded?: boolean;
  title?: string;
  defaultOpened?: boolean;
  children: FieldConfig[];
}

export interface DividerConfig extends ConditionalAttributes {
  type: "divider";
  label?: string;
  labelPosition?: "left" | "center" | "right";
  orientation?: "horizontal" | "vertical";
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
  preventGrowOverflow?: boolean;
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  children: FieldConfig[];
}

export interface GridContainerConfig extends ConditionalAttributes {
  type: "grid";
  columns?: number;
  gutter?: string;
  justify?: string;
  overflow?: string;
  rows?: number;
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
  | HiddenFieldConfig
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
  apiLabelPath?: string;
  apiValuePath?: string;
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
  context?: {
    pageUrl?: string;
    pageTitle?: string;
    baseUrl?: string;
    locale?: string;
  };
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
  context?: {
    pageUrl?: string;
    pageTitle?: string;
    baseUrl?: string;
    locale?: string;
  };
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
