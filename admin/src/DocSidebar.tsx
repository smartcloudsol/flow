import { Code, Drawer, List, Stack, Text, Title } from "@mantine/core";
import { useEffect, useRef } from "react";
import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import classes from "./main.module.css";

const pages = {
  general: (
    <>
      <Title order={2}>
        <span className="highlightable">SmartCloud Flow Settings</span>
      </Title>
      <Text>
        {__(
          "This sidebar explains the options available on the Flow admin screen. Click the info icon next to any field to jump to its description here.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Title order={3} mt="md" id="general-overview">
        <span className="highlightable">{__("Overview", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "SmartCloud Flow provides an AWS-backed forms, workflow, and messaging backend for WordPress.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="sm">
        {__(
          "Form submissions are stored in DynamoDB and can trigger automated workflows, emails, webhooks, and other backend actions.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="sm">
        {__(
          "Templates define the messages, workflows define the automation logic, and submissions track the processing history of each request.",
          TEXT_DOMAIN,
        )}
      </Text>{" "}
      <Text mt="xs">
        {__(
          "Use the API Settings tab to configure how Flow connects to your backend, and the Submissions and Workflows areas to manage your workflow automation. Email templates now live inside the Advanced tab under Workflows.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Title order={3} mt="md" id="forms-backend-sync">
        <span className="highlightable">
          {__("Forms Backend Sync", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "When enabled, Flow forms are automatically synced to your backend when you save posts containing form blocks. This creates a backend form definition that's used for submission handling and workflow triggers.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Disable this if you want to manage forms manually or if you're working in a development environment where backend sync is not needed.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Title order={3} mt="md" id="enable-powered-by">
        <span className="highlightable">
          {__('Hide "Powered by" attribution', TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          'Controls whether Flow shows a small "Powered by SmartCloud Flow" attribution link in places where Flow renders UI (where applicable). You can hide it for a cleaner appearance.',
          TEXT_DOMAIN,
        )}
      </Text>
      <Title order={3} mt="md" id="highlighted-submission-actions">
        <span className="highlightable">
          {__("Highlighted submission actions", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Choose which quick status update buttons appear in the submission details popup. These shortcuts let administrators change the current submission status with a single click.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Available options currently control whether the popup shows the Mark seen, Mark resolved, and Mark completed actions.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Disable any action you do not want operators to use as a quick shortcut. This only affects the highlighted status buttons, not the submission history or other workflow actions.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Title order={3} mt="md" id="enable-debug-logging">
        <span className="highlightable">
          {__("Enable Debug Logging", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "When enabled, Flow writes detailed debug information to WordPress debug logs. This is useful for troubleshooting issues or understanding how Flow processes requests.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Requirements:", TEXT_DOMAIN)}</strong>{" "}
        {__(
          "Debug logging only works when both WP_DEBUG and WP_DEBUG_LOG are set to true in your wp-config.php file.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Logs will appear in wp-content/debug.log. Log entries are prefixed with [Flow] and include the severity level (DEBUG, INFO, WARNING, ERROR).",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs" c="orange">
        <strong>{__("Note:", TEXT_DOMAIN)}</strong>{" "}
        {__(
          "Enable this only when troubleshooting. Debug logging can generate large log files and may impact performance on high-traffic sites.",
          TEXT_DOMAIN,
        )}
      </Text>
    </>
  ),

  "api-settings": (
    <>
      <Title order={2} id="api-settings">
        <span className="highlightable">{__("API Settings", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Configure how Flow reaches its backend for form submissions, email templates, and workflow execution. You can use Gatey/Amplify for authenticated AWS API Gateway requests, or provide a direct base URL for custom endpoints.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="flow-api-backend-transport">
        <span className="highlightable">
          {__("Backend transport", TEXT_DOMAIN)}
        </span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <strong>{__("Gatey / Amplify", TEXT_DOMAIN)}:</strong>{" "}
          {__(
            "uses REST API names from the Amplify configuration exposed by Gatey (read from getAmplifyConfig().API.REST).",
            TEXT_DOMAIN,
          )}
        </List.Item>
        <List.Item>
          <strong>{__("Fetch (base URL)", TEXT_DOMAIN)}:</strong>{" "}
          {__(
            "calls your backend directly using a base URL (useful for custom endpoints or non-Amplify setups).",
            TEXT_DOMAIN,
          )}
        </List.Item>
      </List>

      <Title order={3} mt="md" id="flow-api-backend-api-name">
        <span className="highlightable">
          {__("Backend API name", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__("Shown when using", TEXT_DOMAIN)}{" "}
        <strong>{__("Gatey / Amplify", TEXT_DOMAIN)}</strong>.{" "}
        {__(
          "Select one of the REST API keys found in getAmplifyConfig().API.REST.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="flow-api-backend-base-url">
        <span className="highlightable">
          {__("Backend base URL", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__("Shown when using", TEXT_DOMAIN)}{" "}
        <strong>{__("Fetch (base URL)", TEXT_DOMAIN)}</strong>.{" "}
        {__("Provide the base URL of your backend, e.g.", TEXT_DOMAIN)}{" "}
        <Code>https://xyz.execute-api.eu-central-1.amazonaws.com/prod</Code>.
      </Text>
    </>
  ),

  submissions: (
    <>
      <Title order={2} id="submissions">
        <span className="highlightable">
          {__("Form Submissions", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "View and manage form submissions from your WordPress site. All submissions are stored in AWS DynamoDB and can be queried, filtered, and exported.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="submissions-list">
        <span className="highlightable">
          {__("Submissions List", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "The submissions list displays all form submissions with details like submission date, form name, and field values. You can filter by form, date range, and search within submission data.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="submission-details">
        <span className="highlightable">
          {__("Submission Details", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Click on any submission to view full details including all submitted field values, metadata (IP address, user agent, referrer), and workflow execution history.",
          TEXT_DOMAIN,
        )}
      </Text>
    </>
  ),

  templates: (
    <>
      <Title order={2} id="templates">
        <span className="highlightable">
          {__("Email Templates", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Create and manage reusable email templates for automated responses and workflow notifications. Templates are first-class backend resources and can be referenced directly from workflow email steps and process-map draft steps.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="template-rendering-model">
        <span className="highlightable">
          {__("Rendering model", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "A template stores the message definition separately from workflow logic. This lets you reuse the same message across multiple automations and update content without rewriting every workflow step that sends it.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="template-name">
        <span className="highlightable">
          {__("Template Name", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "A descriptive name for the template. This is shown in the templates list and when selecting templates for auto-replies.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="template-key">
        <span className="highlightable">{__("Template Key", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "A unique identifier for the template. Use lowercase letters, numbers, hyphens, and underscores only. This key is used to reference the template in workflows and form settings.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Example:", TEXT_DOMAIN)}</strong>{" "}
        <Code>welcome-email</Code>, <Code>order-confirmation</Code>
      </Text>

      <Title order={3} mt="md" id="template-subject">
        <span className="highlightable">
          {__("Email Subject", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "The subject line of the email. Supports template variables like {{submission.fields.fullName}} and simple fallbacks like {{submission.fields.fullName | Customer}}.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Example:", TEXT_DOMAIN)}</strong>{" "}
        <Code>
          {
            "Thank you {{submission.fields.fullName | Customer}} for your submission"
          }
        </Code>
      </Text>

      <Title order={3} mt="md" id="template-preview">
        <span className="highlightable">{__("Preview", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Preview support helps you verify the rendered subject and body before attaching the template to a live workflow. This is especially useful when the output depends on submission fields or nested payload values.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="template-body-html">
        <span className="highlightable">
          {__("Email Body (HTML)", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "The HTML content of the email. You can use template variables and optional fallback text to insert dynamic values.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Available variables:", TEXT_DOMAIN)}</strong>
      </Text>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <Code>{"{{formName}}"}</Code> -{" "}
          {__("The name of the form", TEXT_DOMAIN)}
        </List.Item>
        <List.Item>
          <Code>{"{{submissionId}}"}</Code> -{" "}
          {__("Unique submission ID", TEXT_DOMAIN)}
        </List.Item>
        <List.Item>
          {__(
            "Any form field name (e.g., {{email}}, {{fullName}}, {{message}})",
            TEXT_DOMAIN,
          )}
        </List.Item>
      </List>

      <Title order={3} mt="md" id="template-body-text">
        <span className="highlightable">
          {__("Email Body (Plain Text)", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Optional plain text version of the email. If not provided, a text version will be automatically generated from the HTML body.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Providing both HTML and plain text improves deliverability and gives you tighter control over how the message appears across email clients.",
          TEXT_DOMAIN,
        )}
      </Text>
    </>
  ),

  workflows: (
    <>
      <Title order={2} id="workflows">
        <span className="highlightable">{__("Workflows", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "The Workflows area is now organized around Process Maps as the primary orchestration surface, with an Advanced tab for direct workflow, webhook, and template management. Together they define what events Flow reacts to, what actions it runs, and how separate workflows relate to each other.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-surface-overview">
        <span className="highlightable">
          {__("Screen structure", TEXT_DOMAIN)}
        </span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <strong>{__("Process Maps", TEXT_DOMAIN)}:</strong>{" "}
          {__(
            "the default visual orchestration surface where you connect workflows, draft steps, templates, and webhook endpoints.",
            TEXT_DOMAIN,
          )}
        </List.Item>
        <List.Item>
          <strong>{__("Advanced", TEXT_DOMAIN)}:</strong>{" "}
          {__(
            "the direct CRUD fallback for executable workflows, reusable webhook endpoints, and email templates.",
            TEXT_DOMAIN,
          )}
        </List.Item>
      </List>

      <Title order={3} mt="md" id="workflow-name">
        <span className="highlightable">
          {__("Workflow Name", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "A descriptive name for the workflow. This helps you identify the workflow when managing multiple automations.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-enabled">
        <span className="highlightable">
          {__("Workflow Enabled", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Toggle to enable or disable the workflow. Disabled workflows will not execute even if triggered by form submissions.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-trigger-model">
        <span className="highlightable">
          {__("Trigger model", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Each workflow currently materializes to a single trigger definition. A trigger listens for one event type and can optionally be scoped by conditions or, when assigned from a process map step-trigger connection, by the originating source step as well.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "This allows downstream workflows to react to the exact AI or status step that emitted an event, not just to a global event name like ai.agent.completed.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-conditions">
        <span className="highlightable">{__("Conditions", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Define conditions that must be met for the workflow to execute. You can check form field values, submission metadata, or other criteria.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Example:", TEXT_DOMAIN)}</strong>{" "}
        {__(
          "Only send notification if email contains '@company.com'",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-step-model">
        <span className="highlightable">
          {__("Workflow steps", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Workflow steps run in order after the trigger matches. Depending on configuration, a workflow can send email, call a webhook endpoint, publish a custom event, update submission status, invoke AI-related actions, or wait before continuing.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "In the process-map editor these executable steps can also exist as draft nodes before they are materialized back into the workflow definition during save.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-agent-step">
        <span className="highlightable">
          {__("AI Agent step", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "The AI Agent step publishes an ai.agent.requested event into the backend workflow system. The AI backend then emits ai.agent.completed or ai.agent.failed, and downstream workflows can react to those results.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Use this step when you want classification, routing, structured extraction, or draft generation inside a workflow. Think of it as an AI decision or enrichment step, not as a final delivery action by itself.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-mode">
        <span className="highlightable">{__("Mode", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Mode is the high-level intent passed to the AI backend. Answer is for general responses, Summarize is for condensation, Classify is best for branching decisions, and Extract structured data is best when you need predictable JSON fields.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-internal-routing">
        <span className="highlightable">
          {__("Internal routing", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Internal routing enables Flow's platform-owned routing contract. Use No internal routing for free-form output, Route by category when the AI should choose a stable route like support or sales, Route by outcomes when the AI should return actionable next-step outcomes, and Draft reply only when the goal is a structured reply draft without routing metadata.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-routing-keys">
        <span className="highlightable">
          {__("Route, outcome, and signal keys", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Route Keys define allowed high-level categories such as support or billing. Outcome Types define reusable action families such as invoke_webhook or invoke_workflow. Signal Keys define auxiliary structured metadata such as priority or language.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Use stable generic keys. These values feed process-map branch suggestions and later become runtime trigger conditions for downstream workflows.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-prompting">
        <span className="highlightable">
          {__("Prompting fields", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Prompt Text is the main task instruction and is the most important user-authored field. Platform System Block is automatically injected by Flow and enforces the selected routing preset. Additional System Guidance is your own policy or behavior guidance appended after the platform block.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Best practice is to keep the task itself in Prompt Text and use Additional System Guidance only for tone, constraints, or business policy. Avoid restating the whole routing contract there.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-ai-response-constraint">
        <span className="highlightable">
          {__("Response schema and status", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Response Schema Presets can generate a starting JSON schema for the current mode or routing preset. Response Constraint is the actual runtime JSON schema contract for the AI output. Update Status on Dispatch changes the submission status immediately after the ai.agent.requested event is published, before the final AI result comes back.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "If you want process-map branching from the AI result, prefer a routing preset plus the generated routing schema. If you only need draft generation, use Draft reply only or disable routing entirely.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-email-action">
        <span className="highlightable">{__("Email Action", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Configure email notifications to be sent when the workflow triggers. You can select a template, specify recipients, and customize the sender details.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="workflow-webhook">
        <span className="highlightable">
          {__("Webhook Integration", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Send HTTP requests to external APIs when the workflow triggers. Workflow steps reference reusable webhook endpoints so transport details live in one place and can be reused across multiple automations.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-endpoints">
        <span className="highlightable">
          {__("Webhook endpoints", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Webhook endpoints are managed alongside workflows as standalone admin resources. Define the target URL, provider preset, HTTP method, headers, and optional signing once, then reference that endpoint from workflow or process-map webhook steps.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-url">
        <span className="highlightable">{__("Webhook URL", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "The endpoint URL where the webhook request will be sent. Must be a valid HTTPS URL.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Example:", TEXT_DOMAIN)}</strong>{" "}
        <Code>https://api.example.com/webhooks/form-submission</Code>
      </Text>

      <Title order={3} mt="md" id="webhook-method">
        <span className="highlightable">{__("HTTP Method", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "The HTTP method to use for the webhook request. Most APIs expect POST requests.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-signing">
        <span className="highlightable">
          {__("Webhook signing", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Signing Mode controls whether Flow adds a verification signature to the outgoing webhook request. In HMAC mode, Flow computes an HMAC-SHA256 signature from the final request body and sends it in the X-WP-Suite-Signature header.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Use this when the receiving API verifies request authenticity independently from bearer-token authentication.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-signing-secret-parameter">
        <span className="highlightable">
          {__("Signing secret parameter", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Signing Secret Parameter is the SSM SecureString parameter name that stores the shared HMAC secret for this endpoint. If you leave it empty, Flow can fall back to the stack-level default webhook signing secret when one was configured during deployment.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-authentication">
        <span className="highlightable">
          {__("Webhook authentication", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Authentication controls whether Flow adds an Authorization header before the webhook call. The OAuth 2.0 Client Credentials mode first requests an access token from the configured token endpoint, then calls the target URL with a standard Bearer token.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <Code>Authorization: Bearer &lt;token&gt;</Code>
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-token-endpoint">
        <span className="highlightable">
          {__("OAuth token endpoint", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "This is the HTTPS endpoint where Flow requests the OAuth access token. For Microsoft identity platform v2, this is typically a tenant-specific /oauth2/v2.0/token URL.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-client-id">
        <span className="highlightable">
          {__("OAuth client ID", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Client ID identifies the application at the token endpoint. Flow sends it together with the client secret and grant_type=client_credentials when it requests the access token.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-client-secret-parameter">
        <span className="highlightable">
          {__("OAuth client secret parameter", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "OAuth 2.0 Client Secret Parameter is the SSM SecureString parameter name that contains the confidential client secret. Flow reads the decrypted value at runtime and never stores the secret directly in the webhook endpoint record.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-scope">
        <span className="highlightable">{__("OAuth scope", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Scope is optional and is sent with the token request when the provider expects a scope value. For Dataverse on Azure, this is commonly the environment URL with a /.default suffix.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <Code>https://org.crm4.dynamics.com/.default</Code>
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-audience">
        <span className="highlightable">
          {__("OAuth audience", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Audience is optional and is only needed for identity providers that require an audience parameter during the token request. If your provider does not document it, leave it empty.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-oauth-resource">
        <span className="highlightable">
          {__("OAuth resource", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Resource is optional and mainly exists for legacy Azure AD style token endpoints that still require a resource parameter instead of, or alongside, scope. Use it only when the upstream token endpoint explicitly asks for it.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="webhook-headers">
        <span className="highlightable">
          {__("Request Headers", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Custom HTTP headers to include with the webhook request. Useful for API authentication, content type specification, or custom metadata.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Common headers:", TEXT_DOMAIN)}</strong>
      </Text>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <Code>Authorization: Bearer YOUR_TOKEN</Code>
        </List.Item>
        <List.Item>
          <Code>Content-Type: application/json</Code>
        </List.Item>
        <List.Item>
          <Code>X-Custom-Header: value</Code>
        </List.Item>
      </List>

      <Title order={3} mt="md" id="webhook-events">
        <span className="highlightable">
          {__("Webhook Events", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Webhook calls are typically triggered by workflow steps rather than being subscribed directly to an event list in this screen. The effective path is: event trigger -> workflow match -> workflow step -> webhook endpoint invocation.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="process-maps">
        <span className="highlightable">{__("Process Maps", TEXT_DOMAIN)}</span>
      </Title>
      <Text>
        {__(
          "Process maps provide the main visual orchestration layer above individual workflows. They let you place workflow nodes on a canvas, connect them with event or logical edges, and sketch draft steps directly on the map before those steps are materialized into executable workflow actions.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "Template and webhook draft nodes can either point to existing linked backend entities or stay as unsaved draft references until you explicitly save the template or webhook editor.",
          TEXT_DOMAIN,
        )}
      </Text>

      <Title order={3} mt="md" id="process-map-step-triggers">
        <span className="highlightable">
          {__("Process-map step triggers", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "A step-trigger connection can scope a downstream workflow to the exact source step that emitted an event. On save, Flow projects that visual connection into the target workflow trigger metadata, so runtime dispatch only matches events coming from the linked step.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        {__(
          "At the moment, a workflow still materializes to a single trigger, so conflicting multiple incoming step-trigger sources for the same workflow are intentionally rejected during process-map save.",
          TEXT_DOMAIN,
        )}
      </Text>
    </>
  ),
};

interface DocSidebarProps {
  opened: boolean;
  close: () => void;
  page: keyof typeof pages;
  scrollToId: string;
}

export default function DocSidebar({
  opened,
  close,
  page,
  scrollToId,
}: DocSidebarProps) {
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollHighlightTimeoutRef.current) {
      clearTimeout(scrollHighlightTimeoutRef.current);
      scrollHighlightTimeoutRef.current = null;
    }
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    document
      .querySelectorAll(`.${classes["highlighted-doc-item"]}`)
      .forEach((el) => el.classList.remove(classes["highlighted-doc-item"]));

    if (!opened || !scrollToId) {
      return;
    }

    scrollHighlightTimeoutRef.current = setTimeout(() => {
      const targetElement = document.getElementById(scrollToId);

      if (!targetElement) {
        scrollHighlightTimeoutRef.current = null;
        return;
      }

      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const highlightableEl = targetElement.querySelector(".highlightable");

      if (highlightableEl) {
        highlightableEl.classList.add(classes["highlighted-doc-item"]);

        highlightTimeoutRef.current = setTimeout(() => {
          highlightableEl.classList.remove(classes["highlighted-doc-item"]);
          highlightTimeoutRef.current = null;
        }, 2000);
      }

      scrollHighlightTimeoutRef.current = null;
    }, 0);

    return () => {
      if (scrollHighlightTimeoutRef.current) {
        clearTimeout(scrollHighlightTimeoutRef.current);
        scrollHighlightTimeoutRef.current = null;
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      document
        .querySelectorAll(`.${classes["highlighted-doc-item"]}`)
        .forEach((el) => el.classList.remove(classes["highlighted-doc-item"]));
    };
  }, [opened, scrollToId]);

  return (
    <Drawer
      opened={opened}
      onClose={close}
      title="Flow Documentation"
      position="right"
      size="xl"
      zIndex={999999}
    >
      <Stack gap="md">{pages[page]}</Stack>
    </Drawer>
  );
}
