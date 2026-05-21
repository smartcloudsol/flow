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

interface DisplayImageAttributes {
  src?: string;
  alt?: string;
  caption?: string;
  fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  radius?: string;
  width?: string;
  height?: string;
  fallbackSrc?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const FIT_OPTIONS = [
  { label: __("Contain", TEXT_DOMAIN), value: "contain" },
  { label: __("Cover", TEXT_DOMAIN), value: "cover" },
  { label: __("Fill", TEXT_DOMAIN), value: "fill" },
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("Scale down", TEXT_DOMAIN), value: "scale-down" },
];

const RADIUS_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayImageAttributes;
  setAttributes: (next: Partial<DisplayImageAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const imageSrc =
    attributes.src?.trim() || attributes.fallbackSrc?.trim() || "";

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Image Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Source URL", TEXT_DOMAIN)}
            value={attributes.src ?? ""}
            onChange={(src) => setAttributes({ src })}
          />
          <TextControl
            label={__("Fallback URL", TEXT_DOMAIN)}
            value={attributes.fallbackSrc ?? ""}
            onChange={(fallbackSrc) => setAttributes({ fallbackSrc })}
          />
          <TextControl
            label={__("Alt text", TEXT_DOMAIN)}
            value={attributes.alt ?? ""}
            onChange={(alt) => setAttributes({ alt })}
          />
          <TextControl
            label={__("Caption", TEXT_DOMAIN)}
            value={attributes.caption ?? ""}
            onChange={(caption) => setAttributes({ caption })}
          />
          <SelectControl
            label={__("Fit", TEXT_DOMAIN)}
            value={attributes.fit ?? "cover"}
            options={FIT_OPTIONS}
            onChange={(fit) =>
              setAttributes({ fit: fit as DisplayImageAttributes["fit"] })
            }
          />
          <SelectControl
            label={__("Radius", TEXT_DOMAIN)}
            value={attributes.radius ?? ""}
            options={RADIUS_OPTIONS}
            onChange={(radius) => setAttributes({ radius })}
          />
          <TextControl
            label={__("Width", TEXT_DOMAIN)}
            value={attributes.width ?? ""}
            onChange={(width) => setAttributes({ width })}
            help={__("Examples: 100%, 320px, 24rem.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Height", TEXT_DOMAIN)}
            value={attributes.height ?? ""}
            onChange={(height) => setAttributes({ height })}
            help={__("Examples: auto, 180px, 16rem.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<DisplayImageAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Image", TEXT_DOMAIN)}
            summary={attributes.alt || imageSrc || __("Image", TEXT_DOMAIN)}
          />
        ) : imageSrc ? (
          <figure style={{ margin: 0 }}>
            <img
              src={imageSrc}
              alt={attributes.alt ?? ""}
              style={{
                borderRadius: attributes.radius ? "0.5rem" : undefined,
                display: "block",
                height: attributes.height || "auto",
                maxWidth: "100%",
                objectFit: attributes.fit ?? "cover",
                width: attributes.width || "100%",
              }}
            />
            {attributes.caption ? (
              <figcaption
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginTop: "0.5rem",
                }}
              >
                {attributes.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : (
          <div
            style={{
              alignItems: "center",
              border: "1px dashed #cbd5e1",
              borderRadius: "0.5rem",
              color: "#64748b",
              display: "flex",
              justifyContent: "center",
              minHeight: "180px",
              padding: "1rem",
            }}
          >
            {__("Add an image URL to preview this block.", TEXT_DOMAIN)}
          </div>
        )}
      </div>
    </>
  );
}
