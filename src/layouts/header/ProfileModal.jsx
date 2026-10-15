// The "my profile" popup opened from the header user menu: a Details tab and an Edit tab.

import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EMPTY_DETAIL = {
  name: '', nameHeader: '', roleHeader: '', contact: '', personalEmail: '', companyEmail: '', address: '',
  username: '', role: '', joinedDate: '', leavingDate: '', active: null, salary: '',
  photo: '',
  attachments: null, // null until the profile was loaded once
};

const EMPTY_EDIT = {
  firstName: '', lastName: '', username: '', contact: '', personalEmail: '', companyEmail: '', address: '',
};

/** The value shown in the details view, as an edit field value ('N/A' means empty). */
function detailValue(text) {
  const value = text.trim();
  return value === 'N/A' ? '' : value;
}

/** Edit form values taken from the details view. */
function editValues(detail) {
  const name = detail.name.trim();
  const nameParts = name === 'N/A' ? [''] : name.split(' ');
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    username: detailValue(detail.username),
    contact: detailValue(detail.contact),
    personalEmail: detailValue(detail.personalEmail),
    companyEmail: detailValue(detail.companyEmail),
    address: detailValue(detail.address),
  };
}

function initialsOf(name) {
  if (!name || name === 'N/A') return 'U';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

/** Reads a file as a data URL. */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** A text input with an icon inside its left edge. */
function IconInput({ icon, ...inputProps }) {
  return (
    <div className="fx-input-icon">
      <i className={'bx ' + icon}></i>
      <input className="form-control" {...inputProps} />
    </div>
  );
}

function AttachmentLinks({ attachments }) {
  return attachments.map((att, index) => (
    <a key={index} href={att.url || att} target="_blank" rel="noopener noreferrer" className="fx-file-chip">
      <i className="bx bx-file"></i>
      <span>{att.name || att.fileName || 'Attachment'}</span>
      <i className="bx bx-link-external fx-file-chip-open"></i>
    </a>
  ));
}

/** One label/value cell of the details grid. */
function InfoItem({ icon, label, id, children }) {
  const empty = children === 'N/A' || children === '' || children === null;
  return (
    <div className="fx-info-item">
      <span className="fx-info-icon"><i className={'bx ' + icon}></i></span>
      <div className="fx-info-text">
        <span className="fx-info-label">{label}</span>
        <span id={id} className={'fx-info-value' + (empty ? ' is-empty' : '')}>{empty ? 'Not provided' : children}</span>
      </div>
    </div>
  );
}

/**
 * openRequest: increases every time the popup should open.
 * initialTab:  'details' or 'edit' — the tab shown when it opens.
 */
export default function ProfileModal({ openRequest, initialTab = 'details' }) {
  const { userId, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [edit, setEdit] = useState(EMPTY_EDIT);
  const [editPhotoPreview, setEditPhotoPreview] = useState('');
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const photoInput = useRef(null);
  const attachmentsInput = useRef(null);

  const startEditing = (fromDetail) => {
    setEdit(editValues(fromDetail));
    setEditPhotoPreview(fromDetail.photo);
    setPhotoRemoved(false);
    setNewFiles([]);
    photoInput.current.value = '';
    attachmentsInput.current.value = '';
    setActiveTab('edit');
  };

  // Open the popup and load the profile each time it is requested.
  useEffect(() => {
    if (!openRequest) return;

    setActiveTab('details');
    setLoading(true);
    $('#menuUserDetailPage').modal('show');

    api.call('user.dataGets', userId, (error, result) => {
      setLoading(false);

      if (error) {
        toastr.error('Error loading profile: ' + (error.reason || error.message), 'Error');
        return;
      }

      if (result && result.userRes) {
        const user = result.userRes;
        const roleName = result.roleName || '';

        const fullName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
        const loaded = {
          // Personal Information
          name: fullName || user.username || 'N/A',
          nameHeader: fullName || user.username || 'N/A',
          roleHeader: roleName || 'N/A',
          contact: user.contactNo || user.profile?.contact || 'N/A',
          personalEmail: user.emails?.[0]?.address || user.emailAddress || 'N/A',
          companyEmail: user.companyEmail || 'N/A',
          address: user.address || 'N/A',

          // Employment Information
          username: user.username || 'N/A',
          role: roleName || 'N/A',
          joinedDate: user.joinedDate ? moment(user.joinedDate).format('DD MMM YYYY') : 'N/A',
          leavingDate: user.leavingDate ? moment(user.leavingDate).format('DD MMM YYYY') : 'N/A',
          active: user.active !== false,
          salary: user.salaryAmount ? `₹${user.salaryAmount}` : 'N/A',

          // Profile Photo
          photo: user.profile?.logo || user.logo || '',

          // Attachments
          attachments: user.attachments || [],
        };
        setDetail(loaded);
        if (initialTab === 'edit') startEditing(loaded);
      } else {
        toastr.error('Error loading profile details', 'Error');
      }
    });
  }, [openRequest]);

  const showTab = (e, tab) => {
    e.preventDefault();
    if (tab === 'edit') {
      startEditing(detail);
    } else {
      setActiveTab(tab);
    }
  };

  const changeEdit = (e) => {
    setEdit({ ...edit, [e.target.name]: e.target.value });
  };

  const changeProfilePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toastr.error('Profile photo must be less than 10MB');
        e.target.value = '';
        return;
      }
      setPhotoRemoved(false);
      readFileAsDataURL(file).then(setEditPhotoPreview);
    }
  };

  const removeProfilePhoto = () => {
    photoInput.current.value = '';
    setEditPhotoPreview('');
    setPhotoRemoved(true);
  };

  /** Adds picked or dropped files to the attachments to upload; files over the limit are skipped. */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const tooBig = files.filter((file) => file.size > MAX_FILE_SIZE);
    tooBig.forEach((file) => toastr.error(`${file.name} exceeds 10MB limit`));
    const accepted = files.filter((file) => file.size <= MAX_FILE_SIZE);
    if (accepted.length) setNewFiles((current) => [...current, ...accepted]);
    attachmentsInput.current.value = '';
  };

  const removeNewFile = (index) => {
    setNewFiles((current) => current.filter((_, i) => i !== index));
  };

  const dropFiles = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const saveProfile = () => {
    const profileData = {
      firstName: edit.firstName.trim(),
      lastName: edit.lastName.trim(),
      contact: edit.contact.trim(),
      personalEmail: edit.personalEmail.trim(),
      companyEmail: edit.companyEmail.trim(),
      address: edit.address.trim()
    };

    if (!profileData.firstName) {
      toastr.error('First name is required');
      return;
    }

    setSaving(true);

    // Handle profile photo
    const photoFile = photoInput.current.files[0];
    const photoPromise = photoFile ? readFileAsDataURL(photoFile) : Promise.resolve(null);

    // Handle attachments (already size-checked when added)
    const attPromises = newFiles.map((file) => readFileAsDataURL(file)
      .then((data) => ({ name: file.name, type: file.type, size: file.size, data })));

    Promise.all([photoPromise, ...attPromises])
      .then(([profilePhoto, ...attachments]) => {
        profileData.profilePhoto = profilePhoto;
        profileData.removeProfilePhoto = !profilePhoto && photoRemoved;
        if (attachments.length > 0) {
          profileData.attachments = attachments;
        }

        api.call('user.updateMyProfile', profileData, (error) => {
          setSaving(false);

          if (error) {
            toastr.error(error.reason || 'Failed to update profile');
            return;
          }

          toastr.success('Profile updated successfully');
          refreshUser();

          // Update details view with new data
          const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
          setDetail((current) => ({
            ...current,
            name: fullName || 'N/A',
            nameHeader: fullName || 'N/A',
            contact: profileData.contact || 'N/A',
            personalEmail: profileData.personalEmail || 'N/A',
            companyEmail: profileData.companyEmail || 'N/A',
            address: profileData.address || 'N/A',
            // Update profile photo in details view
            photo: profilePhoto || (photoRemoved ? '' : current.photo),
            attachments: [...(current.attachments || []), ...attachments.map(({ name, type, size }) => ({ name, type, size }))],
          }));

          // Switch back to details tab
          setActiveTab('details');
        });
      })
      .catch(err => {
        setSaving(false);
        toastr.error(err.message || 'Error uploading files');
      });
  };

  const hasAttachments = detail.attachments && detail.attachments.length > 0;
  const headerPhoto = activeTab === 'edit' ? editPhotoPreview : detail.photo;

  return (
    <div className="modal fade fx-profile-modal" id="menuUserDetailPage" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
        <div className="modal-content">
          {/* Cover + identity */}
          <div className="fx-profile-cover">
            <button type="button" className="fx-profile-close" data-dismiss="modal" aria-label="Close">
              <i className="bx bx-x"></i>
            </button>
          </div>
          <div className="fx-profile-identity">
            <div className="fx-profile-photo">
              {headerPhoto ? (
                <img id="menuDetailProfilePhoto" src={headerPhoto} alt="Profile photo" />
              ) : (
                <span id="menuDetailProfilePlaceholder" className="fx-profile-photo-initials">{initialsOf(detail.nameHeader)}</span>
              )}
              {activeTab === 'edit' && (
                <label htmlFor="editProfilePhoto" className="fx-profile-photo-overlay" title="Change photo">
                  <i className="bx bx-camera"></i>
                </label>
              )}
            </div>
            <div className="fx-profile-heading">
              <h5 id="menuDetailNameHeader">{detail.nameHeader || ' '}</h5>
              <div className="fx-profile-meta">
                <span id="menuDetailRoleHeader">{detail.roleHeader}</span>
                {detail.active === true && <span className="badge bg-label-success"><span className="fx-status-dot"></span>Active</span>}
                {detail.active === false && <span className="badge bg-label-danger">Inactive</span>}
              </div>
            </div>
          </div>

          <ul className="nav nav-tabs fx-profile-tabs" id="profileTabs">
            <li className="nav-item">
              <a className={'nav-link' + (activeTab === 'details' ? ' active' : '')} id="profileDetailsTab" data-tab="details" href="#"
                onClick={(e) => showTab(e, 'details')}><i className="bx bx-id-card me-1"></i>Overview</a>
            </li>
            <li className="nav-item">
              <a className={'nav-link' + (activeTab === 'edit' ? ' active' : '')} id="profileEditTab" data-tab="edit" href="#"
                onClick={(e) => showTab(e, 'edit')}><i className="bx bx-edit-alt me-1"></i>Edit profile</a>
            </li>
          </ul>

          <div className="modal-body" style={{ position: 'relative' }}>

            {/* ===== DETAILS TAB ===== */}
            <div id="profileDetailSection" style={{ display: activeTab === 'details' ? undefined : 'none' }}>
              <h6 className="fx-section-title">Personal information</h6>
              <div className="fx-info-grid">
                <InfoItem icon="bx-user" label="Full name" id="menuDetailName">{detail.name}</InfoItem>
                <InfoItem icon="bx-phone" label="Contact" id="menuDetailContact">{detail.contact}</InfoItem>
                <InfoItem icon="bx-envelope" label="Personal email" id="menuDetailPersonalEmail">{detail.personalEmail}</InfoItem>
                <InfoItem icon="bx-buildings" label="Company email" id="menuDetailCompanyEmail">{detail.companyEmail}</InfoItem>
                <InfoItem icon="bx-map" label="Address" id="menuDetailAddress">{detail.address}</InfoItem>
              </div>

              <h6 className="fx-section-title">Employment</h6>
              <div className="fx-info-grid">
                <InfoItem icon="bx-at" label="Username" id="menuDetailUsername">{detail.username}</InfoItem>
                <InfoItem icon="bx-shield-quarter" label="Role" id="menuDetailRole">{detail.role}</InfoItem>
                <InfoItem icon="bx-calendar-check" label="Joined" id="menuDetailJoinedDate">{detail.joinedDate}</InfoItem>
                <InfoItem icon="bx-calendar-x" label="Leaving date" id="menuDetailLeavingDate">{detail.leavingDate}</InfoItem>
                <InfoItem icon="bx-wallet" label="Salary" id="menuDetailSalary">{detail.salary}</InfoItem>
              </div>

              <h6 className="fx-section-title">Attachments</h6>
              <div id="menuDetailAttachments" className="fx-file-list">
                {hasAttachments && <AttachmentLinks attachments={detail.attachments} />}
                {detail.attachments && !hasAttachments && (
                  <div className="fx-empty-note"><i className="bx bx-folder-open"></i>No attachments yet</div>
                )}
              </div>
            </div>

            {/* ===== EDIT TAB ===== */}
            <div id="profileEditSection" style={{ display: activeTab === 'edit' ? undefined : 'none' }}>
              <form id="profileEditForm" onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
                {/* Photo */}
                <div className="fx-photo-card">
                  <div className="fx-photo-card-preview">
                    {editPhotoPreview
                      ? <img src={editPhotoPreview} alt="" />
                      : <span>{initialsOf(`${edit.firstName} ${edit.lastName}`.trim() || detail.nameHeader)}</span>}
                  </div>
                  <div className="fx-photo-card-text">
                    <strong>Profile photo</strong>
                    <small>JPG, PNG or GIF · max 10MB. A square image works best.</small>
                  </div>
                  <div className="fx-photo-card-actions">
                    <label htmlFor="editProfilePhoto" className="btn btn-primary btn-sm mb-0">
                      <i className="bx bx-upload me-1"></i>{editPhotoPreview ? 'Change' : 'Upload'}
                    </label>
                    {editPhotoPreview && (
                      <button type="button" className="btn btn-sm fx-btn-danger-ghost" onClick={removeProfilePhoto}>
                        <i className="bx bx-trash me-1"></i>Remove
                      </button>
                    )}
                  </div>
                </div>
                {photoRemoved && !editPhotoPreview && detail.photo && (
                  <div className="fx-inline-note">
                    <i className="bx bx-info-circle"></i>
                    Your photo will be removed when you save.
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => {
                      setPhotoRemoved(false);
                      setEditPhotoPreview(detail.photo);
                    }}>Undo</button>
                  </div>
                )}
                <input type="file" className="d-none" id="editProfilePhoto" accept="image/jpeg,image/png,image/gif"
                  ref={photoInput} onChange={changeProfilePhoto} />

                {/* Name */}
                <div className="fx-form-card">
                  <div className="fx-form-card-head">
                    <span className="fx-form-card-icon"><i className="bx bx-user"></i></span>
                    <div>
                      <h6>Personal information</h6>
                      <small>How your name appears across the workspace</small>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="editFirstName">First name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" id="editFirstName" name="firstName" required
                        value={edit.firstName} onChange={changeEdit} placeholder="First name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="editLastName">Last name</label>
                      <input type="text" className="form-control" id="editLastName" name="lastName"
                        value={edit.lastName} onChange={changeEdit} placeholder="Last name" />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editUsername">Username</label>
                      <IconInput icon="bx-lock-alt" type="text" id="editUsername" name="username" disabled
                        value={edit.username} onChange={changeEdit} />
                      <small className="fx-field-hint">Your username can't be changed.</small>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="fx-form-card">
                  <div className="fx-form-card-head">
                    <span className="fx-form-card-icon"><i className="bx bx-phone"></i></span>
                    <div>
                      <h6>Contact details</h6>
                      <small>Where colleagues can reach you</small>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="editContact">Contact number</label>
                      <IconInput icon="bx-phone" type="text" id="editContact" name="contact"
                        value={edit.contact} onChange={changeEdit} placeholder="+91 98765 43210" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profileCompanyEmail">Company email</label>
                      <IconInput icon="bx-buildings" type="email" id="profileCompanyEmail" name="companyEmail"
                        value={edit.companyEmail} onChange={changeEdit} placeholder="name@company.com" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profilePersonalEmail">Personal email</label>
                      <IconInput icon="bx-envelope" type="email" id="profilePersonalEmail" name="personalEmail"
                        value={edit.personalEmail} onChange={changeEdit} placeholder="name@example.com" />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="editAddress">Address</label>
                      <textarea className="form-control" id="editAddress" name="address" rows="2"
                        value={edit.address} onChange={changeEdit} placeholder="Street, city, state, PIN"></textarea>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="fx-form-card">
                  <div className="fx-form-card-head">
                    <span className="fx-form-card-icon"><i className="bx bx-paperclip"></i></span>
                    <div>
                      <h6>Attachments</h6>
                      <small>Documents such as ID proofs or certificates</small>
                    </div>
                  </div>
                  {hasAttachments && (
                    <div id="editExistingAttachments" className="fx-file-list mb-3">
                      <AttachmentLinks attachments={detail.attachments} />
                    </div>
                  )}
                  <label htmlFor="editAttachments" className={'fx-dropzone' + (dragOver ? ' is-over' : '')}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)} onDrop={dropFiles}>
                    <span className="fx-dropzone-icon"><i className="bx bx-cloud-upload"></i></span>
                    <span><strong>Click to upload</strong> or drag and drop</span>
                    <small>Multiple files allowed, max 10MB each</small>
                  </label>
                  <input type="file" className="d-none" id="editAttachments" multiple ref={attachmentsInput}
                    onChange={(e) => addFiles(e.target.files)} />
                  {newFiles.length > 0 && (
                    <ul className="fx-new-files">
                      {newFiles.map((file, index) => (
                        <li key={file.name + index}>
                          <i className="bx bx-file"></i>
                          <span className="fx-new-file-name">{file.name}</span>
                          <span className="fx-new-file-size">{formatSize(file.size)}</span>
                          <button type="button" onClick={() => removeNewFile(index)} aria-label={'Remove ' + file.name}>
                            <i className="bx bx-x"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </form>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div id="menuUserDetailLoader" className="fx-profile-loader">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'edit' && (
            <div className="modal-footer fx-profile-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={(e) => showTab(e, 'details')} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-primary" id="btnSaveProfile" disabled={saving} onClick={saveProfile}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving…</>
                ) : (
                  <><i className="bx bx-check me-1"></i>Save changes</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
