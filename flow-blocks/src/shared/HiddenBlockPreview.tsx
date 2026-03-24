import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { __ } from "@wordpress/i18n";

interface HiddenBlockPreviewProps {
  title: string;
  summary?: string;
  borderColor?: string;
  backgroundColor?: string;
  titleColor?: string;
}

export function HiddenBlockPreview({
  title,
  summary,
  borderColor = "#d0d7de",
  backgroundColor = "#f6f7f7",
  titleColor = "#50575e",
}: HiddenBlockPreviewProps) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: `1px dashed ${borderColor}`,
        backgroundColor,
        borderRadius: "4px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: titleColor,
          marginBottom: summary ? "4px" : 0,
        }}
      >
        {title} - {__("Hidden", TEXT_DOMAIN)}
      </div>
      {summary ? (
        <div style={{ fontSize: "13px", color: "#666" }}>{summary}</div>
      ) : null}
    </div>
  );
}
