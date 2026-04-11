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
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";
import {
  parseSliderMarks,
  serializeSliderMarks,
} from "../shared/mantine-prop-utils";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { RangeSliderFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: RangeSliderFieldAttributes;
  setAttributes: (next: Partial<RangeSliderFieldAttributes>) => void;
  clientId: string;
}) {
  const { updateBlock } = useDispatch(blockEditorStore);

  const block = useSelect(
    (select) => {
      const { getBlock } = select(blockEditorStore);
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
        <PanelBody title={__("Range Slider Field Settings", TEXT_DOMAIN)}>
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
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__("Controls the slider size and spacing.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__(
              "Overrides the active track and thumb color.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Minimum value", TEXT_DOMAIN)}
            value={attributes.min ?? 0}
            onChange={(value) =>
              setAttributes({ min: value ? Number(value) : 0 })
            }
            help={__("Minimum slider value.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Maximum value", TEXT_DOMAIN)}
            value={attributes.max ?? 100}
            onChange={(value) =>
              setAttributes({ max: value ? Number(value) : 100 })
            }
            help={__("Maximum slider value.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Domain start", TEXT_DOMAIN)}
            value={attributes.domain?.[0]}
            onChange={(value) =>
              setAttributes({
                domain:
                  value || attributes.domain?.[1] !== undefined
                    ? [
                        value ? Number(value) : attributes.domain?.[0] || 0,
                        attributes.domain?.[1] ?? attributes.max ?? 100,
                      ]
                    : undefined,
              })
            }
            help={__(
              "Optional visible domain start, separate from the minimum value.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Domain end", TEXT_DOMAIN)}
            value={attributes.domain?.[1]}
            onChange={(value) =>
              setAttributes({
                domain:
                  value || attributes.domain?.[0] !== undefined
                    ? [
                        attributes.domain?.[0] ?? attributes.min ?? 0,
                        value ? Number(value) : attributes.domain?.[1] || 0,
                      ]
                    : undefined,
              })
            }
            help={__(
              "Optional visible domain end, separate from the maximum value.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Step", TEXT_DOMAIN)}
            value={attributes.step ?? 1}
            onChange={(value) =>
              setAttributes({ step: value ? Number(value) : 1 })
            }
            help={__("Step increment.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show marks", TEXT_DOMAIN)}
            checked={Boolean(
              attributes.marksData?.length || attributes.marks?.length,
            )}
            onChange={(showMarks) =>
              setAttributes({
                marks: showMarks ? attributes.marks || [] : undefined,
                marksData: showMarks ? attributes.marksData || [] : undefined,
              })
            }
            help={__("Display marks on the slider.", TEXT_DOMAIN)}
          />
          <TextareaControl
            label={__("Marks", TEXT_DOMAIN)}
            value={serializeSliderMarks(attributes.marksData)}
            onChange={(value) =>
              setAttributes({ marksData: parseSliderMarks(value) })
            }
            help={__("One mark per line: value or value|label.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Min range", TEXT_DOMAIN)}
            value={attributes.minRange}
            onChange={(value) =>
              setAttributes({ minRange: value ? Number(value) : undefined })
            }
            help={__(
              "Minimum allowed distance between the two thumbs.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Max range", TEXT_DOMAIN)}
            value={attributes.maxRange}
            onChange={(value) =>
              setAttributes({ maxRange: value ? Number(value) : undefined })
            }
            help={__(
              "Maximum allowed distance between the two thumbs.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Precision", TEXT_DOMAIN)}
            value={attributes.precision}
            onChange={(value) =>
              setAttributes({ precision: value ? Number(value) : undefined })
            }
            help={__(
              "Number of decimal places shown in the slider values.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Thumb size", TEXT_DOMAIN)}
            value={attributes.thumbSize}
            onChange={(value) =>
              setAttributes({ thumbSize: value ? Number(value) : undefined })
            }
            help={__(
              "Custom size of the draggable thumbs in pixels.",
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
            visibleCount={3}
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
                help: __(
                  "Prevent users from changing this field.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "showLabelOnHover",
                label: __("Show label on hover", TEXT_DOMAIN),
                checked: attributes.showLabelOnHover ?? true,
                onChange: (showLabelOnHover) =>
                  setAttributes({ showLabelOnHover }),
                help: __(
                  "Show the current values when hovering the slider thumbs.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "labelAlwaysOn",
                label: __("Label always on", TEXT_DOMAIN),
                checked: Boolean(attributes.labelAlwaysOn),
                onChange: (labelAlwaysOn) => setAttributes({ labelAlwaysOn }),
                help: __(
                  "Keep both value labels visible even when idle.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "restrictToMarks",
                label: __("Restrict to marks", TEXT_DOMAIN),
                checked: Boolean(attributes.restrictToMarks),
                onChange: (restrictToMarks) =>
                  setAttributes({ restrictToMarks }),
                help: __(
                  "Allow selecting only values that match the defined marks.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "pushOnOverlap",
                label: __("Push on overlap", TEXT_DOMAIN),
                checked: Boolean(attributes.pushOnOverlap),
                onChange: (pushOnOverlap) => setAttributes({ pushOnOverlap }),
                help: __(
                  "Push the other thumb forward instead of allowing overlap.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "inverted",
                label: __("Inverted", TEXT_DOMAIN),
                checked: Boolean(attributes.inverted),
                onChange: (inverted) => setAttributes({ inverted }),
                help: __(
                  "Invert the active and inactive parts of the slider track.",
                  TEXT_DOMAIN,
                ),
              },
            ]}
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
            title={__("Range slider field", TEXT_DOMAIN)}
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
              {__("Range slider field", TEXT_DOMAIN)}
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
