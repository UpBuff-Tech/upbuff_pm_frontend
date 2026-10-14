import { requestListHelpers } from './utils';
import { backdatedRowClass } from './leaveRequestHelpers';
import LeaveTypeBadge from './LeaveTypeBadge';
import DayTypeBadge from './DayTypeBadge';
import RequestStatusBadge from './RequestStatusBadge';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const { formatDate, truncate, isPending, isApproved } = requestListHelpers;

// Content of the "My Requests" tab: the logged-in user's own leave / WFH requests.
export default function MyRequestsTab({ isLoading, requests, onNewRequest, onView, onEdit, onCancel, onCancelApproved }) {
  if (isLoading) {
    return (
      <TableSkeleton rows={5} columns={6} label="Loading requests…" />
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bx bx-calendar-x text-muted" style={{ fontSize: '48px' }}></i>
        <p className="text-muted mt-3">No leave requests found</p>
        <button type="button" className="btn btn-primary" id="newRequestBtnEmpty" onClick={onNewRequest}>
          <i className="bx bx-plus me-1"></i>Create Request
        </button>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Type</th>
            <th>Day Type</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request._id} className={backdatedRowClass(request)}>
              <td>
                <LeaveTypeBadge type={request.type} />
              </td>
              <td>
                <DayTypeBadge dayType={request.dayType} />
              </td>
              <td>{formatDate(request.fromDate)}</td>
              <td>{formatDate(request.toDate)}</td>
              <td>{request.totalDays}{request.lopDays > 0 && <span className="lop-badge" title="Loss of Pay: days beyond the flexi-holiday balance">{request.lopDays} LOP</span>}</td>
              <td>
                <span title={request.reason}>{truncate(request.reason, 30)}</span>
              </td>
              <td><RequestStatusBadge status={request.status} isBackdated={request.isBackdated} /></td>
              <td>
                <div className="leave-action-btns">
                  <button className="btn btn-sm btn-outline-primary viewRequestBtn" data-id={request._id}
                    onClick={(event) => onView(event, request._id)}>
                    <i className="bx bx-show"></i>
                  </button>
                  {isPending(request.status) && (
                    <>
                      <button className="btn btn-sm btn-outline-warning editRequestBtn" data-id={request._id} title="Edit Request"
                        onClick={(event) => onEdit(event, request._id)}>
                        <i className="bx bx-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger cancelRequestBtn" data-id={request._id}
                        onClick={(event) => onCancel(event, request._id)}>
                        <i className="bx bx-x"></i>
                      </button>
                    </>
                  )}
                  {isApproved(request.status) && (
                    <button className="btn btn-sm btn-outline-danger cancelMyApprovedBtn" data-id={request._id} title="Cancel Approved Request"
                      onClick={(event) => onCancelApproved(event, request._id)}>
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
  );
}
