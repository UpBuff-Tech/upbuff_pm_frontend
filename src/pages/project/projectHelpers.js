/**
 * @author Visakh
 */

// Plain functions shared by the components of the Project page.

import moment from 'moment';
import api from '../../api/client';

/**
 * Escape regex metacharacters so user input is treated as a literal substring.
 */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build pagination filters combining the base "not deleted" rule with the
 * optional client-scoped filter and the optional search query (server-side
 * regex across name/description/companyName so results span all pages).
 *
 * Uses { $regex, $options } strings instead of `new RegExp(...)` so the
 * filters can be sent to the server as plain JSON.
 */
export function buildProjectFilters(clientCompanyName, searchQuery) {
  const filters = { isDeleted: { $ne: true } };

  if (clientCompanyName) {
    filters.companyName = clientCompanyName;
  }

  if (searchQuery && searchQuery.trim()) {
    const pattern = escapeRegex(searchQuery.trim());
    filters.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { description: { $regex: pattern, $options: 'i' } },
      { companyName: { $regex: pattern, $options: 'i' } }
    ];
  }

  return filters;
}

/**
 * Whether a task is running late against its baseline finish.
 *
 * Shared by the "Project Details" task table and its export so the badge and
 * the exported column can never disagree.
 */
export function getTimelineStatus(task) {
  if (!task.baselineFinish) return { text: '-', color: 'secondary' };

  const today = new Date();
  const baselineFinish = new Date(task.baselineFinish);
  const actualFinish = task.actualFinish ? new Date(task.actualFinish) : null;

  // If task is completed
  if (task.status === 'Completed' && actualFinish) {
    if (actualFinish > baselineFinish) {
      const delayDays = Math.ceil((actualFinish - baselineFinish) / (1000 * 60 * 60 * 24));
      return { text: `Delayed by ${delayDays}d`, color: 'danger' };
    }
    return { text: 'On Time', color: 'success' };
  }

  // If task is in progress or pending
  if (today > baselineFinish && task.status !== 'Completed') {
    const delayDays = Math.ceil((today - baselineFinish) / (1000 * 60 * 60 * 24));
    return { text: `${delayDays}d overdue`, color: 'danger' };
  }

  // Task is on track
  return { text: 'On Track', color: 'success' };
}

/* ---------------------------------------------------------------- project cards */

/** Avatar colour, initials and status key shared by the project cards and the details modal. */
const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0d9488', '#ea580c'];

export function avatarColor(text) {
  let hash = 0;
  for (let i = 0; i < (text || '').length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name) {
  if (!name) return '?';
  // Words that start with a letter or digit only ("Foxtale - Unicommerce" -> "FU")
  const words = name.split(/\s+/).filter((part) => /^[\p{L}\p{N}]/u.test(part));
  return (words.length ? words : [name]).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

/** Status key for styling: notstarted | inprogress | completed | unscheduled */
export function statusKey(status) {
  return { 'Not Started': 'notstarted', 'In Progress': 'inprogress', 'Completed': 'completed' }[status] || 'unscheduled';
}


/**
 * Get company/client name by ID (from the loaded clients list)
 */
export function getCompanyName(clientsList, companyId) {
  if (!companyId) return 'N/A';
  const clients = clientsList || [];
  const client = clients.find(c => c._id === companyId);
  return client ? client.clientName : 'Unknown';
}

/** "First Last" of a user profile. */
export function profileFullName(profile) {
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
}

/**
 * The only user document the browser knows without asking the server is the
 * logged-in user. Returns it when `userId` is that user, otherwise nothing.
 */
export function findKnownUser(loggedInUser, userId) {
  return loggedInUser && loggedInUser._id === userId ? loggedInUser : undefined;
}

/**
 * Get user name by ID
 */
export function getUserName(loggedInUser, userId) {
  if (!userId) return 'N/A';

  const user = findKnownUser(loggedInUser, userId);
  if (user && user.profile) {
    return profileFullName(user.profile);
  }
  return 'Not assigned';
}

/**
 * Calculate project status based on dates
 */
export function getProjectStatus(project) {
  if (!project.startDate || !project.endDate) return 'Not Scheduled';

  const now = new Date();
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);

  if (now < start) return 'Not Started';
  if (now > end) return 'Completed';
  return 'In Progress';
}

/**
 * Get badge class based on project status
 * Completed: green, In Progress: orange, Not Started/Pending: blue
 */
export function getProjectStatusClass(project) {
  if (!project.startDate || !project.endDate) return 'bg-label-secondary';

  const now = new Date();
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);

  if (now > end) return 'bg-label-success'; // Completed - green
  if (now < start) return 'bg-label-primary'; // Not Started/Pending - blue
  return 'bg-label-warning'; // In Progress - orange
}

/**
 * Calculate project timeline in days
 */
export function getProjectDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Total time spent on project tasks, e.g. "12h 30m", "4h", "45m", "0h"
 */
export function formatProjectTimeSpent(totalSeconds) {
  if (!totalSeconds) return '0h';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Format date helper of the project cards ("Mar 05, 2026")
 */
export function formatProjectDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
}

/**
 * Helper function to count folders recursively
 */
export function countFoldersRecursive(folders) {
  if (!folders || !Array.isArray(folders)) return 0;
  let count = folders.length;
  folders.forEach(folder => {
    if (folder.children && folder.children.length > 0) {
      count += countFoldersRecursive(folder.children);
    }
  });
  return count;
}

