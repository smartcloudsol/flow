import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface SaveDraftButtonAttributes {
  label?: string;
  successMessage?: string;
  showTitle?: boolean;
  showIcon?: boolean;
  iconPosition?: string;
  customIcon?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: SaveDraftButtonAttributes;
  setAttributes: (next: Partial<SaveDraftButtonAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Save Draft Button Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={attributes.label ?? ""}
            onChange={(label) => setAttributes({ label })}
          />
          <TextControl
            label={__("Success message", TEXT_DOMAIN)}
            value={attributes.successMessage ?? ""}
            onChange={(successMessage) => setAttributes({ successMessage })}
          />
          <ToggleControl
            label={__("Show title", TEXT_DOMAIN)}
            checked={Boolean(attributes.showTitle ?? true)}
            onChange={(showTitle) => setAttributes({ showTitle })}
          />

          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<SaveDraftButtonAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Save Draft button", TEXT_DOMAIN)}
            summary={attributes.label || __("Save draft", TEXT_DOMAIN)}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              border: "1px dashed #ccc",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
            }}
          >
            <div
              style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}
            >
              {__("Save Draft button", TEXT_DOMAIN)}
            </div>
            <div style={{ fontWeight: 500 }}>
              {attributes.label || __("Save draft", TEXT_DOMAIN)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
