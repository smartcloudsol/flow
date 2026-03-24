import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { parseOptions } from "../shared/field-utils";
import { OptionsSourceEditor } from "../shared/options-source-editor";
import type { SelectFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: SelectFieldAttributes;
  setAttributes: (next: Partial<SelectFieldAttributes>) => void;
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
        <PanelBody title={__("Select Field Settings", TEXT_DOMAIN)}>
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
            value={attributes.placeholder || ""}
            onChange={(placeholder) => setAttributes({ placeholder })}
            help={__("Placeholder text shown inside the select.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Required", TEXT_DOMAIN)}
            checked={Boolean(attributes.required)}
            onChange={(required) => setAttributes({ required })}
            help={__("Mark this field as required.", TEXT_DOMAIN)}
          />

          <OptionsSourceEditor
            value={{
              optionsSource: attributes.optionsSource || "static",
              options,
              apiEndpoint: attributes.apiEndpoint,
              apiMethod: attributes.apiMethod,
              apiHeaders: attributes.apiHeaders,
              apiParams: attributes.apiParams,
              apiResponsePath: attributes.apiResponsePath,
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
                cacheEnabled: next.cacheEnabled,
                cacheTTL: next.cacheTTL,
                autocompleteMinChars: next.autocompleteMinChars,
                autocompleteDebounce: next.autocompleteDebounce,
                searchParam: next.searchParam,
              })
            }
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
            title={__("Select field", TEXT_DOMAIN)}
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
              {__("Select field", TEXT_DOMAIN)}
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
