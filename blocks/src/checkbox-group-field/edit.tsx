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
import { parseOptions } from "../shared/field-utils";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";
import { OptionsSourceEditor } from "../shared/options-source-editor";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { CheckboxGroupFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: CheckboxGroupFieldAttributes;
  setAttributes: (next: Partial<CheckboxGroupFieldAttributes>) => void;
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

  const options = parseOptions(attributes.optionsText);

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
        <PanelBody title={__("Checkbox Group Settings", TEXT_DOMAIN)}>
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
            help={__("Controls the option size and spacing.", TEXT_DOMAIN)}
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
                help: __("Require at least one selected option.", TEXT_DOMAIN),
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
            ]}
          />
        </PanelBody>
        <PanelBody title={__("Options", TEXT_DOMAIN)} initialOpen={true}>
          <OptionsSourceEditor
            value={{
              optionsSource: attributes.optionsSource || "static",
              options,
              apiEndpoint: attributes.apiEndpoint,
              apiMethod: attributes.apiMethod,
              apiHeaders: attributes.apiHeaders,
              apiParams: attributes.apiParams,
              apiResponsePath: attributes.apiResponsePath,
              apiLabelPath: attributes.apiLabelPath,
              apiValuePath: attributes.apiValuePath,
              apiSelectedPath: attributes.apiSelectedPath,
              apiSelectedValue: attributes.apiSelectedValue,
              cacheEnabled: attributes.cacheEnabled,
              cacheTTL: attributes.cacheTTL,
              autocompleteMinChars: attributes.autocompleteMinChars,
              autocompleteDebounce: attributes.autocompleteDebounce,
              searchParam: attributes.searchParam,
            }}
            onChange={(next) =>
              setAttributes({
                optionsSource: next.optionsSource,
                optionsText: (next.options || [])
                  .map((opt) => `${opt.label}|${opt.value}`)
                  .join("\n"),
                apiEndpoint: next.apiEndpoint,
                apiMethod: next.apiMethod,
                apiHeaders: next.apiHeaders,
                apiParams: next.apiParams,
                apiResponsePath: next.apiResponsePath,
                apiLabelPath: next.apiLabelPath,
                apiValuePath: next.apiValuePath,
                apiSelectedPath: next.apiSelectedPath,
                apiSelectedValue: next.apiSelectedValue,
                cacheEnabled: next.cacheEnabled,
                cacheTTL: next.cacheTTL,
                autocompleteMinChars: next.autocompleteMinChars,
                autocompleteDebounce: next.autocompleteDebounce,
                searchParam: next.searchParam,
              })
            }
          />
          {attributes.optionsSource === "api" && (
            <>
              <ToggleControl
                label={__("Show clear all option", TEXT_DOMAIN)}
                checked={Boolean(attributes.clearAllEnabled)}
                onChange={(clearAllEnabled) =>
                  setAttributes({ clearAllEnabled })
                }
                help={__(
                  "Append a special option after the loaded API values that clears every selected checkbox.",
                  TEXT_DOMAIN,
                )}
              />
              {attributes.clearAllEnabled && (
                <>
                  <TextControl
                    label={__("Clear all label", TEXT_DOMAIN)}
                    value={attributes.clearAllLabel ?? ""}
                    onChange={(clearAllLabel) =>
                      setAttributes({ clearAllLabel })
                    }
                    help={__(
                      "Visible label for the clear all option.",
                      TEXT_DOMAIN,
                    )}
                  />
                  <TextControl
                    label={__("Clear all value", TEXT_DOMAIN)}
                    value={attributes.clearAllValue ?? ""}
                    onChange={(clearAllValue) =>
                      setAttributes({ clearAllValue })
                    }
                    help={__(
                      "Internal value for the clear all option. Use a unique value that does not collide with API results.",
                      TEXT_DOMAIN,
                    )}
                  />
                </>
              )}
            </>
          )}
          <TextareaControl
            label={__("Exclusive Option Values", TEXT_DOMAIN)}
            value={attributes.exclusiveValuesText ?? ""}
            onChange={(exclusiveValuesText) =>
              setAttributes({ exclusiveValuesText })
            }
            help={__(
              "Comma or newline separated option values that must be mutually exclusive. Selecting one clears every other checkbox, and selecting another checkbox clears the exclusive selection.",
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
            title={__("Checkbox group", TEXT_DOMAIN)}
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
              {__("Checkbox group", TEXT_DOMAIN)}
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
