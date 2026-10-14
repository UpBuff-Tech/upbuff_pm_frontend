import { requestListHelpers } from './utils';
import LeaveTypeBadge from './LeaveTypeBadge';
import DayTypeBadge from './DayTypeBadge';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const { formatDate, formatDateTime, truncate } = requestListHelpers;

// Content of the "Pending Approvals" tab (approvers): requests waiting for a decision.
export default function PendingApprovalsTab({ isLoading, requests, onView, onApprove, onReject }) {
  if (isLoading) {
    return (
      <TableSkeleton rows={5} columns={6} label="Loading pending approvals…" />
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bx bx-check-circle text-success" style={{ fontSize: '48px' }}></i>
        <p className="text-muted mt-3">No pending approvals</p>
      </div>
    );
  }

  return (
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
            <th>Requested On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((log) => (
            <tr key={log._id}>
              <td>{log.userName}</td>
              <td>
                <LeaveTypeBadge type={log.type} />
              </td>
              <td>
                <DayTypeBadge dayType={log.dayType} />
              </td>
              <td>{formatDate(log.fromDate)}</td>
              <td>{formatDate(log.toDate)}</td>
              <td>{log.totalDays}{log.lopDays > 0 && <span className="lop-badge" title="Loss of Pay: days beyond the flexi-holiday balance">{log.lopDays} LOP</span>}</td>
              <td>
                <span title="">{truncate(log.reason, 30)}</span>
              </td>
              <td>{formatDateTime(log.createdAt)}</td>
              <td>
                <div className="leave-action-btns">
                  <button className="btn btn-sm btn-outline-primary viewApprovalBtn" data-id={log._id} title="View Details"
                    onClick={(event) => onView(event, log._id)}>
                    <i className="bx bx-show"></i>
                  </button>
                  <button className="btn btn-sm btn-success approveBtn" data-id={log._id} title="Approve"
                    onClick={(event) => onApprove(event, log._id)}>
                    <i className="bx bx-check"></i>
                  </button>
                  <button className="btn btn-sm btn-danger rejectBtn" data-id={log._id} title="Reject"
                    onClick={(event) => onReject(event, log._id)}>
                    <i className="bx bx-x"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
