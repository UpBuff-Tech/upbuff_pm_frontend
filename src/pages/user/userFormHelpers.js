// Pieces shared by the user list page (its create / edit modals) and the "Create User" page.

import { useEffect } from 'react';
import moment from 'moment';

export const EMAIL_REG = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
/** An empty password is accepted (used while typing and for the optional password of the edit form). */
export const OPTIONAL_PASSWORD_REG = /^((?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,})?$/;
export const PASSWORD_REG = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

const VALID_IMAGE_TYPES = ['image/gif', 'image/jpeg', 'image/png', 'image/jpg'];

/**
 * Everything the "create user" form shows. The keys are the ids of the elements:
 * the inputs, the message <span>s below them, plus the photo preview and the attachment list.
 */
export const EMPTY_CREATE_FORM = {
  userName: '',
  userContact: '',
  personalEmail: '',
  companyEmail: '',
  userAddress: '',
  joinedDate: '',
  activeStatus: 'Y',
  leavingDate: '',
  userRole: '',
  salaryAmount: '',
  salaryRevision: '',
  username: '',
  password: '',
  confirmPassword: '',
  contactSpan: '',
  personalEmailSpan: '',
  companyEmailSpan: '',
  passwordSpan: '',
  confirmPasswordSpan: '',
  profilePhotoPreview: '',   // src of the preview image
  attachmentsList: null,     // files listed below the attachments input (null = nothing listed)
  attachmentFiles: [],       // the File objects that will be uploaded
};

/**
 * Everything the "edit user" modal shows. The keys are again the ids of the elements.
 */
export const EMPTY_EDIT_FORM = {
  id: '',                    // the user being edited (the hidden input .id)
  editUserName: '',
  editUserLoginName: '',
  editUserContact: '',
  editPersonalEmail: '',
  editCompanyEmail: '',
  editUserAddress: '',
  editJoinedDate: '',
  editActiveStatus: 'Y',
  editLeavingDate: '',
  editUserRole: '',
  editSalaryAmount: '',
  editSalaryRevision: '',
  passwords: '',
  confirmPasswords: '',
  showPasswords: false,      // the new password is shown as plain text
  passwordspans: '',
  confirmPasswordspans: '',
  profilePhotoPreviewEdit: '',
  attachmentsListEdit: null,
  attachmentFilesEdit: [],
};

/**
 * Returns a function that merges some values into a form object kept in state:
 *   const update = formUpdater(setForm);   update({ userName: 'x' });
 */
export function formUpdater(setForm) {
  return (changes) => setForm((old) => ({ ...old, ...changes }));
}

/** onChange handler for inputs whose id is their key in the form object. */
export function fieldChanger(update) {
  return (event) => update({ [event.target.id]: event.target.value });
}

/** Hides the modal the clicked element is in (the close buttons use the old data-dismiss attribute). */
export function closeParentModal(event) {
  const modal = $(event.target).closest('.modal');
  if (modal.length) {
    modal.modal('hide');
  }
}

/** Empties file inputs (a file input cannot be a controlled input). */
export function clearFileInputs(...ids) {
  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    fileReader.onload = function () {
      resolve(fileReader.result);
    };
    fileReader.onerror = reject;
    fileReader.readAsDataURL(file);
  });
}

function readAttachment(file) {
  return readFileAsDataURL(file).then((data) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    data: data
  }));
}

/**
 * Reads the profile photo (may be missing) and the attachments.
 * Resolves with [profilePhoto, ...attachments]; profilePhoto is null when no photo was chosen.
 */
export function readUploads(profilePhotoFile, attachmentFiles) {
  let profilePhotoPromise = Promise.resolve(null);
  if (profilePhotoFile) {
    profilePhotoPromise = readFileAsDataURL(profilePhotoFile);
  }
  let attachmentPromises = attachmentFiles.map(readAttachment);

  return Promise.all([profilePhotoPromise, ...attachmentPromises]);
}

/**
 * Change handler of a profile photo input: checks type and size (max 5MB).
 * Returns the chosen file, or null (after emptying the input) when it is not acceptable.
 */
export function pickProfilePhoto(event, typeMessage, sizeMessage) {
  let file = event.target.files[0];
  if (!file) return null;

  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    toastr['error'](typeMessage);
    event.target.value = '';
    return null;
  }

  if (file.size / 1024 > 5000) {
    toastr['error'](sizeMessage);
    event.target.value = '';
    return null;
  }

  return file;
}

/**
 * Change handler of an attachments input: leaves out files larger than 10MB.
 * Returns the accepted files, or null when no file was chosen.
 */
export function pickAttachments(event, tooLargeMessage) {
  let files = event.target.files;
  if (!files || files.length === 0) return null;

  let fileArray = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];

    // Check file size (max 10MB per file)
    if (file.size / 1024 / 1024 > 10) {
      toastr['error'](tooLargeMessage(file));
      continue;
    }

    fileArray.push(file);
  }
  return fileArray;
}

