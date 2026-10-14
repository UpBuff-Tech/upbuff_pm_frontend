/**
 * What the folder tree, its two modals and the pages share.
 *
 * The old templates talked to each other through static properties
 * (`Template.folderFormModal.editingFolderId = ...`) and a jQuery event
 * (`$('.folder-tree').trigger('refreshTree')`). The same hand-offs are plain functions here:
 *
 *   setFolderFormModal({ editingFolderId, parentFolderId, parentFolderName })  // before opening #folderFormModal
 *   prefillFolderForm({ name, description, visibility })                       // fill the form for editing
 *   setDeleteFolderModal({ deletingFolderId, deletingFolderName, ... })        // before opening #deleteFolderModal
 *   refreshFolderTrees()                                                       // reload every folder tree on the page
 */
import { Session, useSession } from '../../lib/session';

const FORM_MODAL_KEY = 'folderFormModal';
const DELETE_MODAL_KEY = 'deleteFolderModal';

const EMPTY_FORM_MODAL = {
  editingFolderId: null,
  parentFolderId: null,
  parentFolderName: null
};

const EMPTY_DELETE_MODAL = {
  deletingFolderId: null,
  deletingFolderName: '',
  hasSubfolders: false,
  hasFiles: false,
  fileCount: 0
};

/** A list of functions to call later: on(listener) registers one (and returns "unregister"), emit() calls them all. */
function createSignal() {
  const listeners = new Set();
  return {
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(...args) {
      listeners.forEach((listener) => listener(...args));
    }
  };
}

/* ---------------------------------------------------------------- folder form modal */

/** What the folder form modal is doing: editing a folder, or creating one (optionally under a parent). */
export function getFolderFormModal() {
  return Session.get(FORM_MODAL_KEY) || EMPTY_FORM_MODAL;
}

export function setFolderFormModal(values) {
  Session.set(FORM_MODAL_KEY, Object.assign({}, EMPTY_FORM_MODAL, values));
}

export function resetFolderFormModal() {
  Session.set(FORM_MODAL_KEY, EMPTY_FORM_MODAL);
}

/** For components: re-renders when the values change. */
export function useFolderFormModal() {
  return useSession(FORM_MODAL_KEY) || EMPTY_FORM_MODAL;
}

const prefillSignal = createSignal();

/** Put a folder's values in the form fields of the folder form modal. */
export function prefillFolderForm(values) {
  prefillSignal.emit(values);
}

export const onPrefillFolderForm = prefillSignal.on;

/* ---------------------------------------------------------------- delete folder modal */

export function getDeleteFolderModal() {
  return Session.get(DELETE_MODAL_KEY) || EMPTY_DELETE_MODAL;
}

/** Changes only the values given (the others stay as they are). */
export function setDeleteFolderModal(values) {
  Session.set(DELETE_MODAL_KEY, Object.assign({}, getDeleteFolderModal(), values));
}

/** For components: re-renders when the values change. */
export function useDeleteFolderModal() {
  return useSession(DELETE_MODAL_KEY) || EMPTY_DELETE_MODAL;
}

/* ---------------------------------------------------------------- refreshing the trees */

const refreshSignal = createSignal();

/** Reload the root folders of every folder tree on the page (was `$('.folder-tree').trigger('refreshTree')`). */
export function refreshFolderTrees() {
  refreshSignal.emit();
}

export const onRefreshFolderTrees = refreshSignal.on;

/* ---------------------------------------------------------------- which project / task a new folder belongs to */

/**
 * Remember on the folder form modal which project (or task) the folder being created belongs to.
 * The modal reads it back when "Create Folder" is clicked.
 */
export function setFolderFormContext({ folderProjectId, projectId, projectIds, taskId }) {
  const modal = $('#folderFormModal');

  if (folderProjectId) {
    modal.data('projectId', folderProjectId);
  } else if (projectId) {
    modal.data('projectId', projectId);
  } else if (projectIds && projectIds.length > 0) {
    // Use first project ID from array (for documentRepository context)
    modal.data('projectId', projectIds[0]);
  } else if (taskId) {
    modal.data('taskId', taskId);
  }

  return modal;
}
