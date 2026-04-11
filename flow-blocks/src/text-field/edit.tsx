import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  __experimentalNumberControl as NumberControl,
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { TextFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TextFieldAttributes;
  setAttributes: (next: Partial<TextFieldAttributes>) => void;
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
        <PanelBody title={__("Text Field Settings", TEXT_DOMAIN)}>
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
              {
                key: "pointer",
                label: __("Pointer cursor", TEXT_DOMAIN),
                checked: Boolean(attributes.pointer),
                onChange: (pointer) => setAttributes({ pointer }),
                help: __(
                  "Use a pointer cursor when hovering the input.",
                  TEXT_DOMAIN,
                ),
              },
            ]}
          />
        </PanelBody>
        <PanelBody title={__("Validation", TEXT_DOMAIN)} initialOpen={false}>
          <SelectControl
            label={__("Validation Type", TEXT_DOMAIN)}
            value={attributes.validationType || "none"}
            onChange={(validationType) => setAttributes({ validationType })}
            options={[
              { label: __("None", TEXT_DOMAIN), value: "none" },
              { label: __("Email", TEXT_DOMAIN), value: "email" },
              { label: __("URL", TEXT_DOMAIN), value: "url" },
              { label: __("Phone", TEXT_DOMAIN), value: "phone" },
              { label: __("Numeric", TEXT_DOMAIN), value: "numeric" },
              { label: __("Alphanumeric", TEXT_DOMAIN), value: "alphanumeric" },
              { label: __("Custom Pattern", TEXT_DOMAIN), value: "custom" },
            ]}
            help={__("Select a validation type for this field.", TEXT_DOMAIN)}
          />
          {attributes.validationType === "custom" && (
            <>
              <TextControl
                label={__("Custom Regex Pattern", TEXT_DOMAIN)}
                value={attributes.validationPattern || ""}
                onChange={(validationPattern) =>
                  setAttributes({ validationPattern })
                }
                help={__(
                  'Enter a regex pattern (e.g., "^\\d{4}$" for 4 digits).',
                  TEXT_DOMAIN,
                )}
              />
              <TextControl
                label={__("Custom Error Message", TEXT_DOMAIN)}
                value={attributes.validationMessage || ""}
                onChange={(validationMessage) =>
                  setAttributes({ validationMessage })
                }
                help={__(
                  "Error message shown when validation fails.",
                  TEXT_DOMAIN,
                )}
              />
            </>
          )}
          <NumberControl
            label={__("Minimum Length", TEXT_DOMAIN)}
            value={attributes.minLength}
            onChange={(value) =>
              setAttributes({ minLength: value ? parseInt(value) : undefined })
            }
            help={__("Minimum number of characters (optional).", TEXT_DOMAIN)}
            min={0}
          />
          <NumberControl
            label={__("Maximum Length", TEXT_DOMAIN)}
            value={attributes.maxLength}
            onChange={(value) =>
              setAttributes({ maxLength: value ? parseInt(value) : undefined })
            }
            help={__("Maximum number of characters (optional).", TEXT_DOMAIN)}
            min={0}
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
            title={__("Text field", TEXT_DOMAIN)}
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
              {__("Text field", TEXT_DOMAIN)}
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
