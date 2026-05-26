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

interface TableHeaderAttributes {
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
  width?: string;
  scope?: "col" | "row";
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const ALIGN_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

const SCOPE_OPTIONS = [
  { label: __("Column", TEXT_DOMAIN), value: "col" },
  { label: __("Row", TEXT_DOMAIN), value: "row" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TableHeaderAttributes;
  setAttributes: (next: Partial<TableHeaderAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #2563eb",
            padding: "8px",
            margin: "4px 0",
            backgroundColor: "#dbeafe",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Header Cell Settings", TEXT_DOMAIN)}>
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
              setAttributes({ align: align as TableHeaderAttributes["align"] })
            }
          />
          <SelectControl
            label={__("Scope", TEXT_DOMAIN)}
            value={attributes.scope ?? "col"}
            options={SCOPE_OPTIONS}
            onChange={(scope) =>
              setAttributes({ scope: scope as TableHeaderAttributes["scope"] })
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
            setAttributes(next as Partial<TableHeaderAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Table.Th", TEXT_DOMAIN)}
            summary={__("Hidden header cell", TEXT_DOMAIN)}
            borderColor="#2563eb"
            backgroundColor="#dbeafe"
            titleColor="#1d4ed8"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#1d4ed8",
                marginBottom: "6px",
              }}
            >
              {__("Header cell", TEXT_DOMAIN)}
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
