import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { LIST_ITEM_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface ListItemAttributes {
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: ListItemAttributes;
  setAttributes: (next: Partial<ListItemAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            borderLeft: "3px solid #16a34a",
            padding: "8px 12px",
            margin: "6px 0",
            backgroundColor: "#ffffff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("List Item Settings", TEXT_DOMAIN)}>
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<ListItemAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("List.Item", TEXT_DOMAIN)}
            summary={__("Hidden list item", TEXT_DOMAIN)}
            borderColor="#16a34a"
            backgroundColor="#f0fdf4"
            titleColor="#15803d"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#166534",
                marginBottom: "6px",
              }}
            >
              {__("List item", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={LIST_ITEM_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
