import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";

interface DisplayTextAttributes {
  content?: string;
  size?: string;
  color?: string;
  align?: "left" | "center" | "right";
  weight?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const ALIGN_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

const WEIGHT_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: __("Regular", TEXT_DOMAIN), value: "400" },
  { label: __("Medium", TEXT_DOMAIN), value: "500" },
  { label: __("Semibold", TEXT_DOMAIN), value: "600" },
  { label: __("Bold", TEXT_DOMAIN), value: "700" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayTextAttributes;
  setAttributes: (next: Partial<DisplayTextAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() || __("Add supporting text.", TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Text Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(nextContent) => setAttributes({ content: nextContent })}
            help={__("Display-only supporting copy.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Auto", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size })}
          />
          <SelectControl
            label={__("Align", TEXT_DOMAIN)}
            value={attributes.align ?? "left"}
            options={ALIGN_OPTIONS}
            onChange={(align) =>
              setAttributes({ align: align as DisplayTextAttributes["align"] })
            }
          />
          <SelectControl
            label={__("Weight", TEXT_DOMAIN)}
            value={attributes.weight ?? ""}
            options={WEIGHT_OPTIONS}
            onChange={(weight) => setAttributes({ weight })}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<DisplayTextAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Text", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div
            style={{
              color: attributes.color || undefined,
              fontSize:
                attributes.size === "xs"
                  ? "0.75rem"
                  : attributes.size === "sm"
                  ? "0.875rem"
                  : attributes.size === "lg"
                  ? "1.125rem"
                  : attributes.size === "xl"
                  ? "1.25rem"
                  : "1rem",
              fontWeight: attributes.weight || undefined,
              lineHeight: 1.5,
              textAlign: attributes.align ?? "left",
              whiteSpace: "pre-wrap",
            }}
          >
            {content}
          </div>
        )}
      </div>
    </>
  );
}
