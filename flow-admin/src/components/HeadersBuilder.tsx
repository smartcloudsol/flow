import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { t } from "../operations/i18n";

export interface HeaderEntry {
  key: string;
  value: string;
}

export interface HeadersBuilderProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

export default function HeadersBuilder({
  headers,
  onChange,
}: HeadersBuilderProps) {
  const headerEntries: HeaderEntry[] = Object.entries(headers).map(
    ([key, value]) => ({ key, value }),
  );

  const addHeader = () => {
    onChange({ ...headers, "": "" });
  };

  const updateHeader = (oldKey: string, newKey: string, newValue: string) => {
    const newHeaders = { ...headers };
    if (oldKey !== newKey) {
      delete newHeaders[oldKey];
    }
    newHeaders[newKey] = newValue;
    onChange(newHeaders);
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    onChange(newHeaders);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {t("Headers")}
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addHeader}
        >
          {t("Add Header")}
        </Button>
      </Group>

      {headerEntries.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("No headers configured")}
        </Text>
      ) : (
        <Stack gap="sm">
          {headerEntries.map((entry, index) => (
            <Card key={index} withBorder p="sm">
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  placeholder={t("Header name")}
                  value={entry.key}
                  onChange={(e) =>
                    updateHeader(entry.key, e.currentTarget.value, entry.value)
                  }
                  style={{ flex: 1 }}
                />
                <TextInput
                  placeholder={t("Header value")}
                  value={entry.value}
                  onChange={(e) =>
                    updateHeader(entry.key, entry.key, e.currentTarget.value)
                  }
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeHeader(entry.key)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
