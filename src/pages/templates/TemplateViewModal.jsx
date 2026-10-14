import { getStatusBadgeClass } from './templateExcel';
import { DetailHeader, DetailSection, StatTile, Pill, EmptyState } from '../../components/detailModal/DetailModal';

/** Bootstrap badge colour (from getStatusBadgeClass) -> Pill tone */
const BADGE_TONES = { success: 'green', warning: 'amber', danger: 'red', info: 'cyan', primary: 'indigo', secondary: 'gray' };

/** A table cell value, or a muted dash when empty */
const cell = (value) => (value ? value : <span className="text-muted">—</span>);

/** Template View Modal (#templateViewModal). `template` is null until a template has been opened. */
export default function TemplateViewModal({ template }) {
  const tasks = template && template.tasks ? template.tasks : [];

  return (
    <div className="modal fade dm-modal" id="templateViewModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-fullscreen modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader
            icon="bx-spreadsheet"
            tone="cyan"
            eyebrow="Template Tasks"
            title={<span id="viewTemplateName">{template ? template.name : ''}</span>}
            meta={template ? (
              <>
                <Pill tone="indigo" icon="bx-task"><span id="viewTemplateTaskCount">{`${template.taskCount} tasks`}</span></Pill>
              </>
            ) : null}
          />
          <div className="modal-body p-0">
            <div className="dm-body">
              <DetailSection title="Template Information" icon="bx-info-circle">
                <div className="dm-stats mb-3">
                  <StatTile icon="bx-task" tone="indigo" label="Total Tasks" value={template ? template.taskCount : 0} />
                  <StatTile icon="bx-file" tone="cyan" label="File Name"
                    value={<span id="viewTemplateFileName">{template ? template.fileName : ''}</span>} />
                </div>
                <div className="dm-label">Description</div>
                <div className="dm-callout dm-tone-cyan" id="viewTemplateDescription">
                  {template ? (template.description || 'No description provided') : ''}
                </div>
              </DetailSection>

              {/* Template Tasks Table */}
              <DetailSection title="Tasks" icon="bx-list-check" count={tasks.length} flush>
                <div className="dm-table-wrap">
                  <table className="dm-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '60px' }}>ID</th>
                        <th style={{ minWidth: '180px' }}>Phase/Activity</th>
                        <th style={{ minWidth: '250px' }}>Detailed Task</th>
                        <th className="is-num" style={{ minWidth: '100px' }}>Duration (Days)</th>
                        <th style={{ minWidth: '130px' }}>Responsibility</th>
                        <th style={{ minWidth: '110px' }}>Status</th>
                        <th style={{ minWidth: '130px' }}>Baseline Start</th>
                        <th style={{ minWidth: '130px' }}>Baseline Finish</th>
                        <th className="is-num" style={{ minWidth: '110px' }}>Planned Hrs</th>
                        <th className="is-num" style={{ minWidth: '110px' }}>Work Done %</th>
                        <th style={{ minWidth: '150px' }}>Dependency</th>
                        <th style={{ minWidth: '120px' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody id="viewTemplateTasksBody">
                      {template && tasks.length > 0 && tasks.map((task, index) => (
                        <tr key={index}>
                          <td className="text-muted">{task.taskId || index + 1}</td>
                          <td>{cell(task.phase)}</td>
                          <td className="fw-semibold">{cell(task.taskName)}</td>
                          <td className="is-num">{task.duration || 0}</td>
                          <td>{cell(task.responsibility)}</td>
                          <td>
                            <Pill tone={BADGE_TONES[getStatusBadgeClass(task.status)] || 'gray'} dot>{task.status || 'Pending'}</Pill>
                          </td>
                          <td>{cell(task.baselineStart)}</td>
                          <td>{cell(task.baselineFinish)}</td>
                          <td className="is-num">{task.plannedHours || 0}</td>
                          <td className="is-num">{task.workCompletion || 0}%</td>
                          <td>{cell(task.dependency)}</td>
                          <td>{cell(task.remarks)}</td>
                        </tr>
                      ))}
                      {template && tasks.length === 0 && (
                        <tr><td colSpan="12"><EmptyState icon="bx-task-x">No tasks found</EmptyState></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DetailSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
