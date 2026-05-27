import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { __ } from "@wordpress/i18n";

export type ModalActionBehavior = "primary" | "secondary" | "dismiss";

export const ACTION_BEHAVIOR_OPTIONS = [
  { label: __("Primary", TEXT_DOMAIN), value: "primary" },
  { label: __("Secondary", TEXT_DOMAIN), value: "secondary" },
  { label: __("Dismiss", TEXT_DOMAIN), value: "dismiss" },
];

const MODAL_ACTION_BEHAVIOR_CLASS_NAMES: Record<
  ModalActionBehavior,
  { triggerClassName: string; roleClassName: string }
> = {
  primary: {
    triggerClassName: "wps-flow-modal-ok",
    roleClassName: "wps-flow-modal-role--primary",
  },
  secondary: {
    triggerClassName: "wps-flow-modal-cancel",
    roleClassName: "wps-flow-modal-role--secondary",
  },
  dismiss: {
    triggerClassName: "wps-flow-modal-close",
    roleClassName: "wps-flow-modal-role--dismiss",
  },
};

export function isActionsSlotClassName(className: string): boolean {
  return className.split(/\s+/).includes("wps-flow-modal-slot--actions");
}

export function getModalActionBehavior(className: string): ModalActionBehavior {
  const classTokens = className.split(/\s+/).filter(Boolean);

  if (classTokens.includes("wps-flow-modal-role--dismiss")) {
    return "dismiss";
  }

  if (classTokens.includes("wps-flow-modal-role--secondary")) {
    return "secondary";
  }

  if (classTokens.includes("wps-flow-modal-role--primary")) {
    return "primary";
  }

  if (classTokens.includes("wps-flow-modal-close")) {
    return "dismiss";
  }

  if (classTokens.includes("wps-flow-modal-cancel")) {
    return "secondary";
  }

  return "primary";
}

export function normalizeModalActionButtonClassName(
  className: string,
  behavior: ModalActionBehavior,
): string {
  const nextTokens = className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        token !== "wps-flow-modal-ok" &&
        token !== "wps-flow-modal-cancel" &&
        token !== "wps-flow-modal-close" &&
        !token.startsWith("wps-flow-modal-role--"),
    );
  const behaviorClasses = MODAL_ACTION_BEHAVIOR_CLASS_NAMES[behavior];

  nextTokens.push(
    behaviorClasses.triggerClassName,
    behaviorClasses.roleClassName,
  );

  return Array.from(new Set(nextTokens)).join(" ").trim();
}

export function getModalActionButtonClassName(input: {
  behavior: ModalActionBehavior;
  actionName?: string;
}): string {
  const behaviorClasses = MODAL_ACTION_BEHAVIOR_CLASS_NAMES[input.behavior];
  const classNames = [
    behaviorClasses.triggerClassName,
    behaviorClasses.roleClassName,
  ];

  if (input.actionName) {
    classNames.push(`wps-flow-action--${input.actionName}`);
  }

  return classNames.join(" ").trim();
}
