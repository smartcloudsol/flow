import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { FORM_CHILD_BLOCKS } from "../shared/form-child-blocks";

interface WizardStepAttributes {
  title?: string;
  description?: string;
}

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: WizardStepAttributes;
  setAttributes: (next: Partial<WizardStepAttributes>) => void;
}) {
  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Step Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Step Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
            help={__("Title for this step", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Step Description", TEXT_DOMAIN)}
            value={attributes.description ?? ""}
            onChange={(description) => setAttributes({ description })}
            help={__("Optional description", TEXT_DOMAIN)}
          />
        </PanelBody>
      </InspectorControls>
      <div
        {...useBlockProps({
          style: {
            border: "1px dashed #667eea",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#fff",
            borderRadius: "4px",
          },
        })}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#667eea",
            marginBottom: "8px",
          }}
        >
          📄 {attributes.title || __("Step", TEXT_DOMAIN)}
        </div>
        {attributes.description && (
          <div
            style={{
              fontSize: "11px",
              color: "#666",
              marginBottom: "8px",
            }}
          >
            {attributes.description}
          </div>
        )}
        <div style={{ paddingLeft: "12px" }}>
          <InnerBlocks
            allowedBlocks={FORM_CHILD_BLOCKS as unknown as string[]}
          />
        </div>
      </div>
    </>
  );
}
