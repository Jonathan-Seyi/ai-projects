// Pure application logic. No browser APIs or external dependencies.
export const STATUSES = Object.freeze(["Applied", "Interview", "Offer", "Rejected"]);

export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeApplication(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Application must be an object.");
  }
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const company = typeof input.company === "string" ? input.company.trim() : "";
  const role = typeof input.role === "string" ? input.role.trim() : "";
  const date = input.date;
  const status = input.status ?? "Applied";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (!id || id.length > 120) throw new Error("A valid application ID is required.");
  if (!company || company.length > 80) throw new Error("Company must be 1 to 80 characters.");
  if (!role || role.length > 100) throw new Error("Role must be 1 to 100 characters.");
  if (!isValidDate(date)) throw new Error("Enter a valid application date.");
  if (!STATUSES.includes(status)) throw new Error("Invalid application status.");
  if (notes.length > 500) throw new Error("Notes must be 500 characters or fewer.");
  return { id, company, role, date, status, notes };
}

export function loadApplications(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set();
    const result = [];
    for (const item of parsed) {
      try {
        const entry = normalizeApplication(item);
        if (!ids.has(entry.id)) {
          ids.add(entry.id);
          result.push(entry);
        }
      } catch {
        // Skip malformed records rather than crashing the dashboard.
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function filterApplications(applications, query = "", status = "All") {
  const needle = String(query).trim().toLocaleLowerCase();
  return applications
    .filter((item) => {
      const matchesStatus = status === "All" || item.status === status;
      const searchable = [item.company, item.role, item.notes].join(" ").toLocaleLowerCase();
      return matchesStatus && searchable.includes(needle);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company));
}

export function getStats(applications) {
  return {
    total: applications.length,
    active: applications.filter((item) => item.status === "Applied" || item.status === "Interview").length,
    interviews: applications.filter((item) => item.status === "Interview").length,
    offers: applications.filter((item) => item.status === "Offer").length,
  };
}

export function changeStatus(applications, id, status) {
  if (!STATUSES.includes(status)) throw new Error("Invalid application status.");
  return applications.map((item) => item.id === id ? { ...item, status } : item);
}

export function csvCell(value) {
  let text = String(value ?? "");
  // Spreadsheet programs may interpret untrusted cell values as formulas.
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function toCsv(applications) {
  const columns = ["Company", "Role", "Date", "Status", "Notes"];
  const rows = applications.map((item) => [
    item.company, item.role, item.date, item.status, item.notes
  ].map(csvCell).join(","));
  return [columns.join(","), ...rows].join("\r\n") + "\r\n";
}
