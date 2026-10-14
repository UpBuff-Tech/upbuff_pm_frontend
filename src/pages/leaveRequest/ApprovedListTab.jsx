import { requestListHelpers } from './utils';
import { backdatedRowClass } from './leaveRequestHelpers';
import LeaveTypeBadge from './LeaveTypeBadge';
import DayTypeBadge from './DayTypeBadge';
import RequestStatusBadge from './RequestStatusBadge';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const { formatDate, formatDateTime, truncate, isApproved } = requestListHelpers;

// Content of the "Approved List" tab (approvers): processed requests with their filters.
export default function ApprovedListTab({ isLoading, requests, filter, employees, onFilterChange, onClearFilters, onView, onCancel }) {
  return (
    <>
      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-md-3">
          <label className="form-label small text-muted">Status</label>
          <select className="form-select" id="approvedListFilter" value={filter.status}
            onChange={(event) => onFilterChange({ status: event.currentTarget.value })}>
            <option value="">All Status</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted">Month</label>
          <input type="month" className="form-control" id="approvedListMonthFilter" value={filter.month}
            onChange={(event) => onFilterChange({ month: event.currentTarget.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted">Employee</label>
          <select className="form-select" id="approvedListEmployeeFilter" value={filter.userId}
            onChange={(event) => onFilterChange({ userId: event.currentTarget.value })}>
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>{employee.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-outline-secondary" id="clearApprovedListFilters" title="Clear Filters" onClick={onClearFilters}>
            <i className="bx bx-reset me-1"></i>Clear
          </button>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton rows={5} columns={6} label="Loading approved requests…" />
      ) : requests.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Day Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Processed By</th>
                <th>Processed On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item._id} className={backdatedRowClass(item)}>
                  <td>{item.userName}</td>
                  <td>
                    <LeaveTypeBadge type={item.type} />
                  </td>
                  <td>
                    <DayTypeBadge dayType={item.dayType} />
                  </td>
                  <td>{formatDate(item.fromDate)}</td>
                  <td>{formatDate(item.toDate)}</td>
                  <td>{item.totalDays}{item.lopDays > 0 && <span className="lop-badge" title="Loss of Pay: days beyond the flexi-holiday balance">{item.lopDays} LOP</span>}</td>
                  <td>
                    <span title={item.reason}>{truncate(item.reason, 30)}</span>
                  </td>
                  <td><RequestStatusBadge status={item.status} isBackdated={item.isBackdated} /></td>
                  <td>{item.approvedByName}</td>
                  <td>{formatDateTime(item.approvedAt)}</td>
                  <td>
                    <div className="leave-action-btns">
                      <button className="btn btn-sm btn-outline-primary viewApprovedItemBtn" data-id={item._id} title="View Details"
                        onClick={(event) => onView(event, item._id)}>
                        <i className="bx bx-show"></i>
                      </button>
                      {isApproved(item.status) && (
                        <button className="btn btn-sm btn-outline-danger cancelApprovedBtn" data-id={item._id} title="Cancel"
                          onClick={(event) => onCancel(event, item._id)}>
                          <i className="bx bx-x"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-5">
          <i className="bx bx-history text-muted" style={{ fontSize: '48px' }}></i>
          <p className="text-muted mt-3">No approved or rejected requests found</p>
        </div>
      )}
    </>
  );
}
