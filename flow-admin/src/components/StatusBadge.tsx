import { Badge } from "@mantine/core";

const colorMap: Record<string, string> = {
  draft: "yellow",
  submitted: "blue",
  new: "blue",
  seen: "gray",
  "in-progress": "yellow",
  approved: "green",
  completed: "green",
  rejected: "red",
  deleted: "dark",
};

export function StatusBadge({ status }: { status?: string }) {
  return (
    <Badge color={colorMap[status ?? ""] ?? "gray"}>
      {status ?? "unknown"}
    </Badge>
  );
}
