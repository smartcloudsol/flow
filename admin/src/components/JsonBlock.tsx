import { Code, ScrollArea } from "@mantine/core";

export function JsonBlock({
  value,
  compact = false,
}: {
  value: unknown;
  compact?: boolean;
}) {
  return (
    <ScrollArea.Autosize mah={compact ? 180 : 320}>
      <Code block>{JSON.stringify(value, null, compact ? 0 : 2)}</Code>
    </ScrollArea.Autosize>
  );
}
