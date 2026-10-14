// ---------- Notification Popup (global) ----------
// Pops up newly-arriving unread notifications in a Bootstrap modal.
// Existing unread notifications at login are snapshotted into `seenIds`
// so users aren't flooded on page load — only genuinely new notifications pop.

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePublication } from '../../hooks/usePublication';
import { NotificationTypes, isProjectDelay, isTaskDelay } from './notificationTypes';
import './notificationPopup.css';

// Auto-dismiss the currently displayed popup after this many ms if the
// user does not manually close or view it. Prevents the modal stack from
// blocking a returning user who has dozens of piled-up notifications.
// Auto-close does NOT mark the notification as read — the unread count
// in the sidebar menu still surfaces it so the user can find it later.
const POPUP_AUTO_CLOSE_MS = 10 * 60 * 1000;

// Notifications with a queue length at or above this threshold switch from
// a blocking one-by-one modal to a single non-blocking top banner.
const BANNER_THRESHOLD = 4;

function formatPopupTime(date) {
  if (!date) return '';
  return moment(date).format('MMM DD, YYYY h:mm A');
}

function ensureNotificationModalShown() {
  const $el = $('#notificationPopupModal');
  if (!$el.length) return;
  $el.modal({ backdrop: 'static', keyboard: false, show: true });
}

function hideNotificationModal() {
  const $modal = $('#notificationPopupModal');
  if ($modal.hasClass('show') || $modal.is(':visible')) {
    // Wait for Bootstrap's closing animation to finish, then force-remove
    // any leftover backdrop and body class — programmatic hide with
    // data-backdrop="static" can leave the overlay stuck on the page.
    $modal.one('hidden.bs.modal', function () {
      $('body').removeClass('modal-open');
      $('.modal-backdrop').remove();
    }).modal('hide');
  } else {
    // Modal wasn't open — clean up any stale backdrop that may have been left
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  }
}

/** Colour of the popup icon: red for overdue/delayed tasks, amber for delayed projects. */
function popupTone(current) {
  if (!current) return 'primary';
  if (isTaskDelay(current) || current.type === NotificationTypes.TICKET_OVERDUE) return 'danger';
  if (isProjectDelay(current)) return 'warning';
  return 'primary';
}

function popupHeaderIcon(current) {
  if (!current) return 'bx-info-circle';
  if (isTaskDelay(current) || isProjectDelay(current) || current.type === NotificationTypes.TICKET_OVERDUE) {
    return 'bx-error-circle';
  }
  return 'bx-bell';
}

