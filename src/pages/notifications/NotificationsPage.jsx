/**
 * Notifications Page: an inbox with All / Unread / Alerts tabs, grouped by day.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import api from '../../api/client';
import { notificationStyle } from '../../components/notifications/notificationTypes';
import { fxConfirm } from '../../components/dialog/dialog';
import './notifications.css';

function formatTime(date) {
  if (!date) return '';
  return moment(date).format('MMM DD, YYYY h:mm A');
}

/** "Today", "Yesterday", "This week" or "Earlier" for a notification date. */
function dayGroup(date) {
  const day = moment(date);
  if (day.isSame(moment(), 'day')) return 'Today';
  if (day.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
  if (day.isAfter(moment().subtract(7, 'days').startOf('day'))) return 'This week';
  return 'Earlier';
}

const TABS = [
  { key: 'all', label: 'All', icon: 'bx-inbox' },
  { key: 'unread', label: 'Unread', icon: 'bx-envelope' },
  { key: 'alerts', label: 'Alerts', icon: 'bx-error-alt' },
];

const EMPTY_STATES = {
  all: { icon: 'bx-bell-off', title: 'No notifications yet', text: "We'll let you know when something needs your attention." },
  unread: { icon: 'bx-check-double', title: "You're all caught up", text: 'There are no unread notifications.' },
  alerts: { icon: 'bx-shield-quarter', title: 'No alerts', text: 'Nothing is delayed, overdue or at risk right now.' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all');

  // Load notifications
  const loadNotifications = () => {
    setIsLoading(true);
    api.call('notifications.getForUser', { limit: 100 }, (error, list) => {
      setIsLoading(false);
      if (error) {
        console.error('Error loading notifications:', error);
        toastr.error('Failed to load notifications');
      } else {
        setNotifications(list || []);
      }
    });
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const alertCount = notifications.filter((n) => notificationStyle(n).alert).length;
  const counts = { all: notifications.length, unread: unreadCount, alerts: alertCount };

  const visible = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'alerts') return notificationStyle(n).alert;
    return true;
  });

  // Group by day, keeping the server's newest-first order
  const groups = [];
  visible.forEach((n) => {
    const label = dayGroup(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  });

  /**
   * Click on notification item
   */
  const openNotification = (event, notification) => {
    // Ignore clicks on the item's action buttons
    if ($(event.target).closest('.nf-actions').length) {
      return;
    }

    const notificationId = notification._id;

    // Mark as read
    if (!notification.read) {
      api.call('notifications.markAsRead', notificationId, (error) => {
        if (!error) {
          loadNotifications();
        }
      });
    }

    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markOneRead = (event, notificationId) => {
    event.stopPropagation();
    api.call('notifications.markAsRead', notificationId, (error) => {
      if (error) {
        toastr.error('Failed to mark as read');
      } else {
        loadNotifications();
      }
    });
  };

  /**
   * Delete notification
   */
  const deleteNotification = async (event, notificationId) => {
    event.stopPropagation();

    if (await fxConfirm('Are you sure you want to delete this notification?', { tone: 'danger', title: 'Delete notification?', confirmText: 'Delete' })) {
      api.call('notifications.delete', notificationId, (error) => {
        if (error) {
          toastr.error('Failed to delete notification');
        } else {
          toastr.success('Notification deleted');
          loadNotifications();
        }
      });
    }
  };

  /**
   * Mark all as read
   */
  const markAllRead = () => {
    api.call('notifications.markAllAsRead', (error) => {
      if (error) {
        toastr.error('Failed to mark all as read');
      } else {
        toastr.success('All notifications marked as read');
        loadNotifications();
      }
    });
  };

  const empty = EMPTY_STATES[tab];

  return (
    <div className="container-xxl flex-grow-1 container-p-y nf-page">
      {/* Page Header */}
      <div className="nf-header">
        <div>
          <h4 className="fw-bold mb-1">Notifications</h4>
          <p className="text-muted mb-0">
            {unreadCount > 0
              ? <>You have <strong className="text-body">{unreadCount} unread</strong> notification{unreadCount !== 1 ? 's' : ''}</>
              : 'Updates about your tasks, projects and tickets'}
          </p>
        </div>
        <div className="nf-header-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={loadNotifications} disabled={isLoading}>
            <i className={'bx bx-refresh me-1' + (isLoading ? ' bx-spin' : '')}></i>Refresh
          </button>
          {unreadCount > 0 && (
            <button type="button" className="btn btn-primary" id="markAllRead" onClick={markAllRead}>
              <i className="bx bx-check-double me-1"></i>Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="card nf-card">
        {/* Tabs */}
        <div className="nf-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={'nf-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
              <i className={'bx ' + t.icon}></i>{t.label}
              <span className="nf-tab-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading && notifications.length === 0 ? (
          <div className="nf-list" aria-label="Loading notifications">
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="nf-skeleton" key={i}>
                <span className="nf-sk nf-sk-icon"></span>
                <div className="nf-sk-lines">
                  <span className="nf-sk nf-sk-title"></span>
                  <span className="nf-sk nf-sk-text"></span>
                  <span className="nf-sk nf-sk-time"></span>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="nf-empty">
            <span className="nf-empty-icon"><i className={'bx ' + empty.icon}></i></span>
            <h5>{empty.title}</h5>
            <p>{empty.text}</p>
          </div>
        ) : (
          <div className={'nf-list' + (isLoading ? ' is-refreshing' : '')}>
            {groups.map((group) => (
              <section key={group.label} className="nf-group">
                <div className="nf-group-label">{group.label}</div>
                {group.items.map((notification) => {
                  const style = notificationStyle(notification);
                  return (
                    <div key={notification._id} role="button" tabIndex={0}
                      className={'nf-item notification-item' + (notification.read ? '' : ' unread')} data-id={notification._id}
                      onClick={(event) => openNotification(event, notification)}
                      onKeyDown={(event) => { if (event.key === 'Enter') openNotification(event, notification); }}>
                      <span className={'nf-icon tone-' + style.tone}><i className={'bx ' + style.icon}></i></span>

                      <div className="nf-body">
                        <div className="nf-top">
                          <span className={'nf-type tone-' + style.tone}>{style.label}</span>
                          <span className="nf-time" title={formatTime(notification.createdAt)}>
                            {notification.createdAt ? moment(notification.createdAt).fromNow() : ''}
                          </span>
                        </div>
                        <div className="nf-title">{notification.title}</div>
                        {notification.message && <p className="nf-message">{notification.message}</p>}
                      </div>

                      <div className="nf-actions">
                        {!notification.read && (
                          <button type="button" className="nf-action" title="Mark as read" aria-label="Mark as read"
                            onClick={(event) => markOneRead(event, notification._id)}>
                            <i className="bx bx-check"></i>
                          </button>
                        )}
                        {notification.link && (
                          <button type="button" className="nf-action" title="Open" aria-label="Open"
                            onClick={(event) => { event.stopPropagation(); openNotification({ target: document.body }, notification); }}>
                            <i className="bx bx-right-arrow-alt"></i>
                          </button>
                        )}
                        <button type="button" className="nf-action nf-action-danger delete-notification" data-id={notification._id}
                          title="Delete" aria-label="Delete" onClick={(event) => deleteNotification(event, notification._id)}>
                          <i className="bx bx-trash"></i>
                        </button>
                      </div>

                      {!notification.read && <span className="nf-unread-dot" aria-label="Unread"></span>}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
