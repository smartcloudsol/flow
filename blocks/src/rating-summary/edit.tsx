import { LANGUAGE_OPTIONS } from "@smart-cloud/flow-core";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  ComboboxControl,
  PanelBody,
  RadioControl,
  SelectControl,
  TextControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { DIRECTION_OPTIONS, TEXT_DOMAIN } from "..";
import type { RatingSummaryAttributes } from "./RatingSummaryShell";

const COPY_FIELDS = [
  ["title", "Title"],
  ["averageRatingLabel", "Average rating label"],
  ["ratingCountLabel", "Rating count (singular)"],
  ["ratingCountPluralLabel", "Rating count (plural)"],
  ["ratingDistributionLabel", "Rating distribution label"],
  ["ratingValueTemplate", "Rating value template"],
  ["loadingMessage", "Loading message"],
  ["errorMessage", "Error message"],
  ["retryLabel", "Retry label"],
  ["emptyMessage", "Empty message"],
  ["ratingUnavailableMessage", "Ratings unavailable message"],
] as const satisfies ReadonlyArray<
  readonly [keyof RatingSummaryAttributes, string]
>;

export default function Edit({
  attributes,
  setAttributes,
}: {
  attributes: RatingSummaryAttributes;
  setAttributes: (attributes: Partial<RatingSummaryAttributes>) => void;
}) {
  const blockProps = useBlockProps({
    className: "smartcloud-flow-rating-summary-editor",
  });

  return (
    <div {...blockProps}>
      <InspectorControls>
        <PanelBody
          title={__("Rating summary settings", TEXT_DOMAIN)}
          initialOpen
        >
          <TextControl
            label={__("Form ID", TEXT_DOMAIN)}
            value={attributes.formId || ""}
            onChange={(formId) => setAttributes({ formId })}
            help={__(
              "Leave empty to use the synchronized or nearest preceding Flow form.",
              TEXT_DOMAIN,
            )}
          />
          <SelectControl
            label={__("Target source", TEXT_DOMAIN)}
            value={attributes.contentTargetSource || "wordpress-context"}
            options={[
              {
                label: __("Current WordPress content", TEXT_DOMAIN),
                value: "wordpress-context",
              },
              {
                label: __("Explicit content reference", TEXT_DOMAIN),
                value: "explicit",
              },
              {
                label: __("Canonical page URL", TEXT_DOMAIN),
                value: "canonical-url",
              },
            ]}
            onChange={(contentTargetSource) =>
              setAttributes({
                contentTargetSource:
                  contentTargetSource as RatingSummaryAttributes["contentTargetSource"],
              })
            }
          />
          {attributes.contentTargetSource === "explicit" ? (
            <>
              <TextControl
                label={__("Target namespace", TEXT_DOMAIN)}
                value={attributes.targetNamespace || ""}
                onChange={(targetNamespace) =>
                  setAttributes({ targetNamespace })
                }
              />
              <TextControl
                label={__("Target type", TEXT_DOMAIN)}
                value={attributes.targetType || ""}
                onChange={(targetType) => setAttributes({ targetType })}
              />
              <TextControl
                label={__("Target ID", TEXT_DOMAIN)}
                value={attributes.targetId || ""}
                onChange={(targetId) => setAttributes({ targetId })}
              />
            </>
          ) : null}
          <TextControl
            label={__("Discussion channel", TEXT_DOMAIN)}
            value={attributes.discussionChannel || ""}
            onChange={(discussionChannel) =>
              setAttributes({ discussionChannel })
            }
            help={__(
              "Use the same channel as the form and discussion that collect these ratings.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__("Show rating distribution", TEXT_DOMAIN)}
            checked={attributes.showDistribution ?? true}
            onChange={(showDistribution) => setAttributes({ showDistribution })}
          />
        </PanelBody>

        <PanelBody title={__("Authored copy", TEXT_DOMAIN)} initialOpen={false}>
          {COPY_FIELDS.map(([key, label]) => (
            <TextControl
              key={key}
              label={__(label, TEXT_DOMAIN)}
              value={String(attributes[key] || "")}
              onChange={(value) => setAttributes({ [key]: value })}
            />
          ))}
        </PanelBody>

        <PanelBody
          title={__("Language and appearance", TEXT_DOMAIN)}
          initialOpen={false}
        >
          <ComboboxControl
            label={__("Language", TEXT_DOMAIN)}
            value={attributes.language || ""}
            options={[
              { value: "", label: __("--- Select ---", TEXT_DOMAIN) },
              ...LANGUAGE_OPTIONS,
            ]}
            onChange={(language) =>
              setAttributes({ language: language || undefined })
            }
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={attributes.direction || "auto"}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => setAttributes({ direction })}
          />
          <RadioControl
            label={__("Color mode", TEXT_DOMAIN)}
            selected={attributes.colorMode || "light"}
            options={[
              { label: __("Light", TEXT_DOMAIN), value: "light" },
              { label: __("Dark", TEXT_DOMAIN), value: "dark" },
              { label: __("Auto", TEXT_DOMAIN), value: "auto" },
            ]}
            onChange={(colorMode) =>
              setAttributes({
                colorMode: colorMode as RatingSummaryAttributes["colorMode"],
              })
            }
          />
          <TextControl
            label={__("Primary color", TEXT_DOMAIN)}
            value={attributes.primaryColor || ""}
            onChange={(primaryColor) => setAttributes({ primaryColor })}
          />
          <TextareaControl
            label={__("Theme CSS overrides", TEXT_DOMAIN)}
            value={attributes.themeOverrides || ""}
            onChange={(themeOverrides) => setAttributes({ themeOverrides })}
          />
        </PanelBody>
      </InspectorControls>

      <strong>{attributes.title || __("Rating summary", TEXT_DOMAIN)}</strong>
      <p>
        {__(
          "Aggregated ratings load from the Flow backend on the published or exported page.",
          TEXT_DOMAIN,
        )}
      </p>
    </div>
  );
}
