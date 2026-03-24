import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  store as blockEditorStore,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  __experimentalNumberControl as NumberControl,
  PanelBody,
  TextareaControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { SliderFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: SliderFieldAttributes;
  setAttributes: (next: Partial<SliderFieldAttributes>) => void;
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
        <PanelBody title={__("Slider Field Settings", TEXT_DOMAIN)}>
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
            label={__("Step", TEXT_DOMAIN)}
            value={attributes.step ?? 1}
            onChange={(value) =>
              setAttributes({ step: value ? Number(value) : 1 })
            }
            help={__("Step increment.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show marks", TEXT_DOMAIN)}
            checked={attributes.marks}
            onChange={(marks) => setAttributes({ marks })}
            help={__("Display marks on the slider.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show label on hover", TEXT_DOMAIN)}
            checked={attributes.showLabelOnHover ?? true}
            onChange={(showLabelOnHover) => setAttributes({ showLabelOnHover })}
            help={__("Show value label when hovering.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Required", TEXT_DOMAIN)}
            checked={attributes.required}
            onChange={(required) => setAttributes({ required })}
            help={__("Mark this field as required.", TEXT_DOMAIN)}
          />

          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
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
            title={__("Slider field", TEXT_DOMAIN)}
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
              {__("Slider field", TEXT_DOMAIN)}
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
