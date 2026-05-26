import { type BlockAttribute, registerBlockType } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "..";
import metadata from "./block.json";
import Edit from "./edit";
import Save from "./save";
import { getLegacySerializedContainerBlockDeprecations } from "../shared/legacy-serialized-block-deprecations";

registerBlockType(metadata.name, {
  apiVersion: metadata.apiVersion,
  attributes: metadata.attributes as Record<string, BlockAttribute>,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  deprecated: getLegacySerializedContainerBlockDeprecations("overflow-list", metadata.attributes as Record<string, BlockAttribute>),
  icon: { src: "ellipsis" },
});
