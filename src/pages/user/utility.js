/**
 * @author Nithin
 */

// The old pages/user/utility.js. Its functions were implicit globals; nothing in the app calls them.
// `target` is a form element (form.elements by name), like the old event.target.

import api from '../../api/client';

/**
 * TODO: Complete JS doc
 * @param target
 * @param imageData
 * @param countryName
 * @param stateName
 * @param navigate  useNavigate() of the calling page (the old code used FlowRouter.go)
 */
export const createOrUpdateUser = (target, imageData, countryName, stateName, navigate) => {
  let firstName = target.firstName;
  let email = target.email;
  let contactNo = target.contactNo;
  let contactPerson = target.contactPerson;
  let addressValue = target.addressValue;
  let role = target.role.value;

  return api.call('user.create', firstName.value, email.value, contactNo.value,
    contactPerson.value, addressValue.value, imageData,
    countryName, stateName, role,
    (error, result) => {
      if (error) {
        $('#userErrorModal').find('.modal-body').text(error.reason);
        $('#userErrorModal').modal('show');
      }
      else {
        navigate('/user/list');
        $('#userSuccessModal').find('.modal-body').text(`Business Partner has been registered successfully.
         ${result} `);
        $('#userSuccessModal').modal('show');
      }
    });
};

/**
 * TODO: Complete JS doc
 * @param target
 * @param password
 */
export const updateUserlist = (target, password) => {
  let id = target.id;
  console.log("targe", id, password);
  return api.call('user.updateUser', id.value, password, (error, result) => {
    if (error) {
      toastr['error'](error.reason, 'ERROR');
    }
    else {
      toastr['success']('Business Partner has been updated successfully', 'SUCCESS');
      $('#userEditPage').modal('hide');
      $('.updateUser').each(function () {
        this.reset();
      });
    }
  });
};
