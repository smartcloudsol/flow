export const TEXT_DOMAIN = "smartcloud-forms";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./runtime/components/FlowDesignTokens.css";

import { __ } from "@wordpress/i18n";

export const DIRECTION_OPTIONS = [
  {
    label: __("Auto (by language)", TEXT_DOMAIN),
    value: "auto",
  },
  { label: __("Left to Right", TEXT_DOMAIN), value: "ltr" },
  { label: __("Right to Left", TEXT_DOMAIN), value: "rtl" },
];
