import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { SIZE_OPTIONS } from "../shared/mantine-editor-options";

interface DisplayTitleAttributes {
  content?: string;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: string;
  color?: string;
  align?: "left" | "center" | "right";
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const ALIGN_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

const ORDER_OPTIONS = [
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
  { label: "H4", value: "4" },
  { label: "H5", value: "5" },
  { label: "H6", value: "6" },
];

function getPreviewFontSize(order?: number, size?: string) {
  if (size === "xs") return "0.875rem";
  if (size === "sm") return "1rem";
  if (size === "md") return "1.25rem";
  if (size === "lg") return "1.5rem";
  if (size === "xl") return "1.875rem";

  switch (order) {
    case 1:
      return "2.25rem";
    case 2:
      return "1.875rem";
    case 3:
      return "1.5rem";
    case 4:
      return "1.25rem";
    case 5:
      return "1.125rem";
    default:
      return "1rem";
  }
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayTitleAttributes;
  setAttributes: (next: Partial<DisplayTitleAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() || __("Section title", TEXT_DOMAIN);
  const order = attributes.order ?? 2;

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Title Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(contentValue) =>
              setAttributes({ content: contentValue })
            }
          />
          <SelectControl
            label={__("Level", TEXT_DOMAIN)}
            value={String(order)}
            options={ORDER_OPTIONS}
            onChange={(value) =>
              setAttributes({ order: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 })
            }
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
          <SelectControl
            label={__("Align", TEXT_DOMAIN)}
            value={attributes.align ?? "left"}
            options={ALIGN_OPTIONS}
            onChange={(align) =>
              setAttributes({ align: align as DisplayTitleAttributes["align"] })
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
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<DisplayTitleAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Title", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div
            role="heading"
            aria-level={order}
            style={{
              color: attributes.color || undefined,
              fontSize: getPreviewFontSize(order, attributes.size),
              fontWeight: 700,
              lineHeight: 1.2,
              textAlign: attributes.align ?? "left",
            }}
          >
            {content}
          </div>
        )}
      </div>
    </>
  );
}
