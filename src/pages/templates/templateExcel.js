// Reading an uploaded Excel template (used by "New Template" and "Edit Template").

import * as XLSX from 'xlsx';

/** The rows of the first sheet of an Excel file (an ArrayBuffer), as objects keyed by column title. */
export function readFirstSheetRows(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

/** Process tasks from Excel with all columns */
export function rowsToTasks(jsonData) {
  return jsonData.map((row, index) => ({
    taskId: row['ID'] || row['Task ID'] || `TASK-${index + 1}`,
    phase: row['Phase/Activity'] || row['Phase'] || '',
    taskName: row['Detailed Task'] || row['Task Name'] || row['Task'] || '',
    duration: row['Duration (Days)'] || row['Duration'] || 0,
    responsibility: row['Responsibility'] || '',
    status: row['Status'] || 'Pending',
    baselineStart: row['Baseline Start'] || row['Start Date'] || '',
    baselineFinish: row['Baseline Finish'] || row['End Date'] || '',
    plannedHours: row['Planned Hrs'] || row['Planned Hours'] || 0,
    workCompletion: row['Work Done %'] || row['Completion'] || 0,
    dependency: row['Dependency'] || row['Dependencies'] || '',
    remarks: row['Remarks'] || row['Notes'] || ''
  }));
}

/** Convert file to base64 */
export function arrayBufferToBase64(arrayBuffer) {
  return btoa(
    new Uint8Array(arrayBuffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
}

/** What is saved for a template built from an Excel file. */
export function templateDataFromFile(name, description, file, arrayBuffer, tasks) {
  return {
    name: name,
    description: description,
    fileName: file.name,
    fileData: arrayBufferToBase64(arrayBuffer),
    fileType: file.type,
    tasks: tasks,
    taskCount: tasks.length
  };
}

/** Badge colour of a task status */
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
