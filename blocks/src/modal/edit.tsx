import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { createBlock, type Block } from "@wordpress/blocks";
import {
  BlockControls,
  InnerBlocks,
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  MenuGroup,
  MenuItem,
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
  ToolbarDropdownMenu,
  ToolbarGroup,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useCallback, useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { plus } from "@wordpress/icons";
import {
  getModalActionButtonClassName,
  isActionsSlotClassName,
  type ModalActionBehavior,
} from "./action-behavior";

type FlowModalAttributes = {
  modalId?: string;
  ariaLabel?: string;
  labelledById?: string;
  openOnHash?: boolean;
  hashValue?: string;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  closeOnCancel?: boolean;
  closeOnOk?: boolean;
  closeOnFlowSubmitSuccess?: boolean;
  restoreFocusOnClose?: boolean;
  preventBackgroundScroll?: boolean;
  dispatchLifecycleEvents?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  size?: string;
  position?: string;
  mobileBehavior?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  maxHeight?: string;
  panelPadding?: string;
  panelRadius?: string;
  panelShadow?: string;
  backdropStyle?: string;
  animation?: string;
  defaultPrimaryAction?: string;
  defaultSecondaryAction?: string;
  defaultDismissAction?: string;
  defaultOkAction?: string;
  defaultCancelAction?: string;
  busyText?: string;
  errorText?: string;
};

type FlowBlockInstance = Block<Record<string, unknown>>;

type ModalActionTemplateButton = {
  label: string;
  behavior: ModalActionBehavior;
  actionName?: string;
};

type ModalActionsTemplateDefinition = {
  value: string;
  label: string;
  buttons: ModalActionTemplateButton[];
};

type ModalSlotType = "header" | "body" | "actions";

const SIZE_OPTIONS = [
  { label: __("Extra small", TEXT_DOMAIN), value: "xs" },
  { label: __("Small", TEXT_DOMAIN), value: "sm" },
  { label: __("Medium", TEXT_DOMAIN), value: "md" },
  { label: __("Large", TEXT_DOMAIN), value: "lg" },
  { label: __("Extra large", TEXT_DOMAIN), value: "xl" },
  { label: __("Wide", TEXT_DOMAIN), value: "wide" },
  { label: __("Fullscreen", TEXT_DOMAIN), value: "fullscreen" },
  { label: __("Custom", TEXT_DOMAIN), value: "custom" },
];

const POSITION_OPTIONS = [
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Top", TEXT_DOMAIN), value: "top" },
  { label: __("Bottom", TEXT_DOMAIN), value: "bottom" },
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
  { label: __("Top left", TEXT_DOMAIN), value: "top-left" },
  { label: __("Top right", TEXT_DOMAIN), value: "top-right" },
  { label: __("Bottom left", TEXT_DOMAIN), value: "bottom-left" },
  { label: __("Bottom right", TEXT_DOMAIN), value: "bottom-right" },
];

const MOBILE_BEHAVIOR_OPTIONS = [
  { label: __("Normal", TEXT_DOMAIN), value: "normal" },
  { label: __("Fullscreen", TEXT_DOMAIN), value: "fullscreen" },
  { label: __("Bottom sheet", TEXT_DOMAIN), value: "bottom-sheet" },
];

const BACKDROP_STYLE_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "default" },
  { label: __("Blurred", TEXT_DOMAIN), value: "blurred" },
  { label: __("Dark", TEXT_DOMAIN), value: "dark" },
  { label: __("Light", TEXT_DOMAIN), value: "light" },
  { label: __("Transparent", TEXT_DOMAIN), value: "transparent" },
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("Custom", TEXT_DOMAIN), value: "custom" },
];

const ANIMATION_OPTIONS = [
  { label: __("Fade", TEXT_DOMAIN), value: "fade" },
  { label: __("Scale", TEXT_DOMAIN), value: "scale" },
  { label: __("Slide up", TEXT_DOMAIN), value: "slide-up" },
  { label: __("Slide down", TEXT_DOMAIN), value: "slide-down" },
  { label: __("None", TEXT_DOMAIN), value: "none" },
];

type ModalTemplateItem = [
  string,
  Record<string, unknown>?,
  ModalTemplateItem[]?,
];

const MODAL_SLOT_CLASS_NAMES: Record<ModalSlotType, string> = {
  header: "wps-flow-modal-slot--header",
  body: "wps-flow-modal-slot--body",
  actions: "wps-flow-modal-slot--actions",
};

