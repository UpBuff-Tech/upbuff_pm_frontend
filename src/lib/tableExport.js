/**
 * Reusable table export helpers (Excel + PDF).
 *
 * Callers supply a plain column definition and the rows to export:
 *
 *   const columns = [
 *     { header: 'Task ID', value: t => t.taskId },
 *     { header: 'Task Name', value: t => t.taskName },
 *   ];
 *   exportRowsToExcel(columns, tasks, { fileName: 'my_tasks', sheetName: 'Tasks' });
 *   exportRowsToPdf(columns, tasks, { fileName: 'my_tasks', title: 'My Tasks' });
 *
 * Pages should normally go through runTableExport() instead of calling those
 * two directly — it owns the parts every export button repeats (fetching the
 * rows, the empty guard, the button spinner and the error toast).
 *
 * A page describes its export once, in a config object, and hands it to the
 * two shared components (components/exportButtons):
 *
 *   const ticketExport = {
 *     scope: 'ticket',
 *     columns: EXPORT_COLUMNS,
 *     rows: getTicketsForExport,
 *     fileName: 'tickets',
 *     title: 'Tickets',
 *     dateFilter: { fields: TICKET_DATE_FIELDS }
 *   };
 *   <TableExportButtons scope="ticket" config={ticketExport} />
 *   <TableExportModal scope="ticket" dateFields="ticket" config={ticketExport} />
 *
 * With a `dateFilter` the format buttons open the options modal and the export
 * runs when the user confirms; without one they export immediately.
 */
import moment from 'moment';
import { showButtonLoader } from '../components/loader';
import { Session } from './session';

/**
 * xlsx and jspdf are ~1.3MB combined, so they must stay out of the initial
 * bundle — they are loaded as plain <script> tags from /public, and only when
 * an export is triggered.
 */
const VENDOR_SCRIPTS = {
  xlsx: '/assets/vendor/libs/xlsx/xlsx.full.min.js',
  jspdf: '/assets/vendor/libs/jspdf/jspdf.umd.min.js',
  jspdfAutoTable: '/assets/vendor/libs/jspdf/jspdf.plugin.autotable.min.js'
};

// One in-flight/settled promise per script, so repeated exports reuse the
// already-loaded library instead of appending another <script>.
const vendorScriptPromises = {};

function loadVendorScript(key) {
  if (vendorScriptPromises[key]) return vendorScriptPromises[key];

  vendorScriptPromises[key] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = VENDOR_SCRIPTS[key];
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Drop the cached rejection so a later export can retry (e.g. after the
      // connection comes back) rather than failing forever.
      delete vendorScriptPromises[key];
      reject(new Error(`Could not load ${VENDOR_SCRIPTS[key]}`));
    };
    document.head.appendChild(script);
  });

  return vendorScriptPromises[key];
}

/**
 * The jsPDF constructor with autoTable applied.
 *
 * autotable's UMD build patches whatever `window.jspdf` it finds at load time,
 * so it must be loaded strictly after jspdf — hence the sequential chain.
 */
function loadJsPdf() {
  return loadVendorScript('jspdf')
    .then(() => loadVendorScript('jspdfAutoTable'))
    .then(() => {
      const JsPDF = window.jspdf && window.jspdf.jsPDF;
      if (typeof JsPDF !== 'function') {
        throw new Error('jspdf loaded but exposed no jsPDF constructor');
      }
      if (typeof JsPDF.API.autoTable !== 'function') {
        throw new Error('jspdf-autotable loaded but did not register autoTable');
      }
      return JsPDF;
    });
}

function loadXlsx() {
  return loadVendorScript('xlsx').then(() => {
    if (!window.XLSX || !window.XLSX.utils) {
      throw new Error('xlsx loaded but exposed no XLSX global');
    }
    return window.XLSX;
  });
}

/**
 * Resolve one record into a { header: cellText } object using the column defs.
 */
function toPlainRow(columns, record, index) {
  const row = {};
  columns.forEach((column) => {
    const value = column.value(record, index);
    row[column.header] = value === undefined || value === null ? '' : String(value);
  });
  return row;
}

/**
 * Build a timestamped file name, e.g. "my_tasks_2026-07-21".
 */
function withTimestamp(fileName) {
  return `${fileName}_${moment().format('YYYY-MM-DD')}`;
}

/**
 * Short date for an exported cell, matching the on-screen task tables.
 * Empty dates read as "-" rather than a blank cell.
 */
export function formatExportDate(date) {
  return date ? moment(date).format('DD/MM/YYYY') : '-';
}

