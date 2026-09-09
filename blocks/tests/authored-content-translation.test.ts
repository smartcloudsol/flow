import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import ts from "typescript";
import type { FieldConfig, FormAttributes } from "../src/shared/types.ts";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

function loadSource(filename: string): Record<string, unknown> {
  const resolved = path.resolve(filename);
  assert.equal(existsSync(resolved), true);
  const module = { exports: {} as Record<string, unknown> };
  const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolved,
  }).outputText;
  new Function("exports", "require", "module", code)(
    module.exports,
    () => ({}),
    module,
  );
  return module.exports;
}

const { translateAuthoredFormContent, translateAuthoredHtml } = loadSource(
  path.join(sourceRoot, "runtime/authored-content.ts"),
) as typeof import("../src/runtime/authored-content.ts");

const translations: Record<string, string> = {
  "Contact us": "translated: Contact us",
  Send: "translated: Send",
  "Email address": "translated: Email address",
  "Enter your email address": "translated: Enter your email address",
  Work: "translated: Work",
  Personal: "translated: Personal",
  Details: "translated: Details",
  "Tell us more": "translated: Tell us more",
  Next: "translated: Next",
  Previous: "translated: Previous",
  "Request review": "translated: Request review",
};
const translate = (key: string) => translations[key] ?? key;

function fixture() {
  const form: FormAttributes = {
    formId: "contact",
    formName: "Contact us",
    submitLabel: "Send",
    showFormAgainLabel: "",
    actions: [{ actionKey: "review", label: "Request review" }],
  };
  const fields = [
    {
      type: "text",
      id: "email",
      name: "email",
      label: "Email address",
      placeholder: "Enter your email address",
      description: "",
    },
    {
      type: "select",
      id: "kind",
      name: "kind",
      label: "Details",
      options: [
        { value: "work", label: "Work" },
        { value: "personal", label: "Personal" },
      ],
    },
    {
      type: "wizard",
      title: "Details",
      subtitle: "Tell us more",
      nextButtonLabel: "Next",
      prevButtonLabel: "Previous",
      steps: [
        {
          title: "Details",
          description: "Tell us more",
          children: [],
        },
      ],
    },
    { type: "display-code", content: "const label = 'Send';" },
  ] as FieldConfig[];
  return { form, fields };
}

test("authored translation automatically covers form, field, option, wizard, and action copy", () => {
  const { form, fields } = fixture();
  const result = translateAuthoredFormContent(form, fields, translate);
  assert.notEqual(result.form, form);
  assert.notEqual(result.fields, fields);
  assert.equal(result.form.formName, "translated: Contact us");
  assert.equal(result.form.submitLabel, "translated: Send");
  assert.equal(result.form.showFormAgainLabel, "");
  assert.equal(result.form.actions?.[0]?.label, "translated: Request review");
  assert.deepEqual(result.fields[0], {
    ...fields[0],
    label: "translated: Email address",
    placeholder: "translated: Enter your email address",
  });
  assert.deepEqual(
    (result.fields[1] as { options: Array<{ label: string; value: string }> })
      .options,
    [
      { value: "work", label: "translated: Work" },
      { value: "personal", label: "translated: Personal" },
    ],
  );
  const wizard = result.fields[2] as Extract<
    FieldConfig,
    { type: "wizard" }
  >;
  assert.equal(wizard.title, "translated: Details");
  assert.equal(wizard.subtitle, "translated: Tell us more");
  assert.equal(wizard.nextButtonLabel, "translated: Next");
  assert.equal(wizard.prevButtonLabel, "translated: Previous");
  assert.equal(
    wizard.steps[0]?.description,
    "translated: Tell us more",
  );
  assert.equal(
    (result.fields[3] as { content: string }).content,
    "const label = 'Send';",
  );
  assert.equal((result.fields[0] as { name: string }).name, "email");
  assert.equal(
    (result.fields[1] as { options: Array<{ value: string }> }).options[0]
      ?.value,
    "work",
  );
});

test("missing catalog entries fall back to the exact authored string", () => {
  const { form, fields } = fixture();
  form.successMessage = " Thanks, we received your message. ";
  const result = translateAuthoredFormContent(form, fields, translate);
  assert.equal(
    result.form.successMessage,
    " Thanks, we received your message. ",
  );
});

