// Who is logged in. Replaces Meteor.user(), Meteor.userId(), Meteor.loginWithPassword(),
// Meteor.logout(), the Meteor.roles / Config data the old routes.js loaded at login, and userCan().
//
//   const { user, userId, roles, configs, userCan, login, logout } = useAuth();

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearLogin, getStoredUserId, getToken, storeLogin } from '../api/client';
import { Session } from '../lib/session';

const AuthContext = createContext(null);

// Kept outside React too, so plain helper functions can read it (see lib/customFunctions.js).
let currentUser = null;
let currentPermissions = [];
export const getCurrentUser = () => currentUser;
export const getCachedPermissions = () => currentPermissions;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we know whether the saved token is still valid (Meteor.loggingIn()).
  const [loggingIn, setLoggingIn] = useState(!!getToken());
  const [roles, setRoles] = useState([]);       // role.getList      (old Meteor.roles)
  const [configs, setConfigs] = useState([]);   // config.getList    (old Config collection)
  const [permissions, setPermissions] = useState([]); // user.getMyPermissions

  const applyUser = useCallback((value) => {
    currentUser = value || null;
    setUser(currentUser);
  }, []);

  /** Re-reads the logged-in user from the server (call after changing the profile). */
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      applyUser(null);
      return null;
    }
    const me = await api.request('GET', '/auth/me');
    if (!me) clearLogin(); // token expired or removed
    applyUser(me);
    return me || null;
  }, [applyUser]);

  /** Loads what the old routes.js / customFunctions.js fetched as soon as a user was logged in. */
  const loadSessionData = useCallback(() => {
    api.call('role.getList', (err, list) => { if (!err && list) setRoles(list); });
    api.call('config.getList', (err, list) => { if (!err && list) setConfigs(list); });
    api.call('user.getMyPermissions', (err, list) => {
      if (!err && list) {
        currentPermissions = list;
        setPermissions(list);
      }
    });
  }, []);

  // On page load: resume the saved login.
  useEffect(() => {
    refreshUser()
      .catch(() => {})
      .finally(() => setLoggingIn(false));
  }, [refreshUser]);

  const userId = user ? user._id : null;
  useEffect(() => {
    if (userId) {
      loadSessionData();
    } else {
      currentPermissions = [];
      setPermissions([]);
    }
  }, [userId, loadSessionData]);

  /**
   * Meteor.loginWithPassword(username, password). Returns { user, landing } - landing is
   * { permissions, role } for picking the landing page (absent from older servers); throws on
   * wrong credentials.
   */
  const login = useCallback(async (username, password) => {
    const result = await api.request('POST', '/auth/login', [username, password]);
    storeLogin(result.id, result.token);
    if (result.landing && Array.isArray(result.landing.permissions)) {
      currentPermissions = result.landing.permissions;
      setPermissions(result.landing.permissions);
    }
    applyUser(result.user);
    return { user: result.user, landing: result.landing || null };
  }, [applyUser]);

  /** Used after Accounts.resetPassword / verifyEmail, which also log the user in. */
  const loginWithResult = useCallback((result) => {
    storeLogin(result.id, result.token);
    applyUser(result.user);
  }, [applyUser]);

  /** Meteor.logout() */
  const logout = useCallback(async () => {
    try {
      await api.request('POST', '/auth/logout', []);
    } catch (e) { /* logging out locally is enough */ }
    clearLogin();
    applyUser(null);
  }, [applyUser]);

  const value = useMemo(() => ({
    user,
    // While the saved login is being resumed the user object is not there yet; the stored id is.
    userId: userId || (loggingIn ? getStoredUserId() : null),
    loggingIn,
    roles,
    configs,
    permissions,
    userCan: (permission) => permissions.includes(permission),
    configValue: (name) => {
      const found = configs.find((config) => config.name === name);
      return found ? found.value : undefined;
    },
    login,
    loginWithResult,
    logout,
    refreshUser,
    reloadRoles: loadSessionData,
  }), [user, userId, loggingIn, roles, configs, permissions, login, loginWithResult, logout, refreshUser, loadSessionData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** currentUserId() from the old customFunctions.js, for code outside components. */
export function currentUserId() {
  if (currentUser) return currentUser._id;
  return Session.get('loginUserId') || getStoredUserId() || null;
}
