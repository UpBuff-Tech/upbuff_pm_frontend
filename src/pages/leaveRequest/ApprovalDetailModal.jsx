import moment from 'moment';
import { getLeaveTypeLabel } from '../../lib/shared/leaveRequests';
import { DetailHeader, DetailSection, Pill, StatTile } from '../../components/detailModal/DetailModal';

// Leave type -> pill tone (same colours as the solid type badges: leave amber, WFH cyan, optional green).
const LEAVE_TYPE_TONE = { leave: 'amber', wfh: 'cyan', optional: 'green' };
export const leaveTypeTone = (type) => LEAVE_TYPE_TONE[type] || LEAVE_TYPE_TONE.leave;

/**
 * Employee header shared by the two large detail modals (pending approval and processed request).
 * `idPrefix` keeps each modal's own element ids ("detail..." / "approvedItem..."); `status` is the status pill.
 */
export function RequestDetailHeader({ idPrefix, request, eyebrow, status }) {
  const name = (request && request.userName) || '';
  return (
    <DetailHeader avatar={name || 'U'} round tone={request ? leaveTypeTone(request.type) : 'amber'} eyebrow={eyebrow}
      title={name || 'Unknown employee'} titleId={idPrefix + 'EmployeeName'}
      meta={(
        <>
          <span id={idPrefix + 'TypeBadge'}>
            <Pill tone={request ? leaveTypeTone(request.type) : 'amber'}>{request ? getLeaveTypeLabel(request.type) : 'Leave'}</Pill>
          </span>
          {status}
          <span className="dm-meta" id={idPrefix + 'EmployeeEmail'}>
            <i className="bx bx-envelope"></i>{(request && request.userEmail) || 'No email'}
          </span>
        </>
      )} />
  );
}

/** Date tiles + reason of a request, shared by the two large detail modals. */
export function RequestDetailBody({ idPrefix, request }) {
  return (
    <>
      <div className="dm-stats">
        <StatTile icon="bx-calendar" tone="indigo" label="From Date"
          value={<span id={idPrefix + 'FromDate'}>{request ? moment(request.fromDate).format('ddd, MMM DD, YYYY') : '—'}</span>} />
        <StatTile icon="bx-calendar-check" tone="indigo" label="To Date"
          value={<span id={idPrefix + 'ToDate'}>{request ? moment(request.toDate).format('ddd, MMM DD, YYYY') : '—'}</span>} />
        <StatTile icon="bx-time" tone="cyan" label="Total Days"
          value={<span id={idPrefix + 'TotalDays'}>{request ? `${request.totalDays} day(s)` : '—'}</span>}
          sub={<span id={idPrefix + 'DayType'}>{request ? (request.dayType === 'half' ? 'Half Day' : 'Full Day') : ''}</span>} />
        <StatTile icon="bx-calendar-plus" tone="gray" label="Requested On"
          value={<span id={idPrefix + 'RequestedOn'}>{request ? moment(request.createdAt).format('MMM DD, YYYY HH:mm') : '—'}</span>} />
        {request && request.lopDays > 0 && (
          <StatTile icon="bx-error-circle" tone="red" label="Loss of Pay" value={`${request.lopDays} day(s)`}
            sub="Beyond the flexi-holiday balance" />
        )}
      </div>

      <DetailSection title="Reason" icon="bx-message-detail">
        {request && request.reason ? (
          <div className="dm-callout" id={idPrefix + 'Reason'}>{request.reason}</div>
        ) : (
          <div className="dm-value is-empty" id={idPrefix + 'Reason'}>No reason given</div>
        )}
      </DetailSection>
    </>
  );
}

/**
 * Approval Detail View Modal: a pending request with remarks and Approve / Reject.
 * `busyAction` is 'approve' or 'reject' while that server call is running.
 */
export default function ApprovalDetailModal({ request, remarks, busyAction, onRemarksChange, onApprove, onReject }) {
  return (
    <div className="modal fade dm-modal" id="approvalDetailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <RequestDetailHeader idPrefix="detail" request={request} eyebrow="Leave Request"
            status={<Pill tone="amber" dot>Pending</Pill>} />

          <div className="modal-body p-0">
            <div className="dm-body">
              <RequestDetailBody idPrefix="detail" request={request} />

              {/* Remarks Input */}
              <DetailSection title="Remarks (Optional)" icon="bx-comment-detail">
                <label className="visually-hidden" htmlFor="detailRemarks">Remarks (Optional)</label>
                <textarea className="form-control" id="detailRemarks" rows="2" placeholder="Enter any remarks for this request..."
                  value={remarks} onChange={(event) => onRemarksChange(event.currentTarget.value)}></textarea>
              </DetailSection>
              <input type="hidden" id="detailRequestId" value={request ? request._id : ''} />
            </div>
          </div>
          <div className="dm-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" className="btn btn-danger" id="detailRejectBtn" disabled={busyAction === 'reject'} onClick={onReject}>
              {busyAction === 'reject' ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Rejecting...</>
              ) : (
                <><i className="bx bx-x me-1"></i>Reject</>
              )}
            </button>
            <button type="button" className="btn btn-success" id="detailApproveBtn" disabled={busyAction === 'approve'} onClick={onApprove}>
              {busyAction === 'approve' ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Approving...</>
              ) : (
                <><i className="bx bx-check me-1"></i>Approve</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
