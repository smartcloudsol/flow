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

interface AiSuggestionsBlockAttributes {
  promptOverride?: string;
  title?: string;
  description?: string;
  mode?: "auto" | "manual";
  buttonLabel?: string;
  acceptLabel?: string;
  continueLabel?: string;
  continueDescription?: string;
  emptyStateText?: string;
  fallbackToRawText?: boolean;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: AiSuggestionsBlockAttributes;
  setAttributes: (next: Partial<AiSuggestionsBlockAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  return (
    <>
      <InspectorControls>
        <PanelBody title={__("AI Suggestions", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Mode", TEXT_DOMAIN)}
            value={attributes.mode || "manual"}
            options={[
              { label: __("Manual", TEXT_DOMAIN), value: "manual" },
              { label: __("Auto run", TEXT_DOMAIN), value: "auto" },
            ]}
            onChange={(value) =>
              setAttributes({ mode: value as "manual" | "auto" })
            }
          />
          <TextControl
            label={__("Title", TEXT_DOMAIN)}
            value={attributes.title || ""}
            onChange={(value) => setAttributes({ title: value })}
          />
          <TextareaControl
            label={__("Description", TEXT_DOMAIN)}
            value={attributes.description || ""}
            onChange={(value) => setAttributes({ description: value })}
          />
          <TextControl
            label={__("Button label", TEXT_DOMAIN)}
            value={attributes.buttonLabel || ""}
            onChange={(value) => setAttributes({ buttonLabel: value })}
          />
          <TextControl
            label={__("Accept label", TEXT_DOMAIN)}
            value={attributes.acceptLabel || ""}
            onChange={(value) => setAttributes({ acceptLabel: value })}
          />
          <TextControl
            label={__("Continue label", TEXT_DOMAIN)}
            value={attributes.continueLabel || ""}
            onChange={(value) => setAttributes({ continueLabel: value })}
          />
          <TextareaControl
            label={__("Prompt override", TEXT_DOMAIN)}
            value={attributes.promptOverride || ""}
            onChange={(value) => setAttributes({ promptOverride: value })}
            help={__(
              "Optional custom prompt template. Leave empty to use the built-in runtime default.",
              TEXT_DOMAIN,
            )}
          />
          <TextareaControl
            label={__("Continue description", TEXT_DOMAIN)}
            value={attributes.continueDescription || ""}
            onChange={(value) => setAttributes({ continueDescription: value })}
            help={__(
              "Shown above the single Continue action below the suggestion list.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Empty state text", TEXT_DOMAIN)}
            value={attributes.emptyStateText || ""}
            onChange={(value) => setAttributes({ emptyStateText: value })}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Fallback to raw text", TEXT_DOMAIN)}
            checked={attributes.fallbackToRawText !== false}
            onChange={(value) => setAttributes({ fallbackToRawText: value })}
            help={__(
              "Show the raw model response when structured suggestions are incomplete.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<AiSuggestionsBlockAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        <strong>
          {attributes.title || __("AI suggestions", TEXT_DOMAIN)}
          {isHidden ? ` • ${__("Hidden", TEXT_DOMAIN)}` : ""}
        </strong>
        {isHidden ? null : (
          <p>
            {attributes.description ||
              __(
                "Review the generated suggestions before continuing.",
                TEXT_DOMAIN,
              )}
          </p>
        )}
      </div>
    </>
  );
}
