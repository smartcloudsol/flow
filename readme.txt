
=== SmartCloud Flow – Block‑based Forms & Workflow Automation ===
Contributors: smartcloud
Tags: forms, workflows, gutenberg, aws, automation
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 1.1.6
License: MIT
License URI: https://mit-license.org/
Text Domain: smartcloud-flow

Design forms in Gutenberg and run durable, event‑driven workflows in your own AWS account. 

== Description ==

**SmartCloud Flow** is a block-based forms and workflow plugin for WordPress.

It combines a modern Gutenberg editor experience with a React/Mantine runtime for forms, a native `<dialog>`-based light-DOM modal block, and an optional AWS backend, so site owners can design forms and supporting UI in WordPress while choosing where submissions should be posted and, in Pro, running submissions, templates, workflows, and integrations in their own AWS account.

Flow is part of the WPSuite family of plugins by Smart Cloud Solutions, Inc.

**Free mode**

Flow does not require a hosted SaaS backend or a WPSuite connection to render forms.
In Free mode, each form can post directly from the browser to a URL you define per form. That endpoint may be:

* your own custom endpoint,
* a WordPress-side endpoint you implement yourself, or
* the Flow backend submission endpoint, if you later deploy it.

**Pro mode**

Pro becomes available after connecting your WordPress site to a WPSuite.io workspace. It is designed to work especially well with the separately deployed **WP Suite Flow Backend** in your own AWS account.

A typical Pro setup is:

* deploy the Flow backend to AWS,
* add the published backend API base URL to **Gatey** as a separate API,
* choose the desired protection mode for that API (`IAM` or `COGNITO`, matching the backend deployment),
* then select that API in **SmartCloud → Flow Settings → API Settings**.

This lets Flow use Gatey-aware authenticated API access, while keeping the backend in your own AWS account.

**Key features**

* **Gutenberg form builder** — Build forms with a dedicated Form block, layout/container blocks, and rich field blocks.
* **Single React runtime per form** — Front-end forms run as one mounted React tree.
* **Light-DOM modal block** — Wrap any Gutenberg content in a native dialog with class and data-attribute triggers, hash opening, default header/body/actions slots, action-role aware buttons, and a stable browser API on `WpSuite.plugins.flow.modals`.
* **Rich display & content blocks** — Use styled content primitives such as blockquotes, marks, badges, code blocks, spoilers, lists, tables, timelines, and overflow lists alongside inputs.
* **API-backed options & request controls** — Load select, radio, checkbox-group, and tags options from API/autocomplete endpoints with configurable methods, headers, parameters, selected-value mapping, and runtime interpolation.
* **Conditional logic & validation** — Show/hide, enable/disable, require/optional, and other rule-based field behavior.
* **Theme overrides & design tokens** — Theme both interactive controls and display/content blocks inside the Shadow DOM with Mantine variables and stable `--flow-*` CSS tokens.
* **Shortcodes & Elementor support** — Reuse forms or content roots via shortcode and Elementor integrations.
* **Flexible submission target model** — Submit directly from the browser to a per-form endpoint URL with configurable HTTP methods, optional request headers, and runtime interpolation.
* **Runtime events & host-page integration** — Listen for submit, draft, wizard, modal, and API-loading error events from outer-page JavaScript.
* **Pro: backend-aware operation** — Connect Flow to the AWS-hosted Flow backend for durable submissions, admin tooling, templates, workflows, and webhook-driven automation.
* **Pro: backend form sync** — Optionally sync Gutenberg-defined forms into canonical backend form definitions stored in AWS.
* **Pro: admin application** — Manage submissions, templates, workflows, and backend/API settings from WordPress admin.
* **Pro: workflow automation** — Event-driven automation for emails, webhooks, status changes, and related operational flows.
* **Pro: security & ownership** — Deploy into your own AWS account and choose auth modes such as `IAM` or `COGNITO`.

You can find continuously expanding documentation at:
https://wpsuite.io/docs/

This plugin is not affiliated with or endorsed by Amazon Web Services or the WordPress Foundation. All trademarks are property of their respective owners.

== Free and Pro Usage Notice ==

Flow works in **Free mode** without registration or subscription.

In Free mode:

* forms are rendered in the browser,
* submissions are posted directly to the endpoint URL configured for the form,
* no WPSuite connection is required.

Flow does **not** inherently store submissions in WordPress. If you want submissions handled inside WordPress, you need to implement and expose your own receiving endpoint there.

**Pro features** are optional and become available after connecting your WordPress site to a WPSuite.io workspace.

The main Pro scenario is to use the separately deployed **WP Suite Flow Backend** in your own AWS account. In that setup:

