type MonacoReactModule = typeof import("@monaco-editor/react");
type MonacoEditorModule =
  typeof import("monaco-editor/esm/vs/editor/editor.api");

let monacoReactModulePromise: Promise<MonacoReactModule> | null = null;
let monacoEditorModulePromise: Promise<MonacoEditorModule> | null = null;
let monacoInitPromise: Promise<void> | null = null;

export function loadMonacoReactModule(): Promise<MonacoReactModule> {
  if (!monacoReactModulePromise) {
    monacoReactModulePromise = import("@monaco-editor/react");
  }

  return monacoReactModulePromise;
}

function loadMonacoEditorModule(): Promise<MonacoEditorModule> {
  if (!monacoEditorModulePromise) {
    monacoEditorModulePromise = Promise.all([
      import("monaco-editor/esm/vs/editor/editor.api"),
      import("monaco-editor/esm/vs/language/json/monaco.contribution"),
      import("monaco-editor/esm/vs/language/html/monaco.contribution"),
      import(
        "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution"
      ),
      import("monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution"),
      import(
        "monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution"
      ),
    ]).then(([monacoModule]) => monacoModule);
  }

  return monacoEditorModulePromise;
}

export function ensureMonacoInitialized(): Promise<void> {
  if (!monacoInitPromise) {
    monacoInitPromise = (async () => {
      const [monacoReactModule, monacoModule] = await Promise.all([
        loadMonacoReactModule(),
        loadMonacoEditorModule(),
      ]);

      monacoReactModule.loader.config({ monaco: monacoModule });
    })();
  }

  return monacoInitPromise;
}