/**
 * A date span as a single cell, collapsing to one date when both ends fall on
 * the same day (the common case for a one-day report).
 *
 * e.g. (27 Jul, 29 Jul) -> "27-07-2026 — 29-07-2026", (29 Jul, 29 Jul) -> "29-07-2026"
 */
export function formatDateRangeLabel(from, to, options = {}) {
  const { format = 'DD-MM-YYYY', separator = ' — ', empty = '-' } = options;

  const start = from ? moment(from) : null;
  const end = to ? moment(to) : null;
  if (!start && !end) return empty;
  if (!start || !end) return (start || end).format(format);

  const startLabel = start.format(format);
  const endLabel = end.format(format);
  return startLabel === endLabel ? startLabel : `${startLabel}${separator}${endLabel}`;
}

/**
 * Turn a name into a safe file-name fragment.
 * e.g. "ACME Rollout" -> "acme_rollout"
 */
export function toFileNameSlug(name, fallback = 'export') {
  const slug = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback;
}

/**
 * Export records to an .xlsx file and trigger the download.
 */
export function exportRowsToExcel(columns, records, options = {}) {
  const { fileName = 'export', sheetName = 'Sheet1' } = options;

  return loadXlsx().then((XLSX) => {
    const rows = records.map((record, index) => toPlainRow(columns, record, index));
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: columns.map(c => c.header)
    });
    const workbook = XLSX.utils.book_new();
    // Excel rejects sheet names longer than 31 chars.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    XLSX.writeFile(workbook, `${withTimestamp(fileName)}.xlsx`);
  });
}

/**
 * Export records to a landscape A4 PDF table and trigger the download.
 */
export function exportRowsToPdf(columns, records, options = {}) {
  const { fileName = 'export', title = 'Export', subtitle = '' } = options;

  return loadJsPdf().then((JsPDF) => {
    const doc = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    // jsPDF throws "Invalid arguments passed to jsPDF.text" on anything that is
    // not a string or array, so never hand it a raw caller-supplied value.
    doc.setFontSize(14);
    doc.text(String(title), 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(120);
    const generatedOn = `Generated on ${moment().format('DD MMM YYYY, hh:mm A')}`;
    doc.text(subtitle ? `${String(subtitle)}  |  ${generatedOn}` : generatedOn, 40, 58);
    doc.setTextColor(0);

    const tableOptions = {
      startY: 72,
      head: [columns.map(c => c.header)],
      body: records.map((record, index) => {
        const row = toPlainRow(columns, record, index);
        return columns.map(c => row[c.header]);
      }),
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    };

    // loadJsPdf() has already verified the plugin registered autoTable.
    doc.autoTable(tableOptions);

    doc.save(`${withTimestamp(fileName)}.pdf`);
  });
}

export const EXPORT_FORMATS = {
  excel: { label: 'Excel', run: exportRowsToExcel },
  pdf: { label: 'PDF', run: exportRowsToPdf }
};

/**
 * Config fields may be given either as a plain value or as a function of the
 * page's `instance` object, so a page can describe filter-dependent titles inline.
 */
function resolveConfigValue(value, instance) {
  return typeof value === 'function' ? value(instance) : value;
}

/**
 * Read an <input type="date"> as a Date, or null when empty or unparseable.
 * `endOfDay` makes the "To" bound inclusive of the whole day picked.
 */
function readDateInput(selector, endOfDay) {
  const raw = $(selector).val();
  if (!raw) return null;

  const parsed = moment(raw, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) return null;

  return endOfDay ? parsed.endOf('day').toDate() : parsed.startOf('day').toDate();
}

/**
 * Which date an export can be filtered on, per entity.
 *
 * Tasks lead with the actual dates because the common question is "what was
 * worked on in this window" (e.g. billing last week's hours) — the baseline is
 * the plan, the actuals are what happened.
 */
export const TASK_DATE_FIELDS = [
  { value: 'actualStart', label: 'Actual start' },
  { value: 'actualFinish', label: 'Actual finish' },
  { value: 'baselineStart', label: 'Baseline start' },
  { value: 'baselineFinish', label: 'Baseline finish' }
];

export const TICKET_DATE_FIELDS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Last updated' }
];

export const DATE_FIELD_SETS = {
  task: TASK_DATE_FIELDS,
  ticket: TICKET_DATE_FIELDS
};

/**
 * Every element id an export control uses, derived from one `scope` name.
 *
 * The buttons, the options modal and the export run all resolve their ids
 * through here, so the markup and the page's export config can never drift
 * apart — a page only ever names its scope once.
 */
