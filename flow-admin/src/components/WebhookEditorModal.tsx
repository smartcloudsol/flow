import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Card,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, WebhookEndpoint } from "../api/types";
import { t } from "../operations/i18n";
import HeadersBuilder from "./HeadersBuilder";
import { JsonBlock } from "./JsonBlock";
import { useOperationsComboboxProps } from "./OperationsPortalContext";

function emptyWebhook(boot: BootConfig): WebhookEndpoint {
  return {
    webhookKey: "",
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    url: "",
    provider: "generic",
    name: "",
    description: "",
    enabled: true,
    method: "POST",
    signingMode: "none",
    headers: {},
  };
}

interface WebhookEditorModalProps {
  opened: boolean;
  onClose: () => void;
  client: FlowBackendClient;
  boot: BootConfig;
  initialWebhook?: WebhookEndpoint | null;
  mode?: "draft" | "existing";
  zIndex?: number;
  onSaved?: (saved: WebhookEndpoint, isNew: boolean) => void;
}

interface WebhookEditorContentProps {
  client: FlowBackendClient;
  boot: BootConfig;
  initialWebhook?: WebhookEndpoint | null;
  isNew: boolean;
  onClose: () => void;
  onSaved?: (saved: WebhookEndpoint, isNew: boolean) => void;
  comboboxProps: ReturnType<typeof useOperationsComboboxProps>;
}

