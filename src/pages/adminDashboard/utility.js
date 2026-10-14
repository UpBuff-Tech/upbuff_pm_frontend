/**
 * @author Visakh
 */
import api from '../../api/client';
import { Session } from '../../lib/session';

// for customer portal
export const createOrUpdateCustomer = (target, type, roleArray, address, street, block, city, defaultBranch) => {
  let customerName = target.selectCustomer;
  let email = target.email;
  let username = target.username;
  let password = target.password;
  let contactNo = target.contactNo;

  return api.call('user.createCustomer', type, customerName.value, address, street, block, city, email.value, contactNo.value,
    username.value, password.value, roleArray, defaultBranch, (error, result) => {
      if (error) {
        $('#userErrorModal').find('.modal-body').text(error.reason);
        $('#userErrorModal').modal();
      }
      else {
        Session.set('userPermission', '');
        $('#userAdd')[0].reset();
        $('#roleSelection').val(null).trigger('change');
        $('#designationSelection').prop('selectedIndex', 0);
        $('#userSuccessModal').find('.modal-body').text('Business Partner has been registered successfully');
        $('#userSuccessModal').modal();
      }
    });
};

/**
 * TODO: Complete JS doc
 * @param target
 */
export const updateCustomerlist = (target, defaultBranch) => {
  let email = target.email;
  let username = target.username;
  let contactNo = target.contactNo;
  let password = target.password;
  let hiddenemail = target.hiddenemail;
  let id = target.id;

  return api.call('user.updateCustomer', id.value, username.value, contactNo.value, email.value, hiddenemail.value, password.value, defaultBranch, (error, result) => {
    if (error) {
      $('#userErrorModal').find('.modal-body').text(error.reason);
      $('#userErrorModal').modal();
    }
    else {
      $('.updateUser').each(function () {
        this.reset();
      });
      Session.set('userPermission', '');
      $('#roleSelection').val(null).trigger('change');
      $('#userSuccessModal').find('.modal-body').text('Business Partner has been updated successfully');
      $('#userSuccessModal').modal();
    }
  });
};
