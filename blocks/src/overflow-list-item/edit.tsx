import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { OVERFLOW_LIST_ITEM_CHILD_BLOCKS } from "../shared/form-child-blocks";

interface OverflowListItemAttributes {
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: OverflowListItemAttributes;
  setAttributes: (next: Partial<OverflowListItemAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #14b8a6",
            borderRadius: "999px",
            padding: "8px 12px",
            margin: "4px 0",
            backgroundColor: "#ffffff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("OverflowList Item Settings", TEXT_DOMAIN)}>
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<OverflowListItemAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("OverflowList.Item", TEXT_DOMAIN)}
            summary={__("Hidden inline item", TEXT_DOMAIN)}
            borderColor="#14b8a6"
            backgroundColor="#f0fdfa"
            titleColor="#0f766e"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#0f766e",
                marginBottom: "6px",
              }}
            >
              {__("Overflow item", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={
                OVERFLOW_LIST_ITEM_CHILD_BLOCKS as unknown as string[]
              }
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
