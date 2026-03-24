import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Badge, Modal, Stack, TextInput, Button, Group } from "@mantine/core";
import { IconBraces } from "@tabler/icons-react";
import { useState } from "react";

export default function TemplateVariableComponent({
  node,
  updateAttributes,
}: NodeViewProps) {
  const path = node.attrs.path as string;
  const label = node.attrs.label as string | undefined;
  const [editing, setEditing] = useState(false);
  const [editPath, setEditPath] = useState(path);
  const [editLabel, setEditLabel] = useState(label || "");

  const handleSave = () => {
    updateAttributes({ path: editPath, label: editLabel || undefined });
    setEditing(false);
  };

  return (
    <>
      <NodeViewWrapper as="span" style={{ display: "inline-block" }}>
        <Badge
          size="sm"
          variant="light"
          color="blue"
          leftSection={<IconBraces size={12} />}
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => setEditing(true)}
        >
          {label || path}
        </Badge>
      </NodeViewWrapper>

      <Modal
        opened={editing}
        onClose={() => setEditing(false)}
        title="Edit Template Variable"
        size="sm"
        zIndex={100002}
      >
        <Stack>
          <TextInput
            label="Variable Path"
            placeholder="submission.fields.name"
            value={editPath}
            onChange={(e) => setEditPath(e.currentTarget.value)}
          />
          <TextInput
            label="Display Label (optional)"
            placeholder="Name"
            value={editLabel}
            onChange={(e) => setEditLabel(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
