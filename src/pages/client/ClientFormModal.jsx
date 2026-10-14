/**
 * Client Create/Edit Modal (#clientFormModal) and the "Client Account Created" modal
 * (#clientCredentialsModal). Shared by the Clients page and the Projects page.
 *
 *   <ClientFormModal />                      // once, where the old page had {{> clientFormModal}}
 *
 *   openCreateClientModal();                 // "Add New Client"
 *   openEditClientModal(clientId);           // "Edit Client": loads the client and fills the form
 *
 * After a save the modal announces it on the document, as before:
 *   document.addEventListener('client:created', (e) => e.detail.clientId)
 *   document.addEventListener('client:updated', (e) => e.detail.clientId)
 * (or pass onClientCreated / onClientUpdated props).
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { fxConfirm } from '../../components/dialog/dialog';

// Tracks domain MX validation: null = unchecked, true = valid, false = invalid
let _domainValid = null;

// The functions of the modal that is on screen. Filled in by <ClientFormModal />, so that the
// plain functions exported below can be called from any page.
let modalFunctions = null;

export function resetDomainUI() {
  if (modalFunctions) modalFunctions.resetDomainUI();
}

export function validateDomain(domain) {
  if (modalFunctions) modalFunctions.validateDomain(domain);
}

/**
 * Reset the form to create-mode and open the client modal.
 * Shared by the Clients page and any other page that renders <ClientFormModal />.
 */
export function openCreateClientModal() {
  if (modalFunctions) modalFunctions.openCreateClientModal();
}

/**
 * Edit client - open modal with data.
 * `findUser(userId)` returns the user document of an assigned member (or nothing when it is not
 * known); without it only the logged-in user is known, like on the old Clients page.
 */
export function openEditClientModal(id, findUser) {
  if (modalFunctions) modalFunctions.openEditClientModal(id, findUser);
}

// What form.reset() leaves in every field
const EMPTY_VALUES = {
  clientId: '',
  clientName: '',
  email: '',
  phone: '',
  domain: '',
  clientLoginUsername: '',
  clientLoginPassword: '',
  newPortalUsername: '',
  newPortalPassword: '',
  clientEditUsername: '',
  clientEditPassword: '',
  address: '',
  gstNumber: '',
  clientPhase: '',
  active: 'true',
  amcStartDate: '',
  amcEndDate: '',
  amcDetails: '',
  sapAmcStartDate: '',
  sapAmcEndDate: '',
  productNameInput: '',
  purchaseDateInput: '',
  userSelect: ''
};

const DOMAIN_UNCHECKED = {
  iconClass: 'fa fa-globe text-muted',
  message: 'Auto-filled from email — MX records will be verified',
  messageClass: 'text-muted'
};

const HIDDEN = { display: 'none' };

/** A value for a form field: nothing becomes '' (as $(el).val(undefined) did). */
function fieldValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function dateInputValue(date) {
  return date ? moment(date).format('YYYY-MM-DD') : '';
}

function userFullName(user) {
  const profile = user.profile || {};
  return `${fieldValue(profile.firstName)} ${fieldValue(profile.lastName)}`;
}

function userEmailAddress(user) {
  return user.emails && user.emails[0] ? fieldValue(user.emails[0].address) : '';
}

