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
import { OVERFLOW_LIST_CHILD_BLOCKS } from "../shared/form-child-blocks";
import {
  BADGE_VARIANT_OPTIONS,
  RADIUS_OPTIONS,
  SIZE_OPTIONS,
} from "../shared/mantine-editor-options";
import type { ConditionalAttributes } from "../shared/types";

interface OverflowListAttributes extends ConditionalAttributes {
  maxVisible?: number;
  maxVisibleItems?: number;
  gap?: string;
  layout?: "horizontal" | "vertical";
  align?: string;
  justify?: string;
  overflowLabel?: string;
  overflowVariant?: string;
  overflowColor?: string;
  overflowSize?: string;
  overflowRadius?: string;
  overflowAutoContrast?: boolean;
}

const SPACING_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

const LAYOUT_OPTIONS = [
  { label: __("Horizontal", TEXT_DOMAIN), value: "horizontal" },
  { label: __("Vertical", TEXT_DOMAIN), value: "vertical" },
];

const ALIGN_OPTIONS = [
  { label: __("Stretch", TEXT_DOMAIN), value: "stretch" },
  { label: __("Start", TEXT_DOMAIN), value: "flex-start" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("End", TEXT_DOMAIN), value: "flex-end" },
];

const JUSTIFY_OPTIONS = [
  { label: __("Start", TEXT_DOMAIN), value: "flex-start" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("End", TEXT_DOMAIN), value: "flex-end" },
  { label: __("Space Between", TEXT_DOMAIN), value: "space-between" },
  { label: __("Space Around", TEXT_DOMAIN), value: "space-around" },
  { label: __("Space Evenly", TEXT_DOMAIN), value: "space-evenly" },
];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: OverflowListAttributes;
  setAttributes: (next: Partial<OverflowListAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const maxVisibleItems =
    attributes.maxVisibleItems ?? attributes.maxVisible ?? 3;
  const layout = attributes.layout ?? "horizontal";
  const align =
    attributes.align ?? (layout === "vertical" ? "stretch" : "flex-start");
  const justify = attributes.justify ?? "flex-start";
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px dashed #0f766e",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#f0fdfa",
            borderRadius: "6px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("OverflowList Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Max visible items", TEXT_DOMAIN)}
            type="number"
            value={String(maxVisibleItems)}
            onChange={(value) =>
              setAttributes({
                maxVisible: Math.max(0, Number(value) || 0),
                maxVisibleItems: Math.max(0, Number(value) || 0),
              })
            }
          />
          <SelectControl
            label={__("Layout", TEXT_DOMAIN)}
            value={layout}
            options={LAYOUT_OPTIONS}
            onChange={(nextLayout) =>
              setAttributes({
                layout: nextLayout as OverflowListAttributes["layout"],
              })
            }
          />
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={attributes.gap ?? "sm"}
            options={SPACING_OPTIONS}
            onChange={(gap) => setAttributes({ gap })}
          />
          <SelectControl
            label={__("Align items", TEXT_DOMAIN)}
            value={align}
            options={ALIGN_OPTIONS}
            onChange={(nextAlign) => setAttributes({ align: nextAlign })}
            help={__(
              "Cross-axis alignment of rendered overflow items.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Justify items", TEXT_DOMAIN)}
            value={justify}
            options={JUSTIFY_OPTIONS}
            onChange={(nextJustify) => setAttributes({ justify: nextJustify })}
            help={__(
              "Main-axis distribution of rendered overflow items.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Overflow label", TEXT_DOMAIN)}
            value={attributes.overflowLabel ?? "more"}
            onChange={(overflowLabel) => setAttributes({ overflowLabel })}
            help={__(
              "Used in the summary badge, for example '+2 more'.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Overflow badge variant", TEXT_DOMAIN)}
            value={attributes.overflowVariant ?? "light"}
            options={BADGE_VARIANT_OPTIONS}
            onChange={(overflowVariant) => setAttributes({ overflowVariant })}
          />
          <SelectControl
            label={__("Overflow badge size", TEXT_DOMAIN)}
            value={attributes.overflowSize ?? "sm"}
            options={SIZE_OPTIONS}
            onChange={(overflowSize) => setAttributes({ overflowSize })}
          />
          <SelectControl
            label={__("Overflow badge radius", TEXT_DOMAIN)}
            value={attributes.overflowRadius ?? "xl"}
            options={RADIUS_OPTIONS}
            onChange={(overflowRadius) => setAttributes({ overflowRadius })}
          />
          <TextControl
            label={__("Overflow badge color", TEXT_DOMAIN)}
            value={attributes.overflowColor ?? ""}
            onChange={(overflowColor) => setAttributes({ overflowColor })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Overflow badge auto contrast", TEXT_DOMAIN)}
            checked={Boolean(attributes.overflowAutoContrast)}
            onChange={(overflowAutoContrast) =>
              setAttributes({ overflowAutoContrast })
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
            title={__("OverflowList", TEXT_DOMAIN)}
            summary={__("Hidden overflow list", TEXT_DOMAIN)}
            borderColor="#0f766e"
            backgroundColor="#f0fdfa"
            titleColor="#0f766e"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#0f766e",
                marginBottom: "8px",
              }}
            >
              {layout === "vertical"
                ? __("Overflow list - vertical layout", TEXT_DOMAIN)
                : __("Overflow list - horizontal layout", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={OVERFLOW_LIST_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
