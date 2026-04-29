import { DEFAULT_THEME } from "@mantine/core";
import { LANGUAGE_OPTIONS, waitForFlowReady } from "@smart-cloud/flow-core";
import {
  BlockControls,
  InnerBlocks,
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  Button,
  ColorPicker,
  ComboboxControl,
  PanelBody,
  Popover,
  RadioControl,
  TextareaControl,
  TextControl,
  ToolbarButton,
  ToolbarGroup,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { close, settings } from "@wordpress/icons";
import { DIRECTION_OPTIONS, TEXT_DOMAIN } from "..";
import { CONTENT_ROOT_CHILD_BLOCKS } from "../shared/form-child-blocks";
import type { FieldConfig, FormAttributes } from "../shared/types";
import {
  renderContentRoot,
  type RenderContentRootHandle,
} from "./renderContentRoot";

type ContentRootBlockAttributes = Pick<
  FormAttributes,
  | "language"
  | "direction"
  | "colorMode"
  | "primaryColor"
  | "primaryShade"
  | "colors"
  | "themeOverrides"
>;

type ContentRootBlockInstance = {
  name: string;
  attributes?: Record<string, unknown>;
  innerBlocks?: ContentRootBlockInstance[];
};

function cloneContentRootBlockInstance(
  block: ContentRootBlockInstance,
): ContentRootBlockInstance {
  return {
    name: block.name,
    attributes: block.attributes ? { ...block.attributes } : undefined,
    innerBlocks: (block.innerBlocks || []).map(cloneContentRootBlockInstance),
  };
}

const CONTENT_ROOT_FIELD_BLOCK_MAPPING: Record<string, FieldConfig["type"]> = {
  "smartcloud-flow/title": "display-title",
  "smartcloud-flow/blockquote": "display-blockquote",
  "smartcloud-flow/mark": "display-mark",
  "smartcloud-flow/badge": "display-badge",
  "smartcloud-flow/highlight": "display-highlight",
  "smartcloud-flow/code": "display-code",
  "smartcloud-flow/number-formatter": "display-number-formatter",
  "smartcloud-flow/spoiler": "display-spoiler",
  "smartcloud-flow/image": "display-image",
  "smartcloud-flow/text": "display-text",
  "smartcloud-flow/list": "list",
  "smartcloud-flow/list-item": "list-item",
  "smartcloud-flow/table": "table",
  "smartcloud-flow/table-tr": "table-row",
  "smartcloud-flow/table-th": "table-th",
  "smartcloud-flow/table-td": "table-td",
  "smartcloud-flow/timeline": "timeline",
  "smartcloud-flow/timeline-item": "timeline-item",
  "smartcloud-flow/overflow-list": "overflow-list",
  "smartcloud-flow/overflow-list-item": "overflow-list-item",
  "smartcloud-flow/fieldset": "fieldset",
  "smartcloud-flow/collapse": "collapse",
  "smartcloud-flow/divider": "divider",
  "smartcloud-flow/visually-hidden": "visuallyhidden",
  "smartcloud-flow/stack": "stack",
  "smartcloud-flow/group": "group",
  "smartcloud-flow/grid": "grid",
};

function blockToContentRootFieldConfig(
  block: ContentRootBlockInstance,
): FieldConfig | null {
  const fieldType = CONTENT_ROOT_FIELD_BLOCK_MAPPING[block.name];
  if (!fieldType) {
    return null;
  }

  if (
    fieldType === "stack" ||
    fieldType === "group" ||
    fieldType === "grid" ||
    fieldType === "fieldset" ||
    fieldType === "collapse" ||
    fieldType === "list" ||
    fieldType === "list-item" ||
    fieldType === "table" ||
    fieldType === "table-row" ||
    fieldType === "table-th" ||
    fieldType === "table-td" ||
    fieldType === "timeline" ||
    fieldType === "timeline-item" ||
    fieldType === "overflow-list" ||
    fieldType === "overflow-list-item" ||
    fieldType === "visuallyhidden"
  ) {
    const children = (block.innerBlocks || [])
      .map(blockToContentRootFieldConfig)
      .filter(Boolean) as FieldConfig[];

    return {
      type: fieldType,
      ...(block.attributes as Record<string, unknown>),
      children,
    } as FieldConfig;
  }

  return {
    type: fieldType,
    ...(block.attributes as Record<string, unknown>),
  } as FieldConfig;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: ContentRootBlockAttributes;
  setAttributes: (attributes: Partial<ContentRootBlockAttributes>) => void;
  clientId: string;
}) {
  const blockProps = useBlockProps({
    className: "smartcloud-flow-content-root-editor",
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<RenderContentRootHandle | null>(null);
  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(
    null,
  );
  const colorButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const innerBlocks = useSelect(
    (select) => {
      const { getBlocks } = select(blockEditorStore) as unknown as {
        getBlocks: (id: string) => ContentRootBlockInstance[];
      };

      return getBlocks(clientId).map(cloneContentRootBlockInstance);
    },
    [clientId],
  );
  const fields = useMemo(
    () =>
      (innerBlocks || [])
        .map(blockToContentRootFieldConfig)
        .filter(Boolean) as FieldConfig[],
    [innerBlocks],
  );
  const fieldsKey = JSON.stringify(fields);
  const colorOptions = Array.from(
    new Set([
      ...Object.keys(DEFAULT_THEME.colors),
      ...Object.keys(attributes.colors || {}),
    ]),
  ).map((color) => ({
    label: __(color, TEXT_DOMAIN),
    value: color,
  }));

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    let cancelled = false;
    const previewTarget = previewRef.current;

    const doRender = async () => {
      if (handleRef.current) {
        handleRef.current.unmount();
        handleRef.current = null;
      }

      if (cancelled) {
        return;
      }

      try {
        await waitForFlowReady();

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

        if (
          cancelled ||
          !previewTarget.isConnected ||
          previewRef.current !== previewTarget
        ) {
          return;
        }

        const handle = await renderContentRoot({
          target: previewTarget,
          rootAttributes: attributes as FormAttributes,
          fields,
        });

        if (!cancelled) {
          handleRef.current = handle;
        } else {
          handle.unmount();
        }
      } catch (error) {
        console.error("Failed to render content root preview:", error);
      }
    };

    void doRender();

    return () => {
      cancelled = true;
      if (handleRef.current) {
        handleRef.current.unmount();
        handleRef.current = null;
      }
    };
    // fieldsKey already captures the preview structure, so the raw fields
    // array must not retrigger the shadow-root preview on unrelated editor
    // store updates like selection changes caused by clicking inside preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, fieldsKey]);

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton
            icon={showCustomization ? close : settings}
            label={
              showCustomization
                ? __("Hide Content Editor", TEXT_DOMAIN)
                : __("Show Content Editor", TEXT_DOMAIN)
            }
            onClick={() => setShowCustomization(!showCustomization)}
          />
        </ToolbarGroup>
      </BlockControls>
      <InspectorControls>
        <PanelBody title={__("Flow Content Root", TEXT_DOMAIN)} initialOpen>
          <ComboboxControl
            label={__("Language", TEXT_DOMAIN)}
            value={attributes.language || ""}
            options={[
              { value: "", label: __("--- Select ---", TEXT_DOMAIN) },
              ...LANGUAGE_OPTIONS,
            ]}
            onChange={(value) => {
              setAttributes({ language: value || undefined });
            }}
            help={__(
              "Set the display language for this content root.",
              TEXT_DOMAIN,
            )}
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={attributes.direction || "auto"}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => setAttributes({ direction })}
            help={__(
              "Choose the content layout direction or follow the selected language automatically.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>

        <PanelBody title={__("Theming", TEXT_DOMAIN)} initialOpen={false}>
          <RadioControl
            label={__("Color Mode", TEXT_DOMAIN)}
            selected={attributes.colorMode || "light"}
            options={[
              { label: __("Light", TEXT_DOMAIN), value: "light" },
              { label: __("Dark", TEXT_DOMAIN), value: "dark" },
              { label: __("Auto", TEXT_DOMAIN), value: "auto" },
            ]}
            onChange={(colorMode) =>
              setAttributes({
                colorMode: colorMode as ContentRootBlockAttributes["colorMode"],
              })
            }
          />
          <ComboboxControl
            label={__("Primary Color", TEXT_DOMAIN)}
            value={attributes.primaryColor || ""}
            options={colorOptions}
            onChange={(value) => setAttributes({ primaryColor: value || "" })}
            help={__(
              "Pick a built-in Mantine color or one of your custom colors.",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}
            >
              {__("Custom Colors", TEXT_DOMAIN)}
            </label>
            {!attributes.colors ||
            Object.keys(attributes.colors).length === 0 ? (
              <div style={{ color: "#666", marginBottom: "8px" }}>
                {__("No custom color definitions yet.", TEXT_DOMAIN)}
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {Object.entries(attributes.colors).map(([name, value]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <TextControl
                      label={__("Name", TEXT_DOMAIN)}
                      value={name}
                      onChange={(nextName) => {
                        if (!nextName || nextName === name) {
                          return;
                        }

                        const nextColors = { ...(attributes.colors || {}) };
                        delete nextColors[name];
                        nextColors[nextName] = value;
                        setAttributes({ colors: nextColors });
                      }}
                    />
                    <TextControl
                      label={__("Value", TEXT_DOMAIN)}
                      value={value}
                      onChange={(nextValue) => {
                        setAttributes({
                          colors: {
                            ...(attributes.colors || {}),
                            [name]: nextValue,
                          },
                        });
                      }}
                    />
                    <Button
                      ref={(element) => {
                        colorButtonRefs.current[name] = element;
                      }}
                      onClick={() =>
                        setActiveColorPicker(
                          activeColorPicker === name ? null : name,
                        )
                      }
                      aria-label={__("Pick color", TEXT_DOMAIN)}
                      style={{
                        width: "32px",
                        minWidth: "32px",
                        height: "32px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: value || "#000000",
                      }}
                    />
                    {activeColorPicker === name &&
                    colorButtonRefs.current[name] ? (
                      <Popover
                        anchor={colorButtonRefs.current[name]}
                        onClose={() => setActiveColorPicker(null)}
                        focusOnMount={false}
                      >
                        <ColorPicker
                          color={value}
                          onChangeComplete={(color) => {
                            const nextColor = (color as { hex: string }).hex;
                            setAttributes({
                              colors: {
                                ...(attributes.colors || {}),
                                [name]: nextColor,
                              },
                            });
                          }}
                          disableAlpha
                        />
                      </Popover>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const nextColors = { ...(attributes.colors || {}) };
                        delete nextColors[name];
                        setAttributes({ colors: nextColors });
                      }}
                    >
                      {__("Remove", TEXT_DOMAIN)}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              style={{ marginTop: "8px" }}
              onClick={() => {
                let index = 1;
                while (attributes.colors?.[`custom${index}`]) {
                  index += 1;
                }

                setAttributes({
                  colors: {
                    ...(attributes.colors || {}),
                    [`custom${index}`]: "#0f766e",
                  },
                });
              }}
            >
              {__("Add Color", TEXT_DOMAIN)}
            </Button>
          </div>
          <ComboboxControl
            label={__("Primary Shade (Light)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.light?.toString() || ""}
            options={Array.from({ length: 10 }, (_, index) => ({
              label: index.toString(),
              value: index.toString(),
            }))}
            onChange={(value) => {
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  light: value ? parseInt(value, 10) : undefined,
                },
              });
            }}
          />
          <ComboboxControl
            label={__("Primary Shade (Dark)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.dark?.toString() || ""}
            options={Array.from({ length: 10 }, (_, index) => ({
              label: index.toString(),
              value: index.toString(),
            }))}
            onChange={(value) => {
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  dark: value ? parseInt(value, 10) : undefined,
                },
              });
            }}
          />
          <TextareaControl
            label={__("Theme Overrides", TEXT_DOMAIN)}
            value={attributes.themeOverrides || ""}
            onChange={(themeOverrides) => setAttributes({ themeOverrides })}
            help={__(
              "Optional CSS injected into the shadow root for advanced theming adjustments.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div
          ref={previewRef}
          style={{
            border: "1px dashed #0f766e",
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: "#f0fdfa",
            marginBottom: showCustomization ? "20px" : 0,
            minHeight: "48px",
          }}
        />

        {!fields.length ? (
          <div
            style={{
              color: "#0f766e",
              fontSize: "13px",
              marginTop: "8px",
              marginBottom: showCustomization ? "12px" : 0,
            }}
          >
            {__(
              "Add Flow display or layout blocks to build this content root preview.",
              TEXT_DOMAIN,
            )}
          </div>
        ) : null}

        <div style={{ display: showCustomization ? "block" : "none" }}>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "16px",
              backgroundColor: "#f5f5f5",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#757575",
                  margin: 0,
                  marginBottom: "8px",
                }}
              >
                {__("Edit content blocks:", TEXT_DOMAIN)}
              </p>
              <InnerBlocks
                allowedBlocks={CONTENT_ROOT_CHILD_BLOCKS as unknown as string[]}
                renderAppender={InnerBlocks.ButtonBlockAppender}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
