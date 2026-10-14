// The template helpers of the user list (plain functions).

import moment from 'moment';

export function activeHelper(active) {
  let activeCheck = active;
  if (activeCheck === "Y") {
    return true;
  }
  else {
    return false
  }
}

/**
 * Get role name from role ID using server-fetched roles list
 */
export function getUserRole(roleIds, rolesList) {
  if (!roleIds || roleIds.length === 0) return '-';

  const roles = rolesList || [];
  for (let i = 0; i < roleIds.length; i++) {
    const role = roles.find(r => r._id === roleIds[i] && r.name);
    if (role) return role.name;
  }
  return '-';
}

/**
 * Format date for display
 */
export function formatDate(date) {
  if (!date) return '-';
  return moment(date).format('DD-MM-YYYY');
}

/**
 * Get initials from name for avatar
 */
export function getInitials(name) {
  if (!name) return '?';
  let parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

/**
 * The users of the current page that match the search box
 * (name, email, contact, username or role name). All of them when nothing is searched.
 * @param users        the users of the current page
 * @param searchQuery  the text of the search box
 * @param allRoles     every role (to search by role name)
 */
export function filterUsers(users, searchQuery, allRoles) {
  if (!searchQuery) return users;

  // Client-side filtering for search
  return users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = user.profile && user.profile.firstName && user.profile.firstName.toLowerCase().includes(searchLower);
    const emailMatch = user.emailAddress && user.emailAddress.toLowerCase().includes(searchLower);
    const companyEmailMatch = user.companyEmail && user.companyEmail.toLowerCase().includes(searchLower);
    const contactMatch = user.contactNo && user.contactNo.toLowerCase().includes(searchLower);
    const usernameMatch = user.username && user.username.toLowerCase().includes(searchLower);

    // Search by role name
    let roleMatch = false;
    if (user.roles && user.roles.length > 0) {
      let role = allRoles.find(r => r._id === user.roles[0]);
      roleMatch = role && role.name && role.name.toLowerCase().includes(searchLower);
    }

    return nameMatch || emailMatch || companyEmailMatch || contactMatch || usernameMatch || roleMatch;
  });
}
