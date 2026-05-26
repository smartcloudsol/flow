import { useBlockProps } from "@wordpress/block-editor";
import { encodeData, filterWordPressAttributes } from "../shared/serialization";

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const payload = { type: "submit", ...filterWordPressAttributes(attributes) };
  return (
    <div
      {...useBlockProps.save({
        "data-smartcloud-flow-form-field": encodeData(payload),
      })}
    />
  );
}
