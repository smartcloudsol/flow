type SaveExtraProps = Record<string, unknown> & {
  className?: string;
  "data-smartcloud-flow-form-field"?: unknown;
};

type FlowBlockType = {
  name?: string;
};

function classTokens(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap(classTokens);
  }
  return [];
}

export function getStableFlowSerializedClassName(
  blockName: string,
  attributes: Record<string, unknown>,
): string {
  return Array.from(
    new Set([
      `wp-block-${blockName.replace("/", "-")}`,
      ...classTokens(attributes.classNames),
      ...classTokens(attributes.className),
    ]),
  ).join(" ");
}

export function stabilizeFlowSerializedBlockProps(
  props: SaveExtraProps,
  blockType: FlowBlockType,
  attributes: Record<string, unknown>,
): SaveExtraProps {
  const blockName = String(blockType?.name || "");

  if (
    !blockName.startsWith("smartcloud-flow/") ||
    props["data-smartcloud-flow-form-field"] === undefined
  ) {
    return props;
  }

  return {
    ...props,
    className: getStableFlowSerializedClassName(blockName, attributes),
  };
}

