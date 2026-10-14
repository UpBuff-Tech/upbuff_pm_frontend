/**
 * Attendance FAB Component
 * Floating Action Button for punch in/out with geolocation
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePublication } from '../../hooks/usePublication';
import { showAttendanceRevokeModal } from '../attendanceRevokeModal/AttendanceRevokeModal';
import './attendanceFab.css';

const AttendanceStatus = {
  PUNCHED_IN: 'punched_in',
  PUNCHED_OUT: 'punched_out'
};

// 7 PM auto-punch-out prompt statuses (stored on Attendance.punchOutPrompt)
const PunchOutPromptStatus = {
  PENDING: 'pending',                       // Prompt shown, awaiting user response
  CANCELLED: 'cancelled',                   // User chose to keep working
  AUTO_PUNCHED_OUT: 'auto_punched_out'      // Grace period elapsed, cron punched out
};

// Matches the app's mobile breakpoint (@media max-width: 768px)
const MOBILE_BREAKPOINT = 768;

// Detect an actual mobile/touch device. This survives the browser's
// "Request Desktop Site" mode, which enlarges innerWidth and spoofs the
// user agent but cannot fake the device's touch/pointer capability.
function isMobileDevice() {
  const ua = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i
    .test(navigator.userAgent || '');
  const coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const hasTouch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  return ua || (coarsePointer && hasTouch);
}

function isMobileView() {
  return isMobileDevice() || window.innerWidth <= MOBILE_BREAKPOINT;
}

// ---------- Background-tab attention helpers (desktop notification + title flash) ----------

let _titleFlashInterval = null;
let _originalTitle = null;
let _activeDesktopNotification = null;

function startTitleFlash(message) {
  if (_titleFlashInterval) return;
  _originalTitle = document.title;
  let toggle = false;
  _titleFlashInterval = setInterval(() => {
    document.title = toggle ? _originalTitle : message;
    toggle = !toggle;
  }, 1000);
}

function stopTitleFlash() {
  if (_titleFlashInterval) {
    clearInterval(_titleFlashInterval);
    _titleFlashInterval = null;
  }
  if (_originalTitle !== null) {
    document.title = _originalTitle;
    _originalTitle = null;
  }
}

function ensurePunchOutModalShown() {
  // Use jQuery modal plugin to match the rest of the codebase.
  // Passing options on show() applies static backdrop + disables keyboard dismissal.
  const $el = $('#punchOutPromptModal');
  if (!$el.length) return;
  $el.modal({ backdrop: 'static', keyboard: false, show: true });
}

function showDesktopNotification(title, body) {
  if (typeof Notification === 'undefined') return;

  const fire = () => {
    try {
      _activeDesktopNotification = new Notification(title, {
        body: body,
        tag: 'punch-out-prompt',  // replaces any existing notification with the same tag
        requireInteraction: true   // stays visible until user dismisses
      });
      _activeDesktopNotification.onclick = () => {
        window.focus();
        ensurePunchOutModalShown();
        if (_activeDesktopNotification) _activeDesktopNotification.close();
      };
    } catch (e) { /* notifications can fail in some browsers — ignore */ }
  };

  if (Notification.permission === 'granted') {
    fire();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => { if (perm === 'granted') fire(); });
  }
}

function dismissDesktopNotification() {
  if (_activeDesktopNotification) {
    try { _activeDesktopNotification.close(); } catch (e) { /* ignore */ }
    _activeDesktopNotification = null;
  }
}

function alertUserAcrossTabs() {
  startTitleFlash('⚠️ Punch Out?');
  showDesktopNotification(
    'End of Day – Punch Out?',
    "It's 7:00 PM. Click to respond, or you'll be punched out automatically in 30 minutes."
  );
}

function clearCrossTabAlert() {
  stopTitleFlash();
  dismissDesktopNotification();
}

// Get current geolocation
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  });
}

// Shared cleanup for client-side timer state after any punch-out
function cleanupTimersAfterPunchOut() {
  if (window.taskCardTimers) {
    for (const taskId in window.taskCardTimers) {
      delete window.taskCardTimers[taskId];
    }
  }
  try { localStorage.removeItem('taskCardTimers'); } catch (e) { /* ignore */ }
  // Halt the live "Today's Working Hours" tick — clearing taskCardTimers alone
  // leaves the 1s interval running, so the card would keep counting after punch-out.
  if (typeof window.stopTaskTimerTick === 'function') {
    window.stopTaskTimerTick();
  }
  // Re-anchor the "Today's Working Hours" banner: punch-out already committed the
  // running timers server-side, so this refresh flips isRunning to false and folds
  // the just-stopped seconds into the committed base instead of leaving it ticking.
  if (typeof window.refreshTaskTodayHours === 'function') {
    window.refreshTaskTodayHours();
  }
  $('.task-timer-stop, .task-timer-pause').prop('disabled', true);
  $('.task-timer-start').prop('disabled', false);
}

