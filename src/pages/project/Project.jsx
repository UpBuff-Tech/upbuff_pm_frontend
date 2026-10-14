/**
 * @author Visakh
 */

// Project Management page (/project/list): the project cards and every modal of the page.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import SuccessModal from '../../layouts/modals/SuccessModal';
import ErrorModal from '../../layouts/modals/ErrorModal';
import TableExportModal from '../../components/exportButtons/TableExportModal';
import FolderFormModal from '../../components/folderTree/FolderFormModal';
import DeleteFolderModal from '../../components/folderTree/DeleteFolderModal';
import ClientFormModal from '../client/ClientFormModal';
import { buildProjectFilters } from './projectHelpers';
import { formTasksExportConfig, viewTasksExportConfig } from './projectExports';
import { destroyProjectCalendar } from './projectCalendar';
import ProjectCard from './ProjectCard';
import ProjectFormModal, { openCreateProjectModal, openEditProjectModal } from './ProjectFormModal';
import ProjectViewModal, { openProjectViewModal } from './ProjectViewModal';
import ProjectDeleteModal, { openProjectDeleteModal } from './ProjectDeleteModal';
import ProjectTaskDetailModal from './ProjectTaskDetailModal';
import MoveAttachmentModal from './MoveAttachmentModal';
import './project.css';

// Array for skeleton loader (shows 12 skeleton cards)
const SKELETON_COUNT = Array(12).fill(0);

function ProjectCardSkeleton() {
  return (
    <div className="col-md-6 col-xl-4 col-xxl-3">
      <div className="pj-card pj-skeleton" aria-hidden="true">
        <div className="pj-head">
          <span className="skeleton pj-sk-avatar"></span>
          <div className="pj-title">
            <span className="skeleton skeleton-text" style={{ width: '70%', height: '16px' }}></span>
            <span className="skeleton skeleton-text mt-2" style={{ width: '45%', height: '12px' }}></span>
          </div>
        </div>
        <span className="skeleton skeleton-badge" style={{ width: '90px' }}></span>
        <span className="skeleton skeleton-text" style={{ width: '100%' }}></span>
        <span className="skeleton skeleton-text" style={{ width: '75%' }}></span>
        <div className="pj-progress-block">
          <div className="pj-schedule">
            <span className="skeleton skeleton-text" style={{ width: '80%' }}></span>
            <span className="skeleton skeleton-bar mt-2"></span>
          </div>
          <span className="skeleton skeleton-circle" style={{ width: '52px', height: '52px' }}></span>
        </div>
        <span className="skeleton" style={{ height: '52px', borderRadius: '12px' }}></span>
      </div>
    </div>
  );
}

