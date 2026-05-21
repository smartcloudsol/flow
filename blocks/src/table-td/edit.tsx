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
import { TABLE_CELL_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface TableCellAttributes {
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
  width?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const ALIGN_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TableCellAttributes;
  setAttributes: (next: Partial<TableCellAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #93c5fd",
            padding: "8px",
            margin: "4px 0",
            backgroundColor: "#eff6ff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Cell Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Column span", TEXT_DOMAIN)}
            type="number"
            value={String(attributes.colSpan ?? 1)}
            onChange={(colSpan) =>
              setAttributes({ colSpan: Math.max(1, Number(colSpan) || 1) })
            }
          />
          <TextControl
            label={__("Row span", TEXT_DOMAIN)}
            type="number"
            value={String(attributes.rowSpan ?? 1)}
            onChange={(rowSpan) =>
              setAttributes({ rowSpan: Math.max(1, Number(rowSpan) || 1) })
            }
          />
          <SelectControl
            label={__("Align", TEXT_DOMAIN)}
            value={attributes.align ?? "left"}
            options={ALIGN_OPTIONS}
            onChange={(align) =>
              setAttributes({ align: align as TableCellAttributes["align"] })
            }
          />
          <TextControl
            label={__("Width", TEXT_DOMAIN)}
            value={attributes.width ?? ""}
            onChange={(width) => setAttributes({ width })}
            help={__("Examples: 160px, 25%, 12rem.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<TableCellAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Table.Td", TEXT_DOMAIN)}
            summary={__("Hidden content cell", TEXT_DOMAIN)}
            borderColor="#93c5fd"
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
              {__("Content cell", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={TABLE_CELL_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