export default function ClientFormModal({ onClientCreated, onClientUpdated }) {
  const { user: loggedInUser } = useAuth();
  const modalRef = useRef(null);
  const formRef = useRef(null);

  const [title, setTitle] = useState('Add New Client');
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [domainUi, setDomainUi] = useState(DOMAIN_UNCHECKED);
  const [showPortalLogin, setShowPortalLogin] = useState(true);
  const [showCreatePortalAccount, setShowCreatePortalAccount] = useState(false);
  const [showPortalCredentials, setShowPortalCredentials] = useState(false);
  const [products, setProducts] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [credentials, setCredentials] = useState({ username: '', password: '', email: '' });

  // The id of the client being edited ('' while creating). Also kept in a ref because the
  // "show" handler below must see the new value at once, before React has rendered again.
  const [editClientId, setEditClientIdState] = useState('');
  const editClientIdRef = useRef('');
  const setEditClientId = (id) => {
    editClientIdRef.current = id;
    setEditClientIdState(id);
  };

  /** Change some fields of the form, keeping the others. */
  const changeValues = (changes) => setValues((old) => Object.assign({}, old, changes));

  // Every field's id is also its key in `values`
  const handleChange = (event) => changeValues({ [event.target.id]: event.target.value });

  /* ---------------------------------------------------------------- domain validation */

  const resetDomain = () => {
    _domainValid = null;
    changeValues({ domain: '' });
    setDomainUi(DOMAIN_UNCHECKED);
  };

  const setDomainValidating = () => {
    setDomainUi({ iconClass: 'fa fa-spinner fa-spin text-muted', message: 'Validating domain...', messageClass: 'text-muted' });
  };

  const setDomainValid = () => {
    _domainValid = true;
    setDomainUi({ iconClass: 'fa fa-check-circle text-success', message: 'Domain verified — valid MX records found', messageClass: 'text-success' });
  };

  const setDomainInvalid = (msg) => {
    _domainValid = false;
    setDomainUi({
      iconClass: 'fa fa-times-circle text-danger',
      message: msg || 'Domain has no MX records — email may not be deliverable',
      messageClass: 'text-danger'
    });
  };

  const checkDomain = (domain) => {
    if (!domain) {
      setDomainInvalid('Please enter a domain');
      return;
    }
    setDomainValidating();
    api.call('clients.validateEmailDomain', domain, (err, result) => {
      if (err) {
        setDomainInvalid('Could not validate domain');
      } else if (result) {
        setDomainValid();
      } else {
        setDomainInvalid('Domain has no MX records — email may not be deliverable');
      }
    });
  };

  /* ---------------------------------------------------------------- opening the modal */

  const openCreate = () => {
    setTitle('Add New Client');
    setValues(EMPTY_VALUES);
    setEditClientId('');
    setProducts([]);
    setAssignedUsers([]);
    setShowPortalLogin(true);
    setShowPortalCredentials(false);
    setShowCreatePortalAccount(false);
    resetDomain();
    $('#clientFormModal').modal('show');
  };

  const openEdit = (id, findUser) => {
    // Without a lookup from the page, only the logged-in user is known
    const lookUpUser = findUser || ((userId) => (loggedInUser && loggedInUser._id === userId ? loggedInUser : undefined));

    setTitle('Edit Client');
    setValues(EMPTY_VALUES);

    // Mark edit mode BEFORE opening (the "show" handler skips ID generation when editClientId is set)
    setEditClientId(id);

    // Show modal immediately with loader (user list auto-loads via the "show" handler)
    setLoading(true);
    resetDomain();
    $('#clientFormModal').modal('show');

    api.call('clients.dataFilter', id, (err, res) => {
      if (!err && res) {
        setEditClientId(res._id);

        const changes = {
          clientId: fieldValue(res.clientId), // Client ID is already readonly
          clientName: fieldValue(res.clientName),
          email: fieldValue(res.email),
          phone: fieldValue(res.phone),
          address: fieldValue(res.address),
          gstNumber: fieldValue(res.gstNumber),
          clientPhase: fieldValue(res.clientPhase),
          active: res.active ? 'true' : 'false'
        };

        if (res.domain) {
          changes.domain = res.domain;
          checkDomain(res.domain);
        }

        if (res.amcDetails) {
          changes.amcStartDate = dateInputValue(res.amcDetails.startDate);
          changes.amcEndDate = dateInputValue(res.amcDetails.endDate);
          changes.amcDetails = fieldValue(res.amcDetails.details);
        }

        if (res.sapAmcDetails) {
          changes.sapAmcStartDate = dateInputValue(res.sapAmcDetails.startDate);
          changes.sapAmcEndDate = dateInputValue(res.sapAmcDetails.endDate);
        }

        // Populate products as display cards
        const productCards = [];
        if (res.productsPurchased && res.productsPurchased.length > 0) {
          res.productsPurchased.forEach(product => {
            const productName = product.productName || '';
            productCards.push({
              ticketTypeId: product.ticketTypeId || '',
              productName: productName,
              purchaseDate: dateInputValue(product.purchaseDate),
              displayName: productName
            });
          });
        }
        setProducts(productCards);

        // Populate assigned users
        const userCards = [];
        if (res.members && res.members.length > 0) {
          res.members.forEach(userId => {
            const user = lookUpUser(userId);
            if (user) {
              userCards.push({
                userId: userId,
                userName: `${user.profile.firstName} ${user.profile.lastName}`,
                userEmail: user.emails && user.emails[0] ? user.emails[0].address : ''
              });
            }
          });
        }
        setAssignedUsers(userCards);

        // Show portal credentials section only if client has a linked user account
        setShowPortalLogin(false);
        if (res.clientUserId && res.username) {
          setShowPortalCredentials(true);
          setShowCreatePortalAccount(false);
          changes.clientEditUsername = res.username;
          changes.clientEditPassword = '';
        } else {
          setShowPortalCredentials(false);
          setShowCreatePortalAccount(true);
          const suggestedUsername = (res.name || res.clientName || '')
            .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          changes.newPortalUsername = suggestedUsername;
          changes.newPortalPassword = '';
        }

        changeValues(changes);

        // Hide loader once data is populated
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
  };

  // Let the exported functions reach this modal
  useEffect(() => {
    const functions = {
      resetDomainUI: resetDomain,
      validateDomain: checkDomain,
      openCreateClientModal: openCreate,
      openEditClientModal: openEdit
    };
    modalFunctions = functions;
    return () => {
      if (modalFunctions === functions) modalFunctions = null;
    };
  });

  // Load users + auto-generate ID (create mode) whenever the modal is shown
  useEffect(() => {
    const modal = $(modalRef.current);

    const onShow = (event) => {
      if (event.target !== modalRef.current) return;

      api.call('user.getAllForAssignment', (error, users) => {
        if (!error) {
          setAllUsers(users);
        } else {
          console.error('Error loading users:', error);
          toastr.error('Failed to load users');
        }
      });

      api.call('ticketTypes.getActive', (error, types) => {
        if (!error) {
          setTicketTypes(types);
        } else {
          console.error('Error loading ticket types:', error);
        }
      });

      if (!editClientIdRef.current) {
        changeValues({ clientId: 'Generating...' });
        api.call('clients.generateNextId', (err, result) => {
          changeValues({ clientId: !err && result ? result : 'CL001' });
        });
      }
    };

    modal.on('show.bs.modal', onShow);
    return () => modal.off('show.bs.modal', onShow);
  }, []);

  // The dropdowns may be turned into select2 dropdowns by the page. select2 announces a choice
  // through jQuery only, so listen there as well to keep `values` up to date.
  useEffect(() => {
    const form = $(formRef.current);
    const onSelectChange = (event) => changeValues({ [event.target.id]: event.target.value });
    form.on('change', '.clientModalSelect', onSelectChange);
    return () => form.off('change', '.clientModalSelect', onSelectChange);
  }, []);

  /* ---------------------------------------------------------------- events */

  const handleEmailBlur = (event) => {
    const email = event.target.value.trim();
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain) {
        changeValues({ domain: domain });
        checkDomain(domain);
      }
    }
  };

  const handleDomainBlur = (event) => {
    const domain = event.target.value.trim();
    if (domain) {
      checkDomain(domain);
    } else {
      resetDomain();
    }
  };

  const showCredentials = (result) => {
    setCredentials({
      username: fieldValue(result.username),
      password: fieldValue(result.password),
      email: fieldValue(result.email)
    });
    $('#clientCredentialsModal').modal('show');
  };

  const handleCreatePortalAccount = (event) => {
    event.preventDefault();

    const clientId = editClientId;
    if (!clientId) { toastr.error('Client ID not found'); return; }

    const username = values.newPortalUsername.trim();
    const password = values.newPortalPassword.trim();

    if (!username) { toastr.error('Please enter a username'); return; }
    if (!password) { toastr.error('Please enter a password'); return; }
    if (password.length < 6) { toastr.error('Password must be at least 6 characters long'); return; }

    api.call('clients.createPortalAccount', clientId, username, password, (error, result) => {
      if (error) {
        toastr.error('Error creating portal account: ' + error.message);
      } else {
        toastr.success('Portal account created successfully!');
        showCredentials(result);
        setShowCreatePortalAccount(false);
        setShowPortalCredentials(true);
        changeValues({ clientEditUsername: fieldValue(result.username), clientEditPassword: '' });
      }
    });
  };

  // The old modal also handled a "#resetClientPassword" button, but its markup has no such button.
  const handleResetClientPassword = async (event) => {
    event.preventDefault();

    const clientId = editClientId;
    if (!clientId) {
      toastr.error('Client ID not found');
      return;
    }

    if (!(await fxConfirm('Are you sure you want to reset the password for this client? This will generate a new password.', { tone: 'warning', title: 'Reset password?', confirmText: 'Reset password' }))) {
      return;
    }

    api.call('clients.resetPassword', clientId, (error, result) => {
      if (error) {
        toastr.error('Failed to reset password: ' + error.message);
      } else {
        showCredentials(result);
        toastr.success('Password reset successfully!');
      }
    });
  };

  const handleAddProduct = (event) => {
    event.preventDefault();

    const ticketTypeId = values.productNameInput;
    const selectedType = (ticketTypes || []).find(type => type._id === ticketTypeId);
    const productName = (selectedType && selectedType.name) || '';
    const productCode = (selectedType && selectedType.code) || '';
    const purchaseDate = values.purchaseDateInput;

    if (!ticketTypeId) {
      toastr.warning('Please select a product type');
      return;
    }

    if (products.some(product => product.ticketTypeId === ticketTypeId)) {
      toastr.warning('This product type is already added');
      return;
    }

    const displayName = `${productName} (${productCode})`;

    setProducts([...products, { ticketTypeId, productName, purchaseDate, displayName }]);
    changeValues({ productNameInput: '', purchaseDateInput: '' });
    toastr.success('Product added successfully');
  };

  const handleRemoveProduct = (event, index) => {
    event.preventDefault();
    setProducts(products.filter((product, position) => position !== index));
    toastr.info('Product removed');
  };

  const handleAddUser = (event) => {
    event.preventDefault();

    const userId = values.userSelect;

    if (!userId) {
      toastr.warning('Please select a user');
      return;
    }

    if (assignedUsers.some(assigned => assigned.userId === userId)) {
      toastr.warning('User already assigned to this client');
      return;
    }

    const selectedUser = (allUsers || []).find(user => user._id === userId);
    const userName = selectedUser ? userFullName(selectedUser) : '';
    const userEmail = selectedUser ? userEmailAddress(selectedUser) : '';

    setAssignedUsers([...assignedUsers, { userId, userName, userEmail }]);
    changeValues({ userSelect: '' });
    toastr.success('User assigned successfully');
  };

  const handleRemoveUser = (event, index) => {
    event.preventDefault();
    setAssignedUsers(assignedUsers.filter((assigned, position) => position !== index));
    toastr.info('User removed from assignment');
  };

  const handleSave = (event) => {
    event.preventDefault();

    const form = formRef.current;

    const productsPurchased = [];
    products.forEach(product => {
      const productName = product.productName;
      const purchaseDate = product.purchaseDate;
      const ticketTypeId = product.ticketTypeId;
      if (productName || ticketTypeId) {
        productsPurchased.push({
          productName,
          ticketTypeId: ticketTypeId || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null
        });
      }
    });

    const members = [];
    assignedUsers.forEach(assigned => {
      if (assigned.userId) members.push(assigned.userId);
    });

    const domain = values.domain.trim();

    if (!domain) {
      toastr.error('Please enter a domain');
      return;
    }

    if (_domainValid === false) {
      toastr.error('Domain has no valid MX records. Please use a valid email domain.');
      return;
    }

    if (_domainValid === null) {
      toastr.warning('Domain not yet validated. Please wait for validation to complete and try again.');
      checkDomain(domain);
      return;
    }

    const clientData = {
      clientId: form.clientId.value.trim(),
      clientName: form.clientName.value.trim(),
      name: form.clientName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      domain: domain,
      address: form.address.value.trim(),
      gstNumber: form.gstNumber.value.trim(),
      clientPhase: form.clientPhase.value,
      active: form.active.value === 'true',
      amcDetails: {
        startDate: form.amcStartDate.value ? new Date(form.amcStartDate.value) : null,
        endDate: form.amcEndDate.value ? new Date(form.amcEndDate.value) : null,
        details: form.amcDetails.value.trim()
      },
      sapAmcDetails: {
        startDate: form.sapAmcStartDate.value ? new Date(form.sapAmcStartDate.value) : null,
        endDate: form.sapAmcEndDate.value ? new Date(form.sapAmcEndDate.value) : null
      },
      productsPurchased,
      members: members
    };

    if (!editClientId) {
      const username = values.clientLoginUsername.trim();
      const password = values.clientLoginPassword.trim();

      if (!username) { toastr.error('Please enter username for client portal login'); return; }
      if (!password) { toastr.error('Please enter password for client portal login'); return; }
      if (password.length < 6) { toastr.error('Password must be at least 6 characters long'); return; }

      clientData.username = username;
      clientData.password = password;
    }

    if (!clientData.clientId) { toastr.error('Please enter client ID'); return; }
    if (!clientData.clientName) { toastr.error('Please enter client name'); return; }
    if (!clientData.email) { toastr.error('Please enter email'); return; }
    if (!clientData.phone) { toastr.error('Please enter phone number'); return; }

    if (editClientId) {
      const updatedUsername = values.clientEditUsername.trim();
      const updatedPassword = values.clientEditPassword.trim();

      if (updatedUsername) clientData.username = updatedUsername;
      if (updatedPassword) {
        if (updatedPassword.length < 6) {
          toastr.error('Password must be at least 6 characters long');
          return;
        }
        clientData.password = updatedPassword;
      }

      api.call('clients.update', editClientId, clientData, (error) => {
        if (error) {
          toastr.error('Error updating client: ' + error.message);
        } else {
          toastr.success('Client updated successfully!');
          $('#clientFormModal').modal('hide');
          document.dispatchEvent(new CustomEvent('client:updated', {
            detail: { clientId: editClientId }
          }));
          if (onClientUpdated) onClientUpdated(editClientId);
        }
      });
    } else {
      api.call('clients.create', clientData, (error, result) => {
        if (error) {
          toastr.error('Error creating client: ' + error.message);
        } else {
          toastr.success('Client created successfully!');
          $('#clientFormModal').modal('hide');

          if (result && result.credentials) {
            showCredentials(result.credentials);
          }

          document.dispatchEvent(new CustomEvent('client:created', {
            detail: { clientId: result && result.clientId }
          }));
          if (onClientCreated) onClientCreated(result && result.clientId);
        }
      });
    }
  };

  const copyCredential = (text, message) => {
    navigator.clipboard.writeText(text);
    toastr.success(message);
  };

  return (
    <>
      {/* Client Create/Edit Modal */}
      <div className="modal fade" id="clientFormModal" tabIndex="-1" aria-hidden="true" ref={modalRef}>
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="clientFormTitle">{title}</h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body" style={{ position: 'relative', minHeight: '200px' }}>
              {/* Loading overlay for edit modal */}
              <div id="clientFormLoader" style={{ display: loading ? 'flex' : 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.9)', zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="mt-2 text-muted small">Loading client data...</div>
                </div>
              </div>
              <form id="clientForm" ref={formRef}>
                <input type="hidden" id="editClientId" name="editClientId" value={editClientId} readOnly />

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="clientId">Client ID <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="clientId" name="clientId" readOnly style={{ backgroundColor: '#f0f0f0' }}
                      value={values.clientId} />
                    <small className="text-muted">Auto-generated when you save</small>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="clientName">Client Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="clientName" name="clientName" placeholder="Enter client name" required
                      value={values.clientName} onChange={handleChange} />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="email">Email <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" id="email" name="email" placeholder="Enter email address" required
                      value={values.email} onChange={handleChange} onBlur={handleEmailBlur} />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="phone">Phone <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="phone" name="phone" placeholder="Enter phone number" required
                      value={values.phone} onChange={handleChange} />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="domain">Domain <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input type="text" className="form-control" id="domain" name="domain" placeholder="e.g. example.com"
                        value={values.domain} onChange={handleChange} onBlur={handleDomainBlur} />
                      <span className="input-group-text" style={{ minWidth: '40px', justifyContent: 'center' }}>
                        <i id="domainStatusIcon" className={domainUi.iconClass}></i>
                      </span>
                    </div>
                    <small id="domainValidationMsg" className={domainUi.messageClass}>{domainUi.message}</small>
                  </div>

                  {/* Portal Login Credentials (only shown when creating new client) */}
                  <div id="portalLoginSection" className="col-md-12 mb-3" style={showPortalLogin ? undefined : HIDDEN}>
                    <div className="card bg-light border-primary">
                      <div className="card-header  text-white">
                        <h6 className="mb-0">
                          <i className="fa fa-key"></i> Client Portal Login Credentials
                        </h6>
                      </div>
                      <div className="card-body">
                        <p className="text-muted small mb-3">
                          <i className="fa fa-info-circle"></i> These credentials will be used by the client to login and view their projects and tasks.
                        </p>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="clientLoginUsername">Username <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" id="clientLoginUsername" placeholder="Enter username" required
                              value={values.clientLoginUsername} onChange={handleChange} />
                            <small className="text-muted">Client will use this to login</small>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="clientLoginPassword">Password <span className="text-danger">*</span></label>
                            <input type="password" className="form-control" id="clientLoginPassword" placeholder="Enter password" required
                              value={values.clientLoginPassword} onChange={handleChange} />
                            <small className="text-muted">Minimum 6 characters</small>
                          </div>
                        </div>
                        <div className="alert alert-info mb-0 small">
                          <i className="fa fa-user-circle"></i>
                          {' '}<strong>Role:</strong> Client (automatically assigned) - can view their projects and tasks
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Create Portal Account Section (shown when editing client without a user account) */}
                  <div id="createPortalAccountSection" className="col-md-12 mb-3" style={showCreatePortalAccount ? undefined : HIDDEN}>
                    <div className="card bg-light border-warning">
                      <div className="card-header bg-warning text-dark">
                        <h6 className="mb-0">
                          <i className="fa fa-user-plus"></i> Create Client Portal Account
                        </h6>
                      </div>
                      <div className="card-body">
                        <p className="text-muted small mb-3">
                          <i className="fa fa-info-circle"></i> This client doesn&apos;t have a portal account yet. Create one to allow them to log in.
                        </p>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="newPortalUsername">Username <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" id="newPortalUsername" placeholder="Enter username"
                              value={values.newPortalUsername} onChange={handleChange} />
                            <small className="text-muted">Client will use this to login</small>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="newPortalPassword">Password <span className="text-danger">*</span></label>
                            <input type="password" className="form-control" id="newPortalPassword" placeholder="Enter password (min 6 characters)"
                              value={values.newPortalPassword} onChange={handleChange} />
                            <small className="text-muted">Minimum 6 characters</small>
                          </div>
                        </div>
                        <button type="button" className="btn btn-warning" id="createPortalAccount" onClick={handleCreatePortalAccount}>
                          <i className="fa fa-user-plus"></i> Create Portal Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Portal Credentials Section (only shown when editing) */}
                  <div id="portalCredentialsSection" className="col-md-12 mb-3" style={showPortalCredentials ? undefined : HIDDEN}>
                    <div className="card bg-light border-primary">
                      <div className="card-header text-white">
                        <h6 className="mb-0">
                          <i className="fa fa-key"></i> Update Client Portal Credentials
                        </h6>
                      </div>
                      <div className="card-body">
                        <p className="text-muted small mb-3">
                          <i className="fa fa-info-circle"></i> Update the client&apos;s login credentials. Leave password blank to keep existing password.
                        </p>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="clientEditUsername">Username</label>
                            <input type="text" className="form-control" id="clientEditUsername" placeholder="Enter new username"
                              value={values.clientEditUsername} onChange={handleChange} />
                            <small className="text-muted">Client uses this to login</small>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="clientEditPassword">New Password</label>
                            <input type="password" className="form-control" id="clientEditPassword" placeholder="Enter new password (optional)"
                              value={values.clientEditPassword} onChange={handleChange} />
                            <small className="text-muted">Leave blank to keep existing password</small>
                          </div>
                        </div>
                        <div className="alert alert-warning mb-0 small">
                          <i className="fa fa-exclamation-triangle"></i>
                          {' '}<strong>Note:</strong> Changing credentials will require the client to use the new username/password for login.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12 mb-3">
                    <label className="form-label" htmlFor="address">Address</label>
                    <textarea className="form-control" id="address" name="address" rows="2" placeholder="Enter address"
                      value={values.address} onChange={handleChange}></textarea>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="gstNumber">GST Number</label>
                    <input type="text" className="form-control" id="gstNumber" name="gstNumber" placeholder="Enter GST number"
                      value={values.gstNumber} onChange={handleChange} />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="clientPhase">Client Phase</label>
                    <select className="form-select clientModalSelect" id="clientPhase" name="clientPhase" style={{ width: '100%' }}
                      value={values.clientPhase} onChange={handleChange}>
                      <option value="">Select Phase</option>
                      <option value="Lead">Lead</option>
                      <option value="Prospect">Prospect</option>
                      <option value="Implementation Phase">Implementation Phase</option>
                      <option value="Live">Live</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="active">Status</label>
                    <select className="form-select clientModalSelect" id="active" name="active" style={{ width: '100%' }}
                      value={values.active} onChange={handleChange}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <hr className="my-3" />
                <h6 className="mb-3">AMC Details</h6>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label" htmlFor="amcStartDate">AMC Start Date</label>
                    <input type="date" className="form-control" id="amcStartDate" name="amcStartDate"
                      value={values.amcStartDate} onChange={handleChange} />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label" htmlFor="amcEndDate">AMC End Date</label>
                    <input type="date" className="form-control" id="amcEndDate" name="amcEndDate"
                      value={values.amcEndDate} onChange={handleChange} />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label" htmlFor="amcDetails">AMC Details</label>
                    <input type="text" className="form-control" id="amcDetails" name="amcDetails" placeholder="Enter AMC details"
                      value={values.amcDetails} onChange={handleChange} />
                  </div>
                </div>

                <hr className="my-3" />
                <h6 className="mb-3">SAP AMC Details</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="sapAmcStartDate">SAP AMC Start Date</label>
                    <input type="date" className="form-control" id="sapAmcStartDate" name="sapAmcStartDate"
                      value={values.sapAmcStartDate} onChange={handleChange} />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="sapAmcEndDate">SAP AMC End Date</label>
                    <input type="date" className="form-control" id="sapAmcEndDate" name="sapAmcEndDate"
                      value={values.sapAmcEndDate} onChange={handleChange} />
                  </div>
                </div>

                <hr className="my-3" />
                <h6 className="mb-3">Products Purchased</h6>
                <div className="row mb-3">
                  <div className="col-md-5 mb-2">
                    <label className="form-label" htmlFor="productNameInput">Product</label>
                    <select className="form-select clientModalSelect" id="productNameInput" style={{ width: '100%' }}
                      value={values.productNameInput} onChange={handleChange}>
                      <option value="">Select product</option>
                      {(ticketTypes || []).map((type) => (
                        <option key={type._id} value={type._id} data-code={type.code} data-name={type.name}>{type.name} ({type.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-5 mb-2">
                    <label className="form-label" htmlFor="purchaseDateInput">Purchase Date</label>
                    <input type="date" className="form-control" id="purchaseDateInput"
                      value={values.purchaseDateInput} onChange={handleChange} />
                  </div>
                  <div className="col-md-2 mb-2 d-flex align-items-end">
                    <button type="button" className="btn btn-primary w-100" id="addProductToClient" onClick={handleAddProduct}>
                      <i className="fa fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                {/* Added Products Cards */}
                <div id="productsContainer" className="row g-3 mb-3">
                  {products.map((product, index) => (
                    <div className="col-md-4" key={index}>
                      <div className="card product-card" data-ticket-type-id={product.ticketTypeId} data-product-name={product.productName} data-purchase-date={product.purchaseDate}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="card-title mb-1">
                                <i className="fa fa-shopping-cart text-primary"></i> {product.displayName}
                              </h6>
                              <p className="card-text text-muted small mb-0">
                                {product.purchaseDate ? moment(product.purchaseDate).format('MMM DD, YYYY') : 'No date specified'}
                              </p>
                            </div>
                            <button type="button" className="btn btn-sm btn-danger remove-product" onClick={(event) => handleRemoveProduct(event, index)}>
                              <i className="fa fa-times"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="my-3" />
                <h6 className="mb-3">Assign Users to Client</h6>
                <div className="row">
                  <div className="col-md-10 mb-3">
                    <label className="form-label" htmlFor="userSelect">Select User</label>
                    <select className="form-select clientModalSelect" id="userSelect" style={{ width: '100%' }}
                      value={values.userSelect} onChange={handleChange}>
                      <option value="">Choose a user...</option>
                      {(allUsers || []).map((user) => (
                        <option key={user._id} value={user._id} data-name={userFullName(user)} data-email={userEmailAddress(user)}>
                          {userFullName(user)} ({userEmailAddress(user)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2 mb-3 d-flex align-items-end">
                    <button type="button" className="btn btn-primary w-100" id="addUserToClient" onClick={handleAddUser}>
                      <i className="fa fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                {/* Assigned Users Cards */}
                <div id="assignedUsersContainer" className="row g-3 mb-3">
                  {assignedUsers.map((assigned, index) => (
                    <div className="col-md-4" key={assigned.userId}>
                      <div className="card user-card" data-user-id={assigned.userId}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="card-title mb-1">{assigned.userName}</h6>
                              <p className="card-text text-muted small mb-0">{assigned.userEmail}</p>
                            </div>
                            <button type="button" className="btn btn-sm btn-danger remove-user" data-user-id={assigned.userId} onClick={(event) => handleRemoveUser(event, index)}>
                              <i className="fa fa-times"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" id="saveClient" onClick={handleSave}>Save Client</button>
            </div>
          </div>
        </div>
      </div>

      {/* Client Credentials Modal */}
      <div className="modal fade" id="clientCredentialsModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title">
                <i className="fa fa-check-circle"></i> Client Account Created
              </h5>
              <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning" role="alert">
                <i className="fa fa-exclamation-triangle"></i>
                {' '}<strong>Important:</strong> Please save these credentials securely. The password cannot be retrieved later!
              </div>

              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="card-title mb-3">Client Portal Login Credentials</h6>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Username</label>
                    <div className="input-group">
                      <input type="text" className="form-control" id="credentialsUsername" readOnly value={credentials.username} />
                      <button className="btn btn-outline-secondary" type="button" onClick={() => copyCredential(credentials.username, 'Username copied!')}>
                        <i className="fa fa-copy"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Password</label>
                    <div className="input-group">
                      <input type="text" className="form-control" id="credentialsPassword" readOnly value={credentials.password} />
                      <button className="btn btn-outline-secondary" type="button" onClick={() => copyCredential(credentials.password, 'Password copied!')}>
                        <i className="fa fa-copy"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-bold">Email</label>
                    <div className="input-group">
                      <input type="text" className="form-control" id="credentialsEmail" readOnly value={credentials.email} />
                      <button className="btn btn-outline-secondary" type="button" onClick={() => copyCredential(credentials.email, 'Email copied!')}>
                        <i className="fa fa-copy"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-info" role="alert">
                <i className="fa fa-info-circle"></i>
                {' '}The client can login at <strong>/client-portal</strong> to view their projects and tasks.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-success closeCredentialsModal" data-dismiss="modal" onClick={() => $('#clientCredentialsModal').modal('hide')}>
                <i className="fa fa-check"></i> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
