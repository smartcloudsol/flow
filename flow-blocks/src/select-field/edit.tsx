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
import { parseOptions } from "../shared/field-utils";
import { OptionsSourceEditor } from "../shared/options-source-editor";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
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
          <TextControl
            label={__("Chevron color", TEXT_DOMAIN)}
            value={attributes.chevronColor ?? ""}
            onChange={(chevronColor) => setAttributes({ chevronColor })}
            help={__("Overrides the dropdown icon color.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Limit", TEXT_DOMAIN)}
            value={attributes.limit}
            onChange={(value) =>
              setAttributes({ limit: value ? Number(value) : undefined })
            }
            help={__("Limits how many options are shown at once.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
          <ToggleSettingsSection
            visibleCount={4}
            items={[
              {
                key: "required",
                label: __("Required", TEXT_DOMAIN),
                checked: Boolean(attributes.required),
                onChange: (required) => setAttributes({ required }),
                help: __("Mark this field as required.", TEXT_DOMAIN),
              },
              {
                key: "searchable",
                label: __("Searchable", TEXT_DOMAIN),
                checked: Boolean(attributes.searchable),
                onChange: (searchable) => setAttributes({ searchable }),
                help: __(
                  "Allow users to search within the options list.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "clearable",
                label: __("Clearable", TEXT_DOMAIN),
                checked: Boolean(attributes.clearable),
                onChange: (clearable) => setAttributes({ clearable }),
                help: __("Allow clearing the current selection.", TEXT_DOMAIN),
              },
              {
                key: "disabled",
                label: __("Disabled", TEXT_DOMAIN),
                checked: Boolean(attributes.disabled),
                onChange: (disabled) => setAttributes({ disabled }),
                help: __("Prevent users from editing this field.", TEXT_DOMAIN),
              },
              {
                key: "multiple",
                label: __("Multiple", TEXT_DOMAIN),
                checked: Boolean(attributes.multiple),
                onChange: (multiple) => setAttributes({ multiple }),
                help: __(
                  "Store the selected values as an array instead of a single value.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "allowDeselect",
                label: __("Allow deselect", TEXT_DOMAIN),
                checked: attributes.allowDeselect ?? true,
                onChange: (allowDeselect) => setAttributes({ allowDeselect }),
                help: __(
                  "Allow clicking the active option again to clear it.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "autoSelectOnBlur",
                label: __("Auto select on blur", TEXT_DOMAIN),
                checked: Boolean(attributes.autoSelectOnBlur),
                onChange: (autoSelectOnBlur) =>
                  setAttributes({ autoSelectOnBlur }),
                help: __(
                  "Select the highlighted option when the field loses focus.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "defaultDropdownOpened",
                label: __("Default dropdown opened", TEXT_DOMAIN),
                checked: Boolean(attributes.defaultDropdownOpened),
                onChange: (defaultDropdownOpened) =>
                  setAttributes({ defaultDropdownOpened }),
                help: __(
                  "Open the options dropdown immediately on initial render.",
                  TEXT_DOMAIN,
                ),
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
              {
                key: "selectFirstOptionOnChange",
                label: __("Select first option on change", TEXT_DOMAIN),
                checked: Boolean(attributes.selectFirstOptionOnChange),
                onChange: (selectFirstOptionOnChange) =>
                  setAttributes({ selectFirstOptionOnChange }),
                help: __(
                  "Automatically pick the first matching option after search changes.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withAlignedLabels",
                label: __("Aligned labels", TEXT_DOMAIN),
                checked: Boolean(attributes.withAlignedLabels),
                onChange: (withAlignedLabels) =>
                  setAttributes({ withAlignedLabels }),
                help: __(
                  "Align option labels in a fixed-width layout.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withCheckIcon",
                label: __("Check icon", TEXT_DOMAIN),
                checked: attributes.withCheckIcon ?? true,
                onChange: (withCheckIcon) => setAttributes({ withCheckIcon }),
                help: __(
                  "Show a check icon next to selected options.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "withScrollArea",
                label: __("Scroll area", TEXT_DOMAIN),
                checked: attributes.withScrollArea ?? true,
                onChange: (withScrollArea) => setAttributes({ withScrollArea }),
                help: __(
                  "Wrap long option lists in a scrollable dropdown.",
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
                cacheEnabled: next.cacheEnabled,
                cacheTTL: next.cacheTTL,
                autocompleteMinChars: next.autocompleteMinChars,
                autocompleteDebounce: next.autocompleteDebounce,
                searchParam: next.searchParam,
              })
            }
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
