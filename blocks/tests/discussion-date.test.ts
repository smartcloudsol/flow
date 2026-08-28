import assert from "node:assert/strict";
import test from "node:test";

import { formatDiscussionDate } from "../src/discussion/date-format.ts";

test("formats discussion dates with the selected locale and styles", () => {
  const formatted = formatDiscussionDate({
    value: "2026-08-26T10:30:00.000Z",
    locale: "en-GB",
    dateStyle: "medium",
    timeStyle: "none",
  });

  assert.equal(formatted, "26 Aug 2026");
});

test("rejects invalid discussion timestamps", () => {
  assert.equal(formatDiscussionDate({ value: "not-a-date" }), undefined);
});
