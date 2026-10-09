import assert from "node:assert/strict";
import { test } from "node:test";
import { FLOW_ADMIN_PAGES, guardFlowAdminPage, resolveFlowAdminPage } from "../src/admin-page.ts";

test("opens all actual Flow tabs, normalizes templates, and rejects unknown input", () => {
  for (const page of FLOW_ADMIN_PAGES) assert.equal(resolveFlowAdminPage(`?page=smartcloud-flow&section=${page}`), page);
  assert.equal(resolveFlowAdminPage("?section=templates"), "workflows");
  for (const search of ["", "?section=unknown", "?section[]=submissions", "?section=../delete"]) assert.equal(resolveFlowAdminPage(search), "general");
});

test("delayed hydration keeps the selected tab and terminal missing Pro config falls back", () => {
  for (const page of FLOW_ADMIN_PAGES) {
    assert.equal(guardFlowAdminPage(page, false, false), page);
    assert.equal(guardFlowAdminPage(page, true, true), page);
    assert.equal(guardFlowAdminPage(page, true, false), "general");
  }
});

test("explicit backend denial blocks only the denied operations screen, including while loading", () => {
  for (const ready of [false, true]) {
    assert.equal(guardFlowAdminPage("submissions", ready, true, { submissions: false, workflows: true }), "general");
    assert.equal(guardFlowAdminPage("workflows", ready, true, { submissions: true, workflows: false }), "general");
    assert.equal(guardFlowAdminPage("workflows", ready, true, { submissions: false, workflows: true }), "workflows");
    assert.equal(guardFlowAdminPage("api-settings", ready, true, { submissions: false, workflows: false }), "api-settings");
  }
});
