import moment from 'moment';
import { displayStyle } from './utils';
import { isBackdatedApproved } from './leaveRequestHelpers';
import { DetailField, DetailGrid, DetailSection, Pill } from '../../components/detailModal/DetailModal';
import { RequestDetailBody, RequestDetailHeader } from './ApprovalDetailModal';

// Status pill of a processed request.
function ProcessedStatusPill({ request }) {
  if (isBackdatedApproved(request)) return <Pill tone="purple" icon="bx-history">Backdated</Pill>;
  if (request.status === 'approved') return <Pill tone="green" dot>Approved</Pill>;
  if (request.status === 'cancelled') return <Pill tone="gray" dot>Cancelled</Pill>;
  return <Pill tone="red" dot>Rejected</Pill>;
}

const formatProcessedTime = (date) => (date ? moment(date).format('MMM DD, YYYY HH:mm') : '');

// Approved Item Detail View Modal: a processed request with its approval / cancellation details.
export default function ApprovedItemDetailModal({ request }) {
  const isCancelled = !!request && request.status === 'cancelled';

  return (
    <div className="modal fade dm-modal" id="approvedItemDetailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <RequestDetailHeader idPrefix="approvedItem" request={request} eyebrow="Request Details"
            status={request ? <span id="approvedItemStatus"><ProcessedStatusPill request={request} /></span> : null} />

          <div className="modal-body p-0">
            <div className="dm-body">
              <RequestDetailBody idPrefix="approvedItem" request={request} />

              {/* Approval Info */}
              <div id="approvedItemApprovalSection">
                <DetailSection title="Approval Information" icon="bx-check-shield">
                  <DetailGrid>
                    <DetailField label="Processed By" icon="bx-user-check" id="approvedItemProcessedBy">
                      {(request && request.approvedByName) || ''}
                    </DetailField>
                    <DetailField label="Processed On" icon="bx-time-five" id="approvedItemProcessedOn">
                      {request ? formatProcessedTime(request.approvedAt) : ''}
                    </DetailField>
                  </DetailGrid>
                  <div className="mt-3" id="approvedItemRemarksSection" style={displayStyle(!request || !!request.approverRemarks)}>
                    <div className="dm-label">Remarks</div>
                    <div className="dm-callout dm-tone-green" id="approvedItemRemarks">{(request && request.approverRemarks) || '-'}</div>
                  </div>
                </DetailSection>
              </div>

              {/* Cancellation Info */}
              <div id="approvedItemCancelSection" style={displayStyle(isCancelled)}>
                <DetailSection title="Cancellation Information" icon="bx-x-circle" className="dm-tone-red">
                  <DetailGrid>
                    <DetailField label="Cancelled By" icon="bx-user-x" id="approvedItemCancelledBy">
                      {(isCancelled && request.cancelledByName) || ''}
                    </DetailField>
                    <DetailField label="Cancelled On" icon="bx-time-five" id="approvedItemCancelledOn">
                      {isCancelled ? formatProcessedTime(request.cancelledAt) : ''}
                    </DetailField>
                  </DetailGrid>
                  <div className="mt-3" id="approvedItemCancelRemarksSection" style={displayStyle(!isCancelled || !!request.cancelRemarks)}>
                    <div className="dm-label">Cancellation Reason</div>
                    <div className="dm-callout dm-tone-red" id="approvedItemCancelRemarks">{(isCancelled && request.cancelRemarks) || '-'}</div>
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
