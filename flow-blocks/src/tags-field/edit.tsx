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
import { parseOptions } from "../shared/field-utils";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import {
  LOADING_POSITION_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import { OptionsSourceEditor } from "../shared/options-source-editor";
import { ToggleSettingsSection } from "../shared/ToggleSettingsSection";
import type { TagsFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TagsFieldAttributes;
  setAttributes: (next: Partial<TagsFieldAttributes>) => void;
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
        <PanelBody title={__("Tags Field Settings", TEXT_DOMAIN)}>
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
          <TextControl
            label={__("Split characters", TEXT_DOMAIN)}
            value={attributes.splitChars ?? ","}
            onChange={(splitChars) => setAttributes({ splitChars })}
            help={__("Characters that split tags (e.g., comma).", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Max tags", TEXT_DOMAIN)}
            value={attributes.maxTags}
            onChange={(value) =>
              setAttributes({ maxTags: value ? Number(value) : undefined })
            }
            help={__("Maximum number of tags allowed.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Limit", TEXT_DOMAIN)}
            value={attributes.limit}
            onChange={(value) =>
              setAttributes({ limit: value ? Number(value) : undefined })
            }
            help={__(
              "Limits how many suggestions are shown at once.",
              TEXT_DOMAIN,
            )}
          />
          <NumberControl
            label={__("Max dropdown height", TEXT_DOMAIN)}
            value={attributes.maxDropdownHeight}
            onChange={(value) =>
              setAttributes({
                maxDropdownHeight: value ? Number(value) : undefined,
              })
            }
            help={__(
              "Maximum height of the suggestions dropdown in pixels.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Loading position", TEXT_DOMAIN)}
            value={attributes.loadingPosition ?? "right"}
            options={LOADING_POSITION_OPTIONS}
            onChange={(loadingPosition) =>
              setAttributes({
                loadingPosition:
                  loadingPosition as TagsFieldAttributes["loadingPosition"],
              })
            }
            help={__(
              "Places the loading indicator before or after the input text.",
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
            visibleCount={3}
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
                key: "loading",
                label: __("Loading", TEXT_DOMAIN),
                checked: Boolean(attributes.loading),
                onChange: (loading) => setAttributes({ loading }),
                help: __("Show the component in a loading state.", TEXT_DOMAIN),
              },
              {
                key: "acceptValueOnBlur",
                label: __("Accept value on blur", TEXT_DOMAIN),
                checked: attributes.acceptValueOnBlur ?? true,
                onChange: (acceptValueOnBlur) =>
                  setAttributes({ acceptValueOnBlur }),
                help: __(
                  "Turn the current input into a tag when the field loses focus.",
                  TEXT_DOMAIN,
                ),
              },
              {
                key: "allowDuplicates",
                label: __("Allow duplicates", TEXT_DOMAIN),
                checked: Boolean(attributes.allowDuplicates),
                onChange: (allowDuplicates) =>
                  setAttributes({ allowDuplicates }),
                help: __(
                  "Allow the same tag to be added more than once.",
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
                key: "withScrollArea",
                label: __("Scroll area", TEXT_DOMAIN),
                checked: attributes.withScrollArea ?? true,
                onChange: (withScrollArea) => setAttributes({ withScrollArea }),
                help: __(
                  "Wrap long suggestion lists in a scrollable dropdown.",
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
            title={__("Tags field", TEXT_DOMAIN)}
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
              {__("Tags field", TEXT_DOMAIN)}
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
