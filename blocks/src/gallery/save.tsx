import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";

function normalizeGalleryId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStartIndex(value: unknown): number {
  const parsedValue = Number.parseInt(String(value ?? "1"), 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
}

export default function Save({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const galleryId = normalizeGalleryId(attributes.galleryId);
  const blockProps = useBlockProps.save({
    className: "wps-flow-gallery",
    "data-wps-flow-gallery": "true",
    ...(galleryId !== "" ? { "data-wps-flow-gallery-id": galleryId } : {}),
    "data-wps-flow-gallery-start-index": String(
      normalizeStartIndex(attributes.startIndex),
    ),
    "data-wps-flow-gallery-loop": String(attributes.loop !== false),
    "data-wps-flow-gallery-show-counter": String(
      attributes.showCounter !== false,
    ),
    "data-wps-flow-gallery-show-thumbnails": String(
      attributes.showThumbnails !== false,
    ),
    "data-wps-flow-gallery-show-captions": String(
      attributes.showCaptions !== false,
    ),
  });

  return (
    <div {...blockProps}>
      <InnerBlocks.Content />
    </div>
  );
}
