// Shared select2 settings.

/**
 * select2 `templateResult` for filter dropdowns with a placeholder such as "All Users": the
 * <option value=""> that stands for "all" was listed as an empty row. Returning null hides that
 * row (select2 4 hides results whose template is null); the "x" clear button does its job.
 */
export function hideEmptyOption(data) {
  return data.id === '' ? null : data.text;
}