* you publish the backend API,
* register that API in Gatey,
* choose its protection mode (`IAM` or `COGNITO`),
* and select that API in **SmartCloud → Flow Settings → API Settings**.

This simplifies secure communication between the WordPress-side Flow plugin and the AWS-hosted backend.

== Installation ==

1. Upload the plugin ZIP (or install from the WordPress plugin repository).
2. Activate the plugin through the “Plugins” screen in WordPress.
3. Go to **WP Admin → SmartCloud → Flow Settings**, review the configuration.
4. Build a form in Gutenberg and configure its submission target.
5. Optionally, for Pro:
   * connect the site to a WPSuite workspace,
   * deploy the WP Suite Flow Backend into AWS,
   * add the backend API to Gatey,
   * then select that API in **SmartCloud → Flow Settings → API Settings**.

== Machine-readable resources ==

* Plugin manifest: https://wpsuite.io/.well-known/flow-plugin.json
* OpenAPI spec (backend): https://wpsuite.io/.well-known/flow-openapi.yaml

== Frequently Asked Questions ==

= Does Flow work without an AWS backend? =
Yes. Flow can render forms and submit them directly from the browser to any endpoint URL you configure for the form.

= Does Flow store submissions in WordPress? =
Not by default. Flow posts to the configured endpoint. If you want WordPress to receive and store submissions, you need to implement a receiving endpoint on the WordPress side yourself.

= Does Flow send my data to third parties? =
Only when your configured submission target or protection settings require it. For example, if you enable reCAPTCHA or post to an external backend endpoint, the browser will make external network calls. See **External Services** below.

= What is the easiest Pro setup? =
Deploy the WP Suite Flow Backend into your own AWS account, register its API base URL in Gatey as a separate API, configure the matching protection mode (`IAM` or `COGNITO`), and then select that API in **SmartCloud → Flow Settings → API Settings**.

= What happens if I disable the backend? =
Forms can still work as long as they submit to another valid configured endpoint. Backend-dependent features such as submissions management, templates, workflows, and related admin tooling will no longer be available through that backend connection.

= Will it work with static exports? =
Yes. Flow runs in the browser and can submit directly to the configured endpoint, so WordPress/PHP does not need to proxy the request.

= Does this work outside Gutenberg? =
Yes. Use the `[smartcloud-flow-form]` or `[smartcloud-flow-content-root]` shortcode, or the Elementor Flow Form / Flow Content Root widgets. Developers can also integrate the JavaScript APIs directly.

= Can Flow load field options from my API? =
Yes. Select, radio, checkbox-group, and tags fields can fetch options from API or autocomplete endpoints. You can configure request methods, headers, parameters, response mapping, selected-value mapping, and runtime interpolation tokens.

= Can host-page JavaScript react to Flow runtime errors? =
Yes. Flow emits browser events such as `smartcloud-flow:submit-success`, `smartcloud-flow:error`, `smartcloud-flow:options-request-error`, and modal lifecycle events so host pages can show custom UI, analytics, or recovery flows.

= Can I reuse a Flow Content Root outside Gutenberg? =
Yes. Use `[smartcloud-flow-content-root id="123"]` with a reusable block / pattern that contains a Flow Content Root block.

= Can Flow open Gutenberg content in a modal? =
Yes. Flow includes a dedicated Modal top-level block that renders in the light DOM with the native `<dialog>` element. You can open it from class-based triggers, `data-wps-flow-*` attributes, URL hashes, or the browser API on `WpSuite.plugins.flow.modals`. The editor can seed header, body, and actions sections, and action buttons inside the modal actions area can be assigned primary, secondary, or dismiss behavior from the core/button toolbar.

== Screenshots ==

1. Form builder in Gutenberg (container and field blocks)
2. Front-end form rendered with Mantine styling
3. Conditional logic editor for a field
4. Flow Settings → API Settings
5. Pro: Email templates editor with preview
6. Pro: Workflow builder (trigger, steps, webhook)
7. Elementor Flow widget with preview

== External Services ==

This plugin may integrate with the following external services, depending on configuration:

1. **Google reCAPTCHA v3 (optional)**
   - **What it is & what it’s used for:** Client-side bot detection. If enabled, Flow can request reCAPTCHA tokens in the browser to protect submissions.
   - **What data is sent & when:** The browser may contact Google to retrieve a token. That token may then be included in submission requests.
   - **How to configure:** Enter your reCAPTCHA site key/secret in the relevant Flow or shared WP Suite settings.
   - **Links:**
     - About reCAPTCHA: https://www.google.com/recaptcha/about/
     - Google Terms: https://policies.google.com/terms
     - Google Privacy: https://policies.google.com/privacy

