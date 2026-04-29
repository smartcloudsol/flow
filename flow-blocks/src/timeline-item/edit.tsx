import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import { TIMELINE_ITEM_CHILD_BLOCKS } from "../shared/form-child-blocks";

interface TimelineItemAttributes {
  title?: string;
  bullet?: string;
  color?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: TimelineItemAttributes;
  setAttributes: (next: Partial<TimelineItemAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            borderLeft: "3px solid #8b5cf6",
            padding: "8px 12px",
            margin: "6px 0",
            backgroundColor: "#ffffff",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Timeline Item Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
          />
          <TextControl
            label={__("Bullet label", TEXT_DOMAIN)}
            value={attributes.bullet ?? ""}
            onChange={(bullet) => setAttributes({ bullet })}
            help={__("Short text shown inside the bullet.", TEXT_DOMAIN)}
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
            setAttributes(next as Partial<TimelineItemAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Timeline.Item", TEXT_DOMAIN)}
            summary={
              attributes.title || __("Hidden timeline item", TEXT_DOMAIN)
            }
            borderColor="#8b5cf6"
            backgroundColor="#faf5ff"
            titleColor="#6d28d9"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "11px",
                color: "#6d28d9",
                marginBottom: "6px",
              }}
            >
              {attributes.title || __("Timeline item", TEXT_DOMAIN)}
            </div>
            <InnerBlocks
              allowedBlocks={TIMELINE_ITEM_CHILD_BLOCKS as unknown as string[]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </>
        )}
      </div>
    </>
  );
}
