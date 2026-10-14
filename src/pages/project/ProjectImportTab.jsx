/**
 * Import Tasks tab of the project form (#project-import): pick a saved template or upload an
 * Excel file, and see the tasks that will be imported.
 *
 * `rowsStyle` says what the "Imported Tasks" rows hold: 'import' (tasks read from a template or
 * an Excel file, all columns) or 'project' (the tasks the project already has, short rows).
 */
import { formatShortDate, getTaskStatusClass } from './projectHelpers';

function ImportedTaskRow({ task, rowsStyle }) {
  if (rowsStyle === 'project') {
    return (
      <tr>
        <td>{task.taskId || '-'}</td>
        <td>{task.phase}</td>
        <td>{task.taskName}</td>
        <td>{task.duration}</td>
        <td>{task.responsibility || '-'}</td>
        <td>{String(task.dependencies || '-')}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{task.taskId || '-'}</td>
      <td>{task.phase || '-'}</td>
      <td style={{ maxWidth: '250px', whiteSpace: 'normal' }}>{task.taskName || '-'}</td>
      <td className="text-center">{task.duration || 0}</td>
      <td>{task.responsibility || '-'}</td>
      <td><span className={`badge bg-${getTaskStatusClass(task.status)}`}>{task.status || 'Pending'}</span></td>
      <td>{formatShortDate(task.baselineStart)}</td>
      <td>{formatShortDate(task.baselineFinish)}</td>
      <td className="text-center">{task.plannedHours || 0}h</td>
      <td className="text-center">{task.workCompletion || 0}%</td>
      <td>{String(task.dependencies || '-')}</td>
    </tr>
  );
}

export default function ProjectImportTab({
  templateList,
  selectedTemplate,
  onTemplateChange,
  excelFileRef,
  onExcelFileChange,
  saveAsTemplate,
  onSaveAsTemplateChange,
  importedTasks,
  importedVisible,
  rowsStyle
}) {
  return (
    <div className="tab-pane fade" id="project-import" role="tabpanel">
      <div className="card mb-4 bg-light">
        <div className="card-body">
          <h6 className="card-title mb-3">
            <i className="fa fa-file-excel-o text-success me-2"></i>
            Import Tasks from Template (Optional)
          </h6>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="projectTemplate">Select Existing Template</label>
              <select className="form-select" id="projectTemplate" value={selectedTemplate} onChange={onTemplateChange}>
                <option value="">-- No template --</option>
                {templateList.map((template) => (
                  <option key={template._id} value={template._id}>{template.name} ({template.taskCount} tasks)</option>
                ))}
              </select>
              <small className="text-muted">Choose a previously saved template</small>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="excelFile">Or Upload Excel Template</label>
              <input type="file" className="form-control" id="excelFile" accept=".xlsx,.xls" ref={excelFileRef} onChange={onExcelFileChange} />
              <small className="text-muted">Upload SAP B1 project template Excel file</small>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 mb-3">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="saveAsTemplate"
                  checked={saveAsTemplate} onChange={(event) => onSaveAsTemplateChange(event.target.checked)} />
                <label className="form-check-label" htmlFor="saveAsTemplate">
                  Save uploaded Excel file as template for future use
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Imported Tasks Display (if from template) */}
      <div id="importedTasksSection" style={{ display: importedVisible ? 'block' : 'none' }}>
        <h6 className="mb-3">Imported Tasks</h6>
        <div className="alert alert-info">
          <i className="fa fa-info-circle me-2"></i>
          <span id="taskCount">{importedTasks.length}</span> tasks will be imported from the template.
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered" id="importedTasksTable" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light">
              <tr>
                <th style={{ minWidth: '50px' }}>ID</th>
                <th style={{ minWidth: '150px' }}>Phase/Activity</th>
                <th style={{ minWidth: '200px' }}>Detailed Task</th>
                <th style={{ minWidth: '80px' }}>Duration</th>
                <th style={{ minWidth: '120px' }}>Responsibility</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th style={{ minWidth: '110px' }}>Baseline Start</th>
                <th style={{ minWidth: '110px' }}>Baseline Finish</th>
                <th style={{ minWidth: '100px' }}>Planned Hrs</th>
                <th style={{ minWidth: '100px' }}>Work Done %</th>
                <th style={{ minWidth: '120px' }}>Dependency</th>
              </tr>
            </thead>
            <tbody id="importedTasksBody">
              {importedTasks.map((task, index) => (
                <ImportedTaskRow key={index} task={task} rowsStyle={rowsStyle} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
