import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InspectorControls,
  useBlockProps,
  store as blockEditorStore,
} from "@wordpress/block-editor";
import {
  PanelBody,
  TextareaControl,
  TextControl,
  ToggleControl,
  __experimentalNumberControl as NumberControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { FileFieldAttributes } from "../shared/types";

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: FileFieldAttributes;
  setAttributes: (next: Partial<FileFieldAttributes>) => void;
  clientId: string;
}) {
  const { updateBlock } = useDispatch(blockEditorStore);

  const block = useSelect(
    (select) => {
      const { getBlock } = select(blockEditorStore);
      return getBlock(clientId);
    },
    [clientId],
  );

  useEffect(() => {
    if (
      block &&
      attributes.name &&
      block.attributes.anchor !== attributes.name
    ) {
      updateBlock(clientId, {
        attributes: {
          ...attributes,
          anchor: attributes.name,
        },
      });
    }
  }, [attributes, attributes.name, block, clientId, updateBlock]);

  const isHidden = Boolean(attributes.hidden);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("File Field Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Field name", TEXT_DOMAIN)}
            value={attributes.name ?? ""}
            onChange={(name) => setAttributes({ name })}
            help={__(
              "Unique field identifier (used in submissions and API).",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={attributes.label ?? ""}
            onChange={(label) => setAttributes({ label })}
            help={__("Displayed label for the field.", TEXT_DOMAIN)}
          />
          <TextareaControl
            label={__("Description", TEXT_DOMAIN)}
            value={attributes.description ?? ""}
            onChange={(description) => setAttributes({ description })}
            help={__("Short help text shown below the field.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Accept", TEXT_DOMAIN)}
            value={attributes.accept ?? ""}
            onChange={(accept) => setAttributes({ accept })}
            help={__("Accepted file types (e.g., image/*,.pdf)", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Required", TEXT_DOMAIN)}
            checked={attributes.required}
            onChange={(required) => setAttributes({ required })}
            help={__("Mark this field as required.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Multiple files", TEXT_DOMAIN)}
            checked={attributes.multiple}
            onChange={(multiple) => setAttributes({ multiple })}
            help={__("Allow multiple file uploads.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Max file size (MB)", TEXT_DOMAIN)}
            value={attributes.maxSize}
            onChange={(value) =>
              setAttributes({ maxSize: value ? Number(value) : undefined })
            }
            help={__("Maximum file size in megabytes.", TEXT_DOMAIN)}
          />
          <NumberControl
            label={__("Max files", TEXT_DOMAIN)}
            value={attributes.maxFiles}
            onChange={(value) =>
              setAttributes({ maxFiles: value ? Number(value) : undefined })
            }
            help={__(
              "Maximum number of files (when multiple is enabled).",
              TEXT_DOMAIN,
            )}
          />

          <ToggleControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={Boolean(attributes.hidden)}
            onChange={(hidden) => setAttributes({ hidden })}
            help={__("Hide this block by default.", TEXT_DOMAIN)}
          />
        </PanelBody>
        <ConditionalLogicPanel
          attributes={attributes}
          setAttributes={setAttributes}
          clientId={clientId}
        />
      </InspectorControls>
      <div {...useBlockProps()}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("File field", TEXT_DOMAIN)}
            summary={attributes.name || __("(unnamed)", TEXT_DOMAIN)}
          />
        ) : (
          <div
            style={{
              padding: "12px",
              border: "1px dashed #ccc",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
            }}
          >
            <div
              style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}
            >
              {__("File field", TEXT_DOMAIN)}
            </div>
            <div style={{ fontWeight: 500 }}>
              {attributes.name || __("(unnamed)", TEXT_DOMAIN)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
