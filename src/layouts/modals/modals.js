/**
 * The id of a modal: the given id, or the default one when no id is given.
 * @param id
 * @param defaultId
 * @returns {*}
 */
export function collectId(id, defaultId) {
  let modalId = defaultId;
  if (id && $.trim(id)) {
    modalId = $.trim(id);
  }

  return modalId;
}
