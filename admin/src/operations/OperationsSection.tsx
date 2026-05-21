import { Alert, Text, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { Suspense, type ReactNode } from "react";
import { t } from "./i18n";

interface OperationsSectionProps {
  title: string;
  description: string;
  scrollToId: string;
  showProFeature: boolean;
  InfoLabel: (props: {
    text: string;
    scrollToId: string;
    onOpen: (targetScrollToId: string) => void;
  }) => JSX.Element;
  openInfo: (targetScrollToId: string) => void;
  children: ReactNode;
}

export function OperationsSection({
  title,
  description,
  scrollToId,
  showProFeature,
  InfoLabel,
  openInfo,
  children,
}: OperationsSectionProps) {
  return (
    <>
      <Title order={2} mb="md">
        <InfoLabel text={t(title)} scrollToId={scrollToId} onOpen={openInfo} />
      </Title>

      <Text mb="md">{t(description)}</Text>

      {showProFeature ? (
        <Alert
          variant="light"
          color="yellow"
          title={t("PRO Feature")}
          icon={<IconExclamationCircle />}
          mb="md"
        >
          {t("This feature is available in the PRO version of the plugin.")}
        </Alert>
      ) : null}

      <Suspense fallback={<Text>{t("Loading…")}</Text>}>{children}</Suspense>
    </>
  );
}
