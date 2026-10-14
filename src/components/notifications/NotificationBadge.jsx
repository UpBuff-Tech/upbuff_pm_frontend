/**
 * Notification Badge Component
 * Shows unread notification count
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load unread count
    const loadUnreadCount = () => {
      api.call('notifications.getUnreadCount', (error, count) => {
        if (!error) {
          setUnreadCount(count || 0);
        }
      });
    };

    // Initial load
    loadUnreadCount();

    // Refresh every 30 seconds
    const notificationInterval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  const hasUnread = unreadCount > 0;

  if (!hasUnread) return null;
  return (
    <span className="badge bg-danger rounded-pill" style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.65rem', padding: '0.25rem 0.4rem' }}>
      {unreadCount}
    </span>
  );
}
