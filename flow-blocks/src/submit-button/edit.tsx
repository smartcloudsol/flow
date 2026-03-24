import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";

interface SubmitButtonAttributes {
  label?: string;
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
  attributes: SubmitButtonAttributes;
  setAttributes: (attrs: Partial<SubmitButtonAttributes>) => void;
  clientId: string;
}) {
  const {
    label = "Submit",
    showTitle = true,
    showIcon = false,
    iconPosition = "left",
    customIcon = "",
  } = attributes;
  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Submit Button Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Button Label", TEXT_DOMAIN)}
            value={label}
            onChange={(value) => setAttributes({ label: value })}
            help={__("Text to display on the submit button", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show Title", TEXT_DOMAIN)}
            checked={showTitle}
            onChange={(value) => setAttributes({ showTitle: value })}
            help={__("Display the button label text", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show Icon", TEXT_DOMAIN)}
            checked={showIcon}
            onChange={(value) => setAttributes({ showIcon: value })}
            help={__("Display an icon on the button", TEXT_DOMAIN)}
          />
          {showIcon && (
            <>
              <SelectControl
                label={__("Icon Position", TEXT_DOMAIN)}
                value={iconPosition as "left" | "right"}
                options={[
                  { label: __("Left", TEXT_DOMAIN), value: "left" },
                  { label: __("Right", TEXT_DOMAIN), value: "right" },
                ]}
                onChange={(value) => setAttributes({ iconPosition: value })}
              />
              <TextControl
                label={__("Custom Icon", TEXT_DOMAIN)}
                value={customIcon}
                onChange={(value) => setAttributes({ customIcon: value })}
                help={__(
                  "Base64 encoded image (data:image/svg+xml;base64,...) or leave empty to use default send icon",
                  TEXT_DOMAIN,
                )}
              />
            </>
          )}

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
            setAttributes(next as Partial<SubmitButtonAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        <div
          style={{
            padding: "12px",
            border: "1px dashed #ccc",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
            {__("Submit Button", TEXT_DOMAIN)}
            {isHidden ? ` • ${__("Hidden", TEXT_DOMAIN)}` : ""}
          </div>
          {isHidden ? (
            <div style={{ fontSize: "13px", color: "#666" }}>
              {label || __("Submit", TEXT_DOMAIN)}
            </div>
          ) : (
            <div style={{ fontWeight: 500, fontSize: "15px" }}>
              {showIcon && iconPosition === "left" && (
                <span style={{ marginRight: "6px" }}>
                  {customIcon ? "🖼️" : "📤"}
                </span>
              )}
              {showTitle && (label || __("Submit", TEXT_DOMAIN))}
              {showIcon && iconPosition === "right" && (
                <span style={{ marginLeft: "6px" }}>
                  {customIcon ? "🖼️" : "📤"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
