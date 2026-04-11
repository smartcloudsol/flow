import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  store as blockEditorStore,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
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
  FLOW_ICON_OPTIONS,
  LABEL_POSITION_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { SwitchFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: SwitchFieldAttributes;
  setAttributes: (next: Partial<SwitchFieldAttributes>) => void;
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
        <PanelBody title={__("Switch Field Settings", TEXT_DOMAIN)}>
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
            label={__("On label", TEXT_DOMAIN)}
            value={attributes.onLabel ?? ""}
            onChange={(onLabel) => setAttributes({ onLabel })}
            help={__("Text displayed when switch is on.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Off label", TEXT_DOMAIN)}
            value={attributes.offLabel ?? ""}
            onChange={(offLabel) => setAttributes({ offLabel })}
            help={__("Text displayed when switch is off.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__("Controls the switch size and spacing.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Overrides the active switch color.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Label position", TEXT_DOMAIN)}
            value={attributes.labelPosition ?? "right"}
            options={LABEL_POSITION_OPTIONS}
            onChange={(labelPosition) =>
              setAttributes({
                labelPosition:
                  labelPosition as SwitchFieldAttributes["labelPosition"],
              })
            }
            help={__(
              "Places the label to the left or right of the switch.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Thumb icon", TEXT_DOMAIN)}
            value={attributes.thumbIcon ?? ""}
            options={FLOW_ICON_OPTIONS}
            onChange={(thumbIcon) =>
              setAttributes({ thumbIcon: thumbIcon || undefined })
            }
            help={__(
              "Selects the icon displayed inside the switch thumb.",
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
                help: __(
                  "Prevent users from changing this field.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withThumbIndicator",
                label: __("Thumb indicator", TEXT_DOMAIN),
                checked: Boolean(attributes.withThumbIndicator),
                onChange: (withThumbIndicator) =>
                  setAttributes({ withThumbIndicator }),
                help: __(
                  "Show a visual indicator inside the switch thumb.",
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
            title={__("Switch field", TEXT_DOMAIN)}
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
              {__("Switch field", TEXT_DOMAIN)}
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
