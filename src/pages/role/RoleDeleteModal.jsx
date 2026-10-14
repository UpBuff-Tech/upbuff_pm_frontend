/**
 * @author Nithin
 */

// "Confirm Deletion" modal of a role (#categoryDelConfirmation).

/**
 * @param role       the word used for "Role" (config roleName)
 * @param info       { header, name, id, total } of the role to delete (total = number of users)
 * @param onRemove   click on "Yes please!"
 */
export default function RoleDeleteModal({ role, info, onRemove }) {
  return (
    <div className="modal fade" id="categoryDelConfirmation" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="categoryHeader">{info.header}</h5>
            <button type="button" className="closen btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div id="categoryBody">
              <p>The {role}, '<span id="categoryNameDup" className="text-bold">{info.name}</span>' contains
                '<span id="roleTotal" className="text-bold">{info.total}</span>' User(s).
              </p>
              <p className="danger-color">
                Are you sure to remove {role}- '<span id="roleNameDup" className="text-bold">{info.name}</span>' ?
              </p>
            </div>
            <input type="hidden" id="confirmedUuid" value={info.id} />

          </div>
          <div className="modal-footer">
            <button id="categoryRemove" className="btn btn-danger" onClick={onRemove}>Yes please!</button>
            <button type="button" className="btn btn-secondary" data-dismiss="modal" id="closeRole">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
