import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import { type ReactNode } from "react";

export default function Save() {
  const blockProps = useBlockProps.save();
  const innerBlocksProps = { children: <InnerBlocks.Content /> };

  return (
    <div {...blockProps}>
      <div className="smartcloud-flow-form__mount" />
      <div className="smartcloud-flow-form__config" hidden>
        {innerBlocksProps.children as ReactNode}
      </div>
    </div>
  );
}