/** The argument of user.createEmployee, from a "create user" form and its uploaded files. */
export function buildNewEmployee(form, profilePhoto, attachments) {
  return {
    name: $.trim(form.userName),
    contact: $.trim(form.userContact),
    personalEmail: $.trim(form.personalEmail),
    companyEmail: $.trim(form.companyEmail),
    address: $.trim(form.userAddress),
    joinedDate: form.joinedDate ? new Date(form.joinedDate) : null,
    activeStatus: form.activeStatus,
    leavingDate: form.leavingDate ? new Date(form.leavingDate) : null,
    role: form.userRole,
    salaryAmount: form.salaryAmount ? parseFloat(form.salaryAmount) : null,
    salaryRevision: form.salaryRevision ? new Date(form.salaryRevision) : null,
    username: $.trim(form.username),
    password: form.password,
    profilePhoto: profilePhoto,
    attachments: attachments
  };
}

/** The values of the "edit user" form for a user document (the result of user.dataGets). */
export function editFormValues(id, user) {
  // Personal Information
  const editFirstName = user.profile && user.profile.firstName ? user.profile.firstName : '';
  const editLastName = user.profile && user.profile.lastName ? user.profile.lastName : '';
  const editFullName = (editFirstName + ' ' + editLastName).trim();
  const accountEmail = (user.emails && user.emails.length > 0 && user.emails[0].address) ? user.emails[0].address : '';

  const values = {
    id: id,
    editUserName: editFullName || user.username || '',
    editUserLoginName: user.username || '',
    editUserContact: user.contactNo || '',
    editPersonalEmail: accountEmail || user.emailAddress || '',
    editCompanyEmail: user.companyEmail || '',
    editUserAddress: user.address || '',

    // Employment Information
    editJoinedDate: user.joinedDate ? moment(user.joinedDate).format('YYYY-MM-DD') : '',
    editActiveStatus: user.active || 'Y',
    editLeavingDate: user.leavingDate ? moment(user.leavingDate).format('YYYY-MM-DD') : '',
    editUserRole: user.roles && user.roles.length > 0 ? user.roles[0] : '',

    // Salary Information
    editSalaryAmount: user.salaryAmount || '',
    editSalaryRevision: user.salaryRevision ? moment(user.salaryRevision).format('YYYY-MM-DD') : '',
  };

  // Existing profile photo
  if (user.profile && user.profile.logo) {
    values.profilePhotoPreviewEdit = user.profile.logo;
  }

  // Existing attachments
  if (user.attachments && user.attachments.length > 0) {
    values.attachmentsListEdit = user.attachments;
  }

  return values;
}

/**
 * The checks made when the user leaves a field of a "create user" form (onBlur handlers by input id).
 * `texts` holds the wording of the messages: { email, password, confirmPassword, contact }.
 */
export function createFormBlurHandlers(form, update, texts) {
  return {
    personalEmail: () => {
      let email = form.personalEmail;
      update({ personalEmailSpan: email && !EMAIL_REG.test(email) ? texts.email : '' });
    },
    companyEmail: () => {
      let email = form.companyEmail;
      update({ companyEmailSpan: email && !EMAIL_REG.test(email) ? texts.email : '' });
    },
    password: () => {
      let password = form.password;
      update({ passwordSpan: password && !OPTIONAL_PASSWORD_REG.test(password) ? texts.password : '' });
    },
    confirmPassword: () => {
      let confirmPassword = form.confirmPassword;
      update({ confirmPasswordSpan: confirmPassword && confirmPassword !== form.password ? texts.confirmPassword : '' });
    },
    userContact: () => {
      let contact = form.userContact;
      update({ contactSpan: contact && contact.length > 15 ? texts.contact : '' });
    },
  };
}

/**
 * Turns a role <select> into a select2 dropdown.
 * @param selectRef       ref of the <select>
 * @param parentSelector  element the dropdown is attached to ('' = the parent of the <select>)
 * @param value           the selected role id (from state)
 * @param setValue        called with the role id the user chose
 * @param rolesList       the options, so the shown text is refreshed when they arrive
 */
export function useRoleSelect2(selectRef, parentSelector, value, setValue, rolesList) {
  useEffect(() => {
    const select = $(selectRef.current);
    select.select2({
      placeholder: 'Select Role',
      tokenSeparators: [','],
      allowClear: true,
      dropdownParent: parentSelector ? $(parentSelector) : select.parent(),
    });

    // select2 announces a choice through jQuery only.
    const onChange = (event) => setValue(event.target.value);
    select.on('change', onChange);
    return () => {
      select.off('change', onChange);
      select.select2('destroy');
    };
  }, []);

  // When React changed the <select>, let select2 show the new choice.
  useEffect(() => {
    $(selectRef.current).trigger('change.select2');
  }, [selectRef, value, rolesList]);
}
