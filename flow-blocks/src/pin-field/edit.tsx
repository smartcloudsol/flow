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
  INPUT_MODE_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { PinFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: PinFieldAttributes;
  setAttributes: (next: Partial<PinFieldAttributes>) => void;
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
        <PanelBody title={__("PIN Field Settings", TEXT_DOMAIN)}>
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
            label={__("PIN length", TEXT_DOMAIN)}
            value={attributes.length ?? 4}
            onChange={(value) =>
              setAttributes({ length: value ? Number(value) : 4 })
            }
            help={__("Number of PIN digits.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__("Controls the input size and spacing.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={attributes.gap ?? "md"}
            options={SIZE_OPTIONS}
            onChange={(gap) => setAttributes({ gap: gap || undefined })}
            help={__("Spacing between individual PIN boxes.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Input type", TEXT_DOMAIN)}
            value={attributes.inputType ?? attributes.type ?? "number"}
            onChange={(inputType) =>
              setAttributes({
                inputType: inputType as "number" | "alphanumeric",
              })
            }
            options={[
              { label: __("Number", TEXT_DOMAIN), value: "number" },
              { label: __("Alphanumeric", TEXT_DOMAIN), value: "alphanumeric" },
            ]}
            help={__("Type of characters allowed.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Input mode", TEXT_DOMAIN)}
            value={attributes.inputMode ?? "numeric"}
            options={INPUT_MODE_OPTIONS}
            onChange={(inputMode) =>
              setAttributes({
                inputMode: inputMode as PinFieldAttributes["inputMode"],
              })
            }
            help={__(
              "Hints the preferred mobile keyboard layout.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Placeholder", TEXT_DOMAIN)}
            value={attributes.placeholder ?? ""}
            onChange={(placeholder) => setAttributes({ placeholder })}
            help={__(
              "Placeholder text shown inside each PIN box.",
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
                key: "mask",
                label: __("Mask input", TEXT_DOMAIN),
                checked: attributes.mask ?? true,
                onChange: (mask) => setAttributes({ mask }),
                help: __("Hide PIN characters as the user types.", TEXT_DOMAIN),
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
        <ConditionalLogicPanel
          attributes={attributes}
          setAttributes={setAttributes}
          clientId={clientId}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("PIN field", TEXT_DOMAIN)}
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
              {__("PIN field", TEXT_DOMAIN)}
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
