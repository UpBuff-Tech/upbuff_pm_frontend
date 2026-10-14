/**
 * @author Nithin
 */

import api from '../../api/client';
import { Session } from '../../lib/session';
import { PERMISSION_KEYS } from './permissions';

/**
 * Puts a text in the body of a message modal (#roleSuccessModal / #roleErrorModal) and shows it.
 * @param modalId
 * @param text
 */
export const showMessageModal = (modalId, text) => {
  $(modalId).find('.modal-body').text(text);
  $(modalId).modal();
};

/**
 * Collect permissions object: one true/false per permission.
 * @param checked   the ticked permission boxes of the form: { user_view: true, ... }
 */
export const collectPermissions = (checked) => {
  let permissions = {};
  PERMISSION_KEYS.forEach((key) => {
    permissions[key] = checked[key] ? true : false;
  });
  return permissions;
};

/**
 * Refresh the roles FIRST, then clear the cached permissions, so the menu and the
 * permission checks are rebuilt from the saved role data.
 * @param reloadRoles   reloadRoles() of useAuth()
 */
const refreshRolesAndPermissions = (reloadRoles) => {
  reloadRoles();
  Session.set('userPermission', '');
};

/**
 * Create a role with clean permission structure
 * @param target    the create form: { name, description, homeURL, activeStatus, parentId, permissions }
 * @param id
 * @param reloadRoles   reloadRoles() of useAuth()
 * @param onSaved       called after the role was saved (the page empties the form here)
 */
export const createRole = (target, id, { reloadRoles, onSaved }) => {
  // Basic info
  let name = target.name;
  let description = target.description;
  let url = target.homeURL;
  let activeStatus = target.activeStatus;
  let parentId = target.parentId ? target.parentId : null;

  let permissions = collectPermissions(target.permissions);

  api.call('role.createOrUpdateSimple', id, name, description, url, activeStatus === 'true', permissions, parentId || null,
    (err) => {
      if (err) {
        showMessageModal('#roleErrorModal', err.reason);
      }
      else {
        refreshRolesAndPermissions(reloadRoles);

        $('#ic-create').modal('hide');
        onSaved();
        showMessageModal('#roleSuccessModal', 'Role has been registered successfully');
      }
    });
};

/**
 * Update existing role with clean permission structure
 * @param target    the edit form: { _idRole, name, description, homeURL, activeStatus, permissions }
 * @param reloadRoles   reloadRoles() of useAuth()
 * @param onSaved       called after the role was saved (the page empties the form here)
 */
export const updateRole = (target, { reloadRoles, onSaved }) => {
  // Basic info
  let id = target._idRole;
  let name = target.name;
  let description = target.description;
  let url = target.homeURL;
  let activeStatus = target.activeStatus;

  let permissions = collectPermissions(target.permissions);

  api.call('role.createOrUpdateSimple', id, name, description, url, activeStatus === 'true', permissions, '__KEEP__',
    (err) => {
      if (err) {
        showMessageModal('#roleErrorModal', err.reason);
      }
      else {
        refreshRolesAndPermissions(reloadRoles);

        $('#ic-edit').modal('hide');
        onSaved();
        showMessageModal('#roleSuccessModal', 'Role has been updated successfully');
      }
    });
};

const UNMISTAKABLE_CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * A random text of `length` characters (what Random.id().slice(-length) gave).
 * @param length
 */
export const randomChars = (length) => {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += UNMISTAKABLE_CHARS.charAt(Math.floor(Math.random() * UNMISTAKABLE_CHARS.length));
  }
  return text;
};
