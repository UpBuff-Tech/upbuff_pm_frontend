/**
 * @author Nithin
 */

// The "Edit Role" modal (#ic-edit). It is opened with the edit button of a role in the tree.

import PermissionCards from './PermissionCards';
import HomePageSelect from './HomePageSelect';

// Select2 of the home page dropdown
const HOME_PAGE_SELECT2 = {
  placeholder: 'Select Home Page',
  tokenSeparators: [','],
  allowClear: true,
  dropdownParent: '#ic-edit .modal-body',
};

/**
 * @param role        the word used for "Role" (config roleName)
 * @param form        useRoleForm() of the edit form
 * @param roleId      _id of the role that is edited
 * @param isLoading   true while the role data is being fetched
 * @param onSubmit, onClose
 */
export default function RoleEditModal({ role, form, roleId, isLoading, onSubmit, onClose }) {
  const { fields, setField } = form;

  return (
    <div className="modal fade" id="ic-edit" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl" role="document">
        <form className="role-update" id="roleAdds" onSubmit={onSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title"> Edit {role}</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body" style={{ position: 'relative' }}>
              {/* Loading overlay for edit modal */}
              <div id="editRoleLoader" style={{ display: isLoading ? 'flex' : 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="mt-2 text-muted small">Loading role data...</div>
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md mb-3">
                  <label className="form-label">{role} Name <span className="asteric_red">*</span></label>
                  <input type="text" minLength="2" id="roleDetailName" pattern="[^-\s][a-zA-Z0-9_\s-]+$"
                    title="Can't starts the field with space" name="name" placeholder={role + ' Name'} required
                    className="form-control"
                    value={fields.name} onChange={(event) => setField('name', event.target.value)} />
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md mb-3">
                  <label className="form-label">Description <span className="asteric_red">*</span></label>
                  <textarea name="description" className="createTextarea form-control" id="roleDetailDescription"
                    title={'Enter the ' + role + ' details'} placeholder={role + ' description'}
                    value={fields.description} onChange={(event) => setField('description', event.target.value)}></textarea>
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Home Page <span className="asteric_red">*</span></label>
                  <HomePageSelect className="homeURLUpdate form-control" name="homeURLUpdate" id="homeURLUpdate"
                    value={fields.homeURL} onChange={(value) => setField('homeURL', value)} select2Options={HOME_PAGE_SELECT2} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status <span className="asteric_red">*</span></label>
                  <select className="form-control" name="activeStatus" id="activeStatusEdit" required
                    value={fields.activeStatus} onChange={(event) => setField('activeStatus', event.target.value)}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="row" style={{ paddingTop: '25px' }}>
                <div className="col-md-12">
                  <h5 className="mb-3">Page Permissions</h5>
                  <p className="text-muted mb-4">Select which pages this role can access</p>

                  <PermissionCards mode="edit" permissions={form.permissions} selectAll={form.selectAll}
                    onSelectAll={form.toggleSelectAll} onPermission={form.togglePermission} />
                </div>
              </div>

              <input type="hidden" id="roleDetailId" name="_idRole" value={roleId} />
              <div className="row gy-3" style={{ paddingTop: '30px' }}>
                <div className="col-md md-5">
                  <button type="submit" name="submit" className="btn btn-primary pull-right">Update {role}</button>
                  <button type="button" className="btn btn-secondary closeRole" data-dismiss="modal" onClick={onClose}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
