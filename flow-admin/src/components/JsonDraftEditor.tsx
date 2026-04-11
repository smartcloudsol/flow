import { Stack, Text } from "@mantine/core";
import MonacoEditor from "./MonacoEditor";
import { t } from "../operations/i18n";

export interface JsonDraftEditorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string | undefined) => void;
  height?: string | number;
  minHeight?: string | number;
  warnings?: Array<string | null | undefined>;
}

export default function JsonDraftEditor({
  label,
  description,
  value,
  onChange,
  height = 220,
  minHeight = 180,
  warnings = [],
}: JsonDraftEditorProps) {
  const visibleWarnings = warnings.filter((warning): warning is string =>
    Boolean(warning),
  );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t(label)}
      </Text>
      {description ? (
        <Text size="xs" c="dimmed">
          {t(description)}
        </Text>
      ) : null}
      <MonacoEditor
        language="json"
        height={height}
        minHeight={minHeight}
        value={value}
        onChange={onChange}
      />
      {visibleWarnings.map((warning) => (
        <Text key={warning} size="xs" c="orange">
          {t(warning)}
        </Text>
      ))}
    </Stack>
  );
}
