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
  LOADING_POSITION_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { PasswordFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: PasswordFieldAttributes;
  setAttributes: (next: Partial<PasswordFieldAttributes>) => void;
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
        <PanelBody title={__("Password Field Settings", TEXT_DOMAIN)}>
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
                key: "defaultVisible",
                label: __("Default visible", TEXT_DOMAIN),
                checked: Boolean(attributes.defaultVisible),
                onChange: (defaultVisible) => setAttributes({ defaultVisible }),
                help: __(
                  "Keep the password characters visible when the field first loads.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "visible",
                label: __("Visible by default", TEXT_DOMAIN),
                checked: Boolean(attributes.visible),
                onChange: (visible) => setAttributes({ visible }),
                help: __("Show password by default.", TEXT_DOMAIN),
              },
              {
                key: "loading",
                label: __("Loading state", TEXT_DOMAIN),
                checked: Boolean(attributes.loading),
                onChange: (loading) => setAttributes({ loading }),
                help: __("Render the field in a loading state.", TEXT_DOMAIN),
              },
            ]}
          />
          <SelectControl
            label={__("Loading position", TEXT_DOMAIN)}
            value={attributes.loadingPosition ?? "right"}
            options={LOADING_POSITION_OPTIONS}
            onChange={(loadingPosition) =>
              setAttributes({
                loadingPosition:
                  loadingPosition as PasswordFieldAttributes["loadingPosition"],
              })
            }
            help={__(
              "Places the loading indicator before or after the input text.",
              TEXT_DOMAIN,
            )}
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
            title={__("Password field", TEXT_DOMAIN)}
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
              {__("Password field", TEXT_DOMAIN)}
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
