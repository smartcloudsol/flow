import { type BlockAttributes, registerBlockType } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "..";
import { TagsIcon } from "../icons";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";

registerBlockType(metadata.name, {
  apiVersion: metadata.apiVersion,
  attributes: metadata.attributes as BlockAttributes,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  icon: <TagsIcon />,
});
