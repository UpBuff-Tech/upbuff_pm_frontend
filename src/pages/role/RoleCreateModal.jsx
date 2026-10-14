/**
 * @author Nithin
 */

// The "Create Role" modal (#ic-create). It is opened with the "Add child role" button of the tree.

import PermissionCards from './PermissionCards';
import HomePageSelect from './HomePageSelect';

/**
 * @param role             the word used for "Role" (config roleName)
 * @param form             useRoleForm() of the create form
 * @param parentRole       { id, name } of the role the new role is created under (null = none yet)
 * @param nameStyle        style of the name box (red when the name is taken)
 * @param takenName        the name that already exists (null = no message)
 * @param submitDisabled
 * @param select2Options   options of the Home Page select2 dropdown (null = not a select2 yet)
 * @param onNameBlur, onSubmit, onClose
 */
export default function RoleCreateModal({ role, form, parentRole, nameStyle, takenName, submitDisabled, select2Options, onNameBlur, onSubmit, onClose }) {
  const { fields, setField } = form;

  return (
    <div className="modal fade" id="ic-create" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl" role="document">
        <form className="role-create" id="roleAddModal" onSubmit={onSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Create {role}</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <input type="hidden" name="parentId" id="createRoleParentId" value={parentRole ? parentRole.id : ''} />
              <div id="createParentRoleBanner" className="alert alert-info py-2 mb-3" style={{ display: parentRole ? '' : 'none' }}>
                <i className="fa fa-sitemap me-2"></i>Creating child role under: <strong id="createParentRoleName">{parentRole ? parentRole.name : ''}</strong>
              </div>
              <div className="row gy-3">
                <div className="col-md mb-3">
                  <label className="form-label">{role} Name <span className="asteric_red">*</span></label>
                  <input type="text" minLength="2" id="createRoleName" pattern="[^-\s][a-zA-Z0-9_\s-]+$"
                    title="Can't starts the field with space" name="name" placeholder={role + ' Name'} required
                    className="form-control" style={nameStyle || undefined}
                    value={fields.name} onChange={(event) => setField('name', event.target.value)} onBlur={onNameBlur} />
                  <br /><span id="createRoleNameSpan">
                    {takenName !== null && (
                      <font color="#fc5f5f" size="2">Name <font weight="bold" size="2">{takenName} </font> already exits</font>
                    )}
                  </span>
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md mb-3">
                  <label className="form-label">Description <span className="asteric_red">*</span></label>
                  <textarea name="description" className="createTextarea form-control" id="createRoleDescription"
                    title={'Enter the ' + role + ' details'} placeholder={role + ' description'}
                    value={fields.description} onChange={(event) => setField('description', event.target.value)}></textarea>
                </div>
              </div>
              <div className="row gy-3">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Home Page <span className="asteric_red">*</span></label>
                  <HomePageSelect className="homeURLCreate form-control" name="homeURL" id="homeURLCreate"
                    value={fields.homeURL} onChange={(value) => setField('homeURL', value)} select2Options={select2Options} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status <span className="asteric_red">*</span></label>
                  <select className="form-control" name="activeStatus" id="activeStatusCreate" required
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

                  <PermissionCards mode="create" permissions={form.permissions} selectAll={form.selectAll}
                    onSelectAll={form.toggleSelectAll} onPermission={form.togglePermission} />
                </div>
              </div>

              <div className="row gy-3" style={{ paddingTop: '30px' }}>
                <div className="col-md md-5">
                  <button type="submit" id="createRoleSubmit" name="submit" className="btn btn-primary pull-right" disabled={submitDisabled}>Save {role}</button>
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
