// The "Update Employee" modal of the user list page (#userEditPage).
//   form / setForm  - the form values, kept by the page (it fills them when the modal is opened)
//   rolesList       - the roles of the Role dropdown
//   printLoad       - true while the loading overlay must be shown
//   setModalLoader  - switches that overlay on / off
//   onClosen        - the page's handler of the .closen buttons (empties the form, hides the modals)
//   onUpdated       - called with the user id after the user was saved

import { useRef } from 'react';
import api from '../../api/client';
import AttachmentList from './AttachmentList';
import LoadersSpin from './LoadersSpin';
import {
  OPTIONAL_PASSWORD_REG, fieldChanger, formUpdater, pickAttachments, pickProfilePhoto, readFileAsDataURL,
  readUploads, useRoleSelect2,
} from './userFormHelpers';

/** The red message below a password input. */
function PasswordMessage({ text }) {
  if (!text) return null;
  return <font color="#fc5f5f" size="2">{text}</font>;
}

export default function UserEditModal({ form, setForm, rolesList, printLoad, setModalLoader, onClosen, onUpdated }) {
  const roleRef = useRef(null);
  const photoInputRef = useRef(null);

  const update = formUpdater(setForm);
  const onField = fieldChanger(update);

  useRoleSelect2(roleRef, '#userEditPage', form.editUserRole, (role) => update({ editUserRole: role }), rolesList);

  const togglePasswords = () => {
    update({ showPasswords: !form.showPasswords });
  };

  const blurPasswords = () => {
    update({ passwordspans: !OPTIONAL_PASSWORD_REG.test(form.passwords) ? 'Please enter valid password' : '' });
  };

  const blurConfirmPasswords = () => {
    update({
      confirmPasswordspans: form.confirmPasswords != form.passwords ? "Those passwords didn't match. Try again !" : ''
    });
  };

  /**
   * Handle profile photo upload in edit modal
   */
  const changeProfilePhoto = (event) => {
    let file = pickProfilePhoto(event, 'Only JPG, PNG, GIF files allowed', 'Image must be less than 5MB');
    if (!file) return;
    readFileAsDataURL(file).then((result) => update({ profilePhotoPreviewEdit: result }));
  };

  /**
   * Handle attachments upload in edit modal
   */
  const changeAttachments = (event) => {
    let fileArray = pickAttachments(event, (file) => `${file.name} is too large. Max 10MB per file.`);
    if (!fileArray) return;
    update({ attachmentsListEdit: fileArray, attachmentFilesEdit: fileArray });
  };

  /**
   * Submit user update form
   */
  const submitForm = (event) => {
    event.preventDefault();

    let password = form.passwords;
    let confirmPassword = form.confirmPasswords;

    // Only validate password if it's provided
    if (password) {
      if (!OPTIONAL_PASSWORD_REG.test(password)) {
        update({ passwordspans: 'Invalid Password' });
        return;
      }

      if (password !== confirmPassword) {
        update({ confirmPasswordspans: 'Passwords do not match' });
        return;
      }
    }

    // Show loading
    setModalLoader(true);

    let userId = form.id;

    // Handle profile photo + attachments, wait for all files
    let profilePhotoFile = photoInputRef.current.files[0];
    readUploads(profilePhotoFile, form.attachmentFilesEdit)
      .then(([profilePhoto, ...attachments]) => {
        let userData = {
          name: $.trim(form.editUserName),
          username: $.trim(form.editUserLoginName),
          contact: $.trim(form.editUserContact),
          personalEmail: $.trim(form.editPersonalEmail),
          companyEmail: $.trim(form.editCompanyEmail),
          address: $.trim(form.editUserAddress),
          joinedDate: form.editJoinedDate ? new Date(form.editJoinedDate) : null,
          activeStatus: form.editActiveStatus,
          leavingDate: form.editLeavingDate ? new Date(form.editLeavingDate) : null,
          role: form.editUserRole,
          salaryAmount: form.editSalaryAmount ? parseFloat(form.editSalaryAmount) : null,
          salaryRevision: form.editSalaryRevision ? new Date(form.editSalaryRevision) : null,
          password: password || null,
          profilePhoto: profilePhoto,
          attachments: attachments.length > 0 ? attachments : null
        };

        api.call('user.updateEmployee', userId, userData, (error) => {
          setModalLoader(false);

          if (error) {
            toastr['error'](error.reason || 'Error updating employee', 'ERROR');
          } else {
            toastr['success']('Employee updated successfully', 'SUCCESS');
            update({ passwords: '', confirmPasswords: '', passwordspans: '', confirmPasswordspans: '' });
            $('#userEditPage').modal('hide');
            onUpdated(userId);
          }
        });
      })
      .catch((error) => {
        setModalLoader(false);
        toastr['error']('Error uploading files', 'ERROR');
        console.error('File upload error:', error);
      });
  };

  return (
    <div className="modal fade" id="userEditPage" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl" role="document">
        <form className="updateUser" id="updateUser" onSubmit={submitForm}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="categoryH">Update Employee</h5>
              <button type="button" className="btn-close closen" data-dismiss="modal" aria-label="Close" onClick={onClosen}></button>
            </div>
            <div className="modal-body">
              <div className="row">
                {/* Personal Information */}
                <div className="col-md-6">
                  <h6 className="mb-3 fw-bold text-primary">Personal Information</h6>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editUserName">Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="editUserName" name="editUserName"
                      required value={form.editUserName} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editUserLoginName">Username</label>
                    <input type="text" className="form-control form-control-sm" id="editUserLoginName" name="editUserLoginName"
                      value={form.editUserLoginName} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editUserContact">Contact <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="editUserContact" name="editUserContact"
                      required value={form.editUserContact} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editPersonalEmail">Personal Email </label>
                    <input type="text" className="form-control form-control-sm" id="editPersonalEmail"
                      name="editPersonalEmail" required value={form.editPersonalEmail} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editCompanyEmail">Company Email <span
                        className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="editCompanyEmail"
                      name="editCompanyEmail" value={form.editCompanyEmail} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="editUserAddress">Address</label>
                    <textarea className="form-control form-control-sm" id="editUserAddress" rows="2"
                      value={form.editUserAddress} onChange={onField}></textarea>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="col-md-6">
                  <h6 className="mb-3 fw-bold text-primary">Employment Information</h6>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editJoinedDate">Joined Date <span
                          className="text-danger">*</span></label>
                      <input type="date" className="form-control form-control-sm" id="editJoinedDate" required
                        value={form.editJoinedDate} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editActiveStatus">Status <span className="text-danger">*</span></label>
                      <select className="form-control form-control-sm" id="editActiveStatus" required
                        value={form.editActiveStatus} onChange={onField}>
                        <option value="Y">Active</option>
                        <option value="N">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editLeavingDate">Leaving Date</label>
                      <input type="date" className="form-control form-control-sm" id="editLeavingDate"
                        value={form.editLeavingDate} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editUserRole">Role <span className="text-danger">*</span></label>
                      <select className="form-control form-control-sm selectRoleEdit" style={{ width: '100%' }} id="editUserRole"
                        required ref={roleRef} value={form.editUserRole} onChange={onField}>
                        <option value="">Select Role</option>
                        {(rolesList || []).map((role) => (
                          <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h6 className="mb-2 mt-3 fw-bold text-primary">Salary Information</h6>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editSalaryAmount">Salary Amount</label>
                      <input type="number" className="form-control form-control-sm" id="editSalaryAmount" step="0.01"
                        value={form.editSalaryAmount} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="editSalaryRevision">Salary Revision</label>
                      <input type="date" className="form-control form-control-sm" id="editSalaryRevision"
                        value={form.editSalaryRevision} onChange={onField} />
                    </div>
                  </div>

                  <h6 className="mb-2 mt-3 fw-bold text-primary">Change Password (Optional)</h6>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="passwords">New Password</label>
                    <div className="input-group input-group-sm">
                      <input type={form.showPasswords ? 'text' : 'password'} className="form-control" id="passwords"
                        placeholder="Leave blank to keep current"
                        value={form.passwords} onChange={onField} onBlur={blurPasswords} />
                      {/* the old page toggled the icon classes on the button itself */}
                      <button className={'btn btn-outline-secondary toggle-passwords' + (form.showPasswords ? ' bx-show bx-hide' : '')}
                        type="button" onClick={togglePasswords}>
                        <i className="bx bx-hide"></i>
                      </button>
                    </div>
                    <span id="passwordspans"><PasswordMessage text={form.passwordspans} /></span>
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="confirmPasswords">Confirm Password</label>
                    <input type="password" className="form-control form-control-sm" id="confirmPasswords"
                      placeholder="Confirm new password"
                      value={form.confirmPasswords} onChange={onField} onBlur={blurConfirmPasswords} />
                    <span id="confirmPasswordspans"><PasswordMessage text={form.confirmPasswordspans} /></span>
                  </div>
                </div>
              </div>

              {/* Profile Photo Section */}
              <div className="row mt-3">
                <div className="col-md-6">
                  <h6 className="mb-2 fw-bold text-primary">Profile Photo</h6>
                  <div className="text-center mb-2">
                    <img src={form.profilePhotoPreviewEdit} alt="Profile Photo" width="120px" height="120px"
                      style={{ objectFit: 'cover', borderRadius: '8px', display: form.profilePhotoPreviewEdit ? undefined : 'none' }}
                      id="profilePhotoPreviewEdit" />
                  </div>
                  <input type="file" className="form-control form-control-sm profilePhotoInputEdit" id="profilePhotoEdit"
                    name="profilePhotoEdit" accept="image/*" ref={photoInputRef} onChange={changeProfilePhoto} />
                  <small className="text-muted">Max 5MB, JPG/PNG/GIF</small>
                </div>
                <div className="col-md-6">
                  <h6 className="mb-2 fw-bold text-primary">Attachments</h6>
                  <input type="file" className="form-control form-control-sm attachmentsInputEdit" id="attachmentsEdit"
                    name="attachmentsEdit" multiple onChange={changeAttachments} />
                  <small className="text-muted">Multiple files allowed, max 10MB each</small>
                  <div id="attachmentsListEdit" className="mt-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <AttachmentList items={form.attachmentsListEdit} compact />
                  </div>
                </div>
              </div>

              <input type="hidden" className="id" name="id" value={form.id} readOnly />
              <input type="hidden" className="hiddenemail" name="hiddenemail" />
              <input type="hidden" className="isDeleted" name="isDeleted" />
              <LoadersSpin printLoad={printLoad} />
            </div>
            <div className="modal-footer">
              <div className="col-md md-5">
                <button type="button" className="btn btn-secondary closen pull-left" data-dismiss="modal"
                  id="categoryClose" onClick={onClosen}>Close</button>
                <button type="submit" className="btn btn-primary pull-right">Update User</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
