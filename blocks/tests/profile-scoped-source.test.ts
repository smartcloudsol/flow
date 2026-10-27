import assert from "node:assert/strict";
import test from "node:test";
import { profileScopedFormSource } from "../src/form/profile-scoped-source.ts";

const source = { postId: 11983, attributes: { formId: "production-form", formName: "Contact" }, fields: [], sourceKind: "pattern" as const };

test("non-profiled form sources retain historical identity exactly", () => {
  assert.equal(profileScopedFormSource(source, null), source);
});
test("a missing profile-scoped form does not adopt the shared Gutenberg form identity", () => {
  const result = profileScopedFormSource(source, null, { id: "development", bindingRevision: 2 });
  assert.equal(result.attributes.formId, "form-11983-development-2");
  assert.equal(result.attributes.formName, "Contact");
  assert.equal(source.attributes.formId, "production-form");
});
test("existing scoped identities remain stable across content saves and profile switchback", () => {
  assert.equal(profileScopedFormSource(source, "dev-existing", { id: "development", bindingRevision: 2 }).attributes.formId, "dev-existing");
  assert.equal(profileScopedFormSource(source, null, { id: "production", bindingRevision: 2 }).attributes.formId, "form-11983-production-2");
  assert.equal(profileScopedFormSource(source, null, { id: "development", bindingRevision: 2 }).attributes.formId, "form-11983-development-2");
});
test("unsaved posts cannot create untracked profile-scoped form records", () => {
  assert.throws(() => profileScopedFormSource({ ...source, postId: undefined }, null, { id: "development", bindingRevision: 2 }), /saved WordPress post/);
});
