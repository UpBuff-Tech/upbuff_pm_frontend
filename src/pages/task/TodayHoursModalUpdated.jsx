/**
 * Today's Working Hours breakdown modal — fetches the day's sessions and
 * adjustments via taskSessions.getMyDayBreakdown. The running session's
 * duration ticks live off the board's shared timer tick (the board re-renders
 * this modal every second).
 *
 *   <TodayHoursModalUpdated board={board} openRef={todayHoursModalRef} />
 *
 * The page opens it by calling `openRef.current()` (the banner click).
 * From `board` it only needs `userMap` (names in the Adjustments table).
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';

import api from '../../api/client';
import { formatSeconds, formatHoursMinutesSeconds, userFullName } from './updatedTaskUtils';

// A gap between two sessions shorter than this is treated as task-switching
// friction and not shown; anything longer renders as a break row.
const BREAK_MIN_GAP_SECONDS = 5 * 60;

const CLOSED_BY_LABELS = {
  stop: 'Stopped',
  user: 'Stopped',
  restart: 'Restarted',
  pause: 'Stopped',
  status_change: 'Status change',
  punch_out: 'Punch out',
  logout: 'Logout',
  day_rollover: 'Day end',
  client_log: 'Restored log',
  stale_flush: 'Auto-stopped',
  stale_cron: 'Auto-stopped',
  cleared: 'Cleared',
  migrated: 'Migrated'
};

/**
 * Sessions interleaved with derived break rows: a break appears wherever
 * the gap between one session's stop and the next session's start exceeds
 * BREAK_MIN_GAP_SECONDS. Breaks are display-only — nothing is stored.
 */
function buildSessionRows(sessions) {
  const rows = [];

  sessions.forEach((session, index) => {
    if (index > 0) {
      const previous = sessions[index - 1];
      if (previous.stoppedAt && session.startedAt) {
        const gapSeconds = Math.floor(
          (new Date(session.startedAt).getTime() - new Date(previous.stoppedAt).getTime()) / 1000
        );
        if (gapSeconds >= BREAK_MIN_GAP_SECONDS) {
          const minutes = Math.floor(gapSeconds / 60);
          const label = minutes >= 60
            ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
            : `${minutes} min`;
          rows.push({ isBreak: true, label });
        }
      }
    }
    rows.push({ isBreak: false, session });
  });

  return rows;
}

function isRunningSession(session) {
  return session.status === 'running';
}

function isVoided(session) {
  return session.status === 'voided';
}

function timeOf(date) {
  return date ? moment(date).format('hh:mm:ss A') : '-';
}

function sessionDuration(session) {
  if (session.status === 'running') {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    return formatSeconds(Math.min(elapsed, 8 * 60 * 60));
  }
  return formatSeconds(session.seconds || 0);
}

function closedByLabel(session) {
  if (session.status === 'running') return '';
  if (session.status === 'voided') return 'Voided';
  return CLOSED_BY_LABELS[session.closedBy] || session.closedBy || '-';
}

function adjustmentAmount(adjustment) {
  const seconds = adjustment.seconds || 0;
  const sign = seconds < 0 ? '-' : '+';
  return `${sign}${formatSeconds(Math.abs(seconds))}`;
}

function adjustmentClass(adjustment) {
  return (adjustment.seconds || 0) < 0 ? 'text-danger' : 'text-success';
}