export function exportElementIds(scope) {
  return {
    excel: `${scope}ExportExcel`,
    pdf: `${scope}ExportPdf`,
    modal: `${scope}ExportModal`,
    title: `${scope}ExportModalTitle`,
    field: `${scope}ExportField`,
    fieldWrap: `${scope}ExportFieldWrap`,
    reportType: `${scope}ExportReportType`,
    from: `${scope}ExportFrom`,
    to: `${scope}ExportTo`,
    confirm: `${scope}ExportConfirm`
  };
}

/**
 * Which report shape the user picked, or `fallback` when the page renders no
 * report-type selector (every existing export control).
 */
export function readExportReportType(scope, fallback = null) {
  const ids = exportElementIds(scope);
  const $select = $(`#${ids.reportType}`);
  if (!$select.length) return fallback;
  return $select.val() || fallback;
}

/**
 * The range currently in an export dialog's date inputs, as Dates or nulls.
 * Exposed because a report that computes its rows server-side needs the range
 * itself, not the row-level filtering applyDateFilter() does with it.
 */
export function readExportDateRange(scope) {
  const ids = exportElementIds(scope);
  return {
    from: readDateInput(`#${ids.from}`, false),
    to: readDateInput(`#${ids.to}`, true)
  };
}

/**
 * Which date the user picked to filter on, falling back to the first option
 * when no selector is rendered.
 */
function resolveDateField(dateFilter, ids) {
  const options = dateFilter.fields || [];
  const selected = ids ? $(`#${ids.field}`).val() : null;
  const match = options.find(o => o.value === selected) || options[0];

  return match
    ? { key: match.value, label: match.label }
    : { key: dateFilter.field, label: dateFilter.label || 'Date' };
}

/**
 * Narrow rows to the range picked in the export date inputs.
 *
 * Returns the surviving rows plus a label describing the range, which is
 * appended to the PDF subtitle so an exported file always states the window it
 * covers. With no range picked the rows pass through untouched.
 *
 * @param {Array} rows
 * @param {Object} [dateFilter]
 * @param {Array}  [dateFilter.fields] selectable date bases, e.g. TASK_DATE_FIELDS
 * @param {String} [dateFilter.field]  fixed field name when there is no selector
 * @param {String} [dateFilter.label]  label for that fixed field
 * @param {Object} [ids]               element ids from exportElementIds()
 */
function applyDateFilter(rows, dateFilter, ids) {
  if (!dateFilter || !ids) return { rows, label: '', active: false };

  const from = readDateInput(`#${ids.from}`, false);
  const to = readDateInput(`#${ids.to}`, true);
  if (!from && !to) return { rows, label: '', active: false };

  const field = resolveDateField(dateFilter, ids);

  const filtered = rows.filter((row) => {
    const raw = row[field.key];
    if (!raw) return false; // undated rows can't be shown to fall inside a range

    const value = new Date(raw);
    if (isNaN(value.getTime())) return false;
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  });

  const label = `${field.label}: `
    + `${from ? moment(from).format('DD MMM YYYY') : 'any'}`
    + ` to ${to ? moment(to).format('DD MMM YYYY') : 'any'}`;

  return { rows: filtered, label, active: true };
}

/**
 * Handle one export button click end to end.
 *
 * Every page that offers an export does the same four things: resolve the rows
 * (sometimes via a server round-trip), bail out when there is nothing to
 * export, show a spinner on the clicked button, and report failures. Only the
 * column set and the row source differ, so pages describe just those.
 *
 * @param {'excel'|'pdf'} format
 * @param {Object} config
 * @param {String} [config.scope]              scope name of the export control (see exportElementIds)
 * @param {Array|Function} config.columns      column definitions (see module header), or a
 *                                             fn(instance) returning them — a control offering
 *                                             several report shapes picks per run
 * @param {Array|Function} config.rows         rows, or a fn(instance) returning rows or a Promise of rows
 * @param {String|Function} config.fileName    base file name, no extension
 * @param {String|Function} [config.sheetName] Excel sheet name (defaults to the title)
 * @param {String|Function} [config.title]     PDF heading
 * @param {String|Function} [config.subtitle]  PDF sub-heading, typically the active filters
 * @param {String} [config.button]             selector of the clicked button, for the spinner
 * @param {String} [config.emptyMessage]       toast shown when there is nothing to export
 * @param {Object|Function} [config.dateFilter] optional date-range narrowing, see applyDateFilter.
 *                                             As a function it may return null to skip row-level
 *                                             filtering for the selected report shape.
 * @param {Object} [instance]                  anything the page wants passed to every function-valued field
 * @returns {Promise<Boolean>} resolves true when a file was actually produced
 */
