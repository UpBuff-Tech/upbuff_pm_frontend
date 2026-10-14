/**
 * @author Nithin
 */

// Role Management page (/role/list): the tree of roles, with the modals to create a child role,
// edit a role (name, home page, status, page permissions) and delete a role.

import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import { useGlobalHelpers } from '../../lib/globalHelpers';
import SuccessModal from '../../layouts/modals/SuccessModal';
import ErrorModal from '../../layouts/modals/ErrorModal';
import { useRoleForm } from './useRoleForm';
import { createRole, updateRole, showMessageModal, randomChars } from './utility';
import RoleTree from './RoleTree';
import RoleCreateModal from './RoleCreateModal';
import RoleEditModal from './RoleEditModal';
import RoleDeleteModal from './RoleDeleteModal';
import RoleDuplicateModal from './RoleDuplicateModal';
import RoleFilterModal from './RoleFilterModal';
import RoleExportTables from './RoleExportTables';
import { ListSkeleton } from '../../components/skeleton/Skeleton';

// Select2 for the home page dropdown of the create modal
const CREATE_HOME_PAGE_SELECT2 = {
  placeholder: 'Select Home Page',
  allowClear: true,
  dropdownParent: '#ic-create .modal-body',
};

const NAME_TAKEN_STYLE = { color: 'red', border: '1px solid red' };
const NAME_FREE_STYLE = { color: 'black', border: '1px solid #00c0ef' };

