import { type BlockAttribute, registerBlockType } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "..";
import { FileIcon } from "../icons";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";
import { getLegacySerializedLabeledLeafBlockDeprecations } from "../shared/legacy-serialized-block-deprecations";

registerBlockType(metadata.name, {
  apiVersion: metadata.apiVersion,
  attributes: metadata.attributes as Record<string, BlockAttribute>,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  deprecated: getLegacySerializedLabeledLeafBlockDeprecations("file", metadata.attributes as Record<string, BlockAttribute>),
  icon: { src: <FileIcon /> },
});