export default function NotificationPopup() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  const [queue, setQueue] = useState([]);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerCount, setBannerCount] = useState(0);

  // Values the timers and callbacks below must read at the moment they run.
  const queueRef = useRef([]);
  const seenIds = useRef(new Set());
  const initialized = useRef(false);
  const autoCloseTimer = useRef(null);
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const { docs } = usePublication('notifications.forUser', [50]);

  const updateQueue = (nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  };

  const clearAutoCloseTimer = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  };

  const scheduleAutoClose = () => {
    clearAutoCloseTimer();
    if (queueRef.current.length === 0) return;
    autoCloseTimer.current = setTimeout(() => {
      autoCloseTimer.current = null;
      // Auto-close only hides the popup — the notification stays unread
      // in the DB and keeps contributing to the sidebar unread badge.
      advancePopupQueue();
    }, POPUP_AUTO_CLOSE_MS);
  };

  const advancePopupQueue = () => {
    const rest = queueRef.current.slice(1);
    updateQueue(rest);
    if (rest.length === 0) {
      hideNotificationModal();
    } else {
      scheduleAutoClose();
    }
  };

  const markCurrentAsReadAndAdvance = (afterRead) => {
    const current = queueRef.current[0];
    if (!current) return;
    clearAutoCloseTimer();
    api.call('notifications.markAsRead', current._id, () => {
      advancePopupQueue();
      if (typeof afterRead === 'function') afterRead(current);
    });
  };

  // Hide the modal whenever the queue drains to zero so the modal
  // never stays open with undefined content (causes the blank-modal bug).
  useEffect(() => {
    if (queue.length === 0) {
      hideNotificationModal();
    }
  }, [queue]);

  // Hide the banner automatically when the user navigates to /notifications —
  // showing it there is redundant since they are already viewing notifications.
  useEffect(() => {
    if (currentPath === '/notifications') {
      setShowBanner(false);
    }
  }, [currentPath]);

  useEffect(() => {
    if (!userId) return;

    const unread = docs
      .filter((n) => n.userId === userId && n.read === false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Snapshot existing unread on first run so we don't flood the user
    if (!initialized.current) {
      unread.forEach((n) => seenIds.current.add(n._id));
      initialized.current = true;
      return;
    }

    // Enqueue any unread notifications we haven't seen yet (oldest first)
    const fresh = unread
      .filter((n) => !seenIds.current.has(n._id))
      .reverse();

    if (fresh.length === 0) return;

    fresh.forEach((n) => seenIds.current.add(n._id));

    const nextQueue = queueRef.current.concat(fresh);

    if (nextQueue.length >= BANNER_THRESHOLD) {
      // Too many to show one-by-one — switch to the non-blocking top banner.
      // Clear any in-progress modal and auto-close timer so the UI is unblocked.
      clearAutoCloseTimer();
      hideNotificationModal();
      updateQueue([]);
      setBannerCount(nextQueue.length);
      // Don't show the banner on /notifications — the user is already there.
      const onNotificationsPage = currentPathRef.current === '/notifications';
      if (!onNotificationsPage) setShowBanner(true);
    } else {
      updateQueue(nextQueue);
      setTimeout(() => {
        ensureNotificationModalShown();
        // Only start the auto-close timer if one isn't already running for
        // the currently displayed notification — new arrivals appended to
        // the back of the queue must not reset the active countdown.
        if (!autoCloseTimer.current) scheduleAutoClose();
      }, 0);
    }
  }, [docs, userId]);

  useEffect(() => clearAutoCloseTimer, []);

  const popupCurrent = queue[0];
  const popupQueueCount = Math.max(0, queue.length - 1);
  const bannerCountPlural = bannerCount !== 1 ? 's' : '';

  const dismissPopup = (event) => {
    event.preventDefault();
    markCurrentAsReadAndAdvance();
  };

  const viewPopup = (event) => {
    event.preventDefault();
    markCurrentAsReadAndAdvance((current) => {
      if (current.link) navigate(current.link);
    });
  };

  const bannerMarkAllRead = (event) => {
    event.preventDefault();
    api.call('notifications.markAllAsRead', (error) => {
      if (!error) {
        toastr.success('All notifications marked as read');
        setShowBanner(false);
      } else {
        toastr.error('Failed to mark notifications as read');
      }
    });
  };

  const bannerViewAll = () => {
    setShowBanner(false);
    navigate('/notifications');
  };

  const bannerDismiss = () => {
    setShowBanner(false);
  };

  return (
    <>
      {/* Blocking modal: used for 1–3 queued notifications */}
      <div className="modal fade fx-notify-modal" id="notificationPopupModal" tabIndex="-1" aria-hidden="true" data-backdrop="static"
        data-keyboard="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {popupCurrent && (
              <>
                <div className="fx-notify-modal-body">
                  <span className={'fx-notify-icon tone-' + popupTone(popupCurrent)}>
                    <i className={'bx ' + popupHeaderIcon(popupCurrent)}></i>
                  </span>
                  <div className="fx-notify-modal-text">
                    <div className="fx-notify-modal-top">
                      <span className="fx-notify-eyebrow">New notification</span>
                      {popupQueueCount > 0 && <span className="fx-notify-more">+{popupQueueCount} more</span>}
                    </div>
                    <h5 className="modal-title">{popupCurrent.title}</h5>
                    {popupCurrent.message && <p className="fx-notify-message">{popupCurrent.message}</p>}
                    <span className="fx-notify-time"><i className="bx bx-time"></i>{formatPopupTime(popupCurrent.createdAt)}</span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" id="dismissNotificationPopupBtn" onClick={dismissPopup}>
                    Dismiss
                  </button>
                  {popupCurrent.link && (
                    <button type="button" className="btn btn-primary" id="viewNotificationPopupBtn" onClick={viewPopup}>
                      View details<i className="bx bx-right-arrow-alt ms-1"></i>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Non-blocking card: used for 4+ queued notifications */}
      {showBanner && (
        <div id="notificationBanner" className="fx-notify-card" role="status" aria-live="polite">
          <span className="fx-notify-icon tone-primary fx-notify-ring">
            <i className="bx bxs-bell-ring"></i>
            <span className="fx-notify-icon-count">{bannerCount > 99 ? '99+' : bannerCount}</span>
          </span>
          <div className="fx-notify-card-text">
            <div className="fx-notify-card-title">{bannerCount} new notification{bannerCountPlural}</div>
            <div className="fx-notify-card-sub">You can keep working — review them whenever you're ready.</div>
            <div className="fx-notify-card-actions">
              <button type="button" className="btn btn-sm btn-primary banner-view-all" onClick={bannerViewAll}>
                View all
              </button>
              <button type="button" className="btn btn-sm btn-secondary banner-mark-all-read" onClick={bannerMarkAllRead}>
                <i className="bx bx-check-double me-1"></i>Mark all read
              </button>
            </div>
          </div>
          <button type="button" className="fx-notify-close banner-dismiss" title="Dismiss" aria-label="Dismiss" onClick={bannerDismiss}>
            <i className="bx bx-x"></i>
          </button>
        </div>
      )}
    </>
  );
}
