import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, importApplications, MAX_CSV_CHARS, MAX_CSV_ROWS } from "./import-csv.mjs";
import { toCsv } from "./tracker.mjs";

const header = "Company,Role,Date,Status,Notes\r\n";
const row = "Acme,Developer,2026-10-28,Applied,Remote\r\n";
const sample = (overrides = {}) => ({
  id: "original", company: "Acme", role: "Developer", date: "2026-10-28",
  status: "Applied", notes: "Remote", ...overrides,
});
const makeId = () => { let i = 0; return () => "new-" + (++i); };

test("parses quoted commas, double quotes and multiline notes", () => {
  assert.deepEqual(parseCsv('"A,B","Say ""hi""","one\r\ntwo"\r\n'), [["A,B", 'Say "hi"', "one\r\ntwo"]]);
});
test("handles UTF-8 BOM, trailing newline and empty cells", () => {
  assert.deepEqual(parseCsv("\uFEFFCompany,Role\r\nAcme,\r\n"), [["Company", "Role"], ["Acme", ""]]);
});
test("handles LF, CR and final row without newline", () => {
  assert.deepEqual(parseCsv("a,b\nc,d\re,f"), [["a", "b"], ["c", "d"], ["e", "f"]]);
});
test("rejects unterminated quotes and malformed quote placement", () => {
  assert.throws(() => parseCsv('"oops'), /not closed/);
  assert.throws(() => parseCsv('x"y'), /unquoted/);
  assert.throws(() => parseCsv('"x"y'), /after a closing/);
});
test("rejects empty and non-string input", () => {
  assert.throws(() => parseCsv(" \n "), /empty/);
  assert.throws(() => parseCsv(null), /text/);
});
test("enforces file and row limits", () => {
  assert.throws(() => parseCsv("a".repeat(MAX_CSV_CHARS + 1)), /1 MB/);
  assert.throws(() => parseCsv("x\n".repeat(MAX_CSV_ROWS + 2)), /5,000-row/);
});
test("imports valid rows with generated unique IDs", () => {
  const result = importApplications(header + row, [], makeId());
  assert.equal(result.added, 1);
  assert.deepEqual(result.applications, [sample({ id: "new-1" })]);
  assert.equal(result.invalidRows, 0);
});
test("does not mutate existing applications", () => {
  const existing = [sample()];
  const result = importApplications(header + "Other,QA,2026-10-29,Interview,Next steps\r\n", existing, makeId());
  assert.equal(existing.length, 1);
  assert.equal(result.applications.length, 2);
  assert.equal(result.applications[0], existing[0]);
});
test("deduplicates against existing entries regardless of case and status", () => {
  const result = importApplications(header + "acme,developer,2026-10-28,Offer,Changed\r\n", [sample()], makeId());
  assert.equal(result.added, 0);
  assert.equal(result.skippedDuplicates, 1);
});
test("deduplicates repeated rows within a CSV", () => {
  const result = importApplications(header + row + row, [], makeId());
  assert.equal(result.added, 1);
  assert.equal(result.skippedDuplicates, 1);
});
test("skips invalid records with bounded row error details", () => {
  const result = importApplications(header + "Bad,Dev,2026-02-30,Applied,\r\n" + row, [], makeId());
  assert.equal(result.invalidRows, 1);
  assert.equal(result.added, 1);
  assert.match(result.errors[0], /Data row 1/);
});
test("skips rows with missing columns", () => {
  const result = importApplications(header + "Acme,Dev,2026-10-28,Applied\r\n", [], makeId());
  assert.equal(result.invalidRows, 1);
});
test("rejects wrong or duplicated headers without modifying data", () => {
  assert.throws(() => importApplications("Company,Company,Date,Status,Notes\n", [], makeId()), /headers/);
  assert.throws(() => importApplications("Company,Role,Date\n", [], makeId()), /headers/);
});
test("supports reordered case-insensitive headers", () => {
  const result = importApplications("status,notes,date,company,role\nOffer,Great,2026-10-28,Acme,Dev\n", [], makeId());
  assert.equal(result.applications[0].role, "Dev");
  assert.equal(result.applications[0].status, "Offer");
});
test("round-trips ordinary exports including commas, quotes and newlines", () => {
  const original = sample({ company: "Acme, Inc", notes: 'Line 1\n"Line 2"' });
  const result = importApplications(toCsv([original]), [], makeId());
  assert.equal(result.added, 1);
  assert.equal(result.applications[0].company, original.company);
  assert.equal(result.applications[0].notes, original.notes);
});
test("preserves CSV formula-protection apostrophe rather than activating formulas", () => {
  const result = importApplications(toCsv([sample({ company: "=2+2" })]), [], makeId());
  assert.equal(result.applications[0].company, "'=2+2");
});
test("recovers from ID collisions with existing entries", () => {
  let i = 0;
  const result = importApplications(header + "Other,Dev,2026-10-29,Applied,\n", [sample({ id: "same" })], () => (++i === 1 ? "same" : "fresh"));
  assert.equal(result.applications[1].id, "fresh");
});
test("returns an error for persistent ID generation failures", () => {
  const result = importApplications(header + row, [], () => "");
  assert.equal(result.invalidRows, 1);
  assert.equal(result.added, 0);
});
test("ignores blank data rows", () => {
  const result = importApplications(header + "\r\n" + row + "\r\n", [], makeId());
  assert.equal(result.added, 1);
  assert.equal(result.invalidRows, 0);
});
