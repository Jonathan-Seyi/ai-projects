import {
  STATUSES, normalizeApplication, loadApplications, filterApplications,
  getStats, changeStatus, toCsv
} from "./tracker.mjs";
import { importApplications, MAX_CSV_CHARS } from "./import-csv.mjs";

const STORAGE_KEY = "portfolio-job-tracker-v1";
const form = document.querySelector("#application-form");
const list = document.querySelector("#application-list");
const empty = document.querySelector("#empty-state");
const search = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const feedback = document.querySelector("#feedback");
const resultCount = document.querySelector("#result-count");
const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const importFile = document.querySelector("#import-file");
const clearButton = document.querySelector("#clear-button");
const dateInput = document.querySelector("#date");
const countFields = {
  total: document.querySelector("#stat-total"),
  active: document.querySelector("#stat-active"),
  interviews: document.querySelector("#stat-interviews"),
  offers: document.querySelector("#stat-offers"),
};

function readStorage() {
  try {
    return loadApplications(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    notify("Browser storage is unavailable. Changes may not be saved.", true);
    return [];
  }
}

let applications = readStorage();

function notify(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    return true;
  } catch {
    notify("Unable to save changes. Check your browser storage settings.", true);
    return false;
  }
}

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function prettyDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
  }).format(new Date(date + "T12:00:00Z"));
}

function render() {
  const stats = getStats(applications);
  for (const [key, field] of Object.entries(countFields)) field.textContent = stats[key];

  const matches = filterApplications(applications, search.value, statusFilter.value);
  resultCount.textContent = String(matches.length) + " of " + applications.length + " applications";
  list.replaceChildren();
  empty.hidden = matches.length > 0;
  empty.textContent = applications.length
    ? "No applications match your filters. Try a different search."
    : "No applications yet. Add your first application to start tracking.";

  for (const application of matches) {
    const card = element("article", "application-card");
    const top = element("div", "application-top");
    const text = element("div", "application-heading");
    const company = element("h3", "", application.company);
    const role = element("p", "role", application.role);
    text.append(company, role);

    const badge = element("span", "status-badge status-" + application.status.toLowerCase(), application.status);
    top.append(text, badge);
    const meta = element("p", "application-date", "Applied " + prettyDate(application.date));
    card.append(top, meta);

    if (application.notes) card.append(element("p", "application-notes", application.notes));

    const actions = element("div", "application-actions");
    const label = element("label", "sr-only", "Status for " + application.company + ", " + application.role);
    const select = element("select", "status-select");
    for (const status of STATUSES) {
      const option = element("option", "", status);
      option.value = status;
      select.append(option);
    }
    select.value = application.status;
    const selectId = "status-" + application.id.replace(/[^a-zA-Z0-9_-]/g, "");
    select.id = selectId;
    label.htmlFor = selectId;
    select.addEventListener("change", () => {
      applications = changeStatus(applications, application.id, select.value);
      if (persist()) notify("Application status updated.");
      render();
    });

    const remove = element("button", "delete-button", "Delete");
    remove.type = "button";
    remove.setAttribute("aria-label", "Delete application at " + application.company);
    remove.addEventListener("click", () => {
      if (!window.confirm("Delete the application at " + application.company + "?")) return;
      applications = applications.filter((item) => item.id !== application.id);
      if (persist()) notify("Application deleted.");
      render();
    });
    actions.append(label, select, remove);
    card.append(actions);
    list.append(card);
  }
  exportButton.disabled = applications.length === 0;
  clearButton.disabled = applications.length === 0;
}

function newApplicationId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const values = new FormData(form);
    const id = newApplicationId();
    const application = normalizeApplication({
      id,
      company: values.get("company"),
      role: values.get("role"),
      date: values.get("date"),
      status: values.get("status"),
      notes: values.get("notes"),
    });
    applications = [application, ...applications];
    if (persist()) notify("Application added.");
    form.reset();
    dateInput.value = localToday();
    render();
    document.querySelector("#company").focus();
  } catch (error) {
    notify(error.message || "Could not add the application.", true);
  }
});

search.addEventListener("input", render);
statusFilter.addEventListener("change", render);

exportButton.addEventListener("click", () => {
  const blob = new Blob(["\uFEFF", toCsv(applications)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "job-applications.csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("CSV export downloaded.");
});

importButton.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_CSV_CHARS) {
      throw new Error("Choose a CSV file smaller than 1 MB.");
    }
    const result = importApplications(await file.text(), applications, newApplicationId);
    const summary = "Imported " + result.added + " application(s). " +
      result.skippedDuplicates + " duplicate(s) skipped. " +
      result.invalidRows + " invalid row(s) skipped.";
    if (result.added > 0) {
      // Save first: failed storage must not replace the in-memory dashboard.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.applications));
      } catch {
        throw new Error("Browser storage is full or unavailable. Nothing was imported.");
      }
      applications = result.applications;
      render();
    }
    notify(summary + (result.errors.length ? " " + result.errors.join(" ") : ""), result.invalidRows > 0);
  } catch (error) {
    notify("CSV import failed: " + (error.message || "Unable to read file."), true);
  } finally {
    importFile.value = "";
  }
});

clearButton.addEventListener("click", () => {
  if (!window.confirm("Delete ALL saved applications? This cannot be undone.")) return;
  applications = [];
  if (persist()) notify("All applications deleted.");
  render();
});

dateInput.value = localToday();
render();
