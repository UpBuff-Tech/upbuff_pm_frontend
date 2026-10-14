import moment from 'moment';
import { getLeaveTypeLabel } from '../../lib/shared/leaveRequests';
import { displayStyle } from './utils';
import { isBackdatedApproved } from './leaveRequestHelpers';
import { DetailField, DetailHeader, DetailSection, Pill, StatTile } from '../../components/detailModal/DetailModal';
import { leaveTypeTone } from './ApprovalDetailModal';

const formatDay = (date) => moment(date).format('MMM DD, YYYY');
const formatTime = (date) => moment(date).format('MMM DD, YYYY HH:mm');

// Status pill of a request (same colours as RequestStatusBadge; approved backdated entries show "Backdated").
function StatusPill({ request }) {
  if (isBackdatedApproved(request)) return <Pill tone="purple" icon="bx-history">Backdated</Pill>;
  if (request.status === 'pending') return <Pill tone="amber" dot>Pending</Pill>;
  if (request.status === 'approved') return <Pill tone="green" dot>Approved</Pill>;
  if (request.status === 'cancelled') return <Pill tone="gray" dot>Cancelled</Pill>;
  return <Pill tone="red" dot>Rejected</Pill>;
}

// View Request Modal: details of one of the user's own requests (null until one is opened).
export default function ViewRequestModal({ request }) {
  const hasApprover = !!request && !!request.approvedBy;
  const isCancelled = !!request && request.status === 'cancelled' && !!request.cancelledBy;

  return (
    <div className="modal fade dm-modal" id="viewRequestModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader icon="bx-detail" tone={request ? leaveTypeTone(request.type) : 'indigo'} eyebrow="Request Details"
            title={<span id="viewType">{request ? getLeaveTypeLabel(request.type) : 'Request'}</span>}
            meta={request && (
              <>
                <span id="viewStatus"><StatusPill request={request} /></span>
                <span id="viewDayType">
                  {request.dayType === 'half' ? <Pill tone="gray">Half Day</Pill> : <Pill tone="indigo">Full Day</Pill>}
                </span>
              </>
            )} />

          <div className="modal-body p-0">
            <div className="dm-body">
              <div className="dm-stats">
                <StatTile icon="bx-calendar" tone="indigo" label="From Date"
                  value={<span id="viewFromDate">{request ? formatDay(request.fromDate) : '—'}</span>} />
                <StatTile icon="bx-calendar-check" tone="indigo" label="To Date"
                  value={<span id="viewToDate">{request ? formatDay(request.toDate) : '—'}</span>} />
                <StatTile icon="bx-time" tone="cyan" label="Total Days"
                  value={<span id="viewTotalDays">{request ? `${request.totalDays} day(s)` : '—'}</span>} />
                {request && request.lopDays > 0 && (
                  <StatTile icon="bx-error-circle" tone="red" label="Loss of Pay" value={`${request.lopDays} day(s)`}
                    sub="Beyond your flexi-holiday balance" />
                )}
              </div>

              <DetailSection title="Reason" icon="bx-message-detail">
                {request && request.reason ? (
                  <div className="dm-callout" id="viewReason">{request.reason}</div>
                ) : (
                  <div className="dm-value is-empty" id="viewReason">No reason given</div>
                )}
              </DetailSection>

              <div id="approverSection" style={displayStyle(hasApprover)}>
                <DetailSection title="Processed" icon="bx-check-shield">
                  <DetailField label="Processed By" icon="bx-user-check" id="viewApprover">
                    {hasApprover ? `${request.approvedByName} on ${formatTime(request.approvedAt)}` : ''}
                  </DetailField>
                  <div className="mt-3" id="remarksSection" style={displayStyle(hasApprover && !!request.approverRemarks)}>
                    <div className="dm-label">Remarks</div>
                    <div className="dm-callout" id="viewRemarks">{(hasApprover && request.approverRemarks) || '-'}</div>
                  </div>
                </DetailSection>
              </div>

              <div id="viewCancelSection" style={displayStyle(isCancelled)}>
                <DetailSection title="Cancellation" icon="bx-x-circle" className="dm-tone-red">
                  <DetailField label="Cancelled By" icon="bx-user-x" id="viewCancelledBy">
                    {isCancelled
                      ? `${request.cancelledByName || '-'} on ${request.cancelledAt ? formatTime(request.cancelledAt) : '-'}`
                      : ''}
                  </DetailField>
                  <div className="mt-3" id="viewCancelRemarksSection" style={displayStyle(isCancelled && !!request.cancelRemarks)}>
                    <div className="dm-label">Cancellation Reason</div>
                    <div className="dm-callout dm-tone-red" id="viewCancelRemarks">{(isCancelled && request.cancelRemarks) || '-'}</div>
                  </div>
                </DetailSection>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
