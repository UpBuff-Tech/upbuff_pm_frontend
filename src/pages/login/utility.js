import { goToLandingPage, resolveLandingPage } from '../../lib/landingPage';
import api from '../../api/client';
import { Session } from '../../lib/session';

/**
 * Logs the user in with the values of the login form and opens the home page of their role.
 * @param target the login form
 * @param login, logout from useAuth(); navigate from useNavigate();
 *        setSigningIn(true|false) switches the "Sign in" button to "Signing in..."
 */
export const loginUser = async (target, { login, logout, navigate, setSigningIn }) => {
  const username = target.username;
  const password = target.password;
  setSigningIn(true);

  let user;
  let landing;
  try {
    ({ user, landing } = await login(username.value, password.value));
  } catch (error) {
    setSigningIn(false);
    toastr["error"]('Invalid User Credentials', 'ERROR');
    return;
  }

  // Persist the logged-in user's id so pages can scope "my data" queries
  // instantly on the next hard refresh, without waiting for the login
  // session to finish resuming (when the user id is briefly null).
  // Read back via currentUserId() in customFunctions.js.
  Session.setPersistent('loginUserId', user._id);

  // Check if user account is inactive
  if (user.active === 'N') {
    setSigningIn(false);
    toastr["error"]('Your account has been deactivated. Please contact administrator.', 'ERROR');
    logout();
    return;
  }

  // Check if user has a role assigned
  if (!user.roles || user.roles.length === 0) {
    setSigningIn(false);
    toastr["error"]('No role assigned to your account. Please contact administrator.', 'ERROR');
    logout();
    return;
  }

  // Client users have a plain string role, not a role _id
  if (user.profile && user.profile.role === 'client') {
    api.call('clients.getMyInfo', (err, client) => {
      if (client && client._id) {
        Session.set('clientId', client._id);
      }
      navigate('/client/dashboard');
    });
    return;
  }

  // The role's home page if the user may open it, else the first dashboard they're allowed.
  // The login answer already carries the role and permissions, so no extra round trips.
  if (landing) {
    navigate(resolveLandingPage(landing.role, landing.permissions), { replace: true });
    return;
  }
  goToLandingPage(user.roles[0], navigate);
};

/**
 * Sends the "forgot password" mail.
 * @param target the form with the email field
 */
export const forgetEmail = (target) => {
  const email = target.email;
  return api.request('POST', '/auth/forgotPassword', [{ email: email.value }]).then(
    () => {
      toastr["success"]("Success");
    },
    (error) => {
      toastr["error"]('Error:' + error.reason);
    }
  );
};
