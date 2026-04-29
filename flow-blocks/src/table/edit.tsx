import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { TABLE_CHILD_BLOCKS } from "../shared/form-child-blocks";
import type { ConditionalAttributes } from "../shared/types";

interface TableAttributes extends ConditionalAttributes {
  caption?: string;
  striped?: boolean;
  withTableBorder?: boolean;
  withColumnBorders?: boolean;
  horizontalSpacing?: string;
  verticalSpacing?: string;
}

const SPACING_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TableAttributes;
  setAttributes: (next: Partial<TableAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #2563eb",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#eff6ff",
            borderRadius: "6px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Table Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Caption", TEXT_DOMAIN)}
            value={attributes.caption ?? ""}
            onChange={(caption) => setAttributes({ caption })}
          />
          <SelectControl
            label={__("Horizontal spacing", TEXT_DOMAIN)}
            value={attributes.horizontalSpacing ?? "sm"}
            options={SPACING_OPTIONS}
            onChange={(horizontalSpacing) =>
              setAttributes({ horizontalSpacing })
            }
          />
          <SelectControl
            label={__("Vertical spacing", TEXT_DOMAIN)}
            value={attributes.verticalSpacing ?? "xs"}
            options={SPACING_OPTIONS}
            onChange={(verticalSpacing) => setAttributes({ verticalSpacing })}
          />
          <ToggleControl
            label={__("Striped rows", TEXT_DOMAIN)}
            checked={Boolean(attributes.striped)}
            onChange={(striped) => setAttributes({ striped })}
          />
          <ToggleControl
            label={__("Table border", TEXT_DOMAIN)}
            checked={attributes.withTableBorder ?? true}
            onChange={(withTableBorder) => setAttributes({ withTableBorder })}
          />
          <ToggleControl
            label={__("Column borders", TEXT_DOMAIN)}
            checked={Boolean(attributes.withColumnBorders)}
            onChange={(withColumnBorders) =>
              setAttributes({ withColumnBorders })
            }
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
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
            title={__("Table", TEXT_DOMAIN)}
            summary={
              attributes.caption || __("Hidden content table", TEXT_DOMAIN)
            }
            borderColor="#2563eb"
            backgroundColor="#eff6ff"
            titleColor="#1d4ed8"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#1d4ed8",
                marginBottom: "8px",
              }}
            >
              {attributes.caption || __("Table", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={TABLE_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
