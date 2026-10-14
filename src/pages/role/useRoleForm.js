/**
 * @author Nithin
 */

// The state of one role form (the create modal and the edit modal each have one):
// the text fields, the permission check boxes and the "Select All" boxes.
//
//   const form = useRoleForm();
//   form.fields.name, form.permissions.user_view, form.selectAll.user
//   form.setField('name', value), form.togglePermission(section, 'user_view', true),
//   form.toggleSelectAll(section, true), form.reset(), form.loadRole(roleDetail)

import { useState } from 'react';
import {
  PERMISSION_SECTIONS, AUTO_SELECT_ALL_SECTIONS, EDIT_RESET_SECTIONS, EDIT_SELECT_ALL_SECTIONS,
  AVAILABLE_PAGES, isSectionFullyChecked,
} from './permissions';

const EMPTY_FIELDS = { name: '', description: '', homeURL: '', activeStatus: 'true' };
const EMPTY_CHECKS = { permissions: {}, selectAll: {} };

export function useRoleForm() {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  // permissions: { user_view: true, ... }   selectAll: { user: true, ... }   (missing = not ticked)
  const [checks, setChecks] = useState(EMPTY_CHECKS);

  const setField = (name, value) => {
    setFields((old) => ({ ...old, [name]: value }));
  };

  /** A "Select All" box was changed: tick or untick every box of its card. */
  const toggleSelectAll = (section, isChecked) => {
    setChecks((old) => {
      const permissions = { ...old.permissions };
      section.items.forEach((item) => {
        permissions[item.name] = isChecked;
      });
      return { permissions, selectAll: { ...old.selectAll, [section.key]: isChecked } };
    });
  };

  /** One permission box was changed: the "Select All" box of its card follows. */
  const togglePermission = (section, name, isChecked) => {
    setChecks((old) => {
      const permissions = { ...old.permissions, [name]: isChecked };
      const selectAll = { ...old.selectAll };
      if (AUTO_SELECT_ALL_SECTIONS.includes(section.key)) {
        selectAll[section.key] = isSectionFullyChecked(section, permissions);
      }
      return { permissions, selectAll };
    });
  };

  /** Back to the empty form (what form.reset() did). */
  const reset = () => {
    setFields(EMPTY_FIELDS);
    setChecks(EMPTY_CHECKS);
  };

  /** Edit modal: populates the form with role data. */
  const loadRole = (roleDetail) => {
    // Database stores as 'homePage'. A page that is not in the dropdown selects nothing.
    const homePage = roleDetail.homePage || '';
    const isKnownPage = AVAILABLE_PAGES.some((page) => page.url === homePage);

    // Populate basic fields
    setFields({
      name: roleDetail.name || '',
      description: roleDetail.description || '',
      homeURL: isKnownPage ? homePage : '',
      activeStatus: roleDetail.active ? 'true' : 'false',
    });

    // Handle permissions - support both object and array formats
    let rolePermissions = roleDetail.permissions || {};

    // If permissions is an array (old format), convert to object
    if (Array.isArray(rolePermissions)) {
      let permObj = {};
      rolePermissions.forEach((p) => {
        permObj[p] = true;
      });
      rolePermissions = permObj;
    }

    setChecks((old) => {
      const permissions = { ...old.permissions };

      PERMISSION_SECTIONS.forEach((section) => {
        section.items.forEach((item) => {
          // Reset all checkboxes first
          if (EDIT_RESET_SECTIONS.includes(section.key)) {
            permissions[item.name] = false;
          }
          if (rolePermissions[item.name] || (item.legacyName && rolePermissions[item.legacyName])) {
            permissions[item.name] = true;
          }
        });
      });

      // Update Select All checkboxes based on checked permissions
      const selectAll = {};
      PERMISSION_SECTIONS.forEach((section) => {
        if (EDIT_SELECT_ALL_SECTIONS.includes(section.key)) {
          selectAll[section.key] = isSectionFullyChecked(section, permissions);
        }
      });

      return { permissions, selectAll };
    });
  };

  return {
    fields,
    permissions: checks.permissions,
    selectAll: checks.selectAll,
    setField,
    toggleSelectAll,
    togglePermission,
    reset,
    loadRole,
  };
}
