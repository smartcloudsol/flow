import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface DisplayBlockquoteAttributes {
  content?: string;
  cite?: string;
  color?: string;
  radius?: string;
  iconSize?: number;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

const RADIUS_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
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
  attributes: DisplayBlockquoteAttributes;
  setAttributes: (next: Partial<DisplayBlockquoteAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps();
  const isHidden = Boolean(attributes.hidden);
  const content =
    attributes.content?.trim() || __("A highlighted quote.", TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Blockquote Settings", TEXT_DOMAIN)}>
          <TextareaControl
            label={__("Quote", TEXT_DOMAIN)}
            value={attributes.content ?? ""}
            onChange={(nextContent) => setAttributes({ content: nextContent })}
          />
          <TextControl
            label={__("Citation", TEXT_DOMAIN)}
            value={attributes.cite ?? ""}
            onChange={(cite) => setAttributes({ cite })}
          />
          <TextControl
            label={__("Color", TEXT_DOMAIN)}
            value={attributes.color ?? ""}
            onChange={(color) => setAttributes({ color })}
            help={__("Mantine color token or CSS color value.", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Radius", TEXT_DOMAIN)}
            value={attributes.radius ?? ""}
            options={RADIUS_OPTIONS}
            onChange={(radius) => setAttributes({ radius })}
          />
          <TextControl
            label={__("Icon size", TEXT_DOMAIN)}
            type="number"
            value={attributes.iconSize ? String(attributes.iconSize) : ""}
            onChange={(iconSize) =>
              setAttributes({
                iconSize: iconSize ? Number(iconSize) : undefined,
              })
            }
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
            setAttributes(next as Partial<DisplayBlockquoteAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Blockquote", TEXT_DOMAIN)}
            summary={content}
          />
        ) : (
          <blockquote
            style={{
              borderLeft: `4px solid ${attributes.color || "#d0d7de"}`,
              borderRadius: attributes.radius ? "0.5rem" : undefined,
              color: attributes.color || undefined,
              margin: 0,
              padding: "0.75rem 1rem",
              whiteSpace: "pre-wrap",
            }}
          >
            <div>{content}</div>
            {attributes.cite ? (
              <cite
                style={{
                  color: "#6b7280",
                  display: "block",
                  fontSize: "0.875rem",
                  fontStyle: "normal",
                  marginTop: "0.5rem",
                }}
              >
                {attributes.cite}
              </cite>
            ) : null}
          </blockquote>
        )}
      </div>
    </>
  );
}
