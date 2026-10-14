/**
 * Shared "Revoke Punch Out" modal.
 * Exposes `showAttendanceRevokeModal(attendanceId, onSuccess)` so any view
 * (admin attendance page, FAB, etc.) can trigger the same flow without
 * duplicating the reason-input + server-call logic.
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';

// Module-level state shared between the exported opener and the component's
// click handler. Only one revoke flow runs at a time.
const state = {
  attendanceId: null,
  onSuccess: null,
  setLoading: null
};

function resetState() {
  state.attendanceId = null;
  state.onSuccess = null;
}

export function showAttendanceRevokeModal(attendanceId, onSuccess) {
  if (!attendanceId) return;
  state.attendanceId = attendanceId;
  state.onSuccess = typeof onSuccess === 'function' ? onSuccess : null;
  if (state.setLoading) state.setLoading(false);

  // Give Bootstrap a tick to finish any in-flight hide() on sibling modals
  // before we show ours (caller usually hides a detail modal first).
  setTimeout(() => {
    const $modal = $('#attendanceRevokeModal');
    if (!$modal.length) return;
    $modal.find('textarea[name="reason"]').val('');
    $modal.modal({ backdrop: 'static', keyboard: false, show: true });
    setTimeout(() => $modal.find('textarea[name="reason"]').trigger('focus'), 150);
  }, 50);
}

export default function AttendanceRevokeModal() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    state.setLoading = setIsLoading;
    return () => {
      if (state.setLoading === setIsLoading) state.setLoading = null;
    };
  }, []);

  useEffect(() => {
    // Safety net: clear state if the user dismisses via backdrop/esc edge cases.
    const $modal = $('#attendanceRevokeModal');
    $modal.on('hidden.bs.modal', resetState);
    return () => $modal.off('hidden.bs.modal', resetState);
  }, []);

  // Cosmetic + pointer-events:none via Bootstrap's `disabled` class on buttons.
  // Behavioural guard is the isLoading check inside the click handler.
  const disabledClass = isLoading ? 'disabled' : '';

  const confirmRevokePunchOut = (event) => {
    event.preventDefault();
    if (isLoading) return;

    const $modal = $('#attendanceRevokeModal');
    const reason = ($modal.find('textarea[name="reason"]').val() || '').trim();
    if (!reason) {
      toastr.error('Please enter a reason for revoking the punch out');
      return;
    }
    if (!state.attendanceId) {
      toastr.error('No attendance record selected');
      return;
    }

    setIsLoading(true);
    const attendanceId = state.attendanceId;
    const onSuccess = state.onSuccess;

    api.call('attendance.revokePunchOut', attendanceId, reason, (error) => {
      setIsLoading(false);
      if (error) {
        toastr.error(error.reason || 'Failed to revoke punch out');
        return;
      }
      $modal.modal('hide');
      toastr.success('Punch out revoked. You are punched in again.');
      resetState();
      if (typeof onSuccess === 'function') onSuccess();
    });
  };

  return (
    <div className="modal fade" id="attendanceRevokeModal" tabIndex="-1" aria-hidden="true" data-backdrop="static"
      data-keyboard="false">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bx bx-undo me-2"></i>Revoke Punch Out
            </h5>
            <button type="button" className={'btn-close ' + disabledClass} data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-3">
              Your status will be reset to <strong>Punched In</strong> so you can continue working.
              The previous punch-out time is kept in the audit trail.
            </p>
            <label className="form-label fw-semibold" htmlFor="attendanceRevokeReason">
              Reason <span className="text-danger">*</span>
            </label>
            <textarea name="reason" id="attendanceRevokeReason" className="form-control" rows="3"
              maxLength="500" placeholder="Why are you revoking this punch out?" required></textarea>
            <small className="text-muted">A reason is required and stored in the audit log.</small>
          </div>
          <div className="modal-footer">
            <button type="button" className={'btn btn-secondary ' + disabledClass} data-dismiss="modal">Cancel</button>
            <button type="button" className={'btn btn-danger ' + disabledClass} id="confirmRevokePunchOutBtn" onClick={confirmRevokePunchOut}>
              {isLoading ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status"></span>Revoking...</>
              ) : (
                <><i className="bx bx-undo me-1"></i>Revoke Punch Out</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
