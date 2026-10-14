/**
 * One project of the Project Management list, with its collapsible folder list.
 *   view = 'grid' (card) | 'list' (row)
 */
import { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  countFoldersRecursive,
  formatProjectDate,
  formatProjectTimeSpent,
  getCompanyName,
  getProjectDays,
  getProjectStatus,
  getUserName,
  truncateText,
  avatarColor,
  initials,
  statusKey
} from './projectHelpers';

/** Where today falls in the project's schedule: { percent, text } */
function timelineOf(project) {
  if (!project.startDate || !project.endDate) return { percent: 0, text: 'No dates set' };
  const start = moment(project.startDate).startOf('day');
  const end = moment(project.endDate).startOf('day');
  const today = moment().startOf('day');
  const total = Math.max(1, end.diff(start, 'days'));
  if (today.isBefore(start)) {
    const inDays = start.diff(today, 'days');
    return { percent: 0, text: inDays === 1 ? 'Starts tomorrow' : `Starts in ${inDays} days` };
  }
  if (today.isAfter(end)) {
    const ago = today.diff(end, 'days');
    return { percent: 100, text: ago === 1 ? 'Ended yesterday' : `Ended ${ago} days ago` };
  }
  const elapsed = today.diff(start, 'days');
  const left = end.diff(today, 'days');
  return {
    percent: Math.round((elapsed / total) * 100),
    text: left === 0 ? 'Ends today' : `Day ${elapsed + 1} of ${total} · ${left} day${left !== 1 ? 's' : ''} left`,
  };
}

