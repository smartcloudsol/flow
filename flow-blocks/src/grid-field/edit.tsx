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
import { FORM_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { ConditionalAttributes } from "../shared/types";

interface GridFieldAttributes extends ConditionalAttributes {
  columns?: number;
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
          <SelectControl
            label={__("Horizontal Spacing", TEXT_DOMAIN)}
            value={attributes.spacing}
            options={SPACING_OPTIONS}
            onChange={(spacing) => setAttributes({ spacing })}
            help={__("Horizontal spacing between grid items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Vertical Spacing", TEXT_DOMAIN)}
            value={attributes.verticalSpacing}
            options={SPACING_OPTIONS}
            onChange={(verticalSpacing) => setAttributes({ verticalSpacing })}
            help={__("Vertical spacing between grid rows.", TEXT_DOMAIN)}
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
            <InnerBlocks
              allowedBlocks={FORM_CHILD_BLOCKS as unknown as string[]}
            />
          </>
        )}
      </div>
    </>
  );
}
