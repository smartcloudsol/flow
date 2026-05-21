import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import {
  Button,
  RangeControl,
  SelectControl,
  TextControl,
  ToggleControl,
} from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { parseOptions } from "./field-utils";
import type { ConditionalRuleOptionSource, OptionsSource } from "./types";

type KeyValueRow = {
  key: string;
  value: string;
};

function parseKeyValueRows(raw: string | undefined): KeyValueRow[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    return Object.entries(parsed).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
    }));
  } catch {
    return [];
  }
}

function stringifyKeyValueRows(rows: KeyValueRow[]): string {
  return JSON.stringify(
    rows.reduce<Record<string, string>>((acc, row) => {
      if (!row.key.trim()) {
        return acc;
      }

      acc[row.key.trim()] = row.value;
      return acc;
    }, {}),
    null,
    2,
  );
}

function KeyValueListEditor({
  label,
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const [rows, setRows] = useState<KeyValueRow[]>(() =>
    parseKeyValueRows(value),
  );

  useEffect(() => {
    setRows(parseKeyValueRows(value));
  }, [value]);

  const updateRows = (nextRows: KeyValueRow[]) => {
    setRows(nextRows);
    onChange(stringifyKeyValueRows(nextRows));
  };

  const addRow = () => {
    updateRows([...rows, { key: "", value: "" }]);
  };

  const updateRow = (index: number, patch: Partial<KeyValueRow>) => {
    const nextRows = [...rows];
    nextRows[index] = { ...nextRows[index], ...patch };
    updateRows(nextRows);
  };

  const removeRow = (index: number) => {
    updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{label}</div>
      {rows.map((row, index) => (
        <div
          key={`${label}-${index}`}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <TextControl
              label={__("Key", TEXT_DOMAIN)}
              value={row.key}
              onChange={(nextKey) => updateRow(index, { key: nextKey })}
              placeholder={keyPlaceholder}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextControl
              label={__("Value", TEXT_DOMAIN)}
              value={row.value}
              onChange={(nextValue) => updateRow(index, { value: nextValue })}
              placeholder={valuePlaceholder}
            />
          </div>
          <Button variant="secondary" onClick={() => removeRow(index)}>
            {__("Remove", TEXT_DOMAIN)}
          </Button>
        </div>
      ))}
      <Button variant="secondary" onClick={addRow}>
        {__("Add item", TEXT_DOMAIN)}
      </Button>
    </div>
  );
}

interface Props {
  value: ConditionalRuleOptionSource;
  onChange: (next: ConditionalRuleOptionSource) => void;
  prefix?: string;
}

export function OptionsSourceEditor({ value, onChange, prefix }: Props) {
  const optionsSource = value.optionsSource || "static";
  const options = value.options || parseOptions("");
  const labelPrefix = prefix ? `${prefix} ` : "";

  const update = (patch: Partial<ConditionalRuleOptionSource>) =>
    onChange({ ...value, ...patch });

  const addOption = () => {
    const idx = options.length + 1;
    update({
      options: [...options, { label: `option${idx}`, value: `option${idx}` }],
    });
  };

  const updateOption = (
    index: number,
    part: { label?: string; value?: string },
  ) => {
    const next = [...options];
    next[index] = { ...next[index], ...part };
    update({ options: next });
  };

  const removeOption = (index: number) => {
    update({ options: options.filter((_, i) => i !== index) });
  };

  return (
    <>
      <SelectControl
        label={__(`${labelPrefix}Options Source`, TEXT_DOMAIN)}
        value={optionsSource}
        options={[
          { label: __("Static (Manual)", TEXT_DOMAIN), value: "static" },
          { label: __("API", TEXT_DOMAIN), value: "api" },
          { label: __("Autocomplete", TEXT_DOMAIN), value: "autocomplete" },
        ]}
        onChange={(next) => update({ optionsSource: next as OptionsSource })}
      />

      {(optionsSource === "api" || optionsSource === "autocomplete") && (
        <>
          <TextControl
            label={__(`${labelPrefix}API Endpoint`, TEXT_DOMAIN)}
            value={value.apiEndpoint || ""}
            onChange={(apiEndpoint) => update({ apiEndpoint })}
            placeholder="https://example.com/api/options"
          />
          <SelectControl
            label={__(`${labelPrefix}HTTP Method`, TEXT_DOMAIN)}
            value={value.apiMethod || "GET"}
            options={[
              { label: "GET", value: "GET" },
              { label: "POST", value: "POST" },
            ]}
            onChange={(apiMethod) =>
              update({ apiMethod: apiMethod as "GET" | "POST" })
            }
          />
          <KeyValueListEditor
            label={__(`${labelPrefix}Headers`, TEXT_DOMAIN)}
            value={value.apiHeaders}
            onChange={(apiHeaders) => update({ apiHeaders })}
            keyPlaceholder="X-API-Key"
            valuePlaceholder="your-key"
          />
          <KeyValueListEditor
            label={__(`${labelPrefix}Parameters`, TEXT_DOMAIN)}
            value={value.apiParams}
            onChange={(apiParams) => update({ apiParams })}
            keyPlaceholder="category"
            valuePlaceholder="countries"
          />
          <TextControl
            label={__(`${labelPrefix}Response Path`, TEXT_DOMAIN)}
            value={value.apiResponsePath || ""}
            onChange={(apiResponsePath) => update({ apiResponsePath })}
            placeholder="data.options"
          />
          <TextControl
            label={__(`${labelPrefix}Label Path`, TEXT_DOMAIN)}
            value={value.apiLabelPath || ""}
            onChange={(apiLabelPath) => update({ apiLabelPath })}
            placeholder="description"
            help={__(
              "Path inside each result item for the displayed label, e.g. response[].description or description.",
              TEXT_DOMAIN,
            )}
          />
          <TextControl
            label={__(`${labelPrefix}Value Path`, TEXT_DOMAIN)}
            value={value.apiValuePath || ""}
            onChange={(apiValuePath) => update({ apiValuePath })}
            placeholder="id"
            help={__(
              "Path inside each result item for the stored value, e.g. response[].id or id.",
              TEXT_DOMAIN,
            )}
          />
          <ToggleControl
            label={__(`${labelPrefix}Cache Enabled`, TEXT_DOMAIN)}
            checked={Boolean(value.cacheEnabled)}
            onChange={(cacheEnabled) => update({ cacheEnabled })}
          />
          {value.cacheEnabled && (
            <RangeControl
              label={__(`${labelPrefix}Cache TTL (seconds)`, TEXT_DOMAIN)}
              value={value.cacheTTL || 300}
              onChange={(cacheTTL) =>
                update({ cacheTTL: Number(cacheTTL) || 300 })
              }
              min={10}
              max={3600}
            />
          )}
        </>
      )}

      {optionsSource === "autocomplete" && (
        <>
          <TextControl
            label={__(`${labelPrefix}Search Parameter Name`, TEXT_DOMAIN)}
            value={value.searchParam || "q"}
            onChange={(searchParam) => update({ searchParam })}
          />
          <RangeControl
            label={__(`${labelPrefix}Minimum Characters`, TEXT_DOMAIN)}
            value={value.autocompleteMinChars || 2}
            onChange={(autocompleteMinChars) =>
              update({
                autocompleteMinChars: Number(autocompleteMinChars) || 2,
              })
            }
            min={1}
            max={10}
          />
          <RangeControl
            label={__(`${labelPrefix}Debounce (ms)`, TEXT_DOMAIN)}
            value={value.autocompleteDebounce || 300}
            onChange={(autocompleteDebounce) =>
              update({
                autocompleteDebounce: Number(autocompleteDebounce) || 300,
              })
            }
            min={100}
            max={2000}
            step={100}
          />
        </>
      )}

      {optionsSource === "static" && (
        <div style={{ marginTop: 12 }}>
          {options.map((option, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <TextControl
                  label={__("Label", TEXT_DOMAIN)}
                  value={option.label}
                  onChange={(label) => updateOption(index, { label })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextControl
                  label={__("Value", TEXT_DOMAIN)}
                  value={option.value}
                  onChange={(value) => updateOption(index, { value })}
                />
              </div>
              <Button variant="secondary" onClick={() => removeOption(index)}>
                {__("Remove", TEXT_DOMAIN)}
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={addOption}>
            {__("Add Option", TEXT_DOMAIN)}
          </Button>
        </div>
      )}
    </>
  );
}
