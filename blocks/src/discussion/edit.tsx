import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "..";
import type { DiscussionAttributes } from "./types";
import { parseTextList } from "../shared/field-utils";

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
          <SelectControl
            label={__("Comment access", TEXT_DOMAIN)}
            value={attributes.discussionAuthMode || "anonymous"}
            options={[
              { label: __("Anonymous visitors", TEXT_DOMAIN), value: "anonymous" },
              { label: __("Visitors or signed-in users", TEXT_DOMAIN), value: "optional" },
              { label: __("Signed-in users only", TEXT_DOMAIN), value: "required" },
            ]}
            onChange={(discussionAuthMode) =>
              setAttributes({
                discussionAuthMode: discussionAuthMode as DiscussionAttributes["discussionAuthMode"],
              })
            }
          />
          {attributes.discussionAuthMode !== "anonymous" ? (
            <TextareaControl
              label={__("Allowed Cognito groups", TEXT_DOMAIN)}
              value={(attributes.discussionAllowedGroups || []).join("\n")}
              onChange={(value) =>
                setAttributes({ discussionAllowedGroups: parseTextList(value) })
              }
            />
          ) : null}
          <TextControl type="number" min={1} max={50} label={__("Root page size", TEXT_DOMAIN)} value={String(attributes.pageSize ?? 20)} onChange={(value) => setAttributes({ pageSize: Number(value) })} />
          <TextControl type="number" min={1} max={50} label={__("Reply page size", TEXT_DOMAIN)} value={String(attributes.replyPageSize ?? 10)} onChange={(value) => setAttributes({ replyPageSize: Number(value) })} />
          <TextControl type="number" min={0} max={5} label={__("Reply preview count", TEXT_DOMAIN)} value={String(attributes.replyPreviewLimit ?? 2)} onChange={(value) => setAttributes({ replyPreviewLimit: Number(value) })} />
          <ToggleControl
            label={__("Show rating summary", TEXT_DOMAIN)}
            checked={attributes.showRatingSummary ?? true}
            onChange={(showRatingSummary) => setAttributes({ showRatingSummary })}
          />
          <ToggleControl
            label={__("Show rating filter", TEXT_DOMAIN)}
            checked={attributes.showRatingFilter ?? true}
            onChange={(showRatingFilter) => setAttributes({ showRatingFilter })}
          />
          <SelectControl
            label={__("Default rating filter", TEXT_DOMAIN)}
            value={attributes.ratingFilterOperator || "all"}
            options={[
              { label: __("All ratings", TEXT_DOMAIN), value: "all" },
              { label: __("Exactly", TEXT_DOMAIN), value: "eq" },
              { label: __("At least", TEXT_DOMAIN), value: "gte" },
              { label: __("At most", TEXT_DOMAIN), value: "lte" },
            ]}
            onChange={(ratingFilterOperator) =>
              setAttributes({
                ratingFilterOperator:
                  ratingFilterOperator as DiscussionAttributes["ratingFilterOperator"],
              })
            }
          />
          {attributes.ratingFilterOperator && attributes.ratingFilterOperator !== "all" ? (
            <TextControl
              type="number"
              min={0}
              step={0.1}
              label={__("Default rating value", TEXT_DOMAIN)}
              value={String(attributes.ratingFilterValue ?? 5)}
              onChange={(value) => setAttributes({ ratingFilterValue: Number(value) })}
            />
          ) : null}
          {(["title", "emptyMessage", "loadingMessage", "errorMessage", "retryLabel", "anonymousAuthorLabel", "tombstoneLabel", "replyLabel", "cancelReplyLabel", "loadMoreLabel", "loadReplyLabel", "loadRepliesLabel", "replyCountLabel", "replyCountPluralLabel", "commentCountLabel", "commentCountPluralLabel", "depthLimitLabel", "editLabel", "deleteLabel", "saveEditLabel", "cancelEditLabel", "editedLabel", "deleteConfirmTitle", "deleteConfirmMessage", "deleteConfirmLabel", "cancelDeleteLabel", "actionErrorMessage", "allRatingsLabel", "atLeastLabel", "atMostLabel", "averageRatingLabel", "exactlyLabel", "filterRatingsLabel", "ratingCountLabel", "ratingCountPluralLabel", "ratingDistributionLabel", "ratingValueLabel", "ratingValueTemplate"] as const).map((key) => (
            <TextControl key={key} label={key} value={attributes[key] || ""} onChange={(value) => setAttributes({ [key]: value })} />
          ))}
          <ToggleControl
            label={__("Show total comment count", TEXT_DOMAIN)}
            checked={attributes.showCommentCount ?? true}
            onChange={(showCommentCount) => setAttributes({ showCommentCount })}
          />
          <ToggleControl
            label={__("Show comment date", TEXT_DOMAIN)}
            checked={attributes.showDate ?? true}
            onChange={(showDate) => setAttributes({ showDate })}
          />
          {attributes.showDate !== false ? (
            <>
              <SelectControl
                label={__("Date style", TEXT_DOMAIN)}
                value={attributes.dateStyle || "medium"}
                options={[
                  { label: __("Full", TEXT_DOMAIN), value: "full" },
                  { label: __("Long", TEXT_DOMAIN), value: "long" },
                  { label: __("Medium", TEXT_DOMAIN), value: "medium" },
                  { label: __("Short", TEXT_DOMAIN), value: "short" },
                ]}
                onChange={(dateStyle) => setAttributes({ dateStyle: dateStyle as DiscussionAttributes["dateStyle"] })}
              />
              <SelectControl
                label={__("Time style", TEXT_DOMAIN)}
                value={attributes.timeStyle || "short"}
                options={[
                  { label: __("None", TEXT_DOMAIN), value: "none" },
                  { label: __("Full", TEXT_DOMAIN), value: "full" },
                  { label: __("Long", TEXT_DOMAIN), value: "long" },
                  { label: __("Medium", TEXT_DOMAIN), value: "medium" },
                  { label: __("Short", TEXT_DOMAIN), value: "short" },
                ]}
                onChange={(timeStyle) => setAttributes({ timeStyle: timeStyle as DiscussionAttributes["timeStyle"] })}
              />
            </>
          ) : null}
        </PanelBody>
      </InspectorControls>
      <strong>{attributes.title}</strong>
      <p>{__("Discussion items load from the Flow backend on the published or exported page.", TEXT_DOMAIN)}</p>
    </div>
  );
}
