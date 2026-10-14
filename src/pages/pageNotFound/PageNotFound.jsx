import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { loadScripts } from '../../lib/loadScript';

// The scripts of this page that are not already loaded by index.html.
const PAGE_SCRIPTS = [
  '/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js',
  '/assets/vendor/js/menu.js',
  '/assets/js/main.js',
];
const ASYNC_SCRIPTS = ['https://buttons.github.io/buttons.js'];

export default function PageNotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadScripts(PAGE_SCRIPTS);
    loadScripts(ASYNC_SCRIPTS);
  }, []);

  const userType = user ? user.userType : undefined;
  const isAdmin = userType === 'MainUser';
  const isSalesPerson = userType === 'subUser' || userType === 'vansaleUser';

  return (
    <>
      {/* Page */}
      <link rel="stylesheet" href="/assets/vendor/css/pages/page-misc.css" />

      {/* Content */}
      {/* Error */}
      <div className="container-xxl container-p-y">
        <div className="misc-wrapper">
          <h2 className="mb-2 mx-2">Page Not Found :(</h2>
          <p className="mb-4 mx-2">Oops! 😖 The requested URL was not found on this server.</p>
          {user ? (
            <>
              {isAdmin && (
                <button className="btn btn-primary toAdminPage" onClick={() => navigate('/admin/dashboard', { replace: true })}>Back to home</button>
              )}
              {isSalesPerson && (
                <button className="btn btn-primary toSalesPage" onClick={() => navigate('/admin/dashboard', { replace: true })}>Back to home</button>
              )}
            </>
          ) : (
            <button className="btn btn-primary toLoginPage" onClick={() => navigate('/login', { replace: true })}>Back to home</button>
          )}
          <div className="mt-3">
            <img
              src="/assets/img/illustrations/page-misc-error-light.png"
              alt="page-misc-error-light"
              width="500"
              className="img-fluid"
              data-app-dark-img="illustrations/page-misc-error-dark.png"
              data-app-light-img="illustrations/page-misc-error-light.png"
            />
          </div>
        </div>
      </div>
      {/* /Error */}

      {/* / Content */}
    </>
  );
}
