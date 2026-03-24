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

export interface EventsBuilderProps {
  events: string[];
  onChange: (events: string[]) => void;
}

export default function EventsBuilder({
  events,
  onChange,
}: EventsBuilderProps) {
  const addEvent = () => {
    onChange([...events, ""]);
  };

  const updateEvent = (index: number, value: string) => {
    const newEvents = [...events];
    newEvents[index] = value;
    onChange(newEvents);
  };

  const removeEvent = (index: number) => {
    onChange(events.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          Events
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addEvent}
        >
          Add Event
        </Button>
      </Group>

      {events.length === 0 ? (
        <Text size="sm" c="dimmed">
          No events configured
        </Text>
      ) : (
        <Stack gap="sm">
          {events.map((event, index) => (
            <Card key={index} withBorder p="sm">
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  placeholder="e.g., submission.created"
                  value={event}
                  onChange={(e) => updateEvent(index, e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeEvent(index)}
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
