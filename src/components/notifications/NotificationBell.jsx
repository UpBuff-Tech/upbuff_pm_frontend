/**
 * Notification Bell Component (header): bell button + dropdown with the latest notifications.
 * Styles: layouts/header/topbar.css
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import api from '../../api/client';
import { notificationStyle } from './notificationTypes';

function formatTime(date) {
  if (!date) return '';
  return moment(date).fromNow();
}


export default function NotificationBell() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  // Load notifications
  const loadNotifications = () => {
    setIsLoading(true);
    api.call('notifications.getForUser', { limit: 10 }, (error, list) => {
      setIsLoading(false);
      if (!error) {
        setNotifications(list || []);
      }
    });
  };

  // Load unread count
  const loadUnreadCount = () => {
    api.call('notifications.getUnreadCount', (error, count) => {
      if (!error) {
        setUnreadCount(count || 0);
      }
    });
  };

  useEffect(() => {
    // Initial load
    loadNotifications();
    loadUnreadCount();

    // Refresh every 30 seconds
    const notificationInterval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!$(event.target).closest('.notification-bell-container').length) {
        setDropdownOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const hasUnread = unreadCount > 0;
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  /**
   * Toggle notification dropdown
   */
  const toggleDropdown = (event) => {
    event.stopPropagation();
    if (dropdownOpen) {
      setDropdownOpen(false);
    } else {
      setDropdownOpen(true);
      loadNotifications();
    }
  };

  /**
   * Click on a notification item
   */
  const openNotification = (event, notification) => {
    event.stopPropagation();
    const notificationId = notification._id;

    // Mark as read
    if (!notification.read) {
      api.call('notifications.markAsRead', notificationId, (error) => {
        if (!error) {
          loadNotifications();
          loadUnreadCount();
        }
      });
    }

    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
      setDropdownOpen(false);
    }
  };

  /**
   * Mark all as read
   */
  const markAllRead = (event) => {
    event.stopPropagation();

    api.call('notifications.markAllAsRead', (error) => {
      if (!error) {
        toastr.success('All notifications marked as read');
        loadNotifications();
        loadUnreadCount();
      } else {
        toastr.error('Failed to mark notifications as read');
      }
    });
  };

  return (
    <div className="notification-bell-container">
      <button type="button" className={'notification-bell-btn' + (dropdownOpen ? ' is-open' : '')} id="notificationBellBtn"
        onClick={toggleDropdown} aria-label={hasUnread ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-haspopup="true" aria-expanded={dropdownOpen}>
        <i className={'bx ' + (hasUnread ? 'bxs-bell bx-tada-hover' : 'bx-bell')}></i>
        {hasUnread && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {dropdownOpen && (
        <div className="notification-dropdown" id="notificationDropdown" onClick={(event) => event.stopPropagation()}>
          <div className="notification-header">
            <div className="notification-heading">
              <h6>Notifications</h6>
              {hasUnread && <span className="notification-count">{unreadCount} new</span>}
            </div>
            {hasUnread && (
              <button type="button" className="mark-all-read" onClick={markAllRead}>
                <i className="bx bx-check-double"></i>Mark all read
              </button>
            )}
          </div>

          <div className="notification-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={filter === 'all'}
              className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button type="button" role="tab" aria-selected={filter === 'unread'}
              className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
              Unread{hasUnread && <span>{unreadCount}</span>}
            </button>
          </div>

          <div className="notification-list">
            {isLoading && notifications.length === 0 ? (
              <div className="notification-skeletons">
                {[0, 1, 2].map((i) => (
                  <div className="notification-skeleton" key={i}>
                    <span className="sk-icon"></span>
                    <span className="sk-lines"><span></span><span></span></span>
                  </div>
                ))}
              </div>
            ) : visible.length > 0 ? (
              visible.map((notification) => {
                const style = notificationStyle(notification);
                return (
                  <div key={notification._id} role="button" tabIndex={0}
                    className={'notification-item' + (notification.read ? '' : ' unread')} data-id={notification._id}
                    onClick={(event) => openNotification(event, notification)}
                    onKeyDown={(event) => { if (event.key === 'Enter') openNotification(event, notification); }}>
                    <span className={'notification-icon tone-' + style.tone}><i className={'bx ' + style.icon}></i></span>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      {notification.message && <div className="notification-message">{notification.message}</div>}
                      <div className="notification-time"><i className="bx bx-time"></i>{formatTime(notification.createdAt)}</div>
                    </div>
                    {!notification.read && <span className="unread-indicator" aria-label="Unread"></span>}
                  </div>
                );
              })
            ) : (
              <div className="notification-empty">
                <span className="notification-empty-icon"><i className="bx bx-bell-off"></i></span>
                <p className="notification-empty-title">{filter === 'unread' ? "You're all caught up" : 'No notifications yet'}</p>
                <p className="notification-empty-text">
                  {filter === 'unread' ? 'No unread notifications right now.' : "We'll let you know when something needs your attention."}
                </p>
              </div>
            )}
          </div>

          <div className="notification-footer">
            <Link to="/notifications" className="view-all-notifications" onClick={() => setDropdownOpen(false)}>
              View all notifications<i className="bx bx-right-arrow-alt"></i>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
