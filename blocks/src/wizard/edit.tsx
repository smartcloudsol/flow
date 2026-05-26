import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  PanelBody,
  RadioControl,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { ConditionalAttributes } from "../shared/types";

interface WizardAttributes extends ConditionalAttributes {
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
  progressType?: string;
  allowStepNavigation?: boolean;
  nextButtonLabel?: string;
  prevButtonLabel?: string;
  gap?: string;
}

const ALLOWED_BLOCKS = ["smartcloud-flow/wizard-step"];

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: WizardAttributes;
  setAttributes: (next: Partial<WizardAttributes>) => void;
  clientId: string;
}) {
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "2px solid #667eea",
            padding: "16px",
            margin: "8px 0",
            backgroundColor: "#f7faff",
            borderRadius: "8px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Wizard Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
            help={__("Optional wizard title", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Subtitle", TEXT_DOMAIN)}
            value={attributes.subtitle ?? ""}
            onChange={(subtitle) => setAttributes({ subtitle })}
            help={__("Optional wizard subtitle", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Show Progress", TEXT_DOMAIN)}
            checked={attributes.showProgress ?? true}
            onChange={(showProgress) => setAttributes({ showProgress })}
          />
          <RadioControl
            label={__("Progress Type", TEXT_DOMAIN)}
            selected={attributes.progressType ?? "numbers"}
            options={[
              { label: __("Numbers", TEXT_DOMAIN), value: "numbers" },
              { label: __("Dots", TEXT_DOMAIN), value: "dots" },
              { label: __("Bar", TEXT_DOMAIN), value: "bar" },
            ]}
            onChange={(progressType) => setAttributes({ progressType })}
          />
          <ToggleControl
            label={__("Allow Step Navigation", TEXT_DOMAIN)}
            checked={attributes.allowStepNavigation ?? false}
            onChange={(allowStepNavigation) =>
              setAttributes({ allowStepNavigation })
            }
            help={__("Allow clicking on steps to navigate", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Next Button Label", TEXT_DOMAIN)}
            value={attributes.nextButtonLabel ?? ""}
            onChange={(nextButtonLabel) => setAttributes({ nextButtonLabel })}
            placeholder={__("Next", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Previous Button Label", TEXT_DOMAIN)}
            value={attributes.prevButtonLabel ?? ""}
            onChange={(prevButtonLabel) => setAttributes({ prevButtonLabel })}
            placeholder={__("Previous", TEXT_DOMAIN)}
          />
          <SelectControl
            label={__("Gap", TEXT_DOMAIN)}
            value={(attributes.gap as "xs" | "sm" | "md" | "lg" | "xl") ?? "md"}
            options={[
              { label: "xs", value: "xs" },
              { label: "sm", value: "sm" },
              { label: "md", value: "md" },
              { label: "lg", value: "lg" },
              { label: "xl", value: "xl" },
            ]}
            onChange={(gap: "xs" | "sm" | "md" | "lg" | "xl") =>
              setAttributes({ gap })
            }
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes}
          setAttributes={setAttributes as (next: unknown) => void}
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Wizard", TEXT_DOMAIN)}
            summary={
              attributes.title ||
              attributes.subtitle ||
              __("Wizard", TEXT_DOMAIN)
            }
            borderColor="#667eea"
            backgroundColor="#f7faff"
            titleColor="#667eea"
          />
        ) : (
          <>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              🧙 {attributes.title || __("Wizard", TEXT_DOMAIN)}
            </div>
            {attributes.subtitle && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                {attributes.subtitle}
              </div>
            )}
            <div style={{ paddingTop: "8px" }}>
              <InnerBlocks allowedBlocks={ALLOWED_BLOCKS} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
