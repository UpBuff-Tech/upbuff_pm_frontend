import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import NotificationBadge from '../../components/notifications/NotificationBadge';
import { closeMobileSidebar, isSidebarCollapsed } from '../sidebarState';
import menuStyles from './menu.css?inline';

function scrollToTop() {
  $(window).scrollTop(0);
  $('.wrapper').scrollTop(0);
}

/** The side menu sections. `show` is false for items the user may not see. */
function buildSections(isClientUser, userCan) {
  if (isClientUser) {
    return [
      {
        title: 'Overview',
        items: [
          { to: '/client/dashboard', icon: 'bx-home-alt', label: 'Dashboard' },
        ],
      },
      {
        title: 'Work',
        items: [
          { to: '/client/tasks', icon: 'bx-task', label: 'My Tasks' },
          { to: '/ganttChart/view', icon: 'bx-bar-chart-square', label: 'Gantt Chart' },
          { to: '/calendar/view', icon: 'bx-calendar', label: 'Calendar' },
          { to: '/documentRepository/view', icon: 'bx-folder-open', label: 'Documents' },
          { to: '/client/tickets', icon: 'bx-support', label: 'My Tickets' },
        ],
      },
    ];
  }

  return [
    {
      title: 'Overview',
      items: [
        { to: '/admin/dashboard', icon: 'bx-home-alt', label: 'Dashboard', show: userCan('admindashboard_view') },
        { to: '/director/dashboard', icon: 'bx-bar-chart-alt-2', label: 'Directors Dashboard', show: userCan('directorDashboard_view') },
        { to: '/user/dashboard', icon: 'bx-user-circle', label: 'My Dashboard', show: userCan('userDashboard_view') },
        { to: '/notifications', icon: 'bx-bell', label: 'Notifications', badge: true },
      ],
    },
    {
      title: 'Work',
      items: [
        { to: '/project/list', icon: 'bx-folder', label: 'Projects', show: userCan('project_view') },
        { to: '/task/list', icon: 'bx-task', label: 'Tasks', show: userCan('task_view') },
        { to: '/ganttChart/view', icon: 'bx-bar-chart-square', label: 'Gantt Chart', show: userCan('ganttChart_view') },
        { to: '/ticket/list', icon: 'bx-support', label: 'Tickets', show: userCan('ticket_view') },
      ],
    },
    {
      title: 'Reports',
      items: [
        { to: '/employeeTaskReport/list', icon: 'bx-line-chart', label: 'Employee Task Report', show: userCan('employeeTaskReport_view') },
        { to: '/clientTaskReport/list', icon: 'bx-pie-chart-alt-2', label: 'Client Task Report', show: userCan('clientTaskReport_view') },
        { to: '/financial', icon: 'bx-wallet', label: 'Financial', show: userCan('financial_view') },
      ],
    },
    {
      title: 'People',
      items: [
        { to: '/user/list', icon: 'bx-user', label: 'Users', show: userCan('user_view') },
        { to: '/role/list', icon: 'bx-shield-quarter', label: 'Roles', show: userCan('role_view') },
        { to: '/client/list', icon: 'bx-briefcase', label: 'Clients', show: userCan('client_view') },
        { to: '/attendance/list', icon: 'bx-time-five', label: 'Attendance', show: userCan('attendance_view') },
        // Leave Request: available for all employees (non-client users)
        { to: '/leaveRequest/list', icon: 'bx-calendar-minus', label: 'Leave Requests' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { to: '/ticketTypes/list', icon: 'bx-category', label: 'Ticket Types', show: userCan('ticketTypes_view') },
        { to: '/suggestions/list', icon: 'bx-message-rounded-dots', label: 'Suggestions', show: userCan('suggestions_view') },
        { to: '/syncHealth/list', icon: 'bx-pulse', label: 'System Incidents', show: userCan('syncHealth_view') },
      ],
    },
  ];
}

const FOLDED_KEY = 'fx-menu-folded';

/** Titles of the sections the user has folded away (remembered across visits). */
function readFolded() {
  try {
    return JSON.parse(localStorage.getItem(FOLDED_KEY)) || [];
  } catch (e) {
    return [];
  }
}

/** href of the item to highlight: the longest menu path the current URL starts with. */
function findActiveHref(items, currentPath) {
  let best = null;
  for (const { to } of items) {
    if (to === currentPath) return to;
    if (to !== '/' && currentPath.indexOf(to) === 0 && (!best || to.length > best.length)) best = to;
  }
  return best;
}

export default function Menu() {
  const { user, userCan } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname + location.search;
  const [query, setQuery] = useState('');
  const [folded, setFolded] = useState(readFolded);

  const isClientUser = !!(user && user.profile && user.profile.role === 'client');

  const sections = buildSections(isClientUser, userCan)
    .map((section) => ({ ...section, items: section.items.filter((menuItem) => menuItem.show !== false) }))
    .filter((section) => section.items.length > 0);
  const activeHref = findActiveHref(sections.flatMap((section) => section.items), currentPath);

  const needle = query.trim().toLowerCase();
  const visibleSections = needle
    ? sections
      .map((section) => ({ ...section, items: section.items.filter((menuItem) => menuItem.label.toLowerCase().includes(needle)) }))
      .filter((section) => section.items.length > 0)
    : sections;

  const toggleSection = (title) => {
    setFolded((current) => {
      const next = current.includes(title) ? current.filter((t) => t !== title) : [...current, title];
      try {
        localStorage.setItem(FOLDED_KEY, JSON.stringify(next));
      } catch (e) {
        // Private mode: the choice just isn't remembered.
      }
      return next;
    });
  };

  const onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setQuery('');
      event.currentTarget.blur();
    } else if (event.key === 'Enter' && visibleSections.length) {
      // Enter opens the first match
      navigate(visibleSections[0].items[0].to);
      setQuery('');
      event.currentTarget.blur();
      scrollToTop();
    }
  };

  // Close the slide-in menu (small screens) whenever the page changes
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname]);

  // When the menu is collapsed to icons, show an item's label next to it on hover
  useEffect(() => {
    if (!$('#menu-hover-tooltip').length) {
      $('body').append('<div id="menu-hover-tooltip"></div>');
    }

    $(document).on('mouseenter.menuTooltip', '#fx-sidebar [data-tooltip]', function () {
      if (!isSidebarCollapsed()) return;
      const rect = this.getBoundingClientRect();
      $('#menu-hover-tooltip').text($(this).attr('data-tooltip')).css({
        display: 'block',
        left: (rect.right + 12) + 'px',
        top: (rect.top + rect.height / 2) + 'px',
      });
    });
    $(document).on('mouseleave.menuTooltip', '#fx-sidebar [data-tooltip]', function () {
      $('#menu-hover-tooltip').hide();
    });

    return () => {
      $(document).off('.menuTooltip');
      $('#menu-hover-tooltip').hide();
    };
  }, []);

  return (
    <>
      <style>{menuStyles}</style>
      <aside id="fx-sidebar" className="fx-sidebar" aria-label="Main navigation">
        <div className="fx-sidebar-brand">
          <Link to="/" className="fx-sidebar-logo" onClick={scrollToTop}>
            <span className="fx-sidebar-logo-mark">
              <img src="/img/logo.png" alt="" />
            </span>
            <span className="fx-sidebar-wordmark">
              Fiëro
              <small>by Upbuff</small>
            </span>
          </Link>
        </div>

        <div className="fx-sidebar-search">
          <i className="bx bx-search"></i>
          <input type="text" value={query} placeholder="Search menu…"
            onChange={(event) => setQuery(event.target.value)} onKeyDown={onSearchKeyDown}
            aria-label="Search menu" />
          {query && (
            <button type="button" className="fx-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><i className="bx bx-x"></i></button>
          )}
        </div>

        <nav className="fx-sidebar-nav">
          {visibleSections.map((section) => {
            const isFolded = !needle && folded.includes(section.title);
            return (
              <div className={'fx-nav-section' + (isFolded ? ' folded' : '')} key={section.title}>
                <button type="button" className="fx-nav-heading" onClick={() => toggleSection(section.title)}
                  aria-expanded={!isFolded}>
                  <span>{section.title}</span>
                  <i className="bx bx-chevron-down"></i>
                </button>
                <ul className="fx-nav-list">
                  {section.items.map((menuItem) => (
                    <li key={menuItem.to}>
                      <Link to={menuItem.to} onClick={() => { setQuery(''); scrollToTop(); }} data-tooltip={menuItem.label}
                        className={'fx-nav-link' + (activeHref === menuItem.to ? ' active' : '')}
                        aria-current={activeHref === menuItem.to ? 'page' : undefined}>
                        <span className="fx-nav-icon"><i className={'bx ' + menuItem.icon}></i></span>
                        <span className="fx-nav-label">{menuItem.label}</span>
                        {menuItem.badge && <NotificationBadge />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!visibleSections.length && (
            <div className="fx-nav-empty">
              <i className="bx bx-search-alt"></i>
              No menu items match “{query.trim()}”
            </div>
          )}
        </nav>
      </aside>
      <div className="fx-sidebar-backdrop" onClick={closeMobileSidebar}></div>
    </>
  );
}
