import { type BlockAttribute, registerBlockType } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "..";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";

registerBlockType(metadata.name, {
  apiVersion: metadata.apiVersion,
  attributes: metadata.attributes as Record<string, BlockAttribute>,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  icon: { src: "table-col-before" },
});
