// The card view of the user list (#cardView): one card per user.
//   users       - the users to show
//   visible     - false while the table view is shown
//   rolesList   - the roles, to show the role name
//   userCan     - permission check
//   onView, onEdit, onDeactivate, onActivate, onRemove - (event, user) handlers of the buttons

import { activeHelper, formatDate, getInitials, getUserRole } from './userListHelpers';

const ICON_STYLE = { fontSize: '0.875rem' };

export default function UserCardView({ users, visible, rolesList, userCan, onView, onEdit, onDeactivate, onActivate, onRemove }) {
  return (
    <div id="cardView" className="row" style={visible ? undefined : { display: 'none' }}>
      {users.map((user) => (
        <div key={user._id} className="col-xl-4 col-lg-6 col-md-6 col-sm-12 mb-3">
          <div className="card">
            <div className="card-body p-3">
              <div className="d-flex align-items-start">
                {/* Profile Photo - Left Side */}
                <div className="flex-shrink-0 me-3">
                  {user.profile && user.profile.logo ? (
                    <img src={user.profile.logo} alt={user.profile.firstName} className="rounded-circle" width="60"
                      height="60" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar avatar-lg">
                      <span className="avatar-initial rounded-circle bg-label-primary" style={{ fontSize: '1.25rem' }}>
                        {getInitials(user.profile && user.profile.firstName)}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info - Right Side */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h6 className="mb-0 text-truncate">{user.profile && user.profile.firstName}</h6>
                      <small className="text-muted">{getUserRole(user.roles, rolesList)}</small>
                    </div>
                    <div className="ms-2">
                      {activeHelper(user.active) ? (
                        <span className="badge bg-label-success badge-sm">Active</span>
                      ) : (
                        <span className="badge bg-label-secondary badge-sm">Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mb-2" style={{ fontSize: '0.75rem' }}>
                    <div className="text-muted text-truncate mb-1">
                      <i className="bx bx-phone" style={ICON_STYLE}></i> {user.contactNo}
                    </div>
                    <div className="text-muted text-truncate mb-1">
                      <i className="bx bx-envelope" style={ICON_STYLE}></i>{' '}
                      {user.companyEmail ? user.companyEmail : user.emailAddress}
                    </div>
                    <div className="text-muted">
                      <i className="bx bx-calendar" style={ICON_STYLE}></i>{' '}
                      {user.joinedDate ? formatDate(user.joinedDate) : '-'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-1">
                    <button className="btn btn-xs btn-icon btn-outline-primary view" id={user._id} title="View"
                      onClick={(event) => onView(event, user)}>
                      <i className="bx bx-show" style={ICON_STYLE}></i>
                    </button>
                    {userCan('user_update') && (
                      <>
                        <button className="btn btn-xs btn-icon btn-outline-info edit" id={user._id} title="Edit"
                          onClick={(event) => onEdit(event, user)}>
                          <i className="bx bx-edit" style={ICON_STYLE}></i>
                        </button>
                        {activeHelper(user.active) ? (
                          <button className="btn btn-xs btn-icon btn-outline-warning deactivate" id={user._id}
                            title="Deactivate" onClick={(event) => onDeactivate(event, user)}>
                            <i className="bx bx-block" style={ICON_STYLE}></i>
                          </button>
                        ) : (
                          <button className="btn btn-xs btn-icon btn-outline-success activate" id={user._id}
                            title="Activate" onClick={(event) => onActivate(event, user)}>
                            <i className="bx bx-check" style={ICON_STYLE}></i>
                          </button>
                        )}
                      </>
                    )}
                    {userCan('user_delete') && (
                      <button className="btn btn-xs btn-icon btn-outline-danger remove" id={user._id} title="Delete"
                        onClick={(event) => onRemove(event, user)}>
                        <i className="bx bx-trash" style={ICON_STYLE}></i>
                      </button>
                    )}
                  </div>

                  <input type="hidden" id={'userName_' + user._id} value={user.username || ''} readOnly />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
