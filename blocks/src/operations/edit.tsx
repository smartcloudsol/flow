import { DEFAULT_THEME } from "@mantine/core";
import { LANGUAGE_OPTIONS } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  Button,
  ColorPicker,
  ComboboxControl,
  PanelBody,
  Popover,
  RadioControl,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { DIRECTION_OPTIONS, TEXT_DOMAIN } from "..";

type OperationsTab = "submissions" | "templates" | "workflows";

interface OperationsBlockAttributes {
  title?: string;
  initialTab?: OperationsTab;
  availableTabs?: OperationsTab[];
  language?: string;
  direction?: string;
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  primaryShade?: { light?: number; dark?: number };
  colors?: Record<string, string>;
  themeOverrides?: string;
}

const TAB_OPTIONS = [
  { label: __("Submissions", TEXT_DOMAIN), value: "submissions" },
  { label: __("Templates", TEXT_DOMAIN), value: "templates" },
  { label: __("Workflows", TEXT_DOMAIN), value: "workflows" },
] as const;

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: OperationsBlockAttributes;
  setAttributes: (attributes: Partial<OperationsBlockAttributes>) => void;
}) {
  const blockProps = useBlockProps();
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(
    null,
  );
  const colorButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const availableTabs = attributes.availableTabs ?? [
    "submissions",
    "templates",
    "workflows",
  ];
  const previewTabs = TAB_OPTIONS.filter((option) =>
    availableTabs.includes(option.value as OperationsTab),
  );
  const previewTab =
    previewTabs.find((option) => option.value === attributes.initialTab) ??
    previewTabs[0] ??
    TAB_OPTIONS[0];

  const toggleTab = (tab: OperationsTab) => {
    const next = availableTabs.includes(tab)
      ? availableTabs.filter((value) => value !== tab)
      : [...availableTabs, tab];

    const normalized = next.length ? next : [tab];

    setAttributes({
      availableTabs: normalized,
      initialTab: normalized.includes(attributes.initialTab ?? "submissions")
        ? attributes.initialTab
        : normalized[0],
    });
  };

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Flow Operations", TEXT_DOMAIN)} initialOpen>
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
            help={__("Set the operations UI display language.", TEXT_DOMAIN)}
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={attributes.direction || "auto"}
            options={DIRECTION_OPTIONS}
            onChange={(value) => {
              setAttributes({ direction: value });
            }}
            help={__(
              "Choose the operations layout direction—Auto (default; follows the selected language), Left‑to‑Right, or Right‑to‑Left.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Title", TEXT_DOMAIN)}
            value={attributes.title ?? ""}
            onChange={(title) => setAttributes({ title })}
          />
          <SelectControl
            label={__("Initial tab", TEXT_DOMAIN)}
            value={attributes.initialTab ?? "submissions"}
            options={TAB_OPTIONS.filter((option) =>
              availableTabs.includes(option.value as OperationsTab),
            )}
            onChange={(initialTab) =>
              setAttributes({ initialTab: initialTab as OperationsTab })
            }
          />
          {TAB_OPTIONS.map((option) => (
            <ToggleControl
              key={option.value}
              label={option.label}
              checked={availableTabs.includes(option.value as OperationsTab)}
              onChange={() => toggleTab(option.value as OperationsTab)}
            />
          ))}
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
                colorMode: colorMode as OperationsBlockAttributes["colorMode"],
              })
            }
            help={__(
              "Select the operations color scheme—Light, Dark, or Auto (follows the user's system preference).",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <ComboboxControl
            label={__("Primary Color", TEXT_DOMAIN)}
            value={attributes.primaryColor || ""}
            options={[
              ...Object.keys(DEFAULT_THEME.colors).map((color) => ({
                label: __(color, TEXT_DOMAIN),
                value: color,
              })),
              ...(attributes.colors
                ? Object.keys(attributes.colors).map((color) => ({
                    label: __(color, TEXT_DOMAIN),
                    value: color,
                  }))
                : []),
            ]}
            onChange={(value) => {
              setAttributes({ primaryColor: value ?? "" });
            }}
            help={__(
              "Set the primary color for the operations UI (default Mantine colors and your custom colors).",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{ fontWeight: 600, display: "block", marginBottom: 4 }}
            >
              {__("Custom Colors", TEXT_DOMAIN)}
            </label>
            {!attributes.colors ||
            Object.keys(attributes.colors).length === 0 ? (
              <div style={{ color: "#888", marginBottom: 8 }}>
                {__("No custom color definitions yet.", TEXT_DOMAIN)}
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {Object.entries(attributes.colors).map(([key, val]) => (
                  <li
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 8,
                    }}
                  >
                    <TextControl
                      label={__("Name", TEXT_DOMAIN)}
                      value={key}
                      style={{ minWidth: 80, flex: 1 }}
                      onChange={(newKey) => {
                        if (!newKey || newKey === key) return;
                        const newColors = { ...attributes.colors };
                        delete newColors[key];
                        newColors[newKey] = val;
                        setAttributes({ colors: newColors });
                      }}
                    />
                    <TextControl
                      label={__("Value", TEXT_DOMAIN)}
                      value={val}
                      style={{ maxWidth: 90 }}
                      onChange={(newValue) => {
                        setAttributes({
                          colors: {
                            ...(attributes.colors || {}),
                            [key]: newValue,
                          },
                        });
                      }}
                    />
                    <Button
                      ref={(el) => {
                        colorButtonRefs.current[key] = el;
                      }}
                      type="button"
                      onClick={() =>
                        setActiveColorPicker(
                          activeColorPicker === key ? null : key,
                        )
                      }
                      aria-label={__("Pick color", TEXT_DOMAIN)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        padding: 0,
                        border: "1px solid #ccc",
                        backgroundColor: val || "#000000",
                      }}
                    />
                    {activeColorPicker === key &&
                    colorButtonRefs.current[key] ? (
                      <Popover
                        anchor={colorButtonRefs.current[key]}
                        onClose={() => setActiveColorPicker(null)}
                        focusOnMount={false}
                      >
                        <ColorPicker
                          color={val}
                          onChangeComplete={(color) => {
                            const nextColor = (color as { hex: string }).hex;
                            setAttributes({
                              colors: {
                                ...(attributes.colors || {}),
                                [key]: nextColor,
                              },
                            });
                          }}
                          disableAlpha
                        />
                      </Popover>
                    ) : null}
                    <Button
                      icon="no-alt"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        const newColors = { ...(attributes.colors || {}) };
                        delete newColors[key];
                        setAttributes({ colors: newColors });
                      }}
                      style={{
                        color: "#d63638",
                        cursor: "pointer",
                        fontSize: 16,
                        background: "none",
                        border: "none",
                      }}
                      aria-label={__("Remove color", TEXT_DOMAIN)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="secondary"
              style={{ marginTop: 8, padding: "4px 12px", fontSize: 14 }}
              onClick={() => {
                let index = 1;
                const baseName = "custom";
                while (attributes.colors?.[`${baseName}${index}`]) {
                  index += 1;
                }
                setAttributes({
                  colors: {
                    ...(attributes.colors || {}),
                    [`${baseName}${index}`]: "#000000",
                  },
                });
              }}
            >
              {__("Add Color", TEXT_DOMAIN)}
            </Button>
            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              {__(
                "Define custom colors as name and base color (e.g. brand: #0ea5e9). Mantine will generate 10 shades for each.",
                TEXT_DOMAIN,
              )}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <ComboboxControl
            label={__("Primary Shade (Light)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.light?.toString() || ""}
            options={Array.from({ length: 10 }, (_, index) => ({
              label: index.toString(),
              value: index.toString(),
            }))}
            onChange={(value) => {
              const parsed = value ? parseInt(value, 10) : undefined;
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  light: parsed,
                },
              });
            }}
            help={__(
              "Set the primary shade for light mode (0–9). Leave empty for default.",
              TEXT_DOMAIN,
            )}
          />
          <ComboboxControl
            label={__("Primary Shade (Dark)", TEXT_DOMAIN)}
            value={attributes.primaryShade?.dark?.toString() || ""}
            options={Array.from({ length: 10 }, (_, index) => ({
              label: index.toString(),
              value: index.toString(),
            }))}
            onChange={(value) => {
              const parsed = value ? parseInt(value, 10) : undefined;
              setAttributes({
                primaryShade: {
                  ...attributes.primaryShade,
                  dark: parsed,
                },
              });
            }}
            help={__(
              "Set the primary shade for dark mode (0–9). Leave empty for default.",
              TEXT_DOMAIN,
            )}
          />
          <div style={{ borderTop: "1px solid #ddd", margin: "12px 0" }} />
          <TextareaControl
            label={__("Theme Overrides", TEXT_DOMAIN)}
            value={attributes.themeOverrides || ""}
            onChange={(themeOverrides) => setAttributes({ themeOverrides })}
            help={__(
              "Add scoped CSS to the operations container—primarily to override design tokens (--mantine), but you can include other styles too.",
              TEXT_DOMAIN,
            )}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div
          style={{
            border: "1px solid #d0d7de",
            borderRadius: "16px",
            background: "linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%)",
            padding: "20px",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              {attributes.title || __("Flow Operations", TEXT_DOMAIN)}
            </div>
            <div style={{ color: "#475569", lineHeight: 1.5 }}>
              {__(
                "Protected frontend operations console for submissions, templates, and workflows.",
                TEXT_DOMAIN,
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            {previewTabs.map((tab) => {
              const active = tab.value === previewTab.value;
              return (
                <div
                  key={tab.value}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: active ? "1px solid #0f766e" : "1px solid #cbd5e1",
                    background: active ? "#ccfbf1" : "#ffffff",
                    color: active ? "#115e59" : "#334155",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {tab.label}
                </div>
              );
            })}
          </div>

          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#ffffff",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                {previewTab.label}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0369a1",
                  background: "#e0f2fe",
                  borderRadius: "999px",
                  padding: "6px 10px",
                }}
              >
                {__("Editor preview", TEXT_DOMAIN)}
              </div>
            </div>

            <div style={{ color: "#475569", marginBottom: "14px" }}>
              {__(
                "The real operations app mounts on the protected frontend page in an isolated shadow root. This preview shows the selected tabs and entry point only.",
                TEXT_DOMAIN,
              )}
            </div>

            <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155" }}>
              {previewTabs.map((tab) => (
                <li key={tab.value} style={{ marginBottom: "6px" }}>
                  {tab.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
