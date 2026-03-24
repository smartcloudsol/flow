import { useCallback, useState } from "react";
import { Alert, Anchor, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { __ } from "@wordpress/i18n";

import { TEXT_DOMAIN } from "@smart-cloud/flow-core";

const LOCAL_STORAGE_KEY = "flow_noregistration_required_dismissed";

function readDismissedState(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export const NoRegistrationRequiredBanner = () => {
  const [visible, setVisible] = useState(() => !readDismissedState());

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <Alert
      color="green"
      title={__("No Registration Required", TEXT_DOMAIN)}
      icon={<IconInfoCircle size={18} />}
      w="100%"
      withCloseButton
      onClose={handleDismiss}
    >
      <Text size="sm" mb="xs">
        <strong>
          {__(
            "You can build and publish simple forms immediately without registration.",
            TEXT_DOMAIN,
          )}
        </strong>{" "}
        {__(
          "Flow's core editor experience works directly inside WordPress.",
          TEXT_DOMAIN,
        )}
      </Text>
      <Text size="sm">
        {__(
          "Connect your site to WPSuite only when you want backend-powered Pro capabilities such as save/resume drafts, submissions, templates, workflows, and webhooks.",
          TEXT_DOMAIN,
        )}{" "}
        <Anchor
          href="https://wpsuite.io/flow/"
          target="_blank"
          rel="noreferrer"
        >
          {__("See the Flow product page", TEXT_DOMAIN)}
        </Anchor>{" "}
        {__("or", TEXT_DOMAIN)}{" "}
        <Anchor
          href="https://wpsuite.io/docs/"
          target="_blank"
          rel="noreferrer"
        >
          {__("browse the documentation", TEXT_DOMAIN)}
        </Anchor>
        .
      </Text>
    </Alert>
  );
};
