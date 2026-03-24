import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  useBlockProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { ConditionalLogicPanel } from "../shared/ConditionalLogicPanel";
import { FORM_CHILD_BLOCKS } from "../shared/form-child-blocks";
import { HiddenBlockPreview } from "../shared/HiddenBlockPreview";
import type { ConditionalAttributes } from "../shared/types";

interface CollapseAttributes extends ConditionalAttributes {
  title?: string;
  defaultOpened?: boolean;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: CollapseAttributes;
  setAttributes: (next: Partial<CollapseAttributes>) => void;
  clientId: string;
}) {
  const [opened, setOpened] = useState(Boolean(attributes.defaultOpened));
  const isHidden = Boolean(attributes.hidden);
  const blockProps = useBlockProps(
    isHidden
      ? {}
      : {
          style: {
            border: "1px solid #ccc",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#fff",
            borderRadius: "4px",
          },
        },
  );

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Collapse Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
            help={__("Collapse trigger text.", TEXT_DOMAIN)}
          />
          <ToggleControl
            label={__("Default opened", TEXT_DOMAIN)}
            checked={attributes.defaultOpened}
            onChange={(defaultOpened) => setAttributes({ defaultOpened })}
            help={__("Open by default.", TEXT_DOMAIN)}
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
          setAttributes={setAttributes as (next: unknown) => void}
          clientId={clientId}
          allowedActions={["show", "hide"]}
        />
      </InspectorControls>
      <div {...blockProps}>
        {isHidden ? (
          <HiddenBlockPreview
            title={__("Collapse", TEXT_DOMAIN)}
            summary={attributes.title || __("Show more", TEXT_DOMAIN)}
          />
        ) : (
          <>
            <div
              onClick={() => setOpened((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpened((current) => !current);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={opened}
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#333",
                marginBottom: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{attributes.title || __("Show more", TEXT_DOMAIN)}</span>
              <span>{opened ? "▼" : "▶"}</span>
            </div>
            {opened ? (
              <div style={{ paddingLeft: "16px" }}>
                <InnerBlocks
                  allowedBlocks={FORM_CHILD_BLOCKS as unknown as string[]}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
