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

interface DisplayMarkAttributes {
  content?: string;
  highlight?: string;
  color?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

function markPreview(
  content: string,
  highlight: string,
  color?: string,
): Array<string | JSX.Element> {
  const terms = highlight
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return [
      <mark
        key="mark-preview-full"
        style={{
          backgroundColor: color || "#fde68a",
          borderRadius: "0.25rem",
          color: "inherit",
          padding: "0.1em 0.35em",
        }}
      >
        {content}
      </mark>,
    ];
  }

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  let hasMatch = false;

  const rendered = content
    .split(pattern)
    .filter(Boolean)
    .map((part, index) => {
      const isMatch = terms.some(
        (term) => term.toLowerCase() === part.toLowerCase(),
      );

      if (!isMatch) {
        return part;
      }

      hasMatch = true;

      return (
        <mark
          key={`${part}-${index}`}
          style={{
            backgroundColor: color || "#fde68a",
            borderRadius: "0.25rem",
            color: "inherit",
            padding: "0.1em 0.35em",
          }}
        >
          {part}
        </mark>
      );
    });

  return hasMatch ? rendered : [content];
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: DisplayMarkAttributes;
  setAttributes: (next: Partial<DisplayMarkAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() ||
    __("Only this phrase should be marked inside the sentence.", TEXT_DOMAIN);
  const highlight =
    attributes.highlight?.trim() || __("this phrase", TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Mark Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Content", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(contentValue: string) =>
              setAttributes({ content: contentValue })
            }
            help={__("Full text that contains the marked sample.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Marked text", TEXT_DOMAIN)}
            value={attributes.highlight ?? ""}
            onChange={(highlightValue: string) =>
              setAttributes({ highlight: highlightValue })
            }
            help={__(
              "Only matching text fragments will be marked. Leave empty to mark the full content for backward compatibility.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color: string) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={isHidden}
            onChange={(hidden: boolean) => setAttributes({ hidden })}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<DisplayMarkAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Mark", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <div style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {markPreview(content, highlight, attributes.color)}
          </div>
        )}
      </div>
    </>
  );
}
