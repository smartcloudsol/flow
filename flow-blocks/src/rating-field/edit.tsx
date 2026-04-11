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
  RATING_SYMBOL_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { RatingFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: RatingFieldAttributes;
  setAttributes: (next: Partial<RatingFieldAttributes>) => void;
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
        <PanelBody title={__("Rating Field Settings", TEXT_DOMAIN)}>
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
          <NumberControl
            label={__("Number of stars", TEXT_DOMAIN)}
            value={attributes.count ?? 5}
            onChange={(value) =>
              setAttributes({ count: value ? Number(value) : 5 })
            }
            help={__("Total number of rating stars.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Fractions", TEXT_DOMAIN)}
            value={attributes.fractions ?? 1}
            onChange={(value) =>
              setAttributes({ fractions: value ? Number(value) : 1 })
            }
            help={__(
              "Fractional rating (1=full, 2=half, 3=third, etc.).",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__("Controls the icon size and spacing.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__(
              "Overrides the highlight color of the active rating.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Empty symbol", TEXT_DOMAIN)}
            value={attributes.emptySymbol ?? ""}
            options={RATING_SYMBOL_OPTIONS}
            onChange={(emptySymbol) =>
              setAttributes({ emptySymbol: emptySymbol || undefined })
            }
            help={__("Icon used for unselected rating steps.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Full symbol", TEXT_DOMAIN)}
            value={attributes.fullSymbol ?? ""}
            options={RATING_SYMBOL_OPTIONS}
            onChange={(fullSymbol) =>
              setAttributes({ fullSymbol: fullSymbol || undefined })
            }
            help={__("Icon used for selected rating steps.", TEXT_DOMAIN)}
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
                help: __(
                  "Prevent users from changing this field.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "highlightSelectedOnly",
                label: __("Highlight selected only", TEXT_DOMAIN),
                checked: Boolean(attributes.highlightSelectedOnly),
                onChange: (highlightSelectedOnly) =>
                  setAttributes({ highlightSelectedOnly }),
                help: __(
                  "Only color the selected symbol instead of all preceding symbols.",
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
            title={__("Rating field", TEXT_DOMAIN)}
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
              {__("Rating field", TEXT_DOMAIN)}
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
