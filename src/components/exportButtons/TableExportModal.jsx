/**
 * The date-range dialog of an export control (the old `tableExportModal` template).
 *
 *   <TableExportModal scope="ticket" dateFields="ticket" config={ticketExport} />
 *   <TableExportModal scope="projectTasks" dateFields="task" reportTypes="taskHours" config={formTasksExport} />
 *
 * The modal is a separate component because it must sit at the page's top level:
 * Bootstrap misbehaves when a modal is nested inside another modal's markup,
 * and several of these controls live inside an already-open modal.
 *
 * `config` is the same export description given to <TableExportButtons>; the
 * export runs when the user confirms. The date shortcuts are handled here, since
 * "last 7 days" means the same thing everywhere.
 */
import { useState } from 'react';
import moment from 'moment';
import {
  DATE_FIELD_SETS,
  EXPORT_FORMATS,
  confirmTableExport,
  exportElementIds,
  exportFormatKey
} from '../../lib/tableExport';
import { TASK_HOURS_REPORT_TYPES } from '../../lib/taskDailyHours';
import { useSession } from '../../lib/session';

/**
 * Report shapes a control can offer, named the same way as the date field
 * sets. A page that names no set gets no selector and behaves exactly as it
 * did before the option existed.
 */
const REPORT_TYPE_SETS = {
  taskHours: TASK_HOURS_REPORT_TYPES
};

const INPUT_DATE_FORMAT = 'YYYY-MM-DD';

export default function TableExportModal({ scope, dateFields, reportTypes, config, instance }) {
  const ids = exportElementIds(scope);

  /**
   * Date bases offered in the dropdown. Pages name a set ("task", "ticket")
   * rather than passing an array, so the option lists stay defined next to the
   * filtering logic that consumes them.
   */
  const dateFieldOptions = DATE_FIELD_SETS[dateFields] || [];

  /**
   * Report shapes offered, or nothing — which is what keeps the selector out
   * of every export dialog that has only ever had one shape.
   */
  const reportTypeOptions = REPORT_TYPE_SETS[reportTypes] || null;

  const [reportType, setReportType] = useState(reportTypeOptions ? reportTypeOptions[0].value : '');
  const [field, setField] = useState(dateFieldOptions.length ? dateFieldOptions[0].value : '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Which format button opened the modal ('excel' | 'pdf'); nothing until the first click.
  const format = useSession(exportFormatKey(scope));
  const spec = format ? EXPORT_FORMATS[format] : null;

  /**
   * "Filter by" chooses which task date the rows are narrowed on, which only
   * means anything for a per-task report. A date-wise report is already one
   * row per day, and its date inputs pick the range the hours are summed over,
   * so the selector is hidden rather than left there implying it does something.
   */
  const hideField = !!reportTypeOptions && reportType === 'dateWise';

  const setRange = (fromDate, toDate) => {
    setFrom(fromDate ? fromDate.format(INPUT_DATE_FORMAT) : '');
    setTo(toDate ? toDate.format(INPUT_DATE_FORMAT) : '');
  };

  // "Last N days" counts back from today inclusive, so 7 days is today plus
  // the six before it — what people mean by "the last week".
  const selectLastDays = (event, days) => {
    event.preventDefault();
    setRange(moment().subtract(days - 1, 'days'), moment());
  };

  const selectLastMonth = (event) => {
    event.preventDefault();
    const lastMonth = moment().subtract(1, 'month');
    setRange(lastMonth.clone().startOf('month'), lastMonth.clone().endOf('month'));
  };

  const clearRange = (event) => {
    event.preventDefault();
    setRange(null, null);
  };

  const confirm = () => {
    confirmTableExport(Object.assign({}, config, { scope }), instance);
  };

  return (
    <div className="modal fade" id={ids.modal} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id={ids.title}>{spec ? `Export to ${spec.label}` : 'Export'}</h5>
            <button type="button" className="close btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-3">
              Pick a date range to export only what falls inside it. Leave the dates blank to export everything.
            </p>

            {reportTypeOptions && (
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor={ids.reportType}>Report type</label>
                <select className="form-select" id={ids.reportType} value={reportType}
                  onChange={(event) => setReportType(event.target.value)}>
                  {reportTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3" id={ids.fieldWrap} style={hideField ? { display: 'none' } : undefined}>
              <label className="form-label fw-semibold" htmlFor={ids.field}>Filter by</label>
              <select className="form-select" id={ids.field} value={field}
                onChange={(event) => setField(event.target.value)}>
                {dateFieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label fw-semibold" htmlFor={ids.from}>From</label>
                <input type="date" className="form-control" id={ids.from} value={from}
                  onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold" htmlFor={ids.to}>To</label>
                <input type="date" className="form-control" id={ids.to} value={to}
                  onChange={(event) => setTo(event.target.value)} />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-secondary export-date-preset" data-days="7"
                data-from={ids.from} data-to={ids.to} onClick={(event) => selectLastDays(event, 7)}>Last 7 days</button>
              <button type="button" className="btn btn-sm btn-outline-secondary export-date-preset" data-days="30"
                data-from={ids.from} data-to={ids.to} onClick={(event) => selectLastDays(event, 30)}>Last 30 days</button>
              <button type="button" className="btn btn-sm btn-outline-secondary export-date-preset" data-month="last"
                data-from={ids.from} data-to={ids.to} onClick={selectLastMonth}>Last month</button>
              <button type="button" className="btn btn-sm btn-outline-secondary export-date-clear"
                data-from={ids.from} data-to={ids.to} onClick={clearRange}>Clear</button>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" data-dismiss="modal">Cancel</button>
            <button type="button" className={`btn ${format === 'pdf' ? 'btn-outline-danger' : 'btn-outline-success'}`}
              id={ids.confirm} onClick={confirm}>
              {spec ? (
                <>
                  <i className={`bx ${format === 'pdf' ? 'bxs-file-pdf' : 'bx-spreadsheet'} me-1`}></i>Export {spec.label}
                </>
              ) : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
