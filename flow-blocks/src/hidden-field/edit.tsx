import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { HiddenFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: HiddenFieldAttributes;
  setAttributes: (next: Partial<HiddenFieldAttributes>) => void;
  clientId: string;
}) {
  const summaryParts = [attributes.name, attributes.defaultValue]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Hidden Field Settings", TEXT_DOMAIN)}>
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
            label={__("Default value", TEXT_DOMAIN)}
            value={attributes.defaultValue ?? ""}
            onChange={(defaultValue) => setAttributes({ defaultValue })}
            help={__(
              "Optional default value sent with the form unless overwritten from JS/store.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Hidden by conditional logic", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__(
              "Keeps this field disabled/hidden in conditional state processing.",
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
        <HiddenBlockPreview
          title={__("Hidden field", TEXT_DOMAIN)}
          summary={
            summaryParts.length > 0
              ? summaryParts.join(" = ")
              : __("(unnamed)", TEXT_DOMAIN)
          }
        />
      </div>
    </>
  );
}
