// The page frame around every page (the old "main" layout template):
// the side menu for logged-in users, the bare layout for the login pages,
// the "connecting" overlay and the logout confirmation.

import { Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { isConnected, onConnectionChange } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { loadScripts } from '../lib/loadScript';
import { Session, useSession } from '../lib/session';
import Menu from './menu/Menu';
import Topbar from './header/Topbar';
import { restoreSidebar } from './sidebarState';
import Footer from './footer/Footer';
import AttendanceFab from '../components/attendanceFab/AttendanceFab';
import AttendanceRevokeModal from '../components/attendanceRevokeModal/AttendanceRevokeModal';
import NotificationPopup from '../components/notifications/NotificationPopup';
import PageLoader from '../components/loader/PageLoader';
import { PageSkeleton } from '../components/skeleton/Skeleton';

// Pages that are shown without the menu even when a user is logged in.
const PUBLIC_PATHS = ['/login', '/signup', '/fingerprint-login', '/login/forgetPassword', '/signout'];

// Theme scripts. main.js sets up the side menu, so it must run after the menu is on the page.
const LAYOUT_SCRIPTS = [
  '/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js',
  '/assets/vendor/libs/apex-charts/apexcharts.js',
  '/assets/vendor/js/menu.js',
  '/assets/js/main.js',
  '/assets/js/ui-toasts.js',
  '/assets/js/ui-modals.js',
  '/assets/js/ui-popover.js',
];
// This one had "async defer": it never held up the scripts after it.
const ASYNC_SCRIPTS = ['https://buttons.github.io/buttons.js'];

export default function MainLayout({ children }) {
  const { user, userId, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const connTest = useSession('connectTest');

  // Only show menu/layout when user is logged in AND not on a public page (login, signup, etc.)
  const isAuthenticatedPage = !!userId && !PUBLIC_PATHS.includes(location.pathname);

  useEffect(() => {
    restoreSidebar();
  }, []);

  useEffect(() => {
    loadScripts(LAYOUT_SCRIPTS);
    loadScripts(ASYNC_SCRIPTS);
  }, [isAuthenticatedPage]);

  /**
   * Connectivity test
   */
  useEffect(() => {
    const networkCheck = () => {
      if (isConnected() === false) {
        Session.set('connectTest', false);
        // Try the server again, so the overlay disappears when it is back.
        api.request('GET', '/auth/me').catch(() => {});
      } else {
        Session.set('connectTest', true);
      }
    };
    const timer = setInterval(networkCheck, 2000);
    const stopListening = onConnectionChange((connected) => Session.set('connectTest', connected));
    return () => {
      clearInterval(timer);
      stopListening();
    };
  }, []);

  const confirmLogout = (e) => {
    e.preventDefault();
    $('#logoutConfirmModal').modal('hide');

    // Logout does NOT stop running timers: the timer is server-side state and
    // work may continue (or resume after re-login). Punch-out, the 8h cap and
    // the stale-timer cron are the mechanisms that bound running timers.
    localStorage.removeItem('taskCardTimers');
    Session.setPersistent('userRole', '');
    Session.set('userPermission', '');
    Session.setPersistent('loginCompanyId', '');
    Session.setPersistent('companyAdmin', false);
    Session.setPersistent('superAdminValue', false);
    Session.setPersistent('dynamicData', '');
    Session.set('clientId', null);
    sessionStorage.clear();
    Session.clearPersistent();
    logout().then(() => {
      navigate('/login', { replace: true });
    });
  };

  return (
    <>
      {isAuthenticatedPage ? (
        <>
          <div className="layout-wrapper layout-content-navbar wrapper">
            <div className="layout-container">
              <Menu />
              <div className="layout-page">
                <Topbar />
                <Suspense fallback={<PageSkeleton />}>
                  {children}
                </Suspense>
                <Footer />
              </div>
              <div className="content-backdrop fade"></div>
              <div className="layout-overlay layout-menu-toggle"></div>
            </div>
          </div>
          <AttendanceFab />
          <AttendanceRevokeModal />
          <NotificationPopup />
        </>
      ) : (
        <div className="layout-wrapper layout-content-navbar wrapper">
          <div className="layout-container">
            <div className="layout-page">
              <Suspense fallback={<PageLoader />}>
                {children}
              </Suspense>
              <div className="login_footer">
                <Footer />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* connectTest is undefined until the first check, which is not "disconnected" */}
      {user && connTest === false && (
        <div id="bodySpin">
          <PageLoader label="Reconnecting to server…" />
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <div className="modal fade fx-logout-modal" id="logoutConfirmModal" tabIndex="-1" aria-labelledby="logoutConfirmModalLabel"
        aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <button type="button" className="fx-logout-close" data-dismiss="modal" aria-label="Close">
              <i className="bx bx-x"></i>
            </button>
            <div className="fx-logout-body">
              <span className="fx-logout-icon"><i className="bx bx-log-out"></i></span>
              <h5 className="fx-logout-title" id="logoutConfirmModalLabel">Log out of Fiëro?</h5>
              <p className="fx-logout-text">You'll need to sign in again to access your workspace.</p>
              <div className="fx-logout-note">
                <i className="bx bx-time-five"></i>
                <span>Running task timers keep going after you log out.</span>
              </div>
            </div>
            <div className="fx-logout-actions">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Stay signed in</button>
              <button type="button" className="btn btn-danger" id="confirmLogoutBtn" onClick={confirmLogout}>
                <i className="bx bx-log-out me-1"></i>Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
