import test from "node:test";
import assert from "node:assert/strict";
import {
  STATUSES, isValidDate, normalizeApplication, loadApplications,
  filterApplications, getStats, changeStatus, csvCell, toCsv
} from "./tracker.mjs";

const sample = (overrides = {}) => ({
  id: "a1", company: "Example Inc", role: "Developer", date: "2026-10-28",
  status: "Applied", notes: "Remote", ...overrides
});

test("supports the four expected statuses", () => {
  assert.deepEqual(STATUSES, ["Applied", "Interview", "Offer", "Rejected"]);
});

test("validates real calendar dates, including leap years", () => {
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2025-02-29"), false);
  assert.equal(isValidDate("2026-13-01"), false);
  assert.equal(isValidDate("10/28/2026"), false);
});

test("normalizes text and defaults the status", () => {
  assert.deepEqual(normalizeApplication(sample({ company: "  Example Inc  ", notes: " hi ", status: undefined })), {
    ...sample(), notes: "hi"
  });
});

test("rejects missing company or role", () => {
  assert.throws(() => normalizeApplication(sample({ company: " " })), /Company/);
  assert.throws(() => normalizeApplication(sample({ role: "" })), /Role/);
});

test("rejects oversized notes, bad IDs and invalid status", () => {
  assert.throws(() => normalizeApplication(sample({ notes: "x".repeat(501) })), /Notes/);
  assert.throws(() => normalizeApplication(sample({ id: "" })), /ID/);
  assert.throws(() => normalizeApplication(sample({ status: "Hired" })), /status/);
});

test("rejects invalid dates", () => {
  assert.throws(() => normalizeApplication(sample({ date: "2026-02-30" })), /date/);
});

test("recovers from corrupted saved JSON", () => {
  assert.deepEqual(loadApplications("{bad"), []);
  assert.deepEqual(loadApplications("{}"), []);
});

test("loads only valid records and drops duplicate IDs", () => {
  const data = [sample(), sample({ company: "Duplicate" }), sample({ id: "a2", status: "Offer" }), { id: "bad" }];
  const loaded = loadApplications(JSON.stringify(data));
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].company, "Example Inc");
});

test("searches case-insensitively across company, role and notes", () => {
  const items = [sample(), sample({ id: "a2", company: "Other", role: "Analyst", notes: "Hybrid" })];
  assert.equal(filterApplications(items, "REMOTE").length, 1);
  assert.equal(filterApplications(items, "analyst").length, 1);
  assert.equal(filterApplications(items, "missing").length, 0);
});

test("filters by status and sorts newest first", () => {
  const items = [sample({ date: "2026-01-01" }), sample({ id: "a2", date: "2026-10-28", status: "Offer" })];
  assert.equal(filterApplications(items)[0].id, "a2");
  assert.deepEqual(filterApplications(items, "", "Offer").map((item) => item.id), ["a2"]);
});

test("sorts matching dates by company", () => {
  const items = [sample({ company: "Zulu" }), sample({ id: "a2", company: "Alpha" })];
  assert.equal(filterApplications(items)[0].company, "Alpha");
});

test("calculates totals and active pipeline correctly", () => {
  const items = [
    sample(), sample({ id: "a2", status: "Interview" }),
    sample({ id: "a3", status: "Offer" }), sample({ id: "a4", status: "Rejected" })
  ];
  assert.deepEqual(getStats(items), { total: 4, active: 2, interviews: 1, offers: 1 });
});

test("updates status without mutating original entries", () => {
  const before = [sample()];
  const after = changeStatus(before, "a1", "Interview");
  assert.equal(before[0].status, "Applied");
  assert.equal(after[0].status, "Interview");
  assert.throws(() => changeStatus(before, "a1", "Unknown"), /status/);
});

test("escapes quotes, commas and line breaks in CSV", () => {
  assert.equal(csvCell('Hello, "world"\n'), '"Hello, ""world""\n"');
});

test("neutralizes spreadsheet formula injection", () => {
  for (const formula of ["=2+2", "+SUM(A1)", "-10+2", "@SUM(A1)", "  =1+1"]) {
    assert.ok(csvCell(formula).startsWith('"\''));
  }
  assert.equal(csvCell("Normal text"), '"Normal text"');
});

test("exports headers and safely quoted application data", () => {
  const csv = toCsv([sample({ company: "=2+2", notes: "First\nSecond" })]);
  assert.ok(csv.startsWith("Company,Role,Date,Status,Notes\r\n"));
  assert.ok(csv.includes('"\'=2+2"'));
  assert.ok(csv.includes('"First\nSecond"'));
  assert.ok(csv.endsWith("\r\n"));
});
