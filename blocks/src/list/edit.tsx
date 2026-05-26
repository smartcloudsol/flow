import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, SelectControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { LIST_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";
import type { ConditionalAttributes } from "../shared/types";

interface ListAttributes extends ConditionalAttributes {
  ordered?: boolean;
  listStyleType?: string;
  spacing?: string;
  size?: string;
  withPadding?: boolean;
  center?: boolean;
}

const SPACING_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

const ORDERED_STYLE_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: __("Decimal", TEXT_DOMAIN), value: "decimal" },
  { label: __("Lower alpha", TEXT_DOMAIN), value: "lower-alpha" },
  { label: __("Upper alpha", TEXT_DOMAIN), value: "upper-alpha" },
  { label: __("Lower roman", TEXT_DOMAIN), value: "lower-roman" },
  { label: __("Upper roman", TEXT_DOMAIN), value: "upper-roman" },
];

const UNORDERED_STYLE_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: __("Disc", TEXT_DOMAIN), value: "disc" },
  { label: __("Circle", TEXT_DOMAIN), value: "circle" },
  { label: __("Square", TEXT_DOMAIN), value: "square" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: ListAttributes;
  setAttributes: (next: Partial<ListAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #16a34a",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#f0fdf4",
            borderRadius: "6px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("List Settings", TEXT_DOMAIN)}>
          <ToggleControl
            label={__("Ordered", TEXT_DOMAIN)}
            checked={Boolean(attributes.ordered)}
            onChange={(ordered) => setAttributes({ ordered })}
          />
          <SelectControl
            label={__("Marker style", TEXT_DOMAIN)}
            value={attributes.listStyleType ?? ""}
            options={
              attributes.ordered
                ? ORDERED_STYLE_OPTIONS
                : UNORDERED_STYLE_OPTIONS
            }
            onChange={(listStyleType) => setAttributes({ listStyleType })}
          />
          <SelectControl
            label={__("Spacing", TEXT_DOMAIN)}
            value={attributes.spacing ?? "sm"}
            options={SPACING_OPTIONS}
            onChange={(spacing) => setAttributes({ spacing })}
          />
          <SelectControl
            label={__("Size", TEXT_DOMAIN)}
            value={attributes.size ?? ""}
            options={[
              { label: __("Auto", TEXT_DOMAIN), value: "" },
              ...SIZE_OPTIONS,
            ]}
            onChange={(size) => setAttributes({ size })}
          />
          <ToggleControl
            label={__("With padding", TEXT_DOMAIN)}
            checked={attributes.withPadding ?? true}
            onChange={(withPadding) => setAttributes({ withPadding })}
          />
          <ToggleControl
            label={__("Center bullets", TEXT_DOMAIN)}
            checked={Boolean(attributes.center)}
            onChange={(center) => setAttributes({ center })}
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
            title={__("List", TEXT_DOMAIN)}
            summary={
              attributes.ordered
                ? __("Ordered content list", TEXT_DOMAIN)
                : __("Unordered content list", TEXT_DOMAIN)
            }
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
                marginBottom: "8px",
              }}
            >
              {attributes.ordered
                ? __("Ordered list", TEXT_DOMAIN)
                : __("Unordered list", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={LIST_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