export default function RoleList() {
  const { userCan, reloadRoles } = useAuth();
  const { roleName } = useGlobalHelpers();

  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [treeRoles, setTreeRoles] = useState(null);
  const [userCounts, setUserCounts] = useState({});

  const pagination = usePagination('jalik-roles', {
    filters: {
      'isDeleted': false,
    },
    sort: { 'name': 1 },
    fields: {
      name: 1,
      description: 1
    },
    perPage: 20
  });

  // Create modal
  const createForm = useRoleForm();
  const [createParentRole, setCreateParentRole] = useState(null);
  const [createNameStyle, setCreateNameStyle] = useState(null);
  const [createTakenName, setCreateTakenName] = useState(null);
  const [createSubmitDisabled, setCreateSubmitDisabled] = useState(false);
  const [createSelect2Options, setCreateSelect2Options] = useState(null);

  // Edit modal
  const editForm = useRoleForm();
  const [editRoleId, setEditRoleId] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Delete / duplicate modals
  const [deleteInfo, setDeleteInfo] = useState({ header: '', name: '', id: '', total: '' });
  const [duplicateName, setDuplicateName] = useState('');

  // Load tree data
  const loadTreeData = () => {
    setIsTreeLoading(true);
    setTreeRoles(null);
    api.call('role.getTreeList', (err, result) => {
      setIsTreeLoading(false);
      if (!err && result) {
        setUserCounts({});
        setTreeRoles(result);

        // Count users for each role
        result.forEach((r) => {
          api.call('user.idRoleCount', r._id, (countErr, count) => {
            if (!countErr) {
              setUserCounts((old) => ({ ...old, [r._id]: count }));
            }
          });
        });
      }
    });
  };

  useEffect(() => {
    loadTreeData();
  }, []);

  /* ---------------------------------------------------------------- events */

  /**
   * Filter the roles by name and/or description
   * @param event
   */
  const handleFilterSubmit = (event) => {
    event.preventDefault();
    let name = $.trim(event.target.elements.name.value);
    let description = $.trim(event.target.elements.description.value);
    $('#filterModal').modal('hide');
    if (name === '' && description === '') {
      $('#filterModal').modal('hide');
    }
    else {
      if (name && description) {
        pagination.settings.set('filters',
          {
            name: {
              $regex: new RegExp(name, "i")
            },
            description: {
              $regex: new RegExp(description, "i")
            },

            'isDeleted': false
          }
        );
      }
      else if (name && description === '') {
        pagination.settings.set('filters', {
          name: {
            $regex: new RegExp(name, "i")
          },
          'isDeleted': false
        });
      }
      else if (description && name === '') {
        pagination.settings.set('filters', {
          description: { $regex: new RegExp(description, "i") },
          'isDeleted': false
        });
      }
      else {
        pagination.settings.set('filters',
          {
            'isDeleted': false
          });
      }
    }
    $('#filterModal').modal('hide');
  };

  // Add child role button - open create modal with parent info
  const handleAddChild = (parentId, parentName) => {
    // Reset create form
    createForm.reset();
    setCreateTakenName(null);
    setCreateSubmitDisabled(false);
    // Set parent info
    setCreateParentRole({ id: parentId, name: parentName || parentId });
    // Initialize Select2 for home page dropdown
    setCreateSelect2Options(CREATE_HOME_PAGE_SELECT2);
    $("#ic-create").modal();
  };

  // Role name duplicate check for create modal
  const handleCreateNameBlur = () => {
    let name = createForm.fields.name;
    api.call('role.roleCount', name, (roleError, roleResult) => {
      if (!roleError) {
        if (roleResult === 1) {
          setCreateNameStyle(NAME_TAKEN_STYLE);
          setCreateTakenName(name);
          setCreateSubmitDisabled(true);
        } else {
          setCreateNameStyle(NAME_FREE_STYLE);
          setCreateTakenName(null);
          setCreateSubmitDisabled(false);
        }
      }
    });
  };

  /**
   * Edit button handler - populates modal with role data
   * @param _id
   */
  const handleEdit = (_id) => {
    // Show loader and open modal
    setIsEditLoading(true);
    $("#ic-edit").modal();

    api.call('role.roleName', _id, (err, res) => {
      if (err) {
        console.error('Error fetching role:', err);
        setIsEditLoading(false);
        return;
      }

      let roleDetail = res;

      setEditRoleId(_id);
      editForm.loadRole(roleDetail);

      // Hide loader after all data is populated
      setIsEditLoading(false);
    });
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    const target = {
      ...createForm.fields,
      parentId: createParentRole ? createParentRole.id : '',
      permissions: createForm.permissions,
    };
    createRole(target, undefined, {
      reloadRoles,
      onSaved: () => {
        createForm.reset();
        setCreateNameStyle(NAME_FREE_STYLE);
        setCreateSubmitDisabled(false);
      },
    });
    $('#ic-create').modal('hide');
    // Refresh tree after create
    setTimeout(() => {
      loadTreeData();
    }, 500);
  };

  const handleUpdateSubmit = (event) => {
    event.preventDefault();
    const target = {
      ...editForm.fields,
      _idRole: editRoleId,
      permissions: editForm.permissions,
    };
    updateRole(target, { reloadRoles, onSaved: editForm.reset });
    $('#ic-edit').modal('hide');
    // Refresh tree after update
    setTimeout(() => {
      loadTreeData();
    }, 500);
  };

  // "Close" button of the create and the edit modal
  const handleCloseRole = () => {
    editForm.reset();
  };

  // Close (x) button of the filter modal
  const handleFilterClose = () => {
    editForm.reset();
    setDuplicateName('');
  };

  /**
   * Delete button of a role: ask for confirmation
   * @param _id
   * @param roleNameToRemove
   */
  const handleRemove = (_id, roleNameToRemove) => {
    $('#categoryDelConfirmation').modal();
    let username = roleNameToRemove || '';

    api.call('user.userCount', _id, (err, res) => {
      let users = res;
      setDeleteInfo((old) => ({
        header: 'Confirm Deletion Of ' + $.trim(username),
        name: username,
        id: _id,
        total: users === undefined ? old.total : users,
      }));
    });
  };

  const handleDuplicate = (event) => {
    event.preventDefault();
    let name = '';
    let _id = $('#confirmedUuids').val();
    api.call('role.roleName', _id, (roleError, roleResult) => {
      if (!roleError) {
        let duplicate = roleResult;
        if (duplicateName !== '') {
          name = duplicateName;
        }
        else {
          name = duplicate.name + "_Copy_" + randomChars(3);
        }

        let description = duplicate.description;
        let homePage = duplicate.homePage;
        let itemLines = duplicate.permissions;

        api.call('role.duplicate', name, description, homePage, itemLines, (error) => {
          if (error) {
            $('#message').html("Internal error - unable to duplicate entry. Please try again");
          } else {
            showMessageModal('#roleSuccessModal', 'Role has been duplicated successfully');
            reloadRoles();
          }
          $("#duplicateConfirmation").modal('hide');
        });
        setDuplicateName('');
      }
    });
  };

  const handleCloseDuplicate = () => {
    setDuplicateName('');
  };

  const handleCategoryRemove = (event) => {
    event.preventDefault();
    let _id = deleteInfo.id;
    if (_id && $.trim(_id)) {
      api.call('role.delete', $.trim(_id), (error) => {
        if (error) {
          $('#message').html("Internal error - unable to remove entry. Please try again");
        } else {
          showMessageModal('#roleSuccessModal', 'Role has been deleted successfully');
          // Refresh tree
          loadTreeData();
          reloadRoles();
        }
        $("#categoryDelConfirmation").modal('hide');
      });
    }
  };

  /* ---------------------------------------------------------------- page */

  const role = roleName ? roleName.role : '';

  return (
    <>
      {userCan('role_view') && roleName && (
        <>
          <div className="container-xxl flex-grow-1 container-p-y">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold mb-1">Role Management</h4>
                <p className="text-muted mb-0">Manage user roles and permissions</p>
              </div>
            </div>

            <section className="content">
              {isTreeLoading ? (
                /* Loading Spinner */
                <div className="card">
                  <div className="card-body p-3">
                    <ListSkeleton rows={7} indent label="Loading roles…" />
                  </div>
                </div>
              ) : (
                /* Role Tree View */
                <div className="card">
                  <div className="card-body p-3">
                    <RoleTree roles={treeRoles} userCounts={userCounts} userCan={userCan}
                      onAddChild={handleAddChild} onEdit={handleEdit} onRemove={handleRemove} />
                  </div>
                </div>
              )}
            </section>
          </div>

          <RoleCreateModal role={role} form={createForm} parentRole={createParentRole}
            nameStyle={createNameStyle} takenName={createTakenName} submitDisabled={createSubmitDisabled}
            select2Options={createSelect2Options}
            onNameBlur={handleCreateNameBlur} onSubmit={handleCreateSubmit} onClose={handleCloseRole} />

          <RoleEditModal role={role} form={editForm} roleId={editRoleId} isLoading={isEditLoading}
            onSubmit={handleUpdateSubmit} onClose={handleCloseRole} />

          <SuccessModal id="roleSuccessModal" section="role" />
          <ErrorModal id="roleErrorModal" section="role" />

          <RoleDeleteModal role={role} info={deleteInfo} onRemove={handleCategoryRemove} />

          <RoleDuplicateModal role={role} duplicateName={duplicateName} onDuplicateNameChange={setDuplicateName}
            onDuplicate={handleDuplicate} onClose={handleCloseDuplicate} />

          <RoleExportTables />
        </>
      )}

      <RoleFilterModal onSubmit={handleFilterSubmit} onClose={handleFilterClose} />
    </>
  );
}
