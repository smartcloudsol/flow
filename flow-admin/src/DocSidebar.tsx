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
          "Use the API Settings tab to configure how Flow connects to your backend, and the Submissions/Templates/Workflows tabs to manage your workflow automation.",
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
          "Create and manage email templates for automated responses and workflow notifications. Templates support Handlebars syntax for dynamic content.",
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
          "The subject line of the email. Supports Handlebars variables like {{fullName}} or {{formName}}.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text mt="xs">
        <strong>{__("Example:", TEXT_DOMAIN)}</strong>{" "}
        <Code>{"Thank you {{fullName}} for your submission"}</Code>
      </Text>

      <Title order={3} mt="md" id="template-body-html">
        <span className="highlightable">
          {__("Email Body (HTML)", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "The HTML content of the email. You can use Handlebars variables to insert form field values and other dynamic content.",
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
    </>
  ),

  workflows: (
    <>
      <Title order={2} id="workflows">
        <span className="highlightable">
          {__("Automated Workflows", TEXT_DOMAIN)}
        </span>
      </Title>
      <Text>
        {__(
          "Create automated workflows that are triggered when forms are submitted. Workflows can send emails, make HTTP requests to external APIs, and execute conditional logic.",
          TEXT_DOMAIN,
        )}
      </Text>

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
          "Send HTTP requests to external APIs when the workflow triggers. Useful for integrating with CRM systems, analytics platforms, or custom backends.",
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
          "Specify which events should trigger the webhook. Common events include form submission, validation failure, or workflow completion.",
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
