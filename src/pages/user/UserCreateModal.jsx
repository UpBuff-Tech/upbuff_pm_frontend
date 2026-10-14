// The "Create User" modal of the user list page (#userCreateModal).
//   form / setForm  - the form values, kept by the page (it empties the form when the modal is opened)
//   rolesList       - the roles of the Role dropdown
//   printLoad       - true while the loading overlay must be shown
//   setModalLoader  - switches that overlay on / off

import { useRef, useState } from 'react';
import api from '../../api/client';
import AttachmentList from './AttachmentList';
import FieldMessage from './FieldMessage';
import SpinnerGrow from './SpinnerGrow';
import {
  EMPTY_CREATE_FORM, PASSWORD_REG, buildNewEmployee, clearFileInputs, closeParentModal, createFormBlurHandlers,
  fieldChanger, formUpdater, pickAttachments, pickProfilePhoto, readFileAsDataURL, readUploads, useRoleSelect2,
} from './userFormHelpers';

const MESSAGE_SIZE = '11px';

export default function UserCreateModal({ form, setForm, rolesList, printLoad, setModalLoader }) {
  const [showPassword, setShowPassword] = useState(false);
  const roleRef = useRef(null);
  const photoInputRef = useRef(null);

  const update = formUpdater(setForm);
  const onField = fieldChanger(update);
  const onBlur = createFormBlurHandlers(form, update, {
    email: 'Invalid email',
    password: 'Min 8 chars, uppercase, lowercase, numbers',
    confirmPassword: 'Passwords do not match',
    contact: 'Invalid contact',
  });

  useRoleSelect2(roleRef, '#userCreateModal', form.userRole, (role) => update({ userRole: role }), rolesList);

  /**
   * Toggle password visibility in modal
   */
  const togglePassword = (event) => {
    event.preventDefault();
    setShowPassword(!showPassword);
  };

  /**
   * Handle profile photo upload in modal (Create)
   */
  const changeProfilePhoto = (event) => {
    let file = pickProfilePhoto(event, 'Only JPG, PNG, GIF files allowed', 'Image must be less than 5MB');
    if (!file) return;
    readFileAsDataURL(file).then((result) => update({ profilePhotoPreview: result }));
  };

  /**
   * Handle attachments upload in create modal
   */
  const changeAttachments = (event) => {
    let fileArray = pickAttachments(event, (file) => `${file.name} is too large. Max 10MB per file.`);
    if (!fileArray) return;
    update({ attachmentsList: fileArray, attachmentFiles: fileArray });
  };

  /**
   * Submit user creation form
   */
  const submitForm = (event) => {
    event.preventDefault();

    // Validate passwords
    let password = form.password;
    let confirmPassword = form.confirmPassword;

    if (password !== confirmPassword) {
      update({ confirmPasswordSpan: 'Passwords do not match' });
      return;
    }

    if (!PASSWORD_REG.test(password)) {
      update({ passwordSpan: 'Invalid password format' });
      return;
    }

    // Show loading
    setModalLoader(true);

    // Handle profile photo + attachments, wait for all files
    let profilePhotoFile = photoInputRef.current.files[0];
    readUploads(profilePhotoFile, form.attachmentFiles)
      .then(([profilePhoto, ...attachments]) => {
        let userData = buildNewEmployee(form, profilePhoto, attachments);

        api.call('user.createEmployee', userData, (error, result) => {
          setModalLoader(false);

          if (error) {
            toastr['error'](error.reason || 'Error creating user', 'ERROR');
          } else {
            toastr['success']('User created successfully', 'SUCCESS');

            // Reset and close
            setForm(EMPTY_CREATE_FORM);
            clearFileInputs('profilePhoto', 'attachments');
            $('#userCreateModal').modal('hide');
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
    <div className="modal fade" id="userCreateModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create User</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close" onClick={closeParentModal}></button>
          </div>
          <form className="userCreateForm" autoComplete="off" id="userCreateForm" onSubmit={submitForm}>
            <div className="modal-body">
              <div className="row">

                {/* Personal Information Section */}
                <div className="col-md-6">
                  <h6 className="mb-3 fw-bold text-primary">Personal Information</h6>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="userName">Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="userName" placeholder="Enter Full Name"
                      name="userName" required value={form.userName} onChange={onField} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="userContact">Contact <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="userContact"
                      placeholder="Enter Contact Number" name="userContact" required
                      value={form.userContact} onChange={onField} onBlur={onBlur.userContact} />
                    <span id="contactSpan"><FieldMessage text={form.contactSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="personalEmail">Personal Email <span
                        className="text-danger">*</span></label>
                    <input type="email" className="form-control form-control-sm" id="personalEmail"
                      placeholder="Enter Personal Email" name="personalEmail" required
                      value={form.personalEmail} onChange={onField} onBlur={onBlur.personalEmail} />
                    <span id="personalEmailSpan"><FieldMessage text={form.personalEmailSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="companyEmail">Company Email</label>
                    <input type="email" className="form-control form-control-sm" id="companyEmail"
                      placeholder="Enter Company Email" name="companyEmail"
                      value={form.companyEmail} onChange={onField} onBlur={onBlur.companyEmail} />
                    <span id="companyEmailSpan"><FieldMessage text={form.companyEmailSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="userAddress">Address</label>
                    <textarea name="userAddress" className="form-control form-control-sm" id="userAddress" rows="2"
                      placeholder="Enter Address" value={form.userAddress} onChange={onField}></textarea>
                  </div>
                </div>

                {/* Employment & Login Section */}
                <div className="col-md-6">
                  <h6 className="mb-3 fw-bold text-primary">Employment Information</h6>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="joinedDate">Joined Date <span className="text-danger">*</span></label>
                      <input type="date" className="form-control form-control-sm" id="joinedDate" name="joinedDate" required
                        value={form.joinedDate} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="activeStatus">Status <span className="text-danger">*</span></label>
                      <select className="form-control form-control-sm" id="activeStatus" name="activeStatus" required
                        value={form.activeStatus} onChange={onField}>
                        <option value="Y">Active</option>
                        <option value="N">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="leavingDate">Leaving Date</label>
                      <input type="date" className="form-control form-control-sm" id="leavingDate" name="leavingDate"
                        value={form.leavingDate} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="userRole">Role <span className="text-danger">*</span></label>
                      <select className="form-control form-control-sm selectRoleModal" style={{ width: '100%' }} name="userRole"
                        id="userRole" required ref={roleRef} value={form.userRole} onChange={onField}>
                        <option disabled value="">Select Role</option>
                        {(rolesList || []).map((role) => (
                          <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h6 className="mb-2 mt-3 fw-bold text-primary">Salary Information</h6>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="salaryAmount">Salary Amount</label>
                      <input type="number" className="form-control form-control-sm" id="salaryAmount"
                        placeholder="Enter Salary" name="salaryAmount" step="0.01"
                        value={form.salaryAmount} onChange={onField} />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="salaryRevision">Salary Revision</label>
                      <input type="date" className="form-control form-control-sm" id="salaryRevision" name="salaryRevision"
                        value={form.salaryRevision} onChange={onField} />
                    </div>
                  </div>

                  <h6 className="mb-2 mt-3 fw-bold text-primary">Login Credentials</h6>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="username">Username <span className="text-danger">*</span></label>
                    <input type="text" className="form-control form-control-sm" id="username" placeholder="Enter Username"
                      name="username" required value={form.username} onChange={onField} />
                    <span id="usernameSpan"></span>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="password">Password <span className="text-danger">*</span></label>
                      <div className="input-group input-group-sm">
                        <input type={showPassword ? 'text' : 'password'} className="form-control" id="password" placeholder="Enter Password"
                          name="password" required value={form.password} onChange={onField} onBlur={onBlur.password} />
                        <button className="btn btn-outline-secondary toggle-password-modal" type="button" onClick={togglePassword}>
                          <i className={showPassword ? 'bx bx-show' : 'bx bx-hide'}></i>
                        </button>
                      </div>
                      <span id="passwordSpan"><FieldMessage text={form.passwordSpan} fontSize={MESSAGE_SIZE} /></span>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label" htmlFor="confirmPassword">Confirm Password <span
                          className="text-danger">*</span></label>
                      <input type="password" className="form-control form-control-sm" id="confirmPassword"
                        placeholder="Confirm Password" name="confirmPassword" required
                        value={form.confirmPassword} onChange={onField} onBlur={onBlur.confirmPassword} />
                      <span id="confirmPasswordSpan"><FieldMessage text={form.confirmPasswordSpan} fontSize={MESSAGE_SIZE} /></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Files Section (Full Width) */}
              <div className="row mt-3">
                <div className="col-md-6">
                  <h6 className="mb-2 fw-bold text-primary">Profile Photo</h6>
                  <div className="text-center mb-2">
                    <img src={form.profilePhotoPreview} alt="Profile Photo" width="120px" height="120px"
                      style={{ objectFit: 'cover', borderRadius: '8px', display: form.profilePhotoPreview ? undefined : 'none' }}
                      id="profilePhotoPreview" />
                  </div>
                  <input type="file" className="form-control form-control-sm profilePhotoInput" id="profilePhoto"
                    name="profilePhoto" accept="image/*" ref={photoInputRef} onChange={changeProfilePhoto} />
                  <small className="text-muted">Max 5MB, JPG/PNG/GIF</small>
                </div>
                <div className="col-md-6">
                  <h6 className="mb-2 fw-bold text-primary">Attachments</h6>
                  <input type="file" className="form-control form-control-sm attachmentsInput" id="attachments"
                    name="attachments" multiple onChange={changeAttachments} />
                  <small className="text-muted">Multiple files allowed, max 10MB each</small>
                  <div id="attachmentsList" className="mt-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <AttachmentList items={form.attachmentsList} compact />
                  </div>
                </div>
              </div>

              {/* Loading Spinner */}
              {printLoad && (
                <div className="loadersSpin"
                  style={{ width: '100%', opacity: 0.9, position: 'absolute', top: 0, bottom: 0, right: 0, left: 0, zIndex: 100000 }}>
                  <div className="loader-lg"
                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                    <SpinnerGrow />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={closeParentModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save User</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
