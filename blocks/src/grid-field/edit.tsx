import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  RangeControl,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { useNestedFlowChildBlocks } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import {
  GRID_JUSTIFY_OPTIONS,
  GRID_OVERFLOW_OPTIONS,
} from "../shared/mantine-editor-options";
import type { ConditionalAttributes } from "../shared/types";

interface GridFieldAttributes extends ConditionalAttributes {
  columns?: number;
  gutter?: string;
  justify?: string;
  overflow?: string;
  rows?: number;
  spacing?: string;
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
  attributes: GridFieldAttributes;
  setAttributes: (next: Partial<GridFieldAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const allowedBlocks = useNestedFlowChildBlocks(clientId);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #c9c",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#fff0ff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Grid Settings", TEXT_DOMAIN)}>
          <RangeControl
            label={__("Columns", TEXT_DOMAIN)}
            value={attributes.columns}
            onChange={(columns) => setAttributes({ columns })}
            min={1}
            max={4}
            help={__("Number of columns in the grid.", TEXT_DOMAIN)}
          />
          <RangeControl
            label={__("Rows", TEXT_DOMAIN)}
            value={attributes.rows}
            onChange={(rows) => setAttributes({ rows: rows || undefined })}
            min={1}
            max={8}
            help={__(
              "Optional number of grid rows before content wraps.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Gutter", TEXT_DOMAIN)}
            value={attributes.gutter ?? attributes.spacing}
            options={SPACING_OPTIONS}
            onChange={(gutter) => setAttributes({ gutter })}
            help={__("Gap between grid items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Vertical Spacing", TEXT_DOMAIN)}
            value={attributes.verticalSpacing}
            options={SPACING_OPTIONS}
            onChange={(verticalSpacing) => setAttributes({ verticalSpacing })}
            help={__("Vertical spacing between grid rows.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Justify", TEXT_DOMAIN)}
            value={attributes.justify ?? "stretch"}
            options={GRID_JUSTIFY_OPTIONS}
            onChange={(justify) => setAttributes({ justify })}
            help={__("How items are aligned across each row.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Overflow", TEXT_DOMAIN)}
            value={attributes.overflow ?? "visible"}
            options={GRID_OVERFLOW_OPTIONS}
            onChange={(overflow) => setAttributes({ overflow })}
            help={__(
              "Controls how content behaves when it exceeds the grid bounds.",
              TEXT_DOMAIN,
            )}
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
            title={__("Grid", TEXT_DOMAIN)}
            summary={`${attributes.columns || 1} ${__(
              "columns",
              TEXT_DOMAIN,
            )} - ${__("Spacing", TEXT_DOMAIN)}: ${attributes.spacing || "md"}`}
            borderColor="#c9c"
            backgroundColor="#fff0ff"
          />
        ) : (
          <>
            <div
              style={{ fontSize: "11px", color: "#666", marginBottom: "8px" }}
            >
              {__("Grid", TEXT_DOMAIN)} ({attributes.columns}{" "}
              {__("columns", TEXT_DOMAIN)}) - {__("Spacing", TEXT_DOMAIN)}:{" "}
              {attributes.spacing}
            </div>
            <InnerBlocks allowedBlocks={allowedBlocks as unknown as string[]} />
          </>
        )}
      </div>
    </>
  );
}
