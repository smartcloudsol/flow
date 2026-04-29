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

interface DisplayCodeAttributes {
  content?: string;
  color?: string;
  block?: boolean;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayCodeAttributes;
  setAttributes: (next: Partial<DisplayCodeAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() || __("const answer = 42;", TEXT_DOMAIN);
  const isBlock = attributes.block !== false;

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Code Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(nextContent) => setAttributes({ content: nextContent })}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Block style", TEXT_DOMAIN)}
            checked={isBlock}
            onChange={(block) => setAttributes({ block })}
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
            setAttributes(next as Partial<DisplayCodeAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Code", TEXT_DOMAIN)}
            summary={content}
          />
        ) : isBlock ? (
          <pre
            style={{
              backgroundColor: "#111827",
              borderRadius: "0.5rem",
              color: attributes.color || "#f9fafb",
              margin: 0,
              overflowX: "auto",
              padding: "0.875rem 1rem",
            }}
          >
            <code>{content}</code>
          </pre>
        ) : (
          <code
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "0.25rem",
              color: attributes.color || "inherit",
              padding: "0.1em 0.35em",
            }}
          >
            {content}
          </code>
        )}
      </div>
    </>
  );
}
