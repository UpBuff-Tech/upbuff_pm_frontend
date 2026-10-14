import { DetailHeader, DetailSection, Pill, StatTile } from '../../components/detailModal/DetailModal';

// Bootstrap badge class -> pill / header tone.
const BADGE_TONE = { 'bg-success': 'green', 'bg-warning': 'amber', 'bg-danger': 'red', 'bg-info': 'cyan', 'bg-primary': 'indigo', 'bg-secondary': 'gray' };

/**
 * Leave Detail Modal (also used for absent days). `detail` comes from
 * describeLeave(leave) / describeAbsent(absent); null until an event was clicked.
 */
export default function LeaveDetailModal({ detail }) {
  const tone = detail ? BADGE_TONE[detail.badgeClass] || 'gray' : 'red';

  return (
    <div className="modal fade dm-modal" id="leaveDetailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader icon="bx-calendar-x" tone={tone} eyebrow="Leave/WFH Details"
            title={detail ? detail.employee : 'Unknown employee'} titleId="leaveDetailEmployee"
            meta={detail && <span id="leaveDetailType"><Pill tone={tone} dot>{detail.badgeText}</Pill></span>} />

          <div className="modal-body p-0">
            <div className="dm-body">
              <div className="dm-stats">
                <StatTile icon="bx-calendar" tone={tone} label="From"
                  value={<span id="leaveDetailFromDate">{detail ? detail.fromDate : '—'}</span>} />
                <StatTile icon="bx-calendar-check" tone={tone} label="To"
                  value={<span id="leaveDetailToDate">{detail ? detail.toDate : '—'}</span>} />
              </div>

              <DetailSection title="Reason" icon="bx-message-detail">
                {detail && detail.reason && detail.reason !== '-' ? (
                  <div className={'dm-callout dm-tone-' + tone} id="leaveDetailReason">{detail.reason}</div>
                ) : (
                  <div className="dm-value is-empty" id="leaveDetailReason">No reason given</div>
                )}
              </DetailSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
