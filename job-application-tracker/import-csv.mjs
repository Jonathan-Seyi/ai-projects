import { normalizeApplication } from "./tracker.mjs";

const REQUIRED_COLUMNS = ["company", "role", "date", "status", "notes"];
export const MAX_CSV_CHARS = 1_000_000;
export const MAX_CSV_ROWS = 5_000;

/** Parse RFC 4180-style CSV, including quoted commas, escaped quotes and newlines. */
export function parseCsv(text) {
  if (typeof text !== "string") throw new TypeError("CSV content must be text.");
  if (text.length > MAX_CSV_CHARS) throw new Error("CSV exceeds the 1 MB import limit.");
  const source = text.replace(/^\uFEFF/, "");
  if (!source.trim()) throw new Error("The CSV file is empty.");

  const rows = [];
  let row = [];
  let cell = "";
  let state = "field"; // field, quoted, or after-quote

  function finishCell() {
    row.push(cell);
    cell = "";
    state = "field";
  }
  function finishRow() {
    finishCell();
    rows.push(row);
    if (rows.length > MAX_CSV_ROWS + 1) throw new Error("CSV exceeds the 5,000-row import limit.");
    row = [];
  }

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (state === "quoted") {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          state = "after-quote";
        }
      } else {
        cell += char;
      }
    } else if (char === ",") {
      finishCell();
    } else if (char === "\n" || char === "\r") {
      finishRow();
      if (char === "\r" && source[i + 1] === "\n") i += 1;
    } else if (state === "after-quote") {
      throw new Error("Invalid CSV: unexpected text after a closing quote.");
    } else if (char === '"') {
      if (cell !== "") throw new Error("Invalid CSV: quote inside an unquoted field.");
      state = "quoted";
    } else {
      cell += char;
    }
  }
  if (state === "quoted") throw new Error("Invalid CSV: an opening quote was not closed.");
  if (row.length || cell.length || state === "after-quote") finishRow();
  return rows;
}

function identity(item) {
  return [item.company, item.role, item.date]
    .map((value) => value.trim().toLocaleLowerCase())
    .join("\u0000");
}

/** Merge valid CSV records without replacing or modifying existing applications. */
export function importApplications(csvText, existing, createId) {
  if (!Array.isArray(existing) || typeof createId !== "function") {
    throw new TypeError("Existing applications and an ID generator are required.");
  }
  const rows = parseCsv(csvText);
  const headers = (rows[0] || []).map((value) => value.trim().toLowerCase());
  if (headers.length !== REQUIRED_COLUMNS.length ||
      new Set(headers).size !== REQUIRED_COLUMNS.length ||
      !REQUIRED_COLUMNS.every((column) => headers.includes(column))) {
    throw new Error("CSV headers must contain Company, Role, Date, Status and Notes exactly once.");
  }

  const column = Object.fromEntries(headers.map((name, index) => [name, index]));
  const known = new Set(existing.map(identity));
  const usedIds = new Set(existing.map((item) => item.id));
  const additions = [];
  const errors = [];
  let invalidRows = 0;
  let skippedDuplicates = 0;

  for (const [index, values] of rows.slice(1).entries()) {
    if (values.every((value) => value.trim() === "")) continue;
    try {
      if (values.length !== headers.length) throw new Error("Incorrect number of columns.");
      const candidate = normalizeApplication({
        id: "import-preview",
        company: values[column.company],
        role: values[column.role],
        date: values[column.date],
        status: values[column.status],
        notes: values[column.notes],
      });
      const key = identity(candidate);
      if (known.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      let id;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const next = createId();
        if (typeof next === "string" && next.trim() && !usedIds.has(next.trim())) {
          id = next.trim();
          break;
        }
      }
      if (!id) throw new Error("Could not generate a unique ID.");
      const application = normalizeApplication({ ...candidate, id });
      additions.push(application);
      known.add(key);
      usedIds.add(id);
    } catch (error) {
      invalidRows += 1;
      if (errors.length < 5) errors.push("Data row " + (index + 1) + ": " + error.message);
    }
  }

  return {
    applications: [...existing, ...additions],
    added: additions.length,
    skippedDuplicates,
    invalidRows,
    errors,
  };
}
