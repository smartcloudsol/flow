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

interface DisplayHighlightAttributes {
  content?: string;
  highlight?: string;
  color?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

function highlightPreview(
  content: string,
  highlight: string,
  color?: string,
): Array<string | JSX.Element> {
  const terms = highlight
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return [content];
  }

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return content
    .split(pattern)
    .filter(Boolean)
    .map((part, index) =>
      terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
        <mark
          key={`${part}-${index}`}
          style={{
            backgroundColor: color || "#fde68a",
            borderRadius: "0.25rem",
            padding: "0.05em 0.2em",
          }}
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayHighlightAttributes;
  setAttributes: (next: Partial<DisplayHighlightAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() ||
    __("Highlight selected words in this sentence.", TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Highlight Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(nextContent) => setAttributes({ content: nextContent })}
          />
          <TextControl
            label={__("Highlighted terms", TEXT_DOMAIN)}
            value={attributes.highlight ?? ""}
            onChange={(highlight) => setAttributes({ highlight })}
            help={__("Comma or newline separated list.", TEXT_DOMAIN)}
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
            setAttributes(next as Partial<DisplayHighlightAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Highlight", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {highlightPreview(
              content,
              attributes.highlight ?? "",
              attributes.color,
            )}
          </div>
        )}
      </div>
    </>
  );
}
