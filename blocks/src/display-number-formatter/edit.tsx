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
  SIZE_OPTIONS,
  THOUSANDS_GROUP_STYLE_OPTIONS,
} from "../shared/mantine-editor-options";

interface DisplayNumberFormatterAttributes {
  value?: string;
  prefix?: string;
  suffix?: string;
  decimalScale?: number;
  decimalSeparator?: string;
  thousandSeparator?: string;
  thousandsGroupStyle?: "none" | "thousand" | "lakh" | "wan";
  allowNegative?: boolean;
  size?: string;
  color?: string;
  align?: "left" | "center" | "right";
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const ALIGN_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

function groupThousands(value: string, separator: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatPreviewNumber(attributes: DisplayNumberFormatterAttributes) {
  const numeric = Number(attributes.value ?? "0");
  if (Number.isNaN(numeric)) {
    return `${attributes.prefix || ""}${attributes.value || ""}${
      attributes.suffix || ""
    }`;
  }

  const safeValue = attributes.allowNegative ? numeric : Math.abs(numeric);
  const scale = attributes.decimalScale ?? 2;
  const fixed = scale >= 0 ? safeValue.toFixed(scale) : String(safeValue);
  const [integerPart, decimalPart] = fixed.split(".");
  const thousandSeparator = attributes.thousandSeparator ?? " ";
  const grouped = thousandSeparator
    ? groupThousands(integerPart, thousandSeparator)
    : integerPart;
  const decimalSeparator = attributes.decimalSeparator ?? ".";
  const decimalSuffix = decimalPart ? `${decimalSeparator}${decimalPart}` : "";

  return `${attributes.prefix || ""}${grouped}${decimalSuffix}${
    attributes.suffix || ""
  }`;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayNumberFormatterAttributes;
  setAttributes: (next: Partial<DisplayNumberFormatterAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const preview = formatPreviewNumber(attributes);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Number Formatter Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Value", TEXT_DOMAIN)}
            value={attributes.value ?? ""}
            onChange={(value) => setAttributes({ value })}
          />
          <TextControl
            label={__("Prefix", TEXT_DOMAIN)}
            value={attributes.prefix ?? ""}
            onChange={(prefix) => setAttributes({ prefix })}
          />
          <TextControl
            label={__("Suffix", TEXT_DOMAIN)}
            value={attributes.suffix ?? ""}
            onChange={(suffix) => setAttributes({ suffix })}
          />
          <TextControl
            label={__("Decimal scale", TEXT_DOMAIN)}
            type="number"
            value={
              attributes.decimalScale !== undefined
                ? String(attributes.decimalScale)
                : ""
            }
            onChange={(decimalScale) =>
              setAttributes({
                decimalScale: decimalScale ? Number(decimalScale) : undefined,
              })
            }
          />
          <TextControl
            label={__("Decimal separator", TEXT_DOMAIN)}
            value={attributes.decimalSeparator ?? ""}
            onChange={(decimalSeparator) => setAttributes({ decimalSeparator })}
          />
          <TextControl
            label={__("Thousands separator", TEXT_DOMAIN)}
            value={attributes.thousandSeparator ?? ""}
            onChange={(thousandSeparator) =>
              setAttributes({ thousandSeparator })
            }
          />
          <SelectControl
            label={__("Thousands group style", TEXT_DOMAIN)}
            value={attributes.thousandsGroupStyle ?? "thousand"}
            options={THOUSANDS_GROUP_STYLE_OPTIONS}
            onChange={(thousandsGroupStyle) =>
              setAttributes({
                thousandsGroupStyle:
                  thousandsGroupStyle as DisplayNumberFormatterAttributes["thousandsGroupStyle"],
              })
            }
          />
          <ToggleControl
            label={__("Allow negative values", TEXT_DOMAIN)}
            checked={Boolean(attributes.allowNegative)}
            onChange={(allowNegative) => setAttributes({ allowNegative })}
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
              setAttributes({
                align: align as DisplayNumberFormatterAttributes["align"],
              })
            }
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
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<DisplayNumberFormatterAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Number Formatter", TEXT_DOMAIN)}
            summary={preview}
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
              fontVariantNumeric: "tabular-nums",
              textAlign: attributes.align ?? "left",
            }}
          >
            {preview}
          </div>
        )}
      </div>
    </>
  );
}