export function runTableExport(format, config, instance) {
  const spec = EXPORT_FORMATS[format];
  if (!spec) return Promise.reject(new Error(`Unknown export format: ${format}`));

  const ids = config.scope ? exportElementIds(config.scope) : null;
  const restoreButton = config.button
    ? showButtonLoader(config.button, `Preparing ${spec.label}...`)
    : () => {};

  return Promise.resolve()
    .then(() => resolveConfigValue(config.rows, instance))
    .then((rows) => {
      // Both are resolved per run, not per page: a control that offers several
      // report shapes picks its columns — and whether row-level date filtering
      // applies at all — from whichever the user selected.
      const columns = resolveConfigValue(config.columns, instance);
      const dateFilter = resolveConfigValue(config.dateFilter, instance);

      const dateRange = applyDateFilter(rows || [], dateFilter, ids);
      const records = dateRange.rows;

      if (!records.length) {
        // Distinguish "there is no data" from "your date range excluded it all",
        // otherwise an over-narrow range looks like an empty table.
        toastr.info(dateRange.active
          ? 'Nothing to export in the selected date range'
          : (config.emptyMessage || 'Nothing to export'));
        return false;
      }

      const title = resolveConfigValue(config.title, instance) || 'Export';
      const subtitle = [resolveConfigValue(config.subtitle, instance), dateRange.label]
        .filter(Boolean)
        .join('  |  ');

      return spec.run(columns, records, {
        fileName: resolveConfigValue(config.fileName, instance) || 'export',
        sheetName: resolveConfigValue(config.sheetName, instance) || title,
        title,
        subtitle
      }).then(() => true);
    })
    .catch((error) => {
      console.error(`${spec.label} export failed:`, error);
      // Surface the real reason: a bare "Failed to export" leaves both the user
      // and anyone debugging with nothing to go on.
      const reason = (error && (error.reason || error.message)) || 'Unknown error';
      toastr.error(`Failed to export ${spec.label} file: ${reason}`);
      return false;
    })
    .then((exported) => {
      restoreButton();
      return exported;
    });
}

/* ------------------------------------------------------------------ */
/* The click handling of one export control.                           */
/*                                                                     */
/* The old tableExportEvents(config) returned a Blaze event map. Here  */
/* the same steps are plain functions, called by the two components in */
/* components/exportButtons (TableExportButtons, TableExportModal).    */
/* ------------------------------------------------------------------ */

/** With a `dateFilter` the format buttons open the options modal instead of exporting at once. */
export function exportUsesModal(config) {
  return !!config.dateFilter;
}

/** Session key holding the format ('excel' | 'pdf') the user clicked for one export control. */
export function exportFormatKey(scope) {
  return `${scope}ExportFormat`;
}

/**
 * Open the options modal of an export control for one format.
 *
 * Which format the user clicked is kept per scope rather than in one shared
 * variable, so several export controls can coexist on one page.
 */
export function openExportModal(scope, format) {
  const ids = exportElementIds(scope);
  Session.set(exportFormatKey(scope), format);
  $(`#${ids.modal}`).modal('show');
}

/** A click on the Excel or PDF button of an export control. */
export function startTableExport(format, config, instance) {
  const ids = exportElementIds(config.scope);
  if (exportUsesModal(config)) return openExportModal(config.scope, format);
  runTableExport(format, Object.assign({ button: `#${ids[format]}` }, config), instance);
}

/** A click on the modal's confirm button. */
export function confirmTableExport(config, instance) {
  const ids = exportElementIds(config.scope);
  const format = Session.get(exportFormatKey(config.scope)) || 'excel';

  return runTableExport(format, Object.assign({ button: `#${ids.confirm}` }, config), instance)
    .then((exported) => {
      // Only close on success — a failed or empty export leaves the modal
      // open so the user can widen the range instead of starting over.
      if (exported) $(`#${ids.modal}`).modal('hide');
      return exported;
    });
}

/**
 * One-line summary of the filters that were active when the export ran, used
 * as the PDF subtitle. Entries with an empty value are dropped.
 *
 *   describeActiveFilters([{ label: 'Client', value: 'Acme' }, { label: 'Status', value: '' }])
 *   // => 'Client: Acme'
 */
export function describeActiveFilters(filters, fallback = 'All records') {
  const parts = (filters || [])
    .filter(f => f && f.value)
    .map(f => `${f.label}: ${f.value}`);
  return parts.length ? parts.join('  |  ') : fallback;
}
