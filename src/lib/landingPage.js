// Where a staff user lands after login (and on "/"): the role's home page when the user may
// open it, otherwise the first dashboard their permissions allow, otherwise Leave Requests
// (open to every employee). Used by the login form and by the "/" route.
import api from '../api/client';

// The permission each selectable home page needs (pages not listed need none)
const PAGE_PERMISSION = {
  '/admin/dashboard': 'admindashboard_view',
  '/director/dashboard': 'directorDashboard_view',
  '/user/dashboard': 'userDashboard_view',
  '/user/list': 'user_view',
  '/role/list': 'role_view',
  '/client/list': 'client_view',
  '/project/list': 'project_view',
  '/task/list': 'task_view',
};

// Fallbacks, in order of preference
const FALLBACK_PAGES = ['/admin/dashboard', '/director/dashboard', '/user/dashboard', '/task/list', '/project/list'];
const LAST_RESORT = '/leaveRequest/list';

function canOpen(page, permissions) {
  const needed = PAGE_PERMISSION[page];
  return !needed || permissions.includes(needed);
}

/** The landing page for a role document ({ homePage | homeURL }) and the user's permissions. */
export function resolveLandingPage(roleData, permissions) {
  const home = roleData && (roleData.homePage || roleData.homeURL);
  if (home && canOpen(home, permissions)) return home;
  return FALLBACK_PAGES.find((page) => canOpen(page, permissions)) || LAST_RESORT;
}

/** Looks up the role and the user's permissions, then calls navigate(landingPage). */
export function goToLandingPage(roleId, navigate) {
  let roleData;
  let permissions;
  let pending = 2;
  const done = () => {
    pending -= 1;
    if (pending === 0) navigate(resolveLandingPage(roleData, permissions || []), { replace: true });
  };
  api.call('role.roleName', roleId, (err, data) => {
    if (err) console.error('Error fetching role:', err);
    roleData = err ? null : data;
    done();
  });
  api.call('user.getMyPermissions', (err, list) => {
    permissions = !err && Array.isArray(list) ? list : [];
    done();
  });
}
