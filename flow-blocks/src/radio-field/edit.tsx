import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  store as blockEditorStore,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  Button,
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
import { parseOptions } from "../shared/field-utils";
import type { RadioFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: RadioFieldAttributes;
  setAttributes: (next: Partial<RadioFieldAttributes>) => void;
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

  const addOption = () => {
    let idx = 1;
    const name = "option";
    while (options && options.some((opt) => opt.label === name + idx)) idx++;
    const newLabel = name + idx;
    const newOptionsText =
      (attributes.optionsText || "") +
      (attributes.optionsText ? "\n" : "") +
      `${newLabel}|${newLabel}`;
    setAttributes({ optionsText: newOptionsText });
  };

  const updateOption = (index: number, label: string, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { label, value };
    const newOptionsText = newOptions
      .map((opt) => `${opt.label}|${opt.value}`)
      .join("\n");
    setAttributes({ optionsText: newOptionsText });
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    const newOptionsText = newOptions
      .map((opt) => `${opt.label}|${opt.value}`)
      .join("\n");
    setAttributes({ optionsText: newOptionsText });
  };

  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Radio Field Settings", TEXT_DOMAIN)}>
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
        <PanelBody title={__("Options", TEXT_DOMAIN)} initialOpen={true}>
          <div style={{ marginBottom: "12px" }}>
            {options.map((option, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "8px",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <TextControl
                  label={__("Label", TEXT_DOMAIN)}
                  value={option.label}
                  onChange={(label) => updateOption(index, label, option.value)}
                />
                <TextControl
                  label={__("Value", TEXT_DOMAIN)}
                  value={option.value}
                  onChange={(value) => updateOption(index, option.label, value)}
                />
                <Button
                  isDestructive
                  variant="secondary"
                  onClick={() => removeOption(index)}
                >
                  {__("Remove", TEXT_DOMAIN)}
                </Button>
              </div>
            ))}
          </div>
          <Button variant="primary" onClick={addOption}>
            {__("Add option", TEXT_DOMAIN)}
          </Button>
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
            title={__("Radio field", TEXT_DOMAIN)}
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
              {__("Radio field", TEXT_DOMAIN)}
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
