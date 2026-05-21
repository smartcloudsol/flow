import { useBlockProps } from "@wordpress/block-editor";
import { parseOptions } from "../shared/field-utils";
import { encodeData, filterWordPressAttributes } from "../shared/serialization";

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  // Convert optionsText to options array for runtime
  const { optionsText, ...restAttributes } =
    filterWordPressAttributes(attributes);

  const payload = {
    type: "select",
    ...restAttributes,
    // Only include static options if optionsSource is static or undefined
    options:
      !restAttributes.optionsSource || restAttributes.optionsSource === "static"
        ? parseOptions(optionsText as string | undefined)
        : undefined,
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
