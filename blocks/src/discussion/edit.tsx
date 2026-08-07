import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, SelectControl, TextControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "..";
import type { DiscussionAttributes } from "./types";

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: DiscussionAttributes;
  setAttributes: (attributes: Partial<DiscussionAttributes>) => void;
}) {
  const blockProps = useBlockProps({ className: "smartcloud-flow-discussion-editor" });
  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody title={__("Discussion settings", TEXT_DOMAIN)} initialOpen>
          <TextControl label={__("Form ID", TEXT_DOMAIN)} value={attributes.formId || ""} onChange={(formId) => setAttributes({ formId })} />
          <SelectControl
            label={__("Target source", TEXT_DOMAIN)}
            value={attributes.contentTargetSource || "wordpress-context"}
            options={[
              { label: __("Current WordPress content", TEXT_DOMAIN), value: "wordpress-context" },
              { label: __("Explicit content reference", TEXT_DOMAIN), value: "explicit" },
              { label: __("Canonical page URL", TEXT_DOMAIN), value: "canonical-url" },
            ]}
            onChange={(contentTargetSource) => setAttributes({ contentTargetSource: contentTargetSource as DiscussionAttributes["contentTargetSource"] })}
          />
          {attributes.contentTargetSource === "explicit" ? (
            <>
              <TextControl label={__("Target namespace", TEXT_DOMAIN)} value={attributes.targetNamespace || ""} onChange={(targetNamespace) => setAttributes({ targetNamespace })} />
              <TextControl label={__("Target type", TEXT_DOMAIN)} value={attributes.targetType || ""} onChange={(targetType) => setAttributes({ targetType })} />
              <TextControl label={__("Target ID", TEXT_DOMAIN)} value={attributes.targetId || ""} onChange={(targetId) => setAttributes({ targetId })} />
            </>
          ) : null}
          <TextControl label={__("Discussion channel", TEXT_DOMAIN)} value={attributes.discussionChannel || ""} onChange={(discussionChannel) => setAttributes({ discussionChannel })} />
          <TextControl type="number" min={1} max={50} label={__("Root page size", TEXT_DOMAIN)} value={String(attributes.pageSize ?? 20)} onChange={(value) => setAttributes({ pageSize: Number(value) })} />
          <TextControl type="number" min={1} max={50} label={__("Reply page size", TEXT_DOMAIN)} value={String(attributes.replyPageSize ?? 10)} onChange={(value) => setAttributes({ replyPageSize: Number(value) })} />
          <TextControl type="number" min={0} max={5} label={__("Reply preview count", TEXT_DOMAIN)} value={String(attributes.replyPreviewLimit ?? 2)} onChange={(value) => setAttributes({ replyPreviewLimit: Number(value) })} />
          {(["title", "emptyMessage", "loadingMessage", "errorMessage", "retryLabel", "anonymousAuthorLabel", "tombstoneLabel", "replyLabel", "cancelReplyLabel", "loadMoreLabel", "loadRepliesLabel", "depthLimitLabel"] as const).map((key) => (
            <TextControl key={key} label={key} value={attributes[key] || ""} onChange={(value) => setAttributes({ [key]: value })} />
          ))}
        </PanelBody>
      </InspectorControls>
      <strong>{attributes.title}</strong>
      <p>{__("Discussion items load from the Flow backend on the published or exported page.", TEXT_DOMAIN)}</p>
    </div>
  );
}
