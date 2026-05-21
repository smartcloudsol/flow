import { useBlockProps } from "@wordpress/block-editor";
import { parseOptions } from "../shared/field-utils";
import { encodeData, filterWordPressAttributes } from "../shared/serialization";

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const { optionsText, ...restAttributes } =
    filterWordPressAttributes(attributes);
  const payload = {
    type: "checkbox-group",
    ...restAttributes,
    options:
      !restAttributes.optionsSource || restAttributes.optionsSource === "static"
        ? parseOptions(
            typeof optionsText === "string" ? optionsText : undefined,
          )
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
