import type {
  FlowModalActionHandler,
  FlowModalApi,
  FlowModalOpenOptions,
  FlowModalOptions,
} from "./types";

function reportUnavailable(methodName: string, modalId?: string): void {
  if (typeof console === "undefined") {
    return;
  }

  const suffix = modalId ? ` for "${modalId}"` : "";
  console.warn(
    `[Flow] Modal API method ${methodName}${suffix} was called before the frontend modal runtime was registered.`,
  );
}

export function createFlowModalApiStub(): FlowModalApi {
  return {
    register(modal: HTMLDialogElement, options?: Partial<FlowModalOptions>) {
      void modal;
      void options;
      // The blocks runtime replaces this stub with the concrete implementation.
    },
    unregister(modalOrId: HTMLDialogElement | string) {
      void modalOrId;
      // The blocks runtime replaces this stub with the concrete implementation.
    },
    open(modalId: string, options?: FlowModalOpenOptions) {
      void options;
      reportUnavailable("open", modalId);
      return false;
    },
    close(modalId: string, returnValue?: string) {
      void returnValue;
      reportUnavailable("close", modalId);
      return false;
    },
    toggle(modalId: string, options?: FlowModalOpenOptions) {
      void options;
      reportUnavailable("toggle", modalId);
      return false;
    },
    closeAll(returnValue?: string) {
      void returnValue;
      reportUnavailable("closeAll");
      return 0;
    },
    isOpen(modalId: string) {
      reportUnavailable("isOpen", modalId);
      return false;
    },
    get(modalId: string) {
      reportUnavailable("get", modalId);
      return null;
    },
    registerAction(actionName: string, handler: FlowModalActionHandler) {
      void actionName;
      void handler;
      // The blocks runtime replaces this stub with the concrete implementation.
    },
    unregisterAction(actionName: string) {
      void actionName;
      // The blocks runtime replaces this stub with the concrete implementation.
    },
  };
}
