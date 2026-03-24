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
import type { ConditionalAttributes } from "../shared/types";

interface GroupFieldAttributes extends ConditionalAttributes {
  gap?: string;
  align?: string;
  justify?: string;
  grow?: boolean;
}

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

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: GroupFieldAttributes;
  setAttributes: (next: Partial<GroupFieldAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #99c",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#f0f4ff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Group Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={attributes.gap}
            options={GAP_OPTIONS}
            onChange={(gap) => setAttributes({ gap })}
            help={__("Spacing between grouped items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Align", TEXT_DOMAIN)}
            value={attributes.align}
            options={ALIGN_OPTIONS}
            onChange={(align) => setAttributes({ align })}
            help={__("Vertical alignment of grouped items.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Justify", TEXT_DOMAIN)}
            value={attributes.justify}
            options={JUSTIFY_OPTIONS}
            onChange={(justify) => setAttributes({ justify })}
            help={__("Horizontal alignment of grouped items.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Grow children", TEXT_DOMAIN)}
            checked={attributes.grow}
            onChange={(grow) => setAttributes({ grow })}
            help={__("Make children take equal width.", TEXT_DOMAIN)}
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
            title={__("Group (horizontal)", TEXT_DOMAIN)}
            summary={`${__("Gap", TEXT_DOMAIN)}: ${attributes.gap || "md"}`}
            borderColor="#99c"
            backgroundColor="#f0f4ff"
          />
        ) : (
          <>
            <div
              style={{ fontSize: "11px", color: "#666", marginBottom: "8px" }}
            >
              {__("Group (horizontal)", TEXT_DOMAIN)} - {__("Gap", TEXT_DOMAIN)}
              : {attributes.gap}
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
