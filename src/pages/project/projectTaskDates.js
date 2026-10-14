/**
 * @author Visakh
 */

// Baseline date / completion / hours calculations for project tasks: the task form,
// the "Project Details" table, tasks loaded from a template and tasks read from Excel.

import { durationToHours } from '../../lib/taskHours';

/**
 * Add working days to a date (excluding weekends)
 */
export function addWorkingDays(startDate, daysToAdd) {
  if (!startDate || !daysToAdd) return startDate;

  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    // TODO: Add holiday checking here if needed
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Get next working day
 */
export function getNextWorkingDay(date) {
  if (!date) return null;
  return addWorkingDays(date, 1);
}

/**
 * Calculate baseline finish (excluding weekends)
 */
export function calculateBaselineFinish(startDate, durationDays) {
  if (!startDate || !durationDays) return null;
  return addWorkingDays(startDate, durationDays);
}

/**
 * Calculate work completion based on status
 */
export function getWorkCompletion(status) {
  const statusMap = {
    'Completed': 100,
    'In Progress': 50,
    'Pending': 0,
    'On Hold': 0,
    'Cancelled': 0
  };
  return statusMap[status] || 0;
}

/**
 * Tasks of the "Project Details" view: calculate missing fields on-the-fly with cascading dates
 */
export function enrichViewTasks(tasks) {
  let previousTaskBaselineFinish = null;

  return tasks.map((task, index) => {
    const result = { ...task };

    // Calculate baseline dates with cascading logic
    if (index === 0) {
      // First task: Keep its baseline start
      if (task.baselineStart && task.duration && !task.baselineFinish) {
        result.baselineFinish = addWorkingDays(new Date(task.baselineStart), task.duration);
      }
    } else {
      // Subsequent tasks: Baseline Start = Previous task's Baseline Finish + 1 working day
      if (previousTaskBaselineFinish && !task.baselineStart) {
        result.baselineStart = getNextWorkingDay(previousTaskBaselineFinish);
        if (task.duration > 0) {
          result.baselineFinish = addWorkingDays(result.baselineStart, task.duration);
        }
      } else if (task.baselineStart && task.duration && !task.baselineFinish) {
        result.baselineFinish = addWorkingDays(new Date(task.baselineStart), task.duration);
      }
    }

    // Store for next iteration
    previousTaskBaselineFinish = result.baselineFinish || previousTaskBaselineFinish;

    // Calculate work completion if missing
    if (result.workCompletion === undefined || result.workCompletion === null) {
      result.workCompletion = getWorkCompletion(task.status);
    }

    // Calculate planned hours if missing
    if ((!result.plannedHours || result.plannedHours === 0) && task.duration) {
      result.plannedHours = durationToHours(task.duration);
    }

    // Actual hours are tracked timer time — effort, not the calendar
    // span between the actual dates.
    if (!result.actualHours || result.actualHours === 0) {
      if (task.timeSpent > 0) {
        result.actualHours = Math.round((task.timeSpent / 3600) * 100) / 100;
      }
    }

    return result;
  });
}

/**
 * Enrich template tasks with calculated fields and cascading dates
 */
export function enrichTemplateTasks(templateTasks) {
  let previousTaskBaselineFinish = null;

  return templateTasks.map((task, index) => {
    const enriched = { ...task };

    // Calculate baseline dates with cascading logic
    if (index === 0) {
      // First task: Keep its baseline start
      if (!enriched.baselineFinish && enriched.baselineStart && enriched.duration) {
        enriched.baselineFinish = addWorkingDays(new Date(enriched.baselineStart), enriched.duration);
      }
    } else {
      // Subsequent tasks: Baseline Start = Previous task's Baseline Finish + 1 working day
      if (previousTaskBaselineFinish) {
        enriched.baselineStart = getNextWorkingDay(previousTaskBaselineFinish);
        if (enriched.duration > 0) {
          enriched.baselineFinish = addWorkingDays(enriched.baselineStart, enriched.duration);
        } else {
          enriched.baselineFinish = enriched.baselineStart;
        }
      } else if (enriched.baselineStart && enriched.duration) {
        // Fallback if previous task has no baseline
        enriched.baselineFinish = addWorkingDays(new Date(enriched.baselineStart), enriched.duration);
      }
    }

    // Store for next iteration
    previousTaskBaselineFinish = enriched.baselineFinish;

    // Calculate work completion if missing
    if (enriched.workCompletion === undefined || enriched.workCompletion === null) {
      enriched.workCompletion = getWorkCompletion(task.status);
    }

    // Calculate planned hours if missing
    if (!enriched.plannedHours && enriched.duration) {
      enriched.plannedHours = durationToHours(enriched.duration);
    }

    return enriched;
  });
}

/**
 * Convert Excel date serial to JavaScript Date
 */
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

/**
 * Map the rows of an uploaded Excel sheet (XLSX.utils.sheet_to_json) to the task structure,
 * with cascading baseline dates.
 */
export function excelRowsToTasks(jsonData) {
  // Filter out the logic/sample row (row 2) - it contains text like "Auto calculate..."
  const filteredData = jsonData.filter((row) => {
    // Check if this is a logic row by looking for keywords
    const baselineFinish = row['Baseline Finish'] || '';
    const isLogicRow = typeof baselineFinish === 'string' &&
      baselineFinish.toLowerCase().includes('auto calc');

    return !isLogicRow;
  });

  let previousTaskBaselineFinish = null;

  return filteredData.map((row, index) => {
    // Parse duration
    const duration = parseFloat(row['Duration (Days)'] || row['Duration'] || row.duration) || 0;

    // Parse actual dates (these are independent of baseline)
    const actualStart = excelDateToJSDate(row['Actual Start']);
    const actualFinish = excelDateToJSDate(row['Actual Finish']);

    // Calculate baseline dates with cascading logic
    let baselineStart;
    let baselineFinish;

    if (index === 0) {
      // First task: Use Baseline Start from Excel
      baselineStart = excelDateToJSDate(row['Baseline Start']);

      if (baselineStart && duration > 0) {
        baselineFinish = calculateBaselineFinish(baselineStart, duration);
      } else {
        baselineFinish = null;
      }
    } else {
      // Subsequent tasks: Baseline Start = Previous task's Baseline Finish + 1 working day
      if (previousTaskBaselineFinish) {
        baselineStart = getNextWorkingDay(previousTaskBaselineFinish);

        if (duration > 0) {
          baselineFinish = calculateBaselineFinish(baselineStart, duration);
        } else {
          baselineFinish = baselineStart;
        }
      } else {
        // If previous task has no baseline, try to use current row's baseline
        baselineStart = excelDateToJSDate(row['Baseline Start']);
        baselineFinish = calculateBaselineFinish(baselineStart, duration);
      }
    }

    // Store for next iteration
    previousTaskBaselineFinish = baselineFinish;

    // Get status
    const status = row['Status'] || row.status || 'Pending';

    // Calculate work completion based on status
    const workCompletion = getWorkCompletion(status);

    // Calculate hours (8 hours per day)
    const plannedHours = durationToHours(duration);

    // Actual hours are timer-derived, never inferred from the span
    // between the actual dates — an imported task that ran across a
    // weekend is not 72 hours of work. Imported tasks start at 0 and
    // accrue real hours as the timer runs.
    const actualHours = 0;

    // Convert taskId to string to handle decimal IDs like 1.1, 1.1.1
    const taskId = row['ID'] || row.id || '';
    const taskIdString = taskId ? String(taskId) : '';

    return {
      taskId: taskIdString,
      taskName: row['Detailed Task'] || row['Task Name'] || row.taskName || row['Task'] || '',
      phase: row['Phase/Activity'] || row['Phase'] || row.phase || '',
      duration: duration,
      dependencies: row['Dependency'] || row['Dependencies'] || row.dependencies || '',
      responsibility: row['Responsibility'] || row.responsibility || '',
      status: status,
      baselineStart: baselineStart,
      baselineFinish: baselineFinish,
      actualStart: actualStart,
      actualFinish: actualFinish,
      workCompletion: workCompletion,
      plannedHours: plannedHours,
      actualHours: actualHours,
      createdAt: new Date()
    };
  });
}

/**
 * Auto-generate the next Task ID ("TASK-007") based on the existing tasks
 */
export function getNextTaskId(tasks) {
  let nextTaskNumber = 1;
  if (tasks && tasks.length > 0) {
    // Find the highest task number
    tasks.forEach(task => {
      if (task.taskId) {
        const match = task.taskId.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextTaskNumber) {
            nextTaskNumber = num + 1;
          }
        }
      }
    });
  }
  return `TASK-${String(nextTaskNumber).padStart(3, '0')}`;
}
