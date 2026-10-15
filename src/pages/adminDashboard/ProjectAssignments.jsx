/**
 * "Project team assignments" card of the admin dashboard: who is working on which project.
 *
 *   <ProjectAssignments assignments={data} periodLabel="This month" />
 *     // data: null while loading, then the projectTasks.getProjectAssignments result for the period
 *
 * Kept compact: a search box, 10 projects per page, and at most 4 team members per row until
 * "+N more" is clicked. Projects are listed by total hours, busiest first.
 */
import { useMemo, useState } from 'react';

const PAGE_SIZE = 10;
const MEMBERS_SHOWN = 4;

function matchesSearch(assignment, term) {
  if (!term) return true;
  const names = (assignment.teamMembers || []).map((member) => member.userName);
  return [assignment.projectName, assignment.clientName, ...names]
    .some((value) => String(value || '').toLowerCase().includes(term));
}

function AssignmentRow({ assignment, expanded, onToggle }) {
  const active = Number(assignment.activeTasks) || 0;
  const done = Number(assignment.completedTasks) || 0;
  const progress = active + done ? Math.round((done / (active + done)) * 100) : 0;
  const members = assignment.teamMembers || [];
  const shownMembers = expanded ? members : members.slice(0, MEMBERS_SHOWN);
  const hiddenCount = members.length - shownMembers.length;

  return (
    <tr>
      <td>
        <div className="fx-assign-project">
          <span className="fx-assign-avatar">{(assignment.projectName || '?').charAt(0).toUpperCase()}</span>
          <div>
            <div className="fx-assign-name">{assignment.projectName}</div>
            <div className="fx-assign-client"><i className="bx bx-buildings"></i>{assignment.clientName}</div>
          </div>
        </div>
      </td>
      <td>
        {members.length ? (
          <div className="fx-member-list">
            {shownMembers.map((member, memberIndex) => (
              <span key={memberIndex} className="fx-member" title={`${member.taskCount} task(s), ${member.timeWorked}`}>
                <span className="fx-member-initial">{(member.userName || '?').charAt(0).toUpperCase()}</span>
                {member.userName}
                <span className="fx-member-time">{member.timeWorked}</span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <button type="button" className="fx-member fx-member-more" onClick={onToggle}>+{hiddenCount} more</button>
            )}
            {expanded && members.length > MEMBERS_SHOWN && (
              <button type="button" className="fx-member fx-member-more" onClick={onToggle}>Show less</button>
            )}
          </div>
        ) : (
          <span className="text-muted">No assignments</span>
        )}
      </td>
      <td className="text-end">
        <span className="fx-assign-hours">{Math.round((Number(assignment.totalSeconds) || 0) / 3600).toLocaleString()}h</span>
        <div className="fx-assign-sub">{assignment.totalTime}</div>
      </td>
      <td>
        <div className="fx-progress-row">
          <div className="fx-progress"><span style={{ width: progress + '%' }}></span></div>
          <span className="fx-progress-value">{progress}%</span>
        </div>
        <div className="fx-assign-sub">{done} done · {active} active</div>
      </td>
    </tr>
  );
}

export default function ProjectAssignments({ assignments, periodLabel }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState([]);

  const sorted = useMemo(() => (assignments || []).slice()
    .sort((a, b) => (Number(b.totalSeconds) || 0) - (Number(a.totalSeconds) || 0)), [assignments]);

  const term = search.trim().toLowerCase();
  const filtered = useMemo(() => sorted.filter((assignment) => matchesSearch(assignment, term)), [sorted, term]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  const toggleExpanded = (projectId) => setExpandedIds((ids) => (ids.includes(projectId)
    ? ids.filter((id) => id !== projectId)
    : [...ids, projectId]));

  const onSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="card fx-chart-card">
      <div className="card-header">
        <div>
          <h5 className="card-title">Project team assignments</h5>
          <p className="fx-card-subtitle">
            Who logged time on which project{periodLabel ? ' · ' + periodLabel.toLowerCase() : ''} · busiest first
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="fx-assign-tools">
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bx bx-search"></i></span>
              <input type="text" className="form-control" placeholder="Search project, client or member"
                value={search} onChange={onSearch} />
            </div>
            <span className="badge bg-label-secondary">{sorted.length} projects</span>
          </div>
        )}
      </div>

      {assignments === null ? (
        <div className="card-body">
          {[0, 1, 2].map((i) => <div key={i} className="fx-skeleton fx-skeleton-row"></div>)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="card-body">
          <div className="fx-chart-empty" style={{ height: 160 }}>
            <i className="bx bx-group"></i><span>{periodLabel ? 'No time logged on projects ' + periodLabel.toLowerCase() : 'No team assignments yet'}</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-body text-muted text-center py-4">No projects match “{search}”</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover fx-assign-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Team members &amp; hours{periodLabel ? ' (' + periodLabel.toLowerCase() + ')' : ''}</th>
                  <th className="text-end">Hours</th>
                  <th style={{ width: '220px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((assignment) => (
                  <AssignmentRow key={assignment.projectId} assignment={assignment}
                    expanded={expandedIds.includes(assignment.projectId)}
                    onToggle={() => toggleExpanded(assignment.projectId)} />
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="fx-assign-pager">
              <span className="text-muted">
                {firstIndex + 1}–{firstIndex + pageRows.length} of {filtered.length}
              </span>
              <div className="btn-group btn-group-sm">
                <button type="button" className="btn btn-outline-secondary" disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}><i className="bx bx-chevron-left"></i> Previous</button>
                <button type="button" className="btn btn-outline-secondary" disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}>Next <i className="bx bx-chevron-right"></i></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
