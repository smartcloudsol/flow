import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

interface SubmissionMetaAttributes {
  field?:
    | "submissionId"
    | "acceptedAt"
    | "status"
    | "formId"
    | "formName"
    | "responseMessage"
    | "submissionSource"
    | "aiSuggestionId"
    | "aiSuggestionTitle"
    | "aiSuggestionDescription"
    | "aiSuggestionCount"
    | "aiSuggestionAccepted"
    | "aiSourcesUsed";
  label?: string;
  fallbackText?: string;
  copyable?: boolean;
  dateFormat?: "localized" | "iso";
}

const FIELD_LABELS: Record<
  NonNullable<SubmissionMetaAttributes["field"]>,
  string
> = {
  submissionId: "Submission ID",
  acceptedAt: "Accepted at",
  status: "Status",
  formId: "Form ID",
  formName: "Form name",
  responseMessage: "Response message",
  submissionSource: "Submission source",
  aiSuggestionId: "AI suggestion ID",
  aiSuggestionTitle: "AI suggestion title",
  aiSuggestionDescription: "AI suggestion description",
  aiSuggestionCount: "AI suggestion count",
  aiSuggestionAccepted: "AI suggestion accepted",
  aiSourcesUsed: "AI sources used",
};

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: SubmissionMetaAttributes;
  setAttributes: (next: Partial<SubmissionMetaAttributes>) => void;
}) {
  const field = attributes.field || "submissionId";
  const dateFormat = attributes.dateFormat || "localized";
  const previewLabel = attributes.label || __(FIELD_LABELS[field], TEXT_DOMAIN);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Submission Meta Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Field", TEXT_DOMAIN)}
            value={field}
            options={[
              {
                label: __("Submission ID", TEXT_DOMAIN),
                value: "submissionId",
              },
              {
                label: __("Accepted at", TEXT_DOMAIN),
                value: "acceptedAt",
              },
              {
                label: __("Status", TEXT_DOMAIN),
                value: "status",
              },
              {
                label: __("Form ID", TEXT_DOMAIN),
                value: "formId",
              },
              {
                label: __("Form name", TEXT_DOMAIN),
                value: "formName",
              },
              {
                label: __("Response message", TEXT_DOMAIN),
                value: "responseMessage",
              },
              {
                label: __("Submission source", TEXT_DOMAIN),
                value: "submissionSource",
              },
              {
                label: __("AI suggestion ID", TEXT_DOMAIN),
                value: "aiSuggestionId",
              },
              {
                label: __("AI suggestion title", TEXT_DOMAIN),
                value: "aiSuggestionTitle",
              },
              {
                label: __("AI suggestion description", TEXT_DOMAIN),
                value: "aiSuggestionDescription",
              },
              {
                label: __("AI suggestion count", TEXT_DOMAIN),
                value: "aiSuggestionCount",
              },
              {
                label: __("AI suggestion accepted", TEXT_DOMAIN),
                value: "aiSuggestionAccepted",
              },
              {
                label: __("AI sources used", TEXT_DOMAIN),
                value: "aiSourcesUsed",
              },
            ]}
            onChange={(value) =>
              setAttributes({
                field: value as NonNullable<SubmissionMetaAttributes["field"]>,
              })
            }
          />
          {field === "acceptedAt" ? (
            <SelectControl
              label={__("Date format", TEXT_DOMAIN)}
              value={dateFormat}
              options={[
                {
                  label: __("Localized", TEXT_DOMAIN),
                  value: "localized",
                },
                {
                  label: __("ISO", TEXT_DOMAIN),
                  value: "iso",
                },
              ]}
              onChange={(value) =>
                setAttributes({
                  dateFormat: value as "localized" | "iso",
                })
              }
            />
          ) : null}
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={attributes.label || ""}
            onChange={(label) => setAttributes({ label })}
            help={__(
              "Optional label shown before the runtime value.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Fallback text", TEXT_DOMAIN)}
            value={attributes.fallbackText || ""}
            onChange={(fallbackText) => setAttributes({ fallbackText })}
            help={__(
              "Shown when the selected value is not available.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Show copy button", TEXT_DOMAIN)}
            checked={Boolean(attributes.copyable)}
            onChange={(copyable) => setAttributes({ copyable })}
            help={__(
              "Adds a copy button when the runtime value exists.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
      </InspectorControls>
      <div
        {...useBlockProps({
          style: {
            border: "1px dashed #868e96",
            borderRadius: "6px",
            padding: "10px 12px",
            backgroundColor: "#f8f9fa",
          },
        })}
      >
        <div
          style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}
        >
          {__("Submission meta", TEXT_DOMAIN)}
        </div>
        <div style={{ fontWeight: 500 }}>
          {previewLabel}: {__("Runtime value", TEXT_DOMAIN)}
        </div>
      </div>
    </>
  );
}
