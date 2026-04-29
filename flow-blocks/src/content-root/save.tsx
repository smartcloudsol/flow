import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import { type ReactNode } from "react";

export default function Save() {
  const innerBlocksProps = { children: <InnerBlocks.Content /> };

  useBlockProps.save();

  return innerBlocksProps.children as ReactNode;
}
