import { DetailHeader, DetailSection, Pill, StatTile } from '../../components/detailModal/DetailModal';

// Bootstrap badge class -> pill tone.
const BADGE_TONE = { 'bg-success': 'green', 'bg-warning': 'amber', 'bg-danger': 'red', 'bg-info': 'cyan', 'bg-primary': 'indigo', 'bg-secondary': 'gray' };

// One "location + View on Map" field of the attendance detail modal.
function PunchLocation({ label, textId, linkId, location, isOpened }) {
  return (
    <div className="dm-field">
      <div className="dm-label"><i className="bx bx-map-pin"></i>{label}</div>
      <div id={textId} className={'dm-value' + (location ? '' : ' is-empty')}>{location ? location.text : (isOpened ? 'Not available' : '-')}</div>
      <a href={location ? location.mapUrl : '#'} id={linkId} className="btn btn-sm btn-outline-primary mt-2" target="_blank"
        style={location ? {} : { display: 'none' }}>
        <i className="bx bx-map me-1"></i>View on Map
      </a>
    </div>
  );
}

/**
 * Attendance Detail Modal. `detail` comes from describeAttendance(record); null until an event was clicked.
 */
export default function AttendanceDetailModal({ detail }) {
  const isOpened = !!detail;
  const shown = detail || {};

  return (
    <div className="modal fade dm-modal" id="attendanceDetailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader avatar={shown.employee || 'Attendance'} round eyebrow="Attendance Details" tone="indigo"
            title={shown.employee || 'Unknown employee'} titleId="attendanceDetailEmployee"
            meta={(
              <>
                <span className="dm-meta" id="attendanceDetailDate"><i className="bx bx-calendar"></i>{shown.date || '-'}</span>
                <span id="attendanceDetailOnTime">
                  {shown.onTime ? <Pill tone={BADGE_TONE[shown.onTime.badgeClass] || 'gray'} dot>{shown.onTime.text}</Pill> : null}
                </span>
              </>
            )}>
            <button type="button" className="btn btn-sm btn-warning" id="revokeAttendancePunchOutBtn" style={{ display: 'none' }}>
              <i className="bx bx-undo me-1"></i>Revoke Punch Out
            </button>
          </DetailHeader>

          <div className="modal-body p-0">
            <div className="dm-body">
              <div className="dm-stats">
                <StatTile icon="bx-log-in-circle" tone="green" label="Punch In Time"
                  value={<span id="attendanceDetailPunchIn">{shown.punchIn || '—'}</span>} />
                <StatTile icon="bx-log-out-circle" tone="red" label="Punch Out Time"
                  value={<span id="attendanceDetailPunchOut">{shown.punchOut || '—'}</span>} />
                <StatTile icon="bx-time-five" tone="indigo" label="Total Hours Worked"
                  value={<span id="attendanceDetailTotalHours">{shown.totalHours || '—'}</span>} />
              </div>

              <DetailSection title="Locations" icon="bx-map">
                <div className="dm-grid">
                  <PunchLocation label="Punch In Location" textId="attendanceDetailPunchInLocation" linkId="viewPunchInMap"
                    location={shown.punchInLocation} isOpened={isOpened} />
                  <PunchLocation label="Punch Out Location" textId="attendanceDetailPunchOutLocation" linkId="viewPunchOutMap"
                    location={shown.punchOutLocation} isOpened={isOpened} />
                </div>
              </DetailSection>

              {/* Revoke History (audit log) */}
              <div id="attendanceDetailRevokeHistoryWrap" style={{ display: 'none' }}>
                <DetailSection title="Punch-Out Revoke History" icon="bx-history">
                  <ul id="attendanceDetailRevokeHistory" className="list-group list-group-flush small"></ul>
                </DetailSection>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