const MODAL_SLOT_ORDER: ModalSlotType[] = ["header", "body", "actions"];

const MODAL_ACTION_TEMPLATES: ModalActionsTemplateDefinition[] = [
  {
    value: "ok-cancel",
    label: __("OK / Cancel", TEXT_DOMAIN),
    buttons: [
      { label: __("Cancel", TEXT_DOMAIN), behavior: "secondary" },
      { label: __("OK", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "yes-no",
    label: __("Yes / No", TEXT_DOMAIN),
    buttons: [
      { label: __("No", TEXT_DOMAIN), behavior: "secondary" },
      { label: __("Yes", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "yes-no-cancel",
    label: __("Yes / No / Cancel", TEXT_DOMAIN),
    buttons: [
      { label: __("Cancel", TEXT_DOMAIN), behavior: "dismiss" },
      { label: __("No", TEXT_DOMAIN), behavior: "secondary" },
      { label: __("Yes", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "approve-reject",
    label: __("Approve / Reject", TEXT_DOMAIN),
    buttons: [
      { label: __("Reject", TEXT_DOMAIN), behavior: "secondary" },
      { label: __("Approve", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "continue-back",
    label: __("Continue / Back", TEXT_DOMAIN),
    buttons: [
      { label: __("Back", TEXT_DOMAIN), behavior: "secondary" },
      { label: __("Continue", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "save-close",
    label: __("Save / Close", TEXT_DOMAIN),
    buttons: [
      { label: __("Close", TEXT_DOMAIN), behavior: "dismiss" },
      { label: __("Save", TEXT_DOMAIN), behavior: "primary" },
    ],
  },
  {
    value: "single-ok",
    label: __("Single OK", TEXT_DOMAIN),
    buttons: [{ label: __("OK", TEXT_DOMAIN), behavior: "primary" }],
  },
  {
    value: "single-close",
    label: __("Single Close", TEXT_DOMAIN),
    buttons: [{ label: __("Close", TEXT_DOMAIN), behavior: "dismiss" }],
  },
];

const DEFAULT_MODAL_ACTION_TEMPLATE = MODAL_ACTION_TEMPLATES[0];

function hasClassToken(className: string, classToken: string): boolean {
  return className.split(/\s+/).includes(classToken);
}

function createModalSlotTemplateItem(
  slotType: ModalSlotType,
  innerBlocks: ModalTemplateItem[],
): ModalTemplateItem {
  return [
    "core/group",
    {
      className: `wps-flow-modal-slot ${MODAL_SLOT_CLASS_NAMES[slotType]}`,
      layout: { type: "constrained" },
    },
    innerBlocks,
  ];
}

function createModalSlotBlock(
  slotType: ModalSlotType,
  innerBlocks: FlowBlockInstance[],
): FlowBlockInstance {
  return createBlock(
    "core/group",
    {
      className: `wps-flow-modal-slot ${MODAL_SLOT_CLASS_NAMES[slotType]}`,
      layout: { type: "constrained" },
    },
    innerBlocks,
  ) as unknown as FlowBlockInstance;
}

function createModalHeaderSlotTemplateItem(): ModalTemplateItem {
  return createModalSlotTemplateItem("header", [
    [
      "core/heading",
      {
        level: 2,
        textAlign: "center",
        content: __("Modal title", TEXT_DOMAIN),
      },
    ],
  ]);
}

function createModalBodySlotTemplateItem(): ModalTemplateItem {
  return createModalSlotTemplateItem("body", [
    [
      "core/paragraph",
      {
        content: __("Add modal content here.", TEXT_DOMAIN),
      },
    ],
  ]);
}

function createModalActionButtonsTemplateItem(
  template: ModalActionsTemplateDefinition,
): ModalTemplateItem {
  return [
    "core/buttons",
    {
      layout: { type: "flex", justifyContent: "right", flexWrap: "wrap" },
    },
    template.buttons.map((button) => [
      "core/button",
      {
        text: button.label,
        className: getModalActionButtonClassName(button),
      },
    ]),
  ];
}

function createModalActionsSlotTemplateItem(
  template: ModalActionsTemplateDefinition,
): ModalTemplateItem {
  return createModalSlotTemplateItem("actions", [
    createModalActionButtonsTemplateItem(template),
  ]);
}

function createModalHeaderBlock(): FlowBlockInstance {
  return createBlock("core/heading", {
    level: 2,
    textAlign: "center",
    content: __("Modal title", TEXT_DOMAIN),
  }) as unknown as FlowBlockInstance;
}

function createModalBodyBlock(): FlowBlockInstance {
  return createBlock("core/paragraph", {
    content: __("Add modal content here.", TEXT_DOMAIN),
  }) as unknown as FlowBlockInstance;
}

function createModalHeaderSlotBlock(): FlowBlockInstance {
  return createModalSlotBlock("header", [createModalHeaderBlock()]);
}

function createModalBodySlotBlock(): FlowBlockInstance {
  return createModalSlotBlock("body", [createModalBodyBlock()]);
}

function createModalActionButtonBlock(
  button: ModalActionTemplateButton,
): FlowBlockInstance {
  return createBlock("core/button", {
    text: button.label,
    wpsFlowModalBehavior: button.behavior,
    className: getModalActionButtonClassName(button),
  }) as unknown as FlowBlockInstance;
}

function createModalActionsButtonsBlock(
  template: ModalActionsTemplateDefinition,
): FlowBlockInstance {
  return createBlock(
    "core/buttons",
    {
      layout: { type: "flex", justifyContent: "right", flexWrap: "wrap" },
    },
    template.buttons.map(createModalActionButtonBlock),
  ) as unknown as FlowBlockInstance;
}

function createModalActionsSlotBlock(
  template: ModalActionsTemplateDefinition,
): FlowBlockInstance {
  return createModalSlotBlock("actions", [
    createModalActionsButtonsBlock(template),
  ]);
}

function getModalSlotType(block: FlowBlockInstance): ModalSlotType | null {
  const className =
    typeof block.attributes.className === "string"
      ? block.attributes.className
      : "";

  if (hasClassToken(className, MODAL_SLOT_CLASS_NAMES.header)) {
    return "header";
  }

  if (hasClassToken(className, MODAL_SLOT_CLASS_NAMES.body)) {
    return "body";
  }

  if (isActionsSlotClassName(className)) {
    return "actions";
  }

  return null;
}

function isHeaderSlotBlock(block: FlowBlockInstance): boolean {
  return getModalSlotType(block) === "header";
}

function isBodySlotBlock(block: FlowBlockInstance): boolean {
  return getModalSlotType(block) === "body";
}

function getModalSlotInsertIndex(
  blocks: FlowBlockInstance[],
  slotType: ModalSlotType,
): number {
  const slotOrder = MODAL_SLOT_ORDER.indexOf(slotType);
  const nextSlotIndex = blocks.findIndex((block) => {
    const existingSlotType = getModalSlotType(block);

    return (
      existingSlotType !== null &&
      MODAL_SLOT_ORDER.indexOf(existingSlotType) > slotOrder
    );
  });

  return nextSlotIndex === -1 ? blocks.length : nextSlotIndex;
}

const DEFAULT_MODAL_TEMPLATE: ModalTemplateItem[] = [
  createModalHeaderSlotTemplateItem(),
  createModalBodySlotTemplateItem(),
  createModalActionsSlotTemplateItem(DEFAULT_MODAL_ACTION_TEMPLATE),
];

function createDefaultModalId(clientId: string): string {
  return `flow-modal-${clientId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toLowerCase()}`;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: FlowModalAttributes;
  setAttributes: (next: Partial<FlowModalAttributes>) => void;
  clientId: string;
}) {
  const { replaceInnerBlocks } = useDispatch(blockEditorStore) as unknown as {
    replaceInnerBlocks: (
      rootClientId: string,
      blocks: FlowBlockInstance[],
      updateSelection?: boolean,
    ) => void;
  };
  const innerBlocks = useSelect(
    (select) => {
      const { getBlocks } = select(blockEditorStore) as unknown as {
        getBlocks: (id: string) => FlowBlockInstance[];
      };

      return getBlocks(clientId);
    },
    [clientId],
  );

  useEffect(() => {
    if (attributes.modalId?.trim()) {
      return;
    }

    setAttributes({ modalId: createDefaultModalId(clientId) });
  }, [attributes.modalId, clientId, setAttributes]);

  const replaceOrInsertSlot = useCallback(
    ({
      slotType,
      createSlotBlock,
      createReplacementBlocks,
      replaceConfirmation,
    }: {
      slotType: ModalSlotType;
      createSlotBlock: () => FlowBlockInstance;
      createReplacementBlocks: () => FlowBlockInstance[];
      replaceConfirmation: string;
    }) => {
      const existingSlot = innerBlocks.find(
        (block) => getModalSlotType(block) === slotType,
      );

      if (existingSlot) {
        if (existingSlot.innerBlocks.length > 0) {
          const confirmed = window.confirm(replaceConfirmation);

          if (!confirmed) {
            return;
          }
        }

        replaceInnerBlocks(
          existingSlot.clientId,
          createReplacementBlocks(),
          true,
        );
        return;
      }

      const nextBlocks = [...innerBlocks];

      nextBlocks.splice(
        getModalSlotInsertIndex(innerBlocks, slotType),
        0,
        createSlotBlock(),
      );

      replaceInnerBlocks(clientId, nextBlocks, true);
    },
    [clientId, innerBlocks, replaceInnerBlocks],
  );

  const applyHeaderTemplate = useCallback(() => {
    replaceOrInsertSlot({
      slotType: "header",
      createSlotBlock: createModalHeaderSlotBlock,
      createReplacementBlocks: () => [createModalHeaderBlock()],
      replaceConfirmation: __(
        "This will replace the current modal header with the default header. Continue?",
        TEXT_DOMAIN,
      ),
    });
  }, [replaceOrInsertSlot]);

  const applyBodyTemplate = useCallback(() => {
    replaceOrInsertSlot({
      slotType: "body",
      createSlotBlock: createModalBodySlotBlock,
      createReplacementBlocks: () => [createModalBodyBlock()],
      replaceConfirmation: __(
        "This will replace the current modal body with the default body. Continue?",
        TEXT_DOMAIN,
      ),
    });
  }, [replaceOrInsertSlot]);

  const applyActionTemplate = useCallback(
    (templateValue: string) => {
      const template = MODAL_ACTION_TEMPLATES.find(
        (item) => item.value === templateValue,
      );
      if (!template) {
        return;
      }

      replaceOrInsertSlot({
        slotType: "actions",
        createSlotBlock: () => createModalActionsSlotBlock(template),
        createReplacementBlocks: () => [
          createModalActionsButtonsBlock(template),
        ],
        replaceConfirmation: __(
          "This will replace the current modal action buttons with the selected template. Continue?",
          TEXT_DOMAIN,
        ),
      });
    },
    [replaceOrInsertSlot],
  );

  const hasHeaderSlot = innerBlocks.some(isHeaderSlotBlock);
  const hasBodySlot = innerBlocks.some(isBodySlotBlock);

  const blockProps = useBlockProps({
    className: "smartcloud-flow-modal-editor",
    style: {
      border: "1px solid #d1d5db",
      borderRadius: "12px",
      backgroundColor: "#ffffff",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      overflow: "hidden",
    },
  });

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarDropdownMenu
            icon={plus}
            label={__("Modal sections", TEXT_DOMAIN)}
          >
            {({ onClose }) => (
              <>
                <MenuGroup label={__("Header", TEXT_DOMAIN)}>
                  <MenuItem
                    onClick={() => {
                      applyHeaderTemplate();
                      onClose();
                    }}
                  >
                    {hasHeaderSlot
                      ? __("Replace with default header", TEXT_DOMAIN)
                      : __("Insert default header", TEXT_DOMAIN)}
                  </MenuItem>
                </MenuGroup>
                <MenuGroup label={__("Body", TEXT_DOMAIN)}>
                  <MenuItem
                    onClick={() => {
                      applyBodyTemplate();
                      onClose();
                    }}
                  >
                    {hasBodySlot
                      ? __("Replace with default body", TEXT_DOMAIN)
                      : __("Insert default body", TEXT_DOMAIN)}
                  </MenuItem>
                </MenuGroup>
                <MenuGroup label={__("Actions", TEXT_DOMAIN)}>
                  {MODAL_ACTION_TEMPLATES.map((template) => (
                    <MenuItem
                      key={template.value}
                      onClick={() => {
                        applyActionTemplate(template.value);
                        onClose();
                      }}
                    >
                      {template.label}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </>
            )}
          </ToolbarDropdownMenu>
        </ToolbarGroup>
      </BlockControls>
      <InspectorControls>
        <PanelBody title={__("Modal Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Modal ID", TEXT_DOMAIN)}
            value={attributes.modalId ?? ""}
            onChange={(modalId) => setAttributes({ modalId })}
            help={__(
              "Stable ID used by the JavaScript API, trigger classes, and hash-based opening.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("ARIA label", TEXT_DOMAIN)}
            value={attributes.ariaLabel ?? ""}
            onChange={(ariaLabel) => setAttributes({ ariaLabel })}
            help={__(
              "Accessible dialog label when you do not use aria-labelledby.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Labelled-by element ID", TEXT_DOMAIN)}
            value={attributes.labelledById ?? ""}
            onChange={(labelledById) => setAttributes({ labelledById })}
            help={__(
              "Optional element ID inside the modal content that provides the accessible name.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Open on hash", TEXT_DOMAIN)}
            checked={attributes.openOnHash ?? true}
            onChange={(openOnHash) => setAttributes({ openOnHash })}
            help={__(
              "Open the modal when the page hash matches this modal.",
              TEXT_DOMAIN,
            )}
          />
          {attributes.openOnHash !== false ? (
            <TextControl
              label={__("Custom hash value", TEXT_DOMAIN)}
              value={attributes.hashValue ?? ""}
              onChange={(hashValue) => setAttributes({ hashValue })}
              help={__(
                "Optional custom hash without the # prefix. Leave empty to use flow-modal-{modalId}.",
                TEXT_DOMAIN,
              )}
            />
          ) : null}
          <ToggleControl
            label={__("Show close button", TEXT_DOMAIN)}
            checked={attributes.showCloseButton ?? true}
            onChange={(showCloseButton) => setAttributes({ showCloseButton })}
          />
          {attributes.showCloseButton !== false ? (
            <TextControl
              label={__("Close button label", TEXT_DOMAIN)}
              value={attributes.closeButtonLabel ?? ""}
              onChange={(closeButtonLabel) =>
                setAttributes({ closeButtonLabel })
              }
              help={__(
                "Used as the aria-label for the built-in close button.",
                TEXT_DOMAIN,
              )}
            />
          ) : null}
        </PanelBody>

        <PanelBody title={__("Behavior", TEXT_DOMAIN)} initialOpen={false}>
          <ToggleControl
            label={__("Close on Escape", TEXT_DOMAIN)}
            checked={attributes.closeOnEsc ?? true}
            onChange={(closeOnEsc) => setAttributes({ closeOnEsc })}
          />
          <ToggleControl
            label={__("Close on backdrop", TEXT_DOMAIN)}
            checked={attributes.closeOnBackdrop ?? true}
            onChange={(closeOnBackdrop) => setAttributes({ closeOnBackdrop })}
          />
          <ToggleControl
            label={__("Close on cancel action", TEXT_DOMAIN)}
            checked={attributes.closeOnCancel ?? true}
            onChange={(closeOnCancel) => setAttributes({ closeOnCancel })}
          />
          <ToggleControl
            label={__("Close on OK action", TEXT_DOMAIN)}
            checked={attributes.closeOnOk ?? true}
            onChange={(closeOnOk) => setAttributes({ closeOnOk })}
          />
          <ToggleControl
            label={__("Close on Flow submit success", TEXT_DOMAIN)}
            checked={attributes.closeOnFlowSubmitSuccess ?? false}
            onChange={(closeOnFlowSubmitSuccess) =>
              setAttributes({ closeOnFlowSubmitSuccess })
            }
          />
          <ToggleControl
            label={__("Restore focus on close", TEXT_DOMAIN)}
            checked={attributes.restoreFocusOnClose ?? true}
            onChange={(restoreFocusOnClose) =>
              setAttributes({ restoreFocusOnClose })
            }
          />
          <ToggleControl
            label={__("Prevent background scroll", TEXT_DOMAIN)}
            checked={attributes.preventBackgroundScroll ?? true}
            onChange={(preventBackgroundScroll) =>
              setAttributes({ preventBackgroundScroll })
            }
            help={__(
              "Locks page scrolling while the modal is open, including native dialog rendering.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Dispatch lifecycle events", TEXT_DOMAIN)}
            checked={attributes.dispatchLifecycleEvents ?? true}
            onChange={(dispatchLifecycleEvents) =>
              setAttributes({ dispatchLifecycleEvents })
            }
          />
        </PanelBody>

        <PanelBody title={__("Layout", TEXT_DOMAIN)} initialOpen={false}>
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? "md"}
            options={SIZE_OPTIONS}
            onChange={(size) => setAttributes({ size })}
            help={__(
              "Preset panel width. Choose Custom if you need an exact width override.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Position", TEXT_DOMAIN)}
            value={attributes.position ?? "center"}
            options={POSITION_OPTIONS}
            onChange={(position) => setAttributes({ position })}
          />
          <SelectControl
            label={__("Mobile behavior", TEXT_DOMAIN)}
            value={attributes.mobileBehavior ?? "normal"}
            options={MOBILE_BEHAVIOR_OPTIONS}
            onChange={(mobileBehavior) => setAttributes({ mobileBehavior })}
          />
          <SelectControl
            label={__("Backdrop style", TEXT_DOMAIN)}
            value={attributes.backdropStyle ?? "default"}
            options={BACKDROP_STYLE_OPTIONS}
            onChange={(backdropStyle) => setAttributes({ backdropStyle })}
          />
          <SelectControl
            label={__("Animation", TEXT_DOMAIN)}
            value={attributes.animation ?? "fade"}
            options={ANIMATION_OPTIONS}
            onChange={(animation) => setAttributes({ animation })}
          />
          {attributes.size === "custom" ? (
            <TextControl
              label={__("Custom width", TEXT_DOMAIN)}
              value={attributes.width ?? ""}
              onChange={(width) => setAttributes({ width })}
              help={__(
                "Exact panel width like 720px, 64rem, or min(90vw, 960px).",
                TEXT_DOMAIN,
              )}
            />
          ) : null}
          <TextControl
            label={__("Max width", TEXT_DOMAIN)}
            value={attributes.maxWidth ?? ""}
            onChange={(maxWidth) => setAttributes({ maxWidth })}
            help={__(
              "Optional hard cap above the chosen size or custom width. The viewport limit is still enforced automatically.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Height", TEXT_DOMAIN)}
            value={attributes.height ?? ""}
            onChange={(height) => setAttributes({ height })}
            help={__(
              "Optional fixed panel height. Leave empty for content-based height.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Max height", TEXT_DOMAIN)}
            value={attributes.maxHeight ?? ""}
            onChange={(maxHeight) => setAttributes({ maxHeight })}
            help={__(
              "Caps the panel height so the content area can scroll inside the modal.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Panel padding", TEXT_DOMAIN)}
            value={attributes.panelPadding ?? ""}
            onChange={(panelPadding) => setAttributes({ panelPadding })}
          />
          <TextControl
            label={__("Panel radius", TEXT_DOMAIN)}
            value={attributes.panelRadius ?? ""}
            onChange={(panelRadius) => setAttributes({ panelRadius })}
          />
          <TextControl
            label={__("Panel shadow", TEXT_DOMAIN)}
            value={attributes.panelShadow ?? ""}
            onChange={(panelShadow) => setAttributes({ panelShadow })}
          />
        </PanelBody>

        <PanelBody
          title={__("Action Defaults", TEXT_DOMAIN)}
          initialOpen={false}
        >
          <TextControl
            label={__("Default primary action", TEXT_DOMAIN)}
            value={attributes.defaultPrimaryAction ?? ""}
            onChange={(defaultPrimaryAction) =>
              setAttributes({ defaultPrimaryAction })
            }
            help={__(
              "Runs for primary action buttons, regardless of whether the visible label is OK, Yes, Continue, Save, Approve, or something custom.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Default secondary action", TEXT_DOMAIN)}
            value={attributes.defaultSecondaryAction ?? ""}
            onChange={(defaultSecondaryAction) =>
              setAttributes({ defaultSecondaryAction })
            }
            help={__(
              "Runs for secondary action buttons, regardless of whether the visible label is Cancel, No, Back, Reject, Skip, or something custom.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Default dismiss action", TEXT_DOMAIN)}
            value={attributes.defaultDismissAction ?? ""}
            onChange={(defaultDismissAction) =>
              setAttributes({ defaultDismissAction })
            }
            help={__(
              "Optional action for dismiss buttons like Close, Cancel, or Maybe later when they should do more than only close the modal.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Busy text", TEXT_DOMAIN)}
            value={attributes.busyText ?? ""}
            onChange={(busyText) => setAttributes({ busyText })}
          />
          <TextControl
            label={__("Error text", TEXT_DOMAIN)}
            value={attributes.errorText ?? ""}
            onChange={(errorText) => setAttributes({ errorText })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(59, 130, 246, 0.08))",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
            {__("Flow Modal", TEXT_DOMAIN)}
          </div>
          <div style={{ fontSize: "13px", color: "#0f172a", marginTop: "4px" }}>
            {attributes.modalId || __("(missing modal ID)", TEXT_DOMAIN)}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
            {`window.WpSuite.plugins.flow.modals.open('${
              attributes.modalId || "modal-id"
            }')`}
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <InnerBlocks template={DEFAULT_MODAL_TEMPLATE} />
        </div>
      </div>
    </>
  );
}
