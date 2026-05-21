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
import { TIMELINE_CHILD_BLOCKS } from "../shared/form-child-blocks";
import type { ConditionalAttributes } from "../shared/types";

interface TimelineAttributes extends ConditionalAttributes {
  gap?: string;
  bulletSize?: number;
  lineWidth?: number;
  color?: string;
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
  attributes: TimelineAttributes;
  setAttributes: (next: Partial<TimelineAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #7c3aed",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#faf5ff",
            borderRadius: "6px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Timeline Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={attributes.gap ?? "md"}
            options={SPACING_OPTIONS}
            onChange={(gap) => setAttributes({ gap })}
          />
          <TextControl
            label={__("Bullet size", TEXT_DOMAIN)}
            type="number"
            value={String(attributes.bulletSize ?? 20)}
            onChange={(bulletSize) =>
              setAttributes({
                bulletSize: Math.max(12, Number(bulletSize) || 20),
              })
            }
          />
          <TextControl
            label={__("Line width", TEXT_DOMAIN)}
            type="number"
            value={String(attributes.lineWidth ?? 2)}
            onChange={(lineWidth) =>
              setAttributes({ lineWidth: Math.max(1, Number(lineWidth) || 2) })
            }
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
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
            title={__("Timeline", TEXT_DOMAIN)}
            summary={__("Hidden timeline", TEXT_DOMAIN)}
            borderColor="#7c3aed"
            backgroundColor="#faf5ff"
            titleColor="#6d28d9"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#6d28d9",
                marginBottom: "8px",
              }}
            >
              {__("Timeline", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={TIMELINE_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
