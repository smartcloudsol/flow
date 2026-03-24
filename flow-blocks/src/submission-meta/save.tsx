import { useBlockProps } from "@wordpress/block-editor";

export default function Save({
  attributes,
}: {
  attributes?: {
    field?: string;
    label?: string;
    fallbackText?: string;
    copyable?: boolean;
    dateFormat?: string;
  };
}) {
  return (
    <span
      {...useBlockProps.save({
        "data-smartcloud-flow-submission-meta": "true",
        "data-smartcloud-flow-submission-meta-field":
          attributes?.field || "submissionId",
        "data-smartcloud-flow-submission-meta-label": attributes?.label || "",
        "data-smartcloud-flow-submission-meta-fallback":
          attributes?.fallbackText || "",
        "data-smartcloud-flow-submission-meta-copyable": attributes?.copyable
          ? "true"
          : "false",
        "data-smartcloud-flow-submission-meta-date-format":
          attributes?.dateFormat || "localized",
      })}
    />
  );
}
