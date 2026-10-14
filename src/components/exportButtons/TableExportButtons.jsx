/**
 * The reusable Excel + PDF button pair used by every page that offers a table export
 * (the old `tableExportButtons` template).
 *
 *   <TableExportButtons scope="ticket" config={ticketExport} />
 *   <TableExportButtons scope="projectTasks" size="btn-sm" wrapperClass="ms-auto" config={formTasksExport} />
 *
 * `config` is the export description the old page passed to tableExportEvents()
 * (see lib/tableExport.js). With a `dateFilter` in it the buttons open the matching
 * <TableExportModal>; without one they export immediately.
 */
import { exportElementIds, startTableExport } from '../../lib/tableExport';

export default function TableExportButtons({ scope, size = '', wrapperClass = '', config, instance }) {
  const ids = exportElementIds(scope);
  const exportConfig = Object.assign({}, config, { scope });

  return (
    <div className={`d-flex gap-2 align-items-center flex-wrap ${wrapperClass}`}>
      <button type="button" className={`btn btn-outline-success ${size}`} id={ids.excel} title="Export to Excel"
        onClick={() => startTableExport('excel', exportConfig, instance)}>
        <i className="bx bx-spreadsheet me-1"></i>Excel
      </button>
      <button type="button" className={`btn btn-outline-danger ${size}`} id={ids.pdf} title="Export to PDF"
        onClick={() => startTableExport('pdf', exportConfig, instance)}>
        <i className="bx bxs-file-pdf me-1"></i>PDF
      </button>
    </div>
  );
}
