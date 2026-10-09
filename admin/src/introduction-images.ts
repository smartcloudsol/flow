import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { __ } from "@wordpress/i18n";
import form from "./assets/onboarding/form-current.png";
import editor from "./assets/onboarding/editor-current.png";

const target = window as Window & {
  smartcloudWpSuiteIllustrations?: Partial<Record<"answers" | "forms-workflows", { src: string; title: string }[]>>;
};
target.smartcloudWpSuiteIllustrations ??= {};
target.smartcloudWpSuiteIllustrations["forms-workflows"] = [
  { src: form, title: __("A visitor form built with Flow blocks", TEXT_DOMAIN) },
  { src: editor, title: __("Configure form fields in the WordPress editor", TEXT_DOMAIN) },
];
window.dispatchEvent(new Event("smartcloud-wpsuite-illustrations-ready"));