/* ---------------------------------------------------------------- task badges and dates */

/** Badge colour of a task status in the Tasks tab of the project form. */
export function getFormTaskStatusBadge(status) {
  if (status === 'Completed') return 'success';
  if (status === 'In Progress') return 'primary';
  if (status === 'Testing') return 'info';
  if (status === 'On Hold') return 'secondary';
  return 'warning';
}

/** Badge colour of a task status in the "Project Details" and "Imported Tasks" tables. */
export function getTaskStatusClass(status) {
  return {
    'Completed': 'success',
    'In Progress': 'info',
    'Pending': 'warning',
    'On Hold': 'secondary',
    'Cancelled': 'danger'
  }[status] || 'secondary';
}

/**
 * Helper function to get status badge class (calendar legend colours)
 */
export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'warning';
    case 'In Progress': return 'primary';
    case 'On Hold': return 'secondary';
    case 'Testing': return 'info';
    case 'Completed': return 'success';
    default: return 'secondary';
  }
}

/** "05/03/2026" ('-' for an empty date) */
export function formatSlashDate(date) {
  return date ? moment(date).format('DD/MM/YYYY') : '-';
}

/** "05 Mar 2026" in the browser's en-GB format ('-' for an empty date) */
export function formatShortDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* ---------------------------------------------------------------- attachments */

/**
 * Get file icon based on mime type
 */
export function getFileIcon(mimeType) {
  if (!mimeType) return 'fa fa-file';

  if (mimeType.includes('pdf')) return 'fa fa-file-pdf-o';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa fa-file-word-o';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa fa-file-excel-o';
  if (mimeType.includes('image')) return 'fa fa-file-image-o';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa fa-file-archive-o';

  return 'fa fa-file';
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function triggerFileDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** The id an attachment is known by (use name as fallback if no id) */
export function getAttachmentId(attachment) {
  return attachment.id || attachment.name;
}

/**
 * Download a saved project attachment (the click of a ".download-existing-attachment" button).
 */
export function downloadExistingAttachment(event, projectId, attachmentId) {
  event.preventDefault();
  const button = event.currentTarget;

  if (!projectId || !attachmentId) {
    toastr.error('Unable to download: missing file reference');
    return;
  }

  button.disabled = true;
  api.call('project.downloadAttachment', projectId, attachmentId, (err, result) => {
    button.disabled = false;
    if (err) {
      toastr.error('Failed to download: ' + (err.reason || 'Unknown error'));
      return;
    }
    triggerFileDownload(result.data, result.name);
  });
}

/**
 * Upload attachments to file storage system
 * @param {String} projectId - Project ID
 * @param {Array} attachments - Array of attachments with data
 * @param {Function} callback - Callback function (error, successCount)
 */
export function uploadProjectAttachments(projectId, attachments, callback) {
  if (!attachments || attachments.length === 0) {
    callback(null, 0);
    return;
  }

  let uploadedCount = 0;
  let hasError = false;

  attachments.forEach((attachment, index) => {
    // Only upload attachments that have data (new uploads)
    // Skip attachments that already have path (already uploaded)
    if (attachment.data && !attachment.path) {
      api.call('project.addAttachment', projectId, attachment, (error) => {
        if (error) {
          console.error(`Failed to upload ${attachment.name}:`, error);
          hasError = true;
        } else {
          uploadedCount++;
        }

        // Check if this is the last attachment
        if (index === attachments.length - 1) {
          if (hasError) {
            const uploadError = new Error(`Failed to upload some files. ${uploadedCount} of ${attachments.length} uploaded successfully.`);
            uploadError.error = 'upload-failed';
            uploadError.reason = uploadError.message;
            callback(uploadError, uploadedCount);
          } else {
            callback(null, uploadedCount);
          }
        }
      });
    } else {
      // Skip already uploaded attachments
      if (index === attachments.length - 1) {
        callback(null, uploadedCount);
      }
    }
  });
}

/* ---------------------------------------------------------------- plugins */

/**
 * (Re)create select2 on a <select>. Called every time the options of the
 * select were refilled, so the plugin shows the new list.
 */
export function initSelect2(selector, options) {
  const $el = $(selector);
  if ($el.hasClass('select2-hidden-accessible')) {
    $el.select2('destroy');
  }
  $el.select2(options);
}

/** Remove select2 from a <select> (when its modal goes away). */
export function destroySelect2(selector) {
  $(selector).each(function () {
    if ($(this).hasClass('select2-hidden-accessible')) {
      $(this).select2('destroy');
    }
  });
}

/**
 * Lets plain functions reach the component that is on screen, e.g.
 *
 *   const handle = createComponentHandle();
 *   export function openProjectViewModal(id) { handle.call('open', id); }
 *   // inside the component:
 *   useEffect(() => handle.register({ open }));
 */
export function createComponentHandle() {
  let functions = null;
  return {
    register(value) {
      functions = value;
      return () => {
        if (functions === value) functions = null;
      };
    },
    call(name, ...args) {
      if (functions) return functions[name](...args);
      return undefined;
    }
  };
}

/** A copy of `list` with the item at index `from` moved to index `to`. */
export function moveItem(list, from, to) {
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
