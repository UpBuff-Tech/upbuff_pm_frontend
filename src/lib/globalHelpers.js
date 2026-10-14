// The global template helpers of the old app (Template.registerHelper in layouts/menu/menu.js and
// layouts/header/update.js). In a component:
//
//   const { appName, logo, href, userName, roleName, userCan, profileImage } = useGlobalHelpers();
//   {appName && appName.app}            // was {{#with appName}}{{app}}{{/with}}

import { getCurrentUser, useAuth } from '../auth/AuthContext';

/** Config.findOne({ name }) on a list of config documents. */
function findConfig(configs, name) {
  return (configs || []).find((config) => config.name === name);
}

/** { [key]: value } when the config exists, otherwise undefined (so `{{#with helper}}` renders nothing). */
function configObject(configs, name, key) {
  const config = findConfig(configs, name);
  if (config) return { [key]: config.value };
  return undefined;
}

export const printLoaderImage = (configs) => configObject(configs, 'printLoader', 'printLoaderImg');

export const connectionLoad = () => ({ connectionLoaderImg: '/img/body-loader.gif' });

export const userName = (configs) => configObject(configs, 'userName', 'user');

export const appName = (configs) => configObject(configs, 'appName', 'app');

export const bodyLoader = () => ({ bodyLoader_img: '/img/body-loader.gif' });

export const href = (configs) => configObject(configs, 'url', 'href_url');

export const logo = (configs) => configObject(configs, 'logo', 'logo_img');

export const roleName = (configs) => {
  const config = findConfig(configs, 'roleName');
  return { role: (config && config.value) || 'Role' };
};

/**
 * This is to load all required config objects for login page in a single call
 */
export const loginConfig = (configs) => {
  const values = {};
  (configs || [])
    .filter((config) => ['userName', 'url', 'logo', 'appName'].includes(config.name))
    .forEach((config) => {
      values[config.name] = config.value;
    });
  return values;
};

/** The profile image of the user, or the default avatar. */
export function getProfileImage(user = getCurrentUser()) {
  let image = '';
  if (user) {
    image = user.profile.image;
    if (!image) image = '/img/user.png';
  }
  return image;
}

/** All global helpers for a list of config documents (use this where nobody is logged in yet). */
export function globalHelpers(configs) {
  return {
    printLoaderImage: printLoaderImage(configs),
    connectionLoad: connectionLoad(),
    userName: userName(configs),
    appName: appName(configs),
    bodyLoader: bodyLoader(),
    href: href(configs),
    logo: logo(configs),
    roleName: roleName(configs),
    loginConfig: loginConfig(configs),
  };
}

/** All global helpers for the logged-in user. */
export function useGlobalHelpers() {
  const { user, configs, userCan } = useAuth();
  return {
    ...globalHelpers(configs),
    userCan,
    profileImage: getProfileImage(user),
  };
}
