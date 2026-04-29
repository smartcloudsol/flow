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
import { TABLE_ROW_CHILD_BLOCKS } from "../shared/form-child-blocks";

interface TableRowAttributes {
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TableRowAttributes;
  setAttributes: (next: Partial<TableRowAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #60a5fa",
            padding: "8px",
            margin: "6px 0",
            backgroundColor: "#ffffff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Table Row Settings", TEXT_DOMAIN)}>
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<TableRowAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Table.Tr", TEXT_DOMAIN)}
            summary={__("Hidden table row", TEXT_DOMAIN)}
            borderColor="#60a5fa"
            backgroundColor="#eff6ff"
            titleColor="#2563eb"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#2563eb",
                marginBottom: "6px",
              }}
            >
              {__("Table row", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={TABLE_ROW_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