2. **Customer-configured submission endpoint / Flow backend endpoint**
   - **What it is & what it’s used for:** The endpoint URL configured for a form submission. In Free mode this may be any URL you control. In Pro, it is commonly the AWS-hosted Flow backend.
   - **What data is sent & when:** Form field values and, depending on your implementation, related submission metadata. For Pro backend flows, uploaded file references, template variables, and workflow/event metadata may also be sent.
   - **Where it goes:** Requests are sent directly from the browser to the configured endpoint URL, either through direct fetch calls or, in Pro, through a Gatey-integrated authenticated API flow.
   - **How it’s called:** Standard HTTPS requests. Authentication depends on your configuration and may be none, IAM, or Cognito-based.

3. **WPSuite platform connection (optional; workspace linking and shared features)**
   - **When it applies:** When you connect the site to a WPSuite.io workspace to enable Pro features and shared admin capabilities.
   - **What it’s used for:** Workspace linking, shared admin capabilities, license/subscription handling, and related WP Suite platform features.
   - **What data may be sent:** Minimal site/workspace identifiers and authentication/session data required for linking and management.
   - **Where it goes:** Secure HTTPS requests to WPSuite.io services such as `wpsuite.io` and `api.wpsuite.io`.
   - **Links:**
     - WPSuite.io Privacy Policy: https://wpsuite.io/privacy-policy
     - WPSuite.io Terms of Use: https://wpsuite.io/terms-of-use

4. **Amazon Cognito (optional; authentication for protected APIs)**
   - **When it applies:** When your Flow backend API or related WP Suite services are protected with Cognito and the site uses Cognito-based authentication.
   - **What it’s used for:** User authentication and token-based authorization for protected API calls.
   - **Links:**
     - AWS Service Terms: https://aws.amazon.com/service-terms/
     - AWS Privacy: https://aws.amazon.com/privacy/

5. **Stripe (optional; subscription/purchase flow)**
   - **When it applies:** Only when the user opens the optional WPSuite subscription / purchase flow in the shared admin component.
   - **What it’s used for:** Displaying hosted pricing/subscription UI for optional paid features.
   - **What data may be sent:** Browser/session data required by Stripe to render the hosted purchase UI and process the purchase flow.
   - **Links:**
     - Terms: https://stripe.com/legal/consumer
     - Privacy: https://stripe.com/privacy

== Trademark Notice ==

Amazon Web Services, AWS, Amazon EventBridge, Amazon DynamoDB, Amazon SES, and Amazon Cognito are trademarks of Amazon.com, Inc. or its affiliates.
Google reCAPTCHA is a trademark of Google LLC.
WordPress is a trademark of the WordPress Foundation.

SmartCloud Flow is an independent project and is **not affiliated with, sponsored by, or endorsed by** Amazon Web Services, Google, or the WordPress Foundation.

== Source & Build ==

**Public (free) source code:**
All code that ships in the public (free) version of Flow is available here: https://github.com/smartcloudsol/flow

**Build & distribution:**
Flow is shipped to WordPress.org as a pre-built distribution. Build steps and developer notes are maintained in the GitHub repository documentation.

**Shared WPSuite components:**
Some admin UI modules may originate from shared WP Suite components to support workspace linking, license validation, and subscription management across WP Suite plugins.

**Pro-only features (source availability):**
Flow Pro includes additional functionality such as backend-powered submissions management, templates, workflows, and webhook dispatching. The code that enables these paid features is distributed to Pro users but is not published in the public repository.

== Changelog ==

= 1.1.6 =
* Fix: Modal triggers now detect class-based hooks on Gutenberg button wrapper elements more reliably.
* Fix: Modal dismiss and default actions now run more consistently for overlay clicks, Escape, close buttons, and other close paths.
* Fix: Modal sizing and scroll behavior are more stable for full-height dialogs, sticky header/actions slots, background scroll locking, and slot wrappers converted between Group/Stack layouts.
* Fix: The modal editor now seeds safer default header/body/actions sections and adds toolbar actions to insert or replace those sections.
* UX: Modal action behavior is now edited on the selected core/button toolbar, with clearer current-state feedback for primary, secondary, and dismiss roles.

