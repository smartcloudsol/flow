export function getFrontendApiBaseUrl(): string {
  const html = document.documentElement;
  return html.dataset.wpsuiteFormsApiBaseUrl ?? "";
}