function WebhookEditorContent({
  client,
  boot,
  initialWebhook,
  isNew,
  onClose,
  onSaved,
  comboboxProps,
}: WebhookEditorContentProps) {
  const queryClient = useQueryClient();
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint>(
    () => initialWebhook ?? emptyWebhook(boot),
  );

  const saveWebhookMutation = useMutation({
    mutationFn: (webhook: WebhookEndpoint) =>
      isNew
        ? client.createWebhookEndpoint(webhook)
        : client.updateWebhookEndpoint(webhook.webhookKey, webhook),
    onSuccess: (saved) => {
      notifications.show({
        message: t("Webhook saved"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onSaved?.(saved, isNew);
      onClose();
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) =>
      notifications.show({ message: error.message, color: "red" }),
  });

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <TextInput
          label={t("Webhook name")}
          description={t("A descriptive name for this webhook endpoint")}
          placeholder={t("e.g., CRM Integration")}
          value={editingWebhook.name ?? ""}
          onChange={(e) =>
            setEditingWebhook({
              ...editingWebhook,
              name: e.currentTarget.value,
            })
          }
        />
        <TextInput
          label={t("Webhook key")}
          description={t("Unique identifier (lowercase, hyphens, underscores)")}
          placeholder={t("e.g., crm-integration-webhook")}
          value={editingWebhook.webhookKey}
          disabled={!isNew}
          onChange={(e) =>
            setEditingWebhook({
              ...editingWebhook,
              webhookKey: e.currentTarget.value,
            })
          }
        />
      </SimpleGrid>
      <TextInput
        label={t("Target URL")}
        description={t(
          "The endpoint where webhook events will be sent. Zapier catch hooks belong here.",
        )}
        placeholder={t("https://example.com/api/webhooks")}
        value={editingWebhook.url}
        onChange={(e) =>
          setEditingWebhook({
            ...editingWebhook,
            url: e.currentTarget.value,
          })
        }
      />
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Select
          label={t("Provider")}
          description={t("Choose the webhook provider preset")}
          data={[
            { value: "generic", label: t("Generic Webhook") },
            { value: "zapier", label: t("Zapier") },
          ]}
          value={editingWebhook.provider ?? "generic"}
          onChange={(value) =>
            setEditingWebhook({
              ...editingWebhook,
              provider: value === "zapier" ? "zapier" : "generic",
              method:
                value === "zapier" ? "POST" : editingWebhook.method ?? "POST",
              signingMode:
                value === "zapier"
                  ? "none"
                  : editingWebhook.signingMode ?? "none",
            })
          }
          comboboxProps={comboboxProps}
        />
        <Select
          label={t("HTTP Method")}
          description={t("Request method used by this endpoint")}
          data={[
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
          ]}
          value={editingWebhook.method ?? "POST"}
          onChange={(value) =>
            setEditingWebhook({
              ...editingWebhook,
              method: value === "PUT" ? "PUT" : "POST",
            })
          }
          disabled={editingWebhook.provider === "zapier"}
          comboboxProps={comboboxProps}
        />
        <Select
          label={t("Signing Mode")}
          description={t(
            "Optional request signing for receivers that verify signatures",
          )}
          data={[
            { value: "none", label: t("None") },
            { value: "hmac", label: t("HMAC") },
          ]}
          value={editingWebhook.signingMode ?? "none"}
          onChange={(value) =>
            setEditingWebhook({
              ...editingWebhook,
              signingMode: value === "hmac" ? "hmac" : "none",
            })
          }
          disabled={editingWebhook.provider === "zapier"}
          comboboxProps={comboboxProps}
        />
      </SimpleGrid>
      <Textarea
        label={t("Description")}
        description={t("Optional description of what this webhook is used for")}
        minRows={3}
        styles={{
          input: {
            resize: "vertical",
            overflow: "auto",
            minHeight: "90px",
          },
        }}
        placeholder={t(
          "This webhook sends form submissions to our CRM system...",
        )}
        value={editingWebhook.description ?? ""}
        onChange={(e) =>
          setEditingWebhook({
            ...editingWebhook,
            description: e.currentTarget.value,
          })
        }
      />
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <TextInput
          label={t("Signing Secret Parameter")}
          description={t(
            "SSM parameter name used for HMAC signing, when enabled",
          )}
          placeholder={t("/app/env/webhook/signing-secret")}
          value={editingWebhook.signingSecretParameterName ?? ""}
          onChange={(e) =>
            setEditingWebhook({
              ...editingWebhook,
              signingSecretParameterName: e.currentTarget.value,
            })
          }
          disabled={editingWebhook.signingMode !== "hmac"}
        />
        <Text size="sm" c="dimmed" pt="xl">
          {editingWebhook.provider === "zapier"
            ? t(
                "Zapier endpoints use POST and no request signing. Configure the catch hook URL here, then reference this endpoint from workflows.",
              )
            : t(
                "Generic webhook endpoints can define their URL, method, headers, and optional HMAC signing in one reusable place.",
              )}
        </Text>
      </SimpleGrid>
      <HeadersBuilder
        headers={editingWebhook.headers ?? {}}
        onChange={(headers) =>
          setEditingWebhook({ ...editingWebhook, headers })
        }
      />
      <Switch
        label={t("Enabled")}
        checked={Boolean(editingWebhook.enabled)}
        onChange={(e) =>
          setEditingWebhook({
            ...editingWebhook,
            enabled: e.currentTarget.checked,
          })
        }
      />
      <Group>
        <Button
          onClick={() => {
            void saveWebhookMutation.mutate(editingWebhook);
          }}
          loading={saveWebhookMutation.isPending}
        >
          {t("Save webhook")}
        </Button>
      </Group>
      <Card withBorder>
        <Title order={5}>{t("Current webhook payload")}</Title>
        <JsonBlock value={editingWebhook} />
      </Card>
    </Stack>
  );
}

export default function WebhookEditorModal({
  opened,
  onClose,
  client,
  boot,
  initialWebhook,
  mode = "existing",
  zIndex = 100000,
  onSaved,
}: WebhookEditorModalProps) {
  const comboboxProps = useOperationsComboboxProps(zIndex + 1);
  const isNew = mode === "draft" || !initialWebhook?.webhookKey;
  const editorSessionKey = [
    opened ? "open" : "closed",
    mode,
    initialWebhook?.webhookKey ?? "__new__",
    boot.accountId ?? "",
    boot.siteId ?? "",
  ].join(":");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      zIndex={zIndex}
      title={isNew ? t("New webhook") : t("Edit webhook")}
    >
      <WebhookEditorContent
        key={editorSessionKey}
        client={client}
        boot={boot}
        initialWebhook={initialWebhook}
        isNew={isNew}
        onClose={onClose}
        onSaved={onSaved}
        comboboxProps={comboboxProps}
      />
    </Modal>
  );
}
