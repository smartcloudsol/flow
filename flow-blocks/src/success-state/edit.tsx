import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InspectorControls,
  InnerBlocks,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

interface SuccessStateAttributes {
  trigger?: "submit-success" | "ai-accepted";
}

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: SuccessStateAttributes;
  setAttributes: (next: Partial<SuccessStateAttributes>) => void;
}) {
  const trigger = attributes.trigger || "submit-success";

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Success State Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Show this state when", TEXT_DOMAIN)}
            value={trigger}
            options={[
              {
                label: __("Form was submitted", TEXT_DOMAIN),
                value: "submit-success",
              },
              {
                label: __("AI suggestion was accepted", TEXT_DOMAIN),
                value: "ai-accepted",
              },
            ]}
            onChange={(value) =>
              setAttributes({
                trigger: value as "submit-success" | "ai-accepted",
              })
            }
            help={__(
              "Choose which final state should render this content.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
      </InspectorControls>
      <div
        {...useBlockProps({
          style: {
            border: "1px dashed #2f9e44",
            borderRadius: "6px",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#f4fff6",
          },
        })}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "#2f9e44",
          }}
        >
          {trigger === "ai-accepted"
            ? __("AI accepted state content", TEXT_DOMAIN)
            : __("Success state content", TEXT_DOMAIN)}
        </div>
        <InnerBlocks />
      </div>
    </>
  );
}
