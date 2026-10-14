import { Fragment, useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getProfileImage } from '../../lib/globalHelpers';
import { changePassword, changeProfileImage, updateBuisnessPartner, updateSubUser } from './utility';

const EMAIL_REGEX = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
const PASSWORD_REGEX = /^((?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,})?$/;
const VALID_IMAGE_TYPES = ['image/gif', 'image/jpeg', 'image/png'];
const EMAIL_PATTERN = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,3}$';

const EMPTY_MESSAGE = '<font color="#fc5f5f"></font>';
const INVALID_EMAIL_MESSAGE = '<style>#emailspan{color:#fc5f5f;}</style><span id="emailspan">Please enter the valid email address</span>';
const VALID_EMAIL_MESSAGE = '<style>#emailspan{color:#fc5f5f;}</style>';

/** A message element whose content is one of the small HTML snippets above. */
const html = (content) => ({ __html: content });

/** True when the list (of a select) has an entry with this value. */
function hasOption(list, key, value) {
  return (list || []).some((entry) => entry[key] === value);
}

/** Checks a picked image; shows the error and returns false when it cannot be used. */
function isAllowedImage(file) {
  if ($.inArray(file.type, VALID_IMAGE_TYPES) < 0) {
    toastr['error']('File type not allowed.You can only upload GIF, JPG, PNG files.');
    return false;
  }
  if ((file.size) / 1024 > 9000) {
    toastr['error']('Please image size less than 9mb');
    return false;
  }
  return true;
}

