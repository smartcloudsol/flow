import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  store as blockEditorStore,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  __experimentalNumberControl as NumberControl,
  PanelBody,
  SelectControl,
  TextareaControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import {
  CLAMP_BEHAVIOR_OPTIONS,
  SIZE_OPTIONS,
  THOUSANDS_GROUP_STYLE_OPTIONS,
} from "../shared/mantine-editor-options";
import {
  parseDelimitedList,
  serializeDelimitedList,
} from "../shared/mantine-prop-utils";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { NumberFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: NumberFieldAttributes;
  setAttributes: (next: Partial<NumberFieldAttributes>) => void;
  clientId: string;
}) {
  const { updateBlock } = useDispatch(blockEditorStore) as unknown as {
    updateBlock: (
      blockClientId: string,
      next: { attributes: Record<string, unknown> },
    ) => void;
  };

  const block = useSelect(
    (select) => {
      const { getBlock } = select(blockEditorStore) as unknown as {
        getBlock: (
          blockClientId: string,
        ) => { attributes: Record<string, unknown> } | undefined;
      };
      return getBlock(clientId);
    },
    [clientId],
  );

  useEffect(() => {
    if (
      block &&
      attributes.name &&
      block.attributes.anchor !== attributes.name
    ) {
      updateBlock(clientId, {
        attributes: {
          ...attributes,
          anchor: attributes.name,
        },
      });
    }
  }, [attributes, attributes.name, block, clientId, updateBlock]);

  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Number Field Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Field name", TEXT_DOMAIN)}
            value={attributes.name ?? ""}
            onChange={(name) => setAttributes({ name })}
            help={__(
              "Unique field identifier (used in submissions and API).",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={attributes.label ?? ""}
            onChange={(label) => setAttributes({ label })}
            help={__("Displayed label for the field.", TEXT_DOMAIN)}
          />
          <TextareaControl
            label={__("Description", TEXT_DOMAIN)}
            value={attributes.description ?? ""}
            onChange={(description) => setAttributes({ description })}
            help={__("Short help text shown below the field.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Placeholder", TEXT_DOMAIN)}
            value={attributes.placeholder ?? ""}
            onChange={(placeholder) => setAttributes({ placeholder })}
            help={__("Placeholder text shown inside the input.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Block size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__(
              "Controls the outer field width and spacing.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Input size", TEXT_DOMAIN)}
            value={attributes.inputSize ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(inputSize) =>
              setAttributes({ inputSize: inputSize || undefined })
            }
            help={__(
              "Controls the input height and internal spacing.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
          <ToggleSettingsSection
            visibleCount={2}
            items={[
              {
                key: "required",
                label: __("Required", TEXT_DOMAIN),
                checked: Boolean(attributes.required),
                onChange: (required) => setAttributes({ required }),
                help: __("Mark this field as required.", TEXT_DOMAIN),
              },
              {
                key: "disabled",
                label: __("Disabled", TEXT_DOMAIN),
                checked: Boolean(attributes.disabled),
                onChange: (disabled) => setAttributes({ disabled }),
                help: __("Prevent users from editing this field.", TEXT_DOMAIN),
              },
            ]}
          />
        </PanelBody>
        <PanelBody
          title={__("Number Constraints", TEXT_DOMAIN)}
          initialOpen={false}
        >
          <NumberControl
            label={__("Minimum value", TEXT_DOMAIN)}
            value={attributes.min}
            onChange={(value) =>
              setAttributes({ min: value ? Number(value) : undefined })
            }
            help={__("Minimum allowed value.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Maximum value", TEXT_DOMAIN)}
            value={attributes.max}
            onChange={(value) =>
              setAttributes({ max: value ? Number(value) : undefined })
            }
            help={__("Maximum allowed value.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Step", TEXT_DOMAIN)}
            value={attributes.step ?? 1}
            onChange={(value) =>
              setAttributes({ step: value ? Number(value) : 1 })
            }
            help={__("Step increment for number input.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Decimal scale", TEXT_DOMAIN)}
            value={attributes.decimalScale}
            onChange={(value) =>
              setAttributes({ decimalScale: value ? Number(value) : undefined })
            }
            help={__("Number of decimal places allowed.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Allow negative", TEXT_DOMAIN)}
            checked={attributes.allowNegative ?? true}
            onChange={(allowNegative) => setAttributes({ allowNegative })}
            help={__("Allow negative values.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Allow decimal", TEXT_DOMAIN)}
            checked={attributes.allowDecimal ?? true}
            onChange={(allowDecimal) => setAttributes({ allowDecimal })}
            help={__("Allow decimal values.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Allow leading zeros", TEXT_DOMAIN)}
            checked={Boolean(attributes.allowLeadingZeros)}
            onChange={(allowLeadingZeros) =>
              setAttributes({ allowLeadingZeros })
            }
            help={__(
              "Keep leading zeros instead of trimming them automatically.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Allowed decimal separators", TEXT_DOMAIN)}
            value={serializeDelimitedList(attributes.allowedDecimalSeparators)}
            onChange={(value) =>
              setAttributes({
                allowedDecimalSeparators: parseDelimitedList(value),
              })
            }
            help={__("Comma or newline separated characters.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Clamp behavior", TEXT_DOMAIN)}
            value={attributes.clampBehavior ?? "blur"}
            options={CLAMP_BEHAVIOR_OPTIONS}
            onChange={(clampBehavior) =>
              setAttributes({
                clampBehavior:
                  clampBehavior as NumberFieldAttributes["clampBehavior"],
              })
            }
            help={__(
              "Controls when values outside min or max get corrected.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Decimal separator", TEXT_DOMAIN)}
            value={attributes.decimalSeparator ?? "."}
            onChange={(decimalSeparator) => setAttributes({ decimalSeparator })}
            help={__(
              "Character used for decimal values, for example dot or comma.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Fixed decimal scale", TEXT_DOMAIN)}
            checked={Boolean(attributes.fixedDecimalScale)}
            onChange={(fixedDecimalScale) =>
              setAttributes({ fixedDecimalScale })
            }
            help={__(
              "Always show the configured number of decimal places.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Hide controls", TEXT_DOMAIN)}
            checked={Boolean(attributes.hideControls)}
            onChange={(hideControls) => setAttributes({ hideControls })}
            help={__(
              "Hide the built-in increment and decrement buttons.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Prefix", TEXT_DOMAIN)}
            value={attributes.prefix ?? ""}
            onChange={(prefix) => setAttributes({ prefix })}
            help={__("Text shown before the numeric value.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Start value", TEXT_DOMAIN)}
            value={attributes.startValue}
            onChange={(value) =>
              setAttributes({ startValue: value ? Number(value) : undefined })
            }
          />
          <TextControl
            label={__("Suffix", TEXT_DOMAIN)}
            value={attributes.suffix ?? ""}
            onChange={(suffix) => setAttributes({ suffix })}
            help={__("Text shown after the numeric value.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Thousand separator", TEXT_DOMAIN)}
            value={attributes.thousandSeparator ?? ""}
            onChange={(thousandSeparator) =>
              setAttributes({ thousandSeparator })
            }
            help={__(
              "Character used to visually group large numbers.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Thousands group style", TEXT_DOMAIN)}
            value={attributes.thousandsGroupStyle ?? "none"}
            options={THOUSANDS_GROUP_STYLE_OPTIONS}
            onChange={(thousandsGroupStyle) =>
              setAttributes({
                thousandsGroupStyle:
                  thousandsGroupStyle as NumberFieldAttributes["thousandsGroupStyle"],
              })
            }
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes}
          setAttributes={setAttributes}
          clientId={clientId}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Number field", TEXT_DOMAIN)}
            summary={attributes.name || __("(unnamed)", TEXT_DOMAIN)}
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
              {__("Number field", TEXT_DOMAIN)}
            </div>
            <div style={{ fontWeight: 500 }}>
              {attributes.name || __("(unnamed)", TEXT_DOMAIN)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
