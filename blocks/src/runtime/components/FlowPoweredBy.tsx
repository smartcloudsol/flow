import { Anchor, Text } from "@mantine/core";
import { getFlowPlugin } from "@smart-cloud/flow-core";
import { I18n } from "aws-amplify/utils";

const FLOW_URL = "https://wpsuite.io/flow/";

export function FlowPoweredBy() {
  const flow = getFlowPlugin();
  const shouldShow = Boolean(flow?.settings?.enablePoweredBy);

  if (!shouldShow) {
    return null;
  }

  return (
    <Text component="div" size="xs" c="dimmed" ta="right" fs="italic">
      {I18n.get("Powered by")}{" "}
      <Anchor
        href={FLOW_URL}
        target="_blank"
        rel="noopener noreferrer"
        td="none"
        size="xs"
        fw={400}
        data-flow-powered-by="true"
      >
        {I18n.get("SmartCloud Flow")}
      </Anchor>
    </Text>
  );
}
