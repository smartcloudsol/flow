import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { FieldConfig, RuntimeFieldStateMap } from "../src/shared/types.ts";
import type { FormRuntimeState } from "../src/runtime/reducer.ts";

// Production runtime modules use bundler-style extensionless imports. Transpile
// their real source for Node's existing test runner; no implementation is copied.
const require = createRequire(import.meta.url);
const loaded = new Map<string, { exports: Record<string, unknown> }>();
function loadSource(filename: string): Record<string, unknown> {
  const resolved = path.resolve(filename);
  const cached = loaded.get(resolved);
  if (cached) return cached.exports;
  const module = { exports: {} as Record<string, unknown> };
  loaded.set(resolved, module);
  const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: resolved,
  }).outputText;
  const localRequire = (specifier: string) => {
    if (!specifier.startsWith(".")) return require(specifier);
    const base = path.resolve(path.dirname(resolved), specifier);
    const target = [base + ".ts", path.join(base, "index.ts"), base].find(existsSync);
    assert.ok(target, `Unresolved local source: ${specifier}`);
    return loadSource(target);
  };
  new Function("exports", "require", "module", code)(module.exports, localRequire, module);
  return module.exports;
}
const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const { formReducer } = loadSource(path.join(sourceRoot, "runtime/reducer.ts")) as typeof import("../src/runtime/reducer.ts");
const { createFlowValidation } = loadSource(path.join(sourceRoot, "runtime/validation.ts")) as typeof import("../src/runtime/validation.ts");
const { huDict } = loadSource(path.join(sourceRoot, "i18n/hu.ts")) as { huDict: Record<string, string> };
const { deDict } = loadSource(path.join(sourceRoot, "i18n/de.ts")) as { deDict: Record<string, string> };
const hu = createFlowValidation((key) => huDict[key] ?? key);
const de = createFlowValidation((key) => deDict[key] ?? key);

function initialState(): FormRuntimeState {
  const values = { customer: "In-progress authored value" };
  return {
    status: "idle", values, evaluationValues: values,
    fields: [], errors: {}, submitCount: 2, touched: new Set(["customer"]),
    fieldStates: {}, aiSuggestions: { status: "done", suggestions: [], rawText: "Generated text" },
  };
}

test("separate validators localize required errors and preserve authored labels/messages", () => {
  const fields = [{ type: "text", name: "customer", label: "Customer name", required: true }] as FieldConfig[];
  assert.deepEqual(hu.validateValues(fields, { customer: "" }), { customer: "Customer name megadása kötelező." });
  assert.deepEqual(de.validateValues(fields, { customer: "" }), { customer: "Customer name ist erforderlich." });
  assert.equal((fields[0] as { label: string }).label, "Customer name");
  const custom = [{ type: "text", name: "customer", label: "Customer name", validation: { pattern: "^[A-Z]+$", message: "Use the reference code from your invoice" } }] as FieldConfig[];
  assert.deepEqual(hu.validateValues(custom, { customer: "invalid" }), de.validateValues(custom, { customer: "invalid" }));
  assert.equal(hu.validateValues(custom, { customer: "invalid" }).customer, "Use the reference code from your invoice");
});

test("visible same-name field determines revalidation when an earlier instance is hidden", () => {
  const fields = [
    { type: "text", name: "customer", label: "Hidden caption", required: true },
    { type: "text", name: "customer", label: "Visible caption", required: true },
  ] as FieldConfig[];
  const states = {
    "text:0": { visible: false, enabled: true },
    "text:1": { visible: true, enabled: true },
  } as RuntimeFieldStateMap;
  const values = { customer: "" };
  assert.deepEqual(hu.validateValues(fields, values, states), { customer: "Visible caption megadása kötelező." });
  assert.deepEqual(de.validateValues(fields, values, states), { customer: "Visible caption ist erforderlich." });
  assert.equal(de.validateField("customer", fields, values, states, "text:1"), "Visible caption ist erforderlich.");
});

test("canonical status messages do not reset edited fields or generated results", () => {
  const original = initialState();
  const next = formReducer(original, { type: "SET_STATUS", status: "error", messageKey: "Something went wrong. Please try again." });
  assert.equal(next.values, original.values);
  assert.equal(next.touched, original.touched);
  assert.equal(next.aiSuggestions, original.aiSuggestions);
  assert.equal(next.submitCount, 2);
  assert.equal(next.messageKey, "Something went wrong. Please try again.");
  const authored = formReducer(next, { type: "SUBMIT_SUCCESS", message: "Your request has been queued by the editorial team" });
  assert.equal(authored.messageKey, undefined);
  assert.equal(authored.message, "Your request has been queued by the editorial team");
  assert.equal(authored.values, original.values);
  assert.equal(authored.aiSuggestions.rawText, "Generated text");
});

test("AI error keys are cleared before generated content arrives and on reset", () => {
  let state = formReducer(initialState(), { type: "AI_SUGGESTIONS_DONE", suggestions: [], errorKey: "Failed to generate suggestions." });
  assert.equal(state.aiSuggestions.errorKey, "Failed to generate suggestions.");
  state = formReducer(state, { type: "AI_SUGGESTIONS_LOADING", signature: "second-attempt" });
  assert.equal(state.aiSuggestions.errorKey, undefined);
  state = formReducer(state, { type: "AI_SUGGESTIONS_DONE", suggestions: [], rawText: "Failed to generate suggestions." });
  assert.equal(state.aiSuggestions.errorKey, undefined);
  assert.equal(state.aiSuggestions.rawText, "Failed to generate suggestions.");
  state = formReducer(state, { type: "SET_STATUS", status: "error", messageKey: "An error occurred" });
  state = formReducer(state, { type: "RESET", values: { customer: "" } });
  assert.equal(state.messageKey, undefined);
  assert.equal(state.message, undefined);
  assert.equal(state.aiSuggestions.errorKey, undefined);
});
