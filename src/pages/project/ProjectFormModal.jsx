/**
 * Project Create/Edit Modal (#projectFormModal) with its tabs (details, team, tasks, import,
 * documents, calendar), followed by the Add/Edit Task Modal (#taskFormModal) it opens.
 *
 *   <ProjectFormModal clientsList={...} setClientsList={...} allUsersList={...} setAllUsersList={...}
 *     isClient={...} editingProjectId={...} setEditingProjectId={...} formTasksExport={...} />
 *
 *   openCreateProjectModal();
 *   openEditProjectModal(projectId);
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { showModalLoader, hideModalLoader, showButtonLoader } from '../../components/loader';
import { refreshFolderTrees } from '../../components/folderTree/folderTreeState';
import { openCreateClientModal } from '../client/ClientFormModal';
import {
  createComponentHandle,
  destroySelect2,
  getAttachmentId,
  initSelect2,
  moveItem,
  profileFullName,
  uploadProjectAttachments
} from './projectHelpers';
import { enrichTemplateTasks, excelRowsToTasks } from './projectTaskDates';
import { initializeProjectCalendar } from './projectCalendar';
import { openMoveAttachmentModal } from './MoveAttachmentModal';
import ProjectTasksTab from './ProjectTasksTab';
import ProjectImportTab from './ProjectImportTab';
import ProjectDocumentsTab from './ProjectDocumentsTab';
import ProjectTaskFormModal from './ProjectTaskFormModal';
import { fxConfirm } from '../../components/dialog/dialog';

const handle = createComponentHandle();

/** Open modal for creating new project */
export function openCreateProjectModal() {
  handle.call('openCreate');
}

/** Open modal for editing project */
export function openEditProjectModal(projectId) {
  handle.call('openEdit', projectId);
}

// What form.reset() leaves in the fields of #projectForm
const EMPTY_FORM = { projectName: '', description: '', startDate: '', endDate: '' };

const ROOT_FOLDER = 'Root (No Folder)';

/** Does an attachment belong to the folder (null = root, i.e. no folder)? */
function isInFolder(attachment, folderId) {
  if (folderId === null) {
    return !attachment.folderId || attachment.folderId === null;
  }
  return attachment.folderId === folderId;
}

/** The member card data of a user */
function toMemberCard(user) {
  return {
    userId: user._id,
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    email: user.emails && user.emails[0] ? user.emails[0].address : ''
  };
}

