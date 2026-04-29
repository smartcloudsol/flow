import { type BlockAttribute, registerBlockType } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "..";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 6.5h14M5 12h7m-7 5.5h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path d="M12 9.75h7v4.5h-7z" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

registerBlockType(metadata.name, {
  apiVersion: metadata.apiVersion,
  attributes: metadata.attributes as Record<string, BlockAttribute>,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  icon: { src: <MarkIcon /> },
});
