import { Alert, Text, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { Suspense, type ReactNode } from "react";
import { t } from "./i18n";

interface OperationsSectionProps {
  title: string;
  description: string;
  scrollToId: string;
  showProFeature: boolean;
  infoLabelComponent: (props: {
    text: string;
    scrollToId: string;
  }) => JSX.Element;
  children: ReactNode;
}

export function OperationsSection({
  title,
  description,
  scrollToId,
  showProFeature,
  infoLabelComponent: InfoLabelComponent,
  children,
}: OperationsSectionProps) {
  return (
    <>
      <Title order={2} mb="md">
        <InfoLabelComponent text={t(title)} scrollToId={scrollToId} />
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
