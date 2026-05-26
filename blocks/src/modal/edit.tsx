import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

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
  preventBackgroundScrollFallback?: boolean;
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
  defaultOkAction?: string;
  defaultCancelAction?: string;
  busyText?: string;
  errorText?: string;
};

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
  useEffect(() => {
    if (attributes.modalId?.trim()) {
      return;
    }

    setAttributes({ modalId: createDefaultModalId(clientId) });
  }, [attributes.modalId, clientId, setAttributes]);

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
            label={__(
              "Prevent background scroll in fallback mode",
              TEXT_DOMAIN,
            )}
            checked={attributes.preventBackgroundScrollFallback ?? true}
            onChange={(preventBackgroundScrollFallback) =>
              setAttributes({ preventBackgroundScrollFallback })
            }
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
          <TextControl
            label={__("Width", TEXT_DOMAIN)}
            value={attributes.width ?? ""}
            onChange={(width) => setAttributes({ width })}
          />
          <TextControl
            label={__("Max width", TEXT_DOMAIN)}
            value={attributes.maxWidth ?? ""}
            onChange={(maxWidth) => setAttributes({ maxWidth })}
          />
          <TextControl
            label={__("Height", TEXT_DOMAIN)}
            value={attributes.height ?? ""}
            onChange={(height) => setAttributes({ height })}
          />
          <TextControl
            label={__("Max height", TEXT_DOMAIN)}
            value={attributes.maxHeight ?? ""}
            onChange={(maxHeight) => setAttributes({ maxHeight })}
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
            label={__("Default OK action", TEXT_DOMAIN)}
            value={attributes.defaultOkAction ?? ""}
            onChange={(defaultOkAction) => setAttributes({ defaultOkAction })}
          />
          <TextControl
            label={__("Default cancel action", TEXT_DOMAIN)}
            value={attributes.defaultCancelAction ?? ""}
            onChange={(defaultCancelAction) =>
              setAttributes({ defaultCancelAction })
            }
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
          <InnerBlocks />
        </div>
      </div>
    </>
  );
}
