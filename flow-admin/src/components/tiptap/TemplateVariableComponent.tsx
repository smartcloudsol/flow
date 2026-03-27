import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Badge, Button, Group, Popover, Stack, TextInput } from "@mantine/core";
import { IconBraces } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { t } from "../../operations/i18n";

export const TEMPLATE_VARIABLE_POPOVER_EVENT =
  "smartcloud-flow:template-variable-popover";

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

  const openEditor = () => {
    setEditPath(path);
    setEditLabel(label || "");
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
  };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(TEMPLATE_VARIABLE_POPOVER_EVENT, {
        detail: { open: editing },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(TEMPLATE_VARIABLE_POPOVER_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [editing]);

  return (
    <Popover
      opened={editing}
      onChange={setEditing}
      width={340}
      position="bottom-start"
      shadow="md"
      withinPortal={false}
      zIndex={100002}
    >
      <Popover.Target>
        <NodeViewWrapper
          as="span"
          contentEditable={false}
          style={{ display: "inline", whiteSpace: "normal" }}
        >
          <Badge
            component="span"
            size="sm"
            variant="light"
            color="blue"
            leftSection={<IconBraces size={12} />}
            style={{
              cursor: "pointer",
              userSelect: "none",
              verticalAlign: "baseline",
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={openEditor}
          >
            {label || path}
          </Badge>
        </NodeViewWrapper>
      </Popover.Target>

      <Popover.Dropdown
        contentEditable={false}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <Stack
          gap="sm"
          onKeyDownCapture={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeEditor();
            }
          }}
        >
          <TextInput
            label={t("Variable Path")}
            placeholder={t("submission.fields.name")}
            value={editPath}
            onChange={(e) => setEditPath(e.currentTarget.value)}
          />
          <TextInput
            label={t("Display Label (optional)")}
            placeholder={t("Name")}
            value={editLabel}
            onChange={(e) => setEditLabel(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={closeEditor}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSave}>{t("Save")}</Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
