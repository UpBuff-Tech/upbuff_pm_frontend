/**
 * The "loading" and "no data" cards shown instead of a report table
 * (same markup in the Employee Task Report and the Client Task Report).
 */

import { TableSkeleton } from '../../components/skeleton/Skeleton';

export function ReportLoading() {
  return (
    <div className="card">
      <div className="card-body">
        <TableSkeleton rows={8} columns={6} label="Loading report data…" />
      </div>
    </div>
  );
}

export function ReportEmptyState({ message }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-center py-5">
          <i className="bx bx-file display-1 text-muted"></i>
          <h5 className="mt-3">No Data Found</h5>
          <p className="text-muted">
            {message ? message : 'Please select filters and generate the report.'}
          </p>
        </div>
      </div>
    </div>
  );
}
