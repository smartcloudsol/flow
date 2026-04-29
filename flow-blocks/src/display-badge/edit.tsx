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
import {
  BADGE_VARIANT_OPTIONS,
  RADIUS_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";

interface DisplayBadgeAttributes {
  content?: string;
  color?: string;
  variant?: string;
  size?: string;
  radius?: string;
  fullWidth?: boolean;
  circle?: boolean;
  autoContrast?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDeg?: number;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

function getBadgePreviewStyle(attributes: DisplayBadgeAttributes) {
  const fallbackColor = attributes.color || "#1d4ed8";

  if (attributes.variant === "gradient") {
    return {
      backgroundImage: `linear-gradient(${attributes.gradientDeg ?? 90}deg, ${
        attributes.gradientFrom || fallbackColor
      }, ${attributes.gradientTo || "#06b6d4"})`,
      border: "none",
      color: "#ffffff",
    };
  }

  if (attributes.variant === "filled") {
    return {
      backgroundColor: fallbackColor,
      border: "none",
      color: attributes.autoContrast ? "#111827" : "#ffffff",
    };
  }

  if (attributes.variant === "outline") {
    return {
      backgroundColor: "transparent",
      border: `1px solid ${fallbackColor}`,
      color: fallbackColor,
    };
  }

  if (attributes.variant === "white") {
    return {
      backgroundColor: "#ffffff",
      border: "1px solid rgba(0, 0, 0, 0.1)",
      color: fallbackColor,
    };
  }

  if (attributes.variant === "transparent") {
    return {
      backgroundColor: "transparent",
      border: "1px solid transparent",
      color: fallbackColor,
    };
  }

  if (attributes.variant === "default") {
    return {
      backgroundColor: "#f3f4f6",
      border: "1px solid transparent",
      color: "#111827",
    };
  }

  return {
    backgroundColor: "rgba(29, 78, 216, 0.12)",
    border: "1px solid transparent",
    color: fallbackColor,
  };
}

function getBadgePreviewPadding(attributes: DisplayBadgeAttributes) {
  if (attributes.circle) {
    return "0.55rem";
  }

  switch (attributes.size) {
    case "xs":
      return "0.12rem 0.45rem";
    case "sm":
      return "0.18rem 0.55rem";
    case "lg":
      return "0.34rem 0.8rem";
    case "xl":
      return "0.42rem 0.95rem";
    default:
      return "0.26rem 0.7rem";
  }
}

function getBadgePreviewRadius(radius?: string) {
  switch (radius) {
    case "xs":
      return "0.2rem";
    case "sm":
      return "0.35rem";
    case "md":
      return "0.5rem";
    case "lg":
      return "0.75rem";
    case "xl":
      return "999px";
    default:
      return "0.4rem";
  }
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayBadgeAttributes;
  setAttributes: (next: Partial<DisplayBadgeAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content = attributes.content?.trim() || __("Badge", TEXT_DOMAIN);
  const previewStyle = getBadgePreviewStyle(attributes);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Badge Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(contentValue) =>
              setAttributes({ content: contentValue })
            }
          />
          <SelectControl
            label={__("Variant", TEXT_DOMAIN)}
            value={attributes.variant ?? "light"}
            options={BADGE_VARIANT_OPTIONS}
            onChange={(variant) => setAttributes({ variant })}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? "md"}
            options={SIZE_OPTIONS}
            onChange={(size) => setAttributes({ size })}
          />
          <SelectControl
            label={__("Radius", TEXT_DOMAIN)}
            value={attributes.radius ?? "xl"}
            options={RADIUS_OPTIONS}
            onChange={(radius) => setAttributes({ radius })}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          {attributes.variant === "gradient" ? (
            <>
              <TextControl
                label={__("Gradient from", TEXT_DOMAIN)}
                value={attributes.gradientFrom ?? ""}
                onChange={(gradientFrom) => setAttributes({ gradientFrom })}
              />
              <TextControl
                label={__("Gradient to", TEXT_DOMAIN)}
                value={attributes.gradientTo ?? ""}
                onChange={(gradientTo) => setAttributes({ gradientTo })}
              />
              <TextControl
                label={__("Gradient angle", TEXT_DOMAIN)}
                type="number"
                value={String(attributes.gradientDeg ?? 90)}
                onChange={(gradientDeg) =>
                  setAttributes({ gradientDeg: Number(gradientDeg) || 90 })
                }
              />
            </>
          ) : null}
          <ToggleControl
            label={__("Full width", TEXT_DOMAIN)}
            checked={Boolean(attributes.fullWidth)}
            onChange={(fullWidth) => setAttributes({ fullWidth })}
          />
          <ToggleControl
            label={__("Circle", TEXT_DOMAIN)}
            checked={Boolean(attributes.circle)}
            onChange={(circle) => setAttributes({ circle })}
          />
          <ToggleControl
            label={__("Auto contrast", TEXT_DOMAIN)}
            checked={Boolean(attributes.autoContrast)}
            onChange={(autoContrast) => setAttributes({ autoContrast })}
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
            setAttributes(next as Partial<DisplayBadgeAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Badge", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div style={{ width: attributes.fullWidth ? "100%" : undefined }}>
            <span
              style={{
                alignItems: "center",
                borderRadius: attributes.circle
                  ? "999px"
                  : getBadgePreviewRadius(attributes.radius),
                display: attributes.fullWidth ? "flex" : "inline-flex",
                fontSize:
                  attributes.size === "xs"
                    ? "0.7rem"
                    : attributes.size === "sm"
                    ? "0.75rem"
                    : attributes.size === "lg"
                    ? "0.9rem"
                    : attributes.size === "xl"
                    ? "1rem"
                    : "0.82rem",
                fontWeight: 700,
                gap: "0.35rem",
                justifyContent: "center",
                letterSpacing: "0.02em",
                minWidth: attributes.circle ? "2.1rem" : undefined,
                padding: getBadgePreviewPadding(attributes),
                textTransform: "uppercase",
                width: attributes.fullWidth ? "100%" : undefined,
                ...previewStyle,
              }}
            >
              {attributes.variant === "dot" ? (
                <span
                  aria-hidden="true"
                  style={{
                    backgroundColor: String(
                      previewStyle.color || "currentColor",
                    ),
                    borderRadius: "999px",
                    display: "inline-block",
                    height: "0.45rem",
                    width: "0.45rem",
                  }}
                />
              ) : null}
              {content}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
