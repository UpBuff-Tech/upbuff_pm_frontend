// The table view of the user list (#tableView): one row per user.
// Same props as UserCardView; `visible` is true after the "Table" button was clicked.

import { activeHelper, formatDate, getUserRole } from './userListHelpers';

const CELL_STYLE = { wordWrap: 'break-word' };

export default function UserTableView({ users, visible, rolesList, userCan, onView, onEdit, onDeactivate, onActivate, onRemove }) {
  return (
    <div id="tableView" className="table-responsive text-nowrap"
      style={{ display: visible ? undefined : 'none', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <table className="table table-hover table-striped">
        <thead>
          <tr>
            <th style={CELL_STYLE} width="5%;">Sl No</th>
            <th style={CELL_STYLE} width="15%;">Name</th>
            <th style={CELL_STYLE} width="12%;">Contact</th>
            <th style={CELL_STYLE} width="18%;">Email</th>
            <th style={CELL_STYLE} width="12%;">Username</th>
            <th style={CELL_STYLE} width="12%;">Role</th>
            <th style={CELL_STYLE} width="10%;">Joined Date</th>
            <th style={CELL_STYLE} width="8%;">Status</th>
            <th className="text-center" width="8%;">Actions</th>
          </tr>
        </thead>
        <tbody className="table-border-bottom-0">
          {users.map((user, index) => (
            <tr key={user._id}>
              <td style={CELL_STYLE}>
                {index + 1}
              </td>
              <td style={CELL_STYLE}>
                {user.profile && user.profile.firstName}
              </td>
              <td style={CELL_STYLE}>
                {user.contactNo}
              </td>
              <td style={CELL_STYLE}>
                {user.companyEmail ? user.companyEmail : user.emailAddress}
              </td>
              <td style={CELL_STYLE}>
                {user.username}
              </td>
              <td style={CELL_STYLE}>
                {getUserRole(user.roles, rolesList)}
              </td>
              <td style={CELL_STYLE}>
                {user.joinedDate ? formatDate(user.joinedDate) : '-'}
              </td>
              <td style={CELL_STYLE}>
                {activeHelper(user.active) ? (
                  <span className="badge bg-label-success">Active</span>
                ) : (
                  <span className="badge bg-label-secondary">Inactive</span>
                )}
              </td>
              <td className="text-center">
                <div className="dropdown">
                  <button type="button" className="btn btn-sm btn-icon dropdown-toggle hide-arrow"
                    data-bs-toggle="dropdown">
                    <i className="bx bx-dots-vertical-rounded"></i>
                  </button>
                  <div className="dropdown-menu">
                    <a className="dropdown-item view" href="javascript:void(0);" id={user._id}
                      onClick={(event) => onView(event, user)}>
                      <i className="bx bx-show me-1"></i> View
                    </a>
                    {userCan('user_update') && (
                      <>
                        <a className="dropdown-item edit" href="javascript:void(0);" id={user._id}
                          onClick={(event) => onEdit(event, user)}>
                          <i className="bx bx-edit me-1"></i> Edit
                        </a>
                        {activeHelper(user.active) ? (
                          <a className="dropdown-item deactivate" href="javascript:void(0);" id={user._id}
                            onClick={(event) => onDeactivate(event, user)}>
                            <i className="bx bx-block me-1"></i> Deactivate
                          </a>
                        ) : (
                          <a className="dropdown-item activate" href="javascript:void(0);" id={user._id}
                            onClick={(event) => onActivate(event, user)}>
                            <i className="bx bx-check me-1"></i> Activate
                          </a>
                        )}
                      </>
                    )}
                    {userCan('user_delete') && (
                      <a className="dropdown-item text-danger remove" href="javascript:void(0);" id={user._id}
                        onClick={(event) => onRemove(event, user)}>
                        <i className="bx bx-trash me-1"></i> Delete
                      </a>
                    )}
                  </div>
                </div>
                <input type="hidden" id={'userName_' + user._id} value={user.username || ''} readOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
