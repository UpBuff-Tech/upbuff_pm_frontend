/**
 * @author Nithin
 */

// The "Page Permissions" cards of a role form: one card per page, with a "Select All" box
// and one check box per permission. Used by the create modal (mode="create") and the
// edit modal (mode="edit"); only the ids and class names differ between the two.

import { PERMISSION_SECTIONS } from './permissions';

export default function PermissionCards({ mode, permissions, selectAll, onSelectAll, onPermission }) {
  const isEdit = mode === 'edit';
  const idSuffix = isEdit ? 'Edit' : 'Create';

  return (
    <div className="row g-3">
      {PERMISSION_SECTIONS.map((section) => {
        const selectAllId = section.idPrefix + 'SelectAll' + idSuffix;
        let itemClass = 'form-check-input ' + section.key + '-permission-' + mode;
        if (isEdit && section.editClass) itemClass += ' ' + section.editClass;

        return (
          <div className="col-md-6" key={section.key}>
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    <i className={section.icon}></i>{section.title}
                  </h6>
                  <div className="form-check">
                    <input type="checkbox" id={selectAllId} className={'form-check-input select-all-' + section.key + '-' + mode}
                      checked={!!selectAll[section.key]}
                      onChange={(event) => onSelectAll(section, event.target.checked)} />
                    <label className="form-check-label fw-bold text-primary" htmlFor={selectAllId}>Select All</label>
                  </div>
                </div>
                <div className="d-flex gap-3 flex-wrap">
                  {section.items.map((item) => {
                    const itemId = isEdit ? item.editId : item.createId;
                    return (
                      <div className="form-check" key={item.name}>
                        <input type="checkbox" id={itemId} className={itemClass} name={item.name}
                          checked={!!permissions[item.name]}
                          onChange={(event) => onPermission(section, item.name, event.target.checked)} />
                        <label className="form-check-label" htmlFor={itemId}>{item.label}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
