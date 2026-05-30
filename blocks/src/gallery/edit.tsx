import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  InnerBlocks,
  InspectorControls,
  store as blockEditorStore,
  useBlockProps,
} from "@wordpress/block-editor";
import { useSelect } from "@wordpress/data";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";

type GalleryAttributes = {
  galleryId?: string;
  startIndex?: number;
  loop?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  showCaptions?: boolean;
};

const ALLOWED_BLOCKS = ["core/image"];

function normalizeGalleryId(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStartIndex(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
}

export default function Edit({
  attributes,
  setAttributes,
  clientId,
}: {
  attributes: GalleryAttributes;
  setAttributes: (next: Partial<GalleryAttributes>) => void;
  clientId: string;
}) {
  const imageCount = useSelect(
    (select) => {
      const { getBlocks } = select(blockEditorStore) as unknown as {
        getBlocks: (
          currentClientId: string,
        ) => Array<{ name?: string } | undefined>;
      };

      return getBlocks(clientId).filter((block) => block?.name === "core/image")
        .length;
    },
    [clientId],
  );
  const normalizedGalleryId = normalizeGalleryId(attributes.galleryId);
  const galleryTargetClass = normalizedGalleryId
    ? `wps-flow-gallery-target--${normalizedGalleryId}`
    : "wps-flow-gallery-target--your-gallery-id";
  const slideExampleCount = Math.max(1, Math.min(imageCount || 0, 4));
  const openerExamples = Array.from(
    { length: slideExampleCount },
    (_, index) => {
      return `wps-flow-modal-open--your-modal-id ${galleryTargetClass} wps-flow-gallery-index--${
        index + 1
      }`;
    },
  );
  const blockProps = useBlockProps({
    style: {
      border: "1px dashed #94a3b8",
      borderRadius: "12px",
      padding: "16px",
      background: "#f8fafc",
    },
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Gallery Settings", TEXT_DOMAIN)}>
          <TextControl
            label={__("Gallery ID", TEXT_DOMAIN)}
            value={attributes.galleryId ?? ""}
            onChange={(galleryId) => setAttributes({ galleryId })}
            help={__(
              "Optional slug-like identifier for modal openers, for example product-gallery.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__("Default image number", TEXT_DOMAIN)}
            type="number"
            min={1}
            value={String(attributes.startIndex ?? 1)}
            onChange={(value) =>
              setAttributes({ startIndex: normalizeStartIndex(value) })
            }
            help={__(
              "1-based fallback slide number used when the opener does not provide one.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Loop navigation", TEXT_DOMAIN)}
            checked={attributes.loop ?? true}
            onChange={(loop) => setAttributes({ loop })}
          />
          <ToggleControl
            label={__("Show counter", TEXT_DOMAIN)}
            checked={attributes.showCounter ?? true}
            onChange={(showCounter) => setAttributes({ showCounter })}
          />
          <ToggleControl
            label={__("Show thumbnails", TEXT_DOMAIN)}
            checked={attributes.showThumbnails ?? true}
            onChange={(showThumbnails) => setAttributes({ showThumbnails })}
          />
          <ToggleControl
            label={__("Show captions", TEXT_DOMAIN)}
            checked={attributes.showCaptions ?? true}
            onChange={(showCaptions) => setAttributes({ showCaptions })}
          />
        </PanelBody>
        <PanelBody
          title={__("Trigger Helper", TEXT_DOMAIN)}
          initialOpen={false}
        >
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ fontSize: "12px", color: "#475569" }}>
              {imageCount === 1
                ? __("This gallery currently contains 1 image.", TEXT_DOMAIN)
                : sprintf(
                    __(
                      "This gallery currently contains %d images.",
                      TEXT_DOMAIN,
                    ),
                    imageCount,
                  )}
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  marginBottom: "4px",
                  color: "#334155",
                }}
              >
                {__("Gallery target class", TEXT_DOMAIN)}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "8px 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  wordBreak: "break-all",
                }}
              >
                {galleryTargetClass}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  marginBottom: "4px",
                  color: "#334155",
                }}
              >
                {__("Sample opener classes", TEXT_DOMAIN)}
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {openerExamples.map((value, index) => (
                  <div
                    key={value}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      wordBreak: "break-all",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "inherit",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#64748b",
                        marginBottom: "4px",
                      }}
                    >
                      {sprintf(__("Image %d", TEXT_DOMAIN), index + 1)}
                    </div>
                    {value}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#475569" }}>
              {__(
                "Apply these classes on the outer Gutenberg block wrapper of the opener, for example a core Image or core Button block. Replace your-modal-id with the actual Flow modal ID.",
                TEXT_DOMAIN,
              )}
            </div>
          </div>
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div
          style={{
            color: "#334155",
            display: "grid",
            gap: "4px",
            marginBottom: "12px",
          }}
        >
          <strong>{__("Flow Gallery", TEXT_DOMAIN)}</strong>
          <span style={{ fontSize: "12px" }}>
            {__(
              "Add core Image blocks here. The frontend runtime can show prev/next controls, thumbnail navigation, and modal-driven start positions without Mantine.",
              TEXT_DOMAIN,
            )}
          </span>
          <span style={{ fontSize: "12px" }}>
            {normalizedGalleryId
              ? `${__("Target class:", TEXT_DOMAIN)} ${galleryTargetClass}`
              : __(
                  "Set a Gallery ID if you want external openers to target a specific gallery inside a modal.",
                  TEXT_DOMAIN,
                )}
          </span>
        </div>
        <InnerBlocks
          allowedBlocks={ALLOWED_BLOCKS}
          renderAppender={InnerBlocks.ButtonBlockAppender}
        />
      </div>
    </>
  );
}
