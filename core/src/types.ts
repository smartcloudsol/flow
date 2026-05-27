import type { Store } from "./store";

export type ContextKind = "admin" | "frontend";

export type BackendTransport = "gatey" | "fetch";

export type FormFieldDefaults = Record<string, unknown>;

export type FlowHighlightedSubmissionAction = "seen" | "resolved" | "completed";

/* -----------------------------
 * Language settings
 * ----------------------------- */

export type FlowLanguageCode =
  | "ar"
  | "en"
  | "zh"
  | "nl"
  | "fr"
  | "de"
  | "he"
  | "hi"
  | "hu"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "no"
  | "pl"
  | "pt"
  | "ru"
  | "es"
  | "sv"
  | "th"
  | "tr"
  | "uk";

/**
 * FlowSettings - general settings stored in WordPress options.
 * This is what users can configure on the General settings tab.
 */
export interface FlowSettings {
  /** Optional URL to custom translations JSON file. */
  customTranslationsUrl?: string;

  /** Whether to show "Powered by WPSuite Flow" branding in UIs. */
  enablePoweredBy?: boolean;

  /** Whether to enable server-side debug logging for Flow. */
  debugLoggingEnabled?: boolean;

  /** Whether to enable backend sync for form definitions. */
  formsBackendSyncEnabled?: boolean;

  /** Whether to allow permanent deletion of forms (vs archive). */
  formsAllowPermanentDelete?: boolean;

  /** Highlighted quick status actions shown on the submission detail popup. */
  highlightedSubmissionActions?: FlowHighlightedSubmissionAction[];
}

export interface FlowFeatures {
  readonly store: Promise<Store>;
}

export interface FlowModalOptions {
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  closeOnCancel?: boolean;
  closeOnOk?: boolean;
  closeOnFlowSubmitSuccess?: boolean;
  restoreFocusOnClose?: boolean;
  preventBackgroundScroll?: boolean;
  dispatchLifecycleEvents?: boolean;
  defaultPrimaryAction?: string;
  defaultSecondaryAction?: string;
  defaultDismissAction?: string;
  busyText?: string;
  errorText?: string;
}

export interface FlowModalOpenOptions {
  triggerElement?: HTMLElement;
}

export interface FlowModalActionContext {
  modalId: string;
  modalElement: HTMLDialogElement;
  triggerElement?: HTMLElement;
  actionName: string;
  originalEvent?: Event;
  close: (returnValue?: string) => void;
  open: () => void;
}

export type FlowModalActionHandler = (
  context: FlowModalActionContext,
) => void | boolean | Promise<void | boolean>;

export interface FlowModalApi {
  register(modal: HTMLDialogElement, options?: Partial<FlowModalOptions>): void;

  unregister(modalOrId: HTMLDialogElement | string): void;

  open(modalId: string, options?: FlowModalOpenOptions): boolean;

  close(modalId: string, returnValue?: string): boolean;

  toggle(modalId: string, options?: FlowModalOpenOptions): boolean;

  closeAll(returnValue?: string): number;

  isOpen(modalId: string): boolean;

  get(modalId: string): HTMLDialogElement | null;

  registerAction(actionName: string, handler: FlowModalActionHandler): void;

  unregisterAction(actionName: string): void;
}

export interface FlowFormFieldDefaultsApi {
  setFormFieldDefaultValue(
    formId: string,
    fieldName: string,
    value: unknown,
  ): Promise<void>;

  setFormFieldDefaultValues(
    formId: string,
    values: FormFieldDefaults,
  ): Promise<void>;

  clearFormFieldDefaultValues(formId: string): Promise<void>;

  getFormFieldDefaultValue(formId: string, fieldName: string): Promise<unknown>;

  getFormFieldDefaultValues(formId: string): Promise<FormFieldDefaults>;
}

/**
 * FlowPlugin - the main plugin object exposed at WpSuite.plugins.flow.
 * Note: accountId, siteId, siteKey are in WpSuite.siteSettings, not here.
 */
export interface Flow extends FlowFormFieldDefaultsApi {
  features: FlowFeatures;
  modals: FlowModalApi;
  settings: FlowSettings;
  nonce: string;
  baseUrl: string;
  restUrl: string;
}

/**
 * CapabilityDecision - result of backend capability resolution.
 */
export interface CapabilityDecision {
  backendAvailable: boolean;
  backendTransport?: BackendTransport;
  backendApiName?: string;
  backendBaseUrl?: string;
  backendReason?: string;

  reason: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  description?: string;
  confidence?: number;
  citationIds?: string[];
  raw?: Record<string, unknown>;
}

export interface AiSuggestionsState {
  status: "idle" | "loading" | "done" | "accepted" | "rejected";
  suggestions: AiSuggestion[];
  selectedSuggestionId?: string;
  rawText?: string;
  metadata?: Record<string, unknown>;
  citations?: unknown;
}

export interface BackendCallOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  onStatus?: (event: FlowStatusEvent) => void;
}

export type FlowStatusStep =
  | "decide"
  | "backend:request"
  | "backend:waiting"
  | "backend:response"
  | "done"
  | "error";

export interface FlowStatusEvent {
  context: ContextKind;
  step: FlowStatusStep;
  message?: string;
  silent?: boolean; // whether this event should be ignored for user-facing status updates
}

export class BackendError extends Error {
  constructor(
    message: string,
    public readonly decision?: unknown,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export interface Capabilities {
  decideCapability: () => Promise<CapabilityDecision>;

  resolveBackend: () => Promise<{
    available: boolean;
    transport?: BackendTransport;
    apiName?: string;
    baseUrl?: string;
    reason?: string;
  }>;
}

export interface Backend<TResponse> {
  dispatchBackend: (
    decision: CapabilityDecision,
    context: ContextKind,
    customPath: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    requestBody: unknown,
    options: BackendCallOptions,
  ) => Promise<TResponse>;
}