export default function ProjectCard({ project, clientsList, stats, onView, onEdit, onDelete, view = 'grid' }) {
  const { user, userCan } = useAuth();
  const projectId = project._id;

  const [folderCount, setFolderCount] = useState(0);
  const [foldersVisible, setFoldersVisible] = useState(false);
  // 'loading' | 'error' | 'empty' | 'loaded'
  const [foldersStatus, setFoldersStatus] = useState('loading');
  const [folders, setFolders] = useState([]);

  // Load the folder count once the card is on screen
  useEffect(() => {
    const timer = setTimeout(() => {
      api.call('folders.getTree', { projectId: projectId }, (error, list) => {
        if (!error && list) {
          setFolderCount(countFoldersRecursive(list));
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [projectId]);

  /**
   * Toggle project folders list in project cards
   */
  const toggleFolders = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Toggle visibility
    if (foldersVisible) {
      setFoldersVisible(false);
      return;
    }

    // Show loading state
    setFoldersStatus('loading');
    setFoldersVisible(true);

    // Load folders for this project
    api.call('folders.getTree', { projectId: projectId }, (error, list) => {
      if (error) {
        setFoldersStatus('error');
        return;
      }

      if (!list || list.length === 0) {
        setFoldersStatus('empty');
        return;
      }

      setFolders(list);
      setFoldersStatus('loaded');

      // Update folder count in the metrics
      setFolderCount(countFoldersRecursive(list));
    });
  };

  const projectStats = stats || {};
  const completion = projectStats.completion || 0;
  const status = getProjectStatus(project);
  const sKey = statusKey(status);
  const timeline = timelineOf(project);
  const clientName = project.companyName ? getCompanyName(clientsList, project.companyName) : '';
  const managerName = project.assignedTo ? (project.assignedToName || getUserName(user, project.assignedTo)) : '';
  const memberCount = project.members ? project.members.length : 0;
  const color = avatarColor(project.name);

  // Clicking the card opens the project, unless the click was on its menu or the folder toggle
  const handleOpen = (event) => {
    if (event.target.closest('.dropdown, .toggle-project-folders, .project-folders-list')) return;
    onView(event, projectId);
  };

  const canEdit = userCan('project_update');
  const canDelete = userCan('project_delete');
  const menu = (canEdit || canDelete) && (
    <div className="dropdown">
      <button className="pj-icon-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Project actions">
        <i className="bx bx-dots-vertical-rounded"></i>
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li><a className="dropdown-item viewProject" href="#" data-id={projectId} onClick={(event) => onView(event, projectId)}><i className="bx bx-show me-2"></i>View</a></li>
        {canEdit && <li><a className="dropdown-item editProject" href="#" id={projectId} onClick={(event) => onEdit(event, projectId)}><i className="bx bx-edit-alt me-2"></i>Edit</a></li>}
        {canDelete && (
          <>
            <li><hr className="dropdown-divider" /></li>
            <li><a className="dropdown-item text-danger deleteProject" href="#" id={projectId} onClick={(event) => onDelete(event, projectId)}><i className="bx bx-trash me-2"></i>Delete</a></li>
          </>
        )}
      </ul>
    </div>
  );

  const ring = (
    <span className="pj-ring" style={{ '--pct': completion }} title={`${completion}% of tasks completed`}>
      <span>{completion}%</span>
    </span>
  );

  /* ---------------- List row ---------------- */
  if (view === 'list') {
    return (
      <div className={'pj-row project-card-item st-' + sKey} data-project-name={project.name} role="button" tabIndex={0}
        onClick={handleOpen} onKeyDown={(event) => { if (event.key === 'Enter') handleOpen(event); }}>
        <div className="pj-row-main">
          <span className="pj-avatar" style={{ '--c': color }}>{initials(project.name)}</span>
          <div className="pj-row-title">
            <strong className="viewProject" data-id={projectId}>{project.name}</strong>
            <small>{clientName || 'No client'}</small>
          </div>
        </div>
        <span className={'pj-status s-' + sKey}>{status}</span>
        <div className="pj-row-timeline">
          <div className="pj-track"><span style={{ width: timeline.percent + '%' }}></span></div>
          <small>{formatProjectDate(project.startDate)} – {formatProjectDate(project.endDate)}</small>
        </div>
        <div className="pj-row-progress">
          <div className="pj-track pj-track-green"><span style={{ width: completion + '%' }}></span></div>
          <small>{completion}% done</small>
        </div>
        <span className="pj-row-stat" title="Tasks"><i className="bx bx-task"></i>{projectStats.taskCount || 0}</span>
        <span className="pj-row-stat pj-col-time" title="Time logged"><i className="bx bx-time-five"></i>{formatProjectTimeSpent(projectStats.timeSpent || 0)}</span>
        <span className="pj-row-manager" title={managerName ? 'Manager: ' + managerName : 'No manager'}>
          {managerName ? <span className="pj-mini-avatar">{initials(managerName)}</span> : <span className="pj-mini-avatar is-empty"><i className="bx bx-user"></i></span>}
        </span>
        <div className="pj-row-menu">{menu}</div>
      </div>
    );
  }

  /* ---------------- Grid card ---------------- */
  return (
    <div className="col-md-6 col-xl-4 col-xxl-3 project-card-item"
      data-project-name={project.name}
      data-description={project.description}
      data-company={project.companyName}>
      <div className={'pj-card project-card st-' + sKey} role="button" tabIndex={0}
        onClick={handleOpen} onKeyDown={(event) => { if (event.key === 'Enter' && event.target === event.currentTarget) handleOpen(event); }}>
        {/* Head */}
        <div className="pj-head">
          <span className="pj-avatar" style={{ '--c': color }}>{initials(project.name)}</span>
          <div className="pj-title">
            <h6 className="viewProject" data-id={projectId} title={project.name}>{project.name}</h6>
            {clientName ? (
              <span className="pj-client company-name-badge" title={clientName}><i className="bx bx-buildings"></i>{clientName}</span>
            ) : (
              <span className="pj-client is-empty">No client</span>
            )}
          </div>
          {menu}
        </div>

        <div className="pj-status-row">
          <span className={'pj-status s-' + sKey}>{status}</span>
          <span className="pj-days" title="Planned duration"><i className="bx bx-calendar"></i>{getProjectDays(project.startDate, project.endDate)} days</span>
        </div>

        {project.description ? (
          <p className="pj-desc" title={project.description}>{truncateText(project.description, 110)}</p>
        ) : (
          <p className="pj-desc is-empty">No description</p>
        )}

        {/* Schedule + completion */}
        <div className="pj-progress-block">
          <div className="pj-schedule">
            <div className="pj-schedule-dates">
              <span>{formatProjectDate(project.startDate)}</span>
              <i className="bx bx-right-arrow-alt"></i>
              <span>{formatProjectDate(project.endDate)}</span>
            </div>
            <div className="pj-track"><span style={{ width: timeline.percent + '%' }}></span></div>
            <small className="pj-schedule-text">{timeline.text}</small>
          </div>
          {ring}
        </div>

        {/* Metrics */}
        <div className="pj-metrics">
          <span title="Time logged"><i className="bx bx-time-five"></i><strong>{formatProjectTimeSpent(projectStats.timeSpent || 0)}</strong><small>logged</small></span>
          <span title="Team members"><i className="bx bx-group"></i><strong>{memberCount}</strong><small>members</small></span>
          <span title="Tasks"><i className="bx bx-task"></i><strong>{projectStats.taskCount || 0}</strong><small>tasks</small></span>
          <span title="Folders"><i className="bx bx-folder"></i><strong className="project-folder-count" data-project-id={projectId}>{folderCount}</strong><small>folders</small></span>
        </div>

        {/* Footer: manager + folders */}
        <div className="pj-footer">
          {managerName ? (
            <span className="pj-manager" title={'Project manager: ' + managerName}>
              <span className="pj-mini-avatar">{initials(managerName)}</span>
              <span>{managerName}</span>
            </span>
          ) : (
            <span className="pj-manager is-empty"><span className="pj-mini-avatar is-empty"><i className="bx bx-user"></i></span>No manager</span>
          )}
          <button className={'pj-folder-toggle toggle-project-folders' + (foldersVisible ? ' is-open' : '')} data-project-id={projectId}
            onClick={toggleFolders} aria-expanded={foldersVisible}>
            <i className="bx bx-folder-open"></i>Folders<i className="bx bx-chevron-down pj-caret"></i>
          </button>
        </div>

        {/* Folders Section (Collapsible) */}
        <div className="project-folders-list pj-folders" data-project-id={projectId}
          style={{ display: foldersVisible ? 'block' : 'none' }}>
          {foldersStatus === 'loading' && (
            <div className="pj-folders-note"><span className="spinner-border spinner-border-sm me-2"></span>Loading…</div>
          )}
          {foldersStatus === 'error' && <div className="pj-folders-note text-danger">Failed to load folders</div>}
          {foldersStatus === 'empty' && <div className="pj-folders-note">No folders yet</div>}
          {foldersStatus === 'loaded' && (
            <ul>
              {folders.map((folder) => (
                <Fragment key={folder._id}>
                  <li>
                    <span><i className="bx bxs-folder pj-folder-icon"></i>{folder.name}</span>
                    <span className="pj-file-count">{folder.fileCount || 0}</span>
                  </li>
                  {/* Also show subfolders if any */}
                  {folder.children && folder.children.length > 0 && folder.children.map((child) => (
                    <li className="is-child" key={child._id}>
                      <span><i className="bx bx-folder"></i>{child.name}</span>
                      <span className="pj-file-count">{child.fileCount || 0}</span>
                    </li>
                  ))}
                </Fragment>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
