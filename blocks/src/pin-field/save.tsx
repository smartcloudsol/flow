import { useBlockProps } from "@wordpress/block-editor";
import { encodeData, filterWordPressAttributes } from "../shared/serialization";

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const filteredAttributes = filterWordPressAttributes(attributes) as Record<
    string,
    unknown
  >;
  const {
    type: legacyInputType,
    inputType,
    ...restAttributes
  } = filteredAttributes;

  const payload = {
    ...restAttributes,
    type: "pin",
    inputType: inputType ?? legacyInputType,
  };

  return (
    <div
      {...useBlockProps.save({
        "data-smartcloud-flow-form-field": encodeData(payload),
      })}
    >
      <span hidden>
        {String((attributes as { label?: string }).label ?? "")}
      </span>
    </div>
  );
}
