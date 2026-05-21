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
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { DIVIDER_ORIENTATION_OPTIONS } from "../shared/mantine-editor-options";

interface DividerAttributes {
  label?: string;
  labelPosition?: string;
  orientation?: string;
  size?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const SIZE_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

const LABEL_POSITION_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DividerAttributes;
  setAttributes: (next: Partial<DividerAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Divider Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={attributes.label ?? ""}
            onChange={(label) => setAttributes({ label })}
            help={__("Optional label text.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Label position", TEXT_DOMAIN)}
            value={attributes.labelPosition ?? "center"}
            options={LABEL_POSITION_OPTIONS}
            onChange={(labelPosition) => setAttributes({ labelPosition })}
            help={__("Position of label text.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? "md"}
            options={SIZE_OPTIONS}
            onChange={(size) => setAttributes({ size })}
            help={__("Divider thickness.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Orientation", TEXT_DOMAIN)}
            value={attributes.orientation ?? "horizontal"}
            options={DIVIDER_ORIENTATION_OPTIONS}
            onChange={(orientation) => setAttributes({ orientation })}
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
            setAttributes(next as Partial<DividerAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Divider", TEXT_DOMAIN)}
            summary={
              attributes.label ||
              `${__("Size", TEXT_DOMAIN)}: ${attributes.size ?? "md"}`
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "16px 0",
              gap: "8px",
            }}
          >
            {attributes.labelPosition === "left" && attributes.label && (
              <span style={{ fontSize: "12px", color: "#666" }}>
                {attributes.label}
              </span>
            )}
            <hr
              style={{
                flex: attributes.label ? "1" : "auto",
                width: attributes.label ? "auto" : "100%",
                border: "none",
                borderTop: `${
                  attributes.size === "xs"
                    ? 1
                    : attributes.size === "sm"
                    ? 2
                    : attributes.size === "lg"
                    ? 4
                    : attributes.size === "xl"
                    ? 6
                    : 3
                }px solid #ddd`,
                margin: 0,
              }}
            />
            {attributes.labelPosition === "center" && attributes.label && (
              <span style={{ fontSize: "12px", color: "#666" }}>
                {attributes.label}
              </span>
            )}
            {attributes.labelPosition === "center" && attributes.label && (
              <hr
                style={{
                  flex: "1",
                  border: "none",
                  borderTop: `${
                    attributes.size === "xs"
                      ? 1
                      : attributes.size === "sm"
                      ? 2
                      : attributes.size === "lg"
                      ? 4
                      : attributes.size === "xl"
                      ? 6
                      : 3
                  }px solid #ddd`,
                  margin: 0,
                }}
              />
            )}
            {attributes.labelPosition === "right" && attributes.label && (
              <span style={{ fontSize: "12px", color: "#666" }}>
                {attributes.label}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