test("authored translation preserves whitespace and permits an explicitly empty translation", () => {
  const { form, fields } = fixture();
  form.successMessage = "\n\u00a0Hide this message\u00a0\n";
  const result = translateAuthoredFormContent(
    form,
    fields,
    (key) => key === "Hide this message" ? "" : key,
  );
  assert.equal(result.form.successMessage, "\n\u00a0\u00a0\n");
});

test("success-state HTML translates visible copy while preserving structure and technical values", () => {
  const source = `
    <section id="confirmation" class="card" data-state="complete">
      <h2 title="Confirmation details">Thank you</h2>
      <p>Your request was received.</p>
      <input type="email" name="email" value="technical@example.test" placeholder="Email address" aria-label="Email address">
      <input type="submit" name="action" value="Send another request">
      <a href="/account?result=complete" title="Open account">Account</a>
      <img src="/receipt.png" alt="Receipt preview">
      <pre title="Code sample">const message = "Thank you";</pre>
      <code aria-label="Inline code">npm run build</code>
      <script>window.label = "Thank you";</script>
      <style>.card::after { content: "Thank you"; }</style>
      <template><p>Template text</p></template>
      <svg aria-label="Status icon"><text>Complete</text></svg>
    </section>`;
  const translatedKeys: string[] = [];
  const output = translateAuthoredHtml(
    source,
    (key) => {
      translatedKeys.push(key);
      return `translated: ${key}`;
    },
    new JSDOM("<!doctype html><html><body></body></html>").window.document,
  );
  const document = new JSDOM(output).window.document;

  assert.equal(document.querySelector("h2")?.textContent, "translated: Thank you");
  assert.equal(
    document.querySelector("h2")?.getAttribute("title"),
    "translated: Confirmation details",
  );
  assert.equal(
    document.querySelector("p")?.textContent,
    "translated: Your request was received.",
  );
  const email = document.querySelector<HTMLInputElement>('input[type="email"]');
  assert.equal(email?.placeholder, "translated: Email address");
  assert.equal(email?.getAttribute("aria-label"), "translated: Email address");
  assert.equal(email?.value, "technical@example.test");
  assert.equal(email?.name, "email");
  assert.equal(
    document.querySelector<HTMLInputElement>('input[type="submit"]')?.value,
    "translated: Send another request",
  );
  assert.equal(document.querySelector("a")?.getAttribute("href"), "/account?result=complete");
  assert.equal(document.querySelector("a")?.textContent, "translated: Account");
  assert.equal(document.querySelector("img")?.getAttribute("src"), "/receipt.png");
  assert.equal(document.querySelector("img")?.getAttribute("alt"), "translated: Receipt preview");
  assert.equal(document.querySelector("section")?.id, "confirmation");
  assert.equal(document.querySelector("section")?.className, "card");
  assert.equal(document.querySelector("section")?.getAttribute("data-state"), "complete");
  assert.equal(document.querySelector("pre")?.textContent, 'const message = "Thank you";');
  assert.equal(document.querySelector("pre")?.getAttribute("title"), "Code sample");
  assert.equal(document.querySelector("code")?.textContent, "npm run build");
  assert.equal(document.querySelector("code")?.getAttribute("aria-label"), "Inline code");
  assert.equal(document.querySelector("script")?.textContent, 'window.label = "Thank you";');
  assert.equal(document.querySelector("style")?.textContent, '.card::after { content: "Thank you"; }');
  assert.equal(document.querySelector("template")?.innerHTML, "<p>Template text</p>");
  assert.equal(document.querySelector("svg")?.getAttribute("aria-label"), "Status icon");
  assert.equal(document.querySelector("svg text")?.textContent, "Complete");
  assert.equal(translatedKeys.includes("technical@example.test"), false);
  assert.equal(translatedKeys.includes("/account?result=complete"), false);
  assert.equal(translatedKeys.includes("complete"), false);
});

test("success-state HTML is translated from the original source for every locale", () => {
  const source = '<p title="Greeting">Thank you</p>';
  const ownerDocument = new JSDOM("<!doctype html><html><body></body></html>")
    .window.document;
  const first = translateAuthoredHtml(
    source,
    (key) => `first: ${key}`,
    ownerDocument,
  );
  const second = translateAuthoredHtml(
    source,
    (key) => `second: ${key}`,
    ownerDocument,
  );

  assert.match(first, /first: Thank you/);
  assert.match(second, /second: Thank you/);
  assert.doesNotMatch(second, /second: first:/);
});
