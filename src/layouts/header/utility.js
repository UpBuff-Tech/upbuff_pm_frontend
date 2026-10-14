import api from '../../api/client';
import { currentUserId } from '../../lib/customFunctions';

/**
 * Changes the password of the logged-in user.
 * @param target the password form
 */
export const changePassword = (target) => {
  let newPassword = target.password;
  let oldPassword = target.oldPassword;

  return api.request('POST', '/auth/changePassword', [oldPassword.value, newPassword.value]).then(
    () => {
      $('form :input:password').val("");

      toastr["success"]("Password changed successfully");
    },
    (error) => {
      toastr["error"]('Error: ' + error.reason);
    }
  );
};

/**
 * Saves the business profile of a main user.
 * @param target the profile form
 */
export const updateBuisnessPartner = (target, image, country, state, currency) => {
  let id = currentUserId();
  let buisnessName = target.buisnessName.value;
  let emailId = target.email.value;
  let taxName = target.taxName.value;
  let taxNumber = target.taxNumber.value;
  let contactNo = target.contactNo.value;
  let contactPerson = target.contactPerson.value;
  let website = target.website.value;
  let address = target.address.value;
  let businessType = target.businessType.value;
  let businessDescription = target.businessDescription.value;
  let upiId = target.upiId.value;
  let gSTNo = target.gSTNo.value;
  let accountNo = target.accountNo.value;
  let ifscCode = target.ifscCode.value;
  let branch = target.branch.value;
  let gpayno = target.gpayno.value;

  api.call('profile.updateBuisnessPartner', id, buisnessName, emailId, contactNo, contactPerson, website,
    address, businessType, businessDescription, taxName, taxNumber, image,
    country, state, upiId, currency, gSTNo, accountNo, ifscCode, branch, gpayno, (error, result) => {
      if (error) {
        toastr["error"](error.reason);
      }
      else {
        toastr["success"]("Profile updated successfully");
      }
    })
};

/**
 * Saves the profile of a sub user.
 * @param target the profile form
 */
export const updateSubUser = (target) => {
  let id = currentUserId();
  let firstName = target.firstName.value;
  let lastName = target.lastName.value;
  let email = target.email.value;
  let phoneNumber = target.contactNo2.value;
  let address = target.address.value;
  let gender = target.gender.value;
  let accountNo = target.accountNo.value;
  let ifscCode = target.ifscCode.value;
  let branch = target.branch.value;
  let gpayno = target.gpayno.value;

  api.call('profile.updateSubUser', id, firstName, lastName, email, phoneNumber, gender,
    address, accountNo, ifscCode, branch, gpayno, (error, result) => {
      if (error)
        toastr["error"](error.reason);
      else
        toastr["success"]("Profile updated successfully");
    })
};

export const changeProfileImage = (image) => {
  let userId = currentUserId();
  api.call('profile.changeProfileImage', userId, image, (err, res) => {
    if (err)
      toastr["error"](err.reason);
    else
      toastr["success"]("Profile Image Updated successfully");
  });
};
