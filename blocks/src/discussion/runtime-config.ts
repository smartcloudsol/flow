export function decodeAdjacentFormId(encodedConfig: string): string | undefined {
  try {
    const config = JSON.parse(atob(encodedConfig)) as { formId?: unknown };
    return typeof config.formId === "string" && config.formId.trim()
      ? config.formId.trim()
      : undefined;
  } catch {
    return undefined;
  }
}