export default function TodayHoursModalUpdated({ board, openRef }) {
  const isActiveRef = useRef(true);

  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);

  const open = () => {
    setLoading(true);
    setBreakdown(null);
    $('#todayHoursModal').modal('show');
    api.call('taskSessions.getMyDayBreakdown', null, (error, result) => {
      if (!isActiveRef.current) return;
      setLoading(false);
      if (error) {
        toastr.error(error.reason || 'Failed to load breakdown');
        return;
      }
      setBreakdown(result);
    });
  };

  // Hand the "open" function to the page.
  useEffect(() => {
    if (openRef) openRef.current = open;
  });

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      if (openRef) openRef.current = null;
    };
  }, []);

  const breakdownDay = breakdown ? moment(breakdown.day).format('MMM DD, YYYY') : moment().format('MMM DD, YYYY');
  const sessionRows = buildSessionRows((breakdown && breakdown.sessions) || []);
  const hasSessions = !!(breakdown && breakdown.sessions && breakdown.sessions.length);
  const adjustments = (breakdown && breakdown.adjustments) || [];
  const hasAdjustments = !!(breakdown && breakdown.adjustments && breakdown.adjustments.length);

  const adjustedByName = (adjustment) => {
    if (!board || !adjustment.byUserId) return '-';
    const user = (board.userMap || {})[adjustment.byUserId];
    if (!user) return '-';
    return userFullName(user) || '-';
  };

  const breakdownTotal = () => {
    if (!breakdown) return '0h 0m 0s';
    let totalSeconds = breakdown.totalSeconds;
    // While a timer runs, tick the total forward from the fetch anchor so the
    // footer keeps pace with the banner.
    if (breakdown.isRunning) {
      totalSeconds += Math.max(0, Math.floor((Date.now() - breakdown.serverNow) / 1000));
    }
    return formatHoursMinutesSeconds(totalSeconds);
  };

  return (
    <div className="modal fade" id="todayHoursModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header bg-gradient-primary text-white">
            <h5 className="modal-title mb-0 fw-bold">
              <i className="fa fa-clock-o me-2"></i>Today&apos;s Working Hours — {breakdownDay}
            </h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Section 1: Sessions */}
                <h6 className="fw-bold mb-2"><i className="fa fa-play-circle me-1 text-primary"></i>Sessions</h6>
                {hasSessions ? (
                  <div className="table-responsive mb-4">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead>
                        <tr className="text-muted small">
                          <th>Task</th>
                          <th>Started</th>
                          <th>Stopped</th>
                          <th className="text-end">Duration</th>
                          <th>Stop Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionRows.map((row, index) => (row.isBreak ? (
                          <tr key={index}>
                            <td colSpan="5" className="text-center text-muted small py-1"
                              style={{ backgroundColor: 'rgb(199, 239, 255)' }}>
                              <i className="fa fa-coffee me-1"></i>Break ({row.label})
                            </td>
                          </tr>
                        ) : (
                          <tr key={index} className={isVoided(row.session) ? 'text-muted text-decoration-line-through' : ''}>
                            <td className="small">{row.session.taskName}</td>
                            <td className="small">{timeOf(row.session.startedAt)}</td>
                            <td className="small">
                              {isRunningSession(row.session)
                                ? <span className="badge bg-success">running</span>
                                : timeOf(row.session.stoppedAt)}
                            </td>
                            <td className="small text-end fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessionDuration(row.session)}</td>
                            <td className="small">{closedByLabel(row.session)}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-4">No sessions today</p>
                )}

                {/* Section 2: Adjustments */}
                <h6 className="fw-bold mb-2"><i className="fa fa-sliders me-1 text-warning"></i>Adjustments</h6>
                {hasAdjustments ? (
                  <div className="table-responsive mb-2">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead>
                        <tr className="text-muted small">
                          <th>Task</th>
                          <th>Reason</th>
                          <th>By</th>
                          <th>At</th>
                          <th className="text-end">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((adjustment, index) => (
                          <tr key={index}>
                            <td className="small">{adjustment.taskName}</td>
                            <td className="small">{adjustment.reason}</td>
                            <td className="small">{adjustedByName(adjustment)}</td>
                            <td className="small">{timeOf(adjustment.createdAt)}</td>
                            <td className={`small text-end fw-bold ${adjustmentClass(adjustment)}`}
                              style={{ fontVariantNumeric: 'tabular-nums' }}>{adjustmentAmount(adjustment)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-2">No adjustments today</p>
                )}
              </>
            )}
          </div>
          <div className="modal-footer d-flex justify-content-between align-items-center">
            {/* <small className="text-muted">Voided sessions are struck through and never counted.</small> */}
            <h5 className="mb-0 fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Total: <span className="text-primary">{breakdownTotal()}</span>
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
}