export default function Project() {
  const { user, userCan } = useAuth();
  const navigate = useNavigate();

  // Check if user is a client
  const isClient = !!(user && user.profile && user.profile.role === 'client');

  // Optimized pagination - only fetch fields displayed in list view
  const pagination = usePagination('project', {
    filters: { isDeleted: { $ne: true } },
    sort: { createdAt: -1 },
    perPage: 12,
    // Only fetch fields needed for list display
    fields: {
      _id: 1,
      name: 1,
      description: 1,
      companyName: 1,
      startDate: 1,
      endDate: 1,
      assignedTo: 1,
      assignedToName: 1,
      members: 1, // Only array of IDs, not full member details
      status: 1,
      createdAt: 1
      // Exclude heavy fields: attachments, tasks (loaded separately when viewing detail)
    }
  });

  // What the list filters on (not shown on screen)
  const filterValues = useRef({ clientCompanyName: '', searchQuery: '' });

  const [searchText, setSearchText] = useState('');
  // Data loaded via server methods
  const [clientsList, setClientsList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  // 'grid' | 'list', remembered in this browser
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('projectListView') === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; }
  });
  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem('projectListView', next); } catch (e) { /* not remembered */ }
  }; // project stats (completion, time, team members, task count)
  const [editingProjectId, setEditingProjectId] = useState(null);
  // Tasks currently rendered in the "Project Details" view modal, kept so the
  // export ships the same enriched rows (cascaded baseline dates, derived
  // hours) that the table shows rather than the raw stored documents.
  const [viewedProjectTasks, setViewedProjectTasks] = useState({ projectName: '', tasks: [] });

  /** Apply the client-scoped filter and the search query to the list, back on page 1 */
  const applyPaginationFilters = () => {
    const { clientCompanyName, searchQuery } = filterValues.current;
    pagination.filters(buildProjectFilters(clientCompanyName, searchQuery));
    pagination.currentPage(1);
  };

  useEffect(() => {
    // Initialize tooltips
    $('[title]').tooltip();

    // Close modal handlers
    const closeModal = (event) => {
      $(event.currentTarget).closest('.modal').modal('hide');
    };
    $(document).on('click.projectPage', '.close, [data-dismiss="modal"]', closeModal);

    // Fetch all project stats (completion, time spent, team members, task count)
    api.call('projectTasks.getAllProjectStats', (err, stats) => {
      if (err) {
        console.error('Error loading project stats:', err);
        return;
      }

      if (stats) {
        setProjectStats(stats);
      }
    });

    return () => {
      $(document).off('click.projectPage');
      destroyProjectCalendar();
    };
  }, []);

  // Clients only see the projects of their own company
  const userId = user ? user._id : null;
  useEffect(() => {
    if (!userId || !isClient) return;

    // Fetch client data
    api.call('clients.getMyInfo', (err, clientRecord) => {
      if (err) {
        console.error('Error loading client info:', err);
        toastr.error('Failed to load client information');
        return;
      }

      if (clientRecord && clientRecord.name) {
        filterValues.current.clientCompanyName = clientRecord.name;
        applyPaginationFilters();
      }
    });
  }, [userId]);

  /**
   * Search projects in real-time
   */
  const searchProjects = (event) => {
    filterValues.current.searchQuery = event.currentTarget.value;
    applyPaginationFilters();
  };

  /**
   * Reset search
   */
  const resetSearch = (event) => {
    event.preventDefault();
    setSearchText('');
    filterValues.current.searchQuery = '';
    applyPaginationFilters();
  };

  /**
   * Navigate to Templates Management Page
   */
  const manageTemplates = (event) => {
    event.preventDefault();
    navigate('/templates/list');
  };

  const createProject = (event) => {
    event.preventDefault();
    openCreateProjectModal();
  };

  const viewProject = (event, projectId) => {
    event.preventDefault();
    openProjectViewModal(projectId);
  };

  const editProject = (event, projectId) => {
    event.preventDefault();
    openEditProjectModal(projectId);
  };

  const deleteProject = (event, projectId) => {
    event.preventDefault();
    openProjectDeleteModal(projectId);
  };

  /** After a task detail was saved: refresh the project view of the project being edited, if it is listed */
  const refreshViewedProject = () => {
    const projectId = editingProjectId;
    if (projectId && pagination.getPage().some(project => project._id === projectId)) {
      openProjectViewModal(projectId);
    }
  };

  /** Click event for pagination */
  const changePage = (e, clickedPage) => {
    e.preventDefault();
    pagination.currentPage(clickedPage);
  };

  const viewTasksExport = viewTasksExportConfig(viewedProjectTasks);
  const formTasksExport = formTasksExportConfig(allUsersList);

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="pj-header">
          <div>
            <h4 className="fw-bold mb-1">Projects</h4>
            <p className="text-muted mb-0">Plan schedules, track progress and manage project teams</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary manageTemplates" onClick={manageTemplates}>
              <i className="bx bx-layer me-1"></i> Templates
            </button>
            {userCan('project_create') && (
              <button type="button" className="btn btn-primary createProject" onClick={createProject}>
                <i className="bx bx-plus me-1"></i> Create Project
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: search, count, view toggle */}
        <div className="pj-toolbar">
          <div className="pj-search">
            <i className="bx bx-search"></i>
            <input type="text" className="form-control" id="searchProjects" placeholder="Search by project name, description or client…"
              value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyUp={searchProjects} aria-label="Search projects" />
            {searchText && (
              <button type="button" className="pj-search-clear" id="resetSearch" onClick={resetSearch} aria-label="Clear search">
                <i className="bx bx-x"></i>
              </button>
            )}
          </div>
          <div className="pj-toolbar-right">
            {pagination.ready() && (
              <span className="pj-count">
                {pagination.totalItems() || 0} project{pagination.totalItems() === 1 ? '' : 's'}{searchText ? ' found' : ''}
              </span>
            )}
            <div className="pj-view-toggle" role="group" aria-label="View">
              <button type="button" className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => changeView('grid')} title="Grid view">
                <i className="bx bx-grid-alt"></i>
              </button>
              <button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => changeView('list')} title="List view">
                <i className="bx bx-list-ul"></i>
              </button>
            </div>
          </div>
        </div>

        <section className="content">
          {pagination.ready() ? (
            <>
              {pagination.getPage().length === 0 ? (
                <div className="card pj-empty">
                  <span className="pj-empty-icon"><i className="bx bx-folder-open"></i></span>
                  <h5>{searchText ? 'No projects match your search' : 'No projects yet'}</h5>
                  <p>{searchText ? 'Try a different name or client.' : 'Create your first project to get started.'}</p>
                </div>
              ) : view === 'list' ? (
                <div className="card pj-list" id="projectCardsContainer">
                  <div className="pj-row pj-row-head" aria-hidden="true">
                    <span className="pj-row-main">Project</span>
                    <span>Status</span>
                    <span className="pj-row-timeline">Schedule</span>
                    <span className="pj-row-progress">Progress</span>
                    <span className="pj-row-stat">Tasks</span>
                    <span className="pj-row-stat pj-col-time">Time</span>
                    <span className="pj-row-manager">PM</span>
                    <span className="pj-row-menu"></span>
                  </div>
                  {pagination.getPage().map((project) => (
                    <ProjectCard
                      key={project._id}
                      view="list"
                      project={project}
                      clientsList={clientsList}
                      stats={projectStats[project._id]}
                      onView={viewProject}
                      onEdit={editProject}
                      onDelete={deleteProject} />
                  ))}
                </div>
              ) : (
                /* Project Cards */
                <div className="row g-3" id="projectCardsContainer">
                  {pagination.getPage().map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      clientsList={clientsList}
                      stats={projectStats[project._id]}
                      onView={viewProject}
                      onEdit={editProject}
                      onDelete={deleteProject} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-4">
                <Paginator pagination={pagination} limit={12} containerClass="text-center" onClick={changePage} />
              </div>
            </>
          ) : (
            /* Skeleton Loader */
            <div className="row g-3">
              {SKELETON_COUNT.map((zero, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          )}

          <SuccessModal id="projectSuccessModal" />
          <ErrorModal id="projectErrorModal" />
        </section>
      </div>

      {/* Project Create/Edit Modal */}
      <TableExportModal scope="projectTasks" dateFields="task" reportTypes="taskHours" config={formTasksExport} />
      <TableExportModal scope="viewProjectTasks" dateFields="task" reportTypes="taskHours" config={viewTasksExport} />

      <ProjectFormModal
        clientsList={clientsList}
        setClientsList={setClientsList}
        allUsersList={allUsersList}
        setAllUsersList={setAllUsersList}
        isClient={isClient}
        editingProjectId={editingProjectId}
        setEditingProjectId={setEditingProjectId}
        formTasksExport={formTasksExport} />

      {/* Project View Modal */}
      <ProjectViewModal exportConfig={viewTasksExport} onTasksLoaded={setViewedProjectTasks} />

      {/* Project Delete Confirmation Modal */}
      <ProjectDeleteModal />

      {/* Project Task Detail Modal */}
      <ProjectTaskDetailModal onSaved={refreshViewedProject} />

      {/* Reusable Client Create/Edit Modal (shared with Clients page) */}
      <ClientFormModal />

      {/* Folder Modals */}
      <FolderFormModal />
      <DeleteFolderModal />

      {/* Move Attachment to Folder Modal */}
      <MoveAttachmentModal />
    </>
  );
}
