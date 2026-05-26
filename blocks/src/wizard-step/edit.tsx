import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { FORM_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";

interface WizardStepAttributes {
  title?: string;
  description?: string;
  hidden?: boolean;
  conditionalLogic?: unknown;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: WizardStepAttributes;
  setAttributes: (next: Partial<WizardStepAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Step Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Step Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
            help={__("Title for this step", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Step Description", TEXT_DOMAIN)}
            value={attributes.description ?? ""}
            onChange={(description) => setAttributes({ description })}
            help={__("Optional description", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this step by default.", TEXT_DOMAIN)}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes as Record<string, unknown>}
          setAttributes={(next) =>
            setAttributes(next as Partial<WizardStepAttributes>)
          }
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div
        {...useBlockProps({
          style: {
            border: "1px dashed #667eea",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: isHidden ? "#f6f7ff" : "#fff",
            borderRadius: "4px",
          },
        })}
      >
        {isHidden ? (
          <div style={{ display: "grid", gap: "10px" }}>
            <HiddenBlockPreview
              title={__("Wizard step", TEXT_DOMAIN)}
              summary={attributes.title || __("(untitled)", TEXT_DOMAIN)}
              borderColor="#667eea"
              backgroundColor="#eef1ff"
              titleColor="#667eea"
            />
            <div
              style={{
                borderLeft: "2px solid #c7d2fe",
                paddingLeft: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#667eea",
                  marginBottom: "8px",
                }}
              >
                {attributes.title || __("Step", TEXT_DOMAIN)}
              </div>
              {attributes.description && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    marginBottom: "8px",
                  }}
                >
                  {attributes.description}
                </div>
              )}
              <div style={{ paddingLeft: "12px" }}>
                <InnerBlocks
                  allowedBlocks={FORM_CHILD_BLOCKS as unknown as string[]}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "8px",
              }}
            >
              {attributes.title || __("Step", TEXT_DOMAIN)}
            </div>
            {attributes.description && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#666",
                  marginBottom: "8px",
                }}
              >
                {attributes.description}
              </div>
            )}
            <div style={{ paddingLeft: "12px" }}>
              <InnerBlocks
                allowedBlocks={FORM_CHILD_BLOCKS as unknown as string[]}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
