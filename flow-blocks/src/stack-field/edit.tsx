import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, SelectControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { FORM_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

const GAP_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

const ALIGN_OPTIONS = [
  { label: "Stretch", value: "stretch" },
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
];

const JUSTIFY_OPTIONS = [
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
  { label: "Space Between", value: "space-between" },
  { label: "Space Around", value: "space-around" },
];

import type { ConditionalAttributes } from "../shared/types";

type StackFieldAttributes = ConditionalAttributes & {
  gap?: string;
  align?: string;
  justify?: string;
};

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: StackFieldAttributes;
  setAttributes: (next: Partial<StackFieldAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #ccc",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#f9f9f9",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Stack Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={attributes.gap}
            options={GAP_OPTIONS}
            onChange={(gap) => setAttributes({ gap })}
            help={__("Spacing between stacked items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Align", TEXT_DOMAIN)}
            value={attributes.align}
            options={ALIGN_OPTIONS}
            onChange={(align) => setAttributes({ align })}
            help={__("Horizontal alignment of stacked items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Justify", TEXT_DOMAIN)}
            value={attributes.justify}
            options={JUSTIFY_OPTIONS}
            onChange={(justify) => setAttributes({ justify })}
            help={__("Vertical alignment of stacked items.", TEXT_DOMAIN)}
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
            title={__("Stack (vertical)", TEXT_DOMAIN)}
            summary={`${__("Gap", TEXT_DOMAIN)}: ${attributes.gap || "md"}`}
          />
        ) : (
          <>
            <div
              style={{ fontSize: "11px", color: "#666", marginBottom: "8px" }}
            >
              {__("Stack (vertical)", TEXT_DOMAIN)} - {__("Gap", TEXT_DOMAIN)}:{" "}
              {attributes.gap}
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
