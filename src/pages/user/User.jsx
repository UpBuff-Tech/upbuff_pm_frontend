/**
 * @author Visakh
 */

// The user list page (/user/list): cards or a table of the employees, with search,
// and the modals to create, view, edit, block, activate and delete a user.

import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import { genericSortIcons } from '../../components/utility';
import SuccessModal from '../../layouts/modals/SuccessModal';
import ErrorModal from '../../layouts/modals/ErrorModal';
import { CardGridSkeleton, TableSkeleton } from '../../components/skeleton/Skeleton';
import UserCardView from './UserCardView';
import UserTableView from './UserTableView';
import UserEditModal from './UserEditModal';
import UserReportExport from './UserReportExport';
import UserDetailModal from './UserDetailModal';
import UserConfirmModals from './UserConfirmModals';
import UserCreateModal from './UserCreateModal';
import { filterUsers } from './userListHelpers';
import { EMPTY_CREATE_FORM, EMPTY_EDIT_FORM, clearFileInputs, editFormValues, formUpdater } from './userFormHelpers';

const EMPTY_CONFIRM = {
  confirmedUuid: '',   // user to block or delete
  userNameDup: '',
  userHeader: '',
  confirmedUuids: '',  // user to activate
  userNameDups: '',
  userHeaders: '',
};

