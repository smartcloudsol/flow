import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";

export default function Save({
  attributes,
}: {
  attributes?: { trigger?: string };
}) {
  return (
    <div
      {...useBlockProps.save({
        "data-smartcloud-flow-form-state": "success",
        "data-smartcloud-flow-form-state-trigger":
          attributes?.trigger || "submit-success",
      })}
    >
      <InnerBlocks.Content />
    </div>
  );
}
