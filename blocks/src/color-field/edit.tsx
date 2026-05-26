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
  parseDelimitedList,
  serializeDelimitedList,
} from "../shared/mantine-prop-utils";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { ColorFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: ColorFieldAttributes;
  setAttributes: (next: Partial<ColorFieldAttributes>) => void;
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
        <PanelBody title={__("Color Field Settings", TEXT_DOMAIN)}>
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
            label={__("Color format", TEXT_DOMAIN)}
            value={attributes.format ?? "hex"}
            onChange={(format) =>
              setAttributes({
                format: format as "hex" | "rgb" | "rgba" | "hsl" | "hsla",
              })
            }
            options={[
              { label: __("HEX", TEXT_DOMAIN), value: "hex" },
              { label: __("RGB", TEXT_DOMAIN), value: "rgb" },
              { label: __("RGBA", TEXT_DOMAIN), value: "rgba" },
              { label: __("HSL", TEXT_DOMAIN), value: "hsl" },
              { label: __("HSLA", TEXT_DOMAIN), value: "hsla" },
            ]}
            help={__("Output color format.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size: size || undefined })}
            help={__("Controls the picker size and spacing.", TEXT_DOMAIN)}
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
                key: "disabled",
                label: __("Disabled", TEXT_DOMAIN),
                checked: Boolean(attributes.disabled),
                onChange: (disabled) => setAttributes({ disabled }),
                help: __(
                  "Prevent users from changing the color value.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withPicker",
                label: __("Color picker", TEXT_DOMAIN),
                checked: attributes.withPicker ?? true,
                onChange: (withPicker) => setAttributes({ withPicker }),
                help: __(
                  "Show the interactive color picker dropdown.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "pointer",
                label: __("Pointer cursor", TEXT_DOMAIN),
                checked: Boolean(attributes.pointer),
                onChange: (pointer) => setAttributes({ pointer }),
                help: __(
                  "Use a pointer cursor when hovering the picker.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "closeOnColorSwatchClick",
                label: __("Close on swatch click", TEXT_DOMAIN),
                checked: Boolean(attributes.closeOnColorSwatchClick),
                onChange: (closeOnColorSwatchClick) =>
                  setAttributes({ closeOnColorSwatchClick }),
                help: __(
                  "Close the picker immediately after choosing a swatch.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "disallowInput",
                label: __("Disallow input", TEXT_DOMAIN),
                checked: Boolean(attributes.disallowInput),
                onChange: (disallowInput) => setAttributes({ disallowInput }),
                help: __(
                  "Disable manual text entry for color values.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withEyeDropper",
                label: __("Eye dropper", TEXT_DOMAIN),
                checked: Boolean(attributes.withEyeDropper),
                onChange: (withEyeDropper) => setAttributes({ withEyeDropper }),
                help: __(
                  "Show the eye dropper tool when supported by the browser.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withPreview",
                label: __("Preview", TEXT_DOMAIN),
                checked: attributes.withPreview ?? true,
                onChange: (withPreview) => setAttributes({ withPreview }),
                help: __(
                  "Show a live preview of the currently selected color.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "required",
                label: __("Required", TEXT_DOMAIN),
                checked: Boolean(attributes.required),
                onChange: (required) => setAttributes({ required }),
                help: __("Mark this field as required.", TEXT_DOMAIN),
              },
            ]}
          />
          <TextareaControl
            label={__("Swatches", TEXT_DOMAIN)}
            value={serializeDelimitedList(attributes.swatches)}
            onChange={(value) =>
              setAttributes({ swatches: parseDelimitedList(value) })
            }
            help={__("Comma or newline separated color values.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Swatches per row", TEXT_DOMAIN)}
            value={attributes.swatchesPerRow}
            onChange={(value) =>
              setAttributes({
                swatchesPerRow: value ? Number(value) : undefined,
              })
            }
            help={__("How many swatches to show in each row.", TEXT_DOMAIN)}
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
            title={__("Color field", TEXT_DOMAIN)}
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
              {__("Color field", TEXT_DOMAIN)}
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