export default function ProjectFormModal({
  clientsList,
  setClientsList,
  allUsersList,
  setAllUsersList,
  isClient,
  editingProjectId,
  setEditingProjectId,
  formTasksExport
}) {
  const { user } = useAuth();
  const modalRef = useRef(null);
  const excelFileRef = useRef(null);
  // Excel file kept for "save as template" (not shown on screen)
  const excelFileData = useRef(null);
  const excelFileName = useRef('');

  const [title, setTitle] = useState('Create New Project');
  const [editProjectId, setEditProjectId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  // Set to rebuild the select2 dropdowns after their options were filled; holds the values to select
  const [dropdownRefresh, setDropdownRefresh] = useState(null);

  // Team Members tab
  const [memberCards, setMemberCards] = useState([]);

  // Tasks tab
  const [formTasks, setFormTasks] = useState({ list: [], rowsStyle: 'full' });
  const [tasksCount, setTasksCount] = useState(0);

  // Import Tasks tab
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [importedTasks, setImportedTasks] = useState([]);
  const [importedRowsStyle, setImportedRowsStyle] = useState('import');
  const [importedVisible, setImportedVisible] = useState(false);

  // Documents tab
  const [projectAttachments, setProjectAttachments] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState(ROOT_FOLDER);
  // Which documents are listed: all of them, or those of one folder
  const [attachmentFilter, setAttachmentFilter] = useState({ all: true, folderId: null });
  const [existingVisible, setExistingVisible] = useState(false);
  const [noDocumentsVisible, setNoDocumentsVisible] = useState(true);
  const [noDocumentsText, setNoDocumentsText] = useState('No documents uploaded yet');

  const changeForm = (changes) => setForm((old) => ({ ...old, ...changes }));

  const resetProjectForm = () => {
    setForm(EMPTY_FORM);
    $('#companyName, #assignedTo').val('');
  };

  /**
   * Fill the project modal dropdowns and (re)create select2 on them.
   * `values` are selected afterwards: { companyName, assignedTo }.
   */
  const populateProjectDropdowns = (values = {}) => {
    setDropdownRefresh({ values });
  };

  // Init Select2 on the dropdowns once React has rendered their new options
  useEffect(() => {
    if (!dropdownRefresh) return;

    $('.projectModalSelect').each(function () {
      const $el = $(this);
      // The options were filled again, so nothing is selected any more
      $el.val('');
      initSelect2(this, {
        placeholder: $el.find('option:first').text() || 'Select...',
        allowClear: true,
        dropdownParent: $('#projectFormModal')
      });
    });

    const { values } = dropdownRefresh;
    if (values.companyName !== undefined) {
      $('#companyName').val(values.companyName).trigger('change');
    }
    if (values.assignedTo !== undefined) {
      $('#assignedTo').val(values.assignedTo).trigger('change');
    }
  }, [dropdownRefresh]);

  useEffect(() => {
    return () => destroySelect2('.projectModalSelect');
  }, []);

  // Refresh clients dropdown when a new client is created via the shared modal
  useEffect(() => {
    const onClientCreated = (e) => {
      const newClientId = e && e.detail && e.detail.clientId;
      api.call('clients.getList', { page: 1, perPage: 100 }, (err, res) => {
        if (!err && res && res.data) {
          setClientsList(res.data);
          populateProjectDropdowns(newClientId ? { companyName: newClientId } : {});
        }
      });
    };
    document.addEventListener('client:created', onClientCreated);
    return () => document.removeEventListener('client:created', onClientCreated);
  }, [setClientsList]);

  // When project form modal is shown, ensure the folders of the project are loaded
  useEffect(() => {
    const modal = $(modalRef.current);
    const onShown = () => {
      if (editingProjectId) {
        refreshFolderTrees();
      }
    };
    modal.on('shown.bs.modal', onShown);
    return () => modal.off('shown.bs.modal', onShown);
  }, [editingProjectId]);

  /* ---------------------------------------------------------------- documents */

  /**
   * Filter and display attachments by folder
   */
  const displayAttachmentsByFolder = (folderId, allAttachments) => {
    setAttachmentFilter({ all: false, folderId: folderId });

    const filteredAttachments = allAttachments.filter(attachment => isInFolder(attachment, folderId));
    if (filteredAttachments.length > 0) {
      setExistingVisible(true);
      setNoDocumentsVisible(false);
    } else {
      setExistingVisible(false);
      setNoDocumentsVisible(true);
      setNoDocumentsText('No documents in this folder');
    }
  };

  /** Show every attachment of the project (no folder filter) */
  const displayAllAttachments = (attachments) => {
    setAttachmentFilter({ all: true, folderId: null });
    setProjectAttachments(attachments);
    setExistingVisible(attachments.length > 0);
    setNoDocumentsVisible(attachments.length === 0);
  };

  const shownAttachments = attachmentFilter.all
    ? projectAttachments
    : projectAttachments.filter(attachment => isInFolder(attachment, attachmentFilter.folderId));

  const selectFolder = (folderId, folderName) => {
    setSelectedFolderId(folderId);
    setSelectedFolderPath(folderName || ROOT_FOLDER);

    // Filter and display attachments for the selected folder
    displayAttachmentsByFolder(folderId, projectAttachments);
  };

  /**
   * Handle project attachment file selection
   */
  const addAttachmentFiles = (files, visibility) => {
    const maxFileSize = 5 * 1024 * 1024; // 5MB per file

    // Get selected folder ID
    const folderId = selectedFolderId;
    const folderPath = selectedFolderPath;

    files.forEach(file => {
      // Check file size
      if (file.size > maxFileSize) {
        toastr.warning(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result, // Base64 data
          visibility: visibility, // Add visibility flag (uploadedAt and uploadedBy will be added by server)
          folderId: folderId || null // Add selected folder ID
        };

        setProjectAttachments((list) => [...list, attachment]);

        // Display attachment
        setExistingVisible(true);
        setNoDocumentsVisible(false);
        const folderInfo = folderId ? ` to ${folderPath}` : '';
        toastr.success(`File ${file.name} added${folderInfo} (${visibility})`);
      };

      reader.readAsDataURL(file);
    });
  };

  /**
   * Remove attachment from list
   */
  const removeAttachment = async (event, attachment) => {
    event.preventDefault();
    const attachmentId = getAttachmentId(attachment);
    const projectId = editingProjectId || '';
    const fileName = attachment.name;

    const currentAttachments = projectAttachments;

    const removeFromUi = () => {
      const updatedAttachments = currentAttachments.filter(att => getAttachmentId(att) !== attachmentId);
      setProjectAttachments(updatedAttachments);

      // Check if there are no more attachments and show empty state
      if (updatedAttachments.length === 0) {
        setExistingVisible(false);
        setNoDocumentsVisible(true);
      }
    };

    if (attachment.path && projectId) {
      // Saved attachment: delete file and metadata on the server immediately
      if (!(await fxConfirm(`Delete "${fileName}" permanently? This cannot be undone.`, { tone: 'danger', title: 'Delete file?', confirmText: 'Delete' }))) {
        return;
      }
      api.call('project.removeAttachment', projectId, attachment.id, (error) => {
        if (error) {
          toastr.error(error.reason || `Failed to remove ${fileName}`);
          return;
        }
        removeFromUi();
        toastr.success(`Attachment ${fileName} deleted`);
      });
    } else {
      // New attachment not yet uploaded: local removal is enough
      removeFromUi();
      toastr.info(`Attachment ${fileName} removed`);
    }
  };

  /**
   * Open move to folder modal
   */
  const moveAttachment = (event, attachment) => {
    event.preventDefault();
    const projectId = editingProjectId;

    if (!projectId) {
      toastr.warning('Please save the project first');
      return;
    }

    openMoveAttachmentModal({
      projectId: projectId,
      fileName: attachment.name,
      currentFolderId: attachment.folderId || '',
      onMoved: (fileName, newFolderId) => {
        // Update the attachment's folderId
        const updatedAttachments = projectAttachments.map(att => {
          if (att.name === fileName) {
            return { ...att, folderId: newFolderId };
          }
          return att;
        });
        setProjectAttachments(updatedAttachments);

        // Re-display attachments filtered by current selected folder
        displayAttachmentsByFolder(selectedFolderId, updatedAttachments);
      }
    });
  };

  /* ---------------------------------------------------------------- tasks */

  /** Show the tasks of the project in the Tasks tab */
  const showFormTasks = (tasks, rowsStyle = 'full') => {
    setTasksCount(tasks ? tasks.length : 0);
    setFormTasks({ list: tasks || [], rowsStyle: rowsStyle });
  };

  /**
   * Delete all pending tasks button handler
   */
  const deletePendingTasks = (event) => {
    event.preventDefault();

    const projectId = editProjectId;
    if (!projectId) {
      toastr.error('Please save the project first');
      return;
    }

    // Get pending count from server
    api.call('projectTasks.getPendingCount', projectId, async (error, count) => {
      if (error) {
        toastr.error('Failed to check pending tasks');
        return;
      }

      if (count === 0) {
        toastr.info('No pending tasks to delete');
        return;
      }

      if (await fxConfirm(`Are you sure you want to delete all ${count} pending task(s)? This action cannot be undone.`, { tone: 'danger', title: 'Delete pending tasks?', confirmText: 'Delete all' })) {
        // Call server to delete and get remaining tasks
        api.call('projectTasks.deletePendingByProject', projectId, (deleteError, result) => {
          if (deleteError) {
            toastr.error(deleteError.reason || 'Failed to delete pending tasks');
            return;
          }

          toastr.success(`${result.deletedCount} pending task(s) deleted successfully`);

          // Update UI with remaining tasks from server response
          showFormTasks(result.remainingTasks, 'afterPendingDelete');
        });
      }
    });
  };

  /**
   * Delete task button handler
   */
  const deleteTask = async (event, taskId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!taskId) {
      toastr.error('Task ID not found');
      return;
    }

    if (await fxConfirm('Are you sure you want to delete this task?', { tone: 'danger', title: 'Delete task?', confirmText: 'Delete' })) {
      api.call('projectTasks.delete', taskId, (error) => {
        if (error) {
          console.error('Delete error:', error);
          toastr.error(error.reason || 'Failed to delete task');
          return;
        }

        toastr.success('Task deleted successfully');

        // Reload tasks
        const projectId = editProjectId;
        if (!projectId) {
          console.error('Project ID not found');
          return;
        }

        api.call('projectTasks.getByProject', projectId, (loadError, tasks) => {
          if (loadError) {
            console.error('Error reloading tasks:', loadError);
            return;
          }

          showFormTasks(tasks);
        });
      });
    }
  };

  /** A task row was dragged from oldIndex to newIndex */
  const reorderTask = (taskId, oldIndex, newIndex) => {
    setFormTasks((old) => ({ ...old, list: moveItem(old.list, oldIndex, newIndex) }));

    api.call('projectTasks.reorder', taskId, newIndex, (reorderError) => {
      if (reorderError) {
        toastr.error('Failed to reorder task');
        // Revert
        setFormTasks((old) => ({ ...old, list: moveItem(old.list, newIndex, oldIndex) }));
      } else {
        toastr.success('Task reordered');
      }
    });
  };

  /* ---------------------------------------------------------------- import */

  /**
   * Load selected project template
   */
  const changeTemplate = (event) => {
    const templateId = event.target.value;
    setSelectedTemplate(templateId);

    if (!templateId) {
      setImportedVisible(false);
      setImportedTasks([]);
      return;
    }

    // Clear Excel file input and data
    excelFileRef.current.value = '';
    excelFileData.current = null;
    excelFileName.current = '';

    api.call('templates.getById', templateId, (error, template) => {
      if (error) {
        toastr.error(error.reason || 'Failed to load template');
        return;
      }

      if (template.tasks && template.tasks.length > 0) {
        // Enrich template tasks with calculated fields and cascading dates
        const enrichedTasks = enrichTemplateTasks(template.tasks);

        setImportedTasks(enrichedTasks);
        setImportedRowsStyle('import');
        setImportedVisible(true);
        toastr.success(`Loaded ${enrichedTasks.length} tasks from template`);
      }
    });
  };

  /**
   * Parse Excel file and extract tasks
   */
  const changeExcelFile = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Clear template selection
    setSelectedTemplate('');

    // Store file name
    excelFileName.current = file.name;

    const reader = new FileReader();

    reader.onload = function (e) {
      import('xlsx').then(function (XLSX) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Store file data as base64 for template storage
          excelFileData.current = btoa(String.fromCharCode.apply(null, data));

          // Get the first sheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // Convert to JSON (headers are auto-detected from the first row)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          // Map Excel data to task structure with cascading baseline dates
          const tasks = excelRowsToTasks(jsonData);

          if (tasks.length > 0) {
            setImportedTasks(tasks);
            setImportedRowsStyle('import');
            setImportedVisible(true);
            toastr.success(`Imported ${tasks.length} tasks from Excel file`);
          } else {
            toastr.warning('No tasks found in Excel file');
          }
        } catch (error) {
          console.error('Excel parsing error:', error);
          toastr.error('Failed to parse Excel file. Please check the file format.');
        }
      }).catch(function (err) {
        console.error('Failed to load XLSX library:', err);
        toastr.error('Failed to load Excel parser');
      });
    };

    reader.onerror = function () {
      toastr.error('Failed to read Excel file');
    };

    reader.readAsArrayBuffer(file);
  };

  /* ---------------------------------------------------------------- team */

  /**
   * Add team member to project
   */
  const addMember = (event) => {
    event.preventDefault();

    const userId = $('#memberSelect').val();

    if (!userId) {
      toastr.warning('Please select a team member');
      return;
    }

    // Check if already added
    if (memberCards.some(card => card.userId === userId)) {
      toastr.warning('This member is already added');
      return;
    }

    // Get user from the loaded users list
    const found = allUsersList.find(u => u._id === userId);

    if (!found) {
      toastr.error('User not found');
      return;
    }

    setMemberCards([...memberCards, toMemberCard(found)]);
    $('#memberSelect').val('');
    toastr.success('Team member added');
  };

  /**
   * Remove team member from project
   */
  const removeMember = (event, index) => {
    event.preventDefault();
    setMemberCards(memberCards.filter((card, i) => i !== index));
    toastr.info('Team member removed');
  };

  /* ---------------------------------------------------------------- opening the modal */

  /** Load the templates list */
  const loadTemplates = (done) => {
    api.call('templates.getList', { page: 1, perPage: 100 }, (err, result) => {
      if (!err && result && result.data) {
        setTemplatesList(result.data);
      }
      if (done) done();
    });
  };

  /** Load the clients list */
  const loadClients = (done) => {
    api.call('clients.getList', { page: 1, perPage: 100 }, (err, result) => {
      if (!err && result && result.data) {
        setClientsList(result.data);
      }
      if (done) done();
    });
  };

  /** Reset the Excel file related fields and variables */
  const resetExcelImport = () => {
    excelFileRef.current.value = '';
    setSelectedTemplate('');
    setSaveAsTemplate(false);
    excelFileData.current = null;
    excelFileName.current = '';
  };

  const openCreate = () => {
    // Reset form
    resetProjectForm();
    setEditProjectId('');
    setTitle('Create New Project');
    setMemberCards([]);
    setImportedVisible(false);
    resetExcelImport();
    setExistingVisible(false);
    setNoDocumentsVisible(true);

    // Reset the other values
    setImportedTasks([]);
    displayAllAttachments([]);
    setSelectedFolderId(null);
    setSelectedFolderPath(ROOT_FOLDER);
    setEditingProjectId(null);

    // Show modal first
    $('#projectFormModal').modal('show');

    // Show loader while loading data
    showModalLoader('#projectFormModal', 'Loading form data...');

    // Load data on-demand only when opening modal
    let loadedCount = 0;
    const totalLoads = isClient ? 2 : 3;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalLoads) {
        hideModalLoader('#projectFormModal');
        populateProjectDropdowns();
      }
    };

    // Load users for team member assignment
    api.call('user.getAllForAssignment', (error, users) => {
      if (!error) {
        setAllUsersList(users);
      } else {
        console.error('Error loading users:', error);
        toastr.error('Failed to load users');
      }
      checkAllLoaded();
    });

    // Load clients list (only for non-client users)
    if (!isClient) {
      loadClients(checkAllLoaded);
    }

    // Load templates list
    loadTemplates(checkAllLoaded);
  };

  const openEdit = (projectId) => {
    // Reset Excel file related fields and variables
    resetExcelImport();

    // Set editing project ID for folder tree filtering
    setEditingProjectId(projectId);
    setSelectedFolderId(null);
    setSelectedFolderPath(ROOT_FOLDER);

    // Show modal first
    $('#projectFormModal').modal('show');

    // Show loader while loading data
    showModalLoader('#projectFormModal', 'Loading project details...');

    // Load users for team member assignment
    api.call('user.getAllForAssignment', (error, users) => {
      if (error) {
        console.error('Error loading users:', error);
        toastr.error('Failed to load users');
        hideModalLoader('#projectFormModal');
        return;
      }

      setAllUsersList(users);

      // Load clients list (only for non-client users)
      if (!isClient) {
        loadClients();
      }

      // Load templates list
      loadTemplates();

      // Now load the full project data with all details (on-demand)
      api.call('project.getById', projectId, (getError, project) => {
        if (getError) {
          toastr.error(getError.reason || 'Failed to load project');
          return;
        }

        // Populate form
        setEditProjectId(project._id);
        changeForm({
          projectName: project.name,
          description: project.description || '',
          startDate: project.startDate ? moment(project.startDate).format('YYYY-MM-DD') : '',
          endDate: project.endDate ? moment(project.endDate).format('YYYY-MM-DD') : ''
        });

        // Load and display attachments
        displayAllAttachments(project.attachments && project.attachments.length > 0 ? project.attachments : []);

        // Display team members using the loaded users
        setMemberCards((project.members || [])
          .map(memberId => users.find(u => u._id === memberId))
          .filter(Boolean)
          .map(toMemberCard));

        // Load tasks from ProjectTasks collection
        api.call('projectTasks.getByProject', projectId, (taskError, tasks) => {
          if (taskError) {
            console.error('Error loading tasks:', taskError);
            setImportedVisible(false);
            setImportedTasks([]);
            setTasksCount(0);
            return;
          }

          if (tasks && tasks.length > 0) {
            setImportedVisible(true);
            setImportedTasks(tasks);
            setImportedRowsStyle('project');
            showFormTasks(tasks);
          } else {
            setImportedVisible(false);
            setImportedTasks([]);
            showFormTasks([]);
          }

          // Hide loader after all data is loaded
          hideModalLoader('#projectFormModal');

          // Populate dropdowns and init Select2
          populateProjectDropdowns({
            companyName: project.companyName || '',
            assignedTo: project.assignedTo || ''
          });
        });

        setTitle('Edit Project');
      });
    });
  };

  // Let openCreateProjectModal() / openEditProjectModal() reach this modal
  useEffect(() => handle.register({ openCreate, openEdit }));

  /* ---------------------------------------------------------------- tabs */

  /**
   * Initialize folder tree when documents tab is clicked
   */
  const clickDocumentsTab = (event) => {
    event.preventDefault();

    const projectId = editProjectId;
    if (!projectId) {
      return;
    }

    // Ensure editingProjectId is set
    setEditingProjectId(projectId);

    // Refresh the folder tree after tab is visible
    setTimeout(() => refreshFolderTrees(), 150);
  };

  /**
   * Initialize calendar when calendar tab is clicked
   */
  const clickCalendarTab = (event) => {
    event.preventDefault();

    const projectId = editProjectId;
    if (!projectId) {
      return;
    }

    // Load calendar after a short delay to ensure tab is visible
    setTimeout(() => {
      initializeProjectCalendar(projectId, user);
    }, 100);
  };

  /* ---------------------------------------------------------------- save */

  /**
   * Save project (create or update)
   */
  const saveProject = (event) => {
    event.preventDefault();

    // Get form data
    const projectId = editProjectId;
    const projectName = form.projectName.trim();
    const description = form.description.trim();
    const startDate = form.startDate;
    const endDate = form.endDate;
    const companyName = $('#companyName').val();
    const assignedTo = $('#assignedTo').val();

    // Validation
    if (!projectName) {
      toastr.error('Project name is required');
      return;
    }

    if (!companyName) {
      toastr.error('Company/Client is required');
      return;
    }

    if (!startDate) {
      toastr.error('Start date is required');
      return;
    }

    if (!endDate) {
      toastr.error('End date is required');
      return;
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      toastr.error('End date must be after start date');
      return;
    }

    // Collect team members
    const members = memberCards.map(card => card.userId).filter(Boolean);

    // Get imported tasks
    const tasks = importedTasks;

    // Check if user wants to save Excel as template
    const fileData = excelFileData.current;
    const fileName = excelFileName.current;

    // Get project attachments (temporary - will be uploaded after project creation/update)
    const attachments = projectAttachments || [];

    // Get project manager name from loaded users list
    let assignedToName = '';
    if (assignedTo) {
      const manager = allUsersList.find(u => u._id === assignedTo);
      if (manager && manager.profile) {
        assignedToName = profileFullName(manager.profile);
      }
    }

    // Prepare project data (without attachments - will be uploaded separately)
    const projectData = {
      name: projectName,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyName: companyName || '',
      assignedTo: assignedTo || '',
      assignedToName: assignedToName,
      members: members
    };

    // Show button loader
    const restoreButton = showButtonLoader('#saveProject', 'Saving...');

    const closeModal = () => {
      restoreButton();
      $('#projectFormModal').modal('hide');
      resetProjectForm();
    };

    // Upload attachments to file storage
    const uploadAttachments = (targetProjectId) => {
      uploadProjectAttachments(targetProjectId, attachments, (uploadError, uploadCount) => {
        if (uploadError) {
          toastr.warning(uploadError.reason || 'Some files failed to upload');
        } else if (uploadCount > 0) {
          toastr.success(`${uploadCount} file(s) uploaded successfully`);
        }
      });
    };

    // Save the tasks as ProjectTasks, then (optionally) the Excel file as a template.
    // `word` is "updated" or "created".
    const saveTasks = (targetProjectId, word) => {
      api.call('projectTasks.createBulk', targetProjectId, tasks, (taskError) => {
        if (taskError) {
          restoreButton();
          toastr.error('Failed to save project tasks');
          return;
        }

        // Save as template if checkbox is checked and Excel file exists
        if (saveAsTemplate && fileData && fileName) {
          // Use Excel file name (without extension) as template name
          const templateName = fileName.replace(/\.(xlsx|xls)$/i, '');
          const templateData = {
            name: templateName,
            description: description || 'Template created from project',
            fileName: fileName,
            fileData: fileData,
            fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            tasks: tasks,
            taskCount: tasks.length
          };

          api.call('templates.create', templateData, (templateError) => {
            if (templateError) {
              console.error('Failed to save template:', templateError);
              toastr.warning(`Project ${word} but template save failed: ` + (templateError.reason || templateError.message));
            } else {
              toastr.success('Project, tasks, and template saved successfully');
            }
          });
        } else {
          toastr.success(`Project and tasks ${word} successfully`);
        }

        closeModal();
      });
    };

    // Call appropriate method
    if (projectId) {
      // Update existing project
      api.call('project.update', projectId, projectData, (error) => {
        if (error) {
          restoreButton();
          toastr.error(error.reason || 'Failed to update project');
          return;
        }

        uploadAttachments(projectId);

        // Update project tasks
        if (tasks && tasks.length > 0) {
          // Delete existing tasks
          api.call('projectTasks.deleteByProject', projectId, (deleteError) => {
            if (deleteError) {
              console.error('Error deleting old tasks:', deleteError);
              restoreButton();
              toastr.error('Failed to clear old tasks. Please try again.');
              return;
            }

            // Create new tasks
            saveTasks(projectId, 'updated');
          });
        } else {
          toastr.success('Project updated successfully');
          closeModal();
        }
      });
    } else {
      // Create new project
      api.call('project.create', projectData, (error, newProjectId) => {
        if (error) {
          restoreButton();
          toastr.error(error.reason || 'Failed to create project');
          return;
        }

        uploadAttachments(newProjectId);

        // Save tasks as ProjectTasks
        if (tasks && tasks.length > 0) {
          saveTasks(newProjectId, 'created');
        } else {
          toastr.success('Project created successfully');
          closeModal();
        }
      });
    }
  };

  /**
   * Open shared client-creation modal from the project form
   */
  const quickAddClient = (event) => {
    event.preventDefault();
    openCreateClientModal();
  };

  // Get list of project templates (filter and sort client-side)
  const templateList = (templatesList || [])
    .filter(t => !t.isDeleted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <>
      <div className="modal fade" id="projectFormModal" tabIndex="-1" aria-hidden="true" ref={modalRef}>
        <div className="modal-dialog modal-xl" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="projectFormTitle">{title}</h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <input type="hidden" id="editProjectId" name="editProjectId" value={editProjectId} readOnly />

              {/* Nav Tabs */}
              <ul className="nav nav-tabs mb-3" role="tablist">
                <li className="nav-item">
                  <a className="nav-link active" id="project-details-tab" data-bs-toggle="tab" href="#project-details" role="tab">
                    <i className="fa fa-info-circle me-1"></i>Project Details
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="project-team-tab" data-bs-toggle="tab" href="#project-team" role="tab">
                    <i className="fa fa-users me-1"></i>Team Members
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="project-tasks-tab" data-bs-toggle="tab" href="#project-tasks" role="tab">
                    <i className="fa fa-tasks me-1"></i>Tasks <span className="badge bg-primary ms-1" id="projectTasksCount">{tasksCount}</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="project-import-tab" data-bs-toggle="tab" href="#project-import" role="tab">
                    <i className="fa fa-file-excel-o me-1"></i>Import Tasks
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="project-documents-tab" data-bs-toggle="tab" href="#project-documents" role="tab" onClick={clickDocumentsTab}>
                    <i className="fa fa-folder-open me-1"></i>Documents
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" id="project-calendar-tab" data-bs-toggle="tab" href="#project-calendar" role="tab" onClick={clickCalendarTab}>
                    <i className="fa fa-calendar me-1"></i>Calendar
                  </a>
                </li>
              </ul>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Project Details Tab */}
                <div className="tab-pane fade show active" id="project-details" role="tabpanel">
                  <form id="projectForm">
                    <div className="row">
                      {/* Project Name */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="projectName">Project Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" id="projectName" name="projectName" placeholder="Enter project name" required
                          value={form.projectName} onChange={(event) => changeForm({ projectName: event.target.value })} />
                      </div>

                      {/* Company/Client */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="companyName">Company/Client <span className="text-danger">*</span></label>
                        <div className="d-flex gap-2 align-items-start">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <select className="form-select projectModalSelect" id="companyName" name="companyName" style={{ width: '100%' }} required>
                              <option value="">Select Company...</option>
                              {(clientsList || []).map((client) => (
                                <option key={client._id} value={client._id}>{client.clientName}</option>
                              ))}
                            </select>
                          </div>
                          <button type="button" className="btn btn-primary" id="quickAddClient" title="Add New Client" onClick={quickAddClient}>
                            <i className="fa fa-plus"></i>
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="col-md-12 mb-3">
                        <label className="form-label" htmlFor="projectDescription">Description</label>
                        <textarea className="form-control" id="projectDescription" name="projectDescription" rows="3" placeholder="Enter project description"
                          value={form.description} onChange={(event) => changeForm({ description: event.target.value })}></textarea>
                      </div>

                      {/* Start Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="startDate">Start Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" id="startDate" name="startDate" required
                          value={form.startDate} onChange={(event) => changeForm({ startDate: event.target.value })} />
                      </div>

                      {/* End Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="endDate">End Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" id="endDate" name="endDate" required
                          value={form.endDate} onChange={(event) => changeForm({ endDate: event.target.value })} />
                      </div>

                      {/* Project Manager */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="assignedTo">Project Manager</label>
                        <select className="form-select projectModalSelect" id="assignedTo" name="assignedTo" style={{ width: '100%' }}>
                          <option value="">Select Project Manager...</option>
                          {(allUsersList || []).map((u) => (
                            <option key={u._id} value={u._id}>{profileFullName(u.profile)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Team Members Tab */}
                <div className="tab-pane fade" id="project-team" role="tabpanel">
                  <h6 className="mb-3">Team Members</h6>
                  <div className="row">
                    <div className="col-md-10 mb-3">
                      <label className="form-label" htmlFor="memberSelect">Select Team Member</label>
                      <select className="form-select projectModalSelect" id="memberSelect" style={{ width: '100%' }}>
                        <option value="">Choose a team member...</option>
                        {(allUsersList || []).map((u) => {
                          const name = profileFullName(u.profile);
                          const email = u.emails && u.emails[0] ? u.emails[0].address : '';
                          return (
                            <option key={u._id} value={u._id} data-name={name} data-email={email}>{`${name} (${email})`}</option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="col-md-2 mb-3 d-flex align-items-end">
                      <button type="button" className="btn btn-primary w-100" id="addMemberToProject" onClick={addMember}>
                        <i className="fa fa-plus"></i> Add
                      </button>
                    </div>
                  </div>

                  {/* Team Members Cards */}
                  <div id="projectMembersContainer" className="row g-3 mb-3">
                    {memberCards.map((card, index) => (
                      <div className="col-md-4" key={card.userId}>
                        <div className="card member-card" data-user-id={card.userId}>
                          <div className="card-body p-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <small className="fw-bold">{card.firstName} {card.lastName}</small><br />
                                <small className="text-muted">{card.email}</small>
                              </div>
                              <button type="button" className="btn btn-sm btn-danger remove-member" onClick={(event) => removeMember(event, index)}>
                                <i className="fa fa-times"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks Tab */}
                <ProjectTasksTab
                  tasks={formTasks.list}
                  rowsStyle={formTasks.rowsStyle}
                  exportConfig={formTasksExport}
                  onDeletePendingTasks={deletePendingTasks}
                  onDeleteTask={deleteTask}
                  onReorderTask={reorderTask} />

                {/* Import Tasks Tab */}
                <ProjectImportTab
                  templateList={templateList}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={changeTemplate}
                  excelFileRef={excelFileRef}
                  onExcelFileChange={changeExcelFile}
                  saveAsTemplate={saveAsTemplate}
                  onSaveAsTemplateChange={setSaveAsTemplate}
                  importedTasks={importedTasks}
                  importedVisible={importedVisible}
                  rowsStyle={importedRowsStyle} />

                {/* Documents Tab */}
                <ProjectDocumentsTab
                  editingProjectId={editingProjectId}
                  selectedFolderPath={selectedFolderPath}
                  onFolderSelected={selectFolder}
                  onFilesChosen={addAttachmentFiles}
                  attachments={shownAttachments}
                  existingVisible={existingVisible}
                  noDocumentsVisible={noDocumentsVisible}
                  noDocumentsText={noDocumentsText}
                  onMoveAttachment={moveAttachment}
                  onRemoveAttachment={removeAttachment} />

                {/* Calendar Tab */}
                <div className="tab-pane fade" id="project-calendar" role="tabpanel">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title mb-3">
                        <i className="fa fa-calendar me-2"></i>Task Calendar
                      </h6>

                      {/* Calendar Legend */}
                      <div className="mb-3 d-flex flex-wrap gap-3">
                        <div className="d-flex align-items-center">
                          <span className="badge bg-label-warning me-2">Pending</span>
                          <small className="text-muted">Tasks not started</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-label-primary me-2">In Progress</span>
                          <small className="text-muted">Currently working</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-label-secondary me-2">On Hold</span>
                          <small className="text-muted">Paused tasks</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-label-info me-2">Testing</span>
                          <small className="text-muted">Under testing</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-label-success me-2">Completed</span>
                          <small className="text-muted">Finished tasks</small>
                        </div>
                      </div>

                      {/* Calendar Container */}
                      <div id="projectCalendar" style={{ minHeight: '600px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" id="saveProject" onClick={saveProject}>Save Project</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      <ProjectTaskFormModal onTasksReloaded={(tasks) => showFormTasks(tasks)} />
    </>
  );
}
