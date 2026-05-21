import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import { encodeData, filterWordPressAttributes } from "../shared/serialization";

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const payload = {
    type: "wizard-step",
    ...filterWordPressAttributes(attributes),
  };

  return (
    <div
      {...useBlockProps.save({
        "data-smartcloud-flow-form-field": encodeData(payload),
        "data-wizard-step-title": attributes.title as string,
        "data-wizard-step-description": attributes.description as string,
        "data-wizard-step-hidden": attributes.hidden ? "true" : "false",
      })}
    >
      <InnerBlocks.Content />
    </div>
  );
}