export default function User() {
  const { userCan, roles, userId, refreshUser } = useAuth();

  const pagination = usePagination('users', {
    filters: {
      userType: "Employee"
    },
    sort: { createdAt: -1 },
    fields: {
      profile: 1,
      username: 1,
      emails: 1,
      active: 1,
      createdAt: 1,
      companyId: 1,
      contactNo: 1,
      emailAddress: 1,
      companyEmail: 1,
      address: 1,
      joinedDate: 1,
      leavingDate: 1,
      roles: 1,
      salaryAmount: 1,
      salaryRevision: 1,
      attachments: 1,
      userType: 1
    },
    perPage: 12
  });

  const [roleNameArray, setRoleNameArray] = useState();
  const [modalLoader, setModalLoader] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('card');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(EMPTY_CONFIRM);

  const updateEdit = formUpdater(setEditForm);
  const updateConfirm = formUpdater(setConfirm);
  const isReady = pagination.ready();

  useEffect(() => {
    api.call('role.roleNameGet2', (roleError, roleResult) => {
      if (!roleError) {
        setRoleNameArray(roleResult);
      }
    });
  }, []);

  // {{sortIcon}}
  useEffect(() => {
    if (isReady) genericSortIcons();
  }, [isReady]);

  /** The logged-in user changed their own record: reload it. */
  const refreshIfSelf = (id) => {
    if (id === userId) refreshUser();
  };

  /**
   * Get paginated user list with search filtering
   */
  const userList = filterUsers(pagination.getPage(), searchQuery, roles || []);

  /* ---------------------------------------------------------------- events */

  /**
   * Reset search
   */
  const resetSearch = (event) => {
    event.preventDefault();
    setSearchQuery('');
  };

  /**
   * Toggle between card and table view
   */
  const toggleView = (event, newView) => {
    event.preventDefault();
    setView(newView);
  };

  /**
   * Open user creation modal
   */
  const openCreate = () => {
    // Reset form, clear validation messages
    setCreateForm(EMPTY_CREATE_FORM);
    clearFileInputs('profilePhoto', 'attachments');

    // Show modal
    $('#userCreateModal').modal('show');
  };

  /**
   * Edit employee details
   */
  const openEdit = (event, user) => {
    event.preventDefault();
    let id = user._id;

    // Clear password fields and file uploads
    updateEdit({
      passwordspans: '',
      confirmPasswordspans: '',
      passwords: '',
      confirmPasswords: '',
      showPasswords: false,
      profilePhotoPreviewEdit: '',
      attachmentsListEdit: null,
      attachmentFilesEdit: [],
    });
    clearFileInputs('profilePhotoEdit', 'attachmentsEdit');

    setModalLoader(true);
    $('#userEditPage').modal('show');

    // Fetch user data
    api.call('user.dataGets', id, (err, res) => {
      if (!err && res) {
        setModalLoader(false);
        updateEdit(editFormValues(id, res.userRes));
      }
      else {
        setModalLoader(false);
        toastr['error']('Error loading user details', 'ERROR');
      }
    });
  };

  /**
   * Close edit modal and reset (the .closen buttons)
   */
  const closen = () => {
    // form.reset() did not touch the hidden id nor the password visibility
    setEditForm((old) => ({ ...EMPTY_EDIT_FORM, id: old.id, showPasswords: old.showPasswords }));
    clearFileInputs('profilePhotoEdit', 'attachmentsEdit');
    setModalLoader(false);

    // Explicitly close all modals
    $('#userEditPage').modal('hide');
    $('#userDetailPage').modal('hide');
    $('#userCreateModal').modal('hide');
  };

  /**
   * View user details
   */
  const openView = (event, user) => {
    event.preventDefault();
    let id = user._id;
    setModalLoader(true);

    $('#userDetailPage').modal('show');

    api.call('user.dataGets', id, (userError, userResult) => {
      if (!userError && userResult && userResult.userRes) {
        setModalLoader(false);
        setDetail({ user: userResult.userRes, roleName: userResult.roleName || '' });
      } else {
        setModalLoader(false);
        toastr.error('Error loading user details', 'ERROR');
      }
    });
  };

  const askRemove = (event, user) => {
    event.preventDefault();
    $('#companyDelConfirmation').modal('show');
    // The old page looked the name up under a wrong id, so it was always empty here.
    updateConfirm({ userHeader: 'Move To Bin', confirmedUuid: user._id });
  };

  const askDeactivate = (event, user) => {
    event.preventDefault();
    $('#userDelConfirmation').modal('show');
    updateConfirm({ userNameDup: user.username || '', confirmedUuid: user._id });
  };

  const askActivate = (event, user) => {
    event.preventDefault();
    $('#userActiveConfirmation').modal('show');
    let username = user.username || '';
    updateConfirm({ userHeaders: 'Confirm Activation Of ' + $.trim(username), userNameDups: username, confirmedUuids: user._id });
  };

  const userRemove = (event) => {
    event.preventDefault();
    let _id = confirm.confirmedUuid;
    if (_id && $.trim(_id)) {
      $("#userDelConfirmation").modal('hide');
      api.call('user.inactive', $.trim(_id), (error) => {
        if (error) {
          toastr['error'](error.reason, 'ERROR');
        } else {
          toastr['success']('Business Partner Blocked Successfully', 'SUCCESS');
          refreshIfSelf($.trim(_id));
        }
      });
    }
  };

  const companyRemove = (event) => {
    event.preventDefault();
    let _id = confirm.confirmedUuid;
    if (_id && $.trim(_id)) {
      $("#companyDelConfirmation").modal('hide');
      api.call('company.delete', $.trim(_id), (error) => {
        if (error) {
          toastr['error'](error.reason, 'ERROR');
        } else {
          toastr['success']('Business Partner Removed Successfully', 'SUCCESS');
        }
      });
    }
  };

  const userActivate = (event) => {
    event.preventDefault();
    let _id = confirm.confirmedUuids;
    if (_id && $.trim(_id)) {
      api.call('user.active', $.trim(_id), (error) => {
        if (error) {
          toastr['error'](error.reason, 'ERROR');
        } else {
          toastr['success']('Business Partner has been activated successfully', 'SUCCESS');
          refreshIfSelf($.trim(_id));
        }
        $("#userActiveConfirmation").modal('hide');
      });
    }
  };

  const rowHandlers = {
    users: userList,
    rolesList: roleNameArray,
    userCan: userCan,
    onView: openView,
    onEdit: openEdit,
    onDeactivate: askDeactivate,
    onActivate: askActivate,
    onRemove: askRemove,
  };

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">User Management</h4>
            <p className="text-muted mb-0">Manage employees, users, directors and members</p>
          </div>
          <div className="d-flex gap-2">
            {/* View Toggle Buttons */}
            <div className="btn-group" role="group">
              <button type="button" className={'btn btn-outline-primary view-toggle' + (view === 'card' ? ' active' : '')}
                data-view="card" id="cardViewBtn" onClick={(event) => toggleView(event, 'card')}>
                <i className="bx bx-grid-alt"></i> Card
              </button>
              <button type="button" className={'btn btn-outline-primary view-toggle' + (view === 'table' ? ' active' : '')}
                data-view="table" id="tableViewBtn" onClick={(event) => toggleView(event, 'table')}>
                <i className="bx bx-list-ul"></i> Table
              </button>
            </div>
            {/* Create Button */}
            {userCan('user_create') && (
              <button type="button" className="btn btn-primary createProject" id="ic-create-button" onClick={openCreate}>
                <i className="fa fa-plus me-1"></i> Create User
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-10">
                <div className="input-group">
                  <span className="input-group-text"><i className="fa fa-search"></i></span>
                  <input type="text" className="form-control" id="searchUsers"
                    placeholder="Search by name, email, contact, username, or role..."
                    value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                </div>
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-outline-secondary w-100" id="resetSearch" onClick={resetSearch}>
                  <i className="fa fa-refresh"></i> Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          <div className="row">
            <div className="nav-align-top mb-2" id="taskHeader">
              <div className="tab-content" style={{ background: 'none', boxShadow: 'none', padding: 0 }}>
                <div className="box box-default box-solid" style={{ background: 'none', boxShadow: 'none', border: 'none' }}>
                  {isReady ? (
                    <>
                      {/* Card View (Default) */}
                      <UserCardView {...rowHandlers} visible={view === 'card'} />

                      {/* Table View (Hidden by default) */}
                      <UserTableView {...rowHandlers} visible={view === 'table'} />
                    </>
                  ) : view === 'card' ? (
                    <CardGridSkeleton count={6} label="Loading users…" />
                  ) : (
                    <div className="card"><div className="card-body"><TableSkeleton rows={8} columns={6} label="Loading users…" /></div></div>
                  )}
                </div>
              </div>
            </div>

            {/* Pagination (works for both views) */}
            {isReady && (
              <Paginator pagination={pagination} limit={10} containerClass="text-right" />
            )}

          </div>
        </section>
      </div>

      <SuccessModal id="userSuccessModal" />
      <ErrorModal id="userErrorModal" />

      <UserEditModal form={editForm} setForm={setEditForm} rolesList={roleNameArray} printLoad={modalLoader}
        setModalLoader={setModalLoader} onClosen={closen} onUpdated={refreshIfSelf} />

      <div id="fullScreen">
        <img src="" alt="" />
      </div>

      <UserReportExport printLoad={modalLoader} setModalLoader={setModalLoader} />

      <UserDetailModal detail={detail} printLoad={modalLoader} onClosen={closen} />

      <UserConfirmModals confirm={confirm} onUserRemove={userRemove} onCompanyRemove={companyRemove}
        onUserActivate={userActivate} />

      {/* User Creation Modal */}
      <UserCreateModal form={createForm} setForm={setCreateForm} rolesList={roleNameArray} printLoad={modalLoader}
        setModalLoader={setModalLoader} />
    </>
  );
}
