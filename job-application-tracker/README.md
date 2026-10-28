# Application Atlas — Job Application Tracker

A responsive, privacy-first job search dashboard built with **vanilla JavaScript, HTML, and CSS**. Track opportunities, manage their status, search your pipeline, and export your data without a backend or an account.

## What it does

- Add a company, position, application date, status and optional notes.
- Move applications between **Applied**, **Interview**, **Offer** and **Rejected**.
- Search by company, role or notes, and filter by status.
- See pipeline totals and active/interview/offer counts.
- Store entries in the browser's **localStorage** and recover gracefully from invalid saved data.
- Download a **CSV backup**, with escaping for commas, quotes and spreadsheet-formula injection.
- Use a responsive interface with accessible form labels, keyboard focus states and reduced-motion support.

## Preview

Open index.html through a local web server. No build tools or third-party JavaScript packages are needed.

## Run locally

**Option A — Python (from this folder):**

~~~bash
python3 -m http.server 8000
~~~

Open **http://localhost:8000** in your browser.

**Option B — VS Code:** use a local development server such as the Live Server extension.

A local server is recommended because the application uses native JavaScript ES modules, which some browsers block when opened directly with file://.

## Run tests

Requires **Node.js 20 or newer**. No npm install is necessary.

~~~bash
node --test tracker.test.mjs
~~~

The tests cover input validation, real calendar dates, malformed saved records, filtering, sorting, status updates, dashboard counts, and safe CSV output. GitHub Actions also runs these checks on relevant changes.

## How it works

- **index.html**: accessible dashboard layout and form.
- **styles.css**: responsive dark theme.
- **tracker.mjs**: pure, testable application logic.
- **app.mjs**: DOM rendering, events, local persistence and CSV download.
- **tracker.test.mjs**: dependency-free automated tests.

All user-entered content is inserted with textContent, not interpreted as HTML. No network requests are made by the app.

## Privacy and limitations

- Entries stay **on the current browser/device**, not in a cloud account. Clearing site data or switching browsers can erase them.
- **Export CSV regularly** for a backup. This version does not import CSV or sync between devices.
- The export includes notes, so store and share the downloaded file carefully.
- The app is not connected to job boards or email, and it does not automatically submit applications.
- There is no authentication or multi-user support.

## Roadmap

- [ ] Add CSV import with validation and duplicate handling.
- [ ] Add follow-up reminders and date-based sorting options.
- [ ] Add end-to-end browser tests.
- [ ] Deploy a GitHub Pages demo after reviewing deployment settings.

## License

This is a portfolio demo. No external services, API keys or paid dependencies are required.