= 1.1.5 =
* Feature: Added the new light-DOM Modal top-level block with native `<dialog>` runtime, class/data/hash triggers, and browser helpers on `WpSuite.plugins.flow.modals`.
* Fix: Custom submit endpoints now support configurable `GET`/`POST`/`PUT`/`PATCH` methods, optional browser-side request headers, and runtime interpolation for endpoint paths and header values.
* Fix: API/autocomplete-backed select, radio, checkbox-group, and tags fields now interpolate endpoint URLs, headers, and parameters from runtime values and avoid repeated option-endpoint refetch loops.
* Fix: Flow now emits `smartcloud-flow:options-request-error` for API-backed option failures, and field-level errors show a user-facing message instead of raw JSON responses.
* Fix: Multi-select option UIs now support clear-all behavior for API-backed checkbox groups, improve checkbox pointer affordance, and stop hidden-field wrappers from affecting runtime layout gaps.
* Fix: Added legacy Gutenberg save deprecations for older serialized Flow block payloads so previously saved blocks no longer require recovery after serializer changes.
* Docs: Expanded plugin, shortcode, JavaScript API, and knowledge-base documentation for the modal runtime, custom endpoint request settings, interpolation, and runtime error handling.

= 1.1.4 =
* Fix: Flow Patterns now includes reusable blocks that contain either a Flow Form or a Flow Content Root block.
* Fix: The shortcode column now shows the matching copy-ready shortcode for each Flow pattern, including content-root entries.
* Docs: Expanded the readme shortcode guidance to cover Flow Content Root reuse outside Gutenberg.

= 1.1.3 =
* Fix: JavaScript-set field defaults are now scoped by `formId`, so prefilled values no longer bleed across multiple forms on the same page.
* Fix: Flow now publishes browser helper methods on `WpSuite.plugins.flow` for setting, clearing, and reading per-form field defaults.
* Maintenance: Updated the Flow JavaScript API and field-default documentation for the new form-scoped default-value model.

= 1.1.2 =
* Fix: Admin-side form sync now resolves the correct source entity in WordPress 7.0 Site Editor, including template and template-part contexts.
* Fix: Validation now uses the current field values on submit, including minimal or unlabeled text/email fields.
* Fix: Custom submit endpoints now handle absolute URLs correctly and support runtime interpolation tokens from WordPress, location, query string and host-page globals.
* Fix: Flow design token selectors now align with the emitted runtime class names, so theme overrides apply more reliably to submit buttons and field controls.

= 1.1.1 =
* Fix: Backend form sync now resolves the correct numeric source ID in WordPress 7.0 Site Editor and template part contexts.
* Fix: Sync metadata requests now guard against invalid source IDs and use the current editor entity metadata more reliably.
* Fix: Flow design token selectors now align with the runtime class names, so theme overrides apply more reliably to action buttons and field controls.

= 1.1.0 =
* Maintenance: Updated the admin UI dependency stack, including the shared UI React packages used by WPSuite admin screens.
* Maintenance: Updated shared Gatey Core and WPSuite Core dependencies used by Flow integrations.
* Compatibility: Updated the "Tested up to" value for WordPress 7.0.
* Internal cleanup: Refreshed related frontend and shared runtime dependencies for better alignment across WPSuite plugins.

= 1.0.1 =
* Fix: The optional "Powered by" attribution now renders correctly below the Flow content root / form when `enablePoweredBy` is enabled in the admin settings.

= 1.0.0 =
* Initial release.
* Gutenberg form builder with React/Mantine runtime.
* Conditional logic, shortcode support, and Elementor integration.
* Flexible per-form submission target model.
* Optional Pro integration with the WP Suite Flow Backend and Gatey-aware authenticated API access.

== Upgrade Notice ==

= 1.1.6 =
Recommended update if you use Flow modals; this release improves Gutenberg button triggers, dismiss/default action handling, full-height layout stability, background scroll locking, and the modal editor toolbar for header, body, and actions sections.

= 1.1.5 =
Recommended update if you use modal presentations, custom submit or API-backed option endpoints, or older saved Flow blocks; this release adds the modal block/runtime, expands endpoint interpolation and request options, improves API error handling, and restores Gutenberg compatibility for legacy serialized content.

= 1.1.4 =
Recommended update if you reuse Flow patterns outside Gutenberg; this release adds content-root patterns to the admin list and exposes the matching copy-ready shortcode targets.

= 1.1.3 =
Recommended update if you prefill Flow forms from JavaScript or render multiple forms on the same page; this release adds form-scoped default-value helpers and applies store defaults by `formId`.

= 1.1.2 =
Recommended update if you use Flow in the WordPress 7.0 Site Editor, rely on custom submit endpoints, or use theme overrides; this release fixes admin form sync, submit validation, endpoint handling and design token parity.

= 1.1.1 =
Fixes backend form sync for WordPress 7.0 Site Editor and template part editing, and improves Flow design token overrides so runtime control styling applies more reliably.

= 1.1.0 =
Recommended update. Refreshes Flow’s shared admin UI and WPSuite runtime dependencies, and marks compatibility with WordPress 7.0. No configuration changes are required.

= 1.0.1 =
Fixes the optional "Powered by" attribution so it appears below rendered Flow content/forms when enabled.

= 1.0.0 =
Initial release.