export default function UpdateProfile() {
  const { user, userId } = useAuth();

  const [userData, setUserData] = useState();
  const [countryArray, setCountryArray] = useState();
  const [stateArray, setStateArray] = useState();
  const [currencyList, setCurrencyList] = useState();

  const [loaderVisible, setLoaderVisible] = useState(true);
  const [adminProfileVisible, setAdminProfileVisible] = useState(false);
  const [userProfileVisible, setUserProfileVisible] = useState(false);

  // "Change Password" / "Edit User Details" switch of each profile card
  const [adminPasswordForm, setAdminPasswordForm] = useState(false);
  const [userPasswordForm, setUserPasswordForm] = useState(false);
  const [changePasswordLabel, setChangePasswordLabel] = useState('Change Password');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Validation messages
  const [passwordSpan, setPasswordSpan] = useState('');
  const [confirmPasswordSpan, setConfirmPasswordSpan] = useState('');
  const [passwordSpan2, setPasswordSpan2] = useState('');
  const [confirmPasswordSpan2, setConfirmPasswordSpan2] = useState('');
  const [emailSpan, setEmailSpan] = useState('');

  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoImage, setLogoImage] = useState(null);
  const [uploadedAvatar, setUploadedAvatar] = useState(null);

  useEffect(() => {
    let id = userId;

    if (id) {
      api.call('profile.getMainUserData', id, (error, result) => {
        if (!error) {
          setLoaderVisible(false);
          setUserData(result);
          if (result && result.userType == 'MainUser') {
            setAdminProfileVisible(true);
          }
          else if (result && result.userType == 'subUser') {
            setUserProfileVisible(true);
          }
        }
        else {
          setLoaderVisible(false);
        }
      })
    }
    api.call('country.countryNameGet', (err, res) => {
      if (!err) {
        setCountryArray(res);
      }
    });

    api.call('currency.currencyList', (err, res) => {
      if (!err) {
        setCurrencyList(res);
      }
    });
  }, []);

  const selectCountry = (selectedCountry) => {
    setCountry(selectedCountry);
    if (selectedCountry) {
      api.call('state.stateNameGet', selectedCountry, (stateError, stateResult) => {
        if (!stateError) {
          setStateArray(stateResult);
        }
      });
    }
  };

  // Preselect the country, state and currency saved on the user once their lists are loaded.
  const savedCountry = user && user.countryName;
  const savedState = user && user.stateName;
  const savedCurrency = user && user.currency;

  useEffect(() => {
    if (!userData || !savedCountry) return undefined;
    const timer = setTimeout(() => {
      if (hasOption(countryArray, 'countryName', savedCountry)) selectCountry(savedCountry);
    }, 100);
    return () => clearTimeout(timer);
  }, [userData, savedCountry, countryArray]);

  useEffect(() => {
    if (!userData || !savedState) return undefined;
    const timer = setTimeout(() => {
      if (hasOption(stateArray, 'stateName', savedState)) setStateName(savedState);
    }, 100);
    return () => clearTimeout(timer);
  }, [userData, savedState, stateArray]);

  useEffect(() => {
    if (!userData || !savedCurrency) return undefined;
    const timer = setTimeout(() => {
      if (hasOption(currencyList, 'currencyCode', savedCurrency)) setCurrency(savedCurrency);
    }, 100);
    return () => clearTimeout(timer);
  }, [userData, savedCurrency, currencyList]);

  const checkGender = (gender) => {
    if (userData) {
      return gender == userData.profile.gender;
    }
    return false;
  };

  const focusPassword = () => {
    $('div.hint').show();
    $(document).on('focusin.hint click.hint', function (e) {
      if ($(e.target).closest('.hint, #password').length) return;
      $(document).off('.hint');
      $('div.hint').fadeOut('medium');
    });
  };

  const blurPassword = () => {
    $('div.hint').hide()
    let passwordaddress = $("#password").val();
    if (!PASSWORD_REGEX.test(passwordaddress))
      setPasswordSpan('<font color="#fc5f5f" size="2">Please enter valid password</font>');
    else
      setPasswordSpan(EMPTY_MESSAGE);
  };

  const blurConfirmPassword = () => {
    var pass = $("#password").val();
    var confirmpass = $("#confirmPassword").val();
    if (confirmpass != pass) {
      setConfirmPasswordSpan('<font color="#fc5f5f" size="2">Those passwords didn&apos;t match. Try again !</font>');
    } else {
      setConfirmPasswordSpan(EMPTY_MESSAGE);
    }
  };

  const blurPassword2 = () => {
    $('div.hint').hide()
    let passwordaddress = $("#password2").val();
    if (!PASSWORD_REGEX.test(passwordaddress))
      setPasswordSpan2('<style>#passwordSpan2{color:#fc5f5f;}</style><span id="passwordSpan2">Please enter valid password</span>');
    else
      setPasswordSpan2(EMPTY_MESSAGE);
  };

  const blurConfirmPassword2 = () => {
    var pass = $("#password2").val();
    var confirmpass = $("#confirmPassword2").val();
    if (confirmpass != pass) {
      setConfirmPasswordSpan2('<style>#confirmPasswordSpan2{color:#fc5f5f;}</style><span id="confirmPasswordSpan2">These Passwords Do not Match</span>');
    } else {
      setConfirmPasswordSpan2(EMPTY_MESSAGE);
    }
  };

  const validateEmailField = (selector) => {
    let emailaddress = $(selector).val();
    if (!EMAIL_REGEX.test(emailaddress))
      setEmailSpan(INVALID_EMAIL_MESSAGE);
    else
      setEmailSpan(VALID_EMAIL_MESSAGE);
  };

  const cancelPassword = () => {
    setConfirmPasswordSpan(EMPTY_MESSAGE);
    setPasswordSpan(EMPTY_MESSAGE);
  };

  const cancelPassword2 = () => {
    setConfirmPasswordSpan2(EMPTY_MESSAGE);
    setPasswordSpan2(EMPTY_MESSAGE);
  };

  const changeLogoFile = (event) => {
    let myFile = event.target.files[0];
    if (isAllowedImage(myFile)) {
      let fileReader = new FileReader();
      fileReader.onload = function () {
        let imageData = fileReader.result;
        setLogoImage(imageData);
      };
      fileReader.readAsDataURL(myFile);
    }
  };

  const changeAvatarFile = (event) => {
    let myFile = event.target.files[0];
    if (!myFile)
      return
    if (isAllowedImage(myFile)) {
      let fileReader = new FileReader();
      fileReader.onload = function () {
        let imageData = fileReader.result;
        changeProfileImage(imageData);
        setUploadedAvatar(imageData);
      };
      fileReader.readAsDataURL(myFile);
    }
  };

  const submitAccountUpdateUser = (event) => {
    event.preventDefault();

    let emailaddress = $("#email2").val();
    if (!EMAIL_REGEX.test(emailaddress))
      return

    updateSubUser(event.target);
  };

  const submitAccountUpdate = (event) => {
    event.preventDefault();
    const form = event.target;

    let emailaddress = $("#email").val();
    if (!EMAIL_REGEX.test(emailaddress))
      return

    let myFile = form.profile_image.files[0];
    if (myFile !== undefined) {
      if ((myFile.size) / 1024 < 9000 && (myFile.size) / 1024 > 700) {
        let fileReader = new FileReader();
        fileReader.onload = function () {
          let image = new Image();
          image.src = fileReader.result;
          let canvas = document.createElement("canvas");
          let context = canvas.getContext("2d");
          canvas.width = image.width / 5;
          canvas.height = image.height / 5;
          context.drawImage(image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
          let imageData = canvas.toDataURL();
          updateBuisnessPartner(form, imageData, country, stateName, currency);
        };
        fileReader.readAsDataURL(myFile);
      } else {
        let fileReader = new FileReader();
        fileReader.onload = function () {
          console.log(fileReader)
          updateBuisnessPartner(form, fileReader.result, country, stateName, currency);
        };
        fileReader.readAsDataURL(myFile);
      }
    } else {
      let imageData = form.logoImageBackup.value;
      updateBuisnessPartner(form, imageData, country, stateName, currency);
    }
  };

  const removeImage = (event) => {
    event.preventDefault();
    let data = '';
    api.call('user.profileImage.update', user._id, data, (error) => {
      if (error) {
      } else {
        $('#removeImageModal').modal('hide');
      }
    })
  };

  const toggleAdminPasswordForm = () => {
    setAdminPasswordForm(!adminPasswordForm);
    setChangePasswordLabel(adminPasswordForm ? 'Change Password' : 'Edit User Details');
  };

  const toggleUserPasswordForm = () => {
    setUserPasswordForm(!userPasswordForm);
    setChangePasswordLabel(userPasswordForm ? 'Change Password' : 'Edit User Details');
  };

  const submitPasswordUpdate = (event) => {
    event.preventDefault();
    let password = $('#password').val()
    let confirmPassword = $('#confirmPassword').val()

    if (confirmPassword.length === 0) {
      setConfirmPasswordSpan('<style>#confirmPasswordSpan{color:#fc5f5f;}</style><span id="confirmPasswordSpan">Password Cannot be empty</span>');
    }
    else if (password.length === 0) {
      setPasswordSpan('<style>#passwordSpan{color:#fc5f5f;}</style><span id="passwordSpan">Password Cannot be empty</span>');
    }
    else if (password === confirmPassword) {
      changePassword(event.target)
    }
  };

  const submitPasswordUpdate2 = (event) => {
    event.preventDefault();
    let password = $('#password2').val()
    let confirmPassword = $('#confirmPassword2').val()

    if (confirmPassword.length === 0) {
      setConfirmPasswordSpan2('<style>#confirmPasswordSpan2{color:#fc5f5f;}</style><span id="confirmPasswordSpan2">Password Cannot be empty</span>');
    }
    else if (password.length === 0) {
      setPasswordSpan2('<style>#passwordSpan2{color:#fc5f5f;}</style><span id="passwordSpan2">Password Cannot be empty</span>');
    }
    else if (password === confirmPassword) {
      changePassword(event.target)
    }
  };

  const profile = (userData && userData.profile) || {};
  const emails = (userData && userData.emails) || [];

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        <h4 className="fw-bold py-3"><span className="text-muted fw-light"></span> Update Profile</h4>
        <section className="content">
          <div className="demo-inline-spacing  loaderSPinVal" style={{ textAlign: 'center', display: loaderVisible ? undefined : 'none' }}>
            <div className="spinner-grow" role="status">
              <span className="visually-hidden"></span>
            </div>
            <div className="spinner-grow text-primary" role="status">
              <span className="visually-hidden"></span>
            </div>
            <div className="spinner-grow text-secondary" role="status">
              <span className="visually-hidden"></span>
            </div>
            <div className="spinner-grow text-success" role="status">
              <span className="visually-hidden"></span>
            </div>
            <div className="spinner-grow text-danger" role="status">
              <span className="visually-hidden"></span>
            </div>
            <div className="spinner-grow text-warning" role="status">
              <span className="visually-hidden"></span>
            </div>
          </div>
          <div className="row adminProfile" style={{ display: adminProfileVisible ? 'block' : 'none' }}>
            <div className="col-md-12">
              <div className="card mb-4">
                <h5 className="card-header">Profile Details</h5>
                {/* Account */}
                {userData && (
                  <>
                    <div className="card-body">
                      <div className="d-flex align-items-start align-items-sm-center gap-4">

                        <div className="button-wrapper">
                          <button type="button" className="btn btn-outline-secondary account-image-reset mb-4">
                            <i className="bx bx-reset d-block d-sm-none"></i>
                            <span className="d-none d-sm-block">Reset</span>
                          </button>

                          <button type="button" className="btn btn-outline-secondary changePassword mb-4"
                            id={adminPasswordForm ? 'editDetailsButton' : 'changePasswordButton'} onClick={toggleAdminPasswordForm}>
                            <i className="bx bx-reset d-block d-sm-none"></i>
                            <span className="d-none d-sm-block changePasswordSpan">{changePasswordLabel}</span>
                          </button>

                        </div>
                      </div>
                    </div>
                    <hr className="my-0" />
                    <div className="card-body">
                      <form id="formPasswordUpdate" method="POST" style={{ display: adminPasswordForm ? undefined : 'none' }} onSubmit={submitPasswordUpdate}>
                        <h3>Change Password</h3>
                        <div className="row">
                          <div className="mb-3 col-md-6">
                            <label htmlFor="Old Password" className="form-label">Old Password</label>
                            <input className="form-control" type="password" id="oldPassword" name="oldPassword"
                              placeholder="Enter Old Password" autoFocus />
                            <span id="oldPasswordSpan"></span>
                          </div>
                          <div className="mb-3 col-md-6">
                            <label htmlFor="New Password" className="form-label">New Password</label>
                            <div className="input-group">
                              <input className="form-control" type={passwordVisible ? 'text' : 'password'} id="password" name="password"
                                placeholder="Enter New Password" autoFocus onFocus={focusPassword} onBlur={blurPassword} />
                              <span id="basic-default-3" toggle="#password" className="input-group-text cursor-pointer "><i
                                className={'bx toggle-passwords ' + (passwordVisible ? 'bx-show' : 'bx-hide')}
                                onClick={() => setPasswordVisible(!passwordVisible)}></i></span>
                            </div>
                            <span id="passwordSpan" dangerouslySetInnerHTML={html(passwordSpan)}></span>
                            <div className="hint">
                              Password must be at least 8 characters long and should contain at least a number and an uppercase
                              letter
                            </div>
                          </div>
                          <div className="mb-3 col-md-6">
                            <label htmlFor="Retype Password" className="form-label">Retype Password</label>
                            <input className="form-control" type="password" id="confirmPassword" name="confirmPassword"
                              placeholder="Retype Password" autoFocus onBlur={blurConfirmPassword} />
                            <span id="confirmPasswordSpan" dangerouslySetInnerHTML={html(confirmPasswordSpan)}></span>
                          </div>

                          <div className="mt-2">
                            <button type="submit" className="btn btn-primary me-2">Save changes</button>
                            <button type="reset" className="btn passwordCancel btn-outline-secondary" onClick={cancelPassword}>Cancel</button>
                          </div>
                        </div>
                      </form>
                      <form id="formAccountUpdate" method="POST" style={{ display: adminPasswordForm ? 'none' : undefined }} onSubmit={submitAccountUpdate}>
                        <div className="row">
                          <div className="mb-3 col-md-6">
                            <label htmlFor="buisnessName" className="form-label">Buisness Name <span
                              className="asteric_red">*</span></label>
                            <input className="form-control" type="text" id="buisnessName" name="buisnessName"
                              defaultValue={(profile.firstName || '') + ' ' + (profile.lastName || '')} placeholder="Enter Buisness Name"
                              autoFocus required />
                          </div>
                          <div className="mb-3 col-md-6">
                            <label htmlFor="email" className="form-label">Email Id <span className="asteric_red">*</span></label>
                            {emails.map((email, index) => (
                              <Fragment key={index}>
                                <input className="form-control" type="text" id="email" name="email"
                                  pattern={EMAIL_PATTERN}
                                  title="Please enter a vaild email address eg: example@example.com" defaultValue={email.address}
                                  placeholder="Enter Your Email Address" required onBlur={() => validateEmailField('#email')} />
                                <div className="emailspan" dangerouslySetInnerHTML={html(emailSpan)}></div>
                              </Fragment>
                            ))}
                          </div>
                          <div className="mb-3 col-md-6">
                            <label className="form-label" htmlFor="Contact No">Contact Number <span className="asteric_red">*</span></label>
                            <div className="input-group input-group-merge">
                              <input type="tel" id="contactNo" name="contactNo" className="form-control"
                                placeholder="Enter Your Contact Number" required defaultValue={userData.contactNo} />
                            </div>
                            <span className="contactnospan" id="contactnospan"></span>
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Contact Person" className="form-label">Contact Person <span
                              className="asteric_red">*</span></label>
                            <input type="text" className="form-control" required id="contactPerson" name="contactPerson"
                              placeholder="Enter Contact Person" defaultValue={userData.contactPerson} />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Tax Name" className="form-label">Tax Name</label>
                            <input className="form-control" type="text" id="taxName" defaultValue={userData.taxName} name="taxName"
                              placeholder="Enter Tax Name" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Tax Number" className="form-label">Tax Number</label>
                            <input className="form-control" type="text" id="taxNumber" defaultValue={userData.taxNumber} name="taxNumber"
                              placeholder="Enter Tax Number" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Website" className="form-label">Website</label>
                            <input className="form-control" type="text" id="website" defaultValue={userData.website} name="website"
                              placeholder="Enter Website" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Address" className="form-label">Address</label>
                            <input className="form-control" type="text" id="address" defaultValue={userData.address} name="address"
                              placeholder="Enter Your Address" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label className="form-label" htmlFor="basic-default-fullname">Country <span className="asteric_red">*</span>
                            </label>
                            <select className="form-control validation SelectcountryName" required style={{ width: '100%' }}
                              name="SelectcountryName" id="SelectcountryName" value={country} onChange={(e) => selectCountry(e.target.value)}>
                              <option disabled value=''>Select Country Name</option>
                              {(countryArray || []).map((entry, index) => (
                                <option key={index} value={entry.countryName}>{entry.countryName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mb-3 col-md-6">
                            <label className="form-label" htmlFor="basic-default-fullname">State <span className="asteric_red">*</span>
                            </label>
                            <select className="form-control validation SelectstateName" required style={{ width: '100%' }}
                              name="SelectstateName" id="SelectstateName" value={stateName} onChange={(e) => setStateName(e.target.value)}>
                              <option disabled value=''>Select State Name</option>
                              {(stateArray || []).map((entry, index) => (
                                <option key={index} value={entry.stateName}>{entry.stateName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mb-3 col-md-6">
                            <label htmlFor="Buisness Type" className="form-label">Business Type</label>
                            <input className="form-control" type="text" id="businessType" defaultValue={userData.businessType}
                              name="businessType" placeholder="Enter Business Type" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Buisness GST No" className="form-label">GST</label>
                            <input className="form-control" type="text" id="gSTNo" defaultValue={userData.gstPinNumber} name="gSTNo"
                              placeholder="Enter GST No" />
                          </div>
                          <div className="mb-3 col-md-6">
                            <label htmlFor="Buisness UPI Id" className="form-label">UPI Id </label>
                            <input className="form-control" type="text" id="upiId" defaultValue={userData.upiId} name="upiId"
                              placeholder="Enter UPI Id" />
                          </div>
                          <div className="mb-3 col-md-6">
                            <label className="form-label" htmlFor="basic-default-fullname">Currency <span
                              className="asteric_red">*</span></label>
                            <select className="form-control validation selectCurrency" style={{ width: '100%' }} name="selectCurrency"
                              id="selectCurrency" required value={currency} onChange={(e) => setCurrency(e.target.value)}>
                              <option disabled value=''>Select Currency</option>
                              {(currencyList || []).map((entry, index) => (
                                <option key={index} value={entry.currencyCode}>{entry.currencyCode}</option>
                              ))}
                            </select>
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Account Number" className="form-label">Account Number</label>
                            <input className="form-control" type="text" id="accountNo" defaultValue={userData.accountNo} name="accountNo"
                              placeholder="Enter Account Number" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="IFSC" className="form-label">IFSC</label>
                            <input className="form-control" type="text" id="ifscCode" defaultValue={userData.ifscCode} name="ifscCode"
                              placeholder="Enter IFSC" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Branch" className="form-label">Branch</label>
                            <input className="form-control" type="text" id="branch" defaultValue={userData.branch} name="branch"
                              placeholder="Enter Branch" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Gpay no" className="form-label">Gpay no</label>
                            <input className="form-control" type="number" id="gpayno" defaultValue={userData.gpayno} name="gpayno"
                              placeholder="Enter Gpay no" />
                          </div>

                          <div className="mb-3 col-md-6">
                            <label htmlFor="Buisness Description" className="form-label">Buisness Description </label>
                            <textarea className="form-control validation" id="businessDescription"
                              name="businessDescription" placeholder="Enter Business Description"></textarea>
                          </div>

                          <div className="mb-3 col-md-6">
                            <div className="uploads-btns-wrapper">
                              <label htmlFor="Logo Image Upload">Logo Image Upload</label>
                              <input type="hidden" name="logoImageBackup" id="logoImageBackup" defaultValue={profile.logo} />
                              <div style={{ textAlign: 'center' }}><img className="" src={logoImage === null ? profile.logo : logoImage} alt=" Image" width="200px"
                                id="logoImage" />
                              </div>
                              <div className="fileupload fileupload-new" data-provides="fileupload" style={{ marginTop: '10px' }}>
                                <div className="upload-btn" style={{ textAlign: 'center' }}>
                                  <span className="btn btn-file btn-default">
                                    <span className="fileupload-new"></span>
                                    <input name="profile_image" className="file-upload-input form-control" id="myFile" method="post"
                                      type="file" onChange={changeLogoFile} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="pull-right">
                          <button type="submit" className="btn btn-primary me-2">Save changes</button>
                        </div>
                      </form>
                    </div>
                    {/* /Account */}
                  </>
                )}

              </div>
              <div className="card" style={{ display: 'none' }}>
                <h5 className="card-header">Delete Account</h5>
                <div className="card-body">
                  <div className="mb-3 col-12 mb-0">
                    <div className="alert alert-warning">
                      <h6 className="alert-heading fw-bold mb-1">Are you sure you want to delete your account?</h6>
                      <p className="mb-0">Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                  </div>
                  <form id="formAccountDeactivation">
                    <div className="form-check mb-3">
                      <input className="form-check-input" type="checkbox" name="accountActivation" id="accountActivation2" />
                      <label className="form-check-label" htmlFor="accountActivation">I confirm my account deactivation</label>
                    </div>
                    <button type="submit" className="btn btn-danger deactivate-account" disabled>Deactivate Account</button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="row userProfile" style={{ display: userProfileVisible ? 'block' : 'none' }}>
            <div className="col-md-12">
              <div className="card mb-4">
                <h5 className="card-header">Profile Details</h5>
                {/* Account */}
                <div className="card-body">
                  <div className="d-flex align-items-start align-items-sm-center gap-4">
                    <img src={uploadedAvatar === null ? getProfileImage(user) : uploadedAvatar} alt="user-avatar" className="d-block rounded" height="100" width="100"
                      id="uploadedAvatar2" />

                    <div className="button-wrapper">
                      <label htmlFor="upload" className="btn btn-primary me-2 mb-4" tabIndex="0">
                        <span className="d-none d-sm-block">Upload new photo</span>
                        <i className="bx bx-upload d-block d-sm-none"></i>
                        <input type="file" id="upload" className="account-file-input2" hidden accept="image/png, image/jpeg" onChange={changeAvatarFile} />
                      </label>
                      <button type="button" className="btn btn-outline-secondary account-image-reset mb-4">
                        <i className="bx bx-reset d-block d-sm-none"></i>
                        <span className="d-none d-sm-block">Reset</span>
                      </button>

                      <button type="button" className="btn btn-outline-secondary changePassword2 mb-4"
                        id={userPasswordForm ? 'editDetailsButton2' : 'changePasswordButton2'} onClick={toggleUserPasswordForm}>
                        <i className="bx bx-reset d-block d-sm-none"></i>
                        <span className="d-none d-sm-block changePasswordSpan">{changePasswordLabel}</span>
                      </button>

                      <p className="text-muted mb-0">Allowed JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>
                </div>
                <hr className="my-0" />
                <div className="card-body">
                  <form id="formPasswordUpdate2" method="POST" style={{ display: userPasswordForm ? undefined : 'none' }} onSubmit={submitPasswordUpdate2}>
                    <h3>Change Password</h3>
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="Old Password" className="form-label">Old Password</label>
                        <input className="form-control" type="password" id="oldPassword2" name="oldPassword"
                          placeholder="Enter Old Password" autoFocus />
                        <span id="oldPasswordSpan2"></span>
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="New Password" className="form-label">New Password</label>
                        <input className="form-control" type="password" id="password2" name="password"
                          placeholder="Enter New Password" autoFocus onBlur={blurPassword2} />
                        <span id="passwordSpan2" dangerouslySetInnerHTML={html(passwordSpan2)}></span>

                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="Retype Password" className="form-label">Retype Password</label>
                        <input className="form-control" type="password" id="confirmPassword2" name="confirmPassword"
                          placeholder="Retype Password" autoFocus onBlur={blurConfirmPassword2} />
                        <span id="confirmPasswordSpan2" dangerouslySetInnerHTML={html(confirmPasswordSpan2)}></span>
                      </div>

                      <div className="mt-2">
                        <button type="submit" className="btn btn-primary me-2">Save changes</button>
                        <button type="reset" className="btn passwordCancel2 btn-outline-secondary" onClick={cancelPassword2}>Cancel</button>
                      </div>
                    </div>
                  </form>
                  {userData && (
                    <form id="formAccountUpdateUser" style={{ display: userPasswordForm ? 'none' : undefined }} onSubmit={submitAccountUpdateUser}>
                      <div className="row">
                        <div className="mb-3 col-md-6">
                          <label htmlFor="firstName" className="form-label">First Name</label>
                          <input className="form-control" type="text" id="firstName" placeholder="Enter First Name"
                            name="firstName" defaultValue={profile.firstName} autoFocus />
                        </div>
                        <div className="mb-3 col-md-6">
                          <label htmlFor="lastName" className="form-label">Last Name</label>
                          <input className="form-control" type="text" name="lastName" placeholder="Enter Last Name" id="lastName"
                            defaultValue={profile.lastName} />
                        </div>
                        <div className="mb-3 col-md-6">
                          <label htmlFor="email" className="form-label">E-mail</label>
                          {emails.map((email, index) => (
                            <Fragment key={index}>
                              <input type="text" className="form-control validation" id="email2" placeholder="Enter email Id . ."
                                name="email" pattern={EMAIL_PATTERN}
                                title="Please enter a vaild email address eg: example@example.com" defaultValue={email.address} required
                                onBlur={() => validateEmailField('#email2')} />
                              <span className="emailspan" dangerouslySetInnerHTML={html(emailSpan)}></span>
                            </Fragment>
                          ))}
                        </div>
                        <div className="mb-3 col-md-6">
                          <label className="form-label" htmlFor="phoneNumber">Phone Number</label>
                          <div className="input-group input-group-merge">
                            <span className="input-group-text"></span>
                            <input type="tel" id="contactNo2" name="contactNo2" className="form-control"
                              placeholder="Enter Phone Number" defaultValue={userData.contactNo} />
                          </div>
                          <span id="phoneNumberSpan"></span>
                        </div>
                        <div className="mb-3 col-md-6">
                          <label htmlFor="address" className="form-label">Address</label>
                          <input type="text" className="form-control" id="address2" name="address" placeholder="Address"
                            defaultValue={profile.address} />
                        </div>

                        <div className="mb-3 col-md-6">
                          <label htmlFor="Account Number" className="form-label">Account Number</label>
                          <input className="form-control" type="text" id="accountNo2" defaultValue={userData.accountNo} name="accountNo"
                            placeholder="Enter Account Number" />
                        </div>
                        <div className="mb-3 col-md-6">
                          <label htmlFor="IFSC" className="form-label">IFSC</label>
                          <input className="form-control" type="text" id="ifscCode2" defaultValue={userData.ifscCode} name="ifscCode"
                            placeholder="Enter IFSC" />
                        </div>

                        <div className="mb-3 col-md-6">
                          <label htmlFor="Branch" className="form-label">Branch</label>
                          <input className="form-control" type="text" id="branch2" defaultValue={userData.branch} name="branch"
                            placeholder="Enter Branch" />
                        </div>

                        <div className="mb-3 col-md-6">
                          <label htmlFor="Gpay no" className="form-label">Gpay no</label>
                          <input className="form-control" type="number" id="gpayno2" defaultValue={userData.gpayno} name="gpayno"
                            placeholder="Enter Gpay no" />
                        </div>

                        <div className="mb-3 col-md-6">
                          <label htmlFor="Gender" className="form-label">Gender</label><br />
                          <input type="radio" name="gender" id="genderMale" value="Male" style={{ marginRight: '5px' }} required
                            defaultChecked={checkGender('Male')} /> Male
                          <input type="radio" name="gender" id="genderFemale" value="Female"
                            style={{ marginRight: '5px', marginLeft: '5px' }} required defaultChecked={checkGender('Female')} />
                          Female
                          <input type="radio" name="gender" id="genderOther" value="Other"
                            style={{ marginRight: '5px', marginLeft: '5px' }} required defaultChecked={checkGender('Other')} />
                          Other
                        </div>
                      </div>
                      <div className="mt-2">
                        <button type="submit" className="btn btn-primary me-2">Save changes</button>
                      </div>
                    </form>
                  )}
                </div>
                {/* /Account */}
              </div>
              <div className="card" style={{ display: 'none' }}>
                <h5 className="card-header">Delete Account</h5>
                <div className="card-body">
                  <div className="mb-3 col-12 mb-0">
                    <div className="alert alert-warning">
                      <h6 className="alert-heading fw-bold mb-1">Are you sure you want to delete your account?</h6>
                      <p className="mb-0">Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                  </div>
                  <form id="formAccountDeactivation2">
                    <div className="form-check mb-3">
                      <input className="form-check-input" type="checkbox" name="accountActivation" id="accountActivation" />
                      <label className="form-check-label" htmlFor="accountActivation">I confirm my account deactivation</label>
                    </div>
                    <button type="submit" className="btn btn-danger deactivate-account" disabled>Deactivate Account</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="modal fade in" id="removeImageModal">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">×</span></button>
              <h4 className="modal-title text-bold">Confirmation</h4>
            </div>
            <div className="modal-body">
              <div id="removeBody">
                <p className="danger-color">
                  Are you sure to remove <b>profile image</b> ?
                </p>
              </div>
              <input type="hidden" id="confirmedUuid" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger remove_image" onClick={removeImage}>Yes please!</button>
              <button type="button" className="btn btn-default" data-dismiss="modal" id="removeClose">Not now</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