function hidePunchOutPromptModal() {
  $('#punchOutPromptModal').modal('hide');
  clearCrossTabAlert();
}

/** Today's attendance record of the user among the documents of 'attendance.myToday'. */
function findTodayRecord(docs, userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return docs.find((record) =>
    record.userId === userId
    && record.date >= today && record.date < tomorrow
    && record.isDeleted !== true);
}

export default function AttendanceFab() {
  const { user, userId } = useAuth();

  const [attendanceStatus, setAttendanceStatus] = useState(null); // null, 'punched_in', 'punched_out'
  const [isLoading, setIsLoading] = useState(true); // Start with loading state to prevent flash of wrong button
  const [currentRecord, setCurrentRecord] = useState(null);
  const [promptPunchingOut, setPromptPunchingOut] = useState(false);

  // Track mobile view (matches the app's 768px mobile breakpoint).
  // The FAB / punch-in button is hidden in mobile view.
  const [mobileView, setMobileView] = useState(isMobileView());

  // The latest status, for callbacks that run later (loadStatus compares with the previous one).
  const statusRef = useRef(null);
  const changeStatus = (status) => {
    statusRef.current = status;
    setAttendanceStatus(status);
  };

  // Load initial status
  const loadStatus = () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    api.call('attendance.getTodayStatus', (error, result) => {
      setIsLoading(false);
      if (!error && result) {
        const prevStatus = statusRef.current;
        changeStatus(result.status);
        setCurrentRecord(result.record);

        // If the server auto-punched-out (7 PM cron) while this page was open,
        // it already stopped the user's timers server-side. Mirror that on the
        // client so the 10s timer-sync doesn't revive them under today's date.
        if (result.status === 'punched_out' && prevStatus === 'punched_in') {
          cleanupTimersAfterPunchOut();
        }
      }
    });
  };

  useEffect(() => {
    const handleResize = () => setMobileView(isMobileView());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    // Initial load
    loadStatus();

    // Auto-refresh status every 60 seconds
    const statusInterval = setInterval(loadStatus, 60000);
    return () => clearInterval(statusInterval);
  }, [userId]);

  // Today's attendance record, so the 7 PM prompt is picked up as soon as the server raises it
  const { docs } = usePublication('attendance.myToday', []);
  const record = userId ? findTodayRecord(docs, userId) : null;

  // Show the prompt only while the user is still punched in — a normal
  // punch out leaves punchOutPrompt.status as PENDING but clears the modal
  // because the attendance status flips to punched_out.
  const hasPendingPrompt = !!(record
    && record.status === AttendanceStatus.PUNCHED_IN
    && record.punchOutPrompt
    && record.punchOutPrompt.status === PunchOutPromptStatus.PENDING);

  // Watch for a pending punch-out prompt on today's record.
  // Modal has static backdrop + no keyboard, so it can only close via the buttons,
  // which clear the prompt status. Therefore "show whenever pending" is safe and idempotent.
  useEffect(() => {
    if (!userId) return undefined;

    if (hasPendingPrompt) {
      alertUserAcrossTabs();
      const timer = setTimeout(ensurePunchOutModalShown, 0);
      return () => clearTimeout(timer);
    }
    clearCrossTabAlert();
    return undefined;
  }, [hasPendingPrompt, userId]);

  // Re-show the modal whenever this tab becomes visible (handles user clicking
  // the OS notification from another tab/app — focus moves but the modal may
  // not be visible yet on the active tab).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasPendingPrompt) {
        ensurePunchOutModalShown();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [hasPendingPrompt]);

  useEffect(() => clearCrossTabAlert, []);

  // Show FAB only for logged-in non-client users
  let showFab = true;
  if (!user) showFab = false;
  // Hide for client users
  else if (user.profile && user.profile.role === 'client') showFab = false;
  // Hide the punch-in button when using the mobile view UI
  else if (mobileView) showFab = false;

  let fabColorClass = 'not-punched';
  if (isLoading) fabColorClass = 'loading';
  else if (attendanceStatus === null) fabColorClass = 'not-punched';
  else if (attendanceStatus === 'punched_in') fabColorClass = 'punched-in';
  else if (attendanceStatus === 'punched_out') fabColorClass = 'punched-out';

  let fabIcon = 'bx-undo';                                         // Punched out — click to revoke
  if (attendanceStatus === null) fabIcon = 'bx-fingerprint';       // Punch in icon
  else if (attendanceStatus === 'punched_in') fabIcon = 'bx-fingerprint'; // Punch out icon

  let fabTooltip = 'Click to revoke punch out (with reason)';
  if (isLoading) fabTooltip = 'Processing...';
  else if (attendanceStatus === null) fabTooltip = 'Click to Punch In';
  else if (attendanceStatus === 'punched_in') fabTooltip = 'Click to Punch Out';

  const cancelPunchOutPrompt = (event) => {
    event.preventDefault();
    api.call('attendance.cancelPunchOutPrompt', (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to cancel prompt');
        return;
      }
      hidePunchOutPromptModal();
      toastr.info('You are still punched in. You will be punched out automatically if not done manually.');
    });
  };

  const punchOutFromPrompt = (event) => {
    event.preventDefault();
    setPromptPunchingOut(true);

    const submit = (location) => {
      api.call('attendance.punchOut', location, (error) => {
        setPromptPunchingOut(false);
        if (error) {
          toastr.error(error.reason || 'Failed to punch out');
          return;
        }
        changeStatus('punched_out');
        cleanupTimersAfterPunchOut();
        hidePunchOutPromptModal();
        loadStatus();
        toastr.success('Punched out successfully');
      });
    };

    getLocation()
      .then(submit)
      .catch(() => submit(null));
  };

  const clickFab = (event) => {
    event.preventDefault();

    const status = attendanceStatus;

    if (isLoading) return;

    // Already punched out? Offer to revoke the punch-out with a reason.
    if (status === 'punched_out') {
      if (currentRecord && currentRecord._id) {
        showAttendanceRevokeModal(currentRecord._id, () => {
          loadStatus();
        });
      } else {
        toastr.info('You have already completed your attendance for today');
      }
      return;
    }

    setIsLoading(true);

    // Function to perform punch action with or without location
    const performPunchAction = (location) => {
      if (status === null) {
        // Punch In
        api.call('attendance.punchIn', location, (error, result) => {
          setIsLoading(false);
          if (error) {
            console.error('Punch in error:', error);
            toastr.error(error.reason || 'Failed to punch in');
          } else {
            if (!location) {
              toastr.success('Punched in successfully! (Location not available)');
            } else {
              toastr.success('Punched in successfully!');
            }
            changeStatus('punched_in');
            loadStatus();
          }
        });
      } else if (status === 'punched_in') {
        // Punch Out
        api.call('attendance.punchOut', location, (error, result) => {
          setIsLoading(false);
          if (error) {
            console.error('Punch out error:', error);
            toastr.error(error.reason || 'Failed to punch out');
          } else {
            if (!location) {
              toastr.success('Punched out successfully! (Location not available)');
            } else {
              toastr.success('Punched out successfully!');
            }
            changeStatus('punched_out');
            cleanupTimersAfterPunchOut();
            loadStatus();
          }
        });
      }
    };

    // Try to get location, but proceed even if it fails
    getLocation()
      .then((location) => {
        performPunchAction(location);
      })
      .catch((error) => {
        console.warn('Geolocation error:', error.message);
        toastr.warning('Location not available. Proceeding without location.');
        // Proceed with punch action without location
        performPunchAction(null);
      });
  };

  if (!showFab) return null;

  return (
    <>
      <div className="attendance-fab-container">
        <button className={'attendance-fab ' + fabColorClass} id="attendanceFabBtn" title={fabTooltip} onClick={clickFab}>
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" role="status"></span>
          ) : (
            <i className={'bx ' + fabIcon}></i>
          )}
        </button>
      </div>

      {/* 7 PM Auto Punch-Out Prompt */}
      <div className="modal fade" id="punchOutPromptModal" tabIndex="-1" aria-hidden="true" data-backdrop="static"
        data-keyboard="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title">
                <i className="fa fa-clock-o me-2"></i>End of Day – Punch Out?
              </h5>
            </div>
            <div className="modal-body">
              <p className="mb-2">It's 7:00 PM and you're still punched in.</p>
              <p className="mb-0 text-muted small">
                Click <strong>Forcefully Punch Out</strong> to end your day now, or <strong>Cancel</strong> to keep
                working. If you don't respond within 30 minutes you'll be punched out automatically.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" id="cancelPunchOutPromptBtn" onClick={cancelPunchOutPrompt}>
                <i className="fa fa-times me-1"></i>Cancel
              </button>
              <button type="button" className="btn btn-danger" id="punchOutFromPromptBtn" disabled={promptPunchingOut} onClick={punchOutFromPrompt}>
                <i className="fa fa-sign-out me-1"></i>Punch Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
