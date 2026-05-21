import { Badge } from "@mantine/core";
import { t } from "../operations/i18n";

const colorMap: Record<string, string> = {
  draft: "yellow",
  submitted: "blue",
  new: "blue",
  seen: "gray",
  "in-progress": "yellow",
  approved: "green",
  completed: "green",
  rejected: "red",
  resolved: "green",
  deleted: "dark",
};

const labelMap: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  new: "New",
  seen: "Seen",
  "in-progress": "In progress",
  approved: "Approved",
  completed: "Completed",
  rejected: "Rejected",
  resolved: "Resolved",
  deleted: "Deleted",
};

export function StatusBadge({ status }: { status?: string }) {
  return (
    <Badge color={colorMap[status ?? ""] ?? "gray"}>
      {status ? t(labelMap[status] ?? status) : t("Unknown")}
    </Badge>
  );
}
