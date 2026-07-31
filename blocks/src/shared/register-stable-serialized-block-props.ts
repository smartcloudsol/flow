import { addFilter } from "@wordpress/hooks";

import { stabilizeFlowSerializedBlockProps } from "./stable-serialized-block-props";

addFilter(
  "blocks.getSaveContent.extraProps",
  "smartcloud-flow/stable-serialized-block-props",
  stabilizeFlowSerializedBlockProps,
  Number.MAX_SAFE_INTEGER,
);

