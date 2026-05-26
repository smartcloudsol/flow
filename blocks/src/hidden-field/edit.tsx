import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import {
  buildRuntimeBindingValue,
  parseRuntimeBindingValue,
  type RuntimeBindingKind,
} from "../shared/runtime-binding-options";
import type { HiddenFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: HiddenFieldAttributes;
  setAttributes: (next: Partial<HiddenFieldAttributes>) => void;
  clientId: string;
}) {
  const defaultValueBinding = parseRuntimeBindingValue(attributes.defaultValue);
  const [selectedBindingKind, setSelectedBindingKind] =
    useState<RuntimeBindingKind>(defaultValueBinding.kind);

  useEffect(() => {
    if (
      selectedBindingKind === "query" &&
      defaultValueBinding.kind === "manual" &&
      String(attributes.defaultValue ?? "") === ""
    ) {
      return;
    }

    setSelectedBindingKind(defaultValueBinding.kind);
  }, [attributes.defaultValue, defaultValueBinding.kind, selectedBindingKind]);

  const activeBindingKind: RuntimeBindingKind =
    selectedBindingKind === "query" &&
    defaultValueBinding.kind === "manual" &&
    String(attributes.defaultValue ?? "") === ""
      ? "query"
      : defaultValueBinding.kind;

  const summaryParts = [attributes.name, attributes.defaultValue]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);

  const bindingOptions = [
    { label: __("Custom value", TEXT_DOMAIN), value: "manual" },
    { label: __("Current post ID", TEXT_DOMAIN), value: "wp.postId" },
    { label: __("Current post slug", TEXT_DOMAIN), value: "wp.postSlug" },
    { label: __("Current post type", TEXT_DOMAIN), value: "wp.postType" },
    { label: __("Current post title", TEXT_DOMAIN), value: "wp.postTitle" },
    { label: __("Current post URL", TEXT_DOMAIN), value: "wp.postUrl" },
    {
      label: __("URL query parameter", TEXT_DOMAIN),
      value: "query",
    },
  ];

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Hidden Field Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Field name", TEXT_DOMAIN)}
            value={attributes.name ?? ""}
            onChange={(name) => setAttributes({ name })}
            help={__(
              "Unique field identifier (used in submissions and API).",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Default source", TEXT_DOMAIN)}
            value={activeBindingKind}
            options={bindingOptions}
            onChange={(kind) => {
              const nextKind = kind as RuntimeBindingKind;
              setSelectedBindingKind(nextKind);
              setAttributes({
                defaultValue: buildRuntimeBindingValue(nextKind, {
                  customValue: defaultValueBinding.customValue,
                  queryParamName: defaultValueBinding.queryParamName,
                }),
              });
            }}
            help={__(
              "Choose a runtime source for the hidden field, or keep a custom static value.",
              TEXT_DOMAIN,
            )}
          />
          {activeBindingKind === "manual" ? (
            <TextControl
              label={__("Default value", TEXT_DOMAIN)}
              value={defaultValueBinding.customValue}
              onChange={(defaultValue) => setAttributes({ defaultValue })}
              help={__(
                "Optional static value sent with the form unless overwritten from JS/store.",
                TEXT_DOMAIN,
              )}
            />
          ) : null}
          {activeBindingKind === "query" ? (
            <TextControl
              label={__("URL query parameter", TEXT_DOMAIN)}
              value={defaultValueBinding.queryParamName}
              onChange={(queryParamName) =>
                setAttributes({
                  defaultValue: buildRuntimeBindingValue("query", {
                    queryParamName,
                  }),
                })
              }
              help={__(
                "For replies or contextual forms, read the value from the current page URL, for example replyTo or submissionId.",
                TEXT_DOMAIN,
              )}
            />
          ) : null}
          <ToggleControl
            label={__("Hidden by conditional logic", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__(
              "Keeps this field disabled/hidden in conditional state processing.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes}
          setAttributes={setAttributes}
          clientId={clientId}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        <HiddenBlockPreview
          title={__("Hidden field", TEXT_DOMAIN)}
          summary={
            summaryParts.length > 0
              ? summaryParts.join(" = ")
              : __("(unnamed)", TEXT_DOMAIN)
          }
        />
      </div>
    </>
  );
}
