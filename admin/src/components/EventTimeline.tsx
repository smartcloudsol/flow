import { Code, Group, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import type { SubmissionEvent } from "../api/types";
import { t } from "../operations/i18n";

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function EventDetail({ detail }: { detail: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  if (!detail || Object.keys(detail).length === 0) {
    return <Text c="dimmed">—</Text>;
  }

  const preview = JSON.stringify(detail);
  const needsExpansion = preview.length > 50;

  if (!needsExpansion) {
    return <Code>{preview}</Code>;
  }

  return (
    <Stack gap={4}>
      <Text
        size="sm"
        c="blue"
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <Group gap={4}>
            <IconChevronDown size={14} />
            <span>{t("Hide details")}</span>
          </Group>
        ) : (
          <Group gap={4}>
            <IconChevronRight size={14} />
            <span>{t("Show details")}</span>
          </Group>
        )}
      </Text>
      {expanded ? (
        <ScrollArea.Autosize mah={200}>
          <Code block>{JSON.stringify(detail, null, 2)}</Code>
        </ScrollArea.Autosize>
      ) : null}
    </Stack>
  );
}

export function EventTimeline({ events }: { events: SubmissionEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t("No events returned for this submission.")}
      </Text>
    );
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("When")}</Table.Th>
          <Table.Th>{t("Event")}</Table.Th>
          <Table.Th>{t("Actor")}</Table.Th>
          <Table.Th>{t("Detail")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {events.map((item) => (
          <Table.Tr
            key={item.eventId ?? `${item.eventType}-${item.occurredAt}`}
          >
            <Table.Td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
              {formatDateTime(item.occurredAt)}
            </Table.Td>
            <Table.Td style={{ verticalAlign: "top" }}>
              <Text size="sm" fw={500}>
                {item.eventType ?? "—"}
              </Text>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "top" }}>
              {item.actor?.type ? (
                <Stack gap={2}>
                  <Text size="sm">{String(item.actor.type)}</Text>
                  {item.actor.id !== undefined && item.actor.id !== null && (
                    <Text size="xs" c="dimmed\">
                      {String(item.actor.id)}
                    </Text>
                  )}
                </Stack>
              ) : (
                <Text c="dimmed">—</Text>
              )}
            </Table.Td>
            <Table.Td style={{ verticalAlign: "top" }}>
              <EventDetail
                detail={(item.detail ?? {}) as Record<string, unknown>}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
