/**
 * @author Visakh
 */

// The "Create User" page (/user/create and /userCreate/:_id - the id is not used by the page).

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import AttachmentList from './AttachmentList';
import FieldMessage from './FieldMessage';
import SpinnerGrow from './SpinnerGrow';
import {
  EMPTY_CREATE_FORM, PASSWORD_REG, buildNewEmployee, clearFileInputs, createFormBlurHandlers, fieldChanger,
  formUpdater, pickAttachments, pickProfilePhoto, readFileAsDataURL, readUploads, useRoleSelect2,
} from './userFormHelpers';

const MESSAGE_SIZE = '12px';

export default function UserCreate() {
  const navigate = useNavigate();
  const [roleNameArray, setRoleNameArray] = useState();
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [loading, setLoading] = useState(true);       // the .loadingSpinnerValue dots
  const [showPassword, setShowPassword] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const roleRef = useRef(null);
  const photoInputRef = useRef(null);
  const hintRef = useRef(null);

  const update = formUpdater(setForm);
  const onField = fieldChanger(update);
  const onBlur = createFormBlurHandlers(form, update, {
    email: 'Please enter a valid email address',
    password: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
    confirmPassword: 'Passwords do not match',
    contact: 'Invalid contact number',
  });

  // Initialize Select2 for role dropdown
  useRoleSelect2(roleRef, '', form.userRole, (role) => update({ userRole: role }), roleNameArray);

  useEffect(() => {
    // Fetch roles list
    api.call('role.roleNameGet2', (roleError, roleResult) => {
      if (!roleError) {
        setRoleNameArray(roleResult);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => $(document).unbind('.hint');
  }, []);

  /** Empties the form (after saving and on Cancel). */
  const resetForm = () => {
    setForm(EMPTY_CREATE_FORM);
    clearFileInputs('profilePhoto', 'attachments');
  };

  /**
   * Toggle password visibility
   */
  const togglePassword = (event) => {
    event.preventDefault();
    setShowPassword(!showPassword);
  };

  /**
   * Show password hint on focus; it fades out when something else is focused or clicked
   */
  const focusPassword = () => {
    setHintVisible(true);
    $(document).bind('focusin.hint click.hint', function (e) {
      if ($(e.target).closest('.hint, #password').length) return;
      $(document).unbind('.hint');
      $(hintRef.current).fadeOut('medium', () => setHintVisible(false));
    });
  };

  /**
   * Handle profile photo upload and preview
   */
  const changeProfilePhoto = (event) => {
    let file = pickProfilePhoto(event, 'File type not allowed. You can only upload GIF, JPG, PNG files.', 'Please upload an image less than 5MB');
    if (!file) return;
    readFileAsDataURL(file).then((result) => update({ profilePhotoPreview: result }));
  };

  /**
   * Handle multiple attachments
   */
  const changeAttachments = (event) => {
    let fileArray = pickAttachments(event, (file) => `File ${file.name} is too large. Maximum size is 10MB per file.`);
    if (!fileArray) return;
    update({ attachmentsList: fileArray, attachmentFiles: fileArray });
  };

  /**
   * Close form and navigate back
   */
  const closeUser = () => {
    resetForm();
    navigate('/user/list');
  };

  /**
   * Submit form to create user
   */
  const submitForm = (event) => {
    event.preventDefault();

    // Validate passwords match
    let password = form.password;
    let confirmPassword = form.confirmPassword;

    if (password !== confirmPassword) {
      update({ confirmPasswordSpan: 'Passwords do not match' });
      return;
    }

    // Validate password strength
    if (!PASSWORD_REG.test(password)) {
      update({ passwordSpan: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' });
      return;
    }

    // Show loading spinner
    setLoading(true);

    // Handle profile photo + attachments, wait for all file uploads to complete
    let profilePhotoFile = photoInputRef.current.files[0];
    readUploads(profilePhotoFile, form.attachmentFiles)
      .then(([profilePhoto, ...attachments]) => {
        // Prepare user data
        let userData = buildNewEmployee(form, profilePhoto, attachments);

        // Call method to create user
        api.call('user.createEmployee', userData, (error, result) => {
          setLoading(false);

          if (error) {
            toastr['error'](error.reason || 'Error creating user', 'ERROR');
          } else {
            toastr['success']('User created successfully', 'SUCCESS');

            // Reset form
            resetForm();

            // Navigate back to user list
            navigate('/user/list');
          }
        });
      })
      .catch((error) => {
        setLoading(false);
        toastr['error']('Error uploading files', 'ERROR');
        console.error('File upload error:', error);
      });
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light"></span>Create User</h4>
      <div className="row">
        <div className="card mb-4">
          <div className="card-body">
            <form className="userAdd" autoComplete="off" id="userAdd" onSubmit={submitForm}>

              {/* Personal Information Section */}
              <div className="mb-4">
                <h5 className="card-title mb-3">Personal Information</h5>
                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="userName">Name <span className="asteric_red">*</span></label>
                    <input type="text" className="form-control validation" id="userName" placeholder="Enter Full Name" name="userName" required
                      value={form.userName} onChange={onField} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="userContact">Contact <span className="asteric_red">*</span></label>
                    <input type="text" className="form-control validation" id="userContact" placeholder="Enter Contact Number" name="userContact" required
                      value={form.userContact} onChange={onField} onBlur={onBlur.userContact} />
                    <span id="contactSpan"><FieldMessage text={form.contactSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="personalEmail">Personal Email </label>
                    <input type="email" className="form-control validation" id="personalEmail" placeholder="Enter Personal Email" name="personalEmail"
                      value={form.personalEmail} onChange={onField} onBlur={onBlur.personalEmail} />
                    <span id="personalEmailSpan"><FieldMessage text={form.personalEmailSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="companyEmail">Company Email<span className="asteric_red">*</span></label>
                    <input type="email" className="form-control" id="companyEmail" placeholder="Enter Company Email" name="companyEmail" required
                      value={form.companyEmail} onChange={onField} onBlur={onBlur.companyEmail} />
                    <span id="companyEmailSpan"><FieldMessage text={form.companyEmailSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-12 mb-3">
                    <label className="form-label" htmlFor="userAddress">Address</label>
                    <textarea name="userAddress" className="form-control" id="userAddress" rows="3" placeholder="Enter Address"
                      value={form.userAddress} onChange={onField}></textarea>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="profilePhoto">Profile Photo</label>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <img className="" src={form.profilePhotoPreview} alt="Profile Photo" width="150px" height="150px"
                        style={{ objectFit: 'cover', borderRadius: '8px' }} id="profilePhotoPreview" />
                    </div>
                    <input type="file" className="form-control profilePhotoInput" id="profilePhoto" name="profilePhoto" accept="image/*"
                      ref={photoInputRef} onChange={changeProfilePhoto} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="attachments">Attachments (Multiple Files)</label>
                    <input type="file" className="form-control attachmentsInput" id="attachments" name="attachments" multiple
                      onChange={changeAttachments} />
                    <small className="text-muted">You can select multiple files</small>
                    <div id="attachmentsList" className="mt-2">
                      <AttachmentList items={form.attachmentsList} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Information Section */}
              <div className="mb-4">
                <h5 className="card-title mb-3">Employment Information</h5>
                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="joinedDate">Joined Date <span className="asteric_red">*</span></label>
                    <input type="date" className="form-control validation" id="joinedDate" name="joinedDate" required
                      value={form.joinedDate} onChange={onField} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="activeStatus">Active Status <span className="asteric_red">*</span></label>
                    <select className="form-control validation" id="activeStatus" name="activeStatus" required
                      value={form.activeStatus} onChange={onField}>
                      <option value="Y">Active</option>
                      <option value="N">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="leavingDate">Leaving Date</label>
                    <input type="date" className="form-control" id="leavingDate" name="leavingDate"
                      value={form.leavingDate} onChange={onField} />
                    <small className="text-muted">Leave empty if currently employed</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="userRole">Role <span className="asteric_red">*</span></label>
                    <select className="form-control validation selectRole" style={{ width: '100%' }} name="userRole" id="userRole" required
                      ref={roleRef} value={form.userRole} onChange={onField}>
                      <option disabled value="">Select Role</option>
                      {(roleNameArray || []).map((role) => (
                        <option key={role._id} value={role._id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary Information Section */}
              <div className="mb-4">
                <h5 className="card-title mb-3">Salary Information</h5>
                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="salaryAmount">Salary Amount</label>
                    <input type="number" className="form-control" id="salaryAmount" placeholder="Enter Salary Amount" name="salaryAmount" step="0.01"
                      value={form.salaryAmount} onChange={onField} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="salaryRevision">Salary Revision</label>
                    <input type="date" className="form-control" id="salaryRevision" name="salaryRevision"
                      value={form.salaryRevision} onChange={onField} />
                    <small className="text-muted">Date of last salary revision</small>
                  </div>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="mb-4">
                <h5 className="card-title mb-3">Login Credentials</h5>
                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="username">Username <span className="asteric_red">*</span></label>
                    <input type="text" className="form-control validation" id="username" placeholder="Enter Username" name="username" required
                      value={form.username} onChange={onField} />
                    <span id="usernameSpan"></span>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="password">Password <span className="asteric_red">*</span></label>
                    <div className="input-group">
                      <input type={showPassword ? 'text' : 'password'} className="form-control validation" id="password" placeholder="Enter Password" name="password" required
                        value={form.password} onChange={onField} onFocus={focusPassword} onBlur={onBlur.password} />
                      <button className="btn btn-outline-secondary toggle-password" type="button" onClick={togglePassword}>
                        <i className={showPassword ? 'bx bx-show' : 'bx bx-hide'}></i>
                      </button>
                    </div>
                    <span id="passwordSpan"><FieldMessage text={form.passwordSpan} fontSize={MESSAGE_SIZE} /></span>
                    <div className="hint" ref={hintRef} style={{ display: hintVisible ? 'block' : 'none', marginTop: '5px' }}>
                      <small className="text-muted">
                        Password must contain at least 8 characters, including uppercase, lowercase, and numbers.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="row gy-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="confirmPassword">Confirm Password <span className="asteric_red">*</span></label>
                    <input type="password" className="form-control validation" id="confirmPassword" placeholder="Confirm Password" name="confirmPassword" required
                      value={form.confirmPassword} onChange={onField} onBlur={onBlur.confirmPassword} />
                    <span id="confirmPasswordSpan"><FieldMessage text={form.confirmPasswordSpan} fontSize={MESSAGE_SIZE} /></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="row gy-3" style={{ paddingTop: '30px' }}>
                <div className="col-md-12">
                  <button type="submit" id="saveUser" className="btn btn-primary me-2">Save User</button>
                  <button type="button" className="btn btn-secondary closeUser" onClick={closeUser}>Cancel</button>
                </div>
              </div>
            </form>

            {/* Loading Spinner */}
            <SpinnerGrow className="demo-inline-spacing loadingSpinnerValue"
              style={{ textAlign: 'center', display: loading ? 'block' : 'none' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
