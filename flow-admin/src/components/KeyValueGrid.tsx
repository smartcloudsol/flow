import {
  Anchor,
  Button,
  Code,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

interface FieldSchema {
  label?: string;
  [key: string]: unknown;
}

export function KeyValueGrid({
  value,
  maxHeight = 400,
  fieldSchema,
}: {
  value: Record<string, unknown>;
  maxHeight?: number;
  fieldSchema?: Record<string, FieldSchema>;
}) {
  if (!value || Object.keys(value).length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No data
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={maxHeight}>
      <Table>
        <Table.Tbody>
          {Object.entries(value).map(([key, val]) => {
            const label = fieldSchema?.[key]?.label ?? key;
            return (
              <Table.Tr key={key}>
                <Table.Td width="30%" style={{ verticalAlign: "top" }}>
                  <Text fw={600} size="sm">
                    {label}
                  </Text>
                  {fieldSchema?.[key]?.label && (
                    <Text size="xs" c="dimmed">
                      {key}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <ValueDisplay value={val} />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (isFileReference(value)) {
    return <FileReferenceDisplay reference={value} />;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isFileReference)
  ) {
    return (
      <Stack gap="xs">
        {value.map((item, index) => (
          <FileReferenceDisplay
            key={`${item.key || item.fileName || "file"}-${index}`}
            reference={item}
          />
        ))}
      </Stack>
    );
  }

  if (value === null || value === undefined) {
    return <Text c="dimmed">—</Text>;
  }

  if (typeof value === "string" || typeof value === "number") {
    return <Text size="sm">{String(value)}</Text>;
  }

  if (typeof value === "boolean") {
    return <Text size="sm">{value ? "Yes" : "No"}</Text>;
  }

  if (typeof value === "object") {
    const preview = JSON.stringify(value);
    const needsExpansion = preview.length > 100;

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
            <>
              <IconChevronDown size={14} style={{ verticalAlign: "middle" }} />{" "}
              Hide
            </>
          ) : (
            <>
              <IconChevronRight size={14} style={{ verticalAlign: "middle" }} />{" "}
              Show details
            </>
          )}
        </Text>
        {expanded ? (
          <ScrollArea.Autosize mah={200}>
            <Code block>{JSON.stringify(value, null, 2)}</Code>
          </ScrollArea.Autosize>
        ) : null}
      </Stack>
    );
  }

  return <Text size="sm">{String(value)}</Text>;
}

interface FileReferenceValue {
  bucket?: string;
  key?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  downloadUrl?: string;
}

function isFileReference(value: unknown): value is FileReferenceValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as FileReferenceValue).bucket === "string" &&
      typeof (value as FileReferenceValue).key === "string",
  );
}

function formatBytes(bytes?: number): string | undefined {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileReferenceDisplay({
  reference,
}: {
  reference: FileReferenceValue;
}) {
  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        {reference.fileName || reference.key || "file"}
      </Text>
      <Group gap="xs">
        {formatBytes(reference.size) ? (
          <Text size="xs" c="dimmed">
            {formatBytes(reference.size)}
          </Text>
        ) : null}
        {reference.contentType ? (
          <Text size="xs" c="dimmed">
            {reference.contentType}
          </Text>
        ) : null}
        {reference.downloadUrl ? (
          <Group gap={6}>
            <Button
              component="a"
              href={reference.downloadUrl}
              target="_blank"
              rel="noreferrer"
              download={reference.fileName || true}
              variant="light"
              size="compact-xs"
            >
              Download
            </Button>
            <Anchor
              href={reference.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </Anchor>
          </Group>
        ) : null}
      </Group>
      <Text size="xs" c="dimmed">
        {reference.bucket}/{reference.key}
      </Text>
    </Stack>
  );
}
