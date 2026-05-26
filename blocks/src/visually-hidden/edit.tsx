import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { useNestedFlowChildBlocks } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface VisuallyHiddenAttributes {
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: VisuallyHiddenAttributes;
  setAttributes: (next: Partial<VisuallyHiddenAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const allowedBlocks = useNestedFlowChildBlocks(clientId);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #f90",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#fff9f0",
            borderRadius: "4px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Visually Hidden Settings", TEXT_DOMAIN)}>
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<VisuallyHiddenAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Visually Hidden", TEXT_DOMAIN)}
            summary={__("Only visible for screen readers.", TEXT_DOMAIN)}
            borderColor="#f90"
            backgroundColor="#fff9f0"
            titleColor="#c77700"
          />
        ) : (
          <>
            <div
              style={{ fontSize: "11px", color: "#f90", marginBottom: "8px" }}
            >
              {__(
                "⚠️ Visually Hidden (only visible for screen readers)",
                TEXT_DOMAIN,
              )}
            </div>
            <InnerBlocks allowedBlocks={allowedBlocks as unknown as string[]} />
          </>
        )}
      </div>
    </>
  );
}
