import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import { Button, ToggleControl } from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

export interface ToggleSettingItem {
  key: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  help: string;
}

export function ToggleSettingsSection({
  items,
  visibleCount = 2,
}: {
  items: ToggleSettingItem[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = items.length > visibleCount;
  const visibleItems =
    shouldCollapse && !expanded ? items.slice(0, visibleCount) : items;

  return (
    <>
      {visibleItems.map((item) => (
        <ToggleControl
          key={item.key}
          label={item.label}
          checked={item.checked}
          onChange={item.onChange}
          help={item.help}
        />
      ))}
      {shouldCollapse ? (
        <Button
          variant="tertiary"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? __("Show less settings", TEXT_DOMAIN)
            : __("Show more settings", TEXT_DOMAIN)}
        </Button>
      ) : null}
    </>
  );
}
