import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import type { BlockAttribute, BlockConfiguration } from "@wordpress/blocks";

import { encodeData } from "./serialization";

type SerializedBlockAttributes = Record<string, unknown> & {
  label?: unknown;
};

type LegacySaveShape = "leaf" | "labeled-leaf" | "container";
type LegacySerializedBlockDeprecation = NonNullable<
  BlockConfiguration<Record<string, unknown>>["deprecated"]
>[number];

function legacyFilterWordPressAttributesV1(
  attributes: SerializedBlockAttributes,
): Record<string, unknown> {
  const {
    anchor: _anchor,
    lock: _lock,
    style: _style,
    ...fieldAttributes
  } = attributes;

  void _anchor;
  void _lock;
  void _style;

  return { ...fieldAttributes };
}

function legacyFilterWordPressAttributesV2(
  attributes: SerializedBlockAttributes,
): Record<string, unknown> {
  const fieldAttributes = legacyFilterWordPressAttributesV1(attributes);

  if (fieldAttributes.hidden === false) {
    delete fieldAttributes.hidden;
  }

  if (
    fieldAttributes.conditionalLogic &&
    typeof fieldAttributes.conditionalLogic === "object" &&
    !Array.isArray(fieldAttributes.conditionalLogic)
  ) {
    const conditionalLogic = fieldAttributes.conditionalLogic as Record<
      string,
      unknown
    >;
    const rules = Array.isArray(conditionalLogic.rules)
      ? conditionalLogic.rules
      : [];

    if (conditionalLogic.enabled !== true && rules.length === 0) {
      delete fieldAttributes.conditionalLogic;
    }
  }

  return fieldAttributes;
}

function legacyFilterWordPressAttributesV3(
  attributes: SerializedBlockAttributes,
): Record<string, unknown> {
  const fieldAttributes = legacyFilterWordPressAttributesV2(attributes);

  delete fieldAttributes.epGeneratedClass;

  for (const key of Object.keys(fieldAttributes)) {
    if (/generatedclass$/i.test(key) && key !== "className") {
      delete fieldAttributes[key];
    }
  }

  return fieldAttributes;
}

const LEGACY_FILTERS = [
  legacyFilterWordPressAttributesV3,
  legacyFilterWordPressAttributesV2,
  legacyFilterWordPressAttributesV1,
];

function renderLegacySerializedBlock(
  type: string,
  shape: LegacySaveShape,
  attributes: SerializedBlockAttributes,
  filterAttributes: (
    value: SerializedBlockAttributes,
  ) => Record<string, unknown>,
) {
  const payload = {
    type,
    ...filterAttributes(attributes),
  };

  return (
    <div
      {...useBlockProps.save({
        "data-smartcloud-flow-form-field": encodeData(payload),
      })}
    >
      {shape === "labeled-leaf" ? (
        <span hidden>{String(attributes.label ?? "")}</span>
      ) : null}
      {shape === "container" ? <InnerBlocks.Content /> : null}
    </div>
  );
}

function createLegacySerializedBlockDeprecations(
  type: string,
  attributes: Record<string, BlockAttribute>,
  shape: LegacySaveShape,
): LegacySerializedBlockDeprecation[] {
  return LEGACY_FILTERS.map((filterAttributes) => ({
    attributes,
    save({ attributes }: { attributes: Record<string, unknown> }) {
      return renderLegacySerializedBlock(
        type,
        shape,
        attributes as SerializedBlockAttributes,
        filterAttributes,
      );
    },
  }));
}

export function getLegacySerializedLeafBlockDeprecations(
  type: string,
  attributes: Record<string, BlockAttribute>,
) {
  return createLegacySerializedBlockDeprecations(type, attributes, "leaf");
}

export function getLegacySerializedLabeledLeafBlockDeprecations(
  type: string,
  attributes: Record<string, BlockAttribute>,
) {
  return createLegacySerializedBlockDeprecations(
    type,
    attributes,
    "labeled-leaf",
  );
}

export function getLegacySerializedContainerBlockDeprecations(
  type: string,
  attributes: Record<string, BlockAttribute>,
) {
  return createLegacySerializedBlockDeprecations(type, attributes, "container");
}
