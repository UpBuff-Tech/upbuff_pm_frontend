// The bar across the top of every logged-in page: menu toggle, page title,
// the "Who's In" register link, notifications and the user menu.

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import NotificationBell from '../../components/notifications/NotificationBell';
import ProfileModal from './ProfileModal';
import { toggleSidebar } from '../sidebarState';
import topbarStyles from './topbar.css?inline';

// [path prefix, section, page title] — the first matching prefix wins.
const PAGE_TITLES = [
  ['/admin/dashboard', 'Overview', 'Dashboard'],
  ['/client/dashboard', 'Overview', 'Dashboard'],
  ['/director/dashboard', 'Overview', 'Directors Dashboard'],
  ['/user/dashboard', 'Overview', 'My Dashboard'],
  ['/notifications', 'Overview', 'Notifications'],
  ['/project', 'Work', 'Projects'],
  ['/updated/task', 'Work', 'Tasks'],
  ['/task', 'Work', 'Tasks'],
  ['/client/tasks', 'Work', 'My Tasks'],
  ['/ganttChart', 'Work', 'Gantt Chart'],
  ['/calendar', 'Work', 'Calendar'],
  ['/documentRepository', 'Work', 'Documents'],
  ['/client/tickets', 'Work', 'My Tickets'],
  ['/ticketTypes', 'Administration', 'Ticket Types'],
  ['/ticket', 'Work', 'Tickets'],
  ['/templates', 'Work', 'Templates'],
  ['/employeeTaskReport', 'Reports', 'Employee Task Report'],
  ['/clientTaskReport', 'Reports', 'Client Task Report'],
  ['/financial', 'Reports', 'Financial'],
  ['/user', 'People', 'Users'],
  ['/userCreate', 'People', 'Users'],
  ['/role', 'People', 'Roles'],
  ['/client/list', 'People', 'Clients'],
  ['/attendance', 'People', 'Attendance'],
  ['/leaveRequest', 'People', 'Leave Requests'],
  ['/leaveRegister', 'People', "Who's In"],
  ['/suggestions', 'Administration', 'Suggestions'],
  ['/syncHealth', 'Administration', 'System Incidents'],
  ['/systemConfig', 'Administration', 'System Configuration'],
  ['/profile', 'Account', 'My Profile'],
];

function pageTitle(pathname) {
  const match = PAGE_TITLES.find(([prefix]) => pathname.indexOf(prefix) === 0);
  return match ? { section: match[1], title: match[2] } : { section: '', title: '' };
}

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  // The profile popup opens each time `count` increases, on the given tab.
  const [profileRequest, setProfileRequest] = useState({ count: 0, tab: 'details' });
  const userMenuRef = useRef(null);

  const profile = (user && user.profile) || {};
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'My Account';
  const initials = ((profile.firstName || '').charAt(0) + (profile.lastName || '').charAt(0)).toUpperCase() || 'U';
  const email = (user && (user.emails?.[0]?.address || user.emailAddress)) || '';
  const role = profile.role || '';
  const { section, title } = pageTitle(location.pathname);

  // Close the user menu on outside click, Escape, or page change
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const openProfile = (tab) => {
    setMenuOpen(false);
    setProfileRequest((request) => ({ count: request.count + 1, tab }));
  };

  const logout = () => {
    setMenuOpen(false);
    $('#logoutConfirmModal').modal('show');
  };

  return (
    <>
      <style>{topbarStyles}</style>
      <header className="fx-topbar">
        <button type="button" className="fx-topbar-icon" onClick={toggleSidebar} aria-label="Toggle menu">
          <i className="bx bx-menu"></i>
        </button>

        <div className="fx-topbar-title">
          {section && <span className="fx-topbar-section">{section}</span>}
          {section && title && <i className="bx bx-chevron-right fx-topbar-sep"></i>}
          {title && <span className="fx-topbar-page">{title}</span>}
        </div>

        <div className="fx-topbar-actions">
          {role !== 'client' && (
            <Link to="/leaveRegister" title="Who's in today: available, remote and on leave"
              className={'fx-whos-in' + (location.pathname === '/leaveRegister' ? ' active' : '')}>
              <i className="bx bx-group"></i>
              <span>Who's In</span>
            </Link>
          )}

          <NotificationBell />

          <span className="fx-topbar-divider"></span>

          <div className="fx-user-menu" ref={userMenuRef}>
            <button type="button" className="fx-user-trigger" onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="fx-user-avatar-wrap">
                {profile.logo ? (
                  <img src={profile.logo} alt="" className="fx-user-avatar" />
                ) : (
                  <span className="fx-user-avatar fx-user-initials">{initials}</span>
                )}
                <span className="fx-presence"></span>
              </span>
              <span className="fx-user-text">
                <span className="fx-user-name">{fullName}</span>
                {role && <span className="fx-user-role">{role}</span>}
              </span>
              <i className="bx bx-chevron-down fx-user-caret"></i>
            </button>

            {menuOpen && (
              <div className="fx-user-dropdown" role="menu">
                <div className="fx-user-card">
                  {profile.logo ? (
                    <img src={profile.logo} alt="" className="fx-user-card-avatar" />
                  ) : (
                    <span className="fx-user-card-avatar fx-user-initials">{initials}</span>
                  )}
                  <div className="fx-user-card-text">
                    <div className="fx-user-card-name">{fullName}</div>
                    {email && <div className="fx-user-card-email">{email}</div>}
                    {role && <span className="fx-user-card-role">{role}</span>}
                  </div>
                </div>
                <div className="fx-user-dropdown-group">
                  <button type="button" className="fx-user-dropdown-item" role="menuitem" onClick={() => openProfile('details')}>
                    <span className="fx-item-icon"><i className="bx bx-user"></i></span>
                    <span className="fx-item-text">My profile<small>View and edit your details</small></span>
                  </button>
                </div>
                <div className="fx-user-dropdown-group">
                  <button type="button" className="fx-user-dropdown-item fx-danger" role="menuitem" onClick={logout}>
                    <span className="fx-item-icon"><i className="bx bx-log-out"></i></span>
                    <span className="fx-item-text">Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProfileModal openRequest={profileRequest.count} initialTab={profileRequest.tab} />
    </>
  );
}
