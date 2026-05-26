import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { useNestedFlowChildBlocks } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { ConditionalAttributes } from "../shared/types";

interface FieldsetAttributes extends ConditionalAttributes {
  legend?: string;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: FieldsetAttributes;
  setAttributes: (next: Partial<FieldsetAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const allowedBlocks = useNestedFlowChildBlocks(clientId);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px solid #99c",
            padding: "16px",
            margin: "8px 0",
            backgroundColor: "#fafbff",
            borderRadius: "4px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Fieldset Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Legend", TEXT_DOMAIN)}
            value={attributes.legend ?? ""}
            onChange={(legend) => setAttributes({ legend })}
            help={__("Fieldset legend text.", TEXT_DOMAIN)}
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
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Fieldset", TEXT_DOMAIN)}
            summary={attributes.legend || __("(no legend)", TEXT_DOMAIN)}
            borderColor="#99c"
            backgroundColor="#fafbff"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#666",
                marginBottom: "8px",
              }}
            >
              {attributes.legend || __("(no legend)", TEXT_DOMAIN)}
            </div>
            <InnerBlocks allowedBlocks={allowedBlocks as unknown as string[]} />
          </>
        )}
      </div>
    </>
  );
}
