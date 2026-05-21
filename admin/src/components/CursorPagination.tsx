import { Badge, Button, Group } from "@mantine/core";
import { t } from "../operations/i18n";

interface CursorPaginationControlsProps {
  loadedCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isLoading?: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function CursorPaginationControls({
  loadedCount,
  hasPreviousPage,
  hasNextPage,
  isLoading = false,
  onPreviousPage,
  onNextPage,
}: CursorPaginationControlsProps) {
  return (
    <Group justify="space-between">
      <Badge variant="light">
        {loadedCount} {t("loaded")}
      </Badge>
      <Group gap="xs">
        <Button
          size="xs"
          variant="default"
          disabled={!hasPreviousPage || isLoading}
          onClick={onPreviousPage}
        >
          {t("Previous")}
        </Button>
        <Button
          size="xs"
          variant="light"
          disabled={!hasNextPage || isLoading}
          onClick={onNextPage}
        >
          {t("Next")}
        </Button>
      </Group>
    </Group>
  );
}
