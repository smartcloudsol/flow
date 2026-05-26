import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface DisplaySpoilerAttributes {
  content?: string;
  maxHeight?: number;
  showLabel?: string;
  hideLabel?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplaySpoilerAttributes;
  setAttributes: (next: Partial<DisplaySpoilerAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() ||
    __("Add expandable content here.", TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Spoiler Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(nextContent) => setAttributes({ content: nextContent })}
          />
          <TextControl
            label={__("Max height", TEXT_DOMAIN)}
            type="number"
            value={
              attributes.maxHeight !== undefined
                ? String(attributes.maxHeight)
                : ""
            }
            onChange={(maxHeight) =>
              setAttributes({
                maxHeight: maxHeight ? Number(maxHeight) : undefined,
              })
            }
          />
          <TextControl
            label={__("Show label", TEXT_DOMAIN)}
            value={attributes.showLabel ?? ""}
            onChange={(showLabel) => setAttributes({ showLabel })}
          />
          <TextControl
            label={__("Hide label", TEXT_DOMAIN)}
            value={attributes.hideLabel ?? ""}
            onChange={(hideLabel) => setAttributes({ hideLabel })}
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
            setAttributes(next as Partial<DisplaySpoilerAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Spoiler", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div>
            <div
              style={{
                maxHeight: attributes.maxHeight
                  ? `${attributes.maxHeight}px`
                  : "96px",
                overflow: "hidden",
                position: "relative",
                whiteSpace: "pre-wrap",
              }}
            >
              {content}
              <div
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))",
                  bottom: 0,
                  height: "2.5rem",
                  left: 0,
                  pointerEvents: "none",
                  position: "absolute",
                  right: 0,
                }}
              />
            </div>
            <button
              type="button"
              style={{
                background: "none",
                border: 0,
                color: "#2563eb",
                cursor: "pointer",
                marginTop: "0.5rem",
                padding: 0,
              }}
            >
              {attributes.showLabel?.trim() || __("Show more", TEXT_DOMAIN)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
