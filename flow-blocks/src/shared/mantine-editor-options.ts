import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "@smart-cloud/flow-core";

export const SIZE_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

export const FLOW_ICON_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: __("Check", TEXT_DOMAIN), value: "check" },
  { label: __("Cross", TEXT_DOMAIN), value: "x" },
  { label: __("Minus", TEXT_DOMAIN), value: "minus" },
  { label: __("Dot", TEXT_DOMAIN), value: "dot" },
  { label: __("Star", TEXT_DOMAIN), value: "star" },
  { label: __("Heart", TEXT_DOMAIN), value: "heart" },
  { label: __("Thumbs up", TEXT_DOMAIN), value: "thumb-up" },
  { label: __("Sun", TEXT_DOMAIN), value: "sun" },
  { label: __("Moon", TEXT_DOMAIN), value: "moon" },
];

export const RATING_SYMBOL_OPTIONS = [
  { label: __("Default", TEXT_DOMAIN), value: "" },
  { label: __("Star", TEXT_DOMAIN), value: "star" },
  { label: __("Heart", TEXT_DOMAIN), value: "heart" },
  { label: __("Check", TEXT_DOMAIN), value: "check" },
  { label: __("Dot", TEXT_DOMAIN), value: "dot" },
];

export const LOADING_POSITION_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

export const RESIZE_OPTIONS = [
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("Vertical", TEXT_DOMAIN), value: "vertical" },
  { label: __("Horizontal", TEXT_DOMAIN), value: "horizontal" },
  { label: __("Both", TEXT_DOMAIN), value: "both" },
];

export const INPUT_MODE_OPTIONS = [
  { label: __("Search", TEXT_DOMAIN), value: "search" },
  { label: __("Text", TEXT_DOMAIN), value: "text" },
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("Telephone", TEXT_DOMAIN), value: "tel" },
  { label: __("URL", TEXT_DOMAIN), value: "url" },
  { label: __("Email", TEXT_DOMAIN), value: "email" },
  { label: __("Numeric", TEXT_DOMAIN), value: "numeric" },
  { label: __("Decimal", TEXT_DOMAIN), value: "decimal" },
];

export const CLAMP_BEHAVIOR_OPTIONS = [
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("On blur", TEXT_DOMAIN), value: "blur" },
  { label: __("Strict", TEXT_DOMAIN), value: "strict" },
];

export const THOUSANDS_GROUP_STYLE_OPTIONS = [
  { label: __("None", TEXT_DOMAIN), value: "none" },
  { label: __("Thousand", TEXT_DOMAIN), value: "thousand" },
  { label: __("Lakh", TEXT_DOMAIN), value: "lakh" },
  { label: __("Wan", TEXT_DOMAIN), value: "wan" },
];

export const LABEL_POSITION_OPTIONS = [
  { label: __("Left", TEXT_DOMAIN), value: "left" },
  { label: __("Right", TEXT_DOMAIN), value: "right" },
];

export const DIVIDER_ORIENTATION_OPTIONS = [
  { label: __("Horizontal", TEXT_DOMAIN), value: "horizontal" },
  { label: __("Vertical", TEXT_DOMAIN), value: "vertical" },
];

export const GROUP_WRAP_OPTIONS = [
  { label: __("Wrap", TEXT_DOMAIN), value: "wrap" },
  { label: __("No wrap", TEXT_DOMAIN), value: "nowrap" },
];

export const GRID_OVERFLOW_OPTIONS = [
  { label: __("Visible", TEXT_DOMAIN), value: "visible" },
  { label: __("Hidden", TEXT_DOMAIN), value: "hidden" },
  { label: __("Auto", TEXT_DOMAIN), value: "auto" },
  { label: __("Scroll", TEXT_DOMAIN), value: "scroll" },
];

export const GRID_JUSTIFY_OPTIONS = [
  { label: __("Stretch", TEXT_DOMAIN), value: "stretch" },
  { label: __("Start", TEXT_DOMAIN), value: "start" },
  { label: __("Center", TEXT_DOMAIN), value: "center" },
  { label: __("End", TEXT_DOMAIN), value: "end" },
  { label: __("Space between", TEXT_DOMAIN), value: "space-between" },
  { label: __("Space around", TEXT_DOMAIN), value: "space-around" },
  { label: __("Space evenly", TEXT_DOMAIN), value: "space-evenly" },
];
